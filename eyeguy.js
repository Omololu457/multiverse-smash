// eyeguy.js — EYEGUY (Opticoid), a READY Omnitrix alien (registry entry + Dragonrod sheet + ledger).
// Leaf module: no engine imports. The engine reaches it only through the generic ready-form hooks
// (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate — see docs/ben10/ADD_ALIEN.md),
// which pass an `api` object with the shared primitives (spendEnergy, spawnProjectile, applyScaledDamage, …).
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects never write it.
import { EYEGUY_ANIM, EYEGUY_FX, EYEGUY_EX_FRAMES, EYEGUY_GEOM } from "./eyeguyAssets.js"
export { EYEGUY_ANIM, EYEGUY_FX, EYEGUY_EX_FRAMES, EYEGUY_GEOM }

const ANIM = EYEGUY_ANIM
// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const EYEGUY = {
  id: "eyeguy", poolKey: "eyeguy", displayName: "Eyeguy", slot: 6,
  status: "ready", sheetPath: "./ben10_eyeguy_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/eyeguy/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.15, defense: 1.05, weight: 1.10 },
  movement: "grounded", maxJumps: 2,
  moves: { jab: "Jab", heavy: "Claw Swipe", low: "Low", launcher: "Launcher", air: "Air Eye Flash",
    special1: "Eye Orb", special2: "Hypno Wave", special3: "Rising Gaze", special4: "Low Gaze", special5: "Open Eyes",
    ultimate: "All-Seeing Eye" },
  basic_attacks: {
    light:  normal(20, 5, 3, 12, 0),                                                     // attack f1
    heavy:  normal(58, 14, 4, 24, -6, { knockbackX: 8, rangeX: 150 }),                   // attack f2-3 claw swipe, 150 px
    down:   normal(28, 7, 3, 16, -4, { hitLevel: "low" }),                               // attack ↓ f1, hits low
    up:     normal(50, 11, 4, 28, -9, { launcher: true, launchVy: -15, selfVy: 0 }),     // attack ↑ f1-2
    air:    normal(32, 7, 4, 12, 2)                                                      // fall frame + eye flash
  },
  anim: ANIM, fx: EYEGUY_FX,
  onApply
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshEyeguyState() {
  return { kind: "eyeguy", t: 0, castId: 0, baseDmg: 1.0 }
}
export const egState = f => (f?.omnitrix?.formState?.kind === "eyeguy" && f.transformed && f.activeAlien === "eyeguy") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshEyeguyState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? EYEGUY.mods.damage   // mods.damage × Vow (set by applyAlien)
}
