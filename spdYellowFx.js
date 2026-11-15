// S.P.D. Yellow (spd_yellow) — RENDER-ONLY FX + audio cues. Reads sim state (f._spdYellow, f._falcon, f._ranger, the
// ultimate scene), never writes it. Supplied art only: Z's own strips (the duplicate, the ultimate duplicates), the two
// supplied phase streaks (blink / swap / clone in-out), the supplied muzzle star, the MMPR-source coin frames, the
// Ninja Megazord cells through the SHARED Zord cell drawer (mmprBlackFx.drawZordCell). Markers / panel are small
// code-drawn geometry + text in the owner's skin colours. Decorative skin materials: a few discrete pixel marks on
// precomputed suit-masked anchors (spdYellowMaterials.js) — no getImageData, no pixel scans, no canvases, no RNG.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { inputSettings, padGlyphs } from './input.js'
import { NINJA_CELLS, NINJA_SEQ } from './ninjaMegazordSprites.js'
import { FALCON_SORTIES, falconPos, falconHud } from './falconzord.js'
import { drawZordCell, preloadZordCells } from './mmprBlackFx.js'
import { spd_yellow, CLONE, COINS, ORDERS, ZORD_RESOURCE, BREACH } from './spdYellowData.js'
import { spdYellowUltScene } from './spdYellowState.js'
import { SPD_YELLOW_FX } from './spdYellowSkins.js'
import { SPD_YELLOW_MATERIAL_POINTS as MAT } from './spdYellowMaterials.js'

export const NINJA_SCALE = 1.9, NINJA_ALPHA = 0.82
const FW = 160, FH = 96, OX = 80, OY = 84
const CLONE_ALPHA = 0.72                 // the duplicate's readability tell: translucent body + dashed foot ring + diamond tag
const cache = new Map()
const coinFx = new WeakMap()             // render-only coin-spin bookkeeping (never on the snapshotted sim state)
const coinSeen = new WeakMap()           // render-only: last drawn coin count -> spend animation when it drops
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const spdYellowFxCacheSize = () => cache.size
const fxOf = f => SPD_YELLOW_FX[f._recolorTag] || SPD_YELLOW_FX.default
const strip = (f, n) => image(f._recolorTag ? `./assets/spd_yellow/skins/${f._recolorTag}/${n}.png` : `./assets/spd_yellow/${n}.png`)
const fxArt = n => image(`./assets/spd_yellow/${n}.png`)
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const S = f => f.spriteScale || spd_yellow.spriteScale
const frameAt = (key, elapsed) => {
  const tl = spd_yellow.animationData[key]?.frameTimeline
  return tl ? tl.reduce((i, [at, fr]) => elapsed >= at ? fr : i, 0) : 0
}

