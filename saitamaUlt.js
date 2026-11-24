// saitamaUlt.js — Saitama (saitama) ULTIMATE "SERIOUS SERIES: SERIOUS PUNCH" as a FROZEN CINEMATIC (2026-11-24, owner: "make
// more cinematic ultimates … the same way you did with the other ones"). Replaces the legacy inline Death Punch
// (abilities.executeSaitamaUltimate — left untouched, simply no longer reached) through cineRegistry.js:
//   registerUltCast('saitama')   → cast(): same gate (not attacking / no attack cooldown) + same cost (100) + same sure-hit,
//                                  range-independent payoff as the legacy ult (340 raw → 204 through applyScaledDamage,
//                                  a held guard chips 25 % = 85 raw → 51).
//   registerFreezeCine('saitama_serious') → while active game.js freezes combat / physics / input and calls update(ctx).
// BEATS (script frames k, 60 fps; hit-stop holds k for B.stop real frames on the punch):
//   DEADPAN   0-44   letterbox in, camera pushes in on the bored face; "In that case, I'm using my finishing move too."
//   SERIOUS  44-96   the world drops to black-red; the rare SERIOUS face close-up (eyes shadowed, one white glint); SERIOUS SERIES
//   WIND-UP  96-168  time slows (desaturated, drifting dust, floating pebbles, cracks spreading from his feet, wind sucked into
//                    the fist); SERIOUS PUNCH title slam; the camera creeps onto the cocked fist
//   PUNCH    168     lunge → white frame → inverted frame → the giant-fist panel; hit-stop; the payoff lands
//   THE SKY  172-250 shockwave wall across the stage, the cloud deck splits along the punch line, planet-scale dust ring,
//                    the foe is blasted up into the stratosphere (a twinkle)
//   "…OK."   250-322 colour returns, a lone leaf, the deadpan stand: "All right." — the foe falls back down far away
// SIM: every position is a pure function of the script frame + the layout taken at cast (no Math.random / clock). Render:
// saitamaUltFx.js reads saitamaUltScene() (never writes here).
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { drawSaitamaUltScreen, preloadSaitamaUlt } from './saitamaUltFx.js'

export const B = {
  cost: 100, raw: 440, blockMult: 0.25,   // 2026-11-24 owner buff: 340 → 440 raw (264 dealt; guard chip 25 % = 110 raw → 66)
  seriousAt: 44, windAt: 96, titleAt: 128, lungeAt: 160, punchAt: 172, launchAt: 186, skyEnd: 250, okAt: 262, fallAt: 296, landAt: 314, outAt: 306, total: 324,
  stop: 32,            // real frames the punch holds (hit-stop): the fist IN the body, white / inverted frames, the fist panel
  reach: 50,           // world px from his centre to the knuckles on the punch frame (saitama_death2 f4: 25 src px × spriteScale 2)
  sink: 8,             // how far the knuckles drive INTO the foe's body (past their centre-line front) on contact
  launchH: 1400,       // how high the foe goes (world px) before it is "in the stratosphere"
  slide: 360,          // how far away the foe comes back down
}
const VOICE = { finishing: 'saitama_finishing_move_066.9s.mp3', ok: 'saitama_bark_04_0168.8s.mp3' }

const c = { active: false }
export const isSaitamaUltActive = () => !!c.active
export const saitamaUltScene = () => (c.active ? c : null)
export const getSaitamaUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, dmg: Math.round(c.dmg || 0), blocked: !!c.blocked, ko: !!c.ko, caster: c.caster?.side || null })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }

