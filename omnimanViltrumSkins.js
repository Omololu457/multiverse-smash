// Omni-Man — Viltrumite (omniman_viltrum) — default + 20 premade skins. COSMETIC ONLY (render-only).
// Sheets are PRECOMPUTED by tools/omnimanskins/build.py → assets/omniman_viltrum/skins/<tag>/ (same frames, size, alpha,
// anchors → identical timing / hitboxes / damage / controls). Nothing is recoloured at runtime. Each skin also ships a
// recoloured select portrait + the three small head icons, and a small palette for the procedural effects (speed
// streaks, boom ring, dust, re-entry glow, cape, orbit planet) read by omnimanViltrumFx.js.
// GLITTER skins carry 3 pre-baked glint phases (<tag>/, <tag>/p1/, <tag>/p2/); the phase is picked from the SIMULATION
// clock (never wall-clock), so LAN, replay and companion show the same glint.
// Ids are prefixed "omv_", never END in "AlienX" (game.js's generic starfield matches that suffix) and never contain
// "cyborg" (Superman's eye overlay matches it).
import { OMV_KEY, omniman_viltrum } from './omnimanViltrumData.js'
import { preloadSheets } from './sprite.js'
import { OMV_SKIN_TABLE } from './omnimanViltrumSkinTable.js'
import { OMNIMAN_VILTRUM_ICONS } from './omnimanViltrumSprites.js'

export { OMV_SKIN_TABLE }
const PREFIX = 'omv_'
const BY_TAG = Object.fromEntries(OMV_SKIN_TABLE.map(r => [r.tag, r]))
export const omvSkinTag = id => (typeof id === 'string' && id.startsWith(PREFIX) && BY_TAG[id.slice(PREFIX.length)]) ? id.slice(PREFIX.length) : null

export const OMV_DEFAULT_PAL = { streak: 'rgba(255,240,240,0.9)', boom: '#ffffff', dust: 'rgba(150,130,110,0.55)', glow: '#ff6a2a', cape: '#d4141c', planet: '#2f6fb8', planetEdge: '#1b4a86' }
export const OMV_SKIN_PALS = Object.fromEntries(OMV_SKIN_TABLE.map(r => [PREFIX + r.tag, { ...OMV_DEFAULT_PAL, ...(r.pal || {}) }]))
export const OMV_SKIN_FX = {}   // the fx sheets (afterimage / boom) stay the sheet's own for every skin; the procedural strokes take the palette

const ROOT = './assets/omniman_viltrum/'
const _anim = new Map()
export function omvSkinAnim(tag, phase = 0) {
  const k = tag + '|' + phase
  if (_anim.has(k)) return _anim.get(k)
  const dir = `${ROOT}skins/${tag}/${phase ? 'p' + phase + '/' : ''}`
  const out = Object.fromEntries(Object.entries(omniman_viltrum.animationData).map(([key, d]) =>
    [key, d?.sheet && d.sheet.startsWith(ROOT) && !d.sheet.includes('/fx/') && !d.sheet.includes('/skins/') ? { ...d, sheet: d.sheet.replace(ROOT, dir) } : d]))
  _anim.set(k, out)
  return out
}

const common = { unlockLevel: 0, cosmeticOnly: true, spriteScale: omniman_viltrum.spriteScale }
export const OMV_SKINS = [
  // the default carries his OMV_SCALE too (applySkin copies a skin's spriteScale onto the fighter; getSkins' generic
  // fallback would have drawn him at ×1)
  { ...common, id: 'default', name: 'Default (Omni-Man)', classification: 'Default', portrait: omniman_viltrum.portrait, animationData: null },
  ...OMV_SKIN_TABLE.map(r => ({ ...common, id: PREFIX + r.tag, name: r.name, classification: r.classification, glitter: !!r.glitter,
    inspired: !!r.crossover, crossover: r.crossover || null,
    source: { version: r.crossover ? `${r.crossover} — colour scheme on Omni-Man's own pixels (inspired, not official art)` : 'Original cosmetic design', base: 'Omni-Man sheet, recoloured by tools/omnimanskins/build.py' },
    portrait: `${ROOT}skins/${r.tag}/portrait.png`, icons: [0, 1, 2].map(i => `${ROOT}skins/${r.tag}/icon_${i}.png`), animationData: omvSkinAnim(r.tag) })),
]

const skinOf = f => (f?.rosterKey === OMV_KEY ? (f.skinId || f.skin?.id || 'default') : null)
export function omvSkinPal(f) { const k = skinOf(f); return (k && OMV_SKIN_PALS[k]) || OMV_DEFAULT_PAL }
export function omvSkinFx(f, key) { const k = skinOf(f); return (k && OMV_SKIN_FX[k]?.[key]) || null }
// the small head icon (HUD / bubbles) for the equipped skin
export function omvSkinIcon(f, i = 0) {
  const tag = omvSkinTag(skinOf(f))
  return tag ? `${ROOT}skins/${tag}/icon_${i}.png` : OMNIMAN_VILTRUM_ICONS[i]
}

// GLITTER (render-only): glint phase from the sim clock (8 sim frames per phase); swaps which pre-baked sheet the next
// body draw uses (same frame map → nothing about timing changes). Every phase is decoded first so a swap never blanks.
const _ready = new Set(), _warm = new Set()
export function omvSkinPhaseTick(f, simClock) {
  const tag = omvSkinTag(skinOf(f))
  if (!tag || !BY_TAG[tag].glitter) return
  if (!_warm.has(tag)) {
    _warm.add(tag)
    const paths = []; for (let q = 0; q < 3; q++) for (const d of Object.values(omvSkinAnim(tag, q))) if (d?.sheet) paths.push(d.sheet)
    preloadSheets(paths, r => { if (r?.ok) _ready.add(r.path) })
  }
  const p = Math.floor((simClock || 0) / 8) % 3
  if (f._omvGlintPhase === p) return
  const A = omvSkinAnim(tag, p), cur = A[f._lastSpriteAction || 'idle'] || A.idle
  if (p && cur?.sheet && !_ready.has(cur.sheet)) return
  f._omvGlintPhase = p; f._skinAnim = A
}
