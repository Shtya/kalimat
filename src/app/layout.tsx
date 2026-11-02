import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2 } from "next/font/google";
import "./globals.css";
import "./kid.css";

// next/font downloads the font at build time and serves it from our own origin — no runtime requests to Google.
const baloo = Baloo_Bhaijaan_2({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: { default: "كلمات قرآنية — العب وتعلّم القرآن", template: "%s · كلمات قرآنية" },
  description: "لعبة كلمات قرآنية للأطفال والنشء: اسحب الحروف، وتعلّم معاني القرآن وقصصه وقيمه سورةً سورة وفق منهج «نحو جيل قرآني».",
  applicationName: "كلمات قرآنية",
  appleWebApp: { capable: true, title: "كلمات قرآنية", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1B4DA8",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The landing page adds `lp-js` here before hydration (see (marketing)/layout.tsx).
    <html lang="ar" dir="rtl" className={baloo.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
