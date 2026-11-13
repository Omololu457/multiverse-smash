
// ═══════════════════════════════════════════════════════════════════════════════
// GREEN ARROW — DEFENSIVE TOOLS (feat/green-arrow, Phase 6).
// Emergency Extraction: ↑+Special while knocked down (≥25 Tech, 12s cd) → Skyhook yanks Oliver
// out with 20 invuln (reversal, read ahead of the stun early-return in game.js, like Tobirama).
// Somersault evasion: double-tap Back → back-flip with 10 invuln (double-tap read like the dash).
// (Aegis projectile-absorb is the third defensive tool, already in P4. Below 15 Tech he simply
// can't afford a drone — the fragile-when-rushed weakness is inherent, not coded.)
// ═══════════════════════════════════════════════════════════════════════════════
export function executeGreenArrowExtraction(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return false
  if ((fighter._gaExtractCd || 0) > 0) return false
  if ((fighter.energy || 0) < 25) return false
  spendEnergy(fighter, 25)
  fighter._gaExtractCd = 720        // 12s cooldown
  fighter.hitstun = 0; fighter.knockdownTimer = 0; fighter.knockdownState = false
  fighter.isLaunched = false
  fighter.vy = -16; fighter.vx = -(fighter.facing || 1) * 4
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 20)
  try {
    const d = spawnDrone(fighter, "skyhook", { frame: context?.frame || 0, spendTech: () => true })
    if (d) { d._ctx = context; d.state = "hookSelf"; d.data.hookT = 0; d.x = fighter.x; d.y = (fighter.groundY || fighter.y) - 230 }
  } catch (_) {}
  fighter._spriteCastMove = "flip"; fighter._spriteCastTimer = 20
  if (typeof sound !== "undefined") sound.play?.("ga_recall")
  return true
}

// Somersault evasion — double-tap Back. Returns true if performed (10 invuln back-flip).
export function greenArrowSomersault(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return false
  if (fighter.attacking || (fighter.hitstun || 0) > 0 || (fighter._gaSomerCd || 0) > 0) return false
  if (!(fighter.onGround ?? fighter.grounded ?? true)) return false
  const dirs = fighter.directionHistory || []
  const rel = (d) => (fighter.facing === 1 ? (d.dir === "L" ? "B" : d.dir === "R" ? "F" : d.dir)
                                           : (d.dir === "R" ? "B" : d.dir === "L" ? "F" : d.dir))
  const backs = dirs.filter(d => rel(d) === "B").slice(-2)
  if (backs.length < 2) return false
  if ((backs[1].time - backs[0].time) > 240) return false   // same 240ms window as the dash double-tap
  fighter.vx = -(fighter.facing || 1) * 9; fighter.vy = -7
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 10)
  fighter._gaSomerCd = 36
  fighter._spriteCastMove = "flip"; fighter._spriteCastTimer = 24
  fighter.directionHistory = []     // consume so it fires once per double-tap
  if (typeof sound !== "undefined") sound.play?.("ga_arrow_release")
  return true
}
