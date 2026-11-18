// arcticguana.js — ARCTICGUANA (Cryoreptile), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (frost mist, shards,
// ice overlays, the popsicle block, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet: docs/ben10/aliens/arcticguana/SPRITE_LEDGER.md.
import { ARCTICGUANA_ANIM, ARCTICGUANA_GEOM, ARCTICGUANA_FX, ARCTICGUANA_ICE_FX, ARCTICGUANA_ACTIVE_FRAMES } from "./arcticguanaAssets.js"
export { ARCTICGUANA_ANIM, ARCTICGUANA_GEOM, ARCTICGUANA_FX, ARCTICGUANA_ICE_FX, ARCTICGUANA_ACTIVE_FRAMES }

export const AG_KEY = "arcticguana"
const ANIM = { ...ARCTICGUANA_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const ARCTICGUANA = {
  id: AG_KEY, poolKey: AG_KEY, displayName: "Arcticguana", slot: 17,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Feedback (16)
  status: "ready", sheetPath: "./ben10_arcticguana_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/arcticguana/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.05, defense: 1.10, weight: 1.05 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Ice Breath", special2: "Ice Shard", special3: "Frost Cloud", special4: "Ice Slide",
    special5: "Freeze Beam", special6: "Icicle Drop", defense: "Frost Coat", ultimate: "Absolute Popsicle" },
  basic_attacks: {
    light:  normal(18, 5, 3, 9, 0, { rangeX: 100 }),                                            // Row 2 run frames + frost claw (render lunge)
    heavy:  normal(54, 14, 4, 22, -6, { knockbackX: 6, rangeX: 180, agShatter: true }),        // tail sweep (bend strip A), 180 px, shatters
    down:   normal(24, 7, 3, 14, -4, { hitLevel: "low", rangeX: 150 }),                        // low tail sweep (bend strip B), hits low
    up:     normal(46, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 95 }),   // head-up ice uppercut, launches
    air:    normal(28, 7, 4, 12, 2, { rangeX: 85 })                                            // Row 3 flip frame
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshArcticguanaState() {
  return { kind: AG_KEY, t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false,
    stats: { casts: 0 } }
}
export const agState = f => (f?.omnitrix?.formState?.kind === AG_KEY && f.transformed && f.activeAlien === AG_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshArcticguanaState()
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function agHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = agState(f); if (!s) return
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
function moveFrames(f, key, md) {
  const s = agState(f); if (!s) return md
  if (busy(s)) return false
  return md
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) ICE BREATH   ↓↙← + P (214) ICE SHARD   →↓↘ + P (623) FROST CLOUD   ←↙↓ + P (412) FREEZE BEAM
//   →→ + P (a frame-counted double tap) ICE SLIDE        air: ↓ + P (any air Special) ICICLE DROP (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral Ice Breath, ← Ice Shard,
// ↑ Frost Cloud, ↓ Freeze Beam, → after a double tap Ice Slide.
export const AG_DASH_WINDOW = 14, AG_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= AG_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "cloud"], ["412", "beam"], ["214", "shard"], ["236", "breath"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= AG_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "icicle"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "shard"
  if (dir === "U") return "cloud"
  if (dir === "D") return "beam"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= AG_DASH_WINDOW) return "slide"
  return "breath"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const AG_COST = { breath: 10, breathHold: 4, shard: 10, cloud: 12, slide: 12, beam: 18, icicle: 12, coat: 10, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = agState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
function fireUltimate(f, ctx, api) { return false }
