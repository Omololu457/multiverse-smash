// Ryomen Sukuna — Shinjuku Arc (sukuna_shinjuku) — DATA ONLY: frame data, costs, technique profiles, quotes, the roster
// entry. Logic: sukunaShinjukuState.js (sim + combat hooks), sukunaShinjuku.js (command layer), sukunaShinjukuFx.js
// (render / HUD / sound cues). Art: the Sukuna Shinjuku JUS-style sheet (Mrfresh, Zeltas Black, Mps, Kenny, Dark night,
// Dr animation), sliced by tools/sukunashinjuku/slice.py. Docs: docs/msv1/sukuna/ (REUSE, LEDGER, COMBOS, BALANCE_NOTES).
// The OLD Sukuna (`sukuna`) is a different character and is not touched by any of this: his Malevolent Shrine is
// SHARED through activateDomain's domainKey option ('sukuna'), never edited.
import { SUKUNA_SHINJUKU_ANIM } from './sukunaShinjukuSprites.js'

export const SKS_KEY = 'sukuna_shinjuku'
// stored damage = round(raw / 0.6): the engine's global ×0.6 write scale lands the brief's number (Gojo Shinjuku's lever)
// POWER: one damage factor on every Sukuna (Shinjuku) hit — tuned so his damage output head-to-head matches Satoru Gojo
// (Shinjuku)'s (user: "make him do as much damage as Gojo"). CPU-vs-CPU duels vs Gojo, both sides, 16 seeds, with his
// Gojo-speed mobility: ×1.15 → his output 0.93 of Gojo's, ×1.3 → 1.13, so ×1.2 ≈ even (docs/msv1/sukuna/BALANCE_NOTES.md).
export const POWER = 1.2
export const dmg = raw => Math.round(raw * POWER / 0.6)
// MOBILITY — as fast as Satoru Gojo (Shinjuku) (user: "make him just as fast as … the new Gojo"): same double-tap window, the
// same reach and the same cooldowns as Gojo's teleport (toward) and long blink (away), done Sukuna's way — a blur dash.
//   toward the foe: arrives beside them (Gojo's tpGap) over `rush.travel` frames, cooldown = Gojo's tpCooldown, lock = tpLock
//   away: Gojo's blink — 0.40 screen, startup 2, travel 5 (invulnerable), recovery 8, cooldown 30
// SPEED (user, after the parity pass: "a lot faster, like 1.5 times faster than he is now"): ×1.5 on walk / run / air drift /
// the engine dash (physics.js reads f._sksSpeed), and his blur dash + back-step run their wind-up / travel / recovery 1.5×
// faster (2/5/2 → 1/3/1 and 2/5/8 → 1/3/5 frames). Reach and cooldowns stay Gojo's.
export const SPEED = 1.5
export const MOBILITY = { window: 12, gap: 8, rush: { startup: 1, travel: 3, recovery: 1, cooldown: 48, lock: 10 },
  step: { dist: 0.40, startup: 1, travel: 3, recovery: 5, cooldown: 30 } }
export const SKS_SCALE = 2          // integer nearest-neighbour presentation scale (≈61 px sheet body → ≈122 px)
export const SCREEN = 1280          // reference screen width for "% of screen" distances
export const BAR = 100              // one super bar = 100 energy (the engine meter; maxEnergy 210 = the old Sukuna's)

// ── TECHNIQUES (energy = the old Sukuna's cursed-energy meter) ──
export const COST = { dismantle: 12, fan: 12, cleave: 15, web: 18, fuga: 35, amp: 20, world: 2 * BAR }
// DISMANTLE: a fast thin travelling cut. 65 % of the screen, cuts non-super projectiles it meets.
export const DISMANTLE = { startup: 11, speed: 22, range: 0.65, w: 30, h: 26, raw: 55, hitstun: 20, kbx: 6, kby: -2, chip: 0.12,
  fanRaw: 30, fanAngles: [-0.26, 0, 0.26], fanAt: [0, 5, 10], airAngle: 0.61, upAngle: -0.79 }
