// harness/ghostface_bp_shots.mjs — visual evidence for the Backstage Pass branches (§4.2):
// the dash/phantom mid-move + the outcome (cross-up switch, evasive getaway, swap-in companion).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function tap(k) { await page.keyboard.down(k); await wf(1); await page.keyboard.up(k); await wf(1); }
async function reset(gap) {
  await page.evaluate(() => window.__harness.expireGfSwap?.()); await wf(4);
  await page.evaluate(() => { window.__harness.setSkin("p1", "ghostfaceBilly"); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await wf(4);
}
await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await wf(20);

// SWITCH — capture the dash frame + the crossed-up result
await reset(60);
await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");
await page.screenshot({ path: path.join(OUT, "gf_bp_switch_dash.png") });
await wf(24); await page.screenshot({ path: path.join(OUT, "gf_bp_switch_result.png") });

// GETAWAY — evasive backstep
await reset(60);
const bk = (await p1()).facing === 1 ? "a" : "d";
await page.keyboard.down(bk); await wf(2); await page.keyboard.down("l"); await wf(6); await page.keyboard.up("l"); await page.keyboard.up(bk);
await page.screenshot({ path: path.join(OUT, "gf_bp_getaway.png") });

// SWAP — dash-in becomes the companion (in crew skin)
await reset(200);
await tap("s"); await tap("d");
await page.keyboard.down("o"); await page.keyboard.down("l"); await wf(1); await wf(2); await page.keyboard.up("l"); await page.keyboard.up("o");
await wf(22); await page.screenshot({ path: path.join(OUT, "gf_bp_swap_sasuke.png") });

console.log("shots: harness/shots/gf_bp_*");
await browser.close(); server.close();
