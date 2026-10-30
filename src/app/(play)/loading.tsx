export default function Loading() {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="khatam-spinner" aria-hidden />
      <p className="state-text">لحظة…</p>
    </div>
  );
}
