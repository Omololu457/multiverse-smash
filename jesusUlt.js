// jesusUlt.js — Jesus (jesus) "BLESSED ENERGY" as a FROZEN CINEMATIC (2026-11-24; owner: "make more cinematic ultimates …
// do it the same way you did with the other ones"). SIMULATION ONLY — the render lives in jesusUltFx.js (screen pass),
// the choir / bell / lion synth in jesusUltSound.js. Registers itself through cineRegistry.js (imported by cineUlts.js):
//   registerUltCast('jesus')   — the Ultimate press (same input, same 100 meter as the legacy executeJesusUltimate)
//   registerFreezeCine('jesus') — while active game.js freezes combat / physics / input and calls update(ctx) every frame
//
// The essence is unchanged — an escalating, screen-wide radiance of blessed energy (no opener needed: the legacy ult was
// an undodgeable screen-wide AOE). Beats (script frame k):
//   PRAYER        0–40    the sky darkens, he bows his head in prayer; letterbox + title "BLESSED ENERGY"
//   HEAVENS OPEN  40–60   the clouds part above him and god-rays pour down onto him (choir swells)
//   ASCENSION     60–104  he rises, arms out, a halo of light expands behind him
//   LION OF JUDAH 104–150 a golden lion forms out of the light beside him and ROARS — the first wave (hit 1)
//   WAVES         150–196 two more escalating waves of holy light wash over the foe (hits 2, 3), each bigger
//   GATHER        196–222 all the light is drawn into his raised hand (slow motion, silence before the burst)
//   RADIANCE      222     a blinding sunburst fills the screen (hit 4, the finisher) — the foe is cast away
//   AFTERMATH     236–300 peace: the clouds close softly, light motes drift, he descends; letterbox out
// Damage: 46 + 59 + 79 + 196 = 380 raw (owner buff, was the legacy 290 = 35 + 45 + 60 + 150) through applyScaledDamage (same opts);
// a guarding foe takes the same 30 % chip per pulse (13 + 17 + 23 + 58 = 111 raw; was 86); a foe out of the legacy 900 px reach takes nothing;
// a foe with i-frames at the press is spared the pulses the legacy timing would have spared (thresholds 10/16/22/34).
// Every position is a pure function of k (+ the layout captured at the press). Hit-stop holds k; slow motion advances k
// every other real frame. No Math.random / wall clock. A KO jumps straight to the radiance (no further damage) and ends
// cleanly; clear() restores both fighters + the camera on every reset path.
import { registerFreezeCine, registerUltCast } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { playJesusUltSound } from './jesusUltSound.js'

export const JU = {
  total: 300,
  titleIn: 4, titleOut: 46,
  part: 44, rise0: 64, rise1: 104, halo: 70,
  lionIn: 104, roar: 124, wave1: 152, wave2: 176,
  gather: 196, slow0: 206, final: 222, slow1: 234, land: 258,
  descend0: 262, descend1: 290, out: 282,
  riseH: 118,
  raw: [46, 59, 79, 196],                // = 380 raw (2026-11-24 owner buff: legacy 290 ×≈1.31)
  inv: [10, 16, 22, 34],                 // legacy pulse delays: a foe's i-frames at the press spare the pulses they would have
  hold: [8, 9, 11, 16],                  // hit-stop (real frames) per contact — escalating
  shake: [10, 13, 17, 34],
  push: [22, 48, 84],                    // cumulative push-back after hits 1-3 (px)
  guardPush: [6, 12, 20, 34],
  launch: 240, arc: 170,
  reach: 900,
}

const c = { active: false }
export const isJesusUltActive = () => !!c.active
export const jesusUltScene = () => (c.active ? c : null)
export const jesusUltStatus = () => ({ active: !!c.active, k: c.k | 0, real: c.real | 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko, caster: c.caster?.side ?? null })
export let jesusUltLast = null

const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const easeOut = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) }
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const HITS = () => [JU.roar, JU.wave1, JU.wave2, JU.final]

