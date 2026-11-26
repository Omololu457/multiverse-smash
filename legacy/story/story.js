// story.js
// STORY MODE — playable MVP (Part 1).
//
// HONEST SCOPE: this is NOT a new cinematic/cutscene engine. It reuses the arcade rival system's
// dialogue exchange (drawRivalIntroScreen) for the pre-fight beats, the normal match flow for the
// fights, and the boss super-armor system (_bossArmor) for the finale. Each chapter is a scripted,
// fixed matchup (protagonist vs antagonist) with a short character-grounded exchange and a win line.
//
// Every rosterKey below is a fully-built, playable fighter (verified against characters.js).
//
// Chapter shape:
//   { id, num, title, player, opponent, stageOf, pre:[line,...], win, boss?, bossName?, bossProfile?, narration? }
//   • player/opponent — rosterKeys. The player controls `player`; the CPU is `opponent`.
//   • stageOf — which fighter's home stage to host on ("opponent" reads thematically for most beats).
//   • pre — the 2-3 line exchange shown before the fight (reuses the rival intro screen). Lines are
//           formatted `Name: "spoken"`; a line with NO `Name:` prefix reads as narration/stage-direction.
//   • narration — true when the beat is environmental narration rather than an attributed exchange
//           (Ch15). The screen still shows the two portraits; the lines simply carry no speaker.
//   • win — the single line shown on the victory-screen beat.
//   • boss — finale only: applies the story boss profile (super-armor + extra HP, single round).

