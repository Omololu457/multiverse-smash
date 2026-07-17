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
  hasSprites: true,
  // Base (black-hair) Goku sprites sliced from goku_base_FULLSHEET_transparent.png.
  // Idle source cell 34×37 → ×3.2 ≈ Sukuna/Gojo on-screen height (their 64px cells
  // ×1.8 ≈ 115px; 37×3.2 ≈ 118). His idle is a WIDE stance, so at equal height he
  // reads wider/stockier than the lean JJK sprites — expected, not a bug.
  // ⚠ Goku MUST keep his skins.js SKINS entry: applySkin() pulls spriteScale from the
  // default skin; without it getSkins() forces spriteScale:1 and he shrinks to 37px.
  // BASE only (NOT goku_ssj_god_*); universe "dragon_ball" keeps him out of GojoV1 beta.
  spriteScale: 3.2,
  animationData: {
    ...DEFAULT_ANIM,   // unmapped actions (walk/attacks/…) fall back to the box until their rows are sliced+wired
    // ── ATLAS coords into goku_base_FULLSHEET_transparent.png: sourceX/sourceY = row's
    // top-left; `width` = frame pitch (frames step right by it); `height` = cell height.
    // idle: 6 touching frames, uniform 34px pitch (confirmed even-split). anchorY plants
    // feet on the floor (screen px, scale-independent; more negative = lower).
    idle: { frames: 6, width: 34, height: 37, speed: 6, anchorY: -3, sourceX: 0, sourceY: 10, sheet: "./goku_base_FULLSHEET_transparent.png" }
  }
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
  portrait: "./gojo_portrait.png",   // EXACT on-disk filename (case + extension)
  archetypes: ["ranged", "melee"],
  primary: "ranged", secondary: ["melee"],
  movement: { dashTeleport: true },   // double-tap toward = teleport-dash (blink behind)
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "control", animeMovement: true },
  stats: { maxHealth: 1160, maxEnergy: 220, attack: 91, defense: 88, speed: 87, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 8, dashCooldownMax: 35 },
  hasSprites: true,
  // Source frames are small pixel art (idle 28×64); scale the DRAWN size up ×1.8
  // (64 → ~115px ≈ hitbox height) so Gojo reads as a full-size fighter over the
  // ~60×110 hitbox. Applied in SpriteHandler.draw() to the DESTINATION size only
  // — native slicing is unchanged. (Drop to 1.6 if too tall, raise to 2.0 if short.)
  spriteScale: 1.8,
  // Strip-based sprites load via spritesheets.js SPRITE_MANIFEST (./gojo_<action>_sheet.png).
  // (spriteSheet below is a legacy atlas hint, unused by the strip loader.)
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
  // ── GOJO SPRITES ──────────────────────────────────────────────────
  // Keyed to the engine's REAL action names (sprite.js _resolveAction /
  // MOVE_TO_ACTION) so the strips actually play. Each entry: native SOURCE cell
  // size (width×height, measured = stripWidth/frames), frame count, speed, and
  // the exact `sheet` file. animationProfile.js forwards `sheet` → SpriteHandler
  // _loadSheet(), so the non-convention filenames load directly (e.g. light uses
  // the A-jab strip, "up" uses the B-attack strip gojo_light). Display size is
  // scaled by gojo.spriteScale; the box fallback covers any unmapped/404 action.
  animationData: {
    // movement / state
    idle:     { frames: 4, width: 28, height: 64, speed: 6, sheet: "./gojo_idle_sheet.png"  },
    walk:     { frames: 8, width: 34, height: 63, speed: 5, sheet: "./gojo_walk_sheet.png"  },
    run:      { frames: 8, width: 34, height: 63, speed: 4, sheet: "./gojo_walk_sheet.png"  },
    jump:     { frames: 2, width: 45, height: 63, speed: 6, sheet: "./gojo_jump_sheet.png"  },
    fall:     { frames: 2, width: 45, height: 63, speed: 6, sheet: "./gojo_jump_sheet.png"  },
    dash:     { frames: 1, width: 65, height: 42, speed: 6, sheet: "./gojo_dash_sheet.png"  },
    hurt:     { frames: 6, width: 72, height: 62, speed: 6, sheet: "./gojo_hurt_sheet.png"  },
    // basic attacks
    light:    { frames: 6, width: 49, height: 63, speed: 4, sheet: "./gojo_ajab_sheet.png"  },  // A jab
    heavy:    { frames: 5, width: 55, height: 59, speed: 5, sheet: "./gojo_heavy_sheet.png" },  // C
    up:       { frames: 5, width: 56, height: 62, speed: 5, sheet: "./gojo_light_sheet.png" },  // B (launcher)
    air:      { frames: 6, width: 49, height: 63, speed: 4, sheet: "./gojo_ajab_sheet.png"  },  // reuse jab (air)
    down_air: { frames: 5, width: 55, height: 59, speed: 5, sheet: "./gojo_heavy_sheet.png" },  // reuse C (down)
    grab:     { frames: 6, width: 49, height: 63, speed: 5, sheet: "./gojo_ajab_sheet.png"  },  // reuse jab
    // cinematic / specials
    transform:          { frames: 5, width: 42, height: 64, speed: 6, sheet: "./gojo_intro_sheet.png", loop: false, lockLastFrame: true },  // intro: play once, hold (FIX_3)
    ultimate:           { frames: 3, width: 39, height: 64, speed: 6, sheet: "./gojo_ultimate_sheet.png" },
    domain:             { frames: 4, width: 37, height: 64, speed: 6, sheet: "./gojo_domain_sheet.png" },  // Unlimited Void HAND-SIGN (NOT the gojo_intro coat-throw)
    blue_cast:          { frames: 5, width: 50, height: 64, speed: 5, sheet: "./gojo_max_output_blue_sheet.png" },
    red_cast:           { frames: 5, width: 56, height: 62, speed: 5, sheet: "./gojo_ctr_attack_sheet.png" },
    hollow_purple_cast: { frames: 4, width: 43, height: 63, speed: 5, sheet: "./gojo_hollowpurple_release_sheet.png" },
    // CHARGE strips (Task 1b) — played briefly before the cast strip. Dims MEASURED
    // from the PNGs (frames via alpha-gutter detection, cell = stripWidth/frames).
    blue_charge:          { frames: 4, width: 45, height: 64, speed: 4, sheet: "./gojo_lapse_blue_sheet.png" },          // 180x64
    red_charge:           { frames: 5, width: 50, height: 63, speed: 4, sheet: "./gojo_ctr_charge_sheet.png" },          // 250x63
    hollow_purple_charge: { frames: 7, width: 36, height: 71, speed: 4, sheet: "./gojo_hollowpurple_charge_sheet.png" }  // 252x71
  }
}

