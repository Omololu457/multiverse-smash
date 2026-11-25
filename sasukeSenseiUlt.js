// sasukeSenseiUlt.js — Sasuke (Sensei) (sasuke_sensei) Raiton-set ULTIMATE "麒麟 · KIRIN" as a FROZEN CINEMATIC (2026-11-24
// roster-wide ult pass). Replaces the legacy Kirin (abilities.ssKirinUltimate: cast pose + a storm render flag + three
// guaranteed hits 90 / 90 / 150 = 330 raw, guard 25 % — left untouched, no longer reached for the Raiton set) and its
// storyboard pre-roll. Same input (neutral U with the Raiton eye-set, not in Susanoo Soldier), cost (100) and total.
// The Mangekyō (Hebi), Rinnegan (Chibaku), Susanoo (Soldier) and Indra's Arrow ultimates stay on the legacy path.
// Canon: Katon fireballs heat the sky into a thunderhead; the lightning is heaven's — Sasuke only guides it down.
// BEATS (script frames, 60 fps):
//   EYE       0-34   the Sharingan band; 写輪眼
//   KATON    34-84   he breathes a volley of fire dragons straight up — the sky boils (火遁 · 豪龍火)
//   STORM    84-120  a black thunderhead rolls over the whole stage; lightning crawls inside it; his hand rises (麒麟)
//   STRIKES 120-140  two warning bolts from the clouds hit the foe (hits 1-2)
//   KIRIN   140-178  the lightning DRAGON pours out of the cloud, coils once and dives — the foe is swallowed (hit 3)
//   AFTER   178-244  a smoking crater; the cloud breaks; he turns his back
import { defineNarutoUlt, clamp, smooth } from './narutoUltKit.js'
import { drawSasukeSenseiUltScreen, preloadSasukeSenseiUlt } from './sasukeSenseiUltFx.js'

export const KR = {
  cost: 100, blockMult: 0.25, strike: 90, kirin: 150,
  katonAt: 34, stormAt: 84, raiseAt: 100, strikes: [122, 134], kirinAt: 140, diveAt: 162, hitAt: 172, afterAt: 186, total: 244,
}
const VOICE = { open: 'sasuke_ultimate_cast.mp3', kirin: 'sasuke_kirin_cast.mp3', end: 'sasuke_win_line.mp3' }

const ult = defineNarutoUlt({
  key: 'sasuke_sensei', id: 'sasuke_sensei_kirin', total: KR.total, cost: f => f.ultimate?.cost ?? 100, zoom: 1.9,
  gate: f => (f._eyeSet || 'raiton') === 'raiton' && !f._warSoldier,
  preload: (f, t) => preloadSasukeSenseiUlt(f, t),
  beats(c, k, A) {
    const f = c.caster
    if (k === 0) { A.voice(VOICE.open); f._ssKirinUlt = 0; A.sfx('sting_pitch_rise_hold', 0.6) }
    if (k === KR.katonAt) { A.sfx('charge_swell_riser', 0.8); A.sfx('boom_medium_02', 0.6) }
    for (let i = 0; i < 5; i++) if (k === KR.katonAt + 6 + i * 7) A.sfx('whoosh_medium_0' + (1 + (i % 2)), 0.6)
    if (k === KR.stormAt) { A.sfx('rumble_tail_01', 1); A.sfx('energy_hum_low', 0.7); A.shake(4, 30) }
    if (k > KR.stormAt && k < KR.kirinAt && (k - KR.stormAt) % 13 === 0) A.sfx('crack_sizzle_bright', 0.35)
    if (k === KR.raiseAt) A.sfx('sting_pitch_rise_hold', 0.7)
    KR.strikes.forEach((at, i) => { if (k === at) A.once('s' + i, () => { A.hit(KR.strike, { blockMult: KR.blockMult, hold: 6 }); A.sfx('crack_sizzle_bright', 1); A.sfx('impact_crack_01', 0.9); A.shake(10, 10) }) })
    if (k === KR.kirinAt) { A.voice(VOICE.kirin); A.sfx('boom_huge_02_roar', 0.8); A.sfx('crack_sizzle_bright', 1) }
    if (k === KR.diveAt) A.sfx('boom_anticipation_suck', 1)
    if (k === KR.hitAt) A.once('kirin', () => {
      A.hit(KR.kirin, { blockMult: KR.blockMult, hold: 26, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_01', 1); A.sfx('crack_sizzle_bright', 1); A.shake(28, 40)
    })
    if (k === KR.hitAt + 10) A.sfx('rumble_tail_01', 1)
    if (k === KR.afterAt + 14) A.voice(VOICE.end)
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target
    f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(c.tx0 - (t.w || 48) / 2); t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    t.isBlocking = c.blocked && k < KR.afterAt
  },
  camera(c, cam, k) {
    const f = c.caster, foe = { x: c.tx0 - 24, y: c.tFloor - 94, w: 48, h: 94 }, sky = { x: (c.fx0 + c.tx0) / 2 - 24, y: c.tFloor - 260, w: 48, h: 94 }
    if (k < KR.katonAt) cam.focusOnFighter(f, 1.6)
    else if (k < KR.stormAt) cam.focusBetween(f, sky, 1.0)
    else if (k < KR.kirinAt) cam.focusBetween(f, foe, 0.95 - 0.1 * smooth((k - KR.stormAt) / 40))
    else if (k < KR.afterAt) cam.focusBetween(f, sky, 0.8)
    else cam.focusBetween(f, foe, 1.15)
  },
  draw: (ctx, canvas, S) => drawSasukeSenseiUltScreen(ctx, canvas, S),
})
export const krClamp = clamp

export const isSasukeSenseiUltActive = ult.isActive
export const sasukeSenseiUltScene = ult.scene
export const clearSasukeSenseiUlt = ult.clear
export const getSasukeSenseiUltStatus = ult.status
