// Raven (raven) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio, damage).
// Sheets are PRECOMPUTED by tools/raven/build_skins.py → assets/raven/skins/<tag>/ (palette spec tools/raven/skins.json,
// regions + per-file audit docs/skins/raven/region_mapping.json, review sheet docs/skins/raven/skins_contact.png).
// No runtime recolouring, no per-frame pixel scans, no new canvases. Skin (face / hands) and the eye whites are never
// recoloured; the black soul-shell keeps its dark structure (only its rim / highlight ramp follows fx).
// Decorative MATERIALS (Alien X / Sapphire stars, Aurora iridescence, Gothic Velvet / Moonlit glitter) are precomputed
// overlay strips assets/raven/skins/<tag>/mat/p<k>/<action>.png drawn by ravenFx.js inside the body's draw rect
// (clipped to the cloak mask by construction) with a static single-phase fallback under reduced effects.
// Ids are prefixed "rv_" and never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and
// never contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
import { raven } from './ravenData.js'
import { RAVEN_SKIN_TABLE } from './ravenSkinTable.js'
const SHEET = 'Game Boy Advance — Teen Titans — Playable Characters — Raven (supplied sheet), original pixels'
const common = { unlockLevel: 0, spriteScale: raven.spriteScale, regionMapping: './docs/skins/raven/region_mapping.json',
  effectsPolicy: 'Body, portrait, cut-in bust / eyes / mouths, health icons, Dark Pulse orb / explosion, brick pile / breaking strips and the HUD accent follow the skin. Skin tones and eye whites are never recoloured; the soul-shell silhouette stays dark.' }
// Owner colours (HUD accent pair + fx ramp [dark, mid, light] + material), render-only, read by ravenFx.js.
export const RAVEN_FX_COLORS = { default: { hud: ['#9a78ff', '#e2dcff'], fx: ['#2a1050', '#7848d8', '#c8b0ff'], material: null },
  ...Object.fromEntries(RAVEN_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, fx: t.fx, material: t.material }])) }
const retag = tag => Object.fromEntries(Object.entries(raven.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/raven/', `./assets/raven/skins/${tag}/`) } : d]))
export const RAVEN_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: raven.portrait, animationData: null, source: { version: SHEET } },
  ...RAVEN_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: t.classification === 'Inspired Palette', crossover: t.crossover, material: t.material?.kind || null,
    research: t.research, source: { version: t.crossover ? `${t.crossover} — colour scheme only` : 'Original cosmetic design (user-authorised)',
      inspiration: t.inspiration, url: t.url, base: SHEET, caveat: `Colour interpretation on Raven's unchanged pixels. ${t.notes}` },
    portrait: `./assets/raven/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
