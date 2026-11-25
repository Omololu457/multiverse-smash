// robinUltFx.js — RENDER-ONLY half of Robin's CHECKMATE: LIGHTS OUT cinematic (robinUlt.js). One screen pass (cineRegistry
// overlay, identity transform, device pixels): the smoke bomb, the blackout (the scene shows only when a strike lights it),
// his white lenses in the dark, three birdarangs that stick around the foe with blinking charges, the wrist-computer target
// lock + countdown, the blast, "CHECK" / "CHECKMATE." stamps, punch-ins, letterbox + subtitles. The fighters are the
// engine's own sprites (Robin in his real ult poses). Pure functions of the director's counters; noise = integer hash.
import { dcKit } from './soldierBoyUltFx.js'

const { image, hash, clamp, smooth, outE, calmMotion, calmFlash, view, punchIn, speedLines, title, subtitle, letterbox, glow, ring, grade, bigNumber, caption } = dcKit
const BUST = './assets/robin/cutscene/bust.png'
export function preloadRobinUlt() { image(BUST) }
const P = { out: 31, outN: 34, dark: 10, rang: [16, 21, 26], blast: 150 }
const RANG_AT = [[-62, 0, -0.5], [58, 0, 0.45], [-4, -1, 0]]   // stick offsets from the foe: dx, (0 = floor / −1 = above), tilt

