// SYNDROME (syndrome) — RENDER-ONLY: composite Omnidroid, machines, HUD, intro, victory staging, ultimate presentation
// and audio cues. Reads sim state (f._syndrome, the ultimate view, the owner's projectiles), never writes it.
// Every sprite is a supplied sheet cell (tools/syndrome/extract.py strips). Code-drawn pieces are limited to warning
// markers, the thin Zero-Point tether, HUD pips and text.
// LAYERS (docs/syndrome/OMNIDROID_ASSEMBLY.md): drawSyndromeUnder (world, BEFORE the fighters): Omnidroid shell + eye +
// rear limbs + turret + ground markers. drawSyndromeOver (world, AFTER the fighters): attacking limb / claw, Drones,
// Spinner, Velocipod, shots, explosions — so a claw passes in front of the opponent while the body stays behind.
// Bounded: images cached once per URL, no per-frame canvases / pixel reads / decoding, no Math.random. Every
// skin swaps whole precomputed strips (Syndrome AND every machine) — assets/syndrome/skins/<tag>/.
import { sound } from './sound.js'
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'
import { syndrome as SY, SYNDROME_MOVES as MV, MACHINE_SCALE as K, DUET, SPIN, VELO, TURRET, HAMMER, RISE, SWEEP, ULT } from './syndromeData.js'
import { SYNDROME_PARTS as PA } from './syndromeSprites.js'
import { syndromeUltView } from './syndromeState.js'
import { SYNDROME_FX_COLORS } from './syndromeSkins.js'
import { registerCineScreen } from './cineRegistry.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const syndromeFxCacheSize = () => cache.size
export const syndromeFxCacheKeys = () => [...cache.keys()]   // harness: which part art has been requested
const isSy = f => f?.rosterKey === 'syndrome'
const tagOf = f => (f?._recolorTag && SYNDROME_FX_COLORS[f._recolorTag]) ? f._recolorTag : null
const colsOf = f => SYNDROME_FX_COLORS[tagOf(f)] || SYNDROME_FX_COLORS.default
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const elapsed = a => a.total - a.timer
const cl = (v, a, b) => Math.max(a, Math.min(b, v))
// every machine strip resolves through the owner's skin (whole-arsenal recolour)
const partUrl = (f, name) => { const t = tagOf(f); return t ? `./assets/syndrome/skins/${t}/machines/${name}.png` : PA[name].sheet }
export const syndromePartUrl = partUrl

// Draw one cell of part `name` with its anchor at (x, y). flipX mirrors (facing), flipY mirrors vertically (missile
// falling / rising claw shaft are NOT used: only explicit mirror transforms, never stretching).
function part(c, f, name, i, x, y, { flip = 1, flipY = 1, alpha = 1, scale = K, clipBottom = null } = {}) {
  const A = PA[name]; if (!A) return
  const im = image(partUrl(f, name)); if (!ready(im) || alpha <= 0.01) return
  const fr = ((i % A.frames) + A.frames) % A.frames
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha
  if (clipBottom != null) { c.beginPath(); c.rect(-1e5, -1e5, 2e5, clipBottom + 1e5); c.clip() }
  c.translate(Math.round(x), Math.round(y)); c.scale(flip, flipY)
  c.drawImage(im, fr * A.width, 0, A.width, A.height, -A.originX * scale, -A.originY * scale, A.width * scale, A.height * scale)
  c.restore()
}
// tip of a limb frame relative to its attachment, in world px (faced RIGHT; multiply x by facing)
const tipOf = (name, i) => { const A = PA[name], t = A.tips[((i % A.frames) + A.frames) % A.frames]; return t ? [(t[0] - A.originX) * K, (t[1] - A.originY) * K] : [0, 0] }
function marker(c, x, y, w, col, t) {
  const al = calm() ? 0.6 : 0.45 + 0.35 * ((t >> 2) % 2)
  c.save(); c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = 3
  c.beginPath(); c.ellipse(Math.round(x), Math.round(y) - 2, w / 2, Math.max(5, w * 0.1), 0, 0, Math.PI * 2); c.stroke()
  c.beginPath(); c.moveTo(x - w / 2, y - 2); c.lineTo(x + w / 2, y - 2); c.stroke(); c.restore()
}
function reticle(c, x, y, r, col, t) {
  c.save(); c.globalAlpha = calm() ? 0.7 : 0.5 + 0.4 * ((t >> 2) % 2); c.strokeStyle = col; c.lineWidth = 2
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke()
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(x + a * r * 0.6, y + b * r * 0.6); c.lineTo(x + a * r * 1.3, y + b * r * 1.3); c.stroke() }
  c.restore()
}

// ── THE COMPOSITE OMNIDROID ─────────────────────────────────────────────────────────────────────────────────────
// Shell-local coordinates (1x component px): upper dome at (0,0) 255×126 (flat equator at y=126), lower hemisphere at
// (0,126) 256×126. The two halves are the same side view (equator widths 255 / 256 measured) → joined at the equator.
// Eye visor centre at (128 + 70·dir, 112); front limb socket at (128 + 92·dir, 176); rear limb socket at
// (128 − 70·dir, 182); leg sockets under the shell at (128 ± 48, 240). docs/syndrome/OMNIDROID_ASSEMBLY.md.
export const OMNI = { W: 256, H: 252, eye: [70, 112], front: [92, 176], rear: [-70, 182], legs: [[-48, 240], [48, 240]] }
// Shell placement so that the FRONT socket lands at world (ax, ay): returns the shell's world top-left.
const shellAt = (ax, ay, dir) => [ax - (128 + OMNI.front[0] * dir) * K, ay - OMNI.front[1] * K]
function drawShell(c, f, x0, y0, dir, eyeName = 'eyeTrack', eyeI = 0, alpha = 1) {
  const fl = dir, cx = x0 + 128 * K
  part(c, f, 'shellUpper', 0, cx - (fl === 1 ? 128 : 127) * K * fl, y0, { flip: fl, scale: K, alpha })
  part(c, f, 'shellLower', 0, cx - 128 * K * fl, y0 + 126 * K, { flip: fl, scale: K, alpha })
  if (eyeName) part(c, f, eyeName, eyeI, cx + OMNI.eye[0] * K * dir, y0 + OMNI.eye[1] * K, { flip: fl, alpha })
}
// A full limb assembly: shell + one diagonal limb whose TIP lands at (tx, ty). `slide` lifts everything (enter/exit).
function omniStrike(c, f, dir, tx, ty, limbI, { slide = 0, eye = 'eyeTrack', eyeI = 0, under = true, over = true, name = 'limbDiag' } = {}) {
  const [dx, dy] = tipOf(name, limbI), ax = tx - dx * dir, ay = ty - dy - slide
  if (under) { const [sx, sy] = shellAt(ax, ay, dir); drawShell(c, f, sx, sy, dir, eye, eyeI) }
  if (over) part(c, f, name, limbI, ax, ay, { flip: dir })
}
// vertical claw rising from the floor at x: shaft tiles cut from the supplied `leg` frame 1 below the claw (pixels
// reused, never stretched), drawn only above the floor line.
function risingClaw(c, f, x, floor, h, i, charge = false) {
  const nm = charge ? 'clawCharge' : 'claw', A = PA[nm], top = floor - h
  const L = PA.leg, im = image(partUrl(f, 'leg'))
  if (ready(im)) {
    c.save(); c.imageSmoothingEnabled = false; c.beginPath(); c.rect(x - 40, top, 80, Math.max(0, h)); c.clip()
    const sx = 1 * L.width + L.originX - 11, seg = 40
    for (let y = top + A.height * K - 10; y < floor; y += seg * K) c.drawImage(im, sx, 12, 22, seg, Math.round(x - 11 * K), Math.round(y), 22 * K, seg * K)
    c.restore()
  }
  part(c, f, nm, i, x, top, { clipBottom: floor })
}

