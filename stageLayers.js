// stageLayers.js — LAYERED BITMAP STAGES (render-only). A stage with `layers: "<set>"` in game.js STAGE_DEFS is drawn
// from cut-up sprite-sheet art instead of one flat picture:
//   • far layers scroll slower than the fighters (parallax), anchored so an art edge never scrolls into view;
//   • the floor is drawn ROW BY ROW, each row with its own scroll speed (far planks slow, the row the fighters stand
//     on locked to them, the front rim faster) — the arcade "line-scroll" perspective floor;
//   • animated pieces (crowd cheer frames, a flag) are painted over their parent layer at their found positions;
//   • props sit on the floor behind the fighters, and foreground props are drawn in FRONT of them (drawLayeredStageFront).
// Art + positions come from tools/stage_layers/slice_*.py → stages/<set>/layout.json. Everything here is presentation:
// wall-clock animation, no sim state, no Math.random — gameplay / netplay / replays are untouched.
import { camera } from "./camera.js"
import { woodsboroAudioTick, wbScream, wbStab, wbLaugh, wbWhisper, wbThunder, wbPhone, wbSiren } from "./woodsboroAudio.js"

// Per-set composition (native sheet pixels; S = screen pixels per native pixel).
const SETS = {
  ken_harbor: {
    dir: "./stages/ken_harbor/",
    S: 2,
    standRow: 44,                 // dock row the fighters' feet sit on (locked to the fighters: scroll factor 1)
    deckFrontRow: 53,             // last deck row; below it is the dock's front beam
    floor: { piece: "dock", farFactor: 0.70, rimFactor: 1.10 },
    // far → near. `p` = scroll factor (1 = moves with the fighters). `anchor` = the side whose art edge is a hard cut in
    // the sheet; `edge` = where that edge sits (screen px from the world centre) with the camera centred. When the view
    // would reach past the cut, the layer stops at the view edge instead (so the cut never shows, at any zoom).
    // `bottomRow` = dock row the layer's bottom sits on.
    back: [
      { piece: "sky",  p: 0.30, anchor: "right", edge: 660, bottomRow: 2, mirrorFill: { from: 0, to: 512 } },   // sea + yacht; open sea mirrored leftwards
      { procedural: "harbor", p: 0.3 },   // storm sky, horizon ships, the crane, glints, gulls (drawHarborSea)
      { piece: "ship", p: 0.62, anchor: "left", edge: -900, bottomRow: 6, bob: { amp: 1.5, period: 3.2 } },
    ],
    under: { piece: "sky", fromRow: 104, cols: [0, 512], p: 1.18, darken: 0.42 },   // the sea seen under the pier, below the dock beam
    props: [                       // on the deck, behind the fighters (x = fraction of the world width)
      { piece: "barrels", x: 0.12, bottomRow: 24 },
      { piece: "barrels", x: 0.90, bottomRow: 24, flip: true },
    ],
    front: [                       // on the dock's front lip, in front of the fighters
      { piece: "bollard",       x: 0.04, bottomRow: 58 },
      { piece: "bollard_small", x: 0.36, bottomRow: 58 },
      { piece: "bollard_small", x: 0.64, bottomRow: 58 },
      { piece: "bollard",       x: 0.96, bottomRow: 58 },
    ],
    animRate: { ship: [15, 19, 13, 17, 21, 14, 18], sky: [7] },   // ticks (1/60 s) per frame, per animated piece
    fx: "harbor",                 // gulls, dock workers, splashes, the storm, the KO wave (harborFx)
  },
}

// THE BATCAVE — Guile's air base (SFII CE sheet) repainted by tools/stage_layers/slice_guile_batcave.py.
SETS.guile_batcave = {
  dir: "./stages/guile_batcave/",
  S: 2,
  standRow: 44,
  deckFrontRow: 63,
  floor: { piece: "deck", farFactor: 0.72, rimFactor: 1.12, center: true },   // Bat-symbol centred in the world
  back: [
    { piece: "depths",  p: 0.32, tile: "mirror", bottomRow: 2, fx: "batcomputer" }, // cave depths: vehicle bays, Batcomputer
    { piece: "ceiling", p: 0.26, tile: "mirror", bottomRow: -120 },            // rock ceiling, stalactites over the depths
    { piece: "batwing", p: 0.74, x: 0.42, bottomRow: 3 },                      // the Batwing on its deck
  ],
  props: [
    { piece: "fence",          x: 0.04, bottomRow: 10 },
    { piece: "mechanic",       x: 0.13, bottomRow: 16, rate: 20 },
    { piece: "butler_pair",    x: 0.31, bottomRow: 14, rate: 24 },
    { piece: "butlers_crates", x: 0.84, bottomRow: 18, rate: 16 },
  ],
  front: [],
  under: { piece: "ceiling", fromRow: 0, cols: [0, 1024], p: 1.12, darken: 0.35 },   // rock below the platform edge
  fx: "batcave",
  animRate: {},
}

// CITADEL OF RICKS — Zangief's factory (SFII sheet) repainted by tools/stage_layers/slice_zangief_citadel.py: a hall of the
// Citadel looking out on space through its windows (a city, a space cruiser, shuttles), portal-fluid reactor, portals, sci-fi crew.
SETS.zangief_citadel = {
  dir: "./stages/zangief_citadel/",
  S: 2,
  standRow: 40,
  deckFrontRow: 59,
  floor: { piece: "floor", farFactor: 0.7, rimFactor: 1.12, center: true, mirror: true },
  back: [
    { procedural: "space", p: 0.1 },
    { piece: "wall", p: 0.5, tile: "mirror", bottomRow: 1, scale: 0.7, fx: "citadelWall" },
  ],
  props: [
    { piece: "scaffold", x: 0.12, bottomRow: 2 },
    { piece: "fence",    x: 0.56, bottomRow: 2 },
    { piece: "pillar",   x: 0.90, bottomRow: 2 },
  ],
  front: [],
  fx: "citadel",
  animRate: { scaffold: [18] },
}

// HEAVEN'S ARENA — Ryu's Stage (SFII sheet) repainted by tools/stage_layers/slice_ryu_heaven.py: a fighting floor high
// in a tower above the clouds — dusk sky through tall windows, tiered stands with a crowd, a scoreboard, the stone
// barrier wall, a raised stone ring with a gold edge, banners naming the arena and the floor.
SETS.ryu_heaven = {
  dir: "./stages/ryu_heaven/",
  S: 2,
  standRow: 24,
  deckFrontRow: 35,
  floor: { piece: "floor", farFactor: 0.72, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "heavenHall", p: 0.15 },
    { piece: "wall", p: 0.8, tile: "mirror", bottomRow: 1, scale: 0.6 },
  ],
  props: [
    { piece: "banner", x: 0.3, bottomRow: 3 },
    { piece: "banner", x: 0.7, bottomRow: 3 },
  ],
  front: [],
  fx: "heaven",
  animRate: {},
}

// VALLEY OF THE END — the game's own painted backdrop (cliffs, the two statues, the waterfall) brought into 16-bit style
// and mixed with Guile's Stage (SFII CE): its tarmac is the wet riverbank rock. tools/stage_layers/slice_guile_valley.py.
SETS.guile_valley = {
  dir: "./stages/guile_valley/",
  S: 2,
  standRow: 44,
  deckFrontRow: 63,
  floor: { piece: "deck", farFactor: 0.72, rimFactor: 1.12, center: true },
  back: [{ procedural: "valley", p: 0.35 }],
  props: [],
  front: [],
  fx: "valley",
  animRate: {},
}

// HIDDEN LEAF VILLAGE — the "Hidden Leaf Village (SSF2)" stage pack by Guybesideyou64 (tools/stage_layers/import_ssf2_leaf.py):
// the far backdrop, the floating island with the village (fighters on its sand) and the pack's foreground, as layers.
SETS.ssf2_leaf = { dir: "./stages/ssf2_leaf/", mode: "ssf2", S: 1.35, bgScale: 1.3, bgVillageRow: 720 }

// INFINITY CASTLE — the "Infinity Castle (over Pokémon Stadium 3)" SSF2 mod's bitmaps (tools/stage_layers/import_infinity_castle.py):
// the castle backdrop with floating rooms drifting through it, the wooden platform's planks as the floor, its front
// wall below, and a row of its lanterns along the back edge, flickering.
SETS.infinity_castle = {
  dir: "./stages/infinity_castle/",
  S: 2,
  standRow: 44,
  deckFrontRow: 66,
  floor: { piece: "deck", farFactor: 0.7, rimFactor: 1.12, center: true, mirror: true },
  back: [{ procedural: "castle", p: 0.25 }],
  props: [0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9].map(x => ({ piece: "lantern", x, bottomRow: 4 })),
  front: [],
  fx: "infinity",
  animRate: {},
}

// THE NULL VOID — Blanka's Stage (SFII sheet) repainted by tools/stage_layers/slice_blanka_nullvoid.py: an endless prison
// dimension — a void lit like the Unlimited Void (stars, nebulae, a faint grid), a swirling rift pulling debris in,
// glowing mist, drifting rock islands (one with a petrified tree, one with a wrecked shack), and the jagged underside of
// the floating island the fighters stand on.
SETS.blanka_nullvoid = {
  dir: "./stages/blanka_nullvoid/",
  S: 2,
  standRow: 44,
  deckFrontRow: 63,
  floor: { piece: "floor", farFactor: 0.72, rimFactor: 1.12, center: true, mirror: true },
  back: [{ procedural: "nullvoid", p: 0.12 }],
  props: [],
  front: [],
  fx: "nullvoid",
  animRate: {},
}

// SHIBUYA INCIDENT — Chun-Li's Stage (SFII sheet) repainted by tools/stage_layers/slice_chunli_shibuya.py: the market
// street at night under the dome, towers behind; bystanders, gore and city destruction drawn live (see drawShibuyaBack).
SETS.chunli_shibuya = {
  dir: "./stages/chunli_shibuya/",
  S: 2,
  standRow: 34,
  deckFrontRow: 79,
  floor: { piece: "street", farFactor: 0.8, rimFactor: 1.08, center: true, mirror: true },
  back: [{ procedural: "shibuya", p: 0.35 }],
  props: [],
  front: [],
  fx: "shibuya",
  animRate: {},
}

// JUJUTSU HIGH — Ryu's Stage (SFII sheet) repainted by tools/stage_layers/slice_ryu_jujutsu.py: the school in the hills
// at dusk, with a watching crowd of JJK characters and multiverse visitors (drawJujutsuBack / jujutsuFx).
SETS.ryu_jujutsu = {
  dir: "./stages/ryu_jujutsu/",
  S: 2,
  standRow: 24,
  deckFrontRow: 35,
  floor: { piece: "floor", farFactor: 0.72, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "jujutsu", p: 0.15 },
    { piece: "wall", p: 0.85, tile: "mirror", bottomRow: 1, scale: 0.7 },
  ],
  props: [
    { piece: "sign", x: 0.36, bottomRow: 3 },
    { piece: "sign", x: 0.64, bottomRow: 3 },
  ],
  front: [],
  fx: "jujutsu",
  animRate: {},
}

// THE ARMOR LAB — Guile's air base (SFII CE sheet) repainted by tools/stage_layers/slice_guile_starklab.py: an inventor's
// workshop — suits in glass pods, holograms, robot arms, reactor core, the prototype jet on its lift (drawLabBack / labFx).
SETS.guile_starklab = {
  dir: "./stages/guile_starklab/",
  S: 2,
  standRow: 44,
  deckFrontRow: 63,
  floor: { piece: "deck", farFactor: 0.72, rimFactor: 1.12, center: true },
  back: [
    { procedural: "starklab", p: 0.6 },
    { piece: "jet", p: 0.74, x: 0.16, bottomRow: 3, scale: 0.36 },
  ],
  props: [],
  front: [],
  fx: "starklab",
  animRate: {},
}

// WORLD TOURNAMENT ARENA — Sagat's Stage (Street Fighter 1987 sheet) repainted by tools/stage_layers/slice_sagat_tournament.py:
// the hall + stairs behind, banners, packed stands, the white-tiled ring that cracks, ringside celebrities, the announcer.
SETS.sagat_tournament = {
  dir: "./stages/sagat_tournament/",
  S: 2,
  standRow: 30,
  deckFrontRow: 46,
  floor: { piece: "grass", farFactor: 0.75, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "tournament", p: 0.1 },
    { piece: "hall", p: 0.6, tile: "mirror", bottomRow: 1 },
  ],
  props: [],
  front: [],
  fx: "tournament",
  animRate: {},
}

// PLANET NAMEK — Eagle's Stage (Street Fighter 1987 sheet) repainted by tools/stage_layers/slice_eagle_namek.py, under
// Frieza's invasion: the ship, soldiers, bombs, villagers fleeing and dying, warriors fighting back, villages burning.
SETS.eagle_namek = {
  dir: "./stages/eagle_namek/",
  S: 2,
  standRow: 24,
  deckFrontRow: 40,
  floor: { piece: "ground", farFactor: 0.75, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "namek", p: 0.1 },
    { piece: "land", p: 0.6, tile: "mirror", bottomRow: 1 },
  ],
  props: [],
  front: [],
  fx: "namek",
  animRate: {},
}

// THE BARATIE (One Piece) — Ken's Stage, San Francisco (Street Fighter III: 2nd Impact sheet) repainted by
// tools/stage_layers/slice_ken3_baratie.py: open sea, a moored pirate galleon, a sea battle, a Sea King, cooks, the crowd.
SETS.ken3_baratie = {
  dir: "./stages/ken3_baratie/",
  S: 1.5,
  standRow: 22,
  deckFrontRow: 50,
  floor: { piece: "deck", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "baratie_sea", p: 0.08 },
    { procedural: "baratie_ship", p: 0.82 },
    { piece: "pier", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 1 },     // mirrored on past its ends: never a gap
  ],
  props: [],
  front: [],
  fx: "baratie",
  animRate: {},
}

// KRYPTON — Necro's Stage, Moscow (Street Fighter III: New Generation sheet) repainted by
// tools/stage_layers/slice_necro_krypton.py: the citadel with its dome torn open on Krypton's last day under Brainiac.
SETS.necro_krypton = {
  dir: "./stages/necro_krypton/",
  S: 0.95,
  standRow: 26,
  deckFrontRow: 56,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "krypton", p: 0.05 },
    { piece: "hall", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 1 },     // mirrored on past its ends: never a gap
  ],
  props: [],
  front: [],
  fx: "krypton",
  animRate: {},
}

// MULTIVERSE ROULETTE — no art of its own: it draws a RANDOM other map, whole, and keeps rifting into others.
SETS.code_random = { mode: "random", dir: "./stages/code_random/", S: 1.6, standRow: 30 }

// THE ORIGINALS (homage to the creators) — no sheet: three dimensions drawn in code (Omololu's lab, Dseyl's sky, Enoch's
// frost & flame) that the multiverse keeps switching between; the floor is painted per dimension in the fx pass.
SETS.code_originals = {
  dir: "./stages/code_originals/",
  S: 1.6,
  standRow: 30,
  deckFrontRow: 70,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [{ procedural: "originals", p: 0.9 }],
  props: [],
  front: [],
  fx: "originals",
  animRate: {},
}

// THE ANALYSIS NEXUS (original universe) — no sheet: drawn in code over a generated data-grid floor (gen_code_floors.py).
SETS.code_nexus = {
  dir: "./stages/code_nexus/",
  S: 1.6,
  standRow: 30,
  deckFrontRow: 70,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [{ procedural: "nexus", p: 0.9 }],
  props: [],
  front: [],
  fx: "nexus",
  animRate: {},
}

// PK ACADEMY (Saiki K.) — no sheet: the school drawn in code over a generated schoolyard floor (gen_code_floors.py).
SETS.code_pk = {
  dir: "./stages/code_pk/",
  S: 1.6,
  standRow: 40,
  deckFrontRow: 80,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [{ procedural: "pk", p: 0.9 }],
  props: [],
  front: [],
  fx: "pk",
  animRate: {},
}

// WOODSBORO (Scream) — no sheet: the suburb drawn in code over a generated street floor (gen_code_floors.py).
SETS.code_woodsboro = {
  dir: "./stages/code_woodsboro/",
  S: 1.6,
  standRow: 60,
  deckFrontRow: 90,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [{ procedural: "woodsboro", p: 0.9 }],
  props: [],
  front: [],
  fx: "woodsboro",
  animRate: {},
}

// THE BATTLE ROYALE COLOSSEUM — no sheet: everything drawn in code over a generated sand floor
// (tools/stage_layers/gen_code_floors.py).
SETS.code_colosseum = {
  dir: "./stages/code_colosseum/",
  S: 1.6,
  standRow: 30,
  deckFrontRow: 70,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [{ procedural: "colosseum", p: 0.9 }],
  props: [],
  front: [],
  fx: "colosseum",
  animRate: {},
}

// SHADOW GARDEN (The Eminence in Shadow) — Eagle's stage (SF 1987 sheet) repainted as a moonlit night by
// tools/stage_layers/slice_eagle_shadow.py; the sky, moon, agents, the Seven Shadows and ATOMIC are drawn in code.
SETS.eagle_shadow = {
  dir: "./stages/eagle_shadow/",
  S: 1.9,
  standRow: 14,
  deckFrontRow: 40,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "shadow", p: 0.05 },
    { piece: "land", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },
  ],
  props: [],
  front: [],
  fx: "shadow",
  animRate: {},
}

// ASAKUSA (Demon Slayer) — Gen's stage (SF 1987 sheet) re-lit for night, signs repainted, by
// tools/stage_layers/slice_gen_asakusa.py; the sky, the Ryōunkaku, lanterns, lettering and townsfolk are drawn in code.
SETS.gen_asakusa = {
  dir: "./stages/gen_asakusa/",
  S: 1.7,
  standRow: 12,
  deckFrontRow: 30,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "asakusa", p: 0.05 },
    { piece: "street", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },
  ],
  props: [],
  front: [],
  fx: "asakusa",
  animRate: {},
}

// QUEENS ALLEY (Marvel) — Alex's stage (SF3 NY sheet) pieces by tools/stage_layers/slice_alex_queens.py, set in a row
// with walk-ups drawn in code on both sides (drawQueensBack draws all of it); the life + reactions in queensFx.
SETS.alex_queens = {
  dir: "./stages/alex_queens/",
  S: 1.6,
  standRow: 26,
  deckFrontRow: 56,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [{ procedural: "queens", p: 0.9 }],
  props: [],
  front: [],
  fx: "queens",
  animRate: {},
}

// THE FOREST OF DEATH (Naruto) — Oro's stage (SF3 sheet): the cave repainted as the hollow under a giant tree's roots,
// by tools/stage_layers/slice_oro_forest.py; the forest, the tower, the canopy and the snakes are drawn in code.
SETS.oro_forest = {
  dir: "./stages/oro_forest/",
  S: 1.6,
  standRow: 22,
  deckFrontRow: 50,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "forest", p: 0.05 },
    { piece: "hollow", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },
  ],
  props: [],
  front: [],
  fx: "forest",
  animRate: {},
}

// SUNAGAKURE (Naruto) — Lee's Stage (SF 1987 sheet): only the parapet + tiled floor kept, repainted sandstone, by
// tools/stage_layers/slice_lee_suna.py; the cliffs, the village and the Kazekage building are drawn in code.
SETS.lee_suna = {
  dir: "./stages/lee_suna/",
  S: 1.9,
  standRow: 14,
  deckFrontRow: 34,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "suna", p: 0.05 },
    { piece: "wall", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },
  ],
  props: [],
  front: [],
  fx: "suna",
  animRate: {},
}

// THE COMMAND CENTER (Mighty Morphin Power Rangers) — Mike's Stage (SF 1987 sheet) with its carved rock removed by
// tools/stage_layers/slice_mike_command.py: the open desert outside Angel Grove; the Command Center + its hill drawn in code.
SETS.mike_command = {
  dir: "./stages/mike_command/",
  S: 1.6,
  standRow: 20,
  deckFrontRow: 40,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "command", p: 0.05 },
    { piece: "rock", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },
  ],
  props: [],
  front: [],
  fx: "command",
  animRate: {},
}

// YORKNEW CITY (Hunter x Hunter) — Hong Kong (Yun's Stage, SFIII) sheet, cut by tools/stage_layers/slice_yun_yorknew.py;
// the street has writing on it → tile:"repeat" (never mirrored).
SETS.yun_yorknew = {
  dir: "./stages/yun_yorknew/",
  S: 1.85,                                                               // wider than the view: a join between repeats is rarely on screen
  standRow: 24,
  deckFrontRow: 46,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: false },   // plain repeats like the street (the rails would mirror into Vs)
  back: [
    { procedural: "yorknew", p: 0.05 },
    { piece: "street", p: 0.9, x: 0.5, tile: "repeat", bottomRow: 0 },
  ],
  props: [],
  front: [],
  fx: "yorknew",
  animRate: {},
}

// THE VILTRUMITE BATTLEGROUND (Invincible) — Adon's Stage (Street Fighter 1987 sheet) burned into a war zone by
// tools/stage_layers/slice_adon_viltrum.py (its seated statue cut out); the warrior statue + the war are drawn in code.
SETS.adon_viltrum = {
  dir: "./stages/adon_viltrum/",
  S: 1.9,
  standRow: 20,
  deckFrontRow: 36,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "viltrum", p: 0.05 },
    { piece: "ruins", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },
  ],
  props: [],
  front: [],
  fx: "viltrum",
  animRate: {},
}

// THE MUGEN TRAIN (Demon Slayer) — Joe's Stage (Street Fighter 1987 sheet) repainted at night by
// tools/stage_layers/slice_joe_mugen.py: the train yard, the Mugen Train's maroon carriages with every window lit.
SETS.joe_mugen = {
  dir: "./stages/joe_mugen/",
  S: 1.75,
  standRow: 22,
  deckFrontRow: 40,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "mugen", p: 0.05 },
    { piece: "yard", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },     // mirrored on past its ends: the carriages run on, never a gap
  ],
  props: [],
  front: [],
  fx: "mugen",
  animRate: {},
}

// THE SEIREITEI (Bleach) — Retsu's Stage (Street Fighter 1987 sheet; also Arlong Park) repainted the other way by
// tools/stage_layers/slice_retsu_seireitei.py: white walls, slate roofs, sakura, the Bleach cast in the courtyard.
SETS.retsu_seireitei = {
  dir: "./stages/retsu_seireitei/",
  S: 2,
  standRow: 18,
  deckFrontRow: 34,
  floor: { piece: "floor", farFactor: 0.78, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "seireitei", p: 0.05 },
    { piece: "wall", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },     // no writing on the wall: mirrored on past its ends, never a gap
  ],
  props: [],
  front: [],
  fx: "seireitei",
  animRate: {},
}

// ANGEL GROVE (Power Rangers) — Sao Paulo (Sean's Stage, SFIII 2nd Impact sheet) by tools/stage_layers/slice_sean_angelgrove.py:
// the wrecked street; downtown the Megazords fight giant monsters, the Falconzord strafes, Rangers fight Krybots, civilians run.
SETS.sean_angelgrove = {
  dir: "./stages/sean_angelgrove/",
  S: 1.15,
  standRow: 26,
  deckFrontRow: 60,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "angelgrove", p: 0.9 },
    { piece: "street", p: 0.9, x: 0.5, tile: "repeat", bottomRow: 0 },   // repeats (the signs must read right); never a gap
  ],
  props: [],
  front: [],
  fx: "angelgrove",
  animRate: {},
}

// BELLWOOD (Ben 10) — Birdie's Stage (Street Fighter 1987 sheet) by tools/stage_layers/slice_birdie_bellwood.py: a quiet
// main street (Mr. Smoothy), neighbours + pigeons; the fight in the street draws a crowd, a car alarm, the cops.
SETS.birdie_bellwood = {
  dir: "./stages/birdie_bellwood/",
  S: 1.5,
  standRow: 60,          // in the road: sidewalk 40 rows + curb 8 + 12
  deckFrontRow: 70,
  floor: { piece: "floor", farFactor: 0.8, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "bellwood_sky", p: 0.05 },
    { piece: "street", p: 0.9, x: 0.5, tile: "repeat", bottomRow: 0 },   // the block repeats (not mirrored: the shop signs + house numbers must read right); never a gap
  ],
  props: [],
  front: [],
  fx: "bellwood",
  animRate: {},
}

// ARLONG PARK (One Piece) — Retsu's Stage (Street Fighter 1987 sheet) repainted by tools/stage_layers/slice_retsu_arlong.py:
// red walls + gate, tangerine trees, Arlong's tower (topples on the KO), fish-men, villagers, the sea cow.
SETS.retsu_arlong = {
  dir: "./stages/retsu_arlong/",
  S: 2,
  standRow: 18,
  deckFrontRow: 34,
  floor: { piece: "floor", farFactor: 0.78, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "arlong_sky", p: 0.05 },
    { piece: "wall", p: 0.9, x: 0.5, tile: "mirror", bottomRow: 0 },     // mirrored on past its ends: never a gap
  ],
  props: [],
  front: [],
  fx: "arlong",
  animRate: {},
}

// ROOM3D sets are drawn as a real 3D room (one perspective projection for floor, ceiling, back + side walls, props).
// Units: lateral X = world x at the fighters' depth (z = 1); H = height above the floor in the same pixels; z = depth
// relative to the fighters (1 = their plane, > 1 = further back). Screen: x = camX + (X - camX) / z,
// y = horizon + (K - H) / z, horizon = groundY - K. So the fighters' plane scrolls with them and deeper things slower.
SETS.honda_training = {
  mode: "room3d",
  dir: "./stages/honda_training/",
  K: 240,              // groundY - horizon (camera height above the floor)
  zw: 1.7,             // back wall depth
  D0: 900,             // depth pixels per z unit (keeps floor tiles square)
  tile: 80,            // floor / ceiling square size at the fighters' depth
  wallTile: 64,        // back / side wall squares
  side: 60,            // side walls at X = -side and W + side
  wallScale: 1.6,      // the wall art's screen scale at the wall depth (→ its height sets the ceiling height)
  ring: { z: 1.08, rx: 1010, rd: 260 },                 // the sumo ring, now a glowing training ring
  startLines: { dx: 120, z0: 0.98, z1: 1.16 },          // its two start lines (shikiri-sen)
  tub: { z: 1.5, x: 0.5 }, bucket: { z: 1.24, x: 0.14 }, // bath tub → hologram platform; wash bucket
  door: { zFront: 1.12 },                                // side-wall door art runs from this depth to the back wall
  cubes: [                                               // floating hologram boxes (x = fraction of the world width)
    { x: 0.10, H: 250, z: 1.42, s: 46 }, { x: 0.24, H: 360, z: 1.62, s: 34 }, { x: 0.38, H: 395, z: 1.30, s: 28 },
    { x: 0.63, H: 380, z: 1.55, s: 40 }, { x: 0.78, H: 300, z: 1.36, s: 52 }, { x: 0.93, H: 210, z: 1.48, s: 38 },
    { x: 0.30, H: 455, z: 0.86, s: 30, front: true }, { x: 0.72, H: 470, z: 0.82, s: 26, front: true },
  ],
  colors: { bg: "#eef5fa", floor: "#f6fafd", ceil: "#e9f2f8", wall: "#f3f8fc", side: "#e6f0f7", line: "70,196,255" },
}

const cache = new Map()   // set → { layout, img: {file → Image}, failed }
function load(set) {
  let c = cache.get(set)
  if (c) return c
  c = { layout: null, img: {}, failed: false }
  cache.set(set, c)
  const def = SETS[set]
  if (!def || typeof fetch !== "function") { c.failed = true; return c }
  fetch(def.dir + "layout.json").then(r => r.json()).then(L => {
    const files = new Set(Object.values(L.pieces).map(p => p.file))
    for (const a of L.anims || []) for (const f of a.frames) files.add(f.file)
    for (const p of Object.values(L.pieces)) for (const f of p.frames || []) files.add(f)
    for (const f of files) { const im = new Image(); im.src = def.dir + f; c.img[f] = im }
    c.layout = L
  }).catch(() => { c.failed = true })
  return c
}
const ready = im => !!(im && im.complete && im.naturalWidth > 0)

/** true once the set's art is loaded (callers fall back to their normal backdrop until then) */
export function layeredStageReady(stage) {
  const set = stage?.layers; if (!set || !SETS[set]) return false
  const c = load(set); if (!c.layout) return false
  return Object.values(c.layout.pieces).every(p => ready(c.img[p.file]))
}

// Camera-dependent horizontal offset of a layer with scroll factor p (0 when the camera is centred on the world).
const shift = (p, W) => ((camera.x ?? W / 2) - W / 2) * (1 - p)
function view(cw, W) {
  const z = camera.zoom || 1, half = (cw / z) / 2, cx = camera.x ?? W / 2
  return { left: cx - half, right: cx + half }
}
// ping-pong frame index for animated piece k (wall clock → render only)
function frameOf(n, rate, k) {
  if (n <= 1) return 0
  const t = Math.floor((typeof performance !== "undefined" ? performance.now() : 0) / (1000 / 60) / rate) + k * 5
  const cyc = 2 * n - 2, i = t % cyc
  return i < n ? i : cyc - i
}

function drawAnims(ctx, c, def, parent, x0, y0, S) {
  let k = -1
  for (const a of c.layout.anims || []) {
    if (a.parent !== parent) continue
    k++
    const rate = (def.animRate[parent] || [])[k] || 16
    const fi = frameOf(a.frames.length, rate, k)
    if (fi === a.anchor) continue                      // the anchor frame is already painted on the parent art (-1: none)
    const f = a.frames[fi], im = c.img[f.file]
    if (ready(im)) ctx.drawImage(im, x0 + f.x * S, y0 + f.y * S, f.w * S, f.h * S)
  }
}

// Scroll factor of floor row r: far rows slower, the standing row = 1, deck in front of it faster, front beam fastest.
function rowFactor(def, r) {
  const { farFactor, rimFactor } = def.floor, R = def.standRow
  if (r > def.deckFrontRow) return rimFactor
  const f = r <= R ? farFactor + (1 - farFactor) * (r / R) : 1 + (rimFactor - 1) * ((r - R) / (def.deckFrontRow + 1 - R))
  return f
}

function drawSprite(ctx, im, x, y, w, h, flip) {
  if (!flip) { ctx.drawImage(im, x, y, w, h); return }
  ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, h); ctx.restore()
}

/**
 * Draw the stage behind the fighters (world space, inside the camera transform). Returns false when the stage has no
 * layer set or its art is still loading (the caller then draws its normal backdrop).
 */
let _backArgs = null   // the last draw's frame (The Originals draws OTHER maps in place with it)
export function drawLayeredStageBack(ctx, stage, { canvasWidth, worldWidth: W, groundY, coverTop, coverBottom }) {
  if (!_orNest) _backArgs = { canvasWidth, worldWidth: W, groundY, coverTop, coverBottom }
  const set = stage?.layers, def = SETS[set]
  if (def?.mode === "random") return drawRandomStage(ctx, def, { canvasWidth, W, groundY, coverTop, coverBottom })
  if (!def || !layeredStageReady(stage)) return false
  if (def.mode === "room3d") return drawRoom3d(ctx, def, cache.get(set), { canvasWidth, W, groundY, coverTop, coverBottom })
  if (def.mode === "ssf2") return drawSsf2Back(ctx, def, cache.get(set), { canvasWidth, W, groundY, coverTop, coverBottom })
  const c = cache.get(set), L = c.layout, P = L.pieces, S = def.S
  const dockTop = groundY - def.standRow * S
  const v = view(canvasWidth, W), padL = v.left - 8, padR = v.right + 8
  const wasSmooth = ctx.imageSmoothingEnabled
  ctx.save()
  ctx.imageSmoothingEnabled = false

  // 1. fill: sky colour above the art, sea colour down to the dock, the under-dock shadow below the beam
  ctx.fillStyle = L.colors.skyTop;    ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  ctx.fillStyle = L.colors.under;     ctx.fillRect(padL, dockTop, padR - padL, Math.max(0, coverBottom - dockTop))

  // 2. far layers (parallax, edge-anchored)
  const t = (typeof performance !== "undefined" ? performance.now() : 0) / 1000
  const drawn = {}
  for (const ly of def.back) {
    if (ly.procedural === "space") { drawSpace(ctx, def, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    if (ly.procedural === "originals") { drawOriginalsBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "nexus") { drawNexusBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "pk") { drawPkBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "woodsboro") { drawWoodsboroBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "colosseum") { drawColosseumBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "shadow") { drawShadowSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "asakusa") { drawAsakusaSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "queens") { drawQueensBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "harbor") { drawHarborSea(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "forest") { drawForestSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "suna") { drawSunaSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "command") { drawCommandSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "yorknew") { drawYorknewSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "viltrum") { drawViltrumSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "mugen") { drawMugenSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "seireitei") { drawSeireiteiSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "angelgrove") { drawAngelGroveSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "bellwood_sky") { drawBellwoodSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "arlong_sky") { drawArlongSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "krypton") { drawKryptonSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "baratie_sea") { drawBaratieSea(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "baratie_ship") { drawBaratieMoored(ctx, def, c, { W, dockTop }); continue }
    if (ly.procedural === "namek") { drawNamekBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "tournament") { drawTournamentBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "starklab") { drawLabBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "jujutsu") { drawJujutsuBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "shibuya") { drawShibuyaBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "nullvoid") { drawNullVoidBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    if (ly.procedural === "castle") { drawCastleBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    if (ly.procedural === "valley") { drawValleyBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    if (ly.procedural === "heavenHall") { drawHeavenHall(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    const pc = P[ly.piece], im = c.img[pc.file], ls = S * (ly.scale || 1), w = pc.w * ls, h = pc.h * ls
    if (ly.tile === "mirror" || ly.tile === "repeat" || ly.x != null) {               // repeating cave walls / a single placed object
      const x0 = (ly.x != null ? ly.x * W : W / 2) - w / 2 + shift(ly.p, W)
      const y = dockTop + ly.bottomRow * S - h
      drawn[ly.piece] = { x: x0, y, S: ls }
      if (ly.tile !== "mirror" && ly.tile !== "repeat") { ctx.drawImage(im, x0, y, w, h); continue }
      if (ly.fx === "citadelWall") citadelWindows(ctx, { x: x0, y, S: ls }, { W, w, padL, padR, p: ly.p })   // the view, behind the frames
      const after = ly.fx === "batcomputer" ? () => batcomputer(ctx, c, drawn[ly.piece], S)
        : ly.fx === "citadelWall" ? () => citadelWall(ctx, def, c, drawn[ly.piece], { W, w, h, padL, padR, dockTop, coverTop, p: ly.p }) : null
      for (let k = Math.floor((padL - x0) / w); x0 + k * w < padR; k++) {
        const xx = x0 + k * w, odd = ly.tile === "mirror" && Math.abs(k) % 2 === 1
        if (!odd) { ctx.drawImage(im, Math.floor(xx), y, w + 1, h); continue }
        ctx.save(); ctx.translate(Math.floor(xx) + w, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w + 1, h); ctx.restore()
      }
      if (after) after()
      continue
    }
    let x
    if (ly.anchor === "right") x = Math.max(W / 2 + ly.edge + shift(ly.p, W), v.right + 2) - w
    else if (ly.anchor === "left") x = Math.min(W / 2 + ly.edge + shift(ly.p, W), v.left - 2)
    else x = (W - w) / 2 + shift(ly.p, W)
    let y = dockTop + ly.bottomRow * S - h
    if (ly.bob) y += Math.round(Math.sin((t / ly.bob.period) * Math.PI * 2) * ly.bob.amp) * S
    if (ly.mirrorFill) {                                 // extend the open part of the art on the cut-free side, mirrored
      const sw = (ly.mirrorFill.to - ly.mirrorFill.from) * S
      if (ly.anchor === "right") {
        for (let k = 1, xx = x - sw; xx + sw > padL; k++, xx -= sw) {
          ctx.save(); ctx.translate(xx + (k % 2 ? sw : 0), y); ctx.scale(k % 2 ? -1 : 1, 1)
          ctx.drawImage(im, ly.mirrorFill.from, 0, ly.mirrorFill.to - ly.mirrorFill.from, pc.h, 0, 0, sw, h)
          ctx.restore()
        }
      }
    }
    ctx.drawImage(im, x, y, w, h)
    drawAnims(ctx, c, def, ly.piece, x, y, S)
    if (ly.mirrorFill) {                                 // soften the art's top edge into the plain sky above it
      const g = ctx.createLinearGradient(0, y - 1, 0, y + 48)
      g.addColorStop(0, L.colors.skyTop); g.addColorStop(1, L.colors.skyTop + "00")
      ctx.fillStyle = g; ctx.fillRect(padL, y - 1, padR - padL, 49)
    }
  }

  // 3. the floor, one row at a time (perspective line-scroll), tiled across the view
  const fl = P[def.floor.piece], fim = c.img[fl.file], tw = fl.w * S
  const org = def.floor.center ? W / 2 - tw / 2 : 0
  for (let r = 0; r < fl.h; r++) {
    const off = shift(rowFactor(def, r), W) + org
    if (def.floor.mirror) {                                // tiles alternately mirrored (art that doesn't tile seamlessly)
      const k0 = Math.floor((padL - off) / tw)
      for (let k = k0, x = off + k0 * tw; x < padR; k++, x += tw) {
        if (Math.abs(k) % 2 === 0) { ctx.drawImage(fim, 0, r, fl.w, 1, Math.floor(x), dockTop + r * S, tw + 1, S); continue }
        ctx.save(); ctx.translate(Math.floor(x) + tw, dockTop + r * S); ctx.scale(-1, 1); ctx.drawImage(fim, 0, r, fl.w, 1, 0, 0, tw + 1, S); ctx.restore()
      }
      continue
    }
    let x = ((off - padL) % tw + tw) % tw - tw + padL      // first tile start at or left of the view's left edge
    for (; x < padR; x += tw) ctx.drawImage(fim, 0, r, fl.w, 1, Math.floor(x), dockTop + r * S, tw + 1, S)
  }

  // 3b. under the pier: the sea's lower rows, tiled (mirrored vertically) and darkened, scrolling a little faster
  const un = def.under
  if (un) {
    // open-sea columns only (no yacht), tiles alternately mirrored (sideways and up/down) so every seam matches
    const sp = P[un.piece], sim = c.img[sp.file], rows = sp.h - un.fromRow, [c0, c1] = un.cols, cw = c1 - c0
    const tw2 = cw * S, th = rows * S, top = dockTop + fl.h * S, off = shift(un.p, W)
    ctx.fillStyle = L.colors.seaBottom; ctx.fillRect(padL, top, padR - padL, Math.max(0, coverBottom - top))
    const x0 = ((off - padL) % (2 * tw2) + 2 * tw2) % (2 * tw2) - 2 * tw2 + padL
    for (let j = 0, x = x0; x < padR; j++, x += tw2) {     // one band of water, then it fades into the deep
      ctx.save(); ctx.translate(Math.floor(x) + (j % 2 ? tw2 : 0), top); ctx.scale(j % 2 ? -1 : 1, 1)
      ctx.drawImage(sim, c0, un.fromRow, cw, rows, 0, 0, tw2 + 1, th); ctx.restore()
    }
    const g = ctx.createLinearGradient(0, top, 0, top + th)
    g.addColorStop(0, `rgba(0,0,0,${Math.min(0.9, un.darken + 0.3)})`); g.addColorStop(0.35, `rgba(0,0,0,${un.darken})`); g.addColorStop(1, "rgba(0,0,0,0.78)")
    ctx.fillStyle = g; ctx.fillRect(padL, top, padR - padL, th)
    ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.fillRect(padL, top + th, padR - padL, Math.max(0, coverBottom - top - th))
  }

  // 4. props standing on the deck, behind the fighters
  drawProps(ctx, c, def, def.props, W, dockTop)
  if (def.fx === "batcave") batcaveFx(ctx, def, c, drawn, { W, dockTop, padL, padR, coverTop })
  if (def.fx === "citadel") citadelFloor(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "heaven") heavenFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "valley") valleyRiver(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "infinity") infinityFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "originals") originalsFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "nexus") nexusFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "pk") pkFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "woodsboro") woodsboroFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "colosseum") colosseumFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "shadow") shadowFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "asakusa") asakusaFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "queens") queensFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "harbor") harborFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "forest") forestFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "suna") sunaFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "command") commandFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "yorknew") yorknewFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "viltrum") viltrumFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "mugen") mugenFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "seireitei") seireiteiFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "angelgrove") angelGroveFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "bellwood") bellwoodFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "arlong") arlongFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "krypton") kryptonFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "baratie") baratieFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "namek") namekFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "tournament") tournamentFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "starklab") labFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "jujutsu") jujutsuFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "shibuya") shibuyaFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "nullvoid") nullVoidUnder(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  ctx.restore()
  ctx.imageSmoothingEnabled = wasSmooth
  return true
}

function drawProps(ctx, c, def, list, W, dockTop) {
  const S = def.S
  for (const pr of list) {
    const pc = c.layout.pieces[pr.piece]
    const im = c.img[pc.frames ? pc.frames[frameOf(pc.frames.length, pr.rate || 14, Math.round(pr.x * 10))] : pc.file]
    if (!ready(im)) continue
    const w = pc.w * S, h = pc.h * S
    const x = pr.x * W - w / 2 + shift(rowFactor(def, pr.bottomRow), W)
    drawSprite(ctx, im, Math.round(x), dockTop + pr.bottomRow * S - h, w, h, pr.flip)
    if (!pr.flip) drawAnims(ctx, c, def, pr.piece, Math.round(x), dockTop + pr.bottomRow * S - h, S)
  }
}

/** Foreground props, drawn AFTER the fighters (world space). No-op for stages without a layer set. */
export function drawLayeredStageFront(ctx, stage, worldWidth, groundY, world = null) {
  const set = stage?.layers, def = SETS[set]
  _lastWorld = world
  if (def?.mode === "random") { const s = rmFrontSet(); if (s && SETS[s] && SETS[s].mode !== "random") drawLayeredStageFront(ctx, { layers: s }, worldWidth, groundY, world); return }
  if (def?.fx === "shibuya" && world && layeredStageReady(stage)) shibuyaFront(ctx, def, cache.get(set), worldWidth, groundY, world)
  if (def?.mode === "room3d") { if (layeredStageReady(stage)) drawRoomFront(ctx, def, worldWidth, groundY); return }
  if (def?.mode === "ssf2") { if (layeredStageReady(stage)) drawSsf2Front(ctx, def, cache.get(set), worldWidth, groundY); return }
  if (!def || !def.front?.length || !layeredStageReady(stage)) return
  const wasSmooth = ctx.imageSmoothingEnabled
  ctx.save(); ctx.imageSmoothingEnabled = false
  drawProps(ctx, cache.get(set), def, def.front, worldWidth, groundY - def.standRow * def.S)
  ctx.restore(); ctx.imageSmoothingEnabled = wasSmooth
}

// ───────────────────────────── ROOM3D (hologram training center) ─────────────────────────────
function roomCam(def, W, groundY, c) {
  const cx = camera.x ?? W / 2, yh = groundY - def.K
  const P = (X, H, z) => [cx + (X - cx) / z, yh + (def.K - H) / z]
  const Hc = c.layout.pieces.wall.h * def.wallScale * def.zw
  return { cx, yh, P, Hc }
}
const now = () => (typeof performance !== "undefined" ? performance.now() : 0) / 1000
// glowing hologram stroke: wide faint halo + bright core
function glow(ctx, rgb, w, a, path) {
  for (const [lw, al] of [[w * 5, 0.07], [w * 2.4, 0.18], [w, 0.9]]) {
    ctx.strokeStyle = `rgba(${rgb},${al * a})`; ctx.lineWidth = lw; ctx.beginPath(); path(); ctx.stroke()
  }
}
function poly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath() }

function drawRoom3d(ctx, def, c, { canvasWidth, W, groundY, coverTop, coverBottom }) {
  const { yh, P, Hc } = roomCam(def, W, groundY, c), C = def.colors, LN = C.line
  const v = view(canvasWidth, W), padL = v.left - 8, padR = v.right + 8
  const XL = -def.side, XR = W + def.side, zw = def.zw, t = now()
  const flick = 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 2.1)          // hologram shimmer
  const zFloor = Math.max(0.12, def.K / Math.max(1, coverBottom - yh))         // nearest visible floor depth
  const zCeil = Math.max(0.12, (Hc - def.K) / Math.max(1, yh - coverTop))      // nearest visible ceiling depth
  const zNear = Math.min(zFloor, zCeil, 0.5)
  const stepZ = def.tile / def.D0
  ctx.save()
  ctx.fillStyle = C.bg; ctx.fillRect(padL, coverTop, padR - padL, coverBottom - coverTop)

  // ── ceiling + floor planes (trapezoids between the side walls) with square grids
  const plane = (H, zn, fill, alphaK) => {
    ctx.fillStyle = fill; ctx.beginPath(); poly(ctx, [P(XL, H, zw), P(XR, H, zw), P(XR, H, zn), P(XL, H, zn)]); ctx.fill()
    for (let X = Math.ceil(XL / def.tile) * def.tile; X <= XR; X += def.tile)            // lines running into the room
      glow(ctx, LN, 1, 0.55 * alphaK * flick, () => { const a = P(X, H, zw), b = P(X, H, zn); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    for (let z = zw; z > zn; z -= stepZ) {                                               // lines across, fainter with depth
      const a = P(XL, H, z), b = P(XR, H, z), k = Math.min(1, 1.25 / z)
      glow(ctx, LN, 1, 0.55 * alphaK * k * flick, () => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    }
  }
  plane(Hc, zCeil, C.ceil, 0.7)
  // ceiling light panels: every third square glows softly
  for (let X = Math.ceil(XL / (def.tile * 3)) * def.tile * 3; X < XR; X += def.tile * 3)
    for (let z = zw - stepZ; z > zCeil + stepZ; z -= stepZ * 3) {
      const q = [P(X, Hc, z), P(X + def.tile, Hc, z), P(X + def.tile, Hc, z - stepZ), P(X, Hc, z - stepZ)]
      ctx.fillStyle = `rgba(255,255,255,${0.75 * flick})`; ctx.beginPath(); poly(ctx, q); ctx.fill()
    }
  plane(0, zFloor, C.floor, 1)

  // ── back wall: white squares, then Honda's wall art (wash stations → consoles, mural → projection screen)
  const [wl, wt] = P(XL, Hc, zw), [wr, wb] = P(XR, 0, zw)
  ctx.fillStyle = C.wall; ctx.fillRect(wl, wt, wr - wl, wb - wt)
  for (let X = Math.ceil(XL / def.wallTile) * def.wallTile; X <= XR; X += def.wallTile)
    glow(ctx, LN, 1, 0.35 * flick, () => { const a = P(X, 0, zw), b = P(X, Hc, zw); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
  for (let H = def.wallTile; H < Hc; H += def.wallTile)
    glow(ctx, LN, 1, 0.35 * flick, () => { const a = P(XL, H, zw), b = P(XR, H, zw); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
  const L = c.layout, wp = L.pieces.wall, wim = c.img[wp.file], S = def.wallScale
  const aw = wp.w * S, ah = wp.h * S, ax = P(W / 2, 0, zw)[0] - aw / 2, ay = wb - ah
  ctx.save(); ctx.beginPath(); ctx.rect(wl, wt, wr - wl, wb - wt); ctx.clip()
  ctx.drawImage(wim, ax, ay, aw, ah)
  const rep = L.wallRepeat
  for (const side of ["left", "right"]) {                 // run the wash-station strips out to the side walls (mirrored)
    const [c0, c1] = rep[side], sw = (c1 - c0) * S
    for (let k = 1; k < 40; k++) {
      const x = side === "left" ? ax - k * sw : ax + aw + (k - 1) * sw
      if (side === "left" ? x + sw < wl : x > wr) break
      ctx.save(); ctx.translate(x + (k % 2 ? sw : 0), ay); ctx.scale(k % 2 ? -1 : 1, 1)
      ctx.drawImage(wim, c0, 0, c1 - c0, wp.h, 0, 0, sw, ah); ctx.restore()
    }
  }
  // projection screen: a soft light sweep travels down the mural, plus a header
  const [mx, my, mw, mh] = wp.mural, sx = ax + mx * S, sy = ay + my * S, sW = mw * S, sH = mh * S
  const sweep = ((t * 0.35) % 1.3) - 0.15
  const g = ctx.createLinearGradient(0, sy + sH * (sweep - 0.12), 0, sy + sH * (sweep + 0.12))
  g.addColorStop(0, "rgba(120,215,255,0)"); g.addColorStop(0.5, `rgba(120,215,255,${0.28 * flick})`); g.addColorStop(1, "rgba(120,215,255,0)")
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sW, sH)
  ctx.fillStyle = `rgba(255,255,255,${0.10 + 0.05 * Math.sin(t * 3)})`
  for (let y = sy; y < sy + sH; y += 4) ctx.fillRect(sx, y, sW, 1)                      // scanlines
  glow(ctx, LN, 2, flick, () => ctx.rect(sx, sy, sW, sH))
  ctx.font = `800 ${Math.round(48 / zw)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
  ctx.fillStyle = `rgba(40,170,245,${flick})`; ctx.shadowColor = "rgba(70,196,255,1)"; ctx.shadowBlur = 14
  ctx.fillText("T R A I N I N G   C E N T E R", sx + sW / 2, sy - 8); ctx.shadowBlur = 0
  ctx.restore()

  // ── side walls (X = XL and XR) with squares; Honda's door/curtain art mapped onto each, column by column
  const dp = L.pieces.door, dim = c.img[dp.file]
  for (const X of [XL, XR]) {
    ctx.fillStyle = C.side; ctx.beginPath(); poly(ctx, [P(X, 0, zw), P(X, Hc, zw), P(X, Hc, zNear), P(X, 0, zNear)]); ctx.fill()
    for (let z = zw; z > zNear; z -= def.wallTile / def.D0)
      glow(ctx, LN, 1, 0.4 * Math.min(1, 1.25 / z) * flick, () => { const a = P(X, 0, z), b = P(X, Hc, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    for (let H = def.wallTile; H < Hc; H += def.wallTile)
      glow(ctx, LN, 1, 0.4 * flick, () => { const a = P(X, H, zw), b = P(X, H, zNear); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    // door art: column 0 nearest (zFront), last column at the back wall
    const zf = def.door.zFront, n = dp.w
    for (let col = 0; col < n; col++) {
      const u0 = col / n, u1 = (col + 1) / n
      const z0 = 1 / (1 / zf + (1 / zw - 1 / zf) * u0), z1 = 1 / (1 / zf + (1 / zw - 1 / zf) * u1)
      const [xa, yf] = P(X, 0, z0), [xb] = P(X, 0, z1)
      const hgt = (Hc * 0.9) / z0                       // the door art fills 90% of the wall height at its depth
      const x0 = Math.min(xa, xb), w0 = Math.abs(xb - xa) + 0.6
      if (w0 < 0.2) continue
      ctx.drawImage(dim, col, 0, 1, dp.h, x0, yf - hgt, w0, hgt)   // geometry mirrors it on the right wall
    }
  }

  // ── floor markings: the sumo ring → a glowing training ring; its start lines → light bars
  const R = def.ring, ringPts = []
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2, X = W / 2 + Math.cos(a) * R.rx, z = R.z + (Math.sin(a) * R.rd) / def.D0
    ringPts.push(P(X, 0, z))
  }
  const pulse = 0.75 + 0.25 * Math.sin(t * 2.2)
  glow(ctx, LN, 3, pulse, () => { ctx.moveTo(ringPts[0][0], ringPts[0][1]); for (const p of ringPts) ctx.lineTo(p[0], p[1]) })
  const inner = ringPts.map((_, i) => { const a = (i / 120) * Math.PI * 2; return P(W / 2 + Math.cos(a) * (R.rx - 40), 0, R.z + (Math.sin(a) * (R.rd - 12)) / def.D0) })
  glow(ctx, LN, 1, 0.6 * pulse, () => { ctx.moveTo(inner[0][0], inner[0][1]); for (const p of inner) ctx.lineTo(p[0], p[1]) })
  for (const sgn of [-1, 1]) {
    const X = W / 2 + sgn * def.startLines.dx, a = P(X, 0, def.startLines.z0), b = P(X, 0, def.startLines.z1)
    glow(ctx, "255,255,255", 4, 0.9, () => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    glow(ctx, LN, 2, 0.8, () => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
  }

  // ── props at their depth: bath tub (hologram platform, glowing water), bucket
  const prop = (piece, X, z) => {
    const pc = L.pieces[piece], im = c.img[pc.file], sc = (def.wallScale * zw) / z
    const [px, py] = P(X, 0, z), w = pc.w * sc, h = pc.h * sc
    ctx.drawImage(im, px - w / 2, py - h, w, h); return [px - w / 2, py - h, w, h]
  }
  const cubesBack = def.cubes.filter(q => !q.front).sort((a, b) => b.z - a.z)
  for (const q of cubesBack.filter(q => q.z >= def.tub.z)) drawCube(ctx, def, P, q, W, t)
  const [tx, ty, tw, th] = prop("tub", W * def.tub.x, def.tub.z)
  const wg = ctx.createLinearGradient(tx, 0, tx + tw, 0), ph = (t * 0.4) % 1
  wg.addColorStop(0, "rgba(120,215,255,0.10)"); wg.addColorStop(Math.max(0, ph - 0.1), "rgba(120,215,255,0.10)")
  wg.addColorStop(ph, `rgba(190,240,255,${0.55 * flick})`); wg.addColorStop(Math.min(1, ph + 0.1), "rgba(120,215,255,0.10)"); wg.addColorStop(1, "rgba(120,215,255,0.10)")
  ctx.fillStyle = wg; ctx.fillRect(tx + tw * 0.03, ty + th * 0.06, tw * 0.94, th * 0.3)
  prop("bucket", W * def.bucket.x, def.bucket.z)
  for (const q of cubesBack.filter(q => q.z < def.tub.z)) drawCube(ctx, def, P, q, W, t)

  // ── a slow scan line sweeping the whole room (very faint)
  const sy2 = coverTop + ((t * 90) % Math.max(1, coverBottom - coverTop))
  const sg = ctx.createLinearGradient(0, sy2 - 30, 0, sy2 + 30)
  sg.addColorStop(0, "rgba(120,215,255,0)"); sg.addColorStop(0.5, "rgba(120,215,255,0.07)"); sg.addColorStop(1, "rgba(120,215,255,0)")
  ctx.fillStyle = sg; ctx.fillRect(padL, sy2 - 30, padR - padL, 60)
  ctx.restore()
  return true
}

// hologram box: translucent white faces + glowing edges, slowly turning and bobbing (wall clock)
function drawCube(ctx, def, P, q, W, t) {
  const X0 = q.x * W, s = q.s / 2, a = t * 0.5 + q.x * 9, bob = Math.sin(t * 1.3 + q.x * 7) * 10
  const ca = Math.cos(a), sa = Math.sin(a)
  const V = []
  for (const dy of [-s, s]) for (const [dx, dz] of [[-s, -s], [s, -s], [s, s], [-s, s]]) {
    const rx = dx * ca - dz * sa, rz = dx * sa + dz * ca
    V.push(P(X0 + rx, q.H + bob + dy, q.z + rz / def.D0))
  }
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
  ctx.fillStyle = "rgba(235,248,255,0.22)"
  for (const f of faces) { ctx.beginPath(); poly(ctx, f.map(i => V[i])); ctx.fill() }
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  glow(ctx, def.colors.line, 1.5, 0.95, () => { for (const [i, j] of edges) { ctx.moveTo(V[i][0], V[i][1]); ctx.lineTo(V[j][0], V[j][1]) } })
}

function drawRoomFront(ctx, def, W, groundY) {
  const { P } = roomCam(def, W, groundY, cache.get(Object.keys(SETS).find(k => SETS[k] === def))), t = now()
  ctx.save()
  for (const q of def.cubes.filter(q => q.front)) drawCube(ctx, def, P, q, W, t)
  ctx.restore()
}

// ───────────────────────────── BATCAVE ambience (render-only, wall clock) ─────────────────────────────
const _h = n => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return (x >>> 0) / 4294967296 }
// Batcomputer: live screens on the centre copy of the cave depths (drawn with that layer, so behind the Batwing)
function batcomputer(ctx, c, d, S) {
  const t = now(), L = c.layout
  if (d && L.computer) {
    const scr = ([x, y, w, h]) => [d.x + x * S, d.y + y * S, w * S, h * S]
    const [mx, my, mw, mh] = scr(L.computer.main)
    const g = ctx.createLinearGradient(0, my, 0, my + mh)
    g.addColorStop(0, "rgba(40,120,220,0.55)"); g.addColorStop(1, "rgba(10,40,100,0.55)")
    ctx.fillStyle = g; ctx.fillRect(mx, my, mw, mh)
    ctx.strokeStyle = "rgba(140,210,255,0.85)"; ctx.lineWidth = 1.5; ctx.beginPath()            // waveform
    for (let i = 0; i <= 40; i++) { const xx = mx + (i / 40) * mw, yy = my + mh * (0.55 + 0.25 * Math.sin(i * 0.6 + t * 4) * Math.sin(i * 0.17 + t)); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy) }
    ctx.stroke()
    ctx.fillStyle = "rgba(170,225,255,0.9)"; ctx.font = `700 ${Math.round(5 * S)}px monospace`; ctx.textAlign = "left"; ctx.textBaseline = "top"
    ctx.fillText(["GOTHAM CITY  ● LIVE", "ARKHAM  ● SECURE", "BATWING  ● READY"][Math.floor(t / 2.5) % 3], mx + 3, my + 3)
    ctx.fillStyle = "rgba(255,255,255,0.08)"; for (let y = my; y < my + mh; y += 3) ctx.fillRect(mx, y, mw, 1)
    L.computer.small.forEach((r, i) => {
      const [sx, sy, sw, sh] = scr(r), on = 0.35 + 0.35 * Math.abs(Math.sin(t * (1.3 + i * 0.4) + i))
      ctx.fillStyle = `rgba(60,150,255,${on})`; ctx.fillRect(sx, sy, sw, sh)
      ctx.fillStyle = "rgba(200,235,255,0.6)"
      for (let k = 0; k < 4; k++) ctx.fillRect(sx + 3, sy + 4 + k * 4 * S / 2, sw * (0.3 + 0.6 * _h(i * 9 + k + Math.floor(t * 2))), 2)
    })
  }
}
function batcaveFx(ctx, def, c, drawn, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S
  // spotlights from the ceiling onto the Batwing
  const b = drawn.batwing
  if (b) for (const fx of [0.42, 0.66]) {
    const cx = b.x + 1024 * S * fx, top = coverTop, bot = dockTop + 20 * S
    const g = ctx.createLinearGradient(0, top, 0, bot)
    g.addColorStop(0, "rgba(160,200,255,0.0)"); g.addColorStop(0.6, "rgba(160,200,255,0.07)"); g.addColorStop(1, "rgba(160,200,255,0.12)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 30, top); ctx.lineTo(cx + 30, top); ctx.lineTo(cx + 190, bot); ctx.lineTo(cx - 190, bot); ctx.closePath(); ctx.fill()
  }
  // bats: a loose colony crossing the upper cave (parallax with the depths)
  const sh = (b0 => b0)(((camera.x ?? W / 2) - W / 2) * (1 - 0.45))
  for (let i = 0; i < 14; i++) {
    const dir = _h(i) < 0.5 ? -1 : 1, sp = 40 + 70 * _h(i + 50), span = W + 800
    const x = ((_h(i + 9) * span + dir * t * sp) % span + span) % span - 400 + sh
    if (x < padL - 40 || x > padR + 40) continue
    const y = dockTop - 170 * S + _h(i + 20) * 110 * S + Math.sin(t * 2 + i) * 14
    const sz = 6 + 9 * _h(i + 30), flap = Math.sin(t * (14 + i % 5) + i)
    ctx.fillStyle = "#04050a"; ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x - sz * 0.6 * dir, y - sz * flap, x - sz * 1.6, y - sz * 0.6 * flap)
    ctx.quadraticCurveTo(x - sz * 0.8, y + sz * 0.15, x, y + sz * 0.3)
    ctx.quadraticCurveTo(x + sz * 0.8, y + sz * 0.15, x + sz * 1.6, y - sz * 0.6 * flap)
    ctx.quadraticCurveTo(x + sz * 0.6 * dir, y - sz * flap, x, y)
    ctx.fill()
  }
  // water dripping from the stalactites
  for (let i = 0; i < 7; i++) {
    const per = 2.2 + 1.6 * _h(i + 70), ph = ((t + _h(i + 80) * per) % per) / per
    const x = W * (0.08 + 0.13 * i) + shift(0.55, W), y0 = dockTop - 120 * S, y1 = dockTop + 6 * S
    if (ph < 0.55) {
      const y = y0 + (y1 - y0) * (ph / 0.55) ** 2
      ctx.fillStyle = "rgba(150,200,255,0.55)"; ctx.fillRect(x, y, 2, 7)
    } else if (ph < 0.7) {
      const k = (ph - 0.55) / 0.15
      ctx.strokeStyle = `rgba(150,200,255,${0.5 * (1 - k)})`; ctx.lineWidth = 1
      ctx.beginPath(); ctx.ellipse(x + 1, y1, 4 + 14 * k, 2 + 3 * k, 0, 0, Math.PI * 2); ctx.stroke()
    }
  }
}

// ───────────────────────────── CITADEL OF RICKS (render-only, wall clock) ─────────────────────────────
// a portal, the show's way: bright lime rim + glow, pale yellow-green core, darker green arms swirling inward
function drawPortal(ctx, x, y, rx, ry, t, open = 1) {
  if (open <= 0.01) return
  rx *= open; ry *= open
  ctx.save(); ctx.translate(x, y)
  const glow = ctx.createRadialGradient(0, 0, Math.min(rx, ry) * 0.6, 0, 0, Math.max(rx, ry) * 1.7)
  glow.addColorStop(0, "rgba(150,230,80,0.35)"); glow.addColorStop(1, "rgba(150,230,80,0)")
  ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.7, ry * 1.7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.scale(1, ry / rx)
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  core.addColorStop(0, "#f4ffb8"); core.addColorStop(0.45, "#b8ee5a"); core.addColorStop(0.85, "#62c22e"); core.addColorStop(1, "#2f8f1c")
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill()
  ctx.lineCap = "round"
  for (let arm = 0; arm < 5; arm++) {                     // swirl arms
    ctx.strokeStyle = arm % 2 ? "rgba(40,120,20,0.55)" : "rgba(230,255,150,0.5)"; ctx.lineWidth = Math.max(1.5, rx * 0.07)
    ctx.beginPath()
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, ang = t * 2.4 + arm * (Math.PI * 2 / 5) + u * 4.2, rr = rx * (0.95 - u * 0.85)
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
    ctx.stroke()
  }
  ctx.strokeStyle = "#c8ff6a"; ctx.lineWidth = Math.max(2, rx * 0.09); ctx.beginPath(); ctx.arc(0, 0, rx * 0.97, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}

// a space cruiser: grey saucer-car hull, glass bubble with a little alien pilot, thruster
function drawCruiser(ctx, x, y, sc, dir, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * dir, sc)
  const fl = 0.6 + 0.4 * Math.sin(t * 30)
  ctx.fillStyle = `rgba(120,240,255,${0.55 * fl})`; ctx.beginPath(); ctx.ellipse(-46, 4, 14 + 6 * fl, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#5d646e"; ctx.beginPath(); ctx.ellipse(0, 9, 40, 9, 0, 0, Math.PI * 2); ctx.fill()           // underside
  ctx.fillStyle = "#c9ced6"; ctx.beginPath(); ctx.moveTo(-42, 4); ctx.quadraticCurveTo(-36, -8, -6, -8); ctx.lineTo(30, -6)
  ctx.quadraticCurveTo(46, -2, 44, 6); ctx.lineTo(-42, 8); ctx.closePath(); ctx.fill()                         // hull
  ctx.fillStyle = "#e8ebef"; ctx.fillRect(-30, -5, 56, 3)
  ctx.fillStyle = "#b0373a"; ctx.fillRect(-40, -1, 8, 4)                                                       // tail light
  ctx.fillStyle = "#d8dce2"; ctx.beginPath(); ctx.moveTo(-36, -4); ctx.lineTo(-44, -14); ctx.lineTo(-30, -6); ctx.fill()   // fin
  ctx.fillStyle = "#7fd36a"; ctx.beginPath(); ctx.arc(2, -13, 4.6, 0, Math.PI * 2); ctx.fill()                 // the pilot: a small green alien
  ctx.fillStyle = "#111"; ctx.fillRect(0, -14, 1.6, 2); ctx.fillRect(3.4, -14, 1.6, 2)
  ctx.strokeStyle = "#7fd36a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -17); ctx.lineTo(0, -22); ctx.stroke()
  ctx.fillStyle = "#e9ff7a"; ctx.beginPath(); ctx.arc(0, -22, 1.4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(170,230,255,0.35)"; ctx.strokeStyle = "rgba(220,245,255,0.8)"; ctx.lineWidth = 1
  ctx.beginPath(); ctx.ellipse(3, -9, 17, 13, 0, Math.PI, 0); ctx.fill(); ctx.stroke()                         // bubble
  ctx.restore()
}

// the Citadel of Ricks: a disc with a city of towers rising above and hanging below
function drawCitadel(ctx, x, y, sc, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc)
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 200); g.addColorStop(0, "rgba(120,170,255,0.18)"); g.addColorStop(1, "rgba(120,170,255,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 200, 0, Math.PI * 2); ctx.fill()
  for (const dirY of [-1, 1]) for (let i = -9; i <= 9; i++) {
    const hh = (dirY < 0 ? 120 : 86) * (1 - Math.abs(i) / 11) * (0.6 + 0.4 * _h(i * 7 + (dirY + 3))), w = 8 + 6 * _h(i + 40)
    const bx = i * 11 - w / 2
    ctx.fillStyle = dirY < 0 ? "#7d8ea6" : "#5f6f87"; ctx.fillRect(bx, dirY < 0 ? -hh : 0, w, hh)
    ctx.fillStyle = "#c4d2e4"; ctx.fillRect(bx, dirY < 0 ? -hh : 0, 2, hh)
    for (let k = 6; k < hh - 4; k += 9) if (_h(i * 31 + k + dirY) > 0.45) {
      ctx.fillStyle = `rgba(255,236,160,${0.5 + 0.5 * Math.abs(Math.sin(t * 0.7 + i + k))})`; ctx.fillRect(bx + 3, dirY < 0 ? -k : k, 2, 2)
    }
  }
  ctx.fillStyle = "#9fb0c6"; ctx.beginPath(); ctx.ellipse(0, 0, 118, 20, 0, 0, Math.PI * 2); ctx.fill()           // the disc
  ctx.fillStyle = "#c9d6e6"; ctx.beginPath(); ctx.ellipse(0, -4, 112, 11, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(140,255,120,0.9)"; for (let i = -10; i <= 10; i++) if ((i + Math.floor(t * 3)) % 4 === 0) ctx.fillRect(i * 10, 7, 3, 2)
  ctx.restore()
}

function drawSpace(ctx, def, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), sh = shift(p, W), top = coverTop, bot = dockTop
  const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, "#03020a"); g.addColorStop(1, "#140a2e")
  ctx.fillStyle = g; ctx.fillRect(padL, top, padR - padL, bot - top + 2)
  for (const [nx, ny, r, c] of [[0.25, 0.35, 380, "90,40,160"], [0.7, 0.5, 460, "40,140,90"], [0.5, 0.15, 300, "40,70,170"]]) {
    const cx = W * nx + sh, cy = top + (bot - top) * ny, ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    ng.addColorStop(0, `rgba(${c},0.32)`); ng.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = ng; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  }
  for (let i = 0; i < 220; i++) {
    const x = (_h(i) * (W + 1600) - 800) + sh, y = top + _h(i + 999) * (bot - top)
    if (x < padL || x > padR) continue
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + _h(i + 5)) + i)), sz = _h(i + 77) > 0.92 ? 2 : 1
    ctx.fillStyle = `rgba(230,236,255,${a})`; ctx.fillRect(x, y, sz, sz)
  }
  for (let i = 0; i < 5; i++) {                                        // Citadel shuttles drifting
    const dir = i % 2 ? 1 : -1, span = W + 1200, sp = 18 + 14 * _h(i + 3)
    const x = ((_h(i + 11) * span + dir * t * sp) % span + span) % span - 600 + sh * 1.6, y = dockTop - 150 - 150 * _h(i + 21)
    ctx.fillStyle = "#b8c4d4"; ctx.beginPath(); ctx.ellipse(x, y, 9, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = (Math.floor(t * 2 + i) % 2) ? "#9dff6a" : "#ff6a6a"; ctx.fillRect(x - 1, y + 2, 2, 2)
  }
}

// what you see through each viewport (rows 70..150, x < 392 of every wall copy): deep space framed by the window —
// the Citadel's tower city, a ringed planet, and a cruiser gliding past. Drawn BEFORE the wall, so frames/pillars sit on top.
function citadelWindows(ctx, d, { W, w, padL, padR, p }) {
  const t = now(), S = d.S, vy0 = d.y + 66 * S, vh = 90 * S, vw = 392 * S, sh = shift(p, W)
  for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {
    const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w, vx0 = odd ? x0 + w - vw : x0
    if (vx0 > padR || vx0 + vw < padL) continue
    ctx.save(); ctx.beginPath(); ctx.rect(vx0, vy0, vw, vh); ctx.clip()
    const g = ctx.createLinearGradient(0, vy0, 0, vy0 + vh); g.addColorStop(0, "#07051a"); g.addColorStop(1, "#1d0f3e")
    ctx.fillStyle = g; ctx.fillRect(vx0, vy0, vw, vh)
    const par = -sh * 0.25                                      // the view shifts a little as the camera moves: depth
    const ng = ctx.createRadialGradient(vx0 + vw * 0.3 + par, vy0 + vh * 0.4, 0, vx0 + vw * 0.3 + par, vy0 + vh * 0.4, vw * 0.5)
    ng.addColorStop(0, "rgba(60,170,120,0.35)"); ng.addColorStop(1, "rgba(60,170,120,0)"); ctx.fillStyle = ng; ctx.fillRect(vx0, vy0, vw, vh)
    for (let i = 0; i < 90; i++) {
      const sx = vx0 + ((_h(i + k * 131) * vw * 1.4 + par * 0.5) % (vw * 1.4)) - vw * 0.2, sy = vy0 + _h(i + 500 + k) * vh
      ctx.fillStyle = `rgba(235,240,255,${0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + _h(i)) + i))})`; ctx.fillRect(sx, sy, _h(i + 9) > 0.9 ? 2 : 1, _h(i + 9) > 0.9 ? 2 : 1)
    }
    // a ringed planet low on one side
    const px = vx0 + vw * (odd ? 0.2 : 0.82) + par * 0.6, py = vy0 + vh * 0.78, pr = vh * 0.42
    const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr)
    pg.addColorStop(0, "#f2a35e"); pg.addColorStop(0.7, "#a2462e"); pg.addColorStop(1, "#3a1420")
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "rgba(240,210,160,0.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.7, pr * 0.32, -0.25, 0, Math.PI * 2); ctx.stroke()
    // the Citadel city, floating in the middle distance
    drawCitadel(ctx, vx0 + vw * (odd ? 0.62 : 0.4) + par, vy0 + vh * 0.5, vh / 300, t)
    // a cruiser gliding past this window now and then
    const per = 9 + (Math.abs(k) % 3) * 2, ph = ((t + k * 3.7) % per) / per, dir = (k % 2) ? -1 : 1
    if (ph < 0.6) {
      const u = ph / 0.6, cx = dir > 0 ? vx0 - 60 + (vw + 120) * u : vx0 + vw + 60 - (vw + 120) * u
      drawCruiser(ctx, cx, vy0 + vh * 0.3 + Math.sin(t * 2.3 + k) * 4, vh / 160, dir, t)
    }
    ctx.restore()
  }
}

function citadelWall(ctx, def, c, d, { W, w, h, padL, padR, dockTop, coverTop, p }) {
  if (!d) return
  if (d.y > coverTop) {                                            // the hall's ceiling above the wall (enclosed, no open sky)
    const g = ctx.createLinearGradient(0, coverTop, 0, d.y); g.addColorStop(0, "#05070c"); g.addColorStop(1, "#141a26")
    ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, d.y - coverTop + 1)
    ctx.fillStyle = "#1f2735"
    for (let k = Math.floor((padL - d.x) / 90); d.x + k * 90 < padR; k++) ctx.fillRect(d.x + k * 90, coverTop, 6, d.y - coverTop)
    for (let yy = d.y - 14; yy > coverTop; yy -= 46) ctx.fillRect(padL, yy, padR - padL, 4)
  }
  { // glass reflections on the viewport (rows 70..150, x < 392 of each wall copy)
    const S = d.S, vy0 = d.y + 70 * S, vh = 80 * S   // (the view itself: citadelWindows)
    ctx.save(); ctx.beginPath(); ctx.rect(padL, vy0, padR - padL, vh); ctx.clip()
    for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {
      const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w, vx0 = odd ? x0 + w - 392 * S : x0, vw = 392 * S
      ctx.fillStyle = "rgba(120,200,255,0.05)"; ctx.fillRect(vx0, vy0, vw, vh)
      for (const [f, ww] of [[0.12, 26], [0.2, 9], [0.58, 34], [0.67, 10]]) {
        ctx.fillStyle = "rgba(210,240,255,0.07)"; ctx.beginPath()
        ctx.moveTo(vx0 + vw * f, vy0 + vh); ctx.lineTo(vx0 + vw * f + ww, vy0 + vh); ctx.lineTo(vx0 + vw * f + ww + vh * 0.6, vy0); ctx.lineTo(vx0 + vw * f + vh * 0.6, vy0); ctx.fill()
      }
    }
    ctx.restore()
  }
  const t = now(), L = c.layout, S = d.S
  const [rx, ry, rw, rh] = L.pieces.wall.reactor
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  const pulse = 0.18 + 0.14 * Math.sin(t * 3.1)
  for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {      // the reactor glow on every copy of the wall
    const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w
    const gx = odd ? x0 + w - (rx + rw) * S : x0 + rx * S
    const g = ctx.createLinearGradient(0, d.y + ry * S, 0, d.y + (ry + rh) * S)
    g.addColorStop(0, "rgba(160,255,80,0)"); g.addColorStop(0.5, `rgba(160,255,80,${pulse})`); g.addColorStop(1, "rgba(160,255,80,0)")
    ctx.fillStyle = g; ctx.fillRect(gx, d.y + ry * S, rw * S, rh * S)
  }
  ctx.restore()
  const [qx0, qy0, qx1, qy1] = L.pieces.wall.sign                   // the hall sign, crisp at any scale
  ctx.save(); ctx.fillStyle = "#123c28"; ctx.font = `800 ${Math.round((qy1 - qy0) * S * 0.7)}px system-ui, sans-serif`
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {
    const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w, cx = (qx0 + qx1) / 2 * S
    ctx.fillText("CITADEL OF RICKS", odd ? x0 + w - cx : x0 + cx, d.y + (qy0 + qy1) / 2 * S + 1, (qx1 - qx0) * S * 0.92)
  }
  ctx.restore()
  // portals opening and closing on the hall wall (world positions, the wall's parallax)
  const sh = shift(p, W)
  const SPOTS = [[0.16, 150], [0.38, 205], [0.63, 165], [0.86, 215], [0.5, 120]]
  SPOTS.forEach(([fx, hgt], i) => {
    const per = 7 + i * 1.3, ph = ((t + i * 2.9) % per) / per
    const open = ph < 0.12 ? easeOutBack(ph / 0.12) : ph < 0.55 ? 1 : ph < 0.65 ? 1 - (ph - 0.55) / 0.1 : 0
    drawPortal(ctx, W * fx + sh, dockTop - hgt * 0.75, 28, 36, t + i, open)
  })
}
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }

// a portal lying flat in the middle of the floor, where the old emblem was
function citadelFloor(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const fl = c.layout.pieces.floor, [ex, ey, ew, eh] = fl.emblem, S = def.S
  // below the deck: the platform's front face (a lit lip + armour plates), then the lower machine level
  const top = dockTop + fl.h * S, t = now()
  if (coverBottom > top) {
    const lipH = 10, faceH = 46, off = shift(1.12, W)
    ctx.fillStyle = "#2c3644"; ctx.fillRect(padL, top, padR - padL, lipH)
    ctx.fillStyle = "#8fa3b8"; ctx.fillRect(padL, top, padR - padL, 2)
    ctx.fillStyle = `rgba(170,255,90,${0.75 + 0.25 * Math.sin(t * 2)})`; ctx.fillRect(padL, top + lipH - 3, padR - padL, 2)
    const fg = ctx.createLinearGradient(0, top + lipH, 0, top + lipH + faceH); fg.addColorStop(0, "#1a2230"); fg.addColorStop(1, "#0d121b")
    ctx.fillStyle = fg; ctx.fillRect(padL, top + lipH, padR - padL, faceH)
    const pw = 120, x0 = ((off - padL) % pw + pw) % pw - pw + padL
    for (let x = x0, i = 0; x < padR; x += pw, i++) {                 // armour plates with rivets and a vent
      ctx.fillStyle = "#0a0e15"; ctx.fillRect(Math.floor(x), top + lipH, 3, faceH)
      ctx.fillStyle = "#4a5768"; for (const rx of [12, pw - 14]) for (const ry of [8, faceH - 10]) ctx.fillRect(Math.floor(x) + rx, top + lipH + ry, 3, 3)
      if (i % 2 === 0) { ctx.fillStyle = "#06090e"; for (let v = 0; v < 4; v++) ctx.fillRect(Math.floor(x) + 40, top + lipH + 14 + v * 6, 40, 3) }
    }
    const low = top + lipH + faceH                                     // the lower level: dark, with glowing conduits
    if (coverBottom > low) {
      const lg = ctx.createLinearGradient(0, low, 0, coverBottom); lg.addColorStop(0, "#070a10"); lg.addColorStop(1, "#020305")
      ctx.fillStyle = lg; ctx.fillRect(padL, low, padR - padL, coverBottom - low)
      const off2 = shift(1.2, W)
      for (const [dy, wdt, a] of [[18, 6, 0.8], [40, 4, 0.5], [70, 8, 0.35]]) {
        if (low + dy > coverBottom) continue
        ctx.fillStyle = `rgba(40,110,30,${a})`; ctx.fillRect(padL, low + dy, padR - padL, wdt)
        ctx.fillStyle = `rgba(190,255,110,${a * (0.6 + 0.4 * Math.sin(t * 3 + dy))})`; ctx.fillRect(padL, low + dy + 1, padR - padL, 1)
        const bw = 220, bx0 = ((off2 - padL) % bw + bw) % bw - bw + padL
        ctx.fillStyle = "#1a2230"; for (let x = bx0; x < padR; x += bw) ctx.fillRect(Math.floor(x), low + dy - 2, 10, wdt + 4)   // pipe clamps
      }
      for (let i = 0; i < 12; i++) {                                    // portal-fluid droplets of light drifting along
        const x = padL + ((t * (30 + 20 * _h(i)) + _h(i + 3) * 4000) % (padR - padL + 40)) - 20
        ctx.fillStyle = "rgba(220,255,150,0.9)"; ctx.fillRect(x, low + [18, 40, 70][i % 3] + 1, 4, 2)
      }
    }
  }
  const x = W / 2 - (fl.w * S) / 2 + ex * S + shift(rowFactor(def, ey), W)
  const y = dockTop + ey * S
  ctx.save(); ctx.globalAlpha = 0.8; drawPortal(ctx, x, y, ew * S * 0.26, eh * S * 0.26, now() * 0.6, 1); ctx.restore()
}

// ───────────────────────────── HEAVEN'S ARENA (render-only, wall clock) ─────────────────────────────
function drawHeavenHall(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), P = c.layout.pieces, sk = P.sky, im = c.img[sk.file], S = def.S
  const wallH = P.wall.h * S * 0.6, standTop = dockTop - wallH - 100, sh = shift(p, W)
  // 1. the sky: the repainted SFII dusk, stretched tall, then a sea of clouds far below the tower
  const skH = Math.max(standTop - coverTop + 60, 200), skW = sk.w * (skH / sk.h)
  if (ready(im)) for (let k = Math.floor((padL - sh) / skW) - 1, x; (x = sh + k * skW) < padR; k++) {
    if (Math.abs(k) % 2 === 0) ctx.drawImage(im, Math.floor(x), coverTop, skW + 1, skH)
    else { ctx.save(); ctx.translate(Math.floor(x) + skW, coverTop); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, skW + 1, skH); ctx.restore() }
  }
  const cloudY = standTop - 70
  for (let layer = 0; layer < 3; layer++) {                       // cloud tops seen from far above, drifting
    const yy = cloudY + layer * 22, sp = 4 + layer * 3, par = shift(p + layer * 0.05, W)
    ctx.fillStyle = ["rgba(255,214,200,0.55)", "rgba(240,170,190,0.6)", "rgba(190,120,170,0.7)"][layer]
    for (let i = -2; i < 40; i++) {
      const cx = ((i * 130 + t * sp + par) % 5200 + 5200) % 5200 - 600 + padL * 0, r = 40 + 30 * _h(i + layer * 50)
      if (cx < padL - 120 || cx > padR + 120) continue
      ctx.beginPath(); ctx.ellipse(cx, yy + 10 * _h(i + 7), r * 1.6, r * 0.45, 0, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.fillStyle = "rgba(190,120,170,0.75)"; ctx.fillRect(padL, cloudY + 60, padR - padL, standTop - cloudY)
  // 2. the hall's window wall: tall panes between stone mullions, a heavy beam across the top
  const mw = 300, mx0 = ((sh * 2.2 - padL) % mw + mw) % mw - mw + padL
  for (let x = mx0; x < padR + mw; x += mw) {
    const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0); g.addColorStop(0, "#2a1c44"); g.addColorStop(0.5, "#6d5a96"); g.addColorStop(1, "#1d1232")
    ctx.fillStyle = g; ctx.fillRect(Math.floor(x) - 14, coverTop, 28, standTop - coverTop + 4)
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(Math.floor(x) + 40, coverTop, 22, standTop - coverTop); ctx.fillRect(Math.floor(x) + 74, coverTop, 8, standTop - coverTop)
  }
  ctx.fillStyle = "#24173c"; ctx.fillRect(padL, standTop - 8, padR - padL, 10)
  // 3. the stands: three tiers of spectators (original crowd: little heads + shoulders, bobbing, camera flashes)
  const tiers = 3, th = 100 / tiers, cpar = shift(0.55, W)
  for (let r = 0; r < tiers; r++) {
    const y0 = standTop + r * th
    ctx.fillStyle = r % 2 ? "#2d1f4a" : "#36265a"; ctx.fillRect(padL, y0, padR - padL, th + 1)
    ctx.fillStyle = "#4d3a7a"; ctx.fillRect(padL, y0 + th - 4, padR - padL, 3)
    const step = 15, x0 = ((cpar - padL) % step + step) % step - step + padL
    for (let x = x0, i = Math.floor((x0 - cpar) / step); x < padR + step; x += step, i++) {
      const id = i * 7 + r * 1013
      if (_h(id) < 0.12) continue                                   // an empty seat here and there
      const hue = Math.floor(_h(id + 1) * 6), bob = Math.max(0, Math.sin(t * (3 + _h(id + 2) * 3) + id)) * (_h(id + 3) > 0.6 ? 4 : 1.5)
      const bx = x + (_h(id + 4) - 0.5) * 5, by = y0 + th - 6 - bob
      ctx.fillStyle = ["#7a4b8f", "#3f6a9a", "#9a5a4a", "#5a7a4a", "#b08a3a", "#6a5a7a"][hue]
      ctx.beginPath(); ctx.ellipse(bx, by - 6, 6.5, 7, 0, Math.PI, 0); ctx.fill()                  // shoulders
      ctx.fillStyle = ["#f0c8a0", "#c89068", "#8a5a3a", "#e8b890"][Math.floor(_h(id + 5) * 4)]
      ctx.beginPath(); ctx.arc(bx, by - 15, 4.2, 0, Math.PI * 2); ctx.fill()                       // head
      ctx.fillStyle = ["#2a1a10", "#5a3a20", "#d8c070", "#1a1a1a", "#7a2a2a"][Math.floor(_h(id + 6) * 5)]
      ctx.beginPath(); ctx.arc(bx, by - 16.5, 4.3, Math.PI, 0); ctx.fill()                        // hair
      if (_h(id + 8) > 0.55) { ctx.strokeStyle = ctx.fillStyle = "#f0c8a0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, by - 10); ctx.lineTo(bx + 6, by - 20 - bob * 1.5); ctx.stroke() }  // a raised fist
      if (_h(id + Math.floor(t * 3)) > 0.995) { ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.arc(bx, by - 14, 6, 0, Math.PI * 2); ctx.fill() }   // camera flash
    }
  }
  // 4. the scoreboard hanging over the stands
  const sx = W / 2 + 460 + shift(0.35, W), sy = standTop - 84, sw = 250, shh = 62
  ctx.fillStyle = "#120a22"; ctx.fillRect(sx - 3, coverTop, 6, sy - coverTop)
  ctx.fillStyle = "#1b1030"; ctx.fillRect(sx - sw / 2 - 6, sy - 6, sw + 12, shh + 12)
  ctx.fillStyle = "#d6b14a"; ctx.fillRect(sx - sw / 2 - 6, sy - 6, sw + 12, 3); ctx.fillRect(sx - sw / 2 - 6, sy + shh + 3, sw + 12, 3)
  const sg = ctx.createLinearGradient(0, sy, 0, sy + shh); sg.addColorStop(0, "#0a1530"); sg.addColorStop(1, "#05091a")
  ctx.fillStyle = sg; ctx.fillRect(sx - sw / 2, sy, sw, shh)
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.fillStyle = "#ffe08a"; ctx.font = "800 22px 'Hiragino Sans','Noto Sans JP',system-ui,sans-serif"; ctx.fillText("天空闘技場", sx, sy + 20)
  ctx.fillStyle = `rgba(140,220,255,${0.75 + 0.25 * Math.sin(t * 4)})`; ctx.font = "800 16px system-ui,sans-serif"
  ctx.fillText(Math.floor(t / 4) % 2 ? "FLOOR 200" : "HEAVEN'S ARENA", sx, sy + 45)
  ctx.textAlign = "start"; ctx.textBaseline = "alphabetic"
}

function heavenFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now()
  // banner writing (vertical): the arena name on the left banner, the floor on the right
  const b = P.banner, w = b.w * S, h = b.h * S
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (const [fx, text] of [[0.3, "天空闘技場"], [0.7, "二百階"]]) {
    const x = fx * W - w / 2 + shift(rowFactor(def, 3), W), y = dockTop + 3 * S - h
    const [px0, py0, px1, py1] = b.paper, cx = x + (px0 + px1) / 2 * S, n = text.length, cell = (py1 - py0) * S / n
    ctx.fillStyle = "#1a1030"; ctx.font = `900 ${Math.floor(Math.min(cell * 0.86, (px1 - px0) * S * 0.86))}px 'Hiragino Mincho ProN','Noto Serif JP',serif`
    for (let i = 0; i < n; i++) ctx.fillText(text[i], cx, y + py0 * S + cell * (i + 0.5))
  }
  ctx.restore()
  // the ring is raised: a gold edge (the SFII floor trim), then its stone face, then the drop to the hall floor
  const top = dockTop + P.floor.h * S
  if (coverBottom <= top) return
  const tr = P.trim, tim = c.img[tr.file], tw = tr.w * S, off = shift(def.floor.rimFactor, W) + W / 2 - tw / 2
  if (ready(tim)) for (let k = Math.floor((padL - off) / tw); off + k * tw < padR; k++) ctx.drawImage(tim, Math.floor(off + k * tw), top, tw + 1, tr.h * S)
  const fTop = top + tr.h * S, faceH = 70
  const fg = ctx.createLinearGradient(0, fTop, 0, fTop + faceH); fg.addColorStop(0, "#b8b2c8"); fg.addColorStop(1, "#6a6282")
  ctx.fillStyle = fg; ctx.fillRect(padL, fTop, padR - padL, faceH)
  const bw = 96, bx0 = ((off - padL) % bw + bw) % bw - bw + padL
  ctx.fillStyle = "rgba(40,30,60,0.55)"
  for (let row = 0; row < 3; row++) {
    ctx.fillRect(padL, fTop + row * 24, padR - padL, 2)
    for (let x = bx0 + (row % 2) * bw / 2; x < padR; x += bw) ctx.fillRect(Math.floor(x), fTop + row * 24, 2, 24)
  }
  const dropTop = fTop + faceH
  if (coverBottom > dropTop) {
    const dg = ctx.createLinearGradient(0, dropTop, 0, coverBottom); dg.addColorStop(0, "#1a1030"); dg.addColorStop(1, "#08040f")
    ctx.fillStyle = dg; ctx.fillRect(padL, dropTop, padR - padL, coverBottom - dropTop)
    ctx.fillStyle = `rgba(214,177,74,${0.35 + 0.15 * Math.sin(t * 1.5)})`; ctx.fillRect(padL, dropTop, padR - padL, 3)   // floor lights
  }
}

// ───────────────────────────── VALLEY OF THE END (render-only, wall clock) ─────────────────────────────
// The painting is drawn ONCE, centred, scaled to fill from the top of the view down to the riverbank; past its edges the
// outer cliff strips (no statues) repeat mirrored, so the two statues are never duplicated however far the camera goes.
function drawValleyBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), pc = c.layout.pieces.valley, im = c.img[pc.file]
  if (!ready(im)) return
  const S = def.S, bottom = dockTop + 4 * S
  const viewH = (padR - padL - 16) * 9 / 16, sc = (viewH * 0.5) / pc.h      // fits the part of the view above the bank
  if (bottom - pc.h * sc > coverTop) {                            // a tall view: sky colour above the painting's top
    ctx.fillStyle = c.layout.colors.skyTop; ctx.fillRect(padL, coverTop, padR - padL, bottom - pc.h * sc - coverTop + 2)
  }
  const w = pc.w * sc, h = pc.h * sc, x0 = W / 2 - w / 2 + shift(p, W), y0 = bottom - h
  ctx.drawImage(im, Math.floor(x0), Math.floor(y0), Math.ceil(w), Math.ceil(h))
  const edge = Math.round(pc.w * 0.18), ew = edge * sc
  for (let k = 0, x = x0; x > padL; k++) {                       // left: cols [0, edge) mirrored outward
    x -= ew; ctx.save(); ctx.translate(Math.floor(x) + (k % 2 ? 0 : ew), Math.floor(y0)); ctx.scale(k % 2 ? 1 : -1, 1)
    ctx.drawImage(im, 0, 0, edge, pc.h, 0, 0, Math.ceil(ew) + 1, Math.ceil(h)); ctx.restore()
  }
  for (let k = 0, x = x0 + w; x < padR; k++, x += ew) {          // right: cols [w-edge, w) mirrored outward
    ctx.save(); ctx.translate(Math.floor(x) + (k % 2 ? 0 : ew), Math.floor(y0)); ctx.scale(k % 2 ? 1 : -1, 1)
    ctx.drawImage(im, pc.w - edge, 0, edge, pc.h, 0, 0, Math.ceil(ew) + 1, Math.ceil(h)); ctx.restore()
  }
  // the waterfall: bright streaks pouring down its face, mist where it lands
  const [fx, fy, fw, fh] = pc.falls, X = x0 + fx * sc, Y = y0 + fy * sc, FW = fw * sc, FH = fh * sc
  ctx.save(); ctx.beginPath(); ctx.rect(X, Y, FW, FH); ctx.clip()
  for (let i = 0; i < 26; i++) {
    const lx = X + _h(i) * FW, len = 18 + 30 * _h(i + 40), sp = 120 + 80 * _h(i + 80)
    const ly = Y + ((t * sp + _h(i + 120) * FH) % (FH + len)) - len
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * _h(i + 160)})`; ctx.fillRect(Math.floor(lx), Math.floor(ly), 2, len)
  }
  ctx.restore()
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.35 + _h(i)) % 1, mx = X + FW / 2 + (_h(i + 9) - 0.5) * FW * 1.6, my = Y + FH - ph * 40, r = 14 + 26 * ph
    ctx.fillStyle = `rgba(235,245,250,${0.22 * (1 - ph)})`; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill()
  }
  // the river below the falls glints
  const [rx, ry, rw, rh] = pc.river
  for (let i = 0; i < 14; i++) {
    const gx = x0 + (rx + _h(i + 300) * rw) * sc, gy = y0 + (ry + _h(i + 330) * rh) * sc, a = Math.max(0, Math.sin(t * 2 + i * 1.7))
    ctx.fillStyle = `rgba(255,255,255,${0.5 * a})`; ctx.fillRect(Math.floor(gx), Math.floor(gy), 6, 2)
  }
}

// below the riverbank rock: the river itself, flowing past (bands of light sliding sideways, foam along the edge)
function valleyRiver(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now(), DH = P.deck.h, top = dockTop + DH * S
  // 1. the river from the foot of the falls runs down the MIDDLE of the ground toward the viewer: a channel that widens
  //    row by row with the floor's perspective (each row follows that floor row's scroll), its water sliding forward
  const halfAt = r => 70 + 210 * Math.pow(r / (DH - 1), 1.25)
  for (let r = 0; r < DH; r++) {
    const y = dockTop + r * S, cx = W / 2 + shift(rowFactor(def, r), W), hw = halfAt(r), u = r / (DH - 1)
    ctx.fillStyle = `rgb(${Math.round(40 + 18 * u)},${Math.round(112 + 22 * u)},${Math.round(122 + 14 * u)})`
    ctx.fillRect(Math.floor(cx - hw), y, Math.ceil(hw * 2), S)
    const n = 7 + Math.floor(u * 6)                                  // ripples rolling toward us (row phase moves with time)
    for (let i = 0; i < n; i++) {
      const ph = (r * 0.55 - t * 9 + _h(i + 70) * 20) % 6
      if (ph < -1 || ph > 0) continue
      const x = cx - hw + (i + 0.5) / n * hw * 2 + (_h(i + r * 3) - 0.5) * 10
      ctx.fillStyle = `rgba(210,245,245,${0.35 + 0.4 * u})`; ctx.fillRect(Math.floor(x - 6 - 10 * u), y, Math.ceil(12 + 20 * u), S)
    }
    ctx.fillStyle = "rgba(235,250,250,0.85)"                         // foam where the water meets the rock on each side
    const fw = 3 + 3 * u + 2 * Math.sin(t * 6 + r)
    ctx.fillRect(Math.floor(cx - hw - fw / 2), y, Math.ceil(fw), S); ctx.fillRect(Math.floor(cx + hw - fw / 2), y, Math.ceil(fw), S)
  }
  if (coverBottom <= top) return
  // 2. below the bank: the wide river, fed from the middle — its streaks run outward from the centre
  const g = ctx.createLinearGradient(0, top, 0, coverBottom); g.addColorStop(0, "#2f7880"); g.addColorStop(0.4, "#1b4d55"); g.addColorStop(1, "#0b2226")
  ctx.fillStyle = g; ctx.fillRect(padL, top, padR - padL, coverBottom - top)
  const mid = W / 2 + shift(def.floor.rimFactor, W), fhw = halfAt(DH - 1)
  ctx.fillStyle = "rgba(235,250,250,0.7)"
  for (let x = padL - ((t * 40) % 24); x < padR; x += 24) if (Math.abs(x - mid) > fhw) ctx.fillRect(Math.floor(x), top, 14, 2)   // foam at the bank
  for (let r = 0; r < 7; r++) {
    const yy = top + 10 + r * 16, sp = 50 + r * 12, len = 40 + r * 10, span = 1400
    ctx.fillStyle = `rgba(170,230,235,${0.32 - r * 0.035})`
    for (let i = 0; i < 22; i++) for (const dir of [-1, 1]) {
      const d = ((i * 97 + t * sp + r * 61) % span), x = mid + dir * d - (dir < 0 ? len : 0)
      if (x + len < padL || x > padR) continue
      ctx.fillRect(Math.floor(x), Math.floor(yy + 3 * Math.sin(t + i)), len, 2)
    }
  }
  // 3. where the channel reaches the front of the bank it spills over in a short cascade, splashing into the river
  const cTop = top - 2, cH = 34
  const cg = ctx.createLinearGradient(0, cTop, 0, cTop + cH); cg.addColorStop(0, "#5fb4bc"); cg.addColorStop(1, "#2a7680")
  ctx.fillStyle = cg; ctx.fillRect(Math.floor(mid - fhw), cTop, Math.ceil(fhw * 2), cH)
  for (let i = 0; i < 40; i++) {
    const lx = mid - fhw + _h(i + 900) * fhw * 2, len = 8 + 12 * _h(i + 940), ly = cTop + ((t * (90 + 60 * _h(i + 980)) + _h(i) * cH) % (cH + len)) - len
    ctx.fillStyle = `rgba(240,252,252,${0.35 + 0.4 * _h(i + 20)})`; ctx.fillRect(Math.floor(lx), Math.floor(Math.max(cTop, ly)), 2, Math.min(len, cTop + cH - Math.max(cTop, ly)))
  }
  for (let i = 0; i < 16; i++) {                                     // splash + mist at the bottom of the cascade
    const ph = (t * 0.8 + _h(i + 50)) % 1, x = mid - fhw + _h(i + 60) * fhw * 2, y = cTop + cH - ph * 10, rr = 4 + 10 * ph
    ctx.fillStyle = `rgba(240,252,252,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill()
  }
}

// ───────────────────────────── SSF2 stage pack (Hidden Leaf Village) ─────────────────────────────
function ssf2Place(def, c, W, groundY) {
  const P = c.layout.pieces, S = def.S, mw = P.mg.w * S, mh = P.mg.h * S
  return { S, x: W / 2 - mw / 2, y: groundY - c.layout.standRow * S, w: mw, h: mh }
}
function drawSsf2Back(ctx, def, c, { canvasWidth, W, groundY, coverTop, coverBottom }) {
  const P = c.layout.pieces, C = c.layout.colors, t = now(), v = view(canvasWidth, W), padL = v.left - 8, padR = v.right + 8
  const isl = ssf2Place(def, c, W, groundY)
  ctx.save()
  const g = ctx.createLinearGradient(0, coverTop, 0, coverBottom); g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyLow)
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, coverBottom - coverTop)
  // far: the Hokage-rock backdrop, slow parallax; mirrored copies if the view ever runs past it
  const bg = c.img[P.hokage.file], bs = def.bgScale, bw = P.hokage.w * bs, bh = P.hokage.h * bs
  const bx = W / 2 - bw / 2 + shift(0.3, W), by = isl.y + 150 * isl.S - def.bgVillageRow * bs
  if (ready(bg)) for (let k = Math.floor((padL - bx) / bw); bx + k * bw < padR; k++) {
    const x = bx + k * bw
    if (Math.abs(k) % 2 === 0) ctx.drawImage(bg, Math.floor(x), Math.floor(by), Math.ceil(bw) + 1, Math.ceil(bh))
    else { ctx.save(); ctx.translate(Math.floor(x) + bw, Math.floor(by)); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0, Math.ceil(bw) + 1, Math.ceil(bh)); ctx.restore() }
  }
  if (by + bh < coverBottom) { ctx.fillStyle = C.skyLow; ctx.fillRect(padL, by + bh - 1, padR - padL, coverBottom - by - bh + 1) }
  // soft clouds drifting past below the island
  for (let i = 0; i < 10; i++) {
    const cx = padL + ((_h(i) * 3000 + t * (8 + 6 * _h(i + 5))) % (padR - padL + 400)) - 200, cy = isl.y + isl.h * (0.55 + 0.4 * _h(i + 9))
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(cx, cy, 70 + 50 * _h(i + 2), 16 + 8 * _h(i + 3), 0, 0, Math.PI * 2); ctx.fill()
  }
  // the island with the village (locked to the fighters)
  const mg = c.img[P.mg.file]; if (ready(mg)) ctx.drawImage(mg, Math.floor(isl.x), Math.floor(isl.y), Math.ceil(isl.w), Math.ceil(isl.h))
  ctx.restore()
  return true
}
function drawSsf2Front(ctx, def, c, W, groundY) {
  const isl = ssf2Place(def, c, W, groundY), fg = c.img[c.layout.pieces.fg.file], t = now()
  ctx.save(); ctx.imageSmoothingEnabled = false
  if (ready(fg)) ctx.drawImage(fg, Math.floor(isl.x), Math.floor(isl.y), Math.ceil(isl.w), Math.ceil(isl.h))
  for (let i = 0; i < 18; i++) {                                    // leaves drifting down across the village
    const ph = ((t * (0.06 + 0.04 * _h(i + 1)) + _h(i)) % 1), x = isl.x + isl.w * _h(i + 30) + Math.sin(t * 1.3 + i) * 40 - ph * 120
    const y = isl.y + ph * isl.h * 0.75, a = t * 2 + i
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = i % 3 ? "#5fae3c" : "#8bd05a"
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.restore()
}

// ───────────────────────────── INFINITY CASTLE (render-only, wall clock) ─────────────────────────────
function drawCastleBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), P = c.layout.pieces, im = c.img[P.castle.file], cw = P.castle.w, ch = P.castle.h
  const range = Math.abs(shift(p, W)) * 2 + 400
  const sc = Math.max((dockTop + 20 - coverTop) / ch, (padR - padL + range) / cw)
  const w = cw * sc, h = ch * sc, drift = Math.sin(t * 0.07) * 18                  // the castle slowly shifting
  const x = W / 2 - w / 2 + shift(p, W), y = dockTop + 20 - h + drift
  if (ready(im)) ctx.drawImage(im, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h + 24))
  // warm light breathing in the depths
  const gx = x + w * 0.52, gy = y + h * 0.42, gr = h * 0.45, a = 0.12 + 0.08 * Math.sin(t * 0.9)
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); g.addColorStop(0, `rgba(255,170,70,${a})`); g.addColorStop(1, "rgba(255,170,70,0)")
  ctx.fillStyle = g; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2)
  // floating rooms: small platforms rising and sinking at different depths (nearer = larger, faster parallax)
  const fp = c.img[P.float.file]
  if (ready(fp)) for (let i = 0; i < 9; i++) {
    const depth = 0.35 + 0.6 * _h(i + 3), fs = 0.6 + 1.4 * depth, per = 26 + 18 * _h(i + 8)
    const ph = ((t / per + _h(i)) % 1), fx = W * (0.05 + 0.9 * _h(i + 20)) + shift(p + 0.4 * depth, W)
    const fy = dockTop + 60 - ph * (dockTop + 60 - coverTop + 120) + Math.sin(t * 0.6 + i) * 6
    if (fx < padL - 300 || fx > padR + 300) continue
    ctx.globalAlpha = 0.45 + 0.5 * depth
    ctx.drawImage(fp, Math.floor(fx), Math.floor(fy), Math.ceil(P.float.w * fs), Math.ceil(P.float.h * fs))
  }
  ctx.globalAlpha = 1
  const vg = ctx.createLinearGradient(0, coverTop, 0, dockTop + 20)                    // dark at the top, deep shadow
  vg.addColorStop(0, "rgba(0,0,0,0.55)"); vg.addColorStop(0.6, "rgba(0,0,0,0.1)"); vg.addColorStop(1, "rgba(10,4,2,0.35)")
  ctx.fillStyle = vg; ctx.fillRect(padL, coverTop, padR - padL, dockTop + 20 - coverTop)
}

function infinityFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now()
  // lantern flames flicker: a warm glow over each lantern head
  const lw = P.lantern.w * S, lh = P.lantern.h * S
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (const pr of def.props) {
    const x = pr.x * W + shift(rowFactor(def, pr.bottomRow), W), y = dockTop + pr.bottomRow * S - lh + 8
    const f = 0.55 + 0.25 * Math.sin(t * 9 + pr.x * 40) + 0.2 * Math.sin(t * 23 + pr.x * 90)
    const g = ctx.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, `rgba(255,200,90,${0.55 * f})`); g.addColorStop(1, "rgba(255,140,40,0)")
    ctx.fillStyle = g; ctx.fillRect(x - 46, y - 46, 92, 92)
  }
  ctx.restore()
  // the platform's front wall below the planks (mirror-tiled, scrolling with the floor's front edge)
  const top = dockTop + P.deck.h * S
  if (coverBottom <= top) return
  const fc = c.img[P.face.file], fw = P.face.w * S, fh = P.face.h * S, off = W / 2 - fw / 2 + shift(def.floor.rimFactor, W)
  if (ready(fc)) for (let k = Math.floor((padL - off) / fw); off + k * fw < padR; k++) {
    const x = off + k * fw
    if (Math.abs(k) % 2 === 0) ctx.drawImage(fc, Math.floor(x), top, Math.ceil(fw) + 1, fh)
    else { ctx.save(); ctx.translate(Math.floor(x) + fw, top); ctx.scale(-1, 1); ctx.drawImage(fc, 0, 0, Math.ceil(fw) + 1, fh); ctx.restore() }
  }
  if (coverBottom > top + fh) {
    const g = ctx.createLinearGradient(0, top + fh, 0, coverBottom); g.addColorStop(0, "#1a0e06"); g.addColorStop(1, "#050302")
    ctx.fillStyle = g; ctx.fillRect(padL, top + fh, padR - padL, coverBottom - top - fh)
  }
}

// ───────────────────────────── THE NULL VOID (render-only, wall clock) ─────────────────────────────
// a jagged floating rock: flat-ish lit top, ragged underside tapering to a point; deterministic from its seed
function nvRock(ctx, x, y, w, seed, lit = "#6a5590", body = "#2a1d3e", glow = null) {
  const n = 9, h = w * (0.55 + 0.3 * _h(seed + 1))
  ctx.beginPath(); ctx.moveTo(x - w / 2, y)
  for (let i = 1; i < n; i++) ctx.lineTo(x - w / 2 + (w * i) / n, y - 3 - 6 * _h(seed + i * 3))          // bumpy top
  ctx.lineTo(x + w / 2, y)
  for (let i = n - 1; i > 0; i--) {                                                                   // ragged underside
    const u = i / n, depth = h * Math.sin(u * Math.PI) ** 0.8 * (0.6 + 0.5 * _h(seed + i * 7))
    ctx.lineTo(x - w / 2 + w * u, y + depth)
  }
  ctx.closePath()
  const g = ctx.createLinearGradient(0, y - 8, 0, y + h); g.addColorStop(0, lit); g.addColorStop(0.15, body); g.addColorStop(1, "#0b0614")
  ctx.fillStyle = g; ctx.fill()
  if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - w * 0.2, y + h * 0.15); ctx.lineTo(x - w * 0.05, y + h * 0.45); ctx.lineTo(x + w * 0.1, y + h * 0.3); ctx.stroke() }
  return h
}

function drawNullVoidBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), P = c.layout.pieces, bot = dockTop + 4 * def.S, sh = shift(p, W)
  const vt = Math.max(coverTop, bot - 440)                           // the part of the void actually on screen
  // 1. the void: near-black violet, Unlimited-Void-style stars + nebulae + a faint grid
  const g = ctx.createLinearGradient(0, coverTop, 0, bot); g.addColorStop(0, "#05020b"); g.addColorStop(0.6, "#160828"); g.addColorStop(1, "#2a0c30")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, bot - coverTop)
  for (const [nx, ny, r, col] of [[0.2, 0.35, 420, "150,30,140"], [0.75, 0.5, 520, "70,20,150"], [0.5, 0.2, 360, "200,40,80"], [0.95, 0.15, 300, "30,120,150"]]) {
    const cx = W * nx + sh * 1.4, cy = coverTop + (bot - coverTop) * ny, ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    ng.addColorStop(0, `rgba(${col},0.28)`); ng.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = ng; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }
  for (let i = 0; i < 260; i++) {
    const x = _h(i) * (W + 1400) - 700 + sh + (t * 3 * (i % 4)) % 40, y = coverTop + _h(i + 777) * (bot - coverTop)
    if (x < padL || x > padR) continue
    ctx.fillStyle = `rgba(235,225,255,${0.3 + 0.7 * Math.abs(Math.sin(t * (0.4 + _h(i + 3)) + i))})`; ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1)
  }
  ctx.strokeStyle = "rgba(200,170,255,0.045)"; ctx.lineWidth = 1                       // the faint endless grid
  const gs = 64, gx0 = ((sh * 1.5 - padL) % gs + gs) % gs + padL - gs
  for (let x = gx0; x < padR; x += gs) { ctx.beginPath(); ctx.moveTo(x, coverTop); ctx.lineTo(x, bot); ctx.stroke() }
  for (let y = bot - ((t * 6) % gs); y > coverTop; y -= gs) { ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padR, y); ctx.stroke() }
  // 2. the rift: a swirling vortex high up where things are dragged in from outside
  const rx = W * 0.56 + sh * 1.2, ry = vt + (bot - vt) * 0.42, rr = 95
  const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr * 2.2); rg.addColorStop(0, "rgba(255,120,200,0.55)"); rg.addColorStop(0.35, "rgba(150,40,170,0.3)"); rg.addColorStop(1, "rgba(80,10,120,0)")
  ctx.fillStyle = rg; ctx.fillRect(rx - rr * 2.2, ry - rr * 2.2, rr * 4.4, rr * 4.4)
  ctx.save(); ctx.translate(rx, ry); ctx.scale(1, 0.55)
  for (let arm = 0; arm < 6; arm++) {
    ctx.strokeStyle = arm % 2 ? "rgba(255,140,220,0.55)" : "rgba(120,40,200,0.65)"; ctx.lineWidth = 6 - arm * 0.6
    ctx.beginPath()
    for (let i = 0; i <= 40; i++) { const u = i / 40, a = -t * 0.9 + arm * Math.PI / 3 + u * 5.2, r = rr * (1 - u * 0.92); i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) }
    ctx.stroke()
  }
  ctx.fillStyle = "#fff0fa"; ctx.beginPath(); ctx.arc(0, 0, 10 + 3 * Math.sin(t * 3), 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  for (let i = 0; i < 10; i++) {                                     // debris spiralling into the rift
    const ph = (t * (0.05 + 0.03 * _h(i)) + _h(i + 40)) % 1, a = _h(i + 60) * 6.28 + ph * 9, r = rr * 3.2 * (1 - ph)
    const dx = rx + Math.cos(a) * r, dy = ry + Math.sin(a) * r * 0.55, sz = 2 + 6 * (1 - ph)
    ctx.fillStyle = `rgba(120,100,150,${0.9 * (1 - ph)})`; ctx.save(); ctx.translate(dx, dy); ctx.rotate(a * 2); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.7); ctx.restore()
  }
  // 3. glowing mist (the repainted clouds), drifting
  const mi = c.img[P.mist.file]
  if (ready(mi)) {
    const mw = P.mist.w * 1.5, mh = P.mist.h * 1.5, my = bot - mh - 10, mx0 = ((sh * 2 + t * 6 - padL) % mw + mw) % mw - mw + padL
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.38
    for (let x = mx0, k = 0; x < padR; x += mw, k++) {
      if (k % 2 === 0) ctx.drawImage(mi, Math.floor(x), my, Math.ceil(mw) + 1, mh)
      else { ctx.save(); ctx.translate(Math.floor(x) + mw, my); ctx.scale(-1, 1); ctx.drawImage(mi, 0, 0, Math.ceil(mw) + 1, mh); ctx.restore() }
    }
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false
  }
  // 4. floating rock islands at several depths, bobbing; two carry the petrified tree and the wrecked shack
  const ISL = [[0.08, 0.3, 150, 0.25], [0.3, 0.55, 230, 0.4, "tree"], [0.47, 0.2, 90, 0.2], [0.68, 0.62, 260, 0.45, "shack"], [0.9, 0.4, 170, 0.32], [0.18, 0.72, 120, 0.55], [0.82, 0.78, 140, 0.6]]
  ISL.forEach(([fx, fy, w, depth, carry], i) => {
    const x = W * fx + shift(depth, W), y = vt + (bot - vt) * fy * 0.85 + Math.sin(t * (0.3 + 0.2 * _h(i)) + i * 2) * 10
    if (x + w < padL - 200 || x - w > padR + 200) return
    if (carry) {
      const pc = P[carry], im = c.img[pc.file], s = carry === "tree" ? 1.1 : 0.85, iw = pc.w * s, ih = pc.h * s
      if (ready(im)) ctx.drawImage(im, Math.floor(x - iw / 2 + (carry === "shack" ? 10 : 0)), Math.floor(y - ih + 6), Math.ceil(iw), Math.ceil(ih))
    }
    nvRock(ctx, x, y, w, i * 31 + 5, depth > 0.4 ? "#7a63a2" : "#4e3e6c", depth > 0.4 ? "#2e2044" : "#1e1530", i % 2 ? "rgba(230,80,200,0.6)" : null)
  })
  for (let i = 0; i < 16; i++) {                                     // small debris drifting past
    const x = padL + ((t * (6 + 10 * _h(i)) + _h(i + 90) * 4000) % (padR - padL + 200)) - 100, y = vt + _h(i + 120) * (bot - vt) * 0.85
    nvRock(ctx, x, y + Math.sin(t + i) * 4, 10 + 16 * _h(i + 140), i * 13 + 400, "#4e3e6c", "#1e1530")
  }
}

// below the fighters' rock: the island's jagged underside, cracks glowing, crumbs falling away into the void
function nullVoidUnder(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now(), top = dockTop + P.floor.h * S
  if (coverBottom <= top) return
  ctx.fillStyle = "#05020b"; ctx.fillRect(padL, top, padR - padL, coverBottom - top)
  const off = shift(def.floor.rimFactor, W)
  // irregular hanging rock: each world column k gets its own width and depth (big crags + small teeth between)
  const cols = [], X0 = padL - 200
  let k = Math.floor((X0 - off) / 50)
  for (let x = off + k * 50; x < padR + 200; k++) { const w = 26 + 70 * _h(k * 11 + 1); cols.push([x, w, k]); x += w }
  for (const layer of [0, 1]) {
    ctx.beginPath(); ctx.moveTo(cols[0][0], top)
    for (const [x, w, kk] of cols) {
      const big = _h(kk * 5 + layer) > 0.7, d = (big ? 150 + 120 * _h(kk * 3 + 9) : 30 + 70 * _h(kk * 3 + 4)) * (layer ? 0.6 : 1)
      ctx.lineTo(x + w * (0.3 + 0.4 * _h(kk + 77)), top + d); ctx.lineTo(x + w, top + 10 + 30 * _h(kk * 9 + layer))
    }
    ctx.lineTo(padR + 200, top); ctx.closePath()
    const g = ctx.createLinearGradient(0, top, 0, top + 270)
    if (layer) { g.addColorStop(0, "#4a3670"); g.addColorStop(1, "#1a1030") } else { g.addColorStop(0, "#2a1c42"); g.addColorStop(0.5, "#140b22"); g.addColorStop(1, "#06030c") }
    ctx.fillStyle = g; ctx.fill()
  }
  ctx.strokeStyle = `rgba(230,80,200,${0.45 + 0.3 * Math.sin(t * 2)})`; ctx.lineWidth = 1.2
  for (const [x, w, kk] of cols) {                                   // a few thin glowing veins
    if (_h(kk * 13 + 2) < 0.75) continue
    let vx = x + w * 0.5, vy = top + 8; ctx.beginPath(); ctx.moveTo(vx, vy)
    for (let j = 0; j < 4; j++) { vx += (_h(kk + j * 5) - 0.5) * 18; vy += 12 + 10 * _h(kk * 2 + j); ctx.lineTo(vx, vy) }
    ctx.stroke()
  }
  ctx.fillStyle = "#e8e0f8"; ctx.fillRect(padL, top, padR - padL, 2)
  for (let i = 0; i < 14; i++) {                                     // crumbs falling off
    const ph = (t * (0.25 + 0.2 * _h(i)) + _h(i + 30)) % 1, x = padL + _h(i + 50) * (padR - padL), y = top + 40 + ph * (coverBottom - top)
    ctx.fillStyle = `rgba(120,96,150,${1 - ph})`; ctx.fillRect(x, y, 3 + 3 * _h(i), 3)
  }
}

// ───────────────────────────── SHIBUYA INCIDENT (render-only, wall clock) ─────────────────────────────
// Chun-Li's street at night under the dome. A crowd of bystanders walks the kerb, panics when the fight comes near,
// and dies to whatever reaches them: slashes cut them in half (Dismantle / Cleave dice them), blasts blow them apart,
// strikes launch them. Every landed hit also damages the city behind: holes punched in the towers, fires, smoke,
// screens dying, towers collapsing, shop glass breaking, craters in the street. Nothing here touches the fight:
// the state is read from the fighters / attack boxes / projectiles the frame hands over, never written back.
const SB = { p1: null, peds: [], pieces: [], rest: [], blood: [], pools: [], wall: [], glass: [], craters: [], debris: [], towers: null,
  hp: new WeakMap(), last: 0, spared: 0, spawnT: 0, total: 0, ambientT: 0, seq: 0, yG: 0, W: 2400, cracks: [] }
const SB_TOWER_P = 0.35, SB_SHOP_P = 0.92, SB_SHOP_SC = 1.5
let _sbSeed = 0x9e3779b9   // render-only PRNG (the sim never sees it)
const sbRnd = () => { _sbSeed ^= _sbSeed << 13; _sbSeed ^= _sbSeed >>> 17; _sbSeed ^= _sbSeed << 5; return (_sbSeed >>> 0) / 4294967296 }
const SLASHERS = /sukuna|zoro|toji|tanjiro|zenitsu|inosuke|rengoku|ichigo|kenpachi|zaraki|yamamoto|killua|maki|miwa|kakashi|sasuke|itachi|madara|minato|hashirama|tobirama|hisoka/
const isSlash = n => /slash|cleave|dismantle|sword|blade|cut|katana|slice|claw|scythe|sever|edge|fang|kunai|iai|tachi|zan|chidori|wind|whip/i.test(n)
const isBlast = n => /ki\b|beam|blast|bomb|fire|flame|explo|kame|cannon|laser|rasen|purple|ball|wave|nuke|burst|meteor|arrow|shot|orb|ray|bullet|gun|missile|domain|ult/i.test(n)

function sbTowers(W) {
  const T = []; let x = -900, i = 0
  while (x < W + 900) {
    const w = 150 + 170 * _h(i * 17 + 3), h = 380 + 520 * _h(i * 29 + 7)
    T.push({ x, w, h, i, holes: [], dmg: 0, fall: null, cut: 1, screen: _h(i * 41 + 1) > 0.62, neon: _h(i * 5 + 9) > 0.4 })
    x += w + 14 + 40 * _h(i * 7 + 2); i++
  }
  return T
}
function sbReset(p1, W) {
  Object.assign(SB, { p1, peds: [], pieces: [], rest: [], blood: [], pools: [], wall: [], glass: [], craters: [], debris: [], towers: sbTowers(W),
    hp: new WeakMap(), spared: 0, spawnT: 0, total: 0, ambientT: 0, seq: 0, W, cracks: [] })
}

// a bystander drawn in chunky pixels (adults only): walk 0/1, panic 0/1
const _pedCache = new Map()
function pedFrames(seed) {
  if (_pedCache.has(seed)) return _pedCache.get(seed)
  const pick = (a, k) => a[Math.floor(_h(seed * 13 + k) * a.length)]
  const skin = pick(["#f1c9a5", "#e0b08a", "#c58c64", "#8d5b3e", "#5e3c28"], 1), coat = pick(["#2b2f3a", "#5a2a2a", "#2f4a3a", "#bdb4a2", "#3a3f6a", "#7a5a30", "#141418", "#6a6f78", "#8a2f4a"], 2)
  const pants = pick(["#1d1f26", "#33363f", "#2a3550", "#4a3a2a", "#111"], 3), hair = pick(["#141414", "#3a2618", "#6b4a2a", "#c9b07a", "#8a8a8a", "#1a1a2a"], 4)
  const long = _h(seed * 13 + 5) > 0.6, bag = _h(seed * 13 + 6) > 0.6, px = 3, GW = 16, GH = 36
  const fr = []
  for (let f = 0; f < 4; f++) {
    const cv = document.createElement("canvas"); cv.width = GW * px; cv.height = GH * px
    const g = cv.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * px, y * px, w * px, h * px) }
    const panic = f >= 2, step = f % 2
    R(6, 2, 4, 5, skin); R(6, 1, 4, 2, hair); if (long) { R(5, 2, 1, 6, hair); R(10, 2, 1, 6, hair) } else R(5, 2, 1, 2, hair)
    R(7, 7, 2, 1, skin); R(5, 8, 6, 11, coat); R(5, 8, 6, 1, "rgba(255,255,255,0.15)")
    if (panic) { R(3, 2 + step, 2, 7, coat); R(11, 2 + (1 - step), 2, 7, coat); R(3, 1 + step, 2, 1, skin); R(11, 1 + (1 - step), 2, 1, skin) }
    else { R(4, 9 + step, 1, 9, coat); R(11, 10 - step, 1, 9, coat); R(4, 18 + step, 1, 1, skin); R(11, 19 - step, 1, 1, skin) }
    if (bag && !panic) R(11, 15 - step, 2, 4, "#3a2a1a")
    const s = panic ? 2 : 1
    R(6 - step * s, 19, 2, 15, pants); R(8 + step * s, 19, 2, 15, pants)
    R(5 - step * s, 34, 3, 1, "#0c0c0c"); R(8 + step * s, 34, 3, 1, "#0c0c0c")
    fr.push(cv)
  }
  _pedCache.set(seed, fr); return fr
}
function sbSpawn(c, viewL, viewR) {
  const seq = SB.seq++, side = _h(seq * 3 + 1) < 0.5 ? -1 : 1, P = c.layout.peds
  const kind = _h(seq * 7 + 2) < 0.12 ? "biker" : _h(seq * 7 + 3) < 0.1 ? "hatman" : "ped"
  const x = side < 0 ? Math.max(20, viewL - 80) : Math.min(SB.W - 20, viewR + 80)
  SB.peds.push({ kind, seed: seq * 977 + 13, x, dir: -side, speed: kind === "biker" ? 170 : 38 + 30 * _h(seq * 11), t: _h(seq) * 3,
    freeze: kind === "ped" && _h(seq * 5 + 4) < 0.3, panic: 0, frames: kind === "ped" ? pedFrames(seq * 977 + 13) : P[kind].map(f => c.img[f.file]),
    sc: kind === "ped" ? 1 : kind === "biker" ? 1.05 : 1.5 })
}
function pedSprite(pd) {
  const k = pd.kind === "ped" ? (pd.panic > 0 ? 2 : 0) + (Math.floor(pd.t / (pd.panic > 0 ? 0.09 : 0.2)) % 2)
    : Math.floor(pd.t / (pd.kind === "biker" ? 0.08 : 0.3)) % pd.frames.length
  const im = pd.frames[k]; return { im, w: (im.width || 48) * pd.sc, h: (im.height || 108) * pd.sc }
}

// ── gore ──
function sbBleed(x, y, n, vx0, spread, wallFrac = 0.3) {
  for (let i = 0; i < n; i++) {
    if (SB.blood.length > 900) SB.blood.shift()
    const a = -Math.PI / 2 + (sbRnd() - 0.5) * spread, sp = 120 + sbRnd() * 520
    SB.blood.push({ x, y, vx: vx0 + Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 2 + sbRnd() * 4, wall: sbRnd() < wallFrac, life: 0.25 + sbRnd() * 0.5 })
  }
}
// Who kills bystanders: villains and the ones who don't care. Heroes (and anyone not listed) only knock them down —
// the bystander gets up and runs.
const SB_KILLERS = new Set(["goku_black", "vegeta_dark", "vegeta", "sukuna", "alt_sukuna", "toji", "madara", "obito", "tobi", "pain", "six_paths_pain",
  "rick", "rickPrime", "beerus", "albedo", "kevin_levin", "hisoka", "chrollo", "ghostface", "jason", "isshiki", "zaraki", "zaraki_shikai", "mayuri", "light",
  "homelander", "vilgax", "shisui_fallen", "soldier_boy", "buggy", "arlong", "krybot", "syndrome", "dseyl"])
export const shibuyaKills = rk => SB_KILLERS.has(String(rk || ""))
function sbStrike(pd, cause, fromX, rosterKey = "") {
  if (pd.down > 0) return
  if (shibuyaKills(rosterKey)) return sbKill(pd, cause, fromX, rosterKey)
  pd.down = 0.9; pd.panic = 3; pd.freeze = false; pd.held = false; pd.dir = Math.sign(pd.x - fromX) || pd.dir; SB.spared++
}
function sbKill(pd, cause, fromX, rosterKey = "") {
  const { im, w, h } = pedSprite(pd), away = Math.sign(pd.x - fromX) || 1, flip = pd.dir < 0 ? -1 : 1
  const name = String(cause || "").toLowerCase()
  const type = /dismantle|cleave/.test(name) ? "dice" : isSlash(name) || (SLASHERS.test(rosterKey) && !isBlast(name)) ? "cut" : isBlast(name) ? "gib" : "launch"
  const base = { im, w, h, flip, landed: false }
  const add = (poly, vx, vy, va, delay = 0, bleed = 0, cuts = []) => {
    let cx = 0, cy = 0; for (const [a, b] of poly) { cx += a; cy += b } cx /= poly.length; cy /= poly.length
    let r = 0; for (const [a, b] of poly) r = Math.max(r, Math.hypot(a - cx, b - cy))
    SB.pieces.push({ ...base, poly, cx, cy, r, x: pd.x + cx, y: SB.yG + cy, vx, vy, a: 0, va, delay, bleed, cuts })
  }
  const L = -w / 2, R = w / 2
  if (type === "cut") {
    const y0 = -h * (0.45 + 0.2 * sbRnd()), tilt = (sbRnd() - 0.5) * 0.7 * w
    const cut = [[L, y0 - tilt / 2], [R, y0 + tilt / 2]]
    add([[L, -h], [R, -h], cut[1], cut[0]], away * (180 + sbRnd() * 200), -300 - sbRnd() * 200, away * (4 + sbRnd() * 5), 0, 0.6, [cut])
    add([cut[0], cut[1], [R, 0], [L, 0]], away * 30, -40, away * 1.6, 0.45, 2.2, [cut])
    sbBleed(pd.x, SB.yG + y0, 110, away * 120, 1.6)
  } else if (type === "dice") {
    const ys = [-h, -h * (0.72 + 0.06 * sbRnd()), -h * (0.5 + 0.06 * sbRnd()), -h * (0.27 + 0.06 * sbRnd()), 0]
    for (let k = 0; k < 4; k++) for (const [x0, x1] of (k === 1 || k === 2 ? [[L, 0], [0, R]] : [[L, R]])) {
      const sl = (sbRnd() - 0.5) * 10
      add([[x0, ys[k] + sl], [x1, ys[k] - sl], [x1, ys[k + 1]], [x0, ys[k + 1]]], (x0 < 0 && x1 <= 0 ? -1 : x0 >= 0 ? 1 : away) * (40 + 120 * sbRnd()) + away * 60,
        -120 - 160 * sbRnd() + k * 40, (sbRnd() - 0.5) * 10, 0.18 + 0.1 * k * sbRnd(), 0.8, [[[x0, ys[k]], [x1, ys[k]]], [[x0, ys[k + 1]], [x1, ys[k + 1]]]])
    }
    sbBleed(pd.x, SB.yG - h * 0.5, 220, away * 60, 2.8, 0.45)
  } else if (type === "gib") {
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 3; gx++) {
      const x0 = L + (w * gx) / 3, x1 = L + (w * (gx + 1)) / 3, y0 = -h + (h * gy) / 4, y1 = -h + (h * (gy + 1)) / 4
      const j = () => (sbRnd() - 0.5) * 6
      const poly = [[x0 + j(), y0 + j()], [x1 + j(), y0 + j()], [x1 + j(), y1 + j()], [x0 + j(), y1 + j()]]
      const ang = Math.atan2(((y0 + y1) / 2 + h / 2), ((x0 + x1) / 2) || 0.01), sp = 380 + 520 * sbRnd()
      add(poly, Math.cos(ang) * sp + away * 260, Math.sin(ang) * sp - 420, (sbRnd() - 0.5) * 22, 0, 0.5, [[poly[0], poly[1]], [poly[2], poly[3]]])
    }
    sbBleed(pd.x, SB.yG - h * 0.5, 260, away * 160, 6.2, 0.5)
    SB.craters.push({ x: pd.x, r: 38, scorch: true })
  } else {
    add([[L, -h], [R, -h], [R, 0], [L, 0]], away * (620 + 300 * sbRnd()), -420 - 200 * sbRnd(), away * (7 + 6 * sbRnd()), 0, 0.9, [])
    sbBleed(pd.x, SB.yG - h * 0.7, 70, away * 300, 1.2)
    SB.pieces[SB.pieces.length - 1].splat = true
  }
  pd.dead = true
}

// ── city damage ──
function sbHitCity(x, d, t, W) {
  const tx = x - shift(SB_TOWER_P, W), T = SB.towers
  let best = T[0], bd = 1e9
  for (const tw of T) { const dd = Math.abs(tw.x + tw.w / 2 - tx); if (dd < bd && !tw.fall) { bd = dd; best = tw } }
  const n = d >= 110 ? 2 : 1
  for (let k = 0; k < n; k++) {
    if (best.holes.length > 14) break
    const s = SB.seq++
    best.holes.push({ u: 0.12 + 0.76 * _h(s * 3 + 1), v: 0.05 + 0.9 * _h(s * 3 + 2), r: 14 + Math.min(46, d * 0.22) * (0.6 + 0.6 * _h(s * 3 + 5)), t0: t, seed: s })
    for (let i = 0; i < 10; i++) SB.debris.push({ x: best.x + best.w * best.holes[best.holes.length - 1].u, y: null, hv: best.holes[best.holes.length - 1].v, tw: best,
      vx: (sbRnd() - 0.5) * 160, vy: -60 - sbRnd() * 120, s: 3 + sbRnd() * 6, life: 2.5 })
  }
  best.dmg += d / 260
  if (best.dmg > 1.25 && !best.fall && best.h > 300) best.fall = { t0: t, cut: 0.45 + 0.2 * _h(best.i * 3) }
  // the shop front behind the impact: broken glass
  const sx = x - shift(SB_SHOP_P, W)
  SB.cracks.push({ x: sx, y: 0.35 + 0.35 * sbRnd(), r: 20 + Math.min(40, d * 0.3), seed: SB.seq++ })
  if (SB.cracks.length > 40) SB.cracks.shift()
  for (let i = 0; i < 14; i++) SB.glass.push({ x, y: SB.yG - 60 - sbRnd() * 90, vx: (sbRnd() - 0.5) * 300, vy: -100 - sbRnd() * 200, s: 2 + sbRnd() * 3, life: 1.2 })
  if (d >= 80) SB.craters.push({ x, r: 26 + Math.min(50, d * 0.25) })
  if (SB.craters.length > 30) SB.craters.shift()
}

// per-frame update, from the front pass (it alone sees the fighters); the back pass draws the result next frame
function sbUpdate(c, W, groundY, world) {
  const t = now(), dt = Math.min(0.05, Math.max(0, t - (SB.last || t))); SB.last = t
  const F = (world.fighters || []).filter(Boolean)
  if (F[0] !== SB.p1 || !SB.towers || SB.W !== W) sbReset(F[0], W)
  SB.yG = groundY - 24
  const v = view(1280, W)
  // hits landed this frame (a fighter's health dropped) → the city takes it; big ones blow away nearby bystanders
  for (const f of F) {
    const hp = f.health ?? 0, was = SB.hp.get(f)
    SB.hp.set(f, hp)
    if (was == null || hp >= was) continue
    const d = was - hp, x = f.x + (f.w || 50) / 2, att = F.find(o => o !== f)
    SB.total += d
    sbHitCity(x, d, t, W)
    if (d >= 110) for (const pd of SB.peds) if (!pd.dead && Math.abs(pd.x - x) < 170) sbStrike(pd, att?.currentAttack?.name || "blast", x, att?.rosterKey)
  }
  // the fight elsewhere in Shibuya: as the match wears on, explosions go off in the towers on their own
  SB.ambientT -= dt
  if (SB.total > 250 && SB.ambientT <= 0) {
    SB.ambientT = Math.max(2.5, 9 - SB.total / 250)
    const T = SB.towers, tw = T[Math.floor(sbRnd() * T.length)]
    sbHitCity(tw.x + tw.w / 2 + shift(SB_TOWER_P, W), 40 + sbRnd() * 80, t, W)
  }
  // crowd: keep the kerb busy
  SB.spawnT -= dt
  if (SB.spawnT <= 0 && SB.peds.filter(p => !p.dead).length < 8) { sbSpawn(c, v.left, v.right); SB.spawnT = 0.9 + sbRnd() * 1.2 }
  const boxes = F.map(f => [f, world.attackBox?.(f)]).filter(([, b]) => b)
  for (const pd of SB.peds) {
    if (pd.dead) continue
    pd.t += dt
    let near = null, nd = 1e9
    for (const f of F) { const d = Math.abs(f.x + (f.w || 50) / 2 - pd.x); if (d < nd) { nd = d; near = f } }
    if (near && nd < 280 && pd.kind !== "biker" && !pd.held) { pd.panic = 1.5; pd.dir = Math.sign(pd.x - (near.x + (near.w || 50) / 2)) || pd.dir }
    pd.panic = Math.max(0, pd.panic - dt)
    if (pd.down > 0) { pd.down -= dt; continue }                       // knocked over by a hero: lies there, then gets up and runs
    const sp = pd.freeze && pd.panic > 0 ? 0 : pd.speed * (pd.panic > 0 ? 3 : 1)
    pd.x += pd.dir * sp * dt
    if (pd.x < 10 || pd.x > W - 10) pd.dir *= -1                      // the dome: nobody gets out
    const { w, h } = pedSprite(pd), L = pd.x - w * 0.3, R = pd.x + w * 0.3, T = SB.yG - h, B = SB.yG
    for (const [f, b] of boxes) if (b.x < R && b.x + b.w > L && b.y < B + 30 && b.y + b.h > T - 20) { sbStrike(pd, f.currentAttack?.name, f.x + (f.w || 50) / 2, f.rosterKey); break }
    if (pd.dead) continue
    for (const p of world.projectiles || []) {
      const r = p.radius || (p.w || 20) / 2
      if (p.x + r > L && p.x - r < R && p.y + r > T - 10 && p.y - r < B + 20) { const o = p.owner; sbStrike(pd, p.name || p.type || "blast", p.x - (p.vx || 0), o?.rosterKey || ""); break }
    }
  }
  SB.peds = SB.peds.filter(p => !p.dead && p.x > v.left - 1400 && p.x < v.right + 1400)
  // pieces in flight
  for (const pc of SB.pieces) {
    if (pc.delay > 0) { pc.delay -= dt; if (pc.bleed > 0 && sbRnd() < 0.6) sbBleed(pc.x, pc.y - pc.r * 0.5, 2, 0, 0.6, 0.1); continue }
    pc.vy += 1500 * dt; pc.x += pc.vx * dt; pc.y += pc.vy * dt; pc.a += pc.va * dt
    if (pc.bleed > 0) { pc.bleed -= dt; if (sbRnd() < 0.8) sbBleed(pc.x, pc.y, 2, pc.vx * 0.2, 1, 0.05) }
    const floorY = SB.yG - Math.min(pc.r * 0.45, 16)
    if (pc.y >= floorY) {
      pc.y = floorY
      if (pc.splat && Math.abs(pc.vy) > 200) sbBleed(pc.x, pc.y, 40, pc.vx * 0.3, 2.4, 0)
      if (Math.abs(pc.vy) > 260) { pc.vy *= -0.25; pc.vx *= 0.5; pc.va *= 0.5 }
      else { pc.landed = true; pc.a = Math.round(pc.a / (Math.PI / 2)) * (Math.PI / 2) + (pc.cuts.length ? 0.2 : 0); SB.pools.push({ x: pc.x, r: 6, R: 24 + pc.r * 0.5 }) }
    }
  }
  for (const pc of SB.pieces) if (pc.landed) SB.rest.push(pc)
  SB.pieces = SB.pieces.filter(p => !p.landed)
  if (SB.rest.length > 90) SB.rest.splice(0, SB.rest.length - 90)
  // blood
  for (const b of SB.blood) {
    b.life -= dt; b.vy += 1300 * dt; b.x += b.vx * dt; b.y += b.vy * dt
    if (b.wall && b.life <= 0) { SB.wall.push({ x: b.x - shift(SB_SHOP_P, W), y: b.y, s: b.s * (1.2 + sbRnd()) }); b.dead = true }
    else if (b.y >= SB.yG + 8 && b.vy > 0) {
      b.dead = true
      const pool = SB.pools.find(p => Math.abs(p.x - b.x) < p.R * 0.8)
      if (pool) pool.R = Math.min(90, pool.R + 0.25); else SB.pools.push({ x: b.x, r: 2, R: 6 + sbRnd() * 8 })
    }
  }
  SB.blood = SB.blood.filter(b => !b.dead)
  if (SB.wall.length > 500) SB.wall.splice(0, SB.wall.length - 500)
  if (SB.pools.length > 160) SB.pools.splice(0, SB.pools.length - 160)
  for (const p of SB.pools) p.r = Math.min(p.R, p.r + 30 * dt)
  for (const g of SB.glass) { g.life -= dt; g.vy += 1200 * dt; g.x += g.vx * dt; g.y += g.vy * dt; if (g.y > SB.yG + 6) { g.y = SB.yG + 6; g.vx *= 0.8; g.vy = 0 } }
  SB.glass = SB.glass.filter(g => g.life > 0)
  for (const d of SB.debris) { d.life -= dt; d.vy += 600 * dt; d.x += d.vx * dt; if (d.y == null) d.y = 0; d.y += d.vy * dt }
  SB.debris = SB.debris.filter(d => d.life > 0)
}

function drawPiece(ctx, pc) {
  ctx.save(); ctx.translate(pc.x, pc.y); ctx.rotate(pc.a); ctx.translate(-pc.cx, -pc.cy)
  ctx.beginPath(); ctx.moveTo(pc.poly[0][0], pc.poly[0][1]); for (const [a, b] of pc.poly.slice(1)) ctx.lineTo(a, b); ctx.closePath()
  ctx.save(); ctx.clip()
  if (pc.flip < 0) { ctx.scale(-1, 1) }
  if (ready(pc.im) || pc.im.getContext) ctx.drawImage(pc.im, -pc.w / 2, -pc.h, pc.w, pc.h)
  ctx.restore()
  for (const [a, b] of pc.cuts) {                                     // the wound along each cut
    ctx.strokeStyle = "#7a0008"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
    ctx.strokeStyle = "#d0202a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
  }
  ctx.restore()
}

// BACK: the night sky, the dome, the towers (and their damage), the shop row
function drawShibuyaBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), P = c.layout.pieces
  if (!SB.towers || SB.W !== W) sbReset(SB.p1, W)
  const shopTop = dockTop + 4 - P.shops.h * SB_SHOP_SC
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#0e0c1c"); g.addColorStop(0.55, "#22183a"); g.addColorStop(1, "#5a2a48")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  // the dome: a black curtain closed over the district, its rim faintly shimmering
  const cx = W / 2 + shift(0.05, W), cy = dockTop + 2600, R = 3150
  ctx.save(); ctx.beginPath(); ctx.rect(padL, coverTop, padR - padL, dockTop - coverTop); ctx.clip()
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.rect(padL, coverTop, padR - padL, dockTop - coverTop); ctx.arc(cx, cy, R, 0, Math.PI * 2, true); ctx.fill()
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = `rgba(${k ? "90,40,110" : "160,60,90"},${0.25 + 0.15 * Math.sin(t * 1.3 + k)})`; ctx.lineWidth = 2 + k * 3
    ctx.beginPath(); ctx.arc(cx, cy, R - k * 6 + Math.sin(t * 0.7 + k) * 3, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke()
  }
  ctx.restore()
  // towers
  const st = shift(SB_TOWER_P, W), base = shopTop + 120
  for (const tw of SB.towers) {
    const x = tw.x + st
    if (x + tw.w < padL - 40 || x > padR + 40) continue
    let h = tw.h, top = base - h
    if (tw.fall) {
      const k = Math.min(1, (t - tw.fall.t0) / 2.6), cutY = base - h * tw.fall.cut
      if (k < 1) {                                                    // the top section shears off and drops
        ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.translate(x + tw.w / 2, cutY + 900 * k * k); ctx.rotate((tw.i % 2 ? 1 : -1) * 0.6 * k)
        sbTowerBody(ctx, tw, -tw.w / 2, -(h * (1 - tw.fall.cut)), tw.w, h * (1 - tw.fall.cut), t, true); ctx.restore()
        for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(120,110,110,${0.35 * (1 - k)})`; const a = _h(i + tw.i) * 6.28; ctx.beginPath(); ctx.arc(x + tw.w / 2 + Math.cos(a) * 160 * k, cutY + Math.sin(a) * 60 * k, 30 + 60 * k, 0, 7); ctx.fill() }
      }
      h = h * tw.fall.cut; top = base - h
    }
    sbTowerBody(ctx, tw, x, top, tw.w, h, t, false)
    if (tw.fall) {                                                    // jagged broken top, burning
      ctx.fillStyle = "#020205"; ctx.beginPath(); ctx.moveTo(x - 1, top - 2)
      for (let i = 0; i <= 8; i++) ctx.lineTo(x + (tw.w * i) / 8, top + 4 + 26 * _h(tw.i * 9 + i)); ctx.lineTo(x + tw.w + 1, top - 2); ctx.closePath(); ctx.fill()
      for (let i = 0; i < 5; i++) sbFire(ctx, x + tw.w * (0.1 + 0.2 * i), top + 20, 16, t + i)
    }
    for (const ho of tw.holes) {
      // holes land in the part of the tower the camera sees (between the shop roofs and the top of the screen)
      const hx = x + tw.w * ho.u, hy = shopTop - 30 - ho.v * 300
      if (hy < top + 10) continue
      const fresh = Math.max(0, 1 - (t - ho.t0) / 0.5)
      ctx.fillStyle = "#050307"; ctx.beginPath()
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28, rr = ho.r * (0.65 + 0.5 * _h(ho.seed * 11 + i)); i ? ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) : ctx.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(255,120,40,0.55)"; ctx.lineWidth = 2; ctx.stroke()
      ctx.strokeStyle = "rgba(10,10,14,0.9)"; ctx.lineWidth = 1.2; ctx.beginPath()          // cracks running out of it
      for (let i = 0; i < 5; i++) { const a = _h(ho.seed * 3 + i) * 6.28, l = ho.r * (1.4 + _h(ho.seed + i)); ctx.moveTo(hx + Math.cos(a) * ho.r * 0.8, hy + Math.sin(a) * ho.r * 0.8); ctx.lineTo(hx + Math.cos(a + 0.3) * l, hy + Math.sin(a + 0.3) * l); ctx.lineTo(hx + Math.cos(a) * l * 1.5, hy + Math.sin(a) * l * 1.5) }
      ctx.stroke()
      sbFire(ctx, hx, hy + ho.r * 0.45, ho.r * 0.45, t + ho.seed)
      for (let i = 0; i < 4; i++) {                                   // smoke rising from it
        const ph = (t * 0.18 + i / 4 + _h(ho.seed)) % 1
        ctx.fillStyle = `rgba(40,36,40,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(hx + Math.sin(ph * 4 + i) * 14 + ph * 30, hy - ph * 260, ho.r * (0.5 + ph * 1.4), 0, 7); ctx.fill()
      }
      if (fresh > 0) { ctx.fillStyle = `rgba(255,220,140,${fresh})`; ctx.beginPath(); ctx.arc(hx, hy, ho.r * (1.6 - fresh * 0.6), 0, 7); ctx.fill() }
    }
  }
  for (const d of SB.debris) {                                         // chunks falling off the towers
    ctx.fillStyle = "#4a4650"; ctx.fillRect(d.x + st - d.s / 2, shopTop - 30 - d.hv * 300 + d.y, d.s, d.s * 0.8)
  }
  // the shop row (the sheet's market street, at night), tiled + mirrored; broken glass + blood on it
  const sp = shift(SB_SHOP_P, W), sw = P.shops.w * SB_SHOP_SC, sh = P.shops.h * SB_SHOP_SC, im = c.img[P.shops.file]
  if (ready(im)) {
    const k0 = Math.floor((padL - sp) / sw) - 1, k1 = Math.ceil((padR - sp) / sw)
    for (let k = k0; k <= k1; k++) {
      const x = Math.floor(sp + k * sw)
      if (k % 2) { ctx.save(); ctx.translate(x + sw, shopTop); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, Math.ceil(sw) + 1, sh); ctx.restore() }
      else ctx.drawImage(im, x, shopTop, Math.ceil(sw) + 1, sh)
    }
    const dark = Math.min(0.4, SB.total / 5000)              // night; the street dims further as the power goes
    { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(padL, shopTop, padR - padL, sh) }
  }
  ctx.strokeStyle = "rgba(220,235,255,0.75)"; ctx.lineWidth = 1.2
  for (const k of SB.cracks) {
    const x = k.x + sp, y = shopTop + sh * k.y
    if (x < padL - 80 || x > padR + 80) continue
    ctx.fillStyle = "rgba(10,10,20,0.55)"; ctx.beginPath(); ctx.arc(x, y, k.r * 0.35, 0, 7); ctx.fill()
    ctx.beginPath()
    for (let i = 0; i < 9; i++) { const a = _h(k.seed * 7 + i) * 6.28; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * k.r * 0.6, y + Math.sin(a) * k.r * 0.6); ctx.lineTo(x + Math.cos(a + 0.2) * k.r, y + Math.sin(a + 0.2) * k.r) }
    ctx.stroke()
  }
  for (const b of SB.wall) { const x = b.x + sp; if (x < padL || x > padR) continue; ctx.fillStyle = "rgba(120,0,10,0.85)"; ctx.beginPath(); ctx.ellipse(x, b.y, b.s, b.s * 0.8, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 0.7, b.y, 1.4, b.s * 3) }
}
function sbTowerBody(ctx, tw, x, top, w, h, t, falling) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#2a2a3c"); g.addColorStop(0.7, "#35344a"); g.addColorStop(1, "#1c1c28")
  ctx.fillStyle = g; ctx.fillRect(x, top, w, h)
  const lightsOut = Math.min(0.9, tw.dmg * 0.6 + SB.total / 5000)
  for (let yy = 14; yy < h - 10; yy += 16) for (let xx = 8; xx < w - 10; xx += 13) {
    const k = _h(tw.i * 7919 + Math.floor(yy) * 31 + xx)
    if (k < 0.3 + lightsOut * 0.5) continue
    ctx.fillStyle = k > 0.93 ? "#ffe6a8" : k > 0.8 ? "#d9b878" : "#6a6a88"; ctx.fillRect(x + xx, top + yy, 6, 8)
  }
  if (tw.neon && !falling) {                                          // a vertical neon sign down the side
    const on = tw.dmg < 0.6 || Math.sin(t * 23 + tw.i) > 0.3, col = ["#ff3aa0", "#38e8ff", "#ffd23a", "#9a5bff"][tw.i % 4]
    ctx.fillStyle = on ? col : "#2a2a33"; ctx.globalAlpha = on ? 0.9 : 1; ctx.fillRect(x + w - 20, top + 40, 12, Math.min(220, h * 0.4)); ctx.globalAlpha = 1
    ctx.fillStyle = "#0b0b12"; for (let i = 0; i < 6; i++) ctx.fillRect(x + w - 18, top + 50 + i * 34, 8, 3)
  }
  if (tw.screen && !falling && h > 200) {                             // the big video screen
    const sx = x + w * 0.12, sy = top + 60, sw = w * 0.7, sh = Math.min(90, sw * 0.55)
    if (tw.dmg < 0.5) {
      const hue = (t * 40 + tw.i * 90) % 360
      const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh); sg.addColorStop(0, `hsl(${hue},80%,55%)`); sg.addColorStop(1, `hsl(${(hue + 120) % 360},80%,35%)`)
      ctx.fillStyle = sg; ctx.fillRect(sx, sy, sw, sh)
      ctx.fillStyle = "rgba(0,0,0,0.25)"; for (let y = sy; y < sy + sh; y += 3) ctx.fillRect(sx, y, sw, 1)
    } else if (tw.dmg < 0.9) {
      for (let i = 0; i < 40; i++) { const v = Math.floor(_h(i + Math.floor(t * 20) * 97) * 200); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(sx + _h(i * 3 + Math.floor(t * 20)) * sw, sy + _h(i * 5) * sh, sw / 8, 3) }
    } else { ctx.fillStyle = "#050508"; ctx.fillRect(sx, sy, sw, sh); ctx.strokeStyle = "#555"; ctx.beginPath(); ctx.moveTo(sx + sw * 0.3, sy); ctx.lineTo(sx + sw * 0.5, sy + sh * 0.6); ctx.lineTo(sx + sw * 0.8, sy + sh); ctx.stroke() }
  }
  ctx.fillStyle = "#08080c"; ctx.fillRect(x, top, w, 4)
}
function sbFire(ctx, x, y, r, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * r * 0.45, fh = r * (1.4 + 0.9 * Math.abs(Math.sin(t * (6 + i) + i * 1.7))), fw = r * 0.5
    const g = ctx.createLinearGradient(0, y, 0, y - fh); g.addColorStop(0, "rgba(255,230,150,0.75)"); g.addColorStop(0.45, "rgba(255,120,30,0.55)"); g.addColorStop(1, "rgba(200,30,10,0)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + ox - fw, y); ctx.quadraticCurveTo(x + ox - fw * 0.6 + Math.sin(t * 8 + i) * fw * 0.5, y - fh * 0.6, x + ox + Math.sin(t * 5 + i) * fw * 0.6, y - fh)
    ctx.quadraticCurveTo(x + ox + fw * 0.6, y - fh * 0.5, x + ox + fw, y); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

// FX (after the street): craters, blood pools, the dead, and the living crowd — all behind the fighters
function shibuyaFx(ctx, def, c, { dockTop, padL, padR, coverBottom }) {
  const bot = dockTop + c.layout.pieces.street.h * def.S              // the road carries on toward the viewer
  if (coverBottom > bot) { const g = ctx.createLinearGradient(0, bot, 0, coverBottom); g.addColorStop(0, "#1c1c24"); g.addColorStop(1, "#07070a"); ctx.fillStyle = g; ctx.fillRect(padL, bot, padR - padL, coverBottom - bot); ctx.fillStyle = "#3a3a46"; ctx.fillRect(padL, bot, padR - padL, 3) }
  const yG = SB.yG || 0; if (!yG) return
  for (const k of SB.craters) {
    if (k.x < padL - 100 || k.x > padR + 100) continue
    ctx.fillStyle = k.scorch ? "rgba(10,6,6,0.75)" : "rgba(6,6,10,0.85)"; ctx.beginPath(); ctx.ellipse(k.x, yG + 14, k.r * 1.5, k.r * 0.35, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = "rgba(90,90,110,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath()
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; ctx.moveTo(k.x + Math.cos(a) * k.r * 1.2, yG + 14 + Math.sin(a) * k.r * 0.3); ctx.lineTo(k.x + Math.cos(a) * k.r * 2.3, yG + 14 + Math.sin(a) * k.r * 0.55) }
    ctx.stroke()
  }
  for (const p of SB.pools) {
    if (p.x < padL - 100 || p.x > padR + 100) continue
    ctx.fillStyle = "rgba(95,0,8,0.9)"; ctx.beginPath(); ctx.ellipse(p.x, yG + 10, p.r, p.r * 0.28, 0, 0, 7); ctx.fill()
    ctx.fillStyle = "rgba(200,40,50,0.35)"; ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.25, yG + 9, p.r * 0.4, p.r * 0.08, 0, 0, 7); ctx.fill()
  }
  for (const pc of SB.rest) if (pc.x > padL - 120 && pc.x < padR + 120) drawPiece(ctx, pc)
  for (const pd of SB.peds) {
    const { im, w, h } = pedSprite(pd)
    if (pd.x + w < padL || pd.x - w > padR || !(ready(im) || im.getContext)) continue
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(pd.x, yG, w * 0.35, 4, 0, 0, 7); ctx.fill()
    ctx.save(); ctx.translate(pd.x, yG); if (pd.dir < 0) ctx.scale(-1, 1)
    if (pd.down > 0) { ctx.rotate(-Math.PI / 2 * Math.min(1, (0.9 - pd.down) * 8)); ctx.translate(0, Math.min(1, (0.9 - pd.down) * 8) * w * 0.3) }
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore()
  }
}

// FRONT: update, then the flying pieces / blood / glass over the fighters
function shibuyaFront(ctx, def, c, W, groundY, world) {
  sbUpdate(c, W, groundY, world)
  for (const pc of SB.pieces) drawPiece(ctx, pc)
  ctx.fillStyle = "#a00010"
  for (const b of SB.blood) ctx.fillRect(b.x - b.s / 2, b.y - b.s / 2, b.s, b.s)
  ctx.fillStyle = "rgba(200,230,255,0.85)"
  for (const g of SB.glass) ctx.fillRect(g.x, g.y, g.s, g.s * 0.6)
}
// harness / debugging: what the street has seen so far
export function shibuyaStats() { return { peds: SB.peds.length, pieces: SB.pieces.length, dead: SB.rest.length, blood: SB.blood.length, pools: SB.pools.length, holes: (SB.towers || []).reduce((n, t) => n + t.holes.length, 0), fallen: (SB.towers || []).filter(t => t.fall).length, total: SB.total, spared: SB.spared } }

// harness hook: put a bystander standing still at world x; kill one with a named cause; read the counters
export const shibuyaDebug = {
  stats: shibuyaStats,
  ped(x) { const seq = SB.seq++; SB.peds.push({ kind: "ped", seed: seq * 977 + 13, x, dir: 1, speed: 0, t: 0, freeze: true, panic: 0, held: true, frames: pedFrames(seq * 977 + 13), sc: 1 }); return SB.peds.length },
  kill(cause, rosterKey = "") { const pd = SB.peds.find(p => !p.dead); if (!pd) return null; const n = SB.pieces.length; sbKill(pd, cause, pd.x - 50, rosterKey); return SB.pieces.length - n },
}

// ───────────────────────────── JUJUTSU HIGH (render-only, wall clock) ─────────────────────────────
// Ryu's rooftop sheet rebuilt as Tokyo Jujutsu High at dusk: wooded hills, the main hall up among the cedars, a
// vermilion torii, school eaves, stone lanterns, maple leaves falling. A crowd watches from the back of the deck:
// the JJK students and teachers in their own colours, plus visitors from the rest of the multiverse wearing one of
// their skins — drawn from the game's own idle sprites (the two fighters in the match are left out of the crowd).
const JJ_CROWD = [
  // [key, place, skin] — visitors wear a skin whose every sheet exists on disk (some recolour skins have art missing)
  ["yuji", 0.08, 0], ["naruto", 0.15, "naruto_red"], ["megumi_fushiguro", 0.22, 0], ["killua", 0.29, "killua_brownhair"], ["maki", 0.36, 0],
  ["ichigo", 0.43, "ichigoFrostShinigami"], ["gojo", 0.52, 0], ["luffy", 0.6, "luffy_ace"], ["aoi_todo", 0.67, 0], ["zenitsu", 0.74, "zenitsuValkyrie"],
  ["miwa", 0.81, 0], ["goku", 0.87, 0], ["yuta", 0.93, 0],
]
let _lastWorld = null
// a reactive crowd of real fighter sprites (shared by Jujutsu High and the World Tournament)
function makeCrowd(list, scale = 0.6) { return { list, scale, sprites: null, loading: false, last: 0, hp: new WeakMap() } }
const JJ = makeCrowd(JJ_CROWD)
function loadCrowd(CR) {
  if (CR.loading) return; CR.loading = true
  Promise.all([import("./characters.js"), import("./skins.js")]).then(([C, Sk]) => {
    const chars = C.characters || {}, out = []
    for (const [key, fx, visitor] of CR.list) {
      const ch = chars[key]; if (!ch) continue
      const skin = visitor ? (Sk.getSkins?.(key) || []).find(s => s && s.id === visitor && s.animationData?.idle?.sheet) || null : null
      const anims = {}
      for (const a of ["idle", "walk", "jump", "guard", "win"]) {
        const d = skin?.animationData?.[a] || ch.animationData?.[a]
        if (!d?.sheet || typeof d.frames !== "number" || !d.width || !d.height) continue
        const im = new Image(); im.src = d.sheet; anims[a] = { d, im }
      }
      if (!anims.idle) continue
      out.push({ key, fx, idle: anims.idle.d, im: anims.idle.im, anims, skin: skin?.id || "default", sc: (skin?.spriteScale || ch.spriteScale || 1) * 1.18 * CR.scale,
        off: 0, mood: "idle", hop: 0, bubble: null, bubbleT: 0, seed: Math.floor(fx * 1000) })
    }
    CR.sprites = out
  }).catch(() => { CR.sprites = [] })
}
const crowdState = CR => (CR.sprites || []).map(s => ({ key: s.key, skin: s.skin, ready: ready(s.im), shown: !!s.shown, mood: s.mood, anim: s.drawn, off: Math.round(s.off), bubble: s.bubbleT > 0 ? s.bubble : null }))
export const jujutsuCrowd = () => crowdState(JJ)

function drawJujutsuBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), P = c.layout.pieces, S = def.S
  const horizon = dockTop - 150
  const g = ctx.createLinearGradient(0, coverTop, 0, horizon); g.addColorStop(0, "#2a0a24"); g.addColorStop(1, "#6a1420")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, horizon - coverTop)
  // the sheet's sunset sky, wide, its bottom on the hills
  const sk = P.sky, sim = c.img[sk.file], sw = sk.w * S * 1.2, sh = sk.h * S * 1.2, sy = horizon + 40 - sh, ss = shift(0.08, W)
  if (ready(sim)) for (let k = Math.floor((padL - ss) / sw) - 1, x; (x = ss + k * sw) < padR; k++) {
    if (k % 2) { ctx.save(); ctx.translate(Math.floor(x) + sw, sy); ctx.scale(-1, 1); ctx.drawImage(sim, 0, 0, Math.ceil(sw) + 1, sh); ctx.restore() }
    else ctx.drawImage(sim, Math.floor(x), sy, Math.ceil(sw) + 1, sh)
  }
  ctx.fillStyle = "#f0a050"; ctx.fillRect(padL, horizon + 38, padR - padL, dockTop - horizon)
  // hills: two ridges, then rows of cedars with the sunset on their tips
  const ridge = (p, base, amp, col, seed, step) => {
    const sh2 = shift(p, W); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(padL, dockTop)
    for (let x = padL - step; x <= padR + step; x += step) { const wx = Math.floor((x - sh2) / step); ctx.lineTo(x - ((x - sh2) % step), base - amp * (0.5 + 0.5 * Math.sin(wx * 0.37 + seed)) * (0.6 + 0.4 * _h(wx + seed))) }
    ctx.lineTo(padR, dockTop); ctx.closePath(); ctx.fill()
  }
  ridge(0.12, horizon + 20, 170, "#5a2440", 1, 60); ridge(0.2, horizon + 50, 120, "#3a1a34", 7, 44)
  const cedars = (p, base, hgt, col, tip, seed) => {
    const sh2 = shift(p, W), step = 26, k0 = Math.floor((padL - sh2) / step) - 1, k1 = Math.ceil((padR - sh2) / step) + 1
    for (let k = k0; k <= k1; k++) {
      const x = sh2 + k * step, h = hgt * (0.7 + 0.5 * _h(k * 13 + seed)), w = 40 + 18 * _h(k * 7 + seed), b = base + 10 * _h(k + seed)
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, b); ctx.lineTo(x, b - h); ctx.lineTo(x + w / 2, b); ctx.closePath(); ctx.fill()
      ctx.fillStyle = tip; ctx.beginPath(); ctx.moveTo(x - w * 0.12, b - h * 0.8); ctx.lineTo(x, b - h); ctx.lineTo(x + w * 0.05, b - h * 0.8); ctx.closePath(); ctx.fill()
    }
  }
  cedars(0.25, horizon + 90, 150, "#1e2a24", "rgba(255,150,90,0.5)", 3)
  // the main hall up on the hill among the trees, smaller halls either side
  const hall = P.hall, him = c.img[hall.file]
  if (ready(him)) for (const [fx, sc, p] of [[0.5, 3.4, 0.3], [0.18, 2.2, 0.26], [0.84, 2.2, 0.26]]) {
    const w = hall.w * sc, h = hall.h * sc, x = W * fx + shift(p, W) - w / 2
    ctx.drawImage(him, Math.floor(x), horizon + 110 - h, w, h)
    for (let i = 0; i < 5; i++) { const lx = x + w * (0.2 + 0.15 * i); ctx.fillStyle = `rgba(255,200,110,${0.55 + 0.2 * Math.sin(t * 2 + i)})`; ctx.fillRect(lx, horizon + 110 - h * 0.3, 6, 8) }
  }
  cedars(0.38, horizon + 150, 190, "#182018", "rgba(255,140,80,0.45)", 11)
  // the torii on the path up to the hall
  { const p = 0.45, x = W * 0.33 + shift(p, W), b = dockTop - 70, h = 200, w = 170
    ctx.fillStyle = "#c8341e"; ctx.fillRect(x - w * 0.36, b - h, 18, h); ctx.fillRect(x + w * 0.36 - 18, b - h, 18, h)
    ctx.fillRect(x - w * 0.46, b - h * 0.82, w * 0.92, 14)
    ctx.fillStyle = "#1a1012"; ctx.beginPath(); ctx.moveTo(x - w * 0.6, b - h - 4); ctx.quadraticCurveTo(x, b - h + 10, x + w * 0.6, b - h - 4); ctx.lineTo(x + w * 0.56, b - h + 14); ctx.quadraticCurveTo(x, b - h + 26, x - w * 0.56, b - h + 14); ctx.closePath(); ctx.fill()
    ctx.fillStyle = "#c8341e"; ctx.fillRect(x - w * 0.5, b - h + 18, w, 10)
    ctx.fillStyle = "#1a1012"; ctx.fillRect(x - w * 0.36 - 3, b - 16, 24, 16); ctx.fillRect(x + w * 0.36 - 21, b - 16, 24, 16) }
  // school eaves at the sides (the sheet's roof corner), nearer
  const ev = P.eave, eim = c.img[ev.file]
  if (ready(eim)) for (const [fx, flip] of [[0.06, true], [0.94, false], [-0.2, true], [1.2, false]]) {
    const sc = 1.7, w = ev.w * sc, h = ev.h * sc, x = W * fx + shift(0.65, W) - w / 2, y = dockTop + 2 - h
    if (flip) { ctx.save(); ctx.translate(Math.floor(x) + w, y); ctx.scale(-1, 1); ctx.drawImage(eim, 0, 0, w, h); ctx.restore() } else ctx.drawImage(eim, Math.floor(x), y, w, h)
  }
  // stone lanterns
  for (const fx of [0.3, 0.42, 0.58, 0.7]) {
    const x = W * fx + shift(0.75, W), b = dockTop - 30
    ctx.fillStyle = "#6a6266"; ctx.fillRect(x - 6, b - 60, 12, 60); ctx.fillRect(x - 16, b - 6, 32, 6); ctx.fillRect(x - 14, b - 84, 28, 24)
    ctx.fillStyle = `rgba(255,190,100,${0.7 + 0.2 * Math.sin(t * 3 + fx * 10)})`; ctx.fillRect(x - 7, b - 78, 14, 12)
    ctx.fillStyle = "#4a4448"; ctx.beginPath(); ctx.moveTo(x - 24, b - 84); ctx.lineTo(x, b - 104); ctx.lineTo(x + 24, b - 84); ctx.closePath(); ctx.fill()
  }
  // maple leaves drifting down
  for (let i = 0; i < 26; i++) {
    const ph = (t * (0.05 + 0.04 * _h(i)) + _h(i + 9)) % 1, x = padL + ((_h(i + 3) * (padR - padL) + t * 20 + Math.sin(t + i) * 30) % (padR - padL)), y = coverTop + ph * (dockTop - coverTop + 60)
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.fillStyle = i % 3 ? "#d8442a" : "#f0902a"; ctx.fillRect(-3, -2, 6, 4); ctx.restore()
  }
}

function jujutsuFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now()
  // the deck's front edge (the sheet's trim), then the gravel courtyard below it
  const bot = dockTop + P.floor.h * S, tr = P.trim, tim = c.img[tr.file], tw = tr.w * S, ts = shift(def.floor.rimFactor, W)
  if (coverBottom > bot) {
    const g = ctx.createLinearGradient(0, bot, 0, coverBottom); g.addColorStop(0, "#4a3a2c"); g.addColorStop(1, "#1e160f")
    ctx.fillStyle = g; ctx.fillRect(padL, bot, padR - padL, coverBottom - bot)
    for (let i = 0; i < 260; i++) { const x = padL + _h(i * 3 + 1) * (padR - padL), y = bot + 30 + _h(i * 3 + 2) * (coverBottom - bot); ctx.fillStyle = i % 2 ? "rgba(140,120,100,0.5)" : "rgba(20,14,10,0.5)"; ctx.fillRect(x, y, 3, 2) }
  }
  if (ready(tim)) for (let k = Math.floor((padL - ts - W / 2) / tw) - 1; ts + W / 2 + k * tw < padR; k++) ctx.drawImage(tim, Math.floor(ts + W / 2 + k * tw), bot, Math.ceil(tw) + 1, tr.h * S)
  // the boards: the school's name, and the crowd's cheer
  const b = P.sign, w = b.w * S, h = b.h * S
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (const [fx, text] of [[0.36, "呪術高専"], [0.64, "東京校"]]) {
    const x = fx * W - w / 2 + shift(rowFactor(def, 3), W), y = dockTop + 3 * S - h
    const [px0, py0, px1, py1] = b.paper, cx = x + (px0 + px1) / 2 * S, n = text.length, cell = (py1 - py0) * S / n
    ctx.fillStyle = "#1a1010"; ctx.font = `900 ${Math.floor(Math.min(cell * 0.86, (px1 - px0) * S * 0.86))}px 'Hiragino Mincho ProN','Noto Serif JP',serif`
    for (let i = 0; i < n; i++) ctx.fillText(text[i], cx, y + py0 * S + cell * (i + 0.5))
  }
  ctx.restore()
  // the crowd watching from the back of the deck — and reacting to the fight
  drawCrowd(ctx, JJ, { W, feet: dockTop + 1 * S, sh: shift(rowFactor(def, 1), W) })
}

// ───────────────────────────── THE ARMOR LAB (render-only, wall clock) ─────────────────────────────
// Guile's air base rebuilt as a billionaire inventor's workshop under a cliff-top house: the night ocean through the
// window wall, a gallery of armored suits in glass pods (original designs, drawn here), floating holograms, a reactor
// core, a half-built suit on a gantry with two robot arms welding it, helper bots rolling around, and the prototype
// jet on its lift. The lab reacts: big hits glitch the holograms and spark the arms, a fighter close to dying sets
// off the red alert, a knockout lights every suit's eyes.
const LAB = { last: 0, hp: new WeakMap(), glitch: 0, flash: 0, alert: false, sparks: [], bots: null }
const SUITS = [
  ["MK I", "#b3121c", "#e0b030", 1], ["MK II", "#b8bec8", "#6a7280", 1], ["MK III", "#1c1e24", "#3a3f4a", 1],
  ["MK IV", "#5a5e66", "#d08a20", 1.25], ["MK V", "#e8ecf0", "#3a7ad8", 1], ["MK VI", "#d8a830", "#8a1a12", 1],
]
const _suitCache = new Map()
function suitSprite(i, partial = false) {
  const k = i + (partial ? "p" : ""); if (_suitCache.has(k)) return _suitCache.get(k)
  const [, A, B, bulk] = SUITS[i], px = 3, GW = 22, GH = 40, cv = document.createElement("canvas"); cv.width = GW * px; cv.height = GH * px
  const g = cv.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * px), y * px, Math.round(w * px), h * px) }
  const cx = 11, wb = bulk
  R(cx - 3, 1, 6, 6, A); R(cx - 2, 3, 4, 3, B); R(cx - 2, 4, 4, 1, "#e8fbff")            // helmet, faceplate, eye slit
  R(cx - 1.5, 7, 3, 1, "#2a2d34")
  R(cx - 5 * wb, 8, 10 * wb, 10, A); R(cx - 3.5 * wb, 10, 7 * wb, 5, B); R(cx - 1, 11, 2, 2, "#bff6ff")   // torso, chest plate, core
  R(cx - 7 * wb, 8, 3 * wb, 3, B); R(cx + 4 * wb, 8, 3 * wb, 3, B)                         // shoulders
  if (!partial) {
    R(cx - 7 * wb, 11, 2 * wb, 10, A); R(cx + 5 * wb, 11, 2 * wb, 10, A)                  // arms + gauntlets
    R(cx - 7 * wb, 19, 2 * wb, 3, B); R(cx + 5 * wb, 19, 2 * wb, 3, B)
  }
  for (let y = 18; y < 22; y += 2) R(cx - 4 * wb, y, 8 * wb, 1, B)                      // segmented abdomen
  R(cx - 4 * wb, 18, 8 * wb, 4, "rgba(0,0,0,0.15)")
  R(cx - 4 * wb, 22, 3.5 * wb, 14, A); R(cx + 0.5 * wb, 22, 3.5 * wb, 14, A)             // legs
  R(cx - 4 * wb, 28, 3.5 * wb, 2, B); R(cx + 0.5 * wb, 28, 3.5 * wb, 2, B)                 // knee plates
  R(cx - 4.5 * wb, 36, 4.5 * wb, 3, B); R(cx, 36, 4.5 * wb, 3, B)                          // boots
  g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect((cx - 5 * wb) * px, 8 * px, 2 * px, 10 * px)   // edge highlight
  _suitCache.set(k, cv); return cv
}
function labGlow(ctx, x, y, r, rgb, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2) }

function drawLabBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S, floorY = dockTop + 4
  // what the lab sees (from the fighters, handed over by the front pass)
  const dt = Math.min(0.05, Math.max(0, t - (LAB.last || t))); LAB.last = t
  const F = (_lastWorld?.fighters || []).filter(Boolean); let ko = false; LAB.alert = false
  for (const f of F) {
    const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = LAB.hp.get(f); LAB.hp.set(f, hp)
    if (was != null && was - hp >= 60) { LAB.glitch = 0.45; for (let i = 0; i < 24; i++) LAB.sparks.push({ x: 0, y: 0, arm: i % 2, vx: (_h(i + t) - 0.5) * 300, vy: -100 - 200 * _h(i * 3 + t), life: 0.6 }) }
    if (hp <= 0) ko = true; else if (hp / max <= 0.2) LAB.alert = true
  }
  if (ko) LAB.flash = 1.2
  LAB.glitch = Math.max(0, LAB.glitch - dt); LAB.flash = Math.max(0, LAB.flash - dt)
  // back wall + the window band onto the night ocean
  const wallTop = coverTop, winTop = dockTop - 340, winBot = dockTop - 215
  const wg = ctx.createLinearGradient(0, wallTop, 0, floorY); wg.addColorStop(0, "#0c0f16"); wg.addColorStop(1, "#1c222e")
  ctx.fillStyle = wg; ctx.fillRect(padL, wallTop, padR - padL, floorY - wallTop)
  const og = ctx.createLinearGradient(0, winTop, 0, winBot); og.addColorStop(0, "#050a1a"); og.addColorStop(0.55, "#0e1c38"); og.addColorStop(0.56, "#0a1830"); og.addColorStop(1, "#06101f")
  ctx.fillStyle = og; ctx.fillRect(padL, winTop, padR - padL, winBot - winTop)
  const sw = shift(0.06, W), horizonY = winTop + (winBot - winTop) * 0.55
  ctx.fillStyle = "#f2efe0"; ctx.beginPath(); ctx.arc(W * 0.3 + sw, winTop + 40, 16, 0, 7); ctx.fill(); labGlow(ctx, W * 0.3 + sw, winTop + 40, 60, "220,220,255", 0.25)
  for (let i = 0; i < 70; i++) { const x = padL + _h(i * 5) * (padR - padL), y = winTop + _h(i * 5 + 1) * (horizonY - winTop - 6); ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`; ctx.fillRect(x, y, 1, 1) }
  for (let i = 0; i < 40; i++) { const x = W * 0.3 + sw + (_h(i * 7) - 0.5) * 60 + Math.sin(t * 1.5 + i) * 6, y = horizonY + 3 + i * 2.2; ctx.fillStyle = `rgba(230,230,255,${0.4 - i * 0.009})`; ctx.fillRect(x, y, 6 + _h(i) * 14, 1) }   // moon on the water
  for (let i = 0; i < 30; i++) { const x = padL + ((_h(i * 13) * (padR - padL) + t * 8 * (1 + i % 3)) % (padR - padL)), y = horizonY + 6 + _h(i * 13 + 4) * (winBot - horizonY - 8); ctx.fillStyle = "rgba(120,160,220,0.18)"; ctx.fillRect(x, y, 10, 1) }
  const fw = 220, fs = shift(0.5, W), k0 = Math.floor((padL - fs) / fw) - 1                                           // window mullions
  ctx.fillStyle = "#2a313e"; for (let k = k0; fs + k * fw < padR + fw; k++) ctx.fillRect(fs + k * fw, winTop, 8, winBot - winTop)
  ctx.fillRect(padL, winTop - 10, padR - padL, 12); ctx.fillRect(padL, winBot, padR - padL, 14)
  ctx.fillStyle = "rgba(255,255,255,0.04)"; for (let k = k0; fs + k * fw < padR + fw; k++) { ctx.beginPath(); ctx.moveTo(fs + k * fw + 30, winTop); ctx.lineTo(fs + k * fw + 90, winTop); ctx.lineTo(fs + k * fw + 40, winBot); ctx.lineTo(fs + k * fw - 20, winBot); ctx.fill() }
  // wall panels + light strips under the window
  const ps = shift(0.6, W)
  for (let k = Math.floor((padL - ps) / 160) - 1; ps + k * 160 < padR; k++) { ctx.strokeStyle = "rgba(120,140,170,0.12)"; ctx.strokeRect(ps + k * 160, winBot + 14, 160, floorY - winBot - 14) }
  ctx.fillStyle = LAB.alert && Math.sin(t * 10) > 0 ? "rgba(255,60,50,0.85)" : "rgba(90,220,255,0.75)"; ctx.fillRect(padL, winBot + 16, padR - padL, 3)
  // the reactor core on the wall
  { const x = W * 0.5 + shift(0.55, W), y = dockTop - 150, pulse = 0.75 + 0.25 * Math.sin(t * 3)
    labGlow(ctx, x, y, 130 * pulse, "90,220,255", 0.35)
    ctx.strokeStyle = "#3a4250"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(x, y, 58, 0, 7); ctx.stroke()
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + t * 0.4; ctx.strokeStyle = "rgba(160,240,255,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 44, a, a + 0.4); ctx.stroke() }
    ctx.fillStyle = `rgba(230,252,255,${pulse})`; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill() }
  // the suit gallery: glass pods along the wall
  const gs = shift(0.62, W)
  SUITS.forEach((su, i) => {
    const fx = [0.64, 0.7, 0.76, 0.82, 0.88, 0.94][i], x = W * fx + gs, base = floorY - 6, im = suitSprite(i), sc = 1.15, w = im.width * sc, h = im.height * sc
    if (x < padL - 120 || x > padR + 120) return
    ctx.fillStyle = "#2a2f3a"; ctx.fillRect(x - 46, base - 14, 92, 14); ctx.fillStyle = "rgba(120,220,255,0.8)"; ctx.fillRect(x - 40, base - 16, 80, 3)
    labGlow(ctx, x, base - 20, 70, "120,210,255", 0.25)
    ctx.drawImage(im, Math.round(x - w / 2), Math.round(base - 16 - h), w, h)
    const eyes = LAB.flash > 0 ? Math.min(1, LAB.flash * 2) : 0.35 + 0.15 * Math.sin(t * 2 + i)
    labGlow(ctx, x, base - 16 - h + 13 * sc, 26, "200,250,255", eyes)
    ctx.strokeStyle = "rgba(170,220,255,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(x - 42, base - 16 - h - 16, 84, h + 16)      // the glass case
    ctx.fillStyle = "rgba(170,220,255,0.06)"; ctx.fillRect(x - 42, base - 16 - h - 16, 84, h + 16)
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x - 34, base - 16 - h - 10, 5, h)
    ctx.fillStyle = "#c8d4e4"; ctx.font = "700 10px monospace"; ctx.textAlign = "center"; ctx.fillText(su[0], x, base - 3); ctx.textAlign = "start"
  })
  // holograms floating over the benches
  for (const [fx, wdt, hgt, kind] of [[0.42, 120, 80, "helmet"], [0.58, 120, 80, "suit"], [0.5, 110, 46, "graph"]]) {
    const gl = LAB.glitch > 0, x = W * fx + shift(0.7, W) + (gl ? (_h(Math.floor(t * 40)) - 0.5) * 18 : 0), y = (kind === "graph" ? dockTop - 52 : dockTop - 70) + Math.sin(t + fx * 9) * 4
    const col = LAB.alert ? "255,90,80" : gl ? "255,140,200" : "110,225,255"
    ctx.fillStyle = `rgba(${col},0.10)`; ctx.fillRect(x - wdt / 2, y - hgt, wdt, hgt); ctx.strokeStyle = `rgba(${col},0.7)`; ctx.lineWidth = 1.2; ctx.strokeRect(x - wdt / 2, y - hgt, wdt, hgt)
    ctx.strokeStyle = `rgba(${col},0.85)`; ctx.fillStyle = `rgba(${col},0.85)`
    if (LAB.flash > 0) { ctx.font = "900 34px Arial"; ctx.textAlign = "center"; ctx.fillText("K.O.", x, y - hgt / 2 + 12); ctx.textAlign = "start" }
    else if (LAB.alert && Math.sin(t * 6) > -0.3) { ctx.font = "900 20px Arial"; ctx.textAlign = "center"; ctx.fillText("⚠ ALERT", x, y - hgt / 2 + 8); ctx.textAlign = "start" }
    else if (kind === "graph") { ctx.beginPath(); for (let i = 0; i <= 20; i++) { const gx = x - wdt / 2 + 8 + i * (wdt - 16) / 20, gy = y - hgt / 2 + Math.sin(t * 3 + i * 0.7) * hgt * 0.3; i ? ctx.lineTo(gx, gy) : ctx.moveTo(gx, gy) } ctx.stroke()
      for (let i = 0; i < 5; i++) ctx.fillRect(x - wdt / 2 + 10 + i * 22, y - 8 - 30 * Math.abs(Math.sin(t * 2 + i)), 12, 30 * Math.abs(Math.sin(t * 2 + i))) }
    else { const cxh = x - wdt * 0.15, cyh = y - hgt / 2, sq = Math.cos(t * 1.2)                     // rotating wireframe
      if (kind === "helmet") { ctx.beginPath(); ctx.ellipse(cxh, cyh, 26 * Math.abs(sq) + 4, 32, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cxh - 20 * sq, cyh - 4); ctx.lineTo(cxh + 20 * sq, cyh - 4); ctx.stroke(); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(cxh, cyh, (26 * Math.abs(sq) + 4) * Math.abs(Math.cos(k * 0.5)), 32, 0, 0, 7); ctx.stroke() } }
      else { ctx.strokeRect(cxh - 10 * Math.abs(sq) - 2, cyh - 30, 20 * Math.abs(sq) + 4, 12); ctx.strokeRect(cxh - 16 * Math.abs(sq) - 2, cyh - 16, 32 * Math.abs(sq) + 4, 22); ctx.strokeRect(cxh - 12 * Math.abs(sq) - 2, cyh + 8, 24 * Math.abs(sq) + 4, 26) }
      ctx.font = "9px monospace"; for (let i = 0; i < 6; i++) ctx.fillText(((_h(i + Math.floor(t * 2)) * 1e6) | 0).toString(16).toUpperCase(), x + wdt * 0.12, y - hgt + 14 + i * 12) }
  }
  // the half-built suit on its gantry, two robot arms working on it
  { const x = W * 0.34 + shift(0.8, W), base = floorY - 2, im = suitSprite(0, true), sc = 1.25, w = im.width * sc, h = im.height * sc
    ctx.fillStyle = "#3a414e"; ctx.fillRect(x - 60, base - h - 50, 8, h + 50); ctx.fillRect(x + 52, base - h - 50, 8, h + 50); ctx.fillRect(x - 60, base - h - 50, 120, 8)
    ctx.drawImage(im, Math.round(x - w / 2), Math.round(base - h), w, h)
    for (const side of [-1, 1]) {
      const sx = x + side * 120, sy = base - h - 70, a1 = (side < 0 ? 0.6 : Math.PI - 0.6) + Math.sin(t * 2 + side) * 0.25 + (LAB.glitch > 0 ? Math.sin(t * 60) * 0.3 : 0)
      const ex = sx + Math.cos(a1) * 80, ey = sy + Math.sin(a1) * 80 + 30, tx2 = x + side * 22 + Math.sin(t * 3) * 6, ty2 = base - h * 0.55 + Math.cos(t * 2.5) * 10
      ctx.strokeStyle = "#8a93a3"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(tx2, ty2); ctx.stroke()
      ctx.strokeStyle = "#d0a030"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.fillStyle = "#2a2f3a"; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, 7); ctx.fill(); ctx.fillRect(sx - 14, sy - 10, 28, 12)
      if (Math.sin(t * 7 + side * 2) > 0.2) { labGlow(ctx, tx2, ty2, 22, "255,230,160", 0.8); for (let i = 0; i < 4; i++) { const ph = (t * 3 + i / 4 + side) % 1; ctx.fillStyle = `rgba(255,210,120,${1 - ph})`; ctx.fillRect(tx2 + (_h(i + Math.floor(t * 8)) - 0.5) * 40 * ph, ty2 + ph * 40, 2, 2) } }
      for (const sp of LAB.sparks) if (sp.arm === (side < 0 ? 0 : 1)) { if (sp.x === 0) { sp.x = tx2; sp.y = ty2 } }
    }
    ctx.lineCap = "butt" }
  for (const sp of LAB.sparks) { sp.life -= dt; sp.vy += 700 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; ctx.fillStyle = `rgba(255,220,130,${Math.max(0, sp.life / 0.6)})`; ctx.fillRect(sp.x, sp.y, 2, 2) }
  LAB.sparks = LAB.sparks.filter(s => s.life > 0)
  // workbenches + parts crates
  const cr = c.layout.pieces.crate, cim = c.img[cr.file], bs = shift(0.85, W)
  for (const fx of [0.44, 0.56]) { const x = W * fx + bs; ctx.fillStyle = "#3a414e"; ctx.fillRect(x - 70, floorY - 44, 140, 8); ctx.fillRect(x - 64, floorY - 36, 6, 36); ctx.fillRect(x + 58, floorY - 36, 6, 36)
    ctx.fillStyle = "#6a7282"; ctx.fillRect(x - 50, floorY - 52, 30, 8); ctx.fillStyle = "#d0a030"; ctx.fillRect(x + 10, floorY - 50, 18, 6); ctx.fillStyle = "rgba(120,220,255,0.7)"; ctx.fillRect(x - 6, floorY - 58, 12, 14) }
  if (ready(cim)) for (const fx of [0.05, 0.95, 1.05]) ctx.drawImage(cim, Math.round(W * fx + bs - cr.w * 0.7), floorY - cr.h * 1.4 + 2, cr.w * 1.4, cr.h * 1.4)
}

// floor fx: the arc-reactor ring set into the floor, helper bots behind the fighters
function labFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now(), ring = P.deck.ring
  if (ring) {
    const cx = W / 2 - P.deck.w * S / 2 + (ring[0] + ring[2] / 2) * S + shift(rowFactor(def, ring[1] + ring[3] / 2), W), cy = dockTop + (ring[1] + ring[3] / 2) * S
    const rx = ring[2] * S * 0.55, ry = ring[3] * S * 0.55, pulse = LAB.alert ? (Math.sin(t * 10) > 0 ? "255,70,60" : "120,30,30") : "110,230,255"
    ctx.strokeStyle = `rgba(${pulse},0.85)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.stroke()
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.6, ry * 0.6, 0, 0, 7); ctx.stroke()
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + t * 0.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rx * 0.62, cy + Math.sin(a) * ry * 0.62); ctx.lineTo(cx + Math.cos(a) * rx * 0.95, cy + Math.sin(a) * ry * 0.95); ctx.stroke() }
  }
  const bot = dockTop + P.deck.h * S
  if (coverBottom > bot) { const g = ctx.createLinearGradient(0, bot, 0, coverBottom); g.addColorStop(0, "#1a1f2a"); g.addColorStop(1, "#06080c"); ctx.fillStyle = g; ctx.fillRect(padL, bot, padR - padL, coverBottom - bot); ctx.fillStyle = "rgba(110,230,255,0.7)"; ctx.fillRect(padL, bot, padR - padL, 2) }
  // helper bots: roll around the back of the floor, get out of the way of the fighters
  if (!LAB.bots) LAB.bots = [{ x: W * 0.35, dir: 1 }, { x: W * 0.68, dir: -1 }]
  const F = (_lastWorld?.fighters || []).filter(Boolean), dt = 1 / 60, yb = dockTop + 8 * S
  for (const b of LAB.bots) {
    let flee = 0; for (const f of F) { const d = b.x - (f.x + (f.w || 50) / 2); if (Math.abs(d) < 150) flee = Math.sign(d) || 1 }
    if (flee) b.dir = flee                                             // keeps rolling the way it fled (no jitter at the edge)
    b.x += (flee ? flee * 150 : b.dir * 40) * dt; if (b.x < W * 0.1 || b.x > W * 0.9) b.dir *= -1, b.x = Math.max(W * 0.1, Math.min(W * 0.9, b.x))
    const x = b.x, arm = Math.sin(t * 3 + x) * 0.5 - (flee ? 0.9 : 0)
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x, yb, 22, 5, 0, 0, 7); ctx.fill()
    ctx.fillStyle = "#4a5262"; ctx.fillRect(x - 16, yb - 22, 32, 18); ctx.fillStyle = "#2a2f3a"; ctx.beginPath(); ctx.arc(x, yb - 4, 6, 0, 7); ctx.fill()
    ctx.strokeStyle = "#8a93a3"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, yb - 22); ctx.lineTo(x + Math.cos(-1.2 + arm) * 30, yb - 22 + Math.sin(-1.2 + arm) * 30); ctx.lineTo(x + Math.cos(-1.2 + arm) * 30 + 14, yb - 22 + Math.sin(-1.2 + arm) * 30 + 8); ctx.stroke()
    ctx.fillStyle = flee ? "#ff5040" : "#6ee6ff"; ctx.fillRect(x - 10, yb - 18, 6, 3)
  }
}
export const labState = () => ({ glitch: LAB.glitch, flash: LAB.flash, alert: LAB.alert, sparks: LAB.sparks.length, bots: (LAB.bots || []).map(b => Math.round(b.x)) })

// a reactive crowd: backs away from fighters who come close, jumps + shouts at big hits, goes tense when someone is
// close to dying, cheers the knockout (each character's own walk / jump / guard / win animation; render-only)
function drawCrowd(ctx, CR, { W, feet, sh }) {
  if (!CR.sprites) { loadCrowd(CR); return }
  const F = (_lastWorld?.fighters || []).filter(Boolean), fighting = new Set(F.map(f => f.rosterKey))
  const cam = camera.x ?? W / 2, t = now()
  const dt = Math.min(0.05, Math.max(0, t - (CR.last || t))); CR.last = t
  // what the crowd sees this frame: a big hit, someone close to dying, a knockout
  let bigHit = false, danger = false, ko = false
  for (const f of F) {
    const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = CR.hp.get(f)
    CR.hp.set(f, hp)
    if (was != null && was - hp >= 60) bigHit = true
    if (hp <= 0) ko = true; else if (hp / max <= 0.2) danger = true
  }
  CR.events = { bigHit, danger, ko }
  const say = (sp, list, dur = 1.3) => { if (sp.bubbleT > 0.3) return; sp.bubble = list[Math.floor(_h(sp.seed + Math.floor(t * 3)) * list.length)]; sp.bubbleT = dur }
  for (const sp of CR.sprites) {
    sp.shown = !fighting.has(sp.key) && ready(sp.im)
    if (!sp.shown) continue
    const home = sp.fx * W + sh
    sp.bubbleT = Math.max(0, sp.bubbleT - dt); sp.hop = Math.max(0, sp.hop - dt)
    // a fighter right next to them: back away and cover up
    let near = null, nd = 1e9
    for (const f of F) { const d = (f.x + (f.w || 50) / 2) - (home + sp.off); if (Math.abs(d) < Math.abs(nd)) { nd = d; near = f } }
    const scared = near && Math.abs(nd) < 170
    const target = scared ? Math.max(-110, Math.min(110, -Math.sign(nd) * (170 - Math.abs(nd)) * 1.2)) : 0
    const step = 130 * dt, moving = Math.abs(target - sp.off) > 2
    sp.off += Math.max(-step, Math.min(step, target - sp.off))
    if (scared) { sp.mood = "scared"; if (_h(sp.seed * 3 + Math.floor(t)) < 0.5) say(sp, ["!", "WHOA!", "HEY!", "うわっ!"], 0.9) }
    else if (ko) { sp.mood = "cheer"; if (sp.hop <= 0) sp.hop = 0.55; say(sp, ["WOOO!", "IT'S OVER!", "LET'S GO!", "すげぇ!"], 1.6) }
    else if (danger) { sp.mood = "tense"; if (sp.hop <= 0 && _h(sp.seed + Math.floor(t * 1.5)) < 0.35) sp.hop = 0.45; if (_h(sp.seed * 7 + Math.floor(t * 0.7)) < 0.3) say(sp, ["FINISH IT!", "GET UP!", "NO WAY…", "ONE MORE!"], 1.4) }
    else sp.mood = moving ? "walk" : "idle"
    if (bigHit && !scared) { sp.hop = 0.6; if (_h(sp.seed + Math.floor(t * 10)) < 0.45) say(sp, ["OOH!", "!!", "DAMN!", "ヤバ!"], 1.1) }
    // pick the animation for the mood (falling back to idle when the character doesn't have it)
    const A = sp.anims, pick = (moving && A.walk) ? A.walk : sp.mood === "scared" ? (A.guard || A.idle)
      : sp.mood === "cheer" ? (A.win || (sp.hop > 0 && A.jump) || A.idle) : (sp.hop > 0 && A.jump) ? A.jump : A.idle
    const use = ready(pick.im) ? pick : A.idle
    const d = use.d, n = Math.max(1, Math.min(d.frames, Math.floor(use.im.naturalWidth / d.width)))
    const f = Math.floor((t * 60) / (d.speed || 8) + sp.fx * 17) % n
    const w = d.width * sp.sc, h = d.height * sp.sc, x = home + sp.off
    const ox = (d.originX ?? d.width / 2) * sp.sc, oy = (d.originY ?? d.height) * sp.sc
    const lift = sp.hop > 0 ? Math.sin((sp.hop / 0.6) * Math.PI) * 22 : 0
    sp.drawn = use === A.idle ? "idle" : Object.keys(A).find(k => A[k] === use)
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, feet, w * 0.3 * (1 - lift / 60), 5, 0, 0, 7); ctx.fill()
    ctx.save(); ctx.translate(Math.round(x), feet - lift)
    const faceLeft = scared ? nd < 0 : x > cam                                    // watch the fight; when backing off, face the threat
    if (moving && !scared ? target - sp.off < 0 : faceLeft) ctx.scale(-1, 1)
    if (sp.mood === "tense") ctx.scale(1, 1 + 0.03 * Math.sin(t * 9 + sp.seed))
    ctx.filter = "brightness(0.78) saturate(0.85)"                   // background people: a step darker than the fighters
    ctx.drawImage(use.im, f * d.width, 0, d.width, d.height, -ox, -oy, w, h); ctx.filter = "none"; ctx.restore()
    if (sp.bubbleT > 0 && sp.bubble) {                               // reaction bubble
      const a = Math.min(1, sp.bubbleT * 4), by = feet - lift - (d.originY ?? d.height) * sp.sc - 18
      ctx.save(); ctx.globalAlpha = a; ctx.font = "900 15px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      const tw2 = ctx.measureText(sp.bubble).width + 14
      ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = "#1a1010"; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - tw2 / 2, by - 12, tw2, 24, 8) : ctx.rect(x - tw2 / 2, by - 12, tw2, 24); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x - 4, by + 12); ctx.lineTo(x, by + 19); ctx.lineTo(x + 4, by + 12); ctx.fill()
      ctx.fillStyle = "#1a1010"; ctx.fillText(sp.bubble, x, by + 1); ctx.restore()
    }
  }
  return CR.events
}

// ───────────────────────────── WORLD TOURNAMENT ARENA (render-only, wall clock) ─────────────────────────────
// Sagat's temple courtyard (Street Fighter, 1987) as the World Tournament: the hall + great stairs behind, banners,
// packed stands, a raised white-tiled ring on the lawn whose tiles crack and crater under big hits (kept for the
// match), famous spectators from around the multiverse at the ringside (the shared reactive crowd), and an announcer
// with a microphone calling the fight.
const TW_CROWD = [
  ["vegeta", 0.07, 0], ["beerus", 0.13, 0], ["goku", 0.19, 0], ["naruto", 0.82, "naruto_blue"], ["ichigo", 0.88, "ichigoCrimsonReaper"], ["saitama", 0.94, 0],
]
const TW = makeCrowd(TW_CROWD, 0.72)
const TWS = { p1: null, cracks: [], hp: new WeakMap(), call: null, callT: 0, last: 0, R0: 8, R1: 40 }
export const tournamentState = () => ({ cracks: TWS.cracks.length, call: TWS.callT > 0 ? TWS.call : null, crowd: crowdState(TW) })

function drawTournamentBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const P = c.layout.pieces, S = def.S, t = now()
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#3d86e0"); g.addColorStop(1, "#a8d4ff")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const sk = P.sky, im = c.img[sk.file], sw = sk.w * S, sh = sk.h * S, ss = shift(0.08, W) + (t * 6) % sw, sy = dockTop - 280 - sh * 0.6
  if (ready(im)) for (let k = Math.floor((padL - ss) / sw) - 1, x; (x = ss + k * sw) < padR; k++) {
    if (k % 2) { ctx.save(); ctx.translate(Math.floor(x) + sw, sy); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, Math.ceil(sw) + 1, sh); ctx.restore() }
    else ctx.drawImage(im, Math.floor(x), sy, Math.ceil(sw) + 1, sh)
  }
  // far hills + palms beyond the temple wall
  const hs = shift(0.2, W); ctx.fillStyle = "#6a9a5a"; ctx.beginPath(); ctx.moveTo(padL, dockTop)
  for (let x = padL - 40; x <= padR + 40; x += 40) ctx.lineTo(x, dockTop - 250 - 40 * Math.sin((x - hs) * 0.004) - 20 * _h(Math.floor((x - hs) / 40)))
  ctx.lineTo(padR, dockTop); ctx.closePath(); ctx.fill()
}

function tournamentFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now(), F = (_lastWorld?.fighters || []).filter(Boolean)
  if (F[0] !== TWS.p1) { TWS.p1 = F[0]; TWS.cracks = []; TWS.hp = new WeakMap() }
  const dt = Math.min(0.05, Math.max(0, t - (TWS.last || t))); TWS.last = t
  const rowY = r => dockTop + r * S, rowX = (fx, r) => W * fx + shift(rowFactor(def, r), W)
  // banners on the temple wall
  const ws = shift(0.6, W)
  for (const fx of [0.3, 0.7]) {
    const x = W * fx + ws, y = dockTop - 250, w = 44, h = 190, sway = Math.sin(t * 1.3 + fx * 7) * 3
    ctx.fillStyle = "#8a1010"; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 + sway, y + h); ctx.lineTo(x + sway, y + h - 14); ctx.lineTo(x - w / 2 + sway, y + h); ctx.closePath(); ctx.fill()
    ctx.fillStyle = "#d8a830"; ctx.fillRect(x - w / 2 - 4, y - 6, w + 8, 6)
    ctx.save(); ctx.fillStyle = "#f8d860"; ctx.font = "900 22px 'Hiragino Mincho ProN','Noto Serif JP',serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
    const txt = "天下一武道会"; for (let i = 0; i < txt.length; i++) ctx.fillText(txt[i], x + sway * (i / txt.length), y + 18 + i * 27)
    ctx.restore()
  }
  // the packed stands in front of the wall (either side of the stairs)
  const ev = TW.events || {}, crowdY = rowY(5)
  for (let r = 0; r < 3; r++) for (let i = 0; i < 70; i++) {
    const u = (i + 0.5 * (r % 2)) / 70, fx = 0.02 + u * 0.96
    if (fx > 0.41 && fx < 0.59) continue
    const x = rowX(fx, 3) , seed = r * 97 + i, base = crowdY - r * 16
    const jump = ev.ko ? Math.abs(Math.sin(t * 9 + seed)) * 10 : ev.bigHit ? 8 : Math.max(0, Math.sin(t * 2 + seed)) * 2
    const y = base - jump, col = ["#c83a3a", "#3a6ac8", "#e8c040", "#3aa860", "#e8e8e8", "#8a4ac8", "#e87a30"][seed % 7], skin = ["#f1c9a5", "#c58c64", "#8d5b3e"][seed % 3]
    ctx.fillStyle = col; ctx.fillRect(x - 6, y - 18, 12, 18)
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y - 23, 5, 0, 7); ctx.fill()
    ctx.fillStyle = ["#1a1a1a", "#5a3a1a", "#d8b060"][seed % 3]; ctx.fillRect(x - 5, y - 29, 10, 4)
    if (ev.ko || ev.bigHit || (seed % 5 === 0 && Math.sin(t * 3 + seed) > 0.6)) { ctx.fillStyle = col; ctx.fillRect(x - 9, y - 30, 3, 12); ctx.fillRect(x + 6, y - 30, 3, 12) }
  }
  // the lawn carries on toward the viewer
  const gbot = rowY(P.grass.h)
  if (coverBottom > gbot) { const gg = ctx.createLinearGradient(0, gbot, 0, coverBottom); gg.addColorStop(0, "#4a7a10"); gg.addColorStop(1, "#223a08"); ctx.fillStyle = gg; ctx.fillRect(padL, gbot, padR - padL, coverBottom - gbot)
    for (let i = 0; i < 400; i++) { const x = padL + _h(i * 3 + 7) * (padR - padL), y = gbot + _h(i * 3 + 8) * (coverBottom - gbot); ctx.fillStyle = i % 3 ? "rgba(120,170,40,0.5)" : "rgba(20,40,0,0.5)"; ctx.fillRect(x, y, 2, 4) } }
  // the ring: raised white tiles from row R0 (far) to R1 (near), its front face below
  const R0 = TWS.R0, R1 = TWS.R1, L0 = rowX(0.2, R0), L1 = rowX(0.2, R1), Q0 = rowX(0.8, R0), Q1 = rowX(0.8, R1), y0 = rowY(R0), y1 = rowY(R1), fh = 13 * S
  ctx.fillStyle = "#e4dfd2"; ctx.beginPath(); ctx.moveTo(L0, y0); ctx.lineTo(Q0, y0); ctx.lineTo(Q1, y1); ctx.lineTo(L1, y1); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = "rgba(120,110,95,0.55)"; ctx.lineWidth = 1.5
  for (let k = 1; k < 6; k++) { const r = R0 + (R1 - R0) * (k / 6) ** 1.15, y = rowY(r); ctx.beginPath(); ctx.moveTo(rowX(0.2, r), y); ctx.lineTo(rowX(0.8, r), y); ctx.stroke() }
  for (let k = 1; k < 16; k++) { const f = 0.2 + 0.6 * k / 16; ctx.beginPath(); ctx.moveTo(rowX(f, R0), y0); ctx.lineTo(rowX(f, R1), y1); ctx.stroke() }
  const fg = ctx.createLinearGradient(0, y1, 0, y1 + fh); fg.addColorStop(0, "#c9c2b2"); fg.addColorStop(1, "#8f887a")
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(L1, y1); ctx.lineTo(Q1, y1); ctx.lineTo(Q1 + 6, y1 + fh); ctx.lineTo(L1 - 6, y1 + fh); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = "rgba(90,84,72,0.6)"; for (let k = 0; k <= 24; k++) { const x = L1 + (Q1 - L1) * k / 24; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + (k / 24 - 0.5) * 12, y1 + fh); ctx.stroke() }
  ctx.fillStyle = "#a8a090"; ctx.beginPath(); ctx.moveTo(L0, y0); ctx.lineTo(L1, y1); ctx.lineTo(L1 - 6, y1 + fh); ctx.lineTo(L0 - 4, y0 + fh * 0.6); ctx.closePath(); ctx.fill()   // side faces
  ctx.beginPath(); ctx.moveTo(Q0, y0); ctx.lineTo(Q1, y1); ctx.lineTo(Q1 + 6, y1 + fh); ctx.lineTo(Q0 + 4, y0 + fh * 0.6); ctx.closePath(); ctx.fill()
  ctx.fillStyle = "#f4f0e6"; ctx.fillRect(L1, y1 - 2, Q1 - L1, 3)
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(L1 - 6, y1 + fh, Q1 - L1 + 12, 6)
  // big hits crack the tiles where the fighter lands (they stay for the match)
  let bigHitNow = false, danger = false, ko = false
  for (const f of F) {
    const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = TWS.hp.get(f); TWS.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.2) danger = true
    if (was == null || was - hp < 80) continue
    bigHitNow = true
    const x = f.x + (f.w || 50) / 2
    if (x > L1 + 30 && x < Q1 - 30 && TWS.cracks.length < 24) TWS.cracks.push({ x, r: 18 + Math.min(40, (was - hp) * 0.18), seed: (TWS.cracks.length * 37 + Math.floor(t * 100)) | 0 })
  }
  const cy = rowY(R0 + (R1 - R0) * 0.7)
  ctx.save(); ctx.beginPath(); ctx.moveTo(L0, y0); ctx.lineTo(Q0, y0); ctx.lineTo(Q1, y1); ctx.lineTo(L1, y1); ctx.closePath(); ctx.clip()   // cracks stay on the tiles
  for (const k of TWS.cracks) {
    ctx.fillStyle = "rgba(60,54,46,0.75)"; ctx.beginPath()
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, rr = k.r * (0.6 + 0.5 * _h(k.seed + i)); i ? ctx.lineTo(k.x + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr * 0.4) : ctx.moveTo(k.x + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr * 0.4) }
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = "rgba(70,62,52,0.9)"; ctx.lineWidth = 1.5; ctx.beginPath()
    for (let i = 0; i < 7; i++) { const a = _h(k.seed * 3 + i) * 6.283, l = k.r * (1.6 + 1.4 * _h(k.seed + i * 5)); ctx.moveTo(k.x, cy); ctx.lineTo(k.x + Math.cos(a) * l * 1.2, cy + Math.sin(a) * l * 0.3); ctx.lineTo(k.x + Math.cos(a + 0.3) * l * 2, cy + Math.sin(a + 0.3) * l * 0.5) }
    ctx.stroke()
    ctx.fillStyle = "#cfc8b8"; for (let i = 0; i < 4; i++) ctx.fillRect(k.x + (_h(k.seed + i * 9) - 0.5) * k.r * 2.4, cy - 4 - 6 * _h(k.seed + i), 6, 4)   // tile chunks
  }
  ctx.restore()
  // the famous spectators at the ringside (behind the far edge)
  drawCrowd(ctx, TW, { W, feet: rowY(R0 - 1), sh: shift(rowFactor(def, R0 - 1), W) })
  // the announcer at the near-left corner of the ring, calling the fight
  { const x = L0 - 70, y = rowY(R0 + 6), bob = Math.sin(t * 4) * 1.5
    if (ko) { TWS.call = "IT'S OVER!!"; TWS.callT = 1.5 } else if (bigHitNow) { TWS.call = ["WHAT A HIT!", "INCREDIBLE!", "UNBELIEVABLE!"][TWS.cracks.length % 3]; TWS.callT = 1.4 }
    else if (danger && TWS.callT <= 0 && Math.sin(t * 0.8) > 0.95) { TWS.call = "HE CAN'T TAKE MUCH MORE!"; TWS.callT = 1.6 }
    TWS.callT = Math.max(0, TWS.callT - dt)
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, y, 14, 4, 0, 0, 7); ctx.fill()
    ctx.fillStyle = "#1a1a22"; ctx.fillRect(x - 5, y - 26 + bob, 4, 26 - bob); ctx.fillRect(x + 1, y - 26 + bob, 4, 26 - bob)        // trousers
    ctx.fillRect(x - 8, y - 50 + bob, 16, 25); ctx.fillStyle = "#f4f4f4"; ctx.fillRect(x - 2, y - 50 + bob, 4, 14)                   // jacket, shirt
    ctx.fillStyle = "#b01818"; ctx.fillRect(x - 1, y - 48 + bob, 2, 9)                                                                  // tie
    ctx.fillStyle = "#e8c090"; ctx.fillRect(x - 5, y - 62 + bob, 10, 12); ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x - 6, y - 65 + bob, 12, 5)
    ctx.fillStyle = "#101010"; ctx.fillRect(x - 5, y - 58 + bob, 10, 3)                                                                 // sunglasses
    const arm = TWS.callT > 0 ? -0.6 : 0.2
    ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 7, y - 46 + bob); ctx.lineTo(x + 12, y - 54 + bob + arm * 8); ctx.stroke()
    ctx.fillStyle = "#2a2a2a"; ctx.fillRect(x + 10, y - 60 + bob + arm * 8, 3, 8); ctx.fillStyle = "#888"; ctx.fillRect(x + 9, y - 62 + bob + arm * 8, 5, 4)   // the microphone
    if (TWS.callT > 0 && TWS.call) {
      ctx.save(); ctx.globalAlpha = Math.min(1, TWS.callT * 4); ctx.font = "900 16px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      const tw = ctx.measureText(TWS.call).width + 16, by = y - 86
      ctx.fillStyle = "#fff8e0"; ctx.strokeStyle = "#1a1010"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(x + 4 - tw / 2 + 30, by - 13, tw, 26); ctx.fill(); ctx.stroke()
      ctx.fillStyle = "#c01818"; ctx.fillText(TWS.call, x + 34, by + 1); ctx.restore()
    }
  }
}

// ───────────────────────────── PLANET NAMEK — THE INVASION (render-only, wall clock, own PRNG) ─────────────────────────────
// Eagle's Stage (Street Fighter, 1987) repainted as Namek. Frieza's round ship hangs in the green sky dropping bombs; his
// armored soldiers fly over the hills firing ki blasts; Namekian villagers run for their lives (a hit kills them — they
// fall, purple blood, and stay down); Namekian warriors stand and fire back, shooting soldiers out of the sky; dome
// villages burn; craters and bodies stay for the match. Big hits in the fight draw a strike from the ship; the knockout
// sets off a huge blast on the horizon.
let _nmSeed = 0x9e3779b9
const nmRnd = () => { _nmSeed ^= _nmSeed << 13; _nmSeed ^= _nmSeed >>> 17; _nmSeed ^= _nmSeed << 5; return (_nmSeed >>> 0) / 4294967296 }
const NM = { p1: null, last: 0, hp: new WeakMap(), people: [], soldiers: [], shots: [], bombs: [], booms: [], craters: [], bodies: [], debris: [],
  spawnP: 0, spawnS: 0, bombT: 2, kills: 0, downed: 0, strikes: 0, bigBoom: 0, koBoom: false,
  jets: [], jetT: 1.5, flyT: 8, jetsDown: 0, flybys: 0, shakes: 0, orb: 0, finale: null, start: 0 }
// the flying war uses real sprites: Vilgax's attack drones (idle 4 frames / death 4 frames) as Frieza's drones, and the
// jet from the Stark Lab sheet as the planes that dogfight them — tiny and hazy, far away over the hills
const NM_IMG = {}
function nmImg(k, src) { if (!NM_IMG[k]) { const im = new Image(); im.src = src; NM_IMG[k] = im } return NM_IMG[k] }
function nmShake(s, d) { NM.shakes++; camera.shake?.(s, d) }
export const namekState = () => ({ people: NM.people.length, warriors: NM.people.filter(p => p.warrior).length, soldiers: NM.soldiers.length,
  bombs: NM.bombs.length, booms: NM.booms.length, craters: NM.craters.length, bodies: NM.people.filter(p => p.dead).length, jets: NM.jets.length, jetsDown: NM.jetsDown, flybys: NM.flybys, shakes: NM.shakes, finale: NM.finale ? NM.finale.stage : null, orb: NM.orb, kills: NM.kills, downed: NM.downed, strikes: NM.strikes, koBoom: NM.koBoom })
const NM_HOUSES = [[0.08, 0], [0.15, 1], [0.27, 0], [0.55, 2], [0.62, 1], [0.69, 0], [0.88, 1], [0.95, 2]]   // [x, state 0 whole / 1 burning / 2 wrecked]

function drawNamekBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now()
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#3fbf7f"); g.addColorStop(0.6, "#8ee6b0"); g.addColorStop(1, "#c8f5c0")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  // three suns
  const ss = shift(0.04, W)
  for (const [fx, fy, r] of [[0.18, 420, 26], [0.27, 470, 16], [0.84, 440, 20]]) {
    const x = W * fx + ss, y = dockTop - fy, gl = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
    gl.addColorStop(0, "rgba(255,255,230,0.95)"); gl.addColorStop(0.25, "rgba(255,255,200,0.5)"); gl.addColorStop(1, "rgba(255,255,200,0)")
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 7); ctx.fill(); ctx.fillStyle = "#fffff0"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
  }
  // smoke columns from the burning villages far off, leaning in the wind
  const fs = shift(0.15, W)
  for (let i = 0; i < 6; i++) {
    const bx = W * (0.05 + i * 0.19) + fs, by = dockTop - 240
    for (let k = 0; k < 14; k++) {
      const u = ((t * 0.08 + k / 14 + i * 0.37) % 1), x = bx + u * 120 + Math.sin(u * 6 + i) * 10, y = by - u * 260, r = 10 + u * 40
      ctx.fillStyle = `rgba(40,46,44,${0.35 * (1 - u)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
    }
    if (Math.sin(t * 2.3 + i * 4) > 0.97) { ctx.fillStyle = "rgba(255,200,120,0.6)"; ctx.beginPath(); ctx.arc(bx, by, 26, 0, 7); ctx.fill() }   // far explosion flash
  }
  // Frieza's ship: a round saucer with a ring of lights, hovering over the far hills
  const sx = W * 0.7 + shift(0.12, W), sy = dockTop - 285 + Math.sin(t * 0.7) * 6
  const hull = ctx.createLinearGradient(0, sy - 60, 0, sy + 40); hull.addColorStop(0, "#f2f2f8"); hull.addColorStop(0.6, "#b8bccb"); hull.addColorStop(1, "#6a6e80")
  ctx.fillStyle = hull; ctx.beginPath(); ctx.ellipse(sx, sy, 130, 62, 0, Math.PI, 0); ctx.lineTo(sx + 130, sy + 6); ctx.ellipse(sx, sy + 6, 130, 30, 0, 0, Math.PI); ctx.closePath(); ctx.fill()
  ctx.fillStyle = "#4a4e60"; ctx.fillRect(sx - 130, sy, 260, 8)
  for (let i = 0; i < 12; i++) { const a = i / 12, on = Math.sin(t * 5 - i * 0.8) > 0; ctx.fillStyle = on ? "#ffd040" : "#806020"; ctx.beginPath(); ctx.arc(sx - 120 + a * 240, sy + 4, 4, 0, 7); ctx.fill() }
  ctx.fillStyle = "rgba(40,60,90,0.8)"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(sx - 70 + i * 35, sy - 26, 7, 0, 7); ctx.fill() }
  ctx.fillStyle = "#9aa0b4"; for (const k of [-1, 1]) { ctx.fillRect(sx + k * 80 - 4, sy + 30, 8, 30); ctx.fillRect(sx + k * 80 - 12, sy + 58, 24, 5) }   // landing legs
  NM.ship = { x: sx, y: sy + 30 }
}

function nmNamekian(ctx, x, y, sc, p, t) {
  // a Namekian: green skin, antennae, white robe + purple sash (pixel figure ~46px tall at sc 1)
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * (p.dir || 1), sc)
  if (p.dead) {                                                     // lying in the grass
    ctx.rotate(-Math.PI / 2 * Math.min(1, p.deadT * 4))
  }
  const run = p.dead ? 0 : p.warrior ? 0 : Math.sin(t * 14 + p.seed) * 0.6
  ctx.fillStyle = "#2f8a3a"; ctx.save(); ctx.translate(-3, -16); ctx.rotate(run); ctx.fillRect(-2, 0, 5, 16); ctx.restore(); ctx.save(); ctx.translate(3, -16); ctx.rotate(-run); ctx.fillRect(-2, 0, 5, 16); ctx.restore()
  ctx.fillStyle = "#6a3a12"; ctx.fillRect(-5, -2, 6, 3); ctx.fillRect(1, -2, 6, 3)
  ctx.fillStyle = p.elder ? "#e8e0d0" : "#f4f4f0"; ctx.fillRect(-8, -36, 16, 22)                     // robe / gi
  ctx.fillStyle = "#6a2a9a"; ctx.fillRect(-8, -20, 16, 4)                                              // sash
  ctx.fillStyle = "#3aa048"
  if (p.warrior && p.aim > 0) ctx.fillRect(6, -33, 16, 5)                                             // arm out, firing
  else { ctx.save(); ctx.translate(7, -34); ctx.rotate(-run * 1.2 - (p.panic ? 2.4 : 0)); ctx.fillRect(-2, 0, 5, 14); ctx.restore() }
  ctx.fillRect(-5, -47, 11, 11); ctx.fillStyle = "#2a7a34"; ctx.fillRect(-7, -44, 3, 5); ctx.fillRect(5, -44, 3, 5)   // head, pointed ears
  ctx.strokeStyle = "#3aa048"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, -47); ctx.quadraticCurveTo(-6, -56, -8, -58); ctx.moveTo(2, -47); ctx.quadraticCurveTo(5, -56, 3, -59); ctx.stroke()
  ctx.fillStyle = "#111"; ctx.fillRect(2, -44, 2, 2)
  ctx.restore()
}

function nmBoom(x, y, r, big) { NM.booms.push({ x, y, r, t: 0, life: big ? 1.4 : 0.8 }); for (let i = 0; i < (big ? 14 : 6); i++) NM.debris.push({ x, y, vx: (nmRnd() - 0.5) * r * 6, vy: -nmRnd() * r * 7, life: 0.6 + nmRnd() * 0.6, purple: false }) }

function namekFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const S = def.S, t = now(), F = (_lastWorld?.fighters || []).filter(Boolean)
  if (F[0] !== NM.p1) { NM.p1 = F[0]; NM.people = []; NM.soldiers = []; NM.shots = []; NM.bombs = []; NM.booms = []; NM.craters = []; NM.bodies = []; NM.debris = []; NM.kills = 0; NM.downed = 0; NM.strikes = 0; NM.koBoom = false; NM.hp = new WeakMap()
    NM.jets = []; NM.jetsDown = 0; NM.flybys = 0; NM.shakes = 0; NM.orb = 0; NM.finale = null; NM.start = t; NM.flyT = 8 }
  const dt = Math.min(0.05, Math.max(0, t - (NM.last || t))); NM.last = t
  const off = shift(0.75, W), lineY = NM.lineY = dockTop + 3 * S, L = padL - 80, R = padR + 80, sc = 0.9
  // villages along the far edge of the field (dome houses on stalks — some burning, some wrecked)
  for (const [fx, st] of NM_HOUSES) {
    const x = W * fx * 1.4 - W * 0.2 + shift(0.62, W), y = dockTop - 6
    ctx.fillStyle = "#cfd8c8"; ctx.fillRect(x - 5, y - 26, 10, 26)
    if (st === 2) { ctx.fillStyle = "#9aa294"; ctx.beginPath(); ctx.moveTo(x - 26, y - 22); ctx.lineTo(x - 18, y - 46); ctx.lineTo(x - 6, y - 34); ctx.lineTo(x + 4, y - 52); ctx.lineTo(x + 26, y - 22); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#2a2a28"; ctx.fillRect(x - 8, y - 36, 14, 10) }
    else { const dg = ctx.createLinearGradient(0, y - 64, 0, y - 22); dg.addColorStop(0, "#ffffff"); dg.addColorStop(1, "#b4c0b0"); ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(x, y - 34, 28, 30, 0, Math.PI, 0); ctx.lineTo(x + 28, y - 22); ctx.lineTo(x - 28, y - 22); ctx.closePath(); ctx.fill()
      ctx.fillStyle = "#3a5a7a"; for (const k of [-14, 0, 14]) { ctx.beginPath(); ctx.arc(x + k, y - 40, 4, 0, 7); ctx.fill() } }
    if (st) for (let k = 0; k < 5; k++) {                                       // fire + smoke
      const u = (t * 1.6 + k / 5 + fx * 3) % 1, fl = 1 - u
      ctx.fillStyle = `rgba(255,${140 + 80 * fl | 0},40,${0.8 * fl})`; ctx.beginPath(); ctx.arc(x + Math.sin(t * 9 + k) * 6, y - 50 - u * 30, 7 * fl + 2, 0, 7); ctx.fill()
      ctx.fillStyle = `rgba(30,32,30,${0.4 * fl})`; ctx.beginPath(); ctx.arc(x + u * 30, y - 80 - u * 90, 10 + u * 24, 0, 7); ctx.fill()
    }
  }
  // the field carries on toward the viewer (trampled grass)
  const gbot = dockTop + c.layout.pieces.ground.h * S
  if (coverBottom > gbot) { const gg = ctx.createLinearGradient(0, gbot, 0, coverBottom); gg.addColorStop(0, "#8ad0a0"); gg.addColorStop(1, "#3a7a52"); ctx.fillStyle = gg; ctx.fillRect(padL, gbot, padR - padL, coverBottom - gbot)
    for (let i = 0; i < 400; i++) { const x = padL + _h(i * 3 + 11) * (padR - padL), y = gbot + _h(i * 3 + 12) * (coverBottom - gbot); ctx.fillStyle = i % 3 ? "rgba(170,230,180,0.45)" : "rgba(30,80,50,0.45)"; ctx.fillRect(x, y, 2, 4) } }
  // craters + scorch along the field
  for (const k of NM.craters) { ctx.fillStyle = "rgba(30,36,24,0.55)"; ctx.beginPath(); ctx.ellipse(k.x + off, lineY + 3, k.r, k.r * 0.22, 0, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(10,10,8,0.5)"; ctx.beginPath(); ctx.ellipse(k.x + off, lineY + 3, k.r * 0.5, k.r * 0.1, 0, 0, 7); ctx.fill() }
  // ── spawn: villagers fleeing, warriors standing their ground, soldiers flying in, bombs from the ship
  NM.spawnP -= dt; NM.spawnS -= dt; NM.bombT -= dt
  if (NM.finale?.stage === "boom") NM.spawnP = NM.spawnS = NM.bombT = 99          // after the blast: nothing left out there
  if (NM.spawnP <= 0 && NM.people.filter(p => !p.dead).length < 9) {
    NM.spawnP = 0.7 + nmRnd() * 1.1
    const warrior = NM.people.filter(p => p.warrior && !p.dead).length < 2 || nmRnd() < 0.2, fromL = nmRnd() < 0.5, x0 = fromL ? L - off : R - off
    NM.people.push({ x: warrior ? W * (0.1 + nmRnd() * 0.8) - off : x0, warrior, dir: warrior ? (nmRnd() < 0.5 ? 1 : -1) : fromL ? 1 : -1, speed: 70 + nmRnd() * 60, seed: nmRnd() * 100,
      elder: nmRnd() < 0.15, panic: nmRnd() < 0.5, aim: 0, fireT: 1 + nmRnd() * 2, rise: warrior ? 1 : 0, dead: false, deadT: 0 })
  }
  if (NM.spawnS <= 0 && NM.soldiers.filter(s => !s.down).length < 5) {
    NM.spawnS = 1.2 + nmRnd() * 1.6
    const fromL = nmRnd() < 0.5
    const dsc = 0.28 + nmRnd() * 0.3                                           // far away = small
    NM.soldiers.push({ x: (fromL ? L : R) - off, y: dockTop - 110 - nmRnd() * 190, sc: dsc, dir: fromL ? 1 : -1, vx: (fromL ? 1 : -1) * (160 + nmRnd() * 220) * (0.6 + dsc), vy: 0,
      fireT: 0.8 + nmRnd() * 1.5, charge: 0, down: false, spin: 0, seed: nmRnd() * 100, skin: ["#d890d0", "#8ad0e0", "#e8b088", "#a0c060"][Math.floor(nmRnd() * 4)], trim: ["#3a2a6a", "#6a3a1a", "#1a4a6a"][Math.floor(nmRnd() * 3)] })
  }
  const shipBomb = (tx) => { const s = NM.ship || { x: W * 0.7, y: dockTop - 300 }; NM.bombs.push({ x: s.x - off * 0.16, y: s.y, tx, vx: 0, vy: 40, t: 0 }) }
  if (NM.bombT <= 0) { NM.bombT = 1.6 + nmRnd() * 2.4; shipBomb(W * (0.05 + nmRnd() * 0.9) - off) }
  // ── the fight drives the war: big hits draw a strike from the ship, the knockout a huge blast
  let ko = false
  for (const f of F) { const hp = f.health ?? 0, was = NM.hp.get(f); NM.hp.set(f, hp); if (hp <= 0) ko = true; if (was != null && was - hp >= 60) { NM.strikes++; shipBomb((f.x || W / 2) - off + (nmRnd() - 0.5) * 300) } }
  // ── the planes: far-off jets crossing the sky, gunning drones down (and sometimes getting shot down themselves)
  NM.jetT -= dt; NM.flyT -= dt
  if (NM.finale?.stage === "boom") NM.jetT = NM.flyT = 99
  if (NM.jetT <= 0) { NM.jetT = 1.4 + nmRnd() * 2.2; const fromL = nmRnd() < 0.5, sc = 0.07 + nmRnd() * 0.07
    NM.jets.push({ x: (fromL ? L - 200 : R + 200) - off, y: dockTop - 160 - nmRnd() * 200, dir: fromL ? 1 : -1, vx: (fromL ? 1 : -1) * (520 + nmRnd() * 300), sc, fireT: 0.3, doomed: nmRnd() < 0.3, down: false, vy: 0, spin: 0 }) }
  // a close flyby: a big jet screams across the whole screen and the screen shakes
  if (NM.flyT <= 0) { NM.flyT = 9 + nmRnd() * 8; NM.flybys++; const fromL = nmRnd() < 0.5
    NM.jets.push({ x: (fromL ? L - 700 : R + 700) - off, y: dockTop - 250 - nmRnd() * 60, dir: fromL ? 1 : -1, vx: (fromL ? 1 : -1) * 1900, sc: 0.55, near: true, fireT: 9, down: false, vy: 0, spin: 0, shook: false }) }
  // the finale: when a fighter is close to losing, the ship charges a giant orb; the knockout drops it — the horizon
  // goes up in one huge explosion (white-out, long heavy shake, a shockwave, everything in the background wiped out)
  const danger = F.some(f => (f.health ?? 1) > 0 && (f.health ?? 0) / (f.maxHealth || f.maxHp || 1000) <= 0.25)
  if ((danger || ko) && !NM.finale) NM.finale = { stage: "charge", t: 0 }
  if (NM.finale) {
    const fin = NM.finale; fin.t += dt
    if (fin.stage === "charge") { NM.orb = Math.min(1, NM.orb + dt * 0.25); if (ko) { fin.stage = "drop"; fin.t = 0; fin.y = (NM.ship?.y || dockTop - 255) + 60 } }
    else if (fin.stage === "drop") { fin.y += dt * (120 + fin.t * 400); if (fin.y >= dockTop - 60) { fin.stage = "boom"; fin.t = 0; NM.koBoom = true; NM.bigBoom = 3.2; nmShake(18, 70)
        for (let i = 0; i < 7; i++) nmBoom(W * (0.05 + i * 0.15) - off, dockTop - 20 - nmRnd() * 40, 90 + nmRnd() * 60, true)
        for (const p of NM.people) if (!p.dead) { p.dead = true; p.deadT = 0; NM.kills++ }
        for (const d of NM.soldiers) if (!d.down) { d.down = true; d.vy = -200; NM.downed++ } } }
    else if (fin.stage === "boom" && fin.t > 1.2 && fin.t < 1.3) nmShake(12, 40)                     // the aftershock
  }
  // ── update + draw villagers / warriors
  const targets = () => NM.people.filter(p => !p.dead)
  for (const p of NM.people) {
    const x = p.x + off
    if (p.dead) p.deadT += dt
    else if (p.warrior) {
      const foe = NM.soldiers.filter(s => !s.down).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]
      if (foe) p.dir = foe.x > p.x ? 1 : -1
      p.fireT -= dt; p.aim = Math.max(0, p.aim - dt)
      if (foe && p.fireT <= 0) { p.fireT = 1.4 + nmRnd() * 1.6; p.aim = 0.35; NM.shots.push({ x: p.x + p.dir * 18, y: lineY - 30 * sc, tx: foe.x, ty: foe.y, sp: 620, good: true, life: 2.5, foe }) }
    } else { p.x += p.dir * p.speed * dt }
    nmNamekian(ctx, x, lineY, sc, p, t)
  }
  NM.people = NM.people.filter(p => (p.dead ? p.deadT < 20 : p.x + off > L - 40 && p.x + off < R + 40)).slice(-40)
  // ── Frieza's drones (real sprites): zip across far away, fire at the villagers; shot down they flip to their death
  // frames, trail smoke, spiral into the hills and blow up
  const dIdle = nmImg("di", "./vilgax_drone_idle_uniform.png"), dDie = nmImg("dd", "./vilgax_drone_death_uniform.png"), jetIm = nmImg("jet", "./stages/guile_starklab/jet.png")
  for (const s of NM.soldiers) {
    if (s.down) { s.vy += 380 * dt; s.x += s.vx * dt * 0.35; s.y += s.vy * dt; s.spin += dt * 9; s.dieT = (s.dieT || 0) + dt
      if (s.y >= dockTop - 8) { s.gone = true; nmBoom(s.x, dockTop - 14, 30 + s.sc * 40); NM.craters.push({ x: s.x, r: 16 }); if (s.sc > 0.45) nmShake(3, 8) } }
    else {
      s.x += s.vx * dt; s.y += Math.sin(t * 3 + s.seed) * 30 * dt; s.fireT -= dt
      s.charge = s.fireT < 0.4 ? 1 - s.fireT / 0.4 : 0
      if (s.fireT <= 0) { s.fireT = 0.9 + nmRnd() * 1.3; const all = targets(), run = all.filter(p => !p.warrior), tg = run.length && nmRnd() < 0.85 ? run : all, v = tg[Math.floor(nmRnd() * tg.length)]
        NM.shots.push({ x: s.x, y: s.y + 8, tx: v ? v.x : s.x + s.dir * 200, ty: lineY - 20, sp: 520, good: false, life: 2 }) }
      if (s.x + off < L - 120 || s.x + off > R + 120) s.gone = true
    }
    const im = s.down ? dDie : dIdle, fw = s.down ? 97 : 92, fh = s.down ? 49 : 48, fr = s.down ? Math.min(3, Math.floor((s.dieT || 0) * 8)) : Math.floor(t * 12 + s.seed) % 4
    if (ready(im)) { ctx.save(); ctx.translate(s.x + off, s.y); if (s.down) ctx.rotate(s.spin * 0.4); ctx.scale(-s.dir * s.sc, s.sc); ctx.globalAlpha = Math.min(1, 0.7 + s.sc * 0.5)
      ctx.drawImage(im, fr * fw, 0, fw, fh, -fw / 2, -fh / 2, fw, fh); ctx.restore() }
    if (s.down) { for (let k = 1; k < 7; k++) { ctx.fillStyle = `rgba(50,50,50,${0.5 - k * 0.06})`; ctx.beginPath(); ctx.arc(s.x + off - s.vx * k * 0.012, s.y - s.vy * k * 0.02, 3 + k * 2.4 * s.sc * 2, 0, 7); ctx.fill() }
      ctx.fillStyle = "rgba(255,160,40,0.8)"; ctx.beginPath(); ctx.arc(s.x + off, s.y, 4 + s.sc * 6, 0, 7); ctx.fill() }
    else if (s.charge > 0) { ctx.fillStyle = "rgba(255,120,220,0.9)"; ctx.beginPath(); ctx.arc(s.x + off, s.y + 8, 2 + s.charge * 4, 0, 7); ctx.fill() }
  }
  NM.soldiers = NM.soldiers.filter(s => !s.gone)
  // ── jets (real sprite, nose left in the art): tracer fire at the drones; doomed ones get hit, burn and crash
  for (const j of NM.jets) {
    if (j.down) { j.vy += 260 * dt; j.y += j.vy * dt; j.x += j.vx * dt * 0.6; j.spin += dt * 1.5
      if (j.y >= dockTop - 10) { j.gone = true; nmBoom(j.x, dockTop - 16, 70, true); NM.craters.push({ x: j.x, r: 40 }); nmShake(5, 12) } }
    else {
      j.x += j.vx * dt
      if (j.near && !j.shook && Math.abs(j.x + off - W / 2) < W * 0.4) { j.shook = true; nmShake(6, 22) }
      j.fireT -= dt
      if (!j.near && j.fireT <= 0) { j.fireT = 0.25; const foe = NM.soldiers.find(d => !d.down && Math.abs(d.x - j.x) < 520 && Math.sign(d.x - j.x) === j.dir)
        if (foe) NM.shots.push({ x: j.x + j.dir * 40, y: j.y, tx: foe.x, ty: foe.y, sp: 1100, good: true, tracer: true, life: 1, foe }) }
      if (j.doomed && !j.near && Math.abs(j.x + off - W / 2) < W * 0.25) { j.down = true; j.vy = 20; NM.jetsDown++; nmBoom(j.x, j.y, 26) }
      if ((j.dir > 0 && j.x + off > R + 800) || (j.dir < 0 && j.x + off < L - 800)) j.gone = true
    }
    if (ready(jetIm)) { const jw = 1024, jh = 90; ctx.save(); ctx.translate(j.x + off, j.y); ctx.rotate(j.down ? Math.min(0.9, j.spin) * j.dir : 0); ctx.scale(-j.dir * j.sc, j.sc)
      ctx.globalAlpha = j.near ? 1 : 0.85; ctx.drawImage(jetIm, 0, 0, jw, jh, -jw / 2, -jh / 2, jw, jh); ctx.restore()
      ctx.fillStyle = "rgba(255,190,90,0.85)"; ctx.beginPath(); ctx.arc(j.x + off - j.dir * 512 * j.sc, j.y, 3 + j.sc * 14, 0, 7); ctx.fill()
      ctx.strokeStyle = j.near ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.35)"; ctx.lineWidth = j.near ? 3 : 1.5
      ctx.beginPath(); ctx.moveTo(j.x + off - j.dir * 520 * j.sc, j.y); ctx.lineTo(j.x + off - j.dir * (520 * j.sc + (j.near ? 900 : 260)), j.y); ctx.stroke()
      if (j.down) for (let k = 1; k < 9; k++) { ctx.fillStyle = `rgba(40,40,40,${0.55 - k * 0.05})`; ctx.beginPath(); ctx.arc(j.x + off - j.vx * k * 0.03, j.y - j.vy * k * 0.03, 4 + k * 3, 0, 7); ctx.fill() } }
  }
  NM.jets = NM.jets.filter(j => !j.gone)
  // ── ki blasts: pink from soldiers (kill villagers), yellow from Namekian warriors (shoot soldiers down)
  for (const b of NM.shots) {
    if (b.foe && !b.foe.down && !b.foe.gone) { b.tx = b.foe.x; b.ty = b.foe.y }          // blasts at the drones home in
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, b.sp * dt)
    b.x += dx / d * st; b.y += dy / d * st; b.life -= dt
    const col = b.good ? "255,230,80" : "255,110,220"
    ctx.strokeStyle = `rgba(${col},0.5)`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(b.x + off, b.y); ctx.lineTo(b.x + off - dx / d * 26, b.y - dy / d * 26); ctx.stroke()
    ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(b.x + off, b.y, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x + off, b.y, 2.4, 0, 7); ctx.fill()
    if (d < 6) {
      b.done = true
      if (b.good) { const s = b.foe && !b.foe.down ? b.foe : NM.soldiers.find(s => !s.down && Math.hypot(s.x - b.x, s.y - b.y) < 40); if (s) { s.down = true; s.vy = -60; NM.downed++ } nmBoom(b.x, b.y, 14) }
      else { nmBoom(b.x, b.y + 10, 20); NM.craters.push({ x: b.x, r: 14 }); nmKill(b.x, 34) }
    }
  }
  NM.shots = NM.shots.filter(b => !b.done && b.life > 0)
  // ── bombs from the ship: whistle down, blow a crater, kill anyone close
  for (const b of NM.bombs) {
    b.t += dt; b.vy += 300 * dt; b.y += b.vy * dt; b.x += (b.tx - b.x) * Math.min(1, dt * 1.5)
    ctx.fillStyle = "#3a3a46"; ctx.beginPath(); ctx.ellipse(b.x + off, b.y, 5, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#ff4040"; ctx.fillRect(b.x + off - 1, b.y - 11, 2, 3)
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x + off, b.y - 10); ctx.lineTo(b.x + off, b.y - 50); ctx.stroke()
    if (b.y >= lineY - 2) { b.done = true; nmBoom(b.x, lineY - 10, 60, true); if (Math.abs(b.x + off - W / 2) < W * 0.6) nmShake(4, 10); NM.craters.push({ x: b.x, r: 54 }); nmKill(b.x, 90) }
  }
  NM.bombs = NM.bombs.filter(b => !b.done); if (NM.craters.length > 40) NM.craters.splice(0, NM.craters.length - 40)
  // ── explosions + debris + purple blood
  for (const e of NM.booms) {
    e.t += dt; const u = e.t / e.life, x = e.x + off
    const fg = ctx.createRadialGradient(x, e.y, 0, x, e.y, e.r * (0.6 + u))
    fg.addColorStop(0, `rgba(255,255,220,${1 - u})`); fg.addColorStop(0.35, `rgba(255,170,50,${0.9 * (1 - u)})`); fg.addColorStop(1, "rgba(120,40,10,0)")
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, e.y - u * e.r * 0.4, e.r * (0.6 + u), 0, 7); ctx.fill()
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - u)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, e.y + 8, e.r * 1.8 * u, e.r * 0.35 * u, 0, 0, 7); ctx.stroke()
    ctx.fillStyle = `rgba(40,40,38,${0.5 * u * (1 - u) * 3})`; ctx.beginPath(); ctx.arc(x, e.y - e.r * u * 1.4, e.r * 0.7 * (0.5 + u), 0, 7); ctx.fill()
  }
  NM.booms = NM.booms.filter(e => e.t < e.life)
  for (const d of NM.debris) { d.life -= dt; d.vy += 600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y > lineY + 4) { d.y = lineY + 4; d.vx *= 0.5; d.vy = 0 }
    ctx.fillStyle = d.purple ? "#7a2a9a" : "#4a5a3a"; ctx.fillRect(d.x + off, d.y, d.purple ? 3 : 4, d.purple ? 3 : 4) }
  NM.debris = NM.debris.filter(d => d.life > 0).slice(-300)
  // pools of purple blood under the dead
  for (const p of NM.people) if (p.dead) { ctx.fillStyle = "rgba(110,30,140,0.7)"; ctx.beginPath(); ctx.ellipse(p.x + off, lineY + 2, Math.min(16, 4 + p.deadT * 10), 3, 0, 0, 7); ctx.fill() }
  // the ship's giant orb (charging while a fighter is close to losing), then dropping on the knockout
  if (NM.orb > 0 && NM.finale && NM.finale.stage !== "boom") {
    const sx = NM.ship?.x ?? W * 0.7, oy = NM.finale.stage === "drop" ? NM.finale.y : (NM.ship?.y ?? dockTop - 255) + 60, r = 10 + NM.orb * 60 + Math.sin(t * 20) * 2
    const og = ctx.createRadialGradient(sx, oy, 0, sx, oy, r * 1.8); og.addColorStop(0, "rgba(255,240,200,1)"); og.addColorStop(0.45, "rgba(255,120,40,0.95)"); og.addColorStop(0.7, "rgba(200,40,20,0.6)"); og.addColorStop(1, "rgba(200,40,20,0)")
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(sx, oy, r * 1.8, 0, 7); ctx.fill()
    for (let k = 0; k < 8; k++) { const a = t * 3 + k * 0.785, rr = r * (2.2 + Math.sin(t * 7 + k)); ctx.strokeStyle = "rgba(255,180,90,0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * rr, oy + Math.sin(a) * rr); ctx.lineTo(sx + Math.cos(a) * r, oy + Math.sin(a) * r); ctx.stroke() }
  }
  if (NM.finale?.stage === "boom") {                                                 // the mushroom of fire over the horizon
    const u = Math.min(1, NM.finale.t / 2.5), x = W * 0.5 + shift(0.3, W), base = dockTop - 20
    const fb = ctx.createRadialGradient(x, base - 160 * u, 0, x, base - 160 * u, 80 + 320 * u); fb.addColorStop(0, `rgba(255,255,230,${1 - u * 0.4})`); fb.addColorStop(0.4, `rgba(255,150,40,${0.9 - u * 0.3})`); fb.addColorStop(1, "rgba(120,30,10,0)")
    ctx.fillStyle = fb; ctx.beginPath(); ctx.arc(x, base - 160 * u, 80 + 320 * u, 0, 7); ctx.fill()
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - u)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, base, 200 + 1800 * u, 30 + 120 * u, 0, 0, 7); ctx.stroke()
  }
  // the knockout blast lights the whole sky
  if (NM.bigBoom > 0) { NM.bigBoom -= dt; ctx.fillStyle = `rgba(255,245,220,${Math.min(0.85, NM.bigBoom * 0.35)})`; ctx.fillRect(padL, 0, padR - padL, coverBottom) }
}
function nmKill(x, r) {
  for (const p of NM.people) if (!p.dead && Math.abs(p.x - x) < r) {
    p.dead = true; p.deadT = 0; p.warrior = false; NM.kills++
    for (let i = 0; i < 10; i++) NM.debris.push({ x: p.x, y: NM.lineY || 0, vx: (nmRnd() - 0.5) * 160, vy: -nmRnd() * 220, life: 0.8, purple: true })
  }
}

// ───────────────────────────── THE BARATIE (One Piece; render-only, wall clock, own PRNG) ─────────────────────────────
// Ken's pier (Street Fighter III) as the Baratie, the floating seafood restaurant out at sea: open ocean to the horizon,
// a pirate galleon moored alongside with its crew cheering the fight, a Marine warship and a pirate ship trading cannon
// fire far out (splashes, now and then a water spout over the railing), a Sea King surfacing — on the knockout it rises
// and swallows the warship whole. One Piece fighters stand at the railing watching (the shared reactive crowd), the cooks
// in the doorway yell when the fight gets near the kitchen and throw plates on big hits, and seagulls scatter.
let _brSeed = 0x2545f491
const brRnd = () => { _brSeed ^= _brSeed << 13; _brSeed ^= _brSeed >>> 17; _brSeed ^= _brSeed << 5; return (_brSeed >>> 0) / 4294967296 }
const BR_CROWD = [["sanji", 0.14, 0], ["luffy", 0.33, 0], ["zoro", 0.45, 0], ["buggy", 0.66, 0], ["arlong", 0.88, 0]]
const BRC = makeCrowd(BR_CROWD, 0.62)
const BR = { p1: null, last: 0, hp: new WeakMap(), balls: [], splashes: [], spray: [], plates: [], gulls: [], cheer: 0, shout: null, shoutT: 0,
  fireT: 1.5, shots: 0, kingT: 14, king: null, warship: { alive: true, sink: 0 }, broadside: 0, spouts: 0, plateCount: 0, eaten: false, geo: null }
export const baratieState = () => ({ shots: BR.shots, balls: BR.balls.length, splashes: BR.splashes.length, spouts: BR.spouts, plates: BR.plateCount, cheer: BR.cheer > 0,
  shout: BR.shoutT > 0 ? BR.shout : null, king: BR.king ? BR.king.stage : null, warship: BR.warship.alive, eaten: BR.eaten, broadside: BR.broadside, crowd: crowdState(BRC) })

// every visible copy of a piece tiled with tile:"mirror" (same layout as the back-layer loop): px → screen x
function mirrorCopies(G, w, padL, padR, repeat = false) {   // repeat: plain repeats (tile:"repeat"), no mirrored copies
  const out = []
  for (let k = Math.floor((padL - G.x0) / w); G.x0 + k * w < padR; k++) { const xx = G.x0 + k * w, odd = !repeat && Math.abs(k) % 2 === 1
    out.push({ k, X: px => odd ? xx + w - px * G.S : xx + px * G.S }) }
  return out
}
function brGeo(def, c, W, dockTop) {                       // where the pier picture sits on screen (same as its back layer)
  const pc = c.layout.pieces.pier, S = def.S, w = pc.w * S, h = pc.h * S
  const x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop + 1 * S - h
  return { pc, S, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S, horizon: y0 + 236 * S }
}

function brShip(ctx, x, y, s, marine, t, sinking = 0) {
  // a sailing ship seen side-on (s = scale; ~220 px long at s 1). Marine: white hull + blue stripes + white sails with a
  // blue gull-wave mark; pirate: dark hull, black sails with a white skull.
  ctx.save(); ctx.translate(x, y + sinking * 90); ctx.rotate(Math.sin(t * 0.9 + x) * 0.02 + sinking * 0.5); ctx.scale(s, s)
  ctx.fillStyle = marine ? "#eef2f6" : "#4a2e1a"
  ctx.beginPath(); ctx.moveTo(-110, -20); ctx.lineTo(110, -26); ctx.lineTo(90, 12); ctx.lineTo(-92, 12); ctx.closePath(); ctx.fill()
  ctx.fillStyle = marine ? "#2a5ab0" : "#2a1a0e"; ctx.fillRect(-100, -12, 196, 5)
  ctx.fillStyle = "#111"; for (let i = 0; i < 7; i++) ctx.fillRect(-80 + i * 26, -4, 8, 6)                  // gun ports
  ctx.fillStyle = marine ? "#eef2f6" : "#3a2414"; ctx.fillRect(70, -46, 40, 22)                                // stern castle
  ctx.fillStyle = "#5a3a20"; for (const mx of [-50, 10, 60]) ctx.fillRect(mx - 2, -150, 4, 130)                  // masts
  for (const [mx, top, wd] of [[-50, -140, 46], [10, -146, 54], [60, -128, 40]]) {
    ctx.fillStyle = marine ? "#fbfbf6" : "#1e1e22"
    ctx.beginPath(); ctx.moveTo(mx - wd / 2, top); ctx.quadraticCurveTo(mx + 6, top + 40, mx - wd / 2 + 2, top + 76); ctx.lineTo(mx + wd / 2 + 2, top + 76); ctx.quadraticCurveTo(mx + 12, top + 40, mx + wd / 2, top); ctx.closePath(); ctx.fill()
    if (mx === 10) {
      if (marine) { ctx.strokeStyle = "#2a5ab0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(mx + 4, top + 38, 12, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx - 8, top + 30); ctx.lineTo(mx + 4, top + 22); ctx.lineTo(mx + 16, top + 30); ctx.stroke() }
      else { ctx.fillStyle = "#f4f0e8"; ctx.beginPath(); ctx.arc(mx + 4, top + 32, 11, 0, 7); ctx.fill(); ctx.fillRect(mx - 2, top + 38, 12, 8)
        ctx.fillStyle = "#1e1e22"; ctx.fillRect(mx - 3, top + 29, 5, 5); ctx.fillRect(mx + 6, top + 29, 5, 5)
        ctx.strokeStyle = "#f4f0e8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx - 14, top + 46); ctx.lineTo(mx + 22, top + 64); ctx.moveTo(mx + 22, top + 46); ctx.lineTo(mx - 14, top + 64); ctx.stroke() }
    }
  }
  ctx.fillStyle = marine ? "#2a5ab0" : "#1e1e22"; ctx.beginPath(); ctx.moveTo(10, -150); ctx.lineTo(34, -144 + Math.sin(t * 4) * 3); ctx.lineTo(10, -138); ctx.fill()   // pennant
  ctx.restore()
}

function drawBaratieSea(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = BR.geo = brGeo(def, c, W, dockTop), hz = G.horizon
  const g = ctx.createLinearGradient(0, coverTop, 0, hz); g.addColorStop(0, "#2f6fe0"); g.addColorStop(1, "#bfe2ff")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, hz - coverTop)
  // clouds
  const cs = shift(0.05, W)
  for (let i = 0; i < 9; i++) { const x = ((i * 260 + t * 8 + cs) % (W + 600)) - 300 + padL, y = hz - 150 - 90 * _h(i + 3)
    ctx.fillStyle = "rgba(255,255,255,0.9)"; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + k * 26, y + Math.sin(k * 2.1) * 8, 22 + 10 * _h(i * 7 + k), 0, 7); ctx.fill() } }
  // the sea, horizon → deck
  const sg = ctx.createLinearGradient(0, hz, 0, dockTop); sg.addColorStop(0, "#3f8ad8"); sg.addColorStop(1, "#1a4a8a")
  ctx.fillStyle = sg; ctx.fillRect(padL, hz, padR - padL, dockTop - hz + 4)
  const ws = shift(0.3, W)
  for (let r = 0; r < 26; r++) { const u = r / 26, y = hz + (dockTop - hz) * u * u, a = 0.12 + 0.25 * u
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1 + u * 2; ctx.beginPath()
    for (let x = padL; x < padR; x += 40) { const xx = x + ((t * 20 * (1 + u) + r * 37 + ws * u) % 40); ctx.moveTo(xx, y + Math.sin(t * 2 + x * 0.05 + r) * 2 * u); ctx.lineTo(xx + 14 + u * 16, y + Math.sin(t * 2 + x * 0.05 + r) * 2 * u) }
    ctx.stroke() }
  // the far battle: the Marine warship (left) and a pirate ship (right) on the horizon
  const fs = shift(0.12, W), mx = W * 0.44 + fs, px = W * 0.9 + fs, sy = hz + 6
  if (BR.warship.alive || BR.warship.sink < 1) brShip(ctx, mx, sy, 0.42, true, t, BR.warship.sink)
  brShip(ctx, px, sy + 2, 0.36, false, t)
  BR.far = { mx, px, sy }
  // the Sea King
  const K = BR.king
  if (K) { const kx = K.x + fs, rise = K.stage === "up" ? Math.min(1, K.t / 1.2) : K.stage === "down" ? Math.max(0, 1 - K.t / 1.4) : 1, big = K.eat ? 1.5 : 1
    const H = Math.min(120 * big, hz - 90) * rise, base = hz + 30
    ctx.save(); ctx.beginPath(); ctx.rect(padL, coverTop, padR - padL, base - coverTop); ctx.clip()
    ctx.fillStyle = "#6a3a8a"; ctx.beginPath(); ctx.moveTo(kx - 40 * big, base); ctx.quadraticCurveTo(kx - 70 * big, base - H * 0.6, kx - 10 * big, base - H); ctx.lineTo(kx + 50 * big, base - H + 20 * big); ctx.quadraticCurveTo(kx + 30 * big, base - H * 0.5, kx + 46 * big, base); ctx.closePath(); ctx.fill()
    ctx.fillStyle = "#e8c070"; ctx.beginPath(); ctx.moveTo(kx - 20 * big, base); ctx.quadraticCurveTo(kx - 40 * big, base - H * 0.6, kx + 4 * big, base - H + 10); ctx.lineTo(kx + 14 * big, base - H + 14); ctx.quadraticCurveTo(kx - 10 * big, base - H * 0.5, kx + 6 * big, base); ctx.fill()   // belly
    const hx = kx + 10 * big, hy = base - H, open = K.roar ? 0.5 + 0.5 * Math.sin(t * 12) : 0.15
    ctx.fillStyle = "#7a4a9a"; ctx.beginPath(); ctx.ellipse(hx + 30 * big, hy - 6 * big, 60 * big, 26 * big, -0.2 - open * 0.3, 0, 7); ctx.fill()   // head
    ctx.fillStyle = "#3a0a1a"; ctx.beginPath(); ctx.ellipse(hx + 64 * big, hy + 10 * big, 30 * big, 10 * big + open * 22 * big, -0.1, 0, 7); ctx.fill()  // mouth
    ctx.fillStyle = "#fff"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(hx + (42 + i * 8) * big, hy + 2 * big); ctx.lineTo(hx + (46 + i * 8) * big, hy + (10 + open * 10) * big); ctx.lineTo(hx + (50 + i * 8) * big, hy + 2 * big); ctx.fill() }
    ctx.fillStyle = "#ffe040"; ctx.beginPath(); ctx.arc(hx + 34 * big, hy - 18 * big, 7 * big, 0, 7); ctx.fill(); ctx.fillStyle = "#200"; ctx.fillRect(hx + 33 * big, hy - 24 * big, 3 * big, 12 * big)
    ctx.fillStyle = "#c04060"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(hx - 10 * big - i * 16 * big, hy - 10 * big + i * 30 * big * rise); ctx.lineTo(hx - 34 * big - i * 16 * big, hy - 30 * big + i * 30 * big * rise); ctx.lineTo(hx - 20 * big - i * 16 * big, hy + 4 * big + i * 30 * big * rise); ctx.fill() }   // fins
    ctx.restore()
    ctx.fillStyle = "rgba(255,255,255,0.7)"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(kx + (i - 2.5) * 24 * big, base - 4, 8 + 6 * Math.sin(t * 6 + i), 0, 7); ctx.fill() }   // foam
  }
}

function drawBaratieMoored(ctx, def, c, { W, dockTop }) {
  // the pirate galleon tied up alongside, behind the railing, bobbing; its crew lines the rail
  const t = now(), G = BR.geo || brGeo(def, c, W, dockTop), x = G.X(640), y = G.Y(282) + Math.sin(t * 1.1) * 4, sc = 1.05 * G.S / 1.5
  brShip(ctx, x, y, sc, false, t)
  const ev = BR.cheer > 0
  for (let i = 0; i < 9; i++) {
    const px = x + (-95 + i * 20) * sc / 1.05, py = y - 24 * sc, j = ev ? Math.abs(Math.sin(t * 10 + i)) * 8 : Math.max(0, Math.sin(t * 2 + i * 1.7)) * 2
    ctx.fillStyle = ["#d8483a", "#3a6ad8", "#e8c040", "#4aa060"][i % 4]; ctx.fillRect(px - 5, py - 16 - j, 10, 14)
    ctx.fillStyle = ["#f1c9a5", "#c58c64", "#8d5b3e"][i % 3]; ctx.beginPath(); ctx.arc(px, py - 21 - j, 5, 0, 7); ctx.fill()
    ctx.fillStyle = ["#c02020", "#202020", "#2050c0"][i % 3]; ctx.fillRect(px - 5, py - 27 - j, 10, 3)       // bandanas
    if (ev || i % 3 === 0) { ctx.strokeStyle = "#ccc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 5, py - 14 - j); ctx.lineTo(px + 10, py - 30 - j); ctx.stroke() }   // raised cutlass
  }
  BR.moored = { x, y }
}

function baratieFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = BR.geo || brGeo(def, c, W, dockTop), S = def.S
  if (F[0] !== BR.p1) { BR.p1 = F[0]; BR.balls = []; BR.splashes = []; BR.spray = []; BR.plates = []; BR.king = null; BR.warship = { alive: true, sink: 0 }; BR.eaten = false; BR.spouts = 0; BR.plateCount = 0; BR.broadside = 0; BR.shots = 0; BR.mShots = 0; BR.hp = new WeakMap(); BR.kingT = 14 }
  const dt = Math.min(0.05, Math.max(0, t - (BR.last || t))); BR.last = t
  // the deck carries on toward the viewer
  const dbot = dockTop + c.layout.pieces.deck.h * S
  if (coverBottom > dbot) { const gg = ctx.createLinearGradient(0, dbot, 0, coverBottom); gg.addColorStop(0, "#f0c68e"); gg.addColorStop(1, "#b88450"); ctx.fillStyle = gg; ctx.fillRect(padL, dbot, padR - padL, coverBottom - dbot)
    ctx.strokeStyle = "rgba(90,50,20,0.35)"; ctx.lineWidth = 2; for (let x = padL - 200; x < padR + 200; x += 46) { ctx.beginPath(); ctx.moveTo(x + shift(1, W), dbot); ctx.lineTo(x + (x - W / 2) * 0.4 + shift(1, W), coverBottom); ctx.stroke() } }
  // the fight → events
  let bigHit = false, ko = false, hitX = W / 2
  for (const f of F) { const hp = f.health ?? 0, was = BR.hp.get(f); BR.hp.set(f, hp); if (hp <= 0) ko = true; if (was != null && was - hp >= 60) { bigHit = true; hitX = f.x + (f.w || 50) / 2 } }
  BR.cheer = Math.max(0, BR.cheer - dt); if (bigHit || ko) BR.cheer = ko ? 4 : 1.4
  // the BARATIE sign (over the old crab sign), a barrel stack where the post-sign was
  for (const cp of mirrorCopies(G, c.layout.pieces.pier.w * S, padL, padR)) { const sx = cp.X(c.layout.pieces.pier.sign[0]), sy = G.Y(c.layout.pieces.pier.sign[1]), k = S / 1.5, sw = Math.sin(t * 1.2) * 0.02
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(sw * 0.3)
    { const bw = 168 * S, bh = 162 * S; ctx.fillStyle = "#6a3e1c"; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.fillStyle = "#8a5428"; for (let i = 0; i < 6; i++) ctx.fillRect(-bw / 2 + 4, -bh / 2 + 4 + i * (bh - 8) / 6, bw - 8, (bh - 8) / 6 - 4)
      ctx.strokeStyle = "#3a200c"; ctx.lineWidth = 5; ctx.strokeRect(-bw / 2, -bh / 2, bw, bh); ctx.fillStyle = "#c8c8c8"; for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(qx * (bw / 2 - 10), qy * (bh / 2 - 10), 4, 0, 7); ctx.fill() } }
    ctx.rotate(sw); ctx.scale(k * 1.15, k * 1.15)
    ctx.fillStyle = "#f08a2a"; ctx.beginPath(); ctx.moveTo(-90, 0); ctx.quadraticCurveTo(-60, -66, 40, -48); ctx.lineTo(96, -70); ctx.lineTo(80, 0); ctx.lineTo(96, 70); ctx.lineTo(40, 48); ctx.quadraticCurveTo(-60, 66, -90, 0); ctx.closePath(); ctx.fill()   // fish
    ctx.strokeStyle = "#6a2a0a"; ctx.lineWidth = 4; ctx.stroke()
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-58, -12, 11, 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(-55, -12, 5, 0, 7); ctx.fill()
    ctx.fillStyle = "#c83a1a"; ctx.beginPath(); ctx.moveTo(-90, 6); ctx.lineTo(-70, 14); ctx.lineTo(-88, 18); ctx.fill()
    ctx.font = "900 26px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff8e0"; ctx.strokeStyle = "#5a1a0a"; ctx.lineWidth = 5
    ctx.strokeText("BARATIE", 10, 8); ctx.fillText("BARATIE", 10, 8)
    ctx.restore()
    const bx = cp.X(c.layout.pieces.pier.barrel[0]), by = G.Y(c.layout.pieces.pier.barrel[1])
    for (const [ox, oy] of [[-34, 0], [0, 0], [34, 0], [-17, -50], [17, -50]]) { const x = bx + ox * k, y = by + oy * k
      ctx.fillStyle = "#8a5a2a"; ctx.beginPath(); ctx.ellipse(x, y - 24 * k, 17 * k, 25 * k, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#3a3a3a"; ctx.fillRect(x - 17 * k, y - 38 * k, 34 * k, 3 * k); ctx.fillRect(x - 17 * k, y - 12 * k, 34 * k, 3 * k) } }
  // the cooks in the doorway: shout when the fight comes near the kitchen, throw plates on big hits
  { const dx = G.X(c.layout.pieces.pier.door[0]), dy = G.Y(c.layout.pieces.pier.door[1]), k = S / 1.5
    const near = F.some(f => Math.abs(f.x + (f.w || 50) / 2 - dx) < 260)
    if (near && BR.shoutT <= 0 && Math.sin(t * 1.7) > 0.9) { BR.shout = ["OI! NOT IN MY RESTAURANT!", "TAKE IT OUTSIDE!", "WATCH THE TABLES!"][Math.floor(t) % 3]; BR.shoutT = 1.6 }
    if (bigHit) { for (let i = 0; i < 3; i++) BR.plates.push({ x: dx + 20, y: dy - 60 * k, vx: 260 + brRnd() * 300, vy: -240 - brRnd() * 200, r: 0, meat: i % 2 === 0, life: 2 }); BR.plateCount += 3; if (BR.shoutT <= 0) { BR.shout = "HEY! THAT'S GOOD FOOD!"; BR.shoutT = 1.4 } }
    BR.shoutT = Math.max(0, BR.shoutT - dt)
    for (let i = 0; i < 2; i++) { const x = dx + (i ? 34 : 0) * k, y = dy, wave = (near || bigHit) ? Math.sin(t * 12 + i) : Math.sin(t * 2 + i) * 0.2
      ctx.fillStyle = "#f8f8f4"; ctx.fillRect(x - 10 * k, y - 50 * k, 20 * k, 40 * k); ctx.fillStyle = "#2a2a3a"; ctx.fillRect(x - 9 * k, y - 12 * k, 18 * k, 12 * k)
      ctx.fillStyle = "#f1c9a5"; ctx.fillRect(x - 7 * k, y - 63 * k, 14 * k, 13 * k)
      ctx.fillStyle = "#fff"; ctx.fillRect(x - 9 * k, y - 82 * k, 18 * k, 19 * k); ctx.beginPath(); ctx.arc(x, y - 82 * k, 11 * k, 0, 7); ctx.fill()   // chef hat
      ctx.save(); ctx.translate(x + 10 * k, y - 46 * k); ctx.rotate(-1.2 + wave * 0.8); ctx.fillStyle = "#f8f8f4"; ctx.fillRect(0, -3 * k, 18 * k, 6 * k); ctx.fillStyle = "#999"; ctx.fillRect(16 * k, -2 * k, 16 * k, 3 * k); ctx.beginPath(); ctx.arc(34 * k, 0, 5 * k, 0, 7); ctx.fill(); ctx.restore() }   // ladle
    if (BR.shoutT > 0 && BR.shout) { ctx.save(); ctx.font = "900 14px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const tw = ctx.measureText(BR.shout).width + 14, bx = dx + 60, by = dy - 110 * k
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(bx - tw / 2, by - 12, tw, 24); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#b01010"; ctx.fillText(BR.shout, bx, by); ctx.restore() } }
  // One Piece fighters at the railing watching (real sprites; the two fighting are left out)
  drawCrowd(ctx, BRC, { W, feet: G.Y(318), sh: shift(0.9, W) })
  // ── the sea battle: cannon fire both ways across the horizon; the moored galleon joins in on big hits
  const far = BR.far || { mx: W * 0.22, px: W * 0.8, sy: G.horizon }, hz = G.horizon
  BR.fireT -= dt
  const fire = (x0, y0, x1, y1, dur, spout) => { BR.shots++; BR.balls.push({ x0, y0, x1, y1, t: 0, dur, spout }); BR.splashes.push({ x: x0, y: y0, t: 0, flash: true }) }
  if (BR.fireT <= 0 && !ko) { BR.fireT = 1.2 + brRnd() * 2
    if (BR.warship.alive && brRnd() < 0.55) { const near = (BR.mShots = (BR.mShots || 0) + 1) % 3 === 0; fire(far.mx + 20, far.sy - 10, near ? W * (0.2 + brRnd() * 0.6) : far.px + (brRnd() - 0.5) * 120, near ? G.Y(250) : far.sy + 4, near ? 1.6 : 1.2, near) }
    else fire(far.px - 20, far.sy - 10, BR.warship.alive ? far.mx + (brRnd() - 0.5) * 120 : far.mx + 300, far.sy + 4, 1.2, false) }
  if (bigHit && BR.moored && BR.warship.alive) { BR.broadside++; for (let i = 0; i < 5; i++) fire(BR.moored.x - 150 + i * 60, BR.moored.y - 10, far.mx + (brRnd() - 0.5) * 160, far.sy + 4, 1.3 + i * 0.08, false) }
  for (const b of BR.balls) { b.t += dt; const u = Math.min(1, b.t / b.dur), x = b.x0 + (b.x1 - b.x0) * u, y = b.y0 + (b.y1 - b.y0) * u - Math.sin(u * Math.PI) * (b.spout ? 160 : 60)
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x, y, b.spout ? 5 : 2.5, 0, 7); ctx.fill()
    if (u >= 1) { b.done = true; BR.splashes.push({ x: b.x1, y: b.y1, t: 0, big: b.spout }); if (b.spout) { BR.spouts++; for (let i = 0; i < 40; i++) BR.spray.push({ x: b.x1 + (brRnd() - 0.5) * 60, y: b.y1, vx: (brRnd() - 0.5) * 200, vy: -300 - brRnd() * 400, life: 1.4 }); camera.shake?.(3, 8) } } }
  BR.balls = BR.balls.filter(b => !b.done)
  // ── the Sea King: surfaces now and then; on the knockout it rises, roars and swallows the warship whole
  BR.kingT -= dt
  if (!BR.king && (BR.kingT <= 0 || (ko && !BR.eaten))) { BR.kingT = 16 + brRnd() * 10; BR.king = { x: ko ? (far.mx - shift(0.12, W)) : W * (0.3 + brRnd() * 0.25), stage: "up", t: 0, roar: false, eat: ko } }
  if (ko && BR.king && !BR.king.eat && !BR.eaten) { BR.king.eat = true; BR.king.x = far.mx - shift(0.12, W); BR.king.stage = "up"; BR.king.t = 0 }
  if (BR.king) { const K = BR.king; K.t += dt
    if (K.stage === "up" && K.t > 1.2) { K.stage = "hold"; K.t = 0; K.roar = true; camera.shake?.(K.eat ? 8 : 4, K.eat ? 30 : 14) }
    else if (K.stage === "hold" && K.t > (K.eat ? 1.6 : 2.2)) { K.stage = "down"; K.t = 0; K.roar = false; if (K.eat) { BR.eaten = true; BR.warship.alive = false; for (let i = 0; i < 6; i++) BR.splashes.push({ x: far.mx + (i - 3) * 30, y: far.sy, t: 0, big: true }); camera.shake?.(10, 30) } }
    else if (K.stage === "down" && K.t > 1.4) BR.king = null }
  if (!BR.warship.alive) BR.warship.sink = Math.min(1, BR.warship.sink + dt * 0.6)
  // splashes, muzzle flashes, spray over the railing
  for (const s of BR.splashes) { s.t += dt; const u = s.t / (s.flash ? 0.25 : s.big ? 1 : 0.6)
    if (s.flash) { ctx.fillStyle = `rgba(255,220,120,${1 - u})`; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(200,200,200,${0.6 * (1 - u)})`; ctx.beginPath(); ctx.arc(s.x + u * 20, s.y - u * 16, 6 + u * 14, 0, 7); ctx.fill() }
    else { const h = (s.big ? 140 : 26) * Math.sin(Math.min(1, u) * Math.PI); ctx.fillStyle = `rgba(240,250,255,${0.85 * (1 - u * 0.5)})`
      ctx.beginPath(); ctx.moveTo(s.x - (s.big ? 30 : 6), s.y); ctx.quadraticCurveTo(s.x, s.y - h * 1.2, s.x + (s.big ? 30 : 6), s.y); ctx.fill() }
    s.done = u >= 1 }
  BR.splashes = BR.splashes.filter(s => !s.done)
  for (const p of BR.spray) { p.life -= dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = `rgba(230,245,255,${Math.min(0.9, p.life)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill() }
  BR.spray = BR.spray.filter(p => p.life > 0 && p.y < coverBottom)
  // flying plates + meat
  for (const p of BR.plates) { p.life -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 12
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r)
    if (p.meat) { ctx.fillStyle = "#a0502a"; ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#f4f0e0"; ctx.fillRect(10, -2, 10, 4); ctx.beginPath(); ctx.arc(21, -3, 3, 0, 7); ctx.arc(21, 3, 3, 0, 7); ctx.fill() }
    else { ctx.fillStyle = "#fbfbf8"; ctx.beginPath(); ctx.ellipse(0, 0, 13, 5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#5a8ac0"; ctx.lineWidth = 1.5; ctx.stroke() }
    ctx.restore() }
  BR.plates = BR.plates.filter(p => p.life > 0 && p.y < coverBottom)
  // seagulls: circle lazily, scatter on big hits
  if (BR.gulls.length < 7) BR.gulls.push({ x: padL + brRnd() * (padR - padL), y: hz - 60 - brRnd() * 140, a: brRnd() * 7, r: 40 + brRnd() * 80, flee: 0 })
  for (const g of BR.gulls) { if (bigHit) g.flee = 1.6; g.flee = Math.max(0, g.flee - dt); g.a += dt * (g.flee ? 3 : 0.8)
    const x = g.x + Math.cos(g.a) * g.r + (g.flee ? (g.a * 40) : 0), y = g.y + Math.sin(g.a) * g.r * 0.25 - (g.flee ? 60 * (1.6 - g.flee) : 0), w = Math.sin(t * (g.flee ? 20 : 8) + g.r) * 5
    ctx.strokeStyle = "#f8f8f8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 9, y - w); ctx.quadraticCurveTo(x - 4, y - 4, x, y); ctx.quadraticCurveTo(x + 4, y - 4, x + 9, y - w); ctx.stroke() }
  BRC.cheerHold = BR.cheer
}

// ───────────────────────────── KRYPTON — THE LAST DAY (render-only, wall clock, own PRNG) ─────────────────────────────
// Necro's hall (Street Fighter III) as Krypton's citadel, its dome torn open. Through the hole and the windows: the
// swollen red sun, the crystal city cracking apart, Brainiac's skull ship hauling a domed city up in its tractor beam,
// Brainiac himself as a giant hologram, his skull drones strafing the city — and Kryptonian soldiers (the game's real
// flying sprites, darkened as armored troops, tiny with distance) launching up to smash and heat-vision the drones down.
// Big hits draw a beam from the skull ship; a fighter close to losing sets the planet quaking; the knockout is the end
// of Krypton — the horizon erupts in a white-green blast, a long heavy shake, and a small rocket streaks away to space.
let _krSeed = 0x6d2b79f5
const krRnd = () => { _krSeed ^= _krSeed << 13; _krSeed ^= _krSeed >>> 17; _krSeed ^= _krSeed << 5; return (_krSeed >>> 0) / 4294967296 }
const KR = { p1: null, last: 0, hp: new WeakMap(), drones: [], troops: [], beams: [], booms: [], debris: [], embers: [], spawnD: 0, spawnT: 0, launchT: 0,
  dronesDown: 0, troopsDown: 0, strikes: 0, quake: 0, quakeShakes: 0, end: null, pod: null, say: null, sayT: 0, cityLost: 0, imgs: null, geo: null }
export const kryptonState = () => ({ drones: KR.drones.length, troops: KR.troops.length, dronesDown: KR.dronesDown, troopsDown: KR.troopsDown, strikes: KR.strikes,
  quaking: KR.quake > 0, quakeShakes: KR.quakeShakes, end: KR.end ? KR.end.stage : null, pod: !!KR.pod, say: KR.sayT > 0 ? KR.say : null,
  sprites: KR.imgs ? KR.imgs.map(i => ready(i.im)) : [] })
function krImgs() {
  if (!KR.imgs) KR.imgs = [{ src: "./superman_flycruise_uniform.png", f: 1, w: 59, h: 57, diag: true }, { src: "./homelander_flyCruise_uniform.png", f: 4, w: 84, h: 77 }]
    .map(d => { const im = new Image(); im.src = d.src; return { ...d, im } })
  return KR.imgs
}
function krGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.hall, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop + 1 * S - h
  return { pc, S, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S, horizon: y0 + 372 * S }   // below the windows: they look out on the sky
}
function krSay(s, d = 2.2) { KR.say = s; KR.sayT = d }
function krBoom(x, y, r, col = "255,170,60") { KR.booms.push({ x, y, r, t: 0, life: 0.9, col }) }

function drawKryptonSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = KR.geo = krGeo(def, c, W, dockTop), hz = G.horizon, ss = shift(0.05, W), end = KR.end
  const g = ctx.createLinearGradient(0, coverTop, 0, hz); g.addColorStop(0, "#2a0606"); g.addColorStop(0.55, "#8a1e0c"); g.addColorStop(1, "#f0702a")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  // Rao — the swollen red sun
  { const x = W * 0.7 + ss, y = G.Y(120), r = 90 + Math.sin(t * 0.8) * 3, gl = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.4)
    gl.addColorStop(0, "rgba(255,120,40,0.7)"); gl.addColorStop(1, "rgba(255,60,20,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill()
    const sg = ctx.createRadialGradient(x - 20, y - 20, 10, x, y, r); sg.addColorStop(0, "#ffd080"); sg.addColorStop(0.5, "#ff5a1a"); sg.addColorStop(1, "#b0200a")
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill() }
  // the crystal city on the horizon, cracking (spires lean and fall as the end nears)
  const cs = shift(0.15, W)
  for (let i = 0; i < 26; i++) {
    const fx = i / 25, x = padL - 100 + fx * (padR - padL + 200) + cs, h = 80 + 160 * _h(i * 5 + 1), w = 14 + 22 * _h(i * 5 + 2)
    const fall = KR.cityLost > _h(i * 5 + 3) ? Math.min(1.2, (KR.cityLost - _h(i * 5 + 3)) * 3) : 0
    ctx.save(); ctx.translate(x, hz); ctx.rotate(fall * (_h(i) < 0.5 ? -1 : 1))
    const cg = ctx.createLinearGradient(0, -h, 0, 0); cg.addColorStop(0, "rgba(230,250,255,0.95)"); cg.addColorStop(1, "rgba(120,180,220,0.85)")
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w * 0.3, -h * 0.7); ctx.lineTo(0, -h); ctx.lineTo(w * 0.3, -h * 0.75); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill()
    ctx.restore()
  }
  // the land splitting: glowing fissures along the horizon (wider while the planet quakes / at the end)
  const crack = 0.4 + (KR.quake > 0 ? 0.6 : 0) + (end ? 2 : 0)
  ctx.strokeStyle = `rgba(255,${end ? 230 : 140},60,${Math.min(1, 0.5 + crack * 0.25)})`; ctx.lineWidth = 2 + crack * 2
  for (let i = 0; i < 6; i++) { ctx.beginPath(); let x = padL + i * (padR - padL) / 6 + cs * 0.5, y = hz + 4; ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += 18 + 14 * _h(i * 9 + k); y += (_h(i * 13 + k) - 0.5) * 10; ctx.lineTo(x, y) } ctx.stroke() }
  ctx.fillStyle = "#1a0a08"; ctx.fillRect(padL, hz + 2, padR - padL, dockTop - hz)
  // Brainiac's skull ship, hauling a domed city up in its tractor beam
  const bx = W * 0.4 + shift(0.1, W), by = G.Y(150) + Math.sin(t * 0.5) * 8 - (end && end.t > 1 ? (end.t - 1) * 90 : 0)
  KR.ship = { x: bx, y: by }
  { const beam = ctx.createLinearGradient(0, by + 60, 0, hz); beam.addColorStop(0, "rgba(120,255,140,0.35)"); beam.addColorStop(1, "rgba(120,255,140,0.05)")
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(bx - 30, by + 60); ctx.lineTo(bx + 30, by + 60); ctx.lineTo(bx + 110, hz); ctx.lineTo(bx - 110, hz); ctx.closePath(); ctx.fill()
    const ky = hz - 40 - ((t * 6) % 140) * 0.3 - (end ? Math.min(200, end.t * 80) : 0)                 // the city in the bottle, rising
    ctx.fillStyle = "rgba(210,240,255,0.5)"; ctx.beginPath(); ctx.arc(bx, ky, 34, Math.PI, 0); ctx.fill(); ctx.fillStyle = "rgba(240,250,255,0.9)"
    for (let i = 0; i < 7; i++) ctx.fillRect(bx - 26 + i * 8, ky - 8 - 18 * _h(i + 40), 5, 8 + 18 * _h(i + 40))
    ctx.fillStyle = "#3a3a30"; ctx.fillRect(bx - 36, ky, 72, 6)
    for (let i = 0; i < 6; i++) { const tx = bx - 90 + i * 36, sw = Math.sin(t * 1.5 + i) * 10; ctx.strokeStyle = "#1e3a22"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tx * 0.5 + bx * 0.5, by + 40); ctx.quadraticCurveTo(tx + sw, by + 100, tx + sw * 2, by + 150 + 20 * _h(i)); ctx.stroke() }   // tentacle cables
    ctx.fillStyle = "#1a2a1c"; ctx.beginPath(); ctx.ellipse(bx, by, 120, 80, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(bx + 70, by + 60); ctx.lineTo(bx - 70, by + 60); ctx.closePath(); ctx.fill()   // the skull
    ctx.fillStyle = "#2a4a2c"; ctx.beginPath(); ctx.ellipse(bx, by - 30, 100, 40, 0, Math.PI, 0); ctx.fill()
    for (const k of [-1, 1]) { const eg = ctx.createRadialGradient(bx + k * 42, by + 4, 2, bx + k * 42, by + 4, 26); eg.addColorStop(0, "rgba(200,255,200,1)"); eg.addColorStop(1, "rgba(60,255,90,0)"); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(bx + k * 42, by + 4, 26, 0, 7); ctx.fill() }
    ctx.fillStyle = "#0a140a"; for (let i = 0; i < 6; i++) ctx.fillRect(bx - 36 + i * 13, by + 44, 9, 16) }
  // Brainiac — a giant flickering hologram over the battle
  { const hx = W * 0.6 + shift(0.08, W), hy = G.Y(150), fl = 0.55 + 0.15 * Math.sin(t * 13) + (Math.sin(t * 2.3) > 0.97 ? -0.3 : 0)
    ctx.save(); ctx.globalAlpha = Math.max(0.15, fl); ctx.translate(hx, hy); ctx.scale(0.62, 0.62); ctx.translate(-hx, -hy)
    ctx.fillStyle = "rgba(90,200,110,0.5)"; ctx.beginPath(); ctx.ellipse(hx, hy, 70, 88, 0, 0, 7); ctx.fill()                       // head
    ctx.fillStyle = "rgba(130,60,160,0.55)"; ctx.beginPath(); ctx.moveTo(hx - 120, hy + 160); ctx.lineTo(hx - 60, hy + 70); ctx.lineTo(hx + 60, hy + 70); ctx.lineTo(hx + 120, hy + 160); ctx.closePath(); ctx.fill()   // collar
    ctx.fillStyle = "rgba(240,250,255,0.9)"; for (const [dx, dy] of [[-30, -60], [0, -78], [30, -60], [-46, -30], [46, -30]]) { ctx.beginPath(); ctx.arc(hx + dx, hy + dy, 5, 0, 7); ctx.fill() }   // head nodes
    ctx.fillStyle = "rgba(255,60,60,0.95)"; ctx.fillRect(hx - 32, hy - 6, 20, 6); ctx.fillRect(hx + 12, hy - 6, 20, 6)                   // eyes
    ctx.strokeStyle = "rgba(160,255,180,0.35)"; ctx.lineWidth = 1; for (let y = hy - 90; y < hy + 160; y += 5) { ctx.beginPath(); ctx.moveTo(hx - 120, y); ctx.lineTo(hx + 120, y); ctx.stroke() }   // scanlines
    ctx.restore()
    KR.holo = { x: hx, y: hy }
    if (KR.sayT > 0 && KR.say) { ctx.save(); ctx.font = "900 17px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(170,255,190,0.95)"; ctx.shadowColor = "#2f8"; ctx.shadowBlur = 10; ctx.fillText(KR.say, hx, hy + 120); ctx.restore() }
  }
  krBattle(ctx, { W, padL, padR, G, hz, t })
}

// the sky battle — drawn BEHIND the hall piece, so it only shows through the torn roof and the windows
function krBattle(ctx, { W, padL, padR, G, hz, t }) {
  const dt = Math.min(0.05, Math.max(0, t - (KR.lastB || t))); KR.lastB = t
  const imgs = krImgs(), ended = KR.end && KR.end.stage !== "charge"
  // ── spawns: Brainiac's skull drones swarm in, Kryptonian soldiers launch up from the city
  KR.spawnD -= dt; KR.spawnT -= dt
  if (!ended && KR.spawnD <= 0 && KR.drones.filter(d => !d.down).length < 8) { KR.spawnD = 0.5 + krRnd() * 0.9; const fromL = krRnd() < 0.5, sc = 0.5 + krRnd() * 0.7
    KR.drones.push({ x: fromL ? padL - 40 : padR + 40, y: G.Y(115) + krRnd() * (hz - G.Y(115) - 20), dir: fromL ? 1 : -1, vx: (fromL ? 1 : -1) * (120 + krRnd() * 140) * sc, sc, fireT: 0.6 + krRnd() * 1.5, down: false, vy: 0, seed: krRnd() * 99 }) }
  if (!ended && KR.spawnT <= 0 && KR.troops.filter(s => !s.down).length < 7) { KR.spawnT = 0.6 + krRnd() * 0.9; const sc = 0.32 + krRnd() * 0.3, k = krRnd() < 0.4 ? 0 : 1
    KR.troops.push({ x: padL + 80 + krRnd() * (padR - padL - 160), y: hz - 4, vx: 0, vy: -(260 + krRnd() * 200), sc, k, target: null, heatT: 0.8 + krRnd(), down: false, seed: krRnd() * 99, rise: true }) }
  // ── drones: skull drones with green beams at the city and at the soldiers (no soldier lost for 5 s → the next shot goes at one)
  KR.noKill = (KR.noKill || 0) + dt
  for (const d of KR.drones) {
    if (d.down) { d.vy += 360 * dt; d.y += d.vy * dt; d.x += d.vx * dt * 0.3; if (d.y > hz) { d.gone = true; krBoom(d.x, hz - 6, 26 * d.sc + 10) } }
    else { d.x += d.vx * dt; d.y += Math.sin(t * 2 + d.seed) * 14 * dt; d.fireT -= dt
      if (d.fireT <= 0) { d.fireT = 1 + krRnd() * 1.6; const prey = krRnd() < 0.5 || KR.noKill > 5 ? KR.troops.filter(s => !s.down).sort((a, b) => Math.abs(a.x - d.x) - Math.abs(b.x - d.x))[0] : null
        if (prey) { KR.beams.push({ x0: d.x, y0: d.y, x1: prey.x, y1: prey.y, t: 0, life: 0.25, col: "120,255,140", w: 2 }); prey.down = true; prey.vy = -40; KR.troopsDown++; KR.noKill = 0 }
        else { const tx = d.x + d.dir * 80 + (krRnd() - 0.5) * 120; KR.beams.push({ x0: d.x, y0: d.y, x1: tx, y1: hz, t: 0, life: 0.3, col: "120,255,140", w: 2 }); krBoom(tx, hz - 4, 22) } }
      if (d.x < padL - 120 || d.x > padR + 120) d.gone = true }
    const x = d.x, y = d.y, s = d.sc
    ctx.save(); ctx.translate(x, y); if (d.down) ctx.rotate(t * 6); ctx.scale(s, s)
    ctx.fillStyle = "#24402a"; ctx.beginPath(); ctx.ellipse(0, 0, 22, 15, 0, Math.PI, 0); ctx.lineTo(14, 10); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill()
    ctx.fillStyle = d.down ? "#ff8040" : "#8aff9a"; ctx.beginPath(); ctx.arc(-8, 0, 4, 0, 7); ctx.arc(8, 0, 4, 0, 7); ctx.fill()
    ctx.strokeStyle = "#24402a"; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8, 10); ctx.quadraticCurveTo(i * 12, 20, i * 8 + Math.sin(t * 6 + i) * 4, 28); ctx.stroke() }
    ctx.restore()
    if (d.down) { ctx.fillStyle = "rgba(40,30,30,0.5)"; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.arc(x - d.vx * k * 0.02, y - d.vy * k * 0.02, 3 + k * 2, 0, 7); ctx.fill() } }
  }
  KR.drones = KR.drones.filter(d => !d.gone)
  // ── Kryptonian soldiers (real sprites): streak up from the city, lock onto a drone, ram it or burn it with heat vision
  for (const s of KR.troops) {
    if (s.down) { s.vy += 300 * dt; s.y += s.vy * dt; s.x += s.vx * dt * 0.5; if (s.y > hz) { s.gone = true; krBoom(s.x, hz - 4, 14) } }
    else {
      if (!s.target || s.target.down || s.target.gone) s.target = KR.drones.filter(d => !d.down).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0] || null
      const T = s.target
      if (T) { const dx = T.x - s.x, dy = T.y - s.y, d = Math.hypot(dx, dy) || 1, sp = 420
        s.vx += (dx / d * sp - s.vx) * Math.min(1, dt * 3); s.vy += (dy / d * sp - s.vy) * Math.min(1, dt * 3); s.heatT -= dt
        if (d < 24) { T.down = true; T.vy = -120; KR.dronesDown++; krBoom(T.x, T.y, 30 * T.sc + 12); s.target = null }
        else if (s.heatT <= 0 && d < 260) { s.heatT = 1.2 + krRnd(); KR.beams.push({ x0: s.x, y0: s.y, x1: T.x, y1: T.y, t: 0, life: 0.3, col: "255,50,40", w: 3 }); T.down = true; T.vy = -60; KR.dronesDown++; krBoom(T.x, T.y, 24 * T.sc + 10) } }
      else { s.vy += (-300 - s.vy) * dt }
      s.x += s.vx * dt; s.y += s.vy * dt
      if (s.y < G.Y(40) - 300 || s.x < padL - 200 || s.x > padR + 200) s.gone = true }
    const I = imgs[s.k]
    if (ready(I.im)) { const fr = I.f > 1 ? Math.floor(t * 10 + s.seed) % I.f : 0, ang = Math.atan2(s.vy, s.vx), face = s.vx < 0 ? -1 : 1
      ctx.save(); ctx.translate(s.x, s.y); ctx.filter = "grayscale(0.55) brightness(0.8) contrast(1.15)"
      if (I.diag) { ctx.rotate(ang + Math.PI / 4); ctx.scale(s.sc * 0.9, s.sc * 0.9) } else { ctx.rotate(face > 0 ? ang : ang + Math.PI); ctx.scale(face * s.sc, s.sc) }
      if (s.down) ctx.rotate(t * 5)
      ctx.drawImage(I.im, fr * I.w, 0, I.w, I.h, -I.w / 2, -I.h / 2, I.w, I.h); ctx.restore()
      if (s.rise && !s.down) { ctx.strokeStyle = "rgba(200,230,255,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); ctx.stroke() } }   // speed streak
  }
  KR.troops = KR.troops.filter(s => !s.gone)
  // beams + explosions
  for (const b of KR.beams) { b.t += dt; const a = 1 - b.t / b.life
    ctx.strokeStyle = `rgba(${b.col},${0.35 * a})`; ctx.lineWidth = b.w * 3; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke()
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`; ctx.lineWidth = b.w; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke() }
  KR.beams = KR.beams.filter(b => b.t < b.life)
  for (const e of KR.booms) { e.t += dt; const u = e.t / e.life, gl = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * (0.5 + u))
    gl.addColorStop(0, `rgba(255,250,220,${1 - u})`); gl.addColorStop(0.4, `rgba(${e.col},${0.85 * (1 - u)})`); gl.addColorStop(1, "rgba(120,30,10,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.5 + u), 0, 7); ctx.fill() }
  KR.booms = KR.booms.filter(e => e.t < e.life)
}

function kryptonFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = KR.geo || krGeo(def, c, W, dockTop), hz = G.horizon, S = def.S
  if (F[0] !== KR.p1) { Object.assign(KR, { p1: F[0], drones: [], troops: [], beams: [], booms: [], debris: [], embers: [], dronesDown: 0, troopsDown: 0, strikes: 0, quake: 0, quakeShakes: 0, end: null, pod: null, cityLost: 0, hp: new WeakMap() }); krSay("KRYPTON'S KNOWLEDGE WILL BE MINE.", 3) }
  const dt = Math.min(0.05, Math.max(0, t - (KR.last || t))); KR.last = t
  const ended = KR.end && KR.end.stage !== "charge"
  // the floor carries on toward the viewer (cold crystal tiles); glowing cracks open in it while the planet quakes
  const fb = dockTop + c.layout.pieces.floor.h * S
  if (coverBottom > fb) { const gg = ctx.createLinearGradient(0, fb, 0, coverBottom); gg.addColorStop(0, "#6ac8d8"); gg.addColorStop(1, "#2a5a6a"); ctx.fillStyle = gg; ctx.fillRect(padL, fb, padR - padL, coverBottom - fb)
    ctx.strokeStyle = "rgba(20,60,80,0.35)"; ctx.lineWidth = 2; for (let y = fb + 40; y < coverBottom; y += 40 + (y - fb) * 0.25) { ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padR, y); ctx.stroke() }
    for (let x = padL - 400; x < padR + 400; x += 120) { ctx.beginPath(); ctx.moveTo(x + shift(1, W), fb); ctx.lineTo(x + (x - W / 2) * 0.6 + shift(1, W), coverBottom); ctx.stroke() } }
  if (KR.quake > 0 || KR.end) { ctx.strokeStyle = `rgba(255,${KR.end ? 240 : 150},70,${0.5 + 0.3 * Math.sin(t * 9)})`; ctx.lineWidth = 3
    for (let i = 0; i < 5; i++) { ctx.beginPath(); let x = padL + (i + 0.5) * (padR - padL) / 5, y = dockTop + 20 * S; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (_h(i * 7 + k) - 0.5) * 60; y += 14 + 10 * _h(i * 3 + k); ctx.lineTo(x, y) } ctx.stroke() } }
  // the fight → the war
  let bigHit = false, danger = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = KR.hp.get(f); KR.hp.set(f, hp); if (hp <= 0) ko = true; else if (hp / max <= 0.25) danger = true; if (was != null && was - hp >= 60) bigHit = true }
  if (bigHit && !ended) { KR.strikes++; const tx = padL + krRnd() * (padR - padL); KR.beams.push({ x0: KR.ship?.x ?? W * 0.3, y0: (KR.ship?.y ?? hz - 300) + 10, x1: tx, y1: hz, t: 0, life: 0.6, col: "120,255,140", w: 10 }); krBoom(tx, hz - 10, 70); KR.cityLost = Math.min(1, KR.cityLost + 0.06); camera.shake?.(5, 12); if (KR.sayT <= 0) krSay(["RESISTANCE IS IRRELEVANT.", "YOUR WORLD IS ALREADY DEAD.", "CATALOGUED. DELETED."][KR.strikes % 3]) }
  if (danger && !KR.end) { KR.quake = 1; if (Math.sin(t * 1.3) > 0.985 || (KR.quakeShakes === 0)) { KR.quakeShakes++; camera.shake?.(4, 30) } KR.cityLost = Math.min(1, KR.cityLost + dt * 0.03) }
  if (ko && !KR.end) { KR.end = { stage: "blast", t: 0 }; camera.shake?.(18, 80); krSay("THIS WORLD'S DATA IS ARCHIVED.", 3); KR.cityLost = 1
    for (const d of KR.drones) if (!d.down) { d.down = true; d.vy = -100 } for (const s of KR.troops) if (!s.down) { s.down = true; s.vy = -50 } }
  KR.sayT = Math.max(0, KR.sayT - dt)
  // the hall in front of all that (the piece) is already drawn; the torn roof edge glows and drips embers into the hall
  const tear = c.layout.pieces.hall.tear
  for (const cp of mirrorCopies(G, c.layout.pieces.hall.w * S, padL, padR)) {
    ctx.strokeStyle = `rgba(255,140,50,${0.55 + 0.2 * Math.sin(t * 5)})`; ctx.lineWidth = 3; ctx.beginPath(); tear.forEach(([x, y], i) => i ? ctx.lineTo(cp.X(x), G.Y(y)) : ctx.moveTo(cp.X(x), G.Y(y))); ctx.stroke()
    if (krRnd() < dt * 7) { const p = tear[Math.floor(krRnd() * tear.length)]; if (p[1] > 4) KR.embers.push({ x: cp.X(p[0]), y: G.Y(p[1]), vx: (krRnd() - 0.5) * 30, vy: 0, life: 2 }) } }
  // falling debris through the hole (more while the planet quakes); it smashes on the floor behind the fighters
  if (krRnd() < dt * (KR.quake > 0 || KR.end ? 2.5 : 0.5)) KR.debris.push({ x: padL + krRnd() * (padR - padL), y: G.Y(40), vy: 0, r: 6 + krRnd() * 14, spin: krRnd() * 6 })
  for (const d of KR.debris) { d.vy += 700 * dt; d.y += d.vy * dt; d.spin += dt * 4
    if (d.y >= dockTop - 2) { d.gone = true; krBoom(d.x, dockTop - 6, d.r * 2.2, "200,200,210"); if (d.r > 14) camera.shake?.(2, 6) }
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.spin); ctx.fillStyle = "#5a6a78"; ctx.fillRect(-d.r, -d.r * 0.6, d.r * 2, d.r * 1.2); ctx.fillStyle = "#ff8a40"; ctx.fillRect(-d.r, -d.r * 0.6, d.r * 0.5, d.r * 0.4); ctx.restore() }
  KR.debris = KR.debris.filter(d => !d.gone)
  for (const e of KR.embers) { e.life -= dt; e.vy += 120 * dt; e.x += e.vx * dt; e.y += e.vy * dt; ctx.fillStyle = `rgba(255,${150 + 80 * e.life / 2 | 0},60,${Math.min(1, e.life)})`; ctx.fillRect(e.x, e.y, 3, 3) }
  KR.embers = KR.embers.filter(e => e.life > 0).slice(-120)
  // ── the end of Krypton: the horizon blows apart (white-green), the shockwave, and the little rocket escaping
  if (KR.end) { const E = KR.end; E.t += dt
    const u = Math.min(1, E.t / 2.2), cx = W * 0.5 + shift(0.15, W)
    const bg = ctx.createRadialGradient(cx, hz, 0, cx, hz, 200 + 1400 * u); bg.addColorStop(0, `rgba(255,255,240,${1 - u * 0.5})`); bg.addColorStop(0.3, `rgba(180,255,190,${0.8 - u * 0.4})`); bg.addColorStop(0.7, `rgba(255,120,40,${0.5 - u * 0.3})`); bg.addColorStop(1, "rgba(255,60,20,0)")
    ctx.fillStyle = bg; ctx.fillRect(padL, 0, padR - padL, coverBottom)
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(cx, hz, 100 + 2000 * u, 20 + 260 * u, 0, 0, 7); ctx.stroke()
    if (E.t > 0.9 && E.t < 1.0 && !E.after) { E.after = true; camera.shake?.(12, 50) }
    if (E.t > 1.2 && !KR.pod) KR.pod = { x: W * 0.62 + shift(0.9, W), y: G.Y(300), vx: 60, vy: -40 }
    if (KR.pod) { const p = KR.pod; p.vy -= 260 * dt; p.vx += 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt
      ctx.strokeStyle = "rgba(200,230,255,0.6)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.25, p.y - p.vy * 0.25); ctx.stroke()
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2)
      ctx.fillStyle = "#e8f4ff"; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(8, 4); ctx.lineTo(-8, 4); ctx.closePath(); ctx.fill()
      ctx.fillStyle = "#8ad0ff"; ctx.beginPath(); ctx.arc(0, -2, 4, 0, 7); ctx.fill()
      ctx.fillStyle = "rgba(255,200,120,0.9)"; ctx.beginPath(); ctx.arc(0, 9, 5 + Math.sin(t * 40) * 2, 0, 7); ctx.fill(); ctx.restore() } }
}

// ───────────────────────────── ARLONG PARK (One Piece; render-only, wall clock, own PRNG) ─────────────────────────────
// Retsu's temple courtyard (Street Fighter, 1987) as Arlong Park: red-roofed walls, the ARLONG PARK sign over the gate,
// Arlong's tower with the shark flag, tangerine trees. Fish-men loaf in the courtyard and cheer whenever a villain
// lands a big hit (jeer when a hero does); villagers from the town peek over the wall and do the opposite (cheer
// heroes, duck from villains). The giant sea cow surfaces in the lagoon behind the wall and moos; big hits throw sea
// spray over the wall and shake tangerines down. A fighter close to losing cracks the tower; the knockout brings it
// down — it splits, tilts and sinks into the lagoon in a cloud of dust and spray, with a long shake.
let _alSeed = 0x1b873593
const alRnd = () => { _alSeed ^= _alSeed << 13; _alSeed ^= _alSeed >>> 17; _alSeed ^= _alSeed << 5; return (_alSeed >>> 0) / 4294967296 }
const AL = { p1: null, last: 0, hp: new WeakMap(), fish: null, town: null, cow: null, cowT: 8, spray: [], fruit: [], dust: [], mood: 0, side: null, shout: [], crack: 0, fall: null,
  cheersVillain: 0, cheersHero: 0, cowRises: 0, fruitDropped: 0, geo: null }
export const arlongState = () => ({ cow: AL.cow ? AL.cow.stage : null, cowRises: AL.cowRises, crack: AL.crack, fall: AL.fall ? AL.fall.stage : null, fallen: !!AL.fall && AL.fall.t > 2.5,
  cheersVillain: AL.cheersVillain, cheersHero: AL.cheersHero, fruit: AL.fruitDropped, spray: AL.spray.length, fish: (AL.fish || []).length, town: (AL.town || []).length,
  shouting: AL.shout.filter(s => s.t > 0).map(s => s.txt) })
function alGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.wall, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S, roof: y0 + 108 * S }
}
function alShout(x, y, txt, col) { AL.shout.push({ x, y, txt, col, t: 1.4 }) }

function drawArlongSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = AL.geo = alGeo(def, c, W, dockTop), P = c.layout.pieces
  const g = ctx.createLinearGradient(0, coverTop, 0, G.roof); g.addColorStop(0, "#3a86e0"); g.addColorStop(1, "#b8e0ff")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const sk = P.sky, im = c.img[sk.file], S = def.S, sw = sk.w * S, sh = sk.h * S, ss = shift(0.05, W) + (t * 5) % sw
  if (ready(im)) { ctx.globalAlpha = 0.85; for (let k = Math.floor((padL - ss) / sw) - 1, x; (x = ss + k * sw) < padR; k++) ctx.drawImage(im, Math.floor(x), G.Y(-30) - sh * 0.4, Math.ceil(sw) + 1, sh); ctx.globalAlpha = 1 }
  // the lagoon / open sea beyond the wall
  const sea = G.Y(92), sg = ctx.createLinearGradient(0, sea, 0, G.roof + 30); sg.addColorStop(0, "#2a78c8"); sg.addColorStop(1, "#1a4a8a")
  ctx.fillStyle = sg; ctx.fillRect(padL, sea, padR - padL, G.roof + 30 - sea)
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5; for (let r = 0; r < 5; r++) { const y = sea + 3 + r * 4; ctx.beginPath(); for (let x = padL; x < padR; x += 34) { const xx = x + ((t * 14 + r * 11) % 34); ctx.moveTo(xx, y); ctx.lineTo(xx + 10, y) } ctx.stroke() }
  // Arlong's tower (its own piece) — cracks while a fighter is close to losing; on the knockout it splits and sinks
  const tw = P.tower, tim = c.img[tw.file]
  if (ready(tim)) {
    const bx = G.X(P.wall.tower[0]), by = G.Y(P.wall.tower[1]) + 2, w = tw.w * S, h = tw.h * S, F = AL.fall
    const tilt = F ? Math.min(0.55, Math.max(0, F.t - 0.6) * 0.35) : 0, sink = F ? Math.max(0, F.t - 0.9) * 140 : 0, shake = F && F.t < 0.9 ? Math.sin(t * 60) * 3 : 0
    ctx.save(); ctx.beginPath(); ctx.rect(padL, coverTop, padR - padL, G.roof + 40 - coverTop); ctx.clip()
    ctx.translate(bx + w * 0.5 + shake, by + sink); ctx.rotate(tilt)
    ctx.drawImage(tim, -w * 0.5, -h, w, h)
    if (AL.crack > 0 || F) { ctx.strokeStyle = "rgba(30,10,8,0.85)"; ctx.lineWidth = 2.5; ctx.beginPath()
      const n = F ? 9 : Math.ceil(AL.crack * 6)
      for (let i = 0; i < n; i++) { let x = (_h(i * 7 + 1) - 0.5) * w * 0.6, y = -h * (0.15 + 0.7 * _h(i * 7 + 2)); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (_h(i * 9 + k) - 0.5) * 22; y += 10 + 10 * _h(i * 5 + k); ctx.lineTo(x, y) } }
      ctx.stroke() }
    // the shark flag on top
    const fx = 0, fy = -h - 6
    ctx.fillStyle = "#3a2a1a"; ctx.fillRect(fx - 1.5, fy - 40, 3, 44)
    const wv = Math.sin(t * 5) * 4
    ctx.fillStyle = "#121216"; ctx.beginPath(); ctx.moveTo(fx + 1, fy - 40); ctx.quadraticCurveTo(fx + 22, fy - 44 + wv, fx + 44, fy - 40 + wv); ctx.lineTo(fx + 44, fy - 14 + wv); ctx.quadraticCurveTo(fx + 22, fy - 18 + wv, fx + 1, fy - 14); ctx.fill()
    ctx.fillStyle = "#f2f2f2"; ctx.beginPath(); ctx.moveTo(fx + 12, fy - 22 + wv * 0.5); ctx.quadraticCurveTo(fx + 22, fy - 40 + wv * 0.5, fx + 36, fy - 24 + wv); ctx.lineTo(fx + 30, fy - 22 + wv); ctx.lineTo(fx + 26, fy - 26 + wv); ctx.lineTo(fx + 22, fy - 21 + wv * 0.5); ctx.lineTo(fx + 18, fy - 25 + wv * 0.5); ctx.closePath(); ctx.fill()   // shark head + teeth
    ctx.restore()
  }
  alCow(ctx, G, t, padL, padR)
  alTown(ctx, G, t, padL, padR)
}

function alFishman(ctx, x, y, s, f, t) {
  // a fish-man: blue-green skin, a dorsal fin on the head, open vest, shorts (~70px tall at s 1)
  const jump = f.hop || 0, arm = f.cheer > 0 ? -2.2 + Math.sin(t * 14 + f.seed) * 0.4 : f.angry > 0 ? -0.8 + Math.sin(t * 20) * 0.6 : Math.sin(t * 1.5 + f.seed) * 0.1
  ctx.save(); ctx.translate(x, y - jump); ctx.scale(s * f.dir, s)
  ctx.fillStyle = "#2a2a3a"; ctx.fillRect(-9, -22, 8, 22); ctx.fillRect(2, -22, 8, 22)                       // legs
  ctx.fillStyle = f.short; ctx.fillRect(-11, -30, 22, 11)
  ctx.fillStyle = f.skin; ctx.fillRect(-12, -56, 24, 27)                                                      // torso
  ctx.fillStyle = f.vest; ctx.fillRect(-12, -56, 7, 27); ctx.fillRect(5, -56, 7, 27)
  for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 13, -52); ctx.rotate(k * arm); ctx.fillStyle = f.skin; ctx.fillRect(-3, 0, 7, 22); ctx.restore() }
  ctx.fillStyle = f.skin; ctx.beginPath(); ctx.ellipse(0, -66, 12, 12, 0, 0, 7); ctx.fill()                  // head
  ctx.fillStyle = f.fin; ctx.beginPath(); ctx.moveTo(-4, -76); ctx.lineTo(4, -94); ctx.lineTo(9, -74); ctx.fill()          // dorsal fin
  if (f.nose) { ctx.fillStyle = "#d8d8c8"; ctx.beginPath(); ctx.moveTo(10, -66); ctx.lineTo(28, -64); ctx.lineTo(10, -61); ctx.fill() }   // saw nose
  ctx.fillStyle = "#111"; ctx.fillRect(3, -70, 3, 3)
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-9, -64 + i * 3); ctx.lineTo(-5, -64 + i * 3); ctx.stroke() }   // gills
  if (f.cheer > 0 || f.angry > 0) { ctx.fillStyle = "#300"; ctx.beginPath(); ctx.ellipse(4, -60, 5, 3 + Math.abs(Math.sin(t * 16)) * 2, 0, 0, 7); ctx.fill() }
  ctx.restore()
}

function alTown(ctx, G, t, padL, padR) {   // villagers peeking over the wall from outside, drawn BEHIND the wall + trees
  for (const p of AL.town || []) {
    const x = padL + p.u * (padR - padL), up = p.duck > 0 ? 0 : p.cheer > 0 ? 24 + Math.abs(Math.sin(t * 10 + p.seed)) * 10 : 16 + Math.sin(t * 1.3 + p.seed) * 3, y = G.roof + 6 - up
    ctx.save(); ctx.beginPath(); ctx.rect(padL, 0, padR - padL, G.roof + 6); ctx.clip()
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = p.hair; ctx.fillRect(x - 9, y - 10, 18, 5)
    if (p.hat) { ctx.fillStyle = p.hat; ctx.fillRect(x - 13, y - 10, 26, 3); ctx.fillRect(x - 8, y - 16, 16, 7) }
    ctx.fillStyle = "#111"; ctx.fillRect(x - 4, y - 2, 2, 2); ctx.fillRect(x + 3, y - 2, 2, 2)
    if (p.cheer > 0) { ctx.fillStyle = p.skin; ctx.fillRect(x - 16, y - 2 - 14 * Math.abs(Math.sin(t * 12 + p.seed)), 5, 14); ctx.fillRect(x + 12, y - 2 - 14 * Math.abs(Math.sin(t * 12 + p.seed + 1)), 5, 14) }
    else { ctx.fillStyle = p.skin; ctx.fillRect(x - 12, G.roof + 2 - Math.min(up, 6), 6, 4); ctx.fillRect(x + 7, G.roof + 2 - Math.min(up, 6), 6, 4) }   // hands on the wall
    ctx.restore() }
}

function alCow(ctx, G, t, padL, padR) {   // the sea cow, drawn BEHIND the wall + trees (rises out of the lagoon)
  const K = AL.cow
  if (AL.cow) { const rise = K.stage === "up" ? K.t : K.stage === "down" ? 1 - K.t / 1.2 : 1, x = K.x, y = G.roof + 10 - 130 * rise
      ctx.save(); ctx.beginPath(); ctx.rect(padL, 0, padR - padL, G.roof + 2); ctx.clip()
      ctx.fillStyle = "#8a5ab0"; ctx.beginPath(); ctx.ellipse(x, y + 40, 90, 70, 0, 0, 7); ctx.fill()                         // head
      ctx.fillStyle = "#f0e8f0"; ctx.beginPath(); ctx.ellipse(x + 20, y + 70, 55, 30, 0, 0, 7); ctx.fill()                      // muzzle
      ctx.fillStyle = "#3a1a3a"; ctx.beginPath(); ctx.arc(x + 6, y + 66, 6, 0, 7); ctx.arc(x + 36, y + 66, 6, 0, 7); ctx.fill()
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - 30, y + 18, 14, 0, 7); ctx.arc(x + 34, y + 18, 14, 0, 7); ctx.fill()
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x - 27, y + 20, 6, 0, 7); ctx.arc(x + 31, y + 20, 6, 0, 7); ctx.fill()
      ctx.fillStyle = "#e8d8b0"; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + k * 60, y - 6); ctx.quadraticCurveTo(x + k * 96, y - 30, x + k * 88, y - 60); ctx.lineTo(x + k * 76, y - 12); ctx.fill() }   // horns
      ctx.restore()
      if (K.stage === "moo") { ctx.fillStyle = "rgba(255,255,255,0.7)"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + (i - 2) * 40, G.roof + 2, 10 + 6 * Math.sin(t * 7 + i), 0, 7); ctx.fill() } } }
}

function arlongFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = AL.geo || alGeo(def, c, W, dockTop), S = def.S, P = c.layout.pieces
  if (F[0] !== AL.p1) { Object.assign(AL, { p1: F[0], hp: new WeakMap(), fish: null, town: null, cow: null, cowT: 8, spray: [], fruit: [], dust: [], shout: [], crack: 0, fall: null, cheersVillain: 0, cheersHero: 0, cowRises: 0, fruitDropped: 0 }) }
  const dt = Math.min(0.05, Math.max(0, t - (AL.last || t))); AL.last = t
  if (!AL.fish) {
    AL.fish = [0.07, 0.15, 0.24, 0.68, 0.77, 0.87, 0.94].map((u, i) => ({ u, dir: u < 0.5 ? 1 : -1, seed: i * 3.1, cheer: 0, angry: 0, hop: 0, vy: 0,
      skin: ["#3a8ab0", "#4aa088", "#5a7ac8", "#3a9aa0"][i % 4], fin: ["#2a5a80", "#2a7060", "#3a4a90"][i % 3], vest: ["#e8e0d0", "#c84a3a", "#e8c040", "#3a3a3a"][i % 4], short: ["#3a5a9a", "#6a3a2a", "#2a6a4a"][i % 3], nose: i % 3 === 1 }))
    AL.town = [0.03, 0.09, 0.2, 0.27, 0.71, 0.8, 0.9, 0.97].map((u, i) => ({ u, seed: i * 2.3, duck: 0, cheer: 0, hat: ["#c8a040", null, "#3a6ac8", null, "#a03a2a", "#3a3a3a", null, "#5a8a3a"][i], hair: ["#3a2a1a", "#f0a040", "#1a1a1a", "#8a4a2a"][i % 4], skin: ["#f1c9a5", "#e0b090", "#c58c64"][i % 3] }))
  }
  // the fight → who's cheering
  let bigHit = false, attacker = null, danger = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = AL.hp.get(f); AL.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) danger = true
    if (was != null && was - hp >= 60) { bigHit = true; attacker = F.find(o => o !== f) || null } }
  const villainHit = attacker ? shibuyaKills(attacker.rosterKey) : false
  if (bigHit) {
    if (villainHit) { AL.cheersVillain++; for (const f of AL.fish) { f.cheer = 1.4; f.vy = 220 } for (const p of AL.town) p.duck = 1.2; alShout(G.X(140), G.Y(150), "SHAHAHAHA!", "#2a6aa0") }
    else { AL.cheersHero++; for (const p of AL.town) p.cheer = 1.4; for (const f of AL.fish) f.angry = 1.2; alShout(G.X(60), G.roof - 30, "GET HIM!!", "#c03020") }
    for (let i = 0; i < 40; i++) AL.spray.push({ x: padL + alRnd() * (padR - padL), y: G.roof, vx: (alRnd() - 0.5) * 80, vy: -200 - alRnd() * 250, life: 1.2 })
    const FRs = P.wall.fruit || []
    for (let i = 0; i < 6 && FRs.length; i++) { const cp = mirrorCopies(G, G.w, padL, padR); const C = cp[Math.floor(alRnd() * cp.length)]; const [tx, ty] = FRs[Math.floor(alRnd() * FRs.length)]
      AL.fruit.push({ x: C.X(tx), y: G.Y(ty), vy: 0, vx: (alRnd() - 0.5) * 60, bounce: 0 }); AL.fruitDropped++ }
    if (alRnd() < 0.35 && !AL.cow) AL.cowT = 0
  }
  if (danger && !AL.fall) AL.crack = Math.min(1, AL.crack + dt * 0.4)
  if (ko && !AL.fall) { AL.fall = { stage: "crack", t: 0 }; camera.shake?.(10, 30)
    if (villainHit || F.some(f => (f.health ?? 1) > 0 && shibuyaKills(f.rosterKey))) { for (const f of AL.fish) f.cheer = 4 } else { for (const p of AL.town) p.cheer = 5; for (const f of AL.fish) f.angry = 4 }
    alShout(G.X(400), G.roof - 60, "ARLONG PARK IS FALLING!!", "#c03020") }
  if (AL.fall) { const Fl = AL.fall; Fl.t += dt
    if (Fl.stage === "crack" && Fl.t > 0.6) { Fl.stage = "topple"; camera.shake?.(16, 60) }
    if (Fl.stage === "topple" && Fl.t > 1.6) { Fl.stage = "sunk"; camera.shake?.(12, 40); const bx = G.X(P.wall.tower[0] + 58)
      for (let i = 0; i < 70; i++) AL.spray.push({ x: bx + (alRnd() - 0.5) * 220, y: G.roof, vx: (alRnd() - 0.5) * 240, vy: -300 - alRnd() * 500, life: 1.8 }) }
    if (Fl.t < 2.6 && alRnd() < dt * 30) { const bx = G.X(P.wall.tower[0] + 58); AL.dust.push({ x: bx + (alRnd() - 0.5) * 200, y: G.roof - alRnd() * 60, r: 20 + alRnd() * 30, life: 2.2 }) } }
  // ── the sea cow: surfaces behind the wall now and then (head over the roof line), moos, sinks
  AL.cowT -= dt
  if (!AL.cow && AL.cowT <= 0) { AL.cowT = 14 + alRnd() * 10; AL.cowRises++; AL.cow = { x: G.X(alRnd() < 0.5 ? 200 : 560), t: 0, stage: "up" } }
  if (AL.cow) { const K = AL.cow; K.t += dt; if (K.stage === "up" && K.t > 1) { K.stage = "moo"; K.t = 0; alShout(K.x, G.roof - 150, "MOOOOO!", "#6a3a8a") } else if (K.stage === "moo" && K.t > 2.2) { K.stage = "down"; K.t = 0 } else if (K.stage === "down" && K.t > 1.2) AL.cow = null
  }
  // ── tangerines on every tree (every copy of the picture) — only on the leaf spots the slicer found
  const FR = P.wall.fruit || []
  for (const cp of mirrorCopies(G, G.w, padL, padR)) for (const [tx, ty] of FR) {
    ctx.fillStyle = "#ff9a1a"; ctx.beginPath(); ctx.arc(cp.X(tx), G.Y(ty), 3.2, 0, 7); ctx.fill(); ctx.fillStyle = "#2a6a1a"; ctx.fillRect(cp.X(tx) - 1, G.Y(ty) - 4, 2, 2) }
  // ── the ARLONG PARK sign over the gate
  { const x = G.X(P.wall.sign[0]), y = G.Y(P.wall.sign[1]), w = 150 * S, h = 22 * S
    ctx.fillStyle = "#1a1a22"; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.strokeStyle = "#c8a040"; ctx.lineWidth = 3; ctx.strokeRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6)
    ctx.save(); ctx.font = `900 ${Math.round(15 * S)}px Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#f2f2f2"; ctx.fillText("ARLONG PARK", x, y + 1); ctx.restore() }
  for (const p of AL.town) { p.duck = Math.max(0, p.duck - dt); p.cheer = Math.max(0, p.cheer - dt) }
  // ── fish-men in the courtyard by the lanterns
  for (const f of AL.fish) { f.cheer = Math.max(0, f.cheer - dt); f.angry = Math.max(0, f.angry - dt)
    if (f.vy || f.hop > 0) { f.vy -= 900 * dt; f.hop = Math.max(0, f.hop + f.vy * dt); if (f.hop === 0 && f.vy < 0) f.vy = f.cheer > 0 ? 220 : 0 }
    const x = G.X(f.u * P.wall.w), close = F.some(o => Math.abs(o.x + (o.w || 50) / 2 - x) < 90)
    if (close) f.dir = F[0] && F[0].x > x ? -1 : 1
    alFishman(ctx, close ? x + (F[0] && F[0].x > x ? -20 : 20) : x, G.Y(184), 0.95, f, t) }
  // spray, falling fruit, dust, shouts
  for (const p of AL.spray) { p.life -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = `rgba(225,242,255,${Math.min(0.85, p.life)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill() }
  AL.spray = AL.spray.filter(p => p.life > 0 && p.y < coverBottom)
  for (const f of AL.fruit) { f.vy += 700 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > dockTop + 8 && f.bounce < 2) { f.y = dockTop + 8; f.vy *= -0.4; f.bounce++ }
    ctx.fillStyle = "#ff9a1a"; ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, 7); ctx.fill() }
  AL.fruit = AL.fruit.filter(f => f.bounce < 2 || f.vy < 0).slice(-60)
  for (const d of AL.dust) { d.life -= dt; d.r += dt * 30; d.y -= dt * 20; ctx.fillStyle = `rgba(150,130,110,${0.4 * Math.min(1, d.life)})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill() }
  AL.dust = AL.dust.filter(d => d.life > 0)
  for (const s of AL.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  AL.shout = AL.shout.filter(s => s.t > 0)
}

// ───────────────────────────── BELLWOOD (Ben 10; render-only, wall clock, own PRNG) ─────────────────────────────
// Birdie's main street (Street Fighter, 1987) as Bellwood on a quiet sunny afternoon: neighbours walk the sidewalk (a
// jogger, a dog walker, a mom with a stroller, a kid on a bike, the mailman, an old man with a cane), pigeons peck at
// the curb, Mr. Smoothy has its giant cup on the roof. Then two people start a fight in the middle of the street. The
// first hits make people stop and stare; the longer it goes the bigger the crowd gets — phones out, filming, shouting.
// Big hits: "OOOOH!", the parked car's alarm goes off, the pigeons scatter. Ben going alien: a green flash and "IT'S BEN
// 10!!". A fighter close to losing: somebody called the cops — a police car rolls up, lights washing the shopfronts.
// The knockout: the whole street goes off, phones flashing.
let _bwSeed = 0x3c6ef372
const bwRnd = () => { _bwSeed ^= _bwSeed << 13; _bwSeed ^= _bwSeed >>> 17; _bwSeed ^= _bwSeed << 5; return (_bwSeed >>> 0) / 4294967296 }
const BW = { p1: null, last: 0, hp: new WeakMap(), ppl: null, birds: null, heat: 0, hits: 0, bigHits: 0, alarm: 0, alarms: 0, ben: new WeakMap(), benFlash: 0, benCalls: 0,
  cop: null, ko: false, koT: 0, shout: [], geo: null, phones: 0 }
export const bellwoodState = () => { const P = BW.ppl || []
  return { people: P.length, walking: P.filter(p => p.mode === "walk").length, watching: P.filter(p => p.mode === "watch").length, phones: P.filter(p => p.mode === "watch" && p.phone).length,
    birds: (BW.birds || []).length, flying: (BW.birds || []).filter(b => b.fly).length, alarms: BW.alarms, benCalls: BW.benCalls, cop: BW.cop ? BW.cop.stage : null, ko: BW.ko, heat: BW.heat,
    shouting: BW.shout.filter(s => s.t > 0).map(s => s.txt) } }
function bwGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.street, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S, walk0: dockTop + 10 * S, walk1: dockTop + 34 * S, curb: dockTop + 41 * S }
}
function bwShout(x, y, txt, col) { if (BW.shout.filter(s => s.t > 0).length < 4) BW.shout.push({ x, y, txt, col: col || "#222", t: 1.6 }) }

function drawBellwoodSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = BW.geo = bwGeo(def, c, W, dockTop), P = c.layout.pieces, S = def.S
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#4a9aec"); g.addColorStop(1, "#cfe8ff")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  ctx.fillStyle = "rgba(255,246,200,0.9)"; ctx.beginPath(); ctx.arc(W * 0.3 + shift(0.04, W), G.Y(-6), 28, 0, 7); ctx.fill()   // the sun
  const sk = P.sky, im = c.img[sk.file], sw = sk.w * S, sh = sk.h * S, ss = shift(0.06, W) + (t * 4) % sw
  if (ready(im)) { ctx.globalAlpha = 0.6; for (let k = Math.floor((padL - ss) / sw) - 1, x; (x = ss + k * sw) < padR; k++) ctx.drawImage(im, Math.floor(x), G.Y(-20) - sh * 0.55, Math.ceil(sw) + 1, sh); ctx.globalAlpha = 1 }
  // the suburbs beyond main street: rows of houses + trees, and the BELLWOOD water tower
  const hz = G.Y(150), ps = shift(0.35, W)
  for (let i = Math.floor((padL - ps) / 70) - 1; i * 70 + ps < padR + 70; i++) {
    const x = i * 70 + ps, hh = 34 + 14 * _h(i * 3 + 7), col = ["#d8c8a8", "#b8c8d8", "#e0d0c0", "#c8d8b8"][(i % 4 + 4) % 4]
    ctx.fillStyle = col; ctx.fillRect(x, hz - hh, 54, hh)
    ctx.fillStyle = ["#8a4a3a", "#5a5a6a", "#6a4a3a"][(i % 3 + 3) % 3]; ctx.beginPath(); ctx.moveTo(x - 6, hz - hh); ctx.lineTo(x + 27, hz - hh - 22); ctx.lineTo(x + 60, hz - hh); ctx.fill()
    ctx.fillStyle = "#6a8aa8"; ctx.fillRect(x + 8, hz - hh + 10, 10, 10); ctx.fillRect(x + 34, hz - hh + 10, 10, 10)
    ctx.fillStyle = "#4a8a3a"; ctx.beginPath(); ctx.arc(x + 64, hz - 18 - 10 * _h(i * 5), 16 + 6 * _h(i * 11), 0, 7); ctx.fill()
  }
  { const x = W * 0.36 + shift(0.3, W), y = hz - 60                                                                // the water tower
    ctx.strokeStyle = "#7a7a82"; ctx.lineWidth = 4; ctx.beginPath(); for (const k of [-34, -12, 12, 34]) { ctx.moveTo(x + k * 0.7, y + 20); ctx.lineTo(x + k, hz) } ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 30, y + 60); ctx.lineTo(x + 30, y + 60); ctx.moveTo(x - 32, y + 40); ctx.lineTo(x + 32, y + 90); ctx.moveTo(x + 32, y + 40); ctx.lineTo(x - 32, y + 90); ctx.stroke()
    ctx.fillStyle = "#e8e8ea"; ctx.beginPath(); ctx.ellipse(x, y, 52, 34, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#c8c8cc"; ctx.beginPath(); ctx.ellipse(x, y - 30, 30, 10, 0, Math.PI, 0); ctx.fill()
    ctx.save(); ctx.font = "900 15px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#2a6a2a"; ctx.fillText("BELLWOOD", x, y + 2); ctx.restore() }
}

function bwPerson(ctx, p, x, y, s, t) {
  const walking = p.mode === "walk" || p.go, ph = p.ph, sw = walking ? Math.sin(ph) * (p.kind === "jog" ? 0.8 : 0.45) : 0
  const hop = p.cheer > 0 ? Math.abs(Math.sin(t * 9 + p.seed)) * 10 : 0, d = p.dir
  ctx.save(); ctx.translate(x, y - hop); ctx.scale(s * d, s)
  if (p.kind === "bike") {
    ctx.strokeStyle = "#222"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-16, -11, 11, 0, 7); ctx.arc(18, -11, 11, 0, 7); ctx.stroke()
    ctx.strokeStyle = "#d02a2a"; ctx.beginPath(); ctx.moveTo(-16, -11); ctx.lineTo(0, -26); ctx.lineTo(18, -11); ctx.moveTo(0, -26); ctx.lineTo(14, -30); ctx.stroke()
    ctx.fillStyle = p.pants; ctx.save(); ctx.translate(-2, -36); ctx.rotate(0.5 + Math.sin(ph) * 0.5); ctx.fillRect(-3, 0, 6, 16); ctx.restore()
    ctx.fillStyle = p.shirt; ctx.fillRect(-6, -54, 12, 20); ctx.fillStyle = p.skin; ctx.save(); ctx.translate(2, -50); ctx.rotate(-1.1); ctx.fillRect(-2, 0, 5, 16); ctx.restore()
    ctx.beginPath(); ctx.arc(2, -60, 7, 0, 7); ctx.fill(); ctx.fillStyle = p.hat || "#2a6ad0"; ctx.beginPath(); ctx.arc(2, -62, 7.5, Math.PI, 0); ctx.fill(); ctx.restore(); return }
  const tall = p.kind === "kid" ? 0.72 : 1
  ctx.scale(tall, tall)
  ctx.fillStyle = p.pants; for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 3, -30); ctx.rotate(k * sw); ctx.fillRect(-3.5, 0, 7, 30); ctx.restore() }
  ctx.fillStyle = "#222"; ctx.fillRect(-6, -2, 6, 3); ctx.fillRect(2, -2, 6, 3)
  ctx.fillStyle = p.shirt; ctx.fillRect(-8, -60, 16, 32)
  if (p.kind === "mail") { ctx.fillStyle = "#6a4a2a"; ctx.fillRect(-12, -46, 9, 14) }
  // arms: swinging / cheering / holding a phone up toward the fight
  ctx.fillStyle = p.skin
  if (p.mode === "watch" && p.phone) { ctx.save(); ctx.translate(4, -56); ctx.rotate(-1.35); ctx.fillRect(-2.5, 0, 5, 20); ctx.restore(); ctx.fillStyle = "#111"; ctx.fillRect(20, -66, 6, 10)
    ctx.fillStyle = BW.ko && Math.sin(t * 25 + p.seed) > 0.6 ? "#fff" : "#9ad0ff"; ctx.fillRect(21, -65, 4, 8) }
  else if (p.cheer > 0) { for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 6, -58); ctx.rotate(Math.PI + k * 0.35 + Math.sin(t * 12 + p.seed) * 0.2); ctx.fillRect(-2.5, 0, 5, 20); ctx.restore() } }
  else { for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 4, -58); ctx.rotate(-k * sw * 0.8 + (p.kind === "stroller" || p.kind === "old" ? -0.9 : 0)); ctx.fillRect(-2.5, 0, 5, 22); ctx.restore() } }
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(1, -68, 8, 0, 7); ctx.fill()
  ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(0, -70, 8.3, Math.PI * 0.95, Math.PI * 2.05); ctx.fill()
  if (p.hat) { ctx.fillStyle = p.hat; ctx.fillRect(-8, -78, 16, 6); ctx.fillRect(0, -74, 12, 3) }
  if (p.kind === "old") { ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.arc(0, -70, 8.3, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(16, -40); ctx.lineTo(19, 0); ctx.stroke() }
  ctx.fillStyle = "#111"; ctx.fillRect(4, -70, 2, 2)
  ctx.restore()
  if (p.kind === "stroller") { const sx = x + d * 26 * s, sy = y
    ctx.fillStyle = "#3a6ac8"; ctx.fillRect(sx - 13 * s, sy - 34 * s, 26 * s, 16 * s); ctx.beginPath(); ctx.arc(sx + d * 6 * s, sy - 34 * s, 13 * s, Math.PI, 0); ctx.fill()
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(sx - 9 * s, sy - 5 * s, 5 * s, 0, 7); ctx.arc(sx + 9 * s, sy - 5 * s, 5 * s, 0, 7); ctx.fill()
    ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - d * 13 * s, sy - 32 * s); ctx.lineTo(x + d * 14 * s, sy - 46 * s); ctx.stroke() }
  if (p.kind === "dog") { const dx = x + d * 40 * s, dy = y, bark = p.mode === "watch" && Math.sin(t * 6 + p.seed) > 0.7, leg = walking ? Math.sin(ph * 1.6) * 4 : 0
    ctx.strokeStyle = "#a02a2a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + d * 14 * s, y - 40 * s); ctx.lineTo(dx + d * 14 * s, dy - 22 * s); ctx.stroke()
    ctx.fillStyle = "#b07a3a"; ctx.fillRect(dx - 14 * s, dy - 22 * s, 28 * s, 11 * s); ctx.fillRect(dx + d * 10 * s - 6 * s, dy - 30 * s, 12 * s, 11 * s)
    ctx.fillRect(dx - 12 * s + leg, dy - 12 * s, 4 * s, 12 * s); ctx.fillRect(dx + 8 * s - leg, dy - 12 * s, 4 * s, 12 * s)
    ctx.fillStyle = "#6a4a2a"; ctx.fillRect(dx - d * 18 * s, dy - 24 * s, 5 * s, 3 * s)
    if (bark) { ctx.save(); ctx.font = "900 12px Arial"; ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.fillText("WOOF!", dx + d * 22 * s, dy - 36 * s); ctx.restore() } }
}

function bellwoodFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = BW.geo || bwGeo(def, c, W, dockTop), S = def.S, P = c.layout.pieces
  if (F[0] !== BW.p1) Object.assign(BW, { p1: F[0], hp: new WeakMap(), ppl: null, birds: null, heat: 0, hits: 0, bigHits: 0, alarm: 0, alarms: 0, ben: new WeakMap(), benFlash: 0, benCalls: 0, cop: null, ko: false, koT: 0, shout: [] })
  const dt = Math.min(0.05, Math.max(0, t - (BW.last || t))); BW.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2
  if (!BW.ppl) {
    const kinds = ["walk", "jog", "dog", "stroller", "bike", "mail", "old", "kid", "walk", "walk", "kid", "walk"]
    BW.ppl = kinds.map((kind, i) => ({ kind, seed: i * 1.7, x: padL + (padR - padL) * ((i * 0.37 + 0.05) % 1), dir: i % 2 ? -1 : 1, lane: (i * 0.29) % 1, ph: i,
      speed: kind === "jog" ? 95 : kind === "bike" ? 150 : kind === "old" ? 28 : kind === "kid" ? 60 : 45, mode: "walk", phone: false, cheer: 0, go: false, tx: 0,
      shirt: ["#d84a4a", "#3a7ad8", "#f0c040", "#4aa860", "#9a5ad0", "#3a5a9a", "#e8e8e8", "#f08a3a", "#2a8a8a", "#c83a8a", "#2aa0d8", "#6a6a6a"][i],
      pants: ["#2a3a6a", "#3a3a3a", "#5a4a3a", "#2a2a5a"][i % 4], skin: ["#f1c9a5", "#c58c64", "#8a5a3a", "#e0b090", "#6a4028"][i % 5], hair: ["#3a2a1a", "#1a1a1a", "#8a4a2a", "#d8b060"][i % 4],
      hat: kind === "mail" ? "#2a3a7a" : kind === "jog" ? "#e8e8e8" : kind === "old" ? "#6a5a4a" : null }))
    BW.birds = [0.04, 0.08, 0.12, 0.88, 0.92, 0.96].map((u, i) => ({ x: padL + (padR - padL) * u, y: 0, fly: false, vx: 0, vy: 0, peck: i, back: 0 }))
  }
  // ── the fight → the street reacts
  let hurt = false, bigHit = false, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = BW.hp.get(f); BW.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was > hp) { hurt = true; if (was - hp >= 60) bigHit = true }
    if (/^(ben10|albedo)$/i.test(f.rosterKey || "")) { const form = f.transformed ? String(f.activeAlien || "alien") : "", prev = BW.ben.get(f)
      if (prev != null && form && form !== prev) { BW.benFlash = 1; BW.benCalls++; bwShout(f.x + 25, G.walk0 - 120 * S / 1.5, /albedo/i.test(f.rosterKey) ? "WAIT... THAT'S NOT BEN!?" : "IT'S BEN 10!!", "#1a8a2a"); for (const p of BW.ppl) if (p.mode === "watch") p.cheer = 1.5 }
      BW.ben.set(f, form) } }
  if (hurt) { BW.hits++; BW.heat = Math.min(1, BW.heat + 0.08)
    if (BW.hits === 1) bwShout(mid, G.walk0 - 110, ["AYO, THEY FIGHTING!", "IN THIS NEIGHBORHOOD?!"][Math.floor(bwRnd() * 2)], "#c03020")
    // more of the street stops to watch the hotter the fight gets
    for (const p of BW.ppl) if (p.mode === "walk" && p.kind !== "bike" && bwRnd() < 0.2 + BW.heat * 0.5) { p.mode = "watch"; p.phone = p.kind !== "old" && p.kind !== "stroller" && bwRnd() < 0.7; p.go = true
      p.tx = mid + (p.x < mid ? -1 : 1) * (150 + bwRnd() * 260) } }
  if (bigHit) { BW.bigHits++; BW.alarm = 3.5; BW.alarms++; for (const p of BW.ppl) if (p.mode === "watch") p.cheer = 0.9
    bwShout(mid + (bwRnd() - 0.5) * 300, G.walk0 - 100, ["OOOOOH!", "WORLDSTAR!!", "NOT IN FRONT OF MY STORE!", "HE FELT THAT!", "SOMEBODY STOP 'EM!"][BW.bigHits % 5], "#222")
    for (const b of BW.birds) if (!b.fly) { b.fly = true; b.vx = (b.x < mid ? -1 : 1) * (80 + bwRnd() * 80); b.vy = -160 - bwRnd() * 80 } }
  if (low && !BW.cop) { BW.cop = { x: padR + 260, stop: Math.min(padR - 90, mid + 520), stage: "drive" }; bwShout(mid, G.walk0 - 120, "SOMEBODY CALLED THE COPS!", "#2a4ad0") }
  if (ko && !BW.ko) { BW.ko = true; camera.shake?.(5, 20); for (const p of BW.ppl) { if (p.mode === "walk" && p.kind !== "bike") { p.mode = "watch"; p.phone = true; p.go = true; p.tx = mid + (p.x < mid ? -1 : 1) * (160 + bwRnd() * 240) } p.cheer = 5 }
    bwShout(mid, G.walk0 - 130, "OHHHHHHH!!", "#c03020") }
  if (BW.ko) BW.koT += dt
  // ── police: lights wash the shopfronts, the car rolls up to the curb
  if (BW.cop) { const K = BW.cop; if (K.stage === "drive") { K.x -= 260 * dt; if (K.x <= K.stop) { K.x = K.stop; K.stage = "parked" } }
    const red = Math.sin(t * 12) > 0; ctx.fillStyle = red ? "rgba(255,30,30,0.10)" : "rgba(30,80,255,0.10)"; ctx.fillRect(padL, G.y0, padR - padL, dockTop - G.y0) }
  // ── the car alarm (every copy of the street has the parked car)
  if (BW.alarm > 0) { BW.alarm -= dt; const on = Math.sin(t * 16) > 0
    for (const cp of mirrorCopies(G, G.w, padL, padR, true)) { const cx = cp.X(P.street.car[0]), cy = G.Y(P.street.car[1] - 14)
      if (on) { const gl = ctx.createRadialGradient(cx, cy, 2, cx, cy, 40); gl.addColorStop(0, "rgba(255,240,150,0.95)"); gl.addColorStop(1, "rgba(255,240,150,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, 7); ctx.fill() } }
    if (Math.floor(t * 2) % 2 === 0 && BW.alarm > 0.5) { const cx = G.X(P.street.car[0]); ctx.save(); ctx.font = "900 14px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#c02020"; ctx.fillText("WEE-OOO WEE-OOO", cx, G.Y(P.street.car[1] - 50)); ctx.restore() } }
  // ── Mr. Smoothy: the sign + the giant cup on the roof (every copy)
  for (const cp of mirrorCopies(G, G.w, padL, padR, true)) {
    const [sx, sy, sw, sh] = P.street.sign, x = cp.X(sx), y = G.Y(sy), w = sw * S, h = (sh + 2) * S
    ctx.fillStyle = "#e05aa0"; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6)
    ctx.save(); ctx.font = `900 ${Math.round(12 * S)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText("MR. SMOOTHY", x, y + 1); ctx.restore()
    const rx = cp.X(P.street.roof[0]), ry = G.Y(P.street.roof[1]), cw = 34 * S, ch = 46 * S
    ctx.fillStyle = "#f2f2f2"; ctx.beginPath(); ctx.moveTo(rx - cw / 2, ry - ch); ctx.lineTo(rx + cw / 2, ry - ch); ctx.lineTo(rx + cw * 0.36, ry); ctx.lineTo(rx - cw * 0.36, ry); ctx.fill()
    ctx.fillStyle = "#e05aa0"; ctx.fillRect(rx - cw * 0.42, ry - ch * 0.62, cw * 0.84, ch * 0.3)
    ctx.fillStyle = "#c83a7a"; ctx.beginPath(); ctx.ellipse(rx, ry - ch, cw / 2 + 2, 7 * S, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = "#3ad06a"; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(rx + 4 * S, ry - ch); ctx.lineTo(rx + 10 * S, ry - ch - 22 * S); ctx.stroke() }
  // ── pigeons on the curb: peck, scatter when the fight gets close or a big hit lands, come back later
  for (const b of BW.birds) { const by = G.walk1 + 4 * S
    if (!b.fly && F.some(f => Math.abs(f.x + 25 - b.x) < 110)) { b.fly = true; b.vx = (b.x < mid ? -1 : 1) * 90; b.vy = -150 }
    if (b.fly) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 20 * dt; b.back += dt; if (b.back > 9 && !F.some(f => Math.abs(f.x + 25 - b.x) < 260)) { b.fly = false; b.y = 0; b.back = 0 } }
    const x = b.x, y = by + b.y, flap = b.fly ? Math.sin(t * 30 + b.peck) * 5 : 0, pk = !b.fly && Math.sin(t * 3 + b.peck * 2) > 0.6 ? 3 : 0
    ctx.fillStyle = "#7a7a8a"; ctx.beginPath(); ctx.ellipse(x, y - 6, 7, 4.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 6, y - 10 + pk, 3, 0, 7); ctx.fill()
    if (b.fly) { ctx.beginPath(); ctx.moveTo(x - 4, y - 7); ctx.lineTo(x, y - 14 - flap); ctx.lineTo(x + 4, y - 7); ctx.fill() } else { ctx.fillStyle = "#d08a3a"; ctx.fillRect(x - 2, y - 2, 1.5, 3); ctx.fillRect(x + 1, y - 2, 1.5, 3) } }
  // ── the neighbours (drawn back to front)
  const span = padR - padL + 400
  for (const p of BW.ppl) { p.cheer = Math.max(0, p.cheer - dt)
    if (p.mode === "walk") { p.x += p.dir * p.speed * dt; p.ph += dt * p.speed / 7; if (p.x > padR + 200) p.x -= span; if (p.x < padL - 200) p.x += span }
    else { const dx = p.tx - p.x; if (Math.abs(dx) > 4) { p.go = true; p.dir = Math.sign(dx); p.x += p.dir * Math.min(Math.abs(dx), 70 * dt); p.ph += dt * 10 } else { p.go = false; p.dir = mid > p.x ? 1 : -1 } } }
  const order = [...BW.ppl].sort((a, b) => a.lane - b.lane)
  for (const p of order) bwPerson(ctx, p, p.x, G.walk0 + (G.walk1 - G.walk0) * p.lane, 1.15, t)
  if (BW.cop) { const K = BW.cop, x = K.x, y = G.curb + 6 * S, red = Math.sin(t * 12) > 0
    ctx.fillStyle = "#1a1a2a"; ctx.fillRect(x - 60, y - 34, 120, 22); ctx.fillStyle = "#f2f2f2"; ctx.fillRect(x - 30, y - 52, 62, 20); ctx.fillRect(x - 60, y - 24, 120, 8)
    ctx.fillStyle = "#8ac8f0"; ctx.fillRect(x - 24, y - 48, 22, 12); ctx.fillRect(x + 4, y - 48, 22, 12)
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x - 36, y - 10, 11, 0, 7); ctx.arc(x + 38, y - 10, 11, 0, 7); ctx.fill()
    ctx.fillStyle = red ? "#ff2020" : "#401010"; ctx.fillRect(x - 14, y - 58, 13, 6); ctx.fillStyle = red ? "#101040" : "#2040ff"; ctx.fillRect(x + 2, y - 58, 13, 6)
    ctx.save(); ctx.font = "900 9px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#1a1a2a"; ctx.fillText("POLICE", x, y - 17); ctx.restore() }
  // the Omnitrix flash
  if (BW.benFlash > 0) { BW.benFlash = Math.max(0, BW.benFlash - dt * 2.5); ctx.fillStyle = `rgba(80,255,110,${0.3 * BW.benFlash})`; ctx.fillRect(padL, G.y0, padR - padL, coverBottom - G.y0) }
  for (const s of BW.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  BW.shout = BW.shout.filter(s => s.t > 0)
}

// ───────────────────────────── ANGEL GROVE (Power Rangers; render-only, wall clock, own PRNG) ─────────────────────────────
// Sean's Sao Paulo street (Street Fighter III) as Angel Grove under monster attack — the Namek idea with Zords:
// downtown, at the end of the street, the THUNDER MEGAZORD and the NINJA MEGAZORD (the game's own Zord art) fight giant
// monsters (giant Krybots, recoloured) between the towers — slashes and punches land with explosions, the monsters hit
// back, go down in a huge blast, and Rita's lightning makes the next one grow. The FALCONZORD streaks over the
// rooftops and fires on them. Smoke rises from the city. In the street behind the fighters, Rangers (the game's real
// Ranger sprites) fight Krybots, and civilians run for their lives. The match drives it: a big hit → a stray blast hits
// the street (civilians knocked flat, the camera shakes); a fighter at ≤25% → the monsters go berserk on the city; the
// knockout → both Megazords' finishers, the monsters explode in a white-out, the Krybots blow apart, the street cheers.
let _agSeed = 0x6a09e667
const agRnd = () => { _agSeed ^= _agSeed << 13; _agSeed ^= _agSeed >>> 17; _agSeed ^= _agSeed << 5; return (_agSeed >>> 0) / 4294967296 }
const AG_RANGERS = ["mmpr_pink", "spd_red", "mmpr_black", "green_ranger", "spd_blue", "mmpr_white", "spd_yellow", "spd_green", "spd_pink"]
const AG = { p1: null, last: 0, hp: new WeakMap(), spr: null, loading: false, duels: null, falcon: null, pairs: null, ppl: null, far: [], near: [], debris: [], shout: [], monPos: [],
  rage: false, final: false, finT: 0, white: 0, geo: null,
  st: { zordHits: 0, zordHurt: 0, monstersDown: 0, grows: 0, krybotsDown: 0, rangerHits: 0, falconRuns: 0, falconShots: 0, knocked: 0, strays: 0, finishers: 0 } }
export const angelGroveState = () => ({ ...AG.st, sprites: AG.spr ? { rangers: AG.spr.rangers.length, krybot: !!AG.spr.krybot, thunder: !!AG.spr.cells.thunder.ready0, ninja: !!AG.spr.cells.ninja.ready0, falcon: !!AG.spr.cells.falcon.fly0,
    ready: AG.spr.rangers.filter(r => ready(r.A.idle?.im)).length } : null, civilians: (AG.ppl || []).length, fighting: (AG.pairs || []).length, rage: AG.rage, final: AG.final,
  monsters: (AG.duels || []).map(d => ({ hp: d.mon.hp, phase: d.phase, grow: +d.mon.grow.toFixed(2) })), shouting: AG.shout.filter(s => s.t > 0).map(s => s.txt) })
function agLoad() {
  if (AG.loading) return; AG.loading = true
  Promise.all([import("./characters.js"), import("./thunderMegazordSprites.js"), import("./ninjaMegazordSprites.js"), import("./falconzordSprites.js")]).then(([C, T, N, Fz]) => {
    const cellsOf = M => { const o = {}; for (const [k, c] of Object.entries(M)) { const im = new Image(); im.src = c.src; o[k] = { ...c, im } } return o }
    const anims = key => { const ch = C.characters?.[key]; if (!ch) return null; const A = {}
      for (const a of ["idle", "run", "light", "heavy", "hurt", "jump"]) { const d = ch.animationData?.[a]; if (!d?.sheet || !d.width || !d.height) continue; const im = new Image(); im.src = d.sheet; A[a] = { d, im } }
      return A.idle && A.run ? { key, A, sc: (ch.spriteScale || 1.8) } : null }
    AG.spr = { cells: { thunder: cellsOf(T.THUNDER_CELLS), ninja: cellsOf(N.NINJA_CELLS), falcon: cellsOf(Fz.FALCON_CELLS) }, rangers: AG_RANGERS.map(anims).filter(Boolean), krybot: anims("krybot") }
  }).catch(() => { AG.spr = { cells: { thunder: {}, ninja: {}, falcon: {} }, rangers: [], krybot: null } })
}
function agGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.street, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S }
}
function agShout(x, y, txt, col) { if (AG.shout.filter(s => s.t > 0).length < 4) AG.shout.push({ x, y, txt, col: col || "#222", t: 1.6 }) }
function agBoom(list, x, y, r) { list.push({ x, y, r, t: 0, life: 0.6 + r / 160 }); if (list.length > 60) list.shift() }
function agCell(ctx, set, name, x, y, sc, dir) {
  const c = AG.spr?.cells[set]?.[name]; if (!c || !ready(c.im)) return
  ctx.save(); ctx.translate(x, y); if (dir !== (c.face || 1)) ctx.scale(-1, 1); ctx.drawImage(c.im, -c.ax * sc, -c.ay * sc, c.w * sc, c.h * sc); ctx.restore()
}
function agAnim(ctx, U, name, t, x, y, sc, dir, filter) {
  const a = U?.A[name] || U?.A.idle; if (!a || !ready(a.im)) return
  const d = a.d, n = Math.max(1, Math.min(d.frames, Math.floor(a.im.naturalWidth / d.width))), f = Math.floor(t) % n
  const ox = (d.originX ?? d.width / 2) * sc, oy = (d.originY ?? d.height) * sc
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1); if (filter) ctx.filter = filter
  ctx.drawImage(a.im, f * d.width, 0, d.width, d.height, -ox, -oy, d.width * sc, d.height * sc); ctx.restore()
}
function agBooms(ctx, list, dt) {
  for (const b of list) { b.t += dt; const k = b.t / b.life; if (k >= 1) continue
    const r = b.r * (0.4 + k), a = 1 - k
    ctx.fillStyle = `rgba(80,70,70,${0.5 * a})`; ctx.beginPath(); ctx.arc(b.x + r * 0.2, b.y - r * 0.5 - k * 30, r * 0.9, 0, 7); ctx.fill()
    ctx.fillStyle = `rgba(255,${140 + 80 * a | 0},40,${0.9 * a})`; ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.75, 0, 7); ctx.fill()
    ctx.fillStyle = `rgba(255,255,220,${a})`; ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.35 * (1 - k), 0, 7); ctx.fill() }
  return list.filter(b => b.t < b.life)
}
function agSpark(ctx, x, y, r, col) { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) } ctx.stroke() }

const AG_ATTACKS = { thunder: [["draw0", "hslash0"], ["raise0", "over0", "over1"], ["low0", "rslash0", "rslash1"], ["thrust0", "lunge0"]],
  ninja: [["jab0", "punch0"], ["punch0", "punch1"], ["chamber0", "rearKick0"], ["crane0", "knee0"]] }
const AG_FINISH = { thunder: ["raise0", "over0", "dslash0"], ninja: ["draw0", "cut0", "finish0"] }
function agDuel(kind, i) { return { kind, i, phase: "idle", t: 1 + i, seq: null, ci: 0, ct: 0, zHurt: 0, mon: { hp: 6, hurtT: 0, atk: null, atkT: 0, fall: 0, grow: 1, fx: i ? "hue-rotate(110deg) saturate(1.5) brightness(0.9)" : "hue-rotate(250deg) saturate(1.6) brightness(0.85)" } } }
function agDuelStep(D, dt) {
  const M = D.mon; M.hurtT = Math.max(0, M.hurtT - dt); D.zHurt = Math.max(0, D.zHurt - dt)
  if (M.grow < 1) { M.grow = Math.min(1, M.grow + dt * 0.45); return null }
  D.t -= dt
  if (D.phase === "down") { M.fall = Math.min(1, M.fall + dt * 0.8); if (D.t <= 0) { if (AG.final) { D.phase = "gone"; return null } D.phase = "idle"; M.hp = 6; M.fall = 0; M.grow = 0.05; D.t = 2; AG.st.grows++; return "grow" } return null }
  if (D.phase === "gone") return null
  if (D.phase === "idle" && D.t <= 0) {
    if (agRnd() < (AG.rage ? 0.55 : 0.4)) { D.phase = "mon"; M.atk = agRnd() < 0.5 ? "light" : "heavy"; M.atkT = 0.7; D.t = 0.7 }
    else { D.phase = "zord"; D.seq = AG_ATTACKS[D.kind][Math.floor(agRnd() * 4)]; D.ci = 0; D.ct = 0.2 } }
  if (D.phase === "zord" || D.phase === "finish") { D.ct -= dt
    if (D.ct <= 0) { D.ci++; D.ct = D.phase === "finish" ? 0.35 : 0.2
      if (D.ci >= D.seq.length) { M.hurtT = 0.45; M.hp -= D.phase === "finish" ? 99 : 1; AG.st.zordHits++
        const out = M.hp <= 0 ? "down" : "hit"
        if (M.hp <= 0) { D.phase = "down"; D.t = AG.final ? 2.5 : 3.2; AG.st.monstersDown++ } else { D.phase = "idle"; D.t = 0.9 + agRnd() * 1.1 }
        return out } } }
  if (D.phase === "mon") { M.atkT -= dt; if (M.atkT <= 0) { M.atk = null; D.zHurt = 0.5; AG.st.zordHurt++; D.phase = "idle"; D.t = 1 + agRnd(); return "zhurt" } }
  return null
}

function drawAngelGroveSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = AG.geo = agGeo(def, c, W, dockTop), P = c.layout.pieces, S = def.S
  if (!AG.spr) agLoad()
  const dt = Math.min(0.05, Math.max(0, t - (AG.skyLast || t))); AG.skyLast = t
  const g = ctx.createLinearGradient(0, coverTop, 0, G.Y(222)); g.addColorStop(0, AG.rage ? "#a04a3a" : "#3a7ae0"); g.addColorStop(1, AG.rage ? "#e8a070" : "#9ad0f0")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const sk = P.sky, im = c.img[sk.file], skyY = G.Y(205) - sk.horizon * S
  for (const cp of mirrorCopies(G, G.w, padL, padR, true)) {
    const x0 = cp.X(0); if (ready(im)) ctx.drawImage(im, Math.floor(x0), skyY, Math.ceil(sk.w * S) + 1, sk.h * S)
    const cx = cp.X(P.street.gap[0]), gy = G.Y(P.street.gap[1]) + 75   // the giants' feet are hidden behind the wreck: they tower over the rooftops
    // smoke + fire in the towers
    for (let i = 0; i < 4; i++) { const sx = cx + (i - 1.5) * 52 * S / 1.3, base = gy - 40 - 30 * _h(i * 5 + cp.k)
      for (let j = 0; j < 7; j++) { const u = ((t * 0.18 + j / 7 + i * 0.13) % 1), r = 10 + u * 34 * (AG.rage ? 1.5 : 1)
        ctx.fillStyle = `rgba(${60 + 30 * u | 0},${55 + 30 * u | 0},${60 + 30 * u | 0},${0.55 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t + j + i) * 10 + u * 40, base - u * 180, r, 0, 7); ctx.fill() }
      ctx.fillStyle = `rgba(255,${120 + 60 * Math.sin(t * 9 + i) | 0},30,0.7)`; ctx.beginPath(); ctx.arc(sx, base, 6 + 3 * Math.sin(t * 7 + i), 0, 7); ctx.fill() }
  }
  agGiants(ctx, def, c, G, { padL, padR, coverTop }, t, dt)
}

function agGiants(ctx, def, c, G, { padL, padR, coverTop }, t, dt) {   // drawn BEHIND the street: they stand in the open end of the street, legs hidden by the wreck
  const P = c.layout.pieces, S = def.S
  if (!AG.duels) AG.duels = [agDuel("thunder", 0), agDuel("ninja", 1)]
  AG.monPos = []
  for (const cp of mirrorCopies(G, G.w, padL, padR, true)) {
    const cx = cp.X(P.street.gap[0]), gy = G.Y(P.street.gap[1]) + 8
    ctx.save()
    // the duel in this copy's stretch of downtown
    const D = AG.duels[((cp.k % 2) + 2) % 2], dir = D.i ? -1 : 1, zx = cx - dir * 92, mx = cx + dir * 92, zs = 3.3, ms = 5.2
    const zcell = D.phase === "zord" || D.phase === "finish" ? D.seq[Math.min(D.ci, D.seq.length - 1)] : D.zHurt > 0 ? (D.kind === "thunder" ? "brace0" : "stagger0") : (D.kind === "thunder" ? ["ready0", "ready1"] : ["ready0", "ready1"])[Math.floor(t * 2 + D.i) % 2]
    agCell(ctx, D.kind, zcell, zx, gy, zs, dir)
    if (D.phase === "finish" && D.kind === "thunder") { ctx.strokeStyle = `rgba(255,255,160,${0.6 + 0.4 * Math.sin(t * 30)})`; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(zx + dir * 40, gy - 300); ctx.lineTo(mx, gy - 60); ctx.stroke() }
    const M = D.mon, K = AG.spr?.krybot
    if (D.phase !== "gone" && K) { const gsc = ms * (M.grow < 1 ? M.grow : 1)
      ctx.save(); ctx.translate(mx, gy); ctx.rotate(dir * M.fall * 1.3); ctx.translate(-mx, -gy)
      agAnim(ctx, K, M.atk || (M.hurtT > 0 || D.phase === "down" ? "hurt" : "idle"), t * 6, mx, gy, gsc, -dir, M.fx + (M.hurtT > 0 ? " brightness(1.8)" : ""))
      ctx.restore()
      if (M.grow < 1) { ctx.strokeStyle = `rgba(220,160,255,${0.5 + 0.5 * Math.sin(t * 40)})`; ctx.lineWidth = 4; ctx.beginPath(); let lx = mx, ly = coverTop; ctx.moveTo(lx, ly); while (ly < gy) { lx += (agRnd() - 0.5) * 40; ly += 30; ctx.lineTo(lx, ly) } ctx.stroke()
        ctx.save(); ctx.font = "900 20px Georgia, serif"; ctx.textAlign = "center"; ctx.fillStyle = "#c070ff"; ctx.strokeStyle = "#200830"; ctx.lineWidth = 4; ctx.strokeText("MAKE MY MONSTER GROW!", mx, Math.max(coverTop + 40, gy - 330)); ctx.fillText("MAKE MY MONSTER GROW!", mx, Math.max(coverTop + 40, gy - 330)); ctx.restore() } }
    if (M.hurtT > 0.3) agSpark(ctx, mx - dir * 30, gy - 190, 60, "rgba(255,240,120,0.9)")
    if (D.zHurt > 0.35) agSpark(ctx, zx + dir * 20, gy - 180, 50, "rgba(160,255,255,0.9)")
    AG.monPos.push({ x: mx, y: gy - 190, D })
    ctx.restore()
  }
  // the Falconzord: streaks over the rooftops every so often and fires on a monster
  const F = AG.falcon
  if (!F && !AG.final) { AG.fT = (AG.fT ?? 4) - dt; if (AG.fT <= 0) { const l = agRnd() < 0.5; AG.falcon = { x: l ? padL - 150 : padR + 150, vx: l ? 520 : -520, y: G.Y(25) + agRnd() * 30, fired: false }; AG.fT = 11 + agRnd() * 6; AG.st.falconRuns++ } }
  if (F) { F.x += F.vx * dt; const dir = Math.sign(F.vx)
    agCell(ctx, "falcon", ["fly0", "fly1"][Math.floor(t * 10) % 2], F.x, F.y, 1.6, dir)
    const tgt = AG.monPos.find(m => m.D.phase !== "down" && m.D.phase !== "gone" && m.D.mon.grow >= 1 && Math.abs(m.x - F.x) < 220 && Math.sign(m.x - F.x) === dir)
    if (tgt && !F.fired) { F.fired = true; F.beam = { x: tgt.x, y: tgt.y, t: 0.3 }; AG.st.falconShots++; agBoom(AG.far, tgt.x, tgt.y, 40); tgt.D.mon.hurtT = 0.4; tgt.D.mon.hp = Math.max(1, tgt.D.mon.hp - 1) }
    if (F.beam && F.beam.t > 0) { F.beam.t -= dt; ctx.strokeStyle = "rgba(255,230,90,0.95)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(F.x, F.y + 10); ctx.lineTo(F.beam.x, F.beam.y); ctx.stroke() }
    if (F.x < padL - 300 || F.x > padR + 300) AG.falcon = null }
  AG.far = agBooms(ctx, AG.far, dt)
}

function angelGroveFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), FF = (_lastWorld?.fighters || []).filter(Boolean), G = AG.geo || agGeo(def, c, W, dockTop), S = def.S
  if (FF[0] !== AG.p1) { Object.assign(AG, { p1: FF[0], hp: new WeakMap(), duels: null, falcon: null, pairs: null, ppl: null, far: [], near: [], debris: [], shout: [], rage: false, final: false, finT: 0, white: 0, fT: 4 })
    for (const k in AG.st) AG.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (AG.last || t))); AG.last = t
  const feet = dockTop + 3 * S, mid = FF.length ? FF.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / FF.length : W / 2
  // the giant duels (state; drawn in the sky layer)
  for (const D of AG.duels || []) { const ev = agDuelStep(D, dt), m = AG.monPos.find(p => p.D === D)
    if (ev === "hit" && m) agBoom(AG.far, m.x, m.y + (agRnd() - 0.5) * 40, 34)
    if (ev === "down" && m) { agBoom(AG.far, m.x, m.y, 130); agBoom(AG.far, m.x + 40, m.y + 50, 90); camera.shake?.(7, 26) }
    if (ev === "down" && !m) camera.shake?.(4, 14)
    if (ev === "grow" && m) agShout(m.x, m.y - 150, "MAKE MY MONSTER GROW!", "#8a2ad0") }
  // the fight → the city
  let big = false, low = false, ko = false
  for (const f of FF) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = AG.hp.get(f); AG.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = true }
  if (!AG.ppl) {
    AG.ppl = Array.from({ length: 9 }, (_, i) => ({ kind: ["walk", "kid", "walk", "stroller", "old", "walk", "kid", "mail", "walk"][i], seed: i * 2.1, x: padL + (padR - padL) * ((i * 0.41 + 0.07) % 1), dir: i % 2 ? -1 : 1,
      speed: 120 + 60 * ((i * 0.37) % 1), mode: "walk", ph: i, cheer: 1, go: true, phone: false, down: 0,
      shirt: ["#d84a4a", "#3a7ad8", "#f0c040", "#4aa860", "#9a5ad0", "#e8e8e8", "#f08a3a", "#2a3a7a", "#c83a8a"][i], pants: ["#2a3a6a", "#3a3a3a", "#5a4a3a"][i % 3],
      skin: ["#f1c9a5", "#c58c64", "#8a5a3a", "#e0b090", "#6a4028"][i % 5], hair: ["#3a2a1a", "#1a1a1a", "#8a4a2a", "#d8b060"][i % 4], hat: i === 7 ? "#2a3a7a" : null }))
  }
  if (!AG.pairs && AG.spr?.krybot && AG.spr.rangers.length) AG.pairs = [0.3, 0.44, 0.58, 0.72].map((u, i) => ({ x: padL + (padR - padL) * u, r: i, k: { hp: 3, x: 0, ent: 0, hurt: 0, atk: 0, gone: 0 }, rHurt: 0, rAtk: 0, rName: "idle", t: i * 0.4, dir: i % 2 ? -1 : 1 }))
  if (big) { AG.st.strays++; const tx = AG.ppl.length ? AG.ppl[Math.floor(agRnd() * AG.ppl.length)].x : mid
    agBoom(AG.near, tx, feet - 30, 70); camera.shake?.(5, 14)
    for (let i = 0; i < 14; i++) AG.debris.push({ x: tx + (agRnd() - 0.5) * 60, y: feet - 40, vx: (agRnd() - 0.5) * 300, vy: -250 - agRnd() * 250, life: 1.4 })
    for (const p of AG.ppl) if (Math.abs(p.x - tx) < 140 && !p.down) { p.down = 2.2; AG.st.knocked++ }
    agShout(tx, feet - 150, ["RUN!!", "MY CAR!!", "LOOK OUT!", "WHERE ARE THE POWER RANGERS?!"][AG.st.strays % 4], "#c03020") }
  if (low && !AG.rage) { AG.rage = true; agShout(mid, feet - 190, "THE MONSTERS ARE DESTROYING THE CITY!", "#c03020") }
  if (AG.rage && !AG.final && agRnd() < dt * 1.2 && AG.monPos.length) { const m = AG.monPos[Math.floor(agRnd() * AG.monPos.length)]; agBoom(AG.far, m.x + (agRnd() - 0.5) * 220, m.y + 40 + agRnd() * 60, 50) }
  if (ko && !AG.final) { AG.final = true; AG.st.finishers++
    for (const D of AG.duels || []) if (D.phase !== "down" && D.phase !== "gone") { D.phase = "finish"; D.seq = AG_FINISH[D.kind]; D.ci = 0; D.ct = 0.35; D.mon.grow = 1 }
    AG.finT = 1.1; agShout(mid, feet - 200, "POWER RANGERS — FINISH IT!", "#d02a2a") }
  if (AG.finT > 0) { AG.finT -= dt; if (AG.finT <= 0) { AG.white = 1; camera.shake?.(12, 50); for (const m of AG.monPos) { agBoom(AG.far, m.x, m.y, 170); agBoom(AG.far, m.x - 50, m.y + 60, 120) } } }
  // ── civilians running for their lives (arms up)
  for (const p of AG.ppl) {
    if (p.down > 0) { p.down -= dt; ctx.save(); ctx.translate(p.x, feet - 2 * S); ctx.rotate(-p.dir * Math.PI / 2 * Math.min(1, (2.2 - p.down) * 4)); bwPerson(ctx, { ...p, cheer: 0, go: false, mode: "watch" }, 0, 0, 0.95, t); ctx.restore(); continue }
    if (AG.final) { p.go = false; p.cheer = 1; p.mode = "watch"; p.phone = false } else { p.x += p.dir * p.speed * dt; p.ph += dt * p.speed / 6; p.cheer = 1 }
    if (p.x > padR + 120) { p.x = padL - 100; } if (p.x < padL - 120) p.x = padR + 100
    bwPerson(ctx, p, p.x, feet - 2 * S, 0.95, t) }
  // ── Rangers vs Krybots in the street
  const R = AG.spr?.rangers || [], K = AG.spr?.krybot
  for (const pr of AG.pairs || []) { const ranger = R[pr.r % R.length], kb = pr.k, d = pr.dir
    pr.t -= dt; pr.rHurt = Math.max(0, pr.rHurt - dt); pr.rAtk = Math.max(0, pr.rAtk - dt); kb.hurt = Math.max(0, kb.hurt - dt); kb.atk = Math.max(0, kb.atk - dt)
    if (kb.gone > 0) { kb.gone -= dt; if (kb.gone <= 0) Object.assign(kb, { hp: 3, ent: 1, hurt: 0, atk: 0 }) }
    else if (kb.ent > 0) kb.ent = Math.max(0, kb.ent - dt * 0.9)
    else if (pr.t <= 0 && !AG.final) { pr.t = 0.6 + agRnd() * 0.7
      if (agRnd() < 0.72) { pr.rAtk = 0.35; pr.rName = agRnd() < 0.5 ? "light" : "heavy"; kb.hurt = 0.3; kb.hp--
        if (kb.hp <= 0) { kb.gone = 2.2; AG.st.krybotsDown++; agBoom(AG.near, pr.x + d * 46, feet - 40, 34); if (AG.st.krybotsDown % 3 === 1) agShout(pr.x, feet - 130, ["KRYBOTS DOWN!", "PROTECT THE CIVILIANS!", "WE NEED MEGAZORD POWER, NOW!"][Math.floor(AG.st.krybotsDown / 3) % 3], "#2a4ad0") } }
      else { kb.atk = 0.35; pr.rHurt = 0.4; AG.st.rangerHits++ } }
    if (AG.final && kb.gone <= 0 && kb.hp > 0) { kb.hp = 0; kb.gone = 99; AG.st.krybotsDown++; agBoom(AG.near, pr.x + d * 46, feet - 40, 40) }
    if (!ranger) continue
    const rn = AG.final ? (Math.floor(t * 2 + pr.r) % 2 ? "jump" : "idle") : pr.rHurt > 0 ? "hurt" : pr.rAtk > 0 ? pr.rName : "idle"
    agAnim(ctx, ranger, rn, t * 8 + pr.r, pr.x - d * (pr.rHurt > 0 ? 10 : 0), feet, ranger.sc * 0.5, d)
    if (K && kb.gone <= 0 && kb.hp > 0) { const kx = pr.x + d * (54 + kb.ent * 400)
      agAnim(ctx, K, kb.ent > 0 ? "run" : kb.atk > 0 ? "light" : kb.hurt > 0 ? "hurt" : "idle", t * 8 + pr.r * 3, kx, feet, K.sc * 0.5, -d, kb.hurt > 0 ? "brightness(1.8)" : null)
      if (kb.hurt > 0.15) agSpark(ctx, kx - d * 14, feet - 50, 16, "rgba(255,240,140,0.95)") } }
  // ── debris, near blasts, shouts, the white-out
  for (const p of AG.debris) { p.life -= dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = "#6a625a"; ctx.fillRect(p.x, p.y, 6, 5) }
  AG.debris = AG.debris.filter(p => p.life > 0 && p.y < coverBottom)
  AG.near = agBooms(ctx, AG.near, dt)
  for (const s of AG.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  AG.shout = AG.shout.filter(s => s.t > 0)
  if (AG.white > 0) { AG.white = Math.max(0, AG.white - dt * 0.7); ctx.fillStyle = `rgba(255,255,240,${AG.white * 0.85})`; ctx.fillRect(padL, G.y0 - 400, padR - padL, coverBottom - G.y0 + 400) }
}

// ───────────────────────────── THE SEIREITEI, SOUL SOCIETY (Bleach; render-only, wall clock, own PRNG) ─────────────────────────────
// Retsu's temple courtyard (Street Fighter, 1987) repainted as a Seireitei division gate (the same sheet as Arlong Park,
// the other way): white walls, slate roofs, sakura. Beyond the wall the Seireitei's rooftops run on to Sōkyoku Hill (the
// giant halberd on its scaffold) and the white Senzaikyū tower. Hell butterflies drift, sakura petals fall, Soul Reapers
// flash-step (shunpo) across the far rooftops and along the wall; the Senkaimon gate lights up and lets out butterflies.
// The Bleach cast who aren't fighting stand in the courtyard and react (the shared crowd: Ichigo, Byakuya, Yamamoto,
// Zaraki, Mayuri — real idle sprites) beside a squad of Soul Reaper officers who brace on big hits and raise their swords at the end. Big hits → a wave of spiritual pressure (a ring, petals blown away, the Soul
// Reapers brace); a fighter at ≤25% → a Garganta tears the sky open and a Menos Grande leans out; the knockout → the
// Sōkyoku fires: a phoenix of fire rises off the hill and screams across the sky, white-gold flash, long shake.
let _srSeed = 0x510e527f
const srRnd = () => { _srSeed ^= _srSeed << 13; _srSeed ^= _srSeed >>> 17; _srSeed ^= _srSeed << 5; return (_srSeed >>> 0) / 4294967296 }
const SR_CROWD = [["ichigo", 0.33, 0], ["byakuya", 0.44, 0], ["zaraki", 0.56, 0], ["mayuri", 0.67, 0]]   // (Yamamoto's art isn't on disk)
const SRC = makeCrowd(SR_CROWD, 0.6)
const SR = { p1: null, last: 0, hp: new WeakMap(), bfly: null, petals: null, reapers: null, rings: [], gateT: 6, gate: 0, garg: 0, menos: false, phoenix: null, flash: 0, shout: [], geo: null,
  st: { flashSteps: 0, gateOpens: 0, waves: 0, gargantas: 0, phoenix: 0, blown: 0 } }
export const seireiteiState = () => ({ ...SR.st, butterflies: (SR.bfly || []).length, petals: (SR.petals || []).length, reapers: (SR.reapers || []).length, garg: +SR.garg.toFixed(2), menos: SR.menos,
  phoenixFlying: !!SR.phoenix, crowd: crowdState(SRC), shouting: SR.shout.filter(s => s.t > 0).map(s => s.txt) })
function srGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.wall, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S, roof: y0 + 112 * S, wallTop: y0 + 118 * S }
}
function srShout(x, y, txt, col) { if (SR.shout.filter(s => s.t > 0).length < 3) SR.shout.push({ x, y, txt, col: col || "#222", t: 1.8 }) }
function srReaper(ctx, x, y, s, f, t) {   // a Soul Reaper: black shihakushō, white undershirt, a sword at the hip (~60px at s 1)
  const run = f.run ? Math.sin(t * 18 + f.seed) * 0.6 : 0
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f.dir, s)
  ctx.fillStyle = "#111"; for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 3, -24); ctx.rotate(k * run); ctx.fillRect(-4, 0, 8, 24); ctx.restore() }
  ctx.beginPath(); ctx.moveTo(-10, -50); ctx.lineTo(10, -50); ctx.lineTo(12, -20); ctx.lineTo(-12, -20); ctx.fill()
  ctx.fillStyle = "#f2f2f2"; ctx.beginPath(); ctx.moveTo(-3, -50); ctx.lineTo(3, -50); ctx.lineTo(0, -40); ctx.fill()
  if (f.captain) { ctx.fillStyle = "#f4f4f0"; ctx.fillRect(-12, -50, 24, 26) }                                     // a captain's haori
  ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, -28); ctx.lineTo(-22, -10); ctx.stroke()
  ctx.fillStyle = "#e8c8a0"; ctx.beginPath(); ctx.arc(1, -57, 7, 0, 7); ctx.fill(); ctx.fillStyle = f.hair; ctx.beginPath(); ctx.arc(0, -59, 7.3, Math.PI, 0); ctx.fill()
  ctx.restore()
}
function srButterfly(ctx, b, t) {
  const flap = Math.abs(Math.sin(t * 9 + b.seed)), w = 7 * b.s
  ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = "#121014"
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k * w * 0.55 * (0.4 + flap * 0.6), -2, w * 0.55 * (0.4 + flap * 0.6), w * 0.5, k * 0.5, 0, 7); ctx.fill()
    ctx.beginPath(); ctx.ellipse(k * w * 0.4 * (0.4 + flap * 0.6), 3, w * 0.35 * (0.4 + flap * 0.6), w * 0.35, -k * 0.4, 0, 7); ctx.fill() }
  ctx.fillStyle = "rgba(120,60,140,0.8)"; ctx.fillRect(-0.8, -4, 1.6, 8); ctx.restore()
}

function drawSeireiteiSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = SR.geo = srGeo(def, c, W, dockTop), S = def.S
  const red = SR.garg > 0 ? SR.garg : 0
  const g = ctx.createLinearGradient(0, coverTop, 0, G.roof); g.addColorStop(0, red ? `rgb(${60 + 60 * red | 0},${110 - 50 * red | 0},${200 - 110 * red | 0})` : "#5a9ae0"); g.addColorStop(1, "#f2dcc8")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const hz = G.Y(104)
  // Sōkyoku Hill + the halberd on its scaffold
  { const hx = W * 0.33 + shift(0.12, W), top = G.Y(18)
    ctx.fillStyle = "#8a8078"; ctx.beginPath(); ctx.moveTo(hx - 260, hz); ctx.lineTo(hx - 150, top + 40); ctx.lineTo(hx - 60, top + 20); ctx.lineTo(hx + 80, top + 26); ctx.lineTo(hx + 170, top + 60); ctx.lineTo(hx + 280, hz); ctx.fill()
    ctx.fillStyle = "#a0968c"; ctx.beginPath(); ctx.moveTo(hx - 150, top + 40); ctx.lineTo(hx - 60, top + 20); ctx.lineTo(hx + 80, top + 26); ctx.lineTo(hx + 60, top + 50); ctx.lineTo(hx - 120, top + 56); ctx.fill()
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 2; ctx.beginPath(); for (const k of [-16, 16]) { ctx.moveTo(hx + k, top + 22); ctx.lineTo(hx + k * 0.4, top - 70) } ctx.moveTo(hx - 14, top - 10); ctx.lineTo(hx + 14, top - 10); ctx.moveTo(hx - 10, top - 40); ctx.lineTo(hx + 10, top - 40); ctx.stroke()
    const glow = SR.phoenix ? 1 : 0.4 + 0.2 * Math.sin(t * 2)
    ctx.strokeStyle = `rgba(255,${200 + 40 * glow | 0},120,${glow})`; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(hx, top - 72); ctx.lineTo(hx, top - 150); ctx.stroke()
    ctx.fillStyle = `rgba(255,230,160,${glow})`; ctx.beginPath(); ctx.moveTo(hx, top - 150); ctx.lineTo(hx + 12, top - 132); ctx.lineTo(hx, top - 122); ctx.fill() }
  // the Senzaikyū: the white tower with its long bridge
  { const tx = W * 0.7 + shift(0.12, W), top = G.Y(-70)
    ctx.fillStyle = "#f4f2ee"; ctx.fillRect(tx - 16, top, 32, hz - top); ctx.fillStyle = "#d8d4cc"; ctx.fillRect(tx + 8, top, 8, hz - top)
    ctx.fillStyle = "#3a3e48"; ctx.beginPath(); ctx.moveTo(tx - 22, top); ctx.lineTo(tx, top - 26); ctx.lineTo(tx + 22, top); ctx.fill()
    ctx.fillStyle = "#e8e4dc"; ctx.fillRect(tx - 160, top + 70, 144, 5); ctx.fillStyle = "#222"; ctx.fillRect(tx - 6, top + 14, 12, 18) }
  // the Seireitei's rooftops running on to the horizon
  for (const [p, y0, hgt, col, wcol] of [[0.25, hz - 16, 22, "#5a6070", "#e8e4dc"], [0.45, hz + 8, 30, "#3e4450", "#f2eee6"]]) {
    const ps = shift(p, W), step = 86
    for (let i = Math.floor((padL - ps) / step) - 1; i * step + ps < padR + step; i++) { const x = i * step + ps, h = hgt + 10 * _h(i * 7 + p * 100)
      ctx.fillStyle = wcol; ctx.fillRect(x + 6, y0 - h * 0.45, step - 10, h * 0.45 + 30)
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 4, y0 - h * 0.4); ctx.lineTo(x + 10, y0 - h); ctx.lineTo(x + step - 14, y0 - h); ctx.lineTo(x + step, y0 - h * 0.4); ctx.fill() } }
  // Soul Reapers flash-stepping across the far roofs
  if (!SR.reapers) SR.reapers = Array.from({ length: 6 }, (_, i) => ({ seed: i * 3.3, x: padL + (padR - padL) * ((i * 0.31 + 0.1) % 1), dir: i % 2 ? -1 : 1, t: i * 0.4, hair: ["#1a1a1a", "#d84a2a", "#3a2a1a", "#e8e0c0"][i % 4], captain: i === 2, run: true, trail: null, wall: i >= 4 }))
  for (const r of SR.reapers) { if (r.wall) continue
    r.t -= 1 / 60; if (r.t <= 0) { const nx = r.x + r.dir * (90 + srRnd() * 140); r.trail = { x0: r.x, x1: nx, a: 1 }; r.x = nx; r.t = 0.8 + srRnd() * 1.4; SR.st.flashSteps++; if (r.x < padL - 40 || r.x > padR + 40) { r.dir *= -1 } }
    if (r.trail && r.trail.a > 0) { r.trail.a -= 0.06; ctx.strokeStyle = `rgba(20,20,30,${0.4 * r.trail.a})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(r.trail.x0, hz - 26); ctx.lineTo(r.trail.x1, hz - 26); ctx.stroke() }
    srReaper(ctx, r.x, hz - 6, 0.5, r, t) }
  // the Garganta + the Menos Grande
  if (SR.garg > 0) { const gx = W * 0.52 + shift(0.1, W), gy = G.Y(-20), o = SR.garg
    ctx.fillStyle = "#050208"; ctx.beginPath(); ctx.moveTo(gx - 170 * o, gy); for (let i = 0; i <= 12; i++) { const x = gx - 170 * o + i * 340 * o / 12; ctx.lineTo(x, gy - (i % 2 ? 60 : 20) * o) } for (let i = 12; i >= 0; i--) { const x = gx - 170 * o + i * 340 * o / 12; ctx.lineTo(x, gy + (i % 2 ? 70 : 24) * o) } ctx.fill()
    if (SR.menos) { const mx = gx, my = gy + 10, rise = Math.min(1, (SR.garg - 0.6) * 2.5)
      ctx.save(); ctx.beginPath(); ctx.rect(gx - 170, gy - 70, 340, 150); ctx.clip()
      ctx.fillStyle = "#0c0a0e"; ctx.beginPath(); ctx.ellipse(mx, my + 80 - 40 * rise, 60, 90, 0, 0, 7); ctx.fill()
      ctx.fillStyle = "#f2f0ec"; ctx.beginPath(); ctx.ellipse(mx, my + 10 - 40 * rise, 26, 30, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(mx - 6, my + 20 - 40 * rise); ctx.lineTo(mx, my + 64 - 40 * rise); ctx.lineTo(mx + 6, my + 20 - 40 * rise); ctx.fill()
      ctx.fillStyle = "#c01010"; ctx.beginPath(); ctx.arc(mx - 10, my + 4 - 40 * rise, 4, 0, 7); ctx.arc(mx + 10, my + 4 - 40 * rise, 4, 0, 7); ctx.fill(); ctx.restore() } }
  // the Sōkyoku's phoenix
  if (SR.phoenix) { const P = SR.phoenix, k = P.t
    const x = W * 0.33 + shift(0.12, W) + k * 420, y = G.Y(-60) - Math.sin(Math.min(1, k) * Math.PI) * 120 + (1 - Math.min(1, k * 2)) * 160, wing = Math.sin(t * 8) * 0.6
    for (let i = 0; i < 26; i++) { const a = i / 26, side = i % 2 ? 1 : -1, len = 220 * (0.4 + a)
      ctx.fillStyle = `rgba(255,${120 + 120 * a | 0},${30 + 60 * a | 0},${0.55 * (1 - a * 0.6)})`; ctx.beginPath(); ctx.ellipse(x + side * len * 0.5, y - wing * len * 0.4 * side * side + a * 20, len * 0.5, 18 * (1 - a) + 6, side * (0.3 + wing * 0.5), 0, 7); ctx.fill() }
    ctx.fillStyle = "rgba(255,250,210,0.95)"; ctx.beginPath(); ctx.ellipse(x, y, 40, 26, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 34, y - 6); ctx.lineTo(x + 78, y - 22); ctx.lineTo(x + 36, y + 8); ctx.fill()
    for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(255,${150 + 10 * i},40,${0.5 - i * 0.04})`; ctx.beginPath(); ctx.arc(x - 40 - i * 26, y + Math.sin(t * 6 + i) * 8, 22 - i * 1.6, 0, 7); ctx.fill() } }
}

function seireiteiFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = SR.geo || srGeo(def, c, W, dockTop), S = def.S, P = c.layout.pieces
  if (F[0] !== SR.p1) { Object.assign(SR, { p1: F[0], hp: new WeakMap(), squad: null, bfly: null, petals: null, reapers: null, rings: [], gateT: 6, gate: 0, garg: 0, menos: false, phoenix: null, flash: 0, shout: [] }); for (const k in SR.st) SR.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (SR.last || t))); SR.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2
  if (!SR.bfly) SR.bfly = Array.from({ length: 9 }, (_, i) => ({ x: padL + (padR - padL) * ((i * 0.29 + 0.05) % 1), y: G.Y(40 + 90 * ((i * 0.43) % 1)), vx: 0, vy: 0, seed: i * 1.9, s: 1 + 0.3 * ((i * 0.7) % 1), life: 1e9 }))
  if (!SR.petals) SR.petals = Array.from({ length: 60 }, (_, i) => ({ x: padL + (padR - padL) * ((i * 0.137) % 1), y: G.y0 + (coverBottom - G.y0) * ((i * 0.291) % 1), vx: 20 + 20 * ((i * 0.53) % 1), vy: 30 + 25 * ((i * 0.71) % 1), r: (i * 0.9) % 6 }))
  // the fight
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = SR.hp.get(f); SR.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big) { SR.st.waves++; const bx = big.x + (big.w || 50) / 2, by = dockTop + 18 * S - 70
    SR.rings.push({ x: bx, y: by, r: 10, a: 1 }); camera.shake?.(3, 10)
    for (const p of SR.petals) { const dx = p.x - bx, d = Math.max(30, Math.abs(dx)); if (d < 600) { p.vx += Math.sign(dx || 1) * 420 * (1 - d / 600); p.vy -= 160 * (1 - d / 600); SR.st.blown++ } }
    for (const b of SR.bfly) { const dx = b.x - bx; if (Math.abs(dx) < 500) { b.vx += Math.sign(dx || 1) * 200; b.vy -= 80 } }
    if (SR.st.waves % 2 === 1) srShout(bx, by - 120, ["SUCH SPIRITUAL PRESSURE…!", "THIS REIATSU…!", "BANKAI-LEVEL…?!"][Math.floor(SR.st.waves / 2) % 3], "#2a4a9a") }
  if (low && SR.garg === 0 && !SR.phoenix) { SR.garg = 0.01; SR.st.gargantas++; srShout(mid, G.Y(20), "A GARGANTA?! HOLLOWS IN THE SEIREITEI!", "#8a1a1a") }
  if (SR.garg > 0 && SR.garg < 1 && !ko) { SR.garg = Math.min(1, SR.garg + dt * 0.5); if (SR.garg > 0.6) SR.menos = true }
  if (ko && !SR.phoenix && !SR.st.phoenix) { SR.phoenix = { t: 0 }; SR.st.phoenix++; SR.flash = 1; camera.shake?.(10, 45); srShout(mid, G.Y(10), "THE SŌKYOKU…!", "#c06010") }
  if (SR.phoenix) { SR.phoenix.t += dt * 0.45; if (SR.garg > 0) { SR.garg = Math.max(0, SR.garg - dt * 0.6); if (SR.garg < 0.5) SR.menos = false } if (SR.phoenix.t > 2.4) SR.phoenix = null }
  // the Senkaimon: the gate's seam lights up, hell butterflies stream out
  SR.gateT -= dt; if (SR.gateT <= 0) { SR.gateT = 16 + srRnd() * 8; SR.gate = 2.6; SR.st.gateOpens++
    for (let i = 0; i < 6; i++) SR.bfly.push({ x: G.X(384) + (srRnd() - 0.5) * 20, y: G.Y(150), vx: (srRnd() - 0.5) * 120, vy: -60 - srRnd() * 60, seed: srRnd() * 9, s: 1, life: 9 }) }
  // division sign over the gate
  { const x = G.X(P.wall.sign[0]), y = G.Y(P.wall.sign[1]) - 4 * S, w = 26 * S, h = 16 * S
    ctx.fillStyle = "#f6f4ee"; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.strokeStyle = "#2a2a30"; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - h / 2, w, h)
    ctx.save(); ctx.font = `900 ${Math.round(9 * S)}px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#111"; ctx.fillText("一番隊", x, y + 1); ctx.restore() }
  if (SR.gate > 0) { SR.gate -= dt; const a = Math.min(1, SR.gate) * (0.6 + 0.4 * Math.sin(t * 20)), gx = G.X(384), gy0 = G.Y(120), gy1 = G.Y(186)
    const gl = ctx.createLinearGradient(gx - 40, 0, gx + 40, 0); gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, `rgba(255,255,250,${a})`); gl.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = gl; ctx.fillRect(gx - 40, gy0, 80, gy1 - gy0) }
  // Soul Reapers flash-stepping along the top of the wall
  for (const r of SR.reapers || []) { if (!r.wall) continue
    r.t -= dt; if (r.t <= 0) { const nx = r.x + r.dir * (140 + srRnd() * 200); r.trail = { x0: r.x, x1: nx, a: 1 }; r.x = nx; r.t = big ? 1.2 : 0.7 + srRnd() * 1.2; SR.st.flashSteps++; if (r.x < padL + 20 || r.x > padR - 20) r.dir *= -1 }
    if (r.trail && r.trail.a > 0) { r.trail.a -= dt * 3; ctx.strokeStyle = `rgba(20,20,30,${0.4 * r.trail.a})`; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(r.trail.x0, G.wallTop - 30); ctx.lineTo(r.trail.x1, G.wallTop - 30); ctx.stroke() }
    srReaper(ctx, r.x, G.wallTop + 4, 1.0, r, t) }
  // a squad of Soul Reaper officers lined up by the lanterns
  if (!SR.squad) SR.squad = [0.08, 0.2, 0.26, 0.74, 0.8, 0.92].map((u, i) => ({ u, seed: i * 2.7, dir: u < 0.5 ? 1 : -1, hair: ["#1a1a1a", "#3a2a1a", "#d8c8a0", "#1a1a1a", "#8a3a2a", "#2a2a3a"][i], captain: i === 2 || i === 3, run: false, brace: 0 }))
  for (const q of SR.squad) { q.brace = Math.max(0, q.brace - dt); if (big) q.brace = 0.8
    const x = G.X(q.u * P.wall.w) - (q.brace > 0 ? q.dir * 10 : 0), y = G.Y(186)
    ctx.save(); if (q.brace > 0) { ctx.translate(x, y); ctx.rotate(-q.dir * 0.12); ctx.translate(-x, -y) }
    srReaper(ctx, x, y, 1.35, { ...q, dir: mid > x ? 1 : -1 }, t)
    if (SR.phoenix || q.brace > 0) { ctx.strokeStyle = "#d8dce4"; ctx.lineWidth = 3; ctx.beginPath(); const d = mid > x ? 1 : -1; ctx.moveTo(x + d * 10, y - 60); ctx.lineTo(x + d * (SR.phoenix ? 18 : 40), y - (SR.phoenix ? 120 : 90)); ctx.stroke() }   // zanpakutō drawn
    ctx.restore() }
  SR.st.squad = SR.squad.length
  // the Bleach cast in the courtyard (shared crowd: reacts by itself, steps away from the fight)
  drawCrowd(ctx, SRC, { W, feet: G.Y(186), sh: shift(0.9, W) })
  // reiatsu rings, butterflies, petals, shouts, the phoenix's flash
  for (const r of SR.rings) { r.r += dt * 900; r.a -= dt * 1.3; if (r.a <= 0) continue
    ctx.strokeStyle = `rgba(170,210,255,${r.a})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, 7); ctx.stroke()
    ctx.strokeStyle = `rgba(255,255,255,${r.a * 0.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 0.8, r.r * 0.36, 0, 0, 7); ctx.stroke() }
  SR.rings = SR.rings.filter(r => r.a > 0)
  for (const b of SR.bfly) { b.life -= dt; b.vx *= 0.97; b.vy *= 0.97; b.x += (b.vx + Math.sin(t * 0.7 + b.seed) * 30) * dt; b.y += (b.vy + Math.cos(t * 1.1 + b.seed) * 18) * dt
    if (b.x < padL - 30) b.x = padR + 20; if (b.x > padR + 30) b.x = padL - 20; b.y = Math.max(G.y0 - 100, Math.min(dockTop, b.y)); srButterfly(ctx, b, t) }
  SR.bfly = SR.bfly.filter(b => b.life > 0).slice(-30)
  for (const p of SR.petals) { p.vx += (40 - p.vx) * dt * 0.8; p.vy += (40 - p.vy) * dt * 0.8; p.x += (p.vx + Math.sin(t * 2 + p.r) * 20) * dt; p.y += p.vy * dt
    if (p.y > coverBottom) { p.y = G.y0 - 40; p.x = padL + srRnd() * (padR - padL) } if (p.x > padR + 20) p.x = padL - 10; if (p.x < padL - 20) p.x = padR + 10
    ctx.fillStyle = "rgba(255,190,210,0.9)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 2.4, t * 2 + p.r, 0, 7); ctx.fill() }
  for (const s of SR.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  SR.shout = SR.shout.filter(s => s.t > 0)
  if (SR.flash > 0) { SR.flash = Math.max(0, SR.flash - dt * 0.8); ctx.fillStyle = `rgba(255,236,190,${SR.flash * 0.8})`; ctx.fillRect(padL, G.y0 - 300, padR - padL, coverBottom - G.y0 + 300) }
}

// ───────────────────────────── THE MUGEN TRAIN (Demon Slayer; render-only, wall clock, own PRNG) ─────────────────────────────
// Joe's train yard (Street Fighter, 1987) repainted at night: the Mugen Train's maroon carriages with every window lit and
// the passengers slumped asleep inside. A full moon over dark mountains, steam drifting off the engine. ENMU has fused with
// the train: as the match goes on his flesh creeps over the carriages (tendrils, pulsing veins, eyes that open and blink),
// and he stands on the roof. Lesser demons crawl the roofs and Demon Slayer Corps swordsmen cut them down; the Demon Slayer
// cast who aren't fighting stand on the track bed and react (shared crowd, real sprites). Big hit → the flesh flinches, a
// tentacle lashes, the eyes open wide; ≤25% → "THE TRAIN AND I ARE ONE!": the flesh covers everything, hands reach out of
// the windows, the moon turns red; KO → a Thunder Breathing streak + a Flame Breathing arc cut Enmu's neck: the flesh
// shrivels screaming, the train shudders, and dawn breaks over the mountains.
let _mgSeed = 0x6a09e667
const mgRnd = () => { _mgSeed ^= _mgSeed << 13; _mgSeed ^= _mgSeed >>> 17; _mgSeed ^= _mgSeed << 5; return (_mgSeed >>> 0) / 4294967296 }
const MG_CROWD = [["zenitsu", 0.16, 0], ["inosuke", 0.28, 0], ["nezuko", 0.4, 0], ["shinobu", 0.62, 0], ["rengoku", 0.82, 0]]
const MGC = makeCrowd(MG_CROWD, 0.6)
const MG = { p1: null, last: 0, hp: new WeakMap(), start: 0, grow: 0, flinch: 0, rage: false, cut: null, dawn: 0, shake: 0, lash: [], demons: [], slayers: null, puffs: [], shout: [], geo: null, whistle: 9,
  st: { kills: 0, lashes: 0, rage: 0, cut: 0, eyes: 0, whistles: 0 } }
export const mugenState = () => ({ ...MG.st, grow: +MG.grow.toFixed(2), rage: MG.rage, dawn: +MG.dawn.toFixed(2), demons: MG.demons.length, slayers: (MG.slayers || []).length, puffs: MG.puffs.length,
  crowd: crowdState(MGC), shouting: MG.shout.filter(s => s.t > 0).map(s => s.txt) })
function mgGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.yard, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S }
}
function mgShout(x, y, txt, col) { if (MG.shout.filter(s => s.t > 0).length < 3) MG.shout.push({ x, y, txt, col: col || "#222", t: 1.9 }) }
function mgSlayer(ctx, x, y, s, f, t) {   // a Demon Slayer Corps swordsman: black uniform, white leggings, a katana (~60px at s 1)
  const run = f.run ? Math.sin(t * 16 + f.seed) * 0.7 : 0
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f.dir, s)
  ctx.fillStyle = "#f0f0ea"; for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 3, -22); ctx.rotate(k * run); ctx.fillRect(-3.5, 0, 7, 22); ctx.restore() }
  ctx.fillStyle = "#14141c"; ctx.fillRect(-9, -48, 18, 28); ctx.fillStyle = "#e8e8e0"; ctx.fillRect(-9, -24, 18, 3)
  if (f.haori) { ctx.fillStyle = f.haori; ctx.fillRect(-11, -48, 6, 30); ctx.fillRect(5, -48, 6, 30) }
  ctx.save(); ctx.translate(6, -36); ctx.rotate(f.slash > 0 ? -1.9 + (1 - f.slash) * 3 : 0.9)
  ctx.strokeStyle = "#cfd6e0"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.stroke(); ctx.fillStyle = "#c8a040"; ctx.fillRect(-2, -2.5, 4, 5); ctx.restore()
  ctx.fillStyle = "#e8c8a0"; ctx.beginPath(); ctx.arc(0, -55, 7, 0, 7); ctx.fill(); ctx.fillStyle = f.hair; ctx.beginPath(); ctx.arc(0, -57, 7.4, Math.PI, 0); ctx.fill()
  ctx.restore()
}
function mgDemon(ctx, x, y, s, d, t) {     // a lesser demon on all fours: grey-green skin, horn, red eyes, claws
  const crawl = Math.sin(t * 12 + d.seed) * 0.5
  ctx.save(); ctx.translate(x, y); ctx.scale(s * d.dir, s); if (d.dead > 0) { ctx.globalAlpha = Math.max(0, d.dead); ctx.rotate(-(1 - d.dead) * 0.8) }
  ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(0, -14, 20, 10, -0.1, 0, 7); ctx.fill()
  for (const [lx, a] of [[-14, crawl], [-6, -crawl], [8, crawl], [15, -crawl]]) { ctx.save(); ctx.translate(lx, -10); ctx.rotate(a * 0.6); ctx.fillRect(-2.5, 0, 5, 12); ctx.restore() }
  ctx.beginPath(); ctx.arc(20, -20, 8, 0, 7); ctx.fill(); ctx.fillStyle = "#e8e0c8"; ctx.beginPath(); ctx.moveTo(19, -27); ctx.lineTo(23, -38); ctx.lineTo(25, -26); ctx.fill()
  ctx.fillStyle = "#ff2a2a"; ctx.fillRect(22, -23, 3, 2.4); ctx.fillStyle = "#fff"; ctx.fillRect(24, -16, 4, 1.5)
  if (d.dead > 0) { ctx.strokeStyle = `rgba(255,255,255,${d.dead})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, -34); ctx.lineTo(30, -8); ctx.stroke() }
  ctx.restore()
}
function mgEye(ctx, x, y, r, open, look, rage) {
  if (open <= 0.05) { ctx.strokeStyle = "#5a2038"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.3, x + r, y); ctx.stroke(); return }
  ctx.fillStyle = "#f4e8ee"; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62 * open, 0, 0, 7); ctx.fill()
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62 * open, 0, 0, 7); ctx.clip()
  ctx.fillStyle = rage ? "#e0204a" : "#b02a7a"; ctx.beginPath(); ctx.arc(x + look * r * 0.35, y, r * 0.48, 0, 7); ctx.fill()
  ctx.fillStyle = "#111"; ctx.fillRect(x + look * r * 0.35 - 1.2, y - r * 0.36, 2.4, r * 0.72); ctx.restore()
  ctx.strokeStyle = "#5a2038"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62 * open, 0, 0, 7); ctx.stroke()
}
function mgEnmu(ctx, x, y, s, t, rage, cut) {   // Enmu on the train roof: long dark hair, pale, a long dark coat; his head falls on the cut
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  const sway = Math.sin(t * 1.3) * 0.05; ctx.rotate(sway)
  ctx.fillStyle = "#1e1a2a"; ctx.beginPath(); ctx.moveTo(-14, -70); ctx.lineTo(14, -70); ctx.lineTo(20, 0); ctx.lineTo(-20, 0); ctx.fill()
  ctx.fillStyle = "#e4e0f0"; ctx.fillRect(-4, -70, 8, 30)
  ctx.strokeStyle = "#d8c8d8"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-12, -64); ctx.lineTo(rage ? -34 : -22, rage ? -92 : -40); ctx.moveTo(12, -64); ctx.lineTo(rage ? 34 : 18, rage ? -92 : -46); ctx.stroke()
  if (!cut || cut < 0.15) { ctx.fillStyle = "#ece6f2"; ctx.beginPath(); ctx.arc(0, -80, 10, 0, 7); ctx.fill()
    ctx.fillStyle = "#14101c"; ctx.beginPath(); ctx.moveTo(-11, -84); ctx.quadraticCurveTo(-16, -50, -10, -40); ctx.lineTo(-8, -84); ctx.moveTo(11, -84); ctx.quadraticCurveTo(16, -50, 10, -40); ctx.lineTo(8, -84); ctx.fill(); ctx.beginPath(); ctx.arc(0, -84, 10.5, Math.PI, 0); ctx.fill()
    ctx.fillStyle = rage ? "#e0204a" : "#a03a8a"; ctx.fillRect(-5, -80, 3, 2); ctx.fillRect(2, -80, 3, 2) }
  else { const k = Math.min(1, (cut - 0.15) * 1.5); ctx.fillStyle = "#ece6f2"; ctx.beginPath(); ctx.arc(30 * k, -80 + 90 * k * k, 10, 0, 7); ctx.fill(); ctx.fillStyle = "#8a1030"; ctx.fillRect(-6, -72, 12, 4) }
  ctx.restore()
}

function drawMugenSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = MG.geo = mgGeo(def, c, W, dockTop), S = def.S, d = MG.dawn, red = MG.rage && !MG.cut ? 1 : 0
  const g = ctx.createLinearGradient(0, coverTop, 0, G.Y(110))
  g.addColorStop(0, d ? `rgb(${30 + 60 * d | 0},${30 + 70 * d | 0},${70 + 90 * d | 0})` : red ? "#1a0610" : "#060a1e")
  g.addColorStop(1, d ? `rgb(${120 + 135 * d | 0},${70 + 110 * d | 0},${60 + 40 * d | 0})` : red ? "#4a1020" : "#1a2244")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  for (let i = 0; i < 90; i++) { const x = padL + (padR - padL) * _h(i * 3.1), y = coverTop + (G.Y(80) - coverTop) * _h(i * 7.7), a = (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i))) * (1 - d)
    ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.fillRect(x, y, 1.6, 1.6) }
  { const mx = W * 0.3 + shift(0.04, W), my = G.Y(-30) + d * 300, r = 46
    ctx.fillStyle = red ? "rgba(255,60,60,0.18)" : "rgba(255,250,220,0.12)"; ctx.beginPath(); ctx.arc(mx, my, r * 2.2, 0, 7); ctx.fill()
    ctx.fillStyle = red ? "#e8504a" : `rgba(250,246,226,${1 - d})`; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.fill()
    ctx.fillStyle = red ? "rgba(140,20,30,0.5)" : `rgba(200,200,190,${0.4 * (1 - d)})`; ctx.beginPath(); ctx.arc(mx - 12, my - 8, 9, 0, 7); ctx.arc(mx + 14, my + 10, 6, 0, 7); ctx.fill() }
  if (d > 0) { const sx = W * 0.75 + shift(0.04, W), sy = G.Y(120) - d * 90
    const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 260); sg.addColorStop(0, `rgba(255,230,160,${d})`); sg.addColorStop(1, "rgba(255,160,80,0)"); ctx.fillStyle = sg; ctx.fillRect(sx - 260, sy - 260, 520, 520)
    ctx.fillStyle = `rgba(255,240,190,${d})`; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill() }
  for (const [p, base, amp, col] of [[0.15, G.Y(60), 70, d ? "#4a4058" : "#141a30"], [0.35, G.Y(95), 50, d ? "#3a3044" : "#0c1024"]]) {
    const ps = shift(p, W); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(padL, dockTop)
    for (let x = padL; x <= padR + 20; x += 20) { const u = (x - ps) / 260; ctx.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(u * 2.3) * Math.cos(u * 0.9 + p * 9))) }
    ctx.lineTo(padR, dockTop); ctx.fill() }
  // the engine's smoke rolling over the yard
  if (mgRnd() < 0.25) MG.puffs.push({ x: padR + 40, y: G.Y(10) + mgRnd() * 30, r: 20 + mgRnd() * 20, a: 0.5 })
  for (const p of MG.puffs) { p.x -= 0.9 + p.r * 0.01; p.y -= 0.12; p.r += 0.12; p.a -= 0.0009
    ctx.fillStyle = `rgba(${150 + 80 * d | 0},${150 + 70 * d | 0},${170 + 40 * d | 0},${p.a * 0.5})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill() }
  MG.puffs = MG.puffs.filter(p => p.a > 0 && p.x > padL - 120).slice(-70)
}

function mugenFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = MG.geo || mgGeo(def, c, W, dockTop), S = def.S, Y = G.Y
  if (F[0] !== MG.p1) { Object.assign(MG, { p1: F[0], hp: new WeakMap(), start: t, grow: 0, flinch: 0, rage: false, cut: null, dawn: 0, lash: [], demons: [], slayers: null, shout: [], whistle: 9 }); for (const k in MG.st) MG.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (MG.last || t))); MG.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = MG.hp.get(f); MG.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  // the flesh grows through the match (faster on big hits), all at once in the rage, shrivels after the cut
  if (!MG.cut) MG.grow = Math.min(MG.rage ? 1 : 0.75, MG.grow + dt * (MG.rage ? 0.6 : 0.012) + (big ? 0.06 : 0))
  else MG.grow = Math.max(0, MG.grow - dt * 0.35)
  if (big && !MG.cut) { MG.flinch = 1; MG.st.lashes++; const cps = mirrorCopies(G, G.w, padL, padR); const cp = cps[Math.floor(mgRnd() * cps.length)]
    MG.lash.push({ x: cp.X(470 + mgRnd() * 290), y: Y(30 + mgRnd() * 60), dir: mgRnd() < 0.5 ? -1 : 1, t: 0 }); MG.shake = 4
    if (MG.st.lashes % 2 === 1) mgShout(mid, Y(-10), ["Sweet dreams…", "Fall asleep… fall into a happy dream…", "How lovely… such despair…"][Math.floor(MG.st.lashes / 2) % 3], "#7a2a7a") }
  if (low && !MG.rage && !MG.cut) { MG.rage = true; MG.st.rage++; MG.shake = 8; mgShout(mid, Y(-30), "THE TRAIN AND I ARE ONE!", "#8a1030") }
  if (ko && !MG.cut && !MG.st.cut) { MG.cut = { t: 0 }; MG.st.cut++; MG.shake = 14; mgShout(mid, Y(-30), "THUNDER BREATHING… FLAME BREATHING!", "#c06010") }
  if (MG.cut) { MG.cut.t += dt; if (MG.cut.t > 1.4) MG.dawn = Math.min(1, MG.dawn + dt * 0.35); if (MG.cut.t > 0.6 && MG.cut.t < 0.7) mgShout(mid, Y(10), "AAAARGH… MY NECK…!", "#7a2a7a") }
  if (MG.shake > 0) { camera.shake?.(MG.shake, 18); MG.shake = 0 }
  MG.flinch = Math.max(0, MG.flinch - dt * 1.5)
  MG.whistle -= dt; if (MG.whistle <= 0) { MG.whistle = 18 + mgRnd() * 10; MG.st.whistles++; mgShout(padR - 160, Y(-40), "POOOOOOO!", "#444") }
  const cps = mirrorCopies(G, G.w, padL, padR), g = MG.grow, rage = MG.rage && !MG.cut
  // passengers asleep in every lit window
  for (const cp of cps) for (let i = 0; i < 12; i++) { const px = 464 - 8 + 4 + 26 * i + 8.5; if (px > G.pc.w - 4) break
    const x = cp.X(px), y = Y(66), bob = Math.sin(t * 0.8 + i * 1.7) * 1.2
    ctx.fillStyle = "rgba(60,30,30,0.85)"; ctx.beginPath(); ctx.arc(x + (i % 2 ? 3 : -3), y - 6 * S + bob, 3.4 * S, 0, 7); ctx.fill(); ctx.fillRect(x - 5 * S, y - 3 * S, 10 * S, 4 * S)
    if (rage && i % 3 === 0) { const r = Math.sin(t * 5 + i) * 0.5 + 0.5   // hands reaching out of the windows
      ctx.fillStyle = "#d4a0b8"; ctx.save(); ctx.translate(x, Y(55)); ctx.rotate(Math.PI + Math.sin(t * 3 + i) * 0.4); ctx.fillRect(-3 * S, 0, 6 * S, (12 + 10 * r) * S); ctx.beginPath(); ctx.arc(0, (12 + 10 * r) * S, 4 * S, 0, 7); ctx.fill(); ctx.restore() } }
  // Enmu's flesh over the carriages: tendrils from the roof, veins, eyes
  if (g > 0.01) for (const cp of cps) for (let i = 0; i < 9; i++) {
    const px = 470 + 33 * i; if (px > G.pc.w) break
    const x = cp.X(px), y = Y(20), len = (20 + 70 * _h(i * 5.3 + cp.k)) * g * S, sw = Math.sin(t * 1.6 + i) * 6 * (1 + MG.flinch * 3)
    ctx.strokeStyle = `rgba(${rage ? 210 : 190},${rage ? 80 : 110},${rage ? 110 : 150},0.95)`; ctx.lineWidth = (5 + 5 * g) * S * 0.5; ctx.lineCap = "round"
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 2, y + len * 0.5, x + sw, y + len); ctx.stroke()
    ctx.strokeStyle = "rgba(110,30,70,0.6)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.quadraticCurveTo(x + sw * 2 - 2, y + len * 0.5, x + sw - 1, y + len * 0.9); ctx.stroke()
    ctx.fillStyle = `rgba(${rage ? 200 : 180},${rage ? 70 : 100},${rage ? 100 : 140},0.95)`; ctx.beginPath(); ctx.ellipse(x, y + 2, 14 * S * g + 4, 6 * S * g + 2, 0, 0, 7); ctx.fill()
    if (g > 0.3 + 0.08 * (i % 4)) { const open = Math.max(0, Math.min(1, (g - 0.3) * 3)) * (Math.sin(t * 0.7 + i * 2.1) > -0.85 ? 1 : 0.05) * (MG.cut ? 0.2 : 1), look = Math.max(-1, Math.min(1, (mid - x) / 300))
      mgEye(ctx, x + 12 * S, Y(84 + 18 * (i % 2)), (5 + 2 * MG.flinch + (rage ? 2 : 0)) * S, MG.flinch > 0.3 ? 1 : open, look, rage); MG.st.eyes = Math.max(MG.st.eyes, i + 1) } }
  // a lashing tentacle on a big hit
  for (const L of MG.lash) { L.t += dt; const k = Math.min(1, L.t * 3), back = Math.max(0, L.t - 0.6) * 2, e = Math.max(0, k - back)
    ctx.strokeStyle = "rgba(200,100,140,0.95)"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.quadraticCurveTo(L.x + L.dir * 120 * e, L.y - 90 * e, L.x + L.dir * 220 * e, L.y + 40 * e); ctx.stroke() }
  MG.lash = MG.lash.filter(L => L.t < 1.2)
  // Enmu on the roof of the nearest carriage
  { const cp = cps.reduce((a, b) => Math.abs(b.X(615) - W / 2) < Math.abs(a.X(615) - W / 2) ? b : a); mgEnmu(ctx, cp.X(615), Y(20), S * 0.7, t, rage, MG.cut ? MG.cut.t : 0)
    if (MG.cut && MG.cut.t < 0.9) { const x = cp.X(615), y = Y(20) - 56 * S * 0.7, k = MG.cut.t / 0.4
      ctx.strokeStyle = `rgba(255,230,80,${Math.max(0, 1 - MG.cut.t)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(padL, y + 30); for (let i = 0; i < 10; i++) ctx.lineTo(padL + (x - padL + 200) * Math.min(1, k) * (i + 1) / 10, y + (i % 2 ? -18 : 14)); ctx.stroke()
      if (MG.cut.t > 0.25) { const a = Math.max(0, 1 - (MG.cut.t - 0.25) * 1.6); ctx.strokeStyle = `rgba(255,120,30,${a})`; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(x, y, 90, -2.6, -2.6 + Math.min(1, (MG.cut.t - 0.25) * 4) * 4.2); ctx.stroke()
        ctx.strokeStyle = `rgba(255,230,120,${a})`; ctx.lineWidth = 5; ctx.stroke() } } }
  // demons crawl the roofs; Slayers flash in and cut them down
  if (!MG.slayers) MG.slayers = [0, 1, 2].map(i => ({ seed: i * 2.1, x: padL + (padR - padL) * (0.2 + 0.3 * i), dir: 1, hair: ["#1a1a1a", "#3a2a1a", "#2a1a3a"][i], haori: ["#2a6a4a", null, "#6a3a8a"][i], run: true, slash: 0, target: null }))
  if (!MG.cut && MG.demons.length < (rage ? 6 : 3) && mgRnd() < dt * (rage ? 1.4 : 0.5)) { const left = mgRnd() < 0.5
    MG.demons.push({ x: left ? padL - 30 : padR + 30, dir: left ? 1 : -1, v: 50 + mgRnd() * 40, seed: mgRnd() * 9, col: ["#6a7a6a", "#7a6a5a", "#5a6a7a"][Math.floor(mgRnd() * 3)], dead: 0 }) }
  const roof = Y(20)
  for (const d of MG.demons) { if (d.dead > 0) { d.dead -= dt * 1.4; continue } d.x += d.dir * d.v * dt; if (MG.cut) { d.dead = 1; MG.st.kills++ } }
  for (const s of MG.slayers) { s.slash = Math.max(0, s.slash - dt * 3)
    if (!s.target || s.target.dead) s.target = MG.demons.filter(d => d.dead === 0).sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0] || null
    if (s.target) { const dx = s.target.x - s.x; s.dir = dx > 0 ? 1 : -1
      if (Math.abs(dx) < 40) { s.slash = 1; s.target.dead = 1; MG.st.kills++; s.target = null }
      else s.x += s.dir * Math.min(Math.abs(dx), (Math.abs(dx) > 200 ? 520 : 140) * dt) }
    else { s.x += Math.sin(t * 0.5 + s.seed) * 20 * dt; s.run = false } s.run = !!s.target }
  MG.demons = MG.demons.filter(d => d.dead === 0 ? d.x > padL - 80 && d.x < padR + 80 : d.dead > 0)
  for (const d of MG.demons) mgDemon(ctx, d.x, roof, S * 0.55, d, t)
  for (const s of MG.slayers) { mgSlayer(ctx, s.x, roof, S * 0.55, s, t); if (s.slash > 0.4) { ctx.strokeStyle = `rgba(160,220,255,${s.slash})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x + s.dir * 14, roof - 20, 26, -1.2, 1.2); ctx.stroke() } }
  // the Demon Slayer cast on the track bed
  drawCrowd(ctx, MGC, { W, feet: dockTop + 6 * S, sh: shift(0.9, W) })
  for (const s of MG.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  MG.shout = MG.shout.filter(s => s.t > 0)
  if (MG.cut && MG.cut.t < 0.5) { ctx.fillStyle = `rgba(255,240,200,${0.6 * (1 - MG.cut.t * 2)})`; ctx.fillRect(padL, G.y0 - 400, padR - padL, coverBottom - G.y0 + 400) }
}

// ───────────────────────────── THE VILTRUMITE BATTLEGROUND (Invincible; render-only, wall clock, own PRNG) ─────────────────────────────
// Adon's ruins (Street Fighter, 1987) burned into a war zone under a blood-red sky: scorched ash, dead palms, a lake of
// embers, cracks glowing in the ground. A GIANT VILTRUMITE WARRIOR STATUE (arms crossed, cape) stands on the ruin's base
// (the sheet's own statue was cut out — it was a real religious figure). Overhead Viltrumites (drawn in code: white/red,
// black/white, blue/yellow suits) dogfight across the sky — they circle, collide with a flash + sonic ring, and one is
// knocked down into the mountains in a burst of dust. Smoke rises off the plain. Big hit → a Viltrumite is smashed into
// the ground behind the fight (crater, shockwave, shake); ≤25% → "VILTRUM WILL NOT FALL!": the empire's fleet fills the
// sky, the cracks blaze, the sky darkens; KO → a body is punched straight through the statue: it cracks and topples.
let _vtSeed = 0x3c6ef372
const vtRnd = () => { _vtSeed ^= _vtSeed << 13; _vtSeed ^= _vtSeed >>> 17; _vtSeed ^= _vtSeed << 5; return (_vtSeed >>> 0) / 4294967296 }
const VT_SUITS = [["#f2f2ee", "#c81e1e", "#1a1a1a"], ["#16161c", "#f2f2ee", "#e8e8e8"], ["#2a6ae0", "#f2c81e", "#1a1a1a"], ["#16161c", "#a01818", "#f2f2ee"]]
const VT = { p1: null, last: 0, hp: new WeakMap(), duels: null, falls: [], craters: [], rings: [], smoke: null, fleet: 0, rage: false, end: null, shout: [], geo: null,
  st: { clashes: 0, falls: 0, slams: 0, rage: 0, toppled: 0 } }
export const viltrumState = () => ({ ...VT.st, duels: (VT.duels || []).length, smoke: (VT.smoke || []).length, fleet: +VT.fleet.toFixed(2), rage: VT.rage, statue: VT.end ? +VT.end.t.toFixed(2) : 0,
  shouting: VT.shout.filter(s => s.t > 0).map(s => s.txt) })
function vtGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.ruins, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S }
}
function vtShout(x, y, txt, col) { if (VT.shout.filter(s => s.t > 0).length < 3) VT.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function vtFlyer(ctx, x, y, s, dir, suit, t, pose = 0, rot = 0) {   // a Viltrumite in flight, side-on (~70 px long at s 1); pose 1 = punching
  const [body, cape, hair] = suit
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * dir, s)
  ctx.fillStyle = cape; ctx.beginPath(); ctx.moveTo(8, -6); for (let i = 0; i <= 6; i++) ctx.lineTo(-10 - i * 6, -8 + Math.sin(t * 14 + i) * 3 + i * 0.8); ctx.lineTo(-44, 4); ctx.lineTo(6, 2); ctx.fill()
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, 7); ctx.fill(); ctx.fillRect(-30, -3.5, 18, 7)
  ctx.fillStyle = suit[0] === "#16161c" ? "#f2f2ee" : "#16161c"; ctx.fillRect(-4, -7, 3, 14)
  ctx.fillStyle = body; if (pose) { ctx.fillRect(10, -3, 22, 5); ctx.fillStyle = "#e8c8a0"; ctx.beginPath(); ctx.arc(33, -0.5, 3.6, 0, 7); ctx.fill() } else { ctx.fillRect(10, -2, 14, 4) }
  ctx.fillStyle = "#e8c8a0"; ctx.beginPath(); ctx.arc(20, -6, 6, 0, 7); ctx.fill(); ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(18, -8, 6, Math.PI * 0.9, Math.PI * 2.1); ctx.fill()
  if (hair === "#1a1a1a" && suit[1] === "#c81e1e") { ctx.fillStyle = "#2a2a2a"; ctx.fillRect(21, -4, 5, 1.6) }   // the moustache
  ctx.restore()
}
function vtStatue(ctx, x, y, s, t, end, rage) {   // the giant warrior statue (~125 px tall at s 1), shaded stone: cracks + topples on the KO
  const k = end ? Math.min(1, Math.max(0, end.t - 0.5) / 1.6) : 0, fall = k * k * 1.45
  ctx.save(); ctx.translate(x + 30 * s * k, y); ctx.rotate(fall * (end?.dir || 1)); ctx.scale(s, s)
  const sh = (a, b) => { const g = ctx.createLinearGradient(a, 0, b, 0); g.addColorStop(0, "#9a8a80"); g.addColorStop(0.45, "#6e625c"); g.addColorStop(1, "#3a322e"); return g }
  ctx.fillStyle = "#3a322e"; ctx.fillRect(-34, -12, 68, 12); ctx.fillStyle = "#5a4e48"; ctx.fillRect(-30, -16, 60, 5)                  // plinth
  ctx.fillStyle = sh(-36, 36); ctx.beginPath(); ctx.moveTo(-22, -100); ctx.quadraticCurveTo(-40, -50, -36, -16); ctx.lineTo(36, -16); ctx.quadraticCurveTo(40, -50, 22, -100); ctx.fill()   // cape
  ctx.strokeStyle = "rgba(30,24,20,0.5)"; ctx.lineWidth = 1.5; ctx.beginPath(); for (const fx of [-24, -12, 12, 24]) { ctx.moveTo(fx * 0.6, -96); ctx.quadraticCurveTo(fx * 1.1, -60, fx * 1.3, -18) } ctx.stroke()
  ctx.fillStyle = sh(-14, 14); ctx.beginPath(); ctx.moveTo(-13, -54); ctx.lineTo(-3, -54); ctx.lineTo(-5, -16); ctx.lineTo(-16, -16); ctx.fill(); ctx.beginPath(); ctx.moveTo(3, -54); ctx.lineTo(13, -54); ctx.lineTo(16, -16); ctx.lineTo(5, -16); ctx.fill()   // legs apart
  ctx.fillStyle = "#2e2622"; ctx.fillRect(-18, -20, 14, 5); ctx.fillRect(4, -20, 14, 5)                                                  // boots
  ctx.fillStyle = sh(-22, 22); ctx.beginPath(); ctx.moveTo(-24, -98); ctx.lineTo(24, -98); ctx.lineTo(15, -54); ctx.lineTo(-15, -54); ctx.fill()  // torso, broad shoulders
  ctx.fillStyle = "#4a403a"; ctx.fillRect(-15, -58, 30, 4)                                                                               // belt
  ctx.fillStyle = "#8a7c74"; ctx.beginPath(); ctx.ellipse(0, -80, 23, 7, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#3a322e"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-20, -80); ctx.lineTo(20, -80); ctx.stroke()   // crossed arms
  ctx.fillStyle = sh(-9, 9); ctx.fillRect(-4, -106, 8, 9); ctx.beginPath(); ctx.ellipse(0, -114, 9, 11, 0, 0, 7); ctx.fill()             // neck, head
  ctx.fillStyle = "#2e2622"; ctx.beginPath(); ctx.arc(0, -118, 9.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.fillRect(-5, -110, 10, 2.2)   // hair, moustache
  ctx.fillStyle = "#2e2622"; ctx.fillRect(-4, -116, 3, 1.4); ctx.fillRect(1, -116, 3, 1.4)
  if (rage || end) { ctx.strokeStyle = end ? "#140c0a" : "rgba(255,120,40,0.85)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, -98); ctx.lineTo(2, -82); ctx.lineTo(-5, -66); ctx.lineTo(6, -50); ctx.lineTo(0, -30); ctx.moveTo(12, -94); ctx.lineTo(5, -78); ctx.moveTo(-20, -60); ctx.lineTo(-10, -44); ctx.stroke() }
  ctx.restore()
}

function drawViltrumSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = VT.geo = vtGeo(def, c, W, dockTop), P = c.layout.pieces, S = def.S, dk = VT.rage ? Math.min(1, VT.fleet) : 0
  const g = ctx.createLinearGradient(0, coverTop, 0, G.Y(110)); g.addColorStop(0, dk ? "#1a0404" : "#3a0a08"); g.addColorStop(1, dk ? "#7a1a0a" : "#c8381a")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  // a huge ringed planet hanging in the sky
  { const px = W * 0.22 + shift(0.03, W), py = G.Y(-60), r = 120
    ctx.fillStyle = "rgba(255,200,170,0.12)"; ctx.beginPath(); ctx.arc(px, py, r * 1.25, 0, 7); ctx.fill()
    const pg = ctx.createRadialGradient(px - 40, py - 40, 10, px, py, r); pg.addColorStop(0, "#f0b090"); pg.addColorStop(1, "#7a3a3a"); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill()
    ctx.strokeStyle = "rgba(240,200,170,0.55)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(px, py, r * 1.7, r * 0.3, -0.25, 0, 7); ctx.stroke() }
  const sk = P.sky, im = c.img[sk.file], skyY = G.Y(108) - sk.h * S
  for (const cp of mirrorCopies(G, G.w, padL, padR)) { const x0 = Math.min(cp.X(0), cp.X(G.pc.w)); if (ready(im)) { ctx.save(); ctx.globalAlpha = dk ? 0.55 : 0.85; ctx.drawImage(im, Math.floor(x0), skyY, Math.ceil(G.w) + 1, sk.h * S); ctx.restore() } }
  // the empire's fleet
  if (VT.fleet > 0) for (let i = 0; i < 9; i++) { const u = _h(i * 9.1), x = padL + (padR - padL) * ((u + t * 0.01 * (1 + i % 3)) % 1), y = G.Y(-40) + 90 * _h(i * 3.3), s = (0.6 + 0.6 * _h(i * 4.7)) * VT.fleet
    ctx.fillStyle = "#1a1418"; ctx.beginPath(); ctx.moveTo(x - 60 * s, y); ctx.lineTo(x + 40 * s, y - 10 * s); ctx.lineTo(x + 70 * s, y); ctx.lineTo(x + 40 * s, y + 10 * s); ctx.fill()
    ctx.fillStyle = `rgba(255,80,40,${0.6 + 0.4 * Math.sin(t * 6 + i)})`; ctx.fillRect(x - 62 * s, y - 2 * s, 5 * s, 4 * s); ctx.fillStyle = "#f2f2ee"; ctx.fillRect(x + 10 * s, y - 3 * s, 14 * s, 2 * s) }
  // dogfights in the sky
  const dt = Math.min(0.05, Math.max(0, t - (VT.skyLast || t))); VT.skyLast = t
  if (!VT.duels) VT.duels = [0, 1, 2].map(i => ({ cx: padL + (padR - padL) * (0.2 + 0.3 * i), cy: G.Y(-25 - 25 * i), ph: i * 2.1, r: 90 + 30 * i, sp: 1.6 + 0.3 * i, a: VT_SUITS[i % 4], b: VT_SUITS[(i + 1) % 4], clash: 3 + i * 1.7, flash: 0, s: (0.75 - 0.12 * i) * S }))
  for (const d of VT.duels) { d.ph += dt * d.sp; d.clash -= dt; d.flash = Math.max(0, d.flash - dt * 3); d.cx += Math.sin(t * 0.2 + d.r) * 20 * dt
    if (d.cx < padL - 100) d.cx = padR + 60; if (d.cx > padR + 100) d.cx = padL - 60
    const ax = d.cx + Math.cos(d.ph) * d.r, ay = d.cy + Math.sin(d.ph * 2) * d.r * 0.3, bx = d.cx - Math.cos(d.ph) * d.r, by = d.cy - Math.sin(d.ph * 2) * d.r * 0.3
    if (d.clash <= 0) { d.clash = 3.5 + vtRnd() * 3; d.flash = 1; VT.st.clashes++; VT.rings.push({ x: d.cx, y: d.cy, r: 8, a: 1 })
      if (vtRnd() < 0.5) { VT.st.falls++; const loser = vtRnd() < 0.5 ? d.a : d.b; VT.falls.push({ x: d.cx, y: d.cy, vx: (vtRnd() - 0.5) * 300, vy: 220, suit: loser, ty: G.Y(70 + 20 * vtRnd()), s: d.s, t: 0, hit: false }) } }
    const k = d.flash > 0 ? 1 - d.flash : 1, hx = d.flash > 0 ? d.cx : null
    vtFlyer(ctx, hx != null ? d.cx - 18 * d.s : ax, hx != null ? d.cy : ay, d.s, hx != null ? 1 : -Math.sign(Math.sin(d.ph)) || 1, d.a, t, d.flash > 0 ? 1 : 0)
    vtFlyer(ctx, hx != null ? d.cx + 18 * d.s : bx, hx != null ? d.cy : by, d.s, hx != null ? -1 : Math.sign(Math.sin(d.ph)) || 1, d.b, t, d.flash > 0 ? 1 : 0)
    if (d.flash > 0) { ctx.fillStyle = `rgba(255,250,220,${d.flash})`; ctx.beginPath(); ctx.arc(d.cx, d.cy, 26 * d.flash + 6, 0, 7); ctx.fill() } }
  for (const f of VT.falls) { f.t += dt; if (!f.hit) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt
      if (f.y >= f.ty) { f.hit = true; f.y = f.ty; VT.craters.push({ x: f.x, y: f.y, t: 0, big: false }) } }
    if (!f.hit) vtFlyer(ctx, f.x, f.y, f.s, Math.sign(f.vx) || 1, f.suit, t, 0, f.t * 6) }
  VT.falls = VT.falls.filter(f => !f.hit)
  for (const r of VT.rings) { r.r += dt * 380; r.a -= dt * 1.6; if (r.a <= 0) continue; ctx.strokeStyle = `rgba(255,240,220,${r.a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke() }
  VT.rings = VT.rings.filter(r => r.a > 0)
  for (const c2 of VT.craters) { if (c2.big) continue; c2.t += dt; const u = Math.min(1, c2.t / 1.6)
    for (let j = 0; j < 6; j++) { ctx.fillStyle = `rgba(${120 + 40 * j % 80},${80 + 10 * j},${60},${0.6 * (1 - u)})`; ctx.beginPath(); ctx.arc(c2.x + (j - 2.5) * 12 * (0.5 + u), c2.y - 40 * u * (1 + j % 2), 14 + 30 * u, 0, 7); ctx.fill() } }
  VT.craters = VT.craters.filter(c2 => c2.big || c2.t < 1.6)
}

function viltrumFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = VT.geo || vtGeo(def, c, W, dockTop), S = def.S, P = c.layout.pieces
  if (F[0] !== VT.p1) { Object.assign(VT, { p1: F[0], hp: new WeakMap(), duels: null, falls: [], craters: [], rings: [], smoke: null, fleet: 0, rage: false, end: null, shout: [] }); for (const k in VT.st) VT.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (VT.last || t))); VT.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = VT.hp.get(f); VT.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big) { VT.st.slams++; const x = mid + (vtRnd() < 0.5 ? -1 : 1) * (200 + vtRnd() * 200); VT.craters.push({ x, y: G.Y(G.pc.h) + 4, t: 0, big: true, slam: 0 }); camera.shake?.(6, 16)
    if (VT.st.slams % 2 === 1) vtShout(mid, G.Y(20), ["YOU'RE WEAK!", "IS THAT ALL YOU HAVE?!", "BLEED FOR THE EMPIRE!"][Math.floor(VT.st.slams / 2) % 3], "#8a1010") }
  if (low && !VT.rage && !VT.end) { VT.rage = true; VT.st.rage++; camera.shake?.(8, 30); vtShout(mid, G.Y(0), "VILTRUM WILL NOT FALL!", "#8a1010") }
  if (VT.rage) VT.fleet = Math.min(1, VT.fleet + dt * 0.5)
  if (ko && !VT.end) { VT.end = { t: 0, dir: mid > G.X(P.ruins.statue[0]) ? -1 : 1 }; VT.st.toppled++; vtShout(mid, G.Y(-10), "THINK!", "#1a1a1a") }
  if (VT.end) { VT.end.t += dt; if (VT.end.t > 2.1 && !VT.end.dust) { VT.end.dust = 1; camera.shake?.(14, 50) } }
  // the statue on every copy of the ruin
  for (const cp of mirrorCopies(G, G.w, padL, padR)) { const sx = cp.X(P.ruins.statue[0]), sy = G.Y(P.ruins.statue[1])
    vtStatue(ctx, sx, sy, S * 0.95, t, VT.end, VT.rage)
    if (VT.end && VT.end.t < 0.8) { const k = VT.end.t / 0.5; if (k < 1) { vtFlyer(ctx, sx - 300 + 300 * k, sy - 70 * S, S * 0.7, 1, VT_SUITS[0], t, 1) } else { ctx.fillStyle = `rgba(255,250,220,${1.6 - VT.end.t * 2})`; ctx.beginPath(); ctx.arc(sx, sy - 70 * S, 40, 0, 7); ctx.fill() } }
    if (VT.end?.dust) { const u = Math.min(1, (VT.end.t - 2.1) / 3)
      for (let j = 0; j < 12; j++) { ctx.fillStyle = `rgba(150,120,100,${0.65 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + VT.end.dir * 90 * S * 0.95 + (j - 6) * 18 * (1 + u), sy - 20 - 60 * u * (j % 3), 26 + 60 * u, 0, 7); ctx.fill() } } }
  // smoke columns over the plain; cracks blaze in the rage
  if (!VT.smoke) VT.smoke = Array.from({ length: 5 }, (_, i) => ({ u: (i * 0.23 + 0.05) % 1, s: 0.7 + 0.5 * ((i * 0.37) % 1) }))
  for (const sm of VT.smoke) for (const cp of mirrorCopies(G, G.w, padL, padR)) { const x = cp.X(sm.u * G.pc.w), y = G.Y(128)
    for (let j = 0; j < 6; j++) { const u = (t * 0.12 + j / 6 + sm.u) % 1; ctx.fillStyle = `rgba(40,30,30,${0.45 * (1 - u)})`; ctx.beginPath(); ctx.arc(x + u * 50 + Math.sin(t + j) * 6, y - u * 170 * sm.s, (8 + 26 * u) * sm.s, 0, 7); ctx.fill() }
    ctx.fillStyle = `rgba(255,${120 + 50 * Math.sin(t * 8 + sm.u * 20) | 0},40,0.8)`; ctx.beginPath(); ctx.arc(x, y, 4 + 2 * Math.sin(t * 9 + sm.u), 0, 7); ctx.fill() }
  if (VT.rage) { ctx.fillStyle = `rgba(255,90,30,${0.08 + 0.05 * Math.sin(t * 4)})`; ctx.fillRect(padL, dockTop, padR - padL, coverBottom - dockTop) }
  // a body slammed into the ground behind the fight
  for (const c2 of VT.craters) { if (!c2.big) continue; c2.t += dt; const u = Math.min(1, c2.t / 1.4)
    if (c2.t < 0.25) vtFlyer(ctx, c2.x, c2.y - 300 * (1 - c2.t / 0.25), S * 0.6, 1, VT_SUITS[3], t, 0, Math.PI / 2)
    else { ctx.strokeStyle = `rgba(255,220,180,${1 - u})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(c2.x, c2.y, 30 + 180 * u, 8 + 40 * u, 0, 0, 7); ctx.stroke()
      for (let j = 0; j < 8; j++) { ctx.fillStyle = `rgba(140,110,90,${0.7 * (1 - u)})`; ctx.beginPath(); ctx.arc(c2.x + (j - 3.5) * 16 * (1 + u), c2.y - 10 - 70 * u * ((j * 7) % 3) / 2, 14 + 30 * u, 0, 7); ctx.fill() } } }
  VT.craters = VT.craters.filter(c2 => !c2.big || c2.t < 1.4)
  for (const s of VT.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 14, w, 28); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  VT.shout = VT.shout.filter(s => s.t > 0)
}

// ───────────────────────────── YORKNEW CITY (Hunter x Hunter; render-only, wall clock, own PRNG) ─────────────────────────────
// Yun's Hong Kong street (Street Fighter III) as Yorknew City's market district during the auction week: through the open
// end of the street the skyline and the auction tower (searchlights sweeping), a blimp trailing an auction banner; the
// tram, the stalls, shoppers walking the street. The PHANTOM TROUPE stand on the balconies and the tram roof (long coats,
// one leaps across now and then); the Hunter x Hunter cast who aren't fighting watch from the street (shared crowd:
// Hisoka, Chrollo, Netero). Big hit → a Troupe member drops into the street with a BIG BANG IMPACT: crater, shockwave,
// shoppers knocked flat, fruit + debris flying; ≤25% → the mafia arrive at both ends of the street in black suits and open
// fire on the Troupe (muzzle flashes, tracers), the searchlights go red, shoppers run; KO → Kurapika's golden CHAINS whip
// across the street ("CHAIN JAIL!"), the Troupe vanish from the roofs, gold flash, the street cheers.
let _ynSeed = 0x243f6a88
const ynRnd = () => { _ynSeed ^= _ynSeed << 13; _ynSeed ^= _ynSeed >>> 17; _ynSeed ^= _ynSeed << 5; return (_ynSeed >>> 0) / 4294967296 }
const YN_CROWD = [["hisoka", 0.2, 0], ["chrollo", 0.5, 0], ["netero", 0.8, 0]]
const YNC = makeCrowd(YN_CROWD, 0.6)
const YN = { p1: null, last: 0, hp: new WeakMap(), ppl: null, troupe: null, impacts: [], bits: [], mafia: [], tracers: [], rage: false, chains: null, flash: 0, shout: [], geo: null, leapT: 6,
  st: { impacts: 0, knocked: 0, leaps: 0, rage: 0, shots: 0, chains: 0 } }
export const yorknewState = () => ({ ...YN.st, ppl: (YN.ppl || []).length, troupe: (YN.troupe || []).filter(m => !m.gone).length, mafia: YN.mafia.length, rage: YN.rage, chains: YN.chains ? +YN.chains.t.toFixed(2) : 0,
  crowd: crowdState(YNC), shouting: YN.shout.filter(s => s.t > 0).map(s => s.txt) })
function ynGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.street, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S }
}
function ynShout(x, y, txt, col) { if (YN.shout.filter(s => s.t > 0).length < 3) YN.shout.push({ x, y, txt, col: col || "#222", t: 1.9 }) }
function ynCoat(ctx, x, y, s, m, t) {   // a Phantom Troupe member: a long coat flapping, a spider mark on the back (~70 px at s 1)
  const flap = Math.sin(t * 5 + m.seed) * 4
  ctx.save(); ctx.translate(x, y); ctx.scale(s * m.dir, s)
  ctx.fillStyle = m.coat; ctx.beginPath(); ctx.moveTo(-9, -58); ctx.lineTo(9, -58); ctx.lineTo(13 + flap * 0.3, -6); ctx.lineTo(-15 - flap, -4); ctx.fill()
  ctx.fillStyle = "#1a1a20"; ctx.fillRect(-6, -8, 5, 8); ctx.fillRect(2, -8, 5, 8)
  ctx.fillStyle = m.big ? "#c8a070" : "#e8c8a0"; ctx.beginPath(); ctx.arc(0, -64, m.big ? 9 : 7, 0, 7); ctx.fill()
  ctx.fillStyle = m.hair; ctx.beginPath(); ctx.arc(0, -66, (m.big ? 9 : 7) + 0.5, Math.PI, 0); ctx.fill(); if (m.big) ctx.fillRect(-10, -66, 4, 18)
  if (m.cross) { ctx.fillStyle = "#e8e8f0"; ctx.fillRect(-1.2, -62, 2.4, 6); ctx.fillRect(-3, -60.5, 6, 2) }
  ctx.restore()
}
function ynSuit(ctx, x, y, s, m, t) {   // a mafia gunman: black suit, sunglasses, pistol forward; muzzle flash when firing
  ctx.save(); ctx.translate(x, y); ctx.scale(s * m.dir, s)
  ctx.fillStyle = "#14141a"; ctx.fillRect(-7, -26, 6, 26); ctx.fillRect(1, -26, 6, 26); ctx.fillRect(-9, -56, 18, 32)
  ctx.fillStyle = "#f2f2ee"; ctx.beginPath(); ctx.moveTo(-3, -56); ctx.lineTo(3, -56); ctx.lineTo(0, -46); ctx.fill()
  ctx.save(); ctx.translate(6, -50); ctx.rotate(-0.5); ctx.fillStyle = "#14141a"; ctx.fillRect(0, -2.5, 18, 5); ctx.fillStyle = "#333"; ctx.fillRect(18, -2, 7, 4)
  if (m.fire > 0) { ctx.fillStyle = `rgba(255,220,90,${m.fire})`; ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(38, -5); ctx.lineTo(33, 0); ctx.lineTo(38, 5); ctx.fill() } ctx.restore()
  ctx.fillStyle = "#e0b890"; ctx.beginPath(); ctx.arc(0, -63, 7, 0, 7); ctx.fill(); ctx.fillStyle = "#14141a"; ctx.fillRect(-1, -65, 8, 2.5); ctx.beginPath(); ctx.arc(0, -66, 7.3, Math.PI, 0); ctx.fill()
  ctx.restore()
}

function ynTenement(ctx, x, G, dockTop, t, k) {   // a tall apartment block standing over a join (~300 px wide), drawn from the street up off the top of the screen
  const w = 300, x0 = x - w / 2, base = dockTop + 6, top = G.y0 - 40
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, "#6a5a5e"); g.addColorStop(0.12, "#a8989a"); g.addColorStop(0.55, "#c4b4b0"); g.addColorStop(0.88, "#968688"); g.addColorStop(1, "#5a4a50")
  ctx.fillStyle = g; ctx.fillRect(x0, top, w, base - top)
  // soft shadows where it meets its neighbours
  for (const [ex, d] of [[x0, -1], [x0 + w, 1]]) { const sg = ctx.createLinearGradient(ex, 0, ex + d * 40, 0); sg.addColorStop(0, "rgba(20,10,20,0.45)"); sg.addColorStop(1, "rgba(20,10,20,0)"); ctx.fillStyle = sg; ctx.fillRect(Math.min(ex, ex + d * 40), top, 40, base - top) }
  // floors: windows, balconies, AC units, laundry poles
  for (let y = base - 150, f = 0; y > top + 20; y -= 62, f++) {
    ctx.fillStyle = "#7a6a6e"; ctx.fillRect(x0 + 8, y, w - 16, 6)
    for (let i = 0; i < 4; i++) { const wx = x0 + 22 + i * 68, lit = _h(f * 13 + i * 7 + k * 31) < 0.35
      ctx.fillStyle = lit ? "#f0d890" : "#3a4a5e"; ctx.fillRect(wx, y - 44, 40, 32); ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(wx + 2, y - 42, 14, 28)
      ctx.strokeStyle = "#5a4a4e"; ctx.lineWidth = 2; ctx.strokeRect(wx, y - 44, 40, 32); ctx.beginPath(); ctx.moveTo(wx + 20, y - 44); ctx.lineTo(wx + 20, y - 12); ctx.stroke()
      if (_h(f * 5 + i + k) < 0.45) { ctx.fillStyle = "#d8d4cc"; ctx.fillRect(wx + 6, y - 10, 28, 12); ctx.fillStyle = "#8a8680"; for (let j = 0; j < 4; j++) ctx.fillRect(wx + 9 + j * 6, y - 8, 2, 8) }   // AC unit
      if (_h(f * 9 + i * 3 + k) < 0.3) { ctx.strokeStyle = "#4a4a4a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx - 4, y - 46); ctx.lineTo(wx + 50, y - 50); ctx.stroke()   // laundry
        for (let j = 0; j < 3; j++) { ctx.fillStyle = ["#d84a4a", "#f2f2f2", "#3a7ad8", "#f0c040"][(f + i + j) % 4]; ctx.fillRect(wx + 4 + j * 15, y - 46 - j * 1.3, 10, 14 + 4 * Math.sin(t * 2 + j + i)) } } } }
  // a vertical sign board (no lettering) glowing at the corner
  { const sx = x0 + w - 46, sy = base - 420, glow = 0.7 + 0.3 * Math.sin(t * 3 + k)
    ctx.fillStyle = "#b01a2a"; ctx.fillRect(sx, sy, 30, 190); ctx.strokeStyle = `rgba(255,220,120,${glow})`; ctx.lineWidth = 3; ctx.strokeRect(sx + 3, sy + 3, 24, 184)
    for (let j = 0; j < 5; j++) { ctx.fillStyle = `rgba(255,236,170,${glow})`; ctx.fillRect(sx + 9, sy + 14 + j * 35, 12, 18) } }
  // the ground floor: a shop with a half-raised shutter and an awning
  ctx.fillStyle = "#3a2e2e"; ctx.fillRect(x0 + 20, base - 110, w - 40, 110)
  ctx.fillStyle = "#8a8a90"; ctx.fillRect(x0 + 30, base - 104, w - 60, 52); ctx.fillStyle = "#6a6a70"; for (let j = 0; j < 8; j++) ctx.fillRect(x0 + 30, base - 100 + j * 6, w - 60, 2)
  ctx.fillStyle = "#f0d8a0"; ctx.fillRect(x0 + 30, base - 52, w - 60, 52); ctx.fillStyle = "#c89048"; for (let j = 0; j < 6; j++) ctx.fillRect(x0 + 42 + j * 38, base - 38, 22, 18)
  for (let j = 0; j < 9; j++) { ctx.fillStyle = j % 2 ? "#2a8a5a" : "#f2f2ea"; ctx.beginPath(); ctx.moveTo(x0 + 10 + j * 31, base - 122); ctx.lineTo(x0 + 41 + j * 31, base - 122); ctx.lineTo(x0 + 46 + j * 31, base - 104); ctx.lineTo(x0 + 5 + j * 31, base - 104); ctx.fill() }
}

function drawYorknewSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = YN.geo = ynGeo(def, c, W, dockTop), P = c.layout.pieces, S = def.S, red = YN.rage && !YN.chains
  const g = ctx.createLinearGradient(0, coverTop, 0, G.Y(392)); g.addColorStop(0, red ? "#5a3a5a" : "#3a72d8"); g.addColorStop(1, red ? "#e0907a" : "#b8d4f4")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const sk = P.sky, sim = c.img[sk.file], fr = P.far, fim = c.img[fr.file]
  for (const cp of mirrorCopies(G, G.w, padL, padR, true)) {
    if (ready(sim)) { ctx.save(); ctx.globalAlpha = red ? 0.45 : 0.9; ctx.drawImage(sim, Math.floor(cp.X(0)), G.Y(-40), Math.ceil(G.w) + 1, sk.h * S * 0.8); ctx.restore() }
    const gx = cp.X(P.street.gap[0]), gy = G.Y(P.street.gap[1])
    // the skyline seen down the street + the auction tower
    for (let i = 0; i < 9; i++) { const x = gx - 150 + i * 34 + 10 * Math.sin(i * 3), h = 120 + 140 * _h(i * 7 + 2), w = 26 + 10 * _h(i * 7 + 3)
      ctx.fillStyle = `rgb(${120 + 30 * _h(i) | 0},${140 + 30 * _h(i) | 0},${175 + 20 * _h(i) | 0})`; ctx.fillRect(x, gy - h, w, h)
      ctx.fillStyle = "rgba(255,255,255,0.25)"; for (let r = gy - h + 8; r < gy - 10; r += 9) ctx.fillRect(x + 4, r, w - 8, 2) }
    { const tx = gx + 18, top = gy - 330
      for (const k of [-1, 1]) { const a = Math.sin(t * 0.7 + k * 1.3) * 0.5 + k * 0.25   // searchlights
        ctx.fillStyle = red ? "rgba(255,80,80,0.16)" : "rgba(255,255,220,0.14)"; ctx.beginPath(); ctx.moveTo(tx, top + 10); ctx.lineTo(tx + Math.sin(a) * 700 - 40, top - Math.cos(a) * 700); ctx.lineTo(tx + Math.sin(a) * 700 + 40, top - Math.cos(a) * 700); ctx.fill() }
      ctx.fillStyle = "#2a2a3a"; ctx.fillRect(tx - 22, top, 44, gy - top); ctx.fillStyle = "#3a3a4e"; ctx.fillRect(tx - 14, top - 30, 28, 30); ctx.fillRect(tx - 3, top - 70, 6, 40)
      ctx.fillStyle = red ? "#ff5050" : "#ffe070"; for (let r = top + 12; r < gy - 20; r += 16) { ctx.fillRect(tx - 16, r, 8, 4); ctx.fillRect(tx + 8, r, 8, 4) }
      ctx.fillStyle = `rgba(255,60,60,${0.5 + 0.5 * Math.sin(t * 4)})`; ctx.beginPath(); ctx.arc(tx, top - 72, 3, 0, 7); ctx.fill() }
    if (ready(fim)) ctx.drawImage(fim, gx - fr.w * S / 2 + 30, gy - fr.h * S, fr.w * S, fr.h * S)
  }
  // the blimp with the auction banner
  { const bx = padL + ((t * 22) % (padR - padL + 600)) - 300, by = G.Y(40)
    ctx.fillStyle = "#d8d8e0"; ctx.beginPath(); ctx.ellipse(bx, by, 90, 26, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#a8a8b8"; ctx.beginPath(); ctx.ellipse(bx, by + 8, 86, 14, 0, 0, Math.PI); ctx.fill()
    ctx.fillStyle = "#5a5a6a"; ctx.fillRect(bx - 16, by + 24, 32, 9); ctx.beginPath(); ctx.moveTo(bx - 84, by); ctx.lineTo(bx - 106, by - 20); ctx.lineTo(bx - 100, by); ctx.lineTo(bx - 106, by + 20); ctx.fill()
    ctx.fillStyle = "#b01a2a"; ctx.fillRect(bx - 64, by - 9, 128, 18); ctx.save(); ctx.font = "900 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText("YORKNEW DREAM AUCTION", bx, by + 1); ctx.restore() }
}

function yorknewFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = YN.geo || ynGeo(def, c, W, dockTop), S = def.S, P = c.layout.pieces
  if (F[0] !== YN.p1) { Object.assign(YN, { p1: F[0], hp: new WeakMap(), ppl: null, troupe: null, impacts: [], bits: [], mafia: [], tracers: [], rage: false, chains: null, flash: 0, shout: [], leapT: 6 }); for (const k in YN.st) YN.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (YN.last || t))); YN.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + 4 * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = YN.hp.get(f); YN.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  // the Troupe on the balconies + the tram roof (per repeat of the street)
  if (!YN.troupe) { YN.troupe = []; const looks = [["#2a2a32", "#1a1a1a", 0, 1], ["#f0f0ea", "#3a2a1a", 1, 0], ["#4a3a6a", "#0a0a0a", 0, 0], ["#1a1a20", "#d8d8d8", 0, 0], ["#6a2a2a", "#2a1a0a", 0, 0]]
    P.street.roofs.forEach(([rx, ry], i) => YN.troupe.push({ rx, ry, seed: i * 1.7, dir: i % 2 ? -1 : 1, coat: looks[i][0], hair: looks[i][1], big: !!looks[i][2], cross: !!looks[i][3], leap: null, gone: false, drop: null })) }
  YN.leapT -= dt
  if (YN.leapT <= 0 && !YN.chains) { YN.leapT = 7 + ynRnd() * 5; const a = YN.troupe.filter(m => !m.leap && !m.gone && !m.drop); if (a.length) { const m = a[Math.floor(ynRnd() * a.length)], to = P.street.roofs[Math.floor(ynRnd() * P.street.roofs.length)]
    if (to[0] !== m.rx) { m.leap = { fx: m.rx, fy: m.ry, tx: to[0], ty: to[1], u: 0 }; YN.st.leaps++ } } }
  if (big && !YN.chains) { YN.st.impacts++; const a = YN.troupe.filter(m => !m.gone && !m.drop && !m.leap); const m = a.find(x => x.big) || a[0]
    const x = mid + (ynRnd() < 0.5 ? -1 : 1) * (180 + ynRnd() * 160)
    if (m) m.drop = { u: 0, x, from: null }
    YN.impacts.push({ x, y: feet - 6 * S, t: -0.35 }); if (YN.st.impacts % 2 === 1) ynShout(x, feet - 150, "BIG BANG IMPACT!!", "#8a2a10") }
  if (low && !YN.rage && !YN.chains) { YN.rage = true; YN.st.rage++; ynShout(mid, G.Y(260), "THE MAFIA! THEY'RE AFTER THE TROUPE!", "#1a1a1a")
    for (let i = 0; i < 6; i++) YN.mafia.push({ x: i < 3 ? padL - 40 - i * 40 : padR + 40 + (i - 3) * 40, dir: i < 3 ? 1 : -1, stop: i < 3 ? padL + 60 + i * 50 : padR - 60 - (i - 3) * 50, fire: 0, cd: 0.5 + ynRnd() }) }
  if (ko && !YN.chains) { YN.chains = { t: 0 }; YN.st.chains++; YN.flash = 0.9; camera.shake?.(8, 30); ynShout(mid, G.Y(250), "CHAIN JAIL!!", "#a07810") }
  if (YN.chains) { YN.chains.t += dt; if (YN.chains.t > 0.9) for (const m of YN.troupe) m.gone = true; for (const m of YN.mafia) m.dir = m.x < mid ? -1 : 1 }
  const cps = mirrorCopies(G, G.w, padL, padR, true)
  // where one repeat of the street meets the next (the temple's red wall against the shops) a tall Yorknew tenement
  // stands over the join, so the street reads as one long block
  for (const cp of cps) ynTenement(ctx, cp.X(0), G, dockTop, t, cp.k)
  for (const m of YN.troupe) { if (m.gone && !(YN.chains && YN.chains.t < 1.2)) continue
    if (m.leap) { m.leap.u += dt * 0.9; if (m.leap.u >= 1) { m.rx = m.leap.tx; m.ry = m.leap.ty; m.leap = null } }
    for (const cp of cps) {
      if (m.drop && cp === cps.reduce((a, b) => Math.abs(b.X(m.rx) - m.drop.x) < Math.abs(a.X(m.rx) - m.drop.x) ? b : a)) {
        m.drop.u += dt / cps.length * 2.8; const u = Math.min(1, m.drop.u), sx = cp.X(m.rx), sy = G.Y(m.ry)
        ynCoat(ctx, sx + (m.drop.x - sx) * u, sy + (feet - sy) * u - Math.sin(u * Math.PI) * 120, S * 0.9, m, t); if (m.drop.u > 1.6) m.drop = null; continue }
      let x = cp.X(m.rx), y = G.Y(m.ry)
      if (m.leap) { const u = m.leap.u; x = cp.X(m.leap.fx + (m.leap.tx - m.leap.fx) * u); y = G.Y(m.leap.fy + (m.leap.ty - m.leap.fy) * u) - Math.sin(u * Math.PI) * 110 }
      if (YN.chains && YN.chains.t > 0.6) { ctx.save(); ctx.globalAlpha = Math.max(0, 1.2 - YN.chains.t); ynCoat(ctx, x, y, S * 0.6, m, t); ctx.restore() } else ynCoat(ctx, x, y, S * 0.6, m, t)
      if (YN.rage && !YN.chains && Math.sin(t * 7 + m.seed * 3) > 0.92) { ctx.strokeStyle = "rgba(255,240,200,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 40, 16, 0, 7); ctx.stroke() } } }
  // shoppers on the street
  if (!YN.ppl) YN.ppl = Array.from({ length: 9 }, (_, i) => ({ kind: ["walk", "old", "walk", "kid", "walk", "walk", "stroller", "walk", "kid"][i], seed: i * 2.3, x: padL + (padR - padL) * ((i * 0.37 + 0.05) % 1), dir: i % 2 ? -1 : 1,
    speed: 50 + 30 * ((i * 0.41) % 1), mode: "walk", ph: i, cheer: 0, go: true, phone: i === 4, down: 0,
    shirt: ["#d84a4a", "#3a7ad8", "#f0c040", "#4aa860", "#e8e8e8", "#9a5ad0", "#f08a3a", "#2a3a7a", "#c83a8a"][i], pants: ["#2a3a6a", "#3a3a3a", "#5a4a3a"][i % 3],
    skin: ["#f1c9a5", "#c58c64", "#8a5a3a", "#e0b090", "#6a4028"][i % 5], hair: ["#3a2a1a", "#1a1a1a", "#8a4a2a", "#d8b060"][i % 4], hat: i === 1 ? "#6a5a4a" : null }))
  for (const p of YN.ppl) {
    if (p.down > 0) { p.down -= dt; ctx.save(); ctx.translate(p.x, feet - 6 * S); ctx.rotate(-p.dir * Math.PI / 2 * Math.min(1, (2.2 - p.down) * 4)); bwPerson(ctx, { ...p, cheer: 0, go: false, mode: "watch" }, 0, 0, 0.95, t); ctx.restore(); continue }
    const scared = YN.rage && !YN.chains, sp = scared ? 170 : p.speed; if (scared) { p.dir = p.x < mid ? -1 : 1; p.phone = false }
    p.cheer = YN.chains ? 1 : 0; p.go = !YN.chains; if (p.go) { p.x += p.dir * sp * dt; p.ph += dt * (scared ? 14 : 7) }
    if (p.x < padL - 40) { if (scared) p.x = padL - 39; else { p.x = padR + 30 } } if (p.x > padR + 40) { if (scared) p.x = padR + 39; else p.x = padL - 30 }
    bwPerson(ctx, p, p.x, feet - 6 * S, 0.95, t) }
  // the HxH cast watching from the street
  drawCrowd(ctx, YNC, { W, feet: feet - 4 * S, sh: shift(0.9, W) })
  // Big Bang Impact
  for (const I of YN.impacts) { I.t += dt; if (I.t < 0) continue
    if (!I.hit) { I.hit = true; camera.shake?.(9, 22)
      for (const p of YN.ppl) if (Math.abs(p.x - I.x) < 260 && p.down <= 0) { p.down = 2.2; p.dir = p.x < I.x ? 1 : -1; p.x += (p.x < I.x ? -30 : 30); YN.st.knocked++ }
      for (let i = 0; i < 22; i++) YN.bits.push({ x: I.x, y: I.y - 10, vx: (ynRnd() - 0.5) * 520, vy: -200 - ynRnd() * 380, r: 2 + ynRnd() * 4, col: ["#e8a030", "#d83a2a", "#5aa040", "#8a7a6a", "#f0e0c0"][i % 5], life: 1.6 }) }
    const u = Math.min(1, I.t / 1.1)
    ctx.fillStyle = `rgba(60,50,50,${0.5 * (1 - u * 0.5)})`; ctx.beginPath(); ctx.ellipse(I.x, I.y + 4, 70, 14, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = `rgba(255,240,210,${1 - u})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(I.x, I.y, 40 + 300 * u, 10 + 50 * u, 0, 0, 7); ctx.stroke()
    if (I.t < 0.2) { ctx.fillStyle = `rgba(255,250,230,${1 - I.t * 5})`; ctx.beginPath(); ctx.arc(I.x, I.y - 30, 70, 0, 7); ctx.fill() } }
  YN.impacts = YN.impacts.filter(I => I.t < 1.2)
  for (const b of YN.bits) { b.life -= dt; b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > feet) { b.y = feet; b.vy *= -0.3; b.vx *= 0.6 } ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill() }
  YN.bits = YN.bits.filter(b => b.life > 0)
  // the mafia firing on the Troupe
  for (const m of YN.mafia) { if (YN.chains) { m.x += m.dir * 220 * dt } else if (Math.abs(m.x - m.stop) > 4) m.x += Math.sign(m.stop - m.x) * 160 * dt
    else { m.cd -= dt; m.fire = Math.max(0, m.fire - dt * 8); if (m.cd <= 0) { m.cd = 0.25 + ynRnd() * 0.6; m.fire = 1; YN.st.shots++
      const tgt = YN.troupe.filter(x => !x.gone)[Math.floor(ynRnd() * YN.troupe.length)], cp = cps[Math.floor(ynRnd() * cps.length)]
      if (tgt && cp) YN.tracers.push({ x0: m.x + m.dir * 30, y0: feet - 60, x1: cp.X(tgt.rx) + (ynRnd() - 0.5) * 40, y1: G.Y(tgt.ry) - 40 + (ynRnd() - 0.5) * 30, a: 1 }) } }
    ynSuit(ctx, m.x, feet - 2 * S, S * 0.95, m, t) }
  YN.mafia = YN.mafia.filter(m => m.x > padL - 300 && m.x < padR + 300)
  for (const tr of YN.tracers) { tr.a -= dt * 5; ctx.strokeStyle = `rgba(255,230,140,${Math.max(0, tr.a)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tr.x0, tr.y0); ctx.lineTo(tr.x1, tr.y1); ctx.stroke() }
  YN.tracers = YN.tracers.filter(tr => tr.a > 0)
  // Kurapika's chains
  if (YN.chains && YN.chains.t < 2.4) { const k = Math.min(1, YN.chains.t / 0.5), a = Math.min(1, 2.4 - YN.chains.t)
    for (let j = 0; j < 4; j++) { const y0 = G.Y(150 + 60 * j), amp = 40 + 20 * j
      for (let i = 0; i < 60 * k; i++) { const u = i / 60, x = padL + (padR - padL) * u, y = y0 + Math.sin(u * 8 + j * 1.7 + YN.chains.t * 6) * amp
        ctx.save(); ctx.translate(x, y); ctx.rotate(u * 8 + j); ctx.strokeStyle = `rgba(240,200,60,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, 7); ctx.stroke(); ctx.restore() } } }
  for (const s of YN.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 19px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  YN.shout = YN.shout.filter(s => s.t > 0)
  if (YN.flash > 0) { YN.flash = Math.max(0, YN.flash - dt * 1.2); ctx.fillStyle = `rgba(255,230,140,${YN.flash * 0.7})`; ctx.fillRect(padL, G.y0 - 200, padR - padL, coverBottom - G.y0 + 200) }
}

// ───────────────────────────── THE COMMAND CENTER (Mighty Morphin Power Rangers; render-only, wall clock, own PRNG) ─────────────────────────────
// The desert outside Angel Grove (Mike's Stage sheet, its carved rock removed — only the open desert kept). On its rocky
// hill stands the COMMAND CENTER: the central tower with its crown and spire, the angled wings, the beacon. Canon touches:
// the Rangers TELEPORT in as streaks of coloured light; PUTTY PATROLLERS (grey clay foot soldiers) rise out of the sand and
// fight the Mighty Morphin Rangers (the game's own Ranger sprites — MMPR only, the two fighters left out) and crumble when
// beaten; Rita Repulsa's palace sits on the moon in the daytime sky (her telescope glints); ALPHA 5 calls out from the
// Command Center. Tumbleweeds, dust devils, heat shimmer. Big hit → a Putty is blasted apart, "AY-YI-YI-YI-YI!"; ≤25% →
// the beacon flashes red, GOLDAR flies over, Rita sends more Putties ("PUTTIES! ATTACK!"); KO → the POWER BLASTER: a
// rainbow beam across the desert, every Putty blown apart, Goldar retreats, "I'M GETTING A HEADACHE!" from the moon.
let _ccSeed = 0x9e3779b9
const ccRnd = () => { _ccSeed ^= _ccSeed << 13; _ccSeed ^= _ccSeed >>> 17; _ccSeed ^= _ccSeed << 5; return (_ccSeed >>> 0) / 4294967296 }
const CC_MMPR = ["mmpr_pink", "mmpr_black", "mmpr_white", "green_ranger"]
const CC_STREAKS = ["#e8202a", "#2a6ae8", "#222", "#f2c81e", "#f06ab0", "#2aa84a", "#f2f2f2"]
const CC = { p1: null, last: 0, hp: new WeakMap(), pairs: null, streaks: [], streakT: 1, weeds: null, devils: null, goldar: null, rage: false, blast: null, bits: [], shout: [], geo: null,
  st: { teleports: 0, puttiesDown: 0, rangerHits: 0, alpha: 0, rage: 0, goldar: 0, blaster: 0 } }
export const commandCenterState = () => ({ ...CC.st, pairs: (CC.pairs || []).length, rangers: (CC.pairs || []).map(p => p.key), weeds: (CC.weeds || []).length, rage: CC.rage,
  goldarFlying: !!CC.goldar, blasting: !!CC.blast, shouting: CC.shout.filter(s => s.t > 0).map(s => s.txt) })
function ccGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.rock, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S }
}
function ccShout(x, y, txt, col) { if (CC.shout.filter(s => s.t > 0).length < 3) CC.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function ccMesa(ctx, x, base, w, h, col, dark, seed) {   // a flat-topped desert mesa with strata
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w * 0.36, base - h * 0.9); ctx.lineTo(x - w * 0.3, base - h); ctx.lineTo(x + w * 0.28, base - h); ctx.lineTo(x + w * 0.34, base - h * 0.88); ctx.lineTo(x + w / 2, base); ctx.fill()
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(x + w * 0.08, base - h); ctx.lineTo(x + w * 0.28, base - h); ctx.lineTo(x + w * 0.34, base - h * 0.88); ctx.lineTo(x + w / 2, base); ctx.lineTo(x + w * 0.16, base); ctx.fill()
  ctx.strokeStyle = "rgba(90,40,20,0.35)"; ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { const y = base - h * i / 4; ctx.beginPath(); ctx.moveTo(x - w * (0.5 - 0.14 * i / 4), y + 2 * Math.sin(seed + i)); ctx.lineTo(x + w * (0.5 - 0.16 * i / 4), y); ctx.stroke() }
}
function ccBuilding(ctx, x, y, s, t, alarm) {   // the Command Center on its hilltop (~260 px tall at s 1, base at y)
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  const hull = "#c8ccd4", shade = "#8a909c", deep = "#5a606c", glass = "#3a7ad8"
  // wings
  for (const d of [-1, 1]) { ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(d * 30, 0); ctx.lineTo(d * 130, 0); ctx.lineTo(d * 118, -38); ctx.lineTo(d * 60, -62); ctx.lineTo(d * 30, -62); ctx.fill()
    ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(d * 30, -6); ctx.lineTo(d * 112, -6); ctx.lineTo(d * 104, -34); ctx.lineTo(d * 58, -56); ctx.lineTo(d * 30, -56); ctx.fill()
    ctx.fillStyle = glass; for (let i = 0; i < 4; i++) ctx.fillRect(d > 0 ? 40 + i * 16 : -52 - i * 16, -28, 10, 8)
    ctx.fillStyle = deep; ctx.beginPath(); ctx.moveTo(d * 96, -38); ctx.lineTo(d * 140, -70); ctx.lineTo(d * 132, -36); ctx.fill() }   // angled fins
  // the central tower
  ctx.fillStyle = shade; ctx.fillRect(-32, -150, 64, 150); ctx.fillStyle = hull; ctx.fillRect(-28, -150, 40, 150)
  for (let i = 0; i < 6; i++) { ctx.fillStyle = deep; ctx.fillRect(-34, -20 - i * 22, 68, 4) }
  ctx.fillStyle = glass; for (let i = 0; i < 5; i++) ctx.fillRect(-8, -40 - i * 22, 16, 8)
  // the crown: a wide faceted ring
  ctx.fillStyle = deep; ctx.beginPath(); ctx.moveTo(-70, -170); ctx.lineTo(70, -170); ctx.lineTo(54, -150); ctx.lineTo(-54, -150); ctx.fill()
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-58, -200); ctx.lineTo(58, -200); ctx.lineTo(74, -172); ctx.lineTo(-74, -172); ctx.fill()
  ctx.fillStyle = shade; for (let i = -3; i <= 3; i++) ctx.fillRect(i * 18 - 3, -198, 6, 26)
  ctx.fillStyle = glass; ctx.fillRect(-50, -186, 100, 6)
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-26, -200); ctx.lineTo(26, -200); ctx.lineTo(14, -222); ctx.lineTo(-14, -222); ctx.fill()
  // the spire + beacon
  ctx.strokeStyle = deep; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -222); ctx.lineTo(0, -262); ctx.stroke()
  const on = alarm ? Math.sin(t * 12) > 0 : Math.sin(t * 2) > 0.2
  ctx.fillStyle = alarm ? (on ? "#ff2a2a" : "#7a1010") : on ? "#7ad8ff" : "#2a6a8a"; ctx.beginPath(); ctx.arc(0, -264, 6, 0, 7); ctx.fill()
  if (on) { ctx.fillStyle = alarm ? "rgba(255,40,40,0.3)" : "rgba(120,220,255,0.25)"; ctx.beginPath(); ctx.arc(0, -264, 22, 0, 7); ctx.fill() }
  ctx.restore()
}
function ccPutty(ctx, x, y, s, p, t) {   // a Putty Patroller: grey textured clay, bulky, flat face (~66 px tall at s 1)
  const sw = Math.sin(t * 9 + p.seed) * (p.atk > 0 ? 0.9 : 0.25)
  ctx.save(); ctx.translate(x, y); ctx.scale(s * p.dir, s); if (p.hurt > 0) ctx.filter = "brightness(1.6)"
  ctx.fillStyle = "#6e6a70"; for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 5, -26); ctx.rotate(k * sw * 0.4); ctx.fillRect(-4.5, 0, 9, 26); ctx.restore() }
  ctx.fillStyle = "#7c7880"; ctx.beginPath(); ctx.moveTo(-14, -58); ctx.lineTo(14, -58); ctx.lineTo(11, -24); ctx.lineTo(-11, -24); ctx.fill()
  ctx.strokeStyle = "#5a565e"; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-11, -52 + i * 6); ctx.quadraticCurveTo(0, -49 + i * 6, 11, -52 + i * 6); ctx.stroke() }
  ctx.save(); ctx.translate(12, -52); ctx.rotate(p.atk > 0 ? -1.4 + sw : 0.4 + sw * 0.3); ctx.fillStyle = "#6e6a70"; ctx.fillRect(-4, 0, 8, 22); ctx.restore()
  ctx.save(); ctx.translate(-12, -52); ctx.rotate(-0.4 - sw * 0.3); ctx.fillStyle = "#6e6a70"; ctx.fillRect(-4, 0, 8, 22); ctx.restore()
  ctx.fillStyle = "#8a868e"; ctx.beginPath(); ctx.ellipse(0, -66, 9, 10, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#5a565e"; ctx.fillRect(-6, -68, 12, 2); ctx.fillRect(-4, -63, 8, 1.5)
  ctx.restore()
}
function ccGoldar(ctx, x, y, s, t, dir) {   // Goldar in flight: gold armour, dark wings, a sword
  const flap = Math.sin(t * 8) * 0.5
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s)
  ctx.fillStyle = "#3a2a3a"; for (const k of [-1, 1]) { ctx.save(); ctx.rotate(k * (0.4 + flap * 0.6)); ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-70 * 1, -40 + k * 20); ctx.lineTo(-56, -8); ctx.lineTo(-64, 6); ctx.lineTo(-10, 4); ctx.fill(); ctx.restore() }
  ctx.fillStyle = "#d4a020"; ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#a07810"; ctx.fillRect(-30, -4, 14, 8)
  ctx.fillStyle = "#e8b830"; ctx.beginPath(); ctx.arc(28, -6, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#b08010"; ctx.beginPath(); ctx.moveTo(24, -14); ctx.lineTo(30, -26); ctx.lineTo(34, -12); ctx.fill()
  ctx.fillStyle = "#e02020"; ctx.fillRect(31, -8, 3, 2)
  ctx.strokeStyle = "#d8dce4"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, 6); ctx.lineTo(60, 18); ctx.stroke(); ctx.fillStyle = "#d4a020"; ctx.fillRect(16, 3, 6, 6)
  ctx.restore()
}

function drawCommandSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = CC.geo = ccGeo(def, c, W, dockTop), P = c.layout.pieces, S = def.S, alarm = CC.rage && !CC.blast
  const dt = Math.min(0.05, Math.max(0, t - (CC.skyLast || t))); CC.skyLast = t
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, alarm ? "#4a5aa0" : "#2a6ae0"); g.addColorStop(0.7, alarm ? "#c89a8a" : "#9ac8f4"); g.addColorStop(1, alarm ? "#f0c0a0" : "#f2e2c8")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const sk = P.sky, im = c.img[sk.file]
  if (ready(im)) { const ps = shift(0.08, W), w = sk.w * S * 1.2, y = G.Y(-60) - sk.h * S * 0.5; ctx.save(); ctx.globalAlpha = 0.75
    for (let x = ((ps - padL) % w + w) % w - w + padL; x < padR; x += w) ctx.drawImage(im, x, y, w + 1, sk.h * S * 0.9); ctx.restore() }
  // the moon in the daytime sky, Rita's palace on it, her telescope glinting
  { const mx = W * 0.2 + shift(0.04, W), my = G.Y(-120), r = 38
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(190,200,220,0.7)"; ctx.beginPath(); ctx.arc(mx - 10, my + 8, 8, 0, 7); ctx.arc(mx + 14, my - 10, 6, 0, 7); ctx.fill()
    ctx.fillStyle = "rgba(70,60,90,0.85)"; ctx.fillRect(mx - 14, my - r - 10, 28, 12); ctx.fillRect(mx - 4, my - r - 22, 8, 14); ctx.fillRect(mx - 14, my - r - 16, 5, 8); ctx.fillRect(mx + 9, my - r - 16, 5, 8)
    if (Math.sin(t * 1.3) > 0.85 || alarm) { ctx.fillStyle = "rgba(255,255,220,0.95)"; ctx.beginPath(); ctx.arc(mx + 16, my - r - 12, 3 + Math.sin(t * 20), 0, 7); ctx.fill() } }
  // far mesas, near mesas
  for (const [p, n, hh, col, dk, gap] of [[0.15, 10, 60, "#d8a070", "#c08860", 260], [0.32, 7, 100, "#c0703a", "#9a5428", 380]]) {
    const ps = shift(p, W)
    for (let i = Math.floor((padL - ps) / gap) - 1; i * gap + ps < padR + gap; i++) { const x = i * gap + ps + 60 * _h(i * 3 + p * 10), w = 140 + 120 * _h(i * 7 + p), h = hh * (0.6 + 0.6 * _h(i * 11 + p))
      if (p > 0.3 && Math.abs(x - (W / 2 + shift(0.35, W))) < 300) continue
      ccMesa(ctx, x, dockTop + 2, w, h, col, dk, i) } }
  // the Command Center on its hill
  { const hx = W / 2 + shift(0.35, W), base = dockTop + 2, top = base - 115
    ctx.fillStyle = "#b8662e"; ctx.beginPath(); ctx.moveTo(hx - 330, base); ctx.quadraticCurveTo(hx - 250, top + 40, hx - 150, top + 6); ctx.lineTo(hx + 150, top + 4); ctx.quadraticCurveTo(hx + 250, top + 40, hx + 340, base); ctx.fill()
    ctx.fillStyle = "#8e4a20"; ctx.beginPath(); ctx.moveTo(hx + 40, top + 4); ctx.lineTo(hx + 150, top + 4); ctx.quadraticCurveTo(hx + 250, top + 40, hx + 340, base); ctx.lineTo(hx + 80, base); ctx.fill()
    ctx.strokeStyle = "rgba(90,40,20,0.4)"; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(hx - 300 + i * 20, top + i * 30); ctx.lineTo(hx + 300 - i * 18, top + i * 30 + 3); ctx.stroke() }
    for (const [rx, rr] of [[-210, 26], [-120, 18], [170, 22], [240, 30]]) { ctx.fillStyle = "#a05a28"; ctx.beginPath(); ctx.ellipse(hx + rx, top + 40 + Math.abs(rx) * 0.25, rr, rr * 0.7, 0, 0, 7); ctx.fill() }
    ccBuilding(ctx, hx, top + 8, S * 0.5, t, alarm); CC.ccx = hx; CC.ccy = top - 150 * S * 0.5 }
  // Rangers teleporting in: streaks of coloured light
  CC.streakT -= dt; if (CC.streakT <= 0 && !CC.blast) { CC.streakT = 3 + ccRnd() * 4; CC.st.teleports++; const from = ccRnd() < 0.5 ? padL - 80 : padR + 80
    CC.streaks.push({ x0: from, y0: G.Y(-150) + ccRnd() * 80, x1: (CC.ccx || W / 2) + (ccRnd() - 0.5) * 500, y1: dockTop - 10, col: CC_STREAKS[Math.floor(ccRnd() * CC_STREAKS.length)], u: 0 }) }
  for (const s of CC.streaks) { s.u += dt * 1.6; const u = Math.min(1, s.u), x = s.x0 + (s.x1 - s.x0) * u, y = s.y0 + (s.y1 - s.y0) * u - Math.sin(u * Math.PI) * 80
    const tx = s.x0 + (s.x1 - s.x0) * Math.max(0, u - 0.25), ty = s.y0 + (s.y1 - s.y0) * Math.max(0, u - 0.25) - Math.sin(Math.max(0, u - 0.25) * Math.PI) * 80
    ctx.strokeStyle = s.col; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.globalAlpha = s.u < 1 ? 0.9 : Math.max(0, 1.4 - s.u); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke()
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1 }
  CC.streaks = CC.streaks.filter(s => s.u < 1.4)
  // Goldar
  if (CC.goldar) { const gd = CC.goldar; gd.x += gd.dir * (CC.blast ? 420 : 140) * dt; gd.y += (CC.blast ? -160 : Math.sin(t * 1.5) * 20) * dt
    ccGoldar(ctx, gd.x, gd.y, S * 0.8, t, gd.dir); if (!CC.blast && (gd.x < padL + 80 || gd.x > padR - 80)) gd.dir *= -1; if (gd.y < coverTop - 200) CC.goldar = null }
}

function commandFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = CC.geo || ccGeo(def, c, W, dockTop), S = def.S
  if (F[0] !== CC.p1) { Object.assign(CC, { p1: F[0], hp: new WeakMap(), pairs: null, streaks: [], streakT: 1, weeds: null, devils: null, goldar: null, rage: false, blast: null, bits: [], shout: [] }); for (const k in CC.st) CC.st[k] = 0 }
  if (!AG.spr) agLoad()
  const dt = Math.min(0.05, Math.max(0, t - (CC.last || t))); CC.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + 5 * S, fighting = new Set(F.map(f => f.rosterKey))
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = CC.hp.get(f); CC.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  const alpha = (txt) => { CC.st.alpha++; ccShout(CC.ccx || W / 2, (CC.ccy || G.Y(0)) - 20, txt, "#c01818") }
  // tumbleweeds + dust devils
  if (!CC.weeds) CC.weeds = [0, 1, 2].map(i => ({ x: padL + (padR - padL) * (0.2 + 0.3 * i), v: 60 + 40 * i, r: 9 + 4 * i, rot: 0, hop: i }))
  if (!CC.devils) CC.devils = [{ x: padL + (padR - padL) * 0.3, v: 30 }, { x: padL + (padR - padL) * 0.75, v: -24 }]
  // the Rangers vs the Putties
  const R = (AG.spr?.rangers || []).filter(r => CC_MMPR.includes(r.key) && !fighting.has(r.key))
  if (!CC.pairs && AG.spr && R.length) CC.pairs = R.slice(0, 3).map((r, i) => ({ key: r.key, x: padL + (padR - padL) * [0.22, 0.5, 0.78][i], dir: i % 2 ? -1 : 1, t: i * 0.5, rAtk: 0, rHurt: 0, rName: "idle",
    p: { hp: 3, hurt: 0, atk: 0, rise: 1, gone: 0, seed: i * 3.1, dir: i % 2 ? 1 : -1 } }))
  if (big && !CC.blast) { alpha(["AY-YI-YI-YI-YI!", "AY-YI-YI! RANGERS, BE CAREFUL!", "OH NO! AY-YI-YI!"][CC.st.alpha % 3]); camera.shake?.(4, 12)
    const pr = (CC.pairs || []).find(q => q.p.gone <= 0 && q.p.rise <= 0); if (pr) { pr.p.hp = 0; pr.p.gone = 2.5; CC.st.puttiesDown++; ccCrumble(pr.x + pr.dir * 46 * S * 0.5, feet) } }
  if (low && !CC.rage && !CC.blast) { CC.rage = true; CC.st.rage++; CC.st.goldar++; CC.goldar = { x: padR + 100, y: G.Y(-60), dir: -1 }
    ccShout(W * 0.2 + shift(0.04, W), G.Y(-60), "GOLDAR! PUTTIES! ATTACK!", "#7a1a8a"); setTimeout(() => alpha("ZORDON! THE ALARM!"), 900) }
  if (ko && !CC.blast) { CC.blast = { t: 0 }; CC.st.blaster++; camera.shake?.(10, 40); ccShout(mid, G.Y(-20), "POWER BLASTER!", "#c01818") }
  if (CC.blast) { CC.blast.t += dt; if (CC.blast.t > 0.5 && !CC.blast.hit) { CC.blast.hit = true; for (const pr of CC.pairs || []) if (pr.p.gone <= 0) { pr.p.gone = 99; CC.st.puttiesDown++; ccCrumble(pr.x + pr.dir * 46 * S * 0.5, feet) } if (CC.goldar) CC.goldar.dir = CC.goldar.dir || 1 }
    if (CC.blast.t > 1.4 && !CC.blast.rita) { CC.blast.rita = true; ccShout(W * 0.2 + shift(0.04, W), G.Y(-60), "I'M GETTING A HEADACHE!", "#7a1a8a") } }
  for (const pr of CC.pairs || []) { const ranger = R.find(r => r.key === pr.key) || (AG.spr?.rangers || []).find(r => r.key === pr.key), pt = pr.p, d = pr.dir
    pr.t -= dt; pr.rAtk = Math.max(0, pr.rAtk - dt); pr.rHurt = Math.max(0, pr.rHurt - dt); pt.hurt = Math.max(0, pt.hurt - dt); pt.atk = Math.max(0, pt.atk - dt)
    if (pt.gone > 0) { pt.gone -= dt; if (pt.gone <= 0 && !CC.blast) Object.assign(pt, { hp: CC.rage ? 4 : 3, rise: 1 }) }
    else if (pt.rise > 0) pt.rise = Math.max(0, pt.rise - dt * 0.8)
    else if (pr.t <= 0 && !CC.blast) { pr.t = 0.55 + ccRnd() * 0.7
      if (ccRnd() < (CC.rage ? 0.6 : 0.7)) { pr.rAtk = 0.35; pr.rName = ccRnd() < 0.5 ? "light" : "heavy"; pt.hurt = 0.3; pt.hp--; if (pt.hp <= 0) { pt.gone = 2.4; CC.st.puttiesDown++; ccCrumble(pr.x + d * 46 * S * 0.5, feet) } }
      else { pt.atk = 0.35; pr.rHurt = 0.4; CC.st.rangerHits++ } }
    if (ranger) agAnim(ctx, ranger, CC.blast ? (Math.floor(t * 2) % 2 ? "jump" : "idle") : pr.rHurt > 0 ? "hurt" : pr.rAtk > 0 ? pr.rName : "idle", t * 8 + pr.x, pr.x - d * (pr.rHurt > 0 ? 8 : 0), feet, ranger.sc * 0.5, d)
    if (pt.gone <= 0) { const px = pr.x + d * 46 * S * 0.5; ctx.save(); if (pt.rise > 0) { ctx.beginPath(); ctx.rect(px - 60, feet - 200, 120, 200); ctx.clip() }
      ccPutty(ctx, px, feet + pt.rise * 70, S * 0.7, { ...pt, dir: -d }, t); ctx.restore()
      if (pt.rise > 0) { ctx.fillStyle = `rgba(200,140,80,${0.6 * pt.rise})`; ctx.beginPath(); ctx.ellipse(px, feet, 40, 10, 0, 0, 7); ctx.fill() } } }
  // crumbling clay, tumbleweeds, dust devils
  for (const b of CC.bits) { b.life -= dt; b.vy += 800 * dt; b.x += b.vx * dt; b.y = Math.min(feet, b.y + b.vy * dt); ctx.fillStyle = b.col; ctx.fillRect(b.x, b.y, b.r, b.r) }
  CC.bits = CC.bits.filter(b => b.life > 0)
  for (const w of CC.weeds) { w.x += w.v * dt; w.rot += w.v * dt / w.r; if (w.x > padR + 40) w.x = padL - 40; const y = feet + 4 - Math.abs(Math.sin(t * 3 + w.hop)) * 12
    ctx.save(); ctx.translate(w.x, y - w.r); ctx.rotate(w.rot); ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 1.5; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(0, 0, w.r, w.r * 0.6, i * 0.45, 0, 7); ctx.stroke() } ctx.restore() }
  for (const d2 of CC.devils) { d2.x += d2.v * dt; if (d2.x < padL - 60) d2.x = padR + 40; if (d2.x > padR + 60) d2.x = padL - 40
    for (let i = 0; i < 10; i++) { const y = feet - i * 12, r = 6 + i * 3, a = Math.sin(t * 9 + i * 0.8) * r * 0.6
      ctx.fillStyle = `rgba(210,150,90,${0.22 - i * 0.015})`; ctx.beginPath(); ctx.ellipse(d2.x + a, y, r, 4, 0, 0, 7); ctx.fill() } }
  // the Power Blaster
  if (CC.blast && CC.blast.t < 1.6) { const k = Math.min(1, CC.blast.t / 0.35), a = Math.min(1, (1.6 - CC.blast.t) * 2), y = feet - 70, x0 = padL, x1 = padL + (padR - padL) * k;
    ["#e8202a", "#2a6ae8", "#f2c81e", "#f06ab0", "#222"].forEach((col, i) => { ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y - 16 + i * 8 + Math.sin(t * 30 + i) * 2); ctx.lineTo(x1, y - 16 + i * 8); ctx.stroke() })
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.globalAlpha = 1
    if (CC.blast.t < 0.5) { ctx.fillStyle = `rgba(255,255,240,${0.5 - CC.blast.t})`; ctx.fillRect(padL, G.y0 - 600, padR - padL, coverBottom - G.y0 + 600) } }
  for (const s of CC.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  CC.shout = CC.shout.filter(s => s.t > 0)
}
function ccCrumble(x, y) { for (let i = 0; i < 16; i++) CC.bits.push({ x: x + (ccRnd() - 0.5) * 20, y: y - 20 - ccRnd() * 40, vx: (ccRnd() - 0.5) * 260, vy: -120 - ccRnd() * 220, r: 3 + ccRnd() * 4, col: ccRnd() < 0.5 ? "#7c7880" : "#5a565e", life: 1.4 }) }

// ───────────────────────────── SUNAGAKURE, THE VILLAGE HIDDEN IN THE SAND (Naruto; render-only, wall clock, own PRNG) ─────────────────────────────
// Lee's Stage (Street Fighter, 1987): only its brick parapet + tiled floor kept (repainted sandstone); the Great Wall hills
// are gone. Behind the parapet: the village — rounded sandstone houses with domed roofs and round windows, water tanks,
// laundry, the great domed KAZEKAGE BUILDING with 風 on it and its flag — all inside the ring of sheer rock cliffs, under
// a hot sky. Sand ninja (flak vests, head wraps) leap across the rooftops; sand blows across the plaza in streaks; the
// Naruto cast who aren't fighting watch from the plaza (shared crowd: Gaara, Naruto, Sakura, Kakashi, Hinata). Big hit →
// GAARA'S SAND surges up behind the fight (a wave + spikes, a burst of grit); ≤25% → a SANDSTORM rolls in, the sky goes
// brown, and SHUKAKU rises behind the cliffs; KO → SAND BURIAL: a giant hand of sand rises and crushes shut over Shukaku,
// sand bursts over the whole village, the storm clears.
let _snSeed = 0x510e527f ^ 0x5be0cd19
const snRnd = () => { _snSeed ^= _snSeed << 13; _snSeed ^= _snSeed >>> 17; _snSeed ^= _snSeed << 5; return (_snSeed >>> 0) / 4294967296 }
const SN_CROWD = [["gaara", 0.16, 0], ["naruto", 0.34, 0], ["sakura", 0.5, 0], ["kakashi", 0.68, 0], ["hinata", 0.86, 0]]
const SNC = makeCrowd(SN_CROWD, 0.6)
const SN = { p1: null, last: 0, hp: new WeakMap(), ninja: null, grains: null, surges: [], storm: 0, shukaku: 0, burial: null, burst: [], shout: [], geo: null,
  st: { leaps: 0, surges: 0, storm: 0, burial: 0 } }
export const sunaState = () => ({ ...SN.st, ninja: (SN.ninja || []).length, grains: (SN.grains || []).length, storm: +SN.storm.toFixed(2), shukaku: +SN.shukaku.toFixed(2), burial: SN.burial ? +SN.burial.t.toFixed(2) : 0,
  crowd: crowdState(SNC), shouting: SN.shout.filter(s => s.t > 0).map(s => s.txt) })
function snGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.wall, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S, top: y0 + pc.top * S }
}
function snShout(x, y, txt, col) { if (SN.shout.filter(s => s.t > 0).length < 3) SN.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function snHouse(ctx, x, base, w, h, seed, t) {   // a rounded sandstone house: soft corners, a dome or flat roof, round windows
  const sh = 0.86 + 0.14 * _h(seed), col = `rgb(${226 * sh | 0},${190 * sh | 0},${132 * sh | 0})`, dark = `rgb(${176 * sh | 0},${136 * sh | 0},${88 * sh | 0})`
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h + 10); ctx.quadraticCurveTo(x, base - h, x + 10, base - h); ctx.lineTo(x + w - 10, base - h); ctx.quadraticCurveTo(x + w, base - h, x + w, base - h + 10); ctx.lineTo(x + w, base); ctx.fill()
  ctx.fillStyle = dark; ctx.fillRect(x + w * 0.72, base - h + 8, w * 0.28, h - 8)
  if (_h(seed * 3) < 0.55) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + w / 2, base - h, w * 0.42, w * 0.3, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x + w / 2 + w * 0.12, base - h, w * 0.3, w * 0.22, 0, Math.PI * 1.5, 0); ctx.fill() }
  else if (_h(seed * 5) < 0.5) { ctx.fillStyle = "#8a6a4a"; ctx.fillRect(x + w * 0.6, base - h - 22, 18, 22); ctx.fillStyle = "#6a5038"; ctx.fillRect(x + w * 0.6 + 2, base - h - 26, 14, 5) }   // water tank
  ctx.fillStyle = "#3a2a1e"; const rows = Math.max(1, Math.floor(h / 34))
  for (let r = 0; r < rows; r++) for (let i = 0; i < Math.max(1, Math.floor(w / 30)); i++) { if (_h(seed + r * 7 + i * 3) < 0.25) continue; ctx.beginPath(); ctx.arc(x + 15 + i * 30, base - h + 22 + r * 34, 6, 0, 7); ctx.fill() }
  if (_h(seed * 11) < 0.35) { ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6, base - h * 0.55); ctx.lineTo(x + w - 6, base - h * 0.58); ctx.stroke()
    for (let j = 0; j < 3; j++) { ctx.fillStyle = ["#c84a3a", "#f2f2ea", "#3a6ab8"][j]; ctx.fillRect(x + 12 + j * (w - 30) / 3, base - h * 0.56, 9, 12 + 3 * Math.sin(t * 2 + j + seed)) } }
}
function snKazekage(ctx, x, base, s, t) {   // the Kazekage building: a great round drum with a dome, 風 on the front, a flag on top
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s)
  const g = ctx.createLinearGradient(-120, 0, 120, 0); g.addColorStop(0, "#b88a52"); g.addColorStop(0.4, "#ecc890"); g.addColorStop(1, "#9a7040")
  ctx.fillStyle = g; ctx.fillRect(-120, -150, 240, 150)
  ctx.beginPath(); ctx.ellipse(0, -150, 120, 30, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -150, 110, 96, 0, Math.PI, 0); ctx.fill()
  ctx.strokeStyle = "rgba(90,60,30,0.4)"; ctx.lineWidth = 2; for (const y of [-40, -90]) { ctx.beginPath(); ctx.moveTo(-120, y); ctx.lineTo(120, y); ctx.stroke() }
  ctx.fillStyle = "#2a1e14"; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 30, -64, 7, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(i * 30, -116, 6, 0, 7); ctx.fill() }
  ctx.fillStyle = "#3a2a1e"; ctx.fillRect(-18, -36, 36, 36)
  ctx.fillStyle = "#f4ecd8"; ctx.beginPath(); ctx.arc(0, -196, 26, 0, 7); ctx.fill(); ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 3; ctx.stroke()
  ctx.font = `900 30px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#1a3a8a"; ctx.fillText("風", 0, -195)
  ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -246); ctx.lineTo(0, -300); ctx.stroke()
  ctx.fillStyle = "#2a6ac8"; ctx.beginPath(); ctx.moveTo(0, -300); for (let i = 0; i <= 6; i++) ctx.lineTo(i * 8, -296 + Math.sin(t * 5 + i) * 3); ctx.lineTo(48, -282); for (let i = 6; i >= 0; i--) ctx.lineTo(i * 8, -282 + Math.sin(t * 5 + i) * 3); ctx.fill()
  ctx.restore()
}
function snNinja(ctx, x, y, s, n, t) {   // a Sand ninja: flak vest over beige, a head wrap, mid-leap or crouched
  ctx.save(); ctx.translate(x, y); ctx.scale(s * n.dir, s); if (n.air) ctx.rotate(-0.3)
  ctx.fillStyle = "#6a5a4a"; ctx.fillRect(-5, -20, 4, 20); ctx.fillRect(2, -20, 4, n.air ? 14 : 20)
  ctx.fillStyle = "#b8a070"; ctx.fillRect(-8, -42, 16, 24); ctx.fillStyle = "#8a7a58"; ctx.fillRect(-8, -40, 16, 8)
  ctx.fillStyle = "#e8d8b0"; ctx.beginPath(); ctx.arc(0, -49, 6.5, 0, 7); ctx.fill(); ctx.fillStyle = "#d8c8a0"; ctx.fillRect(-7, -56, 14, 5)
  ctx.fillStyle = "#a8a8b0"; ctx.fillRect(-5, -55, 10, 3); ctx.restore()
}
function snShukaku(ctx, x, base, s, rise, t, k) {   // Shukaku: a towering sand tanuki with blue markings and a huge tail
  if (rise <= 0) return
  ctx.save(); ctx.translate(x, base + (1 - rise) * 380 * s); ctx.scale(s, s)
  const sand = "#cfa86a", dark = "#a8824a"
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(90, -60); ctx.quadraticCurveTo(220 + Math.sin(t) * 20, -140, 170, -300); ctx.quadraticCurveTo(140, -200, 70, -110); ctx.fill()
  ctx.fillStyle = sand; ctx.beginPath(); ctx.ellipse(0, -130, 110, 140, 0, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.ellipse(0, -300, 70, 60, 0, 0, 7); ctx.fill()
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 40, -340); ctx.lineTo(d * 62, -398); ctx.lineTo(d * 70, -330); ctx.fill() }
  ctx.strokeStyle = "#3a5ab8"; ctx.lineWidth = 6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, -130, 30 + i * 18, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(-50, -320); ctx.quadraticCurveTo(0, -280, 50, -320); ctx.stroke()
  for (const d of [-1, 1]) { ctx.fillStyle = "#e8d040"; ctx.beginPath(); ctx.arc(d * 26, -306, 14, 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(d * 26 - 3, -320); ctx.lineTo(d * 26 + 3, -306); ctx.lineTo(d * 26 - 3, -292); ctx.lineTo(d * 26 - 6, -306); ctx.fill() }
  ctx.fillStyle = "#6a3a2a"; ctx.beginPath(); ctx.ellipse(0, -270, 30, 10 + 6 * Math.abs(Math.sin(t * 3)), 0, 0, 7); ctx.fill()
  if (k > 0) { ctx.fillStyle = "#c8a060"; ctx.beginPath(); ctx.moveTo(-160, 0); ctx.quadraticCurveTo(-200, -260 * k, -40, -420 * k); ctx.quadraticCurveTo(80, -480 * k, 170, -380 * k); ctx.quadraticCurveTo(220, -200 * k, 160, 0); ctx.fill()   // the sand hand closing
    ctx.strokeStyle = "#9a7a42"; ctx.lineWidth = 5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-100 + i * 70, -380 * k); ctx.lineTo(-90 + i * 60, -60); ctx.stroke() } }
  ctx.restore()
}

function drawSunaSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = SN.geo = snGeo(def, c, W, dockTop), P = c.layout.pieces, S = def.S, st = SN.storm
  const g = ctx.createLinearGradient(0, coverTop, 0, G.top); g.addColorStop(0, st ? `rgb(${120 + 40 * (1 - st) | 0},${90 + 60 * (1 - st) | 0},${60 + 120 * (1 - st) | 0})` : "#6aa0d8"); g.addColorStop(1, st ? `rgb(${200 - 30 * st | 0},${160 - 40 * st | 0},${110 - 30 * st | 0})` : "#f2dcb0")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  { const sx = W * 0.75 + shift(0.03, W), sy = G.Y(-200), a = 1 - st * 0.8; ctx.fillStyle = `rgba(255,250,220,${0.25 * a})`; ctx.beginPath(); ctx.arc(sx, sy, 80, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(255,248,214,${a})`; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill() }
  const sk = P.sky, im = c.img[sk.file]
  if (ready(im)) { const ps = shift(0.06, W), w = sk.w * S, y = G.Y(-260); ctx.save(); ctx.globalAlpha = 0.5 * (1 - st * 0.6); for (let x = ((ps - padL) % w + w) % w - w + padL; x < padR; x += w) ctx.drawImage(im, x, y, w + 1, sk.h * S * 0.8); ctx.restore() }
  const hz = G.top + 10
  // far dunes
  { const ps = shift(0.12, W); ctx.fillStyle = "#e0b878"; ctx.beginPath(); ctx.moveTo(padL, hz); for (let x = padL; x <= padR + 20; x += 20) ctx.lineTo(x, hz - 70 - 30 * Math.sin((x - ps) / 140) - 14 * Math.sin((x - ps) / 47)); ctx.lineTo(padR, hz); ctx.fill() }
  // the ring of sheer rock cliffs
  { const ps = shift(0.25, W), gap = 1100
    for (let i = Math.floor((padL - ps) / gap) - 1; i * gap + ps < padR + gap; i++) { const cx = i * gap + ps
      for (const [dx, w, h] of [[-300, 420, 210], [300, 380, 190]]) { const x = cx + dx, top = hz - h
        const cg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); cg.addColorStop(0, "#a06a3a"); cg.addColorStop(0.45, "#c88e52"); cg.addColorStop(1, "#7a4e2a")
        ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(x - w / 2, hz); ctx.lineTo(x - w / 2 + 20, top + 30); ctx.lineTo(x - w / 2 + 60, top); ctx.lineTo(x + w / 2 - 50, top + 8); ctx.lineTo(x + w / 2 - 14, top + 40); ctx.lineTo(x + w / 2, hz); ctx.fill()
        ctx.strokeStyle = "rgba(90,50,20,0.35)"; ctx.lineWidth = 2; for (let j = 1; j < 6; j++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 10, top + j * h / 6); ctx.lineTo(x + w / 2 - 10, top + j * h / 6 + 4 * Math.sin(j + i)); ctx.stroke() }
        for (let j = 0; j < 5; j++) { ctx.strokeStyle = "rgba(70,40,15,0.3)"; ctx.beginPath(); ctx.moveTo(x - w / 2 + 40 + j * w / 5, top + 10); ctx.lineTo(x - w / 2 + 30 + j * w / 5, hz); ctx.stroke() } } } }
  // Shukaku rising in front of the cliffs, behind the village rooftops
  snShukaku(ctx, W * 0.5 + shift(0.3, W) + 260, hz + 60, S * 0.42, SN.shukaku, t, SN.burial ? Math.min(1, SN.burial.t / 0.9) : 0)
  // the village
  { const ps = shift(0.45, W), base = hz + 4, step = 96
    for (let i = Math.floor((padL - ps) / step) - 1; i * step + ps < padR + step; i++) { const x = i * step + ps + 20 * _h(i * 3.7), w = 60 + 30 * _h(i * 5.1), h = 40 + 60 * _h(i * 9.3)
      if (Math.abs(x + w / 2 - (W / 2 + ps)) < 120) continue
      snHouse(ctx, x, base, w, h, i, t) }
    snKazekage(ctx, W / 2 + ps, base, S * 0.36, t) }
  // sand ninja leaping across the rooftops
  const dt = Math.min(0.05, Math.max(0, t - (SN.skyLast || t))); SN.skyLast = t
  if (!SN.ninja) SN.ninja = [0, 1, 2, 3].map(i => ({ x: padL + (padR - padL) * (0.15 + 0.23 * i), dir: i % 2 ? -1 : 1, t: i * 0.7, air: 0, from: 0, to: 0 }))
  for (const n of SN.ninja) { n.t -= dt
    if (n.air > 0) { n.air = Math.max(0, n.air - dt * 1.4); const u = 1 - n.air; n.x = n.from + (n.to - n.from) * u; if (n.air === 0) n.t = 0.8 + snRnd() * 1.6 }
    else if (n.t <= 0) { n.air = 1; n.from = n.x; n.to = n.x + n.dir * (120 + snRnd() * 160); SN.st.leaps++; if (n.to < padL + 30 || n.to > padR - 30) { n.dir *= -1; n.to = n.x + n.dir * 140 } }
    const y = hz - 60 - (n.air > 0 ? Math.sin((1 - n.air) * Math.PI) * 70 : 0); snNinja(ctx, n.x, y, S * 0.55, { ...n, air: n.air > 0 }, t) }
}

function sunaFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = SN.geo || snGeo(def, c, W, dockTop), S = def.S
  if (F[0] !== SN.p1) { Object.assign(SN, { p1: F[0], hp: new WeakMap(), ninja: null, grains: null, surges: [], storm: 0, shukaku: 0, burial: null, burst: [], shout: [] }); for (const k in SN.st) SN.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (SN.last || t))); SN.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + 8 * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = SN.hp.get(f); SN.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big && !SN.burial) { SN.st.surges++; const x = mid + (snRnd() < 0.5 ? -1 : 1) * (220 + snRnd() * 160); SN.surges.push({ x, t: 0, dir: x < mid ? 1 : -1 }); camera.shake?.(4, 14)
    if (SN.st.surges % 2 === 1) snShout(x, G.top - 60, ["THE SAND IS MOVING ON ITS OWN!", "LORD GAARA'S SAND!", "SAND SHIELD!"][Math.floor(SN.st.surges / 2) % 3], "#7a5a20") }
  if (low && !SN.st.storm && !SN.burial) { SN.st.storm++; snShout(mid, G.top - 120, "A SANDSTORM… AND THE ONE-TAIL?!", "#8a3a1a") }
  if (SN.st.storm && !SN.burial) { SN.storm = Math.min(1, SN.storm + dt * 0.8); SN.shukaku = Math.min(1, SN.shukaku + dt * 0.6) }
  if (ko && !SN.burial) { SN.burial = { t: 0 }; SN.st.burial++; if (SN.shukaku < 0.6) SN.shukaku = 0.6; snShout(mid, G.top - 120, "SAND BURIAL!!", "#7a5a20") }
  if (SN.burial) { SN.burial.t += dt; if (SN.burial.t > 0.9 && !SN.burial.boom) { SN.burial.boom = true; camera.shake?.(14, 50)
      for (let i = 0; i < 60; i++) SN.burst.push({ x: padL + (padR - padL) * snRnd(), y: G.top - snRnd() * 200, vx: (snRnd() - 0.5) * 500, vy: -100 - snRnd() * 300, life: 1.8 }) }
    if (SN.burial.t > 1.6) { SN.shukaku = Math.max(0, SN.shukaku - dt * 0.5); SN.storm = Math.max(0, SN.storm - dt * 0.4) } }
  // the cast on the plaza
  drawCrowd(ctx, SNC, { W, feet, sh: shift(0.9, W) })
  // Gaara's sand surging up behind the fight
  for (const s of SN.surges) { s.t += dt; const u = Math.min(1, s.t / 0.5), back = Math.max(0, s.t - 1) * 1.6, h = Math.max(0, u - back) * 160
    ctx.fillStyle = "rgba(214,176,110,0.95)"; ctx.beginPath(); ctx.moveTo(s.x - 140, feet - 6); ctx.quadraticCurveTo(s.x - 60, feet - h * 1.1, s.x + s.dir * 40, feet - h); ctx.quadraticCurveTo(s.x + s.dir * 100, feet - h * 0.7, s.x + 150, feet - 6); ctx.fill()
    for (let i = 0; i < 5; i++) { const sx = s.x - 90 + i * 45, sh = h * (0.5 + 0.5 * _h(i + s.x)); ctx.fillStyle = "#c89a5a"; ctx.beginPath(); ctx.moveTo(sx - 9, feet - 6); ctx.lineTo(sx, feet - 6 - sh); ctx.lineTo(sx + 9, feet - 6); ctx.fill() }
    if (s.t < 0.6) for (let i = 0; i < 3; i++) SN.burst.push({ x: s.x + (snRnd() - 0.5) * 200, y: feet - 20, vx: (snRnd() - 0.5) * 300, vy: -200 - snRnd() * 200, life: 1 }) }
  SN.surges = SN.surges.filter(s => s.t < 1.7)
  // grit, blowing sand, the storm haze
  for (const b of SN.burst) { b.life -= dt; b.vy += 500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; ctx.fillStyle = `rgba(200,160,100,${Math.min(1, b.life)})`; ctx.fillRect(b.x, b.y, 3, 3) }
  SN.burst = SN.burst.filter(b => b.life > 0).slice(-400)
  if (!SN.grains) SN.grains = Array.from({ length: 90 }, (_, i) => ({ x: padL + (padR - padL) * ((i * 0.137) % 1), y: G.top - 150 + (coverBottom - G.top + 150) * ((i * 0.611) % 1), v: 140 + 120 * ((i * 0.37) % 1), l: 8 + 14 * ((i * 0.53) % 1) }))
  for (const gr of SN.grains) { gr.x += gr.v * (1 + SN.storm * 2.5) * dt; gr.y += Math.sin(t * 2 + gr.l) * 10 * dt; if (gr.x > padR + 30) gr.x = padL - 30
    ctx.strokeStyle = `rgba(230,200,150,${0.35 + 0.3 * SN.storm})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(gr.x, gr.y); ctx.lineTo(gr.x - gr.l * (1 + SN.storm), gr.y); ctx.stroke() }
  if (SN.storm > 0) { for (let i = 0; i < 3; i++) { const y = G.top - 220 + i * 140 + Math.sin(t * 0.8 + i) * 20, gr = ctx.createLinearGradient(0, y - 60, 0, y + 60); gr.addColorStop(0, "rgba(190,140,80,0)"); gr.addColorStop(0.5, `rgba(190,140,80,${0.28 * SN.storm})`); gr.addColorStop(1, "rgba(190,140,80,0)")
    ctx.fillStyle = gr; ctx.fillRect(padL, y - 60, padR - padL, 120) } }
  for (const s of SN.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  SN.shout = SN.shout.filter(s => s.t > 0)
}

// ───────────────────────────── THE FOREST OF DEATH, TRAINING GROUND 44 (Naruto; render-only, wall clock, own PRNG) ─────────────────────────────
// Oro's stage (Street Fighter III): the cave repainted as the hollow under a giant tree's roots (bark + moss), its black
// void cut away. Through its openings and above it: the forest — huge trunks in green mist, the exam TOWER in the middle
// distance, roots, hanging vines, the canopy, shafts of light, a no-entry fence sign (立入禁止). A GIANT SNAKE slithers
// between the trunks; falling leaves; the Genin who aren't fighting watch from the roots (shared crowd). Big hit → the
// giant snake lunges in through an opening (jaws open) and pulls back; ≤25% → Orochimaru's chakra: purple mist creeps
// in, snake eyes glow in every opening, the light turns sickly; KO → the giant snake strikes down from the canopy, then
// vanishes in a summoning puff, leaves burst everywhere, the mist clears.
let _fdSeed = 0x6a09e667 ^ 0x1f83d9ab
const fdRnd = () => { _fdSeed ^= _fdSeed << 13; _fdSeed ^= _fdSeed >>> 17; _fdSeed ^= _fdSeed << 5; return (_fdSeed >>> 0) / 4294967296 }
const FD_CROWD = [["sasuke", 0.14, 0], ["sakura", 0.32, 0], ["naruto", 0.5, 0], ["hinata", 0.68, 0], ["gaara", 0.86, 0]]
const FDC = makeCrowd(FD_CROWD, 0.6)
const FD = { p1: null, last: 0, hp: new WeakMap(), leaves: null, lunges: [], mist: 0, strike: null, puffs: [], burst: [], shout: [], geo: null, snakeX: 0,
  st: { lunges: 0, mist: 0, strike: 0 } }
export const forestState = () => ({ ...FD.st, leaves: (FD.leaves || []).length, mist: +FD.mist.toFixed(2), strike: FD.strike ? +FD.strike.t.toFixed(2) : 0,
  crowd: crowdState(FDC), shouting: FD.shout.filter(s => s.t > 0).map(s => s.txt) })
function fdGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.hollow, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, h, x0, y0, X: px => x0 + px * S, Y: py => y0 + py * S, winTop: y0 + 300 * S, winBot: y0 + 418 * S }
}
function fdShout(x, y, txt, col) { if (FD.shout.filter(s => s.t > 0).length < 3) FD.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function fdTrunk(ctx, x, top, base, w, col, dark, seed) {   // a giant trunk with roots flaring at the base and bark grooves
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top)
  ctx.lineTo(x + w / 2 + 4, base - w * 0.5); ctx.quadraticCurveTo(x + w * 0.6, base - 10, x + w * 1.3, base); ctx.lineTo(x - w * 1.3, base); ctx.quadraticCurveTo(x - w * 0.6, base - 10, x - w / 2 - 4, base - w * 0.5); ctx.fill()
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, w / 30)
  for (let i = 0; i < 6; i++) { const gx = x - w / 2 + w * (0.1 + 0.16 * i) + 4 * Math.sin(seed + i); ctx.beginPath(); ctx.moveTo(gx, top); ctx.bezierCurveTo(gx + 6, top + (base - top) * 0.3, gx - 6, top + (base - top) * 0.6, gx + 3 * Math.sin(i), base - w * 0.4); ctx.stroke() }
  ctx.fillStyle = dark; ctx.fillRect(x + w * 0.2, top, w * 0.3, base - top - w * 0.5)
}
function fdTower(ctx, x, base, s) {   // the exam tower in the middle of the forest: a round red-brown tower, tiered roof
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s)
  ctx.fillStyle = "#6a4a3e"; ctx.fillRect(-40, -220, 80, 220); ctx.fillStyle = "#56382e"; ctx.fillRect(14, -220, 26, 220)
  ctx.fillStyle = "#2a1e18"; for (let r = 0; r < 5; r++) for (let i = -1; i <= 1; i++) ctx.fillRect(i * 22 - 5, -200 + r * 38, 10, 14)
  ctx.fillStyle = "#3a5a4a"; ctx.beginPath(); ctx.moveTo(-60, -220); ctx.lineTo(0, -270); ctx.lineTo(60, -220); ctx.fill()
  ctx.fillStyle = "#6a4a3e"; ctx.fillRect(-28, -300, 56, 50); ctx.fillStyle = "#3a5a4a"; ctx.beginPath(); ctx.moveTo(-42, -300); ctx.lineTo(0, -336); ctx.lineTo(42, -300); ctx.fill()
  ctx.restore()
}
function fdSnake(ctx, pts, r, t, eyes) {   // a giant snake body along points (purple-grey scales, pale belly)
  ctx.lineCap = "round"; ctx.lineJoin = "round"
  ctx.strokeStyle = "#3e3448"; ctx.lineWidth = r * 2; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke()
  ctx.strokeStyle = "#5e5270"; ctx.lineWidth = r * 1.3; ctx.stroke()
  ctx.strokeStyle = "rgba(30,24,36,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([r * 0.6, r * 0.5]); ctx.lineWidth = r * 1.6; ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([])
  if (eyes) { const [hx, hy] = pts[pts.length - 1], [px, py] = pts[pts.length - 2], a = Math.atan2(hy - py, hx - px)
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a)
    ctx.fillStyle = "#4a3e56"; ctx.beginPath(); ctx.ellipse(r * 0.6, 0, r * 1.6, r * 1.05, 0, 0, 7); ctx.fill()
    if (eyes > 1) { ctx.fillStyle = "#2a0a14"; ctx.beginPath(); ctx.moveTo(r * 0.4, 0); ctx.lineTo(r * 2.4, -r * 0.9); ctx.lineTo(r * 2.4, r * 0.9); ctx.fill()
      ctx.fillStyle = "#f2f0e0"; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 1.9, d * r * 0.8); ctx.lineTo(r * 2.2, d * r * 0.2); ctx.lineTo(r * 2.35, d * r * 0.8); ctx.fill() }
      ctx.strokeStyle = "#c83040"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 2.2, 0); ctx.lineTo(r * 3.4, Math.sin(t * 20) * 6); ctx.stroke() }
    ctx.fillStyle = "#e8d030"; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(r * 1.1, d * r * 0.55, r * 0.26, r * 0.18, 0, 0, 7); ctx.fill() }
    ctx.fillStyle = "#111"; for (const d of [-1, 1]) ctx.fillRect(r * 1.08, d * r * 0.55 - r * 0.15, 3, r * 0.3)
    ctx.restore() }
}

function drawForestSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = FD.geo = fdGeo(def, c, W, dockTop), S = def.S, m = FD.mist
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#0c1a0c"); g.addColorStop(0.55, m ? "#2a3a26" : "#2e4a26"); g.addColorStop(1, "#1a2a14")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const base = G.winBot
  // far misty trunks
  { const ps = shift(0.08, W), gap = 160; for (let i = Math.floor((padL - ps) / gap) - 1; i * gap + ps < padR + gap; i++) { const x = i * gap + ps + 50 * _h(i * 1.7); fdTrunk(ctx, x, coverTop, base, 34 + 20 * _h(i * 2.3), "#4a5e48", "#3e5040", i) } }
  ctx.fillStyle = "rgba(150,180,140,0.18)"; ctx.fillRect(padL, coverTop, padR - padL, base - coverTop)
  // the exam tower in the middle of the forest
  fdTower(ctx, W / 2 + shift(0.12, W) + 140, base - 10, S * 0.5)
  // the giant snake slithering between the trunks
  { const ps = shift(0.2, W), sp = 60, L = padR - padL + 1200; FD.snakeX = ((t * sp) % L)
    const hx = padL - 600 + FD.snakeX, pts = []; for (let i = 0; i < 26; i++) { const x = hx - i * 26 * S * 0.5 + ps * 0.2; pts.unshift([x, base - 30 * S - Math.sin((x - t * 40) / 70) * 16 * S]) }
    fdSnake(ctx, pts, 11 * S, t, 1) }
  // mid trunks
  { const ps = shift(0.22, W), gap = 300; for (let i = Math.floor((padL - ps) / gap) - 1; i * gap + ps < padR + gap; i++) { const x = i * gap + ps + 90 * _h(i * 3.1); fdTrunk(ctx, x, coverTop, base + 10, 60 + 40 * _h(i * 4.7), "#3a3224", "#2a2418", i * 2) } }
  // light shafts
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < 5; i++) { const x = padL + (padR - padL) * ((i * 0.23 + 0.1) % 1) + shift(0.3, W) * 0.3, a = (m ? 0.03 : 0.07) * (0.7 + 0.3 * Math.sin(t * 0.5 + i))
    ctx.fillStyle = m ? `rgba(170,120,200,${a})` : `rgba(230,230,150,${a})`; ctx.beginPath(); ctx.moveTo(x, coverTop); ctx.lineTo(x + 60, coverTop); ctx.lineTo(x + 260, base); ctx.lineTo(x + 140, base); ctx.fill() }
  ctx.restore()
  // the snake eyes in the dark when Orochimaru's chakra fills the forest
  if (m > 0.3) for (let i = 0; i < 9; i++) { const x = padL + (padR - padL) * ((i * 0.377 + 0.05) % 1), y = G.winTop + (base - G.winTop) * (0.2 + 0.6 * ((i * 0.61) % 1)), bl = Math.sin(t * 1.3 + i * 2) > -0.85
    if (bl) { ctx.fillStyle = `rgba(240,220,60,${(m - 0.3) * 1.2})`; for (const d of [-7, 7]) { ctx.beginPath(); ctx.ellipse(x + d, y, 4, 2.5, 0, 0, 7); ctx.fill() } } }
}
// the canopy, vines and sign hang IN FRONT of the hollow → drawn by the fx pass (before the fighters)
function forestFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), G = FD.geo || fdGeo(def, c, W, dockTop), S = def.S
  if (F[0] !== FD.p1) { Object.assign(FD, { p1: F[0], hp: new WeakMap(), leaves: null, lunges: [], mist: 0, strike: null, puffs: [], burst: [], shout: [] }); for (const k in FD.st) FD.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (FD.last || t))); FD.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + 8 * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = FD.hp.get(f); FD.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big && !FD.strike) { FD.st.lunges++; const side = fdRnd() < 0.5 ? -1 : 1; FD.lunges.push({ side, x: mid + side * (260 + fdRnd() * 120), t: 0 }); camera.shake?.(4, 14)
    if (FD.st.lunges % 2 === 1) fdShout(mid + side * 200, G.winTop - 20, ["A GIANT SNAKE?!", "WATCH OUT — IT'S HUGE!", "THIS FOREST IS CRAWLING WITH THEM!"][Math.floor(FD.st.lunges / 2) % 3], "#4a2a6a") }
  if (low && !FD.st.mist && !FD.strike) { FD.st.mist++; fdShout(mid, G.winTop - 60, "THIS CHAKRA… OROCHIMARU?!", "#5a1a6a") }
  if (FD.st.mist && !FD.strike) FD.mist = Math.min(1, FD.mist + dt * 0.8)
  if (ko && !FD.strike) { FD.strike = { t: 0, x: mid }; FD.st.strike++; fdShout(mid, G.winTop - 60, "SUMMONING JUTSU!!", "#4a2a6a") }
  // the Genin watching from the roots
  drawCrowd(ctx, FDC, { W, feet, sh: shift(0.9, W) })
  // the canopy + hanging vines above, in front of the hollow
  { const ps = shift(0.95, W), top = Math.min(G.y0 + 40 * S, dockTop - 420)
    for (let i = 0; i < 26; i++) { const x = padL + ((i * 97 + ps) % (padR - padL + 200) + (padR - padL + 200)) % (padR - padL + 200) - 100, y = top - 120 + 40 * _h(i * 2.9)
      ctx.fillStyle = ["#1a3014", "#24401a", "#142812"][i % 3]; ctx.beginPath(); ctx.ellipse(x, y, 90 + 40 * _h(i), 46 + 20 * _h(i * 5), 0, 0, 7); ctx.fill() }
    ctx.strokeStyle = "#2e4a1e"; ctx.lineWidth = 3
    for (let i = 0; i < 10; i++) { const x = padL + ((i * 173 + ps * 1.0) % (padR - padL + 100) + (padR - padL + 100)) % (padR - padL + 100) - 50, len = 140 + 160 * _h(i * 7.7), sw = Math.sin(t * 0.9 + i) * 8
      ctx.beginPath(); ctx.moveTo(x, top - 80); ctx.quadraticCurveTo(x + sw, top - 80 + len * 0.6, x + sw * 1.5, top - 80 + len); ctx.stroke()
      ctx.fillStyle = "#3e6a24"; for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.ellipse(x + sw * j / 3.5, top - 80 + len * j / 5, 6, 3, 0.6, 0, 7); ctx.fill() } } }
  // the no-entry fence sign by the roots (立入禁止 — the Forest of Death's gate)
  { const sx = G.X(40) , sy = feet - 70 * S * 0.6; ctx.save(); ctx.translate(sx, sy); ctx.scale(S * 0.6, S * 0.6)
    ctx.fillStyle = "#5a4a3a"; ctx.fillRect(-4, 0, 8, 70); ctx.fillStyle = "#e8e0c8"; ctx.fillRect(-40, -34, 80, 34); ctx.strokeStyle = "#8a2020"; ctx.lineWidth = 3; ctx.strokeRect(-40, -34, 80, 34)
    ctx.font = `900 16px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#8a2020"; ctx.fillText("立入禁止", 0, -16); ctx.restore() }
  // giant snakes lunging in through the openings
  for (const l of FD.lunges) { l.t += dt; const u = l.t < 0.45 ? l.t / 0.45 : Math.max(0, 1 - (l.t - 0.9) / 0.6), r = 26 * S * 0.6
    const ox = l.x + l.side * 260, oy = G.winTop + 50 * S, hx = ox - l.side * 260 * u, hy = oy + (feet - 90 - oy) * u, pts = []
    for (let i = 0; i <= 14; i++) { const k = i / 14; pts.push([ox + l.side * 300 * (1 - k) + (hx - ox) * k, oy - 40 + (hy - oy + 40) * k + Math.sin(k * 6 + t * 6) * 14 * (1 - k)]) }
    if (u > 0) fdSnake(ctx, pts, r, t, 2) }
  FD.lunges = FD.lunges.filter(l => l.t < 1.6)
  // KO: the giant snake strikes down from the canopy, then poofs away (a summoning)
  if (FD.strike) { const s = FD.strike; s.t += dt; const u = Math.min(1, s.t / 0.6), r = 44 * S * 0.6
    if (s.t < 1.4) { const pts = []; for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push([s.x - 300 + 300 * k + Math.sin(k * 5 + t * 4) * 30 * (1 - k), -60 + (feet - 140 + 60) * k * u]) } fdSnake(ctx, pts, r, t, 2) }
    if (s.t > 0.55 && !s.hit) { s.hit = true; camera.shake?.(14, 40) }
    if (s.t > 1.4 && !s.poof) { s.poof = true; for (let i = 0; i < 14; i++) FD.puffs.push({ x: s.x - 300 + 300 * (i / 13) + (fdRnd() - 0.5) * 60, y: (feet - 140) * (i / 13) + (fdRnd() - 0.5) * 40, r: 30 + fdRnd() * 40, t: 0 })
      for (let i = 0; i < 70; i++) FD.burst.push({ x: padL + (padR - padL) * fdRnd(), y: dockTop - 500 * fdRnd(), vx: (fdRnd() - 0.5) * 300, vy: -60 - fdRnd() * 160, life: 2.2, c: ["#3e6a24", "#6a8a2a", "#8a6a2a"][i % 3] }) }
    if (s.t > 1.6) FD.mist = Math.max(0, FD.mist - dt * 0.5) }
  for (const p of FD.puffs) { p.t += dt; const a = Math.max(0, 1 - p.t / 1.4); ctx.fillStyle = `rgba(235,235,235,${0.85 * a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.t), 0, 7); ctx.fill() }
  FD.puffs = FD.puffs.filter(p => p.t < 1.4)
  // falling leaves
  if (!FD.leaves) FD.leaves = Array.from({ length: 60 }, (_, i) => ({ x: padL + (padR - padL) * ((i * 0.137) % 1), y: dockTop - 600 + 800 * ((i * 0.611) % 1), v: 30 + 40 * ((i * 0.37) % 1), ph: i }))
  for (const lf of FD.leaves) { lf.y += lf.v * dt; lf.x += Math.sin(t + lf.ph) * 20 * dt; if (lf.y > coverBottom + 20) { lf.y = dockTop - 650; lf.x = padL + (padR - padL) * fdRnd() }
    ctx.save(); ctx.translate(lf.x, lf.y); ctx.rotate(Math.sin(t * 2 + lf.ph)); ctx.fillStyle = lf.ph % 3 ? "#4a7a2a" : "#8a7a2a"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, 7); ctx.fill(); ctx.restore() }
  for (const b of FD.burst) { b.life -= dt; b.vy += 120 * dt; b.x += b.vx * dt; b.y += b.vy * dt; ctx.fillStyle = b.c; ctx.globalAlpha = Math.min(1, b.life); ctx.beginPath(); ctx.ellipse(b.x, b.y, 6, 3, b.life * 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1 }
  FD.burst = FD.burst.filter(b => b.life > 0).slice(-300)
  // Orochimaru's mist
  if (FD.mist > 0) { for (let i = 0; i < 3; i++) { const y = feet - 40 - i * 90 + Math.sin(t * 0.7 + i) * 15, gr = ctx.createLinearGradient(0, y - 70, 0, y + 70); gr.addColorStop(0, "rgba(110,60,140,0)"); gr.addColorStop(0.5, `rgba(110,60,140,${0.3 * FD.mist})`); gr.addColorStop(1, "rgba(110,60,140,0)")
    ctx.fillStyle = gr; ctx.fillRect(padL, y - 70, padR - padL, 140) } }
  for (const s of FD.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  FD.shout = FD.shout.filter(s => s.t > 0)
}

// ───────────────────────────── HARBOR DOCK — the port comes alive (render-only, wall clock, own PRNG) ─────────────────────────────
// Ken's Stage (SFII) art as before; drawn in code on top of it: gulls wheeling over the sea, a container ship and a
// sailboat crossing the horizon, glints on the water, gulls perched on the bollards, dock workers (hard hats, hi-vis)
// at the barrels, a gantry crane swinging a container behind the moored ship. Big hit → a crate/barrel goes over the
// edge and SPLASHES, perched gulls scatter, a worker yells; ≤25% → a STORM: the sky goes dark, rain, wind, lightning,
// waves slap over the dock's edge; KO → a ship's horn ("BWOOOOMMM") and a huge wave bursts over the dock front, then the
// storm breaks — sun and a rainbow.
let _hbSeed = 0x3c6ef372 ^ 0xa54ff53a
const hbRnd = () => { _hbSeed ^= _hbSeed << 13; _hbSeed ^= _hbSeed >>> 17; _hbSeed ^= _hbSeed << 5; return (_hbSeed >>> 0) / 4294967296 }
const HB = { p1: null, last: 0, skyLast: 0, hp: new WeakMap(), gulls: null, perch: null, splashes: [], storm: 0, flash: 0, nextBolt: 0, wave: null, rainbow: 0, rain: null, spray: [], shout: [], workers: null,
  st: { splashes: 0, storm: 0, wave: 0, bolts: 0 } }
export const harborState = () => ({ ...HB.st, gulls: (HB.gulls || []).length, perched: (HB.perch || []).filter(g => !g.fly).length, storm: +HB.storm.toFixed(2), rainbow: +HB.rainbow.toFixed(2),
  wave: HB.wave ? +HB.wave.t.toFixed(2) : 0, shouting: HB.shout.filter(s => s.t > 0).map(s => s.txt) })
function hbShout(x, y, txt, col) { if (HB.shout.filter(s => s.t > 0).length < 3) HB.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function hbGull(ctx, x, y, s, ph) {   // a gull in flight: a white body + flapping wings
  const f = Math.sin(ph) * 0.7; ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  ctx.strokeStyle = "#f4f4f0"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-11, -5 * f); ctx.quadraticCurveTo(-5, -6 - 4 * f, 0, 0); ctx.quadraticCurveTo(5, -6 - 4 * f, 11, -5 * f); ctx.stroke()
  ctx.strokeStyle = "#555"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-11, -5 * f); ctx.lineTo(-8, -4 * f - 1); ctx.moveTo(11, -5 * f); ctx.lineTo(8, -4 * f - 1); ctx.stroke(); ctx.restore()
}
function hbPerched(ctx, x, y, s, dir, t, seed) {   // a gull standing (bobbing its head)
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s)
  ctx.fillStyle = "#e8a020"; ctx.fillRect(-2, -4, 1.5, 4); ctx.fillRect(1, -4, 1.5, 4)
  ctx.fillStyle = "#f4f4f0"; ctx.beginPath(); ctx.ellipse(0, -9, 7, 5, -0.15, 0, 7); ctx.fill()
  ctx.fillStyle = "#9aa0a8"; ctx.beginPath(); ctx.ellipse(-2, -10, 6, 3.5, -0.2, 0, 7); ctx.fill()
  const nb = Math.sin(t * 3 + seed) > 0.6 ? 1.5 : 0; ctx.fillStyle = "#f4f4f0"; ctx.beginPath(); ctx.arc(6, -15 + nb, 3.6, 0, 7); ctx.fill()
  ctx.fillStyle = "#e8b020"; ctx.beginPath(); ctx.moveTo(9, -15 + nb); ctx.lineTo(13, -14 + nb); ctx.lineTo(9, -13.5 + nb); ctx.fill(); ctx.fillStyle = "#111"; ctx.fillRect(6.5, -16 + nb, 1.3, 1.3); ctx.restore()
}
function hbWorker(ctx, w, x, y, s, t) {   // a dock worker: hard hat, hi-vis vest; idle / pointing / waving his arms
  ctx.save(); ctx.translate(x, y); ctx.scale(s * w.dir, s)
  const wave = w.yell > 0 ? Math.sin(t * 14) * 0.9 : 0
  ctx.fillStyle = "#2a3448"; ctx.fillRect(-6, -24, 5, 24); ctx.fillRect(1, -24, 5, 24); ctx.fillStyle = "#222"; ctx.fillRect(-7, -3, 7, 3); ctx.fillRect(1, -3, 7, 3)
  ctx.fillStyle = w.shirt; ctx.fillRect(-8, -48, 16, 25); ctx.fillStyle = "#f07a1a"; ctx.fillRect(-8, -48, 5, 25); ctx.fillRect(3, -48, 5, 25); ctx.fillStyle = "#e8f0a0"; ctx.fillRect(-8, -36, 16, 2.5)
  ctx.strokeStyle = w.skin; ctx.lineWidth = 4; ctx.lineCap = "round"
  ctx.beginPath(); ctx.moveTo(7, -45); ctx.lineTo(w.yell > 0 ? 14 : 9, w.yell > 0 ? -62 - 6 * wave : -26); ctx.moveTo(-7, -45); ctx.lineTo(w.yell > 0 ? -13 : -9, w.yell > 0 ? -60 + 6 * wave : -26); ctx.stroke()
  ctx.fillStyle = w.skin; ctx.beginPath(); ctx.arc(0, -55, 7, 0, 7); ctx.fill()
  ctx.fillStyle = "#f2c40a"; ctx.beginPath(); ctx.ellipse(0, -60, 9, 5, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-10, -60, 20, 2)
  ctx.restore()
}
function hbShip(ctx, x, y, s) {   // a container ship on the horizon (silhouette with coloured boxes)
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  ctx.fillStyle = "#2a3446"; ctx.beginPath(); ctx.moveTo(-120, -14); ctx.lineTo(118, -14); ctx.lineTo(104, 0); ctx.lineTo(-110, 0); ctx.fill()
  const C = ["#b8442e", "#2e6ab8", "#d8a030", "#3a8a4a", "#8a3a8a"]; for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = C[(i * 3 + j) % 5]; ctx.fillRect(-100 + i * 20, -24 - j * 9, 18, 8) }
  ctx.fillStyle = "#e8e8e0"; ctx.fillRect(86, -40, 20, 26); ctx.fillStyle = "#2a3446"; ctx.fillRect(88, -36, 16, 3); ctx.fillStyle = "#c83a2a"; ctx.fillRect(94, -50, 6, 10)
  ctx.restore()
}
function hbSail(ctx, x, y, s, t) { ctx.save(); ctx.translate(x, y + Math.sin(t * 1.4) * 1.5); ctx.scale(s, s)
  ctx.fillStyle = "#f4f4ee"; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -46); ctx.lineTo(22, -6); ctx.fill(); ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(-2, -38); ctx.lineTo(-16, -8); ctx.fill()
  ctx.fillStyle = "#8a2a2a"; ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(24, -4); ctx.lineTo(18, 2); ctx.lineTo(-16, 2); ctx.fill(); ctx.restore() }
function hbCrane(ctx, x, base, s, t) {   // a gantry crane, the trolley + a container on cables swinging
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s)
  ctx.strokeStyle = "#c84a2a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-40, -210); ctx.moveTo(40, 0); ctx.lineTo(40, -210); ctx.moveTo(-90, -210); ctx.lineTo(160, -210); ctx.stroke()
  ctx.lineWidth = 2.5; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-40, -i * 35); ctx.lineTo(40, -(i + 1) * 35); ctx.moveTo(40, -i * 35); ctx.lineTo(-40, -(i + 1) * 35); ctx.stroke() }
  const tr = 40 + 60 * (0.5 + 0.5 * Math.sin(t * 0.25)), sw = Math.sin(t * 1.1) * 0.06, L = 90
  ctx.fillStyle = "#333"; ctx.fillRect(tr - 10, -216, 20, 10); ctx.strokeStyle = "#222"; ctx.lineWidth = 1.5
  const cx = tr + Math.sin(sw) * L, cy = -206 + Math.cos(sw) * L; ctx.beginPath(); ctx.moveTo(tr - 6, -206); ctx.lineTo(cx - 14, cy); ctx.moveTo(tr + 6, -206); ctx.lineTo(cx + 14, cy); ctx.stroke()
  ctx.fillStyle = "#2e6ab8"; ctx.fillRect(cx - 26, cy, 52, 22); ctx.strokeStyle = "rgba(0,0,0,0.3)"; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - 26 + i * 8.6, cy); ctx.lineTo(cx - 26 + i * 8.6, cy + 22); ctx.stroke() }
  ctx.restore()
}

// behind the moored ship, in front of the sky art
function drawHarborSea(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S, hz = dockTop + 2 * S - 62 * S, st = HB.storm
  const dt = Math.min(0.05, Math.max(0, t - (HB.skyLast || t))); HB.skyLast = t
  // the storm darkens the sky + the far sea
  if (st > 0) { const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, `rgba(30,34,46,${0.85 * st})`); g.addColorStop(0.6, `rgba(50,58,72,${0.65 * st})`); g.addColorStop(1, `rgba(20,30,44,${0.5 * st})`)
    ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
    for (let i = 0; i < 9; i++) { const x = padL + ((i * 190 + t * 30 + shift(0.2, W)) % (padR - padL + 300)) - 150, y = coverTop + 40 + 50 * _h(i * 3.3)
      ctx.fillStyle = `rgba(52,56,68,${0.9 * st})`; ctx.beginPath(); ctx.ellipse(x, y, 160, 46, 0, 0, 7); ctx.ellipse(x + 90, y + 20, 120, 40, 0, 0, 7); ctx.fill() } }
  if (HB.flash > 0) { HB.flash = Math.max(0, HB.flash - dt * 4); ctx.fillStyle = `rgba(230,236,255,${0.55 * HB.flash})`; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
    if (HB.bolt) { ctx.strokeStyle = `rgba(250,250,255,${HB.flash})`; ctx.lineWidth = 3; ctx.beginPath(); HB.bolt.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke() } }
  // a rainbow after the storm
  if (HB.rainbow > 0) { ctx.save(); ctx.globalAlpha = 0.35 * HB.rainbow; const cx = W / 2 + shift(0.1, W) + 300, R = 520
    ;["#e84a4a", "#f0a030", "#f0e040", "#50c050", "#4a80e0", "#8a50c8"].forEach((col, i) => { ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, hz + 20, R - i * 12, Math.PI, 0); ctx.stroke() }); ctx.restore() }
  // ships on the horizon
  { const ps = shift(0.3, W), span = padR - padL + 800, x = padL - 400 + ((t * 9 + ps) % span + span) % span; hbShip(ctx, x, hz + 2, S * 0.55) }
  { const ps = shift(0.34, W), span = padR - padL + 400, x = padR + 200 - ((t * 16 - ps) % span + span) % span; hbSail(ctx, x, hz + 10, S * 0.6, t) }
  // the gantry crane behind the moored ship
  hbCrane(ctx, W / 2 + shift(0.5, W) - 760, dockTop + 4 * S, S * 0.9, t)
  // glints on the water
  if (st < 0.5) for (let i = 0; i < 26; i++) { const x = padL + (padR - padL) * ((i * 0.377 + shift(0.5, W) / 2000) % 1 + 1) % 1, y = hz + 8 + (dockTop - hz - 10) * ((i * 0.53) % 1), a = Math.max(0, Math.sin(t * 2.2 + i * 1.7)) * (1 - st * 2)
    ctx.fillStyle = `rgba(255,255,255,${0.7 * a})`; ctx.fillRect(x, y, 8, 1.6) }
  // gulls wheeling
  if (!HB.gulls) HB.gulls = Array.from({ length: 7 }, (_, i) => ({ cx: padL + (padR - padL) * (0.1 + 0.13 * i), cy: coverTop + 90 + 50 * _h(i * 4.1), r: 40 + 50 * _h(i * 2.2), w: 0.3 + 0.3 * _h(i * 7.3), ph: i }))
  for (const g of HB.gulls) { const a = t * g.w + g.ph, x = g.cx + Math.cos(a) * g.r * 1.6 + Math.sin(t * 0.1 + g.ph) * 60, y = g.cy + Math.sin(a) * g.r * 0.4 + st * 40; hbGull(ctx, x, y, S * 0.6, t * 7 + g.ph) }
}

function harborFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S
  if (F[0] !== HB.p1) { Object.assign(HB, { p1: F[0], hp: new WeakMap(), perch: null, splashes: [], storm: 0, flash: 0, nextBolt: 0, wave: null, rainbow: 0, spray: [], shout: [], workers: null }); for (const k in HB.st) HB.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (HB.last || t))); HB.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2
  const feet = dockTop + def.standRow * S, edge = dockTop + def.deckFrontRow * S, back = dockTop + 4 * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = HB.hp.get(f); HB.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  // perched gulls on the bollards (front lip) + on the barrels
  if (!HB.perch) HB.perch = [0.04, 0.36, 0.64, 0.96, 0.12, 0.9].map((fx, i) => ({ x: W * fx + (i > 3 ? (i === 4 ? 30 : -30) : 0), y: i > 3 ? back + 20 * S - 96 * S + 10 : edge + 4 * S - (i % 3 === 0 ? 24 : 16) * S, dir: i % 2 ? -1 : 1, fly: 0, vx: 0, vy: 0, seed: i }))
  // dock workers by the barrels
  if (!HB.workers) HB.workers = [{ x: W * 0.12 + 150, dir: -1, shirt: "#3a5a8a", skin: "#c89870", yell: 0 }, { x: W * 0.9 - 160, dir: 1, shirt: "#5a5a5a", skin: "#7a5038", yell: 0 }]
  if (big && !HB.wave) { HB.st.splashes++; const x = Math.max(padL + 60, Math.min(padR - 60, mid + (hbRnd() < 0.5 ? -1 : 1) * (120 + hbRnd() * 200)))
    HB.splashes.push({ x, t: 0, kind: HB.st.splashes % 2 ? "crate" : "barrel" }); camera.shake?.(4, 12)
    for (const g of HB.perch) if (!g.fly && Math.abs(g.x - mid) < 900) { g.fly = 1; g.vx = (g.x < mid ? -1 : 1) * (120 + 80 * hbRnd()); g.vy = -160 - 60 * hbRnd() }
    const w = HB.workers.reduce((a, b) => Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b); w.yell = 1.6
    hbShout(w.x, feet - 150, ["HEY! THAT'S MY CARGO!", "MAN OVERBOARD— er, CRATE OVERBOARD!", "TAKE IT OFF THE DOCK!"][Math.floor(HB.st.splashes / 1) % 3], "#1a3a6a") }
  if (low && !HB.st.storm && !HB.wave) { HB.st.storm++; hbShout(mid, feet - 220, "STORM'S COMING IN — TIE EVERYTHING DOWN!", "#1a3a6a"); for (const w of HB.workers) w.yell = 2 }
  if (HB.st.storm && !HB.wave) HB.storm = Math.min(1, HB.storm + dt * 0.7)
  if (HB.storm > 0.6 && !HB.wave && t > HB.nextBolt) { HB.nextBolt = t + 1.2 + hbRnd() * 2; HB.flash = 1; HB.st.bolts++
    let x = padL + (padR - padL) * hbRnd(), y = dockTop - 600; HB.bolt = [[x, y]]; while (y < dockTop - 150) { x += (hbRnd() - 0.5) * 60; y += 30 + hbRnd() * 30; HB.bolt.push([x, y]) } }
  if (ko && !HB.wave) { HB.wave = { t: 0, x: mid }; HB.st.wave++; hbShout(mid, feet - 260, "BWOOOOOOMMM!!", "#8a2a1a"); camera.shake?.(8, 40) }
  if (HB.wave) { HB.wave.t += dt; if (HB.wave.t > 0.9 && !HB.wave.hit) { HB.wave.hit = true; camera.shake?.(14, 30)
      for (let i = 0; i < 120; i++) HB.spray.push({ x: padL + (padR - padL) * hbRnd(), y: edge, vx: (hbRnd() - 0.5) * 300, vy: -300 - hbRnd() * 500, life: 1.6 })
      for (const g of HB.perch) if (!g.fly) { g.fly = 1; g.vx = (hbRnd() - 0.5) * 300; g.vy = -200 } }
    if (HB.wave.t > 2) { HB.storm = Math.max(0, HB.storm - dt * 0.6); if (HB.st.storm || HB.storm < 0.5) HB.rainbow = Math.min(1, HB.rainbow + dt * 0.5) } }
  // the workers + gulls
  for (const w of HB.workers) { w.yell = Math.max(0, w.yell - dt); hbWorker(ctx, w, w.x, feet - 8 * S, S * 0.95, t) }
  for (const g of HB.perch) {
    if (g.fly) { g.fly += dt; g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 20 * dt; if (g.fly < 8) hbGull(ctx, g.x, g.y, S * 0.6, t * 14 + g.seed)
      if (g.fly > 6 && !HB.wave && HB.storm < 0.2) { g.fly = 0; g.x = W * [0.04, 0.36, 0.64, 0.96, 0.12, 0.9][g.seed] + (g.seed > 3 ? (g.seed === 4 ? 30 : -30) : 0); g.y = g.seed > 3 ? back + 20 * S - 96 * S + 10 : edge + 4 * S - (g.seed % 3 === 0 ? 24 : 16) * S } }
    else hbPerched(ctx, g.x, g.y, S * 0.75, g.dir, t, g.seed) }
  // crates / barrels going over the edge and splashing
  for (const s of HB.splashes) { s.t += dt; const u = Math.min(1, s.t / 0.5)
    if (s.t < 0.5) { const y = feet - 30 + (edge + 60 - feet + 30) * u * u, x = s.x + 40 * u; ctx.save(); ctx.translate(x, y); ctx.rotate(u * 2.4)
      if (s.kind === "crate") { ctx.fillStyle = "#b8864a"; ctx.fillRect(-18, -18, 36, 36); ctx.strokeStyle = "#7a5228"; ctx.lineWidth = 3; ctx.strokeRect(-18, -18, 36, 36); ctx.beginPath(); ctx.moveTo(-18, -18); ctx.lineTo(18, 18); ctx.stroke() }
      else { ctx.fillStyle = "#8a4a22"; ctx.fillRect(-15, -22, 30, 44); ctx.fillStyle = "#4a3020"; ctx.fillRect(-15, -12, 30, 4); ctx.fillRect(-15, 8, 30, 4) } ctx.restore() }
    else { if (!s.boom) { s.boom = true; for (let i = 0; i < 30; i++) HB.spray.push({ x: s.x + 40 + (hbRnd() - 0.5) * 50, y: edge + 30, vx: (hbRnd() - 0.5) * 220, vy: -220 - hbRnd() * 260, life: 1 }) }
      const k = (s.t - 0.5) / 1.2; ctx.strokeStyle = `rgba(230,240,255,${Math.max(0, 0.8 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x + 40, edge + 34, 20 + 80 * k, 6 + 14 * k, 0, 0, 7); ctx.stroke() } }
  HB.splashes = HB.splashes.filter(s => s.t < 1.7)
  // waves slapping over the dock edge in the storm; THE wave on the KO
  if (HB.storm > 0.3) for (let i = 0; i < 4; i++) { const ph = (t * 0.6 + i * 0.25) % 1, x = padL + (padR - padL) * ((i * 0.31 + 0.12) % 1), h = Math.max(0, Math.sin(ph * Math.PI)) * 50 * HB.storm
    if (h > 2) { ctx.fillStyle = "rgba(220,236,250,0.8)"; ctx.beginPath(); ctx.moveTo(x - 60, edge + 10); ctx.quadraticCurveTo(x, edge + 10 - h * 2, x + 60, edge + 10); ctx.fill() } }
  if (HB.wave && HB.wave.t < 2.2) { const k = HB.wave.t, h = k < 0.9 ? (k / 0.9) * 420 : Math.max(0, 420 - (k - 0.9) * 340), sx = shift(1.1, W)
    const g = ctx.createLinearGradient(0, edge - h, 0, edge + 20); g.addColorStop(0, "rgba(240,248,255,0.95)"); g.addColorStop(0.25, "rgba(60,110,170,0.9)"); g.addColorStop(1, "rgba(20,50,90,0.9)")
    const crest = x => edge - h * (0.9 + 0.06 * Math.sin((x - sx) / 140 + k * 3) + 0.04 * Math.sin((x - sx) / 37 + k * 7))
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(padL, edge + 20); for (let x = padL; x <= padR + 20; x += 20) ctx.lineTo(x, crest(x)); ctx.lineTo(padR, edge + 20); ctx.fill()
    ctx.fillStyle = "rgba(250,252,255,0.95)"; ctx.beginPath(); for (let x = padL; x <= padR + 20; x += 20) ctx.lineTo(x, crest(x) + 4); for (let x = padR + 20; x >= padL; x -= 20) ctx.lineTo(x, crest(x) - 10 - 8 * Math.abs(Math.sin(x / 23 + k * 9))); ctx.fill()   // the foam lip
    ctx.strokeStyle = "rgba(200,225,245,0.5)"; ctx.lineWidth = 3; for (let j = 1; j < 4; j++) { ctx.beginPath(); for (let x = padL; x <= padR + 20; x += 20) ctx.lineTo(x, crest(x) + h * j * 0.2 + 6 * Math.sin(x / 60 + j + k * 5)); ctx.stroke() } }
  for (const p of HB.spray) { p.life -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = `rgba(225,240,255,${Math.min(1, p.life)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill() }
  HB.spray = HB.spray.filter(p => p.life > 0).slice(-500)
  // rain
  if (HB.storm > 0.05) { if (!HB.rain) HB.rain = Array.from({ length: 160 }, (_, i) => ({ x: (i * 0.137) % 1, y: (i * 0.611) % 1, v: 0.8 + 0.4 * ((i * 0.37) % 1) }))
    ctx.strokeStyle = `rgba(200,215,235,${0.5 * HB.storm})`; ctx.lineWidth = 1.2; ctx.beginPath()
    for (const r of HB.rain) { r.y = (r.y + r.v * dt * 1.6) % 1; r.x = (r.x + dt * 0.12) % 1; const x = padL + (padR - padL) * r.x, y = dockTop - 600 + (coverBottom - dockTop + 600) * r.y; ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 18) } ctx.stroke() }
  for (const s of HB.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  HB.shout = HB.shout.filter(s => s.t > 0)
}

// ───────────────────────────── QUEENS ALLEY, NEW YORK (Marvel / Spider-Man; render-only, wall clock, own PRNG) ─────────────────────────────
// Alex's stage (SFIII) pieces — the graffiti walk-up with the fire escape, the tan corner building, the far street — set
// in a row with more walk-ups drawn in code on both sides (brick + brownstone, fire escapes, lit windows, water towers),
// so no art edge ever shows. Twilight sky, the Manhattan skyline, a yellow cab crossing the far street, steam from a
// manhole, snow falling; Spider-Man swings across the sky now and then; he (or Soldier Boy) watches if not fighting.
// Big hit → a window flies open and a New Yorker yells, a trash-can lid rolls; ≤25% → NYPD: red/blue lights wash the
// walls, "BREAK IT UP!", Daily Bugle pages blow through; KO → THWIP! webs shoot in from the rooftops and a web net is
// strung across the alley, a camera flash — SNAP!
let _qnSeed = 0x9b05688c ^ 0x510e527f
const qnRnd = () => { _qnSeed ^= _qnSeed << 13; _qnSeed ^= _qnSeed >>> 17; _qnSeed ^= _qnSeed << 5; return (_qnSeed >>> 0) / 4294967296 }
const QN_CROWD = [["spiderman", 0.2, 0], ["soldier_boy", 0.82, 0]]
const QNC = makeCrowd(QN_CROWD, 0.6)
const QN = { p1: null, last: 0, skyLast: 0, hp: new WeakMap(), snow: null, steam: [], yells: [], lids: [], cops: 0, pages: [], webs: null, flash: 0, swing: null, nextSwing: 3, shout: [], geo: null,
  st: { yells: 0, cops: 0, webs: 0, swings: 0 } }
export const queensState = () => ({ ...QN.st, snow: (QN.snow || []).length, cops: +QN.cops.toFixed(2), webs: QN.webs ? +QN.webs.t.toFixed(2) : 0, pages: QN.pages.length,
  crowd: crowdState(QNC), shouting: QN.shout.filter(s => s.t > 0).map(s => s.txt) })
function qnGeo(def, c, W, dockTop) {
  const P = c.layout.pieces, S = def.S, x0 = W / 2 - 428 * S + shift(0.9, W)
  return { S, x0, al: [x0, x0 + P.alley.w * S], rt: [x0 + 704 * S, x0 + 704 * S + P.right.w * S], h: P.alley.h * S, top: dockTop - P.alley.h * S }
}
function qnShout(x, y, txt, col) { if (QN.shout.filter(s => s.t > 0).length < 3) QN.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function qnWalkup(ctx, x, w, base, h, k, t, open) {   // an NYC walk-up: brick or brownstone, cornice, windows (some lit), fire escape, water tower
  const pal = [["#8a4a36", "#6a3426"], ["#6a4a3a", "#523628"], ["#9a7a5a", "#7a5a40"], ["#7a3a2e", "#5a2a22"]][Math.floor(_h(k * 3.1) * 4)]
  const top = base - h
  ctx.fillStyle = pal[0]; ctx.fillRect(x, top, w, h); ctx.fillStyle = pal[1]; ctx.fillRect(x + w - 10, top, 10, h)
  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1; for (let y = top + 6; y < base; y += 7) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke() }
  ctx.fillStyle = "#3a2a24"; ctx.fillRect(x - 4, top - 8, w + 8, 10); ctx.fillStyle = "#5a4a40"; for (let i = 0; i < w; i += 12) ctx.fillRect(x + i, top + 2, 6, 5)
  const cols = Math.max(2, Math.floor(w / 46)), rows = Math.max(2, Math.floor((h - 60) / 62))
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) { const wx = x + 14 + i * (w - 28) / cols, wy = top + 26 + r * 62, ww = (w - 28) / cols - 14, sd = k * 31 + r * 7 + i
    const lit = _h(sd) < 0.45, op = open && open.r === r && open.i === i && open.k === k
    ctx.fillStyle = "#c8b8a0"; ctx.fillRect(wx - 3, wy - 5, ww + 6, 5); ctx.fillRect(wx - 3, wy + 38, ww + 6, 4)
    ctx.fillStyle = op ? "#1a1418" : lit ? `rgba(250,${200 + 30 * _h(sd * 2) | 0},120,${0.85 + 0.1 * Math.sin(t + sd)})` : "#2a2a3a"; ctx.fillRect(wx, wy, ww, 38)
    if (!op) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(wx + ww / 2 - 1, wy, 2, 38); ctx.fillRect(wx, wy + 18, ww, 2) } }
  if (_h(k * 5.7) < 0.6 && cols >= 2) { ctx.strokeStyle = "#1e1a1c"; ctx.lineWidth = 2; const fx = x + 8, fw = (w - 28) / cols * Math.min(2, cols) + 8
    for (let r = 0; r < rows; r++) { const fy = top + 26 + r * 62 + 42; ctx.strokeRect(fx, fy, fw, 2); for (let j = 0; j < fw; j += 6) { ctx.beginPath(); ctx.moveTo(fx + j, fy); ctx.lineTo(fx + j, fy - 14); ctx.stroke() }
      ctx.beginPath(); ctx.moveTo(fx + fw * 0.2, fy); ctx.lineTo(fx + fw * 0.7, fy + 60); ctx.stroke() } }
  if (_h(k * 8.3) < 0.55) { const tx = x + w * (0.3 + 0.4 * _h(k)), ty = top - 8; ctx.strokeStyle = "#2a2220"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.lineTo(tx - 10, ty - 22); ctx.moveTo(tx + 14, ty); ctx.lineTo(tx + 10, ty - 22); ctx.stroke()
    ctx.fillStyle = "#6a4a32"; ctx.fillRect(tx - 16, ty - 52, 32, 30); ctx.fillStyle = "#3a2a20"; ctx.beginPath(); ctx.moveTo(tx - 18, ty - 52); ctx.lineTo(tx, ty - 68); ctx.lineTo(tx + 18, ty - 52); ctx.fill() }
}
function qnSpidey(ctx, x, y, s, a) {   // a small Spider-Man silhouette (red + blue), swinging
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s)
  ctx.fillStyle = "#2a4ab8"; ctx.fillRect(-4, 4, 3, 12); ctx.fillRect(1, 4, 3, 10); ctx.fillStyle = "#d02a2a"; ctx.fillRect(-5, -10, 10, 15); ctx.beginPath(); ctx.arc(0, -14, 5, 0, 7); ctx.fill()
  ctx.strokeStyle = "#d02a2a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-2, -26); ctx.moveTo(4, -8); ctx.lineTo(9, 0); ctx.stroke()
  ctx.fillStyle = "#fff"; ctx.fillRect(-3.5, -16, 2.5, 2); ctx.fillRect(1, -16, 2.5, 2); ctx.restore()
}
function drawQueensBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S, G = QN.geo = qnGeo(def, c, W, dockTop), P = c.layout.pieces, cop = QN.cops
  const dt = Math.min(0.05, Math.max(0, t - (QN.skyLast || t))); QN.skyLast = t
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#2a2460"); g.addColorStop(0.5, "#6a5ab8"); g.addColorStop(1, "#c89ab8")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  // the Manhattan skyline across the river
  { const ps = shift(0.12, W), hz = dockTop - 260 * S, gap = 70; ctx.fillStyle = "#3a3460"
    for (let i = Math.floor((padL - ps) / gap) - 1; i * gap + ps < padR + gap; i++) { const x = i * gap + ps, h = 80 + 220 * _h(i * 1.31) ** 2, w = 40 + 26 * _h(i * 2.7)
      ctx.fillRect(x, hz - h, w, h + 400); if (_h(i * 9.1) < 0.2) { ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, hz - h); ctx.lineTo(x + w / 2, hz - h - 60); ctx.lineTo(x + w / 2 + 6, hz - h); ctx.fill() }
      ctx.fillStyle = "rgba(250,220,140,0.5)"; for (let j = 0; j < 14; j++) if (_h(i * 13 + j) < 0.4) ctx.fillRect(x + 4 + (j % 3) * (w / 3), hz - h + 10 + Math.floor(j / 3) * 18, 4, 6); ctx.fillStyle = "#3a3460" } }
  // Spider-Man swinging across the sky every so often
  if (!QN.swing && t > QN.nextSwing) { QN.swing = { t: 0, dir: qnRnd() < 0.5 ? 1 : -1, y: dockTop - (330 + 80 * qnRnd()) * S }; QN.st.swings++ }
  if (QN.swing) { const s = QN.swing; s.t += dt; const u = s.t / 3.2, span = padR - padL + 300, ax = s.dir > 0 ? padL - 150 + span * u : padR + 150 - span * u
    const k = (u * 3) % 1, px = ax, py = s.y + Math.sin(k * Math.PI) * 70, anchorX = ax + s.dir * (60 - 120 * k), anchorY = s.y - 200
    ctx.strokeStyle = "rgba(240,240,250,0.8)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(anchorX, anchorY); ctx.lineTo(px, py - 10); ctx.stroke(); qnSpidey(ctx, px, py, S * 0.55, s.dir * (0.6 - 1.2 * k))
    if (u >= 1) { QN.swing = null; QN.nextSwing = t + 6 + 6 * qnRnd() } }
  // the far street through the gap (with a cab going by)
  const fi = c.img[P.far.file]; if (ready(fi)) ctx.drawImage(fi, G.x0 + 690 * S - shift(0.9, W) + shift(0.7, W), dockTop - P.far.h * S + 40 * S, P.far.w * S, P.far.h * S)
  { const cx = G.al[1] + ((t * 90) % (G.rt[0] - G.al[1] + 120)) - 60, cy = dockTop - 26 * S; ctx.fillStyle = "#f2c020"; ctx.fillRect(cx, cy, 34 * S * 0.5, 9 * S * 0.5); ctx.fillRect(cx + 6, cy - 5 * S * 0.5, 18 * S * 0.5, 5 * S * 0.5); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(cx + 6, cy + 9 * S * 0.5, 3, 0, 7); ctx.arc(cx + 28 * S * 0.5, cy + 9 * S * 0.5, 3, 0, 7); ctx.fill() }
  // walk-ups on both sides, out past the view
  const op = QN.open
  for (let i = 0; ; i++) { const w = 230 + 60 * _h(i * 4.3), x = G.al[0] - (i + 1) * 250 - (i ? 0 : 0); if (x + w < padL) break; qnWalkup(ctx, G.al[0] - (i + 1) * 250, 250, dockTop, (330 + 110 * _h(i * 2.9)) * S * 0.8, -i - 1, t, op) }
  for (let i = 0; ; i++) { const x = G.rt[1] + i * 250; if (x > padR) break; qnWalkup(ctx, x, 250, dockTop, (330 + 110 * _h(i * 6.1)) * S * 0.8, i + 1, t, op) }
  // the sheet's buildings
  const ai = c.img[P.alley.file], ri = c.img[P.right.file]
  if (ready(ai)) ctx.drawImage(ai, G.al[0], G.top, P.alley.w * S, P.alley.h * S)
  if (ready(ri)) ctx.drawImage(ri, G.rt[0], G.top, P.right.w * S, P.right.h * S)
  // NYPD lights washing the walls
  if (cop > 0) { const ph = Math.floor(t * 6) % 2; ctx.fillStyle = ph ? `rgba(230,40,40,${0.22 * cop})` : `rgba(40,80,240,${0.22 * cop})`; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop) }
}
function queensFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S, G = QN.geo || qnGeo(def, c, W, dockTop)
  if (F[0] !== QN.p1) { Object.assign(QN, { p1: F[0], hp: new WeakMap(), steam: [], yells: [], lids: [], cops: 0, pages: [], webs: null, flash: 0, shout: [], open: null }); for (const k in QN.st) QN.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (QN.last || t))); QN.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + def.standRow * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = QN.hp.get(f); QN.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big && !QN.webs) { QN.st.yells++; const side = mid < W / 2 ? 1 : -1, k = side > 0 ? 1 : -1, x = side > 0 ? G.rt[1] + 60 : G.al[0] - 190
    QN.open = { k, r: 1, i: 1 }; QN.openT = 2.2; qnShout(x + 70, dockTop - 330 * S * 0.8 + 100, ["HEY! I'M WALKIN' HERE!", "SOME OF US WORK IN THE MORNIN'!", "TAKE IT TO JERSEY!"][(QN.st.yells - 1) % 3], "#8a2a1a")
    QN.lids.push({ x: mid + (qnRnd() - 0.5) * 300, t: 0, dir: qnRnd() < 0.5 ? -1 : 1 }); camera.shake?.(3, 10) }
  if (QN.openT > 0) { QN.openT -= dt; if (QN.openT <= 0) QN.open = null }
  if (low && !QN.st.cops && !QN.webs) { QN.st.cops++; qnShout(mid, feet - 230, "NYPD! BREAK IT UP!", "#1a3aa8"); for (let i = 0; i < 6; i++) QN.pages.push({ x: padL - 40 - i * 90, y: feet - 60 - qnRnd() * 200, ph: i * 1.3 }) }
  if (QN.st.cops && !QN.webs) QN.cops = Math.min(1, QN.cops + dt * 0.8)
  if (ko && !QN.webs) { QN.webs = { t: 0, x: mid }; QN.st.webs++; qnShout(mid, feet - 260, "THWIP!", "#c82a2a") }
  // Spider-Man / Soldier Boy watching (fighters left out)
  drawCrowd(ctx, QNC, { W, feet, sh: shift(0.9, W) })
  // steam from a manhole
  { const mx = W / 2 + shift(1, W) - 220, my = feet + 22 * S; ctx.fillStyle = "#3a3438"; ctx.beginPath(); ctx.ellipse(mx, my, 26, 7, 0, 0, 7); ctx.fill()
    if (QN.steam.length < 26 && qnRnd() < 0.4) QN.steam.push({ x: mx + (qnRnd() - 0.5) * 20, y: my, r: 8, a: 0.4 })
    for (const s of QN.steam) { s.y -= 40 * dt; s.x += Math.sin(t + s.r) * 10 * dt; s.r += 14 * dt; s.a -= 0.13 * dt; ctx.fillStyle = `rgba(230,230,240,${Math.max(0, s.a)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill() }
    QN.steam = QN.steam.filter(s => s.a > 0) }
  // trash-can lids rolling
  for (const l of QN.lids) { l.t += dt; const x = l.x + l.dir * 200 * l.t, y = feet - 10 - Math.abs(Math.sin(l.t * 8)) * 30 * Math.max(0, 1 - l.t)
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(l.t * 9), 1); ctx.fillStyle = "#8a8e96"; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); ctx.strokeStyle = "#5a5e66"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore() }
  QN.lids = QN.lids.filter(l => l.t < 2.5)
  // Daily Bugle pages blowing through
  for (const p of QN.pages) { p.x += 160 * dt; p.y += Math.sin(t * 3 + p.ph) * 40 * dt; if (p.x > padR + 60) p.x = padL - 60
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(t * 4 + p.ph) * 0.6); ctx.fillStyle = "#eae6da"; ctx.fillRect(-16, -11, 32, 22); ctx.fillStyle = "#222"; ctx.font = "900 5px Arial"; ctx.textAlign = "center"; ctx.fillText("DAILY BUGLE", 0, -5)
    ctx.fillStyle = "#888"; for (let j = 0; j < 3; j++) ctx.fillRect(-13, -1 + j * 4, 26, 1.5); ctx.restore() }
  // KO: webs from the rooftops + a web net across the alley + a camera flash
  if (QN.webs) { const w = QN.webs; w.t += dt; const u = Math.min(1, w.t / 0.5), cx = w.x, cy = feet - 140
    if (w.t > 0.25 && !w.snap) { w.snap = true; QN.flash = 1; qnShout(cx + 160, cy - 160, "*SNAP*", "#222") }
    ctx.strokeStyle = "rgba(245,245,250,0.95)"; ctx.lineWidth = 2
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, ex = cx + Math.cos(a) * 520, ey = cy + Math.sin(a) * 300; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (ex - cx) * u, cy + (ey - cy) * u); ctx.stroke() }
    if (u >= 1) for (let r = 1; r <= 5; r++) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2, rr = r / 5; ctx.lineTo(cx + Math.cos(a) * 520 * rr, cy + Math.sin(a) * 300 * rr) } ctx.stroke() }
    for (const [sx, sy] of [[padL, dockTop - 600], [padR, dockTop - 600]]) if (w.t < 0.6) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (cx - sx) * u, sy + (cy - sy) * u); ctx.stroke() }
    if (w.t > 1.5) QN.cops = Math.max(0, QN.cops - dt * 0.5) }
  if (QN.flash > 0) { QN.flash = Math.max(0, QN.flash - dt * 2.5); ctx.fillStyle = `rgba(255,255,255,${0.7 * QN.flash})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  // snow
  if (!QN.snow) QN.snow = Array.from({ length: 110 }, (_, i) => ({ x: (i * 0.137) % 1, y: (i * 0.611) % 1, v: 0.5 + 0.5 * ((i * 0.37) % 1), r: 1 + 1.5 * ((i * 0.53) % 1) }))
  ctx.fillStyle = "rgba(245,245,255,0.85)"
  for (const f of QN.snow) { f.y = (f.y + f.v * dt * 0.12) % 1; const x = padL + (padR - padL) * ((f.x + Math.sin(t * 0.7 + f.r * 4) * 0.01 + 1) % 1), y = dockTop - 700 + (coverBottom - dockTop + 700) * f.y; ctx.beginPath(); ctx.arc(x, y, f.r, 0, 7); ctx.fill() }
  for (const s of QN.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  QN.shout = QN.shout.filter(s => s.t > 0)
}

// ───────────────────────────── ASAKUSA AT NIGHT, TAISHŌ-ERA TOKYO (Demon Slayer; render-only, wall clock, own PRNG) ─────────────────────────────
// Gen's stage (SF 1987): the shop street re-lit for night, every sign board repainted and lettered here in Japanese
// (the right way round on every mirrored copy). Starry sky, a full moon, the RYŌUNKAKU (the 12-storey tower of Taishō
// Asakusa) on the skyline, strings of red paper lanterns across the street, gas-lamp glow, townsfolk in kimono and
// bowler hats strolling; the Demon Slayer cast who aren't fighting watch (shared crowd). Big hit → the lanterns swing,
// one drops and flares; ≤25% → the moon turns blood red, the lamps gutter, demon eyes glow in the side streets ("THAT
// SCENT… MUZAN!"); KO → Tamayo's Blood Demon Art: a bloom of flowers and a sweet pink haze sweeps the street, Yushiro's
// eye talismans flutter, the moon pales again.
let _asSeed = 0x1f83d9ab ^ 0x9b05688c
const asRnd = () => { _asSeed ^= _asSeed << 13; _asSeed ^= _asSeed >>> 17; _asSeed ^= _asSeed << 5; return (_asSeed >>> 0) / 4294967296 }
const AS_CROWD = [["zenitsu", 0.12, 0], ["nezuko", 0.3, 0], ["rengoku", 0.5, 0], ["shinobu", 0.7, 0], ["inosuke", 0.88, 0]]
const ASC = makeCrowd(AS_CROWD, 0.6)
const AS = { p1: null, last: 0, hp: new WeakMap(), folk: null, swing: 0, drops: [], blood: 0, bloom: null, petals: [], tags: [], shout: [], geo: null,
  st: { swings: 0, blood: 0, bloom: 0 } }
export const asakusaState = () => ({ ...AS.st, folk: (AS.folk || []).length, blood: +AS.blood.toFixed(2), bloom: AS.bloom ? +AS.bloom.t.toFixed(2) : 0, petals: AS.petals.length,
  crowd: crowdState(ASC), shouting: AS.shout.filter(s => s.t > 0).map(s => s.txt) })
function asGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.street, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, Y: py => y0 + py * S }
}
function asShout(x, y, txt, col) { if (AS.shout.filter(s => s.t > 0).length < 3) AS.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function asRyounkaku(ctx, x, base, s, red) {   // the Ryōunkaku: an octagonal red-brick tower, 12 storeys, a pointed cap
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s)
  ctx.fillStyle = red ? "#3a1418" : "#2a2034"; ctx.fillRect(-22, -300, 44, 300); ctx.fillStyle = red ? "#2a0c10" : "#1e1828"; ctx.fillRect(8, -300, 14, 300)
  for (let i = 0; i < 12; i++) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-24, -300 + i * 24, 48, 3); ctx.fillStyle = `rgba(250,${red ? 120 : 210},${red ? 90 : 130},${_h(i * 3.3) < 0.5 ? 0.75 : 0.2})`; for (let j = -1; j <= 1; j++) ctx.fillRect(j * 12 - 3, -292 + i * 24, 6, 9) }
  ctx.fillStyle = red ? "#2a0c10" : "#1e1828"; ctx.fillRect(-30, -308, 60, 8); ctx.beginPath(); ctx.moveTo(-18, -308); ctx.lineTo(0, -350); ctx.lineTo(18, -308); ctx.fill()
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -350); ctx.lineTo(0, -372); ctx.stroke(); ctx.restore()
}
function asFolk(ctx, p, x, y, s, t) {   // a Taishō townsperson: kimono or a suit + bowler hat, a parasol sometimes
  const sw = p.go ? Math.sin(t * 6 + p.ph) * 0.35 : 0
  ctx.save(); ctx.translate(x, y); ctx.scale(s * p.dir, s)
  ctx.fillStyle = "#1a1418"; ctx.fillRect(-4 + sw * 6, -6, 4, 6); ctx.fillRect(1 - sw * 6, -6, 4, 6)
  ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-8, -44); ctx.lineTo(8, -44); ctx.lineTo(p.kimono ? 9 : 7, -5); ctx.lineTo(p.kimono ? -9 : -7, -5); ctx.fill()
  if (p.kimono) { ctx.fillStyle = p.obi; ctx.fillRect(-8, -30, 16, 5) } else { ctx.fillStyle = "#e8e0d0"; ctx.beginPath(); ctx.moveTo(-2, -44); ctx.lineTo(0, -36); ctx.lineTo(2, -44); ctx.fill() }
  ctx.fillStyle = "#e0c0a0"; ctx.beginPath(); ctx.arc(0, -50, 6, 0, 7); ctx.fill()
  ctx.fillStyle = "#151218"; if (p.kimono) { ctx.beginPath(); ctx.arc(0, -53, 6.5, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(0, -59, 4, 0, 7); ctx.fill() } else { ctx.beginPath(); ctx.arc(0, -55, 6, Math.PI, 0); ctx.fill(); ctx.fillRect(-9, -55, 18, 2) }
  if (p.scared > 0) { ctx.strokeStyle = "#e0c0a0"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, -42); ctx.lineTo(-10, -60); ctx.moveTo(6, -42); ctx.lineTo(10, -60); ctx.stroke() }
  ctx.restore()
}
function asLantern(ctx, x, y, s, a, lit) {   // a red paper chōchin on a cord
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s)
  ctx.strokeStyle = "#2a1a14"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke()
  if (lit) { ctx.fillStyle = "rgba(255,120,60,0.18)"; ctx.beginPath(); ctx.arc(0, 18, 24, 0, 7); ctx.fill() }
  ctx.fillStyle = "#1a1210"; ctx.fillRect(-6, 5, 12, 3); ctx.fillRect(-6, 29, 12, 3)
  ctx.fillStyle = lit ? "#e83a24" : "#7a1e14"; ctx.beginPath(); ctx.ellipse(0, 18, 10, 12, 0, 0, 7); ctx.fill()
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(0, 18, 10, 12 - Math.abs(i) * 0 , 0, 0, 7); ctx.moveTo(-10, 18 + i * 5); ctx.lineTo(10, 18 + i * 5); ctx.stroke() }
  ctx.restore()
}
function drawAsakusaSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = AS.geo = asGeo(def, c, W, dockTop), S = def.S, b = AS.blood
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, b ? `rgb(${10 + 40 * b | 0},6,${24 - 10 * b | 0})` : "#0a0c24"); g.addColorStop(1, b ? `rgb(${40 + 60 * b | 0},20,40)` : "#2a2c5a")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  const sk = c.layout.pieces.sky, im = c.img[sk.file]
  if (ready(im)) { const ps = shift(0.05, W), w = sk.w * S; ctx.save(); ctx.globalAlpha = 0.9 - 0.5 * b; ctx.globalCompositeOperation = "lighter"; for (let x = ((ps - padL) % w + w) % w - w + padL; x < padR; x += w) ctx.drawImage(im, x, coverTop, w + 1, Math.max(sk.h * S, G.y0 - coverTop + 40)); ctx.restore() }
  const vx = G.x0 + (G.pc.vanish?.[0] ?? 322) * S
  { const mx = vx - 70 * S + shift(0.04, W) * 0.1, my = G.Y(28); const mc = b ? `rgba(220,${60 - 30 * b | 0},50,1)` : "#f4f0dc"
    ctx.fillStyle = b ? `rgba(200,40,40,${0.25 * b})` : "rgba(240,236,210,0.18)"; ctx.beginPath(); ctx.arc(mx, my, 60, 0, 7); ctx.fill(); ctx.fillStyle = mc; ctx.beginPath(); ctx.arc(mx, my, 28, 0, 7); ctx.fill()
    ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.beginPath(); ctx.arc(mx - 12, my - 8, 9, 0, 7); ctx.arc(mx + 14, my + 10, 6, 0, 7); ctx.fill() }
  // far rooftops + the Ryōunkaku over the vanishing point
  { const ps = shift(0.3, W), base = G.Y(150); ctx.fillStyle = b ? "#1a0a10" : "#141428"
    for (let x = padL - 60; x < padR + 60; x += 46) { const xx = x + (ps % 46), h = 30 + 30 * _h(Math.floor((x - padL) / 46) * 2.1); ctx.beginPath(); ctx.moveTo(xx - 26, base - h); ctx.lineTo(xx, base - h - 14); ctx.lineTo(xx + 26, base - h); ctx.lineTo(xx + 22, base); ctx.lineTo(xx - 22, base); ctx.fill() }
    asRyounkaku(ctx, vx + 40 * S, base, S * 0.42, b > 0.3) }
}
function asakusaFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S, G = AS.geo || asGeo(def, c, W, dockTop)
  if (F[0] !== AS.p1) { Object.assign(AS, { p1: F[0], hp: new WeakMap(), folk: null, swing: 0, drops: [], blood: 0, bloom: null, petals: [], tags: [], shout: [] }); for (const k in AS.st) AS.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (AS.last || t))); AS.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + def.standRow * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = AS.hp.get(f); AS.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  // the sign boards, lettered in Japanese on every mirrored copy
  { const signs = G.pc.signs || []; ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"
    for (const cp of mirrorCopies(G, G.w, padL, padR)) for (const sg of signs) { const xa = cp.X(sg.x), xb = cp.X(sg.x + sg.w), x = Math.min(xa, xb), w = Math.abs(xb - xa), y = G.Y(sg.y), h = sg.h * S
      if (x > padR || x + w < padL) continue; const fs = Math.min(h * 0.62, w / (sg.txt.length + 0.6)); ctx.font = `900 ${fs}px "Hiragino Mincho ProN", "Yu Mincho", serif`
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillText(sg.txt, x + w / 2 + 2, y + h / 2 + 2); ctx.fillStyle = AS.blood > 0.5 ? "#e0a090" : "#f0e2c0"; ctx.fillText(sg.txt, x + w / 2, y + h / 2) }
    ctx.restore() }
  if (big && !AS.bloom) { AS.st.swings++; AS.swing = 1; camera.shake?.(4, 12)
    if (AS.st.swings % 2) AS.drops.push({ x: mid + (asRnd() - 0.5) * 400, y: G.Y(110), vy: 0, t: 0 })
    for (const p of AS.folk || []) if (Math.abs(p.x - mid) < 500) p.scared = 1.5
    asShout(mid + (asRnd() - 0.5) * 300, G.Y(120), ["A FIGHT IN ASAKUSA?!", "SOMEBODY CALL THE POLICE!", "MIND THE LANTERNS!"][(AS.st.swings - 1) % 3], "#8a2a1a") }
  if (low && !AS.st.blood && !AS.bloom) { AS.st.blood++; asShout(mid, feet - 230, "THAT SCENT… MUZAN!", "#8a0a1a"); for (const p of AS.folk || []) p.scared = 4 }
  if (AS.st.blood && !AS.bloom) AS.blood = Math.min(1, AS.blood + dt * 0.7)
  if (ko && !AS.bloom) { AS.bloom = { t: 0, x: mid }; AS.st.bloom++; asShout(mid, feet - 260, "BLOOD DEMON ART!", "#a02a6a")
    for (let i = 0; i < 14; i++) AS.tags.push({ x: padL + (padR - padL) * asRnd(), y: dockTop - 400 * asRnd(), ph: i, vx: 30 + 40 * asRnd() }) }
  if (AS.bloom) { AS.bloom.t += dt; if (AS.petals.length < 260 && AS.bloom.t < 2) for (let i = 0; i < 6; i++) AS.petals.push({ x: AS.bloom.x + (asRnd() - 0.5) * 120, y: feet - 80, vx: (asRnd() - 0.5) * 500, vy: -100 - asRnd() * 260, r: asRnd() * 6, life: 3 })
    if (AS.bloom.t > 1.2) AS.blood = Math.max(0, AS.blood - dt * 0.6) }
  // the cast watching
  drawCrowd(ctx, ASC, { W, feet, sh: shift(0.9, W) })
  // townsfolk strolling
  if (!AS.folk) AS.folk = Array.from({ length: 7 }, (_, i) => ({ x: padL + (padR - padL) * ((i * 0.29 + 0.07) % 1), dir: i % 2 ? -1 : 1, v: 22 + 14 * _h(i), go: true, ph: i, kimono: i % 3 !== 1,
    col: ["#5a3a6a", "#2a3a5a", "#6a2a2a", "#3a4a3a", "#5a4a2a", "#2a2a2a", "#7a3a5a"][i], obi: ["#c8a040", "#c84a4a", "#4a8ac8"][i % 3], scared: 0, lane: 0.3 + 0.5 * _h(i * 7) }))
  for (const p of AS.folk) { p.scared = Math.max(0, p.scared - dt); const run = p.scared > 0 ? 3.5 : 1
    if (p.scared > 0) p.dir = p.x < mid ? -1 : 1
    p.x += p.dir * p.v * run * dt; if (p.x < padL - 40) { p.x = padL - 40; p.dir = 1 } if (p.x > padR + 40) { p.x = padR + 40; p.dir = -1 }
    asFolk(ctx, p, p.x, feet - (6 + 18 * p.lane) * S, S * 0.6, t * run) }
  // strings of lanterns across the street
  AS.swing = Math.max(0, AS.swing - dt * 0.5)
  { const cy = G.Y(62), ps = shift(1, W), sp = 96 * S * 0.7
    for (let row = 0; row < 1; row++) { const yb = cy
      ctx.strokeStyle = "#2a1a14"; ctx.lineWidth = 1.5; ctx.beginPath()
      for (let x = padL - 40; x <= padR + 40; x += 20) { const u = ((x - ps) % 420 + 420) % 420 / 420; ctx.lineTo(x, yb + Math.sin(u * Math.PI) * 26) } ctx.stroke()
      for (let x = Math.floor((padL - ps) / sp) * sp + ps + row * sp / 2; x < padR + sp; x += sp) { const u = ((x - ps) % 420 + 420) % 420 / 420, a = Math.sin(t * 1.5 + x * 0.01) * (0.06 + 0.5 * AS.swing * Math.sin(t * 9 + x))
        asLantern(ctx, x, yb + Math.sin(u * Math.PI) * 26, S * 0.75, a, Math.sin(t * 13 + x * 3) > -0.95 - (AS.blood > 0.5 ? -0.6 : 0)) } } }
  // a dropped lantern flaring on the street
  for (const d of AS.drops) { d.t += dt; if (d.y < feet - 10) { d.vy += 900 * dt; d.y += d.vy * dt; asLantern(ctx, d.x, d.y, S * 0.75, d.t * 6, true) }
    else { const k = Math.min(1, (d.t - 0.4) / 1.2); ctx.fillStyle = `rgba(255,${140 - 80 * k | 0},40,${1 - k})`; ctx.beginPath(); ctx.moveTo(d.x - 20, feet - 6); ctx.quadraticCurveTo(d.x, feet - 70 * (1 - k) - 10 + Math.sin(t * 20) * 5, d.x + 20, feet - 6); ctx.fill() } }
  AS.drops = AS.drops.filter(d => d.t < 2)
  // demon eyes in the side streets under the blood moon
  if (AS.blood > 0.4 && !AS.bloom) for (let i = 0; i < 6; i++) { const x = padL + (padR - padL) * ((i * 0.41 + 0.08) % 1), y = feet - 160 - 60 * _h(i * 5), op = Math.sin(t * 1.7 + i * 2) > -0.7 ? (AS.blood - 0.4) * 1.6 : 0
    ctx.fillStyle = `rgba(255,40,40,${op})`; for (const d of [-6, 6]) { ctx.beginPath(); ctx.ellipse(x + d, y, 4, 2, 0, 0, 7); ctx.fill() } }
  if (AS.blood > 0) { ctx.fillStyle = `rgba(90,0,10,${0.25 * AS.blood})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  // Tamayo's flowers + pink haze + Yushiro's eye talismans
  if (AS.bloom) { const k = Math.min(1, AS.bloom.t / 1), fade = Math.max(0, 1 - Math.max(0, AS.bloom.t - 2.2) / 1.5); ctx.fillStyle = `rgba(240,150,200,${0.22 * k * fade})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900)
    for (let i = 0; i < 16; i++) { const x = AS.bloom.x + Math.cos(i * 2.4) * 380 * k, y = feet - 120 + Math.sin(i * 1.7) * 160 * k, r = 12 + 10 * _h(i)
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y); ctx.rotate(t + i); ctx.fillStyle = "#e86aa0"; for (let j = 0; j < 5; j++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(r * 0.6, 0, r * 0.6, r * 0.35, 0, 0, 7); ctx.fill() } ctx.fillStyle = "#f8e080"; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, 7); ctx.fill(); ctx.restore() } }
  for (const p of AS.petals) { p.life -= dt; p.vy += 150 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = `rgba(240,140,190,${Math.min(1, p.life)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 2.4, p.r + t * 3, 0, 7); ctx.fill() }
  AS.petals = AS.petals.filter(p => p.life > 0)
  for (const tg of AS.tags) { tg.x += tg.vx * dt; tg.y += Math.sin(t * 2 + tg.ph) * 30 * dt; ctx.save(); ctx.translate(tg.x, tg.y); ctx.rotate(Math.sin(t * 3 + tg.ph) * 0.4)
    ctx.fillStyle = "#f2ecd8"; ctx.fillRect(-9, -16, 18, 32); ctx.fillStyle = "#c82a3a"; ctx.beginPath(); ctx.ellipse(0, -2, 6, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(0, -2, 2, 0, 7); ctx.fill(); ctx.restore() }
  if (AS.bloom && AS.bloom.t > 4) AS.tags = []
  for (const s of AS.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  AS.shout = AS.shout.filter(s => s.t > 0)
}

// ───────────────────────────── SHADOW GARDEN (The Eminence in Shadow; render-only, wall clock, own PRNG) ─────────────────────────────
// Eagle's stage (SF 1987) repainted as a moonlit night: the castle on its hill is Shadow Garden's hideout (violet light in
// its windows), the lakes shimmer under a huge moon, fireflies drift, and black-suited Shadow Garden agents keep watch
// from the ridges. Big hit → agents blink in on the near ridges, slime swords glinting violet ("…the Shadow is
// watching."); ≤25% → the SEVEN SHADOWS stand in a row on the far hill, eyes glowing, violet mist rolls in; KO →
// "I AM… ATOMIC.": a violet-white blast swells behind the castle with rings of light, the screen whites out, night returns.
let _sgSeed = 0x5be0cd19 ^ 0x6a09e667
const sgRnd = () => { _sgSeed ^= _sgSeed << 13; _sgSeed ^= _sgSeed >>> 17; _sgSeed ^= _sgSeed << 5; return (_sgSeed >>> 0) / 4294967296 }
const SG = { p1: null, last: 0, hp: new WeakMap(), flies: null, agents: [], seven: 0, atomic: null, shout: [], geo: null,
  st: { agents: 0, seven: 0, atomic: 0 } }
export const shadowState = () => ({ ...SG.st, flies: (SG.flies || []).length, agentsUp: SG.agents.filter(a => a.t < a.life).length, seven: +SG.seven.toFixed(2), atomic: SG.atomic ? +SG.atomic.t.toFixed(2) : 0,
  shouting: SG.shout.filter(s => s.t > 0).map(s => s.txt) })
function sgGeo(def, c, W, dockTop) {
  const pc = c.layout.pieces.land, S = def.S, w = pc.w * S, h = pc.h * S, x0 = W / 2 - w / 2 + shift(0.9, W), y0 = dockTop - h
  return { pc, S, w, x0, y0, Y: py => y0 + py * S }
}
function sgShout(x, y, txt, col) { if (SG.shout.filter(s => s.t > 0).length < 3) SG.shout.push({ x, y, txt, col: col || "#222", t: 2.2 }) }
function sgAgent(ctx, x, y, s, t, k, eyes) {   // a Shadow Garden agent: black bodysuit, hood, a violet slime sword
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (k % 2 ? -1 : 1), s)
  ctx.fillStyle = "#06060c"; ctx.fillRect(-4, -18, 3, 18); ctx.fillRect(1, -18, 3, 18); ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(6, -40); ctx.lineTo(9, -16); ctx.lineTo(-9, -16); ctx.fill()
  ctx.beginPath(); ctx.arc(0, -45, 6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, -44); ctx.quadraticCurveTo(-14, -20, -12, -8); ctx.lineTo(-6, -30); ctx.fill()   // cloak tail
  if (eyes) { ctx.fillStyle = "#c870ff"; ctx.fillRect(1, -47, 3, 1.6) }
  const gl = 0.5 + 0.5 * Math.sin(t * 3 + k); ctx.strokeStyle = `rgba(190,110,255,${0.6 + 0.4 * gl})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(6, -28); ctx.lineTo(22, -46); ctx.stroke()
  ctx.strokeStyle = `rgba(220,170,255,${0.25 * gl})`; ctx.lineWidth = 6; ctx.stroke(); ctx.restore()
}
function drawShadowSky(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), G = SG.geo = sgGeo(def, c, W, dockTop), S = def.S, a = SG.atomic ? Math.max(0, 1 - Math.abs(SG.atomic.t - 1.2) / 1.2) : 0
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#03040c"); g.addColorStop(0.6, "#0e1230"); g.addColorStop(1, "#1e2448")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  for (let i = 0; i < 140; i++) { const x = padL + (padR - padL) * ((i * 0.6180339) % 1), y = coverTop + (G.Y(60) - coverTop) * ((i * 0.7548776) % 1), tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i))
    ctx.fillStyle = `rgba(220,226,255,${0.7 * tw})`; ctx.fillRect(x + shift(0.02, W) * 0.2, y, 1.6, 1.6) }
  // the huge moon
  { const mx = W / 2 + shift(0.03, W) - 380, my = G.Y(-10), R = 90 * S * 0.6
    const halo = ctx.createRadialGradient(mx, my, R * 0.8, mx, my, R * 3); halo.addColorStop(0, "rgba(200,210,255,0.28)"); halo.addColorStop(1, "rgba(200,210,255,0)"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, R * 3, 0, 7); ctx.fill()
    ctx.fillStyle = "#eef0ff"; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(150,160,200,0.25)"; for (const [dx, dy, r] of [[-20, -14, 16], [24, 10, 12], [-6, 26, 9], [30, -22, 7]]) { ctx.beginPath(); ctx.arc(mx + dx * S * 0.6, my + dy * S * 0.6, r * S * 0.6, 0, 7); ctx.fill() } }
  // the Seven Shadows on the far ridge
  if (SG.seven > 0) { const base = G.Y(40), cx = W / 2 + shift(0.2, W) + 80; for (let i = 0; i < 7; i++) { ctx.save(); ctx.globalAlpha = Math.min(1, SG.seven * 1.5 - i * 0.1); sgAgent(ctx, cx + (i - 3) * 34 * S * 0.6, base, S * 0.8, t, i, true); ctx.restore() } }
  // ATOMIC behind the castle
  if (SG.atomic) { const k = SG.atomic.t, cx = W / 2 + shift(0.2, W) + 200, cy = G.Y(40), R = Math.min(1, k / 1.1) * 520, fade = Math.max(0, 1 - Math.max(0, k - 2) / 1.6)
    const bl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 1); bl.addColorStop(0, `rgba(255,255,255,${fade})`); bl.addColorStop(0.35, `rgba(200,150,255,${0.9 * fade})`); bl.addColorStop(0.7, `rgba(110,60,220,${0.6 * fade})`); bl.addColorStop(1, "rgba(60,20,140,0)")
    ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, 7); ctx.fill()
    for (let r = 0; r < 4; r++) { const rr = ((k * 300 + r * 140) % 700); ctx.strokeStyle = `rgba(220,190,255,${Math.max(0, 0.6 - rr / 1000) * fade})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.35, 0, 0, 7); ctx.stroke() } }
}
function shadowFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S, G = SG.geo || sgGeo(def, c, W, dockTop)
  if (F[0] !== SG.p1) { Object.assign(SG, { p1: F[0], hp: new WeakMap(), flies: null, agents: [], seven: 0, atomic: null, shout: [] }); for (const k in SG.st) SG.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (SG.last || t))); SG.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + def.standRow * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = SG.hp.get(f); SG.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  // castle windows (violet) + moonlight on the lakes, on every mirrored copy
  for (const cp of mirrorCopies(G, G.w, padL, padR)) { const [x0, y0, x1, y1] = G.pc.castle
    for (let i = 0; i < 9; i++) { const px = x0 + 22 + (i % 5) * 18, py = y0 + 30 + Math.floor(i / 5) * 20, x = cp.X(px), y = G.Y(py), on = Math.sin(t * 0.7 + i * 1.9) > -0.6
      if (on) { ctx.fillStyle = "rgba(180,110,255,0.22)"; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#d8a8ff"; ctx.fillRect(x - 2, y - 3, 4, 6) } }
    for (const [la, ly, lb] of G.pc.lakes) { const xa = Math.min(cp.X(la), cp.X(lb)), xb = Math.max(cp.X(la), cp.X(lb)), y = G.Y(ly)
      for (let j = 0; j < 7; j++) { const yy = y + 4 + j * 6, w = (xb - xa) * (0.15 + 0.1 * Math.sin(t * 2 + j)), x = (xa + xb) / 2 + Math.sin(t * 1.5 + j * 2) * 8; ctx.fillStyle = `rgba(220,226,255,${0.35 - j * 0.04})`; ctx.fillRect(x - w / 2, yy, w, 1.6) } } }
  if (big && !SG.atomic) { SG.st.agents++; for (let i = 0; i < 3; i++) SG.agents.push({ x: mid + (sgRnd() - 0.5) * 900, y: G.Y(150 - 30 * sgRnd()), t: 0, life: 2.6, k: SG.agents.length })
    if (SG.st.agents % 2 === 1) sgShout(mid, G.Y(110), ["…the Shadow is watching.", "Shadow Garden is here.", "We lurk in the shadows…"][Math.floor(SG.st.agents / 2) % 3], "#5a2a9a") }
  if (low && !SG.st.seven && !SG.atomic) { SG.st.seven++; sgShout(mid, feet - 230, "THE SEVEN SHADOWS!", "#5a2a9a") }
  if (SG.st.seven && !SG.atomic) SG.seven = Math.min(1, SG.seven + dt * 0.8)
  if (ko && !SG.atomic) { SG.atomic = { t: 0 }; SG.st.atomic++; sgShout(mid, feet - 260, "I AM… ATOMIC.", "#5a2a9a"); camera.shake?.(6, 60) }
  if (SG.atomic) { SG.atomic.t += dt; if (SG.atomic.t > 1 && !SG.atomic.boom) { SG.atomic.boom = true; camera.shake?.(16, 50) } if (SG.atomic.t > 2) SG.seven = Math.max(0, SG.seven - dt * 0.6) }
  // agents blinking in on the ridges
  for (const a of SG.agents) { a.t += dt; const al = a.t < 0.2 ? a.t / 0.2 : a.t > a.life - 0.3 ? Math.max(0, (a.life - a.t) / 0.3) : 1
    if (al > 0) { ctx.save(); ctx.globalAlpha = al; sgAgent(ctx, a.x, a.y, S * 0.7, t, a.k, true); ctx.restore() }
    if (a.t < 0.25) { ctx.strokeStyle = `rgba(200,140,255,${1 - a.t * 4})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y - 20, 30 * a.t * 4, 0, 7); ctx.stroke() } }
  SG.agents = SG.agents.filter(a => a.t < a.life)
  // fireflies
  if (!SG.flies) SG.flies = Array.from({ length: 40 }, (_, i) => ({ x: (i * 0.6180339) % 1, y: (i * 0.7548776) % 1, ph: i }))
  for (const f of SG.flies) { const x = padL + (padR - padL) * ((f.x + Math.sin(t * 0.2 + f.ph) * 0.03 + 1) % 1), y = feet - 40 - 260 * f.y + Math.sin(t * 0.9 + f.ph * 2) * 12, a = Math.max(0, Math.sin(t * 1.7 + f.ph * 3))
    ctx.fillStyle = `rgba(200,255,170,${0.15 * a})`; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(230,255,200,${0.9 * a})`; ctx.fillRect(x - 1, y - 1, 2.2, 2.2) }
  // violet mist when the Seven appear
  if (SG.seven > 0) for (let i = 0; i < 3; i++) { const y = feet - 30 - i * 80 + Math.sin(t * 0.6 + i) * 12, gr = ctx.createLinearGradient(0, y - 60, 0, y + 60); gr.addColorStop(0, "rgba(120,60,200,0)"); gr.addColorStop(0.5, `rgba(120,60,200,${0.22 * SG.seven})`); gr.addColorStop(1, "rgba(120,60,200,0)")
    ctx.fillStyle = gr; ctx.fillRect(padL, y - 60, padR - padL, 120) }
  if (SG.atomic) { const k = SG.atomic.t, wo = k > 0.9 && k < 2.4 ? Math.max(0, 1 - Math.abs(k - 1.2) / 1.2) : 0; if (wo > 0) { ctx.fillStyle = `rgba(240,225,255,${0.75 * wo})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) } }
  for (const s of SG.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  SG.shout = SG.shout.filter(s => s.t > 0)
}

// ───────────────────────────── THE BATTLE ROYALE COLOSSEUM (free-for-all; render-only, wall clock, own PRNG) ─────────────────────────────
// No sheet — drawn in code over a generated sand floor: a dusk sky, the colosseum's three tiers of arches curving round the
// arena packed with a cheering crowd, banners, braziers along the arena wall, an iron gate; champions from every universe
// wait at the wall (shared crowd). Big hit → the crowd roars to its feet, flowers are thrown into the arena; ≤25% →
// spotlights sweep the sand, the crowd chants, the gate rattles; KO → fireworks over the colosseum, rose petals rain,
// the crowd goes wild.
let _coSeed = 0x243f6a88 ^ 0x85a308d3
const coRnd = () => { _coSeed ^= _coSeed << 13; _coSeed ^= _coSeed >>> 17; _coSeed ^= _coSeed << 5; return (_coSeed >>> 0) / 4294967296 }
const CO_CROWD = [["goku", 0.08, 0], ["luffy", 0.2, 0], ["gojo", 0.32, 0], ["ichigo", 0.44, 0], ["saitama", 0.56, 0], ["batman", 0.68, 0], ["killua", 0.8, 0], ["naruto", 0.92, 0]]
const COC = makeCrowd(CO_CROWD, 0.6)
const CO = { p1: null, last: 0, hp: new WeakMap(), roar: 0, flowers: [], spot: 0, fw: [], sparks: [], petals: [], ko: null, shout: [],
  st: { roars: 0, spot: 0, ko: 0, fireworks: 0 } }
export const colosseumState = () => ({ ...CO.st, roar: +CO.roar.toFixed(2), spot: +CO.spot.toFixed(2), ko: CO.ko ? +CO.ko.t.toFixed(2) : 0, petals: CO.petals.length,
  crowd: crowdState(COC), shouting: CO.shout.filter(s => s.t > 0).map(s => s.txt) })
function coShout(x, y, txt, col) { if (CO.shout.filter(s => s.t > 0).length < 3) CO.shout.push({ x, y, txt, col: col || "#222", t: 2 }) }
function coTier(ctx, padL, padR, ps, yTop, yBot, archW, col, dark, t, seed, crowdOn) {   // one tier: piers + arches, the crowd in each arch
  ctx.fillStyle = col; ctx.fillRect(padL, yTop, padR - padL, yBot - yTop)
  ctx.fillStyle = dark; ctx.fillRect(padL, yBot - 6, padR - padL, 6); ctx.fillRect(padL, yTop, padR - padL, 5)
  const h = yBot - yTop
  for (let i = Math.floor((padL - ps) / archW) - 1; i * archW + ps < padR + archW; i++) { const x = i * archW + ps, aw = archW * 0.62, ax = x + (archW - aw) / 2, at = yTop + h * 0.2
    ctx.fillStyle = "#1a1018"; ctx.beginPath(); ctx.moveTo(ax, yBot - 6); ctx.lineTo(ax, at + aw / 2); ctx.arc(ax + aw / 2, at + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(ax + aw, yBot - 6); ctx.fill()
    if (crowdOn) for (let j = 0; j < 4; j++) { const hx = ax + aw * (0.15 + 0.23 * j), seedj = seed * 100 + i * 7 + j, jump = CO.roar > 0 ? Math.abs(Math.sin(t * 9 + seedj)) * 6 * CO.roar : Math.abs(Math.sin(t * 2 + seedj)) * 1.2
      const hy = yBot - 14 - (j % 2) * 8 - jump; ctx.fillStyle = ["#c84a4a", "#4a7ac8", "#e8c04a", "#5aa86a", "#a85ac8", "#e88a4a"][Math.floor(_h(seedj) * 6)]; ctx.fillRect(hx - 4, hy, 8, 12)
      ctx.fillStyle = ["#f0c8a0", "#c8946a", "#8a5a3a", "#5a3a28"][Math.floor(_h(seedj * 3) * 4)]; ctx.beginPath(); ctx.arc(hx, hy - 4, 4, 0, 7); ctx.fill()
      if (CO.roar > 0.3 || CO.spot > 0.3) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 3, hy + 2); ctx.lineTo(hx - 6, hy - 10 - jump); ctx.moveTo(hx + 3, hy + 2); ctx.lineTo(hx + 6, hy - 10 - jump); ctx.stroke() } }
    ctx.fillStyle = dark; ctx.fillRect(x - 3, yTop + 5, 6, h - 11); ctx.fillRect(x - 6, yTop + h * 0.2 - 4, 12, 5) }
}
function drawColosseumBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#160b22"); g.addColorStop(0.5, "#5a2a6a"); g.addColorStop(1, "#e88a6a")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,240,255,${0.4 + 0.4 * Math.sin(t + i)})`; ctx.fillRect(padL + (padR - padL) * ((i * 0.618) % 1), coverTop + 200 * ((i * 0.754) % 1), 1.5, 1.5) }
  // the far side of the bowl (small, hazy) and the three near tiers
  const wallTop = dockTop - 46 * S, T1 = dockTop - 205 * S
  coTier(ctx, padL, padR, shift(0.35, W), T1, dockTop - 160 * S, 46, "#7a5a6a", "#5a3a4a", t, 1, true)
  coTier(ctx, padL, padR, shift(0.5, W), dockTop - 160 * S, dockTop - 106 * S, 70, "#a87a6a", "#7a5248", t, 2, true)
  coTier(ctx, padL, padR, shift(0.7, W), dockTop - 106 * S, wallTop, 96, "#c8987a", "#8a6252", t, 3, true)
  // banners on the top tier
  { const ps = shift(0.35, W); for (let i = Math.floor((padL - ps) / 230) - 1; i * 230 + ps < padR + 230; i++) { const x = i * 230 + ps, col = ["#c82a4a", "#2a5ac8", "#e8b82a", "#2a9a5a", "#8a2ac8"][((i % 5) + 5) % 5]
    ctx.strokeStyle = "#3a2a2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, T1 - 50); ctx.lineTo(x, T1); ctx.stroke()
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, T1 - 50); for (let j = 0; j <= 6; j++) ctx.lineTo(x + j * 6, T1 - 50 + Math.sin(t * 4 + j + i) * 2); ctx.lineTo(x + 36, T1 - 30); for (let j = 6; j >= 0; j--) ctx.lineTo(x + j * 6, T1 - 30 + Math.sin(t * 4 + j + i) * 2); ctx.fill() } }
  // the arena wall (podium), its gates and braziers
  { const ps = shift(0.9, W); ctx.fillStyle = "#8a6a58"; ctx.fillRect(padL, wallTop, padR - padL, dockTop - wallTop); ctx.fillStyle = "#6a4e40"; ctx.fillRect(padL, wallTop, padR - padL, 8)
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1; for (let y = wallTop + 18; y < dockTop; y += 16) { ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padR, y); ctx.stroke() }
    for (let i = Math.floor((padL - ps) / 600) - 1; i * 600 + ps < padR + 600; i++) { const x = i * 600 + ps + 300, gw = 70 * S * 0.6, gh = (dockTop - wallTop) * 0.92, rat = CO.spot > 0.3 ? Math.sin(t * 30 + i) * 2 : 0
      ctx.fillStyle = "#140c10"; ctx.beginPath(); ctx.moveTo(x - gw / 2, dockTop); ctx.lineTo(x - gw / 2, dockTop - gh + gw / 2); ctx.arc(x, dockTop - gh + gw / 2, gw / 2, Math.PI, 0); ctx.lineTo(x + gw / 2, dockTop); ctx.fill()
      ctx.strokeStyle = "#4a4a52"; ctx.lineWidth = 3; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(x + j * gw / 5 + rat, dockTop); ctx.lineTo(x + j * gw / 5 + rat, dockTop - gh + 10); ctx.stroke() }
      for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x - gw / 2 + rat, dockTop - j * gh / 4); ctx.lineTo(x + gw / 2 + rat, dockTop - j * gh / 4); ctx.stroke() }
      for (const d of [-1, 1]) { const bx = x + d * 150, by = wallTop; ctx.fillStyle = "#3a2a22"; ctx.fillRect(bx - 3, by - 30, 6, 30); ctx.fillStyle = "#2a1a14"; ctx.beginPath(); ctx.moveTo(bx - 14, by - 30); ctx.lineTo(bx + 14, by - 30); ctx.lineTo(bx + 8, by - 22); ctx.lineTo(bx - 8, by - 22); ctx.fill()
        for (let k = 0; k < 3; k++) { const fh = 18 + 8 * Math.sin(t * 9 + k * 2 + i), fx = bx + (k - 1) * 6; ctx.fillStyle = k === 1 ? "#ffd060" : "#ff7a2a"; ctx.beginPath(); ctx.moveTo(fx - 5, by - 30); ctx.quadraticCurveTo(fx, by - 30 - fh * 1.3, fx + 5, by - 30); ctx.fill() }
        ctx.fillStyle = "rgba(255,160,60,0.12)"; ctx.beginPath(); ctx.arc(bx, by - 40, 40, 0, 7); ctx.fill() } } }
}
function colosseumFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S
  if (F[0] !== CO.p1) { Object.assign(CO, { p1: F[0], hp: new WeakMap(), roar: 0, flowers: [], spot: 0, fw: [], sparks: [], petals: [], ko: null, shout: [] }); for (const k in CO.st) CO.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (CO.last || t))); CO.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + def.standRow * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = CO.hp.get(f); CO.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big && !CO.ko) { CO.st.roars++; CO.roar = 1; for (let i = 0; i < 8; i++) CO.flowers.push({ x: mid + (coRnd() - 0.5) * 700, y: dockTop - 200 - coRnd() * 200, vx: (coRnd() - 0.5) * 120, vy: -60 - coRnd() * 100, t: 0, col: ["#e83a5a", "#f0e040", "#f8f8f8"][i % 3] })
    if (CO.st.roars % 2 === 1) coShout(mid + (coRnd() - 0.5) * 300, dockTop - 150 * S, ["OHHHHH!!", "WHAT A HIT!", "AGAIN! AGAIN!"][Math.floor(CO.st.roars / 2) % 3], "#8a1a3a") }
  CO.roar = Math.max(0, CO.roar - dt * 0.5)
  if (low && !CO.st.spot && !CO.ko) { CO.st.spot++; coShout(mid, feet - 230, "FIN-ISH! FIN-ISH! FIN-ISH!", "#8a1a3a") }
  if (CO.st.spot && !CO.ko) CO.spot = Math.min(1, CO.spot + dt * 1.1)
  if (ko && !CO.ko) { CO.ko = { t: 0, next: 0 }; CO.st.ko++; CO.roar = 1; coShout(mid, feet - 260, "WE HAVE A VICTOR!!", "#8a1a3a"); camera.shake?.(6, 30) }
  if (CO.ko) { const k = CO.ko; k.t += dt; CO.roar = Math.max(CO.roar, 0.8)
    if (k.t < 4 && k.t > k.next) { k.next = k.t + 0.35 + coRnd() * 0.3; CO.st.fireworks++; const x = padL + (padR - padL) * (0.15 + 0.7 * coRnd()), y = dockTop - (175 + 70 * coRnd()) * S, col = ["#ff5a7a", "#5ad0ff", "#ffe060", "#a0ff7a", "#d07aff"][Math.floor(coRnd() * 5)]
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, v = 160 + 60 * coRnd(); CO.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.4, col }) } }
    if (CO.petals.length < 200 && k.t < 3) for (let i = 0; i < 3; i++) CO.petals.push({ x: padL + (padR - padL) * coRnd(), y: dockTop - 500 * S * coRnd() - 100, ph: coRnd() * 6, life: 4 })
    if (k.t > 1.5) CO.spot = Math.max(0, CO.spot - dt * 0.5) }
  // the champions waiting at the wall
  drawCrowd(ctx, COC, { W, feet, sh: shift(0.9, W) })
  // spotlights sweeping
  if (CO.spot > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 3; i++) { const sx = padL + (padR - padL) * (0.2 + 0.3 * i), tx = mid + Math.sin(t * (0.9 + i * 0.3) + i * 2) * 260
      const gr = ctx.createLinearGradient(sx, dockTop - 600, tx, feet); gr.addColorStop(0, `rgba(255,250,220,${0.02 * CO.spot})`); gr.addColorStop(1, `rgba(255,250,220,${0.16 * CO.spot})`)
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(sx - 10, dockTop - 600); ctx.lineTo(sx + 10, dockTop - 600); ctx.lineTo(tx + 90, feet + 10); ctx.lineTo(tx - 90, feet + 10); ctx.fill()
      ctx.fillStyle = `rgba(255,250,220,${0.12 * CO.spot})`; ctx.beginPath(); ctx.ellipse(tx, feet + 4, 90, 18, 0, 0, 7); ctx.fill() } ctx.restore() }
  // flowers thrown into the arena
  for (const f of CO.flowers) { f.t += dt; if (f.y < feet - 4) { f.vy += 300 * dt; f.x += f.vx * dt; f.y += f.vy * dt }
    ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, 7); ctx.fill(); ctx.strokeStyle = "#3a8a3a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + 6, f.y + 6); ctx.stroke() }
  CO.flowers = CO.flowers.filter(f => f.t < 6).slice(-60)
  // fireworks + petals
  for (const s of CO.sparks) { s.life -= dt; s.vy += 60 * dt; s.x += s.vx * dt; s.y += s.vy * dt; ctx.fillStyle = s.col; ctx.globalAlpha = Math.max(0, Math.min(1, s.life)); ctx.fillRect(s.x - 2, s.y - 2, 5, 5); ctx.globalAlpha = 1 }
  CO.sparks = CO.sparks.filter(s => s.life > 0).slice(-600)
  for (const p of CO.petals) { p.life -= dt; p.y += 60 * dt; p.x += Math.sin(t * 2 + p.ph) * 30 * dt; ctx.fillStyle = `rgba(220,40,70,${Math.min(1, p.life)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 2.5, t * 2 + p.ph, 0, 7); ctx.fill() }
  CO.petals = CO.petals.filter(p => p.life > 0)
  for (const s of CO.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  CO.shout = CO.shout.filter(s => s.t > 0)
}

// ───────────────────────────── WOODSBORO (Scream / horror; render-only, wall clock, own PRNG) ─────────────────────────────
// No sheet — drawn in code over a generated street floor: a quiet suburb at night — two-storey houses with porches and
// lit windows, picket fences, bare trees, street lamps with moths, a fog bank, the moon; Ghostface / Jason stand on the
// sidewalk if they aren't fighting (shared crowd); a mask peeks out from behind a tree now and then. Big hit → a phone
// rings in a house, a porch light snaps on, a dog barks ("WHAT'S YOUR FAVORITE SCARY MOVIE?"); ≤25% → the power cuts:
// lamps flicker and die, lightning, a Ghostface silhouette stands in every window; KO → police lights wash the street,
// the houses light up again — but one window keeps its masked figure… "…OR IS IT?"
let _wbSeed = 0xbb67ae85 ^ 0x3c6ef372
const wbRnd = () => { _wbSeed ^= _wbSeed << 13; _wbSeed ^= _wbSeed >>> 17; _wbSeed ^= _wbSeed << 5; return (_wbSeed >>> 0) / 4294967296 }
const WB_CROWD = [["ghostface", 0.18, 0], ["jason", 0.84, 0]]
const WBC = makeCrowd(WB_CROWD, 0.6)
const WB = { p1: null, last: 0, skyLast: 0, hp: new WeakMap(), rings: [], power: 1, flash: 0, nextBolt: 0, cops: 0, ko: null, peek: null, nextPeek: 4, shout: [],
  st: { rings: 0, blackout: 0, ko: 0, peeks: 0, bolts: 0 } }
export const woodsboroState = () => ({ ...WB.st, kills: WBK.kills, bodies: WBK.bodies.length, hunting: WBK.list.map(e => e.type), power: +WB.power.toFixed(2), cops: +WB.cops.toFixed(2), ko: WB.ko ? +WB.ko.t.toFixed(2) : 0,
  crowd: crowdState(WBC), shouting: WB.shout.filter(s => s.t > 0).map(s => s.txt) })
function wbShout(x, y, txt, col) { if (WB.shout.filter(s => s.t > 0).length < 3) WB.shout.push({ x, y, txt, col: col || "#222", t: 2.2 }) }
function wbMask(ctx, x, y, s) {   // the Ghostface mask: a long white face, black eyes + mouth, under a black hood
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = "#08080a"; ctx.beginPath(); ctx.ellipse(0, 2, 13, 17, 0, 0, 7); ctx.fill()
  ctx.fillStyle = "#ecece6"; ctx.beginPath(); ctx.ellipse(0, 3, 8.5, 12.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#08080a"
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 3.6, -1, 2.4, 4, d * 0.25, 0, 7); ctx.fill() } ctx.beginPath(); ctx.ellipse(0, 9, 2.4, 4.4, 0, 0, 7); ctx.fill(); ctx.restore()
}
function wbHouse(ctx, x, base, w, k, t, lit, masked) {   // a two-storey suburban house: siding, gable roof, porch, windows
  const pal = [["#c8c0b0", "#8a5a4a"], ["#9ab0c0", "#4a4a5a"], ["#d8c890", "#6a4a3a"], ["#b0a8c8", "#3a3a4a"], ["#c0a890", "#5a3a2a"]][Math.floor(_h(k * 2.3) * 5)]
  const h = 150, night = 0.42
  ctx.fillStyle = pal[0]; ctx.globalAlpha = 1; ctx.fillRect(x, base - h, w, h)
  ctx.fillStyle = `rgba(10,14,40,${1 - night})`; ctx.fillRect(x, base - h, w, h)
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1; for (let y = base - h + 6; y < base; y += 6) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke() }
  ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.moveTo(x - 12, base - h); ctx.lineTo(x + w / 2, base - h - 70); ctx.lineTo(x + w + 12, base - h); ctx.fill(); ctx.fillStyle = "rgba(10,14,40,0.55)"; ctx.fill()
  ctx.fillStyle = "#2a2a30"; ctx.fillRect(x + w * 0.72, base - h - 60, 16, 34)
  // porch
  ctx.fillStyle = "#3a3438"; ctx.fillRect(x + w * 0.25, base - 70, w * 0.5, 6); ctx.fillStyle = "#6a6066"; for (const px of [0.27, 0.72]) ctx.fillRect(x + w * px, base - 64, 4, 64)
  ctx.fillStyle = "#2a1e1a"; ctx.fillRect(x + w * 0.44, base - 52, w * 0.12, 52)
  const wins = [[0.12, -128], [0.62, -128], [0.12, -58], [0.62, -58]]
  wins.forEach(([fx, fy], i) => { const wx = x + w * fx, wy = base + fy, ww = w * 0.24, wh = 34, on = lit && _h(k * 7 + i) < 0.6
    ctx.fillStyle = on ? "#f2d890" : "#14182a"; ctx.fillRect(wx, wy, ww, wh); if (on) { ctx.fillStyle = "rgba(242,216,144,0.12)"; ctx.fillRect(wx - 8, wy - 8, ww + 16, wh + 16) }
    if (on && _h(k * 11 + i) < 0.3) { const sx = wx + ww * 0.5, a = Math.sin(t * 7 + k + i) > 0 ? -1.9 : 0.4   // shadow play: a killer stabbing, a victim recoiling
      ctx.fillStyle = "#1a0a08"; ctx.beginPath(); ctx.arc(sx - 9, wy + 11, 4, 0, 7); ctx.fill(); ctx.fillRect(sx - 13, wy + 15, 8, wh - 15)
      ctx.save(); ctx.translate(sx - 6, wy + 17); ctx.rotate(a); ctx.fillRect(0, -1.5, 12, 3); ctx.fillRect(12, -1, 8, 2); ctx.restore()
      ctx.save(); ctx.translate(sx + 9, wy + wh); ctx.rotate(0.35 + 0.1 * Math.sin(t * 7)); ctx.beginPath(); ctx.arc(0, -20, 3.6, 0, 7); ctx.fill(); ctx.fillRect(-3, -16, 6, 16); ctx.restore()
      ctx.fillStyle = "rgba(140,0,0,0.55)"; ctx.fillRect(wx + 3, wy + 3, ww * 0.4, 3) }
    if (_h(k * 17 + i * 3) < 0.25) { ctx.fillStyle = "rgba(130,0,0,0.85)"; const hx = wx + ww * (0.3 + 0.4 * _h(k + i)), hy = wy + wh * 0.45; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 7); ctx.fill(); for (let f = 0; f < 5; f++) ctx.fillRect(hx - 4 + f * 2, hy - 8 + Math.abs(f - 2), 1.4, 5); ctx.fillRect(hx - 1, hy + 3, 2, 10) }
    if (masked && (masked === true || masked === i)) { ctx.fillStyle = "#3a3e58"; ctx.fillRect(wx, wy, ww, wh); ctx.fillStyle = "#08080a"; ctx.fillRect(wx + ww * 0.22, wy + 14, ww * 0.56, wh - 14); wbMask(ctx, wx + ww / 2, wy + 13, 0.95) }
    ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke() })
  if (lit && _h(k * 3) < 0.5) { ctx.fillStyle = "rgba(255,220,140,0.25)"; ctx.beginPath(); ctx.arc(x + w * 0.5, base - 62, 22, 0, 7); ctx.fill() }
}
function wbTree(ctx, x, base, h, k) { ctx.strokeStyle = "#2a2a36"; ctx.lineCap = "round"
  const br = (x0, y0, a, len, d) => { if (d > 5 || len < 4) return; const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; ctx.lineWidth = Math.max(1, 9 - d * 1.7); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
    br(x1, y1, a - 0.45 - 0.2 * _h(k + d), len * 0.72, d + 1); br(x1, y1, a + 0.4 + 0.2 * _h(k * 3 + d), len * 0.7, d + 1) }
  br(x, base, -Math.PI / 2, h * 0.35, 0) }
function drawWoodsboroBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S, pw = WB.power
  const dt = Math.min(0.05, Math.max(0, t - (WB.skyLast || t))); WB.skyLast = t
  const g = ctx.createLinearGradient(0, dockTop - 330, 0, dockTop); g.addColorStop(0, "#06020a"); g.addColorStop(0.6, "#1e0a14"); g.addColorStop(1, "#3a1218"); ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  { const mx = W / 2 + shift(0.03, W) + 260, my = dockTop - 235; const mg = ctx.createRadialGradient(mx, my, 20, mx, my, 150); mg.addColorStop(0, "rgba(220,40,40,0.4)"); mg.addColorStop(1, "rgba(220,40,40,0)"); ctx.fillStyle = mg; ctx.fillRect(mx - 150, my - 150, 300, 300)
    ctx.fillStyle = "#c8323a"; ctx.beginPath(); ctx.arc(mx, my, 38, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(90,10,14,0.5)"; for (const [a, b, r] of [[-12, -8, 9], [10, 6, 7], [4, -16, 5]]) { ctx.beginPath(); ctx.arc(mx + a, my + b, r, 0, 7); ctx.fill() }
    ctx.fillStyle = "rgba(14,6,10,0.85)"; ctx.beginPath(); ctx.ellipse(mx + 20, my + 14, 70, 9, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = "#0a0408"; ctx.lineWidth = 2; for (let b = 0; b < 5; b++) { const bx = mx - 220 + ((t * 30 + b * 90) % 480), by = my - 30 + 20 * Math.sin(t * 0.7 + b * 2), fl = 5 * Math.sin(t * 9 + b); ctx.beginPath(); ctx.moveTo(bx - 8, by - fl); ctx.quadraticCurveTo(bx - 3, by - 2, bx, by); ctx.quadraticCurveTo(bx + 3, by - 2, bx + 8, by - fl); ctx.stroke() } }
  if (WB.flash > 0) { WB.flash = Math.max(0, WB.flash - dt * 4); ctx.fillStyle = `rgba(200,210,255,${0.5 * WB.flash})`; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop) }
  // far tree line
  { const ps = shift(0.25, W); ctx.fillStyle = "#0a0c16"; ctx.beginPath(); ctx.moveTo(padL, dockTop - 120 * S); for (let x = padL; x <= padR + 20; x += 20) ctx.lineTo(x, dockTop - (120 + 20 * Math.sin((x - ps) / 50) + 12 * Math.sin((x - ps) / 17)) * S); ctx.lineTo(padR, dockTop); ctx.lineTo(padL, dockTop); ctx.fill() }
  // the houses, trees, fences, lamps (one street, repeating)
  const ps = shift(0.9, W), step = 300, base = dockTop - 6 * S, masked = WB.st.blackout && !WB.ko ? true : WB.ko && WB.ko.t > 2 ? 1 : false
  for (let i = Math.floor((padL - ps) / step) - 1; i * step + ps < padR + step; i++) { const x = i * step + ps
    wbHouse(ctx, x + 30, base, 200, i, t, pw > 0.5, masked === true ? (Math.abs(i) % 2 ? 2 : 0) : masked === 1 && i === 0 ? 1 : false)
    wbTree(ctx, x + 260, base, 260, i * 3.1)
    ctx.fillStyle = "#c8c8cc"; for (let j = 0; j < 12; j++) { const fx = x + 6 + j * 12; ctx.fillRect(fx, base - 26, 6, 26); ctx.beginPath(); ctx.moveTo(fx, base - 26); ctx.lineTo(fx + 3, base - 31); ctx.lineTo(fx + 6, base - 26); ctx.fill() } ctx.fillRect(x + 4, base - 20, 142, 3)
    ctx.fillStyle = "rgba(10,14,40,0.45)"; ctx.fillRect(x + 4, base - 31, 142, 31)
    const kind = ((i % 4) + 4) % 4
    if (kind === 2) wbFire(ctx, x + 30, base, 200, t, i)
    if (kind === 3) { ctx.save(); ctx.font = "900 22px Arial"; ctx.fillStyle = "#8a0a0a"; ctx.fillText("HELP", x + 40, base - 6); ctx.fillStyle = "rgba(138,10,10,0.8)"; for (let d = 0; d < 4; d++) ctx.fillRect(x + 44 + d * 15, base - 4, 2, 6 + 6 * _h(i * 7 + d)); ctx.restore() }
    if (kind === 0) { ctx.save(); ctx.translate(x + 4, base - 22); ctx.rotate(-0.04); ctx.fillStyle = "#e8c820"; ctx.fillRect(0, 0, 150, 9); ctx.font = "900 8px Arial"; ctx.fillStyle = "#111"; ctx.fillText("CRIME SCENE · DO NOT CROSS", 8, 7.5); ctx.restore() }
    if (kind === 1) { const cx = x + 210, cy = base + 2   // a crashed car, door open, hazards blinking, a blood smear
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.08); ctx.fillStyle = "#3a3e48"; ctx.fillRect(-46, -26, 92, 18); ctx.beginPath(); ctx.moveTo(-28, -26); ctx.lineTo(-18, -40); ctx.lineTo(20, -40); ctx.lineTo(30, -26); ctx.fill()
      ctx.fillStyle = "#9ab0c8"; ctx.fillRect(-16, -37, 16, 10); ctx.fillRect(4, -37, 14, 10); ctx.fillStyle = "#111"; for (const wx of [-30, 30]) { ctx.beginPath(); ctx.arc(wx, -8, 8, 0, 7); ctx.fill() }
      ctx.fillStyle = "#2a2e36"; ctx.save(); ctx.translate(-2, -26); ctx.rotate(-0.9); ctx.fillRect(0, 0, 20, 16); ctx.restore(); ctx.fillStyle = "rgba(140,0,0,0.85)"; ctx.fillRect(-4, -24, 14, 3)
      const on = Math.floor(t * 2.5) % 2; ctx.fillStyle = on ? "#ffb020" : "#5a3a10"; ctx.fillRect(40, -24, 6, 5); ctx.fillRect(-46, -24, 6, 5); ctx.fillStyle = "rgba(255,250,210,0.25)"; ctx.beginPath(); ctx.moveTo(46, -20); ctx.lineTo(140, -40); ctx.lineTo(140, 6); ctx.fill(); ctx.restore() } }
  wbSlashers(ctx, { W, dockTop, padL, padR, S, t, dt, rate: WB.st.blackout && !WB.ko ? 1.8 : 1 })
  // the mask peeking from behind a tree
  if (!WB.peek && t > WB.nextPeek && !WB.ko) { WB.peek = { t: 0, x: Math.floor((W / 2 - ps) / step) * step + ps + 260 + (wbRnd() < 0.5 ? -step : step) }; WB.st.peeks++ }
  if (WB.peek) { const p = WB.peek; p.t += dt; const out = Math.min(1, p.t / 0.6, Math.max(0, (2.4 - p.t) / 0.6)); wbMask(ctx, p.x + 6 + out * 8, base - 150 * 0.85, 1.1 * S * 0.6); if (p.t > 2.4) { WB.peek = null; WB.nextPeek = t + 6 + 6 * wbRnd() } }
}
function woodsboroFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S
  if (F[0] !== WB.p1) { Object.assign(WB, { p1: F[0], hp: new WeakMap(), rings: [], power: 1, flash: 0, nextBolt: 0, cops: 0, ko: null, shout: [] }); for (const k in WB.st) WB.st[k] = 0; Object.assign(WBK, { list: [], bodies: [], drops: [], next: t + 0.6, kills: 0 }) }
  const dt = Math.min(0.05, Math.max(0, t - (WB.last || t))); WB.last = t
  woodsboroAudioTick(t, WB.st.blackout && !WB.ko ? 1 - WB.power * 0.5 : 0)   // wind, drone, far-off screams, heartbeat in the blackout
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + def.standRow * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = WB.hp.get(f); WB.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big) WBK.next = Math.min(WBK.next, t + 0.2)   // a big hit: another hunt starts right away
  if (big && !WB.ko) { wbPhone(0, 0.2); WB.st.rings++; const x = mid + (wbRnd() < 0.5 ? -1 : 1) * (180 + wbRnd() * 200); WB.rings.push({ x, t: 0 })
    wbShout(x, dockTop - 105 * S, ["*RING RING*  \"WHAT'S YOUR FAVORITE SCARY MOVIE?\"", "WOOF! WOOF! WOOF!", "*RING RING*  \"DO YOU LIKE SCARY MOVIES?\""][(WB.st.rings - 1) % 3], "#8a1a1a") }
  if (low && !WB.st.blackout && !WB.ko) { WB.st.blackout++; wbShout(mid, feet - 230, "…THE POWER'S OUT.", "#8a1a1a") }
  if (WB.st.blackout && !WB.ko) { WB.power = Math.max(0, WB.power - dt * 0.9); if (t > WB.nextBolt) { WB.nextBolt = t + 1.5 + 2 * wbRnd(); WB.flash = 1; WB.st.bolts++; wbThunder(0.55) } }
  if (ko && !WB.ko) { WB.ko = { t: 0 }; WB.st.ko++; wbSiren(0.22); wbShout(mid, feet - 240, "WOODSBORO PD! NOBODY MOVE!", "#1a3aa8") }
  if (WB.ko) { WB.ko.t += dt; WB.cops = Math.min(1, WB.cops + dt); if (WB.ko.t > 1) WB.power = Math.min(1, WB.power + dt * 0.8); if (WB.ko.t > 2.2 && !WB.ko.said) { WB.ko.said = true; wbShout(mid, feet - 280, "IT'S OVER… OR IS IT?", "#8a1a1a") } }
  // street lamps (they flicker and die in the blackout)
  { const ps = shift(0.95, W), step = 420; for (let i = Math.floor((padL - ps) / step) - 1; i * step + ps < padR + step; i++) { const x = i * step + ps + 140, top = dockTop - 210 * S * 0.75
    const on = WB.power > 0.5 ? (Math.sin(t * 23 + i * 7) > -0.97) : WB.power > 0.05 && Math.sin(t * 31 + i) > 0.6
    ctx.fillStyle = "#1a1a20"; ctx.fillRect(x - 3, top, 6, dockTop - top + 6); ctx.fillRect(x - 3, top, 34, 5); ctx.fillStyle = on ? "#fff4c8" : "#3a3a40"; ctx.fillRect(x + 22, top + 4, 14, 6)
    if (on) { const gr = ctx.createLinearGradient(0, top, 0, feet + 20); gr.addColorStop(0, "rgba(255,240,190,0.28)"); gr.addColorStop(1, "rgba(255,240,190,0)"); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x + 22, top + 10); ctx.lineTo(x + 36, top + 10); ctx.lineTo(x + 100, feet + 20); ctx.lineTo(x - 40, feet + 20); ctx.fill()
      for (let m = 0; m < 3; m++) { ctx.fillStyle = "rgba(240,230,200,0.8)"; ctx.fillRect(x + 29 + Math.sin(t * 7 + m * 2) * 12, top + 14 + Math.cos(t * 5 + m) * 8, 2, 2) } } } }
  // the street is a crime scene: blood pools, smears and drag trails, a dropped knife (world-locked)
  for (let x = Math.floor((padL - 300) / 230) * 230; x < padR + 300; x += 230) { if (_h(x * 0.37) > 0.55) continue
    const y = dockTop + 40 + 90 * _h(x * 1.3), r = 14 + 22 * _h(x * 2.1)
    ctx.fillStyle = "rgba(90,0,0,0.85)"; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r * 0.35, 0, 0, 7); ctx.fill()
    for (let d = 0; d < 6; d++) { ctx.beginPath(); ctx.ellipse(x + (_h(x + d) - 0.5) * r * 5, y + (_h(x * 3 + d) - 0.5) * r * 0.8, 2 + 3 * _h(d + x), 1.2 + _h(d * x), 0, 0, 7); ctx.fill() }
    if (_h(x * 5) < 0.4) { ctx.fillStyle = "rgba(90,0,0,0.6)"; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + 160 * (_h(x * 7) < 0.5 ? -1 : 1), y - 30); ctx.lineTo(x + 160 * (_h(x * 7) < 0.5 ? -1 : 1), y - 24); ctx.lineTo(x, y + 3); ctx.fill() }
    if (_h(x * 9) < 0.3) { ctx.save(); ctx.translate(x + r * 2, y + 4); ctx.rotate(_h(x) * 6); wbKnife(ctx, 18, true); ctx.restore() } }
  drawCrowd(ctx, WBC, { W, feet, sh: shift(0.9, W) })
  // ringing phones: a little glow + rings in a window
  for (const r of WB.rings) { r.t += dt; const a = Math.max(0, 1 - r.t / 2.2); for (let j = 0; j < 3; j++) { const rr = ((r.t * 60 + j * 14) % 42); ctx.strokeStyle = `rgba(255,230,160,${a * (1 - rr / 42)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, dockTop - 120 * S * 0.7, rr, -0.8, 0.8); ctx.stroke() } }
  WB.rings = WB.rings.filter(r => r.t < 2.2)
  // fog bank
  for (let i = 0; i < 3; i++) { const y = feet - 10 - i * 34, sx = ((t * (14 + i * 6)) % 600), gr = ctx.createLinearGradient(0, y - 40, 0, y + 40); gr.addColorStop(0, "rgba(170,180,200,0)"); gr.addColorStop(0.5, `rgba(170,180,200,${0.13 + 0.06 * (1 - WB.power)})`); gr.addColorStop(1, "rgba(170,180,200,0)")
    ctx.fillStyle = gr; ctx.fillRect(padL - 600 + sx, y - 40, padR - padL + 1200, 80) }
  { const cx = (padL + padR) / 2, vg = ctx.createRadialGradient(cx, dockTop - 60, 200, cx, dockTop - 60, (padR - padL) * 0.75); vg.addColorStop(0, "rgba(40,0,6,0)"); vg.addColorStop(1, `rgba(40,0,6,${0.55 + 0.1 * Math.sin(t * 1.3)})`); ctx.fillStyle = vg; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  if (WB.power < 1) { ctx.fillStyle = `rgba(2,4,12,${0.45 * (1 - WB.power)})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  if (WB.cops > 0) { const ph = Math.floor(t * 6) % 2; ctx.fillStyle = ph ? `rgba(230,40,40,${0.16 * WB.cops})` : `rgba(40,80,240,${0.16 * WB.cops})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  for (const s of WB.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  WB.shout = WB.shout.filter(s => s.t > 0)
}

// ───────────────────────────── PK ACADEMY (The Disastrous Life of Saiki K.; render-only, wall clock, own PRNG) ─────────────────────────────
// No sheet — drawn in code over a generated schoolyard floor: a bright spring sky, the white school building with its
// clock, rows of classroom windows, cherry trees in bloom shedding petals, the school fence + gate, students in uniform
// chatting and walking; Saiki watches if he isn't fighting (shared crowd). Big hit → the students gasp and crowd the
// windows ("WHOA!"); ≤25% → a METEOR appears in the sky, heading straight for the school; KO → it stops dead and
// shatters into sparkles — Saiki saved the world again, and nobody noticed ("…Good grief.").
let _pkSeed = 0xa54ff53a ^ 0x510e527f
const pkRnd = () => { _pkSeed ^= _pkSeed << 13; _pkSeed ^= _pkSeed >>> 17; _pkSeed ^= _pkSeed << 5; return (_pkSeed >>> 0) / 4294967296 }
const PK_CROWD = [["saiki", 0.8, 0]]
const PKC = makeCrowd(PK_CROWD, 0.6)
const PK = { p1: null, last: 0, skyLast: 0, hp: new WeakMap(), petals: null, kids: null, gasp: 0, meteor: 0, shatter: null, bits: [], shout: [],
  st: { gasps: 0, meteor: 0, saved: 0 } }
export const pkState = () => ({ ...PK.st, petals: (PK.petals || []).length, kids: (PK.kids || []).length, gasp: +PK.gasp.toFixed(2), meteor: +PK.meteor.toFixed(2), shatter: PK.shatter ? +PK.shatter.t.toFixed(2) : 0,
  crowd: crowdState(PKC), shouting: PK.shout.filter(s => s.t > 0).map(s => s.txt) })
function pkShout(x, y, txt, col) { if (PK.shout.filter(s => s.t > 0).length < 3) PK.shout.push({ x, y, txt, col: col || "#222", t: 2.2 }) }
function pkTree(ctx, x, base, s, t, k) {   // a cherry tree in bloom
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s)
  ctx.strokeStyle = "#5a3a2e"; ctx.lineCap = "round"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -50, 4, -90); ctx.stroke()
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(2, -70); ctx.lineTo(-40, -110); ctx.moveTo(4, -80); ctx.lineTo(44, -116); ctx.stroke()
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 34 + 16 * _h(k * 9 + i), bx = Math.cos(a) * r * 1.4, by = -118 + Math.sin(a) * r * 0.7 + Math.sin(t * 1.2 + i) * 1.5
    ctx.fillStyle = ["#f8c8d8", "#f4b0c8", "#fbd8e4"][i % 3]; ctx.beginPath(); ctx.arc(bx, by, 22 + 6 * _h(i + k), 0, 7); ctx.fill() }
  ctx.restore()
}
function pkKid(ctx, k, x, y, s, t) {   // a student: gakuran (boys) or sailor uniform (girls)
  const sw = k.go ? Math.sin(t * 6 + k.ph) * 0.35 : 0, hop = PK.gasp > 0 ? Math.abs(Math.sin(t * 8 + k.ph)) * 5 * PK.gasp : 0
  ctx.save(); ctx.translate(x, y - hop); ctx.scale(s * k.dir, s)
  ctx.fillStyle = "#1a1a22"; ctx.fillRect(-4 + sw * 6, -16, 3.5, 16); ctx.fillRect(1 - sw * 6, -16, 3.5, 16)
  if (k.girl) { ctx.fillStyle = "#24305a"; ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(8, -26); ctx.lineTo(10, -14); ctx.lineTo(-10, -14); ctx.fill(); ctx.fillStyle = "#f4f4f0"; ctx.fillRect(-7, -44, 14, 18); ctx.fillStyle = "#24305a"; ctx.fillRect(-7, -44, 14, 4); ctx.fillStyle = "#d02a3a"; ctx.beginPath(); ctx.moveTo(-3, -40); ctx.lineTo(3, -40); ctx.lineTo(0, -34); ctx.fill() }
  else { ctx.fillStyle = "#1e2230"; ctx.fillRect(-7, -44, 14, 30); ctx.fillStyle = "#c8a840"; ctx.fillRect(-1, -40, 2, 2); ctx.fillRect(-1, -33, 2, 2) }
  ctx.fillStyle = "#f2d2b2"; ctx.beginPath(); ctx.arc(0, -50, 6.5, 0, 7); ctx.fill()
  ctx.fillStyle = k.hair; ctx.beginPath(); ctx.arc(0, -52, 7, Math.PI, 0); ctx.fill(); if (k.girl) ctx.fillRect(-7, -52, 3, 12), ctx.fillRect(4, -52, 3, 12)
  if (PK.gasp > 0.3) { ctx.fillStyle = "#3a2a2a"; ctx.beginPath(); ctx.ellipse(2.5, -47, 1.6, 2.4, 0, 0, 7); ctx.fill() }
  ctx.restore()
}
function drawPkBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S, m = PK.meteor
  const dt = Math.min(0.05, Math.max(0, t - (PK.skyLast || t))); PK.skyLast = t
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, m ? `rgb(${120 + 100 * m | 0},${170 - 60 * m | 0},${230 - 120 * m | 0})` : "#7ac0f0"); g.addColorStop(1, "#ffd6e8")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  for (let i = 0; i < 6; i++) { const x = padL + ((i * 300 + t * 8 + shift(0.1, W)) % (padR - padL + 400)) - 200, y = dockTop - (300 + 60 * _h(i * 3)) * S
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.ellipse(x, y, 70, 20, 0, 0, 7); ctx.ellipse(x + 40, y - 12, 44, 18, 0, 0, 7); ctx.fill() }
  // the school building with its clock
  { const ps = shift(0.6, W), bw = 900, base = dockTop - 34 * S, h = 210 * S * 0.7
    for (let i = Math.floor((padL - ps) / (bw + 300)) - 1; i * (bw + 300) + ps < padR + bw; i++) { const x = i * (bw + 300) + ps - bw / 2 + W / 2 - (W / 2) % (bw + 300)
      ctx.fillStyle = "#f2f0ea"; ctx.fillRect(x, base - h, bw, h); ctx.fillStyle = "#d8d4ca"; ctx.fillRect(x + bw - 30, base - h, 30, h); ctx.fillStyle = "#c8c4ba"; for (let f = 1; f < 4; f++) ctx.fillRect(x, base - h * f / 4 - 3, bw, 5)
      for (let f = 0; f < 4; f++) for (let j = 0; j < 14; j++) { const wx = x + 20 + j * (bw - 40) / 14, wy = base - h * (f + 1) / 4 + 10, ww = (bw - 40) / 14 - 10, wh = h / 4 - 22
        ctx.fillStyle = "#9ac8e8"; ctx.fillRect(wx, wy, ww, wh); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(wx + 3, wy + 3, ww * 0.3, wh - 6)
        if (PK.gasp > 0.2 && _h(f * 31 + j * 7 + i) < 0.5) { ctx.fillStyle = "#f2d2b2"; ctx.beginPath(); ctx.arc(wx + ww / 2, wy + wh - 8, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#2a2020"; ctx.beginPath(); ctx.arc(wx + ww / 2, wy + wh - 10, 5.4, Math.PI, 0); ctx.fill() } }
      const cx = x + bw / 2, cy = base - h - 30; ctx.fillStyle = "#f2f0ea"; ctx.fillRect(cx - 50, base - h - 60, 100, 60); ctx.beginPath(); ctx.moveTo(cx - 60, base - h - 60); ctx.lineTo(cx, base - h - 92); ctx.lineTo(cx + 60, base - h - 60); ctx.fillStyle = "#c86a5a"; ctx.fill()
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fill(); ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 2.5; ctx.stroke()
      const hr = t / 60 % 12 / 12 * Math.PI * 2, mn = t % 60 / 60 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(hr) * 11, cy - Math.cos(hr) * 11); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(mn) * 17, cy - Math.cos(mn) * 17); ctx.stroke() } }
  // cherry trees + the fence and gate
  { const ps = shift(0.85, W); for (let i = Math.floor((padL - ps) / 420) - 1; i * 420 + ps < padR + 420; i++) pkTree(ctx, i * 420 + ps + 60 * _h(i * 2.2), dockTop - 4 * S, S * 0.58, t, i)
    ctx.strokeStyle = "#6a7a6a"; ctx.lineWidth = 2; for (let x = padL - ((padL - ps) % 14 + 14) % 14; x < padR; x += 14) { ctx.beginPath(); ctx.moveTo(x, dockTop - 2); ctx.lineTo(x, dockTop - 40); ctx.stroke() }
    ctx.fillStyle = "#6a7a6a"; ctx.fillRect(padL, dockTop - 42, padR - padL, 4); ctx.fillRect(padL, dockTop - 20, padR - padL, 3) }
  // the meteor (≤25%), or its shattering (KO)
  if (m > 0 && !PK.shatter) { const k = m, mx = W / 2 + shift(0.05, W) + 260 - 200 * k, my = dockTop - (330 - 170 * k) * S, R = 20 + 50 * k
    ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,${160 - i * 12},60,${0.12})`; ctx.beginPath(); ctx.ellipse(mx + 40 + i * 22, my - 30 - i * 16, R * (1 + i * 0.2), R * 0.6, -0.6, 0, 7); ctx.fill() } ctx.restore()
    ctx.fillStyle = "#5a4a40"; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill(); ctx.fillStyle = "#3a2e28"; for (const [dx, dy, r] of [[-0.3, -0.2, 0.25], [0.3, 0.2, 0.2], [0.1, -0.4, 0.15]]) { ctx.beginPath(); ctx.arc(mx + dx * R, my + dy * R, r * R, 0, 7); ctx.fill() }
    ctx.strokeStyle = "rgba(255,170,80,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, my, R + 2, 0, 7); ctx.stroke() }
}
function pkFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S
  if (F[0] !== PK.p1) { Object.assign(PK, { p1: F[0], hp: new WeakMap(), kids: null, gasp: 0, meteor: 0, shatter: null, bits: [], shout: [] }); for (const k in PK.st) PK.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (PK.last || t))); PK.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + def.standRow * S
  let big = null, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = PK.hp.get(f); PK.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = f }
  if (big && !PK.shatter) { PK.st.gasps++; PK.gasp = 1; if (PK.st.gasps % 2 === 1) pkShout(mid + (pkRnd() - 0.5) * 300, dockTop - 130 * S, ["WHOA!!", "IS THAT EVEN LEGAL?!", "SOMEONE GET A TEACHER!"][Math.floor(PK.st.gasps / 2) % 3], "#a02a5a") }
  PK.gasp = Math.max(0, PK.gasp - dt * 0.4)
  if (low && !PK.st.meteor && !PK.shatter) { PK.st.meteor++; pkShout(mid, feet - 230, "IS THAT… A METEOR?!", "#a02a2a") }
  if (PK.st.meteor && !PK.shatter) PK.meteor = Math.min(1, PK.meteor + dt * 0.35)
  if (ko && !PK.shatter) { PK.shatter = { t: 0 }; PK.st.saved++; const k = Math.max(0.3, PK.meteor), mx = W / 2 + shift(0.05, W) + 260 - 200 * k, my = dockTop - (330 - 170 * k) * S
    if (PK.meteor > 0) for (let i = 0; i < 80; i++) { const a = pkRnd() * Math.PI * 2, v = 60 + 220 * pkRnd(); PK.bits.push({ x: mx, y: my, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 2 }) }
    PK.meteor = 0; pkShout(mid, feet - 250, "…Good grief.", "#d02a8a") }
  if (PK.shatter) PK.shatter.t += dt
  drawCrowd(ctx, PKC, { W, feet, sh: shift(0.9, W) })
  // students
  if (!PK.kids) PK.kids = Array.from({ length: 9 }, (_, i) => ({ x: padL + (padR - padL) * ((i * 0.31 + 0.05) % 1), dir: i % 2 ? -1 : 1, v: 20 + 16 * _h(i), go: i % 3 !== 0, ph: i, girl: i % 2 === 0, hair: ["#2a1e1a", "#5a3a2a", "#1a1a2a", "#8a5a2a"][i % 4], lane: 0.2 + 0.6 * _h(i * 7) }))
  for (const k of PK.kids) { if (k.go) { k.x += k.dir * k.v * dt; if (k.x < padL - 30) k.dir = 1; if (k.x > padR + 30) k.dir = -1 }
    pkKid(ctx, k, k.x, feet - (8 + 14 * k.lane) * S, S * 0.62, t) }
  // petals
  if (!PK.petals) PK.petals = Array.from({ length: 70 }, (_, i) => ({ x: (i * 0.137) % 1, y: (i * 0.611) % 1, v: 0.4 + 0.4 * ((i * 0.37) % 1), ph: i }))
  for (const p of PK.petals) { p.y = (p.y + p.v * dt * 0.1) % 1; const x = padL + (padR - padL) * ((p.x + Math.sin(t * 0.6 + p.ph) * 0.02 + 1) % 1), y = dockTop - 500 + (coverBottom - dockTop + 500) * p.y
    ctx.fillStyle = "rgba(250,180,205,0.9)"; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.4, t * 2 + p.ph, 0, 7); ctx.fill() }
  // the shattered meteor's sparkles
  for (const b of PK.bits) { b.life -= dt; b.vx *= 0.98; b.vy = b.vy * 0.98 + 20 * dt; b.x += b.vx * dt; b.y += b.vy * dt; const a = Math.max(0, Math.min(1, b.life))
    ctx.fillStyle = `rgba(255,${200 + 55 * Math.sin(b.life * 9) | 0},230,${a})`; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.life * 4); ctx.fillRect(-3, -0.8, 6, 1.6); ctx.fillRect(-0.8, -3, 1.6, 6); ctx.restore() }
  PK.bits = PK.bits.filter(b => b.life > 0)
  if (PK.meteor > 0.5) { ctx.fillStyle = `rgba(255,140,60,${0.12 * (PK.meteor - 0.5)})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  for (const s of PK.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  PK.shout = PK.shout.filter(s => s.t > 0)
}

// ───────────────────────────── THE ANALYSIS NEXUS (original universe; render-only, wall clock, own PRNG) ─────────────────────────────
// No sheet — drawn in code over a generated data-grid floor: a dark teal void, the central DATA CORE (a pillar of light
// with rings orbiting it), holographic panels with scrolling readouts and graphs, circuit traces pulsing down to the
// floor, floating data cubes; Omololu / Dseyl / Enoch watch if not fighting (shared crowd). Big hit → a holo readout pops
// up over the fight: "ANALYZING… IMPACT +N"; ≤25% → SYSTEM ALERT: everything goes red, glitch bands tear across the
// screen; KO → the core overloads — a cascade of 0s and 1s rains down, a white flash, "ANALYSIS COMPLETE."
let _nxSeed = 0x6a09e667 ^ 0xbb67ae85
const nxRnd = () => { _nxSeed ^= _nxSeed << 13; _nxSeed ^= _nxSeed >>> 17; _nxSeed ^= _nxSeed << 5; return (_nxSeed >>> 0) / 4294967296 }
const NX_CROWD = [["omololu", 0.14, 0], ["dseyl", 0.5, 0], ["enoch", 0.86, 0]]
const NXC = makeCrowd(NX_CROWD, 0.6)
const NX = { p1: null, last: 0, hp: new WeakMap(), reads: [], alert: 0, done: null, rain: [], cubes: null, flash: 0, shout: [],
  st: { reads: 0, alert: 0, done: 0 } }
export const nexusState = () => ({ ...NX.st, alert: +NX.alert.toFixed(2), done: NX.done ? +NX.done.t.toFixed(2) : 0, rain: NX.rain.length, cubes: (NX.cubes || []).length,
  crowd: crowdState(NXC), shouting: NX.shout.filter(s => s.t > 0).map(s => s.txt) })
function nxShout(x, y, txt, col) { if (NX.shout.filter(s => s.t > 0).length < 3) NX.shout.push({ x, y, txt, col: col || "#0a5a5a", t: 2.2 }) }
const nxCol = (a, al) => a > 0.5 ? `rgba(255,70,80,${al})` : `rgba(45,212,191,${al})`
function nxPanel(ctx, x, y, w, h, t, k, a) {   // a holographic panel: frame, scrolling text rows, a live graph
  ctx.fillStyle = a > 0.5 ? "rgba(60,8,14,0.55)" : "rgba(4,40,44,0.55)"; ctx.fillRect(x, y, w, h); ctx.strokeStyle = nxCol(a, 0.8); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h)
  ctx.fillStyle = nxCol(a, 0.9); ctx.fillRect(x, y, w, 8)
  for (let r = 0; r < 5; r++) { const ww = (0.3 + 0.6 * _h(k * 13 + r + Math.floor(t * 2))) * (w - 16); ctx.fillStyle = nxCol(a, 0.45); ctx.fillRect(x + 8, y + 16 + r * 10, ww, 4) }
  ctx.strokeStyle = nxCol(a, 0.9); ctx.beginPath(); for (let i = 0; i <= 20; i++) { const gx = x + 8 + i * (w - 16) / 20, gy = y + h - 12 - (0.5 + 0.45 * Math.sin(t * 2 + i * 0.7 + k)) * (h * 0.35); i ? ctx.lineTo(gx, gy) : ctx.moveTo(gx, gy) } ctx.stroke()
}
function drawNexusBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S, a = NX.alert
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, a > 0.5 ? "#1a0408" : "#020c10"); g.addColorStop(1, a > 0.5 ? "#3a0a10" : "#0a2e33")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  // far grid wall
  { const ps = shift(0.2, W); ctx.strokeStyle = nxCol(a, 0.08); ctx.lineWidth = 1
    for (let x = padL - ((padL - ps) % 40 + 40) % 40; x < padR; x += 40) { ctx.beginPath(); ctx.moveTo(x, coverTop); ctx.lineTo(x, dockTop); ctx.stroke() }
    for (let y = dockTop; y > coverTop; y -= 40) { ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padR, y); ctx.stroke() } }
  // the data core
  { const cx = W / 2 + shift(0.4, W), top = coverTop, bw = 70 * S * 0.6
    const cg = ctx.createLinearGradient(cx - bw * 2, 0, cx + bw * 2, 0); cg.addColorStop(0, "rgba(45,212,191,0)"); cg.addColorStop(0.5, a > 0.5 ? "rgba(255,90,90,0.35)" : "rgba(120,255,230,0.35)"); cg.addColorStop(1, "rgba(45,212,191,0)")
    ctx.fillStyle = cg; ctx.fillRect(cx - bw * 2, top, bw * 4, dockTop - top); ctx.fillStyle = a > 0.5 ? "rgba(255,200,200,0.8)" : "rgba(220,255,250,0.8)"; ctx.fillRect(cx - bw * 0.15, top, bw * 0.3, dockTop - top)
    for (let r = 0; r < 4; r++) { const y = dockTop - (80 + r * 70) * S * 0.7, rr = (90 + r * 26) * S * 0.6, ph = t * (0.8 + r * 0.3) + r
      ctx.strokeStyle = nxCol(a, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, y, rr, rr * 0.22, 0, 0, 7); ctx.stroke()
      ctx.fillStyle = nxCol(a, 1); ctx.beginPath(); ctx.arc(cx + Math.cos(ph) * rr, y + Math.sin(ph) * rr * 0.22, 4, 0, 7); ctx.fill() } }
  // holo panels
  { const ps = shift(0.6, W); for (let i = Math.floor((padL - ps) / 340) - 1; i * 340 + ps < padR + 340; i++) { const x = i * 340 + ps + 40 * _h(i), y = dockTop - (230 + 50 * _h(i * 3)) * S * 0.7 + Math.sin(t + i) * 4
    if (Math.abs(x + 80 - (W / 2 + shift(0.4, W))) < 140) continue; nxPanel(ctx, x, y, 160, 90, t, i, a) } }
  // circuit traces down to the floor
  { const ps = shift(0.85, W); for (let i = Math.floor((padL - ps) / 90) - 1; i * 90 + ps < padR + 90; i++) { const x = i * 90 + ps, h = (60 + 80 * _h(i * 5)) * S * 0.6
    ctx.strokeStyle = nxCol(a, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, dockTop); ctx.lineTo(x, dockTop - h); ctx.lineTo(x + 30, dockTop - h - 30); ctx.stroke()
    const u = ((t * 0.8 + _h(i)) % 1); ctx.fillStyle = nxCol(a, 0.9); ctx.fillRect(x - 2, dockTop - h * u - 2, 4, 4) } }
}
function nexusFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S
  if (F[0] !== NX.p1) { Object.assign(NX, { p1: F[0], hp: new WeakMap(), reads: [], alert: 0, done: null, rain: [], cubes: null, flash: 0, shout: [] }); for (const k in NX.st) NX.st[k] = 0 }
  const dt = Math.min(0.05, Math.max(0, t - (NX.last || t))); NX.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = dockTop + def.standRow * S
  let big = null, dmg = 0, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = NX.hp.get(f); NX.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) { big = f; dmg = was - hp } }
  if (big && !NX.done) { NX.st.reads++; NX.reads.push({ x: big.x + (big.w || 50) / 2, y: feet - 200, t: 0, n: Math.round(dmg) }) }
  if (low && !NX.st.alert && !NX.done) { NX.st.alert++; nxShout(mid, feet - 240, "⚠ SYSTEM ALERT — VITALS CRITICAL", "#b81a2a") }
  if (NX.st.alert && !NX.done) NX.alert = Math.min(1, NX.alert + dt * 0.9)
  if (ko && !NX.done) { NX.done = { t: 0 }; NX.st.done++; NX.flash = 1; camera.shake?.(8, 30) }
  if (NX.done) { NX.done.t += dt; if (NX.done.t < 2.5) for (let i = 0; i < 6; i++) NX.rain.push({ x: padL + (padR - padL) * nxRnd(), y: dockTop - 600, v: 300 + 300 * nxRnd(), ch: nxRnd() < 0.5 ? "0" : "1", life: 2.4 })
    if (NX.done.t > 0.8 && !NX.done.said) { NX.done.said = true; nxShout(mid, feet - 250, "ANALYSIS COMPLETE.", "#0a6a5a") } if (NX.done.t > 1) NX.alert = Math.max(0, NX.alert - dt * 0.8) }
  drawCrowd(ctx, NXC, { W, feet, sh: shift(0.9, W) })
  // floating data cubes
  if (!NX.cubes) NX.cubes = Array.from({ length: 14 }, (_, i) => ({ x: (i * 0.618) % 1, y: (i * 0.754) % 1, s: 6 + 8 * ((i * 0.37) % 1), ph: i }))
  for (const q of NX.cubes) { const x = padL + (padR - padL) * q.x, y = dockTop - 80 - 360 * q.y + Math.sin(t * 0.8 + q.ph) * 10; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6 + q.ph); ctx.strokeStyle = nxCol(NX.alert, 0.7); ctx.lineWidth = 1.5; ctx.strokeRect(-q.s / 2, -q.s / 2, q.s, q.s); ctx.restore() }
  // impact readouts
  for (const r of NX.reads) { r.t += dt; const al = Math.min(1, r.t * 5, (2 - r.t) * 2); if (al <= 0) continue
    ctx.save(); ctx.globalAlpha = al; const y = r.y - r.t * 20; ctx.fillStyle = "rgba(4,40,44,0.8)"; ctx.fillRect(r.x - 90, y - 22, 180, 44); ctx.strokeStyle = "#2dd4bf"; ctx.lineWidth = 1.5; ctx.strokeRect(r.x - 90, y - 22, 180, 44)
    ctx.font = "700 12px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#9afff0"; ctx.fillText("ANALYZING…", r.x, y - 6); ctx.font = "900 15px monospace"; ctx.fillStyle = "#ffffff"; ctx.fillText(`IMPACT +${r.n}`, r.x, y + 12); ctx.restore() }
  NX.reads = NX.reads.filter(r => r.t < 2)
  // glitch bands in the alert
  if (NX.alert > 0.3 && !NX.done) for (let i = 0; i < 3; i++) { if (Math.sin(t * 7 + i * 3) < 0.3) continue; const y = dockTop - 400 + ((t * 300 + i * 220) % 700), h = 6 + 10 * _h(i + Math.floor(t * 9))
    ctx.fillStyle = `rgba(255,60,80,${0.25 * NX.alert})`; ctx.fillRect(padL, y, padR - padL, h); ctx.fillStyle = `rgba(80,255,240,${0.15 * NX.alert})`; ctx.fillRect(padL + 8, y + h, padR - padL, 2) }
  // the 0/1 cascade
  ctx.font = "700 14px monospace"; ctx.textAlign = "center"
  for (const d of NX.rain) { d.life -= dt; d.y += d.v * dt; ctx.fillStyle = `rgba(120,255,230,${Math.max(0, Math.min(1, d.life))})`; ctx.fillText(d.ch, d.x, d.y) }
  NX.rain = NX.rain.filter(d => d.life > 0 && d.y < coverBottom + 20).slice(-500)
  if (NX.flash > 0) { NX.flash = Math.max(0, NX.flash - dt * 2); ctx.fillStyle = `rgba(230,255,250,${0.7 * NX.flash})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  if (NX.alert > 0) { ctx.fillStyle = `rgba(120,0,10,${0.12 * NX.alert})`; ctx.fillRect(padL, dockTop - 900, padR - padL, coverBottom - dockTop + 900) }
  for (const s of NX.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  NX.shout = NX.shout.filter(s => s.t > 0)
}

// ───────────────────────────── THE ORIGINALS (homage to the game's creators; render-only, wall clock, own PRNG) ─────────────────────────────
// One map, three dimensions — one per original fighter — and the multiverse keeps splitting between them:
//   0 OMOLOLU'S LAB   a multiverse research lab: Kamui-swirl portal gates, WASD cadence monitors (his Recursive Cadence),
//                     bubbling tubes — and windows that look into OTHER MAPS of the game, a random one each, re-tuned
//                     every few seconds (static between channels);
//   1 DSEYL'S SKY     a sky world at sunset: floating islands with homes + waterfalls, hot-air balloons, the DSEYL AIRWAYS
//                     blimp, bird flocks, a ring course, the hooded speedster (straight / wave / loop runs, sonic booms) —
//                     and every so often FLASH TIME: the whole world drops to slow motion (clock hands crawl, birds hang in
//                     the air) while the speedster alone keeps full speed, leaving afterimages;
//   2 ENOCH'S FROST & FLAME   glacier + aurora vs a live volcano (eruptions, lava bombs, volcanic lightning); the ice front
//                     and the fire front push each other back and forth all match (snowmen sweat, then melt into puddles);
//                     an ice skater builds his own ice slide across the sky; waterfalls, geysers, snow vs embers.
// The full SWITCH (rumble → cracks → a rift from the centre) only moves between these three; the GLITCH — random, and on
// big hits — flashes ANY other map of the game for a split second (bands of it, or the whole screen).
// ≤25% → "THE MULTIVERSE IS SPLITTING!" (switches every 6–11 s); KO → all three dimensions side by side, "THE ORIGINALS".
// Omololu / Dseyl / Enoch watch from the sidelines when they aren't fighting (shared crowd).
let _orSeed = 0x9e3779b9 ^ 0x7f4a7c15
const orRnd = () => { _orSeed ^= _orSeed << 13; _orSeed ^= _orSeed >>> 17; _orSeed ^= _orSeed << 5; return (_orSeed >>> 0) / 4294967296 }
const OR_CROWD = [["omololu", 0.16, 0], ["dseyl", 0.5, 0], ["enoch", 0.84, 0]]
const ORC = makeCrowd(OR_CROWD, 0.6)
const OR_NAMES = ["OMOLOLU'S LAB", "DSEYL'S SKY", "ENOCH'S FROST & FLAME"], OR_WHO = ["OMOLOLU", "DSEYL", "ENOCH"]
const OR_TINT = ["170,80,255", "255,200,70", "120,220,255"]
// the other maps the windows + glitches can show (layered sets drawn by drawLayeredStageBack; room3d / ssf2 ones excluded)
const OR_MAPS = [["ryu_jujutsu", "Jujutsu High Courtyard"], ["chunli_shibuya", "Shibuya Incident"], ["lee_suna", "Sunagakure"], ["oro_forest", "Forest of Death"],
  ["guile_valley", "Valley of the End"], ["eagle_namek", "Planet Namek"], ["sagat_tournament", "World Tournament Arena"], ["infinity_castle", "Infinity Castle"],
  ["gen_asakusa", "Asakusa"], ["joe_mugen", "Mugen Train"], ["zangief_citadel", "Citadel of Ricks"], ["birdie_bellwood", "Bellwood"], ["blanka_nullvoid", "Null Void"],
  ["retsu_seireitei", "Soul Society"], ["code_woodsboro", "Woodsboro"], ["yun_yorknew", "Yorknew City"], ["ryu_heaven", "Heaven's Arena"], ["adon_viltrum", "Viltrumite Warzone"],
  ["sean_angelgrove", "Angel Grove"], ["mike_command", "Command Center"], ["code_pk", "PK Academy"], ["code_nexus", "Analysis Nexus"], ["eagle_shadow", "Shadow Garden"],
  ["ken_harbor", "Harbor Dock"], ["guile_batcave", "The Batcave"], ["necro_krypton", "Krypton"], ["retsu_arlong", "Arlong Park"], ["ken3_baratie", "The Baratie"],
  ["alex_queens", "Queens Alley"], ["guile_starklab", "Stark Lab"], ["code_colosseum", "Battle Royale Colosseum"]].filter(([s]) => SETS[s] && !SETS[s].mode)
const OR = { p1: null, last: 0, hp: new WeakMap(), dim: 0, phase: null, nextSwap: 0, flick: null, nextGlitch: 0, merged: null, banner: null, unstable: false, forceTo: null, shout: [],
  pool: [], win: new Map(), skyT: 0, flashK: 0, flashUntil: 0, nextFlash: 0,
  st: { swaps: 0, shakes: 0, flickers: 0, glitches: 0, glimpsed: [], unstable: 0, merged: 0, flashes: 0, seen: [1, 0, 0] } }
export const originalsState = () => ({ swaps: OR.st.swaps, shakes: OR.st.shakes, flickers: OR.st.flickers, glitches: OR.st.glitches, glimpsed: OR.st.glimpsed.slice(),
  windows: [...OR.win.values()].map(w => w.name), flashes: OR.st.flashes, flash: +OR.flashK.toFixed(2), tide: Math.round(orTide(now())), unstable: OR.st.unstable, mergedCount: OR.st.merged,
  merged: OR.merged ? +OR.merged.t.toFixed(2) : 0, dim: OR.dim, name: OR_NAMES[OR.dim], phase: OR.phase ? OR.phase.k : "", seen: OR.st.seen.slice(),
  nextIn: +(OR.nextSwap - now()).toFixed(1), crowd: crowdState(ORC), shouting: OR.shout.filter(s => s.t > 0).map(s => s.txt) })
export const originalsGo = k => { OR.forceTo = k }                 // tests / screenshots: open a rift to dimension k now
export const originalsGlitch = full => { OR.nextGlitch = 0; OR.glitchFull = full }   // tests / screenshots: glitch now
export const originalsFlash = () => { OR.nextFlash = 0 }           // tests / screenshots: FLASH TIME now
function orShout(x, y, txt, col) { if (OR.shout.filter(s => s.t > 0).length < 3) OR.shout.push({ x, y, txt, col: col || "#222", t: 2.2 }) }
const orPar = (p, W, padL, padR, step, fn, drift = 0) => { const ps = shift(p, W) + (((drift % step) + step) % step); for (let i = Math.floor((padL - ps) / step) - 1; i * step + ps < padR + step; i++) fn(i * step + ps, i) }
const orOdd = i => ((i % 2) + 2) % 2
// another map's whole backdrop, drawn in place (its own art + procedural layers); false until its art has loaded
let _orNest = false
function orDrawOther(ctx, set) {
  if (_orNest || !_backArgs || !SETS[set]) return false
  _orNest = true; let ok = false
  try { ctx.save(); ok = drawLayeredStageBack(ctx, { layers: set }, _backArgs) } catch (e) { ok = false } finally { ctx.restore(); _orNest = false }
  return ok
}
// a small queue of random maps, loading ahead so a glitch / window always has a ready one
function orPoolTick() { let guard = 0; while (OR.pool.length < 4 && guard++ < 20) { const m = OR_MAPS[Math.floor(orRnd() * OR_MAPS.length)]; if (m && !OR.pool.includes(m)) OR.pool.push(m) } for (const m of OR.pool) layeredStageReady({ layers: m[0] }) }
function orTakeReady() { const i = OR.pool.findIndex(m => layeredStageReady({ layers: m[0] })); return i < 0 ? null : OR.pool.splice(i, 1)[0] }
// the whole current view of a dimension / map, shrunk into a window rect
function orMini(ctx, g, x, y, w, h, draw) {
  const vw = g.padR - g.padL, vh = vw * 9 / 16, gy = _backArgs ? _backArgs.groundY : g.dockTop, vt = gy - vh * 0.6
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  const s = Math.max(w / vw, h / vh); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(g.padL + vw / 2), -(vt + vh / 2))
  try { draw() } finally { ctx.restore() }
}
function orStatic(ctx, x, y, w, h, t) { ctx.fillStyle = "#18161e"; ctx.fillRect(x, y, w, h); for (let j = 0; j < 60; j++) { const k = Math.floor(t * 30) * 61 + j; ctx.fillStyle = `rgba(230,230,240,${0.2 + 0.5 * _h(k * 3)})`; ctx.fillRect(x + w * _h(k), y + h * _h(k * 7), 3 + 20 * _h(k * 5), 2) } }

// ── 0: OMOLOLU'S LAB ──
function orPortal(ctx, x, y, R, t, tint) {   // a portal gate: machine ring with running lights around a Kamui-style swirl
  ctx.fillStyle = "#1c1a22"; ctx.beginPath(); ctx.arc(x, y, R + 22, 0, 7); ctx.fill()
  ctx.strokeStyle = "#3e3848"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, y, R + 12, 0, 7); ctx.stroke()
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * 0.5; ctx.fillStyle = (i + Math.floor(t * 6)) % 4 === 0 ? "#ff3a4a" : "#5a4a6a"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (R + 12), y + Math.sin(a) * (R + 12), 3, 0, 7); ctx.fill() }
  const g = ctx.createRadialGradient(x, y, 2, x, y, R); g.addColorStop(0, "#000"); g.addColorStop(0.55, `rgba(${tint},0.35)`); g.addColorStop(1, `rgba(${tint},0.95)`)
  ctx.fillStyle = "#06040a"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.fillStyle = g; ctx.fill()
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.clip(); ctx.lineCap = "round"
  for (let arm = 0; arm < 3; arm++) { ctx.beginPath(); for (let s = 0; s <= 1.001; s += 0.04) { const r = R * (1.05 - s), a = arm * Math.PI * 2 / 3 + s * 5.5 + t * 1.6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; s ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }
    ctx.strokeStyle = `rgba(${tint},0.75)`; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2; ctx.stroke() }
  ctx.restore()
  ctx.fillStyle = `rgba(${tint},0.12)`; ctx.beginPath(); ctx.arc(x, y, R + 40 + 4 * Math.sin(t * 3), 0, 7); ctx.fill()
}
function orLab(ctx, g) {
  const { W, dockTop: D, padL, padR, coverTop, t } = g
  const gr = ctx.createLinearGradient(0, D - 320, 0, D); gr.addColorStop(0, "#0e0c14"); gr.addColorStop(1, "#2c2636"); ctx.fillStyle = gr; ctx.fillRect(padL, coverTop, padR - padL, D - coverTop)
  orPar(0.7, W, padL, padR, 110, x => { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x, coverTop, 2, D - coverTop); ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(x + 2, coverTop, 1, D - coverTop) })
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(padL, D - 96, padR - padL, 3); ctx.fillStyle = "#0a0910"; ctx.fillRect(padL, coverTop, padR - padL, D - 292 - coverTop)
  orPar(0.75, W, padL, padR, 220, x => { ctx.fillStyle = "#e8e2ff"; ctx.fillRect(x, D - 296, 90, 5); const lg = ctx.createLinearGradient(0, D - 291, 0, D - 200); lg.addColorStop(0, "rgba(220,210,255,0.14)"); lg.addColorStop(1, "rgba(220,210,255,0)"); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x, D - 291); ctx.lineTo(x + 90, D - 291); ctx.lineTo(x + 130, D - 200); ctx.lineTo(x - 40, D - 200); ctx.fill() })
  // windows: each one looks into a RANDOM other map of the game, re-tuned every few seconds
  orPar(0.6, W, padL, padR, 880, (x0, i) => { const x = x0 + 440 - 125, y = D - 272, w = 250, h = 142
    let wn = OR.win.get(i); if (!wn || t > wn.until) { const m = orTakeReady(); wn = m ? { set: m[0], name: m[1].toUpperCase(), born: t, until: t + 6 + 6 * orRnd() } : { set: null, k: 1 + orOdd(i), name: OR_NAMES[1 + orOdd(i)], born: t, until: t + 3 }; OR.win.set(i, wn); if (OR.win.size > 8) OR.win.delete(OR.win.keys().next().value) }
    ctx.fillStyle = "#07060b"; ctx.fillRect(x - 9, y - 9, w + 18, h + 18)
    if (t - wn.born < 0.35) orStatic(ctx, x, y, w, h, t)
    else orMini(ctx, g, x, y, w, h, () => { if (!wn.set || !orDrawOther(ctx, wn.set)) (wn.k === 2 ? orFrost : orSky)(ctx, g) })
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = "rgba(150,170,255,0.07)"; ctx.fillRect(x, y, w, h)
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + 70, y); ctx.lineTo(x + 10, y + h); ctx.lineTo(x - 40, y + h); ctx.fill()
    ctx.fillStyle = "rgba(0,0,0,0.12)"; for (let sy = y; sy < y + h; sy += 4) ctx.fillRect(x, sy, w, 1); ctx.restore()
    ctx.strokeStyle = "#2a2632"; ctx.lineWidth = 4; ctx.strokeRect(x - 2, y - 2, w + 4, h + 4)
    ctx.font = "700 11px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#c8a8ff"; ctx.fillText("◉ DIMENSION · " + wn.name, x + w / 2, y + h + 21) })
  // portal gates
  orPar(0.75, W, padL, padR, 880, (x, i) => { const y = D - 150, k = 1 + orOdd(i + 1)
    ctx.fillStyle = "#2a2632"; ctx.fillRect(x - 128, y - 30, 16, D - y); ctx.fillRect(x + 112, y - 30, 16, D - y)
    orPortal(ctx, x, y, 90, t + i * 1.7, OR_TINT[k])
    ctx.fillStyle = "#1c1a22"; ctx.fillRect(x - 150, D - 36, 300, 36); ctx.fillStyle = "#ff3a4a"; ctx.fillRect(x - 150, D - 36, 300, 3)
    ctx.font = "900 13px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#d8ccff"; ctx.fillText("OMOLOLU LABS · MULTIVERSE GATE", x, D - 14) })
  // benches: cadence monitors + bubbling tubes
  orPar(0.9, W, padL, padR, 520, (x0, i) => { const x = x0 + 260 - 90, top = D - 50
    ctx.fillStyle = "#3a3644"; ctx.fillRect(x, top, 180, 9); ctx.fillStyle = "#211e28"; ctx.fillRect(x + 6, top + 9, 168, 41)
    ctx.fillStyle = "#08080c"; ctx.fillRect(x + 10, top - 54, 80, 48); ctx.fillStyle = "#140f22"; ctx.fillRect(x + 13, top - 51, 74, 42); ctx.fillStyle = "#08080c"; ctx.fillRect(x + 46, top - 6, 8, 6)
    const on = Math.floor(t * 3 + i) % 4; ctx.font = "900 13px monospace"; ctx.textAlign = "center"
    for (let j = 0; j < 4; j++) { ctx.fillStyle = j === on ? "#ff3a4a" : "rgba(200,180,255,0.4)"; ctx.fillText("WASD"[j], x + 26 + j * 16, top - 30) }
    ctx.strokeStyle = "#ff3a4a"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let j = 0; j <= 20; j++) { const px = x + 16 + j * 3.4, ph = (j + Math.floor(t * 10)) % 20, py = top - 16 - (ph === 8 ? 7 : ph === 9 ? -4 : 0); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py) } ctx.stroke()
    for (let j = 0; j < 2; j++) { const tx = x + 112 + j * 30, lvl = 0.55 + 0.15 * Math.sin(t + i + j), col = j ? "190,70,255" : "255,60,80"
      ctx.fillStyle = `rgba(${col},0.75)`; ctx.fillRect(tx, top - 4 - 44 * lvl, 16, 44 * lvl); ctx.strokeStyle = "rgba(220,220,255,0.5)"; ctx.lineWidth = 1.5; ctx.strokeRect(tx, top - 48, 16, 44)
      for (let b = 0; b < 3; b++) { const u = (t * 0.7 + b / 3 + j * 0.2) % 1; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(tx + 4 + 8 * _h(b + j * 5), top - 6 - u * 40 * lvl, 1.6, 0, 7); ctx.fill() } } })
}
// ── 1: DSEYL'S SKY ──
function orDseylFig(ctx, x, y, dir, rot, a = 1) {   // the hooded speedster: grey hoodie, dark-red pants, shades
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(rot)
  ctx.fillStyle = "#7a1a24"; ctx.fillRect(-9, 4, 9, 5); ctx.fillRect(-14, 6, 6, 4); ctx.fillStyle = "#c8c8cc"; ctx.fillRect(-6, -8, 14, 13); ctx.fillRect(6, -6, 8, 4)
  ctx.fillStyle = "#5a3a26"; ctx.beginPath(); ctx.arc(4, -13, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#a8a8ae"; ctx.beginPath(); ctx.arc(2, -14, 5.6, Math.PI * 0.8, Math.PI * 1.9); ctx.fill()
  ctx.fillStyle = "#111"; ctx.fillRect(4, -15, 6, 2); ctx.restore()
}
function orBalloon(ctx, x, y, s, i) {
  const c = [["#e84a5f", "#ffd166"], ["#3aa0ff", "#ffffff"], ["#7bd389", "#2a6f97"], ["#c77dff", "#ffd6ff"]][((i % 4) + 4) % 4]
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  ctx.strokeStyle = "rgba(60,40,40,0.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-18, 18); ctx.lineTo(-6, 42); ctx.moveTo(18, 18); ctx.lineTo(6, 42); ctx.stroke()
  ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(0, 0, 26, 30, 0, 0, 7); ctx.fill(); ctx.fillStyle = c[1]; ctx.beginPath(); ctx.ellipse(0, 0, 14, 30, 0, 0, 7); ctx.fill()
  ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(0, 0, 5, 30, 0, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(40,20,60,0.25)"; ctx.beginPath(); ctx.ellipse(8, 4, 18, 26, 0, 0, 7); ctx.fill()
  ctx.fillStyle = "#7a4a2a"; ctx.fillRect(-7, 42, 14, 10); ctx.restore()
}
function orBlimp(ctx, x, y, T) {
  ctx.strokeStyle = "rgba(60,40,50,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 92, y); ctx.lineTo(x - 140, y + 6); ctx.stroke()
  const wave = k => 4 * Math.sin(T * 3 + k)
  ctx.fillStyle = "#fff8f0"; ctx.beginPath(); ctx.moveTo(x - 140, y - 4 + wave(0)); ctx.lineTo(x - 300, y - 4 + wave(1.5)); ctx.lineTo(x - 300, y + 20 + wave(1.5)); ctx.lineTo(x - 140, y + 20 + wave(0)); ctx.fill()
  ctx.font = "900 13px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#c81e3a"; ctx.fillText("DSEYL AIRWAYS · FLY FAST", x - 220, y + 12 + wave(0.75))
  ctx.fillStyle = "#4a4458"; ctx.beginPath(); ctx.moveTo(x - 78, y); ctx.lineTo(x - 100, y - 26); ctx.lineTo(x - 64, y - 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 78, y); ctx.lineTo(x - 100, y + 26); ctx.lineTo(x - 64, y + 6); ctx.fill()
  ctx.fillStyle = "#e8e4ee"; ctx.beginPath(); ctx.ellipse(x, y, 92, 26, 0, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(80,60,110,0.25)"; ctx.beginPath(); ctx.ellipse(x, y + 9, 88, 14, 0, 0, 7); ctx.fill()
  ctx.fillStyle = "#c81e3a"; ctx.fillRect(x - 60, y - 4, 120, 6); ctx.fillStyle = "#3a3444"; ctx.fillRect(x - 18, y + 22, 36, 10)
  ctx.strokeStyle = "#3a3444"; ctx.lineWidth = 2; const pw = 9 * Math.abs(Math.sin(T * 20)); ctx.beginPath(); ctx.moveTo(x + 22, y + 27 - pw); ctx.lineTo(x + 22, y + 27 + pw); ctx.stroke()
}
function orSky(ctx, g) {
  const { W, dockTop: D, padL, padR, coverTop, t } = g, T = OR.skyT, fk = OR.flashK
  const gr = ctx.createLinearGradient(0, D - 330, 0, D); gr.addColorStop(0, "#22245c"); gr.addColorStop(0.5, "#b0587a"); gr.addColorStop(0.85, "#ffaa66"); gr.addColorStop(1, "#ffd89a")
  ctx.fillStyle = gr; ctx.fillRect(padL, coverTop, padR - padL, D - coverTop)
  const sx = W / 2 + shift(0.03, W) - 320, sy = D - 70
  ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let r = 0; r < 9; r++) { const a = -Math.PI / 2 + (r - 4) * 0.3 + 0.06 * Math.sin(T * 0.2 + r); ctx.fillStyle = "rgba(255,200,150,0.05)"; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - 0.05) * 700, sy + Math.sin(a - 0.05) * 700); ctx.lineTo(sx + Math.cos(a + 0.05) * 700, sy + Math.sin(a + 0.05) * 700); ctx.fill() } ctx.restore()
  { const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 170); sg.addColorStop(0, "rgba(255,230,170,0.7)"); sg.addColorStop(1, "rgba(255,230,170,0)"); ctx.fillStyle = sg; ctx.fillRect(sx - 170, sy - 170, 340, 340); ctx.fillStyle = "#fff2c8"; ctx.beginPath(); ctx.arc(sx, sy, 44, 0, 7); ctx.fill() }
  orPar(0.08, W, padL, padR, 420, (x, i) => { const y = D - 285 + 50 * _h(i * 5); ctx.fillStyle = "rgba(255,190,210,0.45)"; ctx.beginPath(); ctx.ellipse(x, y, 80, 14, 0, 0, 7); ctx.ellipse(x + 50, y - 8, 50, 12, 0, 0, 7); ctx.fill() }, T * 6)
  { const cx = W / 2 + shift(0.05, W) + 280, cy = D - 205, R = 78   // the FLASH TIME clock, gears turning behind it
    for (const [gx, gy, gr2, sp] of [[cx - 70, cy - 40, 34, 0.6], [cx + 68, cy + 30, 26, -0.8]]) { ctx.save(); ctx.translate(gx, gy); ctx.rotate(T * sp); ctx.fillStyle = "rgba(255,225,140,0.18)"; for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillRect(-4, -gr2 - 6, 8, 10) } ctx.beginPath(); ctx.arc(0, 0, gr2, 0, 7); ctx.fill(); ctx.restore() }
    ctx.strokeStyle = `rgba(255,232,150,${0.6 + 0.4 * fk})`; ctx.lineWidth = 3 + 2 * fk; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.fillStyle = `rgba(255,232,150,${0.08 + 0.15 * fk})`; ctx.fill()
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84); ctx.lineTo(cx + Math.cos(a) * R * 0.96, cy + Math.sin(a) * R * 0.96); ctx.stroke() }
    for (const [len, sp2] of [[0.5, 0.25], [0.8, 2.5]]) { const a = T * sp2 * (OR.unstable ? 3 : 1) - Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R * len, cy + Math.sin(a) * R * len); ctx.stroke() }
    ctx.fillStyle = "rgba(255,225,90,0.9)"; ctx.beginPath(); ctx.moveTo(cx + 4, cy - 18); ctx.lineTo(cx - 8, cy + 2); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx - 4, cy + 18); ctx.lineTo(cx + 8, cy - 2); ctx.lineTo(cx, cy - 2); ctx.fill()
    ctx.font = "900 11px monospace"; ctx.textAlign = "center"; ctx.fillText("FLASH TIME", cx, cy + R + 16) }
  orPar(0.2, W, padL, padR, 640, (x, i) => { const y = D - 150 - 60 * _h(i * 3) + Math.sin(T * 0.5 + i) * 6, w = 70 + 60 * _h(i)   // floating islands with a home
    ctx.fillStyle = "#4a2e44"; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.2, y + w * 1.1); ctx.lineTo(x - w * 0.3, y + w * 0.8); ctx.fill()
    ctx.fillStyle = "#6a7a4a"; ctx.beginPath(); ctx.ellipse(x, y, w, 9, 0, 0, 7); ctx.fill()
    const hx = x - w * 0.4; ctx.fillStyle = "#e8d8c0"; ctx.fillRect(hx, y - 20, 22, 16); ctx.fillStyle = "#9a3a3a"; ctx.beginPath(); ctx.moveTo(hx - 3, y - 20); ctx.lineTo(hx + 11, y - 31); ctx.lineTo(hx + 25, y - 20); ctx.fill(); ctx.fillStyle = "#ffd890"; ctx.fillRect(hx + 4, y - 15, 5, 5)
    ctx.fillStyle = "#4a3a2a"; ctx.fillRect(x + w * 0.3, y - 18, 3, 14); ctx.fillStyle = "#7a9a5a"; ctx.beginPath(); ctx.arc(x + w * 0.3 + 1, y - 22, 10 + Math.sin(T * 2 + i) * 0.8, 0, 7); ctx.fill()
    ctx.fillStyle = "rgba(230,240,255,0.65)"; ctx.fillRect(x + w * 0.55, y + 2, 4, w * 0.9); for (let d = 0; d < 3; d++) { const u = (T * 1.2 + d / 3) % 1; ctx.fillRect(x + w * 0.55 - 2 + d * 3, y + 4 + u * w * 0.9, 2, 6) } })
  orPar(0.3, W, padL, padR, 560, (x, i) => orBalloon(ctx, x + 20 * Math.sin(T * 0.2 + i), D - 215 + 40 * _h(i * 9) + 22 * Math.sin(T * 0.35 + i * 2), 0.75 + 0.35 * _h(i), i), T * 9)
  orPar(0.35, W, padL, padR, 1900, (x, i) => orBlimp(ctx, x, D - 255 + 20 * _h(i), T), T * 22)
  for (let f = 0; f < 3; f++) { const span = padR - padL + 500, x = padL - 250 + ((T * 45 * (1 + f * 0.25) + f * 560) % span), y = D - 240 + f * 46 + 10 * Math.sin(T * 0.5 + f)   // bird flocks
    ctx.strokeStyle = "#2a1e3a"; ctx.lineWidth = 2; for (let b = 0; b < 5; b++) { const bx = x - Math.abs(b - 2) * 16, by = y + Math.abs(b - 2) * 9 + (b - 2) * 3, fl = 5 * Math.sin(T * 10 + b)
      ctx.beginPath(); ctx.moveTo(bx - 7, by - fl); ctx.quadraticCurveTo(bx - 3, by - 2, bx, by); ctx.quadraticCurveTo(bx + 3, by - 2, bx + 7, by - fl); ctx.stroke() } }
  orPar(0.6, W, padL, padR, 700, (x, i) => { const y = D - 130 - 60 * _h(i * 4) + 6 * Math.sin(T + i), lit = (Math.floor(t * 1.6) + i) % 4 === 0   // the ring course
    ctx.strokeStyle = lit ? "rgba(255,250,210,0.95)" : "rgba(255,200,70,0.8)"; ctx.lineWidth = lit ? 6 : 4; ctx.beginPath(); ctx.ellipse(x, y, 16, 36, 0, 0, 7); ctx.stroke()
    if (lit) { ctx.strokeStyle = "rgba(255,220,90,0.3)"; ctx.lineWidth = 14; ctx.stroke() } })
  orPar(0.45, W, padL, padR, 130, (x, i) => { const y = D - 26 + 6 * Math.sin(i + T * 0.4); ctx.fillStyle = "rgba(255,214,196,0.95)"; ctx.beginPath(); ctx.ellipse(x, y, 90, 26, 0, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(200,120,140,0.35)"; ctx.beginPath(); ctx.ellipse(x, y + 12, 86, 12, 0, 0, 7); ctx.fill() }, T * 4)
  ctx.fillStyle = "rgba(255,214,196,0.95)"; ctx.fillRect(padL, D - 12, padR - padL, 12)
  // the speedster (real time — he isn't slowed by Flash Time; everything else is)
  const P = 1.9, K = Math.floor(t / P)
  for (const k of [K, K - 1]) { const u = (t - k * P) / 0.8; if (u < 0 || u > 1.5) continue
    const dir = _h(k * 3) < 0.5 ? 1 : -1, y0 = D - 100 - 170 * _h(k * 7), type = Math.floor(_h(k * 5) * 3), lc = 0.3 + 0.4 * _h(k * 11)
    const pos = uu => { uu = Math.max(0, uu); let x = dir > 0 ? padL + (padR - padL) * uu : padR - (padR - padL) * uu, y = y0
      if (type === 1) y += 40 * Math.sin(uu * 12)
      if (type === 2) { const cx = dir > 0 ? padL + (padR - padL) * lc : padR - (padR - padL) * lc, lw = 0.1; if (uu > lc && uu < lc + lw) { const a = (uu - lc) / lw * Math.PI * 2; return [cx + dir * Math.sin(a) * 70, y0 - (1 - Math.cos(a)) * 70] } if (uu >= lc + lw) x -= dir * (padR - padL) * lw }
      return [x, y] }
    const a = Math.max(0, Math.min(1, 1.5 - u))
    ctx.beginPath(); for (let j = 0; j <= 18; j++) { const [px, py] = pos(u - j * 0.02); const jy = j ? (_h(k * 31 + j) - 0.5) * 18 : 0; j ? ctx.lineTo(px, py + jy) : ctx.moveTo(px, py) }
    ctx.strokeStyle = `rgba(255,220,60,${0.8 * a})`; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,230,${a})`; ctx.lineWidth = 1.6; ctx.stroke()
    if (u > 0.04 && u < 0.6) { const [bx, by] = pos(0.04), r = (u - 0.04) * 260; ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - (u - 0.04) / 0.56)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(bx, by, r * 0.35, r, 0, 0, 7); ctx.stroke() }   // sonic boom
    if (u <= 1) { if (fk > 0.2) for (let j = 4; j >= 1; j--) { const [px, py] = pos(u - j * 0.05); orDseylFig(ctx, px, py, dir, 0.5, 0.18 * j * fk) }
      const [hx, hy] = pos(u), [qx, qy] = pos(u - 0.01); orDseylFig(ctx, hx, hy, dir, 0.5 + 0.2 * Math.atan2(hy - qy, Math.abs(hx - qx) + 0.01), 1) } }
  if (fk > 0) { ctx.fillStyle = `rgba(110,130,255,${0.2 * fk})`; ctx.fillRect(padL, coverTop, padR - padL, D - coverTop) }
}
// ── 2: ENOCH'S FROST & FLAME ──
const orTide = t => 800 + 300 * Math.sin(t * 0.22)   // how much of each 1600 px of world is ice (the rest is fire)
function orEnochFig(ctx, x, y, rot) {   // the skater: blue suit, orange fire visor, arms out
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  ctx.strokeStyle = "#2a4aa8"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(-6, 0); ctx.moveTo(2, -14); ctx.lineTo(7, -1); ctx.stroke()
  ctx.fillStyle = "#c8f0ff"; ctx.fillRect(-9, -1, 8, 3); ctx.fillRect(3, -2, 8, 3)
  ctx.fillStyle = "#3a6ad8"; ctx.fillRect(-5, -28, 10, 15); ctx.strokeStyle = "#3a6ad8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -25); ctx.lineTo(-15, -30); ctx.moveTo(4, -25); ctx.lineTo(15, -20); ctx.stroke()
  ctx.fillStyle = "#5a3a26"; ctx.beginPath(); ctx.arc(0, -33, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#ff7a2a"; ctx.fillRect(-1, -35, 7, 2.5); ctx.restore()
}
function orFrost(ctx, g) {
  const { W, dockTop: D, padL, padR, coverTop, t } = g, iw = orTide(t)
  const zones = (p, fn) => { const ps = shift(p, W); for (let i = Math.floor((padL - ps) / 1600) - 1; i * 1600 + ps < padR + 1600; i++) { const a = i * 1600 + ps; fn(a, a + iw, a + 1600, i) } }
  zones(0.15, (a, m, e, i) => {
    let gr = ctx.createLinearGradient(0, D - 320, 0, D); gr.addColorStop(0, "#050f26"); gr.addColorStop(1, "#3f7fb8"); ctx.fillStyle = gr; ctx.fillRect(a, coverTop, m - a + 1, D - coverTop)
    for (let s = 0; s < 26; s++) { ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(t * 3 + s)})`; ctx.fillRect(a + (m - a) * _h(i * 50 + s), D - 330 + 190 * _h(s * 7 + i * 3), 2, 2) }
    for (let c = 0; c < 3; c++) { const col = ["80,255,170", "90,200,255", "190,120,255"][c]; for (let xx = a; xx < m; xx += 12) { const y0 = D - 295 + c * 28 + 26 * Math.sin(xx / 130 + t * 0.5 + c * 2), h = 70 + 30 * Math.sin(xx / 50 + t), al = 0.13 * (0.6 + 0.4 * Math.sin(xx / 37 + t * 2 + c))
      ctx.fillStyle = `rgba(${col},${al})`; ctx.fillRect(xx, y0, 12, h * 0.5); ctx.fillStyle = `rgba(${col},${al * 0.4})`; ctx.fillRect(xx, y0 + h * 0.5, 12, h * 0.5) } }
    gr = ctx.createLinearGradient(0, D - 320, 0, D); gr.addColorStop(0, "#1a0505"); gr.addColorStop(1, "#c4471a"); ctx.fillStyle = gr; ctx.fillRect(m, coverTop, e - m + 1, D - coverTop)
    for (let s = 0; s < 5; s++) { ctx.fillStyle = "rgba(40,20,22,0.7)"; ctx.beginPath(); ctx.ellipse(m + (e - m) * (s + 0.5) / 5 + 20 * Math.sin(t * 0.3 + s), D - 255 + 24 * _h(s + i), 120, 38, 0, 0, 7); ctx.fill() }
    { const kk = t / 1.9 + i * 0.37, k = Math.floor(kk); if (_h(k * 7 + i) < 0.6 && kk % 1 < 0.1) { let bx = m + (e - m) * (0.2 + 0.6 * _h(k + 3)), by = D - 255; ctx.beginPath(); ctx.moveTo(bx, by); for (let j = 0; j < 6; j++) { bx += (_h(k * 13 + j) - 0.5) * 40; by += 18; ctx.lineTo(bx, by) }
      ctx.strokeStyle = "rgba(200,160,255,0.35)"; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "rgba(240,230,255,0.95)"; ctx.lineWidth = 2; ctx.stroke() } }   // volcanic lightning
    for (const [x, w2] of [[m, 150], [a, 110]]) { const sg = ctx.createLinearGradient(x - w2, 0, x + w2, 0); sg.addColorStop(0, "rgba(225,232,240,0)"); sg.addColorStop(0.5, "rgba(225,232,240,0.5)"); sg.addColorStop(1, "rgba(225,232,240,0)"); ctx.fillStyle = sg; ctx.fillRect(x - w2, coverTop, 2 * w2, D - coverTop) } })
  zones(0.4, (a, m, e, i) => {
    for (let px = a + 70; px < m - 50; px += 140) { const h = 120 + 100 * _h(Math.round(px - a) + i * 7), w = 70 + 30 * _h(px - a + 3)
      ctx.fillStyle = "#d8ecf8"; ctx.beginPath(); ctx.moveTo(px - w, D); ctx.lineTo(px, D - h); ctx.lineTo(px + w, D); ctx.fill(); ctx.fillStyle = "#8ab8d8"; ctx.beginPath(); ctx.moveTo(px, D - h); ctx.lineTo(px + w, D); ctx.lineTo(px + w * 0.2, D); ctx.fill() }
    if (e - m > 300) { const vx = (m + e) / 2, ph = (t + i * 1.7) % 5.2   // the volcano
      for (const sx of [-1, 1]) { ctx.fillStyle = "#170f10"; ctx.beginPath(); ctx.moveTo(vx + sx * 140, D); ctx.lineTo(vx + sx * 210, D - 110); ctx.lineTo(vx + sx * 270, D); ctx.fill() }
      for (let s = 0; s < 6; s++) { const u = (t * 0.12 + s / 6) % 1; ctx.fillStyle = `rgba(50,40,44,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(vx + 30 * Math.sin(u * 5 + s), D - 210 - u * 160, 30 + 40 * u, 0, 7); ctx.fill() }
      ctx.fillStyle = "#221616"; ctx.beginPath(); ctx.moveTo(vx - 240, D); ctx.lineTo(vx - 50, D - 200); ctx.lineTo(vx + 50, D - 200); ctx.lineTo(vx + 240, D); ctx.fill()
      ctx.strokeStyle = `rgba(255,${100 + 50 * Math.sin(t * 3) | 0},30,0.9)`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(vx - 20, D - 200); ctx.quadraticCurveTo(vx - 60, D - 100, vx - 90, D); ctx.moveTo(vx + 25, D - 200); ctx.quadraticCurveTo(vx + 50, D - 120, vx + 110, D); ctx.stroke()
      ctx.fillStyle = `rgba(255,130,40,${0.4 + 0.4 * (ph < 2 ? 1 : 0)})`; ctx.beginPath(); ctx.ellipse(vx, D - 200, 52, 12, 0, 0, 7); ctx.fill()
      if (ph < 2) for (let n = 0; n < 28; n++) { const age = ph - n * 0.05; if (age <= 0 || age > 1.5) continue; const ang = -Math.PI / 2 + (_h(n * 3 + i) - 0.5) * 1.3, v = 240 + 170 * _h(n + i * 5)
        const x = vx + Math.cos(ang) * v * age, y = D - 200 + Math.sin(ang) * v * age + 210 * age * age; if (y < D) { ctx.fillStyle = n % 3 ? "#ff8a2a" : "#ffe27a"; ctx.beginPath(); ctx.arc(x, y, n % 4 ? 3 : 5, 0, 7); ctx.fill() } } } })
  zones(0.55, a => {   // a waterfall where flame turns back into frost, steaming at the foot
    ctx.fillStyle = "#2a2a34"; ctx.fillRect(a - 40, D - 250, 80, 250)
    const wg = ctx.createLinearGradient(a - 26, 0, a + 26, 0); wg.addColorStop(0, "rgba(170,210,240,0.6)"); wg.addColorStop(0.5, "rgba(240,250,255,0.95)"); wg.addColorStop(1, "rgba(170,210,240,0.6)"); ctx.fillStyle = wg; ctx.fillRect(a - 26, D - 250, 52, 250)
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; for (let j = 0; j < 6; j++) { const y = D - 250 + ((t * 220 + j * 41) % 250); ctx.beginPath(); ctx.moveTo(a - 20 + j * 8, y); ctx.lineTo(a - 20 + j * 8, y + 18); ctx.stroke() }
    for (let j = 0; j < 6; j++) { const u = (t * 0.4 + j / 6) % 1; ctx.fillStyle = `rgba(235,240,245,${0.45 * (1 - u)})`; ctx.beginPath(); ctx.arc(a + (j - 2.5) * 16, D - 10 - u * 90, 18 + 26 * u, 0, 7); ctx.fill() } })
  zones(0.7, (a, m, e, i) => { if (m - a < 360) return   // the skater builds an ice slide across the sky as he goes
    const kk = (t + i * 1.3) / 6, k = Math.floor(kk), u = (kk % 1) * 6 / 3.6, H = 120 + 80 * _h(k + i), x0 = a + 120, x1 = m - 120
    const pos = s => [x0 + (x1 - x0) * s, D - 30 - H * Math.sin(Math.PI * s)]
    if (u > 1.4) return; const fade = u > 1 ? (1.4 - u) / 0.4 : 1, s0 = Math.max(0, u - 0.7), s1 = Math.min(1, u)
    ctx.lineCap = "round"; ctx.beginPath(); for (let s = s0, f = 1; s <= s1 + 0.001; s += 0.02, f = 0) { const [px, py] = pos(s); f ? ctx.moveTo(px, py) : ctx.lineTo(px, py) }
    ctx.strokeStyle = `rgba(170,225,255,${0.8 * fade})`; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${0.9 * fade})`; ctx.lineWidth = 3; ctx.stroke()
    for (let s = Math.ceil(s0 * 12) / 12; s < s1; s += 1 / 12) { const [px, py] = pos(s); ctx.fillStyle = `rgba(200,240,255,${0.7 * fade})`; ctx.beginPath(); ctx.moveTo(px - 4, py + 4); ctx.lineTo(px, py + 16 + 6 * _h(s * 99)); ctx.lineTo(px + 4, py + 4); ctx.fill() }
    if (u <= 1) { const [px, py] = pos(u), [qx, qy] = pos(Math.max(0, u - 0.01)); orEnochFig(ctx, px, py - 3, Math.atan2(py - qy, px - qx) * 0.8)
      for (let n = 0; n < 5; n++) { ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(px - 10 - n * 6 * _h(n + k), py - 2 - 8 * _h(n * 3 + k + Math.floor(t * 20)), 2, 2) } } })
  zones(0.85, (a, m, e, i) => {
    for (let j = 0; j < 2; j++) { const sx = a + 170 + j * 330
      if (sx > m - 40) { ctx.fillStyle = "rgba(150,200,240,0.65)"; ctx.beginPath(); ctx.ellipse(sx, D - 3, 26, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#ff8a2a"; ctx.fillRect(sx + 4, D - 6, 8, 3); ctx.fillStyle = "#111"; ctx.fillRect(sx - 8, D - 5, 3, 3); ctx.fillRect(sx - 2, D - 6, 3, 3); continue }   // melted
      const near = m - sx < 140, wave = Math.sin(t * 3 + j * 2 + i) * 0.5
      ctx.fillStyle = "#f4f8ff"; for (const [r, y] of [[17, -17], [13, -43], [10, -63]]) { ctx.beginPath(); ctx.arc(sx, D + y, r, 0, 7); ctx.fill() }
      ctx.fillStyle = "#111"; ctx.fillRect(sx - 4, D - 66, 2.5, 2.5); ctx.fillRect(sx + 2, D - 66, 2.5, 2.5); ctx.fillRect(sx - 1, D - 47, 2, 2); ctx.fillRect(sx - 1, D - 40, 2, 2)
      ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.moveTo(sx, D - 63); ctx.lineTo(sx + 12, D - 61); ctx.lineTo(sx, D - 59); ctx.fill(); ctx.fillStyle = j ? "#d02a3a" : "#2a8ad0"; ctx.fillRect(sx - 11, D - 55, 22, 5)
      if (j === 0) { ctx.fillStyle = "#14141a"; ctx.fillRect(sx - 9, D - 75, 18, 4); ctx.fillRect(sx - 6, D - 88, 12, 13) }
      ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 12, D - 44); ctx.lineTo(sx - 28, D - 54 + wave * 14); ctx.moveTo(sx + 12, D - 44); ctx.lineTo(sx + 28, D - 52 - wave * 10); ctx.stroke()
      if (near) for (let d = 0; d < 3; d++) { const u = (t * 1.5 + d / 3) % 1; ctx.fillStyle = "rgba(120,190,255,0.85)"; ctx.beginPath(); ctx.arc(sx + 9 + d * 2, D - 70 + u * 30, 1.8, 0, 7); ctx.fill() } }   // sweating near the fire
    if (e - m > 200) { const lx = m + (e - m) * 0.28, gx = m + (e - m) * 0.78
      const lg = ctx.createRadialGradient(lx, D - 2, 4, lx, D - 2, 60); lg.addColorStop(0, "rgba(255,200,80,0.95)"); lg.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(lx, D - 2, 60, 10, 0, 0, 7); ctx.fill()
      for (let b = 0; b < 4; b++) { const u = (t * 0.8 + b / 4) % 1; ctx.strokeStyle = `rgba(255,220,120,${1 - u})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lx - 30 + b * 20, D - 4, 3 + 6 * u, Math.PI, 0); ctx.stroke() }
      const ph = (t + i * 0.9) % 3.3; if (ph < 0.9) { const hh = 150 * Math.sin(ph / 0.9 * Math.PI); const fg = ctx.createLinearGradient(0, D - hh, 0, D); fg.addColorStop(0, "rgba(255,230,120,0)"); fg.addColorStop(0.3, "rgba(255,170,60,0.9)"); fg.addColorStop(1, "rgba(255,80,20,0.95)")
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(gx - 14, D); ctx.quadraticCurveTo(gx - 20, D - hh * 0.5, gx, D - hh); ctx.quadraticCurveTo(gx + 20, D - hh * 0.5, gx + 14, D); ctx.fill() }
      ctx.fillStyle = "#2a1a16"; ctx.beginPath(); ctx.ellipse(gx, D - 2, 22, 6, 0, 0, 7); ctx.fill() } })
}
const orBackDim = (k, ctx, g) => (k === 0 ? orLab : k === 1 ? orSky : orFrost)(ctx, g)

// ── floors (painted in the fx pass, over the generated base floor; world-locked, simple perspective) ──
function orFloorDim(k, ctx, g) {
  const { dockTop: D, padL, padR, B, t } = g, vx = (padL + padR) / 2, bot = x0 => x0 + (x0 - vx) * 1.6, T = OR.skyT
  const slab = (x0, x1, top, botc) => { const gr = ctx.createLinearGradient(0, D, 0, B); gr.addColorStop(0, top); gr.addColorStop(1, botc); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, D); ctx.lineTo(x1, D); ctx.lineTo(bot(x1), B); ctx.lineTo(bot(x0), B); ctx.fill() }
  const grid = (step, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2; for (let x0 = Math.floor((padL - 1600) / step) * step; x0 < padR + 1600; x0 += step) { ctx.beginPath(); ctx.moveTo(x0, D); ctx.lineTo(bot(x0), B); ctx.stroke() }
    for (let n = 1; D + 6 * n ** 1.7 < B; n++) { const y = D + 6 * n ** 1.7; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padR, y); ctx.stroke() } }
  if (k === 0) { slab(padL - 3000, padR + 3000, "#34303e", "#14121a"); grid(120, "rgba(0,0,0,0.45)")
    for (let x = Math.floor(padL / 24) * 24; x < padR; x += 24) { ctx.fillStyle = (x / 24) % 2 ? "#e8c020" : "#14121a"; ctx.beginPath(); ctx.moveTo(x, D); ctx.lineTo(x + 24, D); ctx.lineTo(x + 18, D + 8); ctx.lineTo(x - 6, D + 8); ctx.fill() }
    ctx.fillStyle = `rgba(170,80,255,${0.35 + 0.2 * Math.sin(t * 3)})`; ctx.fillRect(padL, D + 30, padR - padL, 3) }
  else if (k === 1) { slab(padL - 3000, padR + 3000, "#c89a68", "#5a3e30"); grid(150, "rgba(60,30,20,0.25)")
    for (let i = Math.floor(padL / 1000) - 1; i * 1000 < padR + 1000; i++) { const px = i * 1000 + 500, py = D + 46   // launch pads
      ctx.fillStyle = "#3a3a46"; ctx.beginPath(); ctx.ellipse(px, py, 120, 20, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#ffc840"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, 104, 16, 0, 0, 7); ctx.stroke()
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.28); ctx.font = "900 70px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ffc840"; ctx.fillText("D", 0, 4); ctx.restore()
      for (let l = 0; l < 10; l++) { const a = l / 10 * Math.PI * 2; ctx.fillStyle = (Math.floor(t * 8) % 10) === l ? "#fff6c0" : "#7a6a3a"; ctx.beginPath(); ctx.arc(px + Math.cos(a) * 112, py + Math.sin(a) * 18, 2.6, 0, 7); ctx.fill() } }
    for (let x = Math.floor(padL / 37) * 37; x < padR; x += 37) if (_h(x) < 0.35) { const y = D + 12 + 60 * _h(x * 3); ctx.fillStyle = ["#ff6a8a", "#ffe066", "#ffffff", "#b07aff"][Math.floor(_h(x * 7) * 4)]; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill() }
    ctx.fillStyle = "#8ab05a"; ctx.fillRect(padL, D, padR - padL, 9); ctx.fillStyle = "#a8c868"
    for (let x = Math.floor(padL / 12) * 12; x < padR; x += 12) { const sw = 4 * Math.sin(T * 2 + x * 0.03); ctx.beginPath(); ctx.moveTo(x, D + 5); ctx.lineTo(x + 4 + sw, D - 7 - 4 * _h(x)); ctx.lineTo(x + 8, D + 5); ctx.fill() }
    for (let n = 0; n < 26; n++) { const span = padR - padL + 200, x = padL - 100 + ((n * 137 + T * 90 * (1 + _h(n))) % span), y = D - 300 + ((n * 53 + T * 25) % 420) + 20 * Math.sin(T * 2 + n)   // drifting petals
      ctx.save(); ctx.translate(x, y); ctx.rotate(T * 3 + n); ctx.fillStyle = n % 2 ? "rgba(255,170,200,0.9)" : "rgba(255,220,120,0.9)"; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fill(); ctx.restore() } }
  else { const iw = orTide(t)
    for (let i = Math.floor(padL / 1600) - 2; i * 1600 < padR + 3200; i++) { const b = i * 1600, m = b + iw
      slab(b, m + 1, "#d4ecf6", "#7aa8c8"); slab(m, b + 1601, "#3a2a26", "#120c0c")
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2; for (let c = 0; c < 4; c++) { const cx = b + 160 + 170 * c; if (cx > m - 80) break; ctx.beginPath(); ctx.ellipse(cx, D + 45 + 30 * _h(i + c), 70 + 20 * _h(c * 3), 12, 0, 0.2, 2.6); ctx.stroke() }   // skate marks
      ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5; for (let c = 0; c < 5; c++) { const cx = b + 60 + 140 * c + 40 * _h(i * 13 + c); if (cx > m - 90) break; const cy = D + 20 + (B - D - 40) * _h(i * 7 + c * 3); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 30, cy + 8); ctx.lineTo(cx + 46, cy - 4); ctx.lineTo(cx + 80, cy + 6); ctx.stroke() }
      ctx.strokeStyle = `rgba(255,120,40,${0.6 + 0.3 * Math.sin(t * 2 + i)})`; ctx.lineWidth = 2.5; for (let c = 0; c < 6; c++) { const cx = m + 70 + 130 * c + 30 * _h(i * 17 + c); if (cx > b + 1520) break; const cy = D + 20 + (B - D - 40) * _h(i * 5 + c * 3); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 30, cy + 8); ctx.lineTo(cx + 46, cy - 4); ctx.lineTo(cx + 80, cy + 6); ctx.stroke() }
      const sg = ctx.createLinearGradient(m - 50, 0, m + 50, 0); sg.addColorStop(0, "rgba(220,230,240,0)"); sg.addColorStop(0.5, "rgba(220,230,240,0.5)"); sg.addColorStop(1, "rgba(220,230,240,0)"); ctx.fillStyle = sg; ctx.fillRect(m - 50, D, 100, 30)
      ctx.fillStyle = "rgba(120,180,230,0.45)"; ctx.fillRect(b - 40, D, 80, 14) }
    for (let n = 0; n < 70; n++) { const x = padL + (padR - padL) * ((n * 0.6180339 + 0.37 * Math.floor(n / 35)) % 1), ice = (((x % 1600) + 1600) % 1600) < iw, u = (t * (ice ? 0.12 : 0.18) + n * 0.137) % 1
      const y = ice ? D - 320 + (B - D + 320) * u : B - (B - D + 320) * u
      ctx.fillStyle = ice ? "rgba(255,255,255,0.85)" : `rgba(255,${140 + 80 * _h(n) | 0},40,${0.9 * (1 - u)})`; ctx.beginPath(); ctx.arc(x + Math.sin(t + n) * 8, y, ice ? 2.2 : 1.8, 0, 7); ctx.fill() } }
}

// paint one layer for every dimension that is on screen: the current one; a rift opening into the next; or all three
// side by side after the knockout
function orPaint(ctx, g, fn) {
  const { padL, padR, dockTop: D, coverTop } = g, top = coverTop - 50, bottom = (g.B || D) + 50
  if (OR.merged) { const w = (padR - padL) / 3; for (let k = 0; k < 3; k++) { ctx.save(); ctx.beginPath(); ctx.rect(padL + k * w, top, w + 1, bottom - top); ctx.clip(); fn(k); ctx.restore() } return }
  const ph = OR.phase
  if (ph && ph.k === "wipe") { fn(ph.from); ctx.save(); ctx.beginPath(); ctx.arc((padL + padR) / 2, D - 150, orR(ph, g), 0, 7); ctx.clip(); fn(ph.to); ctx.restore(); return }
  fn(OR.dim)
}
const orR = (ph, g) => { const u = Math.min(1, ph.t / 0.9), e = u * u * (3 - 2 * u); return 4 + e * Math.hypot(g.padR - g.padL, 1500) }

function drawOriginalsBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const g = { W, dockTop, padL, padR, coverTop, t: now() }
  orPaint(ctx, g, k => orBackDim(k, ctx, g))
  const f = OR.flick; if (!f || OR.merged) return   // the GLITCH: another map of the game shows through
  const draw = () => { if (!f.set || !orDrawOther(ctx, f.set)) orBackDim(f.k ?? (OR.dim + 1) % 3, ctx, g) }
  if (f.full) { ctx.save(); ctx.beginPath(); ctx.rect(padL - 20, coverTop - 50, padR - padL + 40, 4000); ctx.clip(); draw(); ctx.restore(); return }
  for (const b of f.bands) { ctx.save(); ctx.beginPath(); ctx.rect(padL - 20, b.y, padR - padL + 40, b.h); ctx.clip(); ctx.translate(b.dx, 0); draw(); ctx.restore() }
}
function originalsFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), S = def.S, D = dockTop
  if (F[0] !== OR.p1) { Object.assign(OR, { p1: F[0], hp: new WeakMap(), dim: 0, phase: null, nextSwap: t + 9 + 4 * orRnd(), flick: null, nextGlitch: t + 3 + 3 * orRnd(), merged: null, banner: { txt: OR_NAMES[0], t: 2.4 }, unstable: false, shout: [], win: new Map(), nextFlash: t + 6 + 4 * orRnd(), flashUntil: 0 })
    OR.st = { swaps: 0, shakes: 0, flickers: 0, glitches: 0, glimpsed: [], unstable: 0, merged: 0, flashes: 0, seen: [1, 0, 0] } }
  const dt = Math.min(0.05, Math.max(0, t - (OR.last || t))); OR.last = t
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2, feet = D + def.standRow * S, cx = (padL + padR) / 2
  orPoolTick()
  // FLASH TIME (Dseyl's sky drops to slow motion; the speedster doesn't)
  if (t > OR.nextFlash) { OR.flashUntil = t + 3; OR.nextFlash = t + 11 + 6 * orRnd(); OR.st.flashes++; if (OR.dim === 1 && !OR.merged && !OR.phase) orShout(cx, D - 175, "⚡ FLASH TIME ⚡", "#c89a10") }
  OR.flashK = Math.max(0, Math.min(1, OR.flashK + (t < OR.flashUntil ? 4 : -3) * dt)); OR.skyT += dt * (1 - 0.85 * OR.flashK)
  let big = false, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = OR.hp.get(f); OR.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = true }
  // the multiverse timeline (the full switch only moves between the three originals)
  if (low && !OR.unstable && !OR.merged) { OR.st.unstable++; orShout(mid, feet - 240, "THE MULTIVERSE IS SPLITTING!", "#8a2ad0"); OR.nextSwap = Math.min(OR.nextSwap, t + 2.5) }
  OR.unstable = low
  if (ko && !OR.merged) { OR.merged = { t: 0 }; OR.phase = null; OR.flick = null; OR.st.merged++; OR.st.seen = [1, 1, 1]; camera.shake?.(12, 30); OR.st.shakes++ }
  if (OR.merged) { OR.merged.t += dt; if (!ko && OR.merged.t > 4) { OR.merged = null; OR.nextSwap = t + 8; OR.banner = { txt: OR_NAMES[OR.dim], t: 2.4 } } }
  if (!OR.merged) {
    const start = to => { OR.phase = { k: "rumble", t: 0, to }; camera.shake?.(4, 60); OR.st.shakes++ }
    if (OR.forceTo != null) { if (OR.phase && OR.phase.k === "wipe") OR.dim = OR.phase.to; OR.phase = null; if (OR.forceTo !== OR.dim) start(OR.forceTo); OR.forceTo = null }
    if (!OR.phase && t > OR.nextSwap) start((OR.dim + 1 + (orRnd() < 0.5 ? 0 : 1)) % 3)
    const ph = OR.phase
    if (ph) { ph.t += dt
      if (ph.k === "rumble" && ph.t > 1) { OR.phase = { k: "wipe", t: 0, to: ph.to, from: OR.dim }; camera.shake?.(10, 24); OR.st.shakes++ }
      else if (ph.k === "wipe" && ph.t > 0.9) { OR.dim = ph.to; OR.st.seen[ph.to] = 1; OR.st.swaps++; OR.phase = null; OR.nextSwap = t + (OR.unstable ? 6 + 5 * orRnd() : 14 + 12 * orRnd()); OR.banner = { txt: OR_NAMES[ph.to], t: 2.4 } } }
    // the GLITCH: at random (and on big hits) another map of the game flashes through for a split second
    if (!OR.flick && !OR.phase && (t > OR.nextGlitch || big)) { const m = orTakeReady(), full = OR.glitchFull ?? orRnd() < 0.35; OR.glitchFull = null
      OR.flick = m ? { set: m[0], name: m[1].toUpperCase(), full, t: full ? 0.3 : 0.45, bands: [], next: 0 } : { set: null, k: (OR.dim + 1 + (orRnd() < 0.5 ? 0 : 1)) % 3, name: "", full: false, t: 0.4, bands: [], next: 0 }
      OR.st.glitches++; if (m && !OR.st.glimpsed.includes(m[1])) OR.st.glimpsed.push(m[1]); OR.nextGlitch = t + (OR.unstable ? 2 : 3.5) + 4 * orRnd(); camera.shake?.(full ? 5 : 3, 8) }
    if (big) { OR.st.flickers++; if (OR.st.flickers % 2 === 1) orShout(mid + (orRnd() - 0.5) * 260, D - 120, [["ANOMALY DETECTED.", "KAMUI!", "DATA LOGGED."], ["TOO SLOW!", "FLASH TIME!", "BLINK AND YOU MISS IT!"], ["CHILL OUT!", "TURN UP THE HEAT!", "STAY FROSTY!"]][OR.dim][(OR.st.flickers >> 1) % 3], `rgb(${OR_TINT[OR.dim]})`) } }
  const f = OR.flick
  if (f) { f.t -= dt; if (f.t <= 0) OR.flick = null
    else if (!f.full && t > f.next) { f.next = t + 0.07; f.bands = Array.from({ length: 2 + Math.floor(orRnd() * 3) }, () => ({ y: D - 330 + orRnd() * 300, h: 14 + orRnd() * 60, dx: (orRnd() - 0.5) * 40 })) } }
  // floors for whatever is on screen, then the watchers (a full-screen glitch shows the other map's own floor)
  const g = { W, dockTop: D, padL, padR, coverTop: D - 900, B: coverBottom, t }
  if (!(OR.flick && OR.flick.full)) { orPaint(ctx, g, k => orFloorDim(k, ctx, g)); drawCrowd(ctx, ORC, { W, feet, sh: shift(0.9, W) }) }
  if (OR.flick) { const fl = OR.flick   // glitch dressing: RGB split lines + the glimpsed map's name
    const rows = fl.full ? [{ y: D - 330, h: coverBottom - D + 330 }] : fl.bands
    for (const b of rows) { ctx.fillStyle = "rgba(255,0,80,0.28)"; ctx.fillRect(padL, b.y, padR - padL, 2); ctx.fillStyle = "rgba(0,255,230,0.28)"; ctx.fillRect(padL, b.y + b.h - 2, padR - padL, 2) }
    for (let j = 0; j < 8; j++) { const y = D - 330 + 400 * _h(Math.floor(t * 40) * 9 + j); ctx.fillStyle = j % 2 ? "rgba(255,40,120,0.18)" : "rgba(40,255,230,0.18)"; ctx.fillRect(padL, y, padR - padL, 3) }
    if (fl.name) { ctx.save(); ctx.font = "900 15px monospace"; ctx.textAlign = "left"; ctx.fillStyle = "rgba(0,0,0,0.6)"; const tx = padL + 30, ty = D - 300; ctx.fillRect(tx - 8, ty - 14, ctx.measureText("▓ SIGNAL: " + fl.name).width + 16, 22)
      ctx.fillStyle = "#ff3a7a"; ctx.fillText("▓ SIGNAL: " + fl.name, tx + 2, ty + 2); ctx.fillStyle = "#7affef"; ctx.fillText("▓ SIGNAL: " + fl.name, tx, ty); ctx.restore() } }
  // cracks in reality (the rumble before a rift; faint and constant once the multiverse is unstable)
  const ph = OR.phase, crack = ph && ph.k === "rumble" ? Math.min(1, ph.t) : OR.unstable && !OR.merged ? 0.25 : 0
  if (crack > 0) { const seed = OR.st.swaps * 17 + (ph ? ph.to : 9), col = OR_TINT[ph ? ph.to : (OR.dim + 1) % 3]
    for (let r = 0; r < 9; r++) { let a = r / 9 * Math.PI * 2 + _h(seed + r), x = cx, y = D - 150; ctx.beginPath(); ctx.moveTo(x, y)
      for (let s = 0; s < 8; s++) { a += (_h(seed * 3 + r * 11 + s) - 0.5) * 0.9; const L = (20 + 60 * _h(r + s * 7)) * crack; x += Math.cos(a) * L; y += Math.sin(a) * L; ctx.lineTo(x, y) }
      ctx.strokeStyle = `rgba(${col},${0.5 * crack})`; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${0.9 * crack})`; ctx.lineWidth = 2; ctx.stroke() } }
  if (ph && ph.k === "wipe") { const R = orR(ph, g); ctx.strokeStyle = `rgba(${OR_TINT[ph.to]},0.8)`; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, D - 150, R, 0, 7); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3; ctx.stroke() }
  // after the knockout: all three side by side
  if (OR.merged) { const w = (padR - padL) / 3, a = Math.min(1, OR.merged.t * 2)
    for (let k = 1; k < 3; k++) { const x = padL + k * w; ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`; ctx.fillRect(x - 2, D - 900, 4, coverBottom - D + 900); ctx.fillStyle = `rgba(200,160,255,${0.3 * a})`; ctx.fillRect(x - 10, D - 900, 20, coverBottom - D + 900) }
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"
    ctx.font = "900 38px Arial"; ctx.lineWidth = 7; ctx.strokeStyle = "#120a1e"; ctx.strokeText("THE ORIGINALS", cx, D - 245); ctx.fillStyle = "#fff"; ctx.fillText("THE ORIGINALS", cx, D - 245)
    ctx.font = "900 20px Arial"; for (let k = 0; k < 3; k++) { const x = padL + (k + 0.5) * w; ctx.lineWidth = 5; ctx.strokeText(OR_WHO[k], x, D - 200); ctx.fillStyle = `rgb(${OR_TINT[k]})`; ctx.fillText(OR_WHO[k], x, D - 200) }
    ctx.restore() }
  if (OR.banner && !OR.merged) { const b = OR.banner; b.t -= dt; if (b.t <= 0) OR.banner = null; else {
    ctx.save(); ctx.globalAlpha = Math.min(1, b.t * 2, (2.4 - b.t) * 4); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "900 26px Arial"; ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = "#120a1e"
    ctx.strokeText(b.txt, cx, D - 240); ctx.fillStyle = `rgb(${OR_TINT[OR.dim]})`; ctx.fillText(b.txt, cx, D - 240); ctx.restore() } }
  for (const s of OR.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  OR.shout = OR.shout.filter(s => s.t > 0)
}

// ───────────────────────────── MULTIVERSE ROULETTE (render-only, wall clock, own PRNG) ─────────────────────────────
// The map itself is random: every match starts in a random map of the game, and — like The Originals, but across ALL of
// them — every 12–22 s (6–10 s once someone is close to losing) the screen rumbles, reality cracks and a rift opens from
// the centre into ANOTHER random map; at random (and on big hits) other maps glitch through for a split second. Each map
// is drawn live, whole (its own art, life and reactions) through drawLayeredStageBack; its foreground props too.
// KO → three maps side by side, "MULTIVERSE ROULETTE". The song is random as well (game.js: every map's songs).
let _rmSeed = 0x2545f491 ^ 0x4f6cdd1d
const rmRnd = () => { _rmSeed ^= _rmSeed << 13; _rmSeed ^= _rmSeed >>> 17; _rmSeed ^= _rmSeed << 5; return (_rmSeed >>> 0) / 4294967296 }
const RM_MAPS = OR_MAPS.concat([["code_originals", "The Originals"]]).filter(([s]) => SETS[s] && !SETS[s].mode)
const RM = { p1: null, last: 0, hp: new WeakMap(), cur: null, phase: null, nextSwap: 0, flick: null, nextGlitch: 0, merged: null, banner: null, unstable: false, forceTo: null, glitchFull: null, pool: [], shout: [],
  st: { swaps: 0, shakes: 0, glitches: 0, visited: [], glimpsed: [], unstable: 0, merged: 0 } }
const rmName = s => (RM_MAPS.find(m => m[0] === s) || [s, s])[1]
export const randomMapState = () => ({ cur: RM.cur ? rmName(RM.cur) : "", ready: !!RM.cur && layeredStageReady({ layers: RM.cur }), swaps: RM.st.swaps, shakes: RM.st.shakes, glitches: RM.st.glitches,
  visited: RM.st.visited.slice(), glimpsed: RM.st.glimpsed.slice(), unstable: RM.st.unstable, mergedCount: RM.st.merged, merged: RM.merged ? +RM.merged.t.toFixed(2) : 0,
  phase: RM.phase ? RM.phase.k : "", nextIn: +(RM.nextSwap - now()).toFixed(1), shouting: RM.shout.filter(s => s.t > 0).map(s => s.txt) })
export const randomMapGo = () => { RM.forceTo = true }                          // tests: open a rift now
export const randomMapGlitch = full => { RM.nextGlitch = 0; RM.glitchFull = full }  // tests: glitch now
function rmPoolTick() { let guard = 0; while (RM.pool.length < 4 && guard++ < 30) { const m = RM_MAPS[Math.floor(rmRnd() * RM_MAPS.length)]; if (m && m[0] !== RM.cur && !RM.pool.includes(m)) RM.pool.push(m) } for (const m of RM.pool) layeredStageReady({ layers: m[0] }) }
function rmTakeReady() { const i = RM.pool.findIndex(m => m[0] !== RM.cur && layeredStageReady({ layers: m[0] })); return i < 0 ? null : RM.pool.splice(i, 1)[0] }
function rmShout(x, y, txt, col) { if (RM.shout.filter(s => s.t > 0).length < 3) RM.shout.push({ x, y, txt, col: col || "#222", t: 2.2 }) }
function rmVisit(s) { const n = rmName(s); if (!RM.st.visited.includes(n)) RM.st.visited.push(n) }
// the map in front of the fighters right now (its foreground props are drawn by drawLayeredStageFront)
const rmFrontSet = () => RM.merged ? null : RM.phase && RM.phase.k === "wipe" ? RM.phase.from : RM.cur
function drawRandomStage(ctx, def, { canvasWidth, W, groundY, coverTop, coverBottom }) {
  const t = now(), F = (_lastWorld?.fighters || []).filter(Boolean), v = view(canvasWidth, W), padL = v.left - 8, padR = v.right + 8
  const cx = (padL + padR) / 2, cy = groundY - 200, D = groundY - 48
  if (F[0] !== RM.p1 || !RM.cur) { const m = RM_MAPS[Math.floor(rmRnd() * RM_MAPS.length)]
    Object.assign(RM, { p1: F[0], hp: new WeakMap(), cur: m[0], phase: null, nextSwap: t + 12 + 8 * rmRnd(), flick: null, nextGlitch: t + 4 + 4 * rmRnd(), merged: null, banner: { txt: m[1].toUpperCase(), t: 2.6 }, unstable: false, shout: [] })
    RM.st = { swaps: 0, shakes: 0, glitches: 0, visited: [], glimpsed: [], unstable: 0, merged: 0 }; rmVisit(m[0]) }
  const dt = Math.min(0.05, Math.max(0, t - (RM.last || t))); RM.last = t
  rmPoolTick(); layeredStageReady({ layers: RM.cur })
  const mid = F.length ? F.reduce((a, f) => a + f.x + (f.w || 50) / 2, 0) / F.length : W / 2
  let big = false, low = false, ko = false
  for (const f of F) { const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000, was = RM.hp.get(f); RM.hp.set(f, hp)
    if (hp <= 0) ko = true; else if (hp / max <= 0.25) low = true
    if (was != null && was - hp >= 60) big = true }
  if (low && !RM.unstable && !RM.merged) { RM.st.unstable++; rmShout(mid, D - 190, "THE MULTIVERSE IS SPINNING OUT!", "#8a2ad0"); RM.nextSwap = Math.min(RM.nextSwap, t + 2.5) }
  RM.unstable = low
  if (ko && !RM.merged) { const a = rmTakeReady(), b = rmTakeReady(); RM.merged = { t: 0, maps: [RM.phase && RM.phase.k === "wipe" ? RM.phase.to : RM.cur, a ? a[0] : RM.cur, b ? b[0] : RM.cur] }; RM.phase = null; RM.flick = null; RM.st.merged++; camera.shake?.(12, 30); RM.st.shakes++ }
  if (RM.merged) { RM.merged.t += dt; if (!ko && RM.merged.t > 4) { RM.merged = null; RM.nextSwap = t + 8 } }
  if (!RM.merged) {
    const start = () => { const m = rmTakeReady(); if (!m) { RM.nextSwap = t + 1; return } RM.phase = { k: "rumble", t: 0, to: m[0], name: m[1] }; camera.shake?.(4, 60); RM.st.shakes++ }
    if (RM.forceTo) { if (RM.phase && RM.phase.k === "wipe") RM.cur = RM.phase.to; RM.phase = null; RM.forceTo = null; start() }
    if (!RM.phase && t > RM.nextSwap) start()
    const ph = RM.phase
    if (ph) { ph.t += dt
      if (ph.k === "rumble" && ph.t > 1) { RM.phase = { k: "wipe", t: 0, to: ph.to, name: ph.name, from: RM.cur }; camera.shake?.(10, 24); RM.st.shakes++ }
      else if (ph.k === "wipe" && ph.t > 0.9) { RM.cur = ph.to; rmVisit(ph.to); RM.st.swaps++; RM.phase = null; RM.nextSwap = t + (RM.unstable ? 6 + 4 * rmRnd() : 12 + 10 * rmRnd()); RM.banner = { txt: ph.name.toUpperCase(), t: 2.4 } } }
    if (!RM.flick && !RM.phase && (t > RM.nextGlitch || big)) { const m = rmTakeReady(); RM.nextGlitch = t + (RM.unstable ? 2 : 4) + 4 * rmRnd()
      if (m) { const full = RM.glitchFull ?? rmRnd() < 0.35; RM.glitchFull = null; RM.flick = { set: m[0], name: m[1].toUpperCase(), full, t: full ? 0.3 : 0.45, bands: [], next: 0 }; RM.st.glitches++; if (!RM.st.glimpsed.includes(m[1])) RM.st.glimpsed.push(m[1]); RM.pool.push(m); camera.shake?.(full ? 5 : 3, 8) } } }
  const f = RM.flick
  if (f) { f.t -= dt; if (f.t <= 0) RM.flick = null
    else if (!f.full && t > f.next) { f.next = t + 0.07; f.bands = Array.from({ length: 2 + Math.floor(rmRnd() * 3) }, () => ({ y: D - 330 + rmRnd() * 420, h: 14 + rmRnd() * 60, dx: (rmRnd() - 0.5) * 40 })) } }
  // ── draw ──
  const top = coverTop - 50, bottom = coverBottom + 50
  const drawMap = s => { if (!s || !orDrawOther(ctx, s)) { orStatic(ctx, padL, top, padR - padL, bottom - top, t); ctx.font = "900 22px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#c8a8ff"; ctx.fillText("TUNING IN…", cx, cy) } }
  if (RM.merged) { const w = (padR - padL) / 3; RM.merged.maps.forEach((s, k) => { ctx.save(); ctx.beginPath(); ctx.rect(padL + k * w, top, w + 1, bottom - top); ctx.clip(); drawMap(s); ctx.restore() }) }
  else if (RM.phase && RM.phase.k === "wipe") { const ph = RM.phase, u = Math.min(1, ph.t / 0.9), R = 4 + u * u * (3 - 2 * u) * Math.hypot(padR - padL, 1500)
    drawMap(ph.from); ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip(); drawMap(ph.to); ctx.restore()
    ctx.strokeStyle = "rgba(200,140,255,0.8)"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3; ctx.stroke() }
  else { drawMap(RM.cur)
    if (f) { if (f.full) { ctx.save(); ctx.beginPath(); ctx.rect(padL - 20, top, padR - padL + 40, bottom - top); ctx.clip(); orDrawOther(ctx, f.set); ctx.restore() }
      else for (const b of f.bands) { ctx.save(); ctx.beginPath(); ctx.rect(padL - 20, b.y, padR - padL + 40, b.h); ctx.clip(); ctx.translate(b.dx, 0); orDrawOther(ctx, f.set); ctx.restore() }
      const rows = f.full ? [{ y: D - 330, h: coverBottom - D + 330 }] : f.bands
      for (const b of rows) { ctx.fillStyle = "rgba(255,0,80,0.28)"; ctx.fillRect(padL, b.y, padR - padL, 2); ctx.fillStyle = "rgba(0,255,230,0.28)"; ctx.fillRect(padL, b.y + b.h - 2, padR - padL, 2) }
      for (let j = 0; j < 8; j++) { const y = D - 330 + 420 * _h(Math.floor(t * 40) * 9 + j); ctx.fillStyle = j % 2 ? "rgba(255,40,120,0.18)" : "rgba(40,255,230,0.18)"; ctx.fillRect(padL, y, padR - padL, 3) }
      ctx.save(); ctx.font = "900 15px monospace"; ctx.textAlign = "left"; const tx = padL + 30, ty = D - 300, label = "▓ SIGNAL: " + f.name; ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(tx - 8, ty - 14, ctx.measureText(label).width + 16, 22)
      ctx.fillStyle = "#ff3a7a"; ctx.fillText(label, tx + 2, ty + 2); ctx.fillStyle = "#7affef"; ctx.fillText(label, tx, ty); ctx.restore() } }
  // cracks before a rift (faint and constant once the multiverse is unstable)
  const ph = RM.phase, crack = ph && ph.k === "rumble" ? Math.min(1, ph.t) : RM.unstable && !RM.merged ? 0.25 : 0
  if (crack > 0) { const seed = RM.st.swaps * 17 + 5
    for (let r = 0; r < 9; r++) { let a = r / 9 * Math.PI * 2 + _h(seed + r), x = cx, y = cy; ctx.beginPath(); ctx.moveTo(x, y)
      for (let s = 0; s < 8; s++) { a += (_h(seed * 3 + r * 11 + s) - 0.5) * 0.9; const L = (20 + 60 * _h(r + s * 7)) * crack; x += Math.cos(a) * L; y += Math.sin(a) * L; ctx.lineTo(x, y) }
      ctx.strokeStyle = `rgba(200,140,255,${0.5 * crack})`; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${0.9 * crack})`; ctx.lineWidth = 2; ctx.stroke() } }
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"
  if (RM.merged) { const w = (padR - padL) / 3, a = Math.min(1, RM.merged.t * 2); ctx.globalAlpha = a
    for (let k = 1; k < 3; k++) { const x = padL + k * w; ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillRect(x - 2, top, 4, bottom - top); ctx.fillStyle = "rgba(200,160,255,0.3)"; ctx.fillRect(x - 10, top, 20, bottom - top) }
    ctx.font = "900 36px Arial"; ctx.lineWidth = 7; ctx.strokeStyle = "#120a1e"; ctx.strokeText("MULTIVERSE ROULETTE", cx, D - 245); ctx.fillStyle = "#fff"; ctx.fillText("MULTIVERSE ROULETTE", cx, D - 245)
    ctx.font = "900 17px Arial"; RM.merged.maps.forEach((s, k) => { const x = padL + (k + 0.5) * w, n = rmName(s).toUpperCase(); ctx.lineWidth = 5; ctx.strokeText(n, x, D - 205); ctx.fillStyle = "#e2c8ff"; ctx.fillText(n, x, D - 205) }) }
  else if (RM.banner) { const b = RM.banner; b.t -= dt; if (b.t <= 0) RM.banner = null; else { ctx.globalAlpha = Math.min(1, b.t * 2, (2.6 - b.t) * 4); ctx.font = "900 26px Arial"; ctx.lineWidth = 6; ctx.strokeStyle = "#120a1e"
    ctx.strokeText("⟢ " + b.txt + " ⟣", cx, D - 240); ctx.fillStyle = "#e2c8ff"; ctx.fillText("⟢ " + b.txt + " ⟣", cx, D - 240) } }
  ctx.restore()
  for (const s of RM.shout) { s.t -= dt; if (s.t <= 0) continue
    ctx.save(); ctx.globalAlpha = Math.min(1, s.t * 3); ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(s.txt).width + 16
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x - w / 2, s.y - 13, w, 26); ctx.fill(); ctx.stroke(); ctx.fillStyle = s.col; ctx.fillText(s.txt, s.x, s.y + 1); ctx.restore() }
  RM.shout = RM.shout.filter(s => s.t > 0)
  return true
}

// ── WOODSBORO: THE NIGHT OF THE SLASHERS (render-only; the background is a massacre in progress) ──
// Killers hunt people down the street behind the fight: GHOSTFACE chases and stabs, CHUCKY sprints after them, leaps on
// their back and stabs away cackling, JASON stalks, cuts them down with his machete and crouches over the body feeding.
// Bodies and blood stay where they fall (until the next match); victims scream as they run.
const WBK = { list: [], bodies: [], drops: [], next: 0.6, id: 0, kills: 0, last: 0 }
const WB_LOOKS = [["#c83a3a", "#2a3a6a", "#f0c8a0", "#3a2418"], ["#e8e0d0", "#3a3a3a", "#8a5a3a", "#111"], ["#3a8ad0", "#5a4a3a", "#f2d2b2", "#d8b060"], ["#d070b0", "#2a2a3a", "#c89070", "#5a2a1a"], ["#6aa84a", "#2a2a2a", "#5a3a26", "#111"], ["#f0d040", "#3a4a8a", "#f0c8a0", "#8a3a1a"]]
const WB_SCREAMS = ["AAAAH!", "HELP!!", "NO NO NO!", "SOMEBODY HELP!", "RUN!!", "PLEASE!", "AAAAAAAH!"]
function wbVictim(ctx, v, x, y, s, t, pose, fall, ph) {   // pose: run | back | stagger | dead
  const L = WB_LOOKS[v.look]
  ctx.save(); ctx.translate(x, y); ctx.scale(s * v.dir, s)
  if (pose === "dead") {
    ctx.fillStyle = L[1]; ctx.fillRect(-36, -7, 30, 7); ctx.fillStyle = L[0]; ctx.fillRect(-8, -9, 28, 9); ctx.fillStyle = "rgba(120,0,0,0.9)"; ctx.fillRect(0, -9, 12, 9)
    ctx.fillStyle = L[2]; ctx.save(); ctx.translate(8, -6); ctx.rotate(-2.4); ctx.fillRect(0, -2, 18, 4); ctx.restore(); ctx.beginPath(); ctx.arc(27, -6, 6.5, 0, 7); ctx.fill()
    ctx.fillStyle = L[3]; ctx.beginPath(); ctx.arc(29, -7, 6.8, -0.6, 2.2); ctx.fill(); ctx.restore(); return }
  ctx.rotate(-fall * 1.45)
  const sw = pose === "run" ? Math.sin(ph) * 0.9 : pose === "back" ? Math.sin(ph) * 0.4 : Math.sin(t * 6) * 0.15
  ctx.fillStyle = L[1]; for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 3, -30); ctx.rotate(k * sw); ctx.fillRect(-3.5, 0, 7, 30); ctx.restore() }
  ctx.fillStyle = L[0]; ctx.fillRect(-8, -60, 16, 32)
  if (v.hurt) { ctx.fillStyle = "rgba(140,0,0,0.9)"; ctx.fillRect(-8, -52, 12, 14); ctx.fillRect(-4, -38, 6, 10) }
  ctx.fillStyle = L[2]
  for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 6, -58); ctx.rotate(pose === "stagger" ? Math.PI * 0.9 + k * 0.6 : Math.PI + k * 0.5 + Math.sin(t * 15 + k + v.look) * 0.45); ctx.fillRect(-2.5, 0, 5, 21); ctx.restore() }
  ctx.beginPath(); ctx.arc(1, -68, 8, 0, 7); ctx.fill(); ctx.fillStyle = L[3]; ctx.beginPath(); ctx.arc(0, -71, 8.4, Math.PI * 0.9, Math.PI * 2.1); ctx.fill()
  ctx.fillStyle = "#1a0606"; ctx.beginPath(); ctx.ellipse(5, -65, 2.4, 3.6, 0, 0, 7); ctx.fill()   // screaming
  ctx.restore()
}
function wbKnife(ctx, len, bloody) { ctx.fillStyle = "#3a2a20"; ctx.fillRect(-2, -2, 8, 4); ctx.fillStyle = "#d8dce4"; ctx.beginPath(); ctx.moveTo(6, -2.5); ctx.lineTo(6 + len, 0); ctx.lineTo(6, 2.5); ctx.fill(); if (bloody) { ctx.fillStyle = "#a00"; ctx.fillRect(6 + len * 0.4, -2, len * 0.55, 3) } }
function wbGhostKiller(ctx, x, y, s, dir, t, run, stab) {   // Ghostface: flowing black robe, the mask, a raised knife
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s)
  const fl = run ? Math.sin(t * 16) * 5 : Math.sin(t * 2) * 1.5
  ctx.fillStyle = "#08080c"; ctx.beginPath(); ctx.moveTo(-9, -62); ctx.lineTo(9, -62); ctx.lineTo(15 + fl, 0); for (let k = 0; k < 6; k++) ctx.lineTo(15 - k * 6 + (k % 2 ? 3 : -3), k % 2 ? -5 : 0); ctx.lineTo(-17 - fl, 0); ctx.fill()
  ctx.fillStyle = "#08080c"; ctx.save(); ctx.translate(-5, -56); ctx.rotate(run ? 0.6 + Math.sin(t * 16) * 0.5 : 0.3); ctx.fillRect(-3, 0, 6, 24); ctx.restore()
  const a = stab != null ? (stab < 0.35 ? 0.4 - 2.8 * (stab / 0.35) : -2.4 + 3.2 * ((stab - 0.35) / 0.65)) : run ? -0.4 + Math.sin(t * 16 + 1) * 0.5 : -1.2
  ctx.save(); ctx.translate(6, -56); ctx.rotate(a); ctx.fillRect(-3, 0, 6, 24); ctx.translate(0, 24); ctx.rotate(Math.PI / 2); ctx.fillStyle = "#e8e8e8"; ctx.fillRect(-3, -3, 6, 6); wbKnife(ctx, 16, stab != null); ctx.restore()
  wbMask(ctx, 1, -72, 0.85); ctx.restore()
}
function wbChucky(ctx, x, y, s, dir, t, run, stab) {   // the killer doll: red hair, scarred face, striped shirt, overalls, big knife
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir * 0.62, s * 0.62)
  const sw = run ? Math.sin(t * 22) * 0.9 : 0
  ctx.fillStyle = "#2a4a8a"; for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 4, -26); ctx.rotate(k * sw); ctx.fillRect(-4, 0, 8, 24); ctx.fillStyle = "#e8e8e8"; ctx.fillRect(-5, 20, 11, 6); ctx.fillStyle = "#2a4a8a"; ctx.restore() }
  const stripes = ["#d02a2a", "#f0c020", "#2aa04a", "#2a6ad0", "#f07a20"]
  for (let i = 0; i < 6; i++) { ctx.fillStyle = stripes[i % 5]; ctx.fillRect(-11, -54 + i * 5, 22, 5) }
  ctx.fillStyle = "#3a5aa8"; ctx.fillRect(-9, -42, 18, 18); ctx.fillRect(-9, -52, 4, 12); ctx.fillRect(5, -52, 4, 12)
  ctx.save(); ctx.translate(-8, -50); ctx.rotate(run ? 0.8 + Math.sin(t * 22) * 0.6 : 0.4); for (let i = 0; i < 4; i++) { ctx.fillStyle = stripes[i % 5]; ctx.fillRect(-3, i * 5, 6, 5) } ctx.restore()
  const a = stab != null ? (stab < 0.4 ? -2.6 : 0.6) : run ? -0.6 + Math.sin(t * 22 + 1) * 0.6 : -1.6
  ctx.save(); ctx.translate(8, -50); ctx.rotate(a); for (let i = 0; i < 4; i++) { ctx.fillStyle = stripes[(i + 2) % 5]; ctx.fillRect(-3, i * 5, 6, 5) } ctx.translate(0, 20); ctx.rotate(Math.PI / 2); ctx.fillStyle = "#f2d2b2"; ctx.fillRect(-3, -3, 6, 6); wbKnife(ctx, 26, true); ctx.restore()
  ctx.fillStyle = "#f2d2b2"; ctx.beginPath(); ctx.ellipse(0, -68, 13, 14, 0, 0, 7); ctx.fill()
  ctx.strokeStyle = "#6a2a2a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-9, -76); ctx.lineTo(-3, -62); for (let k = 0; k < 4; k++) { ctx.moveTo(-9 + k * 1.6, -73 + k * 3.4); ctx.lineTo(-4 + k * 1.6, -74 + k * 3.4) } ctx.moveTo(5, -60); ctx.lineTo(10, -70); ctx.stroke()
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(-8, -73); ctx.lineTo(-1, -71); ctx.moveTo(3, -71); ctx.lineTo(10, -73); ctx.lineWidth = 2; ctx.strokeStyle = "#111"; ctx.stroke()
  ctx.fillStyle = "#2a6ad0"; ctx.fillRect(-6, -69, 3, 3); ctx.fillRect(4, -69, 3, 3)
  ctx.fillStyle = "#6a0a0a"; ctx.beginPath(); ctx.moveTo(-6, -61); ctx.quadraticCurveTo(1, -55, 9, -62); ctx.quadraticCurveTo(1, -59, -6, -61); ctx.fill()
  ctx.fillStyle = "#d8461a"; for (let k = 0; k < 7; k++) { const hx = -13 + k * 4.4; ctx.beginPath(); ctx.moveTo(hx, -72); ctx.lineTo(hx + 2 + Math.sin(t * 9 + k), -88 - 3 * (k % 2)); ctx.lineTo(hx + 5, -74); ctx.fill() }
  ctx.restore()
}
function wbJason(ctx, x, y, s, dir, t, mode, swing) {   // the hockey mask, a big frame, a machete; mode: walk | swing | feed | stand
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir * 1.15, s * 1.15)
  if (mode === "feed") { ctx.translate(0, 26); ctx.rotate(0.9 + Math.sin(t * 9) * 0.12) }
  const sw = mode === "walk" ? Math.sin(t * 4) * 0.35 : 0
  ctx.fillStyle = "#2a241e"; for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 4, -30); ctx.rotate(k * sw); ctx.fillRect(-4.5, 0, 9, 30); ctx.restore() }
  ctx.fillStyle = "#3a4030"; ctx.fillRect(-12, -64, 24, 36); ctx.fillStyle = "#2a2e22"; ctx.fillRect(-12, -64, 24, 5)
  ctx.fillStyle = "#3a4030"; ctx.save(); ctx.translate(-9, -60); ctx.rotate(mode === "feed" ? -1.2 : 0.2 + sw); ctx.fillRect(-4, 0, 8, 26); ctx.restore()
  const a = mode === "swing" ? -2.6 + 3.6 * Math.min(1, swing) : mode === "feed" ? -1.6 + Math.sin(t * 9) * 0.3 : 0.15
  ctx.save(); ctx.translate(9, -60); ctx.rotate(a); ctx.fillStyle = "#3a4030"; ctx.fillRect(-4, 0, 8, 26); ctx.translate(0, 26); ctx.rotate(Math.PI / 2)
  ctx.fillStyle = "#2a1a10"; ctx.fillRect(-2, -3, 10, 6); ctx.fillStyle = "#b8bcc4"; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(40, -6); ctx.lineTo(46, 0); ctx.lineTo(8, 4); ctx.fill(); ctx.fillStyle = "#8a0000"; ctx.fillRect(18, -4, 22, 4); ctx.restore()
  ctx.fillStyle = "#4a3a2e"; ctx.beginPath(); ctx.arc(0, -73, 10, 0, 7); ctx.fill()
  ctx.fillStyle = "#e8e4d8"; ctx.beginPath(); ctx.ellipse(2, -73, 8.5, 10.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#111"
  for (const [hx, hy] of [[-1, -76], [5, -76], [2, -68], [-2, -71], [6, -71], [2, -80]]) { ctx.beginPath(); ctx.arc(hx, hy, hx === 2 && hy === -80 ? 0.8 : 1.3, 0, 7); ctx.fill() }
  ctx.fillStyle = "#b81a1a"; for (const [hx, hy] of [[2, -82], [-4, -73], [8, -73]]) { ctx.beginPath(); ctx.moveTo(hx - 2, hy); ctx.lineTo(hx, hy - 3); ctx.lineTo(hx + 2, hy); ctx.fill() }
  if (mode === "feed") { ctx.fillStyle = "rgba(150,0,0,0.9)"; ctx.fillRect(-2, -64, 9, 4) }
  ctx.restore()
}
function wbSpurt(lx, y, n, power) { for (let i = 0; i < n; i++) WBK.drops.push({ x: lx, y, vx: (wbRnd() - 0.5) * 160 * power, vy: -60 - 200 * wbRnd() * power, life: 1.1, gy: y + 4 + 10 * wbRnd() }) }
function wbSlashers(ctx, { W, dockTop, padL, padR, S, t, dt, rate }) {
  const sh = shift(0.9, W), base = dockTop - 6 * S + 3, sc = 1.12, pan = lx => ((lx + sh) - (padL + padR) / 2) / ((padR - padL) / 2) * 0.8
  // spawn: a new hunt every few seconds, at most four at once
  if (t > WBK.next && WBK.list.length < 4) { WBK.next = t + (2.2 + 2.5 * wbRnd()) / rate
    const type = ["ghost", "chucky", "jason"][Math.floor(wbRnd() * 3)], dir = wbRnd() < 0.5 ? 1 : -1, lx = (padL - sh) + (0.12 + 0.76 * wbRnd()) * (padR - padL)
    wbScream(pan(lx), 0.42); if (type === "jason") wbWhisper(pan(lx), 0.5)
    WBK.list.push({ type, dir, vx: lx, kx: lx - dir * (type === "jason" ? 95 : 165), t: 0, look: (++WBK.id) % WB_LOOKS.length, scream: WB_SCREAMS[WBK.id % WB_SCREAMS.length], ph: 0, hurt: false, body: false }) }
  // bodies + blood already on the street
  for (const b of WBK.bodies) { const x = b.x + sh, g = Math.min(1, (t - b.t0) / 2.5)
    ctx.fillStyle = "rgba(95,0,0,0.9)"; ctx.beginPath(); ctx.ellipse(x + b.dir * 6, base + 1, 18 + 22 * g, 3 + 4 * g, 0, 0, 7); ctx.fill()
    wbVictim(ctx, { look: b.look, dir: b.dir }, x, base, sc, t, "dead", 0, 0) }
  for (const e of WBK.list) { e.t += dt; const T = e.t, d = e.dir
    let vPose = "run", vFall = 0, kRun = true, kStab = null, jMode = "walk", jSwing = 0, kx, vx, ky = 0, kDir = d
    if (e.type === "ghost") {
      if (T < 2.2) { e.vx += d * 75 * dt; e.kx += d * (75 + 165 / 2.2) * dt; e.ph += dt * 14 }
      else if (T < 3.4) { vPose = "stagger"; kRun = false; kStab = ((T - 2.2) * 2.5) % 1; e.kx = e.vx - d * 20; if (!e.hurt) { e.hurt = true } if (Math.floor((T - 2.2) * 2.5) !== Math.floor((T - dt - 2.2) * 2.5)) { wbSpurt(e.vx, base - 46 * sc, 10, 1); wbStab(pan(e.vx)); if (T < 2.6) wbScream(pan(e.vx), 0.5) } }
      else if (T < 3.8) { vPose = "stagger"; vFall = (T - 3.4) / 0.4; kRun = false; kStab = null }
      else { if (!e.body) { e.body = true; WBK.bodies.push({ x: e.vx, dir: -d, look: e.look, t0: t }); WBK.kills++ } kRun = T > 4.8; if (kRun) e.kx += d * 60 * dt }
    } else if (e.type === "chucky") {
      if (T < 1.8) { e.vx += d * 80 * dt; e.kx += d * (80 + 165 / 1.8) * dt; e.ph += dt * 15 }
      else if (T < 2.15) { const u = (T - 1.8) / 0.35; e.vx += d * 40 * dt; e.kx = e.kx + (e.vx - d * 4 - e.kx) * Math.min(1, u * 1.4); ky = -Math.sin(u * Math.PI) * 30 - u * 34; e.ph += dt * 10 }
      else if (T < 3.4) { vPose = "stagger"; e.vx += d * 18 * dt; e.kx = e.vx - d * 4; ky = -34; kRun = false; kStab = ((T - 2.15) * 3.2) % 1; e.hurt = true
        if (Math.floor((T - 2.15) * 3.2) !== Math.floor((T - dt - 2.15) * 3.2)) { wbSpurt(e.vx, base - 50 * sc, 8, 0.9); wbStab(pan(e.vx), 0.35) } if (!e.laughed) { e.laughed = true; e.say = "HA HA HA HA!"; e.sayT = 1.6; wbScream(pan(e.vx), 0.5); wbLaugh(pan(e.kx), 0.5) } }
      else if (T < 3.8) { vPose = "stagger"; vFall = (T - 3.4) / 0.4; ky = -34 * (1 - vFall); kRun = false }
      else { if (!e.body) { e.body = true; WBK.bodies.push({ x: e.vx, dir: d, look: e.look, t0: t }); WBK.kills++; e.say = "WANNA PLAY?"; e.sayT = 1.6; wbLaugh(pan(e.kx), 0.4) } e.kx += d * 150 * dt; kDir = d }
    } else {
      if (T < 2.6) { vPose = "back"; e.vx += d * 22 * dt; e.kx += d * (22 + 95 / 2.6 - 4) * dt; e.ph += dt * 6; jMode = "walk" }
      else if (T < 2.95) { vPose = "back"; jMode = "swing"; jSwing = (T - 2.6) / 0.35; if (!e.hurt && jSwing > 0.6) { e.hurt = true; wbSpurt(e.vx, base - 50 * sc, 16, 1.3); wbStab(pan(e.vx), 0.6); wbScream(pan(e.vx), 0.55) } }
      else if (T < 3.3) { vPose = "stagger"; vFall = (T - 2.95) / 0.35; jMode = "stand" }
      else if (T < 6.6) { if (!e.body) { e.body = true; WBK.bodies.push({ x: e.vx, dir: -d, look: e.look, t0: t }); WBK.kills++ } jMode = "feed"; e.kx = e.vx - d * 24; if (Math.floor(T * 2.2) !== Math.floor((T - dt) * 2.2)) wbSpurt(e.vx - d * 4, base - 6, 5, 0.6) }
      else { jMode = "walk"; e.kx += d * 45 * dt }
      kRun = false }
    kx = e.kx + sh; vx = e.vx + sh
    if (!e.body) wbVictim(ctx, e, vx, base, sc, t, vPose, vFall, e.ph)
    if (e.type === "ghost") wbGhostKiller(ctx, kx, base, sc, kDir, t, kRun, kStab)
    else if (e.type === "chucky") wbChucky(ctx, kx, base + ky, sc, kDir, t, kRun, kStab)
    else wbJason(ctx, kx, base, sc, kDir, t, jMode, jSwing)
    ctx.save(); ctx.font = "900 16px Arial"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#fff"
    if (!e.body && vFall < 0.5 && Math.sin(t * 9 + e.look) > -0.4) { ctx.strokeText(e.scream, vx, base - 90 * sc); ctx.fillStyle = "#b80000"; ctx.fillText(e.scream, vx, base - 90 * sc) }
    if (e.sayT > 0) { e.sayT -= dt; ctx.strokeText(e.say, kx, base - 70 * sc); ctx.fillStyle = "#d8461a"; ctx.fillText(e.say, kx, base - 70 * sc) }
    ctx.restore() }
  WBK.list = WBK.list.filter(e => e.t < (e.type === "jason" ? 11 : 8))
  if (WBK.bodies.length > 18) WBK.bodies.splice(0, WBK.bodies.length - 18)
  for (const p of WBK.drops) { p.life -= dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > p.gy) { p.y = p.gy; p.vx = 0; p.vy = 0 }
    ctx.fillStyle = `rgba(150,0,0,${Math.min(1, p.life * 2)})`; ctx.fillRect(p.x + sh - 1.5, p.y - 1.5, 3, 3) }
  WBK.drops = WBK.drops.filter(p => p.life > 0).slice(-400)
}
function wbFire(ctx, x, base, w, t, k) {   // a house on fire: flames out of the windows and roof, glow, smoke
  const g = ctx.createRadialGradient(x + w / 2, base - 100, 10, x + w / 2, base - 100, 220); g.addColorStop(0, "rgba(255,120,30,0.35)"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.fillRect(x - 120, base - 330, w + 240, 330)
  for (let s = 0; s < 7; s++) { const u = (t * 0.18 + s / 7) % 1; ctx.fillStyle = `rgba(30,24,26,${0.6 * (1 - u)})`; ctx.beginPath(); ctx.arc(x + w * 0.5 + Math.sin(u * 6 + s) * 30, base - 210 - u * 220, 26 + 50 * u, 0, 7); ctx.fill() }
  const flame = (fx, fy, fw, fh, ph) => { for (let f = 0; f < 3; f++) { const hh = fh * (0.7 + 0.3 * Math.sin(t * 11 + ph + f * 2)); ctx.fillStyle = f === 1 ? "rgba(255,230,120,0.95)" : "rgba(255,110,30,0.9)"; ctx.beginPath(); ctx.moveTo(fx + f * fw / 3, fy); ctx.quadraticCurveTo(fx + f * fw / 3 - 4, fy - hh * 0.6, fx + f * fw / 3 + fw / 6, fy - hh); ctx.quadraticCurveTo(fx + f * fw / 3 + fw / 3 + 4, fy - hh * 0.5, fx + (f + 1) * fw / 3, fy); ctx.fill() } }
  for (const [fx, fy] of [[0.12, -94], [0.62, -94], [0.12, -24], [0.62, -24]]) { ctx.fillStyle = "#ff8a2a"; ctx.fillRect(x + w * fx, base + fy - 34, w * 0.24, 34); flame(x + w * fx, base + fy - 30, w * 0.24, 40, fx * 10 + fy) }
  flame(x + 10, base - 150, w * 0.4, 60, k); flame(x + w * 0.5, base - 175, w * 0.4, 80, k + 3)
}
