// Beast Boy (Garfield "Gar" Logan, Teen Titans — supplied Game Boy Advance art). DATA ONLY: frame data, the transient
// animal-form contract, Wild Chain / Instinct constants, the ultimate schedule and the roster entry. Logic:
// beastBoyState.js (sim), beastBoy.js (command layer), beastBoyFx.js (render-only). Frame-by-frame rationale:
// docs/beast_boy/MOVE_FRAME_MAP.md. Canon reference: https://www.dc.com/characters/beast-boy (shapeshifts into animals).
// Every animal form here is a SHORT ATTACK ACTION: transform → one hit opportunity → recover → humanoid. There is no
// controllable animal mode, no per-form HP, no selector and no free flight.
import { BEAST_BOY_ANIM } from './beastBoySprites.js'

// Authoring lever shared with the recent hand-built fighters (Rangers / Cyborg): stored = round(raw × 1.7).
export const BEAST_BOY_DAMAGE_SCALE = 1.95
export const dmg = raw => Math.round(raw * BEAST_BOY_DAMAGE_SCALE)

// The four animals and their Wild Chain successor (Gorilla → Bird → Tiger → Triceratops → Gorilla).
export const ANIMALS = ['gorilla', 'bird', 'tiger', 'tricera']
export const ANIMAL_OF = { gorilla: 'gorilla', bird: 'bird', tiger: 'tiger', tigerA: 'tiger', tricera: 'tricera' }
export const NEXT_ANIMAL = { gorilla: 'bird', bird: 'tiger', tiger: 'tricera', tricera: 'gorilla' }
export const ANIMAL_DIR = { gorilla: 'neutral', tricera: 'fwd', tiger: 'down', bird: 'up' }   // Special direction that calls it
export const COST = { gorilla: 15, tricera: 20, tiger: 18, bird: 12, feint: 8, ult: 100 }

