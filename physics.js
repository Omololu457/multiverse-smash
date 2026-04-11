/**
 * PHYSICS ENGINE
 * Movement, gravity, collision, knockback.
 * Speed values tuned down — characters were moving too fast.
 */
export const physics = {
  gravity:      0.85,   // was 1.25 — reduced so jumps feel floatier/more anime
  groundY:      520,
  friction:     0.72,   // was 0.4  — higher = more slide, more responsive feel
  airFriction:  0.88,   // was 0.92 — slightly more air control loss
  maxFallSpeed: 22,

  moveFighter(fighter, keys = {}, controls = {}, camera = null) {
    if (!fighter) return
    if (fighter.hitstop > 0) return

    // Speed is stored on the fighter — keep it reasonable
    // Characters in characters.js have stats.speed in the 78–98 range
    // We normalize that to a pixel-per-frame value here
    const rawSpeed    = fighter.baseSpeed || fighter.speed || 9
    // Map stat range (70–100) → pixel speed (5–9 px/frame)
    const speed = clamp(rawSpeed * 0.09, 4, 9)

    // Init missing props
    if (fighter.vx       == null) fighter.vx       = 0
    if (fighter.vy       == null) fighter.vy       = 0
    if (fighter.h        == null) fighter.h        = fighter.height || 80
    if (fighter.w        == null) fighter.w        = fighter.width  || 50
    if (fighter.maxJumps == null) fighter.maxJumps = fighter.stats?.maxJumps || 2
    if (fighter.jumpForce == null) fighter.jumpForce = -(fighter.stats?.jumpPower || 22)
    if (fighter.jumpCount  == null) fighter.jumpCount  = 0
    if (fighter.jumpHeld   == null) fighter.jumpHeld   = false
    if (fighter.dashTimer  == null) fighter.dashTimer  = 0
    if (fighter.dashCooldown == null) fighter.dashCooldown = 0

    // External forces (knockback, wind)
    if (Array.isArray(fighter.externalForces) && fighter.externalForces.length > 0) {
      fighter.externalForces.forEach(force => {
        fighter.vx += force.x || 0
        fighter.vy += force.y || 0
      })
      fighter.externalForces = []
    }

    const leftPressed  = !!keys[controls.left]
    const rightPressed = !!keys[controls.right]
    const upPressed    = !!keys[controls.up]
    const dashPressed  = !!keys[controls.dash]

    if (fighter.dashCooldown > 0) fighter.dashCooldown--

    const canMove = !(
      fighter.stun > 0 ||
      fighter.hitstun > 0 ||
      fighter.blockstun > 0 ||
      fighter.isGrabbed
    )

    if (canMove) {
      // ── DASH ──────────────────────────────────────────────────────
      if (dashPressed && fighter.dashCooldown <= 0) {
        fighter.dashTimer    = fighter.dashDuration    || 8
        fighter.dashCooldown = fighter.dashCooldownMax || 28
      }

      if (fighter.dashTimer > 0) {
        fighter.dashTimer--
        // Dash speed: much lower than before (was 45 px/frame — way too fast)
        const dashSpeed = clamp((fighter.dashSpeed || 14) * 0.55, 8, 16)
        fighter.vx = fighter.facing * dashSpeed
        fighter.vy = 0
      } else {
        // ── WALK ────────────────────────────────────────────────────
        if (leftPressed && !rightPressed) {
          fighter.vx     = -speed
          fighter.facing = -1
        } else if (rightPressed && !leftPressed) {
          fighter.vx     = speed
          fighter.facing = 1
        } else {
          // Decelerate
          fighter.vx *= fighter.onGround ? this.friction : this.airFriction
          if (Math.abs(fighter.vx) < 0.08) fighter.vx = 0
        }
      }

      // ── JUMP ──────────────────────────────────────────────────────
      if (fighter.onGround) fighter.jumpCount = 0

      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps

      if (upPressed && !fighter.jumpHeld && canJump) {
        fighter.vy       = fighter.jumpForce
        fighter.jumpCount++
        fighter.onGround  = false
        fighter.isLaunched = true
        fighter.jumpHeld  = true
        fighter.airHits   = 0
      } else if (!upPressed) {
        fighter.jumpHeld = false
      }
    } else {
      // Stunned — bleed momentum
      fighter.vx *= fighter.onGround ? this.friction : this.airFriction
      if (Math.abs(fighter.vx) < 0.08) fighter.vx = 0
    }

    // Apply horizontal velocity
    fighter.x += fighter.vx

    // Stage boundary clamping (world edges)
    const stageW = fighter.stageWidth || this.stageWidth || 3200
    fighter.x = clamp(fighter.x, 0, stageW - fighter.w)

    // Camera boundary clamping (optional, keeps fighters on screen)
    if (camera && !fighter.ignoreCameraBounds) {
      this.clampToCamera(fighter, camera)
    }
  },

  clampToCamera(fighter, camera) {
    if (!camera) return
    const padding = 30
    const zoom    = camera.zoom || 1
    const viewW   = (typeof window !== "undefined" ? window.innerWidth : 1280) / zoom
    const camX    = camera.x || 0

    const leftEdge  = camX - viewW / 2 + padding
    const rightEdge = camX + viewW / 2 - fighter.w - padding

    if (fighter.x < leftEdge) {
      fighter.x  = leftEdge
      fighter.vx = 0
    } else if (fighter.x > rightEdge) {
      fighter.x  = rightEdge
      fighter.vx = 0
    }
  },

  applyGravity(fighter) {
    if (!fighter) return
    if (fighter.hitstop > 0) return
    if (fighter.dashTimer > 0) return

    const floor = fighter.groundY != null ? fighter.groundY : this.groundY

    // Already grounded and not launched
    if ((fighter.onGround || fighter.grounded) && fighter.vy >= 0 && !fighter.isLaunched) {
      fighter.y  = floor - fighter.h
      fighter.vy = 0
      return
    }

    // Apply gravity
    fighter.vy += this.gravity
    if (fighter.vy > this.maxFallSpeed) fighter.vy = this.maxFallSpeed
    fighter.y  += fighter.vy

    // Land check
    if (fighter.y + fighter.h >= floor) {
      fighter.y         = floor - fighter.h
      fighter.vy        = 0
      fighter.onGround  = true
      fighter.grounded  = true
      fighter.isLaunched = false
      fighter.jumpCount = 0
    } else {
      fighter.onGround = false
      fighter.grounded = false
    }
  },

  resolvePlayerCollision(p1, p2) {
    if (!p1 || !p2) return

    const p1CX = p1.x + p1.w / 2
    const p2CX = p2.x + p2.w / 2
    const distX = p1CX - p2CX
    const minX  = (p1.w / 2) + (p2.w / 2)

    const p1CY = p1.y + p1.h / 2
    const p2CY = p2.y + p2.h / 2
    const distY = Math.abs(p1CY - p2CY)
    const minY  = (p1.h / 2) + (p2.h / 2)

    if (Math.abs(distX) < minX && distY < minY) {
      const overlap = minX - Math.abs(distX)
      const dir     = distX > 0 ? 1 : -1
      p1.x += (overlap / 2) * dir
      p2.x -= (overlap / 2) * dir
      p1.vx *= 0.5
      p2.vx *= 0.5
    }
  },

  checkHit(attackerBox, targetBody) {
    if (!attackerBox || !targetBody) return false
    return (
      attackerBox.x < targetBody.x + targetBody.w &&
      attackerBox.x + attackerBox.w > targetBody.x &&
      attackerBox.y < targetBody.y + targetBody.h &&
      attackerBox.y + attackerBox.h > targetBody.y
    )
  },

  updateAttackBox(fighter) {
    if (!fighter) return
    if (!fighter.attackBox) fighter.attackBox = { x: 0, y: 0, w: 90, h: 40 }

    const width = fighter.attackBox.w || 90
    fighter.attackBox.x = fighter.facing === 1
      ? fighter.x + fighter.w
      : fighter.x - width
    fighter.attackBox.y = fighter.y + 20
  },

  // ── STAGE BOUNDS (set by game.js on each round) ─────────────────
  setStageBounds(left, right) {
    this.stageLeft  = left  || 0
    this.stageWidth = right || 3200
  },

  setGroundY(y) {
    this.groundY = y
  },

  // ── COMBAT INTERACTIONS ─────────────────────────────────────────
  launcherAttack(attacker, target, launchY = -28, selfLift = -16) {
    if (!attacker || !target) return
    target.vy      = launchY
    target.onGround = false
    target.isLaunched = true

    if (!attacker.onGround && selfLift < 0) {
      attacker.vy       = selfLift
      attacker.isLaunched = true
    }
  },

  airCombo(attacker, target, launchY = -14) {
    if (!attacker || !target) return
    attacker.airHits    = attacker.airHits    || 0
    attacker.maxAirHits = attacker.maxAirHits || 3
    if (attacker.airHits >= attacker.maxAirHits) return

    target.vy        = launchY
    target.onGround  = false
    target.isLaunched = true
    attacker.airHits++
  },

  downAirSpike(attacker, target, force = 24) {
    if (!attacker || !target) return
    target.vy        = force
    target.onGround  = false
    target.isLaunched = true
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
