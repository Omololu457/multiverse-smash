// ripjaws.js — RIPJAWS (Piscciss Volann), a READY Omnitrix alien. One registry entry + one sheet + one ledger, plus the
// generic, ben10-gated STORM TIDE flood (benFlood.js) that the engine reads through optional fields only.
// Leaf-style module: imports its generated art table and the shared modules it REUSES. The engine reaches it only through
// the generic ready-form hooks (docs/ben10/ADD_ALIEN.md), which hand it an `api`.
// All simulation state lives in fighter.omnitrix.formState and the owner's `_benFlood` record (plain data, GAME_STATE);
// render-only effects (rain, lightning, ripples, foam, bubbles, steam, the tidal wave, the abyss, shake) never write it.
// Simulation randomness: hash(match seed, frame, player index). Sheet: docs/ben10/aliens/ripjaws/SPRITE_LEDGER.md.
import { RIPJAWS_ANIM, RIPJAWS_GEOM, RIPJAWS_FX } from "./ripjawsAssets.js"
import { FLOOD, floodOf, floodLive, canStartFlood, startFlood, raiseFlood, depthOf, waterOf, breathHit } from "./benFlood.js"   // the generic STORM TIDE flood
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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, damageDealt, hurtbox,
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
  s.lastInput = { left: !!input.left, right: !!input.right, up: !!input.up, down: !!input.down, jump: !!input.jump }
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  if (grounded(f)) { s.airborne = false; if (!s.dive) s.diveUsed = false; if (!s.breach) s.breachUsed = false } else s.airborne = true   // the takeoff frame of a breach is still grounded
  for (const fn of TICKS) fn(f, s, input, ctx, api, opp)
  s.noAttack = busy(s)
}
const BUSY = []   // (s) => bool, filled by the sections below (a cast that owns him)
export const busy = s => BUSY.some(b => b(s))
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) {
  const s = rjState(f); if (!s) return md
  if (busy(s)) return false
  s.meleeSeq = (s.meleeSeq || 0) + 1   // each normal is its own "cast" for Breath Steal
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
  if (!grounded(f) && s.depth !== "submerged") return readMotion(s) === "breach" || f._specialHeldDir === "U" ? "breach" : "dive"
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

// ── 4. WATER EDGE (his own form rules; the flood stamps his depth like everyone's, but he is WATERBORNE) ──────────
// WADING: damage +10 %, speed +15 % (land frames). SUBMERGED: damage +15 %, full SWIM — 8-direction steering at ×1.4 of his
// walk speed, no gravity (the reused `_benGlide` field: stage + floor clamped), swim / tail frames (the `_skinAnim` frame-set
// swap), no breath. Swimming never touches jumps; at the surface Jump leaps him out (an ordinary jump). Specials keep their
// normal costs. Faster, not tankier: no armor, no invulnerability. Mirror: each Ripjaws gets these from his own form.
export const RJ_EDGE = { WADE_DMG: 1.10, WADE_SPD: 1.15, SUB_DMG: 1.15, SWIM: 1.4, SURFACE: 0.4 }
function damageDealt(f, target, raw) {
  const s = rjState(f); if (!s) return raw
  return raw * (s.depth === "wading" ? RJ_EDGE.WADE_DMG : s.depth === "submerged" ? RJ_EDGE.SUB_DMG : 1)
}
export const swimSpeed = s => (s.baseSpeed ?? 6) * RJ_EDGE.SWIM
TICKS.push(function tickWater(f, s, input) {
  const w = waterOf(f); s.depth = w ? w.depth : "dry"
  // swimming = submerged, or already swimming and treading at the surface (head out, feet under, off the floor)
  const sub = s.depth === "submerged" || (!!s.swimming && s.depth === "wading" && !grounded(f))
  const want = sub ? ANIM_WATER : ANIM_LAND; if (f._skinAnim !== want) f._skinAnim = want; s.set = sub ? "water" : "land"
  const k = s.depth === "wading" ? RJ_EDGE.WADE_SPD : 1
  if (s.baseSpeed != null) f._benWalkSpeed = s.baseSpeed * k
  if (s.baseDash != null) f.dashSpeed = s.baseDash * k
  if (!sub) { if (s.swimming) { delete f._benGlide; s.swimming = false } return }
  const surfaceY = w.lineY - (f.h || 100) * RJ_EDGE.SURFACE          // the highest he swims: head and shoulders out
  const jumpEdge = !!(input.jump || input.up) && !s.jumpPrev; s.jumpPrev = !!(input.jump || input.up)
  if (jumpEdge && f.y <= surfaceY + 2) { if (s.swimming) { delete f._benGlide; s.swimming = false } return }   // leap out (an ordinary jump)
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0), dy = (input.down ? 1 : 0) - ((input.up || input.jump) ? 1 : 0)
  if (f.attacking || busy(s) || (f.hitstun || 0) > 0) { dx = 0; dy = 0 }
  const n = Math.hypot(dx, dy) || 1, v = swimSpeed(s)
  f._benGlide = { vx: dx / n * v, vy: dy / n * v, minY: surfaceY }; s.swimming = true
  if (dx) f.facing = dx > 0 ? 1 : -1
})

