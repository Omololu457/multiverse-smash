// kakashiWarUltFx.js — RENDER-ONLY half of Kakashi (Kamui)'s "神威雷切 · KAMUI RAIKIRI" cinematic (kakashiWarUlt.js).
// One screen pass (world→screen from camera.js): the eye banner (his portrait + a spinning Mangekyō pinwheel), his real
// Raikiri charge / loop / strike + Mangekyō-cast strips, the Kamui vortex that swallows the foe, the Kamui dimension
// (procedural cube-pillars in a black void, its own screen composition), the pierce + impact frames, the ejection
// detonation back on the real stage, his Icha Icha aftermath, titles, subtitles, letterbox.
// Pure functions of the scene's frames; noise = integer hash (no Math.random / clock).
import { KW, foeAt } from './kakashiWarUlt.js'
import { image, ready, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  letterbox, subtitle, lineA, kanjiTitle, damagePops, bolt, glow, rings, wash, desat, portraitPanel } from './narutoUltFxKit.js'

const PORTRAIT = './kakashi_war_portrait.png'
const BLUE = '120,190,255'

export function preloadKakashiWarUlt(f, t) {
  image(PORTRAIT)
  for (const k of ['idle', 'raikiri_charge', 'raikiri_loop', 'raikiri_strike', 'mangekyou_cast', 'win']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown', 'fall', 'jump']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

export function drawKakashiWarUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.nums?.[0] ? S.real - S.nums[0].real : -1, dr = S.nums?.[1] ? S.real - S.nums[1].real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  const q = foeAt(S, k), kp = V.p(S.fx0, S.floor), qp = V.p(q.x, q.y), floorY = kp.y
  const hand = { x: kp.x + dir * 22 * z, y: kp.y - 42 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  if (k >= KW.dimAt - 4 && k < KW.ejectAt + 4) {
    dimension(ctx, canvas, W, H, S, k, pr)
  } else {
    // ── the real stage ──
    const blueA = k >= KW.chargeAt ? (k < KW.afterAt ? smooth((k - KW.chargeAt) / 20) * 0.6 : 0.6 * (1 - smooth((k - KW.afterAt) / 30))) : 0
    desat(ctx, W, H, blueA, '#0a1430', 0.5)
    if (k >= KW.kamuiAt && k < KW.dimAt) desat(ctx, W, H, smooth((k - KW.kamuiAt) / 16), '#1a0a24', 0.5)
    // the vortex on the foe + them being swallowed
    const sw = k >= KW.kamuiAt && k < KW.dimAt ? smooth((k - KW.kamuiAt) / 14) : 0
    if (sw > 0) vortex(ctx, qp.x, qp.y - 50 * z, (60 + 260 * sw) * z, S.real * 0.12, sw, 3)
    drawFoeReal(ctx, S, V, k, qp)
    drawKakashiReal(ctx, S, V, k, kp)
    if (k >= KW.chargeAt && k < KW.dimAt) raikiri(ctx, hand.x, hand.y, z, S.real, smooth((k - KW.chargeAt) / 40), floorY)
    // ejection: a vortex in the real stage spits the foe out + the discharge
    if (k >= KW.ejectAt - 4 && k < KW.ejectAt + 18) { const u = clamp((k - KW.ejectAt + 4) / 22, 0, 1); vortex(ctx, V.p(S.tx0, 0).x, floorY - 50 * z, (280 - 220 * u) * z, -S.real * 0.14, 1 - u, 3) }
    if (dr >= 0 && dr < 34) {
      const a = 1 - dr / 34, cx = qp.x, cy = qp.y - 50 * z, R = Math.min(W * 0.3, 280 * z)
      glow(ctx, cx, cy, 240 * z, BLUE, a); rings(ctx, cx, cy, dr / 28, 440 * z, '#bfe6ff', 3, 0.45, 8 * z)
      if (dr < 18) for (let i = 0; i < 7; i++) { const s = 200 + i * 17 + (dr >> 1), an = -Math.PI * (0.08 + 0.84 * i / 6); bolt(ctx, cx, cy, cx + Math.cos(an) * R, cy + Math.sin(an) * R * 0.8, s, 2.5 * a + 0.5, '#9fd4ff', 9, 0.22) }
      wash(ctx, W, H, '#bfe6ff', 0.4 * a * a, 'lighter')
    }
    if (k >= KW.chargeAt + 26 && k < KW.kamuiAt) punchIn(ctx, canvas, W, H, hand.x, hand.y, 1 + 0.35 * smooth((k - KW.chargeAt - 26) / 24))
    else if (k >= KW.kamuiAt + 4 && k < KW.dimAt) punchIn(ctx, canvas, W, H, qp.x, qp.y - 50 * z, 1 + 0.4 * smooth((k - KW.kamuiAt - 4) / 22))
  }
  // the hand-off flashes in / out of the dimension
  const fin = KW.dimAt - k, fout = k - KW.ejectAt
  if (fin >= -2 && fin < 6) wash(ctx, W, H, '#000000', 1 - Math.abs(fin - 2) / 4)
  if (fout >= -2 && fout < 8) wash(ctx, W, H, '#ffffff', calmFlash() ? 0.3 : 1 - Math.abs(fout - 1) / 7, 'source-over')

  damagePops(ctx, W, H, S, V, '#6ac0ff')
  ctx.restore()

  // panels, titles
  if (k < KW.chargeAt + 2) eyeBanner(ctx, W, H, S, k)
  if (k >= 10 && k < KW.chargeAt + 2) kanjiTitle(ctx, W, H, '万華鏡', 'MANGEKYŌ SHARINGAN', (k - 10) / (KW.chargeAt - 8), { side: -dir, fill: '#ffe6e6', stroke: '#3a0006', edge: '#ff4040' })
  if (k >= KW.chargeAt + 8 && k < KW.kamuiAt) kanjiTitle(ctx, W, H, '雷切', 'RAIKIRI', (k - KW.chargeAt - 8) / (KW.kamuiAt - KW.chargeAt - 8), { side: dir, fill: '#e6f4ff', stroke: '#001a40', edge: '#6ac0ff', fs: 0.15 })
  if (k >= KW.kamuiAt + 2 && k < KW.dimAt + 26) kanjiTitle(ctx, W, H, '神威', 'KAMUI', (k - KW.kamuiAt - 2) / (KW.dimAt + 24 - KW.kamuiAt), { side: -dir, fill: '#f0e8ff', stroke: '#14001e', edge: '#a070ff', fs: 0.15 })
  if (pr >= 12 && k < KW.ejectAt) callout(ctx, W, H, pr, dir)

  letterbox(ctx, W, H, k, S.real, KW.total)
  subtitle(ctx, W, H, 'KAKASHI', 'To hold out this long, huh.', lineA(k, 4, 38), '#9fc8ff')
  subtitle(ctx, W, H, 'KAKASHI', 'Kamui — you cannot run from this.', lineA(k, KW.kamuiAt, KW.dimAt + 20), '#9fc8ff')
  subtitle(ctx, W, H, 'KAKASHI', "Still a long way to go. Is that your best?", lineA(k, KW.afterAt + 8, KW.total - 2), '#9fc8ff')
  return true
}

// ── the real stage ───────────────────────────────────────────────────────────────────────────────────────────────────
function drawKakashiReal(ctx, S, V, k, kp) {
  const f = S.caster, z = V.z, dir = S.dir
  if (k < KW.chargeAt) { sprite(ctx, f, ['mangekyou_cast', 'idle'], Math.min(5, k >> 3), kp.x, kp.y, z, dir); return }
  if (k < KW.loopAt) { sprite(ctx, f, ['raikiri_charge', 'idle'], Math.min(4, (k - KW.chargeAt) >> 2), kp.x, kp.y, z, dir); return }
  if (k < KW.kamuiAt) { sprite(ctx, f, ['raikiri_loop', 'raikiri_charge'], ((k - KW.loopAt) >> 2) % 5, kp.x, kp.y, z, dir); return }
  if (k < KW.dimAt) { sprite(ctx, f, ['mangekyou_cast', 'idle'], 5, kp.x, kp.y, z, dir); return }
  if (k < KW.afterAt) { sprite(ctx, f, ['raikiri_strike', 'idle'], 1, kp.x, kp.y, z, dir); return }
  sprite(ctx, f, ['win', 'idle'], Math.min(3, (k - KW.afterAt) >> 3), kp.x, kp.y, z, dir)
}
function drawFoeReal(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k < KW.kamuiAt) { sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['idle'], S.blocked ? 9 : (S.real >> 3) % 4, qp.x, qp.y, z, fdir); return }
  if (k < KW.dimAt) {   // twisted into the vortex
    const u = smooth((k - KW.kamuiAt - 8) / 20)
    if (u >= 1) return
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y - 50 * z * u, z, fdir, { rot: u * u * 9 * S.dir, s: 1 - u * 0.9, alpha: 1 - u * 0.6, tint: '#6a3aa0', tintA: 0.5 * u })
    return
  }
  if (k < KW.ejectAt) return
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, qp.x, qp.y, z, fdir); return }
  if (k < KW.landAt) { sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, fdir, { rot: (k - KW.ejectAt) * 0.18 * S.dir, tint: '#bfe6ff', tintA: 0.25 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
  if (k < KW.landAt + 22) { const u = (k - KW.landAt) / 22; ctx.save(); ctx.globalAlpha = (1 - u) * 0.6; ctx.fillStyle = '#8a90a0'; ctx.beginPath(); ctx.ellipse(qp.x, qp.y, (30 + u * 80) * z, (8 + u * 12) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}
function raikiri(ctx, hx, hy, z, real, u, floorY) {
  glow(ctx, hx, hy, (30 + 80 * u) * z, BLUE, 0.9 * u + 0.1); glow(ctx, hx, hy, (10 + 16 * u) * z, '255,255,255', u)
  for (let i = 0; i < 3 + Math.floor(u * 6); i++) {
    const s = (real >> 1) * 7 + i * 13, ex = hx + (hash(s, 1) - 0.5) * 240 * z, ey = hash(s, 3) < 0.6 ? floorY : hy - hash(s, 2) * 160 * z
    bolt(ctx, hx, hy, ex, ey, s, 1.2 * z, '#9fd4ff', 7, 0.25)
  }
}

// ── the Kamui vortex: twisting arms around a black eye ──
function vortex(ctx, x, y, R, rot, a, seed) {
  if (a <= 0 || R <= 2) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.25, 'rgba(10,4,16,0.95)'); g.addColorStop(0.7, 'rgba(40,20,60,0.45)'); g.addColorStop(1, 'rgba(40,20,60,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill()
  ctx.lineCap = 'round'
  for (let arm = 0; arm < 7; arm++) {
    ctx.beginPath()
    for (let i = 0; i <= 24; i++) { const r = R * (0.08 + 0.92 * i / 24), an = rot + arm * Math.PI * 2 / 7 + (i / 24) * 3.6; i ? ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.85) : ctx.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.85) }
    ctx.strokeStyle = arm % 2 ? 'rgba(150,120,190,0.55)' : 'rgba(60,40,80,0.8)'; ctx.lineWidth = Math.max(2, R * (0.05 + 0.03 * hash(seed, arm))); ctx.stroke()
  }
  ctx.restore()
}

// ── the Kamui dimension: its own screen composition ──
function dimension(ctx, canvas, W, H, S, k, pr) {
  const f = S.caster, t = S.target, dir = S.dir, D = H / 720 * 1.9, held = S.hold > 0
  const mx = x => dir > 0 ? x : W - x
  // the void
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#050507'); g.addColorStop(0.6, '#15151b'); g.addColorStop(1, '#0a0a0e')
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40)
  // three depth rows of cube pillars
  const drift = (k - KW.dimAt) * 0.4
  for (const [row, s, top, col] of [[0, 0.32, 0.5, '#2a2a32'], [1, 0.55, 0.6, '#3a3a44'], [2, 1, 0.74, '#5a5a66']]) {
    const bw = W * 0.16 * s, gap = bw * 0.55
    for (let i = -1; i < 12; i++) {
      const x = ((i * (bw + gap) - drift * s + row * 61) % (W + bw * 2)) - bw, h = H * (0.6 + 0.3 * hash(row * 31 + i, 4)), y = H * top - h * 0.0 + (hash(row, i) - 0.5) * H * 0.06 * s
      pillar(ctx, x, y, bw, h, col, s)
    }
  }
  // the two stages: Kakashi's pillar and the foe's
  const kx = mx(W * 0.28), qx = mx(W * 0.68), ky = H * 0.72, qy = H * 0.7
  pillar(ctx, kx - W * 0.1, ky, W * 0.2, H, '#6c6c78', 1.2); pillar(ctx, qx - W * 0.09, qy, W * 0.18, H, '#6c6c78', 1.2)
  // the foe falls out of a swirl in the sky onto their pillar
  const fu = clamp((k - KW.dimAt) / (KW.landFoeAt - KW.dimAt), 0, 1)
  if (k < KW.landFoeAt + 6) vortex(ctx, qx, H * 0.22, H * 0.16 * (1 - clamp((k - KW.landFoeAt) / 6, 0, 1)), S.real * 0.15, 1, 5)
  const fy = lerpN(H * 0.22, qy, fu * fu), bad = !S.blocked
  if (k < KW.landFoeAt) sprite(ctx, t, ['hurt', 'idle'], 0, qx, fy, D, -dir, { rot: (1 - fu) * 6 * dir })
  else if (k < KW.pierceAt) sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['idle'], S.blocked ? 9 : (S.real >> 3) % 4, qx, qy, D, -dir)
  else { const sh = held && !calmMotion() ? (hash(S.real, 7) - 0.5) * 6 : 0
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], S.blocked ? 9 : 0, qx + sh, qy, D, -dir, bad ? { tint: '#bfe6ff', tintA: (S.real >> 1) % 2 ? 0.55 : 0.15 } : {}) }
  if (k >= KW.landFoeAt && k < KW.landFoeAt + 14) { const u = (k - KW.landFoeAt) / 14; ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = '#9a9aa8'; ctx.beginPath(); ctx.ellipse(qx, qy, 30 + u * 90, 6 + u * 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  // Kakashi steps out of his own swirl, Raikiri screaming, and crosses the gap
  const kv = clamp((k - KW.stepAt + 8) / 10, 0, 1) * (1 - clamp((k - KW.stepAt - 8) / 8, 0, 1))
  if (kv > 0) vortex(ctx, kx, ky - 60 * D, 110 * D * kv, -S.real * 0.15, kv, 7)
  if (k >= KW.stepAt) {
    const du = clamp((k - KW.dashAt) / (KW.pierceAt - KW.dashAt), 0, 1), sx = lerpN(kx, qx - dir * 54 * D, du * du), sy = lerpN(ky, qy, du) - Math.sin(Math.PI * du) * 50 * D
    if (du > 0 && du < 1 && !calmMotion()) for (let g2 = 4; g2 >= 1; g2--) sprite(ctx, f, ['raikiri_strike', 'idle'], 0, sx - dir * g2 * 30 * D, sy, D, dir, { alpha: 0.12 * (5 - g2), tint: '#9fd4ff', tintA: 0.8 })
    const pose = k < KW.dashAt ? ['raikiri_loop', 'raikiri_charge'] : ['raikiri_strike', 'idle']
    sprite(ctx, f, pose, k < KW.dashAt ? ((k - KW.stepAt) >> 2) % 5 : 1, sx, sy, D, dir, { alpha: k < KW.stepAt + 6 ? (k - KW.stepAt) / 6 : 1 })
    const hx = sx + dir * (k < KW.dashAt ? 20 : 56) * D, hy = sy - (k < KW.dashAt ? 40 : 38) * D
    if (k < KW.pierceAt) { raikiri(ctx, hx, hy, D * 0.8, S.real, 1, sy); if (k >= KW.dashAt) speedLines(ctx, W, H, qx, qy - 50 * D, 80, 19, '#dff2ff', 0.6, true, S.real) }
  }
  // the pierce: the blade through, lightning out of their back across the void
  if (pr >= 0) {
    const a = clamp(1 - (k - KW.pierceAt) / 30, 0.25, 1), cx = qx, cy = qy - 48 * D
    glow(ctx, cx, cy, 180 * D, BLUE, 0.85 * a)
    for (let i = 0; i < 9; i++) { const s = i * 31 + (S.real >> 1), an = (hash(i, 9) - 0.5) * 1.5, L = (180 + hash(s, 2) * 300) * D * 0.7
      bolt(ctx, cx, cy, cx + dir * Math.cos(an) * L, cy + Math.sin(an) * L, s, 2.2 * a + 0.6, '#bfe6ff', 9, 0.22) }
    rings(ctx, cx, cy, clamp(pr / 30, 0, 1), 420 * D * 0.6, '#bfe6ff', 3, 0.5, 7)
    if (pr < 4) punchIn(ctx, canvas, W, H, cx, cy, 1.45)
    if (pr >= 3 && pr < 11 && !calmFlash()) {
      const white = pr < 7, bg = white ? '#ffffff' : '#08001a', fg = white ? '#08001a' : '#b8a0ff'
      ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
      speedLines(ctx, W, H, cx, cy, 90, 61 + pr, fg, 0.9, false, pr)
      ctx.translate(W / 2, H * 0.68); ctx.scale(1.6, 1.6); ctx.translate(-(qx - dir * 27 * D), -qy)
      sprite(ctx, f, ['raikiri_strike', 'idle'], 1, qx - dir * 54 * D, qy, D, dir, { tint: fg, tintA: 1 })
      sprite(ctx, t, ['hurt', 'idle'], 0, qx, qy, D, -dir, { tint: fg, tintA: 1, skew: -dir * 0.25 })
      ctx.restore()
    }
  }
  // closing: the vortex swallows the whole frame
  if (k >= KW.ejectAt - 10) { const u = clamp((k - KW.ejectAt + 10) / 12, 0, 1); vortex(ctx, (kx + qx) / 2, H * 0.5, W * 0.9 * u, S.real * 0.2, u, 9) }
}
const lerpN = (a, b, u) => a + (b - a) * u
function pillar(ctx, x, top, w, h, col, s) {
  ctx.save(); ctx.fillStyle = col; ctx.fillRect(x, top, w, h)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, top, w, Math.max(2, 6 * s))        // lit top edge
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + w * 0.72, top, w * 0.28, h)              // shaded side
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h)
  ctx.restore()
}

