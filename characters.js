// =====================================================
// MULTIVERSE SMASH - CHARACTER DATABASE
// UPGRADED CHARACTER MODEL (DROP-IN COMPATIBLE)
// =====================================================

function buildAttackData(input, defaults = {}) {
  const value = typeof input === "number" ? { damage: input } : (input || {})
  return { ...defaults, ...value }
}

function clampBasicDamage(value) {
  return Math.max(0, Math.round(Number(value) || 0))
}

function cloneAttackData(attackData) {
  return { ...(attackData || {}) }
}

function buildGroundAttackVariant(input, defaults = {}) {
  return buildAttackData(input, defaults)
}

function createAttackFamily(type, baseDamage, options = {}) {
  const damage = clampBasicDamage(baseDamage)
  const maxRange = options.maxRange ?? 72
  const legacyGrabPower = options.legacyGrabPower ?? 0

  if (type === "light") {
    return {
      low: buildGroundAttackVariant(options.low, {
        damage: clampBasicDamage(damage * 0.9),
        hitstun: 12,
        blockstun: 7,
        startup: 4,
        recovery: 8,
        cancelWindow: 8,
        knockbackX: 2,
        knockbackY: 2,
        trip: true,
        knockdown: true,
        attackClass: "light",
        attackHeight: "low",
        rangeType: "melee",
        minRange: 0,
        maxRange,
        comboRole: "trip_starter",
        meleeOnly: true
      }),

      mid: buildGroundAttackVariant(options.mid, {
        damage,
        hitstun: 14,
        blockstun: 8,
        startup: 5,
        recovery: 9,
        cancelWindow: 7,
        knockbackX: 2.5,
        knockbackY: -1,
        stagger: true,
        attackClass: "light",
        attackHeight: "mid",
        rangeType: "melee",
        minRange: 0,
        maxRange,
        comboRole: "pressure",
        meleeOnly: true
      }),

      high: buildGroundAttackVariant(options.high, {
        damage: clampBasicDamage(damage * 1.1),
        hitstun: 16,
        blockstun: 8,
        startup: 6,
        recovery: 10,
        cancelWindow: 6,
        launch_force: 10,
        knockbackX: 2,
        knockbackY: -9,
        launches: true,
        attackClass: "light",
        attackHeight: "high",
        rangeType: "melee",
        minRange: 0,
        maxRange,
        comboRole: "launcher",
        meleeOnly: true
      })
    }
  }

  if (type === "heavy") {
    return {
      low: buildGroundAttackVariant(options.low, {
        damage: clampBasicDamage(damage * 0.9),
        hitstun: 20,
        blockstun: 9,
        startup: 8,
        recovery: 14,
        cancelWindow: 4,
        knockbackX: 4,
        knockbackY: 3,
        trip: true,
        hardKnockdown: true,
        attackClass: "heavy",
        attackHeight: "low",
        rangeType: "melee",
        minRange: 0,
        maxRange,
        comboRole: "knockdown",
        meleeOnly: true
      }),

      mid: buildGroundAttackVariant(options.mid, {
        damage,
        hitstun: 22,
        blockstun: 10,
        startup: 9,
        recovery: 15,
        cancelWindow: 5,
        knockbackX: 5,
        knockbackY: -2,
        crumple: true,
        attackClass: "heavy",
        attackHeight: "mid",
        rangeType: "melee",
        minRange: 0,
        maxRange,
        comboRole: "stagger",
        meleeOnly: true
      }),

      high: buildGroundAttackVariant(options.high, {
        damage: clampBasicDamage(damage * 1.1),
        hitstun: 24,
        blockstun: 10,
        startup: 10,
        recovery: 17,
        cancelWindow: 3,
        launch_force: 14,
        knockbackX: 3,
        knockbackY: -12,
        launches: true,
        attackClass: "heavy",
        attackHeight: "high",
        rangeType: "melee",
        minRange: 0,
        maxRange,
        comboRole: "power_launcher",
        meleeOnly: true
      })
    }
  }

  return {
    low: buildGroundAttackVariant(options.low, {
      damage: 0,
      hitstun: 18 + Math.round(legacyGrabPower * 0.04),
      startup: 6,
      recovery: 12,
      stun: 18 + Math.round(legacyGrabPower * 0.08),
      throw_force_x: 2,
      throw_force_y: 2,
      grab: true,
      throw: true,
      unblockable: true,
      trip: true,
      knockdown: true,
      comboStarter: true,
      comboExtender: true,
      followupWindow: 18,
      attackClass: "grab",
      attackHeight: "low",
      rangeType: "melee",
      minRange: 0,
      maxRange: Math.max(52, maxRange - 12),
      meleeOnly: true,
      legacyDamageHint: legacyGrabPower
    }),

    mid: buildGroundAttackVariant(options.mid, {
      damage: 0,
      hitstun: 20 + Math.round(legacyGrabPower * 0.04),
      startup: 7,
      recovery: 14,
      stun: 22 + Math.round(legacyGrabPower * 0.08),
      throw_force_x: 1.5,
      throw_force_y: 0,
      grab: true,
      throw: true,
      unblockable: true,
      stagger: true,
      comboStarter: true,
      comboExtender: true,
      followupWindow: 22,
      attackClass: "grab",
      attackHeight: "mid",
      rangeType: "melee",
      minRange: 0,
      maxRange: Math.max(54, maxRange - 10),
      meleeOnly: true,
      legacyDamageHint: legacyGrabPower
    }),

    high: buildGroundAttackVariant(options.high, {
      damage: 0,
      hitstun: 22 + Math.round(legacyGrabPower * 0.04),
      startup: 8,
      recovery: 15,
      stun: 24 + Math.round(legacyGrabPower * 0.08),
      launch_force: 11,
      throw_force_x: 1,
      throw_force_y: -11,
      grab: true,
      throw: true,
      unblockable: true,
      launches: true,
      comboStarter: true,
      comboExtender: true,
      followupWindow: 24,
      attackClass: "grab",
      attackHeight: "high",
      rangeType: "melee",
      minRange: 0,
      maxRange: Math.max(56, maxRange - 8),
      meleeOnly: true,
      legacyDamageHint: legacyGrabPower
    })
  }
}

function createGroundBasicAttacks({ light, heavy, legacyGrabPower = 0, maxRange = 72, overrides = {} }) {
  const lightFamily = createAttackFamily("light", light, {
    maxRange,
    low: overrides.light?.low || overrides.light_low,
    mid: overrides.light?.mid || overrides.light_mid || overrides.light_attack,
    high: overrides.light?.high || overrides.light_high
  })

  const heavyFamily = createAttackFamily("heavy", heavy, {
    maxRange,
    low: overrides.heavy?.low || overrides.heavy_low,
    mid: overrides.heavy?.mid || overrides.heavy_mid || overrides.heavy_attack,
    high: overrides.heavy?.high || overrides.heavy_high || overrides.up_attack
  })

  const grabFamily = createAttackFamily("grab", 0, {
    maxRange,
    legacyGrabPower,
    low: overrides.grab?.low || overrides.grab_low,
    mid: overrides.grab?.mid || overrides.grab_mid || overrides.grab,
    high: overrides.grab?.high || overrides.grab_high
  })

  return {
    light: lightFamily,
    heavy: heavyFamily,
    grab: grabFamily
  }
}

function attacks(light, heavy, up, air, down, grabDamage = 34) {
  const legacyGrabPower = typeof grabDamage === "number"
    ? grabDamage
    : (grabDamage?.legacyDamageHint || grabDamage?.damage || 0)

  const ground = createGroundBasicAttacks({
    light,
    heavy,
    legacyGrabPower,
    maxRange: 72
  })

  const airAttack = buildAttackData(air, {
    damage: 55,
    hitstun: 16,
    blockstun: 7,
    startup: 6,
    recovery: 10,
    cancelWindow: 6,
    knockbackX: 3,
    knockbackY: -3,
    attackClass: "air",
    attackHeight: "mid",
    rangeType: "melee",
    minRange: 0,
    maxRange: 78,
    meleeOnly: true
  })

  const downAir = buildAttackData(down, {
    damage: 70,
    hitstun: 18,
    blockstun: 7,
    startup: 9,
    recovery: 16,
    cancelWindow: 3,
    spike_force: 14,
    knockbackX: 2,
    knockbackY: 12,
    attackClass: "air",
    attackHeight: "low",
    rangeType: "melee",
    minRange: 0,
    maxRange: 78,
    meleeOnly: true
  })

  const legacyUpAttack = buildAttackData(up, {
    ...cloneAttackData(ground.heavy.high),
    damage: clampBasicDamage(up),
    attackClass: "heavy",
    attackHeight: "high",
    comboRole: "power_launcher"
  })

  return {
    ground,

    light_low: cloneAttackData(ground.light.low),
    light_mid: cloneAttackData(ground.light.mid),
    light_high: cloneAttackData(ground.light.high),

    heavy_low: cloneAttackData(ground.heavy.low),
    heavy_mid: cloneAttackData(ground.heavy.mid),
    heavy_high: cloneAttackData(ground.heavy.high),

    grab_low: cloneAttackData(ground.grab.low),
    grab_mid: cloneAttackData(ground.grab.mid),
    grab_high: cloneAttackData(ground.grab.high),

    // legacy compatibility
    light_attack: cloneAttackData(ground.light.mid),
    heavy_attack: cloneAttackData(ground.heavy.mid),
    up_attack: legacyUpAttack,
    air_attack: airAttack,
    down_air: downAir,
    grab: cloneAttackData(ground.grab.mid)
  }
}

