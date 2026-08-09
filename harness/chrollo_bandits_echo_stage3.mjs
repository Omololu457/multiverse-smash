// harness/chrollo_bandits_echo_stage3.mjs — BANDIT'S ECHO Stage 3: ACTIVATION (copy + fire + consume + HP cost).
// Chrollo (p1) has a marked opponent SPECIAL (Batman's Batarang). Down+Ultimate fires a COPY that connects on
// the p2 dummy, deducts a 15%-max-HP blood price, and CONSUMES the mark. Proves: the copy fires + connects,
// the HP deducts, a 2nd activation immediately after does NOT fire (mark consumed), a fizzle (no energy) costs
// nothing, and a freshly-armed mark is usable again. Screenshot evidence for the fire.
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

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const beS = () => page.evaluate(() => window.__harness.beState("p1"));
const beA = () => page.evaluate(() => window.__harness.beActive("p1"));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `chrollo_be_s3_${name}.png`) });
const BATARANG_MARK = { rosterKey: "batman", isUltimate: false, dir: null, moveName: "batman_batarang", displayName: "Batman" };
async function armMark() { await page.evaluate(m => window.__harness.forceBeMark(m, "p1"), BATARANG_MARK); }
// place the p2 dummy `gap` px in front of Chrollo, reset + refuel Chrollo, wait until Chrollo is actionable.
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=chrollo&p2=batman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── 1) REAL Down+Ultimate fires a copy of the marked SPECIAL, connects, and costs HP ──
  section("Down+Ultimate fires the marked move (Batman Batarang), it connects, and HP is paid");
  await prep(120);
  await armMark();
  await waitFrames(2);
  check("mark armed (Batman SP)", (await beS())?.rosterKey === "batman", `beState=${JSON.stringify(await beS())}`);
  const hp0 = (await p1()).health, en0 = (await p1()).energy, p2hp0 = (await p2()).health;
  // Down+Ultimate: hold Down (s), tap Ultimate (u)
  await page.keyboard.down("s"); await waitFrames(1);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  // catch the moment Chrollo is in the borrowed kit (before auto-revert)
  const midActive = await beA();
  await shot("firing");
  await page.keyboard.up("s");
  // let the borrowed projectile travel + the move settle + auto-revert
  await page.waitForFunction(() => { const b = window.__harness.beActive("p1"); return !b.active && b.rosterKey === "chrollo"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(20);
  const hp1 = (await p1()).health, en1 = (await p1()).energy, p2hp1 = (await p2()).health;
  check("Chrollo entered the borrowed kit (rosterKey → batman) during the fire", midActive?.active && midActive?.rosterKey === "batman", `mid=${JSON.stringify(midActive)}`);
  check("copied move CONNECTED on the dummy (p2 took damage)", p2hp1 < p2hp0, `−${(p2hp0 - p2hp1).toFixed(0)}`);
  check("HP blood price paid (~15% of 1080 = 162)", Math.abs((hp0 - hp1) - 162) <= 2, `Δhp=${(hp0 - hp1).toFixed(0)}`);
  check("special-tier energy paid (~25)", Math.abs((en0 - en1) - 25) <= 2, `Δen=${(en0 - en1).toFixed(1)}`);
  check("mark CONSUMED (no mark left)", (await beS()) === null, `beState=${JSON.stringify(await beS())}`);
  check("auto-reverted to Chrollo", (await beA())?.rosterKey === "chrollo" && !(await beA())?.active, `beActive=${JSON.stringify(await beA())}`);

  // ── 2) SINGLE-USE — a 2nd activation immediately after does NOT fire ──
  section("single-use — re-pressing Down+Ult immediately does NOT fire (mark consumed)");
  await prep(120);   // note: prep does NOT re-arm a mark
  check("no mark present after consume + prep", (await beS()) === null, `beState=${JSON.stringify(await beS())}`);
  const p2hpA = (await p2()).health, hpA = (await p1()).health;
  const retry = await page.evaluate(() => window.__harness.beActivate("p1"));   // direct call, bypasses input timing
  await waitFrames(24);
  check("beActivate reports fired=false (no mark)", retry.fired === false && retry.hadMark === false, `retry=${JSON.stringify(retry)}`);
  check("no damage dealt on the dead-press", (await p2()).health === p2hpA, `p2 ${p2hpA}→${(await p2()).health}`);
  check("no HP lost on the dead-press", (await p1()).health === hpA, `hp ${hpA}→${(await p1()).health}`);

  // ── 3) FIZZLE — a mark but no energy costs NOTHING (mark kept, no HP) ──
  section("fizzle — armed but no energy: refunds cleanly, mark kept, no HP lost");
  await prep(120);
  await armMark();
  await page.evaluate(() => window.__harness.setP1Energy(0));   // drain below the 25 special cost
  await waitFrames(2);
  const hpF = (await p1()).health;
  const fz = await page.evaluate(() => window.__harness.beActivate("p1"));
  check("fizzle: fired=false", fz.fired === false, `fz=${JSON.stringify(fz)}`);
  check("fizzle: mark KEPT (still armed)", (await beS())?.rosterKey === "batman", `beState=${JSON.stringify(await beS())}`);
  check("fizzle: NO HP lost", (await p1()).health === hpF, `hp ${hpF}→${(await p1()).health}`);

  // ── 4) RE-ARMABLE — a fresh mark is usable again ──
  section("re-armable — a fresh mark + energy fires again (single-use is per-mark, not permanent)");
  await prep(120);
  await armMark();
  await waitFrames(2);
  const p2hpR0 = (await p2()).health, hpR0 = (await p1()).health;
  const again = await page.evaluate(() => window.__harness.beActivate("p1"));
  await page.waitForFunction(() => { const b = window.__harness.beActive("p1"); return !b.active && b.rosterKey === "chrollo"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(20);
  check("2nd distinct activation fired", again.fired === true, `again=${JSON.stringify({ fired: again.fired })}`);
  check("HP paid again (~162)", Math.abs((hpR0 - (await p1()).health) - 162) <= 2, `Δhp=${(hpR0 - (await p1()).health).toFixed(0)}`);
  check("copied move connected again", (await p2()).health < p2hpR0, `−${(p2hpR0 - (await p2()).health).toFixed(0)}`);
  await shot("rearmed_fire");

  // ── integrity ──
  section("integrity");
  check("Chrollo renders his own kit after all reverts", (await p1()).rosterKey === "chrollo" || (await p1()).key === "chrollo", `rosterKey=${(await beA())?.rosterKey}`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(52)}\n  CHROLLO Bandit's Echo Stage 3 (activation): ${PASS} passed, ${FAIL} failed\n${"═".repeat(52)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
