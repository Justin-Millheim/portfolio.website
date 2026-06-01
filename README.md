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
- `NEXT_PUBLIC_ADOBE_DATASTREAM_ID` — Adobe Edge Network datastream UUID. Find it in **Data Collection → Datastreams** in the Adobe Experience Platform UI.
- `NEXT_PUBLIC_ADOBE_ORG_ID` — Adobe IMS Org ID (`XXXX@AdobeOrg`). Find it in **Adobe Admin Console → Settings → Identity**.

Copy `.env.local.example` to `.env.local` and fill in both values to enable analytics locally. Neither value should ever be committed to git.

## Adobe Analytics

The site uses the Adobe Web SDK (`@adobe/alloy`) to send analytics events to the Adobe Edge Network. A single datastream routes data to both Adobe Analytics and Adobe Customer Journey Analytics (via AEP).

**How it works:**
- `lib/adobe/analytics.ts` — typed module that initialises Alloy and exports `trackPageView(pathname)` and `trackEvent(name, payload)`
- `components/AdobeAnalytics.tsx` — client component that fires a page view on every route change (initial load + soft SPA navigations)
- Both vars must be set for events to fire; if either is missing, a `console.warn` is logged and the module is a no-op — no errors in local dev

**Verify events are reaching the Edge Network:**
1. Install the [Adobe Experience Platform Debugger](https://chromewebstore.google.com/detail/adobe-experience-platform/bfnnokhpnncpkdmbokanobigaccjkpob) Chrome extension
2. Open it on your site and go to **AEP Web SDK** in the left nav
3. Navigate between pages — you should see `sendEvent` calls with your datastream ID appearing in real time
4. In Adobe Analytics, events appear in **Reports** within ~15 minutes; in CJA they appear in the event dataset within ~1 hour

## Notes

This repo is built to be edited with Claude Code. `brand-reference.md` gives the design and voice context; `MAINTENANCE.md` is the step-by-step editing guide. The edit → push → deploy loop is the whole maintenance story.
