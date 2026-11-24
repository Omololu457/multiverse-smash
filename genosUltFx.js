// genosUltFx.js — RENDER-ONLY half of Genos's OVERDRIVE — INCINERATION CANNON cinematic (genosUlt.js). One screen pass
// (cineRegistry overlay slot, identity transform, device pixels) that owns the picture while the cinematic runs; world →
// screen from camera.js's live transform; both fighters drawn here from their real sheets (engine sprites hidden with
// _fxAlpha = 0). Layers: dim → floor FX (scorched trench) → the fighters → armour panels / core / steam / flame aura →
// charge (embers, palm glow, heat-haze) → the incineration beam (+ the foe silhouetted inside it) → a re-blit punch-in →
// the cyborg HUD (system readout, OVERDRIVE title, target-lock reticle, INCINERATION CANNON band) → flashes → letterbox +
// subtitles. Returns true while active (hides the battle HUD). Pure functions of the scene's frames; noise = integer hash.
import { opmKit } from './saitamaUltFx.js'

const { image, ready, hash, clamp, smooth, outE, animOf, sprite, view, punchIn, subtitle, star, calmMotion, calmFlash } = opmKit
const T = { lockAt: 40, chargeAt: 80, titleAt: 96, beamAt: 140, beamEnd: 200, outAt: 232, surges: [144, 158, 172, 188] }
const OR = '#ff8a1e', YE = '#ffd23a'
const BODY = 112   // Genos's on-screen body height in world px (spriteScale 1.62 × 69)

