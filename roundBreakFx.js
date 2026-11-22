// roundBreakFx.js — ROUND WALK-BACK AFTERMATH (presentation only, between rounds).
// Once both fighters are back on their marks: the round's WINNER taunts (their taunt strip, else a victory / intro /
// power-up pose) and the LOSER stands hurt (hurt strip) — and the loser drips a little blood from the moment they get
// up (colour by their fluid: oil for machines, green for green-blooded aliens, sand / ash flakes for the non-flesh; none
// with Blood: Off). Deterministic: no RNG — drips come from a hash of the frame. Nothing here reaches the next round:
// resetRound() replaces both fighters.

const FLUID_COLOR = { blood: "#8e0d10", ranger: "#8e0d10", oil: "#141414", "alien:green": "#46b84a", sand: "#b89a62", "crack:edo": "#6b6258", "crack:crystal": "#a8f0ff", "crack:magma": "#ff6a1a" }
const WIN_POSES = ["victory", "win", "win_pose", "victory_pose", "intro", "powerup", "power_up", "transform", "charge"]
let drops = [], pools = []
const H = (a, b) => { let x = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 4294967296 }
const has = (f, a) => !!(f?._skinAnim?.[a] || f?.animationData?.[a])

export function rbfxReset() { drops = []; pools = [] }

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
export const rbfxState = () => ({ drops: drops.length, pools: pools.length })
