// harness/boruto_clone.test.mjs — STAGE 4 (Boruto first) evidence: Boruto is now a full clone character and
// inherits the whole shared system (create/dispel, real-hittable clones, consciousness-swap) with HIS OWN body.
// Fast, deterministic unit test (no browser). Proves:
//   1. Boruto is clone-capable with a cap of 3 (a few clones, not his dad's swarm); the 4th spawn is a no-op.
//   2. His clones render BORUTO'S body (CLONE_BODY_SETS.boruto), not the Naruto fallback.
//   3. His clones are REAL hit-objects (Stage 1 revealClonesHitByMelee poofs them — owner-agnostic).
//   4. His clones support the Stage 3 consciousness-swap (position trade, count preserved).
//   5. Existing clone chars are untouched; a non-clone char is still not clone-capable.

import {
  activeSummons, spawnShadowClone, countShadowClones,
  isCloneCapable, getCloneCap, revealClonesHitByMelee, swapConsciousnessWithClone
} from "../summons.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
function reset() { activeSummons.length = 0; }
const OWNER = () => ({ rosterKey: "boruto", x: 500, y: 400, w: 60, h: 90, facing: 1 });
const OPP = { x: 100, y: 400, w: 60, h: 90 };
function liveClone(owner, x = 520, y = 400) { const s = spawnShadowClone(owner, OPP); if (s) { s._state = "idle"; s._hidden = false; s.x = x; s.y = y; } return s; }

// ── 1. Capability + cap ──
section("Boruto is clone-capable (cap 3, 4th spawn no-op)");
{
  check("boruto is clone-capable", isCloneCapable({ rosterKey: "boruto" }) === true);
  check("boruto clone cap is 3", getCloneCap({ rosterKey: "boruto" }) === 3, `cap=${getCloneCap({ rosterKey: "boruto" })}`);
  reset();
  const o = OWNER();
  for (let i = 0; i < 4; i++) spawnShadowClone(o, OPP);   // spawn 4 → cap at 3
  check("spawning past the cap is a no-op (count = 3)", countShadowClones(o) === 3, `count=${countShadowClones(o)}`);
}

// ── 2. His clones use BORUTO'S body, not the Naruto fallback ──
section("Clones render Boruto's own body");
{
  reset();
  const o = OWNER();
  const c = spawnShadowClone(o, OPP);
  check("clone idle sheet is a Boruto sheet (not naruto fallback)", typeof c.sheet === "string" && c.sheet.includes("boruto"), `sheet=${c.sheet}`);
}

// ── 3. His clones are REAL hit-objects (Stage 1) ──
section("Boruto clones are reliably hittable (Stage 1 real-hit path)");
{
  reset();
  const o = OWNER();
  const clone = liveClone(o, 160, 360);   // place where a standard attacker hitbox covers it
  const attacker = { rosterKey: "sasuke", facing: 1, x: 100, y: 400, w: 50, h: 100,
    currentAttack: { name: "light", rangeX: 60, rangeY: 40, total: 10, timer: 5, activeStart: 0, activeEnd: 10, hasHit: false } };
  revealClonesHitByMelee(attacker);
  check("an overlapping melee swing poofs the Boruto clone", clone._state === "hurt", `state=${clone._state}`);
  check("the swing was spent on the fake (hasHit)", attacker.currentAttack.hasHit === true);
}

// ── 4. Consciousness-swap works for Boruto (Stage 3) ──
section("Boruto supports the consciousness-swap");
{
  reset();
  const o = OWNER();
  liveClone(o, 200);
  const far = liveClone(o, 900);   // farthest from opponent → chosen
  const before = countShadowClones(o);
  const chosen = swapConsciousnessWithClone(o, OPP);
  check("swap succeeds and picks the far clone", chosen === far && o.x === 900, `owner.x=${o.x}`);
  check("clone count preserved across the trade", countShadowClones(o) === before, `count=${countShadowClones(o)}`);
}

// ── 5. No collateral drift ──
section("No drift on other characters");
{
  check("the original clone chars are still capable", ["naruto", "minato", "hashirama", "tobirama"].every(k => isCloneCapable({ rosterKey: k })));
  check("a non-clone char (sasuke) is still not capable", isCloneCapable({ rosterKey: "sasuke" }) === false);
  check("naruto cap unchanged (4)", getCloneCap({ rosterKey: "naruto" }) === 4);
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  boruto_clone: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
