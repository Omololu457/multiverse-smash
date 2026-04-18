// animationProfile.js
// Per-character animation definitions. sprite.js reads from here — never hardcodes assumptions.
// Every action defines its own sheet, dimensions, speed, looping, anchor, and behavior type.
//
// Behavior types:
//   body_attached    — normal animation stays on the fighter's body
//   projectile_spawn — fighter plays cast anim, then spawns a separate projectile object
//   summon_spawn     — fighter plays summon anim, then spawns a separate summon entity
//   detached_effect  — fighter plays startup, spawned effect exists independently afterward
//   transformation   — power-up sequence, modifies fighter state
//   domain_cast      — domain expansion startup, triggers domain system

// ─────────────────────────────────────────────────────────────────
// SHARED FALLBACK DEFAULTS
// Used when a fighter profile is missing an action entirely.
// ─────────────────────────────────────────────────────────────────
export const FALLBACK_ACTION = {
  sheet:     null,          // null = use procedural draw
  frames:    4,
  width:     128,
  height:    128,
  speed:     8,
  loop:      true,
  anchorX:   0,
  anchorY:   0,
  behavior:  "body_attached"
}

// Safe fallback chain — if the requested action is missing, try these in order
export const FALLBACK_CHAIN = {
  light:      ["light", "idle"],
  heavy:      ["heavy", "light", "idle"],
  up:         ["up", "light", "idle"],
  air:        ["air", "light", "jump"],
  down_air:   ["down_air", "air", "heavy", "idle"],
  grab:       ["grab", "light", "idle"],
  hurt:       ["hurt", "idle"],
  jump:       ["jump", "idle"],
  walk:       ["walk", "idle"],
  run:        ["run", "walk", "idle"],
  fall:       ["fall", "jump", "idle"],
  dash:       ["dash", "walk", "idle"],
  block:      ["block", "idle"],
  win:        ["win", "idle"],
  lose:       ["lose", "hurt"],
  // Special fallbacks
  special_1:  ["special_1", "cast", "light", "idle"],
  special_2:  ["special_2", "cast", "light", "idle"],
  special_3:  ["special_3", "cast", "light", "idle"],
  ultimate:   ["ultimate", "transform", "special_1", "idle"],
  cast:       ["cast", "light", "idle"],
  summon:     ["summon", "cast", "idle"],
  domain:     ["domain", "cast", "ultimate", "idle"],
  transform:  ["transform", "idle"],
}

// ─────────────────────────────────────────────────────────────────
// ANIMATION PROFILES
// ─────────────────────────────────────────────────────────────────

const profiles = {}

