// rickPrimeUltFx.js — Rick Prime "TEMPORAL REWIND" cinematic, RENDER ONLY. Reads rickPrimeRewindScene() + the rewind's own
// timer (game.js rewindState via the getter handed to startRickPrimeRewindCine); never writes the sim. One screen pass
// (registerCineScreen, after the world, before the HUD): the time-stop impact frame, the world drained to grey (re-blit
// through a grayscale filter) with Rick Prime redrawn in colour, the giant clock (seizes → spins backwards → shatters),
// real-sprite afterimages of the foe streaming back along the path they're being rewound over, VHS ◀◀ timecode + tracking
// glitches, suspended motes, letterbox, title cut-in, subtitles, the TIME RESTORED snap. Sounds are presentation cues fired
// once per rewind frame (keyed by frame, so a paused / re-rendered frame never repeats them). No Math.random.
import { registerCineScreen } from './cineRegistry.js'
import { camera } from './camera.js'
import { sound } from './sound.js'
import { cachedSpriteSheet } from './sprite.js'
import { juiceSettings } from './juiceSettings.js'
import { rickPrimeRewindScene, rickPrimeRewindTimer, endRickPrimeRewindCine, PRIME_REWIND as R } from './rickPrimeUlt.js'

const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const calm = () => !!(juiceSettings?.reduceMotion || juiceSettings?.reduceFlashing)
const cl = (v, a, b) => v < a ? a : v > b ? b : v
const seg = (k, a, b) => cl((k - a) / (b - a), 0, 1)
const easeO = u => 1 - (1 - u) * (1 - u)
const sm = u => { u = cl(u, 0, 1); return u * u * (3 - 2 * u) }
const ready = img => !!(img && img.complete && img.naturalWidth > 0)
const CYAN = '#5fe6ff', ICE = '#c9f6ff', RED = '#ff3b4e'

let W = 1280, H = 720, S = 1
const toScreen = (wx, wy) => ({ x: (wx - camera.x - (camera.leadX || 0) + (camera.shakeX || 0)) * camera.zoom + W / 2, y: (wy - camera.y + (camera.shakeY || 0)) * camera.zoom + H / 2 })
let BUF = null
const buf = () => { if (!BUF) BUF = document.createElement('canvas'); if (BUF.width !== W || BUF.height !== H) { BUF.width = W; BUF.height = H } return BUF }

// a fighter's recorded frame (sprite.js _fxRecord → _lastFrameDraw) redrawn at a WORLD position (its own scale)
function drawRecorded(c, L, wx, wyFeet, o = {}) {
  if (!L || !ready(L.img)) return
  const z = camera.zoom, p = toScreen(L.x + (wx - L.cx), L.y + (wyFeet - L.feet)), w = L.w * z, h = L.h * z
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= o.alpha == null ? 1 : o.alpha; if (o.filter) c.filter = o.filter
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = o.glowR || 18 }
  if (L.flip) { c.translate(p.x + w, p.y); c.scale(-1, 1); c.drawImage(L.img, L.sx, L.sy, L.sw, L.sh, 0, 0, w, h) }
  else c.drawImage(L.img, L.sx, L.sy, L.sw, L.sh, p.x, p.y, w, h)
  c.restore()
}
const snapOf = f => { const L = f && f._lastFrameDraw; if (!L) return null; return { ...L, cx: (f.x || 0) + (f.w || 60) / 2, feet: (f.y || 0) + (f.h || 100) } }

function card(c, txt, x, y, size, fill, a = 1, rot = 0, stroke = '#03121c', font = 'Impact, "Arial Black", sans-serif') {
  if (!(a > 0.01)) return
  c.save(); c.globalAlpha = cl(a, 0, 1); c.translate(x, y); if (rot) c.rotate(rot)
  c.font = `900 italic ${Math.round(size)}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineJoin = 'round'; c.lineWidth = Math.max(4, size / 6); c.strokeStyle = stroke; c.strokeText(txt, 0, 0); c.fillStyle = fill; c.fillText(txt, 0, 0); c.restore()
}
function subtitle(c, txt, a, bar) {
  if (!(a > 0.01)) return
  c.save(); c.globalAlpha = a; c.font = `italic 700 ${Math.round(25 * S)}px Georgia, "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  const y = H - bar - 30 * S, w = c.measureText(txt).width + 190 * S
  c.fillStyle = 'rgba(0,6,12,0.6)'; c.fillRect(W / 2 - w / 2, y - 20 * S, w, 40 * S)
  c.textAlign = 'left'; c.font = `800 ${Math.round(18 * S)}px Arial, sans-serif`; c.fillStyle = RED; c.fillText('RICK PRIME', W / 2 - w / 2 + 16 * S, y)
  c.font = `italic 700 ${Math.round(25 * S)}px Georgia, "Times New Roman", serif`; c.fillStyle = '#eaf9ff'; c.fillText(txt, W / 2 - w / 2 + 170 * S, y); c.restore()
}