// ── CAST (abilities.triggerUltimate → castRegisteredUlt) ─────────────────────────────────────────────────────────────
function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'saitama') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated) return undefined                                  // no foe → the legacy path handles it
  if (!f.infiniteEnergy) { if ((f.energy || 0) < B.cost) return false; f.energy = Math.max(0, (f.energy || 0) - B.cost) }
  const stage = context?.worldWidth || 3200
  const dir = ctrX(t) >= ctrX(f) ? 1 : -1
  const floor = feet(f)
  const blocked = !!t.isBlocking
  const land = clamp(ctrX(t) + dir * (blocked ? 150 : B.slide), 80, stage - 80)
  const fx1 = ctrX(t) - dir * (B.reach + 18 - B.sink)                       // where he plants so the fist lands ON the body (foe half-width ≈ 18)
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, stage, dir, floor, tFloor: feet(t), blocked,
    fx0: ctrX(f), fx1, tx0: ctrX(t), land, dmg: 0, ko: false, done: {}, cam: null, camSaved: null,
    fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha })
  f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
  f._saitamaDeathTimer = 0                                                  // the legacy overlay never runs alongside
  t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxAlpha = 0; t._fxAlpha = 0                                            // both are drawn by saitamaUltFx (real sheets)
  try { preloadSaitamaUlt(f, t) } catch (_) {}
  return true
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }

// ── UPDATE (one frame; game.js freezes everything else) ──────────────────────────────────────────────────────────────
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
  if (++c.frame > B.total) finish()
}

function beats(ctx, k) {
  const f = c.caster, t = c.target, cam = ctx.camera
  if (k === 0) { sfx(ctx, 'whoosh_medium_01', 0.5); voice(ctx, VOICE.finishing) }
  if (k === B.seriousAt) { sfx(ctx, 'pitch_drop_slowmo', 0.9); sfx(ctx, 'sting_pitch_rise_hold', 0.8) }
  if (k === B.seriousAt + 16) { sfx(ctx, 'impact_crack_01', 0.9); cam?.shake?.(6, 8) }
  if (k === B.windAt) { sfx(ctx, 'charge_swell_riser', 0.95); sfx(ctx, 'energy_hum_low', 0.8) }
  if (k === B.titleAt) { sfx(ctx, 'boom_medium_02', 0.85); cam?.shake?.(8, 10) }
  if (k === 140) sfx(ctx, 'charge_hum_rise', 0.8)
  if (k === 156) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === B.lungeAt) { sfx(ctx, 'swish_fast_03', 0.9); sfx(ctx, 'whoosh_medium_01', 0.7) }
  if (k === B.launchAt) { sfx(ctx, 'boom_huge_02_roar', 0.9); sfx(ctx, 'whoosh_medium_02', 0.9); cam?.shake?.(18, 24) }   // the blast-off
  if (k === B.punchAt && !c.done.punch) {
    c.done.punch = true; c.punchReal = c.real
    strike()
    c.hold = B.stop
    cam?.shake?.(18, 40)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'hit_heavy_boom_01', 0.95); sfx(ctx, 'impact_crack_01', 0.9)
  }
  if (k === B.punchAt + 4) { sfx(ctx, 'boom_huge_01', 0.9); cam?.shake?.(18, 30) }
  if (k === B.punchAt + 12) sfx(ctx, 'rumble_tail_01', 1)
  if (k === B.punchAt + 40) sfx(ctx, 'rumble_tail_01', 0.7)
  if (k === 222 && !c.blocked) sfx(ctx, 'crack_sizzle_bright', 0.6)            // the twinkle up in the stratosphere
  if (k === B.okAt) voice(ctx, VOICE.ok)
  if (k === B.landAt && !c.blocked) { sfx(ctx, 'boom_medium_01', 0.8); sfx(ctx, 'impact_hit_01', 0.7); cam?.shake?.(8, 10) }
  void f; void t
}

// THE PAYOFF — one application, exactly the legacy numbers (sure-hit, range-independent; a held guard chips 25 %)
function strike() {
  const t = c.target
  if (!t || !(t.health > 0)) return
  const before = t.health
  const raw = c.blocked ? Math.round(B.raw * B.blockMult) : B.raw
  try { applyScaledDamage(t, raw, { source: 'ability', move: 'saitamaDeathPunch' }) } catch (_) {}
  c.dmg += Math.max(0, before - t.health)
  t.colorFlash = 16
  const f = c.caster; if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) c.ko = true
}

