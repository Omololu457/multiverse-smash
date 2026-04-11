// physics.js
// Core movement, anime-style mechanics, and gravity helpers used by game.js and combat.js

export const physics = {
  // NEW: Increased global gravity and max fall speed for snappier, less "floaty" aerial combat
  gravity: 1.2, 
  groundY: 520,
  friction: 0.75, // Lowered slightly so characters stop faster instead of sliding like they are on ice
  airFriction: 0.95,
  maxFallSpeed: 24,

  moveFighter(fighter, keys = {}, controls = {}) {
    if (!fighter) return
    
    // Freeze all movement instantly during hitstop
    if (fighter.hitstop > 0) return 

    // NEW: Huge default base speed increase (14 instead of 6) so EVERYONE is fast
    const speed = fighter.speed || 14

    // Ensure state variables exist
    if (fighter.vx == null) fighter.vx = 0
    if (fighter.vy == null) fighter.vy = 0
    if (fighter.h == null) fighter.h = fighter.height || 80
    if (fighter.w == null) fighter.w = fighter.width || 50
    
    // NEW: Increased default jump force to fight against the higher gravity
    if (fighter.jumpForce == null) fighter.jumpForce = -(fighter.jump || 18)

    // Multi-jump & Dash state tracking
    if (fighter.jumpCount == null) fighter.jumpCount = 0
    // Reads from stats if available, defaults to 1
    if (fighter.maxJumps == null) fighter.maxJumps = fighter.stats?.maxJumps || 1 
    if (fighter.jumpHeld == null) fighter.jumpHeld = false
    if (fighter.dashTimer == null) fighter.dashTimer = 0
    if (fighter.dashCooldown == null) fighter.dashCooldown = 0
    
    // Apply External Forces (e.g., Gojo's Blue pulling the opponent)
    if (fighter.externalForces && fighter.externalForces.length > 0) {
        fighter.externalForces.forEach(force => {
            fighter.vx += force.x || 0;
            fighter.vy += force.y || 0;
        });
        fighter.externalForces = []; // Clear after applying
    }

    const leftPressed = !!keys[controls.left]
    const rightPressed = !!keys[controls.right]
    const upPressed = !!keys[controls.up]
    const dashPressed = !!keys[controls.dash] // Assuming a dash key/trigger is mapped

    // Cooldown decrements
    if (fighter.dashCooldown > 0) fighter.dashCooldown--

    // Can the player actually input controls right now?
    const canMove = !(fighter.stun > 0 || fighter.hitstun > 0 || fighter.blockstun > 0 || fighter.isGrabbed)

    if (canMove) {
      // Dash Logic
      if (dashPressed && fighter.dashCooldown <= 0) {
          fighter.dashTimer = fighter.dashDuration || 8; // NEW: Shorter, snappier dash animation (8 frames)
          fighter.dashCooldown = fighter.dashCooldownMax || 25; // NEW: Lower cooldown so everyone can dash frequently
      }

      // If dashing, override normal movement with high-speed burst
      if (fighter.dashTimer > 0) {
          fighter.dashTimer--;
          // NEW: Massive default dash speed (28) for an instant "teleport" feel
          fighter.vx = fighter.facing * (fighter.dashSpeed || 28);
          fighter.vy = 0; // Anime dash: suspend gravity momentarily
      } 
      // Normal horizontal movement
      else {
          if (leftPressed && !rightPressed) {
            fighter.vx = -speed
            fighter.facing = -1
          } else if (rightPressed && !leftPressed) {
            fighter.vx = speed
            fighter.facing = 1
          } else {
            // Apply friction if no keys pressed
            fighter.vx *= fighter.onGround ? this.friction : this.airFriction
            if (Math.abs(fighter.vx) < 0.05) fighter.vx = 0
          }
      }

      // Multi-Jump Logic
      if (fighter.onGround) {
          fighter.jumpCount = 0; // Reset jumps on floor
      }

      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps;

      // Ensure you have to let go of the button to jump again
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
      // If stunned, players can't move, BUT they still need friction applied 
      // so knockback gracefully slows down instead of sliding forever.
      fighter.vx *= fighter.onGround ? this.friction : this.airFriction
      if (Math.abs(fighter.vx) < 0.05) fighter.vx = 0
    }

    // Apply horizontal velocity to position (Crucial that this is outside the return block)
    fighter.x += fighter.vx
  },

  applyGravity(fighter) {
    if (!fighter) return
    
    // Freeze gravity during hitstop
    if (fighter.hitstop > 0) return 
    
    // Suspend gravity if performing an anime dash
    if (fighter.dashTimer > 0) return

    if (fighter.vx == null) fighter.vx = 0
    if (fighter.vy == null) fighter.vy = 0
    if (fighter.h == null) fighter.h = fighter.height || 80

    const floor =
      fighter.groundY != null
        ? fighter.groundY
        : fighter.floorY != null
        ? fighter.floorY
        : this.groundY

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
      fighter.jumpCount = 0 // Reset multi-jumps
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

  launcherAttack(attacker, target, launchY = -16, selfLift = -10) { // NEW: Launchers send players higher now
    if (!attacker || !target) return

    target.vy = launchY
    target.onGround = false
    target.grounded = false
    target.ground = false
    target.isLaunched = true

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

  airCombo(attacker, target, launchY = -8) { // NEW: Air combos keep them bouncing slightly higher
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

  downAirSpike(attacker, target, force = 20) { // NEW: Spikes blast them to the ground much faster
    if (!attacker || !target) return

    target.vy = force
    target.onGround = false
    target.grounded = false
    target.ground = false
    target.isLaunched = true
  }
}
