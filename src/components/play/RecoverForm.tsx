"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { rememberStudent } from "@/lib/offline-queue";

export function RecoverForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const contact = String(new FormData(e.currentTarget).get("contact") ?? "").trim();
    if (contact.length < 3) return setError("اكتب رقمك أو بريدك");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/students/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? "محاولات كثيرة، انتظر دقيقة ثم جرّب" : (body.issues?.[0] ?? "لم نجد حسابًا بهذا الرقم أو البريد"));
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
    <form className="stack-sm" onSubmit={onSubmit} noValidate>
      <label className="field">
        <span className="field-label">رقم الموبايل أو البريد</span>
        <input name="contact" className="input" inputMode="email" autoComplete="username" maxLength={120} placeholder="01xxxxxxxxx" dir="ltr" />
      </label>
      {error && (
        <p className="form-msg is-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-block" disabled={busy}>
        {busy ? "لحظة…" : "افتح حسابي"}
      </button>
    </form>
  );
}
