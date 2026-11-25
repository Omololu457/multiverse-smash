// vilgaxUltFx.js — RENDER-ONLY half of Vilgax's CONQUEST OF EARTH (vilgaxUlt.js). One screen pass (cineRegistry overlay,
// identity transform) that owns the picture while the cinematic runs: world → screen from camera.js's live transform, both
// fighters from their REAL sheets (vilgax_ultaction / blastxcast / slash / win), the two REAL panels (vilgax_ult_panel_eye /
// _city) as cut-ins. Layers: blood-red sky → the Chimerian warship → trenches / crater → fighters → Koma eye-lasers / the
// sword cut / the orbital lance → explosions, smoke, embers → re-blit close-ups → titles → panels → impact frames → letterbox
// + subtitles. Pure functions of the scene's frames; noise = integer hash. Reduce Flashing → no white/inverted frames;
// Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, speedLines, title, sub, letterbox, star, glow, rings,
  debris, damageNumber, calmMotion, calmFlash, image, ready } from './bleachUltKit.js'

const RED = '255,40,24', GREEN = '90,255,90'

export function drawVilgaxUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.lanceReal != null ? S.real - S.lanceReal : -1
  const amp = pr >= 0 && pr < 30 ? 20 : held ? 9 : k < 40 ? 3 : 0
  const jit = amp && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * amp, y: (hash(S.real, 2) - 0.5) * amp } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y, tFloorY = V.p(0, S.tFloor).y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the sky bleeds red; the light goes as the ship covers the sun
  const redA = k < B.calmAt + 20 ? smooth(S.real / 24) : clamp(1 - (k - B.calmAt - 20) / 20, 0, 1)
  wash(ctx, W, H, '#3a0400', 0.55 * redA, 'multiply'); wash(ctx, W, H, '#ff3010', 0.14 * redA, 'soft-light')
  // 2) the warship
  const shipIn = outE(clamp((k - 6) / 44, 0, 1)), shipOut = k >= B.outAt - 24 ? smooth((k - B.outAt + 24) / 24) : 0
  if (shipIn > 0) warship(ctx, W, H, V, S, k, shipIn, shipOut, B)

  // 3) floor: trenches from the rakes, the crater
  B.rakeAt.forEach((at, i) => { if (k >= at - 4) trench(ctx, V, S, k - at + 4, i, tFloorY, k >= B.calmAt ? clamp(1 - (k - B.calmAt) / 30, 0, 1) : 1) })
  if (k >= B.lanceAt) crater(ctx, V.p(S.tx0 + dir * 30, 0).x, tFloorY, z, k - B.lanceAt, k >= B.calmAt ? clamp(1 - (k - B.calmAt) / 30, 0, 1) : 1)

  // 4) fighters
  drawFoe(ctx, S, V, k, tp, B)
  const head = drawVilgax(ctx, S, V, k, fp, B)

  // 5) Koma eye-lasers
  if (head && k >= B.komaAt && k < B.bladeAt) komaBeams(ctx, W, H, S, V, k, head, tp, tFloorY, B)
  // the sword cut
  if (k >= B.cutAt - 2 && k < B.cutAt + 16) swordCut(ctx, W, tp, z, dir, k - B.cutAt + 2)
  // the orbital lance
  if (k >= B.lanceAt - 20 && k < B.lanceAt + 28) lance(ctx, W, H, V, S, k, tp, tFloorY, B)
  if (k >= B.lanceAt) {
    const kp = k - B.lanceAt, cx = V.p(S.tx0 + dir * 30, 0).x
    if (kp < 50) { rings(ctx, cx, tFloorY, kp / 50, 4, W, '#8aff6a', 18 * z, 0.22); mushroom(ctx, cx, tFloorY, z, kp) }
    if (kp < 30) glow(ctx, cx, tFloorY - 60 * z, (220 + kp * 26) * z, GREEN, (1 - kp / 30) * 0.95)
    debris(ctx, cx, tFloorY, kp, 50, Math.max(1, z), 19, '#3a2a20', 620, 30)
    if (!calmMotion()) smoke(ctx, cx, tFloorY, z, kp, S.real, k >= B.calmAt ? clamp(1 - (k - B.calmAt) / 40, 0, 1) : 1)
  }

  // 6) real close-ups
  if (k >= B.bladeAt + 2 && k < B.orbitAt) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, tp.y - 50 * z, 1 + 0.3 * Math.sin(Math.PI * clamp((k - B.bladeAt - 2) / 28, 0, 1)))
  if (k >= B.orbitAt && k < B.lanceAt) { speedLines(ctx, W, H, tp.x, tFloorY - 40 * z, 60, 41, '#d6ffd0', 0.35 * smooth((k - B.orbitAt) / 10), true, S.real) }

  // 7) titles
  if (k >= 20 && k < B.eyeAt) title(ctx, W, H, 'CONQUEST OF EARTH', 'VILGAX  ·  WARLORD OF THE CHIMERA SUI GENERIS', (k - 20) / (B.eyeAt - 20),
    { y: 0.76, fs: 0.1, band: 'rgba(8,16,6,0.92)', edge: '#5aff5a', fill: '#e8ffe0', stroke: '#1d6b12' })
  if (k >= B.komaAt + 2 && k < B.komaAt + 30) title(ctx, W, H, 'KOMA ATAKES', null, (k - B.komaAt - 2) / 28, { y: 0.8, fs: 0.08, bh: 0.11, band: 'rgba(30,0,0,0.85)', edge: '#ff3a24', fill: '#fff0e8', stroke: '#a00a00', from: -1 })

  // 8) panels (the real sheet art) — eye-blaze, then the city in flames before the lance
  if (k >= B.eyeAt && k < B.komaAt) panel(ctx, W, H, './vilgax_ult_panel_eye.png', (k - B.eyeAt) / (B.komaAt - B.eyeAt), 1.0 + 0.12 * ((k - B.eyeAt) / 22))
  if (k >= B.orbitAt && k < B.lanceAt - 6) panel(ctx, W, H, './vilgax_ult_panel_city.png', (k - B.orbitAt) / (B.lanceAt - 6 - B.orbitAt), 1.04 - 0.04 * ((k - B.orbitAt) / 14))

  // 9) the lance hits: white → inverted
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, '#ffffff', '#0a1a06', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, fp, tp, calmFlash() ? '#061006' : '#000000', '#7dff5a', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.24, pr - 10, '#ff3b2f')
  if (k >= B.calmAt + 6 && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.calmAt - 6) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(H * 0.055)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'
    ctx.lineWidth = 7; ctx.strokeStyle = '#000'; const x = dir > 0 ? W * 0.06 : W * 0.94
    ctx.strokeText('EARTH IS MINE.', x, H * 0.2); ctx.fillStyle = '#7dff5a'; ctx.fillText('EARTH IS MINE.', x, H * 0.2); ctx.restore()
  }
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 4, B.eyeAt - 2, 'VILGAX', 'Kneel before Vilgax, conqueror of ten worlds.', '#7dff5a')
  sub(ctx, W, H, k, B.cutAt - 2, B.orbitAt - 2, 'VILGAX', 'DIE!', '#7dff5a')
  sub(ctx, W, H, k, B.calmAt + 6, B.outAt + 4, 'VILGAX', 'Your world is the eleventh.', '#7dff5a')
  return true
}

