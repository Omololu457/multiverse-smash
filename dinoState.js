// dinoState.js — MSV1-DINO leaf module (no imports): the Dino Thunder Rangers' damage modifiers, called from the engine's
// single damage choke-point (combat.js applyScaledDamage). A strict no-op unless the attacker or the target is the
// dinothunder fighter (f._duo.id === 'dinothunder'); everyone else's damage is byte-identical. All inputs are GAME_STATE
// (f._duo, set by dinothunder.js), so LAN / replay stay deterministic.
export const DINO_ID = 'dinothunder'
export const DINO_MODS = Object.freeze({ superDino: 1.20, evil: 1.25, camo: 1.25, highScoreStep: 0.02, highScoreMax: 0.20, triceraTaken: 0.40 })
const dino = f => (f && f._duo && f._duo.id === DINO_ID) ? f._duo : null

export function dinoDamageMods(target, raw, opts = {}) {
  if (!(raw > 0)) return raw
  const A = opts.attacker, da = dino(A), dt = dino(target)
  if (!da && !dt) return raw
  let d = raw
  if (da && target !== A) {
    if (da.sdm > 0) d *= DINO_MODS.superDino                                   // SUPER DINO MODE +20 %
    if (da.evil > 0 && da.form === 'dt_white') d *= DINO_MODS.evil             // EVIL WHITE RANGER +25 %
    if (A.currentAttack && A.currentAttack._dtCamo) d *= DINO_MODS.camo         // first attack out of Camouflage +25 %
    if (da.form === 'dt_blue') d *= 1 + Math.min(DINO_MODS.highScoreMax, DINO_MODS.highScoreStep * Math.max(0, da.hs || 0))   // HIGH SCORE
  }
  if (dt && dt.skin > 0 && opts.attacker !== target) d *= DINO_MODS.triceraTaken   // TRICERA SKIN: 40 % taken
  return d
}
