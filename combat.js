/**
 * COMBAT ENGINE — merged clean version
 * Features:
 * - hitstop scaling
 * - parry
 * - clash
 * - grab / throw
 * - super armor flashes
 * - chip damage
 * - wall bounce flag
 * - damage number emission
 * - projectile hit resolution
 */

import { physics } from "./physics.js"
import { sound, SFX } from "./sound.js"

// ========================
// HITSTOP TABLES
// ========================

const HITSTOP = {
  light: 4,
  air: 4,
  grab: 6,
  heavy: 8,
  launcher: 8,
  spike: 8,
  special: 12,
  ultimate: 20,
  parry: 14,
  clash: 14,
  default: 4
}

// ========================
// HITSTUN / COMBO TUNING
// ========================
// Hitstun is the action-lock the DEFENDER suffers after being hit, letting the
// attacker link follow-ups into a combo. Per-move base durations live in each
// fighter's basic_attacks/specials data (heavier moves = longer stun, so it's
// already tied to attack strength). HITSTUN_SCALE is a single global knob to
// tune combo-ability across the whole game without editing every move.
// (Combo damage falloff is handled by getComboScale; blockstun + the
// charging-can't-defend rule are handled in resolveAttackHit / game.js.)
const HITSTUN_SCALE = 1.15   // MK12-style flow: links connect without frame-perfect timing (falloff via getComboScale keeps it safe)

// GLOBAL PACING (Task 1): single lever to slow matches down. Matches were ending
// in 2-3 hits; every point of dealt damage (melee, projectile, throw) is scaled
// by this one constant so RELATIVE balance between characters is untouched —
// it's mathematically identical to raising everyone's health by 1/scale, but in
// one place instead of 45 maxHealth edits. 0.60 ≈ +66% time-to-kill. Tune here.
const GLOBAL_DAMAGE_SCALE = 0.60

// ========================
// HELPERS
// ========================

function _catFromName(n) {
  n = (n || "").toLowerCase()
  if (n === "light" || n === "air") return "light"
  if (n === "heavy") return "heavy"
  if (n === "up" || n.includes("launch")) return "launcher"
  if (n === "down_air" || n.includes("spike")) return "spike"
  if (n === "grab") return "grab"
  return "light"
}

function _dur(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)))
}

function _getMD(fighter, key) {
  const b = fighter?.basic_attacks || {}
  // Accepts both the canonical schema (characters.js: light/heavy/upAttack/…)
  // and the legacy `*_attack` naming used by data-driven roster entries, so no
  // data source can silently whiff an attack by using the wrong key spelling.
  switch (key) {
    case "light": return b.light || b.light_attack || null
    case "heavy": return b.heavy || b.heavy_attack || null
    case "up": return b.upAttack || b.up || b.up_attack || null
    case "air": return b.airAttack || b.air || b.air_attack || null
    case "down_air": return b.downAir || b.down_air || b.downAir_attack || null
    case "grab": return b.grab || { damage: 30, hitstun: 18, throwForceX: 5, throwForceY: -4 }
    default: return b[key] || fighter?.specials?.[key] || { damage: 40, hitstun: 20 }
  }
}

function _hitSound(atk, blocking) {
  if (blocking) return SFX?.BLOCK || "block"
  if (!atk) return SFX?.HIT_LIGHT || "hit_light"
  if (atk.isUltimate) return SFX?.HIT_ULTIMATE || "hit_ultimate"
  if (atk.isSpecial) return SFX?.HIT_SPECIAL || "hit_special"

  const c = atk.category || _catFromName(atk.name)
  if (c === "heavy" || c === "launcher" || c === "spike") {
    return SFX?.HIT_HEAVY || "hit_heavy"
  }
  return SFX?.HIT_LIGHT || "hit_light"
}

// ========================
// STATE INIT
// ========================

