// harness/clone_realhit.test.mjs — STAGE 1 evidence + regression for the CLONE "REAL GAME OBJECT" fix.
//
// The bug (owner's words): shadow clones were "hit or miss ... not a real game object you can interact
// with." Diagnosis: a fighter's melee hit resolves inside updateCombat/resolveAttackHit against the real
// opponent ONLY; a clone was never handed to that path. Instead the clone did a retroactive self-check
// inside updateShadowClone, which runs during updateActiveSummons — a full combat step AFTER real hits
// already resolved. Sampling the attacker's short active-frame window at that late, wrong point in the
// frame is what dropped hits.
//
// The fix: revealClonesHitByMelee(attacker) — an AUTHORITATIVE pass called from the main loop RIGHT AFTER
// each fighter's combat step (the same frame real hits resolve), mirroring the existing projectile path
// revealClonesHitByProjectiles. This is a fast, fully-deterministic UNIT test of that function's contract
// (no browser). It proves:
//   1. A melee hitbox overlapping a live clone RELIABLY poofs it (the fix).
//   2. The reveal fires EXACTLY across the attack's active window and never during startup/recovery
//      (frame-accurate, like a real hit — this is the "no more hit-or-miss" evidence).
//   3. FIGHTER-PRIORITY: if the swing already hit the real fighter (hasHit), a clone is NEVER popped —
//      combos on the real target are untouched.
//   4. A swing is SPENT on the fake (sets hasHit) → one swing pops at most ONE clone.
//   5. Your own swing never pops your own clones.
//   6. No overlap / inactive attack → no poof, hasHit untouched.
//   7. Determinism: identical inputs → identical outcome across repeated runs.
//   8. Regression: the projectile reveal still works; the 4 clone chars are still capable with their caps.

import {
  activeSummons, spawnShadowClone, countShadowClones,
  revealClonesHitByMelee, revealClonesHitByProjectiles,
  getCloneCap, isCloneCapable
} from "../summons.js";
import { getAttackHitbox, getHurtbox, rectsOverlap, attackIsActive } from "../combat.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

function resetSummons() { activeSummons.length = 0; }

// An attacker fighter mid-swing. total/timer/activeStart/activeEnd make attackIsActive true by default.
function mkAttacker(x, extra = {}) {
  return {
    rosterKey: extra.rosterKey || "sasuke", facing: extra.facing ?? 1,
    x, y: 400, w: 50, h: 100,
    currentAttack: {
      name: "light", rangeX: 60, rangeY: 40,
      total: 10, timer: 5, activeStart: 0, activeEnd: 10, hasHit: false,
      ...(extra.attack || {})
    }
  };
}

// Spawn a clone for `owner`, force it past the spawn-smoke into the live idle state, and place its body so
// its hurtbox overlaps `hb` (default: a box we know the standard attacker hitbox covers).
function mkLiveClone(owner, x = 160, y = 360) {
  const s = spawnShadowClone(owner, { x: 999, y: 400, w: 50, h: 100 });
  s._state = "idle"; s._hidden = false;   // skip the 16-frame spawn animation for a deterministic unit test
  s.x = x; s.y = y;
  return s;
}

const OWNER  = { rosterKey: "naruto", x: 800, y: 400, w: 50, h: 100, facing: -1 };
const ENEMY_X = 100;   // attacker to the LEFT, facing right → hitbox at [150,210]x[420,460]

// ── 1. THE FIX: a melee hitbox overlapping a live clone reliably poofs it ──
section("Melee hit RELIABLY poofs an overlapping clone (the fix)");
{
  resetSummons();
  const atk = mkAttacker(ENEMY_X);
  const clone = mkLiveClone(OWNER);
  // sanity: the boxes actually overlap (else the test proves nothing)
  const overlaps = rectsOverlap(getAttackHitbox(atk), getHurtbox(clone));
  check("attacker hitbox overlaps the clone hurtbox (setup sanity)", overlaps);
  revealClonesHitByMelee(atk);
  check("clone entered hurt→poof state", clone._state === "hurt", `state=${clone._state}`);
  check("swing was spent on the fake (hasHit set)", atk.currentAttack.hasHit === true);
  check("clone still counted this frame (poof is a lifecycle, not instant removal)", countShadowClones(OWNER) === 1);
}

// ── 2. FRAME-ACCURACY: fires ONLY during the active window (the 'no more hit-or-miss' proof) ──
section("Reveal fires EXACTLY across the active window (frame-accurate like a real hit)");
{
  const firedAt = [];
  const ATTACK = { name: "light", rangeX: 60, rangeY: 40, total: 20, activeStart: 5, activeEnd: 8 };
  for (let e = 0; e <= 20; e++) {
    resetSummons();
    const atk = mkAttacker(ENEMY_X, { attack: { ...ATTACK, timer: ATTACK.total - e, hasHit: false } });
    const clone = mkLiveClone(OWNER);
    revealClonesHitByMelee(atk);
    if (clone._state === "hurt") firedAt.push(e);
  }
  const expected = [5, 6, 7, 8];
  const ok = JSON.stringify(firedAt) === JSON.stringify(expected);
  check("poofed on exactly the active-window frames, never on startup/recovery", ok, `fired at e=${JSON.stringify(firedAt)} expected ${JSON.stringify(expected)}`);
  // and cross-check the reveal window equals attackIsActive's window (single source of truth)
  const activeFrames = [];
  for (let e = 0; e <= 20; e++) if (attackIsActive({ ...ATTACK, timer: ATTACK.total - e })) activeFrames.push(e);
  check("reveal window == attackIsActive window", JSON.stringify(firedAt) === JSON.stringify(activeFrames));
}

