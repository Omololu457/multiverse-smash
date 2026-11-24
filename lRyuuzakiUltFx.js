// lRyuuzakiUltFx.js — RENDER half of lRyuuzakiUlt.js (L's THE FINAL DEDUCTION). Reads lUltScene(); never writes sim state.
// One screen-space pass (cineRegistry.registerCineScreen): the finished world frame re-drawn as a push-in and graded
// (cold monochrome while he thinks, colour bleeding back for the fight, gold on the checkmate); a WORLD layer with the
// camera matrix × the push-in — L himself from his own sheets (engine sprite hidden), dash after-images, kick arcs, the
// chessboard floor, sparks; then the SCREEN layer — case files slammed onto the glass with red string to the suspect,
// the probability counter, the GUILTY stamp, his thumb-to-lip close-up, impact frames, the toppling king, captions,
// damage, letterbox + title cut-in. Shares the drawing kit in lightUltFx.js (same universe). Render-only noise = hash.
import { registerCineScreen } from './cineRegistry.js'
import { lUltScene, L_CINE, lAt } from './lRyuuzakiUlt.js'
import { image, ready, hash, clamp, ease, easeO, seg, blitAnim, worldXf, pushIn, card, letterbox, impactFrame, speedLines, vignette, titleCut, subtitle, drawPops, mat } from './lightUltFx.js'

const AX = {
  idleSeated: [0.56, 0.62, 0.62, 0.61, 0.57, 0.61, 0.62, 0.57, 0.58, 0.58, 0.58, 0.57, 0.58, 0.58], lRyuuzakiRyukCast: [0.43, 0.3, 0.3, 0.3, 0.43],
  dash: [0.68, 0.65, 0.67, 0.64, 0.67, 0.65, 0.65, 0.62, 0.64, 0.71], lRyuuzakiCmd1: [0.52, 0.59, 0.37, 0.47, 0.44], lRyuuzakiCmd2: [0.37, 0.41, 0.26, 0.6],
  lRyuuzakiCmd3: [0.5, 0.54, 0.54, 0.72, 0.59, 0.64, 0.59], lRyuuzakiKickTrail: [0.48, 0.45, 0.36, 0.16, 0.24, 0.15, 0.49, 0.5], lRyuuzakiNovaCast: [0.47, 0.39, 0.34, 0.46],
}
const axOf = key => AX[key] ? (i => AX[key][i] ?? 0.5) : 0.55
const body = (c, f, key, fi, x, feetY, d, o = {}) => blitAnim(c, f, key, fi, x, feetY, d, { ax: axOf(key), ...o })
const FILES = [
  { h: 'CASE FILE 01', l: 'SUSPECT: %N', x: 0.15, y: 0.3, r: -0.08 },
  { h: 'SURVEILLANCE · CAM 64', l: 'NO REACTION TO THE BROADCAST', x: 0.83, y: 0.27, r: 0.07 },
  { h: 'TIME OF DEATH', l: 'EXACTLY 40 SECONDS', x: 0.2, y: 0.56, r: 0.05 },
  { h: 'HANDWRITING', l: 'MATCH — 3 OF 3 SAMPLES', x: 0.8, y: 0.55, r: -0.06 },
  { h: 'ALIBI', l: 'FABRICATED', x: 0.37, y: 0.24, r: 0.04 },
  { h: 'MOTIVE', l: '“JUSTICE”', x: 0.63, y: 0.66, r: -0.05 },
  { h: 'LIES TOLD', l: 'TOO PERFECT TO BE TRUE', x: 0.36, y: 0.7, r: 0.07 },
]
const view = { z: 1, x: 0, y: 0, last: -1 }
if (typeof Image !== 'undefined') for (const u of ['./l_ryuuzaki_idle_seated_uniform.png', './l_ryuuzaki_taunt_uniform.png', './l_ryuuzaki_dash_uniform.png', './l_ryuuzaki_cmd1_uniform.png', './l_ryuuzaki_cmd2_uniform.png', './l_ryuuzaki_cmd3_uniform.png', './l_ryuuzaki_kicktrail_uniform.png', './l_ryuuzaki_nova_uniform.png', './l_ryuuzaki_portrait.png']) image(u)

