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
import { AG_CHILL, addChill, endPopsicle, shatterPopsicle, tickChill, frozen, iceImmune, startIceImmunity } from "./arcticguana.js"   // the SHARED ice status (rules + numbers reused, never re-implemented)
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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, evade, phasing, bodyAlpha, damageTaken, targetOffset,
  drawHud: drawBigChillHud, drawFx: drawBigChillFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBigChillState() {
  return { kind: BC_KEY, t: 0, frame: 0, seed: 1, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false, spHeld: false,
    drift: null, driftCd: 0, breath: null, wing: null, spire: null, cocoon: null, cocoonCd: 0, dive: null, ult: null, lastUlt: null,
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

// ── 6. SPECIALS ─────────────────────────────────────────────────────────────────────────────────────────────
const mouth = f => ({ x: cx(f) + (f.facing || 1) * (f.w || 60) * 0.35, y: f.y + (f.h || 110) * 0.32 })

// 1. FREEZE BREATH (↓↘→ + P, cost 10): a 280 px cone from the mouth, 14f startup, 4 ticks of 10 (6f apart) = 40, −12 on
// block, one at a time, +1 Chill per cast. A tick never fires at a FROZEN opponent (so the cast that delivers the 3rd pip
// does not thaw its own freeze; Ice Spire's later spires likewise) — the shared rule "any other damage ends it" is unchanged. HOLD P through the last tick to extend it up to 20f (+4 Power once; a tick every
// 6f while held). Extracted art: atk_AAA (the ice blast at the mouth) + the sheet's shard / particle FX.
export const BC_BREATH = { STARTUP: 14, TICKS: 4, GAP: 6, DMG: 10, RANGE: 280, H: 70, RECOVERY: 20, ON_BLOCK: -12, HOLD_MAX: 20, HOLD_COST: 4 }
BC_BREATH.LAST = BC_BREATH.STARTUP + (BC_BREATH.TICKS - 1) * BC_BREATH.GAP
BC_BREATH.TOTAL = BC_BREATH.LAST + 2 + BC_BREATH.RECOVERY
BUSY.push(s => !!s.breath)
function castBreath(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "bcBreath", BC_COST.breath, BC_BREATH.TOTAL); if (!c) return false
  s.breath = { t: 0, cast: c.cast, face: f.facing || 1, ext: 0, held: false, ticks: 0 }; s.stats.breaths = (s.stats.breaths || 0) + 1
  return true
}
CASTS.breath = castBreath
function breathTick(f, s, api, b, total) {
  if (frozen(s)) return                                     // the cast that froze them washes over the shell (no hit)
  const m = mouth(f)
  hitbox(f, api, "bc_breath", b.face, { damage: BC_BREATH.DMG, spawnX: m.x + b.face * BC_BREATH.RANGE / 2, spawnY: m.y, w: BC_BREATH.RANGE, h: BC_BREATH.H,
    lifetime: 2, hitstun: 14, blockstun: blockstunFor(total - b.t, BC_BREATH.ON_BLOCK), knockbackX: 0.5, knockbackY: 0,
    alien: { bc: "breath", chill: 1, cast: b.cast } })
  b.ticks++
}
TICKS.push(function tickBreath(f, s, input, ctx, api) {
  const b = s.breath; if (!b) return
  b.t++
  if ((f.hitstun || 0) > 0) { s.breath = null; return }
  const total = BC_BREATH.TOTAL + b.ext
  if (b.t === BC_BREATH.LAST && input.special && !b.held && api && api.spendEnergy(f, BC_BREATH.HOLD_COST)) b.held = true   // the hold (+4 once)
  if (b.held && b.t > BC_BREATH.LAST && b.ext < BC_BREATH.HOLD_MAX) {
    if (input.special) { b.ext++; f._benPowerCommit = Math.max(f._benPowerCommit || 0, total + 1 - b.t); f.attackCooldown = f._benPowerCommit }
    else b.held = false
  }
  const lastTick = BC_BREATH.LAST + b.ext
  if (b.t >= BC_BREATH.STARTUP && b.t <= lastTick && (b.t - BC_BREATH.STARTUP) % BC_BREATH.GAP === 0) breathTick(f, s, api, b, BC_BREATH.TOTAL + b.ext)
  f._spriteCastMove = b.t > BC_BREATH.STARTUP && b.t <= lastTick + 2 && b.held ? "bcBreathHold" : "bcBreath"; f._spriteCastTimer = Math.max(2, BC_BREATH.TOTAL + b.ext - b.t)
  if (b.t >= BC_BREATH.TOTAL + b.ext) s.breath = null
})

// 2. FROST WING CUT (↓↙← + P, cost 12): wings spread (atk_jump_S), an ice crescent blade (the sheet's shard art) flies 420 px:
// 2 hits 18 / 22 = 40 (a second blade 6f behind the first on the same path), 18f startup, −11 on block, one on screen,
// +1 Chill, SHATTERS a frozen target.
export const BC_WING = { STARTUP: 18, SPEED: 14, RANGE: 420, DMG: [18, 22], GAP: 6, RECOVERY: 22, ON_BLOCK: -11, W: 60, H: 70 }
BC_WING.LIFE = Math.round(BC_WING.RANGE / BC_WING.SPEED)
BC_WING.TOTAL = BC_WING.STARTUP + BC_WING.GAP + BC_WING.RECOVERY
BUSY.push(s => !!s.wing)
export const wingOnScreen = (f, list) => !!(list && list.some(p => p && p.owner === f && p.alien && p.alien.bc === "wingcut" && (p.lifetime == null || p.lifetime > 0)))
function castWing(f, s, api) {
  if (!grounded(f) || wingOnScreen(f, api && api.activeProjectiles ? api.activeProjectiles() : projRef)) return false   // one on screen
  const c = beginCast(f, s, api, "bcWingCut", BC_COST.wingcut, BC_WING.TOTAL); if (!c) return false
  s.wing = { t: 0, cast: c.cast, face: f.facing || 1, x0: cx(f) + (f.facing || 1) * (f.w || 60) * 0.5, y0: f.y + (f.h || 110) * 0.4 }
  s.stats.wings = (s.stats.wings || 0) + 1
  return true
}
CASTS.wingcut = castWing
TICKS.push(function tickWing(f, s, input, ctx, api) {
  const w = s.wing; if (!w) return
  w.t++
  if ((f.hitstun || 0) > 0 && w.t < BC_WING.STARTUP) { s.wing = null; return }
  for (let k = 0; k < 2; k++) if (w.t === BC_WING.STARTUP + k * BC_WING.GAP)
    hitbox(f, api, "bc_wingcut", w.face, { damage: BC_WING.DMG[k], spawnX: w.x0, spawnY: w.y0, vx: w.face * BC_WING.SPEED, w: BC_WING.W, h: BC_WING.H,
      lifetime: BC_WING.LIFE, hitstun: 18, blockstun: blockstunFor(BC_WING.TOTAL - w.t, BC_WING.ON_BLOCK), knockbackX: 2, knockbackY: k ? -2 : 0,
      alien: { bc: "wingcut", k, chill: 1, shatter: true, cast: w.cast } })
  f._spriteCastMove = "bcWingCut"; f._spriteCastTimer = Math.max(2, BC_WING.TOTAL - w.t)
  if (w.t >= BC_WING.TOTAL) s.wing = null
})

// 3. ICE SPIRE (→↓↘ + P, cost 14): a claw on the ground (atk_AS), then spires erupt forward at 80 / 160 / 240 / 320 px, 6f
// apart: 4 hits of 12 = 48, the last pops the opponent up, −14 on block, +1 Chill. Spires are HITBOXES ONLY (never solid —
// projectiles have no body), each lives 60f (consumed when it hits). The extracted spire art (fx:spire) is drawn there.
export const BC_SPIRE = { STARTUP: 16, AT: [80, 160, 240, 320], GAP: 6, DMG: 12, LIFE: 60, W: 44, H: 100, RECOVERY: 18, ON_BLOCK: -14, POP: -14 }
BC_SPIRE.TOTAL = BC_SPIRE.STARTUP + (BC_SPIRE.AT.length - 1) * BC_SPIRE.GAP + BC_SPIRE.RECOVERY
BUSY.push(s => !!(s.spire && s.spire.t < BC_SPIRE.TOTAL))
function castSpire(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "bcSpire", BC_COST.spire, BC_SPIRE.TOTAL); if (!c) return false
  s.spire = { t: 0, cast: c.cast, face: f.facing || 1, x0: cx(f), floor: f.y + (f.h || 110), spawned: [] }; s.stats.spires = (s.stats.spires || 0) + 1
  return true
}
CASTS.spire = castSpire
TICKS.push(function tickSpire(f, s, input, ctx, api) {
  const sp = s.spire; if (!sp) return
  sp.t++
  const n = BC_SPIRE.AT.length
  for (let k = 0; k < n; k++) if (sp.t === BC_SPIRE.STARTUP + k * BC_SPIRE.GAP) {
    const x = sp.x0 + sp.face * BC_SPIRE.AT[k], last = k === n - 1
    sp.spawned.push({ x, t: s.t })                                               // the form clock (the render reads s.t - t)
    if (frozen(s)) continue                                                       // the cast that froze them: later spires are art only
    hitbox(f, api, "bc_spire", sp.face, { damage: BC_SPIRE.DMG, spawnX: x, spawnY: sp.floor - BC_SPIRE.H / 2, w: BC_SPIRE.W, h: BC_SPIRE.H, lifetime: BC_SPIRE.LIFE,
      hitstun: last ? 30 : 18, blockstun: blockstunFor(Math.max(0, BC_SPIRE.TOTAL - sp.t), BC_SPIRE.ON_BLOCK), knockbackX: last ? 2 : 0.5, knockbackY: last ? BC_SPIRE.POP : 0,
      launcher: last, alien: { bc: "spire", k, chill: 1, cast: sp.cast } })
  }
  if (sp.t < BC_SPIRE.TOTAL) { f._spriteCastMove = "bcSpire"; f._spriteCastTimer = Math.max(2, BC_SPIRE.TOTAL - sp.t) }
  if (sp.t >= BC_SPIRE.STARTUP + (n - 1) * BC_SPIRE.GAP + BC_SPIRE.LIFE) s.spire = null   // the last spire's 60f are over (render record)
})

