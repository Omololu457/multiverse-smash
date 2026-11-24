// Violet Parr (violet) — RENDER-ONLY half of the FULL FORCE cinematic (violetUlt.js). Two passes:
//   drawVioletCineWorld(c, fighter) — world space, from drawVioletFx's per-fighter pass. On the FOE's pass (right after the
//        foe's sprite) it draws the force-field sphere over them: translucent purple body, bright rim, hex shimmer, motion
//        ghosts, contact shock rings / debris / floor cracks, the detonation bubble. On VIOLET's pass: the invisibility
//        shimmer (heat-haze strokes over her near-invisible sprite), the force tethers from her palms. Records the
//        world → screen transform for the screen pass.
//   drawVioletCineScreen(ctx, canvas) — screen space (cineRegistry overlay slot): letterbox, FULL FORCE cut-in, vignette,
//        impact flashes, the converging speed lines before the detonation. Returns true while active (hides the HUD).
// Pure functions of the scene's script / real frames; noise = integer hash (no Math.random). Reduced flashing → no flashes;
// reduced motion → no jitter / speed lines.
import { juiceSettings } from './juiceSettings.js'
import { violetCineScene, sphereAt, sphereR, launchAt } from './violetUlt.js'
import { CINE } from './violetData.js'
import { VIOLET_SKIN_FX } from './violetSkins.js'

const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const calmMotion = () => !!juiceSettings?.reduceMotion
const calmFlash = () => !!juiceSettings?.reduceFlashing
let XF = null   // world → screen (DOMMatrix), recorded by the world pass

