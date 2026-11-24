// mmprParity.js — Mighty Morphin squad parity with the MMPR RED RANGER (2026-11-23, owner: "combine the Pink, Black, Green,
// White and Mighty Morphin [Red] Rangers and do the same thing" — the S.P.D. treatment: as fast as Red, own move sets but
// very similar to Red). Data only; each MMPR data file applies it to ITS OWN tables at load. Each Ranger keeps their own
// moves, specials, summons and Zords; what they take from Red is his PACE, as he actually plays:
//   • movement — Red's REAL walk / dash (his stats × the OG speed lift 1.41 in rosterParity.js: walk 92 → 130, dash 18 →
//                25.4 so clamp(dash × 0.55) × 1 equals his 9.9 × 1.41), his double jump at power 31, his dash cooldown 33;
//                never slower than they already were, never less HP than his 1200 base
//   • tempo    — the normals every MMPR kit shares (Jab / Heavy / Rising / Air / Air ↓) run on Red's frame data and are
//                never slower or weaker than his
// Damage tier: rosterParity.js ROSTER_DAMAGE_BOOST puts Pink / Black / Green / White on 1.6 (S.P.D. squad tier).
export const MMPR_RED_PACE = Object.freeze({ speed: 130, jumpPower: 31, maxJumps: 2, dashSpeed: 25.4, dashDuration: 10, dashCooldownMax: 33 })
const RED_TEMPO = { light: [4, 3, 10, 45], heavy: [8, 4, 18, 88], up: [7, 4, 16, 70], air: [5, 3, 10, 60], down_air: [9, 4, 14, 80] }   // [startup, active, recovery, damage] — characters.js red_ranger_mmpr basic_attacks

export function mmprRedStats(stats) {
  const P = MMPR_RED_PACE, s = stats || {}
  return { ...s, speed: Math.max(s.speed || 0, P.speed), jumpPower: Math.max(s.jumpPower || 0, P.jumpPower), maxJumps: Math.max(s.maxJumps || 1, P.maxJumps),
    dashSpeed: Math.max(s.dashSpeed || 0, P.dashSpeed), dashDuration: Math.max(s.dashDuration || 0, P.dashDuration),
    dashCooldownMax: Math.min(s.dashCooldownMax ?? 99, P.dashCooldownMax), maxHealth: Math.max(s.maxHealth || 0, 1200) }
}
export function mmprRedTempo(moves) {
  const fit = (m, [st, a, r, d]) => { if (!m) return; m.startup = Math.min(m.startup, st); m.active = Math.max(m.active, a); m.recovery = Math.min(m.recovery, r); m.damage = Math.max(m.damage || 0, d); m.redTempo = true }
  for (const [k, t] of Object.entries(RED_TEMPO)) fit(moves[k], t)
  return moves
}
// The squad's RED form: the OG speed lift is skipped for squad fighters (rosterParity ogRow), so his form carries the
// same real pace explicitly.
export const mmprRedFormStats = stats => ({ ...stats, ...MMPR_RED_PACE })
