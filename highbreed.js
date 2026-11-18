// highbreed.js — HIGHBREED, a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// NOTE: in canon Ben never transforms into a Highbreed (a hostile race he fights); the owner explicitly asked for him as a
// playable Omnitrix form, so he is built exactly as instructed.
// Leaf module: imports only its generated art table + flight.js (the shared flight controller). The engine reaches it only
// through the generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial /
// fireUltimate — see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// The sheet drew a different attack per MOVEMENT STATE (walking / running / flying), so his normals and specials pick their
// strip with the MOVE-SET SELECTOR (formState.moveState → formState.moveAnim, read by sprite.js); the input mapping never
// changes. All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (mutation
// glow, DNA strand, purge beam, wing trail, shake) never write it. Simulation randomness: hash(match seed, frame, player index).
// Ripped by: Eeveeloverthespriter8 — docs/ben10/aliens/highbreed/SPRITE_LEDGER.md.
import { HIGHBREED_ANIM, HIGHBREED_GEOM } from "./highbreedAssets.js"
import { flightTakeoff, isFlying, FLIGHT_PHASE, flightKnockedDown } from "./flight.js"
export { HIGHBREED_ANIM, HIGHBREED_GEOM }

export const HB_KEY = "highbreed"
const ANIM = { ...HIGHBREED_ANIM, takeoff: HIGHBREED_ANIM.jump }   // flight.js maps its take-off pose to `takeoff`

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const HIGHBREED = {
  id: HB_KEY, poolKey: HB_KEY, displayName: "Highbreed", slot: 23,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Water Hazard (22)
  status: "ready", sheetPath: "./ben10_highbreed_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/highbreed/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.10, defense: 1.05, weight: 1.10 },
  movement: "flight", maxJumps: 2,              // the shared double jump; flight never refills it
  flightProfile: "highbreed",                   // flight.js FLIGHT_PROFILES.highbreed (the per-alien flight profile hook)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Rending Claws", special2: "Talon Dive", special3: "Genetic Lance", special4: "Wing Slash",
    passive: "Mutation Surge", taunt: "Dialogue Taunt", ultimate: "Genetic Purge" },
  basic_attacks: {
    light:  normal(18, 5, 3, 9, 0, { rangeX: 90 }),                                              // Attack 1 (walking / running / flying row by state)
    heavy:  normal(54, 14, 4, 22, -6, { knockbackX: 6, rangeX: 170 }),                          // Attack 2 (per-state row), 170 px
    down:   normal(24, 7, 3, 14, -4, { hitLevel: "low", rangeX: 120 }),                         // Hurt (walking) crouch frames reversed, hits low
    up:     normal(46, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 100 }),   // Attack 1 (running): an anti-air lunge
    air:    normal(28, 7, 4, 12, 2, { rangeX: 90 })                                             // Attack 1 (flying)
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt, hurtbox, blockLight, bodyOffset, targetOffset,
  drawHud: drawHighbreedHud, drawFx: drawHighbreedFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshHighbreedState() {
  return { kind: HB_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    oppDir: 1, hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5,
    moveState: "grounded", runT: 99, moveAnim: null, renderScale: 1,
    airborne: false, apexY: null, capY: null, jumpHeld: 0, flightUsed: 0, flights: 0,
    surge: 0, lastGainT: 0, mutT: 0, mutCd: 0, mutLock: 0, mutations: 0, surgeDealt: 0, surgeTaken: 0,
    taunt: null, tauntHold: 0, taunts: 0,
    claws: null, dive: null, diveUsed: false, lance: null, wing: null, wingUsed: false, ult: null,
    lastClaws: null, lastDive: null, lastLance: null, lastWing: null, lastUlt: null, lastNormal: null,
    stats: { casts: 0, claws: 0, clawHits: 0, dives: 0, diveHits: 0, lances: 0, lanceHits: 0, wings: 0, wingHits: 0, normals: { grounded: 0, running: 0, flying: 0 } } }
}
export const hbState = f => (f?.omnitrix?.formState?.kind === HB_KEY && f.transformed && f.activeAlien === HB_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshHighbreedState()
  s.base = { walk: f._benWalkSpeed, dash: f.dashSpeed, jump: f.jumpForce }
  f._alienFlightProfile = HIGHBREED.flightProfile; f._flightCtl = null           // cleared by clearBenFormState on swap / revert / KO
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function hbHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // section ticks (f, s, input, api, opp, ctx), filled by the sections below, run in order
function tick(f, input, ctx, api) {
  const s = hbState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  input = input || {}
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  s.oppDir = opp && !opp.eliminated ? (cx(opp) >= cx(f) ? 1 : -1) : (f.facing || 1)
  tickInputs(f, s, input, s.oppDir)
  for (const fn of TICKS) fn(f, s, input, api, opp, ctx)
  s.noAttack = busy(s)
}
const BUSY = []    // predicates: a cast owns him
const busy = s => BUSY.some(p => p(s))
const MD_XFORM = []   // moveFrames transforms (f, s, key, md) → md
// moveFrames hook (combat.startMove): his own special moves (hb_*) pass; no normals while a cast owns him
function moveFrames(f, key, md) {
  const s = hbState(f); if (!s || !md) return md
  if (!/^hb_/.test(key) && busy(s)) return false
  return MD_XFORM.reduce((m, fn) => fn(f, s, key, m), md)
}

// ── MOVEMENT STATE (GAME_STATE) — grounded (idle / walking), running, flying ─────────────────────────────────
// Read every frame from the existing movement flags: FLYING = airborne (jump, double jump, hover-flight: every air frame on
// his sheet is a flying row); RUNNING = grounded and in a dash (physics dashTimer) or moving forward faster than a walk, or
// within HB_RUN_GRACE frames of it (a run carries into the attack); GROUNDED otherwise.
export const HB_RUN_GRACE = 12, HB_RUN_VX = 7.5
export function readMoveState(f, s) {
  if (!grounded(f)) return "flying"
  return s.runT <= HB_RUN_GRACE ? "running" : "grounded"
}
TICKS.push((f, s) => {
  const fwd = Math.sign(f.vx || 0) === (f.facing || 1)
  if (grounded(f) && (((f.dashTimer || 0) > 0) || (fwd && Math.abs(f.vx || 0) > HB_RUN_VX))) s.runT = 0
  else if (grounded(f)) s.runT = Math.min(99, s.runT + 1)
  else s.runT = 99
  s.moveState = readMoveState(f, s)
})

// ── FLIGHT (flight.js profile "highbreed"): hold Jump in the air (≥ 8f) to fly on his wings; max 150f per airtime, cruise
// 6.0, never above the jump apex + 160 px, knocked out of the sky (40f grounded lock) by a hard hit, never refills jumps. ──
export const HB_FLIGHT = { MAX: 150, CAP: 160, HOLD: 8 }
TICKS.push(function tickFlight(f, s, input) {
  const c = f._flightCtl, flying = !!c && isFlying(f), g = grounded(f)
  const jump = !!(input.jump || input.up)
  s.jumpHeld = jump ? s.jumpHeld + 1 : 0
  if (g) { s.airborne = false; s.apexY = null; s.capY = null; s.flightUsed = 0 }
  else { s.airborne = true; if (!flying) s.apexY = s.apexY == null ? f.y : Math.min(s.apexY, f.y) }
  if (flying) {
    s.flightUsed++
    if ((f.hitstun || 0) > 0) { flightKnockedDown(f); return }
    if (!jump || s.flightUsed >= HB_FLIGHT.MAX || s.ult) { c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false; return }
    if (s.capY != null && f.y < s.capY) { f.y = s.capY; if ((f.vy || 0) < 0) f.vy = 0 }
    return
  }
  if (g || !jump || s.jumpHeld < HB_FLIGHT.HOLD || s.flightUsed >= HB_FLIGHT.MAX || f.attacking || (f.hitstun || 0) > 0 || s.ult || busy(s)) return
  const jc = f.jumpCount
  if (flightTakeoff(f)) { f.jumpCount = jc; s.capY = (s.apexY ?? f.y) - HB_FLIGHT.CAP; s.flights++ }
})

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, opponent-relative: 6 = toward, 4 = away, 2 = ↓ …; consecutive duplicates dropped,
// 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) RENDING CLAWS   ←↙↓ + P (412) GENETIC LANCE   →→ + P (a frame-counted double tap) TALON DIVE
//   air ↓ + P (any other air Special) WING SLASH
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / ↑ / → Rending Claws,
// ← / ↓ Genetic Lance, → after a double tap Talon Dive; in the air → after a double tap Talon Dive, anything else Wing Slash.
export const HB_DASH_WINDOW = 14, HB_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input, face) {
  const fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= HB_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["412", "lance"], ["236", "claws"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= HB_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  const dashed = s.t - (s.dashTapT ?? -999) <= HB_DASH_WINDOW && (dir === "F" || !dir)
  if (!grounded(f)) return dashed ? "dive" : "wing"
  const m = readMotion(s); if (m) return m
  if (dashed) return "dive"
  if (dir === "B" || dir === "D") return "lance"
  return "claws"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const HB_COST = { claws: 12, dive: 12, lance: 14, wing: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = hbState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null     // the ultimate's cast (Phase 6)
function fireUltimate(f, ctx, api) { return ULT ? ULT(f, ctx, api) : false }

// ── hooks dispatched to the sections ──────────────────────────────────────────────────────────────────────────
const CONTACT = []   // onContact (f, s, target, info): a contact HE made
function onContact(f, target, info) {
  const s = hbState(f); if (!s || !target) return
  for (const h of CONTACT) h(f, s, target, info || {})
}
const STRUCK = []    // struck (f, s, info): an attack that landed on him or that he blocked
function struck(f, info) {
  const s = hbState(f); if (!s) return
  for (const h of STRUCK) h(f, s, info || {})
}
const DEALT = []     // damageDealt (f, s, target, raw, opts) → raw
function damageDealt(f, target, raw, opts) {
  const s = hbState(f); if (!s || !(raw > 0)) return raw
  for (const fn of DEALT) raw = fn(f, s, target, raw, opts || {})
  return raw
}
const HURTBOX = []   // (f, s) → a box override or null
function hurtbox(f) {
  const s = hbState(f); if (!s) return null
  for (const fn of HURTBOX) { const b = fn(f, s); if (b) return b }
  return null
}
const BLOCK_LIGHT = []   // (f, s, ctx) → true = Block + Light owned
function blockLight(f, ctx) {
  const s = hbState(f); if (!s) return false
  return BLOCK_LIGHT.some(fn => fn(f, s, ctx))
}
const BODY_OFS = []     // render-only (f, s) → { dx, dy } | null
function bodyOffset(f) {
  const s = hbState(f); if (!s) return null
  for (const fn of BODY_OFS) { const o = fn(f, s); if (o) return o }
  return null
}
const TARGET_OFS = []   // render-only (f, s, target) → { dx, dy } | null
function targetOffset(f, t) {
  const s = hbState(f); if (!s) return null
  for (const fn of TARGET_OFS) { const o = fn(f, s, t); if (o) return o }
  return null
}

// ── HUD + world overlays (render-only: read GAME_STATE, never write it) ────────────────────────────────────────
const HUD_PARTS = []   // (ctx, f, s, box) → draws one HUD row
export function drawHighbreedHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = hbState(f); if (!ctx || !s) return
  const w = Math.min(120, pbw || 120), y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  for (const p of HUD_PARTS) p(ctx, f, s, { bx, y, w, flip })
  ctx.restore()
}
export function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const FX_DRAW = []   // (c, f, s, frame, opp) render-only layers
export function drawHighbreedFx(c, f, frame = 0, opp = null) {
  const s = hbState(f); if (!s || !c) return
  for (const d of FX_DRAW) d(c, f, s, frame, opp)
}
export const GREY = "#b5cee7", ORANGE = "#ef6300", PURPLE = "#4b006c", VIOLET = "#a24bd8", WHITE = "#e7efef", INK = "#181818"
function canAct(f, s) {
  return f.transformed && f.activeAlien === HB_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
export const hold = (f, n) => { f._benPowerCommit = Math.max(f._benPowerCommit || 0, n); f.attackCooldown = Math.max(f.attackCooldown || 0, n) }
const pose = (f, name, left) => { f._spriteCastMove = name; f._spriteCastTimer = Math.max(2, left) }

// ── 3. MOVE-SET SELECTOR (GAME_STATE) ────────────────────────────────────────────────────────────────────────────────
// The sheet drew a distinct attack per movement state, so when a normal STARTS (the moveFrames hook) the state read from the
// existing movement flags picks its strip: formState.moveAnim = { move, action, state } (plain data), read by sprite.js's
// generic selector (ADD_ALIEN.md). The button never changes: Light is still "light", Heavy still "heavy"; the frame data is the
// same in every state (as briefed). Low and Launcher have one strip each (Low = Hurt (walking) reversed; Launcher = Attack 1
// (running), an anti-air lunge). Specials pick their cast strip the same way (HB_SPECIAL_ANIM, read by each cast).
export const HB_MOVE_ANIM = {
  light: { grounded: "light", running: "lightRun", flying: "lightFly" },
  heavy: { grounded: "heavy", running: "heavyRun", flying: "heavyFly" },
  air:   { grounded: "air", running: "air", flying: "airFly" },
  down:  { grounded: "down", running: "down", flying: "down" },
  up:    { grounded: "up", running: "up", flying: "up" },
}
export const HB_SPECIAL_ANIM = {
  claws: { grounded: "hbClaws", running: "hbClawsRun", flying: "hbClawsFly" },
  lance: { grounded: "hbLance", running: "hbLance", flying: "hbLanceFly" },
  dive:  { grounded: "hbDive", running: "hbDive", flying: "hbDive" },
  wing:  { grounded: "hbWing", running: "hbWing", flying: "hbWing" },
}
export const animFor = (table, key, state) => (table[key] && table[key][state]) || null
MD_XFORM.push((f, s, key, md) => {
  const action = animFor(HB_MOVE_ANIM, key, s.moveState)
  if (action) {
    s.moveAnim = { move: key, action, state: s.moveState }
    s.lastNormal = { key, state: s.moveState, action, t: s.t }
    s.stats.normals[s.moveState] = (s.stats.normals[s.moveState] || 0) + 1
  }
  return md
})

// ── 4. MUTATION SURGE (his unique system, GAME_STATE) ───────────────────────────────────────────────────────────────
// Surge 0–100: +6 for a hit he lands, +3 for a hit he takes (melee / projectile / grab; blocked hits give nothing); −1/f after
// 150f without a gain. At 100 he MUTATES for 200f (the full gauge is consumed): render scale ×1.15 (a fixed step) AND hurtbox
// ×1.15 (always together — both read `s.mutT`), damage +15 %, walk / dash speed −5 %. It ends into a 240f cooldown where
// Surge gains are halved, and he can mutate again only 600f after the moment it ended (a full gauge waits for that).
// Swap / revert / KO / rematch build a fresh formState → Surge, MUTATED and both timers clear; the speed is restored.
export const HB_SURGE = { MAX: 100, HIT: 6, TAKEN: 3, IDLE: 150, DECAY: 1, MUT: 200, SCALE: 1.15, DMG: 1.15, SPEED: 0.95, CD: 240, CD_GAIN: 0.5, LOCK: 600 }
export const mutated = s => !!(s && s.mutT > 0)
export function gainSurge(s, amount, why) {
  if (s.mutT > 0) return 0                                                   // no gain while MUTATED (the gauge was consumed)
  const k = s.mutCd > 0 ? HB_SURGE.CD_GAIN : 1, add = Math.min(HB_SURGE.MAX - s.surge, amount * k)
  if (add <= 0) return 0
  s.surge += add; s.lastGainT = s.t
  if (why === "dealt") s.surgeDealt += add; else s.surgeTaken += add
  return add
}
function setMutatedSpeed(f, s, on) {
  if (!s.base) return
  const k = on ? HB_SURGE.SPEED : 1
  if (Number.isFinite(s.base.walk)) { f._benWalkSpeed = s.base.walk * k; f.speed = f.baseSpeed = f._benWalkSpeed }
  if (Number.isFinite(s.base.dash)) f.dashSpeed = s.base.dash * k
}
TICKS.push((f, s) => {
  if (s.mutT > 0) {
    if (--s.mutT === 0) { s.renderScale = 1; s.mutCd = HB_SURGE.CD; s.mutLock = HB_SURGE.LOCK; setMutatedSpeed(f, s, false) }
    return
  }
  if (s.mutCd > 0) s.mutCd--
  if (s.mutLock > 0) s.mutLock--
  if (s.surge >= HB_SURGE.MAX && s.mutLock === 0 && !s.ult) {
    s.surge = 0; s.mutT = HB_SURGE.MUT; s.renderScale = HB_SURGE.SCALE; s.mutations++; setMutatedSpeed(f, s, true); return
  }
  if (s.surge > 0 && s.surge < HB_SURGE.MAX && s.t - s.lastGainT > HB_SURGE.IDLE) s.surge = Math.max(0, s.surge - HB_SURGE.DECAY)
})
CONTACT.push((f, s, target, { blocked }) => { if (!blocked) gainSurge(s, HB_SURGE.HIT, "dealt") })
STRUCK.push((f, s, { blocked }) => { if (!blocked) gainSurge(s, HB_SURGE.TAKEN, "taken") })
DEALT.push((f, s, target, raw) => (s.mutT > 0 ? raw * HB_SURGE.DMG : raw))
// the hurtbox grows WITH the sprite (feet planted, centred): the same `mutT` the render scale reads
HURTBOX.push((f, s) => {
  if (!(s.mutT > 0)) return null
  const w = (f.w || 60) * HB_SURGE.SCALE, h = (f.h || 124) * HB_SURGE.SCALE
  return { x: f.x + (f.w || 60) / 2 - w / 2, y: f.y + (f.h || 124) - h, w, h }
})
// render-only: the Surge gauge under the Omnitrix Power bar (violet; MUTATED = a draining orange bar; cooldown = dim)
HUD_PARTS.push((ctx, f, s, { bx, y, w }) => {
  if (!(s.surge > 0 || s.mutT > 0 || s.mutCd > 0)) return
  const h = 5
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, y, w, h)
  if (s.mutT > 0) { ctx.fillStyle = ORANGE; ctx.fillRect(bx, y, Math.round(w * s.mutT / HB_SURGE.MUT), h) }
  else { ctx.fillStyle = s.mutCd > 0 ? "#6b4a86" : VIOLET; ctx.fillRect(bx, y, Math.round(w * s.surge / HB_SURGE.MAX), h) }
  ctx.font = "bold 8px monospace"; ctx.textBaseline = "top"; ctx.textAlign = "left"; ctx.fillStyle = s.mutT > 0 ? ORANGE : WHITE
  ctx.fillText(s.mutT > 0 ? "MUTATED" : `SURGE ${Math.floor(s.surge)}`, bx, y + h + 1)
})
// render-only: the MUTATED glow — a stepped violet / orange pixel aura that pulses around him
FX_DRAW.push((c, f, s, frame) => {
  if (!(s.mutT > 0)) return
  c.save(); c.globalAlpha = 0.6
  const x0 = cx(f), y0 = f.y + (f.h || 124) / 2, rw = (f.w || 60) * 0.95, rh = (f.h || 124) * 0.7
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + (frame >> 2) * 0.35, r = 1 + ((frame + i * 3) % 8 < 4 ? 0.08 : 0)
    c.fillStyle = i % 3 ? VIOLET : ORANGE; px(c, x0 + Math.cos(a) * rw * r, y0 + Math.sin(a) * rh * r, 4) }
  c.restore()
})

// ── 5. DIALOGUE TAUNT (cosmetic, no hitbox) ─────────────────────────────────────────────────────────────────────────
// No shared cosmetic taunt binding exists (the engine's own taunt is a 10 s Down-hold HEAL — gameplay, not reused), so the
// brief's fallback: hold Block + Light 20f (grounded, not in hitstun / a cast / the Ultimate). The existing blockLight hook
// owns the Light press so it never also jabs. He then plays the "Idle (during dialouge)" loop with the sheet's Text icon
// beside him (render-only). ZERO gameplay frames: no attackCooldown, no power commit, no movement lock, no hitbox — the only
// state is the display flag `s.taunt` (+ a counter). ANY other input (a direction, Jump, Heavy, Special, Ultimate, Grab,
// Charge, dash) or a fresh Light press cancels it at once, as does hitstun, an attack or the Ultimate; it ends by itself
// after 195f (three loops). Holding Block keeps his ordinary guard (the guard is the engine's, untouched).
export const HB_TAUNT = { HOLD: 20, MAX: 195 }
const TAUNT_CANCEL = ["left", "right", "up", "down", "jump", "heavy", "special", "ultimate", "grab", "charge", "dash", "upAttack"]
const canTaunt = (f, s) => grounded(f) && !s.ult && !((f.hitstun || 0) > 0) && !f.attacking && !busy(s) && !f.knockdownState
export function endTaunt(f, s) {
  if (!s.taunt) return
  s.taunt = null
  if (f._spriteCastMove === "taunt") { f._spriteCastMove = null; f._spriteCastTimer = 0 }
}
BLOCK_LIGHT.push((f, s) => !s.ult && !((f.hitstun || 0) > 0))
TICKS.push((f, s, input) => {
  if (s.taunt) {
    s.taunt.t++
    const relit = !!input.light && !s.taunt.lightHeld
    s.taunt.lightHeld = !!input.light
    if (TAUNT_CANCEL.some(k => input[k]) || relit || !canTaunt(f, s) || s.taunt.t >= HB_TAUNT.MAX) { endTaunt(f, s); s.tauntHold = 0; return }
    f._spriteCastMove = "taunt"; f._spriteCastTimer = 2                      // the display channel (sprite.js cast pose)
    return
  }
  s.tauntHold = input.block && input.light && canTaunt(f, s) ? s.tauntHold + 1 : 0
  if (s.tauntHold >= HB_TAUNT.HOLD) { s.taunt = { t: 0, lightHeld: true }; s.taunts++; f._spriteCastMove = "taunt"; f._spriteCastTimer = 2 }
})
// render-only: the sheet's Text icon (dialogue UI) bobbing beside his head, nearest-neighbour ×2
let ICON = null
const iconImg = () => { if (!ICON && typeof Image !== "undefined") { ICON = new Image(); ICON.src = HIGHBREED_GEOM.icon.sheet } return ICON }
FX_DRAW.push((c, f, s, frame) => {
  if (!s.taunt) return
  const img = iconImg(); if (!img || !img.complete || !img.naturalWidth) return
  const k = 2, w = HIGHBREED_GEOM.icon.w * k, h = HIGHBREED_GEOM.icon.h * k, face = f.facing || 1
  const x = Math.round(cx(f) + face * ((f.w || 60) / 2 + 14) - (face > 0 ? 0 : w)), y = Math.round(f.y - h - 6 + ((frame >> 3) & 1) * 2)
  c.save(); c.imageSmoothingEnabled = false; c.drawImage(img, x, y, w, h); c.restore()
})

// ── 6. SPECIALS ────────────────────────────────────────────────────────────────────────────────────────────────────────
// Each special is a cast record in formState, advanced frame by frame by his tick (a hit = hitstun cancels it); its damage is a
// RECT HITBOX entity (api.spawnProjectile, rectHitbox — the engine's own block / chip / hitstun / combo scaling / onContact),
// tagged alien { hb, cast }. The strip follows the MOVE-SET SELECTOR (HB_SPECIAL_ANIM by the state at the cast).
let projRef = null
TICKS.unshift((f, s, input, api) => { if (api && api.activeProjectiles) projRef = api.activeProjectiles() })
const ownLive = (f, hb, cast) => !!projRef && projRef.some(p => p && p.owner === f && p.alien && p.alien.hb === hb && (cast == null || p.alien.cast === cast) && p.lifetime > 0)
const killOwn = (f, hb) => { if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.hb === hb) p.lifetime = 0 }
const box = (f, api, name, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: (f.facing || 1) * 0.01, vy: 0, rectHitbox: true, isSpecial: true,
  lifetime: 2, ...md, alien: { hidden: true, ...(md.alien || {}) } }, {})
