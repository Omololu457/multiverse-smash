// Hiromi Higuruma (higuruma) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio,
// damage, resources). Sheets are PRECOMPUTED by tools/higuruma/build_skins.py → assets/higuruma/skins/<tag>/ (palette
// spec tools/higuruma/skins.json, per-region audit docs/skins/higuruma/region_mapping.json + regions.png, review sheet
// docs/higuruma/skins_contact.png). Regions: hair / suit (3 tones) / shirt / tie / shoes / gavel wood / gavel metal /
// sword / effects. Natural skin, eye whites and the black outline are never recoloured. No runtime recolouring, no
// per-frame pixel scans, no Math.random. MATERIALS (Cosmic Court stars, Digital Justice circuit, Gilded glitter) are
// precomputed overlay strips assets/higuruma/skins/<tag>/mat/p<k>/<strip>.png on SUIT pixels only, drawn by higurumaFx.js
// with a static single-phase fallback under reduced motion / flashing.
// Ids are prefixed "hg_", never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and never
// contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
import { higuruma } from './higurumaData.js'
import { HIGURUMA_SKIN_TABLE } from './higurumaSkinTable.js'
const SHEET = 'Hiromi Higuruma sprite sheet by Mugen Matias (supplied), original pixels'
const common = { unlockLevel: 0, spriteScale: higuruma.spriteScale, regionMapping: './docs/skins/higuruma/region_mapping.json',
  effectsPolicy: 'Body, all gavel sizes and extensions, the Executioner\'s Sword, swing arcs, the evidence glow, portrait and the HUD / cinematic accent follow the skin. Skin tones, eye whites and outlines are never recoloured.' }
// Owner colours (HUD accent pair, effect / sword tint, material), render-only, read by higurumaFx.js.
export const HIGURUMA_FX_COLORS = { default: { hud: ['#c9a64a', '#f5e6b8'], fx: ['#ffff7f', '#ffeb54', '#cb843e'], sword: ['#ffffff', '#fff39a', '#ffeb54', '#cb843e'], material: null },
  ...Object.fromEntries(HIGURUMA_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, fx: t.fx, sword: t.sword, material: t.material }])) }
const retag = tag => Object.fromEntries(Object.entries(higuruma.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/higuruma/', `./assets/higuruma/skins/${tag}/`) } : d]))
export const HIGURUMA_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: higuruma.portrait, animationData: null, source: { version: SHEET } },
  ...HIGURUMA_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: !!t.crossover, crossover: t.crossover, material: t.material?.kind || null,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only (inspired, not official)` : 'Original custom cosmetic design',
      inspiration: t.inspiration, base: SHEET, caveat: "Colour interpretation on Higuruma's unchanged pixels; no geometry, mask, hat, cape, armour, emblem or stat change." },
    portrait: `./assets/higuruma/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
