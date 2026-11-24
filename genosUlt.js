// genosUlt.js — Genos (genos) ULTIMATE "OVERDRIVE — INCINERATION CANNON" as a FROZEN CINEMATIC that hands off to the timed
// OVERDRIVE mode (2026-11-24, owner: "make more cinematic ultimates … the same way you did with the other ones"). Replaces
// the legacy instant mode switch (abilities.executeGenosUltimate → enterGenosOverdrive — left untouched, simply no longer
// reached) through cineRegistry.js:
//   registerUltCast('genos')            → cast(): the legacy gates (not already in Overdrive, no attack cooldown / hitstun /
//                                         blockstun) + the legacy cost (100 Core), then the frozen cinematic.
//   registerFreezeCine('genos_overdrive') → while active game.js freezes combat / physics / input and calls update(ctx).
// BEATS (script frames k, 60 fps; hit-stop holds k on the beam's first contact and on the final surge):
//   ACTIVATION    0-40   letterbox, push-in; armour panels pop open, the chest core flares white-hot, steam jets from the vents,
//                        the OVERDRIVE system readout; "Absolutely everything that I have!"
//   TARGET LOCK  40-80   HUD reticle brackets close on the foe, scan sweep, threat readout; "Engaging target!"
//   CHARGE       80-140  palm forward, the cannon charges (embers spiral in, heat-haze, flame aura); INCINERATION CANNON title;
//                        "Incinerate!"
//   CANNON      140-200  a stage-wide incineration beam: 4 sure-hit surges (first contact + final surge hold the frame)
//   AFTERMATH   200-248  the beam collapses, a scorched trench glows along its path, smoke, steam venting from the cooling
//                        arms, panels close — then the OVERDRIVE window opens (×1.35 dmg / ×1.15 spd, the legacy overheat
//                        drawback on expiry, driven by the existing abilities.updateGenosOverdrive / game.js HUD).
// BALANCE: the old ult was the mode alone (7 s). Now: the cannon (220 raw → 132 through applyScaledDamage; a held guard
// chips 25 %) + a 5 s window (was 7 s). SIM: positions are pure functions of the script frame + the cast layout; no
// Math.random / clock. Render: genosUltFx.js reads genosUltScene() (never writes here).
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { drawGenosUltScreen, preloadGenosUlt } from './genosUltFx.js'

export const G = {
  cost: 100,
  lockAt: 40, chargeAt: 80, titleAt: 96, beamAt: 140, beamEnd: 200, total: 248, outAt: 232,
  surges: [144, 158, 172, 188], raw: [40, 40, 50, 90], blockMult: 0.25,   // 220 raw
  stop: { first: 10, last: 22 },
  push: 70,                                                               // the beam shoves the foe back (world px)
  overdrive: { duration: 300, dmg: 1.35, spd: 1.15 },
}
// voice slices (the pack is mostly long stitched compilations — GENOS_VOICE_LOG.md; faster-whisper word timestamps)
const VO = {
  everything: { file: 'genos_006.mp3' },                                  // "Absolutely everything that I have!"
  engaging:   { file: 'genos_005.mp3', from: 4.62, to: 5.62 },            // "Engaging target!"
  incinerate: { file: 'genos_007.mp3', from: 3.66, to: 4.42 },            // "Incinerate!"
}

