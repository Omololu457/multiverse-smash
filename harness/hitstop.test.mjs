// harness/hitstop.test.mjs — STAGE 1 evidence + regression for the UNIFIED HIT-STOP system.
//
// Unlike the char harnesses (which boot the whole game in headless Chromium), this imports
// combat.js + physics.js DIRECTLY and exercises the shared hit-stop path as a fast, fully
// deterministic unit test. It proves:
//   1. Melee hit-stop is weight-scaled from the ONE shared HITSTOP table (light<heavy<special<ult).
//   2. BOTH attacker AND defender freeze on a clean connect.
//   3. Projectiles now apply hit-stop too (was zero before Stage 1) — weight-scaled + overridable,
//      but TARGET-ONLY (the thrower isn't frozen: it's decoupled from the impact and may be
//      mid-cast/across the stage — freezing it stalls cast animations. Melee still freezes both).
//   4. The escape hatches work: `noHitstop` opts out, numeric `hitstop` overrides the tier.
//   5. A BLOCK yields NO hit-stop (melee + projectile) — freeze is a clean-hit reward.
//   6. Position FREEZE: while hitstop>0 the fighter does not move; it resumes the instant it hits 0.
//
// NOTE: this only touches shared plumbing, so it is char-agnostic — every roster member's
// normals/specials/projectiles route through exactly these functions.

import {
  ensureCombatState, startMove, resolveAttackHit, updateCombat,
  resolveProjectileHitsMulti, getAttackPhase,
  HITSTOP, getHitstopFrames, getProjectileHitstopFrames, applyHitstop
} from "../combat.js";
import { physics } from "../physics.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

function mkFighter(side, x, extra = {}) {
  const f = {
    side, rosterKey: extra.rosterKey || "tester", facing: extra.facing ?? 1,
    x, y: 400, w: 50, h: 100, vx: 0, vy: 0, onGround: true,
    health: 1000, maxHealth: 1000, energy: 100, maxEnergy: 100,
    basic_attacks: {
      light: { damage: 40, startup: 3, active: 3, recovery: 8, hitstun: 12, category: "light" },
      heavy: { damage: 80, startup: 5, active: 4, recovery: 12, hitstun: 16, category: "heavy" }
    }
  };
  ensureCombatState(f);
  return f;
}

// Land ONE clean melee hit of the given move descriptor from attacker→target, return nothing.
function landMelee(attacker, target, moveKey, moveData) {
  attacker.attacking = false; attacker.currentAttack = null; attacker.attackCooldown = 0;
  startMove(attacker, moveKey, moveData);
  // fast-forward into the active window, then resolve
  let guard = 0;
  while (getAttackPhase(attacker) !== "active" && guard++ < 60) attacker.currentAttack.timer--;
  resolveAttackHit(attacker, target, [], {});
}

// ── 1. MELEE hit-stop is weight-scaled from the shared table ──
section("MELEE hit-stop — weight-scaled from the single HITSTOP table");
for (const [label, md, expect] of [
  ["light",   { damage: 40, startup: 2, active: 3, recovery: 8, hitstun: 12, category: "light" },   HITSTOP.light],
  ["heavy",   { damage: 80, startup: 3, active: 3, recovery: 10, hitstun: 16, category: "heavy" },   HITSTOP.heavy],
  ["special", { damage: 90, startup: 3, active: 3, recovery: 12, hitstun: 20, isSpecial: true },     HITSTOP.special],
  ["ultimate",{ damage: 200, startup: 3, active: 3, recovery: 14, hitstun: 24, isUltimate: true },   HITSTOP.ultimate],
]) {
  const a = mkFighter("p1", 100), t = mkFighter("p2", 168, { facing: -1 });
  landMelee(a, t, "light", md);
  check(`${label} hit → attacker freezes ${expect}f`, a.hitstop === expect, `hitstop=${a.hitstop}`);
  check(`${label} hit → defender freezes ${expect}f`, t.hitstop === expect, `hitstop=${t.hitstop}`);
}

// ── 2. getHitstopFrames matches the table for a tagged attack ──
section("getHitstopFrames tiering");
check("special tag → HITSTOP.special", getHitstopFrames({ isSpecial: true }) === HITSTOP.special, `${getHitstopFrames({ isSpecial: true })}`);
check("ultimate tag → HITSTOP.ultimate", getHitstopFrames({ isUltimate: true }) === HITSTOP.ultimate, `${getHitstopFrames({ isUltimate: true })}`);
check("heavy category → HITSTOP.heavy", getHitstopFrames({ category: "heavy" }) === HITSTOP.heavy, `${getHitstopFrames({ category: "heavy" })}`);

