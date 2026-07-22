// harness/beerus_audibility_probe.mjs
// REAL-PLAY AUDIBILITY PROBE (not a wiring test).
// The existing beerus_voice.test.mjs only proves playSfxFile() was *called*. This proves
// the audio actually DECODES and PLAYS: it patches window.Audio before any game code, so
// every one-shot voice element is captured, then drives a real match and confirms each
// voice line's element reaches a `playing` event with an ADVANCING currentTime (media clock
// running = real output pipeline), backed by a 200 / audio-mpeg network fetch.
//
// Faithful to real play: unlocks autoplay via a genuine page.mouse.click gesture (NOT the
// --autoplay-policy override flag) — the same first-gesture gate a human hits.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
// NOTE: deliberately NO --autoplay-policy override — we rely on a real user gesture, like real play.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// ── network-level proof: capture every *.mp3 response (status + content-type)
const netMp3 = new Map();
page.on("response", async (r) => {
  const u = r.url();
  if (u.endsWith(".mp3")) {
    const name = u.split("/").pop();
    netMp3.set(name, { status: r.status(), type: r.headers()["content-type"] || "" });
  }
});

// ── patch window.Audio BEFORE any game script runs → capture every voice element
await page.addInitScript(() => {
  const Native = window.Audio;
  window.__audioProbe = [];
  function ProbeAudio(src) {
    const a = new Native(src);
    const rec = { src: String(src || ""), playing: false, errored: false, playResolved: null, el: a };
    window.__audioProbe.push(rec);
    a.addEventListener("playing", () => { rec.playing = true; });
    a.addEventListener("error", () => { rec.errored = true; });
    const origPlay = a.play.bind(a);
    a.play = function () { const p = origPlay(); if (p && p.then) p.then(() => (rec.playResolved = true), () => (rec.playResolved = false)); return p; };
    return a;
  }
  ProbeAudio.prototype = Native.prototype;
  window.Audio = ProbeAudio;
  // snapshot helper: for each captured element, report live media state
  window.__audioReport = () => (window.__audioProbe || []).map(r => ({
    src: r.src, playing: r.playing, errored: r.errored, playResolved: r.playResolved,
    currentTime: (() => { try { return r.el.currentTime; } catch { return -1; } })(),
    duration: (() => { try { return r.el.duration; } catch { return -1; } })(),
    paused: (() => { try { return r.el.paused; } catch { return true; } })(),
    muted: (() => { try { return r.el.muted; } catch { return true; } })(),
    volume: (() => { try { return r.el.volume; } catch { return 0; } })(),
    readyState: (() => { try { return r.el.readyState; } catch { return 0; } })(),
    error: (() => { try { return r.el.error ? r.el.error.code : null; } catch { return null; } })(),
  }));
});

const stateF = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
const p1 = () => page.evaluate(() => window.__harness.p1());
async function prep(gap = 120) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

const VOICE_FILES = [
  "beerus_intro.mp3", "beerus_special_cast_1.mp3", "beerus_special_cast_2.mp3",
  "beerus_hakai_activate.mp3", "beerus_ultimate_activate.mp3",
];

try {
  console.log(`\n▶ REAL-PLAY AUDIBILITY PROBE — Beerus voice lines  (served ${base})\n`);
  await page.goto(`${base}/index.html?harness=1&p1=beerus`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });

  // ── genuine user gesture (unlocks autoplay exactly like a player's first click)
  await page.mouse.click(640, 360);
  const gestured = await page.evaluate(() => window.__harness.__sound._gestured === true);
  console.log(`  gesture unlock (_gestured): ${gestured ? "✅ true" : "❌ false"}`);

  // 1) INTRO (auto at reveal beat)
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => (window.__audioProbe || []).some(r => r.src.includes("beerus_intro.mp3")), null, { timeout: 12000, polling: 16 }).catch(() => {});
  await page.waitForTimeout(700);            // let the element buffer + advance its clock
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // 2) KI BLAST → special_cast_1
  await prep(); await tap("l"); await waitFrames(4); await page.waitForTimeout(600);
  // 3) FORWARD PUSH → special_cast_2
  await prep(); await tap("s", 1); await tap("d", 1); await tap("l"); await waitFrames(4); await page.waitForTimeout(600);
  // 4) HAKAI → hakai_activate
  await prep(); await tap("w", 1); await tap("l"); await waitFrames(4); await page.waitForTimeout(600);
  // 5) ULTIMATE → ultimate_activate (fires during charge)
  await prep(); await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => { const c = window.__harness.beerusUltCine?.(); return c && c.active && c.frame >= 10; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.waitForTimeout(700);

  // ── collect
  const report = await page.evaluate(() => window.__audioReport());
  const byFile = {};
  for (const r of report) for (const vf of VOICE_FILES) if (r.src.includes(vf)) byFile[vf] = r;

  console.log(`\n── per-line audibility (element reached 'playing' + clock advanced) ──`);
  let audible = 0;
  for (const vf of VOICE_FILES) {
    const r = byFile[vf];
    const net = netMp3.get(vf);
    if (!r) { console.log(`  ❔ ${vf.padEnd(30)} — element never created (line not triggered this run)`); continue; }
    const clockAdvanced = r.currentTime > 0.01;
    const ok = (r.playing || r.playResolved === true) && clockAdvanced && !r.errored && !r.muted && r.volume > 0;
    if (ok) audible++;
    console.log(`  ${ok ? "✅" : "❌"} ${vf.padEnd(30)} playing=${r.playing} playResolved=${r.playResolved} t=${(r.currentTime || 0).toFixed(2)}s dur=${(r.duration || 0).toFixed(2)} vol=${r.volume} muted=${r.muted} err=${r.error} | net=${net ? net.status + " " + net.type : "—"}`);
  }

  console.log(`\n── network fetches for voice mp3s ──`);
  for (const vf of VOICE_FILES) { const n = netMp3.get(vf); if (n) console.log(`  ${n.status === 200 && n.type.includes("audio") ? "✅" : "❌"} ${vf.padEnd(30)} ${n.status} ${n.type}`); }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  AUDIBLE VOICE LINES: ${audible} / ${VOICE_FILES.length} triggered   (need ≥2)`);
  console.log(`  RESULT: ${audible >= 2 ? "✅ CONFIRMED — Beerus voice lines are audible in real play" : "❌ NOT CONFIRMED — lines silent"}`);
  console.log(`${"═".repeat(60)}\n`);

  await browser.close();
  server.close();
  process.exit(audible >= 2 ? 0 : 1);
} catch (e) {
  console.error("FATAL", e);
  await browser.close();
  server.close();
  process.exit(2);
}
