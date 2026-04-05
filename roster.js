// roster.js
// All playable characters with full stats, moves, ultimates, and transformations

export const roster = {

  // ======================
  // DRAGON BALL
  // ======================
  goku: {
    name: "Goku",
    health: 1200,
    speed: 8,
    jump: 8,
    weight: "medium",
    maxEnergy: 150,
    energyType: "ki",
    passive: { name: "Saiyan Warrior", effect: "Light attacks build energy faster" },
    basic_attacks: {
      light_attack: { damage: 45 },
      heavy_attack: { damage: 85 },
      up_attack: { damage: 70, launch_force: 12 },
      air_attack: { damage: 60 },
      down_air: { damage: 80, spike_force: 14 }
    },
    specials: {
      dragon_fist: { cost: 40, damage: 150, effect: "Punch attack with dragon aura" }
    },
    ultimate: { name: "Super Saiyan Blue", cost: 100, duration: 8, effect: "Massive speed and attack boost; ki attacks deal double damage" },
    transformations: [
      { name: "Base Form", damageMultiplier: 1, speedMultiplier: 1 },
      { name: "Super Saiyan 1", damageMultiplier: 1.2, speedMultiplier: 1.1 },
      { name: "Super Saiyan 2", damageMultiplier: 1.3, speedMultiplier: 1.15 },
      { name: "Super Saiyan 3", damageMultiplier: 1.5, speedMultiplier: 1.2 },
      { name: "Super Saiyan Blue", damageMultiplier: 2, speedMultiplier: 1.4 },
      { name: "Ultra Instinct", damageMultiplier: 2.5, speedMultiplier: 2 }
    ]
  },

  vegeta: {
    name: "Vegeta",
    health: 1150,
    speed: 8,
    jump: 8,
    weight: "medium",
    maxEnergy: 150,
    energyType: "ki",
    passive: { name: "Prince of Saiyans", effect: "Light attacks build energy faster" },
    basic_attacks: {
      light_attack: { damage: 45 },
      heavy_attack: { damage: 85 },
      up_attack: { damage: 70, launch_force: 12 },
      air_attack: { damage: 60 },
      down_air: { damage: 80, spike_force: 14 }
    },
    specials: {
      galick_gun: { cost: 30, damage: 120, effect: "Powerful ki beam" },
      final_flash: { cost: 40, damage: 160, effect: "Concentrated energy blast" },
      big_bang_attack: { cost: 25, damage: 130, effect: "Explosive ki attack" }
    },
    ultimate: { name: "Super Saiyan Blue Evolution", cost: 100, duration: 8, effect: "Increased attack, speed, and ki regeneration" },
    transformations: [
      { name: "Base Form", damageMultiplier: 1, speedMultiplier: 1 },
      { name: "Super Saiyan 1", damageMultiplier: 1.2, speedMultiplier: 1.1 },
      { name: "Super Saiyan 2", damageMultiplier: 1.3, speedMultiplier: 1.15 },
      { name: "Super Saiyan Blue", damageMultiplier: 2, speedMultiplier: 1.4 },
      { name: "Super Saiyan Blue Evolution", damageMultiplier: 2.3, speedMultiplier: 1.5 },
      { name: "Ultra Ego", damageMultiplier: 2.5, speedMultiplier: 1.8 }
    ]
  },

  piccolo: {
    name: "Piccolo",
    health: 1100,
    speed: 7,
    jump: 7,
    weight: "medium",
    maxEnergy: 140,
    energyType: "ki",
    passive: { name: "Namekian Regeneration", effect: "Regenerates small health over time" },
    basic_attacks: {
      light_attack: { damage: 40 },
      heavy_attack: { damage: 80 },
      up_attack: { damage: 60, launch_force: 11 },
      air_attack: { damage: 55 },
      down_air: { damage: 70, spike_force: 12 }
    },
    specials: {
      special_beam_cannon: { cost: 35, damage: 150, effect: "Piercing ki attack" },
      hellzone_grenade: { cost: 30, damage: 100, effect: "Multi-ki ball attack" }
    },
    ultimate: { name: "Fused with Kami", cost: 100, duration: 6, effect: "Enhanced stats and ki attacks" },
    transformations: [
      { name: "Base Form", damageMultiplier: 1, speedMultiplier: 1 },
      { name: "Fused with Kami", damageMultiplier: 1.4, speedMultiplier: 1.2 }
    ]
  },

  frieza: {
    name: "Frieza",
    health: 1200,
    speed: 8,
    jump: 8,
    weight: "medium",
    maxEnergy: 150,
    energyType: "ki",
    passive: { name: "Tyrant Instinct", effect: "Attack damage increases when health below 50%" },
    basic_attacks: {
      light_attack: { damage: 45 },
      heavy_attack: { damage: 85 },
      up_attack: { damage: 70, launch_force: 12 },
      air_attack: { damage: 60 },
      down_air: { damage: 80, spike_force: 14 }
    },
    specials: {
      death_beam: { cost: 20, damage: 90, effect: "Precise ki blast" },
      nova_strike: { cost: 30, damage: 140, effect: "Large ki explosion" },
      ultimate_death_ball: { cost: 50, damage: 200, effect: "Huge energy sphere" }
    },
    ultimate: { name: "Golden Frieza", cost: 100, duration: 8, effect: "Massive speed and attack boost; all ki moves amplified" },
    transformations: [
      { name: "Base Form", damageMultiplier: 1, speedMultiplier: 1 },
      { name: "Golden Frieza", damageMultiplier: 2, speedMultiplier: 1.5 }
    ]
  },

  cell: {
    name: "Cell",
    health: 1300,
    speed: 7,
    jump: 7,
    weight: "heavy",
    maxEnergy: 150,
    energyType: "ki",
    passive: { name: "Perfect Form", effect: "Slightly increases all stats" },
    basic_attacks: {
      light_attack: { damage: 50 },
      heavy_attack: { damage: 95 },
      up_attack: { damage: 75, launch_force: 13 },
      air_attack: { damage: 65 },
      down_air: { damage: 85, spike_force: 14 }
    },
    specials: {
      kamehameha: { cost: 30, damage: 120, effect: "Ki blast" },
      solar_kamehameha: { cost: 40, damage: 160, effect: "Stronger ki blast" }
    },
    ultimate: { name: "Perfect Cell", cost: 100, duration: 8, effect: "Max attack, speed, and ki regeneration" },
    transformations: [
      { name: "Base Form", damageMultiplier: 1, speedMultiplier: 1 },
      { name: "Perfect Cell", damageMultiplier: 2, speedMultiplier: 1.4 }
    ]
  },

  // ======================
  // DEMON SLAYER
  // ======================
  tanjiro: {
    name: "Tanjiro Kamado",
    health: 1100,
    speed: 8,
    jump: 7,
    weight: "medium",
    maxEnergy: 0,
    energyType: "none",
    passive: { name: "Water Breathing Mastery", effect: "Slightly increases attack speed after consecutive hits" },
    basic_attacks: {
      light_attack: { damage: 45 },
      heavy_attack: { damage: 85 },
      up_attack: { damage: 70, launch_force: 12 },
      air_attack: { damage: 60 },
      down_air: { damage: 75, spike_force: 12 }
    },
    specials: {
      water_surface_slasher: { cost: 25, damage: 120, effect: "Sweeping water blade" },
      dance_of_the_fireflies: { cost: 30, damage: 100, effect: "Rapid multi-slash attack" }
    },
    ultimate: { name: "Hinokami Kagura", cost: 100, duration: 8, effect: "Massive attack speed and damage boost; special visual flame effects" }
  },

  nezuko: {
    name: "Nezuko Kamado",
    health: 1050,
    speed: 9,
    jump: 8,
    weight: "light",
    maxEnergy: 0,
    energyType: "none",
    passive: { name: "Demon Regeneration", effect: "Gradual health recovery over time" },
    basic_attacks: {
      light_attack: { damage: 40 },
      heavy_attack: { damage: 80 },
      up_attack: { damage: 65, launch_force: 11 },
      air_attack: { damage: 55 },
      down_air: { damage: 70, spike_force: 11 }
    },
    specials: {
      blood_demon_art: { cost: 35, damage: 140, effect: "Explosive demonic attack" }
    },
    ultimate: { name: "Full Demon Transformation", cost: 100, duration: 8, effect: "Increased speed, damage, and regeneration" }
  },

  // Other series can be added similarly...
};