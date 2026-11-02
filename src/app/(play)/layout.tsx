import Link from "next/link";
import { AccountLink, BottomNav, TopBarGate } from "@/components/play/BottomNav";
import { Icon } from "@/components/play/Icon";
import { OfflineProgressProvider, StarTotal } from "@/components/play/OfflineProgress";
import { SoundToggle } from "@/components/play/SoundToggle";
import { SyncAgent } from "@/components/play/SyncAgent";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const student = await getCurrentStudent();
  const journey = student ? await getJourney(student) : null;
  const stars = journey ? journey.levels.reduce((s, l) => s + l.stars, 0) : 0;
  const playHref = journey?.currentLevelId ? `/play/${journey.currentLevelId}` : "/journey";
  const order = journey?.levels.map((l) => l.id) ?? [];
  const done = journey?.levels.filter((l) => l.completed).map((l) => l.id) ?? [];

  return (
    <OfflineProgressProvider order={order} done={done}>
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
                    <Link href="/achievements" className="star-pill" aria-label="نجومك">
                      <Icon name="star" size={18} filled />
                      <StarTotal stars={stars} />
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
        {/* `done.length` changes after each finished level, so the offline copy is refreshed */}
        <SyncAgent anonymousId={student?.anonymousId ?? null} progressKey={done.length} />
      </div>
    </OfflineProgressProvider>
  );
}
