// harness/dormant_win_voice.mjs — Stage D verify: five characters whose win-voice POOLS
// existed on disk (and whose module trigger-maps pointed at the round-end WINNER block)
// but were never dispatched are now wired. For each, boot a real match with that character
// as P1, force a win, and confirm a matching win-voice clip fires (pool no longer dormant).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const jsErrors = [];
const sleep = (t) => new Promise(r => setTimeout(r, t));

// character → filename prefix its win clips share on disk
const CASES = [
  ["chrollo", "chrollo_"],
  ["vegeta", "vegeta_"],
  ["maki", "maki_"],
  ["samurai_red_ranger", "samred_"],
  ["gold_samurai_ranger", "goldranger_"],
];

try {
  for (const [key, prefix] of CASES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", e => jsErrors.push(`${key}: ${e}`));
    await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=piccolo`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness && !!window.__harness.boot, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.boot());
    await sleep(200);
    await page.evaluate(() => window.__harness.sfxStopAll?.(true));
    const win = await page.evaluate(() => window.__harness.forceMatchWin("p1"));
    await sleep(300);
    const active = await page.evaluate(() => (window.__harness.sfxActive?.() || []).map(e => (e.file || e.src || e || "").toString().replace(/^\.\//, "")));
    const fired = active.find(f => f.startsWith(prefix));
    check(`${key}: win-voice fires on victory (was dormant)`, !!win.victory && !!fired, `active=${JSON.stringify(active)}`);
    await page.close();
  }
  check("no page/JS errors across all five", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) {
  check("harness ran without throwing", false, String(e));
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}
