// Renders the link-preview image (public/og.png, 1200×630) in the hero's
// glyph-field style, plus the PNG favicons, with resvg and the real fonts.
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
const SAMPLES = 4

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
const esc = (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c

// 1. The name as a mask, at SAMPLES pixels per cell. "ROHAN REDDY" is
//    ~7.03em wide in Clash Display at -0.035em tracking (same as the hero).
const lines = ['ROHAN REDDY', 'BANDI']
const margin = 5 // cells
const size = ((COLS - margin * 2) * CELL) / 7.1
const top = 150
const mask = render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <g font-family="Clash Display" font-weight="600" font-size="${size}" letter-spacing="${-0.035 * size}" fill="#000">
      ${lines.map((l, k) => `<text x="${margin * CELL}" y="${top + size * (0.86 * k + 0.74)}">${l}</text>`).join('')}
    </g>
  </svg>`,
  COLS * SAMPLES,
)
const px = mask.pixels
const coverAt = (x, y) => {
  let c = 0
  for (let sy = 0; sy < SAMPLES; sy++)
    for (let sx = 0; sx < SAMPLES; sx++) c += px[((y * SAMPLES + sy) * mask.width + x * SAMPLES + sx) * 4 + 3]
  return c / (255 * SAMPLES * SAMPLES)
}

// 2. The field: faint 0s and 1s, letters as inverse-video cells
const cells = []
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const cover = coverAt(x, y)
    const cx = x * CELL + CELL / 2
    const cy = y * CELL + CELL / 2 + 3.4
    if (cover > 0.5 || cover > 0.14) {
      const ink = cover > 0.5
      cells.push(
        `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${ink ? '#edede8' : 'rgba(237,237,232,0.42)'}"/>` +
          `<text x="${cx}" y="${cy}" fill="rgba(11,11,12,${ink ? 0.72 : 0.55})">${esc(pick(ink ? '#%&@$08' : '+=:-'))}</text>`,
      )
    } else if (rand() < 0.55) {
      cells.push(`<text x="${cx}" y="${cy}" fill="rgba(237,237,232,0.13)">${pick('01')}</text>`)
    }
  }
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0b0b0c"/>
  <g font-family="JetBrains Mono" font-weight="500" font-size="${CELL * 0.86}" text-anchor="middle">${cells.join('')}</g>
  <rect x="40" y="30" width="72" height="34" fill="#0b0b0c"/>
  <text x="50" y="56" font-family="Clash Display" font-weight="600" font-size="24" fill="#edede8">RRB</text>
  <rect x="${W - 372}" y="34" width="332" height="30" fill="#0b0b0c"/>
  <text x="${W - 50}" y="55" text-anchor="end" font-family="JetBrains Mono" font-weight="500" font-size="15" letter-spacing="2" fill="#8a8a85">ROHANREDDYBANDI.GITHUB.IO</text>
  <rect x="40" y="${H - 104}" width="520" height="74" fill="#0b0b0c"/>
  <g font-family="General Sans" font-weight="500" font-size="26" fill="#8a8a85">
    <text x="50" y="${H - 72}">CS @ Purdue.</text>
    <text x="50" y="${H - 40}">Building things people actually use.</text>
  </g>
  <rect x="${W - 50 - 12}" y="${H - 64}" width="12" height="12" fill="#c8ff3d"/>
</svg>`

writeFileSync(root('public/og.png'), render(og, W).asPng())
const favicon = readFileSync(root('public/favicon.svg'), 'utf8')
writeFileSync(root('public/favicon-32.png'), render(favicon, 32).asPng())
writeFileSync(root('public/apple-touch-icon.png'), render(favicon, 180).asPng())
console.log('og: wrote public/og.png, public/favicon-32.png, public/apple-touch-icon.png')
