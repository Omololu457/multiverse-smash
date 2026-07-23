// harness/netero_stage3.mjs — Stage 3: down_attck cancel chain (+ interrupt test) + Barrage Punches.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
const shot = name => page.screenshot({ path: path.join(OUT, `netero_s3_${name}.png`) });
// Sample p1 action/frameIndex each frame for n frames; return the set of actions + max frameIndex per action.
async function sample(n) {
  const acts = new Set(); const maxIdx = {}; let shotTaken = null;
  for (let i = 0; i < n; i++) { const a = await record(); if (a.action) { acts.add(a.action); maxIdx[a.action] = Math.max(maxIdx[a.action] || 0, a.frameIndex || 0); if (!shotTaken && a.action) shotTaken = a.action; } await waitFrames(1); }
  return { acts, maxIdx };
}
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=netero`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── COMMAND CHAIN: opener connects → cancel-on-hit → follow-up ──
  section("down_attck cancel chain — opener → cancel-on-hit → follow-up");
  await prep(56);
  let hp0 = (await p2()).health;
  await page.keyboard.down("s");                        // hold Down
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Heavy edge → down_attck_1
  const s1 = await sample(6);                            // watch the opener
  await shot("chain_open");
  const hpAfterOpener = (await p2()).health;
  await page.waitForFunction(() => window.__harness.p2().hitstun > 0, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(4);                                   // drift into the opener's recovery
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // fresh Heavy edge → cancel into down_attck_2
  const s2 = await sample(8);
  await shot("chain_follow");
  await page.keyboard.up("s");
  const hpAfterChain = (await p2()).health;
  check("opener down_attck_1 fires + connects", s1.acts.has("down_attck_1") && hp0 - hpAfterOpener > 0, `−${(hp0 - hpAfterOpener).toFixed(0)} acts=[${[...s1.acts]}]`);
  check("cancels into down_attck_2 on hit", s2.acts.has("down_attck_2"), `acts=[${[...s2.acts]}]`);
  check("follow-up adds damage", hpAfterOpener - hpAfterChain > 0, `−${(hpAfterOpener - hpAfterChain).toFixed(0)} total −${(hp0 - hpAfterChain).toFixed(0)}`);

  // ── INTERRUPT TEST: whiffed opener must NOT chain ──
  section("interrupt rule — whiffed opener does NOT cancel into follow-up");
  await prep(420);   // far away → opener whiffs
  const wp0 = (await p2()).health;
  await page.keyboard.down("s");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener (whiff)
  await sample(6);
  await waitFrames(4);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // re-press Heavy — should be ignored (no hit)
  const wi = await sample(8);
  await page.keyboard.up("s");
  check("no cancel into down_attck_2 after a whiff", !wi.acts.has("down_attck_2"), `acts=[${[...wi.acts]}]`);
  check("opponent took no damage on the whiffed string", Math.abs(wp0 - (await p2()).health) < 1, `Δ=${(wp0 - (await p2()).health).toFixed(0)}`);

  // ── BARRAGE PUNCHES: one continuous 8-frame sequence + connects ──
  section("Barrage Punches — one 8-frame sequence + connect");
  await prep(70);
  const bE0 = (await p1()).energy; const bH0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const bE1 = (await p1()).energy;   // measure spend NOW, before energy regen accrues over the sample
  const bs = await sample(34);   // 8 frames × speed 4 ≈ 32 ticks to play the whole sequence
  await shot("barrage");
  const bAfter = await p2();
  check("Barrage fires (barragePunches action + sheet)", bs.acts.has("barragePunches"), `acts=[${[...bs.acts]}]`);
  check("Barrage uses the concat 8-frame sheet", (seenActions.get("barragePunches") || "").includes("netero_barrage_full_uniform"), `sheet=${seenActions.get("barragePunches")}`);
  check("plays through the 8-frame sequence (frameIndex reaches the back half)", (bs.maxIdx.barragePunches || 0) >= 6, `maxFrame=${bs.maxIdx.barragePunches}`);
  check("spends 30 energy", bE0 - bE1 >= 28, `Δ=${(bE0 - bE1).toFixed(0)}`);
  check("Barrage connects", bH0 - bAfter.health > 0, `−${(bH0 - bAfter.health).toFixed(0)}`);

  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("netero"));
  check(`all ${seenActions.size} exercised actions use a netero sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  NETERO Stage 3: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
