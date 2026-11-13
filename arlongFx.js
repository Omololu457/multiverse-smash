// arlongFx.js — Arlong RENDER-ONLY presentation (HUD Tide badge + teeth counter + Kiribachi icon, water zones,
// shimmer / spray, the thrown blade, torpedo, shockwaves, splash bursts). Reads simulation state (fighter._arlong)
// and never writes it. Image objects are presentation caches. Any jitter is a pure hash of (frame, slot).
import { ARLONG_FX } from './arlongSprites.js'
import { ARLONG_WIN2_ANIM } from './arlongData.js'
import { arlongWinVariant } from './arlongState.js'

const _img = {}
function img(src) {
  if (typeof Image === 'undefined' || !src) return null
  let i = _img[src]; if (!i) { i = _img[src] = new Image(); i.src = src }
  return i.complete && i.naturalWidth ? i : null
}
export const hash = (a, b = 0) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

// HUD state (tests read it): teeth 0-3 and whether the Kiribachi is in hand.
export function arlongHudState(f) {
  const s = f?._arlong
  return { teeth: s?.teeth ?? 3, blade: !s?.blade || s.blade.st === 'hand' }
}

// HUD: a round badge with the Kiribachi blade icon on the Tide bar, a TEETH counter (three teeth pips) and a small
// Kiribachi icon that greys out while the blade is thrown / planted.
export function drawArlongHud(ctx, fighter, { x, enY, pbw, flip }) {
  if (fighter?.rosterKey !== 'arlong') return
  const st = arlongHudState(fighter)
  const blade = img(ARLONG_FX.bladeV.sheet)
  const s = 24, bx = flip ? x + pbw - 54 : x + 50, by = enY - 27
  ctx.save()
  ctx.beginPath(); ctx.arc(bx + s / 2, by + s / 2, s / 2 + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#10213f'; ctx.fill(); ctx.strokeStyle = '#4f7fd6'; ctx.lineWidth = 1.5; ctx.stroke()
  if (blade) {   // the badge: Kiribachi laid diagonally across the Tide disc
    ctx.imageSmoothingEnabled = false
    ctx.translate(bx + s / 2, by + s / 2); ctx.rotate(Math.PI / 4)
    const k = (s + 2) / blade.height
    ctx.drawImage(blade, -blade.width * k / 2, -blade.height * k / 2, blade.width * k, blade.height * k)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  ctx.restore()
  // TEETH counter: three white saw-teeth pips (dark when spent) + the Kiribachi-in-hand icon.
  const tx0 = flip ? bx - 8 : bx + s + 6, step = flip ? -12 : 12
  ctx.save()
  for (let i = 0; i < 3; i++) {
    const px = tx0 + i * step, py = by + 6, on = i < st.teeth
    ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 11); ctx.closePath()
    ctx.fillStyle = on ? '#f4f4f8' : '#2b3446'; ctx.fill()
    ctx.strokeStyle = on ? '#0d1424' : '#556'; ctx.lineWidth = 1; ctx.stroke()
  }
  ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#cfe0ff'
  ctx.fillText('TEETH', tx0 + step, by + 25)
  const ix = tx0 + 3 * step + (flip ? -10 : 2), iy = by + 1
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ix, iy, 12, 20)
  ctx.strokeStyle = st.blade ? '#ffcf6a' : '#555'; ctx.strokeRect(ix + 0.5, iy + 0.5, 11, 19)
  if (blade) {
    ctx.imageSmoothingEnabled = false
    if (!st.blade) { ctx.globalAlpha = 0.35; ctx.filter = 'grayscale(1)' }
    const k = 18 / blade.height
    ctx.drawImage(blade, ix + 6 - blade.width * k / 2, iy + 1, blade.width * k, 18)
    ctx.filter = 'none'; ctx.globalAlpha = 1
  }
  ctx.restore()
}

