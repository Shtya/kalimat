import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Strict CSP: no third-party origins at all (no ads, analytics or external links for kids).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Lets a second dev/verification server run without sharing the build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  // Excel uploads in the dashboard go through a server action (default limit is 1 MB).
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Old routes from before the curriculum restructure (cached PWA pages may still link to them).
  async redirects() {
    return [
      { source: "/categories", destination: "/journey", permanent: false },
      { source: "/categories/:id", destination: "/journey", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // "same-origin" (not "no-referrer"): no-referrer makes browsers send `Origin: null`
          // on form posts, which breaks Next's server-action CSRF check.
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
