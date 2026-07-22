// harness/concat_uniform.mjs
// Concatenate several raw sprite sheets into ONE uniform-cell strip. Detects content islands
// (alpha gutters, same as reslice) in EACH source in order, then packs every frame into equal
// cells (max content width + pad) × (max source height), each frame centered.
//   node harness/concat_uniform.mjs <out.png> <src1.png> <src2.png> ... [--pad=3] [--alpha=8]
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => a.slice(2).split("=")));
const files = args.filter(a => !a.startsWith("--"));
const out = files.shift();
const PAD = +(opts.pad ?? 3), ALPHA = +(opts.alpha ?? 8);
if (!out || !files.length) { console.error("usage: concat_uniform.mjs <out.png> <src...> [--pad] [--alpha]"); process.exit(2); }
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "image/png" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
const dataUrl = await page.evaluate(async ({ urls, ALPHA, PAD }) => {
  const all = [];   // {canvas, start, w, H}
  let maxH = 0;
  for (const url of urls) {
    const img = new Image(); img.src = url; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight; maxH = Math.max(maxH, H);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, W, H).data;
    const col = new Array(W).fill(0);
    for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < H; y++) if (px[(y * W + x) * 4 + 3] > ALPHA) n++; col[x] = n; }
    let x = 0; while (x < W) { while (x < W && col[x] === 0) x++; if (x >= W) break; const s = x; while (x < W && col[x] > 0) x++; all.push({ c, start: s, w: x - s, H }); }
  }
  const cellW = Math.max(...all.map(f => f.w)) + PAD * 2;
  const oc = document.createElement("canvas"); oc.width = cellW * all.length; oc.height = maxH;
  const octx = oc.getContext("2d");
  all.forEach((f, i) => { const dx = i * cellW + Math.floor((cellW - f.w) / 2); const dy = maxH - f.H; octx.drawImage(f.c, f.start, 0, f.w, f.H, dx, dy, f.w, f.H); });
  return { url: oc.toDataURL("image/png"), frames: all.length, width: cellW, height: maxH };
}, { urls: files.map(f => `${base}/${f}`), ALPHA, PAD });
fs.writeFileSync(path.join(ROOT, out), Buffer.from(dataUrl.url.replace(/^data:image\/png;base64,/, ""), "base64"));
console.log(`${out}  ←  ${files.join(" + ")}   { frames: ${dataUrl.frames}, width: ${dataUrl.width}, height: ${dataUrl.height} }`);
await browser.close(); server.close();
