// skins.js
// ──────────────────────────────────────────────────────────────────────────
// SKIN SYSTEM (Tasks 1/4/5). Each character has a list of skins:
//   { id, name, unlockLevel, portrait, spriteScale, animationData }
//
// FALLBACK RULE (per request): a skin's animationData = the character's DEFAULT
// animationData with the skin's OWN strips layered on top. So any slot the skin
// has its own art for uses it; every other slot is BORROWED from default. This
// guarantees a COMPLETE moveset per skin for the demo. Ambiguous rows are mapped
// with a best GUESS (see SKIN_GUESSES, surfaced in the report).
//
// Apply at match time via getSkinAnimationData(rosterKey, skinId) → set on the
// fighter; sprite.js/animationProfile prefer it (per-fighter, so mirror matches
// with different skins work). Default skin returns null = use existing art.
// ──────────────────────────────────────────────────────────────────────────
import { characters } from "./characters.js"
import { getLevel, isFullyUnlocked } from "./progression.js"
import { ALT_SKINS } from "./harness/alt_skin_manifest.mjs"

// ── OWN art per non-default skin (overrides; everything else is borrowed) ──────
// Dimensions MEASURED from the PNGs (frames × cell W×H). "[guess]" rows are noted
// in SKIN_GUESSES below for your correction.
const OWN = {
  // ---- GOJO2 (filenames clear; no basic-attack/hurt/dash sheets → borrowed) ----
  gojo2: {
    idle:               { frames: 5,  width: 25, height: 68, speed: 6, sheet: "./gojo2_idle_sheet.png" },
    walk:               { frames: 6,  width: 29, height: 68, speed: 5, sheet: "./gojo2_walk_sheet.png" },
    run:                { frames: 6,  width: 29, height: 68, speed: 4, sheet: "./gojo2_walk_sheet.png" },
    jump:               { frames: 5,  width: 27, height: 64, speed: 6, sheet: "./gojo2_jump_sheet.png" },
    fall:               { frames: 5,  width: 27, height: 64, speed: 6, sheet: "./gojo2_jump_sheet.png" },
    transform:          { frames: 9,  width: 30, height: 71, speed: 6, sheet: "./gojo2_intro_sheet.png", loop: false, lockLastFrame: true },
    blue_cast:          { frames: 10, width: 50, height: 68, speed: 5, sheet: "./gojo2_blue_sheet.png" },
    red_cast:           { frames: 4,  width: 26, height: 68, speed: 5, sheet: "./gojo2_red_sheet.png" },
    hollow_purple_cast: { frames: 12, width: 51, height: 68, speed: 5, sheet: "./gojo2_hollow_purple_sheet.png" },
    domain:             { frames: 14, width: 29, height: 70, speed: 5, sheet: "./gojo2_domain_sheet.png" }
  },

  // ---- MEGUMI2 (combat_a–h / move_c–e GUESSED) ----
  megumi2: {
    idle:         { frames: 4,  width: 23, height: 37,  speed: 6, sheet: "./megumi2_idle_sheet.png" },
    walk:         { frames: 4,  width: 32, height: 35,  speed: 5, sheet: "./megumi2_walk_a_sheet.png" },
    run:          { frames: 5,  width: 21, height: 35,  speed: 4, sheet: "./megumi2_walk_b_sheet.png" },             // [guess]
    hurt:         { frames: 6,  width: 38, height: 33,  speed: 6, sheet: "./megumi2_knockdown_sheet.png" },
    ultimate:     { frames: 9,  width: 93, height: 120, speed: 6, sheet: "./megumi2_combat_a_sheet.png" },           // [guess]
    light:        { frames: 3,  width: 42, height: 35,  speed: 4, sheet: "./megumi2_combat_b_sheet.png" },           // [guess]
    heavy:        { frames: 4,  width: 43, height: 48,  speed: 4, sheet: "./megumi2_combat_c_sheet.png" },           // [guess]
    up:           { frames: 13, width: 35, height: 36,  speed: 4, sheet: "./megumi2_combat_d_sheet.png" },           // [guess]
    air:          { frames: 13, width: 44, height: 36,  speed: 4, sheet: "./megumi2_combat_e_sheet.png" },           // [guess]
    down_air:     { frames: 6,  width: 23, height: 27,  speed: 4, sheet: "./megumi2_combat_f_sheet.png" },           // [guess]
    grab:         { frames: 7,  width: 32, height: 36,  speed: 5, sheet: "./megumi2_combat_g_sheet.png" },           // [guess]
    divine_dogs:  { frames: 3,  width: 31, height: 33,  speed: 5, sheet: "./megumi2_combat_h_sheet.png" },           // [guess]
    nue:          { frames: 3,  width: 21, height: 32,  speed: 5, sheet: "./megumi2_move_c_sheet.png" },             // [guess]
    max_elephant: { frames: 6,  width: 24, height: 37,  speed: 5, sheet: "./megumi2_move_d_sheet.png" },             // [guess]
    toad:         { frames: 2,  width: 18, height: 29,  speed: 5, sheet: "./megumi2_move_e_sheet.png" }              // [guess]
  }
}

// The exact GUESSED rows (ambiguous strips → slot), for the report / your edits.
export const SKIN_GUESSES = {
  megumi2: {
    "ultimate": "combat_a", "light": "combat_b", "heavy": "combat_c", "up": "combat_d",
    "air": "combat_e", "down_air": "combat_f", "grab": "combat_g",
    "divine_dogs(cast)": "combat_h", "nue(cast)": "move_c",
    "max_elephant(cast)": "move_d", "toad(cast)": "move_e", "run": "walk_b"
  }
}

// Display scale per skin (source cell heights differ from default).
const SKIN_SCALE = { gojo2: 1.8, megumi2: 2.2 /* cells vary 33–120px → compromise (flagged) */ }

function buildComplete(rosterKey, ownKey) {
  const base = characters[rosterKey]?.animationData || {}
  return { ...base, ...(OWN[ownKey] || {}) }   // OWN overrides borrowed defaults
}

// Alt-COLOR (recolor_hue) skin: a global hue-rotated repaint of the base sheets, produced by
// harness/gen_alt_skins.mjs. The recolor preserves layout/dimensions EXACTLY, so the skin's
// animationData is just the base with every sheet path retagged `<name>__<tag>.png` — no per-action
// frame data to maintain, no gameplay change (cosmetic only). Sheets without a `sheet` field pass through.
function recolorSkinAnim(rosterKey, tag) {
  const base = characters[rosterKey]?.animationData || {}
  const out = {}
  for (const [action, def] of Object.entries(base)) {
    out[action] = def?.sheet ? { ...def, sheet: def.sheet.replace(/\.png$/i, `__${tag}.png`) } : def
  }
  return out
}

// Recolored portrait path for a skin's select-screen thumbnail: the char's portrait retagged
// (recolor output is always PNG), or the recolored idle sheet when the char has no portrait.
function recolorPortrait(rosterKey, tag) {
  const p = characters[rosterKey]?.portrait
  if (p) return p.replace(/\.(png|jpe?g)$/i, `__${tag}.png`)
  const idle = characters[rosterKey]?.animationData?.idle?.sheet
  return idle ? idle.replace(/\.png$/i, `__${tag}.png`) : null
}

// Build the recolor-skin entries for a character straight from the generation manifest (single
// source of truth). All free (unlockLevel 0), cosmetic-only. `recolorTag` drives form-aware recolor
// (Vegeta SSJ/Blue, Goku Black Rose) — see abilities.js retagFormAnim / game.js applySkin.
function recolorSkins(rosterKey) {
  return (ALT_SKINS[rosterKey] || []).map(s => ({
    id: `${rosterKey}_${s.tag}`,
    name: `${s.name} (Alt)`,
    unlockLevel: 0,
    portrait: recolorPortrait(rosterKey, s.tag),
    spriteScale: characters[rosterKey]?.spriteScale,
    animationData: recolorSkinAnim(rosterKey, s.tag),
    recolorTag: s.tag,
  }))
}

