// ENOCH (enoch, The Incredibles) — DATA ONLY: frame data, the thermal profile, move budgets and the roster entry.
// A tribute fighter for a friend who helped build Multiverse Smash: Frozone's ice, a visor that burns, and
// what happens where the two meet. Logic: enochState.js (sim) · enoch.js (command layer) · enochFx.js (render).
// Art: a region recolour of Frozone's supplied GBA sheet (tools/enoch/build_sprites.py; docs/enoch/EDIT_LEDGER.md).
// ICE STANCE (tap Charge): Enoch runs Frozone's own kit through frozoneState's host table — Frozone's DATA is only read here.
import { ENOCH_ANIM } from './enochSprites.js'
import { TIMELINE as FZ_TIMELINE, MOVE_STRIP as FZ_STRIP } from './frozoneData.js'

// Stored damage = authored raw (roster convention, as Frozone): live loss = floor(stored × combo scale × 0.6 global).
export const dmg = raw => Math.round(raw)
export const ENOCH_SCALE = 2                       // integer nearest-neighbour presentation (Frozone's ×2)

// Move helper. adv = frame advantage on block when the FIRST active frame connects:
//   blockstun = (active − 1) + recovery + adv  → the attacker recovers exactly `adv` frames before / after the defender.
// box = [b0, b1, top, h]: px ahead of the hurtbox FRONT (b0..b1) and above the FEET (top) with height h.
// BLOCK_SYNC: the engine clears the attacker's move 2 frames after the defender's blockstun would expire for the same frame
// count (measured live in harness/enoch_kit.test.mjs), so the authored blockstun adds it to land on the brief's advantage.
export const BLOCK_SYNC = 2
const n = (raw, startup, active, recovery, adv, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, adv, frameExact: true,
  category: 'light', hitstun: 16, blockstun: Math.max(1, (active - 1) + recovery + adv + BLOCK_SYNC), rangeX: 60, rangeY: 50, knockbackX: 3, knockbackY: -2,
  damageType: 'blunt', ...extra })

// ── NORMALS (no cost, thermal-neutral unless stated). Frames are the brief's; advantage values the brief left open are
// marked (*) and documented in docs/enoch/BALANCE_NOTES.md.
export const ENOCH_MOVES = {
  jab:      n(40, 5, 3, 8, +1, { box: [0, 64, 90, 40], strip: 'atkJab' }),                                        // R7 fr1 · +1 on block
  straight: n(62, 8, 3, 13, -3, { hitstun: 19, knockbackX: 5, box: [0, 84, 92, 42], strip: 'atkStraight' }),     // R7 fr2-3 · −3
  heavy:    n(88, 12, 4, 20, -5, { category: 'heavy', launcher: true, launchVy: -12, hitstun: 30, knockbackX: 4, knockbackY: -14,
              box: [0, 92, 110, 70], thermal: -5, strip: 'atkHeavy' }),                                           // R8 fr1-2 · launches · 5 colder
  low:      n(46, 7, 3, 13, -2, { hitLevel: 'low', hitstun: 18, box: [0, 86, 34, 34], strip: 'atkLow' }),       // R3 crouch · low · (*) −2
  rise:     n(78, 9, 4, 18, -4, { category: 'heavy', antiAir: true, hitstun: 24, knockbackX: 2, knockbackY: -12,
              box: [-20, 70, 170, 120], strip: 'atkRise' }),                                                      // R8 fr3 · anti-air · (*) −4
  air:      n(64, 6, 4, 13, 0, { air: true, hitstun: 20, knockbackX: 4, knockbackY: -3, box: [-10, 72, 96, 96], strip: 'atkAir' }),   // R5 jump frames
}
export const NORMAL_KEYS = Object.keys(ENOCH_MOVES)
export const CHAIN = { jab: 'straight', straight: 'heavy' }          // Jab → Straight → Heavy (clean-hit retaps)
export const HEAVY_FROM = ['jab', 'straight', 'low']
// FLOW: a press made during a move is held for `buffer` frames (so it comes out as soon as the cancel opens, not dropped);
// cancels open on a hit OR a block; on a HIT his normals jump-cancel (straight into the air chain / meteor) and
// dash-cancel (double-tap → dash, hold → the slide).
export const FLOW = { buffer: 16, jumpFrom: ['jab', 'straight', 'low', 'heavy', 'rise', 'slide'], dashFrom: ['jab', 'straight', 'low', 'heavy', 'slide', 'iceBlast', 'frostFloor', 'deepFreeze', 'scorch', 'steamBurst'] }