// ── normal commands: the machine visual follows the move's own elapsed time (pooled; no entity) ──
function drawNormal(c, f, layer) {
  const a = f.attacking ? f.currentAttack : null, m = a?.sy; if (!m) return
  const md = MV[m.key]; if (!md?.machine) return
  const t = elapsed(a), d = m.dir, front = d === 1 ? f.x + f.w : f.x, feet = f.y + f.h, st = md.startup, act = md.active
  const u = cl(t / Math.max(1, st), 0, 1), back = t > st + act ? cl((t - st - act) / Math.max(1, md.recovery), 0, 1) : 0
  const bx = md.box ? front + d * (md.box[0] + md.box[1]) / 2 : front
  switch (md.machine) {
    case 'spinSnap': case 'spinPass': {
      if (layer !== 'over') return
      const x = front + d * ((md.box[0] + md.box[1]) / 2) * (u - back * 0.8), y = feet - (md.box[2] + md.box[3]) / 2 + 28
      const nm = md.machine === 'spinPass' ? 'spBlur' : 'spSpin'
      part(c, f, t < 3 ? 'spOpen' : back > 0.6 ? 'spClose' : nm, t < 3 ? 10 + t : back > 0.6 ? Math.floor(back * 10) : t >> 1, x, y, { flip: d })
      break
    }
    case 'spinLow': { if (layer !== 'over') return; const x = front + d * 50 * (u - back * 0.7); part(c, f, 'spTilt', (t >> 2), x, feet, { flip: d }); break }
    case 'droneCross': case 'droneAir': {
      if (layer !== 'over') return
      const air = md.machine === 'droneAir', p = cl((t + 2) / (st + act + 4), 0, 1)
      const x = air ? front + d * (40 + 30 * p) : front + d * (-60 + 170 * p), y = air ? f.y + 40 - 10 * Math.sin(p * Math.PI) : feet - 120 + 50 * p
      const nm = t >= st && t < st + act + 3 ? (air ? 'droneFireLevel' : 'droneFire') : 'droneBank'
      part(c, f, nm, nm === 'droneBank' ? t >> 1 : (t - st) >> 1, x, y, { flip: d, alpha: back > 0.7 ? (1 - back) / 0.3 : 1 })
      break
    }
    case 'clawDrive': {
      // shell slides in from above, limb reaches (frames 0–1), drives in at the active frame (2–5), retracts (6–8)
      const slide = t < st ? (1 - u) * 260 : back * 300
      const i = t < st - 4 ? 0 : t < st ? 1 : t < st + act ? 2 + ((t - st) >> 1) : back < 0.5 ? 5 + Math.floor(back * 4) : 7
      omniStrike(c, f, d, bx, feet, i, { slide, under: layer === 'under', over: layer === 'over' })
      break
    }
    case 'clawRise': {
      if (layer !== 'over') return
      const h = t < st ? 40 * u : t < st + act ? 40 + 110 * cl((t - st + 1) / act, 0, 1) : 150 * (1 - back)
      risingClaw(c, f, front + d * 50, feet, h, t < st ? 0 : Math.min(9, 2 + ((t - st) >> 1)))
      break
    }
    case 'legDrop': {
      if (layer !== 'over') return
      const k = cl((t - st) / Math.max(1, act - 1), 0, 1), tipY = t < st ? feet - 150 - (1 - u) * 160 : feet - 150 + 190 * k
      const i = t < st + act - 2 ? (t >> 2) % 2 : 2 + Math.min(3, (t - st - act + 2) >> 1)
      const [dx, dy] = tipOf('legSlam', i)
      part(c, f, 'legSlam', i, front + d * 42 - dx * d, tipY - dy, { flip: d, alpha: back > 0.6 ? (1 - back) / 0.4 : 1 })
      break
    }
  }
}
// grab: a claw-tipped leg (supplied `leg` frame 0) holds the grabbed opponent, then lifts away with the throw
function drawGrab(c, f, opp) {
  if (!opp?.isGrabbed || !((opp.grabTimer || 0) > 0)) return
  const lift = (28 - (opp.grabTimer || 0)) * 3, [dx, dy] = tipOf('leg', 0)
  part(c, f, 'leg', 0, ctrX(opp) - dx * (f.facing || 1), opp.y + 26 - dy - lift * 0.2, { flip: f.facing || 1 })
}

