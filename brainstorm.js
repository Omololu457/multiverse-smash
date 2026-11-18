// brainstorm.js — BRAINSTORM (Cerebrocrustacean), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects never write it.
// Simulation randomness: hash(match seed, frame, player index) only (bsHash).
import { BRAINSTORM_ANIM, BRAINSTORM_GEOM } from "./brainstormAssets.js"
export { BRAINSTORM_ANIM, BRAINSTORM_GEOM }

// CLOSED (dome down) frame set = the generated table. OPEN (dome up) frame set = the same table with the locomotion / idle /
// air poses swapped for the two dome-up frames (Col 3 R8 + the right-extra dome frame). Render aliases only; no new art.
const A0 = BRAINSTORM_ANIM
const ANIM = { ...A0 }
const OPEN_ANIM = { ...A0, idle: A0.open_idle, walk: A0.open_walk, walk_back: A0.open_walk, run: A0.open_walk, dash: A0.open_walk,
  jump: A0.open_jump, doubleJump: A0.open_jump, fall: A0.open_jump, guard: A0.open_idle, crouch: A0.open_idle, win: A0.open_idle }
export { ANIM as BS_CLOSED_ANIM, OPEN_ANIM as BS_OPEN_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const BRAINSTORM = {
  id: "brainstorm", poolKey: "brainstorm", displayName: "Brainstorm", slot: 9,
  status: "ready", sheetPath: "./ben10_brainstorm_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/brainstorm/SPRITE_LEDGER.md",
  mods: { speed: 0.85, damage: 1.00, defense: 1.10, weight: 1.00 },   // defense 1.10 = dome CLOSED (the form's resting state)
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Brain Bolt", special2: "Neural Burst", special3: "Psychic Pull", special4: "Calculated Strike", special5: "Overcharge",
    ultimate: "Neural Tempest" },
  basic_attacks: {
    light:  normal(16, 6, 3, 12, 0),                                                         // claw poke (render lunge)
    heavy:  normal(52, 15, 4, 24, -7, { knockbackX: 7, rangeX: 160 }),                        // claw clamp, 160 px
    down:   normal(24, 8, 3, 16, -4, { hitLevel: "low" }),                                    // leg sweep, hits low
    up:     normal(44, 12, 4, 26, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // psychic lift, upward
    air:    normal(28, 8, 4, 12, 2)                                                           // air claw
  },
  anim: ANIM,
  onApply, tick, blockLight, moveFrames, damageDealt, fireSpecial
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBrainstormState() {
  return { kind: "brainstorm", t: 0, castId: 0,
    dome: "closed", domeT: 0, toggles: 0, buffer: null, drained: 0 }
}
export const bsState = f => (f?.omnitrix?.formState?.kind === "brainstorm" && f.transformed && f.activeAlien === "brainstorm") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshBrainstormState()
  f.defenseMultiplier = BS_DOME.CLOSED_DEF
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = bsState(f); if (!s) return
  s.t++
  tickDome(f, s, api)
}

// ── THE DOME (GAME_STATE) ─────────────────────────────────────────────────────────────────────────────────
// Block + Light tap toggles it (the form's own toggle — the shared ready-form blockLight hook, Ghostfreak's Phase input).
// 18f to open, 24f to close; refused in hitstun, during his own active frames and during the ultimate; committed (no
// attacks, no walk) while it moves. Resets to CLOSED on swap / revert / KO / rematch (fresh formState).
//   CLOSED  defense ×1.10, no lightning specials, Mind Shield available, the closed frame set.
//   OPEN    defense ×0.80 (brain exposed), lightning-tagged damage ×1.25, Power drain +2/s, the dome-up frame set.
// The brain is exposed from the moment the dome is fully up until it is fully closed again (open + closing); while it
// is opening it still counts as closed.
export const BS_DOME = { OPEN: 18, CLOSE: 24, CLOSED_DEF: 1.10, OPEN_DEF: 0.80, LTN_MULT: 1.25, DRAIN_PER_SEC: 2 }
export const domeExposed = s => !!s && (s.dome === "open" || s.dome === "closing")
export function inOwnActiveFrames(f) {
  const a = f.attacking && f.currentAttack
  if (!a) return false
  const el = (a.total || 0) - (a.timer || 0)
  return el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0)
}
export function canToggleDome(f, s) {
  return !!s && (s.dome === "closed" || s.dome === "open") && !((f.hitstun || 0) > 0) && !inOwnActiveFrames(f) && !s.ult
}
function beginDome(f, s, to) {
  const n = to === "open" ? BS_DOME.OPEN : BS_DOME.CLOSE
  s.dome = to === "open" ? "opening" : "closing"; s.domeT = n; s.toggles++
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  f.attackCooldown = Math.max(f.attackCooldown || 0, n); f.vx = 0
  f._spriteCastMove = to === "open" ? "bsDomeOpen" : "bsDomeClose"; f._spriteCastTimer = n
}
export function toggleDome(f, s) {
  if (!canToggleDome(f, s)) return false
  beginDome(f, s, s.dome === "closed" ? "open" : "closed")
  return true
}
// blockLight hook (game.js Omnitrix input handler): the Light press is consumed so it never also jabs.
function blockLight(f) {
  const s = bsState(f); if (!s) return false
  toggleDome(f, s)
  return true
}
function tickDome(f, s, api) {
  if (s.dome === "opening" || s.dome === "closing") {
    f.vx = 0
    if (--s.domeT <= 0) {
      s.domeT = 0; s.dome = s.dome === "opening" ? "open" : "closed"
      if (s.dome === "open" && s.buffer) { const b = s.buffer; s.buffer = null; f.attackCooldown = 0; castBuffered(f, s, api, b) }
      if (s.dome === "closed") s.buffer = null
    }
  }
  f.defenseMultiplier = domeExposed(s) ? BS_DOME.OPEN_DEF : BS_DOME.CLOSED_DEF
  if (domeExposed(s) && !s.ult) {                                         // +2 Power/s on top of the device drain
    const d = Math.min(f.energy || 0, BS_DOME.DRAIN_PER_SEC / 60); f.energy = (f.energy || 0) - d; s.drained += d
  }
  const want = s.dome === "open" || s.dome === "closing" ? OPEN_ANIM : ANIM   // frame-set swap (Megawhatt precedent)
  if (f._skinAnim !== want) f._skinAnim = want
}
// moveFrames hook (combat.startMove): no normals while the dome moves (the transition is committed).
function moveFrames(f, key, md) {
  const s = bsState(f); if (!s) return md
  if (s.dome === "opening" || s.dome === "closing") return false
  return md
}
// damageDealt hook (combat.applyScaledDamage): lightning-tagged damage (every source named "bs_ltn_*") ×1.25 while the
// brain is exposed. Nothing else is touched.
export const isLightningMove = m => typeof m === "string" && m.startsWith("bs_ltn_")
function damageDealt(f, target, raw, opts) {
  const s = bsState(f); if (!s || !opts) return raw
  return isLightningMove(opts.move) && domeExposed(s) ? raw * BS_DOME.LTN_MULT : raw
}

