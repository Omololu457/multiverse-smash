// summons.js
// Handles assist/summon logic for characters

export const activeSummons = []

// Default summon config
const summonDefaults = {
    id: "generic",
    duration: 3000, // milliseconds
    maxSimultaneous: 2,
    attackInterval: 500, // ms between attacks
    damage: 50,
    w: 40,
    h: 60,
    speed: 4,
    offsetX: 60,
    offsetY: 0,
    behavior: "rush",
    hitstun: 12,
    knockbackX: 4,
    knockbackY: 0,
    launch: 0,
    spike: 0,
    restrain: false,
    restrainDuration: 600,
    defensive: false,
    utility: false,
    obscureVision: false,
    antiAir: false,
    heavySummon: false,
    oneHit: true,
    color: "#0ff"
}

const summonTemplates = {
    divineDogs: {
        id: "divineDogs",
        duration: 1400,
        maxSimultaneous: 1,
        attackInterval: 250,
        damage: 45,
        w: 52,
        h: 34,
        speed: 7,
        behavior: "rush",
        hitstun: 18,
        knockbackX: 6,
        knockbackY: -1,
        oneHit: true,
        color: "#d1fae5"
    },

    nue: {
        id: "nue",
        duration: 1600,
        maxSimultaneous: 1,
        attackInterval: 350,
        damage: 70,
        w: 72,
        h: 42,
        speed: 6,
        offsetY: -80,
        behavior: "airDive",
        antiAir: true,
        hitstun: 20,
        knockbackX: 5,
        knockbackY: -6,
        launch: 10,
        oneHit: true,
        color: "#fde68a"
    },

    toad: {
        id: "toad",
        duration: 1800,
        maxSimultaneous: 1,
        attackInterval: 400,
        damage: 60,
        w: 58,
        h: 44,
        speed: 4,
        behavior: "holdLine",
        restrain: true,
        restrainDuration: 700,
        hitstun: 22,
        knockbackX: 2,
        knockbackY: 0,
        oneHit: true,
        color: "#86efac"
    },

    rabbitEscape: {
        id: "rabbitEscape",
        duration: 1400,
        maxSimultaneous: 1,
        attackInterval: 9999,
        damage: 10,
        w: 84,
        h: 54,
        speed: 5,
        behavior: "screenSwarm",
        defensive: true,
        utility: true,
        obscureVision: true,
        hitstun: 6,
        knockbackX: 0,
        knockbackY: 0,
        oneHit: false,
        color: "#f8fafc"
    },

    maxElephant: {
        id: "maxElephant",
        duration: 1600,
        maxSimultaneous: 1,
        attackInterval: 700,
        damage: 110,
        w: 96,
        h: 72,
        speed: 2.5,
        behavior: "heavyDrop",
        heavySummon: true,
        hitstun: 24,
        knockbackX: 9,
        knockbackY: -2,
        oneHit: true,
        color: "#93c5fd"
    }
}

// Create a new summon
export function spawnSummon(owner, summonData, target) {
    if (!owner || !summonData) return null

    const template =
        typeof summonData === "string"
            ? (summonTemplates[summonData] || { id: summonData })
            : (summonData.summonId ? summonTemplates[summonData.summonId] || {} : {})

    const mergedData = {
        ...summonDefaults,
        ...template,
        ...(typeof summonData === "object" ? summonData : {})
    }

    // Count current summons by this owner
    const current = activeSummons.filter(
        s => s.owner === owner && s.id === mergedData.id
    )

    if (current.length >= (mergedData.maxSimultaneous || summonDefaults.maxSimultaneous)) {
        return null
    }

    const summon = {
        ...mergedData,
        owner,
        target,
        x: owner.x + (owner.facing * (mergedData.offsetX || 60)),
        y: owner.y + (mergedData.offsetY || 0),
        vx: 0,
        vy: 0,
        facing: owner.facing || 1,
        lifetime: mergedData.duration || summonDefaults.duration,
        attackTimer: 0,
        hasHit: false,
        frame: 0
    }

    activeSummons.push(summon)
    return summon
}

// Update all active summons
export function updateSummons(deltaTime) {
    for (let i = activeSummons.length - 1; i >= 0; i--) {
        const s = activeSummons[i]

        updateSummonMovement(s, deltaTime)

        // Attack timer
        s.attackTimer += deltaTime
        if (s.attackTimer >= (s.attackInterval || summonDefaults.attackInterval)) {
            s.attackTimer = 0
            performSummonAttack(s)
        }

        // Timed utility behavior for rabbit escape
        if (s.behavior === "screenSwarm" && s.target) {
            if (Math.abs(s.target.x - s.x) < 100 && !s.hasHit) {
                performSummonAttack(s)
            }
        }

        // Reduce lifetime
        s.lifetime -= deltaTime
        if (s.lifetime <= 0) {
            cleanupSummonEffects(s)
            activeSummons.splice(i, 1)
        }
    }
}

