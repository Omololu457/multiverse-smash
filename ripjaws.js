// ripjaws.js — RIPJAWS (Piscciss Volann), a READY Omnitrix alien. One registry entry + one sheet + one ledger, plus the
// generic, ben10-gated STORM TIDE flood (benFlood.js) that the engine reads through optional fields only.
// Leaf-style module: imports its generated art table and the shared modules it REUSES. The engine reaches it only through
// the generic ready-form hooks (docs/ben10/ADD_ALIEN.md), which hand it an `api`.
// All simulation state lives in fighter.omnitrix.formState and the owner's `_benFlood` record (plain data, GAME_STATE);
// render-only effects (rain, lightning, ripples, foam, bubbles, steam, the tidal wave, the abyss, shake) never write it.
// Simulation randomness: hash(match seed, frame, player index). Sheet: docs/ben10/aliens/ripjaws/SPRITE_LEDGER.md.
import { RIPJAWS_ANIM, RIPJAWS_GEOM, RIPJAWS_FX } from "./ripjawsAssets.js"
import { FLOOD, floodOf, floodLive, canStartFlood, startFlood, raiseFlood, depthOf, waterOf } from "./benFlood.js"   // the generic STORM TIDE flood
export { RIPJAWS_ANIM, RIPJAWS_GEOM, RIPJAWS_FX }

export const RJ_KEY = "ripjaws"
// LAND table (dry / wading) and WATER table (submerged: the fish tail). The engine renders `_skinAnim` when set (the
// Megawhatt / Diamondhead frame-set swap); Ripjaws' tick picks the table from his own depth each frame (Phase 4).
const LAND_KEYS = Object.keys(RIPJAWS_ANIM).filter(k => !k.endsWith("_w"))
export const ANIM_LAND = Object.fromEntries(LAND_KEYS.map(k => [k, RIPJAWS_ANIM[k]]))
const W = k => RIPJAWS_ANIM[k + "_w"]
export const ANIM_WATER = {
  ...ANIM_LAND,
  idle: W("idle"), walk: W("swim"), walk_back: W("swim"), run: W("swim"), dash: W("dash"), crouch: W("idle"),
  jump: W("swim"), doubleJump: W("swim"), fall: W("idle"), guard: W("idle"), crouchGuard: W("idle"), blockHit: W("hurt"),
  hurt: W("hurt"), hurt_air: W("hurt"), dizzy: W("idle"), win: W("idle"),
  light: W("light"), heavy: W("heavy"), down: W("heavy"), up: W("up"), air: W("heavy"), grab: W("heavy"),
  rjSummon: W("rjSummon"), rjJet: W("rjJet"), rjRush: W("rjRush"), rjFin: W("rjFin"), rjBreach: W("rjBreach"), rjDive: W("rjRush"),
  swim: W("swim")
}

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage (the shared convention).
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const RIPJAWS = {
  id: RJ_KEY, poolKey: RJ_KEY, displayName: "Ripjaws", slot: 20,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Big Chill (19)
  status: "ready", sheetPath: "./ben10_ripjaws_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/ripjaws/SPRITE_LEDGER.md",
  mods: { speed: 0.90, damage: 1.00, defense: 1.05, weight: 1.10 },   // dry: heavy and slow on land (the flood edge is Phase 4)
  maxJumps: 2,                                // the shared double jump; swimming never spends or refills it
  waterborne: true,                           // waterAffinity: no breath, no flood penalties (Phase 6)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Water Jet", special2: "Shark Rush", special3: "Fin Blade", special4: "Breach",
    special5: "Storm Tide", special6: "Dive Bite", ultimate: "Maelstrom Feast" },
  basic_attacks: {
    light:  normal(20, 5, 3, 9, 0, { rangeX: 100 }),                                              // attack f1-2 jab
    heavy:  normal(56, 14, 4, 22, -6, { knockbackX: 6, rangeX: 160 }),                           // attack → f2-3 bite, 160 px
    down:   normal(26, 7, 3, 14, -4, { hitLevel: "low", rangeX: 120 }),                          // crouch + low bite, hits low
    up:     normal(48, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 110 }),    // attack ↑ f1-4 (land) / f5-8 (submerged)
    air:    normal(30, 7, 4, 12, 2, { rangeX: 90 })                                              // fall frame + bite
  },
  anim: ANIM_LAND,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact,
  drawHud: (...a) => drawRipjawsHud(...a), drawFx: (...a) => drawRipjawsFx(...a)
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshRipjawsState() {
  return { kind: RJ_KEY, t: 0, frame: 0, seed: 1, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5,
    depth: "dry", set: "land", baseSpeed: null, baseDash: null,
    jet: null, rush: null, fin: null, breach: null, storm: null, dive: null, ult: null, lastUlt: null,
    diveUsed: false, breachUsed: false, airborne: false,
    stats: { casts: 0 } }
}
export const rjState = f => (f?.omnitrix?.formState?.kind === RJ_KEY && f.transformed && f.activeAlien === RJ_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshRipjawsState()
  s.baseSpeed = Number.isFinite(f._benWalkSpeed) ? f._benWalkSpeed : null; s.baseDash = Number.isFinite(f.dashSpeed) ? f.dashSpeed : null
  f._skinAnim = ANIM_LAND
}

