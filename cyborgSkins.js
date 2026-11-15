// Cyborg (cyborg) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio, damage).
// Sheets are PRECOMPUTED by tools/cyborg/build_skins.py → assets/cyborg/skins/<tag>/ (palette spec tools/cyborg/skins.json,
// regions + per-file audit docs/skins/cyborg/region_mapping.json, review sheet docs/skins/cyborg/skins_contact.png).
// No runtime recolouring, no per-frame pixel scans, no new canvases. Victor's human skin pixels are NEVER recoloured
// (asserted by the build). The Mega Punch burst / streaks stay neutral; thruster flames + weapon effects follow fx.
// Decorative MATERIALS (Alien X stars, Disco Chrome glitter, Aurora iridescence) are precomputed overlay strips at
// assets/cyborg/skins/<tag>/mat/p<k>/<action>.png drawn by cyborgFx.js inside the body's own draw rect (so they are
// clipped to armour by construction) with a static single-phase fallback under reduced flashing / low particles.
// Ids deliberately do NOT end in "AlienX": the shared game.js starfield fills the whole cell rect (stars off the body).
// Ids are prefixed "cy_" and never contain "cyborg": game.js drawCyborgSupermanEye draws a red eye on ANY skinId containing
// "cyborg" (Superman's Cyborg Superman skin), which would put a stray eye on Victor.
import { cyborg } from './cyborgData.js'
import { CYBORG_SKIN_TABLE } from './cyborgSkinTable.js'
const SHEET = 'Game Boy Advance — Teen Titans — Playable Characters — Cyborg (supplied sheet), original pixels'
const common = { unlockLevel: 0, spriteScale: cyborg.spriteScale, regionMapping: './docs/skins/cyborg/region_mapping.json',
  effectsPolicy: 'Body, portrait, cut-in bust / eyes / mouths, health icons, thruster flames, sonic / missile / explosion strips and the HUD accent follow the skin. Victor\'s human skin is never recoloured. The Mega Punch impact burst and streaks stay neutral.' }
// Owner colours (HUD accent pair + fx ramp + material), render-only, read by cyborgFx.js.
export const CYBORG_FX_COLORS = { default: { hud: ['#6ec8ff', '#d8dee6'], fx: ['#0050b0', '#2898f0', '#60c8f8'], material: null },
  ...Object.fromEntries(CYBORG_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, fx: t.fx, material: t.material }])) }
const retag = tag => Object.fromEntries(Object.entries(cyborg.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/cyborg/', `./assets/cyborg/skins/${tag}/`) } : d]))
export const CYBORG_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: cyborg.portrait, animationData: null, source: { version: SHEET } },
  ...CYBORG_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: t.classification === 'Inspired Palette', crossover: t.crossover, material: t.material?.kind || null,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only` : 'Original cosmetic design (user-authorised)', inspiration: t.inspiration, url: t.url, base: SHEET,
      caveat: `Colour interpretation on Victor Stone's unchanged pixels. ${t.notes}` },
    portrait: `./assets/cyborg/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
