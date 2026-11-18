// humongousaur.js — HUMONGOUSAUR (Vaxasaurian), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (dust, debris,
// shockwave lines, camera zoom / shake, the tier scale-up) never write it. Simulation randomness: hash(match seed, frame,
// player index) only. Sheet: docs/ben10/aliens/humongousaur/SPRITE_LEDGER.md.
import { HUMONGOUSAUR_ANIM, HUMONGOUSAUR_GEOM } from "./humongousaurAssets.js"
export { HUMONGOUSAUR_ANIM, HUMONGOUSAUR_GEOM }

export const HM_KEY = "humongousaur"
const ANIM = { ...HUMONGOUSAUR_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const HUMONGOUSAUR = {
  id: HM_KEY, poolKey: HM_KEY, displayName: "Humongousaur", slot: 15,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Upgrade (14)
  status: "ready", sheetPath: "./ben10_humongousaur_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/humongousaur/SPRITE_LEDGER.md",
  mods: { speed: 0.85, damage: 1.15, defense: 1.20, weight: 1.50 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Charging Tackle", special2: "Quake Slam", special3: "Roar", special4: "Crush Grab",
    special5: "Push Through", special6: "Meteor Stomp", ultimate: "Extinction Event" },
  basic_attacks: {
    light:  normal(22, 6, 3, 10, 0, { rangeX: 110 }),                                          // PUNCH f1–2
    heavy:  normal(64, 15, 4, 24, -7, { knockbackX: 7, rangeX: 190 }),                        // PUNCH f3–4, the swoosh swing, 190 px
    down:   normal(28, 8, 3, 16, -4, { hitLevel: "low", rangeX: 170 }),                       // GROUND ATTACK f2–3, hits low, 170 px
    up:     normal(52, 12, 4, 26, -10, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 100 }),   // PUNCH UP f1–6, launches
    air:    normal(34, 8, 4, 12, 2, { rangeX: 90 })                                           // FALL f1 + a render-only fist streak
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, hurtbox, damageDealt, damageTaken, targetOffset,
  drawHud: drawHumongousaurHud, drawFx: drawHumongousaurFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshHumongousaurState() {
  return { kind: HM_KEY, t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    stage: { L: -1e6, R: 1e6 },
    size: { v: 0, idleT: 0, giantT: 0, shrinkT: 0, gained: [], giants: 0, shrinks: 0, peak: 0 },
    tremor: { pips: 0, pipT: 0, pipped: [], immuneT: 0, topples: 0, lastTopple: null, burstT: 0 },
    tackle: null, quake: null, roar: null, crush: null, push: null, stomp: null, stompUsed: false, ult: null, ultScale: null,
    lastRoar: null, lastPush: null, lastStomp: null, lastUlt: null, quakeSized: [],
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false,
    stats: { casts: 0, gains: 0, gained: 0, tackles: 0, tackleHits: 0, walls: 0, quakes: 0, roars: 0, roarDeletes: 0, crushes: 0,
      crushed: 0, teched: 0, pushes: 0, splats: 0, shoves: 0, stomps: 0, shocks: 0, ults: 0, ultRejects: 0 } }
}
export const hmState = f => (f?.omnitrix?.formState?.kind === HM_KEY && f.transformed && f.activeAlien === HM_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshHumongousaurState()
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function hmHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = hmState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  input = input || {}
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()      // read-only reference for the render
  api0 = api
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  tickInputs(f, s, input)
  if (grounded(f)) s.stompUsed = false                                     // Meteor Stomp: once per airtime
  tickTackle(f, s, api, opp)
  tickQuake(f, s, api, opp)
  tickRoar(f, s, api, opp)
  tickCrush(f, s, api, opp)
  tickPush(f, s, api, opp)
  tickStomp(f, s, api)
  tickUlt(f, s, opp, api, ctx)
  tickSize(f, s)
  tickTremor(f, s)
  s.noAttack = busy(s)
  s.spPrev = !!input.special
}
const busy = s => !!(s.tackle || s.quake || s.roar || s.crush || s.push || s.stomp || s.ult)
let projRef = null   // the engine's live projectile list (render reads it; never written by render)
// moveFrames hook (combat.startMove): no normals while a cast owns him; the Size tier's reach on a copied table
function moveFrames(f, key, md) {
  const s = hmState(f); if (!s) return md
  if (busy(s)) return false
  const k = tierOf(s).reach
  return k === 1 || !md ? md : { ...md, rangeX: Math.round((md.rangeX || 60) * k) }
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   →→ + P (a frame-counted double tap) CHARGING TACKLE   ↓↘→ + P (236) QUAKE SLAM   ↓↙← + P (214) ROAR
//   ←↙↓ + P (412) CRUSH GRAB                               →↓↘ + P (623) PUSH THROUGH
//   air: ↓ + P (any air Special) METEOR STOMP (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral Quake Slam, → after a
// double tap Charging Tackle, ← Roar, ↓ Crush Grab, ↑ Push Through.
export const HM_DASH_WINDOW = 14, HM_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= HM_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "push"], ["412", "crush"], ["214", "roar"], ["236", "quake"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= HM_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "stomp"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "roar"
  if (dir === "D") return "crush"
  if (dir === "U") return "push"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= HM_DASH_WINDOW) return "tackle"
  return "quake"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const HM_COST = { tackle: 12, quake: 14, roar: 10, crush: 14, push: 12, stomp: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = hmState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
function fireUltimate(f, ctx, api) { return fireUltimateImpl(f, ctx, api) }
function canAct(f, s) {
  return f.transformed && f.activeAlien === HM_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.stats.casts++
  return { cast: s.castId, total }
}
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction.
// Lifetime >= 2 (combat.updateProjectiles culls lifetime <= 0 before hits resolve: a 1f box never connects in the live game).
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, lifetime: 2, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)
const armEdge = (f, face) => cx(f) + face * (f.w || 60) / 2
const ownLive = (f, api, hm) => !!api && api.activeProjectiles().some(p => p && p.owner === f && p.alien && p.alien.hm === hm)
const clampX = (s, o, x) => Math.max(s.stage.L, Math.min(s.stage.R - (o.w || 60), x))
const pose = (f, name, left) => { f._spriteCastMove = name; f._spriteCastTimer = Math.max(2, left) }
const isBeam = p => !!p && !!(p.beam || p.isBeam || p.laser || /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i.test(String(p.name || p.move || "")))

// ── 5. MOVES ────────────────────────────────────────────────────────────────────────────────────────────────
// 1. CHARGING TACKLE (→→ + P, 12) — TACKLE f1–4: 12f startup, then 340 px of REAL travel (17f × 20 px, stage-clamped),
//    no tracking (the direction is fixed at the cast), no armor. One hit per cast: 55, −14 on block, +1 Tremor pip (clean).
//    The opponent CORNERED at contact (their far side within 48 px of the wall he drives them toward) = +10 once (65).
//    On contact he stops and recovers 20f; a whiff runs the full travel then recovers.
export const HM_TACKLE = { STARTUP: 12, SPEED: 20, TRAVEL: 340, DMG: 55, WALL: 10, CORNER: 48, ON_BLOCK: -14, RECOVERY: 20, W: 56, H: 96 }
HM_TACKLE.FRAMES = Math.round(HM_TACKLE.TRAVEL / HM_TACKLE.SPEED)
HM_TACKLE.TOTAL = HM_TACKLE.STARTUP + HM_TACKLE.FRAMES + HM_TACKLE.RECOVERY
function castTackle(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "hmTackle", HM_COST.tackle, HM_TACKLE.TOTAL); if (!c) return false
  s.tackle = { t: 0, cast: c.cast, face: f.facing || 1, x0: f.x, hit: false, end: HM_TACKLE.TOTAL, wall: false }; s.stats.tackles++
  return true
}
CASTS.tackle = castTackle
export const cornered = (s, opp, face) => !!opp && (face > 0 ? opp.x + (opp.w || 60) >= s.stage.R - HM_TACKLE.CORNER : opp.x <= s.stage.L + HM_TACKLE.CORNER)
function tickTackle(f, s, api, opp) {
  const d = s.tackle; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.tackle = null; delete f._benLunge; return }
  const travel = d.t > HM_TACKLE.STARTUP && d.t <= HM_TACKLE.STARTUP + HM_TACKLE.FRAMES && !d.hit
  if (travel) {
    f._benLunge = { frames: 1, speed: d.face * HM_TACKLE.SPEED }
    if (!ownLive(f, api, "tackle")) { const wall = cornered(s, opp, d.face)
      hitbox(f, api, "hm_tackle", d.face, { damage: HM_TACKLE.DMG + (wall ? HM_TACKLE.WALL : 0), spawnX: armEdge(f, d.face) + d.face * (HM_TACKLE.W / 2 + HM_TACKLE.SPEED),
        spawnY: f.y + (f.h || 110) * 0.5, w: HM_TACKLE.W + HM_TACKLE.SPEED, h: HM_TACKLE.H, hitstun: HM_TACKLE.RECOVERY + 10,
        blockstun: blockstunFor(HM_TACKLE.RECOVERY, HM_TACKLE.ON_BLOCK), knockbackX: 8, knockbackY: -3, alien: { hm: "tackle", pip: 1, cast: d.cast, wall } }) }
  }
  pose(f, "hmTackle", d.end - d.t)
  if (d.t >= d.end) { s.tackle = null; s.lastTackle = { travelled: Math.abs(f.x - d.x0), hit: d.hit, wall: d.wall } }
}
function tackleContact(f, s, tag) {
  const d = s.tackle; if (!d || d.cast !== tag.cast || d.hit) return
  d.hit = true; d.wall = !!tag.wall; d.end = d.t + HM_TACKLE.RECOVERY; delete f._benLunge
  s.stats.tackleHits++; if (tag.wall) s.stats.walls++
  if (api0) for (const p of api0.activeProjectiles()) if (p && p.owner === f && p.alien && p.alien.hm === "tackle") p.lifetime = 0   // one hit per cast
  f.attackCooldown = HM_TACKLE.RECOVERY; f._benPowerCommit = HM_TACKLE.RECOVERY
}
let api0 = null   // the api handed to the last tick (contact handlers run outside the tick)

