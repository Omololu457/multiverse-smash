// S.P.D. Yellow Ranger (Elizabeth "Z" Delgado — S.P.D., supplied Plug & Play "Escape of the Five Fugitives" art). DATA ONLY:
// frame data, firearm numbers, the duplicate (clone) rules, Tactical Coins, the rangers.js profile, the Ninja Megazord
// assist profiles (shared falconzord.js scheduler) and the roster entry.
// Logic: spdYellowState.js (sim), spdYellow.js (command layer), spdYellowFx.js (render-only).
// Frame-by-frame rationale + exact frame IDs: docs/spd_yellow/MOVE_FRAME_MAP.md.
import { SPD_YELLOW_ANIM, SPD_YELLOW_MUZZLE } from './spdYellowSprites.js'
import { registerRangerProfile } from './rangers.js'
import { registerFalconSortie } from './falconzord.js'

// ── DOUBLE-TAP BLINK: the established shared rangers.js contract, BLINK_DEFAULTS with NO tuning overrides ──
// 22 % of the 1280 px reference screen = 282 px; 3 f wind-up / 5 f invulnerable travel / 3 f recovery; 2 charges, each
// refilling on its own 90 f timer; no crossup (stops 6 px in front); air blink allowed (keeps momentum, |vx| <= 14);
// no run / dodge reward / Energy. rangers.js sets noDash, so the engine dash never ALSO moves her (no double movement).
export const SPD_YELLOW_PROFILE = registerRangerProfile('spd_yellow', {
  ownTick: true,                       // spdYellowState.tickSpdYellow calls tickRanger itself
  team: 'S.P.D. B-Squad',
  badge: { color: '#f2d81c', accent: '#2a2a2a', emblem: 'gem' },
  morph: { alwaysMorphed: true },      // the supplied sheet has no unmorphed Z
  sprites: { streak: 'streak1', vanish: 'streak0', emblem: null },
})

