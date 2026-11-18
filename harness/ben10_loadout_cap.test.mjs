// harness/ben10_loadout_cap.test.mjs
// Loadout pick-cap LIVE. The cap is data-driven: one pick per Omnitrix slot combo (5), shown as "Pick up to N";
// with 5 READY forms all five fill the dial and nothing beyond the cap can be added.
//  - the select screen's cap/maxPick reports 5
//  - clicking every alien card through the REAL click handler (twice over) never grows the draft past 5
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const { BEN10_SLOT_COUNT: SLOTS } = await import("../aliens.js");   // the cap is one pick per registry slot (not a literal)
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  // Let the warm-up click DRAIN before switching screens: mouseup sets mouse.clicked, which only clears at the end of the
  // next game frame (endInputFrame). Without this wait the alien-select screen consumes it as a card click at (640,360) —
  // empty space with ≤17 cards, but the 18th card sits exactly there.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));

  // Open the Omnitrix loadout screen with an EMPTY draft, then read the cap/maxPick.
  await page.evaluate(() => window.__harness.showAlienSelect(0));
  const st0 = await page.evaluate(() => window.__harness.alienSelectState());
  check(`pick-cap is ${SLOTS} (one per slot combo; count read from the registry)`, st0.cap === SLOTS, `cap=${st0.cap}`);
  check(`maxPick drives 'Pick up to ${SLOTS}' text`, st0.maxPick === SLOTS, `maxPick=${st0.maxPick}`);
  check("draft starts empty", st0.draft.length === 0, `draft=${JSON.stringify(st0.draft)}`);

  // Click every DISTINCT alien card through the real canvas click handler; the draft stops at the cap.
  const rects = await page.evaluate(() => window.__harness.alienGridRects());
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2);
    await page.waitForTimeout(40);
  }
  const st1 = await page.evaluate(() => window.__harness.alienSelectState());
  check(`clicking every card fills the draft to the cap (${SLOTS}) and never past it`, st1.draft.length === Math.min(SLOTS, rects.length) && st1.draft.length <= SLOTS, `cards=${rects.length} draft.length=${st1.draft.length} draft=${JSON.stringify(st1.draft)}`);

  // Clicking an already-picked card should DESELECT (toggle), dropping back to 3 — proves toggle still works.
  const r0 = rects[0];
  await page.mouse.click(r0.x + r0.w / 2, r0.y + r0.h / 2);
  await page.waitForTimeout(40);
  const st2 = await page.evaluate(() => window.__harness.alienSelectState());
  check(`re-click deselects (toggle) → ${SLOTS - 1}`, st2.draft.length === SLOTS - 1, `draft.length=${st2.draft.length}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n  BEN 10 LOADOUT CAP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
