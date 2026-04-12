// summons.js
// Handles assist/summon logic for characters.
// All timing values are in FRAMES at 60fps.

export const activeSummons = []

// ─────────────────────────────────────────────────────────────────
// DEFAULTS — all timing values are in FRAMES at 60fps
// ─────────────────────────────────────────────────────────────────
const summonDefaults = {
  id:               "generic",
  duration:         180,   // frames
  maxSimultaneous:  2,
  attackInterval:   30,    // frames between attacks
  damage:           50,
  w:                40,
  h:                60,
  speed:            4,     // pixels per frame
  offsetX:          60,
  offsetY:          0,
  behavior:         "rush",
  hitstun:          12,
  knockbackX:       4,
  knockbackY:       0,
  launch:           0,
  spike:            0,
  restrain:         false,
  restrainDuration: 36,    // frames
  defensive:        false,
  utility:          false,
  obscureVision:    false,
  antiAir:          false,
  heavySummon:      false,
  oneHit:           true,
  color:            "#0ff"
}

const summonTemplates = {
  divineDogs: {
    id:              "divineDogs",
    duration:        84,   // ~1.4s
    maxSimultaneous: 1,
    attackInterval:  15,
    damage:          45,
    w:               52,
    h:               34,
    speed:           7,
    behavior:        "rush",
    hitstun:         18,
    knockbackX:      6,
    knockbackY:      -1,
    oneHit:          true,
    color:           "#d1fae5"
  },

  nue: {
    id:              "nue",
    duration:        96,   // ~1.6s
    maxSimultaneous: 1,
    attackInterval:  21,
    damage:          70,
    w:               72,
    h:               42,
    speed:           6,
    offsetY:         -80,
    behavior:        "airDive",
    antiAir:         true,
    hitstun:         20,
    knockbackX:      5,
    knockbackY:      -6,
    launch:          10,
    oneHit:          true,
    color:           "#fde68a"
  },

  toad: {
    id:              "toad",
    duration:        108,  // ~1.8s
    maxSimultaneous: 1,
    attackInterval:  24,
    damage:          60,
    w:               58,
    h:               44,
    speed:           4,
    behavior:        "holdLine",
    restrain:        true,
    restrainDuration: 42,
    hitstun:         22,
    knockbackX:      2,
    knockbackY:      0,
    oneHit:          true,
    color:           "#86efac"
  },

  rabbitEscape: {
    id:              "rabbitEscape",
    duration:        84,   // ~1.4s
    maxSimultaneous: 1,
    attackInterval:  9999, // never auto-attacks
    damage:          10,
    w:               84,
    h:               54,
    speed:           5,
    behavior:        "screenSwarm",
    defensive:       true,
    utility:         true,
    obscureVision:   true,
    hitstun:         6,
    knockbackX:      0,
    knockbackY:      0,
    oneHit:          false,
    color:           "#f8fafc"
  },

  maxElephant: {
    id:              "maxElephant",
    duration:        96,   // ~1.6s
    maxSimultaneous: 1,
    attackInterval:  42,
    damage:          110,
    w:               96,
    h:               72,
    speed:           2.5,
    behavior:        "heavyDrop",
    heavySummon:     true,
    hitstun:         24,
    knockbackX:      9,
    knockbackY:      -2,
    oneHit:          true,
    color:           "#93c5fd"
  }
}

// ─────────────────────────────────────────────────────────────────
// SPAWN
// ─────────────────────────────────────────────────────────────────
export function spawnSummon(owner, summonData, target) {
  if (!owner || !summonData) return null

  const templateKey =
    typeof summonData === "string"
      ? summonData
      : (summonData.summonId || summonData.id || null)

  const template = templateKey ? (summonTemplates[templateKey] || {}) : {}

  const mergedData = {
    ...summonDefaults,
    ...template,
    ...(typeof summonData === "object" ? summonData : {})
  }

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
    x:            owner.x + ((owner.facing || 1) * (mergedData.offsetX || 60)),
    y:            owner.y + (mergedData.offsetY || 0),
    vx:           0,
    vy:           0,
    facing:       owner.facing || 1,
    lifetime:     mergedData.duration || summonDefaults.duration,
    attackTimer:  0,
    hasHit:       false,
    frame:        0,
    dropStarted:  false
  }

  activeSummons.push(summon)
  return summon
}

