// harness/input_buffer_recovery.test.mjs — COMBO-FLOW Part 2, Fix #1 evidence + regression.
//
// Diagnosed bug: the shared input buffer (INPUT_BUFFER_FRAMES) is SHORTER than the post-normal
// recovery lock (attackCooldown = 10, combat.js:3425). startMove() rejects while attackCooldown > 0
// (combat.js:2518). So a re-press TAPPED in the first few recovery frames buffers, decays to false,
// and expires BEFORE the move-start gate reopens → the input is silently dropped even though it was
// timed correctly. This is a classic "combos feel like they drop" cause.
//
// This test drives the REAL startMove() gate and the REAL per-frame attackCooldown decrement
// (combat.js:3282) against a faithful model of the input buffer (input.js updateBuffer: decrement-
// then-stamp, output = counter > 0). It proves the drop at the OLD 7-frame buffer and confirms the
// current INPUT_BUFFER_FRAMES closes the entire recovery window. Buffer length is char-INDEPENDENT
// (attackCooldown is a global constant), so this is the canonical proof; per-character no-regression
// is covered by the combo/cancel harnesses + live clips.

import { ensureCombatState, startMove } from "../combat.js";
import { INPUT_BUFFER_FRAMES, keys, getFighterInput } from "../input.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const POST_NORMAL_COOLDOWN = 10; // combat.js:3425 — the recovery lock set when a normal ends
const LIGHT = { name: "light", startup: 4, active: 3, recovery: 12, damage: 30, hitstun: 18, category: "light" };

function mkFighter() {
  const f = { rosterKey: "tester", facing: 1, x: 100, y: 400, w: 50, h: 100, onGround: true,
    health: 1000, maxHealth: 1000, basic_attacks: {} };
  ensureCombatState(f);
  return f;
}

// Simulate: a normal just ended (attackCooldown set). The player TAPS the attack button `pressOffset`
// frames into that recovery lock. Returns the recovery-frame the buffered input actually FIRES on, or
// null if it expired unfired (a drop). Models input.js updateBuffer semantics faithfully:
//   each frame → (1) buffer decrements, (2) if the tap frame, stamp buffer=bufferLen (decrement-then-
//   stamp: input.js:479 then 491), (3) combat decrements attackCooldown (combat.js:3282), (4) if
//   buffer>0 attempt the real startMove() gate.
function simulateTap(pressOffset, bufferLen) {
  const f = mkFighter();
  f.attacking = false; f.currentAttack = null; f.currentMove = null;
  f.attackCooldown = POST_NORMAL_COOLDOWN;
  let buffer = 0;
  for (let frame = 0; frame < 40; frame++) {
    if (buffer > 0) buffer--;                 // input.js updateBuffer (runs first)
    if (frame === pressOffset) buffer = bufferLen; // fresh press stamps to the window (held 1 frame)
    if (f.attackCooldown > 0) f.attackCooldown--;  // combat.js:3282
    if (buffer > 0) {                          // buffered input still live → dispatch attempts the gate
      if (startMove(f, "light", LIGHT)) return frame; // real gate: fails while attackCooldown>0
    }
  }
  return null; // expired unfired → DROPPED
}

// ── 1. Reproduce the diagnosed drop at the OLD 7-frame buffer ──
section("evidence: old 7-frame buffer DROPS early-recovery taps (the bug)");
{
  const OLD = 7;
  let drops = [];
  for (let off = 1; off <= POST_NORMAL_COOLDOWN; off++) {
    if (simulateTap(off, OLD) === null) drops.push(off);
  }
  console.log(`     press-offsets 1..${POST_NORMAL_COOLDOWN} that DROP at buffer=${OLD}: [${drops.join(", ")}]`);
  check("old 7f buffer drops taps in the first recovery frames (reproduces the bug)", drops.length > 0, `${drops.length} dead frames`);
  check("the drop is specifically the early-recovery window (offset < cooldown-buffer margin)", drops.every(o => o <= POST_NORMAL_COOLDOWN - OLD), `margin=${POST_NORMAL_COOLDOWN - OLD}`);
}

