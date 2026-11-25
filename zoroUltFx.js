// zoroUltFx.js — RENDER-ONLY half of Zoro's "鬼気 九刀流 阿修羅 · 一霧銀 — ASHURA: ICHIBUGIN" (zoroUlt.js). One screen pass
// (world→screen from camera.js): dusk-dark wash, the bandana close-up, the demon aura + the three-headed six-armed Ashura
// silhouette with nine fanned blades, his real Ashura / Oni Giri / Shishi strips on the dash-throughs, nine-line rakes, the
// sheathing hush, the delayed nine-ray burst with white / inverted impact frames, titles, subtitles, letterbox.
// Pure functions of the scene's frames; noise = integer hash.
import { ZU } from './zoroUlt.js'
import { sprite, view, punchIn, speedLines, hLines, wash, desat, calligraphy, sub, letterbox, glow, rings, impactFrame, damageNumber, debris,
  hash, clamp, smooth, outE, calmMotion, calmFlash } from './bleachUltKit.js'
import { kanjiTitle } from './narutoUltFxKit.js'

const AURA = '40,200,120', STEEL = '230,240,255', WHO = 'ZORO', WHO_COL = '#4fe08a'

export function drawZoroUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const cr = S.hitReal != null ? S.real - S.hitReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), foeMid = V.p(S.tx, S.tFloor - (S.ty || 0) - 50)
  const floorY = V.p(0, S.floor).y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the world darkens; a green-black demon haze
  const wa = k < ZU.clickAt + 40 ? smooth(k / 20) : 1 - smooth((k - ZU.clickAt - 40) / 26)
  desat(ctx, W, H, 0.75 * wa); wash(ctx, W, H, '#0c1a14', 0.5 * wa, 'multiply')
  if (k >= ZU.sheatheAt && k < ZU.clickAt) wash(ctx, W, H, '#000', 0.35 * smooth((k - ZU.sheatheAt) / 16), 'multiply')

  // 2) the Ashura behind him (rises at demonAt, follows him through the cuts, fades after the click)
  const da = k < ZU.demonAt ? 0 : k < ZU.clickAt + 20 ? smooth((k - ZU.demonAt) / 24) : 1 - smooth((k - ZU.clickAt - 20) / 30)
  if (da > 0) ashura(ctx, S, k, fp, z, da)

  // 3) the foe
  drawFoe(ctx, S, k, tp, z, cr)

  // 4) Zoro
  drawZoro(ctx, S, k, fp, z, cr)

  // 5) the rakes: nine blade lines across the foe on each dash-through
  ZU.cuts.forEach((at, i) => { const a = k - at; if (a < 0 || a > 14) return
    rake(ctx, foeMid.x, foeMid.y, 110 * z, i, a / 14, (i % 2 ? -1 : 1) * dir)
    if (a < 4) glow(ctx, foeMid.x, foeMid.y, 120 * z, '255,255,255', 0.8 - a * 0.2)
    rings(ctx, foeMid.x, foeMid.y, a / 14, 2, 150 * z, `rgba(${AURA},1)`, 6 * z, 0.55) })
  if (k >= ZU.cuts[0] - 8 && k < ZU.sheatheAt) hLines(ctx, W, H * 0.2, H * 0.8, 30, 23, '#e8fff0', 0.22, S.real, dir)

  // 6) the delayed cut: nine-ray burst + debris
  if (cr >= 0 && cr < 50) {
    const u = clamp(cr / 8, 0, 1), a = 1 - clamp((cr - 26) / 20, 0, 1)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a
    for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i - 4) * 0.36 + (hash(i, 3) - 0.5) * 0.1, L = (140 + 260 * outE(u)) * z
      for (const [lw, col] of [[16 * z, `rgba(${AURA},0.4)`], [6 * z, `rgba(${STEEL},0.9)`], [2 * z, '#ffffff']]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath()
        ctx.moveTo(foeMid.x - Math.cos(an) * L * 0.5, foeMid.y - Math.sin(an) * L * 0.5 * 0.4 + (i - 4) * 4 * z); ctx.lineTo(foeMid.x + Math.cos(an) * L, foeMid.y + Math.sin(an) * L * 0.4 - (i - 4) * 4 * z); ctx.stroke() } }
    ctx.restore()
    if (cr < 12) { glow(ctx, foeMid.x, foeMid.y, 280 * z, STEEL, 1 - cr / 12); rings(ctx, foeMid.x, foeMid.y, cr / 14, 3, 460 * z, '#eafff2', 9 * z, 0.5) }
    debris(ctx, V.p(S.tx0, 0).x, floorY, cr, 26, z, 51)
  }
  if (k >= ZU.demonAt && k < ZU.cuts[0] - 8) speedLines(ctx, W, H, fp.x, fp.y - 120 * z, 60, 29, '#0a2a1a', 0.5, true, S.real)

  // 7) close-ups + impact frames
  if (k >= 6 && k < ZU.demonAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 70 * z, 1 + 0.55 * smooth((k - 6) / 24))
  else if (k >= ZU.cuts[0] - 8 && k < ZU.sheatheAt) punchIn(ctx, canvas, W, H, foeMid.x, foeMid.y + 20 * z, 1.2 + (S.lastCut && S.real - S.lastCut.real < 6 ? 0.2 - (S.real - S.lastCut.real) * 0.033 : 0))
  else if (k >= ZU.sheatheAt + 10 && k < ZU.clickAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 60 * z, 1 + 0.4 * smooth((k - ZU.sheatheAt - 10) / 30))
  else if (cr >= 0 && cr < 4) punchIn(ctx, canvas, W, H, foeMid.x, foeMid.y, 1.5)
  if (cr >= 2 && cr < 12 && !calmFlash()) {
    const white = cr < 7, bg = white ? '#ffffff' : '#03100a', fg = white ? '#03100a' : '#6dffb0', cx = W / 2, cy = H * 0.72, Z = Math.max(2.2, z * 1.8)
    impactFrame(ctx, W, H, bg, fg, cx - dir * W * 0.08, H * 0.5, 81 + cr, S.real, col => {
      sprite(ctx, t, ['hurt_air', 'hurt', 'idle'], 0, cx - dir * W * 0.12, cy, Z, -dir, { tint: col, tintA: 1, rot: -dir * 0.4 })
      sprite(ctx, f, ['zAshura'], 3, cx + dir * W * 0.2, cy, Z, dir, { tint: col, tintA: 1 })
    })
  }

  // 8) numbers
  if (S.lastHit && S.real - S.lastHit.real < 22 && cr < 0) {
    const age = S.real - S.lastHit.real, fs = Math.round(H * 0.055 * (1 + Math.max(0, 1 - age / 5) * 0.7))
    ctx.save(); ctx.globalAlpha = clamp(1.4 - age / 16, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const x = clamp(foeMid.x + (hash(S.hits, 3) - 0.5) * 80, W * 0.1, W * 0.9), y = clamp(foeMid.y - 70 * z - age * 1.5, H * 0.18, H * 0.8)
    ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#001a0c'; ctx.strokeText(String(Math.round(S.lastHit.d)), x, y); ctx.fillStyle = S.blocked ? '#ffd27a' : '#ff4a3a'; ctx.fillText(String(Math.round(S.lastHit.d)), x, y); ctx.restore()
  }
  if (cr >= 12) damageNumber(ctx, W, H, S, foeMid.x, foeMid.y - 90 * z, cr - 12, '#ff4a3a')
  ctx.restore()

  // 9) titles
  if (k >= ZU.demonAt && k < ZU.cuts[0] + 4) kanjiTitle(ctx, W, H, '鬼気九刀流', 'KIKI KYŪTŌRYŪ', (k - ZU.demonAt) / (ZU.cuts[0] + 4 - ZU.demonAt), { side: -dir, fill: '#eafff2', stroke: '#02140a', edge: '#4fe08a', ink: 'rgba(0,12,6,0.78)', fs: 0.085 })
  if (k >= ZU.cuts[0] && k < ZU.sheatheAt + 6) calligraphy(ctx, W, H, '阿修羅', (k - ZU.cuts[0]) / (ZU.sheatheAt + 6 - ZU.cuts[0]), { x: dir > 0 ? 0.88 : 0.12, y: 0.24, col: '#eafff2', edge: '#02140a', glow: 'rgba(60,220,130,0.8)' })
  if (cr >= 12 && cr < 74) callout(ctx, W, H, cr, dir)

  letterbox(ctx, W, H, S.real, k, ZU.total - 14)
  sub(ctx, W, H, k, 4, ZU.demonAt, WHO, "I swore I'd become the world's greatest swordsman.", WHO_COL)
  sub(ctx, W, H, k, ZU.demonAt + 4, ZU.cuts[0] - 4, WHO, 'Kiki Kyūtōryū… Ashura.', WHO_COL)
  sub(ctx, W, H, k, ZU.sheatheAt + 8, ZU.clickAt - 2, WHO, 'Ichibugin.', WHO_COL)
  sub(ctx, W, H, k, ZU.clickAt + 36, ZU.total - 2, WHO, 'Nothing happened.', WHO_COL)
  return true
}