// ── SPECIALS (thermal-gated; `el` = the element the thermal profile checks; `th` = thermal push, ± = colder / hotter;
// `away` = pushed AWAY from 0 (water moves). Damage is the brief's raw value; the own-zone ×1.15 applies on top.)
const sp = (raw, startup, active, recovery, adv, extra = {}) => n(raw, startup, active, recovery, adv, { category: 'special', isSpecial: true, ...extra })
export const ENOCH_SPECIALS = {
  iceBlast:   sp(55, 12, 2, 18, -6, { el: 'ice', th: -12, damageType: 'projectile', noBody: true, releaseAt: 11, strip: 'atkBlast' }),   // ↓↘→+S
  frostFloor: sp(35, 12, 4, 20, -8, { el: 'ice', th: -15, hitLevel: 'low', knockbackY: 0, noBody: true, releaseAt: 12, strip: 'atkFloor' }),   // ONE hit: the eruption volume (no melee box)   // ↓↓+S
  deepFreeze: sp(40, 14, 4, 24, -10, { el: 'ice', th: -22, hitstun: 22, box: [0, 110, 96, 70], freeze: 42, cooldown: 480, strip: 'atkCone' }),      // ↓↙←+S · 0.7 s freeze
  iceDisc:    sp(0, 10, 1, 14, 0, { el: 'ice', th: -18, noBody: true, releaseAt: 9, strip: 'discPlant' }),                                       // ↓+Charge
  heatLens:   sp(58, 10, 2, 14, -6, { el: 'fire', th: 12, damageType: 'energy', noBody: true, releaseAt: 10, strip: 'atkLens' }),              // →→+S / ↓↘→+H
  scorch:     sp(50, 14, 5, 20, -8, { el: 'fire', th: 20, damageType: 'energy', box: [-10, 150, 110, 90], releaseAt: 15, strip: 'atkScorch_fire' }), // ↓↙←+H
  steamBurst: sp(85, 9, 5, 22, -10, { el: 'water', th: 20, away: true, damageType: 'energy', box: [-30, 90, 120, 120], knockbackX: 7, knockbackY: -8, hitstun: 26, strip: 'atkSteam_water' }),   // ↓↘→+S (water unlocked)
  tideBreak:  sp(0, 16, 1, 22, 0, { el: 'water', th: 25, away: true, noBody: true, releaseAt: 16, cooldown: 360, strip: 'atkTide_water' }),        // →→+H
  condense:   sp(40, 12, 2, 18, -4, { el: 'water', th: 15, away: true, damageType: 'projectile', noBody: true, releaseAt: 12, strip: 'atkCondense' }),   // ↓↓+H
  slide:      n(55, 6, 10, 14, -6, { hitLevel: 'low', travel: [6, 16, 9], hitstun: 18, knockbackX: 5, box: [0, 70, 30, 30], strip: 'atkSlide' }),   // Down+Heavy / Light in a glide
  wake:       n(70, 6, 4, 22, -12, { category: 'heavy', invuln: 6, hitstun: 22, knockbackX: 6, knockbackY: -6, box: [0, 90, 100, 80], strip: 'atkWake' }),   // attack on wake-up
  iceWall:    sp(0, 12, 1, 16, 0, { el: 'ice', th: -15, noBody: true, releaseAt: 12, cooldown: 240, strip: 'atkFloor' }),          // →↓↘+S (623) · Back+Heavy (not hot)
  fireWall:   sp(0, 12, 1, 18, 0, { el: 'fire', th: 15, noBody: true, releaseAt: 12, cooldown: 240, strip: 'atkFloor_fire' }),    // 623+H · Back+Heavy (hot)
  meteor:     sp(90, 14, 2, 22, -4, { airOk: true, el: 'ice', th: -18, noBody: true, releaseAt: 14, cooldown: 300, strip: 'atkRise' }),        // Up+S: ONE giant ICE SPIKE
  fireMeteor: sp(12, 16, 2, 30, 0, { airOk: true, el: 'fire', th: 22, noBody: true, releaseAt: 16, cooldown: 420, strip: 'atkRise' }),        // Up+S when hot: the FIRE RAIN
  snowman:    sp(0, 14, 1, 18, 0, { el: 'ice', th: -15, noBody: true, releaseAt: 14, cooldown: 300, strip: 'atkFloor' }),       // Back+Charge · an ice sculpture wall
  super:      sp(0, 10, 2, 30, 0, { noBody: true, isUltimate: true, cost: 100, releaseAt: 10, range: 460, strip: 'atkSuper' }),                // ↓↘→↓↘→+S
}
export const ICE_BLAST = { speed: 11, life: 64, w: 40, h: 22, handX: 30, handY: 62, pool: 3, hitstun: 18, kbx: 4, kby: -2, aimTan: 0.577 }   // aimTan = tan 30°: the steepest it angles up at an airborne foe   // 11 px/f × 64 f ≈ 55 % of the screen
export const FROST_FLOOR = { ahead: 110 }
export const HEAT_LENS = { len: 1280, holdMax: 72, tickEvery: 6, tickRaw: 7, hotPerSec: 10, angleMax: Math.PI / 6, angleStep: Math.PI / 90, hitstun: 14, holdHitstun: 8, wetMul: 1.25 }
// the visor laser runs on the Homelander / Superman LASER GAUGE driver (beam.js): Homelander's numbers (max = holdMax 72 frames
// of beam, drain 1, refill 0.5 / frame, 1 s re-fire cooldown, 2.5 s overheat lockout, 12-frame minimum burst, lock-on, Up / Down
// sweep ±0.62 rad). Damage stays Enoch's (7 raw every 6 held frames → ≤ 84 raw per full gauge).
export const LASER = { max: 72, drain: 1, refill: 0.5, cooldown: 60, overheat: 150, minBurst: 12, sweep: 0.026, sweepCap: 0.62 }
// WALLS (one at a time, either element; Frozone's Ice Wall is the model). ICE WALL: solid crystal — blocks bodies, eats 3
// enemy projectiles, erupting under a grounded foe = one launching hit; lays an ICE patch at its foot. FIRE WALL: a flame
// column — not solid, burns anyone inside (8 raw every 15 frames, chip on block), burns away up to 3 enemy projectiles; lays a
// FIRE patch at its foot. A wall of the other element raised on top of the first = a STEAM BURST (the fire+ice reaction).
export const WALLS = {
  ice:  { ahead: 96, w: 30, h: 128, rise: 8, life: 480, hp: 3, raw: 60, hitstun: 26, kbx: 2, kby: -12, patch: 70 },
  fire: { ahead: 110, w: 44, h: 140, rise: 8, life: 360, hp: 3, tickEvery: 15, tickRaw: 8, hitstun: 10, patch: 80 },
}
export const WALL_STEAM = { raw: 45, w: 120, h: 150 }
// CHANNEL (hold Down + Charge = cool down, Up + Charge = heat up): rooted in place, the thermal meter moves `rate` / frame
// toward ±`to` (inside the zone, short of an overload); any hit or release ends it.
export const CHANNEL = { rate: 0.75, to: 70 }
// LASTING EFFECTS on the opponent (2026-11-16). Every FIRE hit adds BURN, every ICE hit adds CHILL (1 per clean special hit,
// less for beam ticks / wall ticks / standing in his fire). Nothing happens on the first hit: from 2 stacks up
//   BURN  = health decay: burnRaw × (stacks − 1) every burnEvery frames;
//   CHILL = slower movement: −slowPer per stack above 1 (5 stacks = 52 % speed); reaching `max` stacks = the ICE BOX: frozen
//           solid for boxFrames, then the chill is spent (boxCd before he can be boxed again).
// Stacks last `life` frames after the last hit, then fall by one every `decay` frames. THE COMBINATION: fire on a target with
// ≥ comboAt chill = a STEAM SHOCK (shockRaw × chill, the chill is spent); ice on a target with ≥ comboAt burn = a QUENCH
// (quenchRaw × burn, the burn is spent). His opponent's health bar glows red (burn) / blue (chill) by the stacks.
export const STATUS = { max: 5, comboAt: 2, life: 600, decay: 120, burnEvery: 30, burnRaw: 3, slowPer: 0.12, boxFrames: 120, boxCd: 240,
  shockRaw: 14, quenchRaw: 10, beamTick: 0.34, wallTick: 0.5, patchTick: 0.25, hit: 1 }
