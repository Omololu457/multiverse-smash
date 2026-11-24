// beerusUltFx.js — RENDER half of beerusUlt.js (Beerus' HAKAI — SPHERE OF DESTRUCTION). Reads beerusUltScene(); never
// writes sim state. One screen-space pass (cineRegistry.registerCineScreen — after the world, before the HUD):
//   1. the finished world frame RE-DRAWN scaled about the subject (push-ins / punch-zooms past camera.js's cap), graded
//      cold violet, then burning orange under the sphere;
//   2. a WORLD layer with the camera matrix × the push-in: Beerus himself from his own sheets (engine sprite hidden by
//      _fxAlpha 0), the Sphere of Destruction (his ki-ball sun art scaled to a small star), rising debris, the dome, the
//      smoke, the Hakai swirl, and the foe ERASED — their real sprite sampled into motes that drift away;
//   3. the SCREEN layer: sky burn, impact frames, the 破壊 call-out, captions, damage, letterbox + title cut-in.
// Render-only noise = integer hash of the scene's frame counters. Drawing kit shared with lightUltFx.js (read-only import).
import { registerCineScreen } from './cineRegistry.js'
import { image, ready, hash, clamp, ease, easeO, seg, blitSheet, blitAnim, worldXf, pushIn, card, letterbox, impactFrame,
  speedLines, vignette, titleCut, subtitle, drawPops, mat } from './lightUltFx.js'
import { beerusUltScene, BEERUS_CINE as B, beerusX } from './beerusUlt.js'

const VIO = '#c08aff', VIO_HI = '#efe0ff', SUN = '#ffb030'
const P1 = { url: './beerus_ki_ball_p1_u.png', n: 2, w: 86, h: 86 }       // small orange orbs
const P2 = { url: './beerus_ki_ball_p2_u.png', n: 6, w: 304, h: 308 }     // the sun (frames 1/3 crackle, 4/5 plain)
const P3 = { url: './beerus_ki_ball_p3_u.png', n: 4, w: 242, h: 184 }     // the dome landing
const HFX = { url: './beerus_hakai_fx_u.png', n: 4, w: 168, h: 140 }      // the Hakai swirl / ring
const view = { z: 1, x: 0, y: 0, last: -1 }
const dis = { key: -1, blocks: null }                                       // the foe's sampled sprite (render cache)
if (typeof Image !== 'undefined') for (const u of [P1.url, P2.url, P3.url, HFX.url, './beerus_ki_ball_u.png', './beerus_hakai_u.png', './beerus_mugshot.png']) image(u)

// the sphere: centre + radius for script frame k (world)
function sphere(sc, k, bx, tx) {
  const hand = sc.floor - 132, d = sc.d
  if (k < B.spark) return null
  const g = seg(k, B.spark, B.grow1), r = 3 + (B.rMax - 3) * Math.pow(ease(g), 1.35)
  const hx = bx + d * 4, hy = hand - r * 0.92
  if (k < B.flick) return { x: hx, y: hy, r }
  if (k < B.pulses[0]) { const p = seg(k, B.flick, B.pulses[0]), q = ease(p)
    return { x: hx + (tx - hx) * q, y: hy - 40 * Math.sin(p * Math.PI) + (sc.tFloor - r * 0.45 - hy) * p * p, r } }
  return null
}

