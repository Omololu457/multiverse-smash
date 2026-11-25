// inosukeUltFx.js — RENDER-ONLY half of Inosuke's BEAST BREATHING · EIGHTH FORM — EXPLOSIVE RUSH (inosukeUlt.js). One screen pass
// (cineRegistry overlay, identity transform) owns the picture while the cinematic runs: world → screen from camera.js's live
// transform, both fighters drawn here from their REAL sheets (taunt / cine1 spin / B3-B5 fangs / cine2 dust-dash / heavy).
// Layers: night-blue Spatial Awareness wash + sonar ripples → floor cracks → fighters (+ the foe's red heat silhouette) →
// serrated twin-blade slash marks / dust explosion / boar-spirit charge → re-blit close-ups → titles / fang stamps →
// impact frames + the screen-wide serrated X → letterbox + subtitles. Pure functions of the scene frames; noise = integer
// hash. Reduce Flashing → no white/inverted frames; Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, hLines, title, calligraphy, sub, letterbox, glow, rings,
  debris, damageNumber, calmMotion, calmFlash, animOf } from './bleachUltKit.js'

const BLUE = '120,200,255'
const FANGS = [
  { k: '壱ノ牙', en: 'FIRST FANG · PIERCE', pose: 'inosukeCine1', f0: 2 },
  { k: '弐ノ牙', en: 'SECOND FANG · SLICE', pose: 'inosukeB3', f0: 0 },
  { k: '参ノ牙', en: 'THIRD FANG · DEVOUR', pose: 'inosukeB5', f0: 0 },
  { k: '伍ノ牙', en: 'FIFTH FANG · CRAZY CUTTING', pose: 'inosukeB4', f0: 1 },
  { k: '陸ノ牙', en: 'SIXTH FANG · PALISADE BITE', pose: 'heavy', f0: 0 },
]

