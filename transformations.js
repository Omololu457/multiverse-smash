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

    // Opt-in HEALTH SPIKE (Adult Gon etc.). Snapshot the pre-transform max once
    // so revert can restore it; heal by the gained headroom on entry.
    if (form.healthMultiplier && form.healthMultiplier !== 1) {
        if (fighter._preTransformMaxHealth == null) fighter._preTransformMaxHealth = fighter.maxHealth || 1000
        const newMax = Math.round(fighter._preTransformMaxHealth * form.healthMultiplier)
        const gain   = newMax - (fighter.maxHealth || newMax)
        fighter.maxHealth = newMax
        fighter.health    = Math.min(newMax, (fighter.health || 0) + Math.max(0, gain))
    }

    // Duration tracking
    if (form.duration && !form.permanent) {
        fighter.transformationTimer = form.duration * 1000 // ms
    } else {
        fighter.transformationTimer = 0
    }

    fighter.currentForm = transformationName

    // Permanent character replacement support (generic; no roster user at present)
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

    // Opt-in FORCE-REVERT at zero fuel (Adult Gon etc.). Existing forms omit the
    // `revertOnEmpty` flag, so their duration-only behavior is unchanged.
    const cf = fighter.transformations?.[fighter.currentForm]
    if (cf && cf.revertOnEmpty && (fighter.energy || 0) <= 0 &&
        !fighter.permanentForm && !fighter.oneWayTransformation && !fighter.deathRitual) {
        revertTransformation(fighter)
        return
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

    // Permanent / one-way / death-ritual forms cannot revert
    if (fighter.permanentForm || fighter.oneWayTransformation || fighter.deathRitual) {
        return false
    }

    // Capture the form we're leaving BEFORE we wipe currentForm below.
    const leaving = fighter.transformations?.[fighter.currentForm]

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

    // Extended revert for energy-fuelled forms (Adult Gon etc.) — opt-in so
    // existing characters are untouched. abilities.js updateTransformationState
    // re-applies multipliers from currentFormData every frame, so we MUST point
    // it back at the base form or the boost would persist after reverting.
    if (leaving && (leaving.revertOnEmpty || leaving.reusable || leaving.healthMultiplier)) {
        const baseKey = fighter.transformationOrder?.[0] || "base"
        fighter.currentFormData = fighter.transformations?.[baseKey] || null
        if (fighter._preTransformMaxHealth != null) {
            fighter.maxHealth = fighter._preTransformMaxHealth
            if ((fighter.health || 0) > fighter.maxHealth) fighter.health = fighter.maxHealth
            fighter._preTransformMaxHealth = null
        }
        // Re-usable forms can be triggered again once fuel is rebuilt.
        if (leaving.reusable) fighter.transformIndex = 0
    }

    return true
}
