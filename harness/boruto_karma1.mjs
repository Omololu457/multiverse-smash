// harness/boruto_karma1.mjs — KARMA STAGE 1: Momoshiki Karma transformation STATE + visual art.
// Verifies: the ~90% energy GATE (fails below, enters at/above), the _skinAnim swap to the magenta
// __karma sheets, the form buffs, continuous drain, auto-revert at 0, and revert-on-toggle. Screenshots
// the Karma form (magenta jacket + blue seal markings + glowing eyes) for visual review. No ability yet.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

// STATIC — every base sheet has a __karma recolor twin on disk.
const ad = characters.boruto.animationData;
const baseSheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missingKarma = baseSheets.map(s => s.replace(".png", "__karma.png")).filter(s => { const p = path.join(ROOT, s.replace(/^\.\//, "")); return !(fs.existsSync(p) && fs.statSync(p).size > 128); });
console.log("\n── STATIC — __karma recolor sheets ──");
check(`all ${baseSheets.length} base sheets have a __karma recolor twin`, missingKarma.length === 0, missingKarma.join(", "));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setEnergy = v => page.evaluate(e => window.__harness.setEnergy(e), v);
const karma = op => page.evaluate(o => window.__harness.p1Karma(o), op);
async function shot(t) { await page.screenshot({ path: path.join(OUT, `boruto_karma1_${t}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=boruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── ~90% energy GATE ──");
  await setEnergy(120); await waitFrames(1);           // below the 162 threshold
  let r = await karma("enter");
  check("enter BLOCKED below threshold (energy 120 < 162)", r.active === false && r.form === "base", `active=${r.active} form=${r.form}`);
  await setEnergy(170); await waitFrames(1);           // at/above threshold
  r = await karma("enter");
  check("enter ALLOWED at/above threshold (energy 170)", r.active === true && r.form === "karma", `active=${r.active} form=${r.form}`);

  console.log("\n── form state + visual swap ──");
  await waitFrames(3);
  const a = await p1();
  check("_karmaActive + currentForm karma", a.karmaActive === true && a.currentForm === "karma", `active=${a.karmaActive} form=${a.currentForm}`);
  check("art form-swapped to __karma sheet", (a.spriteSheet || "").includes("__karma"), `sheet=${a.spriteSheet}`);
  check("form buff applied (damageMult 1.25)", Math.abs((a.damageMult || 1) - 1.25) < 0.01, `dmgMult=${a.damageMult}`);
  await shot("karma_form");

  console.log("\n── continuous drain ──");
  const e0 = (await p1()).energy;
  await waitFrames(30);
  const e1 = (await p1()).energy;
  check("energy drains while transformed", e1 < e0, `${e0.toFixed(0)} → ${e1.toFixed(0)} over 30f`);

  console.log("\n── revert on TOGGLE ──");
  r = await karma("toggle");
  await waitFrames(2);
  const b = await p1();
  check("toggle reverts to base", b.karmaActive === false && b.currentForm === "base", `active=${b.karmaActive} form=${b.currentForm}`);
  check("art restored to base sheet (no __karma)", !(b.spriteSheet || "").includes("__karma"), `sheet=${b.spriteSheet}`);
  check("buffs cleared (damageMult 1)", Math.abs((b.damageMult || 1) - 1) < 0.01, `dmgMult=${b.damageMult}`);

  console.log("\n── auto-revert at 0 energy ──");
  await setEnergy(170); await waitFrames(1); await karma("enter"); await waitFrames(2);
  check("re-entered Karma", (await p1()).karmaActive === true, "");
  await setEnergy(1); await waitFrames(24);             // net drain (~0.23/f after passive regen) crosses 0
  const z = await p1();
  check("auto-reverts when energy hits 0", z.karmaActive === false && z.currentForm === "base", `active=${z.karmaActive} energy=${z.energy?.toFixed(0)}`);

  console.log("\n── no JS errors ──");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Boruto Karma Stage 1: ${PASS} passed, ${FAIL} failed — shot in harness/shots/boruto_karma1_karma_form.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
