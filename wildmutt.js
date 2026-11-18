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
  tags: ["noPositionalBonus"],                  // OMNIDIRECTIONAL SENSES (Phase 3; ben10State.benNoPositionalBonus / benPositionalBehind)
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
      leaps: 0, leapHits: 0, curls: 0, frenzies: 0 } }
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

// ── 3. OMNIDIRECTIONAL SENSES (passive) ──────────────────────────────────────────────────────────────────────────
// Canon: no eyes, no visible ears — he perceives by smell, sound and the spines on his back, all around him. Implemented as the
// tag "noPositionalBonus" on HIS registry entry (above), read by the generic ben10-gated helpers in ben10State.js:
// benNoPositionalBonus(f) / benPositionalBehind(attacker, target). Any mechanic that grants a bonus because the attacker is
// BEHIND the target (a cross-up launch, a blind-spot modifier, a "can't react in time" tag) asks them and gets "not behind"
// against him. Only the positional EXTRA is removed: a hit landing behind him still deals its normal, unmodified damage, still
// combos, still hitstuns, can still be blocked or not exactly like any hit (the engine's guard is not facing-based). The one
// existing bonus in the game today, Kakashi's Sennen Goroshi cross-up launch, routes its facing test through the helper (the
// identical math for everyone else). No state: nothing here is GAME_STATE, nothing is stored or timed. Later aliens' and
// characters' cross-up style bonuses must use the helper (docs/ben10/ADD_ALIEN.md).
export const WM_SENSES_TAG = "noPositionalBonus"

// ── NORMALS: render-only lunge on the Jab / Heavy (the body draw offset; never collision) ─────────────────────
BODY_OFF.push((f, s) => {
  const a = f.attacking && f.currentAttack; if (!a) return null
  const el = (a.total || 0) - (a.timer || 0), face = f.facing || 1
  if (a.name === "light") return { dx: face * Math.min(10, el * 2), dy: 0 }
  if (a.name === "heavy") return { dx: face * Math.max(0, Math.min(18, (el - 8) * 3)), dy: 0 }
  if (a.name === "air") return { dx: 0, dy: -6 }
  return null
})

// ── 4. FERAL FURY (his unique resource, GAME_STATE) ──────────────────────────────────────────────────────────────
// A 0–100 gauge, shown under Omnitrix Power while he is active; starts at 0. Landing a hit +6 (blocked +3) — every contact HE
// makes (onContact: normals, his melee specials and the hidden Spin Slash boxes). −1/f after 150f with no gain.
// At 100 → FRENZY for 180f, CONSUMING the full gauge (Fury 0 while it runs; no gain during it): move startup −2f (min 1f) on his
// normals and the first beat of each special, damage +15% (never on his ultimate, a fixed authored total). It is NOT armor. It
// ends into a 240f COOLDOWN where gains are halved; FRENZY can only trigger again 600f after the moment it ended (a full gauge
// waits at 100 meanwhile — still decaying after 150f idle — and fires the frame it becomes available). Swap / revert / KO / rematch: a fresh formState (Fury, the
// FRENZY window and the cooldown all cleared). Deterministic: plain counters on his formState.
export const WM_FURY = { MAX: 100, HIT: 6, HIT_BLOCKED: 3, IDLE: 150, DECAY: 1, FRENZY_T: 180, CUT: 2, DMG: 1.15, CD: 240, CD_GAIN: 0.5, REUSE: 600 }
export const frenzyOn = s => !!(s && s.frenzyT > 0)
function startFrenzy(f, s) {
  s.fury = 0; s.frenzyT = WM_FURY.FRENZY_T; s.frenzyUses++; s.stats.frenzies++; s.growlT = s.t
}
export function gainFury(f, s, amount) {
  if (!s || !(amount > 0) || frenzyOn(s)) return 0
  const before = s.fury
  s.fury = Math.min(WM_FURY.MAX, s.fury + amount * (s.frenzyCd > 0 ? WM_FURY.CD_GAIN : 1)); s.lastGainT = s.t
  const got = s.fury - before
  if (s.fury >= WM_FURY.MAX && s.t >= s.frenzyReadyAt) startFrenzy(f, s)
  return got
}
export function endFrenzy(f, s) {
  if (!frenzyOn(s)) return
  s.frenzyT = 0; s.frenzyCd = WM_FURY.CD; s.frenzyReadyAt = s.t + WM_FURY.REUSE
}
TICKS.push((f, s) => {
  if (s.frenzyT > 0) { if (--s.frenzyT <= 0) { s.frenzyT = 1; endFrenzy(f, s) } return }
  if (s.frenzyCd > 0) s.frenzyCd--
  if (s.fury >= WM_FURY.MAX && s.t >= s.frenzyReadyAt) { startFrenzy(f, s); return }
  if (s.fury > 0 && s.t - s.lastGainT >= WM_FURY.IDLE) s.fury = Math.max(0, s.fury - WM_FURY.DECAY)
})
CONTACT.push((f, s, target, { blocked }) => { gainFury(f, s, blocked ? WM_FURY.HIT_BLOCKED : WM_FURY.HIT) })
// his own ultimate's damage is a fixed authored total: never boosted (melee damage opts carry no move: read his live move)
const isUltHit = (opts, f) => { const m = opts.move, p = opts.proj, n = typeof m === "string" ? m : (m && m.name) || (p && p.name) ||
  ((opts.source === "melee" || opts.source === "block-chip") && f && f.currentAttack ? f.currentAttack.name : ""); return /^wm_ult/.test(String(n || "")) }
