// harness/calibrate_hues.mjs — invert the (nonlinear) hue-rotate response to hit target colors.
//
// CSS hue-rotate is a fixed RGB matrix, so resulting dominant hue is a nonlinear function of deg.
// Instead of guessing deg=(target-base), we SWEEP deg on the char's idle sheet, measure the actual
// resulting dominant hue at each step, then for each requested TARGET hue pick the deg whose result
// is closest. Prints manifest-ready { tag, deg, name } lines.
//
// Usage: node harness/calibrate_hues.mjs goku:hue:48,130,200,260,310 goku_black:colorize:95,150,240,265,335 ...
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// spec: char:mode:targets[:sat]  (sat optional — must match the manifest's slot sat so the calibrated
// hues survive generation; saturate interacts nonlinearly with hue-rotate)
const specs = process.argv.slice(2).map(s => { const [char, mode, tgt, sat] = s.split(":"); return { char, mode, targets: tgt.split(",").map(Number), sat: sat ? Number(sat) : undefined }; });

const server = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200).end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const baseURL = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(); const page = await b.newPage();
await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" }).catch(() => {});

const filterFor = (mode, deg, sat) => mode === "colorize"
  ? `grayscale(1) sepia(1) saturate(${sat ?? 3.2}) hue-rotate(${deg}deg) brightness(1)`
  : `hue-rotate(${deg}deg) saturate(${sat ?? 1.15})`;

// dominant hue of idle sheet under a filter
async function hueUnder(rel, filter) {
  return page.evaluate(async ({ url, filter }) => {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext("2d"); x.filter = filter; x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, c.width, c.height).data; let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      const r = px[i] / 255, g = px[i + 1] / 255, bl = px[i + 2] / 255;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn, l = (mx + mn) / 2;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); if (s < 0.12) continue;
      let h = 0; if (mx === r) h = ((g - bl) / d) % 6; else if (mx === g) h = (bl - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360; sx += Math.cos(h * Math.PI / 180) * s; sy += Math.sin(h * Math.PI / 180) * s; n++;
    }
    if (!n) return null; let hue = Math.atan2(sy, sx) * 180 / Math.PI; return hue < 0 ? hue + 360 : hue;
  }, { url: `${baseURL}/${rel}`, filter });
}
const dh = (a, c) => { let d = Math.abs(a - c); return d > 180 ? 360 - d : d; };
const NAMES = [[0, "Crimson"], [15, "Vermilion"], [35, "Amber"], [50, "Gold"], [72, "Chartreuse"], [100, "Green"], [150, "Teal"], [185, "Cyan"], [205, "Azure"], [230, "Blue"], [255, "Indigo"], [278, "Violet"], [300, "Magenta"], [325, "Rose"], [348, "Crimson"]];
const nameOf = h => NAMES.reduce((b, n) => dh(n[0], h) < dh(b[0], h) ? n : b)[1];
const tagOf = h => nameOf(h).toLowerCase();

for (const sp of specs) {
  const idle = characters[sp.char]?.animationData?.idle?.sheet?.replace(/^\.\//, "");
  if (!idle) { console.log(`# ${sp.char}: no idle sheet`); continue; }
  const curve = [];
  for (let deg = 0; deg < 360; deg += 5) { const h = await hueUnder(idle, filterFor(sp.mode, deg, sp.sat)); if (h != null) curve.push({ deg, h }); }
  console.log(`  // ${sp.char} (${sp.mode})`);
  const used = new Set();
  for (const t of sp.targets) {
    let best = curve[0]; for (const c of curve) if (dh(c.h, t) < dh(best.h, t)) best = c;
    let tag = tagOf(best.h); while (used.has(tag)) tag += "2"; used.add(tag);
    console.log(`    { tag: "${tag}", mode: "${sp.mode}", deg: ${best.deg}, name: "${nameOf(best.h)}" },  // target ${t} → ${Math.round(best.h)}`);
  }
}
await b.close(); server.close();
