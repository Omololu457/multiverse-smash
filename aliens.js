import { SWAMPFIRE } from "./swampfire.js"
// aliens.js — BEN 10 ALIEN REGISTRY (Phase 4)
// ────────────────────────────────────────────────────────────────────────────────────────────────
// The declarative catalog of Omnitrix aliens. Each entry is pure DATA — the runtime form behaviour
// (move tables, procedural/placeholder render, transform/swap economy) lives in fighters.js +
// abilities.js and is keyed by `poolKey`. This file is the single place a new alien is DEFINED.
//
// Readiness is explicit: approved forms require status ready, source art and a ledger.
// Mechanics / animation mappings may need scoped hooks; see docs/ben10/ADD_ALIEN.md.
// Legacy catalog slots are historical metadata. Runtime dial position is the filtered loadout
// index; a duplicate historical slot does not overwrite a form. Never use slot as registry identity.
// Experimental forms preserve their existing mechanics and tinted human placeholder rendering.
// Swampfire occupies the first production loadout slot without deleting experimental definitions.
export const BEN10_ALIEN_REGISTRY = [
  SWAMPFIRE,
  {
    id: "xlr8", displayName: "XLR8", slot: 1, status: "experimental", poolKey: "xlr8",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Claw Jab", heavy: "Spin Kick", low: "Low Sweep", launcher: "Rising Slash", air: "Air Claw",
             special1: "Dash Strike", special2: "Sonic Rush", ultimate: "Time Slice" },
    movement: "grounded"
  },
  {
    id: "diamondhead", displayName: "Diamondhead", slot: 2, status: "experimental", poolKey: "diamondhead",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Shard Jab", heavy: "Crystal Smash", low: "Low Shard", launcher: "Spire Rise", air: "Shard Drop",
             special1: "Shard Barrage", special2: "Rising Diamonds", ultimate: "Crystalline Eruption" },
    movement: "grounded"
  },
  {
    id: "feedback", displayName: "Feedback", slot: 3, status: "experimental", poolKey: "feedback",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Prong Jab", heavy: "Conduit Slam", low: "Low Prong", launcher: "Surge Rise", air: "Air Prong",
             special1: "Energy Absorb", special2: "Energy Discharge", ultimate: "Overload Discharge" },
    movement: "grounded"
  },
  {
    id: "wildmutt", displayName: "Wildmutt", slot: 4, status: "experimental", poolKey: "wildmutt",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Claw Swipe", heavy: "Maul", low: "Low Claw", launcher: "Pounce", air: "Air Maul",
             special1: "Pounce", ultimate: "Frenzy" },
    movement: "grounded"
  },
  {
    id: "heatblast", displayName: "Heatblast", slot: 5, status: "experimental", poolKey: "heatblast",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Ember Jab", heavy: "Flame Hook", low: "Low Flame", launcher: "Flare Rise", air: "Air Ember",
             special1: "Fireball", ultimate: "Supernova" },
    movement: "grounded"
  },
]

// A generic PLACEHOLDER alien (status "placeholder"): renders the human-Ben frames with a render-only
// green Omnitrix tint and carries a basic move table + one projectile special ("Placeholder Blast", 12
// Power). Fully playable so the engine can be tested before any art exists. makePlaceholder(slot) mints
// "slot1".."slot5" / "Alien 1".."Alien 5" with identity (×1.0) mods — deliberately average (see
// docs/ben10/BALANCE_NOTES.md: real aliens are balanced by mods + move tables ONLY, never engine edits).
export const BEN10_PLACEHOLDER_MOVES = {
  jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air Attack",
  special1: "Placeholder Blast"   // 12-Power projectile
}
export const BEN10_PLACEHOLDER_BLAST = { name: "Placeholder Blast", cost: 12, kind: "projectile" }
export function makePlaceholder(slot = 1) {
  return {
    id: `slot${slot}`, displayName: `Alien ${slot}`, slot, status: "placeholder", poolKey: null,
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { ...BEN10_PLACEHOLDER_MOVES }, movement: "grounded"
  }
}

// Convenience lookups (used by docs/tests/UI). The runtime loadout itself is still built by fighters.js
// (createOmnitrixState) from BEN10_ART_ALIENS / DEFAULT_OMNITRIX — this registry is the catalog of record.
export function getAlienBySlot(slot, { experimental = false } = {}) { return BEN10_ALIEN_REGISTRY.filter(a => isAlienAvailable(a.poolKey, experimental))[slot - 1] || makePlaceholder(slot) }
export function getAlienById(id)     { return BEN10_ALIEN_REGISTRY.find(a => a.id === id) || null }
export function readySlots()         { return BEN10_ALIEN_REGISTRY.filter(a => a.status === "ready").map(a => a.poolKey) }
// Fill slots 1..n: a registered entry if present, else a placeholder. Guarantees every slot is playable.
export function buildLoadout(n = 5, options = {}) {
  const out = []
  for (let s = 1; s <= n; s++) out.push(getAlienBySlot(s, options))
  return out
}

// Readiness is independent from having legacy mechanics. Never advertise a tinted human as alien art.
const extraAliens = ["fourarms", "upgrade", "eyeguy", "alienx", "cannonbolt", "clockwork", "chromastone", "brainstorm"]
for (const key of extraAliens) BEN10_ALIEN_REGISTRY.push({ id: key, poolKey: key, displayName: key, status: "experimental", sheetPath: null, ledgerPath: null, mods: { speed: 1, damage: 1, defense: 1, weight: 1 } })
export const getAlienDefinition = key => BEN10_ALIEN_REGISTRY.find(a => a.poolKey === key) || null
export const isAlienAvailable = (key, experimental = false) => {
  const a = getAlienDefinition(key)
  return !!a && (experimental || (a.status === "ready" && !!a.sheetPath && !!a.ledgerPath))
}
export const getAvailableAlienKeys = (experimental = false) => BEN10_ALIEN_REGISTRY.filter(a => isAlienAvailable(a.poolKey, experimental)).map(a => a.poolKey)
