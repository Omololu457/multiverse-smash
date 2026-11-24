// hinataUltFx.js — RENDER-ONLY half of Hinata's BYAKUGAN · JŪHO SŌSHIKEN — TWIN LION FISTS cinematic (hinataUlt.js).
// One screen pass while it runs: world→screen from camera.js; both fighters from their real sheets (skins included); the
// Byakugan eye cut-in and the X-ray of the foe's chakra network (64 tenketsu); two procedural lavender chakra lions on her
// hands; her own Hakke trigram + palm-pulse + chakra-sphere strips; the palm-count call-outs; impact frames; letterbox.
// Pure functions of the scene's frames; noise = integer hash. Reduce Flashing / Reduce Motion respected.
import { HB, PALM_CALLS, hinataX, foeAt } from './hinataUlt.js'
import { image, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  strip, letterbox, subtitle, lineA, kanjiTitle, damagePops, glow, rings, wash, desat, skinned } from './narutoUltFxKit.js'

const TRIGRAM = './hinata_fx_trigram_uniform.png', PULSE = './hinata_fx_pulse_uniform.png', SPHERE = './hinata_fx_sphere_uniform.png'
const RUSH = './hinata_gf_rush_uniform.png', END = './hinata_gf_end_uniform.png'
const LAV = '170,150,255', ICE = '150,235,225'

export function preloadHinataUlt(f, t) {
  for (const s of [TRIGRAM, PULSE, SPHERE, RUSH, END]) { image(s); image(skinned(f, s)) }
  for (const k of ['idle', 'hhJuuhou', 'hhByakugan', 'dash']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

// the 64 tenketsu on a standing body, in 0..1 of the body box (x across, y down); chakra lines join neighbours
const SKEL = (() => {
  const pts = [], add = (x, y) => pts.push([x, y])
  for (let i = 0; i < 6; i++) add(0.5 + Math.cos(i / 6 * Math.PI * 2) * 0.09, 0.1 + Math.sin(i / 6 * Math.PI * 2) * 0.06)   // head
  for (let i = 0; i < 16; i++) add(0.5 + ((i % 4) - 1.5) * 0.08, 0.24 + (i >> 2) * 0.08)                                     // torso grid
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) add(0.5 + s * (0.18 + i * 0.035), 0.26 + i * 0.045)                   // arms
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) add(0.5 + s * (0.06 + i * 0.012), 0.58 + i * 0.035)                  // legs
  while (pts.length < 64) add(0.5, 0.2 + pts.length * 0.001)
  return pts.slice(0, 64)
})()

