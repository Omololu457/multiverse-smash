// vegetaDarkUlt.js — Dark Vegeta (vegeta_dark): "VILLAINOUS ONSLAUGHT" rebuilt as a FROZEN CINEMATIC (2026-11-24; owner: "go onto
// the Dragon Ball ones … fix those ones"). SIMULATION half — the render lives in vegetaDarkUltFx.js. Rides cineRegistry.js:
// registerUltCast('vegeta_dark') takes the Ultimate press, registerFreezeCine freezes combat / physics / input while it plays.
//
// Same input, meter and damage as the legacy executeVegetaDarkUltimate (abilities.js runDbzMeleeUlt, untouched — simply no
// longer reached): 100 meter, GUARANTEED range-independent beats summing to 330 raw (source 'vegeta-dark-ultimate', ×0.60 →
// ~198 effective); a foe that was guarding at the press takes 25 % of every beat (the legacy applyDbzUltHit block rule).
//
//   0–34    letterbox, title cut-in "VILLAINOUS ONSLAUGHT", the world drains to violet, the black aura swells around him
//   34–92   CLOSE-UP: his face — the Majin M burns onto his forehead stroke by stroke, the eyes glint; "I hope you're ready…"
//   92–98   he vanishes (black after-images)
//   104–154 THE ONSLAUGHT: six blows, front / behind / front, each a hit-stop + punch-zoom + violet impact (hits 1–6)
//   166     the uppercut LAUNCHES them (hit 7) — they hang at the apex in slow motion
//   172–204 he blinks back across the stage, palm out: the BIG BANG charges — a black-violet star in his hand
//   204     fired — 212 it lands: the sky detonates (finisher, hit-stop 20, impact frame)
//   212–310 they fall out of the light; Dark Vegeta folds his arms, the M still burning — "Pathetic."
// Every position is a pure function of the script frame k; hit-stop holds k. No Math.random / wall clock.
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { sound } from './sound.js'

export const VD_CINE = {
  cost: 100, blockScale: 0.25, source: 'vegeta-dark-ultimate',
  total: 310, title: 34, close0: 34, burn0: 44, burn1: 76, glint: 80, close1: 92, vanish: 92, appear: 98,
  hits: [104, 114, 124, 134, 144, 154], launch: 166, blink: 172, set: 178, fire: 204, land: 212, after: 246, fold: 254,
  raw: { hits: [16, 18, 20, 22, 24, 26], launch: 34, bigbang: 174 },   // 126 + 34 + 174 = 334 ≈ the legacy 330 (+4 offsets 8-beat rounding → same ~198 effective)
  stop: { hits: [4, 4, 5, 5, 6, 7], launch: 10, bigbang: 20 },
  side: [1, 1, -1, 1, -1, 1],                                         // +1 = in front of the foe, −1 = behind (cross-up)
  pose: ['vegetaDarkRush1', 'vegetaDarkRush2', 'light', 'heavy', 'vegetaDarkRush2', 'heavy'],
  apex: 150,
  voice: { at: 66, clip: 'vegeta_ssj_003_t01m18_8s.mp3' },          // "I hope you're ready… BIG BANG ATTACK!" (the shout lands on the charge)
}

const c = { active: false }
export const vegetaDarkUltScene = () => (c.active ? c : null)
export const isVegetaDarkUltActive = () => !!c.active
export let vegetaDarkUltLast = null
export function vegetaDarkUltStatus() {
  if (!c.active) return { active: false, k: 0, hits: 0, dealt: 0 }
  return { active: true, k: c.k | 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko }
}
if (typeof window !== 'undefined') window.__vegetaDarkUltStatus = vegetaDarkUltStatus

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const easeO = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u) }
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const shake = (ctx, s, n) => { try { ctx?.camera?.shake?.(s, n) } catch (_) {} }

function targetOf(f, context) {
  try { if (typeof context?.getOpponent === 'function') return context.getOpponent(f) } catch (_) {}
  return f?.side === 'p2' ? context?.p1 : context?.p2
}

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'vegeta_dark') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false        // the legacy runDbzMeleeUlt gate
  const t = targetOf(f, context)
  if (!t || t.eliminated || !(t.health > 0)) return undefined
  if (!f.infiniteEnergy && (f.energy || 0) < VD_CINE.cost) return false
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - VD_CINE.cost)
  start(f, t, context)
  f._atkVoiceCd = 320
  return true
}

