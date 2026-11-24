// beerusUlt.js — Beerus (beerus): the "Ki Ball" ultimate rebuilt as a FROZEN CINEMATIC, "HAKAI — SPHERE OF DESTRUCTION"
// (2026-11-24; owner: "go onto the Dragon Ball ones … fix those ones please" — the Death Note bar). SIMULATION half — the
// render lives in beerusUltFx.js. Rides cineRegistry.js: registerUltCast('beerus') takes the Ultimate press,
// registerFreezeCine freezes combat / physics / input and calls update(ctx) every frame. The legacy beerusKiBallCinematic.js
// and its game.js hooks stay untouched: nothing activates it any more, so its update/draw/clear hooks are inert no-ops.
//
// Same input, meter and damage as the legacy executeBeerusUltimate (abilities.js, untouched — simply no longer reached):
// 150 Ki, a GUARANTEED range-independent 380 raw (applyScaledDamage, source 'ability'), a foe that was guarding at the press
// takes 22 %. A KO stamps _killingBlowMove = 'ultimate' (the SPHERE OF DESTRUCTION brutality), as the legacy did.
//
//   0–40     letterbox, title cut-in; the god of destruction YAWNS                         "god of destruction" (voice)
//   40–60    one finger raised — a pinprick of light on its tip
//   60–130   the SPHERE OF DESTRUCTION swells to the size of a small sun; the ground lifts toward it (heat, hit 1)
//   130–152  a lazy flick — it falls on the foe
//   152–176  IMPACT: the dome swallows the stage, three detonations (hits 2–4)
//   176–206  smoke… the foe still stands. Beerus is simply THERE beside them, palm raised      "underestimate" (voice)
//   214      HAKAI (hit 5, finisher): the foe is erased into particles
//   214–330  the motes drift away (KO) — or, a survivor, they fall back together; another yawn
// Every position is a pure function of the script frame k; hit-stop holds k. No Math.random / wall clock.
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { sound } from './sound.js'

export const BEERUS_CINE = {
  cost: 150, blockScale: 0.22,
  total: 330, title: 40, finger: 42, spark: 54, grow0: 60, grow1: 128, heat: 104, flick: 130, fall: 140,
  pulses: [152, 164, 176], smoke: 180, blink: 196, palm: 204, hakai: 216, settle: 276,
  raw: { heat: 30, pulse: [60, 50, 60], hakai: 180 },   // 30 + 170 + 180 = 380 raw (the legacy BEERUS_ULT.dmg)
  stop: { heat: 6, pulse: [16, 8, 10], hakai: 20 },
  rMax: 200,                                              // the sphere's world radius at full size
}

const c = { active: false }
export const beerusUltScene = () => (c.active ? c : null)
export const isBeerusUltActive = () => !!c.active
export const beerusUltStatus = () => ({ active: !!c.active, k: c.k | 0, real: c.real | 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko })
export let beerusUltLast = null

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const shake = (ctx, s, n) => { try { ctx?.camera?.shake?.(s, n) } catch (_) {} }
const voice = (f, file) => { try { sound.playSfxFile?.(file, null, { owner: f }); f._atkVoiceCd = 150 } catch (_) {} }

function targetOf(f, context) {
  try { if (typeof context?.getOpponent === 'function') return context.getOpponent(f) } catch (_) {}
  return f?.side === 'p2' ? context?.p1 : context?.p2
}

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'beerus') return undefined
  if (c.active) return false
  const t = targetOf(f, context)
  if (!t || t.eliminated || !(t.health > 0)) return undefined           // nobody to erase → legacy path (unchanged)
  if (!f.infiniteEnergy && (f.energy || 0) < BEERUS_CINE.cost) return false
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - BEERUS_CINE.cost)
  start(f, t, context)
  voice(f, 'beerus_ultimate_activate.mp3')
  return true
}

