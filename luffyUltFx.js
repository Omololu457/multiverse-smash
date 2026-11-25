// luffyUltFx.js — RENDER-ONLY half of Luffy's GEAR 5 — GOMU GOMU NO BAJRANG GUN (luffyUlt.js). One screen pass (cineRegistry
// overlay, identity transform) owns the picture while the cinematic runs: world → screen from camera.js's live transform, both
// fighters from their REAL sheets (Luffy's every action ships a __gear5 white recolour — used for the awakening).
// Layers: sun-god sky wash → cloud ring + steam → floor shadow / crater → fighters → the rubber arm + COLOSSAL FIST (Haki-
// blackened, red lightning) → shockwave dome / debris → re-blit close-ups → titles / toon bubbles → impact frames →
// letterbox + subtitles. Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted frames;
// Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, inE, hash, view, sprite, punchIn, wash, desat, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  debris, damageNumber, calmMotion, calmFlash, lerp, animOf } from './bleachUltKit.js'
import { g5 } from './luffyUlt.js'

const SKIN = '#f3cfa6', SKIN_D = '#c98e62', OUT = '#2a1408'

export function drawLuffyUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.hitReal != null ? S.real - S.hitReal : -1
  const jit = (held || (k >= B.g5At && k < B.g5At + 10)) && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 16, y: (hash(S.real, 2) - 0.5) * 16 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = V.p(0, S.floor).y
  const chest = V.p(S.fx0, S.floor - 50)
  const gear = k >= B.g5At && k < B.calmAt + 20, gearA = k < B.calmAt ? 1 : clamp(1 - (k - B.calmAt) / 20, 0, 1)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the room dims for the drums; Gear 5 floods the world with warm sun-god light
  if (k < B.g5At) wash(ctx, W, H, '#000000', 0.45 * smooth(S.real / 14))
  if (gear) { wash(ctx, W, H, '#fff1d0', 0.35 * gearA, 'soft-light'); wash(ctx, W, H, '#ffffff', 0.12 * gearA, 'screen') }
  if (k >= B.inflateAt + 20 && k < B.hitAt) desat(ctx, W, H, 0.7 * smooth((k - B.inflateAt - 20) / 14))
  if (k >= B.inflateAt + 20 && k < B.hitAt + 30) wash(ctx, W, H, '#200008', 0.3 * clamp((k - B.inflateAt - 20) / 10, 0, 1) * (k > B.hitAt ? 1 - (k - B.hitAt) / 30 : 1), 'multiply')

  // 2) drum heartbeat rings from his chest
  for (const bk of B.beats) if (k >= bk && k < bk + 26) rings(ctx, chest.x, chest.y, (k - bk) / 26, 2, 300 * z, '#ffe9b0', 6 * z, 1)
  if (k >= B.beats[0] && k < B.g5At) glow(ctx, chest.x, chest.y, 50 * z * (1 + 0.3 * Math.max(0, 1 - ((k - B.beats[0]) % 12) / 6)), '255,230,170', 0.6)

  // 3) the Gear 5 burst: cloud ring + steam
  if (k >= B.g5At && k < B.g5At + 40) {
    const u = (k - B.g5At) / 40
    glow(ctx, chest.x, chest.y, (200 + 600 * outE(u)) * z, '255,250,235', (1 - u) * 0.95)
    rings(ctx, chest.x, floorY - 10 * z, u, 3, 700 * z, '#ffffff', 12 * z, 0.3)
  }
  if (gear && k < B.leapAt + 6) clouds(ctx, V.p(S.fx0, S.floor).x, floorY, z, S.real, clamp((k - B.g5At) / 16, 0, 1) * gearA * 0.55, 0.8)
  if (gear && !calmMotion()) steam(ctx, fp.x, fp.y, z, S.real, gearA)

  // 4) floor: the fist's shadow swelling, then the crater
  const F = fist(S, B, k)
  if (F && k < B.hitAt) {
    const sp = V.p(F.x, S.floor), a = clamp((k - B.inflateAt) / 30, 0, 1) * 0.55
    ctx.save(); ctx.globalAlpha = a + (k >= B.slamAt ? 0.3 * (k - B.slamAt) / (B.hitAt - B.slamAt) : 0); ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y, F.r * z * (1.1 + (k >= B.slamAt ? 0.4 * (k - B.slamAt) / 14 : 0)), F.r * z * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  const kp = k - B.hitAt
  if (kp >= 0) crater(ctx, V.p(S.tx0, S.floor).x, floorY, z, clamp(kp / 12, 0, 1), k >= B.outAt - 20 ? clamp((B.outAt - k) / 20, 0, 1) : 1)

  // 5) fighters
  drawFoe(ctx, S, V, k, tp, B)
  drawLuffy(ctx, S, V, k, fp, B, gearA)

  // 6) the rubber arm + the colossal fist
  if (F) drawFist(ctx, S, V, k, fp, F, B)
  if (k >= B.slamAt && k < B.hitAt && !calmMotion()) fallLines(ctx, W, H, V.p(F.x, 0).x, F.r * z, S.real)

  // 7) impact: dome shockwave, cloud-ring burst, debris
  if (kp >= 0 && kp < 64) {
    const u = kp / 64, cx = V.p(S.tx0, 0).x
    rings(ctx, cx, floorY - 6 * z, u, 4, W * 1.1, '#ffffff', 18 * z, 0.2)
    dome(ctx, cx, floorY, z, u, W)
    clouds(ctx, cx, floorY, z, S.real, (1 - u) * 0.6, 1 + outE(u) * 3.2)
    debris(ctx, cx, floorY, kp, 46, Math.max(1, z), 21, '#5a4632', 640, 30)
  }
  if (kp >= 0 && kp < 26) glow(ctx, V.p(S.tx0, 0).x, floorY - 40 * z, (260 + kp * 26) * z, '255,240,220', (1 - kp / 26))

  // 8) real close-ups (camera.js caps zoom ≈1.15)
  if (k < B.g5At) punchIn(ctx, canvas, W, H, chest.x, chest.y, 1.1 + 0.35 * smooth(k / 36) + (B.beats.some(b => k >= b && k < b + 4) ? 0.08 : 0))
  else if (k < B.g5At + 54) punchIn(ctx, canvas, W, H, chest.x, chest.y - 20 * z, 1.35 - 0.2 * smooth((k - B.g5At) / 54))
  else if (k >= B.toonAt && k < B.leapAt) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, floorY - 60 * z, 1.15)
  else if (kp >= 0 && kp < 10) punchIn(ctx, canvas, W, H, V.p(S.tx0, 0).x, floorY - 40 * z, 1.25 - kp * 0.02)

  // 9) titles, calligraphy, toon bubbles
  if (k >= B.g5At + 6 && k < B.toonAt - 2) title(ctx, W, H, 'GEAR 5', 'MONKEY D. LUFFY  ·  THE WARRIOR OF LIBERATION', (k - B.g5At - 6) / (B.toonAt - B.g5At - 8),
    { y: 0.24, fs: 0.16, band: 'rgba(255,252,240,0.92)', edge: '#ffb200', fill: '#ffffff', stroke: '#e0471b', subCol: '#3a1a00', kanji: '五', kanjiCol: '#ff9a00' })
  if (k >= B.g5At + 10 && k < B.leapAt) calligraphy(ctx, W, H, '太陽の神ニカ', (k - B.g5At - 10) / (B.leapAt - B.g5At - 10), { x: dir > 0 ? 0.88 : 0.12, y: 0.2, size: 0.09, col: '#ffffff', edge: '#e05a00', glow: 'rgba(255,200,80,0.9)' })
  if (k >= B.toonAt && k < B.leapAt + 4) toonBubbles(ctx, W, H, fp, z, k - B.toonAt, S.real)
  if (k >= B.toonAt + 8 && k < B.leapAt) popEyes(ctx, tp, z, k - B.toonAt - 8, dir)
  if (k >= B.inflateAt + 4 && k < B.slamAt) shout(ctx, W, H, 'GOMU GOMU NO…', clamp((k - B.inflateAt - 4) / 8, 0, 1) * clamp((B.slamAt - k) / 6, 0, 1), 0.11, '#ffffff', '#c41a10', 0.5, 0.8)
  if (k >= B.slamAt && k < B.hitAt + 24) title(ctx, W, H, 'BAJRANG GUN!!', 'GOMU GOMU NO  ·  ゴムゴムの猿神銃', (k - B.slamAt) / (B.hitAt + 24 - B.slamAt),
    { y: 0.2, fs: 0.13, band: 'rgba(10,0,0,0.9)', edge: '#ff2a1a', fill: '#ffffff', stroke: '#9a0000', kanji: '猿神銃', kanjiCol: '#ff3a24' })

  // 10) the impact: white frame → inverted Haki frame
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, F, '#ffffff', '#000000', pr, B)
  else if (pr >= 5 && pr < 11) silFrame(ctx, W, H, S, V, fp, tp, F, calmFlash() ? '#1a0004' : '#000000', '#ff2a1a', pr, B)
  ctx.restore()

  if (pr >= 11) damageNumber(ctx, W, H, S, V.p(S.tx0, 0).x, floorY - H * 0.12, pr - 11)
  if (k >= B.calmAt && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.calmAt) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    shout(ctx, W, H, 'SHISHISHI!', a, 0.075, '#ffe14d', '#c41a10', dir > 0 ? 0.78 : 0.22, 0.3)
  }

  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.g5At - 2, 'LUFFY', 'Hear that? …My heart’s pounding like a drum!', '#ffb200')
  sub(ctx, W, H, k, B.toonAt + 2, B.leapAt, 'LUFFY', 'Hahaha! This is the peak of my power!', '#ffb200')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'LUFFY', 'Shishishi! That was fun!', '#ffb200')
  return true
}

