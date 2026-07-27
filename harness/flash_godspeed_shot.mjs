// harness/flash_godspeed_shot.mjs — visual + integrity evidence for the NEW Flash "Godspeed" alt-color skin.
//   (1) skin-SELECT screen with Godspeed highlighted (selectable + visibly distinct)
//   (2) in-MATCH render wearing flash_godspeed (proves the SHEETS recolor, not just the portrait)
//   (3) stat-parity: wearing the skin changes ZERO gameplay stats (cosmetic-only)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const chk = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  await page.goto(`${base}/index.html?harness=1&p1=flash`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // (1) skin-select — find Godspeed's index, hover it, screenshot
  const list = await page.evaluate(() => window.__harness.showSkinSelect("flash", "p1", 0).skins);
  const ids = list.map(s => s.id);
  const gIdx = ids.indexOf("flash_godspeed");
  chk("Godspeed skin is registered (id flash_godspeed)", gIdx >= 0, ids.join(","));
  const gEntry = list[gIdx] || {};
  chk("Godspeed display name", (gEntry.name || "").includes("Godspeed"), gEntry.name);
  chk("Godspeed portrait retagged __godspeed", (gEntry.portrait || "").includes("__godspeed"), gEntry.portrait);
  chk("distinct from base + other flash skins", ids.includes("default") && ids.includes("flashBlue") && ids.includes("flash_reverse") && gIdx >= 0, `${list.length} skins`);
  await page.evaluate(i => window.__harness.showSkinSelect("flash", "p1", i), gIdx);
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, "flash_godspeed_select.png") });

  // (2) in-match render wearing flash_godspeed — read the live sprite sheet
  await page.evaluate(() => window.__harness.boot());
  await sleep(250);
  const baseStats = await page.evaluate(() => { const p = window.__harness.p1(); return { key: p.key, maxHealth: p.maxHealth, maxEnergy: p.maxEnergy, spriteScale: p.spriteScale }; });
  const applied = await page.evaluate(() => window.__harness.setSkin("p1", "flash_godspeed"));
  await sleep(350);
  const worn = await page.evaluate(() => { const p = window.__harness.p1(); return { skinId: p.skinId ?? null, sheet: p.spriteSheet, maxHealth: p.maxHealth, maxEnergy: p.maxEnergy, spriteScale: p.spriteScale, key: p.key }; });
  chk("skin applied in match", applied === "flash_godspeed", `applied=${applied}`);
  chk("in-match sprite uses a __godspeed sheet", /flash_.*__godspeed\.png$/.test(worn.sheet || ""), `sheet=${worn.sheet}`);
  await page.screenshot({ path: path.join(OUT, "flash_godspeed_match.png") });

  // (3) COSMETIC-ONLY — every gameplay stat identical with the skin on vs. the base character
  chk("maxHealth unchanged", worn.maxHealth === baseStats.maxHealth, `${baseStats.maxHealth} → ${worn.maxHealth}`);
  chk("maxEnergy unchanged", worn.maxEnergy === baseStats.maxEnergy, `${baseStats.maxEnergy} → ${worn.maxEnergy}`);
  chk("spriteScale unchanged", worn.spriteScale === baseStats.spriteScale, `${baseStats.spriteScale} → ${worn.spriteScale}`);
  chk("still Flash (roster identity unchanged)", worn.key === "flash", worn.key);
  // the manifest entry carries no stat/gameplay keys — only cosmetic fields
  const manifestKeys = await page.evaluate(() => { const s = window.__harness.showSkinSelect("flash", "p1", 0).skins.find(x => x.id === "flash_godspeed"); return Object.keys(s || {}); });
  chk("skin entry exposes only cosmetic fields", manifestKeys.every(k => ["id", "name", "portrait"].includes(k)), manifestKeys.join(","));

  chk("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  Flash Godspeed skin: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
