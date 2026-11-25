// sixPathsPainUlt.js — Six Paths of Pain (six_paths_pain) ULTIMATE "ペイン六道 · SIX PATHS OF PAIN" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ult pass). Replaces the legacy swarm strike (abilities.executeSixPathsUltimate: one rush
// sprite + one guaranteed 300-raw hit, guard = 30 % — left untouched, no longer reached). Same input, cost (100) and
// total (300 raw: Animal 34 + Asura 34 + Human 34 + Preta 32 + Naraka 34 + Deva 136 = 304 — per-hit rounding lands it on the legacy ~180 effective; guard 30 % per hit).
// BEATS (script frames, 60 fps):
//   ASSEMBLE  0-46   rain over the stage; the six bodies flicker in behind him one by one while a six-panel manga grid of
//                    their faces slams in ("We, Akatsuki…"); ペイン六道
//   ANIMAL   50-74   畜生道 — the Animal Path summons the three-headed dog, which tramples the foe
//   ASURA    74-98   修羅道 — the Asura Path's arm-cannon missile streaks in and detonates
//   HUMAN    98-122  人間道 — the Human Path appears at the foe's side and tears their soul half out of the body
//   PRETA   122-142  餓鬼道 — the Preta Path drains their chakra in a stream of light
//   NARAKA  142-166  地獄道 — the King of Hell rises out of the ground behind the foe and passes judgement
//   DEVA    170-236  天道 — the Rinnegan fills the screen: "SHINRA TENSEI" — the almighty push blows the foe across the stage
//   AFTER   236-298  the six stand together in the rain: "Know pain."
import { defineNarutoUlt, clamp, smooth, outE, lerp } from './narutoUltKit.js'
import { drawSixPathsUltScreen, preloadSixPathsUlt } from './sixPathsPainUltFx.js'

export const SP = {
  cost: 100, blockMult: 0.3,
  paths: [   // the five support paths, in strike order (Deva = the caster finishes)
    { id: 'chiku',  at: 50,  hitAt: 64,  end: 74,  raw: 34, kanji: '畜生道', name: 'ANIMAL PATH' },
    { id: 'asura',  at: 74,  hitAt: 88,  end: 98,  raw: 34, kanji: '修羅道', name: 'ASURA PATH' },
    { id: 'ningen', at: 98,  hitAt: 110, end: 122, raw: 34, kanji: '人間道', name: 'HUMAN PATH' },
    { id: 'gakido', at: 122, hitAt: 132, end: 142, raw: 32, kanji: '餓鬼道', name: 'PRETA PATH' },
    { id: 'naraka', at: 142, hitAt: 156, end: 166, raw: 34, kanji: '地獄道', name: 'NARAKA PATH' },
  ],
  devaAt: 170, eyeAt: 182, pushAt: 210, devaRaw: 136, landAt: 236, total: 298, slide: 360,
  slots: [62, 124, 186, 93, 155],   // formation offsets behind the caster (world px)
}
const VOICE = { open: 'pain_voice_011_t00m51_8s.mp3', push: 'pain_voice_209_t08m39_1s.mp3', end: 'pain_voice_004_t00m31_3s.mp3' }