// ── the fist's world centre + radius over the script (null when not out) ──
function fist(S, B, k) {
  if (k < B.inflateAt || k >= B.calmAt - 10) return null
  const sky = S.floor - 300, hx = S.fx + S.dir * 30, hy = S.floor - (S.fy || 0) - 60
  if (k < B.slamAt) {
    const u = (k - B.inflateAt) / (B.slamAt - B.inflateAt)
    const r = 26 + 140 * outE(clamp(u * 1.3, 0, 1)) + Math.sin(k * 0.5) * 3
    return { x: lerp(hx, S.tx0, smooth(u * 1.4)), y: lerp(hy, sky, smooth(u * 1.4)), r, haki: smooth((u - 0.4) / 0.4) }
  }
  if (k < B.hitAt) { const u = (k - B.slamAt) / (B.hitAt - B.slamAt); return { x: S.tx0, y: lerp(sky, S.floor - 150, inE(u)), r: 166 + 10 * u, haki: 1, stretch: 1 + 0.25 * u } }
  // buried in the crater, then deflating back to his hand
  const u = clamp((k - B.hitAt - 6) / (B.calmAt - 10 - B.hitAt - 6), 0, 1)
  return { x: lerp(S.tx0, hx, smooth(u)), y: lerp(S.floor - 130, hy, smooth(u)), r: lerp(176, 10, outE(u)), haki: 1 - smooth(u * 2), squash: k < B.hitAt + 8 ? 1 - (k - B.hitAt) / 30 : 0.75 + 0.25 * smooth(u) }
}
function drawFist(ctx, S, V, k, fp, F, B) {
  const z = V.z, c = V.p(F.x, F.y), r = F.r * z, dir = S.dir
  const sh = V.p(S.fx + dir * 10, S.floor - (S.fy || 0) - 62)
  // the rubber arm: a ballooning tube from his shoulder to the wrist
  const wx = c.x - dir * r * 0.8, wy = c.y - r * 0.45
  const mx = (sh.x + wx) / 2, my = Math.min(sh.y, wy) - 60 * z
  const aw = Math.max(5 * z, r * 0.42)
  ctx.save(); ctx.lineCap = 'round'
  for (const [lw, col] of [[aw + 6 * z, OUT], [aw, SKIN], [aw * 0.35, 'rgba(255,255,255,0.35)']]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.quadraticCurveTo(mx, my, wx, wy); ctx.stroke()
  }
  ctx.restore()
  // haki lightning around the fist
  if (F.haki > 0.05 && !calmMotion()) lightning(ctx, c.x, c.y, r * 1.35, S.real, F.haki)
  if (F.haki > 0) glow(ctx, c.x, c.y, r * 1.9, '255,30,20', 0.35 * F.haki)
  // the fist itself (knuckles down — it falls on the foe)
  const sy = (F.stretch || 1) * (F.squash || 1), sx = 1 / Math.sqrt(sy)
  ctx.save(); ctx.translate(c.x, c.y); ctx.scale(sx * (dir < 0 ? -1 : 1), sy)
  const body = (fill, edge) => {
    ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(3, r * 0.06); ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.roundRect(-r * 0.9, -r * 0.95, r * 1.8, r * 1.2, r * 0.38); ctx.fill(); ctx.stroke()          // back of the hand
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(-r * 0.9 + i * r * 0.45, -r * 0.05, r * 0.45, r * 0.85, r * 0.2); ctx.fill(); ctx.stroke() }   // curled fingers
    ctx.beginPath(); ctx.roundRect(-r * 1.05, -r * 0.25, r * 1.05, r * 0.36, r * 0.18); ctx.fill(); ctx.stroke()        // thumb across
  }
  const h = clamp(F.haki, 0, 1)
  const fill = h > 0 ? `rgb(${Math.round(lerp(243, 24, h))},${Math.round(lerp(207, 14, h))},${Math.round(lerp(166, 18, h))})` : SKIN
  body(fill, h > 0.5 ? '#ff3a24' : OUT)
  // shading + glossy haki sheen
  ctx.globalAlpha = 0.35; ctx.fillStyle = h > 0.5 ? '#000' : SKIN_D; ctx.beginPath(); ctx.roundRect(-r * 0.95, r * 0.1, r * 1.9, r * 0.5, r * 0.2); ctx.fill()
  ctx.globalAlpha = 0.5 + 0.3 * h; ctx.fillStyle = h > 0.5 ? 'rgba(255,120,120,0.6)' : 'rgba(255,255,255,0.7)'
  ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.6, r * 0.45, r * 0.12, -0.2, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  void fp; void B; void k
}
function lightning(ctx, x, y, R, real, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'
  for (let i = 0; i < 7; i++) {
    const seed = (real >> 1) * 7 + i, a0 = hash(seed, 1) * Math.PI * 2
    let px = x + Math.cos(a0) * R * 0.6, py = y + Math.sin(a0) * R * 0.6
    ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 6; s++) { const an = a0 + (s + 1) * 0.35; const rr = R * (0.7 + hash(seed, s + 3) * 0.5); px = x + Math.cos(an) * rr; py = y + Math.sin(an) * rr; ctx.lineTo(px, py) }
    ctx.globalAlpha = a * (0.6 + 0.4 * hash(seed, 9))
    ctx.strokeStyle = i % 2 ? 'rgba(255,40,30,0.95)' : 'rgba(20,0,0,0.9)'; ctx.lineWidth = 6; ctx.stroke()
    ctx.strokeStyle = '#ffd0c8'; ctx.lineWidth = 1.5; ctx.stroke()
  }
  ctx.restore()
}
function fallLines(ctx, W, H, cx, rw, real) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 60; i++) {
    const x = cx + (hash(i, 3) - 0.5) * Math.max(rw * 3, W * 0.8), len = H * (0.15 + hash(i, 4) * 0.35), y = ((hash(i, 5) * H * 2 + real * 60) % (H * 1.4)) - H * 0.3
    ctx.globalAlpha = 0.25 + 0.5 * hash(i, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1 + hash(i, 7) * 3, len)
  }
  ctx.restore()
}
function dome(ctx, x, y, z, u, W) {
  const r = outE(u) * W * 0.75
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - u) * 0.6
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(255,240,210,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.restore(); void z
}
function crater(ctx, x, y, z, u, a) {
  if (u <= 0 || a <= 0) return
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(20,10,5,0.85)'; ctx.beginPath(); ctx.ellipse(x, y + 4 * z, 230 * z * outE(u), 30 * z * outE(u), 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#140804'; ctx.lineCap = 'round'
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1; let px = x + side * 200 * z * u, py = y; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 6 * u; s++) { px += side * (18 + hash(i, s) * 34) * z; py += (hash(i + 5, s) - 0.5) * 12 * z; ctx.lineTo(px, py) }
    ctx.stroke()
  }
  ctx.restore()
}
// puffy sun-god cloud ring around a point on the floor
function clouds(ctx, x, y, z, real, a, spread = 1) {
  if (a <= 0) return
  ctx.save()
  for (let i = 0; i < 22; i++) {
    const an = (i / 22) * Math.PI * 2 + (calmMotion() ? 0 : real * 0.01), rx = 170 * z * spread, ry = 34 * z * Math.min(spread, 1.6)
    const px = x + Math.cos(an) * rx, py = y - 10 * z + Math.sin(an) * ry, rr = (14 + hash(i, 4) * 14) * z * Math.min(1.6, spread)
    ctx.globalAlpha = a * (Math.sin(an) > 0 ? 0.95 : 0.7)
    ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(200,190,220,0.45)'; ctx.beginPath(); ctx.arc(px + rr * 0.2, py + rr * 0.3, rr * 0.7, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function steam(ctx, x, y, z, real, a) {
  ctx.save()
  for (let i = 0; i < 14; i++) {
    const ph = ((real * (0.6 + hash(i, 2) * 0.6) + hash(i, 3) * 60) % 60) / 60
    const px = x + (hash(i, 4) - 0.5) * 70 * z + Math.sin(real * 0.08 + i) * 10 * z, py = y - 70 * z - ph * 120 * z, rr = (6 + ph * 18) * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function toonBubbles(ctx, W, H, fp, z, kk, real) {
  const words = ['HA', 'HA', 'HA!']
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  words.forEach((w, i) => {
    const t0 = i * 9, u = clamp((kk - t0) / 10, 0, 1); if (u <= 0) return
    const fade = clamp((44 - kk) / 8, 0, 1), sc = 0.4 + 0.6 * outE(u) + Math.sin((kk - t0) * 0.5) * 0.05
    const x = fp.x + (i - 1) * 90 * Math.max(0.8, z), y = fp.y - (150 + i * 30) * Math.max(0.8, z) + (calmMotion() ? 0 : Math.sin(real * 0.3 + i) * 6)
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = fade; ctx.rotate((i - 1) * 0.15)
    const fs = Math.round(H * 0.07); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`
    ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.22; ctx.strokeStyle = '#3a1a00'; ctx.strokeText(w, 0, 0); ctx.fillStyle = '#ffffff'; ctx.fillText(w, 0, 0); ctx.restore()
  })
  ctx.restore(); void W
}
// the foe's eyes pop out cartoon-style (Gear 5's toon force)
function popEyes(ctx, tp, z, kk, dir) {
  const u = clamp(kk / 8, 0, 1), back = clamp((kk - 26) / 6, 0, 1), ext = outE(u) * (1 - back) * 40 * z
  if (ext <= 0.5) return
  const hx = tp.x + dir * -6 * z, hy = tp.y - 82 * z
  ctx.save()
  for (const s of [-1, 1]) {
    const ex = hx + s * 9 * z - dir * ext, ey = hy - ext * 0.2
    ctx.strokeStyle = '#c0302a'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(hx + s * 5 * z, hy); ctx.lineTo(ex, ey); ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, 11 * z, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex - dir * 3 * z, ey, 4.5 * z, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function shout(ctx, W, H, text, a, size, fill, stroke, xf = 0.5, yf = 0.26) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); const fs = Math.round(H * size)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.translate(W * xf, H * yf); ctx.transform(1, 0, -0.14, 1, 0, 0)
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.18; ctx.strokeStyle = stroke; ctx.strokeText(text, 0, 0); ctx.fillStyle = fill; ctx.fillText(text, 0, 0)
  ctx.restore()
}

// ── Luffy: normal → Gear 5 (the __gear5 recolour of each action) → normal ──
function lFrame(S, k, B) {
  if (k < B.g5At) return { key: 'idle', g: false, fr: (S.real >> 3) % 7 }
  if (k < B.g5At + 30) return { key: 'intro', g: true, fr: Math.min(3, 1 + ((k - B.g5At) >> 3)) }
  if (k < B.toonAt) return { key: 'intro', g: true, fr: 2 + ((k >> 3) & 1) }
  if (k < B.leapAt) return { key: 'win', g: true, fr: (k >> 2) % 7 }
  if (k < B.inflateAt) return { key: 'jump', g: true, fr: Math.min(3, (k - B.leapAt) >> 2) }
  if (k < B.slamAt) return { key: 'lfPiston', g: true, fr: 0 }
  if (k < B.hitAt + 16) return { key: 'lfPiston', g: true, fr: 1 }
  if (k < B.calmAt) return { key: 'fall', g: true, fr: (k >> 3) % 3 }
  return { key: 'win', g: k < B.calmAt + 20, fr: (k >> 3) % 7 }
}
function drawLuffy(ctx, S, V, k, fp, B, gearA) {
  const f = S.caster, z = V.z, dir = S.dir, L = lFrame(S, k, B)
  const n = animOf(f, L.key)?.frames || 1, fr = Math.min(L.fr, n - 1)
  let sx = 1, sy = 1
  if (k >= B.toonAt && k < B.leapAt) { const p = ((k - B.toonAt) % 14) / 14; const sq = p < 0.15 || p > 0.85 ? 1 : 0; sx = sq ? 1.25 : 0.85; sy = sq ? 0.78 : 1.2 }
  if (k >= B.leapAt && k < B.leapAt + 8) { sx = 0.75; sy = 1.35 }
  if (L.g) {
    glow(ctx, fp.x, fp.y - 50 * z, 90 * z, '255,245,210', 0.55 * gearA)
    const a = g5(f, L.key)
    if (k >= B.calmAt) sprite(ctx, f, [L.key], fr, fp.x, fp.y, z, dir, { sx, sy, alpha: 1 - gearA })
    sprite(ctx, f, a || [L.key], fr, fp.x, fp.y, z, dir, { sx, sy, alpha: k >= B.calmAt ? gearA : 1 })
  } else sprite(ctx, f, [L.key], fr, fp.x, fp.y, z, dir, { sx, sy })
  if (k >= B.g5At && k < B.g5At + 8 && !calmFlash()) sprite(ctx, f, g5(f, 'intro') || ['idle'], 1, fp.x, fp.y, z, dir, { tint: '#ffffff', tintA: 1 - (k - B.g5At) / 8 })
  if (k >= B.leapAt && k < B.inflateAt) for (let g = 1; g <= 3; g++) sprite(ctx, f, g5(f, 'jump') || ['jump'], 1, fp.x, fp.y + g * 30 * z, z, dir, { alpha: 0.2 * (4 - g), sx, sy })
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.hitAt
  if (kp < 0) {
    const scared = k >= B.toonAt
    sprite(ctx, t, scared ? (S.blocked ? ['guard', 'idle'] : ['hurt', 'idle']) : ['idle'], scared ? 0 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: kp < 20 ? 1.2 : 1, sy: kp < 20 ? 0.8 : 1 }); return }
  if (k < B.tick3 + 6) { sprite(ctx, t, ['hurt_heavy', 'hurt', 'idle'], 9, tp.x, tp.y + 8 * z, z, fdir, { sx: 1.3, sy: 0.6, tint: '#ffffff', tintA: kp < 3 ? 0.8 : 0 }); return }
  const landed = (S.ty || 0) <= 0 && k > B.tick3 + 20
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * ((k - B.tick3) * 0.2) })
}
function silFrame(ctx, W, H, S, V, fp, tp, F, bg, fg, pr, B) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 40 * z, 90, 70 + pr, fg, 0.95, false, pr)
  if (F) { const c = V.p(F.x, F.y), r = F.r * z; ctx.fillStyle = fg; ctx.beginPath(); ctx.roundRect(c.x - r, c.y - r, r * 2, r * 1.75, r * 0.4); ctx.fill() }
  sprite(ctx, S.target, ['hurt_heavy', 'hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1, sx: 1.3, sy: 0.6 })
  sprite(ctx, S.caster, g5(S.caster, 'lfPiston') || ['lfPiston'], 1, fp.x, fp.y, z, S.dir, { tint: fg, tintA: 1 })
  ctx.restore(); void B
}
