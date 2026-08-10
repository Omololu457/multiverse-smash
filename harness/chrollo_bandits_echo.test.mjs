// harness/chrollo_bandits_echo.test.mjs — BANDIT'S ECHO consolidated suite (Stage 5). Covers, with REAL
// gameplay where possible: (A) mark-on-connect trigger (special + freeze-cinematic ultimate), (B) special-move
// copy incl. HP cost + single-use consumption, (C) Ultimate-move copy (cinematic plays + auto-revert),
// (D) COEXISTENCE with Skill Hunter — the two abilities' state never interferes.
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
async function loadMatch(q) {
  await page.goto(`${base}/index.html?harness=1&${q}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
}
// place the p2 dummy `gap` ahead of the driven p1 + wait until p1 is fully actionable.
async function prepP1Attacker(gap) {
  await waitGrounded("p1");
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}

try {
  // ═══════════════════════════════════════════════════════════════════════
  // A) MARK-ON-CONNECT TRIGGER — Chrollo is the DEFENDER (p2); a real opponent hits him
  // ═══════════════════════════════════════════════════════════════════════
  await loadMatch("p1=batman&p2=chrollo");
  section("A1) a real SPECIAL connecting on Chrollo marks it");
  await prepP1Attacker(96);
  const a1p2 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // Batman Batarang (special projectile)
  await page.waitForFunction(() => window.__harness.beState("p2") !== null, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const mSpec = await page.evaluate(() => window.__harness.beState("p2"));
  check("Batarang connected", (await p2()).health < a1p2, `−${(a1p2 - (await p2()).health).toFixed(0)}`);
  check("special marked (isUltimate:false)", mSpec?.rosterKey === "batman" && mSpec?.isUltimate === false, `mark=${JSON.stringify(mSpec)}`);

  section("A2) a freeze-cinematic ULTIMATE connecting on Chrollo marks it (isUltimate:true) — Stage-5 watcher");
  await prepP1Attacker(150);
  await page.evaluate(() => window.__harness.fillEnergy());   // Batman needs full Gadget meter for The Dark Knight
  const a2p2 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");   // Batman ULTIMATE (freeze cinematic)
  await page.waitForFunction(() => window.__harness.edoBackup.innerCineActive(), null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => !window.__harness.edoBackup.innerCineActive(), null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(3);
  const mUlt = await page.evaluate(() => window.__harness.beState("p2"));
  check("Dark Knight ult connected on Chrollo (~180 = 300×0.60)", (a2p2 - (await p2()).health) >= 170, `−${(a2p2 - (await p2()).health).toFixed(0)}`);
  check("ULTIMATE marked via the cinematic watcher (isUltimate:true)", mUlt?.rosterKey === "batman" && mUlt?.isUltimate === true, `mark=${JSON.stringify(mUlt)}`);

  // ═══════════════════════════════════════════════════════════════════════
  // B) SPECIAL-MOVE COPY — HP cost + single-use consumption (Chrollo is the ATTACKER, p1)
  // ═══════════════════════════════════════════════════════════════════════
  await loadMatch("p1=chrollo&p2=batman");
  section("B) special copy — fires + connects, costs 15% HP, mark is single-use");
  await prepP1Attacker(120);
  await page.evaluate(() => window.__harness.forceBeMark({ rosterKey: "batman", isUltimate: false, dir: null, moveName: "batman_batarang", displayName: "Batman" }, "p1"));
  await waitFrames(2);
  const bHp0 = (await p1()).health, bP2 = (await p2()).health;
  const bFire = await page.evaluate(() => window.__harness.beActivate("p1"));
  await page.waitForFunction(() => { const b = window.__harness.beActive("p1"); return !b.active && b.rosterKey === "chrollo"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(18);
  check("copied special fired", bFire.fired === true, `fired=${bFire.fired}`);
  check("copied special connected on the dummy", (await p2()).health < bP2, `−${(bP2 - (await p2()).health).toFixed(0)}`);
  check("HP blood price paid (~162)", Math.abs((bHp0 - (await p1()).health) - 162) <= 2, `Δhp=${(bHp0 - (await p1()).health).toFixed(0)}`);
  check("mark consumed", (await page.evaluate(() => window.__harness.beState("p1"))) === null, "");
  const bRetry = await page.evaluate(() => window.__harness.beActivate("p1"));
  check("single-use — a 2nd activation does NOT fire", bRetry.fired === false && bRetry.hadMark === false, `retry=${JSON.stringify({ fired: bRetry.fired, hadMark: bRetry.hadMark })}`);

  // ═══════════════════════════════════════════════════════════════════════
  // C) ULTIMATE-MOVE COPY — cinematic plays + auto-reverts (Chrollo is the ATTACKER, p1)
  // ═══════════════════════════════════════════════════════════════════════
  section("C) ultimate copy — Batman's cinematic ult plays, deals its guaranteed damage, then auto-reverts");
  await prepP1Attacker(150);
  await page.evaluate(() => window.__harness.forceBeMark({ rosterKey: "batman", isUltimate: true, dir: null, moveName: "batman_darkknight", displayName: "Batman" }, "p1"));
  await waitFrames(2);
  const cHp0 = (await p1()).health, cP2 = (await p2()).health;
  const cFire = await page.evaluate(() => window.__harness.beActivate("p1"));
  const cSawCine = await page.waitForFunction(() => window.__harness.edoBackup.innerCineActive(), null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  await page.waitForFunction(() => { const b = window.__harness.beActive("p1"); return !b.active && b.rosterKey === "chrollo"; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(10);
  check("copied ultimate fired", cFire.fired === true, `fired=${cFire.fired}`);
  check("a freeze cinematic played", cSawCine, `cine=${cSawCine}`);
  check("copied ult dealt its guaranteed damage (~180 = 300×0.60)", (cP2 - (await p2()).health) >= 170, `−${(cP2 - (await p2()).health).toFixed(0)}`);
  check("HP blood price paid (~162)", Math.abs((cHp0 - (await p1()).health) - 162) <= 2, `Δhp=${(cHp0 - (await p1()).health).toFixed(0)}`);
  check("auto-reverted to Chrollo", (await page.evaluate(() => window.__harness.beActive("p1")))?.rosterKey === "chrollo", "");

  // ═══════════════════════════════════════════════════════════════════════
  // D) COEXISTENCE WITH SKILL HUNTER — the two abilities' state is fully independent
  // ═══════════════════════════════════════════════════════════════════════
  section("D) coexistence — Skill Hunter (_sh*) and Bandit's Echo (_be*) never interfere");
  await prepP1Attacker(120);
  // both armed at once
  await page.evaluate(() => { window.__harness.forceBeMark({ rosterKey: "batman", isUltimate: false, dir: null, moveName: "batman_batarang", displayName: "Batman" }, "p1"); window.__harness.forceChrolloUnlock("p1"); });
  await waitFrames(1);
  const bothMark = await page.evaluate(() => window.__harness.beState("p1"));
  const bothSh = await page.evaluate(() => window.__harness.shState("p1"));
  check("both abilities armed simultaneously (mark + Skill Hunter unlock)", !!bothMark && bothSh.unlocked === true, `mark=${!!bothMark} shUnlocked=${bothSh.unlocked}`);
  // firing Bandit's Echo consumes ITS mark but must NOT touch Skill Hunter's unlock
  await page.evaluate(() => window.__harness.beActivate("p1"));
  await page.waitForFunction(() => { const b = window.__harness.beActive("p1"); return !b.active && b.rosterKey === "chrollo"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const afterEchoSh = await page.evaluate(() => window.__harness.shState("p1"));
  check("Echo firing consumed its mark", (await page.evaluate(() => window.__harness.beState("p1"))) === null, "");
  check("Skill Hunter unlock UNAFFECTED by Echo firing", afterEchoSh.unlocked === true, `shUnlocked=${afterEchoSh.unlocked}`);
  // conversely: driving Skill Hunter's real swap+revert engine must NOT touch the Echo mark
  await prepP1Attacker(120);
  await page.evaluate(() => window.__harness.forceBeMark({ rosterKey: "superman", isUltimate: false, dir: null, moveName: "heatVision", displayName: "Superman" }, "p1"));
  const eng = await page.evaluate(() => window.__harness.chrolloEngineCheck("rengoku", "p1"));
  const markThroughSh = await page.evaluate(() => window.__harness.beState("p1"));
  check("Skill Hunter engine swapped + reverted cleanly (→ chrollo)", eng?.during === "rengoku" && eng?.after === "chrollo", `eng=${JSON.stringify(eng)}`);
  check("Echo mark SURVIVED a full Skill Hunter swap+revert (untouched)", markThroughSh?.rosterKey === "superman", `mark=${JSON.stringify(markThroughSh)}`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(52)}\n  CHROLLO Bandit's Echo (consolidated): ${PASS} passed, ${FAIL} failed\n${"═".repeat(52)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
