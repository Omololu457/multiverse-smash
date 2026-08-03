// harness/samurai_red_ranger_stage2.mjs
// STAGE 2 evidence: Samurai Red Ranger's 5 normals connect + correct sheets, the MERGED
// tap/hold up-attack (two tiers on one input), and the Toji-Rekka flame command chain with a
// mid-chain interrupt (whiff breaks the string). Screenshots → harness/shots/samurai_stage2_*.png.
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
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `samurai_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
// poll P1.currentMove over a short window (chain stages are brief) so we don't miss a transient.
// Records the sheet for EVERY currentMove seen (so seen.get(<moveKey>) works for cast-style moves).
async function sawMove(name, frames = 26) {
  let hit = false;
  for (let i = 0; i < frames; i++) {
    const a = await p1();
    if (a.currentMove) seen.set(a.currentMove, a.spriteSheet || null);
    if (a.currentMove === name || a.action === name) { hit = true; break }
    await waitFrames(1);
  }
  return hit;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=samurai_red_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── GROUND NORMALS: light / heavy ────────────────────────────────────
  console.log("\n── ground normals connect + correct sheet ──");
  for (const [name, action, key, gap, sheetTag, dmgMin] of [
    ["light", "light", "j", 46, "combo_uniform", 15],
    ["heavy", "heavy", "k", 46, "combo_2_uniform", 30],
  ]) {
    await prep(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const mid = await record(); await shot(action); await page.keyboard.up(key); await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`${name} connects (dmg ≥ ${dmgMin})`, hp0 - hp1 >= dmgMin, `dmg=${hp0 - hp1}`);
    check(`${name} sheet = ${sheetTag}`, (seen.get(action) || "").includes(sheetTag), `action=${mid.action} sheet=${seen.get(action)}`);
  }

  // ── MERGED UP-ATTACK: tap (quick) vs hold (strong) ───────────────────
  console.log("\n── merged up-attack: tap vs hold (one input, two tiers) ──");
  // TAP: quick press+release before the hold threshold → samUpTap
  await prep(42);
  let hp0 = (await p2()).health;
  await page.keyboard.down("i"); await waitFrames(3); await page.keyboard.up("i");
  const tapSeen = await sawMove("samUpTap", 20);
  await shot("up_tap");
  await waitFrames(20);
  const tapDmg = hp0 - (await p2()).health;
  check("tap I → samUpTap (quick launcher)", tapSeen, `dmg=${tapDmg}`);
  check("up-tap sheet = upattack_1_uniform", (seen.get("samUpTap") || "").includes("upattack_1_uniform"), `sheet=${seen.get("samUpTap")}`);
  const launchedT = await p2();
  check("up-tap launches dummy (rising)", !launchedT.grounded || launchedT.vy < -1, `grounded=${launchedT.grounded} vy=${launchedT.vy}`);

  // HOLD: keep I down past the threshold (9f) → samUpHold, stronger
  await prep(42);
  hp0 = (await p2()).health;
  await page.keyboard.down("i");
  const holdSeen = await sawMove("samUpHold", 20);
  await shot("up_hold");
  await page.keyboard.up("i"); await waitFrames(24);
  const holdDmg = hp0 - (await p2()).health;
  check("hold I → samUpHold (strong tier)", holdSeen, `dmg=${holdDmg}`);
  check("up-hold sheet = upattack_2_uniform", (seen.get("samUpHold") || "").includes("upattack_2_uniform"), `sheet=${seen.get("samUpHold")}`);
  check("hold tier out-damages tap tier", holdDmg > tapDmg, `hold=${holdDmg} tap=${tapDmg}`);

  // ── AIR NORMALS: air (airborne J) / down_air (airborne S+J) ───────────
  console.log("\n── air normals connect + correct sheet ──");
  await prep(44);
  await page.evaluate(() => window.__harness.liftP1(40));
  hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const airRec = await record(); await shot("air"); await page.keyboard.up("j"); await waitFrames(14);
  check("air resolves to samurai_ranger_air_uniform", (seen.get("air") || "").includes("samurai_ranger_air_uniform"), `action=${airRec.action} sheet=${seen.get("air")}`);
  check("air connects (dmg > 0)", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`);
  await waitGrounded(); await waitFrames(8);

  await prep(30);
  await page.evaluate(() => window.__harness.liftP1(46));
  hp0 = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); const daRec = await record(); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
  check("down_air resolves to downattack_uniform", (seen.get("down_air") || "").includes("samurai_ranger_downattack_uniform"), `action=${daRec.action} sheet=${seen.get("down_air")}`);
  check("down_air connects (dmg > 0)", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`);

  // ── COMMAND CHAIN: Fwd+Heavy → re-tap Heavy → samRekka1→2→Fin ─────────
  // Re-tap during each stage's RECOVERY (startup5+active3 → recovery opens ~frame 8, closes ~20).
  // Sample continuously into a stage set; hold forward so P1 walks back into range between stages.
  console.log("\n── flame command chain (Fwd+Heavy, cancel-on-hit) ──");
  await prep(50);
  const stages = new Set();
  const sample = async (n) => { for (let i = 0; i < n; i++) { const a = await p1(); if (a.currentMove) { stages.add(a.currentMove); seen.set(a.currentMove, a.spriteSheet || null); } await waitFrames(1); } };
  const chainHp0 = (await p2()).health;
  await page.keyboard.down("d");                         // hold forward (walk back into range between stages)
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  await sample(6); await shot("rekka1");                 // rekka1 active → early recovery
  for (const tag of ["rekka2", "rekkaFin"]) {
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // re-tap in recovery
    await sample(7); await shot(tag);
  }
  await waitFrames(10);
  await page.keyboard.up("d");
  const chainDmg = chainHp0 - (await p2()).health;
  check("chain stage 1 (samRekka1) fires on Fwd+Heavy", stages.has("samRekka1"), `stages=[${[...stages]}]`);
  check("chain advances to stage 2 (samRekka2) on re-tap after hit", stages.has("samRekka2"), `stages=[${[...stages]}]`);
  check("chain advances to finisher (samRekkaFin)", stages.has("samRekkaFin"), `stages=[${[...stages]}]`);
  check("full chain deals cumulative damage", chainDmg > 50, `total=${chainDmg}`);

  // ── MID-CHAIN INTERRUPT: a WHIFFED opener must NOT advance (cancel-on-hit) ──
  console.log("\n── mid-chain interrupt: whiff breaks the chain ──");
  await prep(360);                                       // dummy far away → opener whiffs
  const whiffHp0 = (await p2()).health;
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w1 = await sawMove("samRekka1", 10);             // opener still fires...
  await waitFrames(6);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w2 = await sawMove("samRekka2", 14);             // ...but must NOT advance (no hit landed)
  await page.keyboard.up("d");
  await waitFrames(6);
  check("whiffed opener still animates (samRekka1)", w1, "");
  check("chain does NOT advance after a whiff (no samRekka2)", !w2, "");
  check("whiffed chain dealt no damage", whiffHp0 - (await p2()).health === 0, `dmg=${whiffHp0 - (await p2()).health}`);

  // ── no fallback box on any move ──────────────────────────────────────
  console.log("\n── no 128² fallback box ──");
  let boxes = 0; for (const [a, s] of seen) { if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); } }
  check("every move rendered a real sheet", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 2: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
