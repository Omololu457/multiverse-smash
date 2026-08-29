// harness/flawless_block.test.mjs — UNIT test for MK1-style FLAWLESS BLOCK. Drives the REAL combat.js
// resolveAttackHit block branch + the isFlawlessBlock classifier. Proves: a FRESH guard (small
// _blockHeldFrames) negates chip AND collapses blockstun (a punish window); a HELD/late guard is a
// normal block (full chip + blockstun) exactly as before. Also asserts the interaction invariants the
// owner asked to protect: block ends the attacker's combo + clears the starter tier (so flawless block
// terminates a launcher-opened string — complements, never fights, the starter-weighted scaling), and
// the flawless window is small enough that the 10f input buffer (which does NOT touch block anyway)
// can't trivialize it.
import { ensureCombatState, startMove, resolveAttackHit, getAttackPhase, isFlawlessBlock, FLAWLESS_BLOCK } from "../combat.js";
import { INPUT_BUFFER_FRAMES as BUF } from "../input.js";

let pass = 0, fail = 0;
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n, e); } };
const section = t => console.log(`\n── ${t} ──`);

function mkFighter(side, x, extra = {}) {
  const f = { side, rosterKey: "tester", facing: extra.facing ?? 1, x, y: 400, w: 50, h: 100, vx: 0, vy: 0,
    onGround: true, health: 100000, maxHealth: 100000, energy: 100, maxEnergy: 100, basic_attacks: {} };
  ensureCombatState(f);
  return f;
}
// Land one melee hit onto a guarding target with a given _blockHeldFrames. Returns the block outcome.
function blockHit(md, blockHeldFrames, atkExtra = {}) {
  const a = mkFighter("p1", 100), t = mkFighter("p2", 150, { facing: -1 });
  Object.assign(a, atkExtra);
  a.comboCounter = 5; a._comboStarterTier = 2; a.comboTimer = 90;   // pretend a launcher-opened string is in progress
  t.isBlocking = true; t._blockHeldFrames = blockHeldFrames;
  const hp0 = t.health;
  startMove(a, "light", md);
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 60) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  return { chip: hp0 - t.health, blockstun: t.blockstun, flawless: t._lastBlockFlawless, atkCombo: a.comboCounter, atkStarter: a._comboStarterTier };
}

const MD = { damage: 100, startup: 2, active: 3, recovery: 8, hitstun: 16, category: "light" };
const SP = { damage: 120, startup: 2, active: 3, recovery: 8, hitstun: 16, category: "special", isSpecial: true };

section("A. classifier — fresh guard is flawless, held guard is not");
check(`window = ${FLAWLESS_BLOCK.window} frames (small, skillful)`, FLAWLESS_BLOCK.window >= 2 && FLAWLESS_BLOCK.window <= 5, `${FLAWLESS_BLOCK.window}`);
for (let n = 1; n <= FLAWLESS_BLOCK.window; n++) check(`_blockHeldFrames=${n} → flawless`, isFlawlessBlock({ _blockHeldFrames: n }) === true);
for (const n of [FLAWLESS_BLOCK.window + 1, 6, 10, 30]) check(`_blockHeldFrames=${n} → NOT flawless`, isFlawlessBlock({ _blockHeldFrames: n }) === false);
check("undefined held-count → NOT flawless (safe default)", isFlawlessBlock({}) === false);

section("B. FLAWLESS block (fresh guard) — chip NEGATED + blockstun collapsed to a punish window");
{
  const r = blockHit(MD, 1);
  check("flawless flagged", r.flawless === true, JSON.stringify(r));
  check("chip damage = 0 (negated)", r.chip === 0, `chip=${r.chip}`);
  check(`blockstun collapsed to ${FLAWLESS_BLOCK.blockstun} (punish window)`, r.blockstun === FLAWLESS_BLOCK.blockstun, `blockstun=${r.blockstun}`);
}

section("C. NORMAL block (held guard) — unchanged: full chip + full blockstun");
{
  const r = blockHit(MD, 20);
  check("not flawless", r.flawless === false, JSON.stringify(r));
  check("chip damage > 0 (20% melee, as before)", r.chip > 0, `chip=${r.chip}`);
  check("blockstun = 10 (melee, as before)", r.blockstun === 10, `blockstun=${r.blockstun}`);
}
{
  const r = blockHit(SP, 20);
  check("special normal-block chip > 0 (12%)", r.chip > 0, `chip=${r.chip}`);
  check("special normal-block blockstun = 14 (10+4, as before)", r.blockstun === 14, `blockstun=${r.blockstun}`);
}
{
  const r = blockHit(SP, 1);
  check("special FLAWLESS → chip 0 + blockstun collapsed", r.chip === 0 && r.blockstun === FLAWLESS_BLOCK.blockstun, JSON.stringify(r));
}

section("D. INTERACTION — a (flawless) block terminates a launcher-opened string (complements starter scaling)");
{
  const r = blockHit(MD, 1);
  check("attacker comboCounter reset to 0 on block", r.atkCombo === 0, `combo=${r.atkCombo}`);
  check("attacker _comboStarterTier cleared on block (starter penalty ends with the string)", r.atkStarter === 0, `starter=${r.atkStarter}`);
}

section("E. INTERACTION — buffer independence");
check("input buffer is 10f but block is UNBUFFERED, and the flawless window is far tighter", BUF === 10 && FLAWLESS_BLOCK.window < BUF, `buf=${BUF} window=${FLAWLESS_BLOCK.window}`);

console.log(`\nFlawless Block: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