DEALT.push((f, s, target, raw, opts) => (frenzyOn(s) && !isUltHit(opts, f) ? raw * WM_FURY.DMG : raw))
MD_XFORM.push((f, s, key, md) => (frenzyOn(s) && !md.wmFollow ? { ...md, startup: Math.max(1, (md.startup ?? 5) - WM_FURY.CUT) } : md))
export const startupOf = (s, n) => Math.max(1, n - (frenzyOn(s) ? WM_FURY.CUT : 0))   // his own scheduled beats (Spin Slash)

// render-only: the Fury gauge under the Omnitrix bar (orange; FRENZY flashes red with its time left; the cooldown greys it)
const FUR = "#fc9225", FURD = "#c27330", RED = "#dc2626", WHITE = "#f8fafc", INK = "#1b1b1f", OUT = "#4a2500"
HUD_PARTS.push((ctx, f, s, { bx, y, w, flip }) => {
  const h = 5, on = frenzyOn(s), fill = on ? s.frenzyT / WM_FURY.FRENZY_T : s.fury / WM_FURY.MAX
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
  ctx.fillStyle = s.frenzyCd > 0 && !on ? "#6b7280" : on ? ((s.t >> 2) % 2 ? WHITE : RED) : s.fury >= WM_FURY.MAX ? RED : FUR
  const fw = Math.round(w * Math.max(0, Math.min(1, fill))); ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
  const label = on ? `FRENZY ${Math.ceil(s.frenzyT / 60)}s` : s.frenzyCd > 0 ? "FURY COOLDOWN" : "FERAL FURY"
  ctx.font = "bold 8px monospace"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = on ? WHITE : "#fdba74"; ctx.fillText(label, flip ? bx + w : bx, y + h + 2)
})
// render-only: FRENZY = bristling red pixels along his spine + a growl burst (two expanding pixel arcs) when it starts
FX_DRAW.push((c, f, s, frame) => {
  const x0 = f.x, y0 = f.y, w = f.w || 96, h = f.h || 76
  c.save()
  if (frenzyOn(s)) {
    c.globalAlpha = 0.5 + 0.3 * ((frame >> 2) % 2); c.fillStyle = RED
    for (let i = 0; i < 7; i++) { const ph = (frame + i * 7) % 12; px(c, x0 + 8 + i * (w - 16) / 6, y0 + 4 - ph, 3) }
  }
  const age = s.t - s.growlT
  if (age >= 0 && age < 24) {
    c.globalAlpha = 1 - age / 24; c.fillStyle = WHITE
    for (const r0 of [age * 5 + 10, age * 3 + 4]) for (let k = 0; k < 14; k++) { const an = -Math.PI * (k / 13); px(c, cx(f) + Math.cos(an) * r0, y0 + h * 0.4 + Math.sin(an) * r0 * 0.7, 4) }
  }
  c.restore()
})

// ── 5. MOVES ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Claw / lunge specials are CHAINS of real engine melee moves (api.startMove → combat.js resolves the box in front of him, the
// block / chip / hitstun / combo scaling / onContact, exactly like a normal; category "special"). The Spin Slash is a hidden
// RADIAL box centred on him (the radial-burst pattern of Humongousaur's Roar / Arcticguana's coat burst): `radial: true`
// + `radius`, a 2f owner projectile tagged alien.hidden (the projectile layer never draws it; 2f because a 1f box can expire
// before the projectile pass in the live game). Travel is REAL (the shared `_benLunge`, stage-clamped by physics), the
// direction and the target point are fixed at the cast: no tracking afterwards.
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + onBlock)
function canAct(f, s) {
  return f.transformed && f.activeAlien === WM_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
const pose = (f, name, left) => { f._spriteCastMove = name; f._spriteCastTimer = Math.max(2, left) }
function beginCast(f, s, api, cost) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  if (s.oppDir) f.facing = s.oppDir                                          // every cast faces the opponent
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.castId++; s.stats.casts++
  return s.castId
}
const clampX = (s, o, x) => Math.max(s.stage.L, Math.min(s.stage.R - (o.w || 60), x))
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, lifetime: 2, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
// one engine melee step: (key, damage, startup, active, recovery, extra) — pre-mod numbers; the box reaches rangeX in front
const step = (key, damage, startup, active, recovery, extra = {}) => ({ key, md: { damage, startup, active, recovery, frameExact: true,
  isSpecial: true, category: "special", rangeY: 80, hitstun: 20, knockbackX: 2, knockbackY: 0, ...extra } })
BUSY.push(s => !!(s.chain || s.spin || s.leap || s.curl || s.ult))

