// Generates on-brand placeholder cover SVGs for each project tile.
// Run: node scripts/gen-project-covers.mjs
// These are intentionally simple stand-ins. Swap any /public/projects/<id>.svg
// for a real screenshot or photo (16:9) whenever you have one.
import fs from "fs";
import path from "path";

const OUT = path.join(process.cwd(), "public", "projects");
fs.mkdirSync(OUT, { recursive: true });

// [id, title, tag-label]
const items = [
  ["commute", "Commute Briefing Skill", "AI TOOLS · SYSTEMS"],
  ["outreach", "LinkedIn Cold-Outreach Skill", "AI TOOLS"],
  ["engrave", "Laser-Engraving Design Skill", "AI TOOLS · MADE BY HAND"],
  ["song", "Songwriting Skill", "AI TOOLS"],
  ["pma-cc", "PMA Command Center", "SYSTEMS"],
  ["housing", "Automated Housing-Search & Scored Tracker", "SYSTEMS · AI TOOLS"],
  ["command", "Personal Command Center", "SYSTEMS"],
  ["gifts", "Laser-Engraved Gifts", "MADE BY HAND"],
  ["trip", "Trip Planning", "EXPERIENCES"],
  ["health", "Health Accountability Group", "EXPERIENCES"],
  ["mentor", "MBA Peer Mentorship Program", "EXPERIENCES"],
];

const EMBER = "#E86A33";
const BRASS = "#C99A52";

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Wrap a title into at most two lines of ~22 chars.
function wrap(title) {
  const words = title.split(" ");
  const lines = ["", ""];
  let li = 0;
  for (const w of words) {
    if (li === 0 && (lines[0] + " " + w).trim().length > 22) li = 1;
    lines[li] = (lines[li] + " " + w).trim();
  }
  return lines.filter(Boolean);
}

for (let i = 0; i < items.length; i++) {
  const [id, title, tag] = items[i];
  const accent = i % 2 === 0 ? EMBER : BRASS;
  const lines = wrap(title);
  const titleSvg = lines
    .map((ln, idx) => `<tspan x="44" dy="${idx === 0 ? 0 : 40}">${esc(ln)}</tspan>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#231B14"/>
      <stop offset="1" stop-color="#15110D"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)"/>
  <circle cx="556" cy="64" r="150" fill="${accent}" opacity="0.10"/>
  <circle cx="556" cy="64" r="90" fill="${accent}" opacity="0.08"/>
  <rect x="44" y="86" width="40" height="3" rx="1.5" fill="${accent}"/>
  <text x="44" y="74" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="14" letter-spacing="3" fill="${accent}">${esc(tag)}</text>
  <text y="${lines.length > 1 ? 258 : 278}" font-family="Georgia, 'Fraunces', serif" font-size="34" font-weight="500" fill="#F1E8DC">${titleSvg}</text>
  <text x="44" y="326" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="12" letter-spacing="2" fill="#9A8C7C">justinmillheim.com</text>
</svg>
`;
  fs.writeFileSync(path.join(OUT, `${id}.svg`), svg, "utf8");
  console.log("wrote", `public/projects/${id}.svg`);
}
console.log(`Done. ${items.length} covers generated.`);
