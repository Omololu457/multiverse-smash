// sanjiUltFx.js — RENDER-ONLY half of Sanji's DIABLE JAMBE — PARTY TABLE KICK COURSE: BŒUF BURST (sanjiUlt.js). One screen pass
// (cineRegistry overlay, identity transform) owns the picture while the cinematic runs: world → screen from camera.js's live
// transform; Sanji (taunt cigarette / sIgnite / the Diable Jambe *_dj strips of the worn skin) and the foe from their REAL sheets.
// Layers: warm kitchen-fire grade + heat shimmer → cigarette smoke → fighters (+ the burning leg glow) → flame arcs of each cut
// → the comet heel + the fire column → embers → re-blit close-ups → menu cards / titles → impact frames → letterbox +
// subtitles. Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted frames; Reduce
// Motion → no jitter / drifting embers.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  debris, damageNumber, calmMotion, calmFlash, animOf } from './bleachUltKit.js'
import { djAnim } from './sanjiUlt.js'

const FIRE = '255,110,30'
const CUTS = [
  { fr: 'COLLIER', en: 'NECK', frame: 1 }, { fr: 'ÉPAULE', en: 'SHOULDER', frame: 2 }, { fr: 'CÔTELETTE', en: 'RIBS', frame: 3 },
  { fr: 'SELLE', en: 'SADDLE', frame: 4 }, { fr: 'POITRINE', en: 'BREAST', frame: 5 }, { fr: 'GIGOT', en: 'LEG', frame: 6 },
]