export function ensureCombatState(fighter) {
  if (!fighter) return

  const D = {
    attacking: false,
    currentMove: null,
    currentMoveData: null,
    currentAttack: null,
    moveTimer: 0,
    movePhase: "idle",
    hasHitThisMove: false,
    attackCooldown: 0,
    hitstun: 0,
    blockstun: 0,
    hitstop: 0,
    isGrabbed: false,
    invulnTimer: 0,
    comboCounter: 0,
    comboTimer: 0,
    airHits: 0,
    maxAirHits: 3,
    colorFlash: 0,
    attackMultiplier: 1,
    damageMultiplier: 1,
    defenseMultiplier: 1,
    energy: 0,
    maxEnergy: 100,
    wasInStartup: false,
    grabTimer: 0,
    grabInputBuffer: 0,
    knockdownState: false,
    knockdownTimer: 0,
    techRoll: null,
    wallBounce: false,
    parryFlash: 0,
    armorFlash: 0,
    clashFlash: 0,
    _parryInputBuffer: 0
  }

  for (const k in D) {
    if (fighter[k] == null) fighter[k] = D[k]
  }
}

// ========================
// COMBO SCALE
// ========================

export function getComboScale(fighter) {
  if (!fighter || fighter.comboCounter <= 1) return 1
  const s = [1, 0.92, 0.84, 0.76, 0.70, 0.65]
  return s[Math.min(fighter.comboCounter - 1, s.length - 1)]
}

// ========================
// ATTACK PHASE
// ========================

export function getHitstopFrames(atk) {
  if (!atk) return HITSTOP.default
  if (atk.isUltimate) return HITSTOP.ultimate
  if (atk.isSpecial) return HITSTOP.special

  const c = atk.category || _catFromName(atk.name)
  return HITSTOP[c] ?? HITSTOP.default
}

export function getSparkCategory(atk) {
  if (!atk) return "light"
  if (atk.isUltimate) return "ultimate"
  if (atk.isSpecial) return "special"

  const c = atk.category || _catFromName(atk.name)
  if (c === "heavy" || c === "launcher" || c === "spike") return "heavy"
  return "light"
}

export function attackIsActive(attack) {
  if (!attack) return false
  const e = attack.total - attack.timer
  return e >= attack.activeStart && e <= attack.activeEnd
}

export function getAttackPhase(fighter) {
  if (!fighter?.currentAttack) return "idle"
  const a = fighter.currentAttack
  const e = a.total - a.timer
  if (e < a.activeStart) return "startup"
  if (e <= a.activeEnd) return "active"
  return "recovery"
}

// ========================
// HITBOX / HURTBOX
// ========================

export function getAttackHitbox(fighter) {
  const a = fighter?.currentAttack
  if (!fighter || !a) return null

  let w = a.rangeX || 50
  let h = a.rangeY || 40
  let x = fighter.facing === 1 ? fighter.x + fighter.w : fighter.x - w
  let y = fighter.y + 20

  if (a.name === "up") {
    y = fighter.y - 30
  } else if (a.name === "down_air") {
    y = fighter.y + 30
  } else if (a.name === "air") {
    // Air normals use a forgiving bubble: a behind-margin + the attacker's body +
    // full forward reach, and extended ABOVE — so air combos connect whether the
    // juggled enemy is in front of or stacked above the attacker.
    const behind = 16
    const reach  = a.rangeX || 60
    w = behind + fighter.w + reach
    h = (a.rangeY || 40) + 45
    x = fighter.facing === 1 ? fighter.x - behind : fighter.x + fighter.w + behind - w
    y = fighter.y - 25
  }

  return { x, y, w, h }
}

export function getHurtbox(fighter) {
  if (!fighter) return null
  return {
    x: fighter.x + 6,
    y: fighter.y + 6,
    w: Math.max(1, fighter.w - 12),
    h: Math.max(1, fighter.h - 6)
  }
}

export function rectsOverlap(a, b) {
  return !!a && !!b &&
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
}

// ========================
// SPECIAL TRAITS
// ========================

export function shouldGojoAutoDodge(defender) {
  // Auto-dodge when the active FORM grants it (Ultra Instinct / Unlimited Void)
  // OR when Gojo's player-toggled Infinity is ON. Either way it costs ki per
  // dodge; if too low to pay, the hit lands (and the passive drain will drop
  // Infinity at 0 energy — see applyGojoPassiveSystems).
  const infinityOn = (defender?.rosterKey || "").toLowerCase() === "gojo" && !!defender?.infinityActive
  if (!defender?.currentFormData?.autoDodge && !infinityOn) return false
  const c = defender.currentFormData?.autoDodgeKiCost || 5
  if ((defender.energy || 0) < c) return false
  defender.energy -= c
  defender.teleportFlash = 8
  return true
}

