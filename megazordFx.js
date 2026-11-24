// megazordFx.js — MSV1-MEGAZORD render + sound (render-only: reads f._squad.mz, never writes sim state except draining the
// sound-cue queue). World pass: drawMegazordWorld(c, f) from spdSquadFx.js (call / power-up bubbles, the Ranger's streak,
// lightning, landing dust, Saber Charge aura, THUNDER FIREBALLs, shocks, the finisher's flame arc, separation bolt).
// Screen pass (cineRegistry): letterbox + the five Thunderzord captions + flashes + the R14 portrait cut-in during the
// cinematic; the Megazord HUD (portrait, timer bar, ARMOR bar) during the mode.
import { sound } from './sound.js'
import { registerCineScreen } from './cineRegistry.js'
import { MZ_SHEETS } from './megazordSprites.js'
import { SPRITE_MANIFEST } from './spritesheets.js'
import { MZ, MZ_FORM, CINE, CAPTIONS, MZ_LIVE, mzState } from './megazord.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => !!(im && im.complete && im.naturalWidth > 0)
SPRITE_MANIFEST[MZ_FORM] ||= { actions: { idle: MZ_SHEETS.idle.sheet } }   // the draw gate (spritesReady) — the strips themselves come from f._skinAnim
if (typeof Image !== 'undefined') for (const m of Object.values(MZ_SHEETS)) image(m.sheet || m.src)   // warm the cache before the first drop-in
const hash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 2654435761) ^ Math.imul(b + 0x7f4a7c15, 2246822519); h ^= h >>> 15; return (h >>> 0) / 4294967296 }

function playCues(mz) {
  if (!mz?.cues?.length) return
  for (const c of mz.cues.splice(0)) { try { sound.play?.('mz_' + c) } catch (_) {} }
}

function bubble(c, x, y, text, col = '#e0201c') {
  c.save()
  c.font = 'bold 18px Impact, "Arial Black", sans-serif'
  const w = c.measureText(text).width + 28, h = 34
  c.fillStyle = '#fffef4'; c.strokeStyle = '#141418'; c.lineWidth = 3
  c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - h, w, h, 10) : c.rect(x - w / 2, y - h, w, h); c.fill(); c.stroke()
  c.beginPath(); c.moveTo(x - 8, y - 1); c.lineTo(x, y + 12); c.lineTo(x + 8, y - 1); c.closePath(); c.fill()
  c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x, y + 12); c.lineTo(x + 8, y); c.stroke()
  c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y - h / 2 + 1)
  c.restore()
}
function bolt(c, x, y0, y1, seed, width = 5, col = '#cfe8ff') {   // a deterministic jagged lightning bolt (seeded, not random)
  c.save(); c.strokeStyle = col; c.lineWidth = width; c.shadowColor = '#7fb8ff'; c.shadowBlur = 18; c.lineJoin = 'bevel'
  c.beginPath(); c.moveTo(x, y0)
  const n = 9
  for (let i = 1; i <= n; i++) c.lineTo(x + (hash(seed, i) - 0.5) * 70 * (i < n ? 1 : 0.2), y0 + (y1 - y0) * i / n)
  c.stroke(); c.lineWidth = width * 0.4; c.strokeStyle = '#ffffff'; c.stroke(); c.restore()
}

