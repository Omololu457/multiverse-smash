// soldierBoyUlt.js — Soldier Boy (soldier_boy) ULTIMATE "NUCLEAR BURST" as a FROZEN CINEMATIC (2026-11-24, owner: "give every
// character their own special ultimate"). Replaces the legacy inline radial blast (abilities.executeSoldierBoyUltimate — left
// untouched, simply no longer reached while the foe is in the blast radius) through cineRegistry.js:
//   registerUltCast('soldier_boy') → cast(): same gates (not attacking / no cooldown / cinematicSafe), same cost (the full 100
//                                    Nuclear Charge, ends Armed Mode), same 3 radial contacts (80 + 80 + 120 raw through
//                                    applyScaledDamage, unblockable like the legacy blast). Foe outside the 360 px radius
//                                    (or invulnerable) at the press → undefined = the legacy blast handles the whiff.
//   registerFreezeCine('soldier_boy_nuke') → while active game.js freezes combat / physics / input and calls update(ctx).
// BEATS (script frames k, 60 fps; hit-stop holds k for B.stop real frames on the detonation):
//   "YOU HAVE NO IDEA…" 0-46   letterbox, push in on his face; he hunches, a green glow leaking out of his chest, geiger flecks
//   CRITICAL MASS      46-96   NUCLEAR BURST title + trefoil; the world sickens green; floor cracks glow; debris lifts
//   PULSE ×2           96 / 128 two radiation shock rings (80 + 80): the foe staggers back shielding their eyes
//   THE BREATH        150-168  "GET BACK!" — the world goes black, only his white-hot body left; push in on the chest
//   DETONATION        168      white frame → silhouettes → the sphere swallows the screen (120); hit-stop; foe blasted away
//   FALLOUT           200-262  pull out: the mushroom cloud rises, embers + ash, a glowing crater ring
//   STILL STANDING    262-312  steam off his shoulders, the shield raised: "The original. Still standing."
// SIM: positions are pure functions of the script frame + the layout taken at cast (no Math.random / clock).
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { drawSoldierBoyUltScreen, preloadSoldierBoyUlt, SB_T } from './soldierBoyUltFx.js'

export const B = { cost: 100, radius: 360, hits: [80, 80, 120], stop: 24, total: 312, flyT: 64, flyX: 320, flyH: 170, ...SB_T }

const c = { active: false }
export const isSoldierBoyUltActive = () => !!c.active
export const soldierBoyUltScene = () => (c.active ? c : null)
export const getSoldierBoyUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, dmg: Math.round(c.dmg || 0), hits: c.hits | 0, ko: !!c.ko, caster: c.caster?.side || null })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'soldier_boy') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  if (context && context.cinematicSafe === false) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated || !(t.health > 0)) return undefined
  if (Math.hypot((t.x || 0) - (f.x || 0), (t.y || 0) - (f.y || 0)) > B.radius || (t.invulnTimer || 0) > 0) return undefined   // out of the blast → legacy
  if (!f.infiniteEnergy) { if ((f.energy || 0) < B.cost) return false; f.energy = Math.max(0, (f.energy || 0) - B.cost) }
  f._sbArmed = false; f._sbArmedTimer = 0                                   // the nuke ends Armed Mode (as the legacy ult)
  const stage = context?.worldWidth || 3200
  const dir = ctrX(t) >= ctrX(f) ? 1 : -1
  const tx0 = ctrX(t)
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, stage, dir, floor: feet(f), tFloor: feet(f),
    fx0: ctrX(f), tx0, land: clamp(tx0 + dir * B.flyX, 70, stage - 70), dmg: 0, hits: 0, ko: false, done: {}, cam: null, camSaved: null,
    airborne: false, fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha, seed: ((context?.seed >>> 0) || 1) })
  f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0; f._sbNukeFlash = 0
  t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0; t.isBlocking = false
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxAlpha = 0; t._fxAlpha = 0
  try { preloadSoldierBoyUlt(f, t) } catch (_) {}
  return true
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  const k = c.frame
  if (c.ko && k > B.boomAt + 4 && k < B.falloutAt) c.frame = B.falloutAt   // KO: skip to the fallout
  beats(ctx, c.frame)
  place()
  camera(cam, c.frame)
  if (++c.frame > B.total) finish()
}