export const WILD_CHAIN = { window: 10, maxLinks: 2 }                 // 10 f input window from the clean contact; ≤ 2 links
export const INSTINCT = { distinct: 3, cancelLast: 8 }                // 3 distinct animal hits → 1 token; last 8 f cancel
export const UP_GRACE = 3                                             // fresh grounded Up holds the jump 3 f (Up a hair before R1)
export const TRICERA = { speed: 6, maxTravel: 180, skid: 4 }          // px / f; 180 px OR 32 active frames, whichever first
export const BIRD = { vx: 5, vy0: -7, ay: 0.3, retVx: 2 }             // flight arc during active; return keeps a small drift
export const TIGER_AIR = { vx: 4, vyMin: 3, fallCap: 48 }             // air pounce: forward + downward, capped fall
export const FEINT = { speed: 5, frames: 11 }                         // 55 px authored (+ the press-tick walk step) ≤ 60 px backward

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 52, rangeY: 44, boxY: 18, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
// Humanoid boxes: rangeX from the body front, boxY / rangeY from the physics-box top (same contract as the roster).
// Animal boxes: `box` = [x from body front, width, top above the feet, height] — deliberate geometry, NOT the art bounds.
export const BEAST_BOY_MOVES = {
  light: n(17, 5, 2, 9, { hitstun: 16, blockstun: 9, rangeX: 50, knockbackX: 2 }),                                   // J1 Quick Jab
  bJ2: n(21, 7, 2, 12, { hitstun: 18, blockstun: 10, rangeX: 64, knockbackX: 3 }),                                   // J2 Long Straight
  bJ3: n(28, 10, 3, 18, { hitstun: 22, blockstun: 12, rangeX: 62, knockbackX: 7 }),                                  // J3 Turning Finish
  heavy: n(52, 14, 3, 22, { category: 'heavy', hitstun: 28, blockstun: 14, rangeX: 78, knockbackX: 5 }),             // Full Stretch
  bLow: n(24, 8, 2, 16, { hitLevel: 'low', hitstun: 20, blockstun: 11, rangeX: 60, rangeY: 28, boxY: 66 }),          // Low Ankle Check
  up: n(40, 12, 3, 22, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 50, rangeY: 104, boxY: -34, launchVy: -21, selfVy: 0 }),   // Launcher Rising Kick
  air: n(30, 8, 3, 14, { hitstun: 24, rangeX: 64, rangeY: 52, boxY: 26, knockbackX: 3, knockbackY: -3 }),           // Air Aerial Kick
  // Forward+Heavy command chain: advancing jab → fresh Heavy straight → fresh Heavy knock-away.
  bAdv: n(24, 11, 3, 17, { category: 'heavy', hitstun: 24, blockstun: 12, rangeX: 56, travel: [2, 11, 4] }),
  bStr: n(30, 12, 3, 19, { category: 'heavy', hitstun: 26, blockstun: 13, rangeX: 74 }),
  bKnock: n(40, 15, 3, 24, { category: 'heavy', hitstun: 28, blockstun: 14, rangeX: 78, knockbackX: 9, knockbackY: -4 }),
  // ── ANIMAL SPECIALS (transient form actions) ──
  // NEUTRAL — GORILLA BREAK: the full Gorilla Kick sequence, one extended kick contact, heavy whiff recovery.
  gorilla: n(58, 15, 4, 30, { category: 'special', isSpecial: true, animal: 'gorilla', cost: COST.gorilla, hitstun: 37, blockstun: 14,
    knockbackX: 8, knockbackY: -3, box: [-6, 98, 70, 46], returnAt: 45,
    forms: [[0, 'human'], [5, 'morph'], [9, 'gorilla'], [39, 'morph'], [45, 'human']] }),
  // FORWARD — TRICERATOPS DRIVE: morph → bounded charging loop → reverse morph. Active ends at 180 px / 32 f / contact.
  tricera: n(64, 20, 32, 26, { category: 'special', isSpecial: true, animal: 'tricera', cost: COST.tricera, hitstun: 30, blockstun: 16,
    knockbackX: 10, knockbackY: -4, box: [-4, 46, 58, 50], returnAt: 66, charge: true,
    forms: [[0, 'human'], [10, 'morph'], [15, 'tricera'], [61, 'morph'], [66, 'human']] }),
  // DOWN — TIGER CROSS (ground): the complete Tiger Slash sequence, bounded forward pounce, ONE slash contact.
  tiger: n(52, 13, 3, 34, { category: 'special', isSpecial: true, animal: 'tiger', cost: COST.tiger, hitstun: 28, blockstun: 13,
    knockbackX: 6, knockbackY: -3, box: [-10, 84, 62, 52], returnAt: 42, travel: [8, 20, 5],
    forms: [[0, 'human'], [4, 'morph'], [7, 'tiger'], [38, 'morph'], [42, 'human']] }),
  // air Down — TIGER CROSS (air): airborne cells of the same sequence; once per airtime; landing recovery = tigerLand.
  tigerA: n(52, 11, 4, 999, { category: 'special', isSpecial: true, animal: 'tiger', cost: COST.tiger, air: true, hitstun: 26, blockstun: 13,
    knockbackX: 5, knockbackY: -2, box: [-12, 78, 64, 60], forms: [[0, 'morph'], [4, 'tiger']] }),
  tigerLand: n(0, 1, 1, 22, { category: 'special', noBody: true, landing: true, returnAt: 16,
    forms: [[0, 'tiger'], [12, 'morph'], [16, 'human']] }),
  // UP — BIRD INTERCEPT: morph → short rising/forward flight arc (≤ 24 active f) → ONE contact → forced return.
  bird: n(28, 10, 24, 16, { category: 'special', isSpecial: true, animal: 'bird', cost: COST.bird, hitstun: 22, blockstun: 11,
    knockbackX: 3, knockbackY: -6, box: [-8, 46, 58, 50], returnAt: 42, flight: true,
    forms: [[0, 'human'], [6, 'morph'], [8, 'bird'], [38, 'morph'], [42, 'human']] }),
  // BACK — FALSE START: humanoid feint, no hitbox, ≤ 60 px backward, 14 f recovery, no invulnerability.
  feint: n(0, 6, 1, 14, { category: 'special', noBody: true, feint: true, cost: COST.feint }),
  // ULTIMATE OPENER — humanoid punch, raw 25. Clean hit → ANIMAL INSTINCT; miss / block → 60 f recovery.
  ultOpen: n(25, 28, 3, 60, { category: 'ultimate', isUltimate: true, cost: COST.ult, hitstun: 40, blockstun: 16, rangeX: 70, knockbackX: 1 }),
}
export const CHAIN = { light: 'bJ2', bJ2: 'bJ3' }
export const SPECIAL_FROM = ['light', 'bJ2', 'bJ3', 'heavy', 'bLow', 'bAdv', 'bStr', 'bKnock']   // clean contact, recovery only
export const HEAVY_FROM = ['light', 'bJ2', 'bLow']
export const ULT_FROM = ['heavy', 'bJ3', 'bStr', 'bKnock']
export const ANIMAL_KEYS = ['gorilla', 'tricera', 'tiger', 'tigerA', 'bird']

