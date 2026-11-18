import { SWAMPFIRE } from "./swampfire.js"
import { HEATBLAST } from "./heatblast.js"
import { MEGAWHATT } from "./megawhatt.js"
import { XLR8 } from "./xlr8.js"
import { GOOP } from "./goop.js"
import { EYEGUY } from "./eyeguy.js"
import { GHOSTFREAK } from "./ghostfreak.js"
import { ALIENX } from "./alienx.js"
import { BRAINSTORM } from "./brainstorm.js"
import { TERRASPIN } from "./terraspin.js"
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
// Heatblast (heatblast.js) is the second READY form: it took the first placeholder dial slot (slot 2).
// Megawhatt (megawhatt.js) is the third READY form: the next first-placeholder dial slot (slot 3).
// Goop (goop.js) is the fourth READY form: the next first-placeholder dial slot (slot 4, ↓↓ + Grab).
// XLR8 took slot 5 (↓↓ + Charge). Eyeguy (eyeguy.js) and Ghostfreak (ghostfreak.js) are READY forms (they briefly had dial
// slots 6 / 7, ↓↓ + Ultimate / ↓↓ + Up-Attack; the owner kept PICK FIVE).
// SLOT COUNT (single source of truth): how many Omnitrix dial slots exist. fighters.js MAX_OMNITRIX_SLOTS reads it and
// game.js BEN10_SLOT_COMBOS must hold exactly this many slot inputs (asserted at load).
// PICK FIVE (2026-11-17, owner decision): the Omnitrix holds FIVE aliens, chosen on the alien-select screen out of every
// READY form (Swampfire, Heatblast, Megawhatt, Goop, XLR8, Eyeguy, Ghostfreak, Alien X, Brainstorm, Terraspin, …). More ready aliens never add dial slots;
// the dial is ↓↓ then J / K / L / O / P for the 5 picks (↓↓ + ; reverts). See docs/ben10/ADD_ALIEN.md.
export const BEN10_SLOT_COUNT = 5
export const BEN10_ALIEN_REGISTRY = [
  SWAMPFIRE,
  HEATBLAST,   // READY (2026-11-17): Dragonrod sheet + ledger; replaces the old experimental Heatblast entry
  MEGAWHATT,   // READY (2026-11-17): Dragondor sheet + ledger; living electricity (Voltage / Static / flight)
  GOOP,        // READY (2026-11-17): DS cell-grid sheet + ledger; Polymorph goo (projector weak point / Puddle / Acid)
  XLR8,        // READY (2026-11-17): Dragonrod sheet + ledger; Kineceleran speedster (Flash Time / Blur Step / echoes); replaces the old experimental XLR8 entry
  EYEGUY,      // READY (2026-11-17): Dragonrod sheet + ledger; Opticoid zoner (360° Vision / Stare / Unblinking); replaces the experimental Eye Guy, NEW slot 6
  GHOSTFREAK,  // READY (2026-11-17): subvercetti sheet + ledger; Ectonurite (Phase / Dread → Terror / Possess / flight), a PICK-FIVE choice
  ALIENX,      // READY (2026-11-17): regularDor8go sheet + ledger; Celestialsapien caster (Three Voices / Void → Unmade / Decrees); replaces the experimental Alien X, a PICK-FIVE choice
  BRAINSTORM,  // READY (2026-11-17): Fun-tech.tk sheet + ledger; Cerebrocrustacean (Dome / Pattern Read / Synapse → Short-Circuit); replaces the experimental Brainstorm, a PICK-FIVE choice (catalog slot 9)
  TERRASPIN,   // READY (2026-11-17): Fun-tech.tk sheet + ledger; Galapagus wind turtle (Pressure / Shear → Gale Drag / Thorn Shell); a NEW entry, a PICK-FIVE choice (catalog slot 10 — no new dial slot)

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
export function buildLoadout(n = BEN10_SLOT_COUNT, options = {}) {
  const out = []
  for (let s = 1; s <= n; s++) out.push(getAlienBySlot(s, options))
  return out
}

// Readiness is independent from having legacy mechanics. Never advertise a tinted human as alien art.
const extraAliens = ["fourarms", "upgrade", "cannonbolt", "clockwork", "chromastone"]
for (const key of extraAliens) BEN10_ALIEN_REGISTRY.push({ id: key, poolKey: key, displayName: key, status: "experimental", sheetPath: null, ledgerPath: null, mods: { speed: 1, damage: 1, defense: 1, weight: 1 } })
export const getAlienDefinition = key => BEN10_ALIEN_REGISTRY.find(a => a.poolKey === key) || null
export const isAlienAvailable = (key, experimental = false) => {
  const a = getAlienDefinition(key)
  return !!a && (experimental || (a.status === "ready" && !!a.sheetPath && !!a.ledgerPath))
}
export const getAvailableAlienKeys = (experimental = false) => BEN10_ALIEN_REGISTRY.filter(a => isAlienAvailable(a.poolKey, experimental)).map(a => a.poolKey)
