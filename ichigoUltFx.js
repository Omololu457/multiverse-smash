// ichigoUltFx.js — RENDER-ONLY half of Ichigo's TENSA ZANGETSU: GETSUGA TENSHŌ (ichigoUlt.js). One screen pass (cineRegistry
// overlay, identity transform): world → screen from camera.js's live transform; Ichigo drawn from his REAL strips (charge,
// ultimate part 1 dash-slash, part 2 rising cut, air Getsuga, return stance), the foe from their own sheets.
// Layers: night grade + the pale fang-moon → black reiatsu flames with a crimson rim → fighters → the black crescent (Getsuga)
// and its wake → re-blit close-ups → calligraphy / title → impact frames → letterbox + subtitles.
// Pure functions of the scene frames; integer-hash noise only.
import { clamp, smooth, outE, inE, hash, view, sprite, punchIn, wash, speedLines, hLines, title, calligraphy, sub, letterbox, glow, rings,
  damageNumber, calmMotion, calmFlash, lerp, star } from './bleachUltKit.js'

export function drawIchigoUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.impactReal != null ? S.real - S.impactReal : -1
  const jit = held && pr < 16 && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 16, y: (hash(S.real, 2) - 0.5) * 16 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = V.p(0, S.floor).y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the grade: dusk → night once the Getsuga is called, a pale fang-moon over the stage
  const nA = k < B.getsugaAt ? 0.25 + 0.2 * smooth(k / B.chargeAt) : k < B.afterAt + 20 ? 0.62 : 0.62 * clamp(1 - (k - B.afterAt - 20) / 30, 0, 1)
  wash(ctx, W, H, '#100818', nA, 'multiply')
  if (k >= B.getsugaAt - 6 && k < B.outAt) moon(ctx, W, H, S, k, B)
  if (k >= B.dashAt && k < B.riseAt) hLines(ctx, W, H * 0.15, H * 0.85, 40, 9, '#ffffff', 0.35, S.real, dir)

  // 2) the black reiatsu (behind him)
  const auraA = k < B.chargeAt ? smooth(k / 20) * 0.6 : k < B.afterAt ? 1 : clamp(1 - (k - B.afterAt) / 30, 0, 1)
  if (auraA > 0) aura(ctx, fp, z, S.real, auraA * (k >= B.chargeAt && k < B.dashAt ? 1.3 : 1), k)
  if (k >= B.chargeAt && k < B.dashAt && !calmMotion()) suck(ctx, fp, z, S.real, smooth((k - B.chargeAt) / 20), dir)

  // 3) fighters
  drawFoe(ctx, S, V, k, tp, B)
  drawIchigo(ctx, S, V, k, fp, B)
  // dash-slash streak + the rising cut arc
  if (k >= B.dashAt && k < B.dashHit + 8) { const a = V.p(S.fx0, S.floor - 50), b = V.p(S.fx1 + dir * 60, S.floor - 50); slash(ctx, a.x, a.y, b.x, b.y + 10 * z, 1 - clamp((k - B.dashHit) / 8, 0, 1), z) }
  if (k >= B.riseHit - 2 && k < B.riseHit + 12) { const u = (k - B.riseHit + 2) / 14; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#ff3a2a'; ctx.lineWidth = 10 * z
    ctx.beginPath(); ctx.arc(tp.x - dir * 20 * z, tp.y - 30 * z, 80 * z, dir > 0 ? Math.PI * 0.55 : Math.PI * 0.45, dir > 0 ? Math.PI * 1.6 : -Math.PI * 0.6, dir < 0); ctx.stroke()
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * z; ctx.stroke(); ctx.restore() }
  for (const h of [B.dashHit, B.riseHit]) if (k >= h && k < h + 6) star(ctx, tp.x, tp.y - 50 * z, 70 * z * (1 - (k - h) / 6), 1, k * 0.3, '#ffe0d0')

  // 4) the Getsuga
  if (k >= B.fireAt) getsuga(ctx, W, H, S, V, k, B, fp, tp)

  // 5) close-ups
  if (k < B.chargeAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 70 * z, 1 + 0.35 * smooth((k - 4) / 34))
  else if (k >= 64 && k < B.dashAt) punchIn(ctx, canvas, W, H, fp.x + dir * 30 * z, fp.y - 50 * z, 1 + 0.4 * smooth((k - 64) / 28))
  else if (k >= B.getsugaAt + 4 && k < B.fireAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 50 * z, 1.15 + 0.3 * smooth((k - B.getsugaAt - 4) / 20))

  // 6) words
  if (k >= B.chargeAt + 4 && k < B.dashAt + 4) calligraphy(ctx, W, H, '月牙天衝', (k - B.chargeAt - 4) / (B.dashAt - B.chargeAt), { x: dir > 0 ? 0.86 : 0.14, y: 0.17, size: 0.13, col: '#111111', edge: '#ff2a1a', glow: 'rgba(255,30,20,0.9)' })
  if (k >= B.getsugaAt + 2 && k < B.fireAt + 8) title(ctx, W, H, 'GETSUGA TENSHŌ', 'TENSA ZANGETSU  ·  ICHIGO KUROSAKI', (k - B.getsugaAt - 2) / (B.fireAt + 6 - B.getsugaAt),
    { y: 0.78, fs: 0.12, band: 'rgba(6,2,4,0.92)', edge: '#ff2a1a', fill: '#ffffff', stroke: '#000000', kanji: '月牙天衝', kanjiCol: '#ff3a2a', subCol: '#ffb0a0', from: -dir })
  // 7) impact frames
  if (pr >= 3 && pr < 7 && !calmFlash()) sil(ctx, W, H, S, V, fp, tp, '#ffffff', '#000000', pr)
  else if (pr >= 7 && pr < 12) sil(ctx, W, H, S, V, fp, tp, calmFlash() ? '#200404' : '#d8120a', '#000000', pr)
  ctx.restore()

  if (pr >= 12) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.18, pr - 12)
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.chargeAt + 30, 'ICHIGO', "I'll put everything into this one strike!", '#ff6a3a')
  sub(ctx, W, H, k, B.riseAt, B.getsugaAt, 'ICHIGO', 'Blow away!', '#ff6a3a')
  sub(ctx, W, H, k, B.getsugaAt, B.impactAt + 6, 'ICHIGO', 'GETSUGA… TENSHŌ!', '#ff6a3a')
  sub(ctx, W, H, k, B.landAt + 12, B.outAt + 4, 'ICHIGO', 'This is my own power.', '#ff6a3a')
  return true
}

