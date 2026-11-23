// mapRun.js — THE MAP RUN (render side of Homelander's FLIGHT 37; reusable by any "carried across the world" move).
// The sim keeps the pair mid-screen and slides the WORLD under them by `shift` (extended x = sim x + shift). Here the
// world is a row of real maps laid end to end — slot 0 = the map you're on, then every other map, and the LAST slot is
// home again — each drawn by the game's own stage renderer (its real art, floor and layers), clipped to its slot and
// offset by -shift. The victim's blood smears onto whichever floor they're dragged across and slides away with it.
// Render-only (reads sim state). Blood honours juiceSettings.blood (off / low / full) and the victim's fluid.
import { juiceSettings } from "./juiceSettings.js"
import { bloodFluidOf } from "./battleBlood.js"

const FLUID = { blood: ["#7d0a0c", "#b3121a"], ranger: ["#7d0a0c", "#b3121a"], oil: ["#0e0e0e", "#2a2a2a"], "alien:green": ["#2f8a33", "#58c85c"], sand: ["#9c8152", "#c8aa74"], "crack:edo": ["#5a5248", "#7a7066"], "crack:crystal": ["#7ad0e8", "#c8f4ff"], "crack:magma": ["#c84a10", "#ff8a2a"] }
const H = (a, b) => { let x = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 4294967296 }

let R = { key: null, trail: [], spots: [], lastShift: 0, lastX: null, dust: [], speed: 0 }
export function mapRunReset() { R = { key: null, trail: [], spots: [], lastShift: 0, lastX: null, dust: [], speed: 0 } }

// slot → stage: 0 and last = home; the rest = every other map (cycled if there are more slots than maps)
function slotStage(run, k, home, all) {
  if (k <= 0 || k >= run.slots - 1) return home
  const others = all.filter(s => s && s !== home && (s.name || "") !== (home?.name || "") && !s.randomSongs && !s.random && !s.hidden)
  return others.length ? others[(k - 1) % others.length] : home
}

// world-space background (inside the camera transform). true → it drew the scene (skip the normal stage background).
export function drawMapRunBackground(c, cv, run, home, all, groundY, coverY, drawBg, camera) {
  if (!run || run.phase !== "run") return false
  const zoom = camera?.zoom || 1, half = (cv.width / zoom) / 2 + 200, cx = camera?.x ?? cv.width / 2
  const x0 = cx - half + run.shift, x1 = cx + half + run.shift, W = run.slotW
  const kA = Math.floor(Math.min(x0, x1) / W), kB = Math.floor(Math.max(x0, x1) / W)
  for (let s = kA; s <= kB; s++) {
    const k = s * run.dir   // slot index along the run (dir −1 lays the maps to the left)
    if (k < 0 || k > run.slots - 1) continue
    const st = slotStage(run, k, home, all); R.drawn = (R.drawn || []).slice(-6).concat(st?.id || st?.name || "?")
    c.save(); c.translate(s * W - run.shift, 0)
    c.beginPath(); c.rect(0, -6000, W, 12000); c.clip()
    try { drawBg(c, cv, st, groundY, st?.floorHeight || 120, coverY) } catch (_) {}
    c.restore()
  }
  return true
}

