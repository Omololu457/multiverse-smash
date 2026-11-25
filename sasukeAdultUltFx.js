// sasukeAdultUltFx.js — RENDER-ONLY half of Sasuke (Adult)'s "輪廻眼 · 天手力 → 地爆天星 · 千鳥刀" (sasukeAdultUlt.js).
// One screen pass (world→screen from camera.js): violet-grey wash, the Rinnegan lens over his face, the Amenotejikara space
// ripples + swap after-images, his real sword / Chidori / Chibaku strips, the black core + the rock cocoon, Chidori lightning
// down the blade, the white / inverted pierce frame, lightning through the cracks, the shatter + rock rain, titles,
// subtitles, letterbox. Pure functions of the scene's frames; noise = integer hash.
import { SA, SWAP, swapIndex } from './sasukeAdultUlt.js'
import { sprite, view, punchIn, speedLines, wash, desat, calligraphy, sub, letterbox, glow, rings, impactFrame, damageNumber, debris,
  hash, clamp, smooth, outE, calmMotion, calmFlash } from './bleachUltKit.js'
import { kanjiTitle, bolt, cracks } from './narutoUltFxKit.js'

const VIOLET = '160,110,255', BLUE = '150,200,255', WHO = 'SASUKE', WHO_COL = '#b48cff'
const RINGS = 6

