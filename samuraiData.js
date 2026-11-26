// Uniform animation strips cut from NeoMar654's Samurai Ranger and Megazord sheets.
const DIR = './assets/samurai_rangers/'
const strip = (name, frames, width, height, speed, loop = false) => ({
  sheet: DIR + name + '.png', frames, width, height, speed, anchorY: 0,
  ...(loop ? {} : { loop: false, lockLastFrame: true }),
})

const art = {
  earth: {
    base: {
      idle: strip("earth_base_idle", 4, 32, 56, 8, true),
      run: strip("earth_base_run", 8, 68, 50, 4, true),
      jump: strip("earth_base_jump", 7, 52, 56, 4),
      guard: strip("earth_base_guard", 5, 56, 70, 3),
      light: strip("earth_base_light", 4, 92, 73, 3),
      heavy: strip("earth_base_heavy", 5, 122, 69, 3),
      up: strip("earth_base_up", 8, 110, 118, 3),
      air: strip("earth_base_air", 7, 100, 75, 3),
      hurt: strip("earth_base_hurt", 3, 60, 73, 4),
      symbolCast: strip("earth_base_cast", 8, 56, 82, 3),
    },
    mega: {
      idle: strip("earth_mega_idle", 4, 32, 57, 8, true),
      run: strip("earth_mega_run", 8, 66, 51, 4, true),
      jump: strip("earth_mega_jump", 7, 50, 56, 4),
      guard: strip("earth_mega_guard", 5, 54, 70, 3),
      light: strip("earth_mega_light", 4, 90, 73, 3),
      heavy: strip("earth_mega_heavy", 5, 122, 69, 3),
      up: strip("earth_mega_up", 8, 112, 118, 3),
      air: strip("earth_mega_air", 7, 98, 75, 3),
      hurt: strip("earth_mega_hurt", 3, 64, 68, 4),
      symbolCast: strip("earth_mega_cast", 8, 60, 82, 3),
    },
    wave: strip("earth_wave", 11, 64, 75, 3, true),
  },
  sky: {
    base: {
      idle: strip("sky_base_idle", 4, 34, 56, 8, true),
      run: strip("sky_base_run", 8, 68, 50, 4, true),
      jump: strip("sky_base_jump", 7, 50, 56, 4),
      guard: strip("sky_base_guard", 5, 54, 70, 3),
      light: strip("sky_base_light", 4, 92, 73, 3),
      heavy: strip("sky_base_heavy", 5, 122, 69, 3),
      up: strip("sky_base_up", 8, 110, 118, 3),
      air: strip("sky_base_air", 7, 102, 75, 3),
      hurt: strip("sky_base_hurt", 3, 60, 73, 4),
      symbolCast: strip("sky_base_cast", 8, 68, 62, 3),
    },
    mega: {
      idle: strip("sky_mega_idle", 4, 32, 57, 8, true),
      run: strip("sky_mega_run", 8, 66, 51, 4, true),
      jump: strip("sky_mega_jump", 7, 50, 56, 4),
      guard: strip("sky_mega_guard", 5, 50, 70, 3),
      light: strip("sky_mega_light", 4, 92, 73, 3),
      heavy: strip("sky_mega_heavy", 5, 122, 69, 3),
      up: strip("sky_mega_up", 8, 108, 118, 3),
      air: strip("sky_mega_air", 7, 100, 75, 3),
      hurt: strip("sky_mega_hurt", 3, 62, 68, 4),
      symbolCast: strip("sky_mega_cast", 8, 68, 62, 3),
    },
    wave: strip("sky_wave", 11, 64, 75, 3, true),
  },
  water: {
    base: {
      idle: strip("water_base_idle", 4, 34, 60, 8, true),
      run: strip("water_base_run", 8, 70, 53, 4, true),
      jump: strip("water_base_jump", 7, 52, 58, 4),
      guard: strip("water_base_guard", 5, 52, 70, 3),
      light: strip("water_base_light", 4, 92, 73, 3),
      heavy: strip("water_base_heavy", 5, 122, 69, 3),
      up: strip("water_base_up", 8, 112, 118, 3),
      air: strip("water_base_air", 7, 98, 75, 3),
      hurt: strip("water_base_hurt", 3, 62, 74, 4),
      symbolCast: strip("water_base_cast", 8, 70, 87, 3),
    },
    mega: {
      idle: strip("water_mega_idle", 4, 34, 62, 8, true),
      run: strip("water_mega_run", 8, 70, 54, 4, true),
      jump: strip("water_mega_jump", 7, 54, 58, 4),
      guard: strip("water_mega_guard", 5, 56, 70, 3),
      light: strip("water_mega_light", 4, 90, 73, 3),
      heavy: strip("water_mega_heavy", 5, 120, 69, 3),
      up: strip("water_mega_up", 8, 112, 118, 3),
      air: strip("water_mega_air", 7, 98, 75, 3),
      hurt: strip("water_mega_hurt", 3, 46, 78, 4),
      symbolCast: strip("water_mega_cast", 8, 68, 87, 3),
    },
    wave: strip("water_wave", 11, 64, 75, 3, true),
  },
  zords: {
    battlewing: strip("battlewing", 4, 352, 177, 4),
    tiger: strip("tiger", 10, 140, 168, 4),
    swordfish: strip("swordfish", 8, 280, 191, 4),
    octo: strip("octo", 6, 252, 164, 4),
  },
}