export function drawInosukeUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.hitReal != null ? S.real - S.hitReal : -1
  const fpr = S.lastFang ? S.real - S.lastFang.real : 99
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 18 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 18 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y, t0 = V.p(S.tx0, S.tFloor)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grade: the room dims; SPATIAL AWARENESS drains it to night blue; the wind-up drains the colour
  if (k < B.spatialAt) wash(ctx, W, H, '#000000', 0.35 * smooth(S.real / 14))
  const spA = k >= B.spatialAt && k < B.stanceAt + 10 ? Math.min(clamp((k - B.spatialAt) / 10, 0, 1), clamp((B.stanceAt + 10 - k) / 12, 0, 1)) : 0
  if (spA > 0) { desat(ctx, W, H, 0.85 * spA); wash(ctx, W, H, '#0a1a3a', 0.6 * spA, 'multiply'); wash(ctx, W, H, '#000814', 0.35 * spA) }
  const slow = k >= B.windAt && k < B.rushAt ? smooth((k - B.windAt) / 12) : 0
  if (slow > 0) { desat(ctx, W, H, 0.75 * slow); wash(ctx, W, H, '#10060a', 0.25 * slow) }
  if (k >= B.fangAt && k < B.windAt) wash(ctx, W, H, '#040812', 0.3)

  // 2) sonar ripples rolling along the ground from him; the lock-on
  if (spA > 0) {
    for (let j = 0; j < 4; j++) {
      const u = ((k - B.spatialAt) - j * 9) / 34; if (u <= 0 || u >= 1) continue
      ctx.save(); ctx.globalAlpha = spA * (1 - u) * 0.9; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.ellipse(fp.x, floorY - 4 * z, u * W * 0.9, u * W * 0.9 * 0.12, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.ellipse(fp.x, floorY - 60 * z, u * W * 0.7, u * W * 0.7 * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    }
    if (!calmMotion()) for (let i = 0; i < 40; i++) {    // floating dust read by his skin
      const px = (hash(i, 3) * W + S.real * (0.3 + hash(i, 4))) % W, py = H * 0.2 + hash(i, 5) * H * 0.6
      ctx.save(); ctx.globalAlpha = spA * 0.6 * hash(i, 6); ctx.fillStyle = '#cfe9ff'; ctx.fillRect(px, py, 2, 2); ctx.restore()
    }
  }

  // 3) floor cracks under the stance; dust explosion behind the rush
  if (k >= B.stanceAt && k < B.fangAt + 20) cracks(ctx, V.p(S.stance, S.floor).x, floorY, z, clamp((k - B.stanceAt) / 10, 0, 1), clamp((B.fangAt + 20 - k) / 14, 0, 1))
  if (k >= B.rushAt - 2 && k < B.hitAt + 30) dust(ctx, V.p(S.back, S.floor).x, floorY, z, k - B.rushAt + 2, dir)

  // 4) fighters
  drawFoe(ctx, S, V, k, tp, B, spA)
  if (k >= B.rushAt && k < B.hitAt + 4) spirit(ctx, S, fp, z, k, B)
  drawInosuke(ctx, S, V, k, fp, B)

  // 5) slash marks: each fang leaves serrated twin cuts over the foe; the rush leaves the screen-wide X
  if (S.lastFang && k < B.windAt + 4 && fpr < 18) {
    const i = S.lastFang.i, a = 1 - fpr / 18, ang = [-0.5, 0.45, 0.05, -0.9, 0.8][i]
    serrated(ctx, t0.x, t0.y - 50 * z, ang, 170 * z * (0.6 + 0.4 * outE(fpr / 4)), a, 13 + i * 7, z)
    glow(ctx, t0.x, t0.y - 50 * z, 110 * z, BLUE, a * 0.6)
  }
  if (k >= B.fangAt && k < B.windAt && !calmMotion()) speedLines(ctx, W, H, t0.x, t0.y - 50 * z, 40, 5 + (S.lastFang?.i | 0), '#bfe4ff', 0.25, true, S.real)
  if (k >= B.rushAt && k < B.hitAt) hLines(ctx, W, H * 0.25, H * 0.8, 50, 33, '#d8f0ff', 0.6, S.real * 3, dir)

  // 6) impact: the dome of the hit, the screen-wide serrated X, debris
  const kp = k - B.hitAt
  if (kp >= 0 && kp < 60) {
    const u = kp / 60
    rings(ctx, t0.x, floorY - 30 * z, u, 3, W * 0.8, '#bfe4ff', 14 * z, 0.35)
    debris(ctx, t0.x, floorY, kp, 30, Math.max(1, z), 41, '#6b5a48', 520, 24)
  }
  if (pr >= 10 && kp < 34) {
    const a = clamp(1 - kp / 34, 0, 1), L = Math.hypot(W, H) * 0.6
    serrated(ctx, t0.x, t0.y - 50 * z, 0.62, L, a, 91, 1.6)
    serrated(ctx, t0.x, t0.y - 50 * z, -0.62, L, a, 97, 1.6)
  }
  if (kp >= 0 && kp < 24) glow(ctx, t0.x, t0.y - 60 * z, (220 + kp * 22) * z, '220,240,255', 1 - kp / 24)

  // 7) close-ups (camera.js caps zoom ≈1.15)
  if (k < B.spatialAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 70 * z, 1.15 + 0.35 * smooth(k / 30))
  else if (k >= 64 && k < B.stanceAt) punchIn(ctx, canvas, W, H, tp.x, tp.y - 50 * z, 1 + 0.35 * smooth((k - 64) / 10))
  else if (k >= B.fangAt && k < B.windAt) punchIn(ctx, canvas, W, H, t0.x, t0.y - 50 * z, 1.45 + (fpr < 4 ? 0.15 * (1 - fpr / 4) : 0))
  else if (k >= B.windAt + 6 && k < B.rushAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 40 * z, 1 + 0.4 * smooth((k - B.windAt - 6) / 12))

  // 8) titles, calligraphy, the fang stamps, the lock-on
  if (k >= 6 && k < B.spatialAt) calligraphy(ctx, W, H, '猪突猛進', (k - 6) / (B.spatialAt - 6), { x: dir > 0 ? 0.86 : 0.14, y: 0.2, size: 0.11, col: '#ffffff', edge: '#1a2a4a', glow: 'rgba(120,200,255,0.8)' })
  if (k >= B.spatialAt + 4 && k < B.stanceAt) title(ctx, W, H, 'SPATIAL AWARENESS', 'BEAST BREATHING · SEVENTH FORM  ·  漆ノ型 空間識覚', (k - B.spatialAt - 4) / (B.stanceAt - B.spatialAt - 4),
    { y: 0.22, fs: 0.085, band: 'rgba(6,14,32,0.9)', edge: '#7fc8ff', fill: '#eaf6ff', stroke: '#1a3a6a', kanji: '空間識覚', kanjiCol: '#7fc8ff' })
  if (k >= 66 && k < B.stanceAt + 4) lockOn(ctx, tp, z, k - 66)
  if (k >= B.stanceAt && k < B.fangAt + 8) title(ctx, W, H, 'BEAST BREATHING', 'INOSUKE HASHIBIRA  ·  獣の呼吸', (k - B.stanceAt) / (B.fangAt + 8 - B.stanceAt),
    { y: 0.76, fs: 0.1, band: 'rgba(10,10,14,0.9)', edge: '#9fd8ff', fill: '#ffffff', stroke: '#2a4a7a', from: -1, kanji: '獣', kanjiCol: '#9fd8ff' })
  if (S.lastFang && k < B.windAt && fpr < 16) stamp(ctx, W, H, FANGS[S.lastFang.i], fpr, dir, S.lastFang.i)
  if (k >= B.windAt + 6 && k < B.hitAt + 16) title(ctx, W, H, 'EXPLOSIVE RUSH!!', 'BEAST BREATHING · EIGHTH FORM  ·  捌ノ型 爆裂猛進', (k - B.windAt - 6) / (B.hitAt + 16 - B.windAt - 6),
    { y: 0.2, fs: 0.12, band: 'rgba(8,8,12,0.92)', edge: '#9fd8ff', fill: '#ffffff', stroke: '#1d3f78', kanji: '爆裂猛進', kanjiCol: '#7fc8ff' })

  // 9) the rush impact: white frame → inverted frame
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, '#ffffff', '#000000', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, fp, tp, calmFlash() ? '#060c18' : '#000000', '#9fd8ff', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.2, pr - 10, '#7fd0ff')
  else if (S.lastFang && fpr < 40 && k < B.windAt) damageNumber(ctx, W, H, S, t0.x + dir * 90 * z, t0.y - H * 0.22, fpr + 20, '#ffffff')
  if (k >= B.calmAt && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.calmAt) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(H * 0.05)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = dir > 0 ? 'right' : 'left'; ctx.textBaseline = 'middle'
    const x = dir > 0 ? W * 0.94 : W * 0.06; ctx.lineWidth = 6; ctx.strokeStyle = '#0a1a3a'; ctx.strokeText('KING OF THE MOUNTAIN!', x, H * 0.2); ctx.fillStyle = '#ffffff'; ctx.fillText('KING OF THE MOUNTAIN!', x, H * 0.2); ctx.restore()
  }

  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.spatialAt - 2, 'INOSUKE', 'PIG ASSAULT! Here I come!', '#7fc8ff')
  sub(ctx, W, H, k, 74, B.stanceAt + 6, 'INOSUKE', 'Found you! …THERE!', '#7fc8ff')
  sub(ctx, W, H, k, B.windAt + 8, B.rushAt + 8, 'INOSUKE', 'Beast Breathing, Eighth Form —', '#7fc8ff')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'INOSUKE', 'Hahahaha! I’m the King of the Mountain!', '#7fc8ff')
  return true
}

