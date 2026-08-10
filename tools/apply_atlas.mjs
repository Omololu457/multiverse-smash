// tools/apply_atlas.mjs
// ──────────────────────────────────────────────────────────────────────────
// Applies an atlas pack to characters.js IN PLACE (Stage 22B migration), preserving
// every comment: for each of the character's animationData action lines, it rewrites
// the `sheet: "..."` to the atlas and sets `sourceY: <row offset>` (adding the key if
// absent, updating it if present). Nothing else on the line changes.
//
// Reuses the map emitted by atlas_pack.mjs (<char>_atlas_map.json). Idempotent-ish:
// re-running after a pack is safe. Verify the character's harness suite afterwards.
//
// USAGE:  node tools/atlas_pack.mjs <charKey>   # first — packs + writes the map
//         node tools/apply_atlas.mjs <charKey>  # then — rewrites characters.js
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const charKey = process.argv[2];
if (!charKey) { console.error("usage: apply_atlas.mjs <charKey>"); process.exit(2); }

const mapPath = path.join(ROOT, `${charKey}_atlas_map.json`);
if (!fs.existsSync(mapPath)) { console.error(`missing ${charKey}_atlas_map.json — run: node tools/atlas_pack.mjs ${charKey}`); process.exit(2); }
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

const file = path.join(ROOT, "characters.js");
let src = fs.readFileSync(file, "utf8");
const lines = src.split("\n");

// Locate the character's animationData block: from `rosterKey: "<key>"` → next `animationData: {`
// → its matching `  },` (2-space-indented close).
let start = lines.findIndex(l => new RegExp(`rosterKey:\\s*"${charKey}"`).test(l));
if (start < 0) { console.error(`character ${charKey} not found in characters.js`); process.exit(1); }
let animStart = -1;
for (let i = start; i < lines.length; i++) { if (/^\s*animationData:\s*\{/.test(lines[i])) { animStart = i; break; } }
if (animStart < 0) { console.error(`no animationData block for ${charKey}`); process.exit(1); }
let animEnd = -1;
for (let i = animStart + 1; i < lines.length; i++) { if (/^\s{2}\},/.test(lines[i])) { animEnd = i; break; } }
if (animEnd < 0) { console.error(`unterminated animationData block for ${charKey}`); process.exit(1); }

let rewrites = 0, missing = [];
for (let i = animStart + 1; i < animEnd; i++) {
  const m = lines[i].match(/^(\s*)([A-Za-z0-9_]+):\s*\{/);
  if (!m) continue;                                  // comment / blank line
  const action = m[2];
  const info = map.actions[action];
  if (!info) { if (/sheet:/.test(lines[i])) missing.push(action); continue; }
  let line = lines[i];
  // 1) point sheet at the atlas
  line = line.replace(/sheet:\s*"[^"]*"/, `sheet: "${info.sheet}"`);
  // 2) set sourceY: update in place, else insert right before `sheet:`
  if (/sourceY:\s*-?\d+/.test(line)) line = line.replace(/sourceY:\s*-?\d+/, `sourceY: ${info.sourceY}`);
  else line = line.replace(/(\s*)sheet:/, ` sourceY: ${info.sourceY},$1sheet:`);
  if (line !== lines[i]) { lines[i] = line; rewrites++; }
}

if (missing.length) console.warn(`  ⚠ actions with a sheet but no map entry (left unchanged): ${missing.join(", ")}`);
fs.writeFileSync(file, lines.join("\n"));
console.log(`✅ ${charKey}: rewrote ${rewrites} action lines → ${map.atlas}  (characters.js lines ${animStart + 1}-${animEnd + 1}, comments preserved)`);
