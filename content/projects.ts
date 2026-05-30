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
  "Made by hand",
  "Experiences",
];

export const projects: Project[] = [
  { id: "commute", title: "Commute Briefing Skill", domain: "AI Tools", blurb: "Turns any topic into a TTS-ready audio briefing for my drive. Built on Claude Skills plus a Google Drive topic bank.", featured: true },
  { id: "outreach", title: "LinkedIn Cold-Outreach Skill", domain: "AI Tools", blurb: "Drafts sharp, personalized professional outreach: connection notes, InMails, informational-interview asks." },
  { id: "engrave", title: "Laser-Engraving Design Skill", domain: "AI Tools", blurb: "End-to-end workflow that outputs engraver-ready black-and-white vector art for custom gifts." },
  { id: "song", title: "Songwriting Skill", domain: "AI Tools", blurb: "Concept-to-lyrics facilitator with a dedicated refinement phase and production-prompt output." },
  { id: "pma-cc", title: "PMA Command Center", domain: "Systems", blurb: "A full Notion operating system for a student org: pipeline, CRM, KPI dashboard, built for handoff.", featured: true },
  { id: "housing", title: "Automated Housing-Search & Scored Tracker", domain: "Systems", blurb: "Scrapes rental sites and applies a weighted-criteria spreadsheet ranking apartments against desired specs." },
  { id: "command", title: "Personal Command Center", domain: "Systems", blurb: "A multi-track life-management concept for work, school, and side projects in one place. This site is part of it." },
  { id: "gifts", title: "Laser-Engraved Gifts", domain: "Made by hand", blurb: "Charcuterie boards, water bottles, journals, and patches. Personalized, one-off, given away." },
  { id: "trip", title: "Trip Planning", domain: "Experiences", blurb: "I design trips like products — a two-day cowboy-camp, cast, and via-ferrata run, scoped and guided end to end. Structured fun is a deliverable too.", featured: true },
  { id: "health", title: "Health Accountability Group", domain: "Experiences", blurb: "A small group I launched and run to keep people consistent. Light structure, real follow-through." },
  { id: "mentor", title: "MBA Peer Mentorship Program", domain: "Experiences", blurb: "Designed a pairing-and-cadence program to connect incoming and current MBA students." },
];
