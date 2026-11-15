// Elastigirl (elastigirl) appearance skins — cosmetic only (identical geometry, anchors, frame data, hitboxes, audio).
// Sheets are PRECOMPUTED by tools/elastigirl/build_skins.py → assets/elastigirl/skins/<tag>/ (exact-colour region
// lookups; families + per-skin counts in docs/elastigirl/skin_regions.json; review sheet docs/elastigirl/skins_contact.png).
// No runtime recolouring. Outlines, the black mask, skin, hair, eye whites and white FX are never recoloured. In the
// Family Raft frames only HELEN (her red tube + its gold belt patches) recolours — Dash and Violet keep their suits.
// Ids are prefixed "eg_" (never end in "AlienX", never contain "cyborg" — shared overlays key off those).
import { elastigirl } from './elastigirlData.js'
import { setElastigirlArmColors } from './elastigirlFx.js'
const SHEET = 'Game Boy Advance — The Incredibles — Elastigirl sheet (ripped by redblueyellow), original pixels'
const common = { unlockLevel: 0, spriteScale: elastigirl.spriteScale, portrait: elastigirl.portrait, regionMapping: './docs/elastigirl/skin_regions.json',
  effectsPolicy: 'Body sheets and the drawn Slingshot arm follow the skin. Portrait (face + mask only), splash / shadow FX and the raft passengers keep the supplied colours.' }
// Slingshot arm line colours [suit, glove] per skin (render-only, read by elastigirlFx.js)
setElastigirlArmColors({ default: ['#d81038', '#101010'], eg_incredibles2: ['#383840', '#aeb4be'], eg_retro: ['#d81038', '#2848c8'] })
const retag = tag => Object.fromEntries(Object.entries(elastigirl.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/elastigirl/', `./assets/elastigirl/skins/${tag}/`) } : d]))
const skin = (id, name, tag, notes) => ({ ...common, id, name, recolorTag: tag, classification: 'Palette Swap',
  source: { version: 'Original palette swap on the supplied sprites', base: SHEET, caveat: `${notes} Colour only — no geometry, logo or stat change.` },
  animationData: retag(tag) })
export const ELASTIGIRL_SKINS = [
  { ...common, id: 'default', name: 'Supersuit', classification: 'Default', animationData: null, source: { version: SHEET } },
  skin('eg_incredibles2', 'Elastigirl 2', 'incredibles2', 'Red suit → charcoal black, trim (gloves / boots / briefs) → silver, accent lines (belt / emblem) → blue; mask stays black.'),
  skin('eg_retro', 'Retro', 'retro', 'Red stays; black gloves / boots / trim → royal blue; mask stays black.'),
]