const movementPresets = {
  balanced: {
    moveMultiplier: 1,
    attackSpeedMultiplier: 1,
    jumpCount: 2,
    wallJump: false,
    dashTeleport: false,
    meleeOnly: false,
    pureMelee: false,
    meleeRange: 84,
    tripleJumpLaunch: false,
    behindTargetDash: false
  },

  projectile_control: {
    moveMultiplier: 1,
    attackSpeedMultiplier: 0.95,
    jumpCount: 2,
    wallJump: false,
    dashTeleport: false,
    meleeOnly: false,
    pureMelee: false,
    meleeRange: 84,
    tripleJumpLaunch: false,
    behindTargetDash: false
  },

  speed_melee: {
    moveMultiplier: 2.4,
    attackSpeedMultiplier: 1.3,
    jumpCount: 3,
    wallJump: true,
    dashTeleport: true,
    meleeOnly: true,
    pureMelee: true,
    meleeRange: 72,
    tripleJumpLaunch: true,
    behindTargetDash: true
  },

  heavy: {
    moveMultiplier: 0.95,
    attackSpeedMultiplier: 0.92,
    jumpCount: 2,
    wallJump: false,
    dashTeleport: false,
    meleeOnly: false,
    pureMelee: false,
    meleeRange: 80,
    tripleJumpLaunch: false,
    behindTargetDash: false
  }
}

const ENERGY_LABELS = {
  ki: "Ki",
  god_ki: "God Ki",
  android_energy: "Android Energy",
  chakra: "Chakra",
  god_chakra: "God Chakra",
  kamui_chakra: "Kamui Chakra",
  genjutsu_chakra: "Genjutsu Chakra",
  teleport_chakra: "Teleport Chakra",
  cursed_energy: "Cursed Energy",
  nen: "Nen",
  viltrumite_power: "Viltrumite Power",
  molecular_energy: "Molecular Energy",
  arc_energy: "Arc Energy",
  solar_energy: "Solar Energy",
  gadget_energy: "Gadget Energy",
  omega_energy: "Omega Energy",
  ring_energy: "Ring Energy",
  portal_tech: "Portal Tech",
  psychic_power: "Psychic Power",
  speed_force: "Speed Force",
  rage: "Rage",
  stamina: "Stamina"
}