export function applyUltraEgoReaction(defender) {
  if (!defender?.currentFormData?.rageHealOnHit) return
  const c = defender.currentFormData.healCostPerHitKi || 4
  if ((defender.energy || 0) < c) return
  defender.energy -= c
  defender.health = Math.min(
    defender.maxHealth || 1000,
    defender.health + defender.currentFormData.rageHealOnHit
  )
}

// Kurama Shroud Intensify comeback (combo #23) — SAME SHAPE as applyUltraEgoReaction's
// rage-heal, reskinned: at deep shroud stages Naruto draws Kurama's chakra to knit his
// wounds, healing a little WHEN HIT (deeper stage = more). Health-gated via the passive
// fighter.shroudStage (set in game.applyKuramaShroudSystem) and FREE — the shroud costs
// no ki/chakra. Guarded so a KO blow is never undone. Stages 1-2 give no heal (visual only).
export function applyKuramaShroudReaction(defender) {
  const stage = defender?.shroudStage || 0
  if (stage < 3) return                      // buff unlocks at stage 3
  if ((defender.health || 0) <= 0) return    // don't resurrect from a killing blow
  const heal = (stage - 2) * 6               // stage 3→+6, 4→+12, 5→+18 HP per hit taken
  defender.health = Math.min(defender.maxHealth || 1000, (defender.health || 0) + heal)
}

// NARUTO-ONLY escalated combo-finisher recoil. When a real combo string against Naruto is
// capped by a heavy / launcher / special hit, show his naruto_kcm_knocked_out_a burst pose
// (routed through sprite.js's "knockdown" action) for the recoil instead of the standard
// naruto_kcm_taking_damage flinch — selling "that combo really landed". PURELY VISUAL: it
// only sets a self-timer (_comboFinisherReactTimer) read by sprite.js; it does NOT touch
// knockdownState / tech / hitstun / combo counters / damage. No-op for every other character.
// Called from resolveAttackHit AFTER attacker.comboCounter has been incremented for this hit,
// so `comboCounter >= NARUTO_COMBO_FINISHER_MIN` means this is the Nth+ hit of an active string.
const NARUTO_COMBO_FINISHER_MIN    = 3    // this hit must be the 3rd+ link (a real combo, not a poke)
const NARUTO_COMBO_FINISHER_FRAMES = 26   // recoil-pose window (~5 of the 6 burst frames)
export function applyNarutoComboFinisherReaction(defender, attacker) {
  if (!defender || defender.rosterKey !== "naruto") return
  if ((attacker?.comboCounter || 0) < NARUTO_COMBO_FINISHER_MIN) return   // not (yet) a combo
  const a = attacker.currentAttack
  if (!a) return
  // "Combo-ending" class of hit: a heavy, an up-launcher, a special/ultimate, or any strong
  // blow-away (the hits that actually cap a string) — NOT the light jabs that link into it.
  const finisher = a.name === "heavy" || a.launcher || a.isSpecial || a.isUltimate ||
    Math.abs(a.pushX || 0) >= 8
  if (!finisher) return
  defender._comboFinisherReactTimer = NARUTO_COMBO_FINISHER_FRAMES
}

// ========================
// PARRY / CLASH / GRAB
// ========================

export function checkParry(defender, attacker, hitSparks) {
  if (!defender || !attacker || !attacker.currentAttack) return false
  if (getAttackPhase(attacker) !== "startup") return false
  if (attacker.currentAttack.timer > 5) return false
  if (!(defender._parryInputBuffer > 0)) return false

  attacker.hitstun = 28
  attacker.vx = -attacker.facing * 6
  attacker.attacking = false
  attacker.currentAttack = null

  defender.parryFlash = 12
  defender.invulnTimer = 10
  defender.attackCooldown = 0

  const mx = ((attacker.x + attacker.w / 2) + (defender.x + defender.w / 2)) / 2
  const my = ((attacker.y + attacker.h / 2) + (defender.y + defender.h / 2)) / 2

  if (Array.isArray(hitSparks)) {
    hitSparks.push({
      x: mx,
      y: my,
      timer: 20,
      maxTimer: 20,
      category: "parry",
      color: "#38bdf8",
      lines: 12,
      radius: 32
    })
  }

  try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
  return true
}

