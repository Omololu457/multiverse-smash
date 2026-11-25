// ghostfaceUlt.js — Ghostface (ghostface) ULTIMATE "THE FINAL ACT" rebuilt as a horror-movie FROZEN CINEMATIC (2026-11-24
// roster-wide "every character gets their own special ultimate" pass). Replaces the legacy stab-flurry overlay
// (abilities.executeGhostfaceUltimate → ghostfaceFinalActCinematic.js — both untouched, still used by the Killer-Swap forms:
// a swapped Ghostface has a borrowed rosterKey, so this registered cast returns undefined for it) via cineRegistry:
//   cast(): same gate as the legacy (not attacking / no attack cooldown), same cost (100), same sure-hit, range-independent
//   payoff. DAMAGE: legacy one 320-raw hit through applyScaledDamage WITH the attacker + move 'ultimate' (Brutality stamp)
//   + the lethal bleed DoT (6 × 10 over ~1.8 s) on a clean hit. Here: the SAME 320 raw split over 5 stabs × 36 + the final
//   stab 140 (same options, move 'ultimate' on every stab) + the SAME bleed stamped at the end on a clean hit. A held guard
//   chips 25 % and gets no bleed (legacy rule).
// BEATS (script frame k; hit-stop holds real frames on the stabs):
//   THE CALL      0-44   film grain, the lights dim, a phone rings: "What's your favourite scary movie?"
//   LIGHTS OUT   44-82   the stage goes BLACK; only the foe, caught in a flashlight cone, looking left… right… he is gone
//   JUMP SCARE   82-98   the mask fills the screen with a shriek
//   THE KILL     98-172  red light; he is behind them — five stabs from every side, each a close-up with a red slash + hit-stop
//   THE FINAL ACT 172-206 slow motion: the knife raised against a blood moon
//   FINAL STAB    206    white / inverted frame → the red slash across the screen; the foe crumples
//   CUT!         206-300 a clapperboard snaps: "THE END?" — he waves: "See you soon!"
import { makeCineUlt, cineHit, sfx, voice, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { registerUltCast } from './cineRegistry.js'
import { drawGhostfaceUltScreen } from './ghostfaceUltFx.js'

const BLEED = { ticks: 6, interval: 18, dmg: 10 }   // = abilities.js GHOSTFACE_ULT_BLEED
export const B = {
  stabRaw: 36, finalRaw: 150, blockMult: 0.25,
  darkAt: 44, scareAt: 82, killAt: 98, stabs: [106, 120, 134, 148, 162], raiseAt: 172, finalAt: 206, cutAt: 236, outAt: 290, total: 300,
  stabStop: 5, stop: 26, slide: 130,
}
const VOICE = { call: 'ghostface_049_t02m04_8s.mp3', stab: 'ghostface_155_t07m46_6s.mp3', kill: 'ghostface_174_t08m41_0s.mp3', end: 'ghostface_001_t00m01_4s.mp3' }

// KILLER FORMS (2026-11-24): a Ghostface mid-Killer-Swap carries the borrowed rosterKey (zaraki = ENFORCER, chrollo =
// ASSASSIN) — abilities.triggerUltimate still routes his ULTIMATE to 'ghostface'. They get THE FINAL ACT framed for that
// killer: the same beats / damage / bleed, but the killer's own sheets (in its blue / violet Killer tint), its own strike
// poses, its own grade + title + lines. Ghostface himself = the original red cut.
const GF_FORM = {
  name: 'ghostface', tint: null, col: '200,10,20', hex: '#c8101c', hot: '#ff3040', wash: '#3a0004', soft: '#ff1020', moon: ['255,60,50', '160,0,10', '#d82030'],
  title: 'THE FINAL ACT', tag: 'GHOSTFACE  ·  “EVERY MOVIE NEEDS A KILLER ENDING”', who: 'GHOSTFACE', stab: 'STAB!',
  lines: ['“What’s your favourite scary movie?”', 'STAB!', 'Death by a thousand cuts.', 'See you soon!'],
  intro: ['taunt', 'idle'], strikes: [['gfUlt', 0, 1], ['gfLunge', 0, 1], ['gfUlt', 3, 4], ['gfLowCut', 1, 2], ['heavy', 0, 1]],
  raise: ['gfUlt', 5], fin: ['gfUlt', 4], anims: ['idle', 'taunt', 'gfUlt', 'gfLunge', 'gfLowCut', 'heavy', 'charge', 'walk'], voice: null,
}
const KILLER_FORMS = {
  zaraki: { name: 'enforcer', tint: '#2f6fd0', col: '40,110,255', hex: '#2f6fd0', hot: '#6fb0ff', wash: '#020a2a', soft: '#3f8cff', moon: ['120,170,255', '20,40,140', '#3a62c8'],
    title: 'THE FINAL ACT', tag: 'GHOSTFACE  ·  THE ENFORCER CUT', who: 'GHOSTFACE  (ENFORCER)', stab: 'CLEAVE!',
    lines: ['“Fine. No small talk. It’s straight to the violence.”', '“I’ll gut you!”', '“So many ways to kill!”', '“Be afraid. Be very afraid.”'],
    intro: ['taunt', 'idle'], strikes: [['zarakiFwdSlash1', 0, 2], ['heavy', 0, 2], ['zarakiFwdSlash2', 0, 2], ['zarakiHollowStrike', 1, 3], ['light', 0, 2]],
    raise: ['zarakiBankai', 2], fin: ['heavy', 3], anims: ['idle', 'taunt', 'heavy', 'light', 'zarakiFwdSlash1', 'zarakiFwdSlash2', 'zarakiHollowStrike', 'zarakiBankai'], voice: ['ghostface_132_t06m40_1s.mp3', 'ghostface_038_t01m29_1s.mp3', 'ghostface_042_t01m39_5s.mp3', 'ghostface_180_t09m02_8s.mp3'] },
  chrollo: { name: 'assassin', tint: '#8a5bd0', col: '150,80,255', hex: '#8a5bd0', hot: '#c79bff', wash: '#14002a', soft: '#8a5bd0', moon: ['200,150,255', '70,20,140', '#7a48c8'],
    title: 'THE FINAL ACT', tag: 'GHOSTFACE  ·  THE ASSASSIN’S CUT', who: 'GHOSTFACE  (ASSASSIN)', stab: 'SLICE!',
    lines: ['“Are you watching?”', '“Who needs a knife? I’m already under your skin.”', '“Cut flesh, scrape bone.”', '“Did you miss me?”'],
    intro: ['intro', 'idle'], strikes: [['chBladeLunge', 0, 2], ['chCombo1', 0, 2], ['light', 0, 2], ['chComboFin', 0, 2], ['heavy', 0, 2]],
    raise: ['chNenCast', 2], fin: ['chComboFin', 3], anims: ['idle', 'intro', 'light', 'heavy', 'chBladeLunge', 'chCombo1', 'chComboFin', 'chNenCast'], voice: ['ghostface_037_t01m27_1s.mp3', 'ghostface_163_t08m09_6s.mp3', 'ghostface_040_t01m33_3s.mp3', 'ghostface_012_t00m32_4s.mp3'] },
}
const isKillerForm = f => !!f && !!f._gfSwapActive && !!f._killerForm && !!KILLER_FORMS[(f.rosterKey || '').toLowerCase()]

const cfg = (id, keys, gate, formOf) => ({
  id, keys, total: B.total, maxZoom: 1.9,
  cost: 100,
  gate,
  setup(S) {
    S.form = formOf(S.caster)
    S.behind = S.tx0 + S.dir * 58                    // he appears BEHIND the foe
    S.land = S.tx0 - S.dir * (S.blocked ? 30 : 0) + S.dir * (S.blocked ? 0 : S.slide * 0.3)
    S.fFace = S.dir
  },
  finish(S) {   // the lethal bleed (legacy finisher DoT) on a clean hit only
    const t = S.target
    if (t && !S.blocked && t.health > 0) t._dot = { ticks: BLEED.ticks, interval: BLEED.interval, dmg: BLEED.dmg, delay: BLEED.interval }
  },
  preload(S) {
    preloadAnims(S.caster, S.form.anims)
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    const kv = S.form.voice                                                // a killer form: its own Ghostface lines (voiceFileManifest clips)
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.6); voice(ctx, S, kv ? kv[0] : VOICE.call) }
    if (k === 6 || k === 20) sfx(ctx, 'energy_tone_hold', 0.45)                         // the phone ringing
    if (k === B.darkAt) { sfx(ctx, 'pitch_drop_slowmo', 0.9); sfx(ctx, 'boom_medium_01', 0.5) }
    if (k === B.darkAt + 14 || k === B.darkAt + 26) sfx(ctx, 'whoosh_medium_02', 0.35)
    if (k === B.scareAt) { sfx(ctx, 'sting_pitch_rise_hold', 1); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'crack_sizzle_bright', 1); cam?.shake?.(18, 16) }
    if (k === B.killAt) voice(ctx, S, kv ? kv[1] : VOICE.stab)
    const si = B.stabs.indexOf(k)
    if (si >= 0) {
      cineHit(S, B.stabRaw, { blockMult: B.blockMult, attacker: true, move: 'ultimate' })
      S.hold = B.stabStop; S.lastStab = { i: si, real: S.real }; cam?.shake?.(8 + si * 2, 10)
      sfx(ctx, 'swish_fast_0' + (1 + si % 3), 1); sfx(ctx, 'impact_hit_01', 0.9)
    }
    if (B.stabs.some(sk => k === sk - 5)) sfx(ctx, 'whoosh_medium_01', 0.5)
    if (k === B.raiseAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'charge_hum_rise', 0.7); voice(ctx, S, kv ? kv[2] : VOICE.kill) }
    if (k === B.finalAt - 6) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.finalAt && !S.done.fin) {
      S.done.fin = true; S.hitReal = S.real
      cineHit(S, B.finalRaw, { blockMult: B.blockMult, attacker: true, move: 'ultimate' })
      S.hold = B.stop; cam?.shake?.(22, 40)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'boom_huge_01', 0.8)
    }
    if (k === B.finalAt + 10) sfx(ctx, 'rumble_tail_01', 0.9)
    if (k === B.cutAt) { sfx(ctx, 'impact_crack_01', 1); voice(ctx, S, kv ? kv[3] : VOICE.end) }
  },
  place(S, k) {
    S.pf = k
    // Ghostface: stalking in place → gone in the dark → behind them for the kill → blinks side to side for the stabs
    if (k < B.killAt) S.fx = S.fx0
    else if (k < B.raiseAt) {
      let i = 0; for (let j = 0; j < B.stabs.length; j++) if (k >= B.stabs[j] - 6) i = j
      const side = i % 2 === 0 ? 1 : -1
      S.fx = S.tx0 + side * S.dir * 56; S.fFace = side > 0 ? -S.dir : S.dir
    } else { S.fx = S.behind; S.fFace = -S.dir }
    S.fy = 0
    if (k < B.finalAt + 2) {
      const ls = S.lastStab, kick = ls ? Math.max(0, 1 - (S.real - ls.real) / 10) : 0
      S.tx = S.tx0 + (ls ? (ls.i % 2 ? 1 : -1) * S.dir * 8 * kick : 0); S.ty = 0
    } else S.tx = S.tx0 - S.dir * 30 * smooth((k - B.finalAt) / 20)
    S.land = S.tx
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 47)
    if (k < B.darkAt) cam.focusOnFighter(f, 1.5 + 0.3 * smooth(k / B.darkAt))
    else if (k < B.killAt) cam.focusOnFighter(foe, 1.45)
    else if (k < B.raiseAt) cam.focusOnFighter(foe, 1.4)
    else if (k < B.cutAt) cam.focusBetween?.(box(S.behind, S.floor - 47), foe, 1.35)
    else cam.focusOnFighter(box(S.behind, S.floor - 47), 1.3)
  },
  draw: (ctx, canvas, S) => drawGhostfaceUltScreen(ctx, canvas, S, B),
})
const C = makeCineUlt(cfg('ghostface_final_act', ['ghostface'], f => ((f.rosterKey || '').toLowerCase() === 'ghostface' ? true : undefined), () => GF_FORM))
// The killer cut: keys = the borrowed rosterKeys (makeCineUlt's cast checks them) but with forEach() a no-op so it never
// registers itself under 'zaraki' / 'chrollo' (that would hijack the real Zaraki's / Chrollo's own ultimates).
const KILLER_KEYS = Object.assign(Object.keys(KILLER_FORMS), { forEach() {} })
const K = makeCineUlt(cfg('ghostface_final_act_killer', KILLER_KEYS, f => (isKillerForm(f) ? true : undefined), f => KILLER_FORMS[(f.rosterKey || '').toLowerCase()]))
// triggerUltimate dispatches a swapped Ghostface under 'ghostface' → route by form
registerUltCast('ghostface', (f, context, opts) => (isKillerForm(f) ? K.cast(f, context, opts) : C.cast(f, context, opts)))
export const isGhostfaceUltActive = () => C.active() || K.active()
export const getGhostfaceUltStatus = () => (K.active() ? K.status() : C.status())
export const clearGhostfaceUlt = () => { C.clear(); K.clear() }
void ctrX; void clamp
