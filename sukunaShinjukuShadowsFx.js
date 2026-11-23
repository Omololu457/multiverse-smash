// Ryomen Sukuna — Shinjuku Arc (sukuna_shinjuku) — TEN SHADOWS: PRESENTATION ONLY. Reads f._sks.ts (sim state) and
// draws each shikigami from Megumi's EXISTING shikigami strips (megumiSprites.js MEGUMI_SUMMON_ANIM — the same files his
// kit uses, nothing copied, never his body), plus the Chimera Shadow Garden floor with Megumi's pixels removed
// (tools/sukunashinjuku/shadows_import.py → assets/sukuna_shinjuku/ten_shadows/domainFloor.png). Writes nothing the sim reads.
// Spawn / despawn: every shikigami rises out of a shadow pool (its silhouette cell over a pool) and sinks back into one.
import { MEGUMI_SUMMON_ANIM as SA } from './megumiSprites.js'
import { TS } from './sukunaShinjukuData.js'

const SCALE = { dogWhite: 2, dogBlack: 2, toad: 3, airToad: 3, nue: 2, airNue: 2, rabbit: 3, serpent: 2, elephant: 2, konMiss: 2, konHit: 2, mahoraga: 3.75 }   // = Megumi's SUMMON_SCALE; Mahoraga ×1.25 bigger (user: "make the Mahoraga a little big")
const FLOOR = { sheet: './assets/sukuna_shinjuku/ten_shadows/domainFloor.png', frames: 15, width: 328, height: 53, line: 46 }
// strip timelines: elapsed frame → cell, in the sheet's own order (matched to the sim frames in sukunaShinjukuData.js TS)
const TL = {
  toad: [[0, 0], [3, 1], [6, 2], [9, 3], [11, 4], [12, 5], [14, 6], [16, 7], [18, 8], [20, 9], [24, 10], [28, 11], [32, 12], [37, 13]],
  airToad: [[0, 0], [3, 1], [5, 2], [7, 3], [9, 4], [10, 5], [12, 6], [14, 7], [16, 8], [18, 9], [22, 10], [26, 11], [30, 12], [34, 13]],
  nue: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 4], [22, 5], [24, 6], [30, 7], [40, 8]],
  airNue: [[0, 0], [4, 1], [10, 2], [16, 3], [18, 4], [21, 5], [25, 6], [30, 7], [36, 8], [42, 9]],
  serpent: [[0, 0], [8, 1], [14, 2], [20, 3], [24, 4], [32, 3], [38, 2], [44, 1], [48, 0]],   // grows, then the same cells in reverse
  konMiss: [[0, 0], [4, 1], [8, 2], [12, 3], [18, 4], [26, 5], [38, 6]],
  konHit: [[0, 0], [10, 1], [14, 2], [18, 3], [20, 4], [22, 5], [26, 6], [30, 1], [33, 2], [38, 7], [44, 8], [49, 9]],
  elephant: [[0, 0], [6, 1], [12, 2], [18, 3], [24, 4], [30, 5], [36, 6], [40, 7], [46, 8], [52, 9], [56, 10], [62, 11], [72, 12], [84, 13], [96, 14], [108, 15]],
  mahoraga: [[0, 0], [4, 1], [8, 2], [12, 3], [18, 4], [24, 5], [28, 6], [32, 7], [36, 8], [40, 9], [44, 10], [48, 11], [52, 12], [56, 13], [60, 14], [65, 15],
    [70, 16], [75, 17], [80, 18], [85, 19], [90, 20], [95, 21], [100, 22], [104, 23], [112, 24], [120, 25], [128, 26]],
}
const at = (tl, t) => { let fr = tl[0][1]; for (const [k, v] of tl) if (t >= k) fr = v; return fr }
const LAST = { toad: 13, airToad: 13, nue: 8, airNue: 9, dogWhite: 4, dogBlack: 4, serpent: 0, konMiss: 6, konHit: 9, elephant: 15, mahoraga: 26, rabbit: 7 }
const STRIP = { gama: 'toad', gamaAir: 'airToad', nue: 'nue', nueAir: 'airNue', orochi: 'serpent', kon: 'konMiss', ele: 'elephant', maho: 'mahoraga', rabbit: 'rabbit' }

