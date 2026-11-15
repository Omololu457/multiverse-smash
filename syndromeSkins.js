// Syndrome (syndrome) WHOLE-ARSENAL appearance skins — cosmetic only (identical geometry, anchors, frame data, hitboxes,
// audio, damage). Every skin recolours Syndrome AND every machine he commands (Drones, Bombers, Spinner, Turrets,
// Velocipod, the composite Omnidroid) plus his portrait — never Syndrome alone in front of a default Omnidroid.
// Sheets are PRECOMPUTED by tools/syndrome/build_skins.py → assets/syndrome/skins/<tag>/{*.png,machines/*.png,portrait.png}
// (palette spec tools/syndrome/skins.json; exact-colour role audit docs/syndrome/region_mapping.json; review sheet
// docs/syndrome/skins_contact.png). Outline black and skin tones are never recoloured. Patterns are static, baked.
// No runtime recolouring, no per-frame pixel scans, no canvas allocation per frame, no Math.random.
// Ids are prefixed "sy_", never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and never
// contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
import { syndrome as SY } from './syndromeData.js'
import { SYNDROME_SKIN_TABLE } from './syndromeSkinTable.js'
const SHEET = 'Supplied GBA "The Incredibles" sheets (Syndrome / Drone / Spinner / Turrets / Velocipod / Omnidroid 10), original pixels'
const common = { unlockLevel: 0, spriteScale: SY.spriteScale, regionMapping: './docs/syndrome/region_mapping.json',
  effectsPolicy: 'Body, portrait, every machine (Drone, Bomber, Spinner, Turrets, Velocipod, Omnidroid shell / limbs / claws / eye) and the HUD / reticle accents follow the skin. Outline black and skin tones are never recoloured.' }
// Owner colours (HUD accent pair, reticles / CONVERGENCE labels), render-only, read by syndromeFx.js.
export const SYNDROME_FX_COLORS = { default: { hud: ['#5fd0ff', '#e6f6ff'] },
  ...Object.fromEntries(SYNDROME_SKIN_TABLE.map(t => [t.tag, { hud: t.hud }])) }
const retag = tag => Object.fromEntries(Object.entries(SY.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/syndrome/', `./assets/syndrome/skins/${tag}/`) } : d]))
export const SYNDROME_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: SY.portrait, animationData: null, source: { version: SHEET } },
  ...SYNDROME_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: !!t.crossover, crossover: t.crossover, pattern: t.pattern || null,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only (inspired, not official)` : 'Original custom cosmetic design',
      inspiration: t.inspiration, base: SHEET, caveat: "Colour interpretation on the unchanged supplied pixels; no geometry, logo or stat change." },
    portrait: `./assets/syndrome/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
