// Black Ranger (Adam Park, Mighty Morphin / 1995 movie Genesis art). DATA ONLY: frame data, the rangers.js profile,
// the Falconzord sortie profiles and the roster entry.
// Logic lives in mmprBlackState.js (sim), mmprBlack.js (command layer), falconzord.js (shared sortie system) and
// mmprBlackFx.js (render-only). Frame-by-frame rationale: docs/mmpr_black/MOVE_FRAME_MAP.md.
import { MMPR_BLACK_ANIM } from './mmprBlackSprites.js'
import { registerRangerProfile } from './rangers.js'
import { registerFalconSortie } from './falconzord.js'

// ── DOUBLE-TAP BLINK: the established rangers.js contract (S.P.D. Red's model), opted in with explicit tuning ──
// Same charge model as Red (2 charges, each refilling on its own 90 f timer, no Energy cost) and the framework's
// own 3/5/3 startup / invulnerable travel / recovery split. Black's explicit differences from Red:
// 18% of the reference screen (230 px) instead of 22%, NO crossup (stops in front of the foe, 6 px gap), ground only,
// no PHASE STEP face lock, no dodge reward, no run-after-blink. No Judgment.
export const MMPR_BLACK_PROFILE = registerRangerProfile('mmpr_black', {
  ownTick: true,                       // mmprBlackState.tickMmprBlack calls tickRanger itself
  team: 'Mighty Morphin',
  badge: { color: '#2b2f36', accent: '#e9ecef', emblem: 'mastodon' },
  morph: { alwaysMorphed: true },      // the supplied sheet has no unmorphed Adam
  blink: { distPct: 0.18, startup: 3, travel: 5, recovery: 3, charges: 2, recharge: 90, crossup: false, air: false,
    vertical: false, faceLockOnCross: 0, dodge: null, run: null },
  sprites: { streak: 'blink', vanish: 'blink', emblem: null },
})

// ROSTER-PARITY lever: the Ranger roster's established per-character damage multiplier (S.P.D. Pink/Green/Blue,
// Krybot, Luffy use 1.7 on their authored "raw" numbers). Every number below is the brief's RAW value; this one
// constant converts it. Frame data and ratios are untouched. (rosterParity.js's extra x1.3 boost list is a foreign,
// untracked file and is NOT edited; see docs/mmpr_black/INTEGRATION.md.)
export const MMPR_BLACK_DAMAGE_SCALE = 1.7
export const dmg = raw => Math.round(raw * MMPR_BLACK_DAMAGE_SCALE)

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  damageType: 'blunt', category: 'light', hitstun: 18, blockstun: 11, rangeX: 60, rangeY: 46, boxY: 14, knockbackX: 2, knockbackY: 0, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
export const MMPR_BLACK_MOVES = {
  // J1 / J2 / J3 — fresh Light retaps, clean hits only, three stages maximum.
  light: n(18, 5, 2, 10, { hitstun: 21, blockstun: 11, rangeX: 58 }),                                   // Palm Check
  bJ2: n(22, 7, 2, 12, { hitstun: 18, blockstun: 12, rangeX: 66 }),                                     // Turning Strike
  bJ3: n(30, 10, 3, 18, { hitstun: 26, blockstun: 13, rangeX: 76, boxY: 20, knockbackX: 5 }),           // Driving Heel
  heavy: n(56, 14, 3, 26, { category: 'heavy', hitstun: 34, blockstun: 14, rangeX: 86, rangeY: 50, boxY: 8, knockbackX: 4, pincer: true }),   // Crescent Heel
  bLow: n(26, 8, 2, 16, { hitLevel: 'low', hitstun: 22, blockstun: 12, rangeX: 78, rangeY: 30, boxY: 66 }),   // Ankle Sweep
  up: n(44, 12, 3, 22, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 56, rangeY: 104, boxY: -38, launchVy: -21, selfVy: 0 }),   // Ascending Heel
  air: n(32, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 60, boxY: 20, knockbackY: -3 }),             // Flying Side Kick
  down_air: n(32, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 60, boxY: 20, knockbackY: -3 }),
  // Forward+Heavy command chain: advancing palm → fresh Heavy turning kick → fresh Heavy knock-away.
  bPalm: n(24, 10, 3, 19, { category: 'heavy', hitstun: 30, blockstun: 12, rangeX: 70, boxY: 14, travel: [2, 10, 4] }),
  bTurn: n(32, 12, 3, 21, { category: 'heavy', hitstun: 32, blockstun: 13, rangeX: 82 }),
  bAway: n(44, 14, 3, 26, { category: 'heavy', hitstun: 30, blockstun: 14, rangeX: 78, rangeY: 56, boxY: 18, knockbackX: 8, pincer: true }),
  // NEUTRAL SPECIAL — CRESCENT BREAK: one move, two authored contacts (frames 13-14, then 22-24). Unsafe on block.
  bCrescent: n(24, 13, 12, 26, { category: 'special', isSpecial: true, cost: 15, hitstun: 20, blockstun: 12, rangeX: 80, rangeY: 52, boxY: 10, knockbackX: 1,
    contacts: [{ from: 13, to: 14, raw: 24, hitstun: 20, blockstun: 12, knockbackX: 1 }, { from: 22, to: 24, raw: 30, hitstun: 26, blockstun: 14, knockbackX: 6 }] }),
  // DOWN SPECIAL — RISING MASTODON: committed rising kick, once per airtime, 16 f landing recovery, no invulnerability.
  bRising: n(44, 10, 8, 20, { category: 'special', isSpecial: true, cost: 18, hitstun: 28, blockstun: 13, rangeX: 56, rangeY: 110, boxY: -14, knockbackY: -6, rising: true }),
  // SORTIE CALL — the visible commit pose shared by Forward / Up / Back Special. Startup 12 = the commit boundary.
  bCall: n(0, 12, 1, 14, { category: 'special', isSpecial: true, noBody: true, call: true }),
  // ULTIMATE OPENER — FALCON FORMATION: 30 f advancing strike, raw 35. Clean hit → the sequence; miss/block → 60 f recovery.
  bUltOpen: n(35, 30, 3, 60, { category: 'ultimate', isUltimate: true, cost: 100, hitstun: 40, blockstun: 16, rangeX: 72, rangeY: 52, boxY: 12, knockbackX: 1, travel: [6, 30, 3] }),
}
export const MMPR_BLACK_LANDING = { rising: 16 }
export const PINCER = { tag: 45, cancelLast: 6, retapBuffer: 4 }

