// speedStrengthBuff.js — owner buff 2026-11-24: "buff Toji, Maki, and all of the Demon Slayer characters except for Nezuko
// in terms of speed and strength … make them amongst the fastest … up there with people like Omni-Man … Flash and Killua
// only in speed".  Stacks on top of rosterParity.js (OG_TABLE / WEAK_TIER_BUFF / ROSTER_DAMAGE_BOOST):
//   spd → walk + dash speed (physics.js via ogSpeedMult)     dmg → every hit they deal (rosterDamageBoost)
// Reference (live probe, px/frame walk / dash): Invincible 16.1 / 21.1 (fastest), Rick 15.8, Viltrum Omni-Man 6.9 on foot (he flies).
// Speeds are set from a LIVE probe of the whole roster (harness/roster_speed_probe.mjs) so each lands in the top tier.
// Unlisted fighters return 1 → byte-identical behaviour for everyone else (Nezuko deliberately left out).
export const SPEED_STRENGTH_BUFF = Object.freeze({
  // Jujutsu Kaisen — speed + strength
  toji:    { spd: 1.51, dmg: 1.6 },   // walk 10.28 → 15.5
  maki:    { spd: 1.42, dmg: 1.6 },   // walk 10.58 → 15.0
  // Demon Slayer (not Nezuko) — speed + strength
  zenitsu: { spd: 1.71, dmg: 1.6 },   // walk 9.25 → 15.8 (Thunder Breathing: fastest Demon Slayer)
  rengoku: { spd: 1.43, dmg: 1.6 },   // walk 10.49 → 15.0
  shinobu: { spd: 1.50, dmg: 1.6 },   // walk 10.21 → 15.3
  inosuke: { spd: 1.51, dmg: 1.6 },   // walk 9.94 → 15.0
  // speed only
  flash:   { spd: 1.70, dmg: 1 },   // walk 9.73 → 16.5 — the fastest on the roster
  killua:  { spd: 1.66, dmg: 1 },   // walk 9.52 → 15.8
})
const row = f => f?._squad ? null : SPEED_STRENGTH_BUFF[String(f?.rosterKey || f || '').toLowerCase()]
export const buffSpeedMult = f => row(f)?.spd || 1
export const buffDamageMult = f => row(f)?.dmg || 1
