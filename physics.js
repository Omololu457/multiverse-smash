// physics.js
// Core movement + gravity helpers used by game.js and combat.js

export const physics = {
  gravity: 0.7,
  groundY: 520,
  friction: 0.8,
  airFriction: 0.96,
  maxFallSpeed: 18,

  moveFighter(fighter, keys = {}, controls = {}) {
    if (!fighter) return

    const speed = fighter.speed || 6

    if (fighter.vx == null) fighter.vx = 0
    if (fighter.vy == null) fighter.vy = 0
    if (fighter.h == null) fighter.h = fighter.height || 80
    if (fighter.w == null) fighter.w = fighter.width || 50

    if (fighter.jumpForce == null) {
      fighter.jumpForce = -(fighter.jump || 14)
    }

    const leftPressed = !!keys[controls.left]
    const rightPressed = !!keys[controls.right]
    const upPressed = !!keys[controls.up]

    if (fighter.stun > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) {
      return
    }

    if (leftPressed && !rightPressed) {
      fighter.vx = -speed
      fighter.facing = -1
    } else if (rightPressed && !leftPressed) {
      fighter.vx = speed
      fighter.facing = 1
    } else {
      fighter.vx *= fighter.onGround ? this.friction : this.airFriction

      if (Math.abs(fighter.vx) < 0.05) {
        fighter.vx = 0
      }
    }

    const canJump =
      fighter.canJump !== false &&
      (fighter.onGround || fighter.grounded || fighter.ground)

    if (upPressed && canJump) {
      fighter.vy = fighter.jumpForce
      fighter.onGround = false
      fighter.grounded = false
      fighter.ground = false
      fighter.isLaunched = true
    }

    fighter.x += fighter.vx
  },

  applyGravity(fighter) {
    if (!fighter) return

    if (fighter.vx == null) fighter.vx = 0
    if (fighter.vy == null) fighter.vy = 0
    if (fighter.h == null) fighter.h = fighter.height || 80

    const floor =
      fighter.groundY != null
        ? fighter.groundY
        : fighter.floorY != null
        ? fighter.floorY
        : this.groundY

    // Keep grounded fighters locked to the floor unless they are actually jumping/launched
    const groundedNow =
      fighter.onGround || fighter.grounded || fighter.ground

    if (groundedNow && fighter.vy >= 0 && !fighter.isLaunched) {
      fighter.y = floor - fighter.h
      fighter.vy = 0
      fighter.onGround = true
      fighter.grounded = true
      fighter.ground = true
      return
    }

    fighter.vy += this.gravity

    if (fighter.vy > this.maxFallSpeed) {
      fighter.vy = this.maxFallSpeed
    }

    fighter.y += fighter.vy

    if (fighter.y + fighter.h >= floor) {
      fighter.y = floor - fighter.h
      fighter.vy = 0
      fighter.onGround = true
      fighter.grounded = true
      fighter.ground = true
      fighter.isLaunched = false
    } else {
      fighter.onGround = false
      fighter.grounded = false
      fighter.ground = false
    }
  },

  updateAttackBox(fighter) {
    if (!fighter) return

    if (!fighter.attackBox) {
      fighter.attackBox = {
        x: fighter.x || 0,
        y: fighter.y || 0,
        w: 60,
        h: 40
      }
    }

    const width = fighter.attackBox.w || 60

    fighter.attackBox.x =
      (fighter.x || 0) + (fighter.facing === 1 ? (fighter.w || 0) : -width)

    fighter.attackBox.y = (fighter.y || 0) + 30
  },

  launcherAttack(attacker, target, launchY = -12, selfLift = 0) {
    if (!attacker || !target) return

    target.vy = launchY
    target.onGround = false
    target.grounded = false
    target.ground = false
    target.isLaunched = true

    // Do not lift grounded attacker
    const attackerAirborne =
      attacker.isJumping ||
      attacker.inAir ||
      attacker.airborne ||
      attacker.onGround === false

    if (attackerAirborne && selfLift < 0) {
      attacker.vy = selfLift
      attacker.isLaunched = true
    } else {
      attacker.vy = 0
      attacker.isLaunched = false
    }

    attacker.airHits = 0
  },

  airCombo(attacker, target, launchY = -6) {
    if (!attacker || !target) return

    attacker.airHits = attacker.airHits || 0
    attacker.maxAirHits = attacker.maxAirHits || 3

    if (attacker.airHits >= attacker.maxAirHits) return

    target.vy = launchY
    target.onGround = false
    target.grounded = false
    target.ground = false
    target.isLaunched = true

    attacker.airHits++
  },

  downAirSpike(attacker, target, force = 14) {
    if (!attacker || !target) return

    target.vy = force
    target.onGround = false
    target.grounded = false
    target.ground = false
    target.isLaunched = true
  }
}