export function checkClash(p1, p2, hitSparks, camera) {
  if (!p1 || !p2) return false
  if (!attackIsActive(p1.currentAttack) || !attackIsActive(p2.currentAttack)) return false

  const h1 = getAttackHitbox(p1)
  const h2 = getAttackHitbox(p2)
  if (!rectsOverlap(h1, h2)) return false

  const c1 = p1.currentAttack.isUltimate ? "ultimate"
    : p1.currentAttack.isSpecial ? "special"
    : (p1.currentAttack.category || "light")

  const c2 = p2.currentAttack.isUltimate ? "ultimate"
    : p2.currentAttack.isSpecial ? "special"
    : (p2.currentAttack.category || "light")

  const s1 = c1 === "special" || c1 === "ultimate"
  const s2 = c2 === "special" || c2 === "ultimate"

  const hs = HITSTOP.clash

  if (s1 && !s2) {
    p2.hitstun = 14
    p2.vx = -p2.facing * 4
    p2.hitstop = hs
    p2.attacking = false
    p2.currentAttack = null
    p2.clashFlash = 10
  } else if (s2 && !s1) {
    p1.hitstun = 14
    p1.vx = -p1.facing * 4
    p1.hitstop = hs
    p1.attacking = false
    p1.currentAttack = null
    p1.clashFlash = 10
  } else {
    for (const f of [p1, p2]) {
      f.vx = -f.facing * 4
      f.hitstop = hs
      f.attacking = false
      f.currentAttack = null
      f.clashFlash = 10
    }
  }

  const mx = ((p1.x + p1.w / 2) + (p2.x + p2.w / 2)) / 2
  const my = ((p1.y + p1.h / 2) + (p2.y + p2.h / 2)) / 2

  if (Array.isArray(hitSparks)) {
    hitSparks.push({
      x: mx,
      y: my,
      timer: 25,
      maxTimer: 25,
      category: "clash",
      color: "#ffffff",
      lines: 20,
      radius: 48
    })
  }

  try { camera?.shake?.(12, 10) } catch (_) {}
  return true
}

export function resolveGrab(attacker, defender, context = {}, range = 75) {
  if (!attacker || !defender) return false
  if (!attacker.onGround || !defender.onGround) return false
  if (attacker.comboCounter > 0) return false

  const aCX = attacker.x + attacker.w / 2
  const dCX = defender.x + defender.w / 2
  // `range` defaults to the standard 75px reach; extended-reach grabs (e.g. Naruto's
  // shroud-gated Chakra Arm Grab) pass a larger value. Everything else — tech window,
  // grab state, and the updateGrab() pop-up-and-drop throw — is shared unchanged.
  if (Math.abs(aCX - dCX) > range) return false

  const canTech = !(defender.hitstun > 0 || defender.blockstun > 0)
  if (canTech && (defender.grabInputBuffer || 0) > 0) {
    attacker.attackCooldown = 18
    defender.attackCooldown = 18
    attacker.vx = -attacker.facing * 3
    defender.vx = attacker.facing * 3
    return false
  }

  defender.isGrabbed = true
  defender.grabTimer = 28
  defender.hitstun = 28
  defender.vx = 0
  defender.vy = 0
  defender.colorFlash = 4

  attacker.attacking = false
  attacker.currentAttack = null
  attacker.attackCooldown = 28
  return true
}

export function updateGrab(attacker, defender) {
  if (!defender?.isGrabbed) return

  defender.vx = 0
  defender.vy = 0
  defender.grabTimer--

  if (defender.grabTimer <= 0) {
    defender.isGrabbed = false
    defender.vy = -14
    defender.vx = (attacker?.facing || 1) * 9
    defender.onGround = false
    defender.isLaunched = true
    defender.health = Math.max(0, (defender.health || 0) - Math.floor(90 * GLOBAL_DAMAGE_SCALE))
    defender.hitstun = 20
    defender.colorFlash = 8

    try { sound?.play?.(SFX?.HIT_HEAVY) } catch (_) {}
    if (defender.health <= 0) {
      try { sound?.play?.(SFX?.KO) } catch (_) {}
    }
  }
}

