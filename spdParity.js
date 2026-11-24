// spdParity.js — S.P.D. squad parity with RED (2026-11-23, owner: "edit the SPD Rangers to kind of mimic the Red Ranger so
// they're just as fast — they have their own move sets, but they're very similar to Red Ranger").
// Data only; every S.P.D. data file applies it to ITS OWN tables at load. Each Ranger keeps their own moves, specials and
// identity; what they take from Red is his PACE:
//   • movement — Red's walk, jump, weight and dash (and never less HP than his 1200)
//   • tempo    — their shared normals (Jab / Heavy launcher / Rising kick / Air kick / Air ↓) run on Red's frame data,
//                never slower or weaker than his; their blaster shots fire on his Delta Blaster timing (ground 10 f, air 8 f)
//   • teleport — Blue / Green / Pink's double-tap teleport (groundTeleport.js) goes Red's blink distance (22 % of the
//                1280 px screen = 282 px) on his 3 / 5 / 3 timing, free, ~2 per 90 f like his two charges
// Damage tier: rosterParity.js ROSTER_DAMAGE_BOOST puts every S.P.D. Ranger on Red's 1.6.
export const RED_STATS = Object.freeze({ maxHealth: 1200, speed: 88, jumpPower: 31, weight: 0.9, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 })
export const RED_TELEPORT = Object.freeze({ distance: 282, cost: 0, cooldown: 45, startup: 3, transit: 5, recovery: 3 })

// Red's frame data for the slots every S.P.D. kit shares (spdRedData.js SPD_RED_MOVES)
const RED_TEMPO = { light: [5, 2, 8, 40], heavy: [12, 3, 20, 85], up: [9, 4, 18, 80], air: [4, 5, 12, 65], down_air: [8, 6, 14, 60] }   // [startup, active, recovery, damage]
const RED_SHOT = { ground: [10, 1, 14], air: [8, 1, 12] }

// stats → Red's movement; HP is max(own, Red's) so nobody loses health
export function redStats(stats) {
  const { maxHealth, ...move } = RED_STATS
  return { ...stats, ...move, maxHealth: Math.max(stats?.maxHealth || 0, maxHealth), speed: Math.max(stats?.speed || 0, move.speed) }
}

// moves → Red's tempo on the shared normals + his blaster timing on their shots (never SLOWER than they already were)
export function redTempo(moves, { shot, airShot } = {}) {
  const fit = (m, [s, a, r, d]) => { if (!m) return; m.startup = Math.min(m.startup, s); m.active = Math.max(m.active, a); m.recovery = Math.min(m.recovery, r); if (d) m.damage = Math.max(m.damage || 0, d); m.redTempo = true }
  for (const [k, t] of Object.entries(RED_TEMPO)) fit(moves[k], t)
  if (shot) fit(moves[shot], RED_SHOT.ground)
  if (airShot) fit(moves[airShot], RED_SHOT.air)
  return moves
}

// ROUND RESET: the shared revertGoku stamps speed 84 / dash 16 on every fighter at round start (see arlongState.js);
// Red re-applies his own stats right after (spdRedRoundReset) — the rest of the squad now does the same, so they
// actually move at Red's pace. Runs next to spdRedRoundReset in game.js; no-op for anyone else.
const SQUAD = new Set(['spd_blue', 'spd_green', 'spd_pink', 'spd_yellow'])
export function spdParityRoundReset(f) {
  if (!f || !SQUAD.has(f.rosterKey) || !f.stats) return
  f.baseSpeed = f.speed = f.stats.speed
  f.dashSpeed = f.stats.dashSpeed
}
