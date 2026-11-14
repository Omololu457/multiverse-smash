// Pink Ranger (mmpr_pink) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio).
// Sheets are PRECOMPUTED by tools/mmpr_pink/build_skins.py → assets/mmpr_pink/skins/<tag>/ (masks in …/skins/masks/,
// regions + per-file audit in docs/skins/mmpr_pink/region_mapping.json). No runtime recolouring.
// "Crossover Inspired Palette": colour interpretations on Kimberly's unchanged pixels — not transformations, not new
// powers, not costume replicas, never another Power Ranger's palette. The Alien X id ends in "AlienX" → the existing
// shared starfield overlay draws on top. The Thunder Megazord is NEVER recoloured (shared art); skins only theme
// Kimberly's own markers (MMPR_PINK_FX_COLORS) and her arrow tint, never damage, timing or geometry.
import { mmpr_pink } from './mmprPinkData.js'
const SHEET = 'Sega Genesis — Mighty Morphin Power Rangers: The Movie — Pink Ranger sheet ("Sprites (shamefully) ripped by Belial."), original pixels'
const common = { unlockLevel: 0, spriteScale: mmpr_pink.spriteScale, regionMapping: './docs/skins/mmpr_pink/region_mapping.json',
  effectsPolicy: 'Body, portrait, kick trails, bow, arrow tint, blink afterimage and Kimberly\'s markers follow the skin. The Thunder Megazord keeps its supplied appearance; hit sparks stay neutral.' }
// Owner marker colours (Spotter reticle, call location, warnings, pips, Thread flash), render-only.
export const MMPR_PINK_FX_COLORS = { default: ['#ffd0ea', '#e040a0'], alienx: ['#d8ffe4', '#3fae6a'], upgrade: ['#8dffad', '#1fd060'],
  diamondhead: ['#a8fff2', '#2fb8b0'], heatblast: ['#ffc070', '#ff6a10'], chromastone: ['#f0b8ff', '#a43be0'], ghostfreak: ['#e6e0ff', '#6b4a8c'] }
function skin(id, name, tag, inspiration, url, notes) {
  return { ...common, id, name, recolorTag: tag, classification: 'Crossover Inspired Palette', inspired: true,
    source: { version: `Ben 10 franchise (Cartoon Network) — ${inspiration} colour scheme only`, inspiration, url, base: SHEET,
      caveat: `Colour interpretation on the unchanged Pink Ranger pixels. ${notes} No new horns, flames, crystals, circuitry or costume geometry.` },
    portrait: `./assets/mmpr_pink/skins/${tag}/portrait.png`,
    animationData: Object.fromEntries(Object.entries(mmpr_pink.animationData).map(([k, d]) => [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/mmpr_pink/', `./assets/mmpr_pink/skins/${tag}/`) } : d])) }
}
export const MMPR_PINK_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: mmpr_pink.portrait, animationData: null, source: { version: SHEET } },
  skin('mmprPinkAlienX', 'Alien X — Inspired', 'alienx', 'Alien X', 'https://ben10.fandom.com/wiki/Alien_X', 'Charcoal/black suit, pale existing trim, green accents; the existing Alien X starfield overlay draws on top.'),
  skin('mmpr_pink_inspired_upgrade', 'Upgrade — Inspired', 'upgrade', 'Upgrade', 'https://ben10.fandom.com/wiki/Upgrade', 'Dark suit; the existing trim, bow and arrow accents turn vivid green.'),
  skin('mmpr_pink_inspired_diamondhead', 'Diamondhead — Inspired', 'diamondhead', 'Diamondhead', 'https://ben10.fandom.com/wiki/Diamondhead', 'Cyan/teal suit with pale cool highlights.'),
  skin('mmpr_pink_inspired_heatblast', 'Heatblast — Inspired', 'heatblast', 'Heatblast', 'https://ben10.fandom.com/wiki/Heatblast', 'Volcanic dark suit with orange/red/gold accents.'),
  skin('mmpr_pink_inspired_chromastone', 'Chromastone — Inspired', 'chromastone', 'Chromastone', 'https://ben10.fandom.com/wiki/Chromastone', 'Purple/magenta suit with contrasting pale trim.'),
  skin('mmpr_pink_inspired_ghostfreak', 'Ghostfreak — Inspired', 'ghostfreak', 'Ghostfreak', 'https://ben10.fandom.com/wiki/Ghostfreak', 'Pale spectral suit with dark existing seams; violet visor.'),
]
