// FROZONE (frozone, The Incredibles) — DATA ONLY: frame data, ice-system rules, special budgets, the ultimate schedule and
// the roster entry. Logic: frozoneState.js (sim), frozone.js (command layer), frozoneFx.js (render). Art: the supplied
// GBA sheet "Game Boy Advance - The Incredibles - Playable Characters - Frozone.png", extracted by
// tools/frozone/extract.py — docs/frozone/SPRITE_MAP.md (frame-to-move ledger), ICE_SYSTEM.md (Chill / Freeze / Shatter).
import { FROZONE_ANIM } from './frozoneSprites.js'

// Stored damage = authored raw (roster convention: Goku light / heavy stored 45 / 85). Live health loss is the shared
// formula floor(stored × comboScale × 0.6 GLOBAL_DAMAGE_SCALE) — docs/frozone/DAMAGE_AUDIT.md. No parity multiplier.
export const FROZONE_DAMAGE_SCALE = 1
export const dmg = raw => Math.round(raw * FROZONE_DAMAGE_SCALE)
export const FROZONE_SCALE = 2           // integer nearest-neighbour presentation (62 px GBA body → 124 px)

export const COST = { lance: 15, rush: 20, rise: 20, blackIce: 18, breaker: 25, wall: 15, ult: 100 }

// Boxes are measured from the body FRONT (b0..b1, px ahead of the leading hurtbox edge) and from the FLOOR
// (top = px above the feet, h = height) — the same numbers frozoneFx uses to draw the ice at the hand.
const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 60, rangeY: 50, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES (60 sim ticks / s). startup = frames before the first active frame. ──
export const FROZONE_MOVES = {
  // Square chain: short hand-directed ice strike → second casting strike → outward burst (clean-hit retaps only)
  light: n(45, 5, 3, 10, { box: [0, 66, 96, 40], ice: 'jab' }),
  fL2: n(45, 6, 3, 11, { hitstun: 18, blockstun: 10, box: [0, 76, 100, 46], ice: 'jab2' }),
  fL3: n(60, 8, 4, 17, { hitstun: 22, blockstun: 12, knockbackX: 8, knockbackY: -4, box: [0, 98, 108, 60], ice: 'burst' }),
  // Down + Square: the supplied low lunge with its ground ice burst
  fLow: n(45, 7, 3, 13, { hitLevel: 'low', hitstun: 18, blockstun: 10, box: [0, 92, 34, 34], ice: 'sweep' }),
  // Triangle: committed two-hand crystalline strike (Shatter-capable)
  heavy: n(90, 13, 4, 21, { category: 'heavy', hitstun: 26, blockstun: 14, knockbackX: 8, knockbackY: -3, box: [0, 104, 100, 62], ice: 'wedge', shatter: true }),
  // Up + Triangle: a rising wedge erupts from the hand-to-ground point in front — launches
  fLaunch: n(75, 12, 4, 20, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 12, launchVy: -19, box: [12, 74, 150, 150], ice: 'riseWedge' }),
  // air Square: short forward ice burst
  air: n(65, 6, 4, 13, { air: true, hitstun: 20, knockbackX: 4, knockbackY: -3, box: [-6, 84, 100, 110], ice: 'airBurst' }),
  // air Down + Triangle: descending strike; bounded landing burst
  fDownAir: n(85, 12, 8, 18, { category: 'heavy', air: true, hitstun: 26, blockstun: 12, knockbackX: 3, knockbackY: 8, box: [-46, 30, 24, 76], ice: 'drop' }),
  // ── specials ──
  // R1: ICE LANCE — hand-directed narrow projectile (released at the extended hand)
  fLance: n(0, 11, 1, 16, { category: 'special', isSpecial: true, noBody: true, cost: COST.lance, releaseAt: 11 }),
  // Forward + R1: GLACIER RUSH — disc surf (physical travel) into a short finishing ice strike (one hit)
  fRush: n(120, 22, 4, 22, { category: 'special', isSpecial: true, cost: COST.rush, hitstun: 28, blockstun: 14, knockbackX: 9, knockbackY: -5, box: [0, 86, 104, 72], ice: 'rush', chill: true,
    travel: [5, 22, 11] }),
  // Up + R1: RISING GLACIER — ice-assisted rise, one hit above him; once per airtime, never a jump refund (NOT a
  // `launcher`: the shared launcher rule refreshes the attacker's jumps, so the pop comes from knockbackY instead)
  fRise: n(110, 8, 6, 24, { category: 'special', isSpecial: true, cost: COST.rise, hitstun: 28, blockstun: 12, knockbackX: 2, knockbackY: -14,
    box: [-24, 56, 156, 132], ice: 'rise', airOk: true, liftAt: 6, liftVy: -17 }),
  // Down + R1: BLACK ICE — one visible patch on legal ground
  fBlackIce: n(0, 14, 1, 16, { category: 'special', isSpecial: true, noBody: true, cost: COST.blackIce, releaseAt: 14 }),
  // Back + R1: ICEBREAKER — committed crystalline burst; Shatter-capable; no armor
  fBreaker: n(145, 18, 4, 28, { category: 'special', isSpecial: true, cost: COST.breaker, hitstun: 30, blockstun: 16, knockbackX: 11, knockbackY: -6, box: [0, 112, 116, 86], ice: 'breaker', shatter: true }),
  // Down + Triangle (ground): ICE WALL — hand to the floor, a crystalline wall erupts ahead (see WALL)
  fWall: n(0, 12, 1, 16, { category: 'special', isSpecial: true, noBody: true, cost: COST.wall, releaseAt: 12 }),
  // R2 ULTIMATE opener: committed opening ice strike. Clean hit only → cinematic.
  ultOpen: n(40, 14, 4, 40, { category: 'ultimate', isUltimate: true, cost: COST.ult, hitstun: 60, blockstun: 14, knockbackX: 0, knockbackY: 0, box: [0, 100, 108, 62], ice: 'ultOpen' }),
}
export const CHAIN = { light: 'fL2', fL2: 'fL3' }
export const HEAVY_FROM = ['light', 'fL2', 'fLow']
export const SPECIAL_FROM = ['light', 'fL2', 'fL3', 'fLow', 'heavy', 'fLaunch']
export const ULT_FROM = ['heavy', 'fL3']
export const NORMAL_KEYS = ['light', 'fL2', 'fL3', 'fLow', 'heavy', 'fLaunch', 'air', 'fDownAir']