function updateSummonMovement(s, deltaTime) {
    if (!s) return
    if (!s.target) return

    const dtScale = deltaTime / 16.67
    const dx = s.target.x - s.x
    const direction = dx >= 0 ? 1 : -1

    s.facing = direction

    switch (s.behavior) {
        case "rush":
            s.vx = s.speed * direction
            s.x += s.vx * dtScale
            break

        case "airDive":
            s.vx = s.speed * direction
            s.x += s.vx * dtScale

            if (s.y > s.target.y - 80) {
                s.y -= s.speed * 1.5 * dtScale
            } else {
                s.y += s.speed * 2.2 * dtScale
            }
            break

        case "holdLine":
            if (Math.abs(dx) > 30) {
                s.vx = s.speed * direction
                s.x += s.vx * dtScale
            } else {
                s.vx = 0
            }
            break

        case "screenSwarm":
            s.vx = s.speed * direction
            s.x += s.vx * dtScale
            break

        case "heavyDrop":
            if (!s.dropStarted) {
                if (Math.abs(dx) > 20) {
                    s.vx = s.speed * direction
                    s.x += s.vx * dtScale
                } else {
                    s.dropStarted = true
                    s.y = s.target.y - 140
                }
            } else {
                s.y += s.speed * 3 * dtScale
            }
            break

        default:
            s.vx = s.speed * direction
            s.x += s.vx * dtScale
            break
    }
}

// Perform summon attack
function performSummonAttack(summon) {
    if (!summon || !summon.target) return
    if (summon.oneHit && summon.hasHit) return

    // Simple collision check: proximity / overlap
    const summonRect = { x: summon.x, y: summon.y, w: summon.w, h: summon.h }
    const targetRect = {
        x: summon.target.x,
        y: summon.target.y,
        w: summon.target.w || 60,
        h: summon.target.h || 100
    }

    const overlap =
        summonRect.x < targetRect.x + targetRect.w &&
        summonRect.x + summonRect.w > targetRect.x &&
        summonRect.y < targetRect.y + targetRect.h &&
        summonRect.y + summonRect.h > targetRect.y

    const dx = summon.target.x - summon.x
    const dy = summon.target.y - summon.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (!overlap && distance >= 70) return

    summon.target.health -= summon.damage
    if (summon.target.health < 0) summon.target.health = 0

    applySummonImpact(summon)
    summon.hasHit = true

    if (summon.oneHit) {
        summon.lifetime = Math.min(summon.lifetime, 120)
    }
}

function applySummonImpact(summon) {
    if (!summon || !summon.target) return

    const target = summon.target
    const facing = summon.facing || summon.owner?.facing || 1

    target.hitstun = summon.hitstun || 0
    target.stunFrames = summon.hitstun || 0
    target.vx = (summon.knockbackX || 0) * facing
    target.vy = summon.knockbackY || 0

    if (summon.launch) {
        target.vy = -Math.abs(summon.launch)
    }

    if (summon.spike) {
        target.vy = Math.abs(summon.spike)
    }

    if (summon.restrain) {
        target.restrained = true
        target.restrainTimer = summon.restrainDuration || 600
        target.vx = 0
        target.vy = 0
    }

    if (summon.obscureVision) {
        target.obscured = true
        target.obscuredTimer = 800
    }
}

function cleanupSummonEffects(summon) {
    if (!summon || !summon.target) return

    if (summon.restrain && summon.target.restrained && summon.target.restrainTimer <= 0) {
        summon.target.restrained = false
    }
}

// Draw summons on canvas
export function drawSummons(ctx) {
    activeSummons.forEach(s => {
        ctx.fillStyle = s.color || "#0ff"
        ctx.fillRect(s.x, s.y, s.w, s.h)

        // simple visual distinction
        if (s.id === "nue") {
            ctx.fillStyle = "#fff59d"
            ctx.fillRect(s.x + 8, s.y + 6, s.w - 16, 8)
        }

        if (s.id === "rabbitEscape") {
            ctx.fillStyle = "rgba(255,255,255,0.55)"
            ctx.fillRect(s.x - 10, s.y - 6, s.w + 20, s.h + 12)
        }

        if (s.id === "maxElephant") {
            ctx.fillStyle = "rgba(255,255,255,0.18)"
            ctx.fillRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12)
        }
    })
}