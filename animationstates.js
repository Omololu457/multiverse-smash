// animationStates.js
// Animation state machine — maps fighter combat state to animation action names.
// Covers all animation categories from the roadmap:
// movement, combat, defense/damage, abilities, advanced movement, status effects,
// universe-specific, match flow.
//
// Usage: import getAnimationState, then call it each frame per fighter.
// Returns the action key to pass to animationProfile.getAction().

// ─────────────────────────────────────────────────────────────────
// STATE PRIORITY ORDER (higher = overrides lower)
// ─────────────────────────────────────────────────────────────────
const PRIORITY = {
  // Locked states — cannot be overridden mid-animation
  ultimate_cinematic: 100,
  transformation_start: 95,
  transformation_mid:   94,
  transformation_complete: 93,
  domain:               92,
  // Active combat
  hurt_heavy:           80,
  knockback_air:        79,
  knockdown_hard:       78,
  wall_splat:           77,
  guard_break:          76,
  stunned_loop:         75,
  // Ability states
  ultimate_start:       70,
  ultimate_active:      69,
  ultimate_end:         68,
  ability_1_start:      65,
  ability_1_active:     64,
  ability_1_recovery:   63,
  ability_2_start:      62,
  ability_2_active:     61,
  ability_2_recovery:   60,
  ability_3_start:      58,
  ability_3_active:     57,
  ability_3_recovery:   56,
  // Standard combat
  launcher_attack:      55,
  heavy_attack_active:  54,
  heavy_attack_start:   53,
  heavy_attack_recovery:52,
  air_down_attack:      51,
  air_heavy:            50,
  air_launcher:         49,
  sweep_attack:         48,
  dash_attack:          47,
  light_attack_3:       45,
  light_attack_2:       44,
  light_attack_1:       43,
  air_light:            42,
  // Defense
  parry:                40,
  block_hit_heavy:      38,
  block_hit_light:      37,
  block_idle:           36,
  block_start:          35,
  // Hurt / damage
  hurt_light_front:     30,
  hurt_light_back:      29,
  air_hit_recoil:       28,
  knockdown_soft:       27,
  ground_bounce:        26,
  knockback_ground:     25,
  get_up_quick:         24,
  get_up_slow:          23,
  // Advanced movement
  tech_roll_forward:    20,
  tech_roll_backward:   19,
  wall_bounce_recoil:   18,
  air_dash_forward:     17,
  air_dash_backward:    16,
  double_jump_start:    15,
  double_jump_air:      14,
  fall_fast:            13,
  // Movement
  dash_forward:         10,
  dash_backward:        9,
  dash_stop:            8,
  jump_rise:            7,
  jump_peak:            6,
  jump_fall:            5,
  jump_start:           4,
  jump_land:            3,
  run:                  2,
  walk_forward:         1,
  walk_backward:        1,
  crouch_move:          1,
  crouch_idle:          1,
  // Default
  idle:                 0,
  idle_breathing:       0,
  // Match flow
  low_health_idle:      0,
  win_pose_1:           0,
  win_loop:             0,
  lose_fall:            0,
  lose_idle:            0,
}

// ─────────────────────────────────────────────────────────────────
// LOCKED STATES — animation must complete before switching away
// ─────────────────────────────────────────────────────────────────
const LOCKED_STATES = new Set([
  "ultimate_cinematic", "ultimate_start",
  "transformation_start", "transformation_mid", "transformation_complete",
  "domain",
  "get_up_quick", "get_up_slow",
  "tech_roll_forward", "tech_roll_backward",
  "parry",
  "guard_break",
  "wall_splat",
  "jump_land",
])

