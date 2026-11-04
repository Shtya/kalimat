import { ImageResponse } from "next/og";

// App icons are drawn at build time (no binary assets in the repo): the game's gold letter tile, tilted, with «ك»
// in the game's tile font (Baloo Bhaijaan 2, as on every letter tile) on lapis blue and a faint khatam (8-point star) pattern.
//  - 180: apple-touch-icon. Square corners: iOS rounds them itself (transparent corners would turn black).
//  - 192 / 512: manifest «any». Rounded corners, shown as-is by Android and desktop Chrome.
//  - maskable: full-bleed background, the tile shrunk into the 80% safe zone launchers never crop.
const SIZES: Record<string, { size: number; radius: number; scale: number }> = {
  "180": { size: 180, radius: 0, scale: 1 },
  "192": { size: 192, radius: 0.22, scale: 1 },
  "512": { size: 512, radius: 0.22, scale: 1 },
  maskable: { size: 512, radius: 0, scale: 0.78 },
};

export const dynamic = "force-static";
export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

const LAPIS = "#1b4da8";
const LAPIS_2 = "#3471d9";
const INK = "#0f3277";
const TILT = -7;

/**
 * Baloo Bhaijaan 2 ExtraBold, just the «ك» glyph (Google Fonts subsets by `text`). Fetched once at build time, like the
 * site's other Google fonts; without a non-browser user agent Google serves TrueType, which the renderer reads.
 */
async function tileKaf(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@800&text=${encodeURIComponent("ك")}`).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)) : null;
  } catch {
    return null;
  }
}
const font = tileKaf();

/** Fallback when the font can't be fetched: a square-kufic «ك» drawn in a 40×40 box. */
const KAF_SHAPE = (
  <g fill={INK}>
    <rect x="25" y="2" width="9" height="34" rx="1.5" />
    <rect x="5" y="27" width="29" height="9" rx="1.5" />
    <rect x="5" y="18" width="9" height="18" rx="1.5" />
    <rect x="15" y="11" width="9" height="6" rx="1.5" />
  </g>
);

/** A khatam (two squares, one turned 45°) outlined, centred at (cx, cy). */
const khatam = (cx: number, cy: number, r: number) => (
  <g fill="none" stroke={LAPIS_2} strokeWidth="1.6" strokeOpacity="0.85">
    <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} />
    <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} transform={`rotate(45 ${cx} ${cy})`} />
  </g>
);

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: key } = await params;
  const cfg = SIZES[key];
  if (!cfg) return new Response("Not found", { status: 404 });
  const s = cfg.size;
  const glyph = await font;
  // the tile and pattern are drawn in a 120×120 box; the maskable icon shrinks them around the centre
  const inner = `translate(60 60) scale(${cfg.scale}) translate(-60 -60)`;
  const unit = (s / 120) * cfg.scale; // one 120-box unit, in pixels

  return new ImageResponse(
    <div style={{ width: s, height: s, display: "flex", position: "relative" }}>
      <svg width={s} height={s} viewBox="0 0 120 120" style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#2f6fd6" />
            <stop offset="0.55" stopColor={LAPIS} />
            <stop offset="1" stopColor="#123f85" />
          </linearGradient>
          <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe993" />
            <stop offset="1" stopColor="#f5b82e" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx={cfg.radius * 120} fill="url(#bg)" />
        <g transform={inner}>
          {khatam(18, 18, 10)}
          {khatam(102, 102, 10)}
          <g transform={`rotate(${TILT} 60 60)`}>
            {/* tile edge, face, top highlight */}
            <rect x="26" y="31" width="68" height="68" rx="17" fill="#b07a06" />
            <rect x="26" y="24" width="68" height="68" rx="17" fill="url(#face)" />
            <rect x="32" y="28" width="56" height="9" rx="4.5" fill="#fff6c8" fillOpacity="0.7" />
            {!glyph && <g transform="translate(41 39)">{KAF_SHAPE}</g>}
          </g>
        </g>
      </svg>
      {glyph && (
        // the letter, centred on the tile face and tilted with it
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: s,
            height: s,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: unit * 2,
            transform: `rotate(${TILT}deg)`,
            fontFamily: "Tile",
            fontSize: unit * 58,
            color: INK,
            lineHeight: 1,
          }}
        >
          ك
        </div>
      )}
    </div>,
    { width: s, height: s, fonts: glyph ? [{ name: "Tile", data: glyph, weight: 800, style: "normal" }] : [] },
  );
}
