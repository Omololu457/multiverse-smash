// ninjaStormUltFx.js — RENDER-ONLY half of the Ninja Storm Rangers' cinematic ultimate (ninjaStormUlt.js): THUNDER FIST FINISH
// (Red / Shane, wind) and LION ZORD SLAM (Yellow / Dustin, earth). One screen pass (cineRegistry overlay, identity transform):
// world → screen from camera.js's live transform; the ninja is drawn from the REAL stance sheets (nMode power-up, nRush, nBlade,
// heavyQuake, jump, win, and the supplied giant-fist nUltBurst / nUltDebris strips scaled up as the colossal finisher).
// Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted frames; Reduce Motion → no jitter.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, hLines, title, sub, letterbox, star, glow, rings,
  damageNumber, debris, fissure, calmMotion, calmFlash, animOf } from './bleachUltKit.js'

const LOOK = {
  red: { rgb: '255,60,50', hi: '#ffd2c8', edge: '#ff3b2f', fill: '#fff1ec', stroke: '#8a0d08', band: 'rgba(24,4,4,0.93)', who: 'SHANE',
    name: 'THUNDER FIST FINISH', subt: 'NINJA STORM  ·  RED WIND RANGER', l1: 'Power of Air!', l2: 'Ninja Storm — THUNDER FIST!', l3: 'Wind, on my side.', el: 'wind' },
  yellow: { rgb: '255,200,40', hi: '#fff0b8', edge: '#f2c40c', fill: '#fffbe8', stroke: '#7a5a00', band: 'rgba(24,18,4,0.93)', who: 'DUSTIN',
    name: 'LION ZORD SLAM', subt: 'NINJA STORM  ·  YELLOW EARTH RANGER', l1: 'Power of Earth!', l2: 'Lion Zord — let ’em have it!', l3: 'Totally rocked.', el: 'earth' },
}
// every ninja cell: 160×104 / 200×136, origin = (w/2, h-4)
function ninja(ctx, f, key, fi, x, feetY, z, o = {}) {
  const a = animOf(f, key); if (!a?.sheet) return null
  const s = (f?.spriteScale || 1.8) * (a.scale || 1) * z * (o.s || 1)
  return sprite(ctx, f, [key], fi, x, feetY + 4 * s, z, o.dir ?? 1, { ...o, frame: true })
}

