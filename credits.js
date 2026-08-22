// credits.js
// ──────────────────────────────────────────────────────────────────────────
// IN-GAME ATTRIBUTION — the single source of truth for who made the art.
//
// Some sprite sheets are SOURCED from community/M.U.G.E.N artists whose terms are
// "free to use, credit me." Those credits used to live ONLY in CREDITS.txt / gojo_CREDITS.txt
// and no player ever saw them. This module puts them in front of players: on the scrolling
// Credits screen AND as a per-character "Art:" line on the select screen (the credit the
// artists actually asked for, shown where it matters).
//
// HARD RULE (enforced by harness/credits.test.mjs): EVERY roster key must appear in either
// SOURCED_ART or PROJECT_ART_KEYS. The test fails — listing the offending sheet files — if any
// character's art is unattributed. So every new sourced sheet MUST add a credits entry in the
// same commit; you cannot ship art whose provenance is undeclared.
// ──────────────────────────────────────────────────────────────────────────

// ── SOURCED sprite art with required named attribution (from the repo's *_CREDITS.txt) ──
// `files` are filename GLOBS (for the in-game listing + the test's file report). `artists` is
// the credit line the sheet's terms require; `edit` is a secondary "edited/credited by" note.
export const SOURCED_ART = {
  gojo: {
    work:    "Gojo Satoru (Shinjuku arc)",
    artists: ["FinhJ", "ZeurasBlack", "Rob4n"],
    source:  "M.U.G.E.N sheet",
    files:   ["gojo_*_sheet.png", "gojo_sheet_source.png"]
  },
  // Alternate Sukuna (JJK) — a SEPARATE char from `sukuna`, built from the Cinontk/Bitsverse644 rip
  // (sukuna_row_*.png). The source sheet carries an explicit anti-repost watermark crediting the original
  // spriter Cinontk and the sheet compiler Bitsverse644 (Bits Verse on YT); attribution is MANDATORY.
  alt_sukuna: {
    work:    "Ryomen Sukuna (Jujutsu Kaisen) — alternate-universe build",
    artists: ["Cinontk (original sprites)", "Bitsverse644 / Bits Verse (sheet compilation)"],
    source:  "fan sprite sheet (sukuna_row_01..10.png; watermarked, credit to Cinontk / @BITSVerse644)",
    files:   ["alt_sukuna_*.png", "sukuna_row_*.png"]
  },
  // Aoi Todo (JJK). Source sheets carry an in-sheet credit: "By akuma animation (with edits/palette
  // improvements by MichelST)". Attribution is MANDATORY. NOTE: the Yuji/Gojo cameo entities render the
  // existing yuji_*/gojo_* art (already attributed under their own keys).
  aoi_todo: {
    work:    "Aoi Todo (Jujutsu Kaisen)",
    artists: ["akuma animation (original sprites)", "MichelST (edits / palette improvements)"],
    source:  "fan sprite sheet (aoitodo_row_01/02.png; in-sheet credit to akuma animation / MichelST)",
    files:   ["aoi_todo_*.png", "aoitodo_row_*.png"]
  },
  // Yuta Okkotsu (JJK). Source sheets carry an in-sheet credit: Yuta "Made by Soulfire — Petamynx, Dano,
  // Santoryu"; Rika "Made by Soulfire — V2 remodel thanks to shaulmorales". Attribution is MANDATORY.
  // The Rika assist entity renders the rika_*/rika_v2_* art (same Soulfire lineage).
  yuta: {
    work:    "Yuta Okkotsu (Jujutsu Kaisen) — incl. the Rika assist",
    artists: ["Soulfire (original sprites)", "Petamynx", "Dano", "Santoryu", "shaulmorales (Rika V2 remodel)"],
    source:  "fan sprite sheets (yuta_row_*.png / rika_v1_*/rika_v2_*.png; in-sheet credit to Soulfire et al.)",
    files:   ["yuta_*.png", "yuta_row_*.png", "rika_*.png", "rika_v1_*.png", "rika_v2_*.png"]
  },
  // The Handler (JJK) — NEW char from the removed Megumi's Ten-Shadows shikigami art + Mahoraga. The
  // Mahoraga source sheet carries a baked credit watermark: Discord "ARISRADIKLIF#3447" (+ 呪術廻戦 logo),
  // so attribution is MANDATORY. NOTE: the fushiguro/shibuya "Ten Shadows" base-sheet artists are NOT yet
  // identified from the baked text (labels were technique names, not signatures) — pin them here before
  // ship. The "by saxcreed" guest sprite is EXCLUDED by default (credit only if ever used).
  handler: {
    work:    "Megumi (Jujutsu Kaisen) — Ten Shadows shikigami + Mahoraga",
    artists: ["ARISRADIKLIF#3447 (Mahoraga sheet)", "Ten Shadows base-sheet artist — TBD (identify before ship)"],
    source:  "fan sprite sheets (mahoraga_*.png credit ARISRADIKLIF#3447; megumi fushiguro/shibuya sheets — artist TBD)",
    files:   ["handler_*.png", "mahoraga_*.png", "megumi_shibuya_*.png", "megumi_tokusa_*.png", "megumi_UNSEPARATED_*.png", "megumi_stance.png", "megumi_walk.png", "megumi_crouch.png", "megumi_jump.png", "megumi_hit.png", "megumi_attack_*.png"]
  },
  // Red Ranger (Jason, Mighty Morphin). Source REQUIRES credit to "Omega (tolgayavuz85)".
  red_ranger_mmpr: {
    work:    "Red Ranger — Jason (Mighty Morphin)",
    artists: ["Omega (tolgayavuz85)"],
    source:  "fan sprite sheet (red_ranger_mmpr_sprite_sheet_by_tolgayavuz_d738par.png)",
    files:   ["red_ranger_mmpr_*.png", "redranger_*.png"]
  },
  // Jason Voorhees (Friday the 13th). Fan-made, non-commercial personal project — full
  // attribution to the original DeviantArt sheet author is MANDATORY (mirrors Ghostface/Red Ranger).
  jason: {
    work:    "Jason Voorhees (Friday the 13th)",
    artists: ["xxultra2006xx (DeviantArt)"],
    source:  "fan sprite sheet (jason_voorhees_sprites_by_xxultra2006xx_dfgsawi.png)",
    files:   ["jason_*.png", "jason_voorhees_*.png"]
  },
  // Saitama (One Punch Man). Fan-made JUS-style sprite sheet — attribution to the original
  // DeviantArt author is MANDATORY (mirrors Jason/Ghostface/Red Ranger/Isshiki).
  saitama: {
    work:    "Saitama (One Punch Man)",
    artists: ["arzeer (DeviantArt)"],
    source:  "fan JUS-style sprite sheet (saitama_jus__by_arzeer_de00xcg.png)",
    files:   ["saitama_*.png"]
  },
  // Genos (One Punch Man). Fan-made teal-keyed master sprite sheet. ★ATTRIBUTION PENDING — the source
  // DeviantArt artist is not yet identified (file id ddk5eh3-5cfadb89-4c66-4fc4-b56f-bcb3d538c4f8.png).
  // Attribution is MANDATORY before ship (mirrors Saitama/Jason/Ghostface) — owner to confirm the author.
  genos: {
    work:    "Genos (One Punch Man)",
    artists: ["UNKNOWN — DeviantArt author pending (TODO: confirm before ship)"],
    source:  "fan sprite sheet (ddk5eh3-5cfadb89-4c66-4fc4-b56f-bcb3d538c4f8.png)",
    files:   ["genos_*.png"]
  },
  // Frieza (Dragon Ball Z: Extreme Butoden). Ripped 3DS fighting-game sprite sheet. ★ATTRIBUTION PENDING —
  // sprite-rip author not yet identified (likely The Spriters Resource). Confirm before ship.
  frieza: {
    work:    "Frieza (Dragon Ball Z: Extreme Butoden, base/final form)",
    artists: ["Arc System Works / Bandai Namco (original 3DS game); sprite-rip author UNKNOWN — TODO: confirm before ship"],
    source:  "ripped 3DS sprite sheet (3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Frieza.png)",
    files:   ["frieza_*.png"]
  },
  // Piccolo (Dragon Ball Z: Extreme Butoden). Ripped 3DS fighting-game sprite sheet (same source family as
  // Frieza). ★ATTRIBUTION PENDING — sprite-rip author not yet identified (likely The Spriters Resource).
  // Confirm before ship.
  piccolo: {
    work:    "Piccolo (Dragon Ball Z: Extreme Butoden)",
    artists: ["Arc System Works / Bandai Namco (original 3DS game); sprite-rip author UNKNOWN — TODO: confirm before ship"],
    source:  "ripped 3DS sprite sheet (3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Piccolo.png)",
    files:   ["piccolo_*.png"]
  },
  // Isshiki Otsutsuki (Naruto / Boruto). Fan-made sprite sheet — attribution to the original
  // DeviantArt author is MANDATORY (mirrors Jason/Ghostface/Red Ranger).
  isshiki: {
    work:    "Isshiki Otsutsuki (Boruto)",
    artists: ["AltairFrameMaker (DeviantArt)"],
    source:  "fan sprite sheet (isshiki_otsutsuki_nzc_by_altair_by_altairframemaker_deta3ps.png)",
    files:   ["isshiki_*.png", "isshiki_otsutsuki_*.png"]
  },
  // Six Paths of Pain (Naruto) — the six-body multi-identity char (SEPARATE from the solo `pain`).
  // Fan-made compilation sheet; the master p1_pain_tendo_row.png carried the credit block, transcribed
  // here. Primary compiler DasonPikXD; the sheet lists numerous contributing spriters. Attribution to
  // the original DeviantArt authors is MANDATORY (mirrors Jason/Isshiki/Ghostface).
  six_paths_pain: {
    work:    "Six Paths of Pain (Naruto)",
    artists: ["DasonPikXD (compiler)", "Namèd", "MattFv", "Ender", "Scrxtchy", "Puig_096 (Felipe)", "Hordebib Spriter", "Sasa/-666", "Depokun", "Ropaa444", "Sasuke Sp", "DUX44", "Team Popo"],
    source:  "fan compilation sprite sheet (Six Paths of Pain; credit block on p1_pain_tendo_row.png)",
    files:   ["sixpaths_*.png"]
  },
  // Hiruzen Sarutobi (Naruto), the Third Hokage. Fan-made sprite sheet — attribution to the original
  // DeviantArt author is MANDATORY (mirrors Jason/Isshiki/Ghostface). The raw dash/jump/back_jump strips
  // shipped with a DeviantArt watermark; it was removed for this project (originals in _hiruzen_raw_backup/).
  hiruzen: {
    work:    "Hiruzen Sarutobi (Naruto)",
    artists: ["juanshoalmao (DeviantArt)"],
    source:  "fan sprite sheet (hiruzen_sarutobi_nzc_by_juanshoalmao_dcgqnsk-fullview.jpg)",
    files:   ["hiruzen_*.png", "hiruzen_sarutobi_*.png"]
  },
  // Light Yagami (Death Note). Fan-made JUS sprite sheet — the master sheet embeds "make by prodijiu",
  // so attribution to the original author is MANDATORY (mirrors Saitama/Jason/Isshiki). Resliced feet-aligned
  // in-repo by tools/reslice_light.py. The resliced strips ship as light_*.png (not light_yagami_*).
  light: {
    work:    "Light Yagami (Death Note)",
    artists: ["prodijiu (DeviantArt)"],
    source:  "fan JUS sprite sheet (light_yagami_jus_sprite_by_prodijiu_d6j521b.png)",
    files:   ["light_yagami_*.png", "light_*_uniform.png", "light_portrait*.png", "light_idle_uniform.png"]
  },
  // Spider-Man (Marvel Super Heroes, Capcom CPS2 arcade system). GENUINE arcade sprite rip — the ripper's
  // required credit is verbatim: "Spiderman from Marvel Superheroes for Capcom CPS2 Arcade system. Ripped
  // by Alvin-Earthworm." Attribution is MANDATORY (mirrors the other sourced sheets). Resliced feet-aligned
  // in-repo by tools/reslice_spiderman.py; the resliced strips ship as spiderman_*_uniform.png.
  spiderman: {
    work:    "Spider-Man (Marvel Super Heroes, Capcom CPS2 arcade)",
    artists: ["Alvin-Earthworm (rip)"],
    source:  "CPS2 arcade sprite rip (Arcade - Marvel Super Heroes - Fighters - Spider-Man.gif)",
    files:   ["spiderman_*.png"]
  },
  green_lantern: {
    work:    "Green Lantern (Hal Jordan, DC)",
    artists: ["cf2364 (sprite sheet)", "enzo (original)"],
    source:  "DeviantArt fan sprite sheet — green_lantern__hal__sprite_sheet__originalbyenzo__by_cf2364_dfirpm7.png (resliced into gl_*_uniform.png via tools/reslice_green_lantern.py)",
    files:   ["gl_*.png", "hal_sprite_*.png"]
  }
}

