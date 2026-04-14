/**
 * PHYSICS ENGINE — unified version
 * Movement, gravity, dash (ground + air), collision, knockback, bounds.
 */
export const physics = {
  gravity: 0.85,
  groundY: 520,
  friction: 0.72,
  airFriction: 0.88,
  maxFallSpeed: 22,
  stageWidth: 3200,
  stageLeft: 0,

  moveFighter(fighter, keys = {}, controls = {}, camera = null) {
    if (!fighter || fighter.hitstop > 0) return

    // ── INIT ─────────────────────────────────────────
    const rawSpeed = fighter.baseSpeed || fighter.speed || 9
    const speed = clamp(rawSpeed * 0.09, 4, 9)

    const defaults = {
      vx: 0, vy: 0,
      h: fighter.height || 80,
      w: fighter.width || 50,
      maxJumps: fighter.stats?.maxJumps || 2,
      jumpForce: -(fighter.stats?.jumpPower || 22),
      jumpCount: 0,
      jumpHeld: false,
      dashTimer: 0,
      dashCooldown: 0,
      airDashCount: 0,
      airDashing: false,
      airDashTimer: 0
    }
    for (const k in defaults) if (fighter[k] == null) fighter[k] = defaults[k]

    // External forces
    if (Array.isArray(fighter.externalForces) && fighter.externalForces.length) {
      fighter.externalForces.forEach(f => {
        fighter.vx += f.x || 0
        fighter.vy += f.y || 0
      })
      fighter.externalForces = []
    }

    const L = !!keys[controls.left]
    const R = !!keys[controls.right]
    const U = !!keys[controls.up]
    const dash = !!keys[controls.dash]

    if (fighter.dashCooldown > 0) fighter.dashCooldown--
    if (fighter.airDashTimer > 0 && --fighter.airDashTimer <= 0) fighter.airDashing = false

    const canMove = !(
      fighter.stun > 0 ||
      fighter.hitstun > 0 ||
      fighter.blockstun > 0 ||
      fighter.isGrabbed
    )

    const air = !fighter.onGround

    // ── MOVEMENT ─────────────────────────────────────
    if (canMove) {
      const maxAirDash = (fighter.stats?.mobility === "very_high") ? 2 : 1

      // Air dash
      if (air && dash && fighter.airDashCount < maxAirDash && fighter.dashCooldown <= 0) {
        fighter.vx = (fighter.facing || 1) * (fighter.dashSpeed || 14) * 0.8
        fighter.vy = 0
        fighter.airDashCount++
        fighter.airDashing = true
        fighter.airDashTimer = 10
        fighter.dashCooldown = 22
      }
      // Ground dash
      else if (!air && dash && fighter.dashCooldown <= 0) {
        fighter.dashTimer = fighter.dashDuration || 8
        fighter.dashCooldown = fighter.dashCooldownMax || 28
      }

      if (!air && fighter.dashTimer > 0) {
        fighter.dashTimer--
        const dashSpeed = clamp((fighter.dashSpeed || 14) * 0.55, 8, 16)
        fighter.vx = (fighter.facing || 1) * dashSpeed
        fighter.vy = 0
      } else if (!fighter.airDashing) {
        if (L && !R) {
          fighter.vx = -speed
          fighter.facing = -1
        } else if (R && !L) {
          fighter.vx = speed
          fighter.facing = 1
        } else {
          fighter.vx *= fighter.onGround ? this.friction : this.airFriction
          if (Math.abs(fighter.vx) < 0.08) fighter.vx = 0
        }
      }

      // Jump
      if (fighter.onGround) fighter.jumpCount = 0

      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps

      if (U && !fighter.jumpHeld && canJump) {
        fighter.vy = fighter.jumpForce
        fighter.jumpCount++
        fighter.onGround = false
        fighter.isLaunched = true
        fighter.jumpHeld = true
        fighter.airHits = 0
      } else if (!U) {
        fighter.jumpHeld = false
      }
    } else {
      fighter.vx *= fighter.onGround ? this.friction : this.airFriction
      if (Math.abs(fighter.vx) < 0.08) fighter.vx = 0
    }

    // Apply X movement
    fighter.x += fighter.vx

    // ── STAGE / CAMERA BOUNDS ────────────────────────
    const stageW = this.stageWidth
    if (fighter.x < this.stageLeft) {
      fighter.x = this.stageLeft
      fighter.vx = Math.max(0, fighter.vx)
    }
    if (fighter.x + fighter.w > stageW) {
      fighter.x = stageW - fighter.w
      fighter.vx = Math.min(0, fighter.vx)
    }

    if (camera && !fighter.ignoreCameraBounds) {
      this.clampToCamera(fighter, camera)
    }
  },

  clampToCamera(fighter, camera) {
    const padding = 30
    const zoom = camera.zoom || 1
    const viewW = (typeof window !== "undefined" ? window.innerWidth : 1280) / zoom
    const camX = camera.x || 0

    const left = camX - viewW / 2 + padding
    const right = camX + viewW / 2 - fighter.w - padding

    if (fighter.x < left) {
      fighter.x = left
      fighter.vx = 0
    } else if (fighter.x > right) {
      fighter.x = right
      fighter.vx = 0
    }
  },

  applyGravity(fighter) {
    if (!fighter || fighter.hitstop > 0 || fighter.dashTimer > 0) return

    const floor = fighter.groundY != null ? fighter.groundY : this.groundY

    // Ceiling cap
    if (fighter.y < -200) {
      fighter.y = -200
      fighter.vy = 0
    }

    if ((fighter.onGround || fighter.grounded) && fighter.vy >= 0 && !fighter.isLaunched) {
      fighter.y = floor - fighter.h
      fighter.vy = 0
      return
    }

    fighter.vy += this.gravity
    if (fighter.vy > this.maxFallSpeed) fighter.vy = this.maxFallSpeed
    fighter.y += fighter.vy

    if (fighter.y + fighter.h >= floor) {
      fighter.y = floor - fighter.h
      fighter.vy = 0
      fighter.onGround = true
      fighter.grounded = true
      fighter.isLaunched = false
      fighter.jumpCount = 0
      fighter.airDashCount = 0
    } else {
      fighter.onGround = false
      fighter.grounded = false
    }
  },

  resolvePlayerCollision(p1, p2) {
    if (!p1 || !p2) return

    const dx = (p1.x + p1.w / 2) - (p2.x + p2.w / 2)
    const minX = p1.w / 2 + p2.w / 2
    const dy = Math.abs((p1.y + p1.h / 2) - (p2.y + p2.h / 2))
    const minY = p1.h / 2 + p2.h / 2

    if (Math.abs(dx) < minX && dy < minY) {
      const overlap = minX - Math.abs(dx)
      const dir = dx > 0 ? 1 : -1
      p1.x += (overlap / 2) * dir
      p2.x -= (overlap / 2) * dir
      p1.vx *= 0.5
      p2.vx *= 0.5
    }
  },

  checkHit(a, b) {
    if (!a || !b) return false
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y
  },

  updateAttackBox(fighter) {
    if (!fighter) return
    if (!fighter.attackBox) fighter.attackBox = { x: 0, y: 0, w: 90, h: 40 }

    const w = fighter.attackBox.w || 90
    fighter.attackBox.x = fighter.facing === 1
      ? fighter.x + fighter.w
      : fighter.x - w
    fighter.attackBox.y = fighter.y + 20
  },

  setStageBounds(left, right) {
    this.stageLeft = left || 0
    this.stageWidth = right || 3200
  },

  setGroundY(y) {
    this.groundY = y
  },

  launcherAttack(attacker, target, launchY = -28, selfLift = -16) {
    if (!attacker || !target) return
    target.vy = launchY
    target.onGround = false
    target.isLaunched = true

    if (!attacker.onGround && selfLift < 0) {
      attacker.vy = selfLift
      attacker.isLaunched = true
    }
  },

  airCombo(attacker, target, launchY = -14) {
    if (!attacker || !target) return
    attacker.airHits = attacker.airHits || 0
    attacker.maxAirHits = attacker.maxAirHits || 3
    if (attacker.airHits >= attacker.maxAirHits) return

    target.vy = launchY
    target.onGround = false
    target.isLaunched = true
    attacker.airHits++
  },

  downAirSpike(attacker, target, force = 24) {
    if (!attacker || !target) return
    target.vy = force
    target.onGround = false
    target.isLaunched = true
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
