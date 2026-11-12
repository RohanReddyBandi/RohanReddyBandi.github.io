# rohanreddybandi.github.io

My personal site. Live at **https://rohanreddybandi.github.io/**.

Vite + React + TypeScript, Tailwind CSS v4, GSAP (ScrollTrigger) and Lenis for scroll.

## Run it locally

Needs Node 22.12 or newer.

```sh
npm install
npm run dev
```

Then open http://localhost:5173.

The first `npm run dev` (or `npm run build`) downloads General Sans from [Fontshare](https://www.fontshare.com) into `public/fonts/`. Its license allows self-hosting it on this site but not redistributing it through a public repo, so it's git-ignored and fetched instead. Caveat (the handwritten notes) is OFL and is committed.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm run lint` | Lints with oxlint |
| `npm run fonts` | Re-fetches the Fontshare fonts (skips files already there) |
| `npm run og` | Re-renders `public/og.png` (link preview) and the PNG favicons. Needs Node 22.18+ |
| `npm run signature` | Regenerates the signature's letter paths in `src/content/signature.ts` from the Mrs Saint Delafield font |

Add `?duck` to the URL to summon the duck right away.

## Deploy

Every push to `main` builds the site and publishes `dist/` to GitHub Pages through `.github/workflows/deploy.yml`. Watch it under the repo's **Actions** tab.

One-time setup (already done for this repo): **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Still to fill in (resume, a Duck Days screenshot, a few years): see [CHECKLIST.md](CHECKLIST.md).

## Where things live

| Path | What |
| --- | --- |
| `src/content/site.ts` | All copy and links. Anything in `[BRACKETS]` is a placeholder. |
| `src/sections/` | One file per page section |
| `404.html`, `src/not-found.tsx` | The "Page not found." page GitHub Pages serves for missing URLs |
| `src/assets/work/` | Project screenshots: `<name>-1600.webp` and `<name>-800.webp`, 16:10 |
| `public/resume.pdf` | Your resume. Resume links only appear once this file exists. |
| `src/styles/tokens.css` | Colors, type scale, easing |
| `src/lib/motion.ts` | Lenis + GSAP wiring, reduced-motion check |
| `src/components/Ambient.tsx`, `src/lib/fireflies.ts` | The light, grain and fireflies behind the page |
| `src/components/Signature.tsx` | The signature that writes itself (hero and footer) |
| `public/` | Files served as-is (`favicon.svg`, `fonts/`, and later `resume.pdf`, `og.png`) |

## Font licenses

- General Sans: ITF Free Font License v2.0 (ships inside the Fontshare download)
- Caveat: SIL Open Font License 1.1, see `public/fonts/Caveat-OFL.txt`
- Mrs Saint Delafield (the signature, as paths, not a font file): SIL Open Font License 1.1
