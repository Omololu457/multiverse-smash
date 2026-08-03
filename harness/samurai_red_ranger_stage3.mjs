// harness/samurai_red_ranger_stage3.mjs
// STAGE 3 evidence: Mega Mode = full Vegeta-style TIER-SWAP + transformation cinematic.
//  • charge-release into Mega Mode (below-threshold guard), morph plays (silhouette darken + 火
//    calligraphy alongside), then RESOLVES into the Mega form (art + damage multiplier swap).
//  • ≥3 moves confirmed on the Mega tier (idle, a normal, guard) + a normal out-damages base.
//  • DUPLICATE-RENDER test: per-frame drawImage tally of the Mega body sheet ≤ 1 (no "two instances").
//  • quick-tap revert + auto-revert on drain.
// Screenshots → harness/shots/samurai_stage3_*.png.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
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

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sheet = (a) => (a.spriteSheet || "");
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `samurai_stage3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=samurai_red_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // Install a per-rAF drawImage tally of the Mega body sheet (the "two instances" detector).
  await page.evaluate(() => {
    window.__samDual = { max: 0, cur: 0 };
    const proto = CanvasRenderingContext2D.prototype;
    if (!proto.__samPatched) {
      const orig = proto.drawImage;
      proto.drawImage = function (img, ...rest) {
        try { const s = (img && (img.currentSrc || img.src)) || ""; if (s.includes("samurai_ranger_mega_idle_uniform")) window.__samDual.cur++; } catch (e) {}
        return orig.call(this, img, ...rest);
      };
      proto.__samPatched = true;
      const raf = window.requestAnimationFrame.bind(window);
      const tick = () => { if (window.__samDual.cur > window.__samDual.max) window.__samDual.max = window.__samDual.cur; window.__samDual.cur = 0; raf(tick); };
      raf(tick);
    }
  });

  // ── BELOW-THRESHOLD GUARD: a release under 90 Symbol Power must NOT transform ──
  console.log("\n── Mega Mode gate: below-threshold release does nothing ──");
  await waitGrounded();
  await page.evaluate(() => window.__harness.setEnergy?.(40));
  await page.keyboard.down("p"); await waitFrames(3); await page.keyboard.up("p"); await waitFrames(3);
  check("release below threshold does NOT transform", (await p1()).currentForm !== "megaMode", `form=${(await p1()).currentForm} energy=${(await p1()).energy?.toFixed?.(0)}`);

  // ── TRANSFORM: charge-release into Mega Mode ─────────────────────────
  console.log("\n── transformation cinematic (darken + 火 calligraphy → resolve) ──");
  await page.evaluate(() => window.__harness.setEnergy?.(160));
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  const started = await page.waitForFunction(() => window.__harness.p1().currentForm === "megaMode", null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  check("charge-release enters Mega Mode (morph begins)", started, `form=${(await p1()).currentForm}`);

  // catch the DARKEN phase (form=megaMode but art not yet resolved) → screenshot the calligraphy
  const morphShot = await page.waitForFunction(() => { const p = window.__harness.p1(); return p.currentForm === "megaMode" && !p.hasSkinAnim; }, null, { timeout: 2000, polling: 16 }).then(() => true).catch(() => false);
  await waitFrames(10); await shot("transform_morph");   // mid-morph: darkened body + 火 calligraphy alongside
  check("morph has a pre-resolve DARKEN phase (base art, not yet Mega)", morphShot, "");

  // wait for the RESOLVE (art swaps in)
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
  const mega = await p1();
  await shot("mega_idle");
  check("RESOLVED into Mega Mode (form + _skinAnim swapped)", mega.currentForm === "megaMode" && mega.hasSkinAnim, `form=${mega.currentForm} skinAnim=${mega.hasSkinAnim}`);
  check("Mega tier damage multiplier active (1.35)", Math.abs((mega.damageMultiplier ?? mega.damageMult ?? 1) - 1.35) < 0.02, `mult=${mega.damageMultiplier ?? mega.damageMult}`);

  // ── ≥3 MOVES ON THE MEGA TIER (idle / a normal / guard) ──────────────
  console.log("\n── tier-swap: moves render Mega art ──");
  check("MOVE 1 — idle = mega_idle_uniform", sheet(mega).includes("samurai_ranger_mega_idle_uniform"), `sheet=${sheet(mega)}`);

  // a normal (light) → mega combo sheet + out-damages base (~27)
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 46); await waitFrames(2);
  const hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const lightMega = await p1(); await shot("mega_light"); await page.keyboard.up("j"); await waitFrames(20);
  const lightDmg = hp0 - (await p2()).health;
  check("MOVE 2 — light = mega_combo_uniform", sheet(lightMega).includes("samurai_ranger_mega_combo_uniform"), `sheet=${sheet(lightMega)}`);
  check("Mega light out-damages base light (>30 vs base ~27)", lightDmg > 30, `dmg=${lightDmg}`);

  // guard (hold down) → mega guard sheet
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(6); const guardMega = await p1(); await shot("mega_guard"); await page.keyboard.up("s"); await waitFrames(3);
  check("MOVE 3 — guard = mega_guard_uniform", sheet(guardMega).includes("samurai_ranger_mega_guard_uniform"), `sheet=${sheet(guardMega)} isBlocking=${guardMega.isBlocking}`);

  // ── DUPLICATE-RENDER: Mega body sheet drawn ≤ 1× per frame (no "two instances") ──
  console.log("\n── duplicate-render check (no 'two instances') ──");
  await page.evaluate(() => { window.__samDual.max = 0; window.__samDual.cur = 0; });
  await waitFrames(30);   // hold in Mega idle, sample many frames
  const dual = await page.evaluate(() => window.__samDual.max);
  check("Mega body sheet drawn at most once per frame (no dual-render)", dual <= 1, `maxDrawsPerFrame=${dual}`);

  // ── REVERT: quick tap → base ─────────────────────────────────────────
  console.log("\n── revert ──");
  await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p"); await waitFrames(4);
  const rev = await p1();
  check("quick tap reverts to base (art + form)", rev.currentForm !== "megaMode" && !rev.hasSkinAnim && sheet(rev).includes("samurai_ranger_idle_uniform"), `form=${rev.currentForm} skinAnim=${rev.hasSkinAnim} sheet=${sheet(rev)}`);
  check("base damage multiplier restored (1.0)", Math.abs((rev.damageMultiplier ?? rev.damageMult ?? 1) - 1.0) < 0.02, `mult=${rev.damageMultiplier ?? rev.damageMult}`);

  // ── AUTO-REVERT ON DRAIN: enter, drain the meter, form drops ─────────
  console.log("\n── auto-revert on empty meter ──");
  await page.evaluate(() => window.__harness.setEnergy?.(160));
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.setEnergy?.(3));   // nearly empty → next drain ticks revert
  const dropped = await page.waitForFunction(() => window.__harness.p1().currentForm !== "megaMode", null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  check("Mega Mode auto-reverts when Symbol Power empties", dropped, `form=${(await p1()).currentForm}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 3: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
