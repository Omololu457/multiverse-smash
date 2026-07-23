// tools/reslice_strip.mjs
// ─────────────────────────────────────────────────────────────────────────
// Re-slice a horizontal sprite strip into CLEAN uniform, feet-aligned cells.
// Detects frames by transparent alpha gutters, takes each frame's content
// bbox, then repacks every frame into one uniform cell (uW×uH): centered-X,
// BOTTOM-aligned so feet line up across frames. Fixes the "non-uniform pitch →
// wide-frame left-clip / horizontal jitter" bug. Overwrites the PNG in place
// (originals are recoverable from git). Prints the new frames/width/height.
//
// USAGE:  node tools/reslice_strip.mjs <file.png>[:<runStart>-<runEnd>] [...]
//   e.g.  node tools/reslice_strip.mjs black_goku_idle.png:0-3   ← keep only runs 0..3 (idle variant A)
//         node tools/reslice_strip.mjs black_goku_front_attack.png
// ─────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALPHA = 16;
const server = http.createServer((req, res) => {
  const f = path.join(REPO, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "image/png", "access-control-allow-origin": "*" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// --minw=<px>: drop content islands narrower than <px> before framing. Kills stray debris specks
// (a few loose pixels between real frames) that would otherwise each grab their own uniform cell.
const MINW = +(((process.argv.slice(2).find(a => a.startsWith("--minw=")) || "").split("=")[1]) || 0);
const targets = process.argv.slice(2).filter(a => !a.startsWith("--")).map(s => {
  const [file, range] = s.split(":");
  let rs = null, re = null;
  if (range) { const [a, b] = range.split("-").map(Number); rs = a; re = b; }
  return { file, rs, re };
});

const browser = await chromium.launch();
const page = await browser.newPage();

for (const t of targets) {
  const r = await page.evaluate(async ({ url, ALPHA, rs, re, MINW }) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = url; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
    const D = cx.getImageData(0, 0, W, H).data;
    const isSolid = (x, y) => D[(y * W + x) * 4 + 3] > ALPHA;
    // column content → content runs (frames)
    const col = new Array(W).fill(0);
    for (let x = 0; x < W; x++) { let c = 0; for (let y = 0; y < H; y++) if (isSolid(x, y)) c++; col[x] = c; }
    let runs = []; let s = -1;
    for (let x = 0; x < W; x++) { if (col[x] > 0) { if (s < 0) s = x; } else { if (s >= 0) { runs.push([s, x - 1]); s = -1; } } }
    if (s >= 0) runs.push([s, W - 1]);
    if (MINW > 0) runs = runs.filter(([a, b]) => (b - a + 1) >= MINW);
    if (rs != null && re != null) runs = runs.slice(rs, re + 1);
    // per-frame content bbox (x from run, y scanned within run)
    const frames = runs.map(([x0, x1]) => {
      let miny = H, maxy = -1;
      for (let y = 0; y < H; y++) for (let x = x0; x <= x1; x++) if (isSolid(x, y)) { if (y < miny) miny = y; if (y > maxy) maxy = y; break; }
      return { sx: x0, sy: miny, sw: x1 - x0 + 1, sh: maxy - miny + 1 };
    });
    const uW = Math.max(...frames.map(f => f.sw)) + 2;
    const uH = Math.max(...frames.map(f => f.sh)) + 2;
    // repack: uniform strip, centered-X, bottom-aligned (1px bottom pad)
    const strip = document.createElement("canvas"); strip.width = uW * frames.length; strip.height = uH;
    const sx = strip.getContext("2d"); sx.imageSmoothingEnabled = false;
    frames.forEach((f, i) => {
      const dx = i * uW + Math.floor((uW - f.sw) / 2);
      const dy = uH - f.sh - 1;
      sx.drawImage(img, f.sx, f.sy, f.sw, f.sh, dx, dy, f.sw, f.sh);
    });
    return { W, H, n: frames.length, uW, uH, frames, png: strip.toDataURL("image/png") };
  }, { url: `${base}/${t.file}`, ALPHA, rs: t.rs, re: t.re, MINW });

  fs.writeFileSync(path.join(REPO, t.file), Buffer.from(r.png.split(",")[1], "base64"));
  console.log(`\n✔ ${t.file}: ${t.rs != null ? `runs ${t.rs}-${t.re} → ` : ""}${r.n} frames · new cell ${r.uW}×${r.uH} (was ${r.W}×${r.H})`);
  console.log(`   animationData → { frames: ${r.n}, width: ${r.uW}, height: ${r.uH}, ... }`);
}
await browser.close(); server.close();