const blockstunFor = (active, recovery, onBlock) => Math.max(1, active + recovery + onBlock)
const flinched = f => (f.hitstun || 0) > 0 || !!f.knockdownState
function beginCast(f, s, api, cost) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  endTaunt(f, s)
  f.isCharging = false
  if (s.oppDir) f.facing = s.oppDir
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.castId++; s.stats.casts++
  return s.castId
}
BUSY.push(s => !!(s.claws || s.dive || s.lance || s.wing || s.ult))

// 1. RENDING CLAWS (↓↘→ + P, 12) — Attack 2 (walking / running / flying row by state) claw arc: 2 hits 20 / 28 = 48, 170 px in
//    front, 14f startup (the second 6f later), −12 on block.
export const HB_CLAWS = { STARTUP: 14, GAP: 6, ACTIVE: 3, RECOVERY: 20, HITS: [20, 28], RANGE: 170, ON_BLOCK: -12 }
function castClaws(f, s, api) {
  const state = s.moveState
  const cast = beginCast(f, s, api, HB_COST.claws); if (cast == null) return false
  f.vx = 0
  const total = HB_CLAWS.STARTUP + HB_CLAWS.GAP + HB_CLAWS.ACTIVE + HB_CLAWS.RECOVERY
  s.claws = { t: 0, cast, state, anim: animFor(HB_SPECIAL_ANIM, "claws", state), face: f.facing || 1, hits: [] }; s.stats.claws++
  hold(f, total); pose(f, s.claws.anim, total)
  return true
}
CASTS.claws = castClaws
const clawBox = (f, c, api, k, dmg, last) => box(f, api, "hb_claws" + k, { damage: dmg, spawnX: cx(f) + c.face * HB_CLAWS.RANGE / 2, spawnY: f.y + (f.h || 124) * 0.45,
  w: HB_CLAWS.RANGE, h: (f.h || 124) * 0.7, lifetime: HB_CLAWS.ACTIVE, hitstun: 22, knockbackX: (last ? 6 : 1) * c.face, knockbackY: last ? -3 : 0,
  blockstun: last ? blockstunFor(HB_CLAWS.ACTIVE, HB_CLAWS.RECOVERY, HB_CLAWS.ON_BLOCK) : 14, alien: { hb: "claws" + k, cast: c.cast } })
