// vegetaUlt.js — Vegeta (vegeta): "SUPER SAIYAN BLUE EVOLUTION" rebuilt as a FROZEN CINEMATIC (2026-11-24; owner: "go onto the
// Dragon Ball ones … fix those ones"). SIMULATION half — the render lives in vegetaUltFx.js. Rides cineRegistry.js:
// registerUltCast('vegeta') takes the Ultimate press, registerFreezeCine freezes combat / physics / input while it plays.
//
// Same input, meter and damage as the legacy executeVegetaUltimate (abilities.js, untouched — simply no longer reached):
// 100 meter, a GUARANTEED range-independent Final Flash worth 340 raw in base / 420 in SSJ / 480 in Blue (applyScaledDamage,
// source 'ability' → ~204 / 252 / 288 effective). A foe that was guarding at the press takes 50 % (oneShotUltBlockedDmg).
//
//   0–34    letterbox, title cut-in "SUPER SAIYAN BLUE EVOLUTION", the stage darkens, rocks start to lift
//   34–86   TRANSFORMATION CLOSE-UP: the push-in on Vegeta, fists clenched, the scream — ki lightning, the ground cracks
//   86      THE EVOLUTION FLARE: white → inverted frame, the royal-blue aura explodes, shockwave, "I AM THE PRINCE OF ALL SAIYANS"
//   112–166 FINAL FLASH charge: arms thrown wide, a crackling ki star in each palm, the stage's light sucked into them
//   166     the palms SNAP forward — 174 the beam ERUPTS; 180 contact (hit 1, hit-stop) → 186–216 the beam drives through (6 ticks)
//   224     the horizon detonates (finisher, hit-stop 20, the impact frame), "FINAL FLASH"
//   250–320 aftermath: the scorched trench, the foe down, Vegeta folds his arms — "Remember it well."
// Every position is a pure function of the script frame k; hit-stop holds k. No Math.random / wall clock.
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { sound } from './sound.js'

export const VEGETA_CINE = {
  cost: 100, raw: { base: 340, ssj: 420, blue: 480 }, blockScale: 0.5,
  total: 320, title: 34, tf0: 34, flare: 86, tfEnd: 112, spread: 112, thrust: 166, fire: 174, contact: 180,
  ticks: [186, 192, 198, 204, 210, 216], blast: 224, beamOff: 248, after: 250, fold: 268,
  share: { contact: 0.16, tick: 0.04, blast: 0.6 },          // 0.16 + 6×0.04 + 0.60 = 1.00 of the form's raw
  stop: { contact: 10, tick: 2, blast: 20 },
  voice: { at: 36, clip: 'vegeta_ssj_004_t01m22_0s.mp3' },    // "Are you brave enough to take this one? … FINAL FLASH!" (the shout lands on the fire)
}

const c = { active: false }
export const vegetaUltScene = () => (c.active ? c : null)
export const isVegetaUltActive = () => !!c.active
export let vegetaUltLast = null   // last finished scene (tests): { hits, dealt, ko, form }
// test/harness status in the legacy cinematic's shape (harness/vegeta*.test.mjs read it)
export function vegetaUltStatus() {
  if (!c.active) return { active: false, frame: 0, phase: null, total: VEGETA_CINE.total, impactFrame: VEGETA_CINE.contact, struck: false, hits: 0, dealt: 0 }
  const k = c.k | 0, V = VEGETA_CINE
  return { active: true, frame: k, phase: k < V.fire ? 'windup' : k < V.after ? 'fire' : 'settle', total: V.total, impactFrame: V.contact,
    struck: c.hits > 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko, form: c.form }
}
if (typeof window !== 'undefined') window.__vegetaUltStatus = vegetaUltStatus

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const shake = (ctx, s, n) => { try { ctx?.camera?.shake?.(s, n) } catch (_) {} }
const formOf = f => f._ssjBlueActive ? 'blue' : f._ssjActive ? 'ssj' : 'base'

function targetOf(f, context) {
  try { if (typeof context?.getOpponent === 'function') return context.getOpponent(f) } catch (_) {}
  return f?.side === 'p2' ? context?.p1 : context?.p2
}

