// tools/check_fx_manifest.mjs — Stage 10 drift guard for preloadManifest.js
//
// abilities.js spawns projectile/FX/form sheets as inline literals with no central registry, so the
// preload manifest is hand-curated and WILL drift as the roster grows. This guard re-scans abilities.js
// for every "./…​.png" reference and asserts that each one is present SOMEWHERE in FX_SHEETS_BY_CHAR.
// A missing path means a newly-added FX sheet will first-use-fault (and, if the file is absent, 404 at
// draw time) — surface it loudly at CI time, not silently in a match. Wired as `npm run test:fx-manifest`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(REPO, "abilities.js"), "utf8");

const referenced = [...new Set([...src.matchAll(/"(\.\/[A-Za-z0-9_./-]+\.png)"/g)].map(m => m[1]))].sort();

const { FX_SHEETS_BY_CHAR } = await import(path.join(REPO, "preloadManifest.js"));
const listed = new Set(Object.values(FX_SHEETS_BY_CHAR).flat());

const missing = referenced.filter(p => !listed.has(p));
// Also flag manifest entries whose file doesn't exist on disk (a 404-at-draw-time landmine).
const onDisk = new Set(fs.readdirSync(REPO).filter(f => f.endsWith(".png")).map(f => "./" + f));
const ghosts = [...listed].filter(p => !onDisk.has(p)).sort();

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? "  — " + detail : ""}`); }
};

console.log("FX manifest drift guard");
check(`every abilities.js FX sheet is listed (${referenced.length} referenced)`,
  missing.length === 0, missing.length ? `unlisted:\n     ${missing.join("\n     ")}` : "");
check(`no manifest entry points at a missing file`,
  ghosts.length === 0, ghosts.length ? `ghosts:\n     ${ghosts.join("\n     ")}` : "");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"}  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
