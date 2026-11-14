// White Ranger (Tommy Oliver, Mighty Morphin / 1995 movie Genesis art). DATA ONLY: frame data, disciplines, the
// rangers.js profile, the Ninja Megazord order profiles (shared falconzord.js scheduler) and the roster entry.
// Logic: mmprWhiteState.js (sim), mmprWhite.js (command layer), falconzord.js (shared assist scheduler), mmprWhiteFx.js
// (render-only). Frame-by-frame rationale: docs/mmpr_white/MOVE_FRAME_MAP.md.
import { MMPR_WHITE_ANIM } from './mmprWhiteSprites.js'
import { registerRangerProfile } from './rangers.js'
import { registerFalconSortie } from './falconzord.js'

// ── DOUBLE-TAP BLINK: the established rangers.js contract, opted in with explicit tuning ──
// Same model as Black (2 charges, 90 f each, framework 3/5/3, 18 % of the reference screen, no crossup, ground only).
export const MMPR_WHITE_PROFILE = registerRangerProfile('mmpr_white', {
  ownTick: true,                       // mmprWhiteState.tickMmprWhite calls tickRanger itself
  team: 'Mighty Morphin',
  badge: { color: '#f2f2ee', accent: '#d8b030', emblem: 'tiger' },
  morph: { alwaysMorphed: true },      // the supplied sheet has no unmorphed Tommy
  blink: { distPct: 0.18, startup: 3, travel: 5, recovery: 3, charges: 2, recharge: 90, crossup: false, air: false,
    vertical: false, faceLockOnCross: 0, dodge: null, run: null },
  sprites: { streak: 'blink', vanish: 'blink', emblem: null },
})