// 2. QUAKE SLAM (↓↘→ + P, 14) — GROUND STRIKE f1–6: 18f startup, a floor SHOCKWAVE line 300 px ahead: 2 hits 25 / 35 = 60,
//    GROUNDED targets only (the box is a 22 px strip on the floor and is spawned only while the opponent stands on it —
//    airborne opponents are unaffected), −16 on block. The shockwave is a hitbox, never a floor change. +1 Tremor pip per cast
//    (+1 more at HUGE+); a clean hit +10 Size (once per cast).
export const HM_QUAKE = { HITS_AT: [18, 26], DMG: [25, 35], REACH: 300, H: 22, ON_BLOCK: -16, RECOVERY: 24 }
HM_QUAKE.STARTUP = HM_QUAKE.HITS_AT[0]
HM_QUAKE.TOTAL = HM_QUAKE.HITS_AT[1] + 2 + HM_QUAKE.RECOVERY
function castQuake(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "hmQuake", HM_COST.quake, HM_QUAKE.TOTAL); if (!c) return false
  s.quake = { t: 0, cast: c.cast, face: f.facing || 1, x: armEdge(f, f.facing || 1), y: f.y + (f.h || 110), spawned: 0 }; s.stats.quakes++
  return true
}
CASTS.quake = castQuake
function tickQuake(f, s, api, opp) {
  const q = s.quake; if (!q) return
  q.t++
  if ((f.hitstun || 0) > 0) { s.quake = null; return }
  const k = HM_QUAKE.HITS_AT.indexOf(q.t)
  if (k >= 0 && opp && grounded(opp)) { const last = k === HM_QUAKE.HITS_AT.length - 1, rem = HM_QUAKE.TOTAL - q.t
    q.spawned++
    hitbox(f, api, "hm_quake", q.face, { damage: HM_QUAKE.DMG[k], spawnX: q.x + q.face * HM_QUAKE.REACH / 2, spawnY: q.y - HM_QUAKE.H / 2,
      w: HM_QUAKE.REACH, h: HM_QUAKE.H, hitstun: last ? rem + 10 : 16, blockstun: last ? blockstunFor(rem, HM_QUAKE.ON_BLOCK) : 12, noHitstop: !last,
      knockbackX: last ? 4 : 0.4, knockbackY: last ? -6 : 0, alien: { hm: "quake", pip: 1, tierPip: true, cast: q.cast } }) }
  pose(f, "hmQuake", HM_QUAKE.TOTAL - q.t)
  if (q.t >= HM_QUAKE.TOTAL) s.quake = null
}

