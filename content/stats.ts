export type Stat = { value: number; suffix: string; label: string };

// Headline numbers for the homepage stats band. Every figure here is drawn
// from a real outcome already documented in content/experience.ts or
// content/projects.ts — keep it that way. Adjust freely; only ship numbers
// you can defend.
//   - 200K+ users: Domo's data-transformation layer (200,000+ daily users)
//   - 30+ features: Domo (31+ feature sets shipped)
//   - 6 product teams: PMI, Specialized, Domo, Visier, Mity, Adobe
//   - 5+ AI tools: the AI-tagged builds in content/projects.ts
export const stats: Stat[] = [
  { value: 200, suffix: "K+", label: "Users reached" },
  { value: 30, suffix: "+", label: "Features shipped" },
  { value: 6, suffix: "", label: "Product teams" },
  { value: 5, suffix: "+", label: "AI tools built" },
];
