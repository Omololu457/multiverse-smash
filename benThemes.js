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
// Each role is a 3-step swatch [dark, mid, light] (2026-11-19 "more pronounced": deep darks, saturated mids, a clear but never chalk-white light): the source pixel's brightness, relative to its region's reference colour,
// picks a point on that ramp, so the art's own shading (facets, folds, fur) survives. Never a flat fill.
//
// COSMETIC ONLY: a theme changes which pixels are drawn and nothing else. It is never read by combat, physics, the Omnitrix
// or the AI. Naming a theme after an alien (Alien X, Upgrade, …) grants nothing and unlocks nothing.
// Albedo has his own look: he can never wear these (they exist only in SKINS.ben10) and the recolour is ben10-gated.
// source: "canonical-palette-adaptation" | "crossover-inspired" | "original" (honest label; see docs/ben10/skins/THEMES.md).

export const BEN_THEMES = [
  { id: "d23blue", name: "Dimension 23 — Blue Hour", source: "canonical-palette-adaptation", note: "Ben 23 (Dimension 23) Hero Watch colour reference only: blue / black / gold. Not Ben 23's full costume.",
    roles: { P: ["#061d5a", "#144adc", "#7394ee"], S: ["#0b0c10", "#15161c", "#5d6078"], A: ["#6b4f07", "#ecb732", "#f1d48b"], E: ["#00467f", "#3fa9ff", "#92cdfc"] } },
  { id: "eventhorizon", name: "Alien X — Event Horizon", source: "canonical-palette-adaptation", note: "Alien X's starfield palette on Ben. Cosmetic only: grants no Alien X power.",
    roles: { P: ["#0c0c11", "#16161e", "#5d5d7a"], S: ["#141519", "#33353f", "#818497"], A: ["#464c60", "#c8ccd7", "#dfe1e7"], E: ["#0cffa2", "#d8fff0", "#ecfff8"] }, sparkle: "stars" },
  { id: "livingcircuit", name: "Upgrade — Living Circuit", source: "canonical-palette-adaptation", note: "Upgrade's black + circuit-green palette. Cosmetic only.",
    roles: { P: ["#17181a", "#3a3d42", "#888d96"], S: ["#0a0a0b", "#121314", "#606569"], A: ["#007d1f", "#39ff6a", "#8ffcaa"], E: ["#507800", "#b9fd2f", "#d5fb89"] } },
  { id: "prismbreak", name: "Chromastone — Prism Break", source: "canonical-palette-adaptation", note: "Chromastone's violet crystal palette. Cosmetic only.",
    roles: { P: ["#3e116a", "#9a52e0", "#c49deb"], S: ["#17072c", "#3a136d", "#8747da"], A: ["#710461", "#f232d6", "#f58be5"], E: ["#007279", "#34effb", "#8cf3fa"], H: ["#881aff", "#f2e6ff", "#fbf7ff"] }, sparkle: "glint" },
  { id: "solarfurnace", name: "Heatblast — Solar Furnace", source: "canonical-palette-adaptation", note: "Heatblast's ember + charcoal palette. Cosmetic only.",
    roles: { P: ["#6b2500", "#fd620f", "#faa577"], S: ["#121111", "#2c2a2a", "#878181"], A: ["#725400", "#fec41e", "#fbdb80"], E: ["#723700", "#ff8a1e", "#fcbb80"] } },
  { id: "midnightglacier", name: "Big Chill — Midnight Glacier", source: "canonical-palette-adaptation", note: "Big Chill's blue palette. Cosmetic only.",
    roles: { P: ["#18344c", "#3f83bb", "#90b7d7"], S: ["#080d1f", "#16214d", "#4963c7"], A: ["#005da9", "#a8d8ff", "#cee8fe"], E: ["#00a9b6", "#c8fbff", "#e0fcfe"] } },
  { id: "phantomfrequency", name: "Ghostfreak — Phantom Frequency", source: "canonical-palette-adaptation", note: "Ghostfreak's ash / bone palette with a violet accent. Cosmetic only.",
    roles: { P: ["#38383c", "#8e8e94", "#bebec1"], S: ["#665a3f", "#d9d2c3", "#e9e5dc"], A: ["#2f0f5c", "#7933d9", "#b18be6"], E: ["#4a0e95", "#c8a4f4", "#dfcbf8"] } },
  { id: "livewire", name: "Feedback — Live Wire", source: "canonical-palette-adaptation", note: "Feedback's black / cream / amber palette. Cosmetic only.",
    roles: { P: ["#0d0d0e", "#17171a", "#65656f"], S: ["#97771b", "#f4e9ca", "#f8f2e1"], A: ["#734a00", "#ffb020", "#fcd081"], E: ["#846700", "#ffd84a", "#fce799"] } },
  { id: "emeraldcut", name: "Diamondhead — Emerald Cut", source: "original", note: "Original emerald-crystal palette themed on Diamondhead (canon Diamondhead is teal-green; this is a jade variation). Cosmetic only.",
    roles: { P: ["#0e452c", "#27aa6f", "#74dcad"], S: ["#23e84d", "#e1f6e5", "#f1fbf3"], A: ["#052715", "#0f6034", "#3adc84"], E: ["#00b684", "#c8fff0", "#e0fef6"], H: ["#1eff9f", "#eafff6", "#f7fffc"] }, sparkle: "glint" },
  { id: "tomorrowshero", name: "Superman — Tomorrow's Hero", source: "crossover-inspired", note: "Original Ben palette inspired by Superman (DC); not a canonical Ben costume.",
    roles: { P: ["#081a56", "#1943d2", "#748eeb"], S: ["#56070d", "#d21626", "#ec707b"], A: ["#755800", "#ffca25", "#fcde84"], E: ["#ac9000", "#fff2b0", "#fef7d2"] } },
  { id: "neogotham", name: "Batman Beyond — Neo Gotham", source: "crossover-inspired", note: "Original Ben palette inspired by Batman Beyond (DC); not a canonical Ben costume.",
    roles: { P: ["#151618", "#34363c", "#848893"], S: ["#0a0a0b", "#121214", "#606069"], A: ["#56040c", "#d21021", "#f06976"], E: ["#770000", "#ff2a2a", "#fc8787"], H: ["#3c3e42", "#9a9ca2", "#c5c6c9"] } },
  { id: "neonleap", name: "Spider-Verse — Neon Leap", source: "crossover-inspired", note: "Original Ben palette inspired by Spider-Man: Into the Spider-Verse (Spider-Gwen colours); not a canonical Ben costume.",
    roles: { P: ["#6161bf", "#f4f4f8", "#fafafc"], S: ["#0b0b0d", "#141418", "#5f5f70"], A: ["#860044", "#ff4fa8", "#fc9bcd"], E: ["#00707f", "#3fe8ff", "#92f0fc"] } },
  { id: "cursedrose", name: "JJK — Cursed Rose", source: "crossover-inspired", note: "Original Ben palette inspired by Yuji Itadori (JJK); not a canonical Ben costume. Pink hair; natural skin kept.",
    roles: { P: ["#0d0c0e", "#18161a", "#6a6271"], S: ["#2d0810", "#6f1529", "#d84b6b"], A: ["#8c0530", "#f7739d", "#f8b0c7"], E: ["#660717", "#eb2547", "#f08496"], H: ["#9d0331", "#fa95b3", "#fbc3d3"] } },
  { id: "limitlessblue", name: "JJK — Limitless Blue", source: "crossover-inspired", note: "Original Ben palette inspired by Satoru Gojo (JJK); not a canonical Ben costume. White hair; natural skin kept.",
    roles: { P: ["#091027", "#182860", "#4e6ace"], S: ["#080712", "#14132b", "#524eac"], A: ["#0064a4", "#9ad8ff", "#c6e8fe"], E: ["#148dff", "#e0f0ff", "#f4faff"], H: ["#537bcb", "#f2f4f8", "#fafbfc"] } },
  { id: "ninetailssunrise", name: "Naruto — Nine-Tails Sunrise", source: "crossover-inspired", note: "Original Ben palette inspired by Naruto Uzumaki (Naruto); not a canonical Ben costume. No tails or markings added.",
    roles: { P: ["#6e3000", "#ff7b15", "#fcb37b"], S: ["#0d0d0f", "#18181c", "#656572"], A: ["#745700", "#fec824", "#fbdd83"], E: ["#934200", "#ffb070", "#fdd1ae"] } },
  { id: "dawnbreaker", name: "Luffy — Dawn Breaker", source: "crossover-inspired", note: "Original Ben palette inspired by Luffy's Gear 5 (One Piece); not a canonical Ben costume. White hair.",
    roles: { P: ["#f4b20c", "#f6edd6", "#f9f4e7"], S: ["#4a4163", "#c9c3d7", "#e0dce8"], A: ["#431e7b", "#b79ae4", "#d6c6ee"], E: ["#94350c", "#f5b69b", "#f8d5c6"], H: ["#9f8989", "#fafafa", "#fbfbfb"] } },
  { id: "victoryrush", name: "Winning Valkyrie — Victory Rush", source: "crossover-inspired", note: "Original Ben palette in Winning Valkyrie colours (cobalt / red / white / gold); recognisable by colour only, no new geometry.",
    roles: { P: ["#081954", "#1942ce", "#728dea"], S: ["#59070c", "#db1523", "#ee747c"], A: ["#998383", "#f4f4f4", "#fbfbfb"], E: ["#7a5900", "#ffc831", "#fcde8b"] } },
  { id: "violetafterglow", name: "Anodite — Violet Afterglow", source: "canonical-palette-adaptation", note: "Anodite (Gwen / Verdona) palette: copper hair, magenta-violet. Cosmetic only. Placement adapted: copper goes to HIGHLIGHT (hair) and ACCENT, not the main body.",
    roles: { P: ["#46144e", "#ae35bf", "#d188dc"], S: ["#180722", "#3b1353", "#9a41d0"], A: ["#562811", "#d16631", "#e2a78a"], E: ["#461d93", "#d5c6f2", "#e7def7"], H: ["#562811", "#d16631", "#e2a78a"] } },
  { id: "midnightchampion", name: "Black Gold — Midnight Champion", source: "original", note: "Original matte-black and brushed-gold palette.",
    roles: { P: ["#0f0f11", "#1c1c1f", "#6b6b74"], S: ["#17171a", "#3a3a40", "#898994"], A: ["#5a4414", "#d1a542", "#e2ca94"], E: ["#8f5f00", "#ffcc66", "#fde1a8"] }, sparkle: "glint" },
  { id: "glitterstorm", name: "Opal — Glitterstorm", source: "original", note: "Original pearl / lavender palette with real twinkling glitter: multi-colour 4-point sparkles (deterministic, sprite-local, 4 cached phases).",
    roles: { P: ["#9a4fc0", "#efe8f3", "#f8f6fa"], S: ["#3f227a", "#b8a3e3", "#d6caee"], A: ["#a40057", "#ff9ad0", "#fec6e4"], E: ["#3500b6", "#d8c8ff", "#e9e0fe"], H: ["#a38f8f", "#ffffff", "#fbfbfb"] }, sparkle: "glitter" },
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
