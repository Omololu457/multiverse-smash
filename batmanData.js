// Batman (batman, DC — rebuilt on the supplied SNES "Batman Returns" sheet + the supplied drone / vehicle / robot sheets).
// DATA ONLY: frame data, damage budgets, fleet schedules, ultimate contract and the roster entry.
// Logic: batmanState.js (sim + fleet + ultimate), batman.js (command layer), batmanFx.js (render).
// Docs: docs/batman/{ASSET_MANIFEST,SPRITE_TO_MOVE_MAP,ARSENAL,DAMAGE_AUDIT,ULTIMATE_TIMELINE,CONTROLS,SKINS,VERIFICATION}.md
//
// DAMAGE UNITS. `raw` = the reference's authored characters.js units (Goku light 45 / heavy 85; Superman heavy 80; old
// Batman light 32). Stored move damage = raw (no private lever). The live melee path deals
// floor(raw × comboScale × offense × 0.60 / defenseMult); fleet payloads go through the same choke-point
// (W.damage = combat.applyScaledDamage, default ×0.60) with the owner's CURRENT combo scale. The ultimate's cinematic
// contacts follow the engine's cinematic-ultimate convention (Superman World of Cardboard, Beerus): no ×0.60, but the
// combo scale captured at confirm IS applied. Full measurements: docs/batman/DAMAGE_AUDIT.md.
import { BATMAN_ANIM } from './batmanSprites.js'

export const SCALE = 1.4                          // body cell px → world px (89 px figure → ~125 px; roster band)
export const SIN64 = [0, 100, 200, 297, 392, 483, 569, 650, 724, 792, 851, 903, 946, 980, 1004, 1019, 1024, 1019, 1004, 980, 946, 903, 851, 792, 724, 650, 569, 483, 392, 297, 200, 100, 0, -100, -200, -297, -392, -483, -569, -650, -724, -792, -851, -903, -946, -980, -1004, -1019, -1024, -1019, -1004, -980, -946, -903, -851, -792, -724, -650, -569, -483, -392, -297, -200, -100]
export const sin64 = i => SIN64[((i % 64) + 64) % 64]
export const cos64 = i => SIN64[(((i + 16) % 64) + 64) % 64]

export const COST = { batarang: 8, grapnel: 14, rooftop: 12, smoke: 16, airspace: 35, interceptor: 25, carrier: 30, skyhook: 25, cover: 18, automaton: 25, ult: 100 }

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery (60 sim ticks / s).
// box = [front0, front1, top, bottom] in SHEET px from the belt-centre / feet anchor (forward +, up −); world = × SCALE.
// Derived from the drawn limb of the active cell (reach measured in docs/batman/SPRITE_TO_MOVE_MAP.md) + 6 px leniency.
const n = (raw, startup, active, recovery, box, extra = {}) => ({ raw, damage: raw, startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 10, box, rangeX: Math.max(4, Math.round(box[1] * SCALE - 24)), rangeY: Math.round((box[3] - box[2]) * SCALE),
  knockbackX: 3, knockbackY: -1, ...extra })
