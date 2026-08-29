// aiTemplates.js
// PER-CHARACTER CPU AI — behavior templates (Part 2).
//
// Realistic scope: NOT 99 bespoke AIs. Instead a small set of behavior TEMPLATES, each a real
// set of tuning deltas layered on top of the existing difficulty profile (ai.js AI_DIFFICULTIES),
// plus a data-grounded mapping of every roster character to whichever template fits their
// established personality/archetype.
//
// SEPARATION OF CONCERNS (design intent):
//   • A TEMPLATE decides *how* a character fights (spacing, aggression, what tools it favours).
//   • DIFFICULTY (Easy/Adaptive/Impossible) still decides *how well* — reaction speed, roll quality.
// A template is applied by scaling the difficulty profile's fields (multipliers) and shifting the
// spacing it wants to hold (desiredRange). Because choosePlan() keys its approach / zone / retreat /
// attack branches off desiredRange AND those chances, changing them changes which BRANCH fires — i.e.
// genuinely different decision-making, not just different damage numbers.
//
// The mapping is derived two ways (see templateForCharacter):
//   1. CHARACTER_TEMPLATE_OVERRIDES — hand-set for characters with a strong, canonical fighting
//      personality (Netero prays for a worthy fight → counter; Jason never tires → bruiser; Hisoka
//      fights for the feeling → trickster; Toji is pure technique → counter; …).
//   2. Everyone else falls back to deriveTemplate(), which reads the character's own `archetypes`
//      /`primary` fields from characters.js. No guessing — it's the data the roster already ships.

// ── THE SIX TEMPLATES ────────────────────────────────────────────────────────
// `mult`  — per-field multiplier on the difficulty profile (probability fields clamped to [0,1]).
// `range` — additive shift (px) to desiredRange (negative = wants to be closer, positive = keep-away).
// `suboptimal` — trickster only: chance/decision to deliberately pick a non-optimal plan (feints).
// `neverRetreat` — bruiser only: the "doesn't respect spacing" flag; suppresses the retreat plan.
export const AI_TEMPLATES = {
  // Close the gap and stay on top of them. Attacks often, rarely zones or backs off.
  rushdown: {
    name: "Rushdown",
    desc: "Aggressive pressure — closes distance and keeps attacking.",
    range: -35,
    mult: { attackChance: 1.25, heavyChance: 1.15, comboChance: 1.20, stringChance: 1.20,
            retreatChance: 0.40, zoningChance: 0.50, blockChance: 0.85, aggression: 1.25, jumpChance: 1.20 }
  },
  // Hold space, throw ranged tools, drift back when crowded.
  zoner: {
    name: "Zoner",
    desc: "Keep-away — holds mid range and throws ranged tools.",
    range: +90,
    mult: { zoningChance: 1.60, specialChance: 1.40, retreatChance: 1.50, attackChance: 0.80,
            blockChance: 1.10, antiAirChance: 1.20, aggression: 0.75, jumpChance: 0.85 }
  },
  // Patient, technical: guards, reads patterns, punishes whiffs. Low wasted motion.
  counter: {
    name: "Counter-fighter",
    desc: "Patient technician — guards and punishes overextension.",
    range: +25,
    mult: { blockChance: 1.35, whiffPunish: 1.50, adaptStrength: 1.20, attackChance: 0.90,
            heavyChance: 1.10, stringChance: 0.90, zoningChance: 0.90, retreatChance: 1.10, aggression: 0.85 }
  },
  // Relentless, unstoppable — constant forward pressure, low variety, ignores spacing.
  bruiser: {
    name: "Bruiser",
    desc: "Relentless — walks through spacing, never backs off.",
    range: -45,
    neverRetreat: true,
    mult: { attackChance: 1.20, heavyChance: 1.30, comboChance: 1.15, blockChance: 0.55,
            retreatChance: 0.15, zoningChance: 0.40, whiffPunish: 0.80, aggression: 1.35, antiAirChance: 0.90 }
  },
  // Unpredictable — high variance, jumpy, occasionally plays around rather than optimally.
  trickster: {
    name: "Trickster",
    desc: "Unpredictable — mixes it up and feints, not always optimally.",
    range: +10,
    suboptimal: 0.18,
    mult: { jumpChance: 1.80, specialChance: 1.20, retreatChance: 1.20, attackChance: 1.00,
            blockChance: 0.90, zoningChance: 1.10, aggression: 1.00 }
  },
  // Defensive — turtles behind guard, waits, punishes. Rarely opens up.
  turtle: {
    name: "Turtle",
    desc: "Defensive — sits behind guard and waits for a mistake.",
    range: +55,
    mult: { blockChance: 1.50, retreatChance: 1.40, whiffPunish: 1.50, attackChance: 0.65,
            heavyChance: 0.80, stringChance: 0.80, zoningChance: 1.20, aggression: 0.60, jumpChance: 0.70 }
  }
}

