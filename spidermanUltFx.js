// spidermanUltFx.js — RENDER-ONLY half of Spider-Man's MAXIMUM WEB cinematic (spidermanUlt.js). One screen pass (cineRegistry
// overlay slot, identity transform, device pixels): both fighters drawn here from their real sheets (the engine sprites are
// hidden with _fxAlpha = 0). Layers: the spider-sense grade → the web lines / nets / cocoon under + over the foe → the
// fighters (zip after-images) → comic call-outs + halftone impact panels → re-blit punch-ins → title → letterbox + subtitles.
// Pure functions of the scene's script / real frames; noise = integer hash (no Math.random). Reduce Flashing / Motion honoured.
import { dcKit } from './soldierBoyUltFx.js'
const { image, ready, hash, clamp, smooth, outE, calmMotion, calmFlash, sprite, preloadAnims, view, punchIn, speedLines, title, subtitle, letterbox, star, glow, ring, grade, bigNumber, caption } = dcKit

const PORTRAIT = './spiderman_portrait.png'
export const SPM_T = { netAt: 46, titleAt: 56, yankAt: 180, slamAt: 208, endAt: 216 }
// the five zip-strikes: where he lands relative to the foe (dx toward his own side, + = his side; dy up) and the pose
export const SPM_ZIPS = [
  { i: 0, at: 104, dx: 64, dy: 0, pose: ['spiderDashAttack', 3], word: 'THWIP!' },
  { i: 1, at: 120, dx: -70, dy: 70, pose: ['air', 2], word: 'POW!' },
  { i: 2, at: 136, dx: 58, dy: 130, pose: ['down_air', 2], word: 'WHAM!' },
  { i: 3, at: 152, dx: -66, dy: 0, pose: ['heavy', 3], word: 'KRAK!' },
  { i: 4, at: 168, dx: 56, dy: 0, pose: ['up', 2], word: 'THWACK!' },
]
const T = SPM_T
const RED = '#d4202a', BLUE = '#1f4fbf', WEB = 'rgba(236,244,255,'
export function preloadSpidermanUlt(f, t) {
  image(PORTRAIT)
  preloadAnims(f, ['idle', 'win', 'spiderWebThrow', 'spiderWebBridge', 'spiderDashAttack', 'air', 'down_air', 'heavy', 'up', 'jump', 'spiderKickup'])
  preloadAnims(t, ['idle', 'hurt', 'knockdown', 'guard'])
}

