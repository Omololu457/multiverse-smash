// arlongUltFx.js — RENDER-ONLY half of Arlong's ARLONG PARK — KIRIBACHI (arlongUlt.js). One screen pass (cineRegistry overlay,
// identity transform) owns the picture while the cinematic runs: world → screen from camera.js's live transform; Arlong (taunt /
// aDarts torpedo / aTooth bite / aSuper Kiribachi strip), his FX sheets (fx_drill, fx_jets, fx_burst_a) and the foe all from
// their REAL sheets. Layers: the flood (a rising water body with a rolling surface, caustics, bubbles) → fighters → torpedo
// trails / shark fin / drill bite → geyser → the slam splash wall → re-blit close-ups → titles → impact frames → letterbox +
// subtitles. Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted frames; Reduce
// Motion → no jitter / drifting bubbles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  damageNumber, calmMotion, calmFlash, lerp } from './bleachUltKit.js'
import { ARLONG_FX } from './arlongSprites.js'

const raw = o => o ? { sheet: o.sheet, frames: o.frames || 1, width: o.w, height: o.h } : null
const DRILL = raw(ARLONG_FX.drill), JETS = raw(ARLONG_FX.jets), BURST = raw(ARLONG_FX.burstA)
// torpedo paths [start dx, dy, end dx, dy] around the foe's centre (× facing) — four different angles
const PATHS = [[-300, -10, 240, -20], [300, -40, -240, 10], [-220, 60, 180, -90], [220, -110, -170, 40]]