export const TEMPLATE_KEYS = Object.keys(AI_TEMPLATES)

// ── PERSONALITY-GROUNDED OVERRIDES ───────────────────────────────────────────
// Hand-set where a character has a strong, established fighting personality that a raw archetype tag
// wouldn't capture. Each is justified by the character's own canon (kept short here; see the report).
export const CHARACTER_TEMPLATE_OVERRIDES = {
  // — patient technicians / counter-punchers —
  netero:      "counter",   // prays before every fight for a worthy one; punishes overextension
  toji:        "counter",   // pure technique and timing, minimal wasted motion
  deathstroke: "counter",   // tactician — reads and punishes
  batman:      "counter",   // prep + precise counters
  dark_knight: "counter",   // same read-and-punish core
  hiruzen:     "counter",   // the Professor — technical, adaptive
  itachi:      "counter",   // controlled, genjutsu-timing reads
  chrollo:     "trickster", // steals/adapts — plays around the opponent
  // — relentless bruisers —
  jason:       "bruiser",   // doesn't tire, doesn't negotiate — constant forward pressure
  saitama:     "bruiser",   // utterly unbothered, walks straight in
  sukuna:      "bruiser",   // arrogant overwhelming offense
  alt_sukuna:  "bruiser",
  zaraki:      "bruiser",   // lives to brawl, ignores defense
  inosuke:     "bruiser",   // pure reckless aggression
  beerus:      "bruiser",   // careless god-tier pressure
  rengoku:     "bruiser",
  yamamoto:    "bruiser",   // overwhelming flame powerhouse
  // — unpredictable tricksters —
  hisoka:      "trickster", // fights for the feeling, deliberately suboptimal
  ghostface:   "trickster", // stalker mind-games, feints
  ghostface_billy: "trickster",
  tobi:        "trickster", // goofy misdirection persona
  rick:        "trickster", // chaotic gadget zoner with a mean streak
  saiki:       "turtle",    // just wants to be left alone — avoids, reacts minimally
  // — defensive turtles —
  l_ryuuzaki:  "turtle",    // L never commits directly; passive, reactive
  onoki:       "turtle",    // old, defensive, floats and chips
  // — zoners / keep-away —
  gojo:        "zoner",     // Infinity + ranged control from space
  pain:        "zoner",     // Six Paths, ranged tactics
  six_paths_pain: "zoner",
  mayuri:      "zoner",     // traps and ranged control
  light:       "zoner",     // mastermind, plays from range
  brainiac:    "zoner",
  green_lantern: "zoner",
  handler:     "zoner",     // summoner, controls space
  iron_man:    "zoner", iron_man_2: "zoner", iron_man_3: "zoner",
  frieza:      "zoner",     // sadistic ranged control
  madara:      "zoner",     // Susanoo dominance from range
  // — rushdown (speed / aggression identities) —
  flash:       "rushdown",
  killua:      "rushdown",
  zenitsu:     "rushdown",
  naoya:       "rushdown",  // arrogant speed
  spiderman:   "rushdown",
  miles:       "rushdown",
  vegito:      "rushdown",
  yuji:        "rushdown"
}

