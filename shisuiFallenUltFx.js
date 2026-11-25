// shisuiFallenUltFx.js — RENDER-ONLY half of Shisui (Fallen)'s "瞬身 · 千の影 — BODY FLICKER: THOUSAND SHADOWS"
// (shisuiFallenUlt.js). One screen pass (world→screen from camera.js): crimson-grey world wash, the portrait + turning
// Mangekyō, the vanish smear, his real finisher / heavy strips at every strike, the closing ring of after-images, crimson cut
// arcs, the time-stop eye band + the crow flock, the thrust's white / inverted impact frames and screen-wide cut, the crows and
// feathers of the aftermath, titles, subtitles, letterbox. Pure functions of the scene's frames; noise = integer hash.
import { SF, STRIKE, strikeIndex } from './shisuiFallenUlt.js'
import { sprite, view, punchIn, speedLines, hLines, wash, desat, calligraphy, sub, letterbox, glow, rings, impactFrame, damageNumber,
  image, ready, hash, clamp, smooth, outE, calmMotion, calmFlash } from './bleachUltKit.js'
import { kanjiTitle, portraitPanel, skinned } from './narutoUltFxKit.js'

const FIN = './shisui_fallen_finisher_uniform.png', PORTRAIT = './shisui_fallen_portrait.png', EYE = './shisui_fallen_mangekyou_uniform.png'
const finSheet = f => ({ sheet: skinned(f, FIN), frames: 10, width: 112, height: 81 })
const CRIMSON = '200,20,30', WHO = 'SHISUI', WHO_COL = '#ff4a4a'
const STRIKE_FRAME = [4, 5, 6, 7, 5]