// ─────────────────────────────────────────────────────────────────
// UPDATE — called once per game frame
// ─────────────────────────────────────────────────────────────────
export function updateSummons() {
  for (let i = activeSummons.length - 1; i >= 0; i--) {
    const s = activeSummons[i]
    if (!s) {
      activeSummons.splice(i, 1)
      continue
    }

    updateSummonMovement(s)

    s.attackTimer++
    if (s.attackTimer >= (s.attackInterval || summonDefaults.attackInterval)) {
      s.attackTimer = 0
      performSummonAttack(s)
    }

    if (s.behavior === "screenSwarm" && s.target) {
      const dx = s.target.x - s.x
      const dy = s.target.y - s.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 100 && !s.hasHit) {
        performSummonAttack(s)
      }
    }

    s.lifetime--
    s.frame++

    if (s.lifetime <= 0) {
      cleanupSummonEffects(s)
      activeSummons.splice(i, 1)
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// MOVEMENT — pixels per frame
// ─────────────────────────────────────────────────────────────────
function updateSummonMovement(s) {
  if (!s || !s.target) return

  const dx = s.target.x - s.x
  const direction = dx >= 0 ? 1 : -1
  s.facing = direction

  switch (s.behavior) {
    case "rush":
      s.vx = s.speed * direction
      s.x += s.vx
      break

    case "airDive":
      s.vx = s.speed * direction
      s.x += s.vx

      if (s.y > s.target.y - 80) {
        s.y -= s.speed * 1.5
      } else {
        s.y += s.speed * 2.2
      }
      break

    case "holdLine":
      if (Math.abs(dx) > 30) {
        s.vx = s.speed * direction
        s.x += s.vx
      } else {
        s.vx = 0
      }
      break

    case "screenSwarm":
      s.vx = s.speed * direction
      s.x += s.vx
      break

    case "heavyDrop":
      if (!s.dropStarted) {
        if (Math.abs(dx) > 20) {
          s.vx = s.speed * direction
          s.x += s.vx
        } else {
          s.dropStarted = true
          s.y = s.target.y - 140
        }
      } else {
        s.y += s.speed * 3
      }
      break

    default:
      s.vx = s.speed * direction
      s.x += s.vx
      break
  }
}

// ─────────────────────────────────────────────────────────────────
// ATTACK
// ─────────────────────────────────────────────────────────────────
function performSummonAttack(summon) {
  if (!summon || !summon.target) return
  if (summon.oneHit && summon.hasHit) return

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

  summon.target.health = Math.max(0, (summon.target.health || 0) - summon.damage)
  summon.target.colorFlash = 6

  applySummonImpact(summon)
  summon.hasHit = true

  if (summon.oneHit) {
    summon.lifetime = Math.min(summon.lifetime, 8)
  }
}

function applySummonImpact(summon) {
  if (!summon || !summon.target) return

  const target = summon.target
  const facing = summon.facing || summon.owner?.facing || 1

  target.hitstun = Math.max(target.hitstun || 0, summon.hitstun || 0)
  target.stunFrames = summon.hitstun || 0
  target.vx = (summon.knockbackX || 0) * facing
  target.vy = summon.knockbackY || 0

  if (summon.launch) {
    target.vy = -Math.abs(summon.launch)
    target.onGround = false
    target.isLaunched = true
  }

  if (summon.spike) {
    target.vy = Math.abs(summon.spike)
    target.onGround = false
    target.isLaunched = true
  }

  if (summon.restrain) {
    target.restrained = true
    target.restrainTimer = summon.restrainDuration || 36
    target.vx = 0
    target.vy = 0
  }

  if (summon.obscureVision) {
    target.obscured = true
    target.obscuredTimer = 48
  }
}

function cleanupSummonEffects(summon) {
  if (!summon || !summon.target) return

  if (
    summon.restrain &&
    summon.target.restrained &&
    (summon.target.restrainTimer || 0) <= 0
  ) {
    summon.target.restrained = false
  }
}

// ─────────────────────────────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────────────────────────────
export function drawSummons(ctx) {
  for (const s of activeSummons) {
    ctx.save()

    if (s.lifetime < 12) {
      ctx.globalAlpha = s.lifetime / 12
    }

    ctx.fillStyle = s.color || "#0ff"
    ctx.fillRect(s.x, s.y, s.w, s.h)

    if (s.id === "nue") {
      ctx.fillStyle = "#fff59d"
      ctx.fillRect(s.x + 8, s.y + 6, s.w - 16, 8)
    }

    if (s.id === "rabbitEscape") {
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.55
      ctx.fillStyle = "rgba(255,255,255,0.55)"
      ctx.fillRect(s.x - 10, s.y - 6, s.w + 20, s.h + 12)
    }

    if (s.id === "maxElephant") {
      ctx.strokeStyle = "rgba(255,255,255,0.25)"
      ctx.lineWidth = 3
      ctx.strokeRect(s.x - 4, s.y - 4, s.w + 8, s.h + 8)
    }

    const maxLifetime = s.duration || summonDefaults.duration
    const lifePct = maxLifetime > 0 ? s.lifetime / maxLifetime : 0

    ctx.globalAlpha = 0.7
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.fillRect(s.x, s.y - 8, s.w, 4)
    ctx.fillStyle = s.color || "#0ff"
    ctx.fillRect(s.x, s.y - 8, s.w * Math.max(0, lifePct), 4)

    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────
export function clearSummons() {
  activeSummons.length = 0
}
