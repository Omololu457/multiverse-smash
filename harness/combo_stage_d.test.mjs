// harness/combo_stage_d.test.mjs — COMBO-STRING STANDARDIZATION, Stage D behavioral proof.
//
// Stage D rolled the shared Light→Light→Heavy(→launcher) "standard string" (updateStandardStringCombat)
// out to the 8 remaining un-built MELEE characters by adding them to STANDARD_STRING_CHARS (art-free —
// reuses each char's own basic_attacks). This drives the REAL shared handler + combat/physics for each of
// the 8 and proves the string now works:
//   • light → light2 cancels on a CONNECTED recovery
//   • light2 → HEAVY folds into the char's UP-ATTACK launcher (the ender)
//   • that ender LAUNCHES the opponent straight up (vy -26)
//   • L,L,H cap — a 3rd light does NOT chain
//   • a WHIFF (no clean connect) ends the string
// Mirrors harness/stage2b_strings.test.mjs (the original 6). Run: `npm run test:combo-stage-d`.
import { startMove, resolveAttackHit, getAttackPhase, ensureCombatState } from "../combat.js";
import { updateStandardStringCombat } from "../abilities.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";
import { STANDARD_STRING } from "../comboStandard.js";

physics.setGroundY(400); physics.setStageBounds(0, 3200);

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };
const group = t => console.log(`\n═══ ${t} ═══`);

const CHARS = STANDARD_STRING.added;   // the 8 Stage-D chars (source of truth = the registry)

function mkFighter(key, cd) {
  const f = { side: "p1", rosterKey: key, facing: 1, x: 100, y: 300, w: 50, h: 100, vx: 0, vy: 0,
    groundY: 400, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6,
    energy: cd.stats?.maxEnergy || 200, maxEnergy: cd.stats?.maxEnergy || 200,
    maxAirHits: 3, basic_attacks: cd.basic_attacks, specials: cd.specials, stats: cd.stats };
  ensureCombatState(f); return f;
}
function mkOpp() {
  const f = { side: "p2", rosterKey: "dummy", facing: -1, x: 168, y: 300, w: 50, h: 100, vx: 0, vy: 0,
    groundY: 400, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 0, maxEnergy: 0 };
  ensureCombatState(f); return f;
}
const opp = mkOpp();
const ctx = { getOpponent: () => opp, camera: { shake: () => {}, x: 0, y: 0, zoom: 1, focusBetween: () => {} },
  activeDomains: [], worldWidth: 3200, deltaMs: 1000 / 60, triggerSlowdown: () => {},
  createFighter: () => null, spawnProjectile: () => null, projectiles: [] };
const curName = f => f.currentMove || f.currentAttack?.name || null;
function toRecovery(f) { let g = 0; while (getAttackPhase(f) === "startup" && g++ < 200) f.currentAttack.timer--; g = 0; while (getAttackPhase(f) !== "recovery" && f.currentAttack && g++ < 200) f.currentAttack.timer--; }
function stringInput(f, input, { connect = true } = {}) {
  if (f.currentAttack) { f.currentAttack.hasHit = connect; opp.hitstun = connect ? 12 : 0; toRecovery(f); }
  f._sstrPrevLight = f._sstrPrevHeavy = f._sstrPrevSpecial = false;
  return updateStandardStringCombat(f, input, ctx, getAttackPhase);
}

group("Stage-D chars now get the Light→Light→Heavy(→launcher) standard string");
for (const key of CHARS) {
  const cd = getCharacter(key);
  // A. light → light2 → up-attack launcher ender + launch
  const g = mkFighter(key, cd);
  startMove(g, "light", cd.basic_attacks.light);
  const r1 = stringInput(g, { light: true });
  check(`${key}: light → light2 cancels on connect`, r1 === true && curName(g) === "light" && g._sstrStage === "light2", `stage=${g._sstrStage} cur=${curName(g)}`);
  const r2 = stringInput(g, { heavy: true });
  check(`${key}: light2 → UP-ATTACK launcher ender`, r2 === true && curName(g) === "up" && g.currentAttack?.launcher === true, `cur=${curName(g)} launcher=${g.currentAttack?.launcher}`);
  opp.onGround = true; opp.grounded = true; opp.vy = 0; opp.isLaunched = false; opp.hitstun = 0;
  let n = 0; while (getAttackPhase(g) !== "active" && n++ < 60) g.currentAttack.timer--;
  resolveAttackHit(g, opp, [], {});
  check(`${key}: ender LAUNCHES opponent (vy -26)`, opp.vy === -26 && opp.isLaunched === true, `vy=${opp.vy}`);

  // B. L,L,H cap — no 3rd light
  const g2 = mkFighter(key, cd);
  startMove(g2, "light", cd.basic_attacks.light);
  stringInput(g2, { light: true });
  const r3 = stringInput(g2, { light: true });
  check(`${key}: 3rd Light does NOT chain (L,L,H cap)`, r3 === false && g2._sstrStage === "light2", `r=${r3} stage=${g2._sstrStage}`);

  // C. interrupt — whiff ends the string
  const g3 = mkFighter(key, cd);
  startMove(g3, "light", cd.basic_attacks.light);
  const r4 = stringInput(g3, { light: true }, { connect: false });
  check(`${key}: whiffed opener → no cancel (string ends)`, r4 === false, `r=${r4}`);
}

// Control: a true zoner is NOT in the standard-string set → the handler is inert for it.
group("Control: a true zoner (beerus) does NOT get the standard string");
{
  const cd = getCharacter("beerus");
  const g = mkFighter("beerus", cd);
  startMove(g, "light", cd.basic_attacks.light);
  const r = stringInput(g, { light: true });
  check("beerus: standard string is inert (single-poke by design)", r === false, `r=${r}`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`  COMBO STAGE D (standard-string rollout): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
