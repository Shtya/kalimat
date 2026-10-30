"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/admin/actions";

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  /** Ask before submitting (used for deletes). */
  confirm?: string;
  resetOnSuccess?: boolean;
};

/** Form wired to a server action, showing its error/success message inline. */
export function ActionForm({ action, children, className, confirm, resetOnSuccess }: Props) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state.error && (
        <p className="msg msg-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !confirm && (
        <p className="msg msg-ok" role="status">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({ children, className = "abtn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? "..." : children}
    </button>
  );
}