export const MOVES = {
  // ── FISTS (Square chain) ──
  light: n(48, 5, 3, 10, [8, 49, -84, -56], { hitstun: 17, blockstun: 10 }),
  bL2: n(48, 6, 3, 12, [6, 38, -90, -58], { hitstun: 18, blockstun: 10, travel: [1, 6, 2] }),
  bL3: n(64, 7, 4, 18, [0, 32, -64, -30], { category: 'heavy', hitstun: 24, blockstun: 12, knockbackX: 7, knockbackY: -7, travel: [2, 10, 3] }),
  bLow: n(42, 5, 3, 11, [6, 47, -52, -22], { hitLevel: 'low', hitstun: 16, blockstun: 9 }),
  // ── KICKS (Triangle family) ──
  heavy: n(95, 11, 4, 20, [6, 51, -84, -40], { category: 'heavy', hitstun: 26, blockstun: 14, knockbackX: 8, knockbackY: -4 }),
  bSpin: n(95, 16, 4, 22, [6, 51, -84, -40], { category: 'heavy', hitstun: 26, blockstun: 14, knockbackX: 9, knockbackY: -4, travel: [2, 16, 4] }),
  up: n(75, 6, 4, 8, [-6, 46, -100, -28], { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, launchVy: -32, selfVy: 0, knockbackY: -9 }),   // the shared Balanced launcher (6/4/8, enemy vy −32, Batman stays grounded → jump-cancel)
  bSweep: n(80, 10, 4, 22, [0, 46, -30, 0], { category: 'heavy', hitLevel: 'low', hitstun: 28, blockstun: 13, knockbackX: 4, knockbackY: -8 }),
  // ── AIR ──
  air: n(65, 6, 4, 12, [0, 42, -70, -4], { hitstun: 18, knockbackX: 3, knockbackY: -3 }),
  bAirK: n(65, 8, 4, 14, [4, 58, -56, 0], { hitstun: 20, knockbackX: 6, knockbackY: -3 }),
  bDive: n(90, 10, 40, 0, [-8, 52, -56, 22], { category: 'heavy', hitstun: 30, blockstun: 15, knockbackX: 5, knockbackY: 6, dive: { vx: 9, vy: 15 } }),
  bDiveLand: n(0, 1, 1, 16, [0, 0, 0, 0], { noBody: true }),
  // ── CAPE COUNTER (Back + Triangle): frontal strike caught in frames 3–20, answered by one cape-sweep kick ──
  bCounter: n(0, 3, 18, 13, [0, 0, 0, 0], { category: 'special', noBody: true, counter: true }),
  bCounterHit: n(100, 8, 4, 18, [0, 51, -90, -36], { category: 'special', isSpecial: true, hitstun: 30, blockstun: 14, knockbackX: 10, knockbackY: -6 }),
  // ── GADGETS ──
  bBatarang: n(0, 12, 1, 16, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, cost: COST.batarang }),
  bGrapnel: n(0, 12, 14, 20, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, cost: COST.grapnel }),
  bRopeKick: n(60, 6, 6, 16, [6, 60, -70, -30], { category: 'special', isSpecial: true, hitstun: 30, blockstun: 14, knockbackX: 10, knockbackY: -6 }),
  bRooftop: n(55, 8, 9, 30, [-8, 32, -100, -20], { category: 'special', isSpecial: true, cost: COST.rooftop, hitstun: 24, blockstun: 12, knockbackX: 3, knockbackY: -9, rise: { at: 6, vy: -19, vx: 3.5 } }),
  bSmoke: n(0, 10, 1, 19, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, cost: COST.smoke }),
  // ── FLEET COMMAND GESTURES (L2 + R1 / Back + R1). `commit` = the frame energy is paid and the operation launches. ──
  cmdSky: n(0, 14, 1, 13, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, op: 'airspace', commit: 14 }),
  cmdPoint: n(0, 12, 1, 15, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, op: 'interceptor', commit: 12 }),
  cmdCarrier: n(0, 16, 1, 13, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, op: 'carrier', commit: 16 }),
  cmdSkyhook: n(0, 12, 1, 13, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, op: 'skyhook', commit: 12 }),
  cmdCover: n(0, 10, 1, 12, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, op: 'cover', commit: 10 }),
  cmdAuto: n(0, 16, 1, 13, [0, 0, 0, 0], { category: 'special', isSpecial: true, noBody: true, op: 'automaton', commit: 16 }),
  // ── ULTIMATE OPENER: committed grapnel shot (long, blockable). Clean hit → KNIGHTFALL; whiff / block → 44 f recovery.
  // Stored 67 = 40 delivered through the shared melee path (×0.60) at full combo scale: the contract's "opener" line.
  ultOpen: n(67, 14, 5, 44, [10, 150, -92, -60], { category: 'ultimate', isUltimate: true, cost: COST.ult, hitstun: 60, blockstun: 16, knockbackX: 0, knockbackY: 0 }),
}
export const CHAIN = { light: 'bL2', bL2: 'bL3' }                   // fresh Square after a CLEAN hit (three stages max)
export const HEAVY_FROM = ['light', 'bL2', 'bLow']                  // clean fist → fresh Triangle family
export const SPECIAL_FROM = ['light', 'bL2', 'bL3', 'bLow', 'heavy', 'bSpin', 'up', 'bSweep', 'air', 'bAirK', 'bCounterHit']
export const ORDER_FROM = ['bL3', 'heavy', 'bSpin', 'up', 'bSweep', 'bCounterHit', 'bRopeKick']   // clean hit → L2+R1 support order
export const ULT_FROM = ['bL3', 'heavy', 'bSpin', 'bSweep', 'bRopeKick']
export const GRAPNEL = { speed: 24, reach: 312, hookRaw: 25, pullFrames: 10, stopGap: 34, kickRaw: 60 }
export const BATARANG = { speed: 11, outFrames: 34, maxLife: 96, outRaw: 40, backRaw: 30, radius: 12, hitstun: 16, blockstun: 10 }
export const SMOKE = { life: 150, radius: 120, dashSpeed: 29, dashDuration: 14 }