export const cx = o => o.x + (o.w || 60) / 2
export const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function rjHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // (f, s, input, ctx, api, opp) section ticks, filled by the sections below
let projRef = null, api0 = null   // the engine's live projectile list + the api of the last tick
function tick(f, input, ctx, api) {
  const s = rjState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  if (ctx && Number.isFinite(ctx.frame)) s.frame = ctx.frame
  if (ctx && Number.isFinite(ctx.seed)) s.seed = ctx.seed >>> 0
  s.arenaTopY = ctx && Number.isFinite(ctx.arenaTopY) ? ctx.arenaTopY : null
  input = input || {}
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()
  api0 = api
  tickInputs(f, s, input)
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  if (grounded(f)) { s.airborne = false; s.diveUsed = false; s.breachUsed = false } else s.airborne = true
  for (const fn of TICKS) fn(f, s, input, ctx, api, opp)
  s.noAttack = busy(s)
}
const BUSY = []   // (s) => bool, filled by the sections below (a cast that owns him)
export const busy = s => BUSY.some(b => b(s))
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) {
  const s = rjState(f); if (!s) return md
  if (busy(s)) return false
  return md
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) WATER JET   ↓↙← + P (214) FIN BLADE   →↓↘ + P (623) BREACH   ←↙↓ + P (412) STORM TIDE
//   →→ + P (a frame-counted double tap) SHARK RUSH            air: ↓ + P DIVE BITE (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral Water Jet, ← Fin Blade,
// ↑ Breach, ↓ Storm Tide, → after a double tap Shark Rush (the Arcticguana / Big Chill layout). While SUBMERGED (swimming)
// an air Special is the matching special, not Dive Bite (he is not airborne in the water).
export const RJ_DASH_WINDOW = 14, RJ_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= RJ_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "breach"], ["412", "storm"], ["214", "fin"], ["236", "jet"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= RJ_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f) && s.depth !== "submerged") return readMotion(s) === "breach" ? "breach" : "dive"
  if (s.t - (s.dashTapT ?? -999) <= RJ_DASH_WINDOW && readMotion(s) == null) return "rush"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "fin"
  if (dir === "U") return "breach"
  if (dir === "D") return "storm"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= RJ_DASH_WINDOW) return "rush"
  return "jet"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const RJ_COST = { jet: 10, rush: 12, fin: 12, breach: 14, storm: 18, stormRaise: 12, dive: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = rjState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null   // the Maelstrom Feast cast
function fireUltimate(f, ctx, api) { const s = rjState(f); return !!(s && ULT && ULT(f, s, api, ctx)) }
const CONTACT = []   // onContact handlers (filled by the sections below)
function onContact(f, target, info) {
  const s = rjState(f); if (!s || !target || target === f) return
  for (const h of CONTACT) h(f, s, target, info || {})
}

// ── cast helpers (shared by every special) ──────────────────────────────────────────────────────────────────
export function canAct(f, s) {
  return f.transformed && f.activeAlien === RJ_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !(api ? api.spendEnergy(f, cost) : false)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.stats.casts++
  return { cast: s.castId, total }
}
export const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction.
// Lifetime >= 2 (combat.updateProjectiles culls lifetime <= 0 before hits resolve).
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, lifetime: 2, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})

// ── 3. STORM TIDE (←↙↓ + P): the flood (benFlood.js holds the schedule, cap and air gap) ──────────────────────────
// Cast (cost 18, 24f startup, the summon pose — land or tail version via the frame-set swap): Level 1 (0.18 H) over 90f.
// Recast while HIS flood is at Level 1 (cost 12, 24f): Level 2 over 60f. Never beyond Level 2, never extends the 480f from
// the first cast; then a 90f recede and a 900f cooldown. One flood at a time (a mirror Ripjaws cannot stack one). Not in
// hitstun, not during another move's active frames, not during the Ultimate (canAct / busy).
export const RJ_STORM = { STARTUP: 24, RECOVERY: 10 }
const STORM_TOTAL = RJ_STORM.STARTUP + RJ_STORM.RECOVERY
BUSY.push(s => !!(s.storm && s.storm.t < STORM_TOTAL))
export function stormCastable(f, s, opp) {
  const r = floodOf(f), fighters = [f, opp].filter(Boolean)
  if (floodLive(r)) return r.level === 1 && (r.phase === "rise" || r.phase === "hold") ? "raise" : null
  return canStartFlood(f, fighters) ? "start" : null
}
CASTS.storm = (f, s, api) => {
  if (s.ult) return false
  const opp = api && api.getOpponent ? api.getOpponent(f) : null, mode = stormCastable(f, s, opp); if (!mode) return false
  const c = beginCast(f, s, api, "rjSummon", mode === "raise" ? RJ_COST.stormRaise : RJ_COST.storm, STORM_TOTAL); if (!c) return false
  s.storm = { t: 0, cast: c.cast, mode }; s.stats.storms = (s.stats.storms || 0) + 1
  return true
}
TICKS.push(function tickStorm(f, s, input, ctx, api, opp) {
  const st = s.storm; if (!st) return
  st.t++
  if (st.t === RJ_STORM.STARTUP) {
    if (st.mode === "raise") raiseFlood(f)
    else if (canStartFlood(f, [f, opp].filter(Boolean))) startFlood(f, { arenaTopY: s.arenaTopY }, [f, opp].filter(Boolean), (s.seed ^ Math.imul(s.frame | 0, 2654435761)) >>> 0)
  }
  if (st.t >= STORM_TOTAL) s.storm = null
})

//@@SECTIONS@@

// ── RENDER (HUD + FX; render-only, never GAME_STATE) ─────────────────────────────────────────────────────────
const HUD = []   // (ctx, f, o) HUD rows
const FX = []    // (c, f, frame, opp) FX layers
export function drawRipjawsHud(ctx, f, o) { if (!rjState(f)) return; for (const h of HUD) h(ctx, f, o) }
export function drawRipjawsFx(c, f, frame = 0, opp = null) { if (!rjState(f)) return; for (const h of FX) h(c, f, frame, opp) }
