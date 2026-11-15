/**
 * rangerZordUltimate.js — SHARED RANGER ZORD ULTIMATE (profile-driven, like rangers.js / falconzord.js).
 *
 * A Ranger opts in EXPLICITLY with registerZordUltimate(rosterKey, cfg). Nothing here is hard-coded to a Ranger.
 *   • SEQUENCES (registerZordUltSequence): the shared, deterministic simulation definition — opener window, opener
 *     path, contact box, confirmed beats, timings. Pure data. NO presentation (no titles, tints, colours, text).
 *   • OPT-IN CONFIG (per Ranger): which sequence, cost, damage lever, the Ranger's call move / pose names, whiff
 *     recovery. Presentation (title, subtitle, tint, cut-in accent) is per-Ranger / per-skin DATA owned by the
 *     Ranger's render module and never read here.
 *
 * FLOW (simulation frames)
 *   1. The Ranger's module starts its call move (cost paid there) and calls zordUltBegin(f, W).
 *   2. zordUltTick(f, opp, W) every sim tick: age++. On `captureAt` the dive target is captured ONCE (the foe's
 *      position, clamped to [minReach, maxReach] in front of the caller); never re-read. During the opener window
 *      the opener contact box (authored, NOT the wing bounds) is tested against the foe's hurtbox.
 *        hit   → damage through W.damage (shared combo scaling) → the frozen confirmed sequence starts.
 *        block → special-tier chip + blockstun, NO capture, no follow-up; the Zord exits ('blocked').
 *        none  → the Zord exits ('whiff').
 *   3. Confirmed sequence = the engine's FROZEN-CINEMATIC contract (activate / isActive / update / clear / status):
 *      game.js freezes combat / physics / input and calls updateZordUltCine() each frame. Beats land at authored
 *      frames through W.damage; a KO skips to the settle. At the end the target is knocked down, the caller's
 *      control is restored, the camera follows the restored positions.
 *
 * SIM vs RENDER: all gameplay state is plain JSON on `f._zordUlt` (snapshotted by the owner's replay checkpoint).
 * The Zord's position is a PURE function of (sequence, age/frame, captured origin/target, dir). No Math.random.
 * Ownership key = the caller fighter object → mirrors are independent. One confirmed cinematic at a time (the
 * engine's freeze contract is global).
 */
export const ZORD_ULT_SEQUENCES = {}
export const ZORD_ULT_OPTIN = {}

export function registerZordUltSequence(id, s) { ZORD_ULT_SEQUENCES[id] = Object.freeze({ id, ...s }); return ZORD_ULT_SEQUENCES[id] }
export function registerZordUltimate(rosterKey, cfg) {
  const seq = ZORD_ULT_SEQUENCES[cfg.sequence]
  if (!seq) throw new Error(`registerZordUltimate: unknown sequence ${cfg.sequence}`)
  for (const bad of ['title', 'subtitle', 'tint', 'accent']) if (bad in cfg) throw new Error(`registerZordUltimate: presentation field "${bad}" does not belong in the simulation config`)
  ZORD_ULT_OPTIN[rosterKey] = Object.freeze({ rosterKey, scale: 1, whiffRecovery: 60, ...cfg })
  return ZORD_ULT_OPTIN[rosterKey]
}
export const zordOptIn = f => ZORD_ULT_OPTIN[typeof f === 'string' ? f : f?.rosterKey] || null

// ── The Falconzord sequence (shared asset: assets/power_rangers/falconzord/cells, extracted by tools/mmpr_black/extract.py)
// Opener: the Zord enters high behind the target point and dives; contact frames 30-35 (= the Ranger's 30 f startup).
// Confirmed beats (frames from confirm): talon strike, electrical strike, energy-dive finish. 40 + 50 + 50 + 100 = 240 raw.
registerZordUltSequence('falconzord_assault', {
  zord: 'Falconzord',
  captureAt: 8, minReach: 70, maxReach: 420,
  opener: { from: 30, to: 35, raw: 40, hitstun: 40, blockstun: 18, chip: 0.12, box: { w: 96, h: 96, dy: -48 } },
  // opener path keys: [age, dx (along dir, relative to the captured target point), dy (screen-down), pose]
  openerPath: [[0, -520, -420, 'approach'], [18, -220, -260, 'approach'], [30, 0, -40, 'dive'], [36, 30, -20, 'dive'], [60, 420, -420, 'exit']],
  exitAt: 36, life: 60,
  beats: [{ at: 16, raw: 50, kind: 'talon' }, { at: 52, raw: 50, kind: 'zap' }, { at: 112, raw: 100, kind: 'dive' }],
  total: 150, settle: 128, lift: 70,
})

