// harness/omega_ranger_stage3.mjs
// STAGE 3 evidence: Omega Ranger command-normal kick chain (cancel-on-hit) + free pokes.
//   kick chain: Fwd+Heavy → omKick → (re-tap Heavy on hit) → omSpinKick → omLowAttack
//   interrupt:  a WHIFFED omKick must NOT advance on re-tap (cancel-on-HIT rule)
//   free pokes: Forward Push (Fwd+Light), Downward Air Attack 2 (airborne Heavy)
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
async function shot(t) { await page.screenshot({ path: path.join(OUT, `omega_stage3_${t}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
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

  // ── KICK CHAIN (cancel-on-hit) ───────────────────────────────────────
  // Driven precisely via __harness.orCmd: re-tap Heavy ONLY when the current stage is in
  // recovery AND connected AND a next stage is queued — the deterministic rekka window.
  console.log("\n── kick chain: Fwd+Heavy → re-tap Heavy on hit → 3 stages ──");
  await prep(38);
  const cmd = () => page.evaluate(() => window.__harness.orCmd());
  const chain = [];
  const hp0 = (await p2()).health;
  await page.keyboard.down("d");                 // hold forward the whole chain
  await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");   // opener: Fwd+Heavy → omKick
  for (let i = 0; i < 40; i++) {
    const c = await cmd();
    if (c.move && !chain.includes(c.move)) { chain.push(c.move); await rec(); await shot(c.move === "omKick" ? "kick" : c.move === "omSpinKick" ? "spin_kick" : "low_attack"); }
    if (chain.includes("omLowAttack")) break;
    if (c.rekkaNext && c.connected && c.phase === "recovery") {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1);   // fresh Heavy edge → advance
    } else {
      await waitFrames(1);
    }
  }
  await page.keyboard.up("d");
  await waitFrames(20);
  const hp1 = (await p2()).health;
  check("stage 1 = omKick", chain[0] === "omKick", `chain=[${chain.join(" → ")}]`);
  check("stage 2 = omSpinKick (cancel on hit)", chain.includes("omSpinKick"), `chain=[${chain.join(" → ")}]`);
  check("stage 3 = omLowAttack finisher", chain.includes("omLowAttack"), `chain=[${chain.join(" → ")}]`);
  check("full chain dealt meaningful damage", hp0 - hp1 >= 60, `dmg=${hp0 - hp1}`);
  check("omKick sheet", (seen.get("omKick") || "").includes("kick_uniform"), `sheet=${seen.get("omKick")}`);
  check("omSpinKick sheet", (seen.get("omSpinKick") || "").includes("spin_kick_uniform"), `sheet=${seen.get("omSpinKick")}`);
  check("omLowAttack sheet", (seen.get("omLowAttack") || "").includes("low_attack_uniform"), `sheet=${seen.get("omLowAttack")}`);

  // ── INTERRUPT: whiffed opener must NOT advance (cancel-on-HIT) ────────
  console.log("\n── interrupt: whiffed omKick does NOT chain ──");
  await prep(40);
  await page.evaluate(() => window.__harness.setP2X(99999));   // move dummy far away → opener whiffs
  const wchain = [];
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 16; i++) {
    const m = (await p1()).currentMove;
    if (m && !wchain.includes(m)) wchain.push(m);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1);
  }
  await page.keyboard.up("d");
  check("whiffed opener fired omKick", wchain.includes("omKick"), `chain=[${wchain.join(" → ")}]`);
  check("whiff did NOT advance to omSpinKick", !wchain.includes("omSpinKick"), `chain=[${wchain.join(" → ")}]`);
  await waitFrames(20);

  // ── FREE POKE: Forward Push (Fwd+Light) ──────────────────────────────
  console.log("\n── free pokes ──");
  await prep(50);
  let php0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("j"); await waitFrames(4); const push = await rec(); await shot("forward_push"); await page.keyboard.up("j"); await page.keyboard.up("d"); await waitFrames(16);
  let php1 = (await p2()).health;
  check("Forward Push = omForwardPush", push.currentMove === "omForwardPush" || push.action === "omForwardPush", `move=${push.currentMove} action=${push.action}`);
  check("Forward Push connects + shoves", php0 - php1 > 0, `dmg=${php0 - php1}`);
  check("Forward Push sheet", (seen.get("omForwardPush") || "").includes("foward_push_uniform"), `sheet=${seen.get("omForwardPush")}`);

  // ── FREE POKE: Downward Air Attack 2 (airborne Heavy) ────────────────
  await prep(40);
  await page.evaluate(() => window.__harness.liftP1(44));
  let dph0 = (await p2()).health;
  await page.keyboard.down("k"); await waitFrames(4); const da2 = await rec(); await shot("down_air_2"); await page.keyboard.up("k"); await waitFrames(14);
  let dph1 = (await p2()).health;
  check("Down-Air 2 = omDownAir2", da2.currentMove === "omDownAir2" || da2.action === "omDownAir2", `move=${da2.currentMove} action=${da2.action}`);
  check("Down-Air 2 connects", dph0 - dph1 > 0, `dmg=${dph0 - dph1}`);
  check("Down-Air 2 sheet", (seen.get("omDownAir2") || "").includes("downward_air_attack_2_uniform"), `sheet=${seen.get("omDownAir2")}`);

  console.log("\n── no fallback box ──");
  let boxes = 0; for (const [a, s] of seen) if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); }
  check("no 128² fallback box", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 3: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
