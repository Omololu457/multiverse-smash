// gwenUltFx.js — RENDER-ONLY half of Gwen's MANA BLADE — ANODITE JUDGMENT (gwenUlt.js). One screen pass (cineRegistry overlay,
// identity transform) that owns the picture while the cinematic runs: world → screen from camera.js's live transform, both
// fighters drawn from their REAL sheets (gwen_blade_uniform: book → swirl → orb raised → point → point → swing).
// Layers: violet dusk wash → rune circle → mana sphere (hex lattice, cracks) → fighters → the colossal blade → shards / rings →
// re-blit close-ups → title / spell text → impact frames → letterbox + subtitles. Pure functions of the scene's frames; noise =
// integer hash. Reduce Flashing → no white/inverted frames; Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, sub, letterbox, star, glow, rings,
  damageNumber, calmMotion, calmFlash } from './bleachUltKit.js'

const PINK = '255,90,220', CYAN = '120,230,255'
const SPELL = 'MANA  ·  HEAR  ·  ME'

export function drawGwenUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.brkReal != null ? S.real - S.brkReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 18 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 18 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) dusk: the world dims to violet while the spell holds; colour drains through the swing
  const duskA = k < B.calmAt ? smooth(S.real / 14) : clamp(1 - (k - B.calmAt) / 24, 0, 1)
  wash(ctx, W, H, '#1a0630', 0.5 * duskA, 'multiply'); wash(ctx, W, H, '#ff3cd2', 0.1 * duskA, 'soft-light')
  desat(ctx, W, H, k >= B.swingAt - 2 && k < B.breakAt ? 0.75 * smooth((k - B.swingAt + 2) / 8) : 0)

  // 2) the rune circle under Gwen
  const circA = k < B.calmAt ? smooth(k / 16) : clamp(1 - (k - B.calmAt) / 20, 0, 1)
  if (circA > 0) runeCircle(ctx, fp.x, floorY, z, S.real, circA)

  // 3) fighters (foe inside the sphere)
  const ballA = k >= B.prisonAt && k < B.breakAt + 1 ? 1 : 0
  drawFoe(ctx, S, V, k, tp, B)
  if (ballA) manaSphere(ctx, tp.x, tp.y - 48 * z, z, k, S, B)
  const g = drawGwen(ctx, S, V, k, fp, B)

  // 4) the BLADE
  if (k >= B.bladeAt - 4 && k < B.breakAt + 10 && g) drawBlade(ctx, W, H, S, V, k, g, tp, B)
  // sparks rising off the circle / her hand
  if (k < B.calmAt && !calmMotion()) motes(ctx, fp.x, floorY, z, S.real, circA, W)

  // 5) the break: hex shards, shockwave, glow
  if (pr >= 0 || k > B.breakAt) {
    const kp = Math.max(0, k - B.breakAt) + (held ? 0 : 0)
    shards(ctx, tp.x, tp.y - 48 * z, z, kp, S.real)
    if (kp < 60) { rings(ctx, tp.x, tp.y - 48 * z, kp / 60, 4, W * 0.8, '#ff7ae6', 14 * z, 0.9); rings(ctx, tp.x, floorY, kp / 60, 3, W * 0.7, '#8fe6ff', 10 * z, 0.2) }
    if (kp < 30) glow(ctx, tp.x, tp.y - 48 * z, (180 + kp * 22) * z, PINK, (1 - kp / 30) * 0.9)
  }
  // the three surge cracks flash
  B.surge.forEach((at, i) => { const d = k - at; if (d >= 0 && d < 8) glow(ctx, tp.x, tp.y - 48 * z, (90 + i * 40) * z, CYAN, (1 - d / 8) * 0.8) })

  // 6) real close-ups (camera.js caps zoom ≈1.15)
  if (k < B.prisonAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 70 * z, 1 + 0.35 * smooth((k - 4) / 30))
  else if (k >= B.prisonAt + 4 && k < B.prisonAt + 30) punchIn(ctx, canvas, W, H, tp.x, tp.y - 48 * z, 1 + 0.3 * Math.sin(Math.PI * (k - B.prisonAt - 4) / 26))
  else if (k >= B.swingAt && k < B.breakAt) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, tp.y - 60 * z, 1 + 0.25 * smooth((k - B.swingAt) / 12))

  // 7) titles + spell
  if (k >= 6 && k < B.prisonAt) spellText(ctx, W, H, SPELL, (k - 6) / (B.prisonAt - 6), dir)
  if (k >= B.prisonAt + 12 && k < B.bladeAt + 6) title(ctx, W, H, 'MANA BLADE', 'GWEN TENNYSON  ·  ANODITE JUDGMENT', (k - B.prisonAt - 12) / (B.bladeAt + 6 - B.prisonAt - 12),
    { y: 0.24, fs: 0.13, band: 'rgba(24,4,40,0.92)', edge: '#ff6ae0', fill: '#e9fbff', stroke: '#c0189a' })
  if (k >= B.swingAt - 6 && k < B.breakAt) { speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 60, 23, '#ffffff', 0.3 * smooth((k - B.swingAt + 6) / 10), true, S.real) }

  // 8) the break: white → inverted silhouettes
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, '#ffffff', '#2a0030', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, fp, tp, calmFlash() ? '#1a0626' : '#12001c', '#ff6ae0', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.22, pr - 10, '#ff6ae0')
  if (k >= B.calmAt && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.calmAt) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(H * 0.05)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'
    ctx.lineWidth = 6; ctx.strokeStyle = '#1a0020'; const x = dir > 0 ? W * 0.06 : W * 0.94
    ctx.strokeText('SPELL COMPLETE.', x, H * 0.2); ctx.fillStyle = '#ff7ae6'; ctx.fillText('SPELL COMPLETE.', x, H * 0.2); ctx.restore()
  }

  // 9) letterbox + subtitles
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 4, B.prisonAt - 2, 'GWEN', 'Mana, hear me — bind them!', '#ff7ae6')
  sub(ctx, W, H, k, B.bladeAt, B.swingAt - 4, 'GWEN', "Let's see you dodge THIS.", '#ff7ae6')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'GWEN', 'Lucky girl.', '#ff7ae6')
  return true
}