// ── CAST (abilities.triggerUltimate → castRegisteredUlt) ─────────────────────────────────────────────────────────
function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'vegeta') return undefined
  if (c.active) return false
  const t = targetOf(f, context)
  if (!t || t.eliminated || !(t.health > 0)) return undefined          // nobody to fire at → legacy path (unchanged)
  if (!f.infiniteEnergy && (f.energy || 0) < VEGETA_CINE.cost) return false
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - VEGETA_CINE.cost)
  start(f, t, context)
  f._atkVoiceCd = 330                                                  // no connect-bark on top of the cinematic's own line
  return true
}

function start(f, t, context) {
  for (const k of Object.keys(c)) delete c[k]
  const d = ctrX(t) >= ctrX(f) ? 1 : -1
  const form = formOf(f)
  Object.assign(c, {
    active: true, k: 0, real: 0, hold: 0, caster: f, target: t, d, form, raw: VEGETA_CINE.raw[form],
    seed: ((t.health | 0) * 7 + (f.health | 0) * 3 + (context?.frame | 0)) >>> 0,
    floor: feet(f), tFloor: feet(t), fx0: f.x, tx0: t.x,
    sL: context?.stageLeft || 0, sR: context?.stageWidth ?? context?.worldWidth ?? 3200,
    scale: t.isBlocking ? VEGETA_CINE.blockScale : 1, guarded: !!t.isBlocking,
    hits: 0, dealt: 0, ko: false, last: null, pops: [], cam: null, camSaved: null, fAlpha0: f._fxAlpha, done: {},
  })
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = true; f.currentAttack = null; f.currentMove = null
  f._spriteCastMove = 'charge'; f._spriteCastTimer = VEGETA_CINE.total + 8   // the engine sprite (hidden) holds the power-up pose
  f._fxAlpha = 0                                                       // vegetaUltFx draws Vegeta himself
  t.vx = 0; t.vy = 0; t.hitstop = 0; t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0; t.hitstun = Math.max(t.hitstun || 0, 9999); t.facing = -d
}

function strike(share, stop, power, tag) {
  const t = c.target
  c.hold = stop
  c.last = { k: c.k, real: c.real, power, tag }
  if (c.ko || !(t.health > 0)) return
  const hp0 = t.health
  try { applyScaledDamage(t, c.raw * share * c.scale, { source: 'ability' }) } catch (_) {}
  const amt = Math.max(0, hp0 - (t.health || 0))
  c.hits++; c.dealt += amt
  if (tag === 'tick') c.tickSum = (c.tickSum || 0) + amt                // the ticks bank into the detonation's number
  else { c.pops.push({ real: c.real, amt: Math.round(amt + (tag === 'blast' ? c.tickSum || 0 : 0)), x: ctrX(t), y: t.y + (t.h || 94) * 0.3, power }); if (c.pops.length > 10) c.pops.shift() }
  t.colorFlash = 8 + stop
  if (!(t.health > 0)) { c.ko = true; try { c.caster._killingBlowMove = 'ultimate' } catch (_) {} }
}

// ── UPDATE ───────────────────────────────────────────────────────────────────────────────────────────────────────
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
  if (++c.k > VEGETA_CINE.total) finish()
}

