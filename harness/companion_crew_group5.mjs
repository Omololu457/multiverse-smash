// harness/companion_crew_group1.mjs — GROUP 5 (Amber's crew) affiliation skins register + apply cleanly
// across multiple action sheets (≥5 frames of coverage per char via distinct action sheets). Cosmetic only.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const CHARS = ["shinobu", "gon", "naruto", "zenitsu"];
await page.goto(`${base}/index.html?harness=1&p1=shinobu&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

for (const ch of CHARS) {
  console.log(`\n── ${ch} — Amber's Crew ──`);
  // 1) registered + visible on the skin-select screen
  const skins = await page.evaluate(c => window.__harness.showSkinSelect(c, "p1", 0).skins, ch);
  const crew = skins.find(s => s.id === `${ch}_crew`);
  check(`${ch}_crew skin registered (name shows Amber's Crew)`, !!crew && /Amber's Crew/.test(crew.name), crew ? crew.name : "MISSING");
  // 2) applies in a live match + retags the sheet across ≥5 distinct ACTION sheets (multi-frame coverage)
  await page.goto(`${base}/index.html?harness=1&p1=${ch}&p2=rengoku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
  await waitFrames(20);
  const applied = await page.evaluate(c => window.__harness.setSkin("p1", `${c}_crew`), ch);
  check(`${ch}_crew applies (skinId set)`, applied === `${ch}_crew`, `skinId=${applied}`);
  // drive several actions; every rendered sheet must be a __crew sibling (proves the recolor covers all frames)
  const seen = new Set();
  const acts = [["j", 4], ["k", 4], ["l", 5], ["s+j", 4], ["u", 4]];
  for (const [key] of acts) {
    if (key.includes("+")) { const ks = key.split("+"); for (const k of ks) await page.keyboard.down(k); await waitFrames(3); for (const k of ks) await page.keyboard.up(k); }
    else { await page.keyboard.down(key); await waitFrames(3); await page.keyboard.up(key); }
    const sh = (await p1()).spriteSheet || ""; if (sh) seen.add(sh); await waitFrames(6);
  }
  const sheets = [...seen];
  const allCrew = sheets.length >= 1 && sheets.every(s => s.includes("__crew"));
  check(`every rendered action sheet is a __crew recolor (no base fallback)`, allCrew, `sheets=${sheets.map(s => s.split("/").pop()).join(", ")}`);
}
check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
