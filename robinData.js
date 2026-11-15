// Robin (Dick Grayson, Teen Titans — supplied Game Boy Advance art). DATA ONLY: frame data, gadget constants, the
// ultimate schedule and the roster entry. Logic: robinState.js (sim), robin.js (command layer), robinFx.js (render).
// Frame-by-frame rationale and the coverage ledger: docs/robin/SPRITE_MAP.md and docs/robin/MOVESET.md.
// Robin is a fast gadget tactician: quick punches, a long staff, smoke cover, thrown and planted bombs and a wrist
// computer that commands them. No superpowers, no teleport, no invulnerable dash, no homing.
import { ROBIN_ANIM } from './robinSprites.js'

// Authoring lever shared with the recent hand-built fighters (Rangers / Cyborg / Beast Boy / Raven): stored = round(raw × 1.7).
export const ROBIN_DAMAGE_SCALE = 1.95
export const dmg = raw => Math.round(raw * ROBIN_DAMAGE_SCALE)

export const COST = { bomb: 12, smoke: 15, express: 16, roof: 16, plant: 14, ult: 100 }

// SMOKE DROP field (one per Robin). Tactical cover only: no damage, stun, blindness, invulnerability or control loss.
export const SMOKE = { life: 75, halfW: 64, h: 96, stepWindowFeet: 6 }
// SMOKE STEP: one enhanced physical dash per field (fresh forward / back double-tap while Robin stands in his smoke).
// 12 px / f × 12 f = 144 px of real travel (ordinary dash ≈ 9.35 × 10 = 94 px). Stage-clamped, stops at the opponent's
// body (never passes through), no invulnerability.
export const STEP = { speed: 12, frames: 12, outplayWindow: 40, ghosts: 4 }
// BIRD'S-EYE BOMB (thrown, no homing). Ground: a STRAIGHT projectile at chest height (no gravity), 14 px/f for up to
// 70 f ≈ 980 px — explodes on a foe, a wall or the end of its fuse. Air: a straight down-forward throw (once per airtime)
// that explodes on the floor. Bomb Bat: the only arcing bomb (per-kind gravity `g`).
export const BOMB = { ground: { vx: 14, vy: 0, g: 0 }, air: { vx: 11, vy: 5, g: 0 }, bat: { vx: 13, vy: -4.5, g: 0.42 }, g: 0.42, vmax: 12, fuse: 70, r: 9,
  raw: 44, hitstun: 22, blockstun: 12, kbx: 6, kby: -5 }