// Roster-parity damage lever (same constant as Black / S.P.D. Rangers): stored damage = round(raw × 1.7).
export const MMPR_WHITE_DAMAGE_SCALE = 1.7
export const dmg = raw => Math.round(raw * MMPR_WHITE_DAMAGE_SCALE)

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  damageType: 'blunt', category: 'light', hitstun: 18, blockstun: 11, rangeX: 60, rangeY: 46, boxY: 14, knockbackX: 2, knockbackY: 0, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
// `disc` = the discipline a CLEAN, unblocked, grounded hit of this attack instance grants (HAND / FOOT / BLADE).
export const MMPR_WHITE_MOVES = {
  // J1 / J2 / J3 — fresh Light retaps on clean hits, three stages maximum. HAND.
  light: n(18, 5, 2, 10, { hitstun: 21, blockstun: 11, rangeX: 58, disc: 'hand' }),                         // Open Palm
  wJ2: n(22, 7, 2, 12, { hitstun: 19, blockstun: 12, rangeX: 64, disc: 'hand' }),                           // Body Check
  wJ3: n(30, 10, 3, 18, { hitstun: 26, blockstun: 13, rangeX: 76, boxY: 20, knockbackX: 5, disc: 'hand' }), // Tiger Heel
  // Heavy — SABA CUT. BLADE. The sword reach is in the box, not in any sprite pixel.
  heavy: n(56, 14, 3, 26, { category: 'heavy', damageType: 'slash', hitstun: 34, blockstun: 14, rangeX: 92, rangeY: 52, boxY: 6, knockbackX: 4, disc: 'blade' }),
  // Low — LOW HEEL. FOOT.
  wLow: n(25, 8, 2, 16, { hitLevel: 'low', hitstun: 22, blockstun: 12, rangeX: 78, rangeY: 30, boxY: 66, disc: 'foot' }),
  // Launcher — RISING TIGER. FOOT. Tommy stays grounded; clean hit → engine launcher jump-cancel.
  up: n(44, 12, 3, 22, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 58, rangeY: 104, boxY: -38, launchVy: -21, selfVy: 0, disc: 'foot' }),
  // Air — TURNING HEEL (no discipline: disciplines are grounded only)
  air: n(32, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 60, boxY: 20, knockbackY: -3 }),
  down_air: n(32, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 60, boxY: 20, knockbackY: -3 }),
  // Forward+Heavy chain: advancing martial strike → fresh Heavy Saba cut (BLADE) → fresh Heavy knock-away kick (FOOT).
  wAdv: n(24, 10, 3, 19, { category: 'heavy', hitstun: 30, blockstun: 12, rangeX: 70, travel: [2, 10, 4] }),
  wSaba: n(32, 12, 3, 21, { category: 'heavy', damageType: 'slash', hitstun: 32, blockstun: 13, rangeX: 90, boxY: 6, disc: 'blade' }),
  wKnock: n(44, 14, 3, 26, { category: 'heavy', hitstun: 30, blockstun: 14, rangeX: 80, rangeY: 60, boxY: 4, knockbackX: 8, disc: 'foot' }),
  // NEUTRAL SPECIAL — SABA'S ANSWER: 13 f mid-range Saba cut, raw 46. BLADE. Reach: box front edge 112 px past the body
  // front = 142 px from Tommy's centre (60 px body; measured), the brief's 140 target; the supplied slash streak shows it.
  wAnswer: n(46, 13, 3, 28, { category: 'special', isSpecial: true, cost: 15, damageType: 'slash', hitstun: 30, blockstun: 15, rangeX: 112, rangeY: 50, boxY: 8, knockbackX: 4, disc: 'blade' }),
  // SABA'S ANSWER FEINT: Block pressed during the Answer's startup frames 1-9 → this 12 f recovery, no hitbox, cost kept.
  wFeint: n(0, 1, 1, 10, { category: 'special', isSpecial: true, noBody: true }),
  // DOWN SPECIAL — WHITE TIGER ASCENT: rising kick, raw 42; FOOT only when started grounded; once per airtime; 16 f landing.
  wAscent: n(42, 10, 8, 20, { category: 'special', isSpecial: true, cost: 18, hitstun: 28, blockstun: 13, rangeX: 58, rangeY: 110, boxY: -14, knockbackY: -6, rising: true, disc: 'foot' }),
  // AIR DOWN SPECIAL — TIGER DESCENT: capped descending kick from frame 12 until landing (max 40 f), raw 44; 24 f landing.
  wDescent: n(44, 12, 40, 0, { category: 'special', isSpecial: true, cost: 15, hitstun: 26, blockstun: 14, rangeX: 64, rangeY: 64, boxY: 40, knockbackX: 3, knockbackY: -2, descent: true }),
  // NINJA MEGAZORD ORDER — the visible call pose shared by Forward / Up / Back Special. Startup 12 = the commit boundary.
  wCall: n(0, 12, 1, 14, { category: 'special', isSpecial: true, noBody: true, call: true }),
  // FORMATION SIGNAL — the pose Tommy holds when he accepts a Formation follow-up (Special retap). Its last recovery is the
  // only place Leader's Return may cancel from.
  wOrder: n(0, 1, 1, 28, { category: 'special', isSpecial: true, noBody: true }),
  // ULTIMATE OPENER — WHITE LIGHT: 30 f Saba strike, raw 35. Clean hit → the sequence; miss/block → 60 f recovery.
  wUltOpen: n(35, 30, 3, 60, { category: 'ultimate', isUltimate: true, cost: 100, damageType: 'slash', hitstun: 40, blockstun: 16, rangeX: 80, rangeY: 52, boxY: 8, knockbackX: 1, travel: [6, 30, 3] }),
}
export const MMPR_WHITE_LANDING = { ascent: 16, descent: 24 }
export const DESCENT = { vy: 14, vx: 5, maxActive: 40 }                       // capped descent speed (px / sim frame)
export const FEINT = { from: 1, to: 9 }                                         // Answer startup frames where Block feints
// THREE DISCIPLINES → FORMATION token.
export const DISCIPLINES = ['hand', 'foot', 'blade']
export const FORMATION = { window: 180, tokenLife: 240, acceptWindow: 10, acceptCost: 10 }
export const LEADER = { window: 12 }

