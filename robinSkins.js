// Robin (robin) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio, damage).
// Sheets are PRECOMPUTED by tools/robin/build_skins.py → assets/robin/skins/<tag>/ (palette spec tools/robin/skins.json,
// per-file region audit docs/skins/robin/region_mapping.json, review sheet docs/robin/skins_contact.png).
// Regions are separated per connected component, never one global swap: hair / cape exterior / cape lining / torso /
// arms (sleeves + gloves, one ramp in the source art) / legs / boots / belt / staff, plus the bomb, smoke and explosion
// strips. Natural skin, eye whites, the mask-lens shading and the black outline (which is also the black domino mask)
// are never recoloured. No runtime recolouring, no per-frame pixel scans, no Math.random.
// MATERIALS (Starfield Detective stars, Gilded Night glitter) are precomputed overlay strips
// assets/robin/skins/<tag>/mat/p<k>/<strip>.png drawn by robinFx.js inside the body's own draw rect (cloth / trim only
// by construction), with a static single-phase fallback under reduced motion / flashing.
// Ids are prefixed "rb_" and never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and never
// contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
import { robin } from './robinData.js'
import { ROBIN_SKIN_TABLE } from './robinSkinTable.js'
const SHEET = 'Game Boy Advance — Teen Titans — Playable Characters — Robin (supplied sheet), original pixels'
const common = { unlockLevel: 0, spriteScale: robin.spriteScale, regionMapping: './docs/skins/robin/region_mapping.json',
  effectsPolicy: 'Body, portrait, cut-in bust / mask / mouths, health icons, bomb, smoke, explosion, speed echoes and the HUD accent follow the skin. Skin tones, eye whites and the black mask are never recoloured.' }
// Owner colours (HUD accent pair, Smoke Step echo tint, material), render-only, read by robinFx.js.
export const ROBIN_FX_COLORS = { default: { hud: ['#e8203a', '#ffd800'], echo: '#40a0ff', material: null },
  ...Object.fromEntries(ROBIN_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, echo: t.echo, material: t.material }])) }
const retag = tag => Object.fromEntries(Object.entries(robin.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/robin/', `./assets/robin/skins/${tag}/`) } : d]))
export const ROBIN_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: robin.portrait, animationData: null, source: { version: SHEET } },
  ...ROBIN_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: !!t.crossover, crossover: t.crossover, material: t.material?.kind || null,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only (inspired, not official)` : 'Original custom cosmetic design',
      inspiration: t.inspiration, base: SHEET, caveat: "Colour interpretation on Robin's unchanged pixels; no geometry, logo or stat change." },
    portrait: `./assets/robin/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