export function drawNinjaStormUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir, f = S.caster
  const L = S.yellow ? LOOK.yellow : LOOK.red
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.boomReal != null ? S.real - S.boomReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 20 : 9), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 20 : 9) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), gp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = gp.y
  const tg = V.p(S.tx0, S.tFloor)
  ctx.save(); ctx.translate(jit.x, jit.y)

  const dusk = k < B.calmAt ? smooth(S.real / 12) : clamp(1 - (k - B.calmAt) / 22, 0, 1)
  wash(ctx, W, H, '#0a0612', 0.5 * dusk, 'multiply'); wash(ctx, W, H, S.yellow ? '#ffb020' : '#ff2a20', 0.08 * dusk, 'soft-light')
  desat(ctx, W, H, k >= B.slowAt && k < B.boomAt ? 0.75 * smooth((k - B.slowAt) / 6) : 0)

  // element under the foe: the cyclone (Red) / rock pillars (Yellow)
  if (k >= B.liftAt - 2 && k < B.boomAt + 4) {
    const u = smooth((k - B.liftAt + 2) / 10)
    if (S.yellow) pillars(ctx, tg.x, floorY, z, u, k, B) ; else cyclone(ctx, tg.x, floorY, tp.y, z, u, S.real)
  }
  // the giant fist / lion's paw rising under the foe (behind them), then the burst
  if (k >= B.fistAt && k < B.boomAt + 26) fist(ctx, S, tg.x, floorY, z, k, B, L)

  // foe
  drawFoe(ctx, S, V, k, tp, B)
  // the ninja
  drawNinja(ctx, S, V, k, fp, gp, B, L)

  // contacts
  ;[B.rushAt, B.liftAt, B.airAt].forEach((at, i) => { const d = k - at; if (d >= 0 && d < 9) { star(ctx, tp.x, tp.y - 50 * z, (70 + i * 20 - d * 6) * z, 1 - d / 9, d * 0.3, L.hi); glow(ctx, tp.x, tp.y - 50 * z, (110 + i * 30) * z, L.rgb, (1 - d / 9) * 0.8) } })
  if (!S.yellow && k >= B.airAt - 4 && k < B.airAt + 10) crossSlash(ctx, tp.x, tp.y - 50 * z, z, k - B.airAt + 4)
  if (S.yellow && k >= B.airAt && k < B.airAt + 30) { const d = k - B.airAt; rings(ctx, gp.x + dir * 30 * z, floorY, d / 30, 3, W * 0.6, '#ffd860', 12 * z, 0.18); fissure(ctx, gp.x + dir * 30 * z, floorY, dir, 360 * z, smooth(d / 8), z, 77, 'rgba(255,190,60,0.85)') }
  if (k >= B.rushAt - 6 && k < B.rushAt + 2) hLines(ctx, W, H * 0.3, H * 0.75, 30, 9, '#ffffff', 0.6, S.real, dir)

  // finale
  if (k >= B.boomAt) {
    const kp = k - B.boomAt
    if (kp < 50) { rings(ctx, tg.x, tp.y - 50 * z, kp / 50, 4, W * 0.9, L.edge, 14 * z, 0.85); glow(ctx, tg.x, tp.y - 50 * z, (220 + kp * 20) * z, L.rgb, (1 - kp / 50) * 0.9) }
    debris(ctx, tg.x, floorY, kp, 36, z, 31, S.yellow ? '#8a6a3a' : '#5a3a36', 420, 26)
  }

  // close-ups
  if (k < 24) punchIn(ctx, canvas, W, H, gp.x, floorY - 70 * z, 1 + 0.4 * smooth(k / 18))
  else if (k >= B.rushAt - 2 && k < B.rushAt + 8) punchIn(ctx, canvas, W, H, tp.x, tp.y - 50 * z, 1 + 0.22 * Math.sin(Math.PI * (k - B.rushAt + 2) / 10))
  else if (k >= B.airAt - 2 && k < B.airAt + 10) punchIn(ctx, canvas, W, H, tp.x, tp.y - 50 * z, 1 + 0.25 * Math.sin(Math.PI * (k - B.airAt + 2) / 12))
  else if (k >= B.slowAt + 6 && k < B.boomAt) punchIn(ctx, canvas, W, H, tp.x, tp.y - 40 * z, 1 + 0.25 * smooth((k - B.slowAt - 6) / 8))

  if (k >= 10 && k < B.liftAt + 4) title(ctx, W, H, L.name, L.subt, (k - 10) / (B.liftAt - 6), { y: 0.23, fs: 0.11, band: L.band, edge: L.edge, fill: L.fill, stroke: L.stroke, from: -dir })
  if (k >= B.slowAt && k < B.boomAt) speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 70, 17, '#ffffff', 0.35 * smooth((k - B.slowAt) / 8), true, S.real)

  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, gp, tp, '#ffffff', '#140404', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, gp, tp, calmFlash() ? '#140808' : '#0e0404', L.edge, pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.22, pr - 10, L.edge)
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.rushAt - 4, L.who, L.l1, L.edge)
  sub(ctx, W, H, k, B.fistAt - 2, B.boomAt, L.who, L.l2, L.edge)
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, L.who, L.l3, L.edge)
  return true
}

