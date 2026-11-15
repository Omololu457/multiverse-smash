// Green Ranger (green_ranger) — RENDER-ONLY FX + audio cues. Reads sim state (f._greenRanger, f._zordUlt, the shared
// Zord cinematic), never writes it. Supplied art only: the Falconzord cells (shared asset, decoded once), the supplied
// call circles / burst ring / cut-in illustration. HUD glyphs, rings and text are small code-drawn UI shapes.
// Bounded: tinted Zord cells are built ONCE per (cell, tint) into a cached canvas; particles are fixed-count loops
// derived from the frame counter (no arrays, no Math.random); reduced effects (juiceSettings) → static fallbacks.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { FALCON_CELLS, FALCON_SEQ } from './falconzordSprites.js'
import { zordOpenerPos, zordUltCinePos, ZORD_ULT_SEQUENCES } from './rangerZordUltimate.js'
import { DRAGON_CALL, GREEN_MOVES } from './greenRangerData.js'
import { GREEN_RANGER_FX, GREEN_RANGER_CUTIN } from './greenRangerSprites.js'
import { greenSkinOf, greenZordPresentation } from './greenRangerSkinTable.js'

const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const tinted = new Map()   // `${src}|${tint}` → canvas (built once)
export const greenFxCacheSize = () => cache.size + tinted.size
const ready = im => im && im.complete && im.naturalWidth > 0
const skinArt = (f, n) => f?._recolorTag ? `./assets/green_ranger/skins/${f._recolorTag}/cells/${n}.png` : GREEN_RANGER_FX[n]?.src || `./assets/green_ranger/cells/${n}.png`

// Tint a supplied cell ONCE: multiply-style colourise that keeps the source luminance ramp and alpha (shared asset
// unchanged on disk; Black / Pink / White never read these canvases).
function tintedCell(src, tint) {
  if (!tint) return image(src)
  const key = src + '|' + tint
  if (tinted.has(key)) return tinted.get(key)
  const im = image(src); if (!ready(im)) return null
  const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight
  const g = cv.getContext('2d'); g.drawImage(im, 0, 0)
  const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data
  const tr = parseInt(tint.slice(1, 3), 16), tg = parseInt(tint.slice(3, 5), 16), tb = parseInt(tint.slice(5, 7), 16)
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue
    const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255
    const k = l < 0.5 ? 2 * l : 1, w = l < 0.5 ? 0 : (l - 0.5) * 2   // dark → tinted shade, light → toward white (keeps the ramp)
    p[i] = Math.round(tr * k * (1 - w) + 255 * w); p[i + 1] = Math.round(tg * k * (1 - w) + 255 * w); p[i + 2] = Math.round(tb * k * (1 - w) + 255 * w)
  }
  g.putImageData(d, 0, 0); tinted.set(key, cv); return cv
}
export const ZORD_SCALE = 1.6
function drawZord(c, name, x, y, dir, tint, alpha = 1, scale = ZORD_SCALE) {
  const cell = FALCON_CELLS[name]; if (!cell) return
  const im = tintedCell(cell.src, tint); if (!im || (im instanceof Image && !ready(im))) return
  const flip = dir * (cell.face || 1) < 0
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = Math.max(0.35, alpha); c.translate(Math.round(x), Math.round(y)); if (flip) c.scale(-1, 1)
  c.drawImage(im, -cell.ax * scale, -cell.ay * scale, cell.w * scale, cell.h * scale); c.restore()
}
const frameOf = (pose, age, speed = 4) => { const seq = FALCON_SEQ[pose] || [pose]; return seq[Math.floor(age / speed) % seq.length] }
function drawImg(c, src, x, y, scale = 1, alpha = 1, flip = false) {
  const im = image(src); if (!ready(im)) return
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y)); if (flip) c.scale(-1, 1)
  c.drawImage(im, -im.naturalWidth * scale / 2, -im.naturalHeight * scale / 2, im.naturalWidth * scale, im.naturalHeight * scale); c.restore()
}

