// ippoUlt.js — Ippo Makunouchi (ippo) ULTIMATE "DEMPSEY ROLL" as a FROZEN CINEMATIC (2026-11-24 roster ultimate pass, owner:
// "give every character their own special ultimate"). Replaces the legacy inline Dempsey Roll (abilities.executeIppoUltimate —
// left untouched, simply no longer reached) through cineRegistry.js:
//   registerUltCast('ippo')     → cast(): same gate (not attacking / no attack cooldown) + same cost (100 Guts) + the same
//                                 sure-hit, range-independent barrage as the legacy ult (it never had an opener).
//   registerFreezeCine('ippo_dempsey') → while active game.js freezes combat / physics / input and calls update(ctx).
// BEATS (script frames k, 60 fps; hit-stop holds k for a few real frames on every hook, 26 on the Gazelle):
//   PEEK-A-BOO  0-40    the arena dims to a ring spotlight, ropes behind; camera pushes in on his guard; "Slug it out!"
//   DASH       40-52    he drops low and closes the gap in a blur
//   WEAVE      52-104   the ∞ figure-eight weave: a glowing infinity trail, after-images; DEMPSEY ROLL title slam
//   THE ROLL  104-190   12 alternating hooks on the weave's apexes, ACCELERATING; head snapping side to side, sweat spray,
//                       hit-stop + escalating shake per hook, crowd flashes, a hit counter
//   FINISH    190-214   slow-motion: the world drains red, he coils low — "This is the finish!" — GAZELLE PUNCH
//   GAZELLE   214       rising full-body uppercut → white / inverted frames → screen-wide arc; the foe is launched, spinning
//   DOWN!     252-306   the foe hits the canvas, the bell rings, he raises his gloves under the spotlight
// DAMAGE: 12 hooks × 20 raw + 140 Gazelle = 380 raw through applyScaledDamage (legacy 4×50 + 130 = 330 raw → +15 %); a held
// guard chips 25 % of every hit (same rule as the legacy applyIppoUltHit) and is never launched.
// SIM: every position is a pure function of the script frame + the layout taken at cast (no Math.random / clock). Render:
// ippoUltFx.js reads ippoUltScene() (never writes here).
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { drawIppoUltScreen, preloadIppoUlt, IPPO_T as T, IPPO_HOOKS as HOOKS, weaveOff } from './ippoUltFx.js'
import { playIppoUltSound } from './ippoUltSound.js'

export const B = { cost: 100, upperRaw: 140, blockMult: 0.25, gap: 64, amp: 16, launchH: 190, slide: 250 }
const VOICE = { start: 'ippo_098.mp3', finish: 'ippo_140.mp3' }

const c = { active: false }
export const isIppoUltActive = () => !!c.active
export const ippoUltScene = () => (c.active ? c : null)
export const getIppoUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, hooks: c.hooks | 0, dmg: Math.round(c.dmg || 0), blocked: !!c.blocked, ko: !!c.ko })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'ippo') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated) return undefined
  if (!f.infiniteEnergy) { if ((f.energy || 0) < B.cost) return false; f.energy = Math.max(0, (f.energy || 0) - B.cost) }
  const stage = context?.worldWidth || 3200
  const dir = ctrX(t) >= ctrX(f) ? 1 : -1
  const blocked = !!t.isBlocking
  const tx0 = clamp(ctrX(t), 140, stage - 140)
  const fx1 = tx0 - dir * B.gap
  const land = clamp(tx0 + dir * (blocked ? 60 : B.slide), 80, stage - 80)
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, stage, dir, floor: feet(f), tFloor: feet(t), blocked,
    fx0: ctrX(f), fx1, tx0, land, amp: B.amp, phase: 0, hooks: 0, dmg: 0, ko: false, done: {}, cam: null, camSaved: null,
    lastHitReal: null, lastHitK: -1, lastHitSide: 1, lastHitPow: 1, upperReal: null, fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha })
  f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
  t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxAlpha = 0; t._fxAlpha = 0
  try { preloadIppoUlt(f, t) } catch (_) {}
  return true
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }
const synth = (ctx, id) => { try { playIppoUltSound(ctx?.sound, id) } catch (_) {} }

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.06; cam.maxPanStep = 80 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  const k = c.frame
  beats(ctx, k)
  advancePhase(k)
  place()
  camera(cam, k)
  if (++c.frame > T.total) finish()
}

// the weave's phase: steady in the WEAVE, accelerating through the ROLL so every hook lands on an apex
function advancePhase(k) {
  if (k < T.weave || k >= T.finish) return
  if (k < T.roll) { c.phase += 0.2; return }
  const u = (k - T.roll) / (T.finish - T.roll)
  c.phase += 0.24 + 0.34 * u
}

