// waterAffinity.js — WATERBORNE affinity for Ripjaws' STORM TIDE flood (benFlood.js). DATA ONLY + one lookup; ben10-gated
// (only read while a flood exists). Never edits any character's data or frame data.
// A fighter whose ACTIVE form carries "water" or "ice" is WATERBORNE: no breath, no drowning, no wading / swim penalties,
// ordinary physics throughout, immune to Undertow and Breath Steal (they still take normal damage from every move).
// Active form: a transformed Ben / Albedo → his alien form id; anyone else (and human Ben) → the roster id.
export const WATER_AFFINITY_ROSTER = {
  frozone: ["ice"],     // Frozone (The Incredibles): ice generation
  arlong: ["water"],    // Arlong (One Piece): a sawshark Fish-Man, breathes underwater
}
export const WATER_AFFINITY_FORMS = {
  ripjaws: ["water"],   // Piscciss Volann
  arcticguana: ["ice"], // Cryoreptile
  bigchill: ["ice"],    // Necrofriggian
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