// ── 3. FIGHTER-PRIORITY: never steal a hit that landed on the real fighter ──
section("Fighter-priority — a swing already spent on the real fighter never pops a clone");
{
  resetSummons();
  const atk = mkAttacker(ENEMY_X, { attack: { hasHit: true } });   // already connected on the opponent this swing
  const clone = mkLiveClone(OWNER);
  revealClonesHitByMelee(atk);
  check("overlapping clone NOT popped when hasHit already set", clone._state === "idle", `state=${clone._state}`);
}

// ── 4. ONE clone per swing (spent on the fake) ──
section("A swing pops at most ONE clone");
{
  resetSummons();
  const atk = mkAttacker(ENEMY_X);
  const a = mkLiveClone(OWNER, 160, 360);
  const b = mkLiveClone(OWNER, 165, 362);   // both overlap the same hitbox
  revealClonesHitByMelee(atk);
  const hurt = [a, b].filter(c => c._state === "hurt").length;
  check("exactly one of two overlapping clones poofed", hurt === 1, `hurt=${hurt}`);
  check("hasHit set → a second call this swing pops nothing more", (() => { revealClonesHitByMelee(atk); return [a, b].filter(c => c._state === "hurt").length === 1; })());
}

// ── 5. Own-clone immunity ──
section("Your own swing never pops your own clones");
{
  resetSummons();
  // OWNER swings; a clone OWNED BY OWNER overlaps. Position owner so its hitbox reaches its own clone.
  const ownerAtk = { rosterKey: "naruto", x: ENEMY_X, y: 400, w: 50, h: 100, facing: 1,
    currentAttack: { name: "light", rangeX: 60, rangeY: 40, total: 10, timer: 5, activeStart: 0, activeEnd: 10, hasHit: false } };
  const clone = mkLiveClone(ownerAtk);   // owner === attacker
  revealClonesHitByMelee(ownerAtk);
  check("owner's own clone survives owner's swing", clone._state === "idle", `state=${clone._state}`);
}

// ── 6. No overlap / inactive attack → no poof ──
section("No false positives — miss or inactive attack leaves the clone alone");
{
  resetSummons();
  const atk = mkAttacker(ENEMY_X);
  const clone = mkLiveClone(OWNER, 600, 360);   // far away — no overlap
  revealClonesHitByMelee(atk);
  check("no-overlap clone survives", clone._state === "idle");
  check("hasHit untouched on a whiff", atk.currentAttack.hasHit === false);

  resetSummons();
  const atk2 = mkAttacker(ENEMY_X, { attack: { timer: -5 } });   // e=15 > activeEnd(10) → recovery, not active
  const clone2 = mkLiveClone(OWNER);
  check("attack is genuinely inactive (setup)", attackIsActive(atk2.currentAttack) === false);
  revealClonesHitByMelee(atk2);
  check("inactive-attack overlap does NOT poof", clone2._state === "idle");
}

// ── 7. Determinism ──
section("Determinism — identical inputs → identical outcome");
{
  const run = () => {
    resetSummons();
    const atk = mkAttacker(ENEMY_X);
    const clone = mkLiveClone(OWNER);
    revealClonesHitByMelee(atk);
    return `${clone._state}|${atk.currentAttack.hasHit}|${countShadowClones(OWNER)}`;
  };
  const a = run(), b = run(), c = run();
  check("three identical runs agree", a === b && b === c, `${a} / ${b} / ${c}`);
}

// ── 8. Regression: projectile reveal still works; clone chars still capable with correct caps ──
section("Regression — projectile reveal + clone-capability/caps unchanged");
{
  resetSummons();
  const clone = mkLiveClone(OWNER, 160, 360);
  const projectiles = [{ x: 190, y: 420, radius: 15, owner: { rosterKey: "sasuke" } }];
  revealClonesHitByProjectiles(projectiles);
  check("projectile still poofs an overlapping clone", clone._state === "hurt");
  check("projectile consumed (spent on the fake)", projectiles.length === 0);

  const caps = { naruto: 4, hashirama: 4, minato: 2, tobirama: 3 };
  let capsOk = true, capOut = [];
  for (const [k, v] of Object.entries(caps)) { const got = getCloneCap({ rosterKey: k }); capOut.push(`${k}=${got}`); if (got !== v) capsOk = false; }
  check("per-char clone caps unchanged", capsOk, capOut.join(" "));
  check("default cap is 3", getCloneCap({ rosterKey: "someone_else" }) === 3);

  const capable = ["naruto", "minato", "hashirama", "tobirama"].every(k => isCloneCapable({ rosterKey: k }));
  check("the 4 clone chars are still clone-capable", capable);
  check("a non-clone char is not clone-capable", isCloneCapable({ rosterKey: "sasuke" }) === false);
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  clone_realhit: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