// ── NOTE GLYPHS (UI shapes; slot 1 = outline version, slot 2 = solid version) ──
function glyphPath(c, kind, x, y, r) {
  c.beginPath()
  const P = (pts) => { pts.forEach(([a, b], i) => i ? c.lineTo(x + a * r, y + b * r) : c.moveTo(x + a * r, y + b * r)); c.closePath() }
  switch (kind) {
    case 'star4': P([[0, -1], [0.28, -0.28], [1, 0], [0.28, 0.28], [0, 1], [-0.28, 0.28], [-1, 0], [-0.28, -0.28]]); break
    case 'hexagon': P([0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * Math.PI / 3), Math.sin(i * Math.PI / 3)])); break
    case 'chevron2': P([[-1, -0.8], [-0.2, 0], [-1, 0.8], [-0.6, 0.8], [0.2, 0], [-0.6, -0.8]]); c.moveTo(x - 0.1 * r, y - 0.8 * r); c.lineTo(x + 0.7 * r, y); c.lineTo(x - 0.1 * r, y + 0.8 * r); c.lineTo(x + 0.3 * r, y + 0.8 * r); c.lineTo(x + 1.1 * r, y); c.lineTo(x + 0.3 * r, y - 0.8 * r); c.closePath(); break
    case 'flame': c.moveTo(x, y - r); c.quadraticCurveTo(x + r, y + 0.1 * r, x, y + r); c.quadraticCurveTo(x - r, y + 0.1 * r, x, y - r); c.closePath(); break
    case 'shard': P([[0, -1], [0.55, -0.1], [0.15, 1], [-0.5, 0.2]]); break
    case 'ringDot': c.arc(x, y, r, 0, Math.PI * 2); c.moveTo(x + r * 0.35, y); c.arc(x, y, r * 0.35, 0, Math.PI * 2, true); break
    case 'slash3': for (const k of [-0.6, 0, 0.6]) { c.moveTo(x + (k - 0.35) * r, y + r); c.lineTo(x + (k + 0.15) * r, y - r); c.lineTo(x + (k + 0.4) * r, y - r); c.lineTo(x + (k - 0.1) * r, y + r); c.closePath() } break
    case 'crescent': c.arc(x, y, r, 0.35 * Math.PI, 1.65 * Math.PI); c.arc(x + 0.45 * r, y, r * 0.8, 1.55 * Math.PI, 0.45 * Math.PI, true); c.closePath(); break
    case 'diamond': P([[0, -1], [0.75, 0], [0, 1], [-0.75, 0]]); break
    case 'bracket': P([[-0.8, -1], [0.2, -1], [0.2, -0.6], [-0.4, -0.6], [-0.4, 0.6], [0.2, 0.6], [0.2, 1], [-0.8, 1]]); c.moveTo(x + 0.4 * r, y - r); c.lineTo(x + 0.9 * r, y - r); c.lineTo(x + 0.9 * r, y + r); c.lineTo(x + 0.4 * r, y + r); c.closePath(); break
    default:   // 'note' (default skin): an eighth note head + stem
      c.ellipse(x - 0.25 * r, y + 0.45 * r, 0.5 * r, 0.38 * r, -0.4, 0, Math.PI * 2); c.moveTo(x + 0.2 * r, y + 0.4 * r); c.lineTo(x + 0.2 * r, y - r); c.lineTo(x + 0.75 * r, y - 0.55 * r); c.lineTo(x + 0.75 * r, y - 0.3 * r); c.lineTo(x + 0.32 * r, y - 0.62 * r); c.lineTo(x + 0.32 * r, y + 0.4 * r); c.closePath()
  }
}
export function drawNoteGlyph(c, kind, x, y, r, slot, held, col) {
  c.save(); glyphPath(c, kind, x, y, r)
  if (!held) { c.globalAlpha = 0.35; c.setLineDash([2, 2]); c.strokeStyle = '#9aa3ad'; c.lineWidth = 1; c.stroke(); c.restore(); return }
  c.lineWidth = 2; c.strokeStyle = '#0b0d10'
  if (slot === 0) { c.stroke(); c.lineWidth = 1.4; c.strokeStyle = col; c.stroke() }                 // slot 1: outline version
  else { c.fillStyle = col; c.fill('evenodd'); c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.stroke() }   // slot 2: solid version
  c.restore()
}

