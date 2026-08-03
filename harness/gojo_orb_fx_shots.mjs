// harness/gojo_orb_fx_shots.mjs — verify the SALVAGED Shinjuku-batch orb FX render on the
// EXISTING Gojo's Blue / Red / Hollow Purple projectiles. Captures ≥3 travel frames per
// technique + asserts each live projectile carries the expected salvaged sheet.
//   Blue          = neutral special (l)               → gojo_blue_orb_fx.png
//   Red           = forward special (hold d, then l)  → gojo_red_orb_fx.png   (now a PROJECTILE)
//   Hollow Purple = D,B motion (s, a) then special l  → gojo_hollow_purple_orb_fx.png
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

async function prep() {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln(600); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 620);   // far → orb visibly travels
  await waitFrames(2);
}

// Fire, then poll for the projectile carrying `sheetFrag`, then grab 3 travel frames.
async function fireAndCapture(label, sheetFrag, cast) {
  await prep();
  await cast();
  let found = null;
  for (let i = 0; i < 110; i++) {
    const list = await projs();
    found = list.find(p => (p.sheet || "").includes(sheetFrag));
    if (found) break;
    await waitFrames(1);
  }
  check(`${label}: live projectile carries ${sheetFrag}`, !!found, found ? `x=${found.x.toFixed(0)} vx=${found.vx.toFixed(1)}` : "no matching projectile");
  const xs = [];
  for (let f = 0; f < 3; f++) {
    const list = await projs();
    const pr = list.find(p => (p.sheet || "").includes(sheetFrag));
    if (pr) xs.push(pr.x);
    await page.screenshot({ path: path.join(OUT, `gojo_orb_${label}_f${f}.png`) });
    await waitFrames(5);
  }
  check(`${label}: captured 3 frames while travelling`, xs.length >= 2 && Math.abs(xs[xs.length - 1] - xs[0]) > 1, `x: ${xs.map(x => x.toFixed(0)).join(" → ")}`);
  // release any held keys
  await page.evaluate(() => window.__harness.resetFighterInput("p1"));
  await page.keyboard.up("d").catch(() => {});
}

await page.goto(`${base}/index.html?harness=1&p1=gojo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

console.log("\n── BLUE — neutral special (attraction orb) ──");
await fireAndCapture("blue", "gojo_blue_orb_fx.png", async () => {
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
});

console.log("\n── RED — forward special (repulsion orb, converted melee→projectile) ──");
await fireAndCapture("red", "gojo_red_orb_fx.png", async () => {
  await page.keyboard.down("d"); await waitFrames(3);              // forward = "F"
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.keyboard.up("d");
});

console.log("\n── HOLLOW PURPLE — D,B motion special (convergence morph orb) ──");
await fireAndCapture("hollow_purple", "gojo_hollow_purple_orb_fx.png", async () => {
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");   // D
  await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.up("a");   // B (facing right → left = back)
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
});

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/gojo_orb_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