// Hand anchors measured on the supplied frames (tools/frozone/extract.py cells, ×2): [px ahead of the hurtbox FRONT,
// px above the feet] of the casting hand at the move's strike frame. frozoneFx draws every ice effect from here.
// (hurtbox 60 × 100: the cell anchor sits 30 px behind the front edge.)
export const HAND = { light: [12, 68], fL2: [10, 72], fL3: [40, 74], heavy: [26, 58], fLaunch: [20, 40], air: [40, 74], fDownAir: [0, 10],
  fLance: [40, 74], fBreaker: [26, 58], ultOpen: [40, 74], guard: [26, 56], fRush: [24, 16], fBlackIce: [20, 40], fWall: [20, 40], fLow: [64, 4], fRise: [0, 0] }

// ── ICE SYSTEM (docs/frozone/ICE_SYSTEM.md) ──
// CHILL: ≤ 3 pips per opponent; ONE pip per cast serial on a CLEAN hit of a designated special (Ice Lance / Frost Lance,
// Glacier Rush finisher, Black Ice). Never from blocks, armor, scenery or cosmetic trails. Pips expire `expire` ticks
// after the LAST pip. No pip during the refreeze immunity window.
export const CHILL = { max: 3, expire: 240 }
// FREEZE: the 3rd pip consumes all pips and freezes for `dur` ticks (target held in place, hitstun topped up to the
// remaining shell time — never beyond it). Once per combo. After it ends (expiry / shatter / any other damage / an
// escape) the target gets `immunity` ticks of refreeze immunity.
// ONE EXPLICIT RULE for other damage: ANY damage to a frozen target from any other source (any Frozone move that is not
// a Shatter, the opponent's partner, stage hazards …) THAWS it at once — the shell breaks with no bonus and the hit's
// own hitstun applies.
export const FREEZE = { dur: 24, immunity: 120 }
// SHATTER: a clean Heavy or Icebreaker on a frozen target consumes the freeze ONCE and adds `raw` (stored), scaled by
// the SAME combo scale as the hit (W.damage, one application, never per shard / per contact).
export const SHATTER = { raw: 25 }

