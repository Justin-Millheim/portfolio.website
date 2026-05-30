# justinmillheim.com

Personal portfolio for Justin Millheim. Builder PM. Next.js (App Router) + TypeScript, styled with a hand-built Ink & Ember design system, deployed on Vercel.

Brand source of truth: see `brand-reference.md`.

## Stack

- Next.js 14 (App Router) + TypeScript
- `next/font` for Fraunces, Hanken Grotesk, JetBrains Mono
- MDX build log via `next-mdx-remote` + `gray-matter` (no CMS, no database)
- Typed content in `content/experience.ts` and `content/projects.ts`
- One source of truth for color/type in `app/globals.css`

## Run it locally

Requires Node 18.17+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

```
app/                 routes (home, work, projects, about, now, log/[slug])
components/          Nav, Footer
content/             experience.ts, projects.ts, log/*.mdx
lib/log.ts           reads + parses the MDX log posts
public/              resume.pdf, headshot.jpg, og-image.png  (you add — see public/PLACEHOLDERS.md)
app/globals.css      Ink & Ember tokens + all component styles
```

## Add a build-log post

Drop a new file in `content/log/`, for example `content/log/my-post.mdx`:

```mdx
---
title: "My post title"
date: "2026-06-01"
excerpt: "One line that shows in the feed and on the home widget."
---

Write the post in Markdown / MDX here.
```

Commit and push. It appears in the Projects → Log view and at `/log/my-post` automatically.

## Before going live

See `public/PLACEHOLDERS.md`. Short version:

1. Add `resume.pdf`, `headshot.jpg`, `og-image.png` to `public/`.
2. Replace every `REPLACE-ME` (LinkedIn, GitHub, email) in `components/Footer.tsx` and `app/about/page.tsx`.
3. Fill the `TODO` impact lines in `content/experience.ts`.

## Deploy to GitHub

```bash
git init
git add .
git commit -m "Initial commit: portfolio site"
git branch -M main
# Create an empty repo on github.com named "justinmillheim" (no README), then:
git remote add origin https://github.com/YOUR-USERNAME/justinmillheim.git
git push -u origin main
```

## Deploy to Vercel

1. Go to vercel.com, sign in with GitHub.
2. New Project → import the `justinmillheim` repo.
3. Framework preset auto-detects as Next.js. Leave defaults. Deploy.
4. You get a live URL like `justinmillheim.vercel.app` in about a minute.

Every future `git push` to `main` redeploys automatically.

## Point justinmillheim.com (bought at GoDaddy) at Vercel

1. In the Vercel project: Settings → Domains → add `justinmillheim.com` (and `www.justinmillheim.com`).
2. Vercel shows the exact DNS records to set. They are typically:
   - `A` record, host `@`, value `76.76.21.21`
   - `CNAME` record, host `www`, value `cname.vercel-dns.com`
3. In GoDaddy: your domain → DNS → Manage DNS. Edit/add those two records to match what Vercel shows. Remove GoDaddy's default parking records that conflict.
4. Wait for propagation (minutes to a couple hours). Vercel provisions SSL automatically.

Use the exact values Vercel displays — they can differ from the defaults above.

## Tips

This repo is built to be edited with Claude Code. `brand-reference.md` in the root gives it the design and voice context it needs. The edit → push → deploy loop is the whole maintenance story.
