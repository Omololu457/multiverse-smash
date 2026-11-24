// sakuraUlt.js — Sakura Haruno (sakura) ULTIMATE "BYAKUGŌ · ŌKA SHŌSHŌ — DAICHI NO SAKEBI" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ult pass). Replaces the legacy Daichi no Sakebi (abilities.executeSakuraUltimate: three
// range-independent petal pulses 70 / 70 / 150 raw, 30 % on guard — left untouched, simply no longer reached) and its
// storyboard pre-roll. Same input (Ultimate), same cost (100), same sure-hit total (290 raw → 110 / 80 / 100), guard 30 %.
// BEATS (script frames, 60 fps):
//   RESOLVE   0-36    letterbox; push-in on Sakura tightening her gloves, pink chakra rising
//   BYAKUGŌ  36-86    the Strength of a Hundred seal releases: manga panel, the diamond on her brow flares, the black
//                     Byakugō lines crawl across the panel; 百豪の術 · BYAKUGŌ NO IN
//   GATHER   86-118   all of it pours into one fist — petals spiral in, the ground trembles, pebbles float; 桜花衝
//   LEAP    118-150   she launches sky-high, hangs at the apex (slow motion, the fist a pink sun), then dives
//   IMPACT   150      the fist meets the earth right at the foe's feet — white / inverted frames, hit-stop, "SHANNARO!!"
//   EARTH'S CRY 150-206  the stage shatters: cracks race out, slabs heave, a wave of rock spikes erupts and launches the
//                     foe (hit 2), then a colossal pillar blasts them sky-high (hit 3) inside a cherry-petal storm
//   AFTERMATH 206-280 petals drift down over the crater, the foe crashes far away, Sakura stands: "CHA!"
import { defineNarutoUlt, clamp, smooth, outE, ctrX, lerp } from './narutoUltKit.js'
import { drawSakuraUltScreen, preloadSakuraUlt } from './sakuraUltFx.js'

export const SB = {
  cost: 100, hits: [110, 80, 100], blockMult: 0.3,
  sealAt: 36, gatherAt: 86, leapAt: 118, apexAt: 130, diveAt: 140, impactAt: 150, waveAt: 164, pillarAt: 184, settleAt: 206,
  fallAt: 214, landAt: 236, total: 280,
  leapH: 280, launch1: 150, launch2: 460, slide: 250,
}

const ult = defineNarutoUlt({
  key: 'sakura', id: 'sakura_okashosho', total: SB.total, cost: f => f.ultimate?.cost ?? SB.cost, zoom: 1.9,
  layout(c) {
    c.slamX = c.tx0 - c.dir * 62                      // where she lands: the fist meets the ground at the foe's feet
    c.land = clamp(c.tx0 + c.dir * (c.blocked ? 110 : SB.slide), 80, c.stage - 80)
  },
  preload: (f, t) => preloadSakuraUlt(f, t),
  beats(c, k, A) {
    if (k === 0) { A.sfx('whoosh_medium_01', 0.5); A.sfx('energy_hum_low', 0.5) }
    if (k === SB.sealAt) { A.sfx('sting_pitch_rise_hold', 0.8); A.sfx('crack_sizzle_bright', 0.6) }
    if (k === SB.sealAt + 14) { A.sfx('impact_crack_01', 0.8); A.shake(5, 8) }
    if (k === SB.gatherAt) { A.sfx('charge_swell_riser', 0.95); A.sfx('charge_hum_rise', 0.7) }
    if (k === SB.leapAt) { A.sfx('whoosh_medium_02', 0.9); A.sfx('boom_medium_01', 0.6); A.shake(8, 8) }
    if (k === SB.apexAt) A.sfx('pitch_drop_slowmo', 0.9)
    if (k === SB.diveAt) { A.sfx('boom_anticipation_suck', 1); A.sfx('swish_fast_03', 0.9) }
    if (k === SB.impactAt) A.once('impact', () => {
      A.hit(SB.hits[0], { blockMult: SB.blockMult, hold: 22, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_02_roar', 1); A.sfx('hit_heavy_boom_01', 0.9); A.shake(22, 40)
    })
    if (k === SB.impactAt + 3) { A.sfx('rumble_tail_01', 1); A.sfx('boom_huge_01', 0.8) }
    if (k === SB.waveAt) A.once('wave', () => { A.hit(SB.hits[1], { blockMult: SB.blockMult, hold: 6 }); A.sfx('boom_medium_02', 0.95); A.sfx('impact_crack_01', 0.9); A.shake(14, 18) })
    if (k === SB.waveAt + 8) A.sfx('boom_medium_01', 0.7)
    if (k === SB.pillarAt - 6) A.sfx('boom_anticipation_suck', 0.8)
    if (k === SB.pillarAt) A.once('pillar', () => { A.hit(SB.hits[2], { blockMult: SB.blockMult, hold: 14, big: true }); A.sfx('boom_huge_01', 1); A.sfx('hit_heavy_boom_01', 0.9); A.shake(20, 30) })
    if (k === SB.pillarAt + 10) A.sfx('rumble_tail_01', 0.9)
    if (k === SB.landAt && !c.blocked) { A.sfx('boom_medium_01', 0.8); A.sfx('impact_hit_01', 0.7); A.shake(8, 10) }
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, p = sakuraAt(c, k), q = foeAt(c, k)
    f.x = Math.round(p.x - (f.w || 48) / 2); f.y = Math.round(p.y - (f.h || 94)); f.facing = c.dir; f.onGround = !p.air; f.grounded = !p.air
    t.x = Math.round(q.x - (t.w || 48) / 2); t.y = Math.round(Math.min(q.y, c.tFloor) - (t.h || 94)); t.onGround = !q.air; t.grounded = !q.air
    t.isBlocking = c.blocked && k < SB.settleAt
  },
  camera(c, cam, k) {
    const f = c.caster, box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 }), p = sakuraAt(c, k), q = foeAt(c, k)
    if (k < SB.sealAt) cam.focusOnFighter(f, 1.6 + 0.2 * smooth(k / SB.sealAt))
    else if (k < SB.gatherAt) cam.focusOnFighter(f, 1.5)
    else if (k < SB.leapAt) cam.focusOnFighter(f, 1.55 + 0.25 * smooth((k - SB.gatherAt) / 32))
    else if (k < SB.diveAt) cam.focusOnFighter(box(p.x, p.y - 30), 1.3)
    else if (k < SB.impactAt) cam.focusBetween(box(p.x, p.y - 40), box(c.tx0, c.tFloor - 47), 1.0)
    else if (k < SB.waveAt) cam.focusBetween(box(c.slamX, c.floor - 47), box(c.tx0, c.tFloor - 47), 1.35)
    else if (k < SB.settleAt) cam.focusOnFighter(box((c.slamX + q.x) / 2, c.floor - 150), 0.8)
    else if (k < SB.landAt + 8) cam.focusBetween(box(c.slamX, c.floor - 47), box(c.land, c.tFloor - 47), 0.9)
    else cam.focusOnFighter(box(c.slamX, c.floor - 47), 1.35)
  },
  draw: (ctx, canvas, S) => drawSakuraUltScreen(ctx, canvas, S),
})