// Ice Lance: narrow, bounded range. Frost Lance = the owner's unused patch consumed by a crossing Lance (once per
// projectile, never recursive): broader, +15 raw, still one Chill.
export const LANCE = { raw: 90, speed: 12, life: 38, w: 56, h: 14, hitstun: 22, kbx: 5, kby: -2, handX: 40, handY: 74,
  frost: { raw: 105, w: 84, h: 30 } }
// Black Ice: one patch per owner, fixed lifetime, ahead of the hand-to-ground point; one small hit + one Chill on an
// opponent's eligible (grounded, standing, not grabbed) contact, then consumed. Owner skating across = SKATE SWITCH.
export const BLACK_ICE = { ahead: 70, w: 112, life: 420, raw: 30, hitstun: 18, kbx: 2, kby: -6, vw: 60, vh: 40 }
// ICE SKATE (double-tap): the SHARED dash / air-dash, with Frozone's speed profile (px per frame, clamp 8..16 in physics).
// Ground: acceleration → cruise → ease-out. Brake = opposite direction or Guard from frame 3. Air: one bounded burst per
// airtime (shared airDashCount), level (vy 0), no jump refund.
// ── 2026-11-15 MOBILITY KIT (owner request) ──
// ICE GLIDER: airborne, falling, Jump / Up HELD → he rides a conjured ice board: fall speed capped, steerable, ribbon
// trail. Release to drop. Never during attacks / hitstun / a rail ride.
export const GLIDE = { fall: 1.6, drift: 6.5, enterVy: 0.5 }
// ICE FLASH (ground double-tap): an instant ice-skate TELEPORT `dist` px forward that passes THROUGH the opponent,
// leaving an ice trail. If the path crossed the opponent's body, the SLICE lands `sliceDelay` ticks later (one engine
// hit volume → guard / chip / combo scale / Chill as every Frozone hit). `lag` ticks of locked recovery after arrival;
// NO cooldown (owner request 2026-11-15): he can flash again as soon as the arrival slide ends.
export const FLASH = { dist: 250, lag: 9, cooldown: 0, slideVx: 3, sliceDelay: 6, raw: 55, hitstun: 22, kbx: 4, kby: -5, w: 70, h: 90 }
// ICE RAIL (air double-tap; replaces the old level air skate): fires a straight ice rail from his feet — rising with
// Up held, diving with Down held, level otherwise — and he GRINDS along it. Rails persist `life` ticks (blink for the
// last `warn`), and while one exists he can LAND on it again from above to re-ride it (the skill gap). Jump during a
// ride = rail hop (no jump spent). One new rail per airtime (shared airDashCount). Grinding through the opponent
// slices them once per rail.
// 2026-11-15 rev: the air double-tap is now a CONTINUOUS ICE STREAM — ice keeps pouring out ahead of him and he grinds it
// while Forward is held (min `minStream`, max `stream` ticks), steering live with Up / Down. Every straight stretch is a
// rail segment with the same rules (lifetime from when it was laid, re-ride, hop, one slice per stream, one per airtime).
export const RAIL = { len: 300, angle: 0.55, speed: 13, life: 110, warn: 30, hopVy: -13, carry: 0.7, raw: 40, hitstun: 18, kbx: 5, kby: -6, max: 10, catchTol: 10,
  stream: 90, minStream: 12 }
// trails left by Ice Flash: pure ice on the floor, same lifetime rule as rails (readable, then melts)
export const TRAIL = { life: 100, warn: 30 }
// ICE WALL (Down + Triangle): one wall at a time, `ahead` px in front. Rises over `rise` ticks; erupting under an
// opponent launches them (one hit). Blocks the opponent's projectiles (each costs 1 of `hp`) and their movement (pushed
// out to the side they came from; they can jump over the top). Frozone passes through his own ice. Melts after `life`.
export const WALL = { ahead: 96, w: 30, h: 128, rise: 8, life: 170, hp: 3, raw: 60, hitstun: 26, kbx: 2, kby: -12 }
export const SKATE = { duration: 16, profile: [8.5, 11, 13.5, 15, 15, 15, 15, 15, 15, 14.5, 13.5, 12, 11, 10, 9, 8.5],
  boostSpeed: 16, boostFrames: 10, brakeFrom: 3, brakeVx: 3.5, air: 13.5, trail: 10 }

