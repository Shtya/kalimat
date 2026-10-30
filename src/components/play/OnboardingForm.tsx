"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rememberStudent } from "@/lib/offline-queue";
import { TRACK_LABEL, TRACKS } from "@/lib/quran/labels";
import { buzz } from "@/lib/sound";
import { Icon } from "./Icon";

export function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [track, setTrack] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (name.length < 2) return setError("اكتب اسمك الأول");
    if (!track) return setError("اختر مسارك");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, track }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? "محاولات كثيرة، انتظر دقيقة ثم جرّب" : (body.issues?.[0] ?? "لم نتمكن من إنشاء حسابك، حاول مرة أخرى"));
        return;
      }
      rememberStudent(body.anonymousId);
      router.replace("/journey");
      router.refresh();
    } catch {
      setError("لا يوجد اتصال بالإنترنت");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel-card onboarding" onSubmit={onSubmit} noValidate>
      <label className="field">
        <span className="field-label">ما اسمك الأول؟</span>
        <input name="name" className="input" autoComplete="off" maxLength={20} placeholder="مثلًا: سارة" enterKeyHint="next" />
      </label>

      <fieldset className="field">
        <legend className="field-label">كم عمرك؟</legend>
        <div className="track-grid" role="radiogroup">
          {TRACKS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={track === t}
              className={`track-card${track === t ? " is-picked" : ""}`}
              onClick={() => {
                setTrack(t);
                buzz(8);
              }}
            >
              <span className="track-emoji" aria-hidden>
                {TRACK_LABEL[t].icon}
              </span>
              <b>{TRACK_LABEL[t].ages.replace("من ", "")}</b>
              <small>مسار {TRACK_LABEL[t].name}</small>
              <span className="track-tick" aria-hidden>
                <Icon name="check" size={14} />
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="form-msg is-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-gold btn-block btn-lg" disabled={busy}>
        {busy ? "لحظة…" : "ابدأ الرحلة"}
        {!busy && <Icon name="back" />}
      </button>
      <p className="hint-text center">نحتاج اسمك الأول فقط، بدون بريد أو كلمة مرور.</p>
    </form>
  );
}