function drawIchigo(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, dir = S.dir
  let keys = ['idle'], fr = (S.real >> 3) % 3, o = {}
  if (k >= 20 && k < B.dashAt) { keys = ['charge', 'idle']; fr = k < 40 ? Math.min(2, (k - 20) >> 3) : 2 + ((k >> 3) % 3) }
  else if (k >= B.dashAt && k < B.riseAt) { keys = ['ichigoUlt1']; fr = Math.min(8, Math.floor((k - B.dashAt) / 1.6)) }
  else if (k >= B.riseAt && k < B.swingAt) { keys = ['ichigoUlt2']; fr = Math.min(4, (k - B.riseAt) >> 2) }
  else if (k >= B.swingAt && k < B.afterAt) { keys = ['ichigoAirGetsuga', 'ichigoUlt2']; fr = Math.min(4, (k - B.swingAt) >> 2) }
  else if (k >= B.afterAt && k < B.landAt) { keys = ['fall', 'jump', 'idle']; fr = 0 }
  else if (k >= B.landAt) { keys = ['ichigoReturn', 'idle']; fr = Math.min(6, (k - B.landAt) >> 2) }
  if (k >= B.dashAt && k < B.dashHit + 2 && !calmMotion()) for (let g = 4; g >= 1; g--) sprite(ctx, f, keys, fr, fp.x - dir * g * 34 * z, fp.y, z, dir, { alpha: 0.15 * (5 - g), tint: '#000000', tintA: 0.85 })
  sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, o)
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k < B.dashHit) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  const hitNow = [B.dashHit, B.riseHit].some(h => k >= h && k < h + 3) || (k >= B.impactAt && k < B.impactAt + 3)
  if (k >= B.impactAt && k < B.impactAt + 20) { sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { tint: '#ff2010', tintA: 0.55, rot: -S.dir * (k - B.impactAt) * 0.2 }); return }
  const landed = k >= B.landAt + 6
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed || k < B.riseHit ? 0 : -S.dir * 0.4, tint: hitNow ? '#ffffff' : null, tintA: 0.7 })
}
function sil(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 60 + pr, fg, 0.9, false, pr)
  sprite(ctx, S.caster, ['ichigoAirGetsuga', 'ichigoUlt2'], 4, fp.x, fp.y, z, S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1, sx: 0.85, sy: 1.08 })
  crescent(ctx, tp.x, tp.y - 50 * z, 150 * z, S.dir, 1, fg, fg)
  ctx.restore()
}

