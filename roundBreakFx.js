// roundBreakFx.js — ROUND WALK-BACK AFTERMATH (presentation only, between rounds).
// Once both fighters are back on their marks: the round's WINNER taunts (their taunt strip, else a victory / intro /
// power-up pose) and the LOSER stands hurt (hurt strip) — and the loser drips a little blood from the moment they get
// up (colour by their fluid: oil for machines, green for green-blooded aliens, sand / ash flakes for the non-flesh; none
// with Blood: Off). Deterministic: no RNG — drips come from a hash of the frame. Nothing here reaches the next round:
// resetRound() replaces both fighters.

const FLUID_COLOR = { blood: "#8e0d10", ranger: "#8e0d10", oil: "#141414", "alien:green": "#46b84a", sand: "#b89a62", "crack:edo": "#6b6258", "crack:crystal": "#a8f0ff", "crack:magma": "#ff6a1a" }
const WIN_POSES = ["victory", "win", "win_pose", "victory_pose", "intro", "powerup", "power_up", "transform", "charge"]
let drops = [], pools = [], impacts = [], trails = []
const H = (a, b) => { let x = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 4294967296 }
const has = (f, a) => !!(f?._skinAnim?.[a] || f?.animationData?.[a])

export function rbfxReset() { drops = []; pools = []; impacts = []; trails = [] }

// the winner's taunt / the loser's hurt stance — called every frame of the aftermath
export function rbfxPose(winner, loser) {
  if (winner) {
    winner.vx = 0
    if (has(winner, "taunt")) { winner._tauntPlaying = true; winner.attacking = false }
    else { const a = WIN_POSES.find(k => has(winner, k)); if (a) { winner.attacking = true; winner.currentMove = a; winner.currentAttack = null } }
  }
  if (loser) { loser.vx = 0; loser.hitstun = 2; loser.attacking = false; loser._tauntPlaying = false }
}
export function rbfxClear(...fs) { for (const f of fs) if (f) { f._tauntPlaying = false; f.attacking = false; f.currentMove = null; f.hitstun = 0 } }

// the loser bleeds a little: a drop every ~10 frames from the face / chest, falling to a small pool
export function rbfxBleed(f, fr, fluid, level, groundY) {
  const col = level === "off" ? null : FLUID_COLOR[fluid]
  if (!f || !col) return
  if (fr % (level === "low" ? 12 : 7) === 0 && drops.length < 40) {
    const w = f.w || 50, h = f.h || 100, side = (f.facing || 1)
    const r = H(fr, 7), at = r < 0.55 ? 0.16 + H(fr, 3) * 0.08 : 0.34 + H(fr, 5) * 0.18   // mostly the face, some from the body
    drops.push({ x: f.x + w / 2 + side * (w * (0.05 + H(fr, 11) * 0.22)) - w * 0.08, y: f.y + h * at, vy: 0.4 + H(fr, 13) * 0.6, r: 2.4 + H(fr, 17) * 1.6, col, gy: groundY })
  }
}
export function rbfxTick() {
  for (const d of drops) { d.vy = Math.min(9, d.vy + 0.32); d.y += d.vy
    if (d.y >= d.gy - 2) { d.dead = true; const p = pools.find(p => Math.abs(p.x - d.x) < 9 && p.col === d.col); if (p) p.r = Math.min(20, p.r + 1.1); else if (pools.length < 14) pools.push({ x: d.x, y: d.gy - 1, r: 4, col: d.col }) } }
  drops = drops.filter(d => !d.dead)
}
// world space, over the fighters
export function rbfxDraw(c) {
  if (!drops.length && !pools.length) return
  c.save()
  for (const p of pools) { c.fillStyle = p.col; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(p.x, p.y, p.r, p.r * 0.32, 0, 0, Math.PI * 2); c.fill()
    c.globalAlpha = 0.35; c.fillStyle = "#fff"; c.beginPath(); c.ellipse(p.x - p.r * 0.3, p.y - p.r * 0.08, p.r * 0.25, p.r * 0.07, 0, 0, Math.PI * 2); c.fill() }
  c.globalAlpha = 1
  for (const d of drops) { c.strokeStyle = d.col; c.globalAlpha = 0.55; c.lineWidth = d.r * 0.7; c.beginPath(); c.moveTo(d.x, d.y - d.r - Math.min(14, d.vy * 2.2)); c.lineTo(d.x, d.y); c.stroke(); c.globalAlpha = 1   // a short streak
    c.fillStyle = d.col; c.beginPath(); c.ellipse(d.x, d.y, d.r * 0.8, d.r * (1.1 + Math.min(1.2, d.vy * 0.12)), 0, 0, Math.PI * 2); c.fill() }
  c.restore()
}
export const rbfxState = () => ({ drops: drops.length, pools: pools.length, impacts: impacts.length, trails: trails.length })

