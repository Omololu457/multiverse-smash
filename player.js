/**
 * PLAYER CLASS
 * Bridges character data with physics and combat states.
 *
 * BEN 10: if rosterKey is "ben10", we build him from the Omnitrix pool (his data
 * isn't in characters.js) and load his first alien. Switching is handled in
 * physics.js. Reads are hardened so characters without traits/passive don't crash.
 */
import { characters } from "./characters.js";
import { ensureCombatState } from "./combat.js";
import { BEN10_ALIEN_POOL, setupBen10 } from "./fighters.js";

export class Player {
  constructor(rosterKey, x, y, playerNumber, controls) {
    // Resolve character data. Ben 10 isn't in characters.js, so fall back to the
    // Omnitrix pool (first default alien) when needed.
    const data =
      characters[rosterKey] ||
      BEN10_ALIEN_POOL[rosterKey] ||
      (rosterKey === "ben10" ? BEN10_ALIEN_POOL.heatblast : null) ||
      characters.goku;

    const stats  = data.stats  || {};
    const traits = data.traits || {};

    // Core Identity
    this.rosterKey = rosterKey;          // ★ needed so drawCharacter routes correctly
    this.name = data.name;
    this.playerNumber = playerNumber;    // 1 or 2
    this.controls = controls;            // Key mappings (left, right, jump, etc.)

    // Transform Stats into Live Properties
    this.maxHealth = stats.maxHealth || data.health || 1000;
    this.health = this.maxHealth;
    this.maxEnergy = stats.maxEnergy || data.maxEnergy || 100;
    this.energy = 0;
    this.energyType = traits.energyType || data.energyType || "none";

    // Physics Properties
    this.x = x;
    this.y = y;
    this.w = 60;  // Default width
    this.h = 110; // Default height
    this.vx = 0;
    this.vy = 0;
    this.speed = (stats.speed || data.speed || 7) / 5; // Normalized speed
    this.baseSpeed = stats.speed || data.speed || 7;
    this.facing = playerNumber === 1 ? 1 : -1;
    this.onGround = false;

    // Dash Properties
    this.dashSpeed = stats.dashSpeed || 15;
    this.dashDuration = stats.dashDuration || 10;
    this.dashCooldownMax = stats.dashCooldownMax || 40;
    this.dashTimer = 0;
    this.dashCooldown = 0;

    // Jump Properties
    this.maxJumps = stats.maxJumps || 2;
    this.jumpCount = 0;
    this.jumpForce = -(stats.jumpPower || 25);

    // Visuals
    this.color = playerNumber === 1 ? "#3498db" : "#e74c3c";
    this.colorFlash = 0; // Used for hit effects

    // Character-Specific Move Data
    this.basic_attacks = data.basic_attacks || {
      light: { damage: 30, startup: 4, active: 3, recovery: 8 },
      heavy: { damage: 60, startup: 10, active: 4, recovery: 15 },
      up: { damage: 50, startup: 6, active: 4, recovery: 12, knockbackY: -30 }
    };
    this.specials = data.specials || {};
    this.ultimate = data.ultimate || null;
    this.stats = stats;

    // Initialize all combat-related variables (stun, timers, etc.)
    ensureCombatState(this);

    // ★ BEN 10 — attach the Omnitrix and load the first alien.
    if (rosterKey === "ben10") {
      setupBen10(this);
    }
  }

  // Draw a basic box placeholder until we have sprites
  draw(ctx) {
    ctx.fillStyle = this.colorFlash > 0 ? "white" : this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = "black";
    const eyeX = this.facing === 1 ? this.x + this.w - 15 : this.x + 5;
    ctx.fillRect(eyeX, this.y + 20, 10, 10);

    this.drawHUD(ctx);
  }

  drawHUD(ctx) {
    const barWidth = 60;
    const barHeight = 8;
    const healthPercent = this.health / this.maxHealth;

    ctx.fillStyle = "#333";
    ctx.fillRect(this.x, this.y - 20, barWidth, barHeight);

    ctx.fillStyle = healthPercent > 0.3 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(this.x, this.y - 20, barWidth * healthPercent, barHeight);

    if (this.maxEnergy > 0) {
      ctx.fillStyle = "#f1c40f";
      const energyPercent = this.energy / this.maxEnergy;
      ctx.fillRect(this.x, this.y - 10, barWidth * energyPercent, barHeight / 2);
    }
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.colorFlash = 5; // Flash for 5 frames
  }
}
