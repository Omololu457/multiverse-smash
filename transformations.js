// transformations.js
// Handles character transformations and form switching

function getTransformData(fighter, transformationName) {
    if (!fighter || !fighter.transformations) return null
    return fighter.transformations[transformationName] || null
}

function applyFormStats(fighter, form) {
    if (!fighter || !form) return

    // Support both naming styles used across the project
    fighter.damageMultiplier =
        form.damageMultiplier ??
        form.attackMultiplier ??
        1

    fighter.attackMultiplier =
        form.attackMultiplier ??
        form.damageMultiplier ??
        1

    fighter.speedMultiplier = form.speedMultiplier ?? 1
    fighter.defenseMultiplier = form.defenseMultiplier ?? 1
    fighter.isSpecialForm = !!(form.isSpecial || form.specialForm)
    fighter.kiDrainPerSecond =
        form.kiDrainPerSecond ??
        form.drainPerSecond ??
        0

    // Optional form flags
    fighter.autoDodge = !!form.autoDodge
    fighter.autoDodgeKiCost = form.autoDodgeKiCost || 0
    fighter.rageHealOnHit = form.rageHealOnHit || 0
    fighter.healCostPerHitKi = form.healCostPerHitKi || 0
    fighter.permanentForm = !!form.permanent
    fighter.oneWayTransformation = !!form.oneWay
    fighter.deathRitual = !!form.deathRitual
    fighter.replaceCharacterId = form.replaceCharacterId || null
    fighter.lockedForm = form.lockedForm || null
    fighter.lockSpecials = Array.isArray(form.lockSpecials) ? [...form.lockSpecials] : []
}

function ensureBaseFormSnapshot(fighter) {
    if (!fighter || fighter.baseForm) return

    fighter.baseForm = {
        damageMultiplier: fighter.damageMultiplier ?? fighter.attackMultiplier ?? 1,
        attackMultiplier: fighter.attackMultiplier ?? fighter.damageMultiplier ?? 1,
        speedMultiplier: fighter.speedMultiplier ?? 1,
        defenseMultiplier: fighter.defenseMultiplier ?? 1,
        isSpecial: fighter.isSpecialForm ?? false,
        kiDrainPerSecond: fighter.kiDrainPerSecond ?? 0,
        drainPerSecond: fighter.kiDrainPerSecond ?? 0
    }
}

export function applyTransformation(fighter, transformationName) {
    if (!fighter || !fighter.transformations) return false

    const form = getTransformData(fighter, transformationName)
    if (!form) return false

    ensureBaseFormSnapshot(fighter)

    // Prevent switching away from permanent / death ritual forms
    if (
        fighter.currentForm &&
        fighter.currentForm !== transformationName &&
        (fighter.permanentForm || fighter.oneWayTransformation || fighter.deathRitual)
    ) {
        return false
    }

    applyFormStats(fighter, form)

    // Duration tracking
    if (form.duration && !form.permanent) {
        fighter.transformationTimer = form.duration * 1000 // ms
    } else {
        fighter.transformationTimer = 0
    }

    fighter.currentForm = transformationName

    // Permanent character replacement support (Megumi -> Mahoraga)
    if (form.replaceCharacterId) {
        fighter.characterSwapId = form.replaceCharacterId
        fighter.pendingCharacterSwap = form.replaceCharacterId
    }

    if (form.lockSpecials) {
        fighter.disabledSpecials = [...form.lockSpecials]
    }

    if (form.deathRitual) {
        fighter.ritualActive = true
    }

    return true
}

// Update transformation timers (call each frame)
export function updateTransformations(fighter, deltaTime) {
    if (!fighter || !fighter.currentForm) return

    // Drain energy if required
    if ((fighter.energyType || "none") !== "none" && typeof fighter.energy === "number") {
        fighter.energy -= (fighter.kiDrainPerSecond || 0) * (deltaTime / 1000)
        if (fighter.energy < 0) fighter.energy = 0
    }

    // Permanent / one-way forms do not revert automatically
    if (fighter.permanentForm || fighter.oneWayTransformation || fighter.deathRitual) {
        return
    }

    if (!fighter.transformationTimer) return

    // Countdown
    fighter.transformationTimer -= deltaTime
    if (fighter.transformationTimer <= 0) {
        revertTransformation(fighter)
    }
}

// Revert fighter to base form
export function revertTransformation(fighter) {
    if (!fighter || !fighter.baseForm) return false

    // Mahoraga / permanent death ritual cannot revert
    if (fighter.permanentForm || fighter.oneWayTransformation || fighter.deathRitual) {
        return false
    }

    const base = fighter.baseForm

    fighter.damageMultiplier = base.damageMultiplier || 1
    fighter.attackMultiplier = base.attackMultiplier || base.damageMultiplier || 1
    fighter.speedMultiplier = base.speedMultiplier || 1
    fighter.defenseMultiplier = base.defenseMultiplier || 1
    fighter.isSpecialForm = !!base.isSpecial
    fighter.kiDrainPerSecond =
        base.kiDrainPerSecond ??
        base.drainPerSecond ??
        0

    fighter.autoDodge = false
    fighter.autoDodgeKiCost = 0
    fighter.rageHealOnHit = 0
    fighter.healCostPerHitKi = 0
    fighter.replaceCharacterId = null
    fighter.characterSwapId = null
    fighter.pendingCharacterSwap = null
    fighter.disabledSpecials = []
    fighter.currentForm = "base"
    fighter.transformationTimer = 0
    fighter.permanentForm = false
    fighter.oneWayTransformation = false
    fighter.deathRitual = false
    fighter.ritualActive = false
    fighter.lockSpecials = []

    return true
}

// Example usage for Mahoraga
export function applyMahoraga(player, mahoragaData) {
    if (!player) return false

    // Permanent death ritual swap
    player.character = mahoragaData
    player.isMahoraga = true
    player.currentForm = "mahoraga"
    player.permanentForm = true
    player.oneWayTransformation = true
    player.deathRitual = true
    player.ritualActive = true
    player.transformationTimer = 0

    // Disable Megumi summon kit after swap
    player.disabledSpecials = [
        "divine_dogs",
        "nue",
        "toad",
        "rabbit_escape",
        "max_elephant",
        "shadow_step"
    ]

    player.adaptationLevels = {
        melee: 0,
        projectile: 0,
        special: 0,
        domain: 0
    }
    player.maxAdaptationLevel = 3

    return true
}