# Maintaining justinmillheim.com

A practical guide to updating this site. Written for the person doing the edits — you don't
need to be a developer to change wording, add a job, or post to the build log.

---

## 1. How publishing works now

The site auto-deploys. You don't run any deploy commands.

```
edit a file  →  git commit  →  git push  →  Vercel rebuilds  →  justinmillheim.com updates (~30s)
```

- **Code lives on GitHub:** `Justin-Millheim/portfolio.website` (branch `main`).
- **Vercel watches `main`.** Every push to `main` triggers a production build and updates the live domain.
- **No manual deploys needed.** (The old `npx vercel --prod` still works as a fallback, but you shouldn't need it.)

### The one loop you'll repeat

From the project folder (`~/Downloads/justinmillheim 2`):

```bash
# 1. (optional but recommended) preview locally first — see section 5
npm run dev

# 2. make your edits in the files below, then:
git add -A
git commit -m "Update About page wording"
git push
```

That's it. Watch it go live at https://justinmillheim.com a few seconds later.

> **Tip:** Want to test a change without touching the live site? Push to a *different* branch
> instead of `main`. Vercel builds a private **preview URL** for it, and `main` (the live site)
> stays untouched until you're ready. See section 5.

---

## 2. Where every piece of text lives  ← start here for wording changes

Almost all of the site's copy is in a handful of files. This table maps what you see on the
page to the file you edit.

| What you see on the site | File to edit |
|---|---|
| **Browser tab title, Google/social preview text** | `app/layout.tsx` (the `metadata` block) |
| **Top nav links + the "Justin Millheim" logo + "Let's talk" button** | `components/Nav.tsx` |
| **Footer tagline, social links, location, "Built by me…" line** | `components/Footer.tsx` |
| **Home headline ("Clearer systems, closer teams…")** | `app/page.tsx` (the `<h1>`) |
| **Home intro paragraph + "Currently" block** | `app/page.tsx` (the `<header className="hero">` section) |
| **Home's three cards (Product / Builder / Connector)** | `app/page.tsx` (the `modes` array at the top) |
| **Home "Let's build something" call-to-action** | `app/page.tsx` (the `cta` section near the bottom) |
| **About page bio (the 3 paragraphs)** | `app/about/page.tsx` |
| **About "off the clock" interests (Rock hounding, Fishing…)** | `app/about/page.tsx` (the `offClock` array) |
| **About contact links + "Reach me" text** | `app/about/page.tsx` |
| **/now page ("Working on / Reading / Adventuring / Tinkering")** | `app/now/page.tsx` (the `rows` array) |
| **Work page: your job history (roles, orgs, problem/did/impact)** | `content/experience.ts` |
| **Work page: the filter chips (Data & Analytics, AI & Automation…)** | `content/experience.ts` (the `workTags` array) |
| **Work page: Education cards** | `app/work/page.tsx` (the `education` array) |
| **Work page: intro line + "Résumé" button** | `app/work/page.tsx` |
| **Projects page: every project card (title, blurb, category)** | `content/projects.ts` |
| **Projects page: the category filters (AI Tools, Systems…)** | `content/projects.ts` (the `projectDomains` array) |
| **Build-log posts (the writing under /log/…)** | `content/log/*.mdx` (one file per post) |

**Rule of thumb:** anything that's a *list of similar things* (jobs, projects, interests, /now rows)
lives in a clearly-named array — usually in `content/`. Edit the text inside the quotes and leave
the surrounding punctuation/structure alone.

> ⚠️ **Watch the quotes.** Text lives inside `"..."`. If your new wording contains a quote or an
> apostrophe, the site already uses typographic spellings like `&rsquo;` (’) and `&rsquo;`/`’`
> to stay safe. Easiest path: avoid straight `"` and `'` inside the text, or just preview locally
> (section 5) — if the page loads, you're fine.

---

## 3. Common tasks, step by step

### Reword something on a page
1. Find it using the table in section 2.
2. Open the file, change the text inside the quotes.
3. `git add -A && git commit -m "…" && git push`.

### Add or edit a job (Work page)
Open `content/experience.ts`. Each role is one block like this:

```ts
{
  id: "adobe",                          // any unique short label, no spaces
  role: "MBA Product Management Intern",
  org: "Adobe — Customer Journey Analytics · Lehi, UT",
  dates: "May 2026 – Present",
  tags: ["AI & Automation", "Data & Analytics"],   // must match names in workTags
  problem: "…",                          // the situation
  did: "…",                              // what you did
  impact: "…",                           // the result / metrics
  todo: true,                            // OPTIONAL: marks impact as "in progress" styling
},
```

- **To add a job:** copy an existing block, paste it where you want it in the list (order = display
  order), and change the values. Give it a unique `id`.
- **To remove a job:** delete its block (from the `{` to the matching `},`).
- **Tags** must exactly match an entry in the `workTags` list at the top of the same file. Add a new
  tag there first if you need a new filter.

### Add or edit a project (Projects page)
Open `content/projects.ts`. Each project is one line:

```ts
{ id: "commute", title: "Commute Briefing Skill", domain: "AI Tools", blurb: "…", featured: true },
```

- `domain` must match an entry in `projectDomains` (top of the file) — that's the category filter.
- `featured: true` makes it also appear in **"Selected work" on the home page.** Remove `featured: true`
  to keep it on the Projects page only. (Keep ~3 featured so the home grid looks balanced.)

### Write a new build-log post
1. Create a new file in `content/log/`, e.g. `content/log/my-new-post.mdx`.
   The filename becomes the URL: `/log/my-new-post`.
2. Start it with this frontmatter block, then write the body in plain Markdown:

```mdx
---
title: "Your post title"
date: "2026-06-15"
excerpt: "One-sentence teaser shown in the feed and on the home page."
---

Your first paragraph here.

## A subheading

More writing. Use **bold**, *italics*, and `##` headings normally.
```

- Posts **sort newest-first automatically** by `date` (format `YYYY-MM-DD`).
- The **two newest** appear on the home page; **all** appear on Projects → "Log" tab.
- To delete a post, just delete its `.mdx` file.

### Update the /now page
Open `app/now/page.tsx`, edit the `rows` array (each row is `["Label", "Text"]`). The eyebrow says
"updated monthly" — keep it honest or change that line too.

---

## 4. Outstanding placeholders to replace (do these soon)

These are real TODOs left in the site today. Search the repo for `REPLACE-ME` and `TODO` to find them.

| Item | Where | What to do |
|---|---|---|
| **GitHub link** is a dead `REPLACE-ME` | `components/Footer.tsx`, `app/about/page.tsx` | Replace `https://github.com/REPLACE-ME` with your real profile (e.g. `https://github.com/Justin-Millheim`) |
| **Résumé button** 404s | `app/work/page.tsx` links to `/resume.pdf` | Drop a `resume.pdf` into the `public/` folder |
| **About photo** is a placeholder box | `app/about/page.tsx` (`.photo` div) | Add your photo to `public/` and swap the box for it (4:5 portrait) |
| **Social share image** missing | referenced in `app/layout.tsx` as `/og-image.png` | Add a 1200×630 `og-image.png` to `public/` (this is the preview when you share the link) |
| **Favicon** | — | Drop `app/icon.png` (or `app/favicon.ico`) |
| **Adobe impact metric** is a "todo" placeholder | `content/experience.ts` (the `adobe` block) | Fill in real numbers when the internship wraps; remove `todo: true` |

Anything in the `public/` folder is served at the root of the site (so `public/resume.pdf` → `/resume.pdf`).

---

## 5. Preview before you publish (recommended)

To see changes on your own machine before they go live:

```bash
cd ~/Downloads/"justinmillheim 2"
npm run dev
```

Then open **http://localhost:3000**. It live-reloads as you save files. Press `Ctrl+C` to stop.
If the local site loads without an error, your edits are safe to push.

### Safer publishing with preview deploys
If you want a change reviewed/staged before it hits the live domain:

```bash
git checkout -b draft-changes      # work on a side branch
# …edit, commit…
git push -u origin draft-changes   # Vercel builds a PRIVATE preview URL, live site untouched
```

Vercel comments the preview link on the push. When happy, merge the branch into `main`
(or open a Pull Request on GitHub and merge it) — that's what goes live.

---

## 6. If something breaks

| Symptom | Likely cause / fix |
|---|---|
| **Pushed, but the live site didn't change** | Check the build at https://vercel.com/justin-millheims-projects/justinmillheim — a red "Error" means the build failed (see next row). The live site keeps serving the last good build, so nothing goes down. |
| **Build failed on Vercel** | Open the failed deployment's logs. Most common cause is a typo in a `.ts`/`.tsx` file — a missing comma, quote, or brace. Run `npm run build` locally to reproduce and see the exact line. |
| **`npm run dev` won't start** | Run `npm install` first (re-installs dependencies), then `npm run dev` again. |
| **Domain shows the old GoDaddy "launching soon" page** | Only happens on a device with a stale DNS cache. Flush it: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`, then hard-refresh. |
| **`git push` asks for a username/password** | Your GitHub login (via the GitHub CLI) expired. Re-run: `~/.local/bin/gh auth login --hostname github.com --git-protocol https --web` and follow the browser prompt. |

---

## 7. Quick reference

- **Live site:** https://justinmillheim.com (and `www.`)
- **GitHub repo:** https://github.com/Justin-Millheim/portfolio.website (branch `main`)
- **Vercel project:** `justinmillheim` → https://vercel.com/justin-millheims-projects/justinmillheim
- **Local folder:** `~/Downloads/justinmillheim 2`
- **Framework:** Next.js 14 (App Router) + TypeScript. SSL auto-renews via Vercel.
- **GitHub CLI:** installed at `~/.local/bin/gh` (used for auth/pushes)

### The 3 commands you'll use 90% of the time
```bash
npm run dev                 # preview locally at localhost:3000
git add -A && git commit -m "what changed"   # save your changes
git push                    # publish — live in ~30s
```