// ── 5. BREATH STEAL (benFlood.breathHit): each CLEAN Ripjaws hit on a SUBMERGED non-waterborne opponent takes −6 breath,
// once per cast (a special's cast id; each normal counts as its own cast). Blocked hits never steal.
CONTACT.push(function stealBreath(f, s, target, { proj, blocked }) {
  if (blocked) return
  const key = proj && proj.alien && proj.alien.cast != null ? "c" + proj.alien.cast : "m" + (s.meleeSeq || 0)
  breathHit(f, target, key, "steal")
})

// ── 8. SPECIALS ─────────────────────────────────────────────────────────────────────────────────────────────
// Every special keeps its cost wherever he is; damage below is the move's own (the depth edge of Phase 4 rides on top).
const mouth = f => ({ x: cx(f) + (f.facing || 1) * (f.w || 60) * 0.4, y: f.y + (f.h || 110) * 0.35 })
const endCast = f => { f._benPowerCommit = 0; f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
const surfaceOf = (f, w) => w ? w.lineY - (f.h || 110) * RJ_EDGE.SURFACE : -1e9
// held direction at the cast → a unit vector (8 directions, facing-relative neutral = forward)
function dirVec(f, input) {
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0), dy = (input.down ? 1 : 0) - ((input.up || input.jump) ? 1 : 0)
  if (!dx && !dy) dx = f.facing || 1
  const n = Math.hypot(dx, dy); return { dx: dx / n, dy: dy / n }
}

// 1. WATER JET (↓↘→ + P, cost 10): a pressurised jet from the mouth — 450 px, 35, water-tagged (never put out, never slowed:
// full speed in the water), ONE on screen, −10 on block (point blank). 14f startup, 20f recovery.
export const RJ_JET = { STARTUP: 14, RECOVERY: 20, SPEED: 15, RANGE: 450, DMG: 35, W: 46, H: 26, ON_BLOCK: -10 }
BUSY.push(s => !!s.jet)
const jetLive = f => !!(projRef && projRef.some(p => p.owner === f && p.alien && p.alien.rj === "jet"))
CASTS.jet = (f, s, api) => {
  if (jetLive(f)) return false
  const c = beginCast(f, s, api, "rjJet", RJ_COST.jet, RJ_JET.STARTUP + RJ_JET.RECOVERY); if (!c) return false
  s.jet = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.jets = (s.stats.jets || 0) + 1
  return true
}
TICKS.push(function tickJet(f, s, input, ctx, api) {
  const j = s.jet; if (!j) return
  j.t++
  if ((f.hitstun || 0) > 0) { s.jet = null; return }
  if (j.t === RJ_JET.STARTUP && !jetLive(f)) { const m = mouth(f)
    api && api.spawnProjectile(f, "rj_water_jet", { damage: RJ_JET.DMG, speed: RJ_JET.SPEED, vx: j.face * RJ_JET.SPEED, vy: 0, spawnX: m.x, spawnY: m.y,
      w: RJ_JET.W, h: RJ_JET.H, lifetime: Math.ceil(RJ_JET.RANGE / RJ_JET.SPEED), isSpecial: true, hitstun: 20,
      blockstun: blockstunFor(RJ_JET.RECOVERY, RJ_JET.ON_BLOCK), knockbackX: 4, knockbackY: -2, alien: { hidden: true, rj: "jet", element: "water", cast: j.cast } }, {}) }
  if (j.t >= RJ_JET.STARTUP + RJ_JET.RECOVERY) s.jet = null
})

