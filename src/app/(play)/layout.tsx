import Link from "next/link";
import { AccountLink, BottomNav, TopBarGate } from "@/components/play/BottomNav";
import { Icon } from "@/components/play/Icon";
import { SoundToggle } from "@/components/play/SoundToggle";
import { SyncAgent } from "@/components/play/SyncAgent";
import { starCount } from "@/components/play/ui";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const student = await getCurrentStudent();
  const journey = student ? await getJourney(student) : null;
  const stars = journey ? journey.levels.reduce((s, l) => s + l.stars, 0) : 0;
  const playHref = journey?.currentLevelId ? `/play/${journey.currentLevelId}` : "/journey";

  return (
    <div className={`kid${student ? " has-nav" : ""}`}>
      <div className="kid-shell">
        <TopBarGate>
          <header className="kid-top">
            <Link href={student ? "/journey" : "/app"} className="kid-brand" aria-label="كلمات قرآنية — الرئيسية">
              <span className="kid-logo" aria-hidden>
                ك
              </span>
              <span>كلمات قرآنية</span>
            </Link>
            <div className="kid-top-actions">
              {student ? (
                <>
                  <Link href="/achievements" className="star-pill" aria-label={`نجومك: ${stars}`}>
                    <Icon name="star" size={18} filled />
                    {starCount(stars)}
                  </Link>
                  <AccountLink initial={Array.from(student.name)[0]} />
                </>
              ) : (
                <SoundToggle />
              )}
            </div>
          </header>
        </TopBarGate>
        <main className="kid-main">{children}</main>
      </div>
      {student && <BottomNav playHref={playHref} />}
      <SyncAgent anonymousId={student?.anonymousId ?? null} />
    </div>
  );
}
