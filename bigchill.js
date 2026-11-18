// bigchill.js — BIG CHILL (Necrofriggian), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf-style module: imports its generated art table and (from Phase 3 on) the shared modules it REUSES — flight.js, the
// Arcticguana ice status (Chill → Popsicle → Shatter) and Ghostfreak's intangibility tag tests. The engine reaches it only
// through the generic, ben10-gated ready-form hooks (see docs/ben10/ADD_ALIEN.md), which hand it an `api`.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (frost mist,
// shards, ice overlays, the ice cocoon shell, shake) never write it. Simulation randomness: hash(match seed, frame, player).
// Sheet: docs/ben10/aliens/bigchill/SPRITE_LEDGER.md.
import { BIGCHILL_ANIM, BIGCHILL_GEOM, BIGCHILL_FX, BIGCHILL_ICE_FX } from "./bigchillAssets.js"
import { flightTakeoff, isFlying, FLIGHT_PHASE, flightKnockedDown } from "./flight.js"   // reused (Ghostfreak / Alien X / Jetray do the same)
import { isEnergyMelee, isEnergyProjectile } from "./ghostfreak.js"   // REUSED intangibility tag filter (energy / fire / electric / beam still hit)
import { AG_CHILL, addChill, endPopsicle, shatterPopsicle, tickChill, frozen, iceImmune } from "./arcticguana.js"   // the SHARED ice status (rules + numbers reused, never re-implemented)
export { AG_CHILL, frozen, endPopsicle }
export { BIGCHILL_ANIM, BIGCHILL_GEOM, BIGCHILL_FX, BIGCHILL_ICE_FX }

export const BC_KEY = "bigchill"
// flight poses (sprite.js maps the flight controller's pose to fly / flyHover / flyCruise / flyRise / flyDive): wings OPEN
const ANIM = { ...BIGCHILL_ANIM, fly: BIGCHILL_ANIM.bcFly, flyHover: BIGCHILL_ANIM.bcFly, flyCruise: BIGCHILL_ANIM.bcFly,
  flyRise: BIGCHILL_ANIM.bcFly, flyDive: BIGCHILL_ANIM.bcFly }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const BIGCHILL = {
  id: BC_KEY, poolKey: BC_KEY, displayName: "Big Chill", slot: 18,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Arcticguana (17)
  status: "ready", sheetPath: "./ben10_bigchill_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/bigchill/SPRITE_LEDGER.md",
  mods: { speed: 1.00, damage: 1.05, defense: 0.95, weight: 0.80 },
  movement: "flight", maxJumps: 2,            // the shared double jump; flight never refills it
  flightProfile: "bigchill",                  // flight.js FLIGHT_PROFILES.bigchill (per-alien flight profile hook)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Freeze Breath", special2: "Frost Wing Cut", special3: "Ice Spire", special4: "Cocoon",
    special5: "Phase Drift", special6: "Diving Chill", ultimate: "Frozen Sky" },
  basic_attacks: {
    light:  normal(16, 5, 3, 9, 1, { rangeX: 100 }),                                             // atk_A claw + frost streak
    heavy:  normal(50, 13, 4, 22, -6, { knockbackX: 6, rangeX: 180, bcShatter: true }),         // atk_AAS wing strike, ice edge, 180 px, shatters
    down:   normal(22, 7, 3, 14, -3, { hitLevel: "low", rangeX: 120 }),                         // atk_S low claw, hits low
    up:     normal(42, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 110 }),   // atk_jump_S rising wing sweep, launches
    air:    normal(26, 7, 4, 12, 2, { rangeX: 90 })                                             // atk_jump_A wing flip slash
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, evade, phasing, bodyAlpha,
  drawHud: drawBigChillHud, drawFx: drawBigChillFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBigChillState() {
  return { kind: BC_KEY, t: 0, frame: 0, seed: 1, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false, spHeld: false,
    drift: null, driftCd: 0,
    chill: freshChill(),   // the shared ice status record — Arcticguana's exact shape (its functions run on it)
    jumpHeld: 0, airborne: false, apexY: null, capY: null, flightUsed: 0, flyT: 0, flights: 0, diveUsed: false,
    stats: { casts: 0 } }
}
export const bcState = f => (f?.omnitrix?.formState?.kind === BC_KEY && f.transformed && f.activeAlien === BC_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshBigChillState()
  f._alienFlightProfile = BIGCHILL.flightProfile; f._flightCtl = null   // cleared by clearBenFormState on swap / revert / KO
  if (grounded(f)) s.airborne = false
}

