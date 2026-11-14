// Black Ranger (mmpr_black) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio).
// Sheets are PRECOMPUTED by tools/mmpr_black/build_skins.py → assets/mmpr_black/skins/<tag>/ (masks in …/skins/masks/,
// regions + per-file audit in docs/skins/mmpr_black/region_mapping.json). No runtime recolouring.
// Crossover-INSPIRED palettes: colour interpretations on Adam's unchanged pixels — not transformations, not new powers,
// not costume replicas, not other Rangers. The Alien X id ends in "AlienX" → the existing shared starfield draws on top.
// The Falconzord is NEVER recoloured: skins only theme Black's own call markers (MMPR_BLACK_FX_COLORS), and skin choice
// never changes the bird's damage, paths, timings or hitboxes.
import { mmpr_black } from './mmprBlackData.js'
const SHEET = 'Sega Genesis — Mighty Morphin Power Rangers: The Movie — Black Ranger sheet (sprites ripped by Belial the Hedgehog), original pixels'
const common = { unlockLevel: 0, spriteScale: mmpr_black.spriteScale, regionMapping: './docs/skins/mmpr_black/region_mapping.json',
  effectsPolicy: 'Body, portrait, kick trails, blink afterimage and the owner call markers follow the skin. The Falconzord, its shots and impact keep the supplied appearance; hit sparks stay neutral.' }
// Owner-specific call-marker colours (lane / reticle / pips), render-only, read by mmprBlackFx.js.
export const MMPR_BLACK_FX_COLORS = { default: ['#e9ecef', '#5b6470'], alienx: ['#d8ffe4', '#3fae6a'], upgrade: ['#8dffad', '#1fd060'],
  diamondhead: ['#a8fff2', '#2fb8b0'], heatblast: ['#ffc070', '#ff6a10'], chromastone: ['#f0b8ff', '#a43be0'], ghostfreak: ['#e6e0ff', '#6b4a8c'] }
function skin(id, name, tag, inspiration, url, notes) {
  return { ...common, id, name, recolorTag: tag, classification: 'Inspired Palette', inspired: true,
    source: { version: `Ben 10 franchise (Cartoon Network) — ${inspiration} colour scheme only`, inspiration, url, base: SHEET,
      caveat: `Colour interpretation on the unchanged Black Ranger pixels. ${notes} No new horns, flames, crystals, circuitry or costume geometry.` },
    portrait: `./assets/mmpr_black/skins/${tag}/portrait.png`,
    animationData: Object.fromEntries(Object.entries(mmpr_black.animationData).map(([k, d]) => [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/mmpr_black/', `./assets/mmpr_black/skins/${tag}/`) } : d])) }
}
export const MMPR_BLACK_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: mmpr_black.portrait, animationData: null, source: { version: SHEET } },
  skin('mmprBlackAlienX', 'Alien X — Inspired', 'alienx', 'Alien X', 'https://ben10.fandom.com/wiki/Alien_X', 'Deep charcoal suit, pale existing trim, green on the top suit highlight and trails; the existing Alien X starfield overlay draws on top.'),
  skin('mmpr_black_inspired_upgrade', 'Upgrade — Inspired', 'upgrade', 'Upgrade', 'https://ben10.fandom.com/wiki/Upgrade', 'Dark suit; existing trim, visor and trails turn vivid green.'),
  skin('mmpr_black_inspired_diamondhead', 'Diamondhead — Inspired', 'diamondhead', 'Diamondhead', 'https://ben10.fandom.com/wiki/Diamondhead', 'Cyan/teal suit with pale highlights and cool dark trim.'),
  skin('mmpr_black_inspired_heatblast', 'Heatblast — Inspired', 'heatblast', 'Heatblast', 'https://ben10.fandom.com/wiki/Heatblast', 'Volcanic charcoal suit with orange/red/gold trim and trails.'),
  skin('mmpr_black_inspired_chromastone', 'Chromastone — Inspired', 'chromastone', 'Chromastone', 'https://ben10.fandom.com/wiki/Chromastone', 'Purple/magenta suit with contrasting pale lavender trim.'),
  skin('mmpr_black_inspired_ghostfreak', 'Ghostfreak — Inspired', 'ghostfreak', 'Ghostfreak', 'https://ben10.fandom.com/wiki/Ghostfreak', 'Pale spectral suit; the trim becomes dark seams; violet visor.'),
]
