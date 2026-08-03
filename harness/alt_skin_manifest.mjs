// harness/alt_skin_manifest.mjs — SINGLE SOURCE OF TRUTH for every generated alt-color skin.
//
// Each char → array of 5+ slots: { tag, mode, deg, name, [sat], [bright] }.
//   tag    = filename suffix `<sheet>__<tag>.png` AND the skin id fragment
//   mode   = "hue" (standard hue-rotate, colored sprites) | "colorize" (sepia wash for near-
//            grayscale sprites where hue-rotate is inert: gojo/killua/sasuke/itachi/goku_black)
//   deg    = the rotation, chosen so the RESULT lands on `name`'s hue (computed from the measured
//            base hue: hue-mode deg=(target-baseHue); colorize deg≈(target-40) since sepia≈40°)
//   name   = human display name (also the audited result color)
//
// Slots use a per-UNIVERSE round-robin ring (variants 18° apart across chars, 72° apart within a
// char) so same-silhouette characters never share a palette. Verified by harness/palette_audit.mjs.
//
// FORM_PREFIXES: chars whose transform-form sheets must ALSO be recolored ("all forms" — user
// choice). The transform code retags _skinAnim by the fighter's active tag (abilities.js).

export const FORM_PREFIXES = {
  vegeta:     ["vegeta_ssj_", "vegeta_blue_", "vegeta_ssj_blue_"],
  goku_black: ["goku_black_ssj_rose_"],
  // Ben 10's playable forms are Omnitrix ALIENS whose sheets live in fighters.js BEN10_FORM_ANIM
  // (NOT characters.ben10.animationData), so the reanim pass must reach them by disk prefix — otherwise
  // an Edo-Tensei-reanimated Ben renders his alien body in full colour. applyAlien retags _skinAnim by
  // the active tag (fighters.js _retagAlienAnim), mirroring the transform-form path above.
  ben10:      ["ben10_xlr8_", "ben10_diamond_head_", "feedback_"],
};

// Reanimation (Part 2): ONE near-black desaturated pass per char — NOT a selectable skin; applied
// only during Edo Tensei. Colorize into a cold dark slate: heavy grayscale, faint blue, low bright.
export const REANIM = { tag: "reanim", mode: "colorize", deg: 200, sat: 0.55, bright: 0.42, name: "Reanimated" };