// ══ FLEET OPERATIONS ═════════════════════════════════════════════════════════════════════════════════════════════
// One MAJOR operation at a time; a new order is accepted only when no operation is live or the live one has reached
// its EXIT phase (a short intentional hand-off overlap). Each type has its own cooldown after it ends. Every payload
// is scheduled data: { at, kind, raw, … } with a per-target hit ledger; budgets are totals (all payloads landing).
// hp = machine durability against the opponent's strikes / projectiles (destroyed → its DEATH strip, payloads cancelled).
export const FLEET = {
  airspace: { cost: COST.airspace, cooldown: 480, exitAt: 360, end: 400, budget: 200,
    scout: { hp: 50, arrive: 0, scanFrom: 30, bracketAt: 60, leaveAt: 100, gone: 140 },
    bombers: [{ hp: 40, arrive: 18, phase: 0 }, { hp: 40, arrive: 34, phase: 32 }],
    orbit: { rx: 150, alt: 96, wobble: 14, step: 3, track: 4 },
    bombs: [70, 100, 130, 160, 190, 220, 250, 280, 310, 340].map((at, i) => ({ at, by: i % 2, raw: 20 })),
    bomb: { g: 0.5, vy0: 1, maxVx: 6, radius: 12, blast: 44, hitstun: 18, blockstun: 12, knockbackY: -3 } },
  interceptor: { cost: COST.interceptor, cooldown: 360, exitAt: 186, end: 220, budget: 150, hp: 70,
    shots: [{ at: 64, raw: 16, side: -1 }, { at: 74, raw: 16, side: -1 }, { at: 84, raw: 16, side: -1 }, { at: 94, raw: 16, side: -1 },
      { at: 146, raw: 14, side: 1 }, { at: 156, raw: 14, side: 1 }, { at: 166, raw: 14, side: 1 }, { at: 176, raw: 14, side: 1 }],   // 120 + platform bolts 2 × 15 = 150
    shot: { speed: 14, life: 26, h: 8, hitstun: 16, blockstun: 10 } },
  carrier: { cost: COST.carrier, cooldown: 480, exitAt: 250, end: 290, budget: 180, carrierHp: 140, lurkerHp: 90, defenderHp: 80,
    shells: [{ at: 96, raw: 30 }, { at: 122, raw: 30 }, { at: 148, raw: 30 }],
    rounds: [{ at: 176, raw: 30, kind: 'arc' }, { at: 202, raw: 30, kind: 'arc' }, { at: 232, raw: 30, kind: 'gun' }],
    shell: { speed: 12, life: 50, h: 12, hitstun: 18, blockstun: 12, knockbackX: 5 },
    round: { g: 0.45, flight: 34, blast: 40, hitstun: 18, blockstun: 12 } },
  skyhook: { cost: COST.skyhook, cooldown: 420, exitAt: 150, end: 200, budget: 140, hp: 120,
    hookAt: 80, liftTo: 150, dropAt: 132, hookRaw: 50, slamRaw: 90, hookBox: [-26, 26, -12, 26], hitstun: 26, blockstun: 14 },
  cover: { cost: COST.cover, cooldown: 300, exitAt: 110, end: 140, budget: 80, hunterHp: 40, wingHp: 40,
    smoke: { life: 100, radius: 90 },
    hunterShots: [{ at: 44, raw: 10 }, { at: 54, raw: 10 }, { at: 78, raw: 10, back: true }, { at: 88, raw: 10, back: true }],
    wingShots: [{ at: 70, raw: 10 }, { at: 78, raw: 10 }, { at: 86, raw: 10 }, { at: 94, raw: 10 }],
    shot: { speed: 13, life: 30, h: 8, hitstun: 14, blockstun: 9 } },
  automaton: { cost: COST.automaton, cooldown: 420, exitAt: 130, end: 160, budget: 150, hp: 110,
    beams: [{ at: 44, raw: 40, row: 'auto_a1', len: 98, hitstun: 18, blockstun: 11, kb: [3, -1] },
      { at: 66, raw: 40, row: 'auto_a2', len: 98, hitstun: 18, blockstun: 11, kb: [4, -1] },
      { at: 104, raw: 70, row: 'auto_a3', len: 112, hitstun: 26, blockstun: 14, kb: [9, -6] }] },
}
export const MAJOR = ['airspace', 'interceptor', 'carrier', 'skyhook', 'cover', 'automaton']
export const CAPS = { machines: 8, payloads: 16 }
export const ASSIST = { chip: 0.12, maxAirHits: 6, hitstop: 5 }   // special-tier chip; no assist hit on a target already juggled 6 times

