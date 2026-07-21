// ─────────────────────────────────────────────────────────────────────────────
// SHARED Dragon Ball transformation cue (dragon_ball_transformation.mp3).
// Extracted from an inline hardcoded call in ssjRoseCinematic.js into a shared
// SoundManager.playDragonBallTransformSfx() helper, then wired into BOTH:
//   • Goku Black → SSJ Rose (ssjRoseCinematic.js)
//   • Goku       → SSJ Blue / any transform step (executeGokuUltimate)   [pure addition — had no audio]
// This test spies on sound.playSfxFile (via __harness.__sound) and asserts the cue
// fires for those two transforms and NOT for other characters / non-transform actions.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const DB_SFX = "dragon_ball_transformation.mp3";

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(REPO, u === "/" ? "/index.html" : u);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
    res.end(d);
  });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const p1 = () => page.evaluate(() => window.__harness.p1());

// Load a fresh match for character `who` as P1, install the SFX spy, boot into battle.
async function load(who) {
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=${who}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  // Spy: wrap playSfxFile on the live SoundManager singleton so we record EVERY file cue
  // requested, regardless of mute/gesture state (the wrapper records before delegating).
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = [];
    if (!s._sfxSpyInstalled) {
      const orig = s.playSfxFile.bind(s);
      s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); };
      s._sfxSpyInstalled = true;
    }
  });
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
}
const sfxLog   = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const has = (log, name) => log.some(f => f.includes(name));

const pressUlt = async () => { await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); await wf(3); };

try {
  // ── 1. Goku Black → SSJ Rose fires the shared cue ─────────────────────────
  section("Goku Black → SSJ Rose transform");
  await load("goku_black");
  await clearSfx();
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p");
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const roseLog = await sfxLog();
  check("SSJ Rose transform fires the shared DB transform cue", has(roseLog, DB_SFX), `sfx=[${roseLog.join(", ")}]`);
  check("SSJ Rose actually transformed", (await p1()).currentForm === "ssjRose", `form=${(await p1()).currentForm}`);

  // ── 1b. control: a NON-transform Goku Black action does NOT fire it ────────
  await clearSfx();
  await page.evaluate(() => window.__harness.setEnergy(200));
  // Kamehameha (D→F + Special) — a special, not a transform
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  await page.keyboard.down("s"); await wf(2); await page.keyboard.up("s");
  await page.keyboard.down("d"); await wf(2); await page.keyboard.up("d");
  await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
  await wf(10);
  const kameLog = await sfxLog();
  check("a NON-transform action (Kamehameha) does NOT fire the cue", !has(kameLog, DB_SFX), `sfx=[${kameLog.join(", ")}]`);

  // ── 2. Goku → SSJ Blue fires the shared cue (pure addition; had no audio) ──
  section("Goku → SSJ Blue transform");
  await load("goku");
  // Climb the transform ladder base→ssj1→ssj2→ssj3 (the cue fires on each step)…
  let form = null;
  for (let i = 0; i < 6; i++) {
    form = (await p1()).currentForm;
    if (form === "ssj3" || form === "ssblue") break;
    await page.evaluate(() => window.__harness.resetUlt?.());
    await pressUlt();
  }
  // …then isolate the SSJ BLUE step: clear the log, do exactly one more transform.
  await clearSfx();
  await page.evaluate(() => window.__harness.resetUlt?.());
  await pressUlt();
  const blueForm = (await p1()).currentForm;
  const blueLog = await sfxLog();
  check("Goku reached SSJ Blue via his ultimate", blueForm === "ssblue", `form=${blueForm}`);
  check("SSJ Blue transform fires the shared DB transform cue", has(blueLog, DB_SFX), `sfx=[${blueLog.join(", ")}]`);

  // ── 3. control: another character's transformation does NOT fire it ────────
  section("Naruto → Sage Mode (different character) must NOT fire the cue");
  await load("naruto");
  await clearSfx();
  await page.evaluate(() => window.__harness.fillEnergy?.());
  const nE0 = (await p1()).energy;
  await pressUlt(); await pressUlt();   // trigger Naruto's ultimate (Sage Mode) — routed via executeNarutoUltimate
  await wf(10);
  const narutoLog = await sfxLog();
  const nE1 = (await p1()).energy;
  check("Naruto's ultimate actually fired (energy spent)", nE1 < nE0, `energy ${nE0.toFixed(0)} → ${nE1.toFixed(0)}`);
  check("Naruto's transformation does NOT fire the DB transform cue", !has(narutoLog, DB_SFX), `sfx=[${narutoLog.join(", ")}]`);

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  SHARED Dragon Ball transform cue: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