// ── SPECIALS (dispatch; the casts themselves are below) ───────────────────────────────────────────────────
// A LIGHTNING special pressed while the dome is CLOSED starts the dome opening first (+18f startup) and is buffered for
// one input; pressed while it is OPENING it is buffered. The buffered special casts (and spends its Power) on the frame the
// dome is fully up. Closing: refused.
export const LIGHTNING = new Set(["bolt", "burst", "overcharge"])
function pickSpecial(f, s) {
  const dir = f._specialHeldDir || null
  const air = !(f.onGround || f.grounded)
  if (air) return (dir === null || dir === "F" || dir === "D") ? "overcharge" : null
  if (dir === "B") return "burst"
  if (dir === "D") return "pull"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= BS_DASH_WINDOW) return "strike"
  return "bolt"
}
export const BS_DASH_WINDOW = 14
function fireSpecial(f, ctx, api) {
  const s = bsState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind) return false
  if (LIGHTNING.has(kind) && s.dome !== "open") {
    if (s.ult || s.dome === "closing") return false
    if (s.dome === "opening") { s.buffer = { kind, at: s.t }; return true }
    if (!canToggleDome(f, s) || (f.attackCooldown || 0) > 0 || f.attacking) return false
    beginDome(f, s, "open"); s.buffer = { kind, at: s.t }
    return true
  }
  return cast(f, s, api, kind, ctx)
}
function castBuffered(f, s, api, b) {
  if (b.kind === "overcharge" && (f.onGround || f.grounded)) return false   // landed while the dome opened: nothing to cast
  return cast(f, s, api, b.kind, null)
}
// filled in by the moves (Phase 6)
function cast(f, s, api, kind, ctx) { return false }
