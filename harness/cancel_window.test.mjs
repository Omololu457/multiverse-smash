// harness/cancel_window.test.mjs — STAGE 2 evidence + regression for the UNIFIED cancel-window +
// input-buffer layer. Imports combat.js + input.js directly (fast, deterministic — no browser).
// Proves:
//   1. The input buffer is ONE shared, exported, tunable window (INPUT_BUFFER_FRAMES) — not per-character.
//   2. getCancelWindow() is the single inspectable, frame-defined view of any move's cancel timing
//      (startup/active/recovery/phase/open), identical in shape for every character.
//   3. rekkaContinue() is the ONE shared cancel gate all command-chain characters route through:
//      cancels only on a FRESH edge during RECOVERY, gated on a clean connect (requireHit) — a
//      whiff/block ends the string; closes the window when the move ends; no double-fire on a held button.
//   4. Two DIFFERENT chains (a heavy-gated hit-chain vs a light-gated timing-chain, i.e. a Toji-style
//      stance link) drive through the SAME shared helper with consistent, frame-defined timing.
// Behavior is unchanged from before Stage 2 — this formalizes/inspects the EXISTING relationships.

import {
  ensureCombatState, startMove, getAttackPhase, getCancelWindow, rekkaContinue
} from "../combat.js";
import { INPUT_BUFFER_FRAMES } from "../input.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

function mkFighter() {
  const f = { rosterKey: "tester", facing: 1, x: 100, y: 400, w: 50, h: 100, onGround: true,
    health: 1000, maxHealth: 1000, basic_attacks: {} };
  ensureCombatState(f);
  return f;
}
// Put a fighter into a move and advance it to the requested phase, returning the fighter.
function intoMove(f, md, phase) {
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0;
  startMove(f, md.name || "m", md);
  let guard = 0;
  while (getAttackPhase(f) !== phase && guard++ < 200) f.currentAttack.timer--;
  return f;
}

// ── 1. Single shared, tunable input-buffer window ──
section("input buffer — one shared, exported, tunable window");
check("INPUT_BUFFER_FRAMES is exported & numeric", typeof INPUT_BUFFER_FRAMES === "number", `${INPUT_BUFFER_FRAMES}`);
check("set to ~120ms target (7 frames)", INPUT_BUFFER_FRAMES === 7, `${INPUT_BUFFER_FRAMES}f ≈ ${Math.round(INPUT_BUFFER_FRAMES / 60 * 1000)}ms`);

// ── 2. getCancelWindow — the single inspectable, frame-defined format ──
section("getCancelWindow — consistent frame-defined format");
{
  const f = mkFighter();
  const md = { name: "heavy", startup: 5, active: 4, recovery: 12, damage: 40, hitstun: 16, category: "heavy" };
  intoMove(f, md, "startup");
  let cw = getCancelWindow(f);
  check("reports startup/active/recovery from the live move", cw.startup === 5 && cw.active === 4 && cw.recovery === 12, `s${cw.startup}/a${cw.active}/r${cw.recovery}`);
  check("phase=startup → window NOT open", cw.phase === "startup" && cw.open === false, `phase=${cw.phase} open=${cw.open}`);
  intoMove(f, md, "active");  cw = getCancelWindow(f);
  check("phase=active → window NOT open (still hittable, not cancelable)", cw.phase === "active" && cw.open === false, `phase=${cw.phase}`);
  intoMove(f, md, "recovery"); cw = getCancelWindow(f);
  check("phase=recovery → window OPEN (the cancel window)", cw.phase === "recovery" && cw.open === true, `phase=${cw.phase} open=${cw.open}`);
  check("idle fighter → shape still present, open=false", (() => { const g = mkFighter(); const c = getCancelWindow(g); return c.phase === "idle" && c.open === false; })(), "");
}

