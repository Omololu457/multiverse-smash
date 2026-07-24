// harness/momentum.test.mjs — STAGE 4 evidence + regression for COMBO MOMENTUM PRESERVATION.
// Imports physics.js + combat.js directly (fast, deterministic). Proves:
//   1. Velocity is NOT reset at attack start (startMove preserves inbound vx/vy) — confirms the audit.
//   2. Facing carries through an attack with no directional input (not re-zeroed / re-oriented).
//   3. While ATTACKING, the attacker's inbound momentum CARRIES (gentle friction) — a moving attack glides
//      much further than an idle fighter braking, so a combo string reads as one continuous forward motion.
//   4. A STANDING attack (vx≈0) is unaffected; an IDLE (not attacking) fighter still brakes normally.

import { physics } from "../physics.js";
import { ensureCombatState, startMove } from "../combat.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

function mk(extra = {}) {
  const f = { rosterKey: "tester", facing: 1, x: 300, y: physics.groundY, w: 50, h: 100, vx: 9, vy: 0,
    onGround: true, baseSpeed: 90, health: 100, maxHealth: 100, stats: {},
    basic_attacks: { light: { damage: 40, startup: 3, active: 3, recovery: 8, hitstun: 14, category: "light" } }, ...extra };
  ensureCombatState(f);
  return f;
}
// Glide distance over N frames with NO directional input (empty controls).
function glide(f, n = 12) {
  const x0 = f.x;
  for (let i = 0; i < n; i++) physics.moveFighter(f, {}, {}, null);
  return f.x - x0;
}

// ── 1. Velocity is not reset at attack start ──
section("velocity is preserved at attack start (not reset)");
{
  const f = mk({ vx: 9, vy: -4 });
  startMove(f, "light", f.basic_attacks.light);
  check("startMove keeps inbound vx", f.vx === 9, `vx=${f.vx}`);
  check("startMove keeps inbound vy", f.vy === -4, `vy=${f.vy}`);
}

// ── 2. Facing carries through an attack ──
section("facing carries through an attack with no input");
{
  const f = mk({ facing: 1, vx: 0 });
  f.attacking = true; f.comboCounter = 2;
  for (let i = 0; i < 10; i++) physics.moveFighter(f, {}, {}, null);
  check("facing unchanged across the swing (no input)", f.facing === 1, `facing=${f.facing}`);
}

// ── 3 & 4. Attacking (moving) GLIDES; idle BRAKES ──
section("momentum: a moving ATTACK carries velocity, an IDLE fighter brakes");
{
  const attacking = mk({ vx: 9 }); attacking.attacking = true;   // moving attack → momentum carries
  const idle      = mk({ vx: 9 }); idle.attacking = false;       // moving but not attacking → normal brake
  const dAtk  = glide(attacking, 12);
  const dIdle = glide(idle, 12);
  console.log(`     idle glide: ${dIdle.toFixed(1)}px   |   attacking glide: ${dAtk.toFixed(1)}px`);
  check("idle (not attacking) brakes on normal friction (short glide)", dIdle < 25, `${dIdle.toFixed(1)}px`);
  check("moving ATTACK carries momentum much further", dAtk > dIdle * 1.6, `atk ${dAtk.toFixed(1)} vs idle ${dIdle.toFixed(1)}`);
  check("attack momentum still eventually slows (not frictionless)", attacking.vx < 9, `vx_end=${attacking.vx.toFixed(2)}`);
}

// ── 5. A STANDING attack is unaffected (vx≈0 stays 0) ──
section("a standing attack is unaffected — only a MOVING fighter drifts");
{
  const standing = mk({ vx: 0 }); standing.attacking = true;   // attacking from a standstill
  const d = glide(standing, 12);
  check("standing attack does not slide (vx 0 stays put)", Math.abs(d) < 1, `${d.toFixed(1)}px`);
}

// ── 6. Only FORWARD momentum is preserved — a retreating attack brakes normally ──
// (This is what keeps a Back+input rekka opener from drifting the attacker out of its own range.)
section("only forward momentum carries — a retreating (back-moving) attack brakes");
{
  const fwd  = mk({ vx: 9,  facing: 1 }); fwd.attacking = true;   // moving forward (into facing) → glides
  const back = mk({ vx: -9, facing: 1 }); back.attacking = true;  // moving backward vs facing → brakes
  const dFwd  = Math.abs(glide(fwd, 12));
  const dBack = Math.abs(glide(back, 12));
  console.log(`     forward-attack glide: ${dFwd.toFixed(1)}px   |   retreating-attack glide: ${dBack.toFixed(1)}px`);
  check("retreating attack brakes on normal friction (short)", dBack < 25, `${dBack.toFixed(1)}px`);
  check("forward attack carries much further than retreating", dFwd > dBack * 1.6, `fwd ${dFwd.toFixed(1)} vs back ${dBack.toFixed(1)}`);
}

console.log(`\n════════════════════════════════════════════`);
console.log(`  COMBO MOMENTUM PRESERVATION: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
