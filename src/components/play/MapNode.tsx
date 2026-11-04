"use client";
import Link from "next/link";
import { Icon } from "./Icon";
import { useProgress } from "./OfflineProgress";
import { Stars, toArabic } from "./ui";

/**
 * One level on the stage map. Its state (locked / to play / done) comes from useProgress, so a level
 * finished offline shows as done and the next one opens straight away, before anything is synced.
 */
export function MapNode({
  id,
  number,
  title,
  kind,
  x,
  y,
  stars,
  focus,
}: {
  id: string;
  number: number;
  title: string;
  /** Game type label, e.g. «🎡 عجلة الحروف». */
  kind: string;
  x: number;
  y: number;
  /** Best stars the server has for this level. */
  stars: number;
  focus: boolean;
}) {
  const progress = useProgress();
  const unlocked = progress.isUnlocked(id);
  const completed = progress.isDone(id);
  const isCurrent = id === progress.currentId;
  const best = Math.max(stars, progress.localStars(id));
  const state = !unlocked ? "is-locked" : completed ? "is-done" : "is-current";
  const label = `المستوى ${toArabic(number)}: ${title}${unlocked ? "" : " — مقفول"}`;
  const face = !unlocked ? <Icon name="lock" size={20} /> : isCurrent ? <Icon name="play" size={24} filled /> : toArabic(number);

  return (
    <div className={`map-node ${state} ${x >= 50 ? "title-left" : "title-right"}`} style={{ left: `${x}%`, top: y }} data-focus={focus ? "" : undefined} data-level-id={id}>
      {isCurrent && <span className="here-flag">ابدأ هنا</span>}
      {isCurrent && (
        <span className="node-lock" aria-hidden>
          <Icon name="lock" size={20} />
        </span>
      )}
      {unlocked ? (
        <Link href={`/play/${id}`} prefetch className="node-btn" aria-label={label}>
          {face}
        </Link>
      ) : (
        <span className="node-btn" aria-label={label} role="img">
          {face}
        </span>
      )}
      {completed && <Stars count={best} size={14} />}
      <span className="node-title">
        {title}
        <small>{kind}</small>
      </span>
    </div>
  );
}
