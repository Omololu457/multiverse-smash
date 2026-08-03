import { characters } from "../characters.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exists = p => fs.existsSync(path.join(ROOT, p));
const reanimOf = s => s.replace(/\.(png|jpe?g)$/i, "__reanim.png");

const rows = [];
for (const [key, c] of Object.entries(characters)) {
  const ad = c.animationData;
  if (!ad || c.hasSprites === false) { rows.push({ key, sprite: false }); continue; }
  // collect unique sheet paths
  const sheets = new Set();
  for (const d of Object.values(ad)) { if (d && d.sheet) sheets.add(d.sheet.replace(/^\.\//, "")); }
  if (sheets.size === 0) { rows.push({ key, sprite: false }); continue; }
  let have = 0, miss = [];
  for (const s of sheets) {
    // only count sheets whose ORIGINAL exists on disk (skip data referencing absent art)
    const orig = exists(s);
    if (reanimOf(s) && exists(reanimOf(s))) have++;
    else if (orig) miss.push(s);
  }
  rows.push({ key, sprite: true, total: sheets.size, have, missing: miss });
}
// print
console.log("KEY".padEnd(16), "SHEETS", "REANIM", "STATUS");
for (const r of rows) {
  if (!r.sprite) { console.log(r.key.padEnd(16), "  —    (no sprite animationData)"); continue; }
  const status = r.missing.length === 0 ? "COVERED" : `MISSING ${r.missing.length}`;
  console.log(r.key.padEnd(16), String(r.total).padStart(5), String(r.have).padStart(6), " ", status);
}
console.log("\n=== MISSING DETAIL (chars needing generation) ===");
for (const r of rows) {
  if (r.sprite && r.missing && r.missing.length) {
    console.log(`\n${r.key} (${r.missing.length} sheets, orig-on-disk):`);
    for (const m of r.missing) console.log("   " + m);
  }
}
// machine list of all missing sheet paths
const allMissing = rows.filter(r => r.missing && r.missing.length).flatMap(r => r.missing);
fs.writeFileSync(path.join(ROOT, "harness", "_reanim_missing.json"), JSON.stringify(allMissing, null, 0));
console.log(`\nTOTAL missing sheets: ${allMissing.length} (written to harness/_reanim_missing.json)`);