// 2. SHARK RUSH (→→ + P, cost 12). DRY / wading: a 320 px lunge, 45, −13 on block. SUBMERGED: an 8-direction torpedo,
// the direction FIXED at the cast from the held stick (neutral = forward), 420 px, 55, −11. One hit per rush (Breath Steal
// applies through the shared contact rule). 10f startup, 16f travel, 18f recovery; stage / floor / surface clamped.
export const RJ_RUSH = { STARTUP: 10, TRAVEL: 16, RECOVERY: 18, DRY: { DIST: 320, DMG: 45, ON_BLOCK: -13 }, SUB: { DIST: 420, DMG: 55, ON_BLOCK: -11 }, W: 80, H: 70 }
const RUSH_TOTAL = RJ_RUSH.STARTUP + RJ_RUSH.TRAVEL + RJ_RUSH.RECOVERY
BUSY.push(s => !!s.rush)
CASTS.rush = (f, s, api, ctx) => {
  const sub = s.depth === "submerged" || !!s.swimming
  const c = beginCast(f, s, api, "rjRush", RJ_COST.rush, RUSH_TOTAL); if (!c) return false
  const v = sub ? dirVec(f, s.lastInput || {}) : { dx: f.facing || 1, dy: 0 }
  s.rush = { t: 0, cast: c.cast, sub, dx: v.dx, dy: v.dy, y0: f.y, hit: false }; s.stats.rushes = (s.stats.rushes || 0) + 1
  if (v.dx) f.facing = v.dx > 0 ? 1 : -1
  return true
}
TICKS.push(function tickRush(f, s, input, ctx, api) {
  const r = s.rush; if (!r) return
  r.t++
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.rush = null; return }
  const P = r.sub ? RJ_RUSH.SUB : RJ_RUSH.DRY, live = r.t - RJ_RUSH.STARTUP
  if (live >= 1 && live <= RJ_RUSH.TRAVEL) {
    const sp = P.DIST / RJ_RUSH.TRAVEL, w = waterOf(f)
    f._benGlide = { vx: r.dx * sp, vy: r.dy * sp, minY: r.sub ? surfaceOf(f, w) : r.y0 }
    if (!r.hit) hitbox(f, api, "rj_shark_rush", r.dx >= 0 ? 1 : -1, { damage: P.DMG, spawnX: cx(f) + r.dx * (f.w || 60) * 0.5, spawnY: f.y + (f.h || 110) * 0.5 + r.dy * 20,
      w: RJ_RUSH.W, h: RJ_RUSH.H, lifetime: 2, hitstun: 22, blockstun: blockstunFor(RJ_RUSH.RECOVERY + RJ_RUSH.TRAVEL - live, P.ON_BLOCK), knockbackX: 6, knockbackY: -3,
      alien: { rj: "rush", cast: r.cast } })
  } else if (live === RJ_RUSH.TRAVEL + 1) { delete f._benGlide; f.vx = 0; if (!r.sub) f.vy = 0 }
  if (r.t >= RUSH_TOTAL) { delete f._benGlide; s.rush = null }
})
CONTACT.push((f, s, target, { proj }) => { const a = proj && proj.alien; if (a && a.rj === "rush" && s.rush && s.rush.cast === a.cast) s.rush.hit = true })

