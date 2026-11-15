// Megumi Fushiguro (megumi_fushiguro) — DATA ONLY: frame data, summon / Shadow Route / Elephant / Shadow Step constants,
// the ultimate schedule and the roster entry. Logic: megumiState.js (sim), megumi.js (command layer), megumiFx.js (render).
// Art: the supplied JUS-style sheet (xxniiroxx), extracted by tools/megumi/extract.py; rationale docs/megumi/SPRITE_MAP.md,
// frame data docs/megumi/MOVESET.md. Megumi is a tactical summoner: the player always controls Megumi; each shikigami
// performs ONE brief automatic action and leaves. No playable animal forms, no pet-control interface, no homing.
import { MEGUMI_ANIM } from './megumiSprites.js'

// Roster-parity authoring lever shared with Robin / Cyborg / Raven / the Rangers: stored = round(raw × 1.95), then the
// global ×0.6 write scale applies (measured hit = round(stored × 0.6)).
export const MEGUMI_DAMAGE_SCALE = 1.95
export const dmg = raw => Math.round(raw * MEGUMI_DAMAGE_SCALE)
export const MEGUMI_SCALE = 3   // integer nearest-neighbour presentation scale (43 px sheet body → 129 px)

export const COST = { dog: 12, toad: 14, nue: 16, rabbit: 10, serpent: 18, elephant: 30, ult: 100 }

// ── SUMMONS (one primary action each; one offensive summon per Megumi) ── sim px / frames
// Divine Dog: captures its direction at release, runs straight, one hit, dissolves on contact / range / lifetime.
export const DOG = { vx: 10, range: 340, life: 44, w: 96, h: 50, raw: 34, hitstun: 22, kbx: 9, kby: -3, fade: 10 }
// Toad: telegraphed tongue lane in front of the Toad (moderate range). Clean hit → brief pull toward Megumi (once per
// Toad instance; a target pulled within the last PULL.lockout frames is never pulled again → no capture loop).
export const TOAD = { ahead: 56, warn: 12, lash: 6, life: 40, laneX0: 10, laneX1: 150, laneY: 34, laneH: 40, raw: 30, hitstun: 26, kbx: 1, kby: -2 }
export const PULL = { frames: 8, stopGap: 58, lockout: 120 }
// Nue (ground Up+Special): bounded route from behind-above Megumi to a fixed point ahead / above, ONE lightning burst
// there (anti-air), then it climbs away. The point never moves after release (no tracking, nothing off-screen).
export const NUE = { enter: 14, hover: 6, burstAt: 20, active: 4, life: 44, ax: 70, ay: -150, r: 46, raw: 36, hitstun: 30, kbx: 4, kby: -9 }
// Air Nue (air Special, any direction): the sheet's lightning dive — a fixed forward-down pass, one hit.
export const AIRNUE = { burstAt: 16, active: 5, life: 46, ax: 96, ay: 10, r: 42, raw: 32, hitstun: 26, kbx: 6, kby: -6 }
// Rabbit Escape: NO damage. Six rabbits (the sheet's "X6") cover Megumi for `life` frames; inside `window` frames a
// FRESH horizontal press performs one ordinary physical hop of `hop` px (stage-clamped, never through the opponent).
// No invulnerability, no opponent lock, no jump reset.
export const RABBIT = { count: 6, life: 54, window: 40, hop: 120, hopFrames: 10, cap: 6 }
// Great Serpent: the emergence point is captured ONCE at release (the opponent's x, capped to `range` ahead of Megumi,
// stage-clamped); a visible warning plays, then one rising strike. Nothing tracks after release.
export const SERPENT = { range: 260, minAhead: 40, warn: 20, rise: 6, active: 4, life: 52, w: 54, h: 170, raw: 42, hitstun: 34, kbx: 1, kby: -19 }
// Max Elephant (Down+Heavy): committed. Visible placement silhouette, then a FIXED water lane (no permanent collision):
// three scheduled contacts, pushback capped, total budget 3 × 22 = 66 raw. Stage-clamped lane; no entity flood.
export const ELEPHANT = { release: 26, warn: 18, life: 120, behind: 24, laneX0: 120, laneLen: 300, laneY: 40, laneH: 44,
  contacts: [40, 56, 72], raw: 22, hitstun: 22, kbx: 4, kby: -2, pushCap: 90 }