function beats(ctx, k) {
  const cam = ctx.camera
  if (k === 0) { sfx(ctx, 'whoosh_medium_01', 0.5); synth(ctx, 'bell'); voice(ctx, VOICE.start) }
  if (k === 14) sfx(ctx, 'energy_hum_low', 0.55)
  if (k === T.dash) { sfx(ctx, 'swish_fast_03', 0.9); sfx(ctx, 'whoosh_medium_02', 0.6) }
  if (k === T.weave + 6) { sfx(ctx, 'boom_medium_02', 0.8); cam?.shake?.(6, 8); synth(ctx, 'crowd') }
  if (k >= T.weave && k < T.roll && (k - T.weave) % 8 === 0) sfx(ctx, (k >> 3) & 1 ? 'swish_fast_01' : 'swish_fast_02', 0.45)
  if (k === T.roll - 10) sfx(ctx, 'charge_hum_rise', 0.7)
  for (const h of HOOKS) if (k === h.at && !c.done['h' + h.at]) { c.done['h' + h.at] = true; hook(ctx, h) }
  if (k === T.finish) { sfx(ctx, 'pitch_drop_slowmo', 0.9); voice(ctx, VOICE.finish); synth(ctx, 'heart') }
  if (k === T.finish + 10) { sfx(ctx, 'charge_swell_riser', 0.9); synth(ctx, 'heart') }
  if (k === T.upper - 6) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === T.upper && !c.done.upper) {
    c.done.upper = true; c.upperReal = c.real
    strike(B.upperRaw, 'ippoGazelleFinish')
    c.hold = 26
    cam?.shake?.(20, 40)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'impact_crack_01', 0.9)
  }
  if (k === T.upper + 4) { sfx(ctx, 'whoosh_medium_02', 0.9); synth(ctx, 'crowd') }
  if (k === T.upper + 16) sfx(ctx, 'rumble_tail_01', 0.8)
  if (k === T.down && !c.blocked) { sfx(ctx, 'boom_medium_01', 0.9); sfx(ctx, 'impact_hit_01', 0.8); cam?.shake?.(10, 12) }
  if (k === T.down + 2) synth(ctx, 'bells')
}

function hook(ctx, h) {
  const i = c.hooks, pow = 1 + i / (HOOKS.length - 1)
  strike(h.raw, 'ippoDempseyHook')
  c.hooks++
  c.lastHitReal = c.real; c.lastHitK = h.at; c.lastHitSide = h.side; c.lastHitPow = pow
  c.hold = i < 4 ? 3 : i < 8 ? 2 : 2
  ctx.camera?.shake?.(Math.round(4 + 6 * pow), 8)
  sfx(ctx, i & 1 ? 'impact_hit_01' : 'hit_heavy_boom_01', 0.5 + 0.25 * pow)
  if (i % 3 === 2) sfx(ctx, 'hit_flurry_01', 0.6)
  sfx(ctx, i & 1 ? 'swish_fast_01' : 'swish_fast_02', 0.5)
}

function strike(raw, move) {
  const t = c.target
  if (!t || !(t.health > 0)) return
  const before = t.health
  const r = c.blocked ? Math.round(raw * B.blockMult) : raw
  try { applyScaledDamage(t, r, { source: 'ippo-ultimate', move }) } catch (_) {}
  c.dmg += Math.max(0, before - t.health)
  t.colorFlash = 10
  const f = c.caster; if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) c.ko = true
}

// the foe's path after the Gazelle (world centre x, feet y) — pure
export function foeAt(k) {
  if (k < T.upper || c.blocked) {
    const shove = c.blocked && k >= T.upper ? smooth((k - T.upper) / 24) : 0
    return { x: c.tx0 + (c.land - c.tx0) * shove, y: c.tFloor, air: false }
  }
  const u = clamp((k - T.upper) / (T.down - T.upper), 0, 1)
  return { x: c.tx0 + (c.land - c.tx0) * u, y: c.tFloor - B.launchH * 4 * u * (1 - u), air: u < 1 }
}

function place() {
  const k = c.frame, f = c.caster, t = c.target
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  let x
  if (k < T.dash) x = c.fx0
  else if (k < T.weave) x = c.fx0 + (c.fx1 - c.fx0) * smooth((k - T.dash) / (T.weave - T.dash))
  else if (k < T.finish) x = c.fx1 + weaveOff(c.phase, c.amp).x
  else if (k < T.upper) x = c.fx1 - c.dir * 8
  else x = c.fx1 + c.dir * 10
  f.x = Math.round(x - (f.w || 48) / 2); f.y = c.floor - (f.h || 94)
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = c.dir; f._fxAlpha = 0
  const p = foeAt(k)
  t.x = Math.round(p.x - (t.w || 48) / 2); t.y = Math.round(Math.min(p.y, c.tFloor) - (t.h || 94))
  t.vx = 0; t.vy = 0; t.isBlocking = c.blocked && k < T.down; t.hitstun = Math.max(t.hitstun || 0, 9999)
  t.onGround = !p.air; t.grounded = !p.air; t._fxAlpha = 0
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  if (k < T.dash) cam.focusOnFighter(f, 1.6)
  else if (k < T.roll) cam.focusBetween?.(f, t, 1.35)
  else if (k < T.finish) cam.focusBetween?.(f, t, 1.45 + 0.2 * smooth((k - T.roll) / (T.finish - T.roll)))
  else if (k < T.upper) cam.focusOnFighter(f, 1.7)
  else if (k < T.down) cam.focusBetween?.(f, box(foeAt(k).x, foeAt(k).y - 47), 0.8)
  else cam.focusBetween?.(f, box(c.land, c.tFloor - 47), 1.15)
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
    if (c.blocked) t.blockstun = Math.max(t.blockstun || 0, 22)
    else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 44); t.hitstun = 20 }
  }
  if (f) { try { clearInputBuffer(f) } catch (_) {}
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); f.vx = 0; f.vy = 0
    f.x = Math.round(c.fx1 + c.dir * 10 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
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
export const clearIppoUlt = clear

registerUltCast('ippo', cast)
registerFreezeCine('ippo_dempsey', { active: isIppoUltActive, update, clear })
registerCineScreen('ippo_dempsey', (ctx, canvas) => drawIppoUltScreen(ctx, canvas, ippoUltScene()))
