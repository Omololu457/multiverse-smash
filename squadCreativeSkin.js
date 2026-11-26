// squadCreativeSkin.js — CREATIVE skins (`<key>_cs<theme>`, tools/creativeskins) on multi-Ranger fighters, RENDER ONLY.
// A creative skin is `<sheet>__cs<theme>.png` beside every default sheet. On a squad (S.P.D. / Mighty Morphin / Ninja Storm,
// squadCore.js) or Dino Thunder the live rosterKey is the ACTIVE Ranger, so the skin must follow every ↓↓ swap: each Ranger
// wears the SAME theme on its OWN strips (generated per Ranger by tools/creativeskins/build.py <ranger> --only <themes>).
// Leaf module: no imports.
export const creativeTagOf = skinId => /_(cs[a-z0-9]+)$/.exec(typeof skinId === 'string' ? skinId : '')?.[1] || null
const CACHE = new Map()
// the active Ranger's animationData with every sheet → its `__cs<theme>` version (null when the skin isn't a creative one)
export function creativeFormAnim(skinId, form, formAnim) {
  const tag = creativeTagOf(skinId)
  if (!tag || !formAnim) return null
  const key = tag + '|' + form
  let a = CACHE.get(key)
  if (!a) {
    a = Object.fromEntries(Object.entries(formAnim).map(([k, d]) => [k, d && d.sheet ? { ...d, sheet: d.sheet.replace(/\.png$/i, `__${tag}.png`) } : d]))
    CACHE.set(key, a)
  }
  return a
}
