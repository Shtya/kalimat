"use client";
import { useEffect } from "react";

const AR = "٠١٢٣٤٥٦٧٨٩";
const arabic = (n: number) => String(n).replace(/\d/g, (d) => AR[Number(d)]);

/**
 * All landing-page motion in one place, driven by the DOM (no React state, no libraries):
 * - hero intro: scattered letters → «اقرأ» → the playable phone (data-stage on .lp-hero)
 * - scroll reveal ([data-reveal]), count-ups ([data-count]), parallax ([data-parallax])
 * - sticky phone story (data-step on .lp-story), stations rail progress (--p on .lp-path)
 * - pointer: sky parallax, cursor glow, magnetic buttons ([data-magnetic]); mobile CTA bar.
 * Only transform/opacity/CSS variables change, inside one requestAnimationFrame per frame.
 */
export function LandingFx() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("lp-js");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(pointer: fine)").matches;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      window.addEventListener(t, fn, opts);
      cleanups.push(() => window.removeEventListener(t, fn, opts));
    };

    // ── Hero intro ──
    const hero = document.querySelector<HTMLElement & { __lpTimed?: boolean }>(".lp-hero");
    if (hero) {
      const ready = () => {
        hero.dataset.stage = "ready";
      };
      if (reduce) ready();
      else {
        // The boot script in (marketing)/layout.tsx already started the clock on a full page load.
        if (!hero.__lpTimed) {
          hero.__lpTimed = true;
          const t1 = setTimeout(() => {
            if (hero.dataset.stage === "intro") hero.dataset.stage = "word";
          }, 250);
          const t2 = setTimeout(ready, 3000);
          cleanups.push(() => (clearTimeout(t1), clearTimeout(t2), (hero.__lpTimed = false)));
        }
        // Any interaction skips straight to the playable state.
        const skip = () => {
          if (hero.dataset.stage !== "ready") ready();
        };
        on("wheel", skip, { passive: true, once: true });
        on("touchmove", skip, { passive: true, once: true });
        on("keydown", skip, { once: true });
        hero.addEventListener("pointerdown", skip, { once: true });
      }
    }

    // ── Reveal & count-up ──
    const countUp = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix ?? "";
      if (reduce || !Number.isFinite(target)) return void (el.textContent = arabic(target) + suffix);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 1200);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = arabic(Math.round(target * eased)) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("is-in");
          el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
          if (el.dataset.count) countUp(el);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // ── Scroll-driven: story, stations rail, parallax, mobile CTA ──
    const story = document.querySelector<HTMLElement>(".lp-story");
    const steps = Number(story?.dataset.steps ?? 0);
    const rail = document.querySelector<HTMLElement>(".lp-path");
    const parallax = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const cta = document.querySelector<HTMLElement>(".lp-mobile-cta");
    const nav = document.querySelector<HTMLElement>(".lp-nav");
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight;
      if (story && steps) {
        const r = story.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
        const step = Math.min(steps - 1, Math.floor(p * steps));
        if (story.dataset.step !== String(step)) story.dataset.step = String(step);
        story.style.setProperty("--p", p.toFixed(3));
      }
      if (rail) {
        const r = rail.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.65 - r.top) / r.height));
        rail.style.setProperty("--p", p.toFixed(3));
        rail.querySelectorAll<HTMLElement>("[data-at]").forEach((s) => s.classList.toggle("is-lit", p >= Number(s.dataset.at)));
      }
      if (!reduce)
        for (const el of parallax) {
          const r = el.getBoundingClientRect();
          const offset = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.parallax);
          el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
        }
      if (cta && hero) cta.classList.toggle("is-shown", hero.getBoundingClientRect().bottom < 0);
      if (nav) nav.classList.toggle("is-scrolled", scrollY > 12);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    on("scroll", onScroll, { passive: true });
    on("resize", onScroll, { passive: true });
    update();

    // ── Pointer: sky parallax, cursor glow, magnetic buttons ──
    if (finePointer && !reduce) {
      const glow = document.querySelector<HTMLElement>(".lp-cursor");
      let gx = innerWidth / 2,
        gy = innerHeight / 2,
        tx = gx,
        ty = gy,
        raf = 0;
      const follow = () => {
        gx += (tx - gx) * 0.18;
        gy += (ty - gy) * 0.18;
        if (glow) glow.style.transform = `translate3d(${gx - 160}px, ${gy - 160}px, 0)`;
        raf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(follow) : 0;
      };
      on("pointermove", (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!raf) raf = requestAnimationFrame(follow);
        if (glow) glow.classList.add("is-on");
        if (hero) {
          const r = hero.getBoundingClientRect();
          if (e.clientY < r.bottom) {
            hero.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
            hero.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
          }
        }
      });

      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left - r.width / 2) * 0.22;
          const y = (e.clientY - r.top - r.height / 2) * 0.3;
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        };
        const leave = () => (el.style.transform = "");
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => (el.removeEventListener("pointermove", move), el.removeEventListener("pointerleave", leave)));
      });

      // 3D tilt on cards marked [data-tilt]
      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const rx = ((e.clientY - r.top) / r.height - 0.5) * -8;
          const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
          el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
          el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
        };
        const leave = () => (el.style.removeProperty("--rx"), el.style.removeProperty("--ry"));
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => (el.removeEventListener("pointermove", move), el.removeEventListener("pointerleave", leave)));
      });
    }

    return () => cleanups.forEach((c) => c());
  }, []);

  return null;
}