// Shadow Step (L2 + horizontal): physical travel through Megumi's shadow; capped, stage-clamped, never through walls or
// the opponent's body, no invulnerability, no behind-tracking, no jump reset, 70 f cooldown.
export const STEP = { speed: 11, frames: 10, startup: 6, cooldown: 70, trail: 4 }
// SHADOW ROUTES: two stocks. Progress = DISTINCT clean families (normal / dog / toad / nue / serpent / elephant); each
// family counts once per set; two distinct families = one stock. Misses, blocked hits and repeat contacts of one attack
// instance never count. A stock lets ONE summon→summon transition per combo: a FRESH directional Special inside the
// confirm window after a summon's clean hit starts the next summon (normal cost, normal startup).
export const ROUTE = { maxStocks: 2, perStock: 2, confirm: 22 }

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 52, rangeY: 44, boxY: 18, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES ── startup = frames before the first active frame (60 sim ticks / s). Boxes: rangeX from the body front;
// boxY / rangeY from the physics-box top. `hits` = explicit schedule [[from, to, id]] (elapsed frames); each window
// connects at most once — animation loops never create hits. Summon gestures are body-less (`noBody`).
export const MEGUMI_MOVES = {
  light: n(16, 5, 2, 10, { rangeX: 50, knockbackX: 2 }),                                                       // jab → gold-arc hook
  mL2: n(20, 6, 2, 12, { hitstun: 18, blockstun: 10, rangeX: 56, knockbackX: 3, travel: [2, 8, 3] }),             // stepping kick
  mL3: n(16, 9, 8, 17, { hitstun: 20, blockstun: 11, rangeX: 70, rangeY: 50, boxY: 14, knockbackX: 4,
    hits: [[9, 10, 'a'], [15, 16, 'b']], hitRaw: { a: 16, b: 22 }, kb: { a: [2, -2], b: [7, -5] } }),          // staff: two pale-blue slashes
  mLow: n(22, 8, 2, 14, { hitLevel: 'low', hitstun: 19, blockstun: 10, rangeX: 64, rangeY: 26, boxY: 66 }),        // low staff check
  heavy: n(46, 12, 4, 20, { category: 'heavy', weapon: true, hitstun: 26, blockstun: 13, rangeX: 96, rangeY: 44, boxY: 24, knockbackX: 7 }),   // sword arc
  mAdv: n(20, 13, 6, 23, { category: 'heavy', weapon: true, hitstun: 22, blockstun: 12, rangeX: 88, rangeY: 46, boxY: 20, knockbackX: 3,
    travel: [3, 16, 4], hits: [[13, 14, 'a'], [18, 19, 'b']], hitRaw: { a: 20, b: 30 }, kb: { a: [2, -2], b: [9, -4] } }),   // advancing sword
  up: n(30, 7, 3, 14, { category: 'launcher', launcher: true, hitstun: 26, blockstun: 11, rangeX: 40, rangeY: 96, boxY: -36, launchVy: -17 }),   // uppercut
  mLaunch: n(40, 12, 4, 20, { category: 'launcher', launcher: true, weapon: true, hitstun: 32, blockstun: 13, rangeX: 64, rangeY: 110, boxY: -46, launchVy: -21 }),   // rising staff arc
  air: n(24, 6, 4, 12, { hitstun: 20, rangeX: 54, rangeY: 50, boxY: 26, knockbackX: 3, knockbackY: -3 }),             // air palm
  mAirEnd: n(34, 14, 4, 18, { category: 'heavy', air: true, hitstun: 26, blockstun: 12, rangeX: 96, rangeY: 70, boxY: 40, knockbackX: 4, knockbackY: 7 }),   // winged Toad lash (aerial ender, once per airtime)
  // ── summon gestures (no body box; the shikigami acts) ──
  mDog: n(0, 10, 1, 15, { category: 'special', isSpecial: true, noBody: true, cost: COST.dog, releaseAt: 10, summon: 'dog' }),
  mToad: n(0, 9, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: COST.toad, releaseAt: 9, summon: 'toad' }),
  mNue: n(0, 10, 1, 19, { category: 'special', isSpecial: true, noBody: true, cost: COST.nue, releaseAt: 10, summon: 'nue' }),
  mAirNue: n(0, 8, 1, 15, { category: 'special', isSpecial: true, noBody: true, air: true, cost: COST.nue, releaseAt: 8, summon: 'airNue' }),
  mRabbit: n(0, 8, 1, 11, { category: 'special', isSpecial: true, noBody: true, cost: COST.rabbit, releaseAt: 8, summon: 'rabbit' }),
  mSerpent: n(0, 12, 1, 31, { category: 'special', isSpecial: true, noBody: true, cost: COST.serpent, releaseAt: 12, summon: 'serpent' }),
  mElephant: n(0, 26, 1, 43, { category: 'special', isSpecial: true, noBody: true, cost: COST.elephant, releaseAt: 26, summon: 'elephant' }),
  mStep: n(0, STEP.startup, 1, STEP.frames + 9, { category: 'movement', noBody: true, step: true }),
  mHop: n(0, 1, 1, RABBIT.hopFrames + 4, { category: 'movement', noBody: true, hop: true }),
  // ULTIMATE OPENER — hand sign, then Divine Dog: Totality lunges (the summon's lunge carries the only opener hit).
  ultOpen: n(30, 18, 1, 44, { category: 'ultimate', isUltimate: true, noBody: true, cost: COST.ult, releaseAt: 18, summon: 'kon' }),
}
// Totality's lunge (the ultimate opener hit; summon-owned). MISS branch completes on whiff / block (real recovery).
export const KON = { vx: 12, run: 22, active: [4, 18], w: 140, h: 80, raw: 30, life: 46 }
export const CHAIN = { light: 'mL2', mL2: 'mL3' }                              // fresh Light retaps after a clean hit
export const HEAVY_FROM = ['light', 'mL2', 'mLow']                             // clean → fresh Heavy / Fwd+Heavy / Up+Heavy
export const SPECIAL_FROM = ['light', 'mL2', 'mL3', 'mLow', 'heavy', 'mAdv', 'up']   // clean contact cancels into a summon
export const ULT_FROM = ['heavy', 'mL3', 'mAdv']
export const NORMAL_KEYS = ['light', 'mL2', 'mL3', 'mLow', 'heavy', 'mAdv', 'up', 'mLaunch', 'air', 'mAirEnd']
export const SUMMON_KIND = { mDog: 'dog', mToad: 'toad', mNue: 'nue', mAirNue: 'airNue', mSerpent: 'serpent', mElephant: 'elephant' }
// family per hit source (Shadow Route progress)
export const FAMILY = { dog: 'dog', toad: 'toad', nue: 'nue', airNue: 'nue', serpent: 'serpent', elephant: 'elephant' }

