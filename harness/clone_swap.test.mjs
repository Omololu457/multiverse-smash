// harness/clone_swap.test.mjs — STAGE 3 evidence for the CONSCIOUSNESS-SWAP substitution.
//
// Owner's spec: "if I get hit and I want to replace myself with a shadow clone ... my consciousness switches
// to a different Naruto clone ... the clones don't look different from the actual player, so I have to keep
// track of where I am." This is a POSITIONAL IDENTITY TRADE, distinct from the existing Block+Special no-sell
// substitution (which teleports behind the opponent / hops in place). This drives swapConsciousnessWithClone
// directly (fast, deterministic, no browser) and proves:
//   1. POSITION TRADE — owner and the chosen clone swap x/y (owner ends where a clone stood; that clone ends
//      where the owner was = the standing decoy that "took the hit").
//   2. SELECTION is deterministic — the clone FARTHEST from the opponent (the safest body to become).
//   3. PURE TRADE — clone COUNT is preserved (no clone-share cost; the limiter is the caller's cooldown).
//   4. FAILS with no live clone (returns null) — the Stage-1 counterplay: pop the clones, remove the escape.
//   5. Only FULLY-MATERIALIZED clones are valid destinations (spawning/poofing bodies are ignored).
//   6. TRUE-BLIND FX — symmetric puffs at BOTH spots (no on-screen tell which body is real).
//   7. Momentum is zeroed (clean body-flicker, not a slide); determinism across repeated runs.

import {
  activeSummons, spawnShadowClone, countShadowClones,
  swapConsciousnessWithClone, getClonePuffCount
} from "../summons.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

function reset() { activeSummons.length = 0; }
function mkOwner() { return { rosterKey: "naruto", x: 500, y: 400, w: 60, h: 90, facing: 1, vx: 9, vy: -3 }; }
const OPP = { x: 100, y: 400, w: 60, h: 90 };   // opponent on the LEFT
// spawn a live (idle, materialized) clone for owner at (x,y)
function liveClone(owner, x, y = 400) { const s = spawnShadowClone(owner, OPP); s._state = "idle"; s._hidden = false; s.x = x; s.y = y; return s; }

// ── 1 & 2 & 3. Position trade, farthest-from-opponent selection, count preserved ──
section("Position trade + farthest-from-opponent selection + count preserved");
{
  reset();
  const owner = mkOwner();
  const near = liveClone(owner, 200);   // near the opponent (x=100)
  const far  = liveClone(owner, 900);   // FAR from the opponent → should be chosen
  const before = countShadowClones(owner);
  const chosen = swapConsciousnessWithClone(owner, OPP);
  check("returns the chosen clone (success)", chosen === far, `chose x=${chosen?.x}`);
  check("owner moved onto the FAR clone's spot (x 500 → 900)", owner.x === 900, `owner.x=${owner.x}`);
  check("chosen clone took the owner's OLD spot (x 900 → 500)", far.x === 500, `far.x=${far.x}`);
  check("the near clone was left untouched (not chosen)", near.x === 200);
  check("clone COUNT preserved (pure trade, no share spent)", countShadowClones(owner) === before, `count=${countShadowClones(owner)}`);
}

// ── 4. Fails with no live clone (the Stage-1 counterplay) ──
section("No live clone → swap fails (null)");
{
  reset();
  const owner = mkOwner();
  check("swap with zero clones returns null", swapConsciousnessWithClone(owner, OPP) === null);
  check("owner did not move", owner.x === 500);
}

// ── 5. Only fully-materialized clones are valid destinations ──
section("Spawning / hidden clones are NOT valid swap destinations");
{
  reset();
  const owner = mkOwner();
  const spawning = spawnShadowClone(owner, OPP);   // left in default "spawn" + _hidden state
  spawning.x = 900;
  check("a still-spawning clone is ignored → null", swapConsciousnessWithClone(owner, OPP) === null, `state=${spawning._state} hidden=${spawning._hidden}`);
  // now materialize it and confirm it becomes valid
  spawning._state = "idle"; spawning._hidden = false;
  const chosen = swapConsciousnessWithClone(owner, OPP);
  check("once idle+visible it becomes a valid destination", chosen === spawning && owner.x === 900);
}

// ── 6. True-blind symmetric FX ──
section("True-blind — symmetric puffs at BOTH spots, no persistent tell");
{
  reset();
  const owner = mkOwner();
  liveClone(owner, 900);
  const puffsBefore = getClonePuffCount();
  swapConsciousnessWithClone(owner, OPP);
  check("exactly TWO puffs spawned (one at each body → symmetric, no info leak)", getClonePuffCount() - puffsBefore === 2, `delta=${getClonePuffCount() - puffsBefore}`);
  check("owner gets a teleport flash (both bodies flicker identically)", (owner.teleportFlash || 0) > 0);
}

// ── 7. Momentum zeroed + determinism ──
section("Momentum zeroed + determinism");
{
  reset();
  const owner = mkOwner();   // vx:9, vy:-3
  liveClone(owner, 900);
  swapConsciousnessWithClone(owner, OPP);
  check("owner momentum zeroed on swap (clean flicker, not a slide)", owner.vx === 0 && owner.vy === 0);

  const run = () => {
    reset();
    const o = mkOwner();
    liveClone(o, 200); liveClone(o, 900); liveClone(o, 650);
    const c = swapConsciousnessWithClone(o, OPP);
    return `${c.x}|${o.x}|${countShadowClones(o)}`;
  };
  const a = run(), b = run(), c = run();
  check("three identical setups → identical swap outcome", a === b && b === c, `${a} / ${b} / ${c}`);
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  clone_swap: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