function start(f, t, context) {
  for (const k of Object.keys(c)) delete c[k]
  const d = ctrX(t) >= ctrX(f) ? 1 : -1
  const sL = context?.stageLeft || 0, sW = context?.stageWidth || context?.worldWidth || 3200
  Object.assign(c, {
    active: true, k: 0, real: 0, hold: 0, holdN: 1, caster: f, target: t, d,
    seed: (((t.health | 0) * 7 + (f.health | 0) * 3 + (context?.frame | 0)) >>> 0),
    floor: feet(f), tFloor: feet(t), fx0: f.x, tx0: t.x, sL, sR: sL + sW,
    scale: t.isBlocking ? BEERUS_CINE.blockScale : 1, guarded: !!t.isBlocking,
    hits: 0, dealt: 0, ko: false, last: null, pops: [], cam: null, camSaved: null,
    fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha,
  })
  c.kx = clamp(ctrX(t) - d * 66, sL + 40, c.sR - 40) - (f.w || 48) / 2   // where he simply IS for the Hakai
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = true; f.currentAttack = null; f.currentMove = null
  f._spriteCastMove = null; f._spriteCastTimer = 0
  f._fxAlpha = 0                                                        // beerusUltFx draws Beerus himself
  t.vx = 0; t.vy = 0; t.hitstop = 0; t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0; t.hitstun = Math.max(t.hitstun || 0, 9999); t.facing = -d
}

function strike(raw, stop, power, tag) {
  const t = c.target, f = c.caster
  c.hold = stop; c.holdN = stop
  c.last = { k: c.k, real: c.real, power, tag }
  if (c.ko || !(t.health > 0)) return
  const hp0 = t.health
  try { applyScaledDamage(t, raw * c.scale, { source: 'ability' }) } catch (_) {}
  const amt = Math.max(0, hp0 - (t.health || 0))
  c.hits++; c.dealt += amt
  c.pops.push({ real: c.real, amt: Math.round(amt), x: ctrX(t), y: t.y + (t.h || 94) * 0.3, power }); if (c.pops.length > 8) c.pops.shift()
  t.colorFlash = 8 + stop
  if (!(t.health > 0)) { c.ko = true; f._killingBlowMove = 'ultimate' }   // the SPHERE OF DESTRUCTION brutality (presentation only)
}

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.6; cam.maxZoomStep = 0.05; cam.maxPanStep = 70 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  beats(ctx, c.k)
  place()
  camera(cam, c.k)
  if (++c.k > BEERUS_CINE.total) finish()
}

function beats(ctx, k) {
  const B = BEERUS_CINE, f = c.caster
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); sfx(ctx, 'energy_hum_low', 0.6) }
  if (k === 14) sfx(ctx, 'pitch_drop_slowmo', 0.45)                                          // the yawn
  if (k === B.finger) sfx(ctx, 'whoosh_medium_01', 0.5)
  if (k === B.spark) { sfx(ctx, 'crack_sizzle_bright', 0.9); sfx(ctx, 'energy_tone_hold', 0.5) }
  if (k === B.grow0) { sfx(ctx, 'charge_swell_riser', 1); sfx(ctx, 'charge_hum_rise', 0.8) }
  if (k > B.grow0 && k < B.grow1 && (k - B.grow0) % 12 === 0) { shake(ctx, 3 + (k - B.grow0) / 10, 12); sfx(ctx, 'rumble_tail_01', 0.35 + (k - B.grow0) / 150) }
  if (k === B.heat) { strike(B.raw.heat, B.stop.heat, 0.4, 'heat'); sfx(ctx, 'boom_medium_01', 0.7); sfx(ctx, 'crack_sizzle_bright', 0.6) }
  if (k === B.flick - 2) sfx(ctx, 'swish_fast_02', 0.8)
  if (k === B.fall) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'whoosh_medium_02', 0.9) }
  B.pulses.forEach((at, i) => {
    if (k === at) { strike(B.raw.pulse[i], B.stop.pulse[i], i === 0 ? 1.3 : 0.8 + i * 0.1, 'pulse'); shake(ctx, i === 0 ? 34 : 18 + i * 4, i === 0 ? 34 : 16)
      if (i === 0) { sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.9) } else { sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'hit_heavy_boom_01', 0.8) } }
  })
  if (k === B.smoke) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === B.blink) { sfx(ctx, 'warp_wobble_01', 0.8); voice(f, 'beerus_hakai_activate.mp3') }
  if (k === B.palm) { sfx(ctx, 'energy_tone_hold', 0.7); sfx(ctx, 'boom_anticipation_suck', 0.7) }
  if (k === B.hakai) { strike(B.raw.hakai, B.stop.hakai, 1.5, 'hakai'); shake(ctx, 22, 24)
    sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'warp_wobble_02', 0.9); sfx(ctx, 'boom_huge_02_roar', 0.7); sfx(ctx, 'crack_sizzle_bright', 0.8) }
  if (k === B.hakai + 14) sfx(ctx, 'energy_hum_low', 0.6)
  if (k === B.settle) sfx(ctx, c.ko ? 'pitch_drop_slowmo' : 'warp_wobble_01', 0.6)
  if (c.ko && k > B.pulses[0] && k < B.smoke) c.k = B.smoke                                // already beaten: on to the Hakai
}

