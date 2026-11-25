// painUltFx.js — RENDER-ONLY half of Pain's "地爆天星 · CHIBAKU TENSEI" cinematic (painUlt.js). One screen pass (world→
// screen from camera.js): the rain-dark sky, the clasped-hands portrait, his real Chibaku cast strip, the black orb, the
// procedural gravity core + the stage floor ripping up in boulders that spiral into it, the foe dragged up and entombed,
// the moon's compression (purple light through the cracks), its collapse into a rain of rock, impact frames, titles,
// subtitles, letterbox. Pure functions of the scene's frames; noise = integer hash.
import { PN, foeLift } from './painUlt.js'
import { image, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  letterbox, subtitle, lineA, kanjiTitle, damagePops, glow, rings, wash, desat, cracks, portraitPanel, strip, skinned } from './narutoUltFxKit.js'

const PORTRAIT = './pain_portrait.png', CAST = './pain_chibaku_cast_uniform.png'
const PURPLE = '170,110,255'
const N = 54   // boulders

export function preloadPainUlt(f, t) {
  image(PORTRAIT); image(skinned(f, CAST)); image(CAST)
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  { const a = f?.animationData?.idle; if (a?.sheet) image(a.sheet) }
}

// boulder i: where it starts on the floor, when it tears loose, how big it is (world units, relative to the core)
const rock = i => ({ dx: (hash(i, 1) - 0.5) * 900, t0: PN.gravAt + 4 + Math.floor(hash(i, 2) * 80), r: 10 + hash(i, 3) * 24, spin: (hash(i, 4) - 0.5) * 0.3, sp: hash(i, 5) < 0.5 ? 1 : -1 })
const coreR = k => k < PN.gravAt ? 0 : k < PN.sealAt + 12 ? 10 + 170 * smooth((k - PN.gravAt) / (PN.sealAt + 12 - PN.gravAt)) : k < PN.crushAt ? 180 : k < PN.breakAt ? 180 - 18 * smooth((k - PN.crushAt) / 6) : 162