// CLEAVE: one cut that adjusts to the target: 60 + 6 % of the target's MAX health; ignores armor / super armor
export const CLEAVE = { startup: 9, active: 3, reach: 40, h: 70, base: 60, pctMax: 0.06, hitstun: 24, kbx: 8, kby: -3, whiff: 10, chip: 0.15 }
// SPIDERWEB: Cleave driven into the ground — a web crack in front of him: low, OTG, clears traps / discs / patches
export const WEB = { startup: 14, active: 3, from: 10, len: 190, raw: 70, hitstun: 26, kbx: 3, kby: -7, chip: 0.15 }
// FUGA (Divine Flame: Open): hold Special to gather (3 levels at 0.5 / 1.0 / 1.5 s), release fires the flame arrow.
export const FUGA = { levelAt: [30, 60, 90], holdMax: 120, raw: [90, 140, 200], speed: 13, life: 120, r: [44, 54, 66], rEmp: 100,
  hitstun: 34, kbx: 12, kby: -8, chip: 0.2, fireStartup: 4, empStartup: 10, empWindow: 180, empMult: 1.5,
  burn: { frames: 120, every: 20, dmg: 3 },            // = Sanji's burn rule (sanjiState.js DIABLE.burn: 3 dmg / 20 f / 2 s, refreshes)
  patchW: 180, patchLife: 300 }                        // a FIRE patch (elements.js 'fire' profile) where it explodes on the floor
// DOMAIN AMPLIFICATION: 3 s, 10 s cooldown (from the end), his hits ignore technique-based nullifying defences; locks
// Cleave / Dismantle / Spiderweb / Fuga / World Slash while active
export const AMP = { frames: 180, cooldown: 600 }
// WORLD-CUTTING SLASH: 2 bars, 3 chant captions × 25 f, the hand sign, one screen-height cut at the foe
export const WORLD = { chant: ['Dragon Scale.', 'Recoil.', 'Twin Meteors.'], line: 25, signAt: 75, cutAt: 88, resolve: 6, raw: 380, hitstun: 50, kby: -10, kbx: 4 }
// MALEVOLENT SHRINE: the old Sukuna's ultimate COPIED — Ultimate button, a FULL meter (drained to 0), activateDomain
// { cost 0, duration 15 s, range 1e5 } with domainKey 'sukuna' (the old shrine background, theme, sure-hit slashes,
// untouchable foe), cast pose 40 f, attackCooldown 44 f, the universal 20 s ultimate cooldown.
export const SHRINE = { duration: 15, range: 1e5, cast: 40, lock: 44, ultCooldown: 1200 }
// technique burnout after losing a domain clash to Satoru Gojo (gojoShinjukuState sets _gsTechBurnout = 5 s)
export const TECHNIQUES = new Set(['kDismantle', 'kDisUp', 'kDisAir', 'kFan', 'kCleave', 'kWeb', 'kFugaG', 'kFugaF', 'kFugaE', 'kWorld',
  'kGama', 'kGamaAir', 'kNue', 'kNueAir', 'kDogs', 'kOrochi', 'kDatto', 'kTotality', 'kElephant', 'kMahoraga', 'kChimera'])

// ── TEN SHADOWS (add-on: Sukuna uses the technique of the body he wears). Every shikigami is a SEPARATE helper object
// drawn from Megumi's existing shikigami strips (megumiSprites.js MEGUMI_SUMMON_ANIM) — never Megumi's body; Sukuna
// keeps his own body (hand sign / air / chant / domain-cast frames). docs/msv1/sukuna/TEN_SHADOWS.md has the map.
// Rules: a shikigami appears from (and sinks back into) a shadow pool; any hit breaks it (Mahoraga takes 4 and ADAPTS:
// a move that already hit him does nothing the second time); a hit during Sukuna's hand-sign startup cancels the summon
// (it only appears on the release frame); one of each kind out at a time; short cooldowns that start when it's gone.
// Timings follow the sheet order (and Megumi's tuned frame data, megumiData.js) — cell → frame maps: sukunaShinjukuShadowsFx.js.
export const SHADOW_KEYS = new Set(['kGama', 'kGamaAir', 'kNue', 'kNueAir', 'kDogs', 'kOrochi', 'kDatto', 'kTotality', 'kElephant', 'kMahoraga', 'kChimera'])
export const TS = {
  cd: { gama: 40, gamaAir: 40, nue: 60, nueAir: 50, dogs: 54, orochi: 70, datto: 150, kon: 180, ele: 200, maho: 0 },   // frames, from when it's gone
  gama: { ahead: 56, lashAt: 12, lashEnd: 20, life: 40, lane: [10, 170], laneY: 34, laneH: 40, raw: 30, hitstun: 36, pull: 12, w: 50, h: 66 },
  gamaAir: { ahead: 30, lashAt: 10, lashEnd: 18, life: 36, lane: [0, 160], laneY: 10, laneH: 60, raw: 26, hitstun: 30, pull: 10, w: 50, h: 60 },
  nue: { ax: 110, ay: -80, burstAt: 20, active: 4, life: 44, r: 52, raw: 36, stun: 48, kbx: 2, kby: -4, w: 80, h: 70 },   // STUN: long hitstun
  nueAir: { ax: 96, ay: 10, burstAt: 16, active: 5, life: 46, r: 46, raw: 32, hitstun: 26, kbx: 6, kby: -6, w: 90, h: 70 },
  dogs: { vx: 11, gap: 10, life: 44, w: 96, h: 50, raw: 30, hitstun: 22, kbx: 7, kby: -3 },            // white, then black 10 f later
  orochi: { range: 300, minAhead: 40, warn: 20, rise: 6, active: 6, life: 52, w: 54, h: 170, raw: 42, hitstun: 34, kby: -19 },
  datto: { count: 6, life: 120, spread: [-64, -36, -12, 14, 40, 66], w: 26, h: 22, reach: 40, raw: 6, hitstun: 10, alpha: 0.5 },
  kon: { vx: 12, run: 22, active: [4, 18], w: 140, h: 80, missLife: 46, hitLife: 52, claws: [12, 22, 32], raw: [24, 24, 40], hitstun: 40, kbx: 10, kby: -9, hold: 30 },
  ele: { behind: 24, release: 26, beam: [36, 76], every: 6, lane: [120, 450], laneY: 40, laneH: 44, raw: 14, hitstun: 16, kbx: 3, life: 120, w: 160, h: 90 },
  maho: { ahead: 40, leapAt: 24, landAt: 52, slashAt: [70, 80, 90], backAt: 100, sinkAt: 112, end: 136, gap: 80, landR: 90, landRaw: 50,
    wave: { vx: 15, life: 40, w: 60, h: 130, raw: 60, hitstun: 30, kbx: 9, kby: -7 }, hp: 4, w: 100, h: 200, back: 30 },
  dom: { frames: 540, cdRate: 2, speed: 1.25, slow: 0.6 },                                            // Chimera Shadow Garden: 9 s
}

