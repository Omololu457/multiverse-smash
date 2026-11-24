// gaaraUlt.js — Gaara (gaara) ULTIMATE "SABAKU KYŪ · SABAKU SŌSŌ — DESERT GRAVEYARD" as a FROZEN CINEMATIC (2026-11-24
// roster-wide ult pass). Replaces the legacy Sabaku Taisou (abilities.executeGaaraUltimate: 7 sure-hit beats 16/16/16/20/20
// + the 160 crush + the 80 burst = 328 raw, 25 % on guard, art drawn tiny by game.js — left untouched, no longer reached)
// and its storyboard pre-roll, for the NEUTRAL Ultimate only. The Shukaku branches (Down+Ultimate summon, any Ultimate
// while Shukaku is out) return undefined → the legacy path, unchanged. Same cost (100) and the same 328 raw / 25 % guard.
// BEATS (script frames, 60 fps) — every sand effect is Gaara's own fx strip, drawn at real scale:
//   GOURD     0-40   letterbox; the cork pops, sand pours out of the gourd and coils around him; the cut-in card slides in
//   SAND SEA 40-72   the stage floods with sand — ripples race out, the foe sinks to the shins
//   HANDS    72-106  two giant sand hands rise and close around the foe (3 grinding hits)
//   COFFIN  106-132  the sand dome seals over them (2 hits); 砂縛柩 SABAKU KYŪ — SAND COFFIN
//   CLENCH  132-152  close-up: his outstretched hand slowly closes into a fist
//   FUNERAL  152     SABAKU SŌSŌ! — the coffin implodes: white / inverted frames, hit-stop, the crush (160)
//   GRAVEYARD 152-196 he kneels, palms to the earth: the buried sand erupts (80) and spits the foe out
//   AFTERMATH 196-262 the sand streams back into the gourd; "…Stay down."
import { defineNarutoUlt, clamp, smooth, outE, lerp } from './narutoUltKit.js'
import { drawGaaraUltScreen, preloadGaaraUlt } from './gaaraUltFx.js'

export const GB = {
  cost: 100, chips: [16, 16, 16], dome: [20, 20], crush: 160, burst: 80, blockMult: 0.25,
  seaAt: 40, handsAt: 72, handHits: [82, 92, 102], domeAt: 106, domeHits: [116, 128], clenchAt: 132, crushAt: 152,
  kneelAt: 166, burstAt: 184, landAt: 214, returnAt: 200, total: 262,
}

