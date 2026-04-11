// characters.js
// Central roster keyed for systems like abilities.js, movesets, summons, and transformations.
// Includes both named and default export so either import style works.

// ------------------------------------------------------------------
// NEW: Default Animation Configuration
// This feeds into the sprite.js handler. You can override these per character.
// ------------------------------------------------------------------
const DEFAULT_ANIM_DATA = {
  idle: { frames: 6, width: 128, height: 128, speed: 8 },
  walk: { frames: 8, width: 128, height: 128, speed: 5 },
  hurt: { frames: 2, width: 128, height: 128, speed: 10 },
  light: { frames: 5, width: 128, height: 128 },
  heavy: { frames: 7, width: 128, height: 128 },
  up: { frames: 6, width: 128, height: 128 },
  air: { frames: 5, width: 128, height: 128 },
  down_air: { frames: 6, width: 128, height: 128 },
  grab: { frames: 6, width: 128, height: 128 }
};

export const characters = {
  goku: {
    rosterKey: "goku",
    name: "Goku",
    universe: "dragon_ball",

    archetypes: ["melee", "transformations"],
    primary: "melee",
    secondary: ["transformations"],

    description:
      "Melee-first fighter whose Super Saiyan transformations boost damage, speed, and combo extensions.",

    usageNotes:
      "Melee is primary. Transformations enhance pressure, damage, and combo routes without replacing close-range combat.",

    traits: {
      hasEnergy: true,
      energyType: "ki", // NEW: For UI and Abilities
      mobility: "high",
      scaling: "burst",
      animeMovement: true
    },

    stats: {
      maxHealth: 1200,
      maxEnergy: 200,
      attack: 92,
      defense: 86,
      speed: 88,
      // NEW: Physics Overrides
      maxJumps: 2,
      dashSpeed: 16,
      dashDuration: 10,
      dashCooldownMax: 40
    },
    animationData: { ...DEFAULT_ANIM_DATA }
  },

  naruto: {
    rosterKey: "naruto",
    name: "Naruto",
    universe: "naruto",

    archetypes: ["melee", "summons", "ranged"],
    primary: "melee",
    secondary: ["summons", "ranged"],

    description:
      "Melee-focused fighter who uses shadow clones and jutsu to extend combos and maintain pressure.",

    usageNotes:
      "Melee is primary. Clones and ranged jutsu support pressure, confirms, and combo continuation rather than replacing hand-to-hand offense.",

    traits: {
      hasEnergy: true,
      energyType: "chakra",
      mobility: "high",
      scaling: "versatile",
      animeMovement: true
    },

    stats: {
      maxHealth: 1180,
      maxEnergy: 190,
      attack: 89,
      defense: 84,
      speed: 90,
      maxJumps: 2,
      dashSpeed: 15,
      dashDuration: 12,
      dashCooldownMax: 45
    },
    animationData: { ...DEFAULT_ANIM_DATA }
  },

  gojo: {
    rosterKey: "gojo",
    name: "Gojo Satoru",
    universe: "jujutsu_kaisen",

    archetypes: ["melee", "ranged"],
    primary: "ranged",
    secondary: ["melee"],

    description:
      "Ranged specialist with exceptional space control, backed by solid melee fundamentals.",

    usageNotes:
      "Ranged combat is primary. Melee remains functional, but neutral and pressure are built around ranged control and technique dominance.",

    traits: {
      hasEnergy: true,
      energyType: "cursed_energy",
      mobility: "high",
      scaling: "control",
      animeMovement: true
    },

    stats: {
      maxHealth: 1160,
      maxEnergy: 220,
      attack: 91,
      defense: 88,
      speed: 87,
      maxJumps: 2,
      dashSpeed: 18, // Faster, teleport-like dash
      dashDuration: 8,
      dashCooldownMax: 35
    },
    // Gojo might have custom animations for Blue/Red that you inject here later
    animationData: { ...DEFAULT_ANIM_DATA }
  },

  megumi: {
    rosterKey: "megumi",
    name: "Megumi Fushiguro",
    universe: "jujutsu_kaisen",

    archetypes: ["melee", "summons"],
    primary: "melee",
    secondary: ["summons"],

    description:
      "Base melee fighter whose Ten Shadows summons extend pressure, control space, and create combo routes.",

    usageNotes:
      "Melee is primary. Summons act as extensions to pressure and combo structure. High setup value, especially through Ten Shadows utility.",

    traits: {
      hasEnergy: true,
      energyType: "cursed_energy",
      mobility: "medium",
      scaling: "setup",
      animeMovement: true
    },

    stats: {
      maxHealth: 1120,
      maxEnergy: 210,
      attack: 84,
      defense: 82,
      speed: 83,
      maxJumps: 2,
      dashSpeed: 14,
      dashDuration: 10,
      dashCooldownMax: 45
    },
    animationData: { ...DEFAULT_ANIM_DATA }
  },

  sukuna: {
    rosterKey: "sukuna",
    name: "Sukuna",
    universe: "jujutsu_kaisen",

    archetypes: ["melee", "curse"],
    primary: "melee",
    secondary: ["curse"],

    description:
      "Aggressive melee character whose curse techniques amplify damage and space control.",

    usageNotes:
      "Melee is primary. Curse techniques strengthen offense, reach, and area denial while keeping close-range dominance central.",

    traits: {
      hasEnergy: true,
      energyType: "cursed_energy",
      mobility: "high",
      scaling: "damage",
      animeMovement: true
    },

    stats: {
      maxHealth: 1240,
      maxEnergy: 210,
      attack: 95,
      defense: 87,
      speed: 86,
      maxJumps: 2,
      dashSpeed: 16,
      dashDuration: 10,
      dashCooldownMax: 40
    },
    animationData: { ...DEFAULT_ANIM_DATA }
  },

  omololu: {
    rosterKey: "omololu",
    name: "Omololu",
    universe: "original",

    archetypes: ["melee", "analysis"],
    primary: "melee",
    secondary: ["analysis"],

    description:
      "Melee combatant who becomes stronger and more accurate over prolonged combat through analytical adaptation.",

    usageNotes:
      "Melee is primary. Analytical buffs improve consistency, damage, and timing as the fight continues.",

    traits: {
      hasEnergy: true,
      energyType: "stamina",
      mobility: "medium",
      scaling: "ramp",
      animeMovement: true
    },

    stats: {
      maxHealth: 1210,
      maxEnergy: 180,
      attack: 88,
      defense: 90,
      speed: 80,
      maxJumps: 2,
      dashSpeed: 14,
      dashDuration: 10,
      dashCooldownMax: 40
    },
    animationData: { ...DEFAULT_ANIM_DATA }
  },

  toji: {
    rosterKey: "toji",
    name: "Toji",
    universe: "jujutsu_kaisen",

    archetypes: ["melee", "speed"],
    primary: "melee",
    secondary: ["speed"],

    description:
      "Pure melee specialist with no energy system, built around speed, dashes, evasiveness, and relentless close-range offense.",

    usageNotes:
      "Pure melee character. No energy usage. Fewer archetypes means stronger core combat, stronger movement, and faster combo pressure.",

    traits: {
      hasEnergy: false,
      energyType: "none", // UI will hide his energy bar based on this
      mobility: "very_high",
      scaling: "constant_pressure",
      animeMovement: true
    },

    stats: {
      maxHealth: 1260,
      maxEnergy: 0,
      attack: 96,
      defense: 89,
      speed: 98,
      // NEW: Toji's signature movement advantages
      maxJumps: 3,         // Triple Jump!
      dashSpeed: 24,       // Extremely fast dash
      dashDuration: 14,    // Longest dash distance
      dashCooldownMax: 20  // Can spam dashes
    },
    animationData: { ...DEFAULT_ANIM_DATA }
  },

  mahoraga: {
    rosterKey: "mahoraga",
    name: "Mahoraga",
    universe: "jujutsu_kaisen",

    archetypes: ["melee", "adaptation"],
    primary: "melee",
    secondary: ["adaptation"],

    description:
      "A one-way transformation form used by Megumi's ritual system. Heavy melee pressure with adaptive durability and power.",

    usageNotes:
      "Permanent ritual transformation state. Built for overwhelming melee pressure and adaptation rather than flexible utility.",

    traits: {
      hasEnergy: false,
      energyType: "none",
      mobility: "medium",
      scaling: "adaptation",
      animeMovement: true
    },

    stats: {
      maxHealth: 1600,
      maxEnergy: 0,
      attack: 104,
      defense: 100,
      speed: 82,
      // Heavy fighter movement constraints
      maxJumps: 1,         // Only single jump
      dashSpeed: 12,       // Slow burst speed
      dashDuration: 8,
      dashCooldownMax: 60  
    },
    animationData: { ...DEFAULT_ANIM_DATA }
  }
}

