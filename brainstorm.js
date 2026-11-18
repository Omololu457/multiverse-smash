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
  onApply
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBrainstormState() {
  return { kind: "brainstorm", t: 0, castId: 0 }
}
export const bsState = f => (f?.omnitrix?.formState?.kind === "brainstorm" && f.transformed && f.activeAlien === "brainstorm") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshBrainstormState()
}