// 4. COCOON (←↙↓ + P, cost 12, 7 s cooldown): the closed-wing cocoon (idle2block → block_idle). A 14f guard window from
// the cast: the first PHYSICAL melee or projectile hit landing in it takes 40 % and bursts the wings open — a radial
// 120 px ice burst, 30 once, +1 Chill. Beams, throws / grabs and unblockables ignore it (full damage, no burst). No other
// armor (the hit's own hitstun still applies). No hit → it ends in 20f of punishable recovery.
export const BC_COCOON = { WINDOW: 14, RECOVERY: 20, TAKE: 0.4, BURST_R: 120, BURST: 30, CD: 420, BURST_POSE: 12 }
BC_COCOON.TOTAL = BC_COCOON.WINDOW + BC_COCOON.RECOVERY
BUSY.push(s => !!s.cocoon)
export const cocoonLive = s => !!(s && s.cocoon && s.cocoon.state === "guard" && s.cocoon.t <= BC_COCOON.WINDOW)
function castCocoon(f, s, api) {
  if (!grounded(f) || s.cocoonCd > 0) return false
  const c = beginCast(f, s, api, "bcCocoon", BC_COST.cocoon, BC_COCOON.TOTAL); if (!c) return false
  s.cocoon = { t: 0, cast: c.cast, state: "guard", burst: false, burstT: -1, taken: 0 }; s.cocoonCd = BC_COCOON.CD; s.stats.cocoons = (s.stats.cocoons || 0) + 1
  return true
}
CASTS.cocoon = castCocoon
const BEAM_RE = /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i
const sourceProj = opts => (opts.source === "projectile" && projRef) ? projRef.find(p => p && p.owner === opts.attacker && p.name === opts.move) || null : null
export function ignoresCocoon(opts) {
  if (!opts) return true
  if (opts.source !== "melee" && opts.source !== "projectile") return true                       // chip / status / ability ticks
  if (opts.unblockable || BEAM_RE.test(String(opts.move || ""))) return true
  const p = sourceProj(opts); if (p && (p.beam || p.isBeam || p.laser || p.unblockable || BEAM_RE.test(String(p.name || "")))) return true
  const a = opts.source === "melee" && opts.attacker && opts.attacker.currentAttack
  if (a && (a.beam || a.isBeam || a.unblockable || a.isUnblockable || ["grab", "throw"].includes(a.category) || /grab|throw/i.test(String(a.name || "")))) return true
  return false
}
// damageTaken hook (combat.applyScaledDamage): the cocoon's 40 %
function damageTaken(f, raw, opts) {
  const s = bcState(f); if (!s || !(raw > 0) || !cocoonLive(s) || s.cocoon.burst || f.isBlocking || ignoresCocoon(opts || {})) return raw
  s.cocoon.burst = true; s.cocoon.taken = raw * BC_COCOON.TAKE
  return raw * BC_COCOON.TAKE
}
TICKS.push(function tickCocoon(f, s, input, ctx, api) {
  if (s.cocoonCd > 0) s.cocoonCd--
  const c = s.cocoon; if (!c) return
  c.t++
  if (c.state === "guard" && c.burst) {                                          // BURST: the wings fling open, once
    c.state = "burst"; c.burstT = c.t; s.stats.bursts = (s.stats.bursts || 0) + 1
    hitbox(f, api, "bc_cocoon_burst", f.facing || 1, { damage: BC_COCOON.BURST, spawnX: cx(f), spawnY: f.y + (f.h || 110) / 2, radius: BC_COCOON.BURST_R, radial: true,
      rectHitbox: false, w: BC_COCOON.BURST_R * 2, h: BC_COCOON.BURST_R * 2, hitstun: 18, blockstun: 10, knockbackX: 6, knockbackY: -3,
      alien: { bc: "burst", chill: 1, cast: c.cast } })
    f._benPowerCommit = BC_COCOON.BURST_POSE; f.attackCooldown = BC_COCOON.BURST_POSE
  }
  if (c.state === "burst") { f._spriteCastMove = "bcBurst"; f._spriteCastTimer = 2; if (c.t - c.burstT >= BC_COCOON.BURST_POSE) s.cocoon = null; return }
  f._spriteCastMove = c.t <= BC_COCOON.WINDOW ? "bcCocoon" : "guard"; f._spriteCastTimer = 2
  if (c.t >= BC_COCOON.TOTAL) s.cocoon = null                                     // no hit: the 20f punishable recovery is over
})

