// skins.js
// ──────────────────────────────────────────────────────────────────────────
// SKIN SYSTEM (Tasks 1/4/5). Each character has a list of skins:
//   { id, name, unlockLevel, portrait, spriteScale, animationData }
//
// FALLBACK RULE (per request): a skin's animationData = the character's DEFAULT
// animationData with the skin's OWN strips layered on top. So any slot the skin
// has its own art for uses it; every other slot is BORROWED from default. This
// guarantees a COMPLETE moveset per skin for the demo. Ambiguous rows are mapped
// with a best GUESS (see SKIN_GUESSES, surfaced in the report).
//
// Apply at match time via getSkinAnimationData(rosterKey, skinId) → set on the
// fighter; sprite.js/animationProfile prefer it (per-fighter, so mirror matches
// with different skins work). Default skin returns null = use existing art.
// ──────────────────────────────────────────────────────────────────────────
import { characters } from "./characters.js"
import { getLevel, isDevUnlocked } from "./progression.js"

// ── OWN art per non-default skin (overrides; everything else is borrowed) ──────
// Dimensions MEASURED from the PNGs (frames × cell W×H). "[guess]" rows are noted
// in SKIN_GUESSES below for your correction.
const OWN = {
  // ---- GOJO2 (filenames clear; no basic-attack/hurt/dash sheets → borrowed) ----
  gojo2: {
    idle:               { frames: 5,  width: 25, height: 68, speed: 6, sheet: "./gojo2_idle_sheet.png" },
    walk:               { frames: 6,  width: 29, height: 68, speed: 5, sheet: "./gojo2_walk_sheet.png" },
    run:                { frames: 6,  width: 29, height: 68, speed: 4, sheet: "./gojo2_walk_sheet.png" },
    jump:               { frames: 5,  width: 27, height: 64, speed: 6, sheet: "./gojo2_jump_sheet.png" },
    fall:               { frames: 5,  width: 27, height: 64, speed: 6, sheet: "./gojo2_jump_sheet.png" },
    transform:          { frames: 9,  width: 30, height: 71, speed: 6, sheet: "./gojo2_intro_sheet.png", loop: false, lockLastFrame: true },
    blue_cast:          { frames: 10, width: 50, height: 68, speed: 5, sheet: "./gojo2_blue_sheet.png" },
    red_cast:           { frames: 4,  width: 26, height: 68, speed: 5, sheet: "./gojo2_red_sheet.png" },
    hollow_purple_cast: { frames: 12, width: 51, height: 68, speed: 5, sheet: "./gojo2_hollow_purple_sheet.png" },
    domain:             { frames: 14, width: 29, height: 70, speed: 5, sheet: "./gojo2_domain_sheet.png" }
  },

  // ---- SUKUNA3 (attack rows GUESSED) ----
  sukuna3: {
    idle:             { frames: 6,  width: 28, height: 64, speed: 6, sheet: "./sukuna3_idle_sheet.png" },
    walk:             { frames: 9,  width: 47, height: 63, speed: 5, sheet: "./sukuna3_walk_sheet.png" },
    run:              { frames: 6,  width: 51, height: 58, speed: 4, sheet: "./sukuna3_run_sheet.png" },
    jump:             { frames: 4,  width: 34, height: 66, speed: 6, sheet: "./sukuna3_jump_sheet.png" },
    fall:             { frames: 4,  width: 34, height: 66, speed: 6, sheet: "./sukuna3_jump_sheet.png" },
    hurt:             { frames: 5,  width: 64, height: 55, speed: 6, sheet: "./sukuna3_knockdown_sheet.png" },
    transform:        { frames: 10, width: 42, height: 63, speed: 6, sheet: "./sukuna3_intro_sheet.png", loop: false, lockLastFrame: true },
    light:            { frames: 5,  width: 48, height: 61, speed: 4, sheet: "./sukuna3_punch_sheet.png" },          // [guess]
    heavy:            { frames: 6,  width: 43, height: 63, speed: 5, sheet: "./sukuna3_attack_a_sheet.png" },        // [guess]
    up:               { frames: 5,  width: 49, height: 63, speed: 5, sheet: "./sukuna3_kick_sheet.png" },            // [guess]
    air:              { frames: 5,  width: 39, height: 62, speed: 4, sheet: "./sukuna3_attack_b_sheet.png" },        // [guess]
    down_air:         { frames: 5,  width: 35, height: 63, speed: 4, sheet: "./sukuna3_attack_c_sheet.png" },        // [guess]
    grab:             { frames: 4,  width: 35, height: 64, speed: 5, sheet: "./sukuna3_attack_d_sheet.png" },        // [guess]
    cleave:           { frames: 8,  width: 57, height: 62, speed: 4, sheet: "./sukuna3_slash_sheet.png" },           // [guess]
    dismantle:        { frames: 4,  width: 44, height: 62, speed: 4, sheet: "./sukuna3_slash_special_sheet.png" },   // [guess]
    flame_arrow_fire: { frames: 10, width: 41, height: 63, speed: 5, sheet: "./sukuna3_fire_special_sheet.png" }     // [guess, high conf]
    // UNUSED for now: sukuna3_combo (12f), sukuna3_attack_e (6f)
  },

  // ---- MEGUMI2 (combat_a–h / move_c–e GUESSED) ----
  megumi2: {
    idle:         { frames: 4,  width: 23, height: 37,  speed: 6, sheet: "./megumi2_idle_sheet.png" },
    walk:         { frames: 4,  width: 32, height: 35,  speed: 5, sheet: "./megumi2_walk_a_sheet.png" },
    run:          { frames: 5,  width: 21, height: 35,  speed: 4, sheet: "./megumi2_walk_b_sheet.png" },             // [guess]
    hurt:         { frames: 6,  width: 38, height: 33,  speed: 6, sheet: "./megumi2_knockdown_sheet.png" },
    ultimate:     { frames: 9,  width: 93, height: 120, speed: 6, sheet: "./megumi2_combat_a_sheet.png" },           // [guess]
    light:        { frames: 3,  width: 42, height: 35,  speed: 4, sheet: "./megumi2_combat_b_sheet.png" },           // [guess]
    heavy:        { frames: 4,  width: 43, height: 48,  speed: 4, sheet: "./megumi2_combat_c_sheet.png" },           // [guess]
    up:           { frames: 13, width: 35, height: 36,  speed: 4, sheet: "./megumi2_combat_d_sheet.png" },           // [guess]
    air:          { frames: 13, width: 44, height: 36,  speed: 4, sheet: "./megumi2_combat_e_sheet.png" },           // [guess]
    down_air:     { frames: 6,  width: 23, height: 27,  speed: 4, sheet: "./megumi2_combat_f_sheet.png" },           // [guess]
    grab:         { frames: 7,  width: 32, height: 36,  speed: 5, sheet: "./megumi2_combat_g_sheet.png" },           // [guess]
    divine_dogs:  { frames: 3,  width: 31, height: 33,  speed: 5, sheet: "./megumi2_combat_h_sheet.png" },           // [guess]
    nue:          { frames: 3,  width: 21, height: 32,  speed: 5, sheet: "./megumi2_move_c_sheet.png" },             // [guess]
    max_elephant: { frames: 6,  width: 24, height: 37,  speed: 5, sheet: "./megumi2_move_d_sheet.png" },             // [guess]
    toad:         { frames: 2,  width: 18, height: 29,  speed: 5, sheet: "./megumi2_move_e_sheet.png" }              // [guess]
  }
}

