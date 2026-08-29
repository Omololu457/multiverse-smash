// story.js
// STORY MODE — playable MVP (Part 1).
//
// HONEST SCOPE: this is NOT a new cinematic/cutscene engine. It reuses the arcade rival system's
// two-line dialogue exchange (drawRivalIntroScreen) for between-fight beats, the normal match flow
// for the fights, and the boss super-armor system (_bossArmor) for the finale. Each chapter is a
// scripted, fixed matchup (protagonist vs antagonist) with a short pre-fight exchange and a win
// line — enough to be a coherent, playable campaign tonight. Full narrated cutscenes / a node-map
// screen / branching are deliberately deferred (see report).
//
// Every rosterKey below is a fully-built, playable fighter (verified against characters.js). The
// 15 titles are the reconciled Battle-Chronicle structure that already lived in ui.js as a locked
// placeholder — now each is wired to a real matchup drawn from those named beats.
//
// Chapter shape:
//   { id, num, title, player, opponent, stageOf, pre:[line,line], win, boss?, bossName?, bossProfile? }
//   • player/opponent — rosterKeys. The player controls `player`; the CPU is `opponent`.
//   • stageOf — which fighter's home stage to host on ("opponent" reads thematically for most beats).
//   • pre — the two-line exchange shown before the fight (reuses the rival intro screen).
//   • win — the single line shown on the victory screen beat.
//   • boss — finale only: applies the story boss profile (super-armor + extra HP, single round).