// ========================
// MOVE START
// ========================

export function startMove(fighter, moveKey, moveData) {
  if (!fighter || !moveData) return false
  if (fighter.attacking || fighter.hitstun > 0 || fighter.attackCooldown > 0) return false

  const st = moveData.startup || 5
  const ac = moveData.active || 4
  const rc = moveData.recovery || 10
  const total = _dur(st + ac + rc, fighter)

  // Launchers (up attacks) get a more generous hitbox so they're not
  // pixel-precise: wider reach and a taller box that also catches an enemy who
  // is already slightly airborne — this is what makes the air combo reliable.
  const isLauncher = moveKey === "up"

  fighter.attacking = true
  fighter.currentAttack = {
    name: moveKey,
    category: moveData.category || _catFromName(moveKey),
    damage: moveData.damage || 40,
    total,
    timer: total,
    activeStart: st,
    activeEnd: st + ac,
    rangeX: moveData.rangeX || (isLauncher ? 95 : 60),
    rangeY: moveData.rangeY || (isLauncher ? 80 : 40),
    hitstun: moveData.hitstun || 15,
    pushX: moveData.knockbackX || 4,
    launchY: moveData.knockbackY ?? -2,
    launcher: moveKey === "up",
    spike: moveKey === "down_air",
    superArmor: !!moveData.superArmor,
    isSpecial: !!moveData.isSpecial,
    isUltimate: !!moveData.isUltimate,
    hasHit: false
  }

  fighter.wasInStartup = true
  return true
}

// ========================
// HIT RESOLUTION
// ========================

