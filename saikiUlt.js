// saikiUlt.js — Saiki Kusuo (saiki) ULTIMATE "GIANT BOMB THROW" as a FROZEN CINEMATIC (2026-11-24 roster ultimate pass).
// Replaces the legacy delayed blast (abilities.executeSaikiUltimate — left untouched, simply no longer reached) through
// cineRegistry.js:
//   registerUltCast('saiki')   → cast(): same cost (150 = his full PSI bar) + the same sure-hit payoff as the legacy ult
//                                (legacy: a radius-300 blast centred ON the foe — it never missed); a held guard takes 50 %
//                                (the legacy oneShotUltBlockedDmg rule).
//   registerFreezeCine('saiki_bomb') → game.js freezes combat / physics / input and calls update(ctx).
// BEATS (script frames k, 60 fps):
//   DEADPAN   0-36    letterbox in, a slow push on his bored face; telepathic aside "(Good grief. This is getting annoying.)"
//   PSI      36-112   arm raised: a psychic sphere condenses above his palm and swells to the size of a car; the ground
//                     lifts (pebbles / slabs float), green PSI rings pulse off him, the foe is pinned mid-air by telekinesis
//                     (a violet hold); his limiter pins spark; GIANT BOMB THROW title slam
//   THROW   112-136   the overhand throw, slow-motion: the sphere arcs onto the pinned foe
//   BOOM    136       white frame → inverted frame → a screen-filling detonation (dome + shock rings + debris); hit-stop
//   AFTER   160-246   smoke column, the foe drops out of the sky far away; "(…That's it.)" — he turns away
// DAMAGE: 330 raw through applyScaledDamage (legacy 300 raw → +10 %); guarded = 50 % (165 raw), no launch.
// SIM: pure function of the script frame + the layout taken at cast (no Math.random / clock). Render: saikiUltFx.js.
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { drawSaikiUltScreen, preloadSaikiUlt, SAIKI_T as T } from './saikiUltFx.js'

export const B = { cost: 150, raw: 330, blockMult: 0.5, lift: 72, launchH: 520, slide: 300, stop: 22 }
const VOICE = { start: 'saiki_en_annoying.mp3', end: 'saiki_en_thats_it.mp3' }

const c = { active: false }
export const isSaikiUltActive = () => !!c.active
export const saikiUltScene = () => (c.active ? c : null)
export const getSaikiUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, dmg: Math.round(c.dmg || 0), blocked: !!c.blocked, ko: !!c.ko })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'saiki') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated) return undefined
  if (!f.infiniteEnergy) { if ((f.energy || 0) < B.cost) return false; f.energy = Math.max(0, (f.energy || 0) - B.cost) }
  const stage = context?.worldWidth || 3200
  const dir = ctrX(t) >= ctrX(f) ? 1 : -1
  const blocked = !!t.isBlocking
  const tx0 = ctrX(t)
  const land = clamp(tx0 + dir * (blocked ? 120 : B.slide), 80, stage - 80)
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, stage, dir, floor: feet(f), tFloor: feet(t), blocked,
    fx0: ctrX(f), tx0, land, dmg: 0, ko: false, done: {}, cam: null, camSaved: null, boomReal: null, fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha })
  f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
  t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxAlpha = 0; t._fxAlpha = 0
  try { preloadSaikiUlt(f, t) } catch (_) {}
  return true
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }

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
  if (++c.frame > T.total) finish()
}

function beats(ctx, k) {
  const cam = ctx.camera
  if (k === 0) { sfx(ctx, 'whoosh_medium_01', 0.4); voice(ctx, VOICE.start) }
  if (k === T.psi) { sfx(ctx, 'warp_wobble_01', 0.8); sfx(ctx, 'energy_hum_low', 0.8) }
  if (k === T.psi + 18) { sfx(ctx, 'charge_hum_rise', 0.8); sfx(ctx, 'warp_wobble_02', 0.6) }
  if (k === T.title) { sfx(ctx, 'boom_medium_02', 0.85); cam?.shake?.(6, 10) }
  if (k === T.title + 14) sfx(ctx, 'charge_swell_riser', 0.9)
  if (k > T.psi && k < T.throw && (k - T.psi) % 20 === 0) { sfx(ctx, 'energy_tone_hold', 0.35); cam?.shake?.(3, 6) }
  if (k === T.throw) { sfx(ctx, 'pitch_drop_slowmo', 0.8); sfx(ctx, 'whoosh_medium_02', 0.9) }
  if (k === T.boom - 8) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === T.boom && !c.done.boom) {
    c.done.boom = true; c.boomReal = c.real
    strike()
    c.hold = B.stop
    cam?.shake?.(24, 50)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 0.7)
  }
  if (k === T.boom + 6) sfx(ctx, 'rumble_tail_01', 1)
  if (k === T.boom + 30) sfx(ctx, 'rumble_tail_01', 0.6)
  if (k === T.after + 6) voice(ctx, VOICE.end)
  if (k === T.land && !c.blocked) { sfx(ctx, 'boom_medium_01', 0.8); sfx(ctx, 'impact_hit_01', 0.7); cam?.shake?.(8, 10) }
}

