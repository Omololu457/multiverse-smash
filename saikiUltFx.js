// saikiUltFx.js — RENDER-ONLY half of Saiki Kusuo's GIANT BOMB THROW cinematic (saikiUlt.js). Screen pass (cineRegistry
// overlay, identity transform): world → screen from camera.js's live transform; both fighters drawn here from their real
// sheets; the psychic sphere / detonation use Saiki's own bomb FX sheet (saiki_bomb_fx_u.png) scaled up, layered with
// procedural PSI rings, floating rubble, a telekinetic hold on the foe, white / inverted frames and a smoke column.
// Pure functions of the scene; noise = integer hash. Reduce Flashing / Reduce Motion honoured.
import { image, ready, hash, clamp, smooth, outE, calmMotion, calmFlash, preloadAnims, sprite, view, punchIn, speedLines, title, subtitle, star, letterbox, ring, vignette, bigNumber } from './ippoUltFx.js'
import { bombAt, foeAt } from './saikiUlt.js'

export const SAIKI_T = { psi: 36, title: 60, throw: 112, boom: 136, after: 170, land: 196, out: 232, total: 246 }
const T = SAIKI_T
const FX = { sheet: './saiki_bomb_fx_u.png', w: 126, h: 125, n: 10 }

export function preloadSaikiUlt(f, t) {
  image(FX.sheet)
  preloadAnims(f, ['idle', 'saikiBomb', 'teleport'])
  preloadAnims(t, ['idle', 'hurt', 'guard', 'knockdown', 'fall'])
}
function fxCell(ctx, i, x, y, r, a = 1, comp = 'lighter') {   // one bomb-FX cell centred at (x, y), drawn so its disc radius ≈ r
  const im = image(FX.sheet); if (!ready(im) || a <= 0) return
  const s = (r * 2) / (FX.w * 0.8)
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.globalCompositeOperation = comp; ctx.imageSmoothingEnabled = false
  ctx.drawImage(im, clamp(i, 0, FX.n - 1) * FX.w, 0, FX.w, FX.h, x - FX.w * s / 2, y - FX.h * s / 2, FX.w * s, FX.h * s); ctx.restore()
}

