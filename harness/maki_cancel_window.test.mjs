// harness/maki_cancel_window.test.mjs — "HEAVENLY VOW" evidence: Maki's DELIBERATELY TIGHTENED combo
// cancel window, implemented as a PER-CHARACTER override on the shared combo-flow cancel layer. Imports
// combat.js + abilities.js directly (fast, deterministic — no browser). Proves:
//   1. The override is OPT-IN & per-fighter: default (unset) fighters keep the FULL recovery-phase window
//      exactly as before — the shared default is UNCHANGED for the whole rest of the roster.
//   2. A fighter with `_cancelWindowFrames = W` links ONLY in the first W frames of recovery; a LATE edge
//      (still inside recovery, but past frame W) is REJECTED. Side-by-side, the same late edge on a
//      default fighter still cancels → the narrowing is real and enforced, not cosmetic.
//   3. The tight window is SCOPED TO MAKI: her real command path (updateMakiCommandCombat → fireMakiCommand)
//      stamps _cancelWindowFrames = 5; Miwa's identical rekka path (updateMiwaCommandCombat) does NOT — the
//      override does not leak to any other command-chain character.

import {
  ensureCombatState, startMove, getAttackPhase, getCancelWindow, rekkaContinue, cancelWindowOpen
} from "../combat.js";
import { updateMakiCommandCombat, updateMiwaCommandCombat } from "../abilities.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

function mkFighter(over = {}) {
  const f = { rosterKey: "tester", facing: 1, x: 100, y: 400, w: 50, h: 100, onGround: true,
    health: 1000, maxHealth: 1000, basic_attacks: {}, ...over };
  ensureCombatState(f);
  return f;
}
// Put a fighter into `md` and advance to the requested phase; then step N more frames INTO that phase.
function intoMove(f, md, phase, extraFrames = 0) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0;
  startMove(f, md.name || "m", md);
  let guard = 0;
  while (getAttackPhase(f) !== phase && guard++ < 300) f.currentAttack.timer--;
  for (let i = 0; i < extraFrames; i++) f.currentAttack.timer--;
  return f;
}
// frames elapsed since recovery began, for a fighter currently in recovery
const intoRecovery = f => (f.currentAttack.total - f.currentAttack.timer) - f.currentAttack.activeEnd;

const MD = { name: "g1", startup: 4, active: 3, recovery: 12, damage: 30, hitstun: 12, category: "heavy", rekkaNext: "g2" };

// ── 1. Default (no override) — the FULL recovery window is preserved (unchanged roster default) ──
section("default fighter — whole recovery phase is the cancel window (unchanged)");
{
  const f = mkFighter();
  intoMove(f, MD, "recovery", 0);
  let cw = getCancelWindow(f);
  check("windowFrames == full recovery (12)", cw.windowFrames === 12 && cw.recovery === 12, `windowFrames=${cw.windowFrames} recovery=${cw.recovery}`);
  check("open at recovery frame 0", cw.open === true, `into=${intoRecovery(f)}`);
  intoMove(f, MD, "recovery", 9);   // late — frame 9 of a 12-frame recovery
  cw = getCancelWindow(f);
  check("still open at recovery frame 9 (full window)", cw.open === true && cancelWindowOpen(f) === true, `into=${intoRecovery(f)} open=${cw.open}`);
}

// ── 2. Override fighter — link ONLY in the first W=5 frames of recovery ──
section("override fighter (_cancelWindowFrames=5) — tight link, late edge rejected");
{
  const f = mkFighter({ _cancelWindowFrames: 5 });
  intoMove(f, MD, "recovery", 0);
  let cw = getCancelWindow(f);
  check("windowFrames narrowed to 5 (recovery still reported 12)", cw.windowFrames === 5 && cw.recovery === 12, `windowFrames=${cw.windowFrames} recovery=${cw.recovery}`);
  check("open at recovery frame 0 (early — in window)", cw.open === true, `into=${intoRecovery(f)}`);
  intoMove(f, MD, "recovery", 4); check("open at recovery frame 4 (last in-window frame)", cancelWindowOpen(f) === true, `into=${intoRecovery(f)}`);
  intoMove(f, MD, "recovery", 5); check("CLOSED at recovery frame 5 (just past window)", cancelWindowOpen(f) === false, `into=${intoRecovery(f)}`);
  intoMove(f, MD, "recovery", 9); check("CLOSED at recovery frame 9 (late, still in recovery)", cancelWindowOpen(f) === false, `into=${intoRecovery(f)}`);
}

