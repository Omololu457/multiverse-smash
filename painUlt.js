// painUlt.js — Pain / Nagato's Deva Path (pain) ULTIMATE "地爆天星 · CHIBAKU TENSEI" as a FROZEN CINEMATIC (2026-11-24
// roster-wide ult pass). Replaces the legacy storyboard + painChibakuTenseiCinematic.js (a small sphere sprite in the
// corner + a white flash, 360 raw at the slam, guard = 25 % — left untouched, no longer reached). Same input, cost
// (100) and total (360 raw = 6 rock-crush hits × 30 + the compression 180; guard 25 % per hit).
// Canon staging: a tiny black orb is cast into the sky; it becomes a gravity core that tears the ground up — the foe is
// dragged into the air and entombed as the rock gathers into a new moon.
// BEATS (script frames, 60 fps):
//   PRAYER      0-40   rain-dark sky; the portrait (hands clasped): "This world shall know pain."
//   THE ORB    40-76   the throw — a pin-prick of black rises into the sky ("Chibaku Tensei!"); 地爆天星
//   GRAVITY    76-164  the core wakes: the stage floor rips loose in chunks that spiral up into it; the foe is torn off the
//                      ground and dragged up, each boulder that hits them a crushing blow (×6)
//   ENTOMBED  164-212  the rock closes into a moon around the foe — the wide shot: the moon over the ruined stage, Pain
//                      small below. It COMPRESSES (big hit): purple light through every crack
//   COLLAPSE  212-262  the moon crumbles; rock rains down; the foe falls back to the broken ground: "Know your powerlessness."
import { defineNarutoUlt, clamp, smooth } from './narutoUltKit.js'
import { drawPainUltScreen, preloadPainUlt } from './painUltFx.js'

export const PN = {
  cost: 100, blockMult: 0.25, rockRaw: 30, crushRaw: 180,
  throwAt: 40, orbUp: 76, gravAt: 76, liftAt: 92, rocks: [104, 116, 128, 138, 148, 156], sealAt: 164, crushAt: 192, breakAt: 212, landAt: 236, total: 262,
  coreH: 300, liftH: 200,
}
const VOICE = { open: 'pain_voice_004_t00m31_3s.mp3', call: 'pain_voice_078_t04m06_9s.mp3', end: 'pain_voice_115_t05m21_9s.mp3' }

const ult = defineNarutoUlt({
  key: 'pain', id: 'pain_chibaku_tensei', total: PN.total, cost: PN.cost, zoom: 1.9,
  preload: (f, t) => preloadPainUlt(f, t),
  beats(c, k, A) {
    const f = c.caster
    if (k === 0) { A.voice(VOICE.open); f._atkVoiceCd = 200; A.sfx('pitch_drop_slowmo', 0.6) }
    if (k === PN.throwAt) { A.voice(VOICE.call); A.sfx('swish_fast_02', 0.8) }
    if (k === PN.throwAt + 8) A.sfx('sting_pitch_rise_hold', 0.6)
    if (k === PN.gravAt) { A.sfx('boom_anticipation_suck', 1); A.sfx('warp_wobble_01', 0.8); A.shake(6, 30) }
    if (k > PN.gravAt && k < PN.sealAt && (k - PN.gravAt) % 22 === 0) A.sfx('rumble_tail_01', 0.7)
    if (k === PN.liftAt) { A.sfx('warp_wobble_02', 0.8); A.sfx('energy_hum_low', 0.7) }
    PN.rocks.forEach((at, i) => { if (k === at) A.once('r' + i, () => { A.hit(PN.rockRaw, { blockMult: PN.blockMult, hold: 5 }); A.sfx(i % 2 ? 'boom_medium_01' : 'impact_crack_01', 0.85); A.sfx('hit_heavy_boom_01', 0.5); A.shake(8 + i, 10) }) })
    if (k === PN.sealAt) { A.sfx('boom_medium_02', 1); A.sfx('rumble_tail_01', 1); A.shake(10, 24) }
    if (k === PN.crushAt - 10) A.sfx('charge_hum_rise', 0.8)
    if (k === PN.crushAt) A.once('crush', () => {
      A.hit(PN.crushRaw, { blockMult: PN.blockMult, hold: 26, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_02_roar', 1); A.sfx('boom_huge_01', 0.9); A.shake(26, 40)
    })
    if (k === PN.breakAt) { A.sfx('boom_medium_01', 0.9); A.sfx('rumble_tail_01', 1) }
    if (k === PN.landAt) { A.sfx('boom_medium_02', 0.8); A.shake(10, 12) }
    if (k === PN.landAt + 8) A.voice(VOICE.end)
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, ly = foeLift(k)
    f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(c.tx0 - (t.w || 48) / 2); t.y = Math.round(c.tFloor - ly - (t.h || 94)); t.onGround = ly < 1; t.grounded = ly < 1
    t.isBlocking = c.blocked && k < PN.liftAt
  },
  camera(c, cam, k) {
    const f = c.caster, foe = { x: c.tx0 - 24, y: c.tFloor - 94 - foeLift(k), w: 48, h: 94 }, core = { x: c.tx0 - 24, y: c.tFloor - PN.coreH - 47, w: 48, h: 94 }
    if (k < PN.throwAt) cam.focusOnFighter(f, 1.6)
    else if (k < PN.gravAt) cam.focusBetween(f, core, 1.0)
    else if (k < PN.sealAt) cam.focusBetween(f, foe, 0.9)
    else if (k < PN.breakAt) cam.focusBetween(f, core, 0.75)
    else cam.focusBetween(f, foe, 1.1)
  },
  draw: (ctx, canvas, S) => drawPainUltScreen(ctx, canvas, S),
})

// how far the foe has been dragged into the air (world px above the floor)
export function foeLift(k) {
  if (k < PN.liftAt) return 0
  if (k < PN.breakAt) return PN.liftH * smooth((k - PN.liftAt) / (PN.sealAt - PN.liftAt)) + (k >= PN.sealAt ? (PN.coreH - PN.liftH - 40) * smooth((k - PN.sealAt) / 20) : 0)
  if (k < PN.landAt) { const top = PN.coreH - 40, u = (k - PN.breakAt) / (PN.landAt - PN.breakAt); return top * (1 - u * u) }
  return 0
}
export const pnClamp = clamp

export const isPainUltActive = ult.isActive
export const painUltScene = ult.scene
export const clearPainUlt = ult.clear
export const getPainUltStatus = ult.status