export function preloadGenosUlt(f, t) {
  for (const k of ['idle', 'heavy', 'genosOverdrive']) { const a = animOf(f, k); if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = animOf(t, k); if (a?.sheet) image(a.sheet) }
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function glow(ctx, x, y, r, inner, outer, a = 1) {
  if (r <= 0 || a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
function steam(ctx, x, y, z, age, seed, dirX = 0, a0 = 1) {   // a jet of steam from a vent, `age` frames old
  if (age < 0 || age > 60 || calmMotion()) return
  ctx.save()
  for (let i = 0; i < 10; i++) {
    const ph = ((age * 1.4 + i * 6) % 60) / 60, px = x + (dirX * 40 + (hash(seed, i) - 0.5) * 24) * ph * z * 1.6, py = y - ph * (70 + hash(seed, i + 9) * 40) * z
    ctx.globalAlpha = a0 * (1 - ph) * 0.55 * (1 - age / 60); ctx.fillStyle = '#eef2f6'
    ctx.beginPath(); ctx.arc(px, py, (4 + ph * 20) * z, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
// armour panels: hinge open (u 0→1), glowing seams beneath
function panels(ctx, x, feetY, z, dir, u, real) {
  if (u <= 0) return
  const P = [[-15, 88, -1], [15, 88, 1], [-21, 70, -1], [21, 70, 1], [-dir * 6, 80, -dir], [-17, 56, -1], [17, 56, 1]]
  for (let i = 0; i < P.length; i++) {
    const [ox, oy, side] = P[i], px = x + ox * z, py = feetY - oy * z, open = clamp(u * 1.4 - i * 0.06, 0, 1)
    glow(ctx, px, py, (10 + 8 * open) * z, 'rgba(255,240,200,0.95)', 'rgba(255,120,20,0.6)', open * (0.7 + 0.3 * Math.sin(real * 0.4 + i)))
    ctx.save(); ctx.translate(px + side * 4 * z * open, py - 3 * z * open); ctx.rotate(side * open * 0.9)
    ctx.fillStyle = '#9aa3ad'; ctx.fillRect(0, -4 * z, side * 11 * z, 7 * z)
    ctx.fillStyle = '#dfe5ea'; ctx.fillRect(0, -4 * z, side * 11 * z, 2 * z)
    ctx.strokeStyle = '#2b2f35'; ctx.lineWidth = Math.max(1, z); ctx.strokeRect(0, -4 * z, side * 11 * z, 7 * z)
    ctx.restore()
  }
}
function flameAura(ctx, x, feetY, z, a, real) {   // flickering overdrive flame tongues licking up around him
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 22; i++) {
    const ph = ((real * (1.1 + hash(i, 2) * 0.8) + hash(i, 3) * 30) % 30) / 30, px = x + (hash(i, 4) - 0.5) * 56 * z, py = feetY - 14 * z - ph * (BODY + 50) * z
    const r = (7 + hash(i, 5) * 9) * (1 - ph * 0.7) * z
    ctx.globalAlpha = a * (1 - ph) * 0.42; ctx.fillStyle = ph < 0.35 ? YE : OR
    ctx.beginPath(); ctx.ellipse(px, py, r * 0.7, r * 1.4, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function scanlines(ctx, W, H, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#000'
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
  ctx.restore()
}
function hudText(ctx, lines, x, y, H, k0, k, col = OR) {   // typed-out system readout
  const fs = Math.round(H * 0.026)
  ctx.save(); ctx.font = `700 ${fs}px "SF Mono", Menlo, Consolas, monospace`; ctx.textBaseline = 'top'; ctx.textAlign = 'left'
  let typed = Math.max(0, (k - k0) * 3)
  lines.forEach((ln, i) => {
    if (typed <= 0) return
    const s = ln.slice(0, typed); typed -= ln.length + 4
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 6, y + i * fs * 1.45 - 3, ctx.measureText(s).width + 12, fs * 1.3)
    ctx.fillStyle = i === lines.length - 1 ? '#ffffff' : col; ctx.fillText(s, x, y + i * fs * 1.45)
  })
  ctx.restore()
}
function techTitle(ctx, W, H, text, sub, u, y = 0.5, fsK = 0.12) {   // glitchy chromatic HUD title in a hard-edged band
  const inU = clamp(u / 0.12, 0, 1), outU = clamp((u - 0.86) / 0.14, 0, 1), bh = H * 0.16 * outE(inU) * (1 - outU)
  if (bh <= 1) return
  const by = H * y
  ctx.save()
  ctx.fillStyle = 'rgba(12,8,4,0.9)'; ctx.fillRect(0, by - bh / 2, W, bh)
  ctx.fillStyle = OR; ctx.fillRect(0, by - bh / 2, W, Math.max(2, H * 0.004)); ctx.fillRect(0, by + bh / 2 - Math.max(2, H * 0.004), W, Math.max(2, H * 0.004))
  ctx.globalAlpha = 0.4; for (let i = 0; i < 26; i++) ctx.fillRect((i / 26) * W, by - bh / 2 + 6, W * 0.012, 3)
  ctx.globalAlpha = 1
  const punch = 1 + Math.max(0, 1 - u / 0.05) * 0.5, fs = Math.round(H * fsK * punch)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const gl = calmMotion() ? 0 : (hash(Math.floor(u * 60), 3) < 0.25 ? fs * 0.06 : fs * 0.015)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = 'rgba(255,40,20,0.85)'; ctx.fillText(text, W / 2 - gl, by)
  ctx.fillStyle = 'rgba(40,200,255,0.7)'; ctx.fillText(text, W / 2 + gl, by)
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = YE; ctx.fillText(text, W / 2, by)
  if (sub) { ctx.font = `700 ${Math.round(H * 0.024)}px "SF Mono", Menlo, monospace`; ctx.fillStyle = '#ffffff'; ctx.fillText(sub, W / 2, by + fs * 0.62) }
  ctx.restore()
}
function reticle(ctx, x, y, H, u, real, locked) {   // the target lock: brackets close in, a rotating ring, crosshair
  const R = H * (0.3 - 0.15 * outE(u)), col = locked ? '#ff3b2f' : OR, lw = Math.max(2, H * 0.004)
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw
  ctx.translate(x, y)
  ctx.save(); ctx.rotate((1 - outE(u)) * 1.6)
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.beginPath(); ctx.moveTo(R, R - R * 0.35); ctx.lineTo(R, R); ctx.lineTo(R - R * 0.35, R); ctx.stroke(); ctx.restore() }
  ctx.restore()
  ctx.save(); ctx.rotate(real * 0.05); ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2); ctx.setLineDash([R * 0.12, R * 0.08]); ctx.stroke(); ctx.restore()
  ctx.beginPath(); ctx.moveTo(-R * 0.4, 0); ctx.lineTo(-R * 0.12, 0); ctx.moveTo(R * 0.12, 0); ctx.lineTo(R * 0.4, 0); ctx.moveTo(0, -R * 0.4); ctx.lineTo(0, -R * 0.12); ctx.moveTo(0, R * 0.12); ctx.lineTo(0, R * 0.4); ctx.stroke()
  if (locked) { ctx.globalAlpha = 0.5 + 0.5 * ((real >> 2) & 1); ctx.beginPath(); ctx.arc(0, 0, R * 0.06, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
// the incineration beam from (x0, y) to (x1, y), radius r (screen px)
function beam(ctx, W, H, x0, x1, y, r, real, a) {
  if (r <= 1 || a <= 0) return
  const L = Math.min(x0, x1), Rr = Math.max(x0, x1), dir = x1 >= x0 ? 1 : -1
  ctx.save(); ctx.globalAlpha = a
  // turbulent flame skirt along both edges
  ctx.globalCompositeOperation = 'lighter'
  const step = Math.max(14, r * 0.45)
  for (let s = 0, i = 0; s < Rr - L + step; s += step, i++) {
    const px = x0 + dir * s, fl = hash(i, real >> 1), off = (hash(i, (real >> 1) + 7) - 0.5) * r * 0.5
    ctx.fillStyle = 'rgba(255,90,20,0.30)'; ctx.beginPath(); ctx.ellipse(px, y + off, step * 1.4, r * (1.25 + fl * 0.55), 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,170,40,0.25)'; ctx.beginPath(); ctx.ellipse(px + dir * step * 0.5, y - off * 0.5, step * 1.1, r * (0.95 + fl * 0.3), 0, 0, Math.PI * 2); ctx.fill()
  }
  // the column: orange → yellow → white core
  const g = ctx.createLinearGradient(0, y - r, 0, y + r)
  g.addColorStop(0, 'rgba(255,80,10,0)'); g.addColorStop(0.18, 'rgba(255,110,20,0.85)'); g.addColorStop(0.36, 'rgba(255,210,70,0.95)')
  g.addColorStop(0.5, 'rgba(255,255,245,1)'); g.addColorStop(0.64, 'rgba(255,210,70,0.95)'); g.addColorStop(0.82, 'rgba(255,110,20,0.85)'); g.addColorStop(1, 'rgba(255,80,10,0)')
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(L, y - r, Rr - L, r * 2)
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(L, y - r * 0.16, Rr - L, r * 0.32)
  // flowing streaks inside the column
  for (let i = 0; i < 26; i++) {
    const ph = ((real * 9 + hash(i, 3) * 900) % 900) / 900, sx = x0 + dir * ph * (Rr - L), sy = y + (hash(i, 4) - 0.5) * r * 1.3, len = 60 + hash(i, 5) * 160
    ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#fff7d0'; ctx.fillRect(dir > 0 ? sx : sx - len, sy, len, 2 + hash(i, 6) * 3)
  }
  ctx.restore()
}
function heatHaze(ctx, canvas, W, H, y0, y1, real, amp) {   // re-blit row strips with a sine wobble (real refraction)
  if (calmMotion() || amp <= 0) return
  y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H, Math.ceil(y1)); if (y1 - y0 < 8) return
  const S = hazeScratch(W, y1 - y0); S.g.clearRect(0, 0, W, y1 - y0); S.g.drawImage(canvas, 0, y0, W, y1 - y0, 0, 0, W, y1 - y0)
  ctx.save()
  for (let y = 0; y < y1 - y0; y += 6) { const dx = Math.sin(y * 0.09 + real * 0.35) * amp; ctx.drawImage(S.cv, 0, y, W, 6, dx, y0 + y, W, 6) }
  ctx.restore()
}
let _hz = null
function hazeScratch(W, h) { if (!_hz) { const cv = document.createElement('canvas'); _hz = { cv, g: cv.getContext('2d') } }
  if (_hz.cv.width !== W || _hz.cv.height < h) { _hz.cv.width = W; _hz.cv.height = Math.max(h, _hz.cv.height) } return _hz }

// ── THE SCREEN PASS ──────────────────────────────────────────────────────────────────────────────────────────────────
export function drawGenosUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  const gp = V.p(f.x + (f.w || 48) / 2, S.floor), gx = gp.x, gy = gp.y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the world dims to the cyborg's tunnel vision (warmer and darker as the cannon charges)
  const dim = k < T.beamAt ? 0.25 + 0.3 * smooth(k / T.beamAt) : k < T.beamEnd ? 0.15 : 0.3 * clamp((T.outAt + 10 - k) / 30, 0, 1)
  ctx.save(); ctx.fillStyle = k < T.chargeAt ? '#05080c' : '#120500'; ctx.globalAlpha = dim; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore()

  // 2) floor: the scorched trench the beam leaves (aftermath)
  const beamY = gy - 72 * z
  const endW = V.p(S.beamEndX, 0).x
  if (k >= T.beamAt + 4) {
    const a = k < T.outAt ? 1 : clamp(1 - (k - T.outAt) / 16, 0, 1), L = Math.min(gx + dir * 30 * z, endW), Rr = Math.max(gx + dir * 30 * z, endW)
    ctx.save(); ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#140a05'; ctx.beginPath(); ctx.ellipse((L + Rr) / 2, gy + 2, (Rr - L) / 2, 9 * z, 0, 0, Math.PI * 2); ctx.fill()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 60; i++) { const ex = L + hash(i, 31) * (Rr - L), fl = 0.5 + 0.5 * Math.sin(S.real * 0.3 + i)
      ctx.globalAlpha = a * fl * 0.8; ctx.fillStyle = i % 3 ? OR : YE; ctx.fillRect(ex, gy - 2 + (hash(i, 32) - 0.5) * 10 * z, 3 + hash(i, 33) * 5, 2) }
    ctx.restore()
  }

  // 3) the fighters (real sheets)
  const tp = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94))
  const inBeam = k >= T.beamAt && k < T.beamEnd + 6
  drawFoe(ctx, S, z, k, tp, inBeam)
  const auraA = k < 30 ? 0 : k < T.beamEnd ? smooth((k - 30) / 20) : clamp(1 - (k - T.beamEnd) / 20, 0, 1)
  flameAura(ctx, gx, gy, z, auraA, S.real)
  const G = drawGenos(ctx, S, z, k, gx, gy)
  const palm = G ? { x: G.front + dir * 2, y: G.top + G.h * 0.3 } : { x: gx + dir * 40 * z, y: gy - 80 * z }

  // 4) armour panels / core / steam / flame aura
  const panelU = k < 10 ? 0 : k < 212 ? smooth((k - 10) / 18) : clamp(1 - (k - 212) / 16, 0, 1)
  panels(ctx, gx, gy, z, dir, panelU, S.real)
  const coreA = k < 4 ? 0 : k < 36 ? smooth((k - 4) / 28) : k < T.beamEnd ? 0.75 + 0.25 * Math.sin(S.real * 0.5) : clamp(1 - (k - T.beamEnd) / 30, 0, 1) * 0.6
  glow(ctx, gx, gy - 74 * z, (12 + 30 * coreA + (k >= 30 && k < 40 ? 70 * (1 - (k - 30) / 10) : 0)) * z, 'rgba(255,255,255,1)', 'rgba(255,150,40,0.75)', coreA)
  if (k >= 24) { steam(ctx, gx - 16 * z, gy - 92 * z, z, k - 24, 1, -1); steam(ctx, gx + 16 * z, gy - 92 * z, z, k - 26, 2, 1); steam(ctx, gx - dir * 10 * z, gy - 80 * z, z, k - 28, 3, -dir) }
  if (k >= 204) { steam(ctx, palm.x, palm.y, z, k - 204, 7, dir * 0.3, 1.3); steam(ctx, gx - 18 * z, gy - 72 * z, z, k - 208, 8, -1); steam(ctx, gx + 18 * z, gy - 72 * z, z, k - 210, 9, 1) }

  // 5) the charge: embers spiralling into the palm, the palm sun, heat-haze
  if (k >= T.chargeAt && k < T.beamAt + 2) {
    const u = smooth((k - T.chargeAt) / (T.beamAt - T.chargeAt))
    if (!calmMotion()) { ctx.save(); ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 34; i++) { const ph = ((S.real * (1 + hash(i, 1)) + hash(i, 2) * 50) % 50) / 50, an = hash(i, 3) * Math.PI * 2 + ph * 3, d = (1 - ph) * (220 * z)
        ctx.globalAlpha = u * ph; ctx.fillStyle = i % 2 ? YE : OR; ctx.fillRect(palm.x + Math.cos(an) * d, palm.y + Math.sin(an) * d * 0.7, 3 + ph * 3, 3 + ph * 3) }
      ctx.restore() }
    glow(ctx, palm.x, palm.y, (12 + 50 * u) * z * (1 + 0.08 * Math.sin(S.real * 0.9)), 'rgba(255,255,255,1)', 'rgba(255,170,40,0.85)', 0.5 + 0.5 * u)
    heatHaze(ctx, canvas, W, H, palm.y - 160 * z, palm.y + 40 * z, S.real, 2 + 4 * u)
  }

  // 6) THE CANNON
  if (k >= T.beamAt && k < T.beamEnd + 16) {
    const kb = k - T.beamAt, grow = outE(kb / 6), fade = k < T.beamEnd ? 1 : clamp(1 - (k - T.beamEnd) / 16, 0, 1)
    const surge = T.surges.reduce((m, s) => Math.max(m, k >= s && k < s + 8 ? 1 - (k - s) / 8 : 0), 0)
    const r = (k < T.beamEnd ? (70 + 22 * surge + 6 * Math.sin(S.real * 0.8)) * grow : 70 * fade * fade) * z
    const x1 = palm.x + dir * Math.max(W * 1.6, Math.abs(endW - palm.x))
    heatHaze(ctx, canvas, W, H, palm.y - r * 3.2, palm.y - r * 1.1, S.real, 6 * fade)
    beam(ctx, W, H, palm.x, x1, palm.y, r, S.real, fade)
    glow(ctx, palm.x, palm.y, (60 + 30 * surge) * z * grow, 'rgba(255,255,255,1)', 'rgba(255,150,40,0.85)', fade)
    drawGenos(ctx, S, z, k, gx, gy)   // Genos stays readable at the mouth of his own cannon
    // the foe, silhouetted white-hot inside the column
    if (inBeam) sprite(ctx, t, ['hurt', 'idle'], 9, tp.x + (calmMotion() ? 0 : (hash(S.real, 5) - 0.5) * 8), tp.y, z, -dir, { tint: '#fff1c0', tintA: 0.75, alpha: 0.85 * fade })
    glow(ctx, tp.x, palm.y, (110 + 90 * surge) * z, 'rgba(255,255,240,0.9)', 'rgba(255,120,20,0.6)', fade * (0.5 + 0.5 * surge))
    // sparks
    if (!calmMotion()) { ctx.save(); ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 30; i++) { const ph = ((S.real * 1.5 + hash(i, 41) * 30) % 30) / 30, an = -Math.PI / 2 + (hash(i, 42) - 0.5) * 2.6
        const sx = tp.x + Math.cos(an) * ph * 200 * z, sy = palm.y + Math.sin(an) * ph * 160 * z + ph * ph * 60 * z
        ctx.globalAlpha = fade * (1 - ph); ctx.fillStyle = i % 2 ? YE : '#ffffff'; ctx.fillRect(sx, sy, 3, 3) }
      ctx.restore() }
  }
  // smoke columns rising along the trench (aftermath)
  if (k >= T.beamEnd - 6 && !calmMotion()) {
    const a = clamp((k - T.beamEnd + 6) / 10, 0, 1) * clamp((T.outAt + 16 - k) / 20, 0, 1)
    ctx.save()
    for (let i = 0; i < 16; i++) { const sx = palm.x + dir * (40 + i * 70) * z, ph = ((k - T.beamEnd + i * 4) % 50) / 50
      for (let j = 0; j < 3; j++) { const py = gy - (ph + j * 0.3) % 1 * 220 * z, pr = (12 + ((ph + j * 0.3) % 1) * 40) * z
        ctx.globalAlpha = a * 0.35 * (1 - (ph + j * 0.3) % 1); ctx.fillStyle = '#5b5550'; ctx.beginPath(); ctx.arc(sx + Math.sin(py * 0.05 + i) * 10 * z, py, pr, 0, Math.PI * 2); ctx.fill() } }
    ctx.restore()
  }

  // 7) a real punch-in (camera.js caps zoom ≈1.15)
  if (k < T.lockAt) punchIn(ctx, canvas, W, H, gx, gy - 74 * z, 1 + 0.3 * smooth(k / 20))
  else if (k >= 110 && k < T.beamAt) punchIn(ctx, canvas, W, H, palm.x, palm.y, 1 + 0.35 * smooth((k - 110) / 26))

  // 8) the cyborg HUD
  scanlines(ctx, W, H, k < T.beamAt ? 0.12 : 0.06)
  if (k < T.lockAt + 6) hudText(ctx, ['> DR. KUSENO COMBAT CHASSIS v.7', '> LIMITERS ........ DISENGAGED', '> CORE OUTPUT ..... 100% → 135%', '> COOLANT VENTS ... OPEN', 'OVERDRIVE'], W * 0.05, H * 0.16, H, 4, k)
  if (k >= 22 && k < T.lockAt + 4) techTitle(ctx, W, H, 'OVERDRIVE', 'CORE OUTPUT MAXIMUM', (k - 22) / (T.lockAt + 4 - 22), 0.74, 0.14)
  if (k >= T.lockAt && k < T.beamAt) {
    const u = clamp((k - T.lockAt) / 22, 0, 1), locked = k >= T.lockAt + 22
    const ty = tp.y - 56 * z, a = k < T.chargeAt ? 1 : clamp(1 - (k - T.chargeAt) / 14, 0, 1)
    ctx.save(); ctx.globalAlpha = a
    reticle(ctx, tp.x, ty, H, u, S.real, locked)
    if (k < T.lockAt + 26) { const sy = ty - H * 0.12 + ((k - T.lockAt) / 26) * H * 0.24; ctx.fillStyle = 'rgba(255,138,30,0.5)'; ctx.fillRect(tp.x - H * 0.1, sy, H * 0.2, 2) }
    hudText(ctx, locked ? ['TARGET LOCKED', `DIST ${String(Math.abs(Math.round(S.tx0 - S.fx0))).padStart(4, '0')}  ·  THREAT: DEMON`, 'INCINERATION CANNON ARMED'] : ['ACQUIRING…'], (tp.x + H * 0.62 > W ? tp.x - H * 0.75 : tp.x + H * 0.13), ty - H * 0.08, H, T.lockAt + (locked ? 22 : 0), k, '#ff5a3a')
    ctx.restore()
  }
  if (k >= T.titleAt && k < 134) techTitle(ctx, W, H, 'INCINERATION CANNON', 'FULL OUTPUT', (k - T.titleAt) / (134 - T.titleAt), 0.22, 0.11)
  // the damage readout
  if (S.dmg > 0 && k >= T.surges[0] && k < T.outAt + 10) {
    const fs = Math.round(H * 0.075), a = clamp((T.outAt + 10 - k) / 12, 0, 1)
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const nx = clamp(tp.x, W * 0.12, W * 0.88), ny = clamp(tp.y - 150 * z, H * 0.2, H * 0.8)
    ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#2a0800'; ctx.strokeText(String(S.dmg), nx, ny); ctx.fillStyle = S.blocked ? '#ffe08a' : '#ff6a1e'; ctx.fillText(String(S.dmg), nx, ny); ctx.restore()
  }
  if (k >= 214 && k < T.outAt + 12) techTitle(ctx, W, H, 'OVERDRIVE ENGAGED', '5.0 s  ·  ×1.35 OUTPUT  ·  OVERHEAT ON EXPIRY', (k - 214) / (T.outAt + 12 - 214), 0.8, 0.07)
  ctx.restore()

  // 9) flashes (steady, full screen)
  if (!calmFlash()) {
    if (k >= T.beamAt && k < T.beamAt + 3) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) }
    else if (k >= T.beamAt + 3 && k < T.beamAt + 20) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * (1 - (k - T.beamAt - 3) / 17); ctx.fillStyle = '#ff8a1e'; ctx.fillRect(0, 0, W, H); ctx.restore() }
    const last = T.surges[T.surges.length - 1]
    if (held && k === last) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = S.hold > 14 ? 1 : 0; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore() }
  }
  // 10) letterbox + subtitles
  const lbIn = clamp(S.real / 10, 0, 1), lbOut = k >= T.outAt ? clamp(1 - (k - T.outAt) / 14, 0, 1) : 1, bar = H * 0.12 * Math.min(lbIn, lbOut)
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  if (k >= 6 && k < 46) subtitle(ctx, W, H, 'GENOS', 'Absolutely everything that I have!', Math.min((k - 6) / 5, (46 - k) / 6))
  else if (k >= 46 && k < 84) subtitle(ctx, W, H, 'GENOS', 'Engaging target!', Math.min((k - 46) / 5, (84 - k) / 6))
  else if (k >= 122 && k < 152) subtitle(ctx, W, H, 'GENOS', 'Incinerate!', Math.min((k - 122) / 4, (152 - k) / 6))
  return true
}