// ── 3. rekkaContinue enforcement — same late edge: default CANCELS, tight fighter DROPS ──
section("rekkaContinue — the tightened window is actually ENFORCED at the gate");
function primeAt(over, extra) {
  const f = mkFighter(over);
  intoMove(f, MD, "recovery", extra);
  f._rekkaNext = "g2"; f._cmdHitLanded = true;   // queued + connected
  return f;
}
{
  const early = primeAt({ _cancelWindowFrames: 5 }, 2);
  const nEarly = rekkaContinue(early, { edge: true, phase: "recovery", opponent: { hitstun: 5 }, requireHit: true });
  check("tight fighter: EARLY edge (recovery frame 2) → cancels into next", nEarly === "g2", `next=${nEarly}`);

  const late = primeAt({ _cancelWindowFrames: 5 }, 8);
  const nLate = rekkaContinue(late, { edge: true, phase: "recovery", opponent: { hitstun: 5 }, requireHit: true });
  check("tight fighter: LATE edge (recovery frame 8) → chain DROPS (no cancel)", nLate === null && late.attacking === true, `next=${nLate}`);

  const dflt = primeAt({}, 8);   // SAME late timing, but no override
  const nDflt = rekkaContinue(dflt, { edge: true, phase: "recovery", opponent: { hitstun: 5 }, requireHit: true });
  check("default fighter: SAME late edge → still cancels (full window) — proves narrowing is per-char", nDflt === "g2", `next=${nDflt}`);
}

// ── 4. Scoped to Maki — real command path stamps it; Miwa's identical path does NOT ──
section("scope — real code stamps Maki only, not Miwa");
const getPhase = f => getAttackPhase(f);
function mkRoster(rosterKey) {
  const f = mkFighter({ rosterKey });
  f.attacking = false; f.currentMove = null; f.currentAttack = null; f.attackCooldown = 0; f._cmdPrevHeavy = false;
  return f;
}
function driveOpener(f, updateFn) {
  const ctx = { getOpponent: () => ({ hitstun: 0, health: 1000 }) };
  // Fwd (facing 1 → right) + fresh Heavy edge from neutral → fires the G1 opener.
  return updateFn(f, { heavy: true, right: true, left: false }, ctx, getPhase);
}
{
  const maki = mkRoster("maki");
  const firedMaki = driveOpener(maki, updateMakiCommandCombat);
  check("Maki opener fired (makiG1)", firedMaki === true && maki.currentMove === "makiG1", `move=${maki.currentMove}`);
  check("Maki fighter STAMPED _cancelWindowFrames = 5", maki._cancelWindowFrames === 5, `_cancelWindowFrames=${maki._cancelWindowFrames}`);

  const miwa = mkRoster("miwa");
  const firedMiwa = driveOpener(miwa, updateMiwaCommandCombat);
  check("Miwa opener fired (miwaG1)", firedMiwa === true && miwa.currentMove === "miwaG1", `move=${miwa.currentMove}`);
  check("Miwa fighter did NOT set _cancelWindowFrames (no leak)", miwa._cancelWindowFrames === undefined, `_cancelWindowFrames=${miwa._cancelWindowFrames}`);
  check("→ Miwa keeps the full-recovery default window", (() => { miwa.currentAttack.timer = miwa.currentAttack.total - miwa.currentAttack.activeEnd - 1; return getAttackPhase(miwa) === "recovery" ? cancelWindowOpen(miwa) === true : true; })(), "full window preserved for other command-chain chars");
}

console.log(`\n════════════════════════════════════════════`);
console.log(`  MAKI CANCEL-WINDOW (Heavenly Vow tight link): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