// ── CAST (abilities.js triggerUltimate → castRegisteredUlt) ───────────────────────────────────────────────────────────
function cast(f, context = {}) {
  if ((f?.rosterKey || '').toLowerCase() !== 'jesus') return undefined
  if (c.active) return false
  const opp = typeof context?.getOpponent === 'function' ? context.getOpponent(f) : (f.side === 'p1' ? context?.p2 : context?.p1)
  if (!opp) return undefined                                          // nothing to frame → the legacy ult handles it
  // meter: exactly the legacy spend (100 = full bar; the Infinite Energy vow never deducts)
  const cost = f.ultimate?.cost ?? 100
  if (!f.infiniteEnergy) { if ((f.energy || 0) < cost) return false; f.energy = Math.max(0, (f.energy || 0) - cost) }
  return start(f, opp, context)
}

function start(f, t, context) {
  const stage = context?.worldWidth || context?.stageWidth || 3200
  const d = ctrX(t) >= ctrX(f) ? 1 : -1
  const floorF = feet(f), floorT = (t.onGround || t.grounded) ? feet(t) : floorF
  const dist = Math.hypot(ctrX(t) - ctrX(f), (t.y + (t.h || 94) / 2) - (f.y + (f.h || 94) / 2))
  const inReach = !t.eliminated && dist <= JU.reach
  const inv0 = t.invulnTimer || 0
  const guard = inReach && !!t.isBlocking
  for (const key of Object.keys(c)) delete c[key]
  Object.assign(c, {
    active: true, k: 0, real: 0, hold: 0, holdN: 0, slowAcc: 0, caster: f, target: t, d, stage,
    floorF, floorT, cx0: ctrX(f), tx0: ctrX(t), ty0: feet(t), tw: t.w || 48, th: t.h || 94, fh: f.h || 94,
    affected: inReach, guard, inv0, hp0: t.health || 0,
    hits: 0, dealt: 0, ko: false, done: {}, impacts: [], shown: null, cam: null, camSaved: null,
    fAlpha0: f._fxAlpha, fInv0: f.invulnTimer || 0,
  })
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = true; f.currentMove = 'jesusUlt'
  f.currentAttack = { name: 'jesusUlt', total: 999, timer: 999, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mb: null, _ultPose: true }
  f._fxAlpha = 0                                                       // jesusUltFx draws him (lit, over the darkened world)
  f._jesusUlt = 0                                                      // the legacy render flag stays idle
  if (inReach) {
    t.vx = 0; t.vy = 0; t.hitstop = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
    if (guard) t.blockstun = Math.max(t.blockstun || 0, 9999)
    else t.hitstun = Math.max(t.hitstun || 0, 9999)
  }
  place()
  return true
}

