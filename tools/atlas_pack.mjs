// tools/atlas_pack.mjs
// ──────────────────────────────────────────────────────────────────────────
// SPRITE ATLAS PACKER (Stage 22A). Packs ALL of a character's per-action source
// sheets into ONE <char>_atlas.png so a match loads 1 image instead of 20-40.
//
// STRATEGY — row-per-source-sheet, WHOLE-SHEET copy (pixel-identical by construction):
//   • Collect the DISTINCT source sheets referenced by the character's animationData
//     (dedup by path — shared sheets like walk/run map to the SAME row).
//   • Stack them vertically: each sheet is drawn UNCHANGED at (0, rowY).
//   • Rewrite each action to point at the atlas with sourceY += rowY. sourceX, width,
//     height, frames — and every per-action field (anchorY, actionScale, speed, loop,
//     lockLastFrame, loopStart, …) — are PRESERVED verbatim.
//   Because whole sheets are copied and sprite.js crops with the SAME
//   sx=sourceX+frame*width / sy=sourceY math, rendering is byte-identical and sprite.js
//   needs ZERO changes.
//
// SELF-VALIDATION: after packing, every frame of every action is compared pixel-for-pixel
// (getImageData) between the atlas crop and the original-sheet crop. Any mismatch → the
// pack is REJECTED (non-zero exit), so a wrong pack can never be committed.
//
// USAGE:  node tools/atlas_pack.mjs <charKey> [--write] [--out=<file.png>]
//   (prints the new animationData block; --write also saves <char>_atlas_animdata.js)
// Follows the existing headless-Chromium + canvas tooling pattern (concat_uniform.mjs).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => { const [k, v] = a.slice(2).split("="); return [k, v ?? true]; }));
const charKey = args.find(a => !a.startsWith("--"));
if (!charKey || !characters[charKey]) { console.error(`usage: atlas_pack.mjs <charKey> [--write]\nunknown character: ${charKey}`); process.exit(2); }