// ── NINJA MEGAZORD ORDERS (shared falconzord.js data profiles) ──
// Path keys: [age, dx, dy, pose]. dx is multiplied by the direction captured at commit; origin 'owner' = Tommy's centre x
// and FEET line captured at commit (laneY 0): the Megazord walks on the floor. Nothing is re-read after commit: no
// homing, no tracking, no body-blocking (it has no hurtbox / pushbox). Contact boxes are offset in front of the robot
// along the committed direction (box.dx). Contacts with `gate: 'formation'` fire only when the owner accepted the
// Formation follow-up (falconzord.js gate support).
export const NINJA_RESOURCE = { pips: 2, recharge: 180, lockout: 60, callStartup: 12, postUltLock: 120 }
export const NINJA_ORDER = { fwd: 'ninjaTwinFist', up: 'ninjaCraneRise', back: 'ninjaEdge' }
registerFalconSortie('ninjaTwinFist', {
  name: 'Twin Fist', cost: 15, origin: 'owner', laneY: 0, warn: 14, life: 56, move: 'ninja_twin_fist', zord: 'ninja',
  keys: [[0, -170, 0, 'step'], [14, -10, 0, 'jab'], [17, -10, 0, 'punch'], [26, -10, 0, 'ready'], [31, -10, 0, 'punch2'], [40, -10, 0, 'ready'], [44, -10, 0, 'rear'], [56, -190, 0, 'rear']],
  gatePoses: { punch2: 'ready' },
  contacts: [{ from: 17, to: 21, raw: 38, hitstun: 30, blockstun: 16, knockbackX: 3, knockbackY: 0, box: { w: 110, h: 70, dx: 105, dy: -50 } },
    { gate: 'formation', from: 32, to: 35, raw: 24, hitstun: 28, blockstun: 14, knockbackX: 4, knockbackY: 0, box: { w: 110, h: 70, dx: 110, dy: -50 } }],
})
registerFalconSortie('ninjaCraneRise', {
  name: 'Crane Rise', cost: 18, origin: 'owner', laneY: 0, warn: 12, life: 60, move: 'ninja_crane_rise', zord: 'ninja',
  keys: [[0, -170, 0, 'step'], [12, -20, 0, 'chamber'], [17, -20, 0, 'crane'], [26, -20, 0, 'recover'], [33, -20, 0, 'push'], [42, -20, 0, 'ready'], [46, -20, 0, 'rear'], [60, -200, 0, 'rear']],
  gatePoses: { push: 'ready' },
  contacts: [{ from: 17, to: 21, raw: 44, hitstun: 34, blockstun: 16, knockbackX: 1, knockbackY: 0, launch: true, launchVy: -20, box: { w: 100, h: 120, dx: 80, dy: -75 } },
    // follow-up: a horizontal push kick — moves the target AWAY (spacing), never re-launches or resets the juggle.
    { gate: 'formation', from: 33, to: 36, raw: 20, hitstun: 26, blockstun: 14, knockbackX: 10, knockbackY: -1, box: { w: 110, h: 140, dx: 95, dy: -95 } }],
})
registerFalconSortie('ninjaEdge', {
  name: 'Ninja Edge', cost: 20, origin: 'owner', laneY: 0, warn: 24, life: 76, move: 'ninja_edge', zord: 'ninja',
  keys: [[0, -170, 0, 'step'], [10, -40, 0, 'draw'], [24, -40, 0, 'wind'], [34, -40, 0, 'cut'], [44, -40, 0, 'cutHold'], [52, -40, 0, 'finish'], [60, -40, 0, 'ready'], [64, -40, 0, 'rear'], [76, -220, 0, 'rear']],
  gatePoses: { finish: 'cutHold' },
  contacts: [{ from: 34, to: 38, raw: 54, hitstun: 32, blockstun: 18, knockbackX: 4, knockbackY: 0, box: { w: 150, h: 110, dx: 110, dy: -55 } },
    { gate: 'formation', from: 52, to: 55, raw: 26, hitstun: 30, blockstun: 14, knockbackX: 6, knockbackY: 0, box: { w: 150, h: 110, dx: 110, dy: -55 } }],
})