// ROSTER-PARITY lever, the same convention as the other S.P.D. / MMPR Rangers: every number below is the RAW value.
export const SPD_YELLOW_DAMAGE_SCALE = 1.7
export const dmg = raw => Math.round(raw * SPD_YELLOW_DAMAGE_SCALE)

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  damageType: 'blunt', category: 'light', hitstun: 18, blockstun: 11, rangeX: 60, rangeY: 46, boxY: 14, knockbackX: 2, knockbackY: 0, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
// `melee` = a clean hit of this attack instance can award the MELEE Tactical Coin category. `echo` = recordable for the
// clone's echo (grounded melee normals only).
export const SPD_YELLOW_MOVES = {
  // J1 / J2 / J3 — fresh Light retaps on a clean hit, three stages maximum.
  light: n(17, 5, 2, 10, { hitstun: 20, blockstun: 11, rangeX: 56, melee: true, echo: true }),                                  // Snap Jab
  yJ2: n(21, 6, 2, 12, { damageType: 'slash', hitstun: 20, blockstun: 12, rangeX: 74, melee: true, echo: true }),              // Draw Thrust
  yJ3: n(28, 9, 3, 18, { damageType: 'slash', hitstun: 26, blockstun: 13, rangeX: 82, boxY: 8, knockbackX: 5, melee: true, echo: true }),   // High-Low Cut
  heavy: n(52, 13, 3, 25, { category: 'heavy', damageType: 'slash', hitstun: 34, blockstun: 14, rangeX: 92, rangeY: 54, boxY: 4, knockbackX: 4, melee: true, echo: true }),   // Cross Cut
  yLow: n(24, 8, 2, 16, { hitLevel: 'low', damageType: 'slash', hitstun: 22, blockstun: 12, rangeX: 80, rangeY: 30, boxY: 66, melee: true, echo: true }),   // Low Draw
  up: n(42, 12, 3, 22, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 58, rangeY: 104, boxY: -38, launchVy: -21, selfVy: 0, melee: true, echo: true }),   // Rising Heel
  air: n(30, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 58, boxY: 22, knockbackY: -3, melee: true }),                        // Flying Kick
  down_air: n(30, 8, 3, 17, { hitstun: 28, rangeX: 78, rangeY: 58, boxY: 22, knockbackY: -3, melee: true }),
  yFlip: n(38, 10, 4, 18, { category: 'heavy', hitstun: 30, rangeX: 84, rangeY: 52, boxY: 24, knockbackX: 5, knockbackY: -2, melee: true }),   // air Heavy: Inverted Flip Kick
  // Forward+Heavy — ACROBATIC LEAP KICK: leap -> spin -> tuck -> flying side kick (contact) -> landing set. 84 px travel.
  yAcro: n(46, 16, 4, 22, { category: 'heavy', hitstun: 32, blockstun: 14, rangeX: 86, rangeY: 56, boxY: 6, knockbackX: 7, travel: [2, 16, 6], melee: true }),
  // Back+Heavy — TURNING SWEEP: turn-tuck -> back-sweep cut.
  ySweep: n(34, 11, 3, 20, { category: 'heavy', damageType: 'slash', hitstun: 28, blockstun: 13, rangeX: 88, rangeY: 40, boxY: 40, knockbackX: 7, melee: true, echo: true }),
  // PARTNER BREAK — fresh Heavy within 12 f of a CLEAN ordinary echo hit: overhead-ready -> forward thrust, knock-away.
  yBreak: n(40, 9, 3, 22, { category: 'heavy', damageType: 'slash', hitstun: 34, blockstun: 15, rangeX: 90, rangeY: 50, boxY: 10, knockbackX: 10, knockbackY: -5, melee: true }),
  // NEUTRAL SPECIAL — the firearm hold. Body-less; the sim pins the timer while Special is held (see GUN) and swaps the
  // pose strip yPistol -> yLongHold at the draw threshold, then yPistolShot / yLongShot at release.
  yGun: n(0, 12, 1, 14, { category: 'special', isSpecial: true, noBody: true, cost: 10, gun: true }),
  // AIR NEUTRAL SPECIAL — airborne pistol (the supplied airAim0 pose). Once per airtime; gravity is never suspended.
  yAirShot: n(0, 10, 1, 12, { category: 'special', isSpecial: true, noBody: true, cost: 10, gun: true, air: true }),
  // DOWN SPECIAL — DUPLICATE: split off ONE ordinary clone (appears on frame 14).
  yClone: n(0, 14, 1, 14, { category: 'special', isSpecial: true, noBody: true, cost: 20 }),
  // FORWARD SPECIAL — SWAP: bounded position exchange with the idle clone on frame 8. No invulnerability.
  ySwap: n(0, 8, 1, 14, { category: 'special', isSpecial: true, noBody: true, cost: 10 }),
  // UP SPECIAL — NINJA INTERCEPT call pose (startup 12 = the commit boundary). Sword Finish holds 24 f recovery.
  yCall: n(0, 12, 1, 14, { category: 'special', isSpecial: true, noBody: true, call: true }),
  // CHARGE+SPECIAL — TACTICAL COIN COMMAND STANCE (grounded). Held until confirm / Guard / STANCE.life; no slow-mo.
  yStance: n(0, 1, 1, 200, { category: 'special', isSpecial: true, noBody: true, stance: true }),
  // ULTIMATE OPENER — DUPLICATE RAID: compact-pistol shot leaves on frame 20 (raw 20). Clean hit -> the sequence.
  yUltOpen: n(0, 20, 1, 50, { category: 'ultimate', isUltimate: true, noBody: true, cost: 100 }),
}
export const ECHO_KEYS = Object.keys(SPD_YELLOW_MOVES).filter(k => SPD_YELLOW_MOVES[k].echo)