// render-side timers fed by the cue stream (never read back by the sim)
const vis = new WeakMap()
const V = f => { let v = vis.get(f); if (!v) { v = { gain: 0, spend: 0, broken: 0, t: 0 }; vis.set(f, v) } return v }

function drawNotes(c, f) {
  const s = f._greenRanger; if (!s) return
  const sk = greenSkinOf(f), col = sk.effect, cx = f.x + f.w / 2, y = f.y - 24, v = V(f)
  for (let i = 0; i < DRAGON_CALL.maxNotes; i++) drawNoteGlyph(c, sk.glyph, cx - 10 + i * 20, y, 7, i, i < s.notes, col)
  // cooldown ring: a fading arc around the pair while the call is unavailable
  if (s.cooldown > 0) { c.save(); c.globalAlpha = 0.55; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(cx, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (s.cooldown / DRAGON_CALL.cooldown)); c.stroke(); c.restore() }
  // Morph Energy low cue (cosmetic): a short dim/bright alternation under the glyphs, never a strobe
  if ((f.energy || 0) < 20 && f.health > 0) { const on = calm() || Math.floor(v.t / 20) % 2 === 0; c.save(); c.globalAlpha = on ? 0.85 : 0.4; c.fillStyle = '#ffcf5a'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('MORPH LOW', cx, y + 18); c.restore() }
  if (v.gain > 0) { const u = 1 - v.gain / 30; c.save(); c.globalAlpha = 1 - u; drawNoteGlyph(c, sk.glyph, cx, y - 14 - 26 * u, 9 + 4 * u, 1, true, col); c.restore() }                 // note gained: glyph rises
  if (v.spend > 0) { const u = 1 - v.spend / 20; c.save(); c.globalAlpha = 1 - u; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(cx + (f.facing || 1) * 50 * u, f.y + f.h * 0.4, 18 * (1 - u) + 4, 0, Math.PI * 2); c.stroke(); c.restore() }   // note spent: ring flies to the hand
  if (v.broken > 0) { c.save(); c.globalAlpha = Math.min(1, v.broken / 12); c.strokeStyle = '#ff5050'; c.lineWidth = 3; const bx = cx, by = y - 16
    c.beginPath(); c.moveTo(bx - 8, by - 8); c.lineTo(bx + 8, by + 8); c.moveTo(bx + 8, by - 8); c.lineTo(bx - 8, by + 8); c.stroke()
    c.fillStyle = '#ff7070'; c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillText('CALL BROKEN', bx, by - 12); c.restore() }
}
// Dragon Call performance: the supplied circles cycle at the flute (3-frame sequence), plus a readable pulse ring.
function drawCall(c, f) {
  const a = f.currentAttack; if (a?.name !== 'gCall') return
  const t = a.total - a.timer, sk = greenSkinOf(f), dir = f.facing || 1
  if (t < DRAGON_CALL.startup || t >= DRAGON_CALL.startup + DRAGON_CALL.perform) return
  const k = t - DRAGON_CALL.startup, fx = f.x + f.w / 2 + dir * 46, fy = f.y + 22
  const name = ['callCircle0', 'callCircle1', 'callCircle2'][calm() ? 0 : Math.floor(k / 5) % 3]
  drawImg(c, skinArt(f, name), fx + dir * 26, fy - 6, 1.85, 0.95)
  // pulse the opponent can read across the stage: one expanding ring per 10 f (≤3 alive)
  c.save(); c.strokeStyle = sk.effect; c.lineWidth = 2
  for (let i = 0; i < 3; i++) { const u = ((k + i * 10) % 30) / 30; if (calm() && i) break; c.globalAlpha = 0.6 * (1 - u); c.beginPath(); c.arc(fx, fy, 24 + 120 * u, 0, Math.PI * 2); c.stroke() }
  c.restore()
}
// Empowered-special telegraph: visible BEFORE the move can connect (startup), plus a brighter trail glow when active.
function drawEmpower(c, f) {
  const a = f.currentAttack, m = a?.gm; if (!m?.note) return
  const t = a.total - a.timer, sk = greenSkinOf(f), dir = m.dir, cx = f.x + f.w / 2
  const tip = m.key === 'gPulse' ? { x: cx + dir * 60, y: f.y + 36 } : { x: cx + dir * (m.key === 'gEdge' ? 90 : 70), y: f.y + 28 }
  const pre = t <= a.activeEnd + 2
  if (!pre) return
  c.save(); const r = 10 + (calm() ? 4 : 4 * Math.sin(t * 0.6)); c.globalAlpha = 0.85; c.strokeStyle = sk.effect; c.lineWidth = 3
  c.beginPath(); c.arc(tip.x, tip.y, r, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 0.35; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(tip.x, tip.y, r * 0.45, 0, Math.PI * 2); c.fill()
  c.globalAlpha = 0.5; drawNoteGlyph(c, sk.glyph, tip.x, tip.y - r - 10, 6, 1, true, sk.effect); c.restore()
}
// Ultimate: the Falconzord (opener path and confirmed sequence), tinted per skin; cut-in; CALL MISSED.
function drawZordUlt(c, f) {
  const pres = greenZordPresentation(f), tint = pres.tint
  const z = f._zordUlt
  if (z && z.result !== 'confirmed' && z.seq) {
    const p = zordOpenerPos(z), S = ZORD_ULT_SEQUENCES[z.seq]
    const pose = z.age >= S.exitAt ? frameOf('turn', z.age) : p.pose === 'dive' ? 'dive0' : frameOf('approach', z.age)
    if (z.tx != null && z.age < S.opener.from) {   // warning marker on the dive point (owner-coloured, before contact)
      c.save(); c.globalAlpha = 0.7; c.strokeStyle = pres.accent; c.lineWidth = 2; c.setLineDash([6, 5]); c.beginPath(); c.ellipse(z.tx, z.feet - 4, 50, 10, 0, 0, Math.PI * 2); c.stroke(); c.restore() }
    drawZord(c, pose, p.x, p.y, z.age >= S.exitAt ? -p.dir : p.dir, tint)
  }
  const u = zordUltCinePos(f)
  if (u) {
    const pose = u.pose === 'impact' ? 'impact0' : u.pose === 'streakDive' ? 'streak0' : u.pose === 'exit' ? frameOf('turn', u.age) : u.pose === 'energy' ? 'energy0' : frameOf(u.pose, u.age, 3)
    if (u.pose === 'impact') { drawZord(c, 'impact0', u.x, u.y + 10, u.dir, tint, 1, 2.4); drawZord(c, 'energy0', u.x, u.y - 30, u.dir, tint, 0.8) }
    else drawZord(c, pose, u.x, u.y, u.dir, tint, 1)
    if (u.age < 34) drawCutIn(c, f, pres, u.age)
  }
}
function drawCutIn(c, f, pres, age) {
  const im = image(f._recolorTag ? `./assets/green_ranger/skins/${f._recolorTag}/cutin.png` : GREEN_RANGER_CUTIN); const cv = c.canvas, k = cv.width / 1280   // precomputed per-skin cut-in
  c.save(); c.setTransform(k, 0, 0, k, 0, 0)
  const a = Math.min(1, age / 6) * Math.min(1, (34 - age) / 6)
  c.globalAlpha = 0.8 * a; c.fillStyle = '#0a0d0a'; c.fillRect(0, 96, 1280, 150)
  c.fillStyle = pres.accent; c.fillRect(0, 96, 1280, 4); c.fillRect(0, 242, 1280, 4)
  c.globalAlpha = a
  if (ready(im)) { c.imageSmoothingEnabled = false; const s = 1.4; c.drawImage(im, 40, 100, im.naturalWidth * s, im.naturalHeight * s * 0.95) }
  c.fillStyle = '#ffffff'; c.font = 'bold 42px sans-serif'; c.textAlign = 'right'; c.fillText(pres.title, 1240, 170)
  c.fillStyle = pres.accent; c.font = 'bold 20px sans-serif'; c.fillText(pres.subtitle, 1240, 204)
  c.fillStyle = '#c8d0c8'; c.font = '12px sans-serif'; c.fillText('Falconzord — creative crossover call', 1240, 228)
  c.restore()
}
function drawMissed(c, f) {
  const s = f._greenRanger; if (!s?.missed) return
  c.save(); c.globalAlpha = Math.min(1, s.missed / 12); c.fillStyle = '#ffe36b'; c.strokeStyle = '#111'; c.lineWidth = 3; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'
  c.strokeText('CALL MISSED', f.x + f.w / 2, f.y - 44); c.fillText('CALL MISSED', f.x + f.w / 2, f.y - 44); c.restore()
}
// Entrance / victory flourishes: authored poses + tint + capped particles (≤10), deterministic per frame / skin.
function drawFlourish(c, f, v) {
  const intro = !!f._introPlaying, win = f._forceAction === 'win'
  if (!intro && !win) return
  const sk = greenSkinOf(f), kind = intro ? sk.entrance : sk.victory, t = v.t, cx = f.x + f.w / 2, cy = f.y + f.h / 2
  if (kind === 'morph' || kind === 'flex' || kind === 'fade' || kind === 'still') return
  c.save(); c.strokeStyle = sk.effect; c.fillStyle = sk.effect
  const n = calm() ? 0 : 10
  const ring = (r, al) => { c.globalAlpha = al; c.lineWidth = 2; c.beginPath(); c.arc(cx, f.y + f.h, r, 0, Math.PI * 2); c.stroke() }
  switch (kind) {
    case 'stars': case 'starDrift': for (let i = 0; i < n; i++) { const h = (i * 97 + 13) % 89, x = cx - 50 + (h * 13) % 100, y = f.y - 10 + ((h * 7 + t * (kind === 'starDrift' ? 0.3 : 0)) % (f.h + 20)); c.globalAlpha = 0.5 + 0.4 * ((i + (t >> 3)) % 2); c.fillRect(x, y, 2, 2) } break
    case 'scan': { const y = f.y + ((t * 3) % (f.h + 20)) - 10; c.globalAlpha = 0.55; c.fillRect(cx - 40, y, 80, 2); break }
    case 'ringPulse': case 'rustRing': case 'copperRing': ring(20 + (t % 30) * 2, 0.6 * (1 - (t % 30) / 30)); break
    case 'streak': case 'echo': for (let i = 0; i < Math.min(4, n); i++) { c.globalAlpha = 0.25 - i * 0.05; c.fillRect(cx - (f.facing || 1) * (20 + i * 14), f.y + 10, 3, f.h - 20) } break
    case 'embers': case 'risingEmbers': for (let i = 0; i < n; i++) { const h = (i * 53 + 7) % 61, x = cx - 30 + (h * 11) % 60, y = f.y + f.h - ((t * 1.5 + h * 9) % (f.h + 30)); c.globalAlpha = 0.6; c.fillRect(x, y, 2, 3) } break
    case 'flashOutline': case 'rimFlash': if (t < 14) { c.globalAlpha = 0.7 * (1 - t / 14); c.lineWidth = 3; c.strokeRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8) } break
    case 'haze': case 'halo': c.globalAlpha = 0.25; c.beginPath(); c.ellipse(cx, f.y - 6, 26, 7, 0, 0, Math.PI * 2); c.stroke(); break
    case 'slashLines': if (t < 20) { c.globalAlpha = 0.7 * (1 - t / 20); c.lineWidth = 2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx - 40, cy + i * 18 - 20); c.lineTo(cx + 40, cy + i * 18 + 20); c.stroke() } } break
    case 'sparkBurst': if (t < 24) for (let i = 0; i < n; i++) { const ang = i * 0.628, r = 10 + t * 2.4; c.globalAlpha = 0.7 * (1 - t / 24); c.fillStyle = '#efe6d6'; c.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 3, 3) } break
    case 'inkRim': case 'rimFade': c.globalAlpha = Math.min(0.6, t / 40); c.strokeStyle = sk.rim || '#c9d6f2'; c.lineWidth = 2; c.strokeRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6); break
  }
  c.restore()
}
// Team-ID outline in mirrors: colour comes from the PLAYER SLOT (never the skin).
function drawTeamId(c, f, opp) {
  if (!opp || opp.rosterKey !== f.rosterKey || f.health <= 0) return
  const col = (f.playerNumber || f.side) === 2 ? '#ff5a5a' : '#4aa8ff'
  c.save(); c.globalAlpha = 0.9; c.fillStyle = col; c.beginPath(); const x = f.x + f.w / 2, y = f.y - 40
  c.moveTo(x - 7, y - 6); c.lineTo(x + 7, y - 6); c.lineTo(x, y + 3); c.closePath(); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke(); c.restore()
}

