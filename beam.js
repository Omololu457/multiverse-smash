// BEAM — the eye-laser algorithm Homelander and Superman already use, lifted UNCHANGED into one generic helper so a new
// beam user does not write another copy. (Their own char-gated copies in abilities.js / game.js are left byte-identical
// on purpose: refactoring them would risk their frame data.) Pure: no state, no RNG.
//   marchBeam   — abilities.applyHomelanderHeatVision's hitscan: march from the origin in 10-px steps along the angle;
//                 the first step inside the target AABB is the impact; otherwise the beam ends at `len`.
//   drawBeam3   — game.drawHomelanderHeatVision / drawSupermanHeatVision's look: a wide glow stroke, a mid stroke, a 2-px
//                 white core, an origin dot and a pulsing impact disc (colours are parameters).
export function marchBeam(ox, oy, angle, face, len, box = null, step = 10) {
  const bx = Math.cos(angle) * face, by = Math.sin(angle)
  if (box) for (let t = 0; t <= len; t += step) {
    const px = ox + bx * t, py = oy + by * t
    if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) return { x: px, y: py, hit: true, t }
  }
  return { x: ox + bx * len, y: oy + by * len, hit: false, t: len }
}
// where a beam meets a floor line (y = floor) — null when it never descends to it within len
export function beamFloorHit(ox, oy, angle, face, len, floor) {
  const by = Math.sin(angle); if (by <= 0.0001) return null
  const t = (floor - oy) / by; if (t < 0 || t > len) return null
  return { x: ox + Math.cos(angle) * face * t, y: floor, t }
}
export function drawBeam3(c, b, col = {}) {
  const glow = col.glow || 'rgba(255,40,30,0.55)', mid = col.mid || 'rgba(255,120,90,0.85)', core = col.core || 'rgba(255,255,255,0.95)'
  const w = col.width || 1
  c.save(); c.lineCap = 'round'
  c.strokeStyle = glow; c.lineWidth = 9 * w; c.beginPath(); c.moveTo(b.ox, b.oy); c.lineTo(b.tx, b.ty); c.stroke()
  c.strokeStyle = mid; c.lineWidth = 5 * w; c.beginPath(); c.moveTo(b.ox, b.oy); c.lineTo(b.tx, b.ty); c.stroke()
  c.strokeStyle = core; c.lineWidth = 2; c.beginPath(); c.moveTo(b.ox, b.oy); c.lineTo(b.tx, b.ty); c.stroke()
  c.fillStyle = col.dot || 'rgba(255,90,60,0.95)'; c.beginPath(); c.arc(b.ox, b.oy, 3.5, 0, Math.PI * 2); c.fill()
  if (b.hit) {
    const r = 8 + ((b.tick || 0) % 4)
    c.fillStyle = col.impact || 'rgba(255,180,120,0.7)'; c.beginPath(); c.arc(b.tx, b.ty, r, 0, Math.PI * 2); c.fill()
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(b.tx, b.ty, r * 0.4, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}

// ── LASER GAUGE DRIVER — the Homelander / Superman heat-vision ARCHITECTURE as one generic, data-driven state machine ──
// Lifted from abilities.applyHomelanderHeatVision (start / min burst / drain / release / overheat / re-fire cooldown / refill,
// auto-aim lock-on, Up / Down manual sweep capped around the firing axis) and supermanLaser.js (the gauge HUD bar). Their
// own copies stay byte-identical. The state is a plain object the caller keeps in its GAME_STATE; no RNG, no wall clock.
//   LASER_DEFAULTS = Homelander's tuning (HV_*): max 72, drain 1, refill 0.5, cooldown 60, overheat 150, min burst 12,
//   sweep 0.026 rad / frame capped at 0.62 rad.
export const LASER_DEFAULTS = { max: 72, drain: 1, refill: 0.5, cooldown: 60, overheat: 150, minBurst: 12, sweep: 0.026, sweepCap: 0.62 }
export const createLaser = (P = LASER_DEFAULTS) => ({ gauge: P.max, cd: 0, over: 0, on: false, burst: 0, angle: 0, base: 0, k: 0 })
// can a beam start now? (Homelander: no overheat, no cooldown, more than 1 heat)
export const laserReady = L => !!L && L.over <= 0 && L.cd <= 0 && L.gauge > 1
export function laserStart(L, P = LASER_DEFAULTS, angle = 0) {
  if (!laserReady(L)) return false
  L.on = true; L.burst = P.minBurst; L.angle = angle; L.base = angle; L.k = 0
  return true
}
// one frame. input = { held, up, down, aim } where aim = the lock-on angle toward the target (null = no target).
// Returns 'fire' while the beam runs, 'end' on release (cooldown starts), 'overheat' when the gauge ran dry, or 'idle'.
export function laserStep(L, P = LASER_DEFAULTS, input = {}) {
  if (L.over > 0) { L.over--; L.on = false; return 'idle' }
  if (!L.on) {
    if (L.cd > 0) L.cd--
    L.gauge = Math.min(P.max, L.gauge + P.refill)
    return 'idle'
  }
  if (L.burst > 0) L.burst--
  if ((!input.held && L.burst <= 0) || L.gauge <= 0) {
    L.on = false; L.cd = P.cooldown
    if (L.gauge <= 0) { L.over = P.overheat; L.gauge = 0; return 'overheat' }
    return 'end'
  }
  L.gauge = Math.max(0, L.gauge - P.drain); L.k++
  const manual = !!(input.up !== input.down && (input.up || input.down))
  if (!manual && input.aim != null) L.angle = input.aim                                       // lock onto the target
  else if (input.down && !input.up) L.angle = Math.min(L.base + P.sweepCap, L.angle + P.sweep)  // manual sweep around the
  else if (input.up && !input.down) L.angle = Math.max(L.base - P.sweepCap, L.angle - P.sweep)  // firing axis
  L.angle = Math.round(L.angle * 10000) / 10000
  return 'fire'
}
// a hard hit / knockdown kills the beam (Homelander: the re-fire cooldown still applies)
export function laserCut(L, P = LASER_DEFAULTS) { if (L?.on) { L.on = false; L.cd = P.cooldown } }
export const laserView = (L, P = LASER_DEFAULTS) => ({ gauge: L.gauge, max: P.max, cd: L.cd, cdMax: P.cooldown, over: L.over, overMax: P.overheat, firing: L.on })
// supermanLaser.drawSupermanLaserHud's bar, generic: x / y = the bar's top-left, w = width, flip = right-anchored (P2)
export function drawLaserGauge(ctx, V, x, y, w, { flip = false, label = 'HEAT VISION', col = '#ff3d24', low = '#ff8a1a' } = {}) {
  const h = 7, ratio = V.over > 0 ? 1 - V.over / V.overMax : V.gauge / V.max
  const c = V.over > 0 ? '#ff3b30' : V.cd > 0 ? '#9aa1ad' : (V.gauge / V.max < 0.34 ? low : col)
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
  const fw = w * Math.max(0, Math.min(1, ratio))
  ctx.fillStyle = c; ctx.fillRect(flip ? x + w - fw : x, y, fw, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1)
  if (V.cd > 0 && !V.over) { const cw = w * (1 - V.cd / V.cdMax); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(flip ? x + w - cw : x, y + h - 2, cw, 2) }
  ctx.font = 'bold 9px Arial'; ctx.textBaseline = 'bottom'; ctx.textAlign = flip ? 'right' : 'left'
  ctx.fillStyle = V.over > 0 ? '#ff6a60' : V.cd > 0 ? '#d6dbe4' : '#ffb4a6'
  ctx.fillText(V.over > 0 ? label + ' · OVERHEAT' : V.cd > 0 ? label + ' · COOLDOWN' : label, flip ? x + w : x, y - 2)
  ctx.restore()
}
