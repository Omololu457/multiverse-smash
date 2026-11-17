// hitstop_overrides.js — FEEL PASS (Phase 1): per-move hitstop OVERRIDES.
//
// A sparse override layer on top of the tier-scaled HITSTOP tables in combat.js. Use this to give a
// SPECIFIC move a bespoke impact-freeze without re-tiering it (e.g. a signature heavy that should land
// heavier than the generic "heavy" tier, or a move whose cinematic owns the moment so its sim freeze
// should be skipped). This is DATA ONLY — deterministic, LAN-safe (identical on every peer), and read
// by combat.getHitstopFrames(). It NEVER affects damage, hitstun, knockback or frame advantage; it only
// changes how long the shared impact-freeze holds.
//
// Shape:
//   HITSTOP_OVERRIDES[rosterKey][moveName] = frames        // exact frames (clamped to [0, HITSTOP_MOVE_CAP])
//   HITSTOP_OVERRIDES[rosterKey][moveName] = { skip: true } // skip the sim freeze (a cinematic owns the impact)
//   HITSTOP_OVERRIDES["*"][moveName]        = frames        // roster-wide override for a shared move name
//
// `moveName` matches the attack's `.name` (combat.js startMove's moveKey), lower-cased for lookup.
// Overrides apply ONLY under the "Scaled" hitstop style; "Classic" ignores them (it is the byte-exact
// pre-FeelPass snapshot). Keep this list SMALL and intentional — the tier tables are the default.
export const HITSTOP_OVERRIDES = {
  // Example (commented, inert): make Saitama's serious-punch land with a full cap-length freeze.
  // saitama: { serious_punch: 24 },
  // Example (commented, inert): an ultimate whose dedicated cinematic owns the impact → no double freeze.
  // gojo: { purple: { skip: true } },
}

// Resolve an override for (rosterKey, moveName). Returns a number (frames), the string "skip", or null.
export function hitstopOverrideFor(rosterKey, moveName) {
  if (!moveName) return null
  const mv = String(moveName).toLowerCase()
  const tables = [rosterKey && HITSTOP_OVERRIDES[rosterKey], HITSTOP_OVERRIDES["*"]]
  for (const t of tables) {
    if (!t) continue
    const v = t[mv]
    if (v == null) continue
    if (typeof v === "number") return v
    if (v && v.skip) return "skip"
  }
  return null
}