export function drawSaikiUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas.width, H = canvas.height, V = view(W, H), z = V.z, k = S.frame, f = S.caster, t = S.target, d = S.dir
  const fp = V.p(S.fx0, S.floor), tq = foeAt(k), tp = V.p(tq.x, tq.y)
  const br = S.boomReal != null ? S.real - S.boomReal : -1
  const jit = calmMotion() ? 0 : (br >= 0 && br < 40 ? (hash(S.real, 3) - 0.5) * H * 0.02 * (1 - br / 40) : (k > T.psi && k < T.throw ? (hash(S.real, 5) - 0.5) * H * 0.003 : 0))

  ctx.save(); ctx.translate(jit, jit * 0.6)
  // 1) the world loses its colour around him (a psychic hush): violet-black wash
  const wash = k < T.out ? smooth(k / 16) : smooth(1 - (k - T.out) / 14)
  ctx.fillStyle = `rgba(14,6,26,${(0.5 * wash).toFixed(3)})`; ctx.fillRect(-20, -20, W + 40, H + 40)
  // PSI rings pulsing off him through the gather
  if (k >= T.psi && k < T.boom) {
    for (let j = 0; j < 4; j++) { const ph = ((S.real * 1.2 + j * 22) % 88) / 88
      ring(ctx, fp.x, fp.y - 60 * z, (30 + ph * 380) * z, (1 - ph) * 0.5 * Math.min(1, (k - T.psi) / 12), j & 1 ? '#7dffb0' : '#ff7ad9', 3 * z, 0.45) }
  }
  // floating rubble lifted off the floor (telekinesis); falls back after the boom
  if (k >= T.psi + 6 && k < T.after + 20) rubble(ctx, S, V, k, fp)

  // 2) the fighters
  drawFoe(ctx, S, V, k, tp)
  drawSaiki(ctx, S, V, k, fp)

  // 3) the sphere
  const b = bombAt(k)
  if (b) {
    const bp = V.p(b.x, b.y), r = b.r * z
    const gi = k < T.throw ? Math.min(5, Math.floor(((k - T.psi) / (T.throw - T.psi)) * 6)) : 5
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(bp.x, bp.y, r * 0.3, bp.x, bp.y, r * 2.4); g.addColorStop(0, 'rgba(150,220,255,0.55)'); g.addColorStop(1, 'rgba(60,120,255,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bp.x, bp.y, r * 2.4, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    fxCell(ctx, gi, bp.x, bp.y, r * (1 + 0.04 * Math.sin(S.real * 0.7)))
    // energy streamers sucked into it while it condenses
    if (k < T.throw && !calmMotion()) { ctx.save(); ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 14; i++) { const an = hash(i, 31) * Math.PI * 2 + S.real * 0.03, u = ((S.real * 0.04 + hash(i, 32)) % 1), rr = r * (1.2 + (1 - u) * 3.5)
        ctx.globalAlpha = 0.6 * u; ctx.strokeStyle = i & 1 ? '#bff4ff' : '#9dffc8'; ctx.lineWidth = 2 * z
        ctx.beginPath(); ctx.moveTo(bp.x + Math.cos(an) * rr, bp.y + Math.sin(an) * rr); ctx.lineTo(bp.x + Math.cos(an) * (rr - 26 * z), bp.y + Math.sin(an) * (rr - 26 * z)); ctx.stroke() }
      ctx.restore() }
    if (k >= T.throw) { ctx.save(); ctx.globalCompositeOperation = 'lighter'
      for (let i = 1; i <= 6; i++) { const ob = bombAt(k - i * 2); if (!ob) continue; const op = V.p(ob.x, ob.y); ctx.globalAlpha = 0.16 * (7 - i) / 6; ctx.fillStyle = '#bfe8ff'; ctx.beginPath(); ctx.arc(op.x, op.y, ob.r * z * (1 - i * 0.06), 0, Math.PI * 2); ctx.fill() }
      ctx.restore() }
  }
  // 4) the detonation
  const bc = V.p(S.tx0, S.tFloor - 60)
  if (br >= 0 && br < 60) boom(ctx, W, H, S, V, br, bc)
  if (k >= T.boom && k < T.out + 10) smokeColumn(ctx, S, V, k, bc)

  // 5) punch-ins
  const head = { x: fp.x, y: fp.y - 100 * z }
  if (k < T.psi) { const u = smooth((k - 2) / 30); punchIn(ctx, canvas, W, H, head.x, head.y, 1 + 0.6 * u, head.x + (W * 0.5 - head.x) * u, head.y + (H * 0.45 - head.y) * u) }
  else if (k >= T.psi && k < T.title) { const u = smooth((k - T.psi) / 20); punchIn(ctx, canvas, W, H, head.x, head.y - 30 * z, 1.6 - 0.45 * u, W * 0.5 + (fp.x - W * 0.5) * u, H * 0.45 + (head.y - 30 * z - H * 0.45) * u) }
  else if (k >= T.throw - 6 && k < T.boom) { const bp = b ? V.p(b.x, b.y) : tp, cx = (bp.x + tp.x) / 2, cy = (bp.y + tp.y - 50 * z) / 2; punchIn(ctx, canvas, W, H, cx, cy, 1.05 + 0.2 * smooth((k - T.throw + 6) / 30), W / 2, H / 2) }

  // 6) titles / panels
  if (k >= T.title && k < T.throw) title(ctx, W, H, 'GIANT BOMB THROW', 'PSYCHOKINESIS  ·  超能力', (k - T.title) / (T.throw - T.title), { y: 0.2, fs: 0.11, edge: '#7dffb0', fill: '#ffffff', stroke: '#c2167a', band: 'rgba(10,4,20,0.9)' })
  if (k >= T.psi + 4 && k < T.psi + 30) limiterPanel(ctx, W, H, S, k)
  if (br >= 0 && br < 14) impactFrames(ctx, W, H, S, V, br, tp, fp)
  if (S.dmg > 0 && br >= 14 && br < 110) bigNumber(ctx, W, H, S.dmg, clamp(bc.x, W * 0.12, W * 0.88), H * 0.3, (br - 14) / 96, S.blocked ? '#ffd27a' : '#ff5ab4')
  if (k >= T.land && k < T.out + 10) yareCard(ctx, W, H, S, k)
  ctx.restore()

  // 7) letterbox + telepathic subtitles
  const lbIn = clamp(S.real / 10, 0, 1), lbOut = k >= T.out ? clamp(1 - (k - T.out) / 14, 0, 1) : 1
  letterbox(ctx, W, H, Math.min(lbIn, lbOut))
  if (k >= 2 && k < T.title) subtitle(ctx, W, H, 'SAIKI (telepathy)', '(Good grief. This is getting annoying.)', Math.min((k - 2) / 6, (T.title - k) / 8), { who: '#ff7ad9' })
  if (k >= T.after + 4 && k < T.out + 6) subtitle(ctx, W, H, 'SAIKI (telepathy)', '(…That\'s it.)', Math.min((k - T.after - 4) / 6, (T.out + 6 - k) / 8), { who: '#ff7ad9' })
  return true
}

