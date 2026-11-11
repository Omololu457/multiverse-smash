// Serializable Ben state shared by the device and damage pipeline. No DOM, clocks or RNG.
export const isBenDevice = f => ["ben10", "albedo"].includes((f?.rosterKey || "").toLowerCase())
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
}
export const benKnockbackScale = f => isSwampfire(f) ? 1 / 1.15 : 1

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