// 3. ROAR (↓↙← + P, 10) — ROAR f1–5: 20f startup, a radius-150 roar around him: 20 dmg + pushback (away from him), deletes
//    ONE opponent projectile in range (the nearest; his own and beams are never touched), +30 Size, 24f recovery, −10 on
//    block. No pip (+1 at HUGE+). Unavailable in SHRINK (rejected at no cost).
export const HM_ROAR = { STARTUP: 20, R: 150, DMG: 20, KB: 9, RECOVERY: 24, ON_BLOCK: -10 }
HM_ROAR.TOTAL = HM_ROAR.STARTUP + 2 + HM_ROAR.RECOVERY
function castRoar(f, s, api) {
  if (!grounded(f) || tierKey(s) === "shrink") return false
  const c = beginCast(f, s, api, "hmRoar", HM_COST.roar, HM_ROAR.TOTAL); if (!c) return false
  s.roar = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.roars++
  return true
}
CASTS.roar = castRoar
function tickRoar(f, s, api, opp) {
  const r = s.roar; if (!r) return
  r.t++
  if ((f.hitstun || 0) > 0) { s.roar = null; return }
  if (r.t === HM_ROAR.STARTUP) {
    const ox = cx(f), oy = f.y + (f.h || 110) / 2
    let best = -1, bd = Infinity                                              // ONE opponent projectile in range (ownership-aware)
    if (api) { const L = api.activeProjectiles()
      for (let k = 0; k < L.length; k++) { const p = L[k]
        if (!p || p.owner === f || p.visualOnly || isBeam(p)) continue
        const d = Math.hypot((p.x || 0) - ox, (p.y || 0) - oy); if (d <= HM_ROAR.R && d < bd) { bd = d; best = k } }
      if (best >= 0) { L.splice(best, 1); s.stats.roarDeletes++ } }
    gainSize(f, s, HM_SIZE.ROAR, "roar")
    const dir = opp && cx(opp) < ox ? -1 : 1, rem = HM_ROAR.TOTAL - r.t
    hitbox(f, api, "hm_roar", dir, { damage: HM_ROAR.DMG, spawnX: ox, spawnY: oy, radius: HM_ROAR.R, radial: true, rectHitbox: false,
      w: HM_ROAR.R * 2, h: HM_ROAR.R * 2, hitstun: 18, blockstun: blockstunFor(rem, HM_ROAR.ON_BLOCK), knockbackX: HM_ROAR.KB, knockbackY: -2,
      alien: { hm: "roar", pip: 0, tierPip: true, cast: r.cast, noSize: true } })
    s.lastRoar = { t: s.t, deleted: best >= 0 }
  }
  pose(f, "hmRoar", HM_ROAR.TOTAL - r.t)
  if (r.t >= HM_ROAR.TOTAL) s.roar = null
}

// 4. CRUSH GRAB (←↙↓ + P, 14) — CRUSH f1–6: a COMMAND GRAB. 14f startup, 120 px (centre to centre), 30f whiff recovery.
//    STANDARD THROW RULES (the same tests as combat.resolveGrab): both grounded, not during his combo, an invulnerable target
//    can't be grabbed, a defender out of hitstun / blockstun who has Grab buffered TECHS it (both pushed apart, 18f each).
//    On a grab: 3 ticks × 15 = 45 (source "grab-throw"; each tick a landed hit, +5 Size), then a throw 160 px away
//    (stage-clamped). No pip.
export const HM_CRUSH = { STARTUP: 14, RANGE: 120, WHIFF: 30, TICKS: [8, 18, 28], DMG: 15, HOLD: 34, THROW: 160, GAP: 46, RECOVERY: 16, TECH: 18 }
function castCrush(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "hmCrush", HM_COST.crush, HM_CRUSH.STARTUP + HM_CRUSH.WHIFF); if (!c) return false
  s.crush = { t: 0, cast: c.cast, face: f.facing || 1, held: false, h: 0, end: HM_CRUSH.STARTUP + HM_CRUSH.WHIFF, result: null }; s.stats.crushes++
  return true
}
CASTS.crush = castCrush
export function crushCanGrab(f, opp) {
  if (!opp || opp.eliminated || opp.isGrabbed) return "none"
  if (!grounded(f) || !grounded(opp)) return "air"
  if ((f.comboCounter || 0) > 0) return "combo"
  if ((opp.invulnTimer || 0) > 0 || opp.knockdownState) return "invuln"
  if (Math.abs(cx(opp) - cx(f)) > HM_CRUSH.RANGE) return "range"
  return "ok"
}
function tickCrush(f, s, api, opp) {
  const m = s.crush; if (!m) return
  m.t++
  if (!m.held && (f.hitstun || 0) > 0) { s.crush = null; return }
  if (m.t === HM_CRUSH.STARTUP) {
    const why = crushCanGrab(f, opp); m.result = why
    if (why === "ok") {
      const canTech = !((opp.hitstun || 0) > 0 || (opp.blockstun || 0) > 0)
      if (canTech && (opp.grabInputBuffer || 0) > 0) {                         // THROW ESCAPE (the standard tech)
        m.result = "teched"; s.stats.teched++
        f.attackCooldown = HM_CRUSH.TECH; opp.attackCooldown = HM_CRUSH.TECH; f._benPowerCommit = HM_CRUSH.TECH
        f.vx = -m.face * 3; opp.vx = m.face * 3; m.end = m.t + HM_CRUSH.TECH
      } else {
        m.held = true; m.h = 0; s.stats.crushed++; m.dealt = 0
        m.end = m.t + HM_CRUSH.HOLD + HM_CRUSH.RECOVERY
        f.attackCooldown = m.end - m.t; f._benPowerCommit = m.end - m.t
        opp.attacking = false; opp.currentAttack = null; opp.isCharging = false
      }
    }
  }
  if (m.held && opp && !opp.eliminated) {
    m.h++
    if (m.h <= HM_CRUSH.HOLD) {                                               // seized in front of him
      opp.hitstun = Math.max(opp.hitstun || 0, 10); opp.vx = 0; opp.vy = 0
      opp.x = clampX(s, opp, cx(f) + m.face * HM_CRUSH.GAP - (opp.w || 60) / 2)
      if (HM_CRUSH.TICKS.includes(m.h)) {
        const hp = opp.health; api.applyScaledDamage(opp, HM_CRUSH.DMG, { attacker: f, move: "crush_grab", source: "grab-throw" }); m.dealt += hp - opp.health; m.raw = (m.raw || 0) + HM_CRUSH.DMG; m.ticks = (m.ticks || 0) + 1
        gainSize(f, s, HM_SIZE.HIT, "crush"); opp.colorFlash = 6; api.shake?.(3, 4)
      }
      if (m.h === HM_CRUSH.HOLD) {                                            // the throw: 160 px away, a small pop
        const from = opp.x
        opp.x = clampX(s, opp, opp.x + m.face * HM_CRUSH.THROW); m.thrown = opp.x - from
        opp.vx = m.face * 2; opp.vy = -7; opp.hitstun = Math.max(opp.hitstun || 0, 30)
        opp.onGround = false; opp.grounded = false; opp.isLaunched = true
        m.held = false
      }
    }
  }
  pose(f, m.held ? "hmCrushHold" : "hmCrush", m.end - m.t)
  if (m.t >= m.end) { s.lastCrush = { result: m.result, dealt: m.dealt || 0, raw: m.raw || 0, ticks: m.ticks || 0, thrown: m.thrown || 0 }; s.crush = null }
}

