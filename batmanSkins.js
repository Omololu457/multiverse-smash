// Batman (batman) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio, damage,
// resources, fleet behaviour). Sheets are PRECOMPUTED by tools/batman/build_skins.py → assets/batman/skins/<tag>/
// {body,fleet,portrait,explosion}.png (per-unique-colour lookups; region audit docs/batman/skin_regions.json; review
// sheet docs/batman/skins_contact.png). Each skin recolours Batman AND his whole arsenal: support machines, bombs /
// rounds, the reused explosion strip, effect lines, smoke and the HUD accent. Skin tones, eye whites and the black
// outline are never recoloured. No runtime recolouring, no per-frame pixel scans, no Math.random; if a skin sheet
// fails to load the default sheets are the static fallback (sprite.js / batmanFx image readiness checks).
// Ids are prefixed "bm_", never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and never
// contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
import { batman } from './batmanData.js'
import { BATMAN_SKIN_TABLE } from './batmanSkinTable.js'
const SHEET = 'SNES "Batman Returns" Batman sheet (upgraded by DAD34853, supplied) + supplied generic drone / robot packs'
const common = { unlockLevel: 0, spriteScale: batman.spriteScale, regionMapping: './docs/batman/skin_regions.json',
  effectsPolicy: 'Body, cape, belt / emblem, every support machine, payloads, the explosion strip, rope / tracer / beam effects, smoke, portrait and the HUD accent follow the skin. Skin tones, eye whites and outlines are never recoloured.' }
// Owner colours (HUD accent pair, effect triple [bright, mid, line], smoke pair), render-only, read by batmanFx.js.
export const BATMAN_FX_COLORS = { default: { hud: ['#f0b030', '#ffe6a0'], fx: ['#fff2b0', '#ffb040', '#d0a040'], smoke: ['#6c7484', '#4c5262'] },
  ...Object.fromEntries(BATMAN_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, fx: t.fx, smoke: t.smoke }])) }
const retag = tag => Object.fromEntries(Object.entries(batman.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/batman/', `./assets/batman/skins/${tag}/`) } : d]))
export const BATMAN_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: batman.portrait, animationData: null, source: { version: SHEET } },
  ...BATMAN_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: !!t.crossover, crossover: t.crossover,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only (inspired, not official)` : 'Original custom cosmetic design',
      inspiration: t.inspiration, base: SHEET, caveat: "Colour interpretation on Batman's and the fleet's unchanged pixels; no geometry, logo, emblem or stat change." },
    portrait: `./assets/batman/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
