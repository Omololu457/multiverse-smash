// harness/uzumaki_rendan.test.mjs — STAGE 2 evidence for UZUMAKI NARUTO RENDAN (input-sequenced clone barrage).
//
// The owner's spec: a clone technique that (1) REQUIRES a committed clone swarm (>=3), (2) is executed as a
// timed button SEQUENCE where each beat is driven by a clone, and (3) FAILS partway if you miss a beat — you
// keep what landed, but the string stops. This drives the REAL command-normal driver (updateNarutoRendanCombat)
// against the live engine + real shadow-clone entities and proves:
//   1. REQUIREMENT GATE: Fwd+Heavy opens the barrage ONLY with >=3 live clones; below that it's inert
//      (returns false → Fwd+Heavy stays Naruto's normal heavy, neutral untouched).
//   2. Beat 1 is the LAUNCHER (uzumakiRendan1, launcher flag) and SPENDS one clone.
//   3. CANCEL-ON-HIT continuation: a fresh Heavy during recovery advances a beat ONLY if the beat CONNECTED.
//   4. FAIL-ON-MISS (the lenient ladder): a beat that did NOT connect ends the string — no next beat, and no
//      further clone is spent; you keep what already landed.
//   5. CHAIN LENGTH SCALES WITH CLONES: each beat eats one clone, so 3 clones = 3 beats, 4 clones = the full
//      4-beat combo ending on the axe-kick FINISHER (spike). You can never fire more beats than clones.
//   6. Determinism: identical inputs → identical beat sequence.

import { ensureCombatState, getAttackPhase } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";
import { updateNarutoRendanCombat } from "../abilities.js";
import { activeSummons, spawnShadowClone, countShadowClones } from "../summons.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

physics.setGroundY(400);
const ctx = () => ({ getOpponent: () => ({ x: 260, y: 340, w: 60, h: 90, hitstun: 12 }) });
const phase = getAttackPhase;
const FWD = { heavy: true, right: true, left: false, down: false };   // facing=1 → right = forward

function mkNaruto() {
  const c = getCharacter("naruto");
  const f = {
    rosterKey: "naruto", facing: 1, x: 100, y: 340, w: 60, h: 90,
    onGround: true, grounded: true, vx: 0, vy: 0,
    energy: 200, maxEnergy: 200, attackCooldown: 0, attacking: false, currentMove: null,
    basic_attacks: c?.basic_attacks || {}, controls: {},
  };
  ensureCombatState(f);
  f.attacking = false; f.currentMove = null; f.attackCooldown = 0;
  return f;
}
function spawnClones(f, n) { for (let i = 0; i < n; i++) spawnShadowClone(f, { x: 260, y: 340, w: 60, h: 90 }); }
function reset() { activeSummons.length = 0; }

// Open the barrage: press Fwd+Heavy from neutral. Returns whether a beat fired.
function open(f) { return updateNarutoRendanCombat(f, FWD, ctx(), phase); }

// Simulate ONE clean re-tap during recovery, optionally CONNECTING the previous beat. Returns whether a
// next beat fired. Puts the current attack into recovery, sets the connect latch, and delivers a fresh edge.
function retap(f, connected) {
  if (f.currentAttack) f.currentAttack.timer = 3;   // elapsed = total-3 > activeEnd → recovery (cancel window open)
  f._cmdHitLanded = !!connected;                    // connect latch (what a real hit would set)
  f._cmdPrevHeavy = false;                           // release so the next press is a fresh edge
  return updateNarutoRendanCombat(f, FWD, ctx(), phase);
}

// ── 1. REQUIREMENT GATE ──
section("Requirement gate — barrage opens only with >=3 committed clones");
{
  reset();
  const f0 = mkNaruto();                       // 0 clones
  check("0 clones: Fwd+Heavy is inert (normal heavy path)", open(f0) === false && !f0.attacking);

  reset();
  const f2 = mkNaruto(); spawnClones(f2, 2);   // 2 clones — below the gate
  check("2 clones: still inert (below the >=3 gate)", open(f2) === false && !f2.attacking, `clones=${countShadowClones(f2)}`);

  reset();
  const f3 = mkNaruto(); spawnClones(f3, 3);   // 3 clones — armed
  const fired = open(f3);
  check("3 clones: Fwd+Heavy OPENS the barrage", fired === true && f3.attacking === true);
  check("beat 1 is uzumakiRendan1 the LAUNCHER", f3.currentMove === "uzumakiRendan1" && f3.currentAttack?.launcher === true, `move=${f3.currentMove}`);
  check("opener SPENT one clone (3 → 2)", countShadowClones(f3) === 2, `clones=${countShadowClones(f3)}`);
  check("a next beat is queued", f3._rekkaNext === "uzumakiRendan2");
}