// THE CHAIN RUNNER (Rath's): steps start back-to-back (frameExact moves end with 0 cooldown); a step marked `needContact` only
// comes out if the previous one connected or was blocked. `lunge` = the shared `_benLunge` real travel from the step's first active
// frame (so FRENZY's earlier startup moves the travel with it); `stopOnContact` ends the travel at the first contact and leaves exactly `afterContact` frames of the step.
// A hit that flinches him ends the chain. A chain that never touched anything recovers `whiff` frames.
function startChain(f, s, api, kind, cast, steps, poseName, whiff = 0) {
  s.chain = { kind, cast, face: f.facing || 1, i: 0, stepT: 0, t: 0, steps, contacts: [], pose: poseName, whiff, why: null, x0: f.x }
  s.stats[{ pounce: "pounces", rush: "rushes", shred: "shreds" }[kind]]++
  return nextStep(f, s, api)
}
function nextStep(f, s, api) {
  const c = s.chain, st = c.steps[c.i]
  if (st.needContact && !c.contacts.some(k => k.key === c.steps[c.i - 1].key)) { endChain(f, s, "whiff", c.whiff); return true }
  if (!api.startMove(f, st.key, st.md)) { endChain(f, s, "refused"); return false }
  c.i++; c.stepT = 0
  return true
}
function endChain(f, s, why, recover = 0) {
  const c = s.chain; if (!c) return
  s.lastChain = { kind: c.kind, why, contacts: c.contacts.map(k => ({ ...k })), steps: c.i, t: c.t, travel: f.x - c.x0 }
  s.chain = null; delete f._benLunge
  if (recover > 0) { f.attackCooldown = Math.max(f.attackCooldown || 0, recover); f._benPowerCommit = Math.max(f._benPowerCommit || 0, recover); pose(f, "idle", recover) }
  else if (why !== "done") { f._spriteCastMove = null; f._spriteCastTimer = 0 }
}
TICKS.push((f, s, input, api) => {
  const c = s.chain; if (!c) return
  c.t++; c.stepT++
  if ((f.hitstun || 0) > 0 || f.knockdownState) { endChain(f, s, "hit"); return }
  const st = c.steps[c.i - 1]
  if (f.attacking && f.currentAttack && st && f.currentAttack.name === st.key) {
    const lungeAt = st.lunge ? (st.lunge.at ?? f.currentAttack.activeStart ?? 0) : -1
    if (st.lunge && c.stepT === lungeAt + 1 && !c.contacts.some(k => k.key === st.key)) f._benLunge = { speed: st.lunge.speed, frames: st.lunge.frames }
    pose(f, st.pose || c.pose, 2); return
  }
  if (c.i < c.steps.length) { nextStep(f, s, api); if (s.chain) pose(f, c.steps[c.i - 1].pose || c.pose, 2); return }
  if (c.whiff && !c.contacts.length) { endChain(f, s, "whiff", c.whiff); return }
  endChain(f, s, "done")
})
CONTACT.unshift((f, s, target, { move, blocked }) => {                     // step bookkeeping (before the Fury gain)
  const n = move && move.name, c = s.chain; if (!n || !c) return
  const st = c.steps.find(q => q.key === n); if (!st) return
  c.contacts.push({ key: n, blocked: !!blocked })
  if (!blocked) { if (c.kind === "pounce") s.stats.pounceHits++; if (c.kind === "rush") s.stats.rushHits++; if (c.kind === "shred") s.stats.shredHits++ }
  if (st.stopOnContact) { delete f._benLunge; if (f.currentAttack) f.currentAttack.timer = Math.min(f.currentAttack.timer, st.afterContact) }
  if (st.knockdown && !blocked && !target.knockdownState && !target.eliminated) s.kdAt = { at: s.t + 1, kd: st.knockdown }
})
TICKS.push((f, s, input, api, opp) => {                                       // the Pounce knockdown (the frame after the hit)
  const k = s.kdAt; if (!k || s.t < k.at) return
  s.kdAt = null
  if (opp && !opp.eliminated && !opp.knockdownState) { opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, k.kd) }
})
// travel toward the opponent's x AT CAST TIME, bounded: { dist, frames, speed } (the number never changes after the cast)
function castTravel(f, opp, max, pxPerF, face) {
  const gap = opp ? Math.abs(cx(opp) - cx(f)) - ((f.w || 96) + (opp.w || 60)) / 2 + 8 : max
  const dist = Math.max(0, Math.min(max, gap)), frames = Math.max(2, Math.ceil(dist / pxPerF))
  return { dist, frames, speed: face * dist / frames, tx: opp ? cx(opp) : null }
}

