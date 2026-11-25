// sasukeAdultUlt.js — Sasuke (Adult) (sasuke_adult) neutral ULTIMATE "輪廻眼 · 天手力 → 地爆天星 · 千鳥刀 — RINNEGAN:
// AMENOTEJIKARA, CHIBAKU TENSEI, CHIDORI BLADE" as a FROZEN CINEMATIC (2026-11-24 roster-wide ult pass). Replaces the legacy
// neutral Chibaku Tensei (a reel-in + one ground shockwave, behind a storyboard pre-roll — left untouched in abilities.js,
// no longer reached for neutral). KEPT ON THE LEGACY PATH (cast returns undefined): Forward = Shinra Tensei, Back = Banshō
// Ten'in (_ultVariant), and both War-Susano'o states (the Soldier's Indra's Arrow / the stance's enter-Soldier).
// Same input + cost (fighter.ultimate.cost ?? 100). DAMAGE: legacy 262 × offense raw WITH the attacker (roster boost) in one
// slam; here 4 swap-cuts × 30 + the Chidori-blade finisher 144 = 264 × offense raw, all WITH the attacker. Guard chips 25 %.
// BEATS (script frame k):
//   RINNEGAN        0-44   letterbox, violet-grey wash; close on his face — the Rinnegan opens, ripples spread: 輪廻眼
//   AMENOTEJIKARA  44-140  four instant SPACE SWAPS: a violet ripple, he is suddenly on the other side mid-cut (×4) — 天手力
//   CHIBAKU TENSEI 140-196 hand raised: a black core above the foe drags them up and seals them in a cocoon of rock — 地爆天星
//   CHIDORI BLADE 196-232  a thousand birds screaming down the Kusanagi; he leaps and runs the blade through the cocoon
//   SHATTER        232     white / inverted impact frame; lightning bursts through every crack; the rock explodes outward
//   AFTERMATH    232-300   rock rain, the foe drops; he sheathes: "You're a thousand years too early."
import { makeCineUlt, cineHit, sfx, voice, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { drawSasukeAdultUltScreen } from './sasukeAdultUltFx.js'

export const SA = {
  cutRaw: 30, finRaw: 144, blockMult: 0.25,
  swapAt: 44, swaps: [56, 78, 100, 120], chibakuAt: 140, liftAt: 150, sealAt: 180, chidoriAt: 196, leapAt: 218, pierceAt: 232, total: 300,
  cutStop: 5, finStop: 28, lift: 150,
}
// he appears on alternating sides of the foe for each swap; the sword strip + frame used for the cut
export const SWAP = [{ side: 1, anim: 'heavy', fr: 2 }, { side: -1, anim: 'heavy', fr: 3 }, { side: 1, anim: 'up', fr: 4 }, { side: -1, anim: 'heavy', fr: 2 }]
export const swapIndex = k => { let i = -1; for (let j = 0; j < SA.swaps.length; j++) if (k >= SA.swaps[j] - 4) i = j; return i }
const VOICE = { open: 'sasuke_taunt_darkness_eye.mp3', chidori: 'sasuke_chidori_cast.mp3', end: 'sasuke_serious_taunt.mp3' }
const off = f => Math.max(f.damageMultiplier || 1, f.attackMultiplier || 1)

const C = makeCineUlt({
  id: 'sasuke_adult_rinnegan', keys: ['sasuke_adult'], total: SA.total, maxZoom: 1.9,
  cost: f => f.ultimate?.cost ?? 100,
  gate(f) {
    const v = f._ultVariant || 'chibakuTensei'
    if (v !== 'chibakuTensei') return undefined                              // Shinra / Banshō → legacy
    if (f._warSoldier || (f._adultSusanoStance || 0) > 0) return undefined   // War-Susano'o → legacy
    return true
  },
  setup(S) { S.caster._ultVariant = null; S.fFace = S.dir; S.land = S.tx0 + S.dir * (S.blocked ? 40 : 90); S.off = off(S.caster) },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'heavy', 'up', 'chidori', 'chibakuTensei', 'swordSwap', 'win', 'jump'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { voice(ctx, S, VOICE.open); S.caster._atkVoiceCd = 300; sfx(ctx, 'pitch_drop_slowmo', 0.6) }
    if (k === 16) { sfx(ctx, 'warp_wobble_01', 0.8); sfx(ctx, 'sting_pitch_rise_hold', 0.6) }
    SA.swaps.forEach((at, i) => {
      if (k === at - 4) { sfx(ctx, 'warp_wobble_0' + (1 + i % 2), 0.9); sfx(ctx, 'swish_fast_0' + (1 + i % 3), 0.9) }
      if (k === at && !S.done['c' + i]) {
        S.done['c' + i] = true
        cineHit(S, Math.round(SA.cutRaw * S.off), { blockMult: SA.blockMult, attacker: true, move: 'saChibakuTensei' })
        S.hold = SA.cutStop; S.lastCut = { i, real: S.real }
        cam?.shake?.(6 + i * 2, 8); sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, 'impact_hit_01', 0.8)
      }
    })
    if (k === SA.chibakuAt) { sfx(ctx, 'boom_anticipation_suck', 0.9); sfx(ctx, 'energy_hum_low', 0.8) }
    if (k === SA.liftAt) { sfx(ctx, 'warp_wobble_02', 0.9); sfx(ctx, 'rumble_tail_01', 0.8); cam?.shake?.(6, 30) }
    if (k === SA.sealAt) { sfx(ctx, 'boom_medium_02', 1); cam?.shake?.(10, 16) }
    if (k === SA.chidoriAt) { voice(ctx, S, VOICE.chidori); sfx(ctx, 'crack_sizzle_bright', 1); sfx(ctx, 'charge_swell_riser', 0.9) }
    if (k > SA.chidoriAt && k < SA.pierceAt && (k - SA.chidoriAt) % 8 === 0) sfx(ctx, 'crack_sizzle_bright', 0.55)
    if (k === SA.leapAt) { sfx(ctx, 'whoosh_medium_01', 1); sfx(ctx, 'boom_anticipation_suck', 1) }
    if (k === SA.pierceAt && !S.done.fin) {
      S.done.fin = true; S.hitReal = S.real
      cineHit(S, Math.round(SA.finRaw * S.off), { blockMult: SA.blockMult, attacker: true, move: 'saChibakuTensei' })
      S.hold = SA.finStop; cam?.shake?.(24, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'crack_sizzle_bright', 1); sfx(ctx, 'boom_huge_01', 0.8)
    }
    if (k === SA.pierceAt + 10) sfx(ctx, 'rumble_tail_01', 1)
    if (k === SA.pierceAt + 36) voice(ctx, S, VOICE.end)
  },
  place(S, k) {
    S.pf = k
    // Sasuke
    if (k < SA.swapAt) { S.fx = S.fx0; S.fy = 0; S.fFace = S.dir }
    else if (k < SA.chibakuAt) {
      const i = swapIndex(k)
      if (i < 0) { S.fx = S.fx0; S.fy = 0; S.fFace = S.dir }
      else { const sw = SWAP[i]; S.fx = S.tx0 + sw.side * S.dir * 70; S.fy = 0; S.fFace = sw.side > 0 ? -S.dir : S.dir }
    } else if (k < SA.leapAt) { S.fx = S.tx0 - S.dir * 170; S.fy = 0; S.fFace = S.dir }
    else if (k < SA.pierceAt) { const u = smooth((k - SA.leapAt) / (SA.pierceAt - SA.leapAt)); S.fx = S.tx0 - S.dir * 170 * (1 - u); S.fy = SA.lift * u + Math.sin(Math.PI * u) * 40; S.fFace = S.dir }
    else { const u = clamp((k - SA.pierceAt) / 20, 0, 1); S.fx = S.tx0 + S.dir * 60 * u; S.fy = Math.max(0, SA.lift * (1 - u * u)); S.fFace = S.dir }
    // the foe: rocked by the swaps, dragged up into the cocoon, dropped when it shatters
    if (k < SA.liftAt) { S.tx = S.tx0; S.ty = 0 }
    else if (k < SA.pierceAt) { S.tx = S.tx0; S.ty = S.blocked ? 0 : SA.lift * smooth((k - SA.liftAt) / (SA.sealAt - SA.liftAt)) }
    else { const u = clamp((k - SA.pierceAt) / 26, 0, 1); S.tx = S.tx0 + (S.land - S.tx0) * u; S.ty = S.blocked ? 0 : SA.lift * (1 - u * u) }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 60), core = box(S.tx0, S.tFloor - SA.lift - 50)
    if (k < SA.swapAt) cam.focusOnFighter(f, 1.6 + 0.25 * smooth(k / SA.swapAt))
    else if (k < SA.chibakuAt) cam.focusOnFighter(foe, 1.3)
    else if (k < SA.chidoriAt) cam.focusBetween?.(box(S.fx, S.floor - 47), core, 1.0)
    else if (k < SA.leapAt) cam.focusOnFighter(f, 1.4)
    else if (k < SA.pierceAt + 30) cam.focusOnFighter(core, 1.15)
    else cam.focusBetween?.(box(S.fx, S.floor - 47), box(S.land, S.tFloor - 47), 1.15)
  },
  draw: (ctx, canvas, S) => drawSasukeAdultUltScreen(ctx, canvas, S),
})

export const isSasukeAdultUltActive = C.active
export const getSasukeAdultUltStatus = C.status
export const clearSasukeAdultUlt = C.clear
