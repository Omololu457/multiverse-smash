// nsCgptSkins.js — Ninja Storm CGPT: 22 selectable appearances = the 2 supplied bases (Red = 'default', Yellow) + 20 skins.
// COSMETIC ONLY: every appearance has the identical strip set, frame map, anchors, frame data, hitboxes and audio — only the
// sheet folder changes. Skin sheets are PRECOMPUTED palette swaps of the Red strips (tools/ns_cgpt/build_skins.py, spec in
// tools/ns_cgpt/skins.json): the Ranger, the shadow clone (drawn from the same strips), the sword / wind / beam effect frames,
// the projectiles and the ultimate all read the skin's folder; procedural FX (wind spiral, fault cracks, eruption rock, clone
// sheen) read the skin's colours from CGPT_SKIN_FX. Crossover-INSPIRED palettes are colour interpretations on the Ranger's
// unchanged pixels (no new geometry), not canon costumes.
import { ninja_storm_cgpt, CGPT_MOVES, buildCgptAnims, CGPT_DIR } from './nsCgptData.js'
import { NS_CGPT_BASES, NS_CGPT_SKIN_TABLE } from './nsCgptSkinTable.js'

const SHEET = 'Power Rangers Ninja Storm Red / Yellow Ranger sheets — Power Rangers Super Legends (DS), ripped by Grim (spritedatabase.net)'
const common = { unlockLevel: 0, spriteScale: ninja_storm_cgpt.spriteScale, cosmeticOnly: true }
// tag → render colours (wind / effect, earth, accent, suit, dark) + material (render-only)
export const CGPT_SKIN_FX = Object.fromEntries([...NS_CGPT_BASES, ...NS_CGPT_SKIN_TABLE].map(r => [r.tag, { wind: r.fx, earth: r.earth, accent: r.accent, suit: r.suit, dark: r.dark, material: r.material || null }]))
const skinTagOf = { default: 'red', yellow: 'yellow' }
for (const r of NS_CGPT_SKIN_TABLE) skinTagOf['cgpt_' + r.tag] = r.tag
export const cgptSkinTag = skinId => skinTagOf[skinId] || 'red'
export const cgptSkinDir = skinId => CGPT_DIR(cgptSkinTag(skinId))

const entry = (id, name, tag, o = {}) => ({ ...common, id, name, recolorTag: tag, portrait: `${CGPT_DIR(tag)}/portrait_large.png`, hudIcon: `${CGPT_DIR(tag)}/portrait_small.png`,
  animationData: buildCgptAnims(CGPT_DIR(tag), CGPT_MOVES), material: CGPT_SKIN_FX[tag].material, ...o })
export const NS_CGPT_SKINS = [
  { ...common, id: 'default', name: 'Red Wind (supplied)', recolorTag: 'red', classification: 'Base Appearance', portrait: `${CGPT_DIR('red')}/portrait_large.png`, hudIcon: `${CGPT_DIR('red')}/portrait_small.png`, animationData: null, source: { version: SHEET } },
  entry('yellow', 'Yellow Wind (supplied)', 'yellow', { classification: 'Base Appearance', source: { version: SHEET } }),
  ...NS_CGPT_SKIN_TABLE.map(r => entry('cgpt_' + r.tag, r.name, r.tag, { classification: r.classification, inspired: r.classification === 'Inspired Palette',
    source: { version: r.classification === 'Inspired Palette' ? `${r.inspiration} — colour inspiration only (palette swap on the supplied Red sheet)` : 'Original cosmetic design (palette swap on the supplied Red sheet)', base: SHEET, notes: r.notes } })),
]
