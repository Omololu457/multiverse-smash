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
// Every rosterKey here is a fully-built fighter: omololu, rickPrime, genos, ichigo, obito.

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
}

// The full ordered playthrough (Prologue → Act 1), for a single start-to-finish run.
export const NEXUS_FRACTURE_FULL = [...NEXUS_FRACTURE.prologue, ...NEXUS_FRACTURE.act1]