// 6. DIVING CHILL (air ↓ + P, cost 12): a diagonal dive (atk_jump_A2 with its icicle trail — cosmetic), 50, +1 Chill, once
// per airtime, never refills jumps. Ends on landing (14f recovery) or after 40f.
export const BC_DIVE = { STARTUP: 6, VX: 8, VY: 11, MAX: 40, DMG: 50, W: 70, H: 90, LAND: 14, ON_BLOCK: -8 }
BUSY.push(s => !!s.dive)
function castDive(f, s, api) {
  if (grounded(f) || s.diveUsed) return false
  const c = beginCast(f, s, api, "bcDive", BC_COST.dive, BC_DIVE.STARTUP + BC_DIVE.MAX + BC_DIVE.LAND); if (!c) return false
  s.dive = { t: 0, cast: c.cast, face: f.facing || 1, hit: false, landT: -1, prevY: f.y }; s.diveUsed = true; s.stats.dives = (s.stats.dives || 0) + 1
  if (f._flightCtl && isFlying(f)) { f._flightCtl.phase = FLIGHT_PHASE.GROUNDED; f._flightCtl.wantDescend = false }
  return true
}
CASTS.dive = castDive
TICKS.push(function tickDive(f, s, input, ctx, api) {
  const d = s.dive; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.dive = null; return }
  if (d.landT >= 0) { delete f._benGlide; f._spriteCastMove = "crouch"; f._spriteCastTimer = 2
    if (d.t - d.landT >= BC_DIVE.LAND) { s.dive = null; f._benPowerCommit = 0; f.attackCooldown = 0 } return }
  if (d.t < BC_DIVE.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; f._spriteCastMove = "bcDive"; f._spriteCastTimer = 2; return }
  const live = d.t - BC_DIVE.STARTUP
  if (live > 0 && f.y <= d.prevY + 1e-6) {                                         // the glide could not descend: landed (floor clamp)
    d.landT = d.t; delete f._benGlide; f.vy = 0; f.onGround = f.grounded = true
    f._benPowerCommit = BC_DIVE.LAND; f.attackCooldown = BC_DIVE.LAND; return }
  if (live >= BC_DIVE.MAX) { delete f._benGlide; s.dive = null; f._benPowerCommit = 0; f.attackCooldown = 0; return }
  d.prevY = f.y
  f._benGlide = { vx: d.face * BC_DIVE.VX, vy: BC_DIVE.VY }
  if (!d.hit) hitbox(f, api, "bc_dive", d.face, { damage: BC_DIVE.DMG, spawnX: cx(f) + d.face * 10, spawnY: f.y + (f.h || 110) * 0.6, w: BC_DIVE.W, h: BC_DIVE.H,
    lifetime: 2, hitstun: 22, blockstun: blockstunFor(BC_DIVE.LAND, BC_DIVE.ON_BLOCK), knockbackX: 4, knockbackY: -3, alien: { bc: "dive", chill: 1, cast: d.cast } })
  f._spriteCastMove = "bcDive"; f._spriteCastTimer = 2
})
CONTACT.push((f, s, target, { proj }) => { const tag = proj && proj.alien; if (tag && tag.bc === "dive" && s.dive && s.dive.cast === tag.cast) s.dive.hit = true })

