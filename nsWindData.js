// MSV1 — Power Rangers Ninja Storm: SHANE CLARKE (Red Wind Ranger, AIR) + DUSTIN BROOKS (Yellow Wind Ranger, EARTH).
// DATA ONLY: ninja.js profiles (which also register the rangers.js profiles = S.P.D. Red's run + double-tap detector),
// frame-exact move tables, sequences (super / ultimate / illusion counters) and the two roster entries.
// Logic: ninja.js (shared framework) + nsWind.js (command layer + specials). Render: nsWindFx.js. Sound: nsWindSound.js.
// Canon guard: the Yellow Wind Ranger is DUSTIN (Earth). Tori is the Blue (Water) Ranger and is not in this build.
// Damage numbers are RAW (the engine's GLOBAL_DAMAGE_SCALE and 85% combo scaling apply in play).
import { SHANE_ANIM, DUSTIN_ANIM, NINJA_STORM_GEO } from './msv1NinjaSprites.js'
import { registerNinjaProfile } from './ninja.js'

// ── S.P.D. Red reference (docs/msv1/SPD_RED_REFERENCE.md): speed 88 → walk 7.0 px/f; run ×1.5 → 10.5 px/f. ──
export const SPD_RED_SPEED = 88
export const SPD_RED_HEALTH = 1200
export const SPD_RED_RUN = { speed: 8.4, walk: 5.6 }

const n = (damage, startup, active, recovery, x = {}) => ({ damage, startup, active, recovery, frameExact: true, damageType: 'blunt', category: 'light',
  hitstun: 18, blockstun: 11, rangeX: 62, rangeY: 50, boxY: 14, knockbackX: 3, knockbackY: 0, ...x })

// Shared chassis (same sheet layout); per-ranger damage. `anim` = the strip in msv1NinjaSprites.js.
function moves(d) {
  return {
    light: n(d.jab, 5, 2, 10, { anim: 'jab', echo: true }),
    str1: n(d.s1, 6, 2, 11, { anim: 'string', echo: true }),
    str2: n(d.s2, 6, 2, 12, { anim: 'string', echo: true }),
    str3: n(d.s3, 9, 3, 18, { anim: 'stringEnd', category: 'heavy', hitstun: 26, knockbackX: 7, rangeX: 78, echo: true }),
    up: n(d.rise, 8, 4, 18, { anim: 'risingKick', category: 'launcher', launcher: true, rangeX: 58, rangeY: 110, boxY: -40, launchVy: -20, selfVy: 0, hitstun: 30, antiAir: true, echo: true }),
    low: n(d.low, 7, 3, 16, { anim: 'low', hitLevel: 'low', rangeX: 84, rangeY: 30, boxY: 70, hitstun: 22, echo: true }),
    heavy: n(d.sword, 10, 3, 20, { anim: 'sword', category: 'heavy', damageType: 'slash', rangeX: 96, rangeY: 60, boxY: 4, hitstun: 30, blockstun: 14, knockbackX: 5, echo: true }),
    air: n(d.airL, 6, 3, 14, { anim: 'airAttack', rangeX: 70, rangeY: 56, boxY: 24, hitstun: 22, knockbackY: -2 }),
    airHeavy: n(d.airSword, 8, 3, 16, { anim: 'swordAir', category: 'heavy', damageType: 'slash', rangeX: 92, rangeY: 64, boxY: 14, hitstun: 26, knockbackY: -3 }),
    ...d.extra,
  }
}

