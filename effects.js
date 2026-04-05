// effects.js
// Handles temporary effects applied to fighters: buffs, debuffs, status, knockbacks, energy regen

import { camera } from "./camera.js"

export const activeEffects = []

/*
Effect structure:
{
  target: fighter,
  type: "buff" | "debuff" | "status",
  duration: frames,
  apply: function(target) {},
  remove: function(target) {}
}
*/

// Apply a new effect to a fighter
export function addEffect(effect) {
  effect.apply(effect.target)

  if (effect.duration <= 0) {
    if (effect.remove) effect.remove(effect.target)
    return
  }

  activeEffects.push(effect)
}

// Update all active effects each frame
export function updateEffects() {
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    const eff = activeEffects[i]
    eff.duration--

    if (eff.duration <= 0) {
      if (eff.remove) eff.remove(eff.target)
      activeEffects.splice(i, 1)
    }
  }
}

// ---------- CAMERA EFFECTS ----------

export function triggerShake(strength = 8, duration = 10) {
  camera.shake(strength, duration)
}

// ---------- EFFECT FACTORIES ----------

// Temporary speed boost
export function createSpeedBuff(target, multiplier = 1.5, durationSec = 3) {
  return {
    target,
    type: "buff",
    duration: Math.floor(durationSec * 60),
    apply: (t) => {
      t.speed *= multiplier
    },
    remove: (t) => {
      t.speed /= multiplier
    }
  }
}

// Damage boost multiplier
export function createDamageBuff(target, multiplier = 1.3, durationSec = 5) {
  return {
    target,
    type: "buff",
    duration: Math.floor(durationSec * 60),
    apply: (t) => {
      t.damageMultiplier = (t.damageMultiplier || 1) * multiplier
    },
    remove: (t) => {
      t.damageMultiplier = (t.damageMultiplier || 1) / multiplier
    }
  }
}

// Stun effect
export function createStun(target, durationSec = 2) {
  const frames = Math.floor(durationSec * 60)

  return {
    target,
    type: "status",
    duration: frames,
    apply: (t) => {
      t.stun = frames
    },
    remove: (t) => {
      t.stun = 0
    }
  }
}

// Knockback / Launch effect
export function createKnockback(target, vx = 0, vy = -15, shake = true) {
  return {
    target,
    type: "status",
    duration: 0,
    apply: (t) => {
      t.vx += vx
      t.vy += vy
      if (shake) triggerShake(10, 10)
    },
    remove: () => {}
  }
}

// Energy regeneration buff
export function createEnergyRegen(target, amount = 1, durationSec = 5) {
  return {
    target,
    type: "buff",
    duration: Math.floor(durationSec * 60),
    apply: (t) => {
      t.energyRegen = amount
    },
    remove: (t) => {
      t.energyRegen = 0
    }
  }
}

// Temporary triple-jump boost
export function createTripleJumpBoost(
  target,
  jumpMultiplier = 2,
  speedMultiplier = 1.5,
  durationSec = 3
) {
  return {
    target,
    type: "buff",
    duration: Math.floor(durationSec * 60),
    apply: (t) => {
      t.jump *= jumpMultiplier
      t.speed *= speedMultiplier
      t.canTripleJump = true
    },
    remove: (t) => {
      t.jump /= jumpMultiplier
      t.speed /= speedMultiplier
      t.canTripleJump = false
    }
  }
}

// ---------- FRAME UPDATES ----------

// Apply energy regen each frame
export function updateEnergyRegen(fighters) {
  fighters.forEach((f) => {
    if (f.energyRegen) {
      f.energy += f.energyRegen
      if (f.energy > f.maxEnergy) f.energy = f.maxEnergy
    }
  })
}