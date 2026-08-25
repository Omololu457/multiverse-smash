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
import { isChallengeSkinUnlocked } from "./challenges.js"   // challenge-reward skins (guest-safe, persisted)
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
  }
}

// The exact GUESSED rows (ambiguous strips → slot), for the report / your edits.
export const SKIN_GUESSES = {}

// Display scale per skin (source cell heights differ from default).
const SKIN_SCALE = { gojo2: 1.8 }

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
    { id: "gojoStorm",      name: "Storm Barrier",     unlockLevel: 0, portrait: "./gojo_portrait__storm.png",      spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "storm") },
    // ADDITIVE — 4 procedural-pattern skins on the outfit (Infinity Void already exists, not duplicated); hair+eyes+outfit coordinated
    { id: "gojoGradientLimitless", name: "Gradient Limitless", unlockLevel: 0, portrait: "./gojo_portrait__gojoGradientLimitless.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "gojoGradientLimitless") },
    { id: "gojoHarlequinSorcerer", name: "Harlequin Sorcerer", unlockLevel: 0, portrait: "./gojo_portrait__gojoHarlequinSorcerer.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "gojoHarlequinSorcerer") },
    { id: "gojoCircuitBarrier", name: "Circuit Barrier", unlockLevel: 0, portrait: "./gojo_portrait__gojoCircuitBarrier.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "gojoCircuitBarrier") },
    { id: "gojoChevronStrike", name: "Chevron Strike", unlockLevel: 0, portrait: "./gojo_portrait__gojoChevronStrike.png", spriteScale: characters.gojo?.spriteScale, animationData: recolorSkinAnim("gojo", "gojoChevronStrike") }
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

  // Alternate Sukuna (rosterKey alt_sukuna) — SEPARATE char from `sukuna`. Default + 8 coordinated recolors
  // + Ink Wash (manga-monochrome homage) + Void Sovereign (Alien-X). ★HEALTH-CHECKED: the prompt's cream-
  // kimono region map was WRONG for this rip (BLACK outfit / RED scarf / markings==scarf-red). Owner-locked
  // STRATEGY A — outfit stays BLACK; theme via HAIR (pink) + ACCENT (scarf+markings+shoes, recolor together).
  // Body-region recolor only; the Domain shrine backdrop (cursed-technique FX) is untouched. gen_alt_sukuna_creative.py.
  alt_sukuna: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.alt_sukuna?.portrait, spriteScale: characters.alt_sukuna?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "altSukunaCrimsonMalevolence", name: "Crimson Malevolence", unlockLevel: 0, portrait: "./alt_sukuna_portrait__crimsonmalevolence.png", spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "crimsonmalevolence") },   // red hair / intensified-red scarf+markings on black
    { id: "altSukunaAzureCurse",         name: "Azure Curse",         unlockLevel: 0, portrait: "./alt_sukuna_portrait__azurecurse.png",         spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "azurecurse") },           // blue hair / azure accent on black
    { id: "altSukunaGoldenSovereign",    name: "Golden Sovereign",    unlockLevel: 0, portrait: "./alt_sukuna_portrait__goldensovereign.png",    spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "goldensovereign") },      // golden-blonde hair / gold accent on black
    { id: "altSukunaObsidianKing",       name: "Obsidian King",       unlockLevel: 0, portrait: "./alt_sukuna_portrait__obsidianking.png",       spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "obsidianking") },         // grey hair / grey accent on black (all-noir)
    // ── Group 2 ──
    { id: "altSukunaVerdantCurse",       name: "Verdant Curse",       unlockLevel: 0, portrait: "./alt_sukuna_portrait__verdantcurse.png",       spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "verdantcurse") },         // jade hair / green accent on black
    { id: "altSukunaWisteriaReign",      name: "Wisteria Reign",      unlockLevel: 0, portrait: "./alt_sukuna_portrait__wisteriareign.png",      spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "wisteriareign") },        // violet hair / wisteria accent on black
    { id: "altSukunaEmberFeast",         name: "Ember Feast",         unlockLevel: 0, portrait: "./alt_sukuna_portrait__emberfeast.png",         spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "emberfeast") },          // auburn hair / ember-orange accent on black
    { id: "altSukunaFrostboundSovereign", name: "Frostbound Sovereign", unlockLevel: 0, portrait: "./alt_sukuna_portrait__frostboundsovereign.png", spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "frostboundsovereign") }, // silver-white hair / icy-blue accent on black
    // ── Specialty (2) ──
    { id: "altSukunaInkWash",            name: "Ink Wash",            unlockLevel: 0, portrait: "./alt_sukuna_portrait__inkwash.png",            spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "inkwash") },             // manga-monochrome homage — pale-grey skin / inked-black hair+markings (outfit stays black — flagged)
    { id: "altSukunaVoidSovereign",      name: "Void Sovereign",      unlockLevel: 0, portrait: "./alt_sukuna_portrait__voidsovereign.png",      spriteScale: characters.alt_sukuna?.spriteScale, animationData: recolorSkinAnim("alt_sukuna", "voidsovereign") },        // full-black silhouette + drifting cherry-blossom petal overlay (game.js drawAltSukunaVoidAuraOverlay)
  ],

  // Aoi Todo (rosterKey aoi_todo, JJK) — Default + 8 coordinated recolors + Void Sovereign (tools/gen_aoi_todo_creative.py).
  // ★ HEALTH-CHECK (2026-08-18): the build-prompt's "vivid blue SASH" does NOT exist on the real sprite (a full
  // pixel scan found ZERO saturated-blue pixels); the only waist accent is a small GREY belt, and the pants are
  // dark NAVY (not black). Hair fill == pure-black OUTLINE → hair can't be recolored cleanly (stays black).
  // Owner-locked (AskUserQuestion): PANTS carries the accent colour, the grey belt stays grey, and SKIN recolors
  // per skin (a deliberate, flagged departure from the skin-exclusion default — justified since Todo fights
  // shirtless, so skin is the dominant identity region). Belt/hair/outline/shoes protected.
  aoi_todo: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.aoi_todo?.portrait, spriteScale: characters.aoi_todo?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "aoiTodoCrimsonBrawler",  name: "Crimson Brawler",  unlockLevel: 0, portrait: "./aoi_todo_portrait__crimsonbrawler.png",  spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "crimsonbrawler") },   // bronze-red skin / red pants
    { id: "aoiTodoVerdantStorm",    name: "Verdant Storm",    unlockLevel: 0, portrait: "./aoi_todo_portrait__verdantstorm.png",    spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "verdantstorm") },     // olive-tan skin / green pants
    { id: "aoiTodoGoldenTitan",     name: "Golden Titan",     unlockLevel: 0, portrait: "./aoi_todo_portrait__goldentitan.png",     spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "goldentitan") },      // gold-tan skin / gold pants
    { id: "aoiTodoObsidianFighter", name: "Obsidian Fighter", unlockLevel: 0, portrait: "./aoi_todo_portrait__obsidianfighter.png", spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "obsidianfighter") },  // grey skin / near-black pants (monochrome)
    // ── Group 2 ──
    { id: "aoiTodoFrostboundBrawler", name: "Frostbound Brawler", unlockLevel: 0, portrait: "./aoi_todo_portrait__frostboundbrawler.png", spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "frostboundbrawler") }, // pale cool skin / ice-blue pants
    { id: "aoiTodoEmberFighter",    name: "Ember Fighter",    unlockLevel: 0, portrait: "./aoi_todo_portrait__emberfighter.png",    spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "emberfighter") },     // deep bronze skin / ember-orange pants
    { id: "aoiTodoVioletReign",     name: "Violet Reign",     unlockLevel: 0, portrait: "./aoi_todo_portrait__violetreign.png",     spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "violetreign") },      // cool violet-tan skin / violet pants
    { id: "aoiTodoAshfallChampion", name: "Ashfall Champion", unlockLevel: 0, portrait: "./aoi_todo_portrait__ashfallchampion.png", spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "ashfallchampion") },  // ash-grey skin / dull-bronze pants
    // ── Specialty ──
    { id: "aoiTodoVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./aoi_todo_portrait__voidsovereign.png",   spriteScale: characters.aoi_todo?.spriteScale, animationData: recolorSkinAnim("aoi_todo", "voidsovereign") },    // full-black cursed silhouette + drifting clap-shockwave/afterimage overlay (game.js drawAoiTodoVoidAuraOverlay)
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
  // Kakashi (Naruto universe) — STAGE 1. WITHOUT a default skin, applySkin() pulls the getSkins()
  // spriteScale:1 fallback and he renders at native ~65px (half size). This entry sources his real
  // spriteScale from the character. No alt skins yet (creative recolors are a later stage).
  kakashi: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.kakashi?.portrait, spriteScale: characters.kakashi?.spriteScale, animationData: null }
  ],

  // Gwen (ben10) — HAIR + TOP recolored per theme (coordinated hue family), PANTS a coordinated dark accent;
  // skin/collar kept natural except Void/Anodite (tools/gen_gwen_creative.py). Group 1 + Group 2 + Void
  // Sovereign (game.js drawGwenVoidAuraOverlay — drifting pink/violet mana motes) + Anodite/Lucky Girl homage
  // (REAL canon transformed state: purple skin + pink mana hair — distinct from Void's near-black).
  gwen: [
    { id: "default",            name: "Default",             unlockLevel: 0, portrait: characters.gwen?.portrait,                        spriteScale: characters.gwen?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "gwenCrimsonMana",    name: "Crimson Mana",        unlockLevel: 0, portrait: "./gwen_portrait__crimsonmana.png",    spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "crimsonmana"),    recolorTag: "crimsonmana" },
    { id: "gwenVerdantSpark",   name: "Verdant Spark",       unlockLevel: 0, portrait: "./gwen_portrait__verdantspark.png",   spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "verdantspark"),   recolorTag: "verdantspark" },
    { id: "gwenObsidianAnodite",name: "Obsidian Anodite",    unlockLevel: 0, portrait: "./gwen_portrait__obsidiananodite.png",spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "obsidiananodite"),recolorTag: "obsidiananodite" },
    { id: "gwenGoldenAura",     name: "Golden Aura",         unlockLevel: 0, portrait: "./gwen_portrait__goldenaura.png",     spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "goldenaura"),     recolorTag: "goldenaura" },
    // ── Group 2 ──
    { id: "gwenAzureClassic",   name: "Azure Classic",       unlockLevel: 0, portrait: "./gwen_portrait__azureclassic.png",   spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "azureclassic"),   recolorTag: "azureclassic" },
    { id: "gwenVioletReign",    name: "Violet Reign",        unlockLevel: 0, portrait: "./gwen_portrait__violetreign.png",    spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "violetreign"),    recolorTag: "violetreign" },
    { id: "gwenFrostboundSpark",name: "Frostbound Spark",    unlockLevel: 0, portrait: "./gwen_portrait__frostboundspark.png",spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "frostboundspark"),recolorTag: "frostboundspark" },
    { id: "gwenEmberMana",      name: "Ember Mana",          unlockLevel: 0, portrait: "./gwen_portrait__embermana.png",      spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "embermana"),      recolorTag: "embermana" },
    // ── Specialty ──
    { id: "gwenVoidSovereign",  name: "Void Sovereign",      unlockLevel: 0, portrait: "./gwen_portrait__voidsovereign.png",  spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "voidsovereign"),  recolorTag: "voidsovereign" },
    { id: "gwenAnodite",        name: "Anodite (Lucky Girl)",unlockLevel: 0, portrait: "./gwen_portrait__anodite.png",        spriteScale: characters.gwen?.spriteScale, animationData: recolorSkinAnim("gwen", "anodite"),        recolorTag: "anodite" }              // HOMAGE canon Anodite form: purple skin + pink mana hair
  ],

  // Vilgax (ben10) — ARMOR plating (red+blue/purple zones unified per theme) + GLOVES accent recolored; green
  // SKIN/cheek-sacs protected except Void/Original-Series (tools/gen_vilgax_creative.py). Plasma/sword FX are
  // procedural (game.js) — never skin-swapped. Group 1 + Group 2 + Void Sovereign (game.js
  // drawVilgaxVoidAuraOverlay — drifting dark tentacle-tendril motes) + Original Series armour homage (real
  // alternate-era design: black/red-brown armour + gloves, green cheek-sacs kept). Default entry MANDATORY.
  vilgax: [
    { id: "default",              name: "Default",           unlockLevel: 0, portrait: characters.vilgax?.portrait,                        spriteScale: characters.vilgax?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "vilgaxCrimsonConqueror", name: "Crimson Conqueror", unlockLevel: 0, portrait: "./vilgax_portrait__crimsonconqueror.png", spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "crimsonconqueror"), recolorTag: "crimsonconqueror" },
    { id: "vilgaxVerdantWarlord",   name: "Verdant Warlord",   unlockLevel: 0, portrait: "./vilgax_portrait__verdantwarlord.png",   spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "verdantwarlord"),   recolorTag: "verdantwarlord" },
    { id: "vilgaxObsidianTyrant",   name: "Obsidian Tyrant",   unlockLevel: 0, portrait: "./vilgax_portrait__obsidiantyrant.png",   spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "obsidiantyrant"),   recolorTag: "obsidiantyrant" },
    { id: "vilgaxGoldenConqueror",  name: "Golden Conqueror",  unlockLevel: 0, portrait: "./vilgax_portrait__goldenconqueror.png",  spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "goldenconqueror"),  recolorTag: "goldenconqueror" },
    // ── Group 2 ──
    { id: "vilgaxVioletWarlord",    name: "Violet Warlord",    unlockLevel: 0, portrait: "./vilgax_portrait__violetwarlord.png",    spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "violetwarlord"),    recolorTag: "violetwarlord" },
    { id: "vilgaxEmberConqueror",   name: "Ember Conqueror",   unlockLevel: 0, portrait: "./vilgax_portrait__emberconqueror.png",   spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "emberconqueror"),   recolorTag: "emberconqueror" },
    { id: "vilgaxFrostboundTyrant", name: "Frostbound Tyrant", unlockLevel: 0, portrait: "./vilgax_portrait__frostboundtyrant.png", spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "frostboundtyrant"), recolorTag: "frostboundtyrant" },
    { id: "vilgaxAshenWarlord",     name: "Ashen Warlord",     unlockLevel: 0, portrait: "./vilgax_portrait__ashenwarlord.png",     spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "ashenwarlord"),     recolorTag: "ashenwarlord" },
    // ── Specialty ──
    { id: "vilgaxVoidSovereign",    name: "Void Sovereign",    unlockLevel: 0, portrait: "./vilgax_portrait__voidsovereign.png",    spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "voidsovereign"),    recolorTag: "voidsovereign" },
    { id: "vilgaxOriginalSeries",   name: "Original Series",   unlockLevel: 0, portrait: "./vilgax_portrait__originalseries.png",   spriteScale: characters.vilgax?.spriteScale, animationData: recolorSkinAnim("vilgax", "originalseries"),   recolorTag: "originalseries" }             // HOMAGE OS armour: black/red-brown, green cheek-sacs
  ],

  // Miles Morales — the RED web-pattern accent (webs/lenses/soles) recolored per theme; the BLACK suit base
  // stays black (tools/gen_miles_creative.py). The baked electric-yellow VENOM-blast FX is PROTECTED (never
  // painted — byte-identical across all skins). Group 1 + Group 2 + Void Sovereign (game.js
  // drawMilesVoidAuraOverlay — drifting white web-strand motes) + Upgraded Suit homage (blue body + white
  // stripes via value-split — chosen over Classic since the base already reads as the black/red classic suit).
  miles: [
    { id: "default",          name: "Default",         unlockLevel: 0, portrait: characters.miles?.portrait,                        spriteScale: characters.miles?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "milesVerdantWeb",  name: "Verdant Web",     unlockLevel: 0, portrait: "./miles_portrait__verdantweb.png",  spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "verdantweb"),  recolorTag: "verdantweb" },
    { id: "milesObsidianWeb", name: "Obsidian Web",    unlockLevel: 0, portrait: "./miles_portrait__obsidianweb.png", spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "obsidianweb"), recolorTag: "obsidianweb" },
    { id: "milesGoldenWeb",   name: "Golden Web",      unlockLevel: 0, portrait: "./miles_portrait__goldenweb.png",   spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "goldenweb"),   recolorTag: "goldenweb" },
    { id: "milesFrostboundWeb",name: "Frostbound Web", unlockLevel: 0, portrait: "./miles_portrait__frostboundweb.png",spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "frostboundweb"),recolorTag: "frostboundweb" },
    // ── Group 2 ──
    { id: "milesVioletWeb",   name: "Violet Web",      unlockLevel: 0, portrait: "./miles_portrait__violetweb.png",   spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "violetweb"),   recolorTag: "violetweb" },
    { id: "milesEmberWeb",    name: "Ember Web",       unlockLevel: 0, portrait: "./miles_portrait__emberweb.png",    spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "emberweb"),    recolorTag: "emberweb" },
    { id: "milesAzureWeb",    name: "Azure Web",       unlockLevel: 0, portrait: "./miles_portrait__azureweb.png",    spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "azureweb"),    recolorTag: "azureweb" },
    { id: "milesAshenWeb",    name: "Ashen Web",       unlockLevel: 0, portrait: "./miles_portrait__ashenweb.png",    spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "ashenweb"),    recolorTag: "ashenweb" },
    // ── Specialty ──
    { id: "milesVoidSovereign",name: "Void Sovereign", unlockLevel: 0, portrait: "./miles_portrait__voidsovereign.png",spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "voidsovereign"),recolorTag: "voidsovereign" },
    { id: "milesUpgradedSuit", name: "Upgraded Suit",  unlockLevel: 0, portrait: "./miles_portrait__classicsuit.png", spriteScale: characters.miles?.spriteScale, animationData: recolorSkinAnim("miles", "classicsuit"), recolorTag: "classicsuit" }              // HOMAGE Upgraded Suit: blue body + white stripes
  ],

  // Ippo Makunouchi — the RED gi/gloves/trim recolored per theme; white shorts + tan skin + black hair
  // protected except Void (tools/gen_ippo_creative.py). Group 1 + Group 2 + Void Sovereign (game.js
  // drawIppoVoidAuraOverlay — drifting sweat/impact-spark motes) + Championship Gold (an ORIGINAL "title
  // belt" design, NOT a canon alternate — Ippo has no documented costume eras, flagged as original).
  ippo: [
    { id: "default",             name: "Default",             unlockLevel: 0, portrait: characters.ippo?.portrait,                        spriteScale: characters.ippo?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "ippoCrimsonChallenger", name: "Crimson Challenger", unlockLevel: 0, portrait: "./ippo_portrait__crimsonchallenger.png", spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "crimsonchallenger"), recolorTag: "crimsonchallenger" },
    { id: "ippoVerdantContender",  name: "Verdant Contender",  unlockLevel: 0, portrait: "./ippo_portrait__verdantcontender.png",  spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "verdantcontender"),  recolorTag: "verdantcontender" },
    { id: "ippoObsidianFighter",   name: "Obsidian Fighter",   unlockLevel: 0, portrait: "./ippo_portrait__obsidianfighter.png",   spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "obsidianfighter"),   recolorTag: "obsidianfighter" },
    { id: "ippoGoldenChampion",    name: "Golden Champion",    unlockLevel: 0, portrait: "./ippo_portrait__goldenchampion.png",    spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "goldenchampion"),    recolorTag: "goldenchampion" },
    // ── Group 2 ──
    { id: "ippoAzureBoxer",        name: "Azure Boxer",        unlockLevel: 0, portrait: "./ippo_portrait__azureboxer.png",        spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "azureboxer"),        recolorTag: "azureboxer" },
    { id: "ippoVioletContender",   name: "Violet Contender",   unlockLevel: 0, portrait: "./ippo_portrait__violetcontender.png",   spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "violetcontender"),   recolorTag: "violetcontender" },
    { id: "ippoFrostboundFighter", name: "Frostbound Fighter", unlockLevel: 0, portrait: "./ippo_portrait__frostboundfighter.png", spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "frostboundfighter"), recolorTag: "frostboundfighter" },
    { id: "ippoEmberChallenger",   name: "Ember Challenger",   unlockLevel: 0, portrait: "./ippo_portrait__emberchallenger.png",   spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "emberchallenger"),   recolorTag: "emberchallenger" },
    // ── Specialty ──
    { id: "ippoVoidSovereign",     name: "Void Sovereign",     unlockLevel: 0, portrait: "./ippo_portrait__voidsovereign.png",     spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "voidsovereign"),     recolorTag: "voidsovereign" },
    { id: "ippoChampionshipGold",  name: "Championship Gold",  unlockLevel: 0, portrait: "./ippo_portrait__championshipgold.png",  spriteScale: characters.ippo?.spriteScale, animationData: recolorSkinAnim("ippo", "championshipgold"),  recolorTag: "championshipgold" }             // ORIGINAL design (not canon): all-gold title-belt theme
  ],

  // Dark Vegeta (dragon_ball) — STAGE 1 default skin. WITHOUT this, applySkin() falls back to the
  // generic { spriteScale: 1 } default and clobbers the char's 2.1 (sprite renders half-size). Pulls
  // scale/portrait from the char def. Alt recolor skins are a later stage.
  // Dark Vegeta (rosterKey vegeta_dark, DBZ) — Default + 8 coordinated recolors + Void Sovereign + Classic
  // Saiyan Armor homage (tools/gen_vegeta_dark_creative.py). ★HEALTH-CHECKED: the bodysuit is essentially
  // PURE BLACK and indistinguishable from the green-fringed line-art outline (pure black carries no chroma to
  // hue-shift), so — per the black-costume convention (Sukuna/alt_sukuna) — the suit STAYS BLACK and each
  // theme is carried by HAIR + silver ARMOR + boot-toe red (+ gloves on the light skins). ★RESERVED: Violet
  // Reign leans a COOLER indigo-violet to stay clearly distinct from the real Dark-Aura/"Villainous Mode"
  // transform's magenta-purple (#9b30c9) — that purple is MECHANICAL content, not offered as a skin.
  vegeta_dark: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.vegeta_dark?.portrait, spriteScale: characters.vegeta_dark?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "vegetaDarkCrimsonPrince",  name: "Crimson Prince",  unlockLevel: 0, portrait: "./vegeta_dark_portrait__crimsonprince.png",  spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "crimsonprince") },   // deeper crimson hair/armor on black
    { id: "vegetaDarkVerdantSaiyan",  name: "Verdant Saiyan",  unlockLevel: 0, portrait: "./vegeta_dark_portrait__verdantsaiyan.png",  spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "verdantsaiyan") },   // green hair/armor on black
    { id: "vegetaDarkObsidianPrince", name: "Obsidian Prince", unlockLevel: 0, portrait: "./vegeta_dark_portrait__obsidianprince.png", spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "obsidianprince") },  // monochrome charcoal/silver
    { id: "vegetaDarkGoldenSaiyan",   name: "Golden Saiyan",   unlockLevel: 0, portrait: "./vegeta_dark_portrait__goldensaiyan.png",   spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "goldensaiyan") },    // gold hair/armor on black
    // ── Group 2 ──
    { id: "vegetaDarkAzurePrince",    name: "Azure Prince",    unlockLevel: 0, portrait: "./vegeta_dark_portrait__azureprince.png",    spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "azureprince") },     // blue hair/armor on black
    { id: "vegetaDarkVioletReign",    name: "Violet Reign",    unlockLevel: 0, portrait: "./vegeta_dark_portrait__violetreign.png",    spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "violetreign") },     // cooler indigo-violet (distinct from reserved Villainous-Mode purple)
    { id: "vegetaDarkFrostboundSaiyan", name: "Frostbound Saiyan", unlockLevel: 0, portrait: "./vegeta_dark_portrait__frostboundsaiyan.png", spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "frostboundsaiyan") }, // ice-blue/white (light outlier)
    { id: "vegetaDarkEmberPrince",    name: "Ember Prince",    unlockLevel: 0, portrait: "./vegeta_dark_portrait__emberprince.png",    spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "emberprince") },     // orange hair/armor on black
    // ── Specialty ──
    { id: "vegetaDarkVoidSovereign",  name: "Void Sovereign",  unlockLevel: 0, portrait: "./vegeta_dark_portrait__voidsovereign.png",  spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "voidsovereign") },   // full near-black + drifting ki-wisp overlay (game.js drawVegetaDarkVoidAuraOverlay)
    // ── Homage ──
    { id: "vegetaDarkClassicArmor",   name: "Classic Saiyan Armor", unlockLevel: 0, portrait: "./vegeta_dark_portrait__classicarmor.png", spriteScale: characters.vegeta_dark?.spriteScale, animationData: recolorSkinAnim("vegeta_dark", "classicarmor") } // white shoulder armor + near-black hair (classic Saiyan look)
  ],

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

  // Hashirama (universe: naruto) — STAGE 1 default + 12 creative recolors + 1 Alien-X-style Void skin
  // (tools/gen_hashirama_creative.py). Per-region, classified once from the ORIGINAL pixels: HAIR (brown
  // mane, split on the richer portrait) + ARMOR (crimson Senju plates) + SUIT (dark undersuit mass). Face/
  // skin + white collar protected. Personality/lore callbacks: Wood-Release forest, First Hokage robe,
  // Senju clan, sage vs young-prime, a subtle Madara-homage accent, Edo-Tensei Void, Sage-Mode amber.
  // Cosmetic only — ZERO gameplay changes.
  // Onoki (Third Tsuchikage) — Default + 12 creative Iwagakure/Tsuchikage/Dust-Release recolors + 1
  // Alien-X-style Eternal Void (full-black + game.js drawOnokiVoidAuraOverlay amber-stone aura). Generated
  // by tools/gen_onoki_creative.py (CAPE-primary to-tone recolor; face/skin + outline protected). The
  // default entry is MANDATORY (else applySkin() → spriteScale:1 native-shrink bug). Cosmetic only.
  // Deathstroke (Slade Wilson, DC) — Default + 8 creative recolors + the AUTHENTIC "Blue Period" alt + 1
  // Alien-X-style Void = 11. Generated by tools/gen_deathstroke_creative.py (3-region recolor: SUIT slate-
  // blue / ACCENT orange / TRIM gold; outline + eye protected). HEALTH-CHECK: the MASK is NOT color-
  // separable — its orange half IS the body accent → per owner decision the mask FOLLOWS THE ACCENT (the 4
  // black-accent skins get an all-black mask; the color-accent skins get an accent/black split). The default
  // entry is MANDATORY (else applySkin() → spriteScale:1 native-shrink bug). Cosmetic only — ZERO gameplay changes.
  // Iron Man 1 (Marvel) — STAGE 1 default only (creative recolors + Void come in a later skins stage).
  // The default entry is MANDATORY (else applySkin() → spriteScale:1 native-shrink bug).
  iron_man: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.iron_man?.portrait, spriteScale: characters.iron_man?.spriteScale, animationData: null },
  ],
  // Vegito Ultra Instinct -Sign- (dragon_ball) — Default + 8 coordinated recolors + Void Sovereign + Super
  // Saiyan Blue (tools/gen_vegito_creative.py). Recolors touch GI(navy jacket+trousers) + undershirt + earring
  // ONLY; the black+SILVER-STREAK hair is a spatially-split PROTECTED region → fixed across all 8 (owner-locked,
  // the transformation's signature). The 7 named specials' FX are procedural (abilities.js) → never skin-tagged,
  // always canonical. Default entry MANDATORY (else applySkin() → spriteScale:1 native-shrink bug).
  vegito: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.vegito?.portrait, spriteScale: characters.vegito?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "vegitoCrimsonFusion",   name: "Crimson Fusion",   unlockLevel: 0, portrait: "./vegito_portrait__crimsonfusion.png",   spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "crimsonfusion") },     // deep-red gi / black undershirt
    { id: "vegitoVerdantInstinct", name: "Verdant Instinct", unlockLevel: 0, portrait: "./vegito_portrait__verdantinstinct.png", spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "verdantinstinct") },   // green gi / dark-brown undershirt
    { id: "vegitoGoldenFusion",    name: "Golden Fusion",    unlockLevel: 0, portrait: "./vegito_portrait__goldenfusion.png",    spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "goldenfusion") },      // black gi / gold undershirt
    { id: "vegitoObsidianSign",    name: "Obsidian Sign",    unlockLevel: 0, portrait: "./vegito_portrait__obsidiansign.png",    spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "obsidiansign") },      // monochrome black-grey gi
    // ── Group 2 ──
    { id: "vegitoAzurePotara",     name: "Azure Potara",     unlockLevel: 0, portrait: "./vegito_portrait__azurepotara.png",     spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "azurepotara") },      // azure gi / dark-navy undershirt
    { id: "vegitoVioletFusion",    name: "Violet Fusion",    unlockLevel: 0, portrait: "./vegito_portrait__violetfusion.png",    spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "violetfusion") },      // violet gi / black undershirt
    { id: "vegitoEmberInstinct",   name: "Ember Instinct",   unlockLevel: 0, portrait: "./vegito_portrait__emberinstinct.png",   spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "emberinstinct") },     // ember-orange gi / red-brown undershirt
    { id: "vegitoFrostboundSign",  name: "Frostbound Sign",  unlockLevel: 0, portrait: "./vegito_portrait__frostboundsign.png",  spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "frostboundsign") },    // pale ice-blue gi / white-grey undershirt
    // ── Specialty ──
    { id: "vegitoVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./vegito_portrait__voidsovereign.png",   spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "voidsovereign") },     // full near-black silhouette + drifting silver-wisp overlay (game.js drawVegitoVoidAuraOverlay)
    { id: "vegitoSuperSaiyanBlue", name: "Super Saiyan Blue", unlockLevel: 0, portrait: "./vegito_portrait__supersaiyanblue.png", spriteScale: characters.vegito?.spriteScale, animationData: recolorSkinAnim("vegito", "supersaiyanblue") }, // HOMAGE alt-form: vivid-blue hair (gi navy / undershirt orange kept)
  ],
  // Iron Man 2 (Marvel) — STAGE 1 default only (recolors + Void come in a later skins stage). INDEPENDENT
  // from iron_man. The default entry is MANDATORY (else applySkin() → spriteScale:1 native-shrink bug).
  iron_man_2: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.iron_man_2?.portrait, spriteScale: characters.iron_man_2?.spriteScale, animationData: null },
  ],
  // Iron Man 3 (Marvel) — STAGE 1 default only (recolors + Void come in a later skins stage). INDEPENDENT
  // from iron_man / iron_man_2. The default entry is MANDATORY (else applySkin() → spriteScale:1 native-shrink bug).
  iron_man_3: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.iron_man_3?.portrait, spriteScale: characters.iron_man_3?.spriteScale, animationData: null },
  ],
  deathstroke: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.deathstroke?.portrait, spriteScale: characters.deathstroke?.spriteScale, animationData: null },
    { id: "deathstrokeCrimsonContract",    name: "Crimson Contract",    unlockLevel: 0, portrait: "./deathstroke_portrait__crimsoncontract.png",    spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "crimsoncontract") },    // deep-red suit / black accent / gunmetal trim
    { id: "deathstrokeVerdantMercenary",   name: "Verdant Mercenary",   unlockLevel: 0, portrait: "./deathstroke_portrait__verdantmercenary.png",   spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "verdantmercenary") },   // deep-green suit / black accent / silver trim
    { id: "deathstrokeGoldenReaper",       name: "Golden Reaper",       unlockLevel: 0, portrait: "./deathstroke_portrait__goldenreaper.png",       spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "goldenreaper") },       // black suit / heavy-gold accent (gold/black mask) / bright-gold trim
    { id: "deathstrokeObsidianWraith",     name: "Obsidian Wraith",     unlockLevel: 0, portrait: "./deathstroke_portrait__obsidianwraith.png",     spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "obsidianwraith") },     // monochrome black suit / grey accent (grey/black mask) / silver trim
    { id: "deathstrokeIceboundTerminator", name: "Icebound Terminator", unlockLevel: 0, portrait: "./deathstroke_portrait__iceboundterminator.png", spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "iceboundterminator") }, // pale ice-blue suit / white accent (white/black mask) / silver trim
    { id: "deathstrokeEmberContract",      name: "Ember Contract",      unlockLevel: 0, portrait: "./deathstroke_portrait__embercontract.png",      spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "embercontract") },      // burnt orange-red suit / dark-brown accent (deepened orange/black mask) / bronze trim
    { id: "deathstrokeVioletNth",          name: "Violet Nth",          unlockLevel: 0, portrait: "./deathstroke_portrait__violetnth.png",          spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "violetnth") },          // deep-violet suit / black accent / silver trim
    { id: "deathstrokeAshfallMercenary",   name: "Ashfall Mercenary",   unlockLevel: 0, portrait: "./deathstroke_portrait__ashfallmercenary.png",   spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "ashfallmercenary") },   // desaturated grey-brown suit / black accent / dull-bronze trim
    // AUTHENTIC alternate (a documented recurring look — orange dropped for blue+silver), flagged as a distinct category from the 8 original recolors.
    { id: "deathstrokeBluePeriod",         name: "Blue Period",         unlockLevel: 0, portrait: "./deathstroke_portrait__blueperiod.png",         spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "blueperiod") },         // deep-blue suit / steel-blue accent (orange DROPPED → steel-blue/black mask) / silver trim
    // Alien-X-style Void (special: full-black + game.js drawDeathstrokeVoidAuraOverlay ash/ember battlefield aura + single eye).
    { id: "deathstrokeVoidSovereign",      name: "Void Sovereign",      unlockLevel: 0, portrait: "./deathstroke_portrait__voidsovereign.png",      spriteScale: characters.deathstroke?.spriteScale, animationData: recolorSkinAnim("deathstroke", "voidsovereign") },      // full-black silhouette + drifting ash/ember overlay
  ],
  // Yuta Okkotsu (Jujutsu Kaisen) — Default + 6 themed alt-skins + Void Sovereign (Alien-X). UNIFORM-PRIMARY
  // recolor only: the white uniform (+ white sneakers, which share the same white → not separable) is the
  // primary colour, the katana red handle-wrap / gold tsuba are accent+trim, warm skin + black hair/pants/
  // outline are PROTECTED (black is one inseparable region → pants & hair stay dark on every skin). All
  // decals/emblems/wrist-icons DROPPED (drawn marks the pure-recolor pipeline can't add). gen_yuta_creative.py.
  // Default MUST exist: applySkin() sources the real spriteScale from here (else Yuta renders at native px).
  // The Handler (JJK) — STAGE 1: Default skin only (themed recolors are a later stage). Default MUST
  // exist: applySkin() sources the real spriteScale from here (else The Handler renders at native px).
  handler: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.handler?.portrait, spriteScale: characters.handler?.spriteScale, animationData: null },
  ],
  yuta: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.yuta?.portrait, spriteScale: characters.yuta?.spriteScale, animationData: null },
    { id: "yutaBen10",     name: "Ben 10",     unlockLevel: 0, portrait: "./yuta_portrait__ben10.png",     spriteScale: characters.yuta?.spriteScale, animationData: recolorSkinAnim("yuta", "ben10") },     // Omnitrix-green uniform / green katana accent (stripe+'10' decal dropped → green promoted to whole uniform)
    { id: "yutaAlbedo",    name: "Albedo",     unlockLevel: 0, portrait: "./yuta_portrait__albedo.png",    spriteScale: characters.yuta?.spriteScale, animationData: recolorSkinAnim("yuta", "albedo") },    // black uniform / red katana accent — Ben's palette inverted (negative counterpart)
    { id: "yutaValkyrie",  name: "Valkyrie",   unlockLevel: 0, portrait: "./yuta_portrait__valkyrie.png",  spriteScale: characters.yuta?.spriteScale, animationData: recolorSkinAnim("yuta", "valkyrie") },  // light-blue armour uniform / gold katana accent+trim (Beyblade Burst)
    { id: "yutaKukulkan",  name: "Kukulkan",   unlockLevel: 0, portrait: "./yuta_portrait__kukulkan.png",  spriteScale: characters.yuta?.spriteScale, animationData: recolorSkinAnim("yuta", "kukulkan") },  // deep purple uniform / jade feathered-serpent accent (Beyblade Burst)
    { id: "yutaSpriggan",  name: "Spriggan",   unlockLevel: 0, portrait: "./yuta_portrait__spriggan.png",  spriteScale: characters.yuta?.spriteScale, animationData: recolorSkinAnim("yuta", "spriggan") },  // deep-red dragon uniform / black katana accent — Beyblade substitute for unidentified 'Ark Balkesh'
    { id: "yutaZeus",      name: "Zeus",       unlockLevel: 0, portrait: "./yuta_portrait__zeus.png",      spriteScale: characters.yuta?.spriteScale, animationData: recolorSkinAnim("yuta", "zeus") },      // regal ivory-gold god-king uniform / gold katana — Beyblade substitute for unidentified 'Ark Balkesh'
    // Alien-X-style Void (special: full-black + game.js drawYutaVoidAuraOverlay cursed-energy wisps + Rika shadow-tendril motif + glowing eyes).
    { id: "yutaVoidSovereign", name: "Void Sovereign", unlockLevel: 0, portrait: "./yuta_portrait__voidsovereign.png", spriteScale: characters.yuta?.spriteScale, animationData: recolorSkinAnim("yuta", "voidsovereign") }, // full-black cursed silhouette + drifting cursed-energy wisps + Rika shadow-tendrils
  ],
  // Brainiac (Coluan, DC) — Default + 8 coordinated palette recolors + Animated Protocol (authentic animated
  // homage, own design lineage) + Void Sovereign (Alien-X). Body-region recolor only (green skin / purple
  // bodysuit / grey metal casing / red diodes); FX colours (beam/pillar/shield) untouched. gen_brainiac_creative.py.
  brainiac: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.brainiac?.portrait, spriteScale: characters.brainiac?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "brainiacCrimsonCircuit",    name: "Crimson Circuit",    unlockLevel: 0, portrait: "./brainiac_portrait__crimsoncircuit.png",    spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "crimsoncircuit") },    // deep red skin / black-red suit / gold diodes / black casing
    { id: "brainiacAzureIntelligence", name: "Azure Intelligence", unlockLevel: 0, portrait: "./brainiac_portrait__azureintelligence.png", spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "azureintelligence") }, // teal skin / navy suit / white diodes / cool-grey casing
    { id: "brainiacGoldenArchive",     name: "Golden Archive",     unlockLevel: 0, portrait: "./brainiac_portrait__goldenarchive.png",     spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "goldenarchive") },     // amber-gold skin / black suit / bright-gold diodes / bronze casing
    { id: "brainiacObsidianProcessor", name: "Obsidian Processor", unlockLevel: 0, portrait: "./brainiac_portrait__obsidianprocessor.png", spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "obsidianprocessor") }, // monochrome grey skin / black suit / white diodes / grey casing
    // ── Group 2 ──
    { id: "brainiacVerdantOvermind",   name: "Verdant Overmind",   unlockLevel: 0, portrait: "./brainiac_portrait__verdantovermind.png",   spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "verdantovermind") },   // deep-emerald skin / rich-violet suit / bright-red diodes / black casing
    { id: "brainiacVioletNexus",       name: "Violet Nexus",       unlockLevel: 0, portrait: "./brainiac_portrait__violetnexus.png",       spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "violetnexus") },       // lavender skin / deep-violet suit / silver diodes / grey casing
    { id: "brainiacEmberCore",         name: "Ember Core",         unlockLevel: 0, portrait: "./brainiac_portrait__embercore.png",         spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "embercore") },         // orange skin / red-brown suit / yellow diodes / black casing
    { id: "brainiacFrostboundArray",   name: "Frostbound Array",   unlockLevel: 0, portrait: "./brainiac_portrait__frostboundarray.png",   spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "frostboundarray") },   // icy-blue skin / white-grey suit / cyan diodes / silver casing
    // AUTHENTIC alternate (documented animated/modern design — a distinct lineage from the classic look), flagged as its own category (Deathstroke "Blue Period" precedent).
    { id: "brainiacAnimatedProtocol",  name: "Animated Protocol",  unlockLevel: 0, portrait: "./brainiac_portrait__animatedprotocol.png",  spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "animatedprotocol") },  // ANIMATED homage — teal face / deep-dark-purple suit / silver casing / yellow diodes
    // Alien-X-style Void (special: full-black + game.js drawBrainiacVoidAuraOverlay drifting data-glyph/binary aura).
    { id: "brainiacVoidSovereign",     name: "Void Sovereign",     unlockLevel: 0, portrait: "./brainiac_portrait__voidsovereign.png",     spriteScale: characters.brainiac?.spriteScale, animationData: recolorSkinAnim("brainiac", "voidsovereign") },     // full-black silhouette + drifting data-glyph/binary overlay
  ],
  // Green Lantern (Hal Jordan) — Default + 8 Lantern-Corps recolors + Black Lantern + 2 specialties (Void
  // Sovereign / Parallax Armor) = 11. Generated by tools/gen_green_lantern_creative.py (regions: GREEN suit
  // main / black SECONDARY / WHITE gloves; outline + skin/hair protected). FULL FX-recolour scope (owner
  // decision): the 6 construct FX sheets are recoloured per skin too (abilities.js fireGLConstruct picks the
  // skinId variant; the Energy Beam is tinted in code). Corps colours grounded in the DC emotional spectrum.
  green_lantern: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.green_lantern?.portrait, spriteScale: characters.green_lantern?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "glSinestroCorps",     name: "Sinestro Corps",      unlockLevel: 0, portrait: "./gl_portrait__sinestrocorps.png",     spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "sinestrocorps") },     // fear — yellow suit / black secondary / black gloves
    { id: "glRedLanternCorps",   name: "Red Lantern Corps",   unlockLevel: 0, portrait: "./gl_portrait__redlanterncorps.png",   spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "redlanterncorps") },   // rage — deep red suit / black secondary / white gloves
    { id: "glOrangeLanternCorps",name: "Orange Lantern Corps",unlockLevel: 0, portrait: "./gl_portrait__orangelanterncorps.png",spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "orangelanterncorps") },// avarice — vivid orange suit / white gloves
    { id: "glBlueLanternCorps",  name: "Blue Lantern Corps",  unlockLevel: 0, portrait: "./gl_portrait__bluelanterncorps.png",  spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "bluelanterncorps") },  // hope — bright blue suit / WHITE secondary / white gloves
    // ── Group 2 ──
    { id: "glIndigoTribe",       name: "Indigo Tribe",        unlockLevel: 0, portrait: "./gl_portrait__indigotribe.png",       spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "indigotribe") },       // compassion — deep indigo suit / white gloves
    { id: "glStarSapphireCorps", name: "Star Sapphire Corps", unlockLevel: 0, portrait: "./gl_portrait__starsapphirecorps.png", spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "starsapphirecorps") }, // love — violet-pink suit / white gloves
    { id: "glBlackLanternCorps", name: "Black Lantern Corps", unlockLevel: 0, portrait: "./gl_portrait__blacklanterncorps.png", spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "blacklanterncorps") }, // death — near-black suit / grey-white skeletal symbol+gloves (NO overlay — distinct from Void Sovereign)
    { id: "glWhiteLantern",      name: "White Lantern",       unlockLevel: 0, portrait: "./gl_portrait__whitelantern.png",      spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "whitelantern") },      // life — near-total white inversion (rainbow symbol not isolable → flat white, flagged)
    // ── Specialties ──
    // Parallax Armor — real-costume homage (armored, black-dominant green). RECOLOR APPROXIMATION only:
    // heavier black-to-green ratio + green trim; the shoulder-plating GEOMETRY / angular silhouette can NOT
    // be added by a palette recolor (would need new art) — flagged as a different-silhouette homage.
    { id: "glParallaxArmor",     name: "Parallax Armor",      unlockLevel: 0, portrait: "./gl_portrait__parallaxarmor.png",     spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "parallaxarmor") },     // armored black-dominant green (recolor approximation — no plating geometry)
    // Void Sovereign — Alien-X-style specialty: full-form near-black (incl. skin, the one skin-exclusion
    // exception) + NEW game.js drawGreenLanternVoidAuraOverlay (drifting cosmic star-field, fits his
    // space-faring context). Distinct from Black Lantern (which is a flat corps recolor, no overlay).
    { id: "glVoidSovereign",     name: "Void Sovereign",      unlockLevel: 0, portrait: "./gl_portrait__voidsovereign.png",     spriteScale: characters.green_lantern?.spriteScale, animationData: recolorSkinAnim("green_lantern", "voidsovereign") },     // full-black + drifting cosmic star-field overlay
  ],
  onoki: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.onoki?.portrait, spriteScale: characters.onoki?.spriteScale, animationData: null },
    { id: "onokiStoneSovereign", name: "Stone Sovereign", unlockLevel: 0, portrait: "./onoki_portrait__stonesovereign.png", spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "stonesovereign") },  // Iwagakure stone-grey mantle over slate
    { id: "onokiIronFortress",   name: "Iron Fortress",   unlockLevel: 0, portrait: "./onoki_portrait__ironfortress.png",   spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "ironfortress") },     // the immovable iron wall
    { id: "onokiJadeMountain",   name: "Jade Mountain",   unlockLevel: 0, portrait: "./onoki_portrait__jademountain.png",   spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "jademountain") },     // deep jade — mountain forest
    { id: "onokiDustRelease",    name: "Dust Release",    unlockLevel: 0, portrait: "./onoki_portrait__dustrelease.png",    spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "dustrelease") },      // pale prismatic — atomic Particle Style
    { id: "onokiTsuchikage",     name: "Tsuchikage",      unlockLevel: 0, portrait: "./onoki_portrait__tsuchikage.png",     spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "tsuchikage") },       // crimson Kage robe + cream + gold
    { id: "onokiGoldenKage",     name: "Golden Kage",     unlockLevel: 0, portrait: "./onoki_portrait__goldenkage.png",     spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "goldenkage") },       // regal ceremonial gold
    { id: "onokiThirdsRegalia",  name: "Third's Regalia", unlockLevel: 0, portrait: "./onoki_portrait__thirdsregalia.png",  spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "thirdsregalia") },    // dignified royal purple + gold
    { id: "onokiMoltenCore",     name: "Molten Core",     unlockLevel: 0, portrait: "./onoki_portrait__moltencore.png",     spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "moltencore") },       // lava orange — earth's molten core
    { id: "onokiCrimsonRock",    name: "Crimson Rock",    unlockLevel: 0, portrait: "./onoki_portrait__crimsonrock.png",    spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "crimsonrock") },      // red-primary rock over grey
    { id: "onokiAshElder",       name: "Ash Elder",       unlockLevel: 0, portrait: "./onoki_portrait__ashelder.png",       spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "ashelder") },         // ashen grey-green — aged veteran
    { id: "onokiYoungPrime",     name: "Young Prime",     unlockLevel: 0, portrait: "./onoki_portrait__youngprime.png",     spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "youngprime") },       // vivid — Onoki in his prime
    { id: "onokiSandAccord",     name: "Sand Accord",     unlockLevel: 0, portrait: "./onoki_portrait__sandaccord.png",     spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "sandaccord") },       // desert tan + turquoise (Iwa–Suna accord)
    { id: "onokiEternalVoid",    name: "Eternal Void",    unlockLevel: 0, portrait: "./onoki_portrait__eternalvoid.png",    spriteScale: characters.onoki?.spriteScale, animationData: recolorSkinAnim("onoki", "eternalvoid") },      // Alien-X full-black Dust silhouette + amber-stone aura overlay (game.js)
  ],
  // Mayuri Kurotsuchi (Bleach) — Default + 12 creative ROBE recolors + 1 Alien-X Void (Soul Society / 12th-
  // Division R&D / poison / Bankai-Konjiki / experiment lore), generated by tools/gen_mayuri_creative.py
  // (ROBE-primary to-tone; face/skin + warm-gold obi cord + line-art all PROTECTED; under-layer navy /
  // grey trim / magenta accent shift only where a skin specifies). MAIN FORM ONLY — Nemu's assist art + the
  // Bankai construct are NOT in animationData → never recoloured. Void = full-black + game.js
  // drawMayuriVoidAuraOverlay (poison-green venom aura). The default entry is MANDATORY (else applySkin() →
  // spriteScale:1 native-shrink). Cosmetic only.
  // Yamamoto — the 8 REAL pre-drawn palette-header costumes (rows 1 & 3) + a NEW Eternal Void. NOT
  // hue-rotations of corrupted samples: each costume's colour ramp is EXTRACTED from its game-original
  // variant crop (per-crop re-quantised so JPEG damage doesn't merge the dark hakama hues) and palette-
  // SWAPPED across the full animation set (tools/gen_yamamoto_palette_skins.py → sheet__<tag>.png). The
  // DEFAULT is the navy hakama the frames already ship in → Default(Navy) + 7 recolours + Eternal Void.
  yamamoto: [
    { id: "default",             name: "Navy Hakama",  unlockLevel: 0, portrait: characters.yamamoto?.portrait,                 spriteScale: characters.yamamoto?.spriteScale, animationData: null },   // base art = the navy/blue hakama
    { id: "yamamotoWineHakama",  name: "Wine Hakama",  unlockLevel: 0, portrait: "./yamamoto_portrait__wineHakama.png",  spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "wineHakama") },   // deep maroon/wine (crop hue 354)
    { id: "yamamotoIceBlue",     name: "Ice-Blue",     unlockLevel: 0, portrait: "./yamamoto_portrait__iceBlue.png",     spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "iceBlue") },      // pale ice-blue (crop blue, value-lifted per identity)
    { id: "yamamotoForestGreen", name: "Forest Green", unlockLevel: 0, portrait: "./yamamoto_portrait__forestGreen.png", spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "forestGreen") },  // olive/forest green (crop hue 167)
    { id: "yamamotoKhaki",       name: "Khaki",        unlockLevel: 0, portrait: "./yamamoto_portrait__khaki.png",       spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "khaki") },        // olive/khaki (crop hue 39)
    { id: "yamamotoGhostWhite",  name: "Ghost-White",  unlockLevel: 0, portrait: "./yamamoto_portrait__ghostWhite.png",  spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "ghostWhite") },   // all-pale ghost-white (crop desaturated)
    { id: "yamamotoViolet",      name: "Violet",       unlockLevel: 0, portrait: "./yamamoto_portrait__violet.png",      spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "violet") },       // violet/purple (crop hue 254)
    { id: "yamamotoCrimson",     name: "Crimson",      unlockLevel: 0, portrait: "./yamamoto_portrait__crimson.png",     spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "crimson") },      // crimson red (crop nudged from JPEG-damaged magenta to red per identity)
    { id: "yamamotoEternalVoid", name: "Eternal Void", unlockLevel: 0, portrait: "./yamamoto_portrait__voidEternal.png", spriteScale: characters.yamamoto?.spriteScale, animationData: recolorSkinAnim("yamamoto", "voidEternal") },  // Alien-X full-black silhouette + pale-blue-white Ryūjin Jakka aura overlay (game.drawYamamotoVoidAuraOverlay)
  ],

  mayuri: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.mayuri?.portrait, spriteScale: characters.mayuri?.spriteScale, animationData: null },
    { id: "mayuriResearchDivision", name: "Research Division", unlockLevel: 0, portrait: "./mayuri_portrait__researchdivision.png", spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "researchdivision") },  // SRDI teal-cyan haori (12th Division)
    { id: "mayuriReigai",           name: "Reigai",           unlockLevel: 0, portrait: "./mayuri_portrait__reigai.png",           spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "reigai") },           // pale artificial-soul mint
    { id: "mayuriClinicalAsh",      name: "Clinical Ash",     unlockLevel: 0, portrait: "./mayuri_portrait__clinicalash.png",      spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "clinicalash") },      // desaturated clinical grey lab coat + slate
    { id: "mayuriToxic",            name: "Toxic",            unlockLevel: 0, portrait: "./mayuri_portrait__toxic.png",            spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "toxic") },            // sickly poison-green — signature toxin
    { id: "mayuriBioHazard",        name: "Bio-Hazard",       unlockLevel: 0, portrait: "./mayuri_portrait__biohazard.png",        spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "biohazard") },        // hazard yellow-green + amber accent
    { id: "mayuriBloodExperiment",  name: "Blood Experiment", unlockLevel: 0, portrait: "./mayuri_portrait__bloodexperiment.png",  spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "bloodexperiment") },  // crimson robe over near-black
    { id: "mayuriHollowfied",       name: "Hollowfied",       unlockLevel: 0, portrait: "./mayuri_portrait__hollowfied.png",       spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "hollowfied") },       // bone-white + Hollow-crimson accent + black
    { id: "mayuriKonjikiGold",      name: "Konjiki Gold",     unlockLevel: 0, portrait: "./mayuri_portrait__konjiki.png",          spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "konjiki") },          // Bankai Konjiki gold + deep-gold accent
    { id: "mayuriVenomViolet",      name: "Venom Violet",     unlockLevel: 0, portrait: "./mayuri_portrait__venomviolet.png",      spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "venomviolet") },      // deep venom violet + deepened accent
    { id: "mayuriSokyokuCrimson",   name: "Sokyoku Crimson",  unlockLevel: 0, portrait: "./mayuri_portrait__sokyoku.png",          spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "sokyoku") },          // burnt vermilion (execution scaffold)
    { id: "mayuriSeireiteiFormal",  name: "Seireitei Formal", unlockLevel: 0, portrait: "./mayuri_portrait__seireitei.png",        spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "seireitei") },        // crisp cool-white haori + deep navy
    { id: "mayuriMuken",            name: "Muken",            unlockLevel: 0, portrait: "./mayuri_portrait__muken.png",            spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "muken") },            // indigo-black — the deepest prison
    { id: "mayuriEternalVoid",      name: "Eternal Void",     unlockLevel: 0, portrait: "./mayuri_portrait__eternalvoid.png",      spriteScale: characters.mayuri?.spriteScale, animationData: recolorSkinAnim("mayuri", "eternalvoid") },      // Alien-X full-black silhouette + poison-green venom aura overlay (game.js)
  ],
  // Kiba — Default + 12 creative OUTFIT recolors + 1 Alien-X Void (Inuzuka/beast/tracker lore), generated
  // by tools/gen_kiba_creative.py (OUTFIT-primary to-tone; face/skin + fang-mark browns + line-art +
  // white summoned-wolf highlights all PROTECTED — Kiba has no separate accent, confirmed by resample).
  // The FX/beast sheets (drills, wolves) recolor to __tag but pass through ~unchanged (protected classes).
  kiba: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.kiba?.portrait, spriteScale: characters.kiba?.spriteScale, animationData: null },
    { id: "kibaAshenWolf",       name: "Ashen Wolf",       unlockLevel: 0, portrait: "./kiba_portrait__ashenwolf.png",       spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "ashenwolf") },        // silver-grey — Akamaru's coat
    { id: "kibaInuzukaCrimson",  name: "Inuzuka Crimson",  unlockLevel: 0, portrait: "./kiba_portrait__inuzukacrimson.png",  spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "inuzukacrimson") },   // clan crimson — fang & blood
    { id: "kibaWildFang",        name: "Wild Fang",        unlockLevel: 0, portrait: "./kiba_portrait__wildfang.png",        spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "wildfang") },         // earthy brown — feral tracker
    { id: "kibaForestTracker",   name: "Forest Tracker",   unlockLevel: 0, portrait: "./kiba_portrait__foresttracker.png",   spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "foresttracker") },    // hunter green — forest hunt
    { id: "kibaMidnightHound",   name: "Midnight Hound",   unlockLevel: 0, portrait: "./kiba_portrait__midnighthound.png",   spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "midnighthound") },    // deep indigo — midnight hound
    { id: "kibaTsumesBlood",     name: "Tsume's Blood",    unlockLevel: 0, portrait: "./kiba_portrait__tsumesblood.png",     spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "tsumesblood") },      // burgundy — Tsume's heir
    { id: "kibaLeafChunin",      name: "Leaf Chunin",      unlockLevel: 0, portrait: "./kiba_portrait__leafchunin.png",      spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "leafchunin") },       // teal — Leaf chunin
    { id: "kibaBeastSovereign",  name: "Beast Sovereign",  unlockLevel: 0, portrait: "./kiba_portrait__beastsovereign.png",  spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "beastsovereign") },   // royal purple — beast sovereign
    { id: "kibaFrostHunter",     name: "Frost Hunter",     unlockLevel: 0, portrait: "./kiba_portrait__frosthunter.png",     spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "frosthunter") },      // icy pale blue — snowfield hunt
    { id: "kibaEmberMaw",        name: "Ember Maw",        unlockLevel: 0, portrait: "./kiba_portrait__embermaw.png",        spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "embermaw") },         // burnt orange — ember maw
    { id: "kibaVenomHound",      name: "Venom Hound",      unlockLevel: 0, portrait: "./kiba_portrait__venomhound.png",      spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "venomhound") },       // toxic yellow-green — venom hound
    { id: "kibaStormGrey",       name: "Storm Grey",       unlockLevel: 0, portrait: "./kiba_portrait__stormgrey.png",       spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "stormgrey") },        // steel blue-grey — storm tracker
    { id: "kibaEternalVoid",     name: "Eternal Void",     unlockLevel: 0, portrait: "./kiba_portrait__eternalvoid.png",     spriteScale: characters.kiba?.spriteScale, animationData: recolorSkinAnim("kiba", "eternalvoid") },      // Alien-X full-black beast silhouette + crimson fang aura overlay (game.js)
  ],
  // Byakuya Kuchiki — Default + 12 creative NOBLE recolors + Eternal Void (Alien-X), via
  // tools/gen_byakuya_creative.py (HAORI captain-coat/scarf PRIMARY + ROBE kimono to-tone recolor; warm
  // SKIN protected). Elegant register (Kuchiki-house colours, Senbonzakura petal tones, reiatsu blues) — no
  // rainbows. Void = full-black body + game.js drawByakuyaVoidAuraOverlay (petal-pink/reiatsu-blue aura).
  // The default entry is MANDATORY (else applySkin() → spriteScale:1 native-shrink). Cosmetic only.
  // Boruto — Stage 1 default only (creative skins are a later follow-up batch). The default entry is
  // REQUIRED: without it applySkin() falls back to spriteScale:1 and the sprite renders native-shrunk.
  boruto: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.boruto?.portrait, spriteScale: characters.boruto?.spriteScale, animationData: null },
  ],
  // Light Yagami — Default + 8 creative recolors (2 groups) + Void Sovereign + Umbral Reflection = 11.
  // tools/gen_light_creative.py: SUIT primary (black→white neutral ramp, value-spread kept → outline survives),
  // HAIR secondary (positionally masked off the shared-palette skin), NOTEBOOK/tie violet accent. FACE + HANDS
  // PROTECTED (Stage-0 Q2, spatial y-split). FX sheets excluded (not in animationData) → attack-colour read intact.
  light: [
    { id: "default",               name: "Default",           unlockLevel: 0, portrait: characters.light?.portrait,                 spriteScale: characters.light?.spriteScale, animationData: null },
    { id: "lightMidnightVerdict",  name: "Midnight Verdict",  unlockLevel: 0, portrait: "./light_portrait__midnightverdict.png",   spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "midnightverdict") },   // cool near-black suit + ice rim, near-black-brown hair
    { id: "lightCrimsonJudgment",  name: "Crimson Judgment",  unlockLevel: 0, portrait: "./light_portrait__crimsonjudgment.png",   spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "crimsonjudgment") },   // deep red-black suit, dark auburn-red hair
    { id: "lightGlacialGenius",    name: "Glacial Genius",    unlockLevel: 0, portrait: "./light_portrait__glacialgenius.png",     spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "glacialgenius") },     // blue-grey suit + ice-blue rim, frost-blonde hair
    { id: "lightAshboundScholar",  name: "Ashbound Scholar",  unlockLevel: 0, portrait: "./light_portrait__ashboundscholar.png",   spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "ashboundscholar") },   // desaturated grey suit, ash-brown hair
    { id: "lightGoldenApple",      name: "Golden Apple",      unlockLevel: 0, portrait: "./light_portrait__goldenapple.png",       spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "goldenapple") },       // warm-black suit + cream, golden-blonde hair
    { id: "lightWisteriaScholar",  name: "Wisteria Scholar",  unlockLevel: 0, portrait: "./light_portrait__wisteriascholar.png",   spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "wisteriascholar") },   // deep violet-black suit, cool violet-brown hair
    { id: "lightEmberDetective",   name: "Ember Detective",   unlockLevel: 0, portrait: "./light_portrait__emberdetective.png",    spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "emberdetective") },    // burnt-rust suit, rich auburn hair
    { id: "lightObsidianHeir",     name: "Obsidian Heir",     unlockLevel: 0, portrait: "./light_portrait__obsidianheir.png",      spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "obsidianheir") },      // true-monochrome suit, jet-black hair
    { id: "lightUmbralReflection", name: "Umbral Reflection", unlockLevel: 0, portrait: "./light_portrait__umbralreflection.png",  spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "umbralreflection") }, // INVERTED double — pale cream suit, cool violet-grey hair
    { id: "lightVoidSovereign",    name: "Void Sovereign",    unlockLevel: 0, portrait: "./light_portrait__lightvoidsovereign.png", spriteScale: characters.light?.spriteScale, animationData: recolorSkinAnim("light", "lightvoidsovereign") }, // Alien-X full-black + game.drawLightVoidAuraOverlay violet page-glyph aura
  ],
  // L "Ryuuzaki" (Death Note) — Default + 12 creative recolors + Eternal Void = 13. tools/gen_l_ryuuzaki_creative.py:
  // SHIRT primary (pale/white top), JEANS secondary (blue-grey/lavender denim). The iconic near-black HAIR
  // (RGB≈32,16,32) is PROTECTED in every skin (luminance-separable), FACE/HANDS + orange-tan ACCENT protected too
  // (Kira pushes the accent red). Shirt vs jeans split by SATURATION (denim is bluer/darker). FX/proj + Ryuk sheets
  // excluded (not in animationData → MAIN-FORM-ONLY, Mayuri precedent). The default entry is MANDATORY (else
  // applySkin() → spriteScale:1 native shrink). Cosmetic only — ZERO gameplay.
  l_ryuuzaki: [
    { id: "default",               name: "Default",            unlockLevel: 0, portrait: characters.l_ryuuzaki?.portrait,                       spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: null },
    { id: "lRyuuzakiMidnight",     name: "Midnight Detective", unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__midnight.png",                spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "midnight") },     // charcoal shirt over near-black jeans
    { id: "lRyuuzakiWammys",       name: "Wammy's Grey",       unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__wammys.png",                  spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "wammys") },       // slate shirt over steel jeans
    { id: "lRyuuzakiSugar",        name: "Sugar Rush",         unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__sugar.png",                   spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "sugar") },        // candy-pink shirt over cream-pink jeans
    { id: "lRyuuzakiStrawberry",   name: "Strawberry Cake",    unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__strawberry.png",              spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "strawberry") },   // pale strawberry shirt over cream jeans
    { id: "lRyuuzakiInsomnia",     name: "Blue Insomnia",      unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__insomnia.png",                spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "insomnia") },     // steel-blue shirt over deep indigo jeans
    { id: "lRyuuzakiShinigami",    name: "Shinigami Green",    unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__shinigami.png",               spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "shinigami") },    // sickly pale-green shirt over dark moss jeans
    { id: "lRyuuzakiKira",         name: "Kira Crimson",       unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__kira.png",                    spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "kira") },         // off-white shirt over deep crimson jeans + red accent
    { id: "lRyuuzakiAmber",        name: "Amber Deduction",    unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__amber.png",                   spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "amber") },        // warm amber shirt over brown jeans
    { id: "lRyuuzakiMono",         name: "Monochrome Genius",  unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__mono.png",                    spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "mono") },         // pure-white shirt over near-black jeans
    { id: "lRyuuzakiViolet",       name: "Violet Cipher",      unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__violet.png",                  spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "violet") },       // pale lilac shirt over deep violet jeans
    { id: "lRyuuzakiPanda",        name: "Panda Insomniac",    unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__panda.png",                   spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "panda") },        // INVERTED — near-black shirt over pale-grey jeans
    { id: "lRyuuzakiEternalVoid",  name: "Eternal Void",       unlockLevel: 0, portrait: "./l_ryuuzaki_portrait__lRyuuzakiEternalVoid.png",    spriteScale: characters.l_ryuuzaki?.spriteScale, animationData: recolorSkinAnim("l_ryuuzaki", "lRyuuzakiEternalVoid") }, // Alien-X full-black body + game.js drawLRyuuzakiVoidAuraOverlay (indigo/white deduction-glyph aura)
  ],
  byakuya: [
    { id: "default",               name: "Default",          unlockLevel: 0, portrait: characters.byakuya?.portrait,        spriteScale: characters.byakuya?.spriteScale, animationData: null },
    { id: "byakuyaSakuraBloom",    name: "Sakura Bloom",     unlockLevel: 0, portrait: "./byakuya_portrait__sakura.png",    spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "sakura") },     // Senbonzakura petal-pink coat over deep plum
    { id: "byakuyaKuchikiCrest",   name: "Kuchiki Crest",    unlockLevel: 0, portrait: "./byakuya_portrait__kuchiki.png",   spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "kuchiki") },    // noble royal-blue coat over black
    { id: "byakuyaWinterFrost",    name: "Winter Frost",     unlockLevel: 0, portrait: "./byakuya_portrait__frost.png",     spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "frost") },      // icy pale-blue-white coat over slate
    { id: "byakuyaBankaiReiatsu",  name: "Bankai Reiatsu",   unlockLevel: 0, portrait: "./byakuya_portrait__reiatsu.png",   spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "reiatsu") },    // Senbonzakura Kageyoshi ice-blue over midnight-blue
    { id: "byakuyaCrimsonCaptain", name: "Crimson Captain",  unlockLevel: 0, portrait: "./byakuya_portrait__crimson.png",   spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "crimson") },    // bold deep-crimson coat over black
    { id: "byakuyaGoldenNoble",    name: "Golden Noble",     unlockLevel: 0, portrait: "./byakuya_portrait__golden.png",    spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "golden") },     // regal cream-gold coat over dark umber
    { id: "byakuyaSquadSixSlate",  name: "Squad Six Slate",  unlockLevel: 0, portrait: "./byakuya_portrait__slate.png",     spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "slate") },      // militant steel-grey coat over charcoal
    { id: "byakuyaMidnightKuchiki",name: "Midnight Kuchiki", unlockLevel: 0, portrait: "./byakuya_portrait__midnight.png",  spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "midnight") },   // near-black noble monochrome
    { id: "byakuyaVerdantEstate",  name: "Verdant Estate",   unlockLevel: 0, portrait: "./byakuya_portrait__verdant.png",   spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "verdant") },    // sage/jade coat over dark forest-green
    { id: "byakuyaTwilightPlum",   name: "Twilight Plum",    unlockLevel: 0, portrait: "./byakuya_portrait__plum.png",      spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "plum") },       // dusty violet coat over deep purple
    { id: "byakuyaAshenMourning",  name: "Ashen Mourning",   unlockLevel: 0, portrait: "./byakuya_portrait__ashen.png",     spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "ashen") },      // desaturated grey-white mourning coat over charcoal
    { id: "byakuyaIvorySovereign", name: "Ivory Sovereign",  unlockLevel: 0, portrait: "./byakuya_portrait__ivory.png",     spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "ivory") },      // pristine bright ivory coat over near-black
    { id: "byakuyaEternalVoid",    name: "Eternal Void",     unlockLevel: 0, portrait: "./byakuya_portrait__void.png",      spriteScale: characters.byakuya?.spriteScale, animationData: recolorSkinAnim("byakuya", "void") },       // Alien-X full-black noble silhouette + petal-pink/reiatsu-blue aura overlay (game.js)
  ],
  hashirama: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.hashirama?.portrait, spriteScale: characters.hashirama?.spriteScale, animationData: null },
    { id: "hashiramaForestSovereign", name: "Forest Sovereign", unlockLevel: 0, portrait: "./hashirama_portrait__forestsovereign.png", spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "forestsovereign") },  // Wood Release — deep living forest green
    { id: "hashiramaAutumnCanopy",    name: "Autumn Canopy",    unlockLevel: 0, portrait: "./hashirama_portrait__autumncanopy.png",    spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "autumncanopy") },     // autumn-leaf burnt orange over bark-brown
    { id: "hashiramaMossBark",        name: "Moss Bark",        unlockLevel: 0, portrait: "./hashirama_portrait__mossbark.png",        spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "mossbark") },         // muted moss/olive — overgrown forest god
    { id: "hashiramaFirstHokage",     name: "First Hokage",     unlockLevel: 0, portrait: "./hashirama_portrait__firsthokage.png",     spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "firsthokage") },      // white Hokage robe + crimson — the Shodai's mantle
    { id: "hashiramaSenjuStandard",   name: "Senju Standard",   unlockLevel: 0, portrait: "./hashirama_portrait__senjustandard.png",   spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "senjustandard") },    // clan crimson + navy banner colours
    { id: "hashiramaElderSage",       name: "Elder Sage",       unlockLevel: 0, portrait: "./hashirama_portrait__elderSage.png",       spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "elderSage") },        // silver-haired laid-back grandfatherly sage
    { id: "hashiramaYoungPrime",      name: "Young Prime",      unlockLevel: 0, portrait: "./hashirama_portrait__youngprime.png",      spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "youngprime") },       // vivid saturated red — Hashirama in his prime
    { id: "hashiramaRivalsBond",      name: "Rivals Bond",      unlockLevel: 0, portrait: "./hashirama_portrait__rivalsbond.png",      spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "rivalsbond") },       // Madara blue-black mane nod + darkened plates (homage)
    { id: "hashiramaSageMarked",      name: "Sage-Marked",      unlockLevel: 0, portrait: "./hashirama_portrait__sagemarked.png",      spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "sagemarked") },       // amber Sage-Mode marking accent on the plates
    { id: "hashiramaWillOfFire",      name: "Will of Fire",     unlockLevel: 0, portrait: "./hashirama_portrait__willoffire.png",      spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "willoffire") },       // blazing ember red — the Will of Fire
    { id: "hashiramaValleyOfTheEnd",  name: "Valley of the End",unlockLevel: 0, portrait: "./hashirama_portrait__valleyofthEend.png",  spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "valleyofthEend") },   // stone-gray & river-blue — the final battlefield
    { id: "hashiramaDeepForestJade",  name: "Deep Forest Jade", unlockLevel: 0, portrait: "./hashirama_portrait__deepforestjade.png",  spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "deepforestjade") },   // jade/teal Mokuton — rarer forest hue
    { id: "hashiramaVoidHokage",      name: "Void Hokage",      unlockLevel: 0, portrait: "./hashirama_portrait__voidhokage.png",      spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "voidhokage") },        // Alien-X Void — cracked-pale Edo-Tensei undead + violet void glow
    // ── EXACT-SPEC batch (tools/gen_hashirama_spec.py) — user-specified colours implemented verbatim to
    // the extent the posterized sheets allow. Eyes/trim/spiral/streaks aren't isolable regions; the
    // GLOWING skins (Golden Sage Eyes / Ashen Reanimation / White Binding / Void) get a game.js draw-
    // overlay gated on their id (drawHashiramaSpecOverlay). Cosmetic only. ──
    { id: "hashiramaCherryblossom",  name: "Cherry Blossom Sage", unlockLevel: 0, portrait: "./hashirama_portrait__cherryblossom.png",  spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "cherryblossom") },   // pale blossom-pink armor + white trim (eyes/streaks not isolable)
    { id: "hashiramaForestcanopy",   name: "Deep Forest Canopy",  unlockLevel: 0, portrait: "./hashirama_portrait__forestcanopy.png",   spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "forestcanopy") },    // forest-green armor + bark-brown trim
    { id: "hashiramaHokagemantle",   name: "First Hokage's Mantle",unlockLevel: 0, portrait: "./hashirama_portrait__hokagemantle.png",  spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "hokagemantle") },    // white ceremonial robe base + red plates (flame trim kept)
    { id: "hashiramaSenjuspiral",    name: "Senju Spiral",        unlockLevel: 0, portrait: "./hashirama_portrait__senjuspiral.png",    spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "senjuspiral") },     // crimson base + gold highlight accents (spiral motif not isolable)
    { id: "hashiramaAutumnarmor",    name: "Autumn Canopy",       unlockLevel: 0, portrait: "./hashirama_portrait__autumnarmor.png",    spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "autumnarmor") },     // burnt-orange armor + deep umber trim
    { id: "hashiramaGoldensage",     name: "Golden Sage Eyes",    unlockLevel: 0, portrait: "./hashirama_portrait__goldensage.png",     spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "goldensage") },      // default red/black kept + gold accents; amber-gold eye GLOW via overlay
    { id: "hashiramaMossbound",      name: "Moss-Bound Elder",    unlockLevel: 0, portrait: "./hashirama_portrait__mossbound.png",      spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "mossbound") },       // muted sage-green armor + weathered-grey trim + charcoal hair
    { id: "hashiramaPrimesenju",     name: "Prime of the Senju",  unlockLevel: 0, portrait: "./hashirama_portrait__primesenju.png",     spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "primesenju") },      // vivid saturated scarlet armor + high-contrast black trim
    { id: "hashiramaBoundrivals",    name: "Bound Rivals",        unlockLevel: 0, portrait: "./hashirama_portrait__boundrivals.png",    spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "boundrivals") },     // indigo-violet-black base + red fan-crest trim (Madara accent nod)
    { id: "hashiramaAshenreanim",    name: "Ashen Reanimation",   unlockLevel: 0, portrait: "./hashirama_portrait__ashenreanim.png",    spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "ashenreanim") },     // grey-white hair + pale grey skin + desat black armor; white-blue eye GLOW via overlay
    { id: "hashiramaWhitebinding",   name: "White Binding",       unlockLevel: 0, portrait: "./hashirama_portrait__whitebinding.png",   spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "whitebinding") },    // pale green-white hair + sickly pale-green skin + desat armor; green eye GLOW via overlay
    { id: "hashiramaMonumentbronze", name: "Monument Bronze",     unlockLevel: 0, portrait: "./hashirama_portrait__monumentbronze.png", spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "monumentbronze") },  // flat bronze-grey statue tone — no colour variation anywhere
    { id: "hashiramaVoidgreen",      name: "Void",                unlockLevel: 0, portrait: "./hashirama_portrait__voidgreen.png",      spriteScale: characters.hashirama?.spriteScale, animationData: recolorSkinAnim("hashirama", "voidgreen") }        // Alien-X Void (green) — blackened base + green swirling aura GLOW via overlay (2nd Void, Wood-Release green)
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

  // Pain / Nagato's Deva Path (Naruto). Default + 12 creative recolors (tools/gen_pain_creative.py). THREE
  // coordinated regions: HAIR (his spiky red-orange, top zone) + CLOAK base (near-black + its bluish-gray
  // mid-tones, one region) + CLOUDS (the Akatsuki RED-cloud pattern — a genuinely separable accent, split
  // from hair by POSITION since both share the red hue family). FACE/Rinnegan + line-art outlines are
  // PROTECTED (never painted). Cosmetic-only — ZERO gameplay. Skin 12 (Void Path) adds a procedural
  // drifting-red-particle + gravity-ripple overlay (game.js drawPainVoidOverlay, gated on this id).
  pain: [
    { id: "default",          name: "Default",          unlockLevel: 0, portrait: characters.pain?.portrait,               spriteScale: characters.pain?.spriteScale, animationData: null },
    // ── Group 1 — Ben 10 homages + 2 Beyblade-color skins ──
    { id: "painOmnitrix",      name: "Omnitrix Protocol", unlockLevel: 0, portrait: "./pain_portrait__omnitrix.png",      spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "omnitrix") },
    { id: "painAlbedo",        name: "Albedo Protocol",   unlockLevel: 0, portrait: "./pain_portrait__albedo.png",        spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "albedo") },
    { id: "painRoyalValkyrie", name: "Royal Valkyrie",    unlockLevel: 0, portrait: "./pain_portrait__royalvalkyrie.png", spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "royalvalkyrie") },
    { id: "painMirageWyrm",    name: "Mirage Wyrm",       unlockLevel: 0, portrait: "./pain_portrait__miragewyrm.png",    spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "miragewyrm") },
    // ── Group 2 ──
    { id: "painCrimsonRinnegan", name: "Crimson Rinnegan", unlockLevel: 0, portrait: "./pain_portrait__crimsonrinnegan.png", spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "crimsonrinnegan") },
    { id: "painCobaltPath",      name: "Cobalt Path",      unlockLevel: 0, portrait: "./pain_portrait__cobaltpath.png",      spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "cobaltpath") },
    { id: "painEmeraldDeva",     name: "Emerald Deva",     unlockLevel: 0, portrait: "./pain_portrait__emeralddeva.png",     spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "emeralddeva") },
    { id: "painAmethystPath",    name: "Amethyst Path",    unlockLevel: 0, portrait: "./pain_portrait__amethystpath.png",    spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "amethystpath") },
    // ── Group 3 ── (Void Path adds the game.js drawPainVoidOverlay procedural red-mote + gravity-ripple overlay, gated on id)
    { id: "painAshenDeva",     name: "Ashen Deva",     unlockLevel: 0, portrait: "./pain_portrait__ashendeva.png",     spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "ashendeva") },
    { id: "painGoldenRikudou", name: "Golden Rikudou", unlockLevel: 0, portrait: "./pain_portrait__goldenrikudou.png", spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "goldenrikudou") },
    { id: "painIvoryPath",     name: "Ivory Path",     unlockLevel: 0, portrait: "./pain_portrait__ivorypath.png",     spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "ivorypath") },
    { id: "painVoidPath",      name: "Void Path",      unlockLevel: 0, portrait: "./pain_portrait__voidpath.png",      spriteScale: characters.pain?.spriteScale, animationData: recolorSkinAnim("pain", "voidpath") }
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
    { id: "obitoStorm",     name: "Storm Eye",         unlockLevel: 0, portrait: "./obito_portrait__storm.png",      spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "storm") },
    // ADDITIVE — 4 procedural-pattern skins on the robe (Void Mask already exists, not duplicated); face protected
    { id: "obitoStripeProtocol", name: "Stripe Protocol", unlockLevel: 0, portrait: "./obito_portrait__obitoStripeProtocol.png", spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "obitoStripeProtocol") },
    { id: "obitoHarlequinMask", name: "Harlequin Mask", unlockLevel: 0, portrait: "./obito_portrait__obitoHarlequinMask.png", spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "obitoHarlequinMask") },
    { id: "obitoCircuitEye", name: "Circuit Eye", unlockLevel: 0, portrait: "./obito_portrait__obitoCircuitEye.png", spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "obitoCircuitEye") },
    { id: "obitoMarbledPhantom", name: "Marbled Phantom", unlockLevel: 0, portrait: "./obito_portrait__obitoMarbledPhantom.png", spriteScale: characters.obito?.spriteScale, animationData: recolorSkinAnim("obito", "obitoMarbledPhantom") }
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
    { id: "tobiCelestial",    name: "Celestial Veil",   unlockLevel: 0, portrait: "./tobi_portrait__celestial.png",     spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "celestial") },
    // ADDITIVE — 4 procedural-pattern skins (cloak) + Kamui Void (near-black + game.js drawKamuiVoidOverlay)
    { id: "tobiGradientShade", name: "Gradient Shade", unlockLevel: 0, portrait: "./tobi_portrait__tobiGradientShade.png", spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "tobiGradientShade") },
    { id: "tobiChevronStrike", name: "Chevron Strike", unlockLevel: 0, portrait: "./tobi_portrait__tobiChevronStrike.png", spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "tobiChevronStrike") },
    { id: "tobiShatteredVeil", name: "Shattered Veil", unlockLevel: 0, portrait: "./tobi_portrait__tobiShatteredVeil.png", spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "tobiShatteredVeil") },
    { id: "tobiScaleMail", name: "Scale Mail", unlockLevel: 0, portrait: "./tobi_portrait__tobiScaleMail.png", spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "tobiScaleMail") },
    { id: "tobiKamuiVoid", name: "Kamui Void", unlockLevel: 0, portrait: "./tobi_portrait__tobiKamuiVoid.png", spriteScale: characters.tobi?.spriteScale, animationData: recolorSkinAnim("tobi", "tobiKamuiVoid") }
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.gon?.portrait, spriteScale: characters.gon?.spriteScale, animationData: null },
    // Stage 23 auto-palettes — default art + a render-time colour wash (no baked art), the same
    // mechanism as the "Pink Fit" tint skin. Gives every roster fighter ≥3 palettes.
    { id: "gon_crimson", name: "Crimson", unlockLevel: 2, portrait: characters.gon?.portrait, spriteScale: characters.gon?.spriteScale, animationData: null, skinTint: "#cf4a3f", tintStrength: 0.4 },
    { id: "gon_azure",   name: "Azure",   unlockLevel: 4, portrait: characters.gon?.portrait, spriteScale: characters.gon?.spriteScale, animationData: null, skinTint: "#3f7fcf", tintStrength: 0.4 }
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
  // Batman NEW VARIANT (rosterKey "dark_knight") — Stage 1: Default only. Alt skins are a later item.
  // Sources its real spriteScale (0.9) + portrait from the character.
  // Batman / Dark Knight — GREY body-suit recolored per theme + BELT accent coordinated; black cape/cowl/
  // gloves/boots kept black (silhouette) except Void; skin/jaw protected (tools/gen_dark_knight_creative.py).
  // Group 1 + Group 2 + Void Sovereign (game.js drawDarkKnightVoidAuraOverlay — drifting shadow/smoke
  // tendrils) + Batman Beyond homage (PALETTE-ONLY approximation: black suit + red bat-emblem accent; a full
  // silhouette match needs new art — flagged. Distinct from the "Blue Knight" homage on the other Batman).
  dark_knight: [
    { id: "default",              name: "Default",           unlockLevel: 0, portrait: characters.dark_knight?.portrait,                        spriteScale: characters.dark_knight?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "darkKnightCrimsonKnight",   name: "Crimson Knight",   unlockLevel: 0, portrait: "./dark_knight_portrait__crimsonknight.png",   spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "crimsonknight"),   recolorTag: "crimsonknight" },
    { id: "darkKnightVerdantGuardian", name: "Verdant Guardian", unlockLevel: 0, portrait: "./dark_knight_portrait__verdantguardian.png", spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "verdantguardian"), recolorTag: "verdantguardian" },
    { id: "darkKnightObsidianKnight",  name: "Obsidian Knight",  unlockLevel: 0, portrait: "./dark_knight_portrait__obsidianknight.png",  spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "obsidianknight"),  recolorTag: "obsidianknight" },
    { id: "darkKnightGoldenSentinel",  name: "Golden Sentinel",  unlockLevel: 0, portrait: "./dark_knight_portrait__goldensentinel.png",  spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "goldensentinel"),  recolorTag: "goldensentinel" },
    // ── Group 2 ──
    { id: "darkKnightAzureVigilante",  name: "Azure Vigilante",  unlockLevel: 0, portrait: "./dark_knight_portrait__azurevigilante.png",  spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "azurevigilante"),  recolorTag: "azurevigilante" },
    { id: "darkKnightVioletNightfall", name: "Violet Nightfall", unlockLevel: 0, portrait: "./dark_knight_portrait__violetnightfall.png", spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "violetnightfall"), recolorTag: "violetnightfall" },
    { id: "darkKnightEmberKnight",     name: "Ember Knight",     unlockLevel: 0, portrait: "./dark_knight_portrait__emberknight.png",     spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "emberknight"),     recolorTag: "emberknight" },
    { id: "darkKnightFrostboundSentinel", name: "Frostbound Sentinel", unlockLevel: 0, portrait: "./dark_knight_portrait__frostboundsentinel.png", spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "frostboundsentinel"), recolorTag: "frostboundsentinel" },
    // ── Specialty ──
    { id: "darkKnightVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./dark_knight_portrait__voidsovereign.png",   spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "voidsovereign"),   recolorTag: "voidsovereign" },
    { id: "darkKnightBatmanBeyond",    name: "Batman Beyond",    unlockLevel: 0, portrait: "./dark_knight_portrait__batmanbeyond.png",    spriteScale: characters.dark_knight?.spriteScale, animationData: recolorSkinAnim("dark_knight", "batmanbeyond"),    recolorTag: "batmanbeyond" }              // HOMAGE (palette-only): black suit + red bat-emblem accent
  ],
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
  // Superman (Arcade) — the ROSTER-WIDE 10-skin TEMPLATE (palette-skins prompt; owner: REPLACE the old set).
  // Built by tools/gen_superman_skins.py: per-region to-tone recolor of suit(blue) / cape+trunks+boots(red,
  // TOGETHER) / belt(yellow band) / "S"-shield(2-colour: bg + S). Void Sovereign = near-black whole-form
  // flatten + a procedural star-field overlay (game.js drawSupermanVoidStarfield, gated to the void skin id).
  // The SAME template is applied independently to superman_dcuc / superman_new52 / superman_classic below.
  superman: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.superman?.portrait, spriteScale: characters.superman?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "supermanCrimsonReversal", name: "Crimson Reversal", unlockLevel: 0, portrait: "./superman_portrait__crimsonreversal.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "crimsonreversal") },
    { id: "supermanVerdantGuardian", name: "Verdant Guardian", unlockLevel: 0, portrait: "./superman_portrait__verdantguardian.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "verdantguardian") },
    { id: "supermanObsidianSteel",   name: "Obsidian Steel",   unlockLevel: 0, portrait: "./superman_portrait__obsidiansteel.png",   spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "obsidiansteel") },
    { id: "supermanGoldenSentinel",  name: "Golden Sentinel",  unlockLevel: 0, portrait: "./superman_portrait__goldensentinel.png",  spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "goldensentinel") },
    // ── Group 2 ──
    { id: "supermanAzureDepths",     name: "Azure Depths",     unlockLevel: 0, portrait: "./superman_portrait__azuredepths.png",     spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "azuredepths") },
    { id: "supermanVioletEclipse",   name: "Violet Eclipse",   unlockLevel: 0, portrait: "./superman_portrait__violeteclipse.png",   spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "violeteclipse") },
    { id: "supermanFrostbound",      name: "Frostbound Kryptonian", unlockLevel: 0, portrait: "./superman_portrait__frostbound.png", spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "frostbound") },
    { id: "supermanAshfall",         name: "Ashfall Sentinel",  unlockLevel: 0, portrait: "./superman_portrait__ashfall.png",        spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "ashfall") },
    // ── Specialty ──
    { id: "supermanVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./superman_portrait__voidsovereign.png",   spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "voidsovereign") },
    { id: "supermanKingdomCome",     name: "Kingdom Come",     unlockLevel: 0, portrait: "./superman_portrait__kingdomcome.png",     spriteScale: characters.superman?.spriteScale, animationData: recolorSkinAnim("superman", "kingdomcome") }
  ],

  // Superman (Custom / DC Universe Customs) — rosterKey "superman_dcuc". Same gate: WITHOUT a default
  // skin, applySkin() pulls the getSkins() spriteScale:1 fallback and he renders at native ~half size.
  // Sources real spriteScale (2.0) + portrait from the character. STAGE 1 — template 10-skin set lands
  // with the roster-wide Superman skin pass (see superman-roster-4variants memory).
  superman_dcuc: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.superman_dcuc?.portrait, spriteScale: characters.superman_dcuc?.spriteScale, animationData: null },
    // ── Group 1 ── (tools/gen_superman_skins.py superman_dcuc — same 10-skin template)
    { id: "supermanDcucCrimsonReversal", name: "Crimson Reversal", unlockLevel: 0, portrait: "./superman_dcuc_portrait__crimsonreversal.png", spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "crimsonreversal") },
    { id: "supermanDcucVerdantGuardian", name: "Verdant Guardian", unlockLevel: 0, portrait: "./superman_dcuc_portrait__verdantguardian.png", spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "verdantguardian") },
    { id: "supermanDcucObsidianSteel",   name: "Obsidian Steel",   unlockLevel: 0, portrait: "./superman_dcuc_portrait__obsidiansteel.png",   spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "obsidiansteel") },
    { id: "supermanDcucGoldenSentinel",  name: "Golden Sentinel",  unlockLevel: 0, portrait: "./superman_dcuc_portrait__goldensentinel.png",  spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "goldensentinel") },
    // ── Group 2 ──
    { id: "supermanDcucAzureDepths",     name: "Azure Depths",     unlockLevel: 0, portrait: "./superman_dcuc_portrait__azuredepths.png",     spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "azuredepths") },
    { id: "supermanDcucVioletEclipse",   name: "Violet Eclipse",   unlockLevel: 0, portrait: "./superman_dcuc_portrait__violeteclipse.png",   spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "violeteclipse") },
    { id: "supermanDcucFrostbound",      name: "Frostbound Kryptonian", unlockLevel: 0, portrait: "./superman_dcuc_portrait__frostbound.png", spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "frostbound") },
    { id: "supermanDcucAshfall",         name: "Ashfall Sentinel",  unlockLevel: 0, portrait: "./superman_dcuc_portrait__ashfall.png",        spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "ashfall") },
    // ── Specialty ──
    { id: "supermanDcucVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./superman_dcuc_portrait__voidsovereign.png",   spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "voidsovereign") },
    { id: "supermanDcucKingdomCome",     name: "Kingdom Come",     unlockLevel: 0, portrait: "./superman_dcuc_portrait__kingdomcome.png",     spriteScale: characters.superman_dcuc?.spriteScale, animationData: recolorSkinAnim("superman_dcuc", "kingdomcome") }
  ],

  // Superman (New 52) — rosterKey "superman_new52". Same gate: WITHOUT a default skin, applySkin() pulls the
  // getSkins() spriteScale:1 fallback and he renders at native ~half size. Sources real spriteScale (1.25) +
  // portrait from the character. STAGE 1 — template 10-skin set lands with the roster-wide Superman skin pass
  // (★New 52 = NO trunks region → skip it in the skin template for this variant).
  superman_new52: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.superman_new52?.portrait, spriteScale: characters.superman_new52?.spriteScale, animationData: null },
    // ── Group 1 ── (tools/gen_superman_skins.py superman_new52 — same template; ★New 52 has NO trunks → the
    // "cape/trunks/boots" group is just cape+boots here, nothing to skip; the belt/S are a small accent.)
    { id: "supermanNew52CrimsonReversal", name: "Crimson Reversal", unlockLevel: 0, portrait: "./superman_new52_portrait__crimsonreversal.png", spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "crimsonreversal") },
    { id: "supermanNew52VerdantGuardian", name: "Verdant Guardian", unlockLevel: 0, portrait: "./superman_new52_portrait__verdantguardian.png", spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "verdantguardian") },
    { id: "supermanNew52ObsidianSteel",   name: "Obsidian Steel",   unlockLevel: 0, portrait: "./superman_new52_portrait__obsidiansteel.png",   spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "obsidiansteel") },
    { id: "supermanNew52GoldenSentinel",  name: "Golden Sentinel",  unlockLevel: 0, portrait: "./superman_new52_portrait__goldensentinel.png",  spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "goldensentinel") },
    // ── Group 2 ──
    { id: "supermanNew52AzureDepths",     name: "Azure Depths",     unlockLevel: 0, portrait: "./superman_new52_portrait__azuredepths.png",     spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "azuredepths") },
    { id: "supermanNew52VioletEclipse",   name: "Violet Eclipse",   unlockLevel: 0, portrait: "./superman_new52_portrait__violeteclipse.png",   spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "violeteclipse") },
    { id: "supermanNew52Frostbound",      name: "Frostbound Kryptonian", unlockLevel: 0, portrait: "./superman_new52_portrait__frostbound.png", spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "frostbound") },
    { id: "supermanNew52Ashfall",         name: "Ashfall Sentinel",  unlockLevel: 0, portrait: "./superman_new52_portrait__ashfall.png",        spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "ashfall") },
    // ── Specialty ──
    { id: "supermanNew52VoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./superman_new52_portrait__voidsovereign.png",   spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "voidsovereign") },
    { id: "supermanNew52KingdomCome",     name: "Kingdom Come",     unlockLevel: 0, portrait: "./superman_new52_portrait__kingdomcome.png",     spriteScale: characters.superman_new52?.spriteScale, animationData: recolorSkinAnim("superman_new52", "kingdomcome") }
  ],

  // Superman (Classic / SNES JLTF) — rosterKey "superman_classic". Same gate: WITHOUT a default skin, applySkin()
  // pulls the getSkins() spriteScale:1 fallback and he renders at native ~half size. Sources real spriteScale
  // (1.2) + portrait from the character. STAGE 1 — template 10-skin set lands with the roster-wide Superman skin
  // pass (★Classic HAS the red-trunks region → KEEP it in the skin template, unlike New 52).
  superman_classic: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.superman_classic?.portrait, spriteScale: characters.superman_classic?.spriteScale, animationData: null },
    // ── Group 1 ── (tools/gen_superman_skins.py superman_classic — same template; ★Classic HAS trunks → the
    // "cape/trunks/boots" group recolors all three together, as the prompt intends.)
    { id: "supermanClassicCrimsonReversal", name: "Crimson Reversal", unlockLevel: 0, portrait: "./superman_classic_portrait__crimsonreversal.png", spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "crimsonreversal") },
    { id: "supermanClassicVerdantGuardian", name: "Verdant Guardian", unlockLevel: 0, portrait: "./superman_classic_portrait__verdantguardian.png", spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "verdantguardian") },
    { id: "supermanClassicObsidianSteel",   name: "Obsidian Steel",   unlockLevel: 0, portrait: "./superman_classic_portrait__obsidiansteel.png",   spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "obsidiansteel") },
    { id: "supermanClassicGoldenSentinel",  name: "Golden Sentinel",  unlockLevel: 0, portrait: "./superman_classic_portrait__goldensentinel.png",  spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "goldensentinel") },
    // ── Group 2 ──
    { id: "supermanClassicAzureDepths",     name: "Azure Depths",     unlockLevel: 0, portrait: "./superman_classic_portrait__azuredepths.png",     spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "azuredepths") },
    { id: "supermanClassicVioletEclipse",   name: "Violet Eclipse",   unlockLevel: 0, portrait: "./superman_classic_portrait__violeteclipse.png",   spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "violeteclipse") },
    { id: "supermanClassicFrostbound",      name: "Frostbound Kryptonian", unlockLevel: 0, portrait: "./superman_classic_portrait__frostbound.png", spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "frostbound") },
    { id: "supermanClassicAshfall",         name: "Ashfall Sentinel",  unlockLevel: 0, portrait: "./superman_classic_portrait__ashfall.png",        spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "ashfall") },
    // ── Specialty ──
    { id: "supermanClassicVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./superman_classic_portrait__voidsovereign.png",   spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "voidsovereign") },
    { id: "supermanClassicKingdomCome",     name: "Kingdom Come",     unlockLevel: 0, portrait: "./superman_classic_portrait__kingdomcome.png",     spriteScale: characters.superman_classic?.spriteScale, animationData: recolorSkinAnim("superman_classic", "kingdomcome") }
  ],

  // Superman (Fighter) — rosterKey "superman_fighter". Same roster-wide 10-skin template, applied INDEPENDENTLY
  // to its own dcna8ch-derived sheets (grey-keyed). ★Fighter HAS trunks (all-red follows the cape). WITHOUT a
  // default skin, applySkin() pulls the getSkins() spriteScale:1 fallback.
  superman_fighter: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.superman_fighter?.portrait, spriteScale: characters.superman_fighter?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "supermanFighterCrimsonReversal", name: "Crimson Reversal", unlockLevel: 0, portrait: "./superman_fighter_portrait__crimsonreversal.png", spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "crimsonreversal") },
    { id: "supermanFighterVerdantGuardian", name: "Verdant Guardian", unlockLevel: 0, portrait: "./superman_fighter_portrait__verdantguardian.png", spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "verdantguardian") },
    { id: "supermanFighterObsidianSteel",   name: "Obsidian Steel",   unlockLevel: 0, portrait: "./superman_fighter_portrait__obsidiansteel.png",   spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "obsidiansteel") },
    { id: "supermanFighterGoldenSentinel",  name: "Golden Sentinel",  unlockLevel: 0, portrait: "./superman_fighter_portrait__goldensentinel.png",  spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "goldensentinel") },
    // ── Group 2 ──
    { id: "supermanFighterAzureDepths",     name: "Azure Depths",     unlockLevel: 0, portrait: "./superman_fighter_portrait__azuredepths.png",     spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "azuredepths") },
    { id: "supermanFighterVioletEclipse",   name: "Violet Eclipse",   unlockLevel: 0, portrait: "./superman_fighter_portrait__violeteclipse.png",   spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "violeteclipse") },
    { id: "supermanFighterFrostbound",      name: "Frostbound Kryptonian", unlockLevel: 0, portrait: "./superman_fighter_portrait__frostbound.png", spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "frostbound") },
    { id: "supermanFighterAshfall",         name: "Ashfall Sentinel",  unlockLevel: 0, portrait: "./superman_fighter_portrait__ashfall.png",        spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "ashfall") },
    // ── Specialty ──
    { id: "supermanFighterVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./superman_fighter_portrait__voidsovereign.png",   spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "voidsovereign") },
    { id: "supermanFighterKingdomCome",     name: "Kingdom Come",     unlockLevel: 0, portrait: "./superman_fighter_portrait__kingdomcome.png",     spriteScale: characters.superman_fighter?.spriteScale, animationData: recolorSkinAnim("superman_fighter", "kingdomcome") }
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

  // Maki Zenin — Default only (creative skins land in a later stage). MUST exist: without a
  // SKINS entry, getSkins() falls back to a synthesized default carrying spriteScale:1, which
  // applySkin would stamp onto the fighter and override maki.spriteScale (1.63) → 1.
  // Maki — ONLY Default + Void Hunter (the 12 flat-recolor batch and the "Ultimate: Covered" variant were
  // removed by request). The Shibuya (Ultimate) form is now GORE-FREE for EVERY skin by default (the
  // covered-arms art is the base Shibuya art itself — see abilities.MAKI_SHIBUYA_ANIM — not an opt-in skin).
  // Toji Fushiguro — Default only for now (creative skins are a later, optional task). This entry
  // exists so getSkin("toji","default") carries his spriteScale (1.71) — without it applySkin would
  // stamp the fallback spriteScale 1 onto the fighter and he'd render at native ~65px (too short).
  // Baki Hanma (Baki the Grappler). No recolor batch yet — but this ONE default entry is REQUIRED:
  // without a SKINS[baki] entry, getSkins() returns the spriteScale:1 fallback and applySkin() clobbers
  // his char spriteScale (1.9) → he renders at native ~54px (half size). Same fix as Yuji/Goku/Naruto.
  baki: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.baki?.portrait, spriteScale: characters.baki?.spriteScale, animationData: null },
  ],

  toji: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.toji?.portrait, spriteScale: characters.toji?.spriteScale, animationData: null },
    // 12 creative recolor skins (tools/gen_toji_creative.py) — HAIR + TANK TOP + PANTS coordinated per-region,
    // near-black hair/tank spatially split, line-art outlines preserved, face/skin excluded. Cosmetic only.
    // ── Group 1 ──
    { id: "tojiPrime",         name: "Prime Variant",     unlockLevel: 0, portrait: recolorPortrait("toji", "prime"),         spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "prime") },          // Rick-Prime homage: pale silver-blue hair / deep navy-black tank / dark gray pants
    { id: "tojiRoyalValkyrie", name: "Royal Valkyrie",    unlockLevel: 0, portrait: recolorPortrait("toji", "royalvalkyrie"), spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "royalvalkyrie") },  // Beyblade: royal-blue hair / black tank / gold pants trim
    { id: "tojiMirageWyrm",    name: "Mirage Wyrm",       unlockLevel: 0, portrait: recolorPortrait("toji", "miragewyrm"),    spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "miragewyrm") },     // Beyblade: deep navy-purple hair / black tank / teal-cyan accent trim
    { id: "tojiCrimsonFang",   name: "Crimson Fang",      unlockLevel: 0, portrait: recolorPortrait("toji", "crimsonfang"),   spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "crimsonfang") },   // deep red hair / black tank / dark red pants
    // ── Group 2 ──
    { id: "tojiCobaltKiller",  name: "Cobalt Killer",     unlockLevel: 0, portrait: recolorPortrait("toji", "cobaltkiller"),  spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "cobaltkiller") },  // deep blue hair / black tank / silver pants
    { id: "tojiEmeraldRonin",  name: "Emerald Ronin",     unlockLevel: 0, portrait: recolorPortrait("toji", "emeraldronin"),  spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "emeraldronin") },  // deep green hair / black tank / dark green pants
    { id: "tojiAmethystBlade", name: "Amethyst Blade",    unlockLevel: 0, portrait: recolorPortrait("toji", "amethystblade"), spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "amethystblade") }, // deep purple hair / black tank / violet pants trim
    { id: "tojiAshenVeteran",  name: "Ashen Veteran",     unlockLevel: 0, portrait: recolorPortrait("toji", "ashenveteran"),  spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "ashenveteran") },  // muted gray hair / charcoal tank / gray pants (battle-worn)
    // ── Group 3 ──
    { id: "tojiIvoryReaper",   name: "Ivory Reaper",      unlockLevel: 0, portrait: recolorPortrait("toji", "ivoryreaper"),   spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "ivoryreaper") },   // white/pale hair / white tank / black pants
    { id: "tojiGoldenMerc",    name: "Golden Mercenary",  unlockLevel: 0, portrait: recolorPortrait("toji", "goldenmerc"),    spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "goldenmerc") },    // rich gold hair / black tank / cream pants trim
    { id: "tojiTealPhantom",   name: "Teal Phantom",      unlockLevel: 0, portrait: recolorPortrait("toji", "tealphantom"),   spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "tealphantom") },   // deep teal hair / black tank / dark teal pants
    // Void Killer: full near-black base (hair+tank+pants) + procedural drifting deep-red particles (game.js drawTojiVoidOverlay, gated on this skinId)
    { id: "tojiVoidKiller",    name: "Void Killer",       unlockLevel: 0, portrait: recolorPortrait("toji", "voidkiller"),    spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "voidkiller") },
    // ADDITIVE — 4 procedural-pattern skins on the outfit (Void Killer already exists, not duplicated); hair+tank+pants coordinated
    { id: "tojiStripeMercenary", name: "Stripe Mercenary", unlockLevel: 0, portrait: "./toji_portrait__tojiStripeMercenary.png", spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "tojiStripeMercenary") },
    { id: "tojiShatteredBlade", name: "Shattered Blade", unlockLevel: 0, portrait: "./toji_portrait__tojiShatteredBlade.png", spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "tojiShatteredBlade") },
    { id: "tojiScaleMail", name: "Scale Mail", unlockLevel: 0, portrait: "./toji_portrait__tojiScaleMail.png", spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "tojiScaleMail") },
    { id: "tojiMarbledVeteran", name: "Marbled Veteran", unlockLevel: 0, portrait: "./toji_portrait__tojiMarbledVeteran.png", spriteScale: characters.toji?.spriteScale, animationData: recolorSkinAnim("toji", "tojiMarbledVeteran") }
  ],
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.green_samurai_ranger?.portrait, spriteScale: characters.green_samurai_ranger?.spriteScale, animationData: null },
    { id: "green_samurai_crimson", name: "Crimson", unlockLevel: 2, portrait: characters.green_samurai_ranger?.portrait, spriteScale: characters.green_samurai_ranger?.spriteScale, animationData: null, skinTint: "#cf4a3f", tintStrength: 0.4 },   // Stage 23 auto-palette
    { id: "green_samurai_azure",   name: "Azure",   unlockLevel: 4, portrait: characters.green_samurai_ranger?.portrait, spriteScale: characters.green_samurai_ranger?.spriteScale, animationData: null, skinTint: "#3f7fcf", tintStrength: 0.4 }
  ],
  // Red Ranger (Jason, MMPR). Default + a 4-skin PILOT batch of PROCEDURAL-PATTERN skins (tools/
  // gen_red_ranger_creative.py) — proving the recolor pipeline can do multi-colour patterns within a
  // region (gradient / stripes / marble / diamonds), not just flat fills. spriteScale carried so applySkin
  // doesn't fall back to the synthetic {spriteScale:1} default. Cosmetic only; no recolorTag (no Mega tier).
  red_ranger_mmpr: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.red_ranger_mmpr?.portrait, spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: null },
    { id: "rr_twilight",  name: "Twilight Fade",  unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_twilight.png",  spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_twilight") },
    { id: "rr_racer",     name: "Circuit Racer",  unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_racer.png",     spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_racer") },
    { id: "rr_magma",     name: "Magma Marble",   unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_magma.png",     spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_magma") },
    { id: "rr_harlequin", name: "Harlequin",      unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_harlequin.png", spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_harlequin") },
    // Round 2 — 4 more distinct pattern SHAPES (organic marble / circuit line-work / V-chevrons / Voronoi fracture)
    { id: "rr_steel",     name: "Marbled Steel",  unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_steel.png",     spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_steel") },
    { id: "rr_circuit",   name: "Circuit Pulse",  unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_circuit.png",   spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_circuit") },
    { id: "rr_chevron",   name: "Chevron Strike", unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_chevron.png",   spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_chevron") },
    { id: "rr_shatter",   name: "Shattered Core", unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_shatter.png",   spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_shatter") },
    // Round 3 closeout — hard diagonal halftone split + dense fish-scale micro-pattern
    { id: "rr_eclipse",   name: "Eclipse Half-tone", unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_eclipse.png",   spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_eclipse") },
    { id: "rr_scale",     name: "Scale Mail",       unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_scale.png",     spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_scale") },
    // Void (Alien-X style) — near-black base + game.js drawMorpherVoidOverlay (morpher-red particles + morph-flash pulse-rings)
    { id: "rr_void",      name: "Morpher Void",     unlockLevel: 0, portrait: "./red_ranger_mmpr_portrait__rr_void.png",      spriteScale: characters.red_ranger_mmpr?.spriteScale, animationData: recolorSkinAnim("red_ranger_mmpr", "rr_void") }
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.omniman?.portrait, spriteScale: characters.omniman?.spriteScale, animationData: null },
    { id: "omniman_crimson", name: "Crimson", unlockLevel: 2, portrait: characters.omniman?.portrait, spriteScale: characters.omniman?.spriteScale, animationData: null, skinTint: "#cf4a3f", tintStrength: 0.4 },   // Stage 23 auto-palette
    { id: "omniman_azure",   name: "Azure",   unlockLevel: 4, portrait: characters.omniman?.portrait, spriteScale: characters.omniman?.spriteScale, animationData: null, skinTint: "#3f7fcf", tintStrength: 0.4 }
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.ben10?.portrait, spriteScale: characters.ben10?.spriteScale, animationData: null },
    { id: "ben10_crimson", name: "Crimson", unlockLevel: 2, portrait: characters.ben10?.portrait, spriteScale: characters.ben10?.spriteScale, animationData: null, skinTint: "#cf4a3f", tintStrength: 0.4 },   // Stage 23 auto-palette
    { id: "ben10_azure",   name: "Azure",   unlockLevel: 4, portrait: characters.ben10?.portrait, spriteScale: characters.ben10?.spriteScale, animationData: null, skinTint: "#3f7fcf", tintStrength: 0.4 }
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
  // Jason Voorhees — Default + 13 DESATURATED/GROUNDED creative skins (aged/weathered/bloodied/homage),
  // generated by tools/gen_jason_creative.py (3-region recolor: jacket/pants · hockey mask · skin patches).
  // Cosmetic only. Nightmare Void = full-black body + game.js drawJasonVoidAuraOverlay (crimson motes + eyes).
  jason: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.jason?.portrait, spriteScale: characters.jason?.spriteScale, animationData: null },
    { id: "jason_weathered", name: "Weathered Mask",     unlockLevel: 0, portrait: "./jason_portrait__weathered.png", spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "weathered"), recolorTag: "weathered" },
    { id: "jason_bloodbath", name: "Bloodbath",          unlockLevel: 0, portrait: "./jason_portrait__bloodbath.png", spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "bloodbath"), recolorTag: "bloodbath" },
    { id: "jason_burlap",    name: "Burlap Sack",         unlockLevel: 0, portrait: "./jason_portrait__burlap.png",    spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "burlap"),    recolorTag: "burlap" },
    { id: "jason_midnight",  name: "Midnight Stalker",    unlockLevel: 0, portrait: "./jason_portrait__midnight.png",  spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "midnight"),  recolorTag: "midnight" },
    { id: "jason_toxic",     name: "Toxic Revenant",      unlockLevel: 0, portrait: "./jason_portrait__toxic.png",     spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "toxic"),     recolorTag: "toxic" },
    { id: "jason_counselor", name: "Camp Counselor Red",  unlockLevel: 0, portrait: "./jason_portrait__counselor.png", spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "counselor"), recolorTag: "counselor" },
    { id: "jason_ashen",     name: "Ashen",               unlockLevel: 0, portrait: "./jason_portrait__ashen.png",     spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "ashen"),     recolorTag: "ashen" },
    { id: "jason_frozen",    name: "Frozen Lake",         unlockLevel: 0, portrait: "./jason_portrait__frozen.png",    spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "frozen"),    recolorTag: "frozen" },
    { id: "jason_steel",     name: "Steel Reaper",        unlockLevel: 0, portrait: "./jason_portrait__steel.png",     spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "steel"),     recolorTag: "steel" },
    { id: "jason_crimson",   name: "Crimson Harvest",     unlockLevel: 0, portrait: "./jason_portrait__crimson.png",   spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "crimson"),   recolorTag: "crimson" },
    { id: "jason_shadow",    name: "Shadow Puppet",       unlockLevel: 0, portrait: "./jason_portrait__shadow.png",    spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "shadow"),    recolorTag: "shadow" },
    { id: "jason_bone",      name: "Old Bone",            unlockLevel: 0, portrait: "./jason_portrait__bone.png",      spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "bone"),      recolorTag: "bone" },
    { id: "jasonNightmareVoid", name: "Nightmare Void",   unlockLevel: 0, portrait: "./jason_portrait__void.png",      spriteScale: characters.jason?.spriteScale, animationData: recolorSkinAnim("jason", "void"),      recolorTag: "void" },
  ],
  // Isshiki Otsutsuki — Default + 13 creative skins (tools/gen_isshiki_creative.py, 3-region recolor:
  // robe near-black / crimson trim / pale hair-skin). Cosmetic only. Void Sovereign = full black-on-black
  // body + game.js drawIsshikiVoidAuraOverlay (crimson Karma motes + red eyes), gated on id isshikiVoidSovereign.
  // Hiruzen — Default + 13 creative skins (tools/gen_hiruzen_creative.py). His combat body is near-black/grey,
  // so each skin is a VALUE-PRESERVING recolor of the garb (keeping the warm-orange face). Skins 1-4 are the
  // reverse-engineered color_palletts.png swatch palettes (single-pose refs → applied to the FULL animation
  // set); 5-13 are new palettes. Eternal Vigil Void = full-black silhouette + game.js drawHiruzenVoidAuraOverlay
  // (Alien-X amber-gold particle aura, gated on skinId). Cosmetic only; the default entry carries spriteScale 2.8.
  // Orochimaru (universe: naruto) — Default + 13 creative skins (tools/gen_orochimaru_creative.py). BASE
  // FORM ONLY — the 3 alternate FORMS (Host/White Snake/Serpent Sage) keep their own confirmed palettes and
  // are NOT touched. Value-preserving 3-region recolor: ROBE (the grey/navy darks) mapped by luminance onto
  // a per-skin ramp (the primary target); SKIN (pale beige) + HAIR (near-black) protected — EXCEPT the two
  // tone-change skins #2 Pale Recluse / #8 White Snake Sage (whitened skin). Umbral Serpent = full-black
  // silhouette + game.js drawOrochimaruVoidAuraOverlay (violet snake aura + glowing yellow eyes), gated on id.
  // Cosmetic only; the default entry carries spriteScale 2.6.
  orochimaru: [
    { id: "default",                  name: "Default",             unlockLevel: 0, portrait: characters.orochimaru?.portrait,                        spriteScale: characters.orochimaru?.spriteScale, animationData: null },
    { id: "orochimaru_sound_serpent",     name: "Sound Serpent",       unlockLevel: 0, portrait: recolorPortrait("orochimaru", "sound_serpent"),     spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "sound_serpent"),     recolorTag: "sound_serpent" },
    { id: "orochimaru_pale_recluse",      name: "Pale Recluse",        unlockLevel: 0, portrait: recolorPortrait("orochimaru", "pale_recluse"),      spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "pale_recluse"),      recolorTag: "pale_recluse" },
    { id: "orochimaru_crimson_sannin",    name: "Crimson Sannin",      unlockLevel: 0, portrait: recolorPortrait("orochimaru", "crimson_sannin"),    spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "crimson_sannin"),    recolorTag: "crimson_sannin" },
    { id: "orochimaru_venom",             name: "Venom",               unlockLevel: 0, portrait: recolorPortrait("orochimaru", "venom"),             spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "venom"),             recolorTag: "venom" },
    { id: "orochimaru_cursed_seal",       name: "Cursed Seal",         unlockLevel: 0, portrait: recolorPortrait("orochimaru", "cursed_seal"),       spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "cursed_seal"),       recolorTag: "cursed_seal" },
    { id: "orochimaru_manda_scales",      name: "Manda Scales",        unlockLevel: 0, portrait: recolorPortrait("orochimaru", "manda_scales"),      spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "manda_scales"),      recolorTag: "manda_scales" },
    { id: "orochimaru_akatsuki_defector", name: "Akatsuki Defector",   unlockLevel: 0, portrait: recolorPortrait("orochimaru", "akatsuki_defector"), spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "akatsuki_defector"), recolorTag: "akatsuki_defector" },
    { id: "orochimaru_white_snake_sage",  name: "White Snake Sage",    unlockLevel: 0, portrait: recolorPortrait("orochimaru", "white_snake_sage"),  spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "white_snake_sage"),  recolorTag: "white_snake_sage" },
    { id: "orochimaru_edo_reanimation",   name: "Edo Reanimation",     unlockLevel: 0, portrait: recolorPortrait("orochimaru", "edo_reanimation"),   spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "edo_reanimation"),   recolorTag: "edo_reanimation" },
    { id: "orochimaru_amethyst_coil",     name: "Amethyst Coil",       unlockLevel: 0, portrait: recolorPortrait("orochimaru", "amethyst_coil"),     spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "amethyst_coil"),     recolorTag: "amethyst_coil" },
    { id: "orochimaru_jade_serpent",      name: "Jade Serpent",        unlockLevel: 0, portrait: recolorPortrait("orochimaru", "jade_serpent"),      spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "jade_serpent"),      recolorTag: "jade_serpent" },
    { id: "orochimaru_forbidden_gold",    name: "Forbidden Gold",      unlockLevel: 0, portrait: recolorPortrait("orochimaru", "forbidden_gold"),    spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "forbidden_gold"),    recolorTag: "forbidden_gold" },
    { id: "orochimaruUmbralVoid",         name: "Umbral Serpent",      unlockLevel: 0, portrait: recolorPortrait("orochimaru", "umbral_serpent"),    spriteScale: characters.orochimaru?.spriteScale, animationData: recolorSkinAnim("orochimaru", "umbral_serpent"),    recolorTag: "umbral_serpent" },
  ],
  hiruzen: [
    { id: "default",               name: "Default",              unlockLevel: 0, portrait: characters.hiruzen?.portrait,           spriteScale: characters.hiruzen?.spriteScale, animationData: null },
    { id: "hiruzenShadowOperative", name: "Shadow Operative",    unlockLevel: 0, portrait: recolorPortrait("hiruzen", "shadow_operative"), spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "shadow_operative"), recolorTag: "shadow_operative" },
    { id: "hiruzenEarthenSage",    name: "Earthen Sage",         unlockLevel: 0, portrait: recolorPortrait("hiruzen", "earthen_sage"),     spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "earthen_sage"),     recolorTag: "earthen_sage" },
    { id: "hiruzenSilverVeteran",  name: "Silver Veteran",       unlockLevel: 0, portrait: recolorPortrait("hiruzen", "silver_veteran"),   spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "silver_veteran"),   recolorTag: "silver_veteran" },
    { id: "hiruzenCrimsonWill",    name: "Crimson Will",         unlockLevel: 0, portrait: recolorPortrait("hiruzen", "crimson_will"),     spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "crimson_will"),     recolorTag: "crimson_will" },
    { id: "hiruzenThirdHokage",    name: "Third Hokage's Mantle", unlockLevel: 0, portrait: recolorPortrait("hiruzen", "third_hokage"),    spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "third_hokage"),     recolorTag: "third_hokage" },
    { id: "hiruzenWillOfFire",     name: "Will of Fire",         unlockLevel: 0, portrait: recolorPortrait("hiruzen", "will_of_fire"),     spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "will_of_fire"),     recolorTag: "will_of_fire" },
    { id: "hiruzenProfessor",      name: "The Professor",        unlockLevel: 0, portrait: recolorPortrait("hiruzen", "the_professor"),    spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "the_professor"),    recolorTag: "the_professor" },
    { id: "hiruzenYouthfulWar",    name: "Youthful War Years",   unlockLevel: 0, portrait: recolorPortrait("hiruzen", "youthful_war"),     spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "youthful_war"),     recolorTag: "youthful_war" },
    { id: "hiruzenEnmasBond",      name: "Enma's Bond",          unlockLevel: 0, portrait: recolorPortrait("hiruzen", "enmas_bond"),       spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "enmas_bond"),       recolorTag: "enmas_bond" },
    { id: "hiruzenAshesKonoha",    name: "Ashes of Konoha",      unlockLevel: 0, portrait: recolorPortrait("hiruzen", "ashes_konoha"),     spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "ashes_konoha"),     recolorTag: "ashes_konoha" },
    { id: "hiruzenLeafsGuardian",  name: "Leaf's Guardian",      unlockLevel: 0, portrait: recolorPortrait("hiruzen", "leafs_guardian"),   spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "leafs_guardian"),   recolorTag: "leafs_guardian" },
    { id: "hiruzenSarutobiElder",  name: "Sarutobi Elder",       unlockLevel: 0, portrait: recolorPortrait("hiruzen", "sarutobi_elder"),   spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "sarutobi_elder"),   recolorTag: "sarutobi_elder" },
    { id: "hiruzenEternalVoid",    name: "Eternal Vigil Void",   unlockLevel: 0, portrait: recolorPortrait("hiruzen", "eternal_void"),     spriteScale: characters.hiruzen?.spriteScale, animationData: recolorSkinAnim("hiruzen", "eternal_void"),     recolorTag: "eternal_void" },
  ],
  isshiki: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.isshiki?.portrait, spriteScale: characters.isshiki?.spriteScale, animationData: null },
    { id: "isshiki_azure",    name: "Karma Azure",        unlockLevel: 0, portrait: "./isshiki_portrait__azure.png",    spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "azure"),    recolorTag: "azure" },
    { id: "isshiki_golden",   name: "Golden Otsutsuki",   unlockLevel: 0, portrait: "./isshiki_portrait__golden.png",   spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "golden"),   recolorTag: "golden" },
    { id: "isshiki_violet",   name: "Ten-Tails Violet",   unlockLevel: 0, portrait: "./isshiki_portrait__violet.png",   spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "violet"),   recolorTag: "violet" },
    { id: "isshiki_emerald",  name: "Emerald Kama",       unlockLevel: 0, portrait: "./isshiki_portrait__emerald.png",  spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "emerald"),  recolorTag: "emerald" },
    { id: "isshiki_toxic",    name: "Toxic Sage",         unlockLevel: 0, portrait: "./isshiki_portrait__toxic.png",    spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "toxic"),    recolorTag: "toxic" },
    { id: "isshiki_frost",    name: "Frost Otsutsuki",    unlockLevel: 0, portrait: "./isshiki_portrait__frost.png",    spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "frost"),    recolorTag: "frost" },
    { id: "isshiki_ivory",    name: "Celestial Ivory",    unlockLevel: 0, portrait: "./isshiki_portrait__ivory.png",    spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "ivory"),    recolorTag: "ivory" },
    { id: "isshiki_obsidian", name: "Obsidian Gold",      unlockLevel: 0, portrait: "./isshiki_portrait__obsidian.png", spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "obsidian"), recolorTag: "obsidian" },
    { id: "isshiki_ashen",    name: "Ashen Revenant",     unlockLevel: 0, portrait: "./isshiki_portrait__ashen.png",    spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "ashen"),    recolorTag: "ashen" },
    { id: "isshiki_steel",    name: "Steel Reaper",       unlockLevel: 0, portrait: "./isshiki_portrait__steel.png",    spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "steel"),    recolorTag: "steel" },
    { id: "isshiki_sanguine", name: "Sanguine Sovereign", unlockLevel: 0, portrait: "./isshiki_portrait__sanguine.png", spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "sanguine"), recolorTag: "sanguine" },
    { id: "isshiki_jigen",    name: "Jigen Ash",          unlockLevel: 0, portrait: "./isshiki_portrait__jigen.png",    spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "jigen"),    recolorTag: "jigen" },
    { id: "isshikiVoidSovereign", name: "Void Sovereign", unlockLevel: 0, portrait: "./isshiki_portrait__void.png",     spriteScale: characters.isshiki?.spriteScale, animationData: recolorSkinAnim("isshiki", "void"),     recolorTag: "void" },
  ],
  // Genos (One Punch Man) — Default + 10 creative skins (tools/gen_genos_creative.py). FOUR recolor regions
  // (SHIRT-black / cyborg-ARMS-silver / PANTS-navy / HAIR-blond), measured from the wired uniform sheets.
  // ★OWNER DECISION: aggressively recolor the whole black shirt → the pass targets all dark-neutral, so the
  // OUTLINE + eye-sclera take the shirt colour too (accepted tradeoff — the shirt IS the outline black).
  // The yellow/white charged-blast + beam FX are load-bearing and NEVER touched (arm val-cap + hair sat-cap
  // protect them — verified 0.0% FX px changed). Cosmetic only, zero gameplay. Void Sovereign = whole-form
  // near-black (incl. skin) + game.js drawGenosVoidAuraOverlay (cybernetic circuit/data-lines). Exposed Core
  // = near-default sheets + game.js drawGenosExposedCoreOverlay (glowing chest energy-core homage).
  genos: [
    { id: "default",             name: "Default",           unlockLevel: 0, portrait: characters.genos?.portrait,                     spriteScale: characters.genos?.spriteScale, animationData: null },
    { id: "genosCrimsonChassis", name: "Crimson Chassis",   unlockLevel: 0, portrait: "./genos_portrait__crimsonchassis.png",         spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "crimsonchassis"),   recolorTag: "crimsonchassis" },
    { id: "genosVerdantCircuit", name: "Verdant Circuit",   unlockLevel: 0, portrait: "./genos_portrait__verdantcircuit.png",         spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "verdantcircuit"),   recolorTag: "verdantcircuit" },
    { id: "genosGoldenAlloy",    name: "Golden Alloy",      unlockLevel: 0, portrait: "./genos_portrait__goldenalloy.png",            spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "goldenalloy"),     recolorTag: "goldenalloy" },
    { id: "genosObsidianFrame",  name: "Obsidian Frame",    unlockLevel: 0, portrait: "./genos_portrait__obsidianframe.png",          spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "obsidianframe"),    recolorTag: "obsidianframe" },
    { id: "genosAzureCybernetic",name: "Azure Cybernetic",  unlockLevel: 0, portrait: "./genos_portrait__azurecybernetic.png",        spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "azurecybernetic"),  recolorTag: "azurecybernetic" },
    { id: "genosVioletPrototype",name: "Violet Prototype",  unlockLevel: 0, portrait: "./genos_portrait__violetprototype.png",        spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "violetprototype"),  recolorTag: "violetprototype" },
    { id: "genosEmberUnit",      name: "Ember Unit",        unlockLevel: 0, portrait: "./genos_portrait__emberunit.png",              spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "emberunit"),       recolorTag: "emberunit" },
    { id: "genosFrostbound",     name: "Frostbound Chassis",unlockLevel: 0, portrait: "./genos_portrait__frostboundchassis.png",      spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "frostboundchassis"),recolorTag: "frostboundchassis" },
    { id: "genosVoidSovereign",  name: "Void Sovereign",    unlockLevel: 0, portrait: "./genos_portrait__void.png",                   spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "void"),            recolorTag: "void" },
    { id: "genosExposedCore",    name: "Exposed Core",      unlockLevel: 0, portrait: "./genos_portrait__exposedcore.png",            spriteScale: characters.genos?.spriteScale, animationData: recolorSkinAnim("genos", "exposedcore"),     recolorTag: "exposedcore" }
  ],
  // Frieza (Dragon Ball, base/final form) — Default + 10 palette skins (tools/gen_frieza_creative.py). FOUR
  // classified regions (BODY = white shell + cyan-teal shading / ACCENT = purple plates / EYE = red / OUTLINE),
  // luminance-ramp recoloured per skin (region masks verified crisp). ★Golden Frieza & Black Frieza are NOT
  // skins and never appear here — they are real gameplay TRANSFORMATIONS (charge-triggered energy-drain tiers;
  // see characters.js frieza.transformations + abilities.js enterGoldenFrieza/enterBlackFrieza). The 10 below
  // are cosmetic only, zero gameplay. Void = full near-black + game.js drawFriezaVoidAuraOverlay; Mecha =
  // canon cybernetic silver plating. The default entry is REQUIRED so applySkin() pulls spriteScale.
  frieza: [
    { id: "default",                name: "Default",             unlockLevel: 0, portrait: characters.frieza?.portrait,                       spriteScale: characters.frieza?.spriteScale, animationData: null },
    // ── GROUP 1 ──
    { id: "friezaCrimsonTyrant",    name: "Crimson Tyrant",      unlockLevel: 0, portrait: "./frieza_portrait__crimsontyrant.png",           spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "crimsontyrant"),    recolorTag: "crimsontyrant" },
    { id: "friezaVerdantOverlord",  name: "Verdant Overlord",    unlockLevel: 0, portrait: "./frieza_portrait__verdantoverlord.png",         spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "verdantoverlord"),  recolorTag: "verdantoverlord" },
    { id: "friezaAzureConqueror",   name: "Azure Conqueror",     unlockLevel: 0, portrait: "./frieza_portrait__azureconqueror.png",          spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "azureconqueror"),   recolorTag: "azureconqueror" },
    { id: "friezaObsidianEmperor",  name: "Obsidian Emperor",    unlockLevel: 0, portrait: "./frieza_portrait__obsidianemperor.png",         spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "obsidianemperor"),  recolorTag: "obsidianemperor" },
    // ── GROUP 2 ──
    { id: "friezaVioletReborn",     name: "Violet Reborn",       unlockLevel: 0, portrait: "./frieza_portrait__violetreborn.png",           spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "violetreborn"),     recolorTag: "violetreborn" },
    { id: "friezaEmberTyrant",      name: "Ember Tyrant",        unlockLevel: 0, portrait: "./frieza_portrait__embertyrant.png",            spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "embertyrant"),      recolorTag: "embertyrant" },
    { id: "friezaFrostboundOverlord", name: "Frostbound Overlord", unlockLevel: 0, portrait: "./frieza_portrait__frostboundoverlord.png",   spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "frostboundoverlord"), recolorTag: "frostboundoverlord" },
    { id: "friezaAshenTyrant",      name: "Ashen Tyrant",        unlockLevel: 0, portrait: "./frieza_portrait__ashentyrant.png",            spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "ashentyrant"),      recolorTag: "ashentyrant" },
    // ── SPECIALTY (replace the removed Golden/Black slots) ──
    { id: "friezaVoidSovereign",    name: "Void Sovereign",      unlockLevel: 0, portrait: "./frieza_portrait__void.png",                   spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "void"),            recolorTag: "void" },   // + procedural cosmic/void particles (game.js drawFriezaVoidAuraOverlay, gated on this id)
    { id: "friezaMecha",            name: "Mecha Frieza",        unlockLevel: 0, portrait: "./frieza_portrait__mecha.png",                  spriteScale: characters.frieza?.spriteScale, animationData: recolorSkinAnim("frieza", "mecha"),           recolorTag: "mecha" }
  ],
  // Piccolo (Dragon Ball, Extreme Butoden) — Default + 8 coordinated recolors + Void Sovereign + Kami homage
  // (tools/gen_piccolo_creative.py). ★HEALTH-CHECKED: GI(purple/magenta) is the DOMINANT garment (top+pants,
  // ~50-65%) → primary theme; green SKIN protected except mono/frost/Void/Kami; light CAPE/turban kept white on
  // colour skins; brown BOOTS = accent. ★RESERVED: Piccolo already has a real ORANGE PICCOLO transform, so Ember
  // Namekian leans WARM-RED (not orange) and no orange skin is offered. The base→Potential-Unleashed→Orange
  // transform is a runtime sprite.js canvas WASH (not sheets) → stacks over a skin cosmetically, no per-form
  // recolor needed. Cross-checked vs Teen Gohan's set (shared purple-gi/Namekian language): distinct base
  // sprite + Piccolo keeps green skin (Gohan is human-tan) → no near-duplicate.
  piccolo: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.piccolo?.portrait, spriteScale: characters.piccolo?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "piccoloCrimsonNamekian", name: "Crimson Namekian", unlockLevel: 0, portrait: "./piccolo_portrait__crimsonnamekian.png", spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "crimsonnamekian") },   // red gi / green skin
    { id: "piccoloVerdantElder",    name: "Verdant Elder",    unlockLevel: 0, portrait: "./piccolo_portrait__verdantelder.png",    spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "verdantelder") },      // deep forest-green gi
    { id: "piccoloObsidianNamekian",name: "Obsidian Namekian",unlockLevel: 0, portrait: "./piccolo_portrait__obsidiannamekian.png",spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "obsidiannamekian") },  // monochrome charcoal/grey (incl. skin)
    { id: "piccoloGoldenNamekian",  name: "Golden Namekian",  unlockLevel: 0, portrait: "./piccolo_portrait__goldennamekian.png",  spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "goldennamekian") },    // gold gi / green skin
    // ── Group 2 ──
    { id: "piccoloAzureNamekian",   name: "Azure Namekian",   unlockLevel: 0, portrait: "./piccolo_portrait__azurenamekian.png",   spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "azurenamekian") },     // blue gi / green skin
    { id: "piccoloVioletReborn",    name: "Violet Reborn",    unlockLevel: 0, portrait: "./piccolo_portrait__violetreborn.png",    spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "violetreborn") },      // richer blue-violet gi (distinct from default magenta + reserved Orange Piccolo)
    { id: "piccoloFrostboundNamekian", name: "Frostbound Namekian", unlockLevel: 0, portrait: "./piccolo_portrait__frostboundnamekian.png", spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "frostboundnamekian") }, // ice-white/blue (light outlier, pale skin)
    { id: "piccoloEmberNamekian",   name: "Ember Namekian",   unlockLevel: 0, portrait: "./piccolo_portrait__embernamekian.png",   spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "embernamekian") },     // warm-red gi (leaned red, distinct from reserved Orange Piccolo)
    // ── Specialty ──
    { id: "piccoloVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./piccolo_portrait__voidsovereign.png",   spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "voidsovereign") },   // full near-black + drifting pale spore/blossom overlay (game.js drawPiccoloVoidAuraOverlay)
    // ── Homage ──
    { id: "piccoloKami",            name: "Kami",             unlockLevel: 0, portrait: "./piccolo_portrait__kami.png",            spriteScale: characters.piccolo?.spriteScale, animationData: recolorSkinAnim("piccolo", "kami") }          // white/gold robe + pale green-white skin (Piccolo's former good half)
  ],
  // Teen Gohan (Dragon Ball, Extreme Butoden) — Default + 8 coordinated recolors + Void Sovereign (10 total,
  // tools/gen_gohan_creative.py). ★APPLIES ACROSS BOTH FORMS: `recolorTag` makes applySkin stamp fighter._recolorTag
  // so abilities.js `retagFormAnim` swaps the SSJ2 form art to the __tag sheets too (Goku-Black/Vegeta pattern) —
  // gi(purple)+sash(blue) recolor uniformly on Base AND SSJ2; hair stays per-form (black/gold, hue-protected).
  // Great Saiyaman homage substituted-out (owner: silhouette lift too big for a palette batch). The default entry
  // is REQUIRED so applySkin() pulls spriteScale (else the char shrinks to source size).
  gohan: [
    { id: "default",           name: "Default",            unlockLevel: 0, portrait: characters.gohan?.portrait,                          spriteScale: characters.gohan?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "gohanCrimsonSuccessor", name: "Crimson Successor", unlockLevel: 0, portrait: "./gohan_portrait__crimsonsuccessor.png", spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "crimsonsuccessor"), recolorTag: "crimsonsuccessor" }, // deep-red gi / black sash
    { id: "gohanVerdantScholar",   name: "Verdant Scholar",   unlockLevel: 0, portrait: "./gohan_portrait__verdantscholar.png",   spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "verdantscholar"),   recolorTag: "verdantscholar" },   // deep-green gi / dark-green sash
    { id: "gohanGoldenHeir",       name: "Golden Heir",       unlockLevel: 0, portrait: "./gohan_portrait__goldenheir.png",       spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "goldenheir"),       recolorTag: "goldenheir" },       // deep-gold gi / dark-brown sash
    { id: "gohanObsidianDisciple", name: "Obsidian Disciple", unlockLevel: 0, portrait: "./gohan_portrait__obsidiandisciple.png", spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "obsidiandisciple"), recolorTag: "obsidiandisciple" }, // black gi / dark-grey sash / grey boots
    // ── Group 2 ──
    { id: "gohanAzureNamekian",    name: "Azure Namekian",    unlockLevel: 0, portrait: "./gohan_portrait__azurenamekian.png",    spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "azurenamekian"),    recolorTag: "azurenamekian" },    // azure gi / black sash (Piccolo-lineage nod)
    { id: "gohanVioletReborn",     name: "Violet Reborn",     unlockLevel: 0, portrait: "./gohan_portrait__violetreborn.png",     spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "violetreborn"),     recolorTag: "violetreborn" },     // richer violet gi / deep-blue sash
    { id: "gohanEmberSuccessor",   name: "Ember Successor",   unlockLevel: 0, portrait: "./gohan_portrait__embersuccessor.png",   spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "embersuccessor"),   recolorTag: "embersuccessor" },   // burnt-orange gi / dark red-brown sash
    { id: "gohanFrostboundScholar",name: "Frostbound Scholar",unlockLevel: 0, portrait: "./gohan_portrait__frostboundscholar.png",spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "frostboundscholar"),recolorTag: "frostboundscholar" },// pale ice-lavender gi / white-grey sash
    // ── Specialty ──
    { id: "gohanVoidSovereign",    name: "Void Sovereign",    unlockLevel: 0, portrait: "./gohan_portrait__voidsovereign.png",    spriteScale: characters.gohan?.spriteScale, animationData: recolorSkinAnim("gohan", "voidsovereign"),    recolorTag: "voidsovereign" },    // full near-black (incl. skin) + drifting ki-wisp overlay (game.js drawGohanVoidAuraOverlay)
  ],
  // Gotenks (Super Saiyan) (Dragon Ball, Extreme Butoden) — Default + 8 coordinated palette recolors + Void
  // Sovereign (tools/gen_gotenks_creative.py). ★HEALTH-CHECKED vs the real sprite: sash+WRISTBANDS are GREEN
  // (not the prompt's "teal / black wristbands"), vest is a small dark-indigo open Metamoran vest, pants are
  // lavender-shaded white. Recolored regions: VEST / PADDING / SASH(+wristbands) / PANTS; hair(gold)/skin/
  // shoes/outline PROTECTED (boots spatially guarded from the vest hue). The Super Ghost Kamikaze GHOST
  // projectile is a separate non-skin-swapped sheet → stays blue on every skin.
  gotenks: [
    { id: "default",             name: "Default",         unlockLevel: 0, portrait: characters.gotenks?.portrait,                       spriteScale: characters.gotenks?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "gotenksCrimsonFusion", name: "Crimson Fusion", unlockLevel: 0, portrait: "./gotenks_portrait__crimsonfusion.png", spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "crimsonfusion") },   // deep-red vest / black sash
    { id: "gotenksVerdantDuo",    name: "Verdant Duo",    unlockLevel: 0, portrait: "./gotenks_portrait__verdantduo.png",    spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "verdantduo") },      // deep-green vest / dark-green sash
    { id: "gotenksObsidianPair",  name: "Obsidian Pair",  unlockLevel: 0, portrait: "./gotenks_portrait__obsidianpair.png",  spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "obsidianpair") },    // monochrome black vest / silver padding / grey sash+pants
    { id: "gotenksGoldenDuo",     name: "Golden Duo",     unlockLevel: 0, portrait: "./gotenks_portrait__goldenduo.png",     spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "goldenduo") },       // deep-gold vest / bright-gold padding / dark-brown sash / cream pants
    // ── Group 2 ──
    { id: "gotenksVioletFusion",  name: "Violet Fusion",  unlockLevel: 0, portrait: "./gotenks_portrait__violetfusion.png",  spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "violetfusion") },    // deep-violet vest / black sash
    { id: "gotenksEmberDuo",      name: "Ember Duo",      unlockLevel: 0, portrait: "./gotenks_portrait__emberduo.png",      spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "emberduo") },        // burnt-orange vest / dark red-brown sash
    { id: "gotenksFrostboundPair",name: "Frostbound Pair",unlockLevel: 0, portrait: "./gotenks_portrait__frostboundpair.png",spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "frostboundpair") },  // pale ice-blue vest / white padding / icy-teal sash
    { id: "gotenksAzureDuo",      name: "Azure Duo",      unlockLevel: 0, portrait: "./gotenks_portrait__azureduo.png",      spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "azureduo") },        // richer-navy vest / brighter-teal sash
    // ── Specialty ──
    { id: "gotenksVoidSovereign", name: "Void Sovereign", unlockLevel: 0, portrait: "./gotenks_portrait__voidsovereign.png", spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "voidsovereign") },  // full near-black silhouette + drifting ghost-wisp overlay (game.js drawGotenksVoidAuraOverlay)
    // ★ Super Saiyan 3 = PALETTE-ONLY homage (owner decision 2026-08-23): brighter electric-gold hair. Real SSJ3
    //   = longer-hair silhouette + no eyebrows (a bespoke art lift) is DEFERRED/flagged — NOT true SSJ3 art.
    { id: "gotenksSuperSaiyan3",  name: "Super Saiyan 3", unlockLevel: 0, portrait: "./gotenks_portrait__supersaiyan3.png", spriteScale: characters.gotenks?.spriteScale, animationData: recolorSkinAnim("gotenks", "supersaiyan3") }  // HOMAGE: brighter gold hair (silhouette deferred)
  ],
  // Bardock (Dragon Ball, Extreme Butoden) — Default + 8 coordinated recolors + Void Sovereign + Elite Guard
  // (2nd specialty, ORIGINAL design — flagged: no documented Bardock alt-costume exists) via
  // tools/gen_bardock_creative.py. ★HEALTH-CHECKED: SUIT(navy bodysuit torso+legs) is the DOMINANT garment
  // (~32%) → primary theme; ARMOR(olive-green shoulder guards+chest disc, the teal chest plate folds in here);
  // RED(headband/wristbands/boots) = themed accent; tan SKIN + black HAIR protected (except mono/frost/Void).
  // NO reserved palette (the SSJ gold flash is a cosmetic taunt, not a form). Cosmetic only; zero gameplay.
  bardock: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.bardock?.portrait, spriteScale: characters.bardock?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "bardockCrimsonSaiyan",  name: "Crimson Saiyan",  unlockLevel: 0, portrait: "./bardock_portrait__crimsonsaiyan.png",  spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "crimsonsaiyan") },   // red suit+armor / red band
    { id: "bardockVerdantWarrior", name: "Verdant Warrior", unlockLevel: 0, portrait: "./bardock_portrait__verdantwarrior.png", spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "verdantwarrior") },  // deep-green suit+armor
    { id: "bardockObsidianSaiyan", name: "Obsidian Saiyan", unlockLevel: 0, portrait: "./bardock_portrait__obsidiansaiyan.png", spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "obsidiansaiyan") },  // monochrome silver/black (incl. skin)
    { id: "bardockGoldenWarrior",  name: "Golden Warrior",  unlockLevel: 0, portrait: "./bardock_portrait__goldenwarrior.png",  spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "goldenwarrior") },   // gold suit+armor
    // ── Group 2 ──
    { id: "bardockAzureSaiyan",    name: "Azure Saiyan",    unlockLevel: 0, portrait: "./bardock_portrait__azuresaiyan.png",    spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "azuresaiyan") },     // brighter-blue suit+armor
    { id: "bardockVioletWarrior",  name: "Violet Warrior",  unlockLevel: 0, portrait: "./bardock_portrait__violetwarrior.png",  spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "violetwarrior") },   // violet suit+armor
    { id: "bardockFrostboundSaiyan", name: "Frostbound Saiyan", unlockLevel: 0, portrait: "./bardock_portrait__frostboundsaiyan.png", spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "frostboundsaiyan") }, // ice-white/blue (light outlier, pale skin)
    { id: "bardockEmberSaiyan",    name: "Ember Saiyan",    unlockLevel: 0, portrait: "./bardock_portrait__embersaiyan.png",    spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "embersaiyan") },     // orange suit+armor
    // ── Specialty ──
    { id: "bardockVoidSovereign",  name: "Void Sovereign",  unlockLevel: 0, portrait: "./bardock_portrait__voidsovereign.png",  spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "voidsovereign") },   // full near-black + drifting ki-wisp overlay (game.js drawBardockVoidAuraOverlay)
    // ── 2nd specialty (ORIGINAL, not canon) ──
    { id: "bardockEliteGuard",     name: "Elite Guard",     unlockLevel: 0, portrait: "./bardock_portrait__eliteguard.png",     spriteScale: characters.bardock?.spriteScale, animationData: recolorSkinAnim("bardock", "eliteguard") }        // ORIGINAL deep blood-crimson armor / near-black suit (Saiyan military-rank nod)
  ],
  // Saitama — Default + 13 creative skins (tools/gen_saitama_creative.py). THREE clothing regions recolored
  // per skin (SUIT-yellow / CAPE+trim-grey / GLOVES+boots-red), measured from the wired uniform sheets; the
  // BALD HEAD + face skin tone is NEVER touched (sat/warm-gated out). Masks are computed from the ORIGINAL
  // sheet so suit↔glove swaps (Crimson Fist) and desaturating suits (Monochrome) don't cross-catch. Cosmetic
  // only, zero gameplay. Void Caped Baldy = full-black suit+cape + game.js drawSaitamaVoidAuraOverlay (gold aura).
  saitama: [
    { id: "default",             name: "Default",              unlockLevel: 0, portrait: characters.saitama?.portrait,               spriteScale: characters.saitama?.spriteScale, animationData: null },
    { id: "saitamaSaleDay",      name: "Sale Day",             unlockLevel: 0, portrait: "./saitama_portrait__saleday.png",           spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "saleday"),       recolorTag: "saleday" },
    { id: "saitamaBloodSoaked",  name: "Blood-Soaked Victory", unlockLevel: 0, portrait: "./saitama_portrait__bloodsoaked.png",       spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "bloodsoaked"),   recolorTag: "bloodsoaked" },
    { id: "saitamaCrimsonFist",  name: "Crimson Fist",         unlockLevel: 0, portrait: "./saitama_portrait__crimsonfist.png",       spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "crimsonfist"),   recolorTag: "crimsonfist" },
    { id: "saitamaSteelHero",    name: "Steel Hero",           unlockLevel: 0, portrait: "./saitama_portrait__steelhero.png",         spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "steelhero"),     recolorTag: "steelhero" },
    { id: "saitamaClassB",       name: "Class-B Tracksuit",    unlockLevel: 0, portrait: "./saitama_portrait__classb.png",            spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "classb"),        recolorTag: "classb" },
    { id: "saitamaAmethyst",     name: "Amethyst Punch",       unlockLevel: 0, portrait: "./saitama_portrait__amethyst.png",          spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "amethyst"),      recolorTag: "amethyst" },
    { id: "saitamaMidnight",     name: "Midnight Patrol",      unlockLevel: 0, portrait: "./saitama_portrait__midnight.png",          spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "midnight"),      recolorTag: "midnight" },
    { id: "saitamaGoldenSerious",name: "Golden Serious",       unlockLevel: 0, portrait: "./saitama_portrait__goldenserious.png",     spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "goldenserious"), recolorTag: "goldenserious" },
    { id: "saitamaFrostCape",    name: "Frost Cape",           unlockLevel: 0, portrait: "./saitama_portrait__frostcape.png",         spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "frostcape"),     recolorTag: "frostcape" },
    { id: "saitamaToxicMeteor",  name: "Toxic Meteor",         unlockLevel: 0, portrait: "./saitama_portrait__toxicmeteor.png",       spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "toxicmeteor"),   recolorTag: "toxicmeteor" },
    { id: "saitamaRoseHero",     name: "Rose Hero",            unlockLevel: 0, portrait: "./saitama_portrait__rosehero.png",          spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "rosehero"),      recolorTag: "rosehero" },
    { id: "saitamaMonochrome",   name: "Monochrome Manga",     unlockLevel: 0, portrait: "./saitama_portrait__monochrome.png",        spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "monochrome"),    recolorTag: "monochrome" },
    { id: "saitamaVoidCaped",    name: "Void Caped Baldy",     unlockLevel: 0, portrait: "./saitama_portrait__void.png",              spriteScale: characters.saitama?.spriteScale, animationData: recolorSkinAnim("saitama", "void"),          recolorTag: "void" },
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.zaraki_shikai?.portrait, spriteScale: characters.zaraki_shikai?.spriteScale, animationData: null },
    { id: "zaraki_shikai_crimson", name: "Crimson", unlockLevel: 2, portrait: characters.zaraki_shikai?.portrait, spriteScale: characters.zaraki_shikai?.spriteScale, animationData: null, skinTint: "#cf4a3f", tintStrength: 0.4 },   // Stage 23 auto-palette
    { id: "zaraki_shikai_azure",   name: "Azure",   unlockLevel: 4, portrait: characters.zaraki_shikai?.portrait, spriteScale: characters.zaraki_shikai?.spriteScale, animationData: null, skinTint: "#3f7fcf", tintStrength: 0.4 }
  ],

  // Six Paths of Pain — ONE shared 13-skin set (Default + 12 recolor_hue repaints), applied UNIFORMLY
  // to EVERY Path's BODY art. Canonically correct: all six Paths share the near-black Akatsuki cloak +
  // red trim + vivid orange-red hair + tan skin (palette pixel-sampled from p1_pain_chikushodo_combo),
  // so ONE hue-rotate set repaints the whole character. recolor_hue leaves the near-black outfit dark
  // (low-sat → hue-invariant) while shifting hair/trim/skin. Sheets = tools/gen_sixpaths_skins.py →
  // harness/recolor_batch.mjs (52 body sheets × 12 tags). The recolor propagates ACROSS Paths for free:
  // applySkin stashes `recolorTag`, and abilities.js applySixPathsSwap retags each swapped-in Path's anim
  // via retagFormAnim(PATH.anim, _recolorTag). FX/creature/King-of-Hell/missile/barrier/soul sheets are
  // spawned with hardcoded base paths → intentionally NOT recolored (energy/creatures keep their own hue).
  // Verified roster-wide across all 6 Paths (harness/shots/sixpaths_skins_preview.png). Cosmetic-only.
  six_paths_pain: [
    { id: "default",                  name: "Default",           unlockLevel: 0, portrait: characters.six_paths_pain?.portrait,        spriteScale: characters.six_paths_pain?.spriteScale, animationData: null },
    { id: "sixpaths_amberpath",       name: "Amber Path",        unlockLevel: 0, portrait: "./sixpaths_deva_portrait__amberpath.png",       spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "amberpath"),       recolorTag: "amberpath" },
    { id: "sixpaths_goldenrikudou",   name: "Golden Rikudō",     unlockLevel: 0, portrait: "./sixpaths_deva_portrait__goldenrikudou.png",   spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "goldenrikudou"),   recolorTag: "goldenrikudou" },
    { id: "sixpaths_verdantsage",     name: "Verdant Sage",      unlockLevel: 0, portrait: "./sixpaths_deva_portrait__verdantsage.png",     spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "verdantsage"),     recolorTag: "verdantsage" },
    { id: "sixpaths_emeralddeva",     name: "Emerald Deva",      unlockLevel: 0, portrait: "./sixpaths_deva_portrait__emeralddeva.png",     spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "emeralddeva"),     recolorTag: "emeralddeva" },
    { id: "sixpaths_tealrebirth",     name: "Teal Rebirth",      unlockLevel: 0, portrait: "./sixpaths_deva_portrait__tealrebirth.png",     spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "tealrebirth"),     recolorTag: "tealrebirth" },
    { id: "sixpaths_cobaltpath",      name: "Cobalt Path",       unlockLevel: 0, portrait: "./sixpaths_deva_portrait__cobaltpath.png",      spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "cobaltpath"),      recolorTag: "cobaltpath" },
    { id: "sixpaths_azuretendo",      name: "Azure Tendō",       unlockLevel: 0, portrait: "./sixpaths_deva_portrait__azuretendo.png",      spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "azuretendo"),      recolorTag: "azuretendo" },
    { id: "sixpaths_violetrinnegan",  name: "Violet Rinnegan",   unlockLevel: 0, portrait: "./sixpaths_deva_portrait__violetrinnegan.png",  spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "violetrinnegan"),  recolorTag: "violetrinnegan" },
    { id: "sixpaths_amethystshurado", name: "Amethyst Shurado",  unlockLevel: 0, portrait: "./sixpaths_deva_portrait__amethystshurado.png", spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "amethystshurado"), recolorTag: "amethystshurado" },
    { id: "sixpaths_magentagakido",   name: "Magenta Gakidō",    unlockLevel: 0, portrait: "./sixpaths_deva_portrait__magentagakido.png",   spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "magentagakido"),   recolorTag: "magentagakido" },
    { id: "sixpaths_crimsonnagato",   name: "Crimson Nagato",    unlockLevel: 0, portrait: "./sixpaths_deva_portrait__crimsonnagato.png",   spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "crimsonnagato"),   recolorTag: "crimsonnagato" },
    { id: "sixpaths_ashenvoid",       name: "Ashen Void",        unlockLevel: 0, portrait: "./sixpaths_deva_portrait__ashenvoid.png",       spriteScale: characters.six_paths_pain?.spriteScale, animationData: recolorSkinAnim("six_paths_pain", "ashenvoid"),       recolorTag: "ashenvoid" }
  ],

  // Kurapika — Stage-1 default only (keeps the characters.js spriteScale/animationData; else applySkin
  // native-shrinks to spriteScale:1). Creative recolors + Emperor Time scarlet-eyed variant are a S6 follow-up.
  kurapika: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.kurapika?.portrait, spriteScale: characters.kurapika?.spriteScale, animationData: null }
  ],
  // Spider-Man — Default + the "Negative Zone" white/blue alt-costume. The alt is NOT an abstract hue-
  // rotate: it REVERSE-ENGINEERS the REAL pre-drawn CPS2 white/blue palette-swap from the source art
  // (spiderman_row_25's far-right frame — same precedent as Hiruzen's color_palletts). tools/
  // gen_spiderman_creative.py maps the red/orange costume → white/grey (value-preserving) and keeps the
  // blue + outlines + web-lines, across every spiderman_*_uniform sheet → __whiteblue copies, consumed
  // here via recolorSkinAnim. recolorTag drives applySkin's per-fighter swap (mirror matches work).
  // Full PALETTE BATCH (tools/gen_spiderman_creative.py, MEASURED 18-colour CPS2 index → per-region ramp
  // remap: RED zone → each skin's red ramp, BLUE zone → its blue ramp; black outline/web-lines + white
  // eye-lenses kept). Group 1 (Crimson/Verdant/Violet/Golden) + Group 2 (Frost/Ember/Jade/Obsidian) +
  // 2 specialty (White Reflective, Void Sovereign). recolorTag drives applySkin's per-fighter swap.
  // WEB-LINE NOTE: the web pattern shares BLACK with the outline (not palette-separable) → Frost/Obsidian/
  // White keep a BLACK web-line (contrasts fine); a grey web-line would need new masks (deferred).
  // Iron Man (1) — danorenovado JUS chibi. RED plating (primary) + GOLD/amber accent (faceplate/gloves/
  // boots/thigh) recolored per skin (tools/gen_iron_man_creative.py); black line-art + the cyan arc-reactor
  // + lavender source-speckle halo are PROTECTED (never painted → reactor stays cyan on every skin = the
  // tech, not the paint job). Repulsor beams are procedural (game.js), never skin-swapped. Group 1 + Group 2
  // + Void Sovereign (near-black + game.js drawIronManVoidAuraOverlay drifting circuit/data-line motes) +
  // Stealth "Prodigal Son" homage (matte-black plate, thin dark accent, cold blue-white faceplate eyes).
  iron_man: [
    { id: "default",              name: "Default",              unlockLevel: 0, portrait: characters.iron_man?.portrait,                          spriteScale: characters.iron_man?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "ironManCrimsonOverdrive", name: "Crimson Overdrive", unlockLevel: 0, portrait: "./iron_man_portrait__crimsonoverdrive.png", spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "crimsonoverdrive"), recolorTag: "crimsonoverdrive" },  // deeper crimson plate / black accent
    { id: "ironManVerdantCircuit",   name: "Verdant Circuit",   unlockLevel: 0, portrait: "./iron_man_portrait__verdantcircuit.png",   spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "verdantcircuit"),   recolorTag: "verdantcircuit" },    // green plate / dark-green accent
    { id: "ironManObsidianMark",     name: "Obsidian Mark",     unlockLevel: 0, portrait: "./iron_man_portrait__obsidianmark.png",     spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "obsidianmark"),     recolorTag: "obsidianmark" },      // black plate / grey accent (monochrome)
    { id: "ironManGoldenCore",       name: "Golden Core",       unlockLevel: 0, portrait: "./iron_man_portrait__goldencore.png",       spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "goldencore"),       recolorTag: "goldencore" },        // amber plate / bronze accent
    // ── Group 2 ──
    { id: "ironManAzureRepulsor",    name: "Azure Repulsor",    unlockLevel: 0, portrait: "./iron_man_portrait__azurerepulsor.png",    spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "azurerepulsor"),    recolorTag: "azurerepulsor" },     // blue plate / navy accent
    { id: "ironManVioletExtremis",   name: "Violet Extremis",   unlockLevel: 0, portrait: "./iron_man_portrait__violetextremis.png",   spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "violetextremis"),   recolorTag: "violetextremis" },    // violet plate / black accent
    { id: "ironManFrostboundMark",   name: "Frostbound Mark",   unlockLevel: 0, portrait: "./iron_man_portrait__frostboundmark.png",   spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "frostboundmark"),   recolorTag: "frostboundmark" },    // pale ice-blue plate / white accent
    { id: "ironManEmberCore",        name: "Ember Core",        unlockLevel: 0, portrait: "./iron_man_portrait__embercore.png",        spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "embercore"),        recolorTag: "embercore" },         // burnt-orange plate / brown accent
    // ── Specialty ──
    { id: "ironManVoidSovereign",    name: "Void Sovereign",    unlockLevel: 0, portrait: "./iron_man_portrait__voidsovereign.png",    spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "voidsovereign"),    recolorTag: "voidsovereign" },     // near-black + drifting circuit/data-line overlay
    { id: "ironManStealth",          name: "Stealth Protocol",  unlockLevel: 0, portrait: "./iron_man_portrait__stealth.png",          spriteScale: characters.iron_man?.spriteScale, animationData: recolorSkinAnim("iron_man", "stealth"),          recolorTag: "stealth" }             // HOMAGE Stealth "Prodigal Son": matte-black plate, cold blue-white faceplate eyes
  ],
  // Iron Man 2 (Data East 1991, bulky). RED plate (primary) + prominent GOLD/amber accent recolored per skin
  // (tools/gen_iron_man_2_creative.py); thick black linework + ground shadow PROTECTED. INDEPENDENT hex from
  // IM1/IM3 (same family names, distinct values — this trio is the roster's highest duplicate-risk pairing).
  // Group 1 + Group 2 + Void Sovereign (game.js drawIronMan2VoidAuraOverlay) + War Machine homage (gunmetal
  // plate, red/white accent stripes — the strongest real alternate-era read in the trio).
  iron_man_2: [
    { id: "default",                name: "Default",            unlockLevel: 0, portrait: characters.iron_man_2?.portrait,                        spriteScale: characters.iron_man_2?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "ironMan2CrimsonOverdrive", name: "Crimson Overdrive", unlockLevel: 0, portrait: "./iron_man_2_portrait__crimsonoverdrive.png", spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "crimsonoverdrive"), recolorTag: "crimsonoverdrive" },
    { id: "ironMan2VerdantCircuit",   name: "Verdant Circuit",   unlockLevel: 0, portrait: "./iron_man_2_portrait__verdantcircuit.png",   spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "verdantcircuit"),   recolorTag: "verdantcircuit" },
    { id: "ironMan2ObsidianMark",     name: "Obsidian Mark",     unlockLevel: 0, portrait: "./iron_man_2_portrait__obsidianmark.png",     spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "obsidianmark"),     recolorTag: "obsidianmark" },
    { id: "ironMan2GoldenCore",       name: "Golden Core",       unlockLevel: 0, portrait: "./iron_man_2_portrait__goldencore.png",       spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "goldencore"),       recolorTag: "goldencore" },
    // ── Group 2 ──
    { id: "ironMan2AzureRepulsor",    name: "Azure Repulsor",    unlockLevel: 0, portrait: "./iron_man_2_portrait__azurerepulsor.png",    spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "azurerepulsor"),    recolorTag: "azurerepulsor" },
    { id: "ironMan2VioletExtremis",   name: "Violet Extremis",   unlockLevel: 0, portrait: "./iron_man_2_portrait__violetextremis.png",   spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "violetextremis"),   recolorTag: "violetextremis" },
    { id: "ironMan2FrostboundMark",   name: "Frostbound Mark",   unlockLevel: 0, portrait: "./iron_man_2_portrait__frostboundmark.png",   spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "frostboundmark"),   recolorTag: "frostboundmark" },
    { id: "ironMan2EmberCore",        name: "Ember Core",        unlockLevel: 0, portrait: "./iron_man_2_portrait__embercore.png",        spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "embercore"),        recolorTag: "embercore" },
    // ── Specialty ──
    { id: "ironMan2VoidSovereign",    name: "Void Sovereign",    unlockLevel: 0, portrait: "./iron_man_2_portrait__voidsovereign.png",    spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "voidsovereign"),    recolorTag: "voidsovereign" },
    { id: "ironMan2WarMachine",       name: "War Machine",       unlockLevel: 0, portrait: "./iron_man_2_portrait__warmachine.png",       spriteScale: characters.iron_man_2?.spriteScale, animationData: recolorSkinAnim("iron_man_2", "warmachine"),       recolorTag: "warmachine" }             // HOMAGE War Machine: gunmetal plate, red/white accent stripes
  ],
  // Iron Man 3 (GBA "Invincible Iron Man", chunky). RED plate (primary, incl. dark-maroon linework — this
  // sheet has NO pure-black outline) + GOLD/amber accent recolored per skin (tools/gen_iron_man_3_creative.py).
  // INDEPENDENT hex from IM1/IM2 (deeper/richer values; same family names). Group 1 + Group 2 + Void Sovereign
  // (game.js drawIronMan3VoidAuraOverlay) + Mark 42 (Extremis) homage (darker red + champagne-gold, the
  // reversed-placement canon alt — the trio's subtlest, keeping its homage distinct from Stealth/War Machine).
  iron_man_3: [
    { id: "default",                name: "Default",            unlockLevel: 0, portrait: characters.iron_man_3?.portrait,                        spriteScale: characters.iron_man_3?.spriteScale, animationData: null },
    // ── Group 1 ──
    { id: "ironMan3CrimsonOverdrive", name: "Crimson Overdrive", unlockLevel: 0, portrait: "./iron_man_3_portrait__crimsonoverdrive.png", spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "crimsonoverdrive"), recolorTag: "crimsonoverdrive" },
    { id: "ironMan3VerdantCircuit",   name: "Verdant Circuit",   unlockLevel: 0, portrait: "./iron_man_3_portrait__verdantcircuit.png",   spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "verdantcircuit"),   recolorTag: "verdantcircuit" },
    { id: "ironMan3ObsidianMark",     name: "Obsidian Mark",     unlockLevel: 0, portrait: "./iron_man_3_portrait__obsidianmark.png",     spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "obsidianmark"),     recolorTag: "obsidianmark" },
    { id: "ironMan3GoldenCore",       name: "Golden Core",       unlockLevel: 0, portrait: "./iron_man_3_portrait__goldencore.png",       spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "goldencore"),       recolorTag: "goldencore" },
    // ── Group 2 ──
    { id: "ironMan3AzureRepulsor",    name: "Azure Repulsor",    unlockLevel: 0, portrait: "./iron_man_3_portrait__azurerepulsor.png",    spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "azurerepulsor"),    recolorTag: "azurerepulsor" },
    { id: "ironMan3VioletExtremis",   name: "Violet Extremis",   unlockLevel: 0, portrait: "./iron_man_3_portrait__violetextremis.png",   spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "violetextremis"),   recolorTag: "violetextremis" },
    { id: "ironMan3FrostboundMark",   name: "Frostbound Mark",   unlockLevel: 0, portrait: "./iron_man_3_portrait__frostboundmark.png",   spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "frostboundmark"),   recolorTag: "frostboundmark" },
    { id: "ironMan3EmberCore",        name: "Ember Core",        unlockLevel: 0, portrait: "./iron_man_3_portrait__embercore.png",        spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "embercore"),        recolorTag: "embercore" },
    // ── Specialty ──
    { id: "ironMan3VoidSovereign",    name: "Void Sovereign",    unlockLevel: 0, portrait: "./iron_man_3_portrait__voidsovereign.png",    spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "voidsovereign"),    recolorTag: "voidsovereign" },
    { id: "ironMan3MarkFortyTwo",     name: "Mark 42 (Extremis)",unlockLevel: 0, portrait: "./iron_man_3_portrait__markfortytwo.png",     spriteScale: characters.iron_man_3?.spriteScale, animationData: recolorSkinAnim("iron_man_3", "markfortytwo"),     recolorTag: "markfortytwo" }               // HOMAGE Mark 42 (Extremis): darker red + champagne-gold
  ],
  spiderman: [
    { id: "default",                    name: "Default",             unlockLevel: 0, portrait: characters.spiderman?.portrait,                       spriteScale: characters.spiderman?.spriteScale, animationData: null },
    { id: "spidermanNegativeZone",      name: "Negative Zone",       unlockLevel: 0, portrait: "./spiderman_portrait__whiteblue.png",          spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "whiteblue"),          recolorTag: "whiteblue" },
    // ── Group 1 ──
    { id: "spidermanCrimsonWeave",      name: "Crimson Weave",       unlockLevel: 0, portrait: "./spiderman_portrait__crimsonweave.png",       spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "crimsonweave"),       recolorTag: "crimsonweave" },
    { id: "spidermanVerdantWidow",      name: "Verdant Widow",       unlockLevel: 0, portrait: "./spiderman_portrait__verdantwidow.png",       spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "verdantwidow"),       recolorTag: "verdantwidow" },
    { id: "spidermanVioletNightcrawler",name: "Violet Nightcrawler", unlockLevel: 0, portrait: "./spiderman_portrait__violetnightcrawler.png", spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "violetnightcrawler"), recolorTag: "violetnightcrawler" },
    { id: "spidermanGoldenGuardian",    name: "Golden Guardian",     unlockLevel: 0, portrait: "./spiderman_portrait__goldenguardian.png",     spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "goldenguardian"),     recolorTag: "goldenguardian" },
    // ── Group 2 ──
    { id: "spidermanFrostLine",         name: "Frost Line",          unlockLevel: 0, portrait: "./spiderman_portrait__frostline.png",          spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "frostline"),          recolorTag: "frostline" },
    { id: "spidermanEmberStrike",       name: "Ember Strike",        unlockLevel: 0, portrait: "./spiderman_portrait__emberstrike.png",        spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "emberstrike"),        recolorTag: "emberstrike" },
    { id: "spidermanJadeWeb",           name: "Jade Web",            unlockLevel: 0, portrait: "./spiderman_portrait__jadeweb.png",            spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "jadeweb"),            recolorTag: "jadeweb" },
    { id: "spidermanObsidianWeb",       name: "Obsidian Web",        unlockLevel: 0, portrait: "./spiderman_portrait__obsidianweb.png",        spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "obsidianweb"),        recolorTag: "obsidianweb" },
    // ── Specialty ──
    { id: "spidermanWhiteReflective",   name: "White Reflective",    unlockLevel: 0, portrait: "./spiderman_portrait__whitereflective.png",    spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "whitereflective"),    recolorTag: "whitereflective" },
    { id: "spidermanVoidSovereign",     name: "Void Sovereign",      unlockLevel: 0, portrait: "./spiderman_portrait__voidsovereign.png",      spriteScale: characters.spiderman?.spriteScale, animationData: recolorSkinAnim("spiderman", "voidsovereign"),      recolorTag: "voidsovereign" }
  ],
  // Naoya Zenin — STAGE 1 default entry (REQUIRED: without it applySkin() forces spriteScale:1 and the
  // sprite shrinks to native size). Creative recolor batch is DEFERRED to the skins follow-up.
  naoya: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.naoya?.portrait, spriteScale: characters.naoya?.spriteScale, animationData: null },
    // Default + 8 creative coordinated recolors + Void + Narcissus = 11 (gen_naoya_creative.py). Regions: GI
    // (dark-navy haori) / HAKAMA (white pants — PRESERVED as tinted-white per owner decision, not blacked out) /
    // HAIR (olive). Skin protected except Void. Portraits are the recolored bust. Cosmetic-only, all free.
    { id: "naoyaCrimsonDojo",     name: "Crimson Dojo",     unlockLevel: 0, portrait: "./naoya_portrait__crimsondojo.png",     spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "crimsondojo") },     // deep-red jacket, warm-white hakama, red-brown hair
    { id: "naoyaAzureSensei",     name: "Azure Sensei",     unlockLevel: 0, portrait: "./naoya_portrait__azuresensei.png",     spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "azuresensei") },     // deep-blue jacket, cool-white hakama, icy blue-grey hair
    { id: "naoyaGoldenRonin",     name: "Golden Ronin",     unlockLevel: 0, portrait: "./naoya_portrait__goldenronin.png",     spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "goldenronin") },     // gold-black jacket, antique-gold hakama, amber hair
    { id: "naoyaObsidianBlade",   name: "Obsidian Blade",   unlockLevel: 0, portrait: "./naoya_portrait__obsidianblade.png",   spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "obsidianblade") },   // monochrome near-black + dark-grey hakama + silver hair
    { id: "naoyaVerdantElder",    name: "Verdant Elder",    unlockLevel: 0, portrait: "./naoya_portrait__verdantelder.png",    spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "verdantelder") },    // deep-jade jacket, mint-white hakama, emerald hair
    { id: "naoyaWisteriaDuelist", name: "Wisteria Duelist", unlockLevel: 0, portrait: "./naoya_portrait__wisteriaduelist.png", spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "wisteriaduelist") }, // violet jacket, violet-white hakama, violet-grey hair
    { id: "naoyaEmberRonin",      name: "Ember Ronin",      unlockLevel: 0, portrait: "./naoya_portrait__emberronin.png",      spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "emberronin") },      // burnt-orange jacket, warm-cream hakama, deep-auburn hair
    { id: "naoyaFrostboundKendo", name: "Frostbound Kendo", unlockLevel: 0, portrait: "./naoya_portrait__frostboundkendo.png", spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "frostboundkendo") }, // pale-ice jacket, light-grey hakama, silvery-white hair
    { id: "naoyaVoidSovereign",   name: "Void Sovereign",   unlockLevel: 0, portrait: "./naoya_portrait__void.png",            spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "void") },            // Alien-X full-black body + ink-brush/indigo aura overlay (game.js drawNaoyaVoidAuraOverlay)
    { id: "naoyaNarcissus",       name: "Narcissus",        unlockLevel: 0, portrait: "./naoya_portrait__narcissus.png",       spriteScale: characters.naoya?.spriteScale, animationData: recolorSkinAnim("naoya", "narcissus") },       // vanity: pale white-gold jacket, blue-black reflecting-pool hakama, glossy green hair + mirror-shimmer overlay
  ]
}

// Append manifest-driven recolor skins (5+ per char) to every character's list, idempotently —
// ids already present (bespoke skins gojo2/sukuna3 + the original beerusEmerald/saikiAzure/
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
  if (isChallengeSkinUnlocked(rosterKey, skinId)) return true   // earned via a challenge reward
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