// FIRE / ICE TWINS: outside the balance band his element follows his temperature (Down / Up + Charge to channel it):
//   hot (≥ +25):  Ice Blast → FIRE SHARD (a fireball) · Frost Floor → FLAME FLOOR · his dash / slide leave FIRE
//   cold (≤ −25): Heat Lens → FROST LENS (the ice laser) · his dash / slide leave ICE
export const TWIN = { trailEvery: 3, trailW: 60 }
// AIR SLIDE (jump, then double-tap): he pours a slab of his element under his feet and slides along it — ICE (an icicle slab)
// or, when hot, FIRE (a flame streak). THE AIR CHAIN: during the slide or just after it, Jump = a HOP (even with no air jumps
// left) that re-arms the slide — slide → hop → slide → hop … Each link gets harder: the hop is lower (× hopDecay), the slide
// shorter (− shrink a link), and the hop window tighter (hopWindow − windowStep a link: 40, 34, 28, 22, 16, 10 frames), so 4-5
// links are comfortable and the 6th (chainMax) is the last; landing resets the chain. A double-tap without a hop / jump in
// between does nothing. Passing through the opponent = one hit (raw 40) that chills / burns. Down angles it down.
export const AIR_SLIDE = { chainMax: 6, speed: 13, frames: 30, shrink: 0.1, minFrames: 14, drop: 1.2, steep: 6, raw: 40, hitstun: 18, kbx: 5, kby: -6,
  life: 420, thermal: 6, carry: 0.6, maxRails: 6, hopVy: -14, hopDecay: 0.88, hopWindow: 40, windowStep: 6 }
