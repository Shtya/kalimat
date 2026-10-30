import { ImageResponse } from "next/og";

// App icons are drawn at build time (no binary assets in the repo): a 3D letter cube with a star.
const SIZES: Record<string, { size: number; pad: number }> = {
  "180": { size: 180, pad: 0 },
  "192": { size: 192, pad: 0 },
  "512": { size: 512, pad: 0 },
  maskable: { size: 512, pad: 0.12 },
};

export const dynamic = "force-static";
export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: key } = await params;
  const cfg = SIZES[key];
  if (!cfg) return new Response("Not found", { status: 404 });
  const s = cfg.size;
  const tile = s * (0.62 - cfg.pad);
  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #3c83e2 0%, #1f63c6 50%, #123f85 100%)",
          borderRadius: cfg.pad ? 0 : s * 0.22,
        }}
      >
        <div
          style={{
            width: tile,
            height: tile,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: tile * 0.26,
            background: "linear-gradient(180deg, #fff3b8, #f7c843)",
            boxShadow: `0 ${tile * 0.1}px 0 #8a5a00`,
            transform: "rotate(-8deg)",
          }}
        >
          <svg width={tile * 0.62} height={tile * 0.62} viewBox="0 0 24 24">
            <path
              fill="#1f63c6"
              stroke="#123f85"
              strokeWidth="1.2"
              strokeLinejoin="round"
              d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
            />
          </svg>
        </div>
      </div>
    ),
    { width: s, height: s },
  );
}
