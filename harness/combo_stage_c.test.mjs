// harness/combo_stage_c.test.mjs — COMBO-STRING STANDARDIZATION, Stage C behavioral proof.
//
// Drives each converted chain (netero/ghostface/shinobu/inosuke/tobirama) through the REAL driver +
// shared rekkaContinue, stage by stage, to its FINISHER — then asserts:
//   • the finisher's live attack carries `launcher: true` (propagated from the move-def), and
//   • resolving that finisher against a dummy LAUNCHES it (isLaunched, upward vy, no horizontal shove) —
//     the universal launcher path (combat.js), the same one flash's rush2 finisher uses.
// This is the evidence that Stage C changed BEHAVIOR (heavy ender → juggle-starting launcher), not just data.
// Run: `npm run test:combo-stage-c`.

import { ensureCombatState, getAttackPhase, resolveAttackHit } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";
import {
  updateNeteroCommandCombat, updateGhostfaceCommandCombat, updateShinobuCommandCombat,
  updateInosukeCommandCombat, updateTobiramaCommandCombat,
} from "../abilities.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };
const group = t => console.log(`\n═══ ${t} ═══`);

physics.setGroundY(400);

function mkFighter(key, facing = 1, x = 100) {
  const c = getCharacter(key);
  const f = {
    rosterKey: key, facing, x, y: 340, w: 60, h: 90,
    onGround: true, grounded: true, vx: 0, vy: 0,
    energy: 100, maxEnergy: 100, attackCooldown: 0, attacking: false, currentMove: null,
    basic_attacks: c?.basic_attacks || {}, controls: {},
  };
  ensureCombatState(f);
  f.attacking = false; f.currentMove = null; f.attackCooldown = 0;
  return f;
}
const FWD = { heavy: true, right: true, left: false, down: false };

// Drive a chain to its finisher: fire the opener, then advance stage-by-stage by latching a clean connect
// (_cmdHitLanded) + forcing the current move into RECOVERY + a fresh Heavy edge, exactly what the shared
// rekkaContinue gate wants. Returns the fighter parked on its FINISHER's live attack.
function driveToFinisher(key, driver) {
  const f = mkFighter(key);
  const opp = mkFighter("goku", -1, 168);
  const ctx = { getOpponent: () => opp };
  const fired = driver(f, FWD, ctx, getAttackPhase);
  if (!fired) return { f, ok: false, why: "opener did not fire" };
  let guard = 0;
  while (f._rekkaNext && guard++ < 12) {
    f._cmdHitLanded = true;               // simulate a clean connect (rekkaContinue's cancel gate)
    f.currentAttack.timer = 1;            // force RECOVERY phase (getAttackPhase: e = total - timer is large)
    f._cmdPrevHeavy = false;              // let the next Heavy read as a fresh EDGE
    const adv = driver(f, FWD, ctx, getAttackPhase);
    if (!adv) return { f, ok: false, why: `stalled at ${f.currentMove}` };
  }
  return { f, ok: true };
}

const CHAINS = [
  ["netero",    updateNeteroCommandCombat],
  ["ghostface", updateGhostfaceCommandCombat],
  ["shinobu",   updateShinobuCommandCombat],
  ["inosuke",   updateInosukeCommandCombat],
  ["tobirama",  updateTobiramaCommandCombat],
];

group("Chain reaches a LAUNCHER finisher");
const parked = {};
for (const [key, driver] of CHAINS) {
  const r = driveToFinisher(key, driver);
  parked[key] = r;
  check(`${key}: chain drives to finisher (${r.f.currentMove})`, r.ok, r.ok ? r.f.currentMove : r.why);
  check(`${key}: finisher attack has launcher=true`, r.ok && r.f.currentAttack?.launcher === true,
        `launcher=${r.f.currentAttack?.launcher} move=${r.f.currentMove}`);
}

group("Finisher LAUNCHES the opponent (straight-up, no horizontal shove)");
for (const [key] of CHAINS) {
  const r = parked[key];
  if (!r?.ok) { check(`${key}: finisher launches dummy`, false, "chain did not reach finisher"); continue; }
  const f = r.f;
  // Put the finisher into its ACTIVE window and stand a fresh dummy inside the hitbox, then resolve.
  const a = f.currentAttack;
  a.timer = a.total - a.activeStart;      // e = total - timer = activeStart → "active"
  const dummy = mkFighter("goku", -1, f.x + 40);
  dummy.vy = 0; dummy.vx = 0; dummy.isLaunched = false; dummy.onGround = true;
  resolveAttackHit(f, dummy, [], { stageWidth: 2400, damageNumbers: [] });
  check(`${key}: dummy is launched upward`, dummy.isLaunched === true && dummy.vy < 0,
        `isLaunched=${dummy.isLaunched} vy=${dummy.vy?.toFixed(1)}`);
  check(`${key}: launcher pops STRAIGHT up (no horizontal shove)`, dummy.vx === 0, `vx=${dummy.vx}`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`  COMBO STAGE C (finisher → launcher): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
