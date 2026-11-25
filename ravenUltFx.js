// ravenUltFx.js — RENDER-ONLY half of Raven's AZARATH METRION ZINTHOS — SOUL-SELF cinematic (ravenUlt.js). One screen pass
// (cineRegistry overlay, identity transform, device pixels): the violet-black grade, shadow tendrils, the chant words,
// the soul-self raven (a procedural silhouette: spread wings, feathered primaries, fan tail, glowing white eyes), the
// sphere of darkness it wraps the foe in, the burst, feathers, punch-ins, impact frames, letterbox + subtitles. The
// fighters are the engine's own sprites (Raven in her real ult poses). Pure functions of the director's frame counters;
// noise = integer hash. Reduce Flashing → no inverted frames; Reduce Motion → no jitter.
import { dcKit } from './soldierBoyUltFx.js'

const { image, hash, clamp, smooth, outE, calmMotion, calmFlash, view, punchIn, speedLines, title, subtitle, letterbox, glow, ring, grade, bigNumber, caption } = dcKit
const BUST = './assets/raven/cutscene/bust.png'
export function preloadRavenUlt() { image(BUST) }
const P = { p1: 41, p2: 76, p3: 128, rise: 10, dive: 34, wrap: 52, n3: 70 }
const VIO = '150,90,255', DEEP = '40,10,80'

