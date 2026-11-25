// flashUltFx.js — RENDER-ONLY half of the FLASH TIME activation cinematic (flashUlt.js). One screen pass (cineRegistry
// overlay, identity transform, device pixels): red / gold speed-force lightning, the time-ripple, the world outside his
// speed-force bubble drained to grey and stopped (the finished frame is copied, greyed, and his bubble is cut back in at
// full colour), suspended dust and embers, the lightning strike, title, letterbox + subtitle. Flash himself is the engine's
// own sprite in his real spin-up pose. Pure functions of the activation frame + a real-frame counter; noise = integer hash.
import { dcKit } from './soldierBoyUltFx.js'

const { image, hash, clamp, smooth, outE, calmMotion, calmFlash, view, speedLines, title, subtitle, letterbox, glow, ring, grade, caption } = dcKit
const PORTRAIT = './flash_portrait.png'
const T = { push: 45, burst: 105, end: 150, voAt: 112 }

let _cp = null
function copyCanvas(W, H) { if (!_cp) { const cv = document.createElement('canvas'); _cp = { cv, g: cv.getContext('2d') } }
  if (_cp.cv.width !== W || _cp.cv.height !== H) { _cp.cv.width = W; _cp.cv.height = H } return _cp }

function bolt(c, x0, y0, x1, y1, seed, w, col, a, jag = 0.18) {   // a jagged lightning polyline (seeded)
  if (a <= 0) return
  const n = 9, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(a, 0, 1); c.lineJoin = 'miter'; c.lineCap = 'round'
  const pts = [[x0, y0]]
  for (let i = 1; i < n; i++) { const u = i / n, off = (hash(seed, i) - 0.5) * L * jag; pts.push([x0 + dx * u + nx * off, y0 + dy * u + ny * off]) }
  pts.push([x1, y1])
  for (const [lw, cc] of [[w * 3, col.replace('1)', '0.35)')], [w, col], [Math.max(1, w * 0.35), 'rgba(255,255,240,1)']]) {
    c.strokeStyle = cc; c.lineWidth = lw; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke() }
  c.restore()
}

