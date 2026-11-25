// cloneFighterSets.js — DATA ONLY (no imports): the clone-fighter move sets for every character whose clones fight as their
// own little fighters (cloneFighter.js runs them). Kept import-free so kits.js / the Academy / the Controls Lab can list
// the moves without pulling in the sim.
//
// profile: { style (clonechoreo CLONE_STYLE key: smoke/water/wood look), kind ('smoke'|'water'|'wood'), tint, guardPose,
//            proj (projectile look), melee (hit-spark look), sets: { key: set } }
// set:     { name, dir ('N'|'F'|'U'|'B'|'D'|'SWARM'), desc, clones: [clone] }   — or { authored: '<cloneChoreography seq>' }
// clone:   { from: 'front'|'beside'|'behindFoe', approach: 'run'|'dash'|null, speed, range (px, centre gap; default =
//            70% of the first move's drawn reach), guard (frames to stand guard first), delay, steps: [step] }
// step:    { action (the character's OWN animation), frames (default = the animation's length), vx (forward drift/frame),
//            hits: [{ at (default 45% of the step), damage, hitstun, knockbackX, knockbackY, reach / reachY (default =
//            the drawn size of that pose), projectile, speed, big }] }
// Hit + hurt boxes default to the character's DRAWN size (cell × spriteScale × global scale) — see cloneFighter.js.

const h = (damage, hitstun, knockbackX, knockbackY, extra = {}) => ({ damage, hitstun, knockbackX, knockbackY, ...extra })
const shot = (damage, speed = 15, extra = {}) => ({ projectile: true, damage, hitstun: 20, knockbackX: 5, knockbackY: -1, speed, ...extra })

// the standard six picks every clone user shares (one muscle memory): N / F / U / B / D, Ultimate = SWARM
export const CLONE_PICK_DIRS = ["N", "F", "U", "B", "D", "SWARM"]
const PICK_INPUT = { N: "Special", F: "Forward + Special", U: "Up + Special", B: "Back + Special", D: "Down + Special", SWARM: "Ultimate" }

const TOBI_ASSAULT = [
  { action: "tobiCombo1", frames: 21, vx: 1.5, hits: [h(26, 24, 2, 0, { at: 8 })] },
  { action: "tobiCombo2", frames: 24, vx: 1.5, hits: [h(30, 26, 3, -1, { at: 10 })] },
  { action: "tobiComboFin", frames: 28, vx: 1, hits: [h(44, 32, 9, -7, { at: 14 })] },
]
const TOBI_RUSH = [
  { action: "tobiWaterSlash", frames: 18, vx: 4, hits: [h(34, 26, 3, -1, { at: 7 })] },
  { action: "tobiStrongFwd", frames: 24, vx: 2, hits: [h(40, 30, 6, -10, { at: 10 })] },
]
const NARUTO_ASSAULT = [
  { action: "light", vx: 1.5, hits: [h(22, 22, 2, 0)] },
  { action: "uzumakiRendan1", vx: 1.5, hits: [h(24, 24, 3, -1)] },
  { action: "heavy", vx: 1, hits: [h(38, 30, 9, -6)] },
]
const NARUTO_RUSH = [
  { action: "light", vx: 3, hits: [h(20, 22, 2, 0)] },
  { action: "komaRasengan", vx: 2, hits: [h(46, 32, 11, -4)] },
]
const SASUKE_ASSAULT = [
  { action: "light", vx: 1.5, hits: [h(22, 22, 2, 0)] },
  { action: "heavy", vx: 1.5, hits: [h(36, 30, 8, -5)] },
]
const SASUKE_RUSH = [{ action: "chidoriKoiten", vx: 3, hits: [h(46, 32, 10, -3)] }]
const ADULT_ASSAULT = [
  { action: "light", vx: 1.5, hits: [h(24, 22, 2, 0)] },
  { action: "heavy", vx: 1.5, hits: [h(38, 30, 8, -5)] },
]
const ADULT_RUSH = [{ action: "chidori", vx: 4, hits: [h(48, 32, 10, -3)] }]
const SENSEI_ASSAULT = [
  { action: "light", vx: 1.5, hits: [h(22, 22, 2, 0)] },
  { action: "heavy", vx: 1.5, hits: [h(30, 26, 4, -1)] },
  { action: "ssRaitonSword3", frames: 18, vx: 1, hits: [h(36, 30, 9, -6)] },
]
const SENSEI_RUSH = [{ action: "ssChidori", vx: 4, hits: [h(48, 32, 10, -3)] }]
const N7_ASSAULT = [
  { action: "light", vx: 1.5, hits: [h(22, 22, 2, 0)] },
  { action: "heavy", vx: 1.5, hits: [h(28, 26, 4, -1)] },
  { action: "n7StrongFwd", frames: 20, vx: 1, hits: [h(36, 30, 9, -6)] },
]
const N7_RUSH = [{ action: "n7Rasengan", frames: 22, vx: 3, hits: [h(48, 32, 11, -4)] }]
const HASHI_ASSAULT = [
  { action: "hashiComboA", vx: 1.5, hits: [h(24, 24, 2, 0)] },
  { action: "hashiComboB", vx: 1.5, hits: [h(26, 26, 3, -1)] },
  { action: "hashiComboFin", vx: 1, hits: [h(40, 32, 9, -7)] },
]
const HASHI_RUSH = [
  { action: "hashiWoodStraight", frames: 16, vx: 3, hits: [h(28, 24, 3, 0)] },
  { action: "woodPunch", vx: 1, hits: [h(44, 32, 11, -4)] },
]
const MADARA_ASSAULT = [
  { action: "light", frames: 14, vx: 1.5, hits: [h(22, 22, 2, 0)] },
  { action: "heavy", vx: 1.5, hits: [h(30, 26, 4, -1)] },
  { action: "air_heavy", frames: 18, vx: 1, hits: [h(38, 30, 9, -6)] },
]
const MADARA_RUSH = [{ action: "madaraSusanooPunch", frames: 20, vx: 3, hits: [h(50, 34, 11, -5)] }]