// world-space, over the floor and under the fighters: the blood smear + the drag dust
export function drawMapRunTrail(c, run, victim, groundY) {
  const lvl = juiceSettings?.blood || "full"
  if (!run) { if (R.trail.length || R.spots.length || R.dust.length) mapRunReset(); return }
  const shift = run.phase === "run" ? run.shift : 0
  // the run ended (home = slot 0 again): bring the smears that were on the home slot back into real-map x
  if (R.lastShift && shift === 0 && Math.abs(R.lastShift) > run.slotW) { const d = run.dir * (run.slots - 1) * run.slotW; for (const t of R.trail) { t.a -= d; t.b -= d } for (const p of R.spots) p.x -= d; R.lastX = null }
  R.speed = Math.abs(shift - R.lastShift); R.lastShift = shift
  const col = FLUID[bloodFluidOf(victim)] || FLUID.blood
  if (victim && (run.phase === "drag" || run.phase === "run") && lvl !== "off") {
    const vx = victim.x + (victim.w || 50) / 2 + shift
    if (R.lastX != null && Math.abs(vx - R.lastX) < 40000) {
      const a = Math.min(R.lastX, vx), b = Math.max(R.lastX, vx), last = R.trail[R.trail.length - 1]
      if (last && Math.abs(last.b - a) < 2 || last && Math.abs(last.a - b) < 2) { last.a = Math.min(last.a, a); last.b = Math.max(last.b, b) } else R.trail.push({ a, b })
      const n = lvl === "low" ? 1 : 3
      for (let i = 0; i < n && R.spots.length < 900; i++) { const r = H(R.spots.length, 7); R.spots.push({ x: a + (b - a) * r, dy: (H(R.spots.length, 11) - 0.5) * 9, r: 3 + 7 * H(R.spots.length, 13) }) }
    }
    R.lastX = vx
    if (R.dust.length < 160) for (let i = 0; i < 3; i++) R.dust.push({ x: victim.x + (victim.w || 50) / 2 - (run.dir || 1) * (victim.w || 50) * 0.5, y: groundY - 4, vx: -(run.dir || 1) * (2 + 5 * H(R.dust.length, 3)), vy: -1 - 3 * H(R.dust.length, 5), life: 26, r: 6 + 10 * H(R.dust.length, 9), spark: i === 0 })
  }
  for (const d of R.dust) { d.life--; d.x += d.vx; d.y += d.vy; d.vy += 0.15 }
  R.dust = R.dust.filter(d => d.life > 0)
  c.save()
  if (lvl !== "off") {
    const w = lvl === "low" ? 7 : 13
    for (const t of R.trail) {   // the smear: a dark wide band with a wetter core
      const a = t.a - shift, b = t.b - shift
      c.fillStyle = col[0]; c.globalAlpha = 0.85; c.fillRect(a, groundY - w * 0.55, b - a, w)
      c.fillStyle = col[1]; c.globalAlpha = 0.6; c.fillRect(a, groundY - w * 0.25, b - a, w * 0.4)
    }
    c.globalAlpha = 0.9; c.fillStyle = col[0]
    for (const p of R.spots) { const x = p.x - shift; c.beginPath(); c.ellipse(x, groundY + p.dy * 0.4, p.r * 1.6, p.r * 0.45, 0, 0, Math.PI * 2); c.fill() }
  }
  for (const d of R.dust) { const a = d.life / 26
    if (d.spark) { c.globalAlpha = a; c.fillStyle = "#ffd27a"; c.fillRect(d.x, d.y, 3, 2) }
    else { c.globalAlpha = a * 0.45; c.fillStyle = "#9a8a72"; c.beginPath(); c.arc(d.x, d.y, d.r * (1.5 - a * 0.5), 0, Math.PI * 2); c.fill() } }
  c.restore()
}

// screen-space speed streaks while the world races past (strength from how fast the world is sliding)
export function drawMapRunSpeed(c, cv, run, frame) {
  if (!run || run.phase !== "run") return
  const v = Math.min(1, R.speed / 900); if (v < 0.04) return
  const W = cv.width, Hh = cv.height
  c.save(); c.setTransform?.(1, 0, 0, 1, 0, 0)
  c.globalAlpha = 0.18 + 0.3 * v; c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(0, 0, W, Hh)
  c.strokeStyle = "rgba(255,255,255,0.75)"; c.lineCap = "round"
  for (let i = 0; i < 26; i++) { const y = H(i, 3) * Hh, len = W * (0.15 + 0.5 * v) * (0.5 + H(i, 5)), x = ((H(i, 7) * W * 3 - frame * W * 0.35 * (0.5 + v) * run.dir) % (W + len) + W + len) % (W + len) - len
    c.globalAlpha = (0.15 + 0.45 * v) * (0.4 + 0.6 * H(i, 9)); c.lineWidth = 1 + 2 * H(i, 11); c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke() }
  c.restore()
}
export const mapRunState = () => ({ drawn: (R.drawn || []).slice(-3), trail: R.trail.length, spots: R.spots.length, speed: Math.round(R.speed) })
