// dinoSkins.js — Dino Thunder Rangers (dinothunder): the 16 TEAM skins. COSMETIC ONLY. Each skin is a PREMADE recolour of
// ALL FOUR forms' strips (tools/dinoskins/build.py → assets/dinothunder/skins/<tag>/<form>/), same cells / anchors / alpha
// → identical timing, hitboxes and collision. The skin follows every swap (dinothunder.js applyForm → registerDinoSkinHook).
// Nothing is recoloured at runtime; the Drago Clone keeps its own premade strips.
import { DINO_FORM_CHAR } from './dinoData.js'
import { registerDinoSkinHook } from './dinothunder.js'
import { DINO_SKIN_ROWS } from './dinoSkinRows.js'

export const DINO_SKIN_PREFIX = 'dtk_'
const BY_TAG = Object.fromEntries(DINO_SKIN_ROWS.map(r => [r.tag, r]))
export const dinoSkinTag = skinId => (typeof skinId === 'string' && skinId.startsWith(DINO_SKIN_PREFIX) && BY_TAG[skinId.slice(4)]) ? skinId.slice(4) : null
export const dinoSkinDir = (tag, form) => `./assets/dinothunder/skins/${tag}/${form}`

const _cache = new Map()
export function dinoFormAnim(tag, form) {
  const k = `${tag}|${form}`
  if (_cache.has(k)) return _cache.get(k)
  const base = DINO_FORM_CHAR[form]?.animationData
  if (!base || !BY_TAG[tag]) return null
  const dir = dinoSkinDir(tag, form), out = {}
  for (const [key, A] of Object.entries(base)) out[key] = A && typeof A.sheet === 'string' ? { ...A, sheet: A.sheet.replace(/^\.\/assets\/dt_(red|blue|yellow|white)/, dir) } : A
  _cache.set(k, out)
  return out
}

// skins.js entries: the select preview is the skin's four-Ranger team portrait; every team skin starts as Conner (Red)
export const DINO_SKINS = DINO_SKIN_ROWS.map(r => ({
  id: DINO_SKIN_PREFIX + r.tag, name: r.name, unlockLevel: 0, cosmeticOnly: true, classification: 'Team Skin', note: r.note,
  portrait: `./assets/dinothunder/skins/${r.tag}/portrait_large.png`, hudIcon: `./assets/dinothunder/skins/${r.tag}/portrait_small.png`,
  spriteScale: DINO_FORM_CHAR.dt_red.spriteScale, animationData: dinoFormAnim(r.tag, 'dt_red'),
  source: { version: 'Premade recolour of the supplied Dino Thunder sheets (falmeatwad · YONDY-HOKAGE / DK-YONDY · Raikage)' },
}))

// FORM APPLICATION (every round start / swap): the active form's skin strips; the start-form skins are untouched
export function dinoApplySkin(f, form) {
  const tag = dinoSkinTag(f?.skinId)
  if (!tag) { if (f && f._dtSkin) { f._dtSkin = null; f._skinAnim = null; f._baseSkinAnim = null } return }
  const A = dinoFormAnim(tag, form)
  f._skinAnim = A; f._baseSkinAnim = A; f._dtSkin = tag
}
registerDinoSkinHook(dinoApplySkin)
