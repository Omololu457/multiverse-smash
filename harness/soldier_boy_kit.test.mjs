/**
 * SOLDIER BOY — PHASE 4 moveset. Drives the real special/ultimate routers (triggerSpecial / triggerUltimate)
 * with each held direction and verifies the correct move fires, the right Nuclear Charge is spent, the cast
 * pose/attack is set, and projectiles spawn. Deterministic (no RNG). Normals come from characters.js
 * basic_attacks (not retested here).
 */
import { triggerSpecial, triggerUltimate, activeProjectiles, schedulePendingSpawn } from "../abilities.js"

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const ctx = (opp) => ({ seed: 1, frame: 0, cinematicSafe: true, getOpponent: () => opp, p1: null, p2: opp })
const mk = (over = {}) => ({
  rosterKey: "soldier_boy", side: "p1", energy: 100, maxEnergy: 100, grounded: true, onGround: true,
  attacking: false, attackCooldown: 0, hitstun: 0, blockstun: 0, currentMove: null, facing: 1,
  x: 400, y: 400, h: 110, w: 60, invulnTimer: 0, ...over
})
const opp = () => ({ rosterKey: "homelander", side: "p2", x: 480, y: 400, h: 110, health: 1000, maxHealth: 1000, invulnTimer: 0, energy: 0, maxEnergy: 100 })
const clearProj = () => { activeProjectiles.length = 0 }

// ── GOLD RUSH (neutral) — armored lunge, cost 20, startup armor ──
{ clearProj(); const f = mk(); f._specialHeldDir = null
  const r = triggerSpecial(f, ctx(opp()))
  ok(r === true, "Gold Rush fires (neutral)")
  ok(Math.round(100 - f.energy) === 20, `Gold Rush cost 20 (got ${100 - f.energy})`)
  ok(f.currentMove === "sbGoldRush", `Gold Rush currentMove (got ${f.currentMove})`)
  ok((f._castArmor || 0) === 6, `Gold Rush startup armor 6f (got ${f._castArmor})`)
}
// ── SHIELD TOSS (F) — boomerang projectile, cost 15, one on screen ──
{ clearProj(); const f = mk(); f._specialHeldDir = "F"
  const r = triggerSpecial(f, ctx(opp()))
  ok(r === true, "Shield Toss fires (F)")
  ok(Math.round(100 - f.energy) === 15, `Shield Toss cost 15 (got ${100 - f.energy})`)
  ok(f._spriteCastMove === "sbShieldThrow", `Shield cast pose (got ${f._spriteCastMove})`)
  ok(activeProjectiles.some(p => p.name === "sbShield" && p.boomerang && p.maxRange === 420), "shield boomerang spawned (range 420)")
  // one on screen: a second toss while the first lives is denied
  const f2cd = mk({ energy: 100 }); f2cd._specialHeldDir = "F"
  f2cd.x = f.x; // share the live projectile owner check uses owner identity → use same fighter
  const again = triggerSpecial(f, ctx(opp()))   // same fighter, shield still live
  ok(again === false, "second Shield Toss denied while one is on screen")
}
// ── SMG BARRAGE (Down, ground) — 6 bullets, cost 20 ──
{ clearProj(); const f = mk(); f._specialHeldDir = "D"
  const r = triggerSpecial(f, ctx(opp()))
  ok(r === true, "SMG Barrage fires (Down ground)")
  ok(Math.round(100 - f.energy) === 20, `SMG cost 20 (got ${100 - f.energy})`)
  ok(f._spriteCastMove === "sbSMG", `SMG cast pose (got ${f._spriteCastMove})`)
}
// ── RIFLE SHOT (Back) — cost 25 ──
{ clearProj(); const f = mk(); f._specialHeldDir = "B"
  const r = triggerSpecial(f, ctx(opp()))
  ok(r === true, "Rifle Shot fires (Back)")
  ok(Math.round(100 - f.energy) === 25, `Rifle cost 25 (got ${100 - f.energy})`)
  ok(f._spriteCastMove === "sbRifle", `Rifle cast pose (got ${f._spriteCastMove})`)
}
// ── CAPE CYCLONE (Up) — anti-air, cost 25, invuln ──
{ clearProj(); const f = mk(); f._specialHeldDir = "U"
  const r = triggerSpecial(f, ctx(opp()))
  ok(r === true, "Cape Cyclone fires (Up)")
  ok(Math.round(100 - f.energy) === 25, `Cyclone cost 25 (got ${100 - f.energy})`)
  ok(f.currentMove === "sbCyclone", `Cyclone currentMove (got ${f.currentMove})`)
  ok((f.invulnTimer || 0) >= 8, `Cyclone upper-body invuln (got ${f.invulnTimer})`)
}
// ── DIVING KICK (air Down) — cost 15; grounded Down does NOT fire it ──
{ clearProj(); const f = mk({ grounded: false, onGround: false }); f._specialHeldDir = "D"
  const r = triggerSpecial(f, ctx(opp()))
  ok(r === true, "Diving Kick fires (air Down)")
  ok(Math.round(100 - f.energy) === 15, `Dive cost 15 (got ${100 - f.energy})`)
  ok(f.currentMove === "sbDive", `Dive currentMove (got ${f.currentMove})`)
}
// ── NUCLEAR BURST ultimate — needs full meter, spends 100 ──
{ clearProj(); const f = mk({ energy: 100 })
  const r = triggerUltimate(f, ctx(opp()))
  ok(r === true, "Nuclear Burst fires at full meter")
  ok(Math.round(f.energy) === 0, `Ult spends full 100 (got ${f.energy})`)
  ok(f._spriteCastMove === "sbUltPose", `Ult pose (got ${f._spriteCastMove})`)
  ok((f.attackCooldown || 0) >= 80, `Ult 90f recovery lockout (got ${f.attackCooldown})`)
}
// ── Ultimate denied without full meter ──
{ clearProj(); const f = mk({ energy: 99 })
  const r = triggerUltimate(f, ctx(opp()))
  ok(r === false, "Nuclear Burst denied below full meter")
  ok(Math.round(f.energy) === 99, "no meter spent on denied ult")
}

console.log("════════════════════════════════════════════")
console.log(`  SOLDIER BOY KIT (specials + ult): ${passed} passed, ${failed} failed`)
console.log("════════════════════════════════════════════")
if (failed) fails.forEach(m => console.log("  ✗ " + m))
process.exit(failed ? 1 : 0)
