// kakashiWarUlt.js — Kakashi (Kamui) (kakashi_war) neutral ULTIMATE "神威雷切 · KAMUI RAIKIRI" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ult pass). Replaces the legacy Kamui Raikiri (abilities.executeKakashiWarKamuiRaikiriUlt:
// eye-banner card + swirl + one guaranteed strike, 340 raw, guard = 50 %, +30 Obito bond — left untouched, no longer
// reached for the neutral input). Same input (neutral U, not during Obito's Gift), cost (100), gates (not attacking / no
// attack cooldown / not _warCineBlocked / not _kamuiLockout → refused like today), total (340 raw = the pierce 260 + the
// ejection discharge 80; guard 50 %) and the +30 bond. Down (Copy Ninja), Up (Obito's Gift) and the Gift's Perfect
// Susanoo stay on the legacy path (undefined).
// BEATS (script frames, 60 fps):
//   EYE        0-40   the eye banner: his portrait, the Mangekyō pinwheel spins open (万華鏡写輪眼)
//   CHARGE    40-96   Raikiri: the charge strip → loop, arcs into the floor, 雷切
//   KAMUI     96-126  the Mangekyō turns on the foe: space twists into a vortex and swallows them (神威 KAMUI)
//   DIMENSION 126-190 the Kamui world — endless grey cube-pillars in a black void. The foe tumbles out of a swirl onto a
//                     pillar; Kakashi steps out of his own, Raikiri screaming, crosses the gap: PIERCE (hit 1)
//   EJECT    190-212  the vortex spits them back into the real stage — the stored Raikiri detonates (hit 2)
//   AFTER    212-270  the swirl closes; he takes out his book: "Still a long way to go."
import { defineNarutoUlt, clamp, outE, lerp } from './narutoUltKit.js'
import { drawKakashiWarUltScreen, preloadKakashiWarUlt } from './kakashiWarUltFx.js'

export const KW = {
  cost: 100, pierce: 260, discharge: 80, blockMult: 0.5, bond: 30, bondMax: 100,
  chargeAt: 40, loopAt: 60, kamuiAt: 96, dimAt: 126, landFoeAt: 142, stepAt: 146, dashAt: 160, pierceAt: 170, ejectAt: 196, dischargeAt: 200,
  landAt: 220, afterAt: 224, total: 276, slide: 260,
}
const VOICE = { open: 'kakashi_043.mp3', end: 'kakashi_039.mp3' }

