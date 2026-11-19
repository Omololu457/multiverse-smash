// ALBEDO SKIN THEMES — registry (2026-11-18, feat/albedo-skin-themes). ALBEDO-ONLY: scoped to rosterKey "albedo".
// Leaf module (no imports). Ben 10 never reads this file's themes: every helper returns null unless the fighter /
// roster key is "albedo". Cosmetic only: no stat, frame, hitbox or form-list data lives here.
//
// One shared ROLE_COLOR registry (built once, used by BOTH appearances):
//   primary   — the main material (older: jacket · kid: shirt panels · alien: body / crystal / armour / fur)
//   secondary — the second material (older: jeans + darker undershirt · kid: pants · alien: second body material)
//   accent    — trim / stripe / detail (older: none in the art, see docs · kid: shirt stripe · alien: detail band)
//   energy    — eyes, Ultimatrix watch light + mark, flames / electricity / circuits (energyCore = its white-hot core)
//   hair      — Albedo's hair (human only; hairHi = optional highlight for two-tone hair)
// Appearances: "kid" = the Classic art (base skin id ben10Classic), "older" = the Alien Force art (base skin id default).
// The two preserved defaults (the __albedo gray-hair / Ultimatrix-red palette, skin ids "default" + "ben10Classic") sit
// OUTSIDE the 20 and are never renumbered. The earlier "Albedo red" pass IS those defaults (both appearances); Scarlet
// Inversion (#1) is a distinct theme (silver-white jacket, vivid red hair), so there are not two competing red palettes.

const ORIGINAL = name => `Original Albedo palette; ${name}`
const FAN = x => `Fan cosmetic inspired by ${x}; not a canonical Albedo costume, no gameplay change`

// fx: render-only finish. "stars" = sparse deterministic white/red points inside opaque primary pixels (no RNG);
// "glitter" = a few deterministic glints on highlight pixels; "metal" = stronger highlight ramp on the accent.
export const ALBEDO_THEMES = [
  { n: 1,  id: "scarletInversion",  name: "Scarlet Inversion",                  source: ORIGINAL("Scarlet Inversion"),
    primary: "#d9dde3", secondary: "#2e3036", accent: "#c0142c", energy: "#ff3b3b", energyCore: "#fff0f0", hair: "#e0141e" },
  { n: 2,  id: "ashenPrototype",    name: "Ashen Prototype",                    source: ORIGINAL("Ashen Prototype"),
    primary: "#b9bcc0", secondary: "#151517", accent: "#6e1f2b", energy: "#b8343c", energyCore: "#f0c8c8", hair: "#4a4a4f" },
  { n: 3,  id: "redSingularity",    name: "Alien X — Red Singularity",          source: FAN("Alien X (Ben 10)"),
    primary: "#14141c", secondary: "#34343e", accent: "#c8ccd4", energy: "#ff2a2a", energyCore: "#ffffff", hair: "#e8e8f0", fx: "stars" },
  { n: 4,  id: "redlineVirus",      name: "Upgrade — Redline Virus",            source: FAN("Upgrade (Ben 10)"),
    primary: "#141416", secondary: "#3a3c40", accent: "#ff1e2d", energy: "#e8142e", energyCore: "#ffd0d0", hair: "#18181a", hairHi: "#d01020" },
  { n: 5,  id: "bloodPrism",        name: "Chromastone — Blood Prism",          source: FAN("Chromastone (Ben 10)"),
    primary: "#9b59d0", secondary: "#3c1660", accent: "#8b1a3a", energy: "#ff3cc8", energyCore: "#ffe0f6", hair: "#cfd3dc" },
  { n: 6,  id: "rubyFacet",         name: "Diamondhead — Ruby Facet",           source: FAN("Diamondhead (Ben 10)"),
    primary: "#f0c0ca", secondary: "#2e3036", accent: "#8b0f2a", energy: "#ff9cbc", energyCore: "#fff0f5", hair: "#d8202c" },
  { n: 7,  id: "crimsonWinter",     name: "Big Chill — Crimson Winter",         source: FAN("Big Chill (Ben 10)"),
    primary: "#9fd0f0", secondary: "#1b2a4e", accent: "#d01c38", energy: "#a8e6ff", energyCore: "#f0fbff", hair: "#dfe9f2" },
  { n: 8,  id: "hauntedSignal",     name: "Ghostfreak — Haunted Signal",        source: FAN("Ghostfreak (Ben 10)"),
    primary: "#cfc8bc", secondary: "#303034", accent: "#6f5a8c", energy: "#c8b4f0", energyCore: "#f6f0ff", hair: "#c4c4c8" },
  { n: 9,  id: "redResonance",      name: "Ultimate Echo Echo — Red Resonance", source: FAN("Ultimate Echo Echo (Ben 10)"),
    primary: "#2a52be", secondary: "#4a5560", accent: "#c4c9d0", energy: "#ff3434", energyCore: "#ffe0e0", hair: "#7b8590" },
  { n: 10, id: "whiteFurnace",      name: "Heatblast — White Furnace",          source: FAN("Heatblast (Ben 10)"),
    primary: "#1c1814", secondary: "#e86a1c", accent: "#8c1a10", energy: "#ffd8a0", energyCore: "#fffaf0", hair: "#f4f4f4" },
  { n: 11, id: "redSun",            name: "Superman — Red Sun",                 source: FAN("Superman (DC)"),
    primary: "#1f3a8a", secondary: "#7a7d85", accent: "#c41e3a", energy: "#ff8c1a", energyCore: "#fff0c0", hair: "#b8bcc4" },
  { n: 12, id: "scarletProtocol",   name: "Batman Beyond — Scarlet Protocol",   source: FAN("Batman Beyond (DC)"),
    primary: "#101012", secondary: "#38393e", accent: "#c8102e", energy: "#ff2d3a", energyCore: "#ffe0e0", hair: "#8a8c90" },
  { n: 13, id: "negativeVelocity",  name: "Reverse-Flash — Negative Velocity",  source: FAN("Reverse-Flash (DC)"),
    primary: "#f2c418", secondary: "#6e1423", accent: "#141414", energy: "#ff2a1a", energyCore: "#fff0d0", hair: "#8b0e14" },
  { n: 14, id: "cursedRose",        name: "JJK — Cursed Rose",                  source: FAN("Jujutsu Kaisen"),
    primary: "#2c2c32", secondary: "#a8326e", accent: "#b0102a", energy: "#ff4a78", energyCore: "#ffe0ea", hair: "#f07ab0" },
  { n: 15, id: "violetReversal",    name: "JJK — Violet Reversal",              source: FAN("Jujutsu Kaisen"),
    primary: "#2e2a7a", secondary: "#7c7f88", accent: "#b4d4f4", energy: "#d8c8ff", energyCore: "#ffffff", hair: "#f6f6fa" },
  { n: 16, id: "imperialPearl",     name: "Frieza — Imperial Pearl",            source: FAN("Frieza (Dragon Ball)"),
    primary: "#f4f2f6", secondary: "#c9c8cf", accent: "#4b1d6e", energy: "#f0eaff", energyCore: "#ffffff", hair: "#e6e4ec" },
  { n: 17, id: "crimsonVictory",    name: "Winning Valkyrie — Crimson Victory", source: FAN("Winning Valkyrie (Beyblade Burst) colours"),
    primary: "#1f4fbf", secondary: "#f2f2f4", accent: "#e0b020", energy: "#e0402a", energyCore: "#fff0c0", hair: "#e8eaf0" },
  { n: 18, id: "magentaAftershock", name: "Anodite — Magenta Aftershock",       source: FAN("Anodite (Ben 10)"),
    primary: "#d0208a", secondary: "#2e2e34", accent: "#4a1a6e", energy: "#d8c8ff", energyCore: "#ffffff", hair: "#b8442a" },
  { n: 19, id: "falseEmperor",      name: "Black Gold — False Emperor",         source: FAN("a black-and-gold emperor look"),
    primary: "#1a1a1c", secondary: "#3a3a3e", accent: "#c9a646", energy: "#7a1028", energyCore: "#e8a0b0", hair: "#5a5e66", fx: "metal" },
  { n: 20, id: "rubyOpal",          name: "Ruby Opal — Glitter Overload",       source: FAN("opal gemstones"),
    primary: "#f0e8ec", secondary: "#b8a8d8", accent: "#f08aa8", accentAlt: "#8ae0e8", energy: "#d0103a", energyCore: "#ffe0e8", hair: "#ff7060", fx: "glitter" },
]

