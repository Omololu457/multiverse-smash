// kakashiUltFx.js — RENDER-ONLY half of Kakashi's SHARINGAN · RAIKIRI — I CUT LIGHTNING cinematic (kakashiUlt.js).
// One screen pass: world→screen from camera.js; Kakashi drawn from his real Raikiri charge / dash / support strips, the
// foe from theirs; the headband-up Sharingan close-up (his own portrait art), procedural lightning everywhere (arcs into
// the floor, the blade, the burst out of the foe's back, the sky bolt), the burning trench, the red prediction ghosts,
// titles, impact frames, letterbox. Pure functions of the scene's frames; noise = integer hash.
import { KB, kakashiX, foeAt } from './kakashiUlt.js'
import { image, ready, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  letterbox, subtitle, lineA, kanjiTitle, damagePops, bolt, glow, rings, wash, desat } from './narutoUltFxKit.js'

const PORTRAIT = './kakashi_portrait.png'
const BLUE = '120,190,255'

export function preloadKakashiUlt(f, t) {
  image(PORTRAIT)
  for (const k of ['idle', 'kakashiRaikiriCharge', 'kakashiRaikiriDash', 'kakashiRaikiriSupport', 'win']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

export function drawKakashiUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.nums?.[0] ? S.real - S.nums[0].real : -1, dr = S.nums?.[1] ? S.real - S.nums[1].real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 14, y: (hash(S.real, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  const kx = kakashiX(S, k), q = foeAt(S, k), kp = V.p(kx, S.floor), qp = V.p(q.x, q.y), floorY = kp.y
  const hand = { x: kp.x + dir * 22 * z, y: kp.y - 52 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grading: blue-black while Raikiri sings; red while the Sharingan predicts
  const blueA = k >= KB.chargeAt ? (k < KB.landAt + 20 ? smooth((k - KB.chargeAt) / 20) * 0.75 : 0.75 * (1 - smooth((k - KB.landAt - 20) / 30))) : 0
  desat(ctx, W, H, blueA, '#0a1a40', 0.6)
  if (k >= KB.predictAt && k < KB.dashAt) wash(ctx, W, H, '#600008', 0.45 * Math.min(1, (k - KB.predictAt) / 4, (KB.dashAt - k) / 4), 'multiply')

  // 2) the floor: scorch under him, the burning trench of the dash
  if (k >= KB.chargeAt) { ctx.save(); ctx.globalAlpha = 0.6 * smooth((k - KB.chargeAt) / 30); ctx.fillStyle = '#05070c'; ctx.beginPath(); ctx.ellipse(V.p(S.fx0, 0).x, floorY + 2, 60 * z, 9 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  if (k >= KB.dashAt) trench(ctx, S, V, k, floorY, z)

  // 3) prediction ghosts (the foe's next moves, in red, ahead of them)
  if (k >= KB.predictAt && k < KB.dashAt + 4) for (let g = 1; g <= 3; g++) sprite(ctx, t, g === 2 ? ['guard', 'idle'] : ['hurt', 'idle'], g, qp.x + dir * g * 26 * z, qp.y - (g === 3 ? 20 * z : 0), z, -dir, { alpha: 0.35 / g + 0.1, tint: '#ff2030', tintA: 0.9 })

  // 4) fighters
  drawFoe(ctx, S, V, k, qp)
  drawKakashi(ctx, S, V, k, kp, hand)

  // 5) lightning
  if (k >= KB.chargeAt && k < KB.pierceAt) {
    const u = smooth((k - KB.chargeAt) / 40), hx = k >= KB.dashAt ? kp.x + dir * 40 * z : hand.x, hy = k >= KB.dashAt ? kp.y - 40 * z : hand.y
    glow(ctx, hx, hy, (30 + 60 * u) * z, BLUE, 0.9 * u); glow(ctx, hx, hy, (10 + 14 * u) * z, '255,255,255', u)
    if (k < KB.dashAt) for (let i = 0; i < 3 + Math.floor(u * 5); i++) {   // arcs crawling into the floor and the air
      const s = (S.real >> 1) * 7 + i * 13, ex = hx + (hash(s, 1) - 0.5) * 220 * z, ey = hash(s, 3) < 0.6 ? floorY : hy - hash(s, 2) * 150 * z
      bolt(ctx, hx, hy, ex, ey, s, 1.2 * z, '#9fd4ff', 7, 0.25)
    }
    if (!calmMotion()) sparks(ctx, hx, hy, z, S.real, u)
  }
  if (pr >= 0 && k < KB.blastEnd) {   // the burst out of the foe's back
    const a = clamp(1 - (k - KB.pierceAt) / 46, 0, 1), cx = qp.x, cy = qp.y - 50 * z
    glow(ctx, cx, cy, 160 * z, BLUE, 0.8 * a)
    for (let i = 0; i < 9; i++) { const s = i * 31 + (S.real >> 1), an = (hash(i, 9) - 0.5) * 1.6, L = (160 + hash(s, 2) * 260) * z
      bolt(ctx, cx, cy, cx + dir * Math.cos(an) * L, cy + Math.sin(an) * L, s, 2 * z * a + 0.5, '#bfe6ff', 9, 0.22) }
    rings(ctx, cx, cy, clamp((S.real - (S.nums[0].real)) / 30, 0, 1), 380 * z, '#bfe6ff', 3, 0.5, 8 * z)
  }
  if (dr >= 0 && dr < 40) {   // the discharge: a bolt from the sky + a screen-wide branching web
    const a = 1 - dr / 40, cx = V.p(foeAt(S, KB.dischargeAt).x, 0).x
    bolt(ctx, cx + (hash(3, 1) - 0.5) * 80, -20, cx, floorY - 40 * z, 77 + (dr >> 1), 6 * z * a + 1, '#cfeaff', 12, 0.16)
    for (let i = 0; i < 7; i++) { const s = 200 + i * 17 + (dr >> 1); bolt(ctx, cx, floorY - 60 * z, (i + 0.5) / 7 * W, hash(s, 4) * H * 0.4, s, 2 * a + 0.5, '#9fd4ff', 10, 0.2) }
    wash(ctx, W, H, '#bfe6ff', 0.35 * a * a, 'lighter')
  }
  if (k >= KB.dashAt && k < KB.pierceAt) speedLines(ctx, W, H, qp.x, qp.y - 50 * z, 80, 19, '#dff2ff', 0.7, true, S.real)

  // 6) punch-ins
  if (k >= KB.chargeAt + 20 && k < KB.predictAt) punchIn(ctx, canvas, W, H, hand.x, hand.y, 1 + 0.4 * smooth((k - KB.chargeAt - 20) / 26))
  else if (pr >= 0 && pr < 4) punchIn(ctx, canvas, W, H, qp.x, qp.y - 50 * z, 1.5)

  // 7) panels + titles
  if (k < KB.chargeAt + 2) sharinganPanel(ctx, W, H, S, k)
  if (k >= 14 && k < KB.chargeAt + 2) kanjiTitle(ctx, W, H, '写輪眼', 'SHARINGAN', (k - 14) / (KB.chargeAt + 2 - 14), { side: -dir, fill: '#ffe6e6', stroke: '#3a0006', edge: '#ff4040' })
  if (k >= KB.chargeAt + 10 && k < KB.dashAt) kanjiTitle(ctx, W, H, '雷切', S.empowered ? 'RAIKIRI · MANGEKYŌ' : 'RAIKIRI · LIGHTNING BLADE', (k - KB.chargeAt - 10) / (KB.dashAt - KB.chargeAt - 10), { side: dir, fill: '#e6f4ff', stroke: '#001a40', edge: '#6ac0ff', fs: 0.15 })
  if (k >= KB.predictAt && k < KB.dashAt) eyeInset(ctx, W, H, S, k)
  if (pr >= 10 && k < KB.dischargeAt + 20) cutCall(ctx, W, H, pr, dir)

  // 8) impact frames on the pierce
  if (pr >= 4 && pr < 11 && !calmFlash()) {
    const white = pr < 7, bg = white ? '#ffffff' : '#000814', fg = white ? '#000814' : '#9fd4ff'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, qp.x, qp.y - 50 * z, 90, 61 + pr, fg, 0.9, false, pr)
    ctx.translate(W / 2, H * 0.64); ctx.scale(2, 2); ctx.translate(-(kp.x + qp.x) / 2, -kp.y)
    sprite(ctx, f, [S.empowered ? 'kakashiRaikiriSupport' : 'kakashiRaikiriDash', 'idle'], 2, kp.x, kp.y, z, dir, { tint: fg, tintA: 1 })
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y, z, -dir, { tint: fg, tintA: 1, sx: 0.85, skew: -dir * 0.25 })
    ctx.restore()
  }
  damagePops(ctx, W, H, S, V, '#6ac0ff')
  ctx.restore()

  letterbox(ctx, W, H, k, S.real, KB.total)
  subtitle(ctx, W, H, 'KAKASHI', 'Kakashi of the Sharingan.', lineA(k, 2, 34), '#6ac0ff')
  subtitle(ctx, W, H, 'KAKASHI', 'I cut through lightning itself.', lineA(k, KB.chargeAt + 30, KB.dashAt), '#6ac0ff')
  subtitle(ctx, W, H, 'KAKASHI', "That's the end. Next!", lineA(k, KB.lowerAt, KB.total - 2), '#6ac0ff')
  return true
}

// ── fighters ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawKakashi(ctx, S, V, k, kp, hand) {
  const f = S.caster, z = V.z, dir = S.dir, dashKey = S.empowered ? 'kakashiRaikiriSupport' : 'kakashiRaikiriDash'
  if (k < KB.chargeAt) { sprite(ctx, f, ['idle'], (S.real >> 3) % 6, kp.x, kp.y, z, dir); return }
  if (k < KB.dashAt) { sprite(ctx, f, ['kakashiRaikiriCharge', 'idle'], k < KB.chargeAt + 10 ? 0 : k < KB.chargeAt + 24 ? 1 : 2, kp.x, kp.y, z, dir); return }
  if (k < KB.pierceAt) {
    if (!calmMotion()) for (let g = 5; g >= 1; g--) sprite(ctx, f, [dashKey, 'idle'], 1, kp.x - dir * g * 30 * z, kp.y, z, dir, { alpha: 0.12 * (6 - g), tint: '#9fd4ff', tintA: 0.8 })
    sprite(ctx, f, [dashKey, 'idle'], k < KB.pierceAt - 6 ? 0 : 1, kp.x, kp.y, z, dir); return
  }
  if (k < KB.lowerAt - 10) { sprite(ctx, f, [dashKey, 'idle'], S.empowered ? 2 : (k < KB.dischargeAt ? 2 : 3), kp.x, kp.y, z, dir); return }
  sprite(ctx, f, ['win', 'idle'], Math.min(9, (k - KB.lowerAt + 10) >> 2), kp.x, kp.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (S.blocked) { sprite(ctx, t, k < KB.dashAt ? ['idle'] : ['guard', 'idle'], 9, qp.x, qp.y, z, fdir); return }
  if (k < KB.pierceAt) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, qp.x, qp.y, z, fdir); return }
  if (k < KB.dischargeAt) {   // convulsing on the blade
    const sh = calmMotion() ? 0 : (hash(S.real, 7) - 0.5) * 6 * z
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x + sh, qp.y, z, fdir, { tint: '#bfe6ff', tintA: (S.real >> 1) % 2 ? 0.55 : 0.15, sx: 0.92 }); return
  }
  if (k < KB.landAt) { sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, fdir, { rot: (k - KB.dischargeAt) * 0.16 * S.dir, tint: '#bfe6ff', tintA: 0.2 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
  if (k < KB.landAt + 22) { const u = (k - KB.landAt) / 22; ctx.save(); ctx.globalAlpha = (1 - u) * 0.6; ctx.fillStyle = '#8a90a0'; ctx.beginPath(); ctx.ellipse(qp.x, qp.y, (30 + u * 80) * z, (8 + u * 12) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function trench(ctx, S, V, k, floorY, z) {   // the furrow torn through the floor by the dash, smouldering
  const x0 = V.p(S.fx0, 0).x, x1 = V.p(kakashiX(S, Math.min(k, KB.pierceAt)), 0).x, a = clamp(1 - (k - KB.landAt - 20) / 40, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#0a0a10'; ctx.beginPath(); ctx.moveTo(x0, floorY); ctx.lineTo(x1, floorY - 2 * z); ctx.lineTo(x1, floorY + 5 * z); ctx.lineTo(x0, floorY + 3 * z); ctx.closePath(); ctx.fill()
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${BLUE},${(0.8 * clamp(1 - (k - KB.pierceAt) / 50, 0.15, 1)).toFixed(3)})`; ctx.lineWidth = 2 * z
  ctx.beginPath(); ctx.moveTo(x0, floorY + 1); ctx.lineTo(x1, floorY + 1); ctx.stroke()
  if (!calmMotion()) for (let i = 0; i < 16; i++) { const u = hash(i, 4), px = x0 + (x1 - x0) * u, ph = ((k + i * 7) % 30) / 30
    ctx.globalAlpha = a * (1 - ph) * 0.5; ctx.fillStyle = '#8a8a9a'; ctx.beginPath(); ctx.arc(px + ph * 10 * z, floorY - ph * 40 * z, (4 + ph * 10) * z, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function sparks(ctx, x, y, z, real, u) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#dff2ff'
  for (let i = 0; i < 24; i++) { const ph = ((real * 1.5 + hash(i, 3) * 20) % 20) / 20, an = hash(i, 4) * Math.PI * 2, r = ph * (40 + 80 * u) * z
    ctx.globalAlpha = (1 - ph) * u; ctx.fillRect(x + Math.cos(an) * r, y + Math.sin(an) * r, 2.5 * z, 2.5 * z) }
  ctx.restore()
}
// the portrait close-up: the headband slides up off the Sharingan, the tomoe spin
function sharinganPanel(ctx, W, H, S, k) {
  const im = image(PORTRAIT); if (!ready(im)) return
  const a = Math.min(clamp(S.real / 6, 0, 1), clamp((KB.chargeAt + 2 - k) / 6, 0, 1))
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, H)
  speedLines(ctx, W, H, W / 2, H * 0.5, 60, 3, '#3a4a6a', 0.5, true, S.real)
  const s = (H * 0.86) / im.naturalHeight * (1 + 0.08 * smooth(k / KB.chargeAt)), dw = im.naturalWidth * s, dh = im.naturalHeight * s
  const ox = W / 2 - dw / 2, oy = H * 0.5 - dh / 2
  ctx.imageSmoothingEnabled = false; ctx.drawImage(im, ox, oy, dw, dh)
  // the eye (portrait px ≈ 207,144)
  const ex = ox + 207 * s, ey = oy + 144 * s, lift = smooth((k - 12) / 12)
  // the scarred lid: closed (a skin patch + lash line), then it snaps open on the Sharingan
  const open = smooth((k - 16) / 8)
  if (open < 1) {
    ctx.save(); ctx.fillStyle = '#f2cfb4'; ctx.beginPath(); ctx.ellipse(ex, ey, 17 * s, 9 * s * (1 - open), 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a2420'; ctx.lineWidth = Math.max(2, 2.2 * s); ctx.beginPath(); ctx.moveTo(ex - 16 * s, ey + 1 * s); ctx.quadraticCurveTo(ex, ey + 5 * s * (1 - open), ex + 16 * s, ey); ctx.stroke(); ctx.restore()
  }
  void lift
  if (k >= 22) {   // the Sharingan wakes
    const g = clamp((k - 22) / 8, 0, 1), r = 7 * s, spin = S.real * 0.18
    glow(ctx, ex, ey, r * 5, '255,40,40', 0.7 * g)
    ctx.save(); ctx.globalAlpha = a * g
    ctx.fillStyle = '#c0101a'; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#300004'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.arc(ex, ey, r * 0.6, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#120002'; ctx.beginPath(); ctx.arc(ex, ey, r * 0.22, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < 3; i++) { const an = spin + i * Math.PI * 2 / 3; ctx.beginPath(); ctx.arc(ex + Math.cos(an) * r * 0.6, ey + Math.sin(an) * r * 0.6, r * 0.16, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
  ctx.restore()
}
function eyeInset(ctx, W, H, S, k) {   // a letterboxed strip: the spinning Sharingan reading the future
  const u = (k - KB.predictAt) / (KB.dashAt - KB.predictAt), bh = H * 0.16 * outE(clamp(u * 4, 0, 1)), y = H * 0.2
  ctx.save(); ctx.fillStyle = '#0a0002'; ctx.fillRect(0, y - bh / 2, W, bh); ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip()
  const ex = W * (S.dir > 0 ? 0.3 : 0.7), r = H * 0.06
  ctx.fillStyle = '#f4efe8'; ctx.beginPath(); ctx.ellipse(ex, y, r * 2.6, r * 0.9, 0, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.clip()
  ctx.fillStyle = '#c0101a'; ctx.beginPath(); ctx.arc(ex, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#120002'; ctx.beginPath(); ctx.arc(ex, y, r * 0.22, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 3; i++) { const an = S.real * 0.35 + i * Math.PI * 2 / 3; ctx.beginPath(); ctx.arc(ex + Math.cos(an) * r * 0.6, y + Math.sin(an) * r * 0.6, r * 0.15, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
  ctx.font = `900 ${Math.round(H * 0.04)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = S.dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ff6060'; ctx.fillText('I CAN SEE IT.', W * (S.dir > 0 ? 0.46 : 0.54), y)
  ctx.restore()
}
function cutCall(ctx, W, H, pr, dir) {
  const su = clamp((pr - 10) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (pr - 60) / 14, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.3 : 0.7), H * 0.24); ctx.rotate(-0.07 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.1)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.22; ctx.strokeStyle = '#001030'; ctx.strokeText('RAIKIRI!!', 0, 0); ctx.fillStyle = '#e6f6ff'; ctx.fillText('RAIKIRI!!', 0, 0)
  ctx.restore()
}
