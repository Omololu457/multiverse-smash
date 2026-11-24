// rickUlt.js — Rick Sanchez (rick) "SELF-DESTRUCT" as a FROZEN CINEMATIC (2026-11-24, owner: "make more cinematic ultimates …
// do it the same way you did with the other ones"). Keeps the essence of the legacy ult (executeRickUltimate in abilities.js:
// 140 meter + Rick pays 15% of his max HP, a point-blank green blast that only works up close, 180 RAW total → 108 EFF) but
// plays it as Rick's genius chaos:
//   WUBBA LUBBA DUB DUB → portal-gun point-blank shot knocks the foe through a portal → the foe is bounced through FIVE
//   wildly different dimensions (procedural backdrops, one hit in each) → dropped back home into a MEESEEKS SWARM → Rick pulls
//   the self-destruct device ("It's called a deterrent") → 3 · 2 · 1 → a massive green portal-energy detonation (Rick is in
//   it) → the smoke clears, a portal opens and Rick strolls back out ("…well, that's cool").
// Rides the shared cineRegistry.js slot: registerUltCast('rick') runs BEFORE abilities.js's switch; while active game.js
// freezes combat / physics / input and calls update(ctx) every frame. Only the CONNECTING case is taken over — a whiff
// (foe out of the 220px blast), a blocked / invulnerable foe, or no meter returns undefined → the legacy executeRickUltimate
// runs exactly as before (chip on block, self-cost on whiff, …).
// SIM: everything is a pure function of the SCRIPT frame (c.k) + the layout captured at the cast; hit-stop holds the script
// frame. No Math.random / clock. Damage: applyScaledDamage(target, raw, { source: 'ability' }) — the SAME call + scale the
// legacy blast used, split over the beats (10 + 5×12 + 3×10 + 80 = 180 RAW). Render: rickUltFx.js reads rickUltScene().
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import './rickUltFx.js'

export const RICK_ULT = {
  cost: 140, selfFrac: 0.15, radius: 220,                    // legacy numbers (executeRickUltimate)
  raw: { shot: 10, dim: 12, seek: 10, boom: 80 },             // 10 + 5×12 + 3×10 + 80 = 180 RAW (legacy DAMAGE = 180)
  shot: 22, intoPortal: 34,                                   // portal-gun shot → knocked into the wall portal
  dim0: 36, dimLen: 26, dims: 5, dimHit: 11,                  // dimension cuts [36, 166): contact at local frame 11
  drop: 166, land: 178,                                       // home again: out of a sky portal, slam
  seeks: [188, 196, 204],                                     // Meeseeks swarm contacts
  device: 214, count: [226, 238, 250], suck: 256, boom: 264,  // the device, the countdown, the detonation
  landAt: 302, portal: 312, stepOut: 320, cool: 326, out: 340, total: 352,
  stop: { shot: 5, dim: 6, seek: 3, land: 4, boom: 18 },
}
const U = RICK_ULT
export const RICK_DIMENSIONS = [
  { id: 'grid',   name: 'DIMENSION J19-ζ7',  tag: 'NEON GRID' },
  { id: 'cubes',  name: 'DIMENSION 35-C',    tag: 'CUBE RAIN' },
  { id: 'goop',   name: 'DIMENSION 46″', tag: 'GOOP SEA' },
  { id: 'invert', name: 'DIMENSION Ω-NEG',   tag: 'INVERTED' },
  { id: 'rocket', name: 'DIMENSION C-500A',  tag: 'ROCKET RANGE' },
]

const c = { active: false }
export const isRickUltActive = () => !!c.active
export const rickUltScene = () => (c.active ? c : null)
export const getRickUltStatus = () => ({ active: !!c.active, k: c.k | 0, real: c.real | 0, hits: c.hits | 0, dmg: Math.round(c.dmg || 0), ko: !!c.ko })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 60) / 2
const ctrY = o => (o.y || 0) + (o.h || 100) / 2
const feet = o => (o.y || 0) + (o.h || 100)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
// which dimension cut is live at script frame k (index + local frame), or null
export function dimAt(k) {
  if (k < U.dim0 || k >= U.dim0 + U.dims * U.dimLen) return null
  const i = Math.floor((k - U.dim0) / U.dimLen)
  return { i, local: k - U.dim0 - i * U.dimLen, d: RICK_DIMENSIONS[i] }
}