// ── Gwen: blade strip 0 book · 1 swirl · 2 orb raised · 3/4 point · 5 swing ──
function gFrame(k, B) {
  if (k < 10) return 0
  if (k < B.prisonAt) return 1
  if (k < B.bladeAt) return 2
  if (k < B.swingAt + 8) return (k >> 4) & 1 ? 4 : 3
  if (k < B.calmAt) return 5
  return 0
}
function drawGwen(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, dir = S.dir, fr = gFrame(k, B)
  glow(ctx, fp.x, fp.y - 50 * z, 110 * z * (1 + 0.08 * Math.sin(S.real * 0.35)), PINK, k < B.calmAt ? 0.45 : 0.2)
  const r = sprite(ctx, f, ['gwenBlade', 'idle'], fr, fp.x, fp.y, z, dir, { frame: true })
  if (!r) return null
  // the hand: the raised fingertip (frames 2-4) / the swinging fist (5) — measured off the 47×52 cell
  const s = r.s, cellL = fp.x - dir * 23.5 * s
  const HAND = [[30, 22], [34, 26], [44, 2], [40, 6], [40, 6], [44, 24]]
  const [hx, hy] = HAND[fr]
  const hand = { x: cellL + dir * hx * s, y: fp.y - (52 - hy) * s }
  // eyes glowing pink while she channels
  if (k >= 6 && k < B.calmAt) star(ctx, fp.x + dir * 3 * s, fp.y - 41 * s, 10 * z, 0.7 + 0.3 * Math.sin(S.real * 0.5), S.real * 0.1, '#ff9af0')
  if (k >= 10 && k < B.prisonAt) glow(ctx, hand.x, hand.y, (30 + 40 * smooth((k - 10) / 30)) * z, CYAN, 0.8)
  return hand
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.breakAt
  if (k < B.prisonAt) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  if (kp < 0) { sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: Math.sin(k * 0.12) * 0.15 }); return }
  const landed = (S.ty || 0) <= 1 && kp > 16
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * kp * 0.2, tint: kp < 3 ? '#ffffff' : null, tintA: 0.8 })
}