const ult = defineNarutoUlt({
  key: 'kakashi_war', id: 'kakashi_war_kamui_raikiri', total: KW.total, cost: KW.cost, zoom: 1.9,
  gate: f => !f._giftActive && (f._ultVariant || 'kamuiRaikiri') === 'kamuiRaikiri' && !f._warCineBlocked && !f._kamuiLockout,
  layout(c) { c.land = clamp(c.tx0 + c.dir * (c.blocked ? 110 : KW.slide), 80, c.stage - 80) },
  preload: (f, t) => preloadKakashiWarUlt(f, t),
  beats(c, k, A) {
    const f = c.caster
    if (k === 0) { f._raikiriCharging = false; f._raikiriDashing = false; A.voice(VOICE.open); A.sfx('sting_pitch_rise_hold', 0.7) }
    if (k === 18) A.sfx('warp_wobble_02', 0.6)
    if (k === KW.chargeAt) { A.sfx('crack_sizzle_bright', 0.9); A.sfx('charge_swell_riser', 0.9); A.shake(4, 10) }
    if (k > KW.chargeAt && k < KW.kamuiAt && (k - KW.chargeAt) % 8 === 0) A.sfx('crack_sizzle_bright', 0.45 + 0.3 * ((k - KW.chargeAt) / 56))
    if (k === KW.kamuiAt) { A.sfx('warp_wobble_01', 1); A.sfx('boom_anticipation_suck', 0.9); A.shake(6, 24) }
    if (k === KW.kamuiAt + 16) A.sfx('warp_wobble_02', 0.9)
    if (k === KW.dimAt) { A.sfx('pitch_drop_slowmo', 0.8); A.sfx('energy_tone_hold', 0.5) }
    if (k === KW.landFoeAt) { A.sfx('boom_medium_02', 0.6); A.shake(5, 8) }
    if (k === KW.stepAt) { A.sfx('warp_wobble_01', 0.7); A.sfx('crack_sizzle_bright', 0.8) }
    if (k === KW.dashAt) { A.sfx('swish_fast_03', 1); A.sfx('whoosh_medium_02', 0.9) }
    if (k === KW.pierceAt) A.once('pierce', () => {
      A.hit(KW.pierce, { blockMult: KW.blockMult, hold: 28, big: true })
      if (!f._giftActive && !f._kamuiLockout) f._obitoBond = Math.min(KW.bondMax, (f._obitoBond || 0) + KW.bond)
      A.sfx('impact_frame_boom_long', 1); A.sfx('crack_sizzle_bright', 1); A.sfx('hit_heavy_boom_01', 1); A.shake(18, 30)
    })
    if (k === KW.pierceAt + 8) A.sfx('rumble_tail_01', 0.8)
    if (k === KW.ejectAt) { A.sfx('warp_wobble_02', 1); A.sfx('boom_anticipation_suck', 0.8) }
    if (k === KW.dischargeAt) A.once('dis', () => {
      A.hit(KW.discharge, { blockMult: KW.blockMult, hold: 10, big: true })
      A.sfx('boom_huge_02_roar', 1); A.sfx('crack_sizzle_bright', 1); A.sfx('boom_huge_01', 0.8); A.shake(22, 28)
    })
    if (k === KW.landAt && !c.blocked) { A.sfx('boom_medium_01', 0.8); A.shake(8, 10) }
    if (k === KW.afterAt + 8) A.voice(VOICE.end)
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, q = foeAt(c, k)
    f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(q.x - (t.w || 48) / 2); t.y = Math.round(Math.min(q.y, c.tFloor) - (t.h || 94)); t.onGround = !q.air; t.grounded = !q.air
    t.isBlocking = c.blocked && k < KW.landAt
  },
  camera(c, cam, k) {
    const f = c.caster, box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 }), q = foeAt(c, k)
    if (k < KW.chargeAt) cam.focusOnFighter(f, 1.5)
    else if (k < KW.kamuiAt) cam.focusOnFighter(f, 1.5 + 0.3 * clamp((k - KW.chargeAt) / 50, 0, 1))
    else if (k < KW.dimAt) cam.focusBetween(f, box(c.tx0, c.tFloor - 47), 1.25)
    else if (k < KW.ejectAt) cam.focusBetween(f, box(c.tx0, c.tFloor - 47), 1.1)
    else if (k < KW.afterAt) cam.focusBetween(f, box(q.x, c.tFloor - 47), 0.9)
    else cam.focusOnFighter(f, 1.45)
  },
  draw: (ctx, canvas, S) => drawKakashiWarUltScreen(ctx, canvas, S),
})

// the foe in the REAL stage (while in the Kamui world they are drawn in the dimension's own screen composition)
export function foeAt(c, k) {
  if (k < KW.ejectAt) return { x: c.tx0, y: c.tFloor, air: false }
  if (c.blocked) { const u = outE((k - KW.ejectAt) / 26); return { x: lerp(c.tx0, c.land, u), y: c.tFloor, air: false } }
  if (k < KW.landAt) { const u = (k - KW.ejectAt) / (KW.landAt - KW.ejectAt); return { x: lerp(c.tx0, c.land, outE(u)), y: c.tFloor - 130 * Math.sin(Math.PI * u), air: true } }
  return { x: c.land, y: c.tFloor, air: false }
}

export const isKakashiWarUltActive = ult.isActive
export const kakashiWarUltScene = ult.scene
export const clearKakashiWarUlt = ult.clear
export const getKakashiWarUltStatus = ult.status
