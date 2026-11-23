// invincibleSkins.js — Invincible (Mark Grayson) (invincible): default + premade skins. COSMETIC ONLY.
// Sheets are PRECOMPUTED by tools/invincibleskins/build.py → assets/invincible/skins/<tag>/ (same frames, size, alpha,
// anchors → identical timing / hitboxes). Nothing is recoloured at runtime. Each skin also ships premade variants of the
// sheet's effect strips (fx/<key>.png) and a small palette for the procedural strokes (Resolve aura, Terminal Velocity
// marker / trail). GLITTER skins carry 3 pre-baked glint phases (<tag>/, <tag>/p1/, <tag>/p2/); the phase is picked from
// the SIMULATION clock (never wall-clock), so LAN, replay and companion show the same glint.
// Ids are prefixed "inv_", never END in "AlienX" (game.js's generic starfield matches that suffix) and never contain
// "cyborg" (Superman's eye overlay matches it).
import { invincible } from './invincibleData.js'
import { preloadSheets } from './sprite.js'
import { INV_SKIN_TABLE } from './invincibleSkinTable.js'

export { INV_SKIN_TABLE }
const PREFIX = 'inv_'
const BY_TAG = Object.fromEntries(INV_SKIN_TABLE.map(r => [r.tag, r]))
export const invSkinTag = id => (typeof id === 'string' && id.startsWith(PREFIX) && BY_TAG[id.slice(PREFIX.length)]) ? id.slice(PREFIX.length) : null

// default palette (the sheet's own colours: yellow suit, blue trunks / gloves, the white streaks)
export const INV_DEFAULT_PAL = { suit: '#f4c430', trail: '#7fb6ff', marker: '#ffd84a', resolve: '#ffd84a' }

const _anim = new Map()
export function invSkinAnim(tag, phase = 0) {
  const k = tag + '|' + phase
  if (_anim.has(k)) return _anim.get(k)
  const dir = `./assets/invincible/skins/${tag}/${phase ? 'p' + phase + '/' : ''}`
  const out = Object.fromEntries(Object.entries(invincible.animationData).map(([key, d]) =>
    [key, d?.sheet && d.sheet.startsWith('./assets/invincible/') && !d.sheet.includes('/fx/') ? { ...d, sheet: d.sheet.replace('./assets/invincible/', dir) } : d]))
  _anim.set(k, out)
  return out
}

const common = { unlockLevel: 0, cosmeticOnly: true, spriteScale: invincible.spriteScale }
export const INV_SKINS = [
  { ...common, id: 'default', name: 'Default (Invincible)', classification: 'Default', portrait: invincible.portrait, animationData: null },
  ...INV_SKIN_TABLE.map(r => ({ ...common, id: PREFIX + r.tag, name: r.name, classification: r.classification, glitter: !!r.glitter,
    inspired: !!r.crossover, crossover: r.crossover || null,
    source: { version: r.crossover ? `${r.crossover} — colour scheme on Mark's own pixels (inspired, not official art)` : 'Original cosmetic design', base: 'JustOruma Invincible sheet, recoloured by tools/invincibleskins/build.py' },
    portrait: `./assets/invincible/skins/${r.tag}/portrait.png`, animationData: invSkinAnim(r.tag) })),
]

export function invSkinFx(f, key) {
  const tag = invSkinTag(f?.skinId)
  return tag && BY_TAG[tag].fx !== false ? `./assets/invincible/skins/${tag}/fx/${key}.png` : null
}
export function invSkinPal(f) {
  const tag = invSkinTag(f?.skinId)
  return tag && BY_TAG[tag].pal ? { ...INV_DEFAULT_PAL, ...BY_TAG[tag].pal } : INV_DEFAULT_PAL
}

// GLITTER (render-only): glint phase from the sim clock (8 sim frames per phase); swaps which pre-baked sheet the next
// body draw uses. Every phase is decoded first so a swap never blanks.
const _ready = new Set(), _warm = new Set()
export function invSkinPhaseTick(f, simClock) {
  const tag = invSkinTag(f?.skinId)
  if (!tag || !BY_TAG[tag].glitter) return
  if (!_warm.has(tag)) {
    _warm.add(tag)
    const paths = []; for (let q = 0; q < 3; q++) for (const d of Object.values(invSkinAnim(tag, q))) if (d?.sheet) paths.push(d.sheet)
    preloadSheets(paths, r => { if (r?.ok) _ready.add(r.path) })
  }
  const p = Math.floor((simClock || 0) / 8) % 3
  if (f._invGlintPhase === p) return
  const A = invSkinAnim(tag, p), cur = A[f._lastSpriteAction || 'idle'] || A.idle
  if (p && cur?.sheet && !_ready.has(cur.sheet)) return
  f._invGlintPhase = p; f._skinAnim = A
}
