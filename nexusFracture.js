// nexusFracture.js — STORY MODE: "THE NEXUS FRACTURE" — Prologue + Act 1, as CUTSCENE DATA.
//
// A scene is an array of BEATS consumed by the cutscene engine in game.js. Two beat kinds:
//
//  DIALOGUE / NARRATION beat:
//    { speaker, text, left, right, pose, pose2, bg, cam }
//      speaker — name shown in the box ("OMOLOLU", "RICK PRIME", "OMOLOLU (V.O.)"); "" = pure narration (no name bar)
//      text    — the line (typewriter-revealed)
//      left    — rosterKey shown on the left (or omitted → no character; narration-only over the backdrop)
//      right   — rosterKey shown on the right (both left+right set → two-character beat, facing each other)
//      pose    — "idle" | "win" | "lose" for the left character (default "idle")
//      pose2   — pose for the right character (default "idle")
//      bg      — stage key for a background, or omitted → plain dark backdrop
//      cam     — "static" | "zoom" (slow push-in) | "pan" (slow drift)  (default "static")
//
//  FIGHT beat:
//    { fight: { player, opponent, stageOf } }
//      Launches a REAL match (single decisive round — see _startCutsceneFight); on the win the mode
//      returns to the very next beat for the aftermath dialogue. stageOf = "player" | "opponent".
//
// Every rosterKey here is a fully-built fighter: omololu, rickPrime, genos, ichigo, obito (Act 1) +
// gojo, sukuna, toji, beerus, frieza, vegeta, saitama, deathstroke (Act 2). All verified selectable.