function strike() {
  const t = c.target
  if (!t || !(t.health > 0)) return
  const before = t.health
  const raw = c.blocked ? Math.round(B.raw * B.blockMult) : B.raw
  try { applyScaledDamage(t, raw, { source: 'ability', move: 'saikiGiantBomb' }) } catch (_) {}
  c.dmg += Math.max(0, before - t.health)
  t.colorFlash = 14
  const f = c.caster; if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) c.ko = true
}

// the foe: pinned and lifted by telekinesis through the PSI beat, blasted up and away at the BOOM — pure
export function foeAt(k) {
  if (c.blocked) {
    const lift = 0, shove = k < T.boom ? 0 : smooth((k - T.boom) / 30)
    return { x: c.tx0 + (c.land - c.tx0) * shove, y: c.tFloor - lift, air: false }
  }
  if (k < T.boom) { const u = smooth((k - T.psi - 20) / 40); return { x: c.tx0, y: c.tFloor - B.lift * u, air: u > 0 } }
  if (k < T.land) {
    const u = clamp((k - T.boom) / (T.land - T.boom), 0, 1), arc = 4 * u * (1 - u)
    return { x: c.tx0 + (c.land - c.tx0) * u, y: c.tFloor - B.lift * (1 - u) - B.launchH * arc, air: true }
  }
  return { x: c.land, y: c.tFloor, air: false }
}
// the sphere's world position (centre) + radius (world px) — pure
export function bombAt(k) {
  const hx = c.fx0 + c.dir * 6, hy = c.floor - 150
  if (k < T.psi) return null
  if (k < T.throw) { const u = smooth((k - T.psi) / (T.throw - 10 - T.psi)); return { x: hx, y: hy - 40 * u, r: 6 + 64 * u } }
  if (k < T.boom) {
    const u = (k - T.throw) / (T.boom - T.throw), e = u * u, p = foeAt(T.boom - 1)
    const tx = p.x, ty = p.y - 50
    return { x: hx + (tx - hx) * e, y: (hy - 40) + (ty - hy + 40) * e - 120 * Math.sin(Math.PI * u), r: 70 - 18 * u }
  }
  return null
}

function place() {
  const k = c.frame, f = c.caster, t = c.target
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94)
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = c.dir; f._fxAlpha = 0
  const p = foeAt(k)
  t.x = Math.round(p.x - (t.w || 48) / 2); t.y = Math.round(Math.min(p.y, c.tFloor) - (t.h || 94))
  t.vx = 0; t.vy = 0; t.isBlocking = c.blocked && k < T.land; t.hitstun = Math.max(t.hitstun || 0, 9999)
  t.onGround = !p.air; t.grounded = !p.air; t._fxAlpha = 0
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster
  const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  if (k < T.psi) cam.focusOnFighter(f, 1.8)
  else if (k < T.throw) cam.focusBetween?.(box(c.fx0, c.floor - 120), box(c.tx0, c.tFloor - 60), 1.05 + 0.15 * smooth((k - T.psi) / 60))
  else if (k < T.boom) cam.focusBetween?.(f, box(c.tx0, c.tFloor - 60), 1.2)
  else if (k < T.after) cam.focusOnFighter(box(c.tx0, c.tFloor - 140), 0.75)
  else if (k < T.land) cam.focusBetween?.(f, box(foeAt(k).x, foeAt(k).y - 47), 0.85)
  else cam.focusOnFighter(f, 1.4)
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
    if (c.blocked) t.blockstun = Math.max(t.blockstun || 0, 24)
    else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 46); t.hitstun = 20 }
  }
  if (f) { try { clearInputBuffer(f) } catch (_) {}
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); f.vx = 0; f.vy = 0
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
export const clearSaikiUlt = clear

registerUltCast('saiki', cast)
registerFreezeCine('saiki_bomb', { active: isSaikiUltActive, update, clear })
registerCineScreen('saiki_bomb', (ctx, canvas) => drawSaikiUltScreen(ctx, canvas, saikiUltScene()))