// ── the fighters ─────────────────────────────────────────────────────────────────────────────────────────────────────
function drawGenos(ctx, S, z, k, x, feetY) {
  const f = S.caster, dir = S.dir
  let keys = ['idle'], fr = (S.real >> 3) % 4
  if (k < T.lockAt) { keys = ['genosOverdrive', 'idle']; fr = Math.min(5, Math.floor(k / 7)) }
  else if (k < T.chargeAt) { keys = ['heavy', 'idle']; fr = 0 }
  else if (k < 100) { keys = ['heavy', 'idle']; fr = 1 }
  else if (k < T.beamEnd + 4) { keys = ['heavy', 'idle']; fr = 2 }
  else if (k < 216) { keys = ['heavy', 'idle']; fr = 5 }
  // recoil on the surges: a shove back along the beam's axis
  const rec = T.surges.reduce((m, s) => Math.max(m, k >= s && k < s + 6 ? 1 - (k - s) / 6 : 0), 0)
  return sprite(ctx, f, keys, fr, x - dir * rec * 6 * z, feetY, z, dir)
}
function drawFoe(ctx, S, z, k, tp, inBeam) {
  const t = S.target, fdir = -S.dir
  if (k < T.beamAt) { sprite(ctx, t, S.blocked ? ['guard', 'idle'] : (k > T.chargeAt + 30 ? ['hurt', 'idle'] : ['idle']), S.blocked ? 9 : 0, tp.x, tp.y, z, fdir); return }
  if (inBeam) { sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir)
  if (!S.blocked && !calmMotion()) { ctx.save(); for (let i = 0; i < 6; i++) { const ph = ((S.real + i * 9) % 54) / 54; ctx.globalAlpha = 0.4 * (1 - ph); ctx.fillStyle = '#6e6862'
    ctx.beginPath(); ctx.arc(tp.x + (hash(i, 3) - 0.5) * 50 * z, tp.y - 20 * z - ph * 110 * z, (6 + ph * 18) * z, 0, Math.PI * 2); ctx.fill() } ctx.restore() }
}
void star
