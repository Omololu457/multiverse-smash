// Renders recolored sample frames with the REAL engine (albedoThemeRecolor.js) for contact sheets / visual checks.
// USAGE: node tools/albedo/render_frames.mjs <outDir> [form ...]
// For every form: the first frame of its idle strip (+ one attack strip) under the default (__albedo, unchanged) and
// all 20 themes. Writes <outDir>/<form>/<sample>__<themeId|default>.png and <outDir>/index.json. Deterministic.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePNG, encodePNG } from './png.mjs'
import { ALBEDO_THEMES } from '../../albedoThemes.js'
import { recolorAlbedoRGBA } from '../../albedoThemeRecolor.js'
import { ALBEDO_THEME_MANIFEST } from '../../albedoThemeManifest.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const out = process.argv[2] || '/tmp/albedo_frames'
const only = process.argv.slice(3)
const byForm = {}
for (const [s, f] of Object.entries(ALBEDO_THEME_MANIFEST.strips)) (byForm[f] ||= []).push(s)

// first frame = columns up to the first fully transparent column run after content
function firstFrame(img) {
  const { width: w, height: h, data } = img
  const colOpaque = x => { for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3]) return true; return false }
  let x = 0; while (x < w && !colOpaque(x)) x++
  const x0 = x; while (x < w && colOpaque(x)) x++
  const x1 = Math.min(w, x + 1)
  const fw = Math.max(1, x1 - x0), d = new Uint8ClampedArray(fw * h * 4)
  for (let y = 0; y < h; y++) d.set(data.subarray((y * w + x0) * 4, (y * w + x1) * 4), y * fw * 4)
  return { width: fw, height: h, data: d }
}
function pick(list, re) { return list.find(s => re.test(s)) }
const index = {}
for (const [form, list] of Object.entries(byForm)) {
  if (only.length && !only.includes(form)) continue
  const samples = [pick(list, /_idle_uniform__/) || list[0], pick(list, /_(heavy|light|attack|punch|ult)[a-z0-9_]*_uniform__/) || list[Math.floor(list.length / 2)]]
  index[form] = []
  fs.mkdirSync(path.join(out, form), { recursive: true })
  for (const s of [...new Set(samples)]) {
    const src = decodePNG(path.join(ROOT, s)), tag = path.basename(s, '.png')
    const ff = firstFrame(src)
    const write = (name, img) => fs.writeFileSync(path.join(out, form, `${tag}__${name}.png`), encodePNG(img))
    write('default', ff)
    for (const t of ALBEDO_THEMES) {
      const full = { width: src.width, height: src.height, data: new Uint8ClampedArray(src.data) }
      recolorAlbedoRGBA(full.data, full.width, full.height, form, t)     // recolor the WHOLE strip (as the game does) …
      write(t.id, firstFrame(full))                                        // … then crop, so rim / stars match in-game
    }
    index[form].push(tag)
  }
}
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 1))
console.log('forms', Object.keys(index).length)
