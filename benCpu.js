// benCpu.js — CPU Ben 10 / Albedo: uses the WHOLE Omnitrix (2026-11-23, owner: "make sure their AIs make full use of
// whatever aliens they can switch to … switching between multiple aliens, doing combos between multiple").
// Called once per sim frame for a CPU-driven Ben / Albedo (replaces the old "re-engage slot 0" tryTransform):
//   • HUMAN → picks the alien that fits the range (ranged / zoner far, bruiser close, Alien X with a full meter)
//   • CONFIRMED HIT → a mid-combo SWAP into a different-role alien so the string keeps going in another form
//   • WRONG TOOL → if the current alien's role doesn't suit the range for a while, swaps to one that does
// Same costs / lockouts as a player (ben10TransformOrSwap). Deterministic: decisions read the sim state + the
// Omnitrix sim frame only (no RNG). Plain data on f._benCpu.
import { ben10TransformOrSwap, TRANSFORM_ENERGY } from "./fighters.js"

const RANGED = new Set(["heatblast", "megawhatt", "jetray", "eyeguy", "diamondhead", "bigchill", "waterhazard", "feedback_ov",
  "brainstorm", "ghostfreak", "upgrade_ov", "terraspin", "wildvine", "goop", "arcticguana", "feedback", "upgrade",
  "chromastone", "nrg", "lodestar", "buzzshock", "whampire", "astrodactyl", "greymatter", "ampfibian", "snareoh"])
const BRUISER = new Set(["rath", "humongousaur", "wildmutt_ov", "benwolf", "ripjaws", "highbreed", "swampfire", "xlr8", "diamondhead_ov", "fourarms",
  "wildmutt", "cannonbolt", "armodrillo", "waybig", "gravattack", "kickinhawk", "fasttrack", "bloxx", "toepick", "juryrigg", "gutrot", "atomix"])
const PACE = { easy: 70, normal: 36, hard: 20, impossible: 12, master: 10 }
const role = k => k === "alienx" ? "alienx" : RANGED.has(k) ? "ranged" : BRUISER.has(k) ? "bruiser" : "any"
const ctr = o => (o.x || 0) + (o.w || 60) / 2

function bestSlot(f, want, exclude) {
  const A = f.omnitrix.aliens || []
  let best = -1, score = -1
  for (let i = 0; i < A.length; i++) {
    if (i === exclude) continue
    const r = role(A[i]); let s = r === want ? 3 : r === "any" ? 1 : 0
    if (r === "alienx") s = want === "alienx" ? 4 : (f.energy || 0) >= 70 ? 2 : -1
    s += ((i * 7 + (f.omnitrix.simFrame >> 6)) % 3) * 0.1        // a little rotation so he doesn't always open the same way
    if (s > score) { score = s; best = i }
  }
  return best
}

export function benCpuDrive(f, opp, difficulty = "normal", seed = 1, playerIndex = 1) {
  const omx = f?.omnitrix; if (!omx || !opp || (f.health ?? 1) <= 0) return
  const c = f._benCpu || (f._benCpu = { next: 0, lastSwap: -999, mismatch: 0 })
  const fr = omx.simFrame || 0
  if (c.next > fr + 600) c.next = 0                                   // sim clock restarted (rematch / harness reset)
  const pace = PACE[difficulty] ?? 36
  const dist = Math.abs(ctr(opp) - ctr(f)), e = f.energy || 0
  const want = e >= 80 && dist < 420 ? "alienx" : dist > 300 ? "ranged" : "bruiser"
  const vowCtx = { seed: seed >>> 0, frame: fr, playerIndex }
  if (!f.transformed) {
    if ((omx.startup || 0) > 0 || fr < c.next || e < TRANSFORM_ENERGY.TRANSFORM_COST) return
    const s = bestSlot(f, want, -1)
    if (s >= 0 && ben10TransformOrSwap(f, s, vowCtx)) c.next = fr + pace
    else c.next = fr + 10
    return
  }
  const cur = role(omx.aliens?.[omx.index])
  const swapCost = omx.vowActive ? TRANSFORM_ENERGY.VOW_SWAP_COST : TRANSFORM_ENERGY.SWAP_COST
  if (fr < c.next || (omx.swapLockout || 0) > 0 || e < swapCost + 4 || f._benPowerCommit > 0) return
  // MID-COMBO SWAP: the foe is reeling from our string → keep it going as a different alien
  const confirmed = (opp.hitstun || 0) > 4 && (f.comboCounter || 0) >= 2
  if (confirmed && fr - c.lastSwap > 75 + pace) {
    const next = bestSlot(f, cur === "bruiser" ? (dist > 160 ? "ranged" : "alienx") : "bruiser", omx.index)
    if (next >= 0 && ben10TransformOrSwap(f, next, vowCtx)) { c.lastSwap = fr; c.next = fr + 20; return }
  }
  // WRONG TOOL for the range for ~2 s → swap to one that fits
  const fits = cur === "any" || cur === want || (cur === "alienx" && e > 30)
  c.mismatch = fits ? 0 : c.mismatch + pace
  if (c.mismatch > 120 && fr - c.lastSwap > 150) {
    const next = bestSlot(f, want, omx.index)
    if (next >= 0 && ben10TransformOrSwap(f, next, vowCtx)) { c.lastSwap = fr; c.mismatch = 0 }
  }
  c.next = fr + Math.max(6, pace >> 1)
}