// ── Decorative skin MATERIAL (cosmetic; deterministic from the sim clock; static under Reduce Motion / Flashing) ──
// mapPt(px, py) converts a cell pixel to world space for the rect being drawn.
function drawMaterial(c, f, key, frame, mapPt, scale, alpha = 1) {
  const mat = fxOf(f).material; if (!mat) return
  const P = MAT[key]?.[frame]; if (!P) return
  const t = f._spdYellow?.clock || 0, still = calm(), px = Math.max(1, Math.round(scale))
  const pts = mat === 'stars' || mat === 'glitter' ? P.p : P.e.length ? P.e : P.p
  const n = pts.length / 2; if (!n) return
  c.save(); c.imageSmoothingEnabled = false
  const dot = (i, col, a, big = false) => {
    const [x, y] = mapPt(pts[i * 2], pts[i * 2 + 1])
    c.globalAlpha = a * alpha; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), px, px)
    if (big) { c.fillRect(Math.round(x) - px, Math.round(y), px, px); c.fillRect(Math.round(x) + px, Math.round(y), px, px); c.fillRect(Math.round(x), Math.round(y) - px, px, px); c.fillRect(Math.round(x), Math.round(y) + px, px, px) }
  }
  if (mat === 'stars') {            // Alien X: sparse SLOW stars (every 3rd anchor), gentle twinkle
    for (let i = 0; i < n; i += 3) dot(i, i % 2 ? '#ffffff' : '#9cf5b8', still ? 0.7 : 0.45 + 0.4 * Math.sin(t * 0.03 + i * 1.7), i % 6 === 0)
  } else if (mat === 'facet') {     // Diamondhead: ONE sharp highlight runs along existing shading edges, every 90 f for 10 f
    const ph = t % 90
    if (still) dot(0, '#ffffff', 0.55)
    else if (ph < 10) { const i = Math.floor(t / 90) % n; dot(i, '#ffffff', 1 - ph / 10); if (i + 1 < n) dot(i + 1, '#dffcff', 0.6 * (1 - ph / 10)) }
  } else if (mat === 'crystal') {   // Chromastone: subtle crystalline accent — two slow alternating glints
    for (let k = 0; k < 2; k++) { const i = (k * 5 + Math.floor(t / 120)) % n; dot(i, k ? '#ffe6ff' : '#f2a8ff', still ? 0.5 : 0.35 + 0.35 * Math.sin(t * 0.05 + k * Math.PI), true) }
  } else if (mat === 'glitter') {   // Starlight: restrained glitter pulses — at most 3 anchors lit, staggered 16 f pulses
    for (let k = 0; k < 3; k++) { const ph = (t + k * 21) % 64, i = (Math.floor((t + k * 21) / 64) * 7 + k * 4) % n
      if (still) { dot(i, '#e6dcff', 0.5); continue }
      if (ph < 16) dot(i, k === 1 ? '#ffffff' : '#d6c8ff', Math.sin(ph / 16 * Math.PI), ph > 5 && ph < 11) }
  } else if (mat === 'opal') {      // Opal: slowly changing mint / lilac / gold accents on shading edges (240 f cycle)
    const cols = ['#b8f5dc', '#d8c4ff', '#ffe6a0'], u = (t % 240) / 240, j = Math.floor(u * 3)
    for (let i = 0; i < n; i += 2) dot(i, cols[(j + i) % 3], still ? 0.45 : 0.3 + 0.25 * Math.sin(u * Math.PI * 2 + i))
  }
  c.restore()
}
function drawBodyMaterial(c, f) {
  if (!fxOf(f).material || f._lastDrawX == null || !f._lastDrawW) return
  if ((f._ranger?.blink?.phase === 'travel')) return
  const key = f._lastSpriteAction, fr = f._lastSpriteFrame ?? 0
  const X = f._lastDrawX, Y = f._lastDrawY, sx = f._lastDrawW / FW, sy = f._lastDrawH / FH, flip = (f.facing ?? 1) === -1
  drawMaterial(c, f, key, fr, (px, py) => [flip ? X + f._lastDrawW - (px + 1) * sx : X + px * sx, Y + py * sy], sx)
}

// Draw one of Z's strips (owner skin) with its origin at world (x, feet).
function drawStrip(c, f, key, frame, x, feet, dir, alpha) {
  const im = strip(f, key); if (!ready(im)) return
  const s = S(f), n = Math.max(1, Math.round(im.naturalWidth / FW)), fr = Math.min(n - 1, frame)
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(feet)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, fr * FW, 0, FW, FH, -OX * s, -OY * s, FW * s, FH * s); c.restore()
  drawMaterial(c, f, key, fr, (px, py) => [dir < 0 ? x + (OX - px - 1) * s : x + (px - OX) * s, feet + (py - OY) * s], s, alpha)
}
function drawStreak(c, f, which, x, feet, dir, alpha) {
  const im = fxArt('fx_' + which); if (!ready(im)) return
  const s = S(f)
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(feet)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s, im.naturalWidth * s, im.naturalHeight * s); c.restore()
}

