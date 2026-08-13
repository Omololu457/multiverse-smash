// harness/hud_stage4_verify.mjs
// ---------------------------------------------------------------------------
// Stage 4 verification for the MK1/Tekken-8 HUD redesign. Confirms the data-driven
// HUD VARIANTS still render correctly under the new styling, and captures a REAL
// full-match play session (AI vs AI, rendered) to prove the HUD holds up across a
// live fight — not just staged frames.
//
//   Section A — variant coverage (real matches, top-strip crops):
//     A1 maki vs gojo        → Maki's hideResourceMeter skip (HP-only, no energy panel)
//     A2 ben10 vs albedo     → transform-device relabel (OMNITRIX / ULTIMATRIX / state)
//     A3 goku vs naruto*boss → boss-bar variant (single wide center-draining bar)
//     (break-stock pips render in every panel — visible in all crops.)
//   Section B — full real-play match (AI vs AI, high speed, rendered): samples the HUD
//     across a genuine fight (real combos, damage, low-HP palette, KO).
//
//   node harness/hud_stage4_verify.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "hud_stage4_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };

const server = await new Promise(r => {
  const s = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); });
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));

const TOP = { x: 0, y: 0, width: 1280, height: 92 };

async function bootMatch(p1k, p2k) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1k}&p2=${p2k}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(10);
}
async function waitFrames(n) {
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(target => window.__harness.state().frame >= target, s0 + n, { timeout: 8000, polling: 16 });
}

// ── Section A — variant coverage ────────────────────────────────────────────
// A1: Maki meter-skip
await bootMatch("maki", "gojo");
const makiSkip = await page.evaluate(() => window.__harness.heavenlyRestriction?.("p1"));
await page.screenshot({ path: path.join(OUT, "A1_maki_meterskip.png"), clip: { x: 0, y: 600, width: 1280, height: 120 } });
await page.screenshot({ path: path.join(OUT, "A1_maki_meterskip_top.png"), clip: TOP });
console.log(`A1 Maki hideResourceMeter/heavenlyRestriction = ${makiSkip}`);

// A2: transform-device relabel
await bootMatch("ben10", "albedo");
const devLabels = await page.evaluate(() => ({ p1: window.__harness.energyLabel?.("p1"), p2: window.__harness.energyLabel?.("p2") }));
await page.screenshot({ path: path.join(OUT, "A2_device_relabel.png"), clip: { x: 0, y: 600, width: 1280, height: 120 } });
console.log(`A2 device panels — ben10/albedo raw energyLabel = ${devLabels.p1} / ${devLabels.p2} (HUD overrides to OMNITRIX/ULTIMATRIX/state)`);

// A3: boss-bar variant
await bootMatch("goku", "naruto");
await page.evaluate(() => window.__harness.forceBoss(true));
await waitFrames(2);
await page.evaluate(() => window.__harness.hudHit("p2", 380, "big"));   // drain the boss bar a bit to show center-out + ghost
await waitFrames(4);
await page.screenshot({ path: path.join(OUT, "A3_boss_bar.png"), clip: TOP });
await page.screenshot({ path: path.join(OUT, "A3_boss_bar_full.png") });
console.log("A3 boss bar captured");

// ── Section B — full real-play match (AI vs AI, rendered) ────────────────────
await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
// Start a real spectator match at high speed; the rAF loop RENDERS it (real combat/combos/damage).
await page.evaluate(() => window.__harness.aiVsAi.start({ p1: "naruto", p2: "sasuke", p1Diff: "HARD", p2Diff: "HARD", matches: 1, speed: 4 }));

let bi = 0;
const t0 = Date.now();
let lastFrame = -1;
// Sample the live match every ~250ms for up to ~18s, capturing full frames across the fight.
while (Date.now() - t0 < 18000 && bi < 14) {
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => {
    const s = window.__harness.aiVsAi.state();
    const hp = window.__harness.state();
    return { gameState: s.gameState, finished: s.finished, done: s.matchesDone, frame: hp.frame };
  });
  if (st.frame === lastFrame) continue;
  lastFrame = st.frame;
  await page.screenshot({ path: path.join(OUT, `B_match_${String(++bi).padStart(2, "0")}.png`) });
  if (st.finished) break;
}
console.log(`B captured ${bi} live-match frames`);

console.log(errors.length ? `\n❌ PAGE ERRORS:\n${errors.join("\n")}` : "\n✅ no page errors across all HUD variants + live match");
console.log("Stage 4 shots written to", OUT);
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
