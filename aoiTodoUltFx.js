// aoiTodoUltFx.js — RENDER-ONLY half of Aoi Todo's BOOGIE WOOGIE — BROTHERS' BLACK FLASH (aoiTodoUlt.js). One screen pass
// (cineRegistry overlay, identity transform) owning the picture while the cinematic runs: world → screen from camera.js's live
// transform; Todo from his real sheets (todoClap / heavy / todoCombo2 / todoCombo3 / win), the Yuji + Gojo cameos from THEIR
// real sheets (the same art the legacy cameos used), the foe from theirs. Signature looks: the clap (shock ring + "CLAP!"),
// the blue swap streak between two blinking bodies, the BROTHERS split-screen, and a black/red Black Flash impact frame.
// Pure functions of the scene's frames; noise = integer hash. Reduce Flashing → no white frames; Reduce Motion → no jitter.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  debris, damageNumber, calmMotion, calmFlash } from './bleachUltKit.js'

export const CAMEO = {
  yujiIdle:  { sheet: './yuji_idle_uniform.png', frames: 4, width: 37, height: 53, s: 2.16 },
  yujiPunch: { sheet: './yuji_super_foward_attack_uniform.png', frames: 7, width: 58, height: 56, s: 2.16 },
  gojoIdle:  { sheet: './gojo_idle_sheet.png', frames: 4, width: 28, height: 64, s: 1.8 },
  gojoKick:  { sheet: './gojo_heavy_sheet.png', frames: 5, width: 55, height: 59, s: 1.8 },
}
const SWAP = '120,200,255', RED = '255,30,40'
let _sc = null
function scratch(W, H) { if (!_sc) { const cv = document.createElement('canvas'); _sc = { cv, g: cv.getContext('2d') } }
  if (_sc.cv.width !== W || _sc.cv.height !== H) { _sc.cv.width = W; _sc.cv.height = H } return _sc }

function tFrame(S, k, B) {
  const claps = [B.clap1, B.clap2, B.clap3, ...B.rapid]
  const near = claps.find(c => k >= c - 6 && k < c + 4)
  if (k < B.clap1 - 10) return { keys: ['todoClap', 'guard'], fr: Math.min(1, k >> 4) }
  if (near != null) return { keys: ['todoClap', 'guard'], fr: k < near ? 2 : 3 }
  if (k >= B.todoHit - 4 && k < B.todoHit + 10) return { keys: ['heavy'], fr: k < B.todoHit ? 1 : 2 }
  if (k >= B.roundHit - 6 && k < B.roundHit + 12) return { keys: ['todoCombo3'], fr: k < B.roundHit ? 0 : 1 }
  if (k >= B.brosAt && k < B.bfAt - 4) return { keys: ['heavy'], fr: 0 }
  if (k >= B.bfAt - 4 && k < B.afterAt + 6) return { keys: ['heavy'], fr: 2 }
  if (k >= B.calmAt - 20) return { keys: ['win'], fr: Math.min(3, Math.floor((k - B.calmAt + 20) / 9)) }
  return { keys: ['todoClap', 'guard'], fr: 4 }
}