// ── The DUPLICATE ──
function cloneView(c0) {
  const A = c0.act
  if (!A) return { key: 'idle', frame: Math.floor(c0.age / 16) % 2, warn: 0 }
  if (A.kind === 'echo') {
    const el = A.t - CLONE.echoLead
    return el < 0 ? { key: 'idle', frame: 0, warn: 1 - A.t / CLONE.echoLead } : { key: A.key, frame: frameAt(A.key, el), warn: 0 }
  }
  if (A.kind === 'cover') return A.t < CLONE.coverAt ? { key: 'yPistol', frame: frameAt('yPistol', A.t), warn: 0.6 } : { key: 'yPistolShot', frame: frameAt('yPistolShot', A.t - CLONE.coverAt), warn: 0 }
  return { key: 'idle', frame: 0, warn: 0 }
}
function drawClone(c, f) {
  const s = f._spdYellow, k = s?.clone
  const [lite, deep] = fxOf(f).cols
  if (s?.lastClone) { const L = s.lastClone; drawStreak(c, f, 'streak0', L.x, L.feet, L.dir, L.t / 12 * 0.9) }
  if (!k) return
  const v = cloneView(k), inA = Math.min(1, k.age / 8)
  if (k.age < 10) drawStreak(c, f, 'streak1', k.x, k.feet, k.dir, (1 - k.age / 10) * 0.9)   // arrival streak (supplied)
  // readability tell: dashed foot ring + small diamond tag, both in the owner's marker colours
  c.save(); c.strokeStyle = lite; c.globalAlpha = 0.6 * inA; c.lineWidth = 2; c.setLineDash([5, 4])
  c.beginPath(); c.ellipse(k.x, k.feet - 2, 26, 6, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([])
  const ty = k.feet - (f.h || 94) - 20
  c.fillStyle = deep; c.globalAlpha = 0.9 * inA; c.beginPath(); c.moveTo(k.x, ty - 6); c.lineTo(k.x + 6, ty); c.lineTo(k.x, ty + 6); c.lineTo(k.x - 6, ty); c.closePath(); c.fill()
  c.strokeStyle = lite; c.lineWidth = 1.5; c.stroke()
  if (k.life < 60) { c.globalAlpha = 0.8; c.strokeStyle = lite; c.beginPath(); c.arc(k.x, ty, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (k.life / 60)); c.stroke() }   // expiring
  c.restore()
  // visible ECHO / COVER startup: a ring that closes onto the duplicate before it moves
  if (v.warn > 0) { c.save(); c.strokeStyle = lite; c.globalAlpha = 0.85; c.lineWidth = 2; c.beginPath(); c.arc(k.x, k.feet - (f.h || 94) / 2, 20 + 30 * v.warn, 0, Math.PI * 2); c.stroke(); c.restore() }
  drawStrip(c, f, v.key, v.frame, k.x, k.feet, k.dir, CLONE_ALPHA * inA)
}

// ── Blink (shared rangers.js contract): first streak = vanish / launch, second streak = travel / arrival ──
function drawBlink(c, f) {
  const b = f._ranger?.blink; if (!b) return
  const w = f.w || 48, feet = (b.y0 ?? f.y) + (f.h || 94), dir = b.dir || f.facing || 1
  if (b.phase === 'start') drawStreak(c, f, 'streak0', b.x0 + w / 2, feet, dir, 0.55 + 0.35 * ((b.t + 1) / 3))
  else if (b.phase === 'travel' && b.x1 != null) {
    drawStreak(c, f, 'streak0', b.x0 + w / 2, feet, dir, 0.35)
    const x = f.x + w / 2; drawStreak(c, f, 'streak1', x, (f.y || 0) + (f.h || 94), dir, 0.95)
    drawStreak(c, f, 'streak1', x - dir * 40, (f.y || 0) + (f.h || 94), dir, 0.4)
  } else if (b.phase === 'recover' && b.x1 != null) drawStreak(c, f, 'streak1', b.x1 + w / 2, (b.y1 ?? f.y) + (f.h || 94), dir, 0.5)
}
function drawSwap(c, f) {
  const L = f._spdYellow?.lastSwap; if (!L) return
  const a = L.t / 10
  drawStreak(c, f, 'streak0', L.from, L.feet, f.facing || 1, a)       // where Z vanished
  drawStreak(c, f, 'streak1', L.to, L.feet, f.facing || 1, a * 0.9)   // where Z arrived
  drawStreak(c, f, 'streak1', L.clone, L.feet, -(f.facing || 1), a * 0.6)
}
function drawMuzzle(c, f) {
  const m = f._spdYellow?.lastMuzzle; if (!m) return
  const im = fxArt('fx_beam0'); if (!ready(im)) return
  const k = m.kind === 'long' ? 2.4 : 1.6, a = m.t / 6
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = a; c.translate(Math.round(m.x), Math.round(m.y)); if (m.dir < 0) c.scale(-1, 1)
  c.drawImage(im, -2 * k, -im.naturalHeight * k / 2, im.naturalWidth * k, im.naturalHeight * k); c.restore()
}

// ── Ninja Megazord (shared assist engine) ──
const frameOf = (pose, age, speed = 5) => { const seq = NINJA_SEQ[pose] || [pose]; return seq[Math.floor(age / speed) % seq.length] }
const ZPOSE = { punch2: 'punch2', guard: 'guard', step: 'step', jab: 'jab', ready: 'ready', rear: 'rear', knee: 'knee', crane: 'crane', recover: 'recover', draw: 'draw', wind: 'wind', cut: 'cut', finish: 'finish' }
function drawZord(c, pose, x, y, dir, age, alpha = NINJA_ALPHA) { drawZordCell(c, NINJA_CELLS, frameOf(ZPOSE[pose] || pose, age), x, y, dir, alpha, NINJA_SCALE) }
function drawArc(c, x, y, dir, u) { drawZordCell(c, NINJA_CELLS, 'arc0', x + dir * 40, y - 110, dir, Math.max(0, 1 - u) * 0.95, NINJA_SCALE) }
function drawSortie(c, f) {
  const so = f._falcon?.sortie; if (!so) return
  const P = FALCON_SORTIES[so.kind]; if (!P || !['yIntercept', 'yRising', 'ySword'].includes(so.kind)) return
  const p = falconPos(so), [lite, deep] = fxOf(f).cols
  if (so.age < P.warn + 4) {   // WARNING: the committed strike zone, before any contact can land
    const c0 = P.contacts[0], b = c0.box, zx = so.ox + so.dir * (P.keys.find(k => k[0] >= c0.from)?.[1] ?? 0) + so.dir * (b.dx || 0)
    const a = 0.75 * (1 - Math.max(0, so.age - P.warn) / 4)
    c.save(); c.globalAlpha = a; c.strokeStyle = lite; c.lineWidth = 2; c.setLineDash([8, 6])
    c.strokeRect(zx - b.w / 2, so.oy + (b.dy || 0) - b.h / 2, b.w, b.h); c.setLineDash([])
    if (so.kind === 'yRising') { c.beginPath(); c.moveTo(zx, so.oy - 20); c.lineTo(zx, so.oy - b.h); c.lineTo(zx - 8, so.oy - b.h + 10); c.moveTo(zx, so.oy - b.h); c.lineTo(zx + 8, so.oy - b.h + 10); c.stroke() }   // upward arrow
    c.fillStyle = deep; c.globalAlpha = a * 0.25; c.fillRect(zx - b.w / 2, so.oy - 4, b.w, 4); c.restore()
  }
  drawZord(c, p.pose, p.x, p.y, so.dir, so.age)
  if (so.kind === 'ySword') { const cA = P.contacts[0]; if (so.age >= cA.from && so.age <= cA.to + 8) drawArc(c, p.x, p.y, so.dir, (so.age - cA.from) / 12) }
}

// ── Compact HUD above Z: coin slots + category marks, Megazord pips, Breach / Relay / Break cues ──
function coinFrame(c, frame, x, y, k = 1, a = 1) {
  const im = image('./assets/spd_yellow/coins/spin.png'); if (!ready(im)) return
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = a; c.drawImage(im, frame * 24, 0, 24, 22, Math.round(x - 12 * k), Math.round(y - 11 * k), 24 * k, 22 * k); c.restore()
}
function drawHud(c, f) {
  const s = f._spdYellow; if (!s) return
  const [lite, deep] = fxOf(f).cols, cx = f.x + f.w / 2, y = f.y - 26
  // three coin slots: filled = the supplied face frame; a fresh earn plays the supplied 10-frame spin once
  // render bookkeeping is keyed to the sim clock; a reset restarts that clock -> drop anything stamped in the future
  if ((coinFx.get(f)?.at ?? -1) > s.clock) coinFx.delete(f)
  if ((coinSeen.get(f)?.at ?? -1) > s.clock) coinSeen.delete(f)
  const fx = coinFx.get(f)
  const seen = coinSeen.get(f)
  if (!seen || s.coins < seen.n) coinSeen.set(f, { n: s.coins, from: seen ? seen.n : s.coins, at: s.clock })
  else if (s.coins !== seen.n) seen.n = s.coins
  const sp = coinSeen.get(f)
  for (let i = 0; i < COINS.max; i++) {
    const x = cx - 20 + i * 20
    if (i >= s.coins) { c.save(); c.globalAlpha = 0.55; c.strokeStyle = '#8a919c'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.stroke(); c.restore() }   // empty slot: a light ring, never a disc over the art
    if (i < s.coins) {
      const spinT = fx && fx.slot === i ? s.clock - fx.at : 99
      coinFrame(c, spinT < 20 ? Math.floor(spinT / 2) % 10 : 0, x, y, 0.7)   // EARNED: one pass of the supplied spin
    } else if (sp && i < sp.from && s.clock - sp.at < 20) {
      const u = (s.clock - sp.at) / 20                                       // SPENT: the supplied spin, rising + fading
      coinFrame(c, Math.floor((s.clock - sp.at) / 2) % 10, x, y - 14 * u, 0.7, 1 - u)
    }
  }
  // category marks (melee / gun / clone): lit once awarded this cycle; a draining line while the reset is pending
  ;['melee', 'gun', 'clone'].forEach((k, i) => {
    const x = cx - 20 + i * 20, on = !!s.cycle?.[k]
    c.save(); c.fillStyle = on ? lite : '#3a404c'; c.globalAlpha = on ? 1 : 0.85
    if (k === 'melee') c.fillRect(x - 3, y + 14, 6, 3)
    else if (k === 'gun') { c.beginPath(); c.arc(x, y + 15.5, 2.5, 0, Math.PI * 2); c.fill() }
    else { c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x + 3, y + 15.5); c.lineTo(x, y + 19); c.lineTo(x - 3, y + 15.5); c.closePath(); c.fill() }
    c.restore()
  })
  if (s.cycleReset > 0) { c.save(); c.strokeStyle = deep; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 30, y + 22); c.lineTo(cx - 30 + 60 * (s.cycleReset / COINS.resetAfter), y + 22); c.stroke(); c.restore() }
  // Megazord pips (diamonds)
  const h = falconHud(f, ZORD_RESOURCE)
  if (h) for (let i = 0; i < h.max; i++) {
    const x = cx + 44 + i * 13, fill = i < h.pips ? 1 : i === h.pips ? h.refill : 0, locked = h.lockout > 0 || h.postUlt > 0 || !!h.active
    c.save(); c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.closePath()
    c.fillStyle = '#14171c'; c.globalAlpha = 0.85; c.fill()
    if (fill > 0) { c.save(); c.clip(); c.fillStyle = i < h.pips ? (locked ? deep : lite) : deep; c.globalAlpha = 1; c.fillRect(x - 5, y + 5 - 10 * fill, 10, 10 * fill); c.restore() }
    c.globalAlpha = 1; c.strokeStyle = lite; c.lineWidth = 1; c.stroke(); c.restore()
  }
  // BREACH armed: a small reticle with its 120 f ring; confirm window: the reticle pulses + an up-arrow
  if (s.breach || s.breachConfirm) {
    const x = cx - 46, k = s.breach ? s.breach.t / BREACH.life : 1
    c.save(); c.strokeStyle = lite; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.moveTo(x, y - 9); c.lineTo(x, y + 9); c.stroke()
    c.strokeStyle = deep; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke()
    if (s.breachConfirm) { c.fillStyle = lite; c.globalAlpha = 0.5 + 0.5 * (s.clock % 4 < 2); c.beginPath(); c.moveTo(x, y - 20); c.lineTo(x + 6, y - 12); c.lineTo(x - 6, y - 12); c.closePath(); c.fill() }
    c.restore()
  }
  // RELAY / PARTNER BREAK windows: chevrons under the feet
  if (s.relay || s.brk) { c.save(); c.strokeStyle = lite; c.lineWidth = 2; c.globalAlpha = 0.9; const fy = f.y + f.h + 8
    if (s.relay) { c.beginPath(); c.moveTo(cx + 14, fy); c.lineTo(cx + 22, fy + 5); c.lineTo(cx + 14, fy + 10); c.stroke() }
    if (s.brk) { c.beginPath(); c.moveTo(cx - 22, fy); c.lineTo(cx - 14, fy + 5); c.lineTo(cx - 22, fy + 10); c.stroke() }
    c.restore() }
  if (s.showcase) { c.save(); c.fillStyle = lite; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('SHOWCASE', cx, y - 16); c.restore() }
  if (s.reject > 0) { c.save(); c.strokeStyle = '#ff5050'; c.globalAlpha = s.reject / 24; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 6, y - 22); c.lineTo(cx + 6, y - 10); c.moveTo(cx + 6, y - 22); c.lineTo(cx - 6, y - 10); c.stroke(); c.restore() }
}