// skin palette: rim = the skin's ring colour; body / glow derived from it
function pal(f) {
  const rim = VIOLET_SKIN_FX[f?._recolorTag]?.ring || '#b77cff'
  const flash = VIOLET_SKIN_FX[f?._recolorTag]?.flash || '#efe2ff'
  return { rim, flash, rgb: hexRgb(rim) }
}
function hexRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0xb77cff; return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a, 0, 1).toFixed(3)})`

// ── the force-field sphere ────────────────────────────────────────────────────────────────────────────────────────
function sphere(c, x, y, r, P, t, o = {}) {
  if (r < 2) return
  const sx = o.sx || 1, sy = o.sy || 1, alpha = o.alpha ?? 1
  c.save(); c.translate(x, y); c.scale(sx, sy); c.globalAlpha *= alpha
  // body: hollow-looking translucent fill (clear centre, dense purple edge)
  const g = c.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r)
  g.addColorStop(0, rgba(P.rgb, 0.06)); g.addColorStop(0.65, rgba(P.rgb, 0.16)); g.addColorStop(0.92, rgba(P.rgb, 0.42)); g.addColorStop(1, rgba(P.rgb, 0.7))
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill()
  // hex shimmer, clipped to the sphere; cells flare in a travelling wave
  c.save(); c.beginPath(); c.arc(0, 0, r - 1, 0, Math.PI * 2); c.clip()
  const hs = Math.max(7, r / 5), hw = hs * Math.sqrt(3), wave = t * 0.22
  c.lineWidth = 1.2
  for (let row = -Math.ceil(r / (hs * 1.5)) - 1, rows = -row; row <= rows; row++) {
    for (let col = -Math.ceil(r / hw) - 1, cols = -col; col <= cols; col++) {
      const cx = col * hw + (row & 1 ? hw / 2 : 0), cy = row * hs * 1.5, dd = Math.hypot(cx, cy) / r
      if (dd > 1.05) continue
      const lit = 0.12 + 0.5 * Math.max(0, Math.sin(wave - dd * 5 + hash(row + 99, col + 7) * 2)) * (0.4 + dd * 0.6) + (o.flare || 0) * (1 - dd * 0.3)
      c.strokeStyle = rgba([235, 220, 255], lit * 0.55)
      c.beginPath()
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, px = cx + Math.cos(a) * hs * 0.92, py = cy + Math.sin(a) * hs * 0.92; i ? c.lineTo(px, py) : c.moveTo(px, py) }
      c.closePath(); c.stroke()
    }
  }
  c.restore()
  // rim: wide soft glow + a hard bright line + a specular arc
  c.strokeStyle = rgba(P.rgb, 0.35); c.lineWidth = 10; c.beginPath(); c.arc(0, 0, r + 2, 0, Math.PI * 2); c.stroke()
  c.strokeStyle = rgba([250, 240, 255], 0.9); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke()
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r * 0.78, Math.PI * 1.12, Math.PI * 1.42); c.stroke()
  c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 0.82, Math.PI * 0.15, Math.PI * 0.3); c.stroke()
  if (o.flare) { c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(P.rgb, 0.35 * o.flare); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill() }
  c.restore()
}
function ring(c, x, y, r, col, a, lw = 4, sx = 1, sy = 1) {
  if (a <= 0 || r <= 0) return
  c.save(); c.translate(x, y); c.scale(sx, sy); c.globalAlpha *= clamp(a, 0, 1); c.strokeStyle = col; c.lineWidth = lw / Math.max(sx, sy)
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.restore()
}

// contact FX: shock rings (floor = flat ellipse, wall = tall ellipse, ring = round), debris, floor cracks
function drawImpact(c, I, S, P) {
  const age = S.real - I.r, life = I.kind === 'blast' ? 60 : 30
  if (age < 0 || age > life) return
  const u = age / life, pw = I.power
  const flat = I.axis === 'floor' ? [1, 0.26] : I.axis === 'wall' ? [0.3, 1] : [1, 1]
  c.save(); c.globalCompositeOperation = 'lighter'
  for (let j = 0; j < (I.kind === 'blast' ? 3 : 2); j++) {
    const uj = clamp(u * (1.2 + j * 0.35) - j * 0.08, 0, 1)
    ring(c, I.x, I.y, 20 + uj * (110 + j * 40) * pw * (I.kind === 'blast' ? 2.6 : 1), j ? P.rim : '#ffffff', (1 - uj) * 0.95, (8 - j * 2) * pw, flat[0], flat[1])
  }
  // contact star
  if (age < 8) {
    const k = 1 - age / 8, rr = 46 * pw * (0.6 + k)
    c.fillStyle = `rgba(255,255,255,${(0.85 * k).toFixed(3)})`
    c.beginPath()
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + hash(I.r, i) * 0.2, rad = i & 1 ? rr * 0.28 : rr * (0.8 + hash(I.r + 3, i) * 0.6); c.lineTo(I.x + Math.cos(a) * rad, I.y + Math.sin(a) * rad) }
    c.closePath(); c.fill()
  }
  c.restore()
  // debris (floor / wall): chunks flung out and falling
  if (I.axis !== 'ring' && !calmMotion()) {
    c.save(); c.fillStyle = '#3b3346'
    for (let i = 0; i < 14; i++) {
      const a = (I.axis === 'wall' ? Math.PI : -Math.PI / 2) + (hash(I.r, i * 3) - 0.5) * 2.4, sp = (4 + hash(I.r, i * 5) * 9) * pw
      const px = I.x + Math.cos(a) * sp * age, py = I.y + Math.sin(a) * sp * age + 0.45 * age * age, sz = 3 + hash(I.r, i) * 6 * pw
      c.globalAlpha = clamp(1 - u, 0, 1); c.fillRect(px - sz / 2, py - sz / 2, sz, sz)
    }
    c.restore()
  }
  // floor cracks linger
  if (I.axis === 'floor') {
    c.save(); c.globalAlpha = clamp(1.4 - u * 1.4, 0, 1) * 0.9; c.strokeStyle = '#1a1022'; c.lineWidth = 2.5
    for (let i = 0; i < 7; i++) { let x = I.x, y = I.y; const dir = i < 3.5 ? -1 : 1; c.beginPath(); c.moveTo(x, y)
      for (let s = 0; s < 4; s++) { x += dir * (14 + hash(I.r + i, s) * 22) * pw; y += (hash(I.r + 9, i * 4 + s) - 0.5) * 8; c.lineTo(x, y) } c.stroke() }
    c.strokeStyle = P.rim; c.globalAlpha *= 0.6; c.lineWidth = 1; c.stroke()
    c.restore()
  }
}

// ── WORLD PASS ────────────────────────────────────────────────────────────────────────────────────────────────────
export function drawVioletCineWorld(c, fighter) {
  const S = violetCineScene(); if (!S || !c) return false
  if (fighter !== S.target && fighter !== S.caster) return false
  try { XF = c.getTransform() } catch (_) {}
  const k = S.pf ?? S.frame, P = pal(S.caster), R = CINE.R, held = S.hold > 0
  const jit = held && !calmMotion() ? ((S.real % 2) ? 2 : -2) : 0
  if (fighter === S.caster) { drawCaster(c, S, P, k); return true }
  // ── the foe's pass: everything around them ──
  // converging capture rings (before the sphere snaps shut)
  if (k < CINE.trapAt + 2) {
    const p = sphereAt(k)
    for (let j = 0; j < 3; j++) { const u = clamp((k - 4 - j * 5) / 18, 0, 1); if (u <= 0) continue
      ring(c, p.x, p.y, R * (3.4 - 2.4 * u), j ? P.rim : '#ffffff', 0.25 + 0.6 * u, 3 + j) }
  }
  // motion ghosts while the sphere is hurled
  if (k > 56 && k < CINE.reappear + 4 && !held) {
    for (let g = 4; g >= 1; g--) { const q = sphereAt(k - g * 2); sphere(c, q.x, q.y, R * 0.96, P, S.real, { alpha: 0.13 * (5 - g) / 4 }) }
  }
  if (k < CINE.blastAt) {
    const p = sphereAt(k), r = sphereR(k)
    // squash on contact (slams flatten against floor / wall), tremble when crushed
    const last = S.impacts[S.impacts.length - 1], since = last ? S.real - last.r : 99
    let sx = 1, sy = 1
    if (last && since < 10 && last.kind === 'slam') { const q = (1 - since / 10) * 0.28 * last.power; if (last.axis === 'wall') { sx = 1 - q; sy = 1 + q * 0.6 } else { sx = 1 + q * 0.6; sy = 1 - q } }
    const tremble = k >= 132 && !calmMotion() ? (hash(S.real, 1) - 0.5) * 6 : 0
    const flare = last && since < 8 ? 1 - since / 8 : (k >= CINE.suck ? 0.4 + 0.4 * ((S.real >> 1) & 1) : 0)
    const syOff = sy < 1 && last?.axis === 'floor' ? r * (1 - sy) : 0
    sphere(c, p.x + jit + tremble, p.y + syOff + tremble * 0.5, r, P, S.real, { sx, sy, flare })
    // charge: rings and sparks pulled INTO the crushed sphere
    if (k >= 134) {
      c.save(); c.globalCompositeOperation = 'lighter'
      for (let j = 0; j < 4; j++) { const u = ((S.real + j * 7) % 28) / 28; ring(c, p.x, p.y, r + (1 - u) * 190, P.rim, u * 0.7, 2 + u * 3) }
      for (let i = 0; i < 18; i++) { const a = hash(i, 5) * Math.PI * 2, u = ((S.real * 1.3 + hash(i, 9) * 30) % 30) / 30, d0 = r + 30 + (1 - u) * 220
        c.strokeStyle = rgba([240, 225, 255], u * 0.9); c.lineWidth = 2; c.beginPath(); c.moveTo(p.x + Math.cos(a) * d0, p.y + Math.sin(a) * d0); c.lineTo(p.x + Math.cos(a) * (d0 - 26), p.y + Math.sin(a) * (d0 - 26)); c.stroke() }
      c.restore()
    }
  } else {
    // DETONATION: one enormous bubble ballooning out, rim white-hot, then thinning to nothing
    const bt = S.real - (S.impacts.find(I => I.kind === 'blast')?.r ?? S.real)
    const u = clamp(bt / 34, 0, 1), rb = R * 0.7 + (CINE.blastMaxR - R * 0.7) * (1 - (1 - u) * (1 - u) * (1 - u))
    if (u < 1) {
      sphere(c, S.hov.x, S.hov.y, rb, P, S.real, { alpha: 1 - u * 0.85, flare: Math.max(0, 1 - u * 2) })
      c.save(); c.globalCompositeOperation = 'lighter'
      const g = c.createRadialGradient(S.hov.x, S.hov.y, 0, S.hov.x, S.hov.y, rb * 0.6)
      g.addColorStop(0, `rgba(255,255,255,${(0.9 * (1 - u)).toFixed(3)})`); g.addColorStop(1, rgba(P.rgb, 0))
      c.fillStyle = g; c.beginPath(); c.arc(S.hov.x, S.hov.y, rb * 0.6, 0, Math.PI * 2); c.fill(); c.restore()
    }
    // ground dust sheet from the blast
    if (bt < 50) { c.save(); c.globalAlpha = clamp(1 - bt / 50, 0, 1) * 0.55; c.fillStyle = '#d8c8ee'
      const w = 80 + bt * 22; c.beginPath(); c.ellipse(S.hov.x, S.floor - 6, w, 14 + bt * 0.5, 0, 0, Math.PI * 2); c.fill(); c.restore() }
    // the foe trails force-sparks along the launch
    if (k < CINE.landAt) { const L = launchAt(k); c.save(); c.globalCompositeOperation = 'lighter'
      for (let i = 1; i <= 6; i++) { const q = launchAt(k - i * 2); ring(c, q.x, q.y, 10 + i * 4, P.rim, 0.5 - i * 0.07, 3) }
      ring(c, L.x, L.y, 40, '#ffffff', 0.5, 3); c.restore() }
  }
  for (const I of S.impacts) drawImpact(c, I, S, P)
  return true
}
// Violet's pass: invisibility shimmer while she is unseen, palm tethers to the sphere, the release flare
function drawCaster(c, S, P, k) {
  const f = S.caster, x = (f.x || 0) + (f.w || 48) / 2, top = f.y || 0, h = f.h || 94, a = f._violet?.cineA ?? 1
  if (a < 0.95 && !calmMotion()) {             // heat-haze: wavy refraction strokes in her silhouette
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 7; i++) {
      const px = x - 22 + i * 7.5, ph = S.real * 0.35 + i
      c.strokeStyle = rgba([220, 205, 255], (0.1 + 0.1 * Math.sin(ph)) * (k < CINE.vanishEnd ? 1.6 : 1)); c.lineWidth = 1.5
      c.beginPath(); for (let y = top + 6; y <= top + h; y += 6) { const xx = px + Math.sin(y * 0.11 + ph) * 3; y === top + 6 ? c.moveTo(xx, y) : c.lineTo(xx, y) } c.stroke()
    }
    // vanish sparkle at the start, re-appear sparkle at the end
    if (k < CINE.vanishEnd + 4 || (k >= CINE.reappear && k < CINE.reappear + 16)) {
      for (let i = 0; i < 12; i++) { const yy = top + hash(i, S.real >> 2) * h, xx = x + (hash(i + 40, S.real >> 2) - 0.5) * 50
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(xx - 1.5, yy - 1.5, 3, 3) }
    }
    c.restore()
  }
  // force tethers from her palms to the sphere: faint while unseen, solid once she is back
  if (k >= CINE.trapAt && k < CINE.blastAt + 2) {
    const sp = sphereAt(k), hx = x + (f.facing || 1) * 22, hy = top + h * 0.38, strong = k >= CINE.reappear + 8
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let j = 0; j < 3; j++) {
      const wob = Math.sin(S.real * 0.6 + j * 2) * (strong ? 10 : 18)
      c.strokeStyle = rgba(P.rgb, (strong ? 0.55 : 0.12) - j * 0.1); c.lineWidth = strong ? 5 - j : 2
      c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo((hx + sp.x) / 2, (hy + sp.y) / 2 + wob - 30, sp.x, sp.y); c.stroke()
    }
    if (strong) { const g = c.createRadialGradient(hx, hy, 0, hx, hy, 30); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, rgba(P.rgb, 0)); c.fillStyle = g; c.beginPath(); c.arc(hx, hy, 30, 0, Math.PI * 2); c.fill() }
    c.restore()
  }
  if (k >= CINE.blastAt && k < CINE.blastAt + 24) {   // release flare at her palms
    const u = (k - CINE.blastAt) / 24, hx = x + (f.facing || 1) * 24, hy = top + h * 0.38
    c.save(); c.globalCompositeOperation = 'lighter'; ring(c, hx, hy, 14 + u * 60, '#ffffff', 1 - u, 4); c.restore()
  }
}

// ── SCREEN PASS ───────────────────────────────────────────────────────────────────────────────────────────────────
const toScr = (x, y) => { if (!XF) return null; return { x: XF.a * x + XF.c * y + XF.e, y: XF.b * x + XF.d * y + XF.f, s: Math.hypot(XF.a, XF.b) } }
export function drawVioletCineScreen(ctx, canvas) {
  const S = violetCineScene(); if (!S) { XF = null; return false }
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, P = pal(S.caster)
  // vignette (deepens through the charge)
  const deep = k >= CINE.reappear && k < CINE.blastAt ? 0.25 + 0.35 * (k - CINE.reappear) / (CINE.blastAt - CINE.reappear) : 0.25
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9)
  vg.addColorStop(0, 'rgba(20,4,40,0)'); vg.addColorStop(1, `rgba(20,4,40,${deep.toFixed(3)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
  // converging speed lines just before the detonation
  if (k >= CINE.suck - 4 && k < CINE.blastAt && !calmMotion()) {
    const p = toScr(S.hov.x, S.hov.y) || { x: W / 2, y: H / 2 }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 46; i++) {
      const a = hash(i, 77) * Math.PI * 2, u = ((S.real * 2 + hash(i, 3) * 20) % 20) / 20, r0 = Math.max(W, H) * (0.75 - u * 0.5), len = 60 + hash(i, 8) * 140
      ctx.strokeStyle = `rgba(240,225,255,${(0.15 + u * 0.5).toFixed(3)})`; ctx.lineWidth = 1 + hash(i, 2) * 3
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0); ctx.lineTo(p.x + Math.cos(a) * (r0 - len), p.y + Math.sin(a) * (r0 - len)); ctx.stroke()
    }
    ctx.restore()
  }
  // impact flashes (scaled to the hit), the detonation whiteout
  if (!calmFlash()) for (const I of S.impacts) {
    const age = S.real - I.r
    if (I.kind === 'blast') {
      if (age < 4) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.95; ctx.fillRect(0, 0, W, H) }
      else if (age < 30) { ctx.fillStyle = P.flash; ctx.globalAlpha = 0.7 * (1 - (age - 4) / 26); ctx.fillRect(0, 0, W, H) }
      ctx.globalAlpha = 1
    } else if (age < 5) { ctx.fillStyle = age < 2 ? '#ffffff' : P.rim; ctx.globalAlpha = (0.18 + 0.2 * I.power) * (1 - age / 5); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  }
  // letterbox
  const lbIn = clamp(S.real / 10, 0, 1), lbOut = k >= CINE.outAt ? clamp(1 - (k - CINE.outAt) / 12, 0, 1) : 1, bar = H * 0.11 * Math.min(lbIn, lbOut)
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  // FULL FORCE cut-in (k 4-45): a slanted band whips across, the title slams in, holds, slides off
  if (k >= 4 && k < 46) {
    const u = (k - 4) / 42, inU = clamp(u / 0.18, 0, 1), outU = clamp((u - 0.8) / 0.2, 0, 1)
    const ease = 1 - (1 - inU) ** 3, slideX = (1 - ease) * -W * 0.7 + outU * W * 0.8, by = H * 0.66, bh = H * 0.15
    ctx.save(); ctx.translate(slideX, 0)
    ctx.beginPath(); ctx.moveTo(0, by - bh * 0.5); ctx.lineTo(W, by - bh * 0.8); ctx.lineTo(W, by + bh * 0.25); ctx.lineTo(0, by + bh * 0.55); ctx.closePath()
    const bg = ctx.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, 'rgba(25,6,48,0.92)'); bg.addColorStop(0.5, rgba(P.rgb, 0.85)); bg.addColorStop(1, 'rgba(25,6,48,0.92)')
    ctx.fillStyle = bg; ctx.fill()
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, H * 0.004); ctx.stroke()
    const punch = 1 + Math.max(0, 1 - (k - 4) / 8) * 0.5, fs = Math.round(H * 0.105 * punch)
    ctx.translate(W * 0.5, by - bh * 0.1); ctx.transform(1, 0, -0.18, 1, 0, 0)
    ctx.font = `900 ${fs}px Impact, "Arial Black", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.12; ctx.strokeStyle = '#14041f'; ctx.strokeText('FULL FORCE', 0, 0)
    ctx.shadowColor = P.rim; ctx.shadowBlur = fs * 0.4; ctx.fillStyle = '#ffffff'; ctx.fillText('FULL FORCE', 0, 0); ctx.shadowBlur = 0
    ctx.font = `700 ${Math.round(H * 0.03)}px system-ui, sans-serif`; ctx.fillStyle = '#e9dcff'; ctx.fillText('VIOLET PARR  ·  FORCE FIELD', 0, fs * 0.72)
    ctx.restore()
  }
  return true
}
