import type { Metadata, Viewport } from "next";
import "./program.css";

// "The Block" — a fixed, coach-authored 4-week training program. A sibling to
// /train: deliberately unlinked from the portfolio nav and kept out of search
// indexes. Renders inside the shared root <html>/<body> but brings its own
// full-bleed theme so none of the portfolio styling bleeds in. Installable as a
// PWA via the manifest below (add-to-home-screen → full-screen, offline).
export const metadata: Metadata = {
  title: "The Block — 4-Week Program",
  description: "Your coach's fixed 4-week training block, tracked week over week.",
  robots: { index: false, follow: false },
  manifest: "/program/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The Block",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function ProgramLayout({ children }: { children: React.ReactNode }) {
  return <div className="program-root">{children}</div>;
}
