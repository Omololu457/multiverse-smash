// harness/hisoka_skin_shot.mjs — "selectable" + in-match evidence for ONE Hisoka skin.
// Usage: node harness/hisoka_skin_shot.mjs --skin=hisokaAzure --idx=2 --label=azure
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1]) || "";
const skinId = arg("skin"); const idx = parseInt(arg("idx") || "1", 10); const label = arg("label") || skinId;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);

// (1) skin-select screen with this skin highlighted
const info = await page.evaluate(([c, i]) => window.__harness.showSkinSelect(c, "p1", i), ["hisoka", idx]);
await sleep(300);
await page.screenshot({ path: path.join(OUT, `hisoka_${label}_select.png`) });
const ids = info.skins.map(s => s.id);
console.log(`  skins: ${ids.join(", ")}`);
console.log(`  highlighted idx ${idx} = ${ids[idx]}`);

// (2) in-match render wearing this skin → prove the SHEETS recolor
await page.goto(`${base}/index.html?harness=1&p1=hisoka`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const applied = await page.evaluate((id) => window.__harness.setSkin?.("p1", id), skinId);
await sleep(350);
const p1 = await page.evaluate(() => window.__harness.p1?.());
const sheet = p1?.spriteSheet || "";
await page.screenshot({ path: path.join(OUT, `hisoka_${label}_match.png`) });
const okId = applied === skinId;
const okSheet = sheet.includes(`__${label}`);
console.log(`  in-match: applied=${applied} sheet=${sheet}`);
console.log(`RESULT skin=${okId ? "✅" : "❌"} sheet=${okSheet ? "✅" : "❌"} — shots: harness/shots/hisoka_${label}_{select,match}.png`);
await browser.close(); server.close();
process.exit(okId && okSheet ? 0 : 1);