export function drawSanjiUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir, f = S.caster
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.hitReal != null ? S.real - S.hitReal : -1
  const cpr = S.lastCut ? S.real - S.lastCut.real : 99
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 20 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 20 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), t0 = V.p(S.tx0, S.tFloor), floorY = V.p(0, S.floor).y
  const tc = { x: tp.x, y: tp.y - 50 * z }
  const fire = k >= B.igniteAt && k < B.calmAt + 30
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grade: dim → a warm fire grade once the leg is lit; slow-mo drains it before the heel
  wash(ctx, W, H, '#000000', (k < B.igniteAt ? 0.4 : 0.25) * smooth(S.real / 14))
  if (fire) { const a = k < B.calmAt ? clamp((k - B.igniteAt) / 20, 0, 1) : clamp(1 - (k - B.calmAt) / 30, 0, 1); wash(ctx, W, H, '#ff5a10', 0.18 * a, 'soft-light'); wash(ctx, W, H, '#3a0a00', 0.25 * a, 'multiply') }
  if (k >= B.leapAt + 6 && k < B.burstAt) desat(ctx, W, H, 0.65 * smooth((k - B.leapAt - 6) / 12))

  // 2) the cigarette smoke curling up
  if (k >= 14 && k < B.courseAt + 10 && !calmMotion()) smoke(ctx, V.p(S.fx0 + dir * 6, S.floor - 86).x, V.p(0, S.floor - 86).y, z, S.real, k < B.courseAt ? 1 : 1 - (k - B.courseAt) / 10)

  // 3) the ignite: a spinning fire ring around him, heat shimmer
  if (k >= B.igniteAt && k < B.courseAt) {
    const u = (k - B.igniteAt) / (B.courseAt - B.igniteAt)
    fireRing(ctx, fp.x, floorY - 40 * z, z, S.real, smooth(u * 2))
    if (k >= B.igniteAt + 22) { rings(ctx, fp.x, floorY - 40 * z, clamp((k - B.igniteAt - 22) / 18, 0, 1), 2, 420 * z, '#ffb060', 10 * z, 0.5); glow(ctx, fp.x, floorY - 40 * z, 220 * z, FIRE, (1 - clamp((k - B.igniteAt - 22) / 18, 0, 1)) * 0.8) }
  }

  // 4) fighters
  drawFoe(ctx, S, V, k, tp, B)
  drawSanji(ctx, S, V, k, fp, B, fire)

  // 5) the flame arc of each cut
  if (S.lastCut && cpr < 16 && k < B.leapAt + 4) {
    const i = S.lastCut.i, a = 1 - cpr / 16, ang0 = [-2.4, 0.6, -1.2, 2.0, -0.2, 1.2][i]
    flameArc(ctx, tc.x, tc.y, (90 + 30 * outE(cpr / 5)) * z, ang0, a, i)
    star(ctx, tc.x, tc.y, 100 * z * a, a, ang0, '#fff0c8')
    glow(ctx, tc.x, tc.y, 130 * z, FIRE, a * 0.7)
  }
  if (k >= B.courseAt && k < B.leapAt && !calmMotion()) speedLines(ctx, W, H, tc.x, tc.y, 36, 3 + (S.lastCut?.i | 0), '#ffd9a0', 0.22, true, S.real)

  // 6) the heel comet + the fire column
  if (k >= B.leapAt + 10 && k < B.burstAt) comet(ctx, fp, z, dir, S.real, smooth((k - B.leapAt - 10) / 12))
  const kp = k - B.burstAt
  if (kp >= 0 && kp < 70) { column(ctx, t0.x, floorY, z, kp, H); rings(ctx, t0.x, floorY - 6 * z, kp / 70, 3, W * 0.9, '#ffb060', 16 * z, 0.25); debris(ctx, t0.x, floorY, kp, 30, Math.max(1, z), 23, '#4a2a18', 520, 26) }
  if (kp >= 0 && kp < 22) glow(ctx, t0.x, floorY - 60 * z, (220 + kp * 22) * z, '255,220,160', 1 - kp / 22)
  if (fire && !calmMotion()) embers(ctx, W, H, S.real, k >= B.burstAt ? 1 : 0.5)

  // 7) close-ups
  if (k < B.igniteAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 90 * z, 1.2 + 0.35 * smooth(k / 30))
  else if (k >= B.cuts[0] - 4 && k < B.leapAt) punchIn(ctx, canvas, W, H, tc.x, tc.y, 1.3 + (cpr < 4 ? 0.15 * (1 - cpr / 4) : 0))
  else if (k >= B.leapAt + 12 && k < B.burstAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 40 * z, 1 + 0.3 * smooth((k - B.leapAt - 12) / 14))

  // 8) titles, calligraphy, menu cards
  if (k >= B.igniteAt + 4 && k < B.courseAt + 4) title(ctx, W, H, 'DIABLE JAMBE', 'SANJI  ·  BLACK LEG  ·  悪魔風脚', (k - B.igniteAt - 4) / (B.courseAt - B.igniteAt),
    { y: 0.22, fs: 0.12, band: 'rgba(20,4,0,0.92)', edge: '#ff7a20', fill: '#ffe2b0', stroke: '#b3200a', kanji: '悪魔風脚', kanjiCol: '#ff7a20' })
  if (k >= 8 && k < B.igniteAt) calligraphy(ctx, W, H, '黒脚', (k - 8) / (B.igniteAt - 8), { x: dir > 0 ? 0.86 : 0.14, y: 0.24, size: 0.14, col: '#ffffff', edge: '#101828', glow: 'rgba(255,200,120,0.6)' })
  if (k >= B.courseAt && k < B.cuts[0] + 8) banner(ctx, W, H, 'PARTY TABLE KICK COURSE', clamp((k - B.courseAt) / 6, 0, 1) * clamp((B.cuts[0] + 8 - k) / 6, 0, 1))
  if (S.lastCut && cpr < 20 && k < B.leapAt) menuCard(ctx, W, H, CUTS[S.lastCut.i], S.lastCut.i, cpr, dir)
  if (k >= B.leapAt + 8 && k < B.burstAt + 20) title(ctx, W, H, 'BŒUF BURST!!', 'PLAT PRINCIPAL  ·  牛肉バースト', (k - B.leapAt - 8) / (B.burstAt + 20 - B.leapAt - 8),
    { y: 0.2, fs: 0.13, band: 'rgba(18,4,0,0.92)', edge: '#ff7a20', fill: '#ffffff', stroke: '#c43a0a', kanji: '炎', kanjiCol: '#ff7a20' })

  // 9) impact frames
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, '#ffffff', '#000000', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, fp, tp, calmFlash() ? '#1a0600' : '#000000', '#ff7a20', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, t0.x, t0.y - H * 0.3, pr - 10, '#ff9a3a')
  else if (S.lastCut && cpr < 40 && k < B.leapAt + 6) damageNumber(ctx, W, H, S, tc.x - dir * 120 * z, tc.y - H * 0.1, cpr + 20, '#ffffff')
  if (k >= B.calmAt && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.calmAt) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `italic 900 ${Math.round(H * 0.06)}px Georgia, "Times New Roman", serif`; ctx.textAlign = dir > 0 ? 'right' : 'left'; ctx.textBaseline = 'middle'
    const x = dir > 0 ? W * 0.94 : W * 0.06; ctx.lineWidth = 6; ctx.strokeStyle = '#1a0800'; ctx.strokeText('Bon appétit.', x, H * 0.22); ctx.fillStyle = '#ffe2b0'; ctx.fillText('Bon appétit.', x, H * 0.22); ctx.restore()
  }

  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.igniteAt, 'SANJI', 'A cook’s legs are his pride. Hands are for cooking.', '#ff9a3a')
  sub(ctx, W, H, k, B.igniteAt + 6, B.courseAt, 'SANJI', 'Let me serve you a full course…', '#ff9a3a')
  sub(ctx, W, H, k, B.leapAt + 4, B.burstAt, 'SANJI', '…and the main dish!', '#ff9a3a')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'SANJI', 'Bon appétit.', '#ff9a3a')
  return true
}