// FIRE CAGE: burn at STATUS.max traps the foe in a column of fire (held, burning) — the fire twin of the ICE BOX.
export const CAGE = { frames: 120, every: 12, raw: 5, cd: 300 }
export const SCORCH = { ahead: 120 }
export const CONDENSE = { speed: 4, life: 150, w: 34, h: 34, handY: 70, steamRaw: 70, hailRaw: 60, hailSpeed: 9 }
export const TIDE = { burstRaw: 30 }
// METEORS (Up + Special): ICE = ONE giant ice SPIKE dropped point-first on the foe's spot: a hit FREEZES them and the ice
// climbs up over them from the feet (the shared freeze, `freeze` frames), then shatters into chunks + an ICE patch.
// HOT = the FIRE RAIN: he raises his fist, a fire jet goes up, and `n` comets rain down around the foe for ~2.5 s at
// hashed (random-looking, deterministic) times and spots, re-aimed at wherever the foe is when each one appears.
export const METEOR = { from: 560, vy0: 8, grav: 1.1, vx: 0,
  ice:  { n: 1, raw: 90, radius: 56, hitstun: 30, kbx: 1, kby: 0, patch: 140, size: 240, w: 74, freeze: 75, chill: 2 },
  fire: { n: 18, raw: 12, radius: 40, hitstun: 10, kbx: 2, kby: -3, patch: 80, size: 54, spread: 150, every: 7, jitter: 11, vx: 3, burn: 0.4, patchEvery: 4 } }
