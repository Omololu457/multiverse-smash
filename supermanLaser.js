// supermanLaser.js — Superman Heat Vision LASER gauge: tuning constants (used by the sim in abilities.js) + the HUD
// bar drawn directly ABOVE his energy panel (ui.js drawEnergyPanel hook), so it stays visible in matches and in
// Training (the training readout covers the area under the health bar). Leaf module: no imports → no cycles.
// 2026-11-15: Heat Vision runs on this gauge instead of Solar Energy, with a re-fire cooldown + overheat lockout.
export const SUP_LASER_MAX = 100
export const SUP_LASER_TAP = 34          // gauge spent by the tap shot
export const SUP_LASER_DRAIN = 0.9       // gauge per frame while the sustained beam is held
export const SUP_LASER_REFILL = 0.45     // gauge regained per frame while not firing (~3.7s empty→full)
export const SUP_LASER_CD = 60           // re-fire cooldown after each beam ends (1s)
export const SUP_LASER_OVERHEAT = 150    // lockout once the gauge hits 0 (2.5s)

export function supermanLaserState(f) {
  return { gauge: f._supLaser ?? SUP_LASER_MAX, max: SUP_LASER_MAX, cd: f._supLaserCd || 0, cdMax: SUP_LASER_CD,
    over: f._supLaserOver || 0, overMax: SUP_LASER_OVERHEAT, firing: !!f._supHvHold }
}

const isSuperman = f => !!f && (f.rosterKey || '').toLowerCase() === 'superman'

// ui.js drawEnergyPanel records where Superman's energy panel is this frame (render-only WeakMap, never on the fighter →
// snapshots / determinism untouched); game.js then draws the bar LAST in the HUD pass, above the Controls help box.
const _panel = new WeakMap()
export function noteSupermanEnergyPanel(fighter, geom) { if (isSuperman(fighter)) _panel.set(fighter, geom) }
export function drawSupermanLaserHud(ctx, fighter) {
  if (!isSuperman(fighter) || !_panel.has(fighter)) return
  const { x, enY, pbw, flip } = _panel.get(fighter)
  const L = supermanLaserState(fighter)
  const w = pbw, h = 7, bx = x + 8, by = enY - 14 - h - 6
  const ratio = L.over > 0 ? 1 - L.over / L.overMax : L.gauge / L.max
  const col = L.over > 0 ? '#ff3b30' : L.cd > 0 ? '#9aa1ad' : (L.gauge / L.max < 0.34 ? '#ff8a1a' : '#ff3d24')
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2)
  const fw = w * Math.max(0, Math.min(1, ratio))
  ctx.fillStyle = col; ctx.fillRect(flip ? bx + w - fw : bx, by, fw, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(bx - 0.5, by - 0.5, w + 1, h + 1)
  if (L.cd > 0 && !L.over) {   // cooldown refill sliver
    const cw = w * (1 - L.cd / L.cdMax); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(flip ? bx + w - cw : bx, by + h - 2, cw, 2)
  }
  ctx.font = 'bold 9px Arial'; ctx.textBaseline = 'bottom'; ctx.textAlign = flip ? 'right' : 'left'
  ctx.fillStyle = L.over > 0 ? '#ff6a60' : L.cd > 0 ? '#d6dbe4' : '#ffb4a6'
  ctx.fillText(L.over > 0 ? 'HEAT VISION · OVERHEAT' : L.cd > 0 ? 'HEAT VISION · COOLDOWN' : 'HEAT VISION', flip ? bx + w : bx, by - 2)
  ctx.restore()
}