// ── CAST (abilities.js triggerUltimate → castRegisteredUlt) ──────────────────────────────────────────────────────────
function cast(f, context) {
  if (!f || c.active) return undefined
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => x?.side === 'p1' ? context?.p2 : context?.p1)
  const t = getOpp(f)
  // only the CONNECTING detonation becomes the cinematic; everything else is the legacy ult, unchanged
  if (!t || t.eliminated || !(t.health > 0) || (t.invulnTimer || 0) > 0 || t.isBlocking) return undefined
  if (!f.infiniteEnergy && (f.energy || 0) < U.cost) return undefined
  if (Math.hypot(ctrX(t) - ctrX(f), ctrY(t) - ctrY(f)) > U.radius) return undefined
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - U.cost)
  f.health = Math.max(1, (f.health || 0) - Math.round((f.maxHealth || 1050) * U.selfFrac))   // the self-destruct cost (non-lethal), on cast as before
  const stage = context?.worldWidth || 3200, d = ctrX(t) >= ctrX(f) ? 1 : -1
  const floor = Math.max(feet(f), feet(t))
  Object.assign(c, {
    active: true, k: 0, real: 0, hold: 0, caster: f, target: t, stage, dir: d, floor,
    fx0: ctrX(f), tx0: ctrX(t), hp0: t.health, hits: 0, dmg: 0, ko: false, done: {}, impacts: [], cam: null, camSaved: null,
    save: { fA: f._fxAlpha, tA: t._fxAlpha, fR: f._fxRecord, tR: t._fxRecord },
  })
  const X = v => clamp(v, 60, stage - 60)
  c.portalX = X(c.tx0 + d * 64)                               // the wall portal the shot knocks the foe into
  c.landX = X(c.tx0 + d * 300)                                // where the detonation throws the foe
  c.homeX = X(c.fx0 - d * 46)                                 // where Rick steps back out of his portal
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.attacking = false; f.currentAttack = null; f.currentMove = null
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxRecord = true; t._fxRecord = true                      // sprite.js records the exact frame drawn → the dimension cuts redraw the real sprites
  place()
  return true
}

function strike(raw, kind, power = 0.6) {
  const t = c.target, f = c.caster
  if (c.ko || !(t.health > 0)) return
  const before = t.health
  try { applyScaledDamage(t, raw, { source: 'ability' }) } catch (_) {}
  const dealt = Math.max(0, before - t.health)
  c.hits++; c.dmg += dealt
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  c.impacts.push({ kind, k: c.k, r: c.real, power, dealt: Math.round(dealt) }); if (c.impacts.length > 16) c.impacts.shift()
  c.lastDmg = { v: Math.round(dealt), r: c.real, kind }
  if (!(t.health > 0)) { c.ko = true; f._killingBlowMove = 'selfDestructBlast' }   // → the NUKE brutality (the legacy ult's blast name)
}
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }
// damage numbers are drawn by rickUltFx (the engine's own numbers don't tick while the world is frozen)
function dmgNumber(ctx, kind) { const L = c.lastDmg; if (!L || L.v <= 0) return; (c.nums || (c.nums = [])).push({ v: L.v, r: c.real, k: c.k, kind: kind || L.kind }); if (c.nums.length > 12) c.nums.shift() }

// ── UPDATE (one frame; game.js freezes everything else) ─────────────────────────────────────────────────────────────
function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.06; cam.maxPanStep = 80 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }              // HIT-STOP: the script frame (and everything in it) holds
  const k = c.k
  beats(ctx, k)
  if (c.ko && k < U.device) { c.k = U.device; place(); return }   // a KO mid-sequence → straight to the device + detonation (no more damage)
  place()
  camera(cam, k)
  if (++c.k > U.total) finish()
}

