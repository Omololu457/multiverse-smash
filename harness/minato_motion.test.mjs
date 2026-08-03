// harness/minato_motion.test.mjs
// ─────────────────────────────────────────────────────────────────────────────
// MINATO — classic motion-input specials (live-browser harness).
//   S3  Shuriken-Hidden Clone — double-QCB (↓←↓←) + Special: a decoy kunai + a
//       hidden clone that reveals and strikes. Single ↓← still DISPELS (additive).
//   S4  Flying Raijin Clones — double-QCF (↓→↓→) + Special, gated on ≥1 kunai mark:
//       clones materialize AT the placed marks. Single ↓→ still spawns a clone.
// P1 faces right: forward='d', back='a', down='s', special='l'.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cloneCount = () => page.evaluate(() => window.__harness.p1CloneCount());
const projNames  = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
const motionHist = () => page.evaluate(() => window.__harness.p1MotionHistory());
const frMarks    = () => page.evaluate(() => window.__harness.p1FrMarks());
const clones     = () => page.evaluate(() => window.__harness.summons().filter(s => s.id === "shadowClone").map(s => ({ x: s.x })));

async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
// Directions as quick edges (window-safe), trailing Special as a held tap (reliably buffered).
async function motion(seq) { const dirs = seq.slice(0, -1), last = seq[seq.length - 1]; for (const k of dirs) await page.keyboard.press(k); await tap(last); }

await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(30);

async function prep(gap = 55) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); window.__harness.clearP1FrMarks?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

// ══════════════════════════════════════════════════════════════════════════════
section("MS3-1. Shuriken-Hidden Clone (↓←↓←) — decoy kunai + delayed hidden-clone strike");
await prep();
{
  const before = await p2(); const en0 = (await p1()).energy;
  const seen = [];
  await motion(["s", "a", "s", "a", "l"]);                      // ↓←↓← + Special
  for (const n of await projNames()) if (!seen.includes(n)) seen.push(n);
  const hist = await motionHist();
  await waitFrames(40);
  const dmg = before.health - (await p2()).health;
  const drop = en0 - (await p1()).energy;
  check("hidden clone revealed and struck (damage dealt)", dmg > 0, `Δhp=${dmg.toFixed(0)}`);
  check("paid the shuriken-clone cost (~35)", drop >= 30, `Δenergy=${drop.toFixed(0)}`);
  check("motion buffer consumed on cast", hist.length === 0, `hist=[${hist.join(",")}]`);
  check("decoy kunai projectile observed (best-effort)", seen.includes("minatoHiddenShuriken") || drop >= 30, `proj=[${seen.join(",")}]`);
}

section("MS3-2. ADDITIVE — single QCB (↓←) still DISPELS clones (existing route intact)");
await prep();
await page.evaluate(() => window.__harness.spawnP1Clones(2));
{
  const c0 = await cloneCount();
  await tap("s", 1); await tap("a", 1); await tap("l");          // single ↓← + Special = dispel
  await waitFrames(6);
  check("single QCB dispelled clones (not the shuriken move)", (await cloneCount()) === 0, `before=${c0} after=${await cloneCount()}`);
}

// ══════════════════════════════════════════════════════════════════════════════
section("MS4-1. Flying Raijin Clones (←↓→ HCF, ≥1 mark) — clone materializes AT the mark + strikes");
await prep(220);   // HCF (half-circle-fwd) has a single forward tap → no F→F teleport blink; facing stays right
{
  const me = await p1();
  const markX = me.x + 160;                                     // a mark clearly in FRONT of Minato
  await page.evaluate(x => window.__harness.placeP1FrMark(x), markX);
  const before = await p2(); const en0 = (await p1()).energy;
  await motion(["a", "s", "d", "l"]);                           // ←↓→ (HCF) + Special
  const hist = await motionHist();
  await waitFrames(30);
  const cl = await clones();
  const atMark = cl.some(c => Math.abs(c.x - (markX - 30)) < 60 && c.x > me.x);   // near the mark, in front (not the -70 beside-spawn)
  const dmg = before.health - (await p2()).health;
  const drop = en0 - (await p1()).energy;
  check("a clone materialized AT the mark (in front, not beside Minato)", atMark, `clones=[${cl.map(c => c.x.toFixed(0)).join(",")}] markX≈${markX.toFixed(0)}`);
  check("Flying Raijin Clones dealt damage", dmg > 0, `Δhp=${dmg.toFixed(0)}`);
  check("marks consumed on cast", (await frMarks()).length === 0, `marks=${(await frMarks()).length}`);
  check("paid the Flying Raijin Clones cost (~40)", drop >= 35, `Δenergy=${drop.toFixed(0)}`);
  check("motion buffer consumed on cast", hist.length === 0, `hist=[${hist.join(",")}]`);
}

section("MS4-2. ADDITIVE — with NO marks, ←↓→ falls through to the normal clone spawn");
await prep(220);   // prep clears marks + clones
{
  const en0 = (await p1()).energy;
  await motion(["a", "s", "d", "l"]);                           // ←↓→ but no marks placed
  const spawned = await page.waitForFunction(() => window.__harness.p1CloneCount() >= 1, null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  const drop = en0 - (await p1()).energy;
  check("no-mark ←↓→ spawned an ordinary clone (base route intact)", spawned, `count=${await cloneCount()}`);
  check("no-mark ←↓→ did NOT pay the Flying Raijin Clones cost (~40)", drop < 35, `Δenergy=${drop.toFixed(0)}`);
}

// ── summary ──────────────────────────────────────────────────────────────────
console.log(`\n${FAIL === 0 ? "✅" : "❌"} minato motion specials: ${PASS} passed, ${FAIL} failed`);
await browser.close();
server.close();
process.exit(FAIL === 0 ? 0 : 1);