export function drawArlongUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir, f = S.caster
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.hitReal != null ? S.real - S.hitReal : -1
  const hpr = S.lastHit ? S.real - S.lastHit.real : 99
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 20 : 9), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 20 : 9) } : { x: 0, y: 0 }
  const fp = V.p(S.fx0, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), t0 = V.p(S.tx0, S.tFloor), floorY = fp.y, rp = V.p(S.rise, S.floor)
  const tc = { x: tp.x, y: tp.y - 50 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grade
  if (k < B.floodAt) wash(ctx, W, H, '#000000', 0.4 * smooth(S.real / 14))
  if (k >= B.riseAt + 14 && k < B.slamAt) desat(ctx, W, H, 0.6 * smooth((k - B.riseAt - 14) / 10))

  // 2) the water surface height (screen y): floods up, holds, drains
  const surf = waterY(B, k, floorY, H, z)
  const under = surf < floorY + 2

  // 3) fighters (the water is drawn OVER them, so they read as submerged)
  if (under) water(ctx, W, H, surf, z, S.real, k, B, false)
  drawFoe(ctx, S, V, k, tp, B, under)
  drawArlong(ctx, S, V, k, fp, rp, tc, B)
  if (under) water(ctx, W, H, surf, z, S.real, k, B, true)
  if (k >= B.diveAt && k < B.riseAt && under) fin(ctx, S, V, k, surf, tc, B, z)
  if (under && !calmMotion()) bubbles(ctx, W, H, surf, S.real, tc)

  // 4) hits: the torpedo impact bursts, the drill bite
  if (S.lastHit && hpr < 14 && k < B.riseAt) {
    const a = 1 - hpr / 14
    rings(ctx, tc.x, tc.y, hpr / 14, 2, 220 * z, '#cfefff', 8 * z, 0.8)
    star(ctx, tc.x, tc.y, 120 * z * a, a, hpr * 0.2, '#e8f8ff')
    if (BURST) sprite(ctx, f, BURST, Math.min(2, hpr >> 2), tc.x, tc.y, z * 1.4, dir, { anchor: 'centre', alpha: a })
  }

  // 5) the geyser + the slam splash
  if (k >= B.riseAt && k < B.slamAt + 6) geyser(ctx, rp.x, floorY, z, k - B.riseAt, H)
  const kp = k - B.slamAt
  if (kp >= 0 && kp < 60) { splashWall(ctx, t0.x, floorY, z, kp, W, S.real); rings(ctx, t0.x, floorY - 6 * z, kp / 60, 3, W * 0.9, '#bfe8ff', 14 * z, 0.25) }
  if (kp >= 0 && kp < 20) glow(ctx, t0.x, floorY - 50 * z, (200 + kp * 20) * z, '210,240,255', 1 - kp / 20)

  // 6) close-ups
  if (k < B.floodAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 100 * z, 1.15 + 0.35 * smooth(k / 30))
  else if (k >= 74 && k < B.riseAt) punchIn(ctx, canvas, W, H, tc.x, tc.y, 1.2 + (hpr < 4 ? 0.15 * (1 - hpr / 4) : 0))
  else if (k >= B.riseAt + 14 && k < B.slamAt) punchIn(ctx, canvas, W, H, rp.x, floorY - 200 * z, 1 + 0.25 * smooth((k - B.riseAt - 14) / 16))

  // 7) titles + calligraphy
  if (k >= 6 && k < B.floodAt) calligraphy(ctx, W, H, '魚人', (k - 6) / (B.floodAt - 6), { x: dir > 0 ? 0.86 : 0.14, y: 0.24, size: 0.14, col: '#e8f4ff', edge: '#0a2a4a', glow: 'rgba(80,180,255,0.8)' })
  if (k >= B.floodAt + 4 && k < B.diveAt + 26) title(ctx, W, H, 'ARLONG PARK', 'THE SAW-TOOTH ARLONG  ·  アーロンパーク', (k - B.floodAt - 4) / (B.diveAt + 22 - B.floodAt),
    { y: 0.22, fs: 0.13, band: 'rgba(4,20,44,0.9)', edge: '#4ab8ff', fill: '#ffffff', stroke: '#0a3a7a', kanji: '鮫', kanjiCol: '#4ab8ff' })
  if (S.lastHit && hpr < 18 && k < B.riseAt) stamp(ctx, W, H, S.lastHit.i < 4 ? 'SHARK ON DARTS' : 'SHARK ON TOOTH!!', S.lastHit.i < 4 ? '鮫・ON・DARTS' : '鮫・ON・歯', hpr, S.lastHit.i, dir)
  if (k >= B.riseAt + 12 && k < B.slamAt + 20) title(ctx, W, H, 'KIRIBACHI!!', 'ARLONG PARK  ·  キリバチ', (k - B.riseAt - 12) / (B.slamAt + 20 - B.riseAt - 12),
    { y: 0.2, fs: 0.13, band: 'rgba(8,6,4,0.92)', edge: '#ffb020', fill: '#ffffff', stroke: '#7a3a00', kanji: '鋸', kanjiCol: '#ffb020' })

  // 8) impact frames
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, rp, tp, '#ffffff', '#000000', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, rp, tp, calmFlash() ? '#041020' : '#000000', '#4ab8ff', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, t0.x, t0.y - H * 0.3, pr - 10, '#7fd0ff')
  else if (S.lastHit && hpr < 40 && k < B.riseAt) damageNumber(ctx, W, H, S, tc.x + dir * 110 * z, tc.y - H * 0.12, hpr + 20, '#ffffff')

  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.floodAt, 'ARLONG', 'Humans are an inferior species. Let me show you why!', '#4ab8ff')
  sub(ctx, W, H, k, B.diveAt + 6, 112, 'ARLONG', 'In the water, a fishman is ten times stronger!', '#4ab8ff')
  sub(ctx, W, H, k, B.riseAt + 4, B.slamAt, 'ARLONG', 'KIRIBACHI!!', '#4ab8ff')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'ARLONG', 'Shahahaha! Know your place, human!', '#4ab8ff')
  return true
}

