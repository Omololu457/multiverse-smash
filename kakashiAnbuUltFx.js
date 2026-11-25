// kakashiAnbuUltFx.js — RENDER-ONLY half of Kakashi (ANBU)'s "暗部 · RAIKIRI — FULL CHARGE" cinematic (kakashiAnbuUlt.js).
// One screen pass (world→screen from camera.js): the night grade + rising moon, the fox-mask manga panel (his own
// portrait art), his real Raikiri charge / loop / dash / strike strips, the full-charge gauge, the blackout streak, the
// three blink-cuts, impact frames, the giant-moon silhouette shot, the detonation, titles, subtitles, letterbox.
// Pure functions of the scene's frames; noise = integer hash (no Math.random / clock).
import { KA, anbuAt, foeAt } from './kakashiAnbuUlt.js'
import { image, ready, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  letterbox, subtitle, lineA, kanjiTitle, damagePops, bolt, glow, rings, wash, desat, cracks, portraitPanel } from './narutoUltFxKit.js'

const PORTRAIT = './kakashi_anbu_portrait.png'
const BLUE = '120,190,255'

export function preloadKakashiAnbuUlt(f, t) {
  image(PORTRAIT)
  for (const k of ['idle', 'raikiri_charge', 'raikiri_loop', 'raikiri_dash', 'raikiri_strike', 'anbuFlicker']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

const nightA = k => k < KA.afterAt ? smooth(k / 26) : 1 - smooth((k - KA.afterAt) / 36)

export function drawKakashiAnbuUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const thr = S.nums?.[3] ? S.real - S.nums[3].real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  const p = anbuAt(S, k), q = foeAt(S, k), kp = V.p(p.x, S.floor), qp = V.p(q.x, q.y), floorY = kp.y
  const hand = { x: kp.x + dir * 20 * z, y: kp.y - 40 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) night: blue-black grade, then the moon
  const n = nightA(k), charge = k >= KA.chargeAt ? smooth((k - KA.chargeAt) / 56) : 0
  desat(ctx, W, H, 0.85 * n, '#06102a', 0.85)
  wash(ctx, W, H, '#020616', 0.35 * n, 'multiply')
  moon(ctx, W * (dir > 0 ? 0.74 : 0.26), H * (0.34 - 0.08 * smooth(k / 40)), H * 0.13, n, charge, S.real)

  // 2) floor: the crater / cracks the full charge tears under him
  if (k >= KA.chargeAt && k < KA.afterAt + 30) {
    const a = k < KA.afterAt ? 1 : 1 - (k - KA.afterAt) / 30, cxv = V.p(S.fx0, 0).x
    ctx.save(); ctx.globalAlpha = a
    cracks(ctx, cxv, floorY + 2, 150 * z, charge, 41, 12, '#02040a', `rgba(${BLUE},0.8)`)
    ctx.restore()
  }

  // 3) the fighters (blackout + moon shot hide the world)
  const black = k >= KA.vanishAt && k < KA.thrustAt ? (k < KA.vanishAt + 6 ? (k - KA.vanishAt) / 6 : 1) * 0.9 : 0
  drawFoe(ctx, S, V, k, qp)
  if (black > 0) wash(ctx, W, H, '#000208', black)
  if (k >= KA.vanishAt && k < KA.thrustAt) drawFoeLit(ctx, S, V, k, qp)
  drawAnbu(ctx, S, V, k, kp, p)

  // 4) the full-charge Raikiri in his hand
  if (k >= KA.chargeAt && k < KA.vanishAt) {
    const hx = hand.x, hy = hand.y
    glow(ctx, hx, hy, (40 + 110 * charge) * z, BLUE, 0.9 * charge + 0.1); glow(ctx, hx, hy, (10 + 22 * charge) * z, '255,255,255', charge)
    for (let i = 0; i < 3 + Math.floor(charge * 8); i++) {
      const s = (S.real >> 1) * 7 + i * 13, ex = hx + (hash(s, 1) - 0.5) * 300 * z * (0.4 + charge), ey = hash(s, 3) < 0.55 ? floorY : hy - hash(s, 2) * 220 * z * charge
      bolt(ctx, hx, hy, ex, ey, s, 1.3 * z, '#9fd4ff', 8, 0.25)
    }
    if (!calmMotion()) sparks(ctx, hx, hy, z, S.real, charge)
    gauge(ctx, W, H, k, hx, hy - 70 * z, dir)
  }
  // 5) VANISH: the streak across the dark
  if (k >= KA.vanishAt && k < KA.flickAt + 2) {
    const u = (k - KA.vanishAt) / (KA.flickAt - KA.vanishAt), y = floorY - 45 * z, x0 = V.p(S.fx0, 0).x, x1 = lerp2(x0, qp.x + dir * 40 * z, outE(u))
    bolt(ctx, x0, y, x1, y, 300 + (S.real >> 1), 3 * z, '#bfe6ff', 14, 0.04)
    glow(ctx, x1, y, 90 * z, BLUE, 0.9)
    speedLines(ctx, W, H, qp.x, y, 70, 23, '#9fd4ff', 0.55, true, S.real)
  }
  // 6) the three blink-cuts: white crescents through the foe
  KA.cuts.forEach((at, i) => {
    const age = k - at; if (age < -1 || age > 10) return
    const a = clamp(1 - age / 10, 0, 1), cx = qp.x, cy = qp.y - 50 * z, an = [-0.5, 1.35, 0.35][i] * (dir > 0 ? 1 : -1), L = 220 * z
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(an); ctx.globalCompositeOperation = 'lighter'
    for (const [lw, al, col] of [[26 * z, 0.25, '#4a9cff'], [10 * z, 0.7, '#bfe6ff'], [3 * z, 1, '#ffffff']]) {
      ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = lw * (0.4 + 0.6 * a); ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-L * outE(age / 4), 0); ctx.quadraticCurveTo(0, -18 * z, L * outE(age / 4), 0); ctx.stroke()
    }
    ctx.restore()
    if (age < 3) glow(ctx, cx, cy, 120 * z, '220,240,255', 0.8)
  })
  if (k >= KA.flickAt && k < KA.thrustAt) for (let i = 0; i < 3; i++) { const s = 400 + i * 9 + (S.real >> 2); bolt(ctx, qp.x + (hash(s, 1) - 0.5) * 200 * z, qp.y - hash(s, 2) * 160 * z, qp.x + (hash(s, 3) - 0.5) * 200 * z, qp.y - hash(s, 4) * 160 * z, s, 1, '#7fbfff', 6, 0.3) }

  // 7) the thrust: burst out of the foe's back + the detonation
  if (thr >= 0 && k < KA.blastAt) {
    const a = clamp(1 - (k - KA.thrustAt) / 40, 0.3, 1), cx = qp.x, cy = qp.y - 48 * z
    glow(ctx, cx, cy, 170 * z, BLUE, 0.8 * a)
    for (let i = 0; i < 8; i++) { const s = i * 31 + (S.real >> 1), an = (hash(i, 9) - 0.5) * 1.4, L = (150 + hash(s, 2) * 240) * z
      bolt(ctx, cx, cy, cx + dir * Math.cos(an) * L, cy + Math.sin(an) * L, s, 2 * z * a + 0.5, '#bfe6ff', 9, 0.22) }
  }
  const br = k - KA.blastAt
  if (br >= 0 && br < 30) {
    const a = 1 - br / 30, cx = V.p(foeAt(S, KA.blastAt).x, 0).x, cy = floorY - 50 * z, R = Math.min(W * 0.32, 300 * z) * (0.5 + 0.5 * outE(br / 8))
    glow(ctx, cx, cy, 220 * z, BLUE, a)
    rings(ctx, cx, cy, br / 26, 460 * z, '#bfe6ff', 3, 0.45, 8 * z)
    if (br < 18) for (let i = 0; i < 7; i++) { const s = 200 + i * 17 + (br >> 1), an = -Math.PI * (0.1 + 0.8 * i / 6); bolt(ctx, cx, cy, cx + Math.cos(an) * R, cy + Math.sin(an) * R * 0.8, s, 2.5 * a + 0.5, '#9fd4ff', 9, 0.22) }
    wash(ctx, W, H, '#bfe6ff', 0.4 * a * a, 'lighter')
  }

  // 8) punch-ins (real close-ups of the finished frame)
  if (k >= 70 && k < KA.vanishAt) punchIn(ctx, canvas, W, H, hand.x, hand.y, 1 + 0.45 * smooth((k - 70) / 30))
  else if (thr >= 0 && thr < 5) punchIn(ctx, canvas, W, H, qp.x, qp.y - 50 * z, 1.5)

  // 9) impact frames on the thrust (white → inverted)
  if (thr >= 3 && thr < 11 && !calmFlash()) {
    const white = thr < 7, bg = white ? '#ffffff' : '#000814', fg = white ? '#000814' : '#9fd4ff'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, qp.x, qp.y - 50 * z, 90, 61 + thr, fg, 0.9, false, thr)
    ctx.translate(W / 2, H * 0.66); ctx.scale(2.1, 2.1); ctx.translate(-(kp.x + qp.x) / 2, -kp.y)
    sprite(ctx, f, ['raikiri_strike', 'idle'], 1, kp.x, kp.y, z, dir, { tint: fg, tintA: 1 })
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y, z, -dir, { tint: fg, tintA: 1, skew: -dir * 0.25 })
    ctx.restore()
  }
  // 10) THE MOON SHOT
  if (k >= KA.thrustAt + 6 && k < KA.blastAt) moonShot(ctx, W, H, S, k, kp, qp, z)

  damagePops(ctx, W, H, S, V, '#6ac0ff')
  ctx.restore()

  // 11) panels, titles
  if (k < KA.chargeAt + 4) maskPanel(ctx, W, H, S, k)
  if (k >= 4 && k < KA.chargeAt + 4) kanjiTitle(ctx, W, H, '暗部', 'ANBU · BLACK OPS', (k - 4) / (KA.chargeAt), { side: dir, fill: '#f2f4ff', stroke: '#0a0010', edge: '#c02030', ink: 'rgba(4,4,12,0.8)' })
  if (k >= KA.chargeAt + 14 && k < KA.vanishAt) kanjiTitle(ctx, W, H, '雷切', 'RAIKIRI · FULL CHARGE', (k - KA.chargeAt - 14) / (KA.vanishAt - KA.chargeAt - 14), { side: -dir, fill: '#e6f4ff', stroke: '#001a40', edge: '#6ac0ff', fs: 0.15 })
  if (thr >= 12 && k < KA.blastAt + 14) callout(ctx, W, H, thr, dir)

  letterbox(ctx, W, H, k, S.real, KA.total)
  subtitle(ctx, W, H, 'KAKASHI', 'A shinobi hides his intentions.', lineA(k, 4, 38), '#c8d8ff')
  subtitle(ctx, W, H, 'KAKASHI', "You've made up your mind, haven't you?", lineA(k, 60, 100), '#c8d8ff')
  subtitle(ctx, W, H, 'KAKASHI', "Underestimate me and you'll get hurt.", lineA(k, KA.afterAt + 6, KA.total - 2), '#c8d8ff')
  return true
}
const lerp2 = (a, b, u) => a + (b - a) * u

