// omegaSkins.js — 10 more Omega Ranger alt skins (cosmetic only). Sheets: tools/gen_omega_more.py, which reuses
// tools/gen_omega_creative.py's region masks (armour / visor / emblem; outlines untouched) and writes
// `<sheet>__<tag>.png` beside every wired omega_ranger_* sheet + the mugshot. This module APPENDS them to
// skins.js SKINS.omega_ranger at load (idempotent), after the existing 15. Nothing here is read by the simulation.
// Loaded from spdRedFx.js (the Ranger-family render module game.js already imports), so the shared skins.js /
// game.js tables are untouched.
import { SKINS } from './skins.js'
import { characters } from './characters.js'

// [tag, skin id, display name]
export const OMEGA_MORE_SKINS = [
  ['ben10', 'omegaBen10', 'Ben 10'],
  ['nova', 'omegaNova', 'Nova Ranger Tribute'],
  ['shadow', 'omegaShadow', 'Shadow Ranger Tribute'],
  ['krybot', 'omegaKrybot', 'Krybot Infiltrator'],
  ['gruumm', 'omegaGruumm', "Gruumm's Corruption"],
  ['magma', 'omegaMagma', 'Magma Core'],
  ['arctic', 'omegaArctic', 'Arctic Patrol'],
  ['neon', 'omegaNeon', 'Neon Delta Base'],
  ['holo', 'omegaHolo', 'Holo-Training Sim'],
  ['glitter', 'omegaGlitter', 'Galaxy Glitter'],
]
const retag = (p, tag) => p.replace(/\.png$/i, `__${tag}.png`)

const omega = characters.omega_ranger
const list = SKINS.omega_ranger
if (omega && list) {
  for (const [tag, id, name] of OMEGA_MORE_SKINS) {
    if (list.some(s => s.id === id)) continue
    list.push({ id, name, unlockLevel: 0, portrait: retag(omega.portrait || './SPD_Omega_Ranger_mugshot.png', tag), spriteScale: omega.spriteScale,
      animationData: Object.fromEntries(Object.entries(omega.animationData || {}).map(([k, d]) => [k, d?.sheet ? { ...d, sheet: retag(d.sheet, tag) } : d])) })
  }
}
