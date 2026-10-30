/** Re-mounts on every navigation so each screen enters with one short, consistent transition. */
export default function PlayTemplate({ children }: { children: React.ReactNode }) {
  return <div className="kid-page">{children}</div>;
}
