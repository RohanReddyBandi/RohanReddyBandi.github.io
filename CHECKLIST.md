# Content still to fill in

Everything on the site that's a placeholder, and where the real thing goes.
Text lives in `src/content/site.ts` unless noted. After changing any of it,
push to `main` and the site redeploys.

## Files

| What | Put it here | Notes |
| --- | --- | --- |
| Resume | `public/resume.pdf` | Exactly that name. Every resume link (top bar, phone menu, Contact button) appears automatically once the file exists. Restart `npm run dev` locally to see them. |
| Photo of you | `src/assets/photo.jpg` | Portrait, 4:5, at least 1200 × 1500. Shows in About with the hover lens. Send it and it gets converted and wired in. |
| Duck Days screenshot | `src/assets/work/duck-days-1600.webp` + `duck-days-800.webp` | 16:10. Drop the pair in and it shows up on its own. Or send any 16:10 image (a widget on a home screen works) and it gets converted. |
| Signature | `src/assets/signature.svg` | Replace the file. Best: an SVG drawn as strokes (it draws itself on scroll). A filled outline also works (it wipes in). A photo of it on paper also works; it gets traced. |

TRADR and Compound Growth screenshots are real captures from their live sites
(`src/assets/work/tradr-*.webp`, `compound-growth-*.webp`), and "This Very
Website" shows the site inside itself (`this-website-*.webp`). Swap any of
them for your own anytime with the same names.

## Text (`src/content/site.ts`)

| Placeholder | Where it shows |
| --- | --- |
| `email: '[EMAIL]'` | Contact row (click copies it) |
| `linkedin: '[LINKEDIN URL]'` | Contact row; becomes a link once it's a real `https://` URL |
| `about.line: '[ABOUT LINE]'` | The big statement in About. One or two casual sentences. |
| `clock.city` / `clock.timeZone` | Top bar clock. Set to West Lafayette; change if you'd rather not. |
| Purdue `when: '[GRAD YEAR]'` | Education, Purdue row |
| The Data Mine `when: '[YEAR]'` | Education, nested under Purdue |
| The Data Mine `line: ''` | Optional: one line on what you worked on |
| Work `year` | Duck Days 2026, TRADR 2026, Compound Growth 2025, from each repo's first commit |

## If you change your name or tagline

Re-render the link preview image: `npm run og`, then commit `public/og.png`.