// ── operations ──
function drawMobile(c, f, s, layer) {
  const m = s.mobile; if (!m || layer !== 'over') return
  if (m.kind === 'duet') {
    m.dr.forEach((dr, i) => {
      const nm = dr.fire > 0 ? (i ? 'droneFireLevel' : 'droneFire') : Math.abs(dr.vx) > 4 ? 'droneBank' : i ? 'droneHoverLow' : 'droneHover'
      const fr = dr.fire > 0 ? (dr.fire > 4 ? 1 : 0) : (s.clock >> 2) + i * 3
      part(c, f, nm, fr, dr.x, dr.y, { flip: dr.face, alpha: m.t > m.life - DUET.fade ? (m.life - m.t) / DUET.fade : 1 })
    })
    if (m.conv && m.cross && m.t - m.cross.from < 30) label(c, m.cross.tx, m.cross.ty - 70 - (m.t - m.cross.from), 'CONVERGENCE', colsOf(f).hud[1], 1 - (m.t - m.cross.from) / 30)
  } else if (m.kind === 'velo') {
    const t = m.t - VELO.warn
    if (t < 0) { reticle(c, m.tx, m.ty, 26, colsOf(f).hud[0], m.t); return }
    const nm = t <= VELO.pass * 0.5 ? 'vpSide2' : t <= VELO.pass ? 'vpBank' : 'vpSide'
    part(c, f, nm, t >> 2, m.x, m.y, { flip: m.d })
  }
}
function drawSpin(c, f, s, layer) {
  const z = s.spin; if (!z || layer !== 'over') return
  const t = z.t - SPIN.open, end = SPIN.out + SPIN.hold + SPIN.back
  const nm = t < 0 ? 'spOpen' : t > end ? 'spClose' : t < 6 || (t > SPIN.out && t < SPIN.out + SPIN.hold) ? 'spSpin' : 'spBlur'
  const fr = t < 0 ? z.t + 4 : t > end ? (t - end) * 2 : z.t >> 1
  part(c, f, nm, fr, z.x, z.y + SPIN.h / 2, { flip: z.d })
}
const EMERGE = { gun: ['gunEmerge', 'gunOpen'], missile: ['gunEmerge', 'msOpen'], mortar: ['gunEmerge', 'mortarOpen'] }
function drawTurret(c, f, s, layer) {
  const z = s.turret; if (!z) return
  const x = z.x, y = z.floor, d = z.d, F = TURRET[z.fam]
  if (layer === 'under') {
    if (z.phase === 'broken') {
      if (z.broken < 6) part(c, f, 'turretFlash', 0, x, y)
      part(c, f, 'turretBroken', z.broken >> 2, x, y, { flip: d })
      return
    }
    const [e0, e1] = EMERGE[z.fam]
    if (z.phase === 'emerge') { const k = z.t; if (k < 15) part(c, f, e0, Math.floor(k * 10 / 15), x, y, { flip: d }); else part(c, f, e1, Math.min(PA[e1].frames - 1, Math.floor((k - 15) * PA[e1].frames / 15)), x, y, { flip: d }); return }
    if (z.phase === 'retract') { const k = Math.min(TURRET.retract - 1, z.ret || 0); part(c, f, e0, Math.max(0, 9 - Math.floor(k * 10 / TURRET.retract)), x, y, { flip: d }); return }
    if (z.fam === 'gun') {
      if (z.aim > 0) part(c, f, 'gunRotate', 10 - z.aim, x, y, { flip: d })
      else if (z.flash > 0) part(c, f, 'gunFire', 6 - z.flash, x, y, { flip: d })
      else part(c, f, 'gunRetract1', s.clock >> 3, x, y, { flip: d })
    } else if (z.fam === 'missile') {
      if (z.flash > 0) part(c, f, 'msLaunch', Math.min(3, 10 - z.flash >> 1), x, y, { flip: d })
      else part(c, f, 'msRaise', Math.min(PA.msRaise.frames - 1, Math.floor((z.t - TURRET.emerge) / 2)), x, y, { flip: d })
    } else {
      if (z.flash > 0) part(c, f, 'mortarFire2', 8 - z.flash >> 1, x, y, { flip: d })
      else part(c, f, 'mortarFire3', 0, x, y, { flip: d })
    }
    for (const q of z.missiles) if (q.t > F.rise) marker(c, q.tx, y, 60, colsOf(f).hud[0], q.t)
  } else {
    for (const q of z.missiles) part(c, f, 'missile', q.t >> 2, q.x, q.y, { flipY: q.t > F.rise ? -1 : 1 })   // falling = vertical mirror of the supplied missile
    if (z.phase !== 'broken' && z.hp < TURRET.hp && (s.clock >> 3) % 2) part(c, f, 'turretSmoke', s.clock >> 3, x, y - 70, { scale: 1, alpha: 0.8 })
  }
}
function drawOmni(c, f, s, layer) {
  const z = s.omni; if (!z) return
  const d = z.d, y = z.floor, t = z.t, hud = colsOf(f).hud[0]
  if (z.kind === 'hammer') {
    const W = HAMMER.warn, i = t < W - 10 ? 0 : t < W ? 1 : t < W + 8 ? 2 + ((t - W) >> 1) : t < W + 30 ? 6 : 7 + ((t - W - 30) >> 4)
    const wind = t < W ? 60 * Math.sin(Math.PI * cl(t / W, 0, 1)) : 0, slide = t < 12 ? (12 - t) * 24 : t > HAMMER.life - 16 ? (t - HAMMER.life + 16) * 24 : 0
    if (layer === 'under' && t < W) marker(c, z.x, y, HAMMER.w, hud, t)
    omniStrike(c, f, d, z.x, y, Math.min(8, i), { slide: slide + wind, eye: t < 16 ? 'eyeOpen' : 'eyeTrack', eyeI: t < 16 ? t >> 2 : t >> 3, under: layer === 'under', over: layer === 'over' })
  } else if (z.kind === 'rise') {
    if (layer === 'under' && t < RISE.warn) marker(c, z.x, y, RISE.w + 20, hud, t)
    if (layer === 'over' && t >= RISE.warn - 4) { const k = t - RISE.warn + 4, h = k < 10 ? k * 19 : RISE.life - t < 16 ? (RISE.life - t) * 12 : 190; risingClaw(c, f, z.x, y, h, k >> 1, true) }
  } else if (z.kind === 'sweep') {
    const tt = t - SWEEP.warn, slide = t < 10 ? (10 - t) * 26 : t > SWEEP.life - 12 ? (t - SWEEP.life + 12) * 26 : 0
    if (layer === 'under' && tt < 0) marker(c, z.sx + d * (SWEEP.from + SWEEP.to) / 2, y, SWEEP.to - SWEEP.from, hud, t)
    omniStrike(c, f, d, z.x, y, tt < 0 ? 0 : 6 + ((tt >> 3) % 2), { slide, under: layer === 'under', over: layer === 'over' })
  }
}
// projectiles the sim owns (shots / shells) — the engine draws them invisible (blank sheet); their art is here
function drawShots(c, f, W) {
  for (const p of (W?.projectiles || [])) {
    const k = p?.owner === f && p._sy; if (!k) continue
    if (k.kind === 'duetShot') part(c, f, 'droneShot', p.lifetime || 0, p.x, p.y, { flip: (k.vx || 1) >= 0 ? 1 : -1 })
    else if (k.kind === 'gun') part(c, f, 'vpShot', (p.lifetime || 0) >> 1, p.x, p.y, { flip: p.vx >= 0 ? 1 : -1 })
    else if (k.kind === 'mortar') { const b = k.b; part(c, f, b && b.roll ? 'shellSpin' : 'shell', (p.lifetime || 0) >> 1, p.x, p.y, { flip: b?.d || 1 }) }
  }
}
function label(c, x, y, text, col, al = 1) {
  if (al <= 0) return
  c.save(); c.globalAlpha = cl(al, 0, 1); c.font = '900 16px Arial'; c.textAlign = 'center'
  c.fillStyle = '#07070d'; c.fillText(text, x + 1, y + 1); c.fillStyle = col; c.fillText(text, x, y); c.restore()
}
function drawEvents(c, f, s) {
  for (const e of s.fx) {
    const t = e.t
    if (e.kind === 'spark') { if (t < 6) part(c, f, t < 3 ? 'omniBallW' : 'puffWhite', 0, e.x, e.y, { scale: 1, alpha: 1 - t / 6 }) }
    else if (e.kind === 'quake') { if (t < 4) part(c, f, 'boomOval', 0, e.x, e.y - 4, { alpha: 1 - t / 4 }); if (t < 22) part(c, f, 'omniPuff', t >> 1, e.x - 50, e.y - 20, { scale: 1 }); if (t < 22) part(c, f, 'omniPuff', t >> 1, e.x + 50, e.y - 20, { scale: 1 }) }
    else if (e.kind === 'boom' || e.kind === 'turretBoom') { if (t < 5) part(c, f, 'boomBall', 0, e.x, e.y - 40, { alpha: 1 - t / 5 }); if (t < 28) part(c, f, 'boomRing', t >> 2, e.x, e.y - 40, { scale: 1 }) }
    else if (e.kind === 'zero') { if (t < 18) part(c, f, 'cyanPuff', t >> 1, e.x, e.y, { scale: 1, alpha: 0.9 }) }
    else if (e.kind === 'converge') label(c, e.x, e.y - t, 'CONVERGENCE', colsOf(f).hud[1], 1 - t / 30)
    else if (e.kind === 'thrust') { if (t < 10) part(c, f, 'puff', 4 + (t >> 1), e.x, e.y + 4, { scale: 1, alpha: 0.85 }) }
    else if (e.kind === 'droneExit') { if (t < 16) part(c, f, 'droneTurn', 1, e.x, e.y - t * 6, { flip: e.dir, alpha: 1 - t / 16 }) }
    else if (e.kind === 'ultBoom') {
      if (t < 6) part(c, f, 'boomBall', 0, e.x, e.y - 50, { scale: 3, alpha: 1 - t / 6 })
      if (t < 32) part(c, f, 'boomRing', t >> 2, e.x, e.y - 50, { scale: 3 })
      if (t < 30) for (let i = 0; i < 6; i++) part(c, f, 'fragment', i, e.x + (i - 2.5) * 24 * (1 + t / 8), e.y - 40 - t * (7 - Math.abs(i - 2.5)) + t * t * 0.3)
    }
  }
}
// Zero-Point hold: a thin cyan tether from the glove (front hand of the command pose) + supplied crystal shards
function drawHold(c, f, s, W) {
  const h = s.hold; if (!h) return
  const t = (W?.fighters?.() || []).find(o => o && (o.side || o.playerNumber) === h.side); if (!t) return
  const d = f.facing || 1, gx = (d === 1 ? f.x + f.w : f.x) + d * 6, gy = f.y + 46, col = colsOf(f).hud[1]
  c.save(); c.globalAlpha = 0.75; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(gx, gy); c.lineTo(ctrX(t), t.y + 40); c.stroke(); c.restore()
  for (let i = 0; i < 3; i++) part(c, f, 'crystal', (s.clock >> 2) + i * 3, ctrX(t) + (i - 1) * 30, t.y + 20 + (i % 2) * 40, { scale: 1, alpha: 0.85 })
}

// ── ULTIMATE presentation — OPERATION KRONOS: FINAL DEMONSTRATION (cinematic rebuild 2026-11-23) ──────────────────
// World pass (drawUltWorld, under + over the fighters): the Omnidroid drops in, stands on its planted legs, leaps and
// slams; the machine orchestra; the Zero-Point field; every impact's sparks / rings / debris / dust. Screen pass
// (drawSyndromeUltScreen, registered with cineRegistry): letterbox, title card, monologue subtitles, call-outs, white /
// inverted impact frames, punch-zoom, speed lines, the finisher stamp. Poses follow the timeline `frame` (held during
// hit-stop); flashes / particles follow `tick` ages from the contact (so they keep moving through the hold).
// Render-only noise = hash(); no Math.random.
const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
const ease = u => { u = cl(u, 0, 1); return u * u * (3 - 2 * u) }
const CK = Object.fromEntries(ULT.contacts.map((c, i) => [c.kind + (c.kind === 'drone' ? i : ''), i]))   // kind → contact index
const ageOf = (v, i) => v.hitT[i] == null ? -1 : v.tick - v.hitT[i]
let XF = null, SCENE = null   // world → screen transform + the live caster (recorded by the world pass for the screen pass)