// ── LAYOUT: pure functions of k ──────────────────────────────────────────────────────────────────────────────────────
// Jesus: feet height above the floor (rise / hover bob / descend)
export function riseAt(k) {
  if (k < JU.rise0) return 0
  if (k < JU.rise1) return JU.riseH * ease(seg(k, JU.rise0, JU.rise1))
  if (k < JU.descend0) return JU.riseH + Math.sin((k - JU.rise1) * 0.07) * 5
  return (JU.riseH + Math.sin((JU.descend0 - JU.rise1) * 0.07) * 5) * (1 - ease(seg(k, JU.descend0, JU.descend1)))
}
// the foe's centre-x and feet-y at k (affected foes only)
export function foeAt(k) {
  const d = c.d, H = HITS()
  if (c.guard) {
    let px = 0
    for (let i = 0; i < 4; i++) if (k >= H[i]) px = JU.guardPush[i] * easeOut(seg(k, H[i], H[i] + 10)) + (i ? JU.guardPush[i - 1] * (1 - easeOut(seg(k, H[i], H[i] + 10))) : 0)
    return { x: clampX(c.tx0 + d * px), y: c.floorT, air: false, rot: 0 }
  }
  let px = 0
  for (let i = 0; i < 3; i++) if (k >= H[i]) { const prev = i ? JU.push[i - 1] : 0; px = prev + (JU.push[i] - prev) * easeOut(seg(k, H[i], H[i] + 12)) }
  // held in the light: lifted gently off the ground through the waves
  const lift = 34 * ease(seg(k, JU.roar, JU.wave2 + 10)) + (k >= JU.roar ? Math.sin((k - JU.roar) * 0.11) * 3 : 0)
  if (k < JU.final) return { x: clampX(c.tx0 + d * px), y: c.floorT - lift, air: lift > 2, rot: 0 }
  // RADIANCE: cast away in a long arc, then down
  const u = seg(k, JU.final, JU.land), x0 = c.tx0 + d * px, y0 = c.floorT - lift
  const x = clampX(x0 + d * JU.launch * easeOut(u)), y = y0 + (c.floorT - y0) * u - Math.sin(Math.PI * u) * JU.arc
  return { x, y: Math.min(y, c.floorT), air: u < 1, rot: u < 1 ? d * u * Math.PI * 1.5 : 0 }
}
const clampX = x => clamp(x, (c.tw || 48) / 2 + 30, (c.stage || 3200) - (c.tw || 48) / 2 - 30)
// Jesus's pose for the render: [action, frame index]
export function poseAt(k) {
  if (k < 12) return ['idle', 0]
  if (k < JU.rise0) return ['taunt', 8]                                                         // prayer
  if (k < JU.lionIn) return ['intro', 3]                                                        // rising, arms open
  if (k < JU.gather) return ['win', 1]                                                          // hand raised to heaven
  if (k < JU.final) return ['taunt', 8]                                                         // gathering the light
  if (k < JU.descend0) return ['win', 1]
  if (k < JU.descend1) return ['intro', 3]
  return ['idle', 0]
}

// ── DAMAGE ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function strike(i, ctx) {
  const t = c.target, f = c.caster
  c.done[i] = true
  if (!c.affected || c.ko || !(t.health > 0)) return false
  if (c.inv0 > JU.inv[i]) return false                                  // spared by i-frames (legacy-equivalent timing)
  const raw = c.guard ? Math.floor(JU.raw[i] * 0.3) : JU.raw[i]
  const dn = Array.isArray(ctx?.damageNumbers) ? ctx.damageNumbers : null, n0 = dn ? dn.length : 0, before = t.health
  try { applyScaledDamage(t, raw, { source: 'ability' }) } catch (_) {}
  if (dn && dn.length > n0) dn.splice(n0)                               // the cinematic draws its own numbers (frozen engine ones would hang)
  const amt = Math.max(0, before - t.health)
  c.hits++; c.dealt += amt
  c.shown = { k: c.k, real: c.real, amt: Math.round(amt), total: Math.round(c.dealt), i }
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 14
  if (!(t.health > 0)) c.ko = true
  return true
}
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const synth = (ctx, id) => { try { playJesusUltSound(ctx?.sound, id) } catch (_) {} }
function impact(i, x, y, power) { c.impacts.push({ i, x: Math.round(x), y: Math.round(y), power, k: c.k, real: c.real }); if (c.impacts.length > 8) c.impacts.shift() }

// ── UPDATE (one frame; game.js freezes everything else) ─────────────────────────────────────────────────────────────
function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.75; cam.maxZoomStep = 0.035; cam.maxPanStep = 40 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); camera(cam, c.k); return }       // HIT-STOP: the world holds on the contact
  const k = c.k
  if (c.beat !== k) { c.beat = k; beats(ctx, k) }   // each script frame's beats fire once (slow motion repeats k)
  place()
  camera(cam, k)
  // slow motion: the gather and the first beats of the radiance advance every other real frame
  const slow = (k >= JU.slow0 && k < JU.final) || (k >= JU.final && k < JU.slow1)
  if (slow) { c.slowAcc ^= 1; if (c.slowAcc) return }
  // a KO on an earlier wave → straight to the gather (the radiance still plays, no further damage)
  if (c.ko && k >= JU.roar && k < JU.gather) { c.k = JU.gather; return }
  if (++c.k > JU.total) finish()
}