function beats(ctx, k) {
  const cam = ctx.camera
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); voice(ctx, 'rick_029_wubba_lubba_dub_dub.mp3') }   // the activation bark (legacy pool ultActivate)
  if (k === 12) sfx(ctx, 'charge_hum_rise', 0.6)
  if (k === U.shot - 4) sfx(ctx, 'warp_wobble_01', 0.75)
  if (k === U.shot) { strike(U.raw.shot, 'shot', 0.5); c.hold = U.stop.shot; cam?.shake?.(8, 8); sfx(ctx, 'crack_sizzle_bright', 0.8); sfx(ctx, 'impact_hit_01', 0.8); dmgNumber(ctx) }
  if (k === U.shot + 6) sfx(ctx, 'warp_wobble_02', 0.8)
  const D = dimAt(k)
  if (D) {
    if (D.local === 0) { sfx(ctx, D.i & 1 ? 'warp_wobble_02' : 'warp_wobble_01', 0.85); sfx(ctx, 'swish_fast_0' + (1 + (D.i % 3)), 0.6) }
    if (D.local === U.dimHit - 4) sfx(ctx, D.i % 2 ? 'whoosh_medium_02' : 'whoosh_medium_01', 0.7)
    if (D.local === U.dimHit) {
      strike(U.raw.dim, 'dim' + D.i, 0.6 + D.i * 0.1); c.hold = U.stop.dim; cam?.shake?.(10 + D.i * 2, 10)
      sfx(ctx, 'hit_heavy_boom_01', 0.75 + D.i * 0.04); sfx(ctx, ['impact_crack_01', 'boom_medium_01', 'impact_hit_01', 'boom_medium_02', 'boom_medium_01'][D.i], 0.75)
      if (D.i === 4) sfx(ctx, 'crack_sizzle_bright', 0.6)
      dmgNumber(ctx)
      if (D.i === 1) voice(ctx, 'rick_035_get_morphed_dweeb.mp3')
      if (D.i === 3) voice(ctx, 'rick_038_eat_it.mp3')
    }
  }
  if (k === U.drop) { sfx(ctx, 'warp_wobble_01', 0.85); sfx(ctx, 'whoosh_medium_02', 0.7) }
  if (k === U.land) { c.hold = U.stop.land; cam?.shake?.(14, 12); c.impacts.push({ kind: 'land', k, r: c.real, power: 0.7, dealt: 0 }); sfx(ctx, 'boom_medium_02', 0.8); sfx(ctx, 'impact_hit_01', 0.7) }
  if (k === U.land + 4) { voice(ctx, 'rick_059_meeseeks_go.mp3'); sfx(ctx, 'warp_wobble_02', 0.7) }
  U.seeks.forEach((at, i) => {
    if (k === at - 3) sfx(ctx, 'swish_fast_0' + (1 + i), 0.65)
    if (k === at) { strike(U.raw.seek, 'seek' + i, 0.45 + i * 0.1); c.hold = U.stop.seek; cam?.shake?.(6 + i * 3, 6); sfx(ctx, 'hit_flurry_01', 0.7); sfx(ctx, 'impact_hit_01', 0.6 + i * 0.1); dmgNumber(ctx) }
  })
  if (k === U.device) { voice(ctx, 'rick_030_it_s_called_a_deterrent.mp3'); sfx(ctx, 'energy_tone_hold', 0.6) }
  U.count.forEach((at, i) => { if (k === at) { sfx(ctx, 'sting_pitch_rise_hold', 0.55 + i * 0.15); sfx(ctx, 'impact_crack_01', 0.45 + i * 0.15); cam?.shake?.(3 + i * 3, 6) } })
  if (k === U.count[0] + 4) sfx(ctx, 'charge_swell_riser', 0.9)
  if (k === U.suck - 2) sfx(ctx, 'pitch_drop_slowmo', 0.8)
  if (k === U.suck) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === U.boom) {
    if (!c.done.boom) { c.done.boom = true; if (!c.ko) strike(U.raw.boom, 'boom', 1.4) }
    c.hold = U.stop.boom; cam?.shake?.(36, 36); c.impacts.push({ kind: 'blast', k, r: c.real, power: 1.4, dealt: 0 })
    sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_frame_boom_long', 0.95); sfx(ctx, 'boom_huge_01', 0.8); dmgNumber(ctx, 'boom')
  }
  if (k === U.boom + 2) voice(ctx, 'rick_032_boom.mp3')     // the payoff bark (legacy pool ultPayoff) — it CONNECTED
  if (k === U.boom + 12) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === U.landAt) { cam?.shake?.(12, 12); c.impacts.push({ kind: 'land', k, r: c.real, power: 0.6, dealt: 0 }); sfx(ctx, 'boom_medium_01', 0.75); sfx(ctx, 'impact_hit_01', 0.7) }
  if (k === U.portal) sfx(ctx, 'warp_wobble_01', 0.8)
  if (k === U.cool) voice(ctx, 'rick_031_oh_shit_well_that_s_cool.mp3')
}