// ── pieces ──
function runeCircle(ctx, x, y, z, real, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(1, 0.28)
  const R = 120 * z, rot = calmMotion() ? 0 : real * 0.03
  ctx.globalAlpha = a; ctx.strokeStyle = '#ff6ae0'; ctx.lineWidth = 4 * z
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.stroke()
  ctx.rotate(rot)   // inscribed hexagram
  ctx.lineWidth = 3 * z; ctx.strokeStyle = '#9fefff'
  for (const off of [0, Math.PI / 3]) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const an = off + i * Math.PI * 2 / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * R * 0.78, Math.sin(an) * R * 0.78) } ctx.stroke() }
  ctx.font = `700 ${Math.round(16 * z)}px serif`; ctx.fillStyle = '#ffb8f4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ'
  for (let i = 0; i < 16; i++) { const an = -rot * 2 + i * Math.PI / 8; ctx.save(); ctx.translate(Math.cos(an) * R * 0.89, Math.sin(an) * R * 0.89); ctx.rotate(an + Math.PI / 2); ctx.fillText(runes[i], 0, 0); ctx.restore() }
  ctx.restore()
  glow(ctx, x, y, 140 * z, PINK, 0.35 * a)
}
function manaSphere(ctx, x, y, z, k, S, B) {
  const u = outE((k - B.prisonAt) / 10), R = (70 + 14 * (1 - u) * 3) * z * (0.6 + 0.4 * u), pulse = 1 + 0.03 * Math.sin(S.real * 0.4)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const gr = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * pulse)
  gr.addColorStop(0, 'rgba(255,120,230,0.06)'); gr.addColorStop(0.75, 'rgba(255,90,220,0.22)'); gr.addColorStop(1, 'rgba(255,170,245,0.75)')
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R * pulse, 0, Math.PI * 2); ctx.fill()
  // hex lattice clipped to the sphere
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R * pulse, 0, Math.PI * 2); ctx.clip()
  ctx.strokeStyle = 'rgba(255,190,250,0.55)'; ctx.lineWidth = 1.5 * z
  const hs = 16 * z
  for (let row = -6; row <= 6; row++) for (let col = -6; col <= 6; col++) {
    const cx = x + col * hs * 1.5, cy = y + row * hs * 1.732 + (col & 1 ? hs * 0.866 : 0)
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const an = i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(an) * hs, cy + Math.sin(an) * hs) } ctx.stroke()
  }
  ctx.restore()
  // cracks from each blade surge
  const n = B.surge.filter(a => k >= a).length
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5 * z
  for (let c = 0; c < n * 2; c++) {
    let px = x, py = y, an = hash(c, 17) * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 5; s++) { an += (hash(c, s + 30) - 0.5) * 1.2; px += Math.cos(an) * R * 0.22; py += Math.sin(an) * R * 0.22; ctx.lineTo(px, py) }
    ctx.stroke()
  }
  ctx.lineWidth = 3 * z; ctx.strokeStyle = 'rgba(255,220,252,0.9)'; ctx.beginPath(); ctx.arc(x, y, R * pulse, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}