// 1. SPIN SLASH (↓↘→ + P, 12) — C → L1 into the spiral cycle S1–S8: a radial spin AROUND him, radius 140 px, 16f startup, 3 hits
//    of 14 = 42 to anything inside, on ALL sides (no facing requirement — his senses), −12 on block. He spins in place.
export const WM_SPIN = { STARTUP: 16, HITS: [14, 14, 14], GAP: 6, R: 140, RECOVERY: 18, ON_BLOCK: -12 }
const spinTotal = st => st + WM_SPIN.GAP * (WM_SPIN.HITS.length - 1) + 2 + WM_SPIN.RECOVERY
function castSpin(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, WM_COST.spin); if (cast == null) return false
  const st = startupOf(s, WM_SPIN.STARTUP), total = spinTotal(st)
  s.spin = { t: 0, st, total, cast, hits: 0, blocked: 0, spawned: 0 }; s.stats.spins++
  f.vx = 0; f.attackCooldown = total; f._benPowerCommit = total
  pose(f, "wmSpinIn", st)
  return true
}
CASTS.spin = castSpin
TICKS.push((f, s, input, api, opp) => {
  const r = s.spin; if (!r) return
  r.t++
  if ((f.hitstun || 0) > 0) { s.lastSpin = { hits: r.hits, blocked: r.blocked, spawned: r.spawned, why: "hit" }; s.spin = null; return }
  const k = r.t - r.st
  if (k >= 0 && k % WM_SPIN.GAP === 0 && k / WM_SPIN.GAP < WM_SPIN.HITS.length) {
    const i = k / WM_SPIN.GAP, last = i === WM_SPIN.HITS.length - 1, rem = r.total - r.t
    const dir = opp && cx(opp) < cx(f) ? -1 : 1
    hitbox(f, api, "wm_spin", dir, { damage: WM_SPIN.HITS[i], spawnX: cx(f), spawnY: f.y + (f.h || 76) / 2, radius: WM_SPIN.R, radial: true, rectHitbox: false,
      w: WM_SPIN.R * 2, h: WM_SPIN.R * 2, hitstun: last ? 22 : 16, blockstun: last ? blockstunFor(rem, WM_SPIN.ON_BLOCK) : WM_SPIN.GAP + 6,
      knockbackX: last ? 5 : 0.5, knockbackY: 0, alien: { wm: "spin", cast: r.cast, i } })
    r.spawned++
  }
  pose(f, r.t < r.st ? "wmSpinIn" : r.t < r.total - WM_SPIN.RECOVERY + 6 ? "wmSpin" : "idle", 2)
  if (r.t >= r.total) { s.lastSpin = { hits: r.hits, blocked: r.blocked, spawned: r.spawned, why: "done" }; s.spin = null }
})
CONTACT.unshift((f, s, target, { proj, blocked }) => {
  const tag = proj && proj.alien; if (!tag || tag.wm !== "spin" || !s.spin || s.spin.cast !== tag.cast) return
  if (blocked) s.spin.blocked++; else { s.spin.hits++; s.stats.spinHits++ }
})

// 2. POUNCE (→→ + P, 12) — C → L1 airborne → L2 claws-down: a LOW lunge to the opponent's position AT CAST TIME (max 340 px,
//    no tracking after), 14f startup, 50, knockdown, −14 on block, 22f whiff recovery. The lunge stops on contact.
export const WM_POUNCE = { STARTUP: 14, MAX: 340, SPEED: 22, DMG: 50, AFTER: 21, ON_BLOCK: -14, WHIFF: 22, KD: 50, REACH: 70 }
function castPounce(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, WM_COST.pounce); if (cast == null) return false
  const P = WM_POUNCE, opp = api.getOpponent ? api.getOpponent(f) : null, tr = castTravel(f, opp, P.MAX, P.SPEED, f.facing || 1)
  s.lastPounceTravel = { dist: tr.dist, tx: tr.tx, x0: f.x }
  return startChain(f, s, api, "pounce", cast, [
    { ...step("wm_pounce", P.DMG, P.STARTUP, tr.frames + 2, 0, { rangeX: P.REACH, hitLevel: "low", hitstun: 30, knockbackX: 4, knockbackY: -3,
      blockstun: blockstunFor(P.AFTER, P.ON_BLOCK) }), lunge: { speed: tr.speed, frames: tr.frames }, stopOnContact: true, afterContact: P.AFTER, knockdown: P.KD }
  ], "wmPounce", P.WHIFF)
}
CASTS.pounce = castPounce

// 3. CLAW RUSH (↓↙← + P, 10) — B3 → B4 (fur speed blur) → B5: a quick running slash, 300 px of REAL travel (no tracking), 2 hits
//    16 / 22 = 38 (the run stops at the first contact, the second slash follows; a whiff runs the full 300 px), −11 on block.
export const WM_RUSH = { STARTUP: 10, TRAVEL: 300, SPEED: 20, HITS: [16, 22], AFTER: 3, GAP: 4, RECOVERY: 18, ON_BLOCK: -11, WHIFF: 20 }
function castRush(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, WM_COST.rush); if (cast == null) return false
  const R = WM_RUSH, run = R.TRAVEL / R.SPEED, face = f.facing || 1
  return startChain(f, s, api, "rush", cast, [
    { ...step("wm_rush_1", R.HITS[0], R.STARTUP, run + 1, 0, { rangeX: 60, hitstun: 22, knockbackX: 0.5, blockstun: R.AFTER + R.GAP + 6 }),
      lunge: { speed: face * R.SPEED, frames: run }, stopOnContact: true, afterContact: R.AFTER },
    { ...step("wm_rush_2", R.HITS[1], R.GAP, 3, R.RECOVERY, { rangeX: 100, wmFollow: true, hitstun: 24, knockbackX: 6, blockstun: blockstunFor(3 + R.RECOVERY, R.ON_BLOCK) }), needContact: true }
  ], "wmRush", R.WHIFF)
}
CASTS.rush = castRush

