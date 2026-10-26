# Content still to fill in

Everything on the site that's a placeholder, and where the real thing goes.
Text lives in `src/content/site.ts` unless noted. After changing any of it,
push to `main` and the site redeploys.

## Files

| What | Put it here | Notes |
| --- | --- | --- |
| Resume | `public/resume.pdf` | Exactly that name. Every resume link (top bar, phone menu, Contact button) appears automatically once the file exists. Restart `npm run dev` locally to see them. |
| Photo of you | `src/assets/photo.jpg` | Portrait, 4:5, at least 1200 × 1500. Shows in About with the hover lens. Send it and it gets converted to AVIF/WebP and wired in. |
| TRADR screenshot | `src/assets/work/tradr.png` | 16:10, at least 1600 × 1000. Shows in the hover preview and on phone cards. |
| Duck Days screenshot | `src/assets/work/duck-days.png` | Same size. An App Store screenshot or a widget shot on a home screen both work. |
| Trackpad Scale screenshot | `src/assets/work/trackpad-scale.png` | Same size. Skip it until there's something to show; the placeholder holds. |
| Signature | `src/assets/signature.svg` | Replace the file. Best: an SVG drawn as strokes (it draws itself on scroll). A filled outline also works (it wipes in). A photo of it on paper also works; it gets traced. |

## Text (`src/content/site.ts`)

| Placeholder | Where it shows |
| --- | --- |
| `email: '[EMAIL]'` | Contact row (click copies it) |
| `linkedin: '[LINKEDIN URL]'` | Contact row; becomes a link once it's a real `https://` URL |
| `about.line: '[ABOUT LINE]'` | The big statement in About. One or two casual sentences. |
| `clock.city` / `clock.timeZone` | Top bar clock. Set to West Lafayette; change if you'd rather not. |
| Trackpad Scale `tags: ['macOS', '[TAGS]']` | Work row. What it's built with. |
| Work `year: '2026'` (all three) | Taken from each repo's first commit. Change if wrong. |
| The Data Mine `when: '[YEAR]'` | Experience panel caption |
| The Data Mine `line: 'General cohort.'` | Optional: one line on what you worked on |
| DECA `caption: '[EVENT]'`, `when: '[YEAR]'` | Experience panel caption |
| Purdue `when: '[GRAD YEAR]'` | Experience panel caption |
| Off the Clock `detail` lines | `[HOW GOOD, HONESTLY?]`, `[DREAM CAR]`, `[WATCH]`, `[SCENT]`, `[ANIME]` |
| Off the Clock `line` jokes | Drafts about each hobby; rewrite any that don't sound like you |

## If you change your name, tagline or chart

Re-render the link preview image: `npm run og`, then commit `public/og.png`.
