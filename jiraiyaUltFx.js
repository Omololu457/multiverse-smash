// jiraiyaUltFx.js — RENDER-ONLY half of Jiraiya's two cinematic ultimates (jiraiyaUlt.js): the Sage Art Ultra-Big Ball
// Rasengan (sage markings, the swelling sphere, the drive, the grind, the spiral blast) and the Gamabunta summoning (hand
// signs, seal, colossal smoke, the boss toad looming with Jiraiya on his head, the giant dagger sweep and chop, the poof).
// One screen pass from camera.js's world→screen; pure functions of the scene's frames; noise = integer hash.
import { OD, GB } from './jiraiyaUlt.js'
import { sprite, view, punchIn, speedLines, wash, desat, calligraphy, sub, letterbox, glow, rings, impactFrame, damageNumber, debris,
  image, ready, hash, clamp, smooth, outE, calmMotion, calmFlash } from './bleachUltKit.js'
import { kanjiTitle, cracks } from './narutoUltFxKit.js'

const TRANSFORM = { sheet: './jiraiya_hermit_transform_uniform.png', frames: 14, width: 67, height: 80 }
const TOAD = './jiraiya_gama_toad_uniform.png', DAGGER = './jiraiya_gama_dagger_uniform.png', SMOKE = './jiraiya_gama_smoke_uniform.png'
const WHO = 'JIRAIYA', WHO_COL = '#ffb347', RAS = '120,200,255'

export function drawJiraiyaUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720
  const V = view(W, H), z = V.z, held = S.hold > 0
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 12, y: (hash(S.real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)
  const r = S.mode === 'bunta' ? drawBunta(ctx, canvas, S, W, H, V, z) : drawOdama(ctx, canvas, S, W, H, V, z)
  ctx.restore()
  const k = S.pf ?? S.frame
  r?.titles?.()
  letterbox(ctx, W, H, S.real, k, S.end - 14)
  r?.subs?.()
  return true
}