export const STORY_CHAPTERS = [
  {
    id: 1, num: "I", title: "The First Fracture",
    player: "goku", opponent: "vegeta", stageOf: "player",
    pre: [
      "Goku: The sky just... tore open. You feel that too, Vegeta?",
      "Vegeta: Something is pulling the worlds together. If I must fight my way to the truth — so be it."
    ],
    win: "Goku: Guess some rivalries survive the end of everything."
  },
  {
    id: 2, num: "II", title: "Anchor Points",
    player: "naruto", opponent: "sasuke", stageOf: "opponent",
    pre: [
      "Naruto: Every reality has an anchor holding it steady. Ours is slipping.",
      "Sasuke: Then we settle this the only way we ever have. Come on."
    ],
    win: "Naruto: Still an anchor I'd trust with the world. Even now."
  },
  {
    id: 3, num: "III", title: "The Mirror Self",
    player: "vegeta", opponent: "vegeta_dark", stageOf: "player",
    pre: [
      "Vegeta: You wear my face. You are NOT me.",
      "Dark Vegeta: I am what's left when the pride finally wins. Look closely, prince."
    ],
    win: "Vegeta: My pride bows to no reflection."
  },
  {
    id: 4, num: "IV", title: "Six Paths, One Pain",
    player: "naruto", opponent: "pain", stageOf: "opponent",
    pre: [
      "Naruto: The fracture speaks with your voice, Pain. Six of them.",
      "Pain: Then understand my pain across every world at once. Feel it."
    ],
    win: "Naruto: I heard you. And I still choose a different answer."
  },
  {
    id: 5, num: "V", title: "The Ghostface Gauntlet",
    player: "jason", opponent: "ghostface", stageOf: "opponent",
    pre: [
      "Ghostface: What's your favorite scary movie? You're standing in it.",
      "Jason: ..."
    ],
    win: "Jason: (The silence answers for him.)"
  },
  {
    id: 6, num: "VI", title: "Sons of Krypton",
    player: "superman", opponent: "omniman", stageOf: "player",
    pre: [
      "Superman: Whatever you were sent here to do — it ends with me.",
      "Omni-Man: Think about how small this world is, Kryptonian. Think about it hard."
    ],
    win: "Superman: I already did. It's worth everything."
  },
  {
    id: 7, num: "VII", title: "The Iron Convergence",
    player: "iron_man", opponent: "iron_man_3", stageOf: "player",
    pre: [
      "Iron Man: A hundred armors, one signal — and they're all pointed at me.",
      "Iron Man (Mk 42): Convergence protocol. You built me to win. Let's test that."
    ],
    win: "Iron Man: Note to self: never let the suits vote."
  },
  {
    id: 8, num: "VIII", title: "Fractured Worlds",
    player: "goku", opponent: "superman", stageOf: "opponent",
    pre: [
      "Goku: Two worlds bleeding into one — and you're the strongest thing in yours.",
      "Superman: Then let's find out whose world holds. No holding back."
    ],
    win: "Goku: Ha! Now THAT was a fight worth crossing realities for."
  },
  {
    id: 9, num: "IX", title: "Echoes Across Realities",
    player: "gojo", opponent: "sukuna", stageOf: "opponent",
    pre: [
      "Gojo: I keep meeting you in every reality. It's almost flattering.",
      "Sukuna: Then you already know how every one of them ends."
    ],
    win: "Gojo: Nah. This is the one where you lose. Again."
  },
  {
    id: 10, num: "X", title: "The Battle Chronicle",
    player: "ichigo", opponent: "zaraki", stageOf: "opponent",
    pre: [
      "Ichigo: The Chronicle's writing us down as we fight. Every swing remembered.",
      "Zaraki: Then make it a page worth reading. Draw your sword!"
    ],
    win: "Ichigo: One more entry. Still standing."
  },
  {
    id: 11, num: "XI", title: "The Choir's Whisper",
    player: "hisoka", opponent: "chrollo", stageOf: "opponent",
    pre: [
      "Hisoka: The Choir keeps whispering your name to me. How could I resist? ♦",
      "Chrollo: Careful. Curiosity is the one bluff I always call."
    ],
    win: "Hisoka: Mmm... exactly as delicious as promised. ♥"
  },
  {
    id: 12, num: "XII", title: "The Convergence",
    player: "madara", opponent: "hashirama", stageOf: "player",
    pre: [
      "Madara: Every timeline converges here, old friend. Every version of us.",
      "Hashirama: Then in every one of them, I'll still try to reach you."
    ],
    win: "Madara: You always did chase a dream one world too far."
  },
  {
    id: 13, num: "XIII", title: "Where Heaven and Earth Meet",
    player: "beerus", opponent: "vegito", stageOf: "player",
    pre: [
      "Vegito: A god of destruction, guarding the last stable sky. Figures.",
      "Beerus: Amuse me, fusion. If you're worth the space you take up."
    ],
    win: "Beerus: Hmph. Adequate. Now clean up your mess."
  },
  {
    id: 14, num: "XIV", title: "The Last Anchor",
    player: "batman", opponent: "deathstroke", stageOf: "opponent",
    pre: [
      "Batman: One anchor left holding this reality. You're standing on it.",
      "Deathstroke: Then I've got the high ground and the contract. Bad night for you."
    ],
    win: "Batman: I've had worse. You just haven't met me on a good one."
  },
  {
    id: 15, num: "XV", title: "The Null",
    player: "goku", opponent: "sukuna", stageOf: "opponent",
    boss: true, bossName: "THE NULL",
    // Finale: the fracture collapses into a single overwhelming avatar. Reuses the boss super-armor
    // system — extra HP, light hits can't stagger it, single round to the finish.
    bossProfile: { healthMult: 1.8, scale: 1.25, superArmorThreshold: 45, meterFree: true, noRoundLimit: true },
    pre: [
      "Goku: So you're what's left when the worlds run out. The Null.",
      "The Null: I am the quiet after every story. Kneel, and it stops hurting."
    ],
    win: "Goku: Sorry, pal. My story's not done being told."
  }
]

export const STORY_CHAPTER_COUNT = STORY_CHAPTERS.length

export function getChapter(idx) {
  return STORY_CHAPTERS[idx] || null
}

// The finale's difficulty is fixed high; the rest ramp gently so early chapters are approachable.
export function chapterDifficulty(idx) {
  const ch = STORY_CHAPTERS[idx]
  if (!ch) return "easy"
  if (ch.boss) return "impossible"
  if (idx >= 10) return "impossible"
  if (idx >= 4)  return "adaptive"
  return "easy"
}

// Every rosterKey referenced by any chapter (for a wiring/integrity test).
export function allReferencedKeys() {
  const s = new Set()
  for (const c of STORY_CHAPTERS) { s.add(c.player); s.add(c.opponent) }
  return [...s]
}
