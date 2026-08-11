// harness/up_attack_roster.test.mjs — STAGE 3 evidence: per-character Up-Attack launcher verification,
// implemented UNIVERSE BY UNIVERSE. For every listed character it proves, against the REAL character
// data + real engine, that the launcher carries the approved (Stage-2) archetype values and that the
// shared air-combo rules hold:
//   • frame data (startup/active/recovery) == approved
//   • on connect BOTH fighters go airborne at the EXACT enemy/player velocities (player rises less)
//   • the opener resets the air-combo counter (airHits → 0)
//   • aerial follow-ups count toward maxAirHits=3 and re-loft under the cap…
//   • …then the 4th hit does NOT re-loft — the enemy falls faster (vy > 0) and airHits is capped at 3
//
// New universes are added to EXPECTED as each Stage-3 group ships. Run: `npm run test:up-attack-roster`.

import { ensureCombatState, startMove, resolveAttackHit, getAttackPhase } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };
const group = t => console.log(`\n═══ ${t} ═══`);

physics.setGroundY(400);

// Approved values per character: [startup, active, recovery], enemyVy, selfVy, archetype label.
// MK-feel Stage 2a RAISED launch height to a single -26 floor for EVERY launcher (juggle gravity brings
// the ceiling back down), so enemyVy `e` is now -26 across the board — the per-archetype launch spread is
// gone; archetypes still differ by frames (sar), speed, damage. selfVy `s` is unused post-1b (attacker
// stays grounded), kept here only for reference.
const EXPECTED = {
  dragon_ball: {
    goku:       { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    vegeta:     { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    goku_black: { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    frieza:     { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    piccolo:    { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    cell:       { sar: [5, 4, 9], e: -26, s: -9, arch: "Heavy"    },
    beerus:     { sar: [4, 3, 6], e: -26, s: -8, arch: "Fast/GC"  },
  },
  dc: {
    batman:   { sar: [6, 4, 8],  e: -26, s: -9, arch: "Balanced"       },
    flash:    { sar: [4, 3, 5],  e: -26, s: -8, arch: "Fast/GC (fastest)" },
    superman: { sar: [5, 4, 10], e: -26, s: -9, arch: "Heavy-tank"     },
  },
  demon_slayer: {
    rengoku: { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    shinobu: { sar: [4, 3, 6], e: -26, s: -8, arch: "Fast/GC"  },
    zenitsu: { sar: [4, 3, 6], e: -26, s: -8, arch: "Fast/GC"  },
  },
  horror: {
    ghostface: { sar: [4, 3, 6], e: -26, s: -8, arch: "Fast/GC" },
  },
  hunter_x_hunter: {
    chrollo: { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    gon:     { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced (base; ⚑giant adult form)" },
    hisoka:  { sar: [6, 4, 8], e: -26, s: -9, arch: "Balanced" },
    killua:  { sar: [4, 3, 6], e: -26, s: -8, arch: "Fast/GC"  },
    netero:  { sar: [4, 3, 6], e: -26, s: -8, arch: "Fast/GC"  },
  },
};

function mkFighter(x, facing, ba = {}) {
  const f = { rosterKey: "t", facing, x, y: 400, w: 50, h: 100, vx: 0, vy: 0, groundY: 400,
    onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 100, maxEnergy: 100,
    maxAirHits: 3, basic_attacks: ba };
  ensureCombatState(f);
  return f;
}
function landMove(a, t, key, md) {
  a.attacking = false; a.currentAttack = null; a.currentMove = null; a.attackCooldown = 0;
  t.hitstun = 0; t.invulnTimer = 0;
  if (!startMove(a, key, md)) return { hit: false };
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--;
  resolveAttackHit(a, t, [], {});
  return { hit: !!a.currentAttack?.hasHit, enemyVy: t.vy, selfVy: a.vy, airHits: a.airHits };
}

for (const [universe, chars] of Object.entries(EXPECTED)) {
  group(universe.toUpperCase().replace("_", " "));
  for (const [key, x] of Object.entries(chars)) {
    const cd = getCharacter(key);
    const md = cd?.basic_attacks?.upAttack;
    console.log(`\n  ▸ ${cd?.name || key}  [${x.arch}]`);
    check(`${key}: frames = ${x.sar.join("/")}`,
      md && md.startup === x.sar[0] && md.active === x.sar[1] && md.recovery === x.sar[2],
      md && `${md.startup}/${md.active}/${md.recovery}`);

    const a = mkFighter(100, 1, cd.basic_attacks), t = mkFighter(168, -1);
    const r = landMove(a, t, "up", md);
    // MK-feel Stage 1b: launcher launches the ENEMY only; the attacker stays GROUNDED (no auto-lift/carry)
    // and must jump-cancel to convert. selfVy stays 0.
    check(`${key}: launches enemy vy=${x.e}, player stays GROUNDED`, r.enemyVy === x.e && r.selfVy === 0 && a.onGround === true, `enemy=${r.enemyVy} player=${r.selfVy} onGround=${a.onGround}`);
    check(`${key}: ENEMY airborne, player GROUNDED (jump-cancel required) + opener uncounted`,
      a.onGround === true && !t.onGround && t.isLaunched === true && r.airHits === 0);

    // Air-combo chain: 3 lofting hits, 4th falls faster, cap holds.
    const trace = [];
    for (let i = 1; i <= 4; i++) { a.onGround = false; t.onGround = false; t.isLaunched = true;
      landMove(a, t, "air", cd.basic_attacks.airAttack); trace.push({ airHits: a.airHits, vy: t.vy }); }
    const lofted3 = trace.slice(0, 3).every((h, i) => h.airHits === i + 1 && h.vy < 0);
    check(`${key}: 3 air hits loft & count, 4th falls faster (vy=${trace[3].vy}), cap=3`,
      lofted3 && trace[3].vy > 0 && a.airHits === 3, `airHits=${trace.map(h => h.airHits).join(",")}`);
  }
}

// ── GIANT-FORM handling (shared engine rule, keyed on the universal `_canvasHeightFrac` marker) ──
// Verifies the two giant rules that every giant/transform fighter (Adult Gon, Susanoo Madara/Sasuke,
// Mahoraga…) relies on, so a giant doesn't launch like a child and a planted giant doesn't self-pop.
group("GIANT-FORM RULES (shared)");
{
  // 1) Giant as TARGET resists the launch — its vy is halved vs a normal target.
  const a1 = mkFighter(100, 1, getCharacter("gojo").basic_attacks);
  const normal = mkFighter(168, -1);
  const giant  = mkFighter(168, -1); giant._canvasHeightFrac = 0.85;   // the giant marker (as enterGonAdultForm sets)
  const rn = landMove(a1, normal, "up", getCharacter("gojo").basic_attacks.upAttack);
  a1.attacking = false; a1.currentAttack = null; a1.attackCooldown = 0;
  const rg = landMove(a1, giant, "up", getCharacter("gojo").basic_attacks.upAttack);
  check(`giant TARGET resists launch (vy halved: ${rn.enemyVy} → ${rg.enemyVy})`, rg.enemyVy === Math.round(rn.enemyVy * 0.5));

  // 2) Planted giant as ATTACKER (canJump=false) does NOT self-pop — it stays grounded, enemy still launched.
  const gAtt = mkFighter(100, 1, getCharacter("gon").basic_attacks);
  gAtt._canvasHeightFrac = 0.85; gAtt.canJump = false;   // planted giant (Adult Gon)
  const tgt = mkFighter(168, -1);
  landMove(gAtt, tgt, "up", getCharacter("gon").basic_attacks.upAttack);
  check("planted giant ATTACKER stays grounded (no self-pop)", gAtt.onGround === true && gAtt.vy === 0, `onGround=${gAtt.onGround} vy=${gAtt.vy}`);
  check("planted giant still launches the ENEMY upward", tgt.vy < 0 && tgt.onGround === false && tgt.isLaunched, `enemy vy=${tgt.vy}`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`  UP-ATTACK ROSTER: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