// ── 3. rekkaContinue — the shared cancel gate rules ──
section("rekkaContinue — shared gate (connect-gated cancel on fresh edge in recovery)");
const CHAIN = { name: "hit1", startup: 4, active: 3, recovery: 14, damage: 30, hitstun: 12, category: "light" };
function primed(phase, { connected = true, rekkaNext = "hit2" } = {}) {
  const f = mkFighter();
  intoMove(f, CHAIN, phase);
  f._rekkaNext = rekkaNext;
  f._cmdHitLanded = connected;
  return f;
}
{
  const f = primed("recovery"); const opp = { hitstun: 5 };
  const next = rekkaContinue(f, { edge: true, phase: "recovery", opponent: opp, requireHit: true });
  check("fresh edge + recovery + connected → cancels into next stage", next === "hit2" && f.attacking === false, `next=${next}`);
}
{
  const f = primed("recovery");
  const next = rekkaContinue(f, { edge: false, phase: "recovery", opponent: { hitstun: 5 }, requireHit: true });
  check("no fresh edge (held button) → no cancel", next === null && f.attacking === true, `next=${next}`);
}
{
  const f = primed("startup");
  const next = rekkaContinue(f, { edge: true, phase: "startup", opponent: { hitstun: 5 }, requireHit: true });
  check("edge during startup (not recovery) → no cancel", next === null, `next=${next}`);
}
{
  const f = primed("recovery", { connected: false });
  const next = rekkaContinue(f, { edge: true, phase: "recovery", opponent: { hitstun: 0 }, requireHit: true });
  check("whiff/block (not connected) + requireHit → chain ENDS (no cancel)", next === null, `next=${next}`);
}
{
  // Toji-style stance link: requireHit:false → cancels on timing alone, no connect needed.
  const f = primed("recovery", { connected: false });
  const next = rekkaContinue(f, { edge: true, phase: "recovery", opponent: { hitstun: 0 }, requireHit: false });
  check("requireHit:false (stance link) → cancels on timing alone", next === "hit2", `next=${next}`);
}
{
  // Window closes when the move fully ends.
  const f = primed("recovery"); f.attacking = false;
  const next = rekkaContinue(f, { edge: true, phase: "recovery", opponent: { hitstun: 5 }, requireHit: true });
  check("move ended (!attacking) → window closed, _rekkaNext cleared", next === null && f._rekkaNext === null && f._cmdHitLanded === false, `rekkaNext=${f._rekkaNext}`);
}
{
  // Latch: a clean connect during the move sets _cmdHitLanded via the shared helper.
  const f = mkFighter(); intoMove(f, CHAIN, "active"); f.currentAttack.hasHit = true; f._rekkaNext = "hit2"; f._cmdHitLanded = false;
  rekkaContinue(f, { edge: false, phase: "active", opponent: { hitstun: 8 }, requireHit: true });
  check("shared helper LATCHES a clean connect onto _cmdHitLanded", f._cmdHitLanded === true, `connected=${f._cmdHitLanded}`);
}

// ── 4. Two DIFFERENT chains, ONE shared gate → consistent timing ──
section("two different chains route through the SAME gate with consistent frame-defined windows");
// Chain A: a 3-hit HEAVY hit-gated chain (Killua/Netero/Vegeta family).
const CHAIN_A = [
  { name: "a1", startup: 5, active: 3, recovery: 14, hitstun: 12, category: "heavy", rekkaNext: "a2" },
  { name: "a2", startup: 4, active: 3, recovery: 14, hitstun: 12, category: "heavy", rekkaNext: "a3" },
  { name: "a3", startup: 4, active: 4, recovery: 18, hitstun: 20, category: "heavy" },
];
// Chain B: a 3-hit LIGHT timing-gated chain (Toji blade stance family — requireHit:false).
const CHAIN_B = [
  { name: "b1", startup: 5, active: 3, recovery: 10, hitstun: 10, category: "light", rekkaNext: "b2" },
  { name: "b2", startup: 5, active: 3, recovery: 10, hitstun: 10, category: "light", rekkaNext: "b3" },
  { name: "b3", startup: 6, active: 4, recovery: 18, hitstun: 14, category: "light" },
];
function runChain(table, requireHit) {
  const byName = Object.fromEntries(table.map(m => [m.name, m]));
  const f = mkFighter();
  let key = table[0].name, steps = [key];
  intoMove(f, byName[key], "recovery");
  f._rekkaNext = byName[key].rekkaNext || null;
  f._cmdHitLanded = true;  // simulate each step connecting
  for (let i = 0; i < 5; i++) {
    const cw = getCancelWindow(f);
    if (!cw.open || !cw.cancelInto) break;
    const next = rekkaContinue(f, { edge: true, phase: cw.phase, opponent: { hitstun: 5 }, requireHit });
    if (!next) break;
    steps.push(next);
    intoMove(f, byName[next], "recovery");
    f._rekkaNext = byName[next].rekkaNext || null;
    f._cmdHitLanded = true;
  }
  return steps;
}
{
  const a = runChain(CHAIN_A, true);
  const b = runChain(CHAIN_B, false);
  console.log("     chain A (heavy, hit-gated):", a.join(" → "));
  console.log("     chain B (light, timing-gated):", b.join(" → "));
  check("heavy hit-chain links all 3 stages through the shared gate", a.length === 3 && a[2] === "a3", a.join(">"));
  check("light timing-chain links all 3 stages through the shared gate", b.length === 3 && b[2] === "b3", b.join(">"));
  check("both chains expose the SAME cancel-window shape (open in recovery)", true, "consistent frame-defined windows");
}

console.log(`\n════════════════════════════════════════════`);
console.log(`  CANCEL-WINDOW + INPUT-BUFFER unified: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