// 3. FIN BLADE (↓↙← + P, cost 12): the tail fin sweeps out 260 px — 2 hits, 18 then 22, 14f startup, −12 on block. The fin
// is an EXTENDED LIMB: from the first active frame through the recovery his hurtbox reaches out with it (whiff-punishable).
export const RJ_FIN = { STARTUP: 14, GAP: 6, ACTIVE: 3, RECOVERY: 22, DMG: [18, 22], REACH: 260, H: 60, ON_BLOCK: -12 }
RJ_FIN.TOTAL = RJ_FIN.STARTUP + RJ_FIN.GAP + RJ_FIN.ACTIVE + RJ_FIN.RECOVERY
BUSY.push(s => !!s.fin)
CASTS.fin = (f, s, api) => {
  const c = beginCast(f, s, api, "rjFin", RJ_COST.fin, RJ_FIN.TOTAL); if (!c) return false
  s.fin = { t: 0, cast: c.cast, face: f.facing || 1, hits: 0 }; s.stats.fins = (s.stats.fins || 0) + 1
  return true
}
TICKS.push(function tickFin(f, s, input, ctx, api) {
  const n = s.fin; if (!n) return
  n.t++
  if ((f.hitstun || 0) > 0) { s.fin = null; return }
  for (let k = 0; k < 2; k++) if (n.t === RJ_FIN.STARTUP + k * RJ_FIN.GAP) {
    hitbox(f, api, "rj_fin_" + k, n.face, { damage: RJ_FIN.DMG[k], spawnX: cx(f) + n.face * RJ_FIN.REACH / 2, spawnY: f.y + (f.h || 110) * 0.55,
      w: RJ_FIN.REACH, h: RJ_FIN.H, lifetime: RJ_FIN.ACTIVE + 1, hitstun: k ? 22 : 16, blockstun: blockstunFor(RJ_FIN.TOTAL - n.t - RJ_FIN.ACTIVE, RJ_FIN.ON_BLOCK),
      knockbackX: k ? 5 : 1, knockbackY: k ? -3 : 0, alien: { rj: "fin", cast: n.cast, k } }); n.hits++ }
  if (n.t >= RJ_FIN.TOTAL) s.fin = null
})
export const finExtended = s => !!(s && s.fin && s.fin.t >= RJ_FIN.STARTUP)
function hurtbox(f) {
  const s = rjState(f); if (!finExtended(s)) return null
  const face = s.fin.face, x0 = f.x + 6, w0 = Math.max(1, (f.w || 60) - 12), reach = RJ_FIN.REACH - (f.w || 60) / 2
  return face > 0 ? { x: x0, y: f.y + 6, w: w0 + reach, h: Math.max(1, (f.h || 110) - 6) } : { x: x0 - reach, y: f.y + 6, w: w0 + reach, h: Math.max(1, (f.h || 110) - 6) }
}

