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

  // ---- SUKUNA3 (attack rows GUESSED) ----
  sukuna3: {
    idle:             { frames: 6,  width: 28, height: 64, speed: 6, sheet: "./sukuna3_idle_sheet.png" },
    walk:             { frames: 9,  width: 47, height: 63, speed: 5, sheet: "./sukuna3_walk_sheet.png" },
    run:              { frames: 6,  width: 51, height: 58, speed: 4, sheet: "./sukuna3_run_sheet.png" },
    jump:             { frames: 4,  width: 34, height: 66, speed: 6, sheet: "./sukuna3_jump_sheet.png" },
    fall:             { frames: 4,  width: 34, height: 66, speed: 6, sheet: "./sukuna3_jump_sheet.png" },
    hurt:             { frames: 5,  width: 64, height: 55, speed: 6, sheet: "./sukuna3_knockdown_sheet.png" },
    transform:        { frames: 10, width: 42, height: 63, speed: 6, sheet: "./sukuna3_intro_sheet.png", loop: false, lockLastFrame: true },
    light:            { frames: 5,  width: 48, height: 61, speed: 4, sheet: "./sukuna3_punch_sheet.png" },          // [guess]
    heavy:            { frames: 6,  width: 43, height: 63, speed: 5, sheet: "./sukuna3_attack_a_sheet.png" },        // [guess]
    up:               { frames: 5,  width: 49, height: 63, speed: 5, sheet: "./sukuna3_kick_sheet.png" },            // [guess]
    air:              { frames: 5,  width: 39, height: 62, speed: 4, sheet: "./sukuna3_attack_b_sheet.png" },        // [guess]
    down_air:         { frames: 5,  width: 35, height: 63, speed: 4, sheet: "./sukuna3_attack_c_sheet.png" },        // [guess]
    grab:             { frames: 4,  width: 35, height: 64, speed: 5, sheet: "./sukuna3_attack_d_sheet.png" },        // [guess]
    cleave:           { frames: 8,  width: 57, height: 62, speed: 4, sheet: "./sukuna3_slash_sheet.png" },           // [guess]
    dismantle:        { frames: 4,  width: 44, height: 62, speed: 4, sheet: "./sukuna3_slash_special_sheet.png" },   // [guess]
    flame_arrow_fire: { frames: 10, width: 41, height: 63, speed: 5, sheet: "./sukuna3_fire_special_sheet.png" }     // [guess, high conf]
    // UNUSED for now: sukuna3_combo (12f), sukuna3_attack_e (6f)
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
  sukuna3: {
    "light": "punch", "heavy": "attack_a", "up": "kick", "air": "attack_b",
    "down_air": "attack_c", "grab": "attack_d", "cleave": "slash",
    "dismantle": "slash_special", "flame_arrow_fire": "fire_special",
    "_unused": ["combo", "attack_e"]
  },
  megumi2: {
    "ultimate": "combat_a", "light": "combat_b", "heavy": "combat_c", "up": "combat_d",
    "air": "combat_e", "down_air": "combat_f", "grab": "combat_g",
    "divine_dogs(cast)": "combat_h", "nue(cast)": "move_c",
    "max_elephant(cast)": "move_d", "toad(cast)": "move_e", "run": "walk_b"
  }
}

// Display scale per skin (source cell heights differ from default).
const SKIN_SCALE = { gojo2: 1.8, sukuna3: 1.8, megumi2: 2.2 /* cells vary 33–120px → compromise (flagged) */ }

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
  gojo: [
    { id: "default", name: "Default",         unlockLevel: 0, portrait: characters.gojo?.portrait,   spriteScale: characters.gojo?.spriteScale,   animationData: null },
    { id: "gojo2",   name: "Limitless (Alt)", unlockLevel: 5, portrait: "./gojo2_idle_sheet.png",    spriteScale: SKIN_SCALE.gojo2,   animationData: buildComplete("gojo", "gojo2") }
  ],
  // THREE Sukuna skins (Task 4). Only two have bespoke art on disk:
  //   • "regular"  = the iconic pink-haired Sukuna  → default sukuna_* sheets.
  //   • "megaFit"  = the Heian full-body Sukuna     → sukuna3_* sheets (real art).
  //   • "pinkFit"  = NO bespoke sheets exist. Synthesised as the DEFAULT art with a
  //     pink colour wash (skinTint) so it's a distinct, selectable skin now; swap
  //     in real pink sheets later by giving it its own OWN[...] block + sheets.
  sukuna: [
    { id: "default", name: "Regular",  unlockLevel: 0, portrait: characters.sukuna?.portrait,  spriteScale: characters.sukuna?.spriteScale, animationData: null },
    { id: "sukuna3", name: "Mega Fit", unlockLevel: 8, portrait: "./sukuna3_idle_sheet.png",    spriteScale: SKIN_SCALE.sukuna3, animationData: buildComplete("sukuna", "sukuna3") },
    { id: "pinkFit", name: "Pink Fit", unlockLevel: 5, portrait: characters.sukuna?.portrait,   spriteScale: characters.sukuna?.spriteScale, animationData: null, skinTint: "#f472b6", placeholderArt: true }
  ],
  megumi: [
    { id: "default", name: "Default",          unlockLevel: 0, portrait: characters.megumi?.portrait, spriteScale: characters.megumi?.spriteScale, animationData: null },
    { id: "megumi2", name: "Ten Shadows (Alt)", unlockLevel: 3, portrait: "./megumi2_idle_sheet.png",  spriteScale: SKIN_SCALE.megumi2,  animationData: buildComplete("megumi", "megumi2") }
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.minato?.portrait, spriteScale: characters.minato?.spriteScale, animationData: null }
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.goku_black?.portrait, spriteScale: characters.goku_black?.spriteScale, animationData: null }
  ],

  // Toji (JJK). Same reason as Naruto/Goku/Sasuke: WITHOUT a default skin, applySkin()
  // pulls the getSkins() spriteScale:1 fallback and he renders at native ~54px (half
  // size) — THIS is why he looked undersized. This entry sources his real spriteScale
  // (2.3) from the character. No alt skins yet.
  toji: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.toji?.portrait, spriteScale: characters.toji?.spriteScale, animationData: null }
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.omega_ranger?.portrait, spriteScale: characters.omega_ranger?.spriteScale, animationData: null }
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
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.shinobu?.portrait, spriteScale: characters.shinobu?.spriteScale, animationData: null }
  ],

  // Ben 10 — ONE fighter that transforms between aliens (Omnitrix). The base skin
  // sources the Ben-human spriteScale (alien forms swap the whole set via _skinAnim
  // in fighters.js, NOT via alt skins). WITHOUT this default entry, applySkin() pulls
  // the spriteScale:1 fallback and Ben renders at ~half size. No alt skins yet.
  ben10: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.ben10?.portrait, spriteScale: characters.ben10?.spriteScale, animationData: null }
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
