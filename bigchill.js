// bigchill.js — BIG CHILL (Necrofriggian), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf-style module: imports its generated art table and (from Phase 3 on) the shared modules it REUSES — flight.js, the
// Arcticguana ice status (Chill → Popsicle → Shatter) and Ghostfreak's intangibility tag tests. The engine reaches it only
// through the generic, ben10-gated ready-form hooks (see docs/ben10/ADD_ALIEN.md), which hand it an `api`.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (frost mist,
// shards, ice overlays, the ice cocoon shell, shake) never write it. Simulation randomness: hash(match seed, frame, player).
// Sheet: docs/ben10/aliens/bigchill/SPRITE_LEDGER.md.
import { BIGCHILL_ANIM, BIGCHILL_GEOM, BIGCHILL_FX, BIGCHILL_ICE_FX } from "./bigchillAssets.js"
import { flightTakeoff, isFlying, FLIGHT_PHASE, flightKnockedDown } from "./flight.js"   // reused (Ghostfreak / Alien X / Jetray do the same)
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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact,
  drawHud: drawBigChillHud, drawFx: drawBigChillFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBigChillState() {
  return { kind: BC_KEY, t: 0, frame: 0, seed: 1, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false, spHeld: false,
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
  s.noAttack = busy(s)
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

// ── HUD + render-only overlays (read GAME_STATE, never write it) ───────────────────────────────────────────
const HUD = [], FX = []   // render sections, filled below
export function drawBigChillHud(ctx, f, box = {}) { const s = bcState(f); if (!ctx || !s) return; for (const h of HUD) h(ctx, f, s, box) }
export function drawBigChillFx(c, f, frame = 0, opp = null) { const s = bcState(f); if (!c || !s) return; for (const h of FX) h(c, f, s, frame, opp) }