// 4. GROUND SHRED (←↙↓ + P, 14) — the second spiral row R1–R6 low along the floor: a low spinning claw sweep, 220 px of REAL
//    travel, 2 hits 18 / 24 = 42, both hit LOW, −13 on block (the sweep stops at the first contact, the second follows).
export const WM_SHRED = { STARTUP: 12, TRAVEL: 220, SPEED: 20, HITS: [18, 24], AFTER: 3, GAP: 4, RECOVERY: 20, ON_BLOCK: -13, WHIFF: 20 }
function castShred(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, WM_COST.shred); if (cast == null) return false
  const R = WM_SHRED, run = R.TRAVEL / R.SPEED, face = f.facing || 1
  return startChain(f, s, api, "shred", cast, [
    { ...step("wm_shred_1", R.HITS[0], R.STARTUP, run + 1, 0, { rangeX: 70, rangeY: 50, hitLevel: "low", hitstun: 22, knockbackX: 0.5, blockstun: R.AFTER + R.GAP + 6 }),
      lunge: { speed: face * R.SPEED, frames: run }, stopOnContact: true, afterContact: R.AFTER },
    { ...step("wm_shred_2", R.HITS[1], R.GAP, 3, R.RECOVERY, { rangeX: 100, rangeY: 50, hitLevel: "low", wmFollow: true, hitstun: 26, knockbackX: 6,
      blockstun: blockstunFor(3 + R.RECOVERY, R.ON_BLOCK) }), needContact: true }
  ], "wmSpinB", R.WHIFF)
}
CASTS.shred = castShred

