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
// gojo, sukuna, toji, beerus, frieza, vegeta, saitama, deathstroke (Act 2) + batman, madara, naruto,
// superman, goku_black (Act 3). All verified selectable via the FFA roster.

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

  // ── ACT 3 — The Convergence ────────────────────────────────────────────────────────────────
  // Scene 16 is a "quick cuts" montage: each cut = ONE representative single-round duel by the
  // marquee fighter (a montage reads better crisp than split into full tag matches — cf. Act 2).
  // 8 fights: vegeta/frieza, gojo/sukuna, batman/deathstroke, beerus/madara, naruto/madara,
  // superman/frieza, saitama/goku_black, then Scene 17's final boss omololu/rickPrime.
  act3: [
    // Title card
    { speaker: "", text: "ACT III  —  THE CONVERGENCE", cam: "static" },

    // Scene 14 — Ìlẹ̀kùn (The Door)
    { speaker: "", text: "There is a word for it in a language the Nexus never learned: Ìlẹ̀kùn. A door. The fracture was never a wound. It was a threshold — and it has been waiting for someone to open it.", cam: "pan" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "My grandmother used to say a door only opens for the one holding the key. I never asked what happens to the key after.", cam: "zoom" },
    { speaker: "GENOS", left: "genos", right: "omololu", pose: "idle", pose2: "idle", text: "The collapse has a center now, and the center is a door. Rick Prime doesn't want to close the fracture. He wants to walk THROUGH it — and he needs the anchor to hold it open.", cam: "static" },

    // Scene 15 — Choosing Sides
    { speaker: "", text: "The Nexus splits one last time — not the ground this time, but the people standing on it. Every survivor has to decide what the last door is worth.", cam: "pan" },
    { speaker: "ICHIGO", left: "ichigo", right: "omololu", pose: "idle", pose2: "idle", text: "Some of them are already walking toward him. Power calls to power, and he's the loudest thing in any world now. So I'll ask once: where do you stand, anchor?", cam: "static" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "On the threshold. Between him and the door. If he wants through, he goes through me first. That's where I stand.", cam: "zoom" },
    { speaker: "GOJO", left: "gojo", right: "omololu", pose: "idle", pose2: "idle", text: "Good answer. Then the strongest of every world hold the line while you hold the door. Try not to die — I only just started finding you interesting.", cam: "static" },

    // Scene 16 — The Convergence  (→ SEVEN quick-cut REAL FIGHTS)
    { speaker: "", text: "And then every world arrives at once. The convergence. A hundred legends on one collapsing field, and the only rule left is: keep the line until the anchor seals the door.", cam: "zoom" },
    { speaker: "VEGETA", left: "vegeta", right: "frieza", pose: "idle", pose2: "idle", text: "You crawled out of one more grave, Frieza. Allow me to dig the last one myself.", cam: "static" },
    { fight: { player: "vegeta", opponent: "frieza", stageOf: "player" } },
    { speaker: "", text: "— CUT. Across the field, a cursed king meets two sorcerers who fight as one. —", cam: "zoom" },
    { fight: { player: "gojo", opponent: "sukuna", stageOf: "opponent" } },
    { speaker: "", text: "— CUT. In the ruins of a borrowed Gotham, the mercenary meets the one man who plans faster than he does. —", cam: "zoom" },
    { fight: { player: "batman", opponent: "deathstroke", stageOf: "player" } },
    { speaker: "", text: "— CUT. A mountain of gathered stone falls from the sky. A god of destruction simply... disagrees with it. —", cam: "zoom" },
    { fight: { player: "beerus", opponent: "madara", stageOf: "opponent" } },
    { speaker: "", text: "— CUT. A ninja and the masked man who broke the world fight side by side against the ghost who taught them both. —", cam: "zoom" },
    { fight: { player: "naruto", opponent: "madara", stageOf: "player" } },
    { speaker: "", text: "— CUT. Two strongest-men-alive stand back to back against an emperor's endless army. —", cam: "zoom" },
    { fight: { player: "superman", opponent: "frieza", stageOf: "opponent" } },
    { speaker: "", text: "— CUT. And a bald man in a yellow suit walks up to a god who erases timelines, sighs, and raises one fist. —", cam: "zoom" },
    { fight: { player: "saitama", opponent: "goku_black", stageOf: "opponent" } },
    { speaker: "SAITAMA", left: "saitama", pose: "win", text: "Huh. Was that supposed to be the strong one? ...Anyone know if the sale's still on?", cam: "static" },
    { speaker: "", text: "The line holds. Impossibly, gloriously, the line holds — every world buying the anchor the seconds it needs. Which leaves exactly one door, and one man walking calmly toward it.", cam: "pan" },

    // Scene 17 — Omololu vs Rick Prime  (→ FINAL BOSS)
    { speaker: "RICK PRIME", left: "rickPrime", right: "omololu", pose: "idle", pose2: "idle", text: "Everyone else is a distraction I arranged. You were always the only variable. Step aside from the door, anchor — or become the last thing the fracture ever measures.", cam: "zoom" },
    { speaker: "OMOLOLU", left: "omololu", right: "rickPrime", pose: "idle", pose2: "idle", text: "You collapsed a multiverse to build a key. Congratulations. The key says no.", cam: "static" },
    { speaker: "", text: "Everything the Nexus has left narrows to this: a boy who was nobody, and the oldest, coldest thing in creation, on the last piece of ground, in front of the last open door.", cam: "zoom" },
    { fight: { player: "omololu", opponent: "rickPrime", stageOf: "opponent" } },
    { speaker: "OMOLOLU", left: "omololu", pose: "win", text: "You spent forever looking for the one anchor that could hold the door. You found him. You just didn't think he'd hold it shut.", cam: "static" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "lose", text: "...Every version of this. Every timeline. And it ends with a kid and a locked door. ...Fine. Seal it. Let's see if you can live with what that costs, too.", cam: "zoom" },

    // Scene 18 — Going Home
    { speaker: "", text: "The anchor holds. The door begins to close — and as it closes, it un-fractures: every borrowed world sliding back toward the timeline it was torn from. The Nexus is ending the only kind way it can. By sending everyone home.", cam: "pan" },
    { speaker: "ICHIGO", left: "ichigo", right: "omololu", pose: "idle", pose2: "idle", text: "So this is it. The seams close, we all wake up where we started, and nobody back home believes a word of it. You did good, kid. Better than good.", cam: "static" },
    { speaker: "GOJO", left: "gojo", right: "omololu", pose: "idle", pose2: "idle", text: "You held a door against the end of everything. Wherever you land — don't let them tell you you're normal. I'll know they're lying.", cam: "zoom" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "Will I remember? Any of you? Or does the door take that too?", cam: "zoom" },
    { speaker: "", text: "No one answers. The light folds gently inward — not a tear this time, but a closing hand — and one by one, a hundred legends wink back into the worlds that need them. Last of all, the anchor.", cam: "pan" },
    { speaker: "", text: "END OF ACT III", cam: "static" },
  ],

  // ── EPILOGUE / POST-CREDITS — no fights, pure closure ──────────────────────────────────────
  epilogue: [
    { speaker: "", text: "EPILOGUE", cam: "static" },
    // Going home, for real
    { speaker: "", text: "A normal room. A normal bed. A normal Tuesday, exactly where he left it — as if the air never opened at all.", cam: "zoom" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "...A dream. Obviously. Grocery stores in the void. A bald guy who ends gods. A door. Obviously a dream.", cam: "static" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "So why do my knuckles still hurt. And why do I miss people I've apparently never met.", cam: "zoom" },
    // The crack in the ceiling
    { speaker: "", text: "He almost believes it. He almost lets it go. And then he looks up — and there, running the length of his perfectly normal ceiling, is a hairline crack that was never there before. Faint. Patient. Widening by a single thread.", cam: "zoom" },
    { speaker: "OMOLOLU", left: "omololu", pose: "idle", text: "...Okay. Not a dream.", cam: "static" },
    // Post-credits — Rick Prime, alone
    { speaker: "", text: "— POST-CREDITS —", cam: "static" },
    { speaker: "", text: "Somewhere with no world attached to it — a place between the closed door and the next one — a single figure sits in the dark, unhurried, already working.", cam: "pan" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "idle", text: "One anchor closed one door. There are others. There are always others.", cam: "zoom" },
    { speaker: "RICK PRIME", left: "rickPrime", pose: "idle", text: "And now I know exactly what the right one is worth. ...Right on schedule.", cam: "zoom" },
    { speaker: "", text: "THE NEXUS FRACTURE  —  to be continued", cam: "static" },
  ],
}

// The full ordered playthrough (Prologue → Act 1 → Act 2 → Act 3 → Epilogue), start-to-finish.
export const NEXUS_FRACTURE_FULL = [
  ...NEXUS_FRACTURE.prologue, ...NEXUS_FRACTURE.act1, ...NEXUS_FRACTURE.act2, ...NEXUS_FRACTURE.act3, ...NEXUS_FRACTURE.epilogue,
]
