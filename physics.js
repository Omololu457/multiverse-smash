/**
 * PHYSICS ENGINE — unified version
 * Movement, gravity, dash (ground + air), collision, knockback, bounds.
 *
 * BEN 10: This file auto-drives the Omnitrix so you DON'T need to edit game.js.
 *  - First frame a "ben10" fighter moves, setupBen10() runs automatically.
 *  - updateOmnitrix() ticks the transform cooldown every frame.
 *  - Pressing the "charge" button (default: C for P1, 8 for P2) cycles aliens.
 *
 * Triple jump: only TRIPLE_JUMP_CHARACTERS get a 3rd jump; Ben 10 speed aliens
 * carry their own maxJumps. Air ceiling raised for triple jumps / air combos.
 */

import { setupBen10, updateOmnitrix } from "./fighters.js"

// Characters that get a third jump. Keyed by rosterKey / id / name (lowercase).
const TRIPLE_JUMP_CHARACTERS = new Set(["toji", "gojo", "sukuna"])

export const physics = {
  gravity: 0.85,
  groundY: 520,
  friction: 0.72,
  airFriction: 0.88,
  // Combo momentum preservation (combo-flow Stage 4): the gentler ground friction used while a fighter
  // is mid-combo-string attacking, so inbound velocity CARRIES through the swing instead of braking to a
  // stop — combos read as one continuous forward motion. Closer to 1 = more glide. TUNE HERE.
  attackMomentumFriction: 0.90,
  maxFallSpeed: 22,
  stageWidth: 3200,
  stageLeft: 0,

  moveFighter(fighter, keys = {}, controls = {}, camera = null) {
    if (!fighter || fighter.hitstop > 0) return

    // ── BEN 10 OMNITRIX (self-driving setup) ──────────
    // Auto-setup on first frame from the player's chosen 5-alien loadout, then
    // tick the transform cooldown. The actual SWITCH input (charge + direction /
    // number keys) is handled in game.js, where the full input state is known.
    // Ben 10 and his clone Albedo (Ultimatrix) share the same transform device.
    if (fighter.rosterKey === "ben10" || fighter.rosterKey === "albedo") {
      if (!fighter.omnitrix) setupBen10(fighter, fighter.selectedAliens || undefined)
      updateOmnitrix(fighter)
    }

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

    // ── TRIPLE JUMP ALLOWLIST ────────────────────────
    const _key = (fighter.rosterKey || fighter.id || fighter.name || "").toLowerCase()
    if (TRIPLE_JUMP_CHARACTERS.has(_key)) {
      fighter.maxJumps = Math.max(fighter.maxJumps || 0, 3)
    }

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
    // Jump reads the dedicated jump binding first, falling back to `up` for
    // maps that share one key (the live P1/P2 maps set up===jump). This keeps
    // jumping correct even if a future config splits the two bindings.
    const U = !!(keys[controls.jump] || keys[controls.up])
    // Dash = double-tap A/D (game.js sets _dashTap; there is no dash KEY anymore).
    // Six Eyes Focus binding vow disables dashing.
    const dash = (!!keys[controls.dash] || !!fighter._dashTap) && !fighter.noDash
    fighter._dashTap = false   // one-shot: consume the double-tap this frame

    if (fighter.dashCooldown > 0) fighter.dashCooldown--
    if (fighter.airDashTimer > 0 && --fighter.airDashTimer <= 0) fighter.airDashing = false

    const canMove = !(
      fighter.stun > 0 ||
      fighter.hitstun > 0 ||
      fighter.blockstun > 0 ||
      fighter.isGrabbed ||
      fighter._rooted ||          // opt-in root (e.g. Sasuke's lightning handseals) — defaults falsy → no effect
      fighter.isCharging ||       // UNIVERSAL: holding a charge = fully committed → no walk/jump/dash (every char)
      fighter._tauntPlaying       // committed taunt = fully locked (Rick's channel-payoff)
    )

    const air = !fighter.onGround

    // ── MOVEMENT ─────────────────────────────────────
    if (canMove) {
      const maxAirDash = (fighter.stats?.mobility === "very_high") ? 2 : 1

      if (air && dash && fighter.airDashCount < maxAirDash && fighter.dashCooldown <= 0) {
        fighter.vx = (fighter.facing || 1) * (fighter.dashSpeed || 14) * 0.8
        fighter.vy = 0
        fighter.airDashCount++
        fighter.airDashing = true
        fighter.airDashTimer = 10
        fighter.dashCooldown = 22
      }
      else if (!air && dash && fighter.dashCooldown <= 0) {
        fighter.dashTimer = fighter.dashDuration || 8
        fighter.dashCooldown = fighter.dashCooldownMax || 28
        // Binding vow (Toji — Assassin's Oath): i-frames at dash start.
        if (fighter.dashInvuln) fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, fighter.dashDuration || 8)
      }

      if (!air && fighter.dashTimer > 0) {
        fighter.dashTimer--
        const dashSpeed = clamp((fighter.dashSpeed || 14) * 0.55, 8, 16)
        fighter.vx = (fighter.facing || 1) * dashSpeed
        fighter.vy = 0
      } else if (!fighter.airDashing) {
        // FLASH TIME (Flash's ultimate): he moves too fast to stop on a dime. While active he ZIPS at a
        // raised top speed (past the normal clamp) and, on release, KEEPS his momentum and skids to a stop
        // over many frames (a much gentler ground friction) — the "overshoot / momentum imprecision on stop"
        // the design calls for. Gated on _flashTimeActive → zero effect on every other fighter / normal play.
        const flashTime = !!fighter._flashTimeActive
        const FT_ZIP = 14, FT_SKID_FRIC = 0.90
        if (L && !R) {
          fighter.vx = flashTime ? -FT_ZIP : -speed
          fighter.facing = -1
        } else if (R && !L) {
          fighter.vx = flashTime ? FT_ZIP : speed
          fighter.facing = 1
        } else {
          // Combo momentum preservation (combo-flow Stage 4): while ATTACKING AND MOVING FORWARD (velocity
          // in the facing direction — "stepping into" the attack), use a GENTLER ground friction so the
          // inbound velocity carries through the swing — a forward combo reads as one continuous motion
          // instead of braking to a dead stop. Only FORWARD momentum is preserved: a retreating / back-input
          // attack (e.g. a Back+Light rekka opener) brakes normally, so it can't drift the attacker out of
          // its own range. A STANDING attack has vx≈0 → unchanged. Idle (not attacking) keeps the 0.72 brake.
          const steppingIn = fighter.attacking && (fighter.vx * (fighter.facing || 1)) > 0
          const fric = fighter.onGround
            ? (flashTime ? FT_SKID_FRIC : (steppingIn ? this.attackMomentumFriction : this.friction))
            : this.airFriction
          fighter.vx *= fric
          if (Math.abs(fighter.vx) < (flashTime ? 0.25 : 0.08)) fighter.vx = 0
        }
      }

      // Jump
      if (fighter.onGround) fighter.jumpCount = 0

      // Up and Jump share a key. If the player holds an ATTACK button while
      // grounded, treat Up as an UP-ATTACK (launcher) instead of a jump — this
      // keeps the launcher reachable. Combat reads onGround to start the up
      // attack, so we must NOT leave the ground in that case.
      const attackHeld = !!(keys[controls.light] || keys[controls.heavy])
      const suppressJumpForUpAttack = fighter.onGround && attackHeld
      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps

      if (U && !fighter.jumpHeld && canJump && !suppressJumpForUpAttack) {
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
    let boundL = this.stageLeft
    let boundR = stageW

    // GIANT-SUMMON HALF-ARENA CONFINEMENT (e.g. Sasuke's Susanoo): while active,
    // restrict THIS fighter to the half of the stage it activated in — a body that
    // size shouldn't roam the whole map. The anchor half is latched once on the
    // first frame (based on where the fighter stood at activation) so it never
    // teleports across. Opponent is untouched (flag is per-fighter). Cleared by the
    // ability on revert.
    if (fighter._susanooActive) {
      const mid = this.stageLeft + (stageW - this.stageLeft) * 0.5
      if (fighter._arenaHalfLock == null) {
        fighter._arenaHalfLock = (fighter.x + fighter.w / 2) < mid ? "left" : "right"
      }
      if (fighter._arenaHalfLock === "left") boundR = mid
      else boundL = mid
    }

    if (fighter.x < boundL) {
      fighter.x = boundL
      fighter.vx = Math.max(0, fighter.vx)
    }
    if (fighter.x + fighter.w > boundR) {
      fighter.x = boundR - fighter.w
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

    // Ceiling cap — raised so triple jumps + air combos have headroom.
    if (fighter.y < -360) {
      fighter.y = -360
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

    // ── Launch the TARGET into the air for a juggle ──
    // A MODERATE, guaranteed pop-up (even if the move's knockbackY is weak, e.g.
    // -8). Kept moderate on purpose so the enemy doesn't sail out of reach — the
    // point is a follow-up air combo, not a launch-to-the-moon.
    const targetLaunch = Math.min(launchY ?? -17, -17)
    target.vy = targetLaunch
    target.onGround = false
    target.isLaunched = true
    target.jumpCount = 0

    // ── Lift the ATTACKER up WITH the target (always, not just when airborne) ──
    // Rise almost as high as the target — only ~2px/frame slower — so the two
    // stay vertically close and the air follow-up reliably connects, with the
    // enemy kept just above for an upward juggle. selfLift is the high floor.
    const selfRise = Math.max(selfLift ?? -16, targetLaunch + 2)
    attacker.vy = selfRise

    // Drift the attacker TOWARD the enemy so they track them up into the juggle
    // (the enemy keeps a small forward push from the hit, so chase a bit faster).
    // This closes any horizontal gap and makes the air follow-up forgiving.
    const toward = attacker.facing || (target.x >= attacker.x ? 1 : -1)
    attacker.vx = toward * 4
    attacker.onGround = false
    attacker.isLaunched = false   // attacker is comboing, not hit-stunned
    attacker.jumpCount = 0         // refresh jumps so they can chase / double-jump
    attacker.airHits = 0           // reset air-combo counter for the follow-up
    attacker.airDashCount = 0
    // The player is almost certainly still HOLDING Up (it shares the attack
    // input). Mark the jump as held so that held Up doesn't instantly burn a
    // double-jump and fling the attacker out of juggle range — they must release
    // and re-press Up to actually jump in the air.
    attacker.jumpHeld = true
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
