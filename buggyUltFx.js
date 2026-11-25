// buggyUltFx.js — RENDER-ONLY half of Buggy's BARA BARA FESTIVAL — BUGGY BALL!! (buggyUlt.js). One screen pass (cineRegistry
// overlay, identity transform) owns the picture while the cinematic runs: world → screen from camera.js's live transform; Buggy,
// his detached PARTS (part_head / part_hand / part_foot / part_legs sheets), the Buggy-face cannonball (fx_ball_buggy) and the
// foe all come from their REAL sheets. Layers: circus spotlight + big-top stripes → confetti → floor → fighters / parts →
// the BUGGY BALL + fuse sparks → explosion fireball + smoke → re-blit close-ups → circus banners / stamps → impact frames →
// letterbox + subtitles. Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted
// frames; Reduce Motion → no jitter / drifting confetti.
import { clamp, smooth, outE, inE, hash, view, sprite, punchIn, wash, desat, speedLines, title, sub, letterbox, star, glow, rings,
  debris, damageNumber, calmMotion, calmFlash, lerp } from './bleachUltKit.js'
import { BUGGY_PARTS, BUGGY_FX } from './buggySprites.js'

const raw = o => o ? { sheet: o.sheet, frames: o.frames || 1, width: o.w, height: o.h } : null
const P = { head: raw(BUGGY_PARTS.head.idle), hand: raw(BUGGY_PARTS.hand.idle), foot: raw(BUGGY_PARTS.foot.idle), legs: raw(BUGGY_PARTS.legs.idle) }
const BALL = raw(BUGGY_FX.ballBuggy), KNIFE = raw(BUGGY_FX.knife)
const CONF = ['#ff3a3a', '#ffd23a', '#3ac0ff', '#ff7ad8', '#7aff6a', '#ffffff']
// the pieces circling the foe: [part, phase offset, radius x, radius y, height]
const PIECES = [['head', 0, 1.0, 0.35, 120], ['hand', 1.05, 1.1, 0.4, 70], ['hand', 2.1, 0.9, 0.5, 90], ['foot', 3.15, 1.0, 0.3, 20], ['foot', 4.2, 1.15, 0.3, 26], ['legs', 5.25, 0.8, 0.3, 40]]