export function drawShisuiFallenUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const cr = S.hitReal != null ? S.real - S.hitReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 10, y: (hash(S.real, 2) - 0.5) * 10 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), foeMid = V.p(S.tx, S.tFloor - (S.ty || 0) - 55)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the world drains to crimson-grey (the Mangekyō's world)
  const wa = k < SF.thrustAt + 40 ? smooth(k / 24) : 1 - smooth((k - SF.thrustAt - 40) / 30)
  desat(ctx, W, H, 0.85 * wa); wash(ctx, W, H, '#5a0610', 0.38 * wa, 'multiply')
  if (k >= SF.stopAt && k < SF.thrustAt) wash(ctx, W, H, '#140006', 0.45 * smooth((k - SF.stopAt) / 12), 'multiply')
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(20,0,4,${(0.7 * wa).toFixed(3)})`)
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

  // 2) the after-image ring (on the floor around the foe) — more shadows after every cut; back half behind the foe
  const ring = ringPts(S, k, foeMid, tp, z)
  for (const g of ring) if (g.back) ghost(ctx, f, g.x, g.y, z, g.face, g.i, g.a, k)

  // 3) the foe
  drawFoe(ctx, S, k, tp, z, cr)

  // 4) Shisui (or his absence)
  drawShisui(ctx, S, k, fp, z, cr)

  for (const g of ring) if (!g.back) ghost(ctx, f, g.x, g.y, z, g.face, g.i, g.a, k)

  // 5) the cuts: a crimson crescent + spark ring at each strike
  SF.strikes.forEach((at, i) => { const a = k - at; if (a < 0 || a > 12) return
    slashArc(ctx, foeMid.x, foeMid.y - STRIKE[i].h * 0.3 * z, 90 * z, i, a / 12)
    if (a < 4) glow(ctx, foeMid.x, foeMid.y, 110 * z, '255,230,230', 0.8 - a * 0.2)
    rings(ctx, foeMid.x, foeMid.y, a / 12, 2, 130 * z, `rgba(${CRIMSON},1)`, 6 * z, 0.7) })
  if (k >= SF.vanishAt && k < SF.stopAt) hLines(ctx, W, H * 0.15, H * 0.85, 26, 17, '#ffd0d0', 0.18, S.real, dir)

  // 6) the time-stop: crows wheel over the stage
  if (k >= SF.stopAt - 6 && k < SF.thrustAt + 70) crows(ctx, S, k, foeMid, z, W, H)

  // 7) the thrust: screen-wide cut + impact frames
  if (cr >= 0 && cr < 30) {
    const u = clamp(cr / 6, 0, 1), a = 1 - clamp((cr - 18) / 12, 0, 1), y0 = foeMid.y + 18 * z
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a
    for (const [lw, col] of [[26 * z, `rgba(${CRIMSON},0.45)`], [10 * z, 'rgba(255,90,90,0.9)'], [3 * z, '#ffffff']]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(W / 2 - dir * W * 0.7 * u, y0 + 60 * z * u); ctx.lineTo(W / 2 + dir * W * 0.7 * u, y0 - 60 * z * u); ctx.stroke() }
    ctx.restore()
  }
  if (k >= SF.thrustAt - 10 && k < SF.thrustAt) speedLines(ctx, W, H, foeMid.x, foeMid.y, 70, 41, '#2a0006', 0.6, true, S.real)

  // 8) close-ups
  if (k >= 10 && k < SF.vanishAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 80 * z, 1 + 0.32 * smooth((k - 10) / 24))
  else if (k >= SF.vanishAt && k < SF.stopAt) punchIn(ctx, canvas, W, H, foeMid.x, foeMid.y + 30 * z, 1.25 + (S.lastCut && S.real - S.lastCut.real < 5 ? 0.18 - (S.real - S.lastCut.real) * 0.035 : 0))
  else if (k >= SF.stopAt + 8 && k < SF.thrustAt) punchIn(ctx, canvas, W, H, foeMid.x, foeMid.y, 1 + 0.2 * smooth((k - SF.stopAt - 8) / 24))
  else if (cr >= 0 && cr < 4) punchIn(ctx, canvas, W, H, foeMid.x, foeMid.y, 1.45)
  if (cr >= 2 && cr < 12 && !calmFlash()) {
    const white = cr < 7, bg = white ? '#ffffff' : '#0a0003', fg = white ? '#0a0003' : '#ff3040'
    impactFrame(ctx, W, H, bg, fg, W / 2 + dir * W * 0.08, H * 0.55, 61 + cr, S.real, col => {
      const Z = Math.max(z * 1.9, 2.4), cy = H * 0.72
      sprite(ctx, t, ['hurt', 'idle'], 0, W / 2 + dir * W * 0.08, cy, Z, -dir, { tint: col, tintA: 1, rot: -dir * 0.25 })
      sprite(ctx, f, finSheet(f), 7, W / 2 + dir * W * 0.22, cy, Z, dir, { tint: col, tintA: 1 })
    })
  }

  // 9) numbers
  if (S.lastHit && S.real - S.lastHit.real < 22 && cr < 0) {
    const age = S.real - S.lastHit.real, fs = Math.round(H * 0.05 * (1 + Math.max(0, 1 - age / 5) * 0.7))
    ctx.save(); ctx.globalAlpha = clamp(1.4 - age / 16, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const x = clamp(foeMid.x + (hash(S.hits, 3) - 0.5) * 80, W * 0.1, W * 0.9), y = clamp(foeMid.y - 60 * z - age * 1.5, H * 0.18, H * 0.8)
    ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#1a0000'; ctx.strokeText(String(Math.round(S.lastHit.d)), x, y); ctx.fillStyle = S.blocked ? '#ffd27a' : '#ff4040'; ctx.fillText(String(Math.round(S.lastHit.d)), x, y); ctx.restore()
  }
  if (cr >= 12) damageNumber(ctx, W, H, S, foeMid.x, foeMid.y - 90 * z, cr - 12, '#ff3040')
  ctx.restore()

  // 10) panels / titles / eye band
  if (k < SF.vanishAt + 2) {
    const a = Math.min(clamp(S.real / 6, 0, 1), clamp((SF.vanishAt + 2 - k) / 6, 0, 1)), ph = H * 0.5
    portraitPanel(ctx, PORTRAIT, [60, 0, 300, 260], dir > 0 ? W * 0.05 : W * 0.95 - ph * 1.05, H * 0.17, ph * 1.05, ph, { alpha: a, bg: '#2a0a0e', edge: '#000', zoom: 1 + 0.08 * smooth(k / 40) })
    mangekyou(ctx, dir > 0 ? W * 0.05 + ph * 0.86 : W * 0.95 - ph * 0.86, H * 0.17 + ph * 0.12, H * 0.07 * a, S.real * 0.06, a)
  }
  if (k >= 6 && k < SF.vanishAt + 4) calligraphy(ctx, W, H, '瞬身', (k - 6) / (SF.vanishAt - 2), { x: dir > 0 ? 0.86 : 0.14, y: 0.24, col: '#fff0f0', edge: '#2a0008', glow: 'rgba(255,40,60,0.8)' })
  if (k >= SF.vanishAt + 4 && k < SF.vanishAt + 60) kanjiTitle(ctx, W, H, '千の影', 'THOUSAND SHADOWS', (k - SF.vanishAt - 4) / 56, { side: -dir, fill: '#fff0f0', stroke: '#2a0008', edge: '#ff3040', ink: 'rgba(20,0,4,0.75)', fs: 0.11 })
  if (k >= SF.stopAt && k < SF.thrustAt + 2) eyeBand(ctx, W, H, k, S.real)
  if (cr >= 12 && cr < 70) callout(ctx, W, H, cr, dir)

  letterbox(ctx, W, H, S.real, k, SF.total - 14)
  sub(ctx, W, H, k, 2, SF.vanishAt, WHO, 'They call me Shisui of the Body Flicker.', WHO_COL)
  sub(ctx, W, H, k, SF.vanishAt + 8, SF.stopAt - 4, WHO, 'A thousand shadows — and every one of them is me.', WHO_COL)
  sub(ctx, W, H, k, SF.stopAt + 4, SF.thrustAt - 2, WHO, 'Look closely. Which one is real?', WHO_COL)
  sub(ctx, W, H, k, SF.thrustAt + 34, SF.total - 2, WHO, 'You never saw me move.', WHO_COL)
  return true
}

function ringPts(S, k, foeMid, tp, z) {
  const out = []
  if (k < SF.vanishAt + 6 || k >= SF.thrustAt + 4) return out
  const done = SF.strikes.filter(a => k >= a).length, n = Math.min(14, 2 + done * 2 + (k >= SF.stopAt ? 4 : 0))
  const close = k >= SF.stopAt ? smooth((k - SF.stopAt) / (SF.thrustAt - SF.stopAt)) : 0
  for (let i = 0; i < n; i++) {
    const an = i / n * Math.PI * 2 + (k >= SF.stopAt ? 0.4 : S.real * 0.03) + hash(i, 4) * 0.25
    const R = (175 - close * 70) * z, x = foeMid.x + Math.cos(an) * R, y = tp.y + Math.sin(an) * 26 * z
    const born = i < 2 ? SF.vanishAt + 6 : SF.strikes[Math.min(4, (i - 2) >> 1)] ?? SF.stopAt
    const a = clamp((k - born) / 8, 0, 1) * (0.62 + 0.3 * close)
    out.push({ x, y, i, back: Math.sin(an) < 0, face: x < foeMid.x ? 1 : -1, a })
  }
  return out.sort((p, q) => p.y - q.y)
}

// ── people ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawShisui(ctx, S, k, fp, z, cr) {
  const f = S.caster, dir = S.dir, face = S.fFace || dir
  if (k < SF.vanishAt) {   // the glare: idle → drawing the blade
    sprite(ctx, f, k < 24 ? ['idle'] : ['kunaiCast', 'idle'], k < 24 ? (S.real >> 3) % 2 : Math.min(2, (k - 24) >> 3), fp.x, fp.y, z, dir)
    glow(ctx, fp.x + dir * 6 * z, fp.y - 96 * z, 26 * z, CRIMSON, 0.5 + 0.4 * Math.sin(S.real * 0.3))
    return
  }
  if (k < SF.vanishAt + 12) {   // the vanish: a shadow smear + leaves where he stood
    const u = (k - SF.vanishAt) / 12
    sprite(ctx, f, finSheet(f), 3, fp.x, fp.y, z, dir, { alpha: 1 - u, s: 1 + u * 0.4 })
    leaves(ctx, fp.x, fp.y - 50 * z, u, z, 7)
    return
  }
  if (k < SF.stopAt) {
    const i = strikeIndex(k); if (i < 0) return
    const at = SF.strikes[i], a = k - at
    if (a < -6) return
    // arrive: a short after-image streak from the previous spot
    if (a < 0) { const u = (a + 6) / 6; sprite(ctx, f, finSheet(f), 3, fp.x - face * (1 - u) * 80 * z, fp.y, z, face, { alpha: 0.4 + 0.6 * u, tint: '#200006', tintA: 0.6 * (1 - u) }); return }
    for (let g = 3; g >= 1; g--) sprite(ctx, f, finSheet(f), STRIKE_FRAME[i], fp.x - face * g * 22 * z, fp.y, z, face, { alpha: 0.12 * (4 - g), tint: '#ff2030', tintA: 0.7 })
    sprite(ctx, f, finSheet(f), a < 10 ? STRIKE_FRAME[i] : 8, fp.x, fp.y, z, face)
    return
  }
  if (k < SF.thrustAt) {   // the real one, low behind the shadows, blade back
    const u = smooth((k - SF.stopAt) / 20)
    sprite(ctx, f, finSheet(f), k < SF.thrustAt - 10 ? 1 : 2, fp.x, fp.y, z, dir, { alpha: u })
    glow(ctx, fp.x + dir * 8 * z, fp.y - 92 * z, 30 * z, CRIMSON, u * (0.6 + 0.3 * Math.sin(S.real * 0.5)))
    return
  }
  // the thrust is through: he stands beyond the foe, back turned, blade low; then the idle
  if (cr >= 0 && cr < 10) for (let g = 6; g >= 1; g--) sprite(ctx, f, finSheet(f), 7, fp.x - dir * g * 34 * z, fp.y, z, dir, { alpha: 0.08 * (7 - g), tint: '#ff2030', tintA: 0.8 })
  const late = k > SF.thrustAt + 44
  sprite(ctx, f, late ? ['idle'] : finSheet(f), late ? (S.real >> 3) % 2 : (k < SF.thrustAt + 20 ? 7 : 9), fp.x, fp.y, z, late ? -dir : dir)
}
function drawFoe(ctx, S, k, tp, z, cr) {
  const t = S.target, fdir = -S.dir
  if (k < SF.strikes[0]) { sprite(ctx, t, S.blocked && k >= SF.vanishAt ? ['guard', 'idle'] : ['idle'], S.blocked ? 9 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (k < SF.thrustAt) {
    const recent = S.lastCut && S.real - S.lastCut.real < 6, sh = recent && !calmMotion() ? (hash(S.real, 7) - 0.5) * 8 * z : 0
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], S.blocked ? 9 : 0, tp.x + sh, tp.y, z, fdir, { rot: S.blocked ? 0 : Math.sin(k * 0.12) * 0.12 })
    return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  if (cr < 24) { sprite(ctx, t, ['hurt', 'idle'], 0, tp.x, tp.y, z, fdir, { rot: -S.dir * 0.3 * clamp(cr / 20, 0, 1) }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir)
}
function ghost(ctx, f, x, y, z, face, i, a, k) {
  const fr = [4, 5, 6, 7, 1, 2][i % 6]
  sprite(ctx, f, finSheet(f), fr, x, y + 2 * z, z, face, { alpha: a * 0.55, tint: '#ff1830', tintA: 1, s: 1.08, comp: 'lighter' })
  sprite(ctx, f, finSheet(f), fr, x, y, z, face, { alpha: a, tint: '#12000a', tintA: 0.72 })
  if (!calmMotion() && (k + i * 7) % 24 < 3) glow(ctx, x + face * 4 * z, y - 92 * z, 12 * z, CRIMSON, 0.9)   // a Mangekyō glint
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function slashArc(ctx, x, y, R, seed, u) {
  const a = 1 - u, rot = (hash(seed, 3) - 0.5) * 2.4, sweep = Math.PI * (0.55 + 0.6 * outE(clamp(u * 2, 0, 1)))
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalCompositeOperation = 'lighter'
  for (const [w, col, al] of [[R * 0.22, `rgba(${CRIMSON},1)`, 0.55], [R * 0.09, 'rgba(255,120,120,1)', 0.9], [R * 0.03, '#ffffff', 1]]) {
    ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.2, R * 0.42, 0, -sweep / 2, sweep / 2); ctx.stroke() }
  ctx.restore()
}
function leaves(ctx, x, y, u, z, seed) {
  if (calmMotion()) return
  ctx.save()
  for (let i = 0; i < 22; i++) {
    const an = hash(i, seed) * Math.PI * 2, r = (20 + hash(i, seed + 1) * 90) * outE(u) * z, lx = x + Math.cos(an) * r, ly = y + Math.sin(an) * r * 0.7 + u * 30 * z
    ctx.globalAlpha = 1 - u; ctx.fillStyle = i % 3 ? '#2f6b2a' : '#4a8a36'
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(an + u * 6); ctx.beginPath(); ctx.ellipse(0, 0, 6 * z, 2.6 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.restore()
}
function crow(ctx, x, y, s, flap, a, dir) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(dir, 1); ctx.fillStyle = '#050003'
  const w = Math.sin(flap) * 0.9
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.32, 0, 0, Math.PI * 2); ctx.fill()              // body
  ctx.beginPath(); ctx.arc(s * 0.85, -s * 0.12, s * 0.26, 0, Math.PI * 2); ctx.fill()               // head
  ctx.beginPath(); ctx.moveTo(s * 1.05, -s * 0.12); ctx.lineTo(s * 1.45, -s * 0.02); ctx.lineTo(s * 1.05, s * 0.02); ctx.fill()   // beak
  ctx.beginPath(); ctx.moveTo(-s * 0.9, 0); ctx.lineTo(-s * 1.5, -s * 0.25); ctx.lineTo(-s * 1.4, s * 0.25); ctx.fill()           // tail
  for (const sg of [1, -1]) { ctx.beginPath(); ctx.moveTo(-s * 0.2, 0); ctx.quadraticCurveTo(s * 0.1, -s * 1.6 * w * sg, s * 0.5, -s * 2.0 * w * sg); ctx.lineTo(s * 0.4, 0); ctx.fill() }
  ctx.fillStyle = '#ff2030'; ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.18, s * 0.07, 0, Math.PI * 2); ctx.fill()   // a red eye
  ctx.restore()
}
function crows(ctx, S, k, c, z, W, H) {
  const burst = k >= SF.thrustAt, u = burst ? (k - SF.thrustAt) / 70 : 0
  for (let i = 0; i < 34; i++) {
    const an = hash(i, 21) * Math.PI * 2 + (burst ? 0 : S.real * (0.02 + hash(i, 22) * 0.02))
    const R = (120 + hash(i, 23) * 260) * z
    let x = c.x + Math.cos(an) * R, y = c.y - 120 * z + Math.sin(an) * R * 0.35
    if (burst) { const v = (6 + hash(i, 24) * 10) * z; x += Math.cos(an) * v * (k - SF.thrustAt) * 1.4; y += (Math.sin(an) * 0.5 - 1) * v * (k - SF.thrustAt) }
    const a = burst ? clamp(1 - u, 0, 1) : clamp((k - SF.stopAt + 6) / 14, 0, 1)
    crow(ctx, x, y, (8 + hash(i, 25) * 8) * z, S.real * 0.5 + i, a, Math.cos(an + Math.PI / 2) > 0 ? 1 : -1)
  }
  if (burst && !calmMotion()) {   // feathers drifting down
    ctx.save()
    for (let i = 0; i < 40; i++) {
      const fx = c.x + (hash(i, 31) - 0.5) * W * 0.9, fy = c.y - 260 * z + (hash(i, 32) * 120 + (k - SF.thrustAt) * (1.2 + hash(i, 33))) * z
      ctx.globalAlpha = clamp(1.3 - u, 0, 1) * 0.85; ctx.fillStyle = '#0a0306'
      ctx.save(); ctx.translate(fx + Math.sin((k + i * 9) * 0.08) * 14 * z, fy); ctx.rotate(Math.sin((k + i) * 0.1) * 0.8); ctx.beginPath(); ctx.ellipse(0, 0, 2.4 * z, 9 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    ctx.restore()
  }
}
function mangekyou(ctx, x, y, r, rot, a) {
  const im = image(EYE); if (!ready(im) || r <= 0 || a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false; ctx.translate(x, y); ctx.rotate(rot)
  glow(ctx, 0, 0, r * 2.2, CRIMSON, 0.6)
  ctx.drawImage(im, -r, -r, r * 2, r * 2); ctx.restore()
}
function eyeBand(ctx, W, H, k, real) {
  const u = (k - SF.stopAt) / (SF.thrustAt - SF.stopAt), inU = smooth(clamp(u / 0.18, 0, 1)), out = 1 - smooth(clamp((u - 0.9) / 0.1, 0, 1))
  const bh = H * 0.2 * inU * out, y = H * 0.3
  if (bh < 2) return
  ctx.save(); ctx.fillStyle = '#050002'; ctx.fillRect(0, y - bh / 2, W, bh)
  ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip()
  // the eye: white almond, red iris, the Mangekyō turning
  const ex = W / 2, ew = W * 0.2, eh = bh * 0.42 * clamp(u * 3, 0, 1)
  ctx.fillStyle = '#efe6e0'; ctx.beginPath(); ctx.moveTo(ex - ew, y); ctx.quadraticCurveTo(ex, y - eh * 2, ex + ew, y); ctx.quadraticCurveTo(ex, y + eh * 2, ex - ew, y); ctx.fill()
  ctx.save(); ctx.clip(); mangekyou(ctx, ex, y, bh * 0.42, real * 0.12, 1); ctx.restore()
  ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(3, bh * 0.05); ctx.beginPath(); ctx.moveTo(ex - ew, y); ctx.quadraticCurveTo(ex, y - eh * 2, ex + ew, y); ctx.quadraticCurveTo(ex, y + eh * 2, ex - ew, y); ctx.stroke()
  ctx.restore()
  ctx.save(); ctx.strokeStyle = '#ff3040'; ctx.lineWidth = Math.max(2, H * 0.004); ctx.beginPath(); ctx.moveTo(0, y - bh / 2); ctx.lineTo(W, y - bh / 2); ctx.moveTo(0, y + bh / 2); ctx.lineTo(W, y + bh / 2); ctx.stroke(); ctx.restore()
}
function callout(ctx, W, H, cr, dir) {
  const su = clamp((cr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (cr - 56) / 14, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.74 : 0.26), H * 0.26); ctx.rotate(-0.06 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.1)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#2a0008'; ctx.strokeText('瞬身!!', 0, 0); ctx.fillStyle = '#fff0f0'; ctx.fillText('瞬身!!', 0, 0)
  ctx.font = `900 ${Math.round(fs * 0.36)}px Impact, "Arial Black", sans-serif`; ctx.lineWidth = fs * 0.08; ctx.strokeText('BODY FLICKER', 0, fs * 0.72); ctx.fillStyle = '#ff4050'; ctx.fillText('BODY FLICKER', 0, fs * 0.72)
  ctx.restore()
}