// EXPLOSION (the complete supplied 11-cell Bomb Explosion). One hit per target (engine piercesMulti latch), live for
// the first `active` frames only; the remaining cells are presentation.
export const BLAST = { r: 48, active: 4, raw: 44, remoteRaw: 50, hitstun: 24, kbx: 7, kby: -6, fxFrames: 33 }
// DEAD DROP (planted bomb). Visible arming, max one per Robin, fixed lifetime, destroyed by an eligible hostile hit.
export const PLANT = { arm: 36, life: 480, ahead: 44, w: 24, h: 14, warn: 10 }
// REMOTE OVERRIDE (L2 / Charge with an ARMED planted bomb): tap = detonate after a fixed warning; hold past the
// threshold = convert the bomb into Robin's smoke field (no damage). Exclusive tap / hold resolution.
export const REMOTE = { hold: 18, tapCmdAt: 5, tapTotal: 24, holdTotal: 30, afterConvert: 10 }

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 52, rangeY: 44, boxY: 18, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery (60 sim ticks / s).
// Boxes: rangeX from the body front, boxY / rangeY from the physics-box top (same contract as the roster).
// `hits` = explicit multi-hit schedule [[from, to, hitId], …] in elapsed frames: the hitbox exists ONLY inside a listed
// window, each window can connect at most once (bounded; looping art never creates extra hits).
export const ROBIN_MOVES = {
  // ── human chain ──
  light: n(16, 5, 2, 10, { hitstun: 16, blockstun: 9, rangeX: 54, knockbackX: 2 }),                                   // Punch 1 — spinning back-fist starter
  rJ2: n(20, 6, 2, 12, { hitstun: 18, blockstun: 10, rangeX: 60, knockbackX: 3, travel: [1, 9, 3] }),                // Punch 2 — advancing straight
  rJ3: n(30, 9, 3, 20, { hitstun: 24, blockstun: 12, rangeX: 50, rangeY: 70, boxY: -10, knockbackX: 4, knockbackY: -8 }),   // Punch 3 — acrobatic rising finisher
  rLow: n(22, 7, 2, 13, { hitLevel: 'low', hitstun: 19, blockstun: 10, rangeX: 72, rangeY: 26, boxY: 66 }),           // low staff check
  // ── staff ──
  heavy: n(46, 12, 4, 20, { category: 'heavy', staff: true, hitstun: 26, blockstun: 13, rangeX: 94, rangeY: 40, boxY: 40, knockbackX: 6 }),   // horizontal sweep (range)
  up: n(36, 11, 4, 22, { category: 'launcher', staff: true, launcher: true, hitstun: 30, blockstun: 13, rangeX: 46, rangeY: 112, boxY: -42, launchVy: -21, selfVy: 0 }),   // rising pole-vault launcher (anti-air)
  rAdv: n(44, 13, 3, 24, { category: 'heavy', staff: true, hitstun: 26, blockstun: 14, rangeX: 96, rangeY: 30, boxY: 58, knockbackX: 10, knockbackY: -3, travel: [3, 12, 4] }),   // low advancing lunge → stow (committed ender)
  air: n(26, 7, 4, 14, { hitstun: 22, rangeX: 58, rangeY: 50, boxY: 30, knockbackX: 3, knockbackY: -3 }),           // Midair Kick
  // ── specials ──
  rBomb: n(0, 14, 1, 17, { category: 'special', isSpecial: true, noBody: true, cost: COST.bomb, releaseAt: 14 }),      // Bird's-Eye Bomb (ground)
  rAirBomb: n(0, 8, 1, 13, { category: 'special', isSpecial: true, noBody: true, air: true, cost: COST.bomb, releaseAt: 8 }),   // air throw (once per airtime)
  rSmoke: n(0, 8, 1, 15, { category: 'special', isSpecial: true, noBody: true, cost: COST.smoke, releaseAt: 8 }),      // Smoke Drop
  rPlant: n(0, 10, 1, 19, { category: 'special', isSpecial: true, noBody: true, cost: COST.plant, releaseAt: 10 }),    // Dead Drop
  // Staff Express: lead-in → the sheet's "Play 3 Times" flurry played exactly three times (one scheduled hit per loop)
  // → pushback thrust. 4 explicit hit windows, bounded travel.
  rExpress: n(12, 10, 38, 20, { category: 'special', isSpecial: true, staff: true, cost: COST.express, hitstun: 20, blockstun: 9, rangeX: 84, rangeY: 34, boxY: 38,
    knockbackX: 1, knockbackY: 0, travel: [4, 40, 3], hits: [[10, 12, 'x1'], [22, 24, 'x2'], [34, 36, 'x3'], [45, 47, 'push']],
    hitRaw: { x1: 12, x2: 12, x3: 12, push: 30 }, pushKb: [10, -3] }),
  // Rooftop Route: rising staff strike into the airborne acrobatic finish. Once per airtime; never refunds a jump.
  rRoof: n(34, 9, 6, 21, { category: 'special', isSpecial: true, staff: true, cost: COST.roof, hitstun: 28, blockstun: 12, rangeX: 50, rangeY: 104, boxY: -40,
    knockbackX: 2, knockbackY: -9, rise: { at: 5, vy: -13.5, vx: 2.2 } }),
  // Smoke Step — the enhanced physical dash as a committed, body-less action (real travel owned by robinState.js).
  rStep: n(0, 1, 1, 13, { category: 'movement', noBody: true, step: true }),
  // Remote Override (Hacking Computer) — no hitbox; the tap / hold policy lives in robinState.js.
  rHack: n(0, 1, 1, 22, { category: 'special', noBody: true, hack: true }),
  // ULTIMATE OPENER — committed staff strike (the full row-1 sweep), raw 30. Clean hit → CHECKMATE; whiff / block → recovery.
  ultOpen: n(30, 14, 3, 40, { category: 'ultimate', isUltimate: true, staff: true, cost: COST.ult, hitstun: 40, blockstun: 16, rangeX: 92, rangeY: 40, boxY: 40, knockbackX: 1 }),
}
export const CHAIN = { light: 'rJ2', rJ2: 'rJ3' }                                  // fresh Light retaps after a clean hit
export const STAFF_FROM = ['light', 'rJ2', 'rLow']                                  // clean hit → Heavy / Forward+Heavy / Up+Heavy
export const SPECIAL_FROM = ['light', 'rJ2', 'rJ3', 'rLow', 'heavy', 'rAdv', 'up']    // clean contact, recovery only
export const ULT_FROM = ['heavy', 'rJ3', 'rAdv']
export const STAFF_KEYS = ['heavy', 'up', 'rAdv', 'rLow', 'rExpress', 'rRoof', 'ultOpen']   // can Bomb Bat a planted bomb
export const OUTPLAY_KEYS = ['light', 'rJ2', 'rJ3', 'rLow', 'heavy', 'up', 'rAdv', 'air', 'rExpress', 'rRoof']

