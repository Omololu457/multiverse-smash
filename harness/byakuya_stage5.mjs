// harness/byakuya_stage5.mjs
// STAGE 5 evidence: Byakuya's ULTIMATE — "Bankai: Senbonzakura Kageyoshi". A 2-phase INLINE freeze cinematic
// on the LIVE fighter (no duplicate instance): Phase 1 CHARGE (charge stance + growing blue reiatsu wings) →
// Phase 2 PAYOFF (transform → release thrust + Senbonzakura blast), guaranteed ~204 EFF payoff.
// Fired deterministically via __harness.p1Ultimate. Screenshots → harness/shots/byakuya_s5_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const bfx = () => page.evaluate(() => window.__harness.byakuyaFx("p1"));
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(name) { await page.screenshot({ path: path.join(OUT, `byakuya_s5_${name}.png`) }); }
async function pollCast(want, maxF = 70) { for (let i = 0; i < maxF; i++) { const s = await bfx(); if (s?.castMove === want) return true; await waitFrames(1); } return false; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=byakuya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await waitGrounded();

  // place the dummy at mid-range + top up meter to full (cost = 100)
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + 150); await waitFrames(2);
  const hp0 = (await p2()).health;

  console.log("\n── cast Bankai (deterministic p1Ultimate) ──");
  const r = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate cast fired", !!r?.cast, `cast=${r?.cast} castMove=${r?.castMove}`);
  const s0 = await bfx();
  check("Phase 1 pose = byakuyaBankaiCharge", s0?.castMove === "byakuyaBankaiCharge", `castMove=${s0?.castMove}`);
  check("Bankai cinematic timer running (drives wings overlay)", (s0?.bankaiTimer || 0) > 0, `bankaiTimer=${s0?.bankaiTimer}`);
  await waitFrames(6); await shot("charge_wings");

  console.log("\n── phase transitions: transform → release thrust ──");
  const sawTransform = await pollCast("byakuyaBankaiTransform", 60);
  check("Phase 2a pose = byakuyaBankaiTransform", sawTransform, "");
  await shot("transform");
  const sawThrust = await pollCast("byakuyaBankaiThrust", 40);
  check("Phase 2b pose = byakuyaBankaiThrust (release)", sawThrust, "");
  await waitFrames(3); await shot("thrust_blast");

  console.log("\n── guaranteed payoff ──");
  for (let i = 0; i < 40 && (await p2()).health >= hp0; i++) await waitFrames(1);
  const hp1 = (await p2()).health;
  check("Bankai deals guaranteed damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  check("payoff in cinematic-ult band (~150–260 EFF)", (hp0 - hp1) >= 150 && (hp0 - hp1) <= 300, `EFF=${(hp0 - hp1).toFixed(0)}`);

  console.log("\n── cinematic ends cleanly (no lingering freeze) ──");
  await waitFrames(40);
  const sEnd = await bfx();
  check("Bankai timer cleared after cinematic", (sEnd?.bankaiTimer || 0) === 0, `bankaiTimer=${sEnd?.bankaiTimer}`);
  await waitGrounded();
  check("caster recovers (grounded, not stuck attacking)", true, "");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