const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const hurt = f => ({ x: f.x || 0, y: f.y || 0, w: f.w || 48, h: f.h || 94 })

export function zordUltBegin(f, W) {
  const cfg = zordOptIn(f); if (!cfg) return null
  const feet = (f.y || 0) + (f.h || 94)
  f._zordUlt = { seq: cfg.sequence, age: 0, dir: f.facing || 1, ox: Math.round(ctrX(f)), feet: Math.round(feet), tx: null, ty: null,
    result: null, n: ((f._zordUlt?.n) || 0) + 1, recover: 0 }
  return f._zordUlt
}
// Pure: Zord world position + pose for the opener at `age`. Before capture the target point is the default
// (in front of the caller at mid reach) — only used for drawing the first frames.
export function zordOpenerPos(z, age = z.age) {
  const S = ZORD_ULT_SEQUENCES[z.seq], K = S.openerPath
  const tx = z.tx ?? (z.ox + z.dir * 200), ty = z.ty ?? (z.feet - 50)
  let i = 0; while (i < K.length - 2 && age >= K[i + 1][0]) i++
  const [a0, x0, y0, p0] = K[i], [a1, x1, y1] = K[i + 1]
  const u = Math.max(0, Math.min(1, (age - a0) / Math.max(1, a1 - a0)))
  return { x: tx + z.dir * (x0 + (x1 - x0) * u), y: ty + y0 + (y1 - y0) * u, pose: p0, dir: z.dir }
}
export function zordOpenerBox(z) {
  const S = ZORD_ULT_SEQUENCES[z.seq], b = S.opener.box
  return { x: z.tx - b.w / 2, y: z.feet + b.dy - b.h / 2, w: b.w, h: b.h }   // ground-level dive point (authored), never the wing span
}

// Per-sim-tick opener update. Returns an event: null | {type:'capture'|'hit'|'blocked'|'whiff'|'exit', target}
export function zordUltTick(f, opp, W, comboScale = 1) {
  const z = f?._zordUlt; if (!z || z.result === 'confirmed') return null
  const S = ZORD_ULT_SEQUENCES[z.seq], cfg = zordOptIn(f), O = S.opener
  let ev = null
  if (z.age === S.captureAt) {
    const sw = W?.stageWidth?.() || 3200
    let tx = opp && opp.health > 0 ? ctrX(opp) : z.ox + z.dir * 200
    const d = Math.max(S.minReach, Math.min(S.maxReach, (tx - z.ox) * z.dir))   // never behind the caller, bounded reach
    tx = Math.max(40, Math.min(sw - 40, z.ox + z.dir * d))
    z.tx = Math.round(tx); z.ty = z.feet - 50
    ev = { type: 'capture' }
  }
  if (!z.result && z.age >= O.from && z.age <= O.to && opp && z.tx != null) {
    const ok = opp !== f && opp.health > 0 && !(opp.invulnTimer > 0) && !opp.knockdownState && !opp.isGrabbed && !(f.team && opp.team && f.team === opp.team)
    if (ok && overlap(zordOpenerBox(z), hurt(opp))) {
      const raw = O.raw * cfg.scale
      if (opp.isBlocking) {
        opp.blockstun = Math.max(opp.blockstun || 0, O.blockstun); opp.vx = z.dir * 2
        W?.damage?.(opp, raw * O.chip, { source: 'ultimate', attacker: f, move: 'ultimate' })
        f.comboCounter = 0; z.result = 'blocked'; ev = { type: 'blocked' }
      } else {
        W?.damage?.(opp, raw * comboScale, { source: 'ultimate', attacker: f, move: 'ultimate' })
        opp.hitstun = Math.max(opp.hitstun || 0, O.hitstun); opp.vx = 0; opp.vy = 0; opp.colorFlash = 8; opp.isBlocking = false
        f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
        z.result = opp.health > 0 ? 'confirmed' : 'ko'; ev = { type: 'hit', target: opp }
      }
    }
  }
  if (!z.result && z.age > O.to) { z.result = 'whiff'; ev = { type: 'whiff' } }
  if (z.result !== 'confirmed') { if (++z.age >= S.life) { delete f._zordUlt; return ev || { type: 'exit' } } }
  return ev
}
export function clearZordUltState(f) { if (f) delete f._zordUlt }

