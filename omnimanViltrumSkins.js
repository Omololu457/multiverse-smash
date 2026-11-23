// Omni-Man — Viltrumite (omniman_viltrum) — SKINS (render-only). Premade per-skin effect sheets + palettes; Phase 5 adds
// the 20 premade skins (tools/omnimanskins/). Until then every skin = the original suit palette.
import { OMV_KEY } from './omnimanViltrumData.js'
export const OMV_DEFAULT_PAL = { streak: 'rgba(255,240,240,0.9)', boom: '#ffffff', dust: 'rgba(150,130,110,0.55)', glow: '#ff6a2a', cape: '#d4141c' }
export const OMV_SKIN_PALS = {}
export const OMV_SKIN_FX = {}
const skinOf = f => (f?.rosterKey === OMV_KEY ? (f.skinId || f.skin?.id || 'default') : null)
export function omvSkinPal(f) { const k = skinOf(f); return (k && OMV_SKIN_PALS[k]) || OMV_DEFAULT_PAL }
export function omvSkinFx(f, key) { const k = skinOf(f); return (k && OMV_SKIN_FX[k]?.[key]) || null }