// ── ULTIMATE: FROZEN SKY (cost 55, the Omnitrix Overload input) ─────────────────────────────────────────────────────
// A clean OPENER (a Freeze Breath-style breath, 40, 16f startup) is required: whiff / block = no cinematic, 60f recovery.
// On a clean hit (the existing capture pattern: both held, positions stored): 1. he lifts them in his claws and wraps them
// in a giant procedural ice cocoon (render-only lift via targetOffset; the stage never changes); 2. WINTER STORM: 3
// wing-and-breath bursts of 25 = 75 from angles chosen by hash(seed, frame, player index) (stored as plain numbers);
// 3. COCOON BURST: he dives away and the cocoon shatters in a pixel shard ring: 125. Total 240 unscaled (40 + 75 + 125);
// the passive Shatter bonus never adds (a frozen target is simply thawed by the opener, no bonus). The opponent is released
// UNFROZEN with the shared 420f immunity started; positions restore; 100f recovery lockout. Effects have no hitboxes.
export const BC_ULT = { OPENER: 40, OPENER_AT: 16, RANGE: 280, H: 80, WHIFF: 60, LIFT: 30, STORM_AT: [40, 60, 80], STORM: 25, BURST_AT: 110, BURST: 125, END: 120, LOCKOUT: 100 }
BUSY.push(s => !!s.ult)
ULT = function castUlt(f, s, api) {
  if (!canAct(f, s)) return false
  if (!api || !api.spendEnergy(f, BC_COST.ultimate)) return false
  s.castId++
  const face = f.facing || 1, total = BC_ULT.OPENER_AT + 3 + BC_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "bcBreath"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, cast: s.castId, raw: 0, hits: [], angles: null }
  s.stats.ults = (s.stats.ults || 0) + 1
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  return true
}
TICKS.push(function tickUlt(f, s, input, ctx, api, opp) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") {
    u.t++
    if (u.t === BC_ULT.OPENER_AT) { const m = mouth(f)
      hitbox(f, api, "bc_ult_open", u.face, { damage: BC_ULT.OPENER, spawnX: m.x + u.face * BC_ULT.RANGE / 2, spawnY: m.y, w: BC_ULT.RANGE, h: BC_ULT.H,
        lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { bc: "ultOpen", cast: u.cast } }) }
    if (u.t > BC_ULT.OPENER_AT + 3 + BC_ULT.WHIFF) s.ult = null                     // whiff / block: no cinematic
    return
  }
  if (!opp || opp.eliminated || !(opp.health > 0)) { endUlt(f, s, opp, api); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "bc_frozen_sky", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 8) }
  if (u.t < BC_ULT.LIFT) { u.phase = "lift"; f._spriteCastMove = "bcOpen" }
  else if (u.t < BC_ULT.BURST_AT - 10) { u.phase = "storm"; f._spriteCastMove = "bcStorm"
    const k = BC_ULT.STORM_AT.indexOf(u.t); if (k >= 0) hit(BC_ULT.STORM, 4 + k * 2) }
  else if (u.t < BC_ULT.END) { u.phase = "burst"; f._spriteCastMove = "bcDive"; if (u.t === BC_ULT.BURST_AT) hit(BC_ULT.BURST, 18) }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
})
export function ultAngles(seed, frame, player) { return [0, 1, 2].map(k => Math.round(bcHash(seed, frame, player, 31 + k) * 3600) / 10) }   // degrees, plain numbers
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "lift"; u.t = 0; u.raw = BC_ULT.OPENER; u.hits.push(BC_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  u.angles = ultAngles(s.seed, s.frame, pIndex(f))
  f.attackCooldown = BC_ULT.END + BC_ULT.LOCKOUT; f._benPowerCommit = BC_ULT.END; f._spriteCastTimer = BC_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, BC_ULT.END + 2)                 // cinematic only (the opponent is held)
}
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }        // positions restore
  if (opp && u?.thome) {
    opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = (cx(opp) >= cx(f) ? 1 : -1) * 3; opp.vy = -6
    opp.onGround = false; opp.grounded = false; opp.isLaunched = true
    if (frozen(s)) endPopsicle(f, s, opp, "ult")                                  // released UNFROZEN
    s.chill.pips = 0; s.chill.immuneT = AG_CHILL.IMMUNE; startIceImmunity(s, opp)  // the shared 420f immunity starts
  }
  s.lastUlt = u ? { raw: u.raw, hits: u.hits.slice(), angles: u.angles } : null
  s.ult = null
  f.attackCooldown = BC_ULT.LOCKOUT; f._benPowerCommit = BC_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
