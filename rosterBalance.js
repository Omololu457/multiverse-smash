// rosterBalance.js — ROSTER BALANCE SWEEP (2026-11-25, owner: "a game where every character can win … I don't want the
// balance of the game ruined"). One table, one row per fighter that needed moving, measured LIVE AI-vs-AI.
// Stacks (multiplies) on top of everything in rosterParity.js (ROSTER_DAMAGE_BOOST / OG_TABLE / WEAK_TIER_BUFF):
//   dmg   → every hit the fighter deals (rosterParity.rosterDamageBoost → combat.applyScaledDamage choke point)
//   hp    → max health at spawn (rosterParity.ogHpMult → game.js createFighter)
//   spd   → walk + dash speed (rosterParity.ogSpeedMult → physics.js)
//   aggro → 1 = give the CPU ai.js's OG aggression overlay, 0 = take it away (unset = leave as rosterParity decides)
// Unlisted fighters return 1 / undefined → byte-identical behaviour.
// Forms: a dial squad (S.P.D. / MMPR / Ninja Storm squads, squadCore.js) is looked up by its squad id, Dino Thunder's
// live form ids by their parent, so one row covers every form. A fighter wearing someone else's kit (Ghostface's killer
// dial, Chrollo's Skill Hunter, Omololu, Tobirama's Edo vessel, Ghostface.exe …) keeps ITS OWN row while copied — the
// stash of its original fields says who it really is — so a row never leaks to / from the fighter being copied.
// Ben 10 / Albedo: fighters.js re-stamps their max health, so their hp lever is benAlienBalance.js, not this table.
// Win % (comment on each row: before → after) = adaptive AI-vs-AI vs a 6-fighter reference panel of roster-median kits (kakashi,
// yuji, killua, spiderman, flash, saiki — picked from a 1320-game random round-robin), both sides, 24 games before / 36 after.
// Before the sweep 22 of 110 fighters sat in 35–65 % (OG_TABLE lifts had most OG kits at 90–100 %, many newer kits at 0 %).
// Tuning: secant search on ln(dmg × hp) per fighter, 4 rounds + a full-roster final pass. Rows sorted weakest-lift → biggest.
export const ROSTER_BALANCE = Object.freeze({
  batman: { dmg: 0.62, hp: 0.62 },            // 100% → 64%
  omololu: { dmg: 0.63, hp: 0.63 },           // 96% → 61%
  maki: { dmg: 0.64, hp: 0.64 },              // 100% → 36%
  invincible: { dmg: 0.68, hp: 0.68 },        // 96% → 36%
  omniman_viltrum: { dmg: 0.68, hp: 0.68 },   // 96% → 53%
  ghostface: { dmg: 0.84, hp: 0.59 },         // 100% → 50% · the nerf sits on HP: OG hp ×2.1 had him at 2625 HP vs Omni-Man 1050
  rickPrime: { dmg: 0.71, hp: 0.71 },         // 100% → 75% · owner-requested strong: kept top tier (target ~68 %), not average
  nezuko: { dmg: 0.72, hp: 0.72 },            // 100% → 50%
  rengoku: { dmg: 0.74, hp: 0.74 },           // 96% → 58%
  zenitsu: { dmg: 0.74, hp: 0.74 },           // 92% → 56%
  naruto: { dmg: 0.76, hp: 0.76 },            // 96% → 39%
  jesus: { dmg: 0.78, hp: 0.78 },             // 96% → 44%
  rick: { dmg: 0.79, hp: 0.79 },              // 100% → 61% · owner-requested strong: kept top tier (target ~68 %), not average
  sanji: { dmg: 0.79, hp: 0.79 },             // 96% → 47%
  sukuna: { dmg: 0.82, hp: 0.82 },            // 100% → 36%
  baki: { dmg: 0.82, hp: 0.82 },              // 96% → 53%
  isshiki: { dmg: 0.82, hp: 0.82 },           // 96% → 44%
  aoi_todo: { dmg: 0.83, hp: 0.83 },          // 96% → 42%
  goku: { dmg: 0.83, hp: 0.83 },              // 88% → 44%
  toji: { dmg: 0.83, hp: 0.83 },              // 88% → 47%
  superman: { dmg: 0.85, hp: 0.85 },          // 92% → 56%
  minato: { dmg: 0.86, hp: 0.86 },            // 100% → 47%
  madara: { dmg: 0.86, hp: 0.86 },            // 92% → 42%
  vilgax: { dmg: 0.87, hp: 0.87 },            // 92% → 56%
  naruto_seventh: { dmg: 0.87, hp: 0.87 },    // 75% → 56%
  vegeta_dark: { dmg: 0.88, hp: 0.88 },       // 96% → 53%
  samurai_red_ranger: { dmg: 0.88, hp: 0.88 },// 96% → 53%
  green_samurai_ranger: { dmg: 0.88, hp: 0.88 },// 96% → 42%
  ichigo: { dmg: 0.88, hp: 0.88 },            // 96% → 42%
  saitama: { dmg: 0.88, hp: 0.88 },           // 92% → 53%
  kakashi_war: { dmg: 0.88, hp: 0.88 },       // 83% → 36%
  sasuke_adult: { dmg: 0.89, hp: 0.89 },      // 96% → 56%
  shinobu: { dmg: 0.89, hp: 0.89 },           // 96% → 50%
  vegeta: { dmg: 0.89, hp: 0.89 },            // 88% → 56%
  l_ryuuzaki: { dmg: 0.9, hp: 0.9 },          // 83% → 56%
  jason: { dmg: 0.9, hp: 0.9 },               // 71% → 39%
  byakuya: { dmg: 0.9, hp: 0.9 },             // 71% → 53%
  zaraki_shikai: { dmg: 0.91, hp: 0.91 },     // 88% → 56%
  gaara: { dmg: 0.91, hp: 0.91 },             // 88% → 50%
  mayuri: { dmg: 0.91, hp: 0.91 },            // 75% → 58%
  gold_samurai_ranger: { dmg: 0.92, hp: 0.92 },// 83% → 58%
  zaraki: { dmg: 0.93, hp: 0.93 },            // 79% → 47%
  kakashi_anbu: { dmg: 0.93, hp: 0.93 },      // 79% → 50%
  itachi: { dmg: 0.94, hp: 0.94 },            // 79% → 53%
  hinata: { dmg: 0.94, hp: 0.94 },            // 63% → 56%
  light: { dmg: 0.94, hp: 0.94 },             // 58% → 42%
  hashirama: { dmg: 0.95, hp: 0.95 },         // 71% → 50%
  tobirama: { dmg: 0.95, hp: 0.95 },          // 67% → 42%
  ninja_storm_cgpt: { dmg: 0.95, hp: 0.95 },  // 67% → 56%
  tobi: { dmg: 0.95, hp: 0.95 },              // 63% → 39%
  yuta: { dmg: 0.96, hp: 0.96 },              // 75% → 64%
  alt_sukuna: { dmg: 0.98, hp: 0.98 },        // 71% → 58%
  pain: { dmg: 1.03, hp: 1.03 },              // 33% → 47%
  shisui_fallen: { dmg: 1.03, hp: 1.03 },     // 29% → 53%
  beerus: { dmg: 1.04, hp: 1.04 },            // 54% → 50%
  dinothunder: { dmg: 1.05, hp: 1.05 },       // 38% → 42%
  netero: { dmg: 1.05, hp: 1.05 },            // 21% → 58%
  six_paths_pain: { dmg: 1.06, hp: 1.06 },    // 29% → 47%
  sukuna_shinjuku: { dmg: 1.07, hp: 1.07 },   // 33% → 44%
  chrollo: { dmg: 1.08, hp: 1.08 },           // 21% → 47%
  genos: { dmg: 1.1, hp: 1.1 },               // 8% → 39%
  zoro: { dmg: 1.11, hp: 1.11 },              // 17% → 44%
  spd_rangers: { dmg: 1.17, hp: 1.17 },       // 13% → 44%
  megumi_fushiguro: { dmg: 1.18, hp: 1.18 },  // 21% → 64%
  gojo_shinjuku: { dmg: 1.21, hp: 1.21 },     // 8% → 53%
  soldier_boy: { dmg: 1.21, hp: 1.21 },       // 4% → 50%
  krybot: { dmg: 1.21, hp: 1.21 },            // 4% → 47%
  arlong: { dmg: 1.22, hp: 1.22 },            // 0% → 44%
  albedo: { dmg: 1.49 },                      // 0% → 36% · dmg only (fighters.js re-stamps Ben/Albedo HP)
  robin: { dmg: 1.26, hp: 1.26 },             // 8% → 47%
  syndrome: { dmg: 1.28, hp: 1.28 },          // 13% → 44%
  dseyl: { dmg: 1.28, hp: 1.28 },             // 0% → 50%
  kevin_levin: { dmg: 1.3, hp: 1.3 },         // 0% → 56%
  beast_boy: { dmg: 1.3, hp: 1.3 },           // 0% → 47%
  ben10: { dmg: 1.75 },                       // 4% → 53% · dmg only (fighters.js re-stamps Ben/Albedo HP)
  homelander: { dmg: 1.34, hp: 1.34 },        // 0% → 58%
  enoch: { dmg: 1.36, hp: 1.36 },             // 4% → 47%
  raven: { dmg: 1.48, hp: 1.48 },             // 4% → 44%
  higuruma: { dmg: 1.48, hp: 1.48 },          // 4% → 64%
  green_arrow: { dmg: 1.48, hp: 1.48 },       // 0% → 44%
  buggy: { dmg: 1.48, hp: 1.48 },             // 0% → 56%
  cyborg: { dmg: 1.48, hp: 1.48 },            // 0% → 39%
  mr_incredible: { dmg: 1.48, hp: 1.48 },     // 0% → 58%
  frozone: { dmg: 1.57, hp: 1.57 },           // 0% → 39%
  ninja_storm_rangers: { dmg: 1.65, hp: 1.65 },// 0% → 53%
  luffy: { dmg: 1.69, hp: 1.69 },             // 4% → 44%
  dash_parr: { dmg: 1.7, hp: 1.7 },           // 0% → 58%
  violet: { dmg: 1.71, hp: 1.71 },            // 0% → 44%
  starfire: { dmg: 1.77, hp: 1.77 },          // 0% → 47%
})
const FORM_PARENT = { dt_red: 'dinothunder', dt_blue: 'dinothunder', dt_yellow: 'dinothunder', dt_white: 'dinothunder' }
const LC = Object.fromEntries(Object.entries(ROSTER_BALANCE).map(([k, v]) => [k.toLowerCase(), v]))
const balRow = f => {
  if (!f) return null
  if (typeof f === 'object' && f._squad?.id) return LC[String(f._squad.id).toLowerCase()] || null
  const own = typeof f === 'object' ? (f._gfSwapStash || f._shStash || f._beStash || f._tjStash || f._omoTfStash || f._edoStash || f._idSwapStash)?.rosterKey || f._idSwapBaseKey : null
  const k = String((typeof f === 'object' ? (typeof own === 'string' && own) || f.rosterKey : f) || '').toLowerCase()
  return LC[FORM_PARENT[k] || k] || null
}
export const balDmgMult = f => balRow(f)?.dmg || 1
export const balHpMult = f => balRow(f)?.hp || 1
export const balSpdMult = f => balRow(f)?.spd || 1
export const balAggro = f => { const a = balRow(f)?.aggro; return a == null ? undefined : !!a }