const c = { active: false }
export const isGenosUltActive = () => !!c.active
export const genosUltScene = () => (c.active ? c : null)
export const getGenosUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, hits: c.hits | 0, dmg: Math.round(c.dmg || 0), blocked: !!c.blocked, ko: !!c.ko, caster: c.caster?.side || null })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'genos') return undefined
  if (c.active || f._genosOverdriveActive) return false
  if ((f.attackCooldown || 0) > 0 || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated) return undefined                                // no foe → the legacy mode switch handles it
  if (!f.infiniteEnergy) { if ((f.energy || 0) < G.cost) return false; f.energy = Math.max(0, (f.energy || 0) - G.cost) }
  const stage = context?.worldWidth || 3200
  const dir = ctrX(t) >= ctrX(f) ? 1 : -1
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, stage, dir, floor: feet(f), tFloor: feet(t),
    fx0: ctrX(f), tx0: ctrX(t), tAir0: !(t.onGround || t.grounded), ty0: t.y, blocked: !!t.isBlocking, hits: 0, dmg: 0, ko: false, done: {},
    cam: null, camSaved: null, fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha,
    beamEndX: dir > 0 ? stage + 200 : -200 })
  f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
  t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxAlpha = 0; t._fxAlpha = 0                                          // both are drawn by genosUltFx (real sheets)
  try { preloadGenosUlt(f, t) } catch (_) {}
  return true
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
// a voice line (or a slice of one): owned by Genos (one voice channel); a slice is cut at its end by firing the element's
// own 'ended' (sound.js releases the music duck on it). Audio-only side effect.
function voice(ctx, v) {
  let a = null
  try { a = ctx?.sound?.playSfxFile?.(v.file, null, { owner: c.caster }) } catch (_) { a = null }
  if (!a || v.from == null || typeof a.addEventListener !== 'function') return
  try {
    a.muted = true
    const seek = () => { try { a.currentTime = v.from; a.muted = false } catch (_) {} }
    if (a.readyState >= 1) seek(); else a.addEventListener('loadedmetadata', seek, { once: true })
    const stopAt = () => { try { if (!a.paused && a.currentTime >= v.to) { a.pause(); a.dispatchEvent(new Event('ended')) } } catch (_) {} }
    a.addEventListener('timeupdate', stopAt)
    a.addEventListener('playing', () => { setTimeout(() => { try { if (!a.paused) { a.pause(); a.dispatchEvent(new Event('ended')) } } catch (_) {} }, Math.round((v.to - v.from) * 1000) + 60) }, { once: true })
  } catch (_) {}
}

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  const k = c.frame
  beats(ctx, k)
  place()
  camera(cam, k)
  if (++c.frame > G.total) finish()
}

function beats(ctx, k) {
  const cam = ctx.camera
  if (k === 0) { sfx(ctx, 'charge_hum_rise', 0.8); sfx(ctx, 'warp_wobble_01', 0.5) }
  if (k === 6) voice(ctx, VO.everything)
  if (k === 10 || k === 16 || k === 22) { sfx(ctx, 'crack_sizzle_bright', 0.55); cam?.shake?.(3, 4) }   // panels unlatching
  if (k === 24) { sfx(ctx, 'energy_tone_hold', 0.7); sfx(ctx, 'whoosh_medium_01', 0.6) }               // steam vents
  if (k === 32) { sfx(ctx, 'boom_medium_01', 0.8); cam?.shake?.(8, 10) }                                 // core flare
  if (k === G.lockAt) sfx(ctx, 'sting_pitch_rise_hold', 0.75)
  if (k === G.lockAt + 4) voice(ctx, VO.engaging)
  if (k === G.lockAt + 22) sfx(ctx, 'impact_crack_01', 0.6)                                              // LOCKED
  if (k === G.chargeAt) { sfx(ctx, 'charge_swell_riser', 0.95); sfx(ctx, 'energy_hum_low', 0.8) }
  if (k === G.titleAt) { sfx(ctx, 'boom_medium_02', 0.8); cam?.shake?.(7, 8) }
  if (k === 122) voice(ctx, VO.incinerate)
  if (k === 128) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === G.beamAt) { sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_frame_boom_long', 0.9); cam?.shake?.(16, 30) }
  G.surges.forEach((at, i) => {
    if (k !== at) return
    surge(G.raw[i])
    const last = i === G.surges.length - 1
    if (i === 0) c.hold = G.stop.first
    if (last) c.hold = G.stop.last
    sfx(ctx, last ? 'boom_huge_01' : 'hit_heavy_boom_01', last ? 1 : 0.8); sfx(ctx, 'crack_sizzle_bright', 0.6)
    cam?.shake?.(last ? 18 : 10, last ? 26 : 12)
  })
  if (k === 150) sfx(ctx, 'rumble_tail_01', 0.8)
  if (k === G.beamEnd) { sfx(ctx, 'pitch_drop_slowmo', 0.7); sfx(ctx, 'rumble_tail_01', 0.9) }
  if (k === 212) sfx(ctx, 'energy_tone_hold', 0.45)                                                       // venting steam
}