const IMG = {}
function img(src) {
  if (!src || typeof Image === 'undefined') return null
  let i = IMG[src]; if (!i) { i = IMG[src] = new Image(); try { i.src = src } catch (_) {} }
  return i
}
const ready = i => !!(i && i.complete !== false && (i.naturalWidth || i.width))
function cell(c, key, i, x, yBottom, flip = 1, alpha = 1, scale = SCALE[key] || 2) {
  const A = SA[key]; if (!A) return false
  const im = img(A.sheet); if (!ready(im) || alpha <= 0.01) return false
  const k = Math.max(0, Math.min(A.frames - 1, i | 0))
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha
  c.translate(Math.round(x), Math.round(yBottom)); c.scale(flip, 1)
  c.drawImage(im, k * A.width, 0, A.width, A.height, -A.originX * scale, -A.originY * scale, A.width * scale, A.height * scale)
  c.restore(); return true
}
function pool(c, x, y, rx, a = 0.5) {
  c.save(); c.globalAlpha *= a; c.fillStyle = '#05050c'; c.beginPath(); c.ellipse(x, y - 1, rx, Math.max(3, rx * 0.18), 0, 0, Math.PI * 2); c.fill(); c.restore()
}
const rise = t => Math.min(1, t / 8)   // the first frames: it comes up out of its pool
const centreY = (key, y) => y + SA[key].height * SCALE[key] / 2

function drawOne(c, z) {
  const d = z.dir || 1, t = Math.max(0, z.t)
  switch (z.k) {
    case 'gama': pool(c, z.x, z.y, 34); cell(c, 'toad', at(TL.toad, t), z.x, z.y, d, rise(t)); break
    case 'gamaAir': cell(c, 'airToad', at(TL.airToad, t), z.x, z.y, d, rise(t)); break
    case 'nue': pool(c, z.x, z.y - TS.nue.ay, 30, 0.35); cell(c, 'nue', at(TL.nue, t), z.x, centreY('nue', z.y), d, rise(t)); break
    case 'nueAir': cell(c, 'airNue', at(TL.airNue, t), z.x, centreY('airNue', z.y), d, rise(t)); break
    case 'dogs': {
      if (z.t < 0) break
      const k = z.col === 'black' ? 'dogBlack' : 'dogWhite', fr = t < 4 ? 0 : 1 + Math.floor(t / 4) % 3
      pool(c, z.x, z.y, 36, 0.4); cell(c, k, fr, z.x, z.y, d)
      break
    }
    case 'orochi': {
      const W = TS.orochi.warn
      if (t <= W + 2) pool(c, z.x, z.y, 18 + t * 1.2, t % 6 < 3 ? 0.7 : 0.45)   // the warning: a widening shadow under them
      else pool(c, z.x, z.y, 40, 0.5)
      cell(c, 'serpent', at(TL.serpent, t), z.x, z.y, d)
      break
    }
    case 'kon': pool(c, z.x, z.y, 50); cell(c, z.br === 'hit' ? 'konHit' : 'konMiss', at(z.br === 'hit' ? TL.konHit : TL.konMiss, t), z.x, z.y, d); break
    case 'ele': pool(c, z.x + d * 40, z.y, 90); cell(c, 'elephant', at(TL.elephant, t), z.x, z.y, d); break
    case 'maho': {
      if (t < 24 || t >= 104) pool(c, z.x, z.y, 88, 0.6)   // the leap height is in the sheet's own cells (5-11)
      else pool(c, z.x, z.y, 40, 0.35)
      if (z.inv > 0 && z.inv % 4 < 2) { c.save(); c.globalAlpha = 0.7 }
      cell(c, 'mahoraga', at(TL.mahoraga, t), z.x, z.y, d)
      if (z.inv > 0 && z.inv % 4 < 2) c.restore()
      break
    }
  }
}
function drawWave(c, w) {   // Mahoraga's crescent wave (blue-white, like the waves in his own cells)
  const a = Math.max(0, 1 - w.t / TS.maho.wave.life)
  c.save(); c.globalAlpha = 0.85 * a; c.globalCompositeOperation = 'lighter'
  for (const [r, col, lw] of [[80, '#3d8bff', 12], [75, '#bfe6ff', 6], [71, '#ffffff', 2]]) {
    c.strokeStyle = col; c.lineWidth = lw; c.beginPath()
    c.ellipse(w.x - w.dir * 38, w.y - 80, r * 0.55, r, 0, w.dir === 1 ? -1.2 : Math.PI - 1.2 + 0.0, w.dir === 1 ? 1.2 : Math.PI + 1.2)
    c.stroke()
  }
  c.restore()
}
function drawRabbits(c, R) {
  TS.datto.spread.forEach((dx, i) => {
    if (!R.alive[i]) return
    const fr = R.t < 4 ? 0 : 1 + (Math.floor(R.t / 4) + i) % 6, hop = Math.abs(Math.sin((R.t + i * 5) / 5)) * 10
    cell(c, 'rabbit', fr, R.x + dx, R.y - hop, i % 2 ? -1 : 1, rise(R.t))
  })
}
function drawFloor(c, D) {   // Chimera Shadow Garden: Megumi's spreading shadow floor (his pixels removed), tiled across the stage
  const im = img(FLOOR.sheet); if (!ready(im)) return
  const t = D.t, end = TS.dom.frames, s = 3, w = FLOOR.width * s
  const i = t < 40 ? 2 + Math.floor(t / 40 * 7) : t > end - 30 ? 11 + Math.min(3, Math.floor((t - end + 30) / 10)) : 8 + Math.floor(t / 8) % 3
  const fade = Math.min(1, (end - t) / 20)
  c.save(); c.globalAlpha = 0.22 * fade; c.fillStyle = '#04030a'; c.fillRect(D.x - 4000, D.y - 2000, 8000, 2200); c.restore()   // the garden darkens the world
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = fade
  for (let k = -2; k <= 2; k++) {
    if (t < 40 && k !== 0) continue
    c.drawImage(im, i * FLOOR.width, 0, FLOOR.width, FLOOR.height, Math.round(D.x - w / 2 + k * (w - 60)), Math.round(D.y - FLOOR.line * s), w, FLOOR.height * s)
  }
  c.restore()
}

