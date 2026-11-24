// lRyuuzakiUlt.js — L (l_ryuuzaki): his FIRST real ultimate, "THE FINAL DEDUCTION", as a FROZEN CINEMATIC (2026-11-24; owner:
// "make more cinematic ultimates … do it the same way you did with the other ones"). SIMULATION half — the render lives
// in lRyuuzakiUltFx.js. Before this L had no ultimate (characters.js placeholder → abilities.executeFallbackUltimate's
// generic 180-raw melee). Rides cineRegistry.js: registerUltCast('l_ryuuzaki') + registerFreezeCine.
//
// Same economy as Light Yagami's ultimates (his rival): 100 Deduction, a range-independent payoff of 440 raw through
// applyScaledDamage (source 'ability' → ~264 effective), a foe guarding at the press takes 25 %.
//   0–34     letterbox, title cut-in; L perched in his crouch, thumb to his lip
//   34–104   THE DEDUCTION: case files slam onto the screen one by one, red string ties every clue to the suspect, the
//            counter climbs — "PROBABILITY YOU ARE KIRA: 5 % … 50 % … 96 %"
//   104      99 % — the GUILTY stamp; L stands and points
//   120–190  the confrontation: he closes the distance and runs his capoeira — low sweep (hit 1), rising crescent
//            (hit 2), the five-kick flurry (hits 3–7), the aerial plunge (hit 8)
//   206      "CHECKMATE." — the golden finishing kick (hit 9, finisher), the king topples, the foe is launched
//   206–270  the aftermath: the foe down, L back in his crouch, 100 %
// Every position is a pure function of the script frame k; hit-stop holds k. No Math.random / wall clock.
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'

export const L_CINE = {
  cost: 100, blockScale: 0.25, total: 270, title: 34,
  files: [34, 44, 54, 64, 74, 84, 94], prob: [5, 12, 27, 50, 74, 87, 96], guilty: 104,
  stand: 104, dash: 120, arrive: 128, sweep: 133, crescent: 145, flurry: [156, 159, 162, 165, 168], plunge: 185, fin0: 192, finisher: 206, land: 228,
  raw: { sweep: 52, crescent: 65, flurry: 18, plunge: 78, finisher: 155 },    // 52 + 65 + 5×18 + 78 + 155 = 440 (= Light's; owner buff +30 %)
  stop: { sweep: 5, crescent: 7, flurry: 2, plunge: 9, finisher: 22 },
}

const c = { active: false }
export const lUltScene = () => (c.active ? c : null)
export const isLUltActive = () => !!c.active
export const lUltStatus = () => ({ active: !!c.active, k: c.k | 0, real: c.real | 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko })
export let lUltLast = null

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const easeO = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) }
const easeI = u => { u = clamp(u, 0, 1); return u * u }
const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, f, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: f }) } catch (_) {} }
const shake = (ctx, s, n) => { try { ctx?.camera?.shake?.(s, n) } catch (_) {} }

function targetOf(f, context) {
  try { if (typeof context?.getOpponent === 'function') return context.getOpponent(f) } catch (_) {}
  return f?.side === 'p2' ? context?.p1 : context?.p2
}

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'l_ryuuzaki') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const t = targetOf(f, context)
  if (!t || t.eliminated || !(t.health > 0)) return undefined
  if (!f.infiniteEnergy && (f.energy || 0) < L_CINE.cost) return false
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - L_CINE.cost)
  f._ultVariant = null
  start(f, t, context)
  return true
}

function start(f, t, context) {
  for (const k of Object.keys(c)) delete c[k]
  const d = ctrX(t) >= ctrX(f) ? 1 : -1
  const sL = context?.stageLeft || 0, sW = context?.stageWidth || context?.worldWidth || 3200
  Object.assign(c, {
    active: true, k: 0, real: 0, hold: 0, holdN: 1, caster: f, target: t, d,
    floor: feet(f), tFloor: feet(t), lx0: ctrX(f), tcx0: ctrX(t), sL, sR: sL + sW,
    scale: t.isBlocking ? L_CINE.blockScale : 1, guarded: !!t.isBlocking,
    name: String(t.name || t.rosterKey || 'SUSPECT').replace(/[_\-]+/g, ' ').toUpperCase().slice(0, 20),
    hits: 0, dealt: 0, ko: false, last: null, pops: [], cam: null, camSaved: null, fAlpha0: f._fxAlpha,
  })
  // the confrontation needs room to push the foe back: if the foe is pinned to a wall, the whole fight slides inward
  const room = 300, tw = (t.w || 48) / 2
  c.base = d > 0 ? Math.min(c.tcx0, c.sR - room - tw) : Math.max(c.tcx0, c.sL + room + tw)
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = true; f.currentAttack = null; f.currentMove = null; f._fxAlpha = 0
  t.vx = 0; t.vy = 0; t.hitstop = 0; t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0; t.hitstun = Math.max(t.hitstun || 0, 9999); t.facing = -d
}

