// gokuBlackUlt.js — Goku Black (goku_black): the Rosé SWORD SLASH ultimate rebuilt as a FROZEN CINEMATIC, "DIVINE
// LACERATION" (2026-11-24; owner: "go onto the Dragon Ball ones … fix those ones please" — the Death Note bar).
// SIMULATION half — the render lives in gokuBlackUltFx.js. Rides cineRegistry.js: registerUltCast('goku_black') takes the
// Ultimate press, registerFreezeCine freezes combat / physics / input and calls update(ctx) every frame.
//
// Same input, gate, meter and damage as the legacy executeGokuBlackUltimate (abilities.js, untouched — simply no longer
// reached): SSJ ROSÉ ONLY, 40 Ki, a GUARANTEED range-independent 110 raw (applyScaledDamage, source 'ability'), a foe that
// was guarding at the press takes 20 %, a clean finish leaves the 30-frame paralysis (hitstun + stun).
//
//   0–36     letterbox, title cut-in; the rosé aura ignites, petals begin to fall          "a god's anger" (voice)
//   36–88    CLOSE-UP: the Divine Lacerating ki-blade forms from his hand, the cold monologue
//   88–148   THE LACERATIONS: five instant cuts from five angles, afterimages left hanging (hits 1–5)
//   148–194  he rises over the foe; the blade bends into a towering SCYTHE of energy; the world goes dark
//   194      THE REAP: one crescent — the frame splits (hit 6, finisher)                       "divine fury" (voice)
//   194–300  petals rain, the blade dissolves, the god turns his back on the fallen
// Every position is a pure function of the script frame k; hit-stop holds k. No Math.random / wall clock.
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { sound } from './sound.js'

export const GOKU_BLACK_CINE = {
  cost: 40, blockScale: 0.20, paralysis: 30,
  total: 300, title: 36, blade0: 40, blade1: 88,
  cuts: [96, 108, 120, 132, 144],             // the five lacerations
  rise: 152, scythe: 164, suck: 184, reap: 196, land: 236,
  raw: { cut: 10, reap: 60 },                 // 5 × 10 + 60 = 110 raw (the legacy SWORD.dmg)
  stop: { cut: [5, 5, 6, 6, 8], reap: 20 },
  // where Black appears for each cut, relative to the foe (dx in facing units, dy up) and which side he faces from
  at: [[-62, 0], [64, 0], [-40, 58], [70, 28], [-84, 0]],
}

const c = { active: false }
export const gokuBlackUltScene = () => (c.active ? c : null)
export const isGokuBlackUltActive = () => !!c.active
export const gokuBlackUltStatus = () => ({ active: !!c.active, k: c.k | 0, real: c.real | 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko })
export let gokuBlackUltLast = null

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

let _lineToggle = false   // alternate the two connect lines across casts (as the legacy did)

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'goku_black') return undefined
  if (!f._ssjRoseActive) return false                                   // ROSÉ-ONLY (the art exists only transformed)
  if (c.active) return false
  const t = targetOf(f, context)
  if (!t || t.eliminated || !(t.health > 0)) return undefined           // nobody to cut → legacy path (unchanged)
  if (!f.infiniteEnergy && (f.energy || 0) < GOKU_BLACK_CINE.cost) return false
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - GOKU_BLACK_CINE.cost)
  start(f, t, context)
  voice(f, 'goku_black_ultimate_line.mp3')                              // "You shall now feel the full brunt of a god's anger."
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
    scale: t.isBlocking ? GOKU_BLACK_CINE.blockScale : 1, guarded: !!t.isBlocking,
    hits: 0, dealt: 0, ko: false, last: null, pops: [], cam: null, camSaved: null,
    fAlpha0: f._fxAlpha, line: (_lineToggle = !_lineToggle) ? 'goku-black-taste-my-blade.mp3' : 'goku_black_taste_divine_fury.mp3',
  })
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = false; f.currentAttack = null; f.currentMove = null   // (as the legacy freeze: the input stays frozen, no attack state)
  f._spriteCastMove = null; f._spriteCastTimer = 0
  f._fxAlpha = 0                                                        // gokuBlackUltFx draws Black himself
  t.vx = 0; t.vy = 0; t.hitstop = 0; t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0; t.hitstun = Math.max(t.hitstun || 0, 9999); t.facing = -d
}

function strike(raw, stop, power, tag, i = 0) {
  const t = c.target
  c.hold = stop; c.holdN = stop
  c.last = { k: c.k, real: c.real, power, tag, i }
  if (c.ko || !(t.health > 0)) return
  const hp0 = t.health
  try { applyScaledDamage(t, raw * c.scale, { source: 'ability' }) } catch (_) {}
  const amt = Math.max(0, hp0 - (t.health || 0))
  c.hits++; c.dealt += amt
  c.pops.push({ real: c.real, amt: Math.round(amt), x: ctrX(t), y: t.y + (t.h || 94) * 0.3, power }); if (c.pops.length > 8) c.pops.shift()
  t.colorFlash = 8 + stop
  if (!(t.health > 0)) c.ko = true
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
  if (++c.k > GOKU_BLACK_CINE.total) finish()
}

