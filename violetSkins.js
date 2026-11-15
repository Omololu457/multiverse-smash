// Violet Parr (violet) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio, damage).
// Sheets are PRECOMPUTED palette swaps by tools/violet/build_skins.py → assets/violet/skins/<tag>/{<strip>,fx/*,portrait}.png
// (per-unique-colour lookups + one region rule for the suit trim; audit docs/violet/skin_regions.json, review sheet
// docs/violet/skins_contact.png). Each skin also recolours her invisible frames (R7 / R9 / R11 palette) and her force-field
// FX strips (rings, dome, shell, trap, hit). Skin tones, eye white, mask, hair, outline and the "i" logo are never touched.
// No runtime recolouring, no Math.random. Ids are prefixed "vi_" (never ending in "AlienX", never containing "cyborg").
import { violet } from './violetData.js'
const SHEET = 'Supplied GBA "The Incredibles" Violet sheet (ripped by redblueyellow)'
const common = { unlockLevel: 0, spriteScale: violet.spriteScale, regionMapping: './docs/violet/skin_regions.json' }
const retag = tag => Object.fromEntries(Object.entries(violet.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/violet/', `./assets/violet/skins/${tag}/`) } : d]))
// Render-only FX colours per skin tag (violetFx.js): ring / telegraph stroke, FULL FORCE flash, skin FX strip folder.
export const VIOLET_SKIN_FX = {
  inc2: { ring: '#f04060', flash: '#ffd8de', dir: './assets/violet/skins/inc2/fx' },
  midnight: { ring: '#9a5cff', flash: '#e6d8ff', dir: './assets/violet/skins/midnight/fx' },
}
const skin = (id, name, tag, inspiration) => ({ ...common, id, name, recolorTag: tag, classification: 'Palette swap',
  source: { version: 'Original palette swap of the supplied sheet', inspiration, base: SHEET,
    caveat: 'Colour interpretation on unchanged pixels; no geometry, logo or stat change.' },
  portrait: `./assets/violet/skins/${tag}/portrait.png`, animationData: retag(tag) })
export const VIOLET_SKINS = [
  { ...common, id: 'default', name: 'Supersuit', classification: 'Default', portrait: violet.portrait, animationData: null, source: { version: SHEET } },
  skin('vi_inc2', 'Incredibles 2', 'inc2', 'Suit red → near-black, black trim → red; mask stays black, "i" logo stays orange / white'),
  skin('vi_midnight', 'Midnight', 'midnight', 'Suit → navy, trim → deep violet, force-field rings → violet'),
]