// 4. BREACH (→↓↘ + P, or ↑ + P; cost 14), once per airtime, never refills a jump. DRY: a rising anti-air bite — 55, launches.
// SUBMERGED: he rockets up to the surface + 60 px and bursts out — 60, launches; at the burst an opponent (not guarding)
// within 160 px is POPPED above the line. 6f startup, 14f rise, 20f recovery (falls normally).
export const RJ_BREACH = { STARTUP: 6, RISE: 14, RECOVERY: 20, DRY_DMG: 55, SUB_DMG: 60, DRY_VY: -13, ABOVE: 60, POP_R: 160, POP_VY: -11, W: 80, H: 90 }
BUSY.push(s => !!(s.breach && s.breach.t < RJ_BREACH.STARTUP + RJ_BREACH.RISE))
CASTS.breach = (f, s, api) => {
  if (s.breachUsed) return false
  const sub = s.depth === "submerged" || !!s.swimming
  const c = beginCast(f, s, api, "rjBreach", RJ_COST.breach, RJ_BREACH.STARTUP + RJ_BREACH.RISE + RJ_BREACH.RECOVERY); if (!c) return false
  const w = waterOf(f)
  s.breach = { t: 0, cast: c.cast, sub, face: f.facing || 1, topY: sub && w ? w.lineY - RJ_BREACH.ABOVE - (f.h || 110) : null, hit: false, popped: false }
  s.breachUsed = true; s.stats.breaches = (s.stats.breaches || 0) + 1
  return true
}
TICKS.push(function tickBreach(f, s, input, ctx, api, opp) {
  const b = s.breach; if (!b) return
  b.t++
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.breach = null; return }
  const live = b.t - RJ_BREACH.STARTUP
  if (live < 1) { f._benGlide = { vx: 0, vy: 0 }; return }
  if (live <= RJ_BREACH.RISE) {
    const vy = b.sub ? Math.min(0, (b.topY - f.y) / (RJ_BREACH.RISE - live + 1)) : RJ_BREACH.DRY_VY
    f._benGlide = { vx: 0, vy, minY: b.sub ? b.topY : -1e9 }
    if (b.sub) { s.swimming = false; f._skinAnim = ANIM_WATER }
    if (!b.hit) hitbox(f, api, "rj_breach", b.face, { damage: b.sub ? RJ_BREACH.SUB_DMG : RJ_BREACH.DRY_DMG, spawnX: cx(f) + b.face * 16, spawnY: f.y + (f.h || 110) * 0.3,
      w: RJ_BREACH.W, h: RJ_BREACH.H, lifetime: 2, hitstun: 26, blockstun: blockstunFor(RJ_BREACH.RECOVERY + RJ_BREACH.RISE - live, -18), launcher: true, launchVy: -16,
      knockbackX: 3, knockbackY: -14, alien: { rj: "breach", cast: b.cast } })
    if (b.sub && live === RJ_BREACH.RISE && opp && !b.popped) {                  // the burst: pop a nearby opponent out of the water
      b.popped = true; const w = waterOf(opp)
      if (w && w.depth !== "dry" && !opp.isBlocking && Math.abs(cx(opp) - cx(f)) <= RJ_BREACH.POP_R) {
        opp.y = Math.min(opp.y, w.lineY - (opp.h || 110) - 1); opp.vy = Math.min(opp.vy || 0, RJ_BREACH.POP_VY); opp.onGround = opp.grounded = false; s.stats.pops = (s.stats.pops || 0) + 1 }
    }
    return
  }
  if (live === RJ_BREACH.RISE + 1) { delete f._benGlide; f.vy = 0; f.onGround = f.grounded = false }
  if (b.t >= RJ_BREACH.STARTUP + RJ_BREACH.RISE + RJ_BREACH.RECOVERY) s.breach = null
})
CONTACT.push((f, s, target, { proj }) => { const a = proj && proj.alien; if (a && a.rj === "breach" && s.breach && s.breach.cast === a.cast) s.breach.hit = true })

// 5. DIVE BITE (air ↓ + P, cost 12): a steep diving bite to the floor — 48, once per airtime, never refills a jump. A clean
// bite drags them under: UNDERTOW (−15 breath once + a 30f sink; benFlood.breathHit) on a wading / submerged target.
export const RJ_DIVE = { STARTUP: 6, VX: 7, VY: 12, MAX: 40, DMG: 48, W: 70, H: 80, LAND: 14, ON_BLOCK: -8 }
BUSY.push(s => !!s.dive)
CASTS.dive = (f, s, api) => {
  if (grounded(f) || s.diveUsed) return false
  const c = beginCast(f, s, api, "rjDive", RJ_COST.dive, RJ_DIVE.STARTUP + RJ_DIVE.MAX + RJ_DIVE.LAND); if (!c) return false
  s.dive = { t: 0, cast: c.cast, face: f.facing || 1, hit: false, landT: -1, prevY: f.y }; s.diveUsed = true; s.stats.dives = (s.stats.dives || 0) + 1
  return true
}
TICKS.push(function tickDive(f, s, input, ctx, api) {
  const d = s.dive; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.dive = null; return }
  if (d.landT >= 0) { delete f._benGlide; if (d.t - d.landT >= RJ_DIVE.LAND) { s.dive = null; endCast(f) } return }
  if (d.t < RJ_DIVE.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const live = d.t - RJ_DIVE.STARTUP
  if (live > 0 && f.y <= d.prevY + 1e-6) { d.landT = d.t; delete f._benGlide; f.vy = 0; f._benPowerCommit = RJ_DIVE.LAND; f.attackCooldown = RJ_DIVE.LAND; return }
  if (live >= RJ_DIVE.MAX) { delete f._benGlide; s.dive = null; endCast(f); return }
  d.prevY = f.y
  f._benGlide = { vx: d.face * RJ_DIVE.VX, vy: RJ_DIVE.VY }
  if (!d.hit) hitbox(f, api, "rj_dive_bite", d.face, { damage: RJ_DIVE.DMG, spawnX: cx(f) + d.face * 10, spawnY: f.y + (f.h || 110) * 0.65, w: RJ_DIVE.W, h: RJ_DIVE.H,
    lifetime: 2, hitstun: 22, blockstun: blockstunFor(RJ_DIVE.LAND, RJ_DIVE.ON_BLOCK), knockbackX: 3, knockbackY: 2, alien: { rj: "dive", cast: d.cast } })
})
CONTACT.push((f, s, target, { proj, blocked }) => {
  const a = proj && proj.alien; if (!a || a.rj !== "dive" || !s.dive || s.dive.cast !== a.cast) return
  s.dive.hit = true; if (!blocked) breathHit(f, target, "d" + a.cast, "undertow")
})

