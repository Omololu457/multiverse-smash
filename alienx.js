// alienx.js — ALIEN X (Celestialsapien), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects never write it.
// No randomness in the simulation.
import { ALIENX_ANIM, ALIENX_GEOM } from "./alienxAssets.js"
export { ALIENX_ANIM, ALIENX_GEOM }

const ANIM = ALIENX_ANIM
// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

// DELIBERATION IS COSTLY: Omnitrix Power drains ×1.5 while Alien X is active (~13 s from full; base 5/s → 7.5/s).
export const AX_DRAIN_MULT = 1.5

export const ALIENX = {
  id: "alienx", poolKey: "alienx", displayName: "Alien X", slot: 7,
  status: "ready", sheetPath: "./ben10_alienx_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/alienx/SPRITE_LEDGER.md",
  mods: { speed: 0.80, damage: 1.20, defense: 1.25, weight: 1.40 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  drainMult: AX_DRAIN_MULT,                     // per-alien Power drain multiplier hook (fighters.updateTransformDevice)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Nullify", special2: "Gravity", special3: "Rewind", special4: "Void Grasp", special5: "Starfall Dash",
    ultimate: "Absolute Decree" },
  basic_attacks: {
    light:  normal(22, 6, 3, 12, 0),                                                      // Attacks f1
    heavy:  normal(64, 15, 4, 26, -7, { knockbackX: 8, rangeX: 190 }),                     // Attacks f2-4, 190 px
    down:   normal(30, 8, 3, 16, -4, { hitLevel: "low" }),                                 // Attacks f5-6, hits low
    up:     normal(54, 13, 4, 28, -10, { launcher: true, launchVy: -15, selfVy: 0 }),      // Attacks f8-9
    air:    normal(36, 8, 4, 12, 2)                                                        // Attacks f10
  },
  anim: ANIM,
  onApply, tick
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshAlienXState() {
  return { kind: "alienx", t: 0, castId: 0, baseDmg: 1.0 }
}
export const axState = f => (f?.omnitrix?.formState?.kind === "alienx" && f.transformed && f.activeAlien === "alienx") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshAlienXState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? ALIENX.mods.damage   // mods.damage × Vow (set by applyAlien)
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = axState(f); if (!s) return
  s.t++
}