// ── ULTIMATE: CHECKMATE — LIGHTS OUT (frames from confirm; frozen-cinematic contract) ──
//   0–29   supplied cutscene portrait cut-in; Robin in the confident Appearing pose
//  30–47   smoke burst masks a SHORT physical reposition to the target's near side (never through it)
//  48–85   controlled staff flurry (the Play-3-Times cells): contacts @54 / @66 / @78, raw 22 each
//  86–111  rising staff: contact @96 raw 34 (target lifted)
// 112–149  Hacking Computer: the final command; a bomb arms at the target's feet (blinking)
// 150      the full Bomb Explosion erupts: contact raw 130
// 150–171  airborne acrobatic leap clear of the blast (the Throwing-Bombs jump cells)
// 172–199  Landing sequence → readable recovery pose
// Opener 30 + 66 + 34 + 130 = 260 raw before shared scaling. One resource transaction (100 at the opener).
export const ULT = { total: 200, cutIn: 30, settle: 172,
  contacts: [{ at: 54, raw: 22, kind: 'staff' }, { at: 66, raw: 22, kind: 'staff' }, { at: 78, raw: 22, kind: 'staff' },
    { at: 96, raw: 34, kind: 'rise' }, { at: 150, raw: 130, kind: 'blast' }],
  beats: [{ from: 0, pose: 'ultPose' }, { from: 30, pose: 'rStep' }, { from: 48, pose: 'ultFlurry' }, { from: 86, pose: 'ultRise' },
    { from: 112, pose: 'ultHack' }, { from: 150, pose: 'ultLeap' }, { from: 172, pose: 'ultLand' }] }

// ── Frame timelines (elapsed tick → strip frame) — see docs/robin/MOVESET.md ──
const loop = (from, to, step, idx) => { const o = []; for (let t = from, i = 0; t < to; t += step, i++) o.push([t, idx[i % idx.length]]); return o }
export const TIMELINE = {
  light: [[0, 0], [1, 1], [2, 2], [3, 3], [5, 4], [7, 5], [10, 6], [13, 7], [15, 8]],
  rJ2: [[0, 0], [2, 1], [4, 2], [6, 3], [11, 4], [16, 5]],
  rJ3: [[0, 0], [2, 1], [4, 2], [6, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8], [19, 9], [21, 10], [23, 11], [25, 12], [28, 13], [30, 14]],
  rLow: [[0, 0], [7, 1], [12, 2], [18, 3]],
  heavy: [[0, 0], [2, 1], [4, 2], [5, 3], [6, 4], [8, 5], [10, 6], [12, 7], [16, 8], [21, 9], [26, 10], [32, 11]],
  up: [[0, 0], [3, 1], [7, 2], [11, 3], [16, 4], [24, 5]],
  rAdv: [[0, 0], [4, 1], [8, 2], [13, 3], [16, 4], [20, 5], [26, 6], [30, 7], [33, 8], [36, 9], [38, 10]],
  air: [[0, 0], [2, 1], [4, 2], [7, 3], [11, 4], [14, 5], [17, 6], [20, 7], [23, 8]],
  rBomb: [[0, 0], [4, 1], [9, 2], [14, 3], [18, 4], [24, 5], [28, 6]],
  rAirBomb: [[0, 0], [4, 1], [8, 2], [14, 3]],
  rSmoke: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 4]],
  rPlant: [[0, 0], [3, 1], [6, 2], [10, 3], [16, 4], [21, 5], [26, 6]],
  // lead-in 0-2, then the boxed flurry (cells 3-8) EXACTLY three times, then the pushback thrust (9) and the stow (10-14)
  rExpress: [[0, 0], [3, 1], [6, 2], ...loop(9, 45, 2, [3, 4, 5, 6, 7, 8]), [45, 9], [50, 10], [54, 11], [58, 12], [62, 13], [66, 14]],
  rRoof: [[0, 0], [3, 1], [5, 2], [8, 3], [11, 4], [14, 5], [18, 6], [23, 7], [28, 8], [33, 9]],
  rHack: loop(0, 400, 3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  ultOpen: [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4], [10, 5], [12, 6], [14, 7], [20, 8], [30, 9], [40, 10], [50, 11]],
  ultPose: [[0, 0]], rStep: [[0, 0], [3, 1], [6, 2], [9, 3]],
  ultFlurry: loop(0, 38, 2, [0, 1, 2, 3, 4, 5]), ultRise: [[0, 0], [4, 1], [8, 2], [12, 3], [18, 4]],
  ultHack: loop(0, 38, 3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), ultLeap: [[0, 0], [5, 1], [10, 2], [15, 3]],
  ultLand: [[0, 0], [3, 1], [6, 2], [9, 3], [13, 4], [17, 5], [21, 6], [25, 7]],
}

