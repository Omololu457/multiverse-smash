// windrangersSkins.js — Ninja Storm MS_V1 Ranger Version (windrangers): the 10-skin pack.
// COSMETIC ONLY. Each skin is a precomputed recolour of BOTH forms' strips (Shane = ns_red, Dustin = ns_yellow), built by
// tools/wr_skins/build.py from tools/wr_skins/skins.json: same frame map, anchors, alpha → identical timing, hitboxes,
// collision. The skin follows the duo through every form swap (nsDuo.js applyForm → wrApplyForm). Move-linked touches
// (Alien X's stars lighting on a sword draw, the Disco boot glint, …) are render-only in windrangersSkinFx.js.
import { ns_red, ns_yellow } from './nsData.js'

export const WR_SKIN_TABLE = [
  { tag: 'alienx', name: 'Alien X — Constellation Leak', showcase: true, clone: true, fx: '#9b6bff', star: '#fff6dc', cloneStar: '#3ff5e0', nebula: '#7a3cff' },
  { tag: 'disco', name: 'Disco Ball in a Blackout', glitter: true, fx: '#ff3fa4', glints: ['#ff3fa4', '#ffd24a', '#bff4ff'] },
  { tag: 'valkyrie', name: 'Winning Valkyrie — Final Rotation', fx: '#5aa0ff', arcs: ['#e0202a', '#2a62ff', '#f2c230'] },
  { tag: 'ghostfreak', name: 'Ghostfreak — Split Seam', fx: '#9a6cff', eye: '#a35cff' },
  { tag: 'feedback', name: 'Feedback — Live Wire', clone: true, fx: '#ffd65a', spark: '#ffffff' },
  { tag: 'divergent', name: 'JJK — Divergent Impact', fx: '#3a7bff', ink: '#2f6bff' },
  { tag: 'salaryman', name: 'JJK — Salaryman Overtime', fx: '#f2d45c', line: '#ffd23a' },
  { tag: 'kintsugi', name: 'Kintsugi Aftershock', fx: '#e6b84a', gold: '#e6b84a' },
  { tag: 'pitcrew', name: 'Midnight Pit Crew', fx: '#ffb02e', amber: '#ffb000', green: '#38e05a' },
  { tag: 'woodblock', name: 'Woodblock Storm', clone: true, fx: '#22305c', ink: '#22305c', paper: '#f3e6c8', print: '#d8262a' },
]
const BY_TAG = Object.fromEntries(WR_SKIN_TABLE.map(r => [r.tag, r]))
export const WR_SKIN_PREFIX = 'wr_'
export const wrSkinTag = skinId => (typeof skinId === 'string' && skinId.startsWith(WR_SKIN_PREFIX) && BY_TAG[skinId.slice(3)]) ? skinId.slice(3) : null
export const wrSkinRow = tag => BY_TAG[tag] || null
export const wrSkinDir = (tag, form, clone = false) => `./assets/windrangers/skins/${tag}/${clone ? 'clone_' : ''}${form}`

// the form's own animationData with every ns_red / ns_yellow sheet pointed at the skin folder (cached per tag/form/role)
const FORMS = { ns_red, ns_yellow }
const _cache = new Map()
export function wrFormAnim(tag, form, clone = false) {
  const k = `${tag}|${form}|${clone ? 1 : 0}`
  if (_cache.has(k)) return _cache.get(k)
  const base = FORMS[form]?.animationData
  if (!base || !BY_TAG[tag] || (clone && !BY_TAG[tag].clone)) return null
  const dir = wrSkinDir(tag, form, clone)
  const out = {}
  for (const [key, A] of Object.entries(base)) out[key] = A && typeof A.sheet === 'string' ? { ...A, sheet: A.sheet.replace(/^\.\/assets\/ns_(red|yellow)/, dir) } : A
  _cache.set(k, out)
  return out
}

// the skins.js entries (the select-screen preview = the skin's own Red | Yellow split portrait)
export const WR_SKINS = WR_SKIN_TABLE.map(r => ({
  id: WR_SKIN_PREFIX + r.tag, name: r.name, unlockLevel: 0, cosmeticOnly: true, classification: r.showcase ? 'Showcase Skin' : (r.glitter ? 'Glitter Skin' : 'Skin'),
  portrait: `./assets/windrangers/skins/${r.tag}/portrait_large.png`, hudIcon: `./assets/windrangers/skins/${r.tag}/portrait_small.png`,
  spriteScale: ns_red.spriteScale, animationData: wrFormAnim(r.tag, 'ns_red'),
  source: { version: 'Recolour of the supplied Ninja Storm Red / Yellow Ranger sheets — Power Rangers Super Legends (DS), ripped by Grim (spritedatabase.net)' },
}))

// FORM APPLICATION (called by nsDuo.js applyForm on every round start / form swap): the active form's skin strips,
// FX / projectile folder and streak colour. Default skins (default / start_yellow) are untouched.
export function wrApplyForm(f, form) {
  const tag = wrSkinTag(f?.skinId)
  if (!tag) { if (f && f._wrSkin) { f._wrSkin = null; f._nsAssetDir = null } return }
  const A = wrFormAnim(tag, form)
  f._skinAnim = A; f._baseSkinAnim = A
  f._nsAssetDir = wrSkinDir(tag, form)
  f._nsColor = BY_TAG[tag].fx
  f._wrSkin = tag
}
// the clone / illusion strip for a skin with its own clone look (else null = the body's strips)
export function wrCloneAnim(f, key) {
  const tag = f?._wrSkin; if (!tag || !BY_TAG[tag].clone) return null
  const A = wrFormAnim(tag, f.rosterKey, true)
  return A ? (A[key] || A.guard || A.idle) : null
}
