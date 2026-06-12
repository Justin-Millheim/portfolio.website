import type { Metadata } from "next";
import "./tote.css";

// "Tote" — a standalone grocery + recipe + meal-plan companion. Like /train,
// /program, and /recipes it's deliberately unlinked from the portfolio nav and
// kept out of search indexes, and brings its own full-bleed theme so none of
// the portfolio styling bleeds in.
export const metadata: Metadata = {
  title: "Tote — Lists, Recipes & Meal Plan",
  description: "Smart grocery lists that sort themselves by aisle, plus recipes and a weekly meal plan.",
  robots: { index: false, follow: false },
};

export default function ToteLayout({ children }: { children: React.ReactNode }) {
  return <div className="tote-root">{children}</div>;
}
