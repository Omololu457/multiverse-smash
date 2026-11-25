// kakashiAnbuUlt.js — Kakashi (ANBU) (kakashi_anbu) neutral ULTIMATE "暗部 · RAIKIRI — FULL CHARGE" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ult pass). Replaces the legacy Full-Charge Raikiri (abilities.executeKakashiAnbuRaikiriUlt:
// cut-in card + one guaranteed thrust, 330 raw, guard = 50 % — left untouched, no longer reached for the neutral input).
// Same input (neutral U), cost (100), gate (not attacking / no attack cooldown) and total (330 raw = 3 × 30 flicker cuts
// + the 240 full-charge thrust; guard 50 %). Down (Copy Ninja) / Up (Kamui Rift) stay on the legacy path (undefined).
// Distinct from base Kakashi's "Sharingan · Raikiri" (headband / prediction / trench / sky-bolt): this is the teenage
// ANBU assassin — the night op under a full moon.
// BEATS (script frames, 60 fps):
//   MASK      0-40   night falls on the stage, the moon rises; the manga panel: he lowers the fox-mask (暗部 ANBU)
//   CHARGE   40-104  Raikiri at full charge: the charge strip → the loop; the gauge fills I · II · III, the floor cracks
//                    and the moon turns blue; 雷切 RAIKIRI · FULL CHARGE ("You've made up your mind, haven't you?")
//   VANISH  104-118  he becomes a streak of lightning — the screen goes black but for one blue line
//   FLICKER 118-146  three blink-cuts from three angles (behind, above, in front), each a white slash + hit-stop
//   THRUST    150    he reappears face to face: the full-charge thrust goes through (big hit, impact frames)
//   MOON    150-186  the shot: a giant moon, two black silhouettes, the blade blazing through the foe
//   BLAST   186-212  the charge detonates; the foe is blown down the stage
//   AFTER   212-262  the night lifts, the lightning dies: "Underestimate me and you'll get hurt."
import { defineNarutoUlt, clamp, smooth, outE, lerp } from './narutoUltKit.js'
import { drawKakashiAnbuUltScreen, preloadKakashiAnbuUlt } from './kakashiAnbuUltFx.js'

export const KA = {
  cost: 100, cut: 30, thrust: 240, blockMult: 0.5,
  chargeAt: 40, loopAt: 58, vanishAt: 104, flickAt: 118, cuts: [120, 129, 138], thrustAt: 150, blastAt: 186, landAt: 206, afterAt: 214, total: 262,
  reach: 46, slide: 300,
}
const VOICE = { resolve: 'kakashi_005.mp3', end: 'kakashi_014.mp3' }

