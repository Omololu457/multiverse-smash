// harness/chrollo_stage2.mjs — Stage 2: the 5 basic normals connect on a dummy +
// the "Blade Rush" Fwd+Heavy command chain (cancel-on-hit) + a whiff-interrupt test.
// Modeled on harness/netero_stage2.mjs + netero_stage3.mjs.
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
const shot = name => page.screenshot({ path: path.join(OUT, `chrollo_s2_${name}.png`) });
async function sample(n) { const acts = new Set(); const maxIdx = {}; for (let i = 0; i < n; i++) { const a = await record(); if (a.action) { acts.add(a.action); maxIdx[a.action] = Math.max(maxIdx[a.action] || 0, a.frameIndex || 0); } await waitFrames(1); } return { acts, maxIdx }; }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=chrollo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── 5 NORMALS ──
  section("grounded normals — connect + damage");
  for (const [name, key, gap, sheet] of [["light", "j", 46, "chrollo_punch_uniform"], ["heavy", "k", 52, "chrollo_kick_uniform"], ["up", "i", 48, "chrollo_upattack_uniform"]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const mid = await record(); await shot(name); await page.keyboard.up(key); await waitFrames(20);
    const after = await p2();
    check(`${name} connects`, hp0 - after.health > 0, `−${(hp0 - after.health).toFixed(0)} action=${mid.action} sheet=${(mid.spriteSheet || "").split("/").pop()}`);
    check(`${name} uses ${sheet}`, (seenActions.get(mid.action) || "").includes(sheet), `sheet=${(mid.spriteSheet || "").split("/").pop()}`);
    if (key === "i") check("up-attack launches P2", after.grounded === false || after.vy < 0, `vy=${after.vy.toFixed(1)} grounded=${after.grounded}`);
    await waitFrames(18);
  }

  section("aerial normals — air + down_air spike");
  await prep(44);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(42)); await page.keyboard.down("j"); await waitFrames(3); const mid = await record(); await shot("air"); await page.keyboard.up("j"); await waitFrames(14);
    check("air connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)} action=${mid.action}`);
    check("air uses chrollo_downattack_uniform", (seenActions.get("air") || "").includes("chrollo_downattack_uniform"), `sheet=${(seenActions.get("air") || "").split("/").pop()}`); }
  await waitGrounded(); await waitFrames(8);
  await prep(32);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); const mid = await record(); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    check("down_air spike connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)} action=${mid.action}`); }
  await waitGrounded();

  // ── BLADE RUSH CHAIN: opener connects → cancel-on-hit → finisher ──
  section("Blade Rush — Fwd+Heavy opener → cancel-on-hit → finisher launcher");
  await prep(54);
  const hp0 = (await p2()).health;
  await page.keyboard.down("d");                       // hold Forward
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Heavy edge → chCombo1
  const s1 = await sample(7);
  await shot("chain_open");
  const hpAfterOpener = (await p2()).health;
  await page.waitForFunction(() => window.__harness.p2().hitstun > 0, null, { timeout: 2000, polling: 16 }).catch(() => {});
  // Re-tap Heavy across the opener's recovery window (retry fresh EDGES until the chain advances — the
  // rekka window is a few frames, so a single fixed-timing tap is flaky; several edges land it reliably).
  const s2acts = new Set();
  for (let i = 0; i < 6 && !s2acts.has("chComboFin"); i++) {
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1);
    const a = await record(); if (a.action) s2acts.add(a.action);
  }
  const extra = await sample(6); for (const a of extra.acts) s2acts.add(a);
  const s2 = { acts: s2acts };
  await shot("chain_finish");
  await page.keyboard.up("d");
  const hpAfterChain = (await p2()).health;
  check("opener chCombo1 fires + connects", s1.acts.has("chCombo1") && hp0 - hpAfterOpener > 0, `−${(hp0 - hpAfterOpener).toFixed(0)} acts=[${[...s1.acts]}]`);
  check("cancels into chComboFin on hit", s2.acts.has("chComboFin"), `acts=[${[...s2.acts]}]`);
  check("finisher adds damage (total > opener)", hpAfterOpener - hpAfterChain > 0 && hp0 - hpAfterChain > (hp0 - hpAfterOpener), `opener −${(hp0 - hpAfterOpener).toFixed(0)} total −${(hp0 - hpAfterChain).toFixed(0)}`);
  const p2end = await p2();
  check("finisher launches P2 (launcher)", p2end.grounded === false || p2end.vy < 0, `vy=${p2end.vy.toFixed(1)} grounded=${p2end.grounded}`);
  await waitGrounded();

  // ── INTERRUPT TEST: whiffed opener must NOT chain ──
  section("interrupt rule — whiffed opener does NOT cancel into the finisher");
  await prep(430);   // far away → opener whiffs
  const wp0 = (await p2()).health;
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener (whiff)
  await sample(6);
  await waitFrames(3);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // re-press Heavy — should be ignored (no hit)
  const wi = await sample(9);
  await page.keyboard.up("d");
  check("no cancel into chComboFin after a whiff", !wi.acts.has("chComboFin"), `acts=[${[...wi.acts]}]`);
  check("opponent took no damage on the whiffed string", Math.abs(wp0 - (await p2()).health) < 1, `Δ=${(wp0 - (await p2()).health).toFixed(0)}`);

  section("fallback-box sweep — every exercised action resolves to a chrollo sheet");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("chrollo"));
  check(`all ${seenActions.size} exercised actions use a chrollo sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  CHROLLO Stage 2: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
