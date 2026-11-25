// sixPathsPainUltFx.js — RENDER-ONLY half of the Six Paths of Pain cinematic (sixPathsPainUlt.js). One screen pass
// (world→screen from camera.js): Amegakure rain, the six bodies from their own stance / cast strips, the six-face manga
// grid, each path's technique from its own art (three-headed dog, Asura missile, the Human Path's soul pull, Preta
// chakra drain, the King of Hell), the Rinnegan close-up, the Shinra Tensei sphere + crater, impact frames, path name
// cards, titles, subtitles, letterbox. Pure functions of the scene's frames; noise = integer hash.
import { SP, bodyAt, foeAt } from './sixPathsPainUlt.js'
import { image, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  letterbox, subtitle, lineA, kanjiTitle, damagePops, glow, rings, wash, desat, cracks, portraitPanel, strip, skinned } from './narutoUltFxKit.js'

const SH = {   // sheet, frame count
  deva: ['./sixpaths_deva_stance_uniform.png', 7], devaPush: ['./sixpaths_deva_push_uniform.png', 6], rinRings: ['./sixpaths_deva_rinnegan_uniform.png', 12],
  chiku: ['./sixpaths_chiku_stance_uniform.png', 7], chikuCast: ['./sixpaths_chiku_summon_uniform.png', 1], dog: ['./sixpaths_chiku_dog_uniform.png', 3],
  asura: ['./sixpaths_asura_stance_uniform.png', 8], asuraCast: ['./sixpaths_asura_missilecast_uniform.png', 1], missile: ['./sixpaths_asura_supermissile_uniform.png', 3], blast: ['./sixpaths_asura_missile_uniform.png', 3],
  ningen: ['./sixpaths_ningen_stance_uniform.png', 7], ningenCast: ['./sixpaths_ningen_soulcast_uniform.png', 5], soul: ['./sixpaths_ningen_soul_uniform.png', 3],
  gakido: ['./sixpaths_gakido_stance_uniform.png', 8], gakidoCast: ['./sixpaths_gakido_shield_uniform.png', 4],
  naraka: ['./sixpaths_naraka_stance_uniform.png', 9], narakaCast: ['./sixpaths_naraka_summoncast_uniform.png', 3], koh: ['./sixpaths_naraka_kingofhell_uniform.png', 6],
}
const PORTRAITS = [['./sixpaths_deva_portrait.png', '天道'], ['./sixpaths_asura_portrait.png', '修羅道'], ['./sixpaths_ningen_portrait.png', '人間道'],
  ['./sixpaths_chiku_portrait.png', '畜生道'], ['./sixpaths_gakido_portrait.png', '餓鬼道'], ['./sixpaths_naraka_portrait.png', '地獄道']]
const PURPLE = '180,140,255'
const SCALE = 1.55

