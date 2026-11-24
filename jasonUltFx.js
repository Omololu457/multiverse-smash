// jasonUltFx.js — RENDER-ONLY half of Jason Voorhees's BLACKOUT AT CRYSTAL LAKE cinematic (jasonUlt.js). Screen pass
// (cineRegistry overlay, identity transform): world → screen from camera.js's live transform; both fighters drawn here from
// their real sheets. Night grade + moon + ground fog, strobing light flashes (each one finds him closer), total blackout with
// a machete glint, the reveal push-in on the mask, red-black impact frames + white slash streaks, the one-handed lift and
// slam, the closing card. PG-13: silhouettes and impact, no gore. Pure functions of the scene; noise = integer hash.
import { hash, clamp, smooth, outE, calmMotion, calmFlash, preloadAnims, sprite, view, punchIn, speedLines, title, subtitle, star, letterbox, ring, bigNumber } from './ippoUltFx.js'
import { jasonAt, foeAt } from './jasonUlt.js'

export const JASON_T = { flashes: [26, 40, 54, 66], black: 78, reveal: 96, grab: 196, slam: 210, after: 220, out: 262, total: 276 }
// the three chops: script frame, raw damage, push (world px the foe is driven back), the pose used
export const JASON_HITS = [{ at: 124, raw: 70, push: 14 }, { at: 148, raw: 70, push: 14 }, { at: 174, raw: 80, push: 26 }]
const T = JASON_T, HITS = JASON_HITS

export function preloadJasonUlt(f, t) {
  preloadAnims(f, ['idle', 'walk', 'heavy', 'up', 'light', 'crouchHeavy'])
  preloadAnims(t, ['idle', 'hurt', 'guard', 'knockdown', 'fall'])
}
const lit = k => {   // how lit the scene is (0 = pitch black, 1 = full moonlight) at script frame k
  if (k < T.flashes[0]) return 1 - 0.35 * smooth(k / 20)
  if (k < T.reveal) { for (const fk of T.flashes) if (k >= fk && k < fk + 4) return k < T.black ? 0.95 : 0; return k < T.black ? 0.12 : 0 }
  if (k < T.reveal + 3) return 1.25
  return 0.8
}

