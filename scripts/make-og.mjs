// Renders the link-preview image (public/og.png, 1200×630) like the hero:
// the name in solid type over a faint field of 0s and 1s, plus the PNG
// favicons, with resvg and the real fonts.
// Run with `npm run og`, then commit the PNGs. Needs curl and unzip.
import { Resvg } from '@resvg/resvg-js'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const W = 1200
const H = 630
const CELL = 10
const COLS = W / CELL
const ROWS = H / CELL

// resvg needs TTFs; the site's woff2 files won't do. Fetch once into a cache.
const cache = root('node_modules/.cache/og-fonts')
function ttf(url, file) {
  const out = `${cache}/${file.split('/').pop()}`
  if (!existsSync(out)) {
    mkdirSync(cache, { recursive: true })
    const zip = `${cache}/${encodeURIComponent(url).slice(-40)}.zip`
    execFileSync('curl', ['-fsSL', url, '-o', zip])
    execFileSync('unzip', ['-q', '-o', '-j', zip, file, '-d', cache])
  }
  return out
}
const fonts = [
  ttf('https://api.fontshare.com/v2/fonts/download/clash-display', '*/Fonts/WEB/fonts/ClashDisplay-Semibold.ttf'),
  ttf('https://api.fontshare.com/v2/fonts/download/general-sans', '*/Fonts/WEB/fonts/GeneralSans-Medium.ttf'),
  ttf('https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip', 'fonts/ttf/JetBrainsMono-Medium.ttf'),
]
const render = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: fonts, loadSystemFonts: false } }).render()

// Same seeded noise every run
let seed = 0x5eed2026
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (chars) => chars[(rand() * chars.length) | 0]

// The faint field: 0s and 1s, same seeded noise every run
const cells = []
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (rand() < 0.55) cells.push(`<text x="${x * CELL + CELL / 2}" y="${y * CELL + CELL / 2 + 3.4}">${pick('01')}</text>`)
  }
}

// "ROHAN REDDY" is ~7.03em wide in Clash Display at -0.035em tracking (same
// as the hero), so it spans the width at size = width / 7.1
const margin = 50
const size = (W - margin * 2) / 7.1
const baseline = H - 96

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0b0b0c"/>
  <g font-family="JetBrains Mono" font-weight="500" font-size="${CELL * 0.86}" text-anchor="middle" fill="rgba(237,237,232,0.13)">${cells.join('')}</g>
  <text x="50" y="56" font-family="Clash Display" font-weight="600" font-size="24" fill="#edede8">RRB</text>
  <text x="${W - 50}" y="55" text-anchor="end" font-family="JetBrains Mono" font-weight="500" font-size="15" letter-spacing="2" fill="#8a8a85">ROHANREDDYBANDI.GITHUB.IO</text>
  <g font-family="Clash Display" font-weight="600" font-size="${size}" letter-spacing="${-0.035 * size}" fill="#edede8">
    <text x="${margin - 4}" y="${baseline - size * 0.84}">ROHAN REDDY</text>
    <text x="${margin - 4}" y="${baseline}">BANDI</text>
  </g>
  <g font-family="General Sans" font-weight="500" font-size="24" fill="#8a8a85">
    <text x="${W / 2 + 20}" y="${baseline - 34}">CS @ Purdue.</text>
    <text x="${W / 2 + 20}" y="${baseline - 4}">Building things people actually use.</text>
  </g>
</svg>`

writeFileSync(root('public/og.png'), render(og, W).asPng())
const favicon = readFileSync(root('public/favicon.svg'), 'utf8')
writeFileSync(root('public/favicon-32.png'), render(favicon, 32).asPng())
writeFileSync(root('public/apple-touch-icon.png'), render(favicon, 180).asPng())
console.log('og: wrote public/og.png, public/favicon-32.png, public/apple-touch-icon.png')
