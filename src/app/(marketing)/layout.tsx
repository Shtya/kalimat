import { Reem_Kufi } from "next/font/google";
import "./landing.css";

// Kufi display face for headlines only — the manuscript note of the brand. Self-hosted at build time.
const kufi = Reem_Kufi({ subsets: ["arabic"], weight: ["500", "700"], display: "swap", variable: "--font-kufi" });

/**
 * Runs before the hero is parsed, so its hidden start state applies on the very first paint (no flash of
 * the phone before the intro), and starts the intro clock without waiting for hydration. The `__lpTimed`
 * flag tells LandingFx the timers are already running; on client-side navigation this script doesn't run
 * and LandingFx schedules them itself.
 */
const BOOT = `(function(){
document.documentElement.classList.add("lp-js");
if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
function go(){
  var h = document.querySelector(".lp-hero");
  if (!h) return;
  h.__lpTimed = true;
  setTimeout(function(){ if (h.dataset.stage === "intro") h.dataset.stage = "word"; }, 250);
  setTimeout(function(){ h.dataset.stage = "ready"; }, 3000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go, { once: true }); else go();
})();`;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp ${kufi.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      {children}
    </div>
  );
}