export const NEXUS_FRACTURE = {
  title: "THE NEXUS FRACTURE",

  // ── PROLOGUE — Omololu's room, the warp, Rick Prime watching ──────────────────────────────
  prologue: [
    { speaker: "", text: "Every universe keeps its own time. Its own heroes. Its own endings.", cam: "static" },
    { speaker: "OMOLOLU (V.O.)", text: "Mine kept me. A normal kid. A normal room. A normal Tuesday.", cam: "zoom" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "...okay, that's the third time the lights flickered. Totally normal. Not ominous at all.", cam: "static" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "Wait. Why is the AIR opening?", cam: "zoom" },
    { speaker: "", text: "The room folds inward. A seam of white light tears the world open — and swallows him whole.", cam: "zoom" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "idle", text: "There he goes. Right on schedule.", cam: "zoom" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "idle", text: "Every anchor thinks the fracture chose them. None of them like the real answer.", cam: "static" },
  ],

  // ── ACT 1 — The Nexus / First Contact / the grocery store / the masked man / the campfire ──
  act1: [
    // Title card
    { speaker: "", text: "ACT I  —  THE NEXUS FRACTURE", cam: "static" },

    // Scene 1 — The Nexus
    { speaker: "", text: "He wakes where all worlds bleed together: the Nexus. A bruise-colored sky over ground that remembers a hundred battlefields.", cam: "pan" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "Where... am I? This is definitely not Tuesday.", cam: "static" },

    // Scene 2 — First Contact  (→ REAL FIGHT: Genos vs Ichigo)
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "Two of them. Already fighting. Great first impression, universe.", cam: "static" },
    { speaker: "GENOS", left: "genos", right: "ichigo", pose: "idle", pose2: "idle", text: "Identify yourself. This sector is unstable — and you are standing in it.", cam: "static" },
    { speaker: "ICHIGO", left: "genos", right: "ichigo", pose: "idle", pose2: "idle", text: "He's not the problem, tin man. Stand down and I'll explain.", cam: "static" },
    { speaker: "GENOS", left: "genos", right: "ichigo", pose: "idle", pose2: "idle", text: "Negotiation is inefficient.", cam: "zoom" },
    { fight: { player: "genos", opponent: "ichigo", stageOf: "player" } },
    { speaker: "ICHIGO", left: "ichigo", pose: "win", text: "You done venting? Good. Now LISTEN.", cam: "static" },
    { speaker: "GENOS", left: "genos", pose: "lose", text: "...Threat reassessed. You are not hostile. Logged.", cam: "static" },

    // Scene 3 — the grocery store
    { speaker: "", text: "The Nexus mimics whatever it devours. A whole aisle of a corner store hums under dead fluorescent light in the middle of nowhere.", cam: "pan" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "A grocery store. In the void. With snacks. I'm either dreaming or dead — either way I'm starving.", cam: "static" },
    { speaker: "ICHIGO", left: "ichigo", right: "omololu", pose: "idle", pose2: "idle", text: "Don't eat the void food, kid. Come on — there's a fire, and people who aren't trying to kill you. Mostly.", cam: "static" },

    // Scene 4 — the masked man  (→ REAL FIGHT: Omololu vs Obito)
    { speaker: "", text: "A man in a spiral mask waits at the edge of the light. He does not blink. He does not need to.", cam: "zoom" },
    { speaker: "OBITO", left: "obito", pose: "idle", text: "The new anchor. Small. Frightened. Perfect.", cam: "zoom" },
    { speaker: "OMOLOLU", left: "omololu", right: "obito", pose: "idle", pose2: "idle", text: "Anchor? Man, I don't even have a driver's license.", cam: "static" },
    { speaker: "OBITO", left: "omololu", right: "obito", pose: "idle", pose2: "idle", text: "Then let me measure exactly what you're worth to the fracture.", cam: "zoom" },
    { fight: { player: "omololu", opponent: "obito", stageOf: "opponent" } },
    { speaker: "OMOLOLU", left: "omololu", pose: "win", text: "Okay. OKAY. I did a thing. A violent thing. And it WORKED.", cam: "static" },
    { speaker: "OBITO", left: "obito", pose: "lose", text: "...You'll do. That was never a fight, boy. It was a measurement — and he was watching.", cam: "zoom" },

    // Scene 5 — the campfire
    { speaker: "", text: "Night, if the Nexus keeps nights. A campfire snaps. Strangers from a dozen dead worlds share its light.", cam: "static" },
    { speaker: "ICHIGO", left: "ichigo", right: "omololu", pose: "idle", pose2: "idle", text: "You held your own against a masked freak on day one. That buys you a seat at the fire.", cam: "static" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "So what IS this place? And why does everyone keep calling me an anchor?", cam: "zoom" },
    { speaker: "", text: "No one answers right away. The fire pops. Somewhere past the light, Rick Prime is already writing the next chapter.", cam: "pan" },
    { speaker: "", text: "END OF ACT I", cam: "static" },
  ],

  // ── ACT 2 — The Shrinking Ground ───────────────────────────────────────────────────────────
  // Multi-way set-pieces are wired as SEQUENTIAL single-round duels (the proven Act 1 fight wiring),
  // bridged by dialogue beats — a gauntlet, not a new match mode. Fights: S7 gojo/sukuna → toji/sukuna,
  // S8 vegeta/frieza + saitama/beerus, S12 genos/deathstroke → ichigo/frieza → omololu/rickPrime.
  act2: [
    // Title card
    { speaker: "", text: "ACT II  —  THE SHRINKING GROUND", cam: "static" },

    // Scene 6 — The Shrinking Ground
    { speaker: "", text: "The Nexus is smaller today. Yesterday's horizon is this morning's wall. Whole dead worlds fold shut like books no one will reopen.", cam: "pan" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "The ground keeps... ending. Every night there's less of it. Less of us.", cam: "zoom" },
    { speaker: "GENOS", left: "genos", right: "omololu", pose: "idle", pose2: "idle", text: "The fracture is contracting toward a single point. My sensors put us inside its collapse radius. We do not have long.", cam: "static" },

    // Scene 7 — Gojo vs Sukuna, and Toji joins  (→ TWO REAL FIGHTS)
    { speaker: "", text: "Where the strongest gather, the ground lasts longest — so the strongest come to fight over what's left. Two of them are already here.", cam: "pan" },
    { speaker: "GOJO", left: "gojo", right: "sukuna", pose: "idle", pose2: "idle", text: "Only one cursed king gets to hold this piece of the world, and it isn't going to be you.", cam: "static" },
    { speaker: "SUKUNA", left: "gojo", right: "sukuna", pose: "idle", pose2: "idle", text: "Then stand in my domain and be measured, sorcerer. I have been bored for a thousand years.", cam: "zoom" },
    { fight: { player: "gojo", opponent: "sukuna", stageOf: "player" } },
    { speaker: "GOJO", left: "gojo", pose: "win", text: "Throughout heaven and earth... yeah. You know the rest.", cam: "static" },
    { speaker: "", text: "The killing blow never lands. A spear of cursed steel splits the air between them — and the man who fears nothing steps out of the dark.", cam: "zoom" },
    { speaker: "TOJI", left: "toji", right: "sukuna", pose: "idle", pose2: "idle", text: "Sorcerers. Kings. Same soft throat under all the talk. I'll take the ground — and the bounty on both your heads.", cam: "static" },
    { fight: { player: "toji", opponent: "sukuna", stageOf: "opponent" } },
    { speaker: "TOJI", left: "toji", pose: "win", text: "No cursed energy. No tricks. Just a man who's better at this than you. Remember that.", cam: "static" },

    // Scene 8 — The standoff: Beerus / Frieza / Vegeta / Saitama  (→ TWO REAL FIGHTS)
    { speaker: "", text: "Elsewhere, four powers that could each end the others meet on the last wide plain. Nobody moves. Everybody is doing the math.", cam: "pan" },
    { speaker: "BEERUS", left: "beerus", right: "saitama", pose: "idle", pose2: "idle", text: "A god of destruction, and... whatever you are. You don't even register to me. That's either an insult or a miracle.", cam: "static" },
    { speaker: "VEGETA", left: "vegeta", right: "frieza", pose: "idle", pose2: "idle", text: "Frieza. Of every ruin the multiverse could spit back at me, it had to be you. Good. I still owe you a death.", cam: "zoom" },
    { fight: { player: "vegeta", opponent: "frieza", stageOf: "player" } },
    { speaker: "VEGETA", left: "vegeta", pose: "win", text: "That's twice now. Stay down this time — you're embarrassing us both.", cam: "static" },
    { speaker: "SAITAMA", left: "saitama", right: "beerus", pose: "idle", pose2: "idle", text: "So you're a god, huh. Cool. I was gonna ask if the sale's still on, but... okay. One punch first.", cam: "static" },
    { fight: { player: "saitama", opponent: "beerus", stageOf: "opponent" } },
    { speaker: "BEERUS", left: "beerus", pose: "lose", text: "...What ARE you. No mortal — no GOD — hits like that. Whis is going to have questions.", cam: "zoom" },

    // Scene 9 — The Council
    { speaker: "", text: "Under the last intact roof in the Nexus, the survivors call a council. Heroes, monsters, gods — one table, one shrinking world.", cam: "pan" },
    { speaker: "ICHIGO", left: "ichigo", right: "omololu", pose: "idle", pose2: "idle", text: "Everyone here has killed someone everyone else here loved. And we still have to pick a plan by morning.", cam: "static" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "So the anchor gets a vote now? Yesterday nobody would even tell me what an anchor is.", cam: "zoom" },
    { speaker: "GENOS", left: "genos", right: "omololu", pose: "idle", pose2: "idle", text: "You ARE the vote. Every collapse curves toward you. Wherever you stand, the ground holds a little longer. That is what an anchor is.", cam: "static" },

    // Scene 10 — The Older, Colder Presence
    { speaker: "", text: "Beyond the firelight, something older than any world at the table watches the council decide. It has watched a thousand councils. None of them mattered.", cam: "zoom" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "idle", text: "Cute. They think choosing together makes the choice theirs. Every anchor's little parliament ends the exact same way.", cam: "zoom" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "idle", text: "I don't have to break their alliance. I just have to be there when it breaks itself.", cam: "static" },

    // Scene 11 — The Rival
    { speaker: "", text: "One face at the fire keeps finding yours across the flames. Not an enemy. Worse — a measure. The one you'd have to beat to matter here.", cam: "pan" },
    { speaker: "ICHIGO", left: "ichigo", right: "omololu", pose: "idle", pose2: "idle", text: "You've got the anchor's luck, kid, but luck isn't a spine. When the ground finally comes for us, I need to know you won't run.", cam: "static" },
    { speaker: "OMOLOLU", left: "omololu", right: "ichigo", pose: "idle", pose2: "idle", text: "I didn't run from the masked man. I'm not running from you. When it comes — I'll be on the last piece of ground there is.", cam: "zoom" },

    // Scene 12 — The Ambush: Rick Prime + Frieza + Deathstroke vs the group  (→ THREE REAL FIGHTS)
    { speaker: "", text: "The alliance doesn't break itself. It's broken — from the dark, all at once. Three shapes drop through the collapsing sky with a plan and a list of names.", cam: "zoom" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "idle", text: "There it is — the moment a parliament becomes a panic. Take the anchor last. I want it to watch its friends go first.", cam: "static" },
    { speaker: "DEATHSTROKE", left: "genos", right: "deathstroke", pose: "idle", pose2: "idle", text: "Contract's simple, machine. Everyone here stops working. Starting with the one that never sleeps.", cam: "static" },
    { fight: { player: "genos", opponent: "deathstroke", stageOf: "opponent" } },
    { speaker: "GENOS", left: "genos", pose: "win", text: "Contract terminated. Threat two — reacquiring.", cam: "static" },
    { speaker: "FRIEZA", left: "ichigo", right: "frieza", pose: "idle", pose2: "idle", text: "A soul reaper. How quaint. I have unmade emperors, boy. Let me add a shinigami to the list.", cam: "zoom" },
    { fight: { player: "ichigo", opponent: "frieza", stageOf: "opponent" } },
    { speaker: "ICHIGO", left: "ichigo", pose: "win", text: "You talk like every villain I've ever buried. Get in line.", cam: "static" },
    { speaker: "", text: "Two of the three are down. And the oldest, coldest one hasn't moved — because it was only ever here for one of them.", cam: "zoom" },
    { speaker: "RICK PRIME", left: "rickPrime", right: "omololu", pose: "idle", pose2: "idle", text: "Just you and me now, anchor. No masked measurer. No tin man. Let's find out what the fracture actually built.", cam: "static" },
    { speaker: "OMOLOLU", left: "omololu", right: "rickPrime", pose: "idle", pose2: "idle", text: "You've been in every shadow since my bedroom wall opened. Fine. Come find out. I'm done being measured.", cam: "zoom" },
    { fight: { player: "omololu", opponent: "rickPrime", stageOf: "opponent" } },
    { speaker: "OMOLOLU", left: "omololu", pose: "win", text: "That's for the bedroom. And the Tuesday. And every single 'right on schedule.'", cam: "static" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "lose", text: "...Good. GOOD. You hit like something worth collapsing a multiverse to catch. NOW you're worth the real conversation.", cam: "zoom" },

    // Scene 13 — What It Costs
    { speaker: "", text: "Three attackers driven off. The ground you saved is smaller than the ground you lost saving it. This is what winning costs in the Nexus now.", cam: "pan" },
    { speaker: "OMOLOLU", left: "omololu", right: "ichigo", pose: "idle", pose2: "idle", text: "We won. So why does it feel like he LET us? Like the whole ambush was just... one more measurement.", cam: "static" },
    { speaker: "ICHIGO", left: "ichigo", pose: "idle", text: "Because it was. Rest while you can, anchor. Whatever he's really building — next time he won't be watching. He'll be finishing it.", cam: "zoom" },
    { speaker: "", text: "END OF ACT II", cam: "static" },
  ],
}

// The full ordered playthrough (Prologue → Act 1 → Act 2), for a single start-to-finish run.
export const NEXUS_FRACTURE_FULL = [...NEXUS_FRACTURE.prologue, ...NEXUS_FRACTURE.act1, ...NEXUS_FRACTURE.act2]
