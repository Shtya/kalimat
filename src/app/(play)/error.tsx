"use client";
import Link from "next/link";
import { Icon } from "@/components/play/Icon";

export default function PlayError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="state">
      <span className="state-medal is-rose" aria-hidden>
        <Icon name="close" size={34} />
      </span>
      <h1 className="state-title">لم تُفتح هذه الصفحة</h1>
      <p className="state-text">قد يكون الاتصال ضعيفًا. جرّب مرة أخرى، أو ارجع إلى رحلتك.</p>
      <div className="state-actions">
        <button className="btn" onClick={reset}>
          <Icon name="replay" /> حاول مرة أخرى
        </button>
        <Link href="/journey" className="btn btn-ghost">
          <Icon name="home" /> رحلتي
        </Link>
      </div>
    </div>
  );
}
