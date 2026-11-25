// miwaUltFx.js — RENDER-ONLY half of Kasumi Miwa's SIMPLE DOMAIN — BATTŌ: THREE DRAWS (miwaUlt.js). One screen pass
// (cineRegistry overlay, identity transform) owning the picture while the cinematic runs: world → screen from camera.js's live
// transform; Miwa from her real sheets (ultimate = battō stance + draw flash, iaiDash = the blur dash, light = the wide draw
// arc, miwaG3 = the rising draw), the foe from theirs. Signature looks: the Simple Domain's pale floor circle, three cut-lines
// that hang in stopped time, and the sheathe "chin" that detonates them. Pure functions of the scene's frames; noise = integer
// hash. Reduce Flashing → no white frames; Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  damageNumber, calmMotion, calmFlash } from './bleachUltKit.js'

const BLUE = '120,200,255', ICE = '220,240,255'

function mFrame(S, k, B) {
  for (const d of [B.d1, B.d2]) {
    if (k >= d - 5 && k < d + 1) return { keys: ['iaiDash'], fr: 2 }
    if (k >= d + 1 && k < d + 10) return { keys: ['light'], fr: k < d + 6 ? 1 : 2 }
  }
  if (k >= B.d3 - 5 && k < B.d3 + 1) return { keys: ['iaiDash'], fr: 2 }
  if (k >= B.d3 + 1 && k < B.d3 + 12) return { keys: ['miwaG3'], fr: k < B.d3 + 7 ? 1 : 2 }
  if (k < B.fieldAt) return { keys: ['ultimate'], fr: Math.min(3, k >> 3) }
  if (k < B.d1 - 5) return { keys: ['ultimate'], fr: k < B.d1 - 14 ? 3 : 4 + ((k >> 2) & 1) }
  if (k < B.d1 + 10) return { keys: ['ultimate'], fr: 3 }
  if (k < B.sheatheAt + 6) return { keys: ['miwaG3'], fr: 3 }
  if (k < B.afterAt) return { keys: ['ultimate'], fr: k < B.chinAt ? 1 : 0 }
  return { keys: ['idle'], fr: (S.real >> 3) % 4 }
}