// ── ULTIMATE: CHIMERA SHADOW GARDEN (frames from the opener's confirm; frozen-cinematic contract) ──
//   0–29    domain hand sign (supplied special-2 sign) + cut-in
//  30–74    supplied shadow-spreading sequence (domain frames 0–9)
//  75–112   Divine Dog: Totality HIT branch at the target — claw contacts @82 / @94 / @106 (raw 20 each)
// 104–128   Nue's lightning burst over the target — contact @116 (raw 30)
// 130–164   Max Elephant's water from the shadow — contacts @140 / @152 (raw 25 each)
// 166–189   final shadow strike: Totality's supplied shadow silhouette lunges through — contact @174 (raw 90)
// 190–229   supplied domain recession (domain frames 10–14) → Megumi's stance
// Opener 30 + 60 + 30 + 50 + 90 = 260 raw before shared scaling (= Robin / Rangers). One resource transaction (100 at the opener).
export const ULT = { total: 230, cutIn: 30, settle: 190,
  contacts: [{ at: 82, raw: 20, kind: 'kon' }, { at: 94, raw: 20, kind: 'kon' }, { at: 106, raw: 20, kind: 'kon' },
    { at: 116, raw: 30, kind: 'nue' }, { at: 140, raw: 25, kind: 'water' }, { at: 152, raw: 25, kind: 'water' }, { at: 174, raw: 90, kind: 'shadow' }],
  beats: [{ from: 0, pose: 'ultSign' }, { from: 30, pose: 'ultDomain' }, { from: 190, pose: 'ultRecede' }] }

