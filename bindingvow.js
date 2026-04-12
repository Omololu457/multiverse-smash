// bindingvow.js
// Handles the Binding Vow system

export const activeVows = new Map()

// ======================================================
// Activate Binding Vow
// ======================================================

export function activateBindingVow(fighter, vow) {
  if (!fighter || !vow) return

  if (activeVows.has(fighter)) {
    return
  }

  activeVows.set(fighter, vow)

  applyVowReward(fighter, vow)
  applyVowRestriction(fighter, vow)
}

// ======================================================
// Apply Reward
// ======================================================

function applyVowReward(fighter, vow) {
  if (!vow.reward) return

  switch (vow.reward.type) {
    case "infiniteEnergy":
      fighter.energy = Infinity
      break

    case "damageBoost":
      fighter.damageMultiplier =
        (fighter.damageMultiplier || 1) * vow.reward.value
      break

    case "speedBoost":
      fighter.speed *= vow.reward.value
      break

    case "healthBoost":
      fighter.health *= vow.reward.value
      break
  }
}

// ======================================================
// Apply Restriction
// ======================================================

function applyVowRestriction(fighter, vow) {
  if (!vow.restriction) return

  switch (vow.restriction.type) {
    case "noSpecials":
      fighter.canUseSpecials = false
      break

    case "noJump":
      fighter.canJump = false
      break

    case "noBlock":
      fighter.canBlock = false
      break

    case "reducedHealth":
      fighter.health *= vow.restriction.value
      break

    case "speedBoost":
      fighter.speed *= vow.restriction.value
      break
  }
}

// ======================================================
// Check if Fighter Has Vow
// ======================================================

export function hasBindingVow(fighter) {
  return activeVows.has(fighter)
}

// ======================================================
// Get Fighter Vow
// ======================================================

export function getBindingVow(fighter) {
  return activeVows.get(fighter)
}

// ======================================================
// Clear Fighter Vow / All Vows
// ======================================================

export function clearBindingVow(fighter) {
  activeVows.delete(fighter)
}

export function clearAllBindingVows() {
  activeVows.clear()
}

// ======================================================
// Example Vow Definitions
// ======================================================

export const bindingVows = {
  infiniteEnergy: {
    name: "Infinite Energy Vow",

    reward: {
      type: "infiniteEnergy"
    },

    restriction: {
      type: "noSpecials"
    }
  },

  powerForLife: {
    name: "Power For Life",

    reward: {
      type: "damageBoost",
      value: 2
    },

    restriction: {
      type: "reducedHealth",
      value: 0.5
    }
  },

  speedSacrifice: {
    name: "Speed Sacrifice",

    reward: {
      type: "damageBoost",
      value: 1.8
    },

    restriction: {
      type: "speedBoost",
      value: 0.6
    }
  }
}
