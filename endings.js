// endings.js
// ──────────────────────────────────────────────────────────────────────────
// ARCADE ENDINGS — per-character epilogue slides shown after a clear (Stage 19B).
// Each slide is { text, image? }. `image` is an optional filename (a transparent
// full-body render or portrait); when omitted the renderer falls back to the
// character's <key>_portrait.png, then to a gradient. No new art is required — the
// slow Ken-Burns pan gives any still image motion.
//
// These are fan-fiction one-paragraph epilogues in each roster's own voice. Marquee
// characters have hand-written endings below; everyone else gets a characterful
// generic ending generated from their name (endingSlidesFor falls back to it), so
// EVERY character produces an ending on clear. Promote a generic one by adding a
// real entry here — no other change needed.
// ──────────────────────────────────────────────────────────────────────────

export const ENDINGS = {
  gojo: [
    { text: "The multiverse threw its strongest at Gojo Satoru. Sorcerers, monsters, gods — it made no difference.", image: "gojo_FULL_transparent.png" },
    { text: "\"Throughout heaven and earth, I alone am the honored one.\" He'd said it a thousand times. Now a thousand worlds agreed." },
    { text: "Six Eyes open, hands in his pockets, Gojo walked home. The strongest was, as ever, simply bored again." }
  ],
  sukuna: [
    { text: "One by one the champions of every world knelt before the King of Curses — or were made to." },
    { text: "Sukuna took no crown. Crowns are for those who need others to agree they rule." },
    { text: "\"Is this all?\" he murmured to the silent arena. Somewhere, he hoped, something worth killing was still being born." }
  ],
  naruto: [
    { text: "Naruto beat the multiverse the only way he knew how — by refusing, absolutely, to give up." },
    { text: "He'd fought monsters and gods and even a version of his best friend. He talked to every one of them afterward." },
    { text: "\"Believe it,\" he grinned, Hokage of not one village now but the imagination of every world that watched him win." }
  ],
  sasuke: [
    { text: "Sasuke cut a path through the multiverse alone, the way he'd always sworn he would." },
    { text: "At the summit stood the reflection he could never outrun — and he beat it, too." },
    { text: "He turned from the light of the crowd and vanished down a darker road, guarding worlds that would never know his name." }
  ],
  goku: [
    { text: "Goku fought the strongest of a thousand realities and grinned wider with every one." },
    { text: "He didn't win for a crown or a cause. He won because there was always someone stronger to find — and now he'd found them all." },
    { text: "\"Man, that was fun! Let's do it again sometime!\" Already he was scanning the horizon for the next great fight." }
  ],
  vegeta: [
    { text: "The Prince of all Saiyans took the multiverse by force of pure, refusing pride." },
    { text: "Kakarot's shadow did not fall across this victory. For once, Vegeta stood at the summit alone." },
    { text: "\"I am the strongest,\" he said to the empty arena — not a boast now, simply a fact he had bled a thousand times to make true." }
  ],
  ichigo: [
    { text: "Ichigo never wanted a tournament. He wanted to protect the people behind him — so he won every fight that stood in the way." },
    { text: "Hollow, Shinigami, and everything between answered his blade. Getsuga Tenshō lit up worlds that had never seen the moon fall." },
    { text: "He sheathed Zangetsu and went home. The strongest, to Ichigo, only ever meant strong enough to keep them safe." }
  ],
  madara: [
    { text: "Madara Uchiha bent the multiverse to his will the way he'd once tried to bend his own world." },
    { text: "No dream this time, no illusion — every foe fell to a Susanoo that eclipsed the sun of every reality." },
    { text: "\"Wake up to a reality that never disappoints,\" he told the conquered worlds. This time, he intended to keep it real." }
  ],
  itachi: [
    { text: "Itachi walked the ladder in silence, carrying the weight he always carried." },
    { text: "He broke every genjutsu, outread every mind, and never once let them see what it cost." },
    { text: "The multiverse would remember a villain. Only he would know he'd fought, as always, to protect the ones behind him." }
  ],
  killua: [
    { text: "Killua moved through the bracket like lightning through still air — there, then gone, then victorious." },
    { text: "He'd left the assassin's leash behind long ago. Every fight now was his own choice, his own speed, his own will." },
    { text: "\"Guess I really am the strongest,\" he shrugged — then went to find Gon, because a win means nothing with no friend to tell." }
  ],
  gon: [
    { text: "Gon fought every opponent with his whole heart, holding nothing back — and that was enough." },
    { text: "The multiverse learned what Whale Island already knew: never corner a boy who feels everything completely." },
    { text: "He won, thanked every opponent, and asked each one to teach him something. Then he ran off to catch the sunset." }
  ],
  netero: [
    { text: "A hundred realities' champions, and one old man who had thanked his fists ten thousand times a day." },
    { text: "The Guanyin Bodhisattva moved faster than gratitude, and the multiverse bowed before a lifetime of quiet discipline." },
    { text: "Netero laughed, cracked his back, and lamented only that he'd found so few opponents worth a second prayer." }
  ],
  superman: [
    { text: "Superman won without ever throwing a blow he didn't have to. Restraint, it turns out, is the rarest strength." },
    { text: "Worlds that had only known conquerors met a strength that chose, every single time, to protect." },
    { text: "He rose into a borrowed sky and turned toward home. Wherever people needed saving — that was Metropolis enough." }
  ],
  omniman: [
    { text: "Nolan Grayson crushed the multiverse's finest, and each one made him think of a boy back home." },
    { text: "\"You'll look back on this and understand,\" he told the fallen — the same lie, or truth, he'd told his son." },
    { text: "Standing atop every world, the Viltrumite finally set down his empire's mission and chose, at last, his own." }
  ],
  batman: [
    { text: "No powers. No transformations. Only preparation, will, and a plan for every fighter in the bracket." },
    { text: "The multiverse's gods and monsters fell to a man who had simply decided he would not lose." },
    { text: "He melted back into the dark before the applause ended. Somewhere, always, someone still needed the Batman." }
  ],
  hisoka: [
    { text: "Hisoka climbed the ladder for the only prize he ever wanted: opponents ripe enough to be worth killing." },
    { text: "Each victory was a fruit picked at its sweetest moment, savored, and discarded." },
    { text: "At the summit he found only himself left to fight — and his smile, for once, faltered with genuine, delighted anticipation." }
  ],
  rengoku: [
    { text: "Rengoku burned through the bracket like a wildfire that only ever warmed the innocent." },
    { text: "\"Set your heart ablaze!\" he roared, and worlds that had forgotten how to hope felt the flame catch." },
    { text: "He carried his mother's words to the summit and beyond: be strong, because the strong protect the weak. He always would." }
  ],
  nezuko: [
    { text: "She never spoke a word, and she never needed to. Every opponent understood her the moment she moved to protect." },
    { text: "Blood Demon Art bloomed across a hundred arenas — pink fire that burned only what threatened the kind." },
    { text: "Nezuko found her brother waiting at the summit, and hummed a small, contented sound. Family, still. Always." }
  ]
}

// Return the ending slides for a character — the hand-written set if present, otherwise a
// characterful generic ending generated from the name (so every character has one).
export function endingSlidesFor(rosterKey, charactersMap) {
  const custom = ENDINGS[rosterKey]
  if (Array.isArray(custom) && custom.length) return custom
  return genericEnding(rosterKey, charactersMap)
}

function genericEnding(key, charactersMap) {
  const name = charactersMap?.[key]?.name || key
  return [
    { text: `The final blow lands, the arena falls silent, and ${name} stands alone atop the multiverse.` },
    { text: `Rival and monster, champion and god — every world sent its strongest, and every one of them fell.` },
    { text: `${name}'s name echoes now across every reality. For this moment, in all of creation, there is no one left to fight.` }
  ]
}

// True if a character has a hand-written (non-generic) ending — used by tests / tooling.
export function hasCustomEnding(rosterKey) { return Array.isArray(ENDINGS[rosterKey]) && ENDINGS[rosterKey].length > 0 }