// 5. PUSH THROUGH (→↓↘ + P, 12) — the PUSH loop: 8f startup, then he pushes forward at walk speed × 1.5 for up to 40f, no
//    armor. In contact (his front within 10 px of a grounded opponent) he drives them 5 px/f (stage-clamped: never through
//    a wall; nothing locks them — they can still guard or act, and a hit ends the push). If he drives them INTO a stage wall:
//    WALL SPLAT once — 45 and a knockdown (the engine's knockdown, on a clean hit). Otherwise, still in contact at the end,
//    a 20 shove. No pip. 16f recovery.
export const HM_PUSH = { STARTUP: 8, MAX: 40, WALK: 1.5, PUSH: 5, CONTACT: 10, SPLAT: 45, SHOVE: 20, RECOVERY: 16, KD: 52 }
function castPush(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "hmPush", HM_COST.push, HM_PUSH.STARTUP + HM_PUSH.MAX + HM_PUSH.RECOVERY); if (!c) return false
  s.push = { t: 0, pt: 0, cast: c.cast, face: f.facing || 1, phase: "startup", contactT: 0, pushed: 0, end: c.total, result: null }; s.stats.pushes++
  return true
}
CASTS.push = castPush
export const pushContact = (f, opp, face) => !!opp && grounded(opp) && !opp.eliminated &&
  (face > 0 ? opp.x - (f.x + (f.w || 60)) : f.x - (opp.x + (opp.w || 60))) <= HM_PUSH.CONTACT &&
  (face > 0 ? opp.x + (opp.w || 60) > f.x : opp.x < f.x + (f.w || 60))
const atWall = (s, opp, face) => face > 0 ? opp.x + (opp.w || 60) >= s.stage.R - 0.5 : opp.x <= s.stage.L + 0.5
function finishPush(f, s, d, result) {
  d.phase = "recovery"; d.result = result; d.end = d.t + HM_PUSH.RECOVERY
  f.attackCooldown = HM_PUSH.RECOVERY; f._benPowerCommit = HM_PUSH.RECOVERY; delete f._benLunge
  s.lastPush = { result, pushed: d.pushed, contactT: d.contactT, t: d.pt }
}
function tickPush(f, s, api, opp) {
  const d = s.push; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.push = null; delete f._benLunge; return }
  if (d.phase === "startup" && d.t > HM_PUSH.STARTUP) d.phase = "push"
  if (d.phase === "push") {
    d.pt++
    const touching = pushContact(f, opp, d.face)
    if (touching) {
      d.contactT++
      const before = opp.x; opp.x = clampX(s, opp, opp.x + d.face * HM_PUSH.PUSH); opp.vx = 0; d.pushed += Math.abs(opp.x - before)
      f._benLunge = { frames: 1, speed: d.face * Math.abs(opp.x - before) }   // he follows them (never through them)
      if (atWall(s, opp, d.face)) {                                           // WALL SPLAT (once per cast)
        hitbox(f, api, "hm_splat", d.face, { damage: HM_PUSH.SPLAT, spawnX: armEdge(f, d.face) + d.face * 20, spawnY: f.y + (f.h || 110) * 0.5, w: 60, h: 100,
          hitstun: 30, blockstun: blockstunFor(HM_PUSH.RECOVERY, -6), knockbackX: 0.01, knockbackY: 0, alien: { hm: "splat", pip: 0, cast: d.cast } })
        s.stats.splats++; finishPush(f, s, d, "splat")
      }
    } else f._benLunge = { frames: 1, speed: d.face * (s.baseSpeed ?? f._benWalkSpeed ?? 6) * tierOf(s).speed * HM_PUSH.WALK }
    if (d.phase === "push" && d.pt >= HM_PUSH.MAX) {                         // the 40f cap
      if (pushContact(f, opp, d.face)) {
        hitbox(f, api, "hm_shove", d.face, { damage: HM_PUSH.SHOVE, spawnX: armEdge(f, d.face) + d.face * 20, spawnY: f.y + (f.h || 110) * 0.5, w: 60, h: 100,
          hitstun: 20, blockstun: blockstunFor(HM_PUSH.RECOVERY, -6), knockbackX: 7, knockbackY: -2, alien: { hm: "shove", pip: 0, cast: d.cast } })
        s.stats.shoves++; finishPush(f, s, d, "shove")
      } else finishPush(f, s, d, "none")
    }
  }
  pose(f, "hmPush", d.end - d.t)
  if (d.phase === "recovery" && d.t >= d.end) s.push = null
}

