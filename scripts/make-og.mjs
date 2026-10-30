// Renders the link-preview image (public/og.png, 1200×630) like the hero:
// the name in off-white on black with the green-lined lens over part of it,
// plus the PNG favicons, with resvg and the real fonts.
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

// "ROHAN REDDY" is ~7.03em wide in Clash Display at -0.035em tracking (same
// as the hero), so at width / 12 it spans a bit over half, like the hero
const margin = 50
const size = (W - margin * 2) / 12
const baseline = H - 96
const line1 = baseline - size * 0.84
const nameFont = `font-family="Clash Display" font-weight="600" font-size="${size}" letter-spacing="${-0.035 * size}"`
// font on each <text>, since a clip path can't hold a <g>
const nameText = `
    <text x="${margin - 4}" y="${line1}" ${nameFont}>ROHAN REDDY</text>
    <text x="${margin - 4}" y="${baseline}" ${nameFont}>BANDI</text>`

// The lens (src/hero/NameLens.ts), frozen over the end of REDDY: wavy lines,
// magnified toward its center, bright inside the letters and faint around them
const LX = margin + size * 6
const LY = line1 - size * 0.36
const R = size * 0.95
const SPACING = 4
const STEP = 8
const offset = (x, y) => {
  let d = Math.sin(x * 0.011 + y * 0.006) * 18 + Math.sin(x * 0.004 - y * 0.009) * 26 * Math.sin(y * 0.003)
  const dx = x + d - LX
  const dy = y - LY
  const s = R * 0.45
  d += dx * Math.exp(-(dx * dx + dy * dy) / (2 * s * s)) * 0.55
  return d
}
const lines = []
for (let x = Math.floor((LX - R - 48) / SPACING) * SPACING; x < LX + R + 48; x += SPACING) {
  const pts = []
  for (let y = LY - R; y < LY + R + STEP; y += STEP) pts.push(`${(x + offset(x, y)).toFixed(1)},${y.toFixed(1)}`)
  lines.push(`M${pts.join('L')}`)
}
const lens = (id, inside, outside) => `
    <radialGradient id="${id}" cx="${LX}" cy="${LY}" r="${R}" gradientUnits="userSpaceOnUse">
      <stop offset="0.55" stop-color="${inside}"/>
      <stop offset="1" stop-color="${outside}"/>
    </radialGradient>
    <mask id="${id}-mask"><rect width="${W}" height="${H}" fill="url(#${id})"/></mask>`

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${lens('lens', '#fff', '#000')}${lens('hole', '#000', '#fff')}
    <clipPath id="name-clip">${nameText}</clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="#0b0b0c"/>
  <text x="50" y="56" font-family="Clash Display" font-weight="600" font-size="24" fill="#edede8">RRB</text>
  <text x="${W - 50}" y="55" text-anchor="end" font-family="JetBrains Mono" font-weight="500" font-size="15" letter-spacing="2" fill="#8a8a85">ROHANREDDYBANDI.GITHUB.IO</text>
  <g fill="#edede8" mask="url(#hole-mask)">${nameText}
  </g>
  <g fill="none" mask="url(#lens-mask)">
    <path d="${lines.join('')}" stroke="rgba(43,239,106,0.16)" stroke-width="1"/>
    <path d="${lines.join('')}" stroke="#2bef6a" stroke-width="1.4" clip-path="url(#name-clip)"/>
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