export const SKINS = {
  // Gojo — base sprite transparency-repaired (2026-07-30), then rebuilt with 4 coordinated head-to-toe
  // colour skins (HAIR + main clothing/top + EYES all in one hue family; face/skin + white pants kept
  // natural) via tools/gen_gojo_creative.py, registered DIRECTLY here (like the Rengoku/Shinobu/Sukuna
  // creative batches), NOT through the abstract-hue ALT_SKINS manifest. Cosmetic only; zero gameplay.
  gojo: [
    { id: "default",       name: "Default",  unlockLevel: 0, portrait: characters.gojo?.portrait,      spriteScale: characters.gojo?.spriteScale, animationData: null },
    { id: "gojoCerulean",  name: "Cerulean", unlockLevel: 0, portrait: "./gojo_portrait__cerulean.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "cerulean") },
    { id: "gojoAmethyst",  name: "Amethyst", unlockLevel: 0, portrait: "./gojo_portrait__amethyst.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "amethyst") },
    { id: "gojoSolar",     name: "Solar",    unlockLevel: 0, portrait: "./gojo_portrait__solar.png",    spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "solar") },
    { id: "gojoRose",      name: "Rose",     unlockLevel: 0, portrait: "./gojo_portrait__rose.png",     spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "rose") },
    // ── Batch 2 · named/requested (coordinated hair+eyes; outfit per-skin) ──
    { id: "gojoBlossom",   name: "Blossom Limitless", unlockLevel: 0, portrait: "./gojo_portrait__blossom.png",    spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "blossom") },
    { id: "gojoOmnitrix",  name: "Omnitrix Protocol", unlockLevel: 0, portrait: "./gojo_portrait__omnitrix.png",   spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "omnitrix") },
    { id: "gojoAlbedo",    name: "Albedo Protocol",   unlockLevel: 0, portrait: "./gojo_portrait__albedopr.png",   spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "albedopr") },
    { id: "gojoInfinityVoid", name: "Infinity Void",  unlockLevel: 0, portrait: "./gojo_portrait__infinivoid.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "infinivoid") },   // + procedural blue-white motes & barrier-ring pulses (game.js drawGojoInfinityVoidOverlay, gated on this id)
    // ── Batch 2 · deep hair+eyes, natural BLACK outfit (white pants kept) ──
    { id: "gojoCobalt",  name: "Cobalt Six Eyes",  unlockLevel: 0, portrait: "./gojo_portrait__cobalt.png",  spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "cobalt") },
    { id: "gojoCrimson", name: "Crimson Domain",   unlockLevel: 0, portrait: "./gojo_portrait__crimson.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "crimson") },
    { id: "gojoEmerald", name: "Emerald Sorcerer", unlockLevel: 0, portrait: "./gojo_portrait__emerald.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "emerald") },
    { id: "gojoGolden",  name: "Golden Jujutsu",   unlockLevel: 0, portrait: "./gojo_portrait__golden.png",  spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "golden") },
    // ── Batch 3 · deep hair+eyes, natural BLACK outfit (Amethyst Gaze ≠ light "Amethyst"; Sunfire ≠ "Solar") ──
    { id: "gojoAmethystGaze", name: "Amethyst Gaze",   unlockLevel: 0, portrait: "./gojo_portrait__amethystgaze.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "amethystgaze") },
    { id: "gojoIvory",   name: "Ivory Strongest", unlockLevel: 0, portrait: "./gojo_portrait__ivory.png",   spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "ivory") },
    { id: "gojoTeal",    name: "Teal Barrier",    unlockLevel: 0, portrait: "./gojo_portrait__teal.png",    spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "teal") },
    { id: "gojoSunfire", name: "Sunfire Sorcerer",unlockLevel: 0, portrait: "./gojo_portrait__sunfire.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "sunfire") },
    // ── Batch 4 · (Rose Quartz = pink-lavender ≠ warm "Rose" / vivid "Blossom"; Obsidian near-black + cyan-eye accent; Ashen dark-red top; Storm dark-gray top + cyan eyes) ──
    { id: "gojoRoseQuartz", name: "Rose Quartz Gaze",  unlockLevel: 0, portrait: "./gojo_portrait__rosequartz.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "rosequartz") },
    { id: "gojoObsidian",   name: "Obsidian Strongest",unlockLevel: 0, portrait: "./gojo_portrait__obsidian.png",   spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "obsidian") },
    { id: "gojoAshen",      name: "Ashen Sorcerer",    unlockLevel: 0, portrait: "./gojo_portrait__ashen.png",      spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "ashen") },
    { id: "gojoStorm",      name: "Storm Barrier",     unlockLevel: 0, portrait: "./gojo_portrait__storm.png",      spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "storm") }
  ],
  // SUKUNA — base sprite transparency-repaired (2026-08-03). "Regular" = the iconic pink-haired Sukuna.
  // 2026-08-03: ALL prior alt-skins DELETED (the 10 palette-swap pack + the orphaned Cerulean creative +
  // Jill's Crew affiliation) to rebuild fresh. Only the true Default remains here; the 12 NEW creative skins
  // are appended below. (reanim sheets kept on disk — they're Tobirama's Edo-Tensei SUMMON palette, not a skin.)
  sukuna: [
    { id: "default", name: "Regular", unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: null },
    // ── Creative pack GROUP 1 (gen_sukuna_creative2.py): hair+markings coordinated accent · black clothing ──
    { id: "sukunaObsidianCurse", name: "Obsidian Curse", unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "obsidiancurse") },
    { id: "sukunaCrimsonKing",   name: "Crimson King",   unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "crimsonking") },
    { id: "sukunaVoidSovereign", name: "Void Sovereign", unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "voidsovereign") },   // + procedural dark-red ember overlay (game.js drawSukunaVoidEmberOverlay, gated on this id)
    { id: "sukunaGoldenTyrant",  name: "Golden Tyrant",  unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "goldentyrant") },
    // ── Creative pack GROUP 2 ──
    { id: "sukunaAzureMalice",       name: "Azure Malice",       unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "azuremalice") },
    { id: "sukunaEmeraldRot",        name: "Emerald Rot",        unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "emeraldrot") },
    { id: "sukunaAmethystSovereign", name: "Amethyst Sovereign", unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "amethystsovereign") },
    { id: "sukunaIvoryDecree",       name: "Ivory Decree",       unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "ivorydecree") },
    // ── Creative pack GROUP 3 ──
    { id: "sukunaAshenRuin",          name: "Ashen Ruin",          unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "ashenruin") },
    { id: "sukunaSunfireMalevolence", name: "Sunfire Malevolence", unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "sunfiremalevolence") },
    { id: "sukunaTealCataclysm",      name: "Teal Cataclysm",      unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "tealcataclysm") },
    { id: "sukunaRoseCarnage",        name: "Rose Carnage",        unlockLevel: 0, portrait: characters.sukuna?.portrait, spriteScale: characters.sukuna?.spriteScale, animationData: recolorSkinAnim("sukuna", "rosecarnage") }
  ],
  megumi: [
    { id: "default", name: "Default",          unlockLevel: 0, portrait: characters.megumi?.portrait, spriteScale: characters.megumi?.spriteScale, animationData: null },
    { id: "megumi2", name: "Ten Shadows (Alt)", unlockLevel: 3, portrait: "./megumi2_idle_sheet.png",  spriteScale: SKIN_SCALE.megumi2,  animationData: buildComplete("megumi", "megumi2") }
  ],
  // Yuji Itadori (JJK). Same fallback reason as Goku/Naruto below: WITHOUT a default skin entry, applySkin()
  // pulls the getSkins() spriteScale:1 fallback → Yuji renders at native ~53px (half size). This entry sources
  // his real 2.10 spriteScale from the character. No alt skins yet (cosmetic pass deferred to a future stage).
  yuji: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.yuji?.portrait, spriteScale: characters.yuji?.spriteScale, animationData: null },
    // 12 GENUINELY creative recolors (tools/gen_yuji_creative.py) — HAIR (pink) + OUTFIT (navy) + ACCENT (red
    // trim) all vary as one coordinated palette identity. FX PRESERVED: cyan cursed-energy/blue-crescent falls
    // outside every band; the red flame-trail FX on koma1/koma2/aircombo is preserved by an accent-SKIP on those
    // 3 sheets (hair+outfit only). Projectile/impact FX sheets are hardcoded (not skin-tagged) → always canonical.
    // ── Group 1 · colorful/vibrant ──
    { id: "yujiSunburst", name: "Sunburst",      unlockLevel: 0, portrait: "./yuji_portrait__sunburst.png", spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "sunburst") },
    { id: "yujiCobalt",   name: "Cobalt Strike", unlockLevel: 0, portrait: "./yuji_portrait__cobalt.png",   spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "cobalt") },
    { id: "yujiEmerald",  name: "Emerald Flash", unlockLevel: 0, portrait: "./yuji_portrait__emerald.png",  spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "emerald") },
    { id: "yujiMagenta",  name: "Magenta Rush",  unlockLevel: 0, portrait: "./yuji_portrait__magenta.png",  spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "magenta") },
    // ── Group 2 · deliberately dull/muted ──
    { id: "yujiAshen",    name: "Ashen Gray",    unlockLevel: 0, portrait: "./yuji_portrait__ashen.png",     spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "ashen") },
    { id: "yujiKhaki",    name: "Faded Khaki",   unlockLevel: 0, portrait: "./yuji_portrait__khaki.png",     spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "khaki") },
    { id: "yujiDustyRose",name: "Dusty Rose",    unlockLevel: 0, portrait: "./yuji_portrait__dustyrose.png", spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "dustyrose") },
    { id: "yujiSlate",    name: "Slate Mist",    unlockLevel: 0, portrait: "./yuji_portrait__slate.png",     spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "slate") },
    // ── Group 3 · super-cool / standout ──
    { id: "yujiCrimson",  name: "Crimson Reaper",  unlockLevel: 0, portrait: "./yuji_portrait__crimson.png",  spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "crimson") },
    { id: "yujiGolden",   name: "Golden Vanguard", unlockLevel: 0, portrait: "./yuji_portrait__golden.png",   spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "golden") },
    { id: "yujiStorm",    name: "Stormbringer",    unlockLevel: 0, portrait: "./yuji_portrait__storm.png",    spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "storm") },
    { id: "yujiObsidian", name: "Obsidian Edge",   unlockLevel: 0, portrait: "./yuji_portrait__obsidian.png", spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "obsidian") },
    // ── VOID (Alien-X-style) ── Part A: full-form near-black flatten (hair/outfit/skin/face, tools/gen_yuji_creative.py void).
    // Part B: procedural game.js drawYujiVoidOverlay gated on this skinId — pale white void-dust dots + soft violet-only
    // clusters, tracked via _lastDraw* across every pose (incl. air combo + Ultimate). Shared Void-family technique
    // (sibling of Rick/Superman/Rengoku/Chrollo/Maki/Sukuna void), with a signature distinct from each.
    { id: "yujiVoid",     name: "Void",            unlockLevel: 0, portrait: "./yuji_portrait__void.png",     spriteScale: characters.yuji?.spriteScale, animationData: recolorSkinAnim("yuji", "void") }
  ],
  // Base Goku. Needs a default skin so applySkin() pulls THIS spriteScale from the
  // character; without an entry, getSkins() returns the spriteScale:1 fallback and
  // Goku renders at native 37px. No alt skins yet. (Dragon Ball → not a JJK-beta skin.)
  goku: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.goku?.portrait, spriteScale: characters.goku?.spriteScale, animationData: null }
  ],

  // KCM Naruto. Same reason as Goku above: WITHOUT a default skin, applySkin()
  // (game.js) pulls the getSkins() spriteScale:1 fallback and Naruto renders at
  // native ~63px (half size). This entry sources his real spriteScale from the
  // character. No alt skins yet. (Naruto universe → not a JJK-beta skin.)
  naruto: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.naruto?.portrait, spriteScale: characters.naruto?.spriteScale, animationData: null }
  ],

  // Sasuke (Naruto universe). Same reason as Naruto/Goku: WITHOUT a default skin, applySkin()
  // pulls the getSkins() spriteScale:1 fallback and he renders at native ~57px (half size). This
  // entry sources his real spriteScale from the character. Phase 1: no alt skins yet.
  sasuke: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.sasuke?.portrait, spriteScale: characters.sasuke?.spriteScale, animationData: null }
  ],

  // Itachi (Naruto universe). Same gate as Naruto/Sasuke: WITHOUT a default skin, applySkin()
  // pulls the getSkins() spriteScale:1 fallback and he renders at native ~72px (half size). This
  // entry sources his real spriteScale (1.55) from the character. No alt skins yet.
  itachi: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.itachi?.portrait, spriteScale: characters.itachi?.spriteScale, animationData: null }
  ],

  // Tobirama (universe: naruto) — STAGE 1. WITHOUT a default skin, applySkin() pulls the getSkins()
  // spriteScale:1 fallback and he renders at native size. This entry sources his real spriteScale
  // (1.3) from the character. No alt skins yet.
  tobirama: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.tobirama?.portrait, spriteScale: characters.tobirama?.spriteScale, animationData: null }
  ],

  // Minato (universe: naruto) — STAGE 1. WITHOUT a default skin, applySkin() pulls the getSkins()
  // spriteScale:1 fallback and he renders at native ~64px (half size). This entry sources his real
  // spriteScale (1.7) from the character. No alt skins yet.
  minato: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.minato?.portrait, spriteScale: characters.minato?.spriteScale, animationData: null },
    // 12 GENUINELY creative recolors (tools/gen_minato_creative.py) — HAIR + OUTFIT + ACCENT all vary as one
    // coordinated palette identity (the Maki/Hisoka creative bar). Face/hands protected, line-art preserved.
    // Cosmetic only — NO recolorTag, NO stat/gameplay change. Minato's first dedicated skin batch.
    // ── Group 1 ──
    { id: "minatoCrimsonFlash",  name: "Crimson Flash",   unlockLevel: 0, portrait: "./minato_portrait__crimsonflash.png",   spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "crimsonflash") },
    { id: "minatoCobaltStrike",  name: "Cobalt Strike",   unlockLevel: 0, portrait: "./minato_portrait__cobaltstrike.png",   spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "cobaltstrike") },
    { id: "minatoEmeraldSage",   name: "Emerald Sage",    unlockLevel: 0, portrait: "./minato_portrait__emeraldsage.png",    spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "emeraldsage") },
    { id: "minatoObsidianHokage",name: "Obsidian Hokage", unlockLevel: 0, portrait: "./minato_portrait__obsidianhokage.png", spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "obsidianhokage") },
    // ── Group 2 ──
    { id: "minatoAmethystFlicker",name: "Amethyst Flicker", unlockLevel: 0, portrait: "./minato_portrait__amethystflicker.png", spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "amethystflicker") },
    { id: "minatoRoseTempest",   name: "Rose Tempest",     unlockLevel: 0, portrait: "./minato_portrait__rosetempest.png",     spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "rosetempest") },
    { id: "minatoIvorySeal",     name: "Ivory Seal",       unlockLevel: 0, portrait: "./minato_portrait__ivoryseal.png",       spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "ivoryseal") },
    { id: "minatoGoldenLegacy",  name: "Golden Legacy",    unlockLevel: 0, portrait: "./minato_portrait__goldenlegacy.png",    spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "goldenlegacy") },
    // ── Group 3 ── (Void Flash = black-base recolor + procedural game.js drawVoidFlashOverlay golden Raijin
    // sparks, gated on this skinId — same Void-family technique as Maki Void Hunter / Superman Phantom Zone.)
    { id: "minatoTealSealmaster",name: "Teal Sealmaster",  unlockLevel: 0, portrait: "./minato_portrait__tealsealmaster.png", spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "tealsealmaster") },
    { id: "minatoAshenVeteran",  name: "Ashen Veteran",    unlockLevel: 0, portrait: "./minato_portrait__ashenveteran.png",   spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "ashenveteran") },
    { id: "minatoVoidFlash",     name: "Void Flash",       unlockLevel: 0, portrait: "./minato_portrait__voidflash.png",      spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "voidflash") },
    { id: "minatoStormSeal",     name: "Storm Seal",       unlockLevel: 0, portrait: "./minato_portrait__stormseal.png",      spriteScale: characters.minato?.spriteScale, animationData: recolorSkinAnim("minato", "stormseal") }
  ],

  // Madara (universe: naruto) — STAGE 1. WITHOUT a default skin, applySkin() pulls the getSkins()
  // spriteScale:1 fallback and he renders at native ~62px (half size). This entry sources his real
  // spriteScale (1.8) from the character.
  // 6 creative recolors (tools/gen_madara_creative.py). Per-region, classified once from the ORIGINAL
  // pixels: HAIR (blue-black mane) / ROBE (dark neutral garment) / ACCENT (saturated red chest armor),
  // each to-tone re-centred (multi-tone shading preserved). Face/skin + tan armour-ties (same warm hue)
  // and the near-black outline are protected (line-art guard). Cosmetic-only — ZERO gameplay changes.
  madara: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.madara?.portrait, spriteScale: characters.madara?.spriteScale, animationData: null },
    { id: "madaraShatteredCrown", name: "Shattered Crown", unlockLevel: 0, portrait: "./madara_portrait__shatteredcrown.png", spriteScale: characters.madara?.spriteScale, animationData: recolorSkinAnim("madara", "shatteredcrown") },
    { id: "madaraVoidAwakening",  name: "Void Awakening",  unlockLevel: 0, portrait: "./madara_portrait__voidawakening.png",  spriteScale: characters.madara?.spriteScale, animationData: recolorSkinAnim("madara", "voidawakening") },
    { id: "madaraScarletEclipse", name: "Scarlet Eclipse", unlockLevel: 0, portrait: "./madara_portrait__scarleteclipse.png", spriteScale: characters.madara?.spriteScale, animationData: recolorSkinAnim("madara", "scarleteclipse") },
    { id: "madaraWintersEdge",    name: "Winter's Edge",   unlockLevel: 0, portrait: "./madara_portrait__wintersedge.png",    spriteScale: characters.madara?.spriteScale, animationData: recolorSkinAnim("madara", "wintersedge") },
    { id: "madaraForestWarden",   name: "Forest Warden",   unlockLevel: 0, portrait: "./madara_portrait__forestwarden.png",   spriteScale: characters.madara?.spriteScale, animationData: recolorSkinAnim("madara", "forestwarden") },
    { id: "madaraAshfall",        name: "Ashfall",         unlockLevel: 0, portrait: "./madara_portrait__ashfall.png",        spriteScale: characters.madara?.spriteScale, animationData: recolorSkinAnim("madara", "ashfall") }
  ],

  // Obito Uchiha (Naruto). Default + 12 creative recolors (tools/gen_obito_creative.py). This obito
  // sprite is UNMASKED (exposed face) — the masked "Tobi" is the separate roster entry below — so the
  // skins vary THREE coordinated regions: HAIR + CLOTHING (the dark-purple robe, body+pants recolored
  // to one hue preserving each's value → distinct shades) + SWORD-ACCENT (the belt/sash + sandal trim).
  // FACE/SKIN + the near-black line-art outlines are protected (line-art guard: only interior fills
  // recolor, boundary strokes stay black). Cosmetic-only — ZERO gameplay. Skin 11 (Void) adds a
  // procedural Sharingan/Kamui overlay (game.js drawObitoVoidOverlay, gated on this id).
  obito: [
    { id: "default",        name: "Default",          unlockLevel: 0, portrait: characters.obito?.portrait,          spriteScale: characters.obito?.spriteScale, animationData: null },
    { id: "obitoOmnitrix",  name: "Omnitrix Protocol", unlockLevel: 0, portrait: "./obito_portrait__omnitrix.png",   spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "omnitrix") },
    { id: "obitoAlbedo",    name: "Albedo Protocol",   unlockLevel: 0, portrait: "./obito_portrait__albedo.png",     spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "albedo") },
    { id: "obitoCrimsonEye",name: "Crimson Eye",       unlockLevel: 0, portrait: "./obito_portrait__crimsoneye.png", spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "crimsoneye") },
    { id: "obitoCobalt",    name: "Cobalt Mask",       unlockLevel: 0, portrait: "./obito_portrait__cobalt.png",     spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "cobalt") },
    { id: "obitoGoldenEye", name: "Golden Eye",        unlockLevel: 0, portrait: "./obito_portrait__goldeneye.png",  spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "goldeneye") },
    { id: "obitoAmethyst",  name: "Amethyst Void",     unlockLevel: 0, portrait: "./obito_portrait__amethyst.png",   spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "amethyst") },
    { id: "obitoAshen",     name: "Ashen Mask",        unlockLevel: 0, portrait: "./obito_portrait__ashen.png",      spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "ashen") },
    { id: "obitoIvory",     name: "Ivory Eye",         unlockLevel: 0, portrait: "./obito_portrait__ivory.png",      spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "ivory") },
    { id: "obitoTeal",      name: "Teal Mask",         unlockLevel: 0, portrait: "./obito_portrait__teal.png",       spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "teal") },
    { id: "obitoSunfire",   name: "Sunfire Eye",       unlockLevel: 0, portrait: "./obito_portrait__sunfire.png",    spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "sunfire") },
    { id: "obitoVoid",      name: "Void Mask",         unlockLevel: 0, portrait: "./obito_portrait__void.png",       spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "void") },   // + procedural Sharingan particles & Kamui swirl pulses (game.js drawObitoVoidOverlay, gated on this id)
    { id: "obitoStorm",     name: "Storm Eye",         unlockLevel: 0, portrait: "./obito_portrait__storm.png",      spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "storm") }
  ],

  // Tobi (masked Obito alias, Naruto). FULLY SEPARATE from obito above. Same gate: WITHOUT a
  // default skin, applySkin() pulls the getSkins() spriteScale:1 fallback → native ~57px (half
  // size). Sources his real spriteScale (1.90) from the character. No portrait yet (procedural-box
  // fallback on select). Creative skins are a later pass.
  tobi: [
    { id: "default",          name: "Default",          unlockLevel: 0, portrait: characters.tobi?.portrait,             spriteScale: characters.tobi?.spriteScale, animationData: null },
    // Group 1 (Beyblade-inspired) — cosmetic recolors via tools/gen_tobi_creative.py (mask/hair/cloak/accent).
    { id: "tobiMirageDragon", name: "Mirage Dragon",    unlockLevel: 0, portrait: "./tobi_portrait__miragedragon.png",  spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "miragedragon") },
    { id: "tobiWinningValor", name: "Winning Valor",    unlockLevel: 0, portrait: "./tobi_portrait__winningvalor.png",  spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "winningvalor") },
    { id: "tobiSovereignWyrm",name: "Sovereign Wyrm",   unlockLevel: 0, portrait: "./tobi_portrait__sovereignwyrm.png", spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "sovereignwyrm") },
    { id: "tobiOmnitrix",     name: "Omnitrix Protocol", unlockLevel: 0, portrait: "./tobi_portrait__omnitrix.png",      spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "omnitrix") },
    // Group 2.
    { id: "tobiAlbedo",       name: "Albedo Protocol",  unlockLevel: 0, portrait: "./tobi_portrait__albedo.png",        spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "albedo") },
    { id: "tobiCrimsonEye",   name: "Crimson Eye",      unlockLevel: 0, portrait: "./tobi_portrait__crimsoneye.png",    spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "crimsoneye") },
    { id: "tobiCobalt",       name: "Cobalt Shade",     unlockLevel: 0, portrait: "./tobi_portrait__cobalt.png",        spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "cobalt") },
    { id: "tobiAshen",        name: "Ashen Wraith",     unlockLevel: 0, portrait: "./tobi_portrait__ashenwraith.png",   spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "ashenwraith") },
    // Group 3.
    { id: "tobiGolden",       name: "Golden Mask",      unlockLevel: 0, portrait: "./tobi_portrait__golden.png",        spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "golden") },
    { id: "tobiTeal",         name: "Teal Phantom",     unlockLevel: 0, portrait: "./tobi_portrait__teal.png",          spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "teal") },
    { id: "tobiAmethyst",     name: "Amethyst Veil",    unlockLevel: 0, portrait: "./tobi_portrait__amethyst.png",      spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "amethyst") },
    { id: "tobiSunfire",      name: "Sunfire Mask",     unlockLevel: 0, portrait: "./tobi_portrait__sunfire.png",       spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "sunfire") },
    // FINAL — Celestial Veil: LIGHT pale-lavender base (Part A recolor) + a serene pastel-STAR procedural
    // overlay (Part B, game.js drawTobiCelestialOverlay). Deliberately soft/elegant, NOT a harsh Void skin.
    { id: "tobiCelestial",    name: "Celestial Veil",   unlockLevel: 0, portrait: "./tobi_portrait__celestial.png",     spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "celestial") }
  ],

  // Netero (Hunter x Hunter). Same gate as the sprite characters above: WITHOUT a default skin,
  // applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native ~60px (half
  // size). Sources his real spriteScale (1.85) from the character. No portrait yet (procedural-box
  // fallback on select). No alt skins yet.
  netero: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.netero?.portrait, spriteScale: characters.netero?.spriteScale, animationData: null }
  ],

  // Saiki Kusuo (The Disastrous Life of Saiki K.). Same gate: WITHOUT a default skin, applySkin()
  // pulls the getSkins() spriteScale:1 fallback and he renders at native ~52px (half size). Sources
  // his real spriteScale (2.2) from the character. No portrait yet (procedural-box fallback on select).
  saiki: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.saiki?.portrait, spriteScale: characters.saiki?.spriteScale, animationData: null }
    // saikiAzure removed in the Part 0 reset (2026-07-24) — a Saiki recolor will be regenerated in Part 2.
  ],

  // Killua Zoldyck (Hunter x Hunter). Same gate: WITHOUT a default skin, applySkin() pulls the
  // getSkins() spriteScale:1 fallback and he renders at native ~53px (half size). Sources his real
  // spriteScale (2.1) from the character. Portrait crops the intro pose (no dedicated mugshot yet).
  killua: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.killua?.portrait, spriteScale: characters.killua?.spriteScale, animationData: null }
  ],

  // Gon Freecss (Hunter x Hunter) — STAGE 1. Same gate: WITHOUT a default skin, applySkin() pulls the
  // getSkins() spriteScale:1 fallback and he renders at native ~half size. Sources his real
  // spriteScale (2.5) + portrait from the character.
  gon: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.gon?.portrait, spriteScale: characters.gon?.spriteScale, animationData: null }
  ],

  // Chrollo Lucilfer (Hunter x Hunter) — STAGE 1. Same gate: WITHOUT a default skin, applySkin()
  // pulls the getSkins() spriteScale:1 fallback and he renders at native ~58px (half size). Sources
  // his real spriteScale (1.9) + portrait from the character. No alt skins yet.
  chrollo: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.chrollo?.portrait, spriteScale: characters.chrollo?.spriteScale, animationData: null },
    // "Phantom Troupe" — canonical reference palette (tools/gen_chrollo_reference.py). Per-region,
    // tone-preserving: coat navy->deep-purple #4A2E5C (yband<0.62), trousers->charcoal #1A1A1E
    // (yband>=0.62), collar/cuff/leg-wrap fur->silver #E8E4DC, coat-front buttons->gold #D4A537;
    // skin untouched. (maroon lining + a distinct leg-wrap gray are sub-pixel at ~28px, not separated.)
    { id: "chrolloTroupe", name: "Phantom Troupe", unlockLevel: 0, portrait: "./chrollo_portrait__troupe.png", spriteScale: characters.chrollo?.spriteScale, animationData: recolorSkinAnim("chrollo", "troupe") },
    // 12 creative recolors (tools/gen_chrollo_creative.py). Per-region on his NORMAL (untransformed) body:
    // COAT (top yband) / LINING (= darkest coat sub-band, the only way to express the sub-pixel inner
    // lining at ~28px) / TROUSERS (bottom yband, kept charcoal) / FUR trim (collar+cuffs, = leg-wraps too,
    // not separable) / gold buttons kept. Face/hands (skin) excluded. Orthogonal to the Skill Hunter
    // runtime tint (sprite.js SKILL_HUNTER_TINT), which washes the COPIED body, not these sheets.
    // ── Checkpoint group 1 ──
    { id: "chrolloCerulean", name: "Cerulean Collector", unlockLevel: 0, portrait: "./chrollo_portrait__cerulean.png", spriteScale: characters.chrollo?.spriteScale, animationData: recolorSkinAnim("chrollo", "cerulean") },
    { id: "chrolloVerdant",  name: "Verdant Spider",     unlockLevel: 0, portrait: "./chrollo_portrait__verdant.png",  spriteScale: characters.chrollo?.spriteScale, animationData: recolorSkinAnim("chrollo", "verdant") },
    { id: "chrolloCrimson",  name: "Crimson Troupe",     unlockLevel: 0, portrait: "./chrollo_portrait__crimson.png",  spriteScale: characters.chrollo?.spriteScale, animationData: recolorSkinAnim("chrollo", "crimson") },
    { id: "chrolloGolden",   name: "Golden Pages",       unlockLevel: 0, portrait: "./chrollo_portrait__golden.png",   spriteScale: characters.chrollo?.spriteScale, animationData: recolorSkinAnim("chrollo", "golden") }
  ],

  // The Flash (DC). Same gate: WITHOUT a default skin, applySkin() pulls the getSkins()
  // spriteScale:1 fallback and he renders at native ~half size. Sources his real spriteScale
  // (1.25) + portrait from the character.
  flash: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.flash?.portrait, spriteScale: characters.flash?.spriteScale, animationData: null },
    { id: "flashBlue", name: "Blue Streak (Alt)", unlockLevel: 0, portrait: "./flash_portrait__blue.png", spriteScale: characters.flash?.spriteScale, animationData: recolorSkinAnim("flash", "blue") }
  ],

  // Batman (DC). Same gate: WITHOUT a default skin, applySkin() pulls the getSkins()
  // spriteScale:1 fallback and he renders at native ~half size (his art is large so the
  // fallback would OVER-size then his own <1 scale wouldn't apply). Sources his real
  // spriteScale (0.92) + portrait from the character. No alt skins yet.
  batman: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.batman?.portrait, spriteScale: characters.batman?.spriteScale, animationData: null },
    // "Nightwatch" — dark tactical recolor (tools/gen_batman_nightwatch.py): the (already near-black)
    // suit gets a faint cool-charcoal tint (#0D0E10–#1A1B1F) and the yellow belt + bat-emblem + cowl
    // eye-slit recolor to cyan glow #3DDBEE. Cosmetic only; all three regions were colour-separable.
    { id: "batmanNightwatch", name: "Nightwatch", unlockLevel: 0, portrait: "./batman_portrait__nightwatch.png", spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "nightwatch") },
    // 10 alt-color recolors (tools/gen_batman_skins.py). Batman's sprite is monochrome-dark: the suit,
    // cape, cowl & boots are ONE non-separable near-black material, so each skin = a MAIN zone (all lit
    // charcoal surfaces) + a CAPE/SHADOW zone (pure-black → a darker family tone; the cape reads darker
    // because it's mostly shadow) + the gold emblem/belt ACCENT → gold|silver|black. Skin & eye-slit are
    // excluded from every pass. A cape colored *contrastingly* from the suit is not achievable on this art.
    // -- Part 1: alternate-suit themes --
    { id: "batmanSteelBlue",    name: "Steel Blue",    unlockLevel: 0, portrait: "./batman_portrait__steelblue.png",    spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "steelblue") },
    { id: "batmanCrimsonWatch", name: "Crimson Watch", unlockLevel: 0, portrait: "./batman_portrait__crimsonwatch.png", spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "crimsonwatch") },
    { id: "batmanSilverAge",    name: "Silver Age",    unlockLevel: 0, portrait: "./batman_portrait__silverage.png",    spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "silverage") },
    { id: "batmanStealthWhite", name: "Stealth White", unlockLevel: 0, portrait: "./batman_portrait__stealthwhite.png", spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "stealthwhite") },
    { id: "batmanGoldenKnight", name: "Golden Knight", unlockLevel: 0, portrait: "./batman_portrait__goldenknight.png", spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "goldenknight") },
    // -- Part 2: vivid color families --
    { id: "batmanLavender",     name: "Lavender",      unlockLevel: 0, portrait: "./batman_portrait__lavender.png",     spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "lavender") },
    { id: "batmanRose",         name: "Rose",          unlockLevel: 0, portrait: "./batman_portrait__rose.png",         spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "rose") },
    { id: "batmanAmethyst",     name: "Amethyst",      unlockLevel: 0, portrait: "./batman_portrait__amethyst.png",     spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "amethyst") },
    { id: "batmanCobalt",       name: "Cobalt",        unlockLevel: 0, portrait: "./batman_portrait__cobalt.png",       spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "cobalt") },
    { id: "batmanEmerald",      name: "Emerald",       unlockLevel: 0, portrait: "./batman_portrait__emerald.png",      spriteScale: characters.batman?.spriteScale, animationData: recolorSkinAnim("batman", "emerald") }
  ],

  // Hisoka Morrow (Hunter x Hunter). Same gate: WITHOUT a default skin, applySkin() pulls the
  // getSkins() spriteScale:1 fallback → native ~half size. Sources spriteScale (2.0) from char.
  hisoka: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.hisoka?.portrait, spriteScale: characters.hisoka?.spriteScale, animationData: null },
    // "Greed Island Outfit" — reference-sampled recolor + per-frame edits (tools/gen_hisoka_greedisland.py):
    // orange hair→red, teal jumpsuit(torso+legs)→pale lavender-white, pink sash→dusty rose, gray shoes→rose
    // pink; the base chest heart+diamond emblem is ERASED (diffusion-filled) and a stopgap pink undershirt
    // collar is synthesised at the neckline. Cosmetic only.
    { id: "hisokaGreedIsland", name: "Greed Island Outfit", unlockLevel: 0, portrait: "./hisoka_portrait__greedisland.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "greedisland") },
    // Four outfit-inspired recolors (tools/gen_hisoka_outfits.py) — targeted per-region, multi-tone
    // shading preserved, face/skin excluded, orange hair KEPT. Cosmetic only. Emblem recoloured
    // (not erased); neck-scarf/collar/striped-socks flagged as absent from the base art (not faked).
    { id: "hisokaAzure", name: "Azure", unlockLevel: 0, portrait: "./hisoka_portrait__azure.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "azure") },
    { id: "hisokaIvory", name: "Ivory", unlockLevel: 0, portrait: "./hisoka_portrait__ivory.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "ivory") },
    { id: "hisokaSeafoam", name: "Seafoam", unlockLevel: 0, portrait: "./hisoka_portrait__seafoam.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "seafoam") },
    { id: "hisokaMidnight", name: "Midnight", unlockLevel: 0, portrait: "./hisoka_portrait__midnight.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "midnight") },
    // Five creative colour-only themes (same driver). Vest/pants split where they differ; shoes track
    // the trim/accent colour. Sash captured post-emblem/pre-jumpsuit, applied last (handles red/magenta
    // jumpsuit targets without grabbing garment). Cosmetic only.
    { id: "hisokaBloodhound", name: "Bloodhound", unlockLevel: 0, portrait: "./hisoka_portrait__bloodhound.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "bloodhound") },
    { id: "hisokaVenom", name: "Venom", unlockLevel: 0, portrait: "./hisoka_portrait__venom.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "venom") },
    { id: "hisokaGilded", name: "Gilded", unlockLevel: 0, portrait: "./hisoka_portrait__gilded.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "gilded") },
    { id: "hisokaJoker", name: "Joker's Deck", unlockLevel: 0, portrait: "./hisoka_portrait__joker.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "joker") },
    { id: "hisokaJester", name: "Jester", unlockLevel: 0, portrait: "./hisoka_portrait__jester.png", spriteScale: characters.hisoka?.spriteScale, animationData: recolorSkinAnim("hisoka", "jester") }
  ],

  // Superman (DC). Same gate: WITHOUT a default skin, applySkin() pulls the getSkins() spriteScale:1
  // fallback and he renders at native ~half size. Sources his real spriteScale (1.6) + portrait from
  // the character. No alt skins yet.
  superman: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.superman?.portrait, spriteScale: characters.superman?.spriteScale, animationData: null },
    // "Violet" — single-colour swap (tools/gen_superman_violet.py): all red (cape + boots + chest-emblem
    // accent lines, one shared hue-0 palette) → deep violet #6B3FA0 with shading preserved. Blue bodysuit
    // and gold "S"/belt untouched. Cosmetic only.
    { id: "supermanViolet", name: "Violet", unlockLevel: 0, portrait: "./superman_portrait__violet.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "violet") },
    // "Blue Trunks" — per-region cosmetic (tools/gen_superman_bluetrunks.py). The trunks share ONE red
    // palette with the cape+boots, so a plain color-select can't isolate them; this uses a SPATIAL,
    // belt-anchored per-frame mask: red within the belt's x-span & just below it → navy #2A4D8F (kept
    // darker than the royal suit-blue so the briefs stay distinct, not a seamless blend), while the wider
    // cape wings + boots stay red. Belt band → flat yellow #E8C93B (chest "S"-shield left untouched).
    { id: "supermanBlueTrunks", name: "Blue Trunks", unlockLevel: 0, portrait: "./superman_portrait__bluetrunks.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "bluetrunks") },
    // "Eclipse" — full near-black recolor (tools/gen_superman_eclipse.py). Bodysuit + cape + trunks + belt
    // all UNIFIED to charcoal #1C1C22; the chest "S"-shield kept as a muted dark-red accent #5A2A2A so the
    // emblem still reads. Multi-tone (to-tone) remap + value-clamp preserves highlight/shadow form so it's
    // not a flat silhouette. Distinct from Batman "Nightwatch" (neutral+cyan) & Edo reanim (grayscale):
    // Eclipse is a cool blue-charcoal with a red emblem. FX-cast frames: green/cyan effects survive; the
    // suprush2 yellow charge-burst mutes (color-recolor can't tell it from costume yellow). Cosmetic only.
    { id: "supermanEclipse", name: "Eclipse", unlockLevel: 0, portrait: "./superman_portrait__eclipse.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "eclipse") },
    // Six creative per-region recolors (tools/gen_superman_creative.py). Each targets suit / cape+boots /
    // emblem / belt as distinct zones; TRUNKS follow the suit (belt-anchored mask), the "S"-shield + its S
    // are the emblem (adjacency mask, no cape over-grab). Multi-tone remap preserves shading. Cosmetic only.
    { id: "supermanRoseSteel",   name: "Rose Steel",   unlockLevel: 0, portrait: "./superman_portrait__rosesteel.png",   spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "rosesteel") },
    { id: "supermanDeepCurrent", name: "Deep Current", unlockLevel: 0, portrait: "./superman_portrait__deepcurrent.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "deepcurrent") },
    { id: "supermanSolarFlare",  name: "Solar Flare",  unlockLevel: 0, portrait: "./superman_portrait__solarflare.png",  spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "solarflare") },
    { id: "supermanVerdant",     name: "Verdant",      unlockLevel: 0, portrait: "./superman_portrait__verdant.png",     spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "verdant") },
    { id: "supermanGoldenAge",   name: "Golden Age",   unlockLevel: 0, portrait: "./superman_portrait__goldenage.png",   spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "goldenage") },
    { id: "supermanPrism",       name: "Prism",        unlockLevel: 0, portrait: "./superman_portrait__prism.png",       spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "prism") },
    // "Phantom Zone" — canon void concept. Part 1: whole-form (suit/cape/emblem/belt/face) flattened to a
    // deep cool-charcoal #0F1014 (gen_superman_creative.py phantomzone). Part 2: a PROCEDURAL spectral
    // green-white energy overlay (game.js drawPhantomZoneOverlay, gated to this skin id) drawn on top at
    // match time — wispy drifting tendrils + soft glow mist; seeded once, tracks the sprite. Cosmetic only.
    { id: "supermanPhantomZone", name: "Phantom Zone", unlockLevel: 0, portrait: "./superman_portrait__phantomzone.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "phantomzone") }
  ],

  // Rick Sanchez (Rick & Morty). Same gate as the sprite characters above: WITHOUT a default
  // skin, applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native
  // ~67px (half size). Sources his real spriteScale (1.7) from the character. No alt skins yet.
  rick: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.rick?.portrait, spriteScale: characters.rick?.spriteScale, animationData: null },
    // 8 creative colour skins (tools/gen_rick_creative.py) — per-region recolor: hair(blue hue)/coat
    // (neutral+torso band)/shirt(teal hue)/pants(brown hue); face/skin excluded, multi-tone shading kept.
    // Portrait = cropped recoloured stand frame (the pfp headshot's light bg is inseparable from the
    // white coat). Cosmetic only.
    { id: "rickMortyNightmare", name: "Morty's Nightmare", unlockLevel: 0, portrait: "./rick_portrait__mortynightmare.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "mortynightmare") },
    { id: "rickPortalFluid", name: "Portal Fluid", unlockLevel: 0, portrait: "./rick_portrait__portalfluid.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "portalfluid") },
    { id: "rickRedAlert", name: "Dimension C-137 Red Alert", unlockLevel: 0, portrait: "./rick_portrait__redalert.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "redalert") },
    { id: "rickCosmicBlue", name: "Cosmic Blue", unlockLevel: 0, portrait: "./rick_portrait__cosmicblue.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "cosmicblue") },
    { id: "rickLavenderMatter", name: "Lavender Matter", unlockLevel: 0, portrait: "./rick_portrait__lavendermatter.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "lavendermatter") },
    { id: "rickGoldenRick", name: "Golden Rick", unlockLevel: 0, portrait: "./rick_portrait__goldenrick.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "goldenrick") },
    { id: "rickVoidWalker", name: "Void Walker", unlockLevel: 0, portrait: "./rick_portrait__voidwalker.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "voidwalker") },
    { id: "rickPinkMatter", name: "Pink Matter Rick", unlockLevel: 0, portrait: "./rick_portrait__pinkmatter.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "pinkmatter") },
    // VOID FORM — solid near-black base (whole body incl. face, tools/gen_rick_creative.py voidform) +
    // a PROCEDURAL cosmic starfield overlay drawn on top at match time (game.js drawVoidStarfield, gated
    // to this skin id). The overlay is generated once per skin-load and tracks the sprite. Cosmetic only.
    { id: "rickVoidForm", name: "Void Form", unlockLevel: 0, portrait: "./rick_portrait__voidform.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "voidform") },
    // PORTAL VOID — same full-form near-black base (voidform's sibling, tools/gen_rick_creative.py
    // portalvoid #0F0F12) + a DIFFERENT procedural overlay: vivid portal-green curling SWIRL wisps drawn
    // on top at match time (game.js drawPortalVoidOverlay, gated to this skin id). Seeded once/skin-load,
    // tracks the sprite across all poses (incl. Portal-Behind teleport). Cosmetic only.
    { id: "rickPortalVoid", name: "Portal Void", unlockLevel: 0, portrait: "./rick_portrait__portalvoid.png", spriteScale: characters.rick?.spriteScale, animationData: recolorSkinAnim("rick", "portalvoid") }
  ],

  // Beerus (Dragon Ball) — new single-form sprite char. Same gate: WITHOUT a default skin,
  // applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native ~62px.
  beerus: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.beerus?.portrait, spriteScale: characters.beerus?.spriteScale, animationData: null }
    // beerusEmerald removed in the Part 0 reset (2026-07-24) — a Beerus recolor will be regenerated in Part 2.
  ],

  // Goku Black (Dragon Ball) — SEPARATE character from `goku`. Same gate: WITHOUT a default skin,
  // applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native ~69px (half
  // size). This entry sources his real spriteScale (1.7) from the character. No alt skins yet
  // (the SSJ Rose body-swap is a transformation, not a skin — comes in a later stage).
  goku_black: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.goku_black?.portrait, spriteScale: characters.goku_black?.spriteScale, animationData: null },
    // 12 creative recolors (tools/gen_goku_black_creative.py). Per-region GI (near-black outfit, below the
    // per-frame chin) + TRIM (white boots/gloves) + optional HAIR + AURA (FX energy); the warm-tan face/neck
    // SKIN is EXCLUDED from every pass (the deleted SSG pilot's exact failure mode). recolorTag is REQUIRED:
    // it makes applySkin stamp fighter._recolorTag so abilities.js retags the SSJ-Rose tier art too (the skin
    // stays consistent through the transform). Recolors BOTH tiers (base black-hair + Rose pink-hair sheets).
    // ── Checkpoint group 1 ──
    { id: "gokuBlackVoidSovereign", name: "Void Sovereign",   unlockLevel: 0, portrait: "./goku_black_mug_shot__voidsovereign.png", spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "voidsovereign"), recolorTag: "voidsovereign" },   // near-black + game.js drawVoidSovereignOverlay (drifting red embers)
    { id: "gokuBlackAzureTyrant",   name: "Azure Tyrant",     unlockLevel: 0, portrait: "./goku_black_mug_shot__azuretyrant.png",   spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "azuretyrant"),   recolorTag: "azuretyrant" },
    { id: "gokuBlackEmeraldRift",   name: "Emerald Rift",     unlockLevel: 0, portrait: "./goku_black_mug_shot__emeraldrift.png",   spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "emeraldrift"),   recolorTag: "emeraldrift" },
    { id: "gokuBlackObsidian",      name: "Obsidian Godhood", unlockLevel: 0, portrait: "./goku_black_mug_shot__obsidian.png",      spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "obsidian"),      recolorTag: "obsidian" },
    // ── Checkpoint group 2 ──
    { id: "gokuBlackCrimson",  name: "Crimson Judgment", unlockLevel: 0, portrait: "./goku_black_mug_shot__crimson.png",  spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "crimson"),  recolorTag: "crimson" },
    { id: "gokuBlackIvory",    name: "Ivory Decree",     unlockLevel: 0, portrait: "./goku_black_mug_shot__ivory.png",    spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "ivory"),    recolorTag: "ivory" },
    { id: "gokuBlackAmethyst", name: "Amethyst Void",    unlockLevel: 0, portrait: "./goku_black_mug_shot__amethyst.png", spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "amethyst"), recolorTag: "amethyst" },
    { id: "gokuBlackSunfire",  name: "Sunfire Emperor",  unlockLevel: 0, portrait: "./goku_black_mug_shot__sunfire.png",  spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "sunfire"),  recolorTag: "sunfire" },
    // ── Checkpoint group 3 ──
    { id: "gokuBlackTeal",     name: "Teal Eclipse",   unlockLevel: 0, portrait: "./goku_black_mug_shot__teal.png",         spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "teal"),         recolorTag: "teal" },
    { id: "gokuBlackAshen",    name: "Ashen King",     unlockLevel: 0, portrait: "./goku_black_mug_shot__ashen.png",        spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "ashen"),        recolorTag: "ashen" },
    { id: "gokuBlackRoseShadow", name: "Rose Shadow",  unlockLevel: 0, portrait: "./goku_black_mug_shot__roseshadow.png",   spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "roseshadow"),   recolorTag: "roseshadow" },
    { id: "gokuBlackGoldenTyrant", name: "Golden Tyrant", unlockLevel: 0, portrait: "./goku_black_mug_shot__goldentyrant.png", spriteScale: characters.goku_black?.spriteScale, animationData: recolorSkinAnim("goku_black", "goldentyrant"), recolorTag: "goldentyrant" }
  ],

  // Toji (JJK). Same reason as Naruto/Goku/Sasuke: WITHOUT a default skin, applySkin()
  // pulls the getSkins() spriteScale:1 fallback and he renders at native ~54px (half
  // size) — THIS is why he looked undersized. This entry sources his real spriteScale
  // (2.3) from the character. No alt skins yet.
  toji: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.toji?.portrait, spriteScale: characters.toji?.spriteScale, animationData: null }
  ],

  // Maki Zenin — Default only (creative skins land in a later stage). MUST exist: without a
  // SKINS entry, getSkins() falls back to a synthesized default carrying spriteScale:1, which
  // applySkin would stamp onto the fighter and override maki.spriteScale (1.63) → 1.
  // Maki — ONLY Default + Void Hunter (the 12 flat-recolor batch and the "Ultimate: Covered" variant were
  // removed by request). The Shibuya (Ultimate) form is now GORE-FREE for EVERY skin by default (the
  // covered-arms art is the base Shibuya art itself — see abilities.MAKI_SHIBUYA_ANIM — not an opt-in skin).
  maki: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.maki?.portrait, spriteScale: characters.maki?.spriteScale, animationData: null },
    // VOID HUNTER — Alien-X-style FULL-FORM near-black (#0F0F12: uniform/hair/skin/face all void-flattened,
    // tools/gen_maki_creative.py voidhunter) + a procedural game.js drawVoidHunterOverlay gated on this
    // skinId (drifting pale star dots + 2-3 red/violet nebula swirl clusters). NO recolorTag → the ≤25%-HP
    // Shibuya Ultimate form stays canonical (and the overlay self-skips while _shibuyaActive). Same shared
    // Void-family technique as Rick/Superman/Rengoku/Gold/Goku-Black.
    { id: "makiVoidHunter", name: "Void Hunter", unlockLevel: 0, portrait: "./maki_portrait__voidhunter.png", spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "voidhunter") },
    // 12 GENUINELY creative recolors (tools/gen_maki_creative2.py) — HAIR + UNIFORM + ACCENT all vary as one
    // coordinated palette identity (green hair is a targeted region now, not protected). NO recolorTag → the
    // ≤25%-HP Shibuya Ultimate form stays canonical (and is gore-free by default for every skin — Part 2).
    // ── Group 1 ──
    { id: "makiIronWolf",  name: "Iron Wolf",            unlockLevel: 0, portrait: "./maki_portrait__ironwolf.png",   spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "ironwolf") },
    { id: "makiBloodMoon", name: "Blood Moon",           unlockLevel: 0, portrait: "./maki_portrait__bloodmoon.png",  spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "bloodmoon") },
    { id: "makiJade",      name: "Jade Huntress",        unlockLevel: 0, portrait: "./maki_portrait__jade.png",       spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "jade") },
    { id: "makiPorcelain", name: "Porcelain Doll",       unlockLevel: 0, portrait: "./maki_portrait__porcelain.png",  spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "porcelain") },
    // ── Group 2 ──
    { id: "makiViper",     name: "Viper's Kiss",         unlockLevel: 0, portrait: "./maki_portrait__viper.png",      spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "viper") },
    { id: "makiSunblade",  name: "Sunblade",             unlockLevel: 0, portrait: "./maki_portrait__sunblade.png",   spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "sunblade") },
    { id: "makiFrostbite", name: "Frostbite",            unlockLevel: 0, portrait: "./maki_portrait__frostbite.png",  spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "frostbite") },
    { id: "makiRoseThorn", name: "Rose Thorn Revisited", unlockLevel: 0, portrait: "./maki_portrait__rosethorn2.png", spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "rosethorn2") },
    // ── Group 3 ──
    { id: "makiObsidian",  name: "Obsidian Reaper",      unlockLevel: 0, portrait: "./maki_portrait__obsidian.png",  spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "obsidian") },
    { id: "makiEmpress",   name: "Golden Empress",       unlockLevel: 0, portrait: "./maki_portrait__empress.png",   spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "empress") },
    { id: "makiAshen",     name: "Ashen Nomad",          unlockLevel: 0, portrait: "./maki_portrait__ashen.png",     spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "ashen") },
    { id: "makiStormcaller",name: "Stormcaller",         unlockLevel: 0, portrait: "./maki_portrait__stormcaller.png",spriteScale: characters.maki?.spriteScale, animationData: recolorSkinAnim("maki", "stormcaller") }
  ],

  // Vegeta (Dragon Ball). Same reason as the other sprite chars: WITHOUT a default skin,
  // applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at ~half size.
  // This entry sources his real spriteScale (2.1) from the character. No alt skins yet
  // (SSJ transformations are a later stage, not skins).
  vegeta: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.vegeta?.portrait, spriteScale: characters.vegeta?.spriteScale, animationData: null }
  ],

  // Omega Ranger (Power Rangers) — new single-form sprite char. Same gate: WITHOUT a default
  // skin, applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native
  // ~52px (half size). This entry sources his real spriteScale (2.0) from the character. No
  // alt skins yet. (The 5 core S.P.D. rangers + Shadow Ranger stubs never had skins/sprites.)
  omega_ranger: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.omega_ranger?.portrait, spriteScale: characters.omega_ranger?.spriteScale, animationData: null },
    // 12 creative recolors (tools/gen_omega_creative.py). Per-region, capture-masks-from-original
    // (contamination-proof even when armor+visor share a hue family): ARMOR = white/gray plates
    // (boots share the plating, not separable → follow armor) / VISOR = blue helmet lens / EMBLEM =
    // gold crest+trim. Fully helmeted → no skin-bleed risk. Multi-tone preserved via tone-remap.
    // ── Checkpoint group 1 ──
    { id: "omegaCrimson",  name: "Crimson Guard",   unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__crimson.png",  spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "crimson") },
    { id: "omegaCobalt",   name: "Cobalt Strike",   unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__cobalt.png",   spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "cobalt") },
    { id: "omegaVerdant",  name: "Verdant Shield",  unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__verdant.png",  spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "verdant") },
    { id: "omegaVanguard", name: "Golden Vanguard", unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__vanguard.png", spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "vanguard") },
    // ── Checkpoint group 2 ──
    { id: "omegaAmethyst", name: "Amethyst Protocol", unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__amethyst.png", spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "amethyst") },
    { id: "omegaRose",     name: "Rose Steel",        unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__rose.png",     spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "rose") },
    { id: "omegaSlate",    name: "Slate Operative",   unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__slate.png",    spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "slate") },
    { id: "omegaSunburst", name: "Sunburst",          unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__sunburst.png", spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "sunburst") },
    // ── Checkpoint group 3 ── (Obsidian = near-black armor+visor + a single vivid-red emblem accent)
    { id: "omegaObsidian", name: "Obsidian",       unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__obsidian.png", spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "obsidian") },
    { id: "omegaIvory",    name: "Ivory Command",  unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__ivory.png",    spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "ivory") },
    { id: "omegaTeal",     name: "Teal Force",     unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__teal.png",     spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "teal") },
    { id: "omegaSolar",    name: "Solar Flare",    unlockLevel: 0, portrait: "./SPD_Omega_Ranger_mugshot__solar.png",    spriteScale: characters.omega_ranger?.spriteScale, animationData: recolorSkinAnim("omega_ranger", "solar") }
  ],

  // Samurai Red Ranger (Power Rangers) — SECOND sprited ranger. Default-only skin so applySkin()
  // sources his real spriteScale (1.85) from the character instead of the getSkins() fallback of 1
  // (which would render him half-size). Alt skins come later.
  samurai_red_ranger: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.samurai_red_ranger?.portrait, spriteScale: characters.samurai_red_ranger?.spriteScale, animationData: null },
    // 12 creative recolors (tools/gen_samurai_creative.py). Per-region SUIT (red top/helmet/boots — helmet
    // not separable, recolors with the suit) + TRIM (gold belt-sash + sword hilt); dark hakama pants +
    // white sleeves + black visor left untouched (face/visor excluded). recolorTag is REQUIRED here: it
    // makes applySkin stamp fighter._recolorTag so abilities.js retags the Mega-tier art too (base blue →
    // Mega blue, not → Mega red). Flame FX on the ultimate/flameslash sheets stay orange (fire-guard).
    // ── Checkpoint group 1 ──
    { id: "samAzure",   name: "Azure Blade",    unlockLevel: 0, portrait: "./samurai_ranger_portrait__azure.png",      spriteScale: characters.samurai_red_ranger?.spriteScale, animationData: recolorSkinAnim("samurai_red_ranger", "azure"),      recolorTag: "azure" },
    { id: "samEmerald", name: "Emerald Katana", unlockLevel: 0, portrait: "./samurai_ranger_portrait__emerald.png",    spriteScale: characters.samurai_red_ranger?.spriteScale, animationData: recolorSkinAnim("samurai_red_ranger", "emerald"),    recolorTag: "emerald" },
    { id: "samViolet",  name: "Violet Strike",  unlockLevel: 0, portrait: "./samurai_ranger_portrait__violet.png",     spriteScale: characters.samurai_red_ranger?.spriteScale, animationData: recolorSkinAnim("samurai_red_ranger", "violet"),     recolorTag: "violet" },
    { id: "samSilver",  name: "Silver Edge",    unlockLevel: 0, portrait: "./samurai_ranger_portrait__silveredge.png", spriteScale: characters.samurai_red_ranger?.spriteScale, animationData: recolorSkinAnim("samurai_red_ranger", "silveredge"), recolorTag: "silveredge" }
  ],
  green_samurai_ranger: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.green_samurai_ranger?.portrait, spriteScale: characters.green_samurai_ranger?.spriteScale, animationData: null }
  ],
  gold_samurai_ranger: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.gold_samurai_ranger?.portrait, spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: null },
    // 12 THEMED recolors (tools/gen_gold_creative.py). Per-region PLATE (gold armor + helmet — the
    // iconic "armor", dominant in Mega tier so it carries the primary identity colour) + SUIT (the deep
    // blue bodysuit — base tier only; the Mega bodysuit is near-black and stays black, documented). The
    // white belt/gloves + Gold's signature blue-white light-wave FX are left UNTOUCHED (the SUIT gate's
    // val ceiling + never touching neutral protect the FX — no separate flame-guard needed). recolorTag
    // is REQUIRED: it makes applySkin stamp fighter._recolorTag so abilities.js applySamuraiMegaStats
    // retags the Mega-tier art too (base green → Mega green, not base green → Mega gold). skin 8
    // (Voidwalker) also drives a procedural gold-spark overlay in game.js, gated on skinId.
    // ── Checkpoint group 1 ──
    { id: "goldStormbringer", name: "Stormbringer",     unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__stormbringer.png", spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "stormbringer"), recolorTag: "stormbringer" },
    { id: "goldOmnitrix",     name: "Omnitrix Protocol", unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__omnitrix.png",     spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "omnitrix"),     recolorTag: "omnitrix" },
    { id: "goldAlbedo",       name: "Albedo Protocol",   unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__albedo.png",       spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "albedo"),       recolorTag: "albedo" },
    { id: "goldSolar",        name: "Solar Emperor",     unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__solar.png",        spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "solar"),        recolorTag: "solar" },
    // ── Checkpoint group 2 ── (goldVoidwalker also drives game.js drawVoidSparkOverlay — gold-spark FX)
    { id: "goldDeepCurrent",  name: "Deep Current",      unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__deepcurrent.png",  spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "deepcurrent"),  recolorTag: "deepcurrent" },
    { id: "goldAshenVow",     name: "Ashen Vow",         unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__ashenvow.png",     spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "ashenvow"),     recolorTag: "ashenvow" },
    { id: "goldBlossom",      name: "Blossom Strike",    unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__blossom.png",      spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "blossom"),      recolorTag: "blossom" },
    { id: "goldVoidwalker",   name: "Voidwalker",        unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__voidwalker.png",   spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "voidwalker"),   recolorTag: "voidwalker" },
    // ── Checkpoint group 3 ──
    { id: "goldCrimson",      name: "Crimson Vanguard",  unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__crimson.png",      spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "crimson"),      recolorTag: "crimson" },
    { id: "goldIvory",        name: "Ivory Sentinel",    unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__ivory.png",        spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "ivory"),        recolorTag: "ivory" },
    { id: "goldObsidian",     name: "Obsidian Edge",     unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__obsidian.png",     spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "obsidian"),     recolorTag: "obsidian" },
    { id: "goldTwilight",     name: "Twilight Samurai",  unlockLevel: 0, portrait: "./samurai_ranger_gold_portrait__twilight.png",     spriteScale: characters.gold_samurai_ranger?.spriteScale, animationData: recolorSkinAnim("gold_samurai_ranger", "twilight"),     recolorTag: "twilight" }
  ],

  // Omni-Man (Invincible) — new single-form sprite char (was a procedural-box stub). Same gate:
  // WITHOUT a default skin, applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at
  // native ~127px (his idle content is already large, so the fallback would OVER-size then his own
  // <1 scale wouldn't apply). Sources his real spriteScale (0.95) from the character. No portrait yet
  // (procedural name/universe panel on select until Stage 6). No alt skins yet.
  omniman: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.omniman?.portrait, spriteScale: characters.omniman?.spriteScale, animationData: null }
  ],

  // Zenitsu Agatsuma (Demon Slayer) — FIRST Demon Slayer sprite char. Same gate: WITHOUT a default
  // skin, applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native ~half size.
  // Sources his real spriteScale (2.25) + portrait from the character. No alt skins yet.
  zenitsu: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.zenitsu?.portrait, spriteScale: characters.zenitsu?.spriteScale, animationData: null },
    // "Lavender" — orange/yellow → lavender-pink recolor (tools/gen_zenitsu_lavender.py): the fiery
    // hair + haori gradient (incl. its deep-red scale-tips + thunder VFX) remaps to #C9A0D4 with the
    // light/dark shading preserved. Skin, black kimono base + brown hakama are untouched. Cosmetic only.
    { id: "zenitsuLavender", name: "Lavender", unlockLevel: 0, portrait: "./zenitsu_portrait__lavender.png", spriteScale: characters.zenitsu?.spriteScale, animationData: recolorSkinAnim("zenitsu", "lavender") },
    // 5-colour batch (tools/gen_zenitsu_recolor.py) — same fiery-region remap as Lavender, each to a
    // different target, with the base↔highlight two-tone depth preserved (incl. the white gradient tips
    // remapped, not left white). Skin/black-kimono/brown-hakama untouched. Cosmetic only.
    { id: "zenitsuBlack", name: "Black", unlockLevel: 0, portrait: "./zenitsu_portrait__black.png", spriteScale: characters.zenitsu?.spriteScale, animationData: recolorSkinAnim("zenitsu", "black") },
    { id: "zenitsuPink",  name: "Vibrant Pink", unlockLevel: 0, portrait: "./zenitsu_portrait__pink.png", spriteScale: characters.zenitsu?.spriteScale, animationData: recolorSkinAnim("zenitsu", "pink") },
    { id: "zenitsuRed",   name: "Red", unlockLevel: 0, portrait: "./zenitsu_portrait__red.png", spriteScale: characters.zenitsu?.spriteScale, animationData: recolorSkinAnim("zenitsu", "red") },
    { id: "zenitsuWhite", name: "White", unlockLevel: 0, portrait: "./zenitsu_portrait__white.png", spriteScale: characters.zenitsu?.spriteScale, animationData: recolorSkinAnim("zenitsu", "white") },
    { id: "zenitsuBlue",  name: "Blue", unlockLevel: 0, portrait: "./zenitsu_portrait__blue.png", spriteScale: characters.zenitsu?.spriteScale, animationData: recolorSkinAnim("zenitsu", "blue") }
  ],

  // Kyojuro Rengoku (Demon Slayer) — SECOND Demon Slayer sprite char. Same gate: WITHOUT a default
  // skin, applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native ~half size.
  // Sources his real spriteScale (2.25) + portrait from the character. No alt skins yet.
  rengoku: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.rengoku?.portrait, spriteScale: characters.rengoku?.spriteScale, animationData: null },
    // 8 creative recolors (tools/gen_rengoku_creative.py). Per-region: hair / haori EXTERIOR (neutral) /
    // haori INNER LINING = the red flame-hem / pants, with the orange flame-TIPS folded into (or kept
    // distinct from) the lining per skin. Multi-tone preserved via to-tone; face/skin excluded (except
    // Void Ember). Void Ember = full-form near-black + a procedural rising-ember overlay (game.js
    // drawEmberOverlay, gated on this skinId — sibling of Rick Void Form / Superman Phantom Zone).
    { id: "rengokuOmnitrix",     name: "Omnitrix Green",       unlockLevel: 0, portrait: "./rengoku_portrait__omnitrix.png",     spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "omnitrix") },
    { id: "rengokuAlbedo",       name: "Albedo Protocol",      unlockLevel: 0, portrait: "./rengoku_portrait__albedo.png",       spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "albedo") },
    { id: "rengokuSunBreathing", name: "Sun Breathing Homage", unlockLevel: 0, portrait: "./rengoku_portrait__sunbreathing.png", spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "sunbreathing") },
    { id: "rengokuWaterSealed",  name: "Water-Sealed",         unlockLevel: 0, portrait: "./rengoku_portrait__watersealed.png",  spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "watersealed") },
    { id: "rengokuAshen",        name: "Ashen",                unlockLevel: 0, portrait: "./rengoku_portrait__ashen.png",        spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "ashen") },
    { id: "rengokuImperial",     name: "Imperial",             unlockLevel: 0, portrait: "./rengoku_portrait__imperial.png",     spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "imperial") },
    { id: "rengokuVerdant",      name: "Verdant Flame",        unlockLevel: 0, portrait: "./rengoku_portrait__verdant.png",      spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "verdant") },
    { id: "rengokuVoidEmber",    name: "Void Ember",           unlockLevel: 0, portrait: "./rengoku_portrait__voidember.png",    spriteScale: characters.rengoku?.spriteScale, animationData: recolorSkinAnim("rengoku", "voidember") }
  ],

  // Shinobu Kocho (Demon Slayer) — THIRD Demon Slayer sprite char. Same gate: WITHOUT a default skin,
  // applySkin() pulls the spriteScale:1 fallback and she renders at native ~half size. Sources her real
  // spriteScale (2.25) + portrait from the character. No alt skins yet.
  shinobu: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.shinobu?.portrait, spriteScale: characters.shinobu?.spriteScale, animationData: null },
    // 8 creative recolors (tools/gen_shinobu_creative.py). Per-region: hair / haori EXTERIOR (white) /
    // butterfly-WING hem pattern (saturated cool→magenta gradient, its own region) / KIMONO inner layer.
    // Obi sash is NOT separable at sprite resolution → folded (flagged). Night Moth = full-form void +
    // procedural drifting moth-fleck overlay (game.js drawMothOverlay). Cosmetic only; zero gameplay.
    { id: "shinobuAlbedo",    name: "Albedo Protocol", unlockLevel: 0, portrait: "./shinobu_portrait__albedo.png",    spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "albedo") },
    { id: "shinobuWisteria",  name: "Wisteria",        unlockLevel: 0, portrait: "./shinobu_portrait__wisteria.png",  spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "wisteria") },
    { id: "shinobuEmeraldWing", name: "Emerald Wing",  unlockLevel: 0, portrait: "./shinobu_portrait__emeraldwing.png", spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "emeraldwing") },
    { id: "shinobuCrimsonMoth", name: "Crimson Moth",  unlockLevel: 0, portrait: "./shinobu_portrait__crimsonmoth.png", spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "crimsonmoth") },
    { id: "shinobuCobalt",      name: "Cobalt",        unlockLevel: 0, portrait: "./shinobu_portrait__cobalt.png",      spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "cobalt") },
    { id: "shinobuRoseQuartz",  name: "Rose Quartz",   unlockLevel: 0, portrait: "./shinobu_portrait__rosequartz.png",  spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "rosequartz") },
    { id: "shinobuAmberGlow",   name: "Amber Glow",    unlockLevel: 0, portrait: "./shinobu_portrait__amberglow.png",   spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "amberglow") },
    { id: "shinobuNightMoth",   name: "Night Moth",    unlockLevel: 0, portrait: "./shinobu_portrait__nightmoth.png",   spriteScale: characters.shinobu?.spriteScale, animationData: recolorSkinAnim("shinobu", "nightmoth") }
  ],

  // Inosuke Hashibira — Default + 12 FULL-FORM creative recolors (tools/gen_inosuke_creative.py) + 1 Void.
  // FULL-FORM: SKIN tone + SNOUT + HAIR (boar-mask fur/mane) + WRAP (hakama/bindings) + the blue slash-FX
  // crescents ALL vary in coordination ("change almost everything"). Line-art outlines preserved (v<0.10
  // byte-identical); regions captured from the ORIGINAL (contamination-proof). Cosmetic only; zero gameplay.
  inosuke: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.inosuke?.portrait, spriteScale: characters.inosuke?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "inosukeIronBoar",      name: "Iron Boar",      unlockLevel: 0, portrait: "./inosuke_portrait__ironboar.png",      spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "ironboar") },
    { id: "inosukeCrimsonFeral",  name: "Crimson Feral",  unlockLevel: 0, portrait: "./inosuke_portrait__crimsonferal.png",  spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "crimsonferal") },
    { id: "inosukeVerdantTusk",   name: "Verdant Tusk",   unlockLevel: 0, portrait: "./inosuke_portrait__verdanttusk.png",   spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "verdanttusk") },
    { id: "inosukeGoldenRampage", name: "Golden Rampage", unlockLevel: 0, portrait: "./inosuke_portrait__goldenrampage.png", spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "goldenrampage") },
    // ── Group 2 ──
    { id: "inosukeFrostbiteTusk", name: "Frostbite Tusk", unlockLevel: 0, portrait: "./inosuke_portrait__frostbitetusk.png", spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "frostbitetusk") },
    { id: "inosukeAmethystBeast", name: "Amethyst Beast", unlockLevel: 0, portrait: "./inosuke_portrait__amethystbeast.png", spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "amethystbeast") },
    { id: "inosukeAshenRonin",    name: "Ashen Ronin",    unlockLevel: 0, portrait: "./inosuke_portrait__ashenronin.png",    spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "ashenronin") },
    { id: "inosukeSunfireTusk",   name: "Sunfire Tusk",   unlockLevel: 0, portrait: "./inosuke_portrait__sunfiretusk.png",   spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "sunfiretusk") },
    // ── Group 3 ──
    { id: "inosukeObsidianFang",   name: "Obsidian Fang",     unlockLevel: 0, portrait: "./inosuke_portrait__obsidianfang.png",   spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "obsidianfang") },
    { id: "inosukeRoseThornBeast", name: "Rose Thorn Beast",  unlockLevel: 0, portrait: "./inosuke_portrait__rosethornbeast.png", spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "rosethornbeast") },
    { id: "inosukeTealRampart",    name: "Teal Rampart",      unlockLevel: 0, portrait: "./inosuke_portrait__tealrampart.png",    spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "tealrampart") },
    { id: "inosukeStormTusk",      name: "Storm Tusk",        unlockLevel: 0, portrait: "./inosuke_portrait__stormtusk.png",      spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "stormtusk") },
    // ── Void skin ── near-black full-form flatten (tools/gen_inosuke_creative.py voidboar) + a procedural
    // game.js drawVoidBoarOverlay (drifting jagged white tusk-shards + claw-mark scratches) gated on this id.
    { id: "inosukeVoidBoar",       name: "Void Boar",         unlockLevel: 0, portrait: "./inosuke_portrait__voidboar.png",      spriteScale: characters.inosuke?.spriteScale, animationData: recolorSkinAnim("inosuke", "voidboar") }
  ],

  // Nezuko Kamado — Demon Slayer sprite char. Default + creative recolors (tools/gen_nezuko_creative.py).
  // REQUIRED gate: without a default entry getSkins() returns the spriteScale:1 fallback and applySkin()
  // renders her at native ~half size (the Saiki/Shinobu gotcha). Sources real spriteScale + portrait.
  // Creative skins recolor HAIR (hair + black haori) + OUTFIT_MAIN (pink kimono) + OUTFIT_ACCENT (dark
  // leggings/trim) as ONE coordinated palette; skin + green bamboo muzzle protected; outlines kept.
  // Cosmetic only — ZERO gameplay/stat impact.
  nezuko: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.nezuko?.portrait, spriteScale: characters.nezuko?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "nezukoEmberBloom",   name: "Ember Bloom",   unlockLevel: 0, portrait: "./nezuko_portrait__emberbloom.png",   spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "emberbloom") },
    { id: "nezukoMoonlitVale",  name: "Moonlit Vale",  unlockLevel: 0, portrait: "./nezuko_portrait__moonlitvale.png",  spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "moonlitvale") },
    { id: "nezukoWisteriaDusk", name: "Wisteria Dusk", unlockLevel: 0, portrait: "./nezuko_portrait__wisteriadusk.png", spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "wisteriadusk") },
    { id: "nezukoVerdantHearth",name: "Verdant Hearth",unlockLevel: 0, portrait: "./nezuko_portrait__verdanthearth.png",spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "verdanthearth") },
    // ── Group 2 ──
    { id: "nezukoFrostbound",   name: "Frostbound",    unlockLevel: 0, portrait: "./nezuko_portrait__frostbound.png",   spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "frostbound") },
    { id: "nezukoGoldenEmber",  name: "Golden Ember",  unlockLevel: 0, portrait: "./nezuko_portrait__goldenember.png",  spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "goldenember") },
    { id: "nezukoNightshade",   name: "Nightshade",    unlockLevel: 0, portrait: "./nezuko_portrait__nightshade.png",   spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "nightshade") },
    { id: "nezukoCoralReverie", name: "Coral Reverie", unlockLevel: 0, portrait: "./nezuko_portrait__coralreverie.png", spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "coralreverie") },
    // ── Group 3 — specialty ──
    // Void Sovereign = full-form near-black (incl. skin/face) + procedural crimson-pink ember overlay
    // (game.js drawNezukoVoidEmberOverlay, gated on this skinId — her Blood Demon Art fire, not stars).
    { id: "nezukoVoidSovereign",name: "Void Sovereign",unlockLevel: 0, portrait: "./nezuko_portrait__voidsovereign.png",spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "voidsovereign") },
    // Umbral Reflection = inverted doppelganger (white hair / near-black outfit / orange-red accent / glowing
    // red eyes; skin stays default — NOT the §8 full-form exception).
    { id: "nezukoUmbral",       name: "Umbral Reflection",unlockLevel: 0, portrait: "./nezuko_portrait__umbral.png",  spriteScale: characters.nezuko?.spriteScale, animationData: recolorSkinAnim("nezuko", "umbral") }
  ],

  // Ben 10 — ONE fighter that transforms between aliens (Omnitrix). The base skin
  // sources the Ben-human spriteScale (alien forms swap the whole set via _skinAnim
  // in fighters.js, NOT via alt skins). WITHOUT this default entry, applySkin() pulls
  // the spriteScale:1 fallback and Ben renders at ~half size. No alt skins yet.
  ben10: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.ben10?.portrait, spriteScale: characters.ben10?.spriteScale, animationData: null }
  ],

  // Ghostface — the 5 KILLER-IDENTITY skins ONLY (NO "Default"). In the source material there is no
  // independent "Ghostface" separate from whichever killer wears the mask, so there is deliberately no 6th
  // fallback identity — picking one of the 5 is MANDATORY (enforced at applySkin: any non-identity skinId,
  // incl. AI/random fighters handed "default", resolves to a killer identity). Each is a robe-recolor
  // (tools/gen_ghostface_creative.py): the cool-saturated cloak → a distinct themed dark tone, the white
  // mask + steel knife + black linework preserved (sat/val gates). Each sets spriteScale explicitly (no
  // reliance on a default entry). NOTE: unlike every other char these skins ALSO carry gameplay property
  // modifiers (Stages 3-4) — a deliberate, confirmed project-first exception (NOT cosmetic-only).
  ghostface: [
    { id: "ghostfaceBilly",  name: "Billy",  unlockLevel: 0, portrait: "./ghostface_portrait__billy.png",  spriteScale: characters.ghostface?.spriteScale, animationData: recolorSkinAnim("ghostface", "billy"),  recolorTag: "billy" },
    { id: "ghostfaceDebbie", name: "Debbie", unlockLevel: 0, portrait: "./ghostface_portrait__debbie.png", spriteScale: characters.ghostface?.spriteScale, animationData: recolorSkinAnim("ghostface", "debbie"), recolorTag: "debbie" },
    { id: "ghostfaceRoman",  name: "Roman",  unlockLevel: 0, portrait: "./ghostface_portrait__roman.png",  spriteScale: characters.ghostface?.spriteScale, animationData: recolorSkinAnim("ghostface", "roman"),  recolorTag: "roman" },
    { id: "ghostfaceJill",   name: "Jill",   unlockLevel: 0, portrait: "./ghostface_portrait__jill.png",   spriteScale: characters.ghostface?.spriteScale, animationData: recolorSkinAnim("ghostface", "jill"),   recolorTag: "jill" },
    { id: "ghostfaceAmber",  name: "Amber",  unlockLevel: 0, portrait: "./ghostface_portrait__amber.png",  spriteScale: characters.ghostface?.spriteScale, animationData: recolorSkinAnim("ghostface", "amber"),  recolorTag: "amber" }
  ],
  miwa: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.miwa?.portrait, spriteScale: characters.miwa?.spriteScale, animationData: null },
    // 12 creative HAIR+JACKET+TRAIL coordinated recolors (tools/gen_miwa_creative.py). Cosmetic only.
    { id: "miwaSilverBlade",   name: "Silver Blade",    unlockLevel: 0, portrait: "./kasumi_portrait__silverblade.png",   spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "silverblade") },
    { id: "miwaCrimsonEdge",   name: "Crimson Edge",    unlockLevel: 0, portrait: "./kasumi_portrait__crimsonedge.png",   spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "crimsonedge") },
    { id: "miwaJadeWhisper",   name: "Jade Whisper",    unlockLevel: 0, portrait: "./kasumi_portrait__jadewhisper.png",   spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "jadewhisper") },
    { id: "miwaGoldenVow",     name: "Golden Vow",      unlockLevel: 0, portrait: "./kasumi_portrait__goldenvow.png",     spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "goldenvow") },
    { id: "miwaVioletNocturne",name: "Violet Nocturne", unlockLevel: 0, portrait: "./kasumi_portrait__violetnocturne.png",spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "violetnocturne") },
    { id: "miwaRoseThorn",     name: "Rose Thorn",      unlockLevel: 0, portrait: "./kasumi_portrait__rosethorn.png",     spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "rosethorn") },
    { id: "miwaFrostbite",     name: "Frostbite",       unlockLevel: 0, portrait: "./kasumi_portrait__frostbite.png",     spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "frostbite") },
    { id: "miwaObsidianVeil",  name: "Obsidian Veil",   unlockLevel: 0, portrait: "./kasumi_portrait__obsidianveil.png",  spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "obsidianveil") },
    { id: "miwaSunfire",       name: "Sunfire",         unlockLevel: 0, portrait: "./kasumi_portrait__sunfire.png",       spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "sunfire") },
    { id: "miwaIvoryDawn",     name: "Ivory Dawn",      unlockLevel: 0, portrait: "./kasumi_portrait__ivorydawn.png",     spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "ivorydawn") },
    { id: "miwaTealCurrent",   name: "Teal Current",    unlockLevel: 0, portrait: "./kasumi_portrait__tealcurrent.png",   spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "tealcurrent") },
    { id: "miwaStormVeil",     name: "Storm Veil",      unlockLevel: 0, portrait: "./kasumi_portrait__stormveil.png",     spriteScale: characters.miwa?.spriteScale, animationData: recolorSkinAnim("miwa", "stormveil") }
  ],

  // Ichigo Kurosaki (Bleach) — FIRST Bleach sprite char. 12 reference-inspired creative recolor skins
  // (HAIR + ROBE + TRIM coordinated palette identities) via tools/gen_ichigo_creative.py. Ichigo's outer
  // shihakushō robe is FLAT PURE-BLACK = same colour as line-art outlines, so the robe is recoloured
  // SPATIALLY (4-neighbour erosion → interior fill; every boundary black kept as a fixed outline stroke).
  // Cosmetic only; zero gameplay. Sources his real spriteScale (1.9) from the character.
  ichigo: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.ichigo?.portrait, spriteScale: characters.ichigo?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "ichigoCrimsonReaper",    name: "Crimson Reaper",    unlockLevel: 0, portrait: "./ichigo_portrait__crimsonreaper.png",    spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "crimsonreaper") },
    { id: "ichigoVerdantBlade",     name: "Verdant Blade",     unlockLevel: 0, portrait: "./ichigo_portrait__verdantblade.png",     spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "verdantblade") },
    { id: "ichigoFrostShinigami",   name: "Frost Shinigami",   unlockLevel: 0, portrait: "./ichigo_portrait__frostshinigami.png",   spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "frostshinigami") },
    { id: "ichigoTwilightContrast", name: "Twilight Contrast", unlockLevel: 0, portrait: "./ichigo_portrait__twilightcontrast.png", spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "twilightcontrast") },
    // ── Group 2 ──
    { id: "ichigoRoseRequiem",      name: "Rose Requiem",      unlockLevel: 0, portrait: "./ichigo_portrait__roserequiem.png",      spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "roserequiem") },
    { id: "ichigoAmberRonin",       name: "Amber Ronin",       unlockLevel: 0, portrait: "./ichigo_portrait__amberronin.png",       spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "amberronin") },
    { id: "ichigoSilverFrost",      name: "Silver Frost",      unlockLevel: 0, portrait: "./ichigo_portrait__silverfrost.png",      spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "silverfrost") },
    { id: "ichigoEmberGuard",       name: "Ember Guard",       unlockLevel: 0, portrait: "./ichigo_portrait__emberguard.png",       spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "emberguard") },
    // ── Group 3 ──
    { id: "ichigoRoyalZangetsu",    name: "Royal Zangetsu",    unlockLevel: 0, portrait: "./ichigo_portrait__royalzangetsu.png",    spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "royalzangetsu") },
    { id: "ichigoVoidWalker",       name: "Void Walker",       unlockLevel: 0, portrait: "./ichigo_portrait__voidwalker.png",       spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "voidwalker") },
    { id: "ichigoAutumnTide",       name: "Autumn Tide",       unlockLevel: 0, portrait: "./ichigo_portrait__autumntide.png",       spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "autumntide") },
    { id: "ichigoEmeraldGhost",     name: "Emerald Ghost",     unlockLevel: 0, portrait: "./ichigo_portrait__emeraldghost.png",     spriteScale: characters.ichigo?.spriteScale, animationData: recolorSkinAnim("ichigo", "emeraldghost") }
  ],

  // Zaraki Kenpachi (Bleach) — creative alt-skins (tools/gen_zaraki_creative.py): hair + haori + under_robe
  // recolored as ONE coordinated palette identity per skin. Cosmetic only; ZERO gameplay/stat change.
  // recolorTag is REQUIRED — Zaraki has the Shikai form, so applySkin stamps fighter._recolorTag and
  // abilities.js retagFormAnim(ZARAKI_SHIKAI_ANIM, tag) carries the recolor into Shikai too.
  zaraki: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.zaraki?.portrait, spriteScale: characters.zaraki?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "zarakiCrimsonReaper",  name: "Crimson Reaper",      unlockLevel: 0, portrait: "./zaraki_transparent_copy__crimsonreaper.png", spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "crimsonreaper"), recolorTag: "crimsonreaper" },
    { id: "zarakiFrostbitten",    name: "Frostbitten Captain", unlockLevel: 0, portrait: "./zaraki_transparent_copy__frostbitten.png",   spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "frostbitten"),   recolorTag: "frostbitten" },
    { id: "zarakiWildfireBells",  name: "Wildfire Bells",      unlockLevel: 0, portrait: "./zaraki_transparent_copy__wildfirebells.png", spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "wildfirebells"), recolorTag: "wildfirebells" },
    { id: "zarakiVerdantBlade",   name: "Verdant Blade",       unlockLevel: 0, portrait: "./zaraki_transparent_copy__verdantblade.png",  spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "verdantblade"),  recolorTag: "verdantblade" },
    // ── Group 2 ──
    { id: "zarakiGoldenButcher",   name: "Golden Butcher",   unlockLevel: 0, portrait: "./zaraki_transparent_copy__goldenbutcher.png",  spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "goldenbutcher"),  recolorTag: "goldenbutcher" },
    { id: "zarakiNightfallRonin",  name: "Nightfall Ronin",  unlockLevel: 0, portrait: "./zaraki_transparent_copy__nightfallronin.png", spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "nightfallronin"), recolorTag: "nightfallronin" },
    { id: "zarakiVioletOnslaught", name: "Violet Onslaught", unlockLevel: 0, portrait: "./zaraki_transparent_copy__violetonslaught.png",spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "violetonslaught"),recolorTag: "violetonslaught" },
    { id: "zarakiAshenMarshal",    name: "Ashen Marshal",    unlockLevel: 0, portrait: "./zaraki_transparent_copy__ashenmarshal.png",   spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "ashenmarshal"),   recolorTag: "ashenmarshal" },
    // ── Group 3 (specialty) ──
    // Void Sovereign: full-form near-black (§8 Part A) + game.js drawZarakiVoidOverlay crackling red-black
    // reiatsu sparks (Part B). skinId "zarakiVoidSovereign" gates the overlay.
    { id: "zarakiVoidSovereign",  name: "Void Sovereign",   unlockLevel: 0, portrait: "./zaraki_transparent_copy__voidsovereign.png", spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "voidsovereign"), recolorTag: "voidsovereign" },
    // Umbral Reflection: inverted-palette doppelganger (white hair / black haori / white under_robe); skin+eye stay default.
    { id: "zarakiUmbral",         name: "Umbral Reflection", unlockLevel: 0, portrait: "./zaraki_transparent_copy__umbral.png",        spriteScale: characters.zaraki?.spriteScale, animationData: recolorSkinAnim("zaraki", "umbral"),         recolorTag: "umbral" }
  ],

  // Zaraki Kenpachi — SHIKAI (separate select entry). Default skin only for now (its own creative batch can
  // follow later). animationData:null → uses the char's native Shikai art.
  zaraki_shikai: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.zaraki_shikai?.portrait, spriteScale: characters.zaraki_shikai?.spriteScale, animationData: null }
  ]
}

