# Maintaining justinmillheim.com

A practical guide to updating the site. You don't need to be a developer to change wording, add a job, post to the blog, or swap an image.

---

## 1. How publishing works

```
edit a file → git commit → git push → Vercel rebuilds → justinmillheim.com updates (~30s)
```

- **Code:** GitHub repo `Justin-Millheim/portfolio.website`, branch `main`.
- **Hosting:** Vercel project `justinmillheim`. Every push to `main` auto-deploys to production + the domain.
- **The everyday loop:**
  ```bash
  cd "~/Downloads/justinmillheim 2"
  npm run dev            # preview at localhost:3000 while you edit
  git add -A && git commit -m "what changed" && git push
  ```

### For bigger changes, use a staging branch
So the live site never shows half-finished work:
```bash
git checkout -b my-change      # work, commit
git push -u origin my-change   # Vercel builds a private preview URL
```
Review the preview, then merge to `main` (`git checkout main && git merge my-change && git push`) to go live. Delete the branch when done.

---

## 2. Where every piece of text lives

| What you see on the site | File |
|---|---|
| Browser tab title + Google/social preview text | `app/layout.tsx` (`metadata`) |
| Top nav: name, tabs (Home/Work/Projects/Blog/About), **Connect** button | `components/Nav.tsx` |
| Footer: tagline, build credit, copyright | `components/Footer.tsx` |
| Home headline, subhead, **"Currently"** block | `app/page.tsx` (the hero) |
| Home **"What I'm about"** cards (Builder/Connector/AI Enthusiast) | `app/page.tsx` (`modes` array) — each links to its blog essay |
| Home **"What I've been up to"** (featured projects) | pulled from `content/projects.ts` (the `featured` ones) |
| Home **"What coworkers say"** testimonials | `content/testimonials.ts` |
| Home closing call-to-action | `app/page.tsx` (the `cta` block) |
| Work page intro + Education cards | `app/work/page.tsx` |
| Work job history (roles, problem/did/impact, logos) | `content/experience.ts` |
| Projects cards (title, blurb, tags, blog link) | `content/projects.ts` |
| About bio, "Off the Clock" tags, contact buttons | `app/about/page.tsx` |
| **Blog posts** | `content/blog/*.mdx` (one file per post) |
| Carousel/gallery image sets | `content/galleries.ts` |
| Contact form modal | `components/ContactModal.tsx` |

**Rule of thumb:** lists of similar things (jobs, projects, testimonials, gallery images) live in clearly-named arrays in `content/`. Edit the text inside the quotes.

---

## 3. Common tasks

### Reword something
Find it in the table above, edit the text inside the quotes, commit, push.

### Add / edit a job (Work page)
Edit `content/experience.ts`. Each role is a block with `role`, `org`, `dates`, `tags`, `problem`, `did`, `impact`, a `group` (`"professional"` or `"leadership"`), and an optional `logo` (a path in `public/logos/`). Copy an existing block to add one. `tags` must match entries in the `workTags` list at the top.

### Add / edit a project (Projects page)
Edit `content/projects.ts`. Each project has `title`, `tags` (array — multi-select filters; must match `projectDomains`), `blurb`, optional `featured: true` (shows on the home page), and optional `post: "<blog-slug>"` (makes the card click through to that blog post).

### Write a new blog post
1. Create `content/blog/my-post.mdx`. The filename is the URL: `/blog/my-post`.
2. Start with frontmatter, then write the body in Markdown:
   ```mdx
   ---
   title: "My post title"
   date: "2026-06-01"
   excerpt: "One-line teaser shown in the blog feed."
   ---

   Body in Markdown. Use ## headings, **bold**, and - bullet lists.
   ```
3. Posts sort newest-first by `date` and appear automatically at `/blog` and on the Projects → Blog tab.
4. To make a project card link to it, set `post: "my-post"` on that project in `content/projects.ts`.
5. Add `hidden: true` to the frontmatter to keep a page out of the feed but still reachable by URL (that's how the trip-plan page works).

### Use images, galleries, and embeds in a post
Put image files in `public/blog/<post-slug>/`, then use these components in the `.mdx`:

```mdx
<!-- a single captioned image (click-to-expand built in). w/h = the image's pixel size -->
<Fig src="/blog/my-post/1.jpg" w={1440} h={960} alt="describe it" caption="optional caption" />

<!-- a swipe/arrow carousel or a grid gallery — image list comes from content/galleries.ts -->
<Carousel slug="my-post" />
<Gallery slug="my-post" />

<!-- an embedded Suno player -->
<Suno id="the-suno-embed-id" />
```
For `<Carousel>`/`<Gallery>`, add the image list to `content/galleries.ts` under the post's slug. All blog images open in a lightbox on click.

### Edit the testimonials
`content/testimonials.ts` — each entry has `quote`, `name`, `title`, `relation`, and `photo` (a file in `public/testimonials/`).

---

## 4. The contact form
The **Connect** button (header) and **Start a conversation** (home) open a modal that emails you via **Web3Forms**. The access key is set as `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` in Vercel (with a fallback in `components/ContactModal.tsx`). Messages go to `jaymillheim@gmail.com`. Web3Forms keys are public by design, so this is safe.

---

## 5. Still-open placeholders
- **`public/og-image.png`** (1200×630 social-share image) — not added yet, so link previews are bare. Referenced in `app/layout.tsx`.
- **Favicon** — none yet; add `app/icon.png` for a browser-tab icon.
- **Adobe impact metric** in `content/experience.ts` is still "in progress" — swap in real numbers when the internship wraps.

---

## 6. Preview & troubleshooting
- **Preview locally:** `npm run dev` → http://localhost:3000.
- **Pushed but nothing changed:** check the build at https://vercel.com/justin-millheims-projects/justinmillheim — a red "Error" means the build failed (usually a typo in a `.ts`/`.tsx`/`.mdx` file). Run `npm run build` locally to see the exact line. The live site keeps serving the last good build, so nothing goes down.
- **`git push` asks for a password:** your GitHub CLI login expired. Re-run `~/.local/bin/gh auth login --hostname github.com --git-protocol https --web`.

---

## 7. Quick reference
- **Live:** https://justinmillheim.com · **Repo:** github.com/Justin-Millheim/portfolio.website · **Vercel:** justin-millheims-projects/justinmillheim
- **Local folder:** `~/Downloads/justinmillheim 2` · **Stack:** Next.js 14 (App Router) + TypeScript, Framer Motion, MDX. Dark "Ink & Ember" theme (`brand-reference.md`).
- **The 3 commands you'll use most:** `npm run dev` · `git add -A && git commit -m "…"` · `git push`
