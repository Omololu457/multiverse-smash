// Swampfire's authored data; raw damage is modified once by the form's 1.10 multiplier.
import { SWAMPFIRE_ANIM, SWAMPFIRE_FX } from "./swampfireAssets.js"
export { SWAMPFIRE_ANIM, SWAMPFIRE_FX }
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra
})
export const SWAMPFIRE = {
  id: "swampfire", poolKey: "swampfire", displayName: "Swampfire", slot: 1,
  status: "ready", sheetPath: "./ben10_swampfire_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/swampfire/SPRITE_LEDGER.md",
  mods: { speed: 0.92, damage: 1.10, defense: 1.10, weight: 1.15 },
  movement: "grounded",
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air / Down-Air",
    special1: "Flame Jet", special2: "Vine Eruption", special3: "Blaze Dash", ultimate: "Methane Inferno" },
  basic_attacks: {
    light: normal(18, 5, 3, 12, -1), heavy: normal(58, 15, 4, 25, -7, { knockbackX: 8 }),
    down: normal(26, 7, 3, 16, -4, { hitLevel: "low" }),
    up: normal(48, 12, 4, 28, -10, { launcher: true, launchVy: -15, selfVy: 0 }),
    air: normal(32, 8, 4, 12, 2),
    down_air: normal(32, 8, 4, 12, 2, { knockbackY: 10 })
  }
}
