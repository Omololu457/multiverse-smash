// benThemeRegions.js: ONE regional map per sprite set for Ben's cosmetic themes (benThemes.js).
//
// A map is an ordered rule list. Each rule claims source colours by HSV window and assigns them a ROLE (P/S/A/E/H, see
// benThemes.js). The FIRST matching rule wins; a colour no rule claims is left exactly as drawn (outline black, skin, eye
// whites, teeth, mouths). `ref` is the region's reference colour (its dominant tone): a pixel brighter / darker than ref lands
// lighter / darker on the theme's ramp, which keeps the art's shading. `fb` = what an H rule does when the theme has no
// HIGHLIGHT ("keep" = natural, e.g. hair; "P" = the primary ramp, e.g. crystal facets).
// `mat` documents the per-material rule (fire / crystal / metal / fur / dark / organic); docs/ben10/skins/<set>_REGIONS.md
// records the mapping, the colours left alone and any region the art genuinely lacks.
// Colours were measured from every body strip of each set (tools/ben10/theme_palette_audit.py). Only RGB is recoloured:
// alpha (Ghostfreak's phase, fades) is copied untouched. FX sheets drawn outside the fighter sprite are not recoloured.
//
// rule: { role, h: [lo, hi] (degrees; lo > hi wraps through 0), s: [lo, hi], v: [lo, hi], ref: "#rrggbb", fb?, gain?, swapDark? }
// light: [roles]: a pale region takes the lightest of these roles in the theme (keeps a white chest light)
// swapDark: the role used instead when the theme's PRIMARY is near-black and its SECONDARY lighter (keeps black linework readable)
const R = (role, h, s, v, ref, extra = {}) => ({ role, h, s, v, ref, ...extra })
const ANY = [0, 360]