function formatEnergyLabel(energyType) {
  if (!energyType) return null
  if (ENERGY_LABELS[energyType]) return ENERGY_LABELS[energyType]

  return energyType
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function inferArchetype(classType, specials = {}) {
  const specialList = Object.values(specials || {})
  const summonCount = specialList.filter(special => special && special.summon).length
  const teleportCount = specialList.filter(special => special && special.teleport).length
  const rangedCount = specialList.filter(special => {
    if (!special) return false
    return !special.summon && !special.counter && !special.teleport && (special.damage || 0) > 0
  }).length

  if (summonCount >= 2) return "summoner"
  if (classType === "projectile_control") return "projectile"
  if (classType === "speed_melee") return "melee"
  if (classType === "heavy") return "melee"
  if (teleportCount > 0 && rangedCount > 0) return "hybrid"
  return "hybrid"
}

function inferEnergyBehavior({ maxEnergy, energyType, specials }) {
  if (!energyType || maxEnergy <= 0) return "none"

  const hasPassiveDrain = Object.values(specials || {}).some(special =>
    special && (special.toggle || special.channel || special.passiveDrain)
  )

  if (hasPassiveDrain) return "passive_drain"
  if (energyType === "rage") return "on_hit"
  return "regen"
}

function inferUsesEnergy({ maxEnergy, energyType, specials }) {
  if (!energyType || maxEnergy <= 0) {
    return Object.values(specials || {}).some(special => (special?.cost || 0) > 0)
  }

  return true
}

function inferWeight(classType, weight) {
  if (weight != null) return weight
  if (classType === "heavy") return 1.2
  if (classType === "speed_melee") return 0.92
  if (classType === "projectile_control") return 0.96
  return 1
}

function normalizeBasicAttacks(basicAttacks = {}) {
  const defaultSet = attacks(40, 80, 60, 55, 70, 0)
  const sourceGround = basicAttacks.ground || {}

  const ground = createGroundBasicAttacks({
    light: basicAttacks.light_attack?.damage ?? basicAttacks.light_mid?.damage ?? sourceGround.light?.mid?.damage ?? 40,
    heavy: basicAttacks.heavy_attack?.damage ?? basicAttacks.heavy_mid?.damage ?? sourceGround.heavy?.mid?.damage ?? 80,
    legacyGrabPower:
      basicAttacks.grab?.legacyDamageHint ??
      basicAttacks.grab_mid?.legacyDamageHint ??
      sourceGround.grab?.mid?.legacyDamageHint ??
      basicAttacks.grab?.damage ??
      0,
    maxRange:
      sourceGround.light?.mid?.maxRange ??
      basicAttacks.light_mid?.maxRange ??
      basicAttacks.light_attack?.maxRange ??
      72,
    overrides: basicAttacks
  })

  const normalizedAir = buildAttackData(basicAttacks.air_attack, defaultSet.air_attack)
  const normalizedDownAir = buildAttackData(basicAttacks.down_air, defaultSet.down_air)
  const normalizedUpAttack = buildAttackData(
    basicAttacks.up_attack,
    {
      ...cloneAttackData(ground.heavy.high),
      damage: basicAttacks.up_attack?.damage ?? defaultSet.up_attack.damage
    }
  )

  return {
    ground,

    light_low: cloneAttackData(ground.light.low),
    light_mid: cloneAttackData(ground.light.mid),
    light_high: cloneAttackData(ground.light.high),

    heavy_low: cloneAttackData(ground.heavy.low),
    heavy_mid: cloneAttackData(ground.heavy.mid),
    heavy_high: cloneAttackData(ground.heavy.high),

    grab_low: cloneAttackData(ground.grab.low),
    grab_mid: cloneAttackData(ground.grab.mid),
    grab_high: cloneAttackData(ground.grab.high),

    // legacy compatibility
    light_attack: buildAttackData(basicAttacks.light_attack, ground.light.mid),
    heavy_attack: buildAttackData(basicAttacks.heavy_attack, ground.heavy.mid),
    up_attack: normalizedUpAttack,
    air_attack: normalizedAir,
    down_air: normalizedDownAir,
    grab: buildAttackData(basicAttacks.grab, ground.grab.mid)
  }
}

function normalizeSpecials(specials = {}) {
  return Object.fromEntries(
    Object.entries(specials).map(([key, value]) => [
      key,
      {
        label: value?.label || key,
        damage: 0,
        cost: 0,
        cooldown: 0,
        startup: 0,
        recovery: 0,
        energyScaling: false,
        ...value
      }
    ])
  )
}

function makeCharacter({
  name,
  universe,
  classType = "balanced",
  movementType = null,
  archetype = null,
  color = "#888",
  health = 1000,
  speed = 8,
  jump = 8,
  maxEnergy = 100,
  energyType = "energy",
  usesEnergy = null,
  energyLabel = null,
  energyBehavior = null,
  weight = null,
  basic_attacks = attacks(40, 80, 60, 55, 70),
  specials = {},
  passives = {},
  domain = null,
  movement = {},
  transformations = null,
  transformationOrder = null,
  portrait = null,
  winSprite = null,
  sprites = null,
  tags = [],

  // sprite rendering / fighter size
  w = 60,
  h = 100,
  spriteScale = 1,
  spriteOffsetX = 0,
  spriteOffsetY = 0
}) {
  const resolvedMovementType = movementType || classType
  const normalizedSpecials = normalizeSpecials(specials)

  return {
    name,
    universe,

    // compatibility + clearer naming
    classType,
    movementType: resolvedMovementType,
    archetype: archetype || inferArchetype(classType, normalizedSpecials),

    color,
    health,
    speed,
    jump,

    maxEnergy,
    energyType,
    usesEnergy: usesEnergy ?? inferUsesEnergy({ maxEnergy, energyType, specials: normalizedSpecials }),
    energyLabel: energyLabel || formatEnergyLabel(energyType),
    energyBehavior: energyBehavior || inferEnergyBehavior({ maxEnergy, energyType, specials: normalizedSpecials }),

    weight: inferWeight(classType, weight),

    movement: {
      ...(movementPresets[resolvedMovementType] || movementPresets.balanced),
      ...movement
    },

    basic_attacks: normalizeBasicAttacks(basic_attacks),
    specials: normalizedSpecials,
    passives,
    domain,
    transformations,
    transformationOrder,

    portrait,
    winSprite,
    sprites,
    tags,

    w,
    h,
    spriteScale,
    spriteOffsetX,
    spriteOffsetY
  }
}

export const characters = {
  // =====================================================
  // DRAGON BALL
  // =====================================================

  goku: makeCharacter({
    name: "Goku",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#ff8c00",
    health: 1200,
    speed: 8,
    jump: 9,
    maxEnergy: 150,
    energyType: "ki",
    basic_attacks: attacks(45, 85, 65, 60, 80),
    specials: {
      kamehameha: { damage: 120, cost: 30 },
      instant_transmission: { damage: 0, cost: 15, teleport: true },
      dragon_fist: { damage: 150, cost: 40 }
    },
    passives: {
      saiyan_spirit: { effect: "increase_damage_below_50_health", condition: "health_below_50%" }
    },
    domain: { name: "Saiyan Spirit Zone", priority: 1 },
    transformations: {
      base: { label: "Base", drainPerSecond: 0, attackMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
      super_saiyan: { label: "Super Saiyan", drainPerSecond: 2, attackMultiplier: 1.18, speedMultiplier: 1.08, defenseMultiplier: 0.95 },
      super_saiyan_2: { label: "Super Saiyan 2", drainPerSecond: 3, attackMultiplier: 1.3, speedMultiplier: 1.12, defenseMultiplier: 0.92 },
      super_saiyan_3: { label: "Super Saiyan 3", drainPerSecond: 5, attackMultiplier: 1.48, speedMultiplier: 1.18, defenseMultiplier: 0.88 },
      super_saiyan_god: { label: "Super Saiyan God", drainPerSecond: 6, attackMultiplier: 1.65, speedMultiplier: 1.25, defenseMultiplier: 0.85 },
      super_saiyan_blue: { label: "Super Saiyan Blue", drainPerSecond: 8, attackMultiplier: 1.9, speedMultiplier: 1.35, defenseMultiplier: 0.8 },
      super_saiyan_blue_kaioken: { label: "Super Saiyan Blue Kaioken", drainPerSecond: 12, attackMultiplier: 2.15, speedMultiplier: 1.48, defenseMultiplier: 0.72 },
      ultra_instinct: { label: "Ultra Instinct", drainPerSecond: 14, attackMultiplier: 2.35, speedMultiplier: 1.6, defenseMultiplier: 0.68, autoDodge: true, autoDodgeKiCost: 5 }
    },
    transformationOrder: [
      "base",
      "super_saiyan",
      "super_saiyan_2",
      "super_saiyan_3",
      "super_saiyan_god",
      "super_saiyan_blue",
      "super_saiyan_blue_kaioken",
      "ultra_instinct"
    ]
  }),

  vegeta: makeCharacter({
    name: "Vegeta",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#315cff",
    health: 1150,
    speed: 8,
    jump: 8,
    maxEnergy: 150,
    energyType: "ki",
    basic_attacks: attacks(45, 88, 68, 60, 82),
    specials: {
      galick_gun: { damage: 110, cost: 30 },
      final_flash: { damage: 160, cost: 50 },
      rush_strike: { damage: 90, cost: 20 }
    },
    domain: { name: "Prince's Pressure Field", priority: 1 },
    transformations: {
      base: { label: "Base", drainPerSecond: 0, attackMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1, rageHealOnHit: 0 },
      super_saiyan: { label: "Super Saiyan", drainPerSecond: 2, attackMultiplier: 1.18, speedMultiplier: 1.08, defenseMultiplier: 0.95, rageHealOnHit: 0 },
      super_saiyan_2: { label: "Super Saiyan 2", drainPerSecond: 3, attackMultiplier: 1.32, speedMultiplier: 1.12, defenseMultiplier: 0.92, rageHealOnHit: 0 },
      super_saiyan_3: { label: "Super Saiyan 3", drainPerSecond: 5, attackMultiplier: 1.5, speedMultiplier: 1.18, defenseMultiplier: 0.88, rageHealOnHit: 0 },
      super_saiyan_god: { label: "Super Saiyan God", drainPerSecond: 6, attackMultiplier: 1.68, speedMultiplier: 1.24, defenseMultiplier: 0.84, rageHealOnHit: 0 },
      super_saiyan_blue: { label: "Super Saiyan Blue", drainPerSecond: 8, attackMultiplier: 1.92, speedMultiplier: 1.34, defenseMultiplier: 0.8, rageHealOnHit: 0 },
      super_saiyan_blue_deep: { label: "Super Saiyan Blue Deep", drainPerSecond: 10, attackMultiplier: 2.08, speedMultiplier: 1.4, defenseMultiplier: 0.76, rageHealOnHit: 0 },
      ultra_ego: { label: "Ultra Ego", drainPerSecond: 14, attackMultiplier: 2.35, speedMultiplier: 1.5, defenseMultiplier: 0.68, rageHealOnHit: 8, healCostPerHitKi: 4 }
    },
    transformationOrder: [
      "base",
      "super_saiyan",
      "super_saiyan_2",
      "super_saiyan_3",
      "super_saiyan_god",
      "super_saiyan_blue",
      "super_saiyan_blue_deep",
      "ultra_ego"
    ]
  }),

  gokuBlack: makeCharacter({
    name: "Goku Black",
    universe: "dragon_ball",
    classType: "projectile_control",
    color: "#ff66eb",
    health: 1180,
    speed: 8,
    jump: 8,
    maxEnergy: 155,
    energyType: "ki",
    basic_attacks: attacks(44, 86, 66, 58, 82),
    specials: {
      black_kamehameha: { damage: 118, cost: 30 },
      divine_slice: { damage: 100, cost: 22 },
      scythe_slash: { damage: 135, cost: 36 }
    },
    domain: { name: "Rosé Rift", priority: 1 },
    transformations: {
      base: { label: "Base", drainPerSecond: 0, attackMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
      super_saiyan: { label: "Super Saiyan", drainPerSecond: 2, attackMultiplier: 1.15, speedMultiplier: 1.08, defenseMultiplier: 0.95 },
      super_saiyan_2: { label: "Super Saiyan 2", drainPerSecond: 3, attackMultiplier: 1.28, speedMultiplier: 1.12, defenseMultiplier: 0.92 },
      super_saiyan_3: { label: "Super Saiyan 3", drainPerSecond: 5, attackMultiplier: 1.45, speedMultiplier: 1.18, defenseMultiplier: 0.88 },
      super_saiyan_god: { label: "Super Saiyan God", drainPerSecond: 6, attackMultiplier: 1.62, speedMultiplier: 1.24, defenseMultiplier: 0.84 },
      super_saiyan_blue: { label: "Super Saiyan Blue", drainPerSecond: 8, attackMultiplier: 1.86, speedMultiplier: 1.32, defenseMultiplier: 0.8 },
      super_saiyan_rose: { label: "Super Saiyan Rosé", drainPerSecond: 10, attackMultiplier: 2.02, speedMultiplier: 1.38, defenseMultiplier: 0.77 },
      super_saiyan_rose_2: { label: "Super Saiyan Rosé 2", drainPerSecond: 12, attackMultiplier: 2.16, speedMultiplier: 1.45, defenseMultiplier: 0.73 },
      super_saiyan_rose_3: { label: "Super Saiyan Rosé 3", drainPerSecond: 14, attackMultiplier: 2.3, speedMultiplier: 1.52, defenseMultiplier: 0.69 }
    },
    transformationOrder: [
      "base",
      "super_saiyan",
      "super_saiyan_2",
      "super_saiyan_3",
      "super_saiyan_god",
      "super_saiyan_blue",
      "super_saiyan_rose",
      "super_saiyan_rose_2",
      "super_saiyan_rose_3"
    ]
  }),

  broly: makeCharacter({
    name: "Broly",
    universe: "dragon_ball",
    classType: "heavy",
    color: "#66ff33",
    health: 1350,
    speed: 7,
    jump: 8,
    maxEnergy: 150,
    energyType: "ki",
    basic_attacks: attacks(50, 100, 75, 65, 90),
    specials: {
      gigantic_charge: { damage: 110, cost: 25 },
      energy_cannon: { damage: 135, cost: 35 }
    },
    domain: { name: "Berserker Rage Zone", priority: 1 }
  }),

  frieza: makeCharacter({
    name: "Frieza",
    universe: "dragon_ball",
    classType: "projectile_control",
    color: "#ff66ff",
    health: 1150,
    speed: 8,
    jump: 8,
    maxEnergy: 155,
    energyType: "ki",
    basic_attacks: attacks(45, 90, 68, 60, 82),
    specials: {
      death_beam: { damage: 95, cost: 20 },
      nova_strike: { damage: 140, cost: 30 },
      death_ball: { damage: 180, cost: 50 }
    },
    domain: { name: "Emperor's Death Field", priority: 1 },
    transformations: {
      final_form: { label: "Final Form", drainPerSecond: 0, attackMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
      golden_frieza: { label: "Golden Frieza", drainPerSecond: 9, attackMultiplier: 1.95, speedMultiplier: 1.36, defenseMultiplier: 0.8 },
      black_frieza: { label: "Black Frieza", drainPerSecond: 14, attackMultiplier: 2.35, speedMultiplier: 1.5, defenseMultiplier: 0.7 }
    },
    transformationOrder: ["final_form", "golden_frieza", "black_frieza"]
  }),

  piccolo: makeCharacter({
    name: "Piccolo",
    universe: "dragon_ball",
    classType: "projectile_control",
    color: "#6cab3c",
    health: 1100,
    speed: 7,
    jump: 7,
    maxEnergy: 140,
    energyType: "ki",
    basic_attacks: attacks(40, 80, 60, 55, 70),
    specials: {
      special_beam_cannon: { damage: 150, cost: 35 },
      hellzone_grenade: { damage: 100, cost: 30 }
    }
  }),

  gohan: makeCharacter({
    name: "Gohan",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#f5d142",
    health: 1100,
    speed: 8,
    jump: 8,
    maxEnergy: 145,
    energyType: "ki",
    basic_attacks: attacks(44, 86, 66, 58, 78),
    specials: {
      masenko: { damage: 110, cost: 25 },
      kamehameha: { damage: 120, cost: 30 }
    }
  }),

  futureTrunks: makeCharacter({
    name: "Future Trunks",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#6e8cff",
    health: 1080,
    speed: 8,
    jump: 8,
    maxEnergy: 140,
    energyType: "ki",
    basic_attacks: attacks(43, 88, 64, 58, 78),
    specials: {
      burning_attack: { damage: 120, cost: 28 },
      sword_dash: { damage: 105, cost: 22 }
    }
  }),

  cell: makeCharacter({
    name: "Cell",
    universe: "dragon_ball",
    classType: "heavy",
    color: "#7ca14f",
    health: 1250,
    speed: 7,
    jump: 7,
    maxEnergy: 150,
    energyType: "ki",
    basic_attacks: attacks(48, 95, 72, 62, 86),
    specials: {
      solar_kamehameha: { damage: 160, cost: 40 },
      perfect_strike: { damage: 110, cost: 24 }
    }
  }),

  majinBuu: makeCharacter({
    name: "Majin Buu",
    universe: "dragon_ball",
    classType: "heavy",
    color: "#ff9ccf",
    health: 1300,
    speed: 6,
    jump: 7,
    maxEnergy: 130,
    energyType: "ki",
    basic_attacks: attacks(46, 92, 70, 60, 84),
    specials: {
      candy_beam: { damage: 120, cost: 26 },
      elastic_smash: { damage: 110, cost: 20 }
    }
  }),

  beerus: makeCharacter({
    name: "Beerus",
    universe: "dragon_ball",
    classType: "projectile_control",
    color: "#8a4bff",
    health: 1100,
    speed: 9,
    jump: 9,
    maxEnergy: 170,
    energyType: "god_ki",
    basic_attacks: attacks(48, 95, 72, 62, 84),
    specials: {
      hakai_blast: { damage: 155, cost: 40 },
      destroyer_orb: { damage: 125, cost: 28 },
      god_dash: { damage: 85, cost: 18 }
    },
    domain: { name: "Destroyer Space", priority: 1 },
    transformations: {
      base: { label: "Base", drainPerSecond: 0, attackMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 }
    },
    transformationOrder: ["base"]
  }),

  hit: makeCharacter({
    name: "Hit",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#8667b3",
    health: 1080,
    speed: 9,
    jump: 8,
    maxEnergy: 120,
    energyType: "ki",
    basic_attacks: attacks(46, 90, 68, 60, 82),
    specials: {
      time_skip: { damage: 95, cost: 22, teleport: true },
      time_cage: { damage: 110, cost: 30 }
    }
  }),

  android17: makeCharacter({
    name: "Android 17",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#2ca58d",
    health: 1080,
    speed: 8,
    jump: 8,
    maxEnergy: 130,
    energyType: "android_energy",
    basic_attacks: attacks(43, 84, 62, 56, 76),
    specials: {
      barrier_blast: { damage: 105, cost: 24 },
      energy_volley: { damage: 95, cost: 22 }
    }
  }),

  android18: makeCharacter({
    name: "Android 18",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#d6c063",
    health: 1060,
    speed: 8,
    jump: 8,
    maxEnergy: 130,
    energyType: "android_energy",
    basic_attacks: attacks(43, 84, 62, 56, 76),
    specials: {
      energy_barrage: { damage: 102, cost: 22 },
      rush_kick: { damage: 90, cost: 18 }
    }
  }),

  jiren: makeCharacter({
    name: "Jiren",
    universe: "dragon_ball",
    classType: "heavy",
    color: "#ba1b1d",
    health: 1350,
    speed: 7,
    jump: 7,
    maxEnergy: 160,
    energyType: "ki",
    basic_attacks: attacks(52, 108, 80, 68, 92),
    specials: {
      power_impact: { damage: 140, cost: 30 },
      glare_burst: { damage: 115, cost: 24 }
    }
  }),

  gogeta: makeCharacter({
    name: "Gogeta",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#3edbf0",
    health: 1220,
    speed: 9,
    jump: 9,
    maxEnergy: 155,
    energyType: "ki",
    basic_attacks: attacks(48, 92, 70, 62, 84),
    specials: {
      stardust_breaker: { damage: 145, cost: 36 },
      meteor_rush: { damage: 110, cost: 22 }
    }
  }),

  vegito: makeCharacter({
    name: "Vegito",
    universe: "dragon_ball",
    classType: "balanced",
    color: "#2f6fff",
    health: 1220,
    speed: 9,
    jump: 9,
    maxEnergy: 155,
    energyType: "ki",
    basic_attacks: attacks(48, 92, 70, 62, 84),
    specials: {
      final_kamehameha: { damage: 150, cost: 38 },
      spirit_sword: { damage: 120, cost: 26 }
    }
  }),

  // =====================================================
  // NARUTO / BORUTO
  // =====================================================

  naruto: makeCharacter({
    name: "Naruto Uzumaki",
    universe: "naruto",
    classType: "balanced",
    color: "#ff9900",
    health: 1200,
    speed: 9,
    jump: 8,
    maxEnergy: 150,
    energyType: "chakra",
    basic_attacks: attacks(50, 100, 70, 60, 80),
    specials: {
      rasengan: { damage: 120, cost: 30 },
      shadow_clone_assault: { damage: 100, cost: 28 }
    }
  }),

  sasuke: makeCharacter({
    name: "Sasuke Uchiha",
    universe: "naruto",
    classType: "balanced",
    color: "#4444ff",
    health: 1150,
    speed: 9,
    jump: 9,
    maxEnergy: 150,
    energyType: "chakra",
    movement: { wallJump: true },
    basic_attacks: attacks(48, 95, 68, 62, 84),
    specials: {
      chidori: { damage: 130, cost: 30 },
      amaterasu: { damage: 145, cost: 40 },
      rinnegan_step: { damage: 0, cost: 15, teleport: true }
    }
  }),

  kakashi: makeCharacter({
    name: "Kakashi Hatake",
    universe: "naruto",
    classType: "projectile_control",
    color: "#999999",
    health: 1100,
    speed: 8,
    jump: 8,
    maxEnergy: 140,
    energyType: "chakra",
    movement: { wallJump: true },
    basic_attacks: attacks(45, 85, 65, 58, 78),
    specials: {
      lightning_blade: { damage: 135, cost: 30 },
      kunai_flurry: { damage: 90, cost: 20 }
    }
  }),

  madara: makeCharacter({
    name: "Madara Uchiha",
    universe: "naruto",
    classType: "heavy",
    color: "#7f1d1d",
    health: 1350,
    speed: 8,
    jump: 7,
    maxEnergy: 170,
    energyType: "god_chakra",
    basic_attacks: attacks(55, 100, 80, 70, 95),
    specials: {
      susanoo_slash: { damage: 160, cost: 40 },
      meteor_drop: { damage: 180, cost: 50 }
    }
  }),

  obito: makeCharacter({
    name: "Obito Uchiha",
    universe: "naruto",
    classType: "balanced",
    color: "#4b5563",
    health: 1250,
    speed: 9,
    jump: 8,
    maxEnergy: 160,
    energyType: "kamui_chakra",
    basic_attacks: attacks(50, 90, 70, 65, 85),
    specials: {
      kamui_phase: { damage: 0, cost: 30, teleport: true },
      truth_seeker_orb: { damage: 135, cost: 32 }
    }
  }),

  itachi: makeCharacter({
    name: "Itachi Uchiha",
    universe: "naruto",
    classType: "projectile_control",
    color: "#5b2333",
    health: 1120,
    speed: 9,
    jump: 8,
    maxEnergy: 150,
    energyType: "genjutsu_chakra",
    basic_attacks: attacks(45, 85, 65, 60, 80),
    specials: {
      amaterasu: { damage: 150, cost: 40 },
      tsukuyomi_slash: { damage: 120, cost: 28 }
    }
  }),

  boruto: makeCharacter({
    name: "Boruto Uzumaki",
    universe: "naruto",
    classType: "balanced",
    color: "#49b6ff",
    health: 1080,
    speed: 10,
    jump: 9,
    maxEnergy: 140,
    energyType: "chakra",
    basic_attacks: attacks(45, 80, 60, 55, 70),
    specials: {
      vanishing_rasengan: { damage: 140, cost: 30 },
      lightning_dash: { damage: 85, cost: 18 }
    }
  }),

  kawaki: makeCharacter({
    name: "Kawaki",
    universe: "naruto",
    classType: "balanced",
    color: "#8b5cf6",
    health: 1200,
    speed: 9,
    jump: 8,
    maxEnergy: 150,
    energyType: "karma_power",
    basic_attacks: attacks(50, 90, 70, 60, 80),
    specials: {
      karma_blast: { damage: 150, cost: 35 },
      absorption_dash: { damage: 95, cost: 22 }
    }
  }),

  rockLee: makeCharacter({
    name: "Rock Lee",
    universe: "naruto",
    classType: "speed_melee",
    color: "#3fa34d",
    health: 1180,
    speed: 11,
    jump: 10,
    maxEnergy: 120,
    energyType: "taijutsu",
    movement: { moveMultiplier: 2.5, attackSpeedMultiplier: 1.35, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(45, 85, 65, 60, 80),
    specials: {
      leaf_hurricane: { damage: 130, cost: 30 },
      rising_lotus: { damage: 120, cost: 28 }
    }
  }),

  gaara: makeCharacter({
    name: "Gaara",
    universe: "naruto",
    classType: "projectile_control",
    color: "#b08968",
    health: 1350,
    speed: 7,
    jump: 6,
    maxEnergy: 150,
    energyType: "sand",
    basic_attacks: attacks(45, 90, 65, 55, 75),
    specials: {
      sand_coffin: { damage: 150, cost: 35 },
      sand_wave: { damage: 105, cost: 22 }
    }
  }),

  minato: makeCharacter({
    name: "Minato Namikaze",
    universe: "naruto",
    classType: "speed_melee",
    color: "#ffd166",
    health: 1120,
    speed: 11,
    jump: 9,
    maxEnergy: 150,
    energyType: "teleport_chakra",
    movement: { moveMultiplier: 2.5, attackSpeedMultiplier: 1.32, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(45, 85, 65, 60, 75),
    specials: {
      flying_raijin_strike: { damage: 140, cost: 30, teleport: true },
      rasengan: { damage: 120, cost: 28 }
    }
  }),

  hinata: makeCharacter({
    name: "Hinata Hyuga",
    universe: "naruto",
    classType: "balanced",
    color: "#b8b8ff",
    health: 1080,
    speed: 9,
    jump: 8,
    maxEnergy: 130,
    energyType: "byakugan",
    basic_attacks: attacks(40, 80, 60, 55, 70),
    specials: {
      eight_trigrams_strike: { damage: 130, cost: 30 }
    }
  }),

  pain: makeCharacter({
    name: "Pain (Nagato)",
    universe: "naruto",
    classType: "projectile_control",
    color: "#6366f1",
    health: 1350,
    speed: 8,
    jump: 7,
    maxEnergy: 170,
    energyType: "rinnegan",
    basic_attacks: attacks(50, 95, 70, 60, 80),
    specials: {
      almighty_push: { damage: 150, cost: 40 },
      planetary_pull: { damage: 120, cost: 34 }
    }
  }),

  mightGuy: makeCharacter({
    name: "Might Guy",
    universe: "naruto",
    classType: "speed_melee",
    color: "#0ea5e9",
    health: 1250,
    speed: 11,
    jump: 9,
    maxEnergy: 120,
    energyType: "taijutsu",
    movement: { moveMultiplier: 2.45, attackSpeedMultiplier: 1.34, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(45, 85, 65, 60, 80),
    specials: {
      morning_peacock: { damage: 150, cost: 35 }
    }
  }),

  shikamaru: makeCharacter({
    name: "Shikamaru Nara",
    universe: "naruto",
    classType: "projectile_control",
    color: "#475569",
    health: 1050,
    speed: 8,
    jump: 7,
    maxEnergy: 140,
    energyType: "shadow",
    basic_attacks: attacks(40, 75, 60, 50, 65),
    specials: {
      shadow_bind: { damage: 110, cost: 30 }
    }
  }),

  // =====================================================
  // JUJUTSU KAISEN
  // =====================================================

  gojo: makeCharacter({
    name: "Satoru Gojo",
    universe: "jujutsu_kaisen",
    classType: "projectile_control",
    color: "#3b82f6",
    health: 1050,
    speed: 8,
    jump: 7,
    maxEnergy: 100,
    energyType: "cursed_energy",

    // hurtbox / movement feel
    w: 64,
    h: 110,
    movement: { moveMultiplier: 1.12, attackSpeedMultiplier: 0.96 },

    // sprite placement tuning
    spriteScale: 1.65,
    spriteOffsetX: -56,
    spriteOffsetY: -92,

    basic_attacks: attacks(35, 70, 58, 52, 68, 30),
    specials: {
      blue: { damage: 65, cost: 15 },
      red: { damage: 110, cost: 25 },
      hollow_purple: { damage: 200, cost: 60 },
      teleport: { damage: 0, cost: 5, teleport: true }
    },
    passives: {
      infinity: { effect: "proximity_deceleration_field", condition: "toggle" },
      six_eyes: { effect: "higher_energy_efficiency", condition: "always" }
    },
    domain: { name: "Unlimited Void", priority: 3, background: "galaxy" },

    portrait: "./assets/portraits/gojo_portrait.png",
    winSprite: "./assets/sprites/gojo/gojo_win.png",

    sprites: {
      idle: {
        path: "./assets/sprites/gojo/gojo_idle_sheet.png",
        frameCount: 12,
        columns: 6,
        rows: 2
      },
      walk: {
        path: "./assets/sprites/gojo/gojo_walk_sheet.png",
        frameCount: 8,
        columns: 8,
        rows: 1
      },
      jump: {
        path: "./assets/sprites/gojo/gojo_jump_sheet.png",
        frameCount: 8,
        columns: 8,
        rows: 1
      },
      hurt: {
        path: "./assets/sprites/gojo/gojo_hurt_sheet.png",
        frameCount: 4,
        columns: 4,
        rows: 1
      },
      light: {
        path: "./assets/sprites/gojo/gojo_light_sheet.png",
        frameCount: 12,
        columns: 6,
        rows: 2
      },
      heavy: {
        path: "./assets/sprites/gojo/gojo_heavy_sheet.png",
        frameCount: 7,
        columns: 7,
        rows: 1
      },
      blue: {
        path: "./assets/sprites/gojo/gojo_blue_sheet.png",
        frameCount: 10,
        columns: 6,
        rows: 2
      },
      red: {
        path: "./assets/sprites/gojo/gojo_red_sheet.png",
        frameCount: 6,
        columns: 6,
        rows: 1
      },
      hollowPurple: {
        path: "./assets/sprites/gojo/gojo_hollow_purple_sheet.png",
        frameCount: 9,
        columns: 6,
        rows: 2
      },
      infinity: {
        path: "./assets/sprites/gojo/gojo_infinity_sheet.png",
        frameCount: 6,
        columns: 6,
        rows: 1
      }
    }
  }),

  sukuna: makeCharacter({
    name: "Ryomen Sukuna",
    universe: "jujutsu_kaisen",
    classType: "heavy",
    color: "#ef4444",
    health: 1200,
    speed: 7,
    jump: 7,
    maxEnergy: 120,
    energyType: "cursed_energy",
    basic_attacks: attacks(45, 90, 70, 60, 85, 38),
    specials: {
      dismantle: { damage: 65, cost: 10 },
      cleave: { damage: 110, cost: 20 },
      flame_arrow: { damage: 140, cost: 35 },
      malevolent_dash: { damage: 80, cost: 15 }
    },
    domain: { name: "Malevolent Shrine", priority: 2, background: "shrine" }
  }),

  yuji: makeCharacter({
    name: "Yuji Itadori",
    universe: "jujutsu_kaisen",
    classType: "speed_melee",
    color: "#f59e0b",
    health: 1100,
    speed: 10,
    jump: 9,
    maxEnergy: 80,
    energyType: "cursed_energy",
    movement: { moveMultiplier: 2.2, attackSpeedMultiplier: 1.2, dashTeleport: false, wallJump: true },
    basic_attacks: attacks(45, 85, 65, 60, 75, 34),
    specials: {
      divergent_fist: { damage: 70, cost: 10 },
      black_flash: { damage: 140, cost: 25 },
      manji_kick: { damage: 80, cost: 15 }
    }
  }),

  megumi: makeCharacter({
    name: "Megumi Fushiguro",
    universe: "jujutsu_kaisen",
    classType: "projectile_control",
    color: "#1e3a8a",
    health: 950,
    speed: 7,
    jump: 7,
    maxEnergy: 100,
    energyType: "cursed_energy",
    movement: {
      moveMultiplier: 1.02,
      attackSpeedMultiplier: 0.98,
      jumpCount: 2,
      wallJump: false,
      dashTeleport: false
    },
    basic_attacks: attacks(35, 75, 55, 50, 65, 30),
    specials: {
      divine_dogs: {
        label: "Divine Dogs",
        damage: 45,
        cost: 15,
        summon: true,
        summonId: "divineDogs",
        cooldown: 120,
        comboExtend: true,
        role: "rush_assist"
      },
      nue: {
        label: "Nue",
        damage: 70,
        cost: 25,
        summon: true,
        summonId: "nue",
        cooldown: 160,
        antiAir: true,
        comboExtend: true,
        role: "air_lightning_assist"
      },
      toad: {
        label: "Toad",
        damage: 60,
        cost: 20,
        summon: true,
        summonId: "toad",
        cooldown: 140,
        restrain: true,
        comboExtend: true,
        role: "capture_assist"
      },
      rabbit_escape: {
        label: "Rabbit Escape",
        damage: 10,
        cost: 12,
        summon: true,
        summonId: "rabbitEscape",
        cooldown: 180,
        defensive: true,
        utility: true,
        obscureVision: true,
        role: "escape_assist"
      },
      max_elephant: {
        label: "Max Elephant",
        damage: 110,
        cost: 35,
        summon: true,
        summonId: "maxElephant",
        cooldown: 240,
        heavySummon: true,
        role: "heavy_assist"
      },
      shadow_step: {
        label: "Shadow Step",
        damage: 0,
        cost: 10,
        teleport: true
      },
      mahoraga_ritual: {
        label: "Mahoraga Ritual",
        damage: 0,
        cost: 80,
        permanentTransform: "mahoraga",
        subtype: "ritual",
        oneWay: true,
        deathRitual: true,
        disableSpecials: [
          "divine_dogs",
          "nue",
          "toad",
          "rabbit_escape",
          "max_elephant",
          "shadow_step"
        ]
      }
    },
    passives: {
      ten_shadows_technique: {
        effect: "character_bound_summon_system",
        condition: "always"
      },
      shadow_tactician: {
        effect: "summons_gain_combo_utility_and_space_control",
        condition: "always"
      },
      ritual_no_return: {
        effect: "mahoraga_swap_is_permanent",
        condition: "after_mahoraga_ritual"
      }
    },
    domain: { name: "Chimera Shadow Garden", priority: 2, background: "shadow_garden" },
    transformations: {
      base: {
        label: "Base",
        drainPerSecond: 0,
        attackMultiplier: 1,
        speedMultiplier: 1,
        defenseMultiplier: 1,
        lockSpecials: []
      },
      mahoraga: {
        label: "Mahoraga",
        drainPerSecond: 0,
        attackMultiplier: 1.6,
        speedMultiplier: 0.92,
        defenseMultiplier: 1.35,
        permanent: true,
        oneWay: true,
        deathRitual: true,
        replaceCharacterId: "mahoraga",
        lockSpecials: [
          "divine_dogs",
          "nue",
          "toad",
          "rabbit_escape",
          "max_elephant",
          "shadow_step"
        ]
      }
    },
    transformationOrder: ["base", "mahoraga"]
  }),

  nobara: makeCharacter({
    name: "Nobara Kugisaki",
    universe: "jujutsu_kaisen",
    classType: "balanced",
    color: "#a21caf",
    health: 980,
    speed: 8,
    jump: 8,
    maxEnergy: 95,
    energyType: "cursed_energy",
    basic_attacks: attacks(38, 78, 58, 52, 68),
    specials: {
      straw_doll: { damage: 100, cost: 20 },
      resonance: { damage: 120, cost: 28 }
    }
  }),

  nanami: makeCharacter({
    name: "Kento Nanami",
    universe: "jujutsu_kaisen",
    classType: "balanced",
    color: "#d4a373",
    health: 1100,
    speed: 8,
    jump: 7,
    maxEnergy: 100,
    energyType: "cursed_energy",
    basic_attacks: attacks(42, 88, 65, 58, 74),
    specials: {
      ratio_strike: { damage: 120, cost: 22 },
      overtime: { damage: 140, cost: 30 }
    }
  }),

  yuta: makeCharacter({
    name: "Yuta Okkotsu",
    universe: "jujutsu_kaisen",
    classType: "balanced",
    color: "#99ffcc",
    health: 1150,
    speed: 7,
    jump: 7,
    maxEnergy: 120,
    energyType: "cursed_energy",
    basic_attacks: attacks(45, 90, 70, 60, 80),
    specials: {
      rika_punch: { damage: 100, cost: 20 },
      rika_grab: { damage: 110, cost: 25 },
      cursed_wave: { damage: 70, cost: 15 }
    }
  }),

  maki: makeCharacter({
    name: "Maki Zenin",
    universe: "jujutsu_kaisen",
    classType: "speed_melee",
    color: "#99ff66",
    health: 1000,
    speed: 10,
    jump: 10,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.5, attackSpeedMultiplier: 1.35, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(45, 95, 70, 65, 80, 38),
    specials: {
      polearm_strike: { damage: 90, cost: 0 },
      dash_kick: { damage: 70, cost: 0 }
    }
  }),

  toji: makeCharacter({
    name: "Toji Fushiguro",
    universe: "jujutsu_kaisen",
    classType: "speed_melee",
    color: "#ccffcc",
    health: 1100,
    speed: 10,
    jump: 10,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.5, attackSpeedMultiplier: 1.35, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(50, 100, 75, 70, 85, 40),
    specials: {
      chain_knife: { damage: 60, cost: 0 },
      inverted_spear: { damage: 110, cost: 0 }
    }
  }),

  mahito: makeCharacter({
    name: "Mahito",
    universe: "jujutsu_kaisen",
    classType: "projectile_control",
    color: "#9ca3af",
    health: 1080,
    speed: 8,
    jump: 8,
    maxEnergy: 110,
    energyType: "cursed_energy",
    basic_attacks: attacks(42, 85, 62, 56, 74),
    specials: {
      soul_touch: { damage: 130, cost: 30 },
      body_distortion: { damage: 105, cost: 22 }
    }
  }),

  jogo: makeCharacter({
    name: "Jogo",
    universe: "jujutsu_kaisen",
    classType: "projectile_control",
    color: "#f97316",
    health: 1020,
    speed: 8,
    jump: 8,
    maxEnergy: 120,
    energyType: "cursed_energy",
    basic_attacks: attacks(40, 82, 60, 54, 72),
    specials: {
      ember_insect: { damage: 110, cost: 24 },
      volcano_blast: { damage: 145, cost: 36 }
    }
  }),

  geto: makeCharacter({
    name: "Suguru Geto",
    universe: "jujutsu_kaisen",
    classType: "projectile_control",
    color: "#5c4033",
    health: 1000,
    speed: 6,
    jump: 6,
    maxEnergy: 120,
    energyType: "cursed_energy",
    basic_attacks: attacks(35, 70, 55, 50, 60, 28),
    specials: {
      curse_blast: { damage: 50, cost: 12 },
      curse_missile: { damage: 65, cost: 16 },
      curse_barrage: { damage: 90, cost: 24 }
    }
  }),

  kashimo: makeCharacter({
    name: "Hajime Kashimo",
    universe: "jujutsu_kaisen",
    classType: "balanced",
    color: "#22d3ee",
    health: 1100,
    speed: 9,
    jump: 8,
    maxEnergy: 110,
    energyType: "cursed_energy",
    basic_attacks: attacks(46, 90, 68, 60, 78),
    specials: {
      lightning_staff: { damage: 120, cost: 24 },
      thunder_rush: { damage: 110, cost: 22 }
    }
  }),

  mahoraga: makeCharacter({
    name: "Mahoraga",
    universe: "jujutsu_kaisen",
    classType: "heavy",
    color: "#f1f5f9",
    health: 1800,
    speed: 8,
    jump: 8,
    maxEnergy: 0,
    energyType: null,
    movement: {
      moveMultiplier: 0.96,
      attackSpeedMultiplier: 0.9,
      jumpCount: 2,
      wallJump: false,
      dashTeleport: false
    },
    basic_attacks: attacks(70, 130, 95, 80, 110, 55),
    specials: {},
    passives: {
      adaptive_exorcism: {
        effect: "gains_resistance_to_repeated_attack_types",
        condition: "when_hit_repeatedly"
      },
      summoned_disaster: {
        effect: "super_armor_on_select_heavy_actions",
        condition: "always"
      }
    }
  }),

  // =====================================================
  // DEMON SLAYER
  // =====================================================

  tanjiro: makeCharacter({
    name: "Tanjiro Kamado",
    universe: "demon_slayer",
    classType: "speed_melee",
    color: "#cc0000",
    health: 1100,
    speed: 10,
    jump: 10,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.35, attackSpeedMultiplier: 1.28, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(45, 85, 70, 60, 75),
    specials: {
      water_surface_slasher: { damage: 120, cost: 0 },
      fireflies_dance: { damage: 100, cost: 0 }
    }
  }),

  nezuko: makeCharacter({
    name: "Nezuko Kamado",
    universe: "demon_slayer",
    classType: "speed_melee",
    color: "#ff6699",
    health: 1050,
    speed: 10,
    jump: 10,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.4, attackSpeedMultiplier: 1.3, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(40, 80, 65, 55, 70),
    specials: {
      blood_demon_art: { damage: 140, cost: 0 }
    }
  }),

  zenitsu: makeCharacter({
    name: "Zenitsu Agatsuma",
    universe: "demon_slayer",
    classType: "speed_melee",
    color: "#ffff33",
    health: 1020,
    speed: 11,
    jump: 10,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.5, attackSpeedMultiplier: 1.35, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(50, 90, 70, 60, 80),
    specials: {
      thunder_clap_strike: { damage: 150, cost: 0 }
    }
  }),

  inosuke: makeCharacter({
    name: "Inosuke Hashibira",
    universe: "demon_slayer",
    classType: "speed_melee",
    color: "#94a3b8",
    health: 1120,
    speed: 10,
    jump: 10,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.45, attackSpeedMultiplier: 1.32, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(45, 85, 70, 65, 78),
    specials: {
      beast_breathing: { damage: 135, cost: 0 }
    }
  }),

  rengoku: makeCharacter({
    name: "Kyojuro Rengoku",
    universe: "demon_slayer",
    classType: "speed_melee",
    color: "#fb923c",
    health: 1200,
    speed: 9,
    jump: 9,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.2, attackSpeedMultiplier: 1.22, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(50, 90, 70, 60, 80),
    specials: {
      flame_breathing_first_form: { damage: 150, cost: 0 }
    }
  }),

  akaza: makeCharacter({
    name: "Akaza",
    universe: "demon_slayer",
    classType: "speed_melee",
    color: "#f97316",
    health: 1350,
    speed: 9,
    jump: 9,
    maxEnergy: 0,
    energyType: null,
    movement: { moveMultiplier: 2.25, attackSpeedMultiplier: 1.2, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(50, 100, 75, 70, 90),
    specials: {
      destructive_strike: { damage: 160, cost: 0 }
    }
  }),

  // =====================================================
  // HUNTER X HUNTER
  // =====================================================

  gon: makeCharacter({
    name: "Gon Freecss",
    universe: "hunter_x_hunter",
    classType: "balanced",
    color: "#6cc24a",
    health: 1000,
    speed: 8,
    jump: 8,
    maxEnergy: 100,
    energyType: "nen",
    basic_attacks: attacks(40, 85, 65, 60, 75),
    specials: {
      jajanken_rock: { damage: 120, cost: 20 },
      jajanken_paper: { damage: 90, cost: 25 },
      jajanken_scissors: { damage: 80, cost: 15 }
    }
  }),

  killua: makeCharacter({
    name: "Killua Zoldyck",
    universe: "hunter_x_hunter",
    classType: "speed_melee",
    color: "#60a5fa",
    health: 950,
    speed: 10,
    jump: 9,
    maxEnergy: 100,
    energyType: "nen",
    movement: { moveMultiplier: 2.15, attackSpeedMultiplier: 1.22, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(35, 80, 60, 55, 70),
    specials: {
      thunderbolt: { damage: 90, cost: 25 },
      godspeed_dash: { damage: 80, cost: 20, teleport: true }
    }
  }),

  hisoka: makeCharacter({
    name: "Hisoka",
    universe: "hunter_x_hunter",
    classType: "projectile_control",
    color: "#ec4899",
    health: 900,
    speed: 8,
    jump: 8,
    maxEnergy: 100,
    energyType: "nen",
    basic_attacks: attacks(35, 75, 60, 55, 70),
    specials: {
      bungee_pull: { damage: 60, cost: 20 },
      card_throw: { damage: 65, cost: 15 }
    }
  }),

  kurapika: makeCharacter({
    name: "Kurapika",
    universe: "hunter_x_hunter",
    classType: "projectile_control",
    color: "#facc15",
    health: 950,
    speed: 7,
    jump: 7,
    maxEnergy: 100,
    energyType: "nen",
    basic_attacks: attacks(40, 80, 60, 55, 70),
    specials: {
      chain_jail: { damage: 70, cost: 25 },
      chain_slash: { damage: 80, cost: 20 }
    }
  }),

  netero: makeCharacter({
    name: "Isaac Netero",
    universe: "hunter_x_hunter",
    classType: "heavy",
    color: "#f5f5dc",
    health: 1100,
    speed: 7,
    jump: 7,
    maxEnergy: 100,
    energyType: "nen",
    basic_attacks: attacks(45, 95, 75, 60, 80),
    specials: {
      bodhisattva_slap: { damage: 110, cost: 30 },
      nen_blast: { damage: 75, cost: 20 }
    }
  }),

  meruem: makeCharacter({
    name: "Meruem",
    universe: "hunter_x_hunter",
    classType: "heavy",
    color: "#84cc16",
    health: 1200,
    speed: 8,
    jump: 7,
    maxEnergy: 100,
    energyType: "nen",
    basic_attacks: attacks(50, 100, 80, 65, 85),
    specials: {
      royal_strike: { damage: 95, cost: 20 },
      wing_dash: { damage: 85, cost: 20 }
    }
  }),

  // =====================================================
  // INVINCIBLE
  // =====================================================

  mark: makeCharacter({
    name: "Mark Grayson",
    universe: "invincible",
    classType: "balanced",
    color: "#3b82f6",
    health: 1250,
    speed: 9,
    jump: 9,
    maxEnergy: 120,
    energyType: "viltrumite_power",
    basic_attacks: attacks(48, 92, 70, 62, 82),
    specials: { rush_punch: { damage: 110, cost: 20 } }
  }),

  omniMan: makeCharacter({
    name: "Omni-Man",
    universe: "invincible",
    classType: "heavy",
    color: "#ef4444",
    health: 1450,
    speed: 9,
    jump: 8,
    maxEnergy: 120,
    energyType: "viltrumite_power",
    basic_attacks: attacks(55, 110, 82, 70, 95),
    specials: { world_breaker: { damage: 160, cost: 35 } }
  }),

  atomEve: makeCharacter({
    name: "Atom Eve",
    universe: "invincible",
    classType: "projectile_control",
    color: "#f472b6",
    health: 1000,
    speed: 8,
    jump: 8,
    maxEnergy: 140,
    energyType: "molecular_energy",
    basic_attacks: attacks(40, 80, 60, 55, 70),
    specials: { pink_blast: { damage: 120, cost: 25 } }
  }),

  // =====================================================
  // MARVEL
  // =====================================================

  spiderMan: makeCharacter({
    name: "Spider-Man",
    universe: "marvel",
    classType: "speed_melee",
    color: "#ef4444",
    health: 1050,
    speed: 11,
    jump: 10,
    maxEnergy: 100,
    energyType: "stamina",
    movement: { moveMultiplier: 2.35, attackSpeedMultiplier: 1.28, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(42, 80, 62, 56, 72),
    specials: { web_shot: { damage: 90, cost: 15 } }
  }),

  ironMan: makeCharacter({
    name: "Iron Man",
    universe: "marvel",
    classType: "projectile_control",
    color: "#f59e0b",
    health: 1150,
    speed: 8,
    jump: 8,
    maxEnergy: 150,
    energyType: "arc_energy",
    basic_attacks: attacks(44, 86, 64, 58, 74),
    specials: { repulsor_blast: { damage: 130, cost: 28 } }
  }),

  thor: makeCharacter({
    name: "Thor",
    universe: "marvel",
    classType: "heavy",
    color: "#60a5fa",
    health: 1350,
    speed: 8,
    jump: 8,
    maxEnergy: 150,
    energyType: "god_power",
    basic_attacks: attacks(52, 104, 78, 66, 88),
    specials: { lightning_hammer: { damage: 150, cost: 32 } }
  }),

  hulk: makeCharacter({
    name: "Hulk",
    universe: "marvel",
    classType: "heavy",
    color: "#22c55e",
    health: 1500,
    speed: 7,
    jump: 8,
    maxEnergy: 80,
    energyType: "rage",
    basic_attacks: attacks(55, 115, 85, 72, 98),
    specials: { gamma_slam: { damage: 160, cost: 24 } }
  }),

  // =====================================================
  // DC
  // =====================================================

  superman: makeCharacter({
    name: "Superman",
    universe: "dc",
    classType: "balanced",
    color: "#2563eb",
    health: 1400,
    speed: 10,
    jump: 9,
    maxEnergy: 140,
    energyType: "solar_energy",
    basic_attacks: attacks(52, 100, 75, 68, 90),
    specials: { heat_vision: { damage: 140, cost: 28 } }
  }),

  batman: makeCharacter({
    name: "Batman",
    universe: "dc",
    classType: "balanced",
    color: "#374151",
    health: 1080,
    speed: 9,
    jump: 8,
    maxEnergy: 110,
    energyType: "gadget_energy",
    basic_attacks: attacks(44, 84, 62, 56, 74),
    specials: { batarang: { damage: 90, cost: 14 } }
  }),

  flash: makeCharacter({
    name: "Flash",
    universe: "dc",
    classType: "speed_melee",
    color: "#facc15",
    health: 1000,
    speed: 12,
    jump: 9,
    maxEnergy: 120,
    energyType: "speed_force",
    movement: { moveMultiplier: 2.7, attackSpeedMultiplier: 1.4, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(40, 78, 60, 55, 70),
    specials: { speed_burst: { damage: 120, cost: 24, teleport: true } }
  }),

  wonderWoman: makeCharacter({
    name: "Wonder Woman",
    universe: "dc",
    classType: "balanced",
    color: "#dc2626",
    health: 1250,
    speed: 9,
    jump: 8,
    maxEnergy: 120,
    energyType: "godly_power",
    basic_attacks: attacks(48, 90, 68, 60, 82),
    specials: { lasso_strike: { damage: 115, cost: 22 } }
  }),

  darkseid: makeCharacter({
    name: "Darkseid",
    universe: "dc",
    classType: "heavy",
    color: "#6b7280",
    health: 1550,
    speed: 7,
    jump: 7,
    maxEnergy: 160,
    energyType: "omega_energy",
    basic_attacks: attacks(56, 115, 85, 70, 96),
    specials: { omega_beam: { damage: 170, cost: 40 } }
  }),

  greenLantern: makeCharacter({
    name: "Green Lantern",
    universe: "dc",
    classType: "projectile_control",
    color: "#22c55e",
    health: 1150,
    speed: 8,
    jump: 8,
    maxEnergy: 150,
    energyType: "ring_energy",
    basic_attacks: attacks(44, 84, 62, 56, 74),
    specials: { construct_blast: { damage: 130, cost: 28 } }
  }),

  // =====================================================
  // RICK & MORTY
  // =====================================================

  rick: makeCharacter({
    name: "Rick Sanchez",
    universe: "rick_and_morty",
    classType: "projectile_control",
    color: "#3ddc97",
    health: 1200,
    speed: 9,
    jump: 7,
    maxEnergy: 150,
    energyType: "portal_tech",
    basic_attacks: attacks(50, 90, 70, 60, 80),
    specials: {
      portal_blast: { damage: 140, cost: 30 },
      meeseeks_summon: { damage: 120, cost: 40, summon: true }
    }
  }),

  morty: makeCharacter({
    name: "Morty Smith",
    universe: "rick_and_morty",
    classType: "balanced",
    color: "#fbbf24",
    health: 1000,
    speed: 8,
    jump: 8,
    maxEnergy: 120,
    energyType: "anxiety_power",
    basic_attacks: attacks(40, 70, 60, 50, 65),
    specials: { nerve_strike: { damage: 100, cost: 25 } }
  }),

  evilMorty: makeCharacter({
    name: "Evil Morty",
    universe: "rick_and_morty",
    classType: "projectile_control",
    color: "#64748b",
    health: 1150,
    speed: 9,
    jump: 8,
    maxEnergy: 140,
    energyType: "dark_mastermind",
    basic_attacks: attacks(45, 85, 70, 60, 80),
    specials: { manipulative_blast: { damage: 140, cost: 30 } }
  }),

  rickPrime: makeCharacter({
    name: "Rick Prime",
    universe: "rick_and_morty",
    classType: "projectile_control",
    color: "#f87171",
    health: 1300,
    speed: 10,
    jump: 8,
    maxEnergy: 160,
    energyType: "ultimate_tech",
    basic_attacks: attacks(55, 95, 75, 65, 90),
    specials: { prime_portal_blast: { damage: 160, cost: 35 } }
  }),

  mrMeeseeks: makeCharacter({
    name: "Mr. Meeseeks",
    universe: "rick_and_morty",
    classType: "balanced",
    color: "#38bdf8",
    health: 900,
    speed: 9,
    jump: 8,
    maxEnergy: 80,
    energyType: "existence_energy",
    basic_attacks: attacks(35, 70, 55, 50, 60),
    specials: { help_strike: { damage: 90, cost: 18 } }
  }),

  birdperson: makeCharacter({
    name: "Birdperson",
    universe: "rick_and_morty",
    classType: "balanced",
    color: "#94a3b8",
    health: 1100,
    speed: 9,
    jump: 9,
    maxEnergy: 110,
    energyType: "avian_energy",
    basic_attacks: attacks(44, 84, 64, 58, 76),
    specials: { wing_cut: { damage: 110, cost: 22 } }
  }),

  squanchy: makeCharacter({
    name: "Squanchy",
    universe: "rick_and_morty",
    classType: "heavy",
    color: "#d97706",
    health: 1200,
    speed: 8,
    jump: 7,
    maxEnergy: 100,
    energyType: "squanch_power",
    basic_attacks: attacks(46, 92, 70, 62, 82),
    specials: { squanch_smash: { damage: 120, cost: 24 } }
  }),

  tammy: makeCharacter({
    name: "Tammy Guetermann",
    universe: "rick_and_morty",
    classType: "balanced",
    color: "#e879f9",
    health: 980,
    speed: 8,
    jump: 8,
    maxEnergy: 100,
    energyType: "federation_tech",
    basic_attacks: attacks(38, 74, 58, 52, 68),
    specials: { federation_shot: { damage: 95, cost: 18 } }
  }),

  phoenixperson: makeCharacter({
    name: "Phoenixperson",
    universe: "rick_and_morty",
    classType: "heavy",
    color: "#dc2626",
    health: 1250,
    speed: 8,
    jump: 8,
    maxEnergy: 120,
    energyType: "cyber_energy",
    basic_attacks: attacks(48, 96, 72, 64, 84),
    specials: { flame_dive: { damage: 125, cost: 26 } }
  }),

  unity: makeCharacter({
    name: "Unity",
    universe: "rick_and_morty",
    classType: "projectile_control",
    color: "#06b6d4",
    health: 1020,
    speed: 8,
    jump: 7,
    maxEnergy: 140,
    energyType: "hivemind_power",
    basic_attacks: attacks(40, 78, 60, 55, 70),
    specials: { mind_wave: { damage: 120, cost: 24 } }
  }),

  abradolf: makeCharacter({
    name: "Abradolf Lincler",
    universe: "rick_and_morty",
    classType: "balanced",
    color: "#a3a3a3",
    health: 1080,
    speed: 8,
    jump: 7,
    maxEnergy: 90,
    energyType: "chaos_energy",
    basic_attacks: attacks(42, 80, 62, 56, 74),
    specials: { chaos_burst: { damage: 100, cost: 20 } }
  }),

  // =====================================================
  // SAIKI K
  // =====================================================

  saiki: makeCharacter({
    name: "Kusuo Saiki",
    universe: "saiki_k",
    classType: "projectile_control",
    color: "#a855f7",
    health: 1100,
    speed: 10,
    jump: 9,
    maxEnergy: 200,
    energyType: "psychic_power",
    basic_attacks: attacks(50, 85, 70, 60, 75),
    specials: {
      telekinesis_push: { damage: 120, cost: 35 },
      mind_control: { damage: 0, cost: 50 }
    }
  }),

  nendou: makeCharacter({
    name: "Riki Nendou",
    universe: "saiki_k",
    classType: "heavy",
    color: "#f97316",
    health: 1300,
    speed: 7,
    jump: 7,
    maxEnergy: 0,
    energyType: null,
    basic_attacks: attacks(50, 100, 75, 65, 85),
    specials: {
      idiot_charge: { damage: 120, cost: 0 }
    }
  }),

  // =====================================================
  // BAKI
  // =====================================================

  bakiHanma: makeCharacter({
    name: "Baki Hanma",
    universe: "baki",
    classType: "speed_melee",
    color: "#f97316",
    health: 1180,
    speed: 11,
    jump: 9,
    maxEnergy: 120,
    energyType: "fighting_spirit",
    movement: { moveMultiplier: 2.45, attackSpeedMultiplier: 1.34, jumpCount: 3, wallJump: true, dashTeleport: true },
    basic_attacks: attacks(46, 88, 68, 62, 80, 36),
    specials: {
      demon_back_burst: { damage: 145, cost: 35 },
      cockroach_dash: { damage: 95, cost: 18, teleport: true },
      combo_rush: { damage: 120, cost: 26 }
    },
    passives: {
      adaptive_fighter: { effect: "damage_increases_during_extended_combos", condition: "combo_5_hits" }
    }
  }),

  jackHanma: makeCharacter({
    name: "Jack Hanma",
    universe: "baki",
    classType: "heavy",
    color: "#7c2d12",
    health: 1450,
    speed: 8,
    jump: 7,
    maxEnergy: 100,
    energyType: "adrenaline",
    basic_attacks: attacks(54, 108, 78, 66, 92, 42),
    specials: {
      bite_rush: { damage: 130, cost: 24 },
      steroid_smash: { damage: 155, cost: 30 },
      brutal_tackle: { damage: 110, cost: 20 }
    },
    passives: {
      monstrous_dedication: { effect: "reduced_stagger_and_bonus_damage_below_40_health", condition: "always" }
    }
  }),

  yujiroHanma: makeCharacter({
    name: "Yujiro Hanma",
    universe: "baki",
    classType: "heavy",
    color: "#b91c1c",
    health: 1650,
    speed: 10,
    jump: 9,
    maxEnergy: 160,
    energyType: "demon_power",
    basic_attacks: attacks(62, 125, 90, 75, 100, 48),
    specials: {
      demon_back_pressure: { damage: 170, cost: 30 },
      earthquake_stomp: { damage: 145, cost: 26 },
      predator_rush: { damage: 120, cost: 20 }
    },
    passives: {
      apex_predator: { effect: "intimidation_aura_reduces_enemy_attack", condition: "always" }
    },
    domain: { name: "Ogre's Killing Intent", priority: 2 }
  }),

  hanayama: makeCharacter({
    name: "Kaoru Hanayama",
    universe: "baki",
    classType: "heavy",
    color: "#4b5563",
    health: 1550,
    speed: 7,
    jump: 6,
    maxEnergy: 90,
    energyType: "willpower",
    basic_attacks: attacks(58, 118, 84, 68, 96, 50),
    specials: {
      vice_grip: { damage: 150, cost: 24 },
      yakuza_charge: { damage: 120, cost: 18 },
      standing_blow: { damage: 165, cost: 30 }
    },
    passives: {
      iron_body: { effect: "takes_less_knockback", condition: "always" }
    }
  }),

  biscuitOliva: makeCharacter({
    name: "Biscuit Oliva",
    universe: "baki",
    classType: "heavy",
    color: "#f59e0b",
    health: 1600,
    speed: 8,
    jump: 7,
    maxEnergy: 110,
    energyType: "muscle_power",
    basic_attacks: attacks(56, 115, 82, 68, 94, 46),
    specials: {
      unchained_press: { damage: 155, cost: 28 },
      oliva_ball: { damage: 135, cost: 22 },
      flex_counter: { damage: 110, cost: 20 }
    },
    passives: {
      absolute_mass: { effect: "armor_on_heavy_attacks", condition: "always" }
    }
  }),

  retsuKaioh: makeCharacter({
    name: "Retsu Kaioh",
    universe: "baki",
    classType: "balanced",
    color: "#16a34a",
    health: 1200,
    speed: 9,
    jump: 8,
    maxEnergy: 130,
    energyType: "kenpo",
    basic_attacks: attacks(44, 86, 70, 60, 78, 34),
    specials: {
      kenpo_barrage: { damage: 125, cost: 24 },
      shaori_redirect: { damage: 95, cost: 18 },
      lotus_strike: { damage: 140, cost: 28 }
    },
    passives: {
      martial_mastery: { effect: "bonus_counter_damage", condition: "perfect_timing" }
    }
  }),

  musashiMiyamoto: makeCharacter({
    name: "Musashi Miyamoto",
    universe: "baki",
    classType: "balanced",
    color: "#a16207",
    health: 1320,
    speed: 9,
    jump: 8,
    maxEnergy: 140,
    energyType: "battle_intent",
    basic_attacks: attacks(50, 98, 76, 64, 86, 38),
    specials: {
      void_slash: { damage: 160, cost: 30 },
      iai_cut: { damage: 135, cost: 24 },
      phantom_blade: { damage: 120, cost: 20 }
    },
    passives: {
      sword_sense: { effect: "extended_attack_range", condition: "always" }
    },
    domain: { name: "Field of Slaughter", priority: 2 }
  }),

  pickle: makeCharacter({
    name: "Pickle",
    universe: "baki",
    classType: "heavy",
    color: "#65a30d",
    health: 1700,
    speed: 8,
    jump: 8,
    maxEnergy: 80,
    energyType: "instinct",
    basic_attacks: attacks(60, 122, 88, 72, 102, 52),
    specials: {
      primal_pounce: { damage: 140, cost: 18 },
      savage_bite: { damage: 150, cost: 22 },
      dinosaur_crush: { damage: 175, cost: 30 }
    },
    passives: {
      prehistoric_body: { effect: "health_regen_when_idle_briefly", condition: "2_seconds_no_damage" }
    }
  }),

  // =====================================================
  // CUSTOM
  // =====================================================
 
  omololu: makeCharacter({
    name: "Omololu",
    universe: "other",
    classType: "speed_melee",
    color: "#2f3640",

    health: 300000,
    speed: 10,
    jump: 10,
    maxEnergy: 110,
    energyType: "cursed_energy",

    movement: {
      moveMultiplier: 2.5,
      attackSpeedMultiplier: 1.35,
      jumpCount: 3,
      wallJump: true,
      dashTeleport: true
    },

    w: 60,
    h: 100,
    spriteScale: 1.2,
    spriteOffsetX: -34,
    spriteOffsetY: -28,

    basic_attacks: attacks(43, 84, 66, 60, 76, 36),

    specials: {
      predictive_lock: {
        label: "Predictive Lock",
        damage: 0,
        cost: 18,
        effect: "pattern_read",
        patternStacksMax: 3,
        reactionWindowBonus: 1.2,
        counterDamageBonus: 1.3,
        opponentActionSlow: 0.9
      },

      frame_break: {
        label: "Frame Break",
        damage: 110,
        cost: 18,
        counter: true,
        stun: 22,
        cooldown: 6
      },

      angle_shift: {
        label: "Angle Shift",
        damage: 0,
        cost: 10,
        teleport: true,
        cooldown: 4
      },

      compression_rush: {
        label: "Compression Rush",
        damage: 120,
        cost: 24,
        cooldown: 8
      }
    },

    passives: {
      composed_engine: {
        effect: "consistent_input_performance",
        condition: "always"
      },
      efficiency_over_output: {
        effect: "precision_restores_energy_misses_punished",
        condition: "always"
      },
      silent_pressure: {
        effect: "idle_briefly_buffs_next_attack_speed_and_damage",
        condition: "idle_briefly"
      }
    },

    domain: {
      name: "Calm Presence",
      priority: 3,
      background: "shadow_garden",
      duration: 10
    }
  })
}