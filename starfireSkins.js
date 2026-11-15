// Starfire (starfire) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, eye anchors,
// audio, damage). Sheets are PRECOMPUTED by tools/starfire/build_skins.py → assets/starfire/skins/<tag>/ (palette spec
// tools/starfire/skins.json, regions + per-file audit docs/skins/starfire/region_mapping.json, review sheet
// docs/starfire/skins_contact.png). No runtime recolouring, no per-frame pixel scans, no new canvases.
// Separate regions: skin (never recoloured), hair, eyes (geometry fixed), costume, boots, metal, outlines (kept), hand
// energy, projectiles, explosion, laser. Decorative MATERIALS (Alien X stars, Living Circuit / Aurora glitter, Prism Heart /
// Opal iridescence) are precomputed overlay strips drawn by starfireFx.js inside the body's draw rect (written only
// inside the costume mask), with a static single-phase fallback under reduced effects.
// Ids are prefixed "sf_" and never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and
// never contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
import { starfire } from './starfireData.js'
import { STARFIRE_SKIN_TABLE } from './starfireSkinTable.js'
const SHEET = 'Game Boy Advance — Teen Titans — Playable Characters — Starfire (supplied sheet), original pixels'
const common = { unlockLevel: 0, spriteScale: starfire.spriteScale, regionMapping: './docs/skins/starfire/region_mapping.json',
  effectsPolicy: 'Body, portrait, cut-in bust / eyes / mouths, health icons, hand energy, Energy Ball, Energy Exploding, Laser pieces and the HUD accent follow the skin. Skin tones and outlines are never recoloured; eye geometry (and so every eye anchor) is unchanged.' }
// Owner colours (HUD accent pair + fx ramp [dark, mid, light] + material), render-only, read by starfireFx.js.
export const STARFIRE_FX_COLORS = { default: { hud: ['#7cff4a', '#e4ffd8'], fx: ['#008c10', '#28e800', '#c8ffb0'], material: null },
  ...Object.fromEntries(STARFIRE_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, fx: t.fx, material: t.material }])) }
const retag = tag => Object.fromEntries(Object.entries(starfire.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/starfire/', `./assets/starfire/skins/${tag}/`) } : d]))
export const STARFIRE_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: starfire.portrait, animationData: null, source: { version: SHEET } },
  ...STARFIRE_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: t.classification !== 'Original', crossover: t.crossover, material: t.material?.kind || null,
    research: t.research, notes: t.notes, source: { version: t.crossover ? `${t.crossover} — colour scheme only` : 'Original cosmetic design (user-authorised)',
      inspiration: t.inspiration, url: t.url, base: SHEET, caveat: `Colour interpretation on Starfire's unchanged pixels. ${t.notes}` },
    portrait: `./assets/starfire/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
