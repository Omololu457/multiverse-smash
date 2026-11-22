// gojoShinjukuSkins.js — Satoru Gojo (Shinjuku Arc) (gojo_shinjuku): default + 20 premade skins. COSMETIC ONLY.
// Sheets are PRECOMPUTED by tools/gojoskins/build.py → assets/gojo_shinjuku/skins/<tag>/ (same frames, size, alpha,
// anchors → identical timing / hitboxes). Nothing is recoloured at runtime. Protected pixels (outlines, eyes, Blue, Red,
// Purple, dome, chant strips, sparks, baked effects) are byte-identical — the build asserts it for every pixel.
// GLITTER skins carry 3 pre-baked glint phases (<tag>/, <tag>/p1/, <tag>/p2/); gsSkinPhaseAnim picks one from the
// SIMULATION clock (never wall-clock), so LAN, replay and companion show the same glint.
// Ids are prefixed "gs_", never END in "AlienX" (game.js's generic starfield matches that suffix) and never contain
// "cyborg" (Superman's eye overlay matches it).
import { gojo_shinjuku } from './gojoShinjukuData.js'

export const GS_SKIN_TABLE = [
  { tag: 'alienx_leak', name: 'Alien X — Constellation Leak', classification: 'Alien X Collection' },
  { tag: 'alienx_binary', name: 'Alien X — Binary Star', classification: 'Alien X Collection' },
  { tag: 'alienx_horizon', name: 'Alien X — Event Horizon', classification: 'Alien X Collection' },
  { tag: 'alienx_daylight', name: 'Alien X — Daylight Galaxy', classification: 'Alien X Collection' },
  { tag: 'opal', name: 'Black Opal Headliner', classification: 'Glitter Collection', glitter: true },
  { tag: 'pinkdiamond', name: 'Pink Diamond Flashbulb', classification: 'Glitter Collection', glitter: true },
  { tag: 'sequin', name: 'Midnight Sequin', classification: 'Glitter Collection', glitter: true },
  { tag: 'meteor', name: 'Meteor Hem', classification: 'Glitter Collection', glitter: true },
  { tag: 'valkyrie', name: 'Winning Valkyrie — Victory Lap', classification: 'Crossover', crossover: 'Winning Valkyrie' },
  { tag: 'upgrade', name: 'Ben 10 Upgrade — Living Sleeve', classification: 'Crossover', crossover: 'Ben 10' },
  { tag: 'chromastone', name: 'Ben 10 Chromastone — Cathedral Glass', classification: 'Crossover', crossover: 'Ben 10' },
  { tag: 'nanami', name: 'JJK Nanami — Clocked Out', classification: 'Crossover', crossover: 'Jujutsu Kaisen' },
  { tag: 'sukuna', name: 'JJK Sukuna — Borrowed Reflection', classification: 'Crossover', crossover: 'Jujutsu Kaisen' },
  { tag: 'prison', name: 'JJK Prison Realm — Inside Looking Out', classification: 'Crossover', crossover: 'Jujutsu Kaisen' },
  { tag: 'porcelain', name: 'Porcelain Kiln', classification: 'Original' },
  { tag: 'darkroom', name: 'Darkroom Negative', classification: 'Original' },
  { tag: 'velvet', name: 'Velvet Rope', classification: 'Original' },
  { tag: 'arcade', name: 'Arcade Cabinet, 2 A.M.', classification: 'Original' },
  { tag: 'snow', name: 'First Snow at Dawn', classification: 'Original' },
  { tag: 'ink', name: 'The Strongest, in Ink', classification: 'Original' },
]
const PREFIX = 'gs_'
const BY_TAG = Object.fromEntries(GS_SKIN_TABLE.map(r => [r.tag, r]))
export const gsSkinTag = id => (typeof id === 'string' && id.startsWith(PREFIX) && BY_TAG[id.slice(PREFIX.length)]) ? id.slice(PREFIX.length) : null

const _anim = new Map()
export function gsSkinAnim(tag, phase = 0) {
  const k = tag + '|' + phase
  if (_anim.has(k)) return _anim.get(k)
  const dir = `./assets/gojo_shinjuku/skins/${tag}/${phase ? 'p' + phase + '/' : ''}`
  const out = Object.fromEntries(Object.entries(gojo_shinjuku.animationData).map(([key, d]) =>
    [key, d?.sheet && d.sheet.startsWith('./assets/gojo_shinjuku/') && !d.sheet.includes('/fx/') ? { ...d, sheet: d.sheet.replace('./assets/gojo_shinjuku/', dir) } : d]))
  _anim.set(k, out)
  return out
}

const common = { unlockLevel: 0, cosmeticOnly: true, spriteScale: gojo_shinjuku.spriteScale }
export const GS_SKINS = [
  { ...common, id: 'default', name: 'Default (Shinjuku)', classification: 'Default', portrait: gojo_shinjuku.portrait, animationData: null },
  ...GS_SKIN_TABLE.map(r => ({ ...common, id: PREFIX + r.tag, name: r.name, classification: r.classification, glitter: !!r.glitter,
    inspired: !!r.crossover, crossover: r.crossover || null,
    source: { version: r.crossover ? `${r.crossover} — colour scheme on Gojo's own pixels (inspired, not official art)` : 'Original cosmetic design', base: 'FinhJ sheet, recoloured by tools/gojoskins/build.py' },
    portrait: `./assets/gojo_shinjuku/skins/${r.tag}/portrait.png`, animationData: gsSkinAnim(r.tag) })),
]

// GLITTER (render-only): the glint phase follows the sim clock (8 sim frames per phase). Called from drawGsFx; swaps
// only which pre-baked sheet the NEXT body draw uses (same frame map, so nothing about timing changes).
export function gsSkinPhaseTick(f, simClock) {
  const tag = gsSkinTag(f?.skinId)
  if (!tag || !BY_TAG[tag].glitter) return
  const p = Math.floor((simClock || 0) / 8) % 3
  if (f._gsGlintPhase === p) return
  f._gsGlintPhase = p; f._skinAnim = gsSkinAnim(tag, p)
}