// the foe's flight after the punch (world centre x, feet y, scale, spin) — pure
export function foeAt(k) {
  const t = c.target, P = B.punchAt
  if (k < P) return { x: c.tx0, y: c.tFloor, air: false, u: 0 }
  const L = B.launchAt
  if (k < L) { const u = smooth((k - P) / (L - P)); return { x: c.tx0 + c.dir * 14 * u, y: c.tFloor, air: false, u: 0, contact: 1 - u * 0.5 } }   // takes the fist: folds around it, driven back a hair
  if (c.blocked) {   // guard-crushed: skids back along the ground, never leaves it
    const u = smooth((k - L) / 40)
    return { x: c.tx0 + (c.land - c.tx0) * u, y: c.tFloor, air: false, u }
  }
  if (k < B.fallAt) {   // up and away — accelerating, then gone into the stratosphere
    const u = clamp((k - L) / 50, 0, 1), e = u * u * (2.2 - 1.2 * u), x0 = c.tx0 + c.dir * 14
    return { x: x0 + c.dir * 260 * e, y: c.tFloor - B.launchH * e, air: true, u }
  }
  const u = clamp((k - B.fallAt) / (B.landAt - B.fallAt), 0, 1)   // falls straight back down far away
  return { x: c.land, y: c.tFloor - 900 * (1 - u * u), air: u < 1, u, falling: true }
  void t
}

function place() {
  const k = c.frame, f = c.caster, t = c.target
  c.pf = k
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  // Saitama: plants, then LUNGES (accelerating) the whole gap so the knuckles land in the foe's body at the impact frame;
  // follows through a step as they fold, then holds the extended punch where he stands
  const lu = k < B.lungeAt ? 0 : k < B.punchAt ? ((k - B.lungeAt) / (B.punchAt - B.lungeAt)) ** 2 : 1
  const follow = k < B.punchAt ? 0 : smooth((k - B.punchAt) / (B.launchAt - B.punchAt)) * 10
  f.x = Math.round(c.fx0 + (c.fx1 - c.fx0) * lu + c.dir * follow - (f.w || 48) / 2); f.y = c.floor - (f.h || 94)
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = c.dir; f._fxAlpha = 0
  const p = foeAt(k)
  t.x = Math.round(p.x - (t.w || 48) / 2); t.y = Math.round(Math.min(p.y, c.tFloor) - (t.h || 94))
  t.vx = 0; t.vy = 0; t.isBlocking = c.blocked && k < B.punchAt + 30; t.hitstun = Math.max(t.hitstun || 0, 9999)
  t.onGround = !p.air; t.grounded = !p.air; t._fxAlpha = 0
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  if (k < B.seriousAt) cam.focusOnFighter(f, 1.75)                                               // push in on the bored face
  else if (k < B.windAt) cam.focusOnFighter(f, 1.9)
  else if (k < B.lungeAt) cam.focusBetween?.(f, box(c.tx0, c.tFloor - 47), 1.05 + 0.25 * smooth((k - B.windAt) / 70))   // the wind-up: both, creeping in
  else if (k < B.launchAt) cam.focusBetween?.(f, box(c.tx0, c.tFloor - 47), 1.45)                                  // the lunge + the contact: fist and body in one tight shot
  else if (k < B.skyEnd) cam.focusOnFighter(box(c.fx1 + c.dir * 300, c.floor - 260), 0.55)      // PULL OUT: the sky splits
  else if (k < B.fallAt) cam.focusOnFighter(f, 1.25)                                             // "…OK."
  else cam.focusBetween?.(f, box(c.land, c.tFloor - 47), 0.85)                                   // the foe comes back down
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
    if (c.blocked) { t.blockstun = Math.max(t.blockstun || 0, 24) }
    else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 46); t.hitstun = 20 }
  }
  if (f) { try { clearInputBuffer(f) } catch (_) {}   // presses buffered before / during the freeze (the Ultimate press itself) must not replay
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); f.vx = 0; f.vy = 0
    f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
// every reset path (round reset, rematch, KO teardown, menu): restore both fighters + the camera, drop the scene
export function clear() {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.isBlocking = false; if (t.y + (t.h || 94) < c.tFloor) t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
export const clearSaitamaUlt = clear

registerUltCast('saitama', cast)
registerFreezeCine('saitama_serious', { active: isSaitamaUltActive, update, clear })
registerCineScreen('saitama_serious', (ctx, canvas) => drawSaitamaUltScreen(ctx, canvas, saitamaUltScene()))
