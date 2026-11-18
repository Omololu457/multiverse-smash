// terraspin.js — TERRASPIN (Galapagus), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (wind streaks,
// debris, blades, the ult cyclone, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
import { TERRASPIN_ANIM, TERRASPIN_GEOM } from "./terraspinAssets.js"
export { TERRASPIN_ANIM, TERRASPIN_GEOM }

const ANIM = { ...TERRASPIN_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const TERRASPIN = {
  id: "terraspin", poolKey: "terraspin", displayName: "Terraspin", slot: 10,
  status: "ready", sheetPath: "./ben10_terraspin_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/terraspin/SPRITE_LEDGER.md",
  mods: { speed: 0.90, damage: 1.05, defense: 1.20, weight: 1.25 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Inhale", special2: "Exhale", special3: "Wind Chop", special4: "Shell Spin", special5: "Cyclone Drop",
    ultimate: "Eye of the Storm" },
  basic_attacks: {
    light:  normal(18, 5, 3, 10, 0, { rangeX: 110 }),                                         // short chop, 110 px
    heavy:  normal(56, 14, 4, 22, -6, { knockbackX: 7, rangeX: 180 }),                        // wide wind blade, 180 px
    down:   normal(26, 7, 3, 15, -4, { hitLevel: "low" }),                                    // low arms sweep, hits low
    up:     normal(46, 11, 4, 25, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // upward gale
    air:    normal(30, 7, 4, 11, 2)                                                           // spin
  },
  anim: ANIM,
  onApply, tick
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshTerraspinState() {
  return { kind: "terraspin", t: 0, castId: 0 }
}
export const tsState = f => (f?.omnitrix?.formState?.kind === "terraspin" && f.transformed && f.activeAlien === "terraspin") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshTerraspinState()
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = tsState(f); if (!s) return
  s.t++
}