// the soul-self: frontal, wings spread. x, y = body centre; s = half-wingspan in px; flap −1 (swept back) … 1 (raised)
function soulRaven(c, x, y, s, flap, rot, a, eyes = 1) {
  if (a <= 0 || s <= 1) return
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = clamp(a, 0, 1)
  const wing = side => {
    const tipY = -0.28 - 0.42 * flap, midY = -0.12 - 0.22 * flap
    c.moveTo(0.08 * side * s, -0.12 * s)
    c.quadraticCurveTo(0.45 * side * s, (midY - 0.18) * s, 1.0 * side * s, tipY * s)
    for (let i = 0; i < 6; i++) {   // the trailing edge: six primaries, jagged
      const u = i / 5, ex = (1.0 - u * 0.86) * side * s, ey = (tipY + (0.26 + 0.1 * Math.sin(u * 3)) + u * (0.18 - tipY - 0.1)) * s
      c.lineTo(ex + side * 0.04 * s, ey + 0.11 * s); c.lineTo(ex - side * 0.06 * s, ey - 0.02 * s)
    }
    c.lineTo(0.06 * side * s, 0.16 * s)
  }
  c.beginPath(); wing(-1); c.closePath(); wing(1); c.closePath()
  c.moveTo(0.13 * s, 0.14 * s)
  for (let i = 0; i <= 6; i++) { const an = Math.PI * (0.3 + 0.0667 * i), r = 0.46 * s * (i % 2 ? 0.82 : 1); c.lineTo(Math.cos(an) * r, 0.1 * s + Math.sin(an) * r) }   // fan tail
  c.lineTo(-0.13 * s, 0.14 * s); c.closePath()
  c.moveTo(0.16 * s, -0.02 * s); c.ellipse(0, -0.02 * s, 0.16 * s, 0.27 * s, 0, 0, Math.PI * 2); c.closePath()   // body
  c.moveTo(0.12 * s, -0.3 * s); c.arc(0, -0.3 * s, 0.12 * s, 0, Math.PI * 2); c.closePath()   // head
  const g = c.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 1.05); g.addColorStop(0, 'rgba(4,0,10,0.98)'); g.addColorStop(0.6, 'rgba(18,4,40,0.95)'); g.addColorStop(1, 'rgba(70,20,140,0.85)')
  c.fillStyle = g; c.shadowColor = 'rgba(170,110,255,0.9)'; c.shadowBlur = Math.max(6, s * 0.08); c.fill()
  c.shadowBlur = 0
  c.beginPath(); c.moveTo(-0.04 * s, -0.25 * s); c.lineTo(0, -0.13 * s); c.lineTo(0.04 * s, -0.25 * s); c.fillStyle = 'rgba(10,0,20,1)'; c.fill(); c.strokeStyle = 'rgba(190,150,255,0.6)'; c.lineWidth = Math.max(1, s * 0.008); c.stroke()   // beak
  if (eyes > 0) for (const sd of [-1, 1]) {   // white eyes
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(a * eyes, 0, 1)
    c.fillStyle = '#ffffff'; c.shadowColor = '#e6d8ff'; c.shadowBlur = s * 0.08
    c.beginPath(); c.ellipse(sd * 0.055 * s, -0.32 * s, 0.038 * s, 0.016 * s, sd * 0.35, 0, Math.PI * 2); c.fill(); c.restore()
  }
  c.restore()
}
function feather(c, x, y, s, rot, a) {
  if (a <= 0) return
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = clamp(a, 0, 1)
  c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.4, 0, 0, s); c.quadraticCurveTo(-s * 0.4, 0, 0, -s)
  c.fillStyle = 'rgba(12,2,28,0.95)'; c.fill(); c.strokeStyle = 'rgba(160,110,255,0.7)'; c.lineWidth = 1; c.stroke(); c.restore()
}
function tendrils(c, x, y, n, len, z, a, real, seed) {
  if (a <= 0) return
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, L = len * (0.5 + hash(i, seed) * 0.6), w = (calmMotion() ? 0 : Math.sin(real * 0.12 + i * 1.7)) * 10 * z
    c.strokeStyle = i % 3 ? 'rgba(14,2,30,0.9)' : 'rgba(110,60,220,0.75)'; c.lineWidth = (3 + hash(i, seed + 1) * 5) * z
    c.beginPath(); c.moveTo(x + side * L, y + 2 * z)
    c.bezierCurveTo(x + side * L * 0.66, y - 14 * z + w, x + side * L * 0.33, y + 8 * z - w, x + side * 6 * z, y - 4 * z); c.stroke()
  }
  c.restore()
}
function darkSphere(c, x, y, r, a, real, crush, eyes) {
  if (a <= 0 || r <= 1) return
  c.save(); c.globalAlpha = clamp(a, 0, 1)
  const g = c.createRadialGradient(x, y, r * 0.1, x, y, r); g.addColorStop(0, 'rgba(0,0,0,0.97)'); g.addColorStop(0.75, 'rgba(14,2,32,0.93)'); g.addColorStop(1, 'rgba(90,40,190,0.75)')
  c.fillStyle = g; c.beginPath()
  for (let i = 0; i <= 40; i++) { const an = i / 40 * Math.PI * 2, wob = calmMotion() ? 0 : Math.sin(an * 5 + real * 0.25) * r * 0.04 * (1 + crush * 2); c.lineTo(x + Math.cos(an) * (r + wob), y + Math.sin(an) * (r + wob)) }
  c.closePath(); c.fill()
  c.lineWidth = Math.max(2, r * 0.05); c.strokeStyle = `rgba(190,150,255,${0.5 + crush * 0.5})`; c.shadowColor = 'rgba(170,110,255,1)'; c.shadowBlur = r * 0.25; c.stroke(); c.shadowBlur = 0
  // the folded wings around it: two dark crescents
  for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(x + sd * r * 0.55, y - r * 0.05, r * 0.62, r * 1.08, sd * 0.35, -Math.PI / 2, Math.PI / 2, sd < 0); c.fillStyle = 'rgba(6,0,16,0.75)'; c.fill() }
  if (eyes > 0) for (const sd of [-1, 1]) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(eyes, 0, 1); c.fillStyle = '#fff'; c.shadowColor = '#d9c8ff'; c.shadowBlur = r * 0.2
    c.beginPath(); c.ellipse(x + sd * r * 0.24, y - r * 0.42, r * 0.11, r * 0.045, sd * 0.4, 0, Math.PI * 2); c.fill(); c.restore() }
  c.restore()
}

