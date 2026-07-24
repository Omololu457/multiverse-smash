// harness/combo_decay.test.mjs — STAGE 3 evidence + regression for COMBO DAMAGE/HITSTUN DECAY.
// Imports combat.js directly (fast, deterministic). Proves:
//   1. Damage decays across an uninterrupted combo, ON TOP OF GLOBAL_DAMAGE_SCALE (visible per-hit step-down).
//   2. Hitstun decays slightly along the same string (but stays well above 0 so links survive).
//   3. Projectiles now decay AND participate in the combo (mid-combo bolt is scaled; standalone bolt is not).
//   4. A BLOCK resets the combo string (melee + projectile) → the next clean hit is full-scale again.
//   5. A timeout (comboTimer → 0 in updateCombat) resets the string.
//   6. Curves are the single tunable source and floor (late hits never round to ~0).

import {
  ensureCombatState, startMove, resolveAttackHit, updateCombat, getAttackPhase,
  resolveProjectileHitsMulti, getComboScale, getComboHitstunScale,
  COMBO_DAMAGE_CURVE, COMBO_HITSTUN_CURVE, GLOBAL_DAMAGE_SCALE
} from "../combat.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

function mkFighter(side, x, extra = {}) {
  const f = { side, rosterKey: "tester", facing: extra.facing ?? 1, x, y: 400, w: 50, h: 100, vx: 0, vy: 0,
    onGround: true, health: 100000, maxHealth: 100000, energy: 100, maxEnergy: 100, basic_attacks: {} };
  ensureCombatState(f);
  return f;
}
// Land ONE clean melee hit; return { dmg, hitstun } for this hit. Keeps the combo alive (never calls
// updateCombat, so comboTimer stays high and comboCounter persists across calls).
function landHit(a, t, md) {
  a.attacking = false; a.currentAttack = null; a.attackCooldown = 0;
  t.hitstun = 0;
  const hp0 = t.health;
  startMove(a, "light", md);
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 60) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  return { dmg: hp0 - t.health, hitstun: t.hitstun, combo: a.comboCounter };
}

// ── 1. Melee damage decays across a combo, on top of GLOBAL_DAMAGE_SCALE ──
section("melee damage decays across an uninterrupted combo (on top of GLOBAL_DAMAGE_SCALE)");
{
  const a = mkFighter("p1", 100), t = mkFighter("p2", 168, { facing: -1 });
  const md = { damage: 100, startup: 2, active: 3, recovery: 8, hitstun: 16, category: "light" };
  const seq = [];
  for (let i = 0; i < 8; i++) seq.push(landHit(a, t, md));  // 8 hits → reach & hold the curve floor
  console.log("     per-hit dmg:", seq.map(s => s.dmg).join(" → "));
  console.log("     combo counter:", seq.map(s => s.combo).join(" → "));
  check("hit 1 = base × GLOBAL_DAMAGE_SCALE (no decay yet)", seq[0].dmg === Math.floor(100 * GLOBAL_DAMAGE_SCALE), `dmg=${seq[0].dmg} expect=${Math.floor(100 * GLOBAL_DAMAGE_SCALE)}`);
  check("damage steps DOWN as the combo grows", seq[5].dmg < seq[2].dmg && seq[2].dmg < seq[0].dmg, seq.map(s => s.dmg).join(">"));
  // Damage uses the PRE-increment counter, so the floor (curve last entry, 0.65) is reached once the
  // counter passes the curve length; the last two hits both sit on the floor and are equal (not ~0).
  const floorDmg = Math.floor(100 * COMBO_DAMAGE_CURVE[COMBO_DAMAGE_CURVE.length - 1] * GLOBAL_DAMAGE_SCALE);
  check("late hits FLOOR at the curve's last entry (not near-zero)", seq[7].dmg === floorDmg && seq[7].dmg === seq[6].dmg && seq[7].dmg > 0, `last=${seq[7].dmg} floor=${floorDmg}`);
}

// ── 2. Hitstun decays slightly along the string, staying well above 0 ──
section("hitstun decays gently along the combo (stays > 0 so links survive)");
{
  const a = mkFighter("p1", 100), t = mkFighter("p2", 168, { facing: -1 });
  const md = { damage: 40, startup: 2, active: 3, recovery: 8, hitstun: 20, category: "light" };
  const hs = [];
  for (let i = 0; i < 6; i++) hs.push(landHit(a, t, md).hitstun);
  console.log("     per-hit hitstun:", hs.join(" → "));
  check("late-combo hitstun < early-combo hitstun", hs[5] < hs[0], `${hs[0]} → ${hs[5]}`);
  check("hitstun stays well above 0 (combos still link)", hs[5] >= 10, `last=${hs[5]}`);
}