// the foe's launch after the detonation (centre x, feet y) — pure
export function launchAt(k) {
  const u = clamp((k - U.boom) / (U.landAt - U.boom), 0, 1)
  return { x: c.tx0 + (c.landX - c.tx0) * u, feet: c.floor - Math.sin(Math.PI * u) * 190, u }
}
function cast_(f, move, timer = 30) { f._spriteCastMove = move; f._spriteCastTimer = timer }
// fighters' positions / poses for script frame c.k (also during hit-stop, so they stay pinned)
function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.dir, th = t.h || 100, fh = f.h || 100
  c.pk = k
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  // ── the foe ──
  let tx = c.tx0, tf = c.floor, air = false, ta = 1
  if (k >= U.shot && k < U.intoPortal) { const u = smooth((k - U.shot) / (U.intoPortal - U.shot)); tx = c.tx0 + (c.portalX - c.tx0) * u; tf = c.floor - Math.sin(Math.PI * u) * 22; air = true; ta = 1 - smooth((k - U.shot - 6) / 6) }
  else if (k >= U.intoPortal && k < U.drop) { tx = c.portalX; ta = 0; air = true }              // off in the multiverse (drawn by rickUltFx in each cut)
  else if (k >= U.drop && k < U.land) { const u = (k - U.drop) / (U.land - U.drop); tx = c.tx0; tf = c.floor - 300 * (1 - u * u); air = true; ta = 1 }
  else if (k >= U.boom) { const L = launchAt(k); tx = L.x; tf = L.feet; air = L.u < 1 }
  if (k >= U.land && k < U.boom) tx = c.tx0
  t.x = Math.round(tx - (t.w || 60) / 2); t.y = Math.round(Math.min(tf, c.floor) - th)
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999); t.onGround = !air; t.grounded = !air
  t.facing = -d; t._fxAlpha = ta
  if (k >= U.landAt && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 30) }
  // ── Rick ──
  let fx = c.fx0, fa = 1
  if (k >= U.boom && k < U.stepOut) fa = 0                                                        // he was IN the blast
  if (k >= U.stepOut) { fx = c.homeX + d * 18 * smooth((k - U.stepOut) / 14); fa = smooth((k - U.stepOut) / 4) }
  f.x = Math.round(fx - (f.w || 60) / 2); f.y = c.floor - fh; f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = d; f._fxAlpha = fa
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  // poses (real sheets): taunt (burp) → gunShot → (cuts: gunShot / kick / meeseeksThrow / heavy / rocket) → meeseeksThrow → selfDestruct → walk
  const D = dimAt(k)
  if (k < U.shot - 8) cast_(f, 'taunt')
  else if (k < U.intoPortal) cast_(f, 'gunShot')
  else if (D) cast_(f, ['gunShot', 'portalTravel', 'meeseeksThrow', 'rocket', 'gunShot'][D.i])
  else if (k < U.device) cast_(f, 'meeseeksThrow')
  else if (k < U.boom) cast_(f, 'selfDestruct')
  else if (k < U.stepOut) cast_(f, 'portalTravel')
  else if (k < U.cool + 8) cast_(f, 'walk')
  else cast_(f, 'taunt')
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  const last = c.impacts[c.impacts.length - 1], since = last ? c.k - last.k : 99
  const punch = since < 6 ? 0.25 * (1 - since / 6) * (last.power || 1) : 0
  const box = (x, feetY, h = 100) => ({ x: x - 30, y: feetY - h, w: 60, h })
  if (k < U.shot - 6) cam.focusOnFighter(f, 1.75)                                               // push in on Rick: the burp
  else if (k < U.dim0) cam.focusBetween?.(f, box(c.portalX, c.floor), 1.3 + punch)              // the shot + the wall portal
  else if (k < U.drop) cam.focusOnFighter(box(c.portalX, c.floor), 1.2)                         // (the multiverse cuts own the screen)
  else if (k < U.device) cam.focusOnFighter(t, 1.45 + punch)                                    // the drop + the Meeseeks pile
  else if (k < U.count[0]) cam.focusOnFighter(f, 1.85)                                          // the device
  else if (k < U.boom) cam.focusBetween?.(f, t, 1.25 + 0.4 * smooth((k - U.count[0]) / (U.boom - U.count[0])))   // countdown: creep in
  else if (k < U.landAt - 10) cam.focusOnFighter(box(c.fx0, c.floor), 0.62)                      // PULL OUT for the blast
  else if (k < U.portal) cam.focusBetween?.(box(c.fx0, c.floor), t, 0.95)
  else cam.focusOnFighter(box(c.homeX, c.floor), 1.5)                                            // Rick strolls out
}

function restoreCam() { const cam = c.cam, sv = c.camSaved; if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep } }
function restoreFighters(final) {
  const f = c.caster, t = c.target, s = c.save || {}
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.y = c.floor - (t.h || 100); t.onGround = true; t.grounded = true
    t._fxAlpha = s.tA; if (s.tA == null) delete t._fxAlpha; t._fxRecord = s.tR; if (s.tR == null) delete t._fxRecord
    if (final && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 100); f.onGround = true; f.grounded = true
    f._spriteCastMove = null; f._spriteCastTimer = 0; if (final) f.attackCooldown = 16
    f._fxAlpha = s.fA; if (s.fA == null) delete f._fxAlpha; f._fxRecord = s.fR; if (s.fR == null) delete f._fxRecord }
}
function finish() { restoreFighters(true); restoreCam(); reset() }
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
// Every reset path (round reset, rematch, KO teardown, menu): restore both fighters and the camera, drop the scene.
export function clear() { if (!c.active) return; restoreFighters(false); restoreCam(); reset() }

registerFreezeCine('rick_self_destruct', { active: isRickUltActive, update, clear })
registerUltCast('rick', cast)
