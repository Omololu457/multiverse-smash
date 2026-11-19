// benThemes.js: THE single source of truth for Ben 10's 20 cosmetic THEMES (2026-11-18).
//
// A theme is ONE pick made on human Ben (appearance "classic" | "jacket" × theme). It recolours that human sprite set AND,
// automatically, every READY alien Ben transforms into during the match: each sprite set's regional map
// (benThemeRegions.js) assigns its own art regions to the 5 ROLES below, and benThemeRecolor.js paints each role from this
// registry. No colour of a theme is written anywhere else.
//
// ROLES: P = PRIMARY (main body / jacket / shirt), S = SECONDARY (second panel / pants / dark body), A = ACCENT (trim, stripes,
// small details), E = ENERGY (watch light, Omnitrix mark, flames / glow, eyes), H = HIGHLIGHT (hair on the humans, the brightest
// facet on crystals). A theme without H keeps the art's natural hair.
// Each role is a 3-step swatch [dark, mid, light] (light = a modest lift, never chalk-white): the source pixel's brightness, relative to its region's reference colour,
// picks a point on that ramp, so the art's own shading (facets, folds, fur) survives. Never a flat fill.
//
// COSMETIC ONLY: a theme changes which pixels are drawn and nothing else. It is never read by combat, physics, the Omnitrix
// or the AI. Naming a theme after an alien (Alien X, Upgrade, …) grants nothing and unlocks nothing.
// Albedo has his own look: he can never wear these (they exist only in SKINS.ben10) and the recolour is ben10-gated.
// source: "canonical-palette-adaptation" | "crossover-inspired" | "original" (honest label; see docs/ben10/skins/THEMES.md).

