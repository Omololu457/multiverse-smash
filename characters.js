// characters.js
// Central roster keyed for systems like abilities.js, movesets, summons, and transformations.

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
    rosterKey: "goku", name: "Goku", universe: "dragon_ball",
    archetypes: ["melee", "transformations"], primary: "melee", secondary: ["transformations"],
    traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
    stats: { maxHealth: 1200, maxEnergy: 200, attack: 92, defense: 86, speed: 88, maxJumps: 2, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
    animationData: { ...DEFAULT_ANIM_DATA }
  },
  naruto: {
    rosterKey: "naruto", name: "Naruto", universe: "naruto",
    archetypes: ["melee", "summons", "ranged"], primary: "melee", secondary: ["summons", "ranged"],
    traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
    stats: { maxHealth: 1180, maxEnergy: 190, attack: 89, defense: 84, speed: 90, maxJumps: 2, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 45 },
    animationData: { ...DEFAULT_ANIM_DATA }
  },
  gojo: {
    rosterKey: "gojo", name: "Gojo Satoru", universe: "jujutsu_kaisen",
    archetypes: ["melee", "ranged"], primary: "ranged", secondary: ["melee"],
    traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "control", animeMovement: true },
    stats: { maxHealth: 1160, maxEnergy: 220, attack: 91, defense: 88, speed: 87, maxJumps: 2, dashSpeed: 18, dashDuration: 8, dashCooldownMax: 35 },
    
    // GOJO HYBRID ENGINE DATA
    hasSprites: true, 
    spriteSheet: "assets/gojo_atlas.png", 
    animationData: { 
      idle: { frames: 6, width: 128, height: 128, speed: 8 },
      walk: { frames: 8, width: 128, height: 128, speed: 5 },
      hurt: { frames: 2, width: 128, height: 128, speed: 10 },
      up: { frames: 6, width: 128, height: 128 },
      air: { frames: 5, width: 128, height: 128 },
      down_air: { frames: 6, width: 128, height: 128 },
      grab: { frames: 6, width: 128, height: 128 },
      light: { 
        frames: 5, width: 128, height: 128, speed: 4,
        startup: [0, 1],   
        active: [2, 3],    
        recovery: [4]      
      },
      heavy: { 
        frames: 7, width: 128, height: 128, speed: 5,
        startup: [0, 1, 2], 
        active: [3, 4], 
        recovery: [5, 6] 
      },
      special_purple: {
        frames: 10, width: 256, height: 128, speed: 6,
        startup: [0, 1, 2, 3, 4], 
        active: [5, 6, 7, 8],     
        recovery: [9]
      }
    }
  },
  megumi: {
    rosterKey: "megumi", name: "Megumi Fushiguro", universe: "jujutsu_kaisen",
    archetypes: ["melee", "summons"], primary: "melee", secondary: ["summons"],
    traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "medium", scaling: "setup", animeMovement: true },
    stats: { maxHealth: 1120, maxEnergy: 210, attack: 84, defense: 82, speed: 83, maxJumps: 2, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
    animationData: { ...DEFAULT_ANIM_DATA }
  },
  sukuna: {
    rosterKey: "sukuna", name: "Sukuna", universe: "jujutsu_kaisen",
    archetypes: ["melee", "curse"], primary: "melee", secondary: ["curse"],
    traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "damage", animeMovement: true },
    stats: { maxHealth: 1240, maxEnergy: 210, attack: 95, defense: 87, speed: 86, maxJumps: 2, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
    animationData: { ...DEFAULT_ANIM_DATA }
  },
  omololu: {
    rosterKey: "omololu", name: "Omololu", universe: "original",
    archetypes: ["melee", "analysis"], primary: "melee", secondary: ["analysis"],
    traits: { hasEnergy: true, energyType: "stamina", mobility: "medium", scaling: "ramp", animeMovement: true },
    stats: { maxHealth: 1210, maxEnergy: 180, attack: 88, defense: 90, speed: 80, maxJumps: 2, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 40 },
    animationData: { ...DEFAULT_ANIM_DATA }
  },
  toji: {
    rosterKey: "toji", name: "Toji", universe: "jujutsu_kaisen",
    archetypes: ["melee", "speed"], primary: "melee", secondary: ["speed"],
    traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "constant_pressure", animeMovement: true },
    stats: { maxHealth: 1260, maxEnergy: 0, attack: 96, defense: 89, speed: 98, maxJumps: 3, dashSpeed: 24, dashDuration: 14, dashCooldownMax: 20 },
    animationData: { ...DEFAULT_ANIM_DATA }
  },
  mahoraga: {
    rosterKey: "mahoraga", name: "Mahoraga", universe: "jujutsu_kaisen",
    archetypes: ["melee", "adaptation"], primary: "melee", secondary: ["adaptation"],
    traits: { hasEnergy: false, energyType: "none", mobility: "medium", scaling: "adaptation", animeMovement: true },
    stats: { maxHealth: 1600, maxEnergy: 0, attack: 104, defense: 100, speed: 82, maxJumps: 1, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 60 },
    animationData: { ...DEFAULT_ANIM_DATA }
  }
}

export const characterList = [ characters.goku, characters.naruto, characters.gojo, characters.megumi, characters.sukuna, characters.omololu, characters.toji ]
export const rosterRules = { meleeIsPrimaryForAll: true, secondaryArchetypesEnhanceMelee: true, fewerArchetypesMeansStrongerCoreMechanics: true, playerUsageShouldMatchCharacterFocus: true, animeStyleMovementNotLiteralTeleportation: true }
export function getCharacter(key) { if (!key) return null; return characters[String(key).trim().toLowerCase()] || null }
export function getSelectableRoster() { return characterList }
export default characters
