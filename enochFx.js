// ENOCH (enoch) — RENDER-ONLY: ground patches, the hovering disc, glide trail flecks, the visor beam (beam.js drawBeam3 = the
// Homelander / Superman look), steam clouds, reaction events, the thermal HUD, the intro card, the super presentation and the
// audio cues. Reads sim state (f._enoch, enochUltView); never writes it. Hard-edged shapes, integer coordinates, no blur, no
// per-frame canvases, no Math.random (flicker = ehash(match seed, frame, player, slot)). Reduced motion → no flicker.
// Steam obscures the stage with a CAPPED opacity and is drawn before the HUD (the HUD is never hidden).
import { sound } from './sound.js'
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'
import { enoch as EN, WALLS, LASER } from './enochData.js'
import { ENOCH_FX, ENOCH_FX_PATH } from './enochSprites.js'
import { enochUltView, ehash, INTRO, lensOrigin, TP, wallRect } from './enochState.js'
import { drawBeam3, drawLaserGauge, laserView } from './beam.js'
import { startHomelanderLaser, stopHomelanderLaser } from './homelander_sfx_map.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
const isEn = f => f?.rosterKey === 'enoch'
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const R = Math.round
export const COL = {
  ice: ['#e8fbff', '#9fe8ff', '#4fb6d8', '#1f5a78'], fire: ['#fff1c0', '#ffd27a', '#ff9a3c', '#c4561a'],
  water: ['#d8f0ff', '#7fc8ff', '#3a86d0', '#1d3f78'], steam: ['rgba(235,240,245,1)', 'rgba(200,210,220,1)'],
  hud: ['#ffd27a', '#9fe8ff'], lensHot: '#fff1c0',
}
export const STEAM_MAX_ALPHA = 0.55
let SEED = 1337
const seedOf = () => SEED
const flick = (f, fr, slot) => calm() ? 0.5 : ehash(seedOf(f), fr, f.side, slot)