export const BEN_THEMES = [
  { id: "d23blue", name: "Dimension 23 — Blue Hour", source: "canonical-palette-adaptation", note: "Ben 23 (Dimension 23) Hero Watch colour reference only: blue / black / gold. Not Ben 23's full costume.",
    roles: { P: ["#0e286f", "#1f4fd1", "#6c8de5"], S: ["#0a0b0e", "#15161c", "#54586c"], A: ["#846310", "#e2b33c", "#eacd85"], E: ["#005ba5", "#3fa9ff", "#87c8fc"] } },
  { id: "eventhorizon", name: "Alien X — Event Horizon", source: "canonical-palette-adaptation", note: "Alien X's starfield palette on Ben. Cosmetic only: grants no Alien X power.",
    roles: { P: ["#0b0b0f", "#16161e", "#55556e"], S: ["#1b1b20", "#34353e", "#76788b"], A: ["#5c647b", "#c9ccd6", "#dddee5"], E: ["#2bffad", "#d8fff0", "#f2fffa"] }, sparkle: "stars" },
  { id: "livingcircuit", name: "Upgrade — Living Circuit", source: "canonical-palette-adaptation", note: "Upgrade's black + circuit-green palette. Cosmetic only.",
    roles: { P: ["#1e2022", "#3a3d42", "#7c828b"], S: ["#090a0a", "#121314", "#565a5e"], A: ["#00a228", "#39ff6a", "#83fca1"], E: ["#669606", "#b5f23a", "#cff484"] } },
  { id: "prismbreak", name: "Chromastone — Prism Break", source: "canonical-palette-adaptation", note: "Chromastone's violet crystal palette. Cosmetic only.",
    roles: { P: ["#501c83", "#9a5ad8", "#be97e4"], S: ["#1f0b37", "#3b1868", "#7c3ccd"], A: ["#8b0d79", "#e83ccf", "#ee85de"], E: ["#088e96", "#3fe6f0", "#87ecf3"], H: ["#9839ff", "#f2e6ff", "#fbf7ff"] } },
  { id: "solarfurnace", name: "Heatblast — Solar Furnace", source: "canonical-palette-adaptation", note: "Heatblast's ember + charcoal palette. Cosmetic only.",
    roles: { P: ["#863206", "#f0661c", "#f29e71"], S: ["#161515", "#2c2a2a", "#757070"], A: ["#8e6b05", "#f2be2a", "#f3d47a"], E: ["#944700", "#ff8a1e", "#fbb473"] } },
  { id: "midnightglacier", name: "Big Chill — Midnight Glacier", source: "canonical-palette-adaptation", note: "Big Chill's blue palette. Cosmetic only.",
    roles: { P: ["#23445f", "#4682b4", "#89afcf"], S: ["#0c1125", "#19234a", "#465bac"], A: ["#0079dc", "#a8d8ff", "#c9e6fe"], E: ["#1beeff", "#c8fbff", "#e2fdff"] } },
  { id: "phantomfrequency", name: "Ghostfreak — Phantom Frequency", source: "canonical-palette-adaptation", note: "Ghostfreak's ash / bone palette with a violet accent. Cosmetic only.",
    roles: { P: ["#49494e", "#8e8e94", "#b7b7ba"], S: ["#827454", "#d8d2c4", "#e6e2da"], A: ["#3e1972", "#7a3cd0", "#aa85df"], E: ["#611bb9", "#c8a8f0", "#dcc8f4"] } },
  { id: "livewire", name: "Feedback — Live Wire", source: "canonical-palette-adaptation", note: "Feedback's black / cream / amber palette. Cosmetic only.",
    roles: { P: ["#0b0b0d", "#17171a", "#5b5b65"], S: ["#d9af37", "#f2e8cc", "#f7f1e0"], A: ["#956000", "#ffb020", "#fbcb74"], E: ["#ab8600", "#ffd84a", "#fce48e"] } },
  { id: "emeraldcut", name: "Diamondhead — Emerald Cut", source: "original", note: "Original emerald-crystal palette themed on Diamondhead (canon Diamondhead is teal-green; this is a jade variation). Cosmetic only.",
    roles: { P: ["#165639", "#2ea36e", "#6bd2a3"], S: ["#59d072", "#e2f5e6", "#f5fcf6"], A: ["#09311b", "#135c34", "#30cf78"], E: ["#1bffc1", "#c8fff0", "#e2fff7"], H: ["#3dffac", "#eafff6", "#f7fffc"] } },
  { id: "tomorrowshero", name: "Superman — Tomorrow's Hero", source: "crossover-inspired", note: "Original Ben palette inspired by Superman (DC); not a canonical Ben costume.",
    roles: { P: ["#10246a", "#2348c8", "#6c87e2"], S: ["#6a0e16", "#c8202e", "#e36973"], A: ["#947004", "#f4c430", "#f5d87e"], E: ["#e0bb00", "#fff2b0", "#fef6ce"] } },
  { id: "neogotham", name: "Batman Beyond — Neo Gotham", source: "crossover-inspired", note: "Original Ben palette inspired by Batman Beyond (DC); not a canonical Ben costume.",
    roles: { P: ["#1b1c1f", "#34363c", "#777b88"], S: ["#09090a", "#121214", "#56565e"], A: ["#6a0b14", "#c81a2a", "#e7626e"], E: ["#9a0000", "#ff2a2a", "#fc7a7a"], H: ["#4f5056", "#9a9ca2", "#bec0c3"] } },
  { id: "neonleap", name: "Spider-Verse — Neon Leap", source: "crossover-inspired", note: "Original Ben palette inspired by Spider-Man: Into the Spider-Verse (Spider-Gwen colours); not a canonical Ben costume.",
    roles: { P: ["#8787b8", "#f4f4f8", "#fafafc"], S: ["#0a0a0c", "#141418", "#565665"], A: ["#ae0058", "#ff4fa8", "#fc91c7"], E: ["#0092a5", "#3fe8ff", "#87eefc"] } },
  { id: "cursedrose", name: "JJK — Cursed Rose", source: "crossover-inspired", note: "Original Ben palette inspired by Yuji Itadori (JJK); not a canonical Ben costume. Pink hair; natural skin kept.",
    roles: { P: ["#0c0b0d", "#18161a", "#5f5966"], S: ["#380c16", "#6a1a2c", "#cc4060"], A: ["#ad0f42", "#f07aa0", "#f4acc3"], E: ["#7e1023", "#e0304e", "#e87d90"], H: ["#c10e43", "#f59ab5", "#f7c0d0"] } },
  { id: "limitlessblue", name: "JJK — Limitless Blue", source: "crossover-inspired", note: "Original Ben palette inspired by Satoru Gojo (JJK); not a canonical Ben costume. White hair; natural skin kept.",
    roles: { P: ["#0e1531", "#1c2a5c", "#435fc1"], S: ["#0a0a15", "#15142a", "#4a4885"], A: ["#0083d5", "#9ad8ff", "#c0e6fd"], E: ["#339cff", "#e0f0ff", "#f7fbff"], H: ["#7d93c0", "#f2f4f8", "#fafbfc"] } },
  { id: "ninetailssunrise", name: "Naruto — Nine-Tails Sunrise", source: "crossover-inspired", note: "Original Ben palette inspired by Naruto Uzumaki (Naruto); not a canonical Ben costume. No tails or markings added.",
    roles: { P: ["#8d3f03", "#f57c1f", "#f5ac73"], S: ["#0c0c0e", "#18181c", "#5b5b68"], A: ["#916f06", "#f2c230", "#f4d67e"], E: ["#bf5500", "#ffb070", "#fdcda6"] } },
  { id: "dawnbreaker", name: "Luffy — Dawn Breaker", source: "crossover-inspired", note: "Original Ben palette inspired by Luffy's Gear 5 (One Piece); not a canonical Ben costume. White hair.",
    roles: { P: ["#d7ae47", "#f4ecd8", "#faf6ec"], S: ["#62567f", "#c9c4d6", "#dddae4"], A: ["#582e99", "#b89ee0", "#d2c2ea"], E: ["#b74819", "#f0b8a0", "#f4d2c3"], H: ["#a3a3a3", "#fafafa", "#fbfbfb"] } },
  { id: "victoryrush", name: "Winning Valkyrie — Victory Rush", source: "crossover-inspired", note: "Original Ben palette in Winning Valkyrie colours (cobalt / red / white / gold); recognisable by colour only, no new geometry.",
    roles: { P: ["#102468", "#2347c4", "#6b85e1"], S: ["#6e0e15", "#d0202c", "#e56c75"], A: ["#9d9d9d", "#f4f4f4", "#fbfbfb"], E: ["#9b7203", "#f6c43a", "#f6d884"] } },
  { id: "violetafterglow", name: "Anodite — Violet Afterglow", source: "canonical-palette-adaptation", note: "Anodite (Gwen / Verdona) palette: copper hair, magenta-violet. Cosmetic only. Placement adapted: copper goes to HIGHLIGHT (hair) and ACCENT, not the main body.",
    roles: { P: ["#591e61", "#a83cb8", "#c881d3"], S: ["#1e0b2a", "#3a1650", "#8d39c0"], A: ["#6b361b", "#c8693a", "#daa083"], E: ["#6d35d5", "#d6c8f0", "#e5dcf5"], H: ["#6b361b", "#c8693a", "#daa083"] } },
  { id: "midnightchampion", name: "Black Gold — Midnight Champion", source: "original", note: "Original matte-black and brushed-gold palette.",
    roles: { P: ["#0e0e10", "#1c1c1f", "#616169"], S: ["#1e1e21", "#3a3a40", "#7d7d89"], A: ["#70571f", "#c9a24a", "#dac38d"], E: ["#ba7c00", "#ffcc66", "#fddea0"] } },
  { id: "glitterstorm", name: "Opal — Glitterstorm", source: "original", note: "Original pearl / lavender palette with a deterministic glitter pattern.",
    roles: { P: ["#a178b6", "#efe9f2", "#fbf9fb"], S: ["#543299", "#b9a6e0", "#d3c7ea"], A: ["#d50072", "#ff9ad0", "#fdc0e1"], E: ["#5d1bff", "#d8c8ff", "#eae2ff"], H: ["#a8a8a8", "#ffffff", "#fbfbfb"] }, sparkle: "glitter" },
]
export const BEN_THEME_BY_ID = Object.fromEntries(BEN_THEMES.map(t => [t.id, t]))

