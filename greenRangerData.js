// Green Ranger (green_ranger, Mighty Morphin). DATA ONLY: frame data, Dragon Call timing, the shared Ranger Zord
// ultimate opt-in and the roster entry. Logic: greenRangerState.js (sim), greenRanger.js (command layer),
// rangerZordUltimate.js (shared Zord ultimate), greenRangerFx.js (render-only).
// Frame-by-frame rationale and real source frame IDs: docs/green_ranger/MOVE_FRAME_MAP.md.
import { GREEN_RANGER_ANIM, GREEN_RANGER_PORTRAIT } from './greenRangerSprites.js'
import { registerZordUltimate } from './rangerZordUltimate.js'

// ROSTER-PARITY lever: the Ranger roster's established per-character damage multiplier (Black / Pink / White /
// S.P.D. Rangers use 1.7 on their authored "raw" numbers). Every number below is the brief's RAW value; this one
// constant converts it. Frame data and ratios are untouched. Documented in docs/green_ranger/BALANCE_NOTES.md.
export const GREEN_DAMAGE_SCALE = 1.7
export const dmg = raw => Math.round(raw * GREEN_DAMAGE_SCALE)

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  damageType: 'blunt', category: 'light', hitstun: 18, blockstun: 11, rangeX: 60, rangeY: 46, boxY: 14, knockbackX: 2, knockbackY: 0, ...extra })
const blade = { damageType: 'slash', blade: true }

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery (frameExact path).
// rangeX = reach of the box in FRONT of the body (the body is 48 px wide, so reach from the body centre = 24 + rangeX).
export const GREEN_MOVES = {
  // J1 / J2 / J3 — fresh Light retaps on a clean hit, three stages maximum.
  light: n(18, 5, 2, 10, { hitstun: 21, blockstun: 11, rangeX: 58 }),                                        // Straight Punch
  gJ2: n(22, 6, 2, 12, { hitstun: 19, blockstun: 12, rangeX: 60 }),                                          // Body Hook
  gJ3: n(30, 9, 3, 20, { hitstun: 26, blockstun: 13, rangeX: 72, boxY: 18, knockbackX: 5 }),                 // Roundhouse Finish (mildly unsafe)
  heavy: n(54, 13, 3, 26, { category: 'heavy', hitstun: 34, blockstun: 14, rangeX: 84, rangeY: 50, boxY: 8, knockbackX: 4 }),   // Turning Kick
  gLow: n(26, 8, 2, 16, { hitLevel: 'low', hitstun: 22, blockstun: 12, rangeX: 76, rangeY: 30, boxY: 66 }),   // Leg Sweep
  up: n(44, 12, 3, 22, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 56, rangeY: 104, boxY: -38, launchVy: -21, selfVy: 0 }),   // Rising Heel
  air: n(32, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 60, boxY: 20, knockbackY: -3 }),                  // Flying Kick
  down_air: n(32, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 60, boxY: 30, knockbackY: -3 }),
  // Forward+Heavy command chain: advancing punch → fresh Heavy blade strike → fresh Heavy knock-away slash.
  gAdv: n(24, 10, 3, 19, { category: 'heavy', hitstun: 30, blockstun: 12, rangeX: 66, travel: [2, 10, 4] }),
  gBlade: n(34, 12, 3, 21, { ...blade, category: 'heavy', hitstun: 32, blockstun: 13, rangeX: 96, rangeY: 60, boxY: 0 }),
  gAway: n(46, 14, 3, 26, { ...blade, category: 'heavy', hitstun: 30, blockstun: 14, rangeX: 104, rangeY: 52, boxY: 18, knockbackX: 9 }),
  // NEUTRAL SPECIAL — DRAGON EDGE: committed mid-range cut. Reach 24 + 126 = 150 px from the body centre.
  gEdge: n(46, 14, 3, 30, { ...blade, category: 'special', isSpecial: true, cost: 12, hitstun: 28, blockstun: 14, rangeX: 126, rangeY: 58, boxY: 14, knockbackX: 4, empower: 'edge' }),
  // FORWARD SPECIAL — EMERALD ADVANCE: bounded 140 px lunge (frames 6-15, 14 px/f, never through the foe), one contact.
  gAdvance: n(62, 16, 4, 30, { ...blade, category: 'special', isSpecial: true, cost: 18, hitstun: 30, blockstun: 14, rangeX: 80, rangeY: 56, boxY: 12, knockbackX: 6, travel: [6, 16, 14], empower: 'advance' }),
  // Note version: identical timing / reach / cost; the finish LAUNCHES (shared launcher rules, one per combo).
  gAdvanceN: n(62, 16, 4, 30, { ...blade, category: 'special', isSpecial: true, cost: 18, hitstun: 32, blockstun: 14, rangeX: 80, rangeY: 70, boxY: 0, knockbackX: 2, travel: [6, 16, 14], launcher: true, launchVy: -19, selfVy: 0, empower: 'advance' }),
  // DOWN SPECIAL — RISING TALON: two authored contacts (frames 9-11, 16-19), once per airtime, 14 f landing recovery.
  gTalon: n(18, 9, 11, 14, { category: 'special', isSpecial: true, cost: 20, hitstun: 22, blockstun: 12, rangeX: 54, rangeY: 104, boxY: -20, knockbackX: 1, knockbackY: -15, rising: true,
    contacts: [{ from: 9, to: 11, raw: 18, hitstun: 22, blockstun: 12, knockbackX: 1, knockbackY: -15 }, { from: 16, to: 19, raw: 34, hitstun: 30, blockstun: 13, knockbackX: 3, knockbackY: -6 }] }),
  // BACK SPECIAL — EMERALD PULSE: forward cast; the shot leaves on frame 18 (the first active frame). Body has no box.
  gPulse: n(38, 18, 1, 22, { category: 'special', isSpecial: true, cost: 15, noBody: true, empower: 'pulse' }),
  // AIR DOWN+SPECIAL — DESCENDING FANG: blade dive. Startup 12 (hangs), then descends at a capped speed; active until
  // landing (max 40 f), then 24 f landing recovery. Once per airtime.
  gFang: n(46, 12, 40, 0, { ...blade, category: 'special', isSpecial: true, cost: 15, hitstun: 30, blockstun: 14, rangeX: 46, rangeY: 76, boxY: 40, knockbackX: 3, knockbackY: -2, fang: true }),
  // CHARGE — DRAGON CALL: 18 startup + 30 performance (the "active" span) + 12 recovery. No box, no armor, no invuln.
  gCall: n(0, 18, 30, 12, { category: 'special', noBody: true, call: true }),
  // ULTIMATE — RANGER ZORD ASSAULT call pose. The opener contact belongs to the Falconzord (rangerZordUltimate.js):
  // the dive is active on frames 30-35. The body never has a box. Whiff / block → 60 f recovery after the dive.
  gUlt: n(0, 30, 6, 60, { category: 'ultimate', isUltimate: true, cost: 100, noBody: true, ult: true }),
}
export const GREEN_LANDING = { talon: 14, fang: 24 }
export const FANG = { descendVy: 13, vx: 5, maxActive: 40 }   // capped descent: 13 px/f down, 5 px/f forward
export const DRAGON_CALL = { startup: 18, perform: 30, recovery: 12, maxNotes: 2, cooldown: 180 }
export const EDGE_FOLLOW = { at: 18, raw: 16, speed: 7, lifetime: 14, hitstun: 16, w: 46, h: 46 }       // note: visible burst after the cut
export const PULSE = { speed: 9, lifetime: 70, hitstun: 22, w: 40, h: 24, secondDelay: 10, knockbackX: 4, knockbackY: -1 }
export const CHAIN_RETAP = 8   // fresh-press window (sim ticks) for chains / specials

