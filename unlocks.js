// unlocks.js
// ──────────────────────────────────────────────────────────────────────────
// CHARACTER UNLOCKS (Stage 21). ~Half the roster starts unlocked; the rest are
// EARNED via one of four condition types. DISTINCT from `isPlayable` (Stage 5B):
// isPlayable means "built enough to ship" (art-less placeholders are false and
// hidden entirely); unlockedBy means "earned" — locked characters still SHOW on
// the select screen as silhouettes with their condition, they just can't be picked.
//
// The canonical condition map lives here (like arcade.js's ARCADE_RIVALS) so adding
// a character doesn't force a characters.js edit; a `characters.js` `unlockedBy`
// field OVERRIDES the map (unlockConditionFor checks it first, incl. an explicit
// null = "start unlocked"). Dev/beta codes bypass everything.
//
// Condition shapes:
//   null                         → unlocked from the start
//   { type:"level",  value:8 }   → reach account level 8
//   { type:"arcade", value:"gojo" } → clear Arcade with that character
//   { type:"tower",  value:"tier3" } → clear that Tower tier (or any higher)
//   { type:"boss" }              → beat the Arcade boss (i.e. clear Arcade once)
// ──────────────────────────────────────────────────────────────────────────

// Owner-approved 22-locked split (the other 22 playable characters are unlocked by
// default — they simply have no entry here). Art-less placeholders are excluded by
// isPlayable and never appear on select at all.
export const UNLOCK_CONDITIONS = {
  // ── Level milestones (8) ──
  inosuke:              { type: "level", value: 3 },
  miwa:                 { type: "level", value: 4 },
  shinobu:              { type: "level", value: 5 },
  gold_samurai_ranger:  { type: "level", value: 6 },
  green_samurai_ranger: { type: "level", value: 7 },
  tobi:                 { type: "level", value: 8 },
  nezuko:               { type: "level", value: 9 },
  batman:               { type: "level", value: 10 },
  // ── Arcade clear as a related fighter (6) — all named fighters start unlocked ──
  sukuna:  { type: "arcade", value: "gojo" },
  itachi:  { type: "arcade", value: "sasuke" },
  madara:  { type: "arcade", value: "naruto" },
  hisoka:  { type: "arcade", value: "gon" },
  chrollo: { type: "arcade", value: "killua" },
  // ── Tower tier clears (4) ──
  omega_ranger: { type: "tower", value: "tier2" },
  tobirama:     { type: "tower", value: "tier2" },
  goku_black:   { type: "tower", value: "tier3" },
  netero:       { type: "tower", value: "tier3" },
  // ── Beat the Arcade boss (3) — any Arcade clear ──
  beerus:        { type: "boss" },
  obito:         { type: "boss" },
  zaraki_shikai: { type: "boss" }
}

// Tower tiers in ascending order — a "tier3" gate is satisfied by clearing tier3 OR any higher tier.
export const TOWER_TIER_ORDER = ["tier1", "tier2", "tier3", "tier4", "tier5"]

// The six "learn the game" starter fighters — always unlocked, never gated (documented for tooling).
export const STARTER_KEYS = ["goku", "gojo", "naruto", "ichigo", "killua", "superman"]

// The condition for a character: characters.js `unlockedBy` override wins (incl. explicit null),
// else the map, else null (unlocked). `undefined` from the override means "not specified → fall through".
export function unlockConditionFor(key, charactersMap) {
  const override = charactersMap?.[key]?.unlockedBy
  if (override !== undefined) return override
  return UNLOCK_CONDITIONS[key] ?? null
}

// Is a character unlocked, given the player context?
//   ctx = { level, dev, beta, arcadeCleared:{key:true}, towerTiers:{tierId:true}, arcadeAny:boolean }
export function isCharacterUnlocked(key, ctx = {}, charactersMap) {
  if (ctx.dev || ctx.beta) return true                       // codes bypass everything
  const cond = unlockConditionFor(key, charactersMap)
  if (!cond) return true
  switch (cond.type) {
    case "level":  return (ctx.level || 1) >= cond.value
    case "arcade": return !!ctx.arcadeCleared?.[cond.value]
    case "tower":  return _towerTierMet(ctx.towerTiers, cond.value)
    case "boss":   return !!ctx.arcadeAny
    default:       return true
  }
}
function _towerTierMet(clearedMap, requiredTier) {
  if (!clearedMap) return false
  const reqIdx = TOWER_TIER_ORDER.indexOf(requiredTier)
  if (reqIdx < 0) return false
  return TOWER_TIER_ORDER.some((t, i) => i >= reqIdx && clearedMap[t])   // this tier or any higher
}

// Human-readable requirement for the silhouette card.
export function unlockLabel(cond, charactersMap) {
  if (!cond) return null
  switch (cond.type) {
    case "level":  return `Reach Level ${cond.value}`
    case "arcade": return `Clear Arcade as ${charactersMap?.[cond.value]?.name || cond.value}`
    case "tower":  return `Clear Tower ${String(cond.value).replace("tier", "Tier ")}`
    case "boss":   return "Beat the Arcade Boss"
    default:       return "Locked"
  }
}

// Characters unlocked by crossing FROM one level TO another (for the level-up notification —
// mirrors progression.unlocksBetween for features). Only level-type gates apply here.
export function charactersUnlockedBetween(fromLevel, toLevel, charactersMap) {
  const out = []
  for (const [key, cond] of Object.entries(UNLOCK_CONDITIONS)) {
    // characters.js may override; respect it.
    const c = unlockConditionFor(key, charactersMap)
    if (c && c.type === "level" && c.value > fromLevel && c.value <= toLevel) {
      out.push({ key, name: charactersMap?.[key]?.name || key, level: c.value })
    }
  }
  return out.sort((a, b) => a.level - b.level)
}

// The full unlocked/locked partition for a given context (tests + tooling).
export function partitionRoster(keys, ctx, charactersMap) {
  const unlocked = [], locked = []
  for (const k of keys) (isCharacterUnlocked(k, ctx, charactersMap) ? unlocked : locked).push(k)
  return { unlocked, locked }
}