export const cx = o => o.x + (o.w || 60) / 2
export const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function bcHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // (f, s, input, ctx, api, opp) section ticks, filled by the sections below
let projRef = null, api0 = null   // the engine's live projectile list + the api of the last tick (hooks called outside the tick)
function tick(f, input, ctx, api) {
  const s = bcState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  if (ctx && Number.isFinite(ctx.frame)) s.frame = ctx.frame
  if (ctx && Number.isFinite(ctx.seed)) s.seed = ctx.seed >>> 0
  input = input || {}
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()
  api0 = api
  tickInputs(f, s, input)
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  for (const fn of TICKS) fn(f, s, input, ctx, api, opp)
  s.noAttack = busy(s); s.noBlock = driftLive(s)
  s.spPrev = !!input.special; s.spHeld = !!input.special
}
const BUSY = []   // (s) => bool, filled by the sections below (a cast that owns him)
export const busy = s => BUSY.some(b => b(s))
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) {
  const s = bcState(f); if (!s) return md
  if (busy(s)) return false
  return md
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) FREEZE BREATH   ↓↙← + P (214) FROST WING CUT   →↓↘ + P (623) ICE SPIRE   ←↙↓ + P (412) COCOON
//   →→ + P (a frame-counted double tap) PHASE DRIFT            air: ↓ + P (any air Special) DIVING CHILL (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral Freeze Breath,
// ← Frost Wing Cut, ↑ Ice Spire, ↓ Cocoon, → after a double tap Phase Drift (Arcticguana's layout).
export const BC_DASH_WINDOW = 14, BC_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= BC_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "spire"], ["412", "cocoon"], ["214", "wingcut"], ["236", "breath"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= BC_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "dive"
  if (s.t - (s.dashTapT ?? -999) <= BC_DASH_WINDOW && readMotion(s) == null) return "drift"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "wingcut"
  if (dir === "U") return "spire"
  if (dir === "D") return "cocoon"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= BC_DASH_WINDOW) return "drift"
  return "breath"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const BC_COST = { breath: 10, breathHold: 4, wingcut: 12, spire: 14, cocoon: 12, drift: 14, dive: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = bcState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null   // the Frozen Sky cast (section 6)
function fireUltimate(f, ctx, api) { const s = bcState(f); return !!(s && ULT && ULT(f, s, api, ctx)) }
const CONTACT = []   // onContact handlers (filled by the sections below)
function onContact(f, target, info) {
  const s = bcState(f); if (!s || !target || target === f) return
  for (const h of CONTACT) h(f, s, target, info || {})
}

// ── 3. FLIGHT (flight.js, profile "bigchill"; Ghostfreak's hold-Jump model) ──────────────────────────────────────
// Hold Jump in the air (8f) to fly: 200f per airtime, cruise 6.0, moderate drag, 8-direction steering (the flight
// controller), never above the jump apex + 200 px, knocked out of the sky (40f grounded lock) by a hard hit, never refills
// jumps. Wings: OPEN frames while flying (a 6f opening transition — render pose only, never a gameplay lock), CLOSED on the
// ground; the pose follows the flight flag only (bcWings).
export const BC_FLIGHT = { MAX: 200, CAP: 200, HOLD: 8, OPEN: 6 }
export function bcWings(f) {
  const s = bcState(f); if (!s) return "closed"
  if (!isFlying(f)) return "closed"
  return s.flyT < BC_FLIGHT.OPEN ? "opening" : "open"
}
const flightBlocked = s => busy(s)
TICKS.push(function tickFlight(f, s, input) {
  const c = f._flightCtl, flying = !!c && isFlying(f), g = grounded(f)
  const jump = !!(input && (input.jump || input.up))
  s.jumpHeld = jump ? s.jumpHeld + 1 : 0
  if (g) { s.airborne = false; s.apexY = null; s.capY = null; s.flightUsed = 0; s.diveUsed = false }
  else { s.airborne = true; if (!flying) s.apexY = s.apexY == null ? f.y : Math.min(s.apexY, f.y) }
  if (flying) {
    s.flightUsed++; s.flyT++
    if ((f.hitstun || 0) > 0) { flightKnockedDown(f); s.flyT = 0; return }        // hard hit → drop + 40f grounded lock
    if (!jump || flightBlocked(s) || s.flightUsed >= BC_FLIGHT.MAX) { c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false; s.flyT = 0; return }
    if (s.capY != null && f.y < s.capY) { f.y = s.capY; if ((f.vy || 0) < 0) f.vy = 0 }   // no altitude past apex + 200
    if (!f.attacking && !busy(s)) { f._spriteCastMove = s.flyT < BC_FLIGHT.OPEN ? "bcOpen" : "bcFly"; f._spriteCastTimer = 2 }
    return
  }
  s.flyT = 0
  if (g || flightBlocked(s) || !jump || s.jumpHeld < BC_FLIGHT.HOLD || s.flightUsed >= BC_FLIGHT.MAX || f.attacking || (f.hitstun || 0) > 0) return
  const jc = f.jumpCount
  if (flightTakeoff(f)) {
    f.jumpCount = jc                                                               // flight never refills jumps
    s.capY = (s.apexY ?? f.y) - BC_FLIGHT.CAP; s.flights++
  }
})

// ── 4. SHARED ICE SYSTEM (Arcticguana's Chill → Popsicle → Shatter, called — not re-implemented) ─────────────────
// CHILL: one pip per CAST (a cast id on the tag) from Freeze Breath, Frost Wing Cut, Ice Spire, Cocoon's burst and Diving
// Chill; max 3; 240f expiry; never from blocks, FX, trails or mist (only tags carrying `chill` count). 3 pips → the
// shared POPSICLE freeze (30 ticks, held via hitstun leases, input polling + clock untouched, mash-out read only).
// SHATTER: a clean Heavy or Frost Wing Cut on the frozen opponent ends it ONCE for the fixed +25. ANY other damage ends it
// with no bonus. 420f refreeze immunity — ONE timer on the opponent shared with Arcticguana (arcticguana.iceImmune).
// Big Chill only renders the shell differently: a procedural pixel ICE COCOON in his own colours (render-only).
export function freshChill() { return { pips: 0, lastT: -999, pipped: [], immuneT: 0, frozen: null, pops: 0, shatters: 0, ends: [], endT: -999, shatterT: -999 } }
export const BC_SHATTER_MOVES = ["heavy"]
export const sharedImmune = (s, opp) => s.chill.immuneT > 0 || iceImmune(s, opp)
TICKS.push((f, s, input, ctx, api, opp) => tickChill(f, s, opp, api))
CONTACT.push((f, s, target, { proj, move, blocked }) => {   // shatter first, then chill (a shatter starts immunity)
  if (blocked) return
  const tag = proj && proj.alien
  const shatters = (tag && tag.shatter) || (!proj && move && (move.bcShatter || BC_SHATTER_MOVES.includes(move.name)))
  if (frozen(s)) { if (shatters) shatterPopsicle(f, s, target, api0); else endPopsicle(f, s, target, "damage") }
  if (tag && tag.chill) addChill(f, s, target, tag.cast)
})

// ── cast helpers (shared by every special) ──────────────────────────────────────────────────────────────────
export function canAct(f, s) {
  return f.transformed && f.activeAlien === BC_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
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
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction.
// Lifetime >= 2 (combat.updateProjectiles culls lifetime <= 0 before hits resolve).
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, lifetime: 2, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
export const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)
const pressed = (input, s) => !!(input.light || input.heavy || (input.special && !s.spPrev))

// ── 5. PHASE DRIFT (→→ + P, cost 14, 5 s cooldown) — Ghostfreak's tag-based intangibility, bounded ───────────────
// 4f startup, then a 16f intangible glide THROUGH the opponent (no pushbox; legal stage collision — physics clamps the glide
// and the landing is clamped to the stage, so he never ends in a wall or out of bounds). The landing is fixed AT CAST TIME:
// 60 px behind the opponent's cast-time body (at most 300 px of travel), facing them; no tracking after. During the glide
// he is intangible to physical melee and non-energy projectiles (energy / fire / electric / beam / ultimates still hit —
// Ghostfreak's isEnergyMelee / isEnergyProjectile) and cannot attack or block. Then 12f recovery, in which an attack press
// (buffered from the glide) cancels into the optional WING SLASH: 35, no Chill.
export const BC_DRIFT = { STARTUP: 4, TRAVEL: 16, RECOVERY: 12, DIST: 300, BEHIND: 60, CD: 300,
  SLASH: 35, SLASH_STARTUP: 6, SLASH_ACTIVE: 3, SLASH_RECOVERY: 14, SLASH_W: 120, SLASH_H: 80 }
BC_DRIFT.TOTAL = BC_DRIFT.STARTUP + BC_DRIFT.TRAVEL + BC_DRIFT.RECOVERY
export const driftLive = s => !!(s && s.drift && s.drift.t >= BC_DRIFT.STARTUP && s.drift.t < BC_DRIFT.STARTUP + BC_DRIFT.TRAVEL)
BUSY.push(s => !!s.drift)
export function driftTarget(f, opp, stage) {
  const me = cx(f), w = f.w || 60
  const dir = opp ? (cx(opp) > me ? 1 : cx(opp) < me ? -1 : (f.facing || 1)) : (f.facing || 1)
  const want = opp ? cx(opp) + dir * ((opp.w || 60) / 2 + BC_DRIFT.BEHIND + w / 2) : me + dir * BC_DRIFT.DIST
  const dist = Math.min(Math.abs(want - me), BC_DRIFT.DIST)
  const L = stage ? stage.L : -1e6, R = stage ? stage.R : 1e6
  const x = Math.max(L, Math.min(R - w, me + dir * dist - w / 2))
  return { dir, x, oppCx: opp ? cx(opp) : me + dir * 1e3 }
}
function castDrift(f, s, api) {
  if (!grounded(f) || s.driftCd > 0) return false
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  const c = beginCast(f, s, api, "bcDrift", BC_COST.drift, BC_DRIFT.TOTAL); if (!c) return false
  const tg = driftTarget(f, opp, s.stage)
  s.drift = { t: 0, cast: c.cast, dir: tg.dir, x0: f.x, y0: f.y, tx: tg.x, oppCx: tg.oppCx, want: false, slash: null, done: false }
  s.driftCd = BC_DRIFT.CD; s.stats.drifts = (s.stats.drifts || 0) + 1
  return true
}
CASTS.drift = castDrift
function endDrift(f, s) { delete f._benGlide; f.vx = 0; s.drift = null; f._spriteCastMove = null; f._spriteCastTimer = 0; f._benPowerCommit = 0; f.attackCooldown = 0 }
TICKS.push(function tickDrift(f, s, input, ctx, api) {
  if (s.driftCd > 0) s.driftCd--
  const d = s.drift; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endDrift(f, s); return }                         // an energy hit knocks him out of it
  const travelEnd = BC_DRIFT.STARTUP + BC_DRIFT.TRAVEL
  if (d.t >= BC_DRIFT.STARTUP && d.t < travelEnd) {
    const left = travelEnd - d.t
    f._benGlide = { vx: (d.tx - f.x) / left, vy: 0, minY: d.y0 }                  // the exact cast-time landing, stage-clamped
    if (pressed(input, s)) d.want = true
  } else if (d.t === travelEnd) {
    delete f._benGlide; f.x = Math.max(s.stage.L, Math.min(s.stage.R - (f.w || 60), d.tx)); f.vx = 0
    const me = cx(f); f.facing = d.oppCx > me ? 1 : d.oppCx < me ? -1 : -d.dir     // facing them (their cast-time spot)
  }
  if (d.t >= travelEnd && !d.slash) {
    if (pressed(input, s)) d.want = true
    if (d.want) {                                                                 // WING SLASH (cancel-optional)
      d.slash = { t: 0 }; const tot = BC_DRIFT.SLASH_STARTUP + BC_DRIFT.SLASH_ACTIVE + BC_DRIFT.SLASH_RECOVERY
      f._spriteCastMove = "bcSlash"; f._spriteCastTimer = tot; f.attackCooldown = tot; f._benPowerCommit = tot
    } else if (d.t >= BC_DRIFT.TOTAL) { endDrift(f, s); return }
  }
  if (d.slash) {
    const sl = d.slash; sl.t++
    if (sl.t === BC_DRIFT.SLASH_STARTUP) { const face = f.facing || 1
      hitbox(f, api, "bc_drift_slash", face, { damage: BC_DRIFT.SLASH, spawnX: cx(f) + face * ((f.w || 60) / 2 + BC_DRIFT.SLASH_W / 2 - 10), spawnY: f.y + (f.h || 110) * 0.45,
        w: BC_DRIFT.SLASH_W, h: BC_DRIFT.SLASH_H, lifetime: BC_DRIFT.SLASH_ACTIVE + 1, hitstun: 22, blockstun: blockstunFor(BC_DRIFT.SLASH_RECOVERY, -6),
        knockbackX: 5, knockbackY: -2, alien: { bc: "slash", cast: d.cast } }) }
    if (sl.t >= BC_DRIFT.SLASH_STARTUP + BC_DRIFT.SLASH_ACTIVE + BC_DRIFT.SLASH_RECOVERY) { endDrift(f, s); return }
  } else if (d.t < BC_DRIFT.TOTAL) { f._spriteCastMove = d.t < travelEnd ? "bcDrift" : "idle"; f._spriteCastTimer = 2 }
})
// INTANGIBLE (glide frames only): physical melee and non-energy projectiles pass through — Ghostfreak's tag filter
function evade(f, { move = null, proj = null, attacker = null } = {}) {
  const s = bcState(f); if (!s || !driftLive(s)) return false
  let pass = false
  if (proj) pass = !proj.visualOnly && !isEnergyProjectile(proj) && !proj.isUltimate
  else if (move) pass = !isEnergyMelee(attacker, move) && !move.isUltimate && !["grab", "throw"].includes(move.category)
  if (pass) s.stats.evaded = (s.stats.evaded || 0) + 1
  return pass
}
function phasing(f) { return driftLive(bcState(f)) }                            // no body push: he passes THROUGH them
function bodyAlpha(f) { const s = bcState(f); return driftLive(s) ? 0.45 : 1 }   // render-only

