// weather_abilities.js — FEEL PASS (Phase 5): weather-changing ABILITIES (VISUAL ONLY).
//
// When a character lands a thematically-elemental move, the cosmetic weather crossfades to that move's
// weather for ~12s and then returns to the previous weather. This is PURELY visual — it changes NOTHING
// about gameplay, damage, hitboxes or frame data. It is triggered from the deterministic sim hit event
// (same frame on every peer) and the weather itself is render-layer, so LAN peers + companion screens agree.
//
// Rather than hand-maintain a second per-move list that could rot, the mapping REUSES the already-audited
// move→element table in juice_elements.js (SPECIAL_ELEMENTS / ULT_ELEMENTS). Element → weather:
//   lightning → thunderstorm · fire → heat-wave (fire/sun) · water → rain · ice → snow · wind → wind (incl. sand/dust)
//   ki / light / dark → NONE (no clear real-world weather theme → that character's move conjures nothing).
// Add a bespoke pick that the element table doesn't capture to WEATHER_ABILITY_OVERRIDES below.

import { ELEMENT, elementFor } from "./juice_elements.js"
import { WEATHER } from "./weather.js"

// FUTURE-PROOFING ONLY: a flag for a possible later gameplay layer (e.g. rain speeds water moves). DEFAULT
// OFF and NOTHING reads it yet — Phase 5 is strictly visual. Kept here so the data shape is ready.
export const WEATHER_ABILITY_GAMEPLAY_EFFECTS = false

// element → the weather a themed move conjures (visual). ki/light/dark intentionally absent → no weather.
export const ELEMENT_WEATHER = Object.freeze({
  [ELEMENT.LIGHTNING]: WEATHER.THUNDERSTORM,
  [ELEMENT.FIRE]:      WEATHER.HEATWAVE,
  [ELEMENT.WATER]:     WEATHER.RAIN,
  [ELEMENT.ICE]:       WEATHER.SNOW,
  [ELEMENT.WIND]:      WEATHER.WIND,
})

// Bespoke per-character / per-move overrides the element table doesn't capture (storm/sand/etc.). Each
// value is a weather type. Keep SMALL — the element map already covers the whole elemental roster. The
// `gameplayEffect` future-flag is global (above), not per-entry, so these stay simple type picks.
export const WEATHER_ABILITY_OVERRIDES = Object.freeze({
  // examples (inert — the element map already maps these):
  // gaara:   { sandWave: WEATHER.WIND },       // Gaara's sand already reads WIND → wind
  // sasuke_adult: { kirin: WEATHER.THUNDERSTORM },  // already LIGHTNING → thunderstorm
})

// Return the weather a (rosterKey, moveName) conjures, or null if none. Mirrors juice_elements resolution
// (specials key by move name; ultimates key by rosterKey + the ult flag).
export function weatherForAbility(rosterKey, moveName, opts = {}) {
  const ov = WEATHER_ABILITY_OVERRIDES[rosterKey] && WEATHER_ABILITY_OVERRIDES[rosterKey][moveName]
  if (ov) return ov
  const el = elementFor(rosterKey, { currentMove: moveName, isUltimate: !!opts.isUltimate, ultVariant: opts.ultVariant, form: opts.form })
  return ELEMENT_WEATHER[el] || null
}

// The default durations (frames @60fps). Exported so game.js + tests share the exact numbers.
export const WEATHER_ABILITY_HOLD_FRAMES = 720   // ~12s the conjured weather holds before returning
export const WEATHER_ABILITY_COOLDOWN_FRAMES = 360   // ~6s global cooldown between any two triggers
