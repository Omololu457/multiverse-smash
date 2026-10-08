// cloneFormScaling.js — STAGE 6: FORM-DEPENDENT clone multipliers for the Naruto-universe clone roster.
// ────────────────────────────────────────────────────────────────────────────
// When a clone character is CURRENTLY in one of its REAL, in-code forms, the summon-then-select gathers MORE
// clones and the executed move hits HARDER — but SUBLINEARLY, at a modestly higher chakra cost. Out of form,
// EVERYTHING is unchanged (stage 0 passes identity multipliers through).
//
// DETERMINISM / LAN-SAFE: every value is a PURE function of the caster's live form state (shroudStage /
// _susanooStage / _mangekyouActive / _karmaActive / _madaraSusanoo), which is part of the lockstep-synced
// game state. No gameRng, no wall-clock, no Math.random → both LAN peers compute the identical result.
//
// NO INVENTED FORMS: cloneFormStage reads ONLY form flags that already exist and are actively maintained in
// abilities.js/game.js. Characters without a persistent form (tobirama/minato/hashirama/hiruzen/pain/obito)
// are always stage 0 and therefore completely unaffected.
//
// STAGE model (per caster): 0 = not in form · 1 = in a form · 2 = the form's HIGHEST real stage.
//   stage 0 → clones ×1   damage ×1.0   cost ×1.0     (baseline, untouched)
//   stage 1 → clones ×2   damage ×1.4   cost ×1.25
//   stage 2 → clones ×3   damage ×1.7   cost ×1.5
// Clone count grows LINEARLY (1→2→3) while damage grows SUBLINEARLY (1.0→1.4→1.7): doubling the clones adds
// only +40% damage, tripling adds only +70% — so a form buffs presence/pressure far more than raw burst.

export const MAX_LIVE_CLONES = 12   // hard cap on simultaneously-STAGED formation clones per caster (= 3× the base 4)

const CLONE_MULT = [1, 2, 3]        // formation clone COUNT × by stage
const DMG_MULT   = [1, 1.4, 1.7]    // SUBLINEAR damage × by stage
const COST_MULT  = [1, 1.25, 1.5]   // modest summon-cost × by stage

// REAL, code-backed form stage for a clone character. Returns 0 for anyone without a persistent form.
export function cloneFormStage(caster) {
  if (!caster) return 0
  switch ((caster.rosterKey || "").toLowerCase()) {
    case "naruto": {   // Kurama shroud — health-gated 0..5 (game.applyKuramaShroudSystem). 5 = highest.
      const s = caster.shroudStage || 0
      return s >= 5 ? 2 : s > 0 ? 1 : 0
    }
    case "sasuke": {   // Susanoo — _susanooStage 0/1/2 (abilities._enterSusanooStage). 2 = highest.
      const s = caster._susanooStage || 0
      return s >= 2 ? 2 : s > 0 ? 1 : 0
    }
    case "itachi":     // Mangekyou (tier 1) escalating to Itachi Susanoo (tier 2, highest).
      return caster._itachiSusanoo ? 2 : caster._mangekyouActive ? 1 : 0
    case "kakashi":    // Mangekyou Sharingan — single tier.
      return caster._mangekyouActive ? 1 : 0
    case "boruto":     // Karma — single tier.
      return caster._karmaActive ? 1 : 0
    case "madara":     // Susanoo (special, timer-based) — single tier.
      return (caster._madaraSusanoo || 0) > 0 ? 1 : 0
    default:
      return 0         // tobirama / minato / hashirama / hiruzen / pain / obito — no persistent form
  }
}

// { stage, cloneMult, dmgMult, costMult } for a caster's current form.
export function cloneScaling(caster) {
  const s = cloneFormStage(caster)
  return { stage: s, cloneMult: CLONE_MULT[s], dmgMult: DMG_MULT[s], costMult: COST_MULT[s] }
}

// Deterministic symmetric fan of N formation offsets around the caster. Matches the original fixed 4 EXACTLY
// for n=4 ({-74},{+74},{-128},{+128}); extra pairs step outward by `step` so added clones stay on-screen and
// are later wall-clamped by the engine. Pure/ordered → identical on both LAN peers.
export function formationOffsets(n) {
  const out = []; const baseDx = 74, step = 54
  for (let i = 0; i < n; i++) {
    const pair = Math.floor(i / 2), side = (i % 2 === 0) ? -1 : 1
    out.push({ dx: side * (baseDx + pair * step), dy: 0 })
  }
  return out
}

// How many clones the staged formation shows for this caster (base 4 → 8 → 12), hard-capped.
export function formationCloneCount(caster) {
  return Math.min(4 * cloneScaling(caster).cloneMult, MAX_LIVE_CLONES)
}

// Apply the run's captured damage multiplier to a resolved hit spec (rounded; identity at stage 0).
export function scaleHitDamage(hit, dmgMult) {
  if (!hit || !dmgMult || dmgMult === 1 || typeof hit.damage !== "number") return hit
  return { ...hit, damage: Math.round(hit.damage * dmgMult) }
}
