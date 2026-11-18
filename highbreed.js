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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt, hurtbox, blockLight, targetOffset,
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
    claws: null, dive: null, lance: null, wing: null, wingUsed: false, ult: null,
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