// The two human appearances a theme can be worn on. The originals stay as their own unnumbered skins
// ("default" = Alien Force jacket, "ben10Classic"), outside the 20.
export const BEN_APPEARANCES = { classic: { label: "Classic", baseSkin: "ben10Classic" }, jacket: { label: "Jacket", baseSkin: "default" } }

// Stable skin ids: "<appearance>-<themeId>", e.g. classic-eventhorizon, jacket-eventhorizon.
export const benThemeSkinId = (appearance, themeId) => `${appearance}-${themeId}`
export function parseBenThemeSkin(skinId) {
  const m = /^(classic|jacket)-([a-z0-9]+)$/.exec(String(skinId || ""))
  return m && BEN_THEME_BY_ID[m[2]] ? { appearance: m[1], themeId: m[2], theme: BEN_THEME_BY_ID[m[2]] } : null
}
// The original skin a themed skin is worn over (the variant's stats / normals / voice key on it): classic → ben10Classic,
// jacket → default (Alien Force). Any other id passes through unchanged.
export function benThemeBaseSkin(skinId) {
  const p = parseBenThemeSkin(skinId)
  return p ? BEN_APPEARANCES[p.appearance].baseSkin : skinId
}

// Select-screen card label: a short tag + title ("CLASSIC · 1" / "Blue Hour"; the originals read "ORIGINAL" / their name).
export function benThemeCardLabel(skin) {
  const p = parseBenThemeSkin(skin?.id)
  if (!p) return { tag: "ORIGINAL", title: skin?.name || "" }
  const n = BEN_THEMES.indexOf(p.theme) + 1, k = p.theme.name.lastIndexOf(" — ")
  return { tag: `${BEN_APPEARANCES[p.appearance].label.toUpperCase()} · ${n}`, title: k > 0 ? p.theme.name.slice(k + 3) : p.theme.name, source: p.theme.name.slice(0, Math.max(0, k)) }
}