CONTACT.push((f, s, target, { proj, blocked }) => {
  const tag = proj && proj.alien
  if (tag && tag.bc === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
})
// render-only: the held opponent is lifted in his claws (the stage and both sim positions never change)
function targetOffset(f, target) {
  const s = bcState(f); const u = s && s.ult; if (!u || !u.thome || u.phase === "opener") return null
  const lift = u.phase === "burst" ? Math.max(0, 1 - (u.t - (BC_ULT.BURST_AT - 10)) / 10) : Math.min(1, u.t / BC_ULT.LIFT)
  return { dx: 0, dy: -Math.round(lift * 70) }
}

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

// HUD (under the Omnitrix Power bar): COCOON + DRIFT cooldowns, the flight budget, Chill on the opponent
HUD.push(function hud(ctx, f, s, { x = 0, enY = 0, enH = 8, pbw, flip } = {}) {
  const w = Math.min(120, pbw || 120), h = 4, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  const bars = [
    ["COCOON", s.cocoonCd > 0 ? 1 - s.cocoonCd / BC_COCOON.CD : 1, s.cocoonCd > 0 ? `${Math.ceil(s.cocoonCd / 60)}s` : (cocoonLive(s) ? "UP" : "READY"), ICE2],
    ["DRIFT", s.driftCd > 0 ? 1 - s.driftCd / BC_DRIFT.CD : 1, s.driftCd > 0 ? `${Math.ceil(s.driftCd / 60)}s` : (driftLive(s) ? "PHASED" : "READY"), GLOW],
    ["WINGS", 1 - Math.min(1, s.flightUsed / BC_FLIGHT.MAX), `${Math.max(0, BC_FLIGHT.MAX - s.flightUsed)}f`, WING]
  ]
  ctx.save(); ctx.font = "bold 7px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  bars.forEach(([name, k, label, col], i) => {
    const y = enY + enH + 3 + i * 12
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
    const fw = Math.round(w * Math.max(0, Math.min(1, k))); ctx.fillStyle = k >= 1 ? col : "#475569"; ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
    ctx.fillStyle = ICE; ctx.fillText(`${name} · ${label}`, flip ? bx + w : bx, y + h + 1)
  })
  ctx.restore()
})

