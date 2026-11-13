// buggyData.js — Buggy the Clown: frame data + roster entry. Frame data is frame-exact (startup / active /
// recovery in 60fps simulation frames, the `frameExact` path in combat.startMove). Block advantage is set by
// blockstun with the engine's measured offset (same formula as Zoro): adv = blockstun − (active − 1 + recovery) − 2.
// Every move carries a `damageType` ("slash" | "blunt" | "projectile" | "energy" | "grab") — see damageTypes.js.
import { BUGGY_ANIM } from './buggySprites.js'

const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 70, rangeY: 50, frameExact: true, damageType: 'slash', ...extra })
const adv = (a, active, recovery) => a + (active - 1) + recovery + 2

// NORMALS (no Chop). Ranges are px of reach in front of the 48px body box.
export const BUGGY_MOVES = {
  light:    n(38, 5, 3, 9,   { blockstun: adv(+1, 3, 9),  hitstun: 17, rangeX: 66, knockbackX: 2 }),                  // Jab, knife     +1
  bSlash:   n(60, 8, 3, 14,  { blockstun: adv(-3, 3, 14), hitstun: 21, rangeX: 80 }),                                 // Knife slash    −3
  heavy:    n(85, 12, 4, 22, { blockstun: adv(-6, 4, 22), hitstun: 30, rangeX: 92, rangeY: 70, knockbackX: 2,         // Heavy carve    −6, launches
             launcher: true, launchVy: -12, selfVy: 0 }),
  bLow:     n(45, 7, 3, 13,  { blockstun: adv(-2, 3, 13), hitstun: 18, rangeX: 86, rangeY: 30, hitLevel: 'low', bx: { boxY: 66 } }),   // Low knife
  bKick:    n(55, 8, 3, 14,  { blockstun: adv(-2, 3, 14), hitstun: 20, rangeX: 72, damageType: 'blunt' }),            // Clown kick
  up:       n(75, 10, 4, 20, { blockstun: adv(-8, 4, 20), hitstun: 26, rangeX: 70, rangeY: 150, launcher: true,      // Acrobatic kick (anti-air)
             launchVy: -26, selfVy: 0, damageType: 'blunt', bx: { boxY: -78 } }),
  air:      n(55, 6, 4, 12,  { blockstun: 12, hitstun: 20, rangeX: 76, rangeY: 60, knockbackX: 3, knockbackY: -2 }),    // Air knife (jump-in)
  down_air: n(50, 8, 4, 16,  { blockstun: 12, hitstun: 20, rangeX: 84, rangeY: 150, knockbackY: 9, bx: { boxY: 40, centered: true } }),
  bWake:    n(70, 6, 4, 24,  { blockstun: adv(-12, 4, 24), hitstun: 24, rangeX: 96, knockbackX: 8, invuln: 6, bx: { centered: true, boxY: 10 } }),   // Wake-up reversal

  // SPECIALS (Chop). `bg` = Buggy's per-move descriptor (read by buggyState.tickBuggy). noHit = the body's
  // hitbox never hits; the damage comes from the part / projectile the move launches.
  bCannon:   n(0, 10, 2, 16, { cost: 18, category: 'special', isSpecial: true, bg: { kind: 'cannon', noHit: true, spawnAt: 9 } }),
  bStab:     n(0, 2, 2, 8,   { bg: { kind: 'stab', noHit: true, spawnAt: 1 } }),                                         // hand follow-up (Buggy points)
  bFestival: n(0, 8, 1, 10,  { cost: 25, category: 'special', isSpecial: true, bg: { kind: 'festival', noHit: true, spawnAt: 8 } }),
  bBall:     n(0, 16, 2, 22, { cost: 22, category: 'special', isSpecial: true, damageType: 'blunt', bg: { kind: 'ball', noHit: true, spawnAt: 16 } }),
  bEscape:   n(0, 2, 18, 8,  { cost: 15, category: 'special', isSpecial: true, invuln: 20, bg: { kind: 'escape', noHit: true, travel: [2, 20] } }),
  bFan:      n(0, 9, 2, 16,  { cost: 12, category: 'special', isSpecial: true, bg: { kind: 'fan', noHit: true, spawnAt: 9 } }),
  bCape:     n(0, 3, 14, 16, { cost: 10, category: 'special', isSpecial: true, bg: { kind: 'cape', noHit: true, window: [3, 17], reflect: 8 } }),
  bHead:     n(0, 8, 1, 12,  { cost: 8, category: 'special', isSpecial: true, bg: { kind: 'head', noHit: true, spawnAt: 7 } }),
  bRecall:   n(0, 0, 1, 10,  { bg: { kind: 'recall', noHit: true } }),
  bStagger:  n(0, 0, 1, 59,  { bg: { kind: 'stagger', noHit: true } }),                                                   // Chop Stagger: 60f reassembly

  // SUPER — CHOP-CHOP SPECIAL: BUGGY BALL BARRAGE (100 Chop). Scripted timeline (buggyState.tickSuper):
  // 4 Buggy Balls (55 each) + 3 hand stabs (20 each) + the knife-ball rush (90) = 370 raw.
  bSuper:    n(0, 14, 104, 20, { cost: 100, category: 'ultimate', isUltimate: true, invuln: 14,
               bg: { kind: 'super', noHit: true, balls: [18, 38, 58, 78], stabs: [28, 48, 68], rushAt: 92, ballDmg: 55, stabDmg: 20, rushDmg: 90 } }),
}

