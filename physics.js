// physics.js
// Hyper-Fighter speed tuning (SSF2 / MK1 feel) - High Jump Edition

export const physics = {
  gravity: 1.25,       // Reduced from 2.2 to allow for higher, more fluid arcs
  groundY: 520,
  friction: 0.4, 
  airFriction: 0.92,   // Slightly increased to give better control in the air
  maxFallSpeed: 25,    // Reduced from 35 to prevent the "heavy rock" falling feel

  moveFighter(fighter, keys = {}, controls = {}) {
    if (!fighter) return
    if (fighter.hitstop > 0) return 

    const speed = fighter.speed || 18

    // Initialization of properties
    if (fighter.vx == null) fighter.vx = 0
    if (fighter.vy == null) fighter.vy = 0
    if (fighter.h == null) fighter.h = fighter.height || 80
    if (fighter.w == null) fighter.w = fighter.width || 50
    
    // Jump Stats based on Archetype
    if (fighter.maxJumps == null) fighter.maxJumps = fighter.stats?.maxJumps || 1 
    if (fighter.jumpForce == null) fighter.jumpForce = -(fighter.stats?.jumpPower || 32)
    
    if (fighter.jumpCount == null) fighter.jumpCount = 0
    if (fighter.jumpHeld == null) fighter.jumpHeld = false
    if (fighter.dashTimer == null) fighter.dashTimer = 0
    if (fighter.dashCooldown == null) fighter.dashCooldown = 0
    
    // External Forces (Knockback, etc)
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
      // Dash Logic
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

      // Jump Logic with Archetype Support
      if (fighter.onGround) {
          fighter.jumpCount = 0;
      }

      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps;

      if (upPressed && !fighter.jumpHeld && canJump) {
        fighter.vy = fighter.jumpForce
        fighter.jumpCount++
        fighter.onGround = false
        fighter.grounded = false
        fighter.isLaunched = true // Prevents floor-snapping in applyGravity
        fighter.jumpHeld = true
        fighter.airHits = 0 // Reset air combo counter on new jump
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

    const floor = fighter.groundY != null ? fighter.groundY : this.groundY
    const groundedNow = fighter.onGround || fighter.grounded

    // Ground Snap Check
    if (groundedNow && fighter.vy >= 0 && !fighter.isLaunched) {
      fighter.y = floor - fighter.h
      fighter.vy = 0
      return
    }

    // Apply Gravity
    fighter.vy += this.gravity

    // Cap Fall Speed
    if (fighter.vy > this.maxFallSpeed) {
      fighter.vy = this.maxFallSpeed
    }

    fighter.y += fighter.vy

    // Floor Collision Detection
    if (fighter.y + fighter.h >= floor) {
      fighter.y = floor - fighter.h
      fighter.vy = 0
      fighter.onGround = true
      fighter.grounded = true
      fighter.isLaunched = false
      fighter.jumpCount = 0 
    } else {
      fighter.onGround = false
      fighter.grounded = false
    }
  },

  updateAttackBox(fighter) {
    if (!fighter) return
    if (!fighter.attackBox) {
      fighter.attackBox = { x: 0, y: 0, w: 60, h: 40 }
    }
    const width = fighter.attackBox.w || 60
    fighter.attackBox.x = fighter.x + (fighter.facing === 1 ? fighter.w : -width)
    fighter.attackBox.y = fighter.y + 30
  },

  launcherAttack(attacker, target, launchY = -36, selfLift = -22) { 
    if (!attacker || !target) return
    target.vy = launchY
    target.onGround = false
    target.isLaunched = true

    if (attacker.onGround === false && selfLift < 0) {
      attacker.vy = selfLift
      attacker.isLaunched = true
    } else {
      attacker.vy = 0
      attacker.isLaunched = false
    }
  },

  airCombo(attacker, target, launchY = -18) { 
    if (!attacker || !target) return
    attacker.airHits = attacker.airHits || 0
    attacker.maxAirHits = attacker.maxAirHits || 3
    if (attacker.airHits >= attacker.maxAirHits) return

    target.vy = launchY
    target.onGround = false
    target.isLaunched = true
    attacker.airHits++
  },

  downAirSpike(attacker, target, force = 30) { 
    if (!attacker || !target) return
    target.vy = force
    target.onGround = false
    target.isLaunched = true
  }
}
