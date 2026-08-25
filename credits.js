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
  // Superman (Custom / DC Universe Customs) — a SEPARATE char from `superman` (Arcade), the 2nd of 4 Superman
  // roster entries. The source sheet carries a baked header credit: "Superman Sprites by Spellfire; Thanks
  // Nightmare, Sam and Mike Penner; ported by ProtoStar". Attribution is MANDATORY.
  superman_dcuc: {
    work:    "Superman (DC) — DC Universe Customs build",
    artists: ["Spellfire (original sprites)", "ProtoStar (port)", "Nightmare, Sam & Mike Penner (thanks)"],
    source:  "fan sprite sheet (Custom _ Edited - DC Universe Customs - Superman - Superman.png; in-sheet credit to Spellfire / ported by ProtoStar)",
    files:   ["superman_dcuc_*.png", "Custom _ Edited - DC Universe Customs - Superman - Superman.png"]
  },
  // Superman (New 52) — a SEPARATE char from `superman` (Arcade) and `superman_dcuc` (DCUC), the 3rd of 4
  // Superman roster entries. Source = a DeviantArt sprite sheet by immajadenyuki (file id
  // new_52_superman_sprite_by_immajadenyuki_d6mzx0p). Attribution is MANDATORY.
  superman_new52: {
    work:    "Superman (DC) — New 52 build",
    artists: ["immajadenyuki (DeviantArt)"],
    source:  "fan sprite sheet (new_52_superman_sprite_by_immajadenyuki_d6mzx0p-fullview.jpeg)",
    files:   ["superman_new52_*.png", "new_52_superman_sprite_by_immajadenyuki_d6mzx0p-fullview.jpeg"]
  },
  // Superman (Classic / SNES Justice League Task Force) — a SEPARATE char from `superman` (Arcade),
  // `superman_dcuc` (DCUC) and `superman_new52` (New 52), the 4th of 4 Superman roster entries. The source
  // sheet carries a baked credit: "Superman (Justice League Task Force) — Ripped by HjpdeKrypton". Original
  // game = Justice League Task Force (SNES, Sunsoft/Acclaim). Attribution is MANDATORY.
  superman_classic: {
    work:    "Superman (DC) — SNES Justice League Task Force build",
    artists: ["HjpdeKrypton (sprite rip)", "Sunsoft / Acclaim (original Justice League Task Force game)"],
    source:  "ripped SNES sprite sheet (SNES - Justice League Task Force - Fighters - Superman.png; in-sheet credit 'Ripped by HjpdeKrypton')",
    files:   ["superman_classic_*.png", "SNES - Justice League Task Force - Fighters - Superman.png"]
  },
  // Superman (Fighter) — a 5th SEPARATE Superman roster entry, built from the labeled B/Y/X custom sheet
  // dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png. ★ATTRIBUTION PENDING — the source is a DeviantArt asset
  // id with no baked artist name; the original author is not yet identified. MANDATORY before ship (mirrors
  // Genos/Frieza) — owner to confirm the DeviantArt author.
  superman_fighter: {
    work:    "Superman (DC) — custom B/Y/X fighting sheet",
    artists: ["UNKNOWN — DeviantArt author pending (TODO: confirm before ship)"],
    source:  "custom sprite sheet (dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png)",
    files:   ["superman_fighter_*.png", "dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png"]
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
  // Naoya Zenin (JJK) — same akuma animation sprite lineage as Aoi Todo. Attribution MANDATORY.
  naoya: {
    work:    "Naoya Zenin (Jujutsu Kaisen)",
    artists: ["akuma animation (original sprites)"],
    source:  "fan sprite sheet (naoya_*_uniform.png; in-sheet credit to akuma animation)",
    files:   ["naoya_*.png"]
  },
  // Dark Vegeta / "Vegeta Black" (Dragon Ball) — black-armor sheet credited to akuma animation
  // (with an additional mjdmadgaming mention on the source asset). Attribution MANDATORY.
  vegeta_dark: {
    work:    "Dark Vegeta (Dragon Ball)",
    artists: ["akuma animation (original sprites)", "mjdmadgaming (sheet)"],
    source:  "fan sprite sheet (vegeta_dark_*_uniform.png; in-sheet credit to akuma animation)",
    files:   ["vegeta_dark_*.png"]
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
  // Teen Gohan (Dragon Ball Z: Extreme Butoden). Ripped 3DS fighting-game sprite sheets (Base + Super Saiyan 2;
  // same source family as Goku/Piccolo/Frieza). ★ATTRIBUTION PENDING — sprite-rip author not yet identified
  // (likely The Spriters Resource). Confirm before ship.
  gohan: {
    work:    "Teen Gohan (Dragon Ball Z: Extreme Butoden)",
    artists: ["Arc System Works / Bandai Namco (original 3DS game); sprite-rip author UNKNOWN — TODO: confirm before ship"],
    source:  "ripped 3DS sprite sheets (3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan[ (Super Saiyan 2)].png)",
    files:   ["gohan_*.png"]
  },
  // Gotenks (Super Saiyan) (Dragon Ball Z: Extreme Butoden). Ripped 3DS fighting-game sprite sheet (single sheet;
  // same source family as Goku/Gohan/Piccolo/Frieza). ★ATTRIBUTION PENDING — sprite-rip author not yet identified
  // (likely The Spriters Resource). Confirm before ship.
  gotenks: {
    work:    "Gotenks (Super Saiyan) (Dragon Ball Z: Extreme Butoden)",
    artists: ["Arc System Works / Bandai Namco (original 3DS game); sprite-rip author UNKNOWN — TODO: confirm before ship"],
    source:  "ripped 3DS sprite sheet (3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Gotenks.png)",
    files:   ["gotenks_*.png"]
  },
  // Bardock (Dragon Ball Z: Extreme Butoden). Ripped 3DS fighting-game sprite sheet (single sheet;
  // same source family as Goku/Gohan/Gotenks/Piccolo/Frieza). ★ATTRIBUTION PENDING — sprite-rip author
  // not yet identified (likely The Spriters Resource). Confirm before ship.
  bardock: {
    work:    "Bardock (Dragon Ball Z: Extreme Butoden)",
    artists: ["Arc System Works / Bandai Namco (original 3DS game); sprite-rip author UNKNOWN — TODO: confirm before ship"],
    source:  "ripped 3DS sprite sheet (3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Bardock.png)",
    files:   ["bardock_*.png"]
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
  // Kakashi Hatake (Naruto). Source: Naruto Shippuden: Ninja Council 4 (DS/DSi) sprite rip. The
  // master sheet carries an in-sheet credit — "Ripped by Neimad", "Presented by the DS Ripping Forum",
  // "Give credit if used / Don't claim as own" — so attribution is MANDATORY. Resliced feet-aligned
  // in-repo by tools/reslice_kakashi.py (tight green-key box-index picks).
  kakashi: {
    work:    "Kakashi Hatake (Naruto)",
    artists: ["Neimad (sprite rip)", "DS Ripping Forum"],
    source:  "sprite rip from Naruto Shippuden: Ninja Council 4 (DS/DSi); in-sheet credit to Neimad / DS Ripping Forum",
    files:   ["kakashi_*.png"]
  },
  // Gwen Tennyson (Ben 10). Fan-made JUS-style chibi sheet — in-sheet credit to the original authors is
  // MANDATORY (mirrors other fan-sheet chars). Resliced feet-aligned in-repo by tools/reslice_gwen.py.
  gwen: {
    work:    "Gwen Tennyson (Ben 10)",
    artists: ["magnesiumselzune (spritework)", "justin kaiser (additional)", "renatoooferreiraaa (compiled/reposted)"],
    source:  "fan-made JUS-style sprite sheet (NOT an official game rip); in-sheet credit to magnesiumselzune + justin kaiser, reposted by renatoooferreiraaa",
    files:   ["gwen_*.png"]
  },
  // Vilgax (Ben 10). Fan-made JUS-style sprite sheet — in-sheet/DeviantArt credit MANDATORY (mirrors other
  // fan-sheet chars). Resliced feet-aligned in-repo by tools/reslice_vilgax.py. ★Deeper rip authorship
  // beyond regulardor8go is UNKNOWN — flagged as a ship BLOCKER to resolve before final release.
  vilgax: {
    work:    "Vilgax (Ben 10)",
    artists: ["regulardor8go (spritework)"],
    source:  "fan-made JUS-style sprite sheet (NOT an official game rip); credit to regulardor8go. Underlying character © Cartoon Network. Deeper rip authorship UNKNOWN (ship blocker).",
    files:   ["vilgax_*.png"]
  },
  // Miles Morales (Marvel / Spider-Man) — "JUS" (Jump Ultimate Stars)-style fan sprite sheet. The source
  // filename carries an explicit in-name artist credit: "by xxalexsmashxx". Attribution is MANDATORY.
  // Resliced feet-aligned in-repo by tools/reslice_miles.py; the resliced strips ship as miles_*_uniform.png.
  miles: {
    work:    "Miles Morales (JUS-style fan sprite sheet)",
    artists: ["xxalexsmashxx (sprite sheet)"],
    source:  "fan-made JUS-style sprite sheet (NOT an official game rip; in-name credit to xxalexsmashxx / DeviantArt dfsvf9b)",
    files:   ["miles_*.png", "miles_morales___jus_sprite_sheet___credits_desc_by_xxalexsmashxx*.jpg"]
  },
  // Ippo Makunouchi (Hajime no Ippo) — "JUS" (Jump Ultimate Stars)-style fan sprite sheet. The source
  // filename carries an explicit in-name artist credit: "by srchimuelo". Attribution is MANDATORY.
  // Resliced feet-aligned in-repo by tools/reslice_ippo.py; the resliced strips ship as ippo_*_uniform.png.
  ippo: {
    work:    "Ippo Makunouchi (JUS-style fan sprite sheet)",
    artists: ["srchimuelo (sprite sheet)"],
    source:  "fan-made JUS-style sprite sheet (NOT an official game rip; in-name credit to srchimuelo / DeviantArt dfv5jdo)",
    files:   ["ippo_*.png", "ippo_makunouchi_jus_sprite_sheet_by_srchimuelo*.png"]
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

  // Iron Man 1 (Marvel) — "JUS" (Jump Ultimate Stars)-style chibi fan sheet. The source filename carries an
  // explicit in-name artist credit: "by danorenovado" (DeviantArt id ddxdqsr). Attribution is MANDATORY.
  // Resliced feet-aligned in-repo by tools/reslice_iron_man.py; the resliced strips ship as iron_man_*_uniform.png.
  iron_man: {
    work:    "Iron Man (JUS-style chibi fan sprite sheet)",
    artists: ["danorenovado (original sprites)"],
    source:  "fan sprite sheet (iron_man_jus_sprite_sheet__old__by_danorenovado_ddxdqsr-375w-2x.jpg; in-name credit to danorenovado / DeviantArt ddxdqsr)",
    files:   ["iron_man_*.png", "iron_man_jus_sprite_sheet__old__by_danorenovado_ddxdqsr*.jpg"]
  },

  // Vegito Ultra Instinct -Sign- (Dragon Ball) — "JUS" (Jump Ultimate Stars)-style fan sprite sheet. The
  // sheet's own on-sheet credit block reads (verified visually): compilation by XenoHiro016, original
  // sprites by Aagus + James1971, palettes by El-Loco-Jr + Jefrey174, extra mention Storm424. Attribution
  // MANDATORY. Resliced feet-aligned in-repo by tools/reslice_vegito.py; strips ship as vegito_*_uniform.png.
  vegito: {
    work:    "Vegito Ultra Instinct -Sign- (JUS-style chibi fan sprite sheet)",
    artists: ["Aagus (original sprites)", "James1971 (original sprites)", "XenoHiro016 (compilation)", "El-Loco-Jr (palettes)", "Jefrey174 (palettes)", "Storm424"],
    source:  "fan sprite sheet (vegito_ultra_instinct__sign__v2_sprite_sheet_jus_by_xenohiro016_die4gov-fullview.jpg; on-sheet credits to XenoHiro016 / Aagus / James1971 / El-Loco-Jr / Jefrey174 / Storm424)",
    files:   ["vegito_*.png", "vegito_ultra_instinct__sign__v2_sprite_sheet_jus_by_xenohiro016*.jpg"]
  },

  // Iron Man 2 (Marvel) — Data East "Captain America and The Avengers" (1991) arcade rip. The sheet's own
  // teal credit boxes read (verified on-sheet): "RIPPED BY FLÁVIO ARRUDA" + "EDITED BY FLÁVIO ARRUDA"
  // (flavio_arruda_pe@hotmail.com). Original arcade art © 1991 Data East Corporation. Attribution MANDATORY.
  // Resliced feet-aligned in-repo by tools/reslice_iron_man_2.py; strips ship as iron_man_2_*_uniform.png.
  iron_man_2: {
    work:    "Iron Man (Captain America and The Avengers, 1991 arcade)",
    artists: ["Flávio Arruda (sprite rip + edit; flavio_arruda_pe@hotmail.com)", "Data East Corporation (original 1991 arcade art)"],
    source:  "arcade sprite rip (Iron Man.png; on-sheet credit 'RIPPED BY / EDITED BY FLÁVIO ARRUDA', © 1991 Data East)",
    files:   ["iron_man_2_*.png", "Iron Man.png"]
  },

  // Iron Man 3 (Marvel) — Game Boy Advance "The Invincible Iron Man" sprite rip. The sheet's own credit box
  // (top-right) reads "Mr. L" / TSR mascot / "Credit? No — Permission? No" (the ripper waives it) — but we
  // attribute anyway per project rule. Original GBA art © Marvel / the game's publisher. Resliced feet-aligned
  // in-repo by tools/reslice_iron_man_3.py; strips ship as iron_man_3_*_uniform.png.
  iron_man_3: {
    work:    "Iron Man (The Invincible Iron Man, Game Boy Advance)",
    artists: ["Mr. L (sprite rip, via The Spriters Resource)", "Marvel / original GBA game art"],
    source:  "GBA sprite rip (Game Boy Advance - The Invincible Iron Man - Playable Characters - Iron Man.png; on-sheet credit 'Mr. L' / TSR)",
    files:   ["iron_man_3_*.png", "Game Boy Advance - The Invincible Iron Man - Playable Characters - Iron Man.png"]
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

// ── ADDITIONAL sprite attributions ──────────────────────────────────────────
// Credits that don't map cleanly to a single playable roster key (form-level alien
// sprites, alternate rips, portrait-only credits). Kept out of SOURCED_ART (which is
// keyed by roster key + drives the per-key harness) but surfaced on the Credits screen
// via the Sprite Art section so no attribution from the source sheets is ever lost.
export const EXTRA_SPRITE_CREDITS = [
  { work: "Superman (Justice League Task Force / SNES)", artists: ["HijodeKrypton (rip)"], source: "SNES sprite rip" },
  { work: "Ben 10 — Heatblast, Four Arms, Diamondhead, Wildvine, Cannonbolt, Ripjaws (alien forms)", artists: ["dragonrod342"], source: "fan sprite sheets" },
  { work: "Ben 10 — Cannonbolt, Clockwork, Upchuck & Ultimate forms (alien forms)", artists: ["ipmugenofficial"], source: "M.U.G.E.N sheets" },
  { work: "Superman (custom chibi) — portrait", artists: ["Protokitty (portrait)", "Soulfire (sprites)"], source: "fan art" },
  { work: "Guest sprite (older Megumi-era sheet)", artists: ["saxcreed"], source: "fan sprite sheet" }
]

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
    entries: [
      ...Object.values(SOURCED_ART).map(a => ({
        work:    a.work,
        artists: a.edit ? [...a.artists, `edit: ${a.edit}`] : a.artists,
        source:  a.source
      })),
      ...EXTRA_SPRITE_CREDITS
    ],
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
