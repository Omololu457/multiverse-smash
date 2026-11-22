// goreFx.js — GORE for the finishers (signatureFatality.js): the victim's real sprite frame is torn into body parts
// (head, torso, arms, legs) that fly, spin, bleed trails and land in growing pools; organs, intestines and bone shards
// spill out; arterial spurts pulse from wounds; blood mists, rains and splats on the floor — and on the camera lens.
// Fluid-aware (battleBlood.bloodFluidOf): machines spill oil, wires and metal shards; green-blooded aliens bleed green;
// sand / ash / crystal bodies crumble instead. Honours Blood Off / Low / Full (juiceSettings.blood) and the young-character
// rule (BLOOD_YOUNG → Low). Presentation only, after the match is decided; own xorshift PRNG (no Math.random).
import { juiceSettings } from "./juiceSettings.js"
import { bloodFluidOf, BLOOD_YOUNG } from "./battleBlood.js"

const PAL = {
  blood: { b: "#8a0010", d: "#4a0008", hi: "#d0203a", organ: "#7a1a2a", organHi: "#e07a8a", gut: "#c25a6a", gutD: "#7a2a3a", bone: "#ece2c8", mist: "150,0,12" },
  oil: { b: "#141414", d: "#050505", hi: "#4a4a52", organ: "#3a3a44", organHi: "#9aa4b0", gut: "#c8a030", gutD: "#6a5010", bone: "#a8b0bc", mist: "30,30,34", mech: true },
  green: { b: "#2e8a2a", d: "#14400f", hi: "#7ae070", organ: "#3a6a2a", organHi: "#a8e090", gut: "#7ab060", gutD: "#2a5020", bone: "#e0e8c0", mist: "40,120,30" },
  dust: { b: "#8a7a5a", d: "#4a4030", hi: "#c8b890", organ: "#6a5a40", organHi: "#b8a880", gut: "#7a6a50", gutD: "#4a4030", bone: "#d8d0b8", mist: "150,130,100", dry: true },
}
let G = null
const rnd = () => { G.seed ^= G.seed << 13; G.seed ^= G.seed >>> 17; G.seed ^= G.seed << 5; return (G.seed >>> 0) / 4294967296 }
const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.max(0, Math.min(1, a))})` }

export function goreReset() { G = null }
export function goreSetup(victim, groundY) {
  const lvRaw = juiceSettings?.blood, lvl = lvRaw === "off" ? "off" : lvRaw === "low" ? "low" : "full"
  const key = String(victim?.rosterKey || victim?.key || "").toLowerCase(), fluid = bloodFluidOf(victim)
  const pal = fluid === "oil" ? PAL.oil : /^alien:green/.test(fluid) ? PAL.green : /^(sand|crack)/.test(fluid) ? PAL.dust : fluid === "none" ? null : PAL.blood
  G = { parts: [], decals: [], screen: [], seed: 0x6a09e667, t: 0, gy: groundY, pal, lvl: !pal ? "off" : BLOOD_YOUNG.has(key) && lvl === "full" ? "low" : lvl }
  return G.lvl
}
export const goreLevel = () => G?.lvl || "off"
export const goreState = () => G ? { parts: G.parts.length, decals: G.decals.length, screen: G.screen.length, lvl: G.lvl, limbs: G.parts.filter(p => p.type === "limb").length, organs: G.parts.filter(p => p.type === "organ" || p.type === "gut").length } : null

// ── spawners ──
function drop(x, y, vx, vy, size = 2 + rnd() * 3) { if (G.parts.length < 700) G.parts.push({ type: "drop", x, y, vx, vy, g: 0.42, size, life: 140 }) }
// a burst of blood droplets: n drops, a cone around angle `ang` (radians) of width `spread`, speed `sp`
export function goreSpray(x, y, n, sp = 8, ang = -Math.PI / 2, spread = Math.PI) {
  if (!G || G.lvl === "off") return
  if (G.lvl === "low") n = Math.ceil(n / 3)
  for (let i = 0; i < n; i++) { const a = ang + (rnd() - 0.5) * spread, s = sp * (0.35 + rnd()); drop(x, y, Math.cos(a) * s, Math.sin(a) * s) }
}
// an ARTERIAL SPURT that keeps pulsing from a point (follows `at()` if given) for `frames`
export function goreSpurt(x, y, ang, frames = 60, power = 9, at = null) { if (G && G.lvl !== "off") G.parts.push({ type: "spurt", x, y, ang, life: frames, max: frames, power, at }) }
export function goreMist(x, y, r = 80) { if (G && G.lvl !== "off") G.parts.push({ type: "mist", x, y, r, life: 50, max: 50 }) }
// splats on the camera lens (screen space); n big drops that slide down
export function goreLens(n = 5) {
  if (!G || G.lvl !== "full") return
  for (let i = 0; i < n; i++) G.screen.push({ u: 0.08 + rnd() * 0.84, v: 0.05 + rnd() * 0.6, r: 0.02 + rnd() * 0.05, drip: 0, sp: 0.0006 + rnd() * 0.0016, life: 200, seed: rnd() * 100 })
}
// tear the victim's frame into body parts + spill the insides. L = sprite _lastFrameDraw, B = { cx, cy, gy, w, h }.
//   power: launch speed; dir: -1/0/1 bias; style: "" | "burnt" | "frozen" | "flat" (squashed) | "shred" (many pieces)
export function goreDismember(L, B, { power = 9, dir = 0, style = "", up = 1 } = {}) {
  if (!G || G.lvl === "off") return
  const full = G.lvl === "full", P = G.pal
  const filter = style === "burnt" ? "brightness(0.35) sepia(0.6)" : style === "frozen" ? "brightness(1.2) saturate(0.4) hue-rotate(170deg)" : null
  const cuts = style === "feet" ? [[0.1, 0.84, 0.9, 1, "feet"]]   // erased — only the feet are left standing, bleeding
    : style === "shred"
    ? Array.from({ length: 16 }, (_, i) => { const cx = i % 4, cy = (i / 4) | 0; return [cx / 4, cy / 4, (cx + 1) / 4, (cy + 1) / 4] })
    : [[0.28, 0, 0.72, 0.24, "head"], [0.18, 0.22, 0.82, 0.56, "torso"], [0, 0.2, 0.3, 0.62, "arm"], [0.7, 0.2, 1, 0.62, "arm"], [0.12, 0.54, 0.5, 1, "leg"], [0.5, 0.54, 0.88, 1, "leg"]]
  if (L && L.img && full) for (const c of cuts) {
    const [u0, v0, u1, v1, nm] = c, px = B.x + (u0 + u1) / 2 * B.w, py = B.y + (v0 + v1) / 2 * B.h
    const a = Math.atan2(py - B.cy, px - B.cx) + (rnd() - 0.5) * 0.8, s = power * (0.55 + rnd() * 0.7) * (style === "flat" ? 0.45 : 1)
    const still = nm === "feet"
    G.parts.push({ type: "limb", L, tile: [u0, v0, u1, v1], x: px, y: py, vx: still ? 0 : Math.cos(a) * s + dir * power * 0.5, vy: still ? 0 : Math.sin(a) * s - power * 0.7 * up - (nm === "head" ? power * 0.4 : 0), stand: still, rot: 0, vr: (rnd() - 0.5) * 0.5, filter, bleed: style === "burnt" || style === "frozen" ? 0.2 : 1, life: 999, head: nm === "head" })
  }
  if (style === "feet") { const top = B.y + B.h * 0.84; goreSpurt(B.cx - B.w * 0.15, top, -Math.PI / 2 - 0.2, 90, 7); goreSpurt(B.cx + B.w * 0.15, top, -Math.PI / 2 + 0.2, 90, 7); goreMist(B.cx, B.cy, B.h); goreSpray(B.cx, B.cy, full ? 90 : 30, 7); return }
  const nOrg = full ? (style === "shred" ? 10 : 6) : 0, nBone = full ? 10 : 0, nGut = full && style !== "frozen" && style !== "burnt" ? 3 : 0
  for (let i = 0; i < nOrg; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6; G.parts.push({ type: "organ", x: B.cx + (rnd() - 0.5) * B.w * 0.4, y: B.cy, vx: Math.cos(a) * power * (0.4 + rnd() * 0.7) + dir * 2, vy: Math.sin(a) * power * (0.5 + rnd() * 0.6) * up, w: 7 + rnd() * 9, h: 5 + rnd() * 6, rot: rnd() * 6, vr: (rnd() - 0.5) * 0.3, frozen: style === "frozen", burnt: style === "burnt", life: 999 }) }
  for (let i = 0; i < nBone; i++) { const a = rnd() * Math.PI * 2; G.parts.push({ type: "bone", x: B.cx, y: B.cy, vx: Math.cos(a) * power * (0.5 + rnd()), vy: Math.sin(a) * power * (0.5 + rnd()) - 4, len: 5 + rnd() * 10, rot: rnd() * 6, vr: (rnd() - 0.5) * 0.6, life: 999 }) }
  for (let i = 0; i < nGut; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2, pts = Array.from({ length: 10 }, () => ({ x: B.cx, y: B.cy }))
    G.parts.push({ type: "gut", pts, vx: Math.cos(a) * power * 0.7 + dir * 2, vy: Math.sin(a) * power * 0.6 - 2, life: 999 }) }
  if (style !== "burnt" && style !== "frozen") { goreSpray(B.cx, B.cy, full ? 140 : 40, power * 1.1, -Math.PI / 2 + dir * 0.6, Math.PI * 1.6); goreMist(B.cx, B.cy, B.h * 0.9) }
  else goreSpray(B.cx, B.cy, 30, power * 0.8)
  if (style === "flat") for (let i = 0; i < 4; i++) goreSpurt(B.cx + (i - 1.5) * B.w * 0.6, B.gy - 6, i < 2 ? -2.6 : -0.5, 40, 7)
}
// a wound that stays on the body: spurts + steady bleeding into a pool (the victim is still drawn)
export function goreWound(x, y, ang, B, power = 8) {
  if (!G || G.lvl === "off") return
  goreSpray(x, y, 50, power, ang, 1.2); goreSpurt(x, y, ang, 70, power)
  G.decals.push({ x: B.cx, y: B.gy, r: 6, grow: G.lvl === "full" ? 42 : 18, seed: rnd() * 100 })
}

// ── simulation ──
function splat(x, r) {
  for (const d of G.decals) if (Math.abs(d.x - x) < d.r * 0.8) { d.grow = Math.min(90, d.grow + r * 0.35); return }
  if (G.decals.length < 60) G.decals.push({ x, y: G.gy, r: r * 0.6, grow: r * 1.8, seed: rnd() * 100 })
}
export function goreUpdate() {
  if (!G) return
  G.t++
  const gy = G.gy
  for (const p of G.parts) {
    p.life--
    if (p.type === "spurt") { const o = p.at ? p.at() : p; const pulse = (G.t % 14) < 6; if (pulse) for (let i = 0; i < 4; i++) { const a = p.ang + (rnd() - 0.5) * 0.35, s = p.power * (0.7 + rnd() * 0.5) * (p.life / p.max * 0.6 + 0.4); drop(o.x, o.y, Math.cos(a) * s, Math.sin(a) * s, 2 + rnd() * 2.5) } continue }
    if (p.type === "mist") continue
    if (p.type === "gut") { const h = p.pts[0]; p.vy += 0.4; h.x += p.vx; h.y += p.vy; p.vx *= 0.97; if (h.y > gy - 3) { h.y = gy - 3; p.vy *= -0.2; p.vx *= 0.6 }
      for (let i = 1; i < p.pts.length; i++) { const a = p.pts[i - 1], b = p.pts[i], dx = b.x - a.x, dy = b.y - a.y + 0.8, d = Math.hypot(dx, dy) || 1, L = 7; b.x = a.x + dx / d * Math.min(d, L); b.y = Math.min(gy - 3, a.y + dy / d * Math.min(d, L)) }
      if ((G.t & 3) === 0) drop(h.x, h.y, (rnd() - 0.5) * 1.5, 0.5, 2); continue }
    if (p.stand) { if (G.t % 9 === 0) splat(p.x, 4); continue }
    p.vy += p.g ?? 0.5; p.x += p.vx; p.y += p.vy
    if (p.type === "drop") { if (p.y >= gy - 1) { p.life = 0; splat(p.x, p.size) } continue }
    if (p.rot != null) p.rot += p.vr
    const floor = gy - (p.type === "limb" ? 6 : 2)
    if (p.y > floor) { p.y = floor; if (Math.abs(p.vy) > 2.5) { if (p.type !== "bone") splat(p.x, p.type === "limb" ? 10 : 6) } p.vy *= -0.28; p.vx *= 0.62; p.vr *= 0.5; if (Math.abs(p.vy) < 1) { p.vy = 0; p.rested = (p.rested || 0) + 1 } }
    if (p.type === "limb" && p.bleed > 0 && G.lvl !== "off") { if (!p.rested && (G.t & 1) === 0) drop(p.x + (rnd() - 0.5) * 6, p.y, -p.vx * 0.2 + (rnd() - 0.5), -p.vy * 0.2, 2 + rnd() * 2)
      if (p.rested && p.rested < 120 && G.t % 9 === 0) splat(p.x, 4 * p.bleed) }
    if (p.type === "organ" && !p.rested && (G.t & 3) === 0) drop(p.x, p.y, 0, 0.5, 2)
  }
  G.parts = G.parts.filter(p => p.life > 0)
  for (const d of G.decals) if (d.r < d.grow) d.r += Math.max(0.15, (d.grow - d.r) * 0.04)
  for (const s of G.screen) { s.life--; s.drip = Math.min(s.r * 2.2, s.drip + s.sp * 0.4) }   // a short run under each splat
  G.screen = G.screen.filter(s => s.life > 0)
}

// ── drawing (world space, over the fighters) ──
export function goreDraw(c) {
  if (!G || G.lvl === "off") return
  const P = G.pal, gy = G.gy
  c.save()
  for (const d of G.decals) {   // pools: an irregular blob + satellite splats + a wet highlight
    const s = d.seed; c.fillStyle = P.d; c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * 0.22, 0, 0, 7); c.fill()
    c.fillStyle = P.b; c.beginPath(); c.ellipse(d.x + Math.sin(s) * d.r * 0.15, d.y - 1, d.r * 0.82, d.r * 0.17, 0, 0, 7); c.fill()
    for (let i = 0; i < 5; i++) { const a = s + i * 1.7, rr = d.r * (1.05 + 0.25 * ((i * 7 + s) % 3) / 3); c.beginPath(); c.ellipse(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.2, d.r * 0.1 + 1.5, d.r * 0.04 + 1, 0, 0, 7); c.fill() }
    if (!P.dry) { c.fillStyle = "rgba(255,255,255,0.16)"; c.beginPath(); c.ellipse(d.x - d.r * 0.3, d.y - d.r * 0.06, d.r * 0.25, d.r * 0.04, 0, 0, 7); c.fill() }
  }
  for (const p of G.parts) {
    if (p.type === "mist") { const a = p.life / p.max; const g = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * (1.6 - a * 0.6)); g.addColorStop(0, `rgba(${P.mist},${0.45 * a})`); g.addColorStop(1, `rgba(${P.mist},0)`); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, 7); c.fill(); continue }
    if (p.type === "drop") { c.strokeStyle = P.b; c.lineWidth = p.size * 0.8; c.beginPath(); c.moveTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2); c.lineTo(p.x, p.y); c.stroke(); c.fillStyle = P.hi; c.beginPath(); c.arc(p.x, p.y, p.size * 0.55, 0, 7); c.fill(); continue }
    if (p.type === "limb") { const L = p.L, [u0, v0, u1, v1] = p.tile, tw = (u1 - u0) * L.w, th = (v1 - v0) * L.h
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); if (L.flip) c.scale(-1, 1); if (p.filter) c.filter = p.filter; c.imageSmoothingEnabled = false
      c.drawImage(L.img, L.sx + (L.flip ? (1 - u1) : u0) * L.sw, L.sy + v0 * L.sh, (u1 - u0) * L.sw, (v1 - v0) * L.sh, -tw / 2, -th / 2, tw, th)
      c.filter = "none"; if (p.bleed >= 1) { c.fillStyle = P.b; c.globalAlpha = 0.85   // the raw, wet stumps along the cut edges
        c.fillRect(-tw / 2, th / 2 - 3, tw, 3); c.fillRect(-tw / 2, -th / 2, tw, 3); c.fillStyle = P.hi; c.fillRect(-tw / 4, th / 2 - 2, tw / 2, 1); if (!P.mech) { c.fillStyle = P.bone; c.fillRect(-1.5, th / 2 - 2, 3, 4) } }
      c.restore(); continue }
    if (p.type === "organ") { c.save(); c.translate(p.x, p.y); c.rotate(p.rot)
      if (P.mech) { c.fillStyle = P.organ; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.fillStyle = P.organHi; c.fillRect(-p.w / 2, -p.h / 2, p.w, 2); c.strokeStyle = P.gut; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.w / 2, 0); c.quadraticCurveTo(p.w, p.h, p.w * 1.4, 0); c.stroke() }
      else { c.fillStyle = p.burnt ? "#2a120c" : p.frozen ? "#7a3a5a" : P.organ; c.beginPath(); c.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(p.w * 0.25, p.h * 0.15, p.w * 0.3, p.h * 0.35, 0, 0, 7); c.fill()
        c.fillStyle = p.frozen ? "rgba(200,240,255,0.7)" : P.organHi; c.beginPath(); c.ellipse(-p.w * 0.15, -p.h * 0.15, p.w * 0.18, p.h * 0.12, 0, 0, 7); c.fill() }
      c.restore(); continue }
    if (p.type === "bone") { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = P.bone; c.fillRect(-p.len / 2, -1.2, p.len, 2.4); if (!P.mech) { c.beginPath(); c.arc(-p.len / 2, 0, 2, 0, 7); c.arc(p.len / 2, 0, 2, 0, 7); c.fill() } c.restore(); continue }
    if (p.type === "gut") { c.lineCap = "round"; c.lineJoin = "round"; for (const [w, col] of [[7, P.gutD], [4.5, P.gut]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); p.pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke() }
      c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 1.2; c.beginPath(); p.pts.forEach((q, i) => i ? c.lineTo(q.x, q.y - 1.5) : c.moveTo(q.x, q.y - 1.5)); c.stroke(); continue }
  }
  c.restore()
}
// the camera lens: big splats that slowly run down
export function goreDrawScreen(c, W, H) {
  if (!G || !G.screen.length) return
  const P = G.pal
  c.save()
  for (const s of G.screen) { const a = Math.min(1, s.life / 40) * 0.88, x = s.u * W, y = s.v * H, r = s.r * H
    c.fillStyle = rgba(P.b, a); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill()
    for (let i = 0; i < 6; i++) { const ang = s.seed + i * 1.05, rr = r * (1.1 + 0.4 * ((i * 13 + s.seed) % 5) / 5); c.beginPath(); c.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, r * 0.22, 0, 7); c.fill() }
    c.fillRect(x - r * 0.18, y, r * 0.36, s.drip * H); c.beginPath(); c.arc(x, y + s.drip * H, r * 0.24, 0, 7); c.fill()   // the run
    c.fillStyle = `rgba(255,255,255,${0.18 * a})`; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, 7); c.fill() }
  c.restore()
}