export const QUOTES = {
  intro: 'Know your place.',
  win: 'Know your place, fool.',
  vsGojo: 'Stand proud. You were strong.',
  gojoKeys: ['gojo', 'gojo_shinjuku'],
}

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 48, rangeY: 40, boxY: 18, knockbackX: 3, knockbackY: -2, damageType: 'blunt', ...extra })
const tech = (startup, recovery, extra = {}) => n(0, startup, 1, recovery, { category: 'special', isSpecial: true, noBody: true, damageType: 'slash', ...extra })

// ── MOVES (startup = frames before the first active frame, 60 sim ticks / s) — docs/msv1/sukuna/COMBOS.md ──
export const SKS_MOVES = {
  kA1: n(32, 5, 2, 9, { anim: 'aStr', rangeX: 44 }),
  kA2: n(32, 5, 2, 10, { anim: 'aStr', rangeX: 50 }),
  kA3: n(48, 5, 3, 14, { anim: 'aStr', hitstun: 20, blockstun: 11, rangeX: 54, knockbackX: 6 }),
  kB: n(74, 10, 3, 17, { anim: 'heavy', category: 'heavy', hitstun: 22, blockstun: 12, rangeX: 62, knockbackX: 6 }),
  kC: n(82, 12, 4, 18, { anim: 'kick', category: 'launcher', launcher: true, hitstun: 26, blockstun: 12, rangeX: 66, rangeY: 80, boxY: -14, launchVy: -30 }),
  kKnee: n(76, 7, 4, 16, { anim: 'knee', category: 'heavy', antiAir: true, hitstun: 24, blockstun: 12, rangeX: 44, rangeY: 86, boxY: -36, knockbackX: 3, knockbackY: -10 }),
  kAir: n(62, 6, 5, 10, { anim: 'airAtk', air: true, hitLevel: 'overhead', hitstun: 18, rangeX: 48, rangeY: 52, boxY: 28, knockbackX: 3, knockbackY: 4 }),
  kDashAtk: n(58, 8, 4, 16, { anim: 'dashAtk', hitLevel: 'low', hitstun: 22, blockstun: 10, rangeX: 58, rangeY: 30, boxY: 62, knockbackX: 5, knockbackY: -5, travel: [0, 12, 7] }),
  kDismantle: tech(DISMANTLE.startup, 14, { anim: 'dismantle', cost: COST.dismantle }),
  kDisUp: tech(DISMANTLE.startup, 16, { anim: 'worldSlash', cost: COST.dismantle }),
  kDisAir: tech(DISMANTLE.startup, 12, { anim: 'worldSlash', cost: COST.dismantle, airOk: true, airOnly: true }),
  kFan: tech(1, 24, { anim: 'fan', cost: COST.fan }),
  kCleave: tech(CLEAVE.startup, 16, { anim: 'cleave', cost: COST.cleave }),
  kWeb: tech(WEB.startup, 20, { anim: 'spiderweb', cost: COST.web }),
  kFugaG: tech(FUGA.holdMax, 1, { anim: 'fuga', cost: COST.fuga, damageType: 'energy' }),
  kFugaF: tech(FUGA.fireStartup, 22, { anim: 'fugaFire', damageType: 'energy' }),
  kFugaE: tech(FUGA.empStartup, 22, { anim: 'fuga', cost: COST.fuga, damageType: 'energy' }),
  kAmp: tech(6, 10, { anim: 'amp', category: 'buff', cost: COST.amp }),
  kWorld: tech(WORLD.cutAt, 30, { anim: 'worldFull', category: 'ultimate', super: true, bars: 2 }),
  kShrine: tech(1, SHRINE.lock - 2, { anim: 'domainCast', category: 'ultimate', isUltimate: true, airOk: true }),   // the old Shrine casts in the air too
  // TEN SHADOWS — his own body: the hand sign on the ground, his air pose in the air, the chant for Mahoraga, the domain cast
  kGama: tech(10, 14, { anim: 'handSign' }),
  kGamaAir: tech(8, 10, { anim: 'airAtk', airOk: true, airOnly: true }),
  kNue: tech(10, 14, { anim: 'handSign' }),
  kNueAir: tech(8, 10, { anim: 'airAtk', airOk: true, airOnly: true }),
  kDogs: tech(9, 14, { anim: 'handSign' }),
  kOrochi: tech(10, 16, { anim: 'handSign' }),
  kDatto: tech(8, 12, { anim: 'handSign' }),
  kTotality: tech(12, 16, { anim: 'handSign', bars: 1 }),
  kElephant: tech(14, 18, { anim: 'handSign', bars: 1 }),
  kMahoraga: tech(20, 22, { anim: 'chant', category: 'ultimate', super: true }),      // full meter (his meter holds 2.1 bars)
  kChimera: tech(30, 20, { anim: 'domainCast', category: 'ultimate', super: true }),  // full meter, once per round
}
export const NORMALS = ['kA1', 'kA2', 'kA3', 'kB', 'kC', 'kKnee', 'kAir', 'kDashAtk']
export const A_CHAIN = { kA1: 'kA2', kA2: 'kA3' }