// ── FLYER LAP + CRASH (2026-11-24 owner: fast flyers fly up, streak around the whole map, come back over their mark and
// CRASH down if they lost). A speed TRAIL behind the lapping flyer and a LANDING impact: hard = crater cracks + a big dust
// ring + rock debris (the loser), soft = a dust puff (the winner's hero landing). Deterministic (hash of the frame).
export function rbfxTrail(x, y, col, fr) { if (trails.length < 90) trails.push({ x, y, col: col || "#ffffff", life: 16, max: 16, w: 10 + H(fr, 3) * 6 }) }
export function rbfxImpact(x, y, hard, fr) {
  const n = hard ? 16 : 7, rocks = []
  for (let k = 0; k < n; k++) { const a = Math.PI + (k / (n - 1)) * Math.PI, sp = (hard ? 5 : 3) + H(fr + k, 9) * (hard ? 6 : 3)
    rocks.push({ x, y: y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (hard ? 1.3 : 0.8), r: hard ? 2 + H(fr + k, 4) * 3 : 1.5, g: y }) }
  const cracks = []
  if (hard) for (let k = 0; k < 9; k++) { const dir = k % 2 ? 1 : -1, len = 30 + H(fr + k, 21) * 70, pts = [[x, y]]; let px = x, py = y
    for (let j = 1; j <= 4; j++) { px += dir * len / 4 * (0.6 + H(fr + k * 7 + j, 5) * 0.8); py += (H(fr + k * 3 + j, 6) - 0.5) * 6; pts.push([px, Math.min(y + 8, Math.max(y - 2, py))]) } cracks.push(pts) }
  impacts.push({ x, y, hard, t: 0, rocks, cracks })
}
export function rbfxTickLap() {
  for (const tr of trails) tr.life--
  trails = trails.filter(t => t.life > 0)
  for (const im of impacts) { im.t++; for (const r of im.rocks) { if (r.y < r.g || r.vy < 0) { r.vy += 0.5; r.x += r.vx; r.y = Math.min(r.g, r.y + r.vy) } else { r.vx *= 0.8 } } }
}
export function rbfxDrawLap(c) {
  if (!trails.length && !impacts.length) return
  c.save()
  for (const tr of trails) { const a = tr.life / tr.max; c.globalAlpha = a * 0.55; c.fillStyle = tr.col; c.beginPath(); c.ellipse(tr.x, tr.y, tr.w * (0.5 + a), tr.w * 0.35 * a + 1, 0, 0, Math.PI * 2); c.fill() }
  for (const im of impacts) {
    const k = Math.min(1, im.t / 18), fade = Math.max(0, 1 - Math.max(0, im.t - 30) / 60)
    if (im.hard) {   // crater: dark ellipse + glowing cracks
      c.globalAlpha = 0.75 * fade; c.fillStyle = "#1a120c"; c.beginPath(); c.ellipse(im.x, im.y, 46, 9, 0, 0, Math.PI * 2); c.fill()
      c.strokeStyle = "#2a1a10"; c.lineWidth = 3; for (const p of im.cracks) { c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke() }
      c.strokeStyle = `rgba(255,${140 + 60 * (1 - k)},60,${0.5 * (1 - k)})`; c.lineWidth = 1.2; for (const p of im.cracks) { c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke() }
    }
    // dust ring
    c.globalAlpha = (1 - k) * (im.hard ? 0.7 : 0.45); c.fillStyle = "#cbb79a"
    const R = (im.hard ? 140 : 60) * (0.3 + k)
    c.beginPath(); c.ellipse(im.x, im.y - 6, R, R * 0.22, 0, 0, Math.PI * 2); c.fill()
    if (im.hard && im.t < 10) { c.globalAlpha = (1 - im.t / 10) * 0.8; c.fillStyle = "#fff4d8"; c.beginPath(); c.ellipse(im.x, im.y - 10, 70, 30, 0, 0, Math.PI * 2); c.fill() }   // impact flash
    c.globalAlpha = fade; c.fillStyle = "#6a5440"; for (const r of im.rocks) { c.beginPath(); c.arc(r.x, r.y, r.r, 0, Math.PI * 2); c.fill() }
  }
  c.restore()
}