// ── ULTIMATE: ABSOLUTE ZERO — CITY ON ICE (TIMELINE frames after the opener's clean hit; freeze contract) ──
// Wall-clock length = total + every hit-stop `hold` + the slow-motion stretch (ULT.slow: [from, to, n] = each timeline
// frame lasts n ticks) = 256 + 44 + 58 = 358 ticks (≈ 6 s).
//    0–39  COLD OPEN: title cut-in, camera pushes in on Frozone; moisture is pulled out of the air into his hands, breath
//  40–65  ICE BEAM from his hand; @52 it LOCKS the foe's feet (hit-stop 5, no damage), the street freezes, the ramp erupts
//  66–145 SKATE PASSES around the ramp: strikes @79, @106, @133 (40 each) — the crossings of frozoneState.ultRoute —
//          escalating hit-stop 5 / 7 / 9, shake and impact frames; each pass adds a layer of ice to the foe
// 146–185 he launches off the far ramp into a high leap; @150 the foe is sealed in a giant ICE MONOLITH; slow motion
//          162–189 while he hangs over it (camera pulls wide)
// 186–193 the dive; cracks race through the monolith
//   194   SHATTER (250): 18-frame hit-stop, impact frames, monolith fragments, shockwaves, spike field, diamond dust
//          (slow motion 196–225)
// 214–255 the pose: CITY ON ICE; letterbox out
// Opener 40 + 3 × 40 + 250 = 410 raw (stored), scaled once by the combo scale captured at the capture.
// The passive Freeze / Shatter rules never add a bonus inside this contract.
export const ULT = { total: 256, cutIn: 40, settle: 214,
  beam: 40, lock: 52, lockHold: 5, skate: 66, skateLen: 80, mono: 150, monoGrow: 24, apex: 170, dive: 186, shatter: 194, pose: 214,
  leap: 210, drop: 96,
  contacts: [{ at: 79, raw: 40, kind: 'pass', hold: 5, shake: 7 }, { at: 106, raw: 40, kind: 'pass', hold: 7, shake: 10 },
    { at: 133, raw: 40, kind: 'pass', hold: 9, shake: 13 }, { at: 194, raw: 250, kind: 'shatter', hold: 18, shake: 18 }],
  slow: [[162, 190, 2], [196, 226, 2]],
  beats: [{ from: 0, pose: 'ultCast' }, { from: 40, pose: 'ultBeam' }, { from: 66, pose: 'ultSkate' }, { from: 146, pose: 'fRise' },
    { from: 180, pose: 'fDownAir' }, { from: 192, pose: 'ultShatter' }, { from: 214, pose: 'introSettle' }],
  ramp: { r: 150, h: 120 } }

// ── body frame timelines (elapsed tick → strip frame) ──
export const TIMELINE = {
  light: [[0, 0], [4, 1]],
  fL2: [[0, 0], [5, 1]],
  fL3: [[0, 0], [7, 1]],
  fLow: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [17, 5]],
  heavy: [[0, 0], [7, 1], [12, 2]],
  fLaunch: [[0, 0], [14, 1]],
  air: [[0, 0]],
  fDownAir: [[0, 0], [20, 1]],
  fLance: [[0, 0], [9, 1]],
  fRush: [[0, 0], [4, 1], [9, 2], [14, 3], [20, 4], [28, 5]],
  fRise: [[0, 0], [8, 1]],
  fBlackIce: [[0, 0]],
  fWall: [[0, 0]],
  fBreaker: [[0, 0], [6, 1], [12, 2], [17, 3]],
  ultOpen: [[0, 0], [12, 1], [30, 2]],
}
// strip used by each move (several moves share one supplied pose — docs/frozone/SPRITE_MAP.md "reuse")
export const MOVE_STRIP = { light: 'atkLight', fL2: 'atkLight2', fL3: 'atkFinish', fLow: 'atkLow', heavy: 'atkHeavy', fLaunch: 'atkLaunch',
  air: 'atkAir', fDownAir: 'atkDownAir', fLance: 'atkLance', fRush: 'atkRush', fRise: 'atkRise', fBlackIce: 'atkBlackIce', fWall: 'atkBlackIce', fBreaker: 'atkBreaker', ultOpen: 'atkUlt' }

