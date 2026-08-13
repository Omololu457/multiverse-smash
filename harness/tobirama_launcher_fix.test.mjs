// harness/tobirama_launcher_fix.test.mjs — REGRESSION FIX proof for Tobirama's launcher→air→down_air route.
//
// Root cause: the roster-wide launcher raise moved the shared LAUNCH_FLOOR -26 → -30. Tobirama had NO
// explicit launchVy, so he silently rode the floor; his signature juggle (up-launcher → air → down_air
// SPIKE) was implicitly tuned to the old -26 pop. His down_air hitbox sits BELOW him, so the spike only
// connects when his jump out-climbs the pop and he lands ABOVE the foe. jumpPower 32 clears a -26 pop but
// NOT a -30 one → at -30 the foe floats above him and the spike whiffs.
//
// Fix (root cause, two parts):
//   (1) physics.launcherAttack honors an EXPLICITLY tuned launchVy exactly (opts.exact) — the floor is now
//       only the DEFAULT for un-tuned launchers, so a char CAN be tuned below baseline when needed.
//   (2) Tobirama's upAttack gets an explicit launchVy: -26 (his proven value, made floor-proof).
//
// This proves the fix WITHOUT the jittery live juggle: the exact launch velocities + the maxAirHits behaviour.
import { ensureCombatState, startMove, resolveAttackHit, getAttackPhase } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";

physics.setGroundY(400); physics.setStageBounds(0, 3200);
let pass = 0, fail = 0;
const check = (n, c, e = "") => { (c ? pass++ : fail++); console.log(`  ${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

function mkFighter(x, facing, ba = {}) {
  const f = { rosterKey: "t", facing, x, y: 300, w: 50, h: 100, vx: 0, vy: 0, groundY: 400,
    onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 100, maxEnergy: 100, maxAirHits: 3, basic_attacks: ba };
  ensureCombatState(f); return f;
}
function launch(key, md, opts = {}) {
  const a = mkFighter(100, 1, getCharacter(key)?.basic_attacks || {});
  const t = mkFighter(168, -1); if (opts.giant) t._canvasHeightFrac = 0.85;
  if (!startMove(a, "up", md)) return { started: false };
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  return { enemyVy: t.vy, launched: t.isLaunched, attackerGrounded: a.onGround, attackerAirHits: a.airHits };
}

// ── 1. Tobirama's launcher is honored at EXACTLY -26 (explicit, BELOW the -30 floor) ──
section("1. Tobirama launcher = EXACTLY -26 (explicit launchVy, floor-exempt)");
const tobiMd = getCharacter("tobirama").basic_attacks.upAttack;
check("tobirama upAttack now declares an explicit launchVy", tobiMd.launchVy != null, `launchVy=${tobiMd.launchVy}`);
check("tobirama launchVy === -26 (his proven working value)", tobiMd.launchVy === -26, `launchVy=${tobiMd.launchVy}`);
const rTobi = launch("tobirama", tobiMd);
check("tobirama launches the foe at vy = -26 (NOT lifted to the -30 floor)", rTobi.enemyVy === -26, `vy=${rTobi.enemyVy}`);
check("tobirama opener still resets airHits to 0 (opener uncounted)", rTobi.attackerAirHits === 0, `airHits=${rTobi.attackerAirHits}`);

// ── 2. the floor is still a floor for UN-TUNED launchers (no regression to the roster raise) ──
section("2. floor unchanged for un-tuned launchers + archetype chars still honored");
// un-tuned floor-rider: a launcher move with knockbackY only, no launchVy → floored to -30.
const floorRider = { type: "launcher", damage: 60, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8 };
{
  const a = mkFighter(100, 1, {}); const t = mkFighter(168, -1);
  startMove(a, "up", floorRider); let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  check("un-tuned launcher (knockbackY only) still floored to -30", t.vy === -30, `vy=${t.vy}`);
}
check("archetype Fast (maki) still honored at -30", launch("maki", getCharacter("maki").basic_attacks.upAttack).enemyVy === -30);
check("archetype Balanced (gojo) still honored at -32", launch("gojo", getCharacter("gojo").basic_attacks.upAttack).enemyVy === -32);
check("archetype Heavy (cell) still honored at -33", launch("cell", getCharacter("cell").basic_attacks.upAttack).enemyVy === -33);
// a giant TARGET still halves the exact-honored launch (-26 → -13)
check("giant target halves Tobirama's exact -26 → -13", launch("tobirama", tobiMd, { giant: true }).enemyVy === -13, `vy=${launch("tobirama", tobiMd, { giant: true }).enemyVy}`);

// ── 3. the down_air SPIKE finisher does NOT consume the air-combo cap (route length is fine) ──
section("3. down_air spike is a SPIKE, not an air-combo hit → does NOT count toward maxAirHits=3");
{
  const cd = getCharacter("tobirama");
  const a = mkFighter(100, 1, cd.basic_attacks);
  const t = mkFighter(168, -1);
  // land a fresh move on t, resetting the per-attack/defender gates the same way the roster test's landMove does
  const land = (key, md) => {
    a.attacking = false; a.currentAttack = null; a.currentMove = null; a.attackCooldown = 0;
    t.hitstun = 0; t.invulnTimer = 0; t.onGround = false; t.grounded = false; t.isLaunched = true;
    if (!startMove(a, key, md)) return false;
    let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--;
    resolveAttackHit(a, t, [], {});
    return !!a.currentAttack?.hasHit;
  };
  // open the launcher (from the ground)
  startMove(a, "up", cd.basic_attacks.upAttack); let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  a.onGround = false; a.grounded = false;   // jump-cancel
  const airHit = land("air", cd.basic_attacks.airAttack);       // air normal = air hit #1
  const afterAir = a.airHits;
  const dnHit = land("down_air", cd.basic_attacks.downAir);     // down_air SPIKE finisher
  check("air normal connected & counted as air hit #1", airHit && afterAir === 1, `hit=${airHit} airHits=${afterAir}`);
  check("down_air spike connected but did NOT increment the air-hit counter (still 1, under cap 3)", dnHit && a.airHits === 1, `hit=${dnHit} airHits=${a.airHits}`);
  check("down_air spikes the foe DOWNWARD (vy > 0)", t.vy > 0, `vy=${t.vy}`);
}

console.log(`\nTobirama launcher-fix: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