// SNOWMAN (Back + Charge): an ice sculpture ahead — a SOLID wall (bodies stop, it eats `hp` enemy shots) for `life` frames;
// it melts (`melt` frames of sagging + dripping) into a WATER puddle; standing in / next to fire melts it `fireMelt`× faster.
export const SNOWMAN = { ahead: 104, w: 58, h: 124, rise: 14, life: 720, hp: 5, melt: 90, fireMelt: 4, patch: 100 }
// MELTING: his ice that runs out (ice patches, walls, slabs, the snowman) turns into a WATER puddle (`width` of the ice) that
// later evaporates; the last `warn` frames of ice show it melting (thinner, dripping).
// DOUBLE-TAP = his DASH (it leaves a streak of ice — fire when hot); KEEP HOLDING the direction for `holdFrames` and the
// dash turns into the GROUND SLIDE: a glide that turns the floor under him to ICE (FIRE when hot), for as long as it's held
// (at least `minFrames`). On his own ice / fire the double-tap glides straight away, as before.
// MODES (owner's design): he starts in NO MODE — plain attacks only, no special abilities. Down + Charge = ICE MODE,
// Up + Charge = FIRE MODE: one press, instant, paid from the ENERGY bar (`cost`; no other bar — the old thermal gauge is
// gone: his temperature is pinned to the mode). Pressing the mode he's already in drops back to no mode (free).
// Holding Charge only ever charges energy.
export const MODE = { cost: 15, pin: 30 }   // pin ±30: past the old balance band (twins on), short of the old own-zone bonus (no ×1.15)
// THE SLICE: his dash and his glide go THROUGH the opponent (both elements) and cut them once per pass —
// ice: chill + an ice burst; fire: burn + a flame burst.
export const SLICE = { raw: 30, hitstun: 26,   // long enough to link a follow-up after the dash
  kbx: 3, kby: -3, chill: 1, burn: 1, reach: 70 }
export const GROUND_SLIDE = { minFrames: 26, holdFrames: 12 }
// HIS FLOOR vs the opponent: on his ICE they lose `raw` every `every` frames (+ chill) and are slid off toward the nearest
// edge at `push` px / frame; his FIRE already burns (the element's DoT + burn).
export const ICE_FLOOR = { every: 20, raw: 4, chill: 0.25, push: 3 }
// AIR SLABS are SOLID for their life: anyone can land on them (one-way platforms); the opponent who lands on one is hurt
// (raw, chill / burn) and SHOVED off its edge; rising into one from below they bonk their head (no passing through).
export const SLAB = { raw: 22, hitstun: 14, shoveVx: 7, shoveVy: -5, cd: 30, thick: 14, minW: 48 }
export const MELT = { width: 0.8, warn: 150, calm: 60 }
// patch lifetimes (frames) — longer than the shared element defaults: his ice / fire stay on the stage a long time
export const PATCH_LIFE = { ice: 900, fire: 600, water: 540 }
export const DISC = { hp: 80, life: 300, w: 110, height: 26, ahead: 40 }
export const GLIDE = { iceMul: 1.8, fireMul: 2.3, run: 8, maxFrames: 240, thermalPerSec: 6, trailW: 64, trailEvery: 3, fireSteer: 0.5, atkBonus: 1.10,
  rampVy: -15, rampVx: 0.8, turnFrames: 8 }
export const GUARD_CANCEL = { thermal: 25, invuln: 8, cooldown: 600 }
export const METER = { onHit: 0.10, onTaken: 0.06 }       // super meter (f.energy) from damage dealt / taken (stored raw)
export const SUPERS = {
  absoluteZero: { name: 'ABSOLUTE ZERO', damageType: 'blunt', total: 150, contacts: [{ at: 30, raw: 55 }, { at: 46, raw: 55 }, { at: 62, raw: 55 }, { at: 78, raw: 55 }, { at: 110, raw: 110 }], freeze: 42 },
  flashPoint:   { name: 'FLASH POINT', damageType: 'energy', total: 170, beamFrom: 20, beamTo: 140, tickEvery: 6, tickRaw: 10, flareAt: 150, flareRaw: 140 },
  thermalShock: { name: 'THERMAL SHOCK', damageType: 'blunt', total: 160, contacts: [{ at: 40, raw: 90 }, { at: 80, raw: 120 }, { at: 125, raw: 180 }], freeze: 30 },
}
export const SUPER_LOCK = 180                              // the thermal meter is locked for 3 s after a super
export const ALL_MOVES = { ...ENOCH_MOVES, ...ENOCH_SPECIALS }

