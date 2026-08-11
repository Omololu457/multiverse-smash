// harness/stage_hazard_pilot.mjs — STAGE INTERACTABLES pilot, core-mechanic proof (node).
// Drives the REAL resolveStageHazard (stageHazards.js) — the logic game.js runs per fighter per frame —
// and proves the knocked-into-hazard contract:
//   • KNOCKED INTO it (real knockback / launched / in hitstun) + overlapping → damage + wall-splat reaction
//   • GENTLY walking into it (low vx, not stunned/launched) → NOTHING (can't be farmed by strolling over)
//   • not overlapping → nothing
//   • one contact = one hit (per-fighter cooldown), cooldown ticks down
//   • the reaction bounces the fighter back OUT of the hazard
// Run: `npm run test:stage-hazard`.
import { resolveStageHazard, hazardBox, HAZARD } from "../stageHazards.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };
const group = t => console.log(`\n═══ ${t} ═══`);

const GROUND = 400;
const HZ = { id: "arc_pylon", x: 2000, w: 46, height: 156, damage: 55, hitstun: 26 };
const HAZARDS = [HZ];
// A fighter box overlapping the pylon (x 2000..2046; box y 244..424 at GROUND 400).
function mkFighter(extra = {}) { return { x: 1980, y: 310, w: 60, h: 90, vx: 0, vy: 0, hitstun: 0, isLaunched: false, ...extra }; }

group("§1  hazard box geometry (ground-anchored pylon)");
{
  const b = hazardBox(HZ, GROUND);
  check("box x/w match the hazard", b.x === 2000 && b.w === 46, `x=${b.x} w=${b.w}`);
  check("box rises `height` above the ground", b.y === GROUND - 156, `y=${b.y}`);
  check("box extends to (just below) the ground", b.y + b.h >= GROUND, `bottom=${b.y + b.h}`);
}

group("§2  KNOCKED INTO the hazard → damage + wall-splat reaction");
{
  const f = mkFighter({ vx: 12 });   // flying right into the pylon (|vx| >= minKnockback)
  const dmg = resolveStageHazard(f, HAZARDS, GROUND);
  check("returns contact damage", dmg === 55, `dmg=${dmg}`);
  check("applies extended hitstun (wall-splat parity)", f.hitstun >= HZ.hitstun, `hitstun=${f.hitstun}`);
  check("sets wallBounce + _wallSplat window", f.wallBounce === true && f._wallSplat === HAZARD.splatFrames, `wb=${f.wallBounce} splat=${f._wallSplat}`);
  check("bounces the fighter back OUT (vx reversed)", f.vx < 0, `vx=${f.vx}`);
  check("flags a camera shake", f._hazardShake === true);
  check("records which hazard was hit", f._hazardHitId === "arc_pylon", f._hazardHitId);
  check("starts a per-contact cooldown", f._hazardCd === HAZARD.contactCd, `cd=${f._hazardCd}`);
}

group("§3  GENTLY walking in (low vx, not stunned/launched) → NO trigger");
{
  const f = mkFighter({ vx: 3 });   // strolling — below the knocked-into threshold
  const dmg = resolveStageHazard(f, HAZARDS, GROUND);
  check("no damage (can't farm by walking over it)", dmg === 0 && !f.wallBounce && (f.hitstun || 0) === 0, `dmg=${dmg}`);
}

group("§4  not overlapping → nothing");
{
  const f = mkFighter({ x: 1200, vx: 14 });   // fast, but far from the pylon
  check("no trigger when the boxes don't overlap", resolveStageHazard(f, HAZARDS, GROUND) === 0);
}

group("§5  launched / in-hitstun fighters trigger even at low vx");
{
  const launched = mkFighter({ vx: 1, isLaunched: true });
  check("a LAUNCHED fighter drifting in still triggers", resolveStageHazard(launched, HAZARDS, GROUND) === 55);
  const stunned = mkFighter({ vx: 0, hitstun: 8 });
  check("an IN-HITSTUN fighter pressed into it triggers", resolveStageHazard(stunned, HAZARDS, GROUND) === 55);
}

group("§6  one contact = one hit (cooldown), then it ticks down");
{
  const f = mkFighter({ vx: 12 });
  const d1 = resolveStageHazard(f, HAZARDS, GROUND);     // hit
  const cd0 = f._hazardCd;
  const d2 = resolveStageHazard(f, HAZARDS, GROUND);     // same contact, next frame → blocked by cd
  check("second frame during cooldown does NOT re-damage", d1 === 55 && d2 === 0, `d1=${d1} d2=${d2}`);
  check("cooldown ticked down by one", f._hazardCd === cd0 - 1, `cd ${cd0}→${f._hazardCd}`);
}

group("§7  no hazards / empty stage → always inert");
{
  const f = mkFighter({ vx: 20 });
  check("empty hazard list → 0", resolveStageHazard(f, [], GROUND) === 0 && !f.wallBounce);
}

console.log(`\n════════════════════════════════════════`);
console.log(`  STAGE HAZARD PILOT (core mechanic): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
