// harness/tobirama_edo_stepC.mjs — Stage 6 Step C: Edo Tensei ACTIVATION.
// Pressing Ultimate spends ALL chakra + a portion of current HP, swaps control to the pre-chosen
// vessel's FULL moveset for the timed window; Tobirama's own kit is set aside.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitSheet(needle, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function adjacent(gap) { await waitGrounded(); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // pick a known vessel (Sasuke) + set up a clean pre-activation state
  await page.evaluate(() => window.__harness.edoBackup.setBackup("sasuke"));
  await page.evaluate(() => { window.__harness.setP1Energy?.(200); window.__harness.resetUlt?.(); window.__harness.healP1?.(); });
  await waitFrames(2);
  const before = await p1();
  check("pre: is Tobirama", before.key === "tobirama", `key=${before.key}`);
  check("pre: vessel chosen = sasuke", before.edoBackup === "sasuke", `backup=${before.edoBackup}`);
  const hp0 = before.health, en0 = before.energy;

  // ── ACTIVATE (Ultimate = U) — the summoning cinematic starts; skip it to the resolve (body-swap) ──
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(3);
  await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.("p1"); });   // skip clears the ~3s cinematic instantly; clear the leftover ult-press buffer the real cinematic would have aged out
  let after = await p1(); for (let f = 0; f < 10 && !after.edoVessel; f++) { await waitFrames(1); after = await p1(); }
  check("Edo Tensei active", after.edoActive === true, `edoActive=${after.edoActive}`);
  check("control swapped to the vessel (rosterKey=sasuke)", after.key === "sasuke" && after.edoVessel === "sasuke", `key=${after.key} vessel=${after.edoVessel}`);
  check("window fuel armed (= full energy bar)", after.edoFuel === after.maxEnergy && after.edoFuel > 0, `fuel=${after.edoFuel} max=${after.maxEnergy}`);
  check("cost: ALL chakra spent, then FRESH vessel bar", en0 >= 60 && after.maxEnergy === 190 && after.energy === after.maxEnergy, `en ${en0}→${after.energy}/${after.maxEnergy}`);
  check("cost: ~25% of current HP", after.health < hp0 && Math.abs((hp0 - after.health) - Math.floor(hp0 * 0.25)) <= 2, `hp ${hp0}→${after.health} (−${hp0 - after.health})`);
  await page.screenshot({ path: path.join(OUT, "tobirama_edo_activated.png") });

  // ── the VESSEL'S kit is now live (Sasuke normals resolve to Sasuke sheets, not Tobirama) ──
  await adjacent(60);
  const hpDummy0 = (await p2()).health;
  await page.keyboard.down("j"); const mv = await waitSheet("sasuke"); await page.keyboard.up("j"); await waitFrames(18);
  check("vessel normal renders the VESSEL's sprite (sasuke_*)", (mv.spriteSheet || "").includes("sasuke") && !(mv.spriteSheet || "").includes("tobirama"), `sheet=${mv.spriteSheet}`);
  check("vessel normal connects for damage", (await p2()).health < hpDummy0, `Δ=${hpDummy0 - (await p2()).health}`);

  // (the nested ultimate-within-an-ultimate — vessel's own ult during the window + the timer-pause —
  //  is covered by its dedicated test: harness/tobirama_edo_nested.mjs)

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Step C (activation): ${PASS} passed, ${FAIL} failed — shot: tobirama_edo_activated.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