// Ordered roster for menus, selection screens, or iteration.
export const characterList = [
  characters.goku,
  characters.naruto,
  characters.gojo,
  characters.megumi,
  characters.sukuna,
  characters.omololu,
  characters.toji
]

// Roster rules aligned to your design guidelines.
export const rosterRules = {
  meleeIsPrimaryForAll: true,
  secondaryArchetypesEnhanceMelee: true,
  fewerArchetypesMeansStrongerCoreMechanics: true,
  playerUsageShouldMatchCharacterFocus: true,
  animeStyleMovementNotLiteralTeleportation: true
}

// Helper: get by exact roster key
export function getCharacter(key) {
  if (!key) return null
  return characters[String(key).trim().toLowerCase()] || null
}

// Helper: get by display name
export function getCharacterByName(name) {
  if (!name) return null

  const lower = String(name).trim().toLowerCase()

  return (
    Object.values(characters).find(
      (character) => character.name.toLowerCase() === lower
    ) || null
  )
}

// Helper: filter all by archetype
export function getByArchetype(type) {
  if (!type) return []
  const lower = String(type).trim().toLowerCase()

  return Object.values(characters).filter((character) =>
    character.archetypes.includes(lower)
  )
}

// Helper: only selectable base roster, excluding special transformation forms
export function getSelectableRoster() {
  return characterList
}

export default characters
