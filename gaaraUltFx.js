// gaaraUltFx.js — RENDER-ONLY half of Gaara's SABAKU KYŪ · SABAKU SŌSŌ — DESERT GRAVEYARD cinematic (gaaraUlt.js).
// One screen pass: world→screen from camera.js; Gaara from his real ult cast / kneel strips, the foe from theirs; his own
// sand fx strips (ripples, giant hands, coffin dome, implosion, eruption) at real scale; the cut-in card; the gourd's sand
// stream (procedural grains); a sand-sea wash over the floor; titles, impact frames, letterbox.
// Pure functions of the scene's frames; noise = integer hash. Reduce Flashing / Reduce Motion respected.
import { GB, foeAt } from './gaaraUlt.js'
import { image, ready, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  strip, letterbox, subtitle, lineA, kanjiTitle, damagePops, glow, rings, wash, desat } from './narutoUltFxKit.js'

const CUTIN = './gaara_cutin_uniform.png', RIP = './gaara_fx_ripples_uniform.png', HANDS = './gaara_fx_hands_uniform.png'
const DOME = './gaara_fx_dome_uniform.png', COLL = './gaara_fx_collapse_uniform.png', BURST = './gaara_fx_burst_uniform.png'
const SAND = '214,190,140'

export function preloadGaaraUlt(f, t) {
  for (const s of [CUTIN, RIP, HANDS, DOME, COLL, BURST]) image(s)
  for (const k of ['idle', 'gaaraUltCast', 'gaaraUltKneel']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

export function drawGaaraUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const big = (S.nums || []).filter(n => n.big), cr = big[0] ? S.real - big[0].real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  const gp = V.p(S.fx0, S.floor), q = foeAt(S, k), qp = V.p(q.x, q.y), tp = V.p(S.tx0, S.tFloor)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grading: a dusty amber haze thickening as the desert takes the stage
  desat(ctx, W, H, k < GB.returnAt ? 0.55 * smooth(S.real / 30) : 0.55 * (1 - smooth((k - GB.returnAt) / 40)), '#5a3a10', 0.45)
  if (k >= GB.seaAt && k < GB.returnAt + 30) blowingSand(ctx, W, H, S, k)

  // 2) the sand sea over the floor + ripples racing out under the foe
  if (k >= GB.seaAt) sandSea(ctx, S, V, k, gp, tp, z, W)
  if (k >= GB.seaAt && k < GB.domeAt + 10) strip(ctx, RIP, 8, Math.min(7, (k - GB.seaAt) >> 2), tp.x, tp.y + 8 * z, 1.7 * z, { alpha: clamp(1 - (k - GB.domeAt) / 10, 0, 1) })

  // 3) the foe (sunk into the sand), then the hands / dome / collapse over them
  const covered = k >= GB.domeAt + 10 && k < GB.burstAt
  if (!covered) drawFoe(ctx, S, V, k, qp, q, z)
  if (k >= GB.handsAt && k < GB.domeAt + 6) strip(ctx, HANDS, 5, Math.min(4, (k - GB.handsAt) / 6 | 0), tp.x, tp.y + 6 * z, 1.7 * z, { alpha: clamp(1 - (k - GB.domeAt) / 6, 0, 1) })
  if (k >= GB.domeAt && k < GB.crushAt) {
    const fr = Math.min(3, (k - GB.domeAt) / 6 | 0), squeeze = k >= GB.clenchAt ? 1 - 0.08 * smooth((k - GB.clenchAt) / 20) : 1
    ctx.save(); ctx.translate(tp.x, tp.y + 6 * z); ctx.scale(squeeze, 1); strip(ctx, DOME, 4, fr, 0, 0, 1.6 * z); ctx.restore()
    if (k >= GB.clenchAt && !calmMotion()) { const sh = (hash(S.real, 5) - 0.5) * 4 * z * smooth((k - GB.clenchAt) / 20); ctx.save(); ctx.globalAlpha = 0.25; strip(ctx, DOME, 4, 3, tp.x + sh, tp.y + 6 * z, 1.6 * z); ctx.restore() }
  }
  if (k >= GB.crushAt && k < GB.burstAt + 4) strip(ctx, COLL, 4, Math.min(3, (k - GB.crushAt) / 6 | 0), tp.x, tp.y + 6 * z, 1.65 * z, { alpha: clamp(1 - (k - GB.burstAt) / 4, 0, 1) })
  if (k >= GB.burstAt - 2 && k < GB.burstAt + 24) strip(ctx, BURST, 3, Math.min(2, (k - GB.burstAt + 2) / 8 | 0), tp.x, tp.y + 6 * z, (1.8 + 0.7 * outE((k - GB.burstAt) / 20)) * z, { alpha: clamp(1 - (k - GB.burstAt - 12) / 12, 0, 1) })
  if (cr >= 0 && cr < 40) rings(ctx, tp.x, tp.y - 40 * z, cr / 40, 520 * z, '#f4e2b4', 3, 0.4, 10 * z)

  // 4) Gaara + the gourd's sand
  drawGaara(ctx, S, V, k, gp, z)
  if (k < GB.handsAt + 30 || k >= GB.returnAt) sandStream(ctx, S, V, k, gp, tp, z)

  // 5) punch-ins
  const hand = { x: gp.x + dir * 34 * z, y: gp.y - 62 * z }
  if (k < GB.seaAt) punchIn(ctx, canvas, W, H, gp.x, gp.y - 60 * z, 1 + 0.3 * smooth((k - 4) / 30))
  else if (k >= GB.clenchAt && k < GB.crushAt) punchIn(ctx, canvas, W, H, hand.x, hand.y, 1 + 0.5 * smooth((k - GB.clenchAt) / 16))
  else if (cr >= 0 && cr < 4) punchIn(ctx, canvas, W, H, tp.x, tp.y - 60 * z, 1.4)

  // 6) panels + titles
  if (k >= 6 && k < GB.seaAt + 4) cutinCard(ctx, W, H, S, k)
  if (k >= GB.domeAt + 4 && k < GB.crushAt) kanjiTitle(ctx, W, H, '砂縛柩', 'SABAKU KYŪ · SAND COFFIN', (k - GB.domeAt - 4) / (GB.crushAt - GB.domeAt - 4), { side: dir, fill: '#f6e8c8', stroke: '#3a2008', edge: '#d8b878' })
  if (k >= GB.clenchAt && k < GB.crushAt) fistInset(ctx, W, H, S, k)
  if (cr >= 9 && k < GB.burstAt + 30) sousou(ctx, W, H, cr, dir)

  // 7) impact frames on the crush
  if (cr >= 4 && cr < 11 && !calmFlash()) {
    const white = cr < 7, bg = white ? '#ffffff' : '#120800', fg = white ? '#120800' : '#f4e2b4'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 71 + cr, fg, 0.9, true, cr)
    ctx.translate(tp.x, tp.y); ctx.scale(1.4, 1.4); ctx.translate(-tp.x, -tp.y)
    strip(ctx, COLL, 4, 1, tp.x, tp.y + 6 * z, 1.4 * z, { tint: fg })
    ctx.restore()
  }
  damagePops(ctx, W, H, S, V, '#e8b860')
  ctx.restore()

  letterbox(ctx, W, H, k, S.real, GB.total)
  subtitle(ctx, W, H, 'GAARA', 'Sand Coffin.', lineA(k, GB.handsAt, GB.domeAt + 10), '#e8b860')
  subtitle(ctx, W, H, 'GAARA', 'Sand Waterfall Funeral.', lineA(k, GB.clenchAt, GB.crushAt + 2), '#e8b860')
  subtitle(ctx, W, H, 'GAARA', '…Stay down.', lineA(k, GB.landAt + 4, GB.total - 2), '#e8b860')
  return true
}