// one Omnidroid leg: foot planted at feetY (frame 2) with the shaft tiled up to topY (pixels reused, never stretched)
function plantedLeg(c, f, x, topY, feetY, dir) {
  const L = PA.leg, im = image(partUrl(f, 'leg')), top = feetY - 300
  if (ready(im) && topY < top + 40) {
    c.save(); c.imageSmoothingEnabled = false; c.beginPath(); c.rect(x - 40, topY, 80, top + 40 - topY); c.clip()
    const sx = 2 * L.width + L.originX - 11
    for (let y = top; y > topY - 80; y -= 40 * K) c.drawImage(im, sx, 12, 22, 40, Math.round(x - 11 * K), Math.round(y - 40 * K + 24), 22 * K, 40 * K)
    c.restore()
  }
  part(c, f, 'leg', 2, x, top, { flip: dir })
}
// Omnidroid placement per frame: shell top-left, leg mode, the striking limb
function omniPose(v) {
  const k = v.frame, d = v.dir, od = -d, floor = v.feet, tx = v.tx
  const ax = tx + 162 * d, ay = floor - 467                     // front socket while standing (limb frame 2 tip → the lifted captive)
  const sx0 = ax - (128 + OMNI.front[0] * od) * K, sy0 = ay - OMNI.front[1] * K
  let sx = sx0, sy = sy0, legs = 'planted', vis = true
  if (k < 20) vis = false
  else if (k < 46) sy = sy0 - 1500 * (1 - ((k - 20) / 26) ** 2)                     // the drop
  else if (k < 54) sy = sy0 + Math.sin((k - 46) / 8 * Math.PI) * 22                 // landing squash
  else if (k >= 196 && k < 204) sy = sy0 + Math.sin((k - 196) / 8 * Math.PI) * 30    // crouch before the leap
  if (k >= 204 && k < 258) {
    legs = 'tucked'
    const airX = tx - 128 * K, airY = floor - 1050
    if (k < 230) { const u = ease((k - 204) / 16); sx = sx0 + (airX - sx0) * u; sy = sy0 + (airY - sy0) * u - Math.sin(u * Math.PI) * 140 + (k >= 220 ? Math.sin(k) * 2 : 0) }
    else { const tipY = floor - v.lift - v.tH + 8; sx = airX; sy = Math.max(airY, tipY - 792) }   // full weight: the leg drives the captive down
  }
  if (k >= 258) { legs = 'tucked'; sx = tx - 128 * K; sy = floor - v.tH + 8 - 792 - (k - 258) ** 2 * 1.6 }   // lifts away
  return { sx, sy, legs, vis, od, cx: sx + 128 * K }
}
function zeroField(c, f, v, cols) {
  const k = v.frame, t = v.tick, cy = v.tTop + v.tH / 2, x = v.tx
  const al = k < 14 ? k / 14 : k > 136 ? cl((146 - k) / 10, 0, 1) : 1; if (al <= 0) return
  const pulse = 0.75 + 0.25 * Math.sin(t / 4)
  c.save(); c.globalAlpha = al * 0.45 * pulse
  const g = c.createRadialGradient(x, cy, 6, x, cy, 90); g.addColorStop(0, 'rgba(220,250,255,0.9)'); g.addColorStop(0.5, cols[0]); g.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = g; c.beginPath(); c.ellipse(x, cy, 78, 96, 0, 0, Math.PI * 2); c.fill(); c.restore()
  // the tether from the glove: a jittering zero-point arc
  const gx = v.cx + v.dir * 34, gy = v.feet - 92
  for (const [w, a, col] of [[7, 0.25, cols[0]], [2, 0.95, '#ffffff']]) {
    c.save(); c.globalAlpha = al * a; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(gx, gy)
    for (let i = 1; i < 8; i++) { const u = i / 8; c.lineTo(gx + (x - gx) * u + (hash(t >> 1, i) - 0.5) * 14, gy + (cy - gy) * u + (hash(i, t >> 1) - 0.5) * 18) }
    c.lineTo(x, cy); c.stroke(); c.restore()
  }
  for (let i = 0; i < 4; i++) { const a = t / 14 + i * Math.PI / 2; part(c, f, 'crystal', (t >> 2) + i * 2, x + Math.cos(a) * 52, cy + Math.sin(a) * 60, { scale: 1.5, alpha: al * 0.9 }) }
  if (k < 18) part(c, f, 'cyanPuff', k >> 1, x, cy, { scale: 2, alpha: 0.9 })
}
function sparks(c, x, y, age, n, len, col, seed) {
  if (age < 0 || age > 14) return
  const u = age / 14
  c.save(); c.globalAlpha = 1 - u; c.strokeStyle = col; c.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i) * Math.PI * 2, r0 = len * (0.15 + u * 0.9), r1 = r0 + len * (0.5 + hash(i, seed) * 0.6) * (1 - u * 0.7)
    c.lineWidth = Math.max(1, 4 * (1 - u)); c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke()
  }
  c.restore()
}
function ring(c, x, y, age, life, r0, r1, col, flat = 0.28, w = 6) {
  if (age < 0 || age > life) return
  const u = age / life, r = r0 + (r1 - r0) * (1 - (1 - u) ** 2)
  c.save(); c.globalAlpha = (1 - u) * 0.9; c.strokeStyle = col; c.lineWidth = Math.max(1, w * (1 - u)); c.beginPath(); c.ellipse(x, y, r, r * flat, 0, 0, Math.PI * 2); c.stroke(); c.restore()
}
function flashBall(c, x, y, age, life, r, col = '#ffffff') {
  if (age < 0 || age > life) return
  const u = age / life
  c.save(); c.globalAlpha = 1 - u; const g = c.createRadialGradient(x, y, 0, x, y, r * (0.6 + u * 0.6)); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * (0.6 + u * 0.6), 0, Math.PI * 2); c.fill(); c.restore()
}
function debris(c, f, x, floor, age, n, power, seed) {
  if (age < 0 || age > 50) return
  for (let i = 0; i < n; i++) {
    const vx = (hash(seed, i) - 0.5) * 22 * power, vy = -(8 + hash(i, seed) * 14) * power, t = age
    const px = x + vx * t, py = floor - 6 + vy * t + 0.55 * t * t
    if (py > floor + 4) continue
    if (i % 3) part(c, f, 'fragment', i + (t >> 2), px, py, { scale: 2 + (i % 2) })
    else { c.save(); c.fillStyle = i % 2 ? '#3b3440' : '#6d6470'; c.translate(px, py); c.rotate(t * 0.3 + i); const z = 5 + hash(i, 3) * 8 * power; c.fillRect(-z / 2, -z / 2, z, z * 0.7); c.restore() }
  }
}
function dust(c, f, x, floor, age, spread, seed) {
  if (age < 0 || age > 44) return
  for (let i = 0; i < 6; i++) { const s = i < 3 ? -1 : 1, off = (0.3 + (i % 3) * 0.35) * spread * (0.5 + Math.min(1, age / 16) * 0.5)
    part(c, f, 'omniPuff', Math.min(10, age >> 2), x + s * off, floor - 18 - (i % 3) * 10 - age * 0.6, { scale: 2 + (i % 3) * 0.5, alpha: 0.85 * (1 - age / 44) }) }
}
function fissures(c, x, floor, al, reach, col, seed) {
  if (al <= 0) return
  c.save(); c.globalAlpha = al; c.strokeStyle = col; c.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const s = i % 2 ? 1 : -1, len = reach * (0.45 + hash(seed, i) * 0.55)
    c.lineWidth = 3 + hash(i, seed) * 3; c.beginPath(); c.moveTo(x, floor)
    for (let j = 1; j <= 4; j++) c.lineTo(x + s * len * j / 4, floor + (hash(i, j + seed) - 0.5) * 10 + (i % 3) * 2)
    c.stroke()
  }
  c.restore()
}
function drawUltWorld(c, f, v, layer) {
  const k = v.frame, t = v.tick, d = v.dir, floor = v.feet, tx = v.tx, cols = colsOf(f).hud, P = omniPose(v), cy = v.tTop + v.tH / 2
  const calmFx = calm()
  if (layer === 'under') {
    try { XF = c.getTransform() } catch (_) { XF = null }
    SCENE = { f }
    // the finisher's darkness (behind the fighters, so they stay lit)
    const dk = k >= 200 && k < 236 ? 0.55 * ease((k - 200) / 24) : k >= 236 && k < 262 ? 0.55 * (1 - (k - 236) / 26) * (ageOf(v, 7) > 4 ? 1 : 0) : 0
    if (dk > 0) { c.save(); c.globalAlpha = dk; c.fillStyle = '#05040c'; c.fillRect(-6000, -6000, 16000, 12000); c.restore() }
    // the incoming shadow, then the planted footprint
    if (k >= 8 && k < 204) { const u = k < 46 ? cl((k - 8) / 38, 0, 1) : 1; c.save(); c.globalAlpha = 0.45 * u; c.fillStyle = '#000'; c.beginPath(); c.ellipse(P.cx, floor + 2, 60 + 170 * u, 10 + 16 * u, 0, 0, Math.PI * 2); c.fill(); c.restore() }
    if (P.vis) {
      for (const [lx] of OMNI.legs) {
        const lxw = P.sx + (128 + lx) * K, top = P.sy + 236 * K
        if (P.legs === 'planted' && k >= 46) plantedLeg(c, f, lxw, top, floor + 6, P.od)
        else part(c, f, 'leg', 0, lxw, top + Math.sin((t + lx) / 6) * 4, { flip: P.od })
      }
      const eye = k < 54 ? 'eyeOpen' : k >= 208 && k < 258 ? 'eyeFire' : 'eyeTrack', eyeI = k < 54 ? Math.min(4, Math.max(0, (k - 40) >> 2)) : eye === 'eyeFire' ? t >> 1 : k >> 3
      drawShell(c, f, P.sx, P.sy, P.od, eye, eyeI)
      // the eye charge: a red glow that swells through the slow-motion
      if (k >= 204 && k < 240) {
        const ex = P.cx + OMNI.eye[0] * K * P.od, ey = P.sy + OMNI.eye[1] * K, u = cl((k - 204) / 30, 0, 1)
        flashBall(c, ex, ey, 0, 1, 30 + 110 * u * (0.85 + 0.15 * Math.sin(t / 2)), 'rgba(255,40,40,0.8)')
        if (k >= 212 && k < 234 && (t >> 1) % 3) { c.save(); c.globalAlpha = 0.7; c.strokeStyle = '#ff3030'; c.lineWidth = 2; c.setLineDash([10, 6]); c.beginPath(); c.moveTo(ex, ey); c.lineTo(tx, cy); c.stroke(); c.restore()
          reticle(c, tx, cy, 34 - 10 * u, '#ff3030', t) }
      }
      // B: the landing turret beside Syndrome
      const tu = k - 104, gx = v.cx - d * 70
      if (tu >= 0 && tu < 24) part(c, f, tu < 6 ? 'gunEmerge' : tu < 10 || tu > 16 ? 'gunOpen' : 'gunFire', tu < 6 ? Math.min(9, tu * 2) : tu < 10 ? 7 : tu > 16 ? 7 : (t >> 1), gx, floor, { flip: d })
    }
    // C: the ground cracks open under the captive
    if (k >= 128 && k < 150) fissures(c, tx, floor, (k < 142 ? (k - 128) / 14 : 1) * (0.6 + 0.4 * ((t >> 1) % 2)), 40 + (k - 128) * 7, cols[0], 11)
    // D/E: the crater glow
    const sa = ageOf(v, CK.slam)
    if (sa >= 0) fissures(c, tx, floor, cl(1 - (sa - 30) / 50, 0, 1), 380, sa < 10 ? '#ffffff' : cols[0], 29)
    return
  }
  // ── over the fighters ──
  zeroField(c, f, v, cols)
  // A: landing shock
  if (k >= 46) { dust(c, f, P.cx, floor, k - 46, 300, 5); ring(c, P.cx, floor, k - 46, 22, 40, 520, '#ffffff', 0.18, 10); debris(c, f, P.cx, floor, k - 46, 10, 0.9, 7) }
  // B: the machine orchestra — every machine aims AT the captive; the contact ticks drive the impact effects
  if (k >= 54 && k < 66) { const u = (k - 54) / 10; part(c, f, k < 60 ? 'droneBank' : 'droneFire', k >> 1, tx - d * (320 - 230 * u), cy - 150 + 80 * u, { flip: d }) }
  if (k >= 64 && k < 76) { const u = (k - 64) / 10; part(c, f, k < 70 ? 'droneBank' : 'droneFireLevel', k >> 1, tx + d * (300 - 220 * u), cy - 40 - 60 * u, { flip: -d }) }
  for (const [i, sx, sy] of [[0, tx - d * 90, cy - 70], [1, tx + d * 80, cy - 100]]) { const a = ageOf(v, i)
    if (a >= 0 && a < 5) for (let j = 0; j < 3; j++) { c.save(); c.globalAlpha = 1 - a / 5; c.strokeStyle = j ? cols[1] : '#fff36a'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, sy + j * 8); c.lineTo(tx + (hash(i, j) - 0.5) * 30, cy + (hash(j, i) - 0.5) * 40); c.stroke(); c.restore() } }
  if (k >= 76 && k < 94) { const u = (k - 76) / 10, sp = k < 86 ? [v.cx + d * 40 + (tx - v.cx - d * 40) * u, floor - 70 - Math.sin(u * Math.PI) * 60] : [tx + d * (k - 86) * 18, cy - (k - 86) * 10]
    for (let g = 2; g >= 0; g--) part(c, f, 'spBlur', k - g, sp[0] - d * g * 16, sp[1], { flip: d, alpha: g ? 0.3 : 1 }) }
  if (k >= 94 && k < 108) { const u = (k - 94) / 12, x = tx - d * 420 + d * 840 * u
    for (let g = 4; g >= 0; g--) part(c, f, 'vpSide', k >> 1, x - d * g * 34, cy - 20, { flip: d, alpha: g ? 0.12 + 0.1 * (4 - g) : 1 }) }
  { const a = ageOf(v, CK.turret); if (k >= 108 && k < 120) for (let j = 0; j < 4; j++) { const q = ((t + j * 3) % 8) / 8; part(c, f, 'vpShot', t, v.cx - d * 40 + (tx - v.cx + d * 40) * q, floor - 60 + (cy - floor + 60) * q, { flip: d, scale: 3 }) }
    if (a >= 0) flashBall(c, tx, cy, a, 8, 60, '#ffd040') }
  for (const [kind, col, n, len, r] of [['drone0', '#fff36a', 8, 40, 40], ['drone1', '#fff36a', 8, 40, 40], ['spinner', cols[1], 10, 55, 50], ['velo', '#ffffff', 14, 80, 70], ['turret', '#ffb030', 12, 60, 55]]) {
    const a = ageOf(v, CK[kind]); if (a < 0) continue
    flashBall(c, tx, cy, a, 6, r, col); sparks(c, tx, cy, a, n, len, col, CK[kind] * 7 + 3); ring(c, tx, cy, a, 12, 10, r * 1.6, col, 1, 4)
  }
  // C: the claw ERUPTS from the stage and holds; the Omnidroid's limb pins from above
  if (k >= 140 && k < 236) {
    const charge = k >= 200, h = k < 142 ? 20 : k >= 230 ? 204 - (k - 230) * 40 : v.lift + 34
    if (h > 0) risingClaw(c, f, tx, floor, h, charge ? t >> 1 : k < 148 ? (k - 140) >> 1 : 3 + ((k >> 2) % 2), charge)
  }
  if (P.vis && k >= 158 && k < 204) {
    const i = k < 162 ? 0 : k < 166 ? 1 : k < 196 ? Math.min(6, 2 + Math.max(0, ageOf(v, CK.pin)) / 3 | 0) : 7 + ((k - 196) >> 2)
    const ax = P.sx + (128 + OMNI.front[0] * P.od) * K, ay = P.sy + OMNI.front[1] * K
    part(c, f, 'limbDiag', Math.min(8, i), ax, ay, { flip: P.od })
  }
  { const a = ageOf(v, CK.lift); flashBall(c, tx, floor - 20, a, 10, 130, cols[0]); sparks(c, tx, floor - 30, a, 16, 110, '#ffffff', 41); ring(c, tx, floor, a, 22, 20, 300, '#ffffff', 0.2, 8)
    debris(c, f, tx, floor, a, 14, 1, 17); dust(c, f, tx, floor, a - 2, 240, 19) }
  { const a = ageOf(v, CK.pin); flashBall(c, tx, cy, a, 9, 110, '#ff6040'); sparks(c, tx, cy, a, 16, 100, '#ffe080', 43); ring(c, tx, cy, a, 14, 20, 160, '#ffffff', 1, 6) }
  // D: the leg shoots out of the hovering Omnidroid and drives the captive into the stage
  if (P.vis && k >= 224 && k < 300) {
    const sa = ageOf(v, CK.slam), i = k < 232 ? 0 : sa < 0 ? 1 : sa < 3 ? 2 : sa < 6 ? 3 : sa < 10 ? 4 : sa < 15 ? 5 : k < 258 ? 6 : 7
    const ret = k < 230 ? 300 * (1 - ease((k - 224) / 6)) : 0, top = P.sy + 480, y = top - ret
    c.save(); c.beginPath(); c.rect(P.cx - 400, top - 10, 800, 4000); c.clip()
    if (k >= 226 && k < 236) for (let g = 3; g >= 1; g--) part(c, f, 'legSlam', 0, P.cx, y - g * 46, { flip: P.od, alpha: 0.16 })   // motion smear
    part(c, f, 'legSlam', i, P.cx, y, { flip: P.od })
    c.restore()
  }
  { const a = ageOf(v, CK.slam)
    if (a >= 0) {
      if (a < 8 && !calmFx) { c.save(); c.globalAlpha = 1 - a / 8; c.fillStyle = '#ffffff'; c.fillRect(tx - 70 + a * 6, floor - 1400, 140 - a * 12, 1400); c.restore() }   // the light pillar
      flashBall(c, tx, floor - 30, a, 16, 260, cols[0])
      for (const [o, life, r1, col, w] of [[0, 26, 620, '#ffffff', 12], [4, 30, 820, cols[0], 9], [9, 34, 1000, cols[1], 6]]) ring(c, tx, floor, a - o, life, 30, r1, col, 0.16, w)
      ring(c, tx, floor - 60, a - 2, 18, 30, 300, '#ffffff', 1, 8)
      sparks(c, tx, floor - 40, a, 26, 220, '#ffffff', 77); sparks(c, tx, floor - 40, a - 3, 18, 160, cols[0], 79)
      debris(c, f, tx, floor, a, 26, 1.6, 23); debris(c, f, tx, floor, a - 5, 14, 1.2, 31)
      dust(c, f, tx, floor, a - 4, 320, 37); dust(c, f, tx, floor, a - 14, 460, 39)
    }
  }
}
// ── intro (render-only; nothing here touches the sim, so nothing can outlive the intro) and victory staging ──
function drawIntro(c, f, layer) {
  const k = f._introRevealFrame || 0, d = f.facing || 1, feet = f.y + f.h, x = ctrX(f)
  if (layer === 'under') {
    if (k >= 40 && k < 120) { const p = cl((k - 40) / 30, 0, 1), q = k > 100 ? (k - 100) / 20 : 0; drawShell(c, f, x - d * 330 - 128 * K, feet - 760 + 220 * p - 220 * q, d, 'eyeOpen', Math.min(4, (k - 40) >> 3), 1 - q) }
    if (k >= 24 && k < 110) { const e = k - 24; part(c, f, e < 30 ? 'gunEmerge' : 'gunOpen', e < 30 ? Math.floor(e / 3) : Math.min(7, (e - 30) >> 2), x + d * 110, feet, { flip: d, alpha: k > 96 ? (110 - k) / 14 : 1 }) }
  } else if (k >= 10 && k < 120) {
    const p = cl((k - 10) / 24, 0, 1); part(c, f, 'droneHover', k >> 2, x - d * 70, feet - 150 - 60 * (1 - p), { flip: d, alpha: k > 104 ? (120 - k) / 16 : 1 })
  }
}
function drawVictory(c, f) {
  if (f._lastSpriteAction !== 'win' || f.health <= 0) return
  const k = f._syndrome?.tick || 0, x = ctrX(f), feet = f.y + f.h, d = f.facing || 1
  part(c, f, 'droneHover', k >> 2, x - d * 80, feet - 150 + Math.sin(k / 20) * 6, { flip: d })
  part(c, f, 'bomberHover', k >> 2, x + d * 90, feet - 120 + Math.cos(k / 22) * 6, { flip: -d })
  part(c, f, 'spOpen', 0, x + d * 60, feet, { flip: d })
}

