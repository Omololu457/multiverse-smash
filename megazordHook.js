// megazordHook.js — MSV1-MEGAZORD leaf slot (no imports) so combat.js can ask the Mighty Morphin Rangers' Thunder Megazord
// (megazord.js) about damage / armor without an import cycle. Every hook is gated on the defender's `_mzOn` flag, so for every
// other fighter combat.js does exactly what it did before.
//   absorb(target, dealt, opts) → number   damage goes to the Megazord's ARMOR, never the Ranger's health (returns 0)
//   armored(defender, atk, cat) → bool      SUPER ARMOR: normal hits don't stagger it; supers / ultimates do
export const MZ_HOOK = { absorb: null, armored: null }