// One shallow pool: the purple jet sprites (R16) tiled along the surface, flattened + tinted, a translucent water
// body, and ripple rings. `x0..x1` world px, `y` = floor line. Pure function of (zone, frame).
function drawPool(c, x0, x1, y, frame, seed, alpha = 1) {
  const jets = img(ARLONG_FX.jets.sheet), J = ARLONG_FX.jets, w = x1 - x0, depth = 22
  c.save(); c.globalAlpha = alpha
  const g = c.createLinearGradient(0, y - depth, 0, y + 10)
  g.addColorStop(0, 'rgba(130,160,255,0.75)'); g.addColorStop(1, 'rgba(40,60,190,0.55)')
  c.fillStyle = g
  c.beginPath(); c.ellipse((x0 + x1) / 2, y, w / 2, depth, 0, 0, Math.PI * 2); c.fill()
  if (jets) {   // the R16 jets flattened (×0.45 tall) and tiled along the surface, cycling frames
    c.imageSmoothingEnabled = false
    const tile = J.w * 0.9, n = Math.max(1, Math.round(w / tile))
    for (let i = 0; i < n; i++) {
      const fr = Math.floor(hash(seed, i) * 5 + frame / 9 + i) % 5
      const tx = x0 + (i + 0.5) * (w / n), sx = fr * J.w, flip = (i + seed) & 1
      const edge = Math.min(1, Math.min(tx - x0, x1 - tx) / 30)   // taper toward the zone edges
      c.save(); c.globalAlpha = alpha * (0.6 + 0.4 * edge); c.translate(tx, y - 2); c.scale(flip ? -1 : 1, 0.45 * (0.6 + 0.4 * edge))
      c.drawImage(jets, sx, 0, J.w, J.h, -J.w / 2, -J.h, J.w, J.h)
      c.restore()
    }
  }
  c.strokeStyle = 'rgba(210,225,255,0.55)'; c.lineWidth = 1.5   // ripple rings (render-only particles)
  for (let k = 0; k < 3; k++) {
    const ph = ((frame + k * 23 + seed * 7) % 69) / 69, rx = x0 + w * (0.2 + 0.6 * hash(seed + k, Math.floor((frame + k * 23 + seed * 7) / 69)))
    c.globalAlpha = alpha * (1 - ph) * 0.8
    c.beginPath(); c.ellipse(rx, y - 2, 6 + ph * 34, 2 + ph * 6, 0, 0, Math.PI * 2); c.stroke()
  }
  c.restore()
}

// World-space FX drawn UNDER the fighters (water zones / flood). Pure functions of sim state + frame counter.
export function drawArlongUnder(c, f, frame = 0) {
  if (!c || f?.rosterKey !== 'arlong' || !f._arlong) return
  const s = f._arlong, y = s.groundY ?? ((f.y || 0) + (f.h || 94))
  if (s.flood > 0) {   // ARLONG PARK: the whole lower stage floods (tiled jets + a deep tinted band)
    const span = 4000, cx = (f.x || 0) + 24
    c.save(); c.fillStyle = 'rgba(40,70,190,0.28)'; c.fillRect(cx - span / 2, y - 70, span, 140); c.restore()
    drawPool(c, cx - span / 2, cx + span / 2, y, frame, 99, 1)
  }
  for (let i = 0; i < s.zones.length; i++) {
    const z = s.zones[i], age = (s.clock - z.bornFrame), life = 480
    const a = Math.min(1, age / 8) * Math.min(1, (life - age) / 40)   // splash in, dry up
    drawPool(c, z.x, z.x + z.width, y, frame, (z.bornFrame + i * 13) & 1023, Math.max(0, a))
  }
}

