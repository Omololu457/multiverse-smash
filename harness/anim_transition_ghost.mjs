// harness/anim_transition_ghost.mjs — LIVE before/after for the animation hard-cut fix (transition
// after-image), on the same sample cast as the input-buffer fix (bardock/gohan/ippo/madara) spanning
// archetypes. Proves, per character:
//   1. ATTACK → next-action transition ARMS the fading ghost (xfadeActive, life decays over XFADE_FRAMES).
//   2. WALK/locomotion does NOT arm it (gated to attacks — no over-ghosting).
// and captures a screenshot AT the ghost frame (the after-image visible) + a clean-idle baseline.
// BEFORE/AFTER: run on the fixed build (ghost arms), then `git stash push sprite.js` and re-run with
// BUF_TAG=before (ghost NEVER arms — the harness hook returns xfadeActive:false since _xfade is unset).
//   BUF_TAG=after node harness/anim_transition_ghost.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = process.env.BUF_TAG || "cur";
const OUT = path.join(ROOT, "harness", "shots", "anim_ghost", TAG);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const F = async () => page.evaluate(() => window.__harness.state().frame);
const wf = async n => { const s = await F(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 9000, polling: 6 }).catch(() => {}); };
const pin = () => page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + (p.facing === 1 ? 46 : -46)); const q = window.__harness.p2(); if (q) q.vx = 0; window.__harness.setP2Invuln(0); });
const xf = () => page.evaluate(() => window.__harness.spriteXfade());

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };

const SAMPLE = [
  { key: "bardock", kit: "rekka-sword" },
  { key: "gohan",   kit: "rekka-melee" },
  { key: "ippo",    kit: "meterless-boxer" },
  { key: "madara",  kit: "large-kit" },
];

async function resetToIdle() {
  await page.evaluate(() => { const p = window.__harness.p1(); p.attacking = false; p.currentAttack = null; p.attackCooldown = 0; p.hitstun = 0; p.hitstop = 0; });
  await page.waitForFunction(() => window.__harness.spriteAction() === "idle", null, { timeout: 3000, polling: 8 }).catch(() => {});
}

async function verify(entry) {
  await page.goto(`${base}/index.html?harness=1&p1=${entry.key}&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.spriteXfade), null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(8);
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 46); });
  await pin();

  // ── ATTACK transition: throw a light; frame-step and watch the attack→next-action ghost arm ──
  await resetToIdle();
  await page.evaluate(() => window.__harness.healP2());
  await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
  let maxLife = 0, armedAction = null, ghostShot = false, transShot = false, sawAttack = false;
  for (let i = 0; i < 44; i++) {
    await pin();
    const s = await xf();
    if (s.action && s.action !== "idle") sawAttack = true;
    // Deterministic A/B frame: the FIRST idle frame after the attack — the exact transition. Same frame
    // index on both builds (the ghost changes only pixels, not timing), so before/after line up. On the
    // fixed build this frame carries the peak-life ghost; on the old build it's the bare hard-cut idle.
    if (sawAttack && s.action === "idle" && !transShot) {
      await page.screenshot({ path: path.join(OUT, `${entry.key}_transition.png`) }); transShot = true;
    }
    if (s.xfadeActive) {
      if (s.xfadeLife > maxLife) maxLife = s.xfadeLife;
      if (!armedAction) armedAction = s.action;
      if (!ghostShot) { await page.screenshot({ path: path.join(OUT, `${entry.key}_ghost.png`) }); ghostShot = true; }
    }
    await wf(1);
  }
  check(`${entry.key} [${entry.kit}] — attack transition ARMS the after-image (life→${maxLife}, into '${armedAction}')`, maxLife > 0, `maxLife=${maxLife}`);

  // ── LOCOMOTION negative: walk must NOT arm the ghost ──
  await resetToIdle();
  await page.keyboard.down("d");
  let walkGhost = false, walked = false;
  for (let i = 0; i < 14; i++) {
    const s = await xf();
    if (s.xfadeActive) walkGhost = true;
    if (["walk", "run", "dash"].includes(s.action)) walked = true;
    await wf(1);
  }
  await page.keyboard.up("d");
  check(`${entry.key} — walking does NOT arm the ghost (locomotion untouched)`, walked && !walkGhost, `walked=${walked} ghostSeen=${walkGhost}`);

  // clean idle baseline (for visual A/B against the ghost frame)
  await resetToIdle(); await pin();
  await page.screenshot({ path: path.join(OUT, `${entry.key}_idle.png`) });
  return { key: entry.key, maxLife, armedAction, walked, walkGhost };
}

console.log(`\n══ ANIM TRANSITION AFTER-IMAGE — LIVE (TAG=${TAG}) ══`);
const results = [];
for (const e of SAMPLE) { try { results.push(await verify(e)); } catch (err) { console.log(`  ${e.key} ERROR ${err.message}`); FAIL++; results.push({ key: e.key, error: String(err.message) }); } }
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n  shots + results.json → harness/shots/anim_ghost/${TAG}/`);
console.log(`\n════════════════════════════════════════\n  ANIM GHOST: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
