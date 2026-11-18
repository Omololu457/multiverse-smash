// wildvine.js — WILDVINE (Florauna), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (leaves, vines,
// forest, sparkles, rings, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet by Dragonrod (docs/ben10/aliens/wildvine/SPRITE_LEDGER.md).
import { WILDVINE_ANIM, WILDVINE_FX, WILDVINE_GEOM } from "./wildvineAssets.js"
export { WILDVINE_ANIM, WILDVINE_FX, WILDVINE_GEOM }

const ANIM = { ...WILDVINE_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const WILDVINE = {
  id: "wildvine", poolKey: "wildvine", displayName: "Wildvine", slot: 11,
  status: "ready", sheetPath: "./ben10_wildvine_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/wildvine/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.05, defense: 1.00, weight: 0.95 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Thornspike", special2: "Snare Vine", special3: "Bloom Pod", special4: "Vine Whip", special5: "Verdant Rise",
    special6: "Seed Shot", ultimate: "Overgrowth" },
  basic_attacks: {
    light:  normal(18, 5, 3, 10, 0, { rangeX: 100 }),                                         // attack f1–2
    heavy:  normal(52, 14, 4, 22, -6, { knockbackX: 7, rangeX: 170 }),                        // attack f3–5, arm reach 170 px
    down:   normal(24, 7, 3, 15, -4, { hitLevel: "low", rangeX: 120 }),                       // crouch + low vine, hits low
    up:     normal(46, 11, 4, 25, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // attack ↑ f1–3, rising growth
    air:    normal(28, 7, 4, 11, 2)                                                           // fall frame
  },
  anim: ANIM,
  onApply
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshWildvineState() {
  return { kind: "wildvine", t: 0, castId: 0, noAttack: false,
    stats: {} }
}
export const wvState = f => (f?.omnitrix?.formState?.kind === "wildvine" && f.transformed && f.activeAlien === "wildvine") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshWildvineState()
}
