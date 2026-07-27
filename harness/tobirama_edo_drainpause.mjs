// harness/tobirama_edo_drainpause.mjs — FIX 1 verification: the Edo Tensei OUTER drain pauses for the
// ENTIRE duration of a nested transformation-style ultimate (not just its activation cinematic), and the
// no-nested baseline window is comfortably usable. Vessel = KILLUA (ultimate = Godspeed, a continuous
// energy-draining transformation buff — no single "cinematic moment" to pause around).
//
// Frame math (60fps):
//   EDO base drain 0.26 − passive regen 0.06 = 0.20/frame net  → full 180 bar ≈ 15s baseline window.
//   Godspeed own drain 0.30 − regen 0.06     = 0.24/frame net.
//   WITH the fix (Edo paused during Godspeed): drain while transformed ≈ 0.24/frame.
//   WITHOUT the fix (drains stacked):          drain while transformed ≈ 0.24 + 0.26 = 0.50/frame.
// So a measured transformed-drain well below 0.40 proves Edo's drain is NOT stacked on top.
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
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
// Measure net energy drain PER FRAME across `n` frames of pure idle (no input).
async function measureDrainPerFrame(n) {
  const e0 = (await p1()).energy;
  await waitFrames(n);
  const e1 = (await p1()).energy;
  return (e0 - e1) / n;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── Reanimate the KILLUA vessel (ultimate = Godspeed transformation buff) ──
  await waitGrounded();
  await page.evaluate(() => { window.__harness.edoBackup.setBackup("killua"); window.__harness.setP1Energy(200); window.__harness.resetUlt(); window.__harness.healP1(); });
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(3);
  await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(2);
  let a = await p1();
  check("reanimated the Killua vessel", a.edoActive && a.key === "killua", `key=${a.key} edoActive=${a.edoActive}`);

  // ── BASELINE (no nested ultimate): a comfortably usable window ──
  section("baseline window (no nested ultimate)");
  await page.evaluate(() => window.__harness.setP1Energy(140));   // mid-bar so regen never clamps the measurement
  const dBase = await measureDrainPerFrame(30);
  const projectedSec = a.maxEnergy / (dBase * 60);
  check("outer Edo drain runs when NOT transformed (~0.20/frame net)", dBase > 0.14 && dBase < 0.26, `${dBase.toFixed(3)}/frame`);
  check("full-bar window is comfortably usable (~15s, not razor-thin, not trivially long)", projectedSec > 12 && projectedSec < 22, `≈${projectedSec.toFixed(1)}s from a full ${a.maxEnergy} bar`);

  // ── activate the nested transformation ultimate (Godspeed) ──
  section("nested transformation ultimate (Godspeed) — outer drain must PAUSE");
  await page.evaluate(() => window.__harness.setP1Energy(180));   // full Killua bar to fund + sustain Godspeed
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
  // Godspeed activation runs a freeze cinematic first; wait for it to end AND the buff to be live.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !window.__harness.edoBackup.innerCineActive() && p.currentForm === "godspeed"; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const g0 = await p1();
  check("Godspeed transformation is live as GAMEPLAY (post-cinematic buff)", g0.currentForm === "godspeed" && g0.edoActive, `form=${g0.currentForm} edoActive=${g0.edoActive}`);

  // Measure the drain WHILE transformed. With the fix this is Godspeed's own ~0.24/frame; the outer Edo
  // 0.26 is paused. Without the fix it would be ~0.50/frame (both stacked).
  const dGod = await measureDrainPerFrame(30);
  const gMid = await p1();
  check("still transformed for the WHOLE measurement (form held, window held)", gMid.currentForm === "godspeed" && gMid.edoActive, `form=${gMid.currentForm} edoActive=${gMid.edoActive}`);
  check("outer Edo drain is PAUSED during the transformation (drain ≈ Godspeed-only, NOT stacked)", dGod < 0.40, `${dGod.toFixed(3)}/frame (stacked would be ≈0.50; Godspeed-only ≈0.24)`);
  check("drain while transformed ≈ Godspeed's own net (~0.24/frame)", dGod > 0.16 && dGod < 0.34, `${dGod.toFixed(3)}/frame`);

  await page.screenshot({ path: path.join(OUT, "tobirama_edo_godspeed_vessel.png") });

  // Godspeed shares the vessel's energy bar, so it can only revert when that bar empties — at which point
  // the Edo window itself correctly ends too (nothing left to fund it). To show the outer drain PAUSE and
  // then RESUME across a revert with energy still in the tank, use a TIMER-based nested ultimate that does
  // NOT drain energy: Itachi's Susanoo. During it, with the outer drain paused, energy should actually RISE
  // (passive regen only) — an unambiguous pause proof — then drain again the instant Susanoo reverts.
  section("pause + resume via a timer-based nested ultimate (Itachi Susanoo — no energy drain)");
  await page.evaluate(() => window.__harness.edoBackup.revert());   // force-end the Killua window (cleanses Godspeed) → back to Tobirama
  await page.waitForFunction(() => window.__harness.p1().key === "tobirama", null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitGrounded();
  await page.evaluate(() => { window.__harness.edoBackup.setBackup("itachi"); window.__harness.setP1Energy(200); window.__harness.resetUlt(); window.__harness.healP1(); });
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(3);
  await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(2);
  const iv = await p1();
  check("reanimated the Itachi vessel", iv.edoActive && iv.key === "itachi", `key=${iv.key} edoActive=${iv.edoActive}`);
  // Fire Susanoo (Itachi's ultimate — timer-based giant, no per-frame energy cost).
  await page.evaluate(() => window.__harness.setP1Energy(180));
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
  await page.waitForFunction(() => !!window.__harness.p1().itachiSusanoo, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.setP1Energy(120));   // known mid-bar so a RISE is measurable
  const sBefore = (await p1()).energy;
  await waitFrames(24);
  const sAfter = await p1();
  check("Susanoo active as the nested ultimate", sAfter.edoActive && sAfter.key === "itachi" && sAfter.itachiSusanoo, `key=${sAfter.key} susanoo=${sAfter.itachiSusanoo}`);
  check("outer Edo drain PAUSED during the timer form (energy RISES on regen — impossible if draining)", sAfter.energy > sBefore, `energy ${sBefore.toFixed(1)} → ${sAfter.energy.toFixed(1)}`);
  // Expire the Susanoo timer → it reverts (energy intact) → the outer Edo drain must resume.
  await page.evaluate(() => window.__harness.edoBackup.expireVesselTimerForm());
  await page.waitForFunction(() => !window.__harness.p1().itachiSusanoo, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.setP1Energy(140));
  const rv = await p1();
  const dResume = (rv.edoActive) ? await measureDrainPerFrame(20) : 0;
  check("Susanoo reverted, still the Edo vessel with the window alive", rv.edoActive && rv.key === "itachi", `edoActive=${rv.edoActive} key=${rv.key}`);
  check("outer Edo drain RESUMES after the nested ultimate reverts (~0.20/frame)", dResume > 0.14 && dResume < 0.26, `${dResume.toFixed(3)}/frame`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Edo Tensei drain-pause (nested transformation): ${PASS} passed, ${FAIL} failed — shot: tobirama_edo_godspeed_vessel.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
