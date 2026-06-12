import type { Metadata } from "next";
import "./recipes.css";

// Standalone recipe box ("Mise"). Like /train and /program it's deliberately
// unlinked from the portfolio nav and kept out of search indexes. It renders
// inside the shared root <html>/<body> but brings its own full-bleed theme so
// none of the portfolio styling bleeds in.
export const metadata: Metadata = {
  title: "Mise — Recipe Box",
  description: "Capture, organize, scale, and search your recipes.",
  robots: { index: false, follow: false },
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <div className="recipes-root">{children}</div>;
}