function birdarang(c, x, y, s, rot, a, led) {
  if (a <= 0) return
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = clamp(a, 0, 1)
  c.beginPath(); c.moveTo(0, -0.25 * s)
  c.lineTo(0.5 * s, -0.55 * s); c.lineTo(1.0 * s, -0.2 * s); c.lineTo(0.62 * s, -0.12 * s); c.lineTo(0.55 * s, 0.2 * s); c.lineTo(0.28 * s, 0.05 * s); c.lineTo(0, 0.35 * s)
  c.lineTo(-0.28 * s, 0.05 * s); c.lineTo(-0.55 * s, 0.2 * s); c.lineTo(-0.62 * s, -0.12 * s); c.lineTo(-1.0 * s, -0.2 * s); c.lineTo(-0.5 * s, -0.55 * s); c.closePath()
  c.fillStyle = '#1b1b22'; c.fill(); c.lineWidth = Math.max(1, s * 0.09); c.strokeStyle = '#e8c21e'; c.stroke()
  c.beginPath(); c.moveTo(-0.5 * s, -0.42 * s); c.lineTo(0, -0.18 * s); c.lineTo(0.5 * s, -0.42 * s); c.strokeStyle = '#d9241f'; c.lineWidth = Math.max(1, s * 0.07); c.stroke()
  c.restore()
  if (led > 0) glow(c, x, y, s * 1.4, '255,40,30', led)
}
function smokeCloud(c, x, y, r, a, seed, real) {
  if (a <= 0) return
  c.save(); c.globalAlpha = clamp(a, 0, 1)
  for (let i = 0; i < 9; i++) {
    const an = hash(i, seed) * Math.PI * 2, d = r * (0.25 + 0.55 * hash(i, seed + 1)), rr = r * (0.35 + 0.35 * hash(i, seed + 2))
    const dx = calmMotion() ? 0 : Math.sin(real * 0.03 + i) * r * 0.05
    const g = c.createRadialGradient(x + Math.cos(an) * d + dx, y + Math.sin(an) * d * 0.6, 0, x + Math.cos(an) * d + dx, y + Math.sin(an) * d * 0.6, rr)
    g.addColorStop(0, 'rgba(120,124,132,0.95)'); g.addColorStop(0.7, 'rgba(70,72,80,0.8)'); g.addColorStop(1, 'rgba(40,40,48,0)')
    c.fillStyle = g; c.beginPath(); c.arc(x + Math.cos(an) * d + dx, y + Math.sin(an) * d * 0.6, rr, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}
function reticle(c, x, y, r, a, spin, col) {
  if (a <= 0) return
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.strokeStyle = col; c.lineWidth = Math.max(2, r * 0.04)
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke()
  c.translate(x, y); c.rotate(spin)
  for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.arc(0, 0, r * 1.25, -0.35, 0.35); c.stroke(); c.beginPath(); c.moveTo(r * 0.55, 0); c.lineTo(r * 0.9, 0); c.stroke() }
  c.restore()
}

export function drawRobinUltScreen(ctx, canvas, D, S) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = D.caster, t = D.target
  if (!f || !t) return
  const V = view(W, H), z = V.z, L = D.L, real = D.real, dir = D.dir || 1
  const inOut = D.pauseAt === P.out && D.pk > 0, k = inOut ? D.pk : (L > P.out ? 999 : 0)
  const hit = D.lastHit, rr = hit ? real - hit.real : 999, blasted = !!(hit && hit.i === 4)
  const tcx = S.tx0 + (t.w || 48) / 2, feetT = S.floorT + (t.h || 94)
  const fh = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94) * 0.17), fp = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94))
  const tc = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94) * 0.5), tf = V.p(tcx, feetT)
  const jit = D.hold > 0 && !calmMotion() ? { x: (hash(real, 1) - 0.5) * 12, y: (hash(real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  // the blackout: from the smoke until the lights snap back at L86 (a strike lights the room for its hit-stop)
  let dark = 0
  if (inOut) dark = smooth((k - P.dark + 2) / 6) * 0.9
  else if (L > P.out && L < 86) dark = 0.9
  else if (L >= 86 && L < 96) dark = [0.9, 0, 0.9, 0.9, 0, 0, 0.5, 0, 0, 0][L - 86]   // the lights flicker back on
  if (hit && hit.i < 3 && D.hold > 0) dark = 0.15
  else if (hit && hit.i < 3 && rr < 14) dark = Math.min(dark, 0.15 + 0.75 * smooth((rr - 6) / 8))
  ctx.save(); ctx.translate(jit.x, jit.y)
  // the smoke bomb
  if (inOut || (L > P.out && L < 70)) {
    const u = inOut ? smooth(k / 12) : 1, fade = inOut ? 1 : clamp(1 - (L - P.out) / 38, 0, 1)
    smokeCloud(ctx, fp.x + dir * 30 * z, fp.y - 40 * z, (60 + 170 * u) * z, 0.9 * fade, 3, real)
    smokeCloud(ctx, tf.x, tf.y - 50 * z, (40 + 140 * u) * z, 0.75 * fade, 8, real)
  }
  grade(ctx, W, H, 'source-over', 'rgba(2,3,8,1)', dark)
  if (dark > 0.3 && !blasted) {   // in the dark: only his lenses
    const la = clamp((dark - 0.3) / 0.5, 0, 1) * (hash(real >> 4, 5) > 0.08 ? 1 : 0.2)
    for (const sd of [-1, 1]) { const x = fh.x + dir * 5 * z + sd * 5 * z
      ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#cfe8ff'; ctx.shadowBlur = 12 * z
      ctx.beginPath(); ctx.ellipse(x, fh.y, 4.2 * z, 1.8 * z, sd * dir * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  }
  // birdarangs: thrown out of the black, they stick around the foe and blink
  const stuck = RANG_AT.map(([dx, up, tilt]) => ({ x: V.p(tcx + dx, 0).x, y: up ? V.p(0, feetT - (t.h || 94) - 26).y : tf.y - 6 * z, tilt }))
  RANG_AT.forEach((_, i) => {
    const at = P.rang[i], s = 20 * z, p = stuck[i]
    if (blasted) return
    if (inOut && k < at) return
    if (inOut && k < at + 4) {   // in flight from the dark behind Robin
      const u = (k - at) / 4, x0 = fh.x - dir * W * 0.35, y0 = fh.y - 120 * z * (i - 1)
      const x = x0 + (p.x - x0) * u, y = y0 + (p.y - y0) * u
      ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#e8c21e'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(x0 + (p.x - x0) * Math.max(0, u - 0.3), y0 + (p.y - y0) * Math.max(0, u - 0.3)); ctx.lineTo(x, y); ctx.stroke(); ctx.restore()
      birdarang(ctx, x, y, s, real * 0.9, 1, 0)
      return
    }
    if (inOut && k === at + 4) ring(ctx, p.x, p.y, 22 * z, 8 * z, 'rgba(255,230,150,1)', 3 * z, 1)
    const rate = L >= 112 ? 4 : 14, led = (real % rate) < rate / 2 ? 1 : 0.15
    birdarang(ctx, p.x, p.y, s, p.tilt + (RANG_AT[i][1] ? 0 : 0.6 * (i ? 1 : -1)), 1, 0.55 * led)
  })
  // the flurry: speed lines on each strike, "CHECK" stamps
  if (hit && hit.i < 3 && rr < 16) {
    speedLines(ctx, W, H, tc.x, tc.y, 30, 40 + hit.i, 'rgba(255,255,255,1)', 0.6 * (1 - rr / 16), true, real)
    ring(ctx, tc.x, tc.y, (20 + rr * 8) * z, (20 + rr * 8) * z, 'rgba(255,230,120,1)', 4 * z, 1 - rr / 16)
  }
  // the wrist computer: target lock + countdown
  if (L >= 112 && L < 150 && !blasted) {
    const u = smooth((L - 112) / 10), lock = L >= 120
    grade(ctx, W, H, 'source-over', 'rgba(0,30,10,1)', 0.18 * u)
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y, W, 1) }
    reticle(ctx, tc.x, tc.y, (lock ? 46 : 46 + 80 * (1 - u)) * z, u, calmMotion() ? 0 : real * 0.05, lock ? '#ff3a2a' : '#7dff9a')
    caption(ctx, W, H, lock ? 'TARGET LOCKED' : 'SCANNING…', tc.x, tc.y - 80 * z, u, { fs: 0.03, fill: lock ? '#ff5a4a' : '#9dffb0', stroke: '#001a08' })
    const n = L < 122 ? null : L < 132 ? '3' : L < 142 ? '2' : '1'
    if (n) { const age = (L - 122) % 10; caption(ctx, W, H, n, W * 0.5, H * 0.3, clamp(1.2 - age / 10, 0, 1), { fs: 0.16, scale: 1 + Math.max(0, 1 - age / 4) * 0.5, fill: '#ff3a2a', stroke: '#1a0000' }) }
  }
  // BOOM: the bomb and the birdarangs go together
  if (blasted && rr < 110) {
    const u = clamp(rr / 60, 0, 1)
    glow(ctx, tf.x, tf.y - 40 * z, (140 + 380 * outE(u)) * z, '255,170,60', 0.95 * (1 - u))
    glow(ctx, tf.x, tf.y - 40 * z, (60 + 160 * outE(u)) * z, '255,250,220', 0.9 * (1 - u))
    stuck.forEach((p, i) => { const v = clamp((rr - 2 - i * 3) / 30, 0, 1); glow(ctx, p.x, p.y, (30 + 120 * outE(v)) * z, '255,140,40', 0.9 * (1 - v)) })
    for (let i = 0; i < 3; i++) { const v = clamp((rr - i * 4) / 36, 0, 1); ring(ctx, tf.x, tf.y - 4 * z, (40 + 480 * outE(v)) * z, (12 + 90 * outE(v)) * z, i ? 'rgba(255,150,50,1)' : 'rgba(255,240,200,1)', (8 - i * 2) * z, 1 - v) }
    for (let i = 0; i < 28; i++) { const an = -Math.PI * hash(i, 61), sp = (4 + 9 * hash(i, 62)) * z, x = tf.x + Math.cos(an) * sp * rr, y = tf.y - 20 * z + Math.sin(an) * sp * rr + 0.05 * rr * rr * z
      ctx.fillStyle = i % 2 ? '#ffcf5a' : '#5a5a66'; ctx.globalAlpha = clamp(1 - rr / 70, 0, 1); ctx.fillRect(x, y, 4 * z, 4 * z) }
    ctx.globalAlpha = 1
  }
  ctx.restore()
  if (D.hold > 0 && hit) punchIn(ctx, canvas, W, H, hit.i === 4 ? (fh.x + tc.x) / 2 : tc.x, tc.y, hit.i === 4 ? 1.3 - 0.2 * clamp(rr / 24, 0, 1) : 1.22)
  if (hit && !calmFlash()) {
    if (blasted && rr < 3) grade(ctx, W, H, 'source-over', '#ffffff', 1)
    else if (blasted && rr < 8) grade(ctx, W, H, 'difference', '#ffffff', 0.8 - (rr - 3) * 0.15)
    else if (hit.i < 4 && rr < 2) grade(ctx, W, H, 'lighter', 'rgb(255,250,235)', 0.55)
  }
  if (hit && hit.i < 3 && rr < 22) caption(ctx, W, H, 'CHECK.', tc.x + (hit.i - 1) * 90 * z, tc.y - 90 * z - hit.i * 16 * z, clamp(1.3 - rr / 22, 0, 1), { fs: 0.06, scale: 1 + Math.max(0, 1 - rr / 4) * 0.6, fill: '#ffe14d', stroke: '#b3120f', rot: -0.12 + hit.i * 0.1 })
  if (L >= 4 && L < 31 && !D.pauseAt) title(ctx, W, H, 'CHECKMATE: LIGHTS OUT', 'ROBIN · THE BOY WONDER', (L - 4) / 27, { portrait: BUST, band: 'rgba(120,10,10,0.94)', edge: '#ffd21e', fill: '#ffe14d', stroke: '#1a1a1a', subFill: '#ffffff', fs: 0.075, y: 0.6 })
  if (inOut && k >= P.dark && k < P.outN) caption(ctx, W, H, 'LIGHTS OUT.', W * 0.5, H * 0.24, clamp((k - P.dark) / 4, 0, 1) * clamp((P.outN - k) / 6, 0, 1), { fs: 0.07, fill: '#f4f4f4', stroke: '#000' })
  if (blasted && rr < 90) title(ctx, W, H, 'CHECKMATE.', null, rr / 90, { band: 'rgba(16,16,20,0.92)', edge: '#ffd21e', fill: '#ffffff', stroke: '#c0161a', fs: 0.13, y: 0.24, bh: 0.2, from: -1 })
  letterbox(ctx, W, H, (L + (D.pauseAt ? 40 : 0)) / 10, (199 - L) / 14)
  if (L >= 176) subtitle(ctx, W, H, 'ROBIN', 'ONLY ROBIN! GO!', clamp((L - 176) / 6, 0, 1), '#ffd21e')
  if (blasted) bigNumber(ctx, W, H, D.dmg, tc.x, tc.y - 50 * z, rr / 70, '#ffcf3a')
}