// ── Frame timelines (elapsed tick → strip frame) — docs/megumi/MOVESET.md ──
const loop = (from, to, step, idx) => { const o = []; for (let t = from, i = 0; t < to; t += step, i++) o.push([t, idx[i % idx.length]]); return o }
const even = (n, total) => Array.from({ length: n }, (_, i) => [Math.round(i * total / n), i])
export const TIMELINE = {
  light: [[0, 0], [1, 1], [3, 2], [4, 3], [5, 4], [7, 5], [9, 6], [12, 7], [15, 8]],
  mL2: [[0, 0], [3, 1], [6, 2], [8, 3], [12, 4], [16, 5]],
  mL3: [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4], [9, 5], [12, 6], [15, 7], [18, 8], [21, 9], [25, 10], [28, 11], [31, 12]],
  mLow: [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4], [10, 5], [13, 6], [16, 7], [19, 8], [21, 9], [23, 10]],
  heavy: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [14, 5], [17, 6], [20, 7], [24, 8], [27, 9], [30, 10], [32, 11], [34, 12]],
  mAdv: [[0, 0], [3, 1], [6, 2], [10, 3], [13, 4], [15, 5], [18, 6], [22, 7], [27, 8], [32, 9], [37, 10]],
  up: [[0, 0], [3, 1], [7, 2], [9, 3], [14, 4], [19, 5]],
  mLaunch: [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4], [10, 5], [12, 6], [13, 7], [17, 8], [21, 9], [25, 10], [30, 11]],
  air: [[0, 0], [3, 1], [6, 2], [8, 3], [12, 4], [16, 5]],
  mAirEnd: [[0, 0], [3, 1], [6, 2], [10, 3], [14, 4], [24, 5]],
  mDog: [[0, 0], [3, 1], [6, 2], [10, 3], [16, 4], [21, 5]],
  mToad: [[0, 0], [3, 1], [6, 2], [9, 3], [17, 4], [23, 5]],
  mNue: [[0, 0], [3, 1], [6, 2], [10, 3], [18, 4], [24, 5]],
  mAirNue: [[0, 0], [3, 1], [6, 2], [8, 3], [14, 4], [19, 5]],
  mRabbit: [[0, 0], [3, 1], [5, 2], [8, 3], [12, 4], [16, 5]],
  mSerpent: [[0, 0], [3, 1], [6, 2], [12, 3], [26, 4], [36, 5]],
  mElephant: [[0, 0], [2, 1], [4, 2], [6, 3], [9, 4], [12, 5], [15, 6], [18, 7], [22, 8], [26, 9], [36, 10], [46, 11], [54, 12], [60, 13], [65, 14]],
  mStep: [[0, 0], [3, 1], [6, 2], [STEP.startup + STEP.frames, 3], [STEP.startup + STEP.frames + 3, 4], [STEP.startup + STEP.frames + 6, 5]],
  mHop: [[0, 0], [3, 1], [6, 2], [9, 3]],
  ultOpen: [[0, 0], [2, 1], [4, 2], [6, 3], [9, 4], [12, 5], [15, 6], [18, 7], [24, 8], [30, 9], [36, 10], [44, 11], [52, 12], [58, 13]],
  ultSign: even(9, 30), ultDomain: even(10, 45),
}
// Mahoraga presentation intro: Megumi's supplied Makora sign (9 cells) then held while the supplied Mahoraga sequence
// plays at MAHORAGA_INTRO.at… — non-combat showcase (docs/megumi/MOVESET.md §Mahoraga).
export const MAHORAGA_INTRO = { signFrames: 9, speed: 6, startAt: 54, step: 5, frames: 29, ahead: 150 }

