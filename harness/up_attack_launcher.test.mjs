// harness/up_attack_launcher.test.mjs — STAGE 1 evidence for the UP-ATTACK (LAUNCHER) system.
//
// Proves, against the REAL character data (characters.js) + real engine (combat.js / physics.js):
//   1. Gojo / Maki / Toji Up-Attacks carry the EXACT spec frame data (startup/active/recovery).
//   2. On connect the launcher sends BOTH fighters airborne with the EXACT per-character velocities
//      (enemy vy = launchVy, player vy = selfVy, player rising slightly LESS than the enemy).
//   3. The opener resets the attacker's air-combo counter (airHits → 0) — the opener is NOT counted.
//   4. Aerial follow-ups chain: each air hit increments airHits and re-lofts the enemy…
//   5. …until the maxAirHits = 3 limit — the 4th air hit does NOT re-loft; the enemy is pushed
//      DOWNWARD (fall-faster after the air-combo limit) and airHits is capped at 3.
//   6. Grounded-only guard: Up+attack starts the launcher on the ground, but NOT while airborne.
//
// Run: node harness/up_attack_launcher.test.mjs   (wired as `npm run test:up-attack`)

import {
  ensureCombatState, startMove, resolveAttackHit, updateCombat, getAttackPhase
} from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

physics.setGroundY(400);

// A fighter positioned so the attacker's launcher/air hitboxes overlap the dummy's hurtbox.
function mkFighter(side, x, extra = {}) {
  const f = {
    side, rosterKey: extra.rosterKey || "tester", facing: extra.facing ?? 1,
    x, y: 400, w: 50, h: 100, vx: 0, vy: 0, groundY: 400,
    onGround: true, grounded: true, health: 100000, maxHealth: 100000,
    energy: 100, maxEnergy: 100, maxAirHits: 3,
    basic_attacks: extra.basic_attacks || {}
  };
  ensureCombatState(f);
  return f;
}

// Clean the attacker's move state, wake the dummy, start `moveKey`, advance to its ACTIVE window,
// and resolve one hit. Returns the dummy's post-hit velocities + the attacker's air-combo counter.
function landMove(a, t, moveKey, md) {
  a.attacking = false; a.currentAttack = null; a.currentMove = null; a.attackCooldown = 0;
  t.hitstun = 0; t.invulnTimer = 0;
  const ok = startMove(a, moveKey, md);
  if (!ok) return { started: false };
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  return { started: true, enemyVy: t.vy, selfVy: a.vy, airHits: a.airHits, hit: a.currentAttack?.hasHit };
}

// Spec table (frames + exact velocities), straight from the project owner's Stage-1 spec.
const SPEC = {
  // Combo-room pass: the flat -26 floor is gone — per-archetype launchVy is LIVE again and raised for
  // real air-combo room. Fast (Maki) launches LOWEST, Heavy (Toji) HIGHEST; juggle gravity (Stage 1b)
  // ramps the fall so the higher pops don't sail the enemy out of reach.
  //   Fast/GC -30 · Balanced -32 · Heavy -33 · Heavy-tank -34   (floor -30 = un-tuned baseline).
  gojo: { startup: 6, active: 4, recovery: 8, enemyVy: -32, selfVy: -9, name: "Rising Palm"   },  // Balanced
  maki: { startup: 4, active: 3, recovery: 6, enemyVy: -30, selfVy: -8, name: "Rising Kick"    },  // Fast/GC — LOWEST launch (lightest)
  // Toji's UP-ATTACK is Balanced-tier (-32); his signature high-launch is the Ascension Slash *special*,
  // not this normal. The roster's HIGHEST up-attack launchers are the Heavy tier (Cell -33) and Heavy-tank
  // (Superman/Hulk -34) — see up_attack_roster.test.mjs for the full per-archetype spread.
  toji: { startup: 5, active: 3, recovery: 7, enemyVy: -32, selfVy: -8, name: "Ascension Slash" }, // Balanced up-attack
};