// ─────────────────────────────────────────────────────────────────
// UNIVERSE-SPECIFIC ABILITY OVERRIDES
// Maps rosterKey to ability action names.
// When these moves are active as `fighter.currentMove`, we look here first.
// ─────────────────────────────────────────────────────────────────
const UNIVERSE_MOVE_MAP = {
  // Dragon Ball
  goku: {
    dragonFist:  "ability_1_active",
    kamehameha:  "ability_2_active",
    transform:   "transformation_start",
    ultimate:    "ultimate_start",
  },
  vegeta: {
    galickGun:     "ability_1_active",
    finalFlash:    "ability_2_active",
    bigBangAttack: "ability_3_active",
    ultimate:      "ultimate_start",
  },
  piccolo: {
    specialBeamCannon: "ability_1_active",
    hellzoneGrenade:   "ability_2_active",
    ultimate:          "ultimate_start",
  },
  frieza: {
    deathBeam:         "ability_1_active",
    novaStrike:        "ability_2_active",
    ultimateDeathBall: "ability_3_active",
    ultimate:          "ultimate_start",
  },
  cell: {
    kamehameha:      "ability_1_active",
    solarKamehameha: "ability_2_active",
    ultimate:        "ultimate_start",
  },
  // Naruto
  naruto: {
    rasengan:        "ability_1_active",
    shadowCloneBlast:"ability_2_active",
    ultimate:        "ultimate_start",
  },
  // JJK
  gojo: {
    blue:          "ability_1_active",
    red:           "ability_2_active",
    hollowPurple:  "ability_3_active",
    ultimate:      "ultimate_start",
  },
  megumi: {
    divineDogs:    "summon_cast",
    nue:           "summon_cast",
    toad:          "summon_cast",
    rabbitEscape:  "summon_cast",
    maxElephant:   "summon_cast",
    ultimate:      "ultimate_start",
  },
  sukuna: {
    cleave:    "ability_1_active",
    dismantle: "ability_2_active",
    ultimate:  "ultimate_start",
  },
  omololu: {
    analysisStrike: "ability_1_active",
    ultimate:       "ultimate_start",
  },
  toji: {
    inventorySmash: "ability_1_active",
    rapidStrike:    "ability_2_active",
    ultimate:       "ultimate_start",
  },
  // Demon Slayer
  tanjiro: {
    waterSurfaceSlasher:  "sword_combo_chain",
    danceOfTheFireflies:  "ability_2_active",
    ultimate:             "ultimate_start",
  },
  nezuko: {
    bloodDemonArt: "ability_1_active",
    ultimate:      "ultimate_start",
  },
  zenitsu: {
    thunderClapStrike: "zenitsu_thunder_dash",
    ultimate:          "ultimate_start",
  },
  inosuke: {
    dualSwordFrenzy: "inosuke_beast_stance",
    ultimate:        "ultimate_start",
  },
  rengoku: {
    flameBreathingFirstForm: "rengoku_flame_charge",
    ultimate:                "ultimate_start",
  },
  akaza: {
    destructiveStrike: "akaza_compass_activation",
    ultimate:          "ultimate_start",
  },
  // Rick & Morty
  rick: {
    portalBlast:    "portal_fire",
    meeseeksSummon: "summon_cast",
    ultimate:       "ultimate_start",
  },
  morty: {
    nerveStrike: "ability_1_active",
    ultimate:    "ultimate_start",
  },
  evilMorty: {
    manipulativeBlast: "ability_1_active",
    ultimate:          "ultimate_start",
  },
  rickPrime: {
    primePortalBlast: "portal_fire",
    ultimate:         "ultimate_start",
  },
}

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT — getAnimationState(fighter)
// Returns the animation action key that should play this frame.
// ─────────────────────────────────────────────────────────────────
export function getAnimationState(fighter) {
  if (!fighter) return "idle"

  const key = (fighter.rosterKey || fighter.id || "").toLowerCase()

  // ── 1. LOCKED STATE — don't switch mid-animation ──────────────
  if (fighter._lockedAnimState && LOCKED_STATES.has(fighter._lockedAnimState)) {
    return fighter._lockedAnimState
  }

  // ── 2. HITSTOP — freeze current frame ─────────────────────────
  if ((fighter.hitstop || 0) > 0) {
    return fighter._lastAnimState || "idle"
  }

  // ── 3. KNOCKDOWN / WAKE-UP ────────────────────────────────────
  if (fighter.knockdownState) {
    if ((fighter.knockdownTimer || 0) > 12) return "knockdown_hard"
    if (fighter._techDash > 0) {
      return fighter.facing === 1 ? "tech_roll_forward" : "tech_roll_backward"
    }
    return "get_up_quick"
  }

  // ── 4. HURT / HITSTUN ─────────────────────────────────────────
  if ((fighter.hitstun || 0) > 0) {
    if (!fighter.onGround) return "air_hit_recoil"
    if ((fighter.colorFlash || 0) > 8) return "hurt_heavy"
    return "hurt_light_front"
  }

  // ── 5. STUNNED ────────────────────────────────────────────────
  if ((fighter.stun || 0) > 0) return "stunned_loop"

  // ── 6. PARRY FLASH ───────────────────────────────────────────
  if ((fighter.parryFlash || 0) > 0) return "parry"

  // ── 7. BLOCKING ──────────────────────────────────────────────
  if (fighter.isBlocking) {
    if ((fighter.blockstun || 0) > 6) return "block_hit_heavy"
    if ((fighter.blockstun || 0) > 0) return "block_hit_light"
    return "block_idle"
  }

  // ── 8. ACTIVE ATTACK — map to animation ──────────────────────
  if (fighter.attacking && fighter.currentMove) {
    const move = fighter.currentMove
    // Check universe-specific map first
    const uMap = UNIVERSE_MOVE_MAP[key] || {}
    if (uMap[move]) return uMap[move]

    // Generic attack mapping
    switch (move) {
      case "light":    return "light_attack_1"
      case "heavy":    return "heavy_attack_active"
      case "up":       return "launcher_attack"
      case "air":      return "air_light"
      case "down_air": return "air_down_attack"
      case "grab":     return "light_attack_2"
      default:         return "ability_1_active"
    }
  }

  // ── 9. ULTIMATE ACTIVE ────────────────────────────────────────
  if (fighter.isUltimateActive) return "power_up_loop"

  // ── 10. TRANSFORMATION ───────────────────────────────────────
  if (fighter.teleportFlash > 10) return "transformation_start"

  // ── 11. AIR STATES ───────────────────────────────────────────
  if (!fighter.onGround && !fighter.grounded) {
    if (fighter.airDashing) {
      return (fighter.vx || 0) * (fighter.facing || 1) > 0 ? "air_dash_forward" : "air_dash_backward"
    }
    if ((fighter.vy || 0) < -2) return "jump_rise"
    if (Math.abs(fighter.vy || 0) < 2) return "jump_peak"
    if ((fighter.vy || 0) > 8) return "fall_fast"
    return "jump_fall"
  }

  // ── 12. GROUNDED MOVEMENT ────────────────────────────────────
  const speed = Math.abs(fighter.vx || 0)

  if ((fighter.dashTimer || 0) > 0) {
    return (fighter.vx || 0) * (fighter.facing || 1) > 0 ? "dash_forward" : "dash_backward"
  }

  if (speed > 10) return "run"

  if (speed > 0.5) {
    return (fighter.vx || 0) * (fighter.facing || 1) > 0 ? "walk_forward" : "walk_backward"
  }

  // ── 13. DOMAIN ACTIVE ────────────────────────────────────────
  if (fighter.domainBuff) return "ki_aura_idle"

  // ── 14. LOW HEALTH IDLE ──────────────────────────────────────
  const hpRatio = (fighter.health || 0) / Math.max(1, fighter.maxHealth || 1)
  if (hpRatio < 0.2) return "low_health_idle"

  // ── 15. DEFAULT IDLE ─────────────────────────────────────────
  return "idle"
}