// ── PROJECT-ADAPTED sprite art (resliced / assembled / recolored for this fan project) ──
// Provenance for these is not individually documented; they are adapted & resliced in-repo.
// This list is EXPLICIT (not a wildcard) so a newly-added character is caught by the test until
// its provenance is declared — either here, or in SOURCED_ART with a named artist.
export const PROJECT_ART_KEYS = [
  "goku", "goku_black", "vegeta", "cell",   // frieza + piccolo MOVED to SOURCED_ART (now real ripped sprite sheets, no longer procedural project-art)
  "sukuna", "omololu", "maki", "yuji",
  "naruto", "sasuke", "itachi", "tobirama", "hashirama", "minato", "madara", "obito", "tobi",
  "zenitsu", "rengoku", "shinobu", "inosuke", "nezuko",
  "rick", "morty", "evilMorty", "rickPrime",
  "beerus", "ben10", "albedo", "omniman",
  "omega_ranger", "samurai_red_ranger", "gold_samurai_ranger", "green_samurai_ranger",
  "netero", "saiki", "killua", "flash", "gon", "batman", "hisoka", "superman",
  "chrollo", "ghostface", "miwa", "ichigo", "zaraki", "zaraki_shikai",
  // Orochimaru — NZC-style fan sprite sheet (same family as the other Naruto chars), resliced in-repo
  // by tools/reslice_orochimaru.py. Raw sheets shipped generic p1_/p2_ names with NO baked artist text;
  // provenance not individually documented → project-adapted bucket. Move to SOURCED_ART if an artist surfaces.
  "orochimaru",
  // Onoki (Third Tsuchikage, Naruto) — NZC-style fan sprite sheet delivered as generic numbered onoki_row_NN.png
  // strips with NO baked artist text; resliced in-repo by tools/reslice_onoki.py → project-adapted bucket.
  // Move to SOURCED_ART if an artist surfaces.
  "onoki",
  // Mayuri Kurotsuchi (12th-Division captain, Bleach) — fan sprite sheet delivered as generic numbered
  // mayuri_kurotsuchi_row_NN.png strips with NO baked artist text; resliced in-repo by
  // tools/reslice_mayuri.py → project-adapted bucket. Move to SOURCED_ART if an artist surfaces.
  "mayuri",
  // Kiba Inuzuka (+ Akamaru, Naruto) — fan sprite sheet delivered as generic per-action kiba_*.png files
  // with NO baked artist text (a handful of source frames carried joke/troll text — those were EXCLUDED,
  // not shipped); resliced in-repo by tools/reslice_kiba.py → project-adapted bucket. Move to SOURCED_ART
  // if an artist surfaces.
  "kiba",
  // Boruto Uzumaki (Naruto/Boruto) — fan sprite sheet delivered as generic per-action boruto_*.png files
  // (a handful carried baked-in blue move-name text labels — stripped, not shipped); resliced in-repo by
  // tools/reslice_boruto.py → project-adapted bucket. Move to SOURCED_ART if an artist surfaces.
  "boruto",
  // Byakuya Kuchiki (Squad-6 captain, Bleach) — fan sprite sheet delivered as generic numbered
  // Byakuya_Kuchiki_row_NN.png strips with NO baked artist text; resliced in-repo by tools/reslice_byakuya.py
  // → project-adapted bucket. Move to SOURCED_ART if an artist surfaces.
  "byakuya",
  // L "Ryuuzaki" (Death Note) — fan sprite delivered as 29 keyed per-action/numbered l_ryuuzaki_*.png
  // strips with NO baked artist text; keyed by tools/slice_l_ryuuzaki.py and resliced feet-aligned in-repo
  // by tools/reslice_l_ryuuzaki.py → project-adapted bucket. Move to SOURCED_ART if an artist surfaces.
  "l_ryuuzaki",
  // Deathstroke (Slade Wilson, DC) — fan sprite sheet delivered as generic numbered deathstroke_row_NN.png
  // strips with NO baked artist text (the source carried a "DEATHSTROKE" title card + a mask-portrait icon,
  // both carved out — the title excluded, the icon repurposed as the portrait); resliced in-repo by
  // tools/reslice_deathstroke.py → project-adapted bucket. Move to SOURCED_ART if an artist surfaces.
  "deathstroke",
  // Brainiac (DC) — fan sprite sheet delivered as generic numbered brainiac_row_NN.png strips with NO baked
  // artist text (a small skull HUD glyph in row_01 was reference-only, excluded); resliced in-repo by
  // tools/reslice_brainiac.py → project-adapted bucket. Move to SOURCED_ART if an artist surfaces.
  "brainiac",
  // Batman NEW VARIANT ("dark_knight", DC) — single 5120x2880 true-alpha DeviantArt sheet
  // (df2ek1u-...-e247c4.png), resliced in-repo by tools/reslice_dark_knight.py. The filename is a
  // DeviantArt asset ID only; ARTIST IS UNKNOWN → project-adapted bucket for now. ★ATTRIBUTION OPEN —
  // MANDATORY before ship; move to SOURCED_ART once the artist is identified.
  "dark_knight"
]