// Hurtboxes per form, relative to the physics-box centre (dx toward facing) and the feet (top above the feet).
// Deliberate: the bird never shrinks below 46×54 (no free invulnerability from a small sprite); the tiger and
// triceratops are long and low; the gorilla is broad. `null` = the engine's ordinary humanoid hurtbox.
export const HURTBOX = { human: null, morph: null,
  gorilla: { dx: 4, w: 64, top: 86, h: 86 }, tricera: { dx: 10, w: 96, top: 66, h: 66 },
  tiger: { dx: 12, w: 90, top: 64, h: 64 }, bird: { dx: 2, w: 46, top: 58, h: 54 } }

// ── ULTIMATE: ANIMAL INSTINCT — FOUR BEAST FINISH (frames from confirm; frozen-cinematic contract) ──
//   0–29  supplied cutscene bust + mouth cut-in (bounded 30 f), Gar in his ready pose
//  30–74  Gorilla Kick sequence, contact @45 raw 45
//  75–114 Bird morph → flight, contact @92 raw 30
// 115–164 Tiger Slash sequence, contact @128 raw 60
// 165–234 Triceratops morph → charge → reverse, contact @187 raw 100 (knockdown)
// 235–259 supplied confident ready pose (Appearing, last cell)
// Opener 25 + 45 + 30 + 60 + 100 = 260 raw before shared scaling. ONE resource transaction (100 at the opener).
export const ULT = { total: 260, cutIn: 30, settle: 235,
  contacts: [{ at: 45, raw: 45, kind: 'gorilla' }, { at: 92, raw: 30, kind: 'bird' }, { at: 128, raw: 60, kind: 'tiger' }, { at: 187, raw: 100, kind: 'tricera' }],
  beats: [{ from: 0, pose: 'ultPose' }, { from: 30, pose: 'ultGorilla' }, { from: 75, pose: 'ultBirdIn' }, { from: 85, pose: 'ultBird' },
    { from: 115, pose: 'ultTiger' }, { from: 165, pose: 'ultTri' }, { from: 235, pose: 'ultPose' }] }