export function drawBuggyUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir, f = S.caster
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.hitReal != null ? S.real - S.hitReal : -1
  const spr = S.lastStab ? S.real - S.lastStab.real : 99
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 20 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 20 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), t0 = V.p(S.tx0, S.tFloor), floorY = fp.y
  const cartP = V.p(S.cart, S.floor)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the big top: the house lights go down, spotlights on the star of the show
  const showA = k < B.calmAt ? clamp(S.real / 12, 0, 1) : clamp(1 - (k - B.calmAt) / 30, 0.25, 1)
  wash(ctx, W, H, '#0a0410', 0.55 * showA)
  bigTop(ctx, W, H, S.real, 0.22 * showA)
  if (k < B.splitAt + 6 || k >= B.calmAt) spot(ctx, fp.x, floorY, z, H, '255,240,200', 0.55)
  else if (k < B.homeAt) spot(ctx, t0.x, floorY, z, H, '255,210,230', 0.45)
  else if (k < B.hitAt) spot(ctx, cartP.x, floorY, z, H, '255,240,200', 0.5)
  if (k >= B.fireAt && k < B.hitAt) desat(ctx, W, H, 0.6 * smooth((k - B.fireAt) / 6))

  // 2) confetti whenever the show is on
  if (!calmMotion() && ((k >= B.festAt && k < B.homeAt + 10) || (k >= B.hitAt && k < B.outAt) || k >= B.calmAt)) confetti(ctx, W, H, S.real, k >= B.calmAt ? 0.9 : 0.7)

  // 3) fighters + the parts
  drawFoe(ctx, S, V, k, tp, B)
  drawBuggy(ctx, S, V, k, fp, cartP, B)
  if (k >= B.splitAt && k < B.joinAt) pieces(ctx, S, V, k, fp, t0, B, spr)

  // 4) stab flashes
  if (S.lastStab && spr < 12 && k < B.homeAt + 4) {
    const a = 1 - spr / 12, ang = [-0.6, 0.5, -0.15, 0.9][S.lastStab.i]
    star(ctx, t0.x + Math.cos(ang) * 10 * z, t0.y - 55 * z, (90 + 60 * outE(spr / 4)) * z * a, a, ang, '#fff6d0')
    glow(ctx, t0.x, t0.y - 55 * z, 120 * z, '255,90,60', a * 0.6)
    pop(ctx, W, H, ['STAB!', 'STAB!!', 'STAB!!!', 'BOOT!'][S.lastStab.i], t0.x + dir * 120 * z, t0.y - 140 * z, spr, S.lastStab.i)
  }

  // 5) the BUGGY BALL on the cart, its flight, the fuse
  const ball = ballPos(S, B, k)
  if (ball) {
    const bp = V.p(ball.x, ball.y), r = ball.r * z
    if (k < B.fireAt) for (let i = 0; i < 10; i++) {   // fuse sparks
      const a = hash(i, S.real >> 1) * Math.PI * 2, d = (6 + hash(i, S.real) * 22) * z
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = i % 2 ? '#ffe070' : '#ff7a30'; ctx.fillRect(bp.x - dir * r * 0.55 + Math.cos(a) * d, bp.y - r * 0.9 + Math.sin(a) * d, 3, 3); ctx.restore()
    }
    if (k >= B.fireAt) for (let g = 1; g <= 4; g++) { const gp = V.p(...ballXY(S, B, k - g * 1.5)); ctx.save(); ctx.globalAlpha = 0.2 * (5 - g); ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.arc(gp.x, gp.y, r * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
    drawBall(ctx, bp.x, bp.y, r, k * 0.25 * dir)
  }
  if (k >= B.fireAt && k < B.fireAt + 14) { const mz = V.p(S.cart + dir * 70, S.floor - 50); glow(ctx, mz.x, mz.y, (160 - (k - B.fireAt) * 8) * z, '255,200,120', 1 - (k - B.fireAt) / 14); smoke(ctx, mz.x, mz.y, z, k - B.fireAt, 10, 0.8, 44) }

  // 6) the explosion
  const kp = k - B.hitAt
  if (kp >= 0 && kp < 70) {
    const u = kp / 70, cx = t0.x, cy = t0.y - 40 * z
    rings(ctx, cx, floorY - 8 * z, u, 4, W, '#ffe0a0', 18 * z, 0.25)
    fireball(ctx, cx, cy, z, kp, S.real)
    smoke(ctx, cx, cy, z, kp, 16, 0.45, 13)
    debris(ctx, cx, floorY, kp, 40, Math.max(1, z), 17, '#5a3a2a', 600, 28)
  }
  if (k >= B.rushAt && k < B.rushHit + 6 && !calmMotion()) speedLines(ctx, W, H, fp.x, fp.y - 40 * z, 50, 77, '#ffffff', 0.4, false, S.real)
  if (S.rushReal != null && S.real - S.rushReal < 14) { const a = 1 - (S.real - S.rushReal) / 14; star(ctx, tp.x, tp.y - 50 * z, 160 * z * a, a, 0.3, '#ffffff') }

  // 7) close-ups
  if (k < B.splitAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 90 * z, 1.15 + 0.35 * smooth(k / 30))
  else if (k >= B.festAt + 10 && k < B.homeAt) punchIn(ctx, canvas, W, H, t0.x, t0.y - 50 * z, 1.15 + (spr < 4 ? 0.14 * (1 - spr / 4) : 0) + 0.15 * smooth((k - B.festAt - 10) / 40))
  else if (k >= B.cartAt + 6 && k < B.fireAt) punchIn(ctx, canvas, W, H, cartP.x, floorY - 70 * z, 1.1 + 0.25 * smooth((k - B.cartAt - 6) / 20))

  // 8) banners + stamps
  if (k >= 4 && k < B.splitAt) nose(ctx, fp, z, k, dir)
  if (k >= B.festAt && k < B.festAt + 50) title(ctx, W, H, 'BARA BARA FESTIVAL', 'BUGGY THE CLOWN  ·  バラバラ祭り', (k - B.festAt) / 50,
    { y: 0.22, fs: 0.1, band: 'rgba(200,20,30,0.92)', edge: '#ffd23a', fill: '#ffd23a', stroke: '#3a0010', subCol: '#ffffff', kanji: 'バラバラ', kanjiCol: '#ffffff' })
  if (k >= B.cartAt + 4 && k < B.hitAt + 20) title(ctx, W, H, 'BUGGY BALL!!', 'THE STAR OF THE SHOW  ·  特製バギー玉', (k - B.cartAt - 4) / (B.hitAt + 20 - B.cartAt - 4),
    { y: 0.2, fs: 0.13, band: 'rgba(20,6,30,0.92)', edge: '#ff3a3a', fill: '#ffffff', stroke: '#c41a10', kanji: '派手', kanjiCol: '#ffd23a' })
  if (k >= B.cartAt + 10 && k < B.fireAt) sweat(ctx, tp, z, S.real)

  // 9) impact frames
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, tp, '#ffffff', '#000000', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, tp, calmFlash() ? '#1a0408' : '#000000', '#ffd23a', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, t0.x, t0.y - H * 0.3, pr - 10, '#ffd23a')
  else if (S.lastStab && spr < 40 && k < B.homeAt + 10) damageNumber(ctx, W, H, S, t0.x - dir * 110 * z, t0.y - H * 0.2, spr + 30, '#ffffff')
  if (k >= B.calmAt && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.calmAt) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    pop(ctx, W, H, 'FLASHY!!', dir > 0 ? W * 0.72 : W * 0.28, H * 0.3, 10, 9, a)
  }

  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.splitAt, 'BUGGY', 'Gyahahaha! Time for a FLASHY show!', '#ffd23a')
  sub(ctx, W, H, k, B.festAt + 8, B.homeAt - 10, 'BUGGY', 'Bara Bara FESTIVAL! Try and catch me, you dope!', '#ffd23a')
  sub(ctx, W, H, k, B.cartAt + 8, B.fireAt + 6, 'BUGGY', 'Special Buggy Ball… FIRE!!', '#ffd23a')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'BUGGY', 'Gyahahahaha! Did you see that?! FLASHY!!', '#ffd23a')
  return true
}