// ═══ SHANE — RED WIND RANGER (AIR) ════════════════════════════════════════════════════════════════════════════
export const SHANE_MOVES = moves({ jab: 38, s1: 30, s2: 30, s3: 52, rise: 70, low: 44, sword: 64, airL: 32, airSword: 58,
  extra: {
    // Hawk Dive (air ↓+Heavy): R9 dive kick down-forward, ground bounce on hit
    down_air: n(72, 6, 14, 14, { anim: 'diveKick', category: 'heavy', rangeX: 64, rangeY: 70, boxY: 40, hitstun: 30, dive: { vx: 7, vy: 13 }, groundBounce: true, knockbackY: 0 }),
    // Skate Slide (↘+Heavy): R11 skid frames, low, slides UNDER projectiles (skateboarder nod)
    skate: n(50, 6, 10, 14, { anim: 'skid', hitLevel: 'low', rangeX: 70, rangeY: 34, boxY: 66, hitstun: 24, travel: { from: 2, to: 16, px: 11 }, underProj: true }),
    // Gale Crescent (→+Heavy): the R15 crescent arc detaches as a short-range wind projectile
    gale: n(0, 11, 1, 16, { anim: 'galeCrescent', category: 'special', isSpecial: true, noBody: true, np: 12, shot: 'crescent' }),
    // Air Ninja Tornado (↓↘→+Special): R11 drill tornado, 5 hits × 13 energy, travels 50% screen
    tornado: n(0, 6, 1, 14, { anim: 'tornado', category: 'special', isSpecial: true, noBody: true, np: 20, tornado: { frames: 34, hits: 5, every: 6, dmg: 13, distPct: 0.5 } }),
    beam: n(0, 10, 1, 16, { anim: 'throw', category: 'special', isSpecial: true, noBody: true, np: 15, shot: 'beam' }),
    kunai: n(0, 8, 1, 14, { anim: 'throw', category: 'special', isSpecial: true, noBody: true, np: 10, shot: 'kunai' }),
    super: n(0, 2, 1, 2, { anim: 'guard', category: 'ultimate', isUltimate: true, noBody: true, energy: 50, seq: 'stormAscension' }),
    ult: n(0, 2, 1, 2, { anim: 'guard', category: 'ultimate', isUltimate: true, noBody: true, energy: 100, seq: 'hawkMirage', mirrorOnly: true }),
  } })

// ═══ DUSTIN — YELLOW WIND RANGER (EARTH) ══════════════════════════════════════════════════════════════════════
export const DUSTIN_MOVES = moves({ jab: 42, s1: 34, s2: 34, s3: 58, rise: 76, low: 50, sword: 70, airL: 34, airSword: 60,
  extra: {
    // Ground Pound (air ↓+Heavy): drops, and the R8 landing-dust ring is a ground SHOCKWAVE (80, hits OTG)
    down_air: n(0, 4, 1, 4, { anim: 'diveKick', category: 'heavy', noBody: true, pound: { vy: 16, dmg: 80, reach: 120, recovery: 16 } }),
    lunge: n(70, 12, 3, 20, { anim: 'swordMove', category: 'heavy', damageType: 'slash', rangeX: 100, rangeY: 60, boxY: 4, hitstun: 30, knockbackX: 7, travel: { from: 4, to: 14, px: 6 } }),
    burrow: n(0, 1, 1, 1, { anim: 'crouch', category: 'special', isSpecial: true, noBody: true }),
    erupt: n(90, 3, 5, 18, { anim: 'risingKick', category: 'launcher', launcher: true, rangeX: 70, rangeY: 120, boxY: -40, launchVy: -21, selfVy: -10, hitstun: 34 }),
    beam: n(0, 10, 1, 16, { anim: 'throw', category: 'special', isSpecial: true, noBody: true, np: 15, shot: 'beam', groundOnly: true }),
    trap: n(0, 9, 1, 14, { anim: 'throwAir', category: 'special', isSpecial: true, noBody: true, np: 15, trap: true }),
    super: n(0, 2, 1, 2, { anim: 'land', category: 'ultimate', isUltimate: true, noBody: true, energy: 50, seq: 'earthquake' }),
    ult: n(0, 2, 1, 2, { anim: 'land', category: 'ultimate', isUltimate: true, noBody: true, energy: 100, seq: 'faultLine', mirrorOnly: true }),
  } })