export function drawGreenRangerFx(c, f, opp = null) {
  if (f?.rosterKey !== 'green_ranger') return
  const v = V(f); v.t++
  if (v.gain > 0) v.gain--; if (v.spend > 0) v.spend--; if (v.broken > 0) v.broken--
  drawFlourish(c, f, v)
  if (f.health > 0) { drawNotes(c, f); drawCall(c, f); drawEmpower(c, f); drawTeamId(c, f, opp) }
  drawZordUlt(c, f)
  drawMissed(c, f)
}
// Cue playback (presentation only) through EXISTING project audio ids (no new sound files or synths).
const SFX = { swing: 'mmprblack_swing', special: 'mmprblack_special', slash: 'mmprblack_crack', callStart: 'mmprblack_call', noteGain: 'mmprblack_pincer',
  noteSpend: 'mmprblack_pincerGo', callBroken: 'mmprblack_crack', pulse: 'mmprblack_volley', pulse2: 'mmprblack_volley', edgeBurst: 'mmprblack_shotHit',
  ultStart: 'mmprblack_ultStart', zordDive: 'mmprblack_commit_sweep', zordHit: 'mmprblack_talon', ultConfirm: 'mmprblack_ultConfirm', callMissed: 'mmprblack_ultMiss',
  ultBroken: 'mmprblack_ultMiss', land: null, pulseCancel: null }
const AFTER_DEFEAT_MUTE = /^(callStart|noteGain|ultStart|zordDive|ultConfirm)/
export function playGreenCues(f) {
  const q = f?._greenRanger?.cues; if (!q?.length) return
  const v = V(f)
  for (const k of q) {
    if (k === 'noteGain') v.gain = 30; if (k === 'noteSpend') v.spend = 20; if (k === 'callBroken') v.broken = 40
    if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(k)) continue
    const id = SFX[k]; if (id) try { sound.play(id) } catch (_) {}
  }
  q.length = 0
}
export function preloadGreenRanger() { for (const k in FALCON_CELLS) image(FALCON_CELLS[k].src); for (const k in GREEN_RANGER_FX) image(GREEN_RANGER_FX[k].src); image(GREEN_RANGER_CUTIN) }