export function drawMiwaUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.chinReal != null ? S.real - S.chinReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 16 : 6), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 16 : 6) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y, cp = V.p(S.fx0, S.floor)
  const tHit = { x: tp.x, y: tp.y - 66 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the world hushes: cool, dim, and fully still while time stops for the sheathe
  const coolA = k < B.calmAt ? smooth(S.real / 20) : clamp(1 - (k - B.calmAt) / 24, 0, 1)
  wash(ctx, W, H, '#06142a', 0.45 * coolA, 'multiply')
  const stopA = k >= B.sheatheAt && k < B.chinAt ? smooth((k - B.sheatheAt) / 10) : 0
  desat(ctx, W, H, 0.9 * stopA)

  // 2) the SIMPLE DOMAIN: a pale circle on the floor that swells until the foe is inside
  const reach = Math.abs(S.tx0 - S.fx0) + 150
  const rU = k < B.fieldAt ? 0.35 * outE(k / B.fieldAt) : 0.35 + 0.65 * outE((k - B.fieldAt) / (B.d1 - 10 - B.fieldAt))
  const rA = k >= B.afterAt ? clamp(1 - (k - B.afterAt) / 40, 0, 1) : clamp(S.real / 8, 0, 1)
  simpleDomain(ctx, cp.x, floorY, reach * rU * z, z, S.real, rA * (k >= B.d1 - 6 && k < B.sheatheAt ? 0.75 : 1))
  if (k >= B.fieldAt && k < B.d1 && !calmMotion()) hangingDust(ctx, cp.x, floorY, reach * rU * z, z, S.real)

  // 3) fighters (after-images on the dashes)
  drawFoe(ctx, S, V, k, tp, B, pr)
  const { keys, fr } = mFrame(S, k, B)
  if (keys[0] === 'iaiDash') for (let g = 4; g >= 1; g--) sprite(ctx, f, keys, fr, fp.x - S.fFace * g * 30 * z, fp.y, z, S.fFace, { frame: true, alpha: 0.13 * (5 - g), tint: '#9ad8ff', tintA: 0.8 })
  sprite(ctx, f, keys, fr, fp.x, fp.y, z, S.fFace, { frame: true })

  // 4) the cuts: each draw leaves a line through the foe that HANGS in the stopped air and detonates on the chin
  for (const c of S.cuts) {
    const life = k - c.k, flash = clamp(1 - life / 10, 0, 1)
    let a = pr >= 0 ? clamp(1 - pr / 18, 0, 1) : life < 14 ? 1 : k >= B.sheatheAt ? 0.45 + 0.55 * smooth((k - B.sheatheAt) / (B.chinAt - B.sheatheAt)) : 0.35
    const wide = pr >= 0 ? 1 + pr * 0.4 : 1
    cutLine(ctx, W, tHit.x, tHit.y, c.ang * dir, z, a, flash, wide)
  }
  for (const d of [B.d1, B.d2, B.d3]) { const kk = k - d; if (kk >= 0 && kk < 10) { star(ctx, tHit.x, tHit.y, (90 - kk * 7) * z, 1 - kk / 10, kk * 0.3, '#ffffff'); glow(ctx, tHit.x, tHit.y, 120 * z, BLUE, (1 - kk / 10) * 0.7) } }
  if (pr >= 0 && pr < 60) {   // the detonation: petals of light + rings
    rings(ctx, tHit.x, tHit.y, pr / 60, 3, W * 0.6, '#cfeaff', 10 * z, 0.8)
    petals(ctx, tHit.x, tHit.y, z, pr, S.real)
    glow(ctx, tHit.x, tHit.y, (160 + pr * 5) * z, ICE, (1 - pr / 60) * 0.8)
  }

  // 5) close-ups
  if (k < B.fieldAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 50 * z, 1 + 0.4 * smooth((k - 4) / 30))
  else if (k >= B.d1 - 22 && k < B.d1 - 5) punchIn(ctx, canvas, W, H, fp.x + dir * 10 * z, fp.y - 45 * z, 1.5)                  // the hand on the hilt
  else if (k >= B.sheatheAt + 8 && k < B.chinAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 50 * z, 1 + 0.5 * smooth((k - B.sheatheAt - 8) / 20))
  if (k >= B.d1 - 5 && k < B.d3 + 4) speedLines(ctx, W, H, tHit.x, tHit.y, 50, 17, '#e8f6ff', 0.3, true, S.real)

  // 6) the chin: white → inverted (deep navy, white cuts)
  if (pr >= 0 && pr < 3 && !calmFlash()) impact(ctx, W, H, S, V, fp, tp, k, B, '#ffffff', '#0a1a3a', '#0a1a3a', pr)
  else if (pr >= 3 && pr < 10) impact(ctx, W, H, S, V, fp, tp, k, B, '#04102a', '#ffffff', '#ffffff', pr)
  ctx.restore()

  // 7) titles + calligraphy + the chin
  if (k >= 6 && k < B.fieldAt + 6) title(ctx, W, H, 'SIMPLE DOMAIN', 'KASUMI MIWA  ·  NEW SHADOW STYLE', (k - 6) / B.fieldAt,
    { y: 0.22, fs: 0.12, band: 'rgba(4,12,28,0.92)', edge: '#8fd6ff', fill: '#ffffff', stroke: '#1b4f8a', kanji: '簡易領域', kanjiCol: '#cfeaff' })
  if (k >= B.fieldAt + 4 && k < B.d1) calligraphy(ctx, W, H, '新陰流', (k - B.fieldAt - 4) / (B.d1 - B.fieldAt - 4), { x: dir > 0 ? 0.88 : 0.12, y: 0.22, size: 0.12, col: '#eaf6ff', edge: '#0a1a3a', glow: 'rgba(120,200,255,0.8)' })
  for (const [d, n] of [[B.d1, '一'], [B.d2, '二'], [B.d3, '三']]) { const kk = k - d; if (kk >= 0 && kk < 18) drawNum(ctx, W, H, n, kk / 18, d === B.d1 ? 0.3 : d === B.d2 ? 0.5 : 0.7) }
  if (k >= B.chinAt - 3 && k < B.chinAt + 30) chin(ctx, fp.x + dir * 4 * z, fp.y - 70 * z, z, (k - B.chinAt + 3) / 33)
  if (pr >= 8 && k < B.outAt) title(ctx, W, H, 'BATTŌJUTSU', 'BLADE OF THE NEOPHYTE  ·  抜刀', clamp((pr - 8) / (B.outAt - B.chinAt - 8), 0, 1),
    { y: 0.76, fs: 0.12, band: 'rgba(4,12,28,0.92)', edge: '#8fd6ff', fill: '#ffffff', stroke: '#1b4f8a', kanji: '抜刀', kanjiCol: '#cfeaff' })
  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.26, pr - 10, '#9ad8ff')
  else if (pr < 0 && S.cuts.length) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.24, Math.min(30, k - S.cuts[S.cuts.length - 1].k), '#cfeaff')

  // 8) letterbox + subtitles
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.fieldAt, 'MIWA', 'Simple Domain!', '#8fd6ff')
  sub(ctx, W, H, k, B.fieldAt + 6, B.d1 - 4, 'MIWA', 'Shinkage-ryū…', '#8fd6ff')
  sub(ctx, W, H, k, B.d3 - 8, B.d3 + 16, 'MIWA', 'From the neck!', '#8fd6ff')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'MIWA', 'I can fight, too!', '#8fd6ff')
  return true
}