// ── Inosuke's pose over the script ──
function iFrame(S, k, B) {
  if (k < B.spatialAt) return { keys: ['taunt'], fr: k < 10 ? 0 : 1 }
  if (k < B.stanceAt) return { keys: ['inosukeCine1'], fr: 1 }
  if (k < B.fangAt) return { keys: ['dash'], fr: 0 }
  if (k < B.windAt) {
    let i = 0; for (let j = 0; j < B.fangs.length; j++) if (k >= B.fangs[j] - 6) i = j
    const F = FANGS[i], n = Math.max(1, animOf(S.caster, F.pose)?.frames || 1), into = k - (B.fangs[i] - 6)
    return { keys: [F.pose, 'heavy'], fr: Math.min(n - 1, F.f0 + Math.floor(into / 3)), fang: i, blink: into < 2 }
  }
  if (k < B.rushAt) return { keys: ['dash'], fr: k < B.windAt + 12 ? 1 : 0 }
  if (k < B.hitAt + 6) return { keys: ['inosukeCine2'], fr: 1 + ((k - B.rushAt) >> 2) % 3 }
  if (k < B.calmAt) return { keys: ['inosukeCine2'], fr: 4 }
  return { keys: ['taunt'], fr: k < B.calmAt + 12 ? 1 : 2 }
}
function drawInosuke(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, P = iFrame(S, k, B), face = S.fFace || S.dir
  if (k >= B.spatialAt && k < B.stanceAt) glow(ctx, fp.x, fp.y - 50 * z, 120 * z, '150,210,255', 0.45)
  if (P.fang != null && P.blink) {   // the blink: a blue streak from the side he left
    const from = fp.x + face * 120 * z
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.fillStyle = '#9fd8ff'; ctx.fillRect(Math.min(from, fp.x), fp.y - 50 * z, Math.abs(from - fp.x), 4 * z); ctx.restore()
  }
  if (k >= B.rushAt && k < B.hitAt + 4) for (let g = 4; g >= 1; g--) sprite(ctx, f, P.keys, P.fr, fp.x - S.dir * g * 34 * z, fp.y, z, face, { alpha: 0.12 * (5 - g), tint: '#7fc8ff', tintA: 0.7 })
  sprite(ctx, f, P.keys, P.fr, fp.x, fp.y, z, face, { tint: k >= B.windAt + 8 && k < B.rushAt ? '#ffffff' : null, tintA: 0.25 + 0.2 * Math.sin(S.real * 0.6) })
}
function drawFoe(ctx, S, V, k, tp, B, spA) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.hitAt
  if (kp < 0) {
    const hit = k >= B.fangAt
    const keys = hit ? (S.blocked ? ['guard', 'idle'] : ['hurt', 'idle']) : ['idle'], fr = hit ? 0 : (S.real >> 3) % 4
    if (spA > 0 && k >= 60) {   // the heat silhouette Inosuke "feels" through the dark
      glow(ctx, tp.x, tp.y - 50 * z, 120 * z, '255,60,40', 0.5 * spA)
      sprite(ctx, t, keys, fr, tp.x, tp.y, z, fdir, { tint: '#ff3020', tintA: 0.75 * spA })
    } else sprite(ctx, t, keys, fr, tp.x, tp.y, z, fdir, { tint: S.lastFang && S.real - S.lastFang.real < 3 ? '#ffffff' : null, tintA: 0.7 })
    return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: kp < 6 ? 0.85 : 1, sy: kp < 6 ? 1.06 : 1 }); return }
  const landed = (S.ty || 0) <= 0 && kp > 20
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { anchor: landed ? null : 'centre', rot: landed ? 0 : -S.dir * kp * 0.3, tint: kp < 3 ? '#ffffff' : null, tintA: 0.8 })
}
// twin serrated cuts (Inosuke's jagged Nichirin blades)
function serrated(ctx, x, y, ang, len, a, seed, z) {
  if (a <= 0) return
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'miter'
  for (const off of [-9, 9]) {
    const pts = [], n = 18
    for (let i = 0; i <= n; i++) { const s = (i / n - 0.5) * len, tooth = (i % 2 ? 1 : -1) * 6 * z * (0.6 + 0.4 * hash(seed, i)); pts.push([x + ux * s + nx * (off * z + tooth), y + uy * s + ny * (off * z + tooth)]) }
    for (const [lw, col] of [[10 * z, `rgba(${BLUE},${(0.45 * a).toFixed(3)})`], [3.5 * z, `rgba(220,240,255,${(0.95 * a).toFixed(3)})`]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke()
    }
  }
  ctx.restore()
}
function lockOn(ctx, tp, z, kk) {
  const u = clamp(kk / 8, 0, 1), s = (1.8 - 0.8 * outE(u)) * 60 * z, cx = tp.x, cy = tp.y - 50 * z, l = 18 * z, a = clamp((30 - kk) / 6, 0, 1)
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 3
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(cx + sx * s, cy + sy * (s - l)); ctx.lineTo(cx + sx * s, cy + sy * s); ctx.lineTo(cx + sx * (s - l), cy + sy * s); ctx.stroke() }
  ctx.font = `900 ${Math.round(16 * Math.max(1, z))}px system-ui, sans-serif`; ctx.fillStyle = '#ff4a3a'; ctx.textAlign = 'center'; ctx.fillText('見つけた', cx, cy - s - 10); ctx.restore()
}
function stamp(ctx, W, H, F, fpr, dir, i) {
  const a = Math.min(1, fpr < 2 ? 1 : clamp((16 - fpr) / 6, 0, 1)), sc = 1 + Math.max(0, 1 - fpr / 4) * 0.7
  const x = W * ((i % 2 ? dir < 0 : dir > 0) ? 0.82 : 0.18), y = H * 0.34
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.1); ctx.font = `900 ${fs}px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#06101e'; ctx.strokeText(F.k, 0, 0); ctx.fillStyle = '#eaf6ff'; ctx.fillText(F.k, 0, 0)
  ctx.font = `800 ${Math.round(H * 0.026)}px system-ui, sans-serif`; ctx.lineWidth = 4; ctx.strokeText(F.en, 0, fs * 0.72); ctx.fillStyle = '#7fc8ff'; ctx.fillText(F.en, 0, fs * 0.72)
  ctx.restore()
}
// the boar-spirit: a huge translucent Inosuke charging ahead of him
function spirit(ctx, S, fp, z, k, B) {
  const u = (k - B.rushAt) / (B.hitAt + 4 - B.rushAt)
  glow(ctx, fp.x + S.dir * 60 * z, fp.y - 50 * z, 200 * z, BLUE, 0.5 * (1 - u * 0.5))
  sprite(ctx, S.caster, ['inosukeCine2'], 2, fp.x + S.dir * 40 * z, fp.y + 20 * z, z, S.dir, { s: 2.3, alpha: 0.28, tint: '#9fd8ff', tintA: 1, comp: 'lighter' })
}
function dust(ctx, x, y, z, kk, dir) {
  if (kk < 0 || calmMotion()) return
  ctx.save()
  for (let i = 0; i < 34; i++) {
    const tt = kk * (0.7 + hash(i, 2) * 0.6), vx = -dir * (2 + hash(i, 3) * 7), vy = -(1 + hash(i, 4) * 4)
    const px = x + vx * tt * 3 * z, py = y + vy * tt * 2 * z + 0.06 * tt * tt * z, r = (10 + tt * 1.2 + hash(i, 5) * 14) * z
    ctx.globalAlpha = clamp(1 - kk / 50, 0, 1) * 0.55; ctx.fillStyle = i % 3 ? '#d8b57a' : '#f4dca8'
    ctx.beginPath(); ctx.arc(px, Math.min(py, y), r, 0, Math.PI * 2); ctx.fill()
  }
  if (kk < 10) glow(ctx, x, y - 30 * z, 160 * z, '255,220,150', 1 - kk / 10)
  ctx.restore()
}
function cracks(ctx, x, y, z, u, a) {
  if (u <= 0 || a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#120c08'; ctx.lineCap = 'round'
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1; let px = x, py = y; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 5 * u; s++) { px += side * (14 + hash(i, s) * 26) * z; py += (hash(i + 3, s) - 0.5) * 8 * z; ctx.lineTo(px, py) }
    ctx.stroke()
  }
  ctx.restore()
}
function silFrame(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 60 + pr, fg, 0.95, false, pr)
  sprite(ctx, S.caster, ['inosukeCine2'], 3, fp.x, fp.y, z, S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