function strike(ctx, raw, stop, power, tag) {
  const t = c.target, f = c.caster
  c.hold = stop; c.holdN = stop
  c.last = { k: c.k, real: c.real, power, tag }
  if (c.ko || !(t.health > 0)) return
  const hp0 = t.health
  try { applyScaledDamage(t, raw * c.scale, { source: 'ability' }) } catch (_) {}
  const amt = Math.max(0, hp0 - (t.health || 0))
  c.hits++; c.dealt += amt
  c.pops.push({ real: c.real, amt: Math.round(amt), x: ctrX(t), y: t.y + (t.h || 94) * 0.3, power }); if (c.pops.length > 10) c.pops.shift()
  t.colorFlash = 6 + stop
  if (!(t.health > 0)) c.ko = true
}

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.6; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  const k = c.k
  beats(ctx, k)
  place()
  camera(cam, k)
  if (++c.k > L_CINE.total) finish()
}

function beats(ctx, k) {
  const L = L_CINE, R = L.raw, f = c.caster
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.85); sfx(ctx, 'energy_hum_low', 0.5) }
  if (k === L.title) voice(ctx, f, 'l_ryuuzaki_004.mp3')                         // "…and monsters who always tell lies."
  L.files.forEach((at, i) => { if (k === at) { sfx(ctx, i & 1 ? 'swish_fast_02' : 'swish_fast_01', 0.55); sfx(ctx, 'impact_hit_01', 0.3 + i * 0.05); shake(ctx, 2 + (i >> 1), 4) } })
  if (k === 60) sfx(ctx, 'charge_hum_rise', 0.6)
  if (k === L.guilty - 8) sfx(ctx, 'boom_anticipation_suck', 0.7)
  if (k === L.guilty) { c.last = { k, real: c.real, power: 0.6, tag: 'guilty' }; c.hold = 10; c.holdN = 10; shake(ctx, 10, 10); sfx(ctx, 'impact_crack_01', 0.95); sfx(ctx, 'boom_medium_01', 0.8) }
  if (k === L.dash) { sfx(ctx, 'whoosh_medium_01', 0.8); sfx(ctx, 'swish_fast_03', 0.6) }
  if (k === L.sweep - 3) sfx(ctx, 'swish_fast_01', 0.7)
  if (k === L.sweep) { strike(ctx, R.sweep, L.stop.sweep, 0.55, 'sweep'); shake(ctx, 8, 8); sfx(ctx, 'impact_hit_01', 0.8); sfx(ctx, 'boom_medium_01', 0.5) }
  if (k === L.crescent - 3) sfx(ctx, 'swish_fast_02', 0.8)
  if (k === L.crescent) { strike(ctx, R.crescent, L.stop.crescent, 0.7, 'crescent'); shake(ctx, 12, 10); sfx(ctx, 'hit_heavy_boom_01', 0.8); sfx(ctx, 'crack_sizzle_bright', 0.5) }
  if (k === L.flurry[0] - 2) sfx(ctx, 'hit_flurry_01', 0.7)
  L.flurry.forEach((at, i) => { if (k === at) { strike(ctx, R.flurry, L.stop.flurry, 0.35 + i * 0.05, 'flurry'); shake(ctx, 5 + i, 4); sfx(ctx, i & 1 ? 'swish_fast_03' : 'swish_fast_01', 0.5); sfx(ctx, 'impact_hit_01', 0.55) } })
  if (k === L.flurry[4] + 4) sfx(ctx, 'whoosh_medium_02', 0.8)
  if (k === L.plunge) { strike(ctx, R.plunge, L.stop.plunge, 0.9, 'plunge'); shake(ctx, 18, 14); sfx(ctx, 'hit_heavy_boom_01', 0.95); sfx(ctx, 'boom_medium_02', 0.8) }
  if (k === L.fin0) { sfx(ctx, 'pitch_drop_slowmo', 0.8); sfx(ctx, 'charge_swell_riser', 0.8) }
  if (k === L.finisher - 8) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === L.finisher) { strike(ctx, R.finisher, L.stop.finisher, 1.5, 'finisher'); shake(ctx, 32, 32)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 0.95); sfx(ctx, 'hit_heavy_boom_01', 0.9) }
  if (k === L.finisher + 10) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === L.land) { shake(ctx, 10, 10); sfx(ctx, 'boom_medium_01', 0.8); sfx(ctx, 'impact_hit_01', 0.6) }
  // a KO in the flurry: straight to the checkmate
  if (c.ko && k > L.sweep && k < L.fin0) c.k = L.fin0
}

