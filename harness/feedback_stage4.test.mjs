// harness/feedback_stage4.test.mjs
// FEEDBACK — STAGE 4: OVERLOAD ultimate (ULT button = "u"). Per-form pipeline ultimate consistent with
// its sibling forms (XLR8 Sonic Blitz / Diamondhead Crystal Storm): the fbUlt 5-frame beam cast unleashes
// a stream of three large electric overload orbs. Proves it fires (energy spent), plays the fbUlt cast
// pose, spawns the overload-orb stream, and deals ultimate-tier damage. Writes an fbUlt cast screenshot.
//   node harness/feedback_stage4.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "feedback_stage4_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function startWatch() { await page.evaluate(() => { window.__fbN = 0; window.__fbWatch = setInterval(() => { try { if (window.__harness.projectiles().some(p => (p.name || "").includes("overload"))) window.__fbN++; } catch (_) {} }, 6); }); }
async function stopWatch() { return page.evaluate(() => { clearInterval(window.__fbWatch); return window.__fbN; }); }
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  section("Feedback — OVERLOAD (electric overload-orb stream)");
  await page.evaluate(() => window.__harness.benForm("feedback"));
  await settle();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 90); await waitFrames(2); }
  const e = (await p1()).energy, h = (await p2()).health;
  await startWatch();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  let castPose = null;
  for (let i = 0; i < 34; i++) {
    const ri = await page.evaluate(() => window.__harness.renderInfo("p1")); if (ri?.action === "fbUlt") castPose = "fbUlt";
    if (i === 2) { const s = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); return c?.dataURL || null; }); if (s) fs.writeFileSync(path.join(OUT, "overload_cast.png"), Buffer.from(s.split(",")[1], "base64")); }
    await waitFrames(1);
  }
  const orbTicks = await stopWatch();
  const dmg = h - (await p2()).health;
  check("Overload fires (energy spent)", (e - (await p1()).energy) > 50, `Δ=${(e - (await p1()).energy).toFixed(0)}`);
  check("Overload plays the fbUlt beam cast pose", castPose === "fbUlt", `pose=${castPose}`);
  check("Overload spawns the electric overload-orb stream", orbTicks > 0, `orb-observations=${orbTicks}`);
  check("Overload deals ultimate-tier damage", dmg > 90, `−${dmg.toFixed(0)}`);

  section("sweep");
  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");

} catch (err) { console.log("FATAL", err); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  FEEDBACK STAGE 4: ${pass} passed, ${fail} failed`);
  console.log(`  evidence → harness/feedback_stage4_out/`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
