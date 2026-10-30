import Link from "next/link";
import { Icon } from "@/components/play/Icon";

export const metadata = { title: "لا يوجد اتصال" };

export default function OfflinePage() {
  return (
    <div className="state">
      <span className="state-medal" aria-hidden>
        <Icon name="wifiOff" size={34} />
      </span>
      <h1 className="state-title">لا يوجد اتصال بالإنترنت</h1>
      <p className="state-text">المستويات التي فتحتها من قبل تعمل بدون إنترنت، ونجومك تُحفظ على جهازك حتى يعود الاتصال.</p>
      <div className="state-actions">
        <Link href="/journey" className="btn">
          <Icon name="replay" /> حاول مرة أخرى
        </Link>
      </div>
    </div>
  );
}
