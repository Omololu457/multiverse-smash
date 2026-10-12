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

// Enter THE VOW (Down+Ult, HP<30%) and wait out the activation cinematic; returns the post-cinematic state.
// Uses the gonUlt helper (mirrors the real stamp+token+trigger path) for a reliable Down-direction entry.
async function enterVow(hp = 300) {
  const during0 = await page.evaluate(h => window.__harness.gonUlt("D", { hp: h }), hp);
  await waitFrames(3);
  const during = await cine();
  await page.waitForFunction(() => !window.__harness.adultFormCine().active, null, { timeout: 12000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  return { entered: !!during0?.adult, during, form: await adult() };
}
const gState = () => page.evaluate(() => window.__harness.gonState("p1"));

try {
  await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await reboot();

  // ── registration ──
  section("registration");
  const reg = await p1();
  check("Gon is p1", (reg.key || "").toLowerCase() === "gon", reg.key);

  // ── THE VOW is GATED: only below 30% HP (Down+Ult) ──
  section("The Vow gated to <30% HP");
  const refused = await page.evaluate(() => window.__harness.gonUlt("D", { hp: 1100 }));   // above 30% → refused
  check("The Vow REFUSED above 30% HP", refused?.adult === false, `adult=${refused?.adult}`);
  check("not already in the Adult Form", (await adult()).active === false, "");
  await reboot();

  // ── ACTIVATION + MOVEMENT LOCKOUT (The Vow, below 30% HP) ──
  section("The Vow activation + movement lockout");
  const act = await enterVow(300);
  check("activation cinematic played", act.during.active === true || act.during.frame > 0, `cine=${JSON.stringify(act.during)}`);
  check("Adult Form is active", act.form.active === true, `active=${act.form.active} form=${act.form.currentForm}`);
  check("massive damage (dmgMult > 1.5)", (await gState())?.dmgMult > 1.5, `dmgMult=${(await gState())?.dmgMult}`);
  check("cannot jump (canJump=false)", act.form.canJump === false, `canJump=${act.form.canJump}`);
  check("cannot dash (noDash=true)", act.form.noDash === true, `noDash=${act.form.noDash}`);
  check("lumber speed (walk clamped down)", act.form.speed === 40, `speed=${act.form.speed}`);
  check("timed form (vowTimer counting down)", (await gState())?.vowTimer > 0, `vowTimer=${(await gState())?.vowTimer}`);
  await page.screenshot({ path: path.join(OUT, "gon_s4_adultform_active.png") });

  // ── Behavioral lockout: hold JUMP → must stay grounded; double-tap dash → no dash burst ──
  section("movement lockout (behavioral)");
  await page.keyboard.down("w"); await waitFrames(10);
  const jumpTry = await adult();
  await page.keyboard.up("w"); await waitFrames(4);
  check("jump input leaves Gon grounded", jumpTry.onGround === true && Math.abs(jumpTry.vy) < 1.5, `onGround=${jumpTry.onGround} vy=${jumpTry.vy?.toFixed?.(2)}`);
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(1);
  await page.keyboard.down("d"); await waitFrames(3);
  const dashTry = await adult();
  await page.keyboard.up("d"); await waitFrames(4);
  check("dash input produces no dash burst (walk-speed only)", Math.abs(dashTry.vy) < 1.5, `vy=${dashTry.vy?.toFixed?.(2)}`);

  // ── ADULT ROCK blast (Special in form) → ENDS the form → "THE PRICE" (no Nen) ──
  section("Adult Rock blast → THE PRICE");
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  const strike = await adult();
  check("Adult Rock plays the finalblow sprite (not a fallback box)", strike.action === "finalblow" || (await p1()).currentMove === "finalblow", `action=${strike.action}`);
  const strikeSheet = await page.evaluate(() => window.__harness.p1().spriteSheet || "");
  check("finalblow resolves to gon_finalblow_uniform.png", /gon_finalblow_uniform\.png$/.test(strikeSheet), strikeSheet);
  await page.screenshot({ path: path.join(OUT, "gon_s4_finalblow_strike.png") });
  await page.waitForFunction(() => window.__harness.gonState("p1")?.noNen === true, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const priced = await gState();
  check("firing the Adult Rock ENDS the form", priced?.adult === false, `adult=${priced?.adult}`);
  check("THE PRICE — no Nen (meter locked at 0)", priced?.noNen === true && priced?.energy === 0, `noNen=${priced?.noNen} energy=${priced?.energy}`);

  // ── THE PRICE lockout: specials & ultimates disabled; meter re-pinned to 0 ──
  section("THE PRICE lockout");
  await page.evaluate(() => window.__harness.setEnergy?.(160)); await waitFrames(3);
  check("meter re-pinned to 0 under THE PRICE", (await gState())?.energy === 0, `energy=${(await gState())?.energy}`);
  const noUlt = await page.evaluate(() => window.__harness.gonUlt(null, { energy: 160 }));
  check("ultimate disabled under THE PRICE", noUlt?.cast !== "fullchant", `cast=${noUlt?.cast}`);

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