// 6. METEOR STOMP (air ↓ + P — any air Special; 12) — GROUND ATTACK f1 dive: a diagonal slam (the shared ready-form
//    `_benGlide`), 60 on the body hit (one hit per cast), then a bounded LANDING SHOCKWAVE radius 100 at his feet (a hitbox,
//    one hit, 20), GROUND ATTACK f4–5. Once per airtime, no jump refill. +1 Tremor pip per cast (body or shock, once).
export const HM_STOMP = { STARTUP: 4, VX: 7, VY: 13, MAX: 50, DMG: 60, W: 72, H: 72, SHOCK_R: 100, SHOCK: 20, LAND_RECOVERY: 16 }
function castStomp(f, s, api) {
  if (grounded(f) || s.stompUsed) return false
  const c = beginCast(f, s, api, "hmStomp", HM_COST.stomp, HM_STOMP.MAX + HM_STOMP.LAND_RECOVERY, { commit: false }); if (!c) return false
  s.stompUsed = true
  s.stomp = { t: 0, cast: c.cast, face: f.facing || 1, lastY: f.y, hit: false, jumps: f.jumpCount }; s.stats.stomps++
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
CASTS.stomp = castStomp
function tickStomp(f, s, api) {
  const d = s.stomp; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endStomp(f, s, api, false); return }
  if (d.t < HM_STOMP.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > HM_STOMP.STARTUP + 1 && (f.y === d.lastY || grounded(f))
  d.lastY = f.y
  if (landed || d.t >= HM_STOMP.MAX) { endStomp(f, s, api, landed); return }
  f._benGlide = { vx: d.face * HM_STOMP.VX, vy: HM_STOMP.VY }
  if (!d.hit && !ownLive(f, api, "stomp")) hitbox(f, api, "hm_stomp", d.face, { damage: HM_STOMP.DMG, spawnX: cx(f) + d.face * 16, spawnY: f.y + (f.h || 110) * 0.7,
    w: HM_STOMP.W, h: HM_STOMP.H, hitstun: 26, blockstun: 12, knockbackX: 4, knockbackY: -4, alien: { hm: "stomp", pip: 1, cast: d.cast } })
  pose(f, "hmStomp", 2)
}
function endStomp(f, s, api, landed) {
  const d = s.stomp; s.stomp = null; delete f._benGlide
  if (landed) {                                                               // the bounded landing shockwave: one hit
    hitbox(f, api, "hm_shock", d.face, { damage: HM_STOMP.SHOCK, spawnX: cx(f), spawnY: f.y + (f.h || 110) - 10, radius: HM_STOMP.SHOCK_R, radial: true, rectHitbox: false,
      w: HM_STOMP.SHOCK_R * 2, h: HM_STOMP.SHOCK_R * 2, hitstun: 16, blockstun: 10, knockbackX: 3, knockbackY: -3, alien: { hm: "stomp", pip: 1, cast: d.cast, shock: true } })
    s.stats.shocks++; s.landT = s.t
    f.attackCooldown = HM_STOMP.LAND_RECOVERY; f._benPowerCommit = HM_STOMP.LAND_RECOVERY; pose(f, "hmStompLand", HM_STOMP.LAND_RECOVERY)
  } else { f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastStomp = { landed, hit: d.hit, jumps: d.jumps, x: cx(f) }
}

// ── ULTIMATE: EXTINCTION EVENT (the Omnitrix Overload input; 55 Power; Size ≥ 40 or it is rejected at no cost) ─────
// Needs a CLEAN opener: a Crush-Grab-style seize (CRUSH f1–3, 120 px in front at 14f, 40). A whiff or a block = no cinematic,
// 60f recovery. Then (the opponent held in place, no collision change; he is invulnerable only inside the cinematic):
//   1. GROW 0–40f: the ROAR rows; render-only — the camera zooms OUT and his drawn scale steps up to screen height (4 fixed
//      steps ×1.6 → ×2.4); both fighters stay readable, the stage never changes.
//   2. STOMPS 40–110f: 3 stomps × 30 = 90 (GROUND ATTACK / GROUND STRIKE frames), procedural pixel dust + hash-placed debris
//      (positions = hash(match seed, start frame, player index): a pure function the render calls; debris / dust have no
//      hitboxes and no GAME_STATE presence).
//   3. TAIL SLAM 110–150f: PUNCH BACK f1–5 spin + f6 finisher, 110 + 0.4 × the Size spent (max +40).
// Total 240 (max 280) raw. Size → 0 and SHRINK applies (150f). Camera and positions restore, no persistent hazards, 110f
// recovery lockout. Tier damage (damageDealt) applies on top of the raw like any of his hits.
export const HM_ULT = { MIN_SIZE: 40, OPENER_AT: 14, OPENER: 40, RANGE: 120, WHIFF: 60, GROW: 40, STOMP_AT: [56, 76, 96], STOMP: 30,
  SLAM_AT: 136, SLAM: 110, PER_SIZE: 0.4, SLAM_MAX: 40, END: 150, LOCKOUT: 110, ZOOM: 0.7, STEPS: [1.6, 1.9, 2.2, 2.4] }
export const HM_ULT_SETS = HM_ULT.STEPS.map(k => scaledAnim(k))               // the render-only GROW steps (fixed)
function fireUltimateImpl(f, ctx, api) {
  const s = hmState(f); if (!s) return false
  if (!canAct(f, s)) return false
  if (s.size.v < HM_ULT.MIN_SIZE) { s.stats.ultRejects++; return false }   // rejected below Size 40: no cost
  if (!api.spendEnergy(f, HM_COST.ultimate)) return false
  s.castId++
  const face = f.facing || 1, total = HM_ULT.OPENER_AT + HM_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "hmCrush"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, hits: [], sizeAt: s.size.v, seed: (ctx?.seed ?? 1) >>> 0, f0: ctx?.frame ?? s.t, pi: pIndex(f) }
  s.stats.ults++
  api.scheduleBenSpawn(f, HM_ULT.OPENER_AT, () => hitbox(f, api, "hm_ult_open", face, {
    damage: HM_ULT.OPENER, spawnX: armEdge(f, face) + face * HM_ULT.RANGE / 2, spawnY: f.y + (f.h || 110) * 0.5, w: HM_ULT.RANGE, h: 100,
    lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { hm: "ultOpen", pip: 0, cast: s.castId, noSize: true } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "grow"; u.t = 0; u.raw = HM_ULT.OPENER; u.hits.push(HM_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = HM_ULT.END + HM_ULT.LOCKOUT; f._benPowerCommit = HM_ULT.END; f._spriteCastTimer = HM_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, HM_ULT.END + 2)                // cinematic only (the opponent is held)
  delete f._benLunge
}
export const ultSlam = sizeAt => HM_ULT.SLAM + Math.min(HM_ULT.SLAM_MAX, HM_ULT.PER_SIZE * sizeAt)
// pure: the debris / dust spots of one cast (render-only; the same seed → the same spots)
export function ultDebris(seed, frame0, pi, n = 10) {
  const out = []
  for (let i = 0; i < n; i++) out.push({ dx: Math.round((hmHash(seed, frame0, pi, i) - 0.5) * 420), lift: Math.round(hmHash(seed, frame0, pi, i + 32) * 140),
    size: 3 + Math.floor(hmHash(seed, frame0, pi, i + 64) * 4), beat: i % HM_ULT.STOMP_AT.length })
  return out
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > HM_ULT.OPENER_AT + 12) { s.lastUlt = { captured: false, raw: 0 }; s.ult = null } return }   // whiff / block: no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  if (u.t === 1) api?.focusCamera?.(f, opp, HM_ULT.ZOOM, HM_ULT.END)       // render-only zoom-out
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "extinction_event", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 10) }
  if (u.t < HM_ULT.GROW) { u.phase = "grow"; f._spriteCastMove = "hmRoar"; s.ultScale = HM_ULT_SETS[Math.min(HM_ULT_SETS.length - 1, Math.floor(u.t / (HM_ULT.GROW / HM_ULT_SETS.length)))] }
  else if (u.t < HM_ULT.SLAM_AT - 26) { u.phase = "stomps"; f._spriteCastMove = "hmUltStomp"; s.ultScale = HM_ULT_SETS[HM_ULT_SETS.length - 1]
    const k = HM_ULT.STOMP_AT.indexOf(u.t); if (k >= 0) hit(HM_ULT.STOMP, 8 + k * 3) }
  else if (u.t < HM_ULT.END) { u.phase = "slam"; f._spriteCastMove = "hmBackhand"
    if (u.t === HM_ULT.SLAM_AT) hit(ultSlam(u.sizeAt), 22) }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }       // positions restore
  if (opp && u?.thome) {
    opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = (cx(opp) >= cx(f) ? 1 : -1) * 6; opp.vy = -10
    opp.onGround = false; opp.grounded = false; opp.isLaunched = true
  }
  s.lastUlt = { captured: !!u?.home, raw: u?.raw || 0, hits: u?.hits ? u.hits.slice() : [], sizeAt: u?.sizeAt || 0, seed: u?.seed, f0: u?.f0, pi: u?.pi,
    home: u?.home ? { ...u.home } : null, thome: u?.thome ? { ...u.thome } : null }
  s.ult = null; s.ultScale = null
  startShrink(s)                                                              // Size → 0, SHRINK 150f
  api?.focusCamera?.(f, opp, 1, 12)                                           // camera restores
  f.attackCooldown = HM_ULT.LOCKOUT; f._benPowerCommit = HM_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