const ult = defineNarutoUlt({
  key: 'six_paths_pain', id: 'six_paths_pain_ult', total: SP.total, cost: SP.cost, zoom: 1.9,
  layout(c) { c.land = clamp(c.tx0 + c.dir * (c.blocked ? 130 : SP.slide), 80, c.stage - 80) },
  preload: (f, t) => preloadSixPathsUlt(f, t),
  beats(c, k, A) {
    if (k === 0) { A.voice(VOICE.open); A.sfx('pitch_drop_slowmo', 0.5) }
    for (let i = 0; i < 5; i++) if (k === 6 + i * 6) A.sfx('swish_fast_0' + (1 + (i % 3)), 0.5)
    SP.paths.forEach((p, i) => {
      if (k === p.at) A.sfx(['boom_anticipation_suck', 'charge_hum_rise', 'warp_wobble_01', 'energy_hum_low', 'rumble_tail_01'][i], 0.7)
      if (k === p.hitAt) A.once('p' + i, () => {
        A.hit(p.raw, { blockMult: SP.blockMult, hold: 7 })
        A.sfx(['hit_heavy_boom_01', 'boom_medium_02', 'crack_sizzle_bright', 'impact_hit_01', 'boom_medium_01'][i], 0.9); A.sfx('impact_crack_01', 0.6); A.shake(8 + i * 2, 12)
      })
    })
    if (k === 128) A.sfx('energy_tone_hold', 0.5)
    if (k === SP.devaAt) A.voice(VOICE.push)
    if (k === SP.eyeAt) { A.sfx('sting_pitch_rise_hold', 0.8); A.sfx('warp_wobble_02', 0.6) }
    if (k === SP.pushAt - 10) A.sfx('boom_anticipation_suck', 1)
    if (k === SP.pushAt) A.once('deva', () => {
      A.hit(SP.devaRaw, { blockMult: SP.blockMult, hold: 24, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_02_roar', 1); A.sfx('boom_huge_01', 0.9); A.shake(26, 40)
    })
    if (k === SP.pushAt + 10) A.sfx('rumble_tail_01', 1)
    if (k === SP.landAt && !c.blocked) { A.sfx('boom_medium_01', 0.8); A.shake(8, 10) }
    if (k === SP.landAt + 10) A.voice(VOICE.end)
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, q = foeAt(c, k)
    f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(q.x - (t.w || 48) / 2); t.y = Math.round(Math.min(q.y, c.tFloor) - (t.h || 94)); t.onGround = !q.air; t.grounded = !q.air
    t.isBlocking = c.blocked && k < SP.landAt
  },
  camera(c, cam, k) {
    const box = x => ({ x: x - 24, y: c.tFloor - 94, w: 48, h: 94 }), q = foeAt(c, k), back = c.fx0 - c.dir * 190
    if (k < SP.paths[0].at) cam.focusBetween(box(back), box(c.tx0), 1.0)
    else if (k < SP.devaAt) { const p = SP.paths.find(p => k < p.end) || SP.paths[4], b = bodyAt(c, SP.paths.indexOf(p), k)
      cam.focusBetween(box(b.x), box(c.tx0), p.id === 'naraka' ? 1.05 : 1.3) }
    else if (k < SP.pushAt) cam.focusOnFighter(c.caster, 1.5 + 0.3 * smooth((k - SP.devaAt) / 40))
    else if (k < SP.landAt + 6) cam.focusBetween(c.caster, box(q.x), 0.8)
    else cam.focusBetween(box(back), c.caster, 1.15)
  },
  draw: (ctx, canvas, S) => drawSixPathsUltScreen(ctx, canvas, S),
})

// where support body i stands at frame k (world x), and whether it is mid-teleport
export function bodyAt(c, i, k) {
  const home = clamp(c.fx0 - c.dir * SP.slots[i], 30, c.stage - 30), p = SP.paths[i]
  const away = p.id === 'ningen' || p.id === 'gakido'   // these two flicker to the foe's side
  if (!away || k < p.at + 4 || k >= p.end) return { x: home, home: true, flick: away && (Math.abs(k - p.at - 2) < 3 || Math.abs(k - p.end) < 3) }
  return { x: c.tx0 - c.dir * 48, home: false, flick: false }
}
export function foeAt(c, k) {
  if (k < SP.pushAt) return { x: c.tx0, y: c.tFloor, air: false }
  if (c.blocked) { const u = outE((k - SP.pushAt) / 24); return { x: lerp(c.tx0, c.land, u), y: c.tFloor, air: false } }
  if (k < SP.landAt) { const u = (k - SP.pushAt) / (SP.landAt - SP.pushAt); return { x: lerp(c.tx0, c.land, outE(u)), y: c.tFloor - 140 * Math.sin(Math.PI * u), air: true } }
  return { x: c.land, y: c.tFloor, air: false }
}

export const isSixPathsUltActive = ult.isActive
export const sixPathsUltScene = ult.scene
export const clearSixPathsUlt = ult.clear
export const getSixPathsUltStatus = ult.status