export const BEN_THEME_REGIONS = {
  // ── HUMANS ──
  classic: { label: "Ben — Classic (shirt / cargo pants / watch)", mat: "clothing", rules: [
    R("E", [100, 160], [0.5, 1], [0.2, 1], "#009300"),            // the Omnitrix watch face (#006200 / #009300 / #22b14c)
    R("H", [10, 32], [0.75, 1], [0.15, 0.6], "#844210", { fb: "keep" }), // brown hair (#4a2500 / #844210); skin (sat < 0.75) is not hair
    R("S", [60, 95], [0.5, 1], [0.15, 0.5], "#496315", { swapDark: "P" }),   // olive cargo pants (#496315 / #2b3d06)
    R("P", ANY, [0, 0.12], [0.7, 1], "#f3f3f3", { swapDark: "S" }),          // the white shirt (#fcfcfd / #f3f3f3 / #cecece); its stripe is black linework
  ] },
  jacket: { label: "Ben — Jacket / Alien Force (jacket / undershirt / jeans / watch)", mat: "clothing", rules: [
    R("P", [100, 140], [0.6, 1], [0.15, 0.7], "#009300", { swapDark: "S" }), // the green jacket (#006200 / #009300 / #003500 shading), over a BLACK undershirt
    R("S", [200, 230], [0.5, 1], [0.15, 0.6], "#09367b", { swapDark: "P" }), // the jeans (#09367b / #062553)
    R("H", [10, 32], [0.7, 1], [0.1, 0.4], "#341906", { fb: "keep" }), // brown hair (#341906 / #4c2a0e)
    R("A", [25, 45], [0.95, 1], [0.4, 0.7], "#a56300"),            // belt / shoe trim (#a56300 / #8c5200)
  ] },

  // ── READY ALIENS (aliens.js status "ready"; the 24 Ben can pick FIVE of) ──
  swampfire: { label: "Swampfire", mat: "organic + fire", rules: [
    R("P", [55, 100], [0.3, 1], [0.2, 0.8], "#688008"),            // olive body + its dark green-grey shading (#384828): ONE ramp, shading stays darker             // olive body
    R("A", [340, 10], [0.6, 1], [0.5, 1], "#c81018"),              // red flower / spots
    R("E", [25, 62], [0.6, 1], [0.85, 1], "#f89018"),              // flame orange + yellow seeds (fire ramp, separate from body)
  ] },
  heatblast: { label: "Heatblast", mat: "fire (flame core ≠ rock body)", rules: [
    R("E", [35, 66], [0.5, 1], [0.85, 1], "#ffc90e"),              // flame body (yellow / orange): the FIRE ramp
    R("E", [185, 265], [0.3, 1], [0.6, 1], "#00a2e8"),             // the Blue-flame alt palette's flames (same ENERGY role)
    R("P", [335, 10], [0.6, 1], [0.3, 1], "#ed1c24"),              // magma-red rock seams (#880015 / #ed1c24)
    R("S", ANY, [0, 0.12], [0.3, 0.8], "#616161"),                 // grey rock body (#616161 / #bebeb4)
  ] },
  megawhatt: { label: "Megawhatt", mat: "energy (body is electricity)", rules: [
    R("A", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),         // Omnitrix-lime eyes / mark
    R("E", [45, 62], [0.4, 1], [0.85, 1], "#fff200"),              // the electric-yellow body: ENERGY
    R("P", ANY, [0, 0.1], [0.12, 0.2], "#282828"),                 // the dark body core (#282828; pure #000000 outline kept)
  ] },
  goop: { label: "Goop", mat: "organic (goo) + metal projector", rules: [
    R("P", [70, 125], [0.3, 1], [0.2, 1], "#38a028"),              // green goo body + its dark shading (#384828), one ramp
    R("A", ANY, [0, 0.08], [0.3, 0.6], "#707070"),                 // the anti-gravity projector (metal grey)
  ] },
  xlr8: { label: "XLR8", mat: "dark body + stripes", rules: [
    R("E", [80, 95], [0.6, 1], [0.6, 1], "#84ce2c"),               // visor / eye highlight
    R("A", [190, 205], [0.6, 1], [0.3, 1], "#1393d1"),             // blue stripes (#1393d1 / #0c587c)
    R("P", ANY, [0, 0.1], [0.02, 0.2], "#292929"),                 // the black body (#292929 + its #080808 shading; #000000 outline kept)
  ] },
  eyeguy: { label: "Eye Guy", mat: "organic", rules: [
    R("E", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),         // every eye (Omnitrix lime)
    R("A", [130, 145], [0.7, 1], [0.25, 0.65], "#1d9441"),         // green shorts
    R("P", [40, 58], [0.3, 1], [0.6, 1], "#d1b52c"),               // yellow skin (#d1b52c / #e3d077)
    R("S", ANY, [0, 0.1], [0.1, 0.2], "#282828"),                  // dark body markings
  ] },
  ghostfreak: { label: "Ghostfreak", mat: "dark / intangible (alpha untouched)", rules: [
    R("E", [85, 100], [0.9, 1], [0.9, 1], "#66ff00"),              // the Omnitrix timeout flash
    R("P", ANY, [0, 0.15], [0.4, 0.92], "#c9c1bd"),                // ghost body greys (#d3cac5 … #73706f): shading kept by ref
    R("P", ANY, [0, 0.15], [0.17, 0.4], "#c9c1bd"),                // dark creases / shadow (#363534): SAME ramp, so they stay darker than the body
  ] },
  alienx: { label: "Alien X", mat: "dark (starfield)", rules: [
    R("E", [75, 95], [0.4, 0.8], [0.6, 0.9], "#89c041"),           // the chest Omnitrix mark
    R("P", ANY, [0, 0.1], [0.0, 0.2], "#080808"),                  // the black cosmic body (incl. pure black: it IS his body)
  ] },                                                             // the white stars / eyes are kept: bright existing eye pixels
  brainstorm: { label: "Brainstorm", mat: "carapace (organic armour)", rules: [
    R("E", [90, 150], [0.35, 1], [0.3, 1], "#299428"),             // green stripes, collar, eyes (energy); near-black green edge pixels stay as drawn
    R("A", [270, 350], [0.25, 1], [0.2, 1], "#874588"),            // purple / magenta joints (#874588 and its pink anti-aliasing)
    R("P", [355, 30], [0.5, 1], [0.15, 1], "#a13e10"),             // the orange-brown carapace (#a13e10 / #622800 / #4e200a + its bright rim light)
    R("S", [32, 50], [0.4, 0.75], [0.45, 0.7], "#96793f"),         // tan underside
  ] },
  terraspin: { label: "Terraspin", mat: "shell (organic armour)", rules: [
    R("P", [30, 95], [0.2, 1], [0.1, 0.85], "#8ea354"),            // olive shell + body + its dark shadow (#393710), one ramp
  ] },
  wildvine: { label: "Wildvine", mat: "plant (organic)", rules: [
    R("P", [125, 145], [0.5, 1], [0.2, 0.8], "#167232"),           // the plant body (#22b14c / #167232 / #0f4a21)
    R("E", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),         // Omnitrix mark
    R("E", [180, 205], [0.2, 1], [0.5, 1], "#00a2e8"),             // the blue eye-pods
    R("A", [40, 55], [0.8, 1], [0.8, 1], "#ffc90e"),               // yellow flower dots
    R("S", ANY, [0, 0.1], [0.1, 0.2], "#282828"),                  // dark body (#282828; #000000 outline kept)
  ] },
  jetray: { label: "Jetray", mat: "organic (body + wing membrane)", rules: [
    R("E", [80, 135], [0.5, 1], [0.3, 1], "#57c414"),              // green eyes + chest Omnitrix
    R("A", [46, 62], [0.4, 1], [0.6, 1], "#f0d514"),               // the yellow wing membrane
    R("S", [12, 45], [0.4, 1], [0.5, 1], "#cb982f"),               // gold / tan underside
    R("P", [320, 12], [0.4, 1], [0.15, 0.8], "#5f0d1d"),           // the crimson body
  ] },
  diamondhead_ov: { label: "Diamondhead", mat: "crystal (facet shading kept)", rules: [
    R("A", [85, 140], [0.5, 1], [0.2, 1], "#13561e"),             // his green shirt panel + Omnitrix (Ben's clothing green)
    R("H", [130, 210], [0.05, 0.3], [0.88, 1], "#b4f0d6", { fb: "P" }), // the brightest crystal facets
    R("P", [130, 210], [0.15, 1], [0.3, 1], "#79cead"),            // the teal crystal body (#79cead / #40988c / #b6eade …)
  ] },
  upgrade_ov: { label: "Upgrade", mat: "mechanical (metal / circuit / light distinct)", rules: [
    R("E", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),         // Omnitrix mark (light)
    R("P", [95, 118], [0.5, 1], [0.3, 1], "#58c837"),              // the green living-metal body (#58c837 / #398226): his main colour
    R("S", ANY, [0, 0.12], [0.05, 0.2], "#171717"),                // the black circuit plating (#171717; #000000 outline kept)
    R("A", ANY, [0, 0.1], [0.7, 0.92], "#cdcdcd", { light: ["A", "E"] }),   // grey metal plates (#cdcdcd), a light trim; pure white eye kept
  ] },
  humongousaur: { label: "Humongousaur", mat: "organic (hide + belly plates)", rules: [
    R("E", [85, 130], [0.5, 1], [0.2, 1], "#447a2a"),              // the chest Omnitrix
    R("S", [35, 58], [0.3, 0.7], [0.6, 1], "#cdb667", { light: ["S", "A"] }),   // tan belly plates (#cdb667 / #bfa761): a pale region
    R("P", [18, 64], [0.22, 0.85], [0.12, 0.62], "#5f4220", { gain: 1.6 }),     // brown hide + olive-brown shading; steep ramp keeps the stripes
  ] },
  feedback_ov: { label: "Feedback", mat: "mechanical-organic (body / plugs / energy distinct)", rules: [
    R("E", [70, 80], [0.6, 0.9], [0.85, 0.95], "#b5e61d"),         // Omnitrix eye / mark
    R("E", [185, 205], [0.2, 1], [0.6, 1], "#00a2e8"),             // blue energy (#00a2e8 / #99d9ea)
    R("A", [30, 45], [0.6, 1], [0.35, 0.8], "#bf8f26"),            // the gold / amber plugs (#bf8f26 / #735517)
    R("P", ANY, [0, 0.12], [0.05, 0.2], "#282828"),                // the black body (#282828 / #171717)
  ] },
  arcticguana: { label: "Arcticguana", mat: "organic + ice", rules: [
    R("E", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),         // Omnitrix mark
    R("E", [180, 200], [0.05, 0.4], [0.8, 1], "#99d9ea"),          // pale ice highlights (#99d9ea / #ccecf4)
    R("A", [192, 205], [0.8, 1], [0.6, 1], "#00a2e8"),             // the blue head / spines
    R("A", [225, 240], [0.5, 1], [0.4, 1], "#00a2e8"),             // indigo spine shading (#3f48cc): the same accent ramp, darker
    R("P", ANY, [0, 0.1], [0.12, 0.2], "#282828"),                 // the dark body (#282828; #000000 outline kept)
    R("S", ANY, [0, 0.1], [0.7, 0.92], "#e0e0e0", { light: ["S", "A"] }),   // the pale belly (#e0e0e0 / #c3c3c3)
  ] },
  benwolf: { label: "Benwolf", mat: "fur (fur ≠ claws / teeth)", rules: [
    R("E", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),         // Omnitrix eyes
    R("E", [130, 145], [0.6, 0.9], [0.5, 0.8], "#22b14c"),         // chest mark
    R("P", ANY, [0, 0.08], [0.3, 0.72], "#616161"),                // grey fur (#616161 / #a7a7a7)
    R("S", ANY, [0, 0.08], [0.18, 0.3], "#383838"),                // dark fur (#383838)
  ] },                                                             // #e0e0e0 / #c3c3c3 claws / teeth kept
  bigchill: { label: "Big Chill", mat: "ice / organic", rules: [
    R("E", [110, 125], [0.9, 1], [0.5, 0.7], "#209800"),           // Omnitrix mark
    R("E", [180, 200], [0.4, 1], [0.85, 1], "#50d8f8"),            // the bright cyan ice glow
    R("S", [220, 240], [0.6, 1], [0.15, 0.5], "#102070"),          // deep-blue wings / shadow
    R("P", [195, 225], [0.4, 1], [0.3, 0.85], "#205090"),          // the blue body (#205090 / #2860a0 / #3080b8)
  ] },
  ripjaws: { label: "Ripjaws", mat: "organic (aquatic)", rules: [
    R("E", [70, 85], [0.3, 0.9], [0.6, 1], "#84ce2c"),             // the lure light (#84ce2c / #d8eea5)
    R("E", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),         // Omnitrix mark
    R("A", [55, 75], [0.4, 0.7], [0.2, 0.6], "#3b441a"),           // the lure stalk / fin-arc (#3b441a / #818741)
    R("P", [185, 210], [0.1, 0.25], [0.45, 0.7], "#81959c"),       // the grey-blue back
    R("S", [180, 215], [0.0, 0.15], [0.75, 1], "#cedde4", { light: ["S", "A"] }),   // the pale belly (#cedde4 / #e0f1f8)
  ] },
  rath: { label: "Rath", mat: "fur (stripes kept)", rules: [
    R("E", [110, 130], [0.9, 1], [0.2, 0.7], "#009300"),           // the chest Omnitrix cross
    R("E", [70, 80], [0.8, 0.9], [0.85, 0.95], "#b5e61d"),
    R("P", [10, 30], [0.8, 1], [0.6, 1], "#ff5500"),               // orange fur (#ff5500 / #bd4204)
    R("S", ANY, [0, 0.1], [0.45, 0.97], "#cecece", { light: ["S", "A"] }),   // the white fur / chest (#f1f1f0 / #cecece / #a7a7a7): a pale region
  ] },                                                             // black stripes kept
  waterhazard: { label: "Water Hazard", mat: "armour (shell) + water", rules: [
    R("E", [75, 135], [0.35, 1], [0.4, 1], "#88c139"),             // eye slits, port lenses, chest Omnitrix
    R("E", [175, 200], [0.8, 1], [0.6, 1], "#00cccc"),             // the water core
    R("S", [225, 260], [0.05, 0.35], [0.15, 0.5], "#58566d"),      // the grey-purple under-suit
    R("P", [315, 360], [0.35, 1], [0.15, 0.8], "#901b31"),         // the crimson armour shell
  ] },
  highbreed: { label: "Highbreed", mat: "organic (pale skin + armour)", rules: [
    R("A", [15, 35], [0.6, 1], [0.7, 1], "#ef6300"),               // orange markings (#ef6300 / #e78c31)
    R("E", [290, 310], [0.5, 1], [0.2, 0.6], "#631863"),           // purple eyes / gems
    R("P", [180, 225], [0.05, 0.4], [0.3, 0.95], "#b5cee7"),       // the pale blue-grey skin
    R("S", ANY, [0, 0.12], [0.2, 0.32], "#393939"),                // dark armour (#393939 / #424a4a)
  ] },
  wildmutt_ov: { label: "Wildmutt", mat: "fur (fur ≠ mouth)", rules: [
    R("E", [60, 95], [0.5, 1], [0.4, 1], "#d0df50"),               // the flank Omnitrix dot (#d0df50 / #b5e61d / #408000)
    R("S", [20, 40], [0.9, 1], [0.15, 0.4], "#4a2500"),            // dark fur shading
    R("P", [15, 40], [0.5, 1], [0.6, 1], "#fc9225"),               // the orange fur (#fc9225 / #c27330)
  ] },                                                             // red mouth / grey kept
}