// render-only: the held opponent is lifted a little as he towers over them
function targetOffset(f, target) {
  const s = hmState(f); const u = s && s.ult; if (!u || !u.thome || u.phase === "opener") return null
  return { dx: u.phase === "stomps" && (u.t >> 1) % 2 ? 2 : 0, dy: u.phase === "slam" ? -Math.round(Math.min(1, (u.t - (HM_ULT.SLAM_AT - 26)) / 10) * 10) : 0 }
}

// ── 3. GROWTH (his unique system, GAME_STATE) ─────────────────────────────────────────────────────────────────
// A SIZE gauge 0–100 (under Omnitrix Power while he is active), 0 on transform (formState is fresh on every apply).
//   Gains: each of his hits that lands +5 (+3 if blocked; once per contact); Roar +30; a Quake Slam clean hit +10 (instead
//   of the +5, once per cast). After 120f without a gain the gauge decays 1 per frame.
//   Tiers (GAME_STATE values; the drawn scale follows in fixed steps — a frame-set swap, never a smooth scale):
//     NORMAL 0–39 base · LARGE 40–79 dmg +10% / hurtbox ×1.2 / reach +15% / speed −5% / guard drain −20%
//     HUGE 80–99 dmg +18% / ×1.35 / +25% / −10% (+ Roar and Quake Slam get +1 Tremor pip)
//     GIANT (reaching 100) for 300f: dmg +25% / ×1.5 / +35% / −15% / projectiles deal −20% to him; no decay, no gains.
//     It ends in SHRINK: Size 0 and 150f exhausted (speed −20%, damage −10%, Roar unavailable, no Size gains).
//   The enlarged hurtbox is a trade (the opponent can always hit the bigger body), feet-anchored and clipped to the stage
//   (never inside a wall). HOLD THE LINE (LARGE+): no guard pushback (his vx is zeroed while he is in blockstun) and the
//   −20% guard drain (block chip, and projectile damage taken while guarding). No armor, no invulnerability.
//   Swap / revert / KO / rematch clear formState → Size, GIANT and SHRINK are gone; the next transform starts at 0.
export const HM_SIZE = { MAX: 100, HIT: 5, BLOCKED: 3, ROAR: 30, QUAKE: 10, IDLE: 120, DECAY: 1, GIANT: 300, SHRINK: 150 }
export const HM_TIERS = {
  normal: { name: "NORMAL", min: 0,   dmg: 1.00, hurt: 1.00, reach: 1.00, speed: 1.00, guard: 1.00, proj: 1.00, pip: 0, scale: 1.00 },
  large:  { name: "LARGE",  min: 40,  dmg: 1.10, hurt: 1.20, reach: 1.15, speed: 0.95, guard: 0.80, proj: 1.00, pip: 0, scale: 1.20 },
  huge:   { name: "HUGE",   min: 80,  dmg: 1.18, hurt: 1.35, reach: 1.25, speed: 0.90, guard: 0.80, proj: 1.00, pip: 1, scale: 1.35 },
  giant:  { name: "GIANT",  min: 100, dmg: 1.25, hurt: 1.50, reach: 1.35, speed: 0.85, guard: 0.80, proj: 0.80, pip: 1, scale: 1.50 },
  shrink: { name: "SHRINK", min: 0,   dmg: 0.90, hurt: 1.00, reach: 1.00, speed: 0.80, guard: 1.00, proj: 1.00, pip: 0, scale: 1.00 }
}
export function tierKey(s) {
  const z = s.size
  if (z.giantT > 0) return "giant"
  if (z.shrinkT > 0) return "shrink"
  return z.v >= HM_TIERS.huge.min ? "huge" : z.v >= HM_TIERS.large.min ? "large" : "normal"
}
export const tierOf = s => HM_TIERS[tierKey(s)]
export const holdsLine = s => ["large", "huge", "giant"].includes(tierKey(s))
// Size gain (one gate). Returns the amount actually added.
export function gainSize(f, s, amount, why = "hit") {
  const z = s.size
  if (!(amount > 0) || z.giantT > 0 || z.shrinkT > 0) return 0
  const before = z.v
  z.v = Math.min(HM_SIZE.MAX, z.v + amount); z.idleT = 0; z.peak = Math.max(z.peak, z.v)
  const got = z.v - before
  if (got > 0) { s.stats.gains++; s.stats.gained += got; z.gained.push({ t: s.t, why, got }); if (z.gained.length > 8) z.gained.shift() }
  if (z.v >= HM_SIZE.MAX) { z.giantT = HM_SIZE.GIANT; z.giants++ }
  return got
}
export function startShrink(s) {
  const z = s.size
  z.v = 0; z.giantT = 0; z.shrinkT = HM_SIZE.SHRINK; z.idleT = 0; z.shrinks++
}
// fixed render steps: the frame tables with actionScale × the tier scale (built once; the sheets are the same images)
function scaledAnim(k) { return Object.fromEntries(Object.entries(ANIM).map(([n, a]) => [n, { ...a, actionScale: +(a.actionScale * k).toFixed(4) }])) }
export const HM_FRAMESETS = Object.fromEntries(Object.entries(HM_TIERS).map(([k, v]) => [k, v.scale === 1 ? ANIM : scaledAnim(v.scale)]))
function tickSize(f, s) {
  const z = s.size
  z.idleT++
  if (z.giantT > 0) { if (--z.giantT === 0) startShrink(s) }
  else if (z.shrinkT > 0) z.shrinkT--
  else if (z.idleT > HM_SIZE.IDLE && z.v > 0) z.v = Math.max(0, z.v - HM_SIZE.DECAY)
  const T = tierOf(s)
  if (s.baseSpeed != null) { f._benWalkSpeed = s.baseSpeed * T.speed; if (s.baseDash != null) f.dashSpeed = s.baseDash * T.speed }
  if (holdsLine(s) && (f.blockstun || 0) > 0) f.vx = 0                       // HOLD THE LINE: no guard pushback
  const want = s.ultScale || HM_FRAMESETS[tierKey(s)]                       // render-only frame-set swap (fixed steps)
  if (f._skinAnim !== want) f._skinAnim = want
}
// hurtbox hook: the ordinary body box (combat.getHurtbox's default) scaled about his feet centre by the tier, clipped to the
// stage. NORMAL / SHRINK return null (the ordinary box). Later phases add the ult's invulnerability window on top.
export function scaledBody(f, s, k) {
  const w0 = Math.max(1, (f.w || 60) - 12), h0 = Math.max(1, (f.h || 110) - 6)
  const w = w0 * k, h = h0 * k, feet = f.y + (f.h || 110)
  let x0 = cx(f) - w / 2, x1 = cx(f) + w / 2
  x0 = Math.max(s.stage.L, x0); x1 = Math.min(s.stage.R, x1)                // legal stage space only
  return { x: x0, y: feet - h, w: Math.max(1, x1 - x0), h }
}
function hurtbox(f) {
  const s = hmState(f); if (!s) return null
  const k = tierOf(s).hurt
  return k === 1 ? null : scaledBody(f, s, k)
}
// damage attributed to the form (his hits): the tier multiplier (SHRINK ×0.9)
function damageDealt(f, target, raw, opts) {
  const s = hmState(f); if (!s) return raw
  return raw * tierOf(s).dmg
}
// damage he takes: GIANT −20% from projectiles; HOLD THE LINE −20% guard drain (block chip / projectile chip while guarding)
function damageTaken(f, raw, opts) {
  const s = hmState(f); if (!s) return raw
  opts = opts || {}
  const T = tierOf(s)
  if (opts.source === "projectile") raw *= T.proj
  if (opts.source === "block-chip" || (opts.source === "projectile" && f.isBlocking)) raw *= T.guard
  return raw
}
// onContact: Size gains from his landed hits (+5 / +3 blocked; Quake Slam handled by its own tag)
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = hmState(f); if (!s || !target || target === f) return
  const tag = proj && proj.alien
  if (tag && tag.noSize) { /* Roar (its own +30) / the ult opener: no per-hit Size */ }
  else if (tag && tag.hm === "quake" && !blocked) { if (!s.quakeSized?.includes(tag.cast)) { (s.quakeSized ||= []).push(tag.cast); if (s.quakeSized.length > 8) s.quakeSized.shift(); gainSize(f, s, HM_SIZE.QUAKE, "quake") } }
  else gainSize(f, s, blocked ? HM_SIZE.BLOCKED : HM_SIZE.HIT, blocked ? "blocked" : "hit")
  if (CONTACT.length) for (const fn of CONTACT) fn(f, s, target, { proj, move, blocked })
}
const CONTACT = []   // later phases' contact handlers (Tremor pips, ult capture)

