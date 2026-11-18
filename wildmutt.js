// wildmutt.js — WILDMUTT (Vulpimancer), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Key `wildmutt_ov` (the experimental `wildmutt` entry in aliens.js is untouched).
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// A quadruped close-range hunter: claw normals and lunges are real engine MELEE moves (api.startMove → the engine's own hitbox /
// block / chip / hitstun / combo scaling); the Spin Slash is a hidden RADIAL hitbox around him (Humongousaur's / Arcticguana's
// radial-burst pattern: a 2f owner-centred projectile with `radial: true`, never drawn by the projectile layer).
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (dust, spin blur, claw
// slashes, growl burst, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet source unknown: docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md.
import { WILDMUTT_ANIM, WILDMUTT_GEOM } from "./wildmuttAssets.js"
export { WILDMUTT_ANIM, WILDMUTT_GEOM }

export const WM_KEY = "wildmutt_ov"
const ANIM = { ...WILDMUTT_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const WILDMUTT = {
  id: WM_KEY, poolKey: WM_KEY, displayName: "Wildmutt", slot: 24,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Highbreed (23)
  status: "ready", sheetPath: "./ben10_wildmutt_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md",
  mods: { speed: 1.10, damage: 1.00, defense: 1.00, weight: 1.00 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Spin Slash", special2: "Pounce", special3: "Claw Rush", special4: "Ground Shred", special5: "Scent Leap",
    defense: "Feral Curl", passive: "Omnidirectional Senses", resource: "Feral Fury", ultimate: "Primal Takedown" },
  basic_attacks: {
    light:  normal(18, 5, 3, 9, 0, { rangeX: 90 }),                                             // C → B2 jaws-open claw reach (render lunge)
    heavy:  normal(50, 13, 4, 22, -6, { knockbackX: 6, rangeX: 160 }),                         // A1 wind-up → B3 extended claw stretch, 160 px
    down:   normal(22, 7, 3, 14, -3, { hitLevel: "low", rangeX: 120 }),                        // B5 flat low claw stretch, hits low
    up:     normal(42, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 95 }),   // C → B6 rearing rise (Pounce launch), launches
    air:    normal(26, 7, 4, 12, 2, { rangeX: 85 })                                            // G7 limbs forward (render-only airborne offset)
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt, bodyOffset, targetOffset,
  drawHud: drawWildmuttHud, drawFx: drawWildmuttFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshWildmuttState() {
  return { kind: WM_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    oppDir: 1, hist: [], fwdPrev: false, backPrev: false, fwdTapT: -999, dashTapT: -999, backTapT0: -999, backTapT: -999, lastDir: 5,
    fury: 0, lastGainT: 0, frenzyT: 0, frenzyCd: 0, frenzyReadyAt: 0, frenzyUses: 0, growlT: -999,
    curl: null, curlCd: 0, curlTapT: -999,
    chain: null, spin: null, leap: null, leapUsed: false, ult: null,
    lastUlt: null, lastChain: null, lastSpin: null, lastLeap: null, lastCurl: null,
    stats: { casts: 0, spins: 0, spinHits: 0, pounces: 0, pounceHits: 0, rushes: 0, rushHits: 0, shreds: 0, shredHits: 0,
      leaps: 0, leapHits: 0, curls: 0, frenzies: 0, positionalDenied: 0 } }
}
export const wmState = f => (f?.omnitrix?.formState?.kind === WM_KEY && f.transformed && f.activeAlien === WM_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshWildmuttState()
  s.base = { walk: f._benWalkSpeed, dash: f.dashSpeed, jump: f.jumpForce }
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function wmHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // section ticks (f, s, input, api, opp), filled by the sections below, run in order
function tick(f, input, ctx, api) {
  const s = wmState(f); if (!s) return
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
// moveFrames hook (combat.startMove): his own special moves (wm_*) pass; no normals while a cast owns him; Feral Curl takes the
// Light press after ←←; FRENZY's −2f startup (Phase 4)
const MOVE_FRAMES = []   // (f, s, key, md) → false (refuse) | undefined
const MD_XFORM = []      // (f, s, key, md) → a (copied) md
function moveFrames(f, key, md) {
  const s = wmState(f); if (!s || !md) return md
  if (!/^wm_/.test(key) && busy(s)) return false
  for (const fn of MOVE_FRAMES) if (fn(f, s, key, md) === false) return false
  return MD_XFORM.reduce((m, fn) => fn(f, s, key, m), md)
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, opponent-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) SPIN SLASH (in the air: SCENT LEAP)   ↓↙← + P (214) CLAW RUSH   ←↙↓ + P (412) GROUND SHRED
//   →→ + P (a frame-counted double tap) POUNCE          ←← + Light (a frame-counted double tap) FERAL CURL
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / ↑ Spin Slash, ← Claw Rush,
// ↓ Ground Shred, → after a double tap Pounce (→ alone Spin Slash); any air Special = Scent Leap.
// Directions are read RELATIVE TO THE OPPONENT (the engine turns a fighter with his walk input; BenWolf's lesson).
export const WM_DASH_WINDOW = 14, WM_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input, face) {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= WM_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  if (back && !s.backPrev && !input.down) { if (s.t - s.backTapT0 <= WM_DASH_WINDOW) s.backTapT = s.t; s.backTapT0 = s.t }
  s.fwdPrev = fwd; s.backPrev = back
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["412", "shred"], ["214", "rush"], ["236", "spin"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= WM_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "leap"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (s.t - (s.dashTapT ?? -999) <= WM_DASH_WINDOW && (dir === "F" || !dir)) return "pounce"
  if (dir === "B") return "rush"
  if (dir === "D") return "shred"
  return "spin"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const WM_COST = { spin: 12, pounce: 12, rush: 10, shred: 14, leap: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = wmState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null     // the ultimate's cast (Phase 5)
function fireUltimate(f, ctx, api) { return ULT ? ULT(f, ctx, api) : false }

// ── hooks dispatched to the sections ──────────────────────────────────────────────────────────────────────────
const CONTACT = []   // onContact (f, s, target, info): a contact HE made (melee move or his hidden radial hitbox)
function onContact(f, target, info) {
  const s = wmState(f); if (!s || !target) return
  for (const h of CONTACT) h(f, s, target, info || {})
}
const STRUCK = []    // struck (f, s, info): an attack that landed on him or that he blocked
function struck(f, info) {
  const s = wmState(f); if (!s) return
  for (const h of STRUCK) h(f, s, info || {})
}
const DEALT = []     // damageDealt multipliers (f, s, target, raw, opts) → raw
function damageDealt(f, target, raw, opts) {
  const s = wmState(f); if (!s || !(raw > 0)) return raw
  for (const fn of DEALT) raw = fn(f, s, target, raw, opts || {})
  return raw
}
const BODY_OFF = []  // render-only body draw offsets (f, s) → { dx, dy } | null
function bodyOffset(f) {
  const s = wmState(f); if (!s) return null
  for (const fn of BODY_OFF) { const o = fn(f, s); if (o) return o }
  return null
}
const TARGET_OFF = []   // render-only offsets of the opponent he holds (f, s, t) → { dx, dy } | null
function targetOffset(f, t) {
  const s = wmState(f); if (!s) return null
  for (const fn of TARGET_OFF) { const o = fn(f, s, t); if (o) return o }
  return null
}

// ── HUD + world overlays (render-only: read GAME_STATE, never write it) ────────────────────────────────────────
const HUD_PARTS = []   // (ctx, f, s, box) → draws one HUD row
export function drawWildmuttHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = wmState(f); if (!ctx || !s) return
  const w = Math.min(120, pbw || 120), y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  for (const p of HUD_PARTS) p(ctx, f, s, { bx, y, w, flip })
  ctx.restore()
}
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const FX_DRAW = []   // (c, f, s, frame, opp) render-only layers
export function drawWildmuttFx(c, f, frame = 0, opp = null) {
  const s = wmState(f); if (!s || !c) return
  for (const d of FX_DRAW) d(c, f, s, frame, opp)
}

// ── NORMALS: render-only lunge on the Jab / Heavy (the body draw offset; never collision) ─────────────────────
BODY_OFF.push((f, s) => {
  const a = f.attacking && f.currentAttack; if (!a) return null
  const el = (a.total || 0) - (a.timer || 0), face = f.facing || 1
  if (a.name === "light") return { dx: face * Math.min(10, el * 2), dy: 0 }
  if (a.name === "heavy") return { dx: face * Math.max(0, Math.min(18, (el - 8) * 3)), dy: 0 }
  if (a.name === "air") return { dx: 0, dy: -6 }
  return null
})
