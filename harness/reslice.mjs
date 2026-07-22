// harness/reslice.mjs
// ---------------------------------------------------------------------------
// RE-SLICE a non-uniform sprite strip into a clean UNIFORM-cell strip the engine
// can slice by a single pitch. Detects content islands via alpha gutters (same as
// slice_scan), then repacks a chosen subset of frames into equal cells, each frame
// horizontally CENTERED and vertically PRESERVED (feet alignment kept intact).
//
//   node harness/reslice.mjs <src.png> <out.png> [segFrom] [segTo] [pad=3] [alpha=8]
//     segFrom/segTo = inclusive content-island indices (default: all)
//
// Prints the resulting { frames, width, height } to paste into animationData.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, out, segFromA, segToA, padA, alphaA] = process.argv.slice(2);
if (!src || !out) { console.error("usage: reslice.mjs <src.png> <out.png> [segFrom] [segTo] [pad] [alpha]"); process.exit(2); }
const PAD = Number.isFinite(+padA) && padA !== undefined ? +padA : 3;
const ALPHA = Number.isFinite(+alphaA) && alphaA !== undefined ? +alphaA : 8;

const MIME = { ".png": "image/png" };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" }).catch(() => {});

const dataUrl = await page.evaluate(async ({ url, ALPHA, PAD, segFromA, segToA }) => {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, W, H).data;
  const colOpaque = new Array(W).fill(0);
  for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < H; y++) if (px[(y * W + x) * 4 + 3] > ALPHA) n++; colOpaque[x] = n; }
  // detect content islands
  const segs = []; let x = 0;
  while (x < W) { while (x < W && colOpaque[x] === 0) x++; if (x >= W) break; const s = x; while (x < W && colOpaque[x] > 0) x++; segs.push({ start: s, end: x - 1, w: x - s }); }
  const from = segFromA !== undefined && segFromA !== "" ? +segFromA : 0;
  const to = segToA !== undefined && segToA !== "" ? +segToA : segs.length - 1;
  const chosen = segs.slice(from, to + 1);
  const cellW = Math.max(...chosen.map(s => s.w)) + PAD * 2;
  const outC = document.createElement("canvas"); outC.width = cellW * chosen.length; outC.height = H;
  const octx = outC.getContext("2d");
  chosen.forEach((s, i) => {
    const dx = i * cellW + Math.floor((cellW - s.w) / 2);   // horizontally center content in the cell
    octx.drawImage(c, s.start, 0, s.w, H, dx, 0, s.w, H);   // full-height copy → vertical/feet alignment preserved
  });
  return { url: outC.toDataURL("image/png"), frames: chosen.length, width: cellW, height: H, detected: segs.length };
}, { url: `${base}/${src}`, ALPHA, PAD, segFromA, segToA });

const b64 = dataUrl.url.replace(/^data:image\/png;base64,/, "");
fs.writeFileSync(path.join(ROOT, out), Buffer.from(b64, "base64"));
console.log(`${out}  ←  ${src}  (detected ${dataUrl.detected} islands)`);
console.log(`  { frames: ${dataUrl.frames}, width: ${dataUrl.width}, height: ${dataUrl.height} }`);

await browser.close();
server.close();