// Every roster key that has a declared attribution (sourced OR project-adapted).
export function allAttributedKeys() {
  return new Set([...Object.keys(SOURCED_ART), ...PROJECT_ART_KEYS])
}

// The attribution record for a character (or null if undeclared — the test catches those).
export function attributionForCharacter(key) {
  if (SOURCED_ART[key]) return { ...SOURCED_ART[key], sourced: true }
  if (PROJECT_ART_KEYS.includes(key)) return { work: key, project: true, sourced: false }
  return null
}

// The tiny "Art: <name>" line shown under a character's portrait on select. Returned ONLY for
// sourced art with named artists (that's the credit the artists asked for); null otherwise, so
// project-adapted cards stay uncluttered.
export function artistLineForCharacter(key) {
  const a = SOURCED_ART[key]
  if (!a || !a.artists?.length) return null
  const edit = a.edit ? ` · edit ${a.edit}` : ""
  return `Art: ${a.artists.join(", ")}${edit}`
}

// ── LEGAL NOTICE — the standing non-commercial fan-project notice, verbatim from CREDITS.txt ──
export const LEGAL_NOTICE = [
  "This is a non-commercial personal fan project. All characters and source",
  "material are the property of their respective creators and rights holders."
]

// ── STRUCTURED CREDITS for the scrolling screen ──────────────────────────────
// A flat, render-friendly section list. `entries` are attribution rows; `lines` are freeform
// text (notes / legal). The Sprite Art section leads with the named-artist requirements, then a
// blanket note covering the adapted-for-project sheets so nothing is silently unattributed.
export const CREDITS = [
  {
    section: "Sprite Art",
    entries: Object.values(SOURCED_ART).map(a => ({
      work:    a.work,
      artists: a.edit ? [...a.artists, `edit: ${a.edit}`] : a.artists,
      source:  a.source
    })),
    lines: [
      "",
      "All other fighter sprites were adapted, resliced, recolored and assembled",
      "for this project from community sheets and reference art. If a sheet is yours",
      "and you'd like a specific credit, get in touch and it will be added here."
    ]
  },
  {
    section: "Audio — Voice & SFX",
    lines: [
      "Character voice lines are clips from the respective anime dubs, games and",
      "sources, curated per character for this non-commercial fan project.",
      "Sound effects and menu music are used under the same fan-project terms."
    ]
  },
  {
    section: "Engine & Code",
    entries: [
      { work: "Multiverse Smash — game engine, movesets, tools & harness", artists: ["Omololu Adaramola"] }
    ],
    lines: [
      "",
      "Built in vanilla JS + Canvas. No frameworks.",
      "Playwright drives the verification harness."
    ]
  },
  {
    section: "Notice",
    lines: LEGAL_NOTICE
  }
]
