// Hiromi Higuruma (higuruma, Jujutsu Kaisen — supplied sheet "Sprite Sheet By Mugen Matias"). DATA ONLY: frame data,
// weapon geometry, Case File / Precedent constants, the Deadly Sentencing schedule and the roster entry.
// Logic: higurumaState.js (sim), higuruma.js (command layer), higurumaFx.js (render). Frame-by-frame rationale and the
// coverage ledger: docs/higuruma/SPRITE_MAP.md and docs/higuruma/MOVESET.md.
// Technical midrange fighter: quick small-gavel normals, long reach through the extended handle, slow punishable
// giant-gavel commitments. No teleport, no invulnerable dash, no homing, no instant death.
import { HIGURUMA_ANIM, HIGURUMA_CELL } from './higurumaSprites.js'

// Authoring lever shared with the recent hand-built fighters (Robin / Cyborg / Raven): stored = round(raw × 1.95).
export const HIGURUMA_DAMAGE_SCALE = 1.95
export const dmg = raw => Math.round(raw * HIGURUMA_DAMAGE_SCALE)
export const SCALE = 2.3                       // sprite scale (cell px → world px)
export const CELL = HIGURUMA_CELL

export const COST = { ext: 12, cross: 16, rise: 16, order: 20, objection: 15, ult: 100 }

// ── CASE FILE (original fighting-game mechanic; NOT a legal accusation) ──
// Three evidence categories, each earned once per case by a CLEAN confirmed hit of that weapon scale on an opposing
// fighter. Completing all three grants ONE Precedent token (max one stored; collection pauses while it is held).
// Precedent: during the LATE recovery of a clean, confirmed gavel attack, a FRESH ordinary double-tap dash cancels the
// remaining recovery into the existing engine dash. No invulnerability, damage or free attack; one per combo.
export const CASE = { categories: ['close', 'reach', 'weight'], labels: { close: 'CLOSE', reach: 'REACH', weight: 'WEIGHT' },
  lateFrac: 0.35,          // the cancel window opens after 35 % of the recovery has elapsed and lasts to the end
  maxTokens: 1 }

// ── OBJECTION (Back + Special): narrow frontal counter read ──
export const OBJECTION = { windowFrom: 3, windowTo: 18, total: 40 }

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery (60 sim ticks / s).
// `box` = [front0, front1, top, bottom] in SHEET px relative to the head-centre / feet anchor (forward +, up −); the
// world box = box × SCALE from the body centre. It is derived from the drawn weapon of the active cell (measured in
// docs/higuruma/MOVESET.md) and is SEPARATE from the body hurtbox (the shared 48 × 94 physics box never changes size).
// `scale` = the Case File category the move proves on a clean hit.
// `hits` = explicit multi-hit schedule [[from, to, id], …] in elapsed frames: each window connects at most once.
const n = (raw, startup, active, recovery, box, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, box, rangeX: Math.max(4, Math.round(box[1] * SCALE - 24)), rangeY: Math.round((box[3] - box[2]) * SCALE),
  knockbackX: 3, knockbackY: -2, ...extra })

