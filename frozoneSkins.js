// Frozone (frozone) appearance skins — cosmetic only (identical geometry, anchors, frame data, hitboxes, audio, damage,
// Chill / Freeze timing). Every skin covers the body, the portrait, the skating disc, the supplied white ice pieces, and —
// through FROZONE_FX_COLORS — every procedural ice effect (lance, wedges, Black Ice patch, ribbon, freeze shell, ramp,
// shatter fragments, rings). Sheets are PRECOMPUTED by tools/frozone/build_skins.py → assets/frozone/skins/<tag>/
// (palette spec tools/frozone/skins.json; role audit docs/frozone/region_mapping.json; review docs/frozone/skins_contact.png).
// Black visor / outline, skin tones and the ground shadow are never recoloured. Patterns are static and baked.
// No runtime recolouring, no per-frame pixel scans, no canvas allocation per frame, no Math.random.
// Ids are prefixed "fz_", never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and never
// contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
// Hazard readability: every skin's ice ramp keeps a dark outline (ice[0]) and a near-white core (ice[3]) so the Black Ice
// patch, the lance and the shell read equally on bright and dark stages.
import { frozone as FZ } from './frozoneData.js'
import { FROZONE_SKIN_TABLE } from './frozoneSkinTable.js'
const SHEET = 'Supplied GBA "The Incredibles" playable-character sheet (Frozone), original pixels'
const common = { unlockLevel: 0, spriteScale: FZ.spriteScale, regionMapping: './docs/frozone/region_mapping.json',
  effectsPolicy: 'Body, portrait, skating disc, supplied ice pieces and every procedural ice effect (lance, wedges, patch, ribbon, freeze shell, ramp, fragments) follow the skin. Visor black and skin tones are never recoloured.' }
// Owner colours (render-only, read by frozoneFx.js): hud pair + ice ramp [dark, mid, light, core] + optional ribbon accent.
export const FROZONE_FX_COLORS = { default: { hud: ['#7fd4f0', '#e6f8ff'], ice: ['#205078', '#7fd4f0', '#d8f6ff', '#ffffff'], accent: null },
  ...Object.fromEntries(FROZONE_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, ice: t.ice, accent: t.accent || null }])) }
const retag = tag => Object.fromEntries(Object.entries(FZ.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/frozone/', `./assets/frozone/skins/${tag}/`) } : d]))
export const FROZONE_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: FZ.portrait, animationData: null, source: { version: SHEET } },
  ...FROZONE_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: !!t.crossover, crossover: t.crossover, pattern: t.pattern || null, effects: t.effects,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only (inspired, not official)` : 'Original custom cosmetic design',
      inspiration: t.inspiration, base: SHEET, caveat: 'Colour interpretation on the unchanged supplied pixels; no geometry, logo or stat change.' },
    portrait: `./assets/frozone/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
