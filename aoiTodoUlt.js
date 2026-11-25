// aoiTodoUlt.js — Aoi Todo (aoi_todo) ULTIMATE "BOOGIE WOOGIE — BROTHERS' BLACK FLASH" as a FROZEN CINEMATIC (2026-11-24
// roster-wide "every character gets their own special ultimate" pass). Replaces the legacy 54-frame clap → 3-way combo
// (abilities.executeAoiTodoUltimate — untouched, no longer reached when a foe is present) through cineRegistry
// (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100). Sure-hit, range-independent (Boogie Woogie
//   pulls the foe wherever he wants them) — no foe → undefined → the legacy ult.
//   DAMAGE (legacy: guaranteed beats 70 + 80 + 180 = 330 raw ≈ 198 dealt, no attacker boost; then the Yuji + Gojo cameos stay
//   on the field ~5.5 s striking on their own): Yuji's punch 30 + Gojo's kick 30 + Todo's straight 35 + roundhouse 45 + the
//   BROTHERS' BLACK FLASH 240 = 380 raw ≈ 228 dealt (no attacker boost), and on the way out BOTH cameos are summoned exactly
//   as the legacy did (same summons.js config: 330 f, same damage / cadence) so the persistent co-op pressure is kept.
//   A held guard chips 25 %.
// BEATS (script frame k):
//   CLAP        0-40   letterbox; push in on Todo; "Can you keep up with my fight?!" — he raises his hands… CLAP: 不義遊戯
//   SWAP-FEST  40-134  every clap swaps places (blue swap streaks, the foe blinks across the stage, disoriented):
//                       clap → Yuji was waiting (hit) · clap → Gojo was waiting (hit) · clap → Todo behind them (hit) ·
//                       clap-clap-clap (the foe can't tell where anyone is; "120%!") → spinning roundhouse (hit)
//   BROTHERS  140-192  time crawls: Yuji appears on the far side; Todo and his BROTHER wind up from both sides; 親友
//   BLACK FLASH 192    both fists land in the same instant: white → black/red impact frame, black lightning, the foe is
//                       blasted straight up
//   AFTER     214-300  the foe crashes down; the cameos stay (now real summons); Todo flexes — Takada-chan smiles in his
//                       thoughts — "I'll lead the way to victory."
import { makeCineUlt, cineHit, sfx, voice, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { spawnSummon } from './summons.js'
import { drawAoiTodoUltScreen, CAMEO } from './aoiTodoUltFx.js'

export const B = {
  cost: 100, blockMult: 0.25,
  yuji: 30, gojo: 30, straight: 35, round: 45, bf: 240,
  clap1: 40, yujiHit: 48, clap2: 62, gojoHit: 70, clap3: 84, todoHit: 92, rapid: [106, 112, 118], roundHit: 126,
  brosAt: 140, slowAt: 160, bfAt: 192, afterAt: 214, calmAt: 240, outAt: 288, total: 300, stop: 28,
}
const VOICE = { open: 'aoi_todo_301.mp3', hype: 'aoi_todo_161.mp3', after: 'aoi_todo_302.mp3' }
// the legacy cameo summons (abilities.js AOI_TODO_CAMEOS + aoiTodoCameoSummon, copied verbatim — that file is not ours to edit)
const LEGACY_CAMEOS = {
  yuji: { id: 'aoiTodoYuji', color: '#d24b3a', sheet: './yuji_idle_uniform.png', frames: 4, w: 37, h: 53, speed: 7, scale: 2.16,
    runSheet: './yuji_run_uniform.png', runFrames: 8, runW: 43, runH: 51, dmg: 58, interval: 48 },
  gojo: { id: 'aoiTodoGojo', color: '#5aa0e0', sheet: './gojo_idle_sheet.png', frames: 4, w: 28, h: 64, speed: 6, scale: 1.8,
    runSheet: './gojo_walk_sheet.png', runFrames: 8, runW: 34, runH: 63, dmg: 54, interval: 52 },
}
function summonCameo(f, t, which, x) {
  const c = LEGACY_CAMEOS[which]
  try {
    const p = spawnSummon(f, {
      id: c.id, summonId: c.id, duration: 330, maxSimultaneous: 1,
      attackInterval: c.interval, damage: c.dmg, hitstun: 20, knockbackX: 6, knockbackY: -2,
      w: Math.max(24, Math.round(c.w * c.scale * 0.5)), h: Math.round(c.h * c.scale), speed: 5, behavior: 'rush',
      oneHit: false, bbaOwnerCombo: true, color: c.color,
      sheet: c.sheet, spriteFrames: c.frames, spriteW: c.w, spriteH: c.h, spriteSpeed: c.speed, spriteScale: c.scale,
      spawnSheet: c.runSheet, spawnFrames: c.runFrames, spawnW: c.runW, spawnH: c.runH, spawnBeat: 14, spawnScale: c.scale,
    }, t)
    if (p) { p.x = Math.round(x - (p.w || 0) / 2); p.y = f.y; p.facing = f.facing || 1; p.frame = 14; p.attackTimer = 0 }
  } catch (_) {}
}

// staging: every actor's world x + facing per beat (C = the centre of the original gap, d = Todo's facing)
function stage(S, k) {
  const d = S.dir, A = S.fx0, Bp = S.tx0
  const P = { T: A, Tf: d, F: Bp, Ff: -d, Y: null, Yf: d, G: null, Gf: -d }
  if (k < B.clap1) { if (k >= 30) { P.Y = A - 74 * d } return P }
  if (k < B.clap2) { Object.assign(P, { T: Bp, Tf: -d, F: A + (k >= B.yujiHit ? 20 * d : 0), Ff: -d, Y: A - 74 * d, Yf: d }); if (k >= 54) P.G = Bp + 74 * d; return P }
  if (k < B.clap3) { Object.assign(P, { T: A + 20 * d, Tf: d, F: Bp - (k >= B.gojoHit ? 20 * d : 0), Ff: d, Y: k < B.clap2 + 10 ? A - 74 * d : null, G: Bp + 74 * d, Gf: -d }); return P }
  const F3 = Bp - 40 * d
  if (k < B.rapid[0]) { Object.assign(P, { T: Bp + 74 * d, Tf: -d, F: k >= B.todoHit ? F3 : Bp - 20 * d, Ff: d, G: k < B.clap3 + 10 ? A + 20 * d : null, Gf: d }); return P }
  // clap-clap-clap: Todo and the foe blink back and forth
  const n = B.rapid.filter(r => k >= r).length, a = Bp + 74 * d, b = F3
  if (k < B.roundHit - 6) { Object.assign(P, { T: n % 2 ? b : a, Tf: n % 2 ? d : -d, F: n % 2 ? a : b, Ff: n % 2 ? -d : d }); return P }
  // after the third clap: Todo at b facing the foe at a → spinning roundhouse
  const Fr = k >= B.roundHit ? a + 46 * d * smooth((k - B.roundHit) / 12) : a
  Object.assign(P, { T: b, Tf: d, F: Fr, Ff: -d })
  if (k >= B.brosAt) {
    const u = smooth((k - B.brosAt) / 16)
    P.Y = Fr + 74 * d; P.Yf = -d
    P.T = b + (Fr - 70 * d - b) * u
  }
  return P
}

const C = makeCineUlt({
  id: 'aoi_todo_boogie_woogie', keys: ['aoi_todo'], total: B.total, cost: B.cost, maxZoom: 1.9,
  setup(S) { S.fFace = S.dir; S.fx = S.fx0; S.swaps = [] },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'todoClap', 'heavy', 'todoCombo2', 'todoCombo3', 'win'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
    for (const k of Object.keys(CAMEO)) image(CAMEO[k].sheet)
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    const clap = (gain = 1) => { S.swaps.push(S.real); sfx(ctx, 'impact_crack_01', gain); sfx(ctx, 'warp_wobble_01', 0.7 * gain); cam?.shake?.(5, 6) }
    const hit = (raw, sh, heavy) => { cineHit(S, raw, { blockMult: B.blockMult }); S.hold = heavy ? 6 : 4; sfx(ctx, heavy ? 'hit_heavy_boom_01' : 'impact_hit_01', 1); sfx(ctx, 'swish_fast_01', 0.7); cam?.shake?.(sh, 10); S.lastHitK = k }
    if (k === 0) { sfx(ctx, 'whoosh_medium_01', 0.6); voice(ctx, S, VOICE.open) }
    if (k === 20) sfx(ctx, 'boom_anticipation_suck', 0.8)
    if (k === 30) sfx(ctx, 'warp_wobble_02', 0.6)
    if (k === B.clap1) { clap(1); sfx(ctx, 'boom_medium_02', 0.9); cam?.shake?.(10, 12) }
    if (k === B.yujiHit) hit(B.yuji, 8)
    if (k === 54) sfx(ctx, 'warp_wobble_02', 0.6)
    if (k === B.clap2) clap()
    if (k === B.gojoHit) hit(B.gojo, 8)
    if (k === B.clap3) clap()
    if (k === B.todoHit) hit(B.straight, 10, true)
    if (k === B.rapid[0]) voice(ctx, S, VOICE.hype)
    for (const r of B.rapid) if (k === r) clap(0.8)
    if (k === B.roundHit - 4) sfx(ctx, 'swish_fast_03', 1)
    if (k === B.roundHit) hit(B.round, 12, true)
    if (k === B.brosAt) { sfx(ctx, 'warp_wobble_01', 0.8); sfx(ctx, 'charge_swell_riser', 0.9) }
    if (k === B.slowAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.8) }
    if (k === B.bfAt - 6) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.bfAt && !S.done.bf) {
      S.done.bf = true; S.bfReal = S.real
      cineHit(S, B.bf, { blockMult: B.blockMult }); S.hold = B.stop; cam?.shake?.(22, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'crack_sizzle_bright', 1)
    }
    if (k === B.bfAt + 2) sfx(ctx, 'boom_huge_01', 1)
    if (k === B.bfAt + 12) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.afterAt + 8) { sfx(ctx, 'boom_medium_01', 0.8); cam?.shake?.(8, 10) }
    if (k === B.calmAt) voice(ctx, S, VOICE.after)
  },
  place(S, k) {
    S.pf = k
    const P = stage(S, k); S.P = P
    S.fx = P.T; S.fFace = P.Tf
    S.tx = P.F
    let ty = 0
    if (!S.blocked && k >= B.roundHit && k < B.brosAt + 20) ty = Math.max(0, Math.sin(Math.PI * clamp((k - B.roundHit) / 34, 0, 1)) * 50)
    if (!S.blocked && k >= B.bfAt) { const u = clamp((k - B.bfAt) / (B.afterAt + 8 - B.bfAt), 0, 1); ty = Math.max(0, 4 * u * (1 - u) * 260) }
    S.ty = ty; S.fy = 0
    S.land = P.F
  },
  camera(S, cam, k) {
    const f = S.caster, tb = box(S.tx, S.tFloor - 47 - (S.ty || 0))
    if (k < B.clap1) cam.focusOnFighter(f, 1.45 + 0.25 * smooth(k / B.clap1))
    else if (k < B.brosAt) cam.focusBetween?.(f, tb, 1.0)
    else if (k < B.bfAt) cam.focusOnFighter(box(S.tx, S.tFloor - 60), 1.2 + 0.3 * smooth((k - B.brosAt) / 50))
    else if (k < B.calmAt) cam.focusOnFighter(box(S.tx, S.tFloor - 140), 0.8)
    else cam.focusOnFighter(f, 1.3)
  },
  finish(S) {   // the cameos stay behind as the legacy's persistent co-op strikers
    const f = S.caster, t = S.target, d = S.dir
    if (!f || !t || !(t.health > 0)) return
    summonCameo(f, t, 'yuji', S.fx - d * 70)
    summonCameo(f, t, 'gojo', S.fx - d * 120)
  },
  draw: (ctx, canvas, S) => drawAoiTodoUltScreen(ctx, canvas, S, B),
})
export const isAoiTodoUltActive = C.active
export const getAoiTodoUltStatus = C.status
export const clearAoiTodoUlt = C.clear
