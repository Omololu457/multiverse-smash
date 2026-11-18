// waterAffinity.js — WATERBORNE affinity for Ripjaws' STORM TIDE flood (benFlood.js). DATA ONLY + one lookup; ben10-gated
// (only read while a flood exists). Never edits any character's data or frame data.
// A fighter whose ACTIVE form carries "water" or "ice" is WATERBORNE: no breath, no drowning, no wading / swim penalties,
// ordinary physics throughout, immune to Undertow and Breath Steal (they still take normal damage from every move).
// Active form: a transformed Ben / Albedo → his alien form id; anyone else (and human Ben) → the roster id.
import { SPECIAL_ELEMENTS, elementFor } from "./juice_elements.js"

export const WATER_AFFINITY_ROSTER = {
  frozone: ["ice"],     // Frozone (The Incredibles): ice generation
  arlong: ["water"],    // Arlong (One Piece): a sawshark Fish-Man, breathes underwater
}
export const WATER_AFFINITY_FORMS = {
  ripjaws: ["water"],   // Piscciss Volann
  arcticguana: ["ice"], // Cryoreptile
  bigchill: ["ice"],    // Necrofriggian
  waterhazard: ["water"], // Orishan
}
// Considered and LEFT OUT (borderline): tobirama (a human Water Release user — still needs air), enoch (an ICE mode among
// several, not an ice body), vilgax (tentacled, not established as aquatic), luffy (a Devil Fruit user: the opposite).
export const WATER_AFFINITY_BORDERLINE = ["tobirama", "enoch", "vilgax", "luffy"]

export function affinityTags(f) {
  if (!f) return []
  const key = String(f.rosterKey || "").toLowerCase()
  if ((key === "ben10" || key === "albedo") && f.transformed && f.activeAlien) return WATER_AFFINITY_FORMS[f.activeAlien] || []
  return WATER_AFFINITY_ROSTER[key] || []
}
export const isWaterborneFighter = f => affinityTags(f).some(t => t === "water" || t === "ice")

// ── FIRE / ELECTRIC (Phase 7) — the engine's element table (juice_elements.js: specials / projectile names + ultimates by
// roster, pure data) plus this SIDE TAG MAP of fire / electric moves it does not tag. Only read while a flood exists.
// hand-tagged FIRE projectiles / hitbox entities (exact names, then prefixes for numbered series)
export const FIRE_MOVES = ["heatblast_fire", "hb_dive", "hb_supernova", "hb_ult_opener", "sf_blaze", "flameArrow", "genosIncineration",
  "hiruzenFireball", "isshikiFire", "itachiFireball", "jiraiyaBigFire", "jiraiyaFire", "madaraFireball", "madaraGokaMekkyaku",
  "samurai_flameburst", "shisuiFireball", "shisuiGokakyu", "shisuiHosenka", "ssFireball", "tobiFireBurst", "tobiFireGiant", "tobiFireSub"]
export const FIRE_PREFIX = ["hb_rocket_", "sf_flame_", "sf_inferno_"]
// hand-tagged ELECTRIC projectiles, and bodies whose every hit is electric (their melee counts too)
export const ELECTRIC_MOVES = ["brainstorm_bolt", "zoldyck_bolt", "killua_electricBall", "gbElectricPush", "gbElectricSlash",
  "jesusHolyLightning", "saikiLightning_top", "saikiLightning_bot", "mw_spark", "mw_thunder", "mw_shock", "mw_surge", "mw_discharge",
  "mw_ult", "mw_ult_opener", "fb_volt", "fb_burst", "fb_orb", "fb_ult_open"]
export const ELECTRIC_PREFIX = ["bs_ltn_", "mw_wire", "fb_return_"]
export const ELECTRIC_BODY = { forms: ["megawhatt", "feedback_ov"], roster: ["zenitsu"] }
// Considered and LEFT OUT: supHeatVision (a laser beam), madaraTengaiMeteor / madaraMeteorShock (rock), minatoReaperFlame
// (a seal, not fire), amaterasu (black flame → "dark" in the element table), chrollo_nenbolt / omGunBolt / vilgaxDroneBolt (energy).
const nameOf = p => String((p && (p.name || p.type)) || "")
const has = (n, list, pre) => list.includes(n) || pre.some(x => n.startsWith(x))
export function isFireProj(p) {
  if (!p || p.visualOnly) return false
  if (p.fire || p.element === "fire") return true
  const n = nameOf(p); if (n.startsWith("hb_fx_") || n.startsWith("sf_fx")) return false
  return SPECIAL_ELEMENTS[n] === "fire" || has(n, FIRE_MOVES, FIRE_PREFIX)
}
export function isElectricProj(p) {
  if (!p || p.visualOnly) return false
  if (p.element === "lightning" || p.element === "electric") return true
  const n = nameOf(p); return SPECIAL_ELEMENTS[n] === "lightning" || has(n, ELECTRIC_MOVES, ELECTRIC_PREFIX)
}
const keyOf = f => String((f && (f.rosterKey || f.id)) || "").toLowerCase()
const formOf = f => (f && f.transformed && f.activeAlien) || null
export const isElectricBody = f => !!f && (ELECTRIC_BODY.forms.includes(formOf(f)) || ELECTRIC_BODY.roster.includes(keyOf(f)))
// the fighter's ULTIMATE is fire (engine ultimate-element table; a transformed Ben / Albedo by his alien)
export const isFireUltimate = f => !!f && elementFor(keyOf(f), { isUltimate: true, ultVariant: formOf(f) || f._ultVariant }) === "fire"