// 5. SCENT LEAP (air ↓↘→ + P — any air Special; 12) — L1 → G7: a diagonal pounce-dive toward the opponent's x AT CAST TIME
//    (bounded: at most 300 px of drift, at most 12 px/f), 48 on the body hit (one engine melee move), once per airtime, no jump
//    refill. 12f landing.
export const WM_LEAP = { STARTUP: 4, VY: 11, MAXV: 12, MAXDX: 300, MAX: 40, DMG: 48, LAND: 12 }
function castLeap(f, s, api) {
  if (grounded(f) || s.leapUsed) return false
  const cast = beginCast(f, s, api, WM_COST.leap); if (cast == null) return false
  const L = WM_LEAP, opp = api.getOpponent ? api.getOpponent(f) : null
  const groundY = Number.isFinite(f.groundY) ? f.groundY : 410
  const fall = Math.max(4, (groundY - (f.y + (f.h || 76))) / L.VY)
  const dx = opp ? Math.max(-L.MAXDX, Math.min(L.MAXDX, cx(opp) - cx(f))) : 0
  const vx = Math.max(-L.MAXV, Math.min(L.MAXV, dx / fall))
  if (!api.startMove(f, "wm_leap", step("wm_leap", L.DMG, L.STARTUP, L.MAX, 0, { rangeX: 60, rangeY: 90, hitstun: 26, knockbackX: 4, knockbackY: -5, blockstun: 12 }).md)) return false
  s.leapUsed = true; s.stats.leaps++
  s.leap = { t: 0, st: L.STARTUP, cast, vx, tx: opp ? cx(opp) : null, lastY: f.y, hit: false, jumps: f.jumpCount }
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
CASTS.leap = castLeap
TICKS.push((f, s) => {
  if (grounded(f) && !s.leap) s.leapUsed = false                             // once per airtime
  const d = s.leap; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endLeap(f, s, false); return }
  if (d.t <= d.st) { f._benGlide = { vx: 0, vy: 0 }; pose(f, "wmLeap", 2); return }
  const landed = d.t > d.st + 1 && (f.y === d.lastY || grounded(f))
  d.lastY = f.y
  if (landed || d.t >= d.st + WM_LEAP.MAX) { endLeap(f, s, landed); return }
  f._benGlide = { vx: d.vx, vy: WM_LEAP.VY }
  pose(f, "wmLeap", 2)
})
function endLeap(f, s, landed) {
  const d = s.leap; s.leap = null; delete f._benGlide
  if (f.attacking && f.currentAttack && f.currentAttack.name === "wm_leap") { f.attacking = false; f.currentAttack = null }
  if (landed) { f.attackCooldown = WM_LEAP.LAND; f._benPowerCommit = WM_LEAP.LAND; pose(f, "crouch", WM_LEAP.LAND) }
  else { f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastLeap = { landed, hit: d.hit, jumps: d.jumps, vx: d.vx, tx: d.tx }
}
CONTACT.unshift((f, s, target, { move, blocked }) => {
  if (!move || move.name !== "wm_leap" || !s.leap) return
  s.leap.hit = true; if (!blocked) s.stats.leapHits++
})

// DEFENSE: FERAL CURL (←← + Light): no cost, he curls into the huddle — i-frames on frames 4–10, 5 s cooldown. The ←← double
// tap + the Light press arrive through moveFrames (Jetray's Barrel Roll / BenWolf's Lupine Dodge input): the jab never comes out.
// Ordinary guard otherwise; no armor anywhere in his kit (FRENZY's startup bonus is not armor).
export const WM_CURL = { TOTAL: 18, IFROM: 4, ITO: 10, CD: 300 }
export function castCurl(f, s) {
  if (s.curlCd > 0 || !canAct(f, s) || !grounded(f)) return false
  s.curlTapT = s.backTapT
  s.curl = { t: 0 }; s.curlCd = WM_CURL.CD; s.stats.curls++
  f.attackCooldown = WM_CURL.TOTAL; f._benPowerCommit = WM_CURL.TOTAL; f.vx = 0
  pose(f, "wmCurl", WM_CURL.TOTAL)
  return true
}
MOVE_FRAMES.push((f, s, key) => (key === "light" && s.t - s.backTapT <= WM_DASH_WINDOW && s.backTapT > s.curlTapT && castCurl(f, s) ? false : undefined))
TICKS.push((f, s) => {
  if (s.curlCd > 0) s.curlCd--
  const r = s.curl; if (!r) return
  r.t++
  if (r.t === WM_CURL.IFROM) f.invulnTimer = Math.max(f.invulnTimer || 0, WM_CURL.ITO - WM_CURL.IFROM + 1)   // frames 4–10
  pose(f, "wmCurl", 2)
  if (r.t >= WM_CURL.TOTAL) { s.lastCurl = { t: r.t }; s.curl = null }
})

// ── the moves' render-only FX (the radial boxes are hidden; nothing here is GAME_STATE or collides) ─────────────────
const CLAW = "#e5e7eb", GREY = "#666666"
// a pixel claw slash: three parallel stepped arcs (procedural; no slash art exists on the sheet)
function clawSlash(c, x, y, face, size, frame) {
  c.save(); c.fillStyle = (frame & 2) ? CLAW : WHITE
  for (let line = 0; line < 3; line++) for (let i = 0; i <= 6; i++) {
    const an = -0.9 + i * 0.3, r = size + line * 6
    px(c, x + face * Math.cos(an) * r * 0.5, y + Math.sin(an) * r * 0.6 + line * 4 - 10, 3)
  }
  c.restore()
}
const dust = (c, f, face, frame) => { c.save(); c.globalAlpha = 0.55; c.fillStyle = "#c8a878"; for (let i = 1; i <= 4; i++) px(c, cx(f) - face * (i * 16 + (frame % 4)), f.y + (f.h || 76) - 3 - (i % 2) * 3, 8 - i); c.restore() }
FX_DRAW.push((c, f, s, frame) => {
  const face = f.facing || 1, h = f.h || 76, w = f.w || 96, a = f.attacking && f.currentAttack
  if (a) {
    const el = (a.total || 0) - (a.timer || 0), act = el >= (a.activeStart || 0) && el <= (a.activeEnd ?? 0)
    if (act && ["light", "heavy", "down", "air", "wm_rush_2", "wm_pounce", "wm_leap"].includes(a.name))
      clawSlash(c, cx(f) + face * (w / 2 + (a.name === "heavy" ? 60 : 30)), f.y + h * (a.name === "down" ? 0.8 : 0.45), face, a.name === "heavy" ? 46 : 32, frame)
    if (/^wm_(rush|shred|pounce)/.test(a.name) && f._benLunge) dust(c, f, face, frame)
  }
  if (s.spin && s.spin.t >= s.spin.st) {                                     // the spin blur: a stepped pixel ring at the radius
    c.save(); c.globalAlpha = 0.35; c.fillStyle = (frame & 2) ? FUR : CLAW
    for (let k = 0; k < 20; k++) { const an = k / 20 * Math.PI * 2 + frame * 0.5; px(c, cx(f) + Math.cos(an) * WM_SPIN.R, f.y + h / 2 + Math.sin(an) * WM_SPIN.R * 0.35, 4) }
    c.restore()
  }
  if (s.curl && s.curl.t >= WM_CURL.IFROM && s.curl.t <= WM_CURL.ITO) { c.save(); c.globalAlpha = 0.5; c.fillStyle = WHITE; for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2; px(c, cx(f) + Math.cos(an) * 34, f.y + h * 0.6 + Math.sin(an) * 22, 3) } c.restore() }
})

