"use client";
import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <label className="fld">
        البريد الإلكتروني
        <input name="email" type="email" autoComplete="username" required dir="ltr" />
      </label>
      <label className="fld">
        كلمة المرور
        <input name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </label>
      {state.error && (
        <p className="msg msg-error" role="alert" style={{ margin: 0 }}>
          {state.error}
        </p>
      )}
      <button className="abtn" disabled={pending} style={{ minHeight: 48 }}>
        {pending ? "جارٍ الدخول..." : "دخول"}
      </button>
    </form>
  );
}