export function drawRavenUltScreen(ctx, canvas, D, S) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = D.caster, t = D.target
  if (!f || !t) return
  const V = view(W, H), z = V.z, L = D.L, real = D.real, dir = D.dir || 1
  const inP3 = D.pauseAt === P.p3 && D.pk > 0, pk = inP3 ? D.pk : (L >= P.p3 ? P.n3 + 1 : 0)
  const hit = D.lastHit, rr = hit ? real - hit.real : 999, released = !!(hit && hit.i === 2)
  const fp = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94)), fc = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94) * 0.45)
  const tc = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94) * 0.5), floorY = V.p(0, S.floorT + (t.h || 94)).y
  const jit = D.hold > 0 && !calmMotion() ? { x: (hash(real, 1) - 0.5) * 14, y: (hash(real, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)
  // 1. THE DARK: the room's light drains away (multiply violet), deeper while the soul-self is out
  const darkA = released ? clamp(0.62 - rr / 90, 0, 0.62) : L < 41 ? 0.62 * smooth(L / 30) : 0.62 + (pk > 0 ? 0.15 * smooth(pk / 12) : 0)
  grade(ctx, W, H, 'multiply', 'rgb(70,45,110)', darkA)
  grade(ctx, W, H, 'source-over', 'rgba(6,0,16,1)', darkA * 0.35)
  // 2. her power: floor tendrils crawling in, the aura, the eyes
  const auraA = released ? clamp(1 - rr / 40, 0, 1) : smooth(L / 20)
  tendrils(ctx, fp.x, fp.y, 10, 260 * z * (1 - 0.6 * smooth(L / 40)), z, auraA * 0.9, real, 7)
  glow(ctx, fc.x, fc.y, 120 * z, VIO, 0.35 * auraA + (L >= 41 && L < 126 ? 0.15 : 0))
  ring(ctx, fp.x, fp.y - 2 * z, 60 * z, 12 * z, 'rgba(170,120,255,1)', 2 * z, 0.6 * auraA)
  if (L < 60 || inP3) {   // her eyes flare white (the summon, the soul-self tearing out)
    const ea = inP3 ? clamp(1 - D.pk / 14, 0, 1) : clamp((L - 8) / 10, 0, 1) * (0.6 + 0.4 * Math.sin(real * 0.4))
    const ey = V.p(0, f.y + (f.h || 94) * 0.16).y
    for (const sd of [-1, 1]) glow(ctx, fc.x + dir * 4 * z + sd * 4 * z, ey, 16 * z, '240,230,255', ea)
  }
  // 3. the chant's black aura through the throws: violet trails on the piles are drawn by ravenFx; add the hurl streaks
  if (L >= 80 && L < 112 && !released) speedLines(ctx, W, H, tc.x, tc.y, 26, 31, 'rgba(190,150,255,1)', 0.35, true, real)
  // 4. THE SOUL-SELF
  const span = Math.min(W * 0.46, 300 * z)
  if (inP3) {
    const k = D.pk
    if (k < P.rise) {   // tearing out: a burst ring from her chest
      const u = k / P.rise; ring(ctx, fc.x, fc.y, (20 + 160 * outE(u)) * z, (20 + 160 * outE(u)) * z, 'rgba(200,160,255,1)', 5 * z, 1 - u)
      glow(ctx, fc.x, fc.y, 160 * z * u, '200,170,255', 0.8 * (1 - u))
    } else if (k < P.dive) {   // rising: grows out of her, wings unfolding
      const u = smooth((k - P.rise) / (P.dive - P.rise - 6)), x = fc.x, y = fc.y - (190 * z) * u
      const flap = calmMotion() ? 0.6 : 0.4 + 0.6 * Math.sin((k - P.rise) * 0.35)
      glow(ctx, x, y, span * 1.2 * u, VIO, 0.45 * u)
      soulRaven(ctx, x, y, span * (0.15 + 0.85 * u), flap, 0, 0.35 + 0.65 * u, u)
      if (k >= P.rise + 14) { const v = clamp((k - P.rise - 14) / 10, 0, 1); ring(ctx, x, y - span * 0.2, span * (0.3 + v), span * (0.3 + v) * 0.6, 'rgba(220,200,255,1)', 4 * z, 0.7 * (1 - v)) }
    } else if (k < P.wrap) {   // the dive: folded back, streaking at the foe
      const u = smooth((k - P.dive) / (P.wrap - P.dive)), x0 = fc.x, y0 = fc.y - 190 * z
      const x = x0 + (tc.x - x0) * u, y = y0 + (tc.y - y0) * u - Math.sin(u * Math.PI) * 60 * z
      const rot = Math.atan2(tc.y - y0, tc.x - x0) - Math.PI / 2
      speedLines(ctx, W, H, x, y, 30, 77, 'rgba(160,110,255,1)', 0.5, false, real)
      for (let i = 1; i <= 4; i++) { const uu = Math.max(0, u - i * 0.06); soulRaven(ctx, x0 + (tc.x - x0) * uu, y0 + (tc.y - y0) * uu - Math.sin(uu * Math.PI) * 60 * z, span * (1 - 0.35 * uu), -0.8, rot, 0.18 / i, 0) }
      soulRaven(ctx, x, y, span * (1 - 0.35 * u), -0.8, rot, 1, 1)
    } else {   // the wrap: wings close into the sphere
      const u = smooth((k - P.wrap) / (P.n3 - P.wrap)), r = (90 + 40 * (1 - u)) * z
      soulRaven(ctx, tc.x, tc.y, span * 0.65 * (1 - u), -0.2 - 0.8 * u, 0, 1 - u, 1 - u)
      darkSphere(ctx, tc.x, tc.y, r * smooth(u * 1.6), 0.25 + 0.75 * u, real, 0, u)
      if (k - P.wrap < 8) ring(ctx, tc.x, tc.y, (40 + (k - P.wrap) * 22) * z, (40 + (k - P.wrap) * 22) * z, 'rgba(210,180,255,1)', 6 * z, 1 - (k - P.wrap) / 8)
    }
  } else if (L >= P.p3 && !released) {   // THE DARK: the sphere holds and crushes
    const thr = [140, 152, 164].reduce((m, a) => Math.max(m, L >= a && L < a + 8 ? 1 - (L - a) / 8 : 0), 0)
    const squeeze = L >= 172 ? smooth((L - 172) / 8) : 0
    const r = 90 * z * (1 - 0.12 * thr - 0.45 * squeeze)
    glow(ctx, tc.x, tc.y, r * 2.2, VIO, 0.35 + 0.4 * squeeze)
    darkSphere(ctx, tc.x, tc.y, r, 1, real, thr + squeeze, 1)
    if (thr > 0.6) ring(ctx, tc.x, tc.y, r * (1.1 + (1 - thr)), r * (1.1 + (1 - thr)), 'rgba(200,170,255,1)', 4 * z, thr)
    if (squeeze > 0) speedLines(ctx, W, H, tc.x, tc.y, 40, 55, 'rgba(230,210,255,1)', 0.55 * squeeze, true, real)
  }
  // 5. RELEASE: the raven bursts out of the sphere and away
  if (released && rr < 120) {
    const u = clamp(rr / 70, 0, 1)
    glow(ctx, tc.x, tc.y, (120 + 420 * outE(u)) * z, '200,170,255', 0.9 * (1 - u))
    for (let i = 0; i < 3; i++) { const v = clamp((rr - i * 5) / 40, 0, 1); ring(ctx, tc.x, floorY - 6 * z, (40 + 520 * outE(v)) * z, (14 + 110 * outE(v)) * z, i ? 'rgba(150,100,255,1)' : 'rgba(240,230,255,1)', (8 - i * 2) * z, 1 - v) }
    soulRaven(ctx, tc.x, tc.y - 120 * z - 360 * z * outE(u), span * (0.55 + 0.45 * outE(u)), 1 - 1.6 * clamp(rr / 26, 0, 1) + (calmMotion() ? 0 : 0.3 * Math.sin(rr * 0.5)), 0, 1 - smooth((rr - 20) / 40), 1)
    for (let i = 0; i < 46; i++) {   // the feathers
      const a0 = hash(i, 91) * Math.PI * 2, sp = (3 + hash(i, 92) * 8) * z, tt = rr
      const x = tc.x + Math.cos(a0) * sp * tt * (1 - tt / 260), y = tc.y + Math.sin(a0) * sp * tt * 0.6 * (1 - tt / 260) + 0.02 * tt * tt * z
      feather(ctx, x, y, (5 + hash(i, 93) * 7) * z, a0 + (calmMotion() ? 0 : tt * 0.08 * (hash(i, 94) - 0.5)), clamp(1.4 - tt / 90, 0, 1))
    }
  }
  ctx.restore()
  // 6. punch-in on the contacts (re-blit), impact frames
  if (D.hold > 0 && hit) { const u = clamp(rr / (hit.i === 2 ? 26 : 9), 0, 1); punchIn(ctx, canvas, W, H, tc.x, tc.y, hit.i === 2 ? 1.45 - 0.25 * u : 1.18 - 0.1 * u) }
  if (inP3 && D.pk >= P.wrap && D.pk < P.wrap + 6) punchIn(ctx, canvas, W, H, tc.x, tc.y, 1.25)
  if (hit && !calmFlash()) {
    if (hit.i === 2 && rr < 4) { grade(ctx, W, H, 'difference', '#ffffff', 1); grade(ctx, W, H, 'multiply', 'rgb(190,150,255)', 0.6) }
    else if (hit.i === 2 && rr < 7) grade(ctx, W, H, 'source-over', '#f2ecff', 0.85 - (rr - 4) * 0.25)
    else if (hit.i < 2 && rr < 2) { grade(ctx, W, H, 'difference', '#ffffff', 0.9); grade(ctx, W, H, 'multiply', 'rgb(170,120,255)', 0.5) }
  }
  if (inP3 && D.pk < 4 && !calmFlash()) grade(ctx, W, H, 'source-over', '#ffffff', 0.7 - D.pk * 0.18)
  // 7. the chant: three words slammed one by one, held until the release
  const words = [['AZARATH', P.p1, 0.24], ['METRION', P.p2, 0.5], ['ZINTHOS!', P.p3, 0.76]]
  for (const [w, at, xf] of words) {
    const on = at === P.p3 ? (inP3 || L > P.p3) : (L > at || (D.pauseAt === at && D.pk > 0))
    if (!on) continue
    const age = D.pauseAt === at && D.pk > 0 ? D.pk : 30
    const fade = released ? clamp(1 - rr / 20, 0, 1) : 1
    const big = at === P.p3, pop = 1 + Math.max(0, 1 - age / 6) * 0.7
    caption(ctx, W, H, w, W * xf, H * (big ? 0.24 : 0.2), fade * clamp(age / 3, 0, 1), { fs: big ? 0.1 : 0.075, scale: pop, fill: big ? '#ffffff' : '#e6dcff', stroke: '#2a0656', rot: -0.05 })
  }
  // 8. title cut-in, letterbox, subtitles, the damage
  if (L >= 6 && L < 41 && !D.pauseAt) title(ctx, W, H, 'AZARATH METRION ZINTHOS', 'RAVEN · SOUL-SELF', (L - 6) / 35, { portrait: BUST, band: 'rgba(10,2,22,0.94)', edge: '#a77bff', fill: '#ffffff', stroke: '#3c0a78', subFill: '#cbb6ff', fs: 0.07, y: 0.62 })
  letterbox(ctx, W, H, (L + (D.pauseAt ? 40 : 0)) / 12, (209 - L) / 18)
  if (inP3 && D.pk > 3 && D.pk < 60) subtitle(ctx, W, H, 'RAVEN', 'Your darkness will be your undoing.', clamp((D.pk - 3) / 6, 0, 1) * clamp((60 - D.pk) / 6, 0, 1), '#b48cff')
  if (L >= 172 && !released) subtitle(ctx, W, H, 'RAVEN', 'I\'m gonna pop your bubble.', clamp((L - 172) / 4, 0, 1), '#b48cff')
  if (released && rr > 40) subtitle(ctx, W, H, 'RAVEN', 'Azarath. Metrion. Zinthos.', clamp((rr - 40) / 10, 0, 1) * clamp((209 - L) / 10, 0, 1), '#b48cff')
  if (released) bigNumber(ctx, W, H, D.dmg, tc.x, tc.y - 50 * z, rr / 70, '#c9a8ff')
}