const guardian = (name, desc, steps, extra = {}) => ({ name, dir: "D", desc, clones: [{ from: "front", approach: "run", speed: 6, guard: 100, steps, ...extra }] })
const pincer = (name, desc, front, behind, third = null) => ({ name, dir: "SWARM", desc, clones: [
  { from: "front", approach: "run", speed: 7, steps: front },
  { from: "behindFoe", approach: "dash", speed: 12, delay: 10, steps: behind },
  ...(third ? [{ from: "front", approach: "run", speed: 8, delay: 22, steps: third }] : []),
] })

export const CLONE_FIGHTER_PROFILES = {
  // ── TOBIRAMA — Water Clones (Suiton: Mizu Bunshin): rise out of a puddle (his own sheet), melt back into it ──
  tobirama: { style: "tobirama", kind: "water", tint: { color: "#4fb8ff", strength: 0.28 }, label: "Water Clone",
    melee: { color: "#38bdf8" }, proj: { color: "#7dd3fc" },
    sets: {
      assault:  { name: "Water Clone Assault", dir: "N", desc: "A water clone rises, runs at the foe and throws a 3-hit string (punches → water burst → slam), then melts back into water.",
                  clones: [{ from: "front", approach: "run", speed: 7, range: 60, steps: TOBI_ASSAULT }] },
      rush:     { name: "Water Clone Severing Rush", dir: "F", desc: "A water clone dashes in fast, cuts with the water blade, then a tumbling launch kick.",
                  clones: [{ from: "front", approach: "dash", speed: 14, range: 74, steps: TOBI_RUSH }] },
      geyser:   { name: "Water Clone Geyser", dir: "U", desc: "A water clone runs under the foe: rising kick, then a water geyser that launches them high — Tobirama follows up.",
                  clones: [{ from: "front", approach: "run", speed: 7, range: 56, steps: [
                    { action: "up", frames: 24, vx: 1, hits: [h(30, 26, 1, -9, { at: 8 })] },
                    { action: "tobiRisingWater", frames: 21, hits: [h(44, 36, 2, -14, { at: 9, reachY: 130 })] }] }] },
      gunner:   { name: "Water Clone Dragon Gunner", dir: "B", desc: "A water clone rises beside Tobirama and fires two Water Dragon bullets, then melts.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "tobiWaterDragon", frames: 30, hits: [shot(36, 15, { at: 20 })] },
                    { action: "tobiWaterDragon", frames: 30, hits: [shot(36, 16, { at: 20, knockbackX: 6, knockbackY: -2 })] }] }] },
      guardian: guardian("Water Clone Guardian", "A water clone stands guard in front of Tobirama, eats the first hit and counters (rising knee → lunge).", [
                  { action: "tobiRisingKnee", frames: 24, vx: 1, hits: [h(32, 26, 2, -6, { at: 8 })] },
                  { action: "heavy", frames: 20, vx: 3, hits: [h(46, 28, 10, -3, { at: 7 })] }], { range: 66 }),
      pincer:   pincer("Water Clone Pincer", "Two water clones: one attacks from the front, one rises out of the water behind the foe.", TOBI_ASSAULT, TOBI_RUSH),
    } },

  // ── NARUTO — Shadow Clones (Kage Bunshin): pop out of smoke, poof back into it ──
  naruto: { style: "naruto", kind: "smoke", label: "Shadow Clone", melee: { color: "#fb923c" }, proj: { color: "#7dd3fc", sheet: "./naruto_kcm_fx_rasengan_sphere.png" },
    sets: {
      assault:  { name: "Shadow Clone Assault", dir: "N", desc: "A shadow clone pops out, runs in and throws a 3-hit string (jab → Uzumaki kick → heavy), then poofs.",
                  clones: [{ from: "front", approach: "run", speed: 8, steps: NARUTO_ASSAULT }] },
      rush:     { name: "Shadow Clone Rasengan Rush", dir: "F", desc: "A shadow clone dashes in, jabs, and drives a Rasengan through the foe.",
                  clones: [{ from: "front", approach: "dash", speed: 14, steps: NARUTO_RUSH }] },
      geyser:   { name: "Shadow Clone Uzumaki Launch", dir: "U", desc: "A shadow clone runs under the foe and kicks them high (Uzumaki launcher) for Naruto to chase.",
                  clones: [{ from: "front", approach: "run", speed: 8, steps: [
                    { action: "up", vx: 1, hits: [h(30, 28, 1, -11)] },
                    { action: "uzumakiRendan2", hits: [h(30, 30, 2, -7, { reachY: 100 })] }] }] },
      gunner:   { name: "Shadow Clone Rasengan Volley", dir: "B", desc: "A shadow clone stands beside Naruto and fires two Rasengan shots.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "rasengan_cast", hits: [shot(32, 15)] },
                    { action: "rasenshuriken_cast", hits: [shot(36, 16, { big: true })] }] }] },
      guardian: guardian("Shadow Clone Guard", "A shadow clone guards in front of Naruto, eats the first hit and counters (jab → heavy).", [
                  { action: "light", vx: 1, hits: [h(24, 24, 2, -2)] },
                  { action: "heavy", vx: 3, hits: [h(40, 30, 10, -4)] }]),
      pincer:   pincer("Shadow Clone Swarm", "Three shadow clones: one from the front, one behind the foe, a third piling in.", NARUTO_ASSAULT, NARUTO_RUSH, NARUTO_ASSAULT.slice(0, 2)),
    } },
  naruto_seventh: { style: "naruto", kind: "smoke", label: "Shadow Clone", melee: { color: "#fb923c" }, proj: { color: "#7dd3fc", sheet: "./naruto_kcm_fx_rasengan_sphere.png" },
    sets: {
      assault:  { name: "Shadow Clone Assault", dir: "N", desc: "A shadow clone runs in: jab → heavy → strong forward strike, then poofs.",
                  clones: [{ from: "front", approach: "run", speed: 8, steps: N7_ASSAULT }] },
      rush:     { name: "Shadow Clone Rasengan Rush", dir: "F", desc: "A shadow clone dashes in and drives a Rasengan through the foe.",
                  clones: [{ from: "front", approach: "dash", speed: 14, steps: N7_RUSH }] },
      geyser:   { name: "Shadow Clone Launch", dir: "U", desc: "A shadow clone runs under the foe and launches them high.",
                  clones: [{ from: "front", approach: "run", speed: 8, steps: [
                    { action: "up", vx: 1, hits: [h(30, 28, 1, -11)] },
                    { action: "air", frames: 18, hits: [h(28, 30, 2, -7, { reachY: 100 })] }] }] },
      gunner:   { name: "Shadow Clone Kunai Volley", dir: "B", desc: "A shadow clone stands beside Naruto, throws a kunai, then a Rasenshuriken.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "n7Throw", frames: 16, hits: [shot(22, 18)] },
                    { action: "n7Rsk", frames: 22, hits: [shot(40, 15, { big: true })] }] }] },
      guardian: guardian("Shadow Clone Guard", "A shadow clone guards in front of Naruto, eats the first hit and counters (jab → strong down strike).", [
                  { action: "light", vx: 1, hits: [h(24, 24, 2, -2)] },
                  { action: "n7StrongDown", vx: 2, hits: [h(40, 30, 9, -6)] }]),
      pincer:   pincer("Shadow Clone Swarm", "Three shadow clones: one from the front, one behind the foe, a third piling in.", N7_ASSAULT, N7_RUSH, N7_ASSAULT.slice(0, 2)),
    } },

  // ── SASUKE (all three) — Shadow Clones (small, fast smoke) ──
  sasuke: { style: "sasuke", kind: "smoke", label: "Shadow Clone", melee: { color: "#a78bfa" }, proj: { color: "#cbd5e1" },
    sets: {
      assault:  { name: "Shadow Clone Strike", dir: "N", desc: "A shadow clone runs in: jab → heavy, then poofs.",
                  clones: [{ from: "front", approach: "run", speed: 9, steps: SASUKE_ASSAULT }] },
      rush:     { name: "Shadow Clone Chidori", dir: "F", desc: "A shadow clone dashes in with a Chidori.",
                  clones: [{ from: "front", approach: "dash", speed: 15, steps: SASUKE_RUSH }] },
      geyser:   { name: "Shadow Clone Lion Launch", dir: "U", desc: "A shadow clone kicks the foe up, then follows with an air strike.",
                  clones: [{ from: "front", approach: "run", speed: 9, steps: [
                    { action: "up", vx: 1, hits: [h(30, 28, 1, -11)] },
                    { action: "air", hits: [h(26, 28, 2, -6, { reachY: 100 })] }] }] },
      gunner:   { name: "Shadow Clone Shuriken", dir: "B", desc: "A shadow clone beside Sasuke throws two shuriken.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "shurikenThrow", frames: 16, hits: [shot(22, 19)] },
                    { action: "shurikenThrow", frames: 16, hits: [shot(22, 19)] }] }] },
      amenotejikara: { name: "Amenotejikara", dir: "D", desc: "Sasuke's own Amenotejikara swap (the old clone move, unchanged).", authored: "amenotejikara" },
      pincer:   pincer("Shadow Clone Pincer", "Two shadow clones: one from the front, one behind the foe with a Chidori.", SASUKE_ASSAULT, SASUKE_RUSH),
    } },
  sasuke_adult: { style: "sasuke", kind: "smoke", label: "Shadow Clone", melee: { color: "#a78bfa" }, proj: { color: "#f97316", big: true },
    sets: {
      assault:  { name: "Shadow Clone Sword Strike", dir: "N", desc: "A shadow clone runs in: jab → sword slash, then poofs.",
                  clones: [{ from: "front", approach: "run", speed: 9, steps: ADULT_ASSAULT }] },
      rush:     { name: "Shadow Clone Chidori", dir: "F", desc: "A shadow clone dashes in with a Chidori.",
                  clones: [{ from: "front", approach: "dash", speed: 15, steps: ADULT_RUSH }] },
      geyser:   { name: "Shadow Clone Launch", dir: "U", desc: "A shadow clone launches the foe with a rising slash, then an air strike.",
                  clones: [{ from: "front", approach: "run", speed: 9, steps: [
                    { action: "up", vx: 1, hits: [h(32, 28, 1, -11)] },
                    { action: "air", frames: 16, hits: [h(26, 28, 2, -6, { reachY: 100 })] }] }] },
      gunner:   { name: "Shadow Clone Katon", dir: "B", desc: "A shadow clone beside Sasuke throws a kunai, then a Great Fireball.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "throw", frames: 16, hits: [shot(20, 19)] },
                    { action: "katon", frames: 22, hits: [shot(42, 13, { big: true })] }] }] },
      guardian: guardian("Shadow Clone Guard", "A shadow clone guards in front of Sasuke, eats the first hit and counters (jab → sword-swap strike).", [
                  { action: "light", vx: 1, hits: [h(24, 24, 2, -2)] },
                  { action: "swordSwap", vx: 2, hits: [h(40, 30, 9, -5)] }]),
      pincer:   pincer("Shadow Clone Pincer", "Two shadow clones: one from the front, one behind the foe with a Chidori.", ADULT_ASSAULT, ADULT_RUSH),
    } },
  sasuke_sensei: { style: "sasuke", kind: "smoke", label: "Shadow Clone", melee: { color: "#a78bfa" }, proj: { color: "#f97316", big: true },
    sets: {
      assault:  { name: "Shadow Clone Raiton Strike", dir: "N", desc: "A shadow clone runs in: jab → heavy → Raiton sword, then poofs.",
                  clones: [{ from: "front", approach: "run", speed: 9, steps: SENSEI_ASSAULT }] },
      rush:     { name: "Shadow Clone Chidori", dir: "F", desc: "A shadow clone dashes in with a Chidori.",
                  clones: [{ from: "front", approach: "dash", speed: 15, steps: SENSEI_RUSH }] },
      geyser:   { name: "Shadow Clone Launch", dir: "U", desc: "A shadow clone launches the foe, then a rising Raiton sword.",
                  clones: [{ from: "front", approach: "run", speed: 9, steps: [
                    { action: "up", vx: 1, hits: [h(32, 28, 1, -11)] },
                    { action: "ssRaitonSword2", frames: 16, hits: [h(26, 28, 2, -6, { reachY: 100 })] }] }] },
      gunner:   { name: "Shadow Clone Katon", dir: "B", desc: "A shadow clone beside Sasuke breathes two Katon fireballs.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "ssKatonCast", frames: 22, hits: [shot(36, 13, { big: true })] },
                    { action: "ssKatonCast", frames: 22, hits: [shot(36, 13, { big: true })] }] }] },
      guardian: guardian("Shadow Clone Guard", "A shadow clone guards in front of Sasuke, eats the first hit and counters (jab → Chidori Eisou).", [
                  { action: "light", vx: 1, hits: [h(24, 24, 2, -2)] },
                  { action: "ssChidoriEisou", vx: 2, hits: [h(40, 30, 9, -4)] }]),
      pincer:   pincer("Shadow Clone Pincer", "Two shadow clones: one from the front, one behind the foe with a Chidori.", SENSEI_ASSAULT, SENSEI_RUSH),
    } },

  // ── HASHIRAMA — Wood Clones (Mokuton Bunshin): grow out of the ground (his own sheet), splinter apart ──
  hashirama: { style: "hashirama", kind: "wood", tint: { color: "#a16207", strength: 0.16 }, label: "Wood Clone",
    melee: { color: "#65a30d" }, proj: { color: "#84cc16" }, guardPose: "charge",
    sets: {
      assault:  { name: "Wood Clone Assault", dir: "N", desc: "A wood clone grows out of the ground, runs in and throws Hashirama's 3-hit string, then splinters.",
                  clones: [{ from: "front", approach: "run", speed: 7, steps: HASHI_ASSAULT }] },
      rush:     { name: "Wood Clone Mokuton Rush", dir: "F", desc: "A wood clone dashes in: wood straight → a long Wood Release punch.",
                  clones: [{ from: "front", approach: "dash", speed: 13, steps: HASHI_RUSH }] },
      geyser:   { name: "Wood Clone Root Launch", dir: "U", desc: "A wood clone launches the foe, then a Mokuton arm pops them higher.",
                  clones: [{ from: "front", approach: "run", speed: 7, steps: [
                    { action: "up", vx: 1, hits: [h(30, 28, 1, -11)] },
                    { action: "mokutonArm", hits: [h(36, 32, 2, -13, { reachY: 110 })] }] }] },
      gunner:   { name: "Wood Clone Kunai", dir: "B", desc: "A wood clone beside Hashirama throws two kunai.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "kunaiThrow", frames: 16, hits: [shot(24, 18)] },
                    { action: "kunaiThrow", frames: 16, hits: [shot(24, 18)] }] }] },
      guardian: guardian("Wood Clone Guard", "A wood clone braces in front of Hashirama, eats the first hit and counters (jab → heavy).", [
                  { action: "light", vx: 1, hits: [h(26, 24, 2, -2)] },
                  { action: "heavy", vx: 2, hits: [h(40, 30, 10, -4)] }]),
      pincer:   pincer("Wood Clone Pincer", "Two wood clones: one from the front, one grows behind the foe.", HASHI_ASSAULT, HASHI_RUSH),
    } },

  // ── MADARA — Shadow Clones (dark smoke); they work in Susanoo too ──
  madara: { style: "madara", kind: "smoke", label: "Shadow Clone", melee: { color: "#dc2626" }, proj: { color: "#f97316", big: true },
    sets: {
      assault:  { name: "Shadow Clone Assault", dir: "N", desc: "A shadow clone steps out of dark smoke, runs in and throws a 3-hit string, then vanishes.",
                  clones: [{ from: "front", approach: "run", speed: 8, steps: MADARA_ASSAULT }] },
      rush:     { name: "Shadow Clone Susanoo Fist", dir: "F", desc: "A shadow clone dashes in and throws a Susanoo punch.",
                  clones: [{ from: "front", approach: "dash", speed: 14, steps: MADARA_RUSH }] },
      geyser:   { name: "Shadow Clone Wood Spike", dir: "U", desc: "A shadow clone launches the foe, then wood spikes erupt under them.",
                  clones: [{ from: "front", approach: "run", speed: 8, steps: [
                    { action: "up", vx: 1, hits: [h(30, 28, 1, -11)] },
                    { action: "madaraWoodSpikeCast", hits: [h(38, 32, 2, -14, { reach: 120, reachY: 110 })] }] }] },
      gunner:   { name: "Shadow Clone Katon", dir: "B", desc: "A shadow clone beside Madara breathes two Great Fireballs.",
                  clones: [{ from: "beside", approach: null, steps: [
                    { action: "madaraFireballCast", hits: [shot(36, 13, { big: true, at: 20 })] },
                    { action: "madaraFireballCast", hits: [shot(36, 13, { big: true, at: 20 })] }] }] },
      guardian: guardian("Shadow Clone Guard", "A shadow clone guards in front of Madara, eats the first hit and counters (jab → Susanoo punch).", [
                  { action: "light", frames: 14, vx: 1, hits: [h(24, 24, 2, -2)] },
                  { action: "madaraSusanooPunch", frames: 20, vx: 2, hits: [h(44, 32, 11, -5)] }]),
      pincer:   pincer("Shadow Clone Swarm", "Three shadow clones: one from the front, one behind the foe, a third piling in.", MADARA_ASSAULT, MADARA_RUSH, MADARA_ASSAULT.slice(0, 2)),
    } },
}