// win pose: Nue glides down and settles over his shoulder (render-only; the free-standing Nue cells — no landing frames exist)
function drawWinNue(c, f, s) {
  if (!s.said?.win || !(f.health > 0) || !s.ts) return
  const n = s.say?.kind === 'win' ? 200 - s.say.t : 200   // frames since the win line (the sim's bubble timer)
  const d = -(f.facing || 1), x = f.x + f.w / 2 + d * 34, yT = f.y - 40, y = yT - Math.max(0, 260 - n * 6)
  cell(c, 'nue', 1 + Math.floor(n / 5) % 3, x, centreY('nue', y) - 40, -d, Math.min(1, n / 12))
}

export function drawSksShadowsBack(c, f) {   // under the bodies: the garden floor
  const T = f?._sks?.ts; if (!T) return
  if (T.dom) drawFloor(c, T.dom)
}
export function drawSksShadows(c, f) {
  const s = f?._sks, T = s?.ts; if (!T) return
  for (const z of T.sum) drawOne(c, z)
  for (const w of T.waves) drawWave(c, w)
  if (T.rab) drawRabbits(c, T.rab)
  for (const h of s.fx) {   // sink back into the shadow / broken
    if (h.kind !== 'tsSink' && h.kind !== 'tsBreak') continue
    const key = h.what === 'dogs' ? (h.col === 'black' ? 'dogBlack' : 'dogWhite') : STRIP[h.what]; if (!key) continue
    const a = Math.max(0, 1 - h.t / 20), y = h.cy ? centreY(key, h.y) : h.y
    pool(c, h.x, h.cy ? h.y - TS.nue.ay : h.y, 30 * a + 10, 0.5 * a)
    cell(c, key, LAST[key], h.x, y + h.t * 1.2, h.dir || 1, a * 0.85)
    if (h.kind === 'tsBreak' && h.t < 10) { c.save(); c.globalAlpha = 1 - h.t / 10; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.arc(h.x, h.y - 30, 10 + h.t * 3, 0, Math.PI * 2); c.stroke(); c.restore() }
  }
  drawWinNue(c, f, s)
}
export function tsHudTags(f) {
  const T = f?._sks?.ts, tags = []; if (!T) return tags
  if (T.dom) tags.push(['SHADOW GARDEN ' + ((TS.dom.frames - T.dom.t) / 60).toFixed(1) + 's', '#9fb8ff'])
  if (T.on) tags.push(['TEN SHADOWS', '#c8d6ff'])
  return tags
}