// ── FIREARMS — counts are SIMULATION frames from the accepted Special press. ──
// tap -> pistol leaves on frame 12. Held: the compact pistol stays out; at drawAt (24) held frames +15 Energy is spent
// ONCE and the pose becomes the supplied long gun (yLongHold). Release before 24 -> pistol (at max(12, release)).
// Release after a paid commit -> long gun, never before longMin (30: the brace is visible >= 6 f). Held to cap (45) ->
// it resolves on its own (pistol if no commit). Without the extra 15 Energy at 24 the hold stays a pistol hold.
// An interrupted hold spends what was committed and fires nothing. Nothing fires twice: one shot per hold.
export const GUN = {
  cost: 10, release: 12, drawAt: 24, longCost: 15, longMin: 30, cap: 45,
  pistol: { raw: 28, speed: 15, lifetime: 34, hitstun: 20, blockstun: 12, knockbackX: 4, knockbackY: -1, recovery: 14, radius: 9 },
  long: { raw: 62, speed: 19, lifetime: 40, hitstun: 34, blockstun: 16, knockbackX: 9, knockbackY: -2, recovery: 30, radius: 12, lateCancel: 20 },
  air: { raw: 28, speed: 15, lifetime: 30, hitstun: 20, blockstun: 12, knockbackX: 4, knockbackY: -1, recovery: 12, radius: 9 },
  cover: { raw: 18, speed: 14, lifetime: 30, hitstun: 18, blockstun: 11, knockbackX: 3, knockbackY: -1, radius: 8 },
  ultOpen: { raw: 20, speed: 17, lifetime: 30, hitstun: 40, blockstun: 14, knockbackX: 0, knockbackY: 0, radius: 9 },
}
// Measured muzzle offsets (px from the sprite origin at source scale, facing right) — generated by the extractor.
export const MUZZLE = SPD_YELLOW_MUZZLE

// ── DUPLICATE (one ordinary clone per owner) ──
// Echo: the clone replays Z's last RECORDED grounded melee normal (ECHO_KEYS) once, from its own position, after its
// visible startup (move startup + echoLead). Echo damage = round(raw x echoScale) through the shared combo scaling.
// Relay: a clean ordinary echo hit lets Swap cancel Z's current action for relayWindow f (once per combo).
// Partner Break: a clean ordinary echo hit lets a fresh Heavy become yBreak for breakWindow f (once per combo).
// Using either closes both. The clone has no pushbox and never body-blocks; ONE opponent hit / projectile disperses it.
export const CLONE = { cost: 20, appearAt: 14, life: 300, cooldown: 120, offset: 70, echoCost: 8, echoLead: 6, echoScale: 0.6,
  echoCooldown: 20, swapCost: 10, swapAt: 8, swapMax: 420, swapCooldown: 60, relayWindow: 15, breakWindow: 12, coverAt: 14, coverRec: 12 }

// ── TACTICAL COINS (an ORIGINAL resource; cosmetic MMPR-source coin art) ──
// Max 3, 0 at round start. A cycle tracks three DISTINCT clean confirmations: melee (Z normal), gun (pistol / long gun),
// clone (an explicitly ordered ORDINARY echo). Each category awards at most one coin per cycle; when all three have
// awarded, eligibility resets resetAfter (90) frames later. Coin-funded actions never award.
export const COINS = { max: 3, resetAfter: 90, cats: ['melee', 'gun', 'clone'] }
// Command stance (Charge+Special): Left/Right select, fresh Special confirms, Guard cancels. Selection costs nothing.
export const STANCE = { life: 120, exitRecovery: 6 }
export const ORDERS = [
  { id: 'cover', name: 'COVER ME', coins: 1, energy: 8 },
  { id: 'crosswire', name: 'CROSSWIRE', coins: 1, energy: 8 },
  { id: 'breach', name: 'BREACH WINDOW', coins: 2, energy: 10 },
  { id: 'rising', name: 'RISING KICK', coins: 0, energy: 0, zord: true },        // ordinary assist cost (18 + 1 pip)
  { id: 'showcase', name: 'SHOWCASE', coins: 0, energy: 0, toggle: true },      // cosmetic ultimate presentation (spends 3 at entry)
]
export const BREACH = { life: 120, confirm: 10 }

