import Link from "next/link";
import { notFound } from "next/navigation";
import { getLevelForPreview } from "@/server/data/content";
import { toGame } from "@/server/services/game";
import { PreviewPlayer } from "./PreviewPlayer";

export const metadata = { title: "معاينة مرحلة" };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const level = await getLevelForPreview(id);
  if (!level) notFound();
  const game = toGame(level);

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>معاينة: {level.title}</h1>
          <p>هكذا يرى الطالب المرحلة (حتى لو كانت مسودة).</p>
        </div>
        <Link href={`/admin/levels/${level.id}`} className="abtn abtn-light">
          → رجوع للتعديل
        </Link>
      </div>
      {game.words.length === 0 ? (
        <p className="panel muted">أضف كلمات أولًا لمعاينة المرحلة.</p>
      ) : (
        <div className="kid kid-preview" style={{ maxWidth: 460, margin: "0 auto", minHeight: 720, display: "flex" }}>
          <PreviewPlayer data={{ ...game, meta: { ...game.meta, backHref: `/admin/levels/${level.id}` } }} />
        </div>
      )}
    </>
  );
}