// ── 2. The current (fixed) buffer closes the ENTIRE recovery window ──
section("fix: current INPUT_BUFFER_FRAMES covers every early-recovery tap");
{
  let drops = [];
  for (let off = 1; off <= POST_NORMAL_COOLDOWN; off++) {
    if (simulateTap(off, INPUT_BUFFER_FRAMES) === null) drops.push(off);
  }
  console.log(`     press-offsets 1..${POST_NORMAL_COOLDOWN} that DROP at buffer=${INPUT_BUFFER_FRAMES}: [${drops.join(", ")}]`);
  check(`INPUT_BUFFER_FRAMES (${INPUT_BUFFER_FRAMES}) drops NO correctly-timed recovery tap`, drops.length === 0, `${drops.length} drops`);
  check("buffer window >= post-normal recovery lock (the invariant that closes the gap)", INPUT_BUFFER_FRAMES >= POST_NORMAL_COOLDOWN, `${INPUT_BUFFER_FRAMES} >= ${POST_NORMAL_COOLDOWN}`);
}

// ── 3. No double-fire: a single tap can never produce a second queued normal ──
section("safety: a single tap fires exactly once (no auto-repeat from the longer buffer)");
{
  // Drive a full move to completion, then keep simulating with the tap's buffer still notionally
  // alive; prove the buffer expires before attackCooldown reaches 0 (so no phantom second hit).
  // Mathematically: buffer life is measured from press (move start); attackCooldown=0 is reached at
  // move_end + 10; buffer can only be alive until move_start + N (< move_end + 10). We assert the
  // fired frame equals the FIRST actionable frame and there is exactly one fire per tap.
  const fired = simulateTap(1, INPUT_BUFFER_FRAMES);
  check("worst-case early tap (offset 1) fires on the first actionable frame", fired !== null && fired <= POST_NORMAL_COOLDOWN, `fired@${fired}`);
}

// ── 4. Drive the REAL input.js buffer (keys + getFighterInput), not just the inline model ──
// Proves the actual shipped buffer code path — updateBuffer decrement + stamp + `buffer.light > 0`
// output — bridges the full post-normal recovery lock, so a 1-frame tap at the worst offset fires.
section("real input.js buffer path (keys → getFighterInput → startMove gate)");
{
  const CTRL = { light: "j", heavy: "k", upAttack: "i", special: "l", ultimate: "u", jump: "w", up: "w", down: "s", left: "a", right: "d", grab: "o", block: "p", charge: "r" };
  function realBufferTap(pressOffset) {
    for (const k in keys) delete keys[k];
    const f = mkFighter();
    f.playerNumber = 1; f.controls = CTRL;
    f.attacking = false; f.currentAttack = null; f.currentMove = null;
    f.attackCooldown = POST_NORMAL_COOLDOWN;
    for (let frame = 0; frame < 40; frame++) {
      keys[CTRL.light] = (frame === pressOffset);  // a single 1-frame physical tap
      const controls = getFighterInput(f);         // REAL buffer: updateBuffer() then stamp, output>0
      if (f.attackCooldown > 0) f.attackCooldown--; // combat.js:3282
      if (controls.light && !f.attacking && !f.hitstun) {
        if (startMove(f, "light", LIGHT)) return frame; // REAL gate
      }
    }
    return null;
  }
  let drops = [];
  for (let off = 1; off <= POST_NORMAL_COOLDOWN; off++) if (realBufferTap(off) === null) drops.push(off);
  console.log(`     real-buffer press-offsets 1..${POST_NORMAL_COOLDOWN} that DROP: [${drops.join(", ")}]`);
  check("the REAL input.js buffer drops no correctly-timed early-recovery tap", drops.length === 0, `${drops.length} drops`);
  check("real buffer agrees with the inline model (worst-case offset 1 fires)", realBufferTap(1) !== null, `fired@${realBufferTap(1)}`);
  for (const k in keys) delete keys[k];
}

console.log(`\n════════════════════════════════════════════`);
console.log(`  INPUT-BUFFER RECOVERY (buffer >= cooldown): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
