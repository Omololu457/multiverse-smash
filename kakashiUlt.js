// kakashiUlt.js — Kakashi Hatake (kakashi) ULTIMATE "SHARINGAN · RAIKIRI — I CUT LIGHTNING" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ult pass). Replaces the legacy inline Raikiri (abilities.executeKakashiUltimate: one sure-hit
// thrust 330 raw, guard = 50 % — left untouched, no longer reached) and its storyboard pre-roll. Same input, cost (100),
// gate (not attacking / no attack cooldown) and total (330 raw = the thrust 250 + the discharge 80; guard 50 %).
// The Sharingan-empowered variant (_mangekyouActive) rides the same cinematic with the Mangekyō "support" dash frames.
// BEATS (script frames, 60 fps):
//   HEADBAND  0-40   letterbox; the manga close-up: he pushes the headband up — the Sharingan opens, tomoe spinning
//                    ("Kakashi of the Sharingan."); 写輪眼
//   CHARGE   40-92   Raikiri screams to life in his hand: arcs crawl into the floor, the stage turns blue-black, a thousand
//                    birds; 雷切 RAIKIRI
//   PREDICT  92-106  the Sharingan reads the future: the world goes red, the foe's next moves ghost ahead of them
//   DASH    106-118  he tears a burning trench through the floor, afterimages, speed lines
//   PIERCE   118     the blade goes through — white / inverted frames, hit-stop, lightning bursts out of the foe's back
//   DISCHARGE 118-170 the stored lightning detonates (hit 2): branching bolts across the screen, a bolt from the sky,
//                    the foe is blown down the stage
//   AFTERMATH 170-236 the trench smokes, sparks die; he lowers the headband: "That's the end. Next!"
import { defineNarutoUlt, clamp, smooth, outE, lerp } from './narutoUltKit.js'
import { drawKakashiUltScreen, preloadKakashiUlt } from './kakashiUltFx.js'

export const KB = {
  cost: 100, thrust: 250, discharge: 80, blockMult: 0.5,
  chargeAt: 40, predictAt: 92, dashAt: 106, pierceAt: 118, dischargeAt: 140, blastEnd: 164, landAt: 178, lowerAt: 196, total: 236,
  reach: 44, slide: 280,
}
const VOICE = { open: 'kakashi_020.mp3', end: 'kakashi_028.mp3' }