export function resolveAttackHit(attacker, defender, hitEffects = null, options = {}) {
  const { stageWidth = 3200, damageNumbers = null } = options

  if (!attacker?.currentAttack || attacker.currentAttack.hasHit) return
  if (!attackIsActive(attacker.currentAttack)) return

  if (checkParry(defender, attacker, hitEffects)) return

  const hitbox = getAttackHitbox(attacker)
  const hurtbox = getHurtbox(defender)
  if (!rectsOverlap(hitbox, hurtbox)) return

  // Task 4: inside Sukuna's Malevolent Shrine the trapped enemy is UNTOUCHABLE by
  // the player's manual attacks — only the domain's auto-slashes (domains.js) deal
  // damage. The swing whiffs cleanly (consume it so it doesn't re-test every frame).
  // Projectiles (e.g. Sukuna's Fuga) go through resolveProjectileHits and are NOT
  // gated here, so Fuga still connects.
  if (defender.domainUntouchable) { attacker.currentAttack.hasHit = true; return }

  if (attacker.currentAttack?.superArmor) attacker.armorFlash = 8

  if (shouldGojoAutoDodge(defender)) {
    attacker.currentAttack.hasHit = true
    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
    return
  }

  const atk = attacker.currentAttack
  const cat = atk.isUltimate ? "ultimate"
    : atk.isSpecial ? "special"
    : (atk.category || _catFromName(atk.name || ""))

  const isCounter = !!(defender.wasInStartup && getAttackPhase(defender) === "startup")

  // damageMultiplier and attackMultiplier are the SAME concept (an offensive
  // scalar). transformations.js sets both to a form's value and domains.js
  // multiplies attackMultiplier on top — so multiplying by BOTH squared the
  // buff (a 2x transform dealt 4x). Take the max instead: that preserves
  // transform×domain stacking (transform sets both to 2, a domain pushes
  // attackMultiplier to 3 → max = 3 = 2×1.5) without the double-count.
  const offenseMult = Math.max(attacker.damageMultiplier || 1, attacker.attackMultiplier || 1)

  let dmg = Math.floor(
    (atk.damage || 40) *
    getComboScale(attacker) *
    offenseMult *
    GLOBAL_DAMAGE_SCALE /
    Math.max(0.5, defender.defenseMultiplier || 1)
  )

  if (isCounter) {
    dmg = Math.floor(dmg * 1.25)
    try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
  }

  if (defender.isBlocking) {
    const chip = cat === "special" || cat === "ultimate"
    const chipDmg = Math.floor(dmg * (chip ? 0.12 : 0.20))

    defender.health = Math.max(chip ? 1 : 0, (defender.health || 0) - chipDmg)
    defender.blockstun = 10 + (cat === "special" ? 4 : 0)

    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}

    if (Array.isArray(hitEffects)) {
      hitEffects.push({
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y + hitbox.h / 2,
        timer: 8,
        maxTimer: 8,
        category: "light",
        color: null,
        damage: chipDmg,
        isBlocking: true,
        lines: 6,
        radius: 14
      })
    }
  } else {
    const hs = getHitstopFrames(atk)
    attacker.hitstop = hs
    defender.hitstop = hs

    defender.hitstun = Math.max(defender.hitstun || 0, Math.round((atk.hitstun || 0) * HITSTUN_SCALE))
    // Getting hit interrupts the defender's own swing so they don't keep
    // attacking (or sit on a never-cleared currentAttack) during hitstun.
    defender.attacking    = false
    defender.currentAttack = null
    defender.currentMove   = null
    // A hit also interrupts a transform-device charge (Ben/Albedo).
    defender.isCharging   = false
    defender.vx = (attacker.facing || 1) * (atk.pushX || 4)

    if (atk.launcher) {
      physics.launcherAttack(attacker, defender, atk.launchY ?? -12, -22)
    } else if (atk.spike) {
      physics.downAirSpike(attacker, defender, 30)
    } else {
      defender.vy = atk.launchY ?? -2
    }

    if (cat === "heavy" || cat === "special" || cat === "ultimate") {
      const proj = defender.x + defender.vx * 8
      if (proj <= 0 || proj >= stageWidth - (defender.w || 60)) {
        defender.wallBounce = true
      }
    }

    if (!isCounter) {
      try { sound?.play?.(_hitSound(atk, false)) } catch (_) {}
    }

    defender.health = Math.max(0, (defender.health || 0) - dmg)
    defender.colorFlash = cat === "ultimate" ? 12 : cat === "special" ? 9 : 6

    const persist =
      cat === "ultimate" ? 30 :
      cat === "special" ? 22 :
      (cat === "heavy" || atk.launcher || atk.spike) ? 18 : 10

    if (Array.isArray(hitEffects)) {
      hitEffects.push({
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y + hitbox.h / 2,
        timer: persist,
        maxTimer: persist,
        category: cat,
        color: (cat === "special" || cat === "ultimate") ? (attacker.color || "#ffd166") : null,
        lines: cat === "ultimate" ? 16 : cat === "special" ? 10 : cat === "heavy" ? 8 : 6,
        radius: cat === "ultimate" ? 40 : cat === "special" ? 28 : cat === "heavy" ? 22 : 14,
        damage: dmg,
        isCounterHit: isCounter
      })
    }

    if (Array.isArray(damageNumbers)) {
      const cmap = {
        light: "#ffffff",
        heavy: "#fbbf24",
        special: "#f97316",
        ultimate: "#ef4444"
      }

      damageNumbers.push({
        value: dmg,
        text: String(dmg),
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y,
        timer: 45,
        maxTimer: 45,
        opacity: 1,
        category: cat,
        color: cmap[cat] || "#ffffff",
        fontSize: Math.min(38, 22 + Math.floor(dmg / 20))
      })
    }

    if (defender.health <= 0) {
      try { sound?.play?.(SFX?.KO) } catch (_) {}
    }
  }

  attacker.currentAttack.hasHit = true
  attacker.comboCounter++
  attacker.comboTimer = 90
  attacker.wasInStartup = false

  try { sound?.playCombo?.(attacker.comboCounter) } catch (_) {}

  applyUltraEgoReaction(defender)
  applyKuramaShroudReaction(defender)   // Kurama Shroud comeback heal-on-hit (stage 3+)
  applyNarutoComboFinisherReaction(defender, attacker)   // Naruto-only escalated combo-ender recoil pose
}

// ========================
// MAIN UPDATE
// ========================