// ── Command stance panel: five orders, controller-correct glyphs ──
const keyName = k => !k ? '?' : k === ' ' ? 'SPACE' : k.replace(/^Arrow/, '').replace(/^Key/, '').toUpperCase()
export function stanceGlyphs(f) {
  const pad = inputSettings[`p${f.playerNumber || 1}Type`] === 'controller'
  if (pad) { const g = padGlyphs(); return { pad: true, select: '◀ ▶', confirm: g.r1, cancel: g.right.split(' ')[0], open: `${g.l2}+${g.r1}` } }
  const k = f.controls || {}
  return { pad: false, select: `${keyName(k.left)} / ${keyName(k.right)}`, confirm: keyName(k.special), cancel: keyName(k.block), open: `${keyName(k.charge)}+${keyName(k.special)}` }
}
function drawPanel(c, f) {
  const s = f._spdYellow, st = s?.stance; if (!st) return
  const [lite, deep] = fxOf(f).cols, cx = f.x + f.w / 2, top = f.y - 118, w = 76, gap = 4, total = ORDERS.length * (w + gap) - gap
  const x0 = Math.round(cx - total / 2)
  c.save(); c.globalAlpha = 0.92; c.fillStyle = '#0e1116'; c.fillRect(x0 - 6, top - 6, total + 12, 66); c.strokeStyle = deep; c.lineWidth = 1; c.strokeRect(x0 - 6, top - 6, total + 12, 66)
  c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'top'
  ORDERS.forEach((o, i) => {
    const x = x0 + i * (w + gap), sel = i === st.sel
    const ok = s.coins >= o.coins && (f.energy || 0) >= o.energy && (o.id !== 'showcase' || s.showcase || s.coins >= COINS.max)
    c.globalAlpha = 1; c.fillStyle = sel ? deep : '#1b2028'; c.fillRect(x, top, w, 34)
    if (sel) { c.strokeStyle = lite; c.lineWidth = 2; c.strokeRect(x, top, w, 34) }
    c.fillStyle = ok ? '#f3f5f8' : '#6b7280'; c.fillText(o.id === 'showcase' ? (s.showcase ? 'SHOWCASE ✓' : 'SHOWCASE') : o.name, x + w / 2, top + 4)
    const cost = o.id === 'rising' ? '18E +1 pip' : o.toggle ? '3 coins @ult' : `${o.coins}c +${o.energy}E`
    c.fillStyle = ok ? lite : '#555b66'; c.fillText(cost, x + w / 2, top + 18)
  })
  const g = stanceGlyphs(f), k = st.t / 120
  c.fillStyle = '#c8ccd4'; c.fillText(`${g.select} select   ${g.confirm} confirm   ${g.cancel} cancel`, cx, top + 40)
  c.strokeStyle = lite; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, top + 54); c.lineTo(x0 + total * k, top + 54); c.stroke()
  c.restore()
}