const ult = defineNarutoUlt({
  key: 'kakashi_anbu', id: 'kakashi_anbu_raikiri', total: KA.total, cost: KA.cost, zoom: 1.9,
  gate: f => { const v = f._ultVariant || 'raikiri'; return v === 'raikiri' },
  layout(c) {
    c.kx1 = c.tx0 - c.dir * KA.reach
    c.land = clamp(c.tx0 + c.dir * (c.blocked ? 120 : KA.slide), 80, c.stage - 80)
  },
  preload: (f, t) => preloadKakashiAnbuUlt(f, t),
  beats(c, k, A) {
    const f = c.caster
    if (k === 0) { f._raikiriCharging = false; f._raikiriDashing = false; A.sfx('pitch_drop_slowmo', 0.6); A.sfx('whoosh_medium_01', 0.4) }
    if (k === 20) A.sfx('warp_wobble_01', 0.5)
    if (k === KA.chargeAt) { A.sfx('crack_sizzle_bright', 0.9); A.sfx('charge_swell_riser', 0.9); A.shake(4, 10) }
    if (k > KA.chargeAt && k < KA.vanishAt && (k - KA.chargeAt) % 7 === 0) A.sfx('crack_sizzle_bright', 0.4 + 0.35 * ((k - KA.chargeAt) / 64))   // the thousand birds
    if (k === 60) A.voice(VOICE.resolve)
    for (const g of [64, 80, 96]) if (k === g) { A.sfx('charge_hum_rise', 0.5 + (g - 64) / 80); A.shake(3 + (g - 64) / 6, 12) }
    if (k === 96) A.sfx('energy_hum_low', 0.9)
    if (k === KA.vanishAt) { A.sfx('swish_fast_03', 1); A.sfx('boom_anticipation_suck', 0.8) }
    KA.cuts.forEach((at, i) => { if (k === at) A.once('cut' + i, () => {
      A.hit(KA.cut, { blockMult: KA.blockMult, hold: 5 }); A.sfx(i === 1 ? 'swish_fast_02' : 'swish_fast_01', 0.9); A.sfx('crack_sizzle_bright', 0.7); A.sfx('impact_hit_01', 0.7); A.shake(7 + i * 2, 8)
    }) })
    if (k === KA.thrustAt - 4) A.sfx('whoosh_medium_02', 0.9)
    if (k === KA.thrustAt) A.once('thrust', () => {
      A.hit(KA.thrust, { blockMult: KA.blockMult, hold: 30, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('crack_sizzle_bright', 1); A.sfx('hit_heavy_boom_01', 1); A.shake(20, 34)
    })
    if (k === KA.thrustAt + 8) A.sfx('rumble_tail_01', 0.8)
    if (k === KA.blastAt - 4) A.sfx('charge_hum_rise', 0.7)
    if (k === KA.blastAt) { A.sfx('boom_huge_02_roar', 1); A.sfx('crack_sizzle_bright', 1); A.shake(22, 28) }
    if (k === KA.landAt && !c.blocked) { A.sfx('boom_medium_01', 0.8); A.shake(8, 10) }
    if (k === KA.afterAt + 6) A.voice(VOICE.end)
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, p = anbuAt(c, k), q = foeAt(c, k)
    f.x = Math.round(p.x - (f.w || 48) / 2); f.y = Math.round(c.floor - (f.h || 94)); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(q.x - (t.w || 48) / 2); t.y = Math.round(Math.min(q.y, c.tFloor) - (t.h || 94)); t.onGround = !q.air; t.grounded = !q.air
    t.isBlocking = c.blocked && k < KA.blastAt + 10
  },
  camera(c, cam, k) {
    const f = c.caster, box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 }), q = foeAt(c, k)
    if (k < KA.chargeAt) cam.focusBetween(f, box(c.tx0, c.tFloor - 47), 1.15)
    else if (k < KA.vanishAt) cam.focusOnFighter(f, 1.45 + 0.4 * smooth((k - KA.chargeAt) / 60))
    else if (k < KA.blastAt) cam.focusOnFighter(box(c.tx0, c.tFloor - 47), 1.55)
    else if (k < KA.afterAt) cam.focusBetween(f, box(q.x, c.tFloor - 47), 0.9)
    else cam.focusOnFighter(f, 1.4)
  },
  draw: (ctx, canvas, S) => drawKakashiAnbuUltScreen(ctx, canvas, S),
})

// where Kakashi stands (world x of his centre) + which angle he is cutting from during the flicker
export function anbuAt(c, k) {
  if (k < KA.vanishAt) return { x: c.fx0, pose: 'stand' }
  if (k < KA.flickAt) return { x: lerp(c.fx0, c.tx0, smooth((k - KA.vanishAt) / (KA.flickAt - KA.vanishAt))), pose: 'streak' }
  if (k < KA.thrustAt - 6) {
    const i = clamp(((k - KA.cuts[0] + 3) / 9) | 0, 0, 2)
    return { x: c.tx0 + c.dir * [70, 0, -60][i], up: i === 1 ? 110 : 0, flip: i === 0, pose: 'cut', i }
  }
  if (k < KA.thrustAt) return { x: lerp(c.tx0 - c.dir * 160, c.kx1, smooth((k - (KA.thrustAt - 6)) / 6)), pose: 'dash' }
  return { x: c.kx1 + c.dir * 8 * outE((k - KA.thrustAt) / 8), pose: 'strike' }
}
export function foeAt(c, k) {
  if (k < KA.blastAt) return { x: c.tx0 + (k >= KA.thrustAt ? c.dir * 8 * outE((k - KA.thrustAt) / 8) : 0), y: c.tFloor, air: false }
  const x0 = c.tx0 + c.dir * 8
  if (c.blocked) { const u = outE((k - KA.blastAt) / 26); return { x: lerp(x0, c.land, u), y: c.tFloor, air: false } }
  if (k < KA.landAt) { const u = (k - KA.blastAt) / (KA.landAt - KA.blastAt); return { x: lerp(x0, c.land, outE(u)), y: c.tFloor - 120 * Math.sin(Math.PI * u), air: true } }
  return { x: c.land, y: c.tFloor, air: false }
}

export const isKakashiAnbuUltActive = ult.isActive
export const kakashiAnbuUltScene = ult.scene
export const clearKakashiAnbuUlt = ult.clear
export const getKakashiAnbuUltStatus = ult.status
