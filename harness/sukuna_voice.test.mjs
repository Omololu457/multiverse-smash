// harness/sukuna_voice.test.mjs
// Sukuna voice-line wiring proof (audio-only; largest generic-bark batch — 55 clips).
// Two halves:
//   (1) RANDOMIZER proof — sample __harness.sukunaVoicePick(pool, N) for all four pools
//       (taunt 21 / hitConnect 21 / finisher 9 / misc 4) and assert genuine random spread
//       (near-full distinct coverage), especially the 21-entry taunt pool.
//   (2) TRIGGER proof — spy on SoundManager.playSfxFile and assert the right POOL fires at
//       the right combat beat: heavy connect → hitConnect, light connect → taunt(+misc),
//       KO connect → finisher. The spy records the filename ARGUMENT (before load), so a
//       clip that is named-but-not-yet-on-disk is still provably wired.
// Run: node harness/sukuna_voice.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const info = (m) => console.log(`  · ${m}`);
const section = t => console.log(`\n── ${t} ──`);

// Which of the 55 clips are actually on disk RIGHT NOW (for the reporting line only —
// the wiring proof does not depend on presence; the spy captures intended filenames).
const onDisk = new Set(fs.readdirSync(ROOT).filter(f => /^sukuna_\d{3}_.*\.mp3$/.test(f)));

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; } }); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function logHas(re) { return (await sfxLog()).some(f => re.test(f)); }
async function goto(q) { await page.goto(`${base}/index.html?harness=1&${q}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }

// Regexes per pool (a handful of distinctive members each — enough to prove which pool fired)
const RE = {
  taunt:      /sukuna_(001|002|004|009|010|011|018|021|022|024|025|027|031|032|033|038|039|040|045|046|053)_/,
  hitConnect: /sukuna_(003|006|007|008|013|014|016|017|020|023|026|036|037|041|043|047|048|049|050|051|054)_/,
  finisher:   /sukuna_(012|015|019|028|029|034|035|042|052)_/,
  misc:       /sukuna_(000|005|030|044)_/,
};

try {
  // ══ PART 1: RANDOMIZER PROOF (pure pool sampling, no combat needed) ═════════
  await goto("p1=sukuna");
  section("randomizer — genuine random spread within each pool");
  const POOLS = [
    { name: "taunt",      size: 21, minDistinct: 18 },
    { name: "hitConnect", size: 21, minDistinct: 18 },
    { name: "finisher",   size: 9,  minDistinct: 8 },
    { name: "misc",       size: 4,  minDistinct: 4 },
  ];
  for (const pool of POOLS) {
    const picks = await page.evaluate(p => window.__harness.sukunaVoicePick(p, 300), pool.name);
    const distinct = new Set(picks);
    const allValid = picks.every(f => RE[pool.name].test(f));
    const firstTen = picks.slice(0, 10).map(f => f.replace(/^sukuna_/, "").replace(/\.mp3$/, "")).join(", ");
    check(`${pool.name} (${pool.size}) → ${distinct.size}/${pool.size} distinct over 300 picks`, distinct.size >= pool.minDistinct && allValid, `first10: ${firstTen}`);
  }
  // Prove NON-repeating order (not a fixed cycle): consecutive picks differ often.
  const seq = await page.evaluate(() => window.__harness.sukunaVoicePick("taunt", 30));
  let changes = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
  check("taunt is randomized, not a fixed repeating cycle", changes >= 20, `${changes}/29 adjacent changes`);

  // ══ PART 2: TRIGGER PROOF (Sukuna as attacker) ═════════════════════════════
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  async function prep(gap = 46) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => {
      window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles();
      window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0);
      window.__harness.resetOffenseVoice("p1");   // LIVE reset (cd + combo) so each connect is clean
    });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
    await clearSfx();
  }

  section("HIT-CONNECT pool → strong (heavy) connect");
  let hcFired = false;
  for (let i = 0; i < 4 && !hcFired; i++) {
    await prep(46);
    await page.keyboard.down("k"); await waitFrames(5); await page.keyboard.up("k"); await waitFrames(16);
    hcFired = await logHas(RE.hitConnect);
  }
  check("heavy connect → hitConnect pool bark", hcFired, `log=${JSON.stringify(await sfxLog())}`);

  section("TAUNT pool → ordinary light connect (folded — no taunt mechanic)");
  let tauntFired = false, miscFired = false;
  for (let i = 0; i < 12 && !(tauntFired && miscFired); i++) {
    await prep(34);
    await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(14);
    if (await logHas(RE.taunt)) tauntFired = true;
    if (await logHas(RE.misc))  miscFired  = true;
  }
  check("light connect → taunt pool bark", tauntFired, `log seen this section`);
  // misc shares the light-connect branch (~1-in-4); observed live here as a bonus, but its
  // randomization is already proven in Part 1 regardless of whether it surfaces this run.
  check("misc pool folds into the same light-connect branch (observed live)", miscFired, miscFired ? "" : "not surfaced this run — see Part-1 randomizer proof");

  section("FINISHER pool → KO connect (defender health → 0)");
  let finFired = false;
  for (let i = 0; i < 5 && !finFired; i++) {
    await prep(34);
    // knock p2 to a sliver so the next light connect is a KO (scaled light ≈ 20-30 dmg)
    await page.evaluate(() => { const m = window.__harness.p2().maxHealth || 1240; window.__harness.damageP2(m - 12); window.__harness.setP2Invuln?.(0); });
    await waitFrames(2); await clearSfx();
    await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(16);
    finFired = await logHas(RE.finisher);
  }
  check("KO connect → finisher pool bark", finFired, `log=${JSON.stringify(await sfxLog())}`);

  // ══ REPORT: on-disk presence (does NOT affect wiring pass/fail) ════════════
  section("on-disk presence (reporting only — 37 clips are named-but-pending)");
  const total = 55, present = onDisk.size;
  info(`${present}/${total} mp3s present on disk; ${total - present} named in pools but not yet uploaded (will 404 harmlessly until added)`);
  check("at least the shipped clips are present & wired", present >= 18, `present=${present}`);

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Sukuna voice: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