// ── FX ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
function aura(ctx, fp, z, real, a, k) {
  ctx.save()
  for (let i = 0; i < 26; i++) {
    const ph = ((real * (1.1 + hash(i, 2) * 0.8) + hash(i, 3) * 30) % 30) / 30, side = (hash(i, 4) - 0.5) * 2
    const x = fp.x + side * 34 * z, y = fp.y - ph * 150 * z, len = (40 + 60 * hash(i, 5)) * z * (0.6 + 0.4 * a), w = (10 + 10 * hash(i, 6)) * z
    ctx.globalAlpha = clamp(a, 0, 1) * Math.sin(Math.PI * ph) * 0.85
    ctx.fillStyle = '#0a0204'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x + side * 10 * z, y - len * 0.6, x + side * 18 * z, y - len); ctx.quadraticCurveTo(x + w * 0.4, y - len * 0.4, x + w, y); ctx.fill()
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ff2a1a'; ctx.lineWidth = 1.5 * z; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
  glow(ctx, fp.x, fp.y - 60 * z, 120 * z, '255,30,20', 0.25 * clamp(a, 0, 1))
  void k
}
function suck(ctx, fp, z, real, u, dir) {
  const cx = fp.x + dir * 40 * z, cy = fp.y - 50 * z
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 34; i++) {
    const an = hash(i, 11) * Math.PI * 2, ph = ((real * (1.2 + hash(i, 2)) + hash(i, 3) * 40) % 40) / 40, d0 = (40 + (1 - ph) * 360) * z, len = (20 + hash(i, 4) * 40) * z
    ctx.globalAlpha = u * ph * 0.7; ctx.strokeStyle = i % 3 ? '#ff6a5a' : '#ffffff'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * d0, cy + Math.sin(an) * d0 * 0.6); ctx.lineTo(cx + Math.cos(an) * (d0 - len), cy + Math.sin(an) * (d0 - len) * 0.6); ctx.stroke()
  }
  ctx.restore()
}
function slash(ctx, x0, y0, x1, y1, a, z) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.lineCap = 'round'
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 16 * z; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ff2a1a'; ctx.lineWidth = 5 * z; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * z; ctx.stroke()
  ctx.restore()
}
// a standing crescent of radius R at (x, y), its bulge facing dir
export function crescent(ctx, x, y, R, dir, a, fill = '#050002', rim = '#ff2a1a') {
  if (a <= 0) return
  const path = () => { ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, Math.PI / 2, dir < 0); ctx.arc(x - dir * R * 0.38, y, R * 0.86, Math.PI / 2, -Math.PI / 2, dir > 0); ctx.closePath() }
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = rim; ctx.shadowBlur = R * 0.3; path(); ctx.strokeStyle = rim; ctx.lineWidth = R * 0.08; ctx.stroke()
  ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over'; path(); ctx.fillStyle = fill; ctx.fill()
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,220,200,0.8)'; ctx.lineWidth = Math.max(1.5, R * 0.015)
  ctx.beginPath(); ctx.arc(x, y, R * 0.995, -Math.PI / 2, Math.PI / 2, dir < 0); ctx.stroke()
  ctx.restore()
}
function getsuga(ctx, W, H, S, V, k, B, fp, tp) {
  const z = V.z, dir = S.dir, kf = k - B.fireAt
  const start = { x: fp.x + dir * 50 * z, y: fp.y - 50 * z }, hitP = { x: tp.x, y: tp.y - 50 * z }
  let x, y, R, a = 1
  if (k < B.impactAt) { const u = inE(kf / (B.impactAt - B.fireAt)); x = lerp(start.x, hitP.x, u); y = lerp(start.y, hitP.y, u); R = (110 + 60 * u) * z }
  else { const u = clamp((k - B.impactAt) / 46, 0, 1); x = hitP.x + dir * outE(u) * W * 0.9; y = hitP.y - outE(u) * H * 0.75; R = (170 + 260 * u) * z; a = 1 - u * u }
  // its wake: a black trench across the air with crimson embers
  ctx.save(); ctx.globalAlpha = 0.6 * a; ctx.strokeStyle = '#000'; ctx.lineWidth = R * 0.5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(x - dir * R * 0.3, y); ctx.stroke(); ctx.restore()
  if (!calmMotion()) { ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 40; i++) { const u = hash(i, 21), px = lerp(start.x, x, u) + (hash(i, 22) - 0.5) * R * 0.7, py = lerp(start.y, y, u) + (hash(i, 23) - 0.5) * R * 0.9 - (kf * 1.4 * hash(i, 24)) * z
      ctx.globalAlpha = a * (0.3 + 0.6 * hash(i, 25)); ctx.fillStyle = i % 3 ? '#ff2a1a' : '#ffb08a'; ctx.fillRect(px, py, 3 * z, 3 * z) }
    ctx.restore() }
  crescent(ctx, x, y, R, dir, a)
  if (k >= B.impactAt && k < B.impactAt + 40) {
    const u = (k - B.impactAt) / 40
    rings(ctx, hitP.x, hitP.y, u, 4, W * 0.7, '#ff3a2a', 12 * z, 0.75)
    glow(ctx, hitP.x, hitP.y, (220 + 300 * u) * z, '255,40,20', (1 - u) * 0.8)
  }
}
function moon(ctx, W, H, S, k, B) {
  const a = Math.min(clamp((k - B.getsugaAt + 6) / 14, 0, 1), clamp((B.outAt - k) / 24, 0, 1))
  const x = W * (S.dir > 0 ? 0.74 : 0.26), y = H * 0.27, r = H * 0.16
  ctx.save(); ctx.globalAlpha = a
  glow(ctx, x, y, r * 2.4, '255,240,230', 0.35)
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x + S.dir * r * 0.45, y - r * 0.15, r * 0.92, 0, Math.PI * 2); ctx.clip('evenodd')
  ctx.fillStyle = '#f6efe6'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
