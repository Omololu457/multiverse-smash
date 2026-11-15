// harness/input_buffer_window.test.mjs — PERMANENT GUARD against the "double buffer drain".
//
// Bug (fixed 2026-11-15): getFighterInput() advanced every input buffer each time it was CALLED, and the
// game calls it 2-4x per fighter per frame (movement, combat body, hitstun/blockstun reversal checks), so
// INPUT_BUFFER_FRAMES = 10 really lasted ~5 frames (~2.5 for Green Arrow's reversal check).
// Contract this test pins: a buffered press is live for EXACTLY INPUT_BUFFER_FRAMES logic frames (the
// press frame counts as frame 1), no fewer and no more, however many times the input is read per frame,
// in neutral AND in hitstun.
//
//   Part A (pure Node, exact): the real input.js with the real frame clock, read 1x / 2x / 4x per frame.
//   Part B (real match, Playwright): the live game loop and every real call site, via input.js's trace.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { INPUT_BUFFER_FRAMES as N, keys, getFighterInput, beginInputFrame } from "../input.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

check("INPUT_BUFFER_FRAMES is still 10 (not lengthened to compensate)", N === 10, `N=${N}`);

// ── Part A ───────────────────────────────────────────────────────────────────────────────────────
section("A) real input.js: a 1-frame tap is live for exactly N frames, at 1/2/4 reads per frame");
const CTRL = { light: "j", heavy: "k", upAttack: "i", special: "l", ultimate: "u", jump: "w", up: "w", down: "s", left: "a", right: "d", grab: "o", block: "p", charge: "r", dash: "" };
function liveFrames({ readsPerFrame, hitstun, holdFrames = 1, button = "light" }) {
  for (const k in keys) delete keys[k];
  const f = { rosterKey: "tester", playerNumber: 1, controls: CTRL, hitstun: 0, blockstun: 0, facing: 1 };
  // Settle the buffer fully empty first.
  for (let i = 0; i < 30; i++) { beginInputFrame(); getFighterInput(f); }
  const seen = [];
  for (let frame = 0; frame < 40; frame++) {
    beginInputFrame();
    f.hitstun = hitstun ? 60 : 0;
    keys[CTRL[button]] = frame < holdFrames;
    let first = null, allSame = true;
    for (let r = 0; r < readsPerFrame; r++) {
      const s = getFighterInput(f);
      if (first === null) first = s[button]; else if (s[button] !== first) allSame = false;
      s[button] = !s[button];   // callers may mutate their copy — must not leak into later reads
    }
    seen.push({ live: first, allSame });
  }
  for (const k in keys) delete keys[k];
  const liveCount = seen.findIndex(x => !x.live);
  return { liveCount: liveCount < 0 ? 40 : liveCount, contiguous: seen.slice(liveCount).every(x => !x.live), consistent: seen.every(x => x.allSame) };
}
for (const hitstun of [false, true]) for (const reads of [1, 2, 4]) for (const button of ["light", "special"]) {
  const r = liveFrames({ readsPerFrame: reads, hitstun, button });
  check(`${hitstun ? "HITSTUN" : "NEUTRAL"} ${button} tap, ${reads} read(s)/frame → live exactly ${N} frames`, r.liveCount === N && r.contiguous, `live ${r.liveCount}f`);
  if (reads > 1) check(`  every read in a frame sees the same value, and caller mutation never leaks`, r.consistent);
}
{
  const r = liveFrames({ readsPerFrame: 2, hitstun: false, holdFrames: 5 });
  check(`a 5-frame hold stays live exactly ${N - 1} frames after the last held frame`, r.liveCount === 5 + N - 1, `live ${r.liveCount}f`);
}

// ── Part B ───────────────────────────────────────────────────────────────────────────────────────
section("B) real match: after release, the press stays live exactly N-1 more frames (N counting the last held frame)");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg", ".webp": "image/webp" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
async function frames(page, n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }

async function realMatch(label, p1, stun) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await frames(page, 20);
  await page.evaluate((stun) => {
    window.__inputTrace = [];
    if (stun) { window.__harness.setHitstun(300, "p1"); window.__stunT = setInterval(() => window.__harness.setHitstun(300, "p1"), 30); }
  }, stun);
  await frames(page, 4);
  await page.keyboard.down("j");   // P1 Light
  await frames(page, 3);
  await page.keyboard.up("j");
  await frames(page, N + 12);
  const rows = await page.evaluate(() => { clearInterval(window.__stunT); const t = window.__inputTrace; window.__inputTrace = undefined; return t; });
  await page.close();
  const p1rows = rows.filter(r => r.pn === 1 && r.consumed);
  const perFrame = new Map(); for (const r of rows.filter(r => r.pn === 1)) perFrame.set(r.frame, (perFrame.get(r.frame) || 0) + (r.consumed ? 1 : 0));
  const lastHeldIdx = p1rows.map(r => r.rawLight).lastIndexOf(true);
  const after = p1rows.slice(lastHeldIdx + 1);
  const trailing = after.findIndex(r => !r.light);
  const framesContig = after.slice(0, trailing + 1).every((r, i, a) => i === 0 || r.frame === a[i - 1].frame + 1) && (after[0]?.frame === p1rows[lastHeldIdx]?.frame + 1);
  const stunned = p1rows.slice(lastHeldIdx, lastHeldIdx + N + 1).every(r => r.hs > 0);
  check(`${label}: press seen held`, lastHeldIdx >= 0);
  if (stun) check(`${label}: P1 was in hitstun for the whole window`, stunned);
  check(`${label}: exactly one consuming read per frame`, [...perFrame.values()].every(v => v === 1), JSON.stringify([...new Set(perFrame.values())]));
  check(`${label}: live exactly ${N - 1} frames after release (${N} incl. last held frame)`, trailing === N - 1 && framesContig, `trailing=${trailing}`);
  check(`${label}: no page errors`, errs.length === 0, errs[0] || "");
}
try {
  await realMatch("NEUTRAL", "goku", false);
  await realMatch("HITSTUN", "goku", true);
  await realMatch("HITSTUN + reversal read (Green Arrow)", "green_arrow", true);
} finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════════`);
console.log(`  INPUT-BUFFER WINDOW (exactly ${N} frames): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