export function drawAoiTodoUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, P = S.P
  if (!P) return false
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.bfReal != null ? S.real - S.bfReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 22 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 22 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y
  const yp = P.Y != null ? V.p(P.Y, S.floor) : null, gp = P.G != null ? V.p(P.G, S.floor) : null
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) mood: a warm push-in on the clap, slow-mo grey for the brothers, red for the Black Flash
  if (k < B.clap1) wash(ctx, W, H, '#000000', 0.3 * smooth(S.real / 14))
  const slowA = k >= B.slowAt && k < B.bfAt ? smooth((k - B.slowAt) / 10) : 0
  desat(ctx, W, H, 0.8 * slowA)
  if (pr >= 0 && k < B.calmAt) wash(ctx, W, H, '#3a0008', 0.4 * clamp(1 - (k - B.bfAt) / 40, 0, 1), 'multiply')

  // 2) cameos (they "arrive" with a swap flash), the foe, Todo
  const arrive = (x, y, at) => { const u = (k - at) / 10; if (u >= 0 && u < 1) { glow(ctx, x, y - 60 * z, 120 * z, SWAP, (1 - u) * 0.8); pillar(ctx, x, y, z, 1 - u) } }
  if (yp) {
    const hitting = (k >= B.yujiHit - 4 && k < B.yujiHit + 10) || (k >= B.bfAt - 4 && k < B.afterAt + 6)
    const winding = k >= B.slowAt && k < B.bfAt - 4
    const a = k >= B.calmAt ? clamp(1 - (k - B.calmAt) / 16, 0, 1) : 1
    if (winding || (k >= B.bfAt - 4 && k < B.afterAt + 6)) glow(ctx, yp.x, yp.y - 60 * z, 110 * z, RED, 0.5)
    sprite(ctx, null, hitting || winding ? CAMEO.yujiPunch : CAMEO.yujiIdle, hitting ? 4 : winding ? Math.min(3, (k - B.slowAt) >> 3) : (S.real >> 3) % 4, yp.x, yp.y, z, P.Yf, { raw: true, s: CAMEO.yujiIdle.s, frame: true, alpha: a })
    arrive(yp.x, yp.y, k < B.clap2 ? 30 : B.brosAt)
  }
  if (gp) {
    const kicking = k >= B.gojoHit - 6 && k < B.gojoHit + 10
    sprite(ctx, null, kicking ? CAMEO.gojoKick : CAMEO.gojoIdle, kicking ? (k < B.gojoHit ? 1 : 3) : (S.real >> 3) % 4, gp.x, gp.y, z, P.Gf, { raw: true, s: CAMEO.gojoIdle.s, frame: true })
    arrive(gp.x, gp.y, 54)
  }
  drawFoe(ctx, S, V, k, tp, B, pr)
  if (k >= B.brosAt && k < B.afterAt + 6) glow(ctx, fp.x, fp.y - 70 * z, 120 * z, RED, 0.4 + 0.2 * slowA)
  { const { keys, fr } = tFrame(S, k, B); sprite(ctx, f, keys, fr, fp.x, fp.y, z, P.Tf, { frame: true }) }

  // 3) every clap: the shock ring off his palms, a SWAP streak + flash on both bodies
  for (const sr of S.swaps) {
    const u = (S.real - sr) / 14; if (u < 0 || u >= 1) continue
    const hx = fp.x + P.Tf * 6 * z, hy = fp.y - 112 * z
    rings(ctx, hx, hy, u, 2, 160 * z, '#bfe6ff', 6 * z, 1)
    star(ctx, hx, hy, 50 * z * (1 - u), 1 - u, u * 2, '#ffffff')
    pillar(ctx, fp.x, floorY, z, 1 - u); pillar(ctx, tp.x, V.p(0, S.tFloor).y, z, 1 - u)
    streak(ctx, fp.x, fp.y - 60 * z, tp.x, tp.y - 60 * z, z, 1 - u)
    if (u < 0.6) clapWord(ctx, hx, hy - 40 * z, z, u)
  }
  // hits
  for (const [at, x, y] of [[B.yujiHit, tp.x, tp.y - 64 * z], [B.gojoHit, tp.x, tp.y - 70 * z], [B.todoHit, tp.x, tp.y - 64 * z], [B.roundHit, tp.x, tp.y - 80 * z]]) {
    const kk = k - at; if (kk >= 0 && kk < 12) { star(ctx, x, y, (100 - kk * 6) * z, 1 - kk / 12, kk * 0.2, '#fff6d8'); glow(ctx, x, y, 90 * z, '255,220,150', (1 - kk / 12) * 0.7) }
  }
  if (k >= B.rapid[0] && k < B.roundHit) speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 40, 61, '#bfe6ff', 0.25, true, S.real)
  // the Black Flash: black lightning, shock rings, debris on the landing
  if (pr >= 0 && pr < 50) {
    const hx = tp.x, hy = tp.y - 64 * z
    glow(ctx, hx, hy, (140 + pr * 8) * z, RED, (1 - pr / 50) * 0.9)
    blackLightning(ctx, hx, hy, 260 * z, 14, 70 + ((pr >> 2) & 3), clamp(1 - (pr - 18) / 30, 0, 1), z)
    rings(ctx, hx, hy, pr / 50, 4, W * 0.7, '#ff3a4a', 12 * z, 0.7)
  }
  const kl = k - (B.afterAt + 8)
  if (kl >= 0 && kl < 60) { rings(ctx, tp.x, floorY, kl / 60, 3, 380 * z, '#d8c0a0', 8 * z, 0.22); debris(ctx, tp.x, floorY, kl, 26, Math.max(1, z), 23, '#5a4a3a', 360, 18) }

  // 4) close-ups
  if (k < B.clap1) punchIn(ctx, canvas, W, H, fp.x, fp.y - 100 * z, 1 + 0.45 * smooth((k - 4) / 30))
  if (k >= B.bfAt - 14 && k < B.bfAt) speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 80, 37, '#000000', 0.5, true, S.real)
  if (k >= B.slowAt && k < B.bfAt - 14 && yp) brothers(ctx, canvas, W, H, fp, yp, z, (k - B.slowAt) / (B.bfAt - 14 - B.slowAt), S.dir)

  // 5) the impact frames
  if (pr >= 0 && pr < 3 && !calmFlash()) impact(ctx, W, H, S, V, fp, tp, yp, k, B, '#ffffff', '#000000', '#000000', pr)
  else if (pr >= 3 && pr < 12) impact(ctx, W, H, S, V, fp, tp, yp, k, B, calmFlash() ? '#160004' : '#000000', '#ff1a2e', '#ffffff', pr)
  ctx.restore()

  // 6) titles, calligraphy, the score
  if (k >= B.clap1 + 2 && k < B.clap3) title(ctx, W, H, 'BOOGIE WOOGIE', 'AOI TODO  ·  CURSED TECHNIQUE', (k - B.clap1 - 2) / (B.clap3 - B.clap1 - 2),
    { y: 0.22, fs: 0.12, band: 'rgba(6,14,28,0.92)', edge: '#7fd0ff', fill: '#ffffff', stroke: '#1a5a9a', kanji: '不義遊戯', kanjiCol: '#bfe6ff' })
  if (k >= B.clap1 + 4 && k < B.rapid[0]) calligraphy(ctx, W, H, '不義遊戯', (k - B.clap1 - 4) / (B.rapid[0] - B.clap1 - 4), { x: S.dir > 0 ? 0.9 : 0.1, y: 0.2, size: 0.1, col: '#e8f6ff', edge: '#0a2a4a', glow: 'rgba(120,200,255,0.8)' })
  if (k >= B.rapid[0] && k < B.brosAt) hype(ctx, W, H, (k - B.rapid[0]) / (B.brosAt - B.rapid[0]))
  if (k >= B.brosAt + 4 && k < B.bfAt) calligraphy(ctx, W, H, '親友', (k - B.brosAt - 4) / (B.bfAt - B.brosAt - 4), { x: 0.5, y: 0.16, size: 0.12, col: '#ffffff', edge: '#7a0010', glow: 'rgba(255,40,60,0.8)' })
  if (pr >= 8 && k < B.afterAt + 22) title(ctx, W, H, 'BLACK FLASH', 'BROTHERS  ·  黒閃', clamp((k - B.bfAt) / (B.afterAt + 22 - B.bfAt), 0, 1),
    { y: 0.76, fs: 0.13, band: 'rgba(6,0,2,0.92)', edge: '#ff2a3a', fill: '#ffffff', stroke: '#c0001a', kanji: '黒閃', kanjiCol: '#ff3040' })
  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.18, pr - 10, '#ff3a4a')
  else if (S.lastHitK != null && k < B.brosAt && k - S.lastHitK < 30) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.24, k - S.lastHitK, '#ffd27a')

  // 7) letterbox + subtitles
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.clap1, 'TODO', 'Can you keep up with my fight?!', '#7fd0ff')
  sub(ctx, W, H, k, B.rapid[0], B.brosAt - 4, 'TODO', '120%!', '#7fd0ff')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'TODO', "I'll lead the way to victory.", '#7fd0ff')
  return true
}

