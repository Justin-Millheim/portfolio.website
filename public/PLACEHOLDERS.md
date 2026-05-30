# Add these files before (or shortly after) going live

The site builds and runs without them, but these make it complete:

- `resume.pdf` — linked from the Work page Résumé button.
- `headshot.jpg` — your photo. Swap it into `app/about/page.tsx` (replace the `.photo` placeholder div with a `next/image`).
- `og-image.png` — 1200x630 social share image. Referenced in `app/layout.tsx` metadata.
- `favicon.ico` — drop into `/app` as `app/icon.png` or `app/favicon.ico`.

## Also replace these placeholder links

Search the repo for `REPLACE-ME`:
- LinkedIn, GitHub, and email in `components/Footer.tsx` and `app/about/page.tsx`.

## And fill the TODO copy

Search for `TODO` in `content/experience.ts` for the impact metrics only you have.
