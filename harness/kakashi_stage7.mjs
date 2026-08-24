// harness/kakashi_stage7.mjs
// STAGE 7 evidence: Kakashi's MANGEKYOU SHARINGAN — an activated timed MODE (Item-1 "both").
//   (1) ACTIVATION — Charge (P) hold-release at threshold ignites the mode (_mangekyouActive); the idle
//       SWAPS to the headband-lifted "REPEAT" ready stance.
//   (2) BUFF — while active, normals/Y-combo hit harder (damageMultiplier 1.20).
//   (3) DODGE/READ WINDOW — while active, an incoming MELEE hit is auto-dodged (Sharingan read) at a ki
//       cost, where the SAME hit lands in base form.
//   (4) TIMED — a quick Charge TAP reverts early, restoring base art + clearing the buff/dodge.
// Screenshots → harness/shots/kakashi_stage7_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `kakashi_stage7_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function reset() { await page.evaluate(() => { window.__harness.mangekyouRevert?.(); window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); await waitFrames(2); }
// Center P1 at a fixed arena spot, then put P2 a fixed gap to P1's RIGHT (P1 default-faces right → toward P2).
// Fixed offsets (like absolute_defense.test) keep base vs mangekyou runs identical so hits land the same.
async function place(gap) { await waitGrounded(); const arena = await page.evaluate(() => window.__harness.arena()); const midX = Math.round(arena.left + arena.width * 0.42); await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }
async function chargeRelease(hold = 8) { await page.keyboard.down("p"); await waitFrames(hold); await page.keyboard.up("p"); await waitFrames(3); }
async function p1Light() { await page.keyboard.down("j"); await waitFrames(8); await page.keyboard.up("j"); await waitFrames(16); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kakashi&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── (1) ACTIVATION — Charge (P) hold-release ignites Mangekyou + idle swaps to the ready stance ──");
  check("mangekyou stance sheet exists on disk", fs.existsSync(path.join(ROOT, "kakashi_mangekyou_stance_uniform.png")), "");
  check("ultimate still named Raikiri (mode is separate from ult)", (await page.evaluate(() => window.__harness.charDef("kakashi").ultimate?.name)) === "Raikiri", "");
  await reset();
  await chargeRelease();
  let g = await p1();
  check("Mangekyou ignites (mangekyouActive)", !!g.mangekyouActive, `mangekyouActive=${g.mangekyouActive}`);
  check("currentForm = mangekyou", g.currentForm === "mangekyou", `currentForm=${g.currentForm}`);
  await waitFrames(4); g = await p1(); await shot("stance");
  check("idle SWAPS to the headband-lifted stance (kakashi_mangekyou_stance)", (g.spriteSheet || "").includes("kakashi_mangekyou_stance"), `sheet=${g.spriteSheet}`);

  console.log("\n── (2) BUFF — normals hit harder while active (damageMultiplier 1.20) ──");
  // baseline light
  await reset(); await place(46); let hp0 = (await p2()).health;
  await p1Light();
  const baseLight = hp0 - (await p2()).health;
  // mangekyou light — REAL enter (buff mults applied)
  await reset();
  await page.evaluate(() => window.__harness.mangekyouEnter());
  await place(46); hp0 = (await p2()).health;
  const dm = (await p1()).damageMultiplier;
  await p1Light();
  const mkLight = hp0 - (await p2()).health;
  check(`base light connects`, baseLight > 0, `base=${baseLight}`);
  check(`Mangekyou sets the offensive buff (damageMultiplier ${dm})`, dm > 1.1, `dm=${dm}`);
  check(`Mangekyou buffs the light normal (base ${baseLight.toFixed(0)} → mangekyou ${mkLight.toFixed(0)})`, mkLight > baseLight + 1, `base=${baseLight} mk=${mkLight}`);

  console.log("\n── (3) DODGE/READ WINDOW — incoming melee is auto-dodged while active (lands in base form) ──");
  // baseline: base P1 takes the P2 swing
  await reset(); await place(48); let ph0 = (await p1()).health;
  await page.evaluate(() => window.__harness.p2Attack()); await waitFrames(20);
  const baseTaken = ph0 - (await p1()).health;
  check(`base Kakashi TAKES the P2 melee (dmg ${baseTaken.toFixed(0)})`, baseTaken > 0, `taken=${baseTaken}`);
  // mangekyou: P1 dodges the SAME swing (no damage where base took it), spends ki
  await reset(); await page.evaluate(() => window.__harness.mangekyouEnter()); await place(48);
  ph0 = (await p1()).health; const pe0 = (await p1()).energy;
  await page.evaluate(() => window.__harness.p2Attack()); await waitFrames(20);
  const mkTaken = ph0 - (await p1()).health; const eSpent = pe0 - (await p1()).energy;
  await shot("dodge");
  check("Mangekyou Kakashi DODGES the P2 melee (no damage where base took it)", mkTaken <= 0 && baseTaken > 0, `mkTaken=${mkTaken} baseTaken=${baseTaken}`);
  check(`the read/dodge spends ki beyond drain (Δ ${eSpent.toFixed(0)} ≥ dodge cost 10)`, eSpent >= 10, `Δ=${eSpent.toFixed(0)}`);

  console.log("\n── (4) TIMED — a quick Charge TAP reverts early, restoring base art + clearing buff/dodge ──");
  await reset(); await chargeRelease();
  check("active before revert", !!(await p1()).mangekyouActive, "");
  await page.keyboard.press("p"); await waitFrames(4);   // quick TAP = early revert
  const rv = await p1();
  check("Mangekyou reverts on tap (mangekyouActive false)", !rv.mangekyouActive, `mangekyouActive=${rv.mangekyouActive}`);
  check("idle restored to base (not the mangekyou stance)", !(rv.spriteSheet || "").includes("kakashi_mangekyou_stance"), `sheet=${rv.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 7", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