// ─────────────────────────────────────────────────────────────────
// STATE TRANSITION TRACKER
// Call this once per frame to update fighter._lastAnimState and
// handle locked state expiry.
// ─────────────────────────────────────────────────────────────────
export function updateAnimationState(fighter, spriteHandler) {
  if (!fighter) return

  const nextState = getAnimationState(fighter)

  // If we're in a locked state, check if the animation has finished
  if (fighter._lockedAnimState && LOCKED_STATES.has(fighter._lockedAnimState)) {
    if (spriteHandler?.isFinished()) {
      fighter._lockedAnimState = null
    } else {
      return  // stay locked
    }
  }

  // Lock certain states on entry
  if (nextState !== fighter._lastAnimState && LOCKED_STATES.has(nextState)) {
    fighter._lockedAnimState = nextState
  }

  fighter._lastAnimState = nextState
}

// ─────────────────────────────────────────────────────────────────
// ACTION ALIASES
// Some animation profiles use different naming conventions.
// This normalizes between the state machine and profile action names.
// ─────────────────────────────────────────────────────────────────
export const ACTION_ALIASES = {
  // State name → profile action key
  "light_attack_1":       "light",
  "light_attack_2":       "light",
  "light_attack_3":       "light",
  "heavy_attack_start":   "heavy",
  "heavy_attack_active":  "heavy",
  "heavy_attack_recovery":"heavy",
  "launcher_attack":      "up",
  "sweep_attack":         "heavy",
  "dash_attack":          "light",
  "air_light":            "air",
  "air_heavy":            "heavy",
  "air_launcher":         "up",
  "air_down_attack":      "down_air",
  "air_hit_recoil":       "hurt",
  "hurt_light_front":     "hurt",
  "hurt_light_back":      "hurt",
  "hurt_heavy":           "hurt",
  "guard_break":          "hurt",
  "knockback_air":        "hurt",
  "knockback_ground":     "hurt",
  "wall_splat":           "hurt",
  "knockdown_hard":       "hurt",
  "knockdown_soft":       "hurt",
  "ground_bounce":        "hurt",
  "get_up_quick":         "idle",
  "get_up_slow":          "idle",
  "block_start":          "block",
  "block_idle":           "block",
  "block_hit_light":      "block",
  "block_hit_heavy":      "block",
  "parry":                "light",
  "tech_roll_forward":    "dash",
  "tech_roll_backward":   "dash",
  "air_dash_forward":     "dash",
  "air_dash_backward":    "dash",
  "wall_bounce_recoil":   "hurt",
  "double_jump_start":    "jump",
  "double_jump_air":      "jump",
  "fall_fast":            "fall",
  "jump_start":           "jump",
  "jump_rise":            "jump",
  "jump_peak":            "jump",
  "jump_fall":            "fall",
  "jump_land":            "jump",
  "stunned_loop":         "hurt",
  "power_up_loop":        "idle",
  "ki_aura_idle":         "idle",
  "low_health_idle":      "idle",
  "win_pose_1":           "win",
  "win_pose_2":           "win",
  "win_loop":             "win",
  "lose_fall":            "lose",
  "lose_idle":            "lose",
  "transformation_start": "transform",
  "transformation_mid":   "transform",
  "transformation_complete":"transform",
  "ability_1_start":      "special_1",
  "ability_1_active":     "special_1",
  "ability_1_recovery":   "special_1",
  "ability_2_start":      "special_2",
  "ability_2_active":     "special_2",
  "ability_2_recovery":   "special_2",
  "ability_3_start":      "special_3",
  "ability_3_active":     "special_3",
  "ability_3_recovery":   "special_3",
  "ultimate_start":       "ultimate",
  "ultimate_cinematic":   "ultimate",
  "ultimate_active":      "ultimate",
  "ultimate_end":         "ultimate",
  "summon_cast":          "summon",
  "summon_start":         "summon",
  "domain":               "domain",
  // Universe-specific
  "sword_combo_chain":    "special_1",
  "sword_finisher":       "special_1",
  "zenitsu_thunder_dash": "special_1",
  "inosuke_beast_stance": "special_1",
  "rengoku_flame_charge": "special_1",
  "portal_fire":          "special_1",
  "akaza_compass_activation": "special_1",
  "run":                  "run",
  "walk_forward":         "walk",
  "walk_backward":        "walk",
  "dash_forward":         "dash",
  "dash_backward":        "dash",
  "dash_stop":            "idle",
  "crouch_idle":          "idle",
  "crouch_move":          "walk",
}