//@@SECTIONS@@

// ── RENDER (HUD + FX; render-only, never GAME_STATE) ─────────────────────────────────────────────────────────
const HUD = []   // (ctx, f, o) HUD rows
const FX = []    // (c, f, frame, opp) FX layers
export function drawRipjawsHud(ctx, f, o) { if (!rjState(f)) return; for (const h of HUD) h(ctx, f, o) }
export function drawRipjawsFx(c, f, frame = 0, opp = null) { if (!rjState(f)) return; for (const h of FX) h(c, f, frame, opp) }
// render-only: the Water Jet (pixel water column + spray), the Fin Blade arc, the Breach / Shark Rush wake
FX.push(function fxSpecials(c, f, frame) {
  const s = rjState(f); c.save()
  if (projRef) for (const p of projRef) if (p.owner === f && p.alien && p.alien.rj === "jet") {
    const face = Math.sign(p.vx || 1), x = p.x, y = p.y, w = p.w || RJ_JET.W, h = p.h || RJ_JET.H
    c.globalAlpha = 0.9; c.fillStyle = "#38bdf8"; c.fillRect(Math.round(x), Math.round(y + h * 0.2), w, Math.round(h * 0.6))
    c.fillStyle = "#e0f2fe"; c.fillRect(Math.round(x + (face > 0 ? w - 10 : 0)), Math.round(y), 10, h)
    c.globalAlpha = 0.6; for (let i = 0; i < 6; i++) c.fillRect(Math.round(x - face * (8 + i * 9)), Math.round(y + h / 2 + Math.sin((frame + i * 3) * 0.6) * 6), 4, 4)
  }
  if (s && s.fin && s.fin.t >= RJ_FIN.STARTUP - 2 && s.fin.t <= RJ_FIN.STARTUP + RJ_FIN.GAP + RJ_FIN.ACTIVE) {
    const face = s.fin.face, x0 = cx(f), y0 = f.y + (f.h || 110) * 0.55
    c.globalAlpha = 0.75; c.fillStyle = "#94a3b8"; for (let i = 0; i < 26; i++) { const k = i / 25; c.fillRect(Math.round(x0 + face * k * RJ_FIN.REACH), Math.round(y0 - Math.sin(k * Math.PI) * 22), 6, 4) }
    c.fillStyle = "#f8fafc"; c.fillRect(Math.round(x0 + face * RJ_FIN.REACH - 4), Math.round(y0 - 3), 8, 6)
  }
  if (s && ((s.rush && s.rush.t > RJ_RUSH.STARTUP && s.rush.t <= RJ_RUSH.STARTUP + RJ_RUSH.TRAVEL) || (s.breach && s.breach.t > RJ_BREACH.STARTUP && s.breach.t <= RJ_BREACH.STARTUP + RJ_BREACH.RISE))) {
    c.globalAlpha = 0.5; c.fillStyle = "#bae6fd"; for (let i = 0; i < 8; i++) c.fillRect(Math.round(cx(f) - 20 + ((i * 37 + frame * 5) % 40)), Math.round(f.y + (f.h || 110) * (0.2 + (i % 4) * 0.2)), 5, 3)
  }
  c.restore()
})
