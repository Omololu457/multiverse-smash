// harness/ben10_loadout.test.mjs
// BEN 10 — LOADOUT PRUNE: only art-backed aliens (XLR8, Diamondhead) are offered in the Omnitrix
// picker and allowed into a live loadout. Art-less aliens stay in the pool as fallback data (nothing
// deleted) but are unreachable. Proves: picker filtered, default loadout art-backed, a stale save of
// hidden aliens is filtered down to the default, and in-match cycling only ever lands on art-backed forms.
//   node harness/ben10_loadout.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const f = path.join(ROOT, u === "/" ? "/index.html" : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const cmd = () => page.evaluate(() => window.__harness.benCmd());
const loadout = (sel) => page.evaluate(s => window.__harness.benLoadout(s), sel);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  const L = await loadout();
  const art = new Set(L.artBacked);
  console.log(`  art-backed = [${L.artBacked.join(", ")}]  picker = [${L.picker.join(", ")}]  loadout = [${(L.aliens || []).join(", ")}]`);

  check("loadout PICKER lists only art-backed aliens", L.picker.length === art.size && L.picker.every(k => art.has(k)), `picker=[${L.picker.join(",")}]`);
  check("no art-less alien (e.g. heatblast/fourarms) in the picker", !L.picker.includes("heatblast") && !L.picker.includes("fourarms") && !L.picker.includes("cannonbolt"), `picker=[${L.picker.join(",")}]`);
  check("default loadout contains only art-backed aliens", Array.isArray(L.aliens) && L.aliens.length >= 1 && L.aliens.every(k => art.has(k)), `loadout=[${(L.aliens || []).join(",")}]`);

  // Stale save of now-hidden aliens → filtered down to the art-backed default (never lands on hidden art).
  const stale = await loadout(["heatblast", "fourarms", "cannonbolt", "waybig"]);
  check("stale all-hidden loadout falls back to art-backed default", stale.aliens.length >= 1 && stale.aliens.every(k => art.has(k)), `→ [${stale.aliens.join(",")}]`);

  // Mixed save (one hidden + one art-backed) → keeps only the art-backed one.
  const mixed = await loadout(["heatblast", "diamondhead"]);
  check("mixed loadout keeps only the art-backed alien", mixed.aliens.every(k => art.has(k)) && mixed.aliens.includes("diamondhead"), `→ [${mixed.aliens.join(",")}]`);

  // In-match cycle: restore the default loadout, then transform-cycle (Charge + Right) a few times and
  // confirm every active alien is art-backed (never an art-less form).
  await loadout(["xlr8", "diamondhead"]);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(2);
  const landed = new Set();
  for (let i = 0; i < 5; i++) {
    const c = await cmd(); if (c?.form && c.form !== "human") landed.add(c.form);
    await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await page.keyboard.up("p");
    await waitFrames(48);   // switch cooldown
  }
  const allArt = [...landed].every(k => art.has(k));
  check("in-match cycling only lands on art-backed forms", landed.size >= 1 && allArt, `landed=[${[...landed].join(",")}]`);

  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");

} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN 10 LOADOUT PRUNE: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
