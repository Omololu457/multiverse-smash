// Pink Ranger (Kimberly Hart, Mighty Morphin / 1995 movie Genesis art). DATA ONLY: frame data, the Power Bow numbers,
// the rangers.js profile, the Thunder Megazord assist profiles (shared falconzord.js scheduler) and the roster entry.
// Logic: mmprPinkState.js (sim), mmprPink.js (command layer), mmprPinkFx.js (render-only).
// Frame-by-frame rationale: docs/mmpr_pink/MOVE_FRAME_MAP.md.
import { MMPR_PINK_ANIM } from './mmprPinkSprites.js'
import { registerRangerProfile } from './rangers.js'
import { registerFalconSortie } from './falconzord.js'

// ── DOUBLE-TAP BLINK: the ACTUAL current shared rangers.js contract, BLINK_DEFAULTS, with NO tuning overrides ──
// (22% of the 1280 px reference screen = 282 px, 3 f wind-up / 5 f invulnerable travel / 3 f recovery, 2 charges each
// refilling on its own 90 f timer, no crossup (stops 6 px in front), air blink allowed, no run / dodge reward, no Energy.)
// The older groundTeleport.js defaults (S.P.D. Blue's phase step) are NOT used.
export const MMPR_PINK_PROFILE = registerRangerProfile('mmpr_pink', {
  ownTick: true,                       // mmprPinkState.tickMmprPink calls tickRanger itself
  team: 'Mighty Morphin',
  badge: { color: '#e040a0', accent: '#ffe0f0', emblem: 'pterodactyl' },
  morph: { alwaysMorphed: true },      // the supplied sheet has no unmorphed Kimberly
  sprites: { streak: 'blink', vanish: 'blink', emblem: null },
})

// ROSTER-PARITY lever, the same convention as Black / S.P.D. Pink / Green / Blue: every number below is the brief's
// RAW value; this one constant converts it. (rosterParity.js's extra x1.3 list is a foreign file and is NOT edited.)
export const MMPR_PINK_DAMAGE_SCALE = 1.7
export const dmg = raw => Math.round(raw * MMPR_PINK_DAMAGE_SCALE)

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  damageType: 'blunt', category: 'light', hitstun: 18, blockstun: 11, rangeX: 60, rangeY: 46, boxY: 14, knockbackX: 2, knockbackY: 0, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
export const MMPR_PINK_MOVES = {
  // J1 / J2 / J3 — fresh Light retaps on a clean hit, three stages maximum.
  light: n(17, 5, 2, 10, { hitstun: 20, blockstun: 11, rangeX: 58 }),                                  // Palm Snap
  pJ2: n(21, 6, 2, 12, { hitstun: 20, blockstun: 12, rangeX: 72 }),                                    // Turning Check
  pJ3: n(29, 10, 3, 18, { hitstun: 26, blockstun: 13, rangeX: 78, boxY: 8, knockbackX: 5 }),          // Crescent Finish
  heavy: n(54, 14, 3, 26, { category: 'heavy', hitstun: 34, blockstun: 14, rangeX: 84, rangeY: 56, boxY: 0, knockbackX: 4 }),   // High Crescent
  pLow: n(25, 8, 2, 16, { hitLevel: 'low', hitstun: 22, blockstun: 12, rangeX: 80, rangeY: 30, boxY: 66, travel: [2, 9, 3] }),  // Sliding Sweep
  up: n(42, 12, 3, 22, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 56, rangeY: 104, boxY: -38, launchVy: -21, selfVy: 0 }),   // Rising Heel
  air: n(30, 8, 3, 17, { hitstun: 28, rangeX: 76, rangeY: 58, boxY: 22, knockbackY: -3 }),            // Flying Heel
  down_air: n(30, 8, 3, 17, { hitstun: 28, rangeX: 76, rangeY: 58, boxY: 22, knockbackY: -3 }),
  // Forward+Heavy command chain: advancing palm → fresh Heavy kick → fresh Heavy knock-away.
  pPalm: n(24, 10, 3, 19, { category: 'heavy', hitstun: 30, blockstun: 12, rangeX: 70, boxY: 14, travel: [2, 10, 4] }),
  pKick: n(32, 12, 3, 21, { category: 'heavy', hitstun: 32, blockstun: 13, rangeX: 80 }),
  pAway: n(44, 14, 3, 26, { category: 'heavy', hitstun: 30, blockstun: 14, rangeX: 80, rangeY: 52, boxY: 16, knockbackX: 8 }),
  // NEUTRAL SPECIAL — POWER BOW. A body-less move whose timer the sim holds while the draw continues (see BOW).
  // startup 12 = the quick-shot release frame; recovery is set per shot (quick 16 / drawn 18) when the arrow leaves.
  pBow: n(0, 12, 1, 16, { category: 'special', isSpecial: true, noBody: true, cost: 10, bow: true }),
  // ASSIST CALL — the visible radio-signal pose shared by Forward / Up / Back Special. Startup 14 = the commit boundary.
  pCall: n(0, 14, 1, 12, { category: 'special', isSpecial: true, noBody: true, call: true }),
  // DOWN SPECIAL — CRANE ESCAPE: backward cartwheel, 90 px over 14 f, then an explicit 18 f recovery. No hitbox, no
  // invulnerability, no reflection, no teleport. 12 Energy; never touches pips or the Spotter Link.
  pCrane: n(0, 14, 1, 17, { category: 'special', isSpecial: true, noBody: true, cost: 12, crane: true }),
  // ULTIMATE OPENER — braced special arrow released on frame 30 (raw 30). Clean hit → the sequence; miss/block → the
  // arrow is spent and the authored 60 f recovery plays out.
  pUltOpen: n(0, 30, 1, 60, { category: 'ultimate', isUltimate: true, noBody: true, cost: 100 }),
}
export const CRANE = { dist: 90, frames: 14, recovery: 18 }