// Source-frame index at exact elapsed sim frames (presentation follows the simulation, never drives it).
export const BUGGY_TIMELINES = {
  light: [[0, 0], [5, 1]], bSlash: [[0, 0], [8, 1]], heavy: [[0, 0], [12, 1]], bLow: [[0, 0], [7, 1], [10, 2]],
  bKick: [[0, 0], [8, 1]], up: [[0, 0], [10, 1]], air: [[0, 0], [6, 1]], down_air: [[0, 0]],
  bWake: [[0, 0], [4, 1], [8, 2], [12, 0], [16, 1], [20, 2]],
  bCannon: [[0, 0], [9, 1], [14, 2]], bStab: [[0, 0]], bFestival: [[0, 0], [6, 1]], bBall: [[0, 0], [6, 1], [12, 2]],
  bEscape: [[0, 0], [6, 1]], bFan: [[0, 0], [9, 1]], bCape: [[0, 0]], bHead: [[0, 0]], bRecall: [[0, 0], [5, 1]],
  bSuper: [[0, 0], [14, 1], [18, 2], [38, 1], [58, 2], [78, 1], [88, 3], [94, 4], [100, 5], [106, 3], [112, 4]],
  bStagger: [[0, 0], [20, 1], [40, 0]],
}

const ANIM = Object.fromEntries(Object.entries(BUGGY_ANIM).map(([k, a]) => [k, BUGGY_TIMELINES[k] ? { ...a, frameTimeline: BUGGY_TIMELINES[k] } : a]))
ANIM.transform = ANIM.intro
// MASKED ANIM SETS — one per detached-part bitmask (1 head · 2 hand · 4 foot). Masked strips carry 7 rows; the
// set for mask m points every masked action at row m (sourceY). fighter._skinAnim is switched by buggyState
// (presentation only — the sheet path never changes, so the frame index does not reset on a swap).
export const BUGGY_MASK_ANIM = Array.from({ length: 7 }, (_, m) => m === 0 ? ANIM :
  Object.fromEntries(Object.entries(ANIM).map(([k, a]) => [k, a.maskRows ? { ...a, sourceY: m * a.height } : a])))
export const BUGGY_ANIMS = ANIM
// Victory variant 2 (cape + knives fanned): the same set with `win` pointing at the win2 strip (unmasked).
export const BUGGY_WIN2_ANIM = { ...ANIM, win: ANIM.win2 }
// SKINS: Buggy's presentation swaps fighter._skinAnim between the sets above (masked rows / win2). With an alt-colour
// skin (fighter._recolorTag, set by game.js applySkin) every swap must keep the recoloured sheets: retag each set's
// sheet paths `<name>__<tag>.png` (tools/buggy_build/gen_buggy_skins.py keeps every layout, incl. the 7 mask rows).
// `set` null = the base set. No tag → returns `set` unchanged (default skin byte-identical). Cached → stable identity.
const _skinSets = new Map()
export function buggySkinSet(set, tag) {
  if (!tag) return set
  const base = set || ANIM
  let byTag = _skinSets.get(base); if (!byTag) _skinSets.set(base, byTag = {})
  return byTag[tag] || (byTag[tag] = Object.fromEntries(Object.entries(base).map(([k, a]) => [k, a?.sheet ? { ...a, sheet: a.sheet.replace(/\.png$/i, `__${tag}.png`) } : a])))
}

export const buggy = {
  rosterKey: 'buggy', name: 'Buggy', displayName: 'Buggy the Clown', hudName: 'Buggy', universe: 'one_piece', color: '#e0582a',
  // METADATA (phase 9). Universe "One Piece" = the existing `one_piece` group, next to Zoro and Luffy.
  difficulty: 4, archetype: 'Trickster / Part Zoner',
  tagline: 'Bara Bara no Mi!',
  bio: 'Captain of the Buggy Pirates and former cabin boy on the Oro Jackson. The Chop-Chop Fruit made him immune to blades and fully detachable. Half his reputation is luck, the other half is knives.',
  portrait: './assets/buggy/portrait.png', hasSprites: true, spriteScale: 2.3 / 1.18,   // same GBA ripper/scale as Zoro & Luffy
  spriteSheet: BUGGY_ANIM.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
  primary: 'zoner', secondary: ['melee'], archetypes: ['zoner', 'trickster'],
  traits: { hasEnergy: true, energyType: 'chop', energyName: 'Chop', mobility: 'medium', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Chop', color: '#e0582a' },
  // Brief: walkSpeed 5.0 · runSpeed 7.2 · jumpForce 10.0 · weight 0.9. Engine mapping (physics.js):
  //   walk px/f = 4.5 + (speed − 78)/20 × 5  → speed 80 = 5.0 px/f
  //   ground dash = clamp(dashSpeed × 0.55, 8, 16) → the engine floor is 8 px/f (7.2 is below it; dashSpeed 13)
  //   jumpPower ≈ jumpForce × 2.667 (Zoro: 10.5 → 28) → 27 · weight 0.9 → knockback taken ÷ 0.9 (buggyKnockback)
  stats: { maxHealth: 950, maxEnergy: 100, attack: 80, defense: 78, speed: 80, jumpPower: 27, maxJumps: 1, weight: 0.9,
    dashSpeed: 13, dashDuration: 10, dashCooldownMax: 30 },
  movement: { crouchIdle: true },
  introSequence: ['intro'],
  basic_attacks: { light: BUGGY_MOVES.light, heavy: BUGGY_MOVES.heavy, crouchLight: BUGGY_MOVES.bLow, upAttack: BUGGY_MOVES.up,
    airAttack: BUGGY_MOVES.air, downAir: BUGGY_MOVES.down_air,
    grab: { damage: 30, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 7, throwForceY: -4, damageType: 'grab' } },
  specials: {},
  ultimate: { name: 'Chop-Chop Special: Buggy Ball Barrage', cost: 100 },
  animationData: ANIM,
}