// ── 4. TREMOR → TOPPLE (a status on the OPPONENT, owned by this form's GAME_STATE) ─────────────────────────────
// Clean hits (not blocked) from Quake Slam, Meteor Stomp and Charging Tackle add 1 Tremor pip PER CAST (projectile tag
// `alien.pip` = 1, counted once per cast id however many ticks hit); at HUGE+ Roar and Quake Slam add +1 (`alien.tierPip`).
// No pips from blocks, FX, Roar below HUGE, Push Through or the ult. Max 3; they expire 240f after the last one.
// 3 pips → TOPPLE: the pips are consumed and the opponent is forced into ONE knockdown — the engine's own knockdown
// (`knockdownState` + `knockdownTimer` 52, the engine's standard length: tech roll / neutral wake-up invulnerability /
// hits ignored while down all apply unchanged). No extra stun is added (their hitstun is left as the hit set it), and a
// fighter already down is never re-armed (no chain-lock). Then 360f immunity (pips can't build). Nothing polls the
// opponent's inputs or touches any clock. The burst / pips drawn on them are render-only.
export const HM_TREMOR = { MAX: 3, EXPIRE: 240, IMMUNE: 360, KD: 52 }
export function addTremor(f, s, opp, cast, n = 1) {
  const r = s.tremor
  if (!(n > 0) || r.immuneT > 0) return 0
  if (cast != null) { if (r.pipped.includes(cast)) return 0; r.pipped.push(cast); if (r.pipped.length > 8) r.pipped.shift() }
  const before = r.pips
  r.pips = Math.min(HM_TREMOR.MAX, r.pips + n); r.pipT = HM_TREMOR.EXPIRE
  if (r.pips >= HM_TREMOR.MAX) topple(f, s, opp)
  return r.pips - before
}
export function topple(f, s, opp) {
  const r = s.tremor
  if (!opp || r.immuneT > 0) return false
  r.pips = 0; r.pipT = 0; r.immuneT = HM_TREMOR.IMMUNE; r.topples++; r.burstT = 24
  const already = !!opp.knockdownState
  if (!already) { opp.knockdownState = true; opp.knockdownTimer = HM_TREMOR.KD }   // exactly one knockdown, the existing rules
  r.lastTopple = { t: s.t, already }
  return true
}
function tickTremor(f, s) {
  const r = s.tremor
  if (r.burstT > 0) r.burstT--
  if (r.immuneT > 0) r.immuneT--
  if (r.pips > 0 && --r.pipT <= 0) { r.pips = 0; r.pipT = 0 }
}
CONTACT.push((f, s, target, { proj, blocked }) => {                          // move bookkeeping (one hit per cast, ult capture, splat)
  const tag = proj && proj.alien; if (!tag) return
  if (tag.hm === "tackle") tackleContact(f, s, tag)
  if (tag.hm === "stomp" && !tag.shock && s.stomp && s.stomp.cast === tag.cast) s.stomp.hit = true
  if (tag.hm === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
  if (tag.hm === "splat" && !blocked && !target.knockdownState && !target.eliminated) { target.knockdownState = true; target.knockdownTimer = HM_PUSH.KD; s.lastPush && (s.lastPush.kd = true) }
})
CONTACT.push((f, s, target, { proj, blocked }) => {
  const tag = proj && proj.alien; if (!tag || blocked) return
  const n = (tag.pip || 0) + (tag.tierPip ? tierOf(s).pip : 0)
  if (n > 0) addTremor(f, s, target, tag.cast, n)
})

// ── RENDER-ONLY HUD (reads GAME_STATE, never writes it) ───────────────────────────────────────────────────────
const TIER_COL = { normal: "#d6b36a", large: "#f59e0b", huge: "#f97316", giant: "#ef4444", shrink: "#9ca3af" }
export function drawHumongousaurHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = hmState(f); if (!ctx || !s) return
  const z = s.size, k = tierKey(s), w = Math.min(120, pbw || 120), h = 6
  const y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
  const fill = k === "giant" ? z.giantT / HM_SIZE.GIANT : k === "shrink" ? 0 : z.v / HM_SIZE.MAX
  ctx.fillStyle = TIER_COL[k]; const fw = Math.round(w * fill); ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
  ctx.fillStyle = "#111827"; for (const m of [40, 80]) ctx.fillRect(Math.round(flip ? bx + w - w * m / 100 : bx + w * m / 100), y, 1, h)   // tier ticks
  if (k === "shrink") { ctx.fillStyle = "#6b7280"; ctx.fillRect(flip ? bx + w - Math.round(w * z.shrinkT / HM_SIZE.SHRINK) : bx, y + h - 2, Math.round(w * z.shrinkT / HM_SIZE.SHRINK), 2) }
  ctx.font = "bold 7px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = TIER_COL[k]
  const label = k === "giant" ? `GIANT ${Math.ceil(z.giantT / 60)}s` : k === "shrink" ? `SHRINK ${Math.ceil(z.shrinkT / 60)}s` : `${HM_TIERS[k].name} ${Math.floor(z.v)}`
  ctx.fillText(`SIZE · ${label}`, flip ? bx + w : bx, y + h + 2)
  ctx.restore()
}