TICKS.push((f, s, input, api) => {
  const c = s.claws; if (!c) return
  c.t++
  if (flinched(f) && c.t <= HB_CLAWS.STARTUP) { s.lastClaws = { hits: c.hits.slice(), why: "hit" }; s.claws = null; return }
  f._spriteCastMove = c.anim; f._spriteCastTimer = 2
  if (c.t === HB_CLAWS.STARTUP) clawBox(f, c, api, 1, HB_CLAWS.HITS[0], false)
  if (c.t === HB_CLAWS.STARTUP + HB_CLAWS.GAP) clawBox(f, c, api, 2, HB_CLAWS.HITS[1], true)
  if (c.t >= HB_CLAWS.STARTUP + HB_CLAWS.GAP + HB_CLAWS.ACTIVE + HB_CLAWS.RECOVERY) { s.lastClaws = { hits: c.hits.slice(), why: "done", state: c.state, anim: c.anim }; s.claws = null }
})

// 2. TALON DIVE (→→ + P, 12) — take-off frames into the Attack 1 (flying) dive: a diagonal-down dive of 320 px of REAL travel
//    (16 px/f forward, stage-clamped), 50 on the body hit (one per cast), −12 on block. Airborne-only: cast grounded, he LEAPS
//    first (8f of take-off, his own lift — no jump is spent). Ends on landing or after the travel (12f landing recovery).
export const HB_DIVE = { LEAP: 8, LEAP_VY: -9, VX: 16, VY: 7, TRAVEL: 320, DMG: 50, ON_BLOCK: -12, LAND: 12 }
function castDive(f, s, api) {
  if (!grounded(f) && s.diveUsed) return false                                    // once per airtime (like Wing Slash); resets on landing
  const cast = beginCast(f, s, api, HB_COST.dive); if (cast == null) return false
  const leap = grounded(f); s.diveUsed = true
  s.dive = { t: 0, cast, face: f.facing || 1, leap, x0: null, hit: false, jumps: f.jumpCount, lastY: f.y }; s.stats.dives++
  if (leap) { f.vy = HB_DIVE.LEAP_VY; f.onGround = f.grounded = false }
  f.vx = 0; hold(f, 2); pose(f, leap ? "hbDiveUp" : "hbDive", 2)
  return true
}
CASTS.dive = castDive
TICKS.push((f, s, input, api) => {
  const d = s.dive; if (!d) return
  d.t++
  if (flinched(f)) { endDive(f, s, false); return }
  hold(f, 2)
  if (d.leap && d.t <= HB_DIVE.LEAP) { pose(f, "hbDiveUp", 2); f.jumpCount = d.jumps; return }
  pose(f, "hbDive", 2)
  if (d.x0 == null) d.x0 = f.x
  const moved = Math.abs(f.x - d.x0), landed = d.t > (d.leap ? HB_DIVE.LEAP : 0) + 2 && grounded(f)
  if (landed || moved >= HB_DIVE.TRAVEL - 0.5) { endDive(f, s, landed || grounded(f)); return }
  const step = Math.min(HB_DIVE.VX, HB_DIVE.TRAVEL - moved)
  f._benGlide = { vx: d.face * step, vy: HB_DIVE.VY }; f.jumpCount = d.jumps
  if (!d.hit && !ownLive(f, "dive", d.cast)) box(f, api, "hb_dive", { damage: HB_DIVE.DMG, spawnX: cx(f) + d.face * 24, spawnY: f.y + (f.h || 124) * 0.6,
    w: 80, h: 80, hitstun: 26, blockstun: blockstunFor(2, HB_DIVE.LAND, HB_DIVE.ON_BLOCK), knockbackX: 5 * d.face, knockbackY: -4, alien: { hb: "dive", cast: d.cast } })
})
function endDive(f, s, landed) {
  const d = s.dive; s.dive = null; delete f._benGlide; killOwn(f, "dive")
  f.jumpCount = d.jumps
  const travel = d.x0 == null ? 0 : Math.abs(f.x - d.x0)
  if (landed) { f.attackCooldown = HB_DIVE.LAND; f._benPowerCommit = HB_DIVE.LAND; pose(f, "idle", HB_DIVE.LAND) }
  else { f.attackCooldown = 0; f._benPowerCommit = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastDive = { landed, hit: d.hit, jumps: d.jumps, travel, leap: d.leap }
}

// 3. GENETIC LANCE (←↙↓ + P, 14) — the "projectile ?" frame was EXCLUDED (unclear art; see the ledger), so the brief's melee
//    fallback: an Attack 2 (running) LUNGE, 280 px of real travel (20 px/f), 45 on the first contact (the travel stops there),
//    12f startup, −10 on block. A whiff swings at the end of the travel.
export const HB_LANCE = { STARTUP: 12, SPEED: 20, TRAVEL: 280, DMG: 45, RECOVERY: 22, ON_BLOCK: -10 }
function castLance(f, s, api) {
  const state = s.moveState
  const cast = beginCast(f, s, api, HB_COST.lance); if (cast == null) return false
  const run = HB_LANCE.TRAVEL / HB_LANCE.SPEED
  s.lance = { t: 0, cast, state, anim: animFor(HB_SPECIAL_ANIM, "lance", state), face: f.facing || 1, run, contact: null, x0: f.x, endAt: HB_LANCE.STARTUP + run }; s.stats.lances++
  f.vx = 0; hold(f, HB_LANCE.STARTUP + run + HB_LANCE.RECOVERY); pose(f, s.lance.anim, 2)
  return true
}
CASTS.lance = castLance
TICKS.push((f, s, input, api) => {
  const c = s.lance; if (!c) return
  c.t++
  if (flinched(f)) { delete f._benLunge; s.lastLance = { why: "hit" }; s.lance = null; return }
  f._spriteCastMove = c.anim; f._spriteCastTimer = 2
  const st = HB_LANCE.STARTUP
  if (c.t === st + 1) f._benLunge = { speed: c.face * HB_LANCE.SPEED, frames: c.run }
  if (c.t > st && c.t <= c.endAt && !c.contact && !ownLive(f, "lance", c.cast))
    box(f, api, "hb_lance", { damage: HB_LANCE.DMG, spawnX: cx(f) + c.face * 60, spawnY: f.y + (f.h || 124) * 0.45, w: 90, h: 80,
      hitstun: 26, blockstun: blockstunFor(2, HB_LANCE.RECOVERY, HB_LANCE.ON_BLOCK), knockbackX: 7 * c.face, knockbackY: -3, alien: { hb: "lance", cast: c.cast } })
  if (c.t === c.endAt && !c.contact) killOwn(f, "lance")
  if (c.t >= c.endAt + HB_LANCE.RECOVERY) { s.lastLance = { why: c.contact ? (c.contact.blocked ? "blocked" : "hit") : "whiff", travel: Math.abs(f.x - c.x0), state: c.state, anim: c.anim }; s.lance = null }
})

// 5. WING SLASH (air ↓ + P — any air Special without a dash tap; 12) — the Attack 2 (flying) arc: a diagonal DIVE SLASH
//    (the shared `_benGlide`), 48 on the body hit (one per cast), once per airtime, no jump refill. 12f landing.
export const HB_WING = { STARTUP: 6, VX: 9, VY: 11, MAX: 45, DMG: 48, LAND: 12 }
function castWing(f, s, api) {
  if (grounded(f) || s.wingUsed) return false
  const cast = beginCast(f, s, api, HB_COST.wing); if (cast == null) return false
  if (f._flightCtl) f._flightCtl.phase = FLIGHT_PHASE.GROUNDED                      // leaves hover-flight (no refill)
  s.wingUsed = true; s.stats.wings++
  s.wing = { t: 0, cast, face: f.facing || 1, lastY: f.y, hit: false, jumps: f.jumpCount }
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }; hold(f, 2)
  return true
}
CASTS.wing = castWing
TICKS.push((f, s) => { if (grounded(f) && !s.wing) s.wingUsed = false; if (grounded(f) && !s.dive) s.diveUsed = false })
TICKS.push((f, s, input, api) => {
  const d = s.wing; if (!d) return
  d.t++
  if (flinched(f)) { endWing(f, s, false); return }
  pose(f, "hbWing", 2); hold(f, 2); f.jumpCount = d.jumps
  if (d.t <= HB_WING.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > HB_WING.STARTUP + 1 && (f.y === d.lastY || grounded(f))
  d.lastY = f.y
  if (landed || d.t >= HB_WING.STARTUP + HB_WING.MAX) { endWing(f, s, landed); return }
  f._benGlide = { vx: d.face * HB_WING.VX, vy: HB_WING.VY }
  if (!d.hit && !ownLive(f, "wing", d.cast)) box(f, api, "hb_wing", { damage: HB_WING.DMG, spawnX: cx(f) + d.face * 20, spawnY: f.y + (f.h || 124) * 0.7,
    w: 90, h: 80, hitstun: 24, blockstun: 12, knockbackX: 3 * d.face, knockbackY: -4, alien: { hb: "wing", cast: d.cast } })
})
function endWing(f, s, landed) {
  const d = s.wing; s.wing = null; delete f._benGlide; killOwn(f, "wing")
  f.jumpCount = d.jumps
  if (landed) { f.attackCooldown = HB_WING.LAND; f._benPowerCommit = HB_WING.LAND; pose(f, "idle", HB_WING.LAND) }
  else { f.attackCooldown = 0; f._benPowerCommit = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastWing = { landed, hit: d.hit, jumps: d.jumps }
}

// contact bookkeeping (before the Surge handler)
CONTACT.unshift((f, s, target, { proj, blocked }) => {
  const a = proj && proj.alien; if (!a || !a.hb) return
  if ((a.hb === "claws1" || a.hb === "claws2") && s.claws && s.claws.cast === a.cast) { s.claws.hits.push({ k: a.hb, blocked: !!blocked }); if (!blocked) s.stats.clawHits++ }
  if (a.hb === "dive" && s.dive && s.dive.cast === a.cast) { s.dive.hit = true; if (!blocked) s.stats.diveHits++ }
  if (a.hb === "lance" && s.lance && s.lance.cast === a.cast && !s.lance.contact) {
    s.lance.contact = { blocked: !!blocked, t: s.lance.t }; delete f._benLunge; killOwn(f, "lance"); s.lance.endAt = s.lance.t; if (!blocked) s.stats.lanceHits++ }
  if (a.hb === "wing" && s.wing && s.wing.cast === a.cast) { s.wing.hit = true; if (!blocked) s.stats.wingHits++ }
})

// ── ULTIMATE: GENETIC PURGE (the Omnitrix Overload input; 55 Power) ───────────────────────────────────────────────────
// Needs a CLEAN OPENER: a Rending-Claws-style strike in front of him (40, 14f startup). A whiff or a block: no cinematic, 60f
// recovery. On a clean hit, the existing capture pattern (both fighters held; positions restore at the end):
//  1. he TAKES OFF (take off f3 → "flying above (attack)") and the camera tightens on the TOP-DOWN "flying above" loop: he
//     circles the captured opponent (a render-only body offset) inside a procedural pixel DNA-STRAND spiral (no hitbox);
//  2. DIVE BARRAGE: 3 talon dives × 25 = 75 (Attack 1 (flying)) at angles hash(match seed, start frame, player index);
//  3. PURGE BEAM: he lands (Attack 2 (walking)) and a procedural pixel beam burst hits for 125, knockdown.
// Total 240 unscaled (40 + 75 + 125). Surge → 0 afterwards. The camera returns to the side view, no persistent hazard, 100f
// recovery lockout. The DNA strand / beam have no hitbox and no GAME_STATE presence (they read `s.ult`).
export const HB_ULT = { OPEN_ST: 14, OPEN_ACTIVE: 3, OPENER: 40, RANGE: 170, WHIFF: 60, RISE: 18, DIVES: [44, 58, 72], DIVE: 25, DIVE_LEN: 10,
  LAND: 86, BEAM_AT: 100, BEAM: 125, END: 120, LOCKOUT: 100, KD: 60, ZOOM: 0.85, ORBIT: 120 }
function firePurge(f, ctx, api) {
  const s = hbState(f); if (!s || !canAct(f, s)) return false
  if (!api.spendEnergy(f, HB_COST.ultimate)) return false
  endTaunt(f, s); s.castId++
  if (s.oppDir) f.facing = s.oppDir
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1; f.vx = 0
  if (f._flightCtl) f._flightCtl.phase = FLIGHT_PHASE.GROUNDED
  s.ult = { phase: "opener", t: 0, face: f.facing || 1, raw: 0, hits: [], cast: s.castId, seed: (ctx?.seed ?? 1) >>> 0, f0: ctx?.frame ?? s.t, pi: pIndex(f),
    contact: null, fired: false }
  hold(f, HB_ULT.OPEN_ST + HB_ULT.OPEN_ACTIVE + 2); pose(f, animFor(HB_SPECIAL_ANIM, "claws", s.moveState), HB_ULT.OPEN_ST)
  return true
}
ULT = firePurge
function ultMiss(f, s, why) {
  s.lastUlt = { captured: false, why, raw: 0 }; s.ult = null; killOwn(f, "ult_open")
  f.attackCooldown = Math.max(f.attackCooldown || 0, HB_ULT.WHIFF); f._benPowerCommit = Math.max(f._benPowerCommit || 0, HB_ULT.WHIFF); pose(f, "idle", HB_ULT.WHIFF)
}
// pure: the barrage's dive angles of one cast (render + the held target's sway share them; the same seed → the same angles)
export function ultDives(seed, frame0, pi) {
  return HB_ULT.DIVES.map((at, i) => ({ at, ang: Math.round(30 + hbHash(seed, frame0, pi, i) * 120) }))   // degrees: 30–150 (from above)
}
TICKS.push((f, s, input, api, opp) => {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") {
    u.t++
    if (u.contact) {
      if (u.contact.blocked || !opp || opp.eliminated) { ultMiss(f, s, "blocked"); return }
      u.phase = "rise"; u.t = 0; u.raw = HB_ULT.OPENER; u.hits.push(HB_ULT.OPENER)
      u.home = { x: f.x, y: f.y }; u.thome = { x: opp.x, y: opp.y }; killOwn(f, "ult_open")
      f.attackCooldown = HB_ULT.END + HB_ULT.LOCKOUT; f._benPowerCommit = HB_ULT.END; f.invulnTimer = Math.max(f.invulnTimer || 0, HB_ULT.END + 2)
      return
    }
    if (flinched(f) && !u.fired) { ultMiss(f, s, "hit"); return }
    f._spriteCastTimer = 2
    if (u.t === HB_ULT.OPEN_ST) {
      u.fired = true
      box(f, api, "hb_ult_open", { damage: HB_ULT.OPENER, isSpecial: false, isUltimate: true, spawnX: cx(f) + u.face * HB_ULT.RANGE / 2, spawnY: f.y + (f.h || 124) * 0.45,
        w: HB_ULT.RANGE, h: (f.h || 124) * 0.7, lifetime: HB_ULT.OPEN_ACTIVE, hitstun: 40, blockstun: 16, knockbackX: 0.01 * u.face, knockbackY: 0,
        alien: { hb: "ult_open", cast: u.cast } })
    }
    if (u.fired && u.t > HB_ULT.OPEN_ST + HB_ULT.OPEN_ACTIVE + 1 && !ownLive(f, "ult_open", u.cast)) ultMiss(f, s, "whiff")
    return
  }
  if (!u.home || !u.thome) return                                         // only a captured cast runs the cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  if (u.t === 1) api?.focusCamera?.(f, opp, HB_ULT.ZOOM, HB_ULT.END)       // render-only framing (the "top-down" shot)
  opp.hitstun = Math.max(opp.hitstun || 0, 4); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake, move) => { api.applyScaledDamage(opp, dmg, { attacker: f, move, source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 10) }
  if (u.t < HB_ULT.RISE) { u.phase = "rise"; f._spriteCastMove = "hbUltRise" }
  else if (u.t < HB_ULT.DIVES[0]) { u.phase = "circle"; f._spriteCastMove = "hbUltCircle" }
  else if (u.t < HB_ULT.LAND) {
    const k = HB_ULT.DIVES.findIndex(at => u.t >= at && u.t < at + HB_ULT.DIVE_LEN)
    u.phase = "dives"; f._spriteCastMove = k >= 0 ? "hbUltDive" : "hbUltCircle"
    const j = HB_ULT.DIVES.indexOf(u.t); if (j >= 0) hit(HB_ULT.DIVE, 6 + j, "hb_ult_dive")
  } else if (u.t <= HB_ULT.BEAM_AT) {
    u.phase = "beam"; f._spriteCastMove = "hbUltBeam"
    if (u.t === HB_ULT.BEAM_AT) hit(HB_ULT.BEAM, 20, "hb_ult_beam")
  } else if (u.t < HB_ULT.END) { u.phase = "after"; f._spriteCastMove = "idle" }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
})
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30)
    if (!opp.eliminated) { opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, HB_ULT.KD) } }
  s.lastUlt = { captured: !!u?.home, raw: u?.raw || 0, hits: u?.hits ? u.hits.slice() : [], seed: u?.seed, f0: u?.f0, pi: u?.pi,
    home: u?.home ? { ...u.home } : null, thome: u?.thome ? { ...u.thome } : null, endT: s.t }
  s.ult = null
  s.surge = 0                                                                // Surge → 0 after the ultimate
  api?.focusCamera?.(f, opp, 1, 12)                                          // back to the side view
  f.attackCooldown = HB_ULT.LOCKOUT; f._benPowerCommit = HB_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