// ── fighters ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawAnbu(ctx, S, V, k, kp, p) {
  const f = S.caster, z = V.z, dir = S.dir
  if (k < KA.chargeAt) { sprite(ctx, f, ['idle'], (S.real >> 3) % 6, kp.x, kp.y, z, dir); return }
  if (k < KA.loopAt) { sprite(ctx, f, ['raikiri_charge', 'idle'], Math.min(4, (k - KA.chargeAt) >> 2), kp.x, kp.y, z, dir); return }
  if (k < KA.vanishAt) { sprite(ctx, f, ['raikiri_loop', 'raikiri_charge'], ((k - KA.loopAt) >> 2) % 10, kp.x, kp.y, z, dir); return }
  if (p.pose === 'streak') { if (k < KA.vanishAt + 5) sprite(ctx, f, ['raikiri_dash', 'idle'], (k - KA.vanishAt) >> 1, kp.x, kp.y, z, dir, { tint: '#bfe6ff', tintA: 0.5 }); return }
  if (p.pose === 'cut') {
    const d = p.flip ? -dir : dir, y = kp.y - (p.up || 0) * z, age = k - KA.cuts[p.i]
    if (!calmMotion()) for (let g = 3; g >= 1; g--) sprite(ctx, f, ['raikiri_dash', 'idle'], 7, kp.x - d * g * 26 * z, y, z, d, { alpha: 0.14 * (4 - g), tint: '#9fd4ff', tintA: 0.9 })
    sprite(ctx, f, age < 2 ? ['raikiri_dash', 'idle'] : ['raikiri_strike', 'idle'], age < 2 ? 7 : 1, kp.x, y, z, d, { rot: p.up ? 0.5 * d : 0 })
    return
  }
  if (p.pose === 'dash') {
    if (!calmMotion()) for (let g = 4; g >= 1; g--) sprite(ctx, f, ['raikiri_dash', 'idle'], 8, kp.x - dir * g * 34 * z, kp.y, z, dir, { alpha: 0.12 * (5 - g), tint: '#9fd4ff', tintA: 0.8 })
    sprite(ctx, f, ['raikiri_dash', 'idle'], 8, kp.x, kp.y, z, dir); return
  }
  if (k < KA.afterAt) { sprite(ctx, f, ['raikiri_strike', 'idle'], k < KA.blastAt ? ((k - KA.thrustAt) >> 3) % 3 : Math.min(8, 4 + ((k - KA.blastAt) >> 3)), kp.x, kp.y, z, dir); return }
  sprite(ctx, f, ['idle'], (S.real >> 3) % 6, kp.x, kp.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k >= KA.vanishAt && k < KA.thrustAt) return   // drawn lit, over the blackout
  if (S.blocked) { sprite(ctx, t, k < KA.flickAt ? ['idle'] : ['guard', 'idle'], 9, qp.x, qp.y, z, fdir); return }
  if (k < KA.thrustAt) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, qp.x, qp.y, z, fdir); return }
  if (k < KA.blastAt) { const sh = calmMotion() ? 0 : (hash(S.real, 7) - 0.5) * 6 * z
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x + sh, qp.y, z, fdir, { tint: '#bfe6ff', tintA: (S.real >> 1) % 2 ? 0.55 : 0.15, sx: 0.92 }); return }
  if (k < KA.landAt) { sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, fdir, { rot: (k - KA.blastAt) * 0.17 * S.dir, tint: '#bfe6ff', tintA: 0.2 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
  if (k < KA.landAt + 22) { const u = (k - KA.landAt) / 22; ctx.save(); ctx.globalAlpha = (1 - u) * 0.6; ctx.fillStyle = '#8a90a0'; ctx.beginPath(); ctx.ellipse(qp.x, qp.y, (30 + u * 80) * z, (8 + u * 12) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}
function drawFoeLit(ctx, S, V, k, qp) {   // the foe alone in the dark, rim-lit by the lightning; jolts on each cut
  const t = S.target, z = V.z, fdir = -S.dir
  const lastCut = KA.cuts.filter(a => a <= k).length, hurt = lastCut > 0 && !S.blocked
  const sh = hurt && !calmMotion() ? (hash(S.real, 7) - 0.5) * 5 * z : 0
  sprite(ctx, t, S.blocked ? ['guard', 'idle'] : hurt ? ['hurt', 'idle'] : ['idle'], S.blocked ? 9 : 0, qp.x + sh, qp.y, z, fdir, { tint: '#28406a', tintA: 0.55 })
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function moon(ctx, x, y, r, a, charge, real) {
  if (a <= 0.01) return
  const rgb = charge > 0 ? `${Math.round(255 - 120 * charge)},${Math.round(250 - 50 * charge)},255` : '255,250,230'
  glow(ctx, x, y, r * 3, rgb, 0.5 * a)
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, `rgb(${rgb})`); g.addColorStop(1, charge > 0.3 ? '#8fb8ff' : '#e8dcc0')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(80,90,120,0.18)'
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x + (hash(i, 1) - 0.5) * r * 1.2, y + (hash(i, 2) - 0.5) * r * 1.2, r * (0.08 + hash(i, 3) * 0.14), 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
  void real
}
function sparks(ctx, x, y, z, real, u) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#dff2ff'
  for (let i = 0; i < 30; i++) { const ph = ((real * 1.5 + hash(i, 3) * 20) % 20) / 20, an = hash(i, 4) * Math.PI * 2, r = ph * (50 + 120 * u) * z
    ctx.globalAlpha = (1 - ph) * u; ctx.fillRect(x + Math.cos(an) * r, y + Math.sin(an) * r, 2.5 * z, 2.5 * z) }
  ctx.restore()
}
function gauge(ctx, W, H, k, x, y, dir) {   // I · II · III — FULL CHARGE
  const lv = k >= 96 ? 3 : k >= 80 ? 2 : k >= 64 ? 1 : 0; if (lv === 0) return
  const fs = Math.round(H * 0.034), gx = clamp(x, W * 0.12, W * 0.88), gy = clamp(y, H * 0.2, H * 0.8)
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = 0; i < 3; i++) {
    const on = i < lv, px = gx + (i - 1) * fs * 1.6, age = k - [64, 80, 96][i], pop = on ? 1 + Math.max(0, 1 - age / 6) * 0.6 : 1
    ctx.save(); ctx.translate(px, gy); ctx.scale(pop, pop)
    ctx.fillStyle = on ? '#bfe6ff' : 'rgba(40,60,90,0.6)'; ctx.strokeStyle = '#001030'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, -fs * 0.6); ctx.lineTo(fs * 0.5, 0); ctx.lineTo(0, fs * 0.6); ctx.lineTo(-fs * 0.5, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.restore()
  }
  if (lv === 3) { const a = clamp((k - 96) / 4, 0, 1); ctx.globalAlpha = a; ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#001030'; ctx.lineJoin = 'round'
    ctx.strokeText('FULL CHARGE', gx, gy - fs * 1.3); ctx.fillStyle = '#e6f6ff'; ctx.fillText('FULL CHARGE', gx, gy - fs * 1.3) }
  ctx.restore(); void dir
}
// the opener: a manga panel — the teenage ANBU lowering the fox mask (his own portrait art)
function maskPanel(ctx, W, H, S, k) {
  const inU = outE(clamp(S.real / 9, 0, 1)), outU = clamp((KA.chargeAt + 4 - k) / 6, 0, 1), a = Math.min(inU, outU)
  if (a <= 0) return
  const pw = H * 0.5, ph = H * 0.5, side = S.dir > 0 ? -1 : 1
  const px = side < 0 ? W * 0.06 - (1 - inU) * pw : W * 0.94 - pw + (1 - inU) * pw, py = H * 0.17
  portraitPanel(ctx, PORTRAIT, null, px, py, pw, ph, { alpha: a, bg: '#e9ecf4', zoom: 1 + 0.08 * smooth(k / KA.chargeAt), edge: '#0a0a14',
    bgFn: (x, y, w, h) => { ctx.fillStyle = '#d7dcea'; for (let i = 0; i < 26; i++) { ctx.fillRect(x + (i / 26) * w, y, 1.5, h) } } })
  // the mask's red markings glint
  if (k > 14) glow(ctx, px + pw * 0.6, py + ph * 0.38, ph * 0.18, '255,60,60', 0.35 * a * (0.6 + 0.4 * Math.sin(S.real * 0.3)))
}
// the moon shot: a giant moon; Kakashi and the foe as black silhouettes, the blade blazing through
function moonShot(ctx, W, H, S, k, kp, qp, z) {
  const f = S.caster, t = S.target, dir = S.dir, u = (k - KA.thrustAt - 6) / (KA.blastAt - KA.thrustAt - 6)
  const a = Math.min(clamp((k - KA.thrustAt - 6) / 4, 0, 1), clamp((KA.blastAt - k) / 4, 0, 1))
  ctx.save(); ctx.globalAlpha = a
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#02040e'); sky.addColorStop(1, '#0b1838'); ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, H + 40)
  const mr = H * (0.4 + 0.05 * u), mx = W / 2, my = H * 0.5
  glow(ctx, mx, my, mr * 1.8, '200,225,255', 0.5)
  const g = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bcd2ff')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(90,110,160,0.16)'
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(mx + (hash(i, 1) - 0.5) * mr * 1.3, my + (hash(i, 2) - 0.5) * mr * 1.3, mr * (0.06 + hash(i, 3) * 0.12), 0, Math.PI * 2); ctx.fill() }
  // silhouettes, scaled up about the contact point (slow push-in)
  const sc = (2.4 + 0.3 * u) / Math.max(0.5, z), cxw = (kp.x + qp.x) / 2
  ctx.save(); ctx.translate(W / 2, H * 0.86); ctx.scale(sc, sc); ctx.translate(-cxw, -kp.y)
  sprite(ctx, f, ['raikiri_strike', 'idle'], 1, kp.x, kp.y, z, dir, { tint: '#02040a', tintA: 1 })
  sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y, z, -dir, { tint: '#02040a', tintA: 1, sx: 0.92 })
  const bx = qp.x, by = qp.y - 48 * z
  ctx.restore()
  // the blade through the foe, in screen space
  const sx = W / 2 + (bx - cxw) * sc, sy = H * 0.86 + (by - kp.y) * sc
  glow(ctx, sx, sy, 120 * sc * z * 0.6, BLUE, 0.9)
  for (let i = 0; i < 7; i++) { const s = 600 + i * 13 + (S.real >> 1), an = (hash(i, 5) - 0.5) * 1.2, L = (120 + hash(s, 2) * 260) * Math.min(2, sc * z * 0.5)
    bolt(ctx, sx, sy, sx + dir * Math.cos(an) * L, sy + Math.sin(an) * L, s, 3, '#bfe6ff', 9, 0.22) }
  glow(ctx, sx, sy, 30 * sc * z * 0.4, '255,255,255', 1)
  ctx.restore()
}
function callout(ctx, W, H, thr, dir) {
  const su = clamp((thr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (thr - 60) / 14, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.24 : 0.76), H * 0.22); ctx.rotate(-0.06 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.11)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#000a20'; ctx.strokeText('雷切!!', 0, 0); ctx.fillStyle = '#e6f6ff'; ctx.fillText('雷切!!', 0, 0)
  ctx.restore()
}
