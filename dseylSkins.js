// Dseyl (dseyl) — default appearance + 10 creative skins. Portrait = his edited copy of Syndrome's portrait.
import { dseyl as DS } from './dseylData.js'

// CREATIVE SKINS (tools/originalskins/build.py) — 10 recolours, each inspired by another fighter in the roster. Cosmetic
// only: every sheet → `<sheet>__<tag>.png` (same size / grid / alpha → identical timing + hitboxes); FX pixels untouched.
const _retag = tag => Object.fromEntries(Object.entries(DS.animationData || {}).map(([a, d]) => [a, d?.sheet ? { ...d, sheet: d.sheet.replace(/\.png$/i, `__${tag}.png`) } : d]))
const _portrait = tag => DS.portrait.replace(/\.png$/i, `__${tag}.png`)
const _creative = (tag, name) => ({ id: 'dseyl' + tag[0].toUpperCase() + tag.slice(1), name, classification: 'Creative', unlockLevel: 0,
  spriteScale: DS.spriteScale, portrait: _portrait(tag), animationData: _retag(tag), source: { version: 'tools/originalskins/build.py' } })
export const DSEYL_SKINS = [
  { id: 'default', name: 'Default', classification: 'Default', unlockLevel: 0, spriteScale: DS.spriteScale, portrait: DS.portrait, animationData: null,
    source: { version: 'Edited copy of the supplied GBA Syndrome sheet (tools/dseyl/build_sprites.py)' } },
  _creative('homelander', 'Homelander'),
  _creative('omniman', 'Omni-Man'),
  _creative('invincible', 'Invincible'),
  _creative('superman', 'Superman'),
  _creative('mrincredible', 'Mr. Incredible'),
  _creative('dash', 'Dash (Speed Suit)'),
  _creative('ultrainstinct', 'Ultra Instinct (Goku)'),
  _creative('jetray', 'Jetray'),
  _creative('xlr8', 'XLR8'),
  _creative('blueevolution', 'Blue Evolution (Vegeta)'),
]
