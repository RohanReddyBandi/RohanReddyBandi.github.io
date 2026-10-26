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

The first `npm run dev` (or `npm run build`) downloads two fonts, Clash Display and General Sans, from [Fontshare](https://www.fontshare.com) into `public/fonts/`. Their license allows self-hosting them on this site but not redistributing them through a public repo, so they're git-ignored and fetched instead. JetBrains Mono is OFL and is committed.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm run lint` | Lints with oxlint |
| `npm run fonts` | Re-fetches the Fontshare fonts (skips files already there) |

## Deploy

Every push to `main` builds the site and publishes `dist/` to GitHub Pages through `.github/workflows/deploy.yml`. Watch it under the repo's **Actions** tab.

One-time setup (already done for this repo): **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Where things live

| Path | What |
| --- | --- |
| `src/content/site.ts` | All copy and links. Anything in `[BRACKETS]` is a placeholder. |
| `src/assets/signature.svg` | The signature drawn in About. A stroked SVG draws itself on scroll; a filled outline wipes in. |
| `src/sections/` | One file per page section |
| `src/styles/tokens.css` | Colors, type scale, easing |
| `src/lib/motion.ts` | Lenis + GSAP wiring, reduced-motion check |
| `public/` | Files served as-is (`favicon.svg`, `fonts/`, and later `resume.pdf`, `og.png`) |

## Font licenses

- Clash Display, General Sans: ITF Free Font License v2.0 (ships inside each Fontshare download)
- JetBrains Mono: SIL Open Font License 1.1, see `public/fonts/JetBrainsMono-OFL.txt`