function beats(ctx, k) {
  const G = GOKU_BLACK_CINE, f = c.caster
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); sfx(ctx, 'energy_hum_low', 0.7) }
  if (k === 10) { sfx(ctx, 'boom_medium_01', 0.7); shake(ctx, 8, 12) }                       // the aura ignites
  if (k === G.blade0) { sfx(ctx, 'charge_hum_rise', 0.8); sfx(ctx, 'energy_tone_hold', 0.45) }
  if (k === G.blade0 + 22) { sfx(ctx, 'crack_sizzle_bright', 0.8); shake(ctx, 5, 8) }       // the blade snaps to full length
  if (k === G.blade1 - 6) sfx(ctx, 'boom_anticipation_suck', 0.55)
  G.cuts.forEach((at, i) => {
    if (k === at - 3) { sfx(ctx, 'warp_wobble_0' + (1 + (i & 1)), 0.45); sfx(ctx, ['swish_fast_01', 'swish_fast_02', 'swish_fast_03'][i % 3], 0.9) }
    if (k === at) { strike(G.raw.cut, G.stop.cut[i], 0.45 + i * 0.1, 'cut', i); shake(ctx, 9 + i * 2, 8 + i)
      sfx(ctx, 'impact_crack_01', 0.6 + i * 0.07); sfx(ctx, 'hit_heavy_boom_01', 0.45 + i * 0.1); if (i === 4) sfx(ctx, 'boom_medium_02', 0.8) }
  })
  if (k === G.rise) { sfx(ctx, 'whoosh_medium_02', 0.8); sfx(ctx, 'pitch_drop_slowmo', 0.8) }
  if (k === G.scythe) { sfx(ctx, 'boom_medium_01', 0.9); sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'energy_hum_low', 0.7); shake(ctx, 12, 18) }
  if (k === G.suck) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.6) }
  if (k === G.reap - 4) { sfx(ctx, 'swish_fast_01', 1); voice(f, c.line) }
  if (k === G.reap) { strike(G.raw.reap, G.stop.reap, 1.5, 'reap'); shake(ctx, 34, 34)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_huge_01', 0.8); sfx(ctx, 'crack_sizzle_bright', 0.7) }
  if (k === G.reap + 12) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === G.land) { sfx(ctx, 'whoosh_medium_01', 0.6); sfx(ctx, 'energy_tone_hold', 0.35) }
  if (k === G.land + 30) sfx(ctx, 'warp_wobble_02', 0.4)                                   // the blade dissolves
  if (c.ko && k > G.cuts[0] && k < G.rise) c.k = G.rise                                     // KO on a cut → straight to the scythe
}

// Black's world position for script frame k (also read by the render): feet x / feet y / facing
export function blackPose(k) {
  const G = GOKU_BLACK_CINE, t = c.target, d = c.d, tx = c.tx0 + (t?.w || 48) / 2, home = c.fx0 + (c.caster?.w || 48) / 2
  const bound = x => clamp(x, c.sL + 40, c.sR - 40)
  if (k < G.cuts[0] - 3) return { x: home, y: c.floor, dir: d, vis: true }
  if (k < G.rise) {
    let i = 0; for (let j = 0; j < G.cuts.length; j++) if (k >= G.cuts[j] - 3) i = j
    const [dx, dy] = G.at[i], side = Math.sign(dx) * d
    const blink = k - (G.cuts[i] - 3)                         // 0..2 = in transit (invisible)
    return { x: bound(tx + dx * d), y: c.tFloor - dy, dir: -side, vis: blink >= 2, i }
  }
  if (k < G.land) {
    const u = clamp((k - G.rise) / 10, 0, 1)
    return { x: bound(tx - d * 78), y: c.tFloor - 64 * u, dir: d, vis: k >= G.rise + 2, air: true }
  }
  return { x: home, y: c.floor, dir: d, vis: true }
}

function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.d, G = GOKU_BLACK_CINE
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = d; f._fxAlpha = 0
  f.y = c.floor - (f.h || 94); f.x = c.fx0                  // the engine body stays home (hidden); the render places him
  let jx = 0
  const since = c.last ? c.real - c.last.real : 99
  if (c.last && since < 8) jx = ((c.real >> 1) & 1 ? 1 : -1) * (2 + 3 * (c.last.power || 0.5)) * (1 - since / 8)
  t.x = Math.round(c.tx0 + jx); t.y = c.tFloor - (t.h || 94)
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.onGround = true; t.grounded = true; t.hitstun = Math.max(t.hitstun || 0, 9999)
  if (k >= G.reap && !c.guarded && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const G = GOKU_BLACK_CINE, f = c.caster, t = c.target
  if (k < G.title) cam.focusOnFighter(f, 1.15)
  else if (k < G.blade1) cam.focusOnFighter(f, 1.3)
  else if (k < G.rise) cam.focusOnFighter(t, 1.25)
  else if (k < G.reap) cam.focusOnFighter(t, 1.0)
  else if (k < G.land) cam.focusOnFighter(t, 1.25)
  else cam.focusBetween?.(f, t, 1.05)
}

function restoreFighters(final) {
  const f = c.caster, t = c.target, G = GOKU_BLACK_CINE
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.x = c.tx0; t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    if (final && t.health > 0 && !c.guarded) { t.hitstun = G.paralysis; t.stun = Math.max(t.stun || 0, G.paralysis); t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
    if (final && c.guarded) t.blockstun = Math.max(t.blockstun || 0, 16) }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    f.vx = 0; f.vy = 0; f.x = c.fx0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
    if (final) f.attackCooldown = 14 }
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
}
function finish() {
  gokuBlackUltLast = { hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko }
  restoreFighters(true); reset()
}
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
export function clear() { if (!c.active) return; restoreFighters(false); reset() }

registerUltCast('goku_black', cast)
registerFreezeCine('goku_black_ult', { active: isGokuBlackUltActive, update, clear })
import './gokuBlackUltFx.js'