export function preloadSixPathsUlt(f, t) {
  for (const k of Object.keys(SH)) image(SH[k][0])
  for (const p of PORTRAITS) image(p[0])
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

export function drawSixPathsUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0, s = SCALE * z
  const big = S.nums?.find(n => n.big), pr = big ? S.real - big.real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 10, y: (hash(S.real, 2) - 0.5) * 10 } : { x: 0, y: 0 }
  const q = foeAt(S, k), dp = V.p(S.fx0, S.floor), qp = V.p(q.x, q.y), floorY = dp.y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) Amegakure: grey rain grade
  const rainA = k < SP.landAt + 40 ? smooth(k / 20) : 1 - smooth((k - SP.landAt - 40) / 22)
  desat(ctx, W, H, 0.75 * rainA, '#1a1626', 0.6)

  // 2) the King of Hell rises behind the foe (drawn before the foe)
  const nk = SP.paths[4]
  if (k >= nk.at + 2 && k < nk.end + 10) koh(ctx, S, V, k, qp, s, floorY)

  // 3) the foe (+ the Human Path's soul pull)
  drawFoe(ctx, S, V, k, qp)

  // 4) the bodies, back to front, then Deva (the caster)
  for (const i of [2, 4, 1, 3, 0]) drawBody(ctx, S, V, i, k, s)
  drawDeva(ctx, S, k, dp, s, f)

  // 5) each path's technique
  pathFx(ctx, S, V, k, qp, s, floorY, W, H)

  // 6) Deva — the Rinnegan rings around him, then SHINRA TENSEI
  if (k >= SP.eyeAt && k < SP.pushAt + 4) { const u = (k - SP.eyeAt) / (SP.pushAt - SP.eyeAt); strip(ctx, SH.rinRings[0], 12, (k - SP.eyeAt) >> 1, dp.x, dp.y - 40 * z, s * 2.2, { ay: 0.5, alpha: 0.8, comp: 'lighter' }); glow(ctx, dp.x, dp.y - 50 * z, 120 * z * (0.5 + u), PURPLE, 0.5 * u) }
  const pu = k - SP.pushAt
  if (pu >= 0 && pu < 40) shinra(ctx, W, H, S, pu, dp, z, floorY)
  if (k >= SP.pushAt && k < SP.landAt + 50) { const a = k < SP.landAt + 20 ? 1 : 1 - (k - SP.landAt - 20) / 30; ctx.save(); ctx.globalAlpha = a; cracks(ctx, dp.x + dir * 60 * z, floorY + 2, 260 * z, clamp(pu / 10, 0, 1), 71, 16, '#0a0612', `rgba(${PURPLE},0.5)`); ctx.restore() }

  // 7) rain streaks over everything in the world
  if (rainA > 0 && !calmMotion()) rain(ctx, W, H, S.real, rainA)

  // 8) punch-ins + impact frames
  if (k >= SP.devaAt + 4 && k < SP.eyeAt) punchIn(ctx, canvas, W, H, dp.x, dp.y - 60 * z, 1 + 0.4 * smooth((k - SP.devaAt - 4) / 10))
  if (pr >= 0 && pr < 4) punchIn(ctx, canvas, W, H, dp.x + dir * 60 * z, dp.y - 50 * z, 1.4)
  if (pr >= 3 && pr < 11 && !calmFlash()) {
    const white = pr < 7, bg = white ? '#ffffff' : '#0c0618', fg = white ? '#0c0618' : '#c8a8ff'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, dp.x, dp.y - 50 * z, 90, 81 + pr, fg, 0.9, false, pr)
    ctx.translate(W / 2, H * 0.68); ctx.scale(1.8, 1.8); ctx.translate(-(dp.x + qp.x) / 2, -dp.y)
    strip(ctx, skinned(f, SH.devaPush[0]), 6, 3, dp.x, dp.y, s, { dir, tint: fg })
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y, z, -dir, { tint: fg, tintA: 1, skew: -dir * 0.3 })
    ctx.restore()
  }
  damagePops(ctx, W, H, S, V, '#c08aff')
  ctx.restore()

  // 9) panels / cards / titles
  if (k < SP.paths[0].at) faceGrid(ctx, W, H, S, k)
  if (k >= 8 && k < SP.paths[0].at + 2) kanjiTitle(ctx, W, H, 'ペイン六道', 'SIX PATHS OF PAIN', (k - 8) / (SP.paths[0].at - 6), { side: dir, fill: '#f4eeff', stroke: '#14061e', edge: '#c08aff', fs: 0.1, by: 0.86 })
  SP.paths.forEach((p, i) => { if (k >= p.at && k < p.end) pathCard(ctx, W, H, p, i, k, dir) })
  if (k >= SP.eyeAt && k < SP.pushAt) rinneganBand(ctx, W, H, S, k)
  if (k >= SP.eyeAt + 6 && k < SP.landAt) kanjiTitle(ctx, W, H, '神羅天征', 'SHINRA TENSEI', (k - SP.eyeAt - 6) / (SP.landAt - SP.eyeAt - 6), { side: -dir, fill: '#f4eeff', stroke: '#14061e', edge: '#c08aff', fs: 0.12 })

  letterbox(ctx, W, H, k, S.real, SP.total)
  subtitle(ctx, W, H, 'PAIN', 'We, the Akatsuki…', lineA(k, 2, 46), '#c08aff')
  subtitle(ctx, W, H, 'PAIN', 'From here on — pain, to this world. Shinra Tensei!', lineA(k, SP.devaAt, SP.pushAt + 20), '#c08aff')
  subtitle(ctx, W, H, 'PAIN', 'Know pain.', lineA(k, SP.landAt + 10, SP.total - 2), '#c08aff')
  return true
}

