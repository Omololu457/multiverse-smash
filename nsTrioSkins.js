// nsTrioSkins.js — Ninja Storm Trio (ns_trio): the skin pack. COSMETIC ONLY.
// Each skin is a precomputed recolour of ALL THREE forms' strips (Tori ns_blue, Blake ns_navy, Cam ns_green), built by
// tools/ns_trio/build_skins.py from tools/ns_trio/skins.json: same frame map, anchors and alpha → identical timing,
// hitboxes, collision. The skin follows every form switch (nsTrio.js applyForm → trioApplyForm via registerTrioSkinHook).
import { FORM_CHAR, registerTrioSkinHook } from './nsTrio.js'
import { TRIO_SKIN_ROWS } from './nsTrioSkinRows.js'

export const TRIO_SKIN_PREFIX = 'tr_'
const BY_TAG = Object.fromEntries(TRIO_SKIN_ROWS.map(r => [r.tag, r]))
export const trioSkinTag = skinId => (typeof skinId === 'string' && skinId.startsWith(TRIO_SKIN_PREFIX) && BY_TAG[skinId.slice(3)]) ? skinId.slice(3) : null
export const trioSkinDir = (tag, form) => `./assets/ns_trio/skins/${tag}/${form}`

// the form's own animationData with every sheet pointed at the skin folder (cached per tag / form)
const _cache = new Map()
export function trioFormAnim(tag, form) {
  const k = `${tag}|${form}`
  if (_cache.has(k)) return _cache.get(k)
  const base = FORM_CHAR[form]?.animationData
  if (!base || !BY_TAG[tag]) return null
  const dir = trioSkinDir(tag, form), out = {}
  for (const [key, A] of Object.entries(base)) out[key] = A && typeof A.sheet === 'string' ? { ...A, sheet: A.sheet.replace(/^\.\/assets\/ns_(blue|navy|green)/, dir) } : A
  _cache.set(k, out)
  return out
}

// the skins.js entries (select-screen preview = the skin's Tori | Blake | Cam split portrait); every skin starts as Tori
export const TRIO_SKINS = TRIO_SKIN_ROWS.map(r => ({
  id: TRIO_SKIN_PREFIX + r.tag, name: r.name, unlockLevel: 0, cosmeticOnly: true, classification: 'Trio Skin',
  portrait: `./assets/ns_trio/skins/${r.tag}/portrait_large.png`, hudIcon: `./assets/ns_trio/skins/${r.tag}/portrait_small.png`,
  spriteScale: FORM_CHAR.ns_blue.spriteScale, animationData: trioFormAnim(r.tag, 'ns_blue'),
  source: { version: 'Recolour of the supplied Ninja Storm Red Ranger sheets — Power Rangers Super Legends (DS), ripped by Grim (spritedatabase.net)' },
}))

// FORM APPLICATION (nsTrio.js applyForm, every round start / switch): the active form's skin strips, FX / projectile folder,
// effect + smoke colours. The start-form skins (default / start_navy / start_green) are untouched.
export function trioApplyForm(f, form) {
  const tag = trioSkinTag(f?.skinId)
  if (!tag) { if (f && f._trSkin) { f._trSkin = null; f._nsAssetDir = null; f._nsSmoke = null; f._nsColor = null } return }
  const A = trioFormAnim(tag, form), R = BY_TAG[tag]
  f._skinAnim = A; f._baseSkinAnim = A
  f._nsAssetDir = trioSkinDir(tag, form)
  f._nsColor = R.formFx[form]
  f._nsSmoke = R.smoke[form]
  f._trSkin = tag
}
registerTrioSkinHook(trioApplyForm)