export const frozone = {
  rosterKey: 'frozone', name: 'Frozone', displayName: 'Frozone', universe: 'the_incredibles',
  color: '#30b0d0', series: 'The Incredibles', era: 'Supplied GBA "The Incredibles" playable-character sheet (Frozone)',
  tagline: 'Ice to meet you.', introTitle: 'FROZONE — ABSOLUTE ZERO', archetype: 'Ice Skater / Rushdown-Setplay',
  bio: 'Lucius Best, Frozone: a super who pulls moisture from the air and freezes it into skating paths, lances and walls. In this game he is a fast ice skater: Chill pips stack from clean special hits, the third freezes the opponent briefly, and a Heavy or Icebreaker Shatters the shell for a fixed bonus. Black Ice patches can be kept as a setup or spent for a speed burst. Ice-system rules are fighting-game adaptations of the supplied sprites.',
  primary: 'rushdown', secondary: ['setplay', 'all-rounder'], archetypes: ['rushdown', 'setplay', 'all-rounder'],
  traits: { hasEnergy: true, energyType: 'ice', energyName: 'Frost', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Frost', color: '#9fe8ff' },
  // speed 96 (< the 98 teleport tier → the double-tap stays an ordinary physical skate dash). maxJumps 2 = the SHARED
  // double jump. dashDuration 16 = SKATE.duration (the per-frame speed comes from SKATE.profile).
  stats: { maxHealth: 1150, maxEnergy: 100, attack: 86, defense: 68, speed: 96, jumpPower: 25, maxJumps: 2, weight: 1,
    dashSpeed: 27, dashDuration: SKATE.duration, dashCooldownMax: 24 },
  hasSprites: true, spriteScale: FROZONE_SCALE, spriteSheet: FROZONE_ANIM.idle.sheet, portrait: './assets/frozone/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequencePool: [['intro', 'introSettle']],
  basic_attacks: { light: FROZONE_MOVES.light, heavy: FROZONE_MOVES.heavy, crouchLight: FROZONE_MOVES.fLow, upAttack: FROZONE_MOVES.fLaunch,
    airAttack: FROZONE_MOVES.air, downAir: FROZONE_MOVES.fDownAir,
    grab: { damage: dmg(45), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 10, throwForceY: -5, damageType: 'grab' } },
  specials: { neutral: { name: 'Ice Lance', cost: COST.lance }, forward: { name: 'Glacier Rush', cost: COST.rush }, up: { name: 'Rising Glacier', cost: COST.rise },
    down: { name: 'Black Ice', cost: COST.blackIce }, back: { name: 'Icebreaker', cost: COST.breaker } },
  mobility: { glide: 'Hold Jump while falling: Ice Glider', flash: 'Double-tap (ground): Ice Flash — teleport through + slice',
    rail: 'Double-tap (air, hold Up / Down to angle): Ice Rail — grind; land on a live rail to re-ride', wall: 'Down + Heavy: Ice Wall (15 Frost)' },
  ultimate: { name: 'ABSOLUTE ZERO: CITY ON ICE', cost: COST.ult,
    description: 'Opening ice strike (raw 40). Clean hit: title cut-in, an ice beam locks the foe, the street freezes and a ramp erupts, three skating passes (3 × 40, escalating hit-stop), a leap while the foe is sealed in a giant ice monolith, the dive and the final Shatter (250) — 410 raw. Block / whiff: no capture, real recovery.' },
  animationData: {
    ...FROZONE_ANIM,
    ...Object.fromEntries(Object.entries(MOVE_STRIP).map(([k, s]) => [k, { ...FROZONE_ANIM[s], frameTimeline: TIMELINE[k] }])),
    ultCast: { ...FROZONE_ANIM.atkUlt, frameTimeline: [[0, 0]] },
    ultBeam: { ...FROZONE_ANIM.atkUlt, frameTimeline: [[0, 1]] },
    ultShatter: { ...FROZONE_ANIM.atkUlt, frameTimeline: [[0, 1], [16, 2]] },
  },
}
