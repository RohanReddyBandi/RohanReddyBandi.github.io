// Renders the link-preview image (public/og.png, 1200×630) and the PNG
// favicons from SVG, using the same seeded market as the hero and the real
// fonts. Run with `npm run og` (Node 22.18+ for the .ts import), then commit
// the PNGs. Needs curl and unzip, same as scripts/fetch-fonts.sh.
import { Resvg } from '@resvg/resvg-js'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { aggregate, generateSeries } from '../src/lib/market.ts'

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const W = 1200
const H = 630
const C = { bg: '#0b0b0c', fg: '#edede8', muted: '#8a8a85', line: 'rgba(237,237,232,0.07)', accent: '#c8ff3d' }

// resvg needs TTFs; the site's woff2 files won't do. Fetch once into a cache.
const cache = root('node_modules/.cache/og-fonts')
function ttf(slug, file) {
  const out = `${cache}/${file}`
  if (!existsSync(out)) {
    mkdirSync(cache, { recursive: true })
    const zip = `${cache}/${slug}.zip`
    execFileSync('curl', ['-fsSL', `https://api.fontshare.com/v2/fonts/download/${slug}`, '-o', zip])
    execFileSync('unzip', ['-q', '-o', '-j', zip, `*/Fonts/WEB/fonts/${file}`, '-d', cache])
  }
  return out
}
const fonts = [ttf('clash-display', 'ClashDisplay-Semibold.ttf'), ttf('general-sans', 'GeneralSans-Medium.ttf')]

function chart() {
  const candles = aggregate(generateSeries(), 4)
  const left = 0
  const right = W - 150
  const top = 92
  const bottom = 330
  const pitch = (right - left) / candles.length
  const min = Math.min(...candles.map((c) => c.l))
  const max = Math.max(...candles.map((c) => c.h))
  const y = (p) => bottom - ((p - min) / (max - min)) * (bottom - top)
  const body = Math.max(2, pitch * 0.58)
  const marks = candles.map((c, i) => {
    const x = (i + 0.5) * pitch
    const t = Math.min(y(c.o), y(c.c))
    const h = Math.max(1, Math.abs(y(c.c) - y(c.o)))
    const wick = `<line x1="${x}" x2="${x}" y1="${y(c.h)}" y2="${y(c.l)}"/>`
    const box =
      c.c >= c.o
        ? `<rect x="${x - body / 2}" y="${t}" width="${body}" height="${h}" fill="${C.accent}"/>`
        : `<rect x="${x - body / 2 + 0.5}" y="${t + 0.5}" width="${body - 1}" height="${Math.max(1, h - 1)}" fill="${C.bg}"/>`
    return wick + box
  })
  const grid = [0, 1, 2, 3, 4]
    .map((i) => top + ((bottom - top) * i) / 4)
    .map((gy) => `<line x1="0" x2="${right}" y1="${gy}" y2="${gy}" stroke="${C.line}"/>`)
  const last = candles[candles.length - 1]
  const ly = y(last.c)
  const tag = last.c.toFixed(2)
  return `
    ${grid.join('')}
    <g stroke="${C.accent}" stroke-width="1.2" opacity="0.42" filter="url(#glow)">${marks.join('')}</g>
    <line x1="0" x2="${right}" y1="${ly}" y2="${ly}" stroke="${C.accent}" stroke-opacity="0.4" stroke-dasharray="2 5"/>
    <rect x="${W - 64 - 78}" y="${ly - 13}" width="78" height="26" fill="${C.accent}"/>
    <text x="${W - 64 - 39}" y="${ly + 6}" text-anchor="middle" font-family="General Sans" font-weight="500" font-size="16" fill="${C.bg}">${tag}</text>`
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="glow" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${chart()}
  <text x="64" y="58" font-family="Clash Display" font-weight="600" font-size="24" fill="${C.fg}">RRB</text>
  <text x="${W - 64}" y="56" text-anchor="end" font-family="General Sans" font-weight="500" font-size="15" letter-spacing="3" fill="${C.muted}">ROHANREDDYBANDI.GITHUB.IO</text>
  <g font-family="Clash Display" font-weight="600" font-size="150" letter-spacing="-5.25" fill="${C.fg}">
    <text x="58" y="452">ROHAN REDDY</text>
    <text x="58" y="578">BANDI</text>
  </g>
  <g font-family="General Sans" font-weight="500" font-size="26" fill="${C.muted}">
    <text x="${W / 2 + 40}" y="540">CS @ Purdue.</text>
    <text x="${W / 2 + 40}" y="574">Building things people actually use.</text>
  </g>
</svg>`

const render = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: fonts, loadSystemFonts: false } })
    .render()
    .asPng()

writeFileSync(root('public/og.png'), render(og, W))
const favicon = readFileSync(root('public/favicon.svg'), 'utf8')
writeFileSync(root('public/favicon-32.png'), render(favicon, 32))
writeFileSync(root('public/apple-touch-icon.png'), render(favicon, 180))
console.log('og: wrote public/og.png, public/favicon-32.png, public/apple-touch-icon.png')
