import type { Metadata } from "next";
import "./clues.css";

// Standalone logic-puzzle game. Reachable only by direct URL (/clues) — kept out
// of the portfolio nav and search indexes, same as /train. Renders inside the
// shared root <html>/<body> but brings its own full-bleed Ink & Ember theme.
export const metadata: Metadata = {
  title: "Clues — a daily deduction puzzle",
  description: "Label all 20 suspects innocent or criminal using pure logic. No guessing.",
  robots: { index: false, follow: false },
};

export default function CluesLayout({ children }: { children: React.ReactNode }) {
  return <div className="clues-root">{children}</div>;
}