// ── bodies ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const STANCE = ['chiku', 'asura', 'ningen', 'gakido', 'naraka']
function drawBody(ctx, S, V, i, k, s) {
  const p = SP.paths[i], b = bodyAt(S, i, k), bp = V.p(b.x, S.floor), dir = S.dir, z = V.z, arrive = 6 + i * 6
  if (k < arrive) return
  const inU = clamp((k - arrive) / 6, 0, 1), active = k >= p.at && k < p.end, stance = SH[STANCE[i]]
  const o = { dir, alpha: inU }
  if (inU < 1) { o.tint = '#e8dcff'; ctx.save(); ctx.translate(bp.x, bp.y); ctx.scale(1, 1 + (1 - inU) * 0.6); ctx.translate(-bp.x, -bp.y) }
  if (b.flick) { o.alpha = 0.5; o.tint = '#e8dcff' }
  if (!active && k > p.end && k < SP.devaAt) o.tint = o.tint || 'rgba(0,0,0,0.25)'
  let src = stance[0], n = stance[1], fr = (S.real >> 3) % 4
  if (active) {
    const a = k - p.at
    if (p.id === 'chiku') { src = SH.chikuCast[0]; n = 1; fr = 0 }
    else if (p.id === 'asura') { src = SH.asuraCast[0]; n = 1; fr = 0 }
    else if (p.id === 'ningen' && !b.home) { src = SH.ningenCast[0]; n = 5; fr = Math.min(4, (a - 4) >> 2) }
    else if (p.id === 'gakido' && !b.home) { src = SH.gakidoCast[0]; n = 4; fr = Math.min(3, (a - 4) >> 2) }
    else if (p.id === 'naraka') { src = SH.narakaCast[0]; n = 3; fr = Math.min(2, a >> 3) }
  }
  strip(ctx, src, n, fr, bp.x, bp.y, s, o)
  if (inU < 1) ctx.restore()
  if (k < arrive + 8) glow(ctx, bp.x, bp.y - 50 * z, 60 * z, PURPLE, 1 - (k - arrive) / 8)
}
function drawDeva(ctx, S, k, dp, s, f) {
  const dir = S.dir
  if (k < SP.devaAt || k >= SP.landAt + 10) { strip(ctx, skinned(f, SH.deva[0]), 7, (S.real >> 3) % 4, dp.x, dp.y, s, { dir }); return }
  const fr = k < SP.pushAt ? Math.min(1, (k - SP.devaAt) >> 4) : Math.min(5, 2 + ((k - SP.pushAt) >> 2))
  strip(ctx, skinned(f, SH.devaPush[0]), 6, fr, dp.x, dp.y, s, { dir })
}
function drawFoe(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir, hp = SP.paths.find(p => k >= p.hitAt && k < p.hitAt + 8)
  if (S.blocked && k < SP.landAt) { sprite(ctx, t, ['guard', 'idle'], 9, qp.x, qp.y, z, fdir); return }
  if (k < SP.paths[0].hitAt) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, qp.x, qp.y, z, fdir); return }
  if (k < SP.pushAt) {
    const sh = hp && !calmMotion() ? (hash(S.real, 7) - 0.5) * 7 * z : 0
    sprite(ctx, t, ['hurt', 'idle'], hp ? 0 : 1, qp.x + sh, qp.y, z, fdir, hp ? { tint: '#ffffff', tintA: (S.real >> 1) % 2 ? 0.5 : 0.1 } : {})
    const hu = SP.paths[2]   // Human Path: the soul half out of the body
    if (k >= hu.hitAt - 6 && k < hu.end + 4) { const u = smooth((k - hu.hitAt + 6) / 10) * (1 - smooth((k - hu.end + 2) / 6))
      sprite(ctx, t, ['hurt', 'idle'], 0, qp.x - S.dir * 26 * z * u, qp.y - 10 * z * u, z, fdir, { alpha: 0.65 * u, tint: '#7fe8ff', tintA: 0.85 }) }
    return
  }
  if (k < SP.landAt) { sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, fdir, { rot: (k - SP.pushAt) * 0.2 * S.dir }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
  if (k < SP.landAt + 22) { const u = (k - SP.landAt) / 22; ctx.save(); ctx.globalAlpha = (1 - u) * 0.6; ctx.fillStyle = '#8a8098'; ctx.beginPath(); ctx.ellipse(qp.x, qp.y, (30 + u * 90) * z, (8 + u * 12) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}

// ── the techniques ───────────────────────────────────────────────────────────────────────────────────────────────────
function pathFx(ctx, S, V, k, qp, s, floorY, W, H) {
  const dir = S.dir, z = V.z, P = SP.paths
  // ANIMAL: summon smoke at the body, then the three-headed dog tramples through
  const an = P[0]
  if (k >= an.at && k < an.end + 6) {
    const home = V.p(bodyAt(S, 0, k).x, S.floor)
    if (k < an.at + 12) smoke(ctx, home.x + dir * 40 * z, floorY, z, k - an.at, 12, 3)
    const u = clamp((k - an.at - 4) / (an.hitAt + 6 - an.at - 4), 0, 1), x = home.x + (qp.x + dir * 90 * z - home.x) * outE(u)
    if (k >= an.at + 4) strip(ctx, SH.dog[0], 3, (S.real >> 2) % 3, x, floorY + 4 * z, s * 0.95, { dir, alpha: k > an.end ? 1 - (k - an.end) / 6 : 1 })
    if (k >= an.hitAt && k < an.hitAt + 10) rings(ctx, qp.x, qp.y - 40 * z, (k - an.hitAt) / 10, 160 * z, '#ffe0c0', 2, 0.5, 6 * z)
  }
  // ASURA: the missile streaks across and detonates
  const as = P[1]
  if (k >= as.at + 4 && k < as.end + 6) {
    const home = V.p(bodyAt(S, 1, k).x, S.floor), u = clamp((k - as.at - 4) / (as.hitAt - as.at - 4), 0, 1)
    if (k < as.hitAt) { const x = home.x + (qp.x - home.x) * u * u, y = floorY - 52 * z; strip(ctx, SH.missile[0], 3, (S.real >> 1) % 3, x, y, s * 0.7, { dir, ay: 0.5 }); glow(ctx, x - dir * 40 * z, y, 50 * z, '255,170,80', 0.7) }
    else { const a = k - as.hitAt; strip(ctx, SH.blast[0], 3, 2, qp.x, qp.y - 40 * z, s * (1.4 + a * 0.08), { dir, ay: 0.5, alpha: 1 - a / 16, comp: 'lighter' }); glow(ctx, qp.x, qp.y - 50 * z, (90 + a * 12) * z, '255,150,60', 1 - a / 16) }
  }
  // HUMAN: the soul rip (cyan wisps)
  const hu = P[2]
  if (k >= hu.hitAt - 4 && k < hu.end) { const u = clamp((k - hu.hitAt + 4) / 12, 0, 1); strip(ctx, SH.soul[0], 3, (S.real >> 2) % 2, qp.x - dir * 30 * z, qp.y - 4 * z, s * 1.1, { dir: -dir, alpha: 0.85 * u, comp: 'lighter' }); glow(ctx, qp.x - dir * 20 * z, qp.y - 55 * z, 80 * z, '120,230,255', 0.6 * u) }
  // PRETA: chakra stream from the foe into the Preta Path
  const pr = P[3]
  if (k >= pr.at + 4 && k < pr.end) {
    const gb = V.p(bodyAt(S, 3, k).x, S.floor), gx = gb.x + dir * 14 * z, gy = gb.y - 50 * z
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#9fd8ff'
    for (let i = 0; i < 40; i++) { const ph = ((S.real * 2 + hash(i, 4) * 40) % 40) / 40, sx = qp.x + (hash(i, 1) - 0.5) * 40 * z, sy = qp.y - (20 + hash(i, 2) * 70) * z
      const x = sx + (gx - sx) * ph, y = sy + (gy - sy) * ph + Math.sin(ph * 6 + i) * 10 * z; ctx.globalAlpha = 0.9 * (1 - ph * 0.5); ctx.beginPath(); ctx.arc(x, y, (2 + 2 * (1 - ph)) * z, 0, Math.PI * 2); ctx.fill() }
    ctx.restore(); glow(ctx, gx, gy, 60 * z, '140,210,255', 0.7)
  }
}
function koh(ctx, S, V, k, qp, s, floorY) {   // the King of Hell, rising out of the floor behind the foe
  const p = SP.paths[4], dir = S.dir, z = V.z, x = qp.x + dir * 70 * z
  const rise = smooth((k - p.at - 2) / 10), sink = smooth((k - p.end + 2) / 10), u = rise * (1 - sink)
  if (u <= 0) return
  glow(ctx, x, floorY - 60 * z, 200 * z * u, '140,40,200', 0.6 * u)
  ctx.save(); ctx.beginPath(); ctx.rect(-50, -50, (ctx.canvas?.width || 3000) + 100, floorY + 50); ctx.clip()
  strip(ctx, SH.koh[0], 6, k < p.hitAt - 4 ? 0 : Math.min(5, (k - p.hitAt + 4) >> 1), x, floorY + (1 - u) * 230 * s * 0.9, s * 0.9, { dir: -dir })
  ctx.restore()
  // purple ground flames
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 14; i++) { const fx = x + (hash(i, 1) - 0.5) * 220 * z, ph = ((S.real + hash(i, 2) * 20) % 20) / 20, h = (30 + hash(i, 3) * 50) * z * u
    ctx.globalAlpha = (1 - ph) * 0.7 * u; ctx.fillStyle = i % 2 ? '#a050ff' : '#ff60c0'; ctx.beginPath(); ctx.ellipse(fx, floorY - ph * h, 6 * z, 14 * z * (1 - ph * 0.5), 0, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function shinra(ctx, W, H, S, pu, dp, z, floorY) {   // the almighty push: a sphere of force tearing outwards
  const cx = dp.x, cy = dp.y - 50 * z, R = (40 + 1100 * outE(pu / 22)) * z, a = 1 - clamp((pu - 14) / 26, 0, 1)
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R); g.addColorStop(0, 'rgba(240,230,255,0)'); g.addColorStop(0.8, 'rgba(220,200,255,0.14)'); g.addColorStop(0.96, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  rings(ctx, cx, cy, pu / 26, 900 * z, '#e6dcff', 3, 0.9, 10 * z)
  if (pu < 6) wash(ctx, W, H, '#ffffff', calmFlash() ? 0.2 : 0.8 * (1 - pu / 6), 'lighter')
  // debris flung outward
  ctx.save(); ctx.fillStyle = '#2a2230'
  for (let i = 0; i < 30; i++) { const an = -Math.PI * hash(i, 1), sp = (200 + hash(i, 2) * 600) * z, u = pu / 40, x = cx + Math.cos(an) * sp * u * (S.dir > 0 ? 1 : -1) * (hash(i, 5) < 0.75 ? 1 : -1), y = floorY + Math.sin(an) * sp * u * 0.6 + 400 * u * u * z
    ctx.globalAlpha = 1 - u; ctx.fillRect(x, y, (4 + hash(i, 3) * 10) * z, (4 + hash(i, 4) * 8) * z) }
  ctx.restore()
}
function smoke(ctx, x, y, z, a, len, seed) {
  const u = a / len; ctx.save()
  for (let i = 0; i < 9; i++) { const an = hash(seed, i) * Math.PI, r = (20 + u * 70) * z; ctx.globalAlpha = (1 - u) * 0.75; ctx.fillStyle = i % 2 ? '#d8d4dc' : '#b0aab8'
    ctx.beginPath(); ctx.arc(x + Math.cos(an) * r * (hash(i, 2) - 0.5) * 2, y - Math.sin(an) * r, (18 + u * 26) * z, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function rain(ctx, W, H, real, a) {
  ctx.save(); ctx.strokeStyle = 'rgba(200,210,235,0.45)'; ctx.lineWidth = 1.2; ctx.globalAlpha = a; ctx.beginPath()
  for (let i = 0; i < 120; i++) { const x = (hash(i, 1) * (W + 200) + real * 3) % (W + 200) - 100, y = (hash(i, 2) * H + real * (22 + hash(i, 3) * 10)) % (H + 60) - 30
    ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 26) }
  ctx.stroke(); ctx.restore()
}

// ── panels ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function faceGrid(ctx, W, H, S, k) {   // six slanted manga panels — one face per body — slamming in down the top half
  const out = clamp((SP.paths[0].at - k) / 6, 0, 1); if (out <= 0) return
  const pw = W * 0.152, ph = H * 0.34, gap = W * 0.008, x0 = (W - (pw * 6 + gap * 5)) / 2, y0 = H * 0.15
  PORTRAITS.forEach(([src, kanji], i) => {
    const at = 4 + i * 5, u = outE(clamp((k - at) / 6, 0, 1)); if (u <= 0) return
    const px = x0 + i * (pw + gap), py = y0 - (1 - u) * H * 0.5 + (i % 2) * H * 0.03
    portraitPanel(ctx, src, null, px, py, pw, ph, { alpha: out, bg: '#1a1424', edge: '#000', zoom: i === 0 ? 1.15 : 1.05 })
    ctx.save(); ctx.globalAlpha = out; const fs = Math.round(H * 0.03); ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'
    ctx.strokeText(kanji, px + pw / 2, py + ph - fs * 0.6); ctx.fillStyle = '#e8d8ff'; ctx.fillText(kanji, px + pw / 2, py + ph - fs * 0.6); ctx.restore()
  })
}
function pathCard(ctx, W, H, p, i, k, dir) {   // the path's name card: its face + kanji + English, slid in on a slanted band
  const u = (k - p.at) / (p.end - p.at), inU = outE(clamp(u / 0.2, 0, 1)), a = clamp((1 - u) / 0.15, 0, 1)
  const side = i % 2 ? -dir : dir, bw = W * 0.4, bh = H * 0.12, bx = side > 0 ? W * 0.03 - (1 - inU) * bw : W * 0.97 - bw + (1 - inU) * bw, by = H * 0.17
  ctx.save(); ctx.globalAlpha = a
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by + bh * 0.08); ctx.lineTo(bx + bw - bh * 0.3, by + bh); ctx.lineTo(bx + bh * 0.1, by + bh * 0.95); ctx.closePath()
  ctx.fillStyle = 'rgba(10,6,16,0.9)'; ctx.fill(); ctx.strokeStyle = '#c08aff'; ctx.lineWidth = 3; ctx.stroke()
  const src = PORTRAITS.find(x => x[1] === p.kanji)?.[0]
  if (src) portraitPanel(ctx, src, null, bx + bh * 0.15, by + bh * 0.08, bh * 1.2, bh * 0.84, { bg: '#1a1424', edge: '#000', zoom: 1.1 })
  const fs = Math.round(bh * 0.46); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.fillStyle = '#f0e6ff'; ctx.fillText(p.kanji, bx + bh * 1.5, by + bh * 0.42)
  ctx.font = `900 ${Math.round(fs * 0.5)}px Impact, "Arial Black", sans-serif`; ctx.fillStyle = '#c08aff'; ctx.fillText(p.name, bx + bh * 1.5 + fs * 3.4, by + bh * 0.46)
  ctx.restore()
}
function rinneganBand(ctx, W, H, S, k) {   // the Rinnegan, filling a band across the screen
  const u = (k - SP.eyeAt) / (SP.pushAt - SP.eyeAt), bh = H * 0.28 * outE(clamp(u * 5, 0, 1)) * (1 - smooth((u - 0.85) / 0.15)), y = H * 0.42
  if (bh <= 1) return
  ctx.save(); ctx.fillStyle = '#05030a'; ctx.fillRect(0, y - bh / 2, W, bh); ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip()
  const ex = W / 2, r = H * 0.1 * (1 + 0.15 * u)
  ctx.fillStyle = '#efe8f4'; ctx.beginPath(); ctx.ellipse(ex, y, r * 2.8, r * 1.05, 0, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.clip()
  ctx.fillStyle = '#b89ae6'; ctx.beginPath(); ctx.arc(ex, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#2a0a44'; for (let i = 1; i <= 4; i++) { ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.beginPath(); ctx.arc(ex, y, r * (0.18 + i * 0.2), 0, Math.PI * 2); ctx.stroke() }
  ctx.fillStyle = '#1a0630'; ctx.beginPath(); ctx.arc(ex, y, r * 0.14, 0, Math.PI * 2); ctx.fill()
  glow(ctx, ex, y, r * 2.2, PURPLE, 0.35)
  ctx.restore(); ctx.restore()
}