function drawGaara(ctx, S, V, k, gp, z) {
  const f = S.caster, dir = S.dir
  let keys = ['gaaraUltCast', 'idle'], fr
  if (k < GB.seaAt) fr = Math.min(4, k >> 3)
  else if (k < GB.handsAt) fr = 5 + ((k >> 3) % 2)
  else if (k < GB.clenchAt) fr = Math.min(10, 7 + ((k - GB.handsAt) >> 4))
  else if (k < GB.kneelAt) fr = k < GB.crushAt ? 10 : 9
  else if (k < GB.returnAt) { keys = ['gaaraUltKneel', 'idle']; fr = Math.min(6, (k - GB.kneelAt) >> 2) }
  else { keys = ['idle']; fr = (S.real >> 3) % 6 }
  glow(ctx, gp.x, gp.y - 50 * z, 90 * z, SAND, 0.25)
  sprite(ctx, f, keys, fr, gp.x, gp.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp, q, z) {
  const t = S.target, fdir = -S.dir
  if (k < GB.burstAt) {   // sinking: clip the sprite at the sand line
    const sink = q.sink || 0, sh = k >= GB.handsAt && !calmMotion() ? (hash(S.real, 9) - 0.5) * 4 * z : 0
    ctx.save(); ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, qp.y + 1e4 - 4 * z); ctx.clip()
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : k >= GB.handsAt ? ['hurt', 'idle'] : ['idle'], k >= GB.handsAt ? 0 : (S.real >> 3) % 4, qp.x + sh, qp.y + sink * 94 * z, z, fdir)
    ctx.restore(); return
  }
  if (k < GB.landAt && !S.blocked) { sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, fdir, { rot: (k - GB.burstAt) * 0.2 * S.dir, tint: '#d6be8c', tintA: 0.35 }); return }
  sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
}
function sandSea(ctx, S, V, k, gp, tp, z, W) {   // a sheet of sand spreading across the floor from Gaara to past the foe
  const u = outE((k - GB.seaAt) / 26), back = k >= GB.returnAt ? smooth((k - GB.returnAt) / 40) : 0
  const x0 = Math.min(gp.x, tp.x) - 140 * z, x1 = Math.max(gp.x, tp.x) + 160 * z, cx = (gp.x + tp.x) / 2
  const half = ((x1 - x0) / 2) * u * (1 - back)
  if (half <= 0) return
  ctx.save(); ctx.globalAlpha = 0.85
  const g = ctx.createLinearGradient(0, tp.y - 14 * z, 0, tp.y + 10 * z); g.addColorStop(0, '#e6cf9a'); g.addColorStop(1, '#a88a56')
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - half, tp.y + 8 * z)
  for (let i = 0; i <= 20; i++) { const x = cx - half + (i / 20) * half * 2, y = tp.y - (4 + 6 * Math.sin(i * 1.3 + k * 0.15)) * z * (1 - Math.abs(i / 10 - 1) * 0.6); ctx.lineTo(x, y) }
  ctx.lineTo(cx + half, tp.y + 8 * z); ctx.closePath(); ctx.fill(); ctx.restore(); void W
}
function sandStream(ctx, S, V, k, gp, tp, z) {   // grains pouring out of the gourd and coiling (or flowing back in at the end)
  const gourd = { x: gp.x - S.dir * 10 * z, y: gp.y - 70 * z }, back = k >= GB.returnAt
  const a = back ? clamp(1 - (k - GB.returnAt - 40) / 20, 0, 1) : (k < GB.handsAt ? 1 : clamp(1 - (k - GB.handsAt) / 30, 0, 1))
  if (a <= 0) return
  ctx.save(); ctx.fillStyle = '#e0c890'
  for (let i = 0; i < 70; i++) {
    let ph = ((S.real * 1.4 + hash(i, 1) * 50) % 50) / 50; if (back) ph = 1 - ph
    const ang = ph * Math.PI * 3 + hash(i, 2) * 0.8, r = (20 + ph * 70) * z, tx = back ? lerpN(tp.x, gourd.x, 1 - ph) : gourd.x
    const x = tx + Math.cos(ang) * r * (back ? 0.4 : 1), y = gourd.y + Math.sin(ang) * r * 0.45 + ph * 40 * z - (back ? 0 : ph * 20 * z)
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.9; const s = (1.5 + hash(i, 3) * 2.5) * z; ctx.fillRect(x, y, s, s)
  }
  ctx.restore()
}
const lerpN = (a, b, u) => a + (b - a) * u
function blowingSand(ctx, W, H, S, k) {
  if (calmMotion()) return
  const a = 0.5 * Math.min(smooth((k - GB.seaAt) / 20), 1 - smooth((k - GB.returnAt) / 30))
  ctx.save(); ctx.fillStyle = '#d8c08a'
  for (let i = 0; i < 60; i++) { const x = ((hash(i, 1) * W + S.real * (6 + hash(i, 2) * 8) * S.dir) % W + W) % W, y = H * (0.3 + hash(i, 3) * 0.6)
    ctx.globalAlpha = a * (0.3 + 0.7 * hash(i, 4)); ctx.fillRect(x, y, 10 + hash(i, 5) * 30, 1.5) }
  ctx.restore()
}
function cutinCard(ctx, W, H, S, k) {   // his cut-in card (portrait + 砂瀑大葬) slashed in from the side
  const im = image(CUTIN); if (!ready(im)) return
  const u = (k - 6) / (GB.seaAt - 2), inU = outE(clamp(u / 0.2, 0, 1)), outU = clamp((u - 0.85) / 0.15, 0, 1)
  const h = H * 0.56, w = h * im.naturalWidth / im.naturalHeight, side = S.dir > 0 ? -1 : 1
  const x = side < 0 ? W * 0.06 - (1 - inU) * W * 0.5 - outU * W * 0.5 : W * 0.94 - w + (1 - inU) * W * 0.5 + outU * W * 0.5, y = H * 0.2
  ctx.save(); ctx.fillStyle = 'rgba(20,10,0,0.85)'; ctx.beginPath(); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x + w + 14, y - 14); ctx.lineTo(x + w + 6, y + h + 8); ctx.lineTo(x - 14, y + h + 4); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#d8b878'; ctx.lineWidth = 4; ctx.stroke()
  ctx.imageSmoothingEnabled = false; ctx.drawImage(im, x, y, w, h); ctx.restore()
}
function fistInset(ctx, W, H, S, k) {   // the hand closing, in a black band
  const u = (k - GB.clenchAt) / (GB.crushAt - GB.clenchAt), bh = H * 0.2 * outE(clamp(u * 4, 0, 1)), y = H * 0.22
  ctx.save(); ctx.fillStyle = '#0c0804'; ctx.fillRect(0, y - bh / 2, W, bh); ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip()
  ctx.restore()
  ctx.save(); ctx.globalAlpha = clamp(u * 3, 0, 1); ctx.fillStyle = '#e8b860'; ctx.font = `900 ${Math.round(H * 0.07)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('SABAKU…', W / 2, y); ctx.restore()
}
function sousou(ctx, W, H, cr, dir) {
  const su = clamp((cr - 9) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (cr - 60) / 14, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.72 : 0.28), H * 0.22); ctx.rotate(0.05 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.11)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#2a1404'; ctx.strokeText('砂瀑送葬', 0, 0); ctx.fillStyle = '#f6e8c8'; ctx.fillText('砂瀑送葬', 0, 0)
  ctx.font = `900 ${Math.round(fs * 0.36)}px Impact, "Arial Black", sans-serif`; ctx.lineWidth = 6; ctx.strokeText('SABAKU SŌSŌ — SAND WATERFALL FUNERAL', 0, fs * 0.8); ctx.fillStyle = '#e8b860'; ctx.fillText('SABAKU SŌSŌ — SAND WATERFALL FUNERAL', 0, fs * 0.8)
  ctx.restore()
}
