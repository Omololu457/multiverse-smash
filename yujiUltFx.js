// yujiUltFx.js — RENDER-ONLY half of Yuji's BLACK FLASH — KOKUSEN ×4 (yujiUlt.js). One screen pass (cineRegistry overlay,
// identity transform) owning the picture while the cinematic runs: world → screen from camera.js's live transform, both
// fighters drawn from their REAL sheets (ultimateAction = blue cursed-energy charge, yujiKoma1 = the red/black Koma rush,
// heavy = Divergent Fist, up = rising kick). Signature look: BLACK lightning with a crimson rim, and a black/red impact frame
// on every Kokusen. Pure functions of the scene's frames; noise = integer hash. Reduce Flashing → no white frames;
// Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, hLines, title, calligraphy, sub, letterbox, glow, rings,
  debris, damageNumber, calmMotion, calmFlash } from './bleachUltKit.js'

const CYAN = '90,200,255', RED = '255,30,40'

// jagged black lightning with a crimson glow, radiating from (x, y)
function blackLightning(ctx, x, y, R, n, seed, a, z) {
  if (a <= 0) return
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed) * Math.PI * 2, len = R * (0.45 + 0.55 * hash(i, seed + 1)), segs = 6 + (hash(i, seed + 2) * 4 | 0)
    const pts = [[x, y]]
    for (let s = 1; s <= segs; s++) {
      const u = s / segs, d = len * u, off = (hash(i * 31 + s, seed + 3) - 0.5) * R * 0.22 * (1 - u * 0.3)
      pts.push([x + Math.cos(ang) * d - Math.sin(ang) * off, y + Math.sin(ang) * d + Math.cos(ang) * off])
    }
    const path = () => { ctx.beginPath(); pts.forEach(([px, py], j) => j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)) }
    ctx.globalAlpha = a
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${RED},0.55)`; ctx.lineWidth = Math.max(5, 13 * z); path(); ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#050003'; ctx.lineWidth = Math.max(2.5, 6 * z * (1 - i / (n * 2))); path(); ctx.stroke()
    // a forked branch
    if (hash(i, seed + 9) < 0.6) {
      const j = 2 + (hash(i, seed + 10) * (segs - 3) | 0), [bx, by] = pts[j], ba = ang + (hash(i, seed + 11) - 0.5) * 1.6, bl = len * 0.35
      ctx.strokeStyle = '#050003'; ctx.lineWidth = Math.max(1.5, 3 * z)
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ba) * bl * 0.5 + (hash(i, 12) - 0.5) * 12 * z, by + Math.sin(ba) * bl * 0.5); ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl); ctx.stroke()
    }
  }
  ctx.restore()
}

// ── yuji frames ──
function yFrame(S, k, B) {
  const hr = S.real
  if (k < B.rushAt) return { keys: ['ultimateAction'], fr: Math.min(13, Math.floor(k / B.rushAt * 13.5)) }
  if (k < B.bf1At - 4) return { keys: ['yujiKoma1'], fr: 13 + Math.min(3, (k - B.rushAt) >> 2) }
  if (k < B.bf1At + 6) return { keys: ['heavy'], fr: 4 }
  if (k < B.zoneAt) return { keys: ['heavy'], fr: k < B.bf1At + 10 ? 5 : 6 }
  if (k < B.bf2At - 6) return { keys: ['yujiKoma1'], fr: 5 + ((hr >> 1) % 8) }
  if (k < B.bf2At) return { keys: ['yujiKoma1'], fr: 16 }
  if (k < B.bf2At + 10) return { keys: ['yujiKoma1'], fr: 17 }
  if (k < B.upAt) return { keys: ['heavy'], fr: 6 }
  if (k < B.bf3At + 8) return { keys: ['up'], fr: Math.min(4, Math.floor((k - B.upAt) / 3.4)) }
  if (k < B.slowAt) return { keys: ['up'], fr: Math.min(6, 4 + ((k - B.bf3At - 8) >> 3)) }
  if (k < B.bf4At - 3) return { keys: ['heavy'], fr: Math.min(3, Math.floor((k - B.slowAt) / 5)) }
  if (k < B.bf4At + 10) return { keys: ['heavy'], fr: 4 }
  if (k < B.bf4At + 24) return { keys: ['heavy'], fr: 5 }
  if (k < B.calmAt) return { keys: ['heavy'], fr: 6 }
  return { keys: ['idle'], fr: (hr >> 3) % 4 }
}

export function drawYujiUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const lastBf = S.bfReal.length ? S.bfReal[S.bfReal.length - 1] : -999, pr = S.real - lastBf, finPr = S.finReal != null ? S.real - S.finReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (S.bfN === 4 ? 22 : 10), y: (hash(S.real, 2) - 0.5) * (S.bfN === 4 ? 22 : 10) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y
  const fist = { x: fp.x + dir * 44 * z, y: fp.y - 70 * z }, hitP = { x: tp.x - dir * 14 * z, y: tp.y - 62 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the world dims around him while he focuses; the colour drains in the Divergent slow-mo
  if (k < B.rushAt + 4) wash(ctx, W, H, '#020814', 0.45 * smooth(S.real / 14) * (k > B.rushAt ? 1 - (k - B.rushAt) / 4 : 1))
  if (k >= B.zoneAt && k < B.calmAt) wash(ctx, W, H, '#1a0006', 0.25 * clamp((k - B.zoneAt) / 12, 0, 1) * (k > B.bf4At + 20 ? clamp(1 - (k - B.bf4At - 20) / 20, 0, 1) : 1), 'multiply')
  const slowA = k >= B.slowAt && k < B.bf4At ? smooth((k - B.slowAt) / 10) : 0
  desat(ctx, W, H, 0.85 * slowA)

  // 2) cursed energy: blue flames + rising motes while he focuses
  if (k < B.rushAt + 6) {
    const a = smooth(k / 18) * (k > B.rushAt ? 1 - (k - B.rushAt) / 6 : 1)
    glow(ctx, fp.x, fp.y - 60 * z, (130 + 30 * Math.sin(S.real * 0.5)) * z, CYAN, 0.5 * a)
    rings(ctx, fp.x, floorY, clamp(k / 30, 0, 1), 3, 300 * z, '#7fdcff', 6 * z, 0.25)
    if (!calmMotion()) motes(ctx, fp.x, floorY, z, S.real, a, '#9fe6ff')
  }
  // the floor cracks under the finisher
  if (k >= B.bf4At) floorCrack(ctx, tp.x - dir * 30 * z, floorY, z, clamp((k - B.bf4At) / 12, 0, 1), k > B.outAt - 24 ? clamp((B.outAt - k) / 24, 0, 1) : 1)

  // 3) the fighters
  if (k >= B.rushAt && k < B.bf1At) {   // the rush: after-images
    const { keys, fr } = yFrame(S, k, B)
    for (let g = 4; g >= 1; g--) sprite(ctx, f, keys, fr, fp.x - dir * g * 26 * z, fp.y, z, dir, { frame: true, alpha: 0.14 * (5 - g), tint: '#ff2030', tintA: 0.7 })
  }
  if (k >= B.zoneAt && k < B.bf2At && !calmMotion()) {   // the zone: flickering ghost fists
    for (let g = 0; g < 3; g++) sprite(ctx, f, ['yujiKoma1'], 5 + ((S.real + g * 3) % 8), fp.x + dir * (hash(S.real, g) - 0.3) * 20 * z, fp.y - (hash(S.real, g + 5) - 0.5) * 16 * z, z, dir, { frame: true, alpha: 0.22, tint: '#ff1830', tintA: 0.8 })
  }
  drawFoe(ctx, S, V, k, tp, B)
  { const { keys, fr } = yFrame(S, k, B); sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, { frame: true }) }

  // 4) Kokusen sparks: black lightning off every Black Flash (bigger each time), Koma sparks in the flurry
  if (lastBf > 0 && pr >= 0 && pr < 40) {
    const n = S.bfN || 1, sc = 0.7 + n * 0.3
    glow(ctx, hitP.x, hitP.y, (90 + pr * 6) * z * sc, RED, (1 - pr / 40) * 0.8)
    blackLightning(ctx, hitP.x, hitP.y, (110 + 40 * n) * z * (0.7 + 0.3 * outE(pr / 8)), 7 + n * 3, 40 + n * 7 + ((pr >> 2) & 3), clamp(1 - (pr - 14) / 26, 0, 1), z)
    rings(ctx, hitP.x, hitP.y, clamp(pr / 26, 0, 1), 3, 260 * z * sc, '#ff3a4a', 8 * z, 0.6)
  }
  B.komaHits.forEach((at, i) => { const kk = k - at; if (kk >= 0 && kk < 10) { glow(ctx, hitP.x, hitP.y + (i % 3 - 1) * 14 * z, 60 * z, i & 1 ? RED : CYAN, (1 - kk / 10) * 0.9); blackLightning(ctx, hitP.x, hitP.y, 60 * z, 4, 200 + i, (1 - kk / 10) * 0.8, z * 0.6) } })
  if (k >= B.zoneAt && k < B.bf2At) hLines(ctx, W, H * 0.25, H * 0.75, 26, 77, '#ff3048', 0.35, S.real, -dir)
  if (finPr >= 0 && finPr < 90) {   // the finisher: shock rings sweep the stage, debris
    const u = finPr / 90
    rings(ctx, hitP.x, floorY - 10 * z, u, 4, W * 0.9, '#ff2a3a', 16 * z, 0.25)
    debris(ctx, tp.x, floorY, finPr - 2, 36, Math.max(1, z), 19, '#3a2a26', 520, 24)
  }
  if (k >= B.bf4At + 24 && k < B.outAt) {   // residual black sparks crackling off his fist
    const a = clamp((B.outAt - k) / 30, 0, 1)
    if ((S.real >> 2) % 3 !== 0) blackLightning(ctx, fist.x, fist.y, 46 * z, 3, 300 + (S.real >> 2), a, z * 0.6)
    glow(ctx, fist.x, fist.y, 40 * z, RED, 0.5 * a)
  }

  // 5) real close-ups (camera.js caps zoom ≈1.15)
  if (k < B.rushAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 70 * z, 1 + 0.45 * smooth((k - 4) / 34))
  else if (k >= B.bf1At && k < B.bf1At + 14 && !held) punchIn(ctx, canvas, W, H, hitP.x, hitP.y, 1.25 - 0.25 * smooth((k - B.bf1At) / 14))
  else if (k >= B.slowAt && k < B.bf4At) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, fp.y - 70 * z, 1 + 0.35 * smooth((k - B.slowAt) / 18))
  if (k >= B.slowAt && k < B.bf4At) speedLines(ctx, W, H, hitP.x, hitP.y, 70, 33, '#000000', 0.45 * slowA, true, S.real)

  // 6) Kokusen impact frames: white → black/red (the 0.000001-second window)
  if (lastBf > 0 && pr >= 0) {
    const big = S.bfN === 4, wEnd = big ? 4 : 2, rEnd = big ? 14 : 7
    if (pr < wEnd && !calmFlash()) impact(ctx, W, H, S, V, fp, tp, k, B, '#ffffff', '#000000', '#000000', pr)
    else if (pr < rEnd) impact(ctx, W, H, S, V, fp, tp, k, B, calmFlash() ? '#160004' : '#000000', '#ff1a2e', '#ffffff', pr)
  }
  ctx.restore()

  // 7) titles + counters
  if (k >= B.bf1At + 2 && k < B.zoneAt + 18) title(ctx, W, H, 'BLACK FLASH', 'YUJI ITADORI  ·  KOKUSEN', (k - B.bf1At - 2) / (B.zoneAt + 16 - B.bf1At),
    { y: 0.24, fs: 0.14, band: 'rgba(6,0,2,0.92)', edge: '#ff2a3a', fill: '#ffffff', stroke: '#c0001a', kanji: '黒閃', kanjiCol: '#ff3040' })
  if (k >= B.bf1At + 4 && k < B.bf2At) calligraphy(ctx, W, H, '黒閃', (k - B.bf1At - 4) / (B.bf2At - B.bf1At - 4), { x: dir > 0 ? 0.86 : 0.14, y: 0.32, size: 0.15, col: '#0a0004', edge: '#ff2a3a', glow: 'rgba(255,0,30,0.9)' })
  for (const [at, n] of [[B.bf2At, 2], [B.bf3At, 3], [B.bf4At, 4]]) {
    const kk = k - at, life = n === 4 ? 70 : 26
    if (kk >= 0 && kk < life) counter(ctx, W, H, n, kk, life, dir)
  }
  if (k >= B.slowAt + 2 && k < B.bf4At) slowCaption(ctx, W, H, (k - B.slowAt - 2) / (B.bf4At - B.slowAt - 2))
  if (finPr >= 6) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.26, finPr - 6, '#ff2a3a')
  else if (lastBf > 0 && k < B.slowAt && pr >= 4) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.24, Math.min(pr - 4, 40), '#ff4a5a')

  // 8) letterbox + subtitles
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.rushAt, 'YUJI', 'With this one blow!', '#ff6a7a')
  sub(ctx, W, H, k, B.zoneAt, B.bf2At - 6, 'YUJI', "I'm going forward!", '#ff6a7a')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'YUJI', 'I want to be stronger!', '#ff6a7a')
  return true
}

function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k < B.bf1At) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  const kp = k - B.bf4At
  if (kp >= 0) {
    const landed = (S.ty || 0) <= 0 && kp > 24
    sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], landed ? 2 : 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * Math.min(1.2, kp * 0.06), tint: kp < 3 ? '#ffffff' : null, tintA: 0.8 })
    return
  }
  const air = (S.ty || 0) > 2
  const recentHit = B.komaHits.some(at => k - at >= 0 && k - at < 4) || [B.bf1At, B.bf2At, B.bf3At].some(at => k - at >= 0 && k - at < 4)
  sprite(ctx, t, ['hurt', 'idle'], 9, tp.x + (recentHit ? S.dir * 4 * z : 0), tp.y, z, fdir, { rot: air ? -S.dir * 0.5 : 0, sx: recentHit ? 0.9 : 1, sy: recentHit ? 1.05 : 1, tint: recentHit ? '#ff3040' : null, tintA: 0.45 })
}

// the impact frame: flat field, burst lines, both silhouettes, black lightning
function impact(ctx, W, H, S, V, fp, tp, k, B, bg, fg, sil, pr) {
  const z = V.z, hx = tp.x - S.dir * 14 * z, hy = tp.y - 62 * z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, hx, hy, 90, 60 + (S.bfN || 1) * 5 + pr, fg, 0.9, false, pr)
  const { keys, fr } = yFrame(S, k, B)
  sprite(ctx, S.caster, keys, fr, fp.x, fp.y, z, S.dir, { frame: true, tint: sil, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: sil, tintA: 1, sx: 0.85, sy: 1.06 })
  if (bg !== '#ffffff') blackLightning(ctx, hx, hy, (200 + 60 * (S.bfN || 1)) * z, 10 + (S.bfN || 1) * 3, 90 + pr, 1, z * 1.3)
  ctx.restore()
}
function counter(ctx, W, H, n, kk, life, dir) {
  const u = kk / life, pop = 1 + Math.max(0, 1 - kk / 5) * 0.8, a = Math.min(1, (1 - u) * 3)
  const fs = Math.round(H * (n === 4 ? 0.16 : 0.11) * pop), x = dir > 0 ? W * 0.8 : W * 0.2, y = H * (n === 4 ? 0.3 : 0.34)
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(-0.08 * dir); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#ff1a30'; ctx.strokeText(`×${n}`, 0, 0)
  ctx.lineWidth = fs * 0.08; ctx.strokeStyle = '#ffffff'; ctx.strokeText(`×${n}`, 0, 0)
  ctx.fillStyle = '#050003'; ctx.fillText(`×${n}`, 0, 0)
  ctx.font = `900 ${Math.round(fs * 0.3)}px Impact, "Arial Black", sans-serif`; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'
  const lab = n === 4 ? 'DIVERGENT BLACK FLASH' : 'BLACK FLASH'
  ctx.strokeText(lab, 0, fs * 0.62); ctx.fillText(lab, 0, fs * 0.62)
  ctx.restore()
}
function slowCaption(ctx, W, H, u) {
  const a = Math.min(clamp(u / 0.2, 0, 1), clamp((1 - u) / 0.15, 0, 1))
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const fs = Math.round(H * 0.034); ctx.font = `italic 700 ${fs}px Georgia, serif`; ctx.fillStyle = '#f2f2f2'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'
  const s = 'within 0.000001 seconds of the blow…'
  ctx.strokeText(s, W / 2, H * 0.19); ctx.fillText(s, W / 2, H * 0.19); ctx.restore()
}
function motes(ctx, x, y, z, real, a, col) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 30; i++) {
    const ph = ((real * (1 + hash(i, 2)) + hash(i, 3) * 50) % 50) / 50
    const px = x + (hash(i, 4) - 0.5) * 160 * z + Math.sin(real * 0.2 + i) * 6 * z, py = y - ph * 200 * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph); ctx.fillStyle = col
    const s = (2 + hash(i, 5) * 4) * z; ctx.fillRect(px, py, s, s * 2.2)
  }
  ctx.restore()
}
function floorCrack(ctx, x, y, z, u, a) {
  if (u <= 0 || a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'
  for (let i = 0; i < 12; i++) {
    let px = x, py = y; const side = i < 6 ? -1 : 1
    ctx.strokeStyle = '#0a0003'; ctx.lineWidth = Math.max(1.5, 5 * z * (1 - (i % 6) / 8)); ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 8 * u; s++) { px += side * (18 + hash(i, s) * 36) * z; py += (hash(i + 7, s * 5) - 0.5) * 10 * z; ctx.lineTo(px, py) }
    ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,30,50,0.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}