function start(f, t, context) {
  for (const k of Object.keys(c)) delete c[k]
  const d = ctrX(t) >= ctrX(f) ? 1 : -1
  const sL = context?.stageLeft || 0, sR = context?.stageWidth ?? context?.worldWidth ?? 3200
  Object.assign(c, {
    active: true, k: 0, real: 0, hold: 0, caster: f, target: t, d, sL, sR,
    floor: feet(f), tFloor: feet(t), fx0: f.x, tx0: t.x,
    scale: t.isBlocking ? VD_CINE.blockScale : 1, guarded: !!t.isBlocking,
    hits: 0, dealt: 0, ko: false, last: null, pops: [], cam: null, camSaved: null, fAlpha0: f._fxAlpha, done: {},
  })
  // the foe is pinned where they stood (kept clear of the walls so the cross-ups fit)
  c.tx0 = clamp(t.x, sL + 90, sR - 90 - (t.w || 48))
  c.bx = clamp(ctrX(t) - d * 250, sL + 40, sR - 40) - (f.w || 48) / 2        // where he stands to fire the Big Bang
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = true; f.currentAttack = null; f.currentMove = null
  f._spriteCastMove = 'vdAura'; f._spriteCastTimer = VD_CINE.total + 8
  f._fxAlpha = 0
  t.vx = 0; t.vy = 0; t.hitstop = 0; t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0; t.hitstun = Math.max(t.hitstun || 0, 9999); t.facing = -d
}

function strike(raw, stop, power, tag) {
  const t = c.target
  c.hold = stop
  c.last = { k: c.k, real: c.real, power, tag }
  if (c.ko || !(t.health > 0)) return
  const hp0 = t.health
  try { applyScaledDamage(t, raw * c.scale, { source: VD_CINE.source }) } catch (_) {}
  const amt = Math.max(0, hp0 - (t.health || 0))
  c.hits++; c.dealt += amt
  c.pops.push({ real: c.real, amt: Math.round(amt), x: ctrX(t), y: t.y + (t.h || 94) * 0.3, power }); if (c.pops.length > 10) c.pops.shift()
  t.colorFlash = 8 + stop
  if (!(t.health > 0)) { c.ko = true; try { c.caster._killingBlowMove = 'ultimate' } catch (_) {} }
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
  if (++c.k > VD_CINE.total) finish()
}

function beats(ctx, k) {
  const V = VD_CINE
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); sfx(ctx, 'energy_hum_low', 0.8); sfx(ctx, 'rumble_tail_01', 0.6) }
  if (k === 14) sfx(ctx, 'warp_wobble_01', 0.6)
  if (k === V.close0) { sfx(ctx, 'boom_medium_01', 0.7); sfx(ctx, 'pitch_drop_slowmo', 0.6) }
  if (k === V.voice.at) { try { sound.playSfxFile?.(V.voice.clip, null, { owner: c.caster }) } catch (_) {} }
  // the M burning in: a sizzle per stroke
  if (k >= V.burn0 && k < V.burn1 && (k - V.burn0) % 8 === 0) sfx(ctx, 'crack_sizzle_bright', 0.55)
  if (k === V.burn1) { sfx(ctx, 'impact_crack_01', 0.8); shake(ctx, 8, 8) }
  if (k === V.glint) sfx(ctx, 'sting_pitch_rise_hold', 0.6)
  if (k === V.vanish) { sfx(ctx, 'warp_wobble_02', 0.8); sfx(ctx, 'swish_fast_01', 0.8) }
  V.hits.forEach((at, i) => {
    if (k === at - 4) sfx(ctx, ['swish_fast_01', 'swish_fast_02', 'swish_fast_03'][i % 3], 0.75)
    if (V.side[i] !== (i ? V.side[i - 1] : 1) && k === at - 7) sfx(ctx, 'warp_wobble_01', 0.5)   // a cross-up blink
    if (k === at) { strike(V.raw.hits[i], V.stop.hits[i], 0.5 + i * 0.1, 'hit'); shake(ctx, 7 + i * 2, 8 + i)
      sfx(ctx, 'hit_heavy_boom_01', 0.6 + i * 0.07); sfx(ctx, i & 1 ? 'impact_hit_01' : 'impact_crack_01', 0.6 + i * 0.05) }
  })
  if (k === V.launch - 5) sfx(ctx, 'boom_anticipation_suck', 0.9)
  if (k === V.launch) { strike(V.raw.launch, V.stop.launch, 1.1, 'launch'); shake(ctx, 20, 18); sfx(ctx, 'boom_medium_02', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'pitch_drop_slowmo', 0.8) }
  if (k === V.blink) { sfx(ctx, 'warp_wobble_02', 0.8); sfx(ctx, 'whoosh_medium_02', 0.7) }
  if (k === V.set) { sfx(ctx, 'charge_swell_riser', 1); sfx(ctx, 'energy_tone_hold', 0.7) }
  if (k === V.set + 14) sfx(ctx, 'charge_hum_rise', 0.9)
  if (k > V.set && k < V.fire && (k - V.set) % 6 === 0) sfx(ctx, 'crack_sizzle_bright', 0.35)
  if (k === V.fire - 6) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === V.fire) { c.fireReal = c.real; c.hold = 3; shake(ctx, 14, 10); sfx(ctx, 'boom_medium_01', 0.9); sfx(ctx, 'whoosh_medium_01', 1) }
  if (k === V.land) { c.done.land = true; strike(V.raw.bigbang, V.stop.bigbang, 1.6, 'bigbang'); shake(ctx, 38, 42)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'hit_flurry_01', 0.5) }
  if (k === V.land + 16) sfx(ctx, 'rumble_tail_01', 1)
  if (k === V.after + 4) { sfx(ctx, 'hit_heavy_boom_01', 0.6); shake(ctx, 8, 8) }      // they hit the ground
  if (k === V.fold) sfx(ctx, 'whoosh_medium_02', 0.5)
  // a KO mid-combo: straight to the launch → Big Bang (the scene still lands, no further damage)
  if (c.ko && k > V.hits[0] && k < V.launch - 6) c.k = V.launch - 6
}