function drawFoe(ctx, S, V, k, tp, B, pr) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (S.blocked && k >= B.d1) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  if (k < B.d1) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (pr >= 6) { sprite(ctx, t, pr > 20 ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  const recent = [B.d1, B.d2, B.d3].some(d => k - d >= 0 && k - d < 5)
  sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: recent ? 0.9 : 1, sy: recent ? 1.05 : 1, tint: k >= B.sheatheAt ? '#bfe4ff' : null, tintA: 0.25 })
}
function simpleDomain(ctx, x, y, r, z, real, a) {
  if (a <= 0 || r <= 2) return
  ctx.save()
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${ICE},0.06)`); g.addColorStop(0.85, `rgba(${BLUE},0.16)`); g.addColorStop(1, `rgba(${ICE},0.35)`)
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.2, 0, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(${ICE},0.95)`; ctx.lineWidth = Math.max(2, 3 * z); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.2, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = `rgba(${BLUE},0.55)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.18, 0, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 36; i++) {     // tick marks around the rim, slowly turning
    const an = i / 36 * Math.PI * 2 + real * 0.004, c = Math.cos(an), s = Math.sin(an)
    ctx.beginPath(); ctx.moveTo(x + c * r * 0.9, y + s * r * 0.18); ctx.lineTo(x + c * r, y + s * r * 0.2); ctx.stroke()
  }
  // a faint dome wall rising off the rim
  const dg = ctx.createLinearGradient(0, y - 80 * z, 0, y)
  dg.addColorStop(0, `rgba(${BLUE},0)`); dg.addColorStop(1, `rgba(${BLUE},0.12)`)
  ctx.fillStyle = dg; ctx.fillRect(x - r, y - 80 * z, r * 2, 80 * z)
  ctx.restore()
}
function hangingDust(ctx, x, y, r, z, real) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 40; i++) {
    const px = x + (hash(i, 3) - 0.5) * 2 * r * 0.95, py = y - hash(i, 4) * 170 * z, tw = 0.5 + 0.5 * Math.sin(real * 0.15 + i)
    ctx.globalAlpha = 0.6 * tw; ctx.fillStyle = '#eaf6ff'; ctx.fillRect(px, py, 2, 2)
  }
  ctx.restore()
}
function cutLine(ctx, W, x, y, ang, z, a, flash, wide) {
  if (a <= 0) return
  const L = W * 1.2, c = Math.cos(ang), s = Math.sin(ang)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (const [lw, col, al] of [[22 * wide, `rgba(${BLUE},0.35)`, a], [7 * wide, `rgba(${ICE},0.85)`, a], [2.5, '#ffffff', Math.max(a, flash)]]) {
    ctx.globalAlpha = clamp(al, 0, 1); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, lw * Math.max(0.6, z) * (1 + flash * 0.8))
    ctx.beginPath(); ctx.moveTo(x - c * L, y - s * L); ctx.lineTo(x + c * L, y + s * L); ctx.stroke()
  }
  ctx.restore()
}
function petals(ctx, x, y, z, pr, real) {
  if (calmMotion()) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 46; i++) {
    const an = hash(i, 5) * Math.PI * 2, sp = (3 + hash(i, 6) * 9) * z, d = sp * pr, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.7 + pr * pr * 0.02 * z
    ctx.globalAlpha = clamp(1 - pr / 60, 0, 1); ctx.fillStyle = i % 3 ? '#eaf6ff' : '#9ad8ff'
    ctx.save(); ctx.translate(px, py); ctx.rotate(an + real * 0.1); ctx.fillRect(-5 * z, -1.2 * z, 10 * z, 2.4 * z); ctx.restore()
  }
  ctx.restore()
}
function impact(ctx, W, H, S, V, fp, tp, k, B, bg, fg, sil, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 66 * z, 70, 90 + pr, fg, 0.85, false, pr)
  for (const c of S.cuts) cutLine(ctx, W, tp.x, tp.y - 66 * z, c.ang * S.dir, z, 1, 1, 1.4)
  const { keys, fr } = mFrame(S, k, B)
  sprite(ctx, S.caster, keys, fr, fp.x, fp.y, z, S.fFace, { frame: true, tint: sil, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: sil, tintA: 1, sx: 0.88, sy: 1.05 })
  ctx.restore()
}
function drawNum(ctx, W, H, n, u, xf) {
  const a = Math.min(clamp(u / 0.15, 0, 1), clamp((1 - u) / 0.3, 0, 1)), fs = Math.round(H * 0.14 * (1 + Math.max(0, 1 - u / 0.12) * 0.5))
  ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${fs}px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(120,200,255,0.9)'; ctx.shadowBlur = fs * 0.3
  ctx.lineWidth = fs * 0.12; ctx.strokeStyle = '#0a1a3a'; ctx.strokeText(n, W * xf, H * 0.26); ctx.fillStyle = '#ffffff'; ctx.fillText(n, W * xf, H * 0.26); ctx.restore()
}
function chin(ctx, x, y, z, u) {
  if (u <= 0 || u >= 1) return
  const fs = Math.round(30 * Math.max(0.9, z) * (1 + Math.max(0, 1 - u / 0.1) * 0.6))
  ctx.save(); ctx.globalAlpha = clamp((1 - u) * 2, 0, 1); ctx.font = `900 ${fs}px "Hiragino Sans", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#0a1a3a'; ctx.strokeText('チン', x, y - u * 30 * z); ctx.fillStyle = '#ffffff'; ctx.fillText('チン', x, y - u * 30 * z)
  ctx.restore()
  star(ctx, x, y + 20 * z, 30 * z * (1 - u), 1 - u, 0.3, '#ffffff')
}