export const megumi_fushiguro = {
  rosterKey: 'megumi_fushiguro', name: 'Megumi Fushiguro', displayName: 'Megumi Fushiguro', universe: 'jujutsu_kaisen',
  color: '#3a4a8c', series: 'Jujutsu Kaisen', era: 'Ten Shadows — supplied JUS-style sheet (xxniiroxx)',
  tagline: 'With this treasure, I summon…', introTitle: 'MEGUMI FUSHIGURO — TEN SHADOWS', archetype: 'Tactical Summoner / Close-range',
  bio: 'Tokyo Jujutsu High first-year and heir to the Zen\'in Ten Shadows Technique: he summons shikigami from his own shadow — the Divine Dogs, Nue, Toad, Great Serpent, Rabbit Escape and Max Elephant — and stores weapons in it. Shadow Routes, Shadow Step and the single-action summons are fighting-game adaptations; Mahoraga appears only as a non-combat intro showcase.',
  primary: 'zoner', secondary: ['all-rounder', 'trickster'], archetypes: ['zoner', 'all-rounder', 'trickster'],
  traits: { hasEnergy: true, energyType: 'cursed', energyName: 'Cursed Energy', mobility: 'medium', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Cursed Energy', color: '#6a7cff' },
  // speed 92 (below the 98 teleport tier → an ordinary double-tap dash). maxJumps 2 = the SHARED double jump.
  stats: { maxHealth: 1000, maxEnergy: 100, attack: 80, defense: 74, speed: 92, jumpPower: 25, maxJumps: 2, weight: 1,
    dashSpeed: 19, dashDuration: 10, dashCooldownMax: 26 },
  hasSprites: true, spriteScale: MEGUMI_SCALE, spriteSheet: MEGUMI_ANIM.idle.sheet, portrait: './assets/megumi_fushiguro/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequencePool: [['intro', 'introSettle'], ['introMahoraga', 'introSettle']],
  basic_attacks: { light: MEGUMI_MOVES.light, heavy: MEGUMI_MOVES.heavy, crouchLight: MEGUMI_MOVES.mLow, upAttack: MEGUMI_MOVES.up,
    airAttack: MEGUMI_MOVES.air, downAir: MEGUMI_MOVES.air,
    grab: { damage: dmg(28), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 9, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Divine Dog', cost: COST.dog }, forward: { name: 'Toad', cost: COST.toad }, up: { name: 'Nue', cost: COST.nue },
    down: { name: 'Rabbit Escape', cost: COST.rabbit }, back: { name: 'Great Serpent', cost: COST.serpent } },
  ultimate: { name: 'CHIMERA SHADOW GARDEN', cost: COST.ult,
    description: 'Hand sign → Divine Dog: Totality lunges (raw 30). Clean hit: domain spreads → Totality claws 20 ×3 → Nue 30 → Max Elephant water 25 ×2 → shadow strike 90 (260 raw before shared scaling). Whiff / block: the MISS branch plays out, real recovery.' },
  animationData: { ...Object.fromEntries(Object.entries(MEGUMI_ANIM).map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
    // domain recession = the last five supplied domain cells of the same strip
    ultRecede: { ...MEGUMI_ANIM.ultDomain, frameTimeline: [[0, 10], [8, 11], [16, 12], [24, 13], [32, 14]] } },
}