const ult = defineNarutoUlt({
  key: 'kakashi', id: 'kakashi_raikiri', total: KB.total, cost: KB.cost, zoom: 1.9,
  layout(c, f) {
    c.empowered = !!f._mangekyouActive
    c.kx1 = c.tx0 - c.dir * KB.reach
    c.land = clamp(c.tx0 + c.dir * (c.blocked ? 120 : KB.slide), 80, c.stage - 80)
    f._raikiriEmpowered = c.empowered
  },
  preload: (f, t) => preloadKakashiUlt(f, t),
  beats(c, k, A) {
    if (k === 0) { A.voice(VOICE.open); A.sfx('whoosh_medium_01', 0.4) }
    if (k === 22) { A.sfx('sting_pitch_rise_hold', 0.8); A.sfx('warp_wobble_02', 0.5) }
    if (k === KB.chargeAt) { A.sfx('crack_sizzle_bright', 0.9); A.sfx('charge_swell_riser', 0.9); A.shake(4, 10) }
    if (k > KB.chargeAt && k < KB.dashAt && (k - KB.chargeAt) % 9 === 0) A.sfx('crack_sizzle_bright', 0.45 + 0.3 * ((k - KB.chargeAt) / 66))   // the chirping
    if (k === KB.chargeAt + 26) { A.sfx('energy_hum_low', 0.8); A.shake(6, 20) }
    if (k === KB.predictAt) { A.sfx('pitch_drop_slowmo', 0.9) }
    if (k === KB.dashAt) { A.sfx('swish_fast_03', 1); A.sfx('whoosh_medium_02', 0.9); A.sfx('boom_anticipation_suck', 0.8) }
    if (k === KB.pierceAt) A.once('pierce', () => {
      A.hit(KB.thrust, { blockMult: KB.blockMult, hold: 26, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('crack_sizzle_bright', 1); A.sfx('hit_heavy_boom_01', 0.95); A.shake(18, 34)
    })
    if (k === KB.pierceAt + 6) A.sfx('rumble_tail_01', 0.8)
    if (k === KB.dischargeAt - 6) A.sfx('charge_hum_rise', 0.7)
    if (k === KB.dischargeAt) A.once('dis', () => {
      A.hit(KB.discharge, { blockMult: KB.blockMult, hold: 10, big: true })
      A.sfx('boom_huge_02_roar', 1); A.sfx('crack_sizzle_bright', 1); A.sfx('boom_huge_01', 0.8); A.shake(22, 30)
    })
    if (k === KB.dischargeAt + 12) A.sfx('rumble_tail_01', 0.9)
    if (k === KB.landAt && !c.blocked) { A.sfx('boom_medium_01', 0.8); A.shake(8, 10) }
    if (k === KB.lowerAt) A.voice(VOICE.end)
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, kx = kakashiX(c, k), q = foeAt(c, k)
    f.x = Math.round(kx - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(q.x - (t.w || 48) / 2); t.y = Math.round(Math.min(q.y, c.tFloor) - (t.h || 94)); t.onGround = !q.air; t.grounded = !q.air
    t.isBlocking = c.blocked && k < KB.blastEnd
  },
  camera(c, cam, k) {
    const f = c.caster, box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 }), q = foeAt(c, k)
    if (k < KB.chargeAt) cam.focusOnFighter(f, 1.7)
    else if (k < KB.predictAt) cam.focusOnFighter(f, 1.45 + 0.35 * smooth((k - KB.chargeAt) / 50))
    else if (k < KB.dashAt) cam.focusBetween(f, box(c.tx0, c.tFloor - 47), 1.1)
    else if (k < KB.dischargeAt) cam.focusBetween(f, box(q.x, c.tFloor - 47), 1.45)
    else if (k < KB.landAt + 8) cam.focusBetween(f, box(q.x, c.tFloor - 47), 0.85)
    else cam.focusOnFighter(f, 1.45)
  },
  draw: (ctx, canvas, S) => drawKakashiUltScreen(ctx, canvas, S),
})

export function kakashiX(c, k) {
  if (k < KB.dashAt) return c.fx0
  if (k < KB.pierceAt) return lerp(c.fx0, c.kx1, ((k - KB.dashAt) / (KB.pierceAt - KB.dashAt)) ** 1.6)
  if (k < KB.dischargeAt) return c.kx1 + c.dir * 10 * outE((k - KB.pierceAt) / 8)
  return c.kx1 + c.dir * 10
}
export function foeAt(c, k) {
  if (k < KB.dischargeAt) return { x: c.tx0 + (k >= KB.pierceAt ? c.dir * 10 * outE((k - KB.pierceAt) / 8) : 0), y: c.tFloor, air: false }
  const x0 = c.tx0 + c.dir * 10
  if (c.blocked) { const u = outE((k - KB.dischargeAt) / 28); return { x: lerp(x0, c.land, u), y: c.tFloor, air: false } }
  if (k < KB.landAt) { const u = (k - KB.dischargeAt) / (KB.landAt - KB.dischargeAt); return { x: lerp(x0, c.land, outE(u)), y: c.tFloor - 110 * Math.sin(Math.PI * u), air: true } }
  return { x: c.land, y: c.tFloor, air: false }
}

export const isKakashiUltActive = ult.isActive
export const kakashiUltScene = ult.scene
export const clearKakashiUlt = ult.clear
export const getKakashiUltStatus = ult.status
