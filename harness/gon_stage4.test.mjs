// harness/gon_stage4.test.mjs — Gon Stage 4: ADULT FORM + the match-ending SUDDEN-DEATH ("Final Blow").
// Proves: activation cinematic → movement lockout (no jump / no dash / lumber) → energy drain → and the
// novel match-override: a CLEAN sudden-death hit = INSTANT WIN (even at 0-0), a WHIFF = INSTANT LOSS
// (even while Gon LEADS on rounds). Plus: the sudden-death is NOT reachable outside Adult Form.
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
const adult = (who = "p1") => page.evaluate(w => window.__harness.gonAdultForm(w), who);
const cine = () => page.evaluate(() => window.__harness.adultFormCine());
const flow = () => page.evaluate(() => window.__harness.matchFlow());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function reboot() { await page.evaluate(() => window.__harness.boot()); await waitFrames(6); await waitGrounded(); }

// Trigger Adult Form and wait out the activation cinematic; returns the post-cinematic form state.
async function enterAdultForm() {
  await page.evaluate(() => window.__harness.fillEnergy());
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await waitFrames(3);
  const during = await cine();
  await page.waitForFunction(() => !window.__harness.adultFormCine().active, null, { timeout: 12000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  return { during, form: await adult() };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await reboot();

  // ── registration ──
  section("registration");
  const reg = await p1();
  check("Gon is p1", (reg.key || "").toLowerCase() === "gon", reg.key);

  // ── sudden-death is NOT reachable outside Adult Form ──
  section("sudden-death gated to Adult Form");
  await page.evaluate(() => window.__harness.fillEnergy());
  await tapKey("l");                             // neutral SPECIAL outside the form = Jajanken ROCK, not sudden-death
  await waitFrames(4);
  const outside = await adult();
  check("no sudden-death armed outside form", outside.suddenDeathWatch === false, `watch=${outside.suddenDeathWatch}`);
  check("Special outside form = Jajanken (not Final Blow)", outside.action !== "finalblow", `action=${outside.action}`);
  check("match still live (no override from a normal special)", (await flow()).victoryActive === false, "");
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await waitGrounded();

  // ── ACTIVATION + MOVEMENT LOCKOUT ──
  section("Adult Form activation + movement lockout");
  const act = await enterAdultForm();
  check("activation cinematic played", act.during.active === true || act.during.frame > 0, `cine=${JSON.stringify(act.during)}`);
  check("Adult Form is active", act.form.active === true, `active=${act.form.active} form=${act.form.currentForm}`);
  check("cannot jump (canJump=false)", act.form.canJump === false, `canJump=${act.form.canJump}`);
  check("cannot dash (noDash=true)", act.form.noDash === true, `noDash=${act.form.noDash}`);
  check("lumber speed (walk clamped down)", act.form.speed === 40, `speed=${act.form.speed}`);
  await page.screenshot({ path: path.join(OUT, "gon_s4_adultform_active.png") });

  // Behavioral lockout: hold JUMP → must stay grounded; double-tap dash → no dash burst.
  const g0 = await adult();
  await page.keyboard.down("w"); await waitFrames(10);
  const jumpTry = await adult();
  await page.keyboard.up("w"); await waitFrames(4);
  check("jump input leaves Gon grounded", jumpTry.onGround === true && Math.abs(jumpTry.vy) < 1.5, `onGround=${jumpTry.onGround} vy=${jumpTry.vy?.toFixed?.(2)}`);
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(1);
  await page.keyboard.down("d"); await waitFrames(3);
  const dashTry = await adult();
  await page.keyboard.up("d"); await waitFrames(4);
  check("dash input produces no dash burst (walk-speed only)", Math.abs(dashTry.vy) < 1.5, `vy=${dashTry.vy?.toFixed?.(2)}`);

  // ── SUDDEN-DEATH HIT → INSTANT WIN (at 0-0, bypassing roundWins) ──
  section("sudden-death HIT → instant WIN (roundWins 0-0)");
  await page.evaluate(() => window.__harness.setRoundWins(0, 0));
  await page.evaluate(() => window.__harness.healP2());
  await page.evaluate(() => window.__harness.setP2Invuln(0));
  const gp = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), gp.x + 34);   // IN range → clean connect
  await waitFrames(2);
  const scoreBefore = await flow();
  check("round score is 0-0 before the finisher", scoreBefore.roundWins.p1 === 0 && scoreBefore.roundWins.p2 === 0, JSON.stringify(scoreBefore.roundWins));
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.matchFlow().victoryActive === true, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const win = await flow();
  check("Final Blow connected → match ended", win.victoryActive === true, `victoryActive=${win.victoryActive}`);
  check("winner is Gon (p1) despite 0-0 round score", win.winnerSide === "p1", `winnerSide=${win.winnerSide} rounds=${JSON.stringify(win.roundWins)}`);
  check("gameState = victory", win.gameState === "victory", `gameState=${win.gameState}`);
  await waitFrames(80);   // let the victory screen fade in before the shot
  await page.screenshot({ path: path.join(OUT, "gon_s4_suddendeath_WIN.png") });

  // ── SUDDEN-DEATH WHIFF → INSTANT LOSS (while Gon LEADS on rounds) ──
  section("sudden-death WHIFF → instant LOSS (Gon leading 1-0)");
  await reboot();
  await page.evaluate(() => window.__harness.setRoundWins(1, 0));    // Gon is AHEAD — the override must ignore this
  const act2 = await enterAdultForm();
  check("Adult Form re-activated for the loss branch", act2.form.active === true, `active=${act2.form.active}`);
  await page.evaluate(() => window.__harness.setP2Invuln(600));       // ensure it CANNOT connect
  const gp2 = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), gp2.x + 380);  // OUT of range → guaranteed whiff
  await waitFrames(2);
  const leadBefore = await flow();
  check("Gon leads 1-0 before the finisher", leadBefore.roundWins.p1 === 1 && leadBefore.roundWins.p2 === 0, JSON.stringify(leadBefore.roundWins));
  await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l");
  // Capture the Final Blow strike + prove it resolves to the real finalblow sheet (no fallback box).
  const strike = await adult();
  check("Final Blow plays the finalblow sprite (not a fallback box)", strike.action === "finalblow", `action=${strike.action}`);
  const strikeSheet = await page.evaluate(() => window.__harness.p1().spriteSheet || "");
  check("finalblow resolves to gon_finalblow_uniform.png", /gon_finalblow_uniform\.png$/.test(strikeSheet), strikeSheet);
  await page.screenshot({ path: path.join(OUT, "gon_s4_finalblow_strike.png") });
  await page.waitForFunction(() => window.__harness.matchFlow().victoryActive === true, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const loss = await flow();
  check("Final Blow whiffed → match ended", loss.victoryActive === true, `victoryActive=${loss.victoryActive}`);
  check("winner is the OPPONENT (p2) despite Gon leading 1-0", loss.winnerSide === "p2", `winnerSide=${loss.winnerSide} rounds=${JSON.stringify(loss.roundWins)}`);
  check("gameState = victory", loss.gameState === "victory", `gameState=${loss.gameState}`);
  await waitFrames(80);   // let the victory screen fade in before the shot
  await page.screenshot({ path: path.join(OUT, "gon_s4_suddendeath_LOSS.png") });

  // ── override independence sanity: it fired with NEITHER player at 2 wins in BOTH branches ──
  section("override independence");
  check("WIN fired with neither side at 2 round wins", win.roundWins.p1 < 2 && win.roundWins.p2 < 2, JSON.stringify(win.roundWins));
  check("LOSS fired with neither side at 2 round wins", loss.roundWins.p1 < 2 && loss.roundWins.p2 < 2, JSON.stringify(loss.roundWins));

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("EXCEPTION", e);
  FAIL++;
} finally {
  console.log(`\n──────────────\n  ${PASS} passed, ${FAIL} failed\n`);
  await browser.close();
  server.close();
  process.exit(FAIL ? 1 : 0);
}