export const robin = {
  rosterKey: 'robin', name: 'Robin', displayName: 'Robin', civilianIdentity: 'Dick Grayson', universe: 'dc',
  color: '#e8303c', series: 'Teen Titans', era: 'Teen Titans / supplied Game Boy Advance artwork',
  tagline: 'The Boy Wonder.', introTitle: 'ROBIN — THE BOY WONDER', archetype: 'Gadget Tactician / Mobile Mid-range',
  bio: 'Dick Grayson leads the Teen Titans with no superpowers: acrobatics, a collapsible bo staff, smoke and explosive birdarang-era gadgets, and a wrist computer. He drops smoke to change angles, plants bombs he can detonate or reprogram remotely, and bats his own bombs with the staff. Smoke Step, Remote Override and Bomb Bat are game adaptations.',
  primary: 'all-rounder', secondary: ['rushdown', 'trickster'], archetypes: ['all-rounder', 'rushdown', 'trickster'],
  traits: { hasEnergy: true, energyType: 'gadget', energyName: 'Gadget Energy', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Gadget Energy', color: '#ffd23c' },
  // speed 98 / dash 22 = Toji's numbers: 9.5 px / f walk (physics.js cap) and the shared speed-tier TELEPORT (game.js
  // SPEED_TIER_THRESHOLD 98): a double-tap TOWARD the foe blinks behind them; robinState dresses that blink as a smoke
  // vanish (smoke burst at both ends, Smoke Drop throw pose). A double-tap AWAY stays an ordinary dash / Smoke Step.
  // maxJumps 2 = the SHARED double jump (physics.js), no Robin-specific jump code or energy tax.
  stats: { maxHealth: 1100, maxEnergy: 100, attack: 82, defense: 76, speed: 98, jumpPower: 26, maxJumps: 2, weight: 1,
    dashSpeed: 22, dashDuration: 10, dashCooldownMax: 26 },
  hasSprites: true, spriteScale: 2.2, spriteSheet: ROBIN_ANIM.idle.sheet, portrait: './assets/robin/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro', 'introSettle'],
  basic_attacks: { light: ROBIN_MOVES.light, heavy: ROBIN_MOVES.heavy, crouchLight: ROBIN_MOVES.rLow, upAttack: ROBIN_MOVES.up,
    airAttack: ROBIN_MOVES.air, downAir: ROBIN_MOVES.air,   // no spike exists: air Light / Heavy = Midair Kick (robin.js)
    grab: { damage: dmg(28), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 9, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: "Bird's-Eye Bomb (ground / air)", cost: COST.bomb }, down: { name: 'Smoke Drop', cost: COST.smoke },
    forward: { name: 'Staff Express', cost: COST.express }, up: { name: 'Rooftop Route', cost: COST.roof },
    back: { name: 'Dead Drop', cost: COST.plant } },
  ultimate: { name: 'CHECKMATE: LIGHTS OUT', cost: COST.ult,
    description: '14 f staff opener (raw 30). Clean hit: portrait cut-in → smoke reposition → staff flurry 22 ×3 → rising staff 34 → wrist-computer command → bomb blast 130 (260 raw before shared scaling) → landing. Whiff / block: 40 f recovery.' },
  animationData: Object.fromEntries(Object.entries(ROBIN_ANIM).map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