function drawFoe(ctx, S, V, k, tp, B, pr) {
  const t = S.target, z = V.z, P = S.P
  if (S.blocked && k >= B.yujiHit) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, P.Ff); return }
  if (k < B.yujiHit) { sprite(ctx, t, k >= B.clap1 ? ['hurt', 'idle'] : ['idle'], k >= B.clap1 ? 0 : (S.real >> 3) % 4, tp.x, tp.y, z, P.Ff); return }
  if (pr >= 0) {
    const landed = (S.ty || 0) <= 0 && k > B.afterAt
    sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], landed ? 2 : 9, tp.x, tp.y, z, P.Ff, { rot: landed ? 0 : (k - B.bfAt) * 0.12, anchor: landed ? undefined : 'centre', tint: pr < 4 ? '#ffffff' : null, tintA: 0.8 })
    return
  }
  const recent = [B.yujiHit, B.gojoHit, B.todoHit, B.roundHit].some(a => k - a >= 0 && k - a < 5)
  sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, P.Ff, { sx: recent ? 0.88 : 1, sy: recent ? 1.06 : 1, rot: (S.ty || 0) > 2 ? 0.3 * P.Ff : 0 })
}
function pillar(ctx, x, y, z, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const w = 46 * z, g = ctx.createLinearGradient(x - w, 0, x + w, 0)
  g.addColorStop(0, `rgba(${SWAP},0)`); g.addColorStop(0.5, `rgba(220,240,255,${(0.75 * a).toFixed(3)})`); g.addColorStop(1, `rgba(${SWAP},0)`)
  ctx.fillStyle = g; ctx.fillRect(x - w, y - 260 * z, w * 2, 260 * z); ctx.restore()
}
function streak(ctx, x0, y0, x1, y1, z, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 70 * z
  for (const [lw, col] of [[14 * z, `rgba(${SWAP},${(0.4 * a).toFixed(3)})`], [4 * z, `rgba(240,250,255,${(0.9 * a).toFixed(3)})`]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x1, y1 + 20 * z); ctx.quadraticCurveTo(mx, my + 140 * z, x0, y0 + 20 * z); ctx.stroke()
  }
  ctx.restore()
}
function clapWord(ctx, x, y, z, u) {
  const fs = Math.round((34 + 20 * (1 - u)) * Math.max(0.8, z))
  ctx.save(); ctx.globalAlpha = clamp(1 - u * 1.6, 0, 1); ctx.translate(x, y - u * 30 * z); ctx.rotate(-0.12)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.22; ctx.strokeStyle = '#0a2a4a'; ctx.strokeText('CLAP!', 0, 0); ctx.fillStyle = '#ffffff'; ctx.fillText('CLAP!', 0, 0)
  ctx.restore()
}
function hype(ctx, W, H, u) {
  const a = Math.min(clamp(u / 0.1, 0, 1), clamp((1 - u) / 0.15, 0, 1)), fs = Math.round(H * 0.13 * (1 + 0.04 * Math.sin(u * 40)))
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * 0.5, H * 0.24); ctx.rotate(-0.06)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#0a2a4a'; ctx.strokeText('120%', 0, 0); ctx.fillStyle = '#ffe14d'; ctx.fillText('120%', 0, 0)
  ctx.restore()
}
// BROTHERS: a diagonal split-screen of two close-ups — Todo on one side, Yuji on the other — re-blit from the finished frame
function brothers(ctx, canvas, W, H, fp, yp, z, u, dir) {
  const Sx = scratch(W, H); Sx.g.setTransform(1, 0, 0, 1, 0, 0); Sx.g.clearRect(0, 0, W, H); Sx.g.drawImage(canvas, 0, 0)
  const inU = outE(clamp(u / 0.2, 0, 1)), outU = clamp((u - 0.85) / 0.15, 0, 1), a = inU * (1 - outU)
  if (a <= 0) return
  const zoom = 2.7, cw = W / zoom, ch = H / zoom
  const panel = (cx, cy, side) => {
    ctx.save(); ctx.globalAlpha = a; ctx.beginPath()
    const off = (1 - inU) * W * 0.5 * side
    if (side < 0) { ctx.moveTo(off, 0); ctx.lineTo(W * 0.56 + off, 0); ctx.lineTo(W * 0.44 + off, H); ctx.lineTo(off, H) }
    else { ctx.moveTo(W * 0.56 + off, 0); ctx.lineTo(W + off, 0); ctx.lineTo(W + off, H); ctx.lineTo(W * 0.44 + off, H) }
    ctx.closePath(); ctx.clip()
    ctx.imageSmoothingEnabled = false
    const sx = clamp(cx - cw / 2, 0, W - cw), sy = clamp(cy - ch / 2, 0, H - ch)
    ctx.drawImage(Sx.cv, sx, sy, cw, ch, off - (side < 0 ? W * 0.25 : -W * 0.25), 0, W, H)
    ctx.fillStyle = 'rgba(120,0,10,0.18)'; ctx.fillRect(-10, -10, W + 20, H + 20)
    ctx.restore()
  }
  const left = dir > 0 ? fp : yp, right = dir > 0 ? yp : fp
  panel(left.x - 22 * z, left.y - 80 * z, -1); panel(right.x + 22 * z, right.y - 80 * z, 1)
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W * 0.56, 0); ctx.lineTo(W * 0.44, H); ctx.stroke()
  ctx.strokeStyle = '#ff2a3a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore()
  const lab = (txt, x, y) => { ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(H * 0.05)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(txt, x, y); ctx.fillStyle = '#ffffff'; ctx.fillText(txt, x, y); ctx.restore() }
  lab(dir > 0 ? 'TODO' : 'YUJI', W * 0.2, H * 0.82); lab(dir > 0 ? 'YUJI' : 'TODO', W * 0.8, H * 0.82)
}
function blackLightning(ctx, x, y, R, n, seed, a, z) {
  if (a <= 0) return
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed) * Math.PI * 2, len = R * (0.4 + 0.6 * hash(i, seed + 1)), segs = 7
    ctx.beginPath(); ctx.moveTo(x, y)
    for (let s = 1; s <= segs; s++) { const u = s / segs, d = len * u, off = (hash(i * 13 + s, seed + 3) - 0.5) * R * 0.25; ctx.lineTo(x + Math.cos(ang) * d - Math.sin(ang) * off, y + Math.sin(ang) * d + Math.cos(ang) * off) }
    ctx.globalAlpha = a
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${RED},0.55)`; ctx.lineWidth = Math.max(5, 12 * z); ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#050003'; ctx.lineWidth = Math.max(2.5, 5 * z); ctx.stroke()
  }
  ctx.restore()
}
function impact(ctx, W, H, S, V, fp, tp, yp, k, B, bg, fg, sil, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 90, 80 + pr, fg, 0.9, false, pr)
  sprite(ctx, S.caster, ['heavy'], 2, fp.x, fp.y, z, S.P.Tf, { frame: true, tint: sil, tintA: 1 })
  if (yp) sprite(ctx, null, CAMEO.yujiPunch, 4, yp.x, yp.y, z, S.P.Yf, { raw: true, s: CAMEO.yujiPunch.s, frame: true, tint: sil, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, S.P.Ff, { tint: sil, tintA: 1, sx: 0.85, sy: 1.06 })
  if (bg !== '#ffffff') blackLightning(ctx, tp.x, tp.y - 64 * z, 320 * z, 16, 90 + pr, 1, z * 1.3)
  ctx.restore()
}