// ── 2. CANCEL-ON-HIT continuation ──
section("Cancel-on-hit — a connected beat advances the sequence");
{
  reset();
  const f = mkNaruto(); spawnClones(f, 4);
  open(f);
  const advanced = retap(f, true);   // beat 1 connected → beat 2 should fire
  check("connected re-tap advances to uzumakiRendan2", advanced === true && f.currentMove === "uzumakiRendan2", `move=${f.currentMove}`);
  check("beat 2 spent another clone (4 → 2 total spent)", countShadowClones(f) === 2, `clones=${countShadowClones(f)}`);
}

// ── 3. FAIL-ON-MISS (the lenient ladder) ──
section("Fail-on-miss — a beat that did NOT connect ends the string");
{
  reset();
  const f = mkNaruto(); spawnClones(f, 4);
  open(f);
  const clonesAfterOpen = countShadowClones(f);   // 3
  const advanced = retap(f, false);   // beat 1 WHIFFED → no beat 2
  check("un-connected re-tap does NOT advance", advanced === false, `advanced=${advanced}`);
  check("still on beat 1 (string ended, kept what landed)", f.currentMove === "uzumakiRendan1", `move=${f.currentMove}`);
  check("no extra clone spent on the failed continue", countShadowClones(f) === clonesAfterOpen, `clones=${countShadowClones(f)} expected ${clonesAfterOpen}`);
}

// ── 4. CHAIN LENGTH SCALES WITH CLONES ──
section("Chain length scales with clones — you can't fire more beats than clones");
// Run the full connected chain and collect the beat sequence.
function runFullChain(cloneCount) {
  reset();
  const f = mkNaruto(); spawnClones(f, cloneCount);
  const beats = [];
  if (!open(f)) return beats;
  beats.push(f.currentMove);
  for (let guard = 0; guard < 8; guard++) {
    if (!f._rekkaNext) break;               // ladder ended (ran out of clones or reached the finisher)
    if (!retap(f, true)) break;
    beats.push(f.currentMove);
  }
  return beats;
}
{
  const three = runFullChain(3);
  check("3 clones → exactly 3 beats", three.length === 3, `beats=${JSON.stringify(three)}`);
  check("3-clone chain does NOT reach the finisher", !three.includes("uzumakiRendan4"), `beats=${JSON.stringify(three)}`);

  const four = runFullChain(4);
  check("4 clones → exactly 4 beats", four.length === 4, `beats=${JSON.stringify(four)}`);
  check("4-clone chain ENDS on the axe-kick finisher (spike)", four[3] === "uzumakiRendan4", `beats=${JSON.stringify(four)}`);
  check("full sequence is launcher → juggle → juggle → finisher",
        JSON.stringify(four) === JSON.stringify(["uzumakiRendan1", "uzumakiRendan2", "uzumakiRendan3", "uzumakiRendan4"]), JSON.stringify(four));
}

// ── 5. Finisher carries the spike flag ──
section("Finisher metadata");
{
  const four = runFullChain(4);
  // re-run to inspect the last attack's flags on a live fighter
  reset();
  const f = mkNaruto(); spawnClones(f, 4);
  open(f); retap(f, true); retap(f, true); retap(f, true);
  check("finisher is a spike", f.currentAttack?.spike === true && f.currentMove === "uzumakiRendan4", `move=${f.currentMove} spike=${f.currentAttack?.spike}`);
  check("no further beat queued after the finisher", f._rekkaNext == null, `rekkaNext=${f._rekkaNext}`);
}

// ── 6. Determinism ──
section("Determinism — identical inputs → identical beat sequence");
{
  const a = JSON.stringify(runFullChain(4));
  const b = JSON.stringify(runFullChain(4));
  const c = JSON.stringify(runFullChain(4));
  check("three full 4-clone runs agree", a === b && b === c, `${a}`);
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  uzumaki_rendan: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
