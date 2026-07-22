// harness/slice_scan.mjs
// ---------------------------------------------------------------------------
// ALPHA-GUTTER frame slicer. Loads a PNG in a real browser canvas, reads the
// alpha channel per column, and reports runs of fully-transparent "gutter"
// columns → the content segments between them are the real frames. Does NOT
// assume sheet_width / frame_count even division.
//
//   node harness/slice_scan.mjs <file.png> [alphaThresh=8] [minGutter=1]
//   node harness/slice_scan.mjs vegeta_base_idle.png
//
// Output: per-segment [start..end] width, plus leading/trailing margins and a
// suggested uniform pitch if the segments look even.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = process.argv.slice(2).filter(a => a.endsWith(".png"));
const nums = process.argv.slice(2).filter(a => !a.endsWith(".png")).map(Number);
const ALPHA = Number.isFinite(nums[0]) ? nums[0] : 8;   // alpha <= this = transparent
const MINGUT = Number.isFinite(nums[1]) ? nums[1] : 1;   // min consecutive transparent cols to count as a gutter

const MIME = { ".png": "image/png", ".html": "text/html", ".mjs": "text/javascript" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(ROOT, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" }).catch(() => {});   // same-origin so getImageData isn't tainted

for (const file of files) {
  const res = await page.evaluate(async ({ url, ALPHA, MINGUT }) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, W, H).data;
    // opaque[x] = # of non-transparent pixels in column x
    const colOpaque = new Array(W).fill(0);
    let maxColAlpha = new Array(W).fill(0);
    for (let x = 0; x < W; x++) {
      let cnt = 0, mx = 0;
      for (let y = 0; y < H; y++) {
        const a = data[(y * W + x) * 4 + 3];
        if (a > ALPHA) cnt++;
        if (a > mx) mx = a;
      }
      colOpaque[x] = cnt; maxColAlpha[x] = mx;
    }
    // segments = maximal runs where colOpaque>0, separated by gutters of >=MINGUT empty cols
    const segs = [];
    let x = 0;
    while (x < W) {
      while (x < W && colOpaque[x] === 0) x++;      // skip gutter
      if (x >= W) break;
      const start = x;
      while (x < W && colOpaque[x] > 0) x++;         // consume content
      // merge across tiny gutters < MINGUT
      let end = x - 1;
      while (true) {
        let g = 0, k = x;
        while (k < W && colOpaque[k] === 0) { g++; k++; }
        if (g > 0 && g < MINGUT && k < W) { while (x < W && (colOpaque[x] === 0 || colOpaque[x] > 0) && x < k) x++; while (x < W && colOpaque[x] > 0) x++; end = x - 1; }
        else break;
      }
      segs.push({ start, end, w: end - start + 1 });
    }
    return { W, H, segs, colOpaque };
  }, { url: `${base}/${file}`, ALPHA, MINGUT });

  const { W, H, segs } = res;
  const widths = segs.map(s => s.w);
  const avg = widths.reduce((a, b) => a + b, 0) / (widths.length || 1);
  const minW = Math.min(...widths), maxW = Math.max(...widths);
  console.log(`\n━━ ${file}  (${W}×${H})  ALPHA<=${ALPHA} MINGUT=${MINGUT}`);
  console.log(`   segments (content islands separated by transparent gutters): ${segs.length}`);
  console.log(`   ${segs.map((s, i) => `#${i}[${s.start}-${s.end}]w${s.w}`).join("  ")}`);
  console.log(`   width: min=${minW} max=${maxW} avg=${avg.toFixed(1)}  evenPitch=${(W / segs.length).toFixed(1)}`);
  // Gap between segment starts (the real per-frame pitch when frames are separated)
  if (segs.length > 1) {
    const pitches = segs.slice(1).map((s, i) => s.start - segs[i].start);
    console.log(`   start-to-start pitches: ${pitches.join(", ")}`);
  }
}

await browser.close();
server.close();