export function drawSasukeAdultUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const cr = S.hitReal != null ? S.real - S.hitReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 10, y: (hash(S.real, 2) - 0.5) * 10 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), foeMid = V.p(S.tx, S.tFloor - (S.ty || 0) - 50)
  const core = V.p(S.tx0, S.tFloor - SA.lift - 50), floorY = V.p(0, S.tFloor).y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) world: violet-grey
  const wa = k < SA.pierceAt + 40 ? smooth(k / 20) : 1 - smooth((k - SA.pierceAt - 40) / 28)
  desat(ctx, W, H, 0.8 * wa); wash(ctx, W, H, '#2a1848', 0.42 * wa, 'multiply')
  if (k >= SA.chibakuAt && k < SA.pierceAt + 10) {   // gravity darkening around the core
    const a = smooth((k - SA.chibakuAt) / 20)
    const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, W * 0.6); g.addColorStop(0, `rgba(8,0,18,${(0.6 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(8,0,18,0)')
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40)
  }

  // 2) ground cracks under the core
  if (k >= SA.liftAt) cracks(ctx, V.p(S.tx0, 0).x, floorY + 2, 320 * z, clamp((k - SA.liftAt) / 40, 0, 1), 23, 14, '#0a0612', `rgba(${VIOLET},0.35)`)

  // 3) the foe (hidden inside the sealed cocoon)
  drawFoe(ctx, S, k, tp, z, cr)

  // 4) the cocoon / core
  if (k >= SA.chibakuAt + 6 && k < SA.pierceAt + 2) cocoon(ctx, S, k, core, z)
  if (k >= SA.liftAt && k < SA.sealAt + 4 && !calmMotion()) {   // rocks torn from the floor, spiralling up into the core
    for (let i = 0; i < 26; i++) { const t0 = SA.liftAt + hash(i, 3) * 26, u = (k - t0) / 18; if (u < 0 || u >= 1) continue
      const sx = core.x + (hash(i, 1) - 0.5) * 520 * z, an = (1 - u) * 2.4 * (i % 2 ? 1 : -1)
      const x = sx + (core.x - sx) * u * u + Math.cos(an) * (1 - u) * 40 * z, y = floorY + (core.y - floorY) * outE(u)
      rock(ctx, x, y, (6 + hash(i, 2) * 12) * z, 700 + i, an) }
  }

  // 5) Sasuke
  drawSasuke(ctx, S, k, fp, z, cr)

  // 6) Amenotejikara ripples + cut arcs
  SA.swaps.forEach((at, i) => {
    const a = k - (at - 4); if (a < 0 || a > 18) return
    const from = i === 0 ? V.p(S.fx0, S.floor - 50) : V.p(S.tx0 + SWAP[i - 1].side * dir * 70, S.floor - 50), to = V.p(S.tx0 + SWAP[i].side * dir * 70, S.floor - 50)
    ripple(ctx, from.x, from.y, a / 18, z, i); ripple(ctx, to.x, to.y, a / 18, z, i + 5)
    if (a >= 4 && a < 14) cutArc(ctx, foeMid.x, foeMid.y, 80 * z, i, (a - 4) / 10)
    if (a >= 4 && a < 7) glow(ctx, foeMid.x, foeMid.y, 100 * z, '255,255,255', 0.7)
  })

  // 7) Chidori: lightning down the blade, the leap, the pierce
  if (k >= SA.chidoriAt && k < SA.pierceAt + 4) {
    const bx = fp.x + dir * 34 * z, by = fp.y - 52 * z, a = smooth((k - SA.chidoriAt) / 8)
    glow(ctx, bx, by, 80 * z, BLUE, 0.7 * a)
    for (let j = 0; j < 6; j++) { const an = hash(S.real, j) * Math.PI * 2, r = (30 + hash(S.real, j + 9) * 50) * z
      bolt(ctx, bx, by, bx + Math.cos(an) * r, by + Math.sin(an) * r * 0.7, S.real * 7 + j, 1.6 * z, '#bfe6ff', 6, 0.3) }
    if (k >= SA.leapAt) speedLines(ctx, W, H, core.x, core.y, 60, 19, '#cfe6ff', 0.4, true, S.real)
  }
  if (cr >= 0 && cr < 50) {   // lightning bursting through the cocoon's cracks + the shatter
    if (cr < 26) for (let j = 0; j < 12; j++) { const an = j / 12 * Math.PI * 2 + hash(j, 4), r = (120 + cr * 14) * z
      bolt(ctx, core.x, core.y, core.x + Math.cos(an) * r, core.y + Math.sin(an) * r, 900 + j + (cr >> 2) * 13, 2.4 * z, '#bfe6ff', 8, 0.25) }
    for (let i = 0; i < 36; i++) { const an = hash(i, 6) * Math.PI * 2, v = (4 + hash(i, 7) * 9) * z, tt = cr
      const x = core.x + Math.cos(an) * (40 * z + v * tt * 1.6), y = core.y + Math.sin(an) * (30 * z + v * tt) + 0.22 * tt * tt * z
      if (y < floorY + 6) rock(ctx, x, y, (6 + hash(i, 9) * 14) * z, 500 + i, tt * 0.1 * (hash(i, 1) - 0.5)) }
    if (cr < 12) { glow(ctx, core.x, core.y, 260 * z, BLUE, 1 - cr / 12); rings(ctx, core.x, core.y, cr / 14, 3, 420 * z, '#e8f2ff', 9 * z, 0.8) }
    debris(ctx, V.p(S.land, 0).x, floorY, cr - 22, 22, z, 41)
  }

  // 8) close-ups + impact frames
  if (k >= 8 && k < SA.swapAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 96 * z, 1 + 0.6 * smooth((k - 8) / 22))
  else if (k >= SA.swapAt && k < SA.chibakuAt) punchIn(ctx, canvas, W, H, foeMid.x, foeMid.y + 30 * z, 1.22 + (S.lastCut && S.real - S.lastCut.real < 5 ? 0.16 - (S.real - S.lastCut.real) * 0.03 : 0))
  else if (k >= SA.chidoriAt && k < SA.leapAt) punchIn(ctx, canvas, W, H, fp.x + dir * 20 * z, fp.y - 50 * z, 1 + 0.35 * smooth((k - SA.chidoriAt) / 14))
  else if (cr >= 0 && cr < 4) punchIn(ctx, canvas, W, H, core.x, core.y, 1.5)
  if (k < SA.swapAt + 2) rinnegan(ctx, W, H, k, S.real, dir)
  if (cr >= 2 && cr < 12 && !calmFlash()) {
    const white = cr < 7, bg = white ? '#ffffff' : '#08041a', fg = white ? '#08041a' : '#9fd0ff'
    const cx = W / 2 + dir * W * 0.1, cy = H * 0.5, Z = Math.max(2.2, z * 1.8)
    impactFrame(ctx, W, H, bg, fg, cx, cy, 71 + cr, S.real, col => {
      ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, H * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      sprite(ctx, f, ['chidori', 'idle'], 6, cx - dir * H * 0.17, cy + H * 0.2, Z, dir, { tint: col, tintA: 1, rot: dir * -0.35 })
    })
  }

  // 9) numbers
  if (S.lastHit && S.real - S.lastHit.real < 22 && cr < 0) {
    const age = S.real - S.lastHit.real, fs = Math.round(H * 0.05 * (1 + Math.max(0, 1 - age / 5) * 0.7))
    ctx.save(); ctx.globalAlpha = clamp(1.4 - age / 16, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const x = clamp(foeMid.x + (hash(S.hits, 3) - 0.5) * 80, W * 0.1, W * 0.9), y = clamp(foeMid.y - 70 * z - age * 1.5, H * 0.18, H * 0.8)
    ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#12002a'; ctx.strokeText(String(Math.round(S.lastHit.d)), x, y); ctx.fillStyle = S.blocked ? '#ffd27a' : '#c9a6ff'; ctx.fillText(String(Math.round(S.lastHit.d)), x, y); ctx.restore()
  }
  if (cr >= 12) damageNumber(ctx, W, H, S, core.x, core.y - 40 * z, cr - 12, '#b48cff')
  ctx.restore()

  // 10) titles
  if (k >= 4 && k < SA.swapAt + 4) calligraphy(ctx, W, H, '輪廻眼', (k - 4) / (SA.swapAt), { x: dir > 0 ? 0.86 : 0.14, y: 0.22, col: '#f0e8ff', edge: '#14062a', glow: 'rgba(160,110,255,0.9)' })
  if (k >= SA.swapAt + 2 && k < SA.swapAt + 62) kanjiTitle(ctx, W, H, '天手力', 'AMENOTEJIKARA', (k - SA.swapAt - 2) / 60, { side: -dir, fill: '#f0e8ff', stroke: '#14062a', edge: '#b48cff', fs: 0.11 })
  if (k >= SA.chibakuAt + 4 && k < SA.chidoriAt) kanjiTitle(ctx, W, H, '地爆天星', 'CHIBAKU TENSEI', (k - SA.chibakuAt - 4) / (SA.chidoriAt - SA.chibakuAt - 4), { side: dir, fill: '#f0e8ff', stroke: '#14062a', edge: '#b48cff', fs: 0.1 })
  if (k >= SA.chidoriAt + 2 && k < SA.pierceAt) kanjiTitle(ctx, W, H, '千鳥刀', 'CHIDORI BLADE', (k - SA.chidoriAt - 2) / (SA.pierceAt - SA.chidoriAt - 2), { side: -dir, fill: '#eaf6ff', stroke: '#06142a', edge: '#8fd0ff', fs: 0.11 })
  if (cr >= 12 && cr < 72) callout(ctx, W, H, cr, dir)

  letterbox(ctx, W, H, S.real, k, SA.total - 14)
  sub(ctx, W, H, k, 2, SA.swapAt, WHO, 'These eyes see everything you are about to do.', WHO_COL)
  sub(ctx, W, H, k, SA.swapAt + 6, SA.chibakuAt - 4, WHO, 'Too slow. I can trade places with anything I see.', WHO_COL)
  sub(ctx, W, H, k, SA.chibakuAt + 4, SA.chidoriAt - 2, WHO, 'Chibaku Tensei.', WHO_COL)
  sub(ctx, W, H, k, SA.chidoriAt + 2, SA.pierceAt, WHO, 'Chidori!', '#8fd0ff')
  sub(ctx, W, H, k, SA.pierceAt + 34, SA.total - 2, WHO, "You're a thousand years too early.", WHO_COL)
  return true
}

// ── people ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawSasuke(ctx, S, k, fp, z, cr) {
  const f = S.caster, dir = S.dir, face = S.fFace || dir
  if (k < SA.swapAt) { sprite(ctx, f, k < 22 ? ['idle'] : ['swordSwap', 'idle'], k < 22 ? (S.real >> 3) % 4 : Math.min(2, (k - 22) >> 3), fp.x, fp.y, z, dir); return }
  if (k < SA.chibakuAt) {
    const i = swapIndex(k); if (i < 0) { sprite(ctx, f, ['swordSwap', 'idle'], 3, fp.x, fp.y, z, dir, { alpha: 0.5 }); return }
    const sw = SWAP[i], a = k - SA.swaps[i]
    if (a < 0) { sprite(ctx, f, ['swordSwap', 'idle'], 4, fp.x, fp.y, z, face, { alpha: 0.4 + (a + 4) * 0.15, tint: '#b48cff', tintA: 0.6 }); return }
    sprite(ctx, f, [sw.anim, 'heavy'], a < 8 ? sw.fr : sw.fr + 1, fp.x, fp.y, z, face)
    return
  }
  if (k < SA.chidoriAt) { sprite(ctx, f, ['chibakuTensei', 'idle'], Math.min(4, (k - SA.chibakuAt) >> 3), fp.x, fp.y, z, dir); glow(ctx, fp.x + dir * 30 * z, fp.y - 70 * z, 30 * z, VIOLET, 0.6); return }
  if (k < SA.leapAt) { sprite(ctx, f, ['chidori', 'idle'], Math.min(3, (k - SA.chidoriAt) >> 2), fp.x, fp.y, z, dir); return }
  if (k < SA.pierceAt) {
    for (let g = 4; g >= 1; g--) sprite(ctx, f, ['chidori', 'idle'], 6, fp.x - dir * g * 26 * z, fp.y + g * 6 * z, z, dir, { alpha: 0.12 * (5 - g), tint: '#9fd0ff', tintA: 0.8 })
    sprite(ctx, f, ['chidori', 'idle'], 6, fp.x, fp.y, z, dir); return
  }
  const late = k > SA.pierceAt + 40
  sprite(ctx, f, late ? ['idle'] : ['heavy'], late ? (S.real >> 3) % 4 : 4, fp.x, fp.y, z, dir)
}
function drawFoe(ctx, S, k, tp, z, cr) {
  const t = S.target, fdir = -S.dir
  if (k >= SA.sealAt && cr < 4 && !S.blocked) return   // inside the cocoon
  if (k < SA.swaps[0]) { sprite(ctx, t, S.blocked && k >= SA.swapAt ? ['guard', 'idle'] : ['idle'], S.blocked ? 9 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (k < SA.pierceAt) {
    const recent = S.lastCut && S.real - S.lastCut.real < 6, sh = recent && !calmMotion() ? (hash(S.real, 7) - 0.5) * 8 * z : 0
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], S.blocked ? 9 : 0, tp.x + sh, tp.y, z, fdir, { rot: k >= SA.liftAt && !S.blocked ? Math.sin(k * 0.08) * 0.35 : 0 }); return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  sprite(ctx, t, (S.ty || 0) > 2 ? ['hurt', 'idle'] : ['knockdown', 'hurt'], (S.ty || 0) > 2 ? 0 : 9, tp.x, tp.y, z, fdir, { rot: (S.ty || 0) > 2 ? cr * 0.12 * S.dir : 0 })
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function rinnegan(ctx, W, H, k, real, dir) {   // a lens inset: the eye opening, rings + six tomoe
  const a = Math.min(clamp((k - 6) / 8, 0, 1), clamp((SA.swapAt + 2 - k) / 6, 0, 1)); if (a <= 0) return
  const r = H * 0.16, x = dir > 0 ? W * 0.27 : W * 0.73, y = H * 0.4, open = smooth((k - 6) / 14)
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#05020c'; ctx.beginPath(); ctx.arc(x, y, r * 1.18, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#b48cff'; ctx.lineWidth = Math.max(3, H * 0.006); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.08, r * 0.6 * open + 1, 0, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#e8e2f0'; ctx.fillRect(x - r * 1.2, y - r, r * 2.4, r * 2)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.62); g.addColorStop(0, '#d8c8ff'); g.addColorStop(1, '#7a52c8'); ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#2a1050'; ctx.lineWidth = Math.max(1.5, r * 0.03)
  for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(x, y, r * 0.62 * i / 4.4, 0, Math.PI * 2); ctx.stroke() }
  ctx.fillStyle = '#14062a'
  for (let i = 0; i < RINGS; i++) { const an = i / RINGS * Math.PI * 2 + real * 0.03, rr = r * (i % 2 ? 0.3 : 0.44)
    ctx.beginPath(); ctx.arc(x + Math.cos(an) * rr, y + Math.sin(an) * rr, r * 0.05, 0, Math.PI * 2); ctx.fill() }
  ctx.beginPath(); ctx.arc(x, y, r * 0.06, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // ripples spreading off the eye
  for (let j = 0; j < 3; j++) { const u = ((k - 10 + j * 8) % 24) / 24; if (k < 10) break
    ctx.save(); ctx.globalAlpha = a * (1 - u) * 0.8; ctx.strokeStyle = `rgba(${VIOLET},1)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * (1.2 + u * 1.2), 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
}
function ripple(ctx, x, y, u, z, seed) {   // the Amenotejikara space-swap: a violet diamond distortion
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let j = 0; j < 3; j++) { const uj = clamp(u * 1.4 - j * 0.15, 0, 1); if (uj <= 0 || uj >= 1) continue
    const r = (12 + uj * 90) * z
    ctx.globalAlpha = (1 - uj) * 0.9; ctx.strokeStyle = j === 1 ? '#ffffff' : `rgba(${VIOLET},1)`; ctx.lineWidth = (5 - j) * z
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r * 1.3); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.stroke() }
  if (u < 0.3) glow(ctx, x, y, 70 * z, VIOLET, 1 - u / 0.3)
  ctx.restore(); void seed
}
function cutArc(ctx, x, y, R, seed, u) {
  const a = 1 - u, rot = (hash(seed, 3) - 0.5) * 2.2
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalCompositeOperation = 'lighter'
  for (const [w, col, al] of [[R * 0.2, `rgba(${VIOLET},1)`, 0.5], [R * 0.08, 'rgba(220,210,255,1)', 0.9], [R * 0.025, '#ffffff', 1]]) {
    ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.25, R * 0.36, 0, -1.1 * outE(u * 2) - 0.2, 1.1 * outE(u * 2) + 0.2); ctx.stroke() }
  ctx.restore()
}
function rock(ctx, x, y, r, seed, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  ctx.beginPath(); for (let i = 0; i < 7; i++) { const an = i / 7 * Math.PI * 2, rr = r * (0.7 + 0.35 * hash(seed, i)); i ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr) }
  ctx.closePath(); const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#8a7f90'); g.addColorStop(1, '#2e2834'); ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = '#140f18'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke(); ctx.restore()
}
function cocoon(ctx, S, k, c, z) {
  const grow = smooth((k - SA.chibakuAt - 6) / (SA.sealAt + 6 - SA.chibakuAt - 6)), R = (14 + 80 * grow) * z
  glow(ctx, c.x, c.y, R * 2.2, VIOLET, 0.5)
  if (k < SA.sealAt) { ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(6 * z, R * 0.25), 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  const n = Math.floor(10 + grow * 34)
  for (let i = 0; i < n; i++) { const an = hash(i, 11) * Math.PI * 2 + (k < SA.sealAt ? k * 0.03 : 0), rr = R * (0.75 + 0.25 * hash(i, 12)) * (k < SA.sealAt ? 1 : 0.95)
    rock(ctx, c.x + Math.cos(an) * rr, c.y + Math.sin(an) * rr * 0.92, (8 + hash(i, 13) * 12) * z * (0.5 + grow * 0.7), 300 + i, an) }
  if (k >= SA.sealAt) {   // sealed: a solid ball of rock, rim-shaded
    ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, R * 0.82, 0, Math.PI * 2); const g = ctx.createRadialGradient(c.x - R * 0.3, c.y - R * 0.3, R * 0.1, c.x, c.y, R); g.addColorStop(0, '#6a6070'); g.addColorStop(1, '#1a1420'); ctx.fillStyle = g; ctx.fill(); ctx.restore()
    for (let i = 0; i < 18; i++) { const an = hash(i, 15) * Math.PI * 2, rr = R * 0.6 * Math.sqrt(hash(i, 16)); rock(ctx, c.x + Math.cos(an) * rr, c.y + Math.sin(an) * rr, (8 + hash(i, 17) * 10) * z, 400 + i, an) }
    if (k >= SA.leapAt) {   // the Chidori's light leaking through
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${BLUE},${(0.4 + 0.5 * smooth((k - SA.leapAt) / 14)).toFixed(3)})`; ctx.lineWidth = 2 * z
      for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2 + hash(i, 2); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + Math.cos(an) * R * 0.85, c.y + Math.sin(an) * R * 0.85); ctx.stroke() }
      ctx.restore() }
  }
}
function callout(ctx, W, H, cr, dir) {
  const su = clamp((cr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (cr - 58) / 14, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.26 : 0.74), H * 0.25); ctx.rotate(-0.05 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.1)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#06142a'; ctx.strokeText('千鳥!!', 0, 0); ctx.fillStyle = '#eaf6ff'; ctx.fillText('千鳥!!', 0, 0)
  ctx.restore()
}