const _set = (csv) => new Set(String(csv || "").split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean))

// Derive a template from the character's own archetype data (characters.js `archetypes`/`primary`).
// First match wins; ordered so the strongest identity signal decides.
export function deriveTemplate(archetypes, primary) {
  const a = archetypes instanceof Set ? archetypes : _set(Array.isArray(archetypes) ? archetypes.join(",") : archetypes)
  const p = String(primary || "").toLowerCase()
  const has = (...tags) => tags.some(t => a.has(t))
  const first = (Array.isArray(archetypes) ? archetypes[0] : [...a][0]) || ""

  if (has("trickster", "tricky", "panic"))                       return "trickster"
  if (has("grappler", "heavy", "powerhouse"))                    return "bruiser"
  if (has("bruiser") && !has("zoner"))                           return "bruiser"
  // technical + zoner but NOT a rusher → a defensive controller (turtle)
  if ((has("technician", "technical") && has("zoner")) && !has("rushdown", "speed")) return "turtle"
  if (p === "ranged" || String(first).toLowerCase() === "zoner" ||
      (has("zoner") && has("tactics") && !has("rushdown")))      return "zoner"
  if (has("technical", "technician", "tactics", "analysis", "assassin", "acrobat", "curse", "absorb"))
                                                                 return "counter"
  if (has("speed", "striker", "rushdown", "sword", "spear", "flight")) return "rushdown"
  if (has("zoner"))                                              return "zoner"
  return "rushdown"   // melee / transformations default: aggressive
}

// Resolve the template key for a character: explicit override wins, else derive from its data.
export function templateForCharacter(rosterKey, charData) {
  const key = String(rosterKey || charData?.rosterKey || "").toLowerCase()
  if (CHARACTER_TEMPLATE_OVERRIDES[key]) return CHARACTER_TEMPLATE_OVERRIDES[key]
  if (charData) return deriveTemplate(charData.archetypes, charData.primary)
  return "rushdown"
}

const _clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v
// Fields that are probabilities (0..1) and must stay clamped after a multiply.
const PROB_FIELDS = ["attackChance", "heavyChance", "specialChance", "ultimateChance", "jumpChance",
  "retreatChance", "comboChance", "antiAirChance", "blockChance", "zoningChance", "adaptStrength",
  "stringChance", "whiffPunish"]

// Produce a NEW profile object = base difficulty profile with a template's deltas applied.
// NEVER mutates `baseProfile` (it's a shared AI_DIFFICULTIES reference). Returns the clone.
export function applyTemplateToProfile(baseProfile, templateKey) {
  const tmpl = AI_TEMPLATES[templateKey] || AI_TEMPLATES.rushdown
  const out = { ...baseProfile }
  const mult = tmpl.mult || {}
  for (const f of PROB_FIELDS) {
    if (typeof out[f] === "number") out[f] = _clamp01(out[f] * (mult[f] ?? 1))
  }
  // aggression is a 0..~1.5 bias (not a strict probability) — clamp a little wider.
  if (typeof out.aggression === "number") out.aggression = Math.max(0, Math.min(1.6, out.aggression * (mult.aggression ?? 1)))
  // desiredRange shifts the spacing the AI holds → drives which choosePlan branch fires.
  if (typeof out.desiredRange === "number") out.desiredRange = Math.max(40, Math.min(480, out.desiredRange + (tmpl.range || 0)))
  // reactionFrames is DIFFICULTY, not personality — left untouched on purpose.
  out._templateKey     = templateKey
  out._templateName    = tmpl.name
  out._suboptimalChance = tmpl.suboptimal || 0
  out._neverRetreat    = !!tmpl.neverRetreat
  return out
}

// Build the full rosterKey → template mapping (for reporting / tests / spot-checks).
export function fullMapping(charactersMap) {
  const out = {}
  for (const [key, ch] of Object.entries(charactersMap || {})) {
    out[key] = templateForCharacter(key, ch)
  }
  return out
}
