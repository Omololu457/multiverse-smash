// S.P.D. Yellow (spd_yellow) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio).
// Sheets are PRECOMPUTED by tools/spd_yellow/build_skins.py -> assets/spd_yellow/skins/<tag>/ (masks in …/skins/masks/,
// regions + per-file audit in docs/skins/spd_yellow/region_mapping.json). No runtime recolouring.
// Decorative MATERIALS (stars / glitter / iridescent accents, user-authorised) are drawn by spdYellowFx.js as a few
// discrete pixel marks on suit-masked anchor points (spdYellowMaterials.js); they never touch GAME_STATE, collision or RNG.
// Crossover-INSPIRED palettes: colour interpretations on Z's unchanged pixels, not canon costumes, not actual alien
// transformations, not other Rangers. Starlight Glitter / Opal Prism are ORIGINAL cosmetic designs authorised by the user.
// Ids deliberately do NOT end in "AlienX": the shared game.js starfield fills the whole cell rect, which would float
// stars off Z's body; her Alien X uses its own suit-masked star material instead.
import { spd_yellow } from './spdYellowData.js'
const SHEET = 'Plug & Play — Power Rangers S.P.D.: Escape of the Five Fugitives — Yellow Ranger sheet (ripped by the FRANKETE for TSR), original pixels'
const common = { unlockLevel: 0, spriteScale: spd_yellow.spriteScale, regionMapping: './docs/skins/spd_yellow/region_mapping.json',
  effectsPolicy: 'Body, portrait, the duplicate and the ultimate duplicates follow the skin (palette + material). Firearms, the blade, gloves, muzzle beams and phase streaks keep the supplied appearance; the Ninja Megazord keeps its own palette; Tactical Coins keep their supplied gold.' }
// Owner marker colours (clone tell, coin slots, panel highlight, warnings), render-only, read by spdYellowFx.js.
// `material` = the decorative surface effect drawn by spdYellowFx (null = static palette only).
export const SPD_YELLOW_FX = {
  default: { cols: ['#fff38a', '#c9a40a'], material: null },
  alienx: { cols: ['#e8fff0', '#3fae6a'], material: 'stars' },
  upgrade: { cols: ['#8dffad', '#1fd060'], material: null },
  diamondhead: { cols: ['#a8fff2', '#2fb8b0'], material: 'facet' },
  heatblast: { cols: ['#ffc070', '#ff6a10'], material: null },
  chromastone: { cols: ['#f0b8ff', '#a43be0'], material: 'crystal' },
  bigchill: { cols: ['#cfeeff', '#3a6ad0'], material: null },
  starlight: { cols: ['#e6dcff', '#8a6ad8'], material: 'glitter' },
  opal: { cols: ['#fff4d8', '#b49ad8'], material: 'opal' },
}
function skin(id, name, tag, { classification, source, inspiration = null, url = null, notes }) {
  const inspired = classification === 'Inspired Palette'
  return { ...common, id, name, recolorTag: tag, classification, inspired, crossover: inspired ? 'Ben 10 (Cartoon Network) colour inspiration — crossover-inspired palette' : null,
    material: SPD_YELLOW_FX[tag].material,
    source: { version: source, inspiration, url, base: SHEET, caveat: `${notes} No new geometry: no wings, horns, crystal spikes, costumes or weapons.` },
    portrait: `./assets/spd_yellow/skins/${tag}/portrait.png`,
    animationData: Object.fromEntries(Object.entries(spd_yellow.animationData).map(([k, d]) => [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/spd_yellow/', `./assets/spd_yellow/skins/${tag}/`) } : d])) }
}
const BEN = n => `Ben 10 franchise (Cartoon Network) — ${n} colour scheme only (crossover-inspired palette)`
export const SPD_YELLOW_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: spd_yellow.portrait, animationData: null, source: { version: SHEET } },
  skin('spd_yellow_inspired_alienx', 'Alien X — Inspired', 'alienx', { classification: 'Inspired Palette', source: BEN('Alien X'), inspiration: 'Alien X', url: 'https://ben10.fandom.com/wiki/Alien_X',
    notes: 'Black cosmic suit, pale stripes, green accents on the rare highlight tones; sparse slow stars masked inside the suit.' }),
  skin('spd_yellow_inspired_upgrade', 'Upgrade — Inspired', 'upgrade', { classification: 'Inspired Palette', source: BEN('Upgrade'), inspiration: 'Upgrade', url: 'https://ben10.fandom.com/wiki/Upgrade',
    notes: 'Dark suit; the existing stripe pixels turn neon green. Static.' }),
  skin('spd_yellow_inspired_diamondhead', 'Diamondhead — Inspired', 'diamondhead', { classification: 'Inspired Palette', source: BEN('Diamondhead'), inspiration: 'Diamondhead', url: 'https://ben10.fandom.com/wiki/Diamondhead',
    notes: 'Crystalline cyan/teal shading; an occasional sharp highlight runs along existing shading edges.' }),
  skin('spd_yellow_inspired_heatblast', 'Heatblast — Inspired', 'heatblast', { classification: 'Inspired Palette', source: BEN('Heatblast'), inspiration: 'Heatblast', url: 'https://ben10.fandom.com/wiki/Heatblast',
    notes: 'Charcoal suit with a dark ember lit side; molten orange/gold highlights and stripes. Static.' }),
  skin('spd_yellow_inspired_chromastone', 'Chromastone — Inspired', 'chromastone', { classification: 'Inspired Palette', source: BEN('Chromastone'), inspiration: 'Chromastone', url: 'https://ben10.fandom.com/wiki/Chromastone',
    notes: 'Purple/magenta crystalline palette with a subtle crystalline glint accent on shading edges.' }),
  skin('spd_yellow_inspired_bigchill', 'Big Chill — Inspired', 'bigchill', { classification: 'Inspired Palette', source: BEN('Big Chill'), inspiration: 'Big Chill', url: 'https://ben10.fandom.com/wiki/Big_Chill',
    notes: 'Deep navy suit, the existing brightest panels icy blue, pale cool stripes. Static.' }),
  skin('spd_yellow_starlight', 'Starlight Glitter', 'starlight', { classification: 'Original Cosmetic', source: 'Original cosmetic design authorized by user (not a canon costume)',
    notes: 'Dark violet suit, lavender highlights, silver stripes, restrained glitter pulses.' }),
  skin('spd_yellow_opal', 'Opal Prism', 'opal', { classification: 'Original Cosmetic', source: 'Original cosmetic design authorized by user (not a canon costume)',
    notes: 'Pale opal panels with slowly changing mint / lilac / gold accent highlights; shading order preserved.' }),
]