export function drawMegazordWorld(c, f) {
  const mz = mzState(f); if (!mz) return
  playCues(mz)
  const cx = f.x + (f.w || 48) / 2, top = f.y, feet = f.y + (f.h || 94), dir = f.facing || 1
  c.save()
  if (mz.phase === 'cine') {
    const t = mz.t
    if (t < CINE.flash) bubble(c, cx, top - 34, 'We need Thunder Megazord power, now!')
    if (t >= CINE.flash && t < CINE.drop) {   // the Ranger streaks upward in a column of light
      const k = (t - CINE.flash) / (CINE.drop - CINE.flash)
      c.globalAlpha = 1 - k * 0.6; c.fillStyle = '#e0201c'; c.fillRect(cx - 10, top - 900 * k - 60, 20, feet - top + 60)
      c.fillStyle = '#ffffff'; c.fillRect(cx - 4, top - 900 * k - 60, 8, feet - top + 60); c.globalAlpha = 1
    }
    if (t >= CINE.flash && t < CINE.flash + 14) for (let i = 0; i < 3; i++) bolt(c, cx + (i - 1) * 140, top - 700, feet, t * 7 + i, 6)
    if (t >= CINE.drop && t < CINE.land) {   // falling speed lines
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3
      for (let i = 0; i < 6; i++) { const x = cx + (hash(i, 3) - 0.5) * 160; c.beginPath(); c.moveTo(x, top - 60 - hash(i, 9) * 120); c.lineTo(x, top - 260 - hash(i, 9) * 200); c.stroke() }
    }
    if (t >= CINE.land && t < CINE.land + 24) {   // landing dust + shock ring
      const k = (t - CINE.land) / 24
      c.globalAlpha = 1 - k; c.strokeStyle = '#ffe08a'; c.lineWidth = 6; c.beginPath(); c.ellipse(cx, feet, 60 + 220 * k, 12 + 26 * k, 0, 0, Math.PI * 2); c.stroke()
      c.fillStyle = 'rgba(180,160,120,0.6)'; for (let i = 0; i < 10; i++) { const a = hash(i, 5) * Math.PI; c.beginPath(); c.arc(cx + Math.cos(a) * (40 + 180 * k) * (i % 2 ? 1 : -1), feet - Math.sin(a) * 40 * k, 10 + 14 * k, 0, Math.PI * 2); c.fill() }
      c.globalAlpha = 1
    }
    if (t >= CINE.rise) bubble(c, cx, top - 30, 'Thunder Megazord, power up!')
  }
  if (mz.phase === 'mode' || mz.phase === 'break') {
    // SABER CHARGE: blue electric aura while charging, a steady glow on the saber once charged
    if (mz.chargeT > 0 || mz.charged) {
      const k = mz.chargeT > 0 ? 1 - mz.chargeT / MZ.charge : 1
      c.globalAlpha = 0.25 + 0.25 * k; c.fillStyle = '#5ab4ff'; c.beginPath(); c.ellipse(cx, (top + feet) / 2, (f.w || 84) * (0.8 + 0.3 * k), (feet - top) * 0.62, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1
      if (mz.chargeT > 0) for (let i = 0; i < 3; i++) { const s = (mz.t >> 1) * 3 + i; const x = cx + (hash(s, 1) - 0.5) * 120; bolt(c, x, top - 40 + hash(s, 2) * 40, top + 40 + hash(s, 4) * 80, s, 2) }
    }
    // THUNDER FIREBALL shots (R11 frames, big → small as they fly)
    const fb = image(MZ_SHEETS.fireball.sheet), m = MZ_SHEETS.fireball
    for (const s of mz.shots) {
      const i = Math.min(3, Math.floor(s.t / (MZ.fire.life / 4))), sc = MZ.scale * 1.1
      if (ready(fb)) { c.save(); c.translate(s.x, s.y); if (s.vx < 0) c.scale(-1, 1); c.imageSmoothingEnabled = false; c.drawImage(fb, i * m.width, 0, m.width, m.height, -m.width * sc / 2, -m.height * sc / 2, m.width * sc, m.height * sc); c.restore() }
      else { c.fillStyle = '#ffb030'; c.beginPath(); c.arc(s.x, s.y, 24 - i * 4, 0, Math.PI * 2); c.fill() }
    }
    if (mz.boom) { const k = 1 - mz.boom.t / 16; c.globalAlpha = 1 - k; c.fillStyle = '#ffd060'; c.beginPath(); c.arc(mz.boom.x, mz.boom.y, 20 + 70 * k, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1 }
    if (mz.shockFx) { const s = mz.shockFx; for (let i = 0; i < 4; i++) bolt(c, s.x + (i - 1.5) * 18, s.y - 60, s.y + 60, s.t * 5 + i, 3, '#9fd4ff') }
    // the finisher: a towering flame arc sweeping in front
    const a = f.attacking ? f.currentAttack : null
    if (mz.finisher && a?.name === 'mzFinal') {
      const e = (a.total ?? 0) - (a.timer ?? 0)
      if (e < MZ.final.charge) { c.globalAlpha = 0.5; c.strokeStyle = '#ffcf40'; c.lineWidth = 8; c.beginPath(); c.arc(cx, top + 20, 40 + e * 3, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1 }
      else if (e < MZ.final.hit + 14) {
        const k = Math.min(1, (e - MZ.final.charge) / (MZ.final.hit - MZ.final.charge))
        const g = c.createLinearGradient(cx, top - 200, cx + dir * MZ.final.reach, feet)
        g.addColorStop(0, 'rgba(255,255,220,0.95)'); g.addColorStop(0.4, 'rgba(255,170,40,0.85)'); g.addColorStop(1, 'rgba(255,60,20,0)')
        const r = MZ.final.reach * k, ry = (feet - top) + 120
        c.fillStyle = g; c.beginPath(); c.moveTo(cx, feet)
        for (let i = 0; i <= 20; i++) { const ang = -Math.PI / 2 + (Math.PI / 2 + 0.15) * i / 20; c.lineTo(cx + dir * Math.cos(ang) * r, feet - 40 + Math.sin(ang) * ry) }
        c.closePath(); c.fill()
      }
    }
    if (mz.phase === 'break') for (let i = 0; i < 5; i++) { const s = mz.t * 3 + i; c.fillStyle = hash(s, 2) > 0.5 ? '#ffe070' : '#ff8030'; c.fillRect(cx + (hash(s, 1) - 0.5) * 120, top + hash(s, 3) * (feet - top), 4, 4) }
  }
  if (mz.sepT > 0) { const k = mz.sepT / MZ.sepFlash; c.globalAlpha = k; bolt(c, cx, top - 800, feet, mz.sepT * 13, 7); c.globalAlpha = 1 }
  c.restore()
}

// ── screen pass ──
registerCineScreen('thunder_megazord', (c, canvas) => {
  let hide = false
  const W = canvas.width, H = canvas.height, u = W / 1280
  for (const f of MZ_LIVE) {
    const mz = mzState(f); if (!mz) continue
    if (mz.phase === 'cine') {
      hide = true
      const t = mz.t, bar = Math.round(H * 0.11 * Math.min(1, t / 10))
      c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar)
      const ci = Math.floor((t - CINE.capStart) / CINE.capEach)
      if (ci >= 0 && ci < CAPTIONS.length) {
        const [text, col] = CAPTIONS[ci], k = ((t - CINE.capStart) % CINE.capEach) / CINE.capEach
        c.save(); c.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1
        c.font = `bold ${Math.round(40 * u)}px Impact, "Arial Black", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
        const x = W / 2 + (1 - Math.min(1, k * 4)) * 120 * u * (ci % 2 ? -1 : 1), y = H - bar / 2 - H * 0.08
        c.lineWidth = 8 * u; c.strokeStyle = col === '#2a2a36' ? '#d8d8e4' : '#101014'; c.strokeText(text, x, y)
        c.fillStyle = col; c.fillText(text, x, y); c.restore()
      }
      if (t >= CINE.flash && t < CINE.flash + 8) { c.fillStyle = `rgba(255,255,255,${1 - (t - CINE.flash) / 8})`; c.fillRect(0, 0, W, H) }
      if (t >= CINE.rise) {   // R14 portrait cut-in
        const im = image(MZ_SHEETS.portrait.src), k = Math.min(1, (t - CINE.rise) / 8), ph = H * 0.34, pw = ph * (MZ_SHEETS.portrait.w / MZ_SHEETS.portrait.h)
        const right = (f.playerNumber || 1) === 2, x = right ? W - pw - 40 * u + (1 - k) * pw : 40 * u - (1 - k) * pw, y = H * 0.3
        c.save(); c.fillStyle = 'rgba(224,32,28,0.85)'; c.beginPath(); c.moveTo(right ? W : 0, y - 10 * u); c.lineTo(x + (right ? -30 * u : pw + 30 * u), y - 10 * u); c.lineTo(x + (right ? -60 * u : pw + 60 * u), y + ph + 10 * u); c.lineTo(right ? W : 0, y + ph + 10 * u); c.closePath(); c.fill()
        if (ready(im)) { c.imageSmoothingEnabled = false; c.drawImage(im, x, y, pw, ph) }
        c.font = `bold ${Math.round(30 * u)}px Impact, "Arial Black", sans-serif`; c.fillStyle = '#ffe14a'; c.textAlign = right ? 'right' : 'left'; c.textBaseline = 'top'
        c.fillText('THUNDER MEGAZORD', right ? x - 70 * u : x + pw + 70 * u, y + ph * 0.4); c.restore()
      }
    }
    if (mz.phase === 'mode' || mz.phase === 'break') {
      const right = (f.playerNumber || 1) === 2, pw = 54 * u, bw = 230 * u, x0 = right ? W - 24 * u - pw - bw - 10 * u : 24 * u, y0 = 70 * u
      c.save(); c.fillStyle = 'rgba(10,10,16,0.72)'; c.fillRect(x0 - 6 * u, y0 - 6 * u, pw + bw + 22 * u, pw + 12 * u)
      const im = image(MZ_SHEETS.portrait.src)
      const px = right ? x0 + bw + 10 * u : x0
      if (ready(im)) { c.imageSmoothingEnabled = false; c.drawImage(im, px, y0, pw, pw) }
      const bx = right ? x0 : x0 + pw + 10 * u
      c.font = `bold ${Math.round(13 * u)}px Impact, sans-serif`; c.textBaseline = 'top'; c.textAlign = right ? 'right' : 'left'; c.fillStyle = '#ffe14a'
      c.fillText('THUNDER MEGAZORD', right ? bx + bw : bx, y0)
      const bar = (y, k, col, label) => {
        c.fillStyle = '#26262e'; c.fillRect(bx, y, bw, 12 * u); c.fillStyle = col
        const w = bw * Math.max(0, Math.min(1, k)); c.fillRect(right ? bx + bw - w : bx, y, w, 12 * u)
        c.strokeStyle = '#000'; c.lineWidth = 2; c.strokeRect(bx, y, bw, 12 * u)
        c.fillStyle = '#fff'; c.font = `bold ${Math.round(10 * u)}px sans-serif`; c.fillText(label, right ? bx + bw - 4 * u : bx + 4 * u, y + 1 * u)
      }
      bar(y0 + 18 * u, mz.timer / MZ.timer, mz.timer < 150 ? ((mz.timer >> 3) % 2 ? '#ff5040' : '#ffd040') : '#ffd040', `TIME ${Math.ceil(Math.max(0, mz.timer) / 60)}`)
      bar(y0 + 36 * u, mz.armor / MZ.armor, mz.armor < 150 ? '#ff5040' : '#5ab4ff', `ARMOR ${Math.max(0, Math.round(mz.armor))}`)
      if (mz.charged) { c.fillStyle = '#9fd4ff'; c.fillText('SABER CHARGED', right ? bx : bx + bw, y0) }
      c.restore()
    }
    if (mz.flash > 0) { c.fillStyle = `rgba(255,250,230,${0.6 * mz.flash / 10})`; c.fillRect(0, 0, W, H) }
    if (mz.sepT > 0 && mz.sepT > MZ.sepFlash - 6) { c.fillStyle = `rgba(220,235,255,${(mz.sepT - (MZ.sepFlash - 6)) / 6 * 0.35})`; c.fillRect(0, 0, W, H) }
  }
  return hide
})