function draw(ctx, canvas) {
  const sc = beerusUltScene()
  if (!sc) { view.last = -1; dis.key = -1; dis.blocks = null; return false }
  const W = canvas.width, H = canvas.height, u = H / 720
  const f = sc.caster, t = sc.target, k = sc.k, real = sc.real, d = sc.d, T = B.total
  const XF = worldXf(canvas), sp = (x, y) => XF.transformPoint({ x, y })
  const bx = beerusX(k), tx = (t.x || 0) + (t.w || 48) / 2, tcy = (t.y || 0) + (t.h || 94) * 0.45
  const sph = sphere(sc, k, bx, tx)
  const lastAge = sc.last ? real - sc.last.real : 99, lastPow = sc.last?.power || 0
  // ── 1. push-in ──
  let Z = 1, foc = sp(bx, sc.floor - 70)
  if (k < B.finger) { Z = 1.15 + 0.3 * ease(k / B.finger); foc = sp(bx, sc.floor - 95) }
  else if (k < B.grow0) { Z = 1.6 - 0.1 * ease(seg(k, B.finger, B.grow0)); foc = sp(bx + d * 6, sc.floor - 130) }
  else if (k < B.flick) { Z = 1.5 - 0.5 * ease(seg(k, B.grow0, B.grow1)); foc = sp(bx, sc.floor - 90 - (sph ? sph.r * 0.9 : 0)) }
  else if (k < B.smoke) { Z = 1.0 + 0.12 * ease(seg(k, B.pulses[0], B.smoke)); foc = sp((bx + tx) / 2, sc.tFloor - 110) }
  else if (k < B.palm) { Z = 1.12 + 0.25 * ease(seg(k, B.smoke, B.palm)); foc = sp(tx, tcy) }
  else if (k < B.settle) { Z = 1.45 + 0.15 * ease(seg(k, B.palm, B.hakai)) - 0.25 * ease(seg(k, B.hakai + 10, B.settle)); foc = sp((tx * 2 + bx) / 3, tcy - 10) }
  else { Z = 1.2 - 0.1 * ease(seg(k, B.settle, T)); foc = sp((tx + bx) / 2, sc.floor - 70) }
  if (lastAge >= 0 && lastAge < 6) Z += 0.18 * lastPow * (1 - lastAge / 6)
  if (view.last < 0) { view.z = Z; view.x = foc.x; view.y = foc.y } else { view.z += (Z - view.z) * 0.25; view.x += (foc.x - view.x) * 0.22; view.y += (foc.y - view.y) * 0.22 }
  view.last = real
  const burn = (sph ? clamp(sph.r / B.rMax, 0, 1) : 0) + (k >= B.pulses[0] && k < B.smoke + 20 ? 1 - seg(k, B.pulses[0] + 10, B.smoke + 20) : 0)
  const g0 = ease(k / 14)
  const grade = `saturate(${1 - 0.6 * g0 + 0.5 * burn}) brightness(${1 - 0.3 * g0 + 0.15 * burn}) hue-rotate(${(-18 * burn).toFixed(1)}deg)`
  const P = pushIn(ctx, canvas, view.z, view.x, view.y, grade)
  const M = P.multiply(XF), S = (x, y) => M.transformPoint({ x, y })
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(150,110,230,${0.45 * g0 * (1 - Math.min(1, burn))})`; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = `rgba(255,140,60,${0.4 * Math.min(1, burn)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'
  vignette(ctx, W, H, 'rgba(10,0,20,0.05)', `rgba(8,0,16,${0.72 - 0.2 * Math.min(1, burn)})`)
  // sky burn: the sun-glow seen through the frame
  if (sph) { const q = S(sph.x, sph.y), R = sph.r * M.a * 4; const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, Math.max(1, R)); gr.addColorStop(0, `rgba(255,200,90,${0.5 * burn})`); gr.addColorStop(1, 'rgba(255,90,20,0)')
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over' }
  ctx.restore()
  // ── 2. world ──
  ctx.save(); mat(ctx, M); world(ctx, sc, f, t, bx, tx, tcy, k, real, d, sph); ctx.restore()
  // ── 3. screen ──
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  screen(ctx, W, H, u, sc, S, f, t, bx, tx, tcy, k, real, sph)
  const bar = letterbox(ctx, W, H, k, T, VIO, u)
  titleCut(ctx, W, H, k, B.title, u, { band: 'rgba(14,6,24,0.93)', accent: VIO, streak: 'rgba(220,190,255,0.4)', portrait: './beerus_mugshot.png', title: 'HAKAI', sub: 'GOD OF DESTRUCTION · SPHERE OF DESTRUCTION', stroke: '#2a0a4a' })
  drawPops(ctx, M, sc.pops, real, u, '#ffe0b0')
  if (k >= T - 56 && sc.dealt > 0) card(ctx, `${Math.round(sc.dealt)} DMG${sc.guarded ? ' (GUARDED)' : ''}`, W * 0.84, bar + 40 * u, 28 * u, '#ffffff', clamp((k - T + 56) / 8, 0, 1) * clamp((T - k) / 10, 0, 1), -0.04, '#000000')
  subs(ctx, W, H, bar, u, k, sc)
  ctx.restore()
  return true
}

function glow(c, x, y, r, a, col) {
  if (a <= 0.01 || r <= 0) return
  c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.3, `rgba(${col},${a * 0.7})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore()
}
function beerus(c, f, key, fi, x, y, dir, o = {}) { return blitAnim(c, f, key, fi, x, y, dir, o) }

// sample the foe's own sprite into motes (render-only, cached once per Hakai)
function buildBlocks(t) {
  try {
    const N = 420, cv = document.createElement('canvas'); cv.width = N; cv.height = N
    const g = cv.getContext('2d', { willReadFrequently: true })
    const r = blitAnim(g, t, 'hurt', 0, N / 2, N - 10, t.facing || 1, {}) || blitAnim(g, t, 'idle', 0, N / 2, N - 10, t.facing || 1, {})
    if (!r) return null
    const data = g.getImageData(0, 0, N, N).data, out = [], st = 3
    let top = N, bot = 0
    for (let y = 0; y < N; y += st) for (let x = 0; x < N; x += st) { const i = ((y + 1) * N + x + 1) * 4; if (data[i + 3] > 60) { out.push({ x: x - N / 2, y: y - (N - 10), r: data[i], g: data[i + 1], b: data[i + 2] }); if (y < top) top = y; if (y > bot) bot = y } }
    const hgt = Math.max(1, bot - top)
    out.forEach((b, i) => { b.h = (b.y + (N - 10) - top) / hgt; b.n = hash(i, 911) })
    return out
  } catch (_) { return null }
}

function world(c, sc, f, t, bx, tx, tcy, k, real, d, sph) {
  // ── debris: the ground lifts toward the sphere ──
  if (k >= B.grow0 && k < B.pulses[0] + 4) {
    const a = seg(k, B.grow0, B.grow0 + 20)
    c.save()
    for (let i = 0; i < 34; i++) { const h1 = hash(i, 51), h2 = hash(i, 53), born = B.grow0 + h1 * 60; if (k < born) continue
      const age = k - born, x0 = bx + (h2 - 0.5) * 520, y = sc.floor - 4 - age * (1.2 + 2.2 * hash(i, 57)) - age * age * 0.02
      const x = x0 + (sph ? (sph.x - x0) * Math.min(0.5, age / 160) : 0), s = 3 + 7 * hash(i, 59)
      if (sph && Math.hypot(x - sph.x, y - sph.y) < sph.r) continue
      c.globalAlpha = a; c.fillStyle = i % 3 ? '#5b4636' : '#7a6450'; c.save(); c.translate(x, y); c.rotate(age / (8 + 10 * h1)); c.fillRect(-s / 2, -s / 2, s, s * 0.8); c.restore() }
    c.restore()
    // the ground cracks glow under him
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,170,60,${0.6 * a})`; c.lineWidth = 2
    for (let i = 0; i < 9; i++) { const an = (i / 9) * Math.PI + hash(i, 61) * 0.3, L = 40 + 140 * hash(i, 63) * seg(k, B.grow0, B.grow1); c.beginPath(); c.moveTo(bx, sc.floor - 1); c.lineTo(bx + Math.cos(an) * L, sc.floor - 1 + Math.sin(an) * L * 0.08); c.stroke() }
    c.restore()
  }
  // ── Beerus ──
  const hidden = k >= B.blink - 3 && k < B.blink
  if (!hidden) {
    let key = 'idle', fi = (real >> 3) & 3
    if (k >= B.finger && k < B.flick) { key = 'kiBall'; fi = k < B.spark + 6 ? Math.min(6, ((k - B.finger) / 2.6) | 0) : 6 + (((k >> 3) & 1)) }
    else if (k >= B.flick && k < B.flick + 8) { key = 'kiBall'; fi = 7 }   // the lazy flick (frames 8-10 are his lunge — not this)
    else if (k >= B.palm && k < B.hakai + 36) { key = 'hakai'; fi = 0 }
    beerus(c, f, key, fi, bx, sc.floor, d)
    // yawn bubble
    const ya = (k >= 8 && k < 38) ? seg(k, 8, 13) * (1 - seg(k, 32, 38)) : (sc.ko && k >= B.settle + 6 && k < B.settle + 40) ? seg(k, B.settle + 6, B.settle + 11) * (1 - seg(k, B.settle + 34, B.settle + 40)) : 0
    if (ya > 0) { c.save(); c.globalAlpha = ya; c.fillStyle = 'rgba(255,255,255,0.92)'; c.strokeStyle = '#1a0a2a'; c.lineWidth = 2
      const qx = bx + d * 48, qy = sc.floor - 150 - 4 * Math.sin(k / 6); c.beginPath(); c.ellipse(qx, qy, 40, 18, 0, 0, Math.PI * 2); c.fill(); c.stroke()
      c.fillStyle = '#1a0a2a'; c.font = '700 15px "Hiragino Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ふぁ〜あ…', qx, qy + 1); c.restore() }
  }
  // the blink: a violet shimmer where he was, and where he is
  const bl = k - B.blink
  if (bl >= -4 && bl < 14) { const x0 = sc.fx0 + (f.w || 48) / 2, x1 = (sc.kx ?? sc.fx0) + (f.w || 48) / 2
    if (bl < 6) glow(c, x0, sc.floor - 60, 70 * (1 - Math.max(0, bl) / 6), 0.6, '192,138,255')
    if (bl >= 0) glow(c, x1, sc.floor - 60, 80 * (1 - bl / 14), 0.7 * (1 - bl / 14), '192,138,255') }
  // ── the SPHERE OF DESTRUCTION ──
  if (sph) {
    const { x, y, r } = sph
    glow(c, x, y, r * 2.4, 0.55, '255,150,40')
    if (r < 26) { blitSheet(c, P1.url, P1.n, P1.w, P1.h, (real >> 2) & 1, x, y + r, 1, r / 20, { ax: 0.5 }) ; glow(c, x, y, r * 3 + 8, 0.9, '255,220,120') }
    else {
      const crackle = (real % 9) < 3, fi = crackle ? (((real / 9) | 0) & 1 ? 3 : 1) : 4 + ((real >> 2) & 1)
      blitSheet(c, P2.url, P2.n, P2.w, P2.h, fi, x, y + r * (crackle ? 1.6 : 1.02), 1, r / 95, { ax: 0.5 })
      // a surface that churns: a few hot flares rolling across the face
      c.save(); c.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 10; i++) { const an = hash(i, 71) * Math.PI * 2 + real / (20 + 20 * hash(i, 73)), rr = r * (0.2 + 0.7 * hash(i, 77)); c.globalAlpha = 0.35; c.fillStyle = '#fff2a0'; c.beginPath(); c.arc(x + Math.cos(an) * rr, y + Math.sin(an) * rr, r * 0.08, 0, Math.PI * 2); c.fill() }
      c.restore()
    }
    // the spark on the finger
    if (k < B.grow0 + 6) { const a = seg(k, B.spark, B.spark + 3) * (1 - seg(k, B.grow0, B.grow0 + 6)); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 2
      for (let i = 0; i < 4; i++) { const an = i * Math.PI / 4 + k / 10, L = 22 + 6 * Math.sin(k); c.beginPath(); c.moveTo(x - Math.cos(an) * L, y - Math.sin(an) * L); c.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); c.stroke() } c.restore() }
  }
  // ── the dome: impact at the foe, swallowing the stage ──
  const ia = k - B.pulses[0]
  if (ia >= 0 && ia < 60) {
    const fi = Math.min(3, (ia / 7) | 0), s = 1.6 + 1.2 * easeO(ia / 20)
    glow(c, tx, sc.tFloor - 40, 260 * easeO(ia / 12), 0.95 * (1 - ia / 60), '255,170,60')
    blitSheet(c, P3.url, P3.n, P3.w, P3.h, fi, tx, sc.tFloor + 10, 1, s, { ax: 0.5, alpha: 1 - seg(ia, 34, 60) })
    c.save(); c.globalCompositeOperation = 'lighter'
    for (const [i, at] of B.pulses.entries()) { const a = k - at; if (a < 0 || a > 26) continue
      for (let rr = 0; rr < 2; rr++) { const R = (a - rr * 3) * (18 + i * 4); if (R <= 0) continue; c.globalAlpha = 0.8 * (1 - a / 26); c.strokeStyle = rr ? SUN : '#ffffff'; c.lineWidth = 10 - rr * 4; c.beginPath(); c.ellipse(tx, sc.tFloor - 10, R, R * 0.3, 0, 0, Math.PI * 2); c.stroke() } }
    c.restore()
  }
  // smoke, rolling off the crater
  if (k >= B.pulses[0] + 18 && k < B.palm + 20) {
    const a = seg(k, B.pulses[0] + 18, B.smoke) * (1 - seg(k, B.blink, B.palm + 20))
    c.save()
    for (let i = 0; i < 16; i++) { const h1 = hash(i, 81), h2 = hash(i, 83), age = k - B.pulses[0], x = tx + (h1 - 0.5) * (160 + age * 2), y = sc.tFloor - 30 - h2 * 110 - age * 0.5, r = 40 + 40 * h2 + age * 0.6
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${i & 1 ? '70,58,76' : '96,84,100'},${0.55 * a})`); g.addColorStop(1, 'rgba(60,50,66,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2) }
    c.restore()
  }
  // ── HAKAI: the swirl closes on the foe, then the foe is erased ──
  if (k >= B.palm && k < B.hakai + 40) {
    const pa = k - B.palm, fi = k < B.hakai ? ((pa >> 2) & 1) : 3
    blitSheet(c, HFX.url, HFX.n, HFX.w, HFX.h, fi, tx, sc.tFloor + 30, 1, k < B.hakai ? 1.2 : 1.2 + 0.05 * (k - B.hakai), { ax: 0.5, alpha: k < B.hakai ? seg(k, B.palm, B.palm + 4) : 1 - seg(k, B.hakai, B.hakai + 40), comp: 'lighter' })
    // a thin violet thread from his palm to them
    if (k < B.hakai + 4) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; c.strokeStyle = VIO; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + d * 20, sc.floor - 96); c.lineTo(tx, tcy); c.stroke(); c.restore() }
  }
  if (k >= B.hakai) {
    if (dis.key !== sc.seed || !dis.blocks) { dis.blocks = buildBlocks(t); dis.key = sc.seed }
    const bl = dis.blocks
    if (bl) {
      const survive = !sc.ko, back = survive ? ease(seg(k, B.settle, B.settle + 28)) : 0, maxP = survive ? 0.6 : 1   // a survivor only frays
      const fx = (t.x || 0) + (t.w || 48) / 2, fy = (t.y || 0) + (t.h || 94)
      if (!(survive && k >= B.settle + 30)) {
        c.save(); c.globalCompositeOperation = 'source-over'
        for (let i = 0; i < bl.length; i++) {
          const b = bl[i], side = d > 0 ? (b.x < 0 ? 0 : 1) : (b.x > 0 ? 0 : 1)            // the side facing Beerus goes first
          const rel = B.hakai + 2 + 46 * (0.5 * b.n + 0.3 * (1 - b.h) + 0.2 * side)
          let age = k - rel
          if (survive && b.n > maxP) age = -1                                                  // most of a survivor holds
          let x = fx + b.x, y = fy + b.y, a = 1, col = `rgb(${b.r},${b.g},${b.b})`, s = 3
          if (age >= 0) {
            const drift = Math.min(age, 60) * (1 - back)
            x += d * drift * (0.4 + 1.2 * b.n) + Math.sin((age + i) / 6) * 3 * (1 - back); y -= drift * (0.5 + 1.4 * hash(i, 913)) * (1 - back)
            const w = Math.min(1, age / 10); col = w < 0.5 ? col : (i & 1 ? VIO : VIO_HI); a = survive ? 1 - 0.5 * (1 - back) * Math.min(1, age / 30) : 1 - Math.min(1, age / 42); s = 3 - 1.5 * Math.min(1, age / 40) * (1 - back)
          }
          if (a <= 0.02) continue
          c.globalAlpha = a; c.fillStyle = col; c.fillRect(x - s / 2, y - s / 2, s, s)
        }
        c.restore()
        // the motes glow
        if (k < B.hakai + 50) glow(c, fx, fy - (t.h || 94) * 0.5, 110, 0.4 * (1 - seg(k, B.hakai, B.hakai + 50)), '192,138,255')
      }
    }
  }
}

function screen(c, W, H, u, sc, S, f, t, bx, tx, tcy, k, real, sph) {
  // the spark: a tiny white flash
  if (k >= B.spark && k < B.spark + 3) { c.globalAlpha = 0.45 * (1 - (k - B.spark) / 3); c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  // the growth: heat shimmer lines rising
  if (sph && k >= B.grow0) { const q = S(sph.x, sph.y); speedLines(c, W, H, q.x, q.y, 0.12 + 0.12 * seg(k, B.grow0, B.grow1), (k >> 2), 44, '#ffd080') }
  if (k >= B.grow0 + 30 && k < B.flick) card(c, '破壊の球', W * 0.82, H * 0.3, 54 * u, '#ffe3a0', seg(k, B.grow0 + 30, B.grow0 + 38) * (1 - seg(k, B.flick - 6, B.flick)), 0.04, '#5a1a00', '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif')
  const la = sc.last ? real - sc.last.real : -1
  if (sc.last?.tag === 'heat' && la >= 0) impactFrame(c, W, H, la, 0, '#ff8a20', 0.3)
  if (sc.last?.tag === 'pulse' && la >= 0) {
    const tp = S(tx, sc.tFloor - 60), big = sc.last.k === B.pulses[0]
    impactFrame(c, W, H, la, big ? 3 : 0, '#ff7a10', big ? 0.5 : 0.3)
    if (la < 24) speedLines(c, W, H, tp.x, tp.y, 0.45 * (1 - la / 24), sc.last.k, 60, '#fff0c0')
    if (big && la >= 3 && la < 46) card(c, 'SPHERE OF DESTRUCTION', W / 2, H * 0.24, 64 * u * (la < 8 ? 1.8 - 0.8 * easeO((la - 3) / 5) : 1), '#fff0c0', clamp((46 - la) / 10, 0, 1), -0.05, '#5a1a00')
  }
  // the palm rises: everything goes quiet and dark around the foe
  if (k >= B.palm - 6 && k < B.hakai + 2) { const a = seg(k, B.palm - 6, B.hakai); c.fillStyle = `rgba(4,0,10,${0.45 * a})`; c.fillRect(0, 0, W, H) }
  if (sc.last?.tag === 'hakai' && la >= 0) {
    impactFrame(c, W, H, la, 2, '#6a20b0', 0.4)
    if (la >= 2 && la < 70) { const s = la < 7 ? 2.0 - easeO((la - 2) / 5) : 1, a = clamp((70 - la) / 12, 0, 1)
      card(c, '破壊', W * 0.8, H * 0.4, 130 * u * s, '#ffffff', a, 0, '#3a0a6a', '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif')
      card(c, 'HAKAI', W * 0.8, H * 0.4 + 90 * u, 40 * u, VIO_HI, a, 0, '#2a0a4a') }
  }
  if (k >= B.settle + 8) card(c, sc.ko ? 'ERASED' : 'SURVIVED A GOD', W / 2, H * 0.24, 46 * u, sc.ko ? VIO_HI : '#ffe0b0', seg(k, B.settle + 8, B.settle + 16) * clamp((B.total - k) / 10, 0, 1), -0.03, '#2a0a4a')
}

function subs(c, W, H, bar, u, k, sc) {
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(c, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  line(6, B.finger + 4, '“*yawn*… You interrupted a perfectly good nap.”')
  line(B.grow0, B.flick, '“Something small, then. Just enough to wipe out a planet.”')
  line(B.smoke + 2, B.palm + 2, '“Oh? Still standing. …Fine.”')
  line(B.settle + 2, B.total - 2, sc.ko ? '“Hmph. Wake me when someone interesting shows up.”' : '“You survived a Hakai? …Interesting. Don\'t bore me next time.”')
}

registerCineScreen('beerus_ult', draw)
