// mayuriUltFx.js — RENDER-ONLY half of Mayuri's BANKAI: KONJIKI ASHISOGI JIZŌ (mayuriUlt.js). One screen pass (cineRegistry
// overlay, identity transform): world → screen from camera.js's live transform; Mayuri drawn from his real bankai-cast strip,
// the foe from their own sheets, the golden Jizō from mayuri_bankai_construct_uniform.png (4 frames).
// Layers: sickly lab grade → violet miasma vents → the Jizō (rising / breathing / looming / crushing / melting) → fighters →
// the poison breath cloud → crush spikes + shock-ring → re-blit close-ups → titles / calligraphy → impact frames →
// letterbox + subtitles. Pure functions of the scene frames; integer-hash noise only.
import { clamp, smooth, outE, inE, hash, view, sprite, punchIn, wash, speedLines, title, calligraphy, sub, letterbox, glow, rings,
  damageNumber, debris, calmMotion, calmFlash, image, ready, lerp } from './bleachUltKit.js'

const JIZO = './mayuri_bankai_construct_uniform.png', JF = 4, JH = 400   // world px tall

export function drawMayuriUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.crushReal != null ? S.real - S.crushReal : -1
  const jit = held && pr < 16 && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 18, y: (hash(S.real, 2) - 0.5) * 18 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the lab grade: sickly green-violet, deeper once the Bankai is out
  const gA = k < B.bankaiAt ? 0.35 * smooth(S.real / 14) : k < B.afterAt + 30 ? 0.55 : 0.55 * clamp(1 - (k - B.afterAt - 30) / 30, 0, 1)
  wash(ctx, W, H, '#2a1a40', gA, 'multiply'); wash(ctx, W, H, '#7aff5a', gA * 0.25, 'soft-light')

  // 2) miasma venting from the split floor
  if (k >= B.bankaiAt + 10 && k < B.afterAt + 40) vents(ctx, V, S, k, B, floorY)
  // 3) the Jizō
  const J = jizo(S, k, B)
  if (J) {
    if (k >= B.loomAt && k < B.crushAt) {   // its shadow swallows the foe
      const u = smooth((k - B.loomAt) / (B.crushAt - B.loomAt))
      ctx.save(); ctx.globalAlpha = 0.25 + 0.5 * u; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(tp.x, floorY + 4 * z, (60 + 140 * u) * z, (10 + 14 * u) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    drawJizo(ctx, V, S, k, B, J, floorY)
  }
  // 4) fighters
  drawFoe(ctx, S, V, k, tp, B)
  drawMayuri(ctx, S, V, k, fp, B)
  // 5) the poison breath
  if (k >= B.breathAt && k < B.afterAt + 50) breath(ctx, V, S, k, B, J, tp)
  // 6) the crush: blade spikes, the shock-ring, debris
  const kp = k - B.crushAt
  if (kp >= 0 && kp < 80) {
    spikes(ctx, V, S, k, B, tp, floorY)
    rings(ctx, tp.x, floorY, kp / 60, 4, W * 0.8, '#b6ff5a', 14 * z, 0.2)
    debris(ctx, tp.x, floorY, kp, 36, Math.max(1, z), 29, '#3a3a20', 460, 24)
    if (kp < 26) glow(ctx, tp.x, floorY - 40 * z, (180 + kp * 16) * z, '200,255,120', (1 - kp / 26) * 0.9)
  }
  // 7) close-ups
  if (k < B.bankaiAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 95 * z, 1 + 0.4 * smooth((k - 4) / 30))
  else if (k >= B.breathAt + 6 && k < B.loomAt) punchIn(ctx, canvas, W, H, tp.x, tp.y - 60 * z, 1 + 0.25 * smooth((k - B.breathAt - 6) / 30))
  else if (k >= B.dropAt && k < B.crushAt) punchIn(ctx, canvas, W, H, tp.x, tp.y - 50 * z, 1 + 0.35 * inE((k - B.dropAt) / (B.crushAt - B.dropAt)))
  // 8) titles
  if (k >= B.bankaiAt + 4 && k < B.riseAt + 20) calligraphy(ctx, W, H, '卍解', (k - B.bankaiAt - 4) / (B.riseAt - B.bankaiAt + 16), { x: dir > 0 ? 0.84 : 0.16, y: 0.28, size: 0.16, col: '#e8ff7a', edge: '#1a0a2a', glow: 'rgba(180,255,80,0.8)' })
  if (k >= B.riseAt + 8 && k < B.breathAt + 18) title(ctx, W, H, 'KONJIKI ASHISOGI JIZŌ', 'BANKAI  ·  MAYURI KUROTSUCHI', (k - B.riseAt - 8) / (B.breathAt - B.riseAt + 10),
    { y: 0.22, fs: 0.085, band: 'rgba(16,6,26,0.9)', edge: '#c8ff3a', fill: '#ffd84a', stroke: '#5a1a7a', kanji: '金色疋殺地蔵', kanjiCol: '#c8ff3a', subCol: '#e6d8ff' })
  if (k >= B.loomAt && k < B.crushAt) speedLines(ctx, W, H, tp.x, tp.y - 40 * z, 60, 17, '#000000', 0.4 * smooth((k - B.loomAt) / 20), true, S.real)
  // 9) impact frames
  if (pr >= 3 && pr < 7 && !calmFlash()) sil(ctx, W, H, S, V, fp, tp, J, floorY, '#ffffff', '#120a1a', pr)
  else if (pr >= 7 && pr < 12) sil(ctx, W, H, S, V, fp, tp, J, floorY, calmFlash() ? '#0a1400' : '#0a1400', '#c8ff3a', pr)
  ctx.restore()

  if (pr >= 12) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.25, pr - 12, '#b6ff3a')
  if (k >= B.laughAt && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.laughAt) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(H * 0.075)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.translate(fp.x + dir * W * 0.12, H * 0.3); ctx.rotate(-0.08 * dir)
    for (let i = 0; i < 3; i++) { const yy = i * H * 0.075, xx = i * dir * W * 0.03; ctx.lineWidth = 7; ctx.strokeStyle = '#120a1a'; ctx.strokeText('HA', xx, yy); ctx.fillStyle = '#d6ff5a'; ctx.fillText('HA', xx, yy) }
    ctx.restore()
  }
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.bankaiAt + 4, 'MAYURI', 'Allow me to show you… my masterpiece.', '#c8ff3a')
  sub(ctx, W, H, k, B.breathAt + 6, B.loomAt, 'MAYURI', 'Its breath is a poison of my own design. Do savour it.', '#c8ff3a')
  sub(ctx, W, H, k, B.afterAt + 8, B.outAt + 4, 'MAYURI', 'Perfection… is so very dull. But this came close.', '#c8ff3a')
  return true
}