export function updateCombat(fighter, opponent, controls = {}, options = {}) {
  if (!fighter || !opponent) return

  ensureCombatState(fighter)

  if ((fighter.grabInputBuffer || 0) > 0) fighter.grabInputBuffer--
  if ((fighter._parryInputBuffer || 0) > 0) fighter._parryInputBuffer--
  if ((fighter.parryFlash || 0) > 0) fighter.parryFlash--
  if ((fighter.armorFlash || 0) > 0) fighter.armorFlash--
  if ((fighter.clashFlash || 0) > 0) fighter.clashFlash--
  if ((fighter.invulnTimer || 0) > 0) fighter.invulnTimer--

  if (fighter.hitstop > 0) {
    fighter.hitstop--
    return
  }

  if (fighter.hitstun > 0) fighter.hitstun--
  if ((fighter._comboFinisherReactTimer || 0) > 0) fighter._comboFinisherReactTimer--   // Naruto combo-ender recoil pose window
  if (fighter.blockstun > 0) fighter.blockstun--
  if (fighter.comboTimer > 0) fighter.comboTimer--
  else fighter.comboCounter = 0
  if (fighter.attackCooldown > 0) fighter.attackCooldown--

  if (fighter.isGrabbed) {
    updateGrab(opponent, fighter)
    return
  }

  if (fighter.knockdownState) {
    if ((fighter.knockdownTimer || 0) > 0) {
      fighter.knockdownTimer--
      if (fighter.knockdownTimer <= 8) {
        if (controls.left) fighter.techRoll = "left"
        if (controls.right) fighter.techRoll = "right"
      }
    }

    if (fighter.knockdownTimer <= 0) {
      fighter.knockdownState = false
      if (fighter.techRoll) {
        const d = fighter.techRoll === "right" ? 1 : -1
        fighter.vx = d * 7
        fighter._techDash = 12
        fighter.invulnTimer = 18
        fighter.colorFlash = 18
        fighter.techRoll = null
      }
    }
    return
  }

  fighter.wasInStartup = !!(
    fighter.attacking &&
    fighter.currentAttack &&
    getAttackPhase(fighter) === "startup"
  )

  if (!fighter.attacking && !fighter.hitstun) {
    if (controls.upAttack) {
      startMove(fighter, "up", _getMD(fighter, "up"))
    } else if (controls.grab) {
      fighter.grabInputBuffer = 6
      resolveGrab(fighter, opponent, options)
    } else if (controls.air) {
      startMove(fighter, "air", _getMD(fighter, "air"))
    } else if (controls.downAir) {
      startMove(fighter, "down_air", _getMD(fighter, "down_air"))
    } else if (controls.light) {
      startMove(fighter, "light", _getMD(fighter, "light"))
    } else if (controls.heavy) {
      fighter._parryInputBuffer = 5
      startMove(fighter, "heavy", _getMD(fighter, "heavy"))
    }
  }

  if (fighter.attacking && fighter.currentAttack) {
    fighter.currentAttack.timer--

    if (getAttackPhase(fighter) === "active") {
      resolveAttackHit(fighter, opponent, options.hitEffects, {
        stageWidth: options.stageWidth,
        damageNumbers: options.damageNumbers
      })
    }

    // LAUNCHER CANCEL: when an up-attack connects it sends both fighters airborne
    // (see physics.launcherAttack). Cancel the attacker's long recovery so they
    // can immediately jump / air-attack to start the juggle, instead of being
    // stuck on the ground while the enemy floats away.
    if (fighter.currentAttack && fighter.currentAttack.launcher && fighter.currentAttack.hasHit) {
      fighter.attacking = false
      fighter.currentAttack = null
      fighter.currentMove = null
      fighter.attackCooldown = 0
    } else if (fighter.currentAttack && fighter.currentAttack.timer <= 0) {
      fighter.attacking = false
      fighter.currentAttack = null
      fighter.currentMove = null
      fighter.attackCooldown = 10
    }
  }

  // Energy regen is owned by abilities.js regenEnergy() (per-character/domain
  // tuning + the infinite-energy vow). Removing the duplicate passive +0.1 here
  // that used to run alongside it every frame and double-fill the meter.
}

// ========================
// PROJECTILES
// ========================