export const HIGURUMA_MOVES = {
  // ── SMALL GAVEL (CLOSE) ──
  light: n(16, 6, 2, 10, [4, 26, -40, -14], { scale: 'close', hitstun: 16, blockstun: 9 }),                                      // chop
  hJ2: n(20, 6, 2, 12, [6, 30, -38, -22], { scale: 'close', hitstun: 18, blockstun: 10, knockbackX: 3, travel: [1, 6, 2] }),     // straight jab
  hJ3: n(28, 8, 3, 18, [4, 52, -24, -1], { scale: 'close', hitstun: 24, blockstun: 12, knockbackX: 7, knockbackY: -6 }),         // spinning finisher
  hLow: n(20, 8, 3, 14, [0, 20, -26, -4], { scale: 'close', hitLevel: 'low', hitstun: 18, blockstun: 10, knockbackX: 2 }),      // low gavel check
  // ── EXTENDED GAVEL (REACH) ──
  hPoke: n(34, 12, 3, 22, [10, 86, -42, -26], { scale: 'reach', category: 'heavy', hitstun: 22, blockstun: 12, knockbackX: 6 }),   // tethered lash poke
  up: n(32, 12, 4, 24, [-8, 18, -66, -28], { scale: 'reach', category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, launchVy: -21, selfVy: 0 }),
  air: n(24, 7, 5, 14, [-10, 16, -66, -34], { scale: 'reach', hitstun: 22, knockbackX: 3, knockbackY: -4 }),                  // rising air swing
  // ── GIANT GAVEL (WEIGHT) ──
  heavy: n(58, 22, 4, 30, [8, 46, -74, -2], { scale: 'weight', category: 'heavy', hitstun: 30, blockstun: 16, knockbackX: 9, knockbackY: -5 }),
  hSweep: n(50, 18, 4, 28, [6, 48, -34, 0], { scale: 'weight', category: 'heavy', hitLevel: 'low', hitstun: 30, blockstun: 15, knockbackX: 6, knockbackY: -9 }),
  // ── SPECIALS ──
  hExt: n(36, 13, 3, 24, [10, 108, -42, -28], { scale: 'reach', category: 'special', isSpecial: true, cost: COST.ext, hitstun: 24, blockstun: 12, knockbackX: 7 }),
  hCross: n(0, 12, 17, 18, [4, 30, -40, -14], { scale: 'close', category: 'special', isSpecial: true, cost: COST.cross, hitstun: 20, blockstun: 9,
    travel: [2, 12, 8], hits: [[12, 13, 'c1'], [19, 20, 'c2'], [26, 28, 'c3']], hitRaw: { c1: 12, c2: 12, c3: 22 }, finalKb: [8, -4] }),
  hRise: n(34, 9, 7, 20, [-10, 18, -66, -16], { scale: 'reach', category: 'special', isSpecial: true, cost: COST.rise, hitstun: 26, blockstun: 12,
    knockbackX: 2, knockbackY: -10, rise: { at: 8, vy: -14, vx: 2 } }),
  hOrder: n(64, 24, 3, 32, [6, 52, -50, 2], { scale: 'weight', category: 'special', isSpecial: true, cost: COST.order, hitstun: 32, blockstun: 18,
    knockbackX: 6, knockbackY: -8 }),
  hObj: n(0, OBJECTION.windowFrom, OBJECTION.windowTo - OBJECTION.windowFrom + 1, OBJECTION.total - OBJECTION.windowTo - 1, [0, 0, 0, 0],
    { category: 'special', isSpecial: true, cost: COST.objection, noBody: true, counter: true }),
  hObjHit: n(30, 4, 2, 16, [6, 30, -38, -22], { scale: 'close', category: 'special', hitstun: 26, blockstun: 12, knockbackX: 8, knockbackY: -4 }),
  // ── ULTIMATE OPENER (capture) — committed, blockable midrange extension. Clean hit → the cinematic; whiff/block → recovery.
  ultOpen: n(30, 16, 3, 40, [10, 108, -42, -28], { category: 'ultimate', isUltimate: true, cost: COST.ult, hitstun: 40, blockstun: 16, knockbackX: 1 }),
}
export const CHAIN = { light: 'hJ2', hJ2: 'hJ3' }                     // fresh Light retaps after a clean hit
export const HEAVY_FROM = ['light', 'hJ2', 'hLow']                     // clean small-gavel hit → fresh Heavy family
export const SPECIAL_FROM = ['light', 'hJ2', 'hJ3', 'hLow', 'hPoke', 'up', 'heavy', 'hSweep']   // clean contact → special cancel
export const ULT_FROM = ['hJ3', 'hPoke', 'heavy']
// Gavel attacks whose clean confirmed hit can spend Precedent (late-recovery → ordinary dash).
export const PRECEDENT_FROM = ['light', 'hJ2', 'hJ3', 'hLow', 'hPoke', 'up', 'heavy', 'hSweep', 'hExt', 'hCross', 'hOrder', 'hObjHit']

// ── ULTIMATE: DOMAIN EXPANSION — DEADLY SENTENCING (frames from confirm; the frozen-cinematic contract) ──
//   0– 39 COURT CONVENES  stage dims under the fighters, courtroom framing, title card, portrait cut-in (turn + gavel)
//  40– 99 CASE REVIEW     Higuruma presents the evidence; panel lists the Case File marks HE earned this match
// 100–129 CONFISCATION    gavel flash / vanish; "CONFISCATION" over the defendant (presentation only — nothing is removed)
// 130–169 VERDICT         giant gavel raised and brought down: contact @150 raw 70; "VERDICT: GUILTY" (fixed finisher text)
// 170–229 EXECUTIONER'S SWORD manifest → raise → thrust → lunge: contact @208 raw 170
// 230–259 exit settle; stage restored
// Opener 30 + 70 + 170 = 270 raw before shared scaling. One resource transaction (100 at the opener). Text, flashes
// and the dim are presentation: only the two scheduled contacts deal damage.
export const ULT = { total: 260, cutIn: 40,
  contacts: [{ at: 150, raw: 70, kind: 'verdict' }, { at: 208, raw: 170, kind: 'sword' }],
  beats: [{ from: 0, pose: 'intro', text: 'convene' }, { from: 40, pose: 'ultCase', text: 'case' }, { from: 100, pose: 'ultConfiscate', text: 'confiscation' },
    { from: 130, pose: 'ultVerdict', text: 'verdict' }, { from: 170, pose: 'ultSword', text: 'sword' }, { from: 230, pose: 'ultSettle', text: null }] }