export function drawPainUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const big = S.nums?.find(n => n.big), cr = big ? S.real - big.real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  const pp = V.p(S.fx0, S.floor), base = V.p(S.tx0, S.tFloor), floorY = base.y, core = V.p(S.tx0, S.tFloor - PN.coreH), lift = foeLift(k), qp = V.p(S.tx0, S.tFloor - lift)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the sky: dark, purple-tinged; a gravity well darkens around the core
  const skyA = k < PN.landAt + 10 ? smooth(k / 30) : 1 - smooth((k - PN.landAt - 10) / 16)
  desat(ctx, W, H, 0.8 * skyA, '#1a0e2a', 0.6)
  if (k >= PN.gravAt && k < PN.landAt) { const a = smooth((k - PN.gravAt) / 30) * (k < PN.breakAt ? 1 : 1 - (k - PN.breakAt) / (PN.landAt - PN.breakAt))
    const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, W * 0.7); g.addColorStop(0, `rgba(10,0,20,${(0.55 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(10,0,20,0)'); ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40) }

  // 2) the ground: holes where boulders tore loose
  for (let i = 0; i < N; i++) { const r = rock(i); if (k < r.t0) continue; const x = V.p(S.tx0 + r.dx, 0).x
    ctx.save(); ctx.globalAlpha = k < PN.landAt + 20 ? 0.8 : 0.8 * (1 - (k - PN.landAt - 20) / 20); ctx.fillStyle = '#07040a'; ctx.beginPath(); ctx.ellipse(x, floorY + 3, r.r * 1.6 * z, r.r * 0.35 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  if (k >= PN.gravAt) { ctx.save(); ctx.globalAlpha = k < PN.landAt + 20 ? 1 : 1 - (k - PN.landAt - 20) / 20; cracks(ctx, base.x, floorY + 2, 420 * z, clamp((k - PN.gravAt) / 60, 0, 1), 13, 18, '#0a0612', `rgba(${PURPLE},0.35)`); ctx.restore() }

  // 3) Pain
  drawPain(ctx, S, k, pp, z, f)

  // 4) the orb rising into the sky
  if (k >= PN.throwAt + 8 && k < PN.gravAt + 8) {
    const u = clamp((k - PN.throwAt - 8) / (PN.orbUp - PN.throwAt - 8), 0, 1), hx = pp.x + dir * 14 * z, hy = pp.y - 120 * z
    const x = hx + (core.x - hx) * outE(u), y = hy + (core.y - hy) * outE(u)
    glow(ctx, x, y, 40 * z, PURPLE, 0.8); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 5 * z, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = `rgba(${PURPLE},0.8)`; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(x, y); ctx.stroke(); ctx.restore()
  }

  // 5) the foe (dragged up; entombed)
  drawFoe(ctx, S, V, k, qp)

  // 6) boulders in flight + the core / moon
  const R = coreR(k) * z
  if (k >= PN.gravAt && k < PN.breakAt) {
    // in-flight boulders spiral into the core
    for (let i = 0; i < N; i++) { const r = rock(i), u = (k - r.t0) / 34; if (u < 0 || u >= 1) continue
      const sx = V.p(S.tx0 + r.dx, 0).x, sy = floorY, an = (1 - u) * 2.2 * r.sp, ex = core.x, ey = core.y
      const mx = sx + (ex - sx) * u * u, my = sy + (ey - sy) * outE(u)
      const ox = Math.cos(an + 1.6) * (1 - u) * 60 * z, oy = Math.sin(an) * (1 - u) * 30 * z
      boulder(ctx, mx + ox, my + oy, r.r * z * (1 - 0.3 * u), i, k * r.spin, 1) }
    // the core: a black singularity growing into a moon of rock
    if (R > 0) moon(ctx, core.x, core.y, R, k, S.real, z, cr)
  }
  // the rocks that strike the foe on the way up
  PN.rocks.forEach((at, i) => { const a = k - at; if (a < -8 || a > 10) return
    if (a < 0) { const u = (a + 8) / 8, sx = qp.x + (i % 2 ? 1 : -1) * 240 * z, sy = floorY; boulder(ctx, sx + (qp.x - sx) * u, sy + (qp.y - 50 * z - sy) * u, (14 + i * 2) * z, 300 + i, a * 0.2, 1) }
    else { rings(ctx, qp.x, qp.y - 50 * z, a / 10, 120 * z, '#d8c8ff', 2, 0.6, 5 * z); if (a < 3) glow(ctx, qp.x, qp.y - 50 * z, 90 * z, '255,255,255', 0.7) } })
  // the collapse: the moon breaks apart and the rock rains down
  if (k >= PN.breakAt && k < PN.landAt + 30) {
    const u = (k - PN.breakAt) / 40
    for (let i = 0; i < 40; i++) { const an = hash(i, 6) * Math.PI * 2, rr = 160 * z * Math.sqrt(hash(i, 7)), v = (60 + hash(i, 8) * 160) * z
      const x = core.x + Math.cos(an) * (rr + v * u), y = core.y + Math.sin(an) * (rr + v * u * 0.6) + 520 * z * u * u
      if (y > floorY + 10) continue
      boulder(ctx, x, y, (10 + hash(i, 9) * 24) * z, 500 + i, u * 3 * (hash(i, 1) - 0.5), clamp(1.5 - u, 0, 1)) }
    if (k < PN.breakAt + 10) { glow(ctx, core.x, core.y, 260 * z, PURPLE, 1 - (k - PN.breakAt) / 10); rings(ctx, core.x, core.y, (k - PN.breakAt) / 10, 420 * z, '#e0d0ff', 2, 1, 7 * z) }
  }
  if (k >= PN.landAt && k < PN.landAt + 20) { const a = (k - PN.landAt) / 20; ctx.save(); ctx.globalAlpha = (1 - a) * 0.6; ctx.fillStyle = '#7a6a80'; ctx.beginPath(); ctx.ellipse(base.x, floorY, (40 + a * 130) * z, (10 + a * 16) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }

  // 7) rain + speed lines during the pull
  if (!calmMotion() && skyA > 0) rain(ctx, W, H, S.real, skyA * 0.8)
  if (k >= PN.gravAt && k < PN.sealAt) speedLines(ctx, W, H, core.x, core.y, 60, 33, '#cbb6ff', 0.35 * smooth((k - PN.gravAt) / 20), true, S.real)

  // 8) close-ups + impact frames on the compression
  if (k >= 8 && k < PN.throwAt) punchIn(ctx, canvas, W, H, pp.x, pp.y - 70 * z, 1 + 0.3 * smooth((k - 8) / 24))
  if (k >= PN.sealAt + 6 && k < PN.crushAt) punchIn(ctx, canvas, W, H, core.x, core.y, 1 + 0.3 * smooth((k - PN.sealAt - 6) / 16))
  else if (cr >= 0 && cr < 4) punchIn(ctx, canvas, W, H, core.x, core.y, 1.5)
  if (cr >= 3 && cr < 11 && !calmFlash()) {
    const white = cr < 7, bg = white ? '#ffffff' : '#0c0418', fg = white ? '#0c0418' : '#c8a0ff'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, core.x, core.y, 90, 51 + cr, fg, 0.9, false, cr)
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(core.x, core.y, R * 1.05, 0, Math.PI * 2); ctx.fill()
    strip(ctx, skinned(f, CAST), 6, 2, pp.x, pp.y, 2 * z, { dir, tint: fg })
    ctx.restore()
  }
  damagePops(ctx, W, H, S, V, '#b48cff')
  ctx.restore()

  // 9) panels / titles
  if (k < PN.throwAt + 2) { const a = Math.min(clamp(S.real / 6, 0, 1), clamp((PN.throwAt + 2 - k) / 6, 0, 1)), ph = H * 0.52
    portraitPanel(ctx, PORTRAIT, [40, 20, 340, 380], dir > 0 ? W * 0.05 : W * 0.95 - ph * 0.9, H * 0.16, ph * 0.9, ph, { alpha: a, bg: '#2a2036', edge: '#000', zoom: 1 + 0.06 * smooth(k / 40) }) }
  if (k >= 6 && k < PN.throwAt + 2) kanjiTitle(ctx, W, H, '輪廻眼', 'RINNEGAN', (k - 6) / (PN.throwAt - 4), { side: dir, fill: '#f0e8ff', stroke: '#160628', edge: '#b48cff' })
  if (k >= PN.throwAt + 6 && k < PN.sealAt) kanjiTitle(ctx, W, H, '地爆天星', 'CHIBAKU TENSEI', (k - PN.throwAt - 6) / (PN.sealAt - PN.throwAt - 6), { side: -dir, fill: '#f0e8ff', stroke: '#160628', edge: '#b48cff', fs: 0.12 })
  if (cr >= 12 && k < PN.breakAt + 6) callout(ctx, W, H, cr, dir)

  letterbox(ctx, W, H, k, S.real, PN.total)
  subtitle(ctx, W, H, 'PAIN', 'This world shall know pain.', lineA(k, 2, PN.throwAt), '#b48cff')
  subtitle(ctx, W, H, 'PAIN', 'Chibaku Tensei!', lineA(k, PN.throwAt, PN.gravAt + 10), '#b48cff')
  subtitle(ctx, W, H, 'PAIN', 'Know that you are powerless.', lineA(k, PN.landAt + 8, PN.total - 2), '#b48cff')
  return true
}

function drawPain(ctx, S, k, pp, z, f) {
  const dir = S.dir, src = skinned(f, CAST)
  if (k < PN.throwAt) { strip(ctx, src, 6, 0, pp.x, pp.y, 2 * z, { dir }); return }
  if (k < PN.breakAt + 10) { strip(ctx, src, 6, k < PN.throwAt + 6 ? 1 : 2, pp.x, pp.y, 2 * z, { dir }); return }
  sprite(ctx, f, ['idle'], (S.real >> 3) % 4, pp.x, pp.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k >= PN.sealAt + 8 && k < PN.breakAt) return   // inside the moon
  if (k < PN.liftAt) { sprite(ctx, t, S.blocked && k >= PN.gravAt ? ['guard', 'idle'] : ['idle'], S.blocked ? 9 : (S.real >> 3) % 4, qp.x, qp.y, z, fdir); return }
  if (k < PN.landAt) { const hitR = S.nums?.some(n => S.real - n.real < 6), sh = hitR && !calmMotion() ? (hash(S.real, 7) - 0.5) * 6 * z : 0
    sprite(ctx, t, ['hurt', 'idle'], hitR ? 0 : 9, qp.x + sh, qp.y, z, fdir, { rot: Math.sin((k - PN.liftAt) * 0.05) * 0.5 * S.dir, alpha: k >= PN.sealAt ? 1 - (k - PN.sealAt) / 8 : 1 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function boulder(ctx, x, y, r, seed, rot, a) {
  if (a <= 0 || r < 0.5) return
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot)
  ctx.beginPath(); for (let i = 0; i < 7; i++) { const an = i / 7 * Math.PI * 2, rr = r * (0.7 + 0.35 * hash(seed, i)); i ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr) }
  ctx.closePath()
  const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#8a7a6a'); g.addColorStop(1, '#3a3028'); ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = '#1e1812'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke()
  ctx.restore()
}
function moon(ctx, x, y, R, k, real, z, cr) {
  // the gravity halo
  glow(ctx, x, y, R * 2.2, PURPLE, k < PN.sealAt ? 0.45 : 0.25)
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip()
  const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R); g.addColorStop(0, '#6a5a4c'); g.addColorStop(1, '#16100c'); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2)
  // packed rock on the surface (more as it grows)
  const n = Math.min(80, Math.floor(R / z / 1.8))
  for (let i = 0; i < n; i++) { const an = hash(i, 11) * Math.PI * 2, rr = R * Math.sqrt(hash(i, 12)) * 0.95; boulder(ctx, x + Math.cos(an) * rr, y + Math.sin(an) * rr, (10 + hash(i, 13) * 18) * z, 900 + i, an, 0.9) }
  // the black singularity at the heart while it is still feeding
  if (k < PN.sealAt + 10) { const a = 1 - clamp((k - PN.sealAt) / 10, 0, 1); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, Math.min(R * 0.5, 22 * z), 0, Math.PI * 2); ctx.fill() }
  // rim shade
  const rim = ctx.createRadialGradient(x, y, R * 0.6, x, y, R); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,0.65)'); ctx.fillStyle = rim; ctx.fillRect(x - R, y - R, R * 2, R * 2)
  ctx.restore()
  // the compression: purple light bleeding through the cracks
  if (cr >= 0 && k < PN.breakAt) {
    const a = clamp(1 - cr / 50, 0.3, 1)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${PURPLE},${a.toFixed(3)})`; ctx.lineCap = 'round'
    for (let i = 0; i < 14; i++) { let px = x, py = y; const an = i / 14 * Math.PI * 2 + hash(i, 2); ctx.lineWidth = (2 + 3 * hash(i, 3)) * z; ctx.beginPath(); ctx.moveTo(px, py)
      for (let s = 1; s <= 5; s++) { px = x + Math.cos(an + (hash(i, s) - 0.5) * 0.6) * R * s / 5; py = y + Math.sin(an + (hash(i, s + 9) - 0.5) * 0.6) * R * s / 5; ctx.lineTo(px, py) }
      ctx.stroke() }
    ctx.restore(); glow(ctx, x, y, R * 1.6, PURPLE, 0.6 * a)
  }
  void real
}
function rain(ctx, W, H, real, a) {
  ctx.save(); ctx.strokeStyle = 'rgba(200,200,230,0.4)'; ctx.lineWidth = 1.2; ctx.globalAlpha = a; ctx.beginPath()
  for (let i = 0; i < 100; i++) { const x = (hash(i, 1) * (W + 200) + real * 3) % (W + 200) - 100, y = (hash(i, 2) * H + real * (22 + hash(i, 3) * 10)) % (H + 60) - 30; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 26) }
  ctx.stroke(); ctx.restore()
}
function callout(ctx, W, H, cr, dir) {
  const su = clamp((cr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (cr - 56) / 12, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.26 : 0.74), H * 0.24); ctx.rotate(-0.05 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.1)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#160628'; ctx.strokeText('地爆天星!!', 0, 0); ctx.fillStyle = '#f4eeff'; ctx.fillText('地爆天星!!', 0, 0)
  ctx.restore()
}
