// harness/chrollo_bandits_echo_stage4.mjs — BANDIT'S ECHO Stage 4: the ULTIMATE-tier case.
//   MATCH 1 — REAL ultimate MARK-ON-CONNECT: Ben10 (XLR8 "Sonic Blitz" — a real isUltimate move that routes
//             through the tracked hit site) lands on Chrollo → the mark records isUltimate:true.
//   MATCH 2 — FIRING a copied CINEMATIC ULTIMATE: Chrollo copies Batman's "The Dark Knight" (a freeze-cinematic
//             ultimate), fires it via Down+Ult → the cinematic PLAYS (freeze), deals its guaranteed ~300,
//             the HP price is paid, the mark is consumed, and Chrollo AUTO-REVERTS after the cinematic ends.
// (The two halves use different opponents on purpose: the only ultimates that mark on a REAL connect are the
//  Ben10 pipeline ults, but those are form-branched so a copy can't reproduce the in-form move — a clean
//  no-forms cinematic ult like Batman's is the faithful way to prove copy+play+revert. See the Stage 4 report.)
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
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded(who = "p1") { await page.waitForFunction(w => { const p = window.__harness[w](); return p.grounded && Math.abs(p.vy) < 0.5; }, who, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `chrollo_be_s4_${name}.png`) });
async function loadMatch(q) {
  await page.goto(`${base}/index.html?harness=1&${q}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
}

try {
  // ═══════════════════════════════════════════════════════════════════════
  // MATCH 1 — a REAL opponent ULTIMATE landing on Chrollo marks isUltimate:true
  // ═══════════════════════════════════════════════════════════════════════
  section("MATCH 1 — Ben10 XLR8 'Sonic Blitz' ULTIMATE lands on Chrollo → mark records isUltimate:true");
  await loadMatch("p1=ben10&p2=chrollo");
  await page.evaluate(() => window.__harness.benForm("xlr8", "p1"));   // put Ben into XLR8 so Ultimate = Sonic Blitz
  await waitGrounded("p1");
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.fillEnergy?.(); window.__harness.clearBeMark?.("p2"); });
  let a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 90);   // Chrollo just ahead — Sonic Blitz blitz-dashes in
  await waitFrames(2);
  const benState = await page.evaluate(() => window.__harness.benForm("xlr8", "p1"));
  check("Ben is in XLR8 form (Ultimate → Sonic Blitz)", /xlr8/i.test(benState?.activeAlien || ""), `alien=${benState?.activeAlien}`);
  const cp2hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.beState("p2") !== null, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const uMark = await page.evaluate(() => window.__harness.beState("p2"));
  await shot("ult_connect");
  check("Sonic Blitz connected on Chrollo (damage taken)", (await p2()).health < cp2hp0, `−${(cp2hp0 - (await p2()).health).toFixed(0)}`);
  check("mark created from the ULTIMATE connect", !!uMark, `beState=${JSON.stringify(uMark)}`);
  check("mark tier = ULTIMATE (isUltimate:true)", uMark?.isUltimate === true, `isUltimate=${uMark?.isUltimate}`);
  check("mark source kit is a real character", !!uMark && typeof uMark.rosterKey === "string" && uMark.rosterKey.length > 0, `rosterKey=${uMark?.rosterKey}`);

  // ═══════════════════════════════════════════════════════════════════════
  // MATCH 2 — Chrollo COPIES + FIRES a cinematic ULTIMATE (Batman "The Dark Knight")
  // ═══════════════════════════════════════════════════════════════════════
  section("MATCH 2 — Chrollo copies + fires Batman's freeze-cinematic ULTIMATE, then auto-reverts");
  await loadMatch("p1=chrollo&p2=batman");
  await waitGrounded("p1");
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.fillEnergy?.(); });
  a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 150);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.forceBeMark({ rosterKey: "batman", isUltimate: true, moveName: "batman_darkknight", displayName: "Batman" }, "p1"));
  await waitFrames(2);
  check("Ultimate mark armed (Batman ULT)", (await page.evaluate(() => window.__harness.beState("p1")))?.isUltimate === true, `beState=${JSON.stringify(await page.evaluate(() => window.__harness.beState("p1")))}`);
  const hp0 = (await p1()).health, p2hp0 = (await p2()).health;

  // Down+Ultimate
  await page.keyboard.down("s"); await waitFrames(1);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.keyboard.up("s");
  // the borrowed ultimate should launch its freeze cinematic — catch it live
  const sawCine = await page.waitForFunction(() => window.__harness.edoBackup.innerCineActive(), null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  const midActive = await page.evaluate(() => window.__harness.beActive("p1"));
  await shot("copied_ult_cinematic");
  check("Chrollo is in the borrowed kit (rosterKey → batman) during the ult", midActive?.rosterKey === "batman", `mid=${JSON.stringify(midActive)}`);
  check("a freeze CINEMATIC actually played (the higher-stakes ult path)", sawCine, `innerCineActive seen=${sawCine}`);
  // wait for the cinematic to end + the auto-revert to fire
  await page.waitForFunction(() => { const b = window.__harness.beActive("p1"); return !b.active && b.rosterKey === "chrollo"; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(10);
  const hp1 = (await p1()).health, p2hp1 = (await p2()).health;
  check("copied ULTIMATE dealt its guaranteed damage (~180 = 300×0.60)", (p2hp0 - p2hp1) >= 170, `−${(p2hp0 - p2hp1).toFixed(0)}`);
  check("HP blood price paid (~162)", Math.abs((hp0 - hp1) - 162) <= 2, `Δhp=${(hp0 - hp1).toFixed(0)}`);
  check("mark CONSUMED", (await page.evaluate(() => window.__harness.beState("p1"))) === null, `beState=${JSON.stringify(await page.evaluate(() => window.__harness.beState("p1")))}`);
  check("auto-reverted to Chrollo after the cinematic", (await page.evaluate(() => window.__harness.beActive("p1")))?.rosterKey === "chrollo", `beActive=${JSON.stringify(await page.evaluate(() => window.__harness.beActive("p1")))}`);
  check("Chrollo actionable again (not stuck in the borrowed kit)", !(await p1()).attacking, `attacking=${(await p1()).attacking}`);
  await shot("reverted");

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(52)}\n  CHROLLO Bandit's Echo Stage 4 (ultimate-tier copy): ${PASS} passed, ${FAIL} failed\n${"═".repeat(52)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