// POWER BOW — all counts are SIMULATION frames from accepted initiation (the Special press edge).
export const BOW = {
  cost: 10, release: 12,                 // quick shot leaves on frame 12 (tap or any release before it)
  armAt: 24, armCost: 8,                 // held 24 f → spend +8 (if available) and arm the Drawn Shot
  cap: 45,                               // held to 45 f → it releases on its own (no loop: a new press is needed)
  quick: { raw: 30, speed: 13, lifetime: 36, hitstun: 20, blockstun: 12, knockbackX: 4, knockbackY: -1, recovery: 16 },
  drawn: { raw: 46, speed: 15, lifetime: 34, hitstun: 24, blockstun: 14, knockbackX: 9, knockbackY: -2, recovery: 18 },
  // Collision: a 20 px square centred at 83 % of the standing hurtbox height (the drawn hand is at 83 % of the sprite
  // body height in bow2/bow3). The art is drawn at the real hand height through the engine's spriteBottomY.
  radius: 10, heightFrac: 0.83, ahead: 34,
  art: { w: 45, h: 15, scale: 1.85, handDy: 113, lineRow: 7.5 },
}
export const SPOTTER = { life: 90, maxDist: 400, defaultAhead: 160, edge: 40 }
export const THREAD = { window: 10, cancelLast: 6 }

// ── THUNDER MEGAZORD ASSISTS (shared falconzord.js scheduler; data profiles only) ──
// origin 'target' with the location captured at the CALL (Spotter Link or the default point) and the floor height:
// the Megazord stands BEHIND the captured point (dx negative) and its sword box sits ON it (box.dx). Keys
// [age, dx, dy, pose]: dx multiplied by the direction captured at commit. Nothing is re-read after commit.
// Multi-contact spacing: the second Sky Splitter contact starts 14 f after the first (> its 10 f blockstun), because
// this engine drops isBlocking during blockstun — a gapless pair would turn a blocked first hit into a free hit.
export const THUNDER_RESOURCE = { pips: 2, recharge: 210, lockout: 75, callStartup: 14, postUltLock: 120 }
export const THUNDER_KINDS = { fwd: 'thunderLine', up: 'skySplitter', back: 'returningEdge' }
registerFalconSortie('thunderLine', {
  name: 'Thunder Line', move: 'thunder_line', cost: 15, origin: 'target', warn: 20, life: 46,
  keys: [[0, -215, 0, 'step'], [12, -150, 0, 'hwind'], [20, -150, 0, 'hslash'], [32, -150, 0, 'hslash'], [46, -200, 0, 'exit']],
  contacts: [{ from: 20, to: 24, raw: 48, hitstun: 24, blockstun: 14, knockbackX: 7, knockbackY: 0, box: { w: 150, h: 64, dx: 150, dy: -45 } }],
})
registerFalconSortie('skySplitter', {
  name: 'Sky Splitter', move: 'sky_splitter', cost: 18, origin: 'target', warn: 16, life: 48,
  keys: [[0, -165, 0, 'uwind'], [16, -120, 0, 'uslash'], [36, -120, 0, 'uslash'], [48, -170, 0, 'exit']],
  contacts: [{ from: 16, to: 19, raw: 18, hitstun: 26, blockstun: 10, knockbackX: 1, knockbackY: 0, box: { w: 110, h: 70, dx: 120, dy: -40 } },
    { from: 30, to: 33, raw: 30, hitstun: 30, blockstun: 12, knockbackX: 2, knockbackY: -4, launchVy: -22, launch: true, box: { w: 110, h: 130, dx: 118, dy: -70 } }],
})
registerFalconSortie('returningEdge', {
  name: 'Returning Edge', move: 'returning_edge', cost: 15, origin: 'target', warn: 28, life: 56,
  keys: [[0, -150, 0, 'dwind'], [20, -112, 0, 'dtop'], [28, -112, 0, 'dslash'], [42, -112, 0, 'dslash'], [56, -160, 0, 'exit']],
  contacts: [{ from: 28, to: 32, raw: 50, hitstun: 26, blockstun: 16, knockbackX: 5, knockbackY: 0, box: { w: 120, h: 90, dx: 112, dy: -46 } }],
})

