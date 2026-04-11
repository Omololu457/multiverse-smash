/**
 * COMBAT ENGINE - Melee + Projectile + Special Traits
 * Manages move phases (startup/active/recovery), hit detection, and damage scaling.
 */

import { physics } from "./physics.js";
import { performUltimate } from "./abilities.js";

const GOJO_INFINITY_RADIUS = 260;

// Helper: Adjusts attack speed based on character stats
function getAttackDuration(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)));
}

function getBasicAttacks(fighter) {
  return fighter?.basic_attacks || {};
}

// Logic to pull move data from the character object
function getMoveData(fighter, moveKey) {
  const basic = getBasicAttacks(fighter);
  switch (moveKey) {
    case "light": return basic.light || null;
    case "heavy": return basic.heavy || null;
    case "up": return basic.upAttack || basic.up || null;
    case "air": return basic.airAttack || basic.air || null;
    case "down_air": return basic.downAir || basic.down_air || null;
    case "grab": return basic.grab || { damage: 30, hitstun: 18, throw_force_x: 5, throw_force_y: -4 };
    default: return basic[moveKey] || fighter?.specials?.[moveKey] || { damage: 40, hitstun: 20 };
  }
}

// Ensures all necessary combat variables exist on the fighter
export function ensureCombatState(fighter) {
  if (!fighter) return;
  const defaults = {
    attacking: false, currentMove: null, currentMoveData: null, currentAttack: null,
    moveTimer: 0, movePhase: "idle", hasHitThisMove: false, attackCooldown: 0,
    hitstun: 0, blockstun: 0, hitstop: 0, isGrabbed: false, invulnTimer: 0,
    comboCounter: 0, comboTimer: 0, airHits: 0, maxAirHits: 3, colorFlash: 0,
    attackMultiplier: 1, damageMultiplier: 1, defenseMultiplier: 1, energy: 0, maxEnergy: 100
  };
  for (let key in defaults) {
    if (fighter[key] == null) fighter[key] = defaults[key];
  }
}

// Damage scaling: The longer the combo, the less damage each hit does
export function getComboScale(fighter) {
  if (!fighter || fighter.comboCounter <= 1) return 1;
  const scales = [1, 0.92, 0.84, 0.76];
  return scales[fighter.comboCounter - 1] || 0.68;
}

export function attackIsActive(attack) {
  if (!attack) return false;
  const elapsed = attack.total - attack.timer;
  return elapsed >= attack.activeStart && elapsed <= attack.activeEnd;
}

export function getAttackPhase(fighter) {
  if (!fighter?.currentAttack) return "idle";
  const atk = fighter.currentAttack;
  const elapsed = atk.total - atk.timer;
  if (elapsed < atk.activeStart) return "startup";
  if (elapsed <= atk.activeEnd) return "active";
  return "recovery";
}

// Calculates where the red "Hitbox" appears
export function getAttackHitbox(fighter) {
  const atk = fighter?.currentAttack;
  if (!fighter || !atk) return null;
  const width = atk.rangeX || 50;
  const height = atk.rangeY || 40;
  const x = fighter.facing === 1 ? fighter.x + fighter.w : fighter.x - width;
  let y = fighter.y + 20;
  if (atk.name === "up") { y = fighter.y - 30; } 
  else if (atk.name === "down_air") { y = fighter.y + 30; }
  return { x, y, w: width, h: height };
}

// Calculates the player's vulnerable "Hurtbox"
export function getHurtbox(fighter) {
  if (!fighter) return null;
  return {
    x: fighter.x + 6, y: fighter.y + 6,
    w: Math.max(1, fighter.w - 12), h: Math.max(1, fighter.h - 6)
  };
}

export function rectsOverlap(a, b) {
  return ( !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y );
}

// Unique Mechanic: Gojo Auto-Dodge
export function shouldGojoAutoDodge(defender) {
  if (!defender?.currentFormData?.autoDodge) return false;
  const kiCost = defender.currentFormData.autoDodgeKiCost || 5;
  if ((defender.energy || 0) < kiCost) return false;
  defender.energy -= kiCost;
  defender.teleportFlash = 8;
  return true;
}

// Unique Mechanic: Ultra Ego (Rage)
export function applyUltraEgoReaction(defender) {
  if (!defender?.currentFormData?.rageHealOnHit) return;
  const kiCost = defender.currentFormData.healCostPerHitKi || 4;
  if ((defender.energy || 0) < kiCost) return;
  defender.energy -= kiCost;
  defender.health = Math.min(defender.maxHealth || 1000, defender.health + defender.currentFormData.rageHealOnHit);
}

// Move Initialization logic
function buildBaseAttack({ fighter, name, startup, active, recovery, damage, rangeX, rangeY, hitstun, pushX, launchY, hitstop = 6 }) {
  const total = getAttackDuration(startup + active + recovery, fighter);
  return { name, damage, total, timer: total, activeStart: startup, activeEnd: startup + active, rangeX, rangeY, hitstun, hitstop, pushX, launchY, hasHit: false };
}

export function startMove(fighter, moveKey, moveData) {
  if (!fighter || !moveData) return false;
  if (fighter.attacking || fighter.hitstun > 0 || fighter.attackCooldown > 0) return false;

  const frames = { startup: moveData.startup || 5, active: moveData.active || 4, recovery: moveData.recovery || 10 };
  const config = buildBaseAttack({
    fighter, name: moveKey, 
    startup: frames.startup, active: frames.active, recovery: frames.recovery,
    damage: moveData.damage || 40, rangeX: moveData.rangeX || 60, rangeY: moveData.rangeY || 40,
    hitstun: moveData.hitstun || 15, pushX: moveData.knockbackX || 4, launchY: moveData.knockbackY ?? -2
  });

  // Special properties for specific move types
  if (moveKey === "up") config.launcher = true;
  if (moveKey === "down_air") config.spike = true;

  fighter.attacking = true;
  fighter.currentAttack = config;
  return true;
}