function waterY(B, k, floorY, H, z) {
  const top = Math.max(H * 0.18, floorY - 330 * z)
  if (k < B.floodAt) return floorY + 40
  if (k < B.floodAt + 20) return lerp(floorY + 20, top, outE((k - B.floodAt) / 20))
  if (k < B.riseAt) return top
  if (k < B.slamAt) return lerp(top, floorY - 60 * z, smooth((k - B.riseAt) / (B.slamAt - B.riseAt)))   // the geyser pulls the sea up
  if (k < B.recedeAt) return floorY - 60 * z
  return lerp(floorY - 60 * z, floorY + 40, smooth((k - B.recedeAt) / (B.calmAt - B.recedeAt)))
}
function water(ctx, W, H, sy, z, real, k, B, front) {
  ctx.save()
  const path = () => { ctx.beginPath(); ctx.moveTo(-20, H + 20); for (let x = -20; x <= W + 20; x += 16) ctx.lineTo(x, sy + Math.sin(x * 0.02 + real * 0.15) * 6 * z + Math.sin(x * 0.045 - real * 0.1) * 3 * z); ctx.lineTo(W + 20, H + 20); ctx.closePath() }
  if (!front) {   // the sea behind the fighters
    path(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,140,215,0.95)'; ctx.fill()
    path(); ctx.globalCompositeOperation = 'source-over'; const g = ctx.createLinearGradient(0, sy, 0, H); g.addColorStop(0, 'rgba(60,170,240,0.25)'); g.addColorStop(1, 'rgba(4,30,70,0.45)'); ctx.fillStyle = g; ctx.fill()
    ctx.restore(); return
  }
  path(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(50,140,220,0.13)'; ctx.fill()   // a thin veil in front
  // caustics: soft light ribbons under the surface
  ctx.save(); path(); ctx.clip(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 9; i++) {
    const x = ((hash(i, 3) * W * 1.4 + real * (0.6 + hash(i, 4))) % (W * 1.4)) - W * 0.2
    ctx.globalAlpha = 0.08 + 0.06 * Math.sin(real * 0.1 + i); ctx.fillStyle = '#bfeaff'
    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + 40, sy); ctx.lineTo(x - 60 + Math.sin(real * 0.05 + i) * 30, H); ctx.lineTo(x - 140, H); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  // the bright rolling surface line + foam
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,240,255,0.8)'; ctx.lineWidth = 3
  ctx.beginPath(); for (let x = -20; x <= W + 20; x += 16) { const y = sy + Math.sin(x * 0.02 + real * 0.15) * 6 * z + Math.sin(x * 0.045 - real * 0.1) * 3 * z; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke()
  // the flood's leading wall while it rushes in
  if (k >= B.floodAt && k < B.floodAt + 22) { const u = (k - B.floodAt) / 22; ctx.globalAlpha = 1 - u; ctx.fillStyle = '#e8f8ff'; for (let i = 0; i < 40; i++) ctx.fillRect(hash(i, 9) * W, sy - hash(i, k) * 40 * z, 3 + hash(i, 8) * 6, 3 + hash(i, 7) * 6) }
  ctx.restore()
}
function bubbles(ctx, W, H, sy, real, tc) {
  ctx.save(); ctx.strokeStyle = 'rgba(220,245,255,0.7)'; ctx.lineWidth = 1.5
  for (let i = 0; i < 40; i++) {
    const ph = ((real * (0.5 + hash(i, 2)) + hash(i, 3) * 120) % 120) / 120, near = i < 12
    const x = near ? tc.x + (hash(i, 4) - 0.5) * 120 + Math.sin(real * 0.1 + i) * 8 : hash(i, 4) * W, y = lerp(H, sy, ph)
    if (y < sy) continue
    ctx.globalAlpha = 0.7 * (1 - ph * 0.5); ctx.beginPath(); ctx.arc(x, y, 2 + hash(i, 5) * 5, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.restore()
}
// the shark fin slicing the surface between the strikes
function fin(ctx, S, V, k, sy, tc, B, z) {
  const busy = B.darts.some(dk => k >= dk - 8 && k <= dk + 6) || (k >= B.toothAt - 10 && k <= B.toothAt + 6)
  if (busy) return
  const x = tc.x + Math.sin(k * 0.09) * 260 * z, vx = Math.cos(k * 0.09)
  ctx.save(); ctx.translate(x, sy + 4 * z); if (vx < 0) ctx.scale(-1, 1)
  ctx.fillStyle = '#5a6a7a'; ctx.strokeStyle = '#1a2430'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(-26 * z, 0); ctx.quadraticCurveTo(-6 * z, -20 * z, 14 * z, -46 * z); ctx.quadraticCurveTo(8 * z, -18 * z, 22 * z, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = 'rgba(230,248,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-60 * z, 2 * z); ctx.quadraticCurveTo(-30 * z, -4 * z, -20 * z, 2 * z); ctx.stroke()
  ctx.restore(); void S; void V
}
function drawArlong(ctx, S, V, k, fp, rp, tc, B) {
  const f = S.caster, z = V.z, dir = S.dir
  if (k < B.floodAt) { sprite(ctx, f, k < 16 ? ['taunt', 'idle'] : ['idleFlex', 'idle'], k < 16 ? (k >> 3) % 3 : 4 + ((k >> 3) % 3), fp.x, fp.y, z, dir); return }
  if (k < B.diveAt + 10) { const u = clamp((k - B.diveAt) / 10, 0, 1); sprite(ctx, f, ['aSuper'], k < B.diveAt ? 1 : 2, fp.x, fp.y + u * 60 * z, z, dir, { alpha: 1 - u * 0.6 }); return }
  // the torpedo strikes: aDarts frame 0 (a horizontal shark dart) along each path, a jet + bubble trail behind
  for (let i = 0; i < B.darts.length; i++) {
    const hk = B.darts[i], t0 = hk - 8, t1 = hk + 6
    if (k < t0 || k > t1) continue
    const [sx, sy, ex, ey] = PATHS[i], u = (k - t0) / (t1 - t0)
    const x = tc.x + dir * lerp(sx, ex, u) * z, y = tc.y + lerp(sy, ey, u) * z, ang = Math.atan2((ey - sy) * z, dir * (ex - sx) * z)
    const face = Math.cos(ang) >= 0 ? 1 : -1, rot = face > 0 ? ang : ang - Math.PI
    for (let g = 1; g <= 4; g++) sprite(ctx, f, ['aDarts'], 0, x - Math.cos(ang) * g * 26 * z, y - Math.sin(ang) * g * 26 * z, z, face, { anchor: 'centre', rot, alpha: 0.13 * (5 - g), tint: '#bfe8ff', tintA: 0.8 })
    if (JETS) sprite(ctx, f, JETS, (k >> 1) % 5, x - Math.cos(ang) * 60 * z, y - Math.sin(ang) * 60 * z, z, face, { anchor: 'centre', rot, alpha: 0.9 })
    sprite(ctx, f, ['aDarts'], 0, x, y, z, face, { anchor: 'centre', rot })
    return
  }
  if (k >= B.toothAt - 10 && k < B.toothAt + 10) {   // SHARK ON TOOTH: the spinning drill bite
    const u = clamp((k - B.toothAt + 10) / 10, 0, 1), x = lerp(tc.x - dir * 240 * z, tc.x - dir * 30 * z, smooth(u))
    if (DRILL) sprite(ctx, f, DRILL, (k >> 1) % 3, x + dir * 20 * z, tc.y, z * 1.3, dir, { anchor: 'centre', rot: dir * Math.PI / 2 })
    sprite(ctx, f, ['aTooth'], k < B.toothAt ? 1 + ((k >> 1) % 3) : 0, x, tc.y + 40 * z, z, dir)
    return
  }
  if (k < B.riseAt) return                                    // submerged: only the fin shows
  if (k < B.slamAt) {   // the geyser throws him up; the Kiribachi over his head
    const u = clamp((k - B.riseAt) / 16, 0, 1), up = Math.sin(Math.PI * 0.5 * u) * 190 * z - (k > B.slamAt - 8 ? (k - B.slamAt + 8) / 8 * 190 * z : 0)
    sprite(ctx, f, ['aSuper'], k < B.riseAt + 10 ? 3 : 8, rp.x, rp.y - Math.max(0, up), z, dir, { s: 1.1 })
    return
  }
  if (k < B.calmAt) { sprite(ctx, f, ['aSuper'], k < B.slamAt + 10 ? 6 : 7, rp.x, rp.y, z, dir, { s: 1.1 }); return }
  sprite(ctx, f, ['win', 'taunt', 'idle'], 0, rp.x, rp.y, z, dir)
}
function drawFoe(ctx, S, V, k, tp, B, under) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.slamAt
  if (kp < 0) {
    const hit = S.lastHit && S.real - S.lastHit.real < 10
    const keys = S.blocked ? ['guard', 'idle'] : under && k > B.floodAt + 16 ? ['hurt_air', 'hurt', 'idle'] : hit ? ['hurt', 'idle'] : ['idle']
    sprite(ctx, t, keys, 0, tp.x, tp.y, z, fdir, { tint: hit && S.real - S.lastHit.real < 3 ? '#ffffff' : null, tintA: 0.7, rot: under && !S.blocked ? Math.sin(k * 0.08) * 0.12 : 0, anchor: under && !S.blocked ? 'centre' : null })
    return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  sprite(ctx, t, kp < 8 ? ['hurt', 'idle'] : ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir, { sx: kp < 8 ? 1.15 : 1, sy: kp < 8 ? 0.85 : 1, tint: kp < 3 ? '#ffffff' : null, tintA: 0.8 })
}
function geyser(ctx, x, floorY, z, kk, H) {
  const u = clamp(kk / 10, 0, 1), top = floorY - (420 * z) * outE(u), wv = 60 * z * (0.7 + 0.3 * Math.sin(kk * 0.5)), a = clamp(1 - (kk - 30) / 10, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createLinearGradient(x - wv, 0, x + wv, 0); g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.5, 'rgba(230,248,255,0.9)'); g.addColorStop(1, 'rgba(120,200,255,0)')
  ctx.fillStyle = g; ctx.fillRect(x - wv, top, wv * 2, floorY - top)
  ctx.fillStyle = '#ffffff'; for (let i = 0; i < 24; i++) { const px = x + (hash(i, kk) - 0.5) * wv * 3, py = top + hash(i, 7) * 80 * z - 20 * z; ctx.beginPath(); ctx.arc(px, py, (3 + hash(i, 5) * 7) * z, 0, Math.PI * 2); ctx.fill() }
  ctx.restore(); void H
}
function splashWall(ctx, x, floorY, z, kp, W, real) {
  const u = clamp(kp / 40, 0, 1), a = clamp(1 - (kp - 16) / 40, 0, 1)
  ctx.save(); ctx.globalAlpha = a
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1, sp = (2 + hash(i, 3) * 9) * z, h = (10 + hash(i, 4) * 26) * z, tt = kp * 0.9
    const px = x + side * sp * tt * 1.6, py = floorY - (h * tt - 0.55 * tt * tt * z)
    if (py > floorY + 4) continue
    ctx.fillStyle = i % 3 ? 'rgba(200,236,255,0.9)' : '#ffffff'; ctx.beginPath(); ctx.arc(px, py, (4 + hash(i, 5) * 9) * z, 0, Math.PI * 2); ctx.fill()
  }
  const g = ctx.createRadialGradient(x, floorY, 0, x, floorY, (80 + 300 * outE(u)) * z); g.addColorStop(0, 'rgba(230,248,255,0.8)'); g.addColorStop(1, 'rgba(120,200,255,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, floorY, (80 + 300 * outE(u)) * z, (60 + 200 * outE(u)) * z, 0, Math.PI, Math.PI * 2); ctx.fill()
  ctx.restore(); void W; void real
}
function stamp(ctx, W, H, en, jp, age, i, dir) {
  const a = clamp((18 - age) / 6, 0, 1), sc = 1 + Math.max(0, 1 - age / 4) * 0.6, x = W * ((i % 2 ? dir < 0 : dir > 0) ? 0.8 : 0.2)
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, H * 0.36); ctx.scale(sc, sc); ctx.rotate((i % 2 ? 1 : -1) * 0.06)
  const fs = Math.round(H * (i === 4 ? 0.07 : 0.055)); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#04182e'; ctx.strokeText(en, 0, 0); ctx.fillStyle = i === 4 ? '#ffd23a' : '#dff4ff'; ctx.fillText(en, 0, 0)
  ctx.font = `800 ${Math.round(H * 0.026)}px system-ui, sans-serif`; ctx.lineWidth = 4; ctx.strokeText(jp, 0, fs * 0.75); ctx.fillStyle = '#4ab8ff'; ctx.fillText(jp, 0, fs * 0.75)
  ctx.restore()
}
function silFrame(ctx, W, H, S, V, rp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 40 + pr, fg, 0.95, false, pr)
  sprite(ctx, S.caster, ['aSuper'], 6, rp.x, rp.y, z, S.dir, { tint: fg, tintA: 1, s: 1.1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