// Frame timelines (which strip frame shows at which elapsed tick).
const timeline = {
  light: [[0, 0], [4, 1]], wJ2: [[0, 0], [6, 1]], wJ3: [[0, 0], [9, 1]], heavy: [[0, 0], [8, 1], [14, 2]],
  wLow: [[0, 0], [7, 1]], up: [[0, 0], [11, 1], [16, 2]], air: [[0, 0], [7, 1]],
  wAdv: [[0, 0], [9, 1]], wSaba: [[0, 0], [12, 1]], wKnock: [[0, 0], [13, 1]],
  wAnswer: [[0, 0], [4, 1], [8, 2], [13, 3], [26, 4]], wFeint: [[0, 0], [4, 1]],
  wAscent: [[0, 0], [9, 1], [16, 2]], wDescent: [[0, 0], [11, 1]],
  wCall: [[0, 0], [12, 1]], wOrder: [[0, 0]], wUltOpen: [[0, 0], [12, 1], [30, 2]],
  ultKick: [[0, 0], [12, 1]], ultLand: [[0, 0], [8, 1]], ultFinal: [[0, 0], [10, 1]],
}

export const mmpr_white = {
  rosterKey: 'mmpr_white', name: 'White Ranger', civilianIdentity: 'Tommy Oliver', universe: 'power_rangers',
  series: 'Mighty Morphin Power Rangers', era: 'Mighty Morphin / supplied movie-game artwork (Genesis, MMPR: The Movie)',
  tagline: 'One opening. Everyone moves.', archetype: 'Saba Duelist / Formation Leader',
  bio: 'Tommy Oliver as the White Ranger: team leader, disciplined martial artist, wielder of the talking sabre Saba. Linking hand, foot and blade earns a Formation token that upgrades one Ninja Megazord order. The Ninja Megazord is the team\'s combined Zord, not Tommy\'s personal Zord; the order system is a game adaptation.',
  primary: 'balanced', secondary: ['summoner'], archetypes: ['balanced', 'summoner'],
  traits: { hasEnergy: true, energyType: 'energy', energyName: 'Morph Energy', mobility: 'normal', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Morph Energy', color: '#f4f1e2' },
  stats: { maxHealth: 1000, maxEnergy: 100, attack: 80, defense: 78, speed: 97, jumpPower: 26, maxJumps: 1, weight: 1, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 36 },
  hasSprites: true, spriteScale: 1.85, spriteSheet: MMPR_WHITE_ANIM.idle.sheet, portrait: './assets/mmpr_white/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: { light: MMPR_WHITE_MOVES.light, heavy: MMPR_WHITE_MOVES.heavy, crouchLight: MMPR_WHITE_MOVES.wLow, upAttack: MMPR_WHITE_MOVES.up,
    airAttack: MMPR_WHITE_MOVES.air, downAir: MMPR_WHITE_MOVES.down_air,
    grab: { damage: dmg(26), startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 5, throwForceY: -3, damageType: 'grab' } },
  specials: { neutral: { name: "Saba's Answer", cost: 15 }, down: { name: 'White Tiger Ascent / Tiger Descent (air)', cost: 18 },
    forward: { name: 'Twin Fist (Ninja Megazord order)', cost: 15 }, up: { name: 'Crane Rise (Ninja Megazord order)', cost: 18 },
    back: { name: 'Ninja Edge (Ninja Megazord order)', cost: 20 } },
  ultimate: { name: 'White Light — Ninja Grand Formation', cost: 100,
    description: '30 f Saba strike (raw 35). A clean hit starts a Tommy + Ninja Megazord sequence (raw 35+40+35+40+130 = 280 before shared scaling); a miss or block has 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries({ ...MMPR_WHITE_ANIM, wUltOpen: MMPR_WHITE_ANIM.ultOpen }).map(([k, a]) => [k, timeline[k] ? { ...a, frameTimeline: timeline[k] } : a])),
}
