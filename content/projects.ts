export type Project = {
  id: string;
  title: string;
  domain: string;
  blurb: string;
  featured?: boolean;
};

export const projectDomains = [
  "AI Tools",
  "Systems",
  "Models",
  "Made by hand",
  "Experiences",
];

export const projects: Project[] = [
  { id: "commute", title: "Commute Briefing Skill", domain: "AI Tools", blurb: "Turns any topic into a TTS-ready audio briefing for my drive. Built on Claude Skills plus a Google Drive topic bank.", featured: true },
  { id: "outreach", title: "LinkedIn Cold-Outreach Skill", domain: "AI Tools", blurb: "Drafts sharp, personalized professional outreach: connection notes, InMails, informational-interview asks." },
  { id: "engrave", title: "Laser-Engraving Design Skill", domain: "AI Tools", blurb: "End-to-end workflow that outputs engraver-ready black-and-white vector art for custom gifts." },
  { id: "song", title: "Songwriting Skill", domain: "AI Tools", blurb: "Concept-to-lyrics facilitator with a dedicated refinement phase and production-prompt output." },
  { id: "pma-cc", title: "PMA Command Center", domain: "Systems", blurb: "A full Notion operating system for a student org: pipeline, CRM, KPI dashboard, built for handoff.", featured: true },
  { id: "housing", title: "Housing-Search Scored Tracker", domain: "Systems", blurb: "Weighted-criteria spreadsheet that ranks apartments against Tier-1 needs for an August move." },
  { id: "command", title: "Personal Command Center", domain: "Systems", blurb: "A multi-track life-management concept for work, school, and side projects in one place. This site is part of it." },
  { id: "fin-models", title: "Finance Workbooks", domain: "Models", blurb: "WACC, CAPM, capital structure, and real-options models with annotated formula sheets." },
  { id: "montgras", title: "MontGras Channel Economics", domain: "Models", blurb: "A distribution-economics model comparing channel strategies for a wine producer." },
  { id: "gifts", title: "Laser-Engraved Gifts", domain: "Made by hand", blurb: "Charcuterie boards, water bottles, journals, and patches. Personalized, one-off, given away." },
  { id: "ccc", title: "Camp · Cast · Climb", domain: "Experiences", blurb: "A two-day cowboy-camping, fishing, and via ferrata trip I designed and guided. Structured fun is a product too.", featured: true },
  { id: "health", title: "Health Accountability Group", domain: "Experiences", blurb: "A small group I launched and run to keep people consistent. Light structure, real follow-through." },
  { id: "mentor", title: "MBA Peer Mentorship Program", domain: "Experiences", blurb: "Designed a pairing-and-cadence program to connect incoming and current MBA students." },
];