function surge(raw) {
  const t = c.target
  if (!t || !(t.health > 0)) return
  const before = t.health
  try { applyScaledDamage(t, c.blocked ? Math.round(raw * G.blockMult) : raw, { source: 'ability', move: 'genosIncinerationCannon' }) } catch (_) {}
  c.hits++; c.dmg += Math.max(0, before - t.health); t.colorFlash = 8
  const f = c.caster; if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) c.ko = true
}

// the foe's x during / after the beam (pushed back by the cannon, then dropped) — pure
export function foeX(k) {
  if (k < G.beamAt) return c.tx0
  const u = smooth((k - G.beamAt) / (G.beamEnd - G.beamAt))
  return clamp(c.tx0 + c.dir * G.push * (c.blocked ? 0.5 : 1) * u, 60, c.stage - 60)
}

function place() {
  const k = c.frame, f = c.caster, t = c.target
  c.pf = k
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = c.dir; f._fxAlpha = 0
  // an airborne foe is held where it was until the beam, then dropped to the floor by the cannon's push
  const x = foeX(k), airY = c.ty0, groundY = c.tFloor - (t.h || 94)
  const yy = !c.tAir0 ? groundY : k < G.beamAt ? airY : airY + (groundY - airY) * smooth((k - G.beamAt) / 40)
  t.x = Math.round(x - (t.w || 48) / 2); t.y = Math.round(Math.min(yy, groundY))
  t.vx = 0; t.vy = 0; t.isBlocking = c.blocked; t.hitstun = Math.max(t.hitstun || 0, 9999); t._fxAlpha = 0
  const air = t.y < groundY - 1; t.onGround = !air; t.grounded = !air
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  const tb = box(foeX(k), c.tFloor - 47)
  if (k < G.lockAt) cam.focusOnFighter(f, 1.8)                                                  // the activation, tight
  else if (k < G.chargeAt) cam.focusBetween?.(f, tb, 1.25)                                     // target lock: both in frame
  else if (k < G.beamAt) cam.focusOnFighter(box(c.fx0 + c.dir * 40, c.floor - 60), 1.55)       // the palm charging
  else if (k < G.beamEnd) cam.focusBetween?.(f, box(c.fx0 + c.dir * 900, c.floor - 47), 0.7)    // PULL OUT: the beam crosses the stage
  else cam.focusBetween?.(f, tb, 1.0)                                                            // the scorched aftermath
}

function enterOverdrive(f) {   // the legacy timed MODE (abilities.enterGenosOverdrive's fields), opened after the cinematic
  const O = G.overdrive
  f._genosOverdriveActive = true
  f._genosOverdriveTimer = O.duration
  f._genosOverdriveMax = O.duration
  f._genosOverdriveExpire = false
  f.damageMultiplier = f.attackMultiplier = O.dmg
  f.speedMultiplier = O.spd
  f.teleportFlash = Math.max(f.teleportFlash || 0, 12)
}
function restoreCam() { const cam = c.cam, sv = c.camSaved; if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep } }
function restoreAlpha() {
  const f = c.caster, t = c.target
  if (f) { if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0 }
  if (t) { if (c.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = c.tAlpha0 }
}
function finish() {
  const f = c.caster, t = c.target
  if (t) {
    t.x = Math.round(foeX(G.total) - (t.w || 48) / 2); t.y = c.tFloor - (t.h || 94); t.vx = 0; t.vy = 0; t.onGround = true; t.grounded = true
    t.hitstun = 0; t.isBlocking = false
    if (c.blocked) t.blockstun = Math.max(t.blockstun || 0, 20)
    else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40); t.hitstun = 18 }
  }
  if (f) {
    try { clearInputBuffer(f) } catch (_) {}   // presses buffered before / during the freeze (the Ultimate press itself) must not replay
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 12); f.vx = 0; f.vy = 0
    f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if ((f.health || 0) > 0) enterOverdrive(f)
  }
  restoreAlpha(); restoreCam(); reset()
}
const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
// every reset path (round reset, rematch, KO teardown, menu): restore both fighters + the camera, drop the scene (no mode)
export function clear() {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.isBlocking = false; t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
export const clearGenosUlt = clear

registerUltCast('genos', cast)
registerFreezeCine('genos_overdrive', { active: isGenosUltActive, update, clear })
registerCineScreen('genos_overdrive', (ctx, canvas) => drawGenosUltScreen(ctx, canvas, genosUltScene()))
