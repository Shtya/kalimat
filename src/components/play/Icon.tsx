// One consistent icon set for the child app's interface (rounded 2px strokes, 24px grid).
// Content illustrations (station emblems) stay emoji; interface chrome uses these.

const PATHS = {
  home: "M4 11.5 12 4l8 7.5M6.5 9.5V20h11V9.5M10 20v-5h4v5",
  play: "M8 5.5v13l11-6.5z",
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13zM12 15v2.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  back: "M14.5 5.5 9 12l5.5 6.5",
  forward: "M9.5 5.5 15 12l-5.5 6.5",
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9.5 2.5h5",
  soundOn: "M4.5 9.5h3l4.5-4v13l-4.5-4h-3zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11",
  soundOff: "M4.5 9.5h3l4.5-4v13l-4.5-4h-3zM16.5 9.5l5 5M21.5 9.5l-5 5",
  replay: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4",
  map: "M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5zM9 4.5v13M15 6.5v13",
  book: "M4 5.5c2.5-1 5.5-1 8 1 2.5-2 5.5-2 8-1v13c-2.5-1-5.5-1-8 1-2.5-2-5.5-2-8-1zM12 6.5v13",
  trophy: "M7.5 4.5h9v4a4.5 4.5 0 0 1-9 0zM7.5 6.5H4.5c0 3 1.5 4.5 3.5 4.5M16.5 6.5h3c0 3-1.5 4.5-3.5 4.5M12 13v4M8.5 20.5h7M9.5 17h5",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  layers: "M12 3.5 3 8l9 4.5L21 8zM3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5",
  upload: "M12 15.5V4M7.5 8.5 12 4l4.5 4.5M4.5 15v4.5h15V15",
  download: "M12 4v11.5M7.5 11 12 15.5l4.5-4.5M4.5 15v4.5h15V15",
  chart: "M4.5 20V10M10 20V4M15.5 20v-7M21 20H3",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.4 3.3-5 6.5-5s5.7 1.6 6.5 5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 15c2 .6 3.2 2.3 3.5 5",
  logout: "M14.5 4.5h4v15h-4M10 8l-4 4 4 4M6 12h10",
  alert: "M12 3.5 2.5 20h19zM12 10v4.5M12 17.5h.01",
  whatsapp: "M4 20l1.2-4A8 8 0 1 1 8 18.8zM9 8.5c0 3.5 3 6.5 6.5 6.5l1.5-1.6-2.2-1.1-1 .9c-1.2-.5-2.5-1.8-3-3l.9-1-1.1-2.2z",
  wifiOff:"M3.5 3.5l17 17M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14.5 10.4A10 10 0 0 1 19 13M2 9.5A15 15 0 0 1 7.2 6.4M12 5.5a15 15 0 0 1 10 4M12 20h.01",
  // Dashboard
  edit: "M4.5 19.5l1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5zM14 7l3 3",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  file: "M6 3.5h8l4.5 4.5v12.5H6zM14 3.5V8h4.5M9 13h6M9 16.5h6",
  sparkle: "M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className, filled = false }: { name: IconName; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
