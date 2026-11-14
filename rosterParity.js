// ROSTER PARITY — per-character OUTGOING damage boost (2026-11-13, owner request: the recent Power Rangers and
// One Piece fighters "do very little damage"). Applied once, at the shared damage choke-point
// (combat.applyScaledDamage), to every hit whose attacker is listed: melee, chip, grabs, projectiles, kit
// world-damage (W.damage), supers and burns. Every unlisted fighter returns 1 → byte-identical damage.
// Stacks on top of the per-kit data scales (SPD_*_DAMAGE_SCALE / KRYBOT_ / LUFFY_ = 1.7), which fixed the
// authoring-scale gap; this table is the extra "hit harder" lever. One number per fighter, tune here.
export const ROSTER_DAMAGE_BOOST = Object.freeze({
  spd_red: 1.3, spd_blue: 1.3, spd_green: 1.3, spd_pink: 1.3, krybot: 1.3,
  luffy: 1.3, zoro: 1.3, sanji: 1.3, buggy: 1.3, arlong: 1.3,
})
export function rosterDamageBoost(attacker) {
  if (!attacker) return 1
  return ROSTER_DAMAGE_BOOST[(attacker.rosterKey || '').toLowerCase()] || 1
}
