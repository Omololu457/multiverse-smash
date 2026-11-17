// Serializable Ben state shared by the device and damage pipeline. No DOM, clocks or RNG.
import { getAlienDefinition } from "./aliens.js"
export const isBenDevice = f => ["ben10", "albedo"].includes((f?.rosterKey || "").toLowerCase())
// GENERIC READY-FORM HOOK (ADD_ALIEN.md): the active alien's registry entry when it is status "ready", else null.
// Every engine site that used to test `activeAlien === "swampfire"` for a ready-form rule (mods, lunge, power commit,
// knockback weight) now asks this, so a new ready alien needs no engine edit. ben10/albedo-gated → null for everyone else.
export const benReadyForm = f => {
  if (!isBenDevice(f) || !f.transformed || !f.activeAlien) return null
  const d = getAlienDefinition(f.activeAlien)
  return d && d.status === "ready" ? d : null
}
// Optional per-form hooks (absorb before a hit resolves / contact after a hit this fighter owns lands). Both are
// no-ops unless the defender / owner is a ready form that defines the hook.
export function benAlienAbsorb(defender, info) { const d = benReadyForm(defender); return !!(d && d.absorb && d.absorb(defender, info || {})) }
export function benAlienContact(owner, target, info) { const d = benReadyForm(owner); if (d && d.onContact) d.onContact(owner, target, info || {}) }
// Optional per-form body hooks (Megawhatt): hurtbox override (null = ordinary box), body phasing (no push, cross-ups),
// incoming-damage scale (×, after the form defense). All no-ops unless a ready form defines them.
export function benAlienHurtbox(f) { const d = benReadyForm(f); return d && d.hurtbox ? d.hurtbox(f) : null }
export function benAlienPhasing(a, b) { const da = benReadyForm(a), db = benReadyForm(b); return !!((da && da.phasing && da.phasing(a)) || (db && db.phasing && db.phasing(b))) }
export function benAlienIncoming(f) { const d = benReadyForm(f); return d && d.incomingScale ? d.incomingScale(f) : 1 }
// Optional WEAK-POINT hurtbox (Goop's anti-gravity projector): a second small box the form reports via `weakpoint(f)`.
// Tested at the melee + projectile overlap sites alongside the body; `onWeakpoint(f, hit, info)` is told the result
// of every test so the form can attribute the hit (the projector rule wins when both overlap). false for everyone else.
export function benAlienWeakHit(f, box, info) {
  const d = benReadyForm(f); if (!d || !d.weakpoint || !box) return false
  const w = d.weakpoint(f)
  const hit = !!w && box.x < w.x + w.w && box.x + box.w > w.x && box.y < w.y + w.h && box.y + box.h > w.y
  if (d.onWeakpoint) d.onWeakpoint(f, hit, info || {})
  return hit
}
// Optional damage hooks with full context at the one damage choke-point (applyScaledDamage): `damageTaken(f, raw, opts)`
// for damage the form takes, `damageDealt(f, target, raw, opts)` for damage attributed to it (opts.attacker /
// opts.boostFrom). Unlike incomingScale they also see melee (whose defense is pre-applied). raw unchanged otherwise.
export function benAlienDamageMods(target, raw, opts) {
  const dt = benReadyForm(target); if (dt && dt.damageTaken) raw = dt.damageTaken(target, raw, opts || {})
  const src = opts && (opts.attacker || opts.boostFrom)
  const da = src && src !== target ? benReadyForm(src) : null; if (da && da.damageDealt) raw = da.damageDealt(src, target, raw, opts || {})
  return raw
}
export const isSwampfire = f => isBenDevice(f) && f.transformed && f.activeAlien === "swampfire"
export function invalidateBenAction(f) {
  if (!isBenDevice(f)) return
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = null; f._spriteCastTimer = 0
  if (f.omnitrix) { f.omnitrix.startup = 0; f.omnitrix.pendingSlot = 0 }
  f._benRoll = 0
  delete f._benLunge; delete f._benVineHold
  f._omxVulnerable = false; f._axUltWindup = false; f._benPowerCommit = 0
}
export function clearBenFormState(f) {
  if (!f) return
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  for (const k of ["_fbAbsorbWindow", "_fbAbsorbPending", "_fbRedirectDmg", "_axUltWindup", "_benOverloadFx", "_benShockwaveFx", "_benLunge", "_benVineHold", "_benPowerCommit"]) delete f[k]
  f._spriteCastMove = null; f._spriteCastTimer = 0; f._benEnergyGuard = 0
  if (f.omnitrix) f.omnitrix.regrowth = null
  // generic per-form GAME_STATE slot (Heatblast's Heat / Scorch / flight / ult) + its glide — gone on swap / revert / KO
  if (f.omnitrix && f.omnitrix.formState) f.omnitrix.formState = null
  if (f._benGlide) delete f._benGlide
  if (f._alienFlightProfile) { delete f._alienFlightProfile; f._flightCtl = null }   // per-alien flight profile (Megawhatt) + its flight controller
}
export function resetBenDefense(f) {
  for (const k of Object.keys(f)) if (k.startsWith("_omx")) delete f[k]
  for (const k of ["_benRoll", "_benRollCd", "_benEnergyGuard", "_benGuardCd", "_benDR", "_benLastResortUsed", "_benBackLast", "_benBackArm", "_benVowHold", "_benVowChecked", "_benKOHandled"]) delete f[k]
  f.invulnTimer = 0
}
export function consumeBenGuard(f) {
  if (!isBenDevice(f) || !(f._benEnergyGuard > 0)) return false
  f._benEnergyGuard = 0; f.colorFlash = Math.max(f.colorFlash || 0, 10)
  return true
}
export function beginRegrowth(f) {
  if (f.omnitrix) f.omnitrix.regrowth = { pool: 0, restored: 0, wait: 120, cadence: 0, fxFrames: 0 }
}
export function recordRegrowthDamage(f, actual, opts = {}) {
  const r = f?.omnitrix?.regrowth
  if (!isSwampfire(f) || !r || !(actual > 0)) return
  // Every damaging contact restarts the wait, including ineligible self/cost damage.
  r.wait = 120; r.cadence = 0
  if (opts.regrowthEligible === false || opts.attacker === f) return
  r.pool = Math.min(Math.max(0, 80 - r.restored), r.pool + actual * 0.35)
}
export function tickRegrowth(f) {
  const r = f?.omnitrix?.regrowth
  if (!isSwampfire(f) || !r || !(f.health > 0)) return
  if (r.fxFrames > 0) r.fxFrames--
  if (r.wait > 0) { r.wait--; return }
  if (!(r.pool > 0) || r.restored >= 80 || f.health >= f.maxHealth) return
  if (++r.cadence < 10) return
  r.cadence = 0
  const amount = Math.min(2, r.pool, 80 - r.restored, f.maxHealth - f.health)
  f.health += amount; r.pool = Math.max(0, r.pool - amount); r.restored += amount; r.fxFrames = 10
  if (!f._benSfx) f._benSfx = "sf_regrow"   // render-only cue, drained by game.js ben10Sfx the same frame
}
export const benKnockbackScale = f => { const d = benReadyForm(f); return d ? 1 / d.mods.weight : 1 }   // Swampfire 1/1.15 (unchanged)

// Identity-replacement systems own the new kit. Remove only old Ben-owned transient fields/art.
export function clearBenIdentityState(f) {
  if (!f?.omnitrix || isBenDevice(f)) return
  clearBenFormState(f); resetBenDefense(f)
  if (f._skinAnim?.idle?.sheet?.includes("ben10_swampfire")) f._skinAnim = null
  for (const k of ["omnitrix", "_benHumanStats", "_benHumanStatBlock", "_benWalkSpeed", "_benFormDamage", "_benWeight", "_benPlaceholderForm", "_omxVulnerable"]) delete f[k]
}

// Keep the defeated form's art for the KO pose, but remove all executable transient state.
export function handleBenKO(f) {
  if (!isBenDevice(f) || f._benKOHandled) return
  clearBenFormState(f); resetBenDefense(f); invalidateBenAction(f)
  if (f.omnitrix) { f.omnitrix.vowActive = false; f.omnitrix.regrowth = null }
  f._benKOHandled = true
}
