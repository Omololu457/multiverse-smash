// harness/albedo.test.mjs
// ALBEDO smoke test (Stage 5). Albedo shares Ben 10's entire kit (setupBen10 /
// special+ultimate dispatch / command combat) and is purely a recolored-art build.
// This proves he is SELECTABLE and that every sprite sheet he uses RESOLVES to a real
// __albedo file on disk (no procedural fallback box), for his human form AND all three
// art-backed alien forms after the retag on transform.
//   node harness/albedo.test.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
import { setupBen10, applyAlien } from "../fighters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("✓ " + m); } else { fail++; console.log("✗ " + m); } };
const exists = s => fs.existsSync(path.join(ROOT, (s || "").replace(/^\.\//, "")));

const a = characters.albedo;
ok(!!a, "albedo entry exists");
ok(a.isPlayable === true, "isPlayable === true (selectable)");
ok(a.hasSprites === true, "hasSprites === true");
ok(!a.hidden, "not hidden");
ok(Array.isArray(a.introPool) && a.introPool[0] === "intro", 'introPool ["intro"] (intro fix, not the transform freeze)');
ok(typeof a.portrait === "string" && a.portrait.includes("__albedo") && exists(a.portrait), `portrait resolves: ${a.portrait}`);

// HUMAN form: every animationData sheet must be an __albedo file that exists (no fallback).
let humanMiss = 0;
for (const [k, d] of Object.entries(a.animationData)) {
  if (!d.sheet.includes("__albedo")) { humanMiss++; console.log("   not tagged:", k, d.sheet); }
  else if (!exists(d.sheet)) { humanMiss++; console.log("   missing:", k, d.sheet); }
}
ok(humanMiss === 0, `human form: all ${Object.keys(a.animationData).length} sheets are __albedo and exist`);

// ALIEN forms: setupBen10 tags him, applyAlien retags each alien's sheets to __albedo.
const f = { rosterKey: "albedo", x: 0, y: 0, h: 110, height: 110, maxHealth: 1250, health: 1250, energy: 100 };
setupBen10(f, ["xlr8", "diamondhead", "feedback"]);
ok(f._recolorTag === "albedo", 'setupBen10 sets _recolorTag = "albedo"');
for (const al of ["xlr8", "diamondhead", "feedback"]) {
  applyAlien(f, al);
  let miss = 0;
  for (const [k, d] of Object.entries(f._skinAnim || {})) {
    if (!d.sheet) continue;
    if (!d.sheet.includes("__albedo")) { miss++; console.log(`   ${al} not tagged:`, k, d.sheet); }
    else if (!exists(d.sheet)) { miss++; console.log(`   ${al} missing:`, k, d.sheet); }
  }
  ok(miss === 0, `${al} form: all _skinAnim sheets are __albedo and exist (no fallback box)`);
}

console.log("\n════════════════════════════════════════");
console.log(`  ALBEDO SMOKE: ${pass} passed, ${fail} failed`);
console.log("════════════════════════════════════════");
process.exit(fail ? 1 : 0);