// the foe's centre-x offset (along d) and lift for script frame k — pure
export function foeAt(k) {
  const L = L_CINE
  let push = 0, lift = 0
  push += 10 * easeO(seg(k, L.sweep, L.sweep + 6))
  push += 16 * easeO(seg(k, L.crescent, L.crescent + 8)); lift += 26 * Math.sin(Math.PI * seg(k, L.crescent, L.flurry[0] + 2))
  L.flurry.forEach(at => { push += 6 * easeO(seg(k, at, at + 3)) })
  lift += 80 * Math.sin(Math.PI / 2 * seg(k, L.flurry[4], L.flurry[4] + 10)) * (1 - easeI(seg(k, L.plunge - 6, L.plunge)))   // popped up by the last kick, spiked down by the plunge
  const u = seg(k, L.finisher, L.land)
  push += 250 * easeO(u); lift += 130 * Math.sin(Math.PI * u)
  return { push, lift, air: (k >= L.crescent && k < L.plunge) || (k >= L.finisher && k < L.land) }
}
// L's centre-x and feet lift for script frame k — pure
export function lAt(k) {
  const L = L_CINE, d = c.d, f0 = foeAt(Math.min(k, L.finisher))
  const near = c.base + d * f0.push - d * 62
  let x, lift = 0
  if (k < L.dash) x = c.lx0
  else if (k < L.arrive) x = c.lx0 + (near - c.lx0) * easeI(seg(k, L.dash, L.arrive))
  else x = near
  if (k >= L.flurry[4] + 4 && k < L.plunge + 4) lift = 90 * Math.sin(Math.PI * seg(k, L.flurry[4] + 4, L.plunge + 4))
  return { x, lift }
}

function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.d
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  const fa = foeAt(k), la = lAt(k)
  // the foe: slid inward before the fight if pinned (during the deduction), then driven by the kicks
  const slide = ease(seg(k, 60, L_CINE.arrive))
  const tcx = clamp(c.tcx0 + (c.base - c.tcx0) * slide + d * fa.push, c.sL + 30, c.sR - 30)
  t.x = Math.round(tcx - (t.w || 48) / 2); t.y = Math.round(c.tFloor - (t.h || 94) - fa.lift)
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999); t.onGround = !fa.air; t.grounded = !fa.air
  if (((k >= L_CINE.plunge && k < L_CINE.finisher) || k >= L_CINE.land) && t.health > 0 && !c.guarded) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 30) }
  t.facing = -d
  f.x = Math.round(clamp(la.x, c.sL + 24, c.sR - 24) - (f.w || 48) / 2); f.y = Math.round(c.floor - (f.h || 94) - la.lift)
  f.vx = 0; f.vy = 0; f.onGround = la.lift <= 0; f.grounded = la.lift <= 0; f.facing = d; f._fxAlpha = 0
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target, L = L_CINE
  if (k < L.title) cam.focusBetween?.(f, t, 1.0)
  else if (k < L.stand) cam.focusBetween?.(f, t, 1.05)
  else if (k < L.dash) cam.focusBetween?.(f, t, 1.1)
  else if (k < L.finisher) cam.focusBetween?.(f, t, 1.3)
  else if (k < L.land + 10) cam.focusBetween?.(f, t, 0.95)
  else cam.focusBetween?.(f, t, 1.1)
}

function restoreFighters(final) {
  const f = c.caster, t = c.target
  if (t) { const fa = foeAt(Math.min(c.k | 0, L_CINE.total))
    t.vx = 0; t.vy = 0; t.hitstun = 0; t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    if (!final) t.x = Math.round(clamp(c.tcx0, c.sL + 30, c.sR - 30) - (t.w || 48) / 2)
    if (final && t.health > 0 && !c.guarded) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
    if (final && c.guarded) t.blockstun = Math.max(t.blockstun || 0, 22)
    void fa }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null
    f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if (!final) f.x = Math.round(c.lx0 - (f.w || 48) / 2)
    if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
    if (final) f.attackCooldown = 14 }
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
}
function finish() { lUltLast = { hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko }; restoreFighters(true); reset() }
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
export function clear() { if (!c.active) return; restoreFighters(false); reset() }

registerUltCast('l_ryuuzaki', cast)
registerFreezeCine('l_ryuuzaki_ult', { active: isLUltActive, update, clear })
import './lRyuuzakiUltFx.js'