// specials + ult overlays (render-only)
FX.push(function drawMoves(c, f, s, frame, opp) {
  const h = f.h || 110, bx = cx(f), face = f.facing || 1
  const b = s.breath
  if (b && b.t >= BC_BREATH.STARTUP - 2 && b.t <= BC_BREATH.LAST + b.ext + 3) {          // FREEZE BREATH cone: shards + frost pixels
    const m = mouth(f), R = BC_BREATH.RANGE * Math.min(1, (b.t - BC_BREATH.STARTUP + 3) / 5)
    c.save(); c.globalAlpha = 0.32; c.fillStyle = ICE; c.beginPath(); c.moveTo(m.x, m.y - 6); c.lineTo(m.x + b.face * R, m.y - BC_BREATH.H / 2)
    c.lineTo(m.x + b.face * R, m.y + BC_BREATH.H / 2); c.lineTo(m.x, m.y + 6); c.closePath(); c.fill(); c.restore()
    for (let i = 0; i < 14; i++) { const d = ((i * 37 + b.t * 9) % 100) / 100 * R, spread = d / BC_BREATH.RANGE * BC_BREATH.H * 0.5
      const y = m.y + (((i * 53) % 21) - 10) / 10 * spread
      c.fillStyle = i % 3 ? ICE : SNOW; px(c, m.x + b.face * d, y, i % 2 ? 4 : 3) }
    for (let i = 0; i < 3; i++) fx(c, "proj", 0, m.x + b.face * R * (0.3 + 0.3 * i), m.y + (i - 1) * 8, 2, b.face, 0.9)
    fx(c, "particle", b.t >> 2, m.x + b.face * 6, m.y, 1, b.face, 0.8)
  }
  if (projRef) for (const p of projRef) {                                                   // FROST WING CUT blades
    if (!p || p.owner !== f || !p.alien || p.alien.bc !== "wingcut") continue
    const pf = (p.vx || 0) >= 0 ? 1 : -1
    iceFx(c, "arc", p.x - pf * 18, p.y, 2, 0.5)
    if (!fx(c, "shard", 0, p.x, p.y, 3, pf)) { c.fillStyle = ICE; px(c, p.x, p.y, 20) }
  }
  const sp = s.spire
  if (sp) for (const e of sp.spawned) {                                                    // ICE SPIRES (the extracted spire strip)
    const age = s.t - e.t; if (age < 0 || age >= BC_SPIRE.LIFE) continue
    const n = BIGCHILL_FX.spire ? BIGCHILL_FX.spire.frames : 1   // the sheet's own timing: grow fast, stand, crumble at the end
    const fi = Math.min(n - 1, age < 3 ? 0 : age < 6 ? 1 : age < BC_SPIRE.LIFE - 12 ? 2 + ((age >> 3) % Math.max(1, n - 4)) : n - 2 + (age >= BC_SPIRE.LIFE - 6 ? 1 : 0))
    if (!fx(c, "spire", fi, e.x, sp.floor, 2, sp.face, 1, 0.5, 1)) { c.fillStyle = ICE2; c.fillRect(Math.round(e.x - 12), Math.round(sp.floor - 90), 24, 90) }
  }
  const co = s.cocoon
  if (co && co.state === "guard" && co.t <= BC_COCOON.WINDOW) {                           // COCOON: frost ring on the wrapped wings
    c.fillStyle = (co.t >> 1) % 2 ? ICE : GLOW
    for (let k = 0; k < 10; k++) { const a = k * 0.628 + co.t * 0.15; px(c, bx + Math.cos(a) * (f.w || 58) * 0.8, f.y + h * 0.5 + Math.sin(a) * h * 0.45, 3) }
  }
  if (co && co.state === "burst") {                                                       // COCOON burst: ice-folder burst + shard ring
    const k = Math.min(1, (co.t - co.burstT) / 10)
    iceFx(c, "burst", bx, f.y + h * 0.45, 3, 1 - k)
    for (let a = 0; a < 8; a++) fx(c, "shard", a, bx + Math.cos(a * 0.785) * BC_COCOON.BURST_R * k, f.y + h / 2 + Math.sin(a * 0.785) * BC_COCOON.BURST_R * 0.7 * k, 2, Math.cos(a * 0.785) < 0 ? -1 : 1, 1 - k)
  }
  const d = s.drift
  if (d && driftLive(s)) {                                                                 // PHASE DRIFT: frost mist streak behind him
    c.save(); c.globalAlpha = 0.6
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? ICE2 : WING; px(c, bx - d.dir * (12 + i * 14), f.y + h * (0.25 + ((i * 7) % 10) / 16), 4) }
    c.restore()
  }
  const dv = s.dive
  if (dv && dv.landT < 0 && dv.t >= BC_DIVE.STARTUP) {                                    // DIVING CHILL: icicle trail (cosmetic)
    for (let i = 1; i <= 6; i++) { c.fillStyle = i % 2 ? ICE : SNOW; px(c, bx - dv.face * BC_DIVE.VX * i * 1.4, f.y + h * 0.6 - BC_DIVE.VY * i * 1.4, 5 - (i >> 1)) }
  }
  if (dv && dv.landT >= 0 && dv.t - dv.landT < 12) iceFx(c, "splash", bx, f.y + h - 6, 2, 1 - (dv.t - dv.landT) / 12)
  const u = s.ult
  if (u && u.phase !== "opener" && opp) {                                                  // FROZEN SKY: the giant ice cocoon + storm + burst
    const off = targetOffset(f, opp) || { dx: 0, dy: 0 }, ox = cx(opp), oy = opp.y + off.dy, w = (opp.w || 60) + 50, hh = (opp.h || 110) + 40
    if (u.phase !== "burst" || u.t < BC_ULT.BURST_AT) iceCocoon(c, ox - w / 2, oy - 20, w, hh, u.t, Math.min(1, u.t / 10), u.phase === "burst" ? (u.t - (BC_ULT.BURST_AT - 10)) / 10 : 0)
    if (u.phase === "storm" && u.angles) BC_ULT.STORM_AT.forEach((at, i) => {
      const age = u.t - at; if (age < -10 || age > 8) return
      const a = u.angles[i] * Math.PI / 180, r = 160 * (1 - Math.max(0, Math.min(1, (age + 10) / 10)))
      for (let j = 0; j < 4; j++) fx(c, "shard", i + j, ox + Math.cos(a) * (r + j * 18), oy + hh / 2 + Math.sin(a) * (r + j * 18), 2, Math.cos(a) < 0 ? 1 : -1)
      if (age >= 0 && age < 6) iceFx(c, "burst2", ox, oy + hh / 2, 2, 1 - age / 6)
    })
    if (u.phase === "burst" && u.t >= BC_ULT.BURST_AT) {
      const k = Math.min(1, (u.t - BC_ULT.BURST_AT) / 10)
      for (let a = 0; a < 16; a++) { const ang = a * 0.3927; c.fillStyle = a % 2 ? ICE : SNOW; px(c, ox + Math.cos(ang) * 150 * k, oy + hh / 2 + Math.sin(ang) * 120 * k, 6 - Math.floor(k * 3)) }
      iceFx(c, "burst", ox, oy + hh / 2, 4, 1 - k)
    }
  }
})
