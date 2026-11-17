// heatblast.js — HEATBLAST (Pyronite), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: no engine imports (no cycles). The engine calls the hooks below through the generic, ben10-gated
// ready-form dispatch (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate) and
// passes an `api` object with the shared primitives (spendEnergy, spawnProjectile, applyScaledDamage, …).
//
// ALL simulation state lives in GAME_STATE: fighter.omnitrix.formState (the Omnitrix sub-structure), cleared by
// clearBenFormState on swap / revert / KO. No randomness of any kind — nothing here is random at all.
// Render-only bits (Blue Flame palette = the alt-pal strips, pixel rings) READ that state; they never write it.
import { HEATBLAST_ANIM, HEATBLAST_BLUE_ANIM, HEATBLAST_FX } from "./heatblastAssets.js"
export { HEATBLAST_ANIM, HEATBLAST_BLUE_ANIM, HEATBLAST_FX }

// The ultimate's opener plays the full attack-1 throw under the cast name "hbFire" (the Omnitrix ult pose key).
const ANIM = { ...HEATBLAST_ANIM, hbFire: HEATBLAST_ANIM.heavy }
const BLUE_ANIM = { ...HEATBLAST_BLUE_ANIM, hbFire: HEATBLAST_BLUE_ANIM.heavy }

// ── tuning (pre-mod numbers from the brief) ─────────────────────────────────────────────────────────────────
export const HB_HEAT = { MAX: 100, FIREBALL: 10, ROCKET: 12, NORMAL: 4, ABSORB: 25, IDLE_DELAY: 60, HOT: 50,
  BLUE_FRAMES: 360, BURNOUT_FRAMES: 120, SUPERNOVA_MIN: 25 }
export const HB_TIER_MULT = { warm: 1, hot: 1.10, blue: 1.20 }
export const HB_SCORCH = { MAX: 3, EXPIRE: 240, TICK: 10, BURN: 60, BURN_DMG: 5, IMMUNE: 300, FLASHPOINT: 25 }
export const HB_COST = { fireball: 10, rocket: 14, supernova: 18, flight: 12, ultimate: 50 }
export const HB_ABSORB = { WINDOW: 8, COOLDOWN: 360 }
export const HB_FLIGHT = { FRAMES: 45, SPEED: 8, BASE_DEG: -30, STEER_DEG: 20, CAP_ABOVE_APEX: 80, DIVE_VX: 7, DIVE_VY: 16, DIVE_MAX: 30, DIVE_DMG: 55 }
export const HB_ULT = { OPENER: 40, RAIN: 30, RAIN_AT: [35, 50, 65], IMPACT: 110, RISE: 25, SUN_END: 85, IMPACT_AT: 105, END: 106,
  WHIFF_RECOVERY: 60, LOCKOUT: 100 }

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, fire: true, ...extra
})

export const HEATBLAST = {
  id: "heatblast", poolKey: "heatblast", displayName: "Heatblast", slot: 2,
  status: "ready", sheetPath: "./ben10_heatblast_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/heatblast/SPRITE_LEDGER.md",
  mods: { speed: 1.05, damage: 1.10, defense: 0.92, weight: 0.95 },
  movement: "grounded", maxJumps: 2,   // the game's shared double jump; Blaze Flight never refills it
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air", down_air: "Down-Air",
    special1: "Fireball", special2: "Fire Rocket", special3: "Supernova", special4: "Blaze Flight",
    defense: "Heat Absorb", ultimate: "Pyronite Meteor" },
  basic_attacks: {
    light:    normal(20, 5, 3, 12, 0),                                                    // flame palm
    heavy:    normal(56, 14, 4, 24, -6, { knockbackX: 8, rangeX: 160 }),                    // thrown flame burst, 160 px
    down:     normal(28, 7, 3, 16, -4, { hitLevel: "low" }),                              // crouch flame lick
    up:       normal(50, 11, 4, 28, -9, { launcher: true, launchVy: -15, selfVy: 0 }),     // attack3 f1-3 upward flare
    air:      normal(32, 7, 4, 12, 2),                                                    // fall frames + forward burst
    down_air: normal(48, 12, 4, 16, 0, { knockbackY: 10 })                                // attack4 dive
  },
  anim: ANIM, blueAnim: BLUE_ANIM, fx: HEATBLAST_FX,
  onApply
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshHeatblastState() {
  return { kind: "heatblast", heat: 0, idle: 0, blue: 0, burnout: 0, absorbWin: 0, absorbCd: 0, baseDmg: 1.10,
    castId: 0, airborne: false, flightUsed: false, apexY: null, flight: null, dive: null, ult: null,
    rocketCast: -1, lastPipCast: -1, lastAbsorbed: null,
    scorch: { pips: 0, pipT: 0, burnT: 0, burnTick: 0, burnDealt: 0, immune: 0, flashUsed: false, ignites: 0, flashpoints: 0 } }
}
export const hbState = f => (f?.omnitrix?.formState?.kind === "heatblast" && f.transformed && f.activeAlien === "heatblast") ? f.omnitrix.formState : null
export const heatTier = s => !s ? "warm" : s.blue > 0 ? "blue" : s.heat >= HB_HEAT.HOT ? "hot" : "warm"

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshHeatblastState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? HEATBLAST.mods.damage   // mods.damage × Vow (set by applyAlien)
}

