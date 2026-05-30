# justinmillheim.com

Personal portfolio for Justin Millheim — Builder · Connector · AI Enthusiast. Next.js (App Router) + TypeScript, a hand-built Ink & Ember design system, deployed on Vercel.

- **Live:** https://justinmillheim.com
- **Editing guide:** see `MAINTENANCE.md`
- **Brand source of truth:** see `brand-reference.md`

## Stack

- Next.js 14 (App Router) + TypeScript
- `next/font` for Fraunces, Hanken Grotesk, JetBrains Mono
- Framer Motion for scroll reveals, filter transitions, and carousels
- MDX blog via `next-mdx-remote` + `gray-matter` (no CMS, no database)
- Typed content in `content/` (experience, projects, testimonials, galleries)
- One source of truth for color/type in `app/globals.css`
- Contact form via Web3Forms (no backend)

## Run it locally

Requires Node 18.17+.

```bash
npm install
npm run dev      # http://localhost:3000
```

## Project layout

```
app/                routes: home (/), work, projects, about, blog, blog/[slug]
components/         Nav, Footer, ContactModal/ContactContext, Reveal, Testimonials
components/blog/    Fig, Gallery, Carousel, Suno, Lightbox (MDX rendering)
content/            experience.ts, projects.ts, testimonials.ts, galleries.ts, blog/*.mdx
lib/log.ts          reads + parses the MDX blog posts
public/             resume.pdf, headshot.png, logos/, testimonials/, blog/<slug>/ images
app/globals.css     Ink & Ember tokens + all component styles
```

## Deploy

The repo is connected to Vercel. **Every push to `main` auto-deploys** to production and the domain. For larger changes, branch off `main`, push the branch for a private Vercel preview, then merge to `main` to ship. See `MAINTENANCE.md` for the full workflow and where each piece of content lives.

## Environment

- `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` — Web3Forms key for the contact form (set in Vercel; a fallback exists in `components/ContactModal.tsx`).

## Notes

This repo is built to be edited with Claude Code. `brand-reference.md` gives the design and voice context; `MAINTENANCE.md` is the step-by-step editing guide. The edit → push → deploy loop is the whole maintenance story.
