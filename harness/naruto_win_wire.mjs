// harness/naruto_win_wire.mjs — Stage B verify: Naruto's WIN pose is now wired to the
// real KCM victory-flex art (naruto_kcm_win.png) instead of falling back to idle.
// Boots a real match with Naruto as P1, forces a legit match win, and confirms the
// winner's rendered sprite action becomes "win" on the naruto_kcm_win.png sheet.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "ambient"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const sleep = (t) => new Promise(r => setTimeout(r, t));
const base1 = f => (f || "").replace(/^\.\//, "");

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.boot, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await sleep(200);

  // Sanity: Naruto now DECLARES a win animation (art present on disk).
  const hasWin = await page.evaluate(() => {
    const f = window.__harness.spriteReady ? true : false; return f;
  });
  check("harness ready", hasWin);

  // Force a real match win for P1 (Naruto).
  const win = await page.evaluate(() => window.__harness.forceMatchWin("p1"));
  check("match win triggered for P1", !!win.victory && win.winner === "p1", JSON.stringify(win));
  await sleep(400);   // let victory state set _forceAction="win" and the sprite settle

  const sr = await page.evaluate(() => window.__harness.spriteReady("p1"));
  const act = await page.evaluate(() => window.__harness.spriteAction("p1"));
  check("winner's rendered action is 'win' (not idle fallback)", act === "win", `action=${act}`);
  check("win pose is drawn from the real KCM win sheet", base1(sr?.sheet) === "naruto_kcm_win.png", `sheet=${base1(sr?.sheet)}`);

  await page.screenshot({ path: path.join(OUT, "naruto_win_pose.png") });

  check("no page/JS errors during the run", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) {
  check("harness ran without throwing", false, String(e));
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}