const even = (frames, from, to) => frames.map((f, i) => [Math.round(from + i * (to - from) / frames.length), f])
export const TIMELINE = {
  kA1: [[0, 0], [3, 1]], kA2: [[0, 2], [3, 3]], kA3: [[0, 3], [3, 4]],
  kB: [[0, 0], [3, 1], [7, 2], [10, 3], [17, 4]],
  kC: [[0, 0], [5, 1], [12, 2], [16, 3], [26, 4]],
  kKnee: [[0, 0], [4, 1], [7, 2], [16, 3]],
  kAir: [[0, 0], [11, 1]],
  kDashAtk: [[0, 0], [3, 1], [8, 2], [12, 3]],
  kDismantle: [[0, 0], [4, 1], [9, 2], [11, 3]],
  kDisUp: [[0, 0], [4, 1], [9, 2], [11, 3], [16, 4], [20, 5]],
  kDisAir: [[0, 0], [4, 1], [9, 2], [11, 3], [16, 4]],
  kFan: [[0, 0], [3, 1], [5, 2], [8, 3], [10, 4], [13, 5]],
  kCleave: [[0, 0], [4, 1], [9, 2], [12, 3], [16, 4], [22, 5]],
  kWeb: [[0, 0], [6, 1], [14, 2], [18, 3], [26, 4]],
  kFugaG: [[0, 0], [8, 1], [16, 2], [30, 3], [45, 4], [60, 5], [70, 6], [80, 7], [90, 8]],
  kFugaF: [[0, 0], [16, 1]],
  kFugaE: [[0, 5], [4, 7], [7, 8], [10, 9], [26, 0]],
  kAmp: [[0, 0], [6, 1]],
  kWorld: [[0, 0], [WORLD.line, 1], [2 * WORLD.line, 2], [75, 3], [80, 4], [85, 5], [WORLD.cutAt, 6], [100, 7], [108, 8]],
  kShrine: even([0, 1, 2, 3, 4, 5], 0, 36),
  ...Object.fromEntries(['kGama', 'kNue', 'kDogs', 'kOrochi', 'kDatto', 'kTotality', 'kElephant'].map(k => [k, [[0, 0], [3, 1], [6, 2], [8, 3], [11, 4], [16, 5]]])),
  kGamaAir: [[0, 0], [6, 1]], kNueAir: [[0, 0], [6, 1]],
  kMahoraga: [[0, 0], [7, 1], [14, 2]],
  kChimera: even([0, 1, 2, 3, 4, 5], 0, 36),
}

