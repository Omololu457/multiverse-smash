// tools/crop_region.mjs — crop a rectangular region out of a PNG into a new PNG.
// USAGE: node tools/crop_region.mjs <in.png> <out.png> <x> <y> <w> <h>
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [inp, outp, X, Y, W, H] = process.argv.slice(2);
const server = http.createServer((req, res) => { const f = path.join(REPO, decodeURIComponent(req.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "image/png", "access-control-allow-origin": "*" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(); const page = await browser.newPage();
const r = await page.evaluate(async ({ url, x, y, w, h }) => {
  const img = new Image(); img.crossOrigin = "anonymous"; img.src = url; await img.decode();
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = false;
  cx.drawImage(img, x, y, w, h, 0, 0, w, h);
  return cv.toDataURL("image/png");
}, { url: `${base}/${inp}`, x: +X, y: +Y, w: +W, h: +H });
fs.writeFileSync(path.join(REPO, outp), Buffer.from(r.split(",")[1], "base64"));
console.log(`✔ ${outp}: cropped ${W}×${H} from ${inp} at (${X},${Y})`);
await browser.close(); server.close();
