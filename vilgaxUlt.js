// vilgaxUlt.js — Vilgax (vilgax) ULTIMATE "CONQUEST OF EARTH" as a FROZEN CINEMATIC (2026-11-24 roster-wide ultimate pass).
// Replaces the legacy inline Koma Atakes (abilities.executeVilgaxUltimate — untouched, no longer reached while a foe exists)
// through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100 plasma), same reach (range-independent sure hit, like
//   the legacy beams that manifested AT the foe). No foe → undefined → the legacy path.
//   DAMAGE: legacy 60+60+70+140 = 330 raw via applyScaledDamage WITH the attacker + move 'ultimate' (≈623 dealt on Naruto;
//   the killing-blow stamp routes a KO to the CHIMERIAN ONSLAUGHT brutality). Same 330 raw, same pipeline: 3 eye-laser rakes
//   50+50+60, the sword 60, the orbital lance 110. A held guard chips 25 % (same as legacy).
// BEATS (script frame k):
//   DECREE      0-52   letterbox; low angle on Vilgax, fist raised. The sky bleeds red and the Chimerian warship slides in
//                      over the arena, blotting out the sun. "Kneel before Vilgax." — CONQUEST OF EARTH band
//   EYES       52-74   cut-in: the real eye-blaze panel, Koma red flare
//   KOMA ATAKES 74-122 three converging red eye-laser rakes cross the foe, each one ripping a trench of explosions (3 hits)
//   THE BLADE 122-150  he blinks in with the energy sword — one horizontal cut that pops them into the air; "DIE!"
//   ORBITAL   150-178  the city-destruction panel flashes; the warship's green lance comes straight down on the foe →
//                      white → inverted impact frame, a green mushroom flash, the ground caves (the big hit)
//   AFTER     182-250  smoke + embers, the ship hangs overhead; Vilgax turns his back: "EARTH IS MINE."
import { makeCineUlt, cineHit, sfx, voice, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { drawVilgaxUltScreen } from './vilgaxUltFx.js'

export const B = {
  rakes: [50, 50, 60], sword: 60, lance: 110, blockMult: 0.25,
  eyeAt: 52, komaAt: 74, rakeAt: [86, 100, 114], bladeAt: 122, cutAt: 136, orbitAt: 150, lanceAt: 170, calmAt: 206, outAt: 238, total: 250,
  stop: 26, pop: 90, slide: 260,
}
const VOICE = { die: 'vilgax_018.mp3' }

const C = makeCineUlt({
  id: 'vilgax_conquest', keys: ['vilgax'], total: B.total, maxZoom: 1.9,
  cost: f => f.ultimate?.cost ?? 100,
  gate() { return true },
  setup(S) { S.fFace = S.dir; S.fx1 = S.tx0 - S.dir * 70; S.land = S.tx0 + S.dir * (S.blocked ? 90 : B.slide) },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'vilgaxUltAction', 'vilgaxBlastXCast', 'vilgaxSlash', 'vilgaxVanish', 'win'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
    image('./vilgax_ult_panel_eye.png'); image('./vilgax_ult_panel_city.png')
  },
  beats(S, ctx, k) {
    const cam = ctx.camera, hit = (raw) => cineHit(S, raw, { blockMult: B.blockMult, attacker: true, move: 'ultimate' })
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.8); sfx(ctx, 'boom_anticipation_suck', 0.6) }
    if (k === 14) { sfx(ctx, 'rumble_tail_01', 1); cam?.shake?.(6, 40) }
    if (k === 30) sfx(ctx, 'warp_wobble_01', 0.8)
    if (k === B.eyeAt) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); sfx(ctx, 'charge_swell_riser', 0.8) }
    if (k === B.komaAt) { sfx(ctx, 'energy_tone_hold', 0.8) }
    B.rakeAt.forEach((at, i) => {
      if (k === at - 6) sfx(ctx, 'crack_sizzle_bright', 0.8)
      if (k === at) { hit(B.rakes[i]); sfx(ctx, i === 2 ? 'boom_medium_02' : 'boom_medium_01', 0.9); sfx(ctx, 'impact_hit_01', 0.8); cam?.shake?.(10 + i * 4, 14); S.hold = 3 + i }
    })
    if (k === B.bladeAt) { sfx(ctx, 'warp_wobble_02', 0.9); sfx(ctx, 'whoosh_medium_02', 0.9) }
    if (k === B.cutAt) { hit(B.sword); sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'hit_heavy_boom_01', 0.9); voice(ctx, S, VOICE.die); cam?.shake?.(14, 16); S.hold = 6 }
    if (k === B.orbitAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'charge_hum_rise', 1) }
    if (k === B.lanceAt - 8) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.lanceAt && !S.done.lance) {
      S.done.lance = true; S.lanceReal = S.real
      hit(B.lance); S.hold = B.stop; cam?.shake?.(24, 48)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.95); sfx(ctx, 'impact_crack_01', 1)
    }
    if (k === B.lanceAt + 12) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.calmAt) sfx(ctx, 'rumble_tail_01', 0.6)
  },
  place(S, k) {
    S.pf = k
    // he blinks in for the cut, then strides back to where he stood
    if (k < B.bladeAt + 4) S.fx = S.fx0
    else if (k < B.orbitAt + 6) S.fx = S.fx1
    else S.fx = S.fx0 + (S.fx1 - S.fx0) * (1 - smooth((k - B.orbitAt - 6) / 16))
    if (k < B.cutAt) { S.tx = S.tx0; S.ty = 0 }
    else if (k < B.lanceAt) { const u = clamp((k - B.cutAt) / 18, 0, 1); S.tx = S.tx0 + S.dir * 30 * u; S.ty = S.blocked ? 0 : B.pop * Math.sin(Math.PI * 0.5 * u) }
    else {   // the lance drives them into the ground, then they skid out of the crater
      const u = clamp((k - B.lanceAt) / 6, 0, 1), v = clamp((k - B.lanceAt - 10) / 36, 0, 1), e = 1 - (1 - v) ** 2
      S.tx = S.tx0 + S.dir * 30 + (S.land - S.tx0 - S.dir * 30) * e
      S.ty = S.blocked ? 0 : Math.max(0, B.pop * (1 - u)) + (v > 0 ? Math.sin(Math.PI * v) * 30 * (1 - v) : 0)
    }
  },
  camera(S, cam, k) {
    const f = S.caster
    if (k < B.eyeAt) cam.focusOnFighter(box(S.fx0, S.floor - 140), 0.75 + 0.15 * smooth(k / B.eyeAt))   // low wide: the ship arriving
    else if (k < B.komaAt) cam.focusOnFighter(f, 1.6)
    else if (k < B.bladeAt) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47), 1.2)
    else if (k < B.orbitAt) cam.focusBetween?.(f, box(S.tx, S.tFloor - 47 - (S.ty || 0)), 1.45)
    else if (k < B.lanceAt) cam.focusOnFighter(box(S.tx, S.tFloor - 160), 0.8)   // up the lance
    else if (k < B.calmAt) cam.focusOnFighter(box((S.fx + S.tx) / 2, S.floor - 60), 0.95)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawVilgaxUltScreen(ctx, canvas, S, B),
})
export const isVilgaxUltActive = C.active
export const getVilgaxUltStatus = C.status
export const clearVilgaxUlt = C.clear
void ctrX