function part(c, name, el, x, y, { flip = 1, alpha = 1, scale = 2 } = {}) {
  const meta = ENOCH_FX[name]; if (!meta) return
  const im = image(ENOCH_FX_PATH(name, el === 'ice' ? null : el)); if (!ready(im)) return
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false; c.translate(R(x), R(y)); if (flip < 0) c.scale(-1, 1)
  c.drawImage(im, R(-meta.w * scale / 2), R(-meta.h * scale), meta.w * scale, meta.h * scale); c.restore()
}
// ── PATCHES (world space, under the fighters) ──
function drawPatch(c, f, p, fr, now) {
  const life = p.life - (now - p.bornFrame), fade = life < 40 ? (calm() ? 0.6 : ((fr >> 2) & 1 ? 0.4 : 0.9)) : 0.95
  const x = R(p.x), w = R(p.width), y = R(p.floor), P = COL[p.type] || COL.ice, th = 4 + p.intensity * 2
  c.save(); c.globalAlpha = fade
  if (p.type === 'steam') { c.fillStyle = 'rgba(220,228,236,0.35)'; c.fillRect(x, y - 3, w, 3); c.restore(); return }
  if (p.disc) {   // the hovering disc: a flat crystalline plate + its supplied art, HP notches
    const top = y, im = image(ENOCH_FX_PATH('disc_10')), hp = p.disc.hp / 80
    c.fillStyle = P[2]; c.fillRect(x, top, w, 6); c.fillStyle = P[0]; c.fillRect(x + 4, top, w - 8, 2); c.fillStyle = P[3]; c.fillRect(x, top + 6, w, 2)
    if (ready(im)) { c.globalAlpha = fade * 0.9; c.imageSmoothingEnabled = false; c.drawImage(im, x + w / 2 - 27, top - 8, 54, 16) }
    c.globalAlpha = 1; c.fillStyle = '#ffffff'; for (let i = 0; i < Math.ceil(hp * 4); i++) c.fillRect(x + 6 + i * 6, top + 10, 4, 2)
    c.restore(); return
  }
  c.fillStyle = P[3]; c.fillRect(x, y - th, w, th)
  c.fillStyle = P[2]; c.fillRect(x + 2, y - th, w - 4, th - 2)
  c.fillStyle = P[1]; c.fillRect(x + 4, y - th, w - 8, 2)
  if (p.type === 'ice') { c.fillStyle = P[0]; for (let i = 0; i < w - 12; i += 22) c.fillRect(x + 6 + i, y - th, 8, 1) }
  if (p.type === 'fire') {   // flame tongues: heights from the deterministic hash
    for (let i = 0, k = 0; i < w - 6; i += 12, k++) { const h = 6 + R(flick(f, fr >> 2, p.id * 31 + k) * (8 + p.intensity * 4)); c.fillStyle = P[(k & 1) ? 2 : 1]; c.fillRect(x + 3 + i, y - th - h, 6, h); c.fillStyle = P[0]; c.fillRect(x + 5 + i, y - th - (h >> 1), 2, h >> 1) }
  }
  if (p.type === 'water') { c.fillStyle = P[0]; const o = calm() ? 0 : (fr >> 3) % 16; for (let i = o; i < w - 8; i += 16) c.fillRect(x + i, y - th + 1, 6, 1) }
  c.restore()
}
function drawSteam(c, f, s, fr) {   // clouds over the stage (capped alpha; the HUD is drawn later, so it is never hidden)
  for (const p of s.field.patches) {
    if (p.type !== 'steam') continue
    const life = p.life - (s.tick - p.bornFrame), a = Math.min(STEAM_MAX_ALPHA, 0.25 + 0.1 * p.intensity) * Math.min(1, life / 30)
    c.save()
    for (let k = 0; k < 6; k++) {
      const u = flick(f, fr >> 3, p.id * 7 + k), cx = p.x + (k + 0.5) / 6 * p.width, h = 70 + R(u * 60), w = Math.max(30, p.width / 4)
      c.globalAlpha = a * (0.6 + 0.4 * u); c.fillStyle = COL.steam[k & 1]
      c.fillRect(R(cx - w / 2), R(p.floor - h - (calm() ? 0 : (fr % 60) * 0.3)), R(w), R(h))
    }
    c.restore()
  }
}
function drawEvents(c, f, s) {
  for (const e of s.fx) {
    const k = e.t / 40, al = Math.max(0, 1 - k), el = e.el || 'ice'
    if (e.kind === 'burst') { part(c, 'burst', 'water', e.x - 24, e.y, { alpha: al }); part(c, 'burst2', 'fire', e.x + 24, e.y, { alpha: al, flip: -1 }); c.save(); c.globalAlpha = al * 0.7; c.fillStyle = '#ffffff'; c.fillRect(R(e.x - (e.w || 80) / 2), e.y - 3, R(e.w || 80), 3); c.restore() }
    else if (e.kind === 'steamPuff' || e.kind === 'steamBlast') { c.save(); c.globalAlpha = al * 0.6; c.fillStyle = '#e6ecf2'; const r = 20 + e.t * (e.kind === 'steamBlast' ? 3 : 1.5); c.fillRect(R(e.x - r), R(e.y - r * 1.2), R(r * 2), R(r * 1.2)); c.restore() }
    else if (e.kind === 'frost' || e.kind === 'chip') part(c, 'spray', 'ice', e.x, e.y, { alpha: al, flip: e.dir })
    else if (e.kind === 'ember' || e.kind === 'scorch') part(c, 'arc', 'fire', e.x, e.y + 20, { alpha: al, flip: e.dir })
    else if (e.kind === 'splash') part(c, 'splash', 'water', e.x, e.y, { alpha: al })
    else if (e.kind === 'shatter') part(c, 'burst2', 'ice', e.x, e.y, { alpha: al })
    else if (e.kind === 'switch' || e.kind === 'ramp' || e.kind === 'landBurst') part(c, e.kind === 'ramp' ? 'arc' : 'spray', el, e.x, e.y, { alpha: al, flip: e.dir })
    else if (e.kind === 'overload') { c.save(); c.globalAlpha = al; c.strokeStyle = e.dir < 0 ? COL.ice[1] : COL.fire[1]; c.lineWidth = 3; const r = 20 + e.t * 2; c.strokeRect(R(e.x - r), R(e.y - r / 2), R(r * 2), R(r)); c.restore() }
  }
}
// ── WALLS: ICE = Frozone's crystal slab in his ice palette (a crack per stopped shot); FIRE = a flame column of hashed
//    tongues (flicker = ehash, never Math.random) with embers rising. Both blink in their last 40 frames. ──
function poly(c, pts, fill, stroke, al, lw = 2) {
  c.save(); c.globalAlpha = al; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(R(x), R(y)) : c.moveTo(R(x), R(y))); c.closePath()
  if (fill) { c.fillStyle = fill; c.fill() } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke() } c.restore()
}
function drawWall(c, f, s, fr) {
  const w = s.wall; if (!w) return
  const P = WALLS[w.type], Rc = wallRect(w), x0 = Rc.x, x1 = Rc.x + Rc.w, y0 = Rc.y, y1 = w.floor
  const left = P.life - w.t, al = left < 40 && !calm() ? ((w.t >> 2) & 1 ? 0.5 : 0.92) : 0.92
  if (w.type === 'ice') {
    poly(c, [[x0 - 6, y1], [x0, y0 + 18], [w.x - 4, y0], [x1 + 2, y0 + 10], [x1 + 6, y1]], COL.ice[1], COL.ice[3], al, 3)
    poly(c, [[x0 + 4, y1 - 4], [x0 + 6, y0 + 26], [w.x, y0 + 12], [w.x + 2, y1 - 4]], COL.ice[0], null, al * 0.55)
    c.save(); c.globalAlpha = al; c.strokeStyle = COL.ice[2]; c.lineWidth = 2
    c.beginPath(); c.moveTo(R(w.x - 2), R(y0 + 8)); c.lineTo(R(w.x - 6), R(y1 - 6)); c.stroke()
    for (let i = 0; i < P.hp - w.hp; i++) { c.beginPath(); c.moveTo(R(x0 + 4), R(y0 + 30 + i * 28)); c.lineTo(R(x1 - 2), R(y0 + 44 + i * 30)); c.stroke() }
    c.restore()
    return
  }
  const n = 5, cw = (x1 - x0) / n
  for (let i = 0; i < n; i++) {   // tongues: outer orange → inner yellow → white core, heights hashed per 3 frames
    const k = flick(f, (fr / 3) | 0, 40 + i), hh = Rc.h * (0.7 + 0.3 * k), cx = x0 + cw * (i + 0.5)
    poly(c, [[cx - cw * 0.9, y1], [cx, y1 - hh], [cx + cw * 0.9, y1]], COL.fire[2], null, al * 0.9)
    poly(c, [[cx - cw * 0.55, y1], [cx + (k - 0.5) * 6, y1 - hh * 0.72], [cx + cw * 0.55, y1]], COL.fire[1], null, al * 0.95)
    poly(c, [[cx - cw * 0.25, y1], [cx, y1 - hh * 0.4], [cx + cw * 0.25, y1]], COL.fire[0], null, al)
  }
  if (!calm()) for (let i = 0; i < 4; i++) {   // embers rising out of the top
    const k = flick(f, fr, 60 + i), up = ((fr * 2 + i * 31) % 60)
    c.save(); c.globalAlpha = al * (1 - up / 60); c.fillStyle = i & 1 ? COL.fire[1] : COL.fire[0]
    c.fillRect(R(x0 + k * (x1 - x0)), R(y0 + 10 - up), 3, 3); c.restore()
  }
  if (w.t < P.rise + 6) part(c, 'arc', 'fire', w.x, y1, { alpha: al, flip: w.dir })
}
function drawBeams(c, f, s) {
  const b = s.beamFx; if (!b) return
  drawBeam3(c, b, { glow: 'rgba(255,154,60,0.5)', mid: 'rgba(255,210,122,0.9)', core: 'rgba(255,241,192,0.98)', dot: COL.lensHot, impact: 'rgba(255,210,122,0.75)', width: s.beam ? 0.8 : 1 })
}
function drawLens(c, f, s) {   // the lens brightens to #fff1c0 while the laser fires (render-only)
  if (!s.beamFx && !(s.ult?.variant === 'flashPoint')) return
  const o = lensOrigin(f); c.save(); c.fillStyle = COL.lensHot; c.fillRect(R(o.x - 3), R(o.y - 2), 6, 4); c.restore()
}
function drawUlt(c, f, v) {
  if (!v) return
  const fr = v.frame
  if (v.variant === 'flashPoint' && fr >= 20 && fr < 160) {
    const o = lensOrigin(f); drawBeam3(c, { ox: R(o.x), oy: R(o.y), tx: R(v.tx), ty: R(v.ty), hit: true, tick: fr }, { glow: 'rgba(255,154,60,0.6)', mid: 'rgba(255,210,122,0.95)', core: 'rgba(255,241,192,1)', dot: COL.lensHot, width: fr >= 150 ? 2.2 : 1.3 })
  }
  if (v.variant === 'absoluteZero') { c.save(); c.globalAlpha = Math.min(1, fr / 20) * 0.85; c.fillStyle = COL.ice[2]; const h = Math.min(v.tH + 16, fr * 3); c.fillRect(R(v.tx - v.tW / 2 - 10), R(v.feet - h), R(v.tW + 20), R(h)); c.fillStyle = COL.ice[0]; c.fillRect(R(v.tx - v.tW / 2 - 10), R(v.feet - h), R(v.tW + 20), 3); c.restore() }
  if (v.variant === 'thermalShock') { const sp = fr % 40 < 20; c.save(); c.globalAlpha = 0.8; c.fillStyle = sp ? COL.ice[1] : COL.fire[2]; c.fillRect(R(v.tx - 60), R(v.feet - 4), 120, 4); c.fillStyle = sp ? COL.fire[2] : COL.ice[1]; c.fillRect(R(v.tx - 4), R(v.feet - v.tH - 20), 8, v.tH + 16); c.restore() }
}
export function drawEnochUnder(c, p1, p2, W) {
  const fr = W?.frame?.() ?? 0; SEED = (W?.seed?.() | 0) || 1337
  for (const f of [p1, p2]) { const s = isEn(f) ? f._enoch : null; if (!s) continue; for (const p of s.field.patches) drawPatch(c, f, p, fr, s.tick) }   // patch ages run on his own tick (the sim's patch clock)
}
export function drawEnochOver(c, p1, p2, W) {
  const fr = W?.frame?.() ?? 0
  for (const f of [p1, p2]) {
    const s = isEn(f) ? f._enoch : null; if (!s) continue
    drawWall(c, f, s, fr); drawEvents(c, f, s); drawBeams(c, f, s); drawLens(c, f, s); drawUlt(c, f, enochUltView(f)); drawSteam(c, f, s, fr)
  }
}
// ── HUD: the thermal bar (deep blue → teal → orange, marker, outlined balance zone) under his health bar ──
export function enochHudLabel(f) {
  const s = f?._enoch; if (!s) return null
  const v = s.th.v, zone = s.th.over > 0 ? 'OVERLOAD' : Math.abs(v) <= TP.balance ? 'BALANCE · WATER' : v <= TP.cold ? 'COLD ZONE' : v >= TP.hot ? 'HOT ZONE' : v < 0 ? 'COOL' : 'WARM'
  return { v, zone, lock: s.th.lock, over: s.th.over, glide: s.glide?.type || null, patches: s.field.patches.length, disc: s.disc ? s.disc.hp : 0,
    cd: { ...s.cd }, meter: f.energy || 0, laser: laserView(s.laser, LASER), wall: s.wall ? { type: s.wall.type, left: WALLS[s.wall.type].life - s.wall.t, hp: s.wall.hp } : null }
}
export function drawEnochHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (!isEn(f) || !f._enoch) return
    const L = enochHudLabel(f), w = Math.round(barW * 0.8), x0 = (flip ? cw - pad - barW - 20 + (barW - w) : pad) + 8, y0 = 94, h = 9
    c.save()
    const g = c.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, '#16307a'); g.addColorStop(0.5, '#2fa3a0'); g.addColorStop(1, '#ff9a3c')
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(x0 - 2, y0 - 2, w + 4, h + 4)
    c.fillStyle = g; c.fillRect(x0, y0, w, h)
    const bx = x => x0 + R((x + 100) / 200 * w)
    c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.strokeRect(bx(-TP.balance) + 0.5, y0 - 1.5, bx(TP.balance) - bx(-TP.balance), h + 3)   // the balance zone
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(bx(TP.cold), y0, 1, h); c.fillRect(bx(TP.hot), y0, 1, h)
    const mx = bx(L.v); c.fillStyle = L.over > 0 && !calm() && ((L.over >> 2) & 1) ? '#ff3030' : '#ffffff'; c.fillRect(mx - 2, y0 - 4, 4, h + 8)
    c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? x0 + w : x0
    c.fillStyle = L.over > 0 ? '#ff6050' : L.zone.startsWith('BALANCE') ? COL.water[1] : L.v < 0 ? COL.ice[1] : COL.fire[1]
    c.fillText(`${L.zone}${L.lock > 0 ? ' · LOCKED' : ''}${L.glide ? ' · ' + L.glide.toUpperCase() + ' GLIDE' : ''}`, tx, y0 + h + 4)
    c.fillStyle = 'rgba(255,255,255,0.7)'
    c.fillText(`FREEZE ${L.cd.deepFreeze > 0 ? Math.ceil(L.cd.deepFreeze / 60) + 's' : 'READY'} · TIDE ${L.cd.tideBreak > 0 ? Math.ceil(L.cd.tideBreak / 60) + 's' : 'READY'} · GUARD GLIDE ${L.cd.guard > 0 ? Math.ceil(L.cd.guard / 60) + 's' : 'READY'}`, tx, y0 + h + 15)
    c.restore()
    // the HEAT LENS laser gauge: Superman's laser bar (beam.js drawLaserGauge), just under the thermal readout
    drawLaserGauge(c, L.laser, x0, y0 + h + 40, w, { flip, label: 'HEAT LENS', col: '#ff9a3c', low: '#ffd27a' })
    c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'; c.fillStyle = 'rgba(255,255,255,0.7)'
    const wl = t => L.wall?.type === t ? `${Math.ceil(L.wall.left / 60)}s` : L.cd[t + 'Wall'] > 0 ? Math.ceil(L.cd[t + 'Wall'] / 60) + 's' : 'READY'
    c.fillText(`ICE WALL ${wl('ice')} · FIRE WALL ${wl('fire')}`, flip ? x0 + w : x0, y0 + h + 52); c.restore()
  }
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = isEn(f) ? enochUltView(f) : null; if (v && v.frame < 40) drawCutIn(c, cw, ch, f, v) }
}
const SUPER_TITLE = { absoluteZero: ['ABSOLUTE ZERO', 'ICE'], flashPoint: ['FLASH POINT', 'FIRE'], thermalShock: ['THERMAL SHOCK', 'WHERE ICE MEETS FIRE'] }
function drawCutIn(c, cw, ch, f, v) {
  const u = v.frame / 40, al = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1, por = image(EN.portrait)
  const y0 = Math.round(ch * 0.2), bandH = 84, left = (f.facing ?? 1) >= 0, [t1, t2] = SUPER_TITLE[v.variant] || ['SUPER', '']
  const acc = v.variant === 'absoluteZero' ? COL.ice[1] : v.variant === 'flashPoint' ? COL.fire[1] : COL.water[1]
  c.save(); c.globalAlpha = 0.8 * al; c.fillStyle = '#0c0f20'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = al; c.fillStyle = acc; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  if (ready(por)) { c.imageSmoothingEnabled = false; c.drawImage(por, left ? 40 : cw - 40 - por.naturalWidth * 2, y0 + 14, por.naturalWidth * 2, por.naturalHeight * 2) }
  c.textAlign = left ? 'left' : 'right'; c.textBaseline = 'middle'
  c.font = '900 28px Arial'; c.fillStyle = acc; c.fillText(t1, left ? 130 : cw - 130, y0 + 32)
  c.font = 'bold 14px Arial'; c.fillStyle = '#ffffff'; c.fillText(t2, left ? 130 : cw - 130, y0 + 60)
  c.restore()
}
export function drawEnochIntroCard(c, cv, p1, p2) {
  const f = [p1, p2].find(q => isEn(q) && q._introPlaying); if (!f) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, k = f._introRevealFrame || 0
  const al = Math.min(1, Math.max(0, (k - INTRO.arrive + 6) / 10)); if (al <= 0) return
  const por = image(EN.portrait)
  c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 30px Arial'
  const name = EN.introTitle, bw = c.measureText(name).width + 150, bx = cw / 2 - bw / 2, by = ch * 0.72, bh = 66
  c.fillStyle = 'rgba(12,15,32,0.88)'; c.fillRect(bx, by, bw, bh)
  const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, COL.ice[1]); g.addColorStop(1, COL.fire[2]); c.strokeStyle = g; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
  if (ready(por)) { c.imageSmoothingEnabled = false; c.drawImage(por, bx + 8, by + 6, por.naturalWidth * 2, por.naturalHeight * 2) }
  c.fillStyle = '#ffffff'; c.fillText(name, cw / 2 + 26, by + bh * 0.4)
  c.font = 'bold 12px Arial'; c.fillStyle = COL.fire[1]; c.fillText('“' + EN.tagline + '”', cw / 2 + 26, by + bh * 0.78)
  c.restore()
}
// ── AUDIO: sim cues → `enoch_<cue>` on the SFX bus; the sustained laser = Homelander's beam loop pitched ×1.12 ──
const AFTER_DEFEAT_MUTE = /^(cast|swing|ice|fire|water|glide|switch|laser|super|crackle|orb|ramp)/
export const LASER_PITCH = 1.12
export function playEnochCues(f) {
  const s = f?._enoch, q = s?.cues
  if (s && f._hlLaserEl && !s.beam) { try { stopHomelanderLaser(f) } catch (_) {} }
  if (!q?.length) return
  for (const v of q) {
    if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue
    if (v === 'laserOn') { try { startHomelanderLaser(f, { seed: seedOf(), frame: s.tick }); if (f._hlLaserEl) f._hlLaserEl.playbackRate = f._hlLaserEl.playbackRate * LASER_PITCH } catch (_) {} }
    if (v === 'laserOff') { try { stopHomelanderLaser(f) } catch (_) {} }
    if (v === 'burst' || v === 'superFinal') { try { camera.shake(v === 'burst' ? 7 : 14, v === 'burst' ? 10 : 20) } catch (_) {} }
    const key = v === 'glide' && s.glide?.type === 'fire' ? 'glideFast' : v   // the whoosh pitch rises with speed (fire glide = 2.3×)
    try { sound.play('enoch_' + key) } catch (_) {}
  }
  q.length = 0
  if (s.field.patches.some(p => p.type === 'fire') && s.tick % 45 === 0 && f.health > 0) { try { sound.play('enoch_fireCrackle') } catch (_) {} }   // the quiet fire loop
}