// Append manifest-driven recolor skins (5+ per char) to every character's list, idempotently —
// ids already present (bespoke skins gojo2/sukuna3/megumi2 + the original beerusEmerald/saikiAzure/
// flashBlue) stay authoritative and are never duplicated. Empty manifest entries add nothing.
for (const key of Object.keys(SKINS)) {
  const have = new Set(SKINS[key].map(s => s.id))
  for (const rs of recolorSkins(key)) if (!have.has(rs.id)) SKINS[key].push(rs)
}

export function getSkins(rosterKey) {
  return SKINS[rosterKey] || [{ id: "default", name: "Default", unlockLevel: 0, portrait: null, spriteScale: 1, animationData: null }]
}
export function getSkin(rosterKey, skinId) {
  const list = getSkins(rosterKey)
  return list.find(s => s.id === skinId) || list[0]
}
export function getSkinAnimationData(rosterKey, skinId) {
  return getSkin(rosterKey, skinId)?.animationData || null   // null = use the character's default
}
export function isSkinUnlocked(rosterKey, skinId) {
  const skin = getSkin(rosterKey, skinId)
  if (!skin || skin.unlockLevel <= 0) return true
  // Dev OR beta code unlocks ALL skins (beta now grants the same full unlock as dev,
  // and separately sprite-filters the selectable roster — see game.js).
  if (isFullyUnlocked()) return true
  return getLevel() >= skin.unlockLevel
}

// DERIVED snapshot of which skins are unlocked, per character — for the save-file
// `skins` section. skins.js persists NO unlock state of its own (unlock is computed
// from level + dev/beta), so this is a read-only projection recomputed from the SAME
// rule as isSkinUnlocked(), taking level/dev/beta as explicit args so it can be built
// for any account object (not just the current session). Returns { rosterKey: [ids] }.
export function buildUnlockedSkinsSnapshot(level = 1, dev = false, beta = false) {
  const out = {}
  for (const [rosterKey, list] of Object.entries(SKINS)) {
    out[rosterKey] = list
      .filter(s => s.unlockLevel <= 0 || dev || beta || level >= s.unlockLevel)
      .map(s => s.id)
  }
  return out
}
