// isshikiUltFx.js — RENDER-ONLY half of Isshiki's "大黒天 · DAIKOKUTEN" cinematic (isshikiUlt.js). One screen pass
// (world→screen from camera.js): the dimmed stage with golden motes, his portrait close-up, his real cast strips, the
// Sukunahikona ring (his own ring art) and the shrunken foe, procedural Daikokuten cubes (black, red-etched) that grow as
// they fall, his rod art raining down, the stage-sized judgement cube + its swallowing shadow, impact frames, dust,
// titles, subtitles, letterbox. Pure functions of the scene's frames; noise = integer hash.
import { IS, foeScale } from './isshikiUlt.js'
import { image, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  letterbox, subtitle, lineA, kanjiTitle, damagePops, glow, rings, wash, desat, cracks, portraitPanel, strip } from './narutoUltFxKit.js'

const PORTRAIT = './isshiki_portrait.png', RINGS = './isshiki_suku_rings_uniform.png', RODS = './isshiki_ult_rods_uniform.png'
const GOLD = '255,214,120'

export function preloadIsshikiUlt(f, t) {
  image(PORTRAIT); image(RINGS); image(RODS)
  for (const k of ['idle', 'isshikiSukuCast', 'isshikiUltCast', 'isshikiRodCast', 'win']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

export function drawIsshikiUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const big = S.nums?.find(n => n.big), jr = big ? S.real - big.real : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 14, y: (hash(S.real, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  const ip = V.p(S.fx0, S.floor), qp = V.p(S.tx0, S.tFloor), floorY = qp.y, fs = foeScale(k)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the stage dims to a cold, god's-eye grey; golden motes drift up
  const dimA = k < IS.growAt + 20 ? smooth(k / 24) : 1 - smooth((k - IS.growAt - 20) / 26)
  desat(ctx, W, H, 0.7 * dimA, '#1c1820', 0.55)
  if (!calmMotion()) motes(ctx, W, H, S.real, dimA)
  // the judgement shadow: the sky goes black from the top as the colossal cube descends
  const ju = k >= IS.judgeAt ? clamp((k - IS.judgeAt) / (IS.slamAt - IS.judgeAt), 0, 1) : 0
  if (k >= IS.judgeAt && k < IS.slamAt + 30) wash(ctx, W, H, '#000000', 0.55 * smooth(ju) * (k < IS.slamAt ? 1 : 1 - (k - IS.slamAt) / 30), 'multiply')

  // 2) fighters
  drawIsshiki(ctx, S, V, k, ip)
  drawFoe(ctx, S, V, k, qp, fs)

  // 3) Sukunahikona: the ring of light snapping shut around the foe
  if (k >= IS.shrinkAt && k < IS.shrinkAt + 24) {
    const a = k - IS.shrinkAt, fr = Math.min(3, a >> 2)
    strip(ctx, RINGS, 4, fr, qp.x, qp.y - 40 * z, z * 1.8 * (1.4 - a / 30), { ay: 0.5, comp: 'lighter', alpha: 1 - a / 24 })
    glow(ctx, qp.x, qp.y - 40 * z, 120 * z, GOLD, 0.7 * (1 - a / 24))
    // the beam from his palm
    if (a < 12) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${GOLD},${(0.8 * (1 - a / 12)).toFixed(3)})`; ctx.lineWidth = 4 * z; ctx.beginPath(); ctx.moveTo(ip.x + dir * 20 * z, ip.y - 60 * z); ctx.lineTo(qp.x, qp.y - 40 * z); ctx.stroke(); ctx.restore() }
  }

  // 4) the Daikokuten cubes: pulled from frozen time, growing as they drop, crushing the tiny foe
  IS.cubes.forEach((cb, i) => {
    if (k < cb.at || k > cb.hit + 26) return
    const u = clamp((k - cb.at) / (cb.hit - cb.at), 0, 1), size = (14 + 110 * outE(u)) * z * (1 + i * 0.15)
    const x = qp.x + (i - 1) * 14 * z, y = k < cb.hit ? lerpN(floorY - 360 * z, floorY, u * u) : floorY
    const fade = k > cb.hit + 12 ? 1 - (k - cb.hit - 12) / 14 : 1
    if (k < cb.at + 8) glow(ctx, ip.x + dir * 24 * z, ip.y - 70 * z, 40 * z, '255,60,60', 1 - (k - cb.at) / 8)
    if (k < cb.hit) cubeShadow(ctx, x, floorY, size, u)
    cube(ctx, x, y, size, fade, (hash(i, 3) - 0.5) * 0.12 * (1 - u))
    if (fade < 1) dissolve(ctx, x, y, size, 1 - fade, i)
    if (k >= cb.hit && k < cb.hit + 18) { const a = (k - cb.hit) / 18; dust(ctx, x, floorY, z, a, i * 7, 1 + i * 0.3); rings(ctx, x, floorY - 4 * z, a, 260 * z, '#ffffff', 2, 0.25, 6 * z) }
  })
  if (k >= IS.cubes[0].hit) { ctx.save(); ctx.globalAlpha = k < IS.growAt + 30 ? 1 : 1 - (k - IS.growAt - 30) / 20; cracks(ctx, qp.x, floorY + 2, 220 * z, clamp((k - IS.cubes[0].hit) / 50, 0, 1), 31, 14, '#120a0a', 'rgba(255,90,60,0.45)'); ctx.restore() }

  // 5) the rods: a rain of colossal spears (his own rod art)
  if (k >= IS.rodAt && k < IS.judgeAt + 30) {
    const fade = k < IS.judgeAt ? 1 : 1 - (k - IS.judgeAt) / 30
    for (let i = 0; i < 9; i++) {
      const at = IS.rodAt + 4 + i * 3, u = clamp((k - at) / 6, 0, 1); if (k < at) continue
      const x = qp.x + (i % 2 ? 1 : -1) * (12 + ((i * 37) % 90)) * z * (i < 4 ? 0.4 : 1), y = lerpN(floorY - 520 * z, floorY + 30 * z, outE(u))
      strip(ctx, RODS, 4, i % 4, x, y, z * 2.1, { alpha: fade, rot: (hash(i, 2) - 0.5) * 0.3 })
      if (u >= 1 && k < at + 10) rings(ctx, x, floorY, (k - at - 6) / 10, 70 * z, '#ffe0c0', 1, 0.3, 4 * z)
    }
  }

  // 6) JUDGEMENT: the cube the size of the stage
  if (k >= IS.judgeAt && k < IS.slamAt + 40) {
    const u = clamp((k - IS.judgeAt) / (IS.slamAt - IS.judgeAt), 0, 1), size = W * (0.2 + 0.04 * u), y = k < IS.slamAt ? lerpN(-size * 0.2, floorY + size * 0.04, u * u * u) : floorY + size * 0.04
    const fade = k > IS.slamAt + 20 ? 1 - (k - IS.slamAt - 20) / 20 : 1
    cube(ctx, qp.x, y, size, fade, 0)
    if (fade < 1) dissolve(ctx, qp.x, y, size, 1 - fade, 9)
    if (k < IS.slamAt) speedLines(ctx, W, H, qp.x, floorY, 60, 17, '#ffffff', 0.35 * u, true, S.real)
    if (k >= IS.slamAt && k < IS.slamAt + 30) dust(ctx, qp.x, floorY, z, (k - IS.slamAt) / 30, 99, 3.2)
  }

  // 7) close-ups + impact frames on the judgement
  if (k >= 10 && k < IS.shrinkAt) punchIn(ctx, canvas, W, H, ip.x, ip.y - 70 * z, 1 + 0.25 * smooth((k - 10) / 20))
  if (jr >= 0 && jr < 4) punchIn(ctx, canvas, W, H, qp.x, floorY - 40 * z, 1.35)
  if (jr >= 3 && jr < 11 && !calmFlash()) {
    const white = jr < 7, bg = white ? '#ffffff' : '#140404', fg = white ? '#140404' : '#ff5a4a'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, qp.x, floorY, 90, 41 + jr, fg, 0.9, false, jr)
    ctx.fillStyle = fg; const sz = W * 0.24; ctx.fillRect(qp.x - sz / 2, floorY - sz, sz, sz)
    ctx.restore()
  }
  damagePops(ctx, W, H, S, V, '#ff5a4a')
  ctx.restore()

  // 8) panels / titles
  if (k < IS.shrinkAt + 2) { const a = Math.min(clamp(S.real / 6, 0, 1), clamp((IS.shrinkAt + 2 - k) / 6, 0, 1)), ph = H * 0.52, pw = ph * 0.96
    const px = dir > 0 ? W * 0.05 : W * 0.95 - pw
    portraitPanel(ctx, PORTRAIT, null, px, H * 0.16, pw, ph, { alpha: a, bg: '#e8e2d8', edge: '#000', zoom: 1 + 0.06 * smooth(k / 40) }) }
  if (k >= 6 && k < IS.shrinkAt + 2) kanjiTitle(ctx, W, H, '大筒木', 'ŌTSUTSUKI', (k - 6) / (IS.shrinkAt - 4), { side: dir, fill: '#fff6e0', stroke: '#2a0a04', edge: '#ffc860' })
  if (k >= IS.shrinkAt + 4 && k < IS.cubeAt + 4) kanjiTitle(ctx, W, H, '少名毘古那', 'SUKUNAHIKONA', (k - IS.shrinkAt - 4) / (IS.cubeAt - IS.shrinkAt), { side: -dir, fill: '#fff6e0', stroke: '#2a0a04', edge: '#ffe080', fs: 0.085 })
  if (k >= IS.cubeAt + 6 && k < IS.judgeAt) kanjiTitle(ctx, W, H, '大黒天', 'DAIKOKUTEN', (k - IS.cubeAt - 6) / (IS.judgeAt - IS.cubeAt - 6), { side: dir, fill: '#ffe6e0', stroke: '#200000', edge: '#ff4030', fs: 0.13 })
  if (jr >= 12 && k < IS.growAt) callout(ctx, W, H, jr, dir)

  letterbox(ctx, W, H, k, S.real, IS.total)
  subtitle(ctx, W, H, 'ISSHIKI', "No matter how you resist, the result won't change.", lineA(k, 2, IS.shrinkAt), '#ffc860')
  subtitle(ctx, W, H, 'ISSHIKI', 'Begone.', lineA(k, IS.shrinkAt, IS.cubeAt), '#ffc860')
  subtitle(ctx, W, H, 'ISSHIKI', 'This ends you.', lineA(k, IS.growAt + 8, IS.total - 2), '#ffc860')
  return true
}
const lerpN = (a, b, u) => a + (b - a) * u

function drawIsshiki(ctx, S, V, k, ip) {
  const f = S.caster, z = V.z, dir = S.dir
  if (k < IS.shrinkAt) { sprite(ctx, f, ['idle'], 0, ip.x, ip.y, z, dir); return }
  if (k < IS.cubeAt) { sprite(ctx, f, ['isshikiSukuCast', 'idle'], k < IS.shrinkAt + 6 ? 0 : 1, ip.x, ip.y, z, dir); return }
  if (k < IS.rodAt) { const near = IS.cubes.some(c => k >= c.at && k < c.at + 10); sprite(ctx, f, ['isshikiUltCast', 'idle'], near ? 1 : 0, ip.x, ip.y, z, dir); return }
  if (k < IS.judgeAt) { sprite(ctx, f, ['isshikiRodCast', 'idle'], Math.min(2, (k - IS.rodAt) >> 3), ip.x, ip.y, z, dir); return }
  if (k < IS.growAt) { sprite(ctx, f, ['isshikiUltCast', 'idle'], 1, ip.x, ip.y, z, dir); return }
  sprite(ctx, f, ['win', 'idle'], 0, ip.x, ip.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp, fs) {
  const t = S.target, z = V.z, fdir = -S.dir
  // hidden under the judgement cube while it sits on them
  if (k >= IS.slamAt - 1 && k < IS.slamAt + 22) return
  const hitRecent = S.nums?.some(n => S.real - n.real < 8)
  const sh = hitRecent && !calmMotion() ? (hash(S.real, 7) - 0.5) * 5 * z : 0
  if (S.blocked) { sprite(ctx, t, k < IS.shrinkAt ? ['idle'] : ['guard', 'idle'], 9, qp.x + sh, qp.y, z, fdir, { s: fs }); return }
  if (k < IS.cubes[0].hit) { sprite(ctx, t, k < IS.shrinkAt + 6 ? ['idle'] : ['hurt', 'idle'], 0, qp.x, qp.y, z, fdir, { s: fs, tint: k >= IS.shrinkAt && k < IS.shrinkAt + 20 ? '#ffe9a0' : undefined, tintA: 0.5 }); return }
  if (k < IS.growAt) { sprite(ctx, t, hitRecent ? ['hurt', 'idle'] : ['knockdown', 'hurt'], hitRecent ? 0 : 9, qp.x + sh, qp.y, z, fdir, { s: fs, sy: hitRecent ? 0.8 : 1 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir, { s: fs })
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// a Daikokuten cube: black, red-etched concentric squares, a lit top face; bottom-centred on (x, y), edge = size
function cube(ctx, x, y, size, a, rot) {
  if (a <= 0 || size < 2) return
  const d = size * 0.28
  ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(x, y); ctx.rotate(rot)
  const L = -size / 2, T = -size
  // top + side faces
  ctx.fillStyle = '#3a2224'; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L + d, T - d * 0.6); ctx.lineTo(L + size + d, T - d * 0.6); ctx.lineTo(L + size, T); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#140a0b'; ctx.beginPath(); ctx.moveTo(L + size, T); ctx.lineTo(L + size + d, T - d * 0.6); ctx.lineTo(L + size + d, -d * 0.6); ctx.lineTo(L + size, 0); ctx.closePath(); ctx.fill()
  // front face
  const g = ctx.createLinearGradient(L, T, L + size, 0); g.addColorStop(0, '#2a1a1c'); g.addColorStop(1, '#0c0607')
  ctx.fillStyle = g; ctx.fillRect(L, T, size, size)
  ctx.strokeStyle = '#c0383a'; ctx.lineWidth = Math.max(1, size * 0.018)
  for (const s of [0.86, 0.6, 0.34]) ctx.strokeRect(-size * s / 2, T + size * (1 - s) / 2, size * s, size * s)
  ctx.strokeStyle = '#d24a48'; ctx.lineWidth = Math.max(1, size * 0.012); ctx.strokeRect(L, T, size, size)
  ctx.restore()
}
function cubeShadow(ctx, x, y, size, u) { ctx.save(); ctx.globalAlpha = 0.25 + 0.4 * u; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y + 2, size * 0.7, size * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
function dissolve(ctx, x, y, size, u, seed) {   // the cube breaking into black motes that drift up
  ctx.save()
  for (let i = 0; i < 40; i++) { const px = x + (hash(seed, i) - 0.5) * size, py = y - hash(seed + 1, i) * size - u * (40 + hash(seed + 2, i) * 120), s = (3 + hash(seed + 3, i) * 8) * (1 - u)
    ctx.globalAlpha = (1 - u) * 0.9; ctx.fillStyle = i % 3 ? '#140a0b' : '#c0383a'; ctx.fillRect(px, py, s, s) }
  ctx.restore()
}
function dust(ctx, x, y, z, u, seed, sc) {
  ctx.save()
  for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1, r = (20 + hash(seed, i) * 50) * z * sc * (0.5 + u), px = x + side * (30 + u * 180 * hash(seed + 1, i)) * z * sc, py = y - hash(seed + 2, i) * 40 * z * sc * u
    const g = ctx.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, i % 3 ? 'rgba(120,110,100,0.32)' : 'rgba(160,150,140,0.28)'); g.addColorStop(1, 'rgba(120,110,100,0)')
    ctx.globalAlpha = (1 - u); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function motes(ctx, W, H, real, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 40; i++) { const x = hash(i, 1) * W, y = H - ((real * (0.6 + hash(i, 2)) + hash(i, 3) * H) % H), r = 1 + hash(i, 4) * 2.5
    ctx.globalAlpha = a * (0.3 + 0.5 * hash(i, 5)); ctx.fillStyle = `rgb(${GOLD})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function callout(ctx, W, H, jr, dir) {
  const su = clamp((jr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (jr - 56) / 12, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.28 : 0.72), H * 0.22); ctx.rotate(-0.05 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.1)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#200000'; ctx.strokeText('大黒天!!', 0, 0); ctx.fillStyle = '#fff0e8'; ctx.fillText('大黒天!!', 0, 0)
  ctx.restore()
}