// ── public draw passes (game.js) ──
const W0 = { fighters: null, projectiles: null }
export function setSyndromeRenderWorld(W) { W0.fighters = W.fighters; W0.projectiles = W.projectiles }
const ULT_PARTS = ['shellUpper', 'shellLower', 'eyeOpen', 'eyeTrack', 'eyeFire', 'leg', 'legSlam', 'limbDiag', 'claw', 'clawCharge', 'crystal', 'cyanPuff',
  'droneBank', 'droneFire', 'droneFireLevel', 'spBlur', 'vpSide', 'vpShot', 'gunEmerge', 'gunOpen', 'gunFire', 'omniPuff', 'fragment', 'boomBall', 'boomRing']
const preloaded = new Set()
function preloadUlt(f) { const key = tagOf(f) || 'default'; if (preloaded.has(key)) return; preloaded.add(key); for (const n of ULT_PARTS) if (PA[n]) image(partUrl(f, n)) }
export function drawSyndromeUnder(c, p1, p2, W = W0) {
  for (const f of [p1, p2]) {
    if (!isSy(f)) continue
    if ((f.energy || 0) >= 90 || f.currentAttack?.sy?.key === 'ultOpen') preloadUlt(f)
    if (f._introPlaying) { drawIntro(c, f, 'under'); continue }
    const s = f._syndrome; if (!s) continue
    const v = syndromeUltView(f); if (v) { drawUltWorld(c, f, v, 'under'); continue }
    drawTurret(c, f, s, 'under'); drawOmni(c, f, s, 'under'); drawNormal(c, f, 'under')
  }
}
export function drawSyndromeOver(c, p1, p2, W = W0) {
  for (const f of [p1, p2]) {
    if (!isSy(f)) continue
    if (f._introPlaying) { drawIntro(c, f, 'over'); continue }
    const s = f._syndrome; if (!s) continue
    const v = syndromeUltView(f)
    if (v) drawUltWorld(c, f, v, 'over')
    else {
      drawTurret(c, f, s, 'over'); drawOmni(c, f, s, 'over'); drawNormal(c, f, 'over'); drawMobile(c, f, s, 'over'); drawSpin(c, f, s, 'over')
      drawShots(c, f, W); drawHold(c, f, s, W); drawGrab(c, f, f === p1 ? p2 : p1); drawVictory(c, f)
    }
    drawEvents(c, f, s)
  }
}
export function syndromeHudLabel(f) {
  const s = f?._syndrome
  return { mobile: s?.mobile?.kind || null, spin: !!s?.spin, turret: s?.turret ? { fam: s.turret.fam, hp: s.turret.hp, phase: s.turret.phase, shotsLeft: TURRET[s.turret.fam].shots - s.turret.fired } : null,
    omni: s?.omni?.kind || null, zeroUsed: !!s?.zeroUsed, holding: !!s?.hold }
}
export function drawSyndromeHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (!isSy(f)) return
    const L = syndromeHudLabel(f), [hud0, hud1] = colsOf(f).hud
    const x0 = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 92   // below the health bar + BREAK badge
    c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? x0 + barW : x0
    const tur = L.turret ? `TURRET ${L.turret.fam.toUpperCase()} ${'■'.repeat(Math.max(0, L.turret.hp))}${L.turret.phase === 'broken' ? ' DOWN' : ''}` : 'TURRET READY'
    const rows = [[`DRONES ${L.mobile === 'duet' ? 'ACTIVE' : L.mobile === 'velo' ? '— VELOCIPOD' : 'READY'}`, !L.mobile], [`SPINNER ${L.spin ? 'OUT' : 'READY'}`, !L.spin], [tur, !L.turret], [`OMNIDROID ${L.omni ? L.omni.toUpperCase() : 'READY'}`, !L.omni]]
    rows.forEach(([txt, ok], i) => { c.fillStyle = ok ? hud0 : 'rgba(255,255,255,0.55)'; c.fillText(txt, tx, y0 + i * 11) })
    c.restore()
  }
  one(p1, false); one(p2, true)
}
export function drawSyndromeIntroCard(c, cv, p1, p2) {
  const f = [p1, p2].find(q => isSy(q) && q._introPlaying); if (!f) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, k = f._introRevealFrame || 0
  const al = Math.min(1, Math.max(0, (k - 24) / 10)); if (al <= 0) return
  const [hud0, hud1] = colsOf(f).hud, por = image(tagOf(f) ? `./assets/syndrome/skins/${tagOf(f)}/portrait.png` : SY.portrait)
  c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 32px Arial'
  const name = SY.introTitle, bw = c.measureText(name).width + 150, bx = cw / 2 - bw / 2, by = ch * 0.72, bh = 70
  c.fillStyle = 'rgba(6,6,16,0.84)'; c.fillRect(bx, by, bw, bh); c.strokeStyle = hud0; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
  if (ready(por)) { c.imageSmoothingEnabled = false; c.drawImage(por, bx + 8, by + 6, por.naturalWidth * 1.5, por.naturalHeight * 1.5) }
  c.fillStyle = '#eef2ff'; c.shadowBlur = 16; c.shadowColor = hud1; c.fillText(name, cw / 2 + 28, by + bh * 0.4)
  c.shadowBlur = 0; c.font = 'bold 12px Arial'; c.fillStyle = hud1; c.fillText('“Begin the demonstration.”', cw / 2 + 28, by + bh * 0.78)
  c.restore()
}
const AFTER_DEFEAT_MUTE = /^(command|gesture|drone|spinner|turret|gun|missile|mortar|velo|omni|claw|slam|sweep|zero|converge|ult|boom)/
export function playSyndromeCues(f) {
  const q = f?._syndrome?.cues; if (!q?.length) return
  for (const v of q) {
    if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue
    if (v === 'slam') { try { camera.shake(8, 10) } catch (_) {} }
    try { sound.play('syndrome_' + v) } catch (_) {}
  }
  q.length = 0
}