// Sakura's feet (world centre x, feet y) — pure
export function sakuraAt(c, k) {
  if (k < SB.leapAt) return { x: c.fx0, y: c.floor, air: false }
  if (k < SB.impactAt) {
    const u = (k - SB.leapAt) / (SB.impactAt - SB.leapAt)
    const x = lerp(c.fx0, c.slamX, k < SB.diveAt ? 0.45 * smooth((k - SB.leapAt) / (SB.diveAt - SB.leapAt)) : 0.45 + 0.55 * ((k - SB.diveAt) / (SB.impactAt - SB.diveAt)))
    let h
    if (k < SB.apexAt) h = outE((k - SB.leapAt) / (SB.apexAt - SB.leapAt)) * SB.leapH
    else if (k < SB.diveAt) h = SB.leapH + 10 * Math.sin((k - SB.apexAt) / (SB.diveAt - SB.apexAt) * Math.PI)   // the hang
    else h = SB.leapH * (1 - ((k - SB.diveAt) / (SB.impactAt - SB.diveAt)) ** 2)
    void u
    return { x, y: c.floor - h, air: true }
  }
  return { x: c.slamX, y: c.floor, air: false }
}
// the foe's feet — pure
export function foeAt(c, k) {
  const x0 = c.tx0
  if (k < SB.impactAt) return { x: x0, y: c.tFloor, air: false }
  if (c.blocked) { const u = smooth((k - SB.impactAt) / 60); return { x: lerp(x0, c.land, u), y: c.tFloor, air: false } }
  if (k < SB.waveAt) return { x: x0 + c.dir * 8 * smooth((k - SB.impactAt) / 14), y: c.tFloor, air: false }
  const xa = x0 + c.dir * 8
  if (k < SB.pillarAt) { const u = outE((k - SB.waveAt) / (SB.pillarAt - SB.waveAt)); return { x: xa + c.dir * 30 * u, y: c.tFloor - SB.launch1 * u, air: true } }
  const xb = xa + c.dir * 30
  if (k < SB.fallAt) { const u = outE((k - SB.pillarAt) / (SB.fallAt - SB.pillarAt)); return { x: lerp(xb, c.land, u * 0.7), y: c.tFloor - lerp(SB.launch1, SB.launch2, u), air: true } }
  if (k < SB.landAt) { const u = (k - SB.fallAt) / (SB.landAt - SB.fallAt); return { x: lerp(lerp(xb, c.land, 0.7), c.land, u), y: c.tFloor - SB.launch2 * (1 - u * u), air: true } }
  return { x: c.land, y: c.tFloor, air: false }
}

export const isSakuraUltActive = ult.isActive
export const sakuraUltScene = ult.scene
export const clearSakuraUlt = ult.clear
export const getSakuraUltStatus = ult.status
