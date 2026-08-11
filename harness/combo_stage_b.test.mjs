// harness/combo_stage_b.test.mjs — COMBO-STRING STANDARDIZATION, Stage B behavioral proof.
//
// Drives the REAL command-normal driver functions for the 8 converted characters and asserts, against
// the live engine, that each now:
//   • OPENS its ground chain on FORWARD+Heavy (fires a stage, queues _rekkaNext, enters `attacking`), and
//   • NO LONGER opens on DOWN+Heavy (the old input is inert for the chain — falls through to normals).
// Also spot-proves a genuine Fwd+Heavy control (Superman) still opens, and a Down-opener SANITY that the
// facing flip works (facing = -1 → forward is LEFT).
//
// This is the evidence that Stage B changed BEHAVIOR, not just comments/registry. Run: `npm run test:combo-stage-b`.

import { ensureCombatState, getAttackPhase } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";
import {
  updateNeteroCommandCombat, updateKilluaCommandCombat, updateHisokaCommandCombat,
  updateFlashCommandCombat, updateGonCommandCombat, updateBatmanCommandCombat,
  updateZenitsuCommandCombat, updateGhostfaceCommandCombat, updateSupermanCommandCombat,
} from "../abilities.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };
const group = t => console.log(`\n═══ ${t} ═══`);

physics.setGroundY(400);

function mkFighter(key, facing = 1) {
  const c = getCharacter(key);
  const f = {
    rosterKey: key, facing, x: 100, y: 340, w: 60, h: 90,
    onGround: true, grounded: true, vx: 0, vy: 0,
    energy: 100, maxEnergy: 100, attackCooldown: 0, attacking: false, currentMove: null,
    basic_attacks: c?.basic_attacks || {}, controls: {},
  };
  ensureCombatState(f);
  f.attacking = false; f.currentMove = null; f.attackCooldown = 0;   // ensureCombatState may set defaults
  return f;
}
// A fresh opponent + minimal context/phase the drivers expect.
const ctx = () => ({ getOpponent: () => mkFighter("goku") });
const phase = getAttackPhase;

// inputState builders (heavyEdge needs _cmdPrevHeavy=false, which a fresh fighter satisfies).
const FWD  = { heavy: true, right: true,  left: false, down: false };   // facing=1 → right = forward
const DOWN = { heavy: true, right: false, left: false, down: true  };
const BACK = { heavy: true, right: false, left: true,  down: false };   // right/left flip with facing

const DRIVERS = [
  ["netero",    updateNeteroCommandCombat],
  ["killua",    updateKilluaCommandCombat],
  ["hisoka",    updateHisokaCommandCombat],
  ["flash",     updateFlashCommandCombat],
  ["gon",       updateGonCommandCombat],
  ["batman",    updateBatmanCommandCombat],
  ["zenitsu",   updateZenitsuCommandCombat],
  ["ghostface", updateGhostfaceCommandCombat],
];

group("Forward+Heavy OPENS the converted chain (fires a stage)");
for (const [key, driver] of DRIVERS) {
  const f = mkFighter(key);
  const fired = driver(f, FWD, ctx(), phase);
  check(`${key}: Fwd+Heavy opens the chain`,
        fired === true && f.attacking === true && f._rekkaNext != null,
        `fired=${fired} attacking=${f.attacking} _rekkaNext=${f._rekkaNext}`);
}

group("Down+Heavy NO LONGER opens the chain (converted away)");
for (const [key, driver] of DRIVERS) {
  const f = mkFighter(key);
  const fired = driver(f, DOWN, ctx(), phase);
  check(`${key}: Down+Heavy does NOT open the chain`,
        fired === false && f.attacking === false && f._rekkaNext == null,
        `fired=${fired} attacking=${f.attacking} _rekkaNext=${f._rekkaNext}`);
}

group("Facing-relative: forward = LEFT when facing = -1");
for (const [key, driver] of DRIVERS) {
  const f = mkFighter(key, -1);
  const fired = driver(f, BACK, ctx(), phase);   // holding LEFT while facing left = forward
  check(`${key}: Back-key (=forward when facing left) opens the chain`,
        fired === true && f.attacking === true,
        `fired=${fired} attacking=${f.attacking}`);
}

group("Control: a genuine Fwd+Heavy char (Superman) is unaffected");
{
  const f = mkFighter("superman");
  const fired = driver_open(updateSupermanCommandCombat, f, FWD);
  check("superman: Fwd+Heavy still opens", fired === true && f.attacking === true, `fired=${fired}`);
  const g = mkFighter("superman");
  const firedD = driver_open(updateSupermanCommandCombat, g, DOWN);
  check("superman: Down+Heavy still inert (always was Fwd)", firedD === false && g.attacking === false, `fired=${firedD}`);
}
function driver_open(driver, f, input) { return driver(f, input, ctx(), phase); }

console.log(`\n════════════════════════════════════════`);
console.log(`  COMBO STAGE B (opener conversion): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
