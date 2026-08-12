// harness/red_ranger_mmpr_stage3.mjs
// STAGE 3 evidence: Red Ranger MMPR's GRAB/THROW SPECIAL (neutral Special) — the continuous trhow.
// resolveGrab catches the dummy → attacker renders the trhow_1 hold pose (rrGrab) → the shared updateGrab
// throw resolves (damage + launch) → attacker swaps to the trhow_2 release pose (rrThrow). Costs energy,
// whiffs cleanly out of range. Screenshots → harness/shots/red_ranger_mmpr_stage3_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `red_ranger_mmpr_stage3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && !p.isGrabbed; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function tapSpecial() { await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=red_ranger_mmpr`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── GRAB CONNECTS: reach → grab (trhow_1) → throw (trhow_2) ───────────
  console.log("\n── grab connects, renders trhow_1 → trhow_2, throws ──");
  await prep(46);
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  await tapSpecial();
  const enFire = (await p1()).energy;   // captured right after the cast — before passive regen masks the spend
  // Sample across the whole grab: catch the grabbed state, the hold pose (rrGrab/trhow_1), the release
  // pose (rrThrow/trhow_2), and the LAUNCH (dummy goes airborne / rises) at the throw moment.
  let sawGrabbed = false, grabSheet = null, throwSheet = null, grabbedShotDone = false, throwShotDone = false;
  let sawAirborne = false, minVy = 0;
  for (let f = 0; f < 44; f++) {
    const a = await p1(); const d = await p2();
    if (d.isGrabbed) sawGrabbed = true;
    if (!d.grounded) sawAirborne = true;
    if (d.vy < minVy) minVy = d.vy;
    if (a.castMove === "rrGrab" && a.spriteSheet) { grabSheet = a.spriteSheet; if (!grabbedShotDone) { await shot("grab_hold"); grabbedShotDone = true; } }
    if (a.castMove === "rrThrow" && a.spriteSheet) { throwSheet = a.spriteSheet; if (!throwShotDone) { await shot("throw_release"); throwShotDone = true; } }
    await waitFrames(1);
  }
  const hp1 = (await p2()).health;
  check("dummy was GRABBED (resolveGrab caught)", sawGrabbed, "");
  check("hold pose = rrGrab (trhow_1)", (grabSheet || "").includes("trhow_1_uniform"), `sheet=${grabSheet}`);
  check("release pose = rrThrow (trhow_2)", (throwSheet || "").includes("trhow_2_uniform"), `sheet=${throwSheet}`);
  check("throw dealt damage (≥ 50)", hp0 - hp1 >= 50, `dmg=${hp0 - hp1}`);
  check("throw LAUNCHES the dummy (airborne + rising during throw)", sawAirborne && minVy < -1, `airborne=${sawAirborne} minVy=${minVy}`);
  check("grab spent Morphin-Grid energy (~15)", en0 - enFire >= 13 && en0 - enFire <= 18, `spent=${(en0 - enFire).toFixed(1)}`);
  await waitGrounded(); await waitFrames(6);

  // ── WHIFF: out of range → no grab, energy still spent, recovers ──────
  console.log("\n── grab whiffs cleanly out of range ──");
  await prep(320);
  const wen0 = (await p1()).energy;
  const whp0 = (await p2()).health;
  await tapSpecial();
  const wenFire = (await p1()).energy;   // right after cast, before regen masks the spend
  let whiffGrabbed = false;
  for (let f = 0; f < 20; f++) { const d = await p2(); if (d.isGrabbed) whiffGrabbed = true; await waitFrames(1); }
  const whp1 = (await p2()).health;
  check("out-of-range grab does NOT catch", !whiffGrabbed, "");
  check("whiff deals no damage", whp0 - whp1 === 0, `dmg=${whp0 - whp1}`);
  check("whiff still spent energy (spam-gate)", wen0 - wenFire >= 13, `spent=${(wen0 - wenFire).toFixed(1)}`);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("fighter recovers after whiff (idle again)", true, "");

  // ── no fallback box + no errors ──────────────────────────────────────
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Red Ranger MMPR Stage 3: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