// ── 3. Projectiles decay AND participate in the combo ──
section("projectiles decay + participate in the combo string");
{
  // Standalone projectile (fresh owner, counter 0) → full scale, unchanged.
  const owner = mkFighter("p1", 100), target = mkFighter("p2", 200, { facing: -1 });
  const mkProj = () => ({ owner, ownerId: "p1", x: 210, y: 440, vx: 12, vy: 0, radius: 12, damage: 100, name: "bolt" });
  let hp = target.health; resolveProjectileHitsMulti([mkProj()], [owner, target], [], []);
  const first = hp - target.health;
  check("standalone projectile → base × GLOBAL_DAMAGE_SCALE (no decay)", first === Math.floor(100 * GLOBAL_DAMAGE_SCALE), `dmg=${first}`);
  check("projectile hit advanced the owner's combo counter", owner.comboCounter === 1, `combo=${owner.comboCounter}`);
  // Drive the counter up, then a mid-combo projectile must be scaled below the standalone value.
  owner.comboCounter = 4;   // getComboScale indexes (counter-1) → curve[3] = 0.76
  hp = target.health; resolveProjectileHitsMulti([mkProj()], [owner, target], [], []);
  const midCombo = hp - target.health;
  check("mid-combo projectile is DECAYED vs standalone", midCombo < first, `${midCombo} < ${first}`);
  check("mid-combo projectile matches the shared damage curve", midCombo === Math.floor(100 * COMBO_DAMAGE_CURVE[3] * GLOBAL_DAMAGE_SCALE), `dmg=${midCombo} expect=${Math.floor(100 * COMBO_DAMAGE_CURVE[3] * GLOBAL_DAMAGE_SCALE)}`);
}

// ── 4. A BLOCK resets the combo (melee + projectile) ──
section("a block breaks the combo string → next clean hit is full-scale again");
{
  const a = mkFighter("p1", 100), t = mkFighter("p2", 168, { facing: -1 });
  const md = { damage: 100, startup: 2, active: 3, recovery: 8, hitstun: 16, category: "light" };
  for (let i = 0; i < 4; i++) landHit(a, t, md);       // build a combo (counter climbs, damage decays)
  check("combo built up", a.comboCounter >= 4, `combo=${a.comboCounter}`);
  // Now the defender blocks a hit → the string must break (counter → 0).
  t.isBlocking = true;
  a.attacking = false; a.currentAttack = null; a.attackCooldown = 0;
  startMove(a, "light", md);
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 60) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  check("blocked hit RESETS the combo counter to 0", a.comboCounter === 0, `combo=${a.comboCounter}`);
  // Next clean hit is full scale again.
  t.isBlocking = false;
  const after = landHit(a, t, md);
  check("post-block clean hit is full-scale (fresh string)", after.dmg === Math.floor(100 * GLOBAL_DAMAGE_SCALE), `dmg=${after.dmg}`);

  // Projectile block also resets.
  const owner = mkFighter("p1", 100), target = mkFighter("p2", 200, { facing: -1 });
  owner.comboCounter = 3; target.isBlocking = true;
  resolveProjectileHitsMulti([{ owner, ownerId: "p1", x: 210, y: 440, vx: 12, vy: 0, radius: 12, damage: 60, name: "bolt" }], [owner, target], [], []);
  check("blocked projectile RESETS the owner's combo counter", owner.comboCounter === 0, `combo=${owner.comboCounter}`);
}

// ── 5. Timeout resets the string (comboTimer → 0 in updateCombat) ──
section("a timeout resets the combo (comboTimer expiry)");
{
  const a = mkFighter("p1", 100), t = mkFighter("p2", 168, { facing: -1 });
  const md = { damage: 40, startup: 2, active: 3, recovery: 8, hitstun: 16, category: "light" };
  for (let i = 0; i < 3; i++) landHit(a, t, md);
  const built = a.comboCounter;
  a.hitstop = 0; a.hitstun = 0;           // clear the last hit's freeze so updateCombat doesn't early-return
  a.comboTimer = 1;                       // about to expire
  updateCombat(a, t, {}, {});             // ticks comboTimer → 0
  updateCombat(a, t, {}, {});             // next frame: comboTimer<=0 → comboCounter reset
  check("combo counter resets after the drop timer expires", built >= 3 && a.comboCounter === 0, `built=${built} now=${a.comboCounter}`);
}

// ── 6. Curves are the single tunable source, floored ──
section("decay curves — single tunable source, floored");
check("COMBO_DAMAGE_CURVE exported & floors < 1", Array.isArray(COMBO_DAMAGE_CURVE) && COMBO_DAMAGE_CURVE[COMBO_DAMAGE_CURVE.length - 1] < 1, COMBO_DAMAGE_CURVE.join(","));
check("COMBO_HITSTUN_CURVE exported & gentle (floor ≥ 0.8)", Array.isArray(COMBO_HITSTUN_CURVE) && COMBO_HITSTUN_CURVE[COMBO_HITSTUN_CURVE.length - 1] >= 0.8, COMBO_HITSTUN_CURVE.join(","));
check("getComboScale floors past the curve length", (() => { const f = { comboCounter: 99 }; return getComboScale(f) === COMBO_DAMAGE_CURVE[COMBO_DAMAGE_CURVE.length - 1]; })(), "");
check("getComboHitstunScale floors past the curve length", (() => { const f = { comboCounter: 99 }; return getComboHitstunScale(f) === COMBO_HITSTUN_CURVE[COMBO_HITSTUN_CURVE.length - 1]; })(), "");

console.log(`\n════════════════════════════════════════════`);
console.log(`  COMBO DECAY (damage + hitstun, melee + projectile): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