// the colossal blade: rooted at her hand, pointing to the sky (BLADE) → arcing down through the sphere (SWING)
function drawBlade(ctx, W, H, S, V, k, hand, tp, B) {
  const z = V.z, dir = S.dir
  const grow = k < B.bladeAt ? 0 : B.surge.reduce((acc, at, i) => acc + (k >= at - 6 ? outE((k - at + 6) / 8) : 0), 0) / 3
  const len = (60 + 660 * Math.max(0.08, grow)) * z
  // angle: straight up (−90°) leaning back; during the swing it rotates down past the foe
  const up = -Math.PI / 2 - dir * 0.18
  const swingU = k < B.swingAt + 6 ? 0 : clamp((k - B.swingAt - 6) / (B.breakAt - B.swingAt - 6), 0, 1)
  let target = Math.atan2(tp.y - 48 * z - hand.y, tp.x - hand.x) + dir * 0.6
  if (dir < 0 && target > 0) target -= Math.PI * 2   // swing over the top toward the foe, never the long way round
  const ang = up + (target - up + (dir > 0 ? 0 : 0)) * inE2(swingU)
  const fade = k >= B.breakAt ? clamp(1 - (k - B.breakAt) / 10, 0, 1) : 1
  const wv = (24 + 26 * grow) * z * (1 + 0.06 * Math.sin(S.real * 0.8))
  ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(ang); ctx.globalAlpha = fade
  // swing smear
  if (swingU > 0 && swingU < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = '#ff7ae6'
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, 0, -dir * 0.9 * (1 - swingU) - dir * 0.2, dir > 0); ctx.closePath(); ctx.fill(); ctx.restore()
  }
  ctx.globalCompositeOperation = 'lighter'
  for (const [w, col, a] of [[wv * 2.6, '255,90,220', 0.35], [wv * 1.5, '120,230,255', 0.7], [wv * 0.7, '230,252,255', 1]]) {
    const gr = ctx.createLinearGradient(0, -w, 0, w); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -w * 0.6); ctx.lineTo(len, -w * 0.25); ctx.lineTo(len + w * 1.6, 0); ctx.lineTo(len, w * 0.25); ctx.lineTo(0, w * 0.6); ctx.closePath(); ctx.fill()
  }
  // runes running up the blade
  if (!calmMotion()) for (let i = 0; i < 10; i++) { const p = ((S.real * 6 + i * len / 10) % len); star(ctx, p, 0, 7 * z, 0.6, S.real * 0.2 + i, '#ffd6fa') }
  ctx.restore()
  star(ctx, hand.x, hand.y, (40 + 20 * Math.sin(S.real * 0.6)) * z, fade, S.real * 0.05, '#e8fdff')
  glow(ctx, hand.x, hand.y, 120 * z, CYAN, 0.6 * fade)
}
const inE2 = u => u * u
function motes(ctx, x, y, z, real, a, W) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 36; i++) {
    const ph = ((real * (0.6 + hash(i, 3) * 0.8) + hash(i, 4) * 90) % 90) / 90
    const px = x + (hash(i, 5) - 0.5) * 260 * z + Math.sin(ph * 6 + i) * 10 * z, py = y - ph * 260 * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.9; ctx.fillStyle = i % 3 ? '#ff8ae8' : '#a8f2ff'
    ctx.fillRect(px, py, 3 * z, 3 * z)
  }
  ctx.restore(); void W
}
function shards(ctx, x, y, z, kp, real) {
  if (kp > 70) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 34; i++) {
    const an = hash(i, 41) * Math.PI * 2, sp = (4 + hash(i, 42) * 9) * z, t = kp
    const px = x + Math.cos(an) * sp * t, py = y + Math.sin(an) * sp * t + 0.08 * t * t * z, r = (6 + hash(i, 43) * 10) * z
    ctx.globalAlpha = clamp(1 - kp / 70, 0, 1); ctx.strokeStyle = '#ffc0f6'; ctx.fillStyle = 'rgba(255,110,225,0.35)'; ctx.lineWidth = 1.5 * z
    ctx.save(); ctx.translate(px, py); ctx.rotate(t * 0.15 * (hash(i, 44) - 0.5) + i)
    ctx.beginPath(); for (let j = 0; j <= 6; j++) { const a2 = j * Math.PI / 3; ctx[j ? 'lineTo' : 'moveTo'](Math.cos(a2) * r, Math.sin(a2) * r) } ctx.fill(); ctx.stroke(); ctx.restore()
  }
  ctx.restore(); void real
}
function spellText(ctx, W, H, text, u, dir) {
  if (u <= 0 || u >= 1) return
  const a = Math.min(clamp(u / 0.1, 0, 1), clamp((1 - u) / 0.15, 0, 1))
  ctx.save(); ctx.globalAlpha = a; ctx.font = `italic 900 ${Math.round(H * 0.06)}px Georgia, "Times New Roman", serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(255,90,220,0.9)'; ctx.shadowBlur = H * 0.03
  const shown = text.slice(0, Math.ceil(text.length * clamp(u * 1.6, 0, 1)))
  ctx.fillStyle = '#ffd6fa'; ctx.fillText(shown, W * (dir > 0 ? 0.62 : 0.38), H * 0.24); ctx.restore()
}
function silFrame(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 60 + pr, fg, 0.95, false, pr)
  sprite(ctx, S.caster, ['gwenBlade', 'idle'], 5, fp.x, fp.y, z, S.dir, { frame: true, tint: fg, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