// ══ ULTIMATE — KNIGHTFALL: ORBITAL IMPACT (frames from confirm) ═════════════════════════════════════════════════
//   0– 33 STRAFE      the fixed-wing aircraft enters low from behind Batman, passes over the captive
//  34          CAPTURE  tether drops; captive attached under the fuselage            contact: capture 0 (opener 40 already dealt)
//  34– 95 ASCENT     carried up through the sky (clouds streak down), star-field fades in        contact @ 64: ascent 40
//  96–133 SPACE      high-altitude hold: curved turnaround (plane banks, faces down)
// 134–165 REENTRY    full-speed dive, speed trails, stars streak upward                         contact @ 150: reentry 90
// 166        IMPACT   captive driven into the legal stage impact point; plane pulls out          contact @ 166: slam 200
// 166–205 EXPLOSION  Krybot explosion strip ×3 scale, shock ring, debris, bounded shake         contact @ 178: blast 50
// 206–239 RECOVERY   sky fades back, camera returns, captive knocked down at a legal stage position
// Opener 40 (melee path) + 40 + 90 + 200 + 50 = 420 (captured combo scale; no ×0.60 on the cinematic contacts).
export const ULT = { total: 240, altitude: 560,
  contacts: [{ at: 64, raw: 40, kind: 'ascent' }, { at: 150, raw: 90, kind: 'reentry' }, { at: 166, raw: 200, kind: 'slam' }, { at: 178, raw: 50, kind: 'blast' }],
  phases: [{ from: 0, id: 'strafe' }, { from: 34, id: 'ascent' }, { from: 96, id: 'space' }, { from: 134, id: 'reentry' }, { from: 166, id: 'impact' }, { from: 206, id: 'recovery' }] }