// ── NINJA MEGAZORD ASSISTS (shared falconzord.js scheduler; data only) ──
// Keys [age, dx, dy, pose]; dx multiplied by the direction captured at commit. Intercept / Rising Kick: origin 'owner'
// (Z's centre x, feet line). Sword Finish: origin 'target' (location captured at commit) so it reaches a long-gun punish.
// No homing, no tracking, no hurtbox / pushbox. Budget: White 38 / 44 / 54 — Yellow 36 / 40 / 50.
export const ZORD_RESOURCE = { pips: 2, recharge: 210, lockout: 75, callStartup: 12, postUltLock: 120 }
export const ZORD_KIND = { intercept: 'yIntercept', rising: 'yRising', sword: 'ySword' }
registerFalconSortie('yIntercept', {
  name: 'Intercept Punch', cost: 15, origin: 'owner', laneY: 0, warn: 14, life: 54, move: 'ninja_intercept', zord: 'ninja',
  keys: [[0, -170, 0, 'step'], [10, -30, 0, 'guard'], [14, -20, 0, 'jab'], [18, -10, 0, 'punch2'], [28, -10, 0, 'ready'], [38, -10, 0, 'rear'], [54, -200, 0, 'rear']],
  contacts: [{ from: 18, to: 22, raw: 36, hitstun: 30, blockstun: 16, knockbackX: 4, knockbackY: 0, box: { w: 120, h: 70, dx: 105, dy: -50 } }],
})
registerFalconSortie('yRising', {
  name: 'Rising Kick', cost: 18, origin: 'owner', laneY: 0, warn: 12, life: 58, move: 'ninja_rising_kick', zord: 'ninja',
  keys: [[0, -170, 0, 'step'], [10, -20, 0, 'knee'], [16, -20, 0, 'crane'], [26, -20, 0, 'recover'], [38, -20, 0, 'rear'], [58, -200, 0, 'rear']],
  contacts: [{ from: 16, to: 20, raw: 40, hitstun: 34, blockstun: 16, knockbackX: 1, knockbackY: 0, launch: true, launchVy: -20, box: { w: 100, h: 130, dx: 80, dy: -80 } }],
})
registerFalconSortie('ySword', {
  name: 'Sword Finish', cost: 20, origin: 'target', laneY: 0, warn: 18, life: 64, move: 'ninja_sword_finish', zord: 'ninja',
  keys: [[0, -300, 0, 'step'], [8, -120, 0, 'draw'], [14, -120, 0, 'wind'], [20, -120, 0, 'cut'], [30, -120, 0, 'finish'], [42, -120, 0, 'ready'], [46, -120, 0, 'rear'], [64, -320, 0, 'rear']],
  contacts: [{ from: 20, to: 24, raw: 50, hitstun: 34, blockstun: 18, knockbackX: 7, knockbackY: 0, box: { w: 160, h: 110, dx: 110, dy: -55 } }],
})

// ── ULTIMATE — DUPLICATE RAID: NINJA CROSSBREAKER (frames from the confirmed opener hit) ──
// raw 20 (opener) + 30 + 30 + 35 + 30 + 30 + 45 + 50 = 270. Coins never change damage; Showcase is presentation only.
export const ULT = { total: 200, settle: 182,
  contacts: [
    { at: 24, raw: 30, who: 'dupA' },   // duplicate A: authored crossup position behind the target, High-Low Cut
    { at: 40, raw: 30, who: 'dupB' },   // duplicate B: authored front position, Cross Cut
    { at: 66, raw: 35, who: 'z' },      // Z: the supplied acrobatic leap kick (acro3 contact)
    { at: 92, raw: 30, who: 'zordPunch' },
    { at: 112, raw: 30, who: 'zordKick' },
    { at: 160, raw: 45, who: 'beam' },  // Z's braced long-gun beam
    { at: 166, raw: 50, who: 'sword' }, // Megazord sword finish — a distinct contact 6 f later
  ] }