function beats(ctx, k) {
  const cam = ctx.camera, f = c.caster, d = c.d
  const fx = c.cx0, fy = c.floorF - riseAt(k) - c.fh * 0.55
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.7); sfx(ctx, 'energy_hum_low', 0.6); synth(ctx, 'dark'); cam?.shake?.(2, 40) }
  if (k === 10) synth(ctx, 'bell')
  if (k === JU.part - 10) sfx(ctx, 'charge_swell_riser', 0.8)
  if (k === JU.part) { synth(ctx, 'choir'); sfx(ctx, 'energy_tone_hold', 0.5); sfx(ctx, 'boom_medium_01', 0.45); cam?.shake?.(5, 16) }
  if (k === JU.rise0) { sfx(ctx, 'charge_hum_rise', 0.75); sfx(ctx, 'whoosh_medium_01', 0.5) }
  if (k === JU.halo) { synth(ctx, 'bell'); sfx(ctx, 'crack_sizzle_bright', 0.45) }
  if (k === JU.lionIn) { sfx(ctx, 'warp_wobble_01', 0.55); synth(ctx, 'shimmer') }
  if (k === JU.roar - 8) { sfx(ctx, 'boom_anticipation_suck', 0.6); synth(ctx, 'growl') }
  HITS().forEach((at, i) => {
    if (k === at - 6 && i > 0 && i < 3) sfx(ctx, i === 1 ? 'whoosh_medium_02' : 'swish_fast_03', 0.75)
    if (k !== at || c.done[i]) return
    const landed = strike(i, ctx)
    c.hold = JU.hold[i]; c.holdN = JU.hold[i]
    cam?.shake?.(JU.shake[i], JU.hold[i] + (i === 3 ? 30 : 12))
    const p = foeAt(at)
    impact(i, i === 3 ? fx : p.x, i === 3 ? fy : p.y - c.th / 2, [0.8, 1.0, 1.3, 2.2][i])
    if (i === 0) { sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_hit_01', 0.7); synth(ctx, 'roar') }
    else if (i < 3) { sfx(ctx, i === 1 ? 'boom_medium_02' : 'boom_huge_01', 0.75 + 0.1 * i); sfx(ctx, 'hit_heavy_boom_01', 0.7 + 0.1 * i); sfx(ctx, 'crack_sizzle_bright', 0.55); synth(ctx, i === 1 ? 'swellA' : 'swellB') }
    else { sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.8); sfx(ctx, 'hit_flurry_01', 0.5); synth(ctx, 'radiance') }
    if (!landed && c.affected && !c.ko) c.impacts[c.impacts.length - 1].spared = true
  })
  if (k === JU.gather) { sfx(ctx, 'pitch_drop_slowmo', 0.7); sfx(ctx, 'charge_swell_riser', 0.9) }
  if (k === JU.final - 8) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === JU.final + 14) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === JU.land && c.affected && !c.guard) { cam?.shake?.(8, 12); sfx(ctx, 'boom_medium_01', 0.7); sfx(ctx, 'impact_hit_01', 0.6); impact(4, foeAt(k).x, c.floorT, 0.6) }
  if (k === JU.descend0) synth(ctx, 'peace')
  void f; void d
}