// ─────────────────────────────────────────────────────────────────────────────
section("1–3. Each launcher: EXACT frame data + EXACT dual launch velocities + opener reset");
for (const key of ["gojo", "maki"]) {
  const cd = getCharacter(key);
  const md = cd?.basic_attacks?.upAttack;
  const s = SPEC[key];
  console.log(`\n  ▸ ${cd?.name} — "${s.name}"`);
  check(`${key}: upAttack exists & typed launcher`, !!md && (md.type === "launcher" || md.launch != null || md.launchVy != null), JSON.stringify(md && { startup: md.startup, active: md.active, recovery: md.recovery, launchVy: md.launchVy, selfVy: md.selfVy }));
  check(`${key}: frame data = ${s.startup}/${s.active}/${s.recovery}`,
    md.startup === s.startup && md.active === s.active && md.recovery === s.recovery,
    `got ${md.startup}/${md.active}/${md.recovery}`);

  const a = mkFighter("p1", 100, { rosterKey: key, basic_attacks: cd.basic_attacks });
  const t = mkFighter("p2", 168, { facing: -1 });
  const r = landMove(a, t, "up", md);
  check(`${key}: launcher connects`, r.started && r.hit === true);
  check(`${key}: ENEMY launched at vy=${s.enemyVy}`, r.enemyVy === s.enemyVy, `got ${r.enemyVy}`);
  // MK-feel Stage 1b: the launcher NO LONGER auto-lifts the attacker — the player stays grounded and
  // must JUMP-CANCEL to convert. So selfVy is 0 and only the ENEMY goes airborne.
  check(`${key}: PLAYER stays GROUNDED (no auto-lift — jump-cancel required)`, r.selfVy === 0 && a.onGround === true, `selfVy=${r.selfVy} onGround=${a.onGround}`);
  check(`${key}: only the ENEMY is launched (attacker NOT auto-carried)`, t.isLaunched === true && a.isLaunched !== true, `enemyLaunched=${t.isLaunched} attackerLaunched=${a.isLaunched}`);
  check(`${key}: ENEMY airborne, PLAYER grounded`, a.onGround === true && t.onGround === false && t.isLaunched === true);
  check(`${key}: opener does NOT count toward the air cap (airHits reset to 0)`, r.airHits === 0, `airHits=${r.airHits}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("4–5. Air-combo chain → maxAirHits=3 limit → fall-faster after the limit (Gojo)");
{
  const cd = getCharacter("gojo");
  const a = mkFighter("p1", 100, { rosterKey: "gojo", basic_attacks: cd.basic_attacks });
  const t = mkFighter("p2", 168, { facing: -1 });

  // Open with the launcher — both go airborne, airHits reset.
  landMove(a, t, "up", cd.basic_attacks.upAttack);
  check("chain: launcher opened (enemy airborne, player GROUNDED, airHits=0)", a.onGround === true && !t.onGround && a.airHits === 0);
  // Simulate the player's JUMP-CANCEL (they deliberately leap up to pursue) so the air-combo chain below runs.
  a.onGround = false; a.grounded = false;

  const airMd = cd.basic_attacks.airAttack;
  const trace = [];
  for (let i = 1; i <= 4; i++) {
    // stay airborne between follow-ups (a real juggle keeps both off the ground)
    a.onGround = false; t.onGround = false; t.isLaunched = true;
    const r = landMove(a, t, "air", airMd);
    trace.push({ hit: i, airHits: a.airHits, enemyVy: t.vy, lofted: t.vy < 0 });
  }
  console.log("     per-air-hit:", trace.map(x => `#${x.hit}(airHits=${x.airHits}, vy=${x.enemyVy}${x.lofted ? " ↑loft" : " ↓drop"})`).join("  "));

  check("air hit #1 counts (airHits=1) and re-lofts (vy<0)", trace[0].airHits === 1 && trace[0].enemyVy < 0);
  check("air hit #2 counts (airHits=2) and re-lofts (vy<0)", trace[1].airHits === 2 && trace[1].enemyVy < 0);
  check("air hit #3 counts (airHits=3) and re-lofts (vy<0)", trace[2].airHits === 3 && trace[2].enemyVy < 0);
  check("air hit #4 is OVER the limit — no re-loft, ENEMY FALLS FASTER (vy>0)", trace[3].enemyVy > 0, `vy=${trace[3].enemyVy}`);
  check("airHits never exceeds maxAirHits (capped at 3)", trace.every(x => x.airHits <= 3) && a.airHits === 3, `final airHits=${a.airHits}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("6. Grounded-only guard (up+attack starts the launcher on the ground, NOT airborne)");
{
  const cd = getCharacter("gojo");
  const opp = mkFighter("p2", 168, { facing: -1 });

  // Grounded → launcher starts.
  const g = mkFighter("p1", 100, { rosterKey: "gojo", basic_attacks: cd.basic_attacks });
  g.onGround = true; g.grounded = true;
  updateCombat(g, opp, { upAttack: true }, {});
  check("GROUNDED up+attack starts the launcher", g.attacking === true && g.currentAttack?.name === "up", `attacking=${g.attacking} name=${g.currentAttack?.name}`);

  // Airborne → launcher suppressed.
  const air = mkFighter("p1", 100, { rosterKey: "gojo", basic_attacks: cd.basic_attacks });
  air.onGround = false; air.grounded = false;
  updateCombat(air, opp, { upAttack: true }, {});
  check("AIRBORNE up+attack does NOT start the launcher", !(air.attacking && air.currentAttack?.name === "up"), `attacking=${air.attacking} name=${air.currentAttack?.name}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("Spec follow-up counts land within the cap (each character's Stage-1 combo)");
// Gojo: Up → AirLight → AirBlue → AirHeavy = 3 air follow-ups. Maki: …→Up→AirKick→AirKick = 2. Toji: …→Up→AirCleaver = 1.
// (The distinct air-move NAMES map to each character's air-attack slot today; they all route through the
//  same air-combo counter — this asserts the specified NUMBER of follow-ups all connect within maxAirHits.)
for (const [key, followUps] of [["gojo", 3], ["maki", 2]]) {
  const cd = getCharacter(key);
  const a = mkFighter("p1", 100, { rosterKey: key, basic_attacks: cd.basic_attacks });
  const t = mkFighter("p2", 168, { facing: -1 });
  landMove(a, t, "up", cd.basic_attacks.upAttack);
  let allLofted = true;
  for (let i = 0; i < followUps; i++) {
    a.onGround = false; t.onGround = false; t.isLaunched = true;
    const r = landMove(a, t, "air", cd.basic_attacks.airAttack);
    if (!(r.hit && t.vy < 0)) allLofted = false;
  }
  check(`${key}: ${followUps} specified air follow-up(s) all connect & re-loft, airHits=${followUps} (≤3)`,
    allLofted && a.airHits === followUps && a.airHits <= 3, `airHits=${a.airHits}`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`  ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
