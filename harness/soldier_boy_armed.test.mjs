/**
 * SOLDIER BOY — PHASE 3 Armed Mode (loadout swap). Unit-tests the state machine + command-combat driver:
 *   toggle on/off (Down+Heavy), 12s window, 1.5 Charge/s drain, meter/timer auto-holster, 8s cooldown,
 *   Ultimate lockout, armed Jab->SMG / Heavy->rifle intercept (input consumed), Up-Launcher stays melee.
 * Deterministic, no RNG.
 */
import { toggleSoldierBoyArmed, updateSoldierBoyArmed, updateSoldierBoyCommandCombat } from "../abilities.js"

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const mk = (over = {}) => ({ rosterKey: "soldier_boy", side: "p1", energy: 100, maxEnergy: 100, grounded: true, onGround: true, attackCooldown: 0, facing: 1, x: 0, y: 400, h: 110, ...over })
const ctx = { seed: 1, frame: 0 }

// ── TOGGLE ON via Down+Heavy ──
{
  const f = mk()
  const inp = { heavy: true, down: true }
  const consumed = updateSoldierBoyCommandCombat(f, inp, ctx)
  ok(consumed === true, "Down+Heavy should toggle & consume")
  ok(f._sbArmed === true, "armed after Down+Heavy")
  ok(f._sbArmedTimer === 720, `12s window armed (got ${f._sbArmedTimer})`)
  ok(inp.heavy === false, "heavy input consumed by toggle")
}
// ── direct toggle API: on → off (cancel sets cooldown) ──
{
  const f = mk()
  ok(toggleSoldierBoyArmed(f, ctx) === true && f._sbArmed, "toggle on")
  ok(toggleSoldierBoyArmed(f, ctx) === true && !f._sbArmed, "re-toggle cancels")
  ok(f._sbArmedCd === 480, `cancel sets 8s cooldown (got ${f._sbArmedCd})`)
  ok(toggleSoldierBoyArmed(f, ctx) === false, "cannot re-arm during cooldown")
}
// ── Ultimate lockout ──
{
  const f = mk({ isUltimateActive: true })
  ok(toggleSoldierBoyArmed(f, ctx) === false, "cannot arm during Ultimate")
}
// ── drain = 1.5 Charge/s (0.025/frame) ──
{
  const f = mk(); toggleSoldierBoyArmed(f, ctx)
  const e0 = f.energy
  for (let i = 0; i < 60; i++) updateSoldierBoyArmed(f)
  ok(Math.abs((e0 - f.energy) - 1.5) < 1e-6, `1.5 Charge drained in 1s (got ${(e0 - f.energy).toFixed(3)})`)
  ok(f._sbArmedTimer === 720 - 60, `timer counted 60 frames (got ${f._sbArmedTimer})`)
}
// ── auto-holster when the 12s timer runs out → cooldown begins ──
{
  const f = mk(); toggleSoldierBoyArmed(f, ctx); f._sbArmedTimer = 2
  updateSoldierBoyArmed(f); updateSoldierBoyArmed(f)
  ok(!f._sbArmed, "auto-holstered at timer end")
  ok(f._sbArmedCd === 480, "cooldown begins after timer end")
}
// ── auto-holster when the meter empties ──
{
  const f = mk({ energy: 0.02 }); toggleSoldierBoyArmed(f, ctx)
  updateSoldierBoyArmed(f)
  ok(!f._sbArmed, "auto-holstered when Charge empties")
}
// ── cooldown decrements even when not armed ──
{
  const f = mk(); f._sbArmedCd = 3
  updateSoldierBoyArmed(f)
  ok(f._sbArmedCd === 2, `cooldown ticks down (got ${f._sbArmedCd})`)
}
// ── ARMED normals: Jab→SMG / Heavy→rifle intercept, Up-Launcher stays melee ──
{
  const f = mk(); toggleSoldierBoyArmed(f, ctx)
  // fresh Jab
  const inpJab = { light: true }
  const cJab = updateSoldierBoyCommandCombat(f, inpJab, ctx)
  ok(cJab === true && inpJab.light === false, "armed Jab intercepted & consumed")
  ok(f._spriteCastMove === "sbArmedJab", `armed Jab cast pose (got ${f._spriteCastMove})`)
}
{
  const f = mk(); toggleSoldierBoyArmed(f, ctx); f.attackCooldown = 0
  const inpHvy = { heavy: true }   // heavy WITHOUT down → rifle (down+heavy would toggle instead)
  const cHvy = updateSoldierBoyCommandCombat(f, inpHvy, ctx)
  ok(cHvy === true && inpHvy.heavy === false, "armed Heavy intercepted & consumed")
  ok(f._spriteCastMove === "sbArmedHeavy", `armed Heavy cast pose (got ${f._spriteCastMove})`)
}
{
  const f = mk(); toggleSoldierBoyArmed(f, ctx)
  const inpUp = { light: true, up: true }   // Up+Light = Launcher → NOT intercepted
  const cUp = updateSoldierBoyCommandCombat(f, inpUp, ctx)
  ok(cUp === false && inpUp.light === true, "Up-Launcher stays melee (not intercepted)")
}
// ── no-op for a non-soldier_boy fighter ──
{
  const f = mk({ rosterKey: "homelander" })
  ok(toggleSoldierBoyArmed(f, ctx) === false, "toggle no-op for non-SB")
  ok(updateSoldierBoyCommandCombat(f, { heavy: true, down: true }, ctx) === false, "command-combat no-op for non-SB")
}

console.log("════════════════════════════════════════════")
console.log(`  SOLDIER BOY ARMED MODE: ${passed} passed, ${failed} failed`)
console.log("════════════════════════════════════════════")
if (failed) fails.forEach(m => console.log("  ✗ " + m))
process.exit(failed ? 1 : 0)