// fighters' positions for script frame k (also during hit-stop, so they stay pinned)
function place() {
  const k = c.k, f = c.caster, t = c.target
  c.pk = k
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  const r = riseAt(k)
  f.x = Math.round(c.cx0 - (f.w || 48) / 2); f.y = Math.round(c.floorF - r - (f.h || 94)); f.vx = 0; f.vy = 0
  f.onGround = r < 0.5; f.grounded = r < 0.5; f.facing = c.d
  f.invulnTimer = Math.max(f.invulnTimer || 0, 2); f._fxAlpha = 0
  if (f.currentAttack) f.currentAttack.timer = 999
  if (!c.affected) return
  const p = foeAt(k)
  t.x = Math.round(p.x - (t.w || 48) / 2); t.y = Math.round(p.y - (t.h || 94)); t.vx = 0; t.vy = 0
  t.onGround = !p.air; t.grounded = !p.air; t.facing = -c.d
  if (c.guard) { t.isBlocking = true; t.blockstun = Math.max(t.blockstun || 0, 9999) }
  else { t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999); if (k >= JU.land && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 30) } }
}

// engine camera (zoom cap lifted to 1.75 for the cinematic; jesusUltFx adds the screen-space punch-ins)
function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  const head = { x: c.cx0 - 24, y: c.floorF - riseAt(k) - c.fh - 10, w: 48, h: 70 }
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: 48, h: 94 })
  const sky = { x: c.cx0 - 24, y: c.floorF - 300, w: 48, h: 94 }
  if (k < JU.part) cam.focusOnFighter(head, 1.25 + 0.4 * ease(seg(k, 0, JU.part)))           // slow push-in on the prayer
  else if (k < JU.rise0) cam.focusOnFighter(mid(head, sky), 1.0)                              // tilt up: the heavens open
  else if (k < JU.lionIn) cam.focusOnFighter(head, 1.35)                                       // follow the ascension
  else if (k < JU.roar + 6) cam.focusOnFighter({ x: c.cx0 - c.d * 30 - 24, y: c.floorF - 150, w: 48, h: 94 }, 1.4)   // the lion beneath him
  else if (k < JU.gather) { if (c.affected) cam.focusBetween?.(f, t, 1.0); else cam.focusOnFighter(f, 1.0) }          // the waves: both in frame
  else if (k < JU.final) cam.focusOnFighter(head, 1.25 + 0.45 * ease(seg(k, JU.gather, JU.final)))                    // gather: tight on him
  else if (k < JU.final + 30) cam.focusOnFighter(f, 0.7)                                        // PULL OUT for the radiance
  else if (k < JU.descend0) { if (c.affected) cam.focusBetween?.(f, t, 0.95); else cam.focusOnFighter(f, 1.0) }
  else cam.focusOnFighter(f, 1.15)
}

function restoreCam() { const cam = c.cam, sv = c.camSaved; if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep } }
function restoreCaster(f) {
  if (!f) return
  if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  f.x = Math.round(c.cx0 - (f.w || 48) / 2); f.y = c.floorF - (f.h || 94); f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true
  f._jesusUlt = 0
}
function finish() {
  const f = c.caster, t = c.target
  if (t && c.affected) {
    const p = foeAt(JU.total)
    t.x = Math.round(p.x - (t.w || 48) / 2); t.y = c.floorT - (t.h || 94); t.vx = 0; t.vy = 0; t.onGround = true; t.grounded = true
    if (c.guard) { t.blockstun = 22; t.isBlocking = true }
    else { t.hitstun = 0; if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) } }
  }
  restoreCaster(f)
  if (f) { f.attackCooldown = 14; f.invulnTimer = Math.max(c.fInv0 || 0, 10) }
  jesusUltLast = { hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko, guard: c.guard, affected: c.affected, real: c.real }
  restoreCam(); reset()
}
const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
// Every reset path (round reset, rematch, KO teardown, menu): restore both fighters and the camera, drop the scene.
export function clear() {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (t && c.affected) { t.hitstun = 0; t.blockstun = 0; t.vx = 0; t.vy = 0; t.y = c.floorT - (t.h || 94); t.onGround = true; t.grounded = true }
  restoreCaster(f)
  restoreCam(); reset()
}
export const clearJesusUlt = clear

registerUltCast('jesus', cast)
registerFreezeCine('jesus', { active: isJesusUltActive, update, clear })
import('./jesusUltFx.js').catch(() => {})                                  // render pass (registers its screen overlay)