// ── shots (projectiles through W.spawn; sheet art only) ──
export const SHOTS = {
  crescent: { dmg: 55, damageType: 'slash', speed: 14, rangePct: 0.35, img: './assets/incoming/msv1/sheets/fx_crescent.png', w: 21, h: 43, scale: 2.0, hitstun: 26, kbx: 6 },
  beam: { dmg: 50, damageType: 'projectile', speed: 18, rangePct: 1.0, img: './assets/incoming/msv1/sheets/red/beam.png', w: 47, h: 10, frames: 3, scale: 2.0, hitstun: 22, kbx: 4 },
  beamDiag: { dmg: 50, damageType: 'projectile', speed: 16, rangePct: 1.0, angle: 0.6, img: './assets/incoming/msv1/sheets/red/beamDiag.png', w: 64, h: 40, frames: 3, scale: 1.6, hitstun: 22, kbx: 4 },
  kunai: { dmg: 30, damageType: 'projectile', speed: 15, rangePct: 0.7, img: './assets/incoming/msv1/sheets/fx_kunai.png', w: 10, h: 8, scale: 2.4, hitstun: 16, kbx: 2 },
}

// ── sequences: frames from activation; `who`: real | clone0 | clone1 | illusion. Real hits use full damage; clone hits
// are already 60 % of the base (45 → 27, 70 → 42); illusion hits 50 %. Clone + illusion hits can never KO (floor 1). ──
export const SEQS = {
  // SUPER (1 bar) STORM ASCENSION: smoke pop → 2 clones → 6 streak hits from 6 directions → rising tornado. 310 raw.
  stormAscension: { energy: 50, opener: { at: 12, reach: 560, dmg: 0 }, frames: 96, clones: 2,
    hits: [{ at: 22, who: 'real', dmg: 45, ang: 180 }, { at: 30, who: 'clone0', dmg: 27, ang: 120 }, { at: 38, who: 'clone1', dmg: 27, ang: 60 },
      { at: 46, who: 'real', dmg: 45, ang: 0 }, { at: 54, who: 'clone0', dmg: 27, ang: 240 }, { at: 62, who: 'real', dmg: 45, ang: 300 },
      { at: 78, who: 'real', dmg: 94, launch: -19, finisher: 'tornado' }] },
  // SUPER (1 bar) EARTHQUAKE NINJA ART: stage shake → pop-up → Dustin + 2 clones erupt in sequence → sword finisher. 320 raw.
  earthquake: { energy: 50, opener: { at: 12, reach: 440, dmg: 50, grounded: true, shake: [6, 18] }, frames: 100, clones: 2,
    hits: [{ at: 32, who: 'real', dmg: 70, erupt: true }, { at: 46, who: 'clone0', dmg: 42, erupt: true }, { at: 60, who: 'clone1', dmg: 42, erupt: true },
      { at: 80, who: 'real', dmg: 116, launch: -16, finisher: 'swordRise' }] },
  // ULTIMATE (2 bars, ONLY in Ninja Mirror) HAWK MIRAGE: real, illusion and 2 clones dive from 4 angles at once. 380 raw.
  hawkMirage: { energy: 100, mirrorOnly: true, opener: { at: 14, reach: 760, dmg: 0 }, frames: 90, clones: 2,
    hits: [{ at: 34, who: 'real', dmg: 100, dive: -1 }, { at: 34, who: 'illusion', dmg: 60, dive: 1 }, { at: 34, who: 'clone0', dmg: 60, dive: -2 }, { at: 34, who: 'clone1', dmg: 60, dive: 2 },
      { at: 60, who: 'real', dmg: 100, launch: -18, finisher: 'diveKick' }] },
  // ULTIMATE (2 bars, ONLY in Ninja Mirror) FAULT LINE: real + illusion slam; the shockwave between them hits the gap; all 4 erupt. 390 raw.
  faultLine: { energy: 100, mirrorOnly: true, opener: { at: 16, gap: true, dmg: 90, shake: [7, 20] }, frames: 96, clones: 2,
    hits: [{ at: 44, who: 'real', dmg: 120, erupt: true }, { at: 44, who: 'illusion', dmg: 60, erupt: true }, { at: 50, who: 'clone0', dmg: 60, erupt: true },
      { at: 56, who: 'clone1', dmg: 60, erupt: true, launch: -18 }] },
}

