// tools/slice_probe.mjs
// ─────────────────────────────────────────────────────────────────────────
// Alpha-gutter frame-boundary probe for horizontal sprite strips (project
// standard). For each sheet: measures per-column non-transparent pixel counts,
// detects transparent "gutter" columns between frames, reports the real content
// runs (= true frame boundaries), and WRITES a magnified boundary-overlay PNG so
// the slicing can be visually inspected — red = detected content-run edges,
// yellow-dashed = the CURRENTLY-WIRED uniform split (frames×width) for comparison.
//
// USAGE:  node tools/slice_probe.mjs <file.png>:<curFrames>[:<curWidth>] [...]
//   e.g.  node tools/slice_probe.mjs black_goku_idle.png:4:57 black_goku_front_attack.png:6:66
// Overlays → harness/shots/SLICE_<basename>.png   (force-add to commit them).
// ─────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const ALPHA = 16;          // alpha <= this = transparent (matches tools/relayout_gojo_sheets.mjs)
// overlay magnification is computed per-sheet so the PNG stays < 1900px wide (image-read limit)

const MIME = { ".png": "image/png", ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = http.createServer((req, res) => {
  const f = path.join(REPO, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "access-control-allow-origin": "*" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const targets = process.argv.slice(2).map(s => { const [file, frames, width] = s.split(":"); return { file, curFrames: +frames || null, curWidth: +width || null }; });
if (!targets.length) { console.log("no targets"); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();

for (const t of targets) {
  const r = await page.evaluate(async ({ url, ALPHA, curFrames, curWidth }) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = url;
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const SCALE = Math.max(2, Math.min(8, Math.floor(1880 / W)));   // keep overlay < ~1900px wide
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, W, H).data;
    // per-column content count (non-transparent pixels)
    const col = new Array(W).fill(0);
    for (let x = 0; x < W; x++) { let c = 0; for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > ALPHA) c++; col[x] = c; }
    // content runs = maximal spans where col>0, split by gutter columns (col===0)
    const runs = []; let s = -1;
    for (let x = 0; x < W; x++) { if (col[x] > 0) { if (s < 0) s = x; } else { if (s >= 0) { runs.push([s, x - 1]); s = -1; } } }
    if (s >= 0) runs.push([s, W - 1]);
    // gutters between consecutive runs
    const gutters = []; for (let i = 1; i < runs.length; i++) gutters.push([runs[i - 1][1] + 1, runs[i][0] - 1]);

    // ── overlay ──
    const o = document.createElement("canvas"); o.width = W * SCALE; o.height = H * SCALE + 24 * SCALE / 2;
    const ox = o.getContext("2d"); ox.imageSmoothingEnabled = false;
    ox.fillStyle = "#202433"; ox.fillRect(0, 0, o.width, o.height);
    ox.drawImage(img, 0, 0, W * SCALE, H * SCALE);
    // detected content-run edges (red solid)
    ox.lineWidth = 1; ox.strokeStyle = "rgba(255,40,40,0.9)"; ox.fillStyle = "#ff4040"; ox.font = `${8 * SCALE / 2}px monospace`;
    runs.forEach(([a, b], i) => {
      for (const xx of [a, b + 1]) { ox.beginPath(); ox.moveTo(xx * SCALE, 0); ox.lineTo(xx * SCALE, H * SCALE); ox.stroke(); }
      ox.fillText(String(i), (a * SCALE) + 2, H * SCALE + 9 * SCALE / 2);
    });
    // currently-wired uniform split (yellow dashed)
    if (curFrames && curWidth) {
      ox.strokeStyle = "rgba(255,220,0,0.85)"; ox.setLineDash([4 * SCALE / 2, 3 * SCALE / 2]);
      for (let i = 0; i <= curFrames; i++) { const xx = i * curWidth; ox.beginPath(); ox.moveTo(xx * SCALE, 0); ox.lineTo(xx * SCALE, H * SCALE); ox.stroke(); }
      ox.setLineDash([]);
    }
    return { W, H, col, runs, gutters, overlay: o.toDataURL("image/png") };
  }, { url: `${base}/${t.file}`, ALPHA, curFrames: t.curFrames, curWidth: t.curWidth });

  const b64 = r.overlay.split(",")[1];
  const outName = `SLICE_${t.file.replace(/\.png$/, "")}.png`;
  fs.writeFileSync(path.join(OUT, outName), Buffer.from(b64, "base64"));

  console.log(`\n══ ${t.file}  (${r.W}×${r.H})  ${t.curFrames ? `wired=${t.curFrames}f×${t.curWidth}px` : ""}`);
  console.log(`   detected ${r.runs.length} content run(s) separated by ${r.gutters.length} gutter(s):`);
  r.runs.forEach(([a, b], i) => console.log(`     frame ${i}: x=${a}..${b}  width=${b - a + 1}`));
  if (r.gutters.length) console.log(`   gutters: ${r.gutters.map(([a, b]) => `${a}..${b}(${b - a + 1}px)`).join("  ")}`);
  else console.log(`   NO transparent gutters — frames touch; uniform split is the only guide (inspect overlay).`);
  // uniform-split diagnosis
  if (t.curFrames) { const uw = r.W / t.curFrames; console.log(`   uniform ${t.curFrames}-frame cell = ${(r.W / t.curFrames).toFixed(2)}px (wired width ${t.curWidth} → covers ${(t.curFrames * t.curWidth)}/${r.W}px)`); void uw; }
  console.log(`   overlay → harness/shots/${outName}`);
}

await browser.close(); server.close();