// ── 3. PROJECTILE hit-stop (NEW in Stage 1 — was zero before) ──
section("PROJECTILE hit-stop — the gap Stage 1 closes");
function fireProjectile(projExtra = {}) {
  const owner = mkFighter("p1", 100);
  const target = mkFighter("p2", 200, { facing: -1 });
  const proj = { owner, ownerId: "p1", x: 210, y: 440, vx: 12, vy: 0, radius: 12, damage: 60, name: "bolt", ...projExtra };
  resolveProjectileHitsMulti([proj], [owner, target], [], []);
  return { owner, target, proj };
}
{
  const { owner, target } = fireProjectile();
  check("plain projectile → HITSTOP.projectile on TARGET, owner NOT frozen", target.hitstop === HITSTOP.projectile && (owner.hitstop || 0) === 0, `owner=${owner.hitstop} target=${target.hitstop}`);
}
{
  const { owner, target } = fireProjectile({ isSpecial: true });
  check("isSpecial projectile → target HITSTOP.special, owner free", target.hitstop === HITSTOP.special && (owner.hitstop || 0) === 0, `owner=${owner.hitstop} target=${target.hitstop}`);
}
{
  const { owner, target } = fireProjectile({ isUltimate: true });
  check("isUltimate projectile → target HITSTOP.ultimate, owner free", target.hitstop === HITSTOP.ultimate && (owner.hitstop || 0) === 0, `owner=${owner.hitstop} target=${target.hitstop}`);
}

// ── 4. Escape hatches so rapid/DOT projectiles don't stutter-freeze ──
section("projectile escape hatches");
{
  const { owner, target } = fireProjectile({ noHitstop: true });
  check("noHitstop projectile → NO freeze (rapid barrage / DOT opt-out)", (owner.hitstop || 0) === 0 && (target.hitstop || 0) === 0, `owner=${owner.hitstop} target=${target.hitstop}`);
}
{
  const { owner, target } = fireProjectile({ hitstop: 3 });
  check("numeric hitstop override → exactly that many frames on target", target.hitstop === 3 && (owner.hitstop || 0) === 0, `target=${target.hitstop}`);
}
check("visualOnly projectile → getProjectileHitstopFrames 0", getProjectileHitstopFrames({ visualOnly: true }) === 0, "");

// ── 5. A BLOCK is not a clean hit → no freeze reward ──
section("blocked hits apply NO hit-stop");
{
  const a = mkFighter("p1", 100), t = mkFighter("p2", 168, { facing: -1 });
  t.isBlocking = true;
  landMelee(a, t, "light", { damage: 80, startup: 2, active: 3, recovery: 10, hitstun: 16, category: "heavy" });
  check("blocked melee → attacker NOT frozen", (a.hitstop || 0) === 0, `hitstop=${a.hitstop}`);
  check("blocked melee → defender NOT frozen", (t.hitstop || 0) === 0, `hitstop=${t.hitstop}`);
}
{
  const owner = mkFighter("p1", 100);
  const target = mkFighter("p2", 200, { facing: -1 });
  target.isBlocking = true;
  const proj = { owner, ownerId: "p1", x: 210, y: 440, vx: 12, vy: 0, radius: 12, damage: 60, name: "bolt", isSpecial: true };
  resolveProjectileHitsMulti([proj], [owner, target], [], []);
  check("blocked projectile → NO freeze on either", (owner.hitstop || 0) === 0 && (target.hitstop || 0) === 0, `owner=${owner.hitstop} target=${target.hitstop}`);
}

// ── 6. POSITION FREEZE — the visible payoff ──
// A hit-stopped fighter with live velocity must not move until the freeze ends, then resume.
section("position freeze — fighter is pinned for exactly the hit-stop window, then resumes");
{
  const a = mkFighter("p1", 100), t = mkFighter("p2", 168, { facing: -1 });
  landMelee(a, t, "light", { damage: 80, startup: 2, active: 3, recovery: 10, hitstun: 16, category: "heavy" }); // → 8f freeze
  const freeze0 = t.hitstop;
  t.vx = 6; // give the defender knockback velocity to prove the freeze pins it
  const timeline = [];
  let movedFrame = -1, xPrev = t.x;
  for (let frame = 0; frame < 16; frame++) {
    updateCombat(t, a, {}, {});          // decrements hitstop (returns early while frozen)
    physics.moveFighter(t, {}, {}, null); // returns early while hitstop>0 → x pinned
    const moved = Math.abs(t.x - xPrev) > 0.001;
    if (moved && movedFrame < 0) movedFrame = frame;
    timeline.push(`f${frame}:hs${t.hitstop}${moved ? " MOVE" : ""}`);
    xPrev = t.x;
  }
  console.log("     timeline:", timeline.join("  "));
  check(`defender pinned during the ${freeze0}f freeze, resumes right after`, movedFrame >= 0 && movedFrame <= freeze0 + 1 && movedFrame >= freeze0 - 1, `freeze=${freeze0} firstMoveFrame=${movedFrame}`);
}

// ── 7. applyHitstop uses max() so an overlapping heavier freeze isn't shortened ──
section("applyHitstop max() semantics");
{
  const f = { hitstop: 10 };
  applyHitstop(f, null, 4);
  check("lighter freeze does not shorten an active heavier one", f.hitstop === 10, `hitstop=${f.hitstop}`);
  applyHitstop(f, null, 20);
  check("heavier freeze extends", f.hitstop === 20, `hitstop=${f.hitstop}`);
}

console.log(`\n════════════════════════════════════════════`);
console.log(`  HIT-STOP unified system: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