// ═══ NINJA PROFILES (ninja.js) ═══════════════════════════════════════════════════════════════════════════════
export const SHANE_PROFILE = registerNinjaProfile('ns_red', {
  color: '#e8262c', smoke: '#d81e24', voice: 'high', airMul: 1.1,
  streak: { air: { ways: 8, perAirtime: 2 } },
  float: { frames: 72, fallCap: 1.6 },                       // WIND FLOAT: hold Jump, 1.2 s per airtime, never a climb
  barrier: { kind: 'reflect', reflectMul: 1.2 },             // WIND WARD
  mirror: { mode: 'echo', echoDelay: 8, moves: SHANE_MOVES,  // WIND MIRAGE: the illusion echoes 8 frames late
    counter: { kind: 'tornado', frames: 26, hits: [{ at: 4, dmg: 18, hitstun: 18, kby: -3 }, { at: 10, dmg: 18, hitstun: 18, kby: -3 }, { at: 16, dmg: 18, hitstun: 30, launch: -16 }] } },
})
export const DUSTIN_PROFILE = registerNinjaProfile('ns_yellow', {
  color: '#f2c81c', smoke: '#d8b01a', voice: 'low', airMul: 0.9,
  streak: { air: null, underground: true },
  barrier: { kind: 'armor', absorb: 2, armorFrames: 60, counter: { dmg: 70, reach: 200 } },   // ROCK HOLD
  burrow: { cost: 20, dig: 8, frames: 90, speed: 10.5 },     // EARTH BURROW: 1.5 s underground at run speed
  traps: { max: 2, frames: 360, arm: 20, radius: 34, dmg: 45 },   // EARTH KUNAI traps, 6 s
  rev: { every: 48, max: 3, perPip: 0.10 },                  // REV: 0.8 s of running per pip, +10% per pip
  mirror: { mode: 'decoy', moves: DUSTIN_MOVES,              // EARTH DOUBLE: a still guarding decoy
    counter: { kind: 'eruption', frames: 26, unblockable: false, hits: [{ at: 8, dmg: 80, hitstun: 34, launch: -12, kbx: 12, wallBounce: true, hitstop: 9 }] } },
})

// ── animationData: every strip + one entry per move key (its strip, spread over the move's frames) ──
function animData(ANIM, MOVES) {
  const out = { ...ANIM }
  for (const [k, md] of Object.entries(MOVES)) {
    const g = ANIM[md.anim]; if (!g) continue
    const total = md.startup + md.active + md.recovery
    out[k] = { ...g, loop: false, speed: Math.max(1, Math.round(total / Math.max(1, g.frames))) }
  }
  return out
}

const common = (o) => ({
  universe: 'power_rangers', series: 'Power Rangers Ninja Storm', subUniverse: 'Ninja Storm', era: 'Ninja Storm / "Power Rangers Super Legends" (DS) artwork',
  primary: 'rushdown', archetypes: ['rushdown', 'trickster'], difficulty: 5,
  traits: { hasEnergy: true, energyType: 'energy', energyName: 'Ninja Energy', mobility: 'high', scaling: 'combo', animeMovement: false },
  hasSprites: true, spriteScale: 2.38, movement: { crouchIdle: true }, fatalityVictimArt: false, introSequence: ['intro'],
  ...o,
})