// The exact GUESSED rows (ambiguous strips → slot), for the report / your edits.
export const SKIN_GUESSES = {
  sukuna3: {
    "light": "punch", "heavy": "attack_a", "up": "kick", "air": "attack_b",
    "down_air": "attack_c", "grab": "attack_d", "cleave": "slash",
    "dismantle": "slash_special", "flame_arrow_fire": "fire_special",
    "_unused": ["combo", "attack_e"]
  },
  megumi2: {
    "ultimate": "combat_a", "light": "combat_b", "heavy": "combat_c", "up": "combat_d",
    "air": "combat_e", "down_air": "combat_f", "grab": "combat_g",
    "divine_dogs(cast)": "combat_h", "nue(cast)": "move_c",
    "max_elephant(cast)": "move_d", "toad(cast)": "move_e", "run": "walk_b"
  }
}

// Display scale per skin (source cell heights differ from default).
const SKIN_SCALE = { gojo2: 1.8, sukuna3: 1.8, megumi2: 2.2 /* cells vary 33–120px → compromise (flagged) */ }

function buildComplete(rosterKey, ownKey) {
  const base = characters[rosterKey]?.animationData || {}
  return { ...base, ...(OWN[ownKey] || {}) }   // OWN overrides borrowed defaults
}

export const SKINS = {
  gojo: [
    { id: "default", name: "Default",         unlockLevel: 0, portrait: characters.gojo?.portrait,   spriteScale: characters.gojo?.spriteScale,   animationData: null },
    { id: "gojo2",   name: "Limitless (Alt)", unlockLevel: 5, portrait: "./gojo2_idle_sheet.png",    spriteScale: SKIN_SCALE.gojo2,   animationData: buildComplete("gojo", "gojo2") }
  ],
  sukuna: [
    { id: "default", name: "Default",            unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: null },
    { id: "sukuna3", name: "King of Curses (Alt)", unlockLevel: 8, portrait: "./sukuna3_idle_sheet.png",  spriteScale: SKIN_SCALE.sukuna3, animationData: buildComplete("sukuna", "sukuna3") }
  ],
  megumi: [
    { id: "default", name: "Default",          unlockLevel: 0, portrait: characters.megumi?.portrait, spriteScale: characters.megumi?.spriteScale, animationData: null },
    { id: "megumi2", name: "Ten Shadows (Alt)", unlockLevel: 3, portrait: "./megumi2_idle_sheet.png",  spriteScale: SKIN_SCALE.megumi2,  animationData: buildComplete("megumi", "megumi2") }
  ]
}

export function getSkins(rosterKey) {
  return SKINS[rosterKey] || [{ id: "default", name: "Default", unlockLevel: 0, portrait: null, spriteScale: 1, animationData: null }]
}
export function getSkin(rosterKey, skinId) {
  const list = getSkins(rosterKey)
  return list.find(s => s.id === skinId) || list[0]
}
export function getSkinAnimationData(rosterKey, skinId) {
  return getSkin(rosterKey, skinId)?.animationData || null   // null = use the character's default
}
export function isSkinUnlocked(rosterKey, skinId) {
  const skin = getSkin(rosterKey, skinId)
  if (!skin || skin.unlockLevel <= 0) return true
  if (isDevUnlocked()) return true
  return getLevel() >= skin.unlockLevel
}
