import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/play/OnboardingForm";
import { RecoverForm } from "@/components/play/RecoverForm";
import { getCurrentStudent } from "@/server/services/student";

const TITLE = ["ك", "ل", "م", "ا", "ت"];

export default async function WelcomePage() {
  if (await getCurrentStudent()) redirect("/journey");

  return (
    <div className="welcome">
      <section className="welcome-hero">
        <div className="drop-tiles" aria-hidden>
          {TITLE.map((l, i) => (
            <span key={i} className="tile" style={{ "--i": i } as React.CSSProperties}>
              {l}
            </span>
          ))}
        </div>
        <h1 className="welcome-title">كلمات قرآنية</h1>
        <p className="welcome-sub">صِل الحروف، واكتشف معاني القرآن وقصصه سورةً بعد سورة.</p>
      </section>

      <OnboardingForm />

      <details className="recover">
        <summary>عندي حساب محفوظ</summary>
        <p className="hint-text">اكتب الرقم أو البريد الذي حفظته من صفحة «حسابي»، ونفتح نجومك من جديد.</p>
        <RecoverForm />
      </details>
    </div>
  );
}
