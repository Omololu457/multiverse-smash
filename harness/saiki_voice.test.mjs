// harness/saiki_voice.test.mjs
// Saiki Kusuo voice-line wiring proof (audio-only; 12 English-dub deadpan taunts).
// Three parts:
//   (1) RANDOMIZER proof — sample __harness.saikiVoicePick("taunt", N) and assert genuine
//       random spread across all 12 clips + non-repeating order (the SAME pickSaikiVoice
//       the live taunt-commit hook calls).
//   (2) ON-DISK proof — all 12 saiki_en_*.mp3 files named in the pool exist on disk.
//   (3) DORMANT-then-LIVE trigger proof — Saiki ships NO `taunt` action, so the universal
//       taunt mechanic never commits for him (dormant). We inject a taunt anim onto the
//       LIVE p1 fighter (giveP1TestTaunt), drive the real commit transition, and spy on
//       playSfxFile to prove a saiki_en_* clip fires — i.e. the hook is genuinely wired and
//       lights up the instant a taunt action is added. The spy records the filename ARGUMENT.
// Run: node harness/saiki_voice.test.mjs
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

// The 12 clips named in saikiVoice.js taunt pool (exact on-disk filenames).
const POOL = [
  "saiki_en_not_listening.mp3", "saiki_en_annoying.mp3", "saiki_en_stupid_or_what.mp3",
  "saiki_en_thats_sad.mp3", "saiki_en_nope.mp3", "saiki_en_dont_care.mp3",
  "saiki_en_stop_stupid_things.mp3", "saiki_en_who_cares.mp3", "saiki_en_thats_it.mp3",
  "saiki_en_seriously.mp3", "saiki_en_no_idea.mp3", "saiki_en_ill_pass.mp3",
];
const RE = /^saiki_en_.+\.mp3$/;

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; } }); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function goto(q) { await page.goto(`${base}/index.html?harness=1&${q}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }

try {
  // ══ PART 1: RANDOMIZER PROOF ═══════════════════════════════════════════════
  await goto("p1=saiki");
  section("randomizer — genuine random spread across the 12-entry English taunt pool");
  const picks = await page.evaluate(() => window.__harness.saikiVoicePick("taunt", 300));
  const distinct = new Set(picks);
  const allValid = picks.every(f => RE.test(f));
  const coversAll = POOL.every(c => distinct.has(c));
  const firstTen = picks.slice(0, 10).map(f => f.replace(/^saiki_en_/, "").replace(/\.mp3$/, "")).join(", ");
  check(`taunt (12) → ${distinct.size}/12 distinct over 300 picks`, distinct.size >= 11 && allValid, `first10: ${firstTen}`);
  check("every one of the 12 clips surfaces (full pool coverage)", coversAll, coversAll ? "" : `missing: ${POOL.filter(c => !distinct.has(c)).join(", ")}`);
  // Non-repeating order (not a fixed cycle): consecutive picks differ often.
  const seq = await page.evaluate(() => window.__harness.saikiVoicePick("taunt", 30));
  let changes = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
  check("taunt is randomized, not a fixed repeating cycle", changes >= 20, `${changes}/29 adjacent changes`);
  // pool never returns null / an unknown pool returns null
  const badPool = await page.evaluate(() => window.__harness.saikiVoicePick("nope", 3));
  check("unknown pool name → null (no crash)", badPool.every(x => x === null), `got ${JSON.stringify(badPool)}`);

  // ══ PART 2: ON-DISK PRESENCE ═══════════════════════════════════════════════
  section("on-disk presence — all 12 English clips are actually shipped");
  const missing = POOL.filter(f => !fs.existsSync(path.join(ROOT, f)));
  check("all 12 saiki_en_*.mp3 present on disk", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${POOL.length}/12 present`);

  // ══ PART 3: DORMANT-then-LIVE TRIGGER PROOF ════════════════════════════════
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  section("dormant — Saiki ships no `taunt` action, so the mechanic never commits");
  const hasTauntAnim = await page.evaluate(() => !!window.__harness.p1().animationData?.taunt);
  check("Saiki has NO taunt animationData (staged, not a built mechanic)", !hasTauntAnim, `animationData.taunt = ${hasTauntAnim}`);

  section("live — inject a taunt action, drive the real commit, prove the Saiki hook fires");
  // Prep: p1 grounded/idle, then inject a taunt anim + fast-forward the 10s charge to the edge.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.giveP1TestTaunt(4); });
  await clearSfx();
  // Hold Down (grounded+idle) and push charge over the threshold → commit transition fires once.
  await page.keyboard.down("s");
  await waitFrames(2);
  await page.evaluate(() => window.__harness.setTauntCharge(599));   // one short of TAUNT_CHARGE_FRAMES (600)
  await waitFrames(6);                                               // next Down-held frame commits → voice
  await page.keyboard.up("s");
  const log = await sfxLog();
  const firedClip = log.find(f => RE.test(f)) || null;
  check("taunt commit → a saiki_en_* clip fires (hook genuinely wired)", !!firedClip, firedClip ? `fired: ${firedClip}` : `log=${JSON.stringify(log)}`);
  check("the fired clip is a member of the 12-entry pool", firedClip ? POOL.includes(firedClip) : false, firedClip || "");

  // ══ PART 4: LIVE HIT-CONNECT (the trigger that ACTUALLY makes Saiki audible in-game) ═══
  // Saiki ships no `taunt` action, so the Part-3 taunt hook is dormant in real play. The LIVE
  // path is combat.js applySaikiOffenseVoice: an UNBLOCKED normal that CONNECTS fires a taunt-pool
  // clip (shared _atkVoiceCd throttle, suppressed when blocked). Prove connect-gating: a WHIFF stays
  // SILENT (swing alone doesn't bark), a clean point-blank CONNECT fires one of the 12 clips.
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  const logHas = async (re) => (await sfxLog()).some(f => re.test(f));
  async function prep(gap) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice("p1"); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); await clearSfx();
  }

  section("live hit-connect — the trigger that makes Saiki audible in real matches");
  // WHIFF: p2 way out of range → the light swing connects with nothing → NO bark (proves connect-gating).
  let silentOnWhiff = true;
  for (let i = 0; i < 3 && silentOnWhiff; i++) {
    await prep(600);
    await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(14);
    if (await logHas(RE)) silentOnWhiff = false;
  }
  check("whiffed attack → NO saiki_en_* clip (hit-connect gated, not swing-gated)", silentOnWhiff, silentOnWhiff ? "" : "leaked on a whiff");

  // CONNECT: p2 point-blank → the light lands unblocked → a pool clip fires (the real in-game path).
  let firedOnConnect = null;
  for (let i = 0; i < 6 && !firedOnConnect; i++) {
    await prep(40);
    await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(14);
    firedOnConnect = (await sfxLog()).find(f => RE.test(f)) || null;
  }
  check("connected attack → a saiki_en_* clip fires (LIVE in-game path)", !!firedOnConnect, firedOnConnect ? `fired: ${firedOnConnect}` : `log=${JSON.stringify(await sfxLog())}`);
  check("the fired clip is a member of the 12-entry pool", firedOnConnect ? POOL.includes(firedOnConnect) : false, firedOnConnect || "");

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Saiki voice: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
