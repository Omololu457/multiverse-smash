// sasukeSenseiUltFx.js — RENDER-ONLY half of Sasuke (Sensei)'s "麒麟 · KIRIN" cinematic (sasukeSenseiUlt.js). One screen
// pass (world→screen from camera.js): the Sharingan band, his real Kirin fire-cast / control-cast / win strips, his own
// fire-dragon + fireball + lightning-pillar FX art, a procedural thunderhead, the procedural lightning DRAGON (a glowing
// serpentine body following its head's path, jaws + eye), impact frames, the crater, titles, subtitles, letterbox.
// Pure functions of the scene's frames; noise = integer hash.
import { KR } from './sasukeSenseiUlt.js'
import { image, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  letterbox, subtitle, lineA, kanjiTitle, damagePops, bolt, glow, rings, wash, desat, cracks, strip } from './narutoUltFxKit.js'

const FIRE = './sasuke_sensei_fx_kirin_dragon_uniform.png', BALL = './sasuke_sensei_fx_kirin_fireball_uniform.png', PILLAR = './sasuke_sensei_fx_kirin_pillars_uniform.png'
const BLUE = '140,200,255'

export function preloadSasukeSenseiUlt(f, t) {
  image(FIRE); image(BALL); image(PILLAR)
  for (const k of ['idle', 'ssKirinCast', 'ssKirinRaiton', 'win']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

export function drawSasukeSenseiUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const big = S.nums?.find(n => n.big), kr = big ? S.real - big.real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 14, y: (hash(S.real, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  const sp = V.p(S.fx0, S.floor), qp = V.p(S.tx0, S.tFloor), floorY = qp.y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the sky darkens; the thunderhead
  const storm = k < KR.stormAt - 20 ? 0 : k < KR.afterAt ? smooth((k - KR.stormAt + 20) / 40) : 1 - smooth((k - KR.afterAt) / 40)
  const heat = k >= KR.katonAt && k < KR.stormAt + 20 ? smooth((k - KR.katonAt) / 20) * (1 - smooth((k - KR.stormAt) / 20)) : 0
  desat(ctx, W, H, 0.85 * storm, '#06081a', 0.75)
  if (heat > 0) wash(ctx, W, H, '#ff5a10', 0.18 * heat, 'lighter')
  if (storm > 0) clouds(ctx, W, H, S.real, storm, k)

  // 2) fighters
  drawSasuke(ctx, S, k, sp, z, f)
  drawFoe(ctx, S, V, k, qp)

  // 3) KATON: fire dragons breathed straight up into the sky
  if (k >= KR.katonAt + 4 && k < KR.stormAt + 16) for (let i = 0; i < 5; i++) {
    const at = KR.katonAt + 6 + i * 7, u = (k - at) / 26; if (u < 0 || u > 1) continue
    const mx = sp.x + dir * 12 * z, my = sp.y - 150 * z, x = mx + (i - 2) * 26 * z * u + Math.sin(u * 6 + i) * 10 * z, y = my - u * H * 0.75
    ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2 * dir + (i - 2) * 0.08)
    strip(ctx, FIRE, 3, (S.real >> 2) % 3, 0, 0, z * (2 + u * 1.5), { ay: 0.5, dir, alpha: 1 - u * 0.4 })
    ctx.restore(); glow(ctx, x, y, 70 * z, '255,140,40', 0.5 * (1 - u))
  }
  if (k >= KR.katonAt && k < KR.katonAt + 40) glow(ctx, sp.x + dir * 12 * z, sp.y - 150 * z, 90 * z, '255,160,60', 0.7 * (1 - (k - KR.katonAt) / 40))

  // 4) the two warning bolts
  KR.strikes.forEach((at, i) => { const a = k - at; if (a < -3 || a > 12) return
    const x0 = qp.x + (i ? -1 : 1) * 60 * z, top = H * 0.16
    if (a < 8) { bolt(ctx, x0, top, qp.x, floorY - 20 * z, 70 + i * 9 + (S.real >> 1), 4 * z, '#bfe6ff', 12, 0.12); strip(ctx, PILLAR, 4, (S.real >> 1) % 4, qp.x, floorY, z * 2.4, { comp: 'lighter', alpha: 0.85 }) }
    if (a >= 0) { glow(ctx, qp.x, floorY - 40 * z, 160 * z, BLUE, 1 - a / 12); if (a < 3) wash(ctx, W, H, '#dff2ff', calmFlash() ? 0.1 : 0.35, 'lighter') } })

  // 5) THE KIRIN
  if (k >= KR.kirinAt && k < KR.hitAt + 6) dragon(ctx, W, H, S, k, qp, floorY, z)
  if (kr >= 0 && k < KR.afterAt + 30) {
    const a = clamp(1 - kr / 60, 0, 1)
    glow(ctx, qp.x, floorY - 40 * z, 320 * z, BLUE, a); rings(ctx, qp.x, floorY - 20 * z, clamp(kr / 34, 0, 1), 700 * z, '#dff2ff', 3, 0.4, 10 * z)
    if (kr < 24) for (let i = 0; i < 10; i++) { const s = 400 + i * 13 + (kr >> 1), an = -Math.PI * (0.05 + 0.9 * i / 9); bolt(ctx, qp.x, floorY - 30 * z, qp.x + Math.cos(an) * W * 0.4, floorY - 30 * z + Math.sin(an) * H * 0.5, s, 2.5, '#bfe6ff', 10, 0.2) }
  }
  if (k >= KR.hitAt) { ctx.save(); ctx.globalAlpha = k < KR.total - 30 ? 1 : (KR.total - k) / 30; cracks(ctx, qp.x, floorY + 2, 300 * z, clamp((k - KR.hitAt) / 12, 0, 1), 57, 16, '#06080e', `rgba(${BLUE},0.6)`)
    ctx.fillStyle = 'rgba(4,6,10,0.75)'; ctx.beginPath(); ctx.ellipse(qp.x, floorY + 4, 110 * z, 16 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    if (k > KR.afterAt - 10) smoke(ctx, qp.x, floorY, z, S.real, clamp((k - KR.afterAt + 10) / 50, 0, 1)) }

  // 6) close-ups + impact frames
  if (k >= 6 && k < KR.katonAt) punchIn(ctx, canvas, W, H, sp.x, sp.y - 80 * z, 1 + 0.3 * smooth((k - 6) / 20))
  if (kr >= 0 && kr < 4) punchIn(ctx, canvas, W, H, qp.x, floorY - 60 * z, 1.45)
  if (kr >= 3 && kr < 11 && !calmFlash()) {
    const white = kr < 7, bg = white ? '#ffffff' : '#000818', fg = white ? '#000818' : '#9fd4ff'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, qp.x, floorY - 40 * z, 90, 71 + kr, fg, 0.9, false, kr)
    bolt(ctx, qp.x - dir * 30, -10, qp.x, floorY - 30 * z, 9 + kr, 18, fg, 10, 0.1)
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y, z * 1.3, -dir, { tint: fg, tintA: 1 })
    sprite(ctx, f, ['ssKirinRaiton', 'idle'], 3, sp.x, sp.y, z, dir, { tint: fg, tintA: 1 })
    ctx.restore()
  }
  damagePops(ctx, W, H, S, V, '#6ac0ff')
  ctx.restore()

  // 7) panels / titles
  if (k < KR.katonAt + 2) eyeBand(ctx, W, H, S, k)
  if (k >= 6 && k < KR.katonAt + 2) kanjiTitle(ctx, W, H, '写輪眼', 'SHARINGAN', (k - 6) / (KR.katonAt - 4), { side: -dir, fill: '#ffe6e6', stroke: '#3a0006', edge: '#ff4040' })
  if (k >= KR.katonAt + 4 && k < KR.stormAt) kanjiTitle(ctx, W, H, '豪龍火', 'KATON · GŌRYŪKA', (k - KR.katonAt - 4) / (KR.stormAt - KR.katonAt - 4), { side: dir, fill: '#fff0e0', stroke: '#300800', edge: '#ff7a30', fs: 0.12 })
  if (k >= KR.raiseAt && k < KR.afterAt) kanjiTitle(ctx, W, H, '麒麟', 'KIRIN', (k - KR.raiseAt) / (KR.afterAt - KR.raiseAt), { side: -dir, fill: '#e6f4ff', stroke: '#001a40', edge: '#6ac0ff', fs: 0.16 })

  letterbox(ctx, W, H, k, S.real, KR.total)
  subtitle(ctx, W, H, 'SASUKE', 'This lightning belongs to the heavens.', lineA(k, KR.stormAt, KR.raiseAt + 18), '#6ac0ff')
  subtitle(ctx, W, H, 'SASUKE', 'I merely guide it down — onto you.', lineA(k, KR.raiseAt + 18, KR.kirinAt), '#6ac0ff')
  subtitle(ctx, W, H, 'SASUKE', 'KIRIN!', lineA(k, KR.kirinAt, KR.hitAt), '#6ac0ff')
  return true
}

function drawSasuke(ctx, S, k, sp, z, f) {
  const dir = S.dir
  if (k < KR.katonAt) { sprite(ctx, f, ['idle'], (S.real >> 3) % 4, sp.x, sp.y, z, dir); return }
  if (k < KR.stormAt) { sprite(ctx, f, ['ssKirinCast', 'idle'], Math.min(2, (k - KR.katonAt) >> 3), sp.x, sp.y, z, dir); return }
  if (k < KR.raiseAt) { sprite(ctx, f, ['idle'], (S.real >> 3) % 4, sp.x, sp.y, z, dir); return }
  if (k < KR.diveAt) { sprite(ctx, f, ['ssKirinRaiton', 'idle'], (k >= KR.strikes[0] - 2 && k < KR.strikes[1] + 6) ? 3 : k < KR.raiseAt + 6 ? 0 : 1, sp.x, sp.y, z, dir); return }
  if (k < KR.afterAt + 10) { sprite(ctx, f, ['ssKirinRaiton', 'idle'], k < KR.diveAt + 4 ? 2 : 3, sp.x, sp.y, z, dir); return }
  sprite(ctx, f, ['win', 'idle'], Math.min(4, (k - KR.afterAt - 10) >> 3), sp.x, sp.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (S.blocked) { sprite(ctx, t, k < KR.strikes[0] - 2 ? ['idle'] : ['guard', 'idle'], 9, qp.x, qp.y, z, fdir); return }
  if (k < KR.strikes[0]) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, qp.x, qp.y, z, fdir); return }
  if (k < KR.hitAt) { const hr = S.nums?.some(n => S.real - n.real < 8), sh = hr && !calmMotion() ? (hash(S.real, 7) - 0.5) * 6 * z : 0
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x + sh, qp.y, z, fdir, hr ? { tint: '#bfe6ff', tintA: (S.real >> 1) % 2 ? 0.6 : 0.15 } : {}); return }
  if (k < KR.afterAt) { sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y, z, fdir, { tint: '#dff2ff', tintA: (S.real >> 1) % 2 ? 0.8 : 0.3 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
}

// ── the thunderhead ──
function clouds(ctx, W, H, real, a, k) {
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.45); g.addColorStop(0, '#05060c'); g.addColorStop(1, 'rgba(10,12,24,0)'); ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H * 0.45 + 20)
  for (let i = 0; i < 26; i++) { const x = ((hash(i, 1) * 1.3 - 0.15) * W + real * (0.3 + hash(i, 2) * 0.5)) % (W * 1.3) - W * 0.15, y = H * (0.04 + hash(i, 3) * 0.2), rx = W * (0.08 + hash(i, 4) * 0.1)
    ctx.fillStyle = i % 3 ? '#151826' : '#1e2236'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.45, 0, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
  // lightning crawling inside the cloud
  if (k >= KR.stormAt + 10 && !calmMotion()) for (let i = 0; i < 2; i++) { const s = (real >> 2) * 5 + i * 3; if (hash(s, 9) < 0.45) continue
    const x = hash(s, 1) * W, y = H * (0.06 + hash(s, 2) * 0.15); bolt(ctx, x, y, x + (hash(s, 3) - 0.5) * W * 0.3, y + hash(s, 4) * H * 0.1, s, 1.5, '#9fd4ff', 8, 0.25); glow(ctx, x, y, W * 0.1, BLUE, 0.35 * a) }
}
// ── the lightning dragon: its head flies a path out of the cloud, coils and dives; the body trails the head's history ──
function headAt(k, S, qp, floorY, W, H, z) {
  const u = (k - KR.kirinAt) / (KR.hitAt - KR.kirinAt), dir = S.dir
  if (u < 0.55) { const v = u / 0.55, cx = qp.x - dir * W * 0.12, cy = H * 0.24, r = W * 0.16
    const an = -Math.PI * 0.9 + v * Math.PI * 1.6; return { x: cx + Math.cos(an) * r * dir, y: cy + Math.sin(an) * r * 0.5 - (1 - v) * H * 0.18 } }
  const v = (u - 0.55) / 0.45, sx = qp.x - dir * W * 0.12 + Math.cos(Math.PI * 0.7) * W * 0.16 * dir, sy = H * 0.24 + Math.sin(Math.PI * 0.7) * W * 0.08
  return { x: sx + (qp.x - sx) * v * v, y: sy + (floorY - 50 * z - sy) * v * v }
}
function dragon(ctx, W, H, S, k, qp, floorY, z) {
  const pts = []
  for (let i = 0; i < 26; i++) { const kk = Math.max(KR.kirinAt - 12, Math.min(KR.hitAt, k) - i * 1.4); pts.push(kk < KR.kirinAt ? { x: qp.x - S.dir * W * 0.12, y: -40 } : headAt(kk, S, qp, floorY, W, H, z)) }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const [lw, al, col] of [[56, 0.18, '#3a8cff'], [30, 0.4, '#7fbfff'], [14, 0.8, '#cfeaff'], [5, 1, '#ffffff']]) {
    ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw * z * 0.9; ctx.beginPath()
    pts.forEach((p, i) => { const j = (hash(i, (S.real >> 1)) - 0.5) * 10 * z, w = 1 - i / pts.length; i ? ctx.lineTo(p.x + j, p.y + j * w) : ctx.moveTo(p.x, p.y) })
    ctx.stroke()
  }
  ctx.restore()
  // crackling side-arcs off the body
  for (let i = 2; i < pts.length; i += 4) { const p = pts[i], s = i * 7 + (S.real >> 1); bolt(ctx, p.x, p.y, p.x + (hash(s, 1) - 0.5) * 120 * z, p.y + (hash(s, 2) - 0.5) * 120 * z, s, 1.2 * z, '#9fd4ff', 6, 0.3) }
  // the head: jaws + a burning eye
  const h = pts[0], n = pts[2], an = Math.atan2(h.y - n.y, h.x - n.x), L = 70 * z
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(an); ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = 'rgba(160,215,255,0.85)'
  ctx.beginPath(); ctx.moveTo(-L * 0.3, -L * 0.35); ctx.lineTo(L, -L * 0.12); ctx.lineTo(L * 0.35, 0); ctx.lineTo(L * 0.9, L * 0.22); ctx.lineTo(-L * 0.3, L * 0.35); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * z; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(-L * 0.2, -L * 0.3); ctx.lineTo(-L * 0.8, -L * 0.75); ctx.moveTo(-L * 0.1, -L * 0.32); ctx.lineTo(-L * 0.5, -L * 0.85); ctx.stroke()   // horns
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(L * 0.25, -L * 0.14, 6 * z, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  glow(ctx, h.x, h.y, 140 * z, BLUE, 0.9)
  if (k >= KR.diveAt) speedLines(ctx, W, H, qp.x, floorY - 40 * z, 70, 29, '#dff2ff', 0.6, true, S.real)
}
function smoke(ctx, x, y, z, real, u) {
  ctx.save()
  for (let i = 0; i < 12; i++) { const ph = ((real * 0.7 + hash(i, 1) * 40) % 40) / 40, px = x + (hash(i, 2) - 0.5) * 140 * z + ph * 20 * z, py = y - ph * 120 * z, r = (14 + ph * 30) * z
    ctx.globalAlpha = (1 - ph) * 0.45 * (1 - u * 0.5); ctx.fillStyle = '#5a5e68'; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function eyeBand(ctx, W, H, S, k) {
  const a = Math.min(clamp(S.real / 6, 0, 1), clamp((KR.katonAt + 2 - k) / 6, 0, 1)); if (a <= 0) return
  const bh = H * 0.24 * outE(clamp(S.real / 8, 0, 1)), y = H * 0.42
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#07030a'; ctx.fillRect(0, y - bh / 2, W, bh); ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip()
  const ex = W * (S.dir > 0 ? 0.6 : 0.4), r = bh * 0.32, open = smooth((k - 4) / 12)
  ctx.fillStyle = '#f2ece4'; ctx.beginPath(); ctx.ellipse(ex, y, r * 2.7, r * 1.05 * open + 1, 0, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.clip()
  ctx.fillStyle = '#c0101a'; ctx.beginPath(); ctx.arc(ex, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#300004'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.beginPath(); ctx.arc(ex, y, r * 0.6, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#120002'; ctx.beginPath(); ctx.arc(ex, y, r * 0.22, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 3; i++) { const an = S.real * 0.2 + i * Math.PI * 2 / 3, tx = ex + Math.cos(an) * r * 0.6, ty = y + Math.sin(an) * r * 0.6
    ctx.beginPath(); ctx.arc(tx, ty, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(an + 1.2) * r * 0.3, ty + Math.sin(an + 1.2) * r * 0.3, tx + Math.cos(an + 2) * r * 0.32, ty + Math.sin(an + 2) * r * 0.32); ctx.lineWidth = r * 0.07; ctx.stroke() }
  ctx.restore()
  ctx.strokeStyle = '#1a0a0a'; ctx.lineWidth = Math.max(3, r * 0.1); ctx.beginPath(); ctx.ellipse(ex, y, r * 2.7, r * 1.05 * open + 1, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}
