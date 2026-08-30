// theme.js
// ─────────────────────────────────────────────────────────────────────────────
// UI THEME SYSTEM — a live-swappable registry of visual palettes for the menus,
// the "Choir's Reading" personality screen, and every ambient backdrop / particle
// field. One central place so a single choice recolours the whole front-end.
//
// Guest-safe: the choice lives in its own localStorage key (mirrors personality.js /
// musicLibrary.js), so it survives reloads for everyone — no account required.
//
// Deterministic: nothing here calls Math.random / Date.now, so switching a theme
// never disturbs the replay-safe menu animation clock (_mkFrame in ui.js).
//
// Each theme is a plain palette object. Consumers read:
//   accent / accent2   — primary + secondary hues (buttons, glows, gradients)
//   accentRGB/accent2RGB — precomputed [r,g,b] so callers can build rgba(...,a)
//   particles          — the drifting-mote palette (array of hex)
//   bgTop / bgBottom   — the vertical backdrop gradient
//   glowA / glowB      — the two parallax radial glows over the backdrop
//   spiralA / spiralB  — the rift-portal spiral-arm gradient
//   ring               — faint concentric grid/ring stroke colour
//   text / textDim     — headline + secondary text tints
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = "ms_ui_theme"

function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }

// hex ("#rrggbb" | "#rgb") → [r,g,b]. Pure; used once per theme at module load.
export function hexToRgb(hex) {
  let h = String(hex || "").trim().replace(/^#/, "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h || "000000", 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// rgba() string from a [r,g,b] triple + alpha — the workhorse for themed fills.
export function rgba(rgb, a = 1) { const [r, g, b] = rgb || [0, 0, 0]; return `rgba(${r},${g},${b},${a})` }

// hex → HSL ([h 0-360, s 0-1, l 0-1]) and back — used to procedurally build a whole palette from a single
// signature colour (per-character themes) so every fighter gets a cohesive look without hand-authoring 97.
export function hexToHsl(hex) {
  let [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0, s = 0, l = (max + min) / 2
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
  }
  return [h, s, l]
}
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x]
  const to2 = v => Math.round((v + m) * 255).toString(16).padStart(2, "0")
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

// ── THE PALETTES ─────────────────────────────────────────────────────────────
// Ordered; the first is the default. Each is hand-tuned to read as a cohesive
// mood — the two accents are chosen to gradient nicely into each other.
export const THEMES = {
  // Cool blue + violet — the game's original identity, kept as the default.
  aurora: {
    name: "Aurora",  blurb: "Cool blue & violet — the classic multiversal rift.",
    accent: "#4aa8e0", accent2: "#8b5cf6",
    particles: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#e9d5ff", "#7dd3fc"],
    bgTop: "#07091a", bgBottom: "#0d1226",
    glowA: "#3f7fd0", glowB: "#7c4dd0",
    spiralA: "#6aa8ff", spiralB: "#9a7bff",
    ring: "150,180,220", text: "#eaf2ff", textDim: "#9fb6d8"
  },
  // The headline pink theme — warm rose on deep plum.
  sakura: {
    name: "Sakura",  blurb: "Soft petals — rose & blossom pink.",
    accent: "#f472b6", accent2: "#fb7185",
    particles: ["#f472b6", "#f9a8d4", "#fbcfe8", "#fda4af", "#fecdd3"],
    bgTop: "#1a0716", bgBottom: "#2a0b22",
    glowA: "#db2777", glowB: "#f472b6",
    spiralA: "#f9a8d4", spiralB: "#fb7185",
    ring: "230,160,200", text: "#ffeaf5", textDim: "#e6a9cd"
  },
  // Pink + blue together — the neon retro-future look the request literally called for.
  synthwave: {
    name: "Synthwave", blurb: "Neon pink meets electric cyan.",
    accent: "#f472b6", accent2: "#22d3ee",
    particles: ["#f472b6", "#c084fc", "#818cf8", "#22d3ee", "#67e8f9"],
    bgTop: "#0f0524", bgBottom: "#2a0b3d",
    glowA: "#e0329a", glowB: "#22a7d4",
    spiralA: "#ff6ec7", spiralB: "#37d5e6",
    ring: "200,150,235", text: "#ffe9fb", textDim: "#c9a9e6"
  },
  // Cool green + teal.
  emerald: {
    name: "Emerald", blurb: "Jade & teal — calm and crystalline.",
    accent: "#34d399", accent2: "#22d3ee",
    particles: ["#34d399", "#6ee7b7", "#a7f3d0", "#5eead4", "#99f6e4"],
    bgTop: "#04140f", bgBottom: "#062821",
    glowA: "#10b981", glowB: "#0ea5a5",
    spiralA: "#6ee7b7", spiralB: "#22d3ee",
    ring: "150,220,200", text: "#e7fff6", textDim: "#9fe0c8"
  },
  // Warm gold + rose — firelit.
  ember: {
    name: "Ember", blurb: "Molten gold & rose — firelit arena.",
    accent: "#fbbf24", accent2: "#fb7185",
    particles: ["#fbbf24", "#fdba74", "#fca5a5", "#fb7185", "#fcd34d"],
    bgTop: "#1a0d04", bgBottom: "#2a1407",
    glowA: "#f59e0b", glowB: "#e11d48",
    spiralA: "#fcd34d", spiralB: "#fb7185",
    ring: "225,190,150", text: "#fff4e2", textDim: "#e6c69f"
  },
  // Deep purple + magenta.
  ultraviolet: {
    name: "Ultraviolet", blurb: "Royal purple & magenta — arcane.",
    accent: "#a855f7", accent2: "#ec4899",
    particles: ["#a855f7", "#c084fc", "#d8b4fe", "#ec4899", "#f0abfc"],
    bgTop: "#0d0620", bgBottom: "#1e0b33",
    glowA: "#9333ea", glowB: "#db2777",
    spiralA: "#c084fc", spiralB: "#ec4899",
    ring: "200,160,230", text: "#f6e9ff", textDim: "#c9a9e6"
  }
}

export const THEME_ORDER = ["aurora", "sakura", "synthwave", "emerald", "ember", "ultraviolet"]

// ── PARTICLE MOTIFS ───────────────────────────────────────────────────────────
// The ambient menu motes take a SHAPE (motif) drawn per-theme, so each look feels distinct and, in
// Character mode, evokes the fighter's world: ki sparks (Dragon Ball), leaves (Naruto), cursed shards
// (JJK), petals (Bleach/Demon Slayer), embers (horror), portal orbs (Rick & Morty), etc.
// Motifs: "orb" | "spark" | "petal" | "leaf" | "shard" | "ember"
const THEME_MOTIF = { aurora: "orb", sakura: "petal", synthwave: "spark", emerald: "leaf", ember: "ember", ultraviolet: "shard" }
export const UNIVERSE_MOTIF = {
  dragon_ball: "spark", naruto: "leaf", jujutsu_kaisen: "shard", bleach: "petal", demon_slayer: "petal",
  hunter_x_hunter: "orb", one_punch_man: "spark", dc: "shard", marvel: "spark", invincible: "spark",
  rick_and_morty: "orb", power_rangers: "spark", ben_10: "orb", ben10: "orb", horror: "ember",
  saiki_k: "orb", baki: "ember", hajime_no_ippo: "spark", deathnote: "shard", original: "orb",
}

// Precompute the accent RGB triples + motif once (so hot draw paths never re-parse hex).
for (const k of THEME_ORDER) {
  const t = THEMES[k]
  t.key = k
  t.accentRGB = hexToRgb(t.accent)
  t.accent2RGB = hexToRgb(t.accent2)
  t.motif = THEME_MOTIF[k] || "orb"
}

const DEFAULT_KEY = "aurora"

// ── PER-CHARACTER THEMES ──────────────────────────────────────────────────────
// Every fighter gets its own UI palette procedurally derived from its signature colour, so selecting a
// character can recolour the whole front-end to match them (Goku Black → pink, Ben 10 → Omnitrix green…).
// Overrides pin a specific hue where the character's raw `color` isn't the vibe we want (e.g. Goku Black's
// Super Saiyan Rosé pink). Keyed by rosterKey.
export const CHARACTER_THEME_OVERRIDES = {
  goku_black: "#f65fa6",   // Super Saiyan Rosé — pink
  ben10:      "#8be04e",   // Omnitrix green
  rose:       "#f65fa6",   // (alias if a Rosé variant exists)
}

// Build a complete palette from a single accent hex. Analogous secondary (+35°), very-dark same-hue
// backdrop, tinted glows/spirals/particles. Deterministic and cheap.
export function deriveThemeFromColor(hex, name = "Character", blurb = "Follows your fighter", motif = "orb") {
  const [h, s] = hexToHsl(hex)
  const S = Math.max(0.45, Math.min(0.95, s))          // keep it vivid even if the source is muted
  const accent  = hslToHex(h, S, 0.6)
  const accent2 = hslToHex(h + 35, Math.min(0.95, S + 0.05), 0.64)
  const t = {
    key: "character", name, blurb, motif, accent, accent2,
    particles: [accent, accent2, hslToHex(h, S, 0.78), hslToHex(h + 30, S, 0.82), hslToHex(h, S * 0.7, 0.88)],
    bgTop:    hslToHex(h, S * 0.5, 0.055),
    bgBottom: hslToHex(h + 18, S * 0.5, 0.12),
    glowA:    hslToHex(h, S, 0.5),
    glowB:    hslToHex(h + 42, S * 0.9, 0.5),
    spiralA:  hslToHex(h, S, 0.68),
    spiralB:  hslToHex(h + 28, S, 0.6),
    ring:     hexToRgb(hslToHex(h, 0.4, 0.72)).join(","),
    text:     hslToHex(h, 0.5, 0.95),
    textDim:  hslToHex(h, 0.4, 0.72),
  }
  t.accentRGB = hexToRgb(t.accent); t.accent2RGB = hexToRgb(t.accent2)
  return t
}

// Palette for a specific fighter: override hue if pinned, else derive from its signature colour. The
// motif comes from the fighter's universe (ki sparks for DBZ, leaves for Naruto, …).
export function characterTheme(key, baseColor, name = "Character", universe = null) {
  const hex = CHARACTER_THEME_OVERRIDES[key] || baseColor || "#4aa8e0"
  return deriveThemeFromColor(hex, name, `${name}'s signature palette`, UNIVERSE_MOTIF[universe] || "orb")
}

let _charTheme = null       // last character theme set (used when active mode === "character")
let _previewTheme = null    // transient override (e.g. character-select hover) — highest priority, never saved
// Set the fighter whose palette drives "Character" mode (recolours pause/victory/menus to your pick).
export function setActiveCharacter(key, baseColor, name = "Character", universe = null) { _charTheme = characterTheme(key, baseColor, name, universe); if (_active === "character") _notify(); return _charTheme }
export function setCharacterThemePalette(pal) { _charTheme = pal || null; if (_active === "character") _notify() }
export function characterThemePalette() { return _charTheme || deriveThemeFromColor("#a855f7", "Character", "Follows your fighter") }
// Transient preview (returns to the resolved theme when cleared). Read every frame via getTheme().
export function setPreviewTheme(pal) { _previewTheme = pal || null }
export function clearPreviewTheme() { _previewTheme = null }

function _load() {
  if (!_lsAvailable()) return DEFAULT_KEY
  try { const v = localStorage.getItem(LS_KEY); return (v && (THEMES[v] || v === "character")) ? v : DEFAULT_KEY } catch (_) { return DEFAULT_KEY }
}
function _save() { if (_lsAvailable()) { try { localStorage.setItem(LS_KEY, _active) } catch (_) {} } }

let _active = _load()

// A tiny subscriber list so ui.js can resync its cached colour knobs the instant
// the theme changes (rather than only on the next frame).
const _subs = []
export function onThemeChange(fn) { if (typeof fn === "function") _subs.push(fn) }
function _notify() { for (const fn of _subs) { try { fn(getTheme()) } catch (_) {} } }

export function activeThemeKey() { return _active }
// No-arg → the RESOLVED active palette (preview > character-mode > the chosen fixed theme). An explicit key
// → that fixed palette (used by the picker to render each option's own look).
export function getTheme(key) {
  if (key) return THEMES[key] || THEMES[DEFAULT_KEY]
  if (_previewTheme) return _previewTheme
  if (_active === "character") return characterThemePalette()
  return THEMES[_active] || THEMES[DEFAULT_KEY]
}

export function setTheme(key) {
  if ((THEMES[key] || key === "character") && key !== _active) { _active = key; _save(); _notify() }
  return getTheme()
}

// Step through the ordered list (wraps). dir = +1 next, -1 previous.
export function cycleTheme(dir = 1) {
  const i = THEME_ORDER.indexOf(_active)
  const next = THEME_ORDER[((i + dir) % THEME_ORDER.length + THEME_ORDER.length) % THEME_ORDER.length]
  return setTheme(next)
}

// Full list (with keys) for the theme-picker screen.
export function allThemes() { return THEME_ORDER.map(k => THEMES[k]) }