// ── Ultimate scene (pure read of spdYellowUltScene) ──
function drawUlt(c, f) {
  const u = spdYellowUltScene(f); if (!u) return
  for (const d of u.dups) drawStrip(c, f, d.strip, frameAt(d.strip, d.at), d.x, d.feet, d.dir, CLONE_ALPHA * Math.max(0, d.alpha))
  if (u.zord) { drawZord(c, u.zord.pose, u.zord.x, u.zord.y, u.zord.dir, u.zord.age, 0.9); if (u.zord.arc != null) drawArc(c, u.zord.x, u.zord.y, u.zord.dir, u.zord.arc) }
  if (u.beam) {   // the supplied long beam, stretched from Z's long-gun muzzle to the target
    const im = fxArt('fx_beam2'), s = S(f), d = f.facing || 1
    const mx = f.x + f.w / 2 + d * 50 * s, my = f.y + f.h - 39 * s, len = Math.max(20, Math.abs(u.tx - mx))
    if (ready(im)) { c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 1 - u.beam.u * 0.7; c.translate(mx, my); if (d < 0) c.scale(-1, 1); c.drawImage(im, 0, -3 * s, len, 6 * s); c.restore() }
    const st = fxArt('fx_beam0'); if (ready(st)) { c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 1 - u.beam.u; c.drawImage(st, mx - 16, my - 20, 32, 40); c.restore() }
  }
  if (u.showcase) {   // cosmetic: three supplied coins spin on an orbit framing the raid (no gameplay effect)
    const cx = (f.x + f.w / 2 + u.tx) / 2, cy = u.feet - 150
    for (let i = 0; i < 3; i++) { const a = u.frame * 0.04 + i * Math.PI * 2 / 3; coinFrame(c, Math.floor(u.frame / 3 + i * 3) % 10, cx + Math.cos(a) * 120, cy + Math.sin(a) * 30, 1.4, calm() ? 0.8 : 0.95) }
  }
}