// ── shared bits ──────────────────────────────────────────────────────────────────────────────────────────────────────
function smallNum(ctx, W, H, S, x, y, z, col) {
  if (!S.lastHit || S.real - S.lastHit.real >= 22 || S.hitReal != null) return
  const age = S.real - S.lastHit.real, fs = Math.round(H * 0.05 * (1 + Math.max(0, 1 - age / 5) * 0.7))
  ctx.save(); ctx.globalAlpha = clamp(1.4 - age / 16, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const nx = clamp(x + (hash(S.hits, 3) - 0.5) * 80, W * 0.1, W * 0.9), ny = clamp(y - age * 1.5, H * 0.18, H * 0.8)
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#1a0800'; ctx.strokeText(String(Math.round(S.lastHit.d)), nx, ny); ctx.fillStyle = S.blocked ? '#ffd27a' : col; ctx.fillText(String(Math.round(S.lastHit.d)), nx, ny); ctx.restore()
}
function foeSprite(ctx, S, k, tp, z, hitK, cr) {
  const t = S.target, fdir = -S.dir
  if (k < hitK) { sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['idle'], S.blocked ? 9 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (cr < 0) { const recent = S.lastCut && S.real - S.lastCut.real < 6, sh = recent && !calmMotion() ? (hash(S.real, 7) - 0.5) * 10 * z : 0
    sprite(ctx, t, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], S.blocked ? 9 : 0, tp.x + sh, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  if ((S.ty || 0) > 2) { sprite(ctx, t, ['hurt_air', 'hurt', 'idle'], 0, tp.x, tp.y, z, fdir, { rot: -S.dir * clamp(cr / 20, 0, 1) * 0.8 }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir)
}
function callout(ctx, W, H, cr, dir, jp, en, col, stroke) {
  const su = clamp((cr - 12) / 5, 0, 1), sc = 1 + (1 - su) * 1.1, a = clamp(1 - (cr - 58) / 16, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.3 : 0.7), H * 0.25); ctx.rotate(-0.05 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.09)
  ctx.font = `900 ${fs}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = stroke; ctx.strokeText(jp, 0, 0); ctx.fillStyle = '#fff6ea'; ctx.fillText(jp, 0, 0)
  ctx.font = `900 ${Math.round(fs * 0.38)}px Impact, "Arial Black", sans-serif`; ctx.lineWidth = fs * 0.08; ctx.strokeText(en, 0, fs * 0.74); ctx.fillStyle = col; ctx.fillText(en, 0, fs * 0.74)
  ctx.restore()
}

// ── SAGE ART: ULTRA-BIG BALL RASENGAN ────────────────────────────────────────────────────────────────────────────────
function rasengan(ctx, x, y, R, real, a = 1) {
  if (R <= 0 || a <= 0) return
  glow(ctx, x, y, R * 2.4, RAS, 0.55 * a)
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(x, y, R * 0.05, x, y, R); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#bfe8ff'); g.addColorStop(0.8, '#3a9cff'); g.addColorStop(1, 'rgba(40,120,255,0.2)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (let i = 0; i < 9; i++) { const sp = real * (0.25 + 0.04 * i) + i * 0.7, rr = R * (0.35 + 0.07 * i)
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(150,220,255,0.8)'; ctx.lineWidth = Math.max(1.5, R * 0.05)
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * (0.35 + 0.3 * hash(i, 4)), sp * 0.3, sp, sp + 2.2); ctx.stroke() }
  ctx.restore()
}
function drawOdama(ctx, canvas, S, W, H, V, z) {
  const k = S.pf ?? S.frame, f = S.caster, dir = S.dir, cr = S.hitReal != null ? S.real - S.hitReal : -1
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), foeMid = V.p(S.tx0, S.tFloor - 50), floorY = V.p(0, S.tFloor).y
  const wa = k < OD.burstAt + 40 ? smooth(k / 20) : 1 - smooth((k - OD.burstAt - 40) / 26)
  desat(ctx, W, H, 0.55 * wa); wash(ctx, W, H, '#10203a', 0.35 * wa, 'multiply')
  // sphere radius (world px) and where it is
  const R = k < OD.formAt ? 0 : k < OD.leapAt ? 12 + 88 * smooth((k - OD.formAt) / (OD.leapAt - OD.formAt - 10)) : cr >= 0 ? 100 + cr * 8 : 100 + (k >= OD.hitAt ? Math.sin(S.real * 0.6) * 4 : 0)
  let sp
  if (k < OD.leapAt) sp = V.p(S.fx + dir * 10, S.floor - 100 - 30 * smooth((k - OD.formAt) / 50) - R * 0.9)
  else if (k < OD.hitAt) { const hand = V.p(S.fx + dir * 30, S.floor - (S.fy || 0) - 105); sp = hand }
  else sp = V.p(S.tx0, S.tFloor - 70)
  // nature-chakra particles drawn in (Sage)
  if (k < OD.formAt + 40 && !calmMotion()) for (let i = 0; i < 40; i++) { const u = ((S.real * 1.3 + hash(i, 1) * 40) % 40) / 40, an = hash(i, 2) * Math.PI * 2, rr = (260 * (1 - u) + 20) * z
    ctx.save(); ctx.globalAlpha = smooth(k / 14) * u * 0.8; ctx.fillStyle = i % 2 ? '#ffc060' : '#b8ff9a'; ctx.beginPath(); ctx.arc(fp.x + Math.cos(an) * rr, fp.y - 60 * z + Math.sin(an) * rr * 0.6, 2.5 * z, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  // the grind carves the floor
  if (k >= OD.hitAt) cracks(ctx, foeMid.x, floorY + 2, 300 * z, clamp((k - OD.hitAt) / 50, 0, 1), 37, 14, '#0a0a14', `rgba(${RAS},0.35)`)
  // people
  const hitK = OD.grinds[0]
  foeSprite(ctx, S, k, tp, z, hitK, cr)
  if (k < OD.formAt) sprite(ctx, f, ['idle'], (S.real >> 3) % 5, fp.x, fp.y, z, dir)
  else if (k < OD.leapAt) sprite(ctx, f, TRANSFORM, 12, fp.x, fp.y, z, dir)
  else if (k < OD.hitAt) sprite(ctx, f, ['jump', 'idle'], 2, fp.x, fp.y, z, dir)
  else sprite(ctx, f, k < OD.burstAt + 20 ? ['heavy', 'idle'] : ['idle'], k < OD.burstAt + 20 ? 6 : (S.real >> 3) % 5, fp.x, fp.y, z, dir)
  // the sphere (over the foe while grinding)
  if (k >= OD.formAt && (cr < 0 || cr < 6)) rasengan(ctx, sp.x, sp.y, R * z, S.real, cr >= 0 ? 1 - cr / 6 : 1)
  if (k >= OD.formAt && k < OD.leapAt) speedLines(ctx, W, H, sp.x, sp.y, 56, 13, '#cfeaff', 0.35 * smooth((k - OD.formAt) / 16), true, S.real)
  OD.grinds.forEach((at, i) => { const a = k - at; if (a < 0 || a > 12) return; rings(ctx, sp.x, sp.y, a / 12, 2, 220 * z, '#dff4ff', 7 * z, 0.45) })
  if (k >= OD.hitAt && k < OD.burstAt) debris(ctx, foeMid.x, floorY, (k - OD.hitAt) % 40, 14, z, 70 + ((k - OD.hitAt) / 40 | 0), '#5a5a68', 340, 18)
  if (cr >= 0 && cr < 60) {   // the spiral blast
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) { const u = clamp(cr / 30 - i * 0.08, 0, 1), rr = (60 + 520 * outE(u)) * z; ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = i % 2 ? '#ffffff' : `rgba(${RAS},1)`; ctx.lineWidth = (14 - i * 2) * z
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 30 * z, rr, rr * 0.38, 0, 0, Math.PI * 2); ctx.stroke() }
    ctx.restore()
    if (cr < 14) glow(ctx, sp.x, sp.y, 340 * z, RAS, 1 - cr / 14)
    debris(ctx, foeMid.x, floorY, cr, 30, z, 91, '#5a5a68', 500, 26)
  }
  // close-ups + impact
  if (k >= 6 && k < OD.formAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 64 * z, 1 + 0.6 * smooth((k - 6) / 24))
  else if (k >= OD.formAt + 20 && k < OD.leapAt) punchIn(ctx, canvas, W, H, sp.x, sp.y + 40 * z, 1 + 0.25 * smooth((k - OD.formAt - 20) / 30))
  else if (k >= OD.hitAt && k < OD.burstAt) punchIn(ctx, canvas, W, H, sp.x, sp.y, 1.2 + (S.lastCut && S.real - S.lastCut.real < 5 ? 0.12 : 0))
  else if (cr >= 0 && cr < 4) punchIn(ctx, canvas, W, H, sp.x, sp.y, 1.5)
  if (cr >= 2 && cr < 12 && !calmFlash()) {
    const white = cr < 7, bg = white ? '#ffffff' : '#020a1c', fg = white ? '#020a1c' : '#8fd8ff', cx = W / 2, cy = H * 0.74, Z = Math.max(2.2, z * 1.8)
    impactFrame(ctx, W, H, bg, fg, cx, H * 0.48, 101 + cr, S.real, col => {
      ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + dir * W * 0.1, H * 0.48, H * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      sprite(ctx, f, ['heavy', 'idle'], 6, cx - dir * W * 0.12, cy, Z, dir, { tint: col, tintA: 1 })
    })
  }
  smallNum(ctx, W, H, S, sp.x, sp.y - 110 * z, z, '#7fd0ff')
  if (cr >= 12) damageNumber(ctx, W, H, S, sp.x, sp.y - 130 * z, cr - 12, '#7fd0ff')
  return {
    titles() {
      if (k >= 4 && k < OD.formAt + 4) calligraphy(ctx, W, H, '仙法', (k - 4) / OD.formAt, { x: dir > 0 ? 0.86 : 0.14, y: 0.26, col: '#fff2dc', edge: '#3a1400', glow: 'rgba(255,170,60,0.9)' })
      if (k >= OD.formAt + 4 && k < OD.hitAt) kanjiTitle(ctx, W, H, '超大玉螺旋丸', 'ULTRA-BIG BALL RASENGAN', (k - OD.formAt - 4) / (OD.hitAt - OD.formAt - 4), { side: -dir, fill: '#eaf6ff', stroke: '#02142a', edge: '#7fd0ff', fs: 0.075 })
      if (cr >= 12 && cr < 74) callout(ctx, W, H, cr, dir, '超大玉螺旋丸!!', 'SAGE ART', '#7fd0ff', '#02142a')
      if (k < OD.formAt + 4) sageEyes(ctx, W, H, k, dir)
    },
    subs() {
      sub(ctx, W, H, k, 2, OD.formAt, WHO, 'Sage Mode. The toads lend me the chakra of nature itself.', WHO_COL)
      sub(ctx, W, H, k, OD.formAt + 4, OD.leapAt, WHO, 'Let me show you the real thing — Ultra-Big Ball Rasengan!', WHO_COL)
      sub(ctx, W, H, k, OD.burstAt + 34, OD.total - 2, WHO, "Behold — the gallant Jiraiya!", WHO_COL)
    },
  }
}
function sageEyes(ctx, W, H, k, dir) {   // a close-up band: the toad-sage eyes (horizontal pupils, orange pigment)
  const a = Math.min(clamp((k - 8) / 8, 0, 1), clamp((OD.formAt + 4 - k) / 6, 0, 1)); if (a <= 0) return
  const y = H * 0.3, bh = H * 0.16 * a
  ctx.save(); ctx.fillStyle = '#0c0604'; ctx.fillRect(0, y - bh / 2, W, bh); ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip()
  for (const s of [-1, 1]) { const ex = W / 2 + s * W * 0.14, ew = W * 0.075, eh = bh * 0.3
    ctx.fillStyle = '#d0581c'; ctx.beginPath(); ctx.ellipse(ex, y, ew * 1.5, eh * 1.9, 0, 0, Math.PI * 2); ctx.fill()   // the pigment
    ctx.fillStyle = '#f6e7b0'; ctx.beginPath(); ctx.ellipse(ex, y, ew, eh, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#c8a020'; ctx.beginPath(); ctx.arc(ex, y, eh * 0.85, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000'; ctx.fillRect(ex - eh * 0.75, y - eh * 0.16, eh * 1.5, eh * 0.32) }   // the toad's horizontal pupil
  ctx.restore()
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffb347'; ctx.lineWidth = Math.max(2, H * 0.004); ctx.beginPath(); ctx.moveTo(0, y - bh / 2); ctx.lineTo(W, y - bh / 2); ctx.moveTo(0, y + bh / 2); ctx.lineTo(W, y + bh / 2); ctx.stroke(); ctx.restore()
  void dir
}

// ── SUMMONING: GAMABUNTA ─────────────────────────────────────────────────────────────────────────────────────────────
function smokeCloud(ctx, x, y, R, u, a, seed) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a
  for (let i = 0; i < 30; i++) { const an = hash(i, seed) * Math.PI * 2, rr = R * (i < 4 ? 0.05 : 0.2 + 0.8 * Math.sqrt(hash(i, seed + 1))) * (0.4 + 0.6 * outE(u)), pr = R * (0.22 + 0.2 * hash(i, seed + 2))
    const g = ctx.createRadialGradient(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6, 0, x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6, pr)
    g.addColorStop(0, '#fbf3dc'); g.addColorStop(0.7, 'rgba(226,214,186,0.9)'); g.addColorStop(1, 'rgba(200,190,170,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6, pr, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function drawBunta(ctx, canvas, S, W, H, V, z) {
  const k = S.pf ?? S.frame, f = S.caster, dir = S.dir, cr = S.hitReal != null ? S.real - S.hitReal : -1
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), foeMid = V.p(S.tx0, S.tFloor - 50), floorY = V.p(0, S.floor).y
  const base = V.p(S.fx0, S.floor)
  const wa = k < GB.chopAt + 40 ? smooth(k / 20) : 1 - smooth((k - GB.chopAt - 40) / 30)
  desat(ctx, W, H, 0.4 * wa); wash(ctx, W, H, '#3a2410', 0.3 * wa, 'multiply')
  // the summoning seal
  if (k >= 30 && k < GB.bossAt) seal(ctx, base.x, floorY + 2, (110 + (k - 30) * 3) * z, k, S.real)
  // the toad (behind everything) — rises out of the smoke, stays, poofs
  const toadH = H * 1.05, rise = smooth((k - GB.bossAt + 10) / 34), ta = k < GB.poofAt ? 1 : 1 - smooth((k - GB.poofAt) / 10)
  const im = image(TOAD), tx = base.x - dir * 20 * z
  if (k >= GB.bossAt - 10 && ta > 0 && ready(im)) {
    const s = toadH / 299, w = 412 * s, crop = 250   // drop the smoke rows at the bottom of the art
    const ty = floorY + 40 - crop * s * rise
    ctx.save(); ctx.globalAlpha = ta; ctx.imageSmoothingEnabled = false
    const bob = Math.sin(S.real * 0.05) * 4
    ctx.drawImage(im, 0, 40, 412, crop - 40, tx - w / 2, ty + 40 * s + bob, w, (crop - 40) * s); ctx.restore()
    // pipe smoke
    if (!calmMotion()) for (let i = 0; i < 6; i++) { const u = ((S.real + i * 14) % 84) / 84; smokeCloud(ctx, tx + w * 0.3 * (dir > 0 ? 1 : 1) + u * 40, ty + 140 * s - u * 120, 18 * (1 + u), 1, ta * (1 - u) * 0.5, 300 + i) }
  }
  // the dagger sweep (in front of the toad, behind the foe's front)
  const dIm = image(DAGGER)
  if (k >= GB.drawAt && k < GB.poofAt && ready(dIm)) {
    const L = W * 0.75, s = L / 178, hand = { x: tx + dir * W * 0.05, y: floorY - H * 0.45 }
    let ang
    if (k < GB.cuts[0] - 6) ang = -Math.PI / 2 - 0.6 * smooth((k - GB.drawAt) / 14)               // drawn up
    else if (k < GB.cuts[1] - 6) ang = lerpA(-Math.PI / 2 - 0.6, 0.35, smooth((k - GB.cuts[0] + 6) / 8))   // sweep 1
    else if (k < GB.chopAt - 10) ang = lerpA(0.35, -Math.PI / 2 - 0.3, smooth((k - GB.cuts[1] + 6) / 14))  // back up
    else ang = lerpA(-Math.PI / 2 - 0.3, 0.55, smooth((k - GB.chopAt + 10) / 10))                   // the chop
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.scale(dir, 1); ctx.rotate(ang); ctx.imageSmoothingEnabled = false
    ctx.scale(-1, 1); ctx.drawImage(dIm, 0, 0, 178, 32, -168 * s, -16 * s, 178 * s, 32 * s); ctx.restore()   // the art's hand (right end) sits on the pivot, the blade reaches out
    // sweep trails
    for (const at of [...GB.cuts, GB.chopAt]) { const a = k - at; if (a < -2 || a > 12) continue
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - clamp(a / 12, 0, 1); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 18 * z; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(hand.x, hand.y, L * 0.85, dir > 0 ? -1.4 : Math.PI + 1.4 - 0.9, dir > 0 ? 0.5 : Math.PI + 1.4); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,200,120,0.6)'; ctx.lineWidth = 46 * z; ctx.stroke(); ctx.restore() }
  }
  // foe + Jiraiya
  foeSprite(ctx, S, k, tp, z, GB.cuts[0], cr)
  if (k < 34) sprite(ctx, f, TRANSFORM, Math.min(8, k >> 2), fp.x, fp.y, z, dir)
  else if (k < GB.bossAt) sprite(ctx, f, ['throw', 'idle'], 3, fp.x, fp.y, z, dir)
  else if (k < GB.poofAt) sprite(ctx, f, ['win', 'idle'], Math.min(9, (k - GB.bossAt) >> 3), fp.x, fp.y, z, dir)
  else sprite(ctx, f, ['idle'], (S.real >> 3) % 5, fp.x, fp.y, z, dir)
  // smoke: the summon burst and the poof
  if (k >= GB.smokeAt && k < GB.bossAt + 40) smokeCloud(ctx, base.x, floorY - 120 * z, 380 * z, (k - GB.smokeAt) / 20, k < GB.bossAt ? 1 : 1 - (k - GB.bossAt) / 40, 11)
  if (k >= GB.poofAt) smokeCloud(ctx, tx, floorY - H * 0.3, H * 0.6, (k - GB.poofAt) / 16, 1 - smooth((k - GB.poofAt - 10) / 30), 23)
  // cuts / chop
  GB.cuts.forEach(at => { const a = k - at; if (a < 0 || a > 10) return; if (a < 4) glow(ctx, foeMid.x, foeMid.y, 140 * z, '255,240,220', 0.9 - a * 0.2); rings(ctx, foeMid.x, foeMid.y, a / 10, 2, 180 * z, '#fff0d0', 7 * z, 0.5) })
  if (cr >= 0 && cr < 60) {
    const u = clamp(cr / 8, 0, 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - clamp((cr - 30) / 30, 0, 1)
    ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 10 * z; ctx.beginPath(); ctx.moveTo(foeMid.x - dir * 30 * z, floorY); ctx.lineTo(foeMid.x + dir * 520 * z * u, floorY + 6 * z); ctx.stroke(); ctx.restore()
    if (cr < 14) glow(ctx, foeMid.x, floorY - 40 * z, 320 * z, '255,220,170', 1 - cr / 14)
    debris(ctx, foeMid.x, floorY, cr, 30, z, 121, '#7a5a3a', 460, 28)
  }
  // close-ups + impact
  if (k >= 4 && k < 34) punchIn(ctx, canvas, W, H, fp.x, fp.y - 60 * z, 1 + 0.5 * smooth((k - 4) / 20))
  else if (k >= GB.bossAt + 20 && k < GB.drawAt) punchIn(ctx, canvas, W, H, tx, floorY - H * 0.55, 1 + 0.15 * smooth((k - GB.bossAt - 20) / 30))
  else if (cr >= 0 && cr < 4) punchIn(ctx, canvas, W, H, foeMid.x, foeMid.y, 1.4)
  if (cr >= 2 && cr < 12 && !calmFlash()) {
    const white = cr < 7, bg = white ? '#ffffff' : '#1a0c02', fg = white ? '#1a0c02' : '#ffb347', Z = Math.max(2.2, z * 1.8)
    impactFrame(ctx, W, H, bg, fg, W / 2 + dir * W * 0.1, H * 0.6, 131 + cr, S.real, col => {
      if (ready(dIm)) { ctx.save(); ctx.translate(W * 0.5 - dir * W * 0.35, H * 0.05); ctx.scale(dir, 1); ctx.rotate(0.55); ctx.scale(-1, 1); const s2 = W * 0.9 / 178
        const T = document.createElement('canvas'); T.width = 178; T.height = 32; const g = T.getContext('2d'); g.drawImage(dIm, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, 178, 32)
        ctx.imageSmoothingEnabled = false; ctx.drawImage(T, -178 * s2, -16 * s2, 178 * s2, 32 * s2); ctx.restore() }
      sprite(ctx, S.target, ['hurt', 'idle'], 0, W / 2 + dir * W * 0.16, H * 0.8, Z, -dir, { tint: col, tintA: 1, rot: -dir * 0.3 })
    })
  }
  smallNum(ctx, W, H, S, foeMid.x, foeMid.y - 80 * z, z, '#ff7a3a')
  if (cr >= 12) damageNumber(ctx, W, H, S, foeMid.x, foeMid.y - 100 * z, cr - 12, '#ff7a3a')
  return {
    titles() {
      if (k >= 4 && k < GB.smokeAt + 6) calligraphy(ctx, W, H, '口寄せの術', (k - 4) / (GB.smokeAt + 2), { x: dir > 0 ? 0.88 : 0.12, y: 0.18, size: 0.1, col: '#fff2dc', edge: '#3a1400', glow: 'rgba(255,150,60,0.8)' })
      if (k >= GB.bossAt + 6 && k < GB.drawAt + 20) kanjiTitle(ctx, W, H, 'ガマブン太', 'GAMABUNTA', (k - GB.bossAt - 6) / (GB.drawAt + 14 - GB.bossAt), { side: -dir, fill: '#fff2dc', stroke: '#2a1000', edge: '#ffb347', ink: 'rgba(30,12,0,0.75)', fs: 0.09 })
      if (cr >= 12 && cr < 74) callout(ctx, W, H, cr, dir, 'ドスの一太刀!!', 'GAMABUNTA', '#ffb347', '#2a1000')
    },
    subs() {
      sub(ctx, W, H, k, 2, GB.smokeAt, WHO, 'Summoning Jutsu!', WHO_COL)
      sub(ctx, W, H, k, GB.bossAt + 10, GB.drawAt + 4, 'GAMABUNTA', "Jiraiya! You'd better have a good reason for calling me!", '#d0a070')
      sub(ctx, W, H, k, GB.drawAt + 8, GB.chopAt, WHO, 'Chief Toad — lend me your blade!', WHO_COL)
      sub(ctx, W, H, k, GB.poofAt + 6, GB.total - 2, WHO, 'The Toad Sage strikes again!', WHO_COL)
    },
  }
}
const lerpA = (a, b, u) => a + (b - a) * u
function seal(ctx, x, y, R, k, real) {
  const a = Math.min(clamp((k - 30) / 6, 0, 1), clamp((GB.bossAt - k) / 10, 0, 1))
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(1, 0.3); ctx.strokeStyle = '#1a0a02'; ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 + real * 0.01; ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.3, Math.sin(an) * R * 0.3); ctx.lineTo(Math.cos(an) * R * 1.35, Math.sin(an) * R * 1.35); ctx.stroke() }
  ctx.font = `900 ${Math.round(R * 0.5)}px "Yu Mincho", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1a0a02'; ctx.fillText('口寄', 0, 0)
  ctx.restore()
}
