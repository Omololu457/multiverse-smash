// isshikiUlt.js — Isshiki Ōtsutsuki (isshiki) ULTIMATE "大黒天 · DAIKOKUTEN — JUDGEMENT OF THE ŌTSUTSUKI" as a FROZEN
// CINEMATIC (2026-11-24 roster-wide ult pass). Replaces the legacy Daikokuten Barrage (abilities.executeIsshikiUltimate:
// 5 falling rod sprites + one guaranteed 340-raw hit, guard = 25 % — left untouched, no longer reached). Same input,
// cost (100), gate (not attacking / no attack cooldown) and total (345 raw ≈ legacy 340 after per-hit rounding = 3 cubes × 55 + 4 rods × 20 + the colossal
// cube 100; guard 25 % per hit).
// BEATS (script frames, 60 fps):
//   GAZE        0-40   the light dims; golden motes; his close-up: "No matter how you resist, the result won't change."
//   SUKUNAHIKONA 40-72  he lifts a hand — a ring of light snaps shut and the foe SHRINKS to a fraction of their size
//   DAIKOKUTEN  72-146  cubes pulled out of frozen time: each drops, GROWS as it falls and crushes the tiny foe (×3)
//   RODS       150-180  a rain of colossal rods spears down around and through them (×4)
//   JUDGEMENT  182-212  the sky goes black — a cube the size of the stage descends, its shadow swallowing everything: SLAM
//   AFTER      212-276  the cube dissolves into black motes, the foe snaps back to full size, crushed: "This ends you."
import { defineNarutoUlt, clamp, smooth } from './narutoUltKit.js'
import { drawIsshikiUltScreen, preloadIsshikiUlt } from './isshikiUltFx.js'

export const IS = {
  cost: 100, blockMult: 0.25,
  shrinkAt: 40, shrunkAt: 58, cubeAt: 72, cubes: [{ at: 74, hit: 92 }, { at: 98, hit: 114 }, { at: 120, hit: 136 }], cubeRaw: 55,
  rodAt: 150, rods: [156, 162, 168, 174], rodRaw: 19, judgeAt: 182, slamAt: 204, judgeRaw: 102, growAt: 230, total: 276,
}
const VOICE = { open: 'isshiki_line_05_013.8s.mp3', shrink: 'isshiki_line_21_066.9s.mp3', end: 'isshiki_line_28_082.0s.mp3' }

const ult = defineNarutoUlt({
  key: 'isshiki', id: 'isshiki_daikokuten', total: IS.total, cost: IS.cost, zoom: 1.9,
  preload: (f, t) => preloadIsshikiUlt(f, t),
  beats(c, k, A) {
    const f = c.caster
    if (k === 0) { A.voice(VOICE.open); f._atkVoiceCd = 200; A.sfx('pitch_drop_slowmo', 0.6); A.sfx('energy_tone_hold', 0.4) }
    if (k === IS.shrinkAt) { A.voice(VOICE.shrink); A.sfx('warp_wobble_01', 0.8); A.sfx('sting_pitch_rise_hold', 0.6) }
    if (k === IS.shrinkAt + 10) { A.sfx('crack_sizzle_bright', 0.6); A.sfx('swish_fast_02', 0.7) }
    IS.cubes.forEach((cb, i) => {
      if (k === cb.at) A.sfx('boom_anticipation_suck', 0.6 + i * 0.1)
      if (k === cb.at + 6) A.sfx('whoosh_medium_0' + (1 + (i % 2)), 0.8)
      if (k === cb.hit) A.once('c' + i, () => { A.hit(IS.cubeRaw, { blockMult: IS.blockMult, hold: 8 + i * 2 }); A.sfx('boom_medium_0' + (1 + (i % 2)), 1); A.sfx('hit_heavy_boom_01', 0.8); A.shake(12 + i * 3, 16) })
    })
    if (k === IS.rodAt) A.sfx('charge_hum_rise', 0.6)
    IS.rods.forEach((at, i) => { if (k === at) A.once('r' + i, () => { A.hit(IS.rodRaw, { blockMult: IS.blockMult, hold: 3 }); A.sfx('impact_crack_01', 0.8); A.sfx('impact_hit_01', 0.6); A.shake(7, 6) }) })
    if (k === IS.judgeAt) { A.sfx('rumble_tail_01', 1); A.sfx('boom_anticipation_suck', 1); A.shake(5, 24) }
    if (k === IS.slamAt) A.once('judge', () => {
      A.hit(IS.judgeRaw, { blockMult: IS.blockMult, hold: 26, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_02_roar', 1); A.sfx('boom_huge_01', 1); A.shake(28, 44)
    })
    if (k === IS.slamAt + 12) A.sfx('rumble_tail_01', 1)
    if (k === IS.growAt) A.sfx('warp_wobble_02', 0.6)
    if (k === IS.growAt + 8) A.voice(VOICE.end)
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target
    f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(c.tx0 - (t.w || 48) / 2); t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    t.isBlocking = c.blocked && k < IS.growAt
  },
  camera(c, cam, k) {
    const f = c.caster, foe = { x: c.tx0 - 24, y: c.tFloor - 94, w: 48, h: 94 }
    if (k < IS.shrinkAt) cam.focusOnFighter(f, 1.65)
    else if (k < IS.cubeAt) cam.focusOnFighter(foe, 1.4 + 0.4 * smooth((k - IS.shrinkAt) / 30))
    else if (k < IS.judgeAt) cam.focusBetween(f, foe, 1.05)
    else if (k < IS.growAt) cam.focusBetween(f, foe, 0.85)
    else cam.focusBetween(f, foe, 1.3)
  },
  draw: (ctx, canvas, S) => drawIsshikiUltScreen(ctx, canvas, S),
})

// how small the foe is (Sukunahikona) at frame k
export const foeScale = k => k < IS.shrinkAt + 8 ? 1 : k < IS.growAt ? 1 - 0.68 * smooth((k - IS.shrinkAt - 8) / 12) : 0.32 + 0.68 * smooth((k - IS.growAt) / 10)
export const clampU = (v) => clamp(v, 0, 1)

export const isIsshikiUltActive = ult.isActive
export const isshikiUltScene = ult.scene
export const clearIsshikiUlt = ult.clear
export const getIsshikiUltStatus = ult.status
