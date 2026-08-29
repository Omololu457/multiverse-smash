// harness/hit_level.test.mjs — UNIT test for the OVERHEAD / HIT-LEVEL attribute (Up Block #4 prerequisite;
// the Up Block reward that reads it is deferred). Proves the REAL combat.js classifier + that startMove
// propagates the tag + that the RIGHT moves are actually tagged in character data (jump-ins classify overhead
// for free; tagged ground overheads classify overhead; everything else stays "mid"). Attribute-only: it must
// change NO blocking/damage/combat — that's covered by the wider regression suite staying green.
import { ensureCombatState, startMove, getHitLevel, isOverheadAttack, getAttackPhase } from "../combat.js";
import { characters } from "../characters.js";

let pass = 0, fail = 0;
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n, e); } };
const section = t => console.log(`\n── ${t} ──`);

const GROUND = { onGround: true, grounded: true };
const AIR = { onGround: false, grounded: false };

section("A. classifier — airborne = overhead (jump-in, free); ground reads the tag; default mid");
check("airborne attacker + untagged move → overhead (jump-in)", getHitLevel(AIR, { name: "light" }) === "overhead");
check("airborne attacker + any move → overhead (level-agnostic while airborne)", getHitLevel(AIR, { hitLevel: "mid" }) === "overhead");
check("grounded + hitLevel:overhead → overhead", getHitLevel(GROUND, { hitLevel: "overhead" }) === "overhead");
check("grounded + hitLevel:low → low (schema-reserved, inert)", getHitLevel(GROUND, { hitLevel: "low" }) === "low");
check("grounded + hitLevel:mid → mid", getHitLevel(GROUND, { hitLevel: "mid" }) === "mid");
check("grounded + untagged → mid (default)", getHitLevel(GROUND, { name: "heavy" }) === "mid");
check("grounded + null atk → mid (safe)", getHitLevel(GROUND, null) === "mid");
check("isOverheadAttack === (level==='overhead') — ground tagged", isOverheadAttack(GROUND, { hitLevel: "overhead" }) === true);
check("isOverheadAttack false for a grounded mid", isOverheadAttack(GROUND, { name: "light" }) === false);
check("isOverheadAttack true for an airborne mid (jump-in)", isOverheadAttack(AIR, { name: "light" }) === true);

section("B. startMove propagates hitLevel onto the LIVE attack (so it reaches combat)");
{
  const f = { rosterKey: "tester", facing: 1, x: 0, y: 0, w: 50, h: 100, onGround: true, grounded: true, health: 100, maxHealth: 100, basic_attacks: {} };
  ensureCombatState(f);
  startMove(f, "heavy", { damage: 50, startup: 4, active: 3, recovery: 8, hitstun: 14, hitLevel: "overhead" });
  check("tagged move → currentAttack.hitLevel = 'overhead'", f.currentAttack?.hitLevel === "overhead", `got ${f.currentAttack?.hitLevel}`);
  check("grounded tagged live attack classifies overhead", isOverheadAttack(f, f.currentAttack) === true);
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0;
  startMove(f, "light", { damage: 40, startup: 4, active: 3, recovery: 8, hitstun: 12 });
  check("untagged move → currentAttack.hitLevel = null (mid)", (f.currentAttack?.hitLevel ?? null) === null, `got ${f.currentAttack?.hitLevel}`);
  check("grounded untagged live attack classifies mid", isOverheadAttack(f, f.currentAttack) === false);
}

section("C. REAL character data — the RIGHT moves are tagged (targeted, not blanket)");
{
  const TAGGED = ["jason", "alt_sukuna", "bardock"];
  for (const k of TAGGED) {
    const ba = characters[k]?.basic_attacks;
    check(`${k}.heavy tagged hitLevel:'overhead' (comment-labelled overhead)`, ba?.heavy?.hitLevel === "overhead", `got ${ba?.heavy?.hitLevel}`);
    check(`${k}.light NOT tagged (a normal jab stays mid)`, (ba?.light?.hitLevel ?? null) === null, `got ${ba?.light?.hitLevel}`);
  }
  // Targeted, not blanket: a spread of OTHER chars have NO hitLevel on their normals (default mid).
  const UNTAGGED = ["goku", "naruto", "gohan", "ippo", "sukuna", "spiderman"];
  let anyLeak = null;
  for (const k of UNTAGGED) {
    const ba = characters[k]?.basic_attacks; if (!ba) continue;
    for (const mv of ["light", "heavy", "up", "air", "down_air"]) if (ba[mv]?.hitLevel) anyLeak = `${k}.${mv}=${ba[mv].hitLevel}`;
  }
  check("untagged sample chars carry NO hitLevel on normals (tagging is targeted)", anyLeak === null, anyLeak ? `LEAK ${anyLeak}` : "clean");
}

section("D. end-to-end — a grounded tagged heavy vs an airborne jump-in, on real char data");
{
  const mk = (key) => { const c = characters[key]; const f = { rosterKey: key, facing: 1, x: 0, y: 0, w: 50, h: 100, onGround: true, grounded: true, health: 1000, maxHealth: 1000, basic_attacks: c.basic_attacks }; ensureCombatState(f); return f; };
  const j = mk("jason");
  startMove(j, "heavy", j.basic_attacks.heavy);
  check("jason grounded heavy (real data) → overhead", isOverheadAttack(j, j.currentAttack) === true, `lvl=${getHitLevel(j, j.currentAttack)}`);
  const g = mk("goku"); g.onGround = false; g.grounded = false;   // airborne
  startMove(g, "light", g.basic_attacks.light);
  check("goku AIRBORNE light (real data) → overhead (jump-in, no tag needed)", isOverheadAttack(g, g.currentAttack) === true);
  const g2 = mk("goku");   // grounded
  startMove(g2, "light", g2.basic_attacks.light);
  check("goku GROUNDED light (real data) → mid", isOverheadAttack(g2, g2.currentAttack) === false, `lvl=${getHitLevel(g2, g2.currentAttack)}`);
}

console.log(`\nHit-Level / Overhead attribute: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