// ── Frame timelines (elapsed tick → strip frame) — see MOVE_FRAME_MAP.md ──
const loop = (from, to, step, idx) => { const o = []; for (let t = from, i = 0; t < to; t += step, i++) o.push([t, idx[i % idx.length]]); return o }
const GORILLA_TL = [[0, 0], [2, 1], [5, 2], [9, 3], [12, 4], [15, 5], [17, 6], [19, 7], [24, 8], [29, 9], [34, 10], [39, 11], [45, 12]]
const TIGER_TL = [[0, 0], [2, 1], [4, 2], [7, 3], [10, 4], [13, 5], [16, 6], [19, 7], [22, 8], [26, 9], [30, 10], [34, 11], [38, 12], [42, 13], [46, 14]]
const TRI_TL = [[0, 0], [5, 1], [10, 2], [15, 3], ...loop(18, 52, 3, [4, 5, 6, 7, 8, 9, 10, 11]), [52, 11], [56, 12], [61, 13], [66, 14], [71, 15]]
const BIRD_TL = [[0, 0], [3, 1], [6, 2], [8, 3], ...loop(10, 34, 2, [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), [34, 15], [38, 16], [42, 17], [46, 18]]
export const TIMELINE = {
  light: [[0, 0], [5, 1], [10, 2]], bJ2: [[0, 0], [4, 1], [7, 2], [14, 3]],
  bJ3: [[0, 0], [4, 1], [10, 2], [13, 3], [18, 4], [25, 5]],
  heavy: [[0, 0], [3, 1], [7, 2], [11, 3], [14, 4], [17, 5], [22, 6], [28, 7], [34, 8]],
  bLow: [[0, 0], [4, 1], [8, 2], [16, 3]], up: [[0, 0], [9, 1], [12, 2], [26, 3]],
  air: [[0, 0], [3, 1], [6, 2], [8, 3], [11, 4], [16, 5], [21, 6]],
  bAdv: [[0, 0], [4, 1], [8, 2], [11, 3], [20, 4]], bStr: [[0, 0], [6, 1], [12, 2], [15, 3], [24, 4]],
  bKnock: [[0, 0], [6, 1], [15, 2], [18, 3], [24, 4], [31, 5], [37, 6]],
  gorilla: GORILLA_TL, tricera: TRI_TL, tiger: TIGER_TL, bird: BIRD_TL,
  tigerA: [[0, 0], [4, 1], [8, 2], [11, 3], [14, 4]], tigerLand: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [16, 5], [20, 6]],
  feint: [[0, 0], [4, 1], [8, 2], [14, 3]],
  ultOpen: [[0, 0], [8, 1], [20, 2], [28, 3], [31, 4], [60, 5]],
  ultPose: [[0, 0]], ultGorilla: GORILLA_TL, ultTiger: TIGER_TL, ultTri: TRI_TL,
  ultBirdIn: [[0, 0], [3, 1], [6, 2], [8, 3]], ultBird: loop(0, 40, 2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
}
// strip aliases: the move key → the strip file it plays (tigerA plays tigerAir)
const ANIM_ALIAS = { tigerA: 'tigerAir' }

export const beast_boy = {
  rosterKey: 'beast_boy', name: 'Beast Boy', displayName: 'Beast Boy', civilianIdentity: 'Garfield "Gar" Logan', universe: 'dc',
  color: '#3fd07a', series: 'Teen Titans', era: 'Teen Titans / supplied Game Boy Advance artwork',
  tagline: 'Different animal. Same attitude.', archetype: 'Shapeshift Rushdown / Adaptive Combo Routes',
  bio: 'Garfield "Gar" Logan shapeshifts into animals. Every animal is a single committed strike: transform, one hit, change back. Clean animal hits open a short Wild Chain into the next animal; landing three different animals in a round earns an Instinct token (a movement escape, never damage). Wild Chain and Instinct are game adaptations.',
  primary: 'rushdown', secondary: ['all-rounder'], archetypes: ['rushdown', 'all-rounder'],
  traits: { hasEnergy: true, energyType: 'morph', energyName: 'Morph Energy', mobility: 'normal', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Morph Energy', color: '#5be08a' },
  stats: { maxHealth: 1080, maxEnergy: 100, attack: 80, defense: 74, speed: 92, jumpPower: 25, maxJumps: 1,
    dashSpeed: 15, dashDuration: 10, dashCooldownMax: 32 },
  hasSprites: true, spriteScale: 2.2, spriteSheet: BEAST_BOY_ANIM.idle.sheet, portrait: './assets/beast_boy/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro', 'idle'],
  basic_attacks: { light: BEAST_BOY_MOVES.light, heavy: BEAST_BOY_MOVES.heavy, crouchLight: BEAST_BOY_MOVES.bLow, upAttack: BEAST_BOY_MOVES.up,
    airAttack: BEAST_BOY_MOVES.air, downAir: BEAST_BOY_MOVES.air,   // no spike exists: air Light / air Heavy = Aerial Kick (beastBoy.js)
    grab: { damage: dmg(28), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 9, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Gorilla Break', cost: COST.gorilla }, forward: { name: 'Triceratops Drive', cost: COST.tricera },
    down: { name: 'Tiger Cross (ground / air)', cost: COST.tiger }, up: { name: 'Bird Intercept', cost: COST.bird },
    back: { name: 'False Start', cost: COST.feint } },
  ultimate: { name: 'ANIMAL INSTINCT — FOUR BEAST FINISH', cost: COST.ult,
    description: '28 f humanoid punch opener (raw 25). Clean hit: cut-in → Gorilla Kick 45 → Bird 30 → Tiger Slash 60 → Triceratops charge 100 (260 raw before shared scaling). Miss / block: 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries({ ...BEAST_BOY_ANIM, ...Object.fromEntries(Object.entries(ANIM_ALIAS).map(([k, v]) => [k, BEAST_BOY_ANIM[v]])) })
    .map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
