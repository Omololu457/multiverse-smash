// zarakiUlt.js — Zaraki Kenpachi (zaraki / zaraki_shikai) ULTIMATE "BANKAI — THE DEMON'S CLEAVER" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ultimate pass). Replaces the legacy plain-attack Bankai (abilities.executeZarakiUltimate — untouched,
// still the WHIFF path) through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (fighter.ultimate.cost ?? 100). In reach (the legacy
//   cleaver's 172 px + its 10 px/f lunge ≈ 290 px, same level) → the cinematic, a sure single cleave. Out of reach → undefined
//   → the legacy swing plays and whiffs exactly as today.
//   DAMAGE: one cleave through applyScaledDamage WITH the attacker (the legacy hit ran the combat pipeline with the attacker's
//   roster boost): 300 raw → ≈586 dealt on Naruto (identical to the legacy 586). A held guard chips 12 % (legacy: 68).
// BEATS (script frame k; the cleave holds B.stop real frames of hit-stop):
//   EYEPATCH   0-56   letterbox; push in on the grin. "No need to hold back for once!" — he tears the eyepatch off: a
//                     reiatsu shock (yellow → red), the floor buckles
//   BANKAI    56-120  a colossal crimson reiatsu column with a SKULL in it erupts into the sky; red sky; 卍解 BANKAI band
//   THE DEMON 120-176 the aura condenses into the red demon (close-up re-blit); a roar; 剣八 calligraphy; "The best!…"
//   RAISE    176-210  time slows to a crawl, the colour drains, the cleaver rises over his head; one step, then he is ON them
//   CLEAVE   210      the cleaver falls: white frame → inverted frame → THE WORLD IS CUT (the screen splits along the blade)
//   AFTERMATH 214-296 a fissure tears across the whole stage, crimson shockwave, debris; the foe skids away;
//                     the demon burns off him; "Entertain me!" — he grins, back to himself
import { makeCineUlt, cineHit, sfx, voice, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { drawZarakiUltScreen } from './zarakiUltFx.js'

export const B = {
  raw: 300, blockMult: 0.12,
  patchAt: 30, bankaiAt: 56, demonAt: 120, raiseAt: 176, lungeAt: 200, cleaveAt: 210, splitEnd: 246, calmAt: 262, outAt: 290, total: 300,
  stop: 30, reach: 290, slide: 320,
}
const VOICE = { open: 'zaraki_line_086.mp3', demon: 'zaraki_line_069.mp3', after: 'zaraki_line_012.mp3' }

const C = makeCineUlt({
  id: 'zaraki_bankai_demon', keys: ['zaraki', 'zaraki_shikai'], total: B.total, maxZoom: 1.9,
  cost: f => f.ultimate?.cost ?? 100,
  gate(f, t) {   // out of the cleaver's reach / a different level → the legacy swing (a whiff, like today)
    if (Math.abs(ctrX(t) - ctrX(f)) > B.reach || Math.abs((t.y || 0) - (f.y || 0)) > 120) return undefined
    return true
  },
  setup(S) {
    S.fx1 = S.tx0 - S.dir * 78   // where he lands the cleave: the blade comes down ON the foe
    S.land = S.tx0 + S.dir * (S.blocked ? 120 : B.slide)
    S.fFace = S.dir
  },
  preload(S) { preloadAnims(S.caster, ['idle', 'zarakiBankai']); preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown']) },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'whoosh_medium_01', 0.5); voice(ctx, S, VOICE.open) }
    if (k === 18) sfx(ctx, 'energy_hum_low', 0.7)
    if (k === B.patchAt) { sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'boom_anticipation_suck', 0.9); cam?.shake?.(10, 14) }
    if (k === B.patchAt + 4) sfx(ctx, 'charge_swell_riser', 0.9)
    if (k === B.bankaiAt) { sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_frame_boom_long', 0.8); cam?.shake?.(18, 30) }
    if (k === B.bankaiAt + 14) { sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'rumble_tail_01', 0.9) }
    if (k === 96) sfx(ctx, 'charge_hum_rise', 0.8)
    if (k === B.demonAt) { sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'crack_sizzle_bright', 0.7); cam?.shake?.(14, 22); voice(ctx, S, VOICE.demon) }
    if (k === B.demonAt + 30) sfx(ctx, 'rumble_tail_01', 0.8)
    if (k === B.raiseAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.8) }
    if (k === B.lungeAt - 6) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.lungeAt) { sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'whoosh_medium_02', 0.8) }
    if (k === B.cleaveAt && !S.done.cleave) {
      S.done.cleave = true; S.cleaveReal = S.real
      cineHit(S, B.raw, { blockMult: B.blockMult, attacker: true, move: 'zarakiBankai' })
      S.hold = B.stop
      cam?.shake?.(22, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.95); sfx(ctx, 'impact_crack_01', 1)
    }
    if (k === B.cleaveAt + 2) { sfx(ctx, 'boom_huge_01', 1); cam?.shake?.(20, 34) }
    if (k === B.cleaveAt + 10) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.cleaveAt + 40) sfx(ctx, 'rumble_tail_01', 0.7)
    if (k === B.calmAt) voice(ctx, S, VOICE.after)
  },
  place(S, k) {
    S.pf = k
    const lu = k < B.lungeAt ? 0 : k < B.cleaveAt ? smooth((k - B.lungeAt) / (B.cleaveAt - B.lungeAt)) : 1
    S.fx = S.fx0 + (S.fx1 - S.fx0) * lu
    if (k < B.cleaveAt + 4) { S.tx = S.tx0; S.ty = 0 }
    else {
      const u = clamp((k - B.cleaveAt - 4) / 40, 0, 1), e = 1 - (1 - u) ** 2
      S.tx = S.tx0 + (S.land - S.tx0) * e
      S.ty = S.blocked ? 0 : Math.max(0, Math.sin(Math.PI * clamp(u * 1.6, 0, 1)) * 70)
    }
  },
  camera(S, cam, k) {
    const f = S.caster, mid = (S.fx0 + S.tx0) / 2
    if (k < B.bankaiAt) cam.focusOnFighter(f, 1.55 + 0.3 * smooth(k / B.bankaiAt))
    else if (k < B.demonAt) cam.focusOnFighter(box(S.fx0, S.floor - 200), 0.7)                     // pull out: the pillar into the sky
    else if (k < B.raiseAt) cam.focusOnFighter(f, 1.6)
    else if (k < B.cleaveAt) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47), 1.2)
    else if (k < B.splitEnd) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47), 1.35)
    else if (k < B.calmAt) cam.focusOnFighter(box((S.fx1 + S.land) / 2, S.floor - 47), 0.85)
    else cam.focusOnFighter(f, 1.3)
    void mid
  },
  draw: (ctx, canvas, S) => drawZarakiUltScreen(ctx, canvas, S, B),
})
export const isZarakiUltActive = C.active
export const getZarakiUltStatus = C.status
export const clearZarakiUlt = C.clear
