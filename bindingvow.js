// bindingvow.js
// JJK Binding Vows — Gojo, Sukuna ONLY.
// (Geto / Yuji / Yuta / Maki are NOT in this game — no vows for them.)
//
// A vow is committed via a short RAW directional sequence (U/D/L/R from
// directionHistory). One vow per fighter per match; permanent once made. On
// activation its `effects` are applied through systems that already exist:
//   - disabledSpecials → abilities.js isSpecialDisabled() (blocks the named moves)
//   - infiniteEnergy   → abilities.js spendEnergy/canSpendEnergy/regenEnergy (no clamp/cost)
//   - damageMul        → combat.js offenseMult = max(damageMultiplier, attackMultiplier)
//   - speedMul         → physics rawSpeed = baseSpeed || speed (both scaled)
//   - noDash / dashInvuln        → physics.js dash gate / i-frames
//   - maxSummons / summon*Mul    → summons.js spawnSummon()

export const activeVows = new Map()

// ======================================================
// Vow definitions (the four real JJK characters)
// ======================================================
export const bindingVows = {
  // ---------- GOJO ----------
  limitlessSacrifice: {
    name: "Limitless Sacrifice", character: "gojo", sequence: ["U", "U", "D"],
    // Give up Infinity + all cursed-technique specials + ultimate; in exchange,
    // infinite cursed energy. Gojo falls back to melee + teleport.
    effects: {
      disabledSpecials: ["infinity", "blue", "red", "hollowPurple", "ultimate"],
      infiniteEnergy: true
    }
  },
  sixEyesFocus: {
    name: "Six Eyes Focus", character: "gojo", sequence: ["D", "D", "U"],
    // No dash + capped speed; all attacks +30%.
    effects: { noDash: true, speedMul: 0.85, damageMul: 1.3 }
  },

  // ---------- SUKUNA ----------
  trueKing: {
    name: "True King", character: "sukuna", sequence: ["L", "L", "R"],
    // Disable Flame Arrow; Dismantle & Cleave +50% (applied as a global damage
    // multiplier — Sukuna's whole kit is melee/slash).
    effects: { disabledSpecials: ["flameArrow"], damageMul: 1.5 }
  },
  flameFocus: {
    name: "Flame Focus", character: "sukuna", sequence: ["U", "U", "L"],
    // Disable Dismantle; Flame Arrow +50%. NOTE: a "Flame Arrow" move is not yet
    // implemented in abilities.js, so flameArrowMul is wired but currently inert.
    effects: { disabledSpecials: ["dismantle"], flameArrowMul: 1.5 }
  },

}

// ======================================================
// Activation + effect application
// ======================================================
export function activateBindingVow(fighter, vow) {
  if (!fighter || !vow) return false
  if (activeVows.has(fighter)) return false   // one vow per fighter per match
  activeVows.set(fighter, vow)
  applyVowEffects(fighter, vow.effects || {})
  return true
}

function applyVowEffects(fighter, e) {
  // Disabled moves MERGE into any existing list (e.g. Mahoraga's) — abilities.js
  // isSpecialDisabled() reads fighter.disabledSpecials.
  if (Array.isArray(e.disabledSpecials)) {
    fighter.disabledSpecials = [...(fighter.disabledSpecials || []), ...e.disabledSpecials]
  }

  // Infinite cursed energy — the flag the energy system honors (no min-clamp, no cost).
  if (e.infiniteEnergy) {
    fighter.infiniteEnergy = true
    fighter.energy = fighter.maxEnergy || fighter.energy || 100
  }

  // Damage — combat.js uses max(damageMultiplier, attackMultiplier).
  if (e.damageMul) fighter.damageMultiplier = (fighter.damageMultiplier || 1) * e.damageMul

  // Speed — physics rawSpeed = baseSpeed || speed; scale both so it actually lands.
  if (e.speedMul) {
    fighter.speed = (fighter.speed || 9) * e.speedMul
    if (fighter.baseSpeed) fighter.baseSpeed *= e.speedMul
  }

  // Flags consumed by physics.js / summons.js.
  if (e.noDash)       fighter.noDash = true
  if (e.dashInvuln)   fighter.dashInvuln = true
  if (e.maxSummons != null)   fighter.maxSummons = e.maxSummons
  if (e.summonDamageMul)      fighter.summonDamageMultiplier = e.summonDamageMul
  if (e.summonLifeMul)        fighter.summonLifespanMultiplier = e.summonLifeMul
  if (e.flameArrowMul)        fighter.flameArrowMultiplier = e.flameArrowMul   // inert until a Flame Arrow move exists
}

// ======================================================
// Directional-sequence detection
// ======================================================
// Match the TAIL of the fighter's recent RAW directionHistory (U/D/L/R) against
// this character's vow sequence(s). Returns the activated vow (for the HUD cue)
// or null. Already-vowed fighters and AI (no directionHistory) never match.
const VOW_INPUT_WINDOW_MS = 900

export function tryActivateBindingVow(
  fighter,
  now = (typeof performance !== "undefined" ? performance.now() : 0)
) {
  if (!fighter || activeVows.has(fighter)) return null
  const key = (fighter.rosterKey || fighter.id || "").toLowerCase()
  const hist = fighter.directionHistory
  if (!Array.isArray(hist) || hist.length === 0) return null

  const recent = hist.filter(d => now - d.time <= VOW_INPUT_WINDOW_MS).map(d => d.dir)

  for (const id in bindingVows) {
    const vow = bindingVows[id]
    if (vow.character !== key) continue
    const seq = vow.sequence
    if (recent.length < seq.length) continue
    const tail = recent.slice(-seq.length)
    if (tail.every((d, i) => d === seq[i])) {
      if (activateBindingVow(fighter, vow)) {
        hist.length = 0   // consume the inputs so the sequence can't re-match next frame
        return vow
      }
    }
  }
  return null
}

// ======================================================
// Queries / cleanup
// ======================================================
export function hasBindingVow(fighter) { return activeVows.has(fighter) }
export function getBindingVow(fighter)  { return activeVows.get(fighter) }
export function clearBindingVow(fighter) { activeVows.delete(fighter) }
export function clearAllBindingVows()   { activeVows.clear() }
