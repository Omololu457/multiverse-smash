// Enoch (enoch) — the default appearance + 10 creative skins (user, 2026-11-25). A skins.js entry is still needed so
// applySkin keeps his presentation scale (without one it falls back to spriteScale 1).
import { enoch as EN } from './enochData.js'

// CREATIVE SKINS (tools/originalskins/build.py) — 10 recolours, each inspired by another fighter in the roster. Cosmetic
// only: every sheet → `<sheet>__<tag>.png` (same size / grid / alpha → identical timing + hitboxes); FX pixels untouched.
const _retag = tag => Object.fromEntries(Object.entries(EN.animationData || {}).map(([a, d]) => [a, d?.sheet ? { ...d, sheet: d.sheet.replace(/\.png$/i, `__${tag}.png`) } : d]))
const _portrait = tag => EN.portrait.replace(/\.png$/i, `__${tag}.png`)
const _creative = (tag, name) => ({ id: 'enoch' + tag[0].toUpperCase() + tag.slice(1), name, classification: 'Creative', unlockLevel: 0,
  spriteScale: EN.spriteScale, portrait: _portrait(tag), animationData: _retag(tag), source: { version: 'tools/originalskins/build.py' } })
export const ENOCH_SKINS = [
  { id: 'default', name: 'Default', classification: 'Default', unlockLevel: 0, spriteScale: EN.spriteScale, portrait: EN.portrait, animationData: null,
    source: { version: 'Region recolour of the supplied GBA Frozone sheet (tools/enoch/build_sprites.py)' } },
  _creative('bigchill', 'Big Chill'),
  _creative('heatblast', 'Heatblast'),
  _creative('frieza', 'Final Form (Frieza)'),
  _creative('beerus', 'Destroyer (Beerus)'),
  _creative('byakuya', 'Senbonzakura (Byakuya)'),
  _creative('godspeed', 'Godspeed (Killua)'),
  _creative('rengoku', 'Flame Hashira (Rengoku)'),
  _creative('megawhatt', 'Megawhatt'),
  _creative('ssblue', 'Super Saiyan Blue (Goku)'),
  _creative('frostemperor', 'Frost Emperor'),
]
