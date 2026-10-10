// kits.js
// ─────────────────────────────────────────────────────────────────
// MOVE LIST / KIT PROFILES — human-readable per-character data shown on the
// in-game MOVE LIST screen (reached from the main menu after pressing PLAY).
//
// This is PRESENTATION data only — it never touches combat. Every character
// follows the same template so each one is "equally fleshed out":
//   type, energy, difficulty, summary, passive,
//   basics[]   (no-cost melee: Light / Heavy / Up-Attack launcher / Air / Down-Air / Grab)
//   specials[] (energy-cost; input scheme below)
//   mobility   (a movement special)
//   ultimate   (JJK characters = a Domain Expansion)
//   combos[]
//
// INPUT SCHEME (matches abilities.js):
//   Special          → special #1
//   Down + Special   → special #2
//   Forward + Special→ special #3 / mobility
//   Ultimate         → ultimate (needs a full meter)
// The advanced characters (goku/naruto/gojo/sukuna/omololu) ALSO
// accept fighting-game motions (QCF, DP, etc.) shown in their move inputs.
//
// COMBO-STRING GRAMMAR (combo-string standardization Stage F): the Move List teaches each
// character's ACTUAL combo grammar, sourced from comboStandard.js `classify()`:
//   • rekka (Fwd+Heavy)       → "Forward + Heavy" opener, re-tap Heavy to chain into a launcher
//   • standard-string (L,L,H) → "Light, Light, Heavy" dial-a-combo (the Heavy folds into the launcher)
//   • zoner                   → single-poke; pressure comes from specials, not an auto-combo
// The fallback kit (getKit) synthesizes the right one automatically so every kit-less char is accurate.
// ─────────────────────────────────────────────────────────────────
import { classify } from "./comboStandard.js"

// Global control reference (shown on the Move List "Controls" panel).
export const CONTROL_REFERENCE = {
  // ── Corrected 2026-10-06 to match the REAL bindings (game.js P1_CONTROLS/P2_CONTROLS; the in-battle
  // strip ui.js:4192). The old table had drifted (Special/Ultimate swapped, phantom Shift/G, wrong Grab/
  // Charge). P1 = left-hand cluster, P2 = right-hand cluster — no shared keys (single-keyboard 2P safe). ──
  keyboardP1: [
    ["Move",            "A / D"],
    ["Jump / Up",       "W"],
    ["Crouch",          "S"],
    ["Block",           ";"],
    ["Light / Heavy",   "J / K"],
    ["Special",         "L"],
    ["Ultimate",        "U"],
    ["Grab / Charge",   "O / P"],
    ["Dash",            "double-tap A/D"],
    ["Clone Summon",    "↓↓↑ + Special"]
  ],
  keyboardP2: [
    ["Move",            "← / →"],
    ["Jump / Up",       "↑"],
    ["Crouch",          "↓"],
    ["Block",           "/"],
    ["Light / Heavy",   "1 / 2"],
    ["Special",         "4"],
    ["Ultimate",        "5"],
    ["Grab / Charge",   "6 / 7"],
    ["Dash",            "double-tap ← →"],
    ["Clone Summon",    "↓↓↑ + Special"]
  ],
  controller: [
    ["Move / Jump",     "L-Stick / D-Pad"],
    ["Light",           "✕ (Cross)"],
    ["Heavy",           "□ (Square)"],
    ["Special",         "△ (Triangle)"],
    ["Dash",            "○ (Circle)"],
    ["Ultimate",        "L2 / R2"],
    ["Grab",            "L1"],
    ["Charge / Omnitrix","R1"]
  ],
  howToSpecials: [
    "Special button = the character's 1st special.",
    "Hold ↓ + Special = 2nd special.",
    "Hold → (toward foe) + Special = 3rd special / mobility move.",
    "Ultimate button (full meter) = ultimate / domain expansion.",
    "Up-Attack (↑ + Light/Heavy) launches BOTH fighters up for air combos.",
    "CLONES — ↓↓↑ + Special stages a clone formation; then hold a direction + Special to pick:",
    "   Neutral = Pure Attack · ↓ = Deception · ↑ = Defensive · Back = Ranged · Fwd = Grab · Ultimate = Swarm.",
    "Persistent clones (P1 / clone chars): , create · . disperse · / swap. For 2P on one keyboard, use a gamepad for P2."
  ]
}