export function drawJasonUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas.width, H = canvas.height, V = view(W, H), z = V.z, k = S.frame, f = S.caster, t = S.target
  const jp = V.p(jasonAt(k).x, S.floor), tq = foeAt(k), tp = V.p(tq.x, tq.y)
  const hr = S.hitReal != null ? S.real - S.hitReal : 999, sr = S.slamReal != null ? S.real - S.slamReal : -1
  const L = lit(k), outA = k >= T.out ? smooth(1 - (k - T.out) / 14) : 1
  const jit = calmMotion() ? 0 : (hr < 6 ? (hash(S.real, 3) - 0.5) * H * 0.014 : sr >= 0 && sr < 16 ? (hash(S.real, 4) - 0.5) * H * 0.022 : 0)

  ctx.save(); ctx.translate(jit, jit * 0.5)
  // 1) night grade over the world (deep blue), a cold moon, fog along the floor
  ctx.fillStyle = `rgba(4,8,22,${(clamp(0.72 - (L - 0.65) * 0.5, 0.35, 0.82) * outA).toFixed(3)})`; ctx.fillRect(-20, -20, W + 40, H + 40)
  if (L > 0.05) {
    const mx = W * 0.78, my = H * 0.2, mr = H * 0.07
    ctx.save(); ctx.globalAlpha = outA * Math.min(1, L)
    const g = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2); g.addColorStop(0, 'rgba(210,225,255,0.35)'); g.addColorStop(1, 'rgba(210,225,255,0)')
    ctx.fillStyle = g; ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4)
    ctx.fillStyle = '#e8eef8'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(160,170,190,0.5)'; for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.35, 0.12]]) { ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
  fog(ctx, W, H, S, V, k, outA)

  // 2) the fighters (drawn only where there is light to see them)
  const seen = L > 0.05
  if (seen) { drawFoe(ctx, S, V, k, tp); drawJason(ctx, S, V, k, jp, tp) }
  // a flashlight-cone of cold light over them during the flashes (they are lit, the world stays dark)
  if (k >= T.flashes[0] && k < T.black && L > 0.5) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(W / 2, -H * 0.2, H * 0.1, W / 2, H * 0.5, H * 0.9); g.addColorStop(0, 'rgba(200,220,255,0.25)'); g.addColorStop(1, 'rgba(200,220,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
  }
  // 3) darkness on top of everything outside the light
  const dark = 1 - clamp(L, 0, 1)
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(0,0,0,${(dark * 0.97).toFixed(3)})`; ctx.fillRect(-20, -20, W + 40, H + 40)
  }
  // the blackout: one glint of steel where he stands, and his mask, faint
  if (k >= T.black && k < T.reveal) {
    const g = jasonAt(k), gp = V.p(g.x, S.floor), u = (k - T.black) / (T.reveal - T.black)
    star(ctx, gp.x - S.jdir * 26 * z, gp.y - 70 * z, (10 + 26 * Math.sin(Math.PI * clamp(u * 1.4, 0, 1))) * z, 0.95 * Math.sin(Math.PI * clamp(u * 1.4, 0, 1)), u * 2, '200,220,255')
    if (u > 0.5) { ctx.save(); ctx.globalAlpha = (u - 0.5) * 0.7; ctx.fillStyle = '#dfe3ea'; ctx.beginPath(); ctx.ellipse(gp.x, gp.y - 122 * z, 9 * z, 12 * z, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'; for (const dx of [-3.5, 3.5]) { ctx.beginPath(); ctx.arc(gp.x + dx * z, gp.y - 124 * z, 2 * z, 0, Math.PI * 2); ctx.fill() } ctx.restore() }
  }
  // the stage light flashes (bright cold frames)
  if (!calmFlash() && L > 0.9 && k >= T.flashes[0] && k < T.black) { ctx.fillStyle = 'rgba(220,235,255,0.08)'; ctx.fillRect(0, 0, W, H) }
  // 4) slash streaks + per-chop impact frames
  if (S.hitIdx >= 0 && hr < 16) slash(ctx, W, H, S, V, hr, tp)
  if (S.hitIdx >= 0 && hr >= 0 && hr < 5) impactFrames(ctx, W, H, S, V, hr, jp, tp)
  if (sr >= 0 && sr < 26) slamFx(ctx, W, H, S, V, sr, tp)

  // 5) punch-ins: the reveal on the mask; the chops tighter; the slam
  const head = { x: jp.x, y: jp.y - 120 * z }
  if (k >= T.reveal && k < T.reveal + 26) { const u = smooth((k - T.reveal) / 6), w = 1 - smooth((k - T.reveal - 16) / 10); punchIn(ctx, canvas, W, H, head.x, head.y + 10 * z, 1 + 1.1 * u * w, head.x + (W / 2 - head.x) * u * w, head.y + 10 * z + (H * 0.45 - head.y - 10 * z) * u * w) }
  else if (k >= T.reveal + 26 && k < T.after) punchIn(ctx, canvas, W, H, (jp.x + tp.x) / 2, jp.y - 80 * z, 1.25 + (hr < 4 ? 0.06 : 0), W / 2, H * 0.55)

  // 6) titles / cards
  if (k >= T.reveal + 8 && k < T.reveal + 58) title(ctx, W, H, 'BLACKOUT AT CRYSTAL LAKE', 'FRIDAY THE 13TH  ·  HE IS ALWAYS RIGHT BEHIND YOU', (k - T.reveal - 8) / 50, { y: 0.2, fs: 0.085, edge: '#b3120f', fill: '#e8eef8', stroke: '#000000', band: 'rgba(0,0,0,0.92)' })
  if (k >= 6 && k < T.black) whisper(ctx, W, H, S, k)
  if (S.dmg > 0 && sr >= 18 && sr < 120) bigNumber(ctx, W, H, S.dmg, clamp(tp.x, W * 0.12, W * 0.88), H * 0.5, (sr - 18) / 102, '#c81e1e')
  else if (S.blocked && S.dmg > 0 && k >= T.slam && k < T.out) bigNumber(ctx, W, H, S.dmg, clamp(tp.x, W * 0.12, W * 0.88), H * 0.5, (k - T.slam) / 60, '#ffd27a')
  if (k >= T.after + 8 && k < T.out + 10) endCard(ctx, W, H, S, k)
  ctx.restore()

  // 7) letterbox (heavier for the horror framing)
  const lbIn = clamp(S.real / 10, 0, 1), lbOut = k >= T.out ? clamp(1 - (k - T.out) / 14, 0, 1) : 1
  letterbox(ctx, W, H, Math.min(lbIn, lbOut) * 1.15)
  return true
}

function drawJason(ctx, S, V, k, jp, tp) {
  const f = S.caster, z = V.z, d = k >= T.flashes[0] ? S.jdir : S.dir, x = jp.x
  let keys = ['idle'], fr = (S.real >> 3) % 6
  if (k < T.flashes[0]) { keys = ['walk', 'idle']; fr = (k >> 2) % 10 }
  else if (k < T.reveal + 14) { keys = ['idle']; fr = 0 }
  else {
    const idx = HITS.findIndex(h => k < h.at + 12)
    if (idx >= 0 && k >= HITS[idx].at - 14) {
      const h = HITS[idx], before = k < h.at
      if (idx === 1) { keys = ['up', 'idle']; fr = before ? 0 : 2 }
      else { keys = ['heavy', 'idle']; fr = before ? (k < h.at - 7 ? 0 : 1) : (k < h.at + 3 ? 2 : 3) }
    } else if (k >= T.grab - 4 && k < T.slam + 10) { keys = ['light', 'idle']; fr = 1 }
    else { keys = ['idle']; fr = (S.real >> 3) % 6 }
  }
  sprite(ctx, f, keys, fr, x, jp.y, z, d)
  // the eyes behind the mask catch the light on the reveal
  if (k >= T.reveal && k < T.reveal + 20) star(ctx, x + d * 3 * z, jp.y - 124 * z, 8 * z, 1 - (k - T.reveal) / 20, 0, '255,60,60')
}

function drawFoe(ctx, S, V, k, tp) {
  const t = S.target, z = V.z, fd0 = S.tFace0 || -S.dir
  // during the flicker they look around: each flash finds them facing a different way
  let fd = fd0
  if (k >= T.flashes[0] && k < T.reveal) { const i = T.flashes.filter(fk => k >= fk).length; fd = i & 1 ? -fd0 : fd0 }
  else if (k >= T.reveal && k < HITS[0].at) fd = -S.jdir === fd0 ? fd0 : (k < T.reveal + 10 ? fd0 : -S.jdir)   // spins round to face him
  else if (k >= HITS[0].at) fd = -S.jdir
  const hr = S.hitReal != null ? S.real - S.hitReal : 999
  if (S.blocked) { sprite(ctx, t, k >= HITS[0].at - 10 ? ['guard', 'idle'] : ['idle'], 9, tp.x, tp.y, z, k >= HITS[0].at - 10 ? -S.jdir : fd); return }
  if (k < HITS[0].at) { sprite(ctx, t, ['idle'], 0, tp.x, tp.y, z, fd); return }
  if (k < T.grab) { const q = hr < 8 ? 1 - hr / 8 : 0; sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fd, { skew: S.jdir * 0.2 * q, tint: hr < 2 ? '#ffffff' : null, tintA: 0.7 }); return }
  if (k < T.slam) { sprite(ctx, t, ['hurt', 'idle'], 1, tp.x, tp.y, z, fd, { rot: -S.jdir * 0.15 * smooth((k - T.grab) / 10) }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fd)
}

function fog(ctx, W, H, S, V, k, outA) {
  const fy = V.p(0, S.floor).y, z = V.z
  ctx.save()
  for (let i = 0; i < 16; i++) {
    const drift = calmMotion() ? 0 : S.real * (0.4 + hash(i, 3) * 0.6)
    const x = ((hash(i, 1) * W * 1.6 + drift * z) % (W * 1.6)) - W * 0.3, y = fy - (10 + hash(i, 2) * 50) * z, rx = (120 + hash(i, 4) * 220) * z
    ctx.globalAlpha = 0.16 * outA * smooth(k / 20); ctx.fillStyle = '#b8c4d8'
    ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.16, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function whisper(ctx, W, H, S, k) {   // ki ki ki … ma ma ma — scattered, fading in and out around the frame
  const words = ['ki', 'ki', 'ki', 'ma', 'ma', 'ma']
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  words.forEach((w, i) => {
    const t0 = 6 + i * 8 + (i > 2 ? 10 : 0), a = clamp((k - t0) / 4, 0, 1) * clamp((t0 + 26 - k) / 8, 0, 1); if (a <= 0) return
    const x = W * (0.15 + hash(i, 71) * 0.7), y = H * (0.2 + hash(i, 72) * 0.5), fs = Math.round(H * (0.04 + hash(i, 73) * 0.03))
    ctx.globalAlpha = a * 0.75; ctx.font = `italic 300 ${fs}px Georgia, "Times New Roman", serif`; ctx.fillStyle = '#c9d4e6'; ctx.fillText(w, x, y)
  })
  ctx.restore()
}
function slash(ctx, W, H, S, V, hr, tp) {
  const z = V.z, u = hr / 16, i = S.hitIdx, d = S.jdir
  const ang = i === 0 ? 0.9 : i === 1 ? -0.75 : 1.15, cx = tp.x, cy = tp.y - 60 * z
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, cy); ctx.rotate(ang * d); ctx.scale(d, 1)
  const len = W * (0.35 + 0.5 * outE(u * 3)), a = clamp(1 - u, 0, 1)
  ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -10 * z * (1 - u), len, 0); ctx.quadraticCurveTo(0, 4 * z, -len, 0); ctx.fill()
  ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#ff2a2a'; ctx.fillRect(-len * 0.8, 3 * z, len * 1.6, 2 * z)
  ctx.restore()
  ring(ctx, cx, cy, (20 + u * 120) * z, 1 - u, '#ffffff', 4 * z, 0.5)
}
function impactFrames(ctx, W, H, S, V, hr, jp, tp) {
  if (calmFlash()) return
  const z = V.z, i = S.hitIdx
  const bg = hr < 2 ? '#a00000' : '#000000', fg = hr < 2 ? '#000000' : '#ff2a2a'
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 60, 31 + i * 7 + hr, hr < 2 ? '#000000' : '#ffffff', 0.8, false, hr)
  const key = i === 1 ? ['up', 'idle'] : ['heavy', 'idle'], fr = i === 1 ? 2 : 3
  sprite(ctx, S.caster, key, fr, jp.x, jp.y, z, S.jdir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.jdir, { tint: fg, tintA: 1, skew: S.jdir * 0.2 })
}
function slamFx(ctx, W, H, S, V, sr, tp) {
  const z = V.z, u = sr / 26
  if (!calmFlash() && sr < 3) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); return }
  if (!calmFlash() && sr < 6) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); sprite(ctx, S.target, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, -S.jdir, { tint: '#ffffff', tintA: 1 }); return }
  ring(ctx, tp.x, tp.y, (30 + u * 300) * z, 1 - u, '#d8dde8', 8 * z, 0.22)
  ctx.save()
  for (let i = 0; i < 16; i++) { const an = Math.PI + hash(i, 81) * Math.PI, r = (20 + outE(u) * (80 + hash(i, 82) * 160)) * z
    ctx.globalAlpha = (1 - u) * 0.8; ctx.fillStyle = i & 1 ? '#6a5a48' : '#a8b4c8'; const sz = (3 + hash(i, 83) * 7) * z
    ctx.fillRect(tp.x + Math.cos(an) * r, tp.y + Math.sin(an) * r * 0.6 + u * u * 40 * z, sz, sz) }
  ctx.restore()
}
function endCard(ctx, W, H, S, k) {
  const a = Math.min(clamp((k - T.after - 8) / 10, 0, 1), clamp((T.out + 10 - k) / 10, 0, 1))
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const fs = Math.round(H * 0.065)
  ctx.font = `italic 700 ${fs}px Georgia, "Times New Roman", serif`; ctx.lineWidth = fs * 0.12; ctx.strokeStyle = '#000'; ctx.strokeText(S.blocked ? 'NOWHERE TO HIDE.' : 'HE ALWAYS COMES BACK.', W / 2, H * 0.22)
  ctx.fillStyle = '#e02020'; ctx.fillText(S.blocked ? 'NOWHERE TO HIDE.' : 'HE ALWAYS COMES BACK.', W / 2, H * 0.22)
  ctx.restore()
}
