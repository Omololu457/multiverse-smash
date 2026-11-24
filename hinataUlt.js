// hinataUlt.js — Hinata Hyuga (hinata) ULTIMATE "BYAKUGAN · JŪHO SŌSHIKEN — TWIN LION FISTS" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ult pass). Replaces the legacy Juuhou Soshiken (abilities.executeHinataUltimate: 8 sure-hit
// palms × 24 raw + a 138 raw finishing palm, 25 % on guard, each palm drains chakra — left untouched, no longer
// reached) and its storyboard pre-roll. Same input, same cost (100), same total (330 raw: 6 tenketsu beats 32×5 + 30,
// then the twin-lion palm 140), same guard chip (25 %), same chakra drain (5 per palm, 20 on the finisher; unblocked).
// BEATS (script frames, 60 fps):
//   RESOLVE   0-34   letterbox; push-in, Hinata closes her eyes and breathes; "I won't go back on my word."
//   BYAKUGAN 34-76   the eye cut-in: veins bulge, the pale iris opens — then the X-RAY: the foe as a dark silhouette with
//                    their chakra network glowing and all 64 tenketsu lighting up; 白眼 BYAKUGAN
//   LIONS    76-112  arms spread, chakra pours into both hands and takes shape as two roaring lavender lion heads;
//                    the Hakke trigram blooms under her feet; 柔歩双獅拳
//   STEP    112-120  one gliding step into the foe's guard
//   64 PALMS 120-178 inside the trigram field: TWO PALMS! FOUR! EIGHT! SIXTEEN! THIRTY-TWO! SIXTY-FOUR! — every beat a hit,
//                    the tenketsu go dark one ring at a time, the chakra drains out of them
//   TWIN LIONS 178   both lions slam home: white / inverted frames, hit-stop, the foe blown down the stage on a lion-shaped
//                    blast of chakra
//   AFTERMATH 190-262 the trigram fades, the Byakugan's veins recede, the foe crashes; "I'm not the girl who gives up."
import { defineNarutoUlt, clamp, smooth, outE, lerp } from './narutoUltKit.js'
import { drawHinataUltScreen, preloadHinataUlt } from './hinataUltFx.js'

export const HB = {
  cost: 100, palms: [32, 32, 32, 32, 32, 30], final: 140, blockMult: 0.25, drain: 5, drainFinal: 20,
  eyeAt: 34, xrayAt: 52, lionAt: 76, stepAt: 112, palmAt: 120, palmEvery: 10, finalAt: 182, blastEnd: 206, landAt: 214, total: 262,
  reach: 50, push: 34, slide: 300,
}
export const PALM_CALLS = ['TWO PALMS!', 'FOUR PALMS!', 'EIGHT PALMS!', 'SIXTEEN PALMS!', 'THIRTY-TWO PALMS!', 'SIXTY-FOUR PALMS!']

const drain = (c, amt) => { const t = c.target; if (!c.blocked && t?.maxEnergy) t.energy = Math.max(0, (t.energy || 0) - amt) }