// frame timelines (elapsed tick → strip frame), generated from each move's own frame data: the wind-up frames spread over
// the startup, the strip's HIT frame (tools/enoch/build_sprites.py HIT) lands on the active / release frame, and the rest
// spread over the recovery. Every attack plays its whole strip.
export function timeline(m, a) {
  const N = a?.frames || 1, H = Math.min(a?.hit ?? Math.min(1, N - 1), N - 1)
  const S = Math.max(1, m.releaseAt ?? m.startup), E = S + Math.max(1, m.active || 1), T = E + Math.max(1, m.recovery || 1)
  const tl = []
  for (let i = 0; i < H; i++) tl.push([Math.floor(i * (S - 1) / H), i])
  tl.push([S - 1, H])
  for (let j = H + 1; j < N; j++) tl.push([E + Math.floor((j - H - 1) * (T - E) / (N - H)), j])
  return tl.filter((e, k) => k === 0 || e[0] > tl[k - 1][0])
}
export const TIMELINE = Object.fromEntries(Object.entries(ALL_MOVES).map(([k, m]) => [k, timeline(m, ENOCH_ANIM[m.strip])]))

export const enoch = {
  rosterKey: 'enoch', name: 'Enoch', displayName: 'Enoch', universe: 'the_incredibles',
  color: '#ff9a3c', series: 'The Incredibles', era: 'Tribute fighter — region recolour of the supplied GBA Frozone sheet',
  tagline: 'Where ice meets fire.', introTitle: 'ENOCH', archetype: 'Elemental Controller / Trail Glider', difficulty: 5,
  bio: 'One of the people who helped build Multiverse Smash. He took Frozone\'s ice, added a visor that burns, and learned that the real power is what happens where the two meet.',
  contributor: true,
  primary: 'zoner', secondary: ['setplay', 'all-rounder'], archetypes: ['zoner', 'setplay', 'all-rounder'],
  traits: { hasEnergy: true, energyType: 'thermal', energyName: 'Super', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Super', color: '#ffd27a' },
  // light weight (the brief's designed weakness); speed 92 (< the 98 teleport tier → the double-tap stays a dash)
  stats: { maxHealth: 980, maxEnergy: 100, attack: 84, defense: 62, speed: 92, jumpPower: 24, maxJumps: 2, weight: 0.85,
    dashSpeed: 26, dashDuration: 14, dashCooldownMax: 24 },
  hasSprites: true, spriteScale: ENOCH_SCALE, spriteSheet: ENOCH_ANIM.idle.sheet, portrait: './assets/enoch/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequencePool: [['intro', 'introSettle']],
  basic_attacks: { light: ENOCH_MOVES.jab, heavy: ENOCH_MOVES.heavy, crouchLight: ENOCH_MOVES.low, upAttack: ENOCH_MOVES.rise,
    airAttack: ENOCH_MOVES.air, downAir: ENOCH_MOVES.air,
    grab: { damage: dmg(45), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 10, throwForceY: -5, damageType: 'grab' } },
  specials: {},
  ultimate: { name: 'ABSOLUTE ZERO / FLASH POINT', cost: 100, description: 'The super changes with the thermal meter.' },
  animationData: {
    ...ENOCH_ANIM,
    ...Object.fromEntries(Object.entries(ALL_MOVES).map(([k, m]) => [k, { ...ENOCH_ANIM[m.strip], frameTimeline: TIMELINE[k] || [[0, 0]] }])),
    // ICE STANCE moves (sprite.js plays 'fz_' + the move key while a Frozone-kit attack runs) + the ICE STANCE ultimate's poses
    ...Object.fromEntries(Object.entries(FZ_STRIP).map(([k, st]) => ['fz_' + k, { ...ENOCH_ANIM['fz' + st.slice(3)], frameTimeline: FZ_TIMELINE[k] || [[0, 0]] }])),
    ultCast: { ...ENOCH_ANIM.fzUlt, frameTimeline: [[0, 0], [10, 1]] }, ultShatter: { ...ENOCH_ANIM.fzUlt, frameTimeline: [[0, 1], [16, 2]] },
    ultSkate: ENOCH_ANIM.ultSkate, ultBrake: ENOCH_ANIM.ultBrake,
    // the METEOR casts: fist thrown up and HELD (the rising palm's raised-fist frame) while the sky answers
    meteor: { ...ENOCH_ANIM.atkRise, frameTimeline: [[0, 1], [8, 2], [34, 3]] }, fireMeteor: { ...ENOCH_ANIM.atkRise, frameTimeline: [[0, 1], [8, 2], [44, 3]] },
  },
}
