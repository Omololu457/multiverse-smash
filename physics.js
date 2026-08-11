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
const TRIPLE_JUMP_CHARACTERS = new Set(["gojo", "sukuna"])

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
  // Omni-Man FLIGHT (Stage 3): free 8-directional hover speed while _flightActive. Set NOTICEABLY
  // above his ground movement (walk clamps ≤9, dash ≈10) so Flight reads as genuinely quick — a
  // dash-tier airborne mover (Fix #5). This is a real movement VELOCITY (sets vx/vy directly), not an
  // animation-speed change. Gated on _flightActive → zero effect on any other fighter.
  flightSpeed: 13,

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
    // MK-feel Stage 4a: real SPEED-TIER spread. The old `rawSpeed*0.09` gave only ~7.0–8.8 across the
    // 78–98 stat band (~18% spread). This maps the band linearly to a true 2× spread: 78→4.5, 98→9.5.
    // The clamp is KEPT (and widened to [4.5, 9.5]) — it is load-bearing, NOT cosmetic:
    //   • it preserves the intended endpoints for the 78–98 roster band (every in-band value is unchanged
    //     from the bare formula), AND
    //   • it protects the out-of-band cases the old [4,9] clamp caught — buff forms that SET fighter.speed
    //     to raw-scale values (Godspeed 120→cap 9.5, Gon-adult 40→floor 4.5 "lumber"), plus the low
    //     placeholders (Ben10 human 5, Morty 72) which would otherwise go negative / below-floor.
    const speed = clamp(4.5 + (rawSpeed - 78) / 20 * 5, 4.5, 9.5)

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
    const D = !!keys[controls.down]   // Omni-Man flight: down = descend
    // Jump reads the dedicated jump binding first, falling back to `up` for
    // maps that share one key (the live P1/P2 maps set up===jump). This keeps
    // jumping correct even if a future config splits the two bindings.
    const U = !!(keys[controls.jump] || keys[controls.up])
    // Dash = double-tap A/D (game.js sets _dashTap; there is no dash KEY anymore).
    // Six Eyes Focus binding vow disables dashing.
    const dash = (!!keys[controls.dash] || !!fighter._dashTap) && !fighter.noDash
    fighter._dashTap = false   // one-shot: consume the double-tap this frame

    if (fighter.dashCooldown > 0) fighter.dashCooldown--
    if (fighter.airDashTimer > 0 && --fighter.airDashTimer <= 0) { fighter.airDashing = false; fighter._dashDirIdx = null }

    const canMove = !(
      fighter.stun > 0 ||
      fighter.hitstun > 0 ||
      fighter.blockstun > 0 ||
      fighter.isGrabbed ||
      fighter._rooted ||          // opt-in root (e.g. Sasuke's lightning handseals) — defaults falsy → no effect
      fighter.isCharging ||       // UNIVERSAL: holding a charge = fully committed → no walk/jump/dash (every char)
      fighter._forcedDescent ||   // Omni-Man crashing out of the sky (Smart Atoms depleted) — no control
      (fighter._descentLandTimer > 0) ||   // …and the crash-landing recovery window — fully vulnerable
      fighter._tauntPlaying       // committed taunt = fully locked (Rick's channel-payoff)
    )

    const air = !fighter.onGround

    // ── OMNI-MAN FLIGHT ──────────────────────────────
    // Toggleable movement MODE that REPLACES the jump: free 8-directional hover instead of a jump arc.
    // Sets velocities directly (gravity is skipped for him in applyGravity); x/y integrate below/there.
    if (fighter._flightActive && canMove) {
      const fs = this.flightSpeed
      if (L && !R)      { fighter.vx = -fs; fighter.facing = -1 }
      else if (R && !L) { fighter.vx =  fs; fighter.facing =  1 }
      else              { fighter.vx *= 0.65; if (Math.abs(fighter.vx) < 0.15) fighter.vx = 0 }   // hover-glide to a stop
      if (U && !D)      fighter.vy = -fs
      else if (D && !U) fighter.vy =  fs
      else            { fighter.vy *= 0.65; if (Math.abs(fighter.vy) < 0.15) fighter.vy = 0 }
      fighter.jumpHeld = !!U   // consume the jump key so disengaging doesn't insta-jump
    }
    // ── MOVEMENT ─────────────────────────────────────
    else if (canMove) {
      const maxAirDash = (fighter.stats?.mobility === "very_high") ? 2 : 1

      if (air && dash && fighter.airDashCount < maxAirDash && fighter.dashCooldown <= 0) {
        const adSpd = (fighter.dashSpeed || 14) * 0.8
        // ICHIGO 8-WAY AERIAL DASH (traits.directionalDash): the air-dash follows the HELD direction
        // (up / down / diagonals), not just facing. Diagonals are length-normalized so a diagonal dash
        // isn't faster than a cardinal one. _dashDirIdx maps to the ichigo_dash_But_in_different_directions
        // strip (sprite.js pins that frame). Everyone else keeps the plain horizontal air-dash below.
        if (fighter.traits?.directionalDash) {
          const fwd = fighter.facing || 1   // capture BEFORE any change — facing stays toward the opponent
          let hx = (R ? 1 : 0) - (L ? 1 : 0)
          const hy = (D ? 1 : 0) - (U ? 1 : 0)
          if (hx === 0 && hy === 0) hx = fwd   // no direction held → dash forward
          const norm = (hx && hy) ? Math.SQRT1_2 : 1
          fighter.vx = hx * adSpd * norm       // world-space velocity; a back-dash retreats without turning
          fighter.vy = hy * adSpd * norm
          // strip order: 0 up · 1 down · 2 down-fwd · 3 up-fwd · 4 level-fwd · 5 back (relative to facing)
          fighter._dashDirIdx =
            (hx === 0 && hy < 0) ? 0 :
            (hx === 0 && hy > 0) ? 1 :
            (hy > 0 && hx === fwd) ? 2 :
            (hy < 0 && hx === fwd) ? 3 :
            (hx === -fwd) ? 5 : 4
        } else {
          fighter.vx = (fighter.facing || 1) * adSpd
          fighter.vy = 0
        }
        fighter.airDashCount++
        fighter.airDashing = true
        fighter.airDashTimer = 10
        fighter.dashCooldown = 22
      }
      else if (!air && dash && fighter.dashCooldown <= 0) {
        fighter.dashTimer = fighter.dashDuration || 8
        fighter.dashCooldown = fighter.dashCooldownMax || 28
        // Optional binding-vow effect: i-frames at dash start (set via fighter.dashInvuln).
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
        // AMBER identity: slightly higher ground movement speed (skin modifier; see GHOSTFACE_SKIN_MODS).
        // (This engine ties facing to the walk direction, so the bonus applies to ground walk speed.)
        const walkSpeed = fighter._gfSkinMod?.fwdSpeedScale ? speed * fighter._gfSkinMod.fwdSpeedScale : speed
        if (L && !R) {
          fighter.vx = flashTime ? -FT_ZIP : -walkSpeed
          fighter.facing = -1
        } else if (R && !L) {
          fighter.vx = flashTime ? FT_ZIP : walkSpeed
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
      // LAUNCHER JUMP-CANCEL (MK-feel Stage 1b): a connected up-attack (launcher) is in its recovery
      // and no longer self-lifts the attacker. A deliberate jump press CANCELS that recovery and leaps
      // up to start the juggle — the follow-up is now a player input, not an automatic carry. Allow the
      // jump even while an attack button is held (the launcher already fired) so the cancel is reliable.
      const launcherJC = !!(fighter.attacking && fighter.currentAttack &&
                            fighter.currentAttack.launcher && fighter.currentAttack.hasHit)
      const suppressJumpForUpAttack = fighter.onGround && attackHeld && !launcherJC
      const canJump = fighter.canJump !== false && fighter.jumpCount < fighter.maxJumps

      if (U && !fighter.jumpHeld && canJump && !suppressJumpForUpAttack) {
        if (launcherJC) {
          // Cancel the launcher's recovery into this pursuit jump.
          fighter.attacking     = false
          fighter.currentAttack = null
          fighter.currentMove   = null
          fighter.attackCooldown = 0
        }
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

    // OMNI-MAN FLIGHT (Stage 3): while flying, NO gravity — integrate the flight-controlled vy directly
    // and clamp to the arena's vertical bounds (can't hover through the floor or past the ceiling). He
    // stays airborne (onGround false) even at floor level, so toggling off drops him cleanly.
    if (fighter._flightActive) {
      fighter.y += fighter.vy || 0
      if (fighter.y + fighter.h > floor) { fighter.y = floor - fighter.h; if (fighter.vy > 0) fighter.vy = 0 }
      if (fighter.y < -360)              { fighter.y = -360;              if (fighter.vy < 0) fighter.vy = 0 }
      fighter.onGround = false; fighter.grounded = false; fighter.isLaunched = false
      return
    }

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

    // JUGGLE GRAVITY (MK-feel Stage 1b): each air hit landed on a juggled opponent bumps their
    // juggleCount (combat.js), which RAMPS gravity here — every successive air hit drops the target
    // faster, so juggles self-terminate instead of floating forever. Reset to 0 on ground contact below.
    fighter.vy += this.gravity * (1 + (fighter.juggleCount || 0) * 0.12)
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
      fighter.juggleCount = 0        // landed → the juggle is over, gravity ramp resets
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

  launcherAttack(attacker, target, launchY = -28, selfLift = -16, opts = {}) {
    if (!attacker || !target) return

    // ── Launch the TARGET into the air for a juggle (MK-feel Stage 2a: RAISED launch height) ──
    // The pop-up used to be kept MODERATE — a -17 floor for un-tuned launchers, and lighter -11..-13
    // "archetype" pops for the tuned (opts.exact) launchers — so the enemy didn't sail out of reach.
    // Now that JUGGLE GRAVITY (Stage 1b) ramps the fall (each air hit drops the target faster), we can
    // launch HIGHER without floating them away. A SINGLE raised floor now applies to EVERY launcher: any
    // per-char launchVy less negative than the floor is lifted to it; a char tuning even higher is honored.
    // (opts.exact no longer changes launch height — the attacker self-lift it also governed is unused post-1b.)
    const LAUNCH_FLOOR = -26
    let targetLaunch = Math.min(launchY ?? LAUNCH_FLOOR, LAUNCH_FLOOR)
    // GIANT TARGET resist (Susanoo, Adult Gon — anyone with the universal `_canvasHeightFrac`
    // giant marker): a towering body is far harder to pop, so its launch velocity is halved. Their tall
    // hurtbox already makes the standard pop read wrong (a child-height hop on a giant); this scales the
    // vy "to their larger size" per the Up-Attack spec's giant note, shared across the whole roster.
    if (target._canvasHeightFrac) targetLaunch = Math.round(targetLaunch * 0.5)
    target.vy = targetLaunch
    target.onGround = false
    target.isLaunched = true
    target.jumpCount = 0

    // ── PLANTED GIANT attacker: do NOT self-pop ──
    // A giant/planted fighter (canJump === false, e.g. Adult Gon / a Susanoo mode) must stay grounded —
    // hopping a giant into the air on its own Up-Attack contradicts the planted-giant identity. It still
    // launches the ENEMY above; it just doesn't leave the floor itself (so there's no self-juggle it
    // can't follow up on anyway, since it can't jump). airHits still resets for any air hits it can land.
    const plantedGiant = !!attacker._canvasHeightFrac || attacker.canJump === false
    if (plantedGiant) {
      attacker.airHits = 0
      attacker.jumpHeld = true
      return
    }

    // ── The ATTACKER stays GROUNDED — NO auto-lift, NO auto-drift (MK-feel Stage 1b) ──
    // The launcher used to self-pop the attacker up WITH the target and drift them toward it,
    // auto-carrying them into the juggle with zero input. That automatic system-driven juggle is
    // GONE: the attacker keeps their feet on the floor. To convert, the player must JUMP-CANCEL the
    // launcher's recovery (a deliberate jump press — see moveFighter's jump block) and pursue with a
    // real air normal. selfLift / opts.exact selfVy are intentionally no longer applied to the attacker.
    // We STILL refresh jumps + reset the air-combo counter here so the jump-cancel + follow-up work.
    attacker.jumpCount   = 0        // refresh jumps so the jump-cancel / double-jump chase is available
    attacker.airHits     = 0        // reset air-combo counter for the follow-up
    attacker.airDashCount = 0
    // Latch the jump as "held" so a shared/held Up doesn't instantly auto-jump the frame the launcher
    // connects — the player must make a fresh, deliberate jump press to convert (the jump-cancel).
    attacker.jumpHeld = true
  },

  // AERIAL FOLLOW-UP in a juggle. Counts the hit toward the attacker's air-combo
  // limit (maxAirHits, default 3, shared roster-wide). UNDER the limit: re-loft the
  // target a touch (small negative vy) so they stay airborne and the string can
  // continue — returns true. AT/OVER the limit: do NOT re-loft; instead push the
  // target DOWNWARD so they fall out of the juggle faster ("fall faster after the
  // air-combo limit") — returns false. The hit still lands & deals damage (resolved
  // by the caller before this); this only governs the launch/float behavior.
  // The counter resets on landing (applyGravity) and on the next launcher opener.
  airCombo(attacker, target, launchY = -6) {
    if (!attacker || !target) return false
    attacker.airHits = attacker.airHits || 0
    attacker.maxAirHits = attacker.maxAirHits || 3

    if (attacker.airHits >= attacker.maxAirHits) {
      // Limit reached — knock them out of the air. Ensure a downward velocity so
      // gravity + this push drop them noticeably faster than a fresh re-loft would.
      target.vy = Math.max(target.vy || 0, 6)
      target.onGround = false
      target.isLaunched = true
      return false
    }

    target.vy = launchY
    target.onGround = false
    target.isLaunched = true
    attacker.airHits++
    return true
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