// ── the CLOCK: roman face, ticks, two hands; angles in turns ────────────────────────────────────────────────────────────
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
function clockFace(c, x, y, r, a, minuteT, hourT, glitch) {
  if (a <= 0.01) return
  c.save(); c.globalAlpha = a; c.translate(x, y)
  c.strokeStyle = ICE; c.lineWidth = 3 * S; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke()
  c.lineWidth = 1.5 * S; c.beginPath(); c.arc(0, 0, r * 0.93, 0, Math.PI * 2); c.stroke()
  c.globalAlpha = a * 0.5; c.beginPath(); c.arc(0, 0, r * 1.08, 0, Math.PI * 2); c.stroke(); c.globalAlpha = a
  for (let i = 0; i < 60; i++) { const an = i / 60 * Math.PI * 2, r0 = i % 5 ? r * 0.88 : r * 0.82; c.lineWidth = (i % 5 ? 1.5 : 4) * S
    c.beginPath(); c.moveTo(Math.sin(an) * r0, -Math.cos(an) * r0); c.lineTo(Math.sin(an) * r * 0.93, -Math.cos(an) * r * 0.93); c.stroke() }
  c.fillStyle = ICE; c.font = `700 ${Math.round(r * 0.1)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; c.fillText(ROMAN[i], Math.sin(an) * r * 0.7 + (glitch ? (hash(i, glitch) - 0.5) * 10 * S : 0), -Math.cos(an) * r * 0.7) }
  const hand = (t, len, w, col) => { const an = t * Math.PI * 2; c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(-Math.sin(an) * len * 0.12, Math.cos(an) * len * 0.12); c.lineTo(Math.sin(an) * len, -Math.cos(an) * len); c.stroke() }
  c.shadowColor = CYAN; c.shadowBlur = 14 * S
  hand(hourT, r * 0.5, 9 * S, ICE); hand(minuteT, r * 0.8, 5 * S, ICE)
  hand(minuteT * 12, r * 0.86, 2 * S, RED)
  c.fillStyle = RED; c.beginPath(); c.arc(0, 0, 8 * S, 0, Math.PI * 2); c.fill()
  c.restore()
}
// clock hand position at rewind frame t (turns): ticks forward, SEIZES, then accelerates backwards, snaps forward at the restore
function handAt(t) {
  const P = R.playEnd, w0 = R.zoomEnd, p0 = R.watchEnd
  if (t < w0) return Math.floor(t / 15) * (1 / 60)                                 // tick … tick … (seconds)
  const base = Math.floor(w0 / 15) / 60
  if (t < p0) return base - (t > p0 - 10 ? (t - (p0 - 10)) * 0.002 * Math.sin(t) : 0)   // seized, a shudder before it gives
  const u = t - p0, ramp = Math.min(u, 60)
  const back = (ramp * ramp) / 120 * 0.02 + Math.max(0, u - 60) * 0.02 + Math.max(0, t - (P - 40)) ** 2 * 0.0025   // turns backwards
  return t < P ? base - back : base
}

// ── SCREEN PASS ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const once = (sc, key, fn) => { if (sc.fired.has(key)) return; sc.fired.add(key); try { fn() } catch (_) {} }
const sfx = (id, gain = 0.8) => { try { sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
function cues(sc, t) {
  if (t >= 0 && t < 4) once(sc, 'stop', () => { sfx('impact_frame_boom_long', 0.95); sfx('pitch_drop_slowmo', 0.9); sfx('impact_crack_01', 0.8) })
  for (let i = 15; i < R.zoomEnd; i += 15) if (t >= i && t < i + 3) once(sc, 'tick' + i, () => sfx('impact_hit_01', 0.25))
  if (t >= R.zoomEnd && t < R.zoomEnd + 4) once(sc, 'seize', () => { sfx('energy_tone_hold', 0.6); sfx('sting_pitch_rise_hold', 0.5) })
  if (t >= R.watchEnd && t < R.watchEnd + 4) once(sc, 'rew', () => { sfx('warp_wobble_01', 0.9); sfx('charge_hum_rise', 0.7); sfx('boom_medium_02', 0.6) })
  for (let i = R.watchEnd + 90; i < R.playEnd - 60; i += 120) if (t >= i && t < i + 3) once(sc, 'wob' + i, () => sfx(i % 240 ? 'warp_wobble_02' : 'warp_wobble_01', 0.45))
  if (t >= R.playEnd - 40 && t < R.playEnd - 36) once(sc, 'rise', () => sfx('charge_swell_riser', 0.95))
  if (t >= R.playEnd - 8 && t < R.playEnd - 4) once(sc, 'suck', () => sfx('boom_anticipation_suck', 1))
  if (t >= R.playEnd && t < R.playEnd + 4) once(sc, 'snap', () => { sfx('boom_huge_01', 0.95); sfx('impact_frame_boom_long', 0.9); sfx('crack_sizzle_bright', 0.8) })
  if (t >= R.playEnd + 14 && t < R.playEnd + 18) once(sc, 'tail', () => sfx('rumble_tail_01', 0.8))
}
const SUBS = () => [[8, R.zoomEnd + 20, 'Hold still. This won\'t take any time at all.'], [R.watchEnd + 40, R.watchEnd + 200, 'Time is just another dimension — and I own all of them.'],
  [R.watchEnd + 260, R.playEnd - 60, 'Everything you just did? I\'m taking it back.'], [R.playEnd + 18, R.panEnd + 10, 'Again.']]

function drawScreen(ctx, canvas) {
  const sc = rickPrimeRewindScene(); if (!sc) return false
  const t = rickPrimeRewindTimer()
  if (t < 0 || t >= R.total) { endRickPrimeRewindCine(); return false }
  W = canvas.width; H = canvas.height; S = H / 720
  const c = ctx, quiet = calm(), f = sc.caster, o = sc.opp, P = R.playEnd, snap = t - P
  cues(sc, t)
  // record the foe's recent drawn frames → afterimages (one sample per NEW rewind frame)
  if (t !== sc.lastT) { sc.lastT = t; const s = snapOf(o); if (s && t >= R.watchEnd && t < P) { sc.ghosts.push(s); if (sc.ghosts.length > 48) sc.ghosts.shift() } }
  // 1. GREY: drain the world (re-blit through grayscale); colour floods back at the snap
  const grey = snap >= 0 ? 1 - seg(snap, 0, 10) : sm(seg(t, 0, 36))
  if (grey > 0.01) {
    const B = buf(), b = B.getContext('2d')
    b.globalCompositeOperation = 'copy'; b.filter = `grayscale(${grey}) contrast(${1 + 0.15 * grey}) brightness(${1 - 0.18 * grey})`; b.drawImage(canvas, 0, 0); b.filter = 'none'; b.globalCompositeOperation = 'source-over'
    c.drawImage(B, 0, 0)
    c.fillStyle = `rgba(20,70,110,${0.22 * grey})`; c.fillRect(0, 0, W, H)
  }
  const play = t >= R.watchEnd && t < P
  // 2. the CLOCK (huge, behind the actors)
  const cx = W * 0.5, cy = H * 0.47, cr = H * 0.42 * (snap >= 0 ? 1 + 0.4 * easeO(seg(snap, 0, 14)) : 0.9 + 0.1 * easeO(seg(t, 0, 30)))
  const clockA = (snap >= 0 ? 0 : 0.55 * easeO(seg(t, 4, 30))) * (quiet ? 0.6 : 1)
  const hm = handAt(t), glitchSeed = play && ((t >> 2) % 23 === 0) ? t : 0
  clockFace(c, cx, cy, cr, clockA, hm, hm / 12, glitchSeed)
  // the shattered clock: shards flying out from the face
  if (snap >= 0 && snap < 40) {
    c.save(); c.globalAlpha = 1 - snap / 40
    for (let i = 0; i < 46; i++) {
      const an = hash(i, 7) * Math.PI * 2, r0 = cr * (0.3 + 0.7 * hash(i, 8)), v = (10 + 26 * hash(i, 9)) * S * snap, x = cx + Math.cos(an) * (r0 + v), y = cy + Math.sin(an) * (r0 + v) + 0.25 * snap * snap * S
      const sz = (10 + 26 * hash(i, 10)) * S, rot = snap * (hash(i, 11) - 0.5) * 0.4
      c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = 'rgba(200,245,255,0.35)'; c.strokeStyle = ICE; c.lineWidth = 1.5 * S
      c.beginPath(); c.moveTo(0, -sz); c.lineTo(sz * 0.6, sz * 0.4); c.lineTo(-sz * 0.5, sz * 0.7); c.closePath(); c.fill(); c.stroke(); c.restore()
    }
    c.restore()
  }
  // 3. AFTERIMAGES: the foe's real frames streaming back along the path (cyan, oldest faintest)
  if (play && !quiet) {
    const G = sc.ghosts
    for (let i = 0; i < G.length - 1; i += 6) { const g = G[i], a = 0.42 * (i + 1) / G.length; drawRecorded(c, g, g.cx, g.feet, { alpha: a, filter: 'grayscale(1) sepia(1) hue-rotate(150deg) saturate(4) brightness(1.2)' }) }
  }
  // the foe itself, cold and frozen in a cyan cast (still visible against the grey)
  const os = snapOf(o)
  if (os && snap < 0 && t >= 6) drawRecorded(c, os, os.cx, os.feet, { alpha: 0.55 * seg(t, 6, 20), filter: 'grayscale(1) sepia(1) hue-rotate(150deg) saturate(3)' })
  // 4. RICK PRIME in full colour, a cold rim-light: the only thing time doesn't touch
  const fs = snapOf(f)
  if (fs && grey > 0.05) { drawRecorded(c, fs, fs.cx, fs.feet, { glow: CYAN, glowR: 22 * S * grey }); drawRecorded(c, fs, fs.cx, fs.feet, { alpha: 0.35 * grey, glow: RED, glowR: 8 * S }) }
  // a reverse-spinning ring of time around him
  if (fs && grey > 0.05) {
    const p = toScreen(fs.cx, fs.feet - 52), rr = 70 * camera.zoom * S
    c.save(); c.globalAlpha = 0.8 * grey; c.translate(p.x, p.y); c.strokeStyle = CYAN; c.lineWidth = 3 * S; c.shadowColor = CYAN; c.shadowBlur = 12
    for (let i = 0; i < 3; i++) { const a0 = -t * (0.05 + i * 0.03) + i * 2; c.beginPath(); c.ellipse(0, 0, rr * (1 + i * 0.22), rr * (0.35 + i * 0.08), 0, a0, a0 + 2.4); c.stroke() }
    c.restore()
  }
  // 5. suspended motes (dust frozen in the air; they drift BACKWARDS during the rewind)
  if (grey > 0.05) {
    c.save(); c.fillStyle = ICE
    for (let i = 0; i < 70; i++) { const drift = play ? -(t - R.watchEnd) * (0.3 + hash(i, 21)) * S : 0, x = ((hash(i, 22) * W + drift) % W + W) % W, y = hash(i, 23) * H
      c.globalAlpha = grey * (0.25 + 0.5 * hash(i, 24)); c.fillRect(x, y, (1 + 2 * hash(i, 25)) * S, (1 + 2 * hash(i, 25)) * S) }
    c.restore()
  }
  // 6. VHS: tracking bands, chroma split, slice glitches
  if (play && !quiet) {
    const B = buf(), b = B.getContext('2d'); b.globalCompositeOperation = 'copy'; b.drawImage(canvas, 0, 0); b.globalCompositeOperation = 'source-over'
    c.save(); c.globalAlpha = 0.18; c.globalCompositeOperation = 'lighter'; c.drawImage(B, 4 * S, 0); c.restore()
    for (let i = 0; i < 3; i++) { const y = ((t * (2.2 + i) * S + i * H * 0.37) % (H + 60 * S)) - 30 * S, h = (6 + 10 * hash(i, t >> 3)) * S
      c.fillStyle = 'rgba(220,245,255,0.10)'; c.fillRect(0, y, W, h); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, y + h, W, 2 * S) }
    if ((t >> 2) % 17 === 0) for (let i = 0; i < 5; i++) { const y = hash(i, t) * H, h = (8 + 30 * hash(i, t + 1)) * S, dx = (hash(i, t + 2) - 0.5) * 60 * S
      try { c.drawImage(B, 0, y, W, h, dx, y, W, h) } catch (_) {} }
    for (let y = 0; y < H; y += 4 * S) { c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(0, y, W, 1 * S) }
  }
  // 7. impact frames: TIME STOP (t 0..) and the SNAP (t 624..)
  if (t < 3) { c.fillStyle = quiet ? 'rgba(255,255,255,0.3)' : '#ffffff'; c.fillRect(0, 0, W, H) }
  else if (t < 7 && !quiet) { c.save(); c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.restore() }
  if (t < 30 && fs) { const p = toScreen(fs.cx, fs.feet - 50), u = easeO(t / 30); c.save(); c.globalAlpha = 1 - t / 30; c.strokeStyle = ICE; c.lineWidth = 12 * S * (1 - u); c.beginPath(); c.arc(p.x, p.y, Math.hypot(W, H) * u, 0, Math.PI * 2); c.stroke(); c.restore() }
  if (snap >= 0 && snap < 3) { c.fillStyle = quiet ? 'rgba(255,255,255,0.3)' : '#ffffff'; c.fillRect(0, 0, W, H) }
  else if (snap >= 3 && snap < 6 && !quiet) { c.save(); c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.restore() }
  if (snap >= 0 && snap < 36) for (let i = 0; i < 3; i++) { const a = snap - i * 5; if (a < 0) continue; const u = easeO(a / 30); c.save(); c.globalAlpha = Math.max(0, 1 - a / 30); c.strokeStyle = i & 1 ? RED : CYAN; c.lineWidth = (14 - i * 3) * S
    c.beginPath(); c.arc(cx, cy, Math.hypot(W, H) * 0.7 * u, 0, Math.PI * 2); c.stroke(); c.restore() }
  // 8. letterbox
  const inU = easeO(seg(t, 0, 12)), outU = 1 - seg(t, R.panEnd - 6, R.total - 4), bar = H * 0.11 * Math.min(inU, outU)
  c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar)
  c.globalAlpha = Math.min(inU, outU); c.fillStyle = CYAN; c.fillRect(0, bar - 2 * S, W, 2 * S); c.fillStyle = RED; c.fillRect(0, H - bar, W, 2 * S); c.globalAlpha = 1
  // 9. title cut-in
  if (t < 64) {
    const a = t < 6 ? t / 6 : t > 56 ? (64 - t) / 8 : 1, slide = easeO(cl((t - 4) / 8, 0, 1)), y0 = H * 0.14, bh = 150 * S
    c.save(); c.globalAlpha = a; c.translate((1 - slide) * -W, 0)
    c.beginPath(); c.moveTo(0, y0 - 26 * S); c.lineTo(W, y0 + 26 * S); c.lineTo(W, y0 + 26 * S + bh); c.lineTo(0, y0 - 26 * S + bh); c.closePath()
    const g = c.createLinearGradient(0, y0, 0, y0 + bh); g.addColorStop(0, 'rgba(4,16,28,0.95)'); g.addColorStop(1, 'rgba(0,4,10,0.95)'); c.fillStyle = g; c.fill()
    c.fillStyle = CYAN; c.fillRect(0, y0 + 2 * S, W, 3 * S); c.fillStyle = RED; c.fillRect(0, y0 + bh - 6 * S, W, 3 * S)
    const px = W * 0.84, py = y0 + bh * 0.5 + 14 * S, pr = 60 * S
    clockFace(c, px, py, pr * 1.15, 0.9, -t * 0.02, -t * 0.002, 0)
    const por = cachedSpriteSheet('./rick_portrait__rickprime.png')
    if (ready(por)) { const ph = pr * 2.1, pw = ph * por.naturalWidth / por.naturalHeight; c.save(); c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.clip(); c.imageSmoothingEnabled = false; c.drawImage(por, px - pw / 2, py - ph * 0.42, pw, ph); c.restore() }
    const sl = t < 8 ? 0 : t < 14 ? 1.9 - 0.9 * easeO((t - 8) / 6) : 1
    if (sl > 0) card(c, 'TEMPORAL REWIND', W * 0.42, y0 + bh * 0.42, 78 * S * sl, '#ffffff', 1, 0.04, '#062033')
    if (t >= 14) card(c, 'RICK PRIME  ·  ULTIMATE', W * 0.42, y0 + bh * 0.8, 22 * S, CYAN, cl((t - 14) / 6, 0, 1), 0.04)
    c.restore()
  }
  // 10. call-outs: STOP, the ◀◀ stamp + timecode, TIME RESTORED
  if (t >= 2 && t < 40) card(c, 'TIME STOP', W * 0.5, H * 0.62, 64 * S * (t < 6 ? 1.6 - 0.15 * (t - 2) : 1), ICE, 1 - seg(t, 30, 40), -0.04)
  if (play) {
    const u = (t - R.watchEnd) / (P - R.watchEnd), secs = (u * 10).toFixed(2).padStart(5, '0'), blink = (t >> 4) & 1
    c.save(); c.translate(40 * S, bar + 46 * S); c.textAlign = 'left'; c.textBaseline = 'middle'
    c.font = `900 ${Math.round(40 * S)}px "Courier New", monospace`; c.lineWidth = 6 * S; c.strokeStyle = '#000'
    const tag = '◀◀ REW'; c.strokeText(tag, 0, 0); c.fillStyle = blink ? '#ffffff' : ICE; c.fillText(tag, 0, 0)
    c.font = `700 ${Math.round(26 * S)}px "Courier New", monospace`; const tc = `-00:${secs}`; c.strokeText(tc, 0, 40 * S); c.fillStyle = RED; c.fillText(tc, 0, 40 * S)
    c.restore()
    const st = t - R.watchEnd; if (st < 22) card(c, '◀◀  REWIND', W * 0.5, H * 0.5, 96 * S * (st < 5 ? 1.8 - 0.16 * st : 1), '#ffffff', 1 - seg(st, 14, 22), 0, '#062033')
  }
  if (snap >= 4 && snap < 70) { const pop = snap < 10 ? 1.8 - 0.8 * easeO((snap - 4) / 6) : 1, a = 1 - seg(snap, 56, 70)
    card(c, 'TIME RESTORED', W * 0.5, H * 0.4, 84 * S * pop, '#ffffff', a, -0.03, '#062033'); card(c, `+${R.bonusSec} SECONDS`, W * 0.5, H * 0.4 + 70 * S, 36 * S, CYAN, a * seg(snap, 10, 16), -0.03)
    // owner 2026-11-24: only Rick Prime rolls back — the foe is CUT 25 % (health + energy), and under 1 % time just runs out on them
    const cut = o._primeRewindCut
    if (cut) { const fp = toScreen((o.x || 0) + (o.w || 60) / 2, (o.y || 0) - 20), cpop = snap < 14 ? 1.9 - 0.9 * easeO(cl((snap - 6) / 8, 0, 1)) : 1, ca = a * seg(snap, 6, 10)
      card(c, cut.killed ? 'TIME\'S UP' : '−25%', cl(fp.x, 160 * S, W - 160 * S), cl(fp.y, H * 0.22, H * 0.7), (cut.killed ? 76 : 64) * S * cpop, RED, ca, 0.05, '#2a0006')
      if (!cut.killed) card(c, 'HEALTH + ENERGY', cl(fp.x, 160 * S, W - 160 * S), cl(fp.y, H * 0.22, H * 0.7) + 50 * S, 22 * S, '#ffd0d0', ca, 0.05, '#2a0006') } }
  // 11. subtitles
  for (const [a0, a1, txt] of SUBS()) if (t >= a0 && t < a1) subtitle(c, txt, seg(t, a0, a0 + 6) * (1 - seg(t, a1 - 6, a1)), bar)
  return t < R.panEnd + 10
}
registerCineScreen('rickprime_rewind', drawScreen)