// ══ CONFIRMED SEQUENCE (frozen cinematic, global singleton like every other freeze cinematic) ═════════════════════
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, tx0: 0, cx0: 0, dir: 1, done: 0, scale: 1, seq: null, onPose: null }
export const isZordUltCineActive = () => cine.active
export const zordUltCineStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null, key: cine.caster?.rosterKey || null })
// onPose(f, beat, frame) is the Ranger's own pose hook (its call / watch / signal strips); optional.
export function activateZordUltCine(f, target, W, { comboScale = 1, onPose = null } = {}) {
  const cfg = zordOptIn(f); if (cine.active || !cfg || !target) return false
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: target.y, tx0: target.x, cx0: f.x, dir: f._zordUlt?.dir || f.facing || 1,
    done: 0, scale: comboScale, seq: cfg.sequence, onPose })
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  if (f._zordUlt) f._zordUlt.result = 'confirmed'
  return true
}
function beatHit(i) {
  const S = ZORD_ULT_SEQUENCES[cine.seq], b = S.beats[i], t = cine.target, f = cine.caster, cfg = zordOptIn(f)
  cine.done = i + 1
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, b.raw * cfg.scale * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90; t.colorFlash = 8
}
export function updateZordUltCine() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target; if (!f || !t) return clearZordUltCine()
  const S = ZORD_ULT_SEQUENCES[cine.seq], k = cine.frame
  for (let i = 0; i < S.beats.length; i++) if (k === S.beats[i].at && cine.done === i) beatHit(i)
  if (!(t.health > 0) && cine.frame < S.settle) cine.frame = S.settle
  const fr = cine.frame
  const sw = cine.W?.stageWidth?.() || 3200, clampX = (o, x) => Math.max(0, Math.min(sw - (o.w || 48), x))
  cine.onPose?.(f, fr < S.beats[2].at ? 'watch' : 'signal', fr)
  f.x = clampX(f, cine.cx0); f.y = cine.floorC; f.vx = 0; f.vy = 0
  t.x = clampX(t, cine.tx0); t.vx = 0; t.vy = 0; t.isBlocking = false
  const lift = S.lift, a = S.beats[0].at, d = S.beats[2].at
  t.y = fr < a ? cine.floorT : fr < d ? cine.floorT - lift * Math.min(1, (fr - a) / 10) : cine.floorT
  if (f._zordUlt) f._zordUlt.cine = fr
  if (++cine.frame >= S.total) finishCine()
}
function finishCine() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0; if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12; f.y = cine.floorC; f.vx = 0; f.vy = 0; delete f._zordUlt; f._zordUltDone = (f._zordUltDone || 0) + 1 }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, onPose: null })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearZordUltCine() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0; delete f._zordUlt }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, onPose: null })
}
export const zordUltCineOwner = () => cine.caster
// Render read (pure function of the cinematic frame): where the Zord is during the confirmed sequence.
export function zordUltCinePos(f) {
  if (!cine.active || cine.caster !== f) return null
  const S = ZORD_ULT_SEQUENCES[cine.seq], fr = cine.frame, d = cine.dir, t = cine.target
  const tx = ctrX(t), ty = (t.y || 0) + (t.h || 94) / 2, [b0, b1, b2] = S.beats
  if (fr < b1.at - 10) { const u = Math.min(1, fr / b0.at); return { x: tx - d * 40 * (1 - u), y: ty - 30 - 60 * (1 - u), pose: fr < b0.at + 6 ? 'talon' : 'zap', dir: d, age: fr, beat: 0 } }
  if (fr < b1.at + 14) return { x: tx - d * 70, y: ty - 40, pose: 'zap', dir: d, age: fr, beat: 1 }
  if (fr < b2.at - 30) { const u = (fr - b1.at - 14) / (b2.at - 30 - b1.at - 14); return { x: tx - d * 70 - d * 120 * u, y: ty - 40 - 320 * u, pose: 'thrust', dir: -d, age: fr, beat: 1 } }
  if (fr < b2.at) { const u = (fr - (b2.at - 30)) / 30; return { x: tx - d * 190 * (1 - u), y: ty - 360 * (1 - u), pose: u < 0.4 ? 'energy' : 'streakDive', dir: d, age: fr, beat: 2 } }
  if (fr < b2.at + 12) return { x: tx, y: ty, pose: 'impact', dir: d, age: fr, beat: 2 }
  const u = (fr - b2.at - 12) / Math.max(1, S.total - b2.at - 12); return { x: tx + d * 500 * u, y: ty - 80 - 360 * u, pose: 'exit', dir: d, age: fr, beat: 3 }
}
