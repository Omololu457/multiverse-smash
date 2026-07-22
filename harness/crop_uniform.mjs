// harness/crop_uniform.mjs
// ---------------------------------------------------------------------------
// Pack a sprite strip into a UNIFORM-cell strip using EXPLICIT frame boundaries
// instead of auto island-detection. Use this when a sheet has interior debris
// (detached FX puffs, drifting smoke) that island-detection would wrongly split
// into empty frames — here you name the cut points so debris stays inside its
// owning frame's cell.
//
//   node harness/crop_uniform.mjs <src.png> <out.png> <startX,startX,...> [pad=2]
//     startX list = left edge of each frame (in source px). Each frame spans
//     [startX_i .. startX_{i+1}); the last spans to the sheet's right edge.
//
// Full sheet height is preserved (feet/vertical alignment kept). Prints the
// resulting { frames, width, height } for animationData.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, out, cutsA, padA] = process.argv.slice(2);
if (!src || !out || !cutsA) { console.error("usage: crop_uniform.mjs <src.png> <out.png> <startX,startX,...> [pad]"); process.exit(2); }
const PAD = Number.isFinite(+padA) && padA !== undefined ? +padA : 2;
const cuts = cutsA.split(",").map(n => +n).filter(n => Number.isFinite(n));

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "image/png" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" }).catch(() => {});

const result = await page.evaluate(async ({ url, cuts, PAD }) => {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  c.getContext("2d").drawImage(img, 0, 0);
  const spans = cuts.map((s, i) => ({ start: s, end: (i + 1 < cuts.length ? cuts[i + 1] : W) }));
  const cellW = Math.max(...spans.map(s => s.end - s.start)) + PAD * 2;
  const outC = document.createElement("canvas"); outC.width = cellW * spans.length; outC.height = H;
  const octx = outC.getContext("2d");
  spans.forEach((s, i) => {
    const w = s.end - s.start;
    const dx = i * cellW + Math.floor((cellW - w) / 2);
    octx.drawImage(c, s.start, 0, w, H, dx, 0, w, H);
  });
  return { url: outC.toDataURL("image/png"), frames: spans.length, width: cellW, height: H };
}, { url: `${base}/${src}`, cuts, PAD });

fs.writeFileSync(path.join(ROOT, out), Buffer.from(result.url.replace(/^data:image\/png;base64,/, ""), "base64"));
console.log(`${out}  ←  ${src}`);
console.log(`  { frames: ${result.frames}, width: ${result.width}, height: ${result.height} }`);

await browser.close();
server.close();