// ── RENDER-ONLY world overlays (read GAME_STATE, never write it) ───────────────────────────────────────────────
const INK = "#140c06", SAND = "#e8c78a", RUST = "#b45309", BONE = "#fff4dc"
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
export function drawHumongousaurFx(c, f, frame = 0, opp = null) {
  const s = hmState(f); if (!s) return
  const h = f.h || 110, feet = f.y + h, bx = cx(f)
  const q = s.quake
  if (q && q.t >= HM_QUAKE.STARTUP - 2 && q.t <= HM_QUAKE.TOTAL - HM_QUAKE.RECOVERY + 8) {   // QUAKE SLAM: the floor shockwave line
    const k = Math.min(1, (q.t - HM_QUAKE.STARTUP + 3) / 6), len = HM_QUAKE.REACH * k
    for (let x = 0; x <= len; x += 10) { const yy = q.y - 3 - ((x / 10 + q.t) % 3) * 3
      c.fillStyle = (x / 10) % 2 ? SAND : RUST; px(c, q.x + q.face * x, yy, 5); c.fillStyle = INK; px(c, q.x + q.face * x, q.y - 1, 3) }
  }
  if (s.roar && s.roar.t >= HM_ROAR.STARTUP - 4) {                          // ROAR: pixel sound rings (radius 150)
    const k = (s.roar.t - HM_ROAR.STARTUP + 4) / 10
    for (let r = 0; r < 3; r++) { const R = Math.min(HM_ROAR.R, (k * 60 + r * 40) % (HM_ROAR.R + 1)); c.fillStyle = r % 2 ? SAND : BONE
      for (let a = 0; a < 16; a++) px(c, bx + Math.cos(a * 0.3927) * R, f.y + h * 0.4 + Math.sin(a * 0.3927) * R * 0.6, 3) }
  }
  const streak = (face, n) => { c.fillStyle = SAND; for (let k = 1; k <= n; k++) px(c, bx - face * (k * 14 + (frame % 4) * 3), f.y + h * (0.3 + 0.12 * (k % 4)), 4) }
  if (s.tackle && s.tackle.t > HM_TACKLE.STARTUP && !s.tackle.hit) streak(s.tackle.face, 6)   // CHARGING TACKLE speed streaks
  if (s.push && s.push.phase === "push") streak(s.push.face, 3)               // PUSH THROUGH effort streaks
  if (s.stomp) { c.fillStyle = BONE; for (let k = 1; k <= 4; k++) px(c, bx - s.stomp.face * k * 8, f.y - k * 10, 6 - k) }
  if (s.landT != null && s.t - s.landT < 12) { const k = (s.t - s.landT) / 12, R = HM_STOMP.SHOCK_R * k   // METEOR landing ring
    c.fillStyle = (s.t >> 1) % 2 ? SAND : RUST; for (let a = -8; a <= 8; a++) px(c, bx + a / 8 * R, feet - 2 - Math.abs(Math.sin(a)) * 4 * (1 - k), 4) }
  if (f.attacking && f.currentAttack && f.currentAttack.name === "air") { const face = f.facing || 1   // AIR: the fist streak
    c.fillStyle = BONE; for (let k = 0; k < 4; k++) px(c, armEdge(f, face) + face * (k * 10 + 6), f.y + h * 0.45, 5 - k) }
  if (tierKey(s) === "giant" && (s.t >> 3) % 2) { c.fillStyle = "#ef4444"; px(c, bx, f.y - h * 0.55, 4) }   // GIANT glint
  const u = s.ult
  if (u && u.thome && opp) {                                                  // EXTINCTION EVENT: dust + hash-placed debris (no hitboxes)
    const gy = u.thome.y + (opp.h || 110), ox = cx(opp)
    if (u.phase === "stomps" || u.phase === "slam") {
      for (const d of ultDebris(u.seed, u.f0, u.pi)) { const at = HM_ULT.STOMP_AT[d.beat]; if (u.t < at) continue
        const k = Math.min(1, (u.t - at) / 24), y = gy - d.lift * Math.sin(Math.PI * k)
        c.fillStyle = d.size > 4 ? RUST : SAND; px(c, ox + d.dx * k, y, d.size * 2) }
      for (const at of HM_ULT.STOMP_AT) if (u.t >= at && u.t - at < 14) { const k = (u.t - at) / 14
        c.fillStyle = (u.t >> 1) % 2 ? SAND : "#a8a29e"; for (let a = -10; a <= 10; a++) px(c, bx + a * 18 * (0.4 + k), feet - 4 - (a % 3) * 4 * (1 - k), 6) }
    }
    if (u.phase === "slam" && Math.abs(u.t - HM_ULT.SLAM_AT) < 6) { c.save(); c.globalAlpha = 0.5; c.fillStyle = BONE; c.fillRect(ox - 80, opp.y - 20, 160, (opp.h || 110) + 30); c.restore() }
  }
  const r = s.tremor
  if (opp && (r.pips > 0 || r.burstT > 0)) {   // TREMOR pips over the opponent; TOPPLE = a pixel ground-crack burst under them
    const ox = cx(opp), top = opp.y, foot = opp.y + (opp.h || 110)
    if (r.burstT > 0) { const k = 24 - r.burstT
      c.fillStyle = (k >> 1) % 2 ? SAND : RUST
      for (let i = -3; i <= 3; i++) px(c, ox + i * (8 + k), foot - Math.abs(i) * 2 - (k % 3), 4)
      c.fillStyle = BONE; c.font = "bold 10px monospace"; c.textAlign = "center"; c.fillText("TOPPLE", ox, top - 18 - k) }
    else for (let k = 0; k < HM_TREMOR.MAX; k++) {
      const x = ox - 12 + k * 12, y = top - 14; c.fillStyle = INK; c.fillRect(x - 4, y - 4, 9, 9)
      c.fillStyle = k < r.pips ? RUST : "#3f3a33"; c.fillRect(x - 3, y - 3, 7, 7); if (k < r.pips) { c.fillStyle = SAND; c.fillRect(x - 1, y - 1, 2, 2) }
    }
  }
}
