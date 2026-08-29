// harness/minato_raijin_barrage.test.mjs — STAGE 4 signature: MINATO's FLYING RAIJIN BARRAGE.
//
// Unlike Naruto's Uzumaki Rendan (clones pile on the foe in place), Minato's signature is a TELEPORT ROUTE:
// the Yellow Flash Rush's launcher finisher, when it connects with >=2 live clones, CHAINS into Flying Raijin
// teleport-beats — each beat warps Minato to a clone's MARK and strikes. It rides his EXISTING rekka chain
// (no parallel chain), so this drives the real updateMinatoCommandCombat and proves:
//   1. REGRESSION: the base Yellow Flash Rush (rush1→rush2→rushFin) is unchanged with no clones.
//   2. GATE: rushFin chains into the barrage ONLY at full clone commitment (>=2); 0 or 1 clone → string ends.
//   3. TELEPORT: each raijin beat warps Minato to a consumed clone's position (a route decided by placement).
//   4. SCALES/ENDS: each beat spends one clone; the chain ends when the marks run out.
//   5. Determinism: identical setup → identical beats + teleport route.

import { ensureCombatState, getAttackPhase } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";
import { updateMinatoCommandCombat } from "../abilities.js";
import { activeSummons, spawnShadowClone, countShadowClones } from "../summons.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

physics.setGroundY(400);
const ctx = () => ({ getOpponent: () => ({ x: 500, y: 340, w: 60, h: 90, hitstun: 12 }) });
const phase = getAttackPhase;
const FWD = { heavy: true, right: true, left: false };   // facing=1 → forward = right (opens the rush)
const HEAVY = { heavy: true, right: false, left: false }; // bare Heavy re-tap (won't re-open a rush)
const OPP = { x: 500, y: 340, w: 60, h: 90 };

function mkMinato() {
  const c = getCharacter("minato");
  const f = { rosterKey: "minato", facing: 1, x: 100, y: 340, w: 60, h: 90, onGround: true, grounded: true,
    vx: 0, vy: 0, energy: 200, maxEnergy: 200, attackCooldown: 0, attacking: false, currentMove: null,
    basic_attacks: c?.basic_attacks || {}, controls: {} };
  ensureCombatState(f); f.attacking = false; f.currentMove = null; f.attackCooldown = 0; return f;
}
function reset() { activeSummons.length = 0; }
function spawnClonesAt(f, xs) { for (const x of xs) { const s = spawnShadowClone(f, OPP); if (s) { s._state = "idle"; s._hidden = false; s.x = x; s.y = 340; } } }
const open  = f => updateMinatoCommandCombat(f, FWD, ctx(), phase);
function retap(f, connected) { if (f.currentAttack) f.currentAttack.timer = 3; f._cmdHitLanded = !!connected; f._cmdPrevHeavy = false; return updateMinatoCommandCombat(f, HEAVY, ctx(), phase); }

// Drive the full connected chain; record the beat sequence and Minato's x at each teleport beat.
function driveChain(cloneXs) {
  reset();
  const f = mkMinato();
  spawnClonesAt(f, cloneXs);
  const beats = [], teleports = [];
  if (!open(f)) return { beats, teleports, f };
  beats.push(f.currentMove);
  for (let g = 0; g < 10; g++) {
    if (!f._rekkaNext) break;
    if (!retap(f, true)) break;
    beats.push(f.currentMove);
    if (String(f.currentMove).startsWith("minatoRaijin")) teleports.push(Math.round(f.x));
  }
  return { beats, teleports, f };
}

// ── 1. Regression: base Yellow Flash Rush unchanged with no clones ──
section("Regression — Yellow Flash Rush is unchanged with no clones");
{
  const { beats } = driveChain([]);
  check("no clones → rush1 → rush2 → rushFin (barrage NOT reached)",
        JSON.stringify(beats) === JSON.stringify(["minatoRush1", "minatoRush2", "minatoRushFin"]), JSON.stringify(beats));
}

// ── 2. Gate: needs FULL commitment (>=2 clones) ──
section("Gate — the barrage needs >=2 live clones (full commitment)");
{
  const one = driveChain([300]);
  check("1 clone → still ends at rushFin (no teleport barrage)", !one.beats.includes("minatoRaijin1"), JSON.stringify(one.beats));
  const two = driveChain([250, 400]);
  check("2 clones → rushFin chains into minatoRaijin1", two.beats.includes("minatoRaijin1"));
}

// ── 3 & 4. Teleport route + clone spend ──
section("Teleport route — each beat warps Minato to a clone's mark and spends it");
{
  const { beats, teleports, f } = driveChain([250, 400]);
  check("full chain = rush ×3 → raijin ×2 (5 beats)", beats.length === 5, JSON.stringify(beats));
  check("ends on the Rasengan teleport finisher", beats[4] === "minatoRaijin2", JSON.stringify(beats));
  // consumeShadowClones takes the LAST-added clone first → raijin1 warps to x=400, raijin2 to x=250.
  check("Minato teleported to the clone marks in order (400 → 250)", JSON.stringify(teleports) === JSON.stringify([400, 250]), JSON.stringify(teleports));
  check("both clone marks were spent (0 left)", countShadowClones(f) === 0, `left=${countShadowClones(f)}`);
}

// ── 5. Determinism ──
section("Determinism — identical setup → identical route");
{
  const a = JSON.stringify(driveChain([250, 400]).beats) + "|" + JSON.stringify(driveChain([250, 400]).teleports);
  const b = JSON.stringify(driveChain([250, 400]).beats) + "|" + JSON.stringify(driveChain([250, 400]).teleports);
  check("two full runs agree (beats + teleport route)", a === b, a);
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  minato_raijin_barrage: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