function beats(ctx, k) {
  const V = VEGETA_CINE
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); sfx(ctx, 'rumble_tail_01', 0.7) }
  if (k === V.voice.at) { try { sound.playSfxFile?.(V.voice.clip, null, { owner: c.caster }) } catch (_) {} }
  // the transformation: the hum swells, the ground groans, lightning snaps
  if (k === V.tf0) { sfx(ctx, 'charge_swell_riser', 0.95); sfx(ctx, 'energy_hum_low', 0.7) }
  if (k === V.tf0 + 18) { sfx(ctx, 'charge_hum_rise', 0.8); shake(ctx, 4, 30) }
  if (k > V.tf0 + 8 && k < V.flare && (k - V.tf0) % 9 === 0) sfx(ctx, 'crack_sizzle_bright', 0.35 + (k - V.tf0) / 150)
  if (k === V.flare - 8) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === V.flare) { c.flareReal = c.real; c.hold = 6; shake(ctx, 26, 28); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 0.95); sfx(ctx, 'crack_sizzle_bright', 0.9) }
  if (k === V.flare + 10) sfx(ctx, 'rumble_tail_01', 0.8)
  // the Final Flash charge: arms wide, the palms howl
  if (k === V.spread) { sfx(ctx, 'whoosh_medium_01', 0.8); sfx(ctx, 'energy_tone_hold', 0.6); sfx(ctx, 'charge_swell_riser', 0.8) }
  if (k === V.spread + 24) { sfx(ctx, 'charge_hum_rise', 0.9); shake(ctx, 5, 40) }
  if (k > V.spread && k < V.thrust && (k - V.spread) % 8 === 0) sfx(ctx, 'crack_sizzle_bright', 0.3)
  if (k === V.thrust - 6) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'pitch_drop_slowmo', 0.6) }
  if (k === V.thrust) { sfx(ctx, 'swish_fast_03', 0.9); sfx(ctx, 'warp_wobble_01', 0.6) }
  if (k === V.fire) { c.fireReal = c.real; c.hold = 4; shake(ctx, 22, 20); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'energy_tone_hold', 0.9) }
  if (k === V.contact) { strike(V.share.contact, V.stop.contact, 1.0, 'contact'); shake(ctx, 18, 18); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_medium_02', 0.8) }
  V.ticks.forEach((at, i) => { if (k === at) { strike(V.share.tick, V.stop.tick, 0.4 + i * 0.06, 'tick'); shake(ctx, 8 + i, 8); sfx(ctx, i & 1 ? 'impact_hit_01' : 'hit_flurry_01', 0.5 + i * 0.05) } })
  if (k === V.blast - 6) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === V.blast) { c.done.blast = true; strike(V.share.blast, V.stop.blast, 1.6, 'blast'); shake(ctx, 36, 40)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'hit_heavy_boom_01', 0.9) }
  if (k === V.blast + 14) sfx(ctx, 'rumble_tail_01', 1)
  if (k === V.fold) sfx(ctx, 'whoosh_medium_02', 0.5)
  // a KO on the contact/ticks: straight to the detonation
  if (c.ko && k > V.contact && k < V.blast - 6) c.k = V.blast - 6
}

// fighters for script frame c.k (also during hit-stop, so they stay pinned)
function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.d, V = VEGETA_CINE
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = d; f._fxAlpha = 0; f.x = c.fx0; f.y = c.floor - (f.h || 94)
  // the foe: braced in the beam, driven back a little each tick, then hurled at the detonation
  let push = 0
  if (k >= V.contact) push = Math.min(1, (k - V.contact) / (V.blast - V.contact)) * 46
  if (k >= V.blast) push = 46 + 64 * Math.min(1, (k - V.blast) / 20)
  const jit = k >= V.contact && k < V.blast ? (((c.real >> 1) & 1) ? 2 : -2) : 0
  t.x = Math.round(Math.max(c.sL, Math.min(c.sR - (t.w || 48), c.tx0 + d * push + jit))); t.y = c.tFloor - (t.h || 94)
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.onGround = true; t.grounded = true; t.hitstun = Math.max(t.hitstun || 0, 9999)
  if (k >= V.blast && !c.guarded && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target, V = VEGETA_CINE
  if (k < V.title) cam.focusOnFighter(f, 1.1)
  else if (k < V.tfEnd) cam.focusOnFighter(f, 1.4)
  else if (k < V.fire) cam.focusOnFighter(f, 1.25)
  else if (k < V.blast) cam.focusBetween?.(f, t, 1.0)
  else if (k < V.after) cam.focusOnFighter(t, 0.9)
  else cam.focusOnFighter(f, 1.2)
}

function restoreFighters(final) {
  const f = c.caster, t = c.target
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    if (!final) t.x = c.tx0
    if (final && t.health > 0 && !c.guarded) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
    if (final && c.guarded) t.blockstun = Math.max(t.blockstun || 0, 22) }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    f.vx = 0; f.vy = 0; f.x = c.fx0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
    if (final) f.attackCooldown = 14 }
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
}
function finish() {
  vegetaUltLast = { hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko, form: c.form }
  restoreFighters(true); reset()
}
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
export function clear() { if (!c.active) return; restoreFighters(false); reset() }

registerUltCast('vegeta', cast)
registerFreezeCine('vegeta_ult', { active: isVegetaUltActive, update, clear })
import './vegetaUltFx.js'