// ── ULTIMATE: PRIMAL TAKEDOWN (the Omnitrix Overload input; 55 Power) ──────────────────────────────────────────────────
// Needs a CLEAN OPENER: a Pounce-style lunge (an engine melee move, category ultimate; toward the opponent's x at cast time,
// max 300 px) — 40. A whiff or a block: no cinematic, 60f recovery. On a clean hit, the existing capture pattern:
//  1. he pins the opponent to the ground (L2 claws-down; render-only, both fighters stay readable) and spins up;
//  2. FERAL BARRAGE: 4 spin passes × 20 = 80 with the spiral frames, each at an angle hash(match seed, start frame, player
//     index, pass) — the angle only places the render-only spin blur around them (bodyOffset); it never moves a hitbox;
//  3. the finisher: the Heavy frames drawn scaled up (×1.35, the sprite's formState.renderScale read — a derived, non-serialised
//     getter, never GAME_STATE) slam down: 120, knockdown.
// Total 240 unscaled (40 + 80 + 120), never boosted by FRENZY. Afterwards Fury = 0, positions restore, no persistent hazard, 100f
// recovery lockout. The spin blur has no hitbox and nothing in GAME_STATE beyond the cinematic's own counters.
export const WM_ULT = { OPEN_ST: 12, OPENER: 40, MAX: 300, SPEED: 25, REACH: 70, WHIFF: 60, PIN_T: 14, PASS_AT: [22, 34, 46, 58], PASS: 20,
  WIND_AT: 66, FINAL_AT: 82, FINAL: 120, END: 98, LOCKOUT: 100, KD: 60, ZOOM: 0.85, SCALE: 1.35, ORBIT: 46 }
function firePrimalTakedown(f, ctx, api) {
  const s = wmState(f); if (!s || !canAct(f, s)) return false
  if (!api.spendEnergy(f, WM_COST.ultimate)) return false
  s.castId++
  if (s.oppDir) f.facing = s.oppDir
  const face = f.facing || 1, opp = api.getOpponent ? api.getOpponent(f) : null, tr = castTravel(f, opp, WM_ULT.MAX, WM_ULT.SPEED, face)
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  const ok = api.startMove(f, "wm_ult_open", { damage: WM_ULT.OPENER, startup: WM_ULT.OPEN_ST, active: tr.frames + 2, recovery: 0, frameExact: true,
    isUltimate: true, category: "ultimate", rangeX: WM_ULT.REACH, rangeY: 80, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, wmFollow: true })
  if (!ok) { f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + WM_COST.ultimate); return false }
  s.ult = { phase: "opener", t: 0, face, raw: 0, hits: [], cast: s.castId, seed: (ctx?.seed ?? 1) >>> 0, f0: ctx?.frame ?? s.t, pi: pIndex(f), contact: null,
    lunge: { speed: tr.speed, frames: tr.frames } }
  pose(f, "wmPounce", WM_ULT.OPEN_ST + tr.frames)
  return true
}
ULT = firePrimalTakedown
function ultMiss(f, s, why) {                                                // whiff / block: no cinematic, 60f recovery
  s.lastUlt = { captured: false, why, raw: 0 }; s.ult = null; delete f._benLunge
  if (f.attacking && f.currentAttack && f.currentAttack.name === "wm_ult_open") { f.attacking = false; f.currentAttack = null }
  f.attackCooldown = Math.max(f.attackCooldown || 0, WM_ULT.WHIFF); f._benPowerCommit = Math.max(f._benPowerCommit || 0, WM_ULT.WHIFF); pose(f, "idle", WM_ULT.WHIFF)
}
function startCapture(f, s, target) {
  const u = s.ult
  delete f._benLunge
  u.phase = "pin"; u.t = 0; u.raw = WM_ULT.OPENER; u.hits.push(WM_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  if (f.attacking && f.currentAttack && f.currentAttack.name === "wm_ult_open") { f.attacking = false; f.currentAttack = null }
  f.attackCooldown = WM_ULT.END + WM_ULT.LOCKOUT; f._benPowerCommit = WM_ULT.END; f._spriteCastTimer = WM_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, WM_ULT.END + 2)
}
// pure: the barrage passes of one cast (render + tests share them; the same seed → the same angles)
export function ultPasses(seed, frame0, pi) {
  return WM_ULT.PASS_AT.map((at, i) => ({ at, ang: Math.floor(wmHash(seed, frame0, pi, i) * 360) }))
}
TICKS.push((f, s, input, api, opp) => {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") {
    u.t++
    if (u.contact) { if (u.contact.blocked || !opp || opp.eliminated) ultMiss(f, s, "blocked"); else startCapture(f, s, opp); return }
    if (!(f.attacking && f.currentAttack && f.currentAttack.name === "wm_ult_open")) { ultMiss(f, s, (f.hitstun || 0) > 0 ? "hit" : "whiff"); return }
    if (u.t === WM_ULT.OPEN_ST + 1) f._benLunge = { speed: u.lunge.speed, frames: u.lunge.frames }
    pose(f, "wmPounce", 2); return
  }
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  if (u.t === 1) api?.focusCamera?.(f, opp, WM_ULT.ZOOM, WM_ULT.END)       // render-only framing
  opp.hitstun = Math.max(opp.hitstun || 0, 4); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
  f.vx = 0; f.vy = 0
  const hit = (dmg, shake, move) => { api.applyScaledDamage(opp, dmg, { attacker: f, move, source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 10) }
  f.x = clampX(s, f, u.thome.x + (opp.w || 60) / 2 - (f.w || 96) / 2 - u.face * 10); f.y = u.home.y
  if (u.t < WM_ULT.PIN_T) { u.phase = "pin"; f._spriteCastMove = "wmPin" }
  else if (u.t < WM_ULT.WIND_AT) {
    u.phase = "barrage"; f._spriteCastMove = "wmSpin"
    const k = WM_ULT.PASS_AT.indexOf(u.t); if (k >= 0) hit(WM_ULT.PASS, 4 + k, "wm_ult_pass")
  } else if (u.t <= WM_ULT.FINAL_AT) {
    u.phase = "final"; f._spriteCastMove = "wmUltFinal"
    if (u.t === WM_ULT.FINAL_AT) hit(WM_ULT.FINAL, 18, "wm_ult_final")
  } else if (u.t < WM_ULT.END) { u.phase = "after"; f._spriteCastMove = "win" }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
})
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30)
    if (!opp.eliminated) { opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, WM_ULT.KD) } }
  s.lastUlt = { captured: !!u?.home, raw: u?.raw || 0, hits: u?.hits ? u.hits.slice() : [], seed: u?.seed, f0: u?.f0, pi: u?.pi,
    home: u?.home ? { ...u.home } : null, thome: u?.thome ? { ...u.thome } : null, endT: s.t }
  s.ult = null
  s.fury = 0                                                                 // Fury → 0
  api?.focusCamera?.(f, opp, 1, 12)
  f.attackCooldown = WM_ULT.LOCKOUT; f._benPowerCommit = WM_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