// ══════════════════════════════════════════════════════════════════
// GOKU
// Primary: melee + ki projectiles + transformations
// ══════════════════════════════════════════════════════════════════
profiles.goku = {
  defaultAction: "idle",
  actions: {
    idle: {
      sheet: "sprites/goku/goku_idle.png",
      frames: 6, width: 128, height: 128, speed: 8, loop: true,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },
    walk: {
      sheet: "sprites/goku/goku_walk.png",
      frames: 8, width: 128, height: 128, speed: 6, loop: true,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },
    run: {
      sheet: "sprites/goku/goku_run.png",
      frames: 8, width: 128, height: 128, speed: 4, loop: true,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },
    jump: {
      sheet: "sprites/goku/goku_jump.png",
      frames: 4, width: 128, height: 128, speed: 6, loop: false,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },
    fall: {
      sheet: "sprites/goku/goku_fall.png",
      frames: 3, width: 128, height: 128, speed: 6, loop: true,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },
    hurt: {
      sheet: "sprites/goku/goku_hurt.png",
      frames: 3, width: 128, height: 128, speed: 8, loop: false,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },
    light: {
      sheet: "sprites/goku/goku_light.png",
      frames: 5, width: 128, height: 128, speed: 4, loop: false,
      anchorX: 0, anchorY: 0, behavior: "body_attached",
      lockLastFrame: true
    },
    heavy: {
      sheet: "sprites/goku/goku_heavy.png",
      frames: 6, width: 128, height: 128, speed: 5, loop: false,
      anchorX: 0, anchorY: 0, behavior: "body_attached",
      lockLastFrame: true
    },
    up: {
      sheet: "sprites/goku/goku_up_attack.png",
      frames: 5, width: 160, height: 192, speed: 4, loop: false,
      anchorX: 16, anchorY: 32, behavior: "body_attached",
      lockLastFrame: true
    },
    air: {
      sheet: "sprites/goku/goku_air.png",
      frames: 4, width: 128, height: 128, speed: 5, loop: false,
      anchorX: 0, anchorY: 0, behavior: "body_attached",
      lockLastFrame: true
    },
    down_air: {
      sheet: "sprites/goku/goku_down_air.png",
      frames: 5, width: 128, height: 160, speed: 4, loop: false,
      anchorX: 0, anchorY: 16, behavior: "body_attached",
      lockLastFrame: true
    },
    // Dragon Fist — close-range melee rush
    special_1: {
      sheet: "sprites/goku/goku_dragon_fist.png",
      frames: 8, width: 192, height: 128, speed: 4, loop: false,
      anchorX: 32, anchorY: 0, behavior: "body_attached",
      lockLastFrame: true
    },
    // Kamehameha — projectile spawn
    special_2: {
      sheet: "sprites/goku/goku_kamehameha_cast.png",
      frames: 6, width: 192, height: 128, speed: 5, loop: false,
      anchorX: 32, anchorY: 0, behavior: "projectile_spawn",
      lockLastFrame: false,
      spawn: { type: "projectile", projectileKey: "kamehameha", spawnFrame: 4 }
    },
    // SSJ transformation
    transform: {
      sheet: "sprites/goku/goku_transform.png",
      frames: 10, width: 192, height: 192, speed: 5, loop: false,
      anchorX: 32, anchorY: 32, behavior: "transformation",
      lockLastFrame: false
    },
    ultimate: {
      sheet: "sprites/goku/goku_ultimate.png",
      frames: 10, width: 192, height: 192, speed: 5, loop: false,
      anchorX: 32, anchorY: 32, behavior: "transformation",
      lockLastFrame: false
    },
    win: {
      sheet: "sprites/goku/goku_win.png",
      frames: 6, width: 128, height: 128, speed: 8, loop: true,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },
    lose: {
      sheet: "sprites/goku/goku_lose.png",
      frames: 4, width: 128, height: 128, speed: 10, loop: false,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// NARUTO
// Primary: melee + chakra projectiles + shadow clone summons + transformation
// ══════════════════════════════════════════════════════════════════
profiles.naruto = {
  defaultAction: "idle",
  actions: {
    idle:  { sheet: "sprites/naruto/naruto_idle.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    walk:  { sheet: "sprites/naruto/naruto_walk.png",  frames: 8, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    run:   { sheet: "sprites/naruto/naruto_run.png",   frames: 8, width: 128, height: 128, speed: 4, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    jump:  { sheet: "sprites/naruto/naruto_jump.png",  frames: 4, width: 128, height: 128, speed: 6, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    fall:  { sheet: "sprites/naruto/naruto_fall.png",  frames: 3, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    hurt:  { sheet: "sprites/naruto/naruto_hurt.png",  frames: 3, width: 128, height: 128, speed: 8, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    light: { sheet: "sprites/naruto/naruto_light.png", frames: 5, width: 128, height: 128, speed: 4, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    heavy: { sheet: "sprites/naruto/naruto_heavy.png", frames: 6, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    up:    { sheet: "sprites/naruto/naruto_up.png",    frames: 5, width: 160, height: 192, speed: 4, loop: false, anchorX: 16, anchorY: 32, behavior: "body_attached", lockLastFrame: true },
    air:   { sheet: "sprites/naruto/naruto_air.png",   frames: 4, width: 128, height: 128, speed: 5, loop: false, anchorX: 0,  anchorY: 0,  behavior: "body_attached", lockLastFrame: true },
    down_air: { sheet: "sprites/naruto/naruto_down_air.png", frames: 5, width: 128, height: 160, speed: 4, loop: false, anchorX: 0, anchorY: 16, behavior: "body_attached", lockLastFrame: true },
    // Rasengan — close-range
    special_1: { sheet: "sprites/naruto/naruto_rasengan.png", frames: 7, width: 160, height: 128, speed: 4, loop: false, anchorX: 16, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    // Shadow Clone Blast — projectile spawn
    special_2: { sheet: "sprites/naruto/naruto_clone_cast.png", frames: 5, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "projectile_spawn", lockLastFrame: false, spawn: { type: "projectile", projectileKey: "shadow_clone", spawnFrame: 3 } },
    // Sage Mode transform
    transform: { sheet: "sprites/naruto/naruto_transform.png", frames: 10, width: 192, height: 192, speed: 5, loop: false, anchorX: 32, anchorY: 32, behavior: "transformation" },
    ultimate:  { sheet: "sprites/naruto/naruto_ultimate.png",  frames: 10, width: 192, height: 192, speed: 5, loop: false, anchorX: 32, anchorY: 32, behavior: "transformation" },
    win:  { sheet: "sprites/naruto/naruto_win.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    lose: { sheet: "sprites/naruto/naruto_lose.png", frames: 4, width: 128, height: 128, speed: 10,loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" }
  }
}

// ══════════════════════════════════════════════════════════════════
// GOJO SATORU
// Primary: ranged control — Blue, Red, Hollow Purple are detached projectiles
// Gojo plays a CAST animation, then the effect travels independently
// ══════════════════════════════════════════════════════════════════
profiles.gojo = {
  defaultAction: "idle",
  actions: {
    idle:  { sheet: "sprites/gojo/gojo_idle.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    walk:  { sheet: "sprites/gojo/gojo_walk.png",  frames: 8, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    jump:  { sheet: "sprites/gojo/gojo_jump.png",  frames: 4, width: 128, height: 128, speed: 6, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    fall:  { sheet: "sprites/gojo/gojo_fall.png",  frames: 3, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    hurt:  { sheet: "sprites/gojo/gojo_hurt.png",  frames: 3, width: 128, height: 128, speed: 8, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    light: { sheet: "sprites/gojo/gojo_light.png", frames: 5, width: 128, height: 128, speed: 4, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    heavy: { sheet: "sprites/gojo/gojo_heavy.png", frames: 6, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    up:    { sheet: "sprites/gojo/gojo_up.png",    frames: 5, width: 160, height: 192, speed: 4, loop: false, anchorX: 16, anchorY: 32, behavior: "body_attached", lockLastFrame: true },
    air:   { sheet: "sprites/gojo/gojo_air.png",   frames: 4, width: 128, height: 128, speed: 5, loop: false, anchorX: 0,  anchorY: 0,  behavior: "body_attached", lockLastFrame: true },
    down_air: { sheet: "sprites/gojo/gojo_down_air.png", frames: 5, width: 128, height: 160, speed: 4, loop: false, anchorX: 0, anchorY: 16, behavior: "body_attached", lockLastFrame: true },

    // Blue — Gojo raises hand, then Blue orb spawns and travels independently
    blue_cast: {
      sheet: "sprites/gojo/gojo_blue_cast.png",
      frames: 5, width: 160, height: 128, speed: 4, loop: false,
      anchorX: 16, anchorY: 0, behavior: "projectile_spawn",
      lockLastFrame: false,
      spawn: { type: "projectile", projectileKey: "blue_orb", spawnFrame: 3 },
      combatSync: { lockToCastDuration: true }
    },

    // Red — push burst, detached repulsion effect
    red_cast: {
      sheet: "sprites/gojo/gojo_red_cast.png",
      frames: 6, width: 160, height: 128, speed: 5, loop: false,
      anchorX: 16, anchorY: 0, behavior: "detached_effect",
      lockLastFrame: false,
      spawn: { type: "effect", effectKey: "red_burst", spawnFrame: 4 }
    },

    // Hollow Purple — two-hand charge, then massive projectile spawns
    hollow_purple_cast: {
      sheet: "sprites/gojo/gojo_hollow_purple_cast.png",
      frames: 10, width: 256, height: 128, speed: 5, loop: false,
      anchorX: 64, anchorY: 0, behavior: "projectile_spawn",
      lockLastFrame: false,
      spawn: { type: "projectile", projectileKey: "hollow_purple", spawnFrame: 7 }
    },

    // Infinity active — subtle body shimmer, looping
    infinity_active: {
      sheet: "sprites/gojo/gojo_infinity.png",
      frames: 4, width: 128, height: 128, speed: 6, loop: true,
      anchorX: 0, anchorY: 0, behavior: "body_attached"
    },

    // Domain cast startup
    domain: {
      sheet: "sprites/gojo/gojo_domain_cast.png",
      frames: 8, width: 192, height: 192, speed: 5, loop: false,
      anchorX: 32, anchorY: 32, behavior: "domain_cast",
      lockLastFrame: false
    },

    ultimate: {
      sheet: "sprites/gojo/gojo_ultimate.png",
      frames: 8, width: 192, height: 192, speed: 5, loop: false,
      anchorX: 32, anchorY: 32, behavior: "domain_cast"
    },
    win:  { sheet: "sprites/gojo/gojo_win.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    lose: { sheet: "sprites/gojo/gojo_lose.png", frames: 4, width: 128, height: 128, speed: 10,loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" }
  }
}

// ══════════════════════════════════════════════════════════════════
// MEGUMI FUSHIGURO
// Primary: melee + summons (all summons are detached entities after spawn anim)
// Mahoraga transformation is a permanent state change
// ══════════════════════════════════════════════════════════════════
profiles.megumi = {
  defaultAction: "idle",
  actions: {
    idle:  { sheet: "sprites/megumi/megumi_idle.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    walk:  { sheet: "sprites/megumi/megumi_walk.png",  frames: 8, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    jump:  { sheet: "sprites/megumi/megumi_jump.png",  frames: 4, width: 128, height: 128, speed: 6, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    fall:  { sheet: "sprites/megumi/megumi_fall.png",  frames: 3, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    hurt:  { sheet: "sprites/megumi/megumi_hurt.png",  frames: 3, width: 128, height: 128, speed: 8, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    light: { sheet: "sprites/megumi/megumi_light.png", frames: 5, width: 128, height: 128, speed: 4, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    heavy: { sheet: "sprites/megumi/megumi_heavy.png", frames: 6, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    up:    { sheet: "sprites/megumi/megumi_up.png",    frames: 5, width: 160, height: 192, speed: 4, loop: false, anchorX: 16, anchorY: 32, behavior: "body_attached", lockLastFrame: true },
    air:   { sheet: "sprites/megumi/megumi_air.png",   frames: 4, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    down_air: { sheet: "sprites/megumi/megumi_down_air.png", frames: 5, width: 128, height: 160, speed: 4, loop: false, anchorX: 0, anchorY: 16, behavior: "body_attached", lockLastFrame: true },

    // Divine Dogs summon startup — dogs spawn as separate entities
    divine_dogs: {
      sheet: "sprites/megumi/megumi_summon.png",
      frames: 5, width: 128, height: 128, speed: 4, loop: false,
      anchorX: 0, anchorY: 0, behavior: "summon_spawn",
      lockLastFrame: false,
      spawn: { type: "summon", summonKey: "divineDogs", spawnFrame: 3 }
    },

    // Nue summon startup — Nue spawns as separate aerial entity
    nue: {
      sheet: "sprites/megumi/megumi_summon.png",
      frames: 5, width: 128, height: 128, speed: 4, loop: false,
      anchorX: 0, anchorY: 0, behavior: "summon_spawn",
      lockLastFrame: false,
      spawn: { type: "summon", summonKey: "nue", spawnFrame: 3 }
    },

    // Toad summon
    toad: {
      sheet: "sprites/megumi/megumi_summon.png",
      frames: 5, width: 128, height: 128, speed: 4, loop: false,
      anchorX: 0, anchorY: 0, behavior: "summon_spawn",
      lockLastFrame: false,
      spawn: { type: "summon", summonKey: "toad", spawnFrame: 3 }
    },

    // Rabbit Escape
    rabbit_escape: {
      sheet: "sprites/megumi/megumi_summon.png",
      frames: 4, width: 128, height: 128, speed: 5, loop: false,
      anchorX: 0, anchorY: 0, behavior: "summon_spawn",
      lockLastFrame: false,
      spawn: { type: "summon", summonKey: "rabbitEscape", spawnFrame: 2 }
    },

    // Max Elephant
    max_elephant: {
      sheet: "sprites/megumi/megumi_summon_heavy.png",
      frames: 7, width: 160, height: 128, speed: 4, loop: false,
      anchorX: 16, anchorY: 0, behavior: "summon_spawn",
      lockLastFrame: false,
      spawn: { type: "summon", summonKey: "maxElephant", spawnFrame: 5 }
    },

    // Mahoraga ritual — permanent transformation, plays once
    ultimate: {
      sheet: "sprites/megumi/megumi_mahoraga_ritual.png",
      frames: 12, width: 256, height: 256, speed: 4, loop: false,
      anchorX: 64, anchorY: 64, behavior: "transformation",
      lockLastFrame: false
    },

    domain: {
      sheet: "sprites/megumi/megumi_domain_cast.png",
      frames: 8, width: 192, height: 192, speed: 5, loop: false,
      anchorX: 32, anchorY: 32, behavior: "domain_cast"
    },
    win:  { sheet: "sprites/megumi/megumi_win.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    lose: { sheet: "sprites/megumi/megumi_lose.png", frames: 4, width: 128, height: 128, speed: 10,loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" }
  }
}

// Mahoraga has its own profile — used when Megumi transforms
profiles.mahoraga = {
  defaultAction: "idle",
  actions: {
    idle:  { sheet: "sprites/mahoraga/mahoraga_idle.png",  frames: 4, width: 160, height: 192, speed: 8, loop: true,  anchorX: 16, anchorY: 32, behavior: "body_attached" },
    walk:  { sheet: "sprites/mahoraga/mahoraga_walk.png",  frames: 6, width: 160, height: 192, speed: 6, loop: true,  anchorX: 16, anchorY: 32, behavior: "body_attached" },
    hurt:  { sheet: "sprites/mahoraga/mahoraga_hurt.png",  frames: 2, width: 160, height: 192, speed: 8, loop: false, anchorX: 16, anchorY: 32, behavior: "body_attached" },
    jump:  { sheet: "sprites/mahoraga/mahoraga_jump.png",  frames: 3, width: 160, height: 192, speed: 6, loop: false, anchorX: 16, anchorY: 32, behavior: "body_attached" },
    light: { sheet: "sprites/mahoraga/mahoraga_light.png", frames: 4, width: 192, height: 192, speed: 4, loop: false, anchorX: 32, anchorY: 32, behavior: "body_attached", lockLastFrame: true },
    heavy: { sheet: "sprites/mahoraga/mahoraga_heavy.png", frames: 5, width: 192, height: 224, speed: 4, loop: false, anchorX: 32, anchorY: 48, behavior: "body_attached", lockLastFrame: true },
    up:    { sheet: "sprites/mahoraga/mahoraga_up.png",    frames: 4, width: 192, height: 256, speed: 4, loop: false, anchorX: 32, anchorY: 64, behavior: "body_attached", lockLastFrame: true },
    wheel_rotation: {
      sheet: "sprites/mahoraga/mahoraga_wheel.png",
      frames: 6, width: 256, height: 256, speed: 4, loop: false,
      anchorX: 64, anchorY: 64, behavior: "detached_effect",
      lockLastFrame: false,
      spawn: { type: "effect", effectKey: "wheel_slash", spawnFrame: 4 }
    },
    ultimate: {
      sheet: "sprites/mahoraga/mahoraga_ultimate.png",
      frames: 8, width: 256, height: 256, speed: 5, loop: false,
      anchorX: 64, anchorY: 64, behavior: "body_attached",
      lockLastFrame: true
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// SUKUNA
// Primary: melee pressure + detached cursed slash techniques
// Some attacks spawn separate slash effects across the arena
// ══════════════════════════════════════════════════════════════════
profiles.sukuna = {
  defaultAction: "idle",
  actions: {
    idle:  { sheet: "sprites/sukuna/sukuna_idle.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    walk:  { sheet: "sprites/sukuna/sukuna_walk.png",  frames: 8, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    jump:  { sheet: "sprites/sukuna/sukuna_jump.png",  frames: 4, width: 128, height: 128, speed: 6, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    fall:  { sheet: "sprites/sukuna/sukuna_fall.png",  frames: 3, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    hurt:  { sheet: "sprites/sukuna/sukuna_hurt.png",  frames: 3, width: 128, height: 128, speed: 8, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    light: { sheet: "sprites/sukuna/sukuna_light.png", frames: 4, width: 128, height: 128, speed: 3, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    heavy: { sheet: "sprites/sukuna/sukuna_heavy.png", frames: 6, width: 160, height: 128, speed: 4, loop: false, anchorX: 16, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    up:    { sheet: "sprites/sukuna/sukuna_up.png",    frames: 5, width: 160, height: 192, speed: 4, loop: false, anchorX: 16, anchorY: 32, behavior: "body_attached", lockLastFrame: true },
    air:   { sheet: "sprites/sukuna/sukuna_air.png",   frames: 4, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    down_air: { sheet: "sprites/sukuna/sukuna_down_air.png", frames: 5, width: 128, height: 160, speed: 4, loop: false, anchorX: 0, anchorY: 16, behavior: "body_attached", lockLastFrame: true },

    // Cleave — wide body slash with extended hitbox
    cleave: {
      sheet: "sprites/sukuna/sukuna_cleave.png",
      frames: 6, width: 224, height: 128, speed: 4, loop: false,
      anchorX: 48, anchorY: 0, behavior: "body_attached",
      lockLastFrame: true
    },

    // Dismantle — ranged detached slash effect
    dismantle: {
      sheet: "sprites/sukuna/sukuna_dismantle_cast.png",
      frames: 5, width: 160, height: 128, speed: 4, loop: false,
      anchorX: 16, anchorY: 0, behavior: "detached_effect",
      lockLastFrame: false,
      spawn: { type: "effect", effectKey: "slash_wave", spawnFrame: 3 }
    },

    // Malevolent Shrine domain cast
    domain: {
      sheet: "sprites/sukuna/sukuna_domain_cast.png",
      frames: 10, width: 256, height: 256, speed: 4, loop: false,
      anchorX: 64, anchorY: 64, behavior: "domain_cast",
      lockLastFrame: false
    },

    ultimate: {
      sheet: "sprites/sukuna/sukuna_ultimate.png",
      frames: 10, width: 256, height: 256, speed: 4, loop: false,
      anchorX: 64, anchorY: 64, behavior: "domain_cast"
    },
    win:  { sheet: "sprites/sukuna/sukuna_win.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    lose: { sheet: "sprites/sukuna/sukuna_lose.png", frames: 4, width: 128, height: 128, speed: 10,loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" }
  }
}

// ══════════════════════════════════════════════════════════════════
// OMOLOLU
// Primary: melee + analytical buffs (ramp mechanic, no projectiles)
// All attacks are body-attached
// ══════════════════════════════════════════════════════════════════
profiles.omololu = {
  defaultAction: "idle",
  actions: {
    idle:  { sheet: "sprites/omololu/omololu_idle.png",  frames: 4, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    walk:  { sheet: "sprites/omololu/omololu_walk.png",  frames: 6, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    jump:  { sheet: "sprites/omololu/omololu_jump.png",  frames: 4, width: 128, height: 128, speed: 6, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    fall:  { sheet: "sprites/omololu/omololu_fall.png",  frames: 3, width: 128, height: 128, speed: 6, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    hurt:  { sheet: "sprites/omololu/omololu_hurt.png",  frames: 3, width: 128, height: 128, speed: 8, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    light: { sheet: "sprites/omololu/omololu_light.png", frames: 4, width: 128, height: 128, speed: 4, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    heavy: { sheet: "sprites/omololu/omololu_heavy.png", frames: 6, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    up:    { sheet: "sprites/omololu/omololu_up.png",    frames: 5, width: 160, height: 192, speed: 4, loop: false, anchorX: 16, anchorY: 32, behavior: "body_attached", lockLastFrame: true },
    air:   { sheet: "sprites/omololu/omololu_air.png",   frames: 4, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    down_air: { sheet: "sprites/omololu/omololu_down_air.png", frames: 5, width: 128, height: 160, speed: 4, loop: false, anchorX: 0, anchorY: 16, behavior: "body_attached", lockLastFrame: true },
    // Analysis Strike — enhanced punch with gold glyph overlay
    special_1: { sheet: "sprites/omololu/omololu_analysis.png", frames: 6, width: 160, height: 128, speed: 4, loop: false, anchorX: 16, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    // Full Analysis ultimate — energy surge animation
    ultimate:  { sheet: "sprites/omololu/omololu_ultimate.png", frames: 8, width: 192, height: 192, speed: 5, loop: false, anchorX: 32, anchorY: 32, behavior: "transformation" },
    win:  { sheet: "sprites/omololu/omololu_win.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    lose: { sheet: "sprites/omololu/omololu_lose.png", frames: 4, width: 128, height: 128, speed: 10,loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" }
  }
}

// ══════════════════════════════════════════════════════════════════
// TOJI
// Primary: pure melee speed — no energy, no projectiles, all body attacks
// Heavenly Restriction means zero detached effects
// ══════════════════════════════════════════════════════════════════
profiles.toji = {
  defaultAction: "idle",
  actions: {
    idle:  { sheet: "sprites/toji/toji_idle.png",  frames: 4, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    walk:  { sheet: "sprites/toji/toji_walk.png",  frames: 6, width: 128, height: 128, speed: 5, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    run:   { sheet: "sprites/toji/toji_run.png",   frames: 8, width: 128, height: 128, speed: 3, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    jump:  { sheet: "sprites/toji/toji_jump.png",  frames: 4, width: 128, height: 128, speed: 5, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    fall:  { sheet: "sprites/toji/toji_fall.png",  frames: 3, width: 128, height: 128, speed: 5, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    dash:  { sheet: "sprites/toji/toji_dash.png",  frames: 4, width: 160, height: 128, speed: 3, loop: false, anchorX: 16, anchorY: 0, behavior: "body_attached" },
    hurt:  { sheet: "sprites/toji/toji_hurt.png",  frames: 2, width: 128, height: 128, speed: 8, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" },
    light: { sheet: "sprites/toji/toji_light.png", frames: 3, width: 128, height: 128, speed: 3, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    heavy: { sheet: "sprites/toji/toji_heavy.png", frames: 5, width: 160, height: 128, speed: 4, loop: false, anchorX: 16, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    up:    { sheet: "sprites/toji/toji_up.png",    frames: 4, width: 128, height: 192, speed: 3, loop: false, anchorX: 0, anchorY: 32, behavior: "body_attached", lockLastFrame: true },
    air:   { sheet: "sprites/toji/toji_air.png",   frames: 3, width: 128, height: 128, speed: 3, loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    down_air: { sheet: "sprites/toji/toji_down_air.png", frames: 4, width: 128, height: 160, speed: 3, loop: false, anchorX: 0, anchorY: 16, behavior: "body_attached", lockLastFrame: true },
    // Inventory Smash — weapon strike, no projectile
    special_1: { sheet: "sprites/toji/toji_inventory_smash.png", frames: 5, width: 192, height: 128, speed: 3, loop: false, anchorX: 32, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    // Rapid Strike — fast burst
    special_2: { sheet: "sprites/toji/toji_rapid_strike.png",    frames: 4, width: 160, height: 128, speed: 2, loop: false, anchorX: 16, anchorY: 0, behavior: "body_attached", lockLastFrame: true },
    // Heavenly Restriction surge
    ultimate:  { sheet: "sprites/toji/toji_ultimate.png",        frames: 6, width: 192, height: 192, speed: 4, loop: false, anchorX: 32, anchorY: 32, behavior: "transformation" },
    win:  { sheet: "sprites/toji/toji_win.png",  frames: 6, width: 128, height: 128, speed: 8, loop: true,  anchorX: 0, anchorY: 0, behavior: "body_attached" },
    lose: { sheet: "sprites/toji/toji_lose.png", frames: 4, width: 128, height: 128, speed: 10,loop: false, anchorX: 0, anchorY: 0, behavior: "body_attached" }
  }
}

// ─────────────────────────────────────────────────────────────────
// PROFILE LOOKUP API
// ─────────────────────────────────────────────────────────────────

/**
 * Get the full animation profile for a character.
 * Returns null if not found.
 */
export function getProfile(characterKey) {
  if (!characterKey) return null
  const key = String(characterKey).toLowerCase()
  return profiles[key] || null
}

/**
 * Get a specific action definition for a character.
 * Walks the fallback chain if the action is not found.
 * Returns FALLBACK_ACTION if nothing is found.
 */
export function getAction(characterKey, actionName) {
  const profile = getProfile(characterKey)
  if (!profile) return { ...FALLBACK_ACTION }

  // Direct hit
  if (profile.actions[actionName]) return profile.actions[actionName]

  // Walk fallback chain
  const chain = FALLBACK_CHAIN[actionName] || [actionName, "idle"]
  for (const fallback of chain) {
    if (profile.actions[fallback]) return profile.actions[fallback]
  }

  // Last resort
  return profile.actions[profile.defaultAction] || { ...FALLBACK_ACTION }
}

/**
 * Map a combat move key from game.js to an animation action name.
 * This allows abilities.js to use its own move naming while sprite.js
 * uses animation-specific names.
 */
export function combatMoveToAction(characterKey, combatMoveKey) {
  const moveMap = {
    // Universal
    light:    "light",
    heavy:    "heavy",
    up:       "up",
    air:      "air",
    down_air: "down_air",
    grab:     "grab",
    // Gojo
    blue:          "blue_cast",
    red:           "red_cast",
    hollowPurple:  "hollow_purple_cast",
    // Megumi summons
    divineDogs:    "divine_dogs",
    nue:           "nue",
    toad:          "toad",
    rabbitEscape:  "rabbit_escape",
    maxElephant:   "max_elephant",
    mahoragaRitual:"ultimate",
    // Goku
    dragonFist:    "special_1",
    kamehameha:    "special_2",
    // Naruto
    rasengan:           "special_1",
    shadowCloneBlast:   "special_2",
    // Sukuna
    cleave:    "cleave",
    dismantle: "dismantle",
    // Omololu
    analysisStrike: "special_1",
    // Toji
    inventorySmash: "special_1",
    rapidStrike:    "special_2",
    // Generic
    ultimate:   "ultimate",
    transform:  "transform",
    domain:     "domain"
  }

  const mapped = moveMap[combatMoveKey]
  if (!mapped) return combatMoveKey  // try the key directly
  return mapped
}

export default profiles
