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
