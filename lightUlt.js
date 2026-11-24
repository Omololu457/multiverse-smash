// lightUlt.js — Light Yagami (light): both ultimates rebuilt as FROZEN CINEMATICS (2026-11-24; owner: "make more cinematic
// ultimates … do it the same way you did with the other ones"). SIMULATION half — the render lives in lightUltFx.js.
// Rides cineRegistry.js: registerUltCast('light') takes the Ultimate press, registerFreezeCine freezes combat / physics /
// input and calls update(ctx) every frame while the scene plays.
//
// Same input, meter and damage as the legacy executeLightUltimate (abilities.js, untouched — simply no longer reached):
// 100 Kira, a GUARANTEED range-independent payoff of 440 raw (2026-11-24 owner buff +30 % over the legacy 340; applyScaledDamage,
// source 'ability' → ~264 effective),
// a foe that was guarding at the press takes 25 % (the old chip rule). Neutral U = AS PLANNED, Down+U = I AM KIRA.
//
// AS PLANNED (writing)                                   I AM KIRA (scythe)
//   0–34    letterbox, title cut-in, Ryuk fades in         0–34    letterbox, title cut-in, crimson sky, notebook raised
//   34–100  CLOSE-UP: the name, stroke by stroke           34–96   the reveal: giant Ryuk rises, "THAT'S RIGHT. I'M KIRA."
//   100     the last stroke — the page SEALS (hit 1)               panel, names storm, the god-complex speech
//   104–160 40 SECONDS: the clock races down, four         96–104  the Death Note becomes the Shinigami scythe
//           heartbeats (hits 2–5), the potato-chip smirk   104/120 two reaping slashes (hits 1–2)
//   160     0 — HEART ATTACK (hit 6, finisher)             150     the FINAL REAP: the screen splits (hit 3, finisher)
//   160–250 flatline, collapse, the book shuts, laugh      150–250 pages rain, the new god stands over the fallen
// Every position is a pure function of the script frame k; hit-stop holds k. No Math.random / wall clock.
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { LIGHT_VOICE } from './lightVoice.js'
import { sound } from './sound.js'

export const LIGHT_CINE = {
  cost: 100, raw: 440, blockScale: 0.25,
  plan: { total: 250, title: 34, write0: 36, written: 100, clock0: 106, clock1: 160, beats: [114, 126, 138, 150], chip0: 116, chipEat: 134, chip1: 152,
          attack: 160, close: 204, raw: { seal: 52, beat: 19, attack: 312 }, stop: { seal: 8, beat: 4, attack: 18 } },
  kira: { total: 250, title: 34, reveal: 38, panel: 44, speech: 60, glow: 84, morph: 96, step: 100, slashes: [106, 122], suck: 138, reap: 150,
          raw: { slash1: 78, slash2: 104, reap: 258 }, stop: { slash: [7, 9], reap: 20 } },
}

const c = { active: false }
export const lightUltScene = () => (c.active ? c : null)
export const isLightUltActive = () => !!c.active
export const lightUltStatus = () => ({ active: !!c.active, kind: c.kind || null, k: c.k | 0, real: c.real | 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko })
export let lightUltLast = null   // last finished scene (tests): { kind, hits, dealt, ko }

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const shake = (ctx, s, n) => { try { ctx?.camera?.shake?.(s, n) } catch (_) {} }
const pick = (list, seed) => (Array.isArray(list) && list.length) ? list[((seed % list.length) + list.length) % list.length] : null

function targetOf(f, context) {
  try { if (typeof context?.getOpponent === 'function') return context.getOpponent(f) } catch (_) {}
  return f?.side === 'p2' ? context?.p1 : context?.p2
}
function nameOf(t) {
  const n = String(t?.name || t?.displayName || t?.rosterKey || 'UNKNOWN').replace(/[_\-]+/g, ' ').trim()
  return n.length > 22 ? n.slice(0, 22) : n
}

// ── CAST (abilities.triggerUltimate → castRegisteredUlt) ─────────────────────────────────────────────────────────
function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'light') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const t = targetOf(f, context)
  if (!t || t.eliminated || !(t.health > 0)) return undefined          // nobody to write down → legacy path (unchanged)
  if (!f.infiniteEnergy && (f.energy || 0) < LIGHT_CINE.cost) return false
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - LIGHT_CINE.cost)
  const kind = f._ultVariant === 'scythe' ? 'kira' : 'plan'
  f._ultVariant = null                                                 // consume the selector (as the legacy did)
  start(f, t, kind, context)
  // the declaration plays on the press (as the legacy ult did), over the title cut-in
  try { sound.playSfxFile?.(pick(LIGHT_VOICE.ultimate, c.seed + (kind === 'kira' ? 5 : 0)), null, { owner: f }); f._atkVoiceCd = 150 } catch (_) {}
  return true
}

