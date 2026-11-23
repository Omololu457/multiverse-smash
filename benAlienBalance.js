// benAlienBalance.js: ONE global balance layer over every READY Ben 10 alien (2026-11-19).
//
// Owner: "give all of Ben 10's aliens ... a damage and health buff" (not speed).
// Ben's health bar is ONE shared pool (900–1000) for every form, against a roster median of ~1150, so "more health" for the
// aliens is a TOUGHNESS buff: a READY form's defense is × DEFENSE (it takes 1 / 1.20 of a hit, ≈ +20 % effective health, which
// puts a 950 pool at ~1140 effective, the roster median) and its damage is × DAMAGE.
// Each alien's own `mods` (aliens / <alien>.js) stay its DESIGN numbers: this layer multiplies on top at the few runtime points
// that turn mods into multipliers (fighters.applyAlien / defense re-sync, combat's READY-form damage divide, Alien X's voice
// stance, Brainstorm's dome). So every alien keeps its identity (Rath still hits hardest, Ghostfreak is still the frailest).
// Speed, weight, frame data and the human form are untouched. Albedo uses the same forms, so the mirror stays even.
// Leaf module (imports nothing). Tune here, nowhere else.
export const BEN_ALIEN_BUFF = Object.freeze({ damage: 1.35, defense: 1.20 })   // 2026-11-23 owner: "buff all of Ben 10's aliens cause they don't do enough damage" — damage 1.15 → 1.35
export const benAlienDamageMult = mods => (mods?.damage ?? 1) * BEN_ALIEN_BUFF.damage
export const benAlienDefenseMult = mods => (mods?.defense ?? 1) * BEN_ALIEN_BUFF.defense