// Beerus' world feet x for script frame k (the render reads this too)
export const beerusX = k => (k < BEERUS_CINE.blink ? c.fx0 : c.kx) + (c.caster?.w || 48) / 2

function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.d, B = BEERUS_CINE
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = d; f._fxAlpha = 0
  f.y = c.floor - (f.h || 94); f.x = k < B.blink ? c.fx0 : c.kx
  let jx = 0
  const since = c.last ? c.real - c.last.real : 99
  if (c.last && since < 10) jx = ((c.real >> 1) & 1 ? 1 : -1) * 4 * (c.last.power || 0.5) * (1 - since / 10)
  t.x = Math.round(c.tx0 + jx); t.y = c.tFloor - (t.h || 94)
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.onGround = true; t.grounded = true; t.hitstun = Math.max(t.hitstun || 0, 9999)
  // the erasure: the render draws the foe as particles from the Hakai on
  if (k >= B.hakai && (c.ko || k < B.settle + 30)) t._fxAlpha = 0
  else if (k >= B.settle + 30) { if (c.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = c.tAlpha0 }   // a survivor has fallen back together
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const B = BEERUS_CINE, f = c.caster, t = c.target
  if (k < B.finger) cam.focusOnFighter(f, 1.2)
  else if (k < B.grow0) cam.focusOnFighter(f, 1.0)
  else if (k < B.flick) { cam.focusOnFighter(f, 0.8); if (k >= B.grow0 + 20) cam.targetY = c.floor - 120 - 140 * Math.min(1, (k - B.grow0 - 20) / 40) }   // look UP at the sphere
  else if (k < B.blink) cam.focusBetween?.(f, t, 0.95)
  else cam.focusOnFighter(t, 1.2)
}

function restoreFighters(final) {
  const f = c.caster, t = c.target
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.x = c.tx0; t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    if (c.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = c.tAlpha0
    if (final && t.health > 0 && !c.guarded) { t.hitstun = 30; t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
    if (final && c.guarded) t.blockstun = Math.max(t.blockstun || 0, 18) }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if (!final) f.x = c.fx0
    if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
    if (final) f.attackCooldown = 14 }
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
}
function finish() {
  beerusUltLast = { hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko }
  restoreFighters(true); reset()
}
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
export function clear() { if (!c.active) return; restoreFighters(false); reset() }

registerUltCast('beerus', cast)
registerFreezeCine('beerus_ult', { active: isBeerusUltActive, update, clear })
import './beerusUltFx.js'