export const STORY_CHAPTERS = [
  {
    id: 1, num: "I", title: "The First Fracture",
    player: "goku", opponent: "vegeta", stageOf: "player",
    pre: [
      'Vegeta: "Still grinning like this is a game to you."',
      'Goku: "Isn\'t it, a little?"',
      'Vegeta: "Not to me. Not anymore."'
    ],
    win: "Goku: Guess some rivalries survive the end of everything."
  },
  {
    id: 2, num: "II", title: "Anchor Points",
    player: "naruto", opponent: "sasuke", stageOf: "opponent",
    pre: [
      'Sasuke: "You never stop coming back to this, do you."',
      'Naruto: "Somebody has to. Might as well be me."'
    ],
    win: "Naruto: Still an anchor I'd trust with the world. Even now."
  },
  {
    id: 3, num: "III", title: "The Mirror Self",
    player: "vegeta", opponent: "vegeta_dark", stageOf: "player",
    pre: [
      'Dark Vegeta: "You know exactly what I am. The part of you that never let go."',
      'Vegeta: "I know. That\'s why I\'m the one who\'s here."'
    ],
    win: "Vegeta: My pride bows to no reflection."
  },
  {
    id: 4, num: "IV", title: "Six Paths, One Pain",
    player: "naruto", opponent: "pain", stageOf: "opponent",
    pre: [
      'Pain: "Pain shared is meaning made. You\'ll understand, eventually."',
      'Naruto: "I understand losing people. I just didn\'t decide to become this because of it."'
    ],
    win: "Naruto: I heard you. And I still choose a different answer."
  },
  {
    id: 5, num: "V", title: "The Ghostface Gauntlet",
    player: "jason", opponent: "ghostface", stageOf: "opponent",
    pre: [
      'Ghostface: "You know, most people at least pretend to enjoy the conversation."',
      "(Jason says nothing. He doesn't stop walking forward.)"
    ],
    win: "Jason: (The silence answers for him.)"
  },
  {
    id: 6, num: "VI", title: "Sons of Krypton",
    player: "superman", opponent: "omniman", stageOf: "player",
    pre: [
      'Superman: "There\'s no one here to protect. So why are we doing this?"',
      'Omni-Man: "Because I still don\'t know what I\'d do if there were."'
    ],
    win: "Superman: I already did. It's worth everything."
  },
  {
    id: 7, num: "VII", title: "The Iron Convergence",
    player: "iron_man", opponent: "iron_man_3", stageOf: "player",
    pre: [
      'Iron Man: "Feels strange, doesn\'t it. Like looking in a mirror that disagrees with you."',
      'Iron Man (Mk42): "Let\'s find out which one of us is right."'
    ],
    win: "Iron Man: Note to self: never let the suits vote."
  },
  {
    id: 8, num: "VIII", title: "Fractured Worlds",
    player: "goku", opponent: "superman", stageOf: "opponent",
    pre: [
      'Superman: "I\'ve never fought anyone who smiles this much at a fight."',
      'Goku: "You should try it. Might help."'
    ],
    win: "Goku: Ha! Now THAT was a fight worth crossing realities for."
  },
  {
    id: 9, num: "IX", title: "Echoes Across Realities",
    player: "gojo", opponent: "sukuna", stageOf: "opponent",
    pre: [
      'Sukuna: "Two thousand years, and finally something worth my time."',
      'Gojo: "Try not to be too disappointed when it\'s over quickly."'
    ],
    win: "Gojo: Nah. This is the one where you lose. Again."
  },
  {
    id: 10, num: "X", title: "The Battle Chronicle",
    player: "ichigo", opponent: "zaraki", stageOf: "opponent",
    pre: [
      'Zaraki: "Scare me. Just once. That\'s all I\'m asking."',
      'Ichigo: "I\'m not here to entertain you."',
      'Zaraki: "Then this\'ll be short."'
    ],
    win: "Ichigo: One more entry. Still standing."
  },
  {
    id: 11, num: "XI", title: "The Choir's Whisper",
    player: "hisoka", opponent: "chrollo", stageOf: "opponent",
    pre: [
      'Hisoka: "You collect abilities. I collect moments like this one."',
      'Chrollo: "Patience is an ability too. You should try collecting some."'
    ],
    win: "Hisoka: Mmm... exactly as delicious as promised."
  },
  {
    id: 12, num: "XII", title: "The Convergence",
    player: "madara", opponent: "hashirama", stageOf: "player",
    pre: [
      'Hashirama: "We already had this fight once. I was hoping we wouldn\'t need it again."',
      'Madara: "Hope was always your weakness. It\'s also why I never doubted you\'d come."'
    ],
    win: "Madara: You always did chase a dream one world too far."
  },
  {
    id: 13, num: "XIII", title: "Where Heaven and Earth Meet",
    player: "beerus", opponent: "vegito", stageOf: "player",
    pre: [
      'Beerus: "A fusion. How novel. Convince me it wasn\'t a waste of my afternoon."',
      'Vegito: "I won\'t convince you. I\'ll just make sure you remember it."'
    ],
    win: "Beerus: Hmph. Adequate. Now clean up your mess."
  },
  {
    id: 14, num: "XIV", title: "The Last Anchor",
    player: "batman", opponent: "deathstroke", stageOf: "opponent",
    pre: [
      'Deathstroke: "You\'re not paying me for this one. So what\'s the angle, detective?"',
      'Batman: "There isn\'t one. Some fights don\'t need a client."'
    ],
    win: "Batman: I've had worse. You just haven't met me on a good one."
  },
  {
    id: 15, num: "XV", title: "The Null",
    player: "goku", opponent: "sukuna", stageOf: "opponent",
    boss: true, bossName: "THE NULL", narration: true,
    // Finale: the fracture collapses into a single overwhelming avatar. Framed as the Null
    // manifestation itself — an environmental narration beat, NOT an attributed exchange. Reuses the
    // boss super-armor system (extra HP, light hits can't stagger it, single round to the finish).
    bossProfile: { healthMult: 1.8, scale: 1.25, superArmorThreshold: 45, meterFree: true, noRoundLimit: true },
    pre: [
      "The crack in the sky hasn't closed.",
      "It's just been waiting for someone strong enough to walk through it."
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