const megumi = {
  rosterKey: "megumi", name: "Megumi Fushiguro", universe: "jujutsu_kaisen",
  portrait: "./megumi_pfp.jpeg",   // EXACT on-disk filename (case + extension)
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
  hasSprites: true,
  spriteScale: 1.7,   // source frames ~55–61px tall → ×1.7 ≈ hitbox height
  // ── MEGUMI SPRITES ── engine action keys → strip; native cell = stripWidth/frames.
  // Summon casts use the MOVE_TO_ACTION names (divine_dogs/nue/toad/rabbit_escape/
  // max_elephant); executeMegumiSpecial sets _spriteCastMove so they play.
  animationData: {
    idle:     { frames: 4,  width: 27, height: 61, speed: 6, sheet: "./megumi_stance_sheet.png" },
    walk:     { frames: 10, width: 32, height: 62, speed: 5, sheet: "./megumi_walk_sheet.png" },
    run:      { frames: 10, width: 32, height: 62, speed: 4, sheet: "./megumi_walk_sheet.png" },
    jump:     { frames: 2,  width: 37, height: 56, speed: 6, sheet: "./megumi_jump_sheet.png" },
    fall:     { frames: 2,  width: 37, height: 56, speed: 6, sheet: "./megumi_jump_sheet.png" },
    dash:     { frames: 10, width: 32, height: 62, speed: 4, sheet: "./megumi_walk_sheet.png" },  // no dash strip → reuse walk
    hurt:     { frames: 3,  width: 58, height: 55, speed: 6, sheet: "./megumi_hurt_sheet.png" },
    // attacks (single attack strip reused)
    light:    { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    heavy:    { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    up:       { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    air:      { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    down_air: { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    grab:     { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    // summon casts (shadow techniques)
    divine_dogs:  { frames: 5, width: 38, height: 56, speed: 5, sheet: "./megumi_gama_sheet.png" },
    nue:          { frames: 5, width: 35, height: 50, speed: 5, sheet: "./megumi_nue_sheet.png" },
    toad:         { frames: 5, width: 38, height: 51, speed: 5, sheet: "./megumi_gyokuken_sheet.png" },
    rabbit_escape:{ frames: 5, width: 38, height: 54, speed: 5, sheet: "./megumi_datto_sheet.png" },
    max_elephant: { frames: 5, width: 40, height: 56, speed: 5, sheet: "./megumi_bansho_sheet.png" },
    // cinematic
    domain:   { frames: 2, width: 37, height: 56, speed: 6, sheet: "./megumi_domain_sheet.png" },
    ultimate: { frames: 2, width: 38, height: 56, speed: 6, sheet: "./megumi_makora_sheet.png" },
    transform:{ frames: 2, width: 38, height: 56, speed: 6, sheet: "./megumi_makora_sheet.png" }
  }
}

const sukuna = {
  rosterKey: "sukuna", name: "Sukuna", universe: "jujutsu_kaisen",
  portrait: "./sukuna_portrait.jpg",   // EXACT on-disk filename (case + extension)
  archetypes: ["melee", "curse"],
  primary: "melee", secondary: ["curse"],
  movement: { dashTeleport: true },   // double-tap toward = teleport-dash (blink behind)
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
  hasSprites: true,
  // Source frames are small pixel art (idle 27×64); scale the DRAWN size up ×1.8
  // (64 → ~115px ≈ hitbox height). Applied in SpriteHandler.draw() to the
  // DESTINATION size only — native slicing is unchanged.
  spriteScale: 1.8,
  // ── SUKUNA SPRITES ────────────────────────────────────────────────
  // Keyed to the engine's REAL action names (sprite.js _resolveAction /
  // MOVE_TO_ACTION). Each entry: native SOURCE cell size (width×height =
  // stripWidth/frames), frame count, speed, and the exact `sheet` file
  // (forwarded to SpriteHandler via animationProfile.js → _loadSheet). Only one
  // attack strip exists, so light/heavy/up/air/down_air/grab + cleave/dismantle
  // all reuse it for now. Display size is scaled by spriteScale; unmapped actions
  // fall back to the procedural box.
  animationData: {
    // movement / state
    idle:     { frames: 4,  width: 27, height: 64, speed: 6, sheet: "./sukuna_idle_sheet.png" },
    walk:     { frames: 10, width: 31, height: 63, speed: 5, sheet: "./sukuna_walk_sheet.png" },
    run:      { frames: 10, width: 31, height: 63, speed: 4, sheet: "./sukuna_walk_sheet.png" },
    jump:     { frames: 2,  width: 28, height: 61, speed: 6, sheet: "./sukuna_jump_sheet.png" },
    fall:     { frames: 2,  width: 28, height: 61, speed: 6, sheet: "./sukuna_jump_sheet.png" },
    dash:     { frames: 3,  width: 52, height: 59, speed: 6, sheet: "./sukuna_dash_sheet.png" },
    hurt:     { frames: 2,  width: 42, height: 57, speed: 6, sheet: "./sukuna_hurt_sheet.png" },
    // attacks (single attack strip reused until distinct strips exist)
    light:    { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    heavy:    { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    up:       { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    air:      { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    down_air: { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    grab:     { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    cleave:   { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    dismantle:{ frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    // cinematic
    ultimate: { frames: 4, width: 37, height: 62, speed: 6, sheet: "./sukuna_ultimate_sheet.png" },
    domain:   { frames: 7, width: 36, height: 62, speed: 5, sheet: "./sukuna_domain_sheet.png" },
    // Flame Arrow CHARGE → FIRE strips (Task 1b). Dims MEASURED from the PNGs.
    flame_arrow_charge: { frames: 7, width: 36, height: 62, speed: 4, sheet: "./sukuna_firearrow_charge_sheet.png" }, // 252x62
    flame_arrow_fire:   { frames: 4, width: 59, height: 62, speed: 5, sheet: "./sukuna_firearrow_fire_sheet.png" }    // 236x62
  }
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
  portrait: "./toji_pfp.jpg",   // EXACT on-disk filename (case + extension)
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  // dashTeleport: double-tap TOWARD the enemy → blink behind + instant strike
  // (MK-style teleport-dash). His identity tech — no cursed energy. (game.js
  // detectDoubleTapDashTeleport + abilities.tojiTeleportStrike).
  movement: { dashTeleport: true },
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
  hasSprites: true,
  // SIZE FIX: NEW transparent-bg core sheets are ~48px of content in a 54px cell, so the
  // old 1.7 rendered him ~92px (undersized vs Sasuke ~105 / Sukuna ~118). ×2.3 ≈ 110px
  // on-screen = roster-normal human scale. NOTE: the old row-sheet ATTACK actions (still
  // wired below, deferred to the attack-tree pass) render oversized at 2.3 until re-sliced.
  spriteScale: 2.3,
  // Two-part intro (walk-in → ready-up) plays in FIXED ORDER as ONE intro — NOT a
  // random-pick pool like Sasuke's introPool. game.js steps introSequence in order.
  introSequence: ["introWalkIn", "introReady"],
  // ── TOJI SPRITES ── UNLABELED rows, mapping confirmed by viewing each strip.
  // Native cell = stripWidth/frames. NOTE (sheet gaps): no real walk or hurt
  // frames exist — walk reuses the stance, hurt reuses the guard pose (row10).
  // special_1/special_2 play via executeToji_Special's createAttackFromMove
  // (MOVE_TO_ACTION: inventorySmash→special_1, rapidStrike→special_2).
  animationData: {
    // JITTER FIX: sheets have leading+trailing transparent padding, so the true frame
    // PITCH is smaller than sheetWidth/frames. Slice with sourceX (content-left) + width
    // (true pitch) or the figure drifts within each cell → horizontal wobble. Verified
    // via per-cell leg-COM (idle drift 14px→<3px after fix) + boundary overlays.
    idle:     { frames: 6,  width: 34, sourceX: 9, height: 54, speed: 8, loop: true, anchorY: -2,  sheet: "./toji_stance_idle.png" },  // 6f, true pitch 34 (was 37 → wobble)
    walk:     { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 6, loop: true, anchorY: -12, sheet: "./toji_walk.png" },  // 7f (re-verified, was mis-counted 6), pitch 34 (was 40)
    light:    { frames: 6,  width: 47, height: 65, speed: 4, sheet: "./toji_row02_sheet.png" },  // row02 punch combo
    heavy:    { frames: 6,  width: 73, height: 60, speed: 5, sheet: "./toji_row07_sheet.png" },  // row07 sword slash combo
    up:       { frames: 7,  width: 47, height: 74, speed: 5, sheet: "./toji_row04_sheet.png" },  // row04 kicks (launcher)
    air:      { frames: 5,  width: 65, height: 71, speed: 5, sheet: "./toji_row08_sheet.png" },  // row08 aerial sword
    down_air: { frames: 6,  width: 73, height: 60, speed: 5, sheet: "./toji_row07_sheet.png" },  // reuse slash combo
    dash:     { frames: 10, width: 90, height: 64, speed: 4, sheet: "./toji_row06_sheet.png" },  // row06 sword dash-lunge
    block:    { frames: 9,  width: 37, height: 70, speed: 6, sheet: "./toji_row10_sheet.png" },  // row10 guard
    hurt:     { frames: 8,  width: 48, sourceX: 0, height: 54, speed: 5, anchorY: -7,  sheet: "./toji_hit.png" },  // 8f, content fills width (pitch 48 exact)
    hurt_air: { frames: 6,  width: 51, sourceX: 1, height: 49, speed: 5, anchorY: -2,  sheet: "./toji_air_hit.png" },  // 6f, pitch 51 (was 52); sprite.js picks this when hitstun && airborne
    transform:{ frames: 7,  width: 76, height: 67, speed: 6, sheet: "./toji_row01_sheet.png" },  // row01 sword-draw flourish (intro)
    special_1:{ frames: 14, width: 52, height: 63, speed: 4, sheet: "./toji_row09_sheet.png" },  // Inventory Smash → big slash rekka
    special_2:{ frames: 8,  width: 57, height: 63, speed: 4, sheet: "./toji_row05_sheet.png" },  // Rapid Strike → thrust
    // Chain-Knife / Inverted Spear of Heaven (S,A+L) — confirmed rows: 11 windup,
    // 12 extension, 14 retract, 15 spin (folded into the same move). Dims measured.
    chain_windup:  { frames: 5, width: 96,  height: 69, speed: 4, sheet: "./toji_row11_sheet.png" },  // 480x69
    chain_extend:  { frames: 5, width: 108, height: 69, speed: 4, sheet: "./toji_row12_sheet.png" },  // 540x69
    chain_retract: { frames: 7, width: 121, height: 87, speed: 4, sheet: "./toji_row14_sheet.png" },  // 847x87
    chain_spin:    { frames: 5, width: 85,  height: 78, speed: 4, sheet: "./toji_row15_sheet.png" },  // 424x78
    // NEW two-part intro — plays in fixed order (introSequence), NOT pooled/random.
    introWalkIn: { frames: 17, width: 30, sourceX: 3, height: 45, speed: 2, loop: false, lockLastFrame: true, anchorY: -7, sheet: "./toji_intro_first_part.png" },   // walk-in, pitch 30 + srcX 3
    introReady:  { frames: 15, width: 35, sourceX: 2, height: 47, speed: 3, loop: false, lockLastFrame: true, anchorY: 0,  sheet: "./toji_intro_second_part.png" },  // ready-up, pitch 35 + srcX 2
    // BLADE-STANCE normals (Phase 2). action key == the move name so sprite.js resolves it
    // directly. Sliced sourceX+true-pitch (alpha-gutter verified). Attack `speed` is auto-fit
    // to the move's duration by sprite.updateFrames, so it just needs frames/width/sourceX.
    quickDraw:    { frames: 5, width: 44, sourceX: 3, height: 60, speed: 3, anchorY: -12, sheet: "./toji_sword_attack_1.png" },       // 5A Quick Draw (230x60)
    forwardSlash: { frames: 5, width: 54, sourceX: 9, height: 45, speed: 3, anchorY: -9,  sheet: "./toji_foward_slash_2.png" },       // 5B Forward Slash (286x45)
    skywardCut:   { frames: 5, width: 45, sourceX: 0, height: 55, speed: 3, anchorY: -9,  sheet: "./toji_up_attack.png" },            // 2C Skyward Cut launcher (225x55)
    // 5C Reaper's rekka — 3 segments sliced from the 11-frame toji_Foword_slash_attack (44px/frame).
    reaper1:      { frames: 4, width: 44, sourceX: 0,   height: 44, speed: 3, sheet: "./toji_Foword_slash_attack.png" },   // frames 0-3
    reaper2:      { frames: 4, width: 44, sourceX: 176, height: 44, speed: 3, sheet: "./toji_Foword_slash_attack.png" },   // frames 4-7
    reaper3:      { frames: 3, width: 44, sourceX: 352, height: 44, speed: 3, sheet: "./toji_Foword_slash_attack.png" },   // frames 8-10 (finisher)
    // CHAIN-STANCE normals (Phase 3). sourceX+true-pitch sliced (alpha-gutter verified).
    shortLash:  { frames: 3, width: 60, sourceX: 0, height: 62, speed: 3, anchorY: -7, sheet: "./toji_chain_of_1000_miles_attack_2.png" },        // 5A — TRIMMED to first 3 of 5 frames (the quick lash)
    wideArc:    { frames: 5, width: 66, sourceX: 2, height: 58, speed: 3, anchorY: -9, sheet: "./toji_chain_of_1000_miles_attack_1.png" },        // 5B (341x58, continuous arc → equal split)
    lowSweep:   { frames: 5, width: 81, sourceX: 8, height: 67, speed: 3, anchorY: -2, sheet: "./toji_chain_of_1000_miles_attack_3.png" },        // 6B (446x67)
    risingCoil: { frames: 4, width: 66, sourceX: 6, height: 61, speed: 3, anchorY: -5, sheet: "./toji_chain_of_1000_miles_upper_attack_1.png" },  // 2B anti-air (274x61)
    // run/jump/fall/grab aren't on the supplied table, but a MANIFESTED character
    // can't fall back to the procedural box per-action (unmapped → idle sheet at
    // 128px = garbage), so reuse the closest real strips:
    // Polish (Task 3): run/jump/fall had no real strips and borrowed ATTACK rows,
    // which made plain locomotion play a sword sequence on loop. Fixes:
    //  • run  → reuse the fighting STANCE (row03), not the row06 sword dash-lunge,
    //    so sliding momentum (vx>10) doesn't draw the sword. The dash TECH still
    //    uses row06 via the `dash` slot.
    //  • jump/fall → hold the neutral STANCE (row03), NOT the row08 aerial-SWORD
    //    pose. row08 is a weapon attack; using it (even a single held frame) made a
    //    plain jump read as a sword pose. The real air attack (`air`) keeps row08's
    //    full 5-frame swing. FLAG: no true jump/fall art exists — a held stance is
    //    the least-wrong neutral option until a real jump strip is provided.
    run:      { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 5, loop: true, anchorY: -12, sheet: "./toji_walk.png" },  // reuse walk sheet, 7f pitch 34
    // JUMP SIZE FIX: the jump sheet's frame 0 (takeoff crouch) and frame 6 (land crouch)
    // draw the figure ~35px tall vs ~48px airborne — switching to them read as "sprite
    // gets smaller". Slice ONLY the airborne frames 1–5 (sourceX = 6 + 1×35 = 41), all
    // ~full height, so jump/fall never flash a shrunken crouch. Pitch 35 (was 37 → wobble).
    jump:     { frames: 5,  width: 35, sourceX: 41, height: 64, speed: 5, anchorY: -32, sheet: "./toji_jump.png" },  // airborne arc only (no crouch)
    fall:     { frames: 5,  width: 35, sourceX: 41, height: 64, speed: 5, anchorY: -32, sheet: "./toji_jump.png" },  // same airborne frames
    grab:     { frames: 6,  width: 47, height: 65, speed: 4, sheet: "./toji_row02_sheet.png" }   // reuse punch
    // UNMAPPED — chain / Inverted Spear of Heaven throw sequence (special not yet
    // wired). Register for future chain-special work; frame counts TBD (view to
    // slice): toji_row11_sheet.png 480×69, row12 540×69, row13 575×85,
    // row14 847×87, row15 424×78.
  }
}

const mahoraga = {
  rosterKey: "mahoraga", name: "Mahoraga", universe: "jujutsu_kaisen",
  // NOT selectable — Mahoraga is the form Megumi becomes via her ultimate
  // (abilities.js transformIntoMahoraga reads this block as characters.mahoraga).
  // `hidden` excludes it from character-select / move-list / fallback.
  hidden: true,
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
  portrait: "./naruto_kcm_portrait.png",   // KCM mugshot bust sliced from naruto_kcm_mugshot_lifebars.png (lifebar strips excluded)
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
    // ── RASENGAN FAMILY — Naruto's solo specials, meter-cost only (spendEnergy), NO
    //    shadow-clone involvement. Input map (abilities.executeNarutoSpecial):
    //    neutral L = base; hold P + L = Big Ball (partial) / Rasenshuriken (full charge);
    //    Down + L = Dark Rasengan. (D→F / D→B remain the clone spawn/dispel motions.)
    rasengan:         { cost: 30, damage: 120, startup: 8,  active: 4, recovery: 16, hitstun: 22, knockbackX: 8,  knockbackY: -2, subtype: "projectile", effect: "base Rasengan — fast close-range dashing spiral orb (neutral special)" },
    bigBallRasengan:  { cost: 55, damage: 210, startup: 14, active: 6, recovery: 22, hitstun: 30, knockbackX: 13, knockbackY: -4, subtype: "projectile", effect: "Big Ball Rasengan — hold-charge to grow the sphere; size & damage scale with charge, capped" },
    rasenshuriken:    { cost: 80, damage: 260, startup: 20, active: 8, recovery: 30, hitstun: 34, knockbackX: 15, knockbackY: -3, subtype: "projectile", effect: "Rasenshuriken — FULL-charge wind blade; strongest non-clone special + lingering chip DOT on hit" },
    darkRasengan:     { cost: 45, damage: 180, startup: 12, active: 8, recovery: 22, hitstun: 28, knockbackX: 10, knockbackY: -6, subtype: "aoe",        effect: "Dark Rasengan / Compressed TBB — Down+Special close-range ring-burst that detonates in place (no travel)" },
    kawarimi:         { cost: 25, damage: 0,   startup: 6,  active: 0, recovery: 20, hitstun: 0,  knockbackX: 0,  knockbackY: 0,  subtype: "defensive", effect: "Kawarimi Substitution — Block+Special during a whiff-punish window; smoke-poof teleport behind the opponent, incoming hit whiffs (meter-cost, not a clone share)" },
    // Phase 3: rebuilt as a real clone entity on summons.js (not wired this phase).
    shadowCloneBlast: { cost: 25, damage: 80,  startup: 8,  active: 6, recovery: 16, hitstun: 16, knockbackX: 6,  knockbackY: -1, subtype: "summon",     effect: "shadow clone rush attack" }
  },
  // Kurama Avatar — CINEMATIC ultimate (kurama.js), NOT a transformation. Full-meter
  // gate; the Tailed Beast Bomb sequence is a guaranteed sure-hit. The old
  // sageMode/kcmMode/baryonMode forms below are now UNUSED by the ultimate (kept as
  // dead data; executeNarutoUltimate no longer reads them).
  ultimate: { name: "Kurama Avatar", cost: 100, duration: 3, effect: "Tailed Beast Bomb cinematic — guaranteed sure-hit blast" },
  transformationOrder: ["base","sageMode","kcmMode","baryonMode"],
  transformations: {
    base:       { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    sageMode:   { damageMultiplier: 1.4, speedMultiplier: 1.2, defenseMultiplier: 1.2, kiDrainPerSecond: 4, duration: 1080 },
    kcmMode:    { damageMultiplier: 1.8, speedMultiplier: 1.5, defenseMultiplier: 1.1, kiDrainPerSecond: 7, isSpecial: true, duration: 840 },
    baryonMode: { damageMultiplier: 2.8, speedMultiplier: 2, defenseMultiplier: 0.8, kiDrainPerSecond: 20, isSpecial: true, duration: 360 }
  },
  hasSprites: true,
  // ── KCM NARUTO SPRITES (Phase 1: core, playable) ───────────────────
  // JUS rip sliced into one PNG per action. Source cells ~36–79px wide × 55–92px
  // tall; ×1.8 ≈ JJK on-screen height (their 63px cells ×1.8 ≈ 113px). Frame counts
  // MEASURED via alpha-gutter detection (stripWidth / frames = cell pitch). Non-
  // convention filenames load directly via each entry's `sheet` (animationProfile.js
  // → SpriteHandler._loadSheet). anchorY -4 plants feet on the floor (each strip has
  // a ~2px transparent bottom gap ×1.8 ≈ 4px). Display size scaled by spriteScale.
  // NOTE: `guard`/`knockdown` render via the guarded hooks added in sprite.js
  // _resolveAction (they only fire because these entries exist).
  // spriteScale 2.0 → idle content (59px) ×2.0 ≈ 118px ≈ Sukuna/Gojo on-screen
  // height (their 62px content ×1.8 ≈ 112px). REQUIRES the skins.js `naruto` entry
  // — otherwise applySkin() overrides this with the spriteScale:1 fallback (he was
  // rendering at native size = "too small"). anchorY -4 = -(2px source bottom-gap
  // ×2.0) plants the feet exactly on the floor at this scale.
  spriteScale: 2.0,
  animationData: {
    // ── movement / state ──
    idle:      { frames: 4,  width: 36, height: 63, speed: 6, anchorY: -4, sheet: "./naruto_kcm_stance.png" },
    // move.png has a stray sliver at rows 55–63 (leftover under frame 0); real sprite
    // is rows 2–51. height 54 crops to feet(51)+2px, excluding the bleed. (was 66)
    walk:      { frames: 6,  width: 48, height: 54, speed: 5, anchorY: -4, sheet: "./naruto_kcm_move.png" },
    run:       { frames: 6,  width: 48, height: 54, speed: 4, anchorY: -4, sheet: "./naruto_kcm_move.png" },   // no dash/run strip → reuse move (faster)
    dash:      { frames: 6,  width: 48, height: 54, speed: 4, anchorY: -4, sheet: "./naruto_kcm_move.png" },   // no dash strip → reuse move
    jump:      { frames: 4,  width: 49, height: 69, speed: 6, anchorY: -4, sourceX: 0,   sheet: "./naruto_kcm_jump.png" },  // first half = rise (ASSUMED split of the 8-frame arc)
    fall:      { frames: 4,  width: 49, height: 69, speed: 6, anchorY: -4, sourceX: 196, sheet: "./naruto_kcm_jump.png" },  // second half = descend
    guard:     { frames: 4,  width: 41, height: 59, speed: 6, anchorY: -4, sheet: "./naruto_kcm_guard.png" },  // shown via sprite.js isBlocking→"guard" hook
    hurt:      { frames: 4,  width: 46, height: 55, speed: 6, anchorY: -4, sheet: "./naruto_kcm_taking_damage.png" },       // flinch (hitstun)
    knockdown: { frames: 6,  width: 63, height: 49, speed: 6, anchorY: -4, sheet: "./naruto_kcm_knocked_out_a.png" },       // shown via sprite.js knockdown→"knockdown" hook
    // INTRO/entrance — sprite.js returns "transform" while fighter._introPlaying
    // (game.js sets it for the ~90-frame INTRO state, cleared at fight start).
    // Round-start victory flourish from the win strip (replaced the old
    // ultimate_action chakra-flare intro, which read poorly — ultimate_action.png
    // is now unused). naruto_kcm_win.png is 133×80 with "REPEAT" text label bands at
    // rows 2–21; the 3 figure frames occupy rows 25–78 (~44px pitch) → sourceY 24
    // skips the labels, height 56 = feet+2px gap, loop:true cycles it through intro.
    transform: { frames: 3, width: 44, height: 56, speed: 6, anchorY: -4, sourceY: 24, loop: true, sheet: "./naruto_kcm_win.png" },
    // ── basic attacks — B-attack set sliced from naruto_kcm_sheet.png (Phase 2).
    // These new strips are content-tight crops (feet at the very bottom row → no
    // bottom gap), so anchorY 0 plants them; heavy keeps the Phase-1 y_attack strip
    // (which has a ~2px gap → anchorY -4). Frame counts = gutter-detected blob counts.
    light:     { frames: 4,  width: 52, height: 53, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_attack.png" },        // B ATTACK (jab)
    // y_attack.png real sprite is rows 14–89; stray sliver at rows 2–10 (TOP). sourceY
    // 12 skips it, height 80 keeps the bottom crop at row 91 so feet stay planted. (was sourceY 0, height 92)
    heavy:     { frames: 7,  width: 51, height: 80, speed: 4, anchorY: -4, sourceY: 12, sheet: "./naruto_kcm_y_attack.png" },        // Y ATTACK (heavy)
    up:        { frames: 7,  width: 51, height: 53, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_up_attack.png" },     // B+UP (launcher)
    air:       { frames: 7,  width: 79, height: 74, speed: 3, anchorY: -4, sheet: "./naruto_kcm_y_up_attack.png" },   // JUGGLE — Y+UP aerial strike (Rendan middle hit); 553÷7 = 79px cells. (was b_jump_attack; bone-arm FX not applied — engine has no attack-FX overlay slot)
    down_air:  { frames: 3,  width: 39, height: 52, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_down_attack.png" },   // B+DOWN
    grab:      { frames: 4,  width: 52, height: 53, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_attack.png" },        // reuse B ATTACK
    // naruto_kcm_b_forward_attack.png (5f, 58x47) + naruto_kcm_fx_b_down_fist.png sliced
    // & saved, but the engine has no forward-normal slot → reserved for later use.
    // ── SPECIAL CAST bodies — play on the CASTER while the projectile flies
    //    (abilities.executeNarutoSpecial sets _spriteCastMove; sprite.js _resolveAction
    //    plays the matching action; MOVE_TO_ACTION passes these keys through unchanged).
    rasengan_cast:      { frames: 11, width: 52, height: 55, speed: 3, anchorY: 0, sheet: "./naruto_kcm_4_koma_body.png" }, // 4 KOMA A
    rasenshuriken_cast: { frames: 12, width: 51, height: 56, speed: 3, anchorY: 0, sheet: "./naruto_kcm_6_koma_body.png" }  // 6 KOMA A
  }
  // ── Phase 2 (specials, NOT wired yet — awaiting floor-check): rasengan / shadow-
  //    CloneBlast → body strip + fx_* effect; ultimate → naruto_kcm_ultimate_action.
  //    Reserved for Avatar/Tailed-Beast form (leave unwired): none of the fx_fox /
  //    fx_tbb / fx_kurama files exist on disk yet.
}

// ─────────────────────────────────────────────────────────────────
// SASUKE — PHASE 1: idle + selectability ONLY (no attacks/specials/ultimate yet).
// Sprite gate: hasSprites needs a working idle before anything else renders.
// ─────────────────────────────────────────────────────────────────
const sasuke = {
  rosterKey: "sasuke", name: "Sasuke", universe: "naruto",
  portrait: "./sasuke_pfp.png",
  archetypes: ["melee"],
  primary: "melee", secondary: [],
  // Placeholder base stats — templated off Naruto (fellow chakra/taijutsu ninja); tune later.
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  stats: { maxHealth: 1180, maxEnergy: 190, attack: 89, defense: 84, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 45 },
  // dashTeleport: double-tap TOWARD the opponent = blink BEHIND them (Sharingan speed) — the
  // SAME mechanic + timing window (DOUBLE_TAP_TIME) as Gojo/Toji/Sukuna via detectDoubleTapDashTeleport.
  movement: { dashTeleport: true },
  // PHASE 2 = basic movement + attacks. Placeholder taijutsu values between Naruto & Toji
  // (combat.js _getMD reads THIS `basic_attacks` — moveset.js has no naruto/toji/sasuke entry).
  // Specials/ultimate still deliberately ABSENT (Phase 3). light=forward-kick combo,
  // heavy=dash sword-slash (has a baked slash trail → reads as the stronger hit), downAir=down/spike.
  basic_attacks: {
    light:  { damage: 46, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    // heavy = committed SWORD thrust (foword_sword_attack_2) — rangeX bumped for the blade's reach.
    heavy:  { damage: 92, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 82, rangeY: 46 },
    // upAttack = LAUNCHER (combat.js `case "up"` reads b.upAttack; startMove "up" → animationData.up).
    // Mid-weight numbers modeled on the moveset.js launcher pattern (Naruto upAttack 70/-8); 68 sits in
    // the ~65-75 launcher range with real upward knockback (knockbackY -8, launch 11).
    upAttack:{ type: "launcher", damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    downAir:{ damage: 78, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    // NEUTRAL AIR (J while airborne) — the missing basic (was undefined → J in the air whiffed).
    // Mid-weight aerial between light (46) and heavy (92); airborne spin-slash (animationData.air).
    airAttack:{ damage: 54, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: -2 }
  },
  // ── PHASE 3: two-stage Susanoo ULTIMATE (logic lives in abilities.js executeSasukeUltimate).
  // This field is HUD-only (game.js reads c?.ultimate?.name for the move hint); the real cost is
  // enforced in abilities.js — Stage 1 spends 50% of maxEnergy, Stage 2 drains all remaining to 0.
  // Attacks (Susanoo grab / Lv2 arrow) fire on the SPECIAL button while in Susanoo.
  ultimate: { name: "Susanoo", cost: 95, description: "Stage 1: buffed Susanoo Lv1 + ribcage grab. Press again to escalate to Lv2 (drains all energy): heavier grab + ranged arrow." },
  hasSprites: true,
  // saske_stance_2.png (existing filename typo — referenced AS-IS, not "fixed"): MEASURED 112×57,
  // 4 frames → 28×57 cells; vertical content rows 0–55 → ~2px transparent bottom gap. spriteScale
  // 2.1 lands the ~55px content at ~115px on-screen ≈ Naruto/Sukuna height. anchorY -4 = -(2px gap
  // ×~2.1) plants the feet on the floor. REQUIRES the skins.js `sasuke` entry (else applySkin()
  // pulls the spriteScale:1 fallback → native size) + the spritesheets.js SPRITE_MANIFEST idle gate.
  spriteScale: 2.1,
  // ── PHASE 2 sprites. Frame counts + cell widths MEASURED via alpha-gutter detection
  // (stripWidth / frames = pitch); height = full sheet height (frames slice horizontally
  // only). anchorY = -(bottom transparent gap × spriteScale 2.1), plants feet on the floor
  // (verified per sheet against the content-bottom row). Attack sprite `speed` ≈ move
  // duration / frames so the swing reads across the move. Missing actions (walk/run/up/air)
  // fall back to idle gracefully. hurt/dash/light/heavy/down_air are Phase 2; specials later.
  animationData: {
    idle:     { frames: 4, width: 28, height: 57, speed: 6, anchorY: -4,  sheet: "./saske_stance_2.png" },
    // walk/run — sasuke_running.png. MEASURED 449×53 → 8 frames (transparent-gutter verified,
    // content-tight/non-uniform so NOT a round divisor) @ 56px cell pitch (449/8 = 56.1). Without
    // these keys sprite.js used the 128×128 _FALLBACK and sliced garbage from the idle sheet
    // ("random sprite"). speed 5 = roster walk baseline (Naruto/Gojo/Sukuna); run reuses the same
    // strip a touch faster (Naruto's move.png pattern). anchorY -10 = -(5px bottom gap × 2.1).
    walk:     { frames: 8, width: 56, height: 53, speed: 5, anchorY: -10, sheet: "./sasuke_running.png" },
    run:      { frames: 8, width: 56, height: 53, speed: 4, anchorY: -10, sheet: "./sasuke_running.png" },
    // jump/fall — sasuke_jump.png. MEASURED 406×78 → 8 frames (transparent-gutter verified) @ 51px
    // pitch (406/8=50.8). The arc is crouch→rise→peak→descend→land, so split like Naruto's jump:
    // jump = rise half (cells 0–3, sourceX 0), fall = descend half (cells 4–7, sourceX 4×51=204).
    // Without these keys sprite.js used the 128×128 _FALLBACK and sliced garbage. speed 6 = roster
    // jump baseline (Gojo/Sukuna/Naruto). anchorY -15 = -(7px bottom gap × 2.1).
    jump:     { frames: 4, width: 51, height: 78, speed: 6, anchorY: -15, sourceX: 0,   sheet: "./sasuke_jump.png" },
    fall:     { frames: 4, width: 51, height: 78, speed: 6, anchorY: -15, sourceX: 204, sheet: "./sasuke_jump.png" },
    dash:     { frames: 2, width: 66, height: 49, speed: 5, anchorY: -13, sheet: "./sasuke_dash.png" },            // 131×49 → 2×(66×49), 6px bottom gap
    hurt:     { frames: 4, width: 53, height: 57, speed: 6, anchorY: -6,  sheet: "./sasuke_damage.png" },          // 211×57 → 4×(53×57), 3px bottom gap
    light:    { frames: 9, width: 68, height: 71, speed: 2, anchorY: -36, sheet: "./sasuke_foward_attack.png" },   // 611×71 → 9×(68×71), 17px bottom gap (feet high in cell)
    heavy:    { frames: 8, width: 61, height: 63, speed: 4, anchorY: -21, sheet: "./sasuke_foword_sword_attack_2.png" }, // 490×63 → 8×(61×63) clean sword-thrust combo (re-slice verified; replaced dash_attack whose thrust blade tore across cells)
    up:       { frames: 9, width: 58, height: 60, speed: 3, anchorY: -10, sheet: "./sasuke_up_attack.png" },       // 527×60 → 9×(58×60) gap-scanned; launcher swing. anchorY -10 = -(5px botGap ×2.1)
    down_air: { frames: 6, width: 50, height: 62, speed: 4, anchorY: -6,  sheet: "./sasuke_down_attack.png" },     // 298×62 → 6×(50×62)
    air:      { frames: 6, width: 68, height: 83, speed: 3, anchorY: -12, sheet: "./sasuke_jump_attack.png" },     // 409×83 → 6×(68×83) aerial spin-slash (neutral J in air)
    // Shuriken THROW pose — plays via _spriteCastMove while the shuriken projectile flies (air+heavy poke).
    shurikenThrow: { frames: 2, width: 57, height: 56, speed: 4, anchorY: -8, loop: false, lockLastFrame: true, sheet: "./sasuke_throwing_shuriken.png" }, // 114×56 → 2×(57×56)
    // ── PHASE 3a: pre-match INTRO POOL. game.js picks one of `introPool` at random each match
    // (see pickIntroVariant); sprite.js plays it while _introPlaying is set. loop:false +
    // lockLastFrame → each plays ONCE then holds its final pose, snapping cleanly to idle when
    // the fight starts. Cell width = sheetW / real-frame-count (keeps the true pitch); anchorY =
    // -(bottom gap × 2.1). NOTE: `intro` plays only the first 6 of sasuke_intro.png's 9 cells —
    // this deliberately EXCLUDES the wire/kunai-throw action (cells ~6–8), which is a combat move,
    // not an idle intro. Those frames stay in the file for a possible future "wire kunai" move.
    // `intro` (sasuke_intro.png) is EXCLUDED from introPool below — kept for reference only.
    // Its only clean "settled fighting stance" frame is the LAST cell (8), which sits AFTER the
    // kunai-wire combat action (cells 6–7). The engine plays cells sequentially and can't skip the
    // wire, so trimming the wire (required — a combat action shouldn't play in an intro) forces the
    // hold onto a mid-motion arm-point pose (cell 5) that doesn't read as an arrival stance. It's
    // also thematically redundant with introCloakAlt. Re-enable only if the sheet is re-sliced to
    // separate the wire, freeing the settled stance.
    intro:         { frames: 6, width: 57, height: 63, speed: 6, anchorY: -15, loop: false, lockLastFrame: true, sheet: "./sasuke_intro.png"   },
    // RE-SLICED 2026-07-17: the raw sheets are NON-UNIFORM (6 hand-drawn poses each with a WIDE
    // cloak-throw pose that a uniform slice tore straight through — verified via boundary overlays).
    // REPACKED into uniform 90px cells (each pose cropped + FEET-registered so the character stays
    // planted while the cloak billows), mirroring the Susanoo _anim fix. sheets: sasuke_intro_{2,3}_anim.png.
    introAkatsuki: { frames: 6, width: 90, height: 76, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sasuke_intro_2_anim.png" }, // Akatsuki (red-cloud) cloak unfurl → holds clean Taka stance
    introCloakAlt: { frames: 6, width: 90, height: 70, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sasuke_intro_3_anim.png" }  // black cloak unfurl → holds clean Taka stance
  },
  // Generic pre-match intro pool — game.pickIntroVariant() picks one at random each match; add a
  // 4th entry here later and it drops into the rotation with no other wiring. (Any character can
  // define this; those without it fall back to the shared "transform" intro slot.)
  // `intro` intentionally NOT pooled — see the note above (holds on a mid-combat arm-point, wire
  // can't be skipped). Only the two that settle into a clean stance stay in rotation.
  introPool: ["introAkatsuki", "introCloakAlt"]
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
    bloodDemonArt:  { cost: 0, damage: 140, startup: 12, active: 5, recovery: 21, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "explosive demonic attack" },
    explodingBlood: { cost: 0, damage: 95,  startup: 9,  active: 5, recovery: 17, hitstun: 18, knockbackX: 6, knockbackY: -1, effect: "close-range blood detonation" },
    demonLunge:     { cost: 0, damage: 80,  startup: 7,  active: 4, recovery: 14, hitstun: 16, knockbackX: 6, knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "pouncing claw rush" }
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
    thunderClapStrike: { cost: 0, damage: 150, startup: 8, active: 4, recovery: 18, hitstun: 25, knockbackX: 10, knockbackY: -2, effect: "instant high-speed lightning attack" },
    sixfold:           { cost: 0, damage: 95,  startup: 6, active: 6, recovery: 16, hitstun: 16, knockbackX: 5,  knockbackY: -1, effect: "stationary multi-strike thunderclap volley" },
    godspeed:          { cost: 0, damage: 80,  startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 5,  knockbackY: -1, subtype: "mobility", dashSpeed: 26, effect: "flash-step that crosses the screen" }
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
    dualSwordFrenzy: { cost: 0, damage: 140, startup: 10, active: 6, recovery: 20, hitstun: 23, knockbackX: 8, knockbackY: -1, effect: "spinning multi-slash attack" },
    piercingFang:    { cost: 0, damage: 90,  startup: 8,  active: 4, recovery: 16, hitstun: 16, knockbackX: 5, knockbackY: 0,  effect: "low erratic stab under highs" },
    beastPounce:     { cost: 0, damage: 85,  startup: 7,  active: 4, recovery: 14, hitstun: 16, knockbackX: 6, knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "feral leaping double-slash" }
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
    flameBreathingFirstForm: { cost: 0, damage: 150, startup: 11, active: 5, recovery: 21, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "fiery single slash" },
    risingScorchingSun:      { cost: 0, damage: 95,  startup: 9,  active: 4, recovery: 17, hitstun: 20, knockbackX: 3,  knockbackY: -8, effect: "upward flame arc that pops up" },
    flameTiger:              { cost: 0, damage: 110, startup: 10, active: 5, recovery: 18, hitstun: 20, knockbackX: 8,  knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "charging beast of flame" }
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
    destructiveStrike: { cost: 0, damage: 160, startup: 12, active: 5, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -2, effect: "powerful destructive attack" },
    annihilationType:  { cost: 0, damage: 105, startup: 11, active: 6, recovery: 20, hitstun: 20, knockbackX: 7,  knockbackY: -2, effect: "compass-needle ground shockwaves" },
    disorder:          { cost: 0, damage: 90,  startup: 8,  active: 5, recovery: 16, hitstun: 16, knockbackX: 6,  knockbackY: -1, subtype: "mobility", dashSpeed: 24, effect: "rushing accelerating flurry" }
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
    nerveStrike:   { cost: 25, damage: 100, startup: 9, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, effect: "quick panic-fueled strike" },
    franticFlurry: { cost: 20, damage: 80,  startup: 7, active: 6, recovery: 16, hitstun: 14, knockbackX: 4, knockbackY: 0,  effect: "wild flailing barrage" },
    scramble:      { cost: 10, damage: 50,  startup: 6, active: 3, recovery: 12, hitstun: 12, knockbackX: 4, knockbackY: -1, subtype: "mobility", dashSpeed: 20, effect: "desperate scrambling dash" }
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
    manipulativeBlast: { cost: 30, damage: 140, startup: 12, active: 5, recovery: 21, hitstun: 23, knockbackX: 9, knockbackY: -2, effect: "psychic energy attack" },
    override:          { cost: 25, damage: 90,  startup: 10, active: 5, recovery: 19, hitstun: 18, knockbackX: 5, knockbackY: -1, effect: "controlling pulse that saps enemy speed" },
    coldStep:          { cost: 15, damage: 60,  startup: 6,  active: 3, recovery: 13, hitstun: 12, knockbackX: 4, knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "calculated portal-step reposition" }
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
    primePortalBlast: { cost: 35, damage: 160, startup: 12, active: 5, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -2, effect: "extremely powerful multiverse energy attack" },
    annihilationMine: { cost: 30, damage: 110, startup: 13, active: 8, recovery: 22, hitstun: 20, knockbackX: 7,  knockbackY: -2, effect: "portal-tech charge that detonates" },
    primePortal:      { cost: 15, damage: 60,  startup: 6,  active: 3, recovery: 12, hitstun: 12, knockbackX: 4,  knockbackY: -1, subtype: "mobility", dashSpeed: 26, effect: "instant high-speed portal warp" }
  },
  ultimate: { name: "Rick Prime's Supremacy", cost: 100, duration: 10, effect: "Massive speed, attack boost, and random gadget chaos" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// BEN 10
// His real movesets/stats live in the Omnitrix pool (fighters.js) and are
// applied LIVE by setupBen10()/applyAlien() — physics.js auto-runs this on the
// first frame a "ben10" fighter moves. This entry just makes him SELECTABLE on
// the universe/character screens (which read from this file). The values below
// are a sensible first-frame placeholder that the Omnitrix overrides instantly;
// they're matched to the default starting alien (Four Arms) so the HUD is right.
// ─────────────────────────────────────────────────────────────────
const ben10 = {
  rosterKey: "ben10", name: "Ben 10", universe: "ben_10",
  archetypes: ["transformations", "melee"],
  primary: "transformations", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "omnitrix", mobility: "high", scaling: "burst" },
  passive: { name: "Omnitrix", effect: "Press the transform/charge button to cycle through 5 aliens, each with its own moveset" },
  stats: { maxHealth: 1250, maxEnergy: 100, attack: 90, defense: 85, speed: 5, maxJumps: 1, jumpPower: 19, dashSpeed: 15, dashDuration: 8, dashCooldownMax: 30 },
  basic_attacks: {
    light:     { damage: 53, startup: 6, active: 3, recovery: 12, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 106, startup: 11, active: 5, recovery: 20, hitstun: 18, knockbackX: 6, knockbackY: 1, superArmor: true },
    upAttack:  { damage: 85, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 6, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 98, startup: 10, active: 4, recovery: 16, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {},
  ultimate: { name: "Omnitrix Overload", cost: 100, duration: 8, effect: "Active alien's ultimate" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// POWER RANGERS SPD
// Space Patrol Delta. Resource = SPD Energy (Morpher). All rangers keep the
// standard rules: no-cost basic melee + SPD Energy specials (incl. a mobility
// move) + a "Judgment / Battlizer" ultimate.
// ─────────────────────────────────────────────────────────────────
const SPD_BASICS = {
  light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
  heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
  upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
  airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
  downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
  grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
}

const jackRed = {
  rosterKey: "jackRed", name: "Jack Landors (SPD Red)", universe: "power_rangers_spd",
  archetypes: ["melee", "rushdown"], primary: "melee", secondary: ["rushdown"],
  traits: { hasEnergy: true, energyType: "spd_energy", mobility: "high", scaling: "burst", animeMovement: false },
  passive: { name: "Probability Field", effect: "Former thief's instincts — slightly faster Dash recovery and SPD Energy regen" },
  stats: { maxHealth: 1150, maxEnergy: 170, attack: 90, defense: 84, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: { ...SPD_BASICS, light: { damage: 48, startup: 4, active: 3, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: 0 } },
  specials: {
    deltaBlasters:  { cost: 25, damage: 110, startup: 9,  active: 5, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: -2, effect: "twin SPD blaster shots" },
    battleSlash:    { cost: 35, damage: 150, startup: 12, active: 5, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -3, effect: "Delta Saber heavy slash" },
    deltaRush:      { cost: 15, damage: 80,  startup: 6,  active: 4, recovery: 14, hitstun: 16, knockbackX: 6, knockbackY: -1, subtype: "mobility", dashSpeed: 24, effect: "blitz dash strike" }
  },
  ultimate: { name: "S.W.A.T. Battlizer", cost: 100, duration: 8, effect: "Cannon mode: massive attack + speed surge" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const skyBlue = {
  rosterKey: "skyBlue", name: "Sky Tate (SPD Blue)", universe: "power_rangers_spd",
  archetypes: ["melee", "defense"], primary: "melee", secondary: ["defense"],
  traits: { hasEnergy: true, energyType: "spd_energy", mobility: "medium", scaling: "control", animeMovement: false },
  passive: { name: "Force Field", effect: "Holding block briefly projects a shield that negates chip damage" },
  stats: { maxHealth: 1220, maxEnergy: 160, attack: 86, defense: 94, speed: 82, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: { ...SPD_BASICS, heavy: { damage: 92, startup: 9, active: 4, recovery: 19, hitstun: 19, knockbackX: 7, knockbackY: 1, superArmor: true } },
  specials: {
    forceBlast:     { cost: 25, damage: 105, startup: 10, active: 5, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: -2, effect: "kinetic force projectile" },
    barrierSlam:    { cost: 35, damage: 145, startup: 13, active: 5, recovery: 22, hitstun: 24, knockbackX: 10, knockbackY: -2, superArmor: true, effect: "shield-charge with armor" },
    guardStep:      { cost: 15, damage: 70,  startup: 7,  active: 4, recovery: 14, hitstun: 14, knockbackX: 5, knockbackY: -1, subtype: "mobility", dashSpeed: 20, effect: "shielded advance" }
  },
  ultimate: { name: "Delta Squad Megazord", cost: 100, duration: 8, effect: "Fortress mode: heavy armor + power" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const bridgeGreen = {
  rosterKey: "bridgeGreen", name: "Bridge Carson (SPD Green)", universe: "power_rangers_spd",
  archetypes: ["ranged", "psychic"], primary: "ranged", secondary: ["psychic"],
  traits: { hasEnergy: true, energyType: "spd_energy", mobility: "medium", scaling: "control", animeMovement: false },
  passive: { name: "Aura Sight", effect: "Reads aura — first hit of each combo on a blocking foe deals bonus chip" },
  stats: { maxHealth: 1080, maxEnergy: 190, attack: 85, defense: 82, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 44 },
  basic_attacks: { ...SPD_BASICS },
  specials: {
    psychicBolt:    { cost: 22, damage: 100, startup: 9,  active: 5, recovery: 17, hitstun: 18, knockbackX: 7, knockbackY: -2, effect: "telekinetic energy bolt" },
    energyField:    { cost: 35, damage: 135, startup: 14, active: 6, recovery: 22, hitstun: 22, knockbackX: 6, knockbackY: -1, effect: "expanding psychic field" },
    phaseStep:      { cost: 15, damage: 60,  startup: 6,  active: 3, recovery: 13, hitstun: 12, knockbackX: 4, knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "telekinetic blink-dash" }
  },
  ultimate: { name: "Delta Command Crawler", cost: 100, duration: 8, effect: "Psychic overdrive: range + control" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const zYellow = {
  rosterKey: "zYellow", name: "Z Delgado (SPD Yellow)", universe: "power_rangers_spd",
  archetypes: ["melee", "speed"], primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: true, energyType: "spd_energy", mobility: "very_high", scaling: "constant_pressure", animeMovement: false },
  passive: { name: "Duplication", effect: "Specials occasionally spawn a fleeting copy that adds an extra hit" },
  stats: { maxHealth: 1050, maxEnergy: 170, attack: 86, defense: 80, speed: 95, maxJumps: 3, jumpPower: 32, dashSpeed: 22, dashDuration: 10, dashCooldownMax: 32 },
  basic_attacks: { ...SPD_BASICS, light: { damage: 44, startup: 3, active: 2, recovery: 8, hitstun: 12, knockbackX: 3, knockbackY: 0 } },
  specials: {
    cloneStrike:    { cost: 25, damage: 105, startup: 8,  active: 6, recovery: 16, hitstun: 18, knockbackX: 7, knockbackY: -1, effect: "duplicate rush attack" },
    deltaSpin:      { cost: 30, damage: 130, startup: 10, active: 6, recovery: 20, hitstun: 22, knockbackX: 9, knockbackY: -2, effect: "spinning multi-clone slash" },
    afterimageDash: { cost: 12, damage: 70,  startup: 5,  active: 4, recovery: 12, hitstun: 14, knockbackX: 5, knockbackY: -1, subtype: "mobility", dashSpeed: 26, effect: "afterimage blitz" }
  },
  ultimate: { name: "Omega Morph", cost: 100, duration: 7, effect: "Extreme speed; copies overwhelm" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const sydPink = {
  rosterKey: "sydPink", name: "Syd Drew (SPD Pink)", universe: "power_rangers_spd",
  archetypes: ["melee", "power"], primary: "melee", secondary: ["power"],
  traits: { hasEnergy: true, energyType: "spd_energy", mobility: "medium", scaling: "burst", animeMovement: false },
  passive: { name: "Crystal Fists", effect: "Heavy attacks harden to crystal — extra knockback and armor on startup" },
  stats: { maxHealth: 1160, maxEnergy: 160, attack: 91, defense: 86, speed: 83, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...SPD_BASICS, heavy: { damage: 95, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 8, knockbackY: 1 } },
  specials: {
    crystalSmash:   { cost: 25, damage: 115, startup: 10, active: 5, recovery: 19, hitstun: 21, knockbackX: 9, knockbackY: -2, effect: "crystallized super-strength blow" },
    deltaMaxStrike: { cost: 35, damage: 150, startup: 13, active: 5, recovery: 23, hitstun: 26, knockbackX: 11, knockbackY: -3, effect: "Delta Max blaster smash" },
    powerLunge:     { cost: 15, damage: 78,  startup: 7,  active: 4, recovery: 14, hitstun: 16, knockbackX: 6, knockbackY: -1, subtype: "mobility", dashSpeed: 21, effect: "charging shoulder lunge" }
  },
  ultimate: { name: "Delta Runner Charge", cost: 100, duration: 8, effect: "Super-strength surge: crushing power" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const doggieShadow = {
  rosterKey: "doggieShadow", name: "Doggie Cruger (Shadow Ranger)", universe: "power_rangers_spd",
  archetypes: ["melee", "sword"], primary: "melee", secondary: ["sword"],
  traits: { hasEnergy: true, energyType: "spd_energy", mobility: "high", scaling: "damage", animeMovement: false },
  passive: { name: "Sirian Blade Master", effect: "Shadow Saber gives all attacks extended reach; specials cost slightly less" },
  stats: { maxHealth: 1280, maxEnergy: 180, attack: 97, defense: 90, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: { ...SPD_BASICS, light: { damage: 52, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 }, heavy: { damage: 100, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 } },
  specials: {
    shadowSlash:    { cost: 25, damage: 130, startup: 9,  active: 5, recovery: 18, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "long-reach saber slash" },
    vortexBlade:    { cost: 40, damage: 170, startup: 14, active: 6, recovery: 24, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "spinning blade vortex" },
    shadowStep:     { cost: 15, damage: 85,  startup: 6,  active: 4, recovery: 13, hitstun: 18, knockbackX: 6, knockbackY: -1, subtype: "mobility", dashSpeed: 24, effect: "Sirian flash-step cut" }
  },
  ultimate: { name: "Shadow Saber: Judgment", cost: 100, duration: 9, effect: "Master swordsman surge: max damage + reach" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// ALBEDO  (Ben's clone — Ultimatrix)
// Mechanically identical to Ben 10: same alien roster + same energy/transform
// system (see fighters.js setupBen10 / updateTransformDevice). This entry just
// makes Albedo SELECTABLE and flags him as the clone so the device/draw code
// gives him his own red "Negative" identity. physics.js auto-runs setupBen10()
// for rosterKey "albedo" the same way it does for "ben10".
// ─────────────────────────────────────────────────────────────────
const albedo = {
  rosterKey: "albedo", name: "Albedo", universe: "ben_10",
  isAlbedo: true, deviceType: "ultimatrix",
  spriteSheet: "sprites/albedo/albedo_atlas.png",   // deferred art — SpriteHandler falls back to procedural
  archetypes: ["transformations", "melee"],
  primary: "transformations", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "ultimatrix", mobility: "high", scaling: "burst" },
  passive: { name: "Ultimatrix", effect: "Same as the Omnitrix — cycle aliens; the form drains energy and force-reverts to human at zero" },
  stats: { maxHealth: 1250, maxEnergy: 100, attack: 90, defense: 85, speed: 5, maxJumps: 1, jumpPower: 19, dashSpeed: 15, dashDuration: 8, dashCooldownMax: 30 },
  basic_attacks: {
    light:     { damage: 53, startup: 6, active: 3, recovery: 12, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 106, startup: 11, active: 5, recovery: 20, hitstun: 18, knockbackX: 6, knockbackY: 1, superArmor: true },
    upAttack:  { damage: 85, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 6, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 98, startup: 10, active: 4, recovery: 16, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {},
  ultimate: { name: "Ultimatrix Overload", cost: 100, duration: 8, effect: "Active alien's ultimate" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// INVINCIBLE — Viltrumites
// Always base form (NO energy/transform system). Pure stats: overwhelming power
// tied to slow startup + punishable recovery + high knockback so they're strong
// but beatable. maxEnergy 0 → all specials cost 0 (raw power, like Toji).
// ─────────────────────────────────────────────────────────────────
const omniMan = {
  rosterKey: "omniman", name: "Omni-Man", universe: "invincible",
  archetypes: ["melee", "flight"],
  primary: "melee", secondary: ["flight"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "damage", animeMovement: false },
  passive: { name: "Viltrumite Physiology", effect: "Superhuman strength and flight — high air mobility and knockback" },
  stats: { maxHealth: 1400, maxEnergy: 0, attack: 98, defense: 88, speed: 90, maxJumps: 3, jumpPower: 36, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: {
    light:     { damage: 50, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 120, startup: 13, active: 5, recovery: 26, hitstun: 22, knockbackX: 11, knockbackY: 2, superArmor: true },
    upAttack:  { damage: 92, startup: 10, active: 4, recovery: 20, hitstun: 22, knockbackX: 3, knockbackY: -11 },
    airAttack: { damage: 78, startup: 6, active: 3, recovery: 12, hitstun: 15, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 105, startup: 11, active: 4, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: 13 },
    grab:      { damage: 36, startup: 6, active: 3, recovery: 15, hitstun: 22, throwForceX: 7, throwForceY: -5 }
  },
  specials: {
    flightSlam:    { cost: 0, damage: 150, startup: 14, active: 5, recovery: 28, hitstun: 28, knockbackX: 13, knockbackY: -4, effect: "soaring slam — huge knockback, very punishable on whiff" },
    skeweringRush: { cost: 0, damage: 130, startup: 11, active: 5, recovery: 24, hitstun: 24, knockbackX: 12, knockbackY: -2, subtype: "mobility", dashSpeed: 22, effect: "flying tackle across the screen" }
  },
  ultimate: { name: "Viltrumite Onslaught", cost: 0, duration: 8, effect: "Relentless flying assault: heavy damage and knockback surge" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const thragg = {
  rosterKey: "thragg", name: "Thragg", universe: "invincible",
  archetypes: ["melee", "grappler"],
  primary: "melee", secondary: ["grappler"],
  traits: { hasEnergy: false, energyType: "none", mobility: "low", scaling: "damage", animeMovement: false },
  passive: { name: "Warlord's Might", effect: "Strongest and toughest Viltrumite — top-tier power but the slowest mover" },
  stats: { maxHealth: 1600, maxEnergy: 0, attack: 106, defense: 95, speed: 76, maxJumps: 1, jumpPower: 26, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 54 },
  basic_attacks: {
    light:     { damage: 55, startup: 6, active: 3, recovery: 13, hitstun: 14, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 132, startup: 15, active: 5, recovery: 30, hitstun: 24, knockbackX: 12, knockbackY: 2, superArmor: true },
    upAttack:  { damage: 100, startup: 12, active: 5, recovery: 22, hitstun: 24, knockbackX: 3, knockbackY: -11 },
    airAttack: { damage: 86, startup: 7, active: 4, recovery: 14, hitstun: 16, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 116, startup: 12, active: 5, recovery: 20, hitstun: 22, knockbackX: 2, knockbackY: 14 },
    grab:      { damage: 44, startup: 6, active: 3, recovery: 16, hitstun: 24, throwForceX: 8, throwForceY: -5 }
  },
  specials: {
    crushingGrip: { cost: 0, damage: 175, startup: 12, active: 4, recovery: 30, hitstun: 30, knockbackX: 6, knockbackY: -4, subtype: "command_grab", rangeX: 70, superArmor: true, effect: "armored command grab — massive close-range damage, slow recovery" },
    warHammerBlow:{ cost: 0, damage: 150, startup: 14, active: 5, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "two-fisted overhead smash" }
  },
  ultimate: { name: "Conqueror's Verdict", cost: 0, duration: 8, effect: "Unstoppable assault: max damage and armor, devastating throws" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// HUNTER × HUNTER
// Phase-1 roster: shared basic-attack template (HXH_BASICS) with per-fighter
// stat profiles + a thematic special/ultimate, so each plays distinctly even
// before bespoke movesets. `color` drives the procedural fallback silhouette;
// `spriteSheets` lists the art each fighter still needs (hasSprites:false → the
// procedural fallback renders until those sheets exist). Energy = "nen".
// ─────────────────────────────────────────────────────────────────
const HXH_BASICS = {
  light:     { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
  heavy:     { damage: 84, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
  upAttack:  { damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
  airAttack: { damage: 58, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
  downAir:   { damage: 76, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
  grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
}
// Sprite-sheet filename set per fighter (naming convention: <key>_<action>_sheet.png).
const hxhSheets = (n) => ({
  idle: `${n}_idle_sheet.png`, walk: `${n}_walk_sheet.png`, attack: `${n}_attack_sheet.png`,
  jump: `${n}_jump_sheet.png`, hurt: `${n}_hurt_sheet.png`
})

const gon = {
  rosterKey: "gon", name: "Gon Freecss", universe: "hunter_x_hunter", color: "#16a34a",
  archetypes: ["melee", "transformations"], primary: "melee", secondary: ["transformations"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Enhancer", effect: "Strong, straightforward strikes; can tap into Adult Gon at the cost of all his nen" },
  stats: { maxHealth: 1150, maxEnergy: 120, attack: 90, defense: 84, speed: 86, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS, heavy: { damage: 92, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1 } },
  specials: {
    rockSmash:   { cost: 25, damage: 120, startup: 12, active: 5, recovery: 20, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "charged enhancer punch" },
    paperToss:   { cost: 20, damage: 90,  startup: 9,  active: 4, recovery: 16, hitstun: 16, knockbackX: 6, knockbackY: -1, rangeX: 170, effect: "ranged nen disc" }
  },
  ultimate: { name: "First Comes Rock", cost: 100, duration: 8, effect: "Huge committed nen smash" },
  // Phase 2 — Adult Gon reuses the standard transformation energy system
  // (transformations.js): large nen cost to enter, drains fast while active,
  // health/strength spike, and FORCE-REVERTS to base Gon when nen hits zero.
  // All values below are the tunable knobs.
  transformationOrder: ["base", "adultGon"],
  transformations: {
    base:     { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    adultGon: {
      cost: 60,                // large nen cost to transform
      kiDrainPerSecond: 24,    // drains fast while active
      revertOnEmpty: true,     // force-revert to base Gon at zero nen
      reusable: true,          // can transform again once nen is rebuilt
      healthMultiplier: 1.4,   // health spike
      damageMultiplier: 1.9, speedMultiplier: 1.3, defenseMultiplier: 1.25,
      isSpecial: true, duration: 12
    }
  },
  spriteSheets: { ...hxhSheets("gon"), adult: hxhSheets("adult_gon") },
  animationData: { ...DEFAULT_ANIM }
}

const killua = {
  rosterKey: "killua", name: "Killua Zoldyck", universe: "hunter_x_hunter", color: "#38bdf8",
  archetypes: ["melee", "speed"], primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "very_high", scaling: "rushdown", animeMovement: true },
  passive: { name: "Godspeed", effect: "Fastest fighter — rapid attacks and an electric dash, but fragile" },
  stats: { maxHealth: 1000, maxEnergy: 130, attack: 86, defense: 78, speed: 98, maxJumps: 3, jumpPower: 34, dashSpeed: 24, dashDuration: 8, dashCooldownMax: 28 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 42, startup: 3, active: 2, recovery: 8, hitstun: 12, knockbackX: 3, knockbackY: 0 }, airAttack: { damage: 56, startup: 4, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: -2 } },
  specials: {
    lightningDash: { cost: 15, damage: 80,  startup: 4, active: 4, recovery: 11, hitstun: 14, knockbackX: 5, knockbackY: -1, subtype: "mobility", dashSpeed: 28, effect: "electric flash-step strike" },
    thunderPalm:   { cost: 25, damage: 115, startup: 8, active: 5, recovery: 18, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "high-voltage palm" }
  },
  ultimate: { name: "Speed of Lightning", cost: 100, duration: 7, effect: "Extreme speed and rapid multi-hits" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("killua"), animationData: { ...DEFAULT_ANIM }
}

const kurapika = {
  rosterKey: "kurapika", name: "Kurapika", universe: "hunter_x_hunter", color: "#dc2626",
  archetypes: ["melee", "ranged"], primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "control", animeMovement: true },
  passive: { name: "Scarlet Eyes", effect: "Chain-based reach; lands a heavy conditional spike when his eyes turn scarlet" },
  stats: { maxHealth: 1080, maxEnergy: 140, attack: 88, defense: 82, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 4, knockbackY: 0 } },
  specials: {
    chainJail:    { cost: 25, damage: 100, startup: 10, active: 5, recovery: 20, hitstun: 26, knockbackX: 4, knockbackY: 0,  rangeX: 200, effect: "long-range chain bind" },
    judgmentChain:{ cost: 45, damage: 180, startup: 16, active: 5, recovery: 26, hitstun: 30, knockbackX: 10, knockbackY: -2, effect: "conditional high-damage spike" }
  },
  ultimate: { name: "Emperor Time", cost: 100, duration: 8, effect: "Mastery surge: all nen output rises sharply" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("kurapika"), animationData: { ...DEFAULT_ANIM }
}

const leorio = {
  rosterKey: "leorio", name: "Leorio Paradinight", universe: "hunter_x_hunter", color: "#a16207",
  archetypes: ["melee", "power"], primary: "melee", secondary: ["power"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "low", scaling: "burst", animeMovement: false },
  passive: { name: "Emission Punch", effect: "Slow but hits like a truck — huge single-hit damage" },
  stats: { maxHealth: 1300, maxEnergy: 110, attack: 96, defense: 90, speed: 74, maxJumps: 1, jumpPower: 26, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 50 },
  basic_attacks: { ...HXH_BASICS, heavy: { damage: 110, startup: 12, active: 5, recovery: 24, hitstun: 22, knockbackX: 10, knockbackY: 2, superArmor: true }, light: { damage: 50, startup: 6, active: 3, recovery: 12, hitstun: 13, knockbackX: 4, knockbackY: 0 } },
  specials: {
    remotePunch: { cost: 25, damage: 160, startup: 16, active: 5, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, rangeX: 150, effect: "emitted long-distance haymaker" }
  },
  ultimate: { name: "Doctor's Resolve", cost: 100, duration: 8, effect: "Power surge: devastating slow blows" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("leorio"), animationData: { ...DEFAULT_ANIM }
}

const hisoka = {
  rosterKey: "hisoka", name: "Hisoka Morow", universe: "hunter_x_hunter", color: "#db2777",
  archetypes: ["ranged", "trickster"], primary: "ranged", secondary: ["trickster"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Bungee Gum", effect: "Pulls foes in from range; big damage but very punishable on a whiff" },
  stats: { maxHealth: 1100, maxEnergy: 140, attack: 94, defense: 80, speed: 86, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    bungeePull:  { cost: 30, damage: 130, startup: 12, active: 6, recovery: 30, hitstun: 24, knockbackX: -6, knockbackY: -2, rangeX: 210, effect: "elastic pull-in — punishable on whiff" },
    textureTrap: { cost: 20, damage: 95,  startup: 9,  active: 5, recovery: 22, hitstun: 18, knockbackX: 7, knockbackY: -1, effect: "deceptive close burst" }
  },
  ultimate: { name: "Bloodlust Unleashed", cost: 100, duration: 8, effect: "Predatory surge: damage and range spike" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("hisoka"), animationData: { ...DEFAULT_ANIM }
}

const chrollo = {
  rosterKey: "chrollo", name: "Chrollo Lucilfer", universe: "hunter_x_hunter", color: "#6d28d9",
  archetypes: ["melee", "counter"], primary: "melee", secondary: ["counter"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "Skill Hunter", effect: "Well-rounded; a reactive special that turns the opponent's pressure around" },
  stats: { maxHealth: 1150, maxEnergy: 140, attack: 89, defense: 88, speed: 85, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    skillSteal:    { cost: 25, damage: 60,  startup: 6,  active: 6, recovery: 16, hitstun: 18, knockbackX: 5, knockbackY: -1, subtype: "counter", effect: "reactive parry-strike" },
    stolenArsenal: { cost: 30, damage: 125, startup: 11, active: 5, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -2, rangeX: 150, effect: "borrowed nen barrage" }
  },
  ultimate: { name: "Bandit's Secret", cost: 100, duration: 8, effect: "Versatile surge: copies and overwhelms" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("chrollo"), animationData: { ...DEFAULT_ANIM }
}

const netero = {
  rosterKey: "netero", name: "Isaac Netero", universe: "hunter_x_hunter", color: "#f59e0b",
  archetypes: ["melee", "speed"], primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Hundred-Type Guanyin", effect: "Veteran speed and power — overwhelming offense balanced by frailty" },
  stats: { maxHealth: 980, maxEnergy: 150, attack: 98, defense: 82, speed: 94, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 34 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 46, startup: 3, active: 3, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: 0 } },
  specials: {
    prayerFlurry: { cost: 25, damage: 18, startup: 5, active: 14, recovery: 18, hitstun: 8, knockbackX: 3, knockbackY: 0, effect: "blistering multi-hit palm flurry" },
    zeroHand:     { cost: 45, damage: 175, startup: 18, active: 6, recovery: 28, hitstun: 30, knockbackX: 12, knockbackY: -3, effect: "enormous committed strike" }
  },
  ultimate: { name: "First Hand of Guanyin", cost: 100, duration: 7, effect: "Relentless flurry: speed and hit-count surge" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("netero"), animationData: { ...DEFAULT_ANIM }
}

const ging = {
  rosterKey: "ging", name: "Ging Freecss", universe: "hunter_x_hunter", color: "#0d9488",
  archetypes: ["melee", "versatile"], primary: "melee", secondary: ["versatile"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "Prodigy", effect: "No glaring weakness and no dominant strength — rewards skilled, varied play" },
  stats: { maxHealth: 1120, maxEnergy: 140, attack: 90, defense: 86, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 38 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    adaptiveStrike: { cost: 25, damage: 115, startup: 10, active: 5, recovery: 18, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "reads the situation and strikes" },
    ingeniumTrap:   { cost: 20, damage: 90,  startup: 12, active: 6, recovery: 20, hitstun: 18, knockbackX: 5, knockbackY: -1, rangeX: 160, effect: "clever nen snare" }
  },
  ultimate: { name: "Whatever It Takes", cost: 100, duration: 8, effect: "All-around surge across every stat" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("ging"), animationData: { ...DEFAULT_ANIM }
}

const meruem = {
  rosterKey: "meruem", name: "Meruem", universe: "hunter_x_hunter", color: "#7e22ce",
  archetypes: ["melee", "boss"], primary: "melee", secondary: ["boss"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "low", scaling: "damage", animeMovement: true },
  passive: { name: "King's Aura", effect: "Highest stats in the roster — but slow startup and punishing recovery keep him beatable" },
  stats: { maxHealth: 1700, maxEnergy: 150, attack: 112, defense: 100, speed: 80, maxJumps: 1, jumpPower: 28, dashSpeed: 13, dashDuration: 8, dashCooldownMax: 52 },
  basic_attacks: {
    light:     { damage: 58, startup: 6, active: 3, recovery: 13, hitstun: 14, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 138, startup: 16, active: 5, recovery: 32, hitstun: 24, knockbackX: 13, knockbackY: 2, superArmor: true },
    upAttack:  { damage: 104, startup: 13, active: 5, recovery: 24, hitstun: 24, knockbackX: 3, knockbackY: -11 },
    airAttack: { damage: 88, startup: 8, active: 4, recovery: 15, hitstun: 16, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 120, startup: 13, active: 5, recovery: 22, hitstun: 22, knockbackX: 2, knockbackY: 14 },
    grab:      { damage: 46, startup: 7, active: 3, recovery: 17, hitstun: 24, throwForceX: 8, throwForceY: -5 }
  },
  specials: {
    auraAnnihilation: { cost: 35, damage: 200, startup: 22, active: 6, recovery: 34, hitstun: 32, knockbackX: 14, knockbackY: -4, superArmor: true, effect: "colossal slow nen blast — huge whiff punish window" },
    photonRush:       { cost: 25, damage: 130, startup: 14, active: 5, recovery: 26, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "advancing royal strike" }
  },
  ultimate: { name: "Rose of the King", cost: 100, duration: 8, effect: "Overwhelming assault: max damage, slow and committal" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("meruem"), animationData: { ...DEFAULT_ANIM }
}

const kite = {
  rosterKey: "kite", name: "Kite", universe: "hunter_x_hunter", color: "#0ea5e9",
  archetypes: ["melee", "ranged"], primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "Crazy Slots", effect: "A conjured weapon that cycles, changing his special's properties each use" },
  stats: { maxHealth: 1100, maxEnergy: 140, attack: 88, defense: 84, speed: 86, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    slotCycle:   { cost: 20, damage: 105, startup: 10, active: 5, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: -2, subtype: "cycle", rangeX: 150, effect: "weapon-roulette strike — properties shift per use" },
    scytheSweep: { cost: 25, damage: 120, startup: 12, active: 6, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -1, effect: "wide reaping arc" }
  },
  ultimate: { name: "Full Arsenal", cost: 100, duration: 8, effect: "Every slot at once: shifting damage and reach" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("kite"), animationData: { ...DEFAULT_ANIM }
}

const feitan = {
  rosterKey: "feitan", name: "Feitan Portor", universe: "hunter_x_hunter", color: "#1f2937",
  archetypes: ["melee", "rushdown"], primary: "melee", secondary: ["rushdown"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "ramp", animeMovement: true },
  passive: { name: "Pain Packer", effect: "The longer he stays on the offensive, the more his damage ramps up" },
  stats: { maxHealth: 1040, maxEnergy: 130, attack: 92, defense: 80, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 44, startup: 3, active: 2, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: 0 } },
  specials: {
    risingSun:  { cost: 30, damage: 150, startup: 14, active: 6, recovery: 22, hitstun: 26, knockbackX: 9, knockbackY: -3, effect: "scorching heat burst — bigger after a long offense" },
    rapidStab:  { cost: 20, damage: 85,  startup: 6,  active: 6, recovery: 14, hitstun: 14, knockbackX: 5, knockbackY: -1, effect: "relentless blade flurry" }
  },
  ultimate: { name: "Rising Sun's Verdict", cost: 100, duration: 8, effect: "Heat overload: damage ramps even faster" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("feitan"), animationData: { ...DEFAULT_ANIM }
}

const illumi = {
  rosterKey: "illumi", name: "Illumi Zoldyck", universe: "hunter_x_hunter", color: "#475569",
  archetypes: ["ranged", "control"], primary: "ranged", secondary: ["control"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "control", animeMovement: true },
  passive: { name: "Needle Manipulation", effect: "Zones with needles and debuffs that sap the opponent's mobility" },
  stats: { maxHealth: 1090, maxEnergy: 140, attack: 87, defense: 82, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    needleVolley: { cost: 22, damage: 95,  startup: 9,  active: 5, recovery: 18, hitstun: 16, knockbackX: 6, knockbackY: -1, rangeX: 200, effect: "long-range needle throw" },
    pinControl:   { cost: 25, damage: 70,  startup: 12, active: 6, recovery: 20, hitstun: 22, knockbackX: 3, knockbackY: 0,  subtype: "debuff", effect: "needle implant that slows the foe" }
  },
  ultimate: { name: "Puppeteer's Will", cost: 100, duration: 8, effect: "Control surge: relentless needles and debuffs" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("illumi"), animationData: { ...DEFAULT_ANIM }
}

const biscuit = {
  rosterKey: "biscuit", name: "Biscuit Krueger", universe: "hunter_x_hunter", color: "#ec4899",
  archetypes: ["melee", "trickster"], primary: "melee", secondary: ["trickster"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "burst", animeMovement: true },
  passive: { name: "Deceptive Strength", effect: "Unassuming stats hide one devastating burst special" },
  stats: { maxHealth: 1060, maxEnergy: 130, attack: 84, defense: 84, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 40, startup: 4, active: 3, recovery: 10, hitstun: 11, knockbackX: 2, knockbackY: 0 } },
  specials: {
    cookieCrush: { cost: 45, damage: 190, startup: 16, active: 5, recovery: 28, hitstun: 30, knockbackX: 12, knockbackY: -3, superArmor: true, effect: "true-strength burst — huge but costly" },
    quickJab:    { cost: 15, damage: 80,  startup: 6,  active: 4, recovery: 14, hitstun: 14, knockbackX: 5, knockbackY: -1, effect: "unassuming poke" }
  },
  ultimate: { name: "Magical Esthe", cost: 100, duration: 8, effect: "Hidden might unleashed: massive power surge" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("biscuit"), animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────
export const characters = {
  goku, vegeta, piccolo, frieza, cell,
  gojo, megumi, sukuna, omololu, toji, mahoraga,
  naruto, sasuke,
  tanjiro, nezuko, zenitsu, inosuke, rengoku, akaza,
  rick, morty, evilMorty, rickPrime,
  ben10, albedo,
  omniMan, thragg,
  jackRed, skyBlue, bridgeGreen, zYellow, sydPink, doggieShadow,
  gon, killua, kurapika, leorio, hisoka, chrollo, netero,
  ging, meruem, kite, feitan, illumi, biscuit
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