// ── HUD + render-only overlays (read GAME_STATE, never write it) ───────────────────────────────────────────
const HUD = [], FX = []   // render sections, filled below
export function drawBigChillHud(ctx, f, box = {}) { const s = bcState(f); if (!ctx || !s) return; for (const h of HUD) h(ctx, f, s, box) }
export function drawBigChillFx(c, f, frame = 0, opp = null) { const s = bcState(f); if (!c || !s) return; for (const h of FX) h(c, f, s, frame, opp) }

// ── render helpers (render-only) ──────────────────────────────────────────────────────────────────────────────
export const ICE = "#bfefff", ICE2 = "#7dd3fc", DEEP = "#1e3a8a", WING = "#2b4fa8", INK = "#06121c", SNOW = "#f0fbff", GLOW = "#67e8f9"
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const _imgs = {}
function img(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  const im = _imgs[src]; return im.complete && im.naturalWidth ? im : null
}
// one frame of a cut FX strip, integer-scaled, nearest-neighbour; `ax` / `ay` = the anchor inside the frame (0..1)
function fx(c, name, frameI, x, y, k = 2, flip = 1, alpha = 1, ax = 0.5, ay = 0.5) {
  const d = BIGCHILL_FX[name]; const im = d && img(d.sheet); if (!im) return false
  const fi = ((frameI % d.frames) + d.frames) % d.frames
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha; c.translate(Math.round(x), Math.round(y)); c.scale(flip, 1)
  c.drawImage(im, fi * d.w, 0, d.w, d.h, Math.round(-d.w * k * ax), Math.round(-d.h * k * ay), d.w * k, d.h * k); c.restore()
  return true
}
// one of the SHARED ice-folder sprites (Arcticguana's copies), integer-scaled
function iceFx(c, name, x, y, k = 3, alpha = 1) {
  const im = img(BIGCHILL_ICE_FX[name]); if (!im) return false
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha
  c.drawImage(im, Math.round(x - im.naturalWidth * k / 2), Math.round(y - im.naturalHeight * k / 2), im.naturalWidth * k, im.naturalHeight * k); c.restore()
  return true
}
// a procedural pixel ICE COCOON (Big Chill's accent: moth-wing panels in his blue, frost rim, cyan glint) around a box
export function iceCocoon(c, x0, y0, w, h, t, alpha = 1, crack = 0) {
  c.save(); c.globalAlpha *= alpha
  const midx = x0 + w / 2
  c.globalAlpha *= 0.4; c.fillStyle = ICE; c.fillRect(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h)); c.globalAlpha /= 0.4
  for (let k = 0; k < 2; k++) {                                         // two folded wing panels wrapping the shell
    const sx = k ? 1 : -1
    for (let y = 0; y < h; y += 4) { const bulge = Math.sin(Math.PI * y / h) * w * 0.18, ex = midx + sx * (w / 2 + bulge)
      c.fillStyle = (y >> 2) % 3 ? WING : DEEP; c.fillRect(Math.round(Math.min(ex, ex - sx * 6)), Math.round(y0 + y), 6, 4) }
  }
  c.fillStyle = ICE2; c.fillRect(Math.round(x0), Math.round(y0), Math.round(w), 3); c.fillRect(Math.round(x0), Math.round(y0 + h - 3), Math.round(w), 3)
  c.fillStyle = SNOW; for (let k = 0; k < 4; k++) px(c, x0 + 8 + k * 6, y0 + 8 + k * 6, 3)
  c.fillStyle = (t >> 3) % 2 ? GLOW : SNOW; px(c, midx + w * 0.22, y0 + h * 0.22, 4)
  if (crack > 0) { c.fillStyle = INK; for (let k = 0; k < Math.round(6 * crack); k++) px(c, x0 + w * (0.2 + 0.1 * k), y0 + h * (0.3 + 0.08 * ((k * 3) % 5)), 2) }
  c.restore()
}
// CHILL pips over the opponent + the frozen shell + the shatter (shared fx shards + the ice folder's burst / spray)
FX.push(function drawChill(c, f, s, frame, opp) {
  if (!opp) return
  const ch = s.chill, ox = cx(opp), top = opp.y - 14
  if (ch.pips > 0) for (let i = 0; i < AG_CHILL.MAX; i++) {
    const x = ox + (i - 1) * 12
    c.fillStyle = INK; px(c, x, top, 8); c.fillStyle = i < ch.pips ? ICE : "#334155"; px(c, x, top, 5); if (i < ch.pips) { c.fillStyle = WING; px(c, x + 1, top + 1, 2) }
  }
  const z = ch.frozen
  if (z) { const w = (opp.w || 60) + 18, h = (opp.h || 110) + 10, left = Math.max(0, z.until - z.t)
    iceCocoon(c, ox - w / 2, opp.y - 6, w, h, s.t, 1, left < 8 ? 1 - left / 8 : 0) }
  if (s.t - ch.shatterT < 16) {
    const k = (s.t - ch.shatterT) / 16, cy = opp.y + (opp.h || 110) * 0.5
    iceFx(c, "burst2", ox, opp.y + (opp.h || 110) * 0.4, 3, 1 - k); iceFx(c, "spray", ox + 20, opp.y + (opp.h || 110) * 0.6, 3, 1 - k)
    for (let a = 0; a < 8; a++) fx(c, "shard", a, ox + Math.cos(a * 0.785) * 90 * k, cy + Math.sin(a * 0.785) * 70 * k, 2, Math.cos(a * 0.785) < 0 ? -1 : 1, 1 - k)
  }
})
