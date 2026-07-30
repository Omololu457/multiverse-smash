// harness/skin_select_shot.mjs — screenshot ANY character's skin-select screen (+ optional in-match).
// Usage: node harness/skin_select_shot.mjs --char=rick --idx=0 --label=rick_default [--skin=rick_xxx]
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1]) || "";
const char = arg("char") || "rick"; const idx = parseInt(arg("idx") || "0", 10);
const label = arg("label") || char; const skinId = arg("skin");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);

const info = await page.evaluate(([c, i]) => window.__harness.showSkinSelect(c, "p1", i), [char, idx]);
await sleep(300);
await page.screenshot({ path: path.join(OUT, `skinsel_${label}.png`) });
console.log(`  ${char}: ${info.skins.length} skins -> ${info.skins.map(s => s.id).join(", ")}`);

let matchLine = "";
if (skinId) {
  await page.goto(`${base}/index.html?harness=1&p1=${char}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(300);
  const applied = await page.evaluate((id) => window.__harness.setSkin?.("p1", id), skinId);
  await sleep(350);
  const p1 = await page.evaluate(() => window.__harness.p1?.());
  await page.screenshot({ path: path.join(OUT, `skinsel_${label}_match.png`) });
  matchLine = ` | in-match applied=${applied} sheet=${p1?.spriteSheet || ""}`;
}
console.log(`shots: harness/shots/skinsel_${label}.png${matchLine}`);
await browser.close(); server.close();
