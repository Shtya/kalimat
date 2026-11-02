import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "كلمات قرآنية — العب وتعلّم القرآن",
    short_name: "كلمات قرآنية",
    description: "لعبة كلمات قرآنية تعليمية للأطفال والنشء",
    lang: "ar",
    dir: "rtl",
    // The journey (not /app, which redirects for signed-up students): a redirect can't be served from the offline cache.
    start_url: "/journey",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#edf2fc",
    theme_color: "#1b4da8",
    categories: ["education", "games", "kids"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
