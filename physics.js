// physics.js
// Hyper-Fighter speed tuning (SSF2 / MK1 feel) - High Jump Edition

export const physics = {
  gravity: 2.2, 
  groundY: 520,
  friction: 0.4, 
  airFriction: 0.85, 
  maxFallSpeed: 35,

  moveFighter(fighter, keys = {}, controls = {}) {
    if (!fighter) return
    if (fighter.hitstop > 0) return 

    const speed = fighter.speed || 18

    if (fighter.vx == null) fighter.vx = 0
    if (fighter.vy == null) fighter.vy = 0
    if (fighter.h == null) fighter.h = fighter.height || 80
    if (fighter.w == null) fighter.w = fighter.width || 50
    if (fighter.jumpForce == null) fighter.jumpForce = -(fighter.jump || 36)

    if (fighter.jumpCount == null) fighter.jumpCount = 0
    if (fighter.maxJumps == null) fighter.maxJumps = fighter.stats?.maxJumps || 1 
    if (fighter.jumpHeld == null) fighter.jumpHeld = false
    if (fighter.dashTimer == null) fighter.dashTimer = 0
    if (fighter.dashCooldown == null) fighter.dashCooldown = 0
    
    if (fighter.externalForces && fighter.externalForces.length > 0) {
        fighter.externalForces.forEach(force => {
            fighter.vx += force.x || 0;
            fighter.vy += force.y || 0;
        });
        fighter.externalForces = [];
    }

    const leftPressed = !!keys[controls.left]
    const rightPressed = !!keys[controls.right]
    const upPressed = !!keys[controls.up]
    const dashPressed = !!keys[controls.dash]

    if (fighter.dashCooldown > 0) fighter.dashCooldown--

    const canMove = !(fighter.stun > 0 || fighter.hitstun > 0 || fighter.blockstun > 0 || fighter.isGrabbed)

    if (canMove) {
      if (dashPressed && fighter.dashCooldown <= 0) {
          fighter.dashTimer = fighter.dashDuration || 5; 
          fighter.dashCooldown = fighter.dashCooldownMax || 20; 
      }

      if (fighter.dashTimer > 0) {
          fighter.dashTimer--;
          fighter.vx = fighter.facing * (fighter.dashSpeed || 45);
          fighter.vy = 0; 
      } 
      else {
          if (leftPressed && !rightPressed) {
            fighter.vx = -speed
            fighter.facing = -1
          } else if (rightPressed && !leftPressed) {
            fighter.vx = speed
            fighter.facing = 1
          } else {
            fighter.vx *= fighter.onGround ? this.friction : this.airFriction
            if (Math.abs(fighter.vx) < 0.05) fighter.vx = 0
          }
      }

      if (fighter.onGround) {
          fighter.jumpCount = 0;
      }

      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps;

      if (upPressed && !fighter.jumpHeld && canJump) {
        fighter.vy = fighter.jumpForce
        fighter.jumpCount++
        fighter.onGround = false
        fighter.grounded = false
        fighter.ground = false
        fighter.isLaunched = true
        fighter.jumpHeld = true
      } else if (!upPressed) {
        fighter.jumpHeld = false
      }
      
    } else {
      fighter.vx *= fighter.onGround ? this.friction : this.airFriction
      if (Math.abs(fighter.vx) < 0.05) fighter.vx = 0
    }

    fighter.x += fighter.vx
  },

  applyGravity(fighter) {
    if (!fighter) return
    if (fighter.hitstop > 0) return 
    if (fighter.dashTimer > 0) return

    if (fighter.vx == null) fighter.vx = 0
    if (fighter.vy == null) fighter.vy = 0
    if (fighter.h == null) fighter.h = fighter.height || 80

    const floor = fighter.groundY != null ? fighter.groundY : fighter.floorY != null ? fighter.floorY : this.groundY
    const groundedNow = fighter.onGround || fighter.grounded || fighter.ground

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
      fighter.jumpCount = 0 
    } else {
      fighter.onGround = false
      fighter.grounded = false
      fighter.ground = false
    }
  },

  updateAttackBox(fighter) {
    if (!fighter) return
    if (!fighter.attackBox) {
      fighter.attackBox = { x: fighter.x || 0, y: fighter.y || 0, w: 60, h: 40 }
    }
    const width = fighter.attackBox.w || 60
    fighter.attackBox.x = (fighter.x || 0) + (fighter.facing === 1 ? (fighter.w || 0) : -width)
    fighter.attackBox.y = (fighter.y || 0) + 30
  },

  launcherAttack(attacker, target, launchY = -36, selfLift = -22) { 
    if (!attacker || !target) return
    target.vy = launchY
    target.onGround = false
    target.grounded = false
    target.ground = false
    target.isLaunched = true

    const attackerAirborne = attacker.isJumping || attacker.inAir || attacker.airborne || attacker.onGround === false
    if (attackerAirborne && selfLift < 0) {
      attacker.vy = selfLift
      attacker.isLaunched = true
    } else {
      attacker.vy = 0
      attacker.isLaunched = false
    }
    attacker.airHits = 0
  },

  airCombo(attacker, target, launchY = -18) { 
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

  downAirSpike(attacker, target, force = 30) { 
    if (!attacker || !target) return
    target.vy = force
    target.onGround = false
    target.grounded = false
    target.ground = false
    target.isLaunched = true
  }
}
