// harness/kakashi_stage8.mjs
// STAGE 8 evidence: ULTIMATE DESIGNATION (owner decision — RAIKIRI is the formal Ultimate; NIN-DOGS stays a
// top-tier SPECIAL, NOT a second ultimate). This stage verifies the designation is COHERENT:
//   (1) meta: charDef.ultimate = "Raikiri" (100); Nin-Dogs lives in `specials`, not `ultimate`.
//   (2) the ULTIMATE BUTTON fires Raikiri (charge pose) — NOT Nin-Dogs.
//   (3) Fwd+SPECIAL fires Nin-Dogs (its own cast) — NOT the ultimate.
//   (4) DISTINCT COMMITMENT: Raikiri = the ult — a GUARANTEED ~198 EFF sure-hit from OUT OF RANGE (100 chakra);
//       Nin-Dogs = a special — a rushing pack that must travel (40 chakra), NOT an instant range-independent nuke.
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
const summons = () => page.evaluate(() => window.__harness.summons());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) { await waitGrounded(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setMangekyou?.(false); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await waitFrames(2); }
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const fireUlt = () => page.evaluate(() => window.__harness.p1Ultimate());

try {
  await page.goto(`${base}/index.html?harness=1&p1=kakashi&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const def = await page.evaluate(() => window.__harness.charDef("kakashi"));

  console.log("\n── (1) META: Raikiri is the formal ULTIMATE; Nin-Dogs is a SPECIAL (not a 2nd ult) ──");
  check("ultimate designated = Raikiri", def.ultimate?.name === "Raikiri", `ultimate=${def.ultimate?.name}`);
  check("ultimate cost = 100 (full meter)", def.ultimate?.cost === 100, `cost=${def.ultimate?.cost}`);
  check("Nin-Dogs lives in specials (a top-tier special, NOT the ultimate)", !!def.specials?.ninDogs && def.specials.ninDogs.subtype === "summon", `ninDogs=${JSON.stringify(def.specials?.ninDogs || null)}`);
  check("Nin-Dogs is NOT named the ultimate", (def.ultimate?.name || "").toLowerCase().indexOf("dog") === -1, `ultimate=${def.ultimate?.name}`);
  check("Pakkun + Weapon Throw also remain specials", !!def.specials?.pakkun && !!def.specials?.weaponThrow, `specials=${Object.keys(def.specials || {}).join(",")}`);

  console.log("\n── (2) the ULTIMATE BUTTON fires Raikiri (NOT Nin-Dogs) ──");
  await prep(200);
  const e0 = (await p1()).energy;
  const u = await fireUlt();
  check("ultimate button → Raikiri charge pose", (u?.castMove || "") === "kakashiRaikiriCharge", `castMove=${u?.castMove}`);
  check("ultimate button does NOT summon the Nin-Dogs pack", !(await summons()).some(s => s.id === "kakashiNinDogs"), "");
  await waitFrames(2);
  check("ultimate spends 100 chakra (full-meter finisher)", e0 - (await p1()).energy >= 95, `Δ=${(e0 - (await p1()).energy).toFixed(0)}`);
  await waitFrames(50); await waitGrounded();

  console.log("\n── (3) Fwd+SPECIAL fires Nin-Dogs (a SPECIAL) — NOT the ultimate ──");
  await prep(120);
  const se0 = (await p1()).energy;
  const nd = await fireDir("F");
  check("Fwd+Special → Nin-Dogs cast (kakashiNinDogsCast)", (nd?.cast || "") === "kakashiNinDogsCast", `cast=${nd?.cast}`);
  check("Nin-Dogs did NOT play the Raikiri ult pose", (nd?.cast || "") !== "kakashiRaikiriCharge", `cast=${nd?.cast}`);
  await waitFrames(2);
  const ndSpent = se0 - (await p1()).energy;
  check("Nin-Dogs costs a SPECIAL price (~40), not the ult's 100", ndSpent >= 34 && ndSpent < 80, `Δ=${ndSpent.toFixed(0)}`);
  await waitFrames(60); await waitGrounded();

  console.log("\n── (4) DISTINCT COMMITMENT: Raikiri = guaranteed sure-hit from range; Nin-Dogs = rushing pack ──");
  // Raikiri from WAY out of range → still lands ~198 (guaranteed, range-independent = the ult finisher)
  await prep(240);
  let h0 = (await p2()).health;
  await fireUlt();
  let peak = 0; for (let f = 0; f < 60; f++) { peak = Math.max(peak, (await p2()).health < h0 ? 999 : 0); await waitFrames(1); }
  const raikiriFar = h0 - (await p2()).health;
  check(`Raikiri (ULT) is a GUARANTEED sure-hit from far range (~198; 150–240)`, raikiriFar >= 150 && raikiriFar <= 240, `dealt=${raikiriFar.toFixed(0)}`);
  await waitFrames(20); await waitGrounded();
  // Nin-Dogs from the SAME far range → the pack has to travel; it is NOT an instant range-independent 198 nuke
  await prep(240);
  h0 = (await p2()).health;
  await fireDir("F");
  await waitFrames(6);
  const ndImmediate = h0 - (await p2()).health;
  check(`Nin-Dogs (SPECIAL) is NOT an instant range-independent ~198 nuke (immediate dmg ${ndImmediate.toFixed(0)} < 150)`, ndImmediate < 150, `immediate=${ndImmediate.toFixed(0)}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 8", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
