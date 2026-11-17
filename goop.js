// goop.js — GOOP (Polymorph, Alien Force), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: no engine imports (no cycles). The engine calls the hooks below through the generic, ben10-gated
// ready-form dispatch (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate) and
// passes an `api` object with the shared primitives (spendEnergy, spawnProjectile, applyScaledDamage, …).
//
// ALL simulation state lives in GAME_STATE: fighter.omnitrix.formState (plain data, no object references), cleared
// by clearBenFormState on swap / revert / KO. No randomness of any kind — nothing here is random at all.
// Render-only bits (Corrode drip tint, flood tiling, goo overlay) READ that state; they never write it.
import { GOOP_ANIM, GOOP_PROJECTOR, GOOP_FX, GOOP_GEOM } from "./goopAssets.js"
export { GOOP_ANIM, GOOP_PROJECTOR, GOOP_FX, GOOP_GEOM }

const ANIM = GOOP_ANIM

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra
})

export const GOOP = {
  id: "goop", poolKey: "goop", displayName: "Goop", slot: 4,
  status: "ready", sheetPath: "./ben10_goop_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/goop/SPRITE_LEDGER.md",
  mods: { speed: 0.98, damage: 1.0, defense: 1.0, weight: 0.9 },
  movement: "grounded", maxJumps: 2,   // the game's shared double jump; Goo Rocket never refills it
  moves: { jab: "Jab", heavy: "Heavy", poke: "Stretch Poke", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Acid Spit", special2: "Acid Lob", special3: "Goo Lasso", special4: "Spike Splash", special5: "Goo Rocket",
    puddle: "Puddle Form", geyser: "Geyser", ultimate: "Meltdown Flood" },
  // pre-mod numbers from the brief (startup / damage / on-block)
  basic_attacks: {
    light:  normal(18, 5, 3, 12, 0),                                                     // R18 arm fling
    heavy:  normal(54, 14, 4, 24, -6, { knockbackX: 8, rangeX: 180 }),                   // R1 stretch kick, 180 px
    down:   normal(26, 7, 3, 16, -4, { hitLevel: "low" }),                               // R22 melt-sweep
    up:     normal(48, 11, 4, 28, -9, { launcher: true, launchVy: -15, selfVy: 0 }),     // R5 f1-5
    air:    normal(30, 7, 4, 12, 2)                                                      // R11 airborne
  },
  anim: ANIM, fx: GOOP_FX,
  onApply
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshGoopState() {
  return { kind: "goop", castId: 0, baseDmg: 1.0 }
}
export const gpState = f => (f?.omnitrix?.formState?.kind === "goop" && f.transformed && f.activeAlien === "goop") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshGoopState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? GOOP.mods.damage   // mods.damage × Vow (set by applyAlien)
}
