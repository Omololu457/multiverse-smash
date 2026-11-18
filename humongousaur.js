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
  onApply, tick, moveFrames, fireSpecial, fireUltimate
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshHumongousaurState() {
  return { kind: HM_KEY, t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false,
    stats: { casts: 0 } }
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
  tickInputs(f, s, input)
  s.noAttack = busy(s)
  s.spPrev = !!input.special
}
const busy = s => false
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) { const s = hmState(f); if (!s) return md; return busy(s) ? false : md }

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
function fireUltimate(f, ctx, api) { return false }