export function drawFlashUltScreen(ctx, canvas, D, st) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = D.caster
  if (!f) return
  const V = view(W, H), z = V.z, k = st.frame, real = D.real
  const br = D.burstReal != null ? real - D.burstReal : -1
  const c = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94) * 0.5), feet = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94))
  const win = calmMotion() ? 0 : real >> 1   // the lightning re-rolls every 2 frames
  // THE WORLD STOPS: a ripple rolls out from him; outside it the frame drains to grey (his bubble stays in colour)
  const rip = k < T.push ? 0 : outE(clamp((k - T.push) / 40, 0, 1)), bubble = (110 + 30 * Math.sin(real * 0.2)) * z
  const greyA = br >= 0 ? clamp(1 - Math.max(0, br - 20) / 60, 0.35, 1) : rip
  if (greyA > 0) {
    const C = copyCanvas(W, H); C.g.setTransform(1, 0, 0, 1, 0, 0); C.g.globalCompositeOperation = 'copy'; C.g.drawImage(canvas, 0, 0); C.g.globalCompositeOperation = 'source-over'
    const R = Math.hypot(W, H) * rip + bubble
    // grey everything, then cut the bubble back in at full colour
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.95 * greyA; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); ctx.restore()
    grade(ctx, W, H, 'multiply', 'rgb(150,170,200)', 0.35 * greyA)
    ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, bubble, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(C.cv, 0, 0); ctx.restore()
    if (R < Math.hypot(W, H)) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.clip('evenodd'); ctx.drawImage(C.cv, 0, 0); ctx.restore() }   // beyond the ripple: not yet
    if (k < T.burst + 1 && rip < 1) { const R2 = Math.hypot(W, H) * rip; ring(ctx, c.x, c.y, R2, R2, 'rgba(255,220,120,1)', 6 * z, 0.8 * (1 - rip)); ring(ctx, c.x, c.y, R2 * 0.96, R2 * 0.96, 'rgba(255,80,40,1)', 3 * z, 0.6 * (1 - rip)) }
    ring(ctx, c.x, c.y, bubble, bubble, 'rgba(255,200,80,1)', 2.5 * z, 0.7 * greyA)
    // the stopped world: dust and embers hanging in the air (no motion once stopped)
    for (let i = 0; i < 60; i++) { const x = hash(i, 71) * W, y = hash(i, 72) * H * 0.85, d = Math.hypot(x - c.x, y - c.y)
      if (d < bubble) continue
      ctx.save(); ctx.globalAlpha = 0.65 * greyA; ctx.fillStyle = i % 4 ? 'rgba(230,235,245,1)' : 'rgba(255,190,90,1)'; ctx.fillRect(x, y, (i % 4 ? 2 : 3) * z, (i % 4 ? 2 : 3) * z)
      ctx.globalAlpha = 0.25 * greyA; ctx.fillRect(x - 6 * z, y, 6 * z, 1); ctx.restore() }
  }
  // SPEED FORCE: lightning crackling off him, building into a vortex
  const power = k < T.push ? smooth(k / T.push) * 0.7 : k < T.burst ? 0.7 + 0.3 * smooth((k - T.push) / 60) : clamp(1 - (k - T.burst) / 45, 0.25, 1)
  const nb = Math.round(3 + 9 * power)
  for (let i = 0; i < nb; i++) {
    const s = win * 31 + i * 7, an = hash(s, 1) * Math.PI * 2 + (k >= T.push ? real * 0.12 : 0), r0 = (14 + 20 * hash(s, 2)) * z, r1 = (60 + 90 * power * hash(s, 3)) * z
    bolt(ctx, c.x + Math.cos(an) * r0, c.y + Math.sin(an) * r0 * 1.3, c.x + Math.cos(an + 0.6) * r1, c.y + Math.sin(an + 0.6) * r1 * 1.2, s, (2 + 2 * power) * z, i % 3 ? 'rgba(255,200,40,1)' : 'rgba(255,60,30,1)', 0.9)
  }
  glow(ctx, c.x, c.y, (80 + 80 * power) * z, '255,170,40', 0.35 * power)
  if (k >= T.push && k < T.burst) speedLines(ctx, W, H, c.x, c.y, 30, 61, 'rgba(255,230,160,1)', 0.35 * smooth((k - T.push) / 30), true, real)
  // THE STRIKE: a bolt from the sky onto him
  if (br >= 0 && br < 24) {
    const a = 1 - br / 24
    for (let j = 0; j < 3; j++) bolt(ctx, c.x + (hash(j, 5) - 0.5) * 120 * z, -20, c.x + (j - 1) * 6 * z, feet.y, 900 + j + (calmMotion() ? 0 : (br >> 1)), (9 - j * 2) * z, 'rgba(255,210,60,1)', a, 0.12)
    glow(ctx, feet.x, feet.y, (120 + 260 * outE(br / 24)) * z, '255,220,120', a)
    for (let i = 0; i < 3; i++) { const q = clamp((br - i * 3) / 20, 0, 1); ring(ctx, feet.x, feet.y - 4 * z, (30 + 420 * outE(q)) * z, (10 + 80 * outE(q)) * z, i ? 'rgba(255,80,40,1)' : 'rgba(255,240,180,1)', (8 - i * 2) * z, 1 - q) }
  }
  if (!calmFlash() && br >= 0) { if (br < 3) grade(ctx, W, H, 'source-over', '#fffbe8', 1); else if (br < 8) grade(ctx, W, H, 'lighter', 'rgb(255,200,80)', 0.7 - (br - 3) * 0.12) }
  // title + letterbox + subtitle
  if (k >= 8 && k < T.push + 6 && br < 0) title(ctx, W, H, 'FLASH TIME', 'THE FLASH · THE FASTEST MAN ALIVE', (k - 8) / (T.push - 2), { portrait: PORTRAIT, band: 'rgba(90,6,6,0.94)', edge: '#ffd21e', fill: '#ffd21e', stroke: '#7a0a0a', subFill: '#ffffff', fs: 0.1, y: 0.64 })
  if (k >= T.push + 6 && k < T.burst && br < 0) caption(ctx, W, H, 'THE WORLD STOPS.', W * 0.5, H * 0.2, smooth((k - T.push - 6) / 8), { fs: 0.05, fill: '#e8eef8', stroke: '#1a1f2a' })
  if (br >= 0 && br < 80) title(ctx, W, H, 'FLASH TIME!', null, br / 80, { band: 'rgba(110,8,8,0.9)', edge: '#ffd21e', fill: '#ffffff', stroke: '#c0161a', fs: 0.14, y: 0.22, bh: 0.2, from: -1 })
  letterbox(ctx, W, H, (k + 1) / 10, (T.end - k) / 14)
  if (k >= T.voAt) subtitle(ctx, W, H, 'THE FLASH', "There's only one fastest man alive.", clamp((k - T.voAt) / 5, 0, 1) * clamp((T.end - k) / 6, 0, 1), '#ffd21e')
}