let preloaded = false
export function drawSpdYellowFx(c, f) {
  if (f?.rosterKey !== 'spd_yellow') return
  if (!preloaded) { preloaded = true; preloadSpdYellowFx() }   // every Megazord cell / FX / coin image requested once, before first need
  if (f.health > 0) drawBodyMaterial(c, f)
  drawClone(c, f)
  drawSortie(c, f)      // a committed Megazord action finishes even if Z is KO'd this frame (sim-owned)
  drawUlt(c, f)
  if (f.health > 0) { drawBlink(c, f); drawSwap(c, f); drawMuzzle(c, f); drawHud(c, f); drawPanel(c, f) }
}
// Cue playback (presentation only). No order / reward sound after defeat.
const AFTER_DEFEAT_MUTE = /^(call|order_|ready|commit_|coin|cycle|stance|select|echo|clone|swap|breach|relay|break|ult)/
export function playSpdYellowCues(f) {
  const s = f?._spdYellow, q = s?.cues; if (!q?.length) return
  for (const v of q) {
    if (v === 'coinEarn') coinFx.set(f, { slot: s.coins - 1, at: s.clock })   // render-only spin bookkeeping
    if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue
    try { sound.play('spdyellow_' + v) } catch (_) {}
  }
  q.length = 0
}
export function preloadSpdYellowFx() { preloadZordCells(NINJA_CELLS); for (const n of ['fx_beam0', 'fx_beam1', 'fx_beam2', 'fx_streak0', 'fx_streak1']) fxArt(n); image('./assets/spd_yellow/coins/spin.png') }