// Repopulated in Part 2 via the NEW targeted color-replacement tool (tools/recolor_palette.py) — NOT
// global hue-rotate. Each entry only needs { tag, name } (skins.js recolorSkins reads those); the
// `note` records the tool invocation that produced the __<tag> sheets so it's reproducible.
export const ALT_SKINS = {
  // ══ BATCH 1 · DRAGON BALL ═══════════════════════════════════════════════════
  // Standard set BLACK/PINK/GOLD/BLUE/RED, skipping the color each char already IS. All targeted
  // (tools/recolor_palette.py) — costume region only; skin/hair/outlines/other colors untouched.
  //
  // GOKU — orange gi (hue 2-48, sat≥0.50; skin is lower-sat & preserved). Not natively any of the 5
  // → all 5 generated. Blue undershirt (hue ~215) left alone.
  // NOTE: "black" SKIPPED — a black-gi Goku reads as the Goku Black CHARACTER (same universe, same
  // base body = identity collision). Same rationale as skipping a color a char already is.
  goku: [
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> to-hue 330 sat .55 val-gain 1.15" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> to-hue 48 sat .92 val-gain 1.25" },
    { tag: "blue",  name: "Blue",  mode: "region", note: "-> to-hue 214 sat .85 val-gain 1.05" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> to-hue 2 sat .95" },
  ],
  // VEGETA — blue bodysuit (hue 195-235, sat≥0.30). IS blue → skip BLUE. White armor / gold boots /
  // skin preserved. Recolored across all 3 forms (base + SSJ + SSJ Blue); SSJ keeps its gold hair.
  vegeta: [
    { tag: "black", name: "Black", mode: "region", note: "from-hue 195-235 min-sat .30 -> desat val-gain .55" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> to-hue 330 sat .55 val-gain 1.25" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> to-hue 47 sat .90 val-gain 1.55" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> to-hue 5 sat .90 val-gain 1.25" },
  ],
  // BEERUS — blue outfit (hue 185-235, sat≥0.35). IS blue → skip BLUE. PURPLE SKIN (hue ~258-277) and
  // gold trim are outside the selection → fully preserved.
  beerus: [
    { tag: "black", name: "Black", mode: "region", note: "from-hue 185-235 min-sat .35 -> desat val-gain .5" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> to-hue 330 sat .55 val-gain 1.0" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> to-hue 47 sat .90 val-gain 1.15" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> to-hue 5 sat .90 val-gain 1.05" },
  ],
  // GOKU BLACK — near-grayscale gi. IS black → skip BLACK. COLORIZE (min-sat 0, max-sat 0.18) scoped to
  // the body (yband 0.26-1.0) so the black HAIR stays black; red sash & skin (higher sat) preserved.
  // Recolored across the SSJ Rose form too. val-gain lifts the near-black gi so the color reads.
  // Goku Black's 4 old abstract-hue recolors (pink/gold/blue/red) were REMOVED 2026-08-01, superseded by
  // the 12 hand-tuned per-region creative skins hardcoded in skins.js (tools/gen_goku_black_creative.py).
  goku_black: [],

  // ══ BATCH 2 · NARUTO ════════════════════════════════════════════════════════
  // NARUTO — KCM golden-orange chakra BODY (hue 5-66, sat≥.45; recolors the whole glow, black seals
  // kept). IS golden → skip GOLD. Effect/summon sheets (rasengan/clones/Kurama) aren't in his
  // animationData so they keep default colors.
  naruto: [
    { tag: "black", name: "Black", mode: "region", note: "from-hue 5-66 min-sat .45 -> desat val-gain .5" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> to-hue 330 sat .70 val-gain .95" },
    { tag: "blue",  name: "Blue",  mode: "region", note: "-> to-hue 214 sat .80 val-gain .90" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> to-hue 2 sat .90 val-gain .95" },
  ],
  // SASUKE — navy+purple clothing (hue 200-280, sat≥.18; dark → val-gain 2.0). IS dark → skip BLACK.
  // Grey top / skin / hair preserved (grey top is a neutral, like Vegeta's white armor).
  sasuke: [
    { tag: "pink", name: "Pink", mode: "region", note: "from-hue 200-280 min-sat .18 -> to-hue 330 sat .60 val-gain 2.0 lift .10" },
    { tag: "gold", name: "Gold", mode: "region", note: "-> to-hue 47 sat .85 val-gain 2.2 lift .10" },
    { tag: "blue", name: "Blue", mode: "region", note: "-> to-hue 210 sat .85 val-gain 2.0 lift .10" },
    { tag: "red",  name: "Red",  mode: "region", note: "-> to-hue 3 sat .90 val-gain 2.0 lift .10" },
  ],
  // ITACHI — black Akatsuki cloak (colorize, sat 0-.18, yband .20-1 keeps hair black; red clouds
  // sat>.18 stay red). IS black → skip BLACK. val-gain lifts the near-black cloak so color reads.
  itachi: [
    { tag: "pink", name: "Pink", mode: "region", note: "colorize min-sat 0 max-sat .18 yband .20-1 -> to-hue 330 sat .60 val-gain 2.0 lift .10" },
    { tag: "gold", name: "Gold", mode: "region", note: "-> to-hue 47 sat .85 val-gain 2.1 lift .10" },
    { tag: "blue", name: "Blue", mode: "region", note: "-> to-hue 214 sat .80 val-gain 2.0 lift .10" },
    { tag: "red",  name: "Red",  mode: "region", note: "-> to-hue 5 sat .85 val-gain 2.0 lift .10" },
  ],
  // TOBIRAMA — blue armor (hue 195-255, sat≥.13). IS blue → skip BLUE. Gold from the Part 1 test.
  tobirama: [
    { tag: "black", name: "Black", mode: "region", note: "from-hue 195-255 min-sat .13 -> desat val-gain .6" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> to-hue 330 sat .60 val-gain 1.5" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> to-hue 47 to-sat .9 val-gain 1.7 (Part 1 test)" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> to-hue 5 sat .90 val-gain 1.4" },
  ],

  // ══ BATCH 3 · JUJUTSU KAISEN ════════════════════════════════════════════════
  // Coexists with the bespoke costumes gojo2/sukuna3/pinkFit/megumi2 (different ids).
  // GOJO — black shirt + white pants (colorize, yband .24-1 keeps WHITE HAIR; blue eyes kept). IS
  // black (shirt) → skip standard BLACK. Plus 3 NAMED requests. Ben10/Albedo use VALUE to split
  // shirt(dark)/pants(light) so they're pose-independent across all his sheets.
  // REDONE 2026-07-28 (reference-sampled MULTI-TONE hair variants via recolor_palette.py --to-tone).
  // The prior abstract-hue hair set (pink/gold/blue/red outfit + old pinkhair) was flagged as looking
  // wrong (patchy/flat on Gojo's multi-tonal white hair) and DELETED. Kept the two already-approved
  // bespoke-palette variants (Ben 10, Albedo). New hair-only variants use explicit SAMPLED target hexes,
  // re-centering the hair's mid tone on the target while preserving its highlight/shadow spread.
  // Hair selection: yband 0-.28, near-gray (max-sat .22), min-val .30 (keeps black outline + black shirt).
  // Gojo — ALL recolor skins removed (2026-07-29). Deferred until the base sprite's
  // transparency/missing-pixel bug is repaired; recoloring broken base art propagates the bug.
  // (Former tags: ben10, albedo, cyanhair, purplehair, orangehair, pinkhair.)
  gojo: [],
  // SUKUNA — ALL recolor skins removed 2026-07-30 (the black/gold/blue/red set only recoloured the navy
  // uniform, leaving hair + eyes mismatched — the exact problem being fixed). Rebuilt as 4 coordinated
  // head-to-toe colour skins (hair + outfit + eyes) via tools/gen_sukuna_creative.py, registered directly
  // in skins.js (like the Rengoku/Shinobu creative batches), NOT through this abstract-hue manifest.
  // (Former tags: black, gold, blue, red.)
  sukuna: [],
  // MEGUMI — dark navy JJK uniform (hue 230-262, sat≥.30, dark → val-gain). IS dark → skip BLACK.
  // Black hair / skin / brown shoes preserved.
  megumi: [
    { tag: "pink", name: "Pink", mode: "region", note: "from-hue 230-262 min-sat .30 -> to-hue 330 sat .60 vg2.4 lift .12" },
    { tag: "gold", name: "Gold", mode: "region", note: "-> to-hue 47 sat .85 vg2.6 lift .12" },
    { tag: "blue", name: "Blue", mode: "region", note: "-> to-hue 210 sat .85 vg2.3 lift .12" },
    { tag: "red",  name: "Red",  mode: "region", note: "-> to-hue 3 sat .90 vg2.3 lift .12" },
  ],
  // TOJI — dark top + white pants (colorize, yband .22-1 keeps hair; saturated noise speckles sat>.22
  // stay). IS black → skip BLACK. Colored pants are the main statement; skin/hair preserved.
  toji: [
    { tag: "pink", name: "Pink", mode: "region", note: "outfit colorize min-sat 0 max-sat .22 yband .22-1 -> to-hue 330 sat .60 vg1.8 lift .10" },
    { tag: "gold", name: "Gold", mode: "region", note: "-> to-hue 47 sat .85 vg2.0 lift .10" },
    { tag: "blue", name: "Blue", mode: "region", note: "-> to-hue 214 sat .80 vg1.8 lift .10" },
    { tag: "red",  name: "Red",  mode: "region", note: "-> to-hue 5 sat .85 vg1.8 lift .10" },
  ],

  // ══ BATCH 4 · HUNTER x HUNTER ═══════════════════════════════════════════════
  // NETERO — blue shorts + shoulder straps (hue 200-225, sat≥.40, dark → val-gain). IS blue → skip
  // BLUE. Bare skin (lots), white tanktop, and the orange nen "念" symbol all preserved.
  netero: [
    { tag: "black", name: "Black", mode: "region", note: "from-hue 200-225 min-sat .40 -> desat val-gain .6" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> to-hue 330 sat .60 vg1.5" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> to-hue 47 sat .88 vg1.7" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> to-hue 5 sat .90 vg1.5" },
  ],
  // KILLUA — standard set recolors the OUTFIT (white shirt + purple shorts, 2-pass; silver hair
  // protected via yband .40-1, skin/pink-shoes kept). Not natively any of the 5 → all 5. PLUS the 3
  // NAMED hair-only variants (silver hair → brown/black/pink, EVERYTHING else kept default).
  // REDONE 2026-07-28 — hair-only variants only (the outfit black/pink/gold/blue/red set was NOT
  // requested for Killua and was DELETED; the prior hair set was flagged as wrong/patchy and rebuilt).
  // Reference-sampled MULTI-TONE tone-remap: silver hair's mid tone re-centered on the target while its
  // highlight/shadow spread is preserved. Selection: yband 0-.36, near-gray (max-sat .22), min-val .16
  // (keeps the black outline black), which isolates the top-of-head hair from the white turtleneck/shirt.
  killua: [
    { tag: "blackhair", name: "Black Hair", mode: "region", note: "hair -> to-tone #1A1A22 spread .85 (reference target)" },
    { tag: "brownhair", name: "Brown Hair", mode: "region", note: "hair -> to-tone #6E4A2C spread .90" },
    { tag: "pinkhair",  name: "Pink Hair",  mode: "region", note: "hair -> to-tone #E86AA6 spread .90" },
  ],

  // ══ BATCH 5 · POWER RANGERS / RICK & MORTY / SAIKI K / DC ════════════════════
  // OMEGA RANGER — the 5 old crude whole-suit hue recolors (black/pink/gold/blue/red) were REMOVED
  // (2026-07-31, user amendment "delete old skins first") ahead of the 12-skin per-region creative set
  // built via tools/gen_omega_creative.py and registered DIRECTLY in skins.js (like Rick/Rengoku/Gojo).
  // Empty entry adds nothing via recolorSkins; the legacy __{black,pink,gold,blue,red} sheets were
  // deleted from disk (reanim kept). Same cleanup precedent as Rick below.
  omega_ranger: [],
  // RICK — the 5 old pants-only recolors (black/pink/gold/blue/red) were REMOVED (2026-07-29) ahead of
  // a fresh 8-skin creative set built via tools/gen_rick_creative.py (per-region: hair/coat/shirt/pants).
  rick: [],
  // SAIKI — green suit (hue 125-165, sat≥.40). IS pink (hair/limiters) → skip PINK. Pink hair, green
  // eyes, skin, blue shoes preserved. (Note: the Part-0-removed saikiAzure is superseded by these.)
  saiki: [
    { tag: "black", name: "Black", mode: "region", note: "from-hue 125-165 min-sat .40 -> desat vg.6" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> gold h47 sat .88 vg1.3" },
    { tag: "blue",  name: "Blue",  mode: "region", note: "-> blue h214 sat .85 vg1.15" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> red h5 sat .90 vg1.15" },
  ],
  // FLASH — red suit (hue 345-15, sat≥.50). IS red → skip RED; has bespoke flashBlue → skip BLUE.
  // Yellow boots/lightning kept for standard. NAMED "Reverse Flash" = red<->yellow swap (3-pass via a
  // temp hue so the two swap simultaneously): suit→yellow, boots+chest-bolt→red. NAMED "Godspeed" =
  // white/pale-electric-blue "God Speed Force" whiteout (2-pass): red suit→near-white pale blue, yellow
  // bolts/boots→electric blue — distinct from base(red/yellow), flashBlue(saturated blue), reverse(yellow).
  flash: [
    { tag: "black",    name: "Black", mode: "region", note: "red suit -> desat vg.6 (yellow boots kept)" },
    { tag: "pink",     name: "Pink",  mode: "region", note: "-> pink h330 sat .75" },
    { tag: "gold",     name: "Gold",  mode: "region", note: "-> gold h48 sat .92" },
    { tag: "reverse",  name: "Reverse Flash", mode: "region", note: "NAMED: red<->yellow swap (r->temp h120, yellow->red, temp->yellow); preserves sat/val" },
    { tag: "godspeed", name: "Godspeed", mode: "region", note: "NAMED: 2-pass whiteout — red suit(345-15,sat.42)->to-hue205 sat.16 vg1.35 vl.05 (near-white pale blue); yellow(40-66,sat.42)->to-hue200 sat.48 vg1.12 (electric-blue bolts/boots)" },
  ],
};