// Sprite helpers (nearest-neighbour; frames are laid out horizontally).
function sprite(c, key, fr, x, y, { rot = 0, sx = 1, sy = 1, alpha = 1, anchor = 'c' } = {}) {
  const F = ARLONG_FX[key], im = img(F?.sheet); if (!im) return
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha
  c.translate(x, y); if (rot) c.rotate(rot); c.scale(sx, sy)
  const fx = ((fr % (F.frames || 1)) + (F.frames || 1)) % (F.frames || 1)
  c.drawImage(im, fx * F.w, 0, F.w, F.h, -F.w / 2, anchor === 'b' ? -F.h : -F.h / 2, F.w, F.h)
  c.restore()
}
function drawBlade(c, s, frame) {
  const b = s.blade, floor = s.groundY ?? 0
  if (b.st === 'flying') sprite(c, 'bladeFlat', 0, b.x, b.y, { rot: frame * 0.55 * b.dir, sx: 1.6 * b.dir, sy: 1.6 })   // spinning saw
  else if (b.st === 'planted') {   // stuck point-down in the ground, wobbling a little
    sprite(c, 'bladeV', 0, b.x, floor + 22, { rot: Math.sin(frame / 9) * 0.03, sx: 1.6, sy: 1.6, anchor: 'b' })
  } else if (b.st === 'recall') {   // dragged back along the ground, sparks behind
    sprite(c, 'bladeAngled', 0, b.x, floor - 30, { sx: 1.6, sy: 1.6 })
    c.save(); c.fillStyle = 'rgba(255,220,140,0.9)'
    for (let k = 0; k < 4; k++) c.fillRect(b.x - 20 + hash(k, frame) * 40, floor - 4 - hash(k + 5, frame) * 10, 2, 2)
    c.restore()
  }
}
// ── PHASE 7 PRESENTATION — intro / wins / lose. Render-only: _alIntroT / _alEndT are presentation clocks on the
// fighter (frames since the pose began, from the game frame counter), never read by the simulation; every position
// is a pure function of them (hash-placed, no Math.random). ──
const K = 1.6   // FX sprites share the fighter sheet's pixel scale
function drawPresentation(c, f, frame) {
  if (f._introPlaying && !f._alIntroOn) { f._alIntroOn = true; f._alIntro0 = frame }   // rising edge: restart the intro clock
  if (!f._introPlaying) f._alIntroOn = false
  if (f._alIntro0 != null) { f._alIntroT = Math.min(96, frame - f._alIntro0); if (f._alIntroT < 96) drawIntro(c, f, f._alIntroT) }
  const fa = f._forceAction
  if (fa === 'win' || fa === 'lose') {
    if (!f._alEndT || f._alEndFa !== fa) { f._alEnd0 = frame - 1; f._alEndFa = fa }
    const t = f._alEndT = Math.max(1, frame - f._alEnd0)
    if (fa === 'win') {
      const v = arlongWinVariant(f), want = v === 2 ? ARLONG_WIN2_ANIM : null
      if ((f._skinAnim || null) !== want) f._skinAnim = want   // the sim may be paused on the result screen
      if (v === 2) drawWin2(c, f, t); else drawWin1(c, f, t)
    } else { if (f._skinAnim) f._skinAnim = null; drawLose(c, f, t) }
  } else if (f._alEndT) { f._alEndT = 0; f._alEndFa = null }
}
const feet = f => ({ fx: (f.x || 0) + (f.w ?? 48) / 2, fy: (f.y || 0) + (f.h ?? 94), d: f.facing || 1 })
// INTRO (intro strip = walk in dragging the Kiribachi → water pours from his gills → blade onto the shoulder):
// sparks where the saw scrapes the floor, then gill water spilling down, then a ring of splash on the shoulder beat.
function drawIntro(c, f, t) {
  const { fx, fy, d } = feet(f)
  if (t < 34) {   // drag: sparks + a scrape line behind him
    const tipX = fx - d * 58
    c.save(); c.strokeStyle = 'rgba(255,214,140,0.7)'; c.lineWidth = 2
    c.beginPath(); c.moveTo(tipX, fy - 2); c.lineTo(tipX - d * Math.min(90, t * 4), fy - 1); c.stroke()
    for (let k = 0; k < 6; k++) {
      const ph = ((t + k * 5) % 12) / 12
      c.fillStyle = `rgba(255,${200 + (k * 9) % 50},120,${1 - ph})`
      c.fillRect(tipX - d * (4 + ph * 26 * (0.5 + hash(k, t >> 2))), fy - 4 - ph * (16 + 12 * hash(k + 3, t >> 2)), 3, 3)
    }
    c.restore()
  }
  if (t >= 28 && t < 78) {   // GILLS: water spills from the gill slits on his neck and patters onto the floor
    const gx = fx + d * 8, gy = fy - (f.h ?? 94) * 0.82, a = Math.min(1, (t - 28) / 6) * Math.min(1, (78 - t) / 10)
    c.save(); c.globalAlpha = a
    for (let k = 0; k < 9; k++) {
      const ph = ((t * 2 + k * 7) % 30) / 30, sx = gx + (k % 3 - 1) * 4 + d * ph * 10
      c.fillStyle = 'rgba(160,195,255,0.85)'; c.fillRect(sx, gy + ph * (fy - gy), 2, 5)
    }
    c.restore()
    drawPoolLite(c, fx + d * 10, fy, 26 + Math.min(1, (t - 40) / 30) * 30, a * 0.8, t)
  }
  if (t >= 72 && t < 96) {   // the shoulder beat: a ring of spray
    const p = (t - 72) / 24
    c.save(); c.strokeStyle = `rgba(200,225,255,${1 - p})`; c.lineWidth = 2
    c.beginPath(); c.ellipse(fx, fy - 2, 20 + p * 70, 4 + p * 10, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  }
}
function drawPoolLite(c, cx, y, r, alpha, t) {
  c.save(); c.globalAlpha = alpha; c.fillStyle = 'rgba(90,120,230,0.55)'
  c.beginPath(); c.ellipse(cx, y, r, Math.max(3, r * 0.16), 0, 0, Math.PI * 2); c.fill()
  c.strokeStyle = 'rgba(210,225,255,0.6)'; c.lineWidth = 1
  c.beginPath(); c.ellipse(cx, y - 1, r * (0.4 + 0.3 * ((t % 30) / 30)), r * 0.08, 0, 0, Math.PI * 2); c.stroke(); c.restore()
}
// WIN 1 — the portrait panel (his grin) hangs over his shoulder and the Kiribachi is stabbed upright beside him.
function drawWin1(c, f, t) {
  const { fx, fy, d } = feet(f), p = Math.min(1, t / 14)
  sprite(c, 'bladeV', 0, fx + d * 62, fy + 20 - (1 - p) * 60, { sx: K, sy: K, anchor: 'b', alpha: p })   // drops in, plants
  if (t > 12 && t < 22) drawPoolLite(c, fx + d * 62, fy, 20 + (t - 12) * 3, 1 - (t - 12) / 10, t)
  const im = img(ARLONG_FX.portrait?.sheet)
  if (im) {
    const s = 0.5, w = im.width * s, h = im.height * s, px = fx - d * 70, py = fy - (f.h ?? 94) - 40 - (1 - p) * 24
    c.save(); c.globalAlpha = p; c.imageSmoothingEnabled = false
    c.fillStyle = '#0d1a33'; c.fillRect(px - w / 2 - 4, py - h / 2 - 4, w + 8, h + 8)
    c.strokeStyle = '#7fa8ff'; c.lineWidth = 2; c.strokeRect(px - w / 2 - 4, py - h / 2 - 4, w + 8, h + 8)
    c.drawImage(im, px - w / 2, py - h / 2, w, h); c.restore()
  }
}
// WIN 2 — wide stance → Kiribachi overhead (win2 strip): a spout of water erupts behind him as the blade goes up.
function drawWin2(c, f, t) {
  const { fx, fy, d } = feet(f)
  if (t < 24) return
  const p = Math.min(1, (t - 24) / 16)
  for (let k = 0; k < 3; k++) sprite(c, 'jets', (t >> 2) + k, fx - d * (30 + k * 26), fy, { sx: 1.1, sy: 1.1 * p * (1 - k * 0.2), anchor: 'b', alpha: 0.9 })
}
// LOSE — he lies flat (lose strip) and the Kiribachi lies flat on the floor beside him; a little water seeps out.
function drawLose(c, f, t) {
  const { fx, fy, d } = feet(f), p = Math.min(1, t / 18)
  sprite(c, 'bladeFlat', 0, fx + d * 96, fy - 14 - (1 - p) * (1 - p) * 40, { sx: K * d, sy: K, rot: (1 - p) * 0.6 * d })
  if (t > 18) drawPoolLite(c, fx, fy, 30 + Math.min(40, (t - 18) * 0.8), 0.7, t)
}

// World-space FX drawn after the fighter sprite.
export function drawArlongFx(c, f, frame = 0) {
  if (!c || f?.rosterKey !== 'arlong') return
  drawPresentation(c, f, frame)
  if (!f._arlong) return
  const s = f._arlong, w = f.w ?? 48, h = f.h ?? 94, cx = f.x + w / 2
  if (s.blade && s.blade.st !== 'hand') drawBlade(c, s, frame)
  for (const p of s.shots || []) {   // WATER SHOT: a pressurised jet (R16 jet sprite laid sideways) + trailing droplets
    sprite(c, 'jets', (frame >> 2) + p.n, p.x, p.y, { rot: p.dir * Math.PI / 2, sx: 0.8, sy: 0.9 })
    c.save(); c.fillStyle = 'rgba(190,215,255,0.8)'
    for (let k = 1; k < 5; k++) c.fillRect(p.x - p.dir * k * 12, p.y - 3 + hash(p.n + k, frame) * 6, 4 - k * 0.6, 3)
    c.restore()
  }
  for (const wv of s.waves || []) {   // SEIKEN: a wall of compressed water (burst B stretched tall) + a pressure ring
    sprite(c, 'burstB', (frame >> 2) + wv.n, wv.x, wv.y, { sx: 1.4 * wv.dir, sy: 2.2, alpha: 0.95 })
    c.save(); c.strokeStyle = 'rgba(200,225,255,0.7)'; c.lineWidth = 3
    c.beginPath(); c.ellipse(wv.x - wv.dir * 14, wv.y, 14, 52, 0, -Math.PI / 2, Math.PI / 2, wv.dir < 0); c.stroke(); c.restore()
  }
  const a = f.currentAttack
  if (s.darts || (a?.al?.kind === 'super' && s.sup && s.flood > 0)) {   // TORPEDO: the R15 drill spun nose-first along his path
    const d = f.facing || 1
    sprite(c, 'drill', frame >> 1, cx + d * 30, f.y + h * 0.5, { rot: d * Math.PI / 2, sx: 1.3, sy: 1.3, alpha: 0.85 })
  }
  if (s.splash > 0) {   // ARLONG PARK finisher: a wash of spray across the whole view (world rect wide enough to cover it)
    c.save(); c.fillStyle = `rgba(170,200,255,${Math.min(0.55, s.splash / 50)})`; c.fillRect(cx - 2400, f.y - 1600, 4800, 3200); c.restore()
  }
  for (const b of s.fx || []) {   // impact bursts (A = water / karate, B = blade)
    sprite(c, b.k === 'b' ? 'burstB' : 'burstA', Math.min(2, Math.floor((14 - b.t) / 5)), b.x, b.y, { sx: 1.5, sy: 1.5, alpha: Math.min(1, b.t / 6) })
  }
  if (s.wet) {   // IN HIS ELEMENT: water shimmer over the body + spray at his feet
    c.save()
    c.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 5; k++) {
      const yy = f.y - 30 + ((frame * 1.7 + k * 31) % (h + 40)), xx = cx - 34 + hash(k, Math.floor(frame / 6)) * 68
      c.strokeStyle = `rgba(140,180,255,${0.25 + 0.2 * hash(k + 9, frame)})`; c.lineWidth = 2
      c.beginPath(); c.moveTo(xx - 10, yy); c.quadraticCurveTo(xx, yy - 4, xx + 10, yy); c.stroke()
    }
    c.globalCompositeOperation = 'source-over'
    const fy = f.y + h
    for (let k = 0; k < 7; k++) {   // spray droplets arc up from the feet
      const ph = ((frame + k * 9) % 24) / 24, dir = k & 1 ? 1 : -1
      const dx = dir * (6 + 22 * ph) * (0.6 + hash(k, Math.floor((frame + k * 9) / 24))), dy = -26 * ph * (1 - ph) * 4
      c.fillStyle = `rgba(200,220,255,${1 - ph})`; c.fillRect(cx + dx, fy + dy - 4, 3, 3)
    }
    c.restore()
  }
}