// ── SHARED RANGER ZORD ULTIMATE: explicit opt-in. Simulation numbers live in the shared sequence; presentation
// (title / subtitle / tint / accent per skin) is DATA read only by the renderer (greenRangerSkinTable.js).
export const GREEN_ZORD = registerZordUltimate('green_ranger', { sequence: 'falconzord_assault', cost: 100, scale: GREEN_DAMAGE_SCALE,
  callMove: 'gUlt', whiffRecovery: 60, poses: { call: 'gUlt', watch: 'ultWatch', signal: 'ultSignal' } })

const timeline = {
  light: [[0, 0], [4, 1]], gJ2: [[0, 0], [5, 1]], gJ3: [[0, 0], [8, 1]], heavy: [[0, 0], [12, 1], [18, 2]],
  gLow: [[0, 0], [7, 1]], up: [[0, 0], [11, 1]], air: [[0, 0], [7, 1]], down_air: [[0, 0]],
  gAdv: [[0, 0], [9, 1]], gBlade: [[0, 0], [11, 1]], gAway: [[0, 0], [17, 1]],
  gEdge: [[0, 0], [13, 1], [18, 2]], gAdvance: [[0, 0], [12, 1], [21, 2]], gAdvanceN: [[0, 0], [12, 1], [17, 2]],
  gTalon: [[0, 0], [8, 1], [15, 2], [21, 3]], gPulse: [[0, 0], [9, 1], [17, 2]], gFang: [[0, 0], [12, 1]],
  gCall: [[0, 0], [10, 1]], gUlt: [[0, 0], [20, 1]], grab: [[0, 0], [7, 1]],
}