function applyNormalHitReaction(attacker, defender, atk) {
  defender.hitstun = Math.max(defender.hitstun, atk.hitstun);
  defender.vx = (attacker.facing) * (atk.pushX);
  attacker.hitstop = atk.hitstop;
  defender.hitstop = atk.hitstop;

  if (atk.launcher) {
    physics.launcherAttack(attacker, defender, atk.launchY, -22);
  } else if (atk.spike) {
    physics.downAirSpike(attacker, defender, 30);
  } else {
    defender.vy = atk.launchY;
  }
}

export function resolveAttackHit(attacker, defender, hitEffects = null) {
  if (!attacker.currentAttack || attacker.currentAttack.hasHit || !attackIsActive(attacker.currentAttack)) return;
  
  const hitbox = getAttackHitbox(attacker);
  const hurtbox = getHurtbox(defender);

  if (rectsOverlap(hitbox, hurtbox)) {
    if (shouldGojoAutoDodge(defender)) {
      attacker.currentAttack.hasHit = true;
      return;
    }

    const atk = attacker.currentAttack;
    let damage = Math.floor(atk.damage * getComboScale(attacker));

    if (defender.isBlocking) {
      damage *= 0.2;
      defender.blockstun = 10;
    } else {
      applyNormalHitReaction(attacker, defender, atk);
    }

    defender.health -= damage;
    defender.colorFlash = 6;
    attacker.currentAttack.hasHit = true;
    attacker.comboCounter++;
    attacker.comboTimer = 90;
    applyUltraEgoReaction(defender);
  }
}

export function updateCombat(fighter, opponent, controls = {}, options = {}) {
  if (!fighter || !opponent) return;
  ensureCombatState(fighter);
  
  if (fighter.hitstop > 0) { fighter.hitstop--; return; }
  
  // Stun & Combo Timers
  if (fighter.hitstun > 0) fighter.hitstun--;
  if (fighter.comboTimer > 0) fighter.comboTimer--; else fighter.comboCounter = 0;
  if (fighter.attackCooldown > 0) fighter.attackCooldown--;

  // Input to Move
  if (!fighter.attacking && !fighter.hitstun) {
    if (controls.light) startMove(fighter, "light", getMoveData(fighter, "light"));
    else if (controls.heavy) startMove(fighter, "heavy", getMoveData(fighter, "heavy"));
    else if (controls.up) startMove(fighter, "up", getMoveData(fighter, "up"));
  }

  // Active Move Update
  if (fighter.attacking && fighter.currentAttack) {
    fighter.currentAttack.timer--;
    if (getAttackPhase(fighter) === "active") {
      resolveAttackHit(fighter, opponent, options.hitEffects);
    }
    if (fighter.currentAttack.timer <= 0) {
      fighter.attacking = false;
      fighter.attackCooldown = 10;
    }
  }
// ------------------------------
// PROJECTILE UPDATES & HIT RESOLUTION
// ------------------------------
export function updateProjectiles(projectiles = [], stageWidth = 3200, fighters = []) {
  if (!Array.isArray(projectiles)) return;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p) { projectiles.splice(i, 1); continue; }

    p.x += p.vx || 0;
    p.y += p.vy || 0;
    if (p.lifetime != null) p.lifetime--;

    const oob = p.x < -200 || p.x > stageWidth + 200 || p.y < -400 || p.y > 2000;
    const expired = p.lifetime != null && p.lifetime <= 0;
    if (oob || expired) { projectiles.splice(i, 1); }
  }
}

export function resolveProjectileHits(projectiles = [], p1, p2, hitEffects = []) {
  if (!Array.isArray(projectiles)) return;
  const fighters = [p1, p2].filter(Boolean);

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (!proj) continue;

    for (const fighter of fighters) {
      // Don't hit the fighter who owns the projectile
      if (proj.owner === fighter || proj.ownerId === fighter.side) continue;
      if ((fighter.invulnTimer || 0) > 0) continue;

      const hurtbox = getHurtbox(fighter);
      const projBox = {
        x: proj.x - (proj.radius || proj.size || 10),
        y: proj.y - (proj.radius || proj.size || 10),
        w: (proj.radius || proj.size || 10) * 2,
        h: (proj.radius || proj.size || 10) * 2
      };

      if (rectsOverlap(projBox, hurtbox)) {
        let damage = proj.damage || 30;
        if (fighter.isBlocking) {
          damage *= 0.15;
          fighter.blockstun = 12;
        } else {
          fighter.hitstun = proj.hitstun || 18;
          fighter.vx = (proj.vx > 0 ? 1 : -1) * (proj.knockbackX || 5);
          fighter.vy = proj.knockbackY || -3;
          fighter.colorFlash = 6;
        }
        fighter.health -= Math.floor(damage);

        if (Array.isArray(hitEffects)) {
          hitEffects.push({ x: proj.x, y: proj.y, timer: 12, size: 20, color: proj.color || "#fff1a8" });
        }

        projectiles.splice(i, 1);
        break;
      }
    }
  }
}
  // Energy Regen
  if (fighter.energy < fighter.maxEnergy) fighter.energy += 0.1;
}