function start(f, t, kind, context) {
  for (const k of Object.keys(c)) delete c[k]
  const d = ctrX(t) >= ctrX(f) ? 1 : -1
  const sL = context?.stageLeft || 0, sW = context?.stageWidth || context?.worldWidth || 3200
  const seed = ((t.health | 0) * 7 + (f.health | 0) * 3 + (context?.frame | 0)) >>> 0
  Object.assign(c, {
    active: true, kind, k: 0, real: 0, hold: 0, holdN: 1, caster: f, target: t, d, seed,
    floor: feet(f), tFloor: feet(t), fx0: f.x, tx0: t.x, ty0: t.y, sL, sR: sL + sW,
    scale: t.isBlocking ? LIGHT_CINE.blockScale : 1, guarded: !!t.isBlocking,
    name: nameOf(t), hits: 0, dealt: 0, ko: false, last: null, pops: [], cam: null, camSaved: null,
    fAlpha0: f._fxAlpha, done: {},
  })
  // Light keeps his spot; for the scythe he steps out of the shadows beside the foe (kept on stage)
  c.kx = clamp(ctrX(t) - d * 74, sL + 40, c.sR - 40) - (f.w || 48) / 2
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = true; f.currentAttack = null; f.currentMove = null
  f._spriteCastMove = kind === 'kira' ? 'lightScythe' : 'lightUltWrite'; f._spriteCastTimer = 2
  f._lightKiraTimer = 0                                                // the legacy panel overlay stays off (the cinematic owns the screen)
  f._fxAlpha = 0                                                       // lightUltFx draws Light himself
  t.vx = 0; t.vy = 0; t.hitstop = 0; t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0; t.hitstun = Math.max(t.hitstun || 0, 9999); t.facing = -d
}

// one contact: damage (guaranteed, the legacy opts), hit-stop, record for the render
function strike(ctx, raw, stop, power, tag) {
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
  if (!(t.health > 0)) c.ko = true
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
  const k = c.k
  if (c.kind === 'kira') beatsKira(ctx, k); else beatsPlan(ctx, k)
  place()
  camera(cam, k)
  const T = LIGHT_CINE[c.kind].total
  if (++c.k > T) finish()
}

function beatsPlan(ctx, k) {
  const P = LIGHT_CINE.plan, f = c.caster, raw = P.raw
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); sfx(ctx, 'energy_hum_low', 0.6) }
  if (k === 14) sfx(ctx, 'warp_wobble_01', 0.5)                                       // Ryuk drifts in
  if (k === P.write0) { sfx(ctx, 'whoosh_medium_01', 0.6); sfx(ctx, 'energy_tone_hold', 0.35) }
  // the pen: a scratch every few strokes while the name goes down
  if (k > P.write0 + 6 && k < P.written && (k - P.write0) % 7 === 0) sfx(ctx, ((k >> 3) & 1) ? 'swish_fast_01' : 'swish_fast_02', 0.32)
  if (k === P.written - 6) sfx(ctx, 'boom_anticipation_suck', 0.6)
  if (k === P.written) { strike(ctx, raw.seal, P.stop.seal, 0.6, 'seal'); shake(ctx, 8, 10); sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 0.6) }
  if (k === P.clock0) { sfx(ctx, 'charge_hum_rise', 0.7); sfx(ctx, 'pitch_drop_slowmo', 0.5) }
  P.beats.forEach((b, i) => {
    if (k === b) { strike(ctx, raw.beat, P.stop.beat + i, 0.35 + i * 0.12, 'beat'); shake(ctx, 4 + i * 2, 6 + i); sfx(ctx, 'hit_heavy_boom_01', 0.45 + i * 0.12); sfx(ctx, 'impact_hit_01', 0.4 + i * 0.1) }
  })
  if (k === P.chip0) sfx(ctx, 'swish_fast_03', 0.5)
  if (k === P.chipEat) { sfx(ctx, 'crack_sizzle_bright', 0.95); sfx(ctx, 'impact_crack_01', 0.7); shake(ctx, 6, 6) }   // "…AND EAT IT!"
  if (k === P.attack - 10) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.6) }
  if (k === P.attack) {
    if (c.ko && !c.done.attack) { /* already down: the scene still lands its beat, no further damage */ }
    c.done.attack = true
    strike(ctx, raw.attack, P.stop.attack, 1.4, 'attack')
    shake(ctx, 30, 30); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 0.95); sfx(ctx, 'hit_heavy_boom_01', 0.9)
  }
  if (k === P.attack + 8) { sfx(ctx, 'energy_tone_hold', 0.8); sfx(ctx, 'rumble_tail_01', 0.8) }   // the flatline
  if (k === P.close) { sfx(ctx, 'boom_medium_02', 0.8); shake(ctx, 8, 8) }                         // the book snaps shut
  if (k === P.close + 10) sfx(ctx, 'warp_wobble_02', 0.5)
  // a KO on the small hits: straight to the heart attack
  if (c.ko && k > P.written && k < P.attack - 12) c.k = P.attack - 12
}

