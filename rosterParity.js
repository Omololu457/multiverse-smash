// ROSTER PARITY — per-character OUTGOING damage boost (2026-11-13, owner request: the recent Power Rangers and
// One Piece fighters "do very little damage"). Applied once, at the shared damage choke-point
// (combat.applyScaledDamage), to every hit whose attacker is listed: melee, chip, grabs, projectiles, kit
// world-damage (W.damage), supers and burns. Every unlisted fighter returns 1 → byte-identical damage.
// Stacks on top of the per-kit data scales (SPD_*_DAMAGE_SCALE / KRYBOT_ / LUFFY_ = 1.7), which fixed the
// authoring-scale gap; this table is the extra "hit harder" lever. One number per fighter, tune here.
//
// 2026-11-15 second pass (owner: Rangers / Dino Rangers / One Piece / Incredibles still "super weak"). Retuned from a
// LIVE probe (tools/balance/roster_power_probe.mjs: real first-hit Light/Heavy vs a fixed dummy) against a roster
// baseline of HP ~1155 · Light ~26 · Heavy ~52, landing each fighter a little ABOVE that, leaning into identity:
// strength fighters (MMPR Black, Mr. Incredible, Luffy, Arlong, SPD Pink/Blue) hit hardest; speedsters (Dash, SPD
// Yellow, MMPR Pink, Frozone) trade some per-hit damage for speed. HP / speed live in each <char>Data.js stats.
export const ROSTER_DAMAGE_BOOST = Object.freeze({
  // S.P.D.
  spd_red: 1.6, spd_blue: 1.45, spd_green: 1.5, spd_pink: 1.43, spd_yellow: 1.38, krybot: 1.6,
  // Mighty Morphin (Dinozord) Rangers
  mmpr_pink: 1.36, mmpr_black: 1.48, mmpr_white: 1.46, green_ranger: 1.49,
  // One Piece
  luffy: 1.42, zoro: 1.3, sanji: 1.48, buggy: 1.35, arlong: 1.42,
  // The Incredibles
  violet: 1.31, dash_parr: 1.36, elastigirl: 2.1, syndrome: 1.11, frozone: 1.11, mr_incredible: 1.25,
})
export function rosterDamageBoost(attacker) {
  if (!attacker) return 1
  return ROSTER_DAMAGE_BOOST[(attacker.rosterKey || '').toLowerCase()] || 1
}
