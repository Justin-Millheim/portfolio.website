export type Stat = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  source?: string; // short context, e.g. "@ Domo"
};

// Outcome-led headline numbers. Each is pulled verbatim from a real result in
// content/experience.ts and tied to where it happened, so the band reads as
// proof, not inventory. Swap in alternates freely:
//   75% lower processing costs (Domo) · 30% faster time-to-market (Mity)
//   12x Instagram growth (Quarry) · 50,000+ SKUs repriced 4x faster (Mity)
export const stats: Stat[] = [
  { value: 200, suffix: "K+", label: "Users on products I shipped", source: "@ Domo" },
  { value: 90, suffix: "%", label: "Adoption of a relaunched data engine", source: "@ Domo" },
  { value: 60, suffix: "%", label: "Faster enterprise onboarding", source: "@ Visier" },
  { value: 92, suffix: "%", label: "Customer satisfaction score", source: "@ Domo" },
];