export const ns_red = common({
  rosterKey: 'ns_red', name: 'Red Wind Ranger', civilianIdentity: 'Shane Clarke', tagline: 'Faster than the wind.', archetype: 'Air Ninja / Aerial Rushdown',
  bio: 'Shane Clarke, Red Wind Ranger and leader of the Wind Ninja Academy\'s Rangers. A skateboarder who trusts his instincts, he owns the air: a Ninja Streak that runs straight through you, eight-way air streaks, a Wind Float, and a Wind Mirage that echoes his every move.',
  energyConfig: { label: 'Ninja Energy', color: '#e8262c' },
  stats: { maxHealth: SPD_RED_HEALTH, maxEnergy: 100, attack: 84, defense: 72, speed: SPD_RED_SPEED, jumpPower: 31, maxJumps: 3, weight: 0.85, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  spriteSheet: SHANE_ANIM.idle.sheet, portrait: './assets/incoming/msv1/frames/red/portrait_large.png', hudIcon: './assets/incoming/msv1/frames/red/portrait_small.png',
  basic_attacks: { light: SHANE_MOVES.light, heavy: SHANE_MOVES.heavy, crouchLight: SHANE_MOVES.low, upAttack: SHANE_MOVES.up, airAttack: SHANE_MOVES.air, downAir: SHANE_MOVES.down_air,
    grab: { damage: 40, startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 6, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Air Ninja Tornado (↓↘→+Special)', cost: 0 }, forward: { name: 'Gale Crescent (→+Heavy)', cost: 0 }, down: { name: 'Ninja Mirror (↓↓+Charge)', cost: 0 },
    back: { name: 'Kunai (↓↙←+Light)', cost: 0 }, up: { name: 'Ninja Beam (↓↘→+Light)', cost: 0 } },
  ultimate: { name: 'Storm Ascension / Hawk Mirage', cost: 50, description: 'Super (1 bar): smoke pop, 2 clones, 6 streak hits, rising tornado (310 raw). In Ninja Mirror the Ultimate (2 bars) is Hawk Mirage: real, illusion and 2 clones dive at once (380 raw).' },
  animationData: animData(SHANE_ANIM, SHANE_MOVES),
})
export const ns_yellow = common({
  rosterKey: 'ns_yellow', name: 'Yellow Wind Ranger', civilianIdentity: 'Dustin Brooks', tagline: 'Rock solid.', archetype: 'Earth Ninja / Trap & Burrow',
  primary: 'trapper', archetypes: ['trapper', 'rushdown'],
  bio: 'Dustin Brooks, Yellow Wind Ranger: Earth ninja, motocross rider and the kindest (and most easily fooled) student at the Wind Ninja Academy. He owns the ground: he revs up on the run, burrows under you, plants kunai traps, and leaves a guarding Earth Double for you to hit.',
  energyConfig: { label: 'Ninja Energy', color: '#f2c81c' },
  stats: { maxHealth: Math.round(SPD_RED_HEALTH * 1.08), maxEnergy: 100, attack: 84, defense: 80, speed: SPD_RED_SPEED, jumpPower: 31, maxJumps: 2, weight: 1.0, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  spriteSheet: DUSTIN_ANIM.idle.sheet, portrait: './assets/incoming/msv1/frames/yellow/portrait_large.png', hudIcon: './assets/incoming/msv1/frames/yellow/portrait_small.png',
  basic_attacks: { light: DUSTIN_MOVES.light, heavy: DUSTIN_MOVES.heavy, crouchLight: DUSTIN_MOVES.low, upAttack: DUSTIN_MOVES.up, airAttack: DUSTIN_MOVES.air, downAir: DUSTIN_MOVES.down_air,
    grab: { damage: 44, startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 6, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Earth Burrow (↓↓+Special)', cost: 0 }, forward: { name: 'Sword Lunge (→+Heavy)', cost: 0 }, down: { name: 'Ninja Mirror (↓↓+Charge)', cost: 0 },
    back: { name: 'Earth Kunai trap (↓↙←+Light)', cost: 0 }, up: { name: 'Ninja Beam (↓↘→+Light)', cost: 0 } },
  ultimate: { name: 'Earthquake Ninja Art / Fault Line', cost: 50, description: 'Super (1 bar): stage shake, pop-up, Dustin + 2 clones erupt, sword finisher (320 raw). In Ninja Mirror the Ultimate (2 bars) is Fault Line: real + illusion slam, the gap shockwave, all 4 erupt (390 raw).' },
  animationData: animData(DUSTIN_ANIM, DUSTIN_MOVES),
})
export const NS_MOVES = { ns_red: SHANE_MOVES, ns_yellow: DUSTIN_MOVES }
export const NS_GEO = NINJA_STORM_GEO
