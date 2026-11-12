// Renders the link-preview image (public/og.png, 1200×630) like the hero:
// the signature on the warm dark background with the light in the corner,
// plus the PNG favicons, with resvg and the real fonts.
// Run with `npm run og`, then commit the PNGs. Needs curl and unzip.
import { Resvg } from '@resvg/resvg-js'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { signature } from '../src/content/signature.ts'

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
  ttf('https://api.fontshare.com/v2/fonts/download/general-sans', '*/Fonts/WEB/fonts/GeneralSans-Regular.ttf'),
  ttf('https://api.fontshare.com/v2/fonts/download/general-sans', '*/Fonts/WEB/fonts/GeneralSans-Medium.ttf'),
]
const render = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: fonts, loadSystemFonts: false } }).render()

// The signature spans a bit over half the width, left-aligned like the hero
const margin = 96
const sigW = 640
const scale = sigW / signature.width
const sigTop = 210
const tagTop = sigTop + signature.height * scale + 56
const letters = signature.letters.map((l) => `<path d="${l.d}"/>`).join('')

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="light" cx="1100" cy="-60" r="720" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f3d6a6" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#f3d6a6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fly">
      <stop offset="0" stop-color="#fffce1"/>
      <stop offset="0.15" stop-color="#f0fabe" stop-opacity="0.9"/>
      <stop offset="0.4" stop-color="#c8eb8c" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#c8eb8c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#131211"/>
  <rect width="${W}" height="${H}" fill="url(#light)"/>
  ${[[880, 150, 9], [1010, 320, 7], [760, 470, 8], [1090, 520, 10], [180, 560, 6], [960, 90, 6]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#fly)"/>`)
    .join('')}
  <text x="${margin}" y="80" font-family="General Sans" font-weight="500" font-size="22" letter-spacing="1" fill="#ece7df">RRB</text>
  <text x="${W - margin}" y="80" text-anchor="end" font-family="General Sans" font-size="20" fill="#8e887f">rohanreddybandi.github.io</text>
  <g transform="translate(${margin - 6} ${sigTop}) scale(${scale})" fill="#ece7df">${letters}</g>
  <g font-family="General Sans" font-size="28">
    <text x="${margin}" y="${tagTop}" fill="#ece7df">CS @ Purdue.</text>
    <text x="${margin}" y="${tagTop + 40}" fill="#8e887f">Building things people actually use.</text>
  </g>
</svg>`

writeFileSync(root('public/og.png'), render(og, W).asPng())
const favicon = readFileSync(root('public/favicon.svg'), 'utf8')
writeFileSync(root('public/favicon-32.png'), render(favicon, 32).asPng())
writeFileSync(root('public/apple-touch-icon.png'), render(favicon, 180).asPng())
console.log('og: wrote public/og.png, public/favicon-32.png, public/apple-touch-icon.png')