// Frame timelines (which strip frame shows at which elapsed tick).
const timeline = {
  light: [[0, 0], [4, 1]], pJ2: [[0, 0], [5, 1]], pJ3: [[0, 0], [9, 1], [16, 2]], heavy: [[0, 0], [13, 1], [20, 2]],
  pLow: [[0, 0], [7, 1]], up: [[0, 0], [11, 1], [16, 2]], air: [[0, 0], [7, 1]],
  pPalm: [[0, 0], [9, 1]], pKick: [[0, 0], [11, 1]], pAway: [[0, 0], [13, 1]],
  bow: [[0, 0], [5, 1], [10, 2], [13, 3]], pCall: [[0, 0], [5, 1], [15, 2]], pCrane: [[0, 0], [7, 1], [14, 2]],
  pUltOpen: [[0, 0], [10, 1], [20, 2], [31, 3]], ultKick: [[0, 0], [8, 1], [16, 2]], ultLand: [[0, 0], [8, 1]],
}

export const mmpr_pink = {
  rosterKey: 'mmpr_pink', name: 'Pink Ranger', civilianIdentity: 'Kimberly Hart', universe: 'power_rangers',
  series: 'Mighty Morphin Power Rangers', era: 'Mighty Morphin / supplied movie-game artwork (Genesis, MMPR: The Movie)',
  tagline: 'Pick the opening. Make it count.', archetype: 'Acrobatic Archer / Precision Assist',
  bio: 'Kimberly Hart: the original Pink Ranger, a gymnast whose Power Bow puts precise arrows exactly where she wants them. Her shots mark a spot for the team\'s Thunder Megazord to strike. The Spotter Link, the assist orders and the Thunderstring finisher are game adaptations: the Thunder Megazord is the whole team\'s Megazord, not Kimberly\'s private Zord.',
  primary: 'zoner', secondary: ['summoner'], archetypes: ['zoner', 'summoner'],
  traits: { hasEnergy: true, energyType: 'energy', energyName: 'Morph Energy', mobility: 'normal', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Morph Energy', color: '#ff9bd2' },
  stats: { maxHealth: 950, maxEnergy: 100, attack: 76, defense: 74, speed: 100, jumpPower: 26, maxJumps: 1, weight: 1, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 34 },
  hasSprites: true, spriteScale: 1.85, spriteSheet: MMPR_PINK_ANIM.idle.sheet, portrait: './assets/mmpr_pink/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: { light: MMPR_PINK_MOVES.light, heavy: MMPR_PINK_MOVES.heavy, crouchLight: MMPR_PINK_MOVES.pLow, upAttack: MMPR_PINK_MOVES.up,
    airAttack: MMPR_PINK_MOVES.air, downAir: MMPR_PINK_MOVES.down_air,
    grab: { damage: dmg(24), startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 5, throwForceY: -3, damageType: 'grab' } },
  specials: { neutral: { name: 'Power Bow (tap: Quick Shot / hold: Drawn Shot)', cost: 10 }, down: { name: 'Crane Escape', cost: 12 },
    forward: { name: 'Thunder Line (Thunder Megazord assist)', cost: 15 }, up: { name: 'Sky Splitter (Thunder Megazord assist)', cost: 18 },
    back: { name: 'Returning Edge (Thunder Megazord assist)', cost: 15 } },
  ultimate: { name: 'Thunderstring — Heaven\'s Final Arrow', cost: 100,
    description: 'Braced special arrow on frame 30 (raw 30). A clean hit starts the Kimberly + Thunder Megazord sequence (raw 30+45+35+40+120 = 270 before shared scaling); miss/block has 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries({ ...MMPR_PINK_ANIM, pBow: MMPR_PINK_ANIM.bow, pUltOpen: MMPR_PINK_ANIM.ultOpen })
    .map(([k, a]) => [k, timeline[k] ? { ...a, frameTimeline: timeline[k] } : k === 'pBow' ? { ...a, frameTimeline: timeline.bow } : a])),
}