export function drawHinataUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const last = S.nums?.length ? S.nums[S.nums.length - 1] : null
  const fr = S.nums?.length >= 7 ? S.nums[6].real : null, pr = fr != null ? S.real - fr : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 14 : 5), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 14 : 5) } : { x: 0, y: 0 }
  const hx = hinataX(S, k), q = foeAt(S, k), hp = V.p(hx, S.floor), qp = V.p(q.x, q.y)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grading: a hushed lavender night falls; deeper inside the palm field
  const nightA = k < HB.eyeAt ? 0.35 * smooth(S.real / 16) : k < HB.landAt + 20 ? 0.6 : 0.6 * (1 - smooth((k - HB.landAt - 20) / 30))
  desat(ctx, W, H, nightA, '#2a2460', 0.55)

  // 2) the Hakke trigram under her (and then under both)
  if (k >= HB.lionAt) {
    const u = outE((k - HB.lionAt) / 18), out = clamp(1 - (k - HB.blastEnd) / 30, 0, 1)
    const cx = k < HB.stepAt ? hp.x : V.p((hx + q.x) / 2, 0).x
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, hp.y + 6 * z)
    strip(ctx, TRIGRAM, 1, 0, 0, 0, z * (0.8 + 1.2 * u) * (k >= HB.stepAt ? 1.3 : 1), { ay: 0.5, alpha: 0.75 * u * out, smooth: true })
    ctx.restore()
  }

  // 3) fighters + lions
  drawFoe(ctx, S, V, k, qp)
  if (k >= HB.lionAt && k < HB.finalAt + 2) lions(ctx, S, V, k, hp, 'back')
  drawHinata(ctx, S, V, k, hp)
  if (k >= HB.lionAt && k < HB.finalAt + 2) lions(ctx, S, V, k, hp, 'front')

  // 4) palms: chakra pulses on the body + speed lines; the twin-lion blast
  if (k >= HB.palmAt && k < HB.finalAt) palmStorm(ctx, S, V, k, qp, z)
  if (k >= HB.finalAt && k < HB.blastEnd + 10) lionBlast(ctx, S, V, k, qp, z)
  if (k >= HB.finalAt && pr >= 0 && pr < 40) rings(ctx, qp.x, qp.y - 55 * z, pr / 40, 520 * z, '#d8ccff', 3, 0.6, 10 * z)
  if (k >= HB.stepAt && k < HB.palmAt + 4 && !calmMotion()) speedLines(ctx, W, H, qp.x, qp.y - 50 * z, 50, 9, '#d8ccff', 0.4, true, S.real)

  // 5) punch-ins
  const head = V.p(S.fx0, S.floor - 82)
  if (k < HB.eyeAt) punchIn(ctx, canvas, W, H, head.x, head.y, 1 + 0.45 * smooth((k - 4) / 28))
  else if (k >= HB.lionAt + 16 && k < HB.stepAt) punchIn(ctx, canvas, W, H, hp.x, hp.y - 60 * z, 1 + 0.25 * smooth((k - HB.lionAt - 16) / 16))
  else if (k >= HB.palmAt && k < HB.finalAt && last && S.real - last.real < 3) punchIn(ctx, canvas, W, H, qp.x, qp.y - 55 * z, 1.12)

  // 6) the Byakugan + the X-ray
  if (k >= HB.eyeAt && k < HB.xrayAt + 2) eyeCut(ctx, W, H, S, k)
  if (k >= HB.xrayAt && k < HB.lionAt) xray(ctx, W, H, S, k, V)
  if (k >= HB.eyeAt + 6 && k < HB.lionAt) kanjiTitle(ctx, W, H, '白眼', 'BYAKUGAN', (k - HB.eyeAt - 6) / (HB.lionAt - HB.eyeAt - 6), { side: dir, fill: '#eae6ff', stroke: '#1a1040', edge: '#b6a8ff' })
  if (k >= HB.lionAt + 8 && k < HB.palmAt + 4) kanjiTitle(ctx, W, H, '柔歩双獅拳', 'JŪHO SŌSHIKEN · TWIN LION FISTS', (k - HB.lionAt - 8) / (HB.palmAt + 4 - HB.lionAt - 8), { side: -dir, fill: '#eae6ff', stroke: '#1a1040', edge: '#b6a8ff', fs: 0.1 })
  if (k >= HB.palmAt) palmCall(ctx, W, H, S, k, dir)

  // 7) impact frames on the twin lions
  if (pr >= 3 && pr < 10 && !calmFlash()) {
    const white = pr < 6, bg = white ? '#ffffff' : '#070418', fg = white ? '#070418' : '#cfc4ff'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, qp.x, qp.y - 50 * z, 90, 51 + pr, fg, 0.9, false, pr)
    ctx.translate(W / 2, H * 0.62); ctx.scale(1.8, 1.8); ctx.translate(-(hp.x + qp.x) / 2, -hp.y)
    strip(ctx, skinned(f, END), 2, 0, hp.x, hp.y, (f.spriteScale || 1.5) * z, { dir, tint: fg, cropTop: 10 })
    sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, -dir, { tint: fg, tintA: 1, sx: 0.85, skew: -dir * 0.2 })
    ctx.restore()
  }
  damagePops(ctx, W, H, S, V, '#b6a8ff')
  ctx.restore()

  letterbox(ctx, W, H, k, S.real, HB.total)
  subtitle(ctx, W, H, 'HINATA', "I won't go back on my word… that's my ninja way, too!", lineA(k, 2, HB.eyeAt + 4), '#b6a8ff')
  subtitle(ctx, W, H, 'HINATA', "I'm not the girl who gives up anymore.", lineA(k, HB.landAt + 2, HB.total - 2), '#b6a8ff')
  return true
}