export const KITS = {
  // ── DRAGON BALL ──────────────────────────────────────────────
  goku: {
    type: "Balanced Saiyan / Transformations", energy: "Ki", difficulty: "Medium",
    summary: "An all-rounder who chains Super Saiyan transformations to snowball from clean fundamentals into overwhelming late-fight power.",
    passive: { name: "Saiyan Resolve", effect: "Regenerates Ki slightly faster than most fighters, and the more damage taken, the quicker Ki builds." },
    basics: [
      { name: "Jab Combo",    input: "Light",                    desc: "fast poke, low knockback" },
      { name: "Power Strike", input: "Heavy",                    desc: "slow heavy hit with knockback" },
      { name: "Rising Kick",  input: "Up-Attack",                desc: "launcher — starts air combos (also lifts you)" },
      { name: "Air Strike",   input: "Air (jump + Light)",       desc: "quick aerial attack" },
      { name: "Meteor Stomp", input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",         input: "Grab",                     desc: "grab and throw" }
    ],
    specials: [
      { name: "Dragon Fist", input: "Special",        cost: 40, desc: "lunging dragon-aura rush for big damage up close" },
      { name: "Kamehameha",  input: "Down + Special", cost: 30, desc: "horizontal Ki beam — zone and punish from range" }
    ],
    mobility: { name: "Instant Transmission", input: "Forward + Special", cost: 15, desc: "blink-dash that closes distance or escapes pressure" },
    ultimate: { name: "Super Saiyan Blue", input: "Ultimate (full meter)", cost: 100, desc: "advances the Saiyan transformation chain (SSJ1 → Blue → Ultra Instinct), boosting damage, speed, and defense" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string into Dragon Fist" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",     desc: "launch into aerial pressure" },
      { name: "Beam Punish",    sequence: "Heavy, Down + Special",         desc: "stagger into Kamehameha for chip and spacing" }
    ]
  },
  // ── NARUTO ───────────────────────────────────────────────────
  jiraiya: {
    type: "Toad Sage / Summon Zoner", energy: "Chakra", difficulty: "Medium",
    summary: "A Legendary Sannin who controls space with fire, hair, and toad ninjutsu — then flips into Sage Mode for a buffed second kit and a giant-toad summon.",
    passive: { name: "Sage of Mount Myoboku", effect: "Two full movesets: a grounded ninjutsu-zoning base form and a time-limited Hermit (Sage) Mode with modest damage/speed/defense buffs and its own specials." },
    basics: [
      { name: "Palm Combo",   input: "Light",                   desc: "sage-style striking string" },
      { name: "Heavy Strike", input: "Heavy",                   desc: "slow heavy hit with knockback" },
      { name: "Rising Hair",  input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Strike",   input: "Air (jump + Light)",      desc: "quick aerial attack" },
      { name: "Toad Drop",    input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",         input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Rasengan",                 input: "Special",           cost: 30, desc: "spiraling chakra sphere burst up close [CANON]" },
      { name: "Katon: Gamayu Endan",      input: "Forward + Special", cost: 28, desc: "toad-oil flame-bullet projectile [CANON]" },
      { name: "Protective Barrier",       input: "Back + Special",    cost: 34, desc: "timed blue defensive bubble (i-frames) [CANON-ADJACENT]" },
      { name: "Ranjishigami no Jutsu",    input: "Up + Special",      cost: 30, desc: "needle-hair spikes erupt — anti-air AOE [CANON]" },
      { name: "Gamayu Endan (Big Flame)", input: "Down + Special",    cost: 40, desc: "larger ground flame wall [CANON]" },
      { name: "Shadow Clone Pincer",      input: "↓↓↑ + Special",      cost: 25, desc: "summon a shadow clone; you + clone strike from two sides. Base = 1 clone, Sage Mode = 2 (sublinear damage) [CANON]" },
      { name: "Shadow Clone Feint",       input: "↓↓↑ + Down + Special", cost: 25, desc: "leave a clone in a puff of smoke, body-flicker behind the target and counter [CANON-ADJACENT]" }
    ],
    mobility: { name: "Body Flicker", input: "Dodge / dash", cost: 0, desc: "quick repositioning teleport (dodge-teleport)" },
    ultimate: { name: "Sage Mode / Gamabunta", input: "Ultimate (full meter) — Neutral / Down", cost: 100, desc: "Neutral: enter Hermit (Sage) Mode (~20s buffs + new specials; neutral Ultimate in Sage Mode becomes Chou Odama Rasengan). Down: Summoning Jutsu — Gamabunta crashes down with a blade strike [CANON]" },
    // SAGE MODE specials (while transformed): Neutral = Senpo: Goemon (oil-fire stream) · Forward = toad-tongue lash ·
    // Back = Hari Jizo (needle guard) · Up = Frog Song (sound-genjutsu stun) · Down = giant-scroll smash.
    combos: [
      { name: "Air Juggle",    sequence: "Up-Attack, Jump, Air, Down-Air", desc: "launch into aerial pressure" },
      { name: "Zone & Punish", sequence: "Forward + Special, then Rasengan on approach", desc: "space with fire, punish the dash-in" },
      { name: "Sage Burst",    sequence: "Ultimate (Sage Mode), then Chou Odama Rasengan", desc: "transform, then unload the giant sphere" }
    ]
  },
  vegeta: {
    type: "Aggressive Saiyan / Ki Burst", energy: "Ki", difficulty: "Medium",
    summary: "A prideful pressure machine with three explosive Ki blasts who scales hard through his own elite transformation line.",
    passive: { name: "Saiyan Pride", effect: "Lands and aerial recoveries are faster, and his Ki specials deal extra damage while his health is below half." },
    basics: [
      { name: "Jab Combo",     input: "Light",                   desc: "fast poke, low knockback" },
      { name: "Power Strike",  input: "Heavy",                   desc: "slow heavy hit with knockback" },
      { name: "Rising Knee",   input: "Up-Attack",               desc: "launcher — starts air combos (also lifts you)" },
      { name: "Air Strike",    input: "Air (jump + Light)",      desc: "quick aerial attack" },
      { name: "Crash Heel",    input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",          input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Galick Gun",      input: "Special",           cost: 30, desc: "powerful purple Ki beam for ranged pressure" },
      { name: "Big Bang Attack", input: "Down + Special",    cost: 25, desc: "explosive Ki ball — cheap, fast burst damage" },
      { name: "Final Flash",     input: "Forward + Special", cost: 40, desc: "concentrated full-screen energy blast; slow startup, huge payoff" }
    ],
    mobility: { name: "Burst Charge", input: "Forward + Special", cost: 15, desc: "aura-fueled forward blitz that closes gaps for offense" },
    ultimate: { name: "Super Saiyan Blue Evolution", input: "Ultimate (full meter)", cost: 100, desc: "advances his elite transformation chain (SSJ → Blue → Blue Evolution → Ultra Ego), spiking damage and speed" },
    combos: [
      { name: "Bread & Butter", sequence: "Forward + Heavy, Heavy, Heavy", desc: "kick command-chain into the launcher (re-tap Heavy on hit), then Galick Gun" },
      { name: "Burst Punish",   sequence: "Heavy, Down + Special",        desc: "knockback into Big Bang Attack" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",    desc: "launch into aerial pressure" }
    ]
  },
  piccolo: {
    type: "Namekian Zoner / Control", energy: "Ki", difficulty: "Medium",
    summary: "A patient tactician who walls opponents out with piercing beams and multi-angle Ki balls, then fuses for a stat surge.",
    passive: { name: "Namekian Regeneration", effect: "Slowly regenerates a small amount of health while not attacking or taking damage." },
    basics: [
      { name: "Arm Jab",      input: "Light",                   desc: "extended-reach poke" },
      { name: "Power Strike", input: "Heavy",                   desc: "slow heavy hit with knockback" },
      { name: "Rising Palm",  input: "Up-Attack",               desc: "launcher — starts air combos (also lifts you)" },
      { name: "Air Strike",   input: "Air (jump + Light)",      desc: "quick aerial attack" },
      { name: "Dive Chop",    input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",         input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Special Beam Cannon", input: "Special",        cost: 35, desc: "long-charge piercing beam — punish whiffs from far away" },
      { name: "Hellzone Grenade",    input: "Down + Special", cost: 30, desc: "scatter of homing Ki balls that converge for area control" }
    ],
    mobility: { name: "After-Image Step", input: "Forward + Special", cost: 15, desc: "quick reposition dash to maintain zoning spacing" },
    ultimate: { name: "Fused with Kami", input: "Ultimate (full meter)", cost: 100, desc: "transforms into his fused form, boosting attack, speed, defense, and Ki output" },
    combos: [
      { name: "Zoning Pressure", sequence: "Special (Beam Cannon), poke, Heavy", desc: "single-poke zoner — wall out with beams, convert on the approach (no chained string)" },
      { name: "Zone Trap",      sequence: "Down + Special, Heavy",        desc: "scatter grenades then convert on the trapped foe" }
    ]
  },
  frieza: {
    type: "Ranged Tyrant / Burst", energy: "Ki", difficulty: "Hard",
    summary: "A cruel projectile specialist with three escalating Ki attacks who punishes mistakes brutally and turns Golden to overwhelm.",
    passive: { name: "Emperor's Spite", effect: "Death Beam and ranged specials cost slightly less Ki, rewarding relentless chip pressure from afar." },
    basics: [
      { name: "Tail Jab",     input: "Light",                   desc: "fast whip-tail poke" },
      { name: "Power Strike", input: "Heavy",                   desc: "slow heavy hit with knockback" },
      { name: "Rising Tail",  input: "Up-Attack",               desc: "launcher — starts air combos (also lifts you)" },
      { name: "Air Strike",   input: "Air (jump + Light)",      desc: "quick aerial attack" },
      { name: "Dive Slam",    input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",         input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Death Beam",          input: "Special",           cost: 20, desc: "fast precise finger beam — cheap poke and combo ender" },
      { name: "Nova Strike",         input: "Down + Special",    cost: 30, desc: "diving Ki explosion that closes distance with impact" },
      { name: "Ultimate Death Ball", input: "Forward + Special", cost: 50, desc: "huge slow energy sphere; massive damage on a hard read" }
    ],
    mobility: { name: "Float Dash", input: "Forward + Special", cost: 15, desc: "swift hovering reposition to keep optimal beam range" },
    ultimate: { name: "Golden Frieza", input: "Ultimate (full meter)", cost: 100, desc: "transforms into Golden form for a massive speed and attack boost" },
    combos: [
      { name: "Zoning Pressure", sequence: "Death Beam, poke, Nova Strike", desc: "single-poke ranged tyrant — chip from afar, punish the approach (no chained string)" },
      { name: "Dive Pressure",  sequence: "Down + Special, Light, Light", desc: "Nova Strike approach into close poke string" }
    ]
  },
  cell: {
    type: "Bio-Android Bruiser / Constant Pressure", energy: "Ki", difficulty: "Medium",
    summary: "A durable, high-attack juggernaut who mixes copied Ki blasts with relentless melee and perfects himself for a final-form spike.",
    passive: { name: "Cellular Absorption", effect: "Recovers a small amount of Ki whenever he lands a melee hit, fueling near-constant special pressure." },
    basics: [
      { name: "Jab Combo",    input: "Light",                   desc: "fast poke, slightly heavier than most" },
      { name: "Power Strike", input: "Heavy",                   desc: "slow heavy hit with strong knockback" },
      { name: "Rising Kick",  input: "Up-Attack",               desc: "launcher — starts air combos (also lifts you)" },
      { name: "Air Strike",   input: "Air (jump + Light)",      desc: "quick aerial attack" },
      { name: "Dive Kick",    input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",         input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Kamehameha",       input: "Special",        cost: 30, desc: "copied Ki beam for ranged control" },
      { name: "Solar Kamehameha", input: "Down + Special", cost: 40, desc: "stronger charged beam; slow but devastating" }
    ],
    mobility: { name: "Zanzoken Dash", input: "Forward + Special", cost: 15, desc: "afterimage rush that closes in for melee pressure" },
    ultimate: { name: "Perfect Cell", input: "Ultimate (full meter)", cost: 100, desc: "transforms into Perfect form for max attack, speed, and Ki regeneration" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string into Kamehameha" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",    desc: "launch into aerial pressure" },
      { name: "Charge Punish",  sequence: "Heavy, Down + Special",        desc: "knockback into Solar Kamehameha" }
    ]
  },

  // ── NARUTO ───────────────────────────────────────────────────
  naruto: {
    type: "Versatile Ninja / Transformations", energy: "Chakra", difficulty: "Medium",
    summary: "A flexible fighter who blends a close-range Rasengan, swarming shadow clones, and a Sage-to-Baryon transformation chain.",
    passive: { name: "Nine-Tails Stamina", effect: "Regenerates Chakra slightly faster than most fighters, supporting frequent special use." },
    basics: [
      { name: "Jab Combo",     input: "Light",                   desc: "fast poke, low knockback" },
      { name: "Power Strike",  input: "Heavy",                   desc: "slow heavy hit with knockback" },
      { name: "Rising Kick",   input: "Up-Attack",               desc: "launcher — starts air combos (also lifts you)" },
      { name: "Air Strike",    input: "Air (jump + Light)",      desc: "quick aerial attack" },
      { name: "Dive Heel",     input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",          input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Rasengan",           input: "Special",        cost: 35, desc: "close-range spiraling chakra sphere for big damage" },
      { name: "Shadow Clone Blast", input: "Down + Special", cost: 25, desc: "sends chasing clones — pressure and cover for approach" }
    ],
    mobility: { name: "Body Flicker", input: "Forward + Special", cost: 15, desc: "ninja dash that rushes in to set up Rasengan" },
    ultimate: { name: "Sage Mode", input: "Ultimate (full meter)", cost: 100, desc: "advances his transformation chain (Sage → KCM → Baryon), boosting damage and speed" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string into Rasengan" },
      { name: "Clone Cover",    sequence: "Down + Special, Forward + Special, Special", desc: "clones into Body Flicker into Rasengan" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",    desc: "launch into aerial pressure" }
    ]
  },

  sakura: {
    type: "Medic Rushdown / Support", energy: "Chakra", difficulty: "Medium",
    summary: "Tsunade's apprentice — chakra-enhanced strikes, a thrown kunai, a summoned Katsuyu wall, and the Byakugou Seal for self-sustain, below the Naruto-universe power ceiling.",
    passive: { name: "Strength of a Hundred", effect: "Monstrous chakra control — durable medic with enhanced-strength normals and the Byakugou reserve." },
    basics: [
      { name: "Jab Combo",    input: "Light",                   desc: "fast enhanced-strength punch string" },
      { name: "Power Strike", input: "Heavy",                   desc: "committed chakra-smash with knockback" },
      { name: "Rising Kick",  input: "Up-Attack",               desc: "launcher — starts air combos (high kick)" },
      { name: "Air Strike",   input: "Air (jump + Light)",      desc: "quick aerial attack" },
      { name: "Dive Spike",   input: "Down-Air (jump + Heavy)", desc: "downward aerial spike" },
      { name: "Grab",         input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Shannaro Rush",         input: "Special",            cost: 22, desc: "chakra-enhanced close-range punch string" },
      { name: "Heaven-Spin Kick",      input: "Forward + Special",  cost: 24, desc: "advancing rising crescent kick (launcher)" },
      { name: "Cherry-Blossom Impact", input: "Up + Special",       cost: 26, desc: "committed overhead chakra strike" },
      { name: "Byakugou Seal",         input: "Back + Special",     cost: 45, desc: "self-heal — can't start at full HP, interrupted by any hit, 3 uses/round" },
      { name: "Summoning: Katsuyu",    input: "Down + Special",     cost: 34, desc: "summon a slug wall that shoves + absorbs a blow (brief i-frames)" },
      { name: "Kunai Throw",           input: "Air + Special",      cost: 18, desc: "thrown kunai projectile" }
    ],
    ultimate: { name: "Daichi no Sakebi", input: "Ultimate (full meter)", cost: 100, desc: "gather full chakra → a screen-wide cherry-petal storm in 3 escalating pulses" },
    combos: [
      { name: "Poke into Rush", sequence: "Light, Special",            desc: "jab into Shannaro Rush" },
      { name: "Launch Juggle",  sequence: "Up-Attack, Jump, Air, Air", desc: "high-kick launcher into aerial pressure" }
    ]
  },

  hinata: {
    type: "Gentle-Fist Technician", energy: "Chakra", difficulty: "Medium",
    summary: "The Byakugan princess of the Hyūga — a precise, agile Gentle-Fist (Jūken) fighter who seals chakra points with pinpoint palm strikes. Her directional specials are the Eight Trigrams techniques (Sixty-Four Palms rush, Mountain Crusher, Protective guard, Rotation sphere) plus a Byakugan buff. The Twin Lion Fists ultimate lands in Phase 3.",
    passive: { name: "Byakugan + Gentle Fist", effect: "The Hyūga dōjutsu lets Hinata seal tenketsu — her Sixty-Four Palms / Mountain Crusher palm hits DRAIN the foe's chakra. Down+Special activates the Byakugan buff (+special damage + chakra regen)." },
    basics: [
      { name: "Palm Jab String", input: "Light",                   desc: "fast close-range Gentle-Fist palm combo" },
      { name: "Chakra Palm",     input: "Heavy",                   desc: "committed chakra palm strike with knockback" },
      { name: "Rising Palm",     input: "Up-Attack",               desc: "launcher — rising chakra-arc strike, starts air combos" },
      { name: "Air Palm",        input: "Air (jump + Light)",      desc: "aerial Gentle-Fist palm" },
      { name: "Slam Spike",      input: "Down-Air (jump + Heavy)", desc: "downward aerial slam" }
    ],
    specials: [
      { name: "Sixty-Four Palms",      input: "Special",          cost: 30, desc: "Juukenhou Hakke Rokujuuyon Shou — advancing 8-hit palm rush that SEALS chakra (drains foe's meter); trigram-field FX [CANON]" },
      { name: "Mountain Crusher",      input: "Forward + Special", cost: 28, desc: "Hakke Hasangeki — advancing double-palm thrust, big knockback + chakra seal [CANON]" },
      { name: "Protective 64 Palms",   input: "Back + Special",    cost: 26, desc: "Shugo Hakke Rokujuuyonshou — spinning i-frame guard that unleashes a RAPID 12-hit palm barrage + chakra seal, ending with a knockback palm [CANON]" },
      { name: "Rotation Sphere",       input: "Up + Special",      cost: 24, desc: "Hakkesho Guuten — rotating chakra sphere, deflects projectiles + radial push [CANON-ADJACENT]" },
      { name: "Byakugan",              input: "Down + Special",    cost: 18, desc: "~5s buff: +18% special damage + chakra regen; pulse-ring FX [CANON-ADJACENT]" }
    ],
    passiveNote: "Gentle Fist drain: her Sixty-Four Palms / Mountain Crusher palm hits also seal the foe's chakra (drain their meter).",
    ultimate: { name: "Juuhou Soshiken", input: "Ultimate (full meter)", cost: 100, desc: "Gentle Step Twin Lion Fists — twin lion-head chakra fists deliver a guaranteed Gentle-Fist barrage (~198 dmg + chakra seal); i-frames during the cast, 25% on block [CANON]" },
    combos: [
      { name: "Launch Juggle", sequence: "Up-Attack, Jump, Air, Air", desc: "rising-palm launcher into aerial pressure" }
    ]
  },

  gaara: {
    type: "Sand Zoner / Defensive Tank", energy: "Sand", difficulty: "Medium",
    summary: "Gaara of the Desert — the Fifth Kazekage. A durable, slow SAND zoner who fights at range and turtles behind his gourd sand. His ground sand wave, rising sand spikes and sand-bullet throw control space; his specials bind (Sand Coffin → Burial), zone (Sand Tsunami), guard (Sand Dome) and dodge (Sand Shunshin), backed by the passive Ultimate Defense + Sand Armor. The Sabaku Taisou burial ultimate lands in Phase 3 and the One-Tail Shukaku summon in Phase 4.",
    passive: { name: "Shield of Sand", effect: "Automatic sand defence rises from the gourd with no hand sign. Holding Block raises the Sand Shield wall. ULTIMATE DEFENSE: while standing still with high Sand, the first incoming projectile is auto-stopped by a sand burst (costs Sand). SAND ARMOR: while Sand is high, incoming damage is reduced — each hit spends Sand to absorb it." },
    basics: [
      { name: "Sand Fist",      input: "Light",                   desc: "close sand-fist jab string" },
      { name: "Sand Wave",      input: "Heavy",                   desc: "advancing ground sand wave — long reach, big knockback" },
      { name: "Sand Spikes",    input: "Up-Attack",               desc: "launcher — rising sand spikes, starts air combos" },
      { name: "Sand Whip",      input: "Air (jump + Light)",      desc: "aerial sand-whip arc" },
      { name: "Sand Slam",      input: "Down-Air (jump + Heavy)", desc: "downward aerial sand slam" },
      { name: "Low Sand Sweep", input: "Crouch + Light",          desc: "low sweeping sand poke" }
    ],
    specials: [
      { name: "Sand Coffin",   input: "Special",           cost: 30, desc: "Sabaku Kyuu — sand hands rise under the foe and BIND; press Special again in the window for Sabaku Sousou (Sand Burial) damage [CANON]" },
      { name: "Sand Tsunami",  input: "Forward + Special", cost: 28, desc: "a travelling wave of sand surges forward (his sand wave, scaled up) [CANON]" },
      { name: "Sand Dome",     input: "Back + Special",    cost: 24, desc: "sand closes into a brief all-direction guard — i-frames + radial shove (cooldown) [CANON-ADJACENT]" },
      { name: "Sand Shunshin", input: "Up + Special",      cost: 18, desc: "short sand-flicker dodge-teleport (retreat) with i-frames [CANON-ADJACENT]" },
      { name: "Sand Bullet",   input: "Down + Special",    cost: 14, desc: "flings a compressed sand ball — a basic zoning projectile; ground / air / crouch pose [CANON-ADJACENT]" }
    ],
    passiveNote: "SHUKAKU — DOWN + ULTIMATE (full meter) summons the giant One-Tail ally: it rises behind Gaara while he CHANNELS (locked in place, still hittable). While Shukaku is out, Gaara's specials RE-ROUTE: Special = Sand Volley (6 sand balls) · Fwd+Special = Shukaku Swipe (giant arm, launches) · Back+Special = Sand Shuriken (4 shuriken) · Down+Special = Pyramid Seal (bind → damage); and ULTIMATE = Tailed Beast Ball (huge, ENDS the summon). Shukaku ends on 3 clean hits on Gaara, the ~12s timer, or pressing Block — always playing its LOSE collapse. (A One-Tail gauge above Gaara still builds as flavor.)",
    ultimate: { name: "Sabaku Taisou", input: "Ultimate (full meter)", cost: 100, desc: "Giant Sand Burial — a 砂瀑大葬 kanji cut-in, then sand ripples → giant hands → engulfing dome collapses on the foe, then a kneeling ground burst. Guaranteed ~197 dmg, 25% on block [CANON]" },
    combos: [
      { name: "Launch Juggle", sequence: "Up-Attack, Jump, Air, Air", desc: "sand-spike launcher into aerial pressure" }
    ]
  },

  // Kakashi (ANBU) — NEW additive fighter. Move list GROWS per phase; Phase 1 = normals + Body Flicker.
  // Sharingan toggle + Raikiri (P2), Ninken/Read/Genjutsu (P3), Copy-Ninja/Mangekyou/Kamui (P4) add rows later.
  kakashi_anbu: {
    type: "Technical Shinobi / Rushdown", energy: "Chakra", difficulty: "Hard",
    summary: "Teen-era ANBU Hatake Kakashi — a fast, technical, lower-HP shinobi who fights with the tanto and Sharingan trickery. His Y-combo tanto string, rising kick launcher and diving aerials pressure up close; the Body Flicker (shunshin) teleport-dodge repositions with i-frames. The Sharingan toggle, Raikiri, Ninken summon, Sharingan Read counter, Genjutsu stun, Copy Ninja, and the Mangekyō→Kamui awakening arrive across later phases.",
    passive: { name: "Sharingan (ANBU)", effect: "Charge-TAP toggles the Sharingan (code-drawn red eye + afterimage aura). It drains Chakra while active and makes Raikiri TRACK the foe; at 0 Chakra it shuts off and Kakashi is briefly FATIGUED (slower). (Sharingan also gates Read + Genjutsu in Phase 3.)" },
    basics: [
      { name: "Tanto Slash",    input: "Light",                   desc: "Y-combo opener — quick tanto slash string" },
      { name: "Tanto Finisher", input: "Heavy",                   desc: "committed Y-combo finisher with an orange blade arc" },
      { name: "Rising Kick",    input: "Up-Attack",               desc: "launcher — rising overhead kick, starts air combos" },
      { name: "Diving Strike",  input: "Air (jump + Light)",      desc: "aerial diving tanto strike" },
      { name: "Air Slam",       input: "Down-Air (jump + Heavy)", desc: "downward aerial strike (reuses the diving art)" },
      { name: "Low Slash",      input: "Crouch + Light",          desc: "low sliding tanto poke" }
    ],
    specials: [
      { name: "Sharingan",      input: "Charge (tap)",            cost: 0,  desc: "toggle the Sharingan — drains Chakra while active, makes Raikiri TRACK; at 0 Chakra it shuts off + brief fatigue [CANON]" },
      { name: "Body Flicker",   input: "Forward + Special",       cost: 12, desc: "Shunshin no Jutsu — a short forward teleport-dodge with brief i-frames (teleport art) [CANON]" },
      { name: "Raikiri",        input: "Neutral + Special (charge-hold)", cost: 30, desc: "Lightning Blade — teleport-in → HOLD Special to charge in the loop (more damage, capped) → release to DASH + thrust. Sharingan ON tracks the foe; OFF goes straight and can whiff [CANON]" },
      { name: "Kuchiyose: Ninken (Tsuiga)", input: "Down + Special", cost: 40, desc: "hand seals → the dog-pack bursts under the foe and PINS them (rooted + damage ticks) → Bull bite → dismissal smoke. Sharingan ON = longer pin [CANON]" },
      { name: "Sharingan Read",  input: "Back + Special (needs Sharingan)", cost: 16, desc: "a short COUNTER window — if the foe attacks inside it, Kakashi Body Flickers behind them and slashes (Y+Run frames). Cooldown [CANON]" },
      { name: "Sharingan Genjutsu", input: "Up + Special (needs Sharingan)", cost: 22, desc: "a close-range stare that briefly STUNS the foe (code-drawn tomoe swirl). Cooldown [CANON-ADJACENT]" }
    ],
    passiveNote: "COMPLETE (all 4 phases). The Ultimate is DIRECTIONAL — neutral = Full-Charge Raikiri · Down = COPY NINJA (needs Sharingan + the foe fired a projectile in the last ~3s → mirror ONE copy; else no-op) · Up = KAMUI RIFT (only after the Mangekyō AWAKENING). MANGEKYŌ AWAKENING is automatic ONCE per round: at ≤25% HP with the Sharingan ON, a red-flash cut-in + Mangekyō pattern unlocks Kamui Rift until the round ends. KAMUI RIFT opens a spatial distortion at the foe (damage over a moment), then Kakashi is EXHAUSTED — Chakra to 0 + slowed ~2s. Back/Up Special still REQUIRE the Sharingan. Cinematics refuse during KO / Brutality / Domain / rewind.",
    ultimate: { name: "Raikiri / Copy Ninja / Kamui Rift", input: "Ultimate (neutral / Down / Up)", cost: 100, desc: "NEUTRAL = Full-Charge Raikiri (illustration cut-in, full charge-loop → guaranteed tracking thrust, ~198 EFF, half on block). DOWN = Copy Ninja (mirror the foe's recent projectile once; needs Sharingan + copy-ready). UP = Kamui Rift (spatial distortion DoT at the foe; only after the Mangekyō awakening, then EXHAUSTION) [CANON / CANON-ADJACENT]" },
    combos: [
      { name: "Launch Juggle", sequence: "Up-Attack, Jump, Air, Air", desc: "rising-kick launcher into aerial pressure" }
    ]
  },

  kakashi_war: {
    type: "Technical Shinobi / Kamui Specialist", energy: "Chakra", difficulty: "Hard",
    summary: "War-arc \"Kamui\" Hatake Kakashi — a top-band technical shinobi built toward Obito's Gift and the Perfect Susanoo. His Attack-Combo kunai string, rising-kick launcher and Strong variants pressure up close (the Strong-Down slash pops a Ninken from the ground); the Raikiri (ground OR air) charge-thrust and the Kawarimi substitution guard-escape are his Phase-1 tools. The Sharingan, long-range Kamui, Kamui-Raikiri ult, Doton: Tsuiga, Copy Ninja, Sennen Goroshi (P2), Frog Henge + skins (P3), Obito's Gift (P4) and Perfect Susanoo (P5) arrive across later phases.",
    passive: { name: "Sharingan (Kamui)", effect: "Charge-TAP toggles the Sharingan (code-drawn red eye + afterimage aura). It drains Chakra while active and makes Raikiri TRACK the foe; at 0 Chakra it shuts off and Kakashi is briefly FATIGUED. It also GATES the long-range Kamui + Copy Ninja (Sennen launches on a cross-up regardless)." },
    basics: [
      { name: "Kunai Combo",   input: "Light",                   desc: "Attack-Combo opener — quick kunai slash string" },
      { name: "Strong Lunge",  input: "Heavy",                   desc: "committed forward lunging Strong combo" },
      { name: "Rising Kick",   input: "Up-Attack",               desc: "launcher — rising Strong kick, starts air combos" },
      { name: "Air Combo",     input: "Air (jump + Light)",      desc: "aerial diving kunai slash" },
      { name: "Air Strong",    input: "Air + Heavy",             desc: "the neutral Strong performed airborne" },
      { name: "Down Slash",    input: "Crouch + Light",          desc: "low Strong slash — pops a single Ninken from the ground (visual)" }
    ],
    specials: [
      { name: "Raikiri",       input: "Neutral + Special (charge-hold, GROUND or AIR)", cost: 30, desc: "Lightning Blade — HOLD Special to charge (more damage, capped) → release to DASH + thrust, on the ground or in the air. Sharingan ON tracks the foe; OFF goes straight and can whiff [CANON]" },
      { name: "Kawarimi",      input: "Back + Special",          cost: 14, desc: "Substitution — a guard-escape: swap with a log + smoke and reappear BEHIND the attacker with brief i-frames. Cooldown [CANON]" },
      { name: "Kamui",         input: "Forward + Special (needs Sharingan)", cost: 44, desc: "long-range spatial rip — the Kamui swirl opens at the foe (grow → twist → collapse) for damage + a brief warp stun [CANON]" },
      { name: "Doton: Tsuiga", input: "Down + Special",         cost: 40, desc: "ground crack → the Ninken burst up and PIN the foe (rooted + damage ticks) → smoke [CANON]" },
      { name: "Sennen Goroshi",input: "Up + Special",           cost: 10, desc: "a crouch-lunge poke; light damage, and from behind (cross-up) it LAUNCHES high [CANON]" },
      { name: "Sharingan",     input: "Charge (tap)",           cost: 0,  desc: "toggle the Sharingan — drains Chakra, makes Raikiri TRACK, gates Kamui + Copy Ninja; at 0 Chakra it shuts off + brief fatigue [CANON]" }
    ],
    passiveNote: "PHASE 2 of 5 (adds Sharingan + Kamui + Kamui-Raikiri ult + Tsuiga + Sennen + Copy Ninja). The ultimate is DIRECTIONAL — NEUTRAL = KAMUI RAIKIRI (a full Raikiri charge, a Kamui swirl opens beside the foe, the strike comes through it — eye-banner cut-in, guaranteed, very high cost) · DOWN = COPY NINJA (needs Sharingan + the foe fired a projectile in the last ~3s → mirror ONE copy with his own frames; else no-op) · UP = OBITO'S GIFT (P4; a bond meter fills from Sharingan moves + damage taken — when full, a timed Double-Mangekyō mode grants Kamui Intangibility / Warp / Mini Kamui Shuriken, whose OWN ultimate (P5) is PERFECT SUSANOO). When the Gift ends the eyes return to Obito and Kamui is disabled for the REST OF THE ROUND + a brief exhaustion. Kamui / Kamui-Raikiri cinematics refuse during KO / Brutality / Domain / rewind.",
    ultimate: { name: "Kamui Raikiri / Copy Ninja / Obito's Gift", input: "Ultimate (neutral / Down / Up)", cost: 100, desc: "NEUTRAL = Kamui Raikiri — full charge-loop, a Kamui swirl opens beside the foe, the strike comes through it (eye-banner cut-in, guaranteed, ~204 EFF, half on block). DOWN = Copy Ninja (mirror the foe's recent projectile once; needs Sharingan + copy-ready). UP (P4, meter full) = Obito's Gift — timed Double-Mangekyō mode, its own ultimate is Perfect Susanoo (P5) [CANON / CANON-ADJACENT]" },
    combos: [
      { name: "Launch Juggle", sequence: "Up-Attack, Jump, Air, Air", desc: "rising-kick launcher into aerial pressure" },
      { name: "Air Raikiri",   sequence: "Jump, (hold) Special, release", desc: "charge the Lightning Blade in the air, release to dive-thrust" }
    ]
  },

  sasuke_sensei: {
    type: "Cycling-Dōjutsu Technician / Zoner", energy: "Chakra", difficulty: "Hard",
    summary: "Boruto-era Sasuke at his peak — a dōjutsu master with THREE cycling eye-sets. RAITON (lightning blades + Kirin), MANGEKYŌ (black flame, genjutsu + the Taka/Hebi summons) and RINNEGAN (gravity: repulsion, pull, absorb + Chibaku Tensei). Up + Ultimate rotates the active set — the same Special/Ultimate inputs fire that set's techniques; the active set flashes above Sasuke.",
    passive: { name: "Three Dōjutsu", effect: "The last Uchiha cycles Raiton → Mangekyō → Rinnegan — Up + Ultimate rotates the active eye-set (all three live). CANON NOTE: the Rinnegan slots use the sheet's Pain/Six-Paths techniques; Sasuke's own canon Rinnegan move (Amenotejikara) is not on the source art." },
    basics: [
      { name: "Fist/Kick String", input: "Light",                   desc: "fast close-range combo" },
      { name: "Sword Combo",      input: "Heavy",                   desc: "committed blade string with knockback" },
      { name: "Rising Sword",     input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Slash",        input: "Air (jump + Light)",      desc: "aerial sword attack" },
      { name: "Slam Spike",       input: "Down-Air (jump + Heavy)", desc: "downward aerial slam" },
      { name: "Grab",             input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Chidori",          input: "Special (Raiton)",         cost: 24, desc: "dashing lightning-blade strike (advances)" },
      { name: "Chidori Eisou",    input: "Forward + Special (Raiton)", cost: 28, desc: "extending lightning-spear thrust (long reach)" },
      { name: "Raiton Sword *1",  input: "Back + Special (Raiton)",  cost: 18, desc: "quick electrified sword swing" },
      { name: "Raiton Sword *2",  input: "Up + Special (Raiton)",    cost: 26, desc: "advancing electrified thrust (launcher)" },
      { name: "Raiton Sword *3",  input: "Down + Special (Raiton)",  cost: 32, desc: "committed electrified beam-thrust" },
      { name: "Chidori (air)",    input: "Air + Special (Raiton)",   cost: 24, desc: "diving lightning plunge" },
      { name: "Eye-Set Cycle",    input: "Up + Ultimate",            cost: 0,  desc: "rotate the active set (Raiton → Mangekyō → Rinnegan → Susano'o); does not spend meter" },
      { name: "Katon Goukakyuu",  input: "Special (Mangekyō)",       cost: 26, desc: "Great Fireball projectile (air version too)" },
      { name: "Amaterasu",        input: "Forward + Special (Mangekyō)", cost: 34, desc: "slow inextinguishable black-flame projectile" },
      { name: "Amaterasu Sword",  input: "Back + Special (Mangekyō)", cost: 30, desc: "black-flame-wreathed sword slash (melee)" },
      { name: "Genjutsu",         input: "Up + Special (Mangekyō)",   cost: 30, desc: "short-range hit-confirm — freezes the foe (long stun)" },
      { name: "Kuchiyose: Taka",  input: "Down + Special (Mangekyō)", cost: 34, desc: "summon a hawk that dive-swoops the foe" },
      { name: "Shinra Tensei",    input: "Special (Rinnegan)",        cost: 28, desc: "radial repulsion — big knockback, low damage [ORIGINAL]" },
      { name: "Chakra Absorb",    input: "Forward + Special (Rinnegan)", cost: 24, desc: "brief i-frame absorb that restores chakra [ORIGINAL]" },
      { name: "Rinnegan Path",    input: "Back + Special (Rinnegan)", cost: 26, desc: "long-reach gravity pull — reels the foe in [ORIGINAL]" },
      { name: "Raiko Kenka",      input: "Up + Special (Rinnegan)",   cost: 22, desc: "thrown shuriken weapon [ORIGINAL]" },
      { name: "War-Susano'o: Arm Grab", input: "Forward + Grab (any set)", cost: 15, desc: "TIER 1 — a partial ribcage forms + a procedural skeletal Susano'o arm extends with huge reach, grabs + crushes/throws. The CHEAPEST Susano'o move [CANON]" },
      { name: "War-Susano'o: Ribcage Guard", input: "Up + Special (Susano'o set)", cost: 20, desc: "TIER 1 — the rib-ring bands snap up as brief defensive armor; incoming damage is cut for a short window [CANON-ADJACENT]" },
      { name: "War-Susano'o: Torso Arrow", input: "Special (Susano'o set)", cost: 34, desc: "TIER 2 — the Susano'o bust materializes + draws its bow, firing a fast homing arrow [CANON]" },
      { name: "War-Susano'o: Claw Smash", input: "Forward + Special (Susano'o set)", cost: 32, desc: "TIER 2 — the bust rakes forward with its claw (fast mid-range melee) [CANON-ADJACENT]" },
      { name: "War-Susano'o: Blade Swing", input: "Back + Special (Susano'o set)", cost: 38, desc: "TIER 2 — the bust swings its blade (heavy, longest-reach melee). The bust follows Sasuke while active [CANON-ADJACENT]" },
      { name: "War-Susano'o: SOLDIER", input: "Ultimate (Susano'o set)", cost: 100, desc: "TIER 3 — full GIANT transformation (really big, just under teen Sasuke's Susanoo). Player-controlled, Susanoo HP instead of block, timed + chakra-drained. In Soldier: Special = Arrow Volley / Forward+Special = Wing Dash [CANON]" },
      { name: "War-Susano'o: Indra's Arrow", input: "Ultimate (while in Soldier)", cost: 0, desc: "TIER 3 finisher — a cyan-flame arrow for huge guaranteed damage; firing it ENDS the transformation [CANON]" }
    ],
    ultimate: { name: "Kirin / Kuchiyose: Hebi / Chibaku Tensei", input: "Ultimate (full meter — current set)", cost: 100, desc: "RAITON = Kirin (undodgeable lightning). MANGEKYŌ = Kuchiyose Hebi (serpent that strikes, poisons, then petrifies). RINNEGAN = Chibaku Tensei (gravity-sphere crush) [CANON-ADJACENT]" },
    combos: [
      { name: "Dash-in Chidori", sequence: "Light, Special",            desc: "jab into Chidori rush" },
      { name: "Launch Juggle",   sequence: "Up-Attack, Jump, Air, Air", desc: "rising-sword launcher into aerial pressure" }
    ]
  },

  itachi: {
    type: "Genjutsu Tactician / Sharingan", energy: "Chakra", difficulty: "Hard",
    summary: "A calculated Uchiha who zones with the Great Fireball, then flips on the Mangekyou Sharingan to unlock Amaterasu's black flame and a hit-confirm Genjutsu finisher — culminating in the Susanoo avatar.",
    passive: { name: "Sharingan", effect: "Double-tap toward the opponent to blink (teleport dash) past their guard." },
    basics: [
      { name: "Low Sweep",   input: "Light",                   desc: "fast low poke, low knockback" },
      { name: "Blade Swing",  input: "Heavy",                   desc: "committed wide slash with knockback" },
      { name: "Rising Slash", input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Knife",    input: "Air (jump + Light)",      desc: "aerial stab" },
      { name: "Dive Kick",    input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",         input: "Grab",                    desc: "grab and throw" }
    ],
    specials: [
      { name: "Great Fireball Jutsu", input: "Special",                     cost: 25, desc: "hand-seal cast → a wide rolling wall of flame (ranged zoning)" },
      { name: "Mangekyou Sharingan",  input: "Hold Charge → release (≥75% chakra)", cost: 0, desc: "BUFF MODE: ignites +20% dmg / +12% spd / +6% def, drains chakra until empty; unlocks Amaterasu + Genjutsu. Tap Charge to drop it." },
      { name: "Amaterasu",            input: "QCF + Special (Mangekyou only)", cost: 40, desc: "inextinguishable black flame — modest hit, heavy lingering burn. Cannot be cast without Mangekyou." },
      { name: "Genjutsu",             input: "QCB + Special (Mangekyou only, mid-combo)", cost: 45, desc: "HIT-CONFIRM finisher — only fires during a live combo; freezes the target in an illusion for a guaranteed follow-up." }
    ],
    mobility: { name: "Shunshin Blink", input: "Double-tap toward opponent", cost: 0, desc: "Sharingan teleport dash past the enemy" },
    ultimate: { name: "Susanoo", input: "Ultimate (full meter)", cost: 100, desc: "summon the Susanoo avatar — a sustained giant form (sword / guard on Special)" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string into the Fireball" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air",         desc: "launch into aerial pressure" }
    ]
  },

  sasuke_adult: {
    type: "Rinnegan Duelist / Zoner", energy: "Chakra", difficulty: "Hard",
    summary: "The adult Uchiha — blends a lightning-fast Chidori rush and Katon fire zoning with Mangekyou Amaterasu and a directional Rinnegan ultimate (Chibaku Tensei / Shinra Tensei / Banshou Tenin).",
    basics: [
      { name: "Fist Jab",     input: "Light",                   desc: "fast taijutsu poke" },
      { name: "Sword Slash",  input: "Heavy",                   desc: "committed crescent sword swing with knockback" },
      { name: "Rising Slash", input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Strike",   input: "Air (jump + Light)",      desc: "aerial fist" },
      { name: "Dive Slash",   input: "Down-Air (jump + Heavy)", desc: "downward air sword spike" }
    ],
    specials: [
      { name: "Katon: Great Fireball", input: "Special (ground / air)",  cost: 26, desc: "fire-breath projectile — ranged zoning. [CANON]" },
      { name: "Chidori",               input: "Forward + Special (ground / air)", cost: 30, desc: "lightning run-thrust dash-strike that closes the gap. [CANON]" },
      { name: "Chidori Nagashi",       input: "Back + Special",          cost: 34, desc: "stationary lightning-current AOE burst around Sasuke. [CANON]" },
      { name: "Amaterasu",             input: "Up + Special",            cost: 40, desc: "inextinguishable black flame — modest hit, heavy lingering burn. [CANON]" },
      { name: "Sword-Swap Strike",     input: "Down + Special",          cost: 28, desc: "warp to the hurled sword and run the foe through (Amenotejikara-flavoured). [CANON-ADJACENT]" },
      { name: "War-Susano'o: Arm Grab", input: "Forward + Grab",           cost: 15, desc: "WAR-SUSANO'O (base) — a giant ribcage claw POPS OUT at the foe, grabs + slams/throws. Cheapest Susano'o move. [CANON]" },
      { name: "War-Susano'o: Stance",   input: "Charge + Ultimate (toggle)", cost: 0, desc: "WAR-SUSANO'O gateway (adult has no eye-set): toggle the stance, then Special = Ribcage Guard (Up) / Torso Arrow (N) / Claw Smash (Fwd) / Blade Swing (Back), and Ultimate = the Soldier. [CANON]" },
      { name: "War-Susano'o: SOLDIER",  input: "Ultimate (in the stance)", cost: 100, desc: "WAR-SUSANO'O Tier 3 — full GIANT transformation (really big). Susanoo HP instead of block; in Soldier: Special = Arrow Volley, Fwd+Special = Wing Dash, Ultimate = Indra's Arrow (ends it). [CANON]" }
    ],
    mobility: { name: "Dash", input: "Dash / double-tap", cost: 0, desc: "quick reposition" },
    ultimate: { name: "Rinnegan (directional)", input: "Ultimate (full meter) — neutral / Forward / Back", cost: 100, desc: "neutral = Chibaku Tensei (gravity-sphere crush, strongest) · Forward = Shinra Tensei (repulsion blast) · Back = Banshou Tenin (gravity reel-in). [Chibaku CANON · Shinra/Banshou CANON-ADJACENT]" },
    combos: [
      { name: "Chidori Confirm", sequence: "Heavy, Forward+Special", desc: "cancel a sword swing into the Chidori rush" },
      { name: "Air Juggle",      sequence: "Up-Attack, Jump, Air",    desc: "launch into aerial pressure" }
    ]
  },

  // ── JUJUTSU KAISEN ───────────────────────────────────────────
  gojo: {
    type: "Ranged Controller / Zoner", energy: "Cursed Energy", difficulty: "Hard",
    summary: "An untouchable space-controller who walls out the enemy with limitless cursed-energy singularities, then erases them with Hollow Purple.",
    passive: { name: "Infinity", effect: "Always-on barrier of converging space slows and softens incoming hits near Gojo while cursed energy remains; drains energy when fully active." },
    basics: [
      { name: "Jab",        input: "Light",                    desc: "fast cursed-energy poke" },
      { name: "Heavy Blow", input: "Heavy",                    desc: "knockback strike" },
      { name: "Launcher",   input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike", input: "Air (jump + Light)",       desc: "aerial poke" },
      { name: "Dive",       input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Blue (Lapse)",   input: "Special",                       cost: 30, desc: "attraction singularity — pulls the enemy in; combo starter" },
      { name: "Red (Reversal)", input: "Down-Forward + Special (QCF)",  cost: 40, desc: "repulsion singularity — blasts the enemy away" },
      { name: "Hollow Purple",  input: "Down-Back + Special (QCB)",     cost: 70, desc: "convergence of Blue and Red — huge erasing beam" }
    ],
    mobility: { name: "Teleport", input: "Forward + Special / double-tap Dash", cost: 10, desc: "instant blink to reposition or escape pressure" },
    ultimate: { name: "Unlimited Void", input: "Ultimate (full meter)", cost: 100, desc: "Domain Expansion: traps the enemy in infinite information, stunning them while Infinity auto-dodges" },
    combos: [
      { name: "Lapse Convert", sequence: "Blue, Light, Light, Heavy", desc: "pull them in, then punish" },
      { name: "Erase",         sequence: "Blue, Hollow Purple",       desc: "pull into the convergence beam" },
      { name: "Air Juggle",    sequence: "Up-Attack, Jump, Air, Air", desc: "launcher into aerials" }
    ]
  },
  sukuna: {
    type: "Rushdown / Damage", energy: "Cursed Energy", difficulty: "Medium",
    summary: "The King of Curses — a relentless close-range slasher who tears the opponent apart with Cleave and zones with Dismantle before opening his merciless domain.",
    passive: { name: "King of Curses", effect: "Cursed-energy slashes ramp: consecutive special hits without being interrupted increase Sukuna's outgoing slash damage." },
    basics: [
      { name: "Slash",      input: "Light",                    desc: "fast cutting poke" },
      { name: "Heavy Cut",  input: "Heavy",                    desc: "heavy slash, big knockback" },
      { name: "Launcher",   input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Slash",  input: "Air (jump + Light)",       desc: "aerial cut" },
      { name: "Dive Cut",   input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Cleave",    input: "Special",                  cost: 40, desc: "wide point-blank cursed slash; high damage opener" },
      { name: "Dismantle", input: "Down-Back + Special (QCB)", cost: 35, desc: "ranged slashing wave that cuts at a distance" }
    ],
    mobility: { name: "Malevolent Dash", input: "Forward + Special", cost: 20, desc: "a low predatory rush that closes space and slips past projectiles" },
    ultimate: { name: "Malevolent Shrine", input: "Ultimate (full meter)", cost: 100, desc: "Domain Expansion: a barrier-less shrine that rains continuous automatic slashes on the enemy" },
    combos: [
      { name: "Open & Tear", sequence: "Cleave, Light, Light, Heavy",        desc: "open with the wide slash, then chain" },
      { name: "Cut Off",     sequence: "Dismantle, Malevolent Dash, Cleave", desc: "zone, close in, finish" },
      { name: "Air Rend",    sequence: "Up-Attack, Jump, Air, Air",          desc: "launcher into aerials" }
    ]
  },
  // ── ORIGINAL ─────────────────────────────────────────────────
  omololu: {
    type: "Kamui Zoner / Space-Time", energy: "Chakra", difficulty: "Hard",
    summary: "A self-insert who inherited Obito's Kamui arsenal — shuriken/rod zoning, a warp blink, phase-through intangibility and a void-swap barrage — plus a Flash-Time slow-field. His Domain forces the foe to dance a WASD rhythm gauntlet.",
    passive: { name: "—", effect: "No special passive." },
    basics: [
      { name: "Rod Spin",     input: "Light",                    desc: "quick staff poke" },
      { name: "Staff Thrust", input: "Heavy",                    desc: "long-reach knockback thrust" },
      { name: "Rising Staff", input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike",   input: "Air (jump + Light)",       desc: "aerial rod strike" },
      { name: "Dive Spike",   input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",         input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Shuriken Throw",      input: "Special (neutral; air = diagonal)", cost: 18, desc: "a spinning shuriken; airborne throws it down-forward" },
      { name: "Chakra Rod",          input: "Forward + Special",   cost: 22, desc: "a fast, long-reach thrown rod" },
      { name: "Giant Shuriken",      input: "Up + Special",        cost: 34, desc: "a massive, slow, heavy fūma-style shuriken" },
      { name: "Kamui Warp",          input: "Down + Special",      cost: 20, desc: "blink a long distance (self-mobility, no damage)" },
      { name: "Flash Time",          input: "Back + Special",      cost: 30, desc: "time-slow: the foe runs at ~1/3 speed while you move normally (drains meter; press again to end)" },
      { name: "Kamui Intangibility", input: "Charge (tap)",        cost: 0,  desc: "phase through all attacks; drains chakra while active, auto-drops when empty" },
      { name: "Kamui Dimension",     input: "Charge (hold→release)", cost: 45, desc: "void-swap: freeze the foe and unload a rapid shuriken barrage" }
    ],
    mobility: { name: "Kamui Blink", input: "Double-tap toward", cost: 0, desc: "instant teleport to the opponent's side" },
    ultimate: { name: "Domain Expansion: The Genesis Threshold", input: "Ultimate (full meter)", cost: 100, desc: "trap the foe in a domain and force them to hit a random ~20s WASD cadence — every fumbled beat deals real damage" },
    combos: [
      { name: "Bread & Butter", sequence: "Forward + Heavy, Heavy, Heavy", desc: "Kamui Rod Combo — re-tap Heavy on hit to link into the launcher finisher" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",     desc: "launcher into aerial pressure" }
    ]
  },

  // ── DEMON SLAYER ─────────────────────────────────────────────
  zenitsu: {
    type: "Thunder Breathing Burst Assassin", energy: "None (pure physical)", difficulty: "Hard",
    summary: "A one-note prodigy built around a single devastating Thunderclap — frail but the fastest blade on the roster, lethal in a single committed flash.",
    passive: { name: "Sixfold Focus", effect: "When his health is low he gains a small boost to attack speed, channeling fear into raw velocity." },
    basics: [
      { name: "Quick Slash", input: "Light",                    desc: "lightning-fast poke" },
      { name: "Heavy Cut",   input: "Heavy",                    desc: "hard knockback slash" },
      { name: "Rising Bolt", input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Slash",   input: "Air (jump + Light)",       desc: "fast aerial cut" },
      { name: "Dive Strike", input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",        input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Thunderclap and Flash", input: "Special",           cost: 0, desc: "instant high-speed lightning step-through strike" },
      { name: "Sixfold",               input: "Down + Special",    cost: 0, desc: "stationary multi-strike thunderclap volley that punishes whiffs" },
      { name: "Rice Spirit",           input: "Forward + Special", cost: 0, desc: "advancing flicker-strike that covers horizontal space in a flash" }
    ],
    mobility: { name: "Godspeed", input: "Forward + Special", cost: 0, desc: "explosive Thunder Breathing flash-step that crosses the screen near-instantly" },
    ultimate: { name: "Thunder Breathing Mastery", input: "Ultimate (full meter)", cost: 0, desc: "awakens Sleeping Thunder for 1.8x damage, 1.6x speed, and high crit on multi-strike combos" },
    combos: [
      { name: "Bread & Butter", sequence: "Forward + Heavy, Heavy, Heavy",  desc: "Thunderclap command-chain into the rising launcher (re-tap Heavy on hit)" },
      { name: "Flash Punish",   sequence: "Forward + Special, Special",    desc: "rice-spirit approach into the Thunderclap kill" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",     desc: "rising bolt into aerial slashes" }
    ]
  },

  // ── RICK & MORTY ─────────────────────────────────────────────
  rick: {
    type: "Gadget Zoner / Summoner", energy: "Gadget Energy", difficulty: "Medium",
    summary: "A drunk genius who controls space with portal tech and disposable Meeseeks, fighting smarter than anyone has any right to.",
    passive: { name: "Garage Tinkerer", effect: "Idle gadget tech passively regenerates Gadget Energy slightly faster than normal." },
    basics: [
      { name: "Jab",        input: "Light",                    desc: "scrappy poke" },
      { name: "Heavy Hit",  input: "Heavy",                    desc: "knockback strike" },
      { name: "Launcher",   input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike", input: "Air (jump + Light)",       desc: "aerial poke" },
      { name: "Dive",       input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Portal Blast",    input: "Special",        cost: 30, desc: "fires a portal-based energy projectile for ranged control" },
      { name: "Meeseeks Summon", input: "Down + Special", cost: 40, desc: "summons a Mr. Meeseeks to assist with an extra attack" }
    ],
    mobility: { name: "Portal Hop", input: "Forward + Special", cost: 15, desc: "opens a quick portal pair to teleport across the stage" },
    ultimate: { name: "Ultimate Gadgetry", input: "Ultimate (full meter)", cost: 100, desc: "deploys his whole arsenal — all attacks gain massive damage and range" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy",              desc: "dial-a-combo when they get in — the Heavy folds into the launcher" },
      { name: "Zone Control",   sequence: "Portal Blast, Meeseeks Summon",     desc: "wall them out and add pressure" },
      { name: "Trap & Punish",  sequence: "Portal Hop, Heavy, Portal Blast",   desc: "reposition behind them and convert" }
    ]
  },
  morty: {
    type: "Panic Brawler / Burst", energy: "Gadget Energy", difficulty: "Easy",
    summary: "An anxious underdog who flails and panics until adrenaline takes over, turning desperation into sudden bursts of courage.",
    passive: { name: "Adrenaline", effect: "Panic feeds power: the lower Morty's health, the faster his Gadget Energy builds." },
    basics: [
      { name: "Flail",       input: "Light",                    desc: "frantic poke" },
      { name: "Heavy Swing", input: "Heavy",                    desc: "knockback swing" },
      { name: "Launcher",    input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike",  input: "Air (jump + Light)",       desc: "aerial poke" },
      { name: "Dive",        input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",        input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Nerve Strike",   input: "Special",        cost: 25, desc: "a quick panic-fueled lunging strike; fast startup" },
      { name: "Frantic Flurry", input: "Down + Special", cost: 20, desc: "a wild flailing barrage of weak rapid hits born of pure panic" }
    ],
    mobility: { name: "Scramble", input: "Forward + Special", cost: 10, desc: "a desperate scrambling dash to flee or close in" },
    ultimate: { name: "Morty's Courage", input: "Ultimate (full meter)", cost: 100, desc: "finally finds his nerve — dramatically boosts attack and speed for a short burst" },
    combos: [
      { name: "Panic Punish",  sequence: "Nerve Strike, Light, Light, Heavy",     desc: "lunge in and flail away" },
      { name: "Courage Burst", sequence: "Morty's Courage, Heavy, Nerve Strike",  desc: "go all-in while empowered" }
    ]
  },
  evilMorty: {
    type: "Control / Debuffer", energy: "Gadget Energy", difficulty: "Medium",
    summary: "A cold, calculating mastermind who manipulates the fight from arm's length, debuffing and outscheming his opponent into submission.",
    passive: { name: "Mastermind", effect: "Always two steps ahead — landing a special briefly slows the opponent's energy regen." },
    basics: [
      { name: "Jab",        input: "Light",                    desc: "controlled poke" },
      { name: "Heavy Hit",  input: "Heavy",                    desc: "knockback strike" },
      { name: "Launcher",   input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike", input: "Air (jump + Light)",       desc: "aerial poke" },
      { name: "Dive",       input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Manipulative Blast", input: "Special",        cost: 30, desc: "a psychic energy attack that controls space and pressures from range" },
      { name: "Override",           input: "Down + Special", cost: 25, desc: "a controlling pulse that debuffs the enemy, sapping their speed briefly" }
    ],
    mobility: { name: "Cold Step", input: "Forward + Special", cost: 15, desc: "an efficient portal-step that repositions with calculated precision" },
    ultimate: { name: "Evil Morty's Takeover", input: "Ultimate (full meter)", cost: 100, desc: "seizes control of the fight — boosts his speed and damage while debuffing the enemy" },
    combos: [
      { name: "Suppress",    sequence: "Override, Manipulative Blast, Heavy",    desc: "debuff then capitalize" },
      { name: "Outmaneuver", sequence: "Cold Step, Heavy, Manipulative Blast",  desc: "reposition and control" }
    ]
  },
  rickPrime: {
    type: "Gadget Zoner / Burst", energy: "Gadget Energy", difficulty: "Hard",
    summary: "The Rick who got away — a ruthless multiversal apex predator who deletes opponents with overwhelming portal-tech firepower and superior mobility.",
    passive: { name: "Apex Intellect", effect: "The most dangerous man in the multiverse: enhanced gadget output keeps his projectiles hitting harder than any other Rick's." },
    basics: [
      { name: "Jab",        input: "Light",                    desc: "precise poke" },
      { name: "Heavy Hit",  input: "Heavy",                    desc: "heavy knockback strike" },
      { name: "Launcher",   input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike", input: "Air (jump + Light)",       desc: "aerial poke" },
      { name: "Dive",       input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Prime Portal Blast", input: "Special",        cost: 35, desc: "an extremely powerful multiverse-energy projectile that overwhelms zoners" },
      { name: "Annihilation Mine",  input: "Down + Special", cost: 30, desc: "deploys a portal-tech charge that detonates to deny approaches" }
    ],
    mobility: { name: "Prime Portal", input: "Forward + Special", cost: 15, desc: "an instant high-speed portal warp for flanks and escapes" },
    ultimate: { name: "Rick Prime's Supremacy", input: "Ultimate (full meter)", cost: 100, desc: "unleashes massive speed and attack boosts alongside chaotic random high-cost gadgets" },
    combos: [
      { name: "Delete",       sequence: "Prime Portal Blast, Annihilation Mine",  desc: "zone hard and lock them down" },
      { name: "Flank Burst",  sequence: "Prime Portal, Heavy, Prime Portal Blast", desc: "warp behind them and burst" }
    ]
  },

  // ── BEN 10 ───────────────────────────────────────────────────
  ben10: {
    type: "Shapeshifter / All-Rounder", energy: "Omnitrix", difficulty: "Hard",
    summary: "A kid with the Omnitrix who picks 5 aliens before the match and switches between them mid-fight with Charge + ←/→, each alien bringing its own moveset, so his entire kit morphs on the fly.",
    passive: { name: "Omnitrix", effect: "Hold Charge and tap ←/→ to cycle through the 5 chosen aliens in real time, instantly swapping the active fighter's stats, basics, specials, and ultimate." },
    basics: [
      { name: "Alien Light", input: "Light",                   desc: "active alien's fast attack" },
      { name: "Alien Heavy", input: "Heavy",                   desc: "active alien's heavy strike (often super-armored)" },
      { name: "Launcher",    input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Strike",  input: "Air (jump + Light)",      desc: "aerial attack" },
      { name: "Dive",        input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",        input: "Grab",                    desc: "throw" }
    ],
    specials: [
      { name: "Alien Special",      input: "Special",        cost: 0, desc: "the active alien's primary special — changes entirely per alien" },
      { name: "Alien Special (Alt)",input: "Down + Special", cost: 0, desc: "the active alien's secondary special, when it has one" }
    ],
    mobility: { name: "Omnitrix Switch", input: "Charge + ←/→", cost: 0, desc: "cycles the active alien, swapping the entire moveset to adapt to the situation" },
    ultimate: { name: "Omnitrix Overload", input: "Ultimate (full meter)", cost: 100, desc: "unleashes the active alien's signature ultimate" },
    combos: [
      { name: "Adapt & Smash", sequence: "Omnitrix Switch, Heavy, Alien Special", desc: "swap to the right alien, then punish" },
      { name: "Air Juggle",    sequence: "Up-Attack, Jump, Air, Air",            desc: "launcher into aerials" }
    ]
  },

  // ── POWER RANGERS ────────────────────────────────────────────
  omega_ranger: {
    type: "Blade / Blaster Striker", energy: "SPD Energy", difficulty: "Medium",
    summary: "The Omega Ranger (White Ranger, S.P.D.) — S.P.D.'s fastest ranger, a hybrid striker who mixes a long-reach Omega Saber with Delta Enforcer blaster fire and a flash-step blitz.",
    passive: { name: "Omega Morpher", effect: "The fastest ranger — quicker Dash recovery and steady SPD Energy regen." },
    basics: [
      { name: "Saber Jab",   input: "Light",                   desc: "fast saber poke" },
      { name: "Heavy Smash", input: "Heavy",                   desc: "overhead Delta smash with knockback" },
      { name: "Rising Cut",  input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Strike",  input: "Air (jump + Light)",      desc: "aerial attack" },
      { name: "Dive Cut",    input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",        input: "Grab",                    desc: "throw" }
    ],
    strings: [
      { name: "Kick Chain",    input: "Fwd+Heavy → re-tap Heavy (on hit)",  desc: "kick → spin kick → low sweep; each stage cancels into the next ONLY on a connect" },
      { name: "Sword Slash String", input: "Back+Light → re-tap Light (on hit)", desc: "7-hit Omega Saber string; individually landable, chains forward on hit" },
      { name: "Forward Push",  input: "Fwd+Light",   desc: "free spacing shove — big pushback" },
      { name: "Down-Air Smash", input: "Air + Heavy", desc: "free aerial smash poke (spikes down)" }
    ],
    specials: [
      { name: "Delta Enforcer Gun", input: "Special",         cost: 30, desc: "ranged energy-bolt projectile" },
      { name: "Super Upper Attack", input: "Forward + Special", cost: 45, desc: "energized rising uppercut — launcher (its own move, not the Up-normal)" },
      { name: "Special Downward Attack", input: "Down + Special", cost: 40, desc: "spinning-blade windup into a ground-spray slam" }
    ],
    mobility: { name: "Omega Flash-Step", input: "double-tap toward foe", cost: 0, desc: "S.P.D.'s fastest ranger — quick dash with fast recovery (passive)" },
    ultimate: { name: "Omega Saber: Final Strike", input: "Ultimate (full meter)", cost: 100, desc: "multi-hit saber barrage" },
    combos: [
      { name: "Saber String → Launch", sequence: "Back+Light ×7 → Fwd+Special", desc: "full sword string into Super Upper juggle" },
      { name: "Gun Zone",       sequence: "Special (Gun), Special (Gun), Fwd+Heavy string", desc: "poke with bolts, then punish the approach with the kick chain" }
    ]
  }
}

// Grammar-accurate bread-and-butter combos for a character, from comboStandard.js `classify()`.
// The Move List should teach what the fighter can ACTUALLY do — a Fwd+Heavy rekka char must NOT be told
// "Light, Light, Heavy" (only standard-string chars chain light normals), and a zoner has no auto-combo.
export function comboStringFor(rosterKey) {
  const air = { name: "Air Juggle", sequence: "Up-Attack, Jump, Air, Air", desc: "launcher into aerial pressure" }
  const c = classify(rosterKey)
  if (c?.grammar === "rekka") {
    if (c.opener === "grab") return [{ name: "Command Grab", sequence: "Grab", desc: "signature command grab (no strike chain)" }, air]
    if ((c.stages ?? 0) <= 1) return [{ name: "Power Normal", sequence: "Forward + Heavy", desc: "a single committed command-normal (no re-tap chain)" }, air]
    return [
      { name: "Bread & Butter", sequence: "Forward + Heavy, Heavy, Heavy", desc: "command-normal chain — re-tap Heavy on hit to link into the launcher finisher" },
      air,
    ]
  }
  if (c?.grammar === "standard-string") {
    return [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy", desc: "dial-a-combo — the Heavy folds into the Up-Attack launcher" },
      { name: "Special Cancel", sequence: "Heavy, Special", desc: "cancel a Heavy into a special" },
      air,
    ]
  }
  // zoner (or unclassified): single-poke by design — no auto-combo
  return [
    { name: "Zoning Pressure", sequence: "Special, then Light / Heavy pokes", desc: "single-poke fighter — build pressure with specials, not a chained string" },
    air,
  ]
}

// Returns a kit for a character, synthesizing a minimal one from raw character
// data if no hand-authored kit exists (keeps the Move List robust for any
// future fighter added to characters.js).
export function getKit(rosterKey, character = null) {
  if (KITS[rosterKey]) return KITS[rosterKey]
  if (!character) return null
  const specials = Object.entries(character.specials || {}).map(([k, v], i) => ({
    name: k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()).trim(),
    input: i === 0 ? "Special" : i === 1 ? "Down + Special" : "Forward + Special",
    cost: v.cost || 0,
    desc: v.effect || "special technique"
  }))
  return {
    type: (character.archetypes || []).join(" / ") || "Fighter",
    energy: character.traits?.energyType ? String(character.traits.energyType).replace(/_/g, " ") : "None",
    difficulty: "Medium",
    summary: `${character.name} — ${(character.archetypes || []).join(", ")} fighter.`,
    passive: character.passive || { name: "—", effect: "No special passive." },
    basics: [
      { name: "Light Attack", input: "Light", desc: "fast poke" },
      { name: "Heavy Attack", input: "Heavy", desc: "knockback strike" },
      { name: "Up-Attack",    input: "Up-Attack", desc: "launcher — starts air combos" },
      { name: "Air Attack",   input: "Air (jump + Light)", desc: "aerial" },
      { name: "Down-Air",     input: "Down-Air (jump + Heavy)", desc: "spike" },
      { name: "Grab",         input: "Grab", desc: "throw" }
    ],
    specials: specials.length ? specials : [{ name: "—", input: "Special", cost: 0, desc: "no specials" }],
    mobility: { name: "Dash", input: "Dash / Double-tap", cost: 0, desc: "quick reposition" },
    ultimate: { name: character.ultimate?.name || "Ultimate", input: "Ultimate (full meter)", cost: character.ultimate?.cost || 100, desc: character.ultimate?.effect || "powerful finisher" },
    combos: comboStringFor(rosterKey)
  }
}