function drawNinja(ctx, S, V, k, fp, gp, B, L) {
  const f = S.caster, z = V.z, dir = S.dir
  glow(ctx, gp.x, gp.y - 50 * z, 100 * z, L.rgb, k < B.calmAt ? 0.35 : 0.15)
  if (k < 26) {   // power-up: the stance's nMode strip (aura bubble + crouch → stand)
    ninja(ctx, f, 'nMode', Math.min(6, k / 4 | 0), fp.x, fp.y, z, { dir })
    if (!calmMotion()) motes(ctx, gp.x, gp.y, z, S.real, L, S.yellow)
    return
  }
  if (k < B.rushAt + 2) {   // the rush streak + after-images
    const u = (k - 26) / (B.rushAt + 2 - 26)
    for (let g = 3; g >= 1; g--) ninja(ctx, f, 'nRush', Math.min(3, (u * 4) | 0), fp.x - dir * g * 40 * z, fp.y, z, { dir, alpha: 0.18 * (4 - g), tint: L.edge, tintA: 0.7 })
    ninja(ctx, f, 'nRush', Math.min(4, (u * 5) | 0), fp.x, fp.y, z, { dir }); return
  }
  if (k < 52) { ninja(ctx, f, k < B.liftAt + 4 ? 'up' : 'idle', k < B.liftAt + 4 ? Math.min(7, (k - B.rushAt) / 2 | 0) : (S.real >> 3) % 4, fp.x, fp.y, z, { dir }); return }
  if (k < 74) {
    if (S.yellow) ninja(ctx, f, 'heavyQuake', Math.min(5, (k - 52) / 3 | 0), fp.x, fp.y, z, { dir })
    else ninja(ctx, f, k < 60 ? 'jump' : 'nBlade', k < 60 ? 1 : Math.min(11, 6 + ((k - 60) / 2 | 0)), fp.x, fp.y, z, { dir })
    return
  }
  if (k < B.calmAt) { ninja(ctx, f, 'nBlade', k < B.boomAt ? 4 : 11, fp.x, fp.y, z, { dir }); return }
  ninja(ctx, f, 'win', Math.min(2, (k - B.calmAt) / 6 | 0), fp.x, fp.y, z, { dir })
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.boomAt
  if (kp < 0) {
    const hitNow = S.lastHitK != null && k - S.lastHitK < 6
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: k >= B.liftAt ? Math.sin(S.real * (S.yellow ? 0.2 : 0.45)) * (S.yellow ? 0.1 : 0.5) : 0, tint: hitNow ? '#ffffff' : null, tintA: 0.65 })
    return
  }
  const landed = (S.ty || 0) <= 1 && kp > 24
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * kp * 0.18, tint: kp < 4 ? '#ffffff' : null, tintA: 0.85 })
}
// the supplied giant-fist strip, scaled into a colossus rising under the foe (frames 0 crouch → 1-4 eruption → 5-6 fist)
function fist(ctx, S, x, floorY, z, k, B, L) {
  const f = S.caster
  const kp = k - B.fistAt, pre = B.boomAt - B.fistAt
  const fi = kp < pre ? 1 + Math.min(3, (kp / (pre / 4)) | 0) : Math.min(6, 4 + ((k - B.boomAt) / 5 | 0))
  const grow = kp < pre ? 1.6 + 1.2 * outE(kp / pre) : 2.8 + 0.3 * smooth((k - B.boomAt) / 20)
  const a = kp < pre ? clamp(kp / 6, 0, 1) : clamp(1 - (k - B.boomAt - 16) / 10, 0, 1)
  if (a <= 0) return
  glow(ctx, x, floorY - 120 * z * grow / 2, 260 * z * grow / 2.4, L.rgb, 0.6 * a)
  ninja(ctx, f, 'nUltBurst', fi, x, floorY, z, { s: grow, alpha: a, dir: S.dir })
  if (!S.yellow && !calmMotion()) for (let i = 0; i < 4; i++) bolt(ctx, x, floorY - 90 * z * grow, z * grow, S.real + i * 13, a)
  if (k >= B.boomAt + 4) ninja(ctx, f, 'nUltDebris', Math.min(4, (k - B.boomAt - 4) / 5 | 0), x, floorY, z, { s: grow, alpha: a, dir: S.dir })
}
function bolt(ctx, x, y, z, seed, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#fff6f0'; ctx.lineWidth = 2.2 * z; ctx.shadowColor = '#ff5040'; ctx.shadowBlur = 10
  let px = x + (hash(seed, 1) - 0.5) * 120 * z, py = y - 70 * z
  ctx.beginPath(); ctx.moveTo(px, py)
  for (let i = 0; i < 6; i++) { px += (hash(seed, i + 2) - 0.5) * 50 * z; py += 22 * z; ctx.lineTo(px, py) }
  ctx.stroke(); ctx.restore()
}
function cyclone(ctx, x, floorY, topY, z, u, real) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const hgt = (floorY - topY + 140 * z) * u
  for (let i = 0; i < 26; i++) {
    const yy = floorY - (i / 26) * hgt, w = (40 + i * 5) * z, ph = real * 0.4 + i * 0.7
    ctx.globalAlpha = 0.5 * u * (0.5 + 0.5 * Math.sin(ph)); ctx.strokeStyle = i % 3 ? 'rgba(255,230,225,0.8)' : 'rgba(255,90,70,0.9)'; ctx.lineWidth = 3 * z
    ctx.beginPath(); ctx.ellipse(x, yy, w, w * 0.22, 0, ph % (Math.PI * 2), ph % (Math.PI * 2) + Math.PI * 1.2); ctx.stroke()
  }
  ctx.restore()
}
function pillars(ctx, x, floorY, z, u, k, B) {
  const down = k >= B.boomAt ? clamp((k - B.boomAt) / 10, 0, 1) : 0
  ctx.save()
  const cols = [[-70, 110, 30], [-30, 170, 36], [10, 140, 34], [50, 190, 40], [90, 120, 28]]
  for (const [dx, hh, ww] of cols) {
    const h = hh * z * outE(u) * (1 - down), px = x + dx * z, w = ww * z
    if (h <= 1) continue
    const g = ctx.createLinearGradient(px - w / 2, 0, px + w / 2, 0); g.addColorStop(0, '#4a3a22'); g.addColorStop(0.5, '#8a6c40'); g.addColorStop(1, '#3a2c18')
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px - w / 2, floorY); ctx.lineTo(px - w * 0.35, floorY - h); ctx.lineTo(px + w * 0.1, floorY - h - 14 * z); ctx.lineTo(px + w * 0.4, floorY - h + 4 * z); ctx.lineTo(px + w / 2, floorY); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(255,214,120,0.5)'; ctx.lineWidth = 1.5 * z; ctx.stroke()
  }
  ctx.restore()
}
function crossSlash(ctx, x, y, z, d) {
  const u = clamp(d / 5, 0, 1), a = d < 8 ? 1 : 1 - (d - 8) / 6
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (const s of [1, -1]) for (const [lw, col] of [[14 * z, 'rgba(255,80,60,0.5)'], [5 * z, '#ffffff']]) {
    ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw
    ctx.beginPath(); ctx.moveTo(x - 90 * z, y - s * 90 * z); ctx.lineTo(x - 90 * z + 180 * z * u, y - s * 90 * z + s * 180 * z * u); ctx.stroke()
  }
  ctx.restore()
}
function motes(ctx, x, y, z, real, L, yellow) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) {
    const ph = ((real * (0.7 + hash(i, 3) * 0.6) + hash(i, 4) * 60) % 60) / 60
    const ang = hash(i, 5) * Math.PI * 2 + (yellow ? 0 : real * 0.15)
    const px = x + Math.cos(ang) * (60 + 40 * ph) * z, py = y - (yellow ? ph * 160 : 60 + Math.sin(ang) * 40 + ph * 80) * z
    ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.8; ctx.fillStyle = yellow ? (i % 2 ? '#c8a060' : '#ffe080') : (i % 2 ? '#ffd8d0' : '#ff6a50')
    ctx.fillRect(px, py, (yellow ? 4 : 8) * z, (yellow ? 4 : 2) * z)
  }
  ctx.restore()
}
function silFrame(ctx, W, H, S, V, gp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 50 + pr, fg, 0.95, false, pr)
  ninja(ctx, S.caster, 'nUltBurst', 5, V.p(S.tx0, S.tFloor).x, gp.y, z, { s: 2.8, tint: fg, tintA: 1, dir: S.dir })
  ninja(ctx, S.caster, 'nBlade', 4, gp.x, gp.y, z, { tint: fg, tintA: 1, dir: S.dir })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