// ── fighters ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawHinata(ctx, S, V, k, hp) {
  const f = S.caster, z = V.z, dir = S.dir, sc = (f.spriteScale || 1.5) * z
  glow(ctx, hp.x, hp.y - 50 * z, 110 * z, LAV, k < HB.eyeAt ? 0.18 * smooth(k / 20) : k < HB.landAt ? 0.2 : 0.2 * (1 - smooth((k - HB.landAt) / 30)))
  if (k < HB.eyeAt) { sprite(ctx, f, ['hhJuuhou', 'idle'], k < 18 ? 0 : 1, hp.x, hp.y, z, dir); return }
  if (k < HB.lionAt) { sprite(ctx, f, ['hhByakugan', 'idle'], Math.min(3, (k - HB.eyeAt) >> 3), hp.x, hp.y, z, dir); return }
  if (k < HB.stepAt) { sprite(ctx, f, ['hhJuuhou', 'idle'], Math.min(9, 2 + ((k - HB.lionAt) >> 2)), hp.x, hp.y, z, dir); return }
  if (k < HB.palmAt) {
    if (!calmMotion()) for (let g = 3; g >= 1; g--) strip(ctx, skinned(f, END), 2, 0, hp.x - dir * g * 18 * z, hp.y, sc, { dir, alpha: 0.18 * (4 - g), tint: '#cfc4ff', cropTop: 10 })
    strip(ctx, skinned(f, END), 2, 0, hp.x, hp.y, sc, { dir, cropTop: 10 }); return
  }
  if (k < HB.finalAt) { strip(ctx, skinned(f, RUSH), 9, 2 + ((S.real >> 1) % 7), hp.x, hp.y, sc, { dir }); return }
  if (k < HB.blastEnd + 16) { strip(ctx, skinned(f, END), 2, k < HB.finalAt + 14 ? 0 : 1, hp.x, hp.y, sc, { dir, cropTop: 10 }); return }
  sprite(ctx, f, ['hhJuuhou', 'idle'], k < HB.blastEnd + 30 ? 1 : 0, hp.x, hp.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (S.blocked) { sprite(ctx, t, k < HB.palmAt ? ['idle'] : ['guard', 'idle'], 9, qp.x, qp.y, z, fdir); return }
  if (k < HB.palmAt) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, qp.x, qp.y, z, fdir); return }
  if (k < HB.finalAt) {   // each palm jolts them; the chakra visibly leaves (a cold tint creeping in)
    const since = (k - HB.palmAt) % HB.palmEvery, jolt = since < 3 ? (3 - since) * 2 * z : 0
    sprite(ctx, t, ['hurt', 'idle'], since < 4 ? 0 : 9, qp.x + S.dir * jolt, qp.y, z, fdir, { tint: '#6a70c8', tintA: 0.12 + 0.3 * smooth((k - HB.palmAt) / 60) })
    return
  }
  if (k < HB.landAt) { sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, fdir, { rot: (k - HB.finalAt) * 0.12 * S.dir }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
  if (k < HB.landAt + 22) { const u = (k - HB.landAt) / 22; ctx.save(); ctx.globalAlpha = (1 - u) * 0.6; ctx.fillStyle = '#b8b0d0'; ctx.beginPath(); ctx.ellipse(qp.x, qp.y, (30 + u * 80) * z, (8 + u * 12) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}

// ── the chakra lions ─────────────────────────────────────────────────────────────────────────────────────────────────
// a lion-head of living chakra flame, in profile facing +x (the canon Twin Lion Fists shroud each hand)
const LION = [[0.95, -0.02], [0.8, -0.28], [0.5, -0.42], [0.36, -0.78, 1], [0.18, -0.5], [0.02, -0.92, 1], [-0.1, -0.52], [-0.4, -0.86, 1], [-0.38, -0.42],
  [-0.82, -0.62, 1], [-0.55, -0.16], [-1.0, -0.08, 1], [-0.55, 0.1], [-0.88, 0.42, 1], [-0.38, 0.34], [-0.5, 0.78, 1], [-0.1, 0.46], [0.06, 0.74, 1], [0.22, 0.42]]
function lionHead(ctx, x, y, r, dir, k, seed, a, roar) {
  if (a <= 0) return
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1)
  const jaw = 0.12 + 0.3 * roar
  const path = () => {
    ctx.beginPath()
    LION.forEach(([px, py, tip], i) => {
      const fl = tip ? 1 + 0.18 * Math.sin(k * 0.55 + i * 2.1 + seed) + 0.1 * hash(seed + (k >> 2), i) : 1
      const X = px * r * fl - (tip ? 0.06 * r * Math.sin(k * 0.3 + i) : 0), Y = py * r * fl
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)
    })
    ctx.lineTo(0.58 * r, (0.2 + jaw) * r); ctx.lineTo(0.42 * r, 0.14 * r); ctx.lineTo(0.9 * r, 0.1 * r); ctx.closePath()
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1) * 0.5
  const og = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.8); og.addColorStop(0, `rgba(${LAV},0.6)`); og.addColorStop(1, `rgba(${LAV},0)`)
  ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.globalAlpha = clamp(a, 0, 1) * 0.82
  const g = ctx.createLinearGradient(r, 0, -r, 0); g.addColorStop(0, '#f4f0ff'); g.addColorStop(0.45, '#a898ff'); g.addColorStop(1, 'rgba(110,90,230,0.55)')
  path(); ctx.fillStyle = g; ctx.fill()
  ctx.globalAlpha = clamp(a, 0, 1); ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.stroke()
  // inner flame ripples
  ctx.save(); path(); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${ICE},0.55)`; ctx.lineWidth = Math.max(1, r * 0.04)
  for (let i = 0; i < 4; i++) { const yy = (i - 1.5) * r * 0.3, ph = k * 0.25 + i; ctx.beginPath(); ctx.moveTo(r * 0.3, yy); ctx.bezierCurveTo(-r * 0.1, yy - r * 0.2 * Math.sin(ph), -r * 0.5, yy + r * 0.2 * Math.sin(ph), -r * 0.9, yy); ctx.stroke() }
  ctx.restore()
  // the mouth, the teeth, the eye
  ctx.fillStyle = 'rgba(26,14,72,0.85)'; ctx.beginPath(); ctx.moveTo(0.42 * r, 0.14 * r); ctx.lineTo(0.9 * r, 0.1 * r); ctx.lineTo(0.58 * r, (0.2 + jaw) * r); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#ffffff'; for (const tx of [0.56, 0.72]) { ctx.beginPath(); ctx.moveTo(tx * r, 0.12 * r); ctx.lineTo((tx + 0.04) * r, (0.22 + jaw * 0.3) * r); ctx.lineTo((tx + 0.08) * r, 0.11 * r); ctx.fill() }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${ICE},0.9)`; ctx.beginPath(); ctx.arc(0.5 * r, -0.2 * r, r * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0.36 * r, -0.24 * r); ctx.lineTo(0.66 * r, -0.2 * r); ctx.lineTo(0.4 * r, -0.14 * r); ctx.closePath(); ctx.fill()
  ctx.restore()
}
function lions(ctx, S, V, k, hp, layer) {
  const z = V.z, dir = S.dir, u = smooth((k - HB.lionAt) / 22), roar = k >= HB.lionAt + 22 && k < HB.lionAt + 36 ? 1 : 0.3
  const fighting = k >= HB.palmAt, r = (fighting ? 30 : 16 + 22 * u) * z
  const bob = Math.sin(k * 0.25) * 4 * z
  if (layer === 'front') {
    const x = hp.x + dir * (fighting ? 46 + (k % HB.palmEvery < 4 ? 14 : 0) : 50) * z, y = hp.y - (fighting ? 60 : 66) * z + bob
    lionHead(ctx, x, y, r, dir, k, 3, u, roar)
  } else {
    const x = hp.x - dir * (fighting ? -24 : 50) * z, y = hp.y - (fighting ? 82 : 66) * z - bob
    lionHead(ctx, x, y, r * 0.92, fighting ? dir : -dir, k, 7, u * 0.9, roar)
  }
}
function palmStorm(ctx, S, V, k, qp, z) {
  const i = Math.floor((k - HB.palmAt) / HB.palmEvery), since = (k - HB.palmAt) % HB.palmEvery, n = 2 ** (i + 1)
  // n palm prints per beat, scattered over the body (more each beat)
  ctx.save()
  const show = Math.min(n, 24)
  for (let j = 0; j < show; j++) {
    const px = qp.x + (hash(i * 97 + j, 1) - 0.5) * 50 * z, py = qp.y - (16 + hash(i * 97 + j, 2) * 76) * z, a = clamp(1 - since / 8, 0, 1) * (0.5 + 0.5 * hash(j, i))
    strip(ctx, PULSE, 4, (since >> 1) % 4, px, py, (0.5 + 0.15 * i) * z, { ay: 0.5, alpha: a, comp: 'lighter' })
  }
  ctx.restore()
  glow(ctx, qp.x, qp.y - 55 * z, (60 + i * 14) * z, LAV, 0.4 * clamp(1 - since / 6, 0, 1))
}
function lionBlast(ctx, S, V, k, qp, z) {   // both lions crash through: the sphere bursts, a lion-shaped wave carries the foe
  const u = (k - HB.finalAt) / (HB.blastEnd - HB.finalAt)
  strip(ctx, SPHERE, 4, Math.min(3, (k - HB.finalAt) >> 2), qp.x - S.dir * 10 * z, qp.y - 55 * z, (0.6 + 2.6 * outE(u)) * z, { ay: 0.5, alpha: clamp(1 - (u - 0.5) * 2, 0, 1), comp: 'lighter', smooth: true })
  const a = clamp(1 - u * 1.1, 0, 1)
  lionHead(ctx, qp.x - S.dir * 20 * z, qp.y - 70 * z, 60 * z * (1 + u * 0.5), S.dir, k, 11, a, 1)
  lionHead(ctx, qp.x - S.dir * 40 * z, qp.y - 30 * z, 52 * z * (1 + u * 0.5), S.dir, k, 13, a * 0.9, 1)
}

