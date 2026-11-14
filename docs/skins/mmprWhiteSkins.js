// White Ranger (mmpr_white) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio).
// Sheets are PRECOMPUTED by tools/mmpr_white/build_skins.py → assets/mmpr_white/skins/<tag>/ (masks in …/skins/masks/,
// regions + per-file audit in docs/skins/mmpr_white/region_mapping.json). No runtime recolouring.
// Crossover-INSPIRED palettes: colour interpretations on Tommy's unchanged pixels — not Tommy's canonical costumes, not
// actual alien transformations, not other Rangers. The Alien X id ends in "AlienX" → the existing shared starfield draws
// on top. The Saba blade keeps its supplied silver on every palette. The Ninja Megazord is NEVER recoloured (shared art):
// skins only theme Tommy's own markers (MMPR_WHITE_FX_COLORS) and never change disciplines, damage, timing or geometry.
import { mmpr_white } from './mmprWhiteData.js'
const SHEET = 'Sega Genesis — Mighty Morphin Power Rangers: The Movie — White Ranger sheet (sprites ripped by Belial the Hedgehog), original pixels'
const common = { unlockLevel: 0, spriteScale: mmpr_white.spriteScale, regionMapping: './docs/skins/mmpr_white/region_mapping.json',
  effectsPolicy: 'Body, portrait, kick trails, Saba slash streak, blink afterimage and the owner markers (order warning, pips, discipline symbols, token) follow the skin. The Saba blade stays silver. The Ninja Megazord and its sword arc keep the supplied appearance; hit sparks stay neutral.' }
// Owner-specific marker colours (order warning, pips, disciplines, token), render-only, read by mmprWhiteFx.js.
export const MMPR_WHITE_FX_COLORS = { default: ['#f4f1e2', '#c9a227'], alienx: ['#d8ffe4', '#3fae6a'], upgrade: ['#8dffad', '#1fd060'],
  diamondhead: ['#a8fff2', '#2fb8b0'], heatblast: ['#ffc070', '#ff6a10'], chromastone: ['#f0b8ff', '#a43be0'], ghostfreak: ['#e6e0ff', '#6b4a8c'] }
function skin(id, name, tag, inspiration, url, notes) {
  return { ...common, id, name, recolorTag: tag, classification: 'Inspired Palette', crossover: 'Ben 10 (Cartoon Network) colour inspiration', inspired: true,
    source: { version: `Ben 10 franchise (Cartoon Network) — ${inspiration} colour scheme only`, inspiration, url, base: SHEET,
      caveat: `Colour interpretation on the unchanged White Ranger pixels. ${notes} No new shield, horns, flames, crystals or circuitry.` },
    portrait: `./assets/mmpr_white/skins/${tag}/portrait.png`,
    animationData: Object.fromEntries(Object.entries(mmpr_white.animationData).map(([k, d]) => [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/mmpr_white/', `./assets/mmpr_white/skins/${tag}/`) } : d])) }
}
export const MMPR_WHITE_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: mmpr_white.portrait, animationData: null, source: { version: SHEET } },
  skin('mmprWhiteAlienX', 'Alien X — Inspired', 'alienx', 'Alien X', 'https://ben10.fandom.com/wiki/Alien_X', 'Charcoal suit, the existing chest shield turns pale, the existing gold trim becomes green accents; the existing Alien X starfield overlay draws on top.'),
  skin('mmpr_white_inspired_upgrade', 'Upgrade — Inspired', 'upgrade', 'Upgrade', 'https://ben10.fandom.com/wiki/Upgrade', 'Dark suit; the existing shield, trim and visor turn green.'),
  skin('mmpr_white_inspired_diamondhead', 'Diamondhead — Inspired', 'diamondhead', 'Diamondhead', 'https://ben10.fandom.com/wiki/Diamondhead', 'Cyan/teal suit, pale highlights, cool dark-blue shield and icy trim.'),
  skin('mmpr_white_inspired_heatblast', 'Heatblast — Inspired', 'heatblast', 'Heatblast', 'https://ben10.fandom.com/wiki/Heatblast', 'Volcanic charcoal suit, dark-red shield, the existing gold trim runs orange to gold.'),
  skin('mmpr_white_inspired_chromastone', 'Chromastone — Inspired', 'chromastone', 'Chromastone', 'https://ben10.fandom.com/wiki/Chromastone', 'Purple/magenta suit, deep violet shield, contrasting pale lavender trim.'),
  skin('mmpr_white_inspired_ghostfreak', 'Ghostfreak — Inspired', 'ghostfreak', 'Ghostfreak', 'https://ben10.fandom.com/wiki/Ghostfreak', 'Pale spectral suit; the existing trim becomes dark seams; dark shield; violet visor.'),
]