// ── Buggy himself ──
function drawBuggy(ctx, S, V, k, fp, cartP, B) {
  const f = S.caster, z = V.z, face = S.fFace || S.dir
  if (k < B.splitAt) { sprite(ctx, f, k < 18 ? ['taunt', 'idle'] : ['bSuper', 'idle'], k < 18 ? (k >> 3) % 2 : 0, fp.x, fp.y, z, face); return }
  if (k < B.splitAt + 8) { sprite(ctx, f, ['bChopped', 'idle'], 0, fp.x, fp.y, z, face, { sx: 1 + (k - B.splitAt) * 0.03, alpha: 1 - (k - B.splitAt) / 8 }); return }
  if (k < B.joinAt) return                                                                // he IS the pieces now
  if (k < B.cartAt) { sprite(ctx, f, ['bChopped', 'idle'], 1, fp.x, fp.y, z, face, { tint: '#ffffff', tintA: clamp(1 - (k - B.joinAt) / 4, 0, 1) }); return }
  if (k < B.rushAt) {   // on the cannon cart
    const roll = k < B.cartAt + 12 ? (1 - smooth((k - B.cartAt) / 12)) : 0, kick = k >= B.fireAt && k < B.fireAt + 8 ? -(1 - (k - B.fireAt) / 8) * 16 * z * S.dir : 0
    sprite(ctx, f, ['bSuper'], k >= B.fireAt && k < B.fireAt + 6 ? 2 : 1, cartP.x - S.dir * roll * 260 * z + kick, cartP.y, z, S.dir, { s: 1.25 })
    return
  }
  if (k < B.rushHit + 10) { sprite(ctx, f, ['bSuper'], 3 + ((k >> 1) % 3), fp.x, fp.y, z, S.dir, { s: 1.2 }); return }   // the spinning knife-ball
  sprite(ctx, f, k < B.calmAt ? ['bChopped', 'idle'] : ['win', 'taunt', 'idle'], k < B.calmAt ? 1 : 0, fp.x, fp.y, z, face)
}
// the detached pieces orbiting the foe, darting in for the stabs, then flying home
function pieces(ctx, S, V, k, fp, t0, B, spr) {
  const f = S.caster, z = V.z, dir = S.dir
  const spin = (k - B.festAt) * 0.11
  PIECES.forEach(([p, ph, rx, ry, h], i) => {
    const A = P[p]; if (!A) return
    const an = ph + spin, ox = t0.x + Math.cos(an) * 150 * rx * z, oy = t0.y - h * z - 40 * z + Math.sin(an) * 60 * ry * z
    const from = { x: fp.x + (i - 2.5) * 8 * z, y: fp.y - (30 + h * 0.6) * z }
    let x, y
    if (k < B.festAt + 8) { const u = smooth((k - B.splitAt) / (B.festAt + 8 - B.splitAt)); x = lerp(from.x, ox, u); y = lerp(from.y, oy, u) - Math.sin(Math.PI * u) * 80 * z }
    else if (k < B.homeAt) { x = ox; y = oy }
    else { const u = smooth((k - B.homeAt) / (B.joinAt - B.homeAt)); x = lerp(ox, from.x, u); y = lerp(oy, from.y, u) - Math.sin(Math.PI * u) * 60 * z }
    // the darting hand / boot on a stab
    if (S.lastStab && spr < 8 && k < B.homeAt && ((S.lastStab.i < 3 && p === 'hand' && (S.lastStab.i % 2) === (i === 1 ? 0 : 1)) || (S.lastStab.i === 3 && p === 'foot' && i === 3))) {
      const u = spr < 3 ? spr / 3 : 1 - (spr - 3) / 5; x = lerp(x, t0.x, u * 0.85); y = lerp(y, t0.y - 55 * z, u * 0.85)
    }
    const face = Math.cos(an) > 0 ? -1 : 1
    if (!calmMotion()) for (let g = 1; g <= 2; g++) sprite(ctx, f, A, (k >> 2) % A.frames, x - Math.cos(an) * g * 10 * z, y + g * 2 * z, z, face, { anchor: 'centre', alpha: 0.18 })
    sprite(ctx, f, A, (k >> 2) % A.frames, x, y, z, face, { anchor: 'centre', rot: p === 'head' ? Math.sin(k * 0.2) * 0.3 : an * 0.5 })
    if (p === 'hand' && KNIFE) sprite(ctx, f, KNIFE, 0, x + face * 14 * z, y, z * 0.7, face, { anchor: 'centre', rot: an + Math.PI / 2 })
  })
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.hitAt
  if (kp < 0) {
    const hit = S.lastStab && S.real - S.lastStab.real < 10, panic = k >= B.cartAt + 8
    const keys = hit || panic ? (S.blocked ? ['guard', 'idle'] : ['hurt', 'idle']) : ['idle']
    sprite(ctx, t, keys, hit || panic ? 0 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir, { tint: hit && S.real - S.lastStab.real < 3 ? '#ffffff' : null, tintA: 0.7 }); return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  const landed = (S.ty || 0) <= 0 && kp > 14
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { anchor: landed ? null : 'centre', rot: landed ? 0 : -S.dir * kp * 0.35, tint: kp < 20 ? '#2a1a10' : null, tintA: 0.5 * clamp(1 - kp / 20, 0, 1) })
}
// ── the ball's path: sitting in the cannon → a lobbed arc onto the foe → gone in the blast ──
function ballXY(S, B, k) {
  const mx = S.cart + S.dir * 70, my = S.floor - 52
  if (k < B.fireAt) return [mx, my]
  const u = clamp((k - B.fireAt) / (B.hitAt - B.fireAt), 0, 1), e = lerp(u, inE(u), 0.4)
  return [lerp(mx, S.tx0, e), lerp(my, S.tFloor - 50, e) - Math.sin(Math.PI * u) * 150]
}
function ballPos(S, B, k) {
  if (k < B.cartAt || k >= B.hitAt) return null
  const [x, y] = ballXY(S, B, k), grow = k < B.cartAt + 12 ? smooth((k - B.cartAt) / 12) : 1
  return { x, y, r: 46 * grow }
}
function drawBall(ctx, x, y, r, rot) {
  if (r <= 1) return
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  ctx.fillStyle = '#1c1414'; ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2, r * 0.06)
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // Buggy's Jolly Roger on the ball: the crossed bones behind a red-nosed skull
  ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.45); ctx.lineTo(r * 0.5, r * 0.5); ctx.moveTo(r * 0.5, -r * 0.45); ctx.lineTo(-r * 0.5, r * 0.5); ctx.stroke()
  ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.34, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#1c1414'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.13, -r * 0.12, r * 0.08, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = '#e8201a'; ctx.beginPath(); ctx.arc(0, r * 0.02, r * 0.08, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.5, r * 0.3, r * 0.14, -0.6, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // the fuse
  ctx.save(); ctx.strokeStyle = '#c8a060'; ctx.lineWidth = Math.max(2, r * 0.08); ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.2, y - r * 1.3, x - r * 0.1, y - r * 1.45); ctx.stroke(); ctx.restore()
}
function fireball(ctx, x, y, z, kp, real) {
  const u = clamp(kp / 40, 0, 1), R = (60 + 360 * outE(u)) * z, a = clamp(1 - (kp - 18) / 40, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,255,230,${a})`); g.addColorStop(0.35, `rgba(255,200,80,${a * 0.9})`); g.addColorStop(0.7, `rgba(255,80,30,${a * 0.6})`); g.addColorStop(1, 'rgba(120,20,10,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill()
  // a mushroom stem + cap rising
  ctx.globalAlpha = a * 0.7; ctx.fillStyle = 'rgba(255,140,60,0.8)'
  ctx.beginPath(); ctx.ellipse(x, y - R * 0.9 - u * 60 * z, R * 0.65, R * 0.35, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore(); void real
}
function smoke(ctx, x, y, z, kp, n, a0, seed) {
  if (kp < 0) return
  ctx.save()
  for (let i = 0; i < n; i++) {
    const an = hash(i, seed) * Math.PI * 2, sp = (1.5 + hash(i, seed + 1) * 3.5) * z, d = sp * kp * (1 - kp / 160), r = (12 + kp * 0.8 + hash(i, seed + 2) * 14) * z
    ctx.globalAlpha = a0 * clamp(1 - kp / 70, 0, 1) * 0.6; ctx.fillStyle = i % 3 ? '#4a4048' : '#6a5a5a'
    ctx.beginPath(); ctx.arc(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.6 - kp * 0.6 * z, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function bigTop(ctx, W, H, real, a) {   // circus-tent stripes fanning down from above
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a
  const n = 14, cx = W / 2, top = -H * 0.6
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * 0.25 + (i / n) * Math.PI * 0.5, a1 = Math.PI * 0.25 + ((i + 1) / n) * Math.PI * 0.5
    ctx.fillStyle = i % 2 ? '#c8102e' : '#f2e6c8'
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + Math.cos(a0) * H * 1.6, top + Math.sin(a0) * H * 1.6); ctx.lineTo(cx + Math.cos(a1) * H * 1.6, top + Math.sin(a1) * H * 1.6); ctx.closePath(); ctx.fill()
  }
  ctx.restore(); void real
}
function spot(ctx, x, floorY, z, H, rgb, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a * 0.5})`)
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 30 * z, 0); ctx.lineTo(x + 30 * z, 0); ctx.lineTo(x + 130 * z, floorY); ctx.lineTo(x - 130 * z, floorY); ctx.closePath(); ctx.fill()
  ctx.fillStyle = `rgba(${rgb},${a * 0.6})`; ctx.beginPath(); ctx.ellipse(x, floorY, 130 * z, 22 * z, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore(); void H
}
function confetti(ctx, W, H, real, a) {
  ctx.save()
  for (let i = 0; i < 70; i++) {
    const ph = ((real * (0.6 + hash(i, 2) * 0.8) + hash(i, 3) * 200) % 200) / 200
    const x = hash(i, 4) * W + Math.sin(real * 0.05 + i) * 20, y = -20 + ph * (H + 40)
    ctx.globalAlpha = a; ctx.fillStyle = CONF[i % CONF.length]
    ctx.save(); ctx.translate(x, y); ctx.rotate(real * 0.1 + i); ctx.fillRect(-4, -2, 8, 4 * Math.abs(Math.cos(real * 0.15 + i))); ctx.restore()
  }
  ctx.restore()
}
function nose(ctx, fp, z, k, dir) {   // the famous red nose glints
  const u = clamp((k - 10) / 10, 0, 1); if (u <= 0) return
  star(ctx, fp.x + dir * 10 * z, fp.y - 88 * z, 40 * z * Math.sin(Math.PI * u), Math.sin(Math.PI * u), k * 0.1, '#ffffff')
}
function sweat(ctx, tp, z, real) {
  ctx.save(); ctx.fillStyle = '#9fd8ff'
  for (let i = 0; i < 3; i++) { const ph = ((real + i * 7) % 20) / 20; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(tp.x + (i - 1) * 16 * z, tp.y - (100 - ph * 30) * z, 4 * z, 7 * z, 0, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function pop(ctx, W, H, text, x, y, age, i, a = 1) {
  const sc = 1 + Math.max(0, 1 - age / 4) * 0.8, al = a * clamp((20 - age) / 8, 0, 1) || a
  ctx.save(); ctx.globalAlpha = clamp(al, 0, 1); ctx.translate(clamp(x, W * 0.1, W * 0.9), clamp(y, H * 0.15, H * 0.8)); ctx.rotate((i % 2 ? 1 : -1) * 0.12); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.06); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.24; ctx.strokeStyle = '#3a0010'; ctx.strokeText(text, 0, 0); ctx.fillStyle = CONF[i % 2 ? 1 : 0]; ctx.fillText(text, 0, 0); ctx.restore()
}
function silFrame(ctx, W, H, S, V, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 30 + pr, fg, 0.95, false, pr)
  ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(tp.x, tp.y - 50 * z, 46 * z, 0, Math.PI * 2); ctx.fill()
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.caster, ['bSuper'], 2, V.p(S.cart, S.floor).x, V.p(S.cart, S.floor).y, z, S.dir, { tint: fg, tintA: 1, s: 1.25 })
  ctx.restore()
}
