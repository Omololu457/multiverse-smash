// credits.js
// ──────────────────────────────────────────────────────────────────────────
// IN-GAME ATTRIBUTION — the single source of truth for who made the art.
//
// Some sprite sheets are SOURCED from community/M.U.G.E.N artists whose terms are
// "free to use, credit me." Those credits used to live ONLY in CREDITS.txt / megumi_CREDITS.txt
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
  megumi: {
    work:    "Megumi Fushiguro",
    artists: ["FinhJ"],
    edit:    "saxcreed",
    source:  "M.U.G.E.N sheet",
    files:   ["megumi_*.png"]
  },
  // Red Ranger (Jason, Mighty Morphin). Source REQUIRES credit to "Omega (tolgayavuz85)".
  red_ranger_mmpr: {
    work:    "Red Ranger — Jason (Mighty Morphin)",
    artists: ["Omega (tolgayavuz85)"],
    source:  "fan sprite sheet (red_ranger_mmpr_sprite_sheet_by_tolgayavuz_d738par.png)",
    files:   ["red_ranger_mmpr_*.png", "redranger_*.png"]
  }
}

// ── PROJECT-ADAPTED sprite art (resliced / assembled / recolored for this fan project) ──
// Provenance for these is not individually documented; they are adapted & resliced in-repo.
// This list is EXPLICIT (not a wildcard) so a newly-added character is caught by the test until
// its provenance is declared — either here, or in SOURCED_ART with a named artist.
export const PROJECT_ART_KEYS = [
  "goku", "goku_black", "vegeta", "piccolo", "frieza", "cell",
  "sukuna", "omololu", "maki", "yuji",
  "naruto", "sasuke", "itachi", "tobirama", "hashirama", "minato", "madara", "obito", "tobi",
  "zenitsu", "rengoku", "shinobu", "inosuke", "nezuko",
  "rick", "morty", "evilMorty", "rickPrime",
  "beerus", "ben10", "albedo", "omniman",
  "omega_ranger", "samurai_red_ranger", "gold_samurai_ranger", "green_samurai_ranger",
  "netero", "saiki", "killua", "flash", "gon", "batman", "hisoka", "superman",
  "chrollo", "ghostface", "miwa", "ichigo", "zaraki", "zaraki_shikai"
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
