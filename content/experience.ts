export type Experience = {
  id: string;
  role: string;
  org: string;
  dates: string;
  tags: string[];
  problem: string;
  did: string;
  impact: string;
  group: "professional" | "leadership";
  logo?: string;
  todo?: boolean;
};

export const workTags = [
  "Data & Analytics",
  "Platform & Tooling",
  "AI & Automation",
  "0→1 & Launch",
  "Strategy & Roadmap",
  "Community & Enablement",
];

export const experience: Experience[] = [
  // ---------------- Professional ----------------
  {
    id: "adobe",
    role: "MBA Product Management Intern",
    org: "Adobe · Lehi, UT",
    dates: "May 2026 – Present",
    tags: ["AI & Automation", "Data & Analytics", "Platform & Tooling"],
    group: "professional",
    logo: "/logos/adobe.png",
    problem:
      "Adobe's Customer Journey Analytics team needed to determine how best to leverage agentic AI to speed up analysis, time-to-value, and PM work.",
    did:
      "Building and shipping AI-powered platform tooling: production Claude Skills, MCP integrations, and Claude Code workflows, plus the documentation to get the team adopting them.",
    impact:
      "In progress. Quantifying workflows automated and skills adopted by the end of the internship.",
    todo: true,
  },
  {
    id: "mity",
    role: "Product Manager",
    org: "Mity Inc. · Orem, UT",
    dates: "2024 – 2025",
    tags: ["0→1 & Launch", "Strategy & Roadmap", "Community & Enablement"],
    group: "professional",
    logo: "/logos/mity.png",
    problem:
      "A $70M+ manufacturer was scaling, but its new-product-development process could not keep up, so launches were slow and inconsistent.",
    did:
      "Implemented a scalable stage-gate NPD process across engineering, operations, sales, and leadership. Redesigned new product-request workflows, overhauled the company-wide price-sheet process, ran all NPD work in Asana across 5+ teams, and built product training for every customer-facing function.",
    impact:
      "30% faster time-to-market, new-product-request turnaround cut in half, and price-sheet updates roughly 4x faster across 50,000+ SKUs.",
  },
  {
    id: "visier",
    role: "Product Manager II",
    org: "Visier Inc. · Vancouver, BC",
    dates: "2022 – 2023",
    tags: ["Data & Analytics", "Platform & Tooling", "Strategy & Roadmap"],
    group: "professional",
    logo: "/logos/visier.png",
    problem:
      "Enterprise customers took too long to onboard and find value from the product. Onboarding and data ingestion were the bottleneck.",
    did:
      "Led development and launch of new data connectors and owned the end-to-end ingestion pipeline for accuracy and timeliness. Prioritized roadmaps across three engineering teams to ship critical features on schedule.",
    impact: "Cut data-onboarding time 60% for every new enterprise customer.",
  },
  {
    id: "domo",
    role: "Product Manager",
    org: "Domo, Inc. · American Fork, UT",
    dates: "2019 – 2022",
    tags: ["Data & Analytics", "Platform & Tooling", "0→1 & Launch", "Strategy & Roadmap"],
    group: "professional",
    logo: "/logos/domo.png",
    problem:
      "Domo's data-transformation layer needed a generational upgrade to stay competitive, without disrupting the 200,000+ users who relied on it daily.",
    did:
      "Owned scoping, cross-team build, and rollout of a next-gen ETL engine. Ran discovery to launch for 31+ feature sets across ETL, SQL, R, and Python tooling. Built and presented data-backed roadmaps to the C-suite, and started a Customer Advisory Board that fed A/B tests and live user research into prioritization. Grew from intern to PM across three years.",
    impact:
      "90% adoption of the new engine, 75% lower processing costs, and a 92% customer satisfaction score.",
  },
  {
    id: "quarry",
    role: "Marketing Manager",
    org: "The Quarry Climbing Center · Provo, UT",
    dates: "2016 – 2019",
    tags: ["Community & Enablement", "Strategy & Roadmap"],
    group: "professional",
    problem:
      "A growing climbing gym needed to leverage a strong market share and customer base into profit-maximizing programs and turn one-off visitors into a returning community.",
    did:
      "Ran primary market research to define the target audience, owned the rebuild of the company website with a small media team, and designed recurring events like competitions, vendor demos, and social clubs. Grew from digital media into the head marketing manager.",
    impact:
      "Grew Instagram following 12x and engagement 5x, lifted Google reviews 74% at a 4.5-star rating, and launched the first BYU-sponsored climbing course.",
  },
  {
    id: "specialized",
    role: "Supply Chain Management Intern",
    org: "Specialized Bicycle Components · Morgan Hill, CA",
    dates: "2017 – 2018",
    tags: ["Data & Analytics", "Platform & Tooling"],
    group: "professional",
    logo: "/logos/specialized.png",
    problem:
      "A global bike maker's demand-planning and request processes were straining under scale and a forecasting overhaul.",
    did:
      "Built ad hoc SQL and Excel reporting for senior leadership, designed process documentation for the forecasting change, handled monthly purchase planning for 26,000+ SKUs, and stood up a Jira Service Desk. Trained Specialized's Taiwan demand planners on the new requisition process on-site.",
    impact:
      "16% fewer total shipments through a consolidation-at-origin plan, and 200% faster processing of non-revenue requests.",
  },
  {
    id: "pmi",
    role: "Product Manager",
    org: "Property Management Inc. · Lehi, UT",
    dates: "2016 – 2017",
    tags: ["Platform & Tooling", "0→1 & Launch", "Community & Enablement"],
    group: "professional",
    logo: "/logos/pmi.png",
    problem:
      "PMI was scaling its franchise network and knew franchisees needed better tooling to operate and grow — but no one had defined what that tooling should actually be.",
    did:
      "Ran the discovery to figure out what franchisees actually needed, then researched and custom-built PMI Systems: a CRM and reputation-management product for the franchise base. Designed the onboarding workflows, produced training across 40 courses, and led the change management to roll it out.",
    impact: "Adopted across 200+ franchisees, lifting software adoption 38% and helping PMI reach Franchise 500 status.",
  },
  {
    id: "byu-library",
    role: "Business & Economics Reference Specialist",
    org: "Brigham Young University · Provo, UT",
    dates: "2017",
    tags: ["Data & Analytics", "Community & Enablement"],
    group: "professional",
    logo: "/logos/byu.png",
    problem:
      "Students and faculty needed help turning dense business and economics databases into usable research.",
    did:
      "Supported librarians and faculty on data-intensive projects and trained students, faculty, and community members on research techniques and database use.",
    impact: "Made specialized business and economics data accessible to a wide range of researchers.",
  },

  // ---------------- Leadership & Community ----------------
  {
    id: "pma",
    role: "President",
    org: "Product Management Association · David Eccles School of Business",
    dates: "2024 – 2027",
    tags: ["Community & Enablement", "Strategy & Roadmap"],
    group: "leadership",
    logo: "/logos/utah.png",
    problem:
      "PMA was already a strong, well-run club. The risk was continuity — every year of momentum, relationships, and know-how lived in people's heads and scattered docs, and reset at handoff.",
    did:
      "Elected President after a year as Director of Design & Alumni Relations. Designed and built a Notion Command Center: an Event Pipeline, a Task Master board, a Partner & Speaker CRM, and a Membership & Attendance tracker rolled up into a live KPI dashboard. Sourced PM professionals to speak at and support club events.",
    impact:
      "Built a handoff-ready operating system and partner network so each new presidency starts ahead instead of from scratch.",
  },
  {
    id: "lassonde",
    role: "Program Chair",
    org: "Lassonde Entrepreneur Institute · Get Seeded Program",
    dates: "2025 – 2027",
    tags: ["Community & Enablement"],
    group: "leadership",
    logo: "/logos/utah.png",
    problem:
      "Early student founders had nowhere low-stakes to practice pitching and win the first bit of grant funding that turns an idea into action — exactly what Lassonde's nonprofit mission exists to provide. Get Seeded is the vehicle, but it only delivers if the pitch nights are worth showing up for.",
    did:
      "Stepped up to Chair after a year as Event Coordinator. Plan, coordinate, and host the pitch events where students compete for microgrants, owning the run-of-show and the experience end to end.",
    impact:
      "Ran pitch nights that filled the room and sent early founders home with their first funding.",
  },
];