// ── Frame timelines (elapsed tick → strip frame) — see docs/higuruma/MOVESET.md ──
export const TIMELINE = {
  light: [[0, 0], [5, 1], [8, 2], [12, 3]],
  hJ2: [[0, 2], [2, 0], [8, 1], [14, 2]],
  hJ3: [[0, 0], [6, 1], [8, 2], [10, 3], [13, 4], [22, 5]],
  hLow: [[0, 0], [4, 1], [8, 2], [11, 3], [18, 4]],
  hPoke: [[0, 0], [6, 1], [12, 2], [20, 3], [30, 4]],
  up: [[0, 0], [6, 1], [12, 2], [18, 3], [26, 4], [34, 5]],
  air: [[0, 0], [7, 1]],
  heavy: [[0, 0], [11, 1], [22, 2], [28, 3]],
  hSweep: [[0, 0], [9, 1], [18, 2]],
  hExt: [[0, 0], [7, 1], [13, 2], [26, 3]],
  hCross: [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4], [10, 5], [12, 6], [19, 7], [26, 8], [36, 9]],
  hRise: [[0, 0], [3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [16, 6], [30, 7]],
  hOrder: [[0, 0], [10, 1], [24, 2], [40, 3]],
  hObj: [[0, 0]], hObjHit: [[0, 0], [4, 1], [12, 2]],
  ultOpen: [[0, 0], [8, 1], [16, 2], [24, 3], [44, 4]],
  intro: [[0, 0], [9, 1], [18, 2], [27, 3]], ultCase: [[0, 0], [4, 1], [8, 2], [12, 3], [16, 4], [22, 5], [30, 6], [38, 7], [46, 8], [54, 9]],
  ultConfiscate: [[0, 0], [6, 1], [12, 2], [20, 3]], ultVerdict: [[0, 0], [20, 1]],
  ultSword: [[0, 0], [10, 1], [30, 2], [38, 3]], ultSettle: [[0, 0], [8, 1], [16, 2]],
}

export const higuruma = {
  rosterKey: 'higuruma', name: 'Hiromi Higuruma', displayName: 'Higuruma', universe: 'jujutsu_kaisen',
  color: '#c9a64a', series: 'Jujutsu Kaisen', era: 'Culling Game arc / supplied sheet by Mugen Matias',
  tagline: 'The court is in session.', introTitle: 'HIROMI HIGURUMA — THE COURT IS IN SESSION', archetype: 'Technical Midrange / Weapon Scaler',
  bio: 'A former defense attorney who awakened his cursed technique in the Culling Game. His gavel changes size and reach at will, and his Domain Expansion, Deadly Sentencing, puts the target on trial before his shikigami Judgeman. Case File, Precedent and this finisher\'s fixed verdict are fighting-game adaptations.',
  primary: 'zoner', secondary: ['all-rounder', 'tactician'], archetypes: ['zoner', 'all-rounder', 'tactician'],
  traits: { hasEnergy: true, energyType: 'cursed', energyName: 'Cursed Energy', mobility: 'medium', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Cursed Energy', color: '#c9a64a' },
  // speed 92: below the shared speed-tier teleport threshold (98), so a double-tap is ALWAYS the ordinary dash (the
  // one Precedent cancels into). maxJumps 2 = the SHARED double jump; nothing in his kit refunds a jump.
  stats: { maxHealth: 1080, maxEnergy: 100, attack: 84, defense: 78, speed: 92, jumpPower: 25, maxJumps: 2, weight: 1,
    dashSpeed: 20, dashDuration: 10, dashCooldownMax: 26 },
  hasSprites: true, spriteScale: SCALE, spriteSheet: HIGURUMA_ANIM.idle.sheet, portrait: './assets/higuruma/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro', 'introSettle'],
  basic_attacks: { light: HIGURUMA_MOVES.light, heavy: HIGURUMA_MOVES.heavy, crouchLight: HIGURUMA_MOVES.hLow, upAttack: HIGURUMA_MOVES.up,
    airAttack: HIGURUMA_MOVES.air, downAir: HIGURUMA_MOVES.air,
    grab: { damage: dmg(28), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 9, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Extension of the Court', cost: COST.ext }, forward: { name: 'Cross-Examination', cost: COST.cross },
    up: { name: 'Rising Objection', cost: COST.rise }, down: { name: 'Order in the Court', cost: COST.order }, back: { name: 'Objection', cost: COST.objection } },
  ultimate: { name: 'DOMAIN EXPANSION — DEADLY SENTENCING', cost: COST.ult,
    description: '16 f extended-gavel opener (raw 30). Clean hit: the court convenes → CASE REVIEW → CONFISCATION (presentation) → VERDICT giant gavel 70 → Executioner\'s Sword 170 (270 raw before shared scaling). Whiff / block: 40 f recovery.' },
  animationData: Object.fromEntries(Object.entries(HIGURUMA_ANIM).map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
