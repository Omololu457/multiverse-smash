// yujiUlt.js — Yuji Itadori (yuji) ULTIMATE "BLACK FLASH — KOKUSEN ×4" as a FROZEN CINEMATIC (2026-11-24 roster-wide
// "every character gets their own special ultimate" pass). Replaces the legacy Phase-1 buildup + mashable Koma flurry
// (abilities.executeYujiUltimate + yujiUltimateCinematic.js — both untouched, no longer reached in reach) through
// cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100 cursed energy). Foe within the rush's reach
//   (≈300 px, same level) → the cinematic; out of reach → undefined → the legacy ult plays (and whiffs) exactly as today.
//   DAMAGE (legacy, no attacker boost: Koma flurry 14 × ≤10 mashes + 90 finisher = ≤230 raw ≈ ≤138 dealt, and 0 when the
//   foe stands at 110 px — the flurry's 104 px range): Black Flash 35 + 6 Koma blows × 9 + Black Flash 40 + Black Flash
//   45 + Divergent Black Flash 85 = 259 raw ≈ 155 dealt (no attacker boost, like the legacy). A held guard chips 25 %.
// BEATS (script frame k; every Black Flash holds a few real frames of hit-stop):
//   FOCUS      0-44   letterbox; push in; blue cursed energy floods his fists. "With this one blow!"
//   RUSH      44-58   he blurs across the gap (after-images, speed lines)
//   KOKUSEN 1   58    the 0.000001-second window: white → black/red impact frame, black lightning — 黒閃 BLACK FLASH
//   THE ZONE  72-126  he's in the zone: a Koma flurry of six blows, red sparks, the counter climbs
//   KOKUSEN 2  132    a second Black Flash — "×2"
//   KOKUSEN 3  160    a rising Black Flash launches the foe — "×3"
//   DIVERGENT 186-206 time crawls, the colour drains while the foe falls back to him; the fist winds back
//   KOKUSEN 4  206    DIVERGENT BLACK FLASH: white → inverted frame, the screen cracks under black lightning, "KOKUSEN!"
//   AFTER    214-296  the foe skids away; black sparks crackle off his fist; "×4 BLACK FLASH"; "I want to be stronger!"
import { makeCineUlt, cineHit, sfx, voice, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { drawYujiUltScreen } from './yujiUltFx.js'

export const B = {
  cost: 100, blockMult: 0.25,
  bf1: 35, koma: 9, bf2: 40, bf3: 45, bf4: 85,
  rushAt: 44, bf1At: 58, zoneAt: 72, komaHits: [76, 84, 92, 100, 108, 116], bf2At: 132, upAt: 150, bf3At: 160,
  slowAt: 186, bf4At: 206, afterAt: 214, calmAt: 244, outAt: 284, total: 296,
  reach: 300, slide: 330,
}
// Japanese dub clips (the active language set in yujiVoice.js)
const VOICE = { open: 'yuji_voice_195_t09m34_9s.mp3', kokusen: 'yuji_voice_372_t14m41_9s.mp3', kokusen2: 'yuji_voice_373_t14m43_4s.mp3',
  zone: 'yuji_voice_172_t09m03_6s.mp3', after: 'yuji_voice_368_t14m33_2s.mp3' }

const C = makeCineUlt({
  id: 'yuji_black_flash_x4', keys: ['yuji'], total: B.total, cost: B.cost, maxZoom: 1.9,
  gate(f, t) {
    if (f._komaActive) return false
    if (Math.abs(ctrX(t) - ctrX(f)) > B.reach || Math.abs((t.y || 0) - (f.y || 0)) > 120) return undefined
    return true
  },
  setup(S) {
    S.fFace = S.dir; S.fx = S.fx0
    S.push = 0                                    // the flurry walks the foe back
    S.land = S.tx0 + S.dir * (S.blocked ? 110 : B.slide)
    S.bfReal = []                                 // real frame of each Black Flash (render)
  },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'ultimateAction', 'yujiKoma1', 'heavy', 'up', 'dash'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    const flash = (raw, n, stop, shake, big) => {
      cineHit(S, raw, { blockMult: B.blockMult, move: 'yujiBlackFlash' })
      S.bfReal.push(S.real); S.bfN = n; S.hold = stop
      cam?.shake?.(shake, big ? 40 : 18)
      sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'crack_sizzle_bright', 0.9)
      if (big) { sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1) } else sfx(ctx, 'boom_medium_02', 0.9)
    }
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.7); voice(ctx, S, VOICE.open) }
    if (k === 14) { sfx(ctx, 'charge_swell_riser', 0.9); cam?.shake?.(4, 20) }
    if (k === 34) sfx(ctx, 'boom_anticipation_suck', 0.9)
    if (k === B.rushAt) { sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'whoosh_medium_02', 0.8) }
    if (k === B.bf1At - 1) voice(ctx, S, VOICE.kokusen)
    if (k === B.bf1At && !S.done.bf1) { S.done.bf1 = true; flash(B.bf1, 1, 14, 14, false) }
    if (k === B.zoneAt) { voice(ctx, S, VOICE.zone); sfx(ctx, 'hit_flurry_01', 0.9) }
    B.komaHits.forEach((at, i) => {
      if (k === at && !S.done['k' + i]) {
        S.done['k' + i] = true; cineHit(S, B.koma, { blockMult: B.blockMult, move: 'yujiKoma' }); S.push += S.blocked ? 3 : 7
        sfx(ctx, i & 1 ? 'impact_hit_01' : 'swish_fast_01', 0.8); cam?.shake?.(5, 6); S.hold = 2
      }
    })
    if (k === B.bf2At - 4) sfx(ctx, 'boom_anticipation_suck', 0.8)
    if (k === B.bf2At && !S.done.bf2) { S.done.bf2 = true; flash(B.bf2, 2, 12, 14, false) }
    if (k === B.upAt) sfx(ctx, 'swish_fast_02', 0.9)
    if (k === B.bf3At && !S.done.bf3) { S.done.bf3 = true; flash(B.bf3, 3, 12, 16, false); voice(ctx, S, VOICE.kokusen2) }
    if (k === B.slowAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.8) }
    if (k === B.bf4At - 6) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.bf4At - 1) voice(ctx, S, VOICE.kokusen)
    if (k === B.bf4At && !S.done.bf4) { S.done.bf4 = true; S.finReal = S.real; flash(B.bf4, 4, 30, 24, true) }
    if (k === B.bf4At + 2) { sfx(ctx, 'boom_huge_01', 1); cam?.shake?.(20, 34) }
    if (k === B.bf4At + 12) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.calmAt) { voice(ctx, S, VOICE.after); sfx(ctx, 'rumble_tail_01', 0.6) }
  },
  place(S, k) {
    S.pf = k
    const near = S.tx0 - S.dir * 58
    // the foe: pushed back by the flurry, launched by Kokusen 3, falls back, then blasted away by the finisher
    let tx = S.tx0 + S.dir * Math.min(S.push, 60), ty = 0
    if (k >= B.bf1At && k < B.zoneAt) tx += S.dir * 10 * Math.sin(Math.PI * clamp((k - B.bf1At) / 14, 0, 1))
    if (k >= B.bf2At && k < B.upAt) tx += S.dir * 22 * Math.sin(Math.PI * clamp((k - B.bf2At) / 18, 0, 1))
    if (!S.blocked && k >= B.bf3At && k < B.bf4At) {
      const u = (k - B.bf3At) / (B.bf4At - B.bf3At)
      ty = Math.max(0, 4 * u * (1 - u) * 190 * (1 - 0.25 * u))               // up the arc and back down into the fist
    }
    if (k >= B.bf4At + 2) {
      const u = clamp((k - B.bf4At - 2) / 40, 0, 1), e = 1 - (1 - u) ** 2
      tx = S.txF + (S.land - S.txF) * e
      ty = S.blocked ? 0 : Math.max(0, Math.sin(Math.PI * clamp(u * 1.5, 0, 1)) * 60)
    } else S.txF = tx
    S.tx = tx; S.ty = ty
    // Yuji: rush in, then stay glued to the foe's front
    const glue = tx - S.dir * 58
    if (k < B.rushAt) S.fx = S.fx0
    else if (k < B.bf1At) S.fx = S.fx0 + (near - S.fx0) * smooth((k - B.rushAt) / (B.bf1At - B.rushAt - 2))
    else if (k < B.bf4At + 2) S.fx = glue
    S.fy = 0
  },
  camera(S, cam, k) {
    const f = S.caster, tb = box(S.tx, S.tFloor - 47 - (S.ty || 0))
    if (k < B.rushAt) cam.focusOnFighter(f, 1.5 + 0.25 * smooth(k / B.rushAt))
    else if (k < B.zoneAt) cam.focusBetween?.(f, tb, 1.35)
    else if (k < B.bf3At) cam.focusBetween?.(f, tb, 1.3 + 0.1 * smooth((k - B.zoneAt) / 60))
    else if (k < B.slowAt) cam.focusBetween?.(f, tb, 1.0)
    else if (k < B.afterAt) cam.focusBetween?.(f, tb, 1.45)
    else if (k < B.calmAt) cam.focusOnFighter(box((S.fx + S.tx) / 2, S.floor - 47), 0.9)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawYujiUltScreen(ctx, canvas, S, B),
})
export const isYujiUltActive = C.active
export const getYujiUltStatus = C.status
export const clearYujiUlt = C.clear
