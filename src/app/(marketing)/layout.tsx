import { Reem_Kufi } from "next/font/google";
import "./landing.css";

// Kufi display face for headlines only — the manuscript note of the brand. Self-hosted at build time.
const kufi = Reem_Kufi({ subsets: ["arabic"], weight: ["500", "700"], display: "swap", variable: "--font-kufi" });

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`lp ${kufi.variable}`}>{children}</div>;
}
