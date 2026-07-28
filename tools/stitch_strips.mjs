// tools/stitch_strips.mjs
// Horizontally concatenate N sprite strips into ONE strip (with a transparent
// gutter between each source so the frame-detector in reslice_strip.mjs won't
// merge the seam). Output is a raw stitch — run reslice_strip.mjs on it after
// to get clean uniform, feet-aligned cells.
//
// USAGE:  node tools/stitch_strips.mjs <out.png> <in1.png> <in2.png> [...]
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUTTER = 8; // transparent px between sources
const [out, ...ins] = process.argv.slice(2);
if (!out || ins.length < 2) { console.error("usage: stitch_strips.mjs <out.png> <in1> <in2> [...]"); process.exit(1); }

const server = http.createServer((req, res) => {
  const f = path.join(REPO, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "image/png", "access-control-allow-origin": "*" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();

const r = await page.evaluate(async ({ urls, GUTTER }) => {
  const imgs = [];
  for (const u of urls) { const im = new Image(); im.crossOrigin = "anonymous"; im.src = u; await im.decode(); imgs.push(im); }
  const H = Math.max(...imgs.map(i => i.naturalHeight));
  const W = imgs.reduce((a, i) => a + i.naturalWidth, 0) + GUTTER * (imgs.length - 1);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = false;
  let x = 0;
  for (const im of imgs) { cx.drawImage(im, x, H - im.naturalHeight); x += im.naturalWidth + GUTTER; }  // bottom-align sources
  return { W, H, png: cv.toDataURL("image/png") };
}, { urls: ins.map(i => `${base}/${i}`), GUTTER });

fs.writeFileSync(path.join(REPO, out), Buffer.from(r.png.split(",")[1], "base64"));
console.log(`✔ ${out}: stitched ${ins.length} strips → ${r.W}×${r.H}`);
await browser.close(); server.close();