const char = characters[charKey];
const anim = char.animationData || {};
const atlasName = String(opts.out || `${charKey}_atlas.png`).replace(/^\.\//, "");
const atlasRef  = `./${atlasName}`;

// Distinct source sheets in first-appearance order (a stable, deterministic row layout).
const sheetOrder = [];
for (const def of Object.values(anim)) {
  const s = def?.sheet; if (s && !sheetOrder.includes(s)) sheetOrder.push(s);
}
if (!sheetOrder.length) { console.error(`${charKey}: no animationData sheets to pack`); process.exit(2); }
const actionsWithoutSheet = Object.keys(anim).filter(k => !anim[k]?.sheet);

// ── serve repo files so the browser can decode the PNGs ──
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "image/png" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" }).catch(() => {});

// Build the atlas + return the per-sheet row offsets + a pixel-perfect self-check.
const packPayload = {
  sheets: sheetOrder.map(s => ({ ref: s, url: `${base}/${s.replace(/^\.\//, "")}` })),
  // action → { sheet, sourceX, sourceY, width, height, frames } for the frame-by-frame diff
  actions: Object.entries(anim).filter(([, d]) => d?.sheet).map(([name, d]) => ({
    name, sheet: d.sheet, sourceX: d.sourceX || 0, sourceY: d.sourceY || 0,
    width: d.width || 0, height: d.height || 0, frames: d.frames || 1
  }))
};

const result = await page.evaluate(async ({ sheets, actions }) => {
  // Decode every distinct sheet, record its size.
  const byRef = {};
  let atlasW = 0, atlasH = 0;
  const rows = [];
  for (const s of sheets) {
    const img = new Image(); img.src = s.url; await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    byRef[s.ref] = { img, w, h, rowY: atlasH };
    rows.push({ ref: s.ref, rowY: atlasH, w, h });
    atlasW = Math.max(atlasW, w); atlasH += h;
  }
  // Compose the atlas: each sheet drawn UNCHANGED at (0, rowY).
  const atlas = document.createElement("canvas"); atlas.width = atlasW; atlas.height = atlasH;
  const actx = atlas.getContext("2d");
  for (const s of sheets) { const r = byRef[s.ref]; actx.drawImage(r.img, 0, r.rowY); }

  // SELF-VALIDATION — compare every frame crop atlas-vs-original, pixel for pixel.
  const asrc = actx.getImageData(0, 0, atlasW, atlasH).data;
  // per-original-sheet ImageData for reference
  const refData = {};
  for (const s of sheets) { const r = byRef[s.ref]; const c = document.createElement("canvas"); c.width = r.w; c.height = r.h; const cx = c.getContext("2d"); cx.drawImage(r.img, 0, 0); refData[s.ref] = cx.getImageData(0, 0, r.w, r.h).data; }
  const mismatches = [];
  for (const a of actions) {
    const r = byRef[a.sheet]; if (!r) { mismatches.push(`${a.name}: sheet missing`); continue; }
    for (let f = 0; f < a.frames; f++) {
      const ox = a.sourceX + f * a.width, oy = a.sourceY;                 // original sheet coords
      const ax = a.sourceX + f * a.width, ay = a.sourceY + r.rowY;        // atlas coords
      for (let yy = 0; yy < a.height; yy++) for (let xx = 0; xx < a.width; xx++) {
        const oi = ((oy + yy) * r.w + (ox + xx)) * 4;
        const ai = ((ay + yy) * atlasW + (ax + xx)) * 4;
        if (refData[a.sheet][oi] !== asrc[ai] || refData[a.sheet][oi+1] !== asrc[ai+1] ||
            refData[a.sheet][oi+2] !== asrc[ai+2] || refData[a.sheet][oi+3] !== asrc[ai+3]) {
          mismatches.push(`${a.name} frame ${f} @(${xx},${yy})`); f = a.frames; break;
        }
      }
    }
  }
  return { url: atlas.toDataURL("image/png"), atlasW, atlasH, rows, mismatches: mismatches.slice(0, 20) };
}, packPayload);

await browser.close(); server.close();

if (result.mismatches.length) {
  console.error(`❌ ATLAS PACK REJECTED for ${charKey} — ${result.mismatches.length} pixel mismatch(es):`);
  for (const m of result.mismatches) console.error(`   ${m}`);
  process.exit(1);
}

// Write the atlas PNG.
fs.writeFileSync(path.join(ROOT, atlasName), Buffer.from(result.url.replace(/^data:image\/png;base64,/, ""), "base64"));

// Row offset per source sheet.
const rowY = {}; for (const r of result.rows) rowY[r.ref] = r.rowY;

// Machine-readable migration map (consumed by tools/apply_atlas.mjs to rewrite characters.js
// IN PLACE — preserving the block's comments). Per action: the atlas sheet + its new sourceY.
const map = { atlas: atlasRef, actions: {} };
for (const [name, d] of Object.entries(anim)) {
  if (!d?.sheet) continue;
  map.actions[name] = { sheet: atlasRef, sourceY: (d.sourceY || 0) + (rowY[d.sheet] ?? 0) };
}
fs.writeFileSync(path.join(ROOT, `${charKey}_atlas_map.json`), JSON.stringify(map, null, 2));

// Build the new animationData: preserve EVERY field, override sheet + sourceY only.
const KEY_ORDER = ["frames", "width", "height", "speed", "anchorY", "actionScale", "sourceX", "sourceY", "loop", "lockLastFrame", "loopStart", "sheet"];
function fmtDef(name, d) {
  const nd = { ...d };
  nd.sourceY = (d.sourceY || 0) + (rowY[d.sheet] ?? 0);
  nd.sheet = atlasRef;
  const keys = [...new Set([...KEY_ORDER, ...Object.keys(nd)])].filter(k => k in nd);
  const body = keys.map(k => `${k}: ${JSON.stringify(nd[k])}`).join(", ");
  return `    ${name}: { ${body} },`;
}
const block = ["  animationData: {",
  ...Object.entries(anim).map(([name, d]) => d?.sheet ? fmtDef(name, d) : `    ${name}: ${JSON.stringify(d)},   // (no sheet — unchanged)`),
  "  },"].join("\n");

console.log(`✅ ${charKey}: packed ${sheetOrder.length} sheets → ${atlasName}  (${result.atlasW}×${result.atlasH}, ${result.mismatches.length === 0 ? "PIXEL-IDENTICAL" : "MISMATCH"})`);
if (actionsWithoutSheet.length) console.log(`   (actions without a sheet, left unchanged: ${actionsWithoutSheet.join(", ")})`);
console.log(`   distinct sheets ${sheetOrder.length} → 1 image  (that many fewer HTTP requests at match start)\n`);
console.log(block);
if (opts.write) { fs.writeFileSync(path.join(ROOT, `${charKey}_atlas_animdata.js`), block + "\n"); console.log(`\n(written to ${charKey}_atlas_animdata.js)`); }