// ── panels ──
function mangekyo(ctx, x, y, r, rot) {
  ctx.save()
  ctx.fillStyle = '#c0101a'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#0c0002'
  for (let i = 0; i < 3; i++) {
    const an = rot + i * Math.PI * 2 / 3
    ctx.beginPath(); ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + Math.cos(an + 0.9) * r * 0.75, y + Math.sin(an + 0.9) * r * 0.75, x + Math.cos(an) * r * 0.98, y + Math.sin(an) * r * 0.98)
    ctx.arc(x, y, r * 0.98, an, an - 0.5, true)
    ctx.quadraticCurveTo(x + Math.cos(an - 0.1) * r * 0.45, y + Math.sin(an - 0.1) * r * 0.45, x, y)
    ctx.fill()
  }
  ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = '#300004'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}
function eyeBanner(ctx, W, H, S, k) {
  const a = Math.min(clamp(S.real / 6, 0, 1), clamp((KW.chargeAt + 2 - k) / 6, 0, 1)); if (a <= 0) return
  const bh = H * 0.36 * outE(clamp(S.real / 8, 0, 1)), y = H * 0.46
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#07040a'; ctx.fillRect(0, y - bh / 2, W, bh); ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip()
  speedLines(ctx, W, H, W / 2, y, 50, 5, '#3a1020', 0.6, true, S.real)
  const side = S.dir > 0 ? 1 : -1, pw = bh * 0.82, px = side > 0 ? W * 0.12 : W * 0.88 - pw
  portraitPanel(ctx, PORTRAIT, [24, 30, 180, 220], px, y - pw / 2, pw, pw, { bg: '#1a1a24', edge: '#000' })
  // the eye, huge, the pinwheel spinning open
  const ex = side > 0 ? W * 0.62 : W * 0.38, r = bh * 0.34, open = smooth((k - 6) / 14)
  ctx.fillStyle = '#f4efe8'; ctx.beginPath(); ctx.ellipse(ex, y, r * 2.6, r * 1.05 * open + 1, 0, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.clip()
  mangekyo(ctx, ex, y, r, S.real * 0.12 + (1 - open) * 4)
  glow(ctx, ex, y, r * 2, '255,40,40', 0.4 * open)
  ctx.restore()
  ctx.strokeStyle = '#1a0a0a'; ctx.lineWidth = Math.max(3, r * 0.1); ctx.beginPath(); ctx.ellipse(ex, y, r * 2.6, r * 1.05 * open + 1, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}
function callout(ctx, W, H, pr, dir) {
  const su = clamp((pr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (pr - 50) / 12, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.3 : 0.7), H * 0.22); ctx.rotate(-0.06 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.1)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.22; ctx.strokeStyle = '#0c0018'; ctx.strokeText('KAMUI RAIKIRI!!', 0, 0); ctx.fillStyle = '#e6f6ff'; ctx.fillText('KAMUI RAIKIRI!!', 0, 0)
  ctx.restore()
}