CONTACT.unshift((f, s, target, { proj, blocked }) => {
  const u = s.ult, a = proj && proj.alien; if (!u || u.phase !== "opener" || !a || a.hb !== "ult_open" || a.cast !== u.cast) return
  u.contact = { blocked: !!blocked }
})
// render-only: he CIRCLES the held opponent in the top-down shot, then dives in at the hashed angles (never collision)
BODY_OFS.push((f, s) => {
  const u = s.ult; if (!u || !u.home || !u.thome) return null
  const tx = u.thome.x - u.home.x, ty = u.thome.y - u.home.y - 150
  if (u.phase === "rise") { const k = u.t / HB_ULT.RISE; return { dx: Math.round(tx * k), dy: Math.round(ty * k) } }
  if (u.phase === "circle" || u.phase === "dives") {
    const r = ultDives(u.seed, u.f0, u.pi), k = r.findIndex(p => u.t >= p.at && u.t < p.at + HB_ULT.DIVE_LEN)
    if (k >= 0) { const p = r[k], q = 1 - (u.t - p.at) / HB_ULT.DIVE_LEN, an = p.ang * Math.PI / 180
      return { dx: Math.round(u.thome.x - u.home.x + Math.cos(an) * HB_ULT.ORBIT * q), dy: Math.round(u.thome.y - u.home.y - Math.sin(an) * HB_ULT.ORBIT * q) } }
    const an = u.t * 0.2
    return { dx: Math.round(tx + Math.cos(an) * HB_ULT.ORBIT), dy: Math.round(ty + Math.sin(an) * 30) }
  }
  return null
})
TARGET_OFS.push((f, s) => {
  const u = s.ult; if (!u || u.phase !== "dives") return null
  const r = ultDives(u.seed, u.f0, u.pi), k = r.findIndex(p => u.t >= p.at && u.t < p.at + 6); if (k < 0) return null
  const an = r[k].ang * Math.PI / 180, q = 6 - (u.t - r[k].at)
  return { dx: Math.round(-Math.cos(an) * q), dy: Math.round(Math.sin(an) * q * 0.5) }
})

