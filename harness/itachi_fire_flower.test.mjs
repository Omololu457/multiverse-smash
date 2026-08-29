// harness/itachi_fire_flower.test.mjs — STAGE 4 signature: ITACHI's FIRE-FLOWER BARRAGE.
//
// A ZONING clone barrage (distinct from Naruto's juggle Rendan and Minato's teleport route): with >=2 live
// clones, Fwd+Heavy opens a TIMING-based cast chain where each beat spends one clone and it BREATHES a Great
// Fireball from its MARK toward the opponent — a fan of flame from wherever the clones stood. Drives the real
// updateItachiFireFlowerCombat + inspects the real activeProjectiles array. Proves:
//   1. REQUIREMENT GATE: opens only with >=2 clones; below that it's inert (Fwd+Heavy stays normal heavy).
//   2. Each beat spends one clone AND spawns one itachiFireball projectile FROM that clone's mark.
//   3. TIMING-based continuation (requireHit:false) — the chain advances on the re-tap RHYTHM, no connect
//      needed (fireballs travel); it never gates on a melee hit.
//   4. CHAIN SCALES WITH CLONES: 2 clones → 2 fireballs, 3 → 3; ends when the marks run out.
//   5. Determinism.

import { ensureCombatState, getAttackPhase } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";
import { updateItachiFireFlowerCombat, activeProjectiles } from "../abilities.js";
import { activeSummons, spawnShadowClone, countShadowClones } from "../summons.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

physics.setGroundY(400);
const ctx = () => ({ getOpponent: () => ({ x: 500, y: 340, w: 60, h: 90, hitstun: 0 }) });
const phase = getAttackPhase;
const FWD = { heavy: true, right: true, left: false };
const HEAVY = { heavy: true, right: false, left: false };
const OPP = { x: 500, y: 340, w: 60, h: 90 };

function mkItachi() {
  const c = getCharacter("itachi");
  const f = { rosterKey: "itachi", side: "p1", facing: 1, x: 100, y: 340, w: 60, h: 90, onGround: true, grounded: true,
    vx: 0, vy: 0, energy: 200, maxEnergy: 200, attackCooldown: 0, attacking: false, currentMove: null,
    basic_attacks: c?.basic_attacks || {}, controls: {} };
  ensureCombatState(f); f.attacking = false; f.currentMove = null; f.attackCooldown = 0; return f;
}
function reset() { activeSummons.length = 0; activeProjectiles.length = 0; }
function spawnClonesAt(f, xs) { for (const x of xs) { const s = spawnShadowClone(f, OPP); if (s) { s._state = "idle"; s._hidden = false; s.x = x; s.y = 340; } } }
const open = f => updateItachiFireFlowerCombat(f, FWD, ctx(), phase);
// NOTE: no connect is set — proving the chain links on TIMING alone (requireHit:false).
function retap(f) { if (f.currentAttack) f.currentAttack.timer = 3; f._cmdPrevHeavy = false; return updateItachiFireFlowerCombat(f, HEAVY, ctx(), phase); }

function driveFlower(cloneXs) {
  reset();
  const f = mkItachi();
  spawnClonesAt(f, cloneXs);
  const beats = [];
  if (!open(f)) return { beats, fireballs: [], f };
  beats.push(f.currentMove);
  for (let g = 0; g < 8; g++) {
    if (!f._rekkaNext) break;
    if (!retap(f)) break;
    beats.push(f.currentMove);
  }
  const fireballs = activeProjectiles.filter(p => p.owner === f).map(p => Math.round(p.x));
  return { beats, fireballs, f };
}

// ── 1. Requirement gate ──
section("Requirement gate — fire-flower opens only with >=2 clones");
{
  check("0 clones → inert", driveFlower([]).beats.length === 0);
  check("1 clone → inert (below the >=2 gate)", driveFlower([300]).beats.length === 0);
  const two = driveFlower([250, 400]);
  check("2 clones → opens itachiFire1", two.beats[0] === "itachiFire1");
}

// ── 2 & 3. Each beat = one clone spent + one fireball from its mark; timing-based ──
section("Each beat spends a clone and breathes a fireball from its mark (timing-based)");
{
  const { beats, fireballs, f } = driveFlower([250, 400]);
  check("2 beats fired (timing continuation, no connect needed)", beats.length === 2, JSON.stringify(beats));
  check("2 fireballs spawned (one per beat)", fireballs.length === 2, JSON.stringify(fireballs));
  // consume takes the last-added clone first → fire1 from x=400 (spawnX 420), fire2 from x=250 (spawnX 270)
  check("fireballs breathe from the clone marks (≈420, ≈270)", JSON.stringify(fireballs) === JSON.stringify([420, 270]), JSON.stringify(fireballs));
  check("both clones spent (0 left)", countShadowClones(f) === 0, `left=${countShadowClones(f)}`);
}

// ── 4. Chain scales with clones ──
section("Chain length scales with clones (cap 3)");
{
  const three = driveFlower([200, 350, 500]);
  check("3 clones → 3 beats", three.beats.length === 3, JSON.stringify(three.beats));
  check("3 clones → 3 fireballs", three.fireballs.length === 3, JSON.stringify(three.fireballs));
  check("sequence is fire1 → fire2 → fire3", JSON.stringify(three.beats) === JSON.stringify(["itachiFire1", "itachiFire2", "itachiFire3"]), JSON.stringify(three.beats));
}

// ── 5. Determinism ──
section("Determinism");
{
  const a = JSON.stringify(driveFlower([250, 400]).fireballs);
  const b = JSON.stringify(driveFlower([250, 400]).fireballs);
  check("two runs agree on the fireball route", a === b, a);
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  itachi_fire_flower: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
