// collision.js
// Handles all hit detection between fighters

import { moveset } from "./moveset.js"

// Check rectangular collision
export function checkCollision(rect1, rect2) {
    if (!rect1 || !rect2) return false

    return (
        rect1.x < rect2.x + rect2.w &&
        rect1.x + rect1.w > rect2.x &&
        rect1.y < rect2.y + rect2.h &&
        rect1.y + rect1.h > rect2.y
    )
}

// Update the fighter's attack box based on facing
export function updateAttackBox(fighter) {
    if (!fighter) return

    if (!fighter.attackBox) {
        fighter.attackBox = {
            x: fighter.x,
            y: fighter.y,
            w: 60,
            h: 40
        }
    }

    fighter.attackBox.x =
        fighter.facing === 1
            ? fighter.x + fighter.w
            : fighter.x - fighter.attackBox.w

    fighter.attackBox.y = fighter.y + 30
}

// Internal helper: get moveset entry for a fighter
function getFighterMoves(attacker) {
    if (!attacker) return null

    const key = (attacker.id || attacker.name || "").toLowerCase()
    return moveset[key] || null
}

// Internal helper: map engine attack keys to moveset data
function getAttackData(attacker, attackType) {
    const fighterMoves = getFighterMoves(attacker)
    if (!fighterMoves) return null

    switch (attackType) {
        case "light":
            return fighterMoves.light || null
        case "heavy":
            return fighterMoves.heavy || null
        case "up":
            return fighterMoves.upAttack || null
        case "air":
            return fighterMoves.airAttack || null
        case "down_air":
            return fighterMoves.downAir || null
        default:
            return null
    }
}

// Apply damage if attack connects
export function applyAttack(attacker, target, attackType) {
    if (!attacker || !target) return false
    if (!attacker.attacking) return false

    const attackData = getAttackData(attacker, attackType)
    if (!attackData) return false

    const damage = attackData.damage || 0

    target.health -= damage

    if (target.health < 0) {
        target.health = 0
    }

    return true
}

// Helper: check if fighter is airborne
function isAirborne(fighter) {
    if (!fighter) return false

    return !!(
        fighter.isJumping ||
        fighter.inAir ||
        fighter.airborne ||
        fighter.onGround === false
    )
}

// Legacy exports kept for compatibility with older files.
// Main combat behavior is now handled in combat.js.

export function launcherAttack(attacker, target) {
    if (!attacker || !target) return

    // Launch the target only
    target.vy = -12

    // Keep grounded attacker from being pushed upward
    if (!isAirborne(attacker)) {
        attacker.vy = 0
    }

    attacker.airHits = 0
}

export function airCombo(attacker, target) {
    if (!attacker || !target) return

    attacker.airHits = attacker.airHits || 0
    attacker.maxAirHits = attacker.maxAirHits || 3

    if (attacker.airHits >= attacker.maxAirHits) return

    target.vy = -6
    attacker.airHits++
}

export function downAirSpike(attacker, target) {
    if (!attacker || !target) return

    // Optional safety so grounded attacks do not spike
    if (!isAirborne(attacker)) return

    target.vy = 15
}