/**
 * Resolve a state name to the profile action key.
 * Falls back to the state name itself if no alias exists.
 */
export function resolveActionKey(stateName) {
  return ACTION_ALIASES[stateName] || stateName
}

// ─────────────────────────────────────────────────────────────────
// EXPORTED STATE SETS for external checks
// ─────────────────────────────────────────────────────────────────
export const AIRBORNE_STATES = new Set([
  "jump_start","jump_rise","jump_peak","jump_fall","fall_fast",
  "air_light","air_heavy","air_down_attack","air_hit_recoil",
  "air_dash_forward","air_dash_backward","double_jump_start","double_jump_air",
  "knockback_air","wall_bounce_recoil"
])

export const HURT_STATES = new Set([
  "hurt_light_front","hurt_light_back","hurt_heavy","air_hit_recoil",
  "knockback_air","knockback_ground","wall_splat","knockdown_hard",
  "knockdown_soft","ground_bounce","guard_break","stunned_loop"
])

export const ATTACK_STATES = new Set([
  "light_attack_1","light_attack_2","light_attack_3",
  "heavy_attack_start","heavy_attack_active","heavy_attack_recovery",
  "launcher_attack","sweep_attack","dash_attack",
  "air_light","air_heavy","air_launcher","air_down_attack",
  "ability_1_start","ability_1_active","ability_1_recovery",
  "ability_2_start","ability_2_active","ability_2_recovery",
  "ability_3_start","ability_3_active","ability_3_recovery",
  "ultimate_start","ultimate_active","ultimate_end","ultimate_cinematic"
])