function beats(ctx, k) {
  const cam = ctx.camera
  if (k === 0) { sfx(ctx, 'energy_hum_low', 0.7); sfx(ctx, 'whoosh_medium_02', 0.5) }
  if (k === 12 || k === 22 || k === 30 || k === 37 || k === 43) sfx(ctx, 'crack_sizzle_bright', 0.35 + k / 120)   // the geiger counter
  if (k === B.critAt) { sfx(ctx, 'charge_swell_riser', 0.95); sfx(ctx, 'boom_medium_02', 0.7); cam?.shake?.(6, 10) }
  if (k === B.critAt + 20) sfx(ctx, 'sting_pitch_rise_hold', 0.8)
  if (k === B.critAt + 34) sfx(ctx, 'warp_wobble_01', 0.7)
  if (k === B.pulse1) { pulse(0); sfx(ctx, 'impact_hit_01', 0.9); sfx(ctx, 'boom_medium_01', 0.85); sfx(ctx, 'crack_sizzle_bright', 0.8); cam?.shake?.(10, 14) }
  if (k === B.pulse1 + 12) sfx(ctx, 'charge_hum_rise', 0.8)
  if (k === B.pulse2) { pulse(1); sfx(ctx, 'hit_heavy_boom_01', 0.9); sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'warp_wobble_02', 0.7); cam?.shake?.(14, 18) }
  if (k === B.suckAt) { sfx(ctx, 'pitch_drop_slowmo', 0.9); sfx(ctx, 'boom_anticipation_suck', 1) }
  if (k === B.boomAt && !c.done.boom) {
    c.done.boom = true; c.boomReal = c.real; pulse(2); c.hold = B.stop;
    cam?.shake?.(22, 50)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_huge_01', 0.95)
    try { ctx?.sound?.playSoldierBoy?.('sb_nuke', 1, (c.seed ^ 0x5b0f) >>> 0 || 1) } catch (_) {}
  }
  if (k === B.boomAt + 6) { sfx(ctx, 'rumble_tail_01', 1); cam?.shake?.(16, 40) }
  if (k === B.boomAt + 40) sfx(ctx, 'rumble_tail_01', 0.8)
  if (k === B.boomAt + B.flyT) { sfx(ctx, 'impact_hit_01', 0.7); sfx(ctx, 'boom_medium_01', 0.6); cam?.shake?.(8, 10) }
  if (k === B.standAt) sfx(ctx, 'energy_tone_hold', 0.4)
}

// a radial contact — the legacy numbers (80 / 80 / 120 raw), unblockable, through applyScaledDamage
function pulse(i) {
  const t = c.target, f = c.caster
  if (!t || !(t.health > 0)) return
  const before = t.health
  try { applyScaledDamage(t, B.hits[i], { attacker: f, move: 'ultimate', source: 'ability', tier: 'big' }) } catch (_) {}
  c.dmg += Math.max(0, before - t.health); c.hits++
  t.colorFlash = 12
  if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) c.ko = true
}

export function foeAt(k) {   // foe centre x / feet y — pure
  const d = c.dir
  if (k < B.pulse1) return { x: c.tx0, y: c.tFloor }
  if (k < B.boomAt) { const push = 22 * smooth((k - B.pulse1) / 10) + 26 * smooth((k - B.pulse2) / 10); return { x: c.tx0 + d * push, y: c.tFloor } }
  const x0 = c.tx0 + d * 48, u = clamp((k - B.boomAt) / B.flyT, 0, 1)
  return { x: x0 + (c.land - x0) * (1 - (1 - u) * (1 - u)), y: c.tFloor - B.flyH * 4 * u * (1 - u), air: u < 1 }
}
function place() {
  const k = c.frame, f = c.caster, t = c.target
  c.pf = k
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94)
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = c.dir; f._fxAlpha = 0
  const p = foeAt(k)
  c.airborne = !!p.air
  t.x = Math.round(p.x - (t.w || 48) / 2); t.y = Math.round(Math.min(p.y, c.tFloor) - (t.h || 94))
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999)
  t.onGround = !p.air; t.grounded = !p.air; t._fxAlpha = 0
}
function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  if (k < B.critAt) cam.focusOnFighter(f, 1.7)
  else if (k < B.pulse1) cam.focusOnFighter(f, 1.35)
  else if (k < B.suckAt) cam.focusBetween?.(f, t, 1.1)
  else if (k < B.boomAt) cam.focusOnFighter(f, 1.6)
  else if (k < B.falloutAt + 10) cam.focusOnFighter(box(c.fx0 + c.dir * 120, c.floor - 200), 0.62)   // PULL OUT: the blast + the cloud
  else if (k < B.standAt) cam.focusBetween?.(f, box(c.land, c.tFloor - 47), 0.8)
  else cam.focusOnFighter(f, 1.3)
  void t
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
    t.x = Math.round(c.land - (t.w || 48) / 2); t.y = c.tFloor - (t.h || 94); t.vx = 0; t.vy = 0; t.onGround = true; t.grounded = true
    t.hitstun = 0; t.isBlocking = false
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40); t.hitstun = 18 }
  }
  if (f) { try { clearInputBuffer(f) } catch (_) {}
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 16); f.vx = 0; f.vy = 0
    f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
export function clear() {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.isBlocking = false; if (t.y + (t.h || 94) < c.tFloor) t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
export const clearSoldierBoyUlt = clear

registerUltCast('soldier_boy', cast)
registerFreezeCine('soldier_boy_nuke', { active: isSoldierBoyUltActive, update, clear })
registerCineScreen('soldier_boy_nuke', (ctx, canvas) => drawSoldierBoyUltScreen(ctx, canvas, soldierBoyUltScene()))
