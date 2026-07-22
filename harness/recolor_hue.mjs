// harness/recolor_hue.mjs
// Bake a hue-rotated (+ optional saturate) recolor of a sprite sheet to a new PNG.
// Preserves layout/alpha exactly; only shifts hue (white cores stay white).
//   node harness/recolor_hue.mjs <src.png> <out.png> <deg> [sat=1.3]
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, out, degA, satA] = process.argv.slice(2);
if (!src || !out || degA === undefined) { console.error("usage: recolor_hue.mjs <src.png> <out.png> <deg> [sat]"); process.exit(2); }
const DEG = +degA, SAT = satA !== undefined ? +satA : 1.3;
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "image/png" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
const dataUrl = await page.evaluate(async ({ url, DEG, SAT }) => {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.filter = `hue-rotate(${DEG}deg) saturate(${SAT})`;
  ctx.drawImage(img, 0, 0);
  return { url: c.toDataURL("image/png"), W, H };
}, { url: `${base}/${src}`, DEG, SAT });
fs.writeFileSync(path.join(ROOT, out), Buffer.from(dataUrl.url.replace(/^data:image\/png;base64,/, ""), "base64"));
console.log(`${out} ← ${src}  hue-rotate(${DEG}deg) saturate(${SAT})  (${dataUrl.W}×${dataUrl.H})`);
await browser.close(); server.close();
