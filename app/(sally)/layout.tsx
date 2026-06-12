import type { Metadata } from "next";
import "./sally.css";

// "Sally the Songbird" — a guided, conversational songwriting studio. Like
// /train, /program, /recipes, and /tote it's deliberately unlinked from the
// portfolio nav and kept out of search indexes; it renders inside the shared
// root <html>/<body> but brings its own full-bleed Ink & Ember writing-room
// theme.
export const metadata: Metadata = {
  title: "Sally the Songbird — Songwriting Studio",
  description: "Write songs with Sally: intake, outline, draft, refine, and a Suno-ready production prompt.",
  robots: { index: false, follow: false },
};

export default function SallyLayout({ children }: { children: React.ReactNode }) {
  return <div className="sb-root">{children}</div>;
}
