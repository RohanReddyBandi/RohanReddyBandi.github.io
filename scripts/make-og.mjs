// Renders the link-preview image (public/og.png, 1200×630) like the hero:
// the name in solid dark type on green under a field of wavy lines, plus the
// PNG favicons, with resvg and the real fonts.
// Run with `npm run og`, then commit the PNGs. Needs curl and unzip.
import { Resvg } from '@resvg/resvg-js'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const W = 1200
const H = 630

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

// The line field, frozen at one moment (same waves as src/hero/LineField.ts)
const SPACING = 9
const STEP = 14
const offset = (x, y) =>
  Math.sin(x * 0.0085 + y * 0.0042) * 46 + Math.sin(x * 0.0031 - y * 0.0067) * 70 * Math.sin(y * 0.0021)

// "ROHAN REDDY" is ~7.03em wide in Clash Display at -0.035em tracking (same
// as the hero), so it spans the width at size = width / 7.1
const margin = 50
const size = (W - margin * 2) / 7.1
const baseline = H - 96
// the lines fade out just above the name's cap height
const fieldEnd = Math.round(baseline - size * 0.84 - size * 0.72 - 24)
const lines = []
for (let x = -SPACING * 8; x < W + SPACING * 8; x += SPACING) {
  const pts = []
  for (let y = 0; y < fieldEnd + STEP; y += STEP) {
    const yy = Math.min(y, fieldEnd)
    pts.push(`${(x + offset(x, yy)).toFixed(1)},${yy}`)
  }
  lines.push(`M${pts.join('L')}`)
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="${fieldEnd}" gradientUnits="userSpaceOnUse">
      <stop offset="${((fieldEnd - 140) / fieldEnd).toFixed(3)}" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="fade-mask"><rect width="${W}" height="${fieldEnd}" fill="url(#fade)"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="#2bef6a"/>
  <path d="${lines.join('')}" fill="none" stroke="rgba(2,23,10,0.85)" stroke-width="1" mask="url(#fade-mask)"/>
  <text x="50" y="56" font-family="Clash Display" font-weight="600" font-size="24" fill="#02170a">RRB</text>
  <text x="${W - 50}" y="55" text-anchor="end" font-family="JetBrains Mono" font-weight="500" font-size="15" letter-spacing="2" fill="#02170a">ROHANREDDYBANDI.GITHUB.IO</text>
  <g font-family="Clash Display" font-weight="600" font-size="${size}" letter-spacing="${-0.035 * size}" fill="#02170a">
    <text x="${margin - 4}" y="${baseline - size * 0.84}">ROHAN REDDY</text>
    <text x="${margin - 4}" y="${baseline}">BANDI</text>
  </g>
  <g font-family="General Sans" font-weight="500" font-size="24" fill="rgba(2,23,10,0.78)">
    <text x="${W / 2 + 20}" y="${baseline - 34}">CS @ Purdue.</text>
    <text x="${W / 2 + 20}" y="${baseline - 4}">Building things people actually use.</text>
  </g>
</svg>`

writeFileSync(root('public/og.png'), render(og, W).asPng())
const favicon = readFileSync(root('public/favicon.svg'), 'utf8')
writeFileSync(root('public/favicon-32.png'), render(favicon, 32).asPng())
writeFileSync(root('public/apple-touch-icon.png'), render(favicon, 180).asPng())
console.log('og: wrote public/og.png, public/favicon-32.png, public/apple-touch-icon.png')