const A = SUKUNA_SHINJUKU_ANIM
const lock = a => ({ ...a, loop: false, lockLastFrame: true })
export const SKS_ANIMATION = {
  idle: A.idle, walk: A.walk, walk_back: A.walk, run: { ...A.run, loop: true }, dash: lock(A.dash),
  jump: lock(A.jumpRise), doubleJump: lock(A.jumpRise), fall: lock(A.fall), land: lock(A.crouch),
  crouch: lock(A.crouch), guard: lock(A.guard), hurt: lock(A.hurt), hurt_air: lock(A.hurt),
  knockdown: lock(A.knockdown), getup: lock(A.getup), intro: lock(A.intro), win: lock(A.win), lose: lock(A.lose),
  charge: { ...A.amp, loop: true }, taunt: lock(A.win), transform: lock(A.handSign), ultimate: lock(A.domainCast), domain: lock(A.domainCast),
  light: A.aStr, heavy: A.heavy, up: A.kick, air: A.airAtk, down_air: A.airAtk, grab: A.heavy,
  ...Object.fromEntries(Object.entries(SKS_MOVES).map(([k, m]) => [k, { ...lock(A[m.anim]), frameTimeline: TIMELINE[k] }])),
}

export const sukuna_shinjuku = {
  rosterKey: SKS_KEY, name: 'Ryomen Sukuna', displayName: 'Ryomen Sukuna', selectTag: 'Shinjuku Arc', universe: 'jujutsu_kaisen',
  color: '#d8d8d8', series: 'Jujutsu Kaisen', era: 'Shinjuku Showdown — in Megumi\'s body (sheet: Mrfresh, Zeltas Black, Mps, Kenny, Dark night, Dr animation)',
  tagline: 'Know your place.', introTitle: 'RYOMEN SUKUNA — SHINJUKU ARC', archetype: 'King of Curses / Slasher', difficulty: 5,
  homeStage: 'Shibuya Incident',
  bio: 'The King of Curses at the Shinjuku Showdown, wearing Megumi Fushiguro\'s body. Dismantle cuts at range, Cleave adjusts to whatever it touches, Spiderweb shatters the ground, and Fuga opens a divine flame. Domain Amplification lets his hands reach through any technique that nullifies them.',
  primary: 'rushdown', secondary: ['zoner'], archetypes: ['melee', 'curse'],
  traits: { hasEnergy: true, energyType: 'cursed_energy', mobility: 'high', scaling: 'damage', animeMovement: true },
  // Health / meter / body stats = the old Sukuna's (characters.js `sukuna`): HP 1240, 210 cursed energy
  stats: { maxHealth: 1240, maxEnergy: 210, attack: 95, defense: 87, speed: 94, maxJumps: 2, jumpPower: 32, dashSpeed: 22, dashDuration: 9, dashCooldownMax: 24 },   // speed + dash = gojo_shinjuku (user: "make him just as fast as Gojo"),
  hasSprites: true, spriteScale: SKS_SCALE, spriteSheet: A.idle.sheet, portrait: './assets/sukuna_shinjuku/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: {
    light: SKS_MOVES.kA1, heavy: SKS_MOVES.kB, crouchLight: SKS_MOVES.kDashAtk, upAttack: SKS_MOVES.kC,
    airAttack: SKS_MOVES.kAir, downAir: SKS_MOVES.kAir,
    grab: { damage: dmg(40), startup: 5, active: 3, recovery: 13, hitstun: 22, throwForceX: 6, throwForceY: -4, damageType: 'blunt' },   // = the old Sukuna's grab
  },
  specials: {
    neutral: { name: 'Cleave', cost: COST.cleave }, back: { name: 'Dismantle', cost: COST.dismantle },
    forward: { name: 'Fuga', cost: COST.fuga }, down: { name: 'Spiderweb', cost: COST.web },
  },
  ultimate: { name: 'Malevolent Shrine', cost: 100, duration: 15, effect: 'Domain expansion',
    description: 'Ultimate (full meter): the old Sukuna\'s Malevolent Shrine, copied — the shrine background, the sure-hit auto-slashes, the untouchable foe, 15 s.' },
  domain: { name: 'Malevolent Shrine', priority: 4, background: 'shrine', domainKey: 'sukuna' },
  transformationOrder: ['base'], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: SKS_ANIMATION,
}
