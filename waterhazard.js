// waterhazard.js — WATER HAZARD (Orishan), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table + read-only data / readers (Goop's Puddle Form numbers, Ripjaws' flood
// reader and electric-hit tags). The engine reaches it only through the generic, ben10-gated ready-form hooks
// (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate — see docs/ben10/ADD_ALIEN.md), which hand
// it an `api` with the shared primitives.
// STRICTLY WATER: tagged "water" in waterAffinity.js, so inside a Ripjaws STORM TIDE flood he is WATERBORNE (no breath, no
// drowning, no wading / swim penalties — Ripjaws' own rule, applied by benFlood.js) and his Pressure Core reads the flood
// depth (read-only, waterOf()).
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE) plus ONE self-expiring stamp on the
// opponent (`_benShortFuse`, plain data); render-only effects (droplets, splash rings, glow, vortex, geyser, shake) never
// write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet from fun-tech.tk: docs/ben10/aliens/waterhazard/SPRITE_LEDGER.md.
import { WATERHAZARD_ANIM, WATERHAZARD_GEOM } from "./waterhazardAssets.js"
export { WATERHAZARD_ANIM, WATERHAZARD_GEOM }

export const WH_KEY = "waterhazard"
const ANIM = { ...WATERHAZARD_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const WATERHAZARD = {
  id: WH_KEY, poolKey: WH_KEY, displayName: "Water Hazard", slot: 22,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Rath (21)
  status: "ready", sheetPath: "./ben10_waterhazard_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/waterhazard/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.05, defense: 1.00, weight: 1.05 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  tags: ["water"],                              // documentation; the live tag map is waterAffinity.js WATER_AFFINITY_FORMS
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Pressure Blast", special2: "Hydro Burst", special3: "Claw Lash", special4: "Puddle Form",
    special5: "Undertow Sweep", special6: "Geyser Dive", passive: "Pressure Core", ultimate: "Tidal Discharge" },
  basic_attacks: {
    light:  normal(18, 5, 3, 9, 0, { rangeX: 90 }),                                              // Col 2 R2 → R6 reach (+ render lunge)
    heavy:  normal(54, 14, 4, 22, -6, { knockbackX: 6, rangeX: 170 }),                          // Col 2 R5 → R6 reach, extended 170 px
    down:   normal(24, 7, 3, 14, -4, { hitLevel: "low", rangeX: 120 }),                         // Col 3 R1 crouch claw, hits low
    up:     normal(46, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 95 }),    // Col 4 R2 → Col 3 R3 rising arm
    air:    normal(28, 7, 4, 12, 2, { rangeX: 85 })                                             // Col 2 R5 leap body
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt,
  drawHud: drawWaterHazardHud, drawFx: drawWaterHazardFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshWaterHazardState() {
  return { kind: WH_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    oppDir: 1, hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, specialHeld: false,
    core: 0, lastGainT: 0, coreDealt: 0, coreTaken: 0, coreBlocked: 0, coreFlood: 0, floodDepth: "dry",
    pips: 0, pipT: 0, pipCasts: [], fuses: 0,
    puddle: null, dp: { stage: 0, t: 0 }, blast: null, burst: null, chain: null, sweep: null, dive: null, diveUsed: false, ult: null,
    lastBlast: null, lastBurst: null, lastChain: null, lastSweep: null, lastDive: null, lastUlt: null, lastPuddle: null,
    stats: { casts: 0, puddles: 0, geysers: 0, evaded: 0, blasts: 0, blastHits: 0, bursts: 0, burstHits: 0, lashes: 0, lashHits: 0,
      sweeps: 0, sweepHits: 0, dives: 0, diveHits: 0 } }
}
export const whState = f => (f?.omnitrix?.formState?.kind === WH_KEY && f.transformed && f.activeAlien === WH_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshWaterHazardState()
  s.base = { walk: f._benWalkSpeed, dash: f.dashSpeed, jump: f.jumpForce }
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function whHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // section ticks (f, s, input, api, opp, ctx), filled by the sections below, run in order
function tick(f, input, ctx, api) {
  const s = whState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  input = input || {}
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  s.oppDir = opp && !opp.eliminated ? (cx(opp) >= cx(f) ? 1 : -1) : (f.facing || 1)
  tickInputs(f, s, input, s.oppDir)
  s.specialHeld = !!input.special
  for (const fn of TICKS) fn(f, s, input, api, opp, ctx)
  s.noAttack = busy(s)
}
const BUSY = []    // predicates: a cast owns him
const busy = s => BUSY.some(p => p(s))
// moveFrames hook (combat.startMove): his own special moves (wh_*) pass; no normals while a cast owns him
const MD_XFORM = []
function moveFrames(f, key, md) {
  const s = whState(f); if (!s || !md) return md
  if (!/^wh_/.test(key) && busy(s)) return false
  return MD_XFORM.reduce((m, fn) => fn(f, s, key, m), md)
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, opponent-relative: 6 = toward, 4 = away, 2 = ↓ …; consecutive duplicates dropped,
// 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) PRESSURE BLAST (hold P to charge)   ↓↙← + P (214) HYDRO BURST   ←↙↓ + P (412) UNDERTOW SWEEP
//   →→ + P (a frame-counted double tap) CLAW LASH      ↓ + P (hold) PUDDLE FORM     air ↓ + P (any air Special) GEYSER DIVE
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / ↑ / → Pressure Blast,
// ← Hydro Burst, ↓ Puddle Form, → after a double tap Claw Lash. Directions are read RELATIVE TO THE OPPONENT.
export const WH_DASH_WINDOW = 14, WH_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input, face) {
  const fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= WH_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["412", "sweep"], ["214", "burst"], ["236", "blast"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= WH_MOTION_WINDOW).map(e => e.d).join("")
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
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (s.t - (s.dashTapT ?? -999) <= WH_DASH_WINDOW && (dir === "F" || !dir)) return "lash"
  if (dir === "B") return "burst"
  if (dir === "D") return "puddle"
  return "blast"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const WH_COST = { blast: 10, blastFull: 6, burst: 14, lash: 12, sweep: 12, dive: 12, ultimate: 55 }   // puddle: Goop's GP_PUDDLE.COST
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = whState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null     // the ultimate's cast (Phase 6)
function fireUltimate(f, ctx, api) { return ULT ? ULT(f, ctx, api) : false }

// ── hooks dispatched to the sections ──────────────────────────────────────────────────────────────────────────
const CONTACT = []   // onContact (f, s, target, info): a contact HE made
function onContact(f, target, info) {
  const s = whState(f); if (!s || !target) return
  for (const h of CONTACT) h(f, s, target, info || {})
}
const STRUCK = []    // struck (f, s, info): an attack that landed on him or that he blocked
function struck(f, info) {
  const s = whState(f); if (!s) return
  for (const h of STRUCK) h(f, s, info || {})
}
const DEALT = []     // damageDealt (f, s, target, raw, opts) → raw
function damageDealt(f, target, raw, opts) {
  const s = whState(f); if (!s || !(raw > 0)) return raw
  for (const fn of DEALT) raw = fn(f, s, target, raw, opts || {})
  return raw
}

// ── HUD + world overlays (render-only: read GAME_STATE, never write it) ────────────────────────────────────────
const HUD_PARTS = []   // (ctx, f, s, box) → draws one HUD row
export function drawWaterHazardHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = whState(f); if (!ctx || !s) return
  const w = Math.min(120, pbw || 120), y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  for (const p of HUD_PARTS) p(ctx, f, s, { bx, y, w, flip })
  ctx.restore()
}
export function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const FX_DRAW = []   // (c, f, s, frame, opp) render-only layers
export function drawWaterHazardFx(c, f, frame = 0, opp = null) {
  const s = whState(f); if (!s || !c) return
  for (const d of FX_DRAW) d(c, f, s, frame, opp)
}
