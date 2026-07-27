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
  goku_black: [
    { tag: "pink", name: "Pink", mode: "region", note: "colorize min-sat 0 max-sat .18 yband .26-1 -> to-hue 330 sat .60 val-gain 1.9 lift .10" },
    { tag: "gold", name: "Gold", mode: "region", note: "-> to-hue 47 sat .85 val-gain 2.0 lift .10" },
    { tag: "blue", name: "Blue", mode: "region", note: "-> to-hue 214 sat .80 val-gain 1.9 lift .10" },
    { tag: "red",  name: "Red",  mode: "region", note: "-> to-hue 5 sat .85 val-gain 1.9 lift .10" },
  ],

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
  gojo: [
    { tag: "pink", name: "Pink", mode: "region", note: "outfit colorize min-sat 0 max-sat .16 yband .24-1 -> to-hue 330 sat .80 vg1.35" },
    { tag: "gold", name: "Gold", mode: "region", note: "-> to-hue 47 sat .90 vg1.40" },
    { tag: "blue", name: "Blue", mode: "region", note: "-> to-hue 214 sat .85 vg1.30" },
    { tag: "red",  name: "Red",  mode: "region", note: "-> to-hue 5 sat .90 vg1.30" },
    // NAMED: pink HAIR + pink EYES (clothing untouched) — per-region, 2-pass.
    { tag: "pinkhair", name: "Pink Hair", mode: "region", note: "hair(yband 0-.27 light) -> pink + eyes(hue 170-210) -> pink" },
    // NAMED: Ben 10 palette (green pants + black shirt kept) — value min-val .5 selects pants only.
    { tag: "ben10", name: "Ben 10", mode: "region", note: "pants(yband .24-1 min-val .5) -> green h130 sat .75" },
    // NAMED: Albedo palette (white pants+hair / red shirt / gold eyes) — value max-val .45 = shirt only, 2-pass.
    { tag: "albedo", name: "Albedo", mode: "region", note: "shirt(max-val .45) -> red vg2.6 + eyes -> gold h47" },
  ],
  // SUKUNA — dark navy uniform (hue 230-262, sat≥.30, dark → val-gain). IS pink (hair) → skip PINK.
  // Pink hair + crimson scarf/shoes (hue ~350) preserved.
  sukuna: [
    { tag: "black", name: "Black", mode: "region", note: "from-hue 230-262 min-sat .30 -> desat val-gain .7" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> to-hue 47 sat .88 vg2.3 lift .10" },
    { tag: "blue",  name: "Blue",  mode: "region", note: "-> to-hue 210 sat .85 vg2.1 lift .10" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> to-hue 3 sat .90 vg2.1 lift .10" },
  ],
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
  killua: [
    { tag: "black", name: "Black", mode: "region", note: "outfit 2-pass: shirt(yband .40-1 colorize)+shorts(hue 245-278) -> desat" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> pink h330" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> gold h47" },
    { tag: "blue",  name: "Blue",  mode: "region", note: "-> blue h214" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> red h5" },
    { tag: "brownhair", name: "Brown Hair", mode: "region", note: "NAMED hair-only: silver(yband 0-.40) -> brown h25 sat .55 vg.60" },
    { tag: "blackhair", name: "Black Hair", mode: "region", note: "NAMED hair-only: -> black desat vg.28" },
    { tag: "pinkhair",  name: "Pink Hair",  mode: "region", note: "NAMED hair-only: -> pink h330 sat .55" },
  ],

  // ══ BATCH 5 · POWER RANGERS / RICK & MORTY / SAIKI K / DC ════════════════════
  // OMEGA RANGER — colorize the WHITE suit (min-sat 0, max-sat .15); navy chest / gold trim / red
  // visor kept. Fully helmeted (no skin/hair) → robust, no yband. White isn't in the 5 → all 5.
  omega_ranger: [
    { tag: "black", name: "Black", mode: "region", note: "colorize white suit -> desat vg.5" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> pink h330 sat .60" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> gold h47 sat .85" },
    { tag: "blue",  name: "Blue",  mode: "region", note: "-> blue h214 sat .80" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> red h5 sat .85" },
  ],
  // RICK — recolors the brown PANTS (hue 32-52, sat≥.45; sat-separated from skin, pose-independent).
  // His white coat = same near-neutral color profile as his pale skin (inseparable), and his teal
  // shirt shares hue with his iconic blue hair — so pants is the only clean/robust target.
  rick: [
    { tag: "black", name: "Black", mode: "region", note: "pants hue 32-52 min-sat .45 -> desat vg.7" },
    { tag: "pink",  name: "Pink",  mode: "region", note: "-> pink h330 sat .62 vg1.5" },
    { tag: "gold",  name: "Gold",  mode: "region", note: "-> gold h47 sat .88 vg1.6" },
    { tag: "blue",  name: "Blue",  mode: "region", note: "-> blue h214 sat .85 vg1.6" },
    { tag: "red",   name: "Red",   mode: "region", note: "-> red h5 sat .88 vg1.5" },
  ],
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
  // temp hue so the two swap simultaneously): suit→yellow, boots+chest-bolt→red.
  flash: [
    { tag: "black",   name: "Black", mode: "region", note: "red suit -> desat vg.6 (yellow boots kept)" },
    { tag: "pink",    name: "Pink",  mode: "region", note: "-> pink h330 sat .75" },
    { tag: "gold",    name: "Gold",  mode: "region", note: "-> gold h48 sat .92" },
    { tag: "reverse", name: "Reverse Flash", mode: "region", note: "NAMED: red<->yellow swap (r->temp h120, yellow->red, temp->yellow); preserves sat/val" },
  ],
};