// L's pose at script frame k → [animation key, frame]
function poseAt(k) {
  const L = L_CINE
  if (k < L.stand) return ['idleSeated', (k >> 3) % 14]
  if (k < L.dash) return ['lRyuuzakiRyukCast', Math.min(4, ((k - L.stand) / 3) | 0) === 4 ? 3 : Math.min(3, ((k - L.stand) / 3) | 0)]
  if (k < L.arrive) return ['dash', Math.min(9, k - L.dash)]
  if (k < L.crescent - 5) return ['lRyuuzakiCmd1', Math.min(4, ((k - L.arrive) / 2.4) | 0)]
  if (k < L.flurry[0] - 6) return ['lRyuuzakiCmd2', Math.min(3, ((k - (L.crescent - 5)) / 2.5) | 0)]
  if (k < L.flurry[0]) return ['lRyuuzakiKickTrail', Math.min(2, ((k - (L.flurry[0] - 6)) / 2) | 0)]
  if (k < L.flurry[4] + 4) return ['lRyuuzakiKickTrail', 3 + (((k - L.flurry[0]) / 1.5) | 0) % 3]
  if (k < L.fin0) return ['lRyuuzakiCmd3', Math.min(6, ((k - (L.flurry[4] + 4)) / 2.6) | 0)]
  if (k < L.finisher) return ['lRyuuzakiNovaCast', k < L.finisher - 8 ? 0 : 1]
  if (k < L.finisher + 30) return ['lRyuuzakiNovaCast', k < L.finisher + 6 ? 2 : 3]
  if (k < L.total - 30) return ['idle', (k >> 3) % 24]
  return ['idleSeated', 6 + ((k >> 3) & 1)]
}
const probAt = k => {
  const L = L_CINE
  if (k < L.files[0]) return 0
  if (k >= L.guilty) return k >= L.land ? 100 : 99
  let i = 0; while (i + 1 < L.files.length && k >= L.files[i + 1]) i++
  const from = L.prob[i], u = seg(k, L.files[i], L.files[i] + 6)
  return Math.round(from * u + (i ? L.prob[i - 1] : 0) * (1 - u))
}

function draw(ctx, canvas) {
  const sc = lUltScene()
  if (!sc) { view.last = -1; return false }
  const L = L_CINE, W = canvas.width, H = canvas.height, u = H / 720
  const f = sc.caster, t = sc.target, k = sc.k, real = sc.real, d = sc.d
  const XF = worldXf(canvas), sp = (x, y) => XF.transformPoint({ x, y })
  const fx = (f.x || 0) + (f.w || 48) / 2, ff = (f.y || 0) + (f.h || 94)
  const tx = (t.x || 0) + (t.w || 48) / 2, tcy = (t.y || 0) + (t.h || 94) * 0.45
  const la = sc.last ? real - sc.last.real : 99, pow = sc.last?.power || 0
  // ── push-in + grade ──
  let Z, foc
  if (k < L.title) { Z = 1 + 0.08 * ease(k / L.title); foc = sp(fx, ff - 50) }
  else if (k < L.stand) { Z = 1.1 + 0.2 * ease(seg(k, L.title, L.stand)); foc = sp(fx * 0.7 + tx * 0.3, ff - 60) }
  else if (k < L.dash) { Z = 1.15; foc = sp((fx + tx) / 2, ff - 60) }
  else if (k < L.fin0) { Z = 1.2; foc = sp((fx + tx) / 2, Math.min(ff, tcy + 40) - 40) }
  else if (k < L.finisher) { Z = 1.2 + 0.4 * ease(seg(k, L.fin0, L.finisher)); foc = sp((fx + tx) / 2, ff - 60) }
  else { Z = 1.5 - 0.5 * easeO(seg(k, L.finisher, L.finisher + 22)); foc = sp((fx + tx) / 2, ff - 80) }
  if (la >= 0 && la < 6) Z += 0.2 * pow * (1 - la / 6)
  if (view.last < 0) { view.z = Z; view.x = foc.x; view.y = foc.y } else { view.z += (Z - view.z) * 0.25; view.x += (foc.x - view.x) * 0.2; view.y += (foc.y - view.y) * 0.2 }
  view.last = real
  const think = 1 - ease(seg(k, L.dash - 6, L.arrive + 6)), gold = seg(k, L.fin0, L.finisher) * (1 - seg(k, L.finisher + 30, L.total))
  const grade = `grayscale(${(0.9 * ease(k / 16) * think + 0.35 * (1 - think)).toFixed(3)}) brightness(${(1 - 0.35 * ease(k / 16) * think - 0.12 * (1 - think)).toFixed(3)}) contrast(1.08)`
  const P = pushIn(ctx, canvas, view.z, view.x, view.y, grade)
  const M = P.multiply(XF), S = (x, y) => M.transformPoint({ x, y })
  ctx.save()
  vignette(ctx, W, H, 'rgba(10,14,24,0.05)', `rgba(2,4,10,${0.55 + 0.25 * think})`)
  if (think > 0.01) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(150,175,215,${0.5 * think})`; ctx.fillRect(0, 0, W, H) }
  if (gold > 0.01) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,190,80,${0.5 * gold})`; ctx.fillRect(0, 0, W, H) }
  ctx.restore()
  // ── world layer ──
  ctx.save(); mat(ctx, M); world(ctx, sc, f, t, fx, ff, tx, tcy, k, real, d); ctx.restore()
  // ── screen layer ──
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  screen(ctx, W, H, u, sc, S, f, t, k, real, tx, tcy)
  const bar = letterbox(ctx, W, H, k, L.total, '#e8e8e8', u)
  titleCut(ctx, W, H, k, L.title, u, { band: 'rgba(8,10,14,0.93)', accent: '#f0f0f0', streak: 'rgba(255,255,255,0.35)', portrait: f.skinId && f.skinId !== 'default' ? `./l_ryuuzaki_portrait__${f.skinId}.png` : './l_ryuuzaki_portrait.png', title: 'THE FINAL DEDUCTION', sub: 'WORLD\'S GREATEST DETECTIVE', stroke: '#111111' })
  drawPops(ctx, M, sc.pops, real, u, '#ffe9a8')
  if (k >= L.total - 44 && sc.dealt > 0) card(ctx, `${Math.round(sc.dealt)} DMG${sc.guarded ? ' (GUARDED)' : ''}`, W * 0.84, bar + 40 * u, 28 * u, '#ffffff', clamp((k - L.total + 44) / 8, 0, 1) * clamp((L.total - k) / 10, 0, 1), -0.04, '#000000')
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(ctx, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  line(L.title, L.files[5], '“…and monsters who always tell lies.”')
  line(L.files[5], L.guilty, '“The probability keeps climbing. I can’t ignore it.”')
  line(L.guilty + 4, L.dash + 6, '“I’ve found you.”')
  line(L.land + 6, L.total - 6, '“I told you. I am justice.”')
  ctx.restore()
  return true
}

