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

// FORM APPLICATION (every round start / swap): EVERY piece of Ranger art follows the skin —
//   f._skinAnim / _baseSkinAnim   the active Ranger's own strips (moves, poses, supers)
//   f._nsAssetDir                 the ninja.js projectile / FX sprites of the active Ranger
//   f._dtSkinForms                all four Rangers' skinned strips (the Z-Rex line-up, partner art, the swap smoke)
//   f._dtSkinArt                  the skin folder: HUD swap-strip portraits, raptor riders, MISSION ACCOMPLISHED, BOSS KILLED
// (render-only fields; the start-form skins clear them and draw the default art)
export function dinoApplySkin(f, form) {
  const tag = dinoSkinTag(f?.skinId)
  if (!tag) { if (f && f._dtSkin) { f._dtSkin = null; f._skinAnim = null; f._baseSkinAnim = null; f._nsAssetDir = null; f._dtSkinForms = null; f._dtSkinArt = null } return }   // applyForm has already restored animationData / portrait
  const A = dinoFormAnim(tag, form)
  f._skinAnim = A; f._baseSkinAnim = A; f._dtSkin = tag
  f._nsAssetDir = dinoSkinDir(tag, form)
  f._dtSkinForms = Object.fromEntries(['dt_red', 'dt_blue', 'dt_yellow', 'dt_white'].map(k => [k, dinoFormAnim(tag, k)]))
  f._dtSkinArt = `./assets/dinothunder/skins/${tag}`
  // the engine's own fallbacks (an action missing from _skinAnim → animationData.idle; portrait / HUD icon readers) use the
  // skin too: the same table with the skin's sheet paths (identical keys, frame counts and timing — cosmetic only)
  f.animationData = A
  f.portrait = `${f._dtSkinArt}/${form}/portrait_large.png`; f.hudIcon = `${f._dtSkinArt}/${form}/portrait_small.png`
}
registerDinoSkinHook(dinoApplySkin)