// ── the moves' render-only FX (nothing here is GAME_STATE or collides) ────────────────────────────────────────────
FX_DRAW.push((c, f, s, frame, opp) => {
  c.save()
  const d = s.dive || s.wing                                                  // the wing trail: stepped orange / grey streaks behind him
  if (d && d.t > (s.dive && s.dive.leap ? HB_DIVE.LEAP : 0)) { const face = d.face
    for (let i = 1; i < 6; i++) { c.fillStyle = i % 2 ? ORANGE : GREY; px(c, cx(f) - face * i * 10, f.y + (f.h || 124) * 0.4 - i * 6, 7 - i) } }
  const u = s.ult
  if (u && u.phase !== "opener" && opp) {
    const ox = cx(opp), oy = opp.y + (opp.h || 110) / 2
    if (u.phase === "circle" || u.phase === "dives" || u.phase === "rise") {   // the DNA strand: a twisting double helix around them
      c.globalAlpha = 0.85
      for (let i = 0; i < 30; i++) { const y = oy - 90 + i * 6, ph = i * 0.42 + frame * 0.15, a = Math.sin(ph) * 46, b = Math.sin(ph + Math.PI) * 46
        c.fillStyle = VIOLET; px(c, ox + a, y, 4); c.fillStyle = ORANGE; px(c, ox + b, y, 4)
        if (i % 3 === 0) { c.fillStyle = GREY; const lo = Math.min(a, b), hi = Math.max(a, b); for (let x = lo; x < hi; x += 6) px(c, ox + x, y, 2) } }
      c.globalAlpha = 1
    }
    if (u.phase === "dives") {
      const r = ultDives(u.seed, u.f0, u.pi), k = r.findIndex(p => u.t >= p.at && u.t < p.at + 6)
      if (k >= 0) { const an = r[k].ang * Math.PI / 180; for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? WHITE : ORANGE; px(c, ox + Math.cos(an) * i * 14, oy - Math.sin(an) * i * 14, 6) } }
    }
    if (u.phase === "beam" || u.phase === "after") {                          // the PURGE BEAM: a stepped violet / white burst into them
      const age = u.t - (HB_ULT.BEAM_AT - 8); if (age >= 0 && age < 26) { const x0 = cx(f), y0 = f.y + (f.h || 124) * 0.4, len = ox - x0
        for (let i = 0; i <= 20; i++) { const x = x0 + len * i / 20, wv = 14 + ((frame + i) % 3) * 3
          c.fillStyle = i % 2 ? VIOLET : WHITE; c.fillRect(Math.round(x - 4), Math.round(y0 - wv / 2), 8, Math.round(wv)) }
        c.fillStyle = WHITE; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; px(c, ox + Math.cos(a) * (age * 3), oy + Math.sin(a) * (age * 3), 5) } }
    }
  }
  c.restore()
})