function world(c, sc, f, t, fx, ff, tx, tcy, k, real, d) {
  const L = L_CINE
  // the chessboard floor: squares race out from under them on the checkmate wind-up
  const cb = seg(k, L.fin0 - 4, L.fin0 + 10) * (1 - seg(k, L.land + 10, L.total - 10))
  if (cb > 0) {
    const floor = sc.floor, cx = (fx + tx) / 2, sq = 46, n = 14, spread = n * sq * easeO(seg(k, L.fin0 - 4, L.fin0 + 16))
    c.save(); c.globalAlpha = 0.55 * cb
    for (let i = -n; i < n; i++) for (let j = 0; j < 2; j++) {
      const x = cx + i * sq; if (Math.abs(x - cx) > spread) continue
      c.fillStyle = ((i + j) & 1) ? '#f4ecd6' : '#14110c'; c.fillRect(x, floor - 2 + j * 10, sq, 10)
    }
    c.restore()
  }
  // dash after-images
  if (k >= L.dash && k < L.arrive + 6) for (let i = 3; i >= 1; i--) { const kk = k - i * 2; if (kk < L.dash) continue
    const p = lAt(kk); body(c, f, 'dash', Math.min(9, kk - L.dash), p.x, sc.floor, d, { alpha: 0.18 * (4 - i), tint: '#9fb8ff', tintA: 0.7 }) }
  // L
  const [key, fi] = poseAt(k)
  if (k >= L.fin0 && k < L.finisher + 10) { const g = c.createRadialGradient(fx, ff - 50, 0, fx, ff - 50, 110); g.addColorStop(0, `rgba(255,210,110,${0.55 * seg(k, L.fin0, L.finisher)})`); g.addColorStop(1, 'rgba(255,180,60,0)'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(fx - 110, ff - 160, 220, 200); c.restore() }
  body(c, f, key, fi, fx, ff, d)
  // golden kick arcs + sparks at every contact
  const tag = sc.last?.tag, a = sc.last ? real - sc.last.real : 99
  if (a >= 0 && a < 16 && tag && tag !== 'guilty') {
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(tx, tcy)
    const R = { sweep: 50, crescent: 64, flurry: 40, plunge: 70, finisher: 120 }[tag] || 50, al = 1 - a / 16
    const rot = { sweep: 0.9, crescent: -1.2, flurry: (sc.last.k * 0.7) % 6, plunge: 1.6, finisher: 0 }[tag] || 0
    c.rotate(d > 0 ? rot : Math.PI - rot)
    for (const [lw, aa, col] of [[16, 0.3, '#ffb030'], [6, 0.9, '#ffd060'], [2, 1, '#ffffff']]) { c.globalAlpha = al * aa; c.strokeStyle = col; c.lineWidth = lw * (tag === 'finisher' ? 2 : 1); c.beginPath(); c.arc(0, 0, R + a * 3, -1.3, 1.3 * Math.min(1, a / 3 + 0.3)); c.stroke() }
    c.rotate(-(d > 0 ? rot : Math.PI - rot))
    for (let i = 0; i < 16; i++) { const an = hash(i, sc.last.k) * Math.PI * 2, r = (8 + 90 * hash(i + 4, sc.last.k)) * easeO(a / 16) * (0.5 + pow(sc)); c.globalAlpha = al; c.fillStyle = i & 1 ? '#ffffff' : '#ffc040'; c.fillRect(Math.cos(an) * r - 2, Math.sin(an) * r - 2, 4, 4) }
    c.restore()
  }
  // the plunge / landing: ground dust rings
  for (const [at, x] of [[L.plunge, tx], [L.land, tx]]) { const e = real - (sc.last && sc.last.k === at ? sc.last.real : (k >= at ? real - (k - at) : -99)); if (e >= 0 && e < 24) { c.save(); c.globalAlpha = 0.7 * (1 - e / 24); c.strokeStyle = '#e8dcc0'; c.lineWidth = 5; c.beginPath(); c.ellipse(x, sc.tFloor, 20 + e * 7, 6 + e, 0, 0, Math.PI * 2); c.stroke(); c.restore() } }
}
const pow = sc => sc.last?.power || 0.5

function screen(c, W, H, u, sc, S, f, t, k, real, tx, tcy) {
  const L = L_CINE
  const tp = S(tx, tcy)
  const filesOut = 1 - seg(k, L.dash - 6, L.arrive)
  // CASE FILES slammed onto the glass, red string to the suspect
  FILES.forEach((F, i) => {
    const at = L.files[i], a = k - at; if (a < 0 || filesOut <= 0) return
    const x = W * F.x, y = H * F.y, z = a < 5 ? 1.5 - 0.5 * easeO(a / 5) : 1, al = Math.min(1, a / 2) * filesOut
    // string first (under the card)
    c.save(); c.globalAlpha = al * 0.9; c.strokeStyle = '#d0162a'; c.lineWidth = 2.5 * u
    const sag = 30 * u, mx = (x + tp.x) / 2, my = (y + tp.y) / 2 + sag
    const draw = clamp(a / 8, 0, 1)
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, x + (tp.x - x) * draw, y + (tp.y - y) * draw); c.stroke(); c.restore()
    c.save(); c.globalAlpha = al; c.translate(x, y); c.rotate(F.r); c.scale(z, z)
    const w = 230 * u, h = 112 * u
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(-w / 2 + 6 * u, -h / 2 + 7 * u, w, h)
    c.fillStyle = '#efe6cf'; c.fillRect(-w / 2, -h / 2, w, h)
    c.fillStyle = '#c9b98e'; c.fillRect(-w / 2, -h / 2, w, 22 * u)
    c.fillStyle = '#1c1a14'; c.font = `700 ${Math.round(13 * u)}px "Courier New", monospace`; c.textAlign = 'left'; c.textBaseline = 'middle'
    c.fillText(F.h, -w / 2 + 10 * u, -h / 2 + 11 * u)
    // photo block
    c.fillStyle = '#2a2a2a'; c.fillRect(-w / 2 + 10 * u, -h / 2 + 30 * u, 56 * u, 70 * u); c.fillStyle = '#6a6a6a'; c.beginPath(); c.arc(-w / 2 + 38 * u, -h / 2 + 55 * u, 13 * u, 0, Math.PI * 2); c.fill(); c.fillRect(-w / 2 + 18 * u, -h / 2 + 72 * u, 40 * u, 28 * u)
    c.fillStyle = '#1c1a14'; c.font = `700 ${Math.round(12 * u)}px "Courier New", monospace`
    const txt = F.l.replace('%N', sc.name), words = txt.split(' '); let ln = '', ly = -h / 2 + 42 * u
    for (const wd of words) { if (c.measureText(ln + wd).width > w - 90 * u) { c.fillText(ln, -w / 2 + 74 * u, ly); ln = ''; ly += 16 * u } ln += wd + ' ' }
    c.fillText(ln, -w / 2 + 74 * u, ly)
    for (let j = 0; j < 2; j++) { c.fillStyle = 'rgba(30,30,30,0.35)'; c.fillRect(-w / 2 + 74 * u, ly + (16 + j * 12) * u, (w - 90 * u) * (0.5 + 0.4 * hash(i, j)), 4 * u) }
    c.fillStyle = '#d0162a'; c.beginPath(); c.arc(0, -h / 2 + 2 * u, 6 * u, 0, Math.PI * 2); c.fill()          // the pin
    c.restore()
  })
  // the suspect ringed in red
  if (k >= L.files[0] && filesOut > 0) { const r = 70 * u + 6 * u * Math.sin(real / 6); c.save(); c.globalAlpha = 0.85 * filesOut; c.strokeStyle = '#d0162a'; c.lineWidth = 4 * u; c.beginPath(); c.ellipse(tp.x, tp.y, r, r * 1.25, 0.1, 0, Math.PI * 2); c.stroke(); c.restore() }
  // thumb-to-lip close-up: L's crouch in a tall panel, eyes on the suspect
  if (k >= L.files[1] - 4 && k < L.guilty + 4) {
    const a = seg(k, L.files[1] - 4, L.files[1] + 4) * (1 - seg(k, L.guilty, L.guilty + 4)), pw = 170 * u, ph = 230 * u, px = W - pw - 26 * u, py = H * 0.62 - ph / 2
    c.save(); c.globalAlpha = a; c.fillStyle = '#ffffff'; c.fillRect(px - 4 * u, py - 4 * u, pw + 8 * u, ph + 8 * u); c.fillStyle = '#0b0d12'; c.fillRect(px, py, pw, ph)
    c.beginPath(); c.rect(px, py, pw, ph); c.clip()
    body(c, f, 'idleSeated', (k >> 3) % 14, px + pw * 0.55, py + ph * 1.75, sc.d, { s: 3.4 })
    c.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 8; i++) c.fillRect(px, py + ((real * 2 + i * 31) % ph), pw, 1.5 * u)   // monitor scanlines
    c.restore()
  }
  // PROBABILITY counter
  if (k >= L.files[0] - 2 && k < L.dash + 10 || k >= L.land) {
    const v = probAt(k), a = k >= L.land ? seg(k, L.land, L.land + 8) * clamp((L.total - k) / 10, 0, 1) : seg(k, L.files[0] - 2, L.files[0] + 4) * (1 - seg(k, L.dash, L.dash + 10))
    const cy = H * 0.19, hot = v / 100
    card(c, 'PROBABILITY YOU ARE KIRA', W / 2, cy - 34 * u, 18 * u, '#d8d8d8', a, 0, '#000000')
    const pop = L.files.some(at => k - at >= 0 && k - at < 4) ? 1.15 : 1
    const col = `rgb(255,${Math.round(255 - 200 * hot)},${Math.round(255 - 215 * hot)})`
    card(c, `${v}%`, W / 2, cy + 14 * u, 64 * u * pop, col, a, 0, '#000000')
  }
  // 99 % — the GUILTY stamp
  const g = k - L.guilty
  if (g >= 0 && k < L.dash + 8) {
    const a = 1 - seg(k, L.dash, L.dash + 8), z = g < 5 ? 2.2 - 1.2 * easeO(g / 5) : 1
    if (g < 2) { c.globalAlpha = 0.6; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
    c.save(); c.globalAlpha = a; c.translate(W / 2, H * 0.47); c.rotate(-0.14); c.scale(z, z)
    c.strokeStyle = '#d0162a'; c.lineWidth = 8 * u; c.strokeRect(-200 * u, -56 * u, 400 * u, 112 * u); c.lineWidth = 3 * u; c.strokeRect(-188 * u, -44 * u, 376 * u, 88 * u)
    c.restore()
    card(c, 'GUILTY', W / 2, H * 0.47, 86 * u * z, '#d0162a', a, -0.14, '#2a0006')
  }
  // contact impact frames (small: tinted; plunge / finisher: inverted)
  const tag = sc.last?.tag, la = sc.last ? real - sc.last.real : -1
  if (la >= 0 && tag && tag !== 'guilty') {
    if (tag === 'finisher') impactFrame(c, W, H, la, 3, '#ffcc55', 0.4)
    else if (tag === 'plunge') impactFrame(c, W, H, la, 1, '#ffffff', 0.25)
    else if (la < 3) { c.globalAlpha = 0.25 * (1 - la / 3); c.fillStyle = '#fff2c0'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
    if (la < 10) speedLines(c, W, H, tp.x, tp.y, (tag === 'finisher' ? 0.55 : 0.25) * (1 - la / 10), sc.last.k, 44)
  }
  // flurry hit counter
  const hitsShown = sc.hits
  if (k >= L.sweep && k < L.finisher + 40 && hitsShown > 1) card(c, `${hitsShown} HITS`, W * 0.16, H * 0.3, 40 * u, '#ffe08a', clamp((L.finisher + 40 - k) / 10, 0, 1), -0.06, '#2a1800')
  // CHECKMATE: wind-up focus lines, then the king topples
  if (k >= L.fin0 && k < L.finisher) speedLines(c, W, H, tp.x, tp.y, 0.3 * seg(k, L.fin0, L.finisher), k, 56, '#ffd070')
  if (k >= L.finisher - 10) {
    const e = sc.last?.tag === 'finisher' ? real - sc.last.real : k - L.finisher, a = seg(k, L.finisher - 10, L.finisher - 4) * clamp((L.total - 8 - k) / 10, 0, 1)
    const fall = e < 4 ? 0 : easeO(seg(e, 4, 22)) * (Math.PI / 2) * 0.96, bx = W * 0.8, by = H * 0.74, s = 1.25 * u
    c.save(); c.globalAlpha = a * 0.9; c.translate(bx + 40 * s, by); c.rotate(-sc.d * 0 + fall); c.translate(-40 * s, 0)
    king(c, 40 * s, 0, s); c.restore()
    if (e >= 2) card(c, 'CHECKMATE.', W / 2, H * 0.34, 104 * u * (e < 7 ? 1.9 - 0.9 * easeO((e - 2) / 5) : 1), '#ffffff', clamp((L.total - 30 - k) / 10, 0, 1), -0.05, '#3a2400')
  }
}
// a Staunton king silhouette (base at 0,0, s = scale)
function king(c, x, y, s) {
  c.fillStyle = '#0b0b0b'; c.strokeStyle = '#f0e2b8'; c.lineWidth = 3 * s
  c.beginPath()
  c.moveTo(x - 46 * s, y); c.lineTo(x + 46 * s, y); c.lineTo(x + 40 * s, y - 16 * s); c.lineTo(x + 24 * s, y - 22 * s)
  c.quadraticCurveTo(x + 14 * s, y - 90 * s, x + 26 * s, y - 120 * s); c.lineTo(x + 14 * s, y - 132 * s); c.lineTo(x + 20 * s, y - 150 * s)
  c.lineTo(x + 6 * s, y - 158 * s); c.lineTo(x + 6 * s, y - 170 * s); c.lineTo(x + 16 * s, y - 170 * s); c.lineTo(x + 16 * s, y - 182 * s); c.lineTo(x + 6 * s, y - 182 * s)
  c.lineTo(x + 6 * s, y - 194 * s); c.lineTo(x - 6 * s, y - 194 * s); c.lineTo(x - 6 * s, y - 182 * s); c.lineTo(x - 16 * s, y - 182 * s); c.lineTo(x - 16 * s, y - 170 * s); c.lineTo(x - 6 * s, y - 170 * s)
  c.lineTo(x - 6 * s, y - 158 * s); c.lineTo(x - 20 * s, y - 150 * s); c.lineTo(x - 14 * s, y - 132 * s); c.lineTo(x - 26 * s, y - 120 * s)
  c.quadraticCurveTo(x - 14 * s, y - 90 * s, x - 24 * s, y - 22 * s); c.lineTo(x - 40 * s, y - 16 * s); c.closePath(); c.fill(); c.stroke()
}

registerCineScreen('l_ryuuzaki_ult', draw)
