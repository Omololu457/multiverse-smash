// byakuyaUltFx.js — RENDER-ONLY half of Byakuya's BANKAI: SENBONZAKURA KAGEYOSHI → SHŪKEI: HAKUTEIKEN (byakuyaUlt.js).
// One screen pass (cineRegistry overlay, identity transform): world → screen from camera.js's live transform; both fighters
// drawn from their REAL sheets (bankai charge / transform / thrust strips, his own reiatsu wing + blast sheets).
// Layers: cool dusk grade → the rows of colossal blades → the falling blade + its ripple → fighters → the petal rivers /
// vortex / burst / rain → wings + the white lance → re-blit close-ups → title / calligraphy → impact frames → letterbox +
// subtitles. Pure functions of the scene frames; petals are integer-hash particles (no Math.random).
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  damageNumber, calmMotion, calmFlash, image, ready, lerp } from './bleachUltKit.js'

const N_BLADES = 16, N_PETALS = 340
const PINK = ['#ffb7d0', '#ff8fb8', '#ffd6e4', '#f77aa8', '#ffe9f1']

export function drawByakuyaUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.thrustReal != null ? S.real - S.thrustReal : -1
  const jit = held && pr < 14 && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = V.p(0, S.floor).y
  const vort = V.p(S.tx0, S.tFloor - 50)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grade: a cool, hushed dusk while he speaks; a deep indigo night once the Bankai is out
  const nightA = k < B.releaseAt ? 0.25 * smooth(S.real / 14) : k < B.afterAt + 20 ? 0.25 + 0.3 * smooth((k - B.releaseAt) / 30) : 0.55 * clamp(1 - (k - B.afterAt - 20) / 24, 0, 1)
  wash(ctx, W, H, '#1a1440', nightA, 'multiply')
  if (k >= B.scatterAt && k < B.afterAt) wash(ctx, W, H, '#ff7aa8', 0.12, 'soft-light')

  // 2) the rows of colossal blades (behind everything)
  if (k >= B.bladesAt && k < B.shukeiAt) blades(ctx, V, S, k, B)
  // 3) the falling blade + the ripple it sinks into
  if (k >= B.releaseAt && k < B.bladesAt + 10) fallingBlade(ctx, V, S, k, B, fp)

  // 4) fighters
  drawFoe(ctx, S, V, k, tp, B)
  if (k >= B.shukeiAt && k < B.afterAt) wings(ctx, S, V, k, B, fp)
  drawByakuya(ctx, S, V, k, fp, B)

  // 5) petals: ambient drift, the rivers + vortex, the burst, the rain
  ambient(ctx, W, H, S, k, B)
  if (k >= B.scatterAt && k < B.thrustAt + 2) rivers(ctx, V, S, k, B, vort, fp)
  if (k >= B.cuts[0] && k < B.blinkAt) for (const c of B.cuts) if (k >= c && k < c + 8) slashArc(ctx, vort, z, (k - c) / 8, c)
  // the white lance of Hakuteiken
  if (k >= B.thrustAt && k < B.burstEnd) lance(ctx, W, S, V, k, B, fp, tp)
  if (k >= B.thrustAt) burst(ctx, V, S, k, B, vort)
  if (k >= B.afterAt - 10) rain(ctx, W, H, S, k, B)

  // 6) close-ups
  if (k < B.releaseAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 95 * z, 1 + 0.35 * smooth((k - 4) / 34))
  else if (k >= B.releaseAt + 10 && k < B.bladesAt) punchIn(ctx, canvas, W, H, fp.x + dir * 10 * z, floorY, 1.25)
  else if (k >= B.shukeiAt + 6 && k < B.blinkAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 80 * z, 1 + 0.3 * smooth((k - B.shukeiAt - 6) / 20))

  // 7) titles + calligraphy
  if (k >= B.releaseAt + 4 && k < B.bladesAt + 6) calligraphy(ctx, W, H, '卍解', (k - B.releaseAt - 4) / (B.bladesAt - B.releaseAt + 2), { x: dir > 0 ? 0.16 : 0.84, y: 0.3, size: 0.16, col: '#ffffff', edge: '#2a1030', glow: 'rgba(255,150,200,0.8)' })
  if (k >= B.bladesAt + 14 && k < B.scatterAt + 14) title(ctx, W, H, 'SENBONZAKURA KAGEYOSHI', 'BANKAI  ·  BYAKUYA KUCHIKI', (k - B.bladesAt - 14) / (B.scatterAt - B.bladesAt),
    { y: 0.22, fs: 0.085, band: 'rgba(18,10,30,0.88)', edge: '#ff9fc4', fill: '#ffffff', stroke: '#c2185b', kanji: '千本桜景厳', kanjiCol: '#ffb7d0', subCol: '#ffd6e4' })
  if (k >= B.shukeiAt + 2 && k < B.thrustAt) calligraphy(ctx, W, H, '終景白帝剣', (k - B.shukeiAt - 2) / (B.thrustAt - B.shukeiAt), { x: dir > 0 ? 0.86 : 0.14, y: 0.18, size: 0.105, col: '#eaf6ff', edge: '#0a1a3a', glow: 'rgba(120,200,255,0.9)' })
  if (k >= B.blinkAt && k < B.thrustAt) speedLines(ctx, W, H, vort.x, vort.y, 70, 23, '#ffffff', 0.6, true, S.real)

  // 8) the thrust: world shot (blade through) → white → inverted
  if (pr >= 4 && pr < 8 && !calmFlash()) sil(ctx, W, H, S, V, fp, tp, '#ffffff', '#101018', pr)
  else if (pr >= 8 && pr < 13) sil(ctx, W, H, S, V, fp, tp, calmFlash() ? '#141022' : '#000000', '#ffd6e4', pr)
  ctx.restore()

  if (pr >= 13) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.25, pr - 13, '#ff6fa6')
  if (k >= B.afterAt + 6 && k < B.outAt + 6) {
    const a = Math.min(clamp((k - B.afterAt - 6) / 10, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `300 ${Math.round(H * 0.045)}px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffe9f1'; ctx.shadowColor = 'rgba(255,120,170,0.8)'; ctx.shadowBlur = 12
    ctx.fillText('散れ、千本桜。', dir > 0 ? W * 0.06 : W * 0.94, H * 0.2); ctx.restore()
  }
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.releaseAt + 2, 'BYAKUYA', 'Know that there is nothing you can protect.', '#ff9fc4')
  sub(ctx, W, H, k, B.shukeiAt + 10, B.blinkAt + 2, 'BYAKUYA', "I'll deal the finishing blow.", '#9fd8ff')
  sub(ctx, W, H, k, B.afterAt + 10, B.outAt + 4, 'BYAKUYA', 'This is over.', '#ff9fc4')
  return true
}

// ── byakuya ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawByakuya(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, dir = S.dir
  let keys = ['byakuyaBankaiCharge'], fr = 0, o = {}
  if (k < B.releaseAt) fr = (k >> 4) & 1
  else if (k < B.bladesAt) fr = 2 + Math.min(2, Math.floor((k - B.releaseAt) / 8))
  else if (k < B.blinkAt) { keys = ['byakuyaBankaiTransform']; fr = (k >> 4) & 1 }
  else if (k < B.blinkAt + 4) { keys = ['byakuyaShunpoOut', 'byakuyaBankaiTransform']; fr = k - B.blinkAt; o.alpha = 1 - (k - B.blinkAt) / 4 }
  else if (k < B.thrustAt) { keys = ['byakuyaBankaiThrust']; fr = 0; o.alpha = (k - B.blinkAt - 4) / 2 }
  else if (k < B.afterAt + 20) { keys = ['byakuyaBankaiThrust']; fr = Math.min(3, 1 + ((k - B.thrustAt) >> 2)) }
  else { keys = ['idle']; fr = (S.real >> 3) % 5 }
  if (keys[0] === 'byakuyaBankaiThrust') o.frame = true
  if (k >= B.blinkAt && k < B.thrustAt + 4 && !calmMotion()) {   // shunpo streak between the two spots
    const a = V.p(S.fx0, S.floor - 55), b = V.p(S.fx1, S.floor - 55)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * (1 - (k - B.blinkAt) / 10)
    const g = ctx.createLinearGradient(a.x, 0, b.x, 0); g.addColorStop(0, 'rgba(160,220,255,0)'); g.addColorStop(1, 'rgba(230,248,255,0.9)')
    ctx.fillStyle = g; ctx.fillRect(Math.min(a.x, b.x), a.y - 40 * z, Math.abs(b.x - a.x), 80 * z); ctx.restore()
  }
  sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, o)
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir
  const cutNow = B.cuts.some(c => k >= c && k < c + 4)
  if (k < B.thrustAt) {
    const hurt = k >= B.cuts[0]
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : hurt ? ['hurt', 'idle'] : ['idle'], hurt ? 9 : (S.real >> 3) % 4, tp.x + (cutNow ? (hash(k, 3) - 0.5) * 8 * z : 0), tp.y, z, fdir, { tint: cutNow ? '#ffffff' : null, tintA: 0.6 })
    return
  }
  const kp = k - B.thrustAt
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  const landed = kp > 34
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * kp * 0.12, tint: kp < 3 ? '#ffffff' : null, tintA: 0.8 })
}
function sil(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 70 + pr, fg, 0.9, false, pr)
  sprite(ctx, S.caster, ['byakuyaBankaiThrust'], 3, fp.x, fp.y, z, S.dir, { frame: true, tint: fg, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1, sx: 0.85, sy: 1.06 })
  ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(fp.x, fp.y - 52 * z); ctx.lineTo(fp.x + S.dir * W, fp.y - 52 * z); ctx.stroke()
  ctx.restore()
}

// ── the colossal blades ───────────────────────────────────────────────────────────────────────────────────────────────
function bladeSpec(S, j) {
  const row = j & 1, i = j >> 1
  const off = -S.dir * 420 + S.dir * i * 135 + (row ? 60 : 0) * S.dir + (hash(j, 3) - 0.5) * 40
  return { x: S.fx0 + off, h: (row ? 380 : 470) + hash(j, 4) * 110, w: row ? 40 : 30, row, tilt: (hash(j, 5) - 0.5) * 0.12 }
}
function bladeLeft(S, j, k, B) { return 1 - smooth((k - (B.scatterAt + j * 2)) / 18) }   // the fraction still standing (crumbles tip-first)
function blades(ctx, V, S, k, B) {
  const z = V.z
  for (let pass = 0; pass < 2; pass++) for (let j = 0; j < N_BLADES; j++) {
    const b = bladeSpec(S, j); if (b.row !== pass) continue
    const rise = outE((k - B.bladesAt - j * 1.4) / 22); if (rise <= 0) continue
    const left = bladeLeft(S, j, k, B); if (left <= 0) continue
    const base = V.p(b.x, S.floor), hh = b.h * z * rise, ww = b.w * z, shown = hh * left
    ctx.save(); ctx.translate(base.x, base.y + (1 - rise) * 10); ctx.rotate(b.tilt)
    ctx.globalAlpha = b.row ? 0.95 : 0.7
    // the blade: steel with a white edge, point up; only the part below the crumble line remains
    const g = ctx.createLinearGradient(-ww / 2, 0, ww / 2, 0); g.addColorStop(0, '#6c7a8e'); g.addColorStop(0.45, '#e6eef8'); g.addColorStop(0.55, '#ffffff'); g.addColorStop(1, '#8a98ad')
    ctx.fillStyle = g; ctx.beginPath()
    const tipY = -hh, cutY = -shown
    ctx.moveTo(-ww / 2, 0); ctx.lineTo(-ww / 2, Math.max(cutY, tipY + ww * 1.6))
    if (left >= 0.999) { ctx.lineTo(ww * 0.1, tipY); ctx.lineTo(ww / 2, tipY + ww * 1.6) } else { ctx.lineTo(ww / 2, cutY) }
    ctx.lineTo(ww / 2, 0); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(20,24,40,0.9)'; ctx.lineWidth = 2; ctx.stroke()
    // the guard at the ground line
    ctx.fillStyle = '#2a2230'; ctx.fillRect(-ww * 1.1, -4 * z, ww * 2.2, 8 * z)
    ctx.restore()
    if (left < 1 && left > 0) {   // pink dust at the crumbling edge
      const cp = V.p(b.x, S.floor - b.h * left)
      glow(ctx, cp.x, cp.y, 40 * z, '255,150,200', 0.6)
    }
  }
  // the ground swell where they broke through
  if (k < B.bladesAt + 30) rings(ctx, V.p(S.fx0, 0).x, V.p(0, S.floor).y, (k - B.bladesAt) / 30, 3, 700 * z, '#cfe6ff', 8 * z, 0.12)
}
function fallingBlade(ctx, V, S, k, B, fp) {
  const z = V.z, dir = S.dir, u = clamp((k - B.releaseAt) / 16, 0, 1), floorY = V.p(0, S.floor).y
  const x = fp.x + dir * 14 * z, y0 = fp.y - 70 * z, sink = clamp((k - B.releaseAt - 16) / 14, 0, 1)
  const tipY = lerp(y0 + 60 * z, floorY, u * u) + sink * 70 * z, len = 70 * z
  if (sink < 1) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40 * z, -9999, 80 * z, floorY + 9999); ctx.clip()
    ctx.strokeStyle = '#e8f0ff'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(x, tipY); ctx.lineTo(x, tipY - len); ctx.stroke()
    ctx.fillStyle = '#3a2a40'; ctx.fillRect(x - 6 * z, tipY - len - 2 * z, 12 * z, 3 * z); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2 * z, tipY - len - 20 * z, 4 * z, 18 * z)
    ctx.restore()
  }
  if (k >= B.releaseAt + 16) {   // the ground takes it like water
    const r = (k - B.releaseAt - 16) / 40
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 4; i++) { const ri = clamp(r * 1.4 - i * 0.18, 0, 1); if (ri <= 0 || ri >= 1) continue
      ctx.globalAlpha = (1 - ri) * 0.8; ctx.strokeStyle = i ? '#ff9fc4' : '#e6f4ff'; ctx.lineWidth = 3 * z
      ctx.beginPath(); ctx.ellipse(x, floorY, (10 + ri * 260) * z, (3 + ri * 22) * z, 0, 0, Math.PI * 2); ctx.stroke() }
    ctx.restore()
    star(ctx, x, floorY, 40 * z * (1 - r), 1 - r, r * 2, '#ffe9f1')
  }
}
function wings(ctx, S, V, k, B, fp) {
  const z = V.z, u = (k - B.shukeiAt) / 20, growing = u < 1
  const im = image(growing ? './byakuya_bankai_wings_grow_uniform.png' : './byakuya_bankai_wings_full_uniform.png'); if (!ready(im)) return
  const frames = growing ? 5 : 3, fw = im.naturalWidth / frames, fh = im.naturalHeight
  const fi = growing ? Math.min(4, Math.floor(u * 5)) : ((k >> 2) % 3)
  const sc = (S.caster.spriteScale || 1.1) * 1.6 * z, out = k >= B.afterAt - 12 ? clamp((B.afterAt - k) / 12, 0, 1) : 1
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(0.95, 0.4 + u * 0.6) * out
  ctx.translate(fp.x, fp.y - 70 * z); ctx.drawImage(im, fi * fw, 0, fw, fh, -fw * sc / 2, -fh * sc * 0.72, fw * sc, fh * sc); ctx.restore()
  glow(ctx, fp.x, fp.y - 60 * z, 160 * z, '140,210,255', 0.45 * out)
}
function lance(ctx, W, S, V, k, B, fp, tp) {
  const z = V.z, dir = S.dir, kp = k - B.thrustAt, a = clamp(1 - kp / (B.burstEnd - B.thrustAt), 0, 1)
  const y = fp.y - 52 * z, x0 = fp.x + dir * 40 * z, x1 = x0 + dir * W * 1.3 * outE(Math.max(kp, 1) / 6)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const [lw, col] of [[46 * z, 'rgba(120,200,255,0.35)'], [20 * z, 'rgba(220,240,255,0.8)'], [6 * z, '#ffffff']]) {
    ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw * (0.6 + 0.4 * a); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()
  }
  ctx.restore()
  const im = image('./byakuya_bankai_blast_uniform.png')
  if (ready(im) && kp < 24) {
    const fw = im.naturalWidth / 2, fh = im.naturalHeight, sc = 1.8 * z * (1 + kp * 0.03)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - kp / 24; ctx.translate(tp.x, y); ctx.scale(dir, 1)
    ctx.drawImage(im, (kp < 10 ? 0 : 1) * fw, 0, fw, fh, -fw * sc * 0.3, -fh * sc / 2, fw * sc, fh * sc); ctx.restore()
  }
  rings(ctx, tp.x, y, kp / 30, 3, 420 * z, '#e6f4ff', 8 * z, 0.9)
}

// ── petals ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function petal(ctx, x, y, s, rot, col, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s); ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s); ctx.fill(); ctx.restore()
}
function ambient(ctx, W, H, S, k, B) {
  if (calmMotion()) return
  const a = k < B.bladesAt ? clamp(S.real / 20, 0, 1) * 0.8 : 0.5
  for (let i = 0; i < 26; i++) {
    const ph = ((S.real * (0.4 + hash(i, 1) * 0.5) + hash(i, 2) * 400) % 400) / 400
    const x = ((hash(i, 3) * W * 1.3 + ph * W * 0.5 * -S.dir) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15, y = -20 + ph * (H + 40)
    petal(ctx, x + Math.sin(S.real * 0.04 + i) * 20, y, 4 + hash(i, 4) * 4, S.real * 0.05 + i, PINK[i % 5], a)
  }
}
function rivers(ctx, V, S, k, B, vort, fp) {
  const z = V.z
  const pull = k >= B.shukeiAt ? smooth((k - B.shukeiAt) / 26) : 0          // Shūkei: the storm folds back into him
  const home = V.p(S.fx0, S.floor - 70)
  for (let i = 0; i < N_PETALS; i++) {
    const j = i % N_BLADES, b = bladeSpec(S, j), hf = hash(i, 11)
    const kb = B.scatterAt + j * 2 + (1 - hf) * 18
    if (k < kb) continue
    const born = V.p(b.x + (hash(i, 12) - 0.5) * b.w, S.floor - b.h * hf)
    const u = smooth((k - kb) / 34)
    const th = hash(i, 13) * Math.PI * 2 + (k - kb) * (0.09 + hash(i, 14) * 0.06) * (i & 1 ? 1 : -1)
    const R = (70 + hash(i, 15) * 90 - clamp((k - B.cuts[0]) / 80, 0, 1) * 30) * z
    const orb = { x: vort.x + Math.cos(th) * R, y: vort.y + Math.sin(th) * R * 0.75 }
    const cp = { x: (born.x + orb.x) / 2, y: Math.min(born.y, orb.y) - (120 + hash(i, 16) * 160) * z }
    let x = (1 - u) ** 2 * born.x + 2 * (1 - u) * u * cp.x + u * u * orb.x, y = (1 - u) ** 2 * born.y + 2 * (1 - u) * u * cp.y + u * u * orb.y
    if (pull > 0) { x = lerp(x, home.x + Math.cos(th) * 30 * z, pull); y = lerp(y, home.y + Math.sin(th) * 50 * z, pull) }
    const s = (5 + hash(i, 17) * 6) * Math.max(0.8, z)
    petal(ctx, x, y, s, k * 0.2 + i, PINK[i % 5], (1 - pull * 0.9) * clamp((k - kb) / 4, 0, 1))
  }
  // the vortex glow + streaks once it has closed
  const va = clamp((k - B.cuts[0] + 10) / 20, 0, 1) * (1 - pull)
  if (va > 0) {
    glow(ctx, vort.x, vort.y, 170 * z, '255,120,170', 0.35 * va)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffd6e4'; ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.4 * va; const r = (90 + i * 14) * z; const a0 = k * 0.12 * (i & 1 ? 1 : -1) + i
      ctx.beginPath(); ctx.ellipse(vort.x, vort.y, r, r * 0.75, 0, a0, a0 + 2.2); ctx.stroke() }
    ctx.restore()
  }
}
function slashArc(ctx, c, z, u, seed) {
  const a = Math.sin(Math.PI * u), r = 110 * z, a0 = hash(seed, 2) * Math.PI * 2
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5 * z
  ctx.beginPath(); ctx.arc(c.x, c.y, r, a0, a0 + 1.6 * outE(u * 1.5)); ctx.stroke(); ctx.restore()
}
function burst(ctx, V, S, k, B, vort) {
  const kp = k - B.thrustAt; if (kp > 70) return
  const z = V.z
  for (let i = 0; i < 160; i++) {
    const an = hash(i, 31) * Math.PI * 2, sp = (6 + hash(i, 32) * 14) * z, d = sp * kp * (1 - kp / 160)
    petal(ctx, vort.x + Math.cos(an) * d, vort.y + Math.sin(an) * d * 0.8 + kp * kp * 0.02 * z, (3 + hash(i, 33) * 5) * z, kp * 0.3 + i, PINK[i % 5], 1 - kp / 70)
  }
  if (kp < 30) glow(ctx, vort.x, vort.y, (100 + kp * 14) * z, '255,170,210', 1 - kp / 30)
}
function rain(ctx, W, H, S, k, B) {
  if (calmMotion()) return
  const a = Math.min(clamp((k - B.afterAt + 10) / 20, 0, 1), clamp((B.total - k) / 16, 0, 1))
  for (let i = 0; i < 70; i++) {
    const ph = (((k - B.afterAt + 10) * (0.5 + hash(i, 41) * 0.6) + hash(i, 42) * 200) % 200) / 200
    petal(ctx, hash(i, 43) * W + Math.sin(k * 0.05 + i) * 30, -20 + ph * (H + 40), 4 + hash(i, 44) * 4, k * 0.06 + i, PINK[i % 5], a * 0.9)
  }
}