// ── FALCONZORD SORTIES (shared falconzord.js data profiles) ──
// Path keys: [age, dx, dy, pose]. dx is multiplied by the direction captured at commit; dy is screen-down positive.
// Origin 'owner' = the owner's centre x and lane height captured at commit; 'target' = the target region captured at
// commit. Nothing is re-read after commit: no homing, no tracking.
export const FALCON_RESOURCE = { pips: 2, recharge: 180, lockout: 60, callStartup: 12, postUltLock: 120 }
registerFalconSortie('sweep', {
  name: 'Falcon Sweep', cost: 12, origin: 'owner', laneY: -52, warn: 10, life: 56,
  keys: [[0, -330, -150, 'approach'], [10, -170, 0, 'sweep'], [40, 560, 0, 'sweep'], [56, 700, -260, 'turn']],
  contacts: [{ from: 10, to: 40, raw: 38, hitstun: 22, blockstun: 14, knockbackX: 3, knockbackY: 0, box: { w: 64, h: 40, dy: 0 } }],
})
registerFalconSortie('talon', {
  name: 'Talon Lift', cost: 18, origin: 'target', warn: 8, life: 42,
  keys: [[0, -110, -250, 'approach'], [8, -70, -170, 'talon'], [16, 0, 0, 'talon'], [18, 6, 8, 'rise'], [28, 40, -200, 'rise'], [42, 120, -420, 'approach']],
  contacts: [{ from: 12, to: 17, raw: 18, hitstun: 24, blockstun: 12, knockbackX: 1, knockbackY: 0, box: { w: 60, h: 48, dy: 10 } },
    { from: 19, to: 23, raw: 30, hitstun: 30, blockstun: 14, knockbackX: 2, knockbackY: -4, launchVy: -22, launch: true, box: { w: 60, h: 56, dy: 0 } }],
})
registerFalconSortie('volley', {
  name: 'Covering Volley', cost: 15, origin: 'owner', laneY: -150, warn: 10, life: 51,
  keys: [[0, -260, -170, 'approach'], [10, -110, -40, 'zap'], [37, -110, -40, 'zap'], [51, -300, -270, 'turn']],
  contacts: [],
  // 15 f apart: the second shot lands AFTER the first shot's 12 f blockstun, so a held guard catches both (this
  // engine drops isBlocking during blockstun — a gapless pair would turn a blocked first shot into a free hit).
  shots: [{ at: 12, raw: 20 }, { at: 27, raw: 20 }],
  shot: { speed: 13, hitstun: 18, knockbackX: 3, knockbackY: -1, lifetime: 70, radius: 12 },
})

