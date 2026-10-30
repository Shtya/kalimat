"use client";

import { useState } from "react";

export function AccountForm({ phone, email }: { phone: string | null; email: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextPhone = String(form.get("phone") ?? "");
    const nextEmail = String(form.get("email") ?? "");
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/students/contact", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: nextPhone, email: nextEmail }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? "محاولات كثيرة، انتظر دقيقة ثم جرّب" : (body.issues?.[0] ?? "لم نتمكن من الحفظ، تأكد من الرقم أو البريد"));
        return;
      }
      setOk("تم حفظ حسابك. ادخل بنفس الرقم أو البريد من أي جهاز لتجد نجومك.");
    } catch {
      setError("لا يوجد اتصال بالإنترنت");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel-card stack-sm" onSubmit={onSubmit} noValidate>
      <label className="field">
        <span className="field-label">رقم الموبايل</span>
        <input name="phone" className="input" inputMode="tel" autoComplete="tel" maxLength={24} defaultValue={phone ?? ""} placeholder="01xxxxxxxxx" dir="ltr" />
      </label>
      <label className="field">
        <span className="field-label">أو البريد الإلكتروني</span>
        <input name="email" className="input" inputMode="email" autoComplete="email" maxLength={120} defaultValue={email ?? ""} placeholder="name@email.com" dir="ltr" />
      </label>
      {error && (
        <p className="form-msg is-error" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="form-msg is-ok" role="status">
          {ok}
        </p>
      )}
      <button className="btn btn-block" disabled={busy}>
        {busy ? "لحظة…" : "احفظ الحساب"}
      </button>
    </form>
  );
}