export const SAMURAI_ID = 'samurai_rangers'
export const SAMURAI_FORMS = [
  'samurai_red_ranger', 'blue_samurai_ranger', 'green_samurai_ranger',
  'yellow_samurai_ranger', 'pink_samurai_ranger', 'gold_samurai_ranger',
]
export const SAMURAI_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Gold']
export const SAMURAI_BUTTONS = ['light', 'heavy', 'special', 'grab', 'charge', 'ultimate']
export const SAMURAI_COLORS = ['#e73536', '#438cff', '#45b163', '#eac131', '#ee6ba9', '#d9a14e']
export const SAMURAI_PORTRAIT = DIR + 'portrait.png'
export const SAMURAI_START_PREFIX = 'samurai_rangers_start_'
export const samuraiStartSkin = index => index === 0 ? 'default' : SAMURAI_START_PREFIX + SAMURAI_NAMES[index].toLowerCase()

const elements = {
  blue_samurai_ranger: {
    asset: 'water', name: 'Samurai Blue Ranger (Water)',
    stat: { speed: 91 }, special: 'Water Slice', ultimate: 'Dragon Current',
    cost: 26, damage: 99, velocity: 17, rise: 0, w: 66, h: 58, lift: -4, life: 38,
  },
  yellow_samurai_ranger: {
    asset: 'earth', name: 'Samurai Yellow Ranger (Earth)',
    stat: { speed: 84, defense: 94, weight: 1.08 }, special: 'Seismic Slice', ultimate: 'Earth Symbol Breaker',
    cost: 30, damage: 122, velocity: 10, rise: 0, w: 115, h: 44, lift: -4, life: 29,
  },
  pink_samurai_ranger: {
    asset: 'sky', name: 'Samurai Pink Ranger (Sky)',
    stat: { speed: 95, defense: 84, weight: 0.94 }, special: 'Sky Fan', ultimate: 'Sky Symbol Tempest',
    cost: 24, damage: 90, velocity: 13, rise: -3.8, w: 70, h: 96, lift: -8, life: 33,
  },
}
export const SAMURAI_ELEMENTS = elements
export const SAMURAI_ELEMENT_IDLE_SHEETS = Object.fromEntries(
  Object.entries(elements).map(([key, { asset }]) => [key, art[asset].base.idle.sheet]),
)

function actions(tier) {
  return {
    ...tier,
    walk: { ...tier.run, speed: 6 }, dash: { ...tier.run, speed: 3 },
    fall: tier.jump, down_air: tier.air, grab: tier.light,
    samRekka1: tier.light, samRekka2: tier.heavy, samRekkaFin: tier.up,
    ultimate: tier.symbolCast,
  }
}

export function samuraiElementForms(red) {
  return Object.fromEntries(Object.entries(elements).map(([key, cfg]) => {
    const portrait = DIR + cfg.asset + '_portrait.png'
    return [key, {
      rosterKey: key, name: cfg.name, universe: 'power_rangers', portrait, hasSprites: true,
      spriteScale: cfg.asset === 'water' ? 1.74 : 1.85,
      stats: { ...red.stats, ...cfg.stat },
      traits: { ...red.traits }, primary: 'sword', secondary: ['zoner'], archetypes: ['sword', 'zoner'],
      basic_attacks: { ...red.basic_attacks },
      specials: { symbolCast: { name: cfg.special, cost: cfg.cost, damage: cfg.damage } },
      ultimate: { name: cfg.ultimate, cost: 100 },
      transformationOrder: red.transformationOrder, transformations: red.transformations,
      introPool: ['idle'], animationData: actions(art[cfg.asset].base),
    }]
  }))
}
export const ELEMENT_MEGA_ART = Object.fromEntries(Object.entries(elements).map(([key, cfg]) => [key, actions(art[cfg.asset].mega)]))
export const samuraiWaveArt = key => art[elements[key].asset].wave

export const SAMURAI_ZORD_COST = 100
export const SAMURAI_ZORDS = {
  battlewing: {
    name: 'Battlewing Megazord', input: 'Up + Ultimate', description: 'A flying sword sweep that covers high space.',
    damage: 261, speed: 15, lift: 126, w: 160, h: 166, knockbackY: -9,
    scale: 1.55, delay: 9, life: 34, color: '#ff71e8',
  },
  tiger: {
    name: 'Tiger Drill Megazord', input: 'Forward + Ultimate', description: 'A fast drill charge that chases along the ground.',
    damage: 285, speed: 20, lift: 62, w: 135, h: 112, knockbackY: -3,
    scale: 1.63, delay: 10, life: 36, color: '#ffe477',
  },
  swordfish: {
    name: 'Swordfish Fencer Megazord', input: 'Back + Ultimate', description: 'A tall blue cleave that guards the space directly in front of you.',
    damage: 310, speed: 1.3, lift: 98, w: 174, h: 186, knockbackY: -9,
    scale: 1.50, delay: 20, life: 31, color: '#80c9ff',
  },
  octo: {
    name: 'Octo Spear Megazord', input: 'Down + Ultimate', description: 'A wide, low-reaching spear sweep.',
    damage: 290, speed: 4.5, lift: 42, w: 225, h: 84, knockbackY: -4,
    scale: 1.50, delay: 15, life: 31, color: '#ffdc6b',
  },
}
export const samuraiZordArt = id => art.zords[id]
export const SAMURAI_EXTRA_SHEETS = [...new Set([
  ...Object.values(ELEMENT_MEGA_ART).flatMap(set => Object.values(set).map(a => a.sheet)),
  ...Object.values(elements).map(cfg => art[cfg.asset].wave.sheet),
  ...Object.values(art.zords).map(a => a.sheet),
])]