export function drawSpidermanUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z
  const sr = S.slamReal != null ? S.real - S.slamReal : -1
  const hr = S.real - (S.lastHitReal ?? -99)
  const jit = S.hold > 0 && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (sr >= 0 ? 18 : 8), y: (hash(S.real, 2) - 0.5) * (sr >= 0 ? 18 : 8) } : { x: 0, y: 0 }
  const fp = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94)), tp = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94))
  const floorY = V.p(0, S.tFloor).y
  const tBody = { x: tp.x, y: tp.y - 50 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) SPIDER-SENSE: the world greys and slows; a cool comic wash through the barrage
  const sense = k < 40 ? smooth(k / 10) * (1 - smooth((k - 30) / 10)) : 0
  grade(ctx, W, H, 'saturation', 'hsl(0,0%,50%)', sense * 0.85)
  grade(ctx, W, H, 'multiply', '#5a6a8a', sense * 0.35)
  if (k >= 96 && k < T.yankAt) {   // halftone city-night wash behind the zips
    const a = smooth((k - 96) / 8) * (1 - smooth((k - T.yankAt + 8) / 8))
    grade(ctx, W, H, 'multiply', '#3a4a7a', a * 0.45)
    if (!calmMotion()) speedLines(ctx, W, H, tBody.x, tBody.y, 46, 7 + (k >> 2), 'rgba(255,255,255,0.9)', a * 0.35, true, S.real)
  }

  // 2) webs UNDER the foe: the ground splat + strands anchored to the floor
  const nets = k < T.netAt ? 0 : k < 66 ? 1 : k < 78 ? 2 : k < 90 ? 3 : 4
  if (nets > 0 && k < T.yankAt) {
    ctx.save(); ctx.strokeStyle = WEB + '0.7)'; ctx.lineWidth = Math.max(1, 1.6 * z)
    for (let i = 0; i < 4 + nets * 2; i++) { const ax = tp.x + (hash(i, 3) - 0.5) * 220 * z, ay = floorY; ctx.beginPath(); ctx.moveTo(tBody.x + (hash(i, 4) - 0.5) * 40 * z, tBody.y + (hash(i, 5) - 0.2) * 40 * z); ctx.quadraticCurveTo((ax + tBody.x) / 2, ay - 10 * z, ax, ay); ctx.stroke() }
    ctx.restore()
  }

  // 3) the fighters
  drawFoe(ctx, S, V, k, tp, nets)
  drawSpidey(ctx, S, V, k, fp, tBody)

  // 4) webs OVER the foe: nets / cocoon; the shot web lines; the yank lines
  if (k >= 36 && k < T.netAt) {   // the web line zipping across
    const u = (k - 36) / (T.netAt - 36), hand = { x: fp.x + dir * 34 * z, y: fp.y - 62 * z }
    webLine(ctx, hand.x, hand.y, hand.x + (tBody.x - hand.x) * outE(u), hand.y + (tBody.y - hand.y) * outE(u), z, 1)
    glow(ctx, hand.x + (tBody.x - hand.x) * outE(u), hand.y + (tBody.y - hand.y) * outE(u), 26 * z, '230,240,255', 0.8)
  }
  for (const [at, i] of [[66, 1], [78, 2], [90, 3]]) {   // the fanned web balls flying in
    if (k >= at - 8 && k < at) { const u = (k - at + 8) / 8, hand = { x: fp.x + dir * 30 * z, y: fp.y - 70 * z }
      const bx = hand.x + (tBody.x - hand.x) * u, by = hand.y + (tBody.y - 20 * z * i + 20 * z - hand.y) * u - Math.sin(Math.PI * u) * 40 * z
      webLine(ctx, hand.x, hand.y, bx, by, z, 0.5); webNet(ctx, bx, by, 16 * z, 2, i, 1) }
  }
  if (nets > 0 && k < T.yankAt) for (let i = 0; i < nets; i++) {
    const age = k - [T.netAt, 66, 78, 90][i], pop = 1 + Math.max(0, 1 - age / 6) * 0.5
    webNet(ctx, tBody.x + (hash(i, 9) - 0.5) * 24 * z, tBody.y + (i - 1.5) * 16 * z, (44 + i * 6) * z * pop, 4, i * 3 + 1, 0.85)
  }
  if (k >= T.yankAt) {
    const coc = { x: tp.x, y: tp.y - 50 * z }
    if (k < T.slamAt + 4) {   // the two yank lines from his hands
      const hands = [{ x: fp.x + dir * 30 * z, y: fp.y - 70 * z }, { x: fp.x + dir * 22 * z, y: fp.y - 52 * z }]
      for (const h of hands) webLine(ctx, h.x, h.y, coc.x, coc.y, z, 1.4)
    }
    cocoon(ctx, S, coc.x, coc.y, z, k)
  }

  // 5) contacts: comic bursts + call-outs on the zips
  for (const zp of SPM_ZIPS) {
    const kp = k - zp.at; if (kp < 0 || kp > 14) continue
    const u = kp / 14, side = zp.i % 2 ? -1 : 1
    burst(ctx, tBody.x, tBody.y - (zp.dy > 60 ? 30 * z : 0), (60 + 40 * outE(u)) * z, zp.i, 1 - u)
    caption(ctx, W, H, zp.word, clamp(tBody.x + side * dir * 120 * z, W * 0.12, W * 0.88), clamp(tBody.y - 90 * z, H * 0.2, H * 0.8), 1 - smooth((kp - 8) / 6),
      { fill: zp.i % 2 ? '#ffe14d' : '#ffffff', stroke: zp.i % 2 ? RED : BLUE, rot: side * 0.12, scale: 1 + Math.max(0, 1 - kp / 4) * 0.5, fs: 0.09 })
  }
  if (k >= T.netAt && k < T.netAt + 16) caption(ctx, W, H, 'THWIP!', clamp(tBody.x, W * 0.15, W * 0.85), clamp(tBody.y - 110 * z, H * 0.2, H * 0.8), 1 - smooth((k - T.netAt - 10) / 6), { fill: '#ffffff', stroke: BLUE, rot: -0.1, fs: 0.08 })
  if (sr >= 0 && sr < 50) {   // the slam: shock ring + dust off the floor
    const u = sr / 50
    ring(ctx, tp.x, floorY, (40 + 380 * outE(u)) * z, (10 + 60 * outE(u)) * z, '#ffffff', 10 * z * (1 - u), 1 - u)
    ctx.save(); ctx.fillStyle = '#c8b8a0'
    for (let i = 0; i < 16; i++) { ctx.globalAlpha = (1 - u) * 0.6; ctx.beginPath(); ctx.arc(tp.x + (hash(i, 77) - 0.5) * 300 * z * (0.4 + u), floorY - hash(i, 78) * 60 * z * u, (8 + hash(i, 79) * 18) * z * (0.6 + u), 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }

  // 6) punch-ins: the tingle, the netted foe, the slam
  const head = { x: fp.x, y: fp.y - 90 * z }
  if (k < 34) punchIn(ctx, canvas, W, H, head.x, head.y, 1 + 0.45 * smooth((k - 2) / 22))
  else if (k >= 60 && k < 96) punchIn(ctx, canvas, W, H, tBody.x, tBody.y, 1 + 0.25 * smooth((k - 60) / 30))
  else if (k >= 96 && k < T.yankAt && hr >= 0 && hr < 6) punchIn(ctx, canvas, W, H, tBody.x, tBody.y, 1.18 - hr * 0.03)
  else if (sr >= 0 && sr < 26) punchIn(ctx, canvas, W, H, tp.x, floorY - 40 * z, 1.35 - sr * 0.008)

  // 7) title, impact frames, number
  if (k >= T.titleAt && k < 96) title(ctx, W, H, 'MAXIMUM WEB', 'WITH GREAT POWER…', (k - T.titleAt) / (96 - T.titleAt),
    { y: 0.26, fs: 0.12, band: 'rgba(160,16,24,0.94)', edge: '#7fb2ff', stroke: '#0d1f5a', fill: '#ffffff', subFill: '#ffe14d', portrait: PORTRAIT, portraitX: dir > 0 ? 0.88 : 0.12, tx: dir > 0 ? 0.44 : 0.56, from: dir })
  if (sr >= 0 && sr < 26) slamFrames(ctx, W, H, S, sr, V, fp, tp)
  if (sr >= 26) bigNumber(ctx, W, H, S.dmg, tp.x, tp.y - 160 * z, (sr - 26) / 80, S.blocked ? '#ffd27a' : '#ff3b2f')
  ctx.restore()

  // 8) letterbox + subtitles
  letterbox(ctx, W, H, S.real / 10, k >= T.endAt + 60 ? 1 - (k - T.endAt - 60) / 14 : 1)
  if (k >= 2 && k < 150) subtitle(ctx, W, H, 'SPIDER-MAN', 'You get a web, and you get a web, and you get a web!', Math.min((k - 2) / 6, (150 - k) / 10), '#ff4a4a')
  if (k >= T.endAt + 6 && k < T.endAt + 74) subtitle(ctx, W, H, 'SPIDER-MAN', 'Game over.', Math.min((k - T.endAt - 6) / 6, (T.endAt + 74 - k) / 8), '#ff4a4a')
  return true
}

// ── the fighters ──────────────────────────────────────────────────────────────────────────────────────────────────
function drawSpidey(ctx, S, V, k, fp, tBody) {
  const f = S.caster, z = V.z, dir = S.dir, face = f.facing || dir
  // spider-sense: the tingle (his own sheet frame) + big jagged lines
  if (k < 34) {
    sprite(ctx, f, ['win', 'idle'], k < 8 ? 0 : 7 + ((S.real >> 2) & 1), fp.x, fp.y, z, dir)
    const head = { x: fp.x, y: fp.y - 118 * z * (f.spriteScale || 1) / 1.6 }, a = smooth((k - 6) / 6)
    ctx.save(); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3 * z; ctx.globalAlpha = a; ctx.lineJoin = 'miter'
    for (let i = 0; i < 9; i++) { const an = -Math.PI + (i / 8) * Math.PI, r0 = 26 * z, r1 = (60 + 20 * ((S.real >> 2) + i & 1)) * z
      ctx.beginPath(); ctx.moveTo(head.x + Math.cos(an) * r0, head.y + Math.sin(an) * r0)
      ctx.lineTo(head.x + Math.cos(an + 0.08) * (r0 + r1) * 0.5, head.y + Math.sin(an + 0.08) * (r0 + r1) * 0.5); ctx.lineTo(head.x + Math.cos(an) * r1, head.y + Math.sin(an) * r1); ctx.stroke() }
    ctx.restore()
    return
  }
  if (k < 56) { sprite(ctx, f, ['spiderWebThrow', 'idle'], 0, fp.x, fp.y, z, dir); return }
  if (k < 96) { sprite(ctx, f, ['spiderWebBridge', 'idle'], 1 + (((k - 56) >> 2) % 3), fp.x, fp.y, z, dir); return }
  if (k < T.yankAt) {
    const zp = SPM_ZIPS.find((q, i) => k < (SPM_ZIPS[i + 1]?.at ?? T.yankAt) - 8) || SPM_ZIPS[4]
    const zipping = k < zp.at && k >= zp.at - 8
    if (zipping && !calmMotion()) {   // after-images along the zip + a web line to the anchor overhead
      for (let g = 1; g <= 4; g++) sprite(ctx, f, ['jump', 'idle'], 6, fp.x - face * g * 22 * z, fp.y + g * 4 * z, z, face, { alpha: 0.12 * (5 - g), tint: g % 2 ? RED : BLUE, tintA: 0.7 })
      webLine(ctx, fp.x, fp.y - 90 * z, fp.x - face * 60 * z, -20, z, 0.6)
    }
    const [key, fr] = zipping ? ['jump', 6] : zp.pose
    sprite(ctx, f, [key, 'idle'], fr, fp.x, fp.y, z, face)
    return
  }
  if (k < T.slamAt + 4) { const u = (k - T.yankAt) / (T.slamAt - T.yankAt); sprite(ctx, f, ['spiderWebThrow', 'idle'], 0, fp.x, fp.y, z, dir, { skew: -dir * 0.12 * Math.sin(Math.PI * u) }); return }
  if (k < T.endAt) { sprite(ctx, f, ['spiderWebThrow', 'idle'], 0, fp.x, fp.y, z, dir); return }
  sprite(ctx, f, ['win', 'idle'], Math.min(6, (k - T.endAt) >> 2), fp.x, fp.y, z, dir)
}
function drawFoe(ctx, S, V, k, tp, nets) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k < T.netAt) { sprite(ctx, t, ['idle'], S.real >> 3, tp.x, tp.y, z, fdir, { tint: '#8a96b4', tintA: k < 34 ? 0.4 : 0 }); return }
  if (k < T.yankAt) {
    const hitNow = S.real - (S.lastHitReal ?? -99) < 3
    sprite(ctx, t, S.blocked ? ['guard', 'hurt'] : ['hurt', 'idle'], 2 + (nets & 1), tp.x + (hitNow && !calmMotion() ? S.dir * 6 * z : 0), tp.y, z, fdir, { tint: '#ffffff', tintA: hitNow ? 0.75 : 0 })
    return
  }
  if (k < T.slamAt) { const u = (k - T.yankAt) / (T.slamAt - T.yankAt); sprite(ctx, t, ['hurt', 'idle'], 4, tp.x, tp.y, z, fdir, { rot: -S.dir * Math.PI * 1.1 * smooth(u) }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir)
}
// ── webs ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function webLine(ctx, x0, y0, x1, y1, z, w = 1) {
  ctx.save(); ctx.strokeStyle = WEB + '0.95)'; ctx.lineWidth = Math.max(1, 2.2 * z * w); ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(170,200,255,0.9)'; ctx.shadowBlur = 6
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + Math.hypot(x1 - x0, y1 - y0) * 0.05
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke(); ctx.restore()
}
function webNet(ctx, x, y, r, rings, seed, a) {   // a radial spider-web splat
  if (r <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = WEB + '0.95)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.translate(x, y); ctx.rotate(hash(seed, 1) * Math.PI)
  const n = 9, pts = []
  for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2, rr = r * (0.8 + 0.3 * hash(seed, i + 3)); pts.push([Math.cos(an) * rr, Math.sin(an) * rr * 0.85]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke() }
  for (let j = 1; j <= rings; j++) { const q = j / (rings + 0.4); ctx.beginPath()
    for (let i = 0; i <= n; i++) { const p = pts[i % n], pn = pts[(i + 1) % n]; if (i === 0) ctx.moveTo(p[0] * q, p[1] * q); const mx = (p[0] + pn[0]) / 2 * q * 0.9, my = (p[1] + pn[1]) / 2 * q * 0.9; ctx.quadraticCurveTo(mx, my, pn[0] * q, pn[1] * q) }
    ctx.stroke() }
  ctx.restore()
}
function cocoon(ctx, S, x, y, z, k) {   // the wrapped foe: a pale spindle of crossing strands
  const lying = k >= T.slamAt, rw = (lying ? 70 : 34) * z, rh = (lying ? 26 : 62) * z, cy = lying ? y + 30 * z : y
  const u = clamp((k - T.yankAt) / 10, 0, 1)
  ctx.save(); ctx.globalAlpha = 0.55 * u; ctx.fillStyle = '#e8eef8'; ctx.beginPath(); ctx.ellipse(x, cy, rw, rh, 0, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.95 * u; ctx.strokeStyle = WEB + '1)'; ctx.lineWidth = Math.max(1, 1.8 * z)
  for (let i = 0; i < 12; i++) { const off = (i / 12 - 0.5) * 2; ctx.beginPath()
    if (lying) { ctx.moveTo(x + off * rw, cy - rh); ctx.quadraticCurveTo(x + off * rw + 14 * z, cy, x + off * rw - 6 * z, cy + rh) }
    else { ctx.moveTo(x - rw, cy + off * rh); ctx.quadraticCurveTo(x, cy + off * rh + 12 * z, x + rw, cy + off * rh - 6 * z) }
    ctx.stroke() }
  ctx.restore()
}
function burst(ctx, x, y, r, seed, a) {   // a comic POW burst (jagged star, red/yellow)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(x, y); ctx.rotate(hash(seed, 2))
  const n = 14
  ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const rr = i & 1 ? r * 0.55 : r * (0.9 + 0.3 * hash(seed, i)); const an = i * Math.PI / n; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) } ctx.closePath()
  ctx.fillStyle = seed % 2 ? '#ffe14d' : '#ffffff'; ctx.fill(); ctx.lineWidth = Math.max(2, r * 0.05); ctx.strokeStyle = seed % 2 ? RED : BLUE; ctx.stroke()
  ctx.restore()
}
function slamFrames(ctx, W, H, S, sr, V, fp, tp) {
  const flash = !calmFlash(), z = V.z, f = S.caster, t = S.target, d = S.dir
  const sil = (bg, fg) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); speedLines(ctx, W, H, tp.x, tp.y - 30 * z, 70, 23 + sr, fg, 0.9, false, sr)
    sprite(ctx, f, ['spiderWebThrow', 'idle'], 0, fp.x, fp.y, z, d, { tint: fg, tintA: 1 }); sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, -d, { tint: fg, tintA: 1 }) }
  if (sr < 3) { if (flash) sil('#ffffff', '#000000'); return }
  if (sr < 6) { if (flash) sil('#000000', '#ffffff'); else sil('#101a40', '#ffe14d'); return }
  if (sr < 22) {   // a halftone comic panel slammed in: KA-THOOM!
    const a = sr < 18 ? 1 : 1 - (sr - 18) / 4
    ctx.save(); ctx.globalAlpha = a * 0.9
    const g = ctx.createRadialGradient(tp.x, tp.y, 10, tp.x, tp.y, H); g.addColorStop(0, '#fff4c0'); g.addColorStop(0.5, '#ffb84d'); g.addColorStop(1, RED)
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.14, W, H * 0.72)
    ctx.fillStyle = 'rgba(120,0,0,0.25)'; for (let yy = H * 0.14; yy < H * 0.86; yy += 12) for (let xx = ((yy / 12) & 1) * 6; xx < W; xx += 12) { ctx.beginPath(); ctx.arc(xx, yy, 2.2, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
    caption(ctx, W, H, 'KA-THOOM!', W * 0.5, H * 0.45, a, { fill: '#ffe14d', stroke: BLUE, rot: -0.06, scale: 1.6 + Math.max(0, 1 - (sr - 6) / 4) * 0.6, fs: 0.1 })
  }
}