// ── Vilgax ──
function vPose(k, B) {
  if (k < 8) return { keys: ['idle'], fr: 0 }
  if (k < B.komaAt) return { keys: ['vilgaxUltAction'], fr: k < 16 ? 0 : k < 26 ? 1 : 2 }
  if (k < B.bladeAt) return { keys: ['vilgaxBlastXCast'], fr: k < B.komaAt + 8 ? 0 : 1 }
  if (k < B.cutAt) return { keys: ['vilgaxSlash'], fr: k < B.bladeAt + 6 ? 0 : k < B.cutAt - 4 ? 1 : 2 }
  if (k < B.orbitAt + 6) return { keys: ['vilgaxSlash'], fr: 3 }
  if (k < B.calmAt) return { keys: ['vilgaxUltAction'], fr: 2 }
  return { keys: ['win', 'idle'], fr: Math.min(2, (k - B.calmAt) >> 3) }
}
function drawVilgax(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, dir = S.dir, { keys, fr } = vPose(k, B)
  glow(ctx, fp.x, fp.y - 70 * z, 130 * z, k < B.komaAt || k >= B.orbitAt ? GREEN : RED, 0.35)
  if (k >= B.bladeAt && k < B.bladeAt + 6) {   // the blink: a green silhouette streak from where he stood
    const back = (S.fx1 - S.fx0) * z
    for (let g = 1; g <= 4; g++) sprite(ctx, f, ['vilgaxVanish', 'idle'], 1, fp.x - back * g / 5, fp.y, z, dir, { alpha: 0.18 * (5 - g), tint: '#5aff5a', tintA: 0.9 })
  }
  const r = sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, { frame: true })
  if (!r) return null
  const head = { x: fp.x + dir * 6 * r.s, y: r.top + 10 * r.s }
  if (k >= B.eyeAt - 6 && k < B.bladeAt) { star(ctx, head.x, head.y, (16 + 8 * Math.sin(S.real * 0.7)) * z, 1, S.real * 0.1, '#ffb0a0'); glow(ctx, head.x, head.y, 60 * z, RED, 0.8) }
  return head
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k < B.rakeAt[0]) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  const kp = k - B.lanceAt
  if (kp < 0) { sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: k >= B.cutAt ? -S.dir * (k - B.cutAt) * 0.04 : 0 }); return }
  const landed = kp > 14
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { tint: kp < 4 ? '#d0ffc0' : null, tintA: 0.8, sx: kp < 6 ? 1.15 : 1, sy: kp < 6 ? 0.82 : 1 })
}