export function updateProjectiles(projectiles = [], stageWidth = 3200) {
  if (!Array.isArray(projectiles)) return

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    if (!p) {
      projectiles.splice(i, 1)
      continue
    }

    p.x += p.vx || 0
    p.y += p.vy || 0
    if (p.lifetime != null) p.lifetime--

    if (
      p.x < -200 || p.x > stageWidth + 200 ||
      p.y < -400 || p.y > 2000 ||
      (p.lifetime != null && p.lifetime <= 0)
    ) {
      projectiles.splice(i, 1)
    }
  }
}

// 1v1: unchanged signature/behavior — delegates to the array impl with the two fighters.
export function resolveProjectileHits(projectiles = [], p1, p2, hitEffects = [], damageNumbers = []) {
  resolveProjectileHitsMulti(projectiles, [p1, p2], hitEffects, damageNumbers)
}

// FREE-FOR-ALL: a projectile can hit ANY fighter except its owner (the 1v1 path above is
// just this with two fighters). Same collision/damage/block/DOT logic, generalized target set.
export function resolveProjectileHitsMulti(projectiles = [], fighters = [], hitEffects = [], damageNumbers = []) {
  if (!Array.isArray(projectiles)) return

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i]
    if (!proj) continue
    if (proj.visualOnly) continue   // pure FX (e.g. AOE ring bloom) — never collides

    for (const fighter of (fighters || []).filter(Boolean)) {
      if (fighter.eliminated) continue
      if (proj.owner === fighter || proj.ownerId === fighter.side) continue
      if ((fighter.invulnTimer || 0) > 0) continue

      const hurtbox = getHurtbox(fighter)
      // Prefer an explicit circle radius, but fall back to the sprite box so
      // projectiles authored with only {w,h} still collide at their true size.
      const r = proj.radius || proj.size ||
        (proj.w && proj.h ? Math.max(proj.w, proj.h) / 2 : 10)
      const pb = { x: proj.x - r, y: proj.y - r, w: r * 2, h: r * 2 }

      if (!rectsOverlap(pb, hurtbox)) continue

      let dmg = (proj.damage || 30) * GLOBAL_DAMAGE_SCALE

      if (fighter.isBlocking) {
        dmg *= 0.15
        fighter.blockstun = 12
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
      } else {
        fighter.hitstun = proj.hitstun || 18
        fighter.vx = (proj.vx > 0 ? 1 : -1) * (proj.knockbackX || 5)
        fighter.vy = proj.knockbackY || -3
        fighter.colorFlash = 6
        try { sound?.play?.(SFX?.HIT_PROJECTILE) } catch (_) {}
      }

      fighter.health = Math.max(0, (fighter.health || 0) - Math.floor(dmg))

      // Lingering damage-over-time (e.g. Naruto Rasenshuriken wind-chip). Only on a
      // clean (non-blocked) connect, and only if the hit didn't already KO. Ticked in
      // game.updateMiscTimers. `delay` starts one interval out so the first tick lands
      // after the initial hit, not on the same frame.
      if (!fighter.isBlocking && proj.dot && (fighter.health || 0) > 0) {
        const iv = Math.max(1, proj.dot.interval | 0)
        fighter._dot = { ticks: proj.dot.ticks | 0, interval: iv, dmg: proj.dot.dmg | 0, delay: iv }
      }

      if (fighter.health <= 0) {
        try { sound?.play?.(SFX?.KO) } catch (_) {}
      }

      if (Array.isArray(hitEffects)) {
        hitEffects.push({
          x: proj.x,
          y: proj.y,
          timer: 14,
          maxTimer: 14,
          category: "special",
          color: proj.color || "#ffd166",
          lines: 10,
          radius: 24,
          damage: Math.floor(dmg)
        })
      }

      if (Array.isArray(damageNumbers)) {
        damageNumbers.push({
          value: Math.floor(dmg),
          text: String(Math.floor(dmg)),
          x: proj.x,
          y: proj.y - 20,
          timer: 45,
          maxTimer: 45,
          opacity: 1,
          category: "special",
          color: "#f97316",
          fontSize: Math.min(38, 22 + Math.floor(dmg / 20))
        })
      }

      projectiles.splice(i, 1)
      break
    }
  }
}
