// harness/isshiki_cube_stage4.mjs
// CUBE-TRAP STAGE 4 (balance): MEASURE the real damage of the Daikokuten cube trap across a FULL trap —
// auto-tick-only (caster idle) vs fully-punished (caster hits the cube every window) — to compare against
// Sukuna's Malevolent Shrine (its audited sibling) and confirm the bonus-damage fix bounds the punish.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cube = () => page.evaluate(() => window.__harness.cubeTrap());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await wf(2);
}
async function castTrap() {
  await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  await page.waitForFunction(() => window.__harness.cubeTrap()?.phase === "trapped", null, { timeout: 3000, polling: 16 }).catch(() => {});
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  // ── AUTO-ONLY: caster idle, run the full trap, measure total sure damage ──
  console.log("\n── AUTO-TICK-only total (caster idle, full trap) ──");
  await prep(70);
  const hp0a = (await p2()).health;
  await castTrap();
  for (let i = 0; i < 200 && (await cube()) !== null; i++) await wf(1);   // run to natural expiry
  const autoTotal = hp0a - (await p2()).health;
  console.log(`   AUTO-ONLY total = ${autoTotal.toFixed(1)} EFF over the full ~2.5s trap`);
  check("auto-only total is a modest sure-damage burst (12–40 EFF)", autoTotal >= 12 && autoTotal <= 40, `autoTotal=${autoTotal.toFixed(1)}`);

  // ── FULLY-PUNISHED: caster hits the cube every window, run the full trap, measure total ──
  console.log("\n── FULLY-PUNISHED total (caster hits the cube the whole trap) ──");
  await prep(60);
  const hp0b = (await p2()).health;
  await castTrap();
  for (let i = 0; i < 200 && (await cube()) !== null; i++) {   // tap Light onto the cube every ~8f
    if (i % 8 === 0) await page.keyboard.down("j");
    if (i % 8 === 4) await page.keyboard.up("j");
    await wf(1);
  }
  await page.keyboard.up("j");
  const punishTotal = hp0b - (await p2()).health;
  console.log(`   FULLY-PUNISHED total = ${punishTotal.toFixed(1)} EFF (auto + bonus, full commitment)`);
  check("fully-punished total is bounded (≤ 95 EFF — the fix caps the mash exploit)", punishTotal <= 95, `punishTotal=${punishTotal.toFixed(1)}`);
  check("bonus-hits meaningfully add over auto (punish > auto + 15)", punishTotal > autoTotal + 15, `punish=${punishTotal.toFixed(1)} auto=${autoTotal.toFixed(1)}`);

  // ── COMPARISON vs Sukuna's Malevolent Shrine (100-cost ULT, 8s, no-escape, AOE, ~134 EFF) ──
  console.log("\n── comparison vs Sukuna Malevolent Shrine (its audited sibling) ──");
  check("NOT strictly-better than the Shrine: cheaper (45 vs 100) AND weaker max (punish < ~134 Shrine EFF)", punishTotal < 134, `cube max=${punishTotal.toFixed(1)} vs Shrine ~134`);

  console.log(`\nSUMMARY: cube trap — auto-only ${autoTotal.toFixed(0)} EFF · fully-punished ${punishTotal.toFixed(0)} EFF · cost 45 · 2.5s · single-target · ESCAPABLE.`);
  console.log(`         Sukuna Shrine — ~134 EFF · cost 100 (ult) · 8s · AOE · NO escape · passive sure-hit.`);

  console.log("\n── no JS errors ──");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