// ── Frame timelines (elapsed tick → strip frame) ──
export const TIMELINE = {
  light: [[0, 0], [4, 1], [12, 2]], bL2: [[0, 0], [5, 1]], bL3: [[0, 0], [6, 1]], bLow: [[0, 0], [3, 1], [5, 2]],
  heavy: [[0, 0], [9, 1], [22, 2]], bSpin: [[0, 0], [3, 1], [7, 2], [11, 3], [15, 4], [26, 5]], up: [[0, 0], [5, 1], [10, 2]],
  bSweep: [[0, 0], [9, 1]], air: [[0, 0], [5, 1]], bAirK: [[0, 0], [7, 1]], bCounterHit: [[0, 0], [3, 1], [7, 2], [16, 3]],
  bBatarang: [[0, 0], [4, 1], [8, 2], [12, 3]], bGrapnel: [[0, 0], [12, 1], [26, 2]], bRopeKick: [[0, 0], [2, 1], [4, 2], [6, 3], [9, 4], [12, 5]],
  bRooftop: [[0, 0], [4, 1], [6, 2], [12, 3], [22, 4]], bSmoke: [[0, 0], [8, 1], [16, 2]],
  cmdSky: [[0, 0], [14, 1]], cmdPoint: [[0, 0], [14, 1]], cmdCarrier: [[0, 0], [10, 1], [22, 2]], cmdSkyhook: [[0, 0], [12, 1]],
  cmdCover: [[0, 0], [8, 1], [16, 2]], cmdAuto: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 4], [25, 5]], ultOpen: [[0, 0], [14, 1], [30, 2]],
}

export const batman = {
  rosterKey: 'batman', name: 'Batman', displayName: 'Batman', universe: 'dc', color: '#3a4a78',
  series: 'DC', era: 'Supplied SNES "Batman Returns" sheet (upgraded by DAD34853) + supplied generic drone / vehicle / robot packs',
  tagline: 'Gotham is never alone.', introTitle: 'BATMAN — THE DARK KNIGHT', archetype: 'Tactical Brawler / Fleet Commander',
  bio: 'Gotham\'s protector: a disciplined martial artist with a belt of gadgets and an automated support fleet. The machines are custom game adaptations of supplied generic sprite packs, not official Batman vehicle designs.',
  primary: 'technical', secondary: ['rushdown', 'zoner'], archetypes: ['technical', 'rushdown', 'zoner'],
  traits: { hasEnergy: true, energyType: 'gadget', energyName: 'Gadget Energy', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Gadget Energy', color: '#f0b030' },
  // HP 1150 (upper band). attack / defense are roster METADATA (the live damage path does not read them; see DAMAGE_AUDIT).
  // speed 94 < 98 = the shared double-tap teleport tier, so a double tap is always the ordinary physical dash.
  stats: { maxHealth: 1150, maxEnergy: 100, attack: 94, defense: 90, speed: 94, jumpPower: 26, maxJumps: 2, weight: 1,
    dashSpeed: 20, dashDuration: 10, dashCooldownMax: 24 },
  hasSprites: true, spriteScale: SCALE, spriteSheet: BATMAN_ANIM.idle.sheet, portrait: './assets/batman/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro', 'introSettle'], introPool: ['intro'],
  basic_attacks: { light: MOVES.light, heavy: MOVES.heavy, crouchLight: MOVES.bLow, upAttack: MOVES.up, airAttack: MOVES.air, downAir: MOVES.bDive,
    grab: { damage: 45, startup: 6, active: 3, recovery: 22, hitstun: 22, throwForceX: 9, throwForceY: -5, damageType: 'grab' } },
  specials: { neutral: { name: 'Batarang Pressure', cost: COST.batarang }, forward: { name: 'Grapnel Breaker', cost: COST.grapnel },
    up: { name: 'Rooftop Extraction', cost: COST.rooftop }, down: { name: 'Smoke and Shadow', cost: COST.smoke }, back: { name: 'Gotham Airspace', cost: COST.airspace } },
  ultimate: { name: 'KNIGHTFALL: ORBITAL IMPACT', cost: COST.ult,
    description: 'Committed grapnel opener. Clean hit: the fixed-wing aircraft snatches the foe on a tether → sky → space → full-speed reentry → ground slam + explosion (420 raw total). Whiff / block: 44 f recovery.' },
  animationData: Object.fromEntries(Object.entries(BATMAN_ANIM).map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
