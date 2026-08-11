// arcade.js
// ──────────────────────────────────────────────────────────────────────────
// ARCADE MODE — a FIXED 7-fight ladder with a scripted rival (fight 5), a boss
// (fight 7), a per-character ending on clear, and continues. It reuses the Tower
// engine wholesale (difficulty scaling, random opponent+stage per fight, health
// carry-over, the victory→continue wiring); the arcade-specific pieces live here:
//   • the ladder shape (length, which fight is the rival / boss),
//   • rival resolution (per-character, overridable in characters.js),
//   • the boss designation (Stage 20 will add the bossProfile buffs),
//   • the run difficulty policy (selectable + fixed, boss bumped to impossible),
//   • the two-line pre-rival dialogue (with a generic fallback).
// Live game state (matchConfig, p1/p2, startMatch…) stays in game.js, exactly as
// Tower does — this module holds the DATA + pure helpers game.js drives.
// ──────────────────────────────────────────────────────────────────────────

export const ARCADE_FIGHTS      = 7    // fixed ladder length (owner decision, Wave 3)
export const ARCADE_RIVAL_FIGHT  = 5   // 1-indexed: the scripted rival fight
export const ARCADE_BOSS_FIGHT   = 7   // 1-indexed: the final boss fight
export const ARCADE_BOSS_KEY     = "obito"   // Stage 20 boss #1 (bossProfile added later)
export const ARCADE_BOSS_ALT     = "gojo"    // boss stand-in when the player IS the boss

// The live run state (mirrors towerState; game.js mutates it). fight is 0-indexed.
export const arcadeState = {
  active: false, rosterKey: null, difficulty: "adaptive",
  fight: 0, continuesUsed: 0, cleared: false, carryPct: 1,
  _lastWon: false, _applyCarry: false, endingPending: false
}

// Which role does 1-indexed fight N play?
export function arcadeFightRole(fightNum) {
  if (fightNum >= ARCADE_BOSS_FIGHT)  return "boss"
  if (fightNum === ARCADE_RIVAL_FIGHT) return "rival"
  return "normal"
}

// The final-boss opponent for a given player (avoids a self-mirror on the boss char).
export function arcadeBossKey(playerKey) {
  return playerKey === ARCADE_BOSS_KEY ? ARCADE_BOSS_ALT : ARCADE_BOSS_KEY
}

// Difficulty policy: the run uses ONE selectable difficulty for every fight (not escalating),
// EXCEPT the boss, which is always impossible (its Stage-20 bossProfile will add more on top).
export function arcadeDifficultyForFight(runDifficulty, fightNum) {
  if (arcadeFightRole(fightNum) === "boss") return "impossible"
  return runDifficulty || "adaptive"
}

// ── RIVALS ───────────────────────────────────────────────────────────────────
// Canonical per-character rival map. characters.js may override any of these via an
// `arcadeRival` field (arcadeRivalKey checks that FIRST) — this table is the default so a
// new character still gets a sensible rival without a characters.js edit. Same-universe
// where a playable one exists; a thematic cross-universe pick where it doesn't (art-less
// members like Piccolo/Frieza/Morty aren't playable, so several universes have no in-house
// rival). The rival is always a playable, sprite-backed opponent.
export const ARCADE_RIVALS = {
  // Dragon Ball
  goku: "vegeta", vegeta: "goku", goku_black: "goku", beerus: "goku",
  // Jujutsu Kaisen
  gojo: "sukuna", sukuna: "gojo", megumi: "sukuna", maki: "gojo", yuji: "sukuna", miwa: "maki",
  // Naruto
  naruto: "sasuke", sasuke: "naruto", itachi: "sasuke", tobirama: "madara", minato: "obito",
  madara: "naruto", obito: "minato", tobi: "naruto",
  // Demon Slayer
  zenitsu: "inosuke", rengoku: "shinobu", shinobu: "rengoku", inosuke: "zenitsu", nezuko: "shinobu",
  // Rick and Morty (only Rick playable) → deadpan-genius foil
  rick: "saiki",
  // Ben 10 (only Ben playable) → transforming-hero foil
  ben10: "omega_ranger",
  // Invincible
  omniman: "superman",
  // Power Rangers
  omega_ranger: "samurai_red_ranger", samurai_red_ranger: "gold_samurai_ranger",
  gold_samurai_ranger: "samurai_red_ranger", green_samurai_ranger: "samurai_red_ranger",
  // Hunter x Hunter
  netero: "chrollo", killua: "gon", gon: "hisoka", hisoka: "gon", chrollo: "hisoka",
  // Saiki K → mutual with Rick
  saiki: "rick",
  // DC
  flash: "killua", batman: "chrollo", superman: "omniman",
  // Horror
  ghostface: "hisoka",
  // Bleach
  ichigo: "zaraki", zaraki: "ichigo", zaraki_shikai: "ichigo"
}

// Resolve a player's rival: characters.js override first, then the map, then null (→ game.js
// falls back to a normal random opponent for fight 5 so the ladder never breaks).
export function arcadeRivalKey(playerKey, charactersMap) {
  const override = charactersMap?.[playerKey]?.arcadeRival
  if (override && charactersMap[override] && override !== playerKey) return override
  const mapped = ARCADE_RIVALS[playerKey]
  if (mapped && charactersMap?.[mapped] && mapped !== playerKey) return mapped
  return null
}

// ── PRE-RIVAL DIALOGUE ─────────────────────────────────────────────────────────
// characters.js may define arcadeRivalLines: { pre: [playerLine, rivalLine], win: "…" }.
// Where absent, a generic-but-characterful exchange is generated from the names. `pre` is the
// two-line trash-talk before the fight; `win` is the player's line after beating the rival.
const GENERIC_RIVAL_PRE = (playerName, rivalName) => [
  `${playerName}: So it comes down to you and me, ${rivalName}.`,
  `${rivalName}: Don't expect me to hold back. Show me everything you've got.`
]
const GENERIC_RIVAL_WIN = (rivalName) => `Not bad, ${rivalName}. But not enough.`

export function arcadeRivalDialogue(playerKey, rivalKey, charactersMap) {
  const pc = charactersMap?.[playerKey], rc = charactersMap?.[rivalKey]
  const playerName = pc?.name || playerKey, rivalName = rc?.name || rivalKey
  const lines = pc?.arcadeRivalLines
  return {
    pre: Array.isArray(lines?.pre) && lines.pre.length >= 2 ? lines.pre.slice(0, 2) : GENERIC_RIVAL_PRE(playerName, rivalName),
    win: typeof lines?.win === "string" && lines.win ? lines.win : GENERIC_RIVAL_WIN(rivalName)
  }
}

// XP awards (Stage 19D). Per-fight scales with position; a full clear pays a big bonus, with an
// extra reward for a no-continue run. Kept here so the payout curve is one place.
export const ARCADE_XP = {
  perFight: (fightNum) => 80 + (fightNum - 1) * 25,   // fight 1 → 80 … fight 7 → 230
  clearBonus: 600,
  noContinueBonus: 400
}