// ── the eye + the X-ray ──────────────────────────────────────────────────────────────────────────────────────────────
function eyeCut(ctx, W, H, S, k) {
  const u = (k - HB.eyeAt) / (HB.xrayAt - HB.eyeAt), bandH = H * 0.3 * outE(clamp(u * 3, 0, 1)), y = H * 0.5
  ctx.save(); ctx.fillStyle = '#05030c'; ctx.fillRect(0, y - bandH / 2, W, bandH)
  ctx.beginPath(); ctx.rect(0, y - bandH / 2, W, bandH); ctx.clip()
  const ex = W / 2, ew = W * 0.32, open = outE(clamp((u - 0.15) * 2, 0, 1)), eh = H * 0.1 * open
  // the veins bulging out of the temples
  ctx.strokeStyle = '#4a3a8a'; ctx.lineCap = 'round'
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
    let x = ex + s * ew * 0.95, yy = y + (i - 4) * H * 0.014; ctx.lineWidth = 3 + (i % 3); ctx.beginPath(); ctx.moveTo(x, yy)
    for (let j = 0; j < 7 * smooth(u * 1.6); j++) { x += s * W * 0.025; yy += (hash(i * 9 + j, s + 3) - 0.5) * H * 0.03; ctx.lineTo(x, yy) }
    ctx.stroke()
  }
  ctx.fillStyle = '#ece8f6'; ctx.beginPath(); ctx.moveTo(ex - ew, y); ctx.quadraticCurveTo(ex, y - eh * 2, ex + ew, y); ctx.quadraticCurveTo(ex, y + eh * 2, ex - ew, y); ctx.fill()
  ctx.save(); ctx.clip()
  const r = H * 0.09, g = ctx.createRadialGradient(ex, y, r * 0.1, ex, y, r); g.addColorStop(0, '#f6f2ff'); g.addColorStop(0.7, '#cfc6ec'); g.addColorStop(1, '#8e84b8')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(120,108,170,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, y, r * 0.45, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = '#120a20'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex - ew, y); ctx.quadraticCurveTo(ex, y - eh * 2, ex + ew, y); ctx.stroke()
  ctx.restore()
}
function xray(ctx, W, H, S, k, V) {
  const u = (k - HB.xrayAt) / (HB.lionAt - HB.xrayAt), a = Math.min(clamp((k - HB.xrayAt) / 4, 0, 1), clamp((HB.lionAt - k) / 5, 0, 1))
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H); g.addColorStop(0, '#141040'); g.addColorStop(1, '#03020a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // concentric Byakugan sonar rings
  ctx.strokeStyle = 'rgba(160,150,255,0.25)'; ctx.lineWidth = 2
  for (let i = 0; i < 6; i++) { const rr = ((S.real * 4 + i * 80) % 480) / 480; ctx.globalAlpha = a * (1 - rr); ctx.beginPath(); ctx.arc(W / 2, H * 0.52, rr * H * 0.9, 0, Math.PI * 2); ctx.stroke() }
  ctx.globalAlpha = a
  // the foe, huge, as a dark silhouette
  const bodyH = H * 0.62, feetY = H * 0.86, z2 = bodyH / ((S.target.h || 94) * 1.0)
  const box = sprite(ctx, S.target, ['idle'], 0, W / 2, feetY, z2 * 0.55, -S.dir, { tint: '#2c2a6c', tintA: 0.9 })
  const top = box ? box.top : feetY - bodyH, h = box ? box.h : bodyH, bw = h * 0.55
  // chakra network + the 64 tenketsu lighting up in order
  const lit = Math.floor(64 * smooth(u * 1.4))
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(${ICE},0.5)`; ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 1; i < 64; i++) { const [x0, y0] = SKEL[i - 1], [x1, y1] = SKEL[i]; if (Math.hypot(x1 - x0, y1 - y0) > 0.15) continue
    ctx.moveTo(W / 2 + (x0 - 0.5) * bw, top + y0 * h); ctx.lineTo(W / 2 + (x1 - 0.5) * bw, top + y1 * h) }
  ctx.stroke()
  for (let i = 0; i < 64; i++) {
    const [x, y] = SKEL[i], px = W / 2 + (x - 0.5) * bw, py = top + y * h, on = i < lit, pulse = on ? 0.7 + 0.3 * Math.sin(S.real * 0.4 + i) : 0.15
    glow(ctx, px, py, H * 0.018, ICE, pulse); ctx.fillStyle = on ? '#ffffff' : 'rgba(150,235,225,0.3)'; ctx.beginPath(); ctx.arc(px, py, H * 0.004 + (on ? H * 0.002 : 0), 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
  ctx.font = `900 ${Math.round(H * 0.04)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#cfc6ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6
  const txt = `TENKETSU  ${String(lit).padStart(2, '0')} / 64`; ctx.strokeText(txt, W / 2, H * 0.2); ctx.fillText(txt, W / 2, H * 0.2)
  ctx.restore()
}
function palmCall(ctx, W, H, S, k, dir) {   // TWO PALMS! … SIXTY-FOUR PALMS! stamped with each beat
  const i = Math.min(5, Math.floor((k - HB.palmAt) / HB.palmEvery)), since = k - HB.palmAt - i * HB.palmEvery
  if (k >= HB.finalAt) return
  const sc = 1 + Math.max(0, 1 - since / 4) * 0.7, fs = Math.round(H * (0.07 + i * 0.008))
  ctx.save(); ctx.translate(W * (dir > 0 ? 0.32 : 0.68), H * (0.24 + (i % 2) * 0.03)); ctx.rotate(-0.06 * dir * (i % 2 ? -1 : 1)); ctx.scale(sc, sc)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.22; ctx.strokeStyle = '#100828'; ctx.strokeText(PALM_CALLS[i], 0, 0); ctx.fillStyle = i === 5 ? '#ffffff' : '#cfc6ff'; ctx.fillText(PALM_CALLS[i], 0, 0)
  ctx.restore()
}
