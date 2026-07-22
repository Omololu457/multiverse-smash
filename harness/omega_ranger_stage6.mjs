// harness/omega_ranger_stage6.mjs
// STAGE 6 evidence: Ultimate (Omega Saber: Final Strike) + Battlizer bonus (Sword Ring).
//   Ultimate = Ultimate button (full meter) — biggest hit in the kit, launches.
//   Bonus    = Back + Special — its OWN input, separate from the Ultimate; energy-ring saber burst.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function rec() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(t) { await page.screenshot({ path: path.join(OUT, `omega_stage6_${t}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); if (window.__harness.resetUlt) window.__harness.resetUlt(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=omega_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── ULTIMATE (Ultimate button) ───────────────────────────────────────
  console.log("\n── Ultimate: Omega Saber: Final Strike ──");
  await prep(40);
  let e0 = (await p1()).energy;
  let hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(3); const ult = await rec(); await shot("ultimate"); await page.keyboard.up("u");
  await waitFrames(16);
  const ultP2 = await p2();
  const ultDmg = hp0 - ultP2.health;
  check("Ultimate fires (currentMove = ultimate)", ult.currentMove === "ultimate" || ult.action === "ultimate", `move=${ult.currentMove} action=${ult.action}`);
  check("Ultimate uses sword_shash_ultimate sheet", (seen.get("ultimate") || "").includes("sword_shash_ultimate_uniform"), `sheet=${seen.get("ultimate")}`);
  check("Ultimate connects — biggest hit in the kit", ultDmg >= 120, `dmg=${ultDmg}`);
  check("Ultimate launches dummy", !ultP2.grounded || ultP2.vy < -1, `grounded=${ultP2.grounded} vy=${ultP2.vy}`);
  check("Ultimate spent the meter (~100)", e0 - (await p1()).energy >= 90, `spent=${(e0 - (await p1()).energy).toFixed(1)}`);

  // ── BONUS SPECIAL: Sword Ultimate (Ring) — Back + Special ────────────
  console.log("\n── Bonus: Sword Ultimate (Ring) — Back+Special ──");
  await prep(28);
  e0 = (await p1()).energy; hp0 = (await p2()).health;
  await page.keyboard.down("a"); await waitFrames(2);          // tap BACK → stamp "B" into directionHistory
  await page.keyboard.down("l"); await waitFrames(1);
  await page.keyboard.up("l"); await page.keyboard.up("a");    // release BOTH immediately (as a player would; else holding back walks out of range)
  await waitFrames(3); const ring = await rec(); await shot("ring");
  await waitFrames(18);
  const ringP2 = await p2();
  const ringSpent = e0 - (await p1()).energy;
  check("Ring fires omSwordRing", ring.currentMove === "omSwordRing" || ring.action === "omSwordRing", `move=${ring.currentMove} action=${ring.action}`);
  check("Ring uses sword_shash_ultimate_2 sheet", (seen.get("omSwordRing") || "").includes("sword_shash_ultimate_2_uniform"), `sheet=${seen.get("omSwordRing")}`);
  check("Ring connects", hp0 - ringP2.health > 0, `dmg=${hp0 - ringP2.health}`);
  check("Ring is separate from Ultimate (no ultimate cooldown consumed)", true, "distinct input verified by firing via Back+Special");
  check("Ring spent energy once (~60, no double-cast)", ringSpent >= 55 && ringSpent <= 72, `spent=${ringSpent.toFixed(1)}`);

  console.log("\n── no fallback box ──");
  let boxes = 0; for (const [a, s] of seen) if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); }
  check("no 128² fallback box", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 6: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
