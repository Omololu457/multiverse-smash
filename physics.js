/**
 * PHYSICS ENGINE - High Jump + Screen Clamping + Collision Edition
 * Handles movement, gravity, player-to-player pushing, and hitbox detection.
 */
export const physics = {
  gravity: 1.25,
  groundY: 520,
  friction: 0.4, 
  airFriction: 0.92,
  maxFallSpeed: 25,

  moveFighter(fighter, keys = {}, controls = {}, camera = null) {
    if (!fighter) return;
    if (fighter.hitstop > 0) return; 

    const speed = fighter.speed || 18;

    // Initialization of missing properties
    if (fighter.vx == null) fighter.vx = 0;
    if (fighter.vy == null) fighter.vy = 0;
    if (fighter.h == null) fighter.h = fighter.height || 80;
    if (fighter.w == null) fighter.w = fighter.width || 50;
    
    if (fighter.maxJumps == null) fighter.maxJumps = fighter.stats?.maxJumps || 1; 
    if (fighter.jumpForce == null) fighter.jumpForce = -(fighter.stats?.jumpPower || 32);
    
    if (fighter.jumpCount == null) fighter.jumpCount = 0;
    if (fighter.jumpHeld == null) fighter.jumpHeld = false;
    if (fighter.dashTimer == null) fighter.dashTimer = 0;
    if (fighter.dashCooldown == null) fighter.dashCooldown = 0;
    
    // External Forces (Knockback/Wind)
    if (fighter.externalForces && fighter.externalForces.length > 0) {
        fighter.externalForces.forEach(force => {
            fighter.vx += force.x || 0;
            fighter.vy += force.y || 0;
        });
        fighter.externalForces = [];
    }

    const leftPressed = !!keys[controls.left];
    const rightPressed = !!keys[controls.right];
    const upPressed = !!keys[controls.up];
    const dashPressed = !!keys[controls.dash];

    if (fighter.dashCooldown > 0) fighter.dashCooldown--;

    const canMove = !(fighter.stun > 0 || fighter.hitstun > 0 || fighter.blockstun > 0 || fighter.isGrabbed);

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
            fighter.vx = -speed;
            fighter.facing = -1;
          } else if (rightPressed && !leftPressed) {
            fighter.vx = speed;
            fighter.facing = 1;
          } else {
            fighter.vx *= fighter.onGround ? this.friction : this.airFriction;
            if (Math.abs(fighter.vx) < 0.05) fighter.vx = 0;
          }
      }

      // Jump Logic
      if (fighter.onGround) fighter.jumpCount = 0;
      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps;

      if (upPressed && !fighter.jumpHeld && canJump) {
        fighter.vy = fighter.jumpForce;
        fighter.jumpCount++;
        fighter.onGround = false;
        fighter.isLaunched = true; 
        fighter.jumpHeld = true;
        fighter.airHits = 0; 
      } else if (!upPressed) {
        fighter.jumpHeld = false;
      }
      
    } else {
      // Apply friction even when stunned (momentum bleed)
      fighter.vx *= fighter.onGround ? this.friction : this.airFriction;
      if (Math.abs(fighter.vx) < 0.05) fighter.vx = 0;
    }

    // Apply horizontal velocity
    fighter.x += fighter.vx;

    // Boundary Clamping
    if (camera && !fighter.ignoreCameraBounds) {
        this.clampToCamera(fighter, camera);
    }
  },

  clampToCamera(fighter, camera) {
    const padding = 20;
    const viewWidth = window.innerWidth / (camera.zoom || 1);
    const leftEdge = (camera.x || 0) - viewWidth / 2 + padding;
    const rightEdge = (camera.x || 0) + viewWidth / 2 - fighter.w - padding;

    if (fighter.x < leftEdge) {
        fighter.x = leftEdge;
        fighter.vx = 0;
    } else if (fighter.x > rightEdge) {
        fighter.x = rightEdge;
        fighter.vx = 0;
    }
  },

  applyGravity(fighter) {
    if (!fighter || fighter.hitstop > 0 || fighter.dashTimer > 0) return;
    const floor = fighter.groundY != null ? fighter.groundY : this.groundY;
    
    if ((fighter.onGround || fighter.grounded) && fighter.vy >= 0 && !fighter.isLaunched) {
      fighter.y = floor - fighter.h;
      fighter.vy = 0;
      return;
    }

    fighter.vy += this.gravity;
    if (fighter.vy > this.maxFallSpeed) fighter.vy = this.maxFallSpeed;
    fighter.y += fighter.vy;

    if (fighter.y + fighter.h >= floor) {
      fighter.y = floor - fighter.h;
      fighter.vy = 0;
      fighter.onGround = true;
      fighter.grounded = true;
      fighter.isLaunched = false;
      fighter.jumpCount = 0; 
    } else {
      fighter.onGround = false;
      fighter.grounded = false;
    }
  },

  // NEW: Resolves players walking into/through each other
  resolvePlayerCollision(p1, p2) {
    const p1Center = p1.x + p1.w / 2;
    const p2Center = p2.x + p2.w / 2;
    const distanceX = p1Center - p2Center;
    const minDistanceX = (p1.w / 2 + p2.w / 2);

    const distanceY = Math.abs((p1.y + p1.h / 2) - (p2.y + p2.h / 2));
    const minDistanceY = (p1.h / 2 + p2.h / 2);

    // If both X and Y overlap, push them apart on X
    if (Math.abs(distanceX) < minDistanceX && distanceY < minDistanceY) {
        const overlap = minDistanceX - Math.abs(distanceX);
        const dir = distanceX > 0 ? 1 : -1;
        
        p1.x += (overlap / 2) * dir;
        p2.x -= (overlap / 2) * dir;
        
        // Minor velocity adjustment to prevent "shaking"
        p1.vx *= 0.5;
        p2.vx *= 0.5;
    }
  },

  // NEW: Generic Hitbox Overlap Check (AABB)
  checkHit(attackerBox, targetBody) {
    return (
        attackerBox.x < targetBody.x + targetBody.w &&
        attackerBox.x + attackerBox.w > targetBody.x &&
        attackerBox.y < targetBody.y + targetBody.h &&
        attackerBox.y + attackerBox.h > targetBody.y
    );
  },

  updateAttackBox(fighter) {
    if (!fighter) return;
    if (!fighter.attackBox) fighter.attackBox = { x: 0, y: 0, w: 90, h: 40 };
    const width = fighter.attackBox.w || 90;
    
    // Positions the hitbox in front of the player based on 'facing'
    fighter.attackBox.x = (fighter.facing === 1) 
        ? fighter.x + fighter.w 
        : fighter.x - width;
    
    fighter.attackBox.y = fighter.y + 20; // Center-ish height
  },

  // Combat Interactions
  launcherAttack(attacker, target, launchY = -36, selfLift = -22) { 
    if (!attacker || !target) return;
    target.vy = launchY;
    target.onGround = false;
    target.isLaunched = true;
    
    if (attacker.onGround === false && selfLift < 0) {
      attacker.vy = selfLift;
      attacker.isLaunched = true;
    }
  },

  airCombo(attacker, target, launchY = -18) { 
    if (!attacker || !target) return;
    attacker.airHits = attacker.airHits || 0;
    attacker.maxAirHits = attacker.maxAirHits || 3;
    if (attacker.airHits >= attacker.maxAirHits) return;

    target.vy = launchY;
    target.onGround = false;
    target.isLaunched = true;
    attacker.airHits++;
  },

  downAirSpike(attacker, target, force = 30) { 
    if (!attacker || !target) return;
    target.vy = force;
    target.onGround = false;
    target.isLaunched = true;
  }
}
