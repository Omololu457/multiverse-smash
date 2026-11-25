// narutoStoryboard.js — STORYBOARD ult openers for the Naruto universe: multi-shot, anime-style cut-in sequences that play
// (combat frozen) BEFORE each character's existing ultimate, which then runs exactly as before.
//
//   Naruto     focus → nine tailed-beast chakra balls spiral into one another → Kurama's head, the jaws open, zoom into the
//              mouth → the Tailed Beast Bomb compresses → whip to the foe → (kurama.js: the bomb is fired)
//   Minato · Obito · Tobi · Madara · Pain · Itachi · Sasuke · Jiraiya · Gaara · Kakashi ×3 · Isshiki · Shisui · Tobirama ·
//   Hashirama · Naruto (Seventh) — each its own shot list built from the same parts (eye cut-ins, art panels, chakra, seals).
//
// Two ways in (tools/ds/hooks.py):
//   • ults that are their OWN freeze cinematic (Kurama, Juubi, Tengai Shinsei, Chibaku Tensei, Edo Tensei, Sealing Jutsu):
//     deferNarutoUlt(key, f, opp, run) plays the storyboard first and calls run() when it ends (the real cinematic then
//     starts, unchanged). If no storyboard can start, run() fires immediately — identical to before.
//   • every other ult: triggerUltimate starts the storyboard right after the real cast (its timers freeze with it).
// Rides the Demon Slayer pre-roll engine (demonSlayerCinematics.js) — its freeze gate, letterbox, vignette, calligraphy.
// Render-only + camera; deterministic (frame-indexed, hashed noise). Art: the game's own sheets, loaded lazily.

import { ease, cx, hsh, toScreen, flameTongue, bolt } from "./dsCineKit.js"
import { registerUltPreroll, startDemonSlayerPreroll } from "./demonSlayerCinematics.js"
import { isSasukeCinematicActive } from "./sasukeCinematic.js"
import { drawEye } from "./narutoUltCinematics.js"

