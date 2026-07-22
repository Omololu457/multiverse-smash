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
// The 7 advanced characters (goku/naruto/gojo/megumi/sukuna/omololu/toji) ALSO
// accept fighting-game motions (QCF, DP, etc.) shown in their move inputs.
// ─────────────────────────────────────────────────────────────────

// Global control reference (shown on the Move List "Controls" panel).
export const CONTROL_REFERENCE = {
  keyboardP1: [
    ["Move",            "A / D"],
    ["Jump / Up",       "W"],
    ["Crouch / Block",  "S"],
    ["Light Attack",    "J"],
    ["Heavy Attack",    "K"],
    ["Special",         "I"],
    ["Ultimate",        "L"],
    ["Dash",            "Shift"],
    ["Grab",            "G"],
    ["Charge / Omnitrix","O"]
  ],
  keyboardP2: [
    ["Move",            "← / →"],
    ["Jump / Up",       "↑"],
    ["Crouch / Block",  "↓"],
    ["Light Attack",    "1"],
    ["Heavy Attack",    "2"],
    ["Special",         "3"],
    ["Ultimate",        "4"],
    ["Dash",            "0"],
    ["Grab",            "9"],
    ["Charge / Omnitrix","6"]
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
    "Up-Attack (↑ + Light/Heavy) launches BOTH fighters up for air combos."
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
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string into Galick Gun" },
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
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string into Beam Cannon" },
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
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string into Death Beam" },
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
  megumi: {
    type: "Setup / Summoner", energy: "Cursed Energy", difficulty: "Hard",
    summary: "A methodical shikigami summoner who builds board control by calling shadow beasts from every direction, then sacrifices himself to become Mahoraga.",
    passive: { name: "Ten Shadows", effect: "Shikigami are summoned on a shared cooldown; defeated shikigami (except Mahoraga) can be re-summoned, rewarding patient setup play." },
    basics: [
      { name: "Jab",        input: "Light",                    desc: "fast poke" },
      { name: "Heavy Blow", input: "Heavy",                    desc: "knockback strike" },
      { name: "Launcher",   input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike", input: "Air (jump + Light)",       desc: "aerial poke" },
      { name: "Dive",       input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Divine Dogs",  input: "Down-Forward + Special (QCF)",          cost: 20, desc: "summons twin shadow wolves that rush the enemy" },
      { name: "Nue",          input: "Forward, Down, Forward + Special (DP)",  cost: 25, desc: "summons a shikigami bird for an aerial lightning strike" },
      { name: "Toad",         input: "Back, Forward + Special",               cost: 20, desc: "summons a toad that restrains the opponent" },
      { name: "Max Elephant", input: "Down-Back + Special",                   cost: 35, desc: "summons a giant elephant for a massive crushing wave" }
    ],
    mobility: { name: "Rabbit Escape", input: "Down, Up + Special", cost: 15, desc: "summons a swarm of rabbits to cover a defensive reposition" },
    ultimate: { name: "Mahoraga Ritual", input: "Ultimate (full meter)", cost: 100, desc: "Domain-tier death ritual: permanently transforms Megumi into the adapting shikigami Mahoraga, locking out his summons" },
    combos: [
      { name: "Pin & Punish", sequence: "Toad, Light, Light, Heavy", desc: "restrain then convert" },
      { name: "Stampede",     sequence: "Divine Dogs, Max Elephant",  desc: "wolves pressure into the elephant wave" },
      { name: "Skyfall",      sequence: "Up-Attack, Jump, Air, Nue",  desc: "juggle into a lightning strike" }
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
  toji: {
    type: "Rushdown / Speed", energy: "None (pure physical)", difficulty: "Medium",
    summary: "A cursed-energy-less assassin who overwhelms with raw speed and weapons pulled from his Inverted Spear inventory, needing no meter to kill.",
    passive: { name: "Heavenly Restriction", effect: "Born with zero cursed energy traded for a superhuman body: maximum mobility, triple jump, and a permanent speed surge once health drops below 50%." },
    basics: [
      { name: "Quick Strike", input: "Light",                   desc: "very fast poke" },
      { name: "Heavy Smash",  input: "Heavy",                    desc: "heavy weapon blow" },
      { name: "Launcher",     input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Strike",   input: "Air (jump + Light)",      desc: "aerial poke" },
      { name: "Dive",         input: "Down-Air (jump + Heavy)", desc: "downward spike" },
      { name: "Grab",         input: "Grab",                    desc: "throw" }
    ],
    specials: [
      { name: "Inventory Smash", input: "Special",                cost: 0, desc: "pulls a weapon from his cursed-tool inventory for a heavy strike" },
      { name: "Rapid Strike",    input: "Forward, Forward + Special", cost: 0, desc: "high-speed dashing flurry; fast and low-commitment" }
    ],
    mobility: { name: "Assassin Dash", input: "Forward + Special", cost: 0, desc: "explosive evasive dash that repositions for a flank" },
    ultimate: { name: "Heavenly Restriction Surge", input: "Ultimate (no meter needed)", cost: 0, desc: "unleashes his full physical limit for a 1.8x speed and 1.6x damage surge" },
    combos: [
      { name: "Blitz",      sequence: "Rapid Strike, Light, Light, Inventory Smash", desc: "rush in and cash out" },
      { name: "Flank Kill", sequence: "Assassin Dash, Heavy, Inventory Smash",        desc: "reposition then punish" }
    ]
  },
  mahoraga: {
    type: "Adaptive Bruiser / Tank", energy: "None (pure physical)", difficulty: "Medium",
    summary: "An eight-handled divine general that grows unbeatable over time, adapting to everything it is hit by while crushing foes with the divine wheel.",
    passive: { name: "Adaptation", effect: "Each time Mahoraga is hit by an attack type (melee, projectile, special, domain) it builds permanent resistance to that type up to a cap — the longer the fight, the harder it is to hurt." },
    basics: [
      { name: "Heavy Swipe",   input: "Light",                   desc: "slow but powerful poke" },
      { name: "Crushing Blow", input: "Heavy",                   desc: "massive knockback strike" },
      { name: "Launcher",      input: "Up-Attack",               desc: "launcher — starts air combos" },
      { name: "Air Strike",    input: "Air (jump + Light)",      desc: "aerial blow" },
      { name: "Dive Slam",     input: "Down-Air (jump + Heavy)", desc: "heavy downward spike" }
    ],
    specials: [
      { name: "Wheel Rotation", input: "Special",      cost: 0, desc: "spins the divine eight-handled wheel for a wide devastating slash; scales with adaptation stacks" },
      { name: "Divine Guard",   input: "Down + Special", cost: 0, desc: "braces and instantly raises adaptation against the next incoming attack type" }
    ],
    mobility: { name: "Wheel Lunge", input: "Forward + Special", cost: 0, desc: "rolls forward behind the divine wheel, plowing through and repositioning" },
    ultimate: { name: "Eight-Handled Wheel", input: "Ultimate (no meter needed)", cost: 0, desc: "locks in maximum adaptation and makes resistance gains permanent for the rest of the match" },
    combos: [
      { name: "Adapt & Punish", sequence: "Divine Guard, Wheel Rotation",        desc: "tank a hit, then swing the wheel" },
      { name: "Plow Through",   sequence: "Wheel Lunge, Heavy, Wheel Rotation",  desc: "close in and crush" }
    ]
  },

  // ── ORIGINAL ─────────────────────────────────────────────────
  omololu: {
    type: "Ramp Bruiser / Adaptive", energy: "Stamina", difficulty: "Medium",
    summary: "A patient analyst who reads the opponent's patterns over the match, ramping his damage with every exchange until his weak-point strikes become lethal.",
    passive: { name: "Combat Analysis", effect: "Every 300 frames of combat grants a small permanent attack boost — the longer Omololu fights, the more dangerous he becomes." },
    basics: [
      { name: "Jab",        input: "Light",                    desc: "measured poke" },
      { name: "Heavy Blow", input: "Heavy",                    desc: "knockback strike" },
      { name: "Launcher",   input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike", input: "Air (jump + Light)",       desc: "aerial poke" },
      { name: "Dive",       input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Analysis Strike", input: "Special",       cost: 30, desc: "reads the opponent's pattern and strikes a weak point; bonus damage scales with combo count" },
      { name: "Counter Read",    input: "Down + Special", cost: 20, desc: "a brief defensive read that punishes the enemy's next attack" }
    ],
    mobility: { name: "Predictive Step", input: "Forward + Special", cost: 10, desc: "an analysis-driven dash that closes toward the opponent's anticipated position" },
    ultimate: { name: "Full Analysis", input: "Ultimate (full meter)", cost: 100, desc: "opens an 8-second window where every landed hit stacks his damage multiplier" },
    combos: [
      { name: "Read & Strike", sequence: "Light, Light, Heavy, Analysis Strike", desc: "build combo count, then cash the weak-point hit" },
      { name: "Snowball",      sequence: "Full Analysis, Light, Light, Heavy, Analysis Strike", desc: "stack the multiplier under ultimate" }
    ]
  },

  // ── DEMON SLAYER ─────────────────────────────────────────────
  tanjiro: {
    type: "Water/Flame Breathing Rushdown", energy: "None (pure physical)", difficulty: "Medium",
    summary: "A versatile breathing-style duelist who blends flowing Water forms with explosive Flame bursts to control range and tempo.",
    passive: { name: "Sun Breathing Echo", effect: "Landing three consecutive hits briefly speeds up his next slash, rewarding clean combo strings." },
    basics: [
      { name: "Blade Combo", input: "Light",                    desc: "fast multi-slash poke" },
      { name: "Heavy Slash", input: "Heavy",                    desc: "strong knockback cut" },
      { name: "Rising Cut",  input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Slash",   input: "Air (jump + Light)",       desc: "quick aerial slash" },
      { name: "Dive Cut",    input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",        input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Water Surface Slasher",  input: "Special",           cost: 0, desc: "sweeping horizontal water blade with long reach" },
      { name: "Dance of the Fireflies", input: "Down + Special",    cost: 0, desc: "rapid multi-slash flurry that shreds guard" },
      { name: "Whirlpool Form",         input: "Forward + Special", cost: 0, desc: "spinning Water Breathing arc that draws and slashes a closing foe" }
    ],
    mobility: { name: "Constant Flux", input: "Forward + Special", cost: 0, desc: "flowing breathing-form dash that glides past attacks into range" },
    ultimate: { name: "Hinokami Kagura", input: "Ultimate (full meter)", cost: 0, desc: "ignites Sun Breathing for 1.6x damage and 1.3x speed at the cost of slightly lowered defense" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special",         desc: "core ground string ending in Water Surface Slasher" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",            desc: "launch into a two-hit aerial" },
      { name: "Flame Finisher", sequence: "Heavy, Down + Special, Ultimate",      desc: "stagger into flurry, then ignite Hinokami Kagura" }
    ]
  },
  nezuko: {
    type: "Demon Blood Brawler", energy: "None (pure physical)", difficulty: "Medium",
    summary: "A blisteringly fast demon who ramps up through aggression, weaving kicks and explosive blood-art bursts that scale as the fight drags on.",
    passive: { name: "Regenerative Blood", effect: "Slowly recovers a trickle of health while not taking damage, rewarding hit-and-run pressure." },
    basics: [
      { name: "Claw Combo",  input: "Light",                    desc: "fast slashing kicks" },
      { name: "Heavy Kick",  input: "Heavy",                    desc: "powerful knockback strike" },
      { name: "Rising Kick", input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Claw",    input: "Air (jump + Light)",       desc: "quick aerial swipe" },
      { name: "Dive Stomp",  input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",        input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Blood Demon Art", input: "Special",           cost: 0, desc: "explosive burst of demonic blood-fire that erupts on contact" },
      { name: "Exploding Blood", input: "Down + Special",    cost: 0, desc: "ignites pooled blood at her feet for a close-range detonation" },
      { name: "Demon Lunge",     input: "Forward + Special",  cost: 0, desc: "pouncing forward claw rush that closes distance and slashes" }
    ],
    mobility: { name: "Demon Step", input: "Forward + Special", cost: 0, desc: "explosive low-stance dash powered by demonic speed" },
    ultimate: { name: "Full Demon Transformation", input: "Ultimate (full meter)", cost: 0, desc: "unleashes her demon form for 1.7x damage, 1.4x speed, and active regeneration" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "kick string into Blood Demon Art burst" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",     desc: "rising kick into aerial swipes" },
      { name: "Demon Rush",     sequence: "Forward + Special, Light, Down + Special", desc: "lunge in, poke, then detonate exploding blood" }
    ]
  },
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
      { name: "Bread & Butter", sequence: "Light, Heavy, Special",         desc: "poke into a Thunderclap finisher" },
      { name: "Flash Punish",   sequence: "Forward + Special, Special",    desc: "rice-spirit approach into the Thunderclap kill" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",     desc: "rising bolt into aerial slashes" }
    ]
  },
  inosuke: {
    type: "Beast Breathing Berserker", energy: "None (pure physical)", difficulty: "Medium",
    summary: "A relentless dual-blade brawler who buries opponents under wild, unpredictable spinning slashes and never lets pressure drop.",
    passive: { name: "Spatial Awareness", effect: "Senses incoming attacks, granting a brief edge to his dash recovery so he can re-engage faster than most." },
    basics: [
      { name: "Twin Slash", input: "Light",                    desc: "fast serrated dual cuts" },
      { name: "Heavy Chop", input: "Heavy",                    desc: "wild knockback swing" },
      { name: "Rising Gut", input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Slash",  input: "Air (jump + Light)",       desc: "strong aerial swipe" },
      { name: "Dive Chop",  input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",       input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Dual Sword Frenzy", input: "Special",           cost: 0, desc: "spinning multi-slash whirlwind that mauls anything in front" },
      { name: "Piercing Fang",     input: "Down + Special",    cost: 0, desc: "low erratic stab that ducks under high attacks and gores the legs" },
      { name: "Beast Pounce",      input: "Forward + Special", cost: 0, desc: "feral leaping double-slash that crashes onto a retreating foe" }
    ],
    mobility: { name: "Beast Rush", input: "Forward + Special", cost: 0, desc: "low animalistic charging dash that barrels through space" },
    ultimate: { name: "Beast Breathing Dragon Head", input: "Ultimate (full meter)", cost: 0, desc: "explodes into a frenzied speed-and-attack surge with wild, unpredictable combo strings" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special",        desc: "twin slashes into the Frenzy whirlwind" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",           desc: "gut launch into aerial swipes" },
      { name: "Beast Mixup",    sequence: "Forward + Special, Down + Special",   desc: "pounce in, then low fang to catch blockers" }
    ]
  },
  rengoku: {
    type: "Flame Breathing Pressure Pillar", energy: "None (pure physical)", difficulty: "Easy",
    summary: "A blazing front-line Hashira who applies constant fiery pressure with hard-hitting single slashes and overwhelming forward momentum.",
    passive: { name: "Burning Resolve", effect: "His flame-wreathed blade adds a small lingering burn to special hits, chipping foes who linger in range." },
    basics: [
      { name: "Flame Combo",  input: "Light",                    desc: "swift burning slashes" },
      { name: "Heavy Cut",    input: "Heavy",                    desc: "heavy fiery knockback cut" },
      { name: "Rising Flame", input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Slash",    input: "Air (jump + Light)",       desc: "blazing aerial cut" },
      { name: "Dive Cut",     input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",         input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Flame Breathing First Form", input: "Special",           cost: 0, desc: "Unknowing Fire — a single committed fiery slash with huge reach" },
      { name: "Rising Scorching Sun",       input: "Down + Special",    cost: 0, desc: "upward flame arc that torches and pops up close opponents" },
      { name: "Flame Tiger",                input: "Forward + Special", cost: 0, desc: "ninth form — a roaring beast of flame surges forward as a charging slash" }
    ],
    mobility: { name: "Rengoku Dash", input: "Forward + Special", cost: 0, desc: "flame-trailing advancing step that closes ground into a slash" },
    ultimate: { name: "Flame Pillar's Might", input: "Ultimate (full meter)", cost: 0, desc: "enhances attack and speed and adds fiery AoE strikes that scorch on impact" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special",         desc: "slashes into Unknowing Fire" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",            desc: "rising flame into aerial cuts" },
      { name: "Tiger Charge",   sequence: "Forward + Special, Heavy, Ultimate",   desc: "Flame Tiger in, heavy confirm, ignite Pillar's Might" }
    ]
  },
  akaza: {
    type: "Destructive Death Demon", energy: "None (pure physical)", difficulty: "Hard",
    summary: "An Upper Moon martial-artist demon who ramps into terrifying speed and power, reading openings to land brutal compass-needle strikes.",
    passive: { name: "Combat Reader", effect: "Each landed special slightly sharpens his next strike's startup, scaling his offense the longer he stays aggressive." },
    basics: [
      { name: "Fist Combo",  input: "Light",                    desc: "fast martial strikes" },
      { name: "Heavy Blow",  input: "Heavy",                    desc: "devastating knockback strike" },
      { name: "Rising Palm", input: "Up-Attack",                desc: "launcher — starts air combos" },
      { name: "Air Strike",  input: "Air (jump + Light)",       desc: "swift aerial blow" },
      { name: "Dive Smash",  input: "Down-Air (jump + Heavy)",  desc: "downward spike" },
      { name: "Grab",        input: "Grab",                     desc: "throw" }
    ],
    specials: [
      { name: "Destructive Strike", input: "Special",           cost: 0, desc: "Destructive Death technique — a concussive shockwave punch" },
      { name: "Annihilation Type",  input: "Down + Special",    cost: 0, desc: "ground-pounding burst that erupts compass-needle shockwaves at his feet" },
      { name: "Disorder",           input: "Forward + Special", cost: 0, desc: "rushing flurry of accelerating blows that walks the foe into the corner" }
    ],
    mobility: { name: "Destructive Step", input: "Forward + Special", cost: 0, desc: "explosive martial-arts dash that erases distance to set up a strike" },
    ultimate: { name: "Upper Moon Three Form", input: "Ultimate (full meter)", cost: 0, desc: "fully unleashes his Upper Moon power for surging damage, speed, and regeneration" },
    combos: [
      { name: "Bread & Butter", sequence: "Light, Light, Heavy, Special",         desc: "strikes into the Destructive shockwave" },
      { name: "Air Juggle",     sequence: "Up-Attack, Jump, Air, Air",            desc: "palm launch into aerial blows" },
      { name: "Pressure Loop",  sequence: "Forward + Special, Disorder, Down + Special", desc: "step in, flurry, then erupt Annihilation Type" }
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
    combos: [{ name: "Bread & Butter", sequence: "Light, Light, Heavy, Special", desc: "core string" }]
  }
}