export function cloneFighterProfile(key) { return CLONE_FIGHTER_PROFILES[(key || "").toLowerCase()] || null }
export function hasCloneFighters(key) { return !!cloneFighterProfile(key) }
// pick dir → set key for a character
export function cloneSetForDir(key, dir) {
  const P = cloneFighterProfile(key); if (!P) return null
  return Object.keys(P.sets).find(k => P.sets[k].dir === dir) || Object.keys(P.sets).find(k => P.sets[k].dir === "N")
}
// kit / Academy / Controls Lab rows for a character's clone moves
export function cloneFighterKitRows(key) {
  const P = cloneFighterProfile(key); if (!P) return []
  return CLONE_PICK_DIRS.map(d => Object.values(P.sets).find(s => s.dir === d)).filter(Boolean).map(s => ({
    name: s.name, input: `↓↓↑ + Special, then ${PICK_INPUT[s.dir]}`, cost: 25,
    labTail: s.authored ? 60 : (s.clones || []).some(c => c.guard) ? 210 : 130,
    desc: s.authored ? s.desc : `${s.desc} ${P.label === "Shadow Clone" ? "" : ""}Summon (↓↓↑ + Special), then pick. The clone fights on its own; you stay free to attack with it.`.replace(/\s+/g, " ").trim(),
  }))
}
