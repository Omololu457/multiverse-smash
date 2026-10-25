// aliens.js — BEN 10 ALIEN REGISTRY (Phase 4)
// ────────────────────────────────────────────────────────────────────────────────────────────────
// The declarative catalog of Omnitrix aliens. Each entry is pure DATA — the runtime form behaviour
// (move tables, procedural/placeholder render, transform/swap economy) lives in fighters.js +
// abilities.js and is keyed by `poolKey`. This file is the single place a new alien is DEFINED.
//
// Adding a real alien later must require ONLY: one registry entry + one sheet + one ledger — NO engine
// edits (see docs/ben10/ADD_ALIEN.md). A placeholder becomes "ready" by flipping its status + adding its
// art (fighters.js benAlienHasArt list) — again, data, not engine logic.
//
// SCHEMA (per entry):
//   {
//     id:          string,                      // stable registry id (e.g. "xlr8", "slot4")
//     displayName: string,                      // HUD / select label
//     slot:        1..5,                         // Omnitrix dial slot (↓↓ + Light/Heavy/Special/L+H/H+S)
//     status:      "ready" | "placeholder",     // "ready" = defined form (procedural/art); placeholder = generic
//     poolKey:     string | null,               // fighters.js BEN10_ALIEN_POOL key the form runs on (null = generic)
//     sheetPath:   string | null,               // sprite sheet on disk (null → placeholder render: human + tint)
//     ledgerPath:  string | null,               // per-alien sprite/move ledger (null until art lands)
//     mods:        { speed, damage, defense, weight },   // form modifiers (1.0 = identity; placeholders are 1.0)
//     moves:       { jab, heavy, low, launcher, air, special1, special2?, special3?, ultimate? },  // move labels
//     movement:    "grounded"                    // aliens are grounded by default (may declare a profile later)
//   }
// ────────────────────────────────────────────────────────────────────────────────────────────────

// The DEFAULT 5-slot loadout, wrapping the existing art-less pool aliens as status "ready" — they render
// as placeholders (human + Omnitrix tint) until real sheets land, but carry their OWN full move tables
// from BEN10_ALIEN_POOL (nothing regresses). mods are identity (1.0) so wrapping changes no behaviour.
export const BEN10_ALIEN_REGISTRY = [
  {
    id: "xlr8", displayName: "XLR8", slot: 1, status: "ready", poolKey: "xlr8",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Claw Jab", heavy: "Spin Kick", low: "Low Sweep", launcher: "Rising Slash", air: "Air Claw",
             special1: "Dash Strike", special2: "Sonic Rush", ultimate: "Time Slice" },
    movement: "grounded"
  },
  {
    id: "diamondhead", displayName: "Diamondhead", slot: 2, status: "ready", poolKey: "diamondhead",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Shard Jab", heavy: "Crystal Smash", low: "Low Shard", launcher: "Spire Rise", air: "Shard Drop",
             special1: "Shard Barrage", special2: "Rising Diamonds", ultimate: "Crystalline Eruption" },
    movement: "grounded"
  },
  {
    id: "feedback", displayName: "Feedback", slot: 3, status: "ready", poolKey: "feedback",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Prong Jab", heavy: "Conduit Slam", low: "Low Prong", launcher: "Surge Rise", air: "Air Prong",
             special1: "Energy Absorb", special2: "Energy Discharge", ultimate: "Overload Discharge" },
    movement: "grounded"
  },
  {
    id: "wildmutt", displayName: "Wildmutt", slot: 4, status: "ready", poolKey: "wildmutt",
    sheetPath: null, ledgerPath: null,
    mods: { speed: 1.0, damage: 1.0, defense: 1.0, weight: 1.0 },
    moves: { jab: "Claw Swipe", heavy: "Maul", low: "Low Claw", launcher: "Pounce", air: "Air Maul",
             special1: "Pounce", ultimate: "Frenzy" },
    movement: "grounded"
  },
  {
    id: "heatblast", displayName: "Heatblast", slot: 5, status: "ready", poolKey: "heatblast",
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
export function getAlienBySlot(slot) { return BEN10_ALIEN_REGISTRY.find(a => a.slot === slot) || makePlaceholder(slot) }
export function getAlienById(id)     { return BEN10_ALIEN_REGISTRY.find(a => a.id === id) || null }
export function readySlots()         { return BEN10_ALIEN_REGISTRY.filter(a => a.status === "ready").map(a => a.poolKey) }
// Fill slots 1..n: a registered entry if present, else a placeholder. Guarantees every slot is playable.
export function buildLoadout(n = 5) {
  const out = []
  for (let s = 1; s <= n; s++) out.push(getAlienBySlot(s))
  return out
}