const TAU = Math.PI * 2
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v
const castOf = f => f?._spriteCastMove || f?.currentAttack?.name || f?.currentMove || ""

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ART — the game's own sheets (horizontal strips of n frames). Lazy Image per path; draws nothing until decoded.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IMG = {}
function img(p) {
  if (typeof Image === "undefined") return null
  let im = IMG[p]
  if (!im) { im = new Image(); im.src = "./" + p; IMG[p] = im }
  return im.complete && im.naturalWidth > 0 ? im : null
}
// frame i of an n-frame strip; anchor (ax, ay) in 0..1 of the frame lands on screen (x, y); h = on-screen frame height
function art(ctx, p, n, i, x, y, h, { ax = 0.5, ay = 0.5, flip = false, alpha = 1, rect = null } = {}) {
  const im = img(p); if (!im) return false
  const fw = rect ? rect.w : im.naturalWidth / n, fh = rect ? rect.h : im.naturalHeight
  const sx = rect ? rect.x : (Math.floor(i) % n) * fw, sy = rect ? rect.y : 0
  const s = h / fh, w = fw * s
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (flip) ctx.scale(-1, 1)
  ctx.drawImage(im, sx, sy, fw, fh, -w * ax, -h * ay, w, h); ctx.restore()
  return true
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PARTS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// a full-screen manga panel: slides in on a slant (7f), holds, slides out (6f); bg gradient + radial speed lines + inner()
function panel(ctx, cw, ch, k, d, bg, inner, { dir = 1, lines = "rgba(255,255,255,0.16)", focus = null } = {}) {
  const inK = ease(clamp01(k / 7)), outK = k > d - 6 ? ease(clamp01((d - k) / 6)) : 1, s = cw * 0.1
  const off = (1 - inK) * (cw + 2 * s) * dir - (1 - outK) * (cw + 2 * s) * dir
  ctx.save()
  ctx.beginPath(); ctx.moveTo(-s + off + s, 0); ctx.lineTo(cw + s + off + s, 0); ctx.lineTo(cw + s + off - s, ch); ctx.lineTo(-s + off - s, ch); ctx.closePath(); ctx.clip()
  const g = ctx.createLinearGradient(0, 0, 0, ch); bg.forEach((c, i) => g.addColorStop(i / Math.max(1, bg.length - 1), c))
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch)
  const fx = focus ? focus.x : cw / 2, fy = focus ? focus.y : ch / 2
  if (lines) speedLines(ctx, cw, ch, fx, fy, k, lines)
  inner()
  ctx.restore()
  // the panel's slanted borders while it moves
  if (k < 7 || k > d - 6) { ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.globalAlpha = 0.9
    for (const ex of [-s + off, cw + s + off]) { ctx.beginPath(); ctx.moveTo(ex + s, 0); ctx.lineTo(ex - s, ch); ctx.stroke() } ctx.restore() }
}
function speedLines(ctx, cw, ch, x, y, f, col, n = 46) {
  ctx.save(); ctx.strokeStyle = col
  for (let i = 0; i < n; i++) {
    const a = hsh(i, 7) * TAU, r0 = Math.min(cw, ch) * (0.28 + 0.25 * hsh(i, (f >> 1) + 3)), r1 = Math.max(cw, ch)
    ctx.lineWidth = 1 + 3 * hsh(i, 9); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke()
  }
  ctx.restore()
}
function glowBall(ctx, x, y, r, col, core = "rgba(255,255,255,0.95)") {
  if (r <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2); g.addColorStop(0, core); g.addColorStop(0.3, col); g.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill()
}
// chakra balls orbiting a point, spiralling inward and merging (k 0→1): trails, then one pulsing mass
function chakraOrbs(ctx, x, y, R, cols, k, f, s = 1) {
  const n = cols.length, m = ease(clamp01((k - 0.3) / 0.52))   // a clear orbit first, then the spiral in
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + f * (0.04 + 0.14 * m), r = R * (1 - m) * (0.82 + 0.18 * Math.sin(i * 2.3))
    for (let t = 6; t >= 0; t--) {   // the trail behind each ball
      const a = a0 - t * (0.1 + 0.18 * m), rr = r * (1 + t * 0.03), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.72
      ctx.globalAlpha = t === 0 ? 1 : 0.22 * (1 - t / 7); glowBall(ctx, px, py, (t === 0 ? 22 : 13) * s * (1 - 0.4 * m), cols[i], t === 0 ? "rgba(255,255,255,0.95)" : cols[i])
    }
  }
  if (k > 0.74) {   // the merged mass: dark core, a corona of every colour
    const mk = clamp01((k - 0.74) / 0.26), pr = (20 + 50 * ease(mk)) * s * (1 + 0.06 * Math.sin(f * 0.8))
    ctx.globalAlpha = mk; for (let i = 0; i < n; i++) { const a = f * 0.2 + i / n * TAU; glowBall(ctx, x + Math.cos(a) * pr * 0.35, y + Math.sin(a) * pr * 0.35, pr * 0.6, cols[i], cols[i]) }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = mk
    const g = ctx.createRadialGradient(x, y, 0, x, y, pr); g.addColorStop(0, "#05000a"); g.addColorStop(0.75, "#1a0628"); g.addColorStop(1, "rgba(80,30,120,0)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, pr, 0, TAU); ctx.fill()
  }
  ctx.restore()
}
// the bomb: dark sphere (art when decoded), swirling streaks, a hot rim, compressing shock rings
function bijuuSphere(ctx, x, y, r, f, { sheet = "naruto_seventh_bijuudama_sphere_uniform.png", rim = "#ff8a1a", squeeze = 0 } = {}) {
  ctx.save()
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9; glowBall(ctx, x, y, r * 0.75, rim, "rgba(255,200,120,0.4)")
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1
  if (!art(ctx, sheet, 1, 0, x, y, r * 2.1)) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); g.addColorStop(0, "#3a2050"); g.addColorStop(1, "#050008"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
  }
  ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < 7; i++) { const a = f * 0.18 + i * 0.9; ctx.globalAlpha = 0.5; ctx.strokeStyle = i % 2 ? "#b07cff" : rim; ctx.lineWidth = 2 + (i % 3)
    ctx.beginPath(); ctx.arc(x, y, r * (0.55 + 0.06 * i), a, a + 1.4); ctx.stroke() }
  if (squeeze > 0) for (let i = 0; i < 3; i++) { const t = ((squeeze * 3 + i / 3) % 1); ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(x, y, r * (2.4 - 1.4 * t), 0, TAU); ctx.stroke() }
  ctx.restore()
}
// the caster's chakra aura on the world (flame tongues from the feet) + drifting motes
function aura(ctx, E, cols, pow = 1) {
  const { feet, body, z, F } = E
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (let L = 0; L < 2; L++) for (let i = 0; i < 9; i++) {
    const x = feet.x + (i - 4) * 9 * z, fl = 0.7 + 0.3 * Math.sin(F * 0.35 + i * 1.3 + L)
    ctx.globalAlpha = (L ? 0.3 : 0.22) * pow; flameTongue(ctx, x, feet.y, (60 + 40 * hsh(i, L)) * z * fl * (0.6 + 0.4 * pow), (10 - L * 3) * z, Math.sin((F + i * 9) / 8) * 6 * z, F / 5 + i, cols[L])
  }
  for (let i = 0; i < 18; i++) { const t = ((F * 0.02 + hsh(i, 2)) % 1), x = body.x + (hsh(i, 3) - 0.5) * 90 * z, y = feet.y - t * 140 * z
    ctx.globalAlpha = (1 - t) * 0.8 * pow; ctx.fillStyle = cols[i % 2]; ctx.fillRect(x, y, 3, 3) }
  ctx.restore()
}
// one huge eye in a black band (the procedural ones live in narutoUltCinematics.drawEye; extras here)
function eyeBand(ctx, cw, ch, k, draw) {
  const bandH = ch * 0.3 * ease(clamp01(k * 4)) * (k > 0.88 ? (1 - k) / 0.12 : 1), cy = ch * 0.5
  ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = "#07040c"; ctx.fillRect(0, cy - bandH / 2, cw, bandH)
  ctx.beginPath(); ctx.rect(0, cy - bandH / 2, cw, bandH); ctx.clip(); draw(cw / 2, cy, bandH); ctx.restore()
}
function mangekyou(ctx, x, y, r, pattern, f) {
  ctx.save()
  ctx.fillStyle = "#f4efe8"; ctx.beginPath(); ctx.ellipse(x, y, r * 3.2, r * 1.25, 0, 0, TAU); ctx.fill(); ctx.clip()
  ctx.fillStyle = pattern === "rinnesharingan" ? "#c8102a" : "#c0101a"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
  ctx.fillStyle = "#120002"; ctx.strokeStyle = "#120002"; const spin = f * 0.05
  if (pattern === "madara") {   // three curved blades around a ring
    ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, TAU); ctx.stroke()
    for (let i = 0; i < 3; i++) { const a = spin + i * TAU / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2)
      ctx.quadraticCurveTo(x + Math.cos(a + 0.9) * r * 1.0, y + Math.sin(a + 0.9) * r * 1.0, x + Math.cos(a + 0.25) * r * 0.95, y + Math.sin(a + 0.25) * r * 0.95)
      ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * r * 0.5, y + Math.sin(a + 0.4) * r * 0.5, x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); ctx.fill() }
  } else if (pattern === "kamui") {   // Kakashi / Obito: three-bladed shuriken
    ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, TAU); ctx.fill()
    for (let i = 0; i < 3; i++) { const a = spin + i * TAU / 3; ctx.beginPath(); ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + Math.cos(a - 0.5) * r * 0.9, y + Math.sin(a - 0.5) * r * 0.9, x + Math.cos(a + 0.35) * r * 0.98, y + Math.sin(a + 0.35) * r * 0.98)
      ctx.quadraticCurveTo(x + Math.cos(a + 0.2) * r * 0.4, y + Math.sin(a + 0.2) * r * 0.4, x, y); ctx.fill() }
  } else if (pattern === "shisui") {   // four-bladed pinwheel
    for (let i = 0; i < 4; i++) { const a = spin + i * TAU / 4; ctx.beginPath(); ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, x + Math.cos(a + 0.7) * r * 0.9, y + Math.sin(a + 0.7) * r * 0.9); ctx.lineTo(x, y); ctx.fill() }
    ctx.fillStyle = "#c0101a"; ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); ctx.fill()
  } else if (pattern === "rinnesharingan") {   // ripples + nine tomoe
    ctx.lineWidth = r * 0.05; for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(x, y, r * (0.18 + i * 0.2), 0, TAU); ctx.stroke() }
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 3; i++) { const a = spin * (ring % 2 ? -1 : 1) + i * TAU / 3 + ring, rr = r * (0.38 + ring * 0.2)
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.06, 0, TAU); ctx.fill() }
  } else if (pattern === "sage") {   // toad sage: gold iris, a horizontal bar pupil
    ctx.fillStyle = "#e8b020"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
    ctx.fillStyle = "#1a0e00"; ctx.fillRect(x - r * 0.55, y - r * 0.14, r * 1.1, r * 0.28)
  } else {   // three tomoe
    ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, TAU); ctx.fill()
    for (let i = 0; i < 3; i++) { const a = spin + i * TAU / 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.13, 0, TAU); ctx.fill() }
  }
  ctx.restore()
  ctx.save(); ctx.strokeStyle = "#07040c"; ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.ellipse(x, y, r * 3.2, r * 1.25, 0, 0, TAU); ctx.stroke(); ctx.restore()
}
function lightningBall(ctx, x, y, r, f, cols = ["#5ab0ff", "#ffffff"]) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1; glowBall(ctx, x, y, r * 0.6, cols[0])
  for (let i = 0; i < 14; i++) { const s = i * 17 + (f >> 1), a = hsh(s, 1) * TAU, l = r * (1.2 + 1.6 * hsh(s, 2))
    ctx.globalAlpha = 0.9; bolt(ctx, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, s, i % 3 ? 2 : 4, cols[i % 2], 8, r * 0.5) }
  ctx.restore()
}
function crows(ctx, cw, ch, k, f, n = 26) {
  ctx.save(); ctx.fillStyle = "#050208"
  for (let i = 0; i < n; i++) { const sp = 0.6 + hsh(i, 1), x = ((hsh(i, 2) + k * sp * 1.4) % 1.2 - 0.1) * cw, y = ch * (0.1 + 0.8 * hsh(i, 3)) + Math.sin(f * 0.2 + i) * 10, s = 10 + 14 * hsh(i, 4), w = Math.sin(f * 0.6 + i) * s * 0.7
    ctx.beginPath(); ctx.moveTo(x - s, y - w); ctx.quadraticCurveTo(x - s * 0.3, y, x, y + s * 0.15); ctx.quadraticCurveTo(x + s * 0.3, y, x + s, y - w); ctx.quadraticCurveTo(x, y + s * 0.4, x - s, y - w); ctx.fill() }
  ctx.restore()
}
function sealGlyphs(ctx, cw, ch, k, glyphs, col = "#ffe6c4") {   // hand seals: one big seal kanji at a time, in a ring
  const n = glyphs.length, i = Math.min(n - 1, Math.floor(k * n)), kk = (k * n) % 1, x = cw * 0.5, y = ch * 0.5, R = ch * 0.2
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x, y, R * (1 + 0.05 * Math.sin(kk * TAU)), 0, TAU); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y, R * 1.18, 0, TAU); ctx.stroke()
  for (let j = 0; j < n; j++) { const a = -Math.PI / 2 + j / n * TAU; ctx.globalAlpha = j <= i ? 1 : 0.25; ctx.fillStyle = col; ctx.font = `900 ${Math.round(ch * 0.05)}px "Yu Mincho","Hiragino Mincho ProN",serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(glyphs[j], x + Math.cos(a) * R * 1.45, y + Math.sin(a) * R * 1.45) }
  const sc = 1.6 - 0.6 * ease(clamp01(kk * 3)); ctx.globalAlpha = 1; ctx.font = `900 ${Math.round(ch * 0.2 * sc)}px "Yu Mincho","Hiragino Mincho ProN",serif`
  ctx.lineWidth = 8; ctx.strokeStyle = "#0c0410"; ctx.strokeText(glyphs[i], x, y); ctx.fillStyle = col; ctx.fillText(glyphs[i], x, y)
  ctx.restore()
}
// Inosuke's jagged (chipped) nichirin blade, tip at angle a from (x, y)
function jaggedBlade(ctx, x, y, a, L, w, col = "#9aa8b8") {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.strokeStyle = "#1a1a24"; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, -w / 2)
  for (let i = 1; i <= 12; i++) { const px = L * i / 12; ctx.lineTo(px - L / 30, -w / 2 - (i % 2 ? w * 0.6 : 0)) }
  ctx.lineTo(L * 1.06, 0); ctx.lineTo(L, w / 2); ctx.lineTo(0, w / 2); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-L * 0.28, -w * 0.45, L * 0.28, w * 0.9); ctx.fillStyle = "#c8a040"; ctx.fillRect(-6, -w, 8, w * 2)
  ctx.restore()
}
function flash(ctx, cw, ch, a, col = "#fff") { if (a <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = col; ctx.fillRect(0, 0, cw, ch); ctx.restore() }
function rings(ctx, x, y, k, R, col = "#fff", n = 3) { ctx.save(); for (let i = 0; i < n; i++) { const t = clamp01(k * 1.4 - i * 0.15); if (t <= 0 || t >= 1) continue; ctx.globalAlpha = 1 - t; ctx.strokeStyle = col; ctx.lineWidth = 10 * (1 - t) + 2; ctx.beginPath(); ctx.ellipse(x, y, t * R, t * R * 0.5, 0, 0, TAU); ctx.stroke() } ctx.restore() }

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// SHOTS — each { d, cam?:(cam,c,opp,k)→, draw(ctx,E) }; E = { cw, ch, k (0..1), t (local frame), F (global), d, c, opp,
//   me/body/feet/head (caster screen points), foe (opponent screen point|null), z }
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const CAM_CASTER = (zoom = 2.4) => (cam, c, opp, k) => { cam.focusOnFighter(c, zoom * (0.8 + 0.2 * ease(k))); cam.targetY = (c.y || 0) + (c.h || 100) * 0.3 }
const CAM_FOE = (cam, c, opp) => { if (opp) { cam.focusOnFighter(opp, 1.6); cam.maxPanStep = 220 } else cam.focusOnFighter(c, 1.3) }

const focusShot = (d, cols, extra) => ({ d, cam: CAM_CASTER(2.5), draw: (ctx, E) => { aura(ctx, E, cols, ease(E.k)); extra?.(ctx, E) } })
const whipShot = (d = 18) => ({ d, cam: CAM_FOE, draw: (ctx, E) => {
  ctx.save(); ctx.globalAlpha = 0.55 * (1 - E.k); ctx.fillStyle = "#fff"; for (let i = 0; i < 30; i++) ctx.fillRect(0, hsh(i, E.t >> 1) * E.ch, E.cw, 1 + (i % 3)); ctx.restore()
  if (E.foe && E.t < 8) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - E.t / 8; glowBall(ctx, E.foe.x, E.foe.y, 60, "rgba(255,255,255,0.6)"); ctx.restore() } } })
const eyeShot = (d, pattern) => ({ d, cam: CAM_CASTER(2.8), draw: (ctx, E) => {
  if (["byakugan", "sharingan", "rinnegan", "kurama"].includes(pattern)) {   // these draw their own band
    ctx.save(); ctx.globalAlpha = E.k > 0.88 ? (1 - E.k) / 0.12 : 1; drawEye(ctx, E.cw, E.ch, pattern, clamp01(E.k * 1.4), E.F); ctx.restore()
  } else eyeBand(ctx, E.cw, E.ch, E.k, (x, y, h) => mangekyou(ctx, x, y, h * 0.3 * ease(clamp01(E.k * 3)), pattern, E.F))
} })
const itachiEyeShot = d => ({ d, cam: CAM_CASTER(2.8), draw: (ctx, E) => eyeBand(ctx, E.cw, E.ch, E.k, (x, y, h) => {   // the 19-frame Mangekyou awakening strip
  const fi = Math.min(18, Math.floor(E.k * 1.3 * 19))
  art(ctx, "itachi_mangekyou_eye_uniform.png", 1, 0, x, y, h * 2.1, { rect: { x: fi * 92, y: 0, w: 92, h: 86 } })
}) })
// a giant piece of art on a panel, easing from scale s0→s1 around a focal point (fx, fy in 0..1 of the frame)
const artPanel = (d, bg, a, { n = 1, frame = () => 0, s0 = 0.9, s1 = 1.2, fx = 0.5, fy = 0.5, flip = false, rise = 0, extra = null, behind = null, lines } = {}) => ({ d, cam: CAM_CASTER(2.2), draw: (ctx, E) =>
  panel(ctx, E.cw, E.ch, E.t, E.d, bg, () => {
    behind?.(ctx, E)
    const sc = s0 + (s1 - s0) * ease(E.k), h = E.ch * sc
    art(ctx, a, n, frame(E), E.cw * 0.5, E.ch * 0.5 + rise * E.ch * (1 - ease(clamp01(E.k * 1.6))), h, { ax: fx, ay: fy, flip })
    extra?.(ctx, E, h)
  }, { lines, focus: { x: E.cw * 0.5, y: E.ch * 0.5 } }) })

// ── the chakra-orbs lead-in (Naruto · Naruto Seventh): the nine beasts' chakra spirals into one — the real ult then shows the fox + the bomb ──
const BEAST_COLS = ["#d8b070", "#3a8aff", "#6ab0a0", "#ff4a2a", "#f0f0e0", "#c0e0a0", "#7cff3a", "#b06aff", "#ff8a1a"]
function tbbShots({ head, n, closed, open, mouth, flip = false, cols = BEAST_COLS, rim = "#ff8a1a", sphere, bg = ["#1a0600", "#3a1200", "#120400"], focusCols = ["#ff8a1a", "#ffe0a0"] }) {
  return [
    focusShot(34, focusCols),
    { d: 64, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#05000a", "#1a0a20", "#05000a"], () => {   // the chakra balls go into one another
      chakraOrbs(ctx, E.cw / 2, E.ch / 2, E.ch * 0.42, cols, E.k, E.F, E.ch / 420)
      if (E.k > 0.85) flash(ctx, E.cw, E.ch, (E.k - 0.85) / 0.15 * 0.5, "#fff3d8")
    }, { lines: "rgba(255,200,140,0.12)" }) },
    whipShot(16),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// THE STORYBOARDS — { shots, words, accent, ink, tint, pick?(c)→variant|null }; words at GLOBAL frames
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SEVENTH_HEAD = { head: "naruto_seventh_kurama_head_native_uniform.png", n: 2, closed: 0, open: 1, mouth: [0.93, 0.47], sphere: "naruto_seventh_bijuudama_sphere_uniform.png" }
const ORANGE = { accent: "#ff8a1a", ink: "#fff1dc", tint: "30,10,0" }

const BOARDS = {
  naruto: { ...ORANGE, shots: tbbShots(SEVENTH_HEAD),
    words: [[8, "九喇嘛モード", "KURAMA MODE"], [44, "尾獣", "TAILED BEAST CHAKRA"]] },
  naruto_seventh: { ...ORANGE, shots: tbbShots(SEVENTH_HEAD), pick: c => /bijuu/i.test(castOf(c)),
    words: [[8, "九喇嘛", "KURAMA"], [44, "尾獣", "TAILED BEAST CHAKRA"]] },
  minato: { accent: "#ffd23a", ink: "#fff6d8", tint: "30,24,0",
    shots: [
      focusShot(26, ["#ffd23a", "#fff6c0"]),
      { d: 54, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#0a0a14", "#1a1a30", "#0a0a14"], () => {   // Flying Thunder God: kunai, seals, yellow flashes
        for (let i = 0; i < 6; i++) { const at = i / 6; if (E.k < at) continue; const kk = clamp01((E.k - at) * 6), x = E.cw * (0.15 + 0.7 * hsh(i, 1)), y = E.ch * (0.2 + 0.6 * hsh(i, 2)), a = (hsh(i, 3) - 0.5) * 1.2
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = "#1a1a1a"; ctx.strokeStyle = "#9aa"; ctx.lineWidth = 2
          ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(10, -14); ctx.lineTo(-10, -14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(-3, -14, 6, 30); ctx.beginPath(); ctx.arc(0, 22, 7, 0, TAU); ctx.stroke()
          ctx.fillStyle = "#f4ecd0"; ctx.fillRect(-9, -8, 18, 26); ctx.fillStyle = "#8a1010"; ctx.font = "900 14px serif"; ctx.textAlign = "center"; ctx.fillText("雷", 0, 9); ctx.restore()
          if (kk < 0.5) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - kk * 2; glowBall(ctx, x, y, 50, "#ffd23a"); ctx.restore() } }
      }, { lines: "rgba(255,230,120,0.14)" }) },
      whipShot(14),
    ],
    words: [[8, "飛雷神", "FLYING THUNDER GOD"], [44, "黄色い閃光", "THE YELLOW FLASH"]] },
  tobi: { accent: "#ff6a1a", ink: "#ffeedd", tint: "30,6,0",
    shots: [
      focusShot(24, ["#ff6a1a", "#ffd0a0"]),
      { d: 40, cam: CAM_CASTER(2.8), draw: (ctx, E) => eyeBand(ctx, E.cw, E.ch, E.k, (x, y, h) => {   // the spiral mask, one Sharingan in the hole
        const r = h * 0.45; ctx.save(); ctx.fillStyle = "#ff7a1a"; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill(); ctx.strokeStyle = "#7a2a00"; ctx.lineWidth = 3
        ctx.beginPath(); for (let a = 0; a < 6 * TAU; a += 0.1) { const rr = r * 1.55 * (1 - a / (6 * TAU)); ctx.lineTo(x + Math.cos(a + E.F * 0.04) * rr, y + Math.sin(a + E.F * 0.04) * rr) } ctx.stroke()
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x + r * 0.5, y - r * 0.3, r * 0.42, 0, TAU); ctx.fill(); ctx.restore()
        mangekyou(ctx, x + r * 0.5, y - r * 0.3, r * 0.28 * ease(clamp01(E.k * 3)), "kamui", E.F)
      }) },
      whipShot(16),
    ],
    words: [[8, "仮面の男", "THE MASKED MAN"], [36, "口寄せの術", "SUMMONING JUTSU"]] },
  obito: { accent: "#e0e0e0", ink: "#f4f4f4", tint: "10,10,14",
    shots: [
      focusShot(24, ["#9a9aa0", "#e0e0e8"]),
      eyeShot(42, "rinnesharingan"),
      whipShot(16),
    ],
    words: [[8, "十尾の人柱力", "TEN-TAILS JINCHŪRIKI"], [30, "輪廻写輪眼", "RINNE SHARINGAN"]] },
  madara_tengai: { accent: "#c08aff", ink: "#f4eeff", tint: "12,6,24",
    shots: [
      focusShot(24, ["#6a8aff", "#dfe6ff"]),
      eyeShot(42, "rinnegan"),
      whipShot(16),
    ],
    words: [[8, "輪廻眼", "RINNEGAN"], [44, "天碍震星", "TENGAI SHINSEI"]] },
  madara_susanoo: { accent: "#5a8aff", ink: "#e8eeff", tint: "4,8,30", hideForm: true,
    pick: c => c.currentForm === "completeSusanoo" || (c._madaraComplete || 0) > 0,
    shots: [
      focusShot(24, ["#3a6aff", "#cfe0ff"]),
      eyeShot(40, "madara"),
      { d: 56, cam: CAM_CASTER(2.0), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#000208", "#06102a", "#000208"], () => {   // bones → flesh
        ctx.save(); ctx.globalCompositeOperation = "lighter"
        for (let i = 0; i < 14; i++) { ctx.globalAlpha = 0.35; flameTongue(ctx, E.cw * (0.1 + i * 0.062), E.ch, E.ch * (0.4 + 0.5 * hsh(i, E.t >> 3)) * ease(E.k), 30, Math.sin(E.F / 6 + i) * 14, E.F / 4 + i, i % 2 ? "#3a6aff" : "#9ac0ff") }
        ctx.restore()
        { ctx.save(); ctx.strokeStyle = "#7aa8ff"; ctx.lineWidth = 6; ctx.globalAlpha = 0.9; const r = clamp01(E.k * 1.3)   // the ribcage closing around him (the armour is revealed in the world)
          for (let i = 0; i < 6; i++) { const y = E.ch * (0.3 + i * 0.08); for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(E.cw / 2, y, E.ch * 0.25, s > 0 ? -0.2 : Math.PI + 0.2 - Math.PI * 0.8 * r, s > 0 ? -0.2 + Math.PI * 0.8 * r : Math.PI + 0.2); ctx.stroke() } } ctx.restore() }
      }, { lines: "rgba(120,160,255,0.15)" }) },
      whipShot(14),
    ],
    words: [[8, "万華鏡写輪眼", "MANGEKYŌ SHARINGAN"], [66, "完成体", "COMPLETE BODY"], [96, "須佐能乎", "SUSANOO"]] },
  pain: { accent: "#c08aff", ink: "#f4eeff", tint: "16,6,30",
    shots: [
      focusShot(24, ["#b07cff", "#f0e6ff"]),
      eyeShot(40, "rinnegan"),
      whipShot(14),
    ],
    words: [[8, "輪廻眼", "RINNEGAN"], [44, "地爆天星", "CHIBAKU TENSEI"]] },
  itachi: { accent: "#ff3a3a", ink: "#ffe8e8", tint: "30,2,4", hideForm: true,
    shots: [
      focusShot(24, ["#c01020", "#ff9a9a"]),
      itachiEyeShot(56),
      { d: 40, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#3a0004", "#8a0a10", "#2a0002"], () => crows(ctx, E.cw, E.ch, E.k, E.F, 34), { lines: "rgba(0,0,0,0.25)" }) },
      whipShot(14),
    ],
    words: [[8, "万華鏡写輪眼", "MANGEKYŌ SHARINGAN"], [84, "月読", "TSUKUYOMI"], [110, "須佐能乎", "SUSANOO"]] },
  sasuke: { accent: "#a07cff", ink: "#f0e8ff", tint: "14,4,30", hideForm: true, pick: c => (c._susanooStage || 0) === 1 && !isSasukeCinematicActive(),   // the 2nd press plays the Sharingan-awakening cinematic instead
    shots: [
      focusShot(24, ["#7a4aff", "#e0d0ff"]),
      eyeShot(44),
      whipShot(14),
    ],
    words: [[8, "万華鏡写輪眼", "MANGEKYŌ SHARINGAN"], [60, "須佐能乎", "SUSANOO"]] },
  jiraiya: { accent: "#ff6a3a", ink: "#fff0e0", tint: "24,10,4",
    pick: c => castOf(c) === "win" ? "gamabunta" : castOf(c) === "heavy" && c._jiraiyaHermit ? "odama" : null,
    variants: {
      gamabunta: { shots: [
        focusShot(24, ["#ff6a3a", "#ffd0a0"]),
        { d: 44, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#1a0e06", "#3a2210", "#1a0e06"], () => sealGlyphs(ctx, E.cw, E.ch, E.k, ["亥", "戌", "酉", "申", "未"]), { lines: "rgba(255,220,180,0.12)" }) },
        whipShot(14) ],
        words: [[8, "口寄せの術", "SUMMONING JUTSU"], [50, "ガマブン太", "GAMABUNTA"]] },
      odama: { shots: [
        focusShot(24, ["#ff6a3a", "#ffd0a0"]),
        eyeShot(40, "sage"),
        { d: 56, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#00081a", "#0a1a3a", "#00081a"], () => {   // the sphere spins up, bigger and bigger
          const h = E.ch * (0.3 + 0.8 * ease(E.k)); ctx.save(); ctx.translate(E.cw / 2, E.ch / 2); ctx.rotate(E.F * 0.25); art(ctx, "naruto_kcm_fx_tbb_charge.png", 1, 0, 0, 0, h); ctx.restore()
          ctx.save(); ctx.globalCompositeOperation = "lighter"; glowBall(ctx, E.cw / 2, E.ch / 2, h * 0.12, "#5ab0ff"); ctx.restore()
        }, { lines: "rgba(120,180,255,0.18)" }) },
        whipShot(14) ],
        words: [[8, "仙人モード", "SAGE MODE"], [66, "仙法", "SAGE ART"], [90, "超大玉螺旋丸", "GIANT RASENGAN"]] },
    } },
  kakashi: { accent: "#7ac8ff", ink: "#eef8ff", tint: "4,10,24",
    pick: c => /kakashiRaikiri/.test(castOf(c)),
    shots: [
      focusShot(22, ["#5ab0ff", "#e6f4ff"]),
      eyeShot(38, "sharingan"),
      whipShot(14) ],
    words: [[8, "写輪眼", "SHARINGAN"], [40, "雷切", "LIGHTNING BLADE"]] },
  kakashi_anbu: { accent: "#7ac8ff", ink: "#eef8ff", tint: "4,10,24",
    pick: c => c._kamuiRift && !/raikiri/.test(castOf(c)) ? "kamui" : null,   // Raikiri already has its own ANBU cut-in
    variants: {
      kamui: { shots: [
        focusShot(22, ["#5ab0ff", "#e6f4ff"]),
        eyeShot(40, "kamui"),
        { d: 50, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#000", "#100818", "#000"], () => art(ctx, "kakashi_war_kamui_swirl_uniform.png", 9, Math.min(8, Math.floor(E.k * 9)), E.cw / 2, E.ch / 2, E.ch * 0.95), { lines: "rgba(180,160,220,0.15)" }) },
        whipShot(14) ],
        words: [[8, "万華鏡写輪眼", "MANGEKYŌ SHARINGAN"], [64, "神威", "KAMUI"]] },
    } },
  kakashi_war: { accent: "#7ac8ff", ink: "#eef8ff", tint: "4,10,24",
    pick: c => /raikiri/.test(castOf(c)) ? null : c._perfectSusano ? "susanoo" : c._giftActive ? "gift" : null,   // Raikiri already has its own eye-banner cut-in
    variants: {
      gift: { shots: [
        focusShot(22, ["#5ab0ff", "#e6f4ff"]),
        { d: 52, cam: CAM_CASTER(2.8), draw: (ctx, E) => eyeBand(ctx, E.cw, E.ch, E.k, (x, y, h) => { for (const s of [-1, 1]) mangekyou(ctx, x + s * E.cw * 0.22, y, h * 0.22 * ease(clamp01(E.k * 3)), "kamui", E.F) }) },
        whipShot(14) ],
        words: [[8, "オビトの力", "OBITO'S GIFT"], [40, "両目の万華鏡", "TWIN MANGEKYŌ"]] },
      susanoo: { hideForm: true, shots: [
        focusShot(22, ["#5ab0ff", "#e6f4ff"]),
        { d: 52, cam: CAM_CASTER(2.8), draw: (ctx, E) => eyeBand(ctx, E.cw, E.ch, E.k, (x, y, h) => { for (const s of [-1, 1]) mangekyou(ctx, x + s * E.cw * 0.22, y, h * 0.22 * ease(clamp01(E.k * 3)), "kamui", E.F) }) },
        whipShot(14) ],
        words: [[8, "完成体", "PERFECT"], [46, "須佐能乎", "SUSANOO"]] },
    } },
  isshiki: { accent: "#e0d0ff", ink: "#f8f4ff", tint: "10,6,20",
    pick: c => castOf(c) === "isshikiUltCast",
    shots: [
      focusShot(22, ["#c0b0ff", "#ffffff"]),
      eyeShot(38, "rinnegan"),
      whipShot(14) ],
    words: [[8, "大筒木", "ŌTSUTSUKI"], [40, "大黒天", "DAIKOKUTEN"]] },
  shisui_fallen: { accent: "#4aff9a", ink: "#e8fff0", tint: "2,20,10",
    pick: c => castOf(c) === "finisher" && (c._flickGlareFx || 0) > 0 ? "shadows" : castOf(c) === "mangekyou" && c._kotoOverlay ? null : c._emeraldSusano ? "susanoo" : null,   // Koto has its own eye overlay
    variants: {
      shadows: { shots: [
        focusShot(20, ["#2aff8a", "#d8ffe8"]),
        eyeShot(36, "shisui"),
        whipShot(14) ],
        words: [[8, "瞬身", "BODY FLICKER"], [40, "千の影", "THOUSAND SHADOWS"]] },
      susanoo: { hideForm: true, shots: [
        focusShot(20, ["#2aff8a", "#d8ffe8"]),
        eyeShot(44, "shisui"),
        whipShot(14) ],
        words: [[8, "万華鏡写輪眼", "MANGEKYŌ SHARINGAN"], [54, "須佐能乎", "SUSANOO"]] },
    } },
  tobirama: { accent: "#7ac8ff", ink: "#eef8ff", tint: "4,10,24",
    shots: [
      focusShot(22, ["#5aa8ff", "#e0f0ff"]),
      { d: 56, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#06040a", "#1a1020", "#06040a"], () => sealGlyphs(ctx, E.cw, E.ch, E.k, ["寅", "巳", "戌", "辰"]), { lines: "rgba(200,180,255,0.12)" }) },
      whipShot(12) ],   // the coffin itself is NOT shown here — it breaks out of the ground in the real Edo Tensei sequence right after
    words: [[8, "禁術", "FORBIDDEN JUTSU"], [50, "穢土転生", "REANIMATION"]] },
  hashirama: { accent: "#ff4a3a", ink: "#ffeee8", tint: "24,4,2",
    shots: [
      focusShot(22, ["#3ac04a", "#d0ffc0"]),
      artPanel(48, ["#0a1206", "#1a3010", "#0a1206"], "hashirama_hand_signs_uniform.png", { n: 7, frame: E => Math.min(6, Math.floor(E.k * 7)), s0: 0.7, s1: 0.85, fy: 0.5, lines: "rgba(160,255,140,0.14)" }),
      whipShot(14) ],
    words: [[8, "初代火影", "THE FIRST HOKAGE"], [44, "封印術", "SEALING JUTSU"]] },
  // ── Demon Slayer: INOSUKE's new ultimate (abilities.executeInosukeUltimate) — same storyboard parts ──
  inosuke: { accent: "#7aa8d8", ink: "#eef4ff", tint: "6,10,20",
    shots: [
      focusShot(26, ["#6a8ab0", "#d8e6ff"], (ctx, E) => {   // the boar's breath: steam bursts from the mask
        ctx.save(); for (let i = 0; i < 10; i++) { const t = ((E.F * 0.04 + hsh(i, 1)) % 1); ctx.globalAlpha = (1 - t) * 0.5; ctx.fillStyle = "#f0f4ff"
          const hx = E.body.x + (E.c.facing || 1) * (14 + 70 * t) * E.z * 0.6, hy = E.body.y - 40 * E.z * 0.6 - 30 * t * E.z * 0.6; ctx.beginPath(); ctx.arc(hx, hy, (6 + 20 * t) * E.z * 0.4, 0, TAU); ctx.fill() } ctx.restore() }),
      { d: 54, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#0a0e18", "#1c2a40", "#0a0e18"], () => {   // the twin jagged blades cross
        const k = ease(clamp01(E.k * 1.6)), L = E.ch * 0.62, cx0 = E.cw / 2, cy0 = E.ch / 2
        jaggedBlade(ctx, cx0 - E.cw * 0.5 * (1 - k) - L * 0.45, cy0 + L * 0.45, -0.78, L, E.ch * 0.06)
        jaggedBlade(ctx, cx0 + E.cw * 0.5 * (1 - k) + L * 0.45, cy0 + L * 0.45, -Math.PI + 0.78, L, E.ch * 0.06)
        if (E.k > 0.6) { ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 14; i++) { const a = hsh(i, 2) * TAU, r = (E.k - 0.6) * E.ch * (0.6 + hsh(i, 3)); ctx.globalAlpha = 1 - (E.k - 0.6) / 0.4; ctx.fillStyle = i % 2 ? "#fff" : "#a8c8ff"; ctx.fillRect(cx0 + Math.cos(a) * r, cy0 - E.ch * 0.08 + Math.sin(a) * r, 4, 4) } ctx.restore() }
        if (E.k > 0.6 && E.k < 0.7) flash(ctx, E.cw, E.ch, (0.7 - E.k) * 6)
      }, { lines: "rgba(170,200,255,0.16)" }) },
      whipShot(14) ],
    words: [[8, "獣の呼吸", "BEAST BREATHING"], [34, "捌ノ型", "EIGHTH FORM"], [64, "爆裂猛進", "EXPLOSIVE RUSH"]] },
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// SCRIPT FACTORY — turns a board (or one of its variants) into a pre-roll script for the engine
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function compile(base, v) {
  const shots = v.shots, starts = []; let T = 0
  for (const s of shots) { starts.push(T); T += s.d }
  const at = f => { let i = shots.length - 1; while (i > 0 && f < starts[i]) i--; return i }
  return {
    total: T, accent: base.accent, ink: base.ink, tint: base.tint, words: v.words || base.words, restoreCast: true,
    camera(cam, c, opp, f) { const i = at(f), s = shots[i], k = clamp01((f - starts[i]) / s.d); (s.cam || CAM_CASTER(2.2))(cam, c, opp, k)
      if (cam.shake && f === starts[i] && i > 0) cam.shake(6, 6) },
    draw(ctx, cw, ch, f, c, cam, cine) {
      const i = at(f), s = shots[i], t = f - starts[i], opp = cine?.opponent
      const body = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100) * 0.5), feet = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100))
      const foe = opp ? toScreen(cam, cw, ch, cx(opp), (opp.y || 0) + (opp.h || 100) * 0.5) : null
      ctx.save(); try { s.draw(ctx, { cw, ch, k: clamp01(t / s.d), t, F: f, d: s.d, c, opp, body, feet, foe, z: body.z }) } finally { ctx.restore() }
      if (t < 3 && i > 0) flash(ctx, cw, ch, 0.35 * (1 - t / 3))   // a cut
    },
  }
}
let _chosen = null
function registerBoard(key, B) {
  const variantOf = c => { if (!B.pick) return B; const v = B.pick(c); if (!v) return null; return v === true ? B : (B.variants?.[v] || null) }
  const base = compile(B, B.variants ? Object.values(B.variants)[0] : B)
  registerUltPreroll(key, {
    ...base,
    pick: c => { const v = variantOf(c); _chosen = v ? { ...compile(B, v), hideForm: !!(v.hideForm || B.hideForm) } : null; return _chosen ? { words: _chosen.words } : null },
    onStart(c, cine) {
      if (!_chosen) return
      cine.S = { ...cine.S, ..._chosen, pick: cine.S.pick, onStart: cine.S.onStart, onEnd: cine.S.onEnd }
      // a transformation ult has already swapped in the giant form: show the base body until the storyboard's reveal is over
      if (_chosen.hideForm) { cine.mem.formSkin = c._skinAnim; cine.mem.formKey = c.rosterKey; cine.mem.hid = true; c._skinAnim = null }
    },
    onEnd(c, cine) {   // put the form back ONLY if nothing else re-skinned / swapped the fighter meanwhile (e.g. an Edo Tensei revert)
      if (cine.mem?.hid && c._skinAnim == null && c.rosterKey === cine.mem.formKey) c._skinAnim = cine.mem.formSkin
      if (cine.mem) cine.mem.hid = false
    },
  })
}
for (const [k, B] of Object.entries(BOARDS)) registerBoard(k, B)

// Play `key`'s storyboard first, then `run()` (the ult's own freeze cinematic). No storyboard → run() now (unchanged).
export function deferNarutoUlt(key, fighter, opponent, run) {
  if (!startDemonSlayerPreroll(key, fighter, opponent, { then: run })) run()
}
export const NARUTO_STORYBOARDS = Object.keys(BOARDS)

// the storyboard toolkit, shared with the other universes' openers (hxhStoryboard.js, dbStoryboard.js)
export const SB_KIT = { TAU, clamp01, castOf, art, panel, speedLines, glowBall, chakraOrbs, bijuuSphere, aura, eyeBand, mangekyou, lightningBall, crows,
  sealGlyphs, flash, rings, focusShot, whipShot, eyeShot, artPanel, CAM_CASTER, CAM_FOE, registerBoard }
