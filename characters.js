// characters.js
// SINGLE SOURCE OF TRUTH — replaces roster.js entirely.
// Merge of both character sources into one central roster.

const DEFAULT_ANIM = {
  idle:     { frames: 6, width: 128, height: 128, speed: 8 },
  walk:     { frames: 8, width: 128, height: 128, speed: 5 },
  hurt:     { frames: 2, width: 128, height: 128, speed: 10 },
  light:    { frames: 5, width: 128, height: 128 },
  heavy:    { frames: 7, width: 128, height: 128 },
  up:       { frames: 6, width: 128, height: 128 },
  air:      { frames: 5, width: 128, height: 128 },
  down_air: { frames: 6, width: 128, height: 128 },
  grab:     { frames: 6, width: 128, height: 128 }
}

// ─────────────────────────────────────────────────────────────────
// DRAGON BALL
// ─────────────────────────────────────────────────────────────────
const goku = {
  rosterKey: "goku", name: "Goku", universe: "dragon_ball",
  archetypes: ["melee", "transformations"],
  primary: "melee", secondary: ["transformations"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1200, maxEnergy: 200, attack: 92, defense: 86, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    dragonFist: { cost: 40, damage: 150, startup: 10, active: 6, recovery: 22, hitstun: 28, knockbackX: 12, knockbackY: -6, effect: "punch attack with dragon aura" },
    kamehameha: { cost: 30, damage: 120, startup: 12, active: 5, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: -2 }
  },
  ultimate: { name: "Super Saiyan Blue", cost: 100, duration: 8, effect: "Triggers next SSJ transformation" },
  transformationOrder: ["base","ssj1","ssj2","ssj3","ssblue","ultraInstinct"],
  transformations: {
    base:          { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    ssj1:          { damageMultiplier: 1.2, speedMultiplier: 1.1, defenseMultiplier: 1.05, duration: 1800 },
    ssj2:          { damageMultiplier: 1.3, speedMultiplier: 1.15, defenseMultiplier: 1.1, duration: 1500 },
    ssj3:          { damageMultiplier: 1.5, speedMultiplier: 1.2, defenseMultiplier: 1.05, kiDrainPerSecond: 5, duration: 900 },
    ssblue:        { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.2, kiDrainPerSecond: 8, isSpecial: true, duration: 720 },
    ultraInstinct: { damageMultiplier: 2.5, speedMultiplier: 2, defenseMultiplier: 1.5, autoDodge: true, autoDodgeKiCost: 10, kiDrainPerSecond: 12, isSpecial: true, duration: 480 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const vegeta = {
  rosterKey: "vegeta", name: "Vegeta", universe: "dragon_ball",
  archetypes: ["melee", "transformations"],
  primary: "melee", secondary: ["transformations"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 91, defense: 85, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    galickGun:     { cost: 30, damage: 120, startup: 12, active: 5, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "powerful ki beam" },
    finalFlash:    { cost: 40, damage: 160, startup: 18, active: 6, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "concentrated energy blast" },
    bigBangAttack: { cost: 25, damage: 130, startup: 10, active: 5, recovery: 20, hitstun: 20, knockbackX: 9, knockbackY: -1, effect: "explosive ki attack" }
  },
  ultimate: { name: "Super Saiyan Blue Evolution", cost: 100, duration: 8, effect: "Triggers next transformation" },
  transformationOrder: ["base","ssj1","ssj2","ssblue","ssbEvolution","ultraEgo"],
  transformations: {
    base:         { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    ssj1:         { damageMultiplier: 1.2, speedMultiplier: 1.1, defenseMultiplier: 1.05, duration: 1800 },
    ssj2:         { damageMultiplier: 1.3, speedMultiplier: 1.15, defenseMultiplier: 1.1, duration: 1500 },
    ssblue:       { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.2, kiDrainPerSecond: 8, isSpecial: true, duration: 720 },
    ssbEvolution: { damageMultiplier: 2.3, speedMultiplier: 1.5, defenseMultiplier: 1.25, kiDrainPerSecond: 10, isSpecial: true, duration: 600 },
    ultraEgo:     { damageMultiplier: 2.5, speedMultiplier: 1.8, defenseMultiplier: 0.9, rageHealOnHit: 15, healCostPerHitKi: 6, kiDrainPerSecond: 12, isSpecial: true, duration: 480 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const piccolo = {
  rosterKey: "piccolo", name: "Piccolo", universe: "dragon_ball",
  archetypes: ["melee", "ranged"],
  primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "medium", scaling: "control", animeMovement: true },
  stats: { maxHealth: 1100, maxEnergy: 160, attack: 84, defense: 86, speed: 80, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 80, startup: 9, active: 4, recovery: 19, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 60, startup: 8, active: 4, recovery: 16, hitstun: 18, knockbackX: 2, knockbackY: -7 },
    airAttack: { damage: 55, startup: 6, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 70, startup: 9, active: 4, recovery: 14, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 28, startup: 7, active: 3, recovery: 14, hitstun: 18, throwForceX: 4, throwForceY: -3 }
  },
  specials: {
    specialBeamCannon: { cost: 35, damage: 150, startup: 16, active: 4, recovery: 24, hitstun: 26, knockbackX: 11, knockbackY: -3, effect: "piercing ki attack" },
    hellzoneGrenade:   { cost: 30, damage: 100, startup: 14, active: 8, recovery: 24, hitstun: 20, knockbackX: 7, knockbackY: -1, effect: "multi-ki ball attack" }
  },
  ultimate: { name: "Fused with Kami", cost: 100, duration: 6, effect: "Enhanced stats and ki attacks" },
  transformationOrder: ["base","fusedWithKami"],
  transformations: {
    base:          { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    fusedWithKami: { damageMultiplier: 1.4, speedMultiplier: 1.2, defenseMultiplier: 1.15, duration: 1200 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const frieza = {
  rosterKey: "frieza", name: "Frieza", universe: "dragon_ball",
  archetypes: ["melee", "ranged"],
  primary: "ranged", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1200, maxEnergy: 170, attack: 90, defense: 84, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 9, dashCooldownMax: 38 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 28, startup: 5, active: 3, recovery: 13, hitstun: 18, throwForceX: 4, throwForceY: -3 }
  },
  specials: {
    deathBeam:         { cost: 20, damage: 90, startup: 8, active: 3, recovery: 16, hitstun: 16, knockbackX: 6, knockbackY: -1, effect: "precise ki blast" },
    novaStrike:        { cost: 30, damage: 140, startup: 12, active: 5, recovery: 22, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "large ki explosion" },
    ultimateDeathBall: { cost: 50, damage: 200, startup: 20, active: 6, recovery: 30, hitstun: 32, knockbackX: 14, knockbackY: -4, effect: "huge energy sphere" }
  },
  ultimate: { name: "Golden Frieza", cost: 100, duration: 8, effect: "Massive speed and attack boost" },
  transformationOrder: ["base","goldenFrieza"],
  transformations: {
    base:         { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    goldenFrieza: { damageMultiplier: 2, speedMultiplier: 1.5, defenseMultiplier: 1.2, kiDrainPerSecond: 6, isSpecial: true, duration: 720 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const cell = {
  rosterKey: "cell", name: "Cell", universe: "dragon_ball",
  archetypes: ["melee", "absorb"],
  primary: "melee", secondary: ["absorb"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "medium", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1300, maxEnergy: 170, attack: 94, defense: 90, speed: 82, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: {
    light:     { damage: 50, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 95, startup: 9, active: 4, recovery: 19, hitstun: 19, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 65, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 85, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 35, startup: 6, active: 4, recovery: 16, hitstun: 22, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    kamehameha:      { cost: 30, damage: 120, startup: 12, active: 5, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "ki blast" },
    solarKamehameha: { cost: 40, damage: 160, startup: 18, active: 6, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "stronger ki blast" }
  },
  ultimate: { name: "Perfect Cell", cost: 100, duration: 8, effect: "Max attack, speed, and ki regen" },
  transformationOrder: ["base","perfectCell"],
  transformations: {
    base:        { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    perfectCell: { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.3, kiDrainPerSecond: 5, isSpecial: true, duration: 720 }
  },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// JUJUTSU KAISEN
// ─────────────────────────────────────────────────────────────────
const gojo = {
  rosterKey: "gojo", name: "Gojo Satoru", universe: "jujutsu_kaisen",
  archetypes: ["ranged", "melee"],
  primary: "ranged", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "control", animeMovement: true },
  stats: { maxHealth: 1160, maxEnergy: 220, attack: 91, defense: 88, speed: 87, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 8, dashCooldownMax: 35 },
  hasSprites: true,
  spriteSheet: "assets/gojo_atlas.png",
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -5 }
  },
  specials: {
    blue:         { cost: 30, damage: 110, startup: 10, active: 5, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: -2, effect: "attraction singularity" },
    red:          { cost: 40, damage: 130, startup: 14, active: 5, recovery: 22, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "repulsion singularity" },
    hollowPurple: { cost: 70, damage: 200, startup: 20, active: 6, recovery: 30, hitstun: 32, knockbackX: 14, knockbackY: -4, effect: "convergence of blue and red" }
  },
  ultimate: { name: "Unlimited Void", cost: 100, duration: 10, effect: "Domain expansion; Infinity auto-dodge" },
  domain: { name: "Unlimited Void", priority: 3, background: "void" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: {
    ...DEFAULT_ANIM,
    light: { frames: 5, width: 128, height: 128, speed: 4, startup: [0,1], active: [2,3], recovery: [4] },
    heavy: { frames: 7, width: 128, height: 128, speed: 5, startup: [0,1,2], active: [3,4], recovery: [5,6] },
    special_purple: { frames: 10, width: 256, height: 128, speed: 6, startup: [0,1,2,3,4], active: [5,6,7,8], recovery: [9] }
  }
}

const megumi = {
  rosterKey: "megumi", name: "Megumi Fushiguro", universe: "jujutsu_kaisen",
  archetypes: ["melee", "summons"],
  primary: "melee", secondary: ["summons"],
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "medium", scaling: "setup", animeMovement: true },
  stats: { maxHealth: 1120, maxEnergy: 210, attack: 84, defense: 82, speed: 83, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 82, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 58, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 76, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 28, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 4, throwForceY: -4 }
  },
  specials: {
    divineDogs:   { cost: 20, damage: 95, startup: 10, active: 5, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, subtype: "summon", summonId: "divineDogs", cooldown: 120, effect: "summons divine dogs" },
    nue:          { cost: 25, damage: 110, startup: 14, active: 5, recovery: 20, hitstun: 20, knockbackX: 5, knockbackY: -6, subtype: "summon", summonId: "nue", cooldown: 160, effect: "aerial lightning strike" },
    toad:         { cost: 20, damage: 70, startup: 12, active: 6, recovery: 19, hitstun: 22, knockbackX: 2, knockbackY: 0, subtype: "summon", summonId: "toad", cooldown: 140, effect: "restrain opponent" },
    rabbitEscape: { cost: 15, damage: 20, startup: 9, active: 18, recovery: 14, hitstun: 6, knockbackX: 0, knockbackY: 0, subtype: "summon", summonId: "rabbitEscape", cooldown: 180, effect: "swarm distraction" },
    maxElephant:  { cost: 35, damage: 145, startup: 20, active: 6, recovery: 26, hitstun: 24, knockbackX: 9, knockbackY: -2, subtype: "summon", summonId: "maxElephant", cooldown: 240, effect: "massive crushing attack" }
  },
  ultimate: {
    name: "Mahoraga Ritual", cost: 100, permanent: true, oneWay: true, deathRitual: true,
    disableSpecials: ["divineDogs","nue","toad","rabbitEscape","maxElephant"],
    effect: "Permanently transforms Megumi into Mahoraga in-place"
  },
  mahoragaStats: { name: "Mahoraga", maxHealth: 1600, damageMultiplier: 1.5, speedMultiplier: 0.9, defenseMultiplier: 1.35, color: "#7c3aed", maxAdaptationLevel: 3 },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const sukuna = {
  rosterKey: "sukuna", name: "Sukuna", universe: "jujutsu_kaisen",
  archetypes: ["melee", "curse"],
  primary: "melee", secondary: ["curse"],
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "damage", animeMovement: true },
  stats: { maxHealth: 1240, maxEnergy: 210, attack: 95, defense: 87, speed: 86, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 50, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 100, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 90, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 40, startup: 5, active: 3, recovery: 13, hitstun: 22, throwForceX: 6, throwForceY: -4 }
  },
  specials: {
    cleave:    { cost: 40, damage: 160, startup: 10, active: 6, recovery: 20, hitstun: 28, knockbackX: 11, knockbackY: -3, effect: "slashing cursed technique" },
    dismantle: { cost: 35, damage: 140, startup: 10, active: 5, recovery: 20, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "ranged slashing attack" }
  },
  ultimate: { name: "Malevolent Shrine", cost: 100, duration: 10, effect: "Domain expansion" },
  domain: { name: "Malevolent Shrine", priority: 4, background: "shrine" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const omololu = {
  rosterKey: "omololu", name: "Omololu", universe: "original",
  archetypes: ["melee", "analysis"],
  primary: "melee", secondary: ["analysis"],
  traits: { hasEnergy: true, energyType: "stamina", mobility: "medium", scaling: "ramp", animeMovement: true },
  stats: { maxHealth: 1210, maxEnergy: 180, attack: 88, defense: 90, speed: 80, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 44, startup: 5, active: 3, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 84, startup: 9, active: 4, recovery: 18, hitstun: 18, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 68, startup: 8, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 58, startup: 6, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 74, startup: 9, active: 4, recovery: 14, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 30, startup: 7, active: 3, recovery: 15, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  specials: {
    analysisStrike: { cost: 30, damage: 130, startup: 12, active: 5, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -1, effect: "reads opponent pattern and strikes weak point" }
  },
  ultimate: { name: "Full Analysis", cost: 100, duration: 8, effect: "Damage multiplier stacks each hit for 8s" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const toji = {
  rosterKey: "toji", name: "Toji", universe: "jujutsu_kaisen",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1260, maxEnergy: 0, attack: 96, defense: 89, speed: 98, maxJumps: 3, jumpPower: 36, dashSpeed: 24, dashDuration: 14, dashCooldownMax: 20 },
  basic_attacks: {
    light:     { damage: 52, startup: 3, active: 3, recovery: 9, hitstun: 13, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 96, startup: 7, active: 4, recovery: 16, hitstun: 19, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 72, startup: 6, active: 4, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -9 },
    airAttack: { damage: 62, startup: 4, active: 3, recovery: 9, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 82, startup: 7, active: 4, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 40, startup: 4, active: 3, recovery: 12, hitstun: 22, throwForceX: 7, throwForceY: -5 }
  },
  specials: {
    inventorySmash: { cost: 0, damage: 155, startup: 8, active: 5, recovery: 18, hitstun: 26, knockbackX: 10, knockbackY: -3, effect: "weapon strike from inventory" },
    rapidStrike:    { cost: 0, damage: 65, startup: 4, active: 4, recovery: 10, hitstun: 14, knockbackX: 5, knockbackY: -1 }
  },
  ultimate: { name: "Heavenly Restriction", cost: 0, duration: 8, effect: "1.8x speed and 1.6x damage surge" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const mahoraga = {
  rosterKey: "mahoraga", name: "Mahoraga", universe: "jujutsu_kaisen",
  archetypes: ["melee", "adaptation"],
  primary: "melee", secondary: ["adaptation"],
  traits: { hasEnergy: false, energyType: "none", mobility: "medium", scaling: "adaptation", animeMovement: true },
  stats: { maxHealth: 1600, maxEnergy: 0, attack: 104, defense: 100, speed: 82, maxJumps: 1, jumpPower: 28, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 60 },
  basic_attacks: {
    light:     { damage: 65, startup: 5, active: 4, recovery: 12, hitstun: 15, knockbackX: 5, knockbackY: 0 },
    heavy:     { damage: 120, startup: 11, active: 5, recovery: 22, hitstun: 22, knockbackX: 9, knockbackY: 1 },
    upAttack:  { damage: 90, startup: 10, active: 5, recovery: 20, hitstun: 24, knockbackX: 3, knockbackY: -10 },
    airAttack: { damage: 75, startup: 7, active: 4, recovery: 14, hitstun: 16, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 100, startup: 11, active: 5, recovery: 18, hitstun: 22, knockbackX: 1, knockbackY: 12 }
  },
  specials: {
    wheelRotation: { cost: 0, damage: 180, startup: 18, active: 6, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "divine wheel slash" },
    adaptation:    { cost: 0, damage: 0, startup: 1, active: 1, recovery: 1, hitstun: 0, knockbackX: 0, knockbackY: 0, effect: "passive: adapts to attack types each time hit" }
  },
  ultimate: { name: "Eight-Handled Wheel", cost: 0, duration: -1, effect: "Adaptation stacks permanently" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1, permanent: true } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// NARUTO
// ─────────────────────────────────────────────────────────────────
const naruto = {
  rosterKey: "naruto", name: "Naruto", universe: "naruto",
  archetypes: ["melee", "summons", "ranged"],
  primary: "melee", secondary: ["summons", "ranged"],
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  stats: { maxHealth: 1180, maxEnergy: 190, attack: 89, defense: 84, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 82, startup: 8, active: 4, recovery: 18, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 19, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 56, startup: 5, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 72, startup: 8, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    rasengan:         { cost: 35, damage: 140, startup: 10, active: 5, recovery: 20, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "spiraling chakra sphere" },
    shadowCloneBlast: { cost: 25, damage: 80, startup: 8, active: 6, recovery: 16, hitstun: 16, knockbackX: 6, knockbackY: -1, subtype: "summon", effect: "shadow clone rush attack" }
  },
  ultimate: { name: "Sage Mode", cost: 100, duration: 10, effect: "Triggers next transformation" },
  transformationOrder: ["base","sageMode","kcmMode","baryonMode"],
  transformations: {
    base:       { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    sageMode:   { damageMultiplier: 1.4, speedMultiplier: 1.2, defenseMultiplier: 1.2, kiDrainPerSecond: 4, duration: 1080 },
    kcmMode:    { damageMultiplier: 1.8, speedMultiplier: 1.5, defenseMultiplier: 1.1, kiDrainPerSecond: 7, isSpecial: true, duration: 840 },
    baryonMode: { damageMultiplier: 2.8, speedMultiplier: 2, defenseMultiplier: 0.8, kiDrainPerSecond: 20, isSpecial: true, duration: 360 }
  },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// DEMON SLAYER
// ─────────────────────────────────────────────────────────────────
const tanjiro = {
  rosterKey: "tanjiro", name: "Tanjiro Kamado", universe: "demon_slayer",
  archetypes: ["melee", "breathing"],
  primary: "melee", secondary: ["breathing"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "versatile", animeMovement: true },
  stats: { maxHealth: 1100, maxEnergy: 0, attack: 86, defense: 82, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 75, startup: 8, active: 4, recovery: 14, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 28, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 4, throwForceY: -3 }
  },
  specials: {
    waterSurfaceSlasher: { cost: 0, damage: 120, startup: 11, active: 4, recovery: 20, hitstun: 21, knockbackX: 8, knockbackY: -1, effect: "sweeping water blade" },
    danceOfTheFireflies: { cost: 0, damage: 100, startup: 9, active: 6, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, effect: "rapid multi-slash attack" }
  },
  ultimate: { name: "Hinokami Kagura", cost: 0, duration: 8, effect: "Flame transformation" },
  transformationOrder: ["base","hinokamiKagura"],
  transformations: {
    base:           { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    hinokamiKagura: { damageMultiplier: 1.6, speedMultiplier: 1.3, defenseMultiplier: 0.9, duration: 900 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const nezuko = {
  rosterKey: "nezuko", name: "Nezuko Kamado", universe: "demon_slayer",
  archetypes: ["melee", "demon"],
  primary: "melee", secondary: ["demon"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "ramp", animeMovement: true },
  stats: { maxHealth: 1050, maxEnergy: 0, attack: 82, defense: 78, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 10, dashCooldownMax: 38 },
  basic_attacks: {
    light:     { damage: 40, startup: 4, active: 3, recovery: 9, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 80, startup: 7, active: 4, recovery: 16, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 65, startup: 6, active: 4, recovery: 15, hitstun: 19, knockbackX: 2, knockbackY: -7 },
    airAttack: { damage: 55, startup: 4, active: 3, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 70, startup: 8, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 }
  },
  specials: {
    bloodDemonArt: { cost: 0, damage: 140, startup: 12, active: 5, recovery: 21, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "explosive demonic attack" }
  },
  ultimate: { name: "Full Demon Transformation", cost: 0, duration: 8, effect: "Increased speed, damage, and regeneration" },
  transformationOrder: ["base","fullDemon"],
  transformations: {
    base:      { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    fullDemon: { damageMultiplier: 1.7, speedMultiplier: 1.4, defenseMultiplier: 0.85, duration: 14 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const zenitsu = {
  rosterKey: "zenitsu", name: "Zenitsu Agatsuma", universe: "demon_slayer",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1000, maxEnergy: 0, attack: 88, defense: 74, speed: 96, maxJumps: 2, jumpPower: 30, dashSpeed: 20, dashDuration: 8, dashCooldownMax: 35 },
  basic_attacks: {
    light:     { damage: 50, startup: 3, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 90, startup: 7, active: 3, recovery: 16, hitstun: 19, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 6, active: 3, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 4, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 7, active: 3, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    thunderClapStrike: { cost: 0, damage: 150, startup: 8, active: 4, recovery: 18, hitstun: 25, knockbackX: 10, knockbackY: -2, effect: "instant high-speed lightning attack" }
  },
  ultimate: { name: "Thunder Breathing Mastery", cost: 0, duration: 6, effect: "Extreme speed, multi-strike combos, high crit chance" },
  transformationOrder: ["base","sleepingThunder"],
  transformations: {
    base:            { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    sleepingThunder: { damageMultiplier: 1.8, speedMultiplier: 1.6, defenseMultiplier: 0.8, duration: 10 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const inosuke = {
  rosterKey: "inosuke", name: "Inosuke Hashibira", universe: "demon_slayer",
  archetypes: ["melee", "berserk"],
  primary: "melee", secondary: ["berserk"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1080, maxEnergy: 0, attack: 87, defense: 80, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 17, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 15, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 65, startup: 5, active: 3, recovery: 9, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 75, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 }
  },
  specials: {
    dualSwordFrenzy: { cost: 0, damage: 140, startup: 10, active: 6, recovery: 20, hitstun: 23, knockbackX: 8, knockbackY: -1, effect: "spinning multi-slash attack" }
  },
  ultimate: { name: "Beast Breathing Dragon Head", cost: 0, duration: 8, effect: "Massive speed and attack boost, unpredictable combo patterns" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const rengoku = {
  rosterKey: "rengoku", name: "Kyojuro Rengoku", universe: "demon_slayer",
  archetypes: ["melee", "flame"],
  primary: "melee", secondary: ["flame"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1150, maxEnergy: 0, attack: 92, defense: 84, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 50, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 90, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    flameBreathingFirstForm: { cost: 0, damage: 150, startup: 11, active: 5, recovery: 21, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "fiery single slash" }
  },
  ultimate: { name: "Flame Pillar's Might", cost: 0, duration: 8, effect: "Enhanced attack, speed, and fiery AoE strikes" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const akaza = {
  rosterKey: "akaza", name: "Akaza", universe: "demon_slayer",
  archetypes: ["melee", "demon"],
  primary: "melee", secondary: ["demon"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "ramp", animeMovement: true },
  stats: { maxHealth: 1250, maxEnergy: 0, attack: 96, defense: 88, speed: 90, maxJumps: 2, jumpPower: 30, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: {
    light:     { damage: 50, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 100, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 90, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    destructiveStrike: { cost: 0, damage: 160, startup: 12, active: 5, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -2, effect: "powerful destructive attack" }
  },
  ultimate: { name: "Upper Moon Three Form", cost: 0, duration: 8, effect: "Increased damage, speed, and regeneration" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// RICK & MORTY
// ─────────────────────────────────────────────────────────────────
const rick = {
  rosterKey: "rick", name: "Rick Sanchez", universe: "rick_and_morty",
  archetypes: ["ranged", "gadgets"],
  primary: "ranged", secondary: ["gadgets"],
  traits: { hasEnergy: true, energyType: "portal_tech", mobility: "medium", scaling: "versatile", animeMovement: false },
  stats: { maxHealth: 1050, maxEnergy: 160, attack: 86, defense: 78, speed: 78, maxJumps: 2, jumpPower: 28, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 50, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 90, startup: 9, active: 4, recovery: 19, hitstun: 19, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 8, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 6, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  specials: {
    portalBlast:    { cost: 30, damage: 140, startup: 11, active: 5, recovery: 21, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "portal-based energy projectile" },
    meeseeksSummon: { cost: 40, damage: 120, startup: 14, active: 6, recovery: 24, hitstun: 20, knockbackX: 7, knockbackY: -1, subtype: "summon", effect: "summons a Meeseeks to assist" }
  },
  ultimate: { name: "Ultimate Gadgetry", cost: 100, duration: 8, effect: "All attacks gain massive damage and range" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const morty = {
  rosterKey: "morty", name: "Morty Smith", universe: "rick_and_morty",
  archetypes: ["melee", "panic"],
  primary: "melee", secondary: ["panic"],
  traits: { hasEnergy: true, energyType: "portal_tech", mobility: "low", scaling: "burst", animeMovement: false },
  stats: { maxHealth: 980, maxEnergy: 120, attack: 74, defense: 72, speed: 72, maxJumps: 2, jumpPower: 26, dashSpeed: 12, dashDuration: 10, dashCooldownMax: 50 },
  basic_attacks: {
    light:     { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 70, startup: 9, active: 4, recovery: 18, hitstun: 16, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 60, startup: 8, active: 4, recovery: 16, hitstun: 18, knockbackX: 2, knockbackY: -7 },
    airAttack: { damage: 50, startup: 6, active: 3, recovery: 10, hitstun: 11, knockbackX: 2, knockbackY: -2 },
    downAir:   { damage: 65, startup: 9, active: 4, recovery: 14, hitstun: 15, knockbackX: 1, knockbackY: 9 }
  },
  specials: {
    nerveStrike: { cost: 25, damage: 100, startup: 9, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, effect: "quick panic-fueled strike" }
  },
  ultimate: { name: "Morty's Courage", cost: 100, duration: 6, effect: "Dramatically boosts attack and speed temporarily" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const evilMorty = {
  rosterKey: "evilMorty", name: "Evil Morty", universe: "rick_and_morty",
  archetypes: ["melee", "control"],
  primary: "melee", secondary: ["control"],
  traits: { hasEnergy: true, energyType: "portal_tech", mobility: "medium", scaling: "control", animeMovement: false },
  stats: { maxHealth: 1100, maxEnergy: 150, attack: 86, defense: 82, speed: 82, maxJumps: 2, jumpPower: 28, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 44 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    manipulativeBlast: { cost: 30, damage: 140, startup: 12, active: 5, recovery: 21, hitstun: 23, knockbackX: 9, knockbackY: -2, effect: "psychic energy attack" }
  },
  ultimate: { name: "Evil Morty's Takeover", cost: 100, duration: 8, effect: "Increased speed, damage, and enemy debuffs" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const rickPrime = {
  rosterKey: "rickPrime", name: "Rick Prime", universe: "rick_and_morty",
  archetypes: ["ranged", "gadgets"],
  primary: "ranged", secondary: ["gadgets"],
  traits: { hasEnergy: true, energyType: "portal_tech", mobility: "high", scaling: "burst", animeMovement: false },
  stats: { maxHealth: 1120, maxEnergy: 180, attack: 92, defense: 82, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 38 },
  basic_attacks: {
    light:     { damage: 55, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 95, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 7, active: 4, recovery: 16, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 65, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 90, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    primePortalBlast: { cost: 35, damage: 160, startup: 12, active: 5, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -2, effect: "extremely powerful multiverse energy attack" }
  },
  ultimate: { name: "Rick Prime's Supremacy", cost: 100, duration: 10, effect: "Massive speed, attack boost, and random gadget chaos" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────
export const characters = {
  goku, vegeta, piccolo, frieza, cell,
  gojo, megumi, sukuna, omololu, toji, mahoraga,
  naruto,
  tanjiro, nezuko, zenitsu, inosuke, rengoku, akaza,
  rick, morty, evilMorty, rickPrime
}

// The 7 characters shown in the starter roster select screen
export const starterRoster = [goku, naruto, gojo, megumi, sukuna, omololu, toji]

// Full flat list
export const characterList = Object.values(characters)

export const rosterRules = {
  meleeIsPrimaryForAll: true,
  secondaryArchetypesEnhanceMelee: true,
  fewerArchetypesMeansStrongerCoreMechanics: true,
  playerUsageShouldMatchCharacterFocus: true,
  animeStyleMovementNotLiteralTeleportation: true
}

export function getCharacter(key) {
  if (!key) return null
  return characters[String(key).trim().toLowerCase()] || null
}

export function getSelectableRoster() {
  return characterList
}

export default characters