// Frame timelines (which strip frame shows at which elapsed tick).
const timeline = {
  light: [[0, 0], [4, 1]], bJ2: [[0, 0], [4, 1], [7, 2]], bJ3: [[0, 0], [9, 1]], heavy: [[0, 0], [13, 1], [18, 2]],
  bLow: [[0, 0], [7, 1]], up: [[0, 0], [11, 1], [16, 2]], air: [[0, 0], [7, 1]],
  bPalm: [[0, 0], [9, 1]], bTurn: [[0, 0], [11, 1]], bAway: [[0, 0], [13, 1]],
  bCrescent: [[0, 0], [12, 1], [16, 2], [21, 3], [26, 4]], bRising: [[0, 0], [9, 1], [12, 2]],
  bCall: [[0, 0], [12, 1]], bUltOpen: [[0, 0], [29, 1]],
  ultLow: [[0, 0], [14, 1]], ultRise: [[0, 0], [10, 1]], ultLand: [[0, 0], [16, 1]],
}

export const mmpr_black = {
  rosterKey: 'mmpr_black', name: 'Black Ranger', civilianIdentity: 'Adam Park', universe: 'power_rangers',
  series: 'Mighty Morphin Power Rangers', era: 'Mighty Morphin / supplied movie-game artwork (Genesis, MMPR: The Movie)',
  tagline: 'Stay grounded. Strike together.', archetype: 'Martial Artist / Aerial Assist Commander',
  bio: 'Adam Park: the disciplined, soft-spoken martial artist (Shaolin kung fu) who took the Black Power. His kicks and palm strikes set up short scripted Falconzord passes. The Falconzord partnership and the assist commands are a game adaptation, not a claim that the Falconzord is Adam\'s Zord.',
  primary: 'balanced', secondary: ['summoner'], archetypes: ['balanced', 'summoner'],
  traits: { hasEnergy: true, energyType: 'energy', energyName: 'Morph Energy', mobility: 'normal', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Morph Energy', color: '#c9d1dc' },
  stats: { maxHealth: 1000, maxEnergy: 100, attack: 80, defense: 78, speed: 95, jumpPower: 26, maxJumps: 1, weight: 1, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 36 },
  hasSprites: true, spriteScale: 1.85, spriteSheet: MMPR_BLACK_ANIM.idle.sheet, portrait: './assets/mmpr_black/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: { light: MMPR_BLACK_MOVES.light, heavy: MMPR_BLACK_MOVES.heavy, crouchLight: MMPR_BLACK_MOVES.bLow, upAttack: MMPR_BLACK_MOVES.up,
    airAttack: MMPR_BLACK_MOVES.air, downAir: MMPR_BLACK_MOVES.down_air,
    grab: { damage: dmg(26), startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 5, throwForceY: -3, damageType: 'grab' } },
  specials: { neutral: { name: 'Crescent Break', cost: 15 }, down: { name: 'Rising Mastodon', cost: 18 },
    forward: { name: 'Falcon Sweep (Falconzord assist)', cost: 12 }, up: { name: 'Talon Lift (Falconzord assist)', cost: 18 },
    back: { name: 'Covering Volley (Falconzord assist)', cost: 15 } },
  ultimate: { name: 'Falcon Formation: Blackout Descent', cost: 100,
    description: '30 f advancing strike (raw 35). A clean hit starts a five-contact Black + Falconzord sequence (raw 35+40+45+40+100 = 260 before shared scaling); a miss or block has 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries({ ...MMPR_BLACK_ANIM, bUltOpen: MMPR_BLACK_ANIM.ultOpen }).map(([k, a]) => [k, timeline[k] ? { ...a, frameTimeline: timeline[k] } : a])),
}