const ult = defineNarutoUlt({
  key: 'gaara', id: 'gaara_sandfuneral', total: GB.total, cost: f => f.ultimate?.cost ?? GB.cost, refuseBusy: false, zoom: 1.9,
  gate: f => !(f._shukaku && !f._shukaku.ending) && (f._ultVariant || '') !== 'shukaku',   // Shukaku inputs stay legacy
  layout(c) { c.land = clamp(c.tx0 + c.dir * (c.blocked ? 90 : 150), 80, c.stage - 80) },
  preload: (f, t) => preloadGaaraUlt(f, t),
  beats(c, k, A) {
    if (k === 0) { A.sfx('whoosh_medium_01', 0.5); A.sfx('rumble_tail_01', 0.4) }
    if (k === 8) A.sfx('impact_hit_01', 0.5)   // the cork
    if (k === 12) A.sfx('energy_hum_low', 0.7)
    if (k === GB.seaAt) { A.sfx('rumble_tail_01', 0.9); A.sfx('whoosh_medium_02', 0.7); A.shake(5, 24) }
    if (k === GB.handsAt) { A.sfx('charge_swell_riser', 0.8); A.sfx('boom_medium_01', 0.6); A.shake(6, 14) }
    GB.chips.forEach((d, i) => { if (k === GB.handHits[i]) A.once('h' + i, () => { A.hit(d, { blockMult: GB.blockMult, hold: 2 }); A.sfx('hit_flurry_01', 0.6); A.shake(4, 6) }) })
    if (k === GB.domeAt) { A.sfx('boom_medium_02', 0.8); A.shake(8, 12) }
    GB.dome.forEach((d, i) => { if (k === GB.domeHits[i]) A.once('d' + i, () => { A.hit(d, { blockMult: GB.blockMult, hold: 3 }); A.sfx('impact_hit_01', 0.7); A.shake(6, 8) }) })
    if (k === GB.clenchAt) { A.sfx('sting_pitch_rise_hold', 0.8); A.sfx('pitch_drop_slowmo', 0.6) }
    if (k === GB.crushAt - 6) A.sfx('boom_anticipation_suck', 1)
    if (k === GB.crushAt) A.once('crush', () => {
      A.hit(GB.crush, { blockMult: GB.blockMult, hold: 24, big: true })
      A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_01', 1); A.sfx('hit_heavy_boom_01', 0.9); A.shake(20, 36)
    })
    if (k === GB.crushAt + 6) A.sfx('rumble_tail_01', 1)
    if (k === GB.burstAt - 6) A.sfx('charge_hum_rise', 0.7)
    if (k === GB.burstAt) A.once('burst', () => { A.hit(GB.burst, { blockMult: GB.blockMult, hold: 10, big: true }); A.sfx('boom_huge_02_roar', 0.9); A.sfx('boom_medium_01', 0.8); A.shake(18, 26) })
    if (k === GB.returnAt) A.sfx('whoosh_medium_01', 0.6)
    if (k === GB.landAt && !c.blocked) { A.sfx('boom_medium_01', 0.7); A.shake(6, 8) }
  },
  place(c, k) {
    c.pf = k
    const f = c.caster, t = c.target, q = foeAt(c, k)
    f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.facing = c.dir; f.onGround = true; f.grounded = true
    t.x = Math.round(q.x - (t.w || 48) / 2); t.y = Math.round(Math.min(q.y, c.tFloor) - (t.h || 94)); t.onGround = !q.air; t.grounded = !q.air
    t.isBlocking = c.blocked && k < GB.burstAt
  },
  camera(c, cam, k) {
    const f = c.caster, box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 }), q = foeAt(c, k), tb = box(c.tx0, c.tFloor - 60)
    if (k < GB.seaAt) cam.focusOnFighter(f, 1.6)
    else if (k < GB.handsAt) cam.focusBetween(f, tb, 0.95)
    else if (k < GB.clenchAt) cam.focusOnFighter(tb, 1.25)
    else if (k < GB.crushAt) cam.focusOnFighter(f, 1.75)
    else if (k < GB.burstAt + 6) cam.focusOnFighter(tb, 1.1)
    else if (k < GB.landAt + 6) cam.focusBetween(f, box(q.x, c.tFloor - 100), 0.85)
    else cam.focusBetween(f, box(c.land, c.tFloor - 47), 1.15)
  },
  draw: (ctx, canvas, S) => drawGaaraUltScreen(ctx, canvas, S),
})

export function foeAt(c, k) {
  if (k < GB.seaAt) return { x: c.tx0, y: c.tFloor, air: false, sink: 0 }
  if (k < GB.burstAt) return { x: c.tx0, y: c.tFloor, air: false, sink: c.blocked ? 0.15 : Math.min(0.35, smooth((k - GB.seaAt) / 40) * 0.35) }
  if (c.blocked) return { x: lerp(c.tx0, c.land, outE((k - GB.burstAt) / 20)), y: c.tFloor, air: false, sink: 0 }
  if (k < GB.landAt) { const u = (k - GB.burstAt) / (GB.landAt - GB.burstAt); return { x: lerp(c.tx0, c.land, u), y: c.tFloor - 230 * Math.sin(Math.PI * u) * (1 - u * 0.2), air: true, sink: 0 } }
  return { x: c.land, y: c.tFloor, air: false, sink: 0 }
}

export const isGaaraUltActive = ult.isActive
export const gaaraUltScene = ult.scene
export const clearGaaraUlt = ult.clear
export const getGaaraUltStatus = ult.status
