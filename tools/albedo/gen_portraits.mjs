// Generates the 40 Albedo theme portraits (assets/sprites/albedo/themes/portraits/<skinId>.png) from Albedo's OWN
// portraits (ben10_portrait__albedo.png = older, ben10_portrait__classic__albedo.png = kid) with the runtime engine.
// Deterministic.   USAGE: node tools/albedo/gen_portraits.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePNG, encodePNG } from './png.mjs'
import { ALBEDO_THEMES, albedoThemeSkinId } from '../../albedoThemes.js'
import { recolorAlbedoRGBA } from '../../albedoThemeRecolor.js'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = { older: 'ben10_portrait__albedo.png', kid: 'ben10_portrait__classic__albedo.png' }
const OUT = path.join(ROOT, 'assets/sprites/albedo/themes/portraits')
fs.mkdirSync(OUT, { recursive: true })
let n = 0
// per-rule reference brightness for each portrait (90th percentile of matched values), measured here
import { classifyAlbedoPixel } from '../../albedoThemeRecolor.js'
import { ALBEDO_REGIONS } from '../../albedoThemeRegions.js'
const VREF = {}
for (const [app, src] of Object.entries(SRC)) {
  const { width: w, height: h, data } = decodePNG(path.join(ROOT, src)), R = ALBEDO_REGIONS['portrait_' + app]
  const hist = R.rules.map(() => new Float64Array(256))
  for (let p = 0; p < w * h; p++) { const i = p * 4; if (!data[i + 3]) continue
    const k = classifyAlbedoPixel('portrait_' + app, data[i], data[i + 1], data[i + 2], Math.floor(p / w) / h)
    if (k >= 0) hist[k][Math.max(data[i], data[i + 1], data[i + 2])]++ }
  VREF[app] = hist.map(hh => { const tot = hh.reduce((a, b) => a + b, 0); let acc = 0; for (let v = 0; v < 256; v++) { acc += hh[v]; if (tot && acc >= tot * 0.9) return v / 255 } return 0.8 })
}
for (const [app, src] of Object.entries(SRC)) {
  const base = decodePNG(path.join(ROOT, src))
  for (const t of ALBEDO_THEMES) {
    const img = { width: base.width, height: base.height, data: new Uint8ClampedArray(base.data) }
    const { changed } = recolorAlbedoRGBA(img.data, img.width, img.height, 'portrait_' + app, t, { vref: { ['portrait_' + app]: VREF[app] } })
    fs.writeFileSync(path.join(OUT, `${albedoThemeSkinId(app, t.id)}.png`), encodePNG(img)); n++
    if (!changed) console.warn('WARN no pixels themed', app, t.id)
  }
}
console.log('portraits', n)
