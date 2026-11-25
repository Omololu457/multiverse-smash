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
export const BEN_ALIEN_BUFF = Object.freeze({ damage: 1.5, defense: 1.30, speed: 1.15 })
// 2026-11-23 owner: "buff albedo and Ben 10 … they really need serious buffs … someone who's a speed alien should get more
// speed. Everyone should just get more base speed, especially Alien X". Damage 1.15 → 1.35 → 1.5, defense 1.20 → 1.30,
// + a speed layer for every alien; on top of it the per-alien SPEED_BONUS (speedsters / Alien X) below.
export const BEN_ALIEN_SPEED_BONUS = Object.freeze({ alienx: 1.60, megawhatt: 1.10, brainstorm: 1.12, ghostfreak: 1.10 })
// the HUMAN form (Ben and Albedo alike): harder, tougher, quicker (applyBen10VariantStats / revert)
export const BEN_HUMAN_BUFF = Object.freeze({ damage: 3.40, defense: 1.30, speed: 1.15, hp: 2.30 })   // hp: × on the shared Omnitrix health pool. 2026-11-24: was {1.30, 1.15, 1.12, 1.25} → Ben / Albedo 0 % AI-vs-AI (10 games vs luffy/zoro/mr_incredible/gojo_shinjuku/spd_red); now 50 % / 50 %
// ALIEN X (owner 2026-11-23: "especially Alien X") — on top of the global alien layer: tougher and harder-hitting
export const BEN_ALIEN_DEFENSE_BONUS = Object.freeze({ alienx: 1.40 })
export const BEN_ALIEN_DAMAGE_BONUS = Object.freeze({ alienx: 1.25 })
export const benAlienDamageMult = (mods, key) => (mods?.damage ?? 1) * BEN_ALIEN_BUFF.damage * (BEN_ALIEN_DAMAGE_BONUS[key] ?? 1)
export const benAlienDefenseMult = (mods, key) => (mods?.defense ?? 1) * BEN_ALIEN_BUFF.defense * (BEN_ALIEN_DEFENSE_BONUS[key] ?? 1)
export const benAlienSpeedMult = (key, mods) => (mods?.speed ?? 1) * BEN_ALIEN_BUFF.speed * (BEN_ALIEN_SPEED_BONUS[key] ?? 1)