// Frame timelines (which strip frame shows at which elapsed tick).
const timeline = {
  light: [[0, 0], [4, 1]], yJ2: [[0, 0], [5, 1]], yJ3: [[0, 0], [8, 1]], heavy: [[0, 0], [7, 1], [13, 2]],
  yLow: [[0, 0], [7, 1]], up: [[0, 0], [8, 1], [16, 2]], air: [[0, 0], [7, 1]], yFlip: [[0, 0]],
  yAcro: [[0, 0], [5, 1], [10, 2], [16, 3], [24, 4]], ySweep: [[0, 0], [10, 1]], yBreak: [[0, 0], [8, 1]],
  yPistol: [[0, 0], [6, 1]], yPistolShot: [[0, 0], [5, 1]], yLongHold: [[0, 0]], yLongShot: [[0, 0], [6, 1]], yAirShot: [[0, 0]],
  yClone: [[0, 0], [14, 1]], ySwap: [[0, 0]], yStance: [[0, 0]], yCall: [[0, 0]],
}

export const spd_yellow = {
  rosterKey: 'spd_yellow', name: 'S.P.D. Yellow Ranger', civilianIdentity: 'Elizabeth "Z" Delgado', universe: 'power_rangers',
  series: 'Power Rangers S.P.D.', era: 'S.P.D. / supplied Plug & Play "Escape of the Five Fugitives" artwork',
  tagline: 'Two of me. One plan.', archetype: 'Duplicate Gunner / Coordinator',
  bio: 'Z Delgado, S.P.D. B-Squad Yellow: street-smart, quick on the trigger, and able to split off a duplicate of herself. A compact pistol covers, a braced long gun punishes, and her duplicate echoes, swaps and relays the pressure. Tactical Coins (an original game resource using MMPR-source coin art) buy coordinated orders, and the Ninja Megazord answers a short intercept call.',
  primary: 'zoner', secondary: ['summoner'], archetypes: ['zoner', 'summoner'],
  traits: { hasEnergy: true, energyType: 'energy', energyName: 'Delta Energy', mobility: 'normal', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Delta Energy', color: '#f2d81c' },
  stats: { maxHealth: 1150, maxEnergy: 100, attack: 78, defense: 76, speed: 98, jumpPower: 26, maxJumps: 1, weight: 1, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 36 },
  hasSprites: true, spriteScale: 2.05, spriteSheet: SPD_YELLOW_ANIM.idle.sheet, portrait: './assets/spd_yellow/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: { light: SPD_YELLOW_MOVES.light, heavy: SPD_YELLOW_MOVES.heavy, crouchLight: SPD_YELLOW_MOVES.yLow, upAttack: SPD_YELLOW_MOVES.up,
    airAttack: SPD_YELLOW_MOVES.air, downAir: SPD_YELLOW_MOVES.down_air,
    grab: { damage: dmg(26), startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 5, throwForceY: -3, damageType: 'grab' } },
  specials: { neutral: { name: 'Pistol (tap) / Long Gun (hold)', cost: 10 }, down: { name: 'Duplicate', cost: 20 },
    forward: { name: 'Swap', cost: 10 }, back: { name: 'Echo (clone repeats your last normal)', cost: 8 },
    up: { name: 'Ninja Intercept (Ninja Megazord)', cost: 15 } },
  ultimate: { name: 'Duplicate Raid: Ninja Crossbreaker', cost: 100,
    description: 'Compact-pistol opener (raw 20). A clean hit starts the raid: two duplicates, Z\'s acrobatic kick, the Ninja Megazord punch → kick, then the braced long-gun beam and the Megazord sword finish (270 raw total before shared scaling).' },
  animationData: Object.fromEntries(Object.entries(SPD_YELLOW_ANIM).map(([k, a]) => [k, timeline[k] ? { ...a, frameTimeline: timeline[k] } : a])),
}