export const green_ranger = {
  rosterKey: 'green_ranger', name: 'Green Ranger', civilianIdentity: 'Tommy Oliver', universe: 'power_rangers',
  series: 'Mighty Morphin Power Rangers', era: 'Mighty Morphin / supplied custom sprite sheet (Supaman2525 edit of Belial the Hedgehog rips)',
  tagline: 'Strike with purpose.', archetype: 'Martial Artist / Blade Pressure',
  bio: 'Tommy Oliver as the Green Ranger: martial-arts pressure that builds Morph Energy, Dragon Dagger cuts that spend it, and a flute call that banks one Dragon Note at a time. The Falconzord ultimate is an explicit creative crossover, not a claim that the Falconzord is the Green Ranger\'s Zord.',
  primary: 'balanced', secondary: ['rushdown'], archetypes: ['balanced', 'rushdown'],
  traits: { hasEnergy: true, energyType: 'energy', energyName: 'Morph Energy', mobility: 'normal', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Morph Energy', color: '#5fd35f' },
  stats: { maxHealth: 1000, maxEnergy: 100, attack: 82, defense: 78, speed: 96, jumpPower: 26, maxJumps: 1, weight: 1, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 36 },
  hasSprites: true, spriteScale: 1.85, spriteSheet: GREEN_RANGER_ANIM.idle.sheet, portrait: GREEN_RANGER_PORTRAIT,
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: { light: GREEN_MOVES.light, heavy: GREEN_MOVES.heavy, crouchLight: GREEN_MOVES.gLow, upAttack: GREEN_MOVES.up,
    airAttack: GREEN_MOVES.air, downAir: GREEN_MOVES.down_air,
    grab: { damage: dmg(26), startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 5, throwForceY: -3, damageType: 'grab' } },
  specials: { neutral: { name: 'Dragon Edge', cost: 12 }, forward: { name: 'Emerald Advance', cost: 18 }, down: { name: 'Rising Talon', cost: 20 },
    back: { name: 'Emerald Pulse', cost: 15 }, airDown: { name: 'Descending Fang', cost: 15 }, charge: { name: 'Dragon Call', cost: 0 } },
  ultimate: { name: 'Ranger Zord Assault', cost: 100, zord: 'Falconzord',
    description: 'Flute call; the Falconzord dives on frames 30-35 (raw 40). A clean dive starts talon (50) → electrical strike (50) → energy dive (100): 240 raw before shared scaling. Whiff or block: the Zord leaves, 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries(GREEN_RANGER_ANIM).map(([k, a]) => [k, timeline[k] ? { ...a, frameTimeline: timeline[k] } : a])),
}