CONTACT.unshift((f, s, target, { move, blocked }) => {
  const u = s.ult; if (!u || u.phase !== "opener" || !move || move.name !== "wm_ult_open") return
  u.contact = { blocked: !!blocked }
})
// render-only: the barrage spin blur orbits the pinned opponent at each pass's hashed angle (a body draw offset, never collision)
BODY_OFF.unshift((f, s) => {
  const u = s.ult; if (!u || u.phase !== "barrage") return null
  const p = ultPasses(u.seed, u.f0, u.pi), k = p.findIndex(q => u.t >= q.at - 6 && u.t < q.at + 6); if (k < 0) return null
  const an = p[k].ang * Math.PI / 180, prog = (u.t - (p[k].at - 6)) / 12
  return { dx: Math.cos(an + prog * Math.PI) * WM_ULT.ORBIT, dy: Math.min(0, Math.sin(an + prog * Math.PI) * WM_ULT.ORBIT * 0.5) }
})
// render-only: the finisher's scale-up, read by sprite.js from formState.renderScale (Highbreed's hook). A NON-ENUMERABLE getter
// derived from the cinematic's phase: never serialised, never part of GAME_STATE, nothing to clear.
const renderScaleOf = s => (s.ult && s.ult.phase === "final" ? WM_ULT.SCALE : 1)
const _onApply0 = WILDMUTT.onApply
WILDMUTT.onApply = f => { _onApply0(f); const s = f.omnitrix && f.omnitrix.formState; if (s && s.kind === WM_KEY) Object.defineProperty(s, "renderScale", { get: () => renderScaleOf(s), enumerable: false, configurable: true }) }
// render-only: the held opponent jolts under each pass and the slam (never collision)
TARGET_OFF.push((f, s) => {
  const u = s.ult; if (!u || (u.phase !== "barrage" && u.phase !== "final")) return null
  const at = u.phase === "final" ? WM_ULT.FINAL_AT : WM_ULT.PASS_AT.find(a => u.t >= a && u.t < a + 5); if (at == null || u.t < at || u.t >= at + 5) return null
  return { dx: 0, dy: 3 - (u.t - at) }
})
FX_DRAW.push((c, f, s, frame, opp) => {
  const u = s.ult; if (!u || u.phase === "opener" || !opp) return
  const ox = cx(opp), oy = opp.y + (opp.h || 110) * 0.6
  if (u.phase === "barrage") {                                               // claw streaks across them at the pass angle
    const p = ultPasses(u.seed, u.f0, u.pi), k = p.findIndex(q => u.t >= q.at && u.t < q.at + 5)
    if (k >= 0) { const an = p[k].ang * Math.PI / 180; c.save(); c.fillStyle = (frame & 2) ? WHITE : FUR
      for (let line = -1; line <= 1; line++) for (let i = -4; i <= 4; i++) px(c, ox + Math.cos(an) * i * 9 - Math.sin(an) * line * 6, oy + Math.sin(an) * i * 9 + Math.cos(an) * line * 6, 3)
      c.restore() }
  }
  if (u.phase === "final" && u.t >= WM_ULT.FINAL_AT - 1 && u.t <= WM_ULT.FINAL_AT + 6) { c.save(); c.fillStyle = WHITE; for (let k = 0; k < 14; k++) { const an = k / 14 * Math.PI * 2; px(c, ox + Math.cos(an) * 36, oy + Math.sin(an) * 20, 5) } c.restore() }
})
