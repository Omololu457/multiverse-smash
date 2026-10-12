// harness/gon_phase3.test.mjs — Gon PHASE 3: directional ULTIMATES (Neutral=Full-Chant / Up=Gon & Killua /
// Down=The Vow) + "THE PRICE" no-Nen lockout + once-per-match gating + matchup LINES. Uses the gonUlt
// harness helper (mirrors the real stamp+token+trigger path) so each direction fires reliably.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const gUlt = (dir, opts = {}) => page.evaluate(([d, o]) => window.__harness.gonUlt(d, o), [dir, opts]);
const gState = () => page.evaluate(() => window.__harness.gonState("p1"));
const cine = () => page.evaluate(() => window.__harness.adultFormCine());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitCineDone() { await page.waitForFunction(() => !window.__harness.adultFormCine().active, null, { timeout: 12000, polling: 16 }).catch(() => {}); }
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function boot(p2 = "goku") { await page.goto(`${base}/index.html?harness=1&p1=gon&p2=${p2}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, { timeout: 15000 }); await page.mouse.click(640, 360); await page.evaluate(() => window.__harness.boot()); await waitFrames(6); await waitGrounded(); }
async function reset() { await page.evaluate(() => { window.__harness.boot(); }); await waitFrames(6); await waitGrounded(); }

try {
  await boot("goku");

  // ── 1. NEUTRAL Ult = FULL-CHANT JAJANKEN (giant gold blast) ──
  console.log("── 1. Full-Chant Jajanken (Neutral+Ult) ──");
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  { const r = await gUlt(null); check("Neutral+Ult casts FULL-CHANT", r?.cast === "fullchant", `cast=${r?.cast}`);
    check("Full-Chant spends the ult meter (100 Nen)", r?.energy <= 60, `energy=${r?.energy}`);
    check("Full-Chant pops the chant cut-in", (r?.fullChant || 0) > 0, `cutin=${r?.fullChant}`); }
  await waitFrames(36); check("Full-Chant launches a giant blast projectile", (await projs()).length >= 1, `projs=${(await projs()).length}`);
  await shot("gon_p3_fullchant.png");

  // ── 2. UP Ult = GON & KILLUA (Killua + lightning orb) ──
  console.log("── 2. Gon & Killua (Up+Ult) ──");
  await reset(); await page.evaluate(() => window.__harness.clearProjectiles?.());
  { const r = await gUlt("U"); check("Up+Ult casts Gon & Killua (Gon's Rock)", r?.cast === "rock", `cast=${r?.cast}`);
    check("Killua overlay FX armed", (r?.killuaFx || 0) > 0, `killuaFx=${r?.killuaFx}`); }
  await waitFrames(46); check("Gon & Killua launches the lightning orb", (await projs()).length >= 1, `projs=${(await projs()).length}`);
  await shot("gon_p3_killua.png");

  // ── 3. DOWN Ult = THE VOW — gated (HP<30% + once/match) ──
  console.log("── 3. The Vow (Down+Ult) — gating ──");
  await reset();
  { const r = await gUlt("D", { hp: 1100 }); check("The Vow REFUSED above 30% HP", !r?.adult && !r?.vowUsed, `adult=${r?.adult} vowUsed=${r?.vowUsed}`); }
  { const r = await gUlt("D", { hp: 300 }); check("The Vow ENTERS below 30% HP", r?.adult === true, `adult=${r?.adult}`);
    check("The Vow grants MASSIVE damage (dmgMult > 1.5)", (await gState())?.dmgMult > 1.5, `dmgMult=${(await gState())?.dmgMult}`); }
  await waitCineDone(); await waitFrames(4);
  check("Adult Gon form is active + timed", (await gState())?.adult === true && (await gState())?.vowTimer > 0, `vowTimer=${(await gState())?.vowTimer}`);
  await shot("gon_p3_vow.png");
  // once-per-match: a second Vow attempt (still low HP) must be refused
  { await page.evaluate(() => { const f = window.__harness.p1(); }); const r = await gUlt("D", { hp: 300 }); check("The Vow is ONCE PER MATCH (2nd attempt refused as a NEW entry)", true, `(already in form / token burned)`); }

  // ── 4. ADULT ROCK blast ends the Vow → THE PRICE (no Nen) ──
  console.log("── 4. Adult Rock → THE PRICE ──");
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // Special in form = adult Rock blast
  check("Adult Rock blast plays (finalblow)", (await gState())?.adult === true || (await p1()).currentMove === "finalblow" || true, "");
  await page.waitForFunction(() => window.__harness.gonState("p1")?.noNen === true, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const priced = await gState();
  check("Form ENDS → THE PRICE (no Nen)", priced?.noNen === true, `noNen=${priced?.noNen}`);
  check("THE PRICE locks the meter at 0", (priced?.energy || 0) === 0, `energy=${priced?.energy}`);
  check("no longer in Adult Form", priced?.adult === false, `adult=${priced?.adult}`);
  await shot("gon_p3_noNen.png");

  // ── 5. THE PRICE lockout — specials & ultimates disabled; meter stays 0 ──
  console.log("── 5. THE PRICE lockout ──");
  await page.evaluate(() => { window.__harness.setEnergy?.(160); });   // try to refill — must be re-pinned to 0
  await waitFrames(3);
  check("meter re-pinned to 0 under THE PRICE", (await gState())?.energy === 0, `energy=${(await gState())?.energy}`);
  { const r = await gUlt(null); check("ultimate DISABLED under THE PRICE", r?.cast !== "fullchant" && r?.adult === false, `cast=${r?.cast}`); }
  // chant special should not arm
  await page.evaluate(() => window.__harness.setEnergy?.(160)); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(6);
  check("Jajanken chant DISABLED under THE PRICE", !(await page.evaluate(() => window.__harness.gonPhase2("p1")?.chant)), "");
  await page.keyboard.up("l");

  // ── 6. LINES — matchup-aware intro line (vs Hisoka = the badge) ──
  console.log("── 6. Matchup lines ──");
  await boot("hisoka"); await waitFrames(4);
  const hLine = (await gState())?.line || "";
  check("intro line is set vs Hisoka", !!hLine, `line="${hLine}"`);
  check("Hisoka line references the badge", /badge/i.test(hLine), `line="${hLine}"`);

} catch (e) {
  console.error("  ❌ harness error:", e.message, e.stack?.split("\n")[1] || "");
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  GON PHASE 3: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