function drawSaiki(ctx, S, V, k, fp) {
  const f = S.caster, z = V.z, d = S.dir, x = fp.x
  // the limiter pins glow while the power is out
  let keys = ['idle'], fr = (S.real >> 3) % 4
  if (k >= T.psi && k < T.throw) { keys = ['saikiBomb', 'idle']; fr = k < T.psi + 6 ? 0 : (1 + ((S.real >> 4) & 1)) }
  else if (k >= T.throw && k < T.boom) { keys = ['saikiBomb', 'idle']; fr = k < T.throw + 5 ? 3 : 4 }
  else if (k >= T.boom && k < T.after) { keys = ['saikiBomb', 'idle']; fr = 5 + Math.min(2, (k - T.boom) >> 3) }
  if (k >= T.psi && k < T.boom + 20) {
    const u = smooth((k - T.psi) / 20)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(x, fp.y - 60 * z, 4, x, fp.y - 60 * z, 110 * z); g.addColorStop(0, `rgba(120,255,180,${(0.28 * u).toFixed(3)})`); g.addColorStop(1, 'rgba(120,255,180,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, fp.y - 60 * z, 110 * z, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    if (!calmMotion() && ((S.real >> 2) & 1)) for (const sx of [-9, 9]) star(ctx, x + sx * z, fp.y - 118 * z, 9 * z, 0.9 * u, S.real * 0.2, '255,120,220')
  }
  sprite(ctx, f, keys, fr, x, fp.y, z, d)
}

function drawFoe(ctx, S, V, k, tp) {
  const t = S.target, z = V.z, d = S.dir, fd = -d
  if (S.blocked) {
    sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fd)
    return
  }
  if (k < T.psi + 20) { sprite(ctx, t, ['idle'], 0, tp.x, tp.y, z, fd); return }
  if (k < T.boom) {   // pinned mid-air by telekinesis: violet outline glow, a helpless shiver
    const u = smooth((k - T.psi - 20) / 30), sh = calmMotion() ? 0 : (hash(S.real, 7) - 0.5) * 3 * z
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(tp.x, tp.y - 50 * z, 6, tp.x, tp.y - 50 * z, 90 * z); g.addColorStop(0, `rgba(200,90,255,${(0.45 * u).toFixed(3)})`); g.addColorStop(1, 'rgba(200,90,255,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tp.x, tp.y - 50 * z, 90 * z, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    for (const o of [[-3, 0], [3, 0], [0, -3], [0, 3]]) sprite(ctx, t, ['hurt', 'idle'], 1, tp.x + sh + o[0] * z, tp.y + o[1] * z, z, fd, { tint: '#d07aff', tintA: 1, alpha: 0.85 * u })
    // violet telekinetic bands wrapping the body
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let j = 0; j < 3; j++) ring(ctx, tp.x, tp.y - (20 + j * 30) * z, (34 + 6 * Math.sin(S.real * 0.2 + j)) * z, 0.7 * u, '#e09aff', 3 * z, 0.3)
    ctx.restore()
    // a shadow left on the floor beneath the lifted body
    { const gp = V.p(S.tx0, S.tFloor); ctx.save(); ctx.globalAlpha = 0.35 * u; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(gp.x, gp.y, 30 * z, 7 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
    sprite(ctx, t, ['hurt', 'idle'], 1, tp.x + sh, tp.y, z, fd)
    return
  }
  if (k < T.land) { sprite(ctx, t, ['hurt', 'idle'], 3, tp.x, tp.y, z, fd, { rot: (k - T.boom) * 0.22 * d, tint: k < T.boom + 4 ? '#ffffff' : null, tintA: 0.8 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fd)
  if (k < T.land + 18) { const u = (k - T.land) / 18; ctx.save(); ctx.globalAlpha = (1 - u) * 0.7; ctx.fillStyle = '#d8c8b0'; ctx.beginPath(); ctx.ellipse(tp.x, tp.y, (30 + u * 90) * z, (8 + u * 12) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}

function rubble(ctx, S, V, k, fp) {
  const z = V.z, lift = smooth((k - T.psi - 6) / 30), fall = k >= T.boom ? smooth((k - T.boom) / 34) : 0
  ctx.save()
  for (let i = 0; i < 22; i++) {
    const wx = S.fx0 + (hash(i, 41) - 0.3) * 900 * S.dir, h0 = 30 + hash(i, 42) * 220, bob = calmMotion() ? 0 : Math.sin(S.real * 0.05 + i) * 6
    const p = V.p(wx, S.floor - h0 * lift * (1 - fall) - bob * (1 - fall)), sz = (4 + hash(i, 43) * 14) * z
    ctx.globalAlpha = 0.9; ctx.fillStyle = i % 3 ? '#8b7458' : '#6a5844'
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(S.real * 0.02 * (hash(i, 44) - 0.5) + i)
    ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.7); ctx.fillStyle = 'rgba(160,255,200,0.35)'; ctx.fillRect(-sz / 2, -sz / 2, sz, 2)
    ctx.restore()
  }
  ctx.restore()
  void fp
}

function boom(ctx, W, H, S, V, br, bc) {
  const z = V.z, u = br / 60
  // the bomb sheet's own detonation frames (6..9), blown up past the screen
  const fi = 6 + Math.min(1, Math.floor(br / 8))
  fxCell(ctx, fi, bc.x, bc.y, (120 + 260 * outE(u * 2)) * z, clamp(1 - u * 2.2, 0, 1))
  // a hemispherical dome of white-cyan light swelling off the floor
  { const dr = (100 + 420 * outE(u * 1.4)) * z, da = clamp(1 - u * 1.3, 0, 1)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = da
    const dg = ctx.createRadialGradient(bc.x, bc.y + 60 * z, dr * 0.1, bc.x, bc.y + 60 * z, dr); dg.addColorStop(0, 'rgba(255,255,255,0.95)'); dg.addColorStop(0.6, 'rgba(150,235,255,0.55)'); dg.addColorStop(1, 'rgba(255,120,220,0)')
    ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(bc.x, bc.y + 60 * z, dr, dr * 0.85, 0, Math.PI, 0); ctx.fill(); ctx.restore() }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(bc.x, bc.y, 0, bc.x, bc.y, (60 + 700 * outE(u)) * z); g.addColorStop(0, `rgba(255,255,255,${(1 - u).toFixed(3)})`); g.addColorStop(0.4, `rgba(140,230,255,${(0.7 * (1 - u)).toFixed(3)})`); g.addColorStop(1, 'rgba(255,90,200,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
  for (let j = 0; j < 3; j++) ring(ctx, bc.x, bc.y + 50 * z, (40 + outE(clamp(u * 1.5 - j * 0.12, 0, 1)) * 900) * z, (1 - u) * 0.9, j ? '#ff7ad9' : '#ffffff', (10 - j * 3) * z, 0.28)
  if (!calmMotion()) { ctx.save(); for (let i = 0; i < 30; i++) { const an = -Math.PI * hash(i, 51), r = (40 + outE(u) * (300 + hash(i, 52) * 500)) * z
    ctx.globalAlpha = 1 - u; ctx.fillStyle = i & 1 ? '#7a6450' : '#bfe8ff'; const sz = (4 + hash(i, 53) * 10) * z
    ctx.fillRect(bc.x + Math.cos(an) * r, bc.y + Math.sin(an) * r * 0.8 + u * u * 200 * z, sz, sz) } ctx.restore() }
}
function smokeColumn(ctx, S, V, k, bc) {
  const z = V.z, u = clamp((k - T.boom) / 60, 0, 1), a = 0.75 * Math.min(1, (k - T.boom) / 10) * clamp((T.land + 20 - k) / 40, 0, 1)
  ctx.save()
  for (let i = 0; i < 18; i++) {
    const hh = (i / 18) * 420 * outE(u), x = bc.x + (hash(i, 61) - 0.5) * 70 * z * (1 + i / 9), y = bc.y + 60 * z - hh * z, r = (34 + i * 3 + 30 * u) * z
    ctx.globalAlpha = a * (0.5 - i * 0.015); ctx.fillStyle = i < 3 ? '#5a4a52' : '#8a7f86'
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  // the cap of the mushroom
  const cy = bc.y + 60 * z - 420 * outE(u) * z
  ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#9a8c92'; ctx.beginPath(); ctx.ellipse(bc.x, cy, (90 + 120 * u) * z, (40 + 50 * u) * z, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
function limiterPanel(ctx, W, H, S, k) {   // a manga strip: the limiter pins on his head crackle — the power slips its leash
  const u = (k - T.psi - 4) / 26, a = Math.min(clamp((k - T.psi - 4) / 4, 0, 1), clamp((T.psi + 30 - k) / 5, 0, 1))
  const pw = W * 0.24, ph = H * 0.34, px = S.dir > 0 ? W * 0.72 : W * 0.04, py = H * 0.16
  ctx.save(); ctx.globalAlpha = a
  ctx.beginPath(); ctx.moveTo(px, py + 8); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw - 6, py + ph); ctx.lineTo(px + 4, py + ph - 6); ctx.closePath()
  ctx.fillStyle = '#120818'; ctx.fill(); ctx.save(); ctx.clip()
  speedLines(ctx, W, H, px + pw / 2, py + ph / 2, 40, 9, '#ff7ad9', 0.5, false, S.real)
  { const st = ph / 24, zz = st / (S.caster.spriteScale || 2.2); sprite(ctx, S.caster, ['idle'], 0, px + pw / 2, py + ph * 0.04 + 52 * st, zz, S.dir) }
  for (const sx of [-0.2, 0.2]) star(ctx, px + pw * (0.5 + sx), py + ph * 0.12, ph * 0.12 * (1 + 0.3 * Math.sin(S.real)), 1, S.real * 0.2, '255,120,220')
  ctx.restore()
  ctx.lineWidth = 3; ctx.strokeStyle = '#ff7ad9'; ctx.stroke()
  ctx.font = `900 ${Math.round(H * 0.03)}px Impact, sans-serif`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText('LIMITERS STRAINING', px + pw / 2, py + ph + H * 0.04)
  ctx.restore()
  void u
}
function impactFrames(ctx, W, H, S, V, br, tp, fp) {
  if (calmFlash()) return
  const z = V.z, sil = (bg, fg) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 17 + br, fg, 0.9, false, br)
    sprite(ctx, S.caster, ['saikiBomb', 'idle'], 4, fp.x, fp.y, z, S.dir, { tint: fg, tintA: 1 })
    sprite(ctx, S.target, ['hurt', 'idle'], 3, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  }
  if (br < 4) sil('#ffffff', '#000000')
  else if (br < 8) sil('#000000', '#ffffff')
}
function yareCard(ctx, W, H, S, k) {   // やれやれ — he turns away; the card stamps quietly
  const a = Math.min(clamp((k - T.land) / 6, 0, 1), clamp((T.out + 10 - k) / 8, 0, 1))
  ctx.save(); ctx.globalAlpha = a
  ctx.font = `300 ${Math.round(H * 0.05)}px "Helvetica Neue", system-ui, sans-serif`; ctx.textAlign = S.dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'
  const x = S.dir > 0 ? W * 0.06 : W * 0.94
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 5
  ctx.strokeText('やれやれ…', x, H * 0.22); ctx.fillText('やれやれ…', x, H * 0.22)
  ctx.font = `700 ${Math.round(H * 0.022)}px system-ui, sans-serif`; ctx.fillStyle = '#ff9ad9'; ctx.fillText('YARE YARE — GOOD GRIEF', x, H * 0.27)
  ctx.restore()
}