// ── pieces ──
function warship(ctx, W, H, V, S, k, u, out, B) {
  const cx = W * 0.5 + (1 - u) * W * 0.9 * -S.dir, cy = -H * 0.1 + u * H * 0.3 - out * H * 0.45, s = W / 1280 * 1.05
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s)
  // shadow cast on the world
  ctx.save(); ctx.globalAlpha = 0.25 * u * (1 - out); ctx.fillStyle = '#000'; ctx.fillRect(-W, -40, W * 2 / s, H / s); ctx.restore()
  const hull = '#1c2618', rim = '#6f9a52'
  ctx.fillStyle = hull; ctx.strokeStyle = rim; ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-560, -20); ctx.lineTo(-380, -70); ctx.lineTo(-120, -90); ctx.lineTo(120, -90); ctx.lineTo(380, -70); ctx.lineTo(560, -20)
  ctx.lineTo(430, 30); ctx.lineTo(220, 48); ctx.lineTo(90, 96); ctx.lineTo(-90, 96); ctx.lineTo(-220, 48); ctx.lineTo(-430, 30); ctx.closePath()
  ctx.fill(); ctx.stroke()
  // armour plates + spines
  ctx.strokeStyle = '#34452a'; ctx.lineWidth = 2
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 80, -80 + Math.abs(i) * 6); ctx.lineTo(i * 60, 40); ctx.stroke() }
  ctx.fillStyle = hull
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 300, -60); ctx.lineTo(sx * 420, -150); ctx.lineTo(sx * 380, -60); ctx.closePath(); ctx.fill(); ctx.stroke() }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,255,90,0.35)'; ctx.fillRect(-430, 26, 860, 6); ctx.restore()
  // running lights + the green core (charges for the lance)
  const charge = k >= B.orbitAt ? clamp((k - B.orbitAt) / 20, 0, 1) : 0
  for (let i = 0; i < 18; i++) { const lx = -500 + i * 59, ly = -10 + Math.abs(lx) * -0.06 + 28; ctx.fillStyle = (i + (S.real >> 3)) % 4 ? '#3f8a2a' : '#9dff6a'; ctx.fillRect(lx, ly, 8, 4) }
  ctx.restore()
  glow(ctx, cx, cy + 90 * s, (60 + 160 * charge) * s, GREEN, 0.5 + 0.5 * charge)
  if (charge > 0) star(ctx, cx, cy + 92 * s, (30 + 90 * charge) * s, charge, S.real * 0.08, '#e6ffd8')
  S._ship = { x: cx, y: cy + 92 * s }
}
function komaBeams(ctx, W, H, S, V, k, head, tp, floorY, B) {
  const z = V.z, dir = S.dir
  // three rakes: each beam's end sweeps along the floor across the foe, then fades
  B.rakeAt.forEach((at, i) => {
    const u = (k - (at - 10)) / 20; if (u <= 0 || u >= 1.2) return
    const a = u < 1 ? 1 : 1 - (u - 1) / 0.2
    const ex = tp.x + dir * (-160 + 320 * clamp(u, 0, 1)) * z * (i === 1 ? -1 : 1), ey = floorY - (i === 2 ? 50 * z : 6 * z)
    for (const [lw, col, al] of [[34 * z, 'rgba(255,30,10,0.35)', 1], [16 * z, 'rgba(255,80,50,0.85)', 1], [5 * z, '#ffe8e0', 1]]) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore()
    }
    glow(ctx, ex, ey, 70 * z, RED, a); star(ctx, ex, ey, 34 * z, a, S.real * 0.3 + i, '#fff0e0')
  })
  glow(ctx, head.x, head.y, 90 * z, RED, 0.9)
}
function trench(ctx, V, S, kp, i, floorY, a) {
  if (kp < 0 || a <= 0) return
  const z = V.z, dir = S.dir, tx = V.p(S.tx0, 0).x, flip = i === 1 ? -1 : 1
  const x0 = tx + dir * -160 * z * flip, len = 320 * z * clamp(kp / 20, 0, 1)
  ctx.save(); ctx.globalAlpha = a
  ctx.strokeStyle = '#1a0603'; ctx.lineWidth = 6 * z; ctx.beginPath(); ctx.moveTo(x0, floorY + 2 * z + i * 3 * z); ctx.lineTo(x0 + dir * flip * len, floorY + 2 * z + i * 3 * z); ctx.stroke()
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,90,40,0.8)'; ctx.lineWidth = 2 * z; ctx.stroke()
  // explosions popping along the trench
  for (let j = 0; j < 6; j++) {
    const ej = kp - j * 3; if (ej < 0 || ej > 18) continue
    const ex = x0 + dir * flip * (j + 0.5) * 320 * z / 6, r = (20 + 40 * outE(ej / 18)) * z
    glow(ctx, ex, floorY - r * 0.5, r * 1.4, '255,120,40', (1 - ej / 18) * 0.9)
    ctx.globalAlpha = a * (1 - ej / 18); ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(ex, floorY - r * 0.5, r * 0.45, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function swordCut(ctx, W, tp, z, dir, kp) {
  const u = clamp(kp / 6, 0, 1), a = kp < 6 ? 1 : clamp(1 - (kp - 6) / 10, 0, 1), y = tp.y - 50 * z
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a
  const x0 = tp.x - dir * W * 0.4, x1 = tp.x - dir * W * 0.4 + dir * W * 0.9 * outE(u)
  for (const [lw, col] of [[22 * z, 'rgba(120,255,120,0.4)'], [8 * z, 'rgba(200,255,200,0.9)'], [2.5 * z, '#ffffff']]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y + 14 * z); ctx.lineTo(x1, y - 14 * z); ctx.stroke()
  }
  ctx.restore()
  if (kp < 10) star(ctx, tp.x, y, 70 * z * (1 - kp / 10), 1 - kp / 10, 0.4, '#e6ffe0')
}
function lance(ctx, W, H, V, S, k, tp, floorY, B) {
  const z = V.z, ship = S._ship || { x: tp.x, y: 0 }, cx = V.p(S.tx0 + S.dir * 30, 0).x
  const pre = k < B.lanceAt, a = pre ? 0.5 * smooth((k - B.lanceAt + 20) / 20) : clamp(1 - (k - B.lanceAt) / 28, 0, 1)
  const wv = pre ? 4 * z : (60 + 30 * Math.sin(S.real * 0.9)) * z * (1 - 0.6 * clamp((k - B.lanceAt) / 28, 0, 1))
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  // the targeting line (pre) / the lance itself
  for (const [m, col, al] of [[2.2, '90,255,90', 0.35], [1.2, '160,255,140', 0.8], [0.45, '245,255,240', 1]]) {
    ctx.globalAlpha = a * al; ctx.fillStyle = `rgb(${col})`
    ctx.beginPath(); ctx.moveTo(ship.x - wv * m * 0.4, ship.y); ctx.lineTo(ship.x + wv * m * 0.4, ship.y); ctx.lineTo(cx + wv * m, floorY); ctx.lineTo(cx - wv * m, floorY); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  if (pre) { ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#ff3a24'; ctx.lineWidth = 2; const r = (40 + 30 * (1 - smooth((k - B.lanceAt + 20) / 20))) * z
    ctx.beginPath(); ctx.ellipse(cx, floorY, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
}
function crater(ctx, x, y, z, kp, a) {
  const r = (130 * outE(clamp(kp / 10, 0, 1))) * z
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#120a06'; ctx.beginPath(); ctx.ellipse(x, y + 4 * z, r, r * 0.22, 0, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(140,255,90,0.6)'; ctx.lineWidth = 3 * z; ctx.stroke()
  ctx.restore()
}
function mushroom(ctx, x, y, z, kp) {
  const u = outE(kp / 50), a = clamp(1 - kp / 50, 0, 1)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const h = 320 * u * z, r = (60 + 120 * u) * z
  const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, `rgba(200,255,170,${(0.7 * a).toFixed(3)})`); g.addColorStop(1, `rgba(60,200,40,${(0.5 * a).toFixed(3)})`)
  ctx.fillStyle = g; ctx.fillRect(x - r * 0.25, y - h, r * 0.5, h)
  ctx.beginPath(); ctx.ellipse(x, y - h, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
function smoke(ctx, x, y, z, kp, real, a) {
  ctx.save()
  for (let i = 0; i < 16; i++) {
    const ph = clamp((kp - i * 2) / 70, 0, 1); if (ph <= 0) continue
    const px = x + (hash(i, 51) - 0.5) * 380 * z * ph, py = y - (30 + 140 * hash(i, 52)) * z * ph, r = (30 + 50 * ph) * z
    ctx.globalAlpha = a * 0.5 * (1 - ph * 0.6); ctx.fillStyle = i % 2 ? '#2a2420' : '#3c332c'
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore(); void real
}
function panel(ctx, W, H, src, u, zoom) {
  const im = image(src); if (!ready(im)) return
  const a = Math.min(clamp(u / 0.2, 0, 1), clamp((1 - u) / 0.2, 0, 1)), slide = (1 - outE(clamp(u / 0.25, 0, 1))) * W * 0.3
  const bandH = H * 0.56, bandY = (H - bandH) / 2
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, bandY - 8); ctx.lineTo(W, bandY - 22); ctx.lineTo(W, bandY + bandH + 8); ctx.lineTo(0, bandY + bandH + 22); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(0, bandY); ctx.lineTo(W, bandY - 14); ctx.lineTo(W, bandY + bandH); ctx.lineTo(0, bandY + bandH + 14); ctx.closePath(); ctx.clip()
  const sc = Math.max(W / im.naturalWidth, bandH / im.naturalHeight) * zoom, dw = im.naturalWidth * sc, dh = im.naturalHeight * sc
  ctx.drawImage(im, (W - dw) / 2 + slide, bandY + (bandH - dh) / 2, dw, dh)
  ctx.restore()
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#5aff5a'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, bandY); ctx.lineTo(W, bandY - 14); ctx.moveTo(0, bandY + bandH + 14); ctx.lineTo(W, bandY + bandH); ctx.stroke(); ctx.restore()
}
function silFrame(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 70 + pr, fg, 0.95, false, pr)
  ctx.globalAlpha = 1; ctx.fillStyle = fg; ctx.fillRect(tp.x - 30 * z, 0, 60 * z, tp.y)   // the lance as a hard silhouette
  sprite(ctx, S.caster, ['vilgaxUltAction', 'idle'], 2, fp.x, fp.y, z, S.dir, { frame: true, tint: fg, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
