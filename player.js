/**
 * PLAYER CLASS
 * Bridges character data with physics and combat states.
 */
import { characters } from "./characters.js";
import { ensureCombatState } from "./combat.js";

export class Player {
  constructor(rosterKey, x, y, playerNumber, controls) {
    const data = characters[rosterKey] || characters.goku; // Fallback to Goku

    // Core Identity
    this.name = data.name;
    this.playerNumber = playerNumber; // 1 or 2
    this.controls = controls; // Key mappings (left, right, jump, etc.)

    // Transform Stats into Live Properties
    this.maxHealth = data.stats.maxHealth || 1000;
    this.health = this.maxHealth;
    this.maxEnergy = data.stats.maxEnergy || 100;
    this.energy = 0;
    this.energyType = data.traits.energyType;

    // Physics Properties
    this.x = x;
    this.y = y;
    this.w = 60; // Default width
    this.h = 110; // Default height
    this.vx = 0;
    this.vy = 0;
    this.speed = (data.stats.speed / 5); // Normalized speed
    this.facing = playerNumber === 1 ? 1 : -1;
    this.onGround = false;

    // Dash Properties
    this.dashSpeed = data.stats.dashSpeed || 15;
    this.dashDuration = data.stats.dashDuration || 10;
    this.dashCooldownMax = data.stats.dashCooldownMax || 40;
    this.dashTimer = 0;
    this.dashCooldown = 0;

    // Jump Properties
    this.maxJumps = data.stats.maxJumps || 2;
    this.jumpCount = 0;
    this.jumpForce = -(data.stats.jumpPower || 25);

    // Visuals
    this.color = playerNumber === 1 ? "#3498db" : "#e74c3c";
    this.colorFlash = 0; // Used for hit effects
    
    // Character-Specific Move Data
    this.basic_attacks = data.basic_attacks || {
        light: { damage: 30, startup: 4, active: 3, recovery: 8 },
        heavy: { damage: 60, startup: 10, active: 4, recovery: 15 },
        up: { damage: 50, startup: 6, active: 4, recovery: 12, knockbackY: -30 }
    };

    // Initialize all combat-related variables (stun, timers, etc.)
    ensureCombatState(this);
  }

  // Draw a basic box placeholder until we have sprites
  draw(ctx) {
    // Flash white when hit
    ctx.fillStyle = this.colorFlash > 0 ? "white" : this.color;
    
    // Draw body
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Draw "Facing" Indicator (tiny eye/line)
    ctx.fillStyle = "black";
    const eyeX = this.facing === 1 ? this.x + this.w - 15 : this.x + 5;
    ctx.fillRect(eyeX, this.y + 20, 10, 10);
    
    // Draw Health Bar above head
    this.drawHUD(ctx);
  }

  drawHUD(ctx) {
    const barWidth = 60;
    const barHeight = 8;
    const healthPercent = this.health / this.maxHealth;

    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(this.x, this.y - 20, barWidth, barHeight);
    
    // Health
    ctx.fillStyle = healthPercent > 0.3 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(this.x, this.y - 20, barWidth * healthPercent, barHeight);
    
    // Energy
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
