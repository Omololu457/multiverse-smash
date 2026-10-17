// hud_theme.js
// ─────────────────────────────────────────────────────────────────
// THEMED HUD — per-character ACCENT COLOUR for the in-match health bar
// (frame trim, name plate, portrait border). PRESENTATION ONLY: nothing
// here touches HP, damage, healing, or any game rule — it only picks a
// colour for the HUD renderer in ui.js.
//
// Precedence for a character's accent:
//   1. HUD_ACCENT_OVERRIDES[rosterKey]      (manual table below — wins)
//   2. a live FORM/skin aura colour          (so a form-swap re-tints the HUD)
//   3. characters[key].color                 (the character's palette colour)
//   4. characters[key].energyConfig.color    (their meter colour)
//   5. a per-UNIVERSE default
//   6. a neutral steel fallback
// Every branch is deterministic and read-only. Keys with no data fall back
// gracefully, so a new character never breaks the HUD.
// ─────────────────────────────────────────────────────────────────
import { characters } from "./characters.js"

// MANUAL OVERRIDES — rosterKey → "#rrggbb". Use ONLY to correct an
// auto-derived accent that reads badly (e.g. a near-black palette that
// disappears against the dark panel). Leave empty to trust the auto-derive.
export const HUD_ACCENT_OVERRIDES = {
  batman:        "#5b6472",   // #3a3f4b palette is near-black → lift to readable steel
  ghostface:     "#c9d1d9",   // pale ghost-white reads better than the dark robe
  ghostface_exe: "#7fe3ff",   // glitch-cyan identity accent
}

// Per-universe default accent, used when a character carries no colour data.
const _UNIVERSE_DEFAULT = {
  dragon_ball:     "#f2a33c",
  naruto:          "#f26a21",
  bleach:          "#e05a5a",
  hunter_x_hunter: "#4caf50",
  jujutsu_kaisen:  "#6d4aff",
  demon_slayer:    "#3bb0a8",
  dc:              "#3b82f6",
  marvel:          "#e8352a",
  divine:          "#ffd54a",
}

const _NEUTRAL = "#8aa0b8"
const _HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// Accept "#rgb"/"#rrggbb"; anything else (named colours, rgba(), undefined) → null.
function _hex(c) {
  if (typeof c !== "string") return null
  const s = c.trim()
  if (!_HEX.test(s)) return null
  if (s.length === 4) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]
  return s.toLowerCase()
}

// The accent for a live fighter (reads the active form/skin so it re-tints on a swap).
export function getHudAccent(fighter) {
  const key = String(fighter?.rosterKey || "").toLowerCase()
  const ov = _hex(HUD_ACCENT_OVERRIDES[key])
  if (ov) return ov
  const live = _hex(fighter?._skinAnim?.auraColor) || _hex(fighter?._skinAnim?.glowColor)
  if (live) return live
  const ch = characters?.[key]
  return _hex(ch?.color)
      || _hex(ch?.energyConfig?.color)
      || _hex(fighter?.energyConfig?.color)
      || _UNIVERSE_DEFAULT[ch?.universe]
      || _NEUTRAL
}

// Static accent by rosterKey alone (no live form) — used by the coverage report
// and any non-fighter context (e.g. select-screen tooling).
export function getHudAccentByKey(rosterKey) {
  const key = String(rosterKey || "").toLowerCase()
  const ov = _hex(HUD_ACCENT_OVERRIDES[key])
  if (ov) return ov
  const ch = characters?.[key]
  return _hex(ch?.color) || _hex(ch?.energyConfig?.color) || _UNIVERSE_DEFAULT[ch?.universe] || _NEUTRAL
}
