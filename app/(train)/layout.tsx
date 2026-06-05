import type { Metadata } from "next";
import "./train.css";

// Standalone workout tool. Deliberately unlinked from the portfolio nav and
// kept out of search indexes. Renders inside the shared root <html>/<body> but
// brings its own full-bleed theme so none of the portfolio styling bleeds in.
export const metadata: Metadata = {
  title: "Train — Workout Companion",
  description: "Your guided beginner workout companion.",
  robots: { index: false, follow: false },
};

export default function TrainLayout({ children }: { children: React.ReactNode }) {
  return <div className="train-root">{children}</div>;
}