// ── people ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawZoro(ctx, S, k, fp, z, cr) {
  const f = S.caster, dir = S.dir, face = S.fFace || dir
  if (k < ZU.demonAt) { sprite(ctx, f, k < 20 ? ['idle'] : ['zSanto', 'idle'], k < 20 ? (S.real >> 4) % 2 : Math.min(1, (k - 20) >> 3), fp.x, fp.y, z, dir); return }
  if (k < ZU.cuts[0] - 8) { sprite(ctx, f, ['zAshura', 'idle'], 0, fp.x, fp.y, z, dir); return }
  if (k < ZU.sheatheAt) {
    let i = 0; for (let j = 0; j < ZU.cuts.length; j++) if (k >= ZU.cuts[j] - 8) i = j
    const a = k - ZU.cuts[i]
    for (let g = 4; g >= 1; g--) sprite(ctx, f, ['zAshura', 'idle'], 1, fp.x - face * g * 30 * z, fp.y, z, face, { alpha: 0.13 * (5 - g), tint: '#6dffb0', tintA: 0.7 })
    sprite(ctx, f, ['zAshura', 'idle'], a < 0 ? 2 : a < 10 ? 1 : 2, fp.x, fp.y, z, face)
    return
  }
  if (k < ZU.clickAt) { sprite(ctx, f, ['zAshura', 'idle'], 3, fp.x, fp.y, z, dir); return }   // back turned, blades sliding home
  sprite(ctx, f, k < ZU.clickAt + 40 ? ['zAshura', 'idle'] : ['idle'], k < ZU.clickAt + 40 ? 3 : (S.real >> 4) % 2, fp.x, fp.y, z, k < ZU.clickAt + 40 ? dir : -dir)
}
function drawFoe(ctx, S, k, tp, z, cr) {
  const t = S.target, fdir = -S.dir
  if (k < ZU.cuts[0]) { sprite(ctx, t, S.blocked && k >= ZU.demonAt ? ['guard', 'idle'] : ['idle'], S.blocked ? 9 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (k < ZU.clickAt) {
    const recent = S.lastCut && S.real - S.lastCut.real < 7, sh = recent && !calmMotion() ? (hash(S.real, 7) - 0.5) * 10 * z : 0
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], S.blocked ? 9 : 0, tp.x + sh, tp.y, z, fdir); return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  if ((S.ty || 0) > 2) { sprite(ctx, t, ['hurt_air', 'hurt', 'idle'], 0, tp.x, tp.y, z, fdir, { rot: -S.dir * clamp(cr / 20, 0, 1) * 0.6 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir)
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function ashura(ctx, S, k, fp, z, a) {
  const f = S.caster, dir = S.dir, rise = smooth((k - ZU.demonAt) / 30), cx = fp.x - dir * 30 * z, base = fp.y + 10 * z
  // aura flames
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) { const ph = ((S.real * (1.5 + hash(i, 2)) + hash(i, 3) * 60) % 60) / 60, x = cx + (hash(i, 1) - 0.5) * 220 * z + Math.sin(ph * 6 + i) * 8 * z, y = base - ph * 320 * z * rise
    ctx.globalAlpha = a * (1 - ph) * ph * 1.2; ctx.fillStyle = i % 3 ? `rgba(${AURA},1)` : '#a8ffd0'; ctx.beginPath(); ctx.ellipse(x, y, (5 + hash(i, 4) * 8) * z * (1 - ph * 0.6), (16 + hash(i, 5) * 14) * z, 0, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
  // the demon: three Zoro-shaped silhouettes (heads left / centre / right), dark with a green rim
  const big = 1.25 + 0.6 * rise, dim = k >= ZU.cuts[0] - 8 && k < ZU.sheatheAt ? 0.55 : 1
  for (const [ox, oy, s] of [[-62, -26, 0.82], [62, -26, 0.82], [0, 0, 1]]) {
    const x = cx + ox * z * rise, y = base + oy * z * rise, fd = ox < 0 ? -dir : dir
    sprite(ctx, f, ['zsHeavy', 'zAshura', 'idle'], ox === 0 ? 0 : 1, x, y, z * big * s, fd, { alpha: a * dim * 0.6, tint: '#30ff90', tintA: 1, comp: 'lighter', s: 1.06 })
    sprite(ctx, f, ['zsHeavy', 'zAshura', 'idle'], ox === 0 ? 0 : 1, x, y, z * big * s, fd, { alpha: a * dim, tint: '#031009', tintA: 0.92 })
  }
  // nine blades fanned behind (three per pair of arms)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const hx = cx, hy = base - 95 * z * big
  for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i - 4) * 0.33 + Math.sin(S.real * 0.05 + i) * 0.03, r0 = 60 * z * rise, r1 = (150 + 40 * (i % 3)) * z * rise
    for (const [lw, col, al] of [[8 * z, `rgba(${AURA},1)`, 0.35], [3 * z, `rgba(${STEEL},1)`, 0.9]]) { ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(hx + Math.cos(an) * r0, hy + Math.sin(an) * r0 * 0.8); ctx.lineTo(hx + Math.cos(an) * r1, hy + Math.sin(an) * r1 * 0.8); ctx.stroke() }
    if (!calmMotion() && (S.real + i * 5) % 30 < 2) glow(ctx, hx + Math.cos(an) * r1, hy + Math.sin(an) * r1 * 0.8, 16 * z, STEEL, a) }
  ctx.restore()
  // six red eyes
  for (const [ox, oy] of [[-62, -26], [0, 0], [62, -26]]) { const ex = cx + ox * z * rise, ey = base + oy * z * rise - 88 * z * big
    for (const s of [-1, 1]) glow(ctx, ex + s * 7 * z * rise, ey, 10 * z, '255,40,40', a * (0.7 + 0.3 * Math.sin(S.real * 0.4))) }
}
function rake(ctx, x, y, R, seed, u, d) {
  const a = 1 - u, L = R * (0.6 + 1.4 * outE(clamp(u * 2.5, 0, 1)))
  ctx.save(); ctx.translate(x, y); ctx.rotate(d * (0.25 + (hash(seed, 2) - 0.5) * 0.4)); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (let i = 0; i < 9; i++) { const oy = (i - 4) * R * 0.075
    for (const [lw, col, al] of [[R * 0.1, `rgba(${AURA},1)`, 0.35], [R * 0.035, `rgba(${STEEL},1)`, 0.95]]) {
      ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-L * d, oy - (i % 2) * 3); ctx.lineTo(L * d, oy + (i % 3) * 3); ctx.stroke() } }
  ctx.restore()
}
function callout(ctx, W, H, cr, dir) {
  const su = clamp((cr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (cr - 58) / 16, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.28 : 0.72), H * 0.25); ctx.rotate(-0.05 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.095)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#02140a'; ctx.strokeText('阿修羅 一霧銀!!', 0, 0); ctx.fillStyle = '#eafff2'; ctx.fillText('阿修羅 一霧銀!!', 0, 0)
  ctx.font = `900 ${Math.round(fs * 0.36)}px Impact, "Arial Black", sans-serif`; ctx.lineWidth = fs * 0.08; ctx.strokeText('ASHURA: ICHIBUGIN', 0, fs * 0.72); ctx.fillStyle = '#4fe08a'; ctx.fillText('ASHURA: ICHIBUGIN', 0, fs * 0.72)
  ctx.restore()
}
