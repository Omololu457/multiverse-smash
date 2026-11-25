// inosukeUlt.js — Inosuke Hashibira (inosuke) ULTIMATE "BEAST BREATHING · EIGHTH FORM — EXPLOSIVE RUSH" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide "every character gets their own special ultimate" pass). Replaces the legacy scheduled-spawn rush
// (abilities.executeInosukeUltimate — untouched, still the OUT-OF-REACH path) through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), NO meter (Inosuke's ult is cooldown-only): stamps the same short
//   lockout as the legacy cast (INOSUKE_ULT_CD 540 + _suppressUltCooldown so triggerUltimate keeps it). In the legacy reach
//   (520 px, ±140 px level) → the cinematic, sure-hit; out of reach → undefined → the legacy cast (its whiff dash) plays.
//   DAMAGE: legacy 5 × 30 + 150 = 300 raw through applyScaledDamage WITHOUT the attacker (≈180 on Naruto). Here the same option
//   set: 5 fangs × 32 + 160 finisher = 320 raw (≈ +7 %); a held guard chips 25 % of every hit (legacy rule) and is never launched.
// BEATS (script frame k; each fang holds a few real frames of hit-stop, the rush 24):
//   PIG ASSAULT   0-40   letterbox; push in — he crosses his jagged blades over the boar mask: "猪突猛進!"
//   SPATIAL       40-92  漆ノ型 空間識覚 SPATIAL AWARENESS: the world drains to night blue, he spreads his arms, sonar ripples
//                        roll across the ground and find the foe — a red heat-silhouette and a lock-on: "Found you!"
//   STANCE        92-110 he drops to all fours, the ground cracks; BEAST BREATHING band
//   FANG RUSH    110-188 five fangs from alternating sides, each a real close-up re-blit with serrated twin slash marks,
//                        hit-stop, shake and a fang stamp (壱 · 弐 · 参 · 伍 · 陸)
//   WIND-UP      188-212 he skids back to the far edge, slow motion, the colour drains, his body coils
//   EXPLOSIVE RUSH 212   he detonates forward in a dust explosion — 捌ノ型 爆裂猛進 — a boar-spirit charge
//   IMPACT       226     white → inverted frame, a screen-wide serrated X; the foe is launched, spinning
//   AFTERMATH    226-300 he skids to a stop, blades up: "I'm the King of the Mountain!"
import { makeCineUlt, cineHit, sfx, voice, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { drawInosukeUltScreen } from './inosukeUltFx.js'

const INOSUKE_ULT_CD = 540   // = abilities.js INOSUKE_ULT_CD (the legacy cast's own short lockout)
export const B = {
  fangRaw: 32, rushRaw: 160, blockMult: 0.25, reach: 520,
  spatialAt: 40, stanceAt: 92, fangAt: 110, fangs: [116, 130, 144, 158, 172], windAt: 188, rushAt: 212, hitAt: 226,
  calmAt: 258, outAt: 290, total: 300, fangStop: 5, stop: 24, launch: 200, slide: 300,
}
const VOICE = {
  open: 'inosuke_voice_092_t02m49_2s.mp3',      // 行くぜ！ Let's go!
  spatial: 'inosuke_voice_010_t00m19_1s.mp3',   // 空間識覚
  found: 'inosuke_voice_052_t01m32_0s.mp3',     // 見つけた！そこか！ Found you! There!
  rush: 'inosuke_voice_055_t01m37_5s.mp3',      // 捌ノ型・爆裂猛進
  win: 'inosuke_voice_040_t01m06_1s.mp3',       // はっはっはっは！
}

const C = makeCineUlt({
  id: 'inosuke_explosive_rush', keys: ['inosuke'], total: B.total, maxZoom: 1.9,
  cost: 0,
  gate(f, t) {
    if (Math.abs(ctrX(t) - ctrX(f)) > B.reach || Math.abs((t.y || 0) - (f.y || 0)) > 140) return undefined   // → the legacy whiff
    return true
  },
  setup(S) {
    const f = S.caster
    f._suppressUltCooldown = true; f.ultimateCooldown = INOSUKE_ULT_CD
    S.stance = S.tx0 - S.dir * 150                       // where he drops into the stance
    S.back = S.tx0 - S.dir * 300                          // where he skids back to before the rush
    S.through = S.tx0 + S.dir * 120                       // he barrels THROUGH and stops on the far side
    S.land = S.tx0 + S.dir * (S.blocked ? 60 : B.slide)
    S.fFace = S.dir
  },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'taunt', 'dash', 'inosukeCine1', 'inosukeCine2', 'inosukeCine4', 'inosukeB3', 'inosukeB4', 'inosukeB5', 'heavy'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'whoosh_medium_01', 0.5); voice(ctx, S, VOICE.open) }
    if (k === 14) { sfx(ctx, 'swish_fast_01', 0.8); sfx(ctx, 'impact_crack_01', 0.6) }
    if (k === B.spatialAt) { sfx(ctx, 'pitch_drop_slowmo', 0.8); sfx(ctx, 'energy_tone_hold', 0.7); voice(ctx, S, VOICE.spatial) }
    if (k === B.spatialAt + 12 || k === B.spatialAt + 26) sfx(ctx, 'warp_wobble_01', 0.55)
    if (k === 74) { sfx(ctx, 'sting_pitch_rise_hold', 0.8); voice(ctx, S, VOICE.found) }
    if (k === B.stanceAt) { sfx(ctx, 'boom_medium_01', 0.8); cam?.shake?.(8, 12) }
    if (k === B.stanceAt + 6) sfx(ctx, 'charge_swell_riser', 0.8)
    const fi = B.fangs.indexOf(k)
    if (fi >= 0) {
      cineHit(S, B.fangRaw, { blockMult: B.blockMult })
      S.hold = B.fangStop; S.lastFang = { i: fi, real: S.real }
      cam?.shake?.(8 + fi * 2, 10)
      sfx(ctx, fi % 2 ? 'swish_fast_02' : 'swish_fast_03', 1); sfx(ctx, 'impact_hit_01', 0.9); if (fi === 4) sfx(ctx, 'hit_flurry_01', 0.9)
    }
    if (B.fangs.some(fk => k === fk - 4)) sfx(ctx, 'whoosh_medium_02', 0.6)
    if (k === B.windAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'boom_anticipation_suck', 0.8) }
    if (k === B.windAt + 8) voice(ctx, S, VOICE.rush)
    if (k === B.rushAt) { sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'whoosh_medium_01', 1); cam?.shake?.(16, 16) }
    if (k === B.hitAt && !S.done.hit) {
      S.done.hit = true; S.hitReal = S.real
      cineHit(S, B.rushRaw, { blockMult: B.blockMult })
      S.hold = B.stop
      cam?.shake?.(22, 40)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'crack_sizzle_bright', 0.9); sfx(ctx, 'boom_huge_02_roar', 0.9)
    }
    if (k === B.hitAt + 10) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.calmAt) voice(ctx, S, VOICE.win)
  },
  place(S, k) {
    S.pf = k
    // Inosuke: stance closes in, blinks side to side for the fangs, skids back, then rushes THROUGH
    if (k < B.stanceAt) S.fx = S.fx0
    else if (k < B.fangAt) S.fx = S.fx0 + (S.stance - S.fx0) * smooth((k - B.stanceAt) / (B.fangAt - B.stanceAt))
    else if (k < B.windAt) {
      let i = 0; for (let j = 0; j < B.fangs.length; j++) if (k >= B.fangs[j] - 6) i = j
      const side = i % 2 === 0 ? -1 : 1
      S.fx = S.tx0 + side * S.dir * 58; S.fFace = side < 0 ? S.dir : -S.dir
    } else if (k < B.rushAt) { S.fFace = S.dir; S.fx = S.tx0 + (S.back - S.tx0) * smooth((k - B.windAt) / 14) }
    else if (k < B.hitAt) S.fx = S.back + (S.through - S.back) * smooth((k - B.rushAt) / (B.hitAt - B.rushAt))
    else S.fx = S.through + S.dir * 40 * smooth((k - B.hitAt) / 30)
    S.fy = 0
    // the foe: rocked by every fang, then launched
    if (k < B.hitAt + 2) {
      const lf = S.lastFang, kick = lf && k < B.windAt ? Math.max(0, 1 - (k - B.fangs[lf.i]) / 10) : 0
      S.tx = S.tx0 + (lf ? (lf.i % 2 === 0 ? 1 : -1) * S.dir * 10 * kick : 0); S.ty = 0
    } else {
      const u = clamp((k - B.hitAt - 2) / 44, 0, 1), e = 1 - (1 - u) ** 2
      S.tx = S.tx0 + (S.land - S.tx0) * e
      S.ty = S.blocked ? 0 : Math.max(0, Math.sin(Math.PI * clamp(u * 1.3, 0, 1)) * B.launch)
    }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 47)
    if (k < B.spatialAt) cam.focusOnFighter(f, 1.5 + 0.3 * smooth(k / B.spatialAt))
    else if (k < B.stanceAt) cam.focusBetween?.(f, foe, 1.05)
    else if (k < B.fangAt) cam.focusOnFighter(f, 1.35)
    else if (k < B.windAt) cam.focusOnFighter(foe, 1.45)
    else if (k < B.rushAt) cam.focusBetween?.(box(S.back, S.floor - 47), foe, 1.15)
    else if (k < B.calmAt) cam.focusBetween?.(box(S.tx0, S.floor - 47), box(S.land, S.tFloor - 47), 1.0)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawInosukeUltScreen(ctx, canvas, S, B),
})
export const isInosukeUltActive = C.active
export const getInosukeUltStatus = C.status
export const clearInosukeUlt = C.clear