function beatsKira(ctx, k) {
  const K = LIGHT_CINE.kira, f = c.caster, raw = K.raw
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.95); sfx(ctx, 'rumble_tail_01', 0.6) }
  if (k === K.reveal) { sfx(ctx, 'boom_medium_01', 0.85); sfx(ctx, 'warp_wobble_01', 0.7); shake(ctx, 10, 16) }  // Ryuk rises
  if (k === K.panel) { sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, 'hit_heavy_boom_01', 0.7); shake(ctx, 8, 8) }
  if (k === K.speech) { sfx(ctx, 'charge_swell_riser', 0.85); sfx(ctx, 'energy_hum_low', 0.6) }
  if (k === K.glow) { sfx(ctx, 'energy_tone_hold', 0.6); sfx(ctx, 'crack_sizzle_bright', 0.6) }
  if (k === K.morph) { sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'impact_crack_01', 0.8); shake(ctx, 12, 10) }
  if (k === K.step) sfx(ctx, 'warp_wobble_02', 0.8)
  K.slashes.forEach((at, i) => {
    if (k === at - 4) sfx(ctx, i ? 'swish_fast_03' : 'swish_fast_02', 0.9)
    if (k === at) { strike(ctx, i ? raw.slash2 : raw.slash1, K.stop.slash[i], 0.7 + i * 0.25, 'slash'); shake(ctx, 14 + i * 5, 12 + i * 2)
      sfx(ctx, 'hit_heavy_boom_01', 0.8 + i * 0.1); sfx(ctx, i ? 'boom_medium_02' : 'boom_medium_01', 0.75); sfx(ctx, 'crack_sizzle_bright', 0.5) }
  })
  if (k === K.suck - 8) sfx(ctx, 'pitch_drop_slowmo', 0.8)
  if (k === K.suck) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'charge_hum_rise', 0.6) }
  if (k === K.reap - 3) sfx(ctx, 'swish_fast_01', 1)
  if (k === K.reap) { c.done.reap = true; strike(ctx, raw.reap, K.stop.reap, 1.5, 'reap'); shake(ctx, 34, 34)
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_huge_01', 0.8); sfx(ctx, 'hit_flurry_01', 0.5) }
  if (k === K.reap + 12) sfx(ctx, 'rumble_tail_01', 0.9)
  if (c.ko && k > K.slashes[0] && k < K.suck) c.k = K.suck
}

// fighters for script frame c.k (also during hit-stop, so they stay pinned)
function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.d
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = d; f._fxAlpha = 0
  f.y = c.floor - (f.h || 94)
  if (c.kind === 'kira') f.x = k < LIGHT_CINE.kira.step ? c.fx0 : c.kx
  else f.x = c.fx0
  // the foe: frozen where they stood; the heartbeats wrack them; the finisher drops them
  const P = LIGHT_CINE.plan
  let jx = 0
  if (c.kind === 'plan' && k >= P.clock0 && k < P.attack) {
    const since = Math.min(...P.beats.map(b => (k >= b ? k - b : 99)))
    if (since < 6) jx = ((c.real >> 1) & 1 ? 1 : -1) * (3 - since * 0.4)
  }
  if (c.kind === 'plan' && k >= P.attack && k < P.attack + 24) jx = ((c.real >> 1) & 1 ? 1 : -1) * 3 * (1 - (k - P.attack) / 24)
  t.x = Math.round(c.tx0 + jx); t.y = c.tFloor - (t.h || 94)
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.onGround = true; t.grounded = true; t.hitstun = Math.max(t.hitstun || 0, 9999)
  const downAt = c.kind === 'kira' ? LIGHT_CINE.kira.reap : P.attack
  if (k >= downAt && !c.guarded && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  if (c.kind === 'plan') {
    const P = LIGHT_CINE.plan
    if (k < P.title) cam.focusBetween?.(f, t, 1.0)
    else if (k < P.clock0) cam.focusOnFighter(f, 1.35)
    else if (k < P.attack) cam.focusOnFighter(t, 1.3)
    else if (k < P.close) cam.focusOnFighter(t, 1.15)
    else cam.focusBetween?.(f, t, 1.05)
  } else {
    const K = LIGHT_CINE.kira
    if (k < K.title) cam.focusBetween?.(f, t, 1.0)
    else if (k < K.step) cam.focusOnFighter(f, 1.2)
    else if (k < K.reap + 30) cam.focusOnFighter(t, 1.3)
    else cam.focusBetween?.(f, t, 1.05)
  }
}

function restoreFighters(final) {
  const f = c.caster, t = c.target
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.x = c.tx0; t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    if (final && t.health > 0 && !c.guarded) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
    if (final && c.guarded) t.blockstun = Math.max(t.blockstun || 0, 22) }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
    if (final) f.attackCooldown = 14 }
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
}
function finish() {
  lightUltLast = { kind: c.kind, hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko }
  restoreFighters(true); reset()
}
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
export function clear() { if (!c.active) return; restoreFighters(false); reset() }

registerUltCast('light', cast)
registerFreezeCine('light_ult', { active: isLightUltActive, update, clear })
import './lightUltFx.js'