// the Jizō's world placement: { x (centre), base (feet y offset above the floor, +up), a (alpha), fr, sq (squash) }
function jizo(S, k, B) {
  if (k < B.riseAt) return null
  const fr = (S.real >> 3) % JF, home = S.fx0 - S.dir * 190
  if (k < B.breathAt) return { x: home, base: -JH * (1 - outE((k - B.riseAt) / 30)), a: 1, fr, sq: 1 }
  if (k < B.loomAt) return { x: home, base: Math.sin(k * 0.08) * 6, a: 1, fr, sq: 1 }
  if (k < B.dropAt) { const u = smooth((k - B.loomAt) / (B.dropAt - B.loomAt)); return { x: lerp(home, S.tx0, u), base: 190 * u, a: 1, fr, sq: 1 } }
  if (k < B.crushAt) { const u = inE((k - B.dropAt) / (B.crushAt - B.dropAt)); return { x: S.tx0, base: 190 * (1 - u), a: 1, fr: 1, sq: 1 + 0.12 * u } }
  const kp = k - B.crushAt
  return { x: S.tx0, base: 0, a: clamp(1 - (k - B.afterAt) / 40, 0, 1), fr: 1, sq: kp < 8 ? 0.82 + kp * 0.02 : 1, melt: clamp((k - B.afterAt) / 40, 0, 1) }
}
const JSHEET = { sheet: JIZO, frames: JF, width: 165, height: 155 }
function drawJizo(ctx, V, S, k, B, J, floorY) {
  const im = image(JIZO); if (!ready(im) || J.a <= 0) return
  const z = V.z, sc = JH / 155
  const p = V.p(J.x, S.floor - Math.max(-JH, J.base))
  ctx.save()
  if (J.base < 0) { ctx.beginPath(); ctx.rect(-9999, -9999, 99999, floorY + 9999); ctx.clip() }   // rising out of the floor
  sprite(ctx, null, JSHEET, J.fr, p.x, p.y, z, S.dir, { raw: true, frame: true, s: sc, alpha: J.a, sx: 1 / Math.sqrt(J.sq), sy: J.sq < 1 ? J.sq : 1,
    tint: J.melt > 0 ? '#6a3a8a' : null, tintA: (J.melt || 0) * 0.8 })
  ctx.restore()
  if (k >= B.breathAt && J.a > 0.5) glow(ctx, p.x, p.y - JH * z * 0.95, 90 * z, '255,230,140', 0.3)
}
function vents(ctx, V, S, k, B, floorY) {
  const z = V.z, a = k < B.afterAt ? clamp((k - B.bankaiAt - 10) / 16, 0, 1) : clamp(1 - (k - B.afterAt) / 40, 0, 1)
  const fx = V.p(S.fx0, 0).x
  // the split in the floor
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#0a0410'; ctx.lineWidth = 6 * z; ctx.beginPath()
  for (let i = -8; i <= 8; i++) { const x = fx + i * 34 * z, y = floorY + (hash(i, 3) - 0.5) * 6 * z; i === -8 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
  ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(160,255,90,0.6)'; ctx.lineWidth = 2 * z; ctx.stroke(); ctx.restore()
  if (calmMotion()) return
  for (let i = 0; i < 30; i++) {
    const ph = ((S.real * (0.6 + hash(i, 5) * 0.5) + hash(i, 6) * 80) % 80) / 80
    const x = fx + (hash(i, 7) - 0.5) * 560 * z + Math.sin(S.real * 0.05 + i) * 14 * z, y = floorY - ph * 260 * z, r = (18 + ph * 50) * z
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); const c = i % 3 ? '120,60,170' : '110,200,70'
    g.addColorStop(0, `rgba(${c},${(0.45 * a * Math.sin(Math.PI * ph)).toFixed(3)})`); g.addColorStop(1, `rgba(${c},0)`)
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
}
function breath(ctx, V, S, k, B, J, tp) {
  const z = V.z, dir = S.dir, kb = k - B.breathAt
  const mouthW = J ? { x: J.x + dir * 120, y: S.floor - Math.max(0, J.base) - JH * 0.42 } : { x: S.fx0, y: S.floor - 160 }
  const mouth = V.p(mouthW.x, mouthW.y)
  const fade = k >= B.crushAt ? clamp(1 - (k - B.crushAt) / 50, 0, 1) : 1
  ctx.save()
  for (let i = 0; i < 46; i++) {
    const born = i * 1.6; if (kb < born) continue
    const age = kb - born, u = clamp(age / 50, 0, 1)
    const x = lerp(mouth.x, tp.x + dir * (hash(i, 2) - 0.3) * 260 * z, outE(u)) + Math.sin(age * 0.07 + i) * 18 * z
    const y = lerp(mouth.y, tp.y - (20 + hash(i, 3) * 120) * z, outE(u)), r = (26 + u * 90 + hash(i, 4) * 30) * z
    const c = i % 4 === 0 ? '200,255,90' : i % 2 ? '130,70,180' : '90,170,60'
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${(0.38 * fade).toFixed(3)})`); g.addColorStop(1, `rgba(${c},0)`)
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  // bubbles fizzing on the foe
  if (k >= B.ticks[0] && !calmMotion()) for (let i = 0; i < 18; i++) {
    const ph = ((S.real * 1.3 + hash(i, 9) * 40) % 40) / 40
    ctx.globalAlpha = fade * Math.sin(Math.PI * ph); ctx.strokeStyle = '#d6ff5a'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(tp.x + (hash(i, 10) - 0.5) * 70 * z, tp.y - ph * 120 * z, (2 + hash(i, 11) * 5) * z, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.restore()
}
function spikes(ctx, V, S, k, B, tp, floorY) {
  const z = V.z, kp = k - B.crushAt, a = clamp(1 - (k - B.afterAt) / 30, 0, 1)
  ctx.save(); ctx.globalAlpha = a
  for (let i = 0; i < 9; i++) {
    const x = tp.x + (i - 4) * 34 * z + (hash(i, 5) - 0.5) * 10 * z, h = (60 + hash(i, 6) * 80) * z * outE(kp / 4), lean = (i - 4) * 0.08
    ctx.fillStyle = '#c9d2dc'; ctx.strokeStyle = '#2a2a36'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x - 7 * z, floorY); ctx.lineTo(x + lean * h, floorY - h); ctx.lineTo(x + 7 * z, floorY); ctx.closePath(); ctx.fill(); ctx.stroke()
  }
  ctx.restore()
}
function drawMayuri(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z
  let fr
  if (k < B.bankaiAt) fr = Math.min(2, k >> 4)
  else if (k < B.riseAt + 10) fr = 3 + Math.min(5, Math.floor((k - B.bankaiAt) / 6))
  else if (k < B.afterAt) fr = 8
  else fr = 6 + ((k >> 3) & 1) * 2   // the laugh: shoulders shaking between two poses
  sprite(ctx, f, ['mayuriBankaiCast', 'idle'], fr, fp.x, fp.y + (k >= B.laughAt && !calmMotion() ? ((k >> 2) & 1) * 2 * z : 0), z, S.dir)
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.crushAt
  const poisoned = k >= B.ticks[0] && k < B.afterAt + 40
  const tickNow = B.ticks.some(c => k >= c && k < c + 5)
  if (kp < 0) {
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : poisoned ? ['hurt', 'idle'] : ['idle'], poisoned || S.blocked ? 9 : (S.real >> 3) % 4, tp.x + (tickNow ? (hash(k, 4) - 0.5) * 8 * z : 0), tp.y, z, fdir, { tint: poisoned ? '#7aff3a' : null, tintA: tickNow ? 0.6 : 0.3 })
    return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: kp < 6 ? 1.1 : 1, sy: kp < 6 ? 0.85 : 1 }); return }
  sprite(ctx, t, kp < 4 ? ['hurt', 'idle'] : ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir, { sx: kp < 6 ? 1.25 : 1, sy: kp < 6 ? 0.7 : 1, tint: '#7aff3a', tintA: poisoned ? 0.35 : 0 })
}
function sil(ctx, W, H, S, V, fp, tp, J, floorY, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, floorY - 30 * z, 90, 80 + pr, fg, 0.9, false, pr)
  sprite(ctx, S.caster, ['mayuriBankaiCast', 'idle'], 8, fp.x, fp.y, z, S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1, sx: 1.25, sy: 0.7 })
  const p = V.p(S.tx0, S.floor)
  sprite(ctx, null, JSHEET, 1, p.x, p.y + 20 * z, z, S.dir, { raw: true, frame: true, s: JH / 155, sx: 1.1, sy: 0.82, tint: fg, tintA: 1, alpha: 0.95 })
  ctx.restore()
}
