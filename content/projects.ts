export type Project = {
  id: string;
  title: string;
  tags: string[];
  blurb: string;
  featured?: boolean;
  post?: string; // slug in content/blog if this project has a write-up
  cover?: string; // path under /public for the tile cover image
};

export const projectDomains = [
  "AI Tools",
  "Systems",
  "Made by hand",
  "Experiences",
];

export const projects: Project[] = [
  { id: "commute", title: "Commute Briefing Skill", tags: ["AI Tools", "Systems"], blurb: "Turns any topic into a TTS-ready audio briefing for my drive. Built on Claude Skills plus a Google Drive topic bank.", featured: true, post: "commute-briefing-skill", cover: "/projects/commute.svg" },
  { id: "outreach", title: "LinkedIn Cold-Outreach Skill", tags: ["AI Tools"], blurb: "Drafts sharp, personalized professional outreach: connection notes, InMails, informational-interview asks.", post: "linkedin-outreach-skill", cover: "/projects/outreach.svg" },
  { id: "engrave", title: "Laser-Engraving Design Skill", tags: ["AI Tools", "Made by hand"], blurb: "End-to-end workflow that outputs engraver-ready black-and-white vector art for custom gifts.", post: "laser-engraving-skill", cover: "/projects/engrave.svg" },
  { id: "song", title: "Songwriting Skill", tags: ["AI Tools"], blurb: "Concept-to-lyrics facilitator with a dedicated refinement phase and production-prompt output.", post: "songwriting-skill", cover: "/projects/song.svg" },
  { id: "pma-cc", title: "PMA Command Center", tags: ["Systems"], blurb: "A full Notion operating system for a student org: pipeline, CRM, KPI dashboard, built for handoff.", featured: true, post: "pma-command-center", cover: "/projects/pma-cc.svg" },
  { id: "housing", title: "Automated Housing-Search & Scored Tracker", tags: ["Systems", "AI Tools"], blurb: "Scrapes rental sites and applies a weighted-criteria spreadsheet ranking apartments against desired specs.", cover: "/projects/housing.svg" },
  { id: "command", title: "Personal Command Center", tags: ["Systems"], blurb: "A multi-track life-management concept for work, school, and side projects in one place. This site is part of it.", cover: "/projects/command.svg" },
  { id: "gifts", title: "Laser-Engraved Gifts", tags: ["Made by hand"], blurb: "Charcuterie boards, water bottles, journals, and patches. Personalized, one-off, given away.", cover: "/projects/gifts.svg" },
  { id: "trip", title: "Trip Planning", tags: ["Experiences"], blurb: "I design trips like products — a two-day cowboy-camp, cast, and via-ferrata run, scoped and guided end to end. Structured fun is a deliverable too.", featured: true, post: "guiding-a-via-ferrata", cover: "/projects/trip.svg" },
  { id: "health", title: "Health Accountability Group", tags: ["Experiences"], blurb: "A small group I launched and run to keep people consistent. Light structure, real follow-through.", cover: "/projects/health.svg" },
  { id: "mentor", title: "MBA Peer Mentorship Program", tags: ["Experiences"], blurb: "Designed a pairing-and-cadence program to connect incoming and current MBA students.", cover: "/projects/mentor.svg" },
];