// ── Sanji: taunt (the cigarette) → spinning ignite → the course kicks (Diable Jambe strips) → the heel drop ──
function pose(S, k, B) {
  const f = S.caster
  if (k < B.igniteAt) return { keys: ['taunt', 'idle'], fr: Math.min(6, k >> 3), dj: false }
  if (k < B.courseAt) return { key: 'sIgnite', fr: k < B.igniteAt + 22 ? (k >> 2) % 2 : 2 + ((k >> 3) & 1), dj: k >= B.igniteAt + 22 }
  if (k < B.leapAt) {
    if (k < B.cuts[0] - 5) return { key: 'sPTKC', fr: 0, dj: true }
    let i = 0; for (let j = 0; j < B.cuts.length; j++) if (k >= B.cuts[j] - 5) i = j
    return { key: 'sPTKC', fr: CUTS[i].frame + (k - B.cuts[i] >= 3 ? 0 : 0), dj: true }
  }
  if (k < B.burstAt) return { key: 'sPTKC', fr: 7, dj: true }
  if (k < B.calmAt) return { key: 'sPTKC', fr: 8, dj: true }
  void f; return { keys: ['taunt', 'idle'], fr: 6, dj: false }
}
function drawSanji(ctx, S, V, k, fp, B, fire) {
  const f = S.caster, z = V.z, P = pose(S, k, B), face = S.fFace || S.dir
  const keys = P.keys || (P.dj ? (djAnim(f, P.key) || [P.key]) : [P.key])
  const n = (keys.sheet ? keys.frames : animOf(f, keys[0])?.frames) || 1
  if (fire && k >= B.igniteAt + 22 && k < B.calmAt) glow(ctx, fp.x, fp.y - 30 * z, 90 * z * (1 + 0.1 * Math.sin(S.real * 0.6)), FIRE, 0.55)
  if (k >= B.igniteAt && k < B.igniteAt + 30) {   // the spin: mirrored flips
    sprite(ctx, f, keys, Math.min(P.fr, n - 1), fp.x, fp.y, z, ((k >> 2) & 1) ? face : -face); return
  }
  if (k >= B.courseAt && k < B.leapAt) for (let g = 1; g <= 2; g++) sprite(ctx, f, keys, Math.min(P.fr, n - 1), fp.x + face * g * 18 * z, fp.y, z, face, { alpha: 0.15 * (3 - g), tint: '#ff7a20', tintA: 0.8 })
  sprite(ctx, f, keys, Math.min(P.fr, n - 1), fp.x, fp.y, z, face)
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.burstAt
  if (kp < 0) {
    const air = k >= B.cuts[0] && !S.blocked, hit = S.lastCut && S.real - S.lastCut.real < 8
    sprite(ctx, t, S.blocked && k >= B.cuts[0] ? ['guard', 'idle'] : air ? ['hurt_air', 'hurt', 'idle'] : ['idle'], air ? 0 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir,
      { anchor: air ? 'centre' : null, rot: air ? (S.lastCut ? (S.lastCut.i % 2 ? 0.25 : -0.25) : 0) : 0, tint: hit && S.real - S.lastCut.real < 3 ? '#fff0c0' : null, tintA: 0.8 })
    return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  sprite(ctx, t, kp < 10 ? ['hurt', 'idle'] : ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir, { sx: kp < 10 ? 1.2 : 1, sy: kp < 10 ? 0.8 : 1, tint: kp < 4 ? '#ffffff' : kp < 30 ? '#3a1000' : null, tintA: kp < 4 ? 0.8 : 0.4 })
}
function smoke(ctx, x, y, z, real, a) {
  ctx.save()
  for (let i = 0; i < 10; i++) {
    const ph = ((real * 0.6 + i * 9) % 90) / 90, px = x + Math.sin(ph * 6 + i) * 14 * z * ph + ph * 10 * z, py = y - ph * 160 * z
    ctx.globalAlpha = a * (1 - ph) * 0.45; ctx.fillStyle = '#d8dde6'; ctx.beginPath(); ctx.arc(px, py, (3 + ph * 16) * z, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function fireRing(ctx, x, y, z, real, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) {
    const an = i / 26 * Math.PI * 2 + real * 0.35, rx = 70 * z, ry = 22 * z, px = x + Math.cos(an) * rx, py = y + 30 * z + Math.sin(an) * ry, len = (18 + hash(i, real >> 2) * 26) * z
    ctx.globalAlpha = a * (Math.sin(an) > 0 ? 0.9 : 0.5); ctx.fillStyle = i % 3 ? '#ff6a1a' : '#ffd080'
    ctx.beginPath(); ctx.moveTo(px - 6 * z, py); ctx.quadraticCurveTo(px, py - len * 0.6, px + 2 * z, py - len); ctx.quadraticCurveTo(px + 6 * z, py - len * 0.4, px + 6 * z, py); ctx.fill()
  }
  ctx.restore()
}
function flameArc(ctx, x, y, r, a0, a, i) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const sweep = 2.2 * (i % 2 ? 1 : -1)
  for (const [lw, col] of [[22, `rgba(255,90,20,${(0.5 * a).toFixed(3)})`], [10, `rgba(255,170,60,${(0.85 * a).toFixed(3)})`], [3, `rgba(255,245,210,${a.toFixed(3)})`]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, a0, a0 + sweep, sweep < 0); ctx.stroke()
  }
  ctx.restore()
}
function comet(ctx, fp, z, dir, real, u) {
  const x = fp.x + dir * 10 * z, y = fp.y - 10 * z
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 18; i++) { const d = i * 10 * z, w = (26 - i) * z * u; ctx.globalAlpha = (1 - i / 18) * 0.7 * u; ctx.fillStyle = i < 4 ? '#ffe8b0' : '#ff6a1a'; ctx.beginPath(); ctx.arc(x - dir * d * 0.4, y - d, Math.max(1, w), 0, Math.PI * 2); ctx.fill() }
  ctx.restore(); glow(ctx, x, y, 120 * z * u, FIRE, 0.8 * u); void real
}
function column(ctx, x, floorY, z, kp, H) {
  const u = clamp(kp / 14, 0, 1), a = clamp(1 - (kp - 20) / 40, 0, 1), wv = (70 + 50 * outE(u)) * z, top = floorY - H * 1.2 * outE(u)
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a
  const g = ctx.createLinearGradient(x - wv, 0, x + wv, 0); g.addColorStop(0, 'rgba(255,60,10,0)'); g.addColorStop(0.3, 'rgba(255,110,30,0.8)'); g.addColorStop(0.5, 'rgba(255,240,200,0.95)'); g.addColorStop(0.7, 'rgba(255,110,30,0.8)'); g.addColorStop(1, 'rgba(255,60,10,0)')
  ctx.fillStyle = g; ctx.fillRect(x - wv, top, wv * 2, floorY - top)
  ctx.fillStyle = 'rgba(255,140,40,0.6)'; ctx.beginPath(); ctx.ellipse(x, floorY, wv * 3 * outE(u), 30 * z, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
function embers(ctx, W, H, real, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 40; i++) {
    const ph = ((real * (0.5 + hash(i, 2)) + hash(i, 3) * 100) % 100) / 100, x = hash(i, 4) * W + Math.sin(real * 0.04 + i) * 20, y = H - ph * H * 1.1
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.8; ctx.fillStyle = i % 4 ? '#ff7a20' : '#ffe0a0'; ctx.fillRect(x, y, 2 + hash(i, 5) * 3, 2 + hash(i, 5) * 3)
  }
  ctx.restore()
}
function banner(ctx, W, H, text, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; const fs = Math.round(H * 0.05)
  ctx.font = `italic 900 ${fs}px Georgia, "Times New Roman", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(20,6,0,0.85)'; const w = ctx.measureText(text).width + fs * 2; ctx.fillRect(W / 2 - w / 2, H * 0.8 - fs, w, fs * 2)
  ctx.strokeStyle = '#ffb060'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - w / 2 + 4, H * 0.8 - fs + 4, w - 8, fs * 2 - 8)
  ctx.fillStyle = '#ffe2b0'; ctx.fillText(text, W / 2, H * 0.8); ctx.restore()
}
// a restaurant menu card per cut (Baratie style): the French cut, the English below, the course number
function menuCard(ctx, W, H, C, i, age, dir) {
  const a = clamp((20 - age) / 6, 0, 1), sc = 1 + Math.max(0, 1 - age / 4) * 0.5
  const x = W * ((i % 2 ? dir < 0 : dir > 0) ? 0.8 : 0.2), y = H * 0.34, w = H * 0.3, h = H * 0.18
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate((i % 2 ? 1 : -1) * 0.05)
  ctx.fillStyle = '#f6ecd6'; ctx.strokeStyle = '#6a3a10'; ctx.lineWidth = 3; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.round(H * 0.022)}px Georgia, serif`; ctx.fillStyle = '#8a4a10'; ctx.fillText(`— ${['I', 'II', 'III', 'IV', 'V', 'VI'][i]} —`, 0, -h * 0.28)
  ctx.font = `italic 900 ${Math.round(H * 0.048)}px Georgia, serif`; ctx.fillStyle = '#2a0e00'; ctx.fillText(C.fr, 0, 0)
  ctx.font = `700 ${Math.round(H * 0.02)}px system-ui, sans-serif`; ctx.fillStyle = '#b3200a'; ctx.fillText(C.en + ' SHOT', 0, h * 0.3)
  ctx.restore()
}
function silFrame(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 20 + pr, fg, 0.95, false, pr)
  sprite(ctx, S.caster, djAnim(S.caster, 'sPTKC') || ['sPTKC'], 8, fp.x, fp.y, z, S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1, sx: 1.2, sy: 0.8 })
  ctx.restore()
}
