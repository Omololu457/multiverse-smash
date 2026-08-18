// harness/altskin_batch_shots.mjs — visual evidence for an alt-skin batch.
// For each char given via --chars: (1) the skin-SELECT screen (all variants visible/selectable),
// and (2) an in-MATCH render wearing one alt skin (proves the sprite SHEETS recolor, not just the
// portrait). Usage: node harness/altskin_batch_shots.mjs --chars=goku,goku_black,vegeta,beerus --label=b1
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1]) || "";
const chars = arg("chars").split(",").filter(Boolean); const label = arg("label") || "batch";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);

let ok = 0, bad = 0; const chk = (n, c, d = "") => { c ? ok++ : bad++; console.log(`  ${c ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };

for (const ch of chars) {
  // (1) skin-select screen — hover the first alt (index 1) so it's highlighted
  const info = await page.evaluate(c => window.__harness.showSkinSelect(c, "p1", 1), ch);
  await sleep(250);
  await page.screenshot({ path: path.join(OUT, `altskin_${label}_select_${ch}.png`) });
  const altCount = (info.skins || []).length - 1;
  chk(`${ch}: skin-select shows ${info.skins.length} skins (${altCount} alt)`, altCount >= 5, info.skins.map(s => s.id).join(","));

  // (2) in-match render wearing the first RECOLOR skin (id `<char>_<tag>`, skipping bespoke skins
  // like gojo2/sukuna3) → assert the live sprite sheet is a recolored __tag sheet
  const altId = (info.skins.find(s => s.id.startsWith(ch + "_")) || info.skins[1]).id;
  await page.goto(`${base}/index.html?harness=1&p1=${ch}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(300);
  const skinR = await page.evaluate((id) => window.__harness.setSkin?.("p1", id), altId);
  await sleep(350);   // let a frame render with the new skin before reading the sheet
  const p1 = await page.evaluate(() => window.__harness.p1?.());
  const sheet = p1?.spriteSheet || "";
  await page.screenshot({ path: path.join(OUT, `altskin_${label}_match_${ch}.png`) });
  chk(`${ch}: in-match sprite uses recolored sheet`, sheet.includes("__"), `skin=${skinR} sheet=${sheet}`);
}

console.log(`\nRESULT ${ok} pass / ${bad} fail — shots: harness/shots/altskin_${label}_*.png`);
await browser.close(); server.close();
process.exit(bad ? 1 : 0);
