// Green Ranger (green_ranger) skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio, RNG).
// Sheets are PRECOMPUTED by tools/green_ranger/build_skins.py → assets/green_ranger/skins/<tag>/ (region masks per
// docs/green_ranger/SKINS.md). No runtime recolouring of the body. Crossover-INSPIRED / custom palettes, never
// official Green Ranger costumes. Identity packages (tagline, glyph, subtitle, flourishes): greenRangerSkinTable.js.
import { green_ranger } from './greenRangerData.js'
import { GREEN_SKIN_TABLE } from './greenRangerSkinTable.js'
const SHEET = 'Supplied sheet "mmpr_green_ranger_custom_sprite_sheet_by_supaman2525_d65abhs.png" (Sprites Edit By Supaman2525; credit goes to belial the hegehog), original pixels'
const common = { unlockLevel: 0, spriteScale: green_ranger.spriteScale, regionMapping: './docs/green_ranger/SKINS.md' }
const skinAnim = tag => Object.fromEntries(Object.entries(green_ranger.animationData).map(([k, d]) => [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/green_ranger/', `./assets/green_ranger/skins/${tag}/`) } : d]))
export const GREEN_RANGER_SKINS = GREEN_SKIN_TABLE.map(s => s.tag ? {
  ...common, id: s.id, name: `${s.name} — ${s.classification === 'inspired' ? 'Inspired' : 'Custom'}`, recolorTag: s.tag, classification: 'Inspired Palette', inspired: true,
  tagline: s.tagline, glyph: s.glyph, ultimateSubtitle: s.subtitle,
  source: { version: s.source, inspiration: s.source, base: SHEET, caveat: `Creative crossover palette on the unchanged Green Ranger pixels (region masks). ${s.notes}` },
  portrait: `./assets/green_ranger/skins/${s.tag}/portrait.png`, animationData: skinAnim(s.tag) }
  : { ...common, id: 'default', name: 'Default', classification: 'Default', tagline: s.tagline, glyph: s.glyph, portrait: green_ranger.portrait, animationData: null, source: { version: SHEET } })