export const ALBEDO_THEME_BY_ID = Object.fromEntries(ALBEDO_THEMES.map(t => [t.id, t]))
export const ALBEDO_APPEARANCES = {
  kid:   { label: "Kid",   baseSkinId: "ben10Classic", art: "classic"    },
  older: { label: "Older", baseSkinId: "default",      art: "alienforce" },
}

// Stable skin ids. Two pre-existing Albedo skin ids (albedoAlienX / albedoValkyrie — added by the underskin batch, their
// __albedo__alienx / __albedo__valkyrie sheets were never generated so they rendered nothing) are REUSED for the matching
// Older themes instead of adding duplicates; saved selections of those ids now resolve to a working theme.
const REUSED_IDS = { "older:redSingularity": "albedoAlienX", "older:crimsonVictory": "albedoValkyrie" }
const cap = s => s[0].toUpperCase() + s.slice(1)
export function albedoThemeSkinId(appearance, themeId) {
  return REUSED_IDS[`${appearance}:${themeId}`] || `albedo${cap(appearance)}${cap(themeId)}`
}
const _BY_SKIN = new Map()
for (const app of Object.keys(ALBEDO_APPEARANCES)) for (const t of ALBEDO_THEMES)
  _BY_SKIN.set(albedoThemeSkinId(app, t.id), Object.freeze({ appearance: app, themeId: t.id, theme: t }))

// { appearance, themeId, theme } for an Albedo theme skin id, else null (defaults, Prime, any other id → null).
export function albedoThemeOfSkin(skinId) { return _BY_SKIN.get(skinId) || null }
export const ALBEDO_THEME_SKIN_IDS = [..._BY_SKIN.keys()]

// The variant skin id whose GAMEPLAY numbers a theme skin uses (kid → ben10Classic, older → default). Identity for
// anything that is not an Albedo theme id, so Ben's ids pass straight through.
export function albedoBaseSkinId(skinId) {
  const t = _BY_SKIN.get(skinId)
  return t ? ALBEDO_APPEARANCES[t.appearance].baseSkinId : skinId
}

// The theme a fighter renders with, or null. ONLY rosterKey "albedo" can ever get one.
export function albedoThemeForFighter(f) {
  if (!f || String(f.rosterKey || "").toLowerCase() !== "albedo") return null
  return _BY_SKIN.get(f.skinId) || null
}
