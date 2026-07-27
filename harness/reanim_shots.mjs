// harness/reanim_shots.mjs — Part 2 evidence: the Edo Tensei "reanimation" palette.
// Summons Flash and Killua via Tobirama's Edo Tensei and asserts the live vessel renders __reanim
// (near-black) sheets; then boots each normally and asserts their appearance is UNCHANGED (no __reanim).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const p1 = () => page.evaluate(() => window.__harness.p1());
let ok = 0, bad = 0; const chk = (n, c, d = "") => { c ? ok++ : bad++; console.log(`  ${c ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };
async function waitFrames(n) { const s = (await page.evaluate(() => window.__harness.state().frame)); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}); }

for (const vessel of ["flash", "killua"]) {
  // ── summon the vessel via Edo Tensei ──
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(20);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.setP1Energy?.(200); window.__harness.resetUlt?.(); window.__harness.healP1?.(); });
  await page.evaluate(v => window.__harness.edoBackup.setBackup(v), vessel);
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(3);
  await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(4);
  const summoned = await p1();
  await page.screenshot({ path: path.join(OUT, `reanim_edotensei_${vessel}.png`) });
  chk(`${vessel} summoned via Edo Tensei → __reanim sheet`, summoned.edoActive && (summoned.spriteSheet || "").includes("__reanim"), `vessel=${summoned.edoVessel} sheet=${summoned.spriteSheet}`);

  // ── normal appearance (own match) is UNAFFECTED ──
  await page.goto(`${base}/index.html?harness=1&p1=${vessel}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(20);
  const normal = await p1();
  await page.screenshot({ path: path.join(OUT, `reanim_normal_${vessel}.png`) });
  chk(`${vessel} normal match → canonical sheet (no __reanim)`, !(normal.spriteSheet || "").includes("__reanim"), `sheet=${normal.spriteSheet}`);
}

console.log(`\nRESULT ${ok} pass / ${bad} fail — shots: harness/shots/reanim_*.png`);
await browser.close(); server.close();
process.exit(bad ? 1 : 0);