// ── ULTIMATE: SCREEN pass (cineRegistry overlay — after the world, before the HUD; identity transform, device px) ──
const toScreen = (x, y) => XF ? { x: XF.a * x + XF.c * y + XF.e, y: XF.b * x + XF.d * y + XF.f } : null
let _scr = null
function scratch(w, h) { if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== w || _scr.cv.height !== h) { _scr.cv.width = w; _scr.cv.height = h } return _scr }
// LENS: re-draw the finished world frame scaled about a focus point (screen-space push-in / punch-zoom on top of the
// engine camera). The focus drifts toward the centre by `m`; the shift is clamped so the scaled frame always covers.
function lens(ctx, canvas, fx, fy, z, m = 0.5) {
  if (!(z > 1.004)) return
  try {
    const W = canvas.width, H = canvas.height, S = scratch(W, H)
    S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.clearRect(0, 0, W, H); S.g.drawImage(canvas, 0, 0)
    const sx = cl((W / 2 - fx) * m, -(W - fx) * (z - 1), fx * (z - 1)), sy = cl((H / 2 - fy) * m, -(H - fy) * (z - 1), fy * (z - 1))
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.setTransform(z, 0, 0, z, fx * (1 - z) + sx, fy * (1 - z) + sy); ctx.drawImage(S.cv, 0, 0); ctx.restore()
  } catch (_) {}
}
// the cinematic's lens per frame: [zoom, world focus x, world focus y, recentre]
function lensShot(v) {
  const k = v.frame, cyT = v.tTop + v.tH / 2
  if (k < 30) return [1 + 0.32 * ease(k / 16) * (k < 22 ? 1 : 1 - ease((k - 22) / 8)), v.cx + v.dir * 20, v.feet - 96, 0.7]   // push in on Syndrome, whip out as the shadow falls
  if (k >= 128 && k < 204) return [1 + 0.22 * ease((k - 128) / 12) * (k < 196 ? 1 : 1 - (k - 196) / 8), v.tx, k < 142 ? v.feet - 50 : cyT + 30, 0.55]   // on the claws
  if (k >= 238 && k < 258) return [1 + 0.1 * ease((k - 238) / 8), v.tx, v.feet - 70, 0.4]   // the crater
  if (k >= 262) return [1 + 0.24 * ease((k - 262) / 14) * (k < 290 ? 1 : 1 - (k - 290) / 10), v.cx + v.dir * 20, v.feet - 90, 0.6]   // the smug finish
  return [1, v.tx, cyT, 0]
}
function card(ctx, txt, x, y, size, fill, a = 1, rot = 0, stroke = '#06060e', font = 'bold italic') {
  if (!(a > 0)) return
  ctx.save(); ctx.globalAlpha = cl(a, 0, 1); ctx.translate(x, y); if (rot) ctx.rotate(rot)
  ctx.font = `${font} ${Math.round(size)}px Impact, Arial Black, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size / 6); ctx.strokeStyle = stroke; ctx.strokeText(txt, 0, 0); ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore()
}
function subtitle(ctx, W, H, bar, txt, k0, k, k1, u, col) {   // the monologue, typed out in the lower letterbox
  if (k < k0 || k >= k1) return
  const n = Math.min(txt.length, Math.floor((k - k0) * 1.6) + 1), a = cl((k1 - k) / 6, 0, 1)
  ctx.save(); ctx.globalAlpha = a; ctx.font = `italic bold ${Math.round(24 * u)}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = col; ctx.fillText('SYNDROME', W / 2, H - bar * 0.72); ctx.fillStyle = '#f2f4ff'; ctx.font = `italic ${Math.round(26 * u)}px Georgia, serif`
  ctx.fillText('“' + txt.slice(0, n) + (n < txt.length ? '' : '”'), W / 2, H - bar * 0.34); ctx.restore()
}
function speedLines(ctx, W, H, px, py, a, seed, col = '#ffffff') {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col
  for (let i = 0; i < 64; i++) { const an = (i / 64) * Math.PI * 2 + hash(seed, i) * 0.08, r0 = Math.max(W, H) * (0.22 + hash(i, seed) * 0.2), r1 = Math.max(W, H) * 1.2, w = 0.006 + hash(i, seed + 1) * 0.012
    ctx.beginPath(); ctx.moveTo(px + Math.cos(an - w) * r1, py + Math.sin(an - w) * r1); ctx.lineTo(px + Math.cos(an) * r0, py + Math.sin(an) * r0); ctx.lineTo(px + Math.cos(an + w) * r1, py + Math.sin(an + w) * r1); ctx.fill() }
  ctx.restore()
}
const CALLOUT = { drone0: 'DRONES!', drone1: 'CROSSFIRE!', spinner: 'SPINNER!', velo: 'VELOCIPOD!', turret: 'TURRET VOLLEY!', lift: 'GROUND CLAW!', pin: 'PINNED!' }
export function drawSyndromeUltScreen(ctx, canvas) {
  const f = SCENE?.f, v = f ? syndromeUltView(f) : null
  if (!v) { SCENE = null; XF = null; return false }
  const W = canvas.width, H = canvas.height, u = H / 720, k = v.frame, t = v.tick, [hud0, hud1] = colsOf(f).hud, calmFx = calm()
  const tp = toScreen(v.tx, v.tTop + v.tH / 2) || { x: W / 2, y: H / 2 }, gp = toScreen(v.tx, v.feet) || { x: W / 2, y: H * 0.7 }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; try { ctx.filter = 'none' } catch (_) {}
  // punch-zoom on the big contacts (the world frame itself kicks toward the impact)
  const la = ageOf(v, CK.lift), pa = ageOf(v, CK.pin), sa = ageOf(v, CK.slam)
  const z = 1 + (sa >= 0 && sa < 12 ? 0.14 * (1 - sa / 12) : 0) + (la >= 0 && la < 8 ? 0.07 * (1 - la / 8) : 0) + (pa >= 0 && pa < 8 ? 0.06 * (1 - pa / 8) : 0) + (k === ULT.land ? 0.04 : 0)
  const [lz, lx, ly, lm] = lensShot(v), lp = toScreen(lx, ly) || { x: W / 2, y: H / 2 }
  if (!calmFx && z > 1.004) { const ip = sa >= 0 ? gp : tp; lens(ctx, canvas, (lp.x * (lz - 1) + ip.x * (z - 1)) / Math.max(1e-6, lz - 1 + z - 1), (lp.y * (lz - 1) + ip.y * (z - 1)) / Math.max(1e-6, lz - 1 + z - 1), lz * z, lm) }
  else lens(ctx, canvas, lp.x, lp.y, calmFx ? 1 + (lz - 1) * 0.5 : lz, lm)
  // vignette + letterbox
  const inU = ease(k / 10), outU = ease((ULT.total - k) / 12), lb = Math.min(inU, outU), bar = H * 0.115 * lb
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,0.6)')
  ctx.globalAlpha = lb; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1
  // finisher: speed lines into the target during the slow-motion, then out of the crater
  if (k >= 214 && k < 236) speedLines(ctx, W, H, tp.x, tp.y, 0.22 * cl((k - 214) / 8, 0, 1), t >> 1, '#ffd8d8')
  if (sa >= 0 && sa < 30) speedLines(ctx, W, H, gp.x, gp.y, 0.55 * (1 - sa / 30), 900 + (t >> 1))
  // impact frames: white flash on the claws, white → inverted → white on the slam
  if (!calmFx) {
    if (la >= 0 && la < 3) { ctx.globalAlpha = 0.75 - la * 0.22; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) }
    if (pa >= 0 && pa < 3) { ctx.globalAlpha = 0.6 - pa * 0.18; ctx.fillStyle = '#fff3e0'; ctx.fillRect(0, 0, W, H) }
    if (sa >= 0 && sa < 3) { ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) }
    else if (sa >= 3 && sa < 6) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over' }
    else if (sa >= 6 && sa < 16) { ctx.globalAlpha = 0.5 * (1 - (sa - 6) / 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) }
    ctx.globalAlpha = 1
  } else if (sa >= 0 && sa < 10) { ctx.globalAlpha = 0.25 * (1 - sa / 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  ctx.fillStyle = hud0; ctx.globalAlpha = 0.9 * lb; ctx.fillRect(0, bar - 3 * u, W, 3 * u); ctx.fillRect(0, H - bar, W, 3 * u); ctx.globalAlpha = 1
  // A: the title card — a diagonal band slams across with the portrait
  if (k < ULT.cutIn) {
    const inK = ease(k / 6), outK = k > ULT.cutIn - 8 ? ease((ULT.cutIn - k) / 8) : 1, sl = (1 - inK) * W * 1.1 + (1 - outK) * -W * 1.1
    const by = H * 0.30, bh = 132 * u, left = (f.facing ?? 1) >= 0
    ctx.save(); ctx.translate(sl * (left ? -1 : 1), 0)
    ctx.beginPath(); ctx.moveTo(0, by + 18 * u); ctx.lineTo(W, by - 18 * u); ctx.lineTo(W, by + bh - 18 * u); ctx.lineTo(0, by + bh + 18 * u); ctx.closePath()
    ctx.fillStyle = 'rgba(6,6,16,0.92)'; ctx.fill(); ctx.lineWidth = 4 * u; ctx.strokeStyle = hud0; ctx.stroke()
    for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.12; ctx.fillStyle = hud0; ctx.fillRect(((t * 26 + i * 260) % (W + 300)) - 150, by + 10 * u, 90 * u, bh - 20 * u) } ctx.globalAlpha = 1
    const por = image(tagOf(f) ? `./assets/syndrome/skins/${tagOf(f)}/portrait.png` : SY.portrait)
    if (ready(por)) { ctx.imageSmoothingEnabled = false; const ph = bh * 1.25, pw = por.naturalWidth * ph / por.naturalHeight; ctx.drawImage(por, left ? 60 * u : W - 60 * u - pw, by + bh / 2 - ph / 2, pw, ph) }
    const tx0 = left ? W * 0.58 : W * 0.42, pop = k >= 12 && k < 18 ? 1 + (18 - k) * 0.06 : 1
    card(ctx, 'OPERATION KRONOS', tx0, by + 38 * u, 30 * u, hud0, 1, -0.03)
    card(ctx, 'FINAL DEMONSTRATION', tx0, by + 88 * u, 60 * u * pop, '#ffffff', k >= 10 ? 1 : 0, -0.03, '#000000')
    ctx.restore()
    if (k >= 12 && k < 15 && !calmFx) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  }
  // call-outs on every orchestra / claw contact
  for (const [kind, txt] of Object.entries(CALLOUT)) {
    const a = ageOf(v, CK[kind]); if (a < 0 || a > 22) continue
    const s = a < 4 ? 1.7 - a * 0.175 : 1, al = a > 14 ? (22 - a) / 8 : 1, side = CK[kind] % 2 ? 1 : -1
    card(ctx, txt, cl(tp.x + side * 150 * u, W * 0.18, W * 0.82), cl(tp.y - 120 * u - a * 1.5 * u, bar + 40 * u, H * 0.6), (kind === 'lift' || kind === 'pin' ? 50 : 40) * u * s, kind === 'lift' || kind === 'pin' ? '#ffffff' : '#ffe14a', al, side * -0.08, '#0a0a20')
  }
  // monologue
  subtitle(ctx, W, H, bar, 'Behold… my FINAL DEMONSTRATION.', 6, k, 54, u, hud0)
  subtitle(ctx, W, H, bar, 'No powers. Just GENIUS. Drones — Spinner — Velocipod!', 58, k, 124, u, hud0)
  subtitle(ctx, W, H, bar, 'Zero-point energy. Isn’t it MARVELOUS?', 130, k, 194, u, hud0)
  subtitle(ctx, W, H, bar, 'And when everyone’s super…', 200, k, 236, u, hud0)
  // the finisher stamp
  if (sa >= 4 && k < ULT.total) {
    const age = sa - 4, s = age < 6 ? 2.6 - 1.6 * ease(age / 6) : 1, a = cl((ULT.total - 12 - k) / 14, 0, 1), jit = age < 18 && !calmFx ? (hash(t, 1) - 0.5) * 10 * u * (1 - age / 18) : 0
    card(ctx, '…NO ONE WILL BE.', W / 2 + jit, H * 0.27 + jit, 78 * u * s, '#ffffff', a, -0.04, '#b01010')
    if (age > 30) card(ctx, 'DEMONSTRATION COMPLETE', W / 2, H - bar - 34 * u, 28 * u, hud0, cl((age - 30) / 8, 0, 1) * a, 0, '#06060e', 'bold')
  }
  ctx.restore()
  return true
}
registerCineScreen('syndrome_kronos', drawSyndromeUltScreen)