const ult = defineNarutoUlt({
  key: 'hinata', id: 'hinata_twinlions', total: HB.total, cost: f => f.ultimate?.cost ?? HB.cost, zoom: 1.9,
  layout(c) {
    c.hx1 = c.tx0 - c.dir * HB.reach
    c.land = clamp(c.tx0 + c.dir * (c.blocked ? 120 : HB.slide), 80, c.stage - 80)
  },
  preload: (f, t) => preloadHinataUlt(f, t),
  beats(c, k, A) {
    if (k === 0) { A.sfx('energy_tone_hold', 0.45); A.sfx('whoosh_medium_01', 0.4) }
    if (k === HB.eyeAt) { A.sfx('sting_pitch_rise_hold', 0.85); A.sfx('warp_wobble_01', 0.6) }
    if (k === HB.xrayAt) { A.sfx('crack_sizzle_bright', 0.7); A.sfx('energy_hum_low', 0.7) }
    if (k === HB.lionAt) { A.sfx('charge_swell_riser', 0.95) }
    if (k === HB.lionAt + 22) { A.sfx('boom_huge_02_roar', 0.7); A.shake(8, 14) }   // the lions roar
    if (k === HB.stepAt) { A.sfx('swish_fast_02', 0.9); A.sfx('whoosh_medium_02', 0.6) }
    for (let i = 0; i < HB.palms.length; i++) {
      const at = HB.palmAt + i * HB.palmEvery
      if (k === at) A.once('p' + i, () => {
        A.hit(HB.palms[i], { blockMult: HB.blockMult, hold: i === HB.palms.length - 1 ? 8 : 3 }); drain(c, HB.drain * (i === 5 ? 3 : 1))
        A.sfx(i < 3 ? 'hit_flurry_01' : 'impact_hit_01', 0.7 + i * 0.05); A.sfx(i % 2 ? 'swish_fast_01' : 'swish_fast_03', 0.6); A.shake(4 + i * 2, 6)
      })
    }
    if (k === HB.finalAt - 8) A.sfx('boom_anticipation_suck', 1)
    if (k === HB.finalAt) A.once('final', () => {
      A.hit(HB.final, { blockMult: HB.blockMult, hold: 22, big: true }); drain(c, HB.drainFinal)
      A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_02_roar', 0.95); A.sfx('hit_heavy_boom_01', 0.9); A.shake(20, 34)
    })
    if (k === HB.finalAt + 4) A.sfx('boom_huge_01', 0.8)
    if (k === HB.finalAt + 14) A.sfx('rumble_tail_01', 0.9)
    if (k === HB.landAt && !c.blocked) { A.sfx('boom_medium_01', 0.8); A.shake(8, 10) }
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, hx = hinataX(c, k), q = foeAt(c, k)
    f.x = Math.round(hx - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(q.x - (t.w || 48) / 2); t.y = Math.round(Math.min(q.y, c.tFloor) - (t.h || 94)); t.onGround = !q.air; t.grounded = !q.air
    t.isBlocking = c.blocked && k < HB.blastEnd
  },
  camera(c, cam, k) {
    const f = c.caster, box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 }), q = foeAt(c, k)
    if (k < HB.eyeAt) cam.focusOnFighter(f, 1.6 + 0.25 * smooth(k / HB.eyeAt))
    else if (k < HB.lionAt) cam.focusBetween(f, box(c.tx0, c.tFloor - 47), 1.2)
    else if (k < HB.stepAt) cam.focusOnFighter(f, 1.45)
    else if (k < HB.finalAt) cam.focusBetween(f, box(q.x, c.tFloor - 47), 1.5 + 0.2 * smooth((k - HB.palmAt) / 60))
    else if (k < HB.landAt + 10) cam.focusBetween(f, box(q.x, c.tFloor - 47), 0.95)
    else cam.focusOnFighter(f, 1.4)
  },
  draw: (ctx, canvas, S) => drawHinataUltScreen(ctx, canvas, S),
})

export function hinataX(c, k) {
  if (k < HB.stepAt) return c.fx0
  if (k < HB.palmAt) return lerp(c.fx0, c.hx1, outE((k - HB.stepAt) / (HB.palmAt - HB.stepAt)))
  if (k < HB.finalAt) return c.hx1 + c.dir * HB.push * smooth((k - HB.palmAt) / (HB.finalAt - HB.palmAt))   // she drives forward with every palm
  return c.hx1 + c.dir * (HB.push + 16 * outE((k - HB.finalAt) / 10))
}
export function foeAt(c, k) {
  if (k < HB.palmAt) return { x: c.tx0, y: c.tFloor, air: false }
  if (k < HB.finalAt) return { x: c.tx0 + c.dir * HB.push * smooth((k - HB.palmAt) / (HB.finalAt - HB.palmAt)), y: c.tFloor, air: false }
  const x0 = c.tx0 + c.dir * HB.push
  if (c.blocked) { const u = outE((k - HB.finalAt) / 30); return { x: lerp(x0, c.land, u), y: c.tFloor, air: false } }
  if (k < HB.landAt) { const u = (k - HB.finalAt) / (HB.landAt - HB.finalAt); return { x: lerp(x0, c.land, outE(u)), y: c.tFloor - 90 * Math.sin(Math.PI * u), air: true } }
  return { x: c.land, y: c.tFloor, air: false }
}

export const isHinataUltActive = ult.isActive
export const hinataUltScene = ult.scene
export const clearHinataUlt = ult.clear
export const getHinataUltStatus = ult.status
