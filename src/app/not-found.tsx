import Link from "next/link";
import { Icon } from "@/components/play/Icon";

export default function NotFound() {
  return (
    <div className="kid">
      <div className="kid-shell">
        <div className="state">
          <div className="drop-tiles" aria-hidden>
            <span className="tile" style={{ "--i": 0 } as React.CSSProperties}>
              ؟
            </span>
          </div>
          <h1 className="state-title">لم نجد هذه الصفحة</h1>
          <p className="state-text">ربما تغيّر المستوى أو لم يُنشر بعد.</p>
          <div className="state-actions">
            <Link href="/" className="btn">
              <Icon name="home" /> العودة للبداية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