// Dark Vegeta's spot for frame k: { x (centre), dir, key, fi, ghost (after-image source x or null) }
export function vdPose(k) {
  const V = VD_CINE, d = c.d, t = c.target, tcx = c.tx0 + (t?.w || 48) / 2 + push(k)
  if (k < V.vanish) return { x: c.fx0 + (c.caster.w || 48) / 2, dir: d, key: 'vdAura', fi: (k >> 3) & 3 }
  if (k < V.appear) return { x: c.fx0 + (c.caster.w || 48) / 2, dir: d, key: null, fi: 0 }
  if (k < V.launch + 6) {
    let i = 0; while (i < V.hits.length - 1 && k > V.hits[i] + 2) i++
    const launchPhase = k > V.hits[V.hits.length - 1] + 2
    const side = launchPhase ? 1 : V.side[i], at = launchPhase ? V.launch : V.hits[i]
    const x = tcx - d * side * 60, dir = d * side
    const key = launchPhase ? 'vegetaDarkRush3' : V.pose[i]
    const span = 8, u = clamp((k - (at - span)) / span, 0, 1)
    return { x, dir, key, fi: Math.round(u * 2) }
  }
  if (k < V.blink) return { x: tcx - d * 60, dir: d, key: 'vegetaDarkRush3', fi: 2 }
  const bx = c.bx + (c.caster.w || 48) / 2
  if (k < V.set) return { x: bx, dir: d, key: null, fi: 0 }
  if (k < V.after) return { x: bx, dir: d, key: 'vdKiCast', fi: k < V.fire ? (k < V.set + 8 ? 0 : 1) : 1 }
  return { x: bx, dir: d, key: k < V.fold ? 'vdKiCast' : 'idleCross', fi: k < V.fold ? 0 : (k >> 3) & 3 }
}
// the foe's slide back from the blows (world px along d)
function push(k) {
  const V = VD_CINE; let p = 0
  V.hits.forEach((at, i) => { if (k >= at) p += (V.side[i] > 0 ? 7 : -5) })
  return p * c.d
}
// the foe's lift above the floor
export function vdLift(k) {
  const V = VD_CINE
  if (k < V.launch) return 0
  if (k < V.land) return V.apex * easeO((k - V.launch) / 22) + Math.sin((k - V.launch) / 9) * 4 * clamp((k - V.launch - 22) / 10, 0, 1)
  const e = k - V.land, up = V.apex + 30 * Math.min(1, e / 8)
  if (e < 8) return up
  const fall = (e - 8) / Math.max(1, V.after - V.land - 8)
  return Math.max(0, up * (1 - fall * fall))
}

function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.d, V = VD_CINE
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  const P = vdPose(k)
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f._fxAlpha = 0; f.facing = P.dir
  f.x = clamp(P.x, c.sL + 20, c.sR - 20) - (f.w || 48) / 2; f.y = c.floor - (f.h || 94)
  t.x = Math.round(clamp(c.tx0 + push(k), c.sL, c.sR - (t.w || 48))); t.y = c.tFloor - (t.h || 94) - vdLift(k)
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.onGround = vdLift(k) < 1; t.grounded = t.onGround; t.hitstun = Math.max(t.hitstun || 0, 9999)
  if (k >= V.after && !c.guarded && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target, V = VD_CINE
  if (k < V.vanish) cam.focusOnFighter(f, 1.2)
  else if (k < V.launch + 6) cam.focusOnFighter(t, 1.35)
  else if (k < V.set) cam.focusBetween?.(f, t, 1.0)
  else if (k < V.land) cam.focusBetween?.(f, t, 1.05)
  else if (k < V.after) cam.focusOnFighter(t, 0.95)
  else cam.focusOnFighter(f, 1.2)
}

function restoreFighters(final) {
  const f = c.caster, t = c.target
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    if (!final) t.x = c.tx0
    if (final && t.health > 0 && !c.guarded) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
    if (final && c.guarded) t.blockstun = Math.max(t.blockstun || 0, 22) }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if (!final) f.x = c.fx0
    if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
    if (final) f.attackCooldown = 14 }
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
}
function finish() {
  vegetaDarkUltLast = { hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko }
  restoreFighters(true); reset()
}
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
export function clear() { if (!c.active) return; restoreFighters(false); reset() }

registerUltCast('vegeta_dark', cast)
registerFreezeCine('vegeta_dark_ult', { active: isVegetaDarkUltActive, update, clear })
import './vegetaDarkUltFx.js'
