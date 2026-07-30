// harness/shinobu_stage4.mjs — Stage 4 evidence: Shinobu's "Butterfly Dance" spinning-DASH Ultimate.
// Freeze-cinematic: camera push-in → she DASHES toward the opponent → spinning slash → guaranteed damage
// + wisteria POISON finisher at the STRIKE beat → camera pulls back → combat resumes. Cooldown-gated.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.shinobuUltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `shinobu_s4_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=shinobu&p2=shinobu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  section("Butterfly Dance ultimate — activation + dash + guaranteed damage + poison finisher");
  // Position the dummy FAR (out of normal melee range) to prove the dash closes the gap + range-independence.
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.resetUlt(); window.__harness.setP2ForceBlock?.(false); });
  const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 260); await waitFrames(3);
  const hp0 = (await p2()).health;

  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
  // wait for the cinematic to go active
  await page.waitForFunction(() => window.__harness.shinobuUltCine().active, null, { timeout: 2000, polling: 16 }).catch(() => {});
  const c0 = await cine();
  check("ultimate activates the Butterfly Dance cinematic", c0.active === true, `phase=${c0.phase} caster=${c0.casterKey}`);
  const startX = c0.startX, targetX = c0.targetX;

  // sample the dash: caster.x should ease from startX toward targetX (toward the opponent)
  let maxTowardOpp = 0, sawSpin = false, sawStrike = false;
  for (let i = 0; i < 120; i++) {
    const c = await cine();
    if (!c.active) break;
    if (c.casterX != null) maxTowardOpp = Math.max(maxTowardOpp, c.casterX - startX);
    if (c.phase === "spin" && !sawSpin) { await shot("spin"); sawSpin = true; }
    if (c.struck && !sawStrike) { await shot("strike"); sawStrike = true; }
    await waitFrames(1);
  }
  check("she DASHES toward the opponent (x eases in)", maxTowardOpp > 100 && targetX - startX > 0, `dash Δx=${Math.round(maxTowardOpp)} (start=${Math.round(startX)}→target=${Math.round(targetX)})`);

  // cinematic ends → combat resumes
  await page.waitForFunction(() => !window.__harness.shinobuUltCine().active, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(4);
  const hpAfterStrike = (await p2()).health;
  const directDmg = hp0 - hpAfterStrike;
  check("STRIKE deals guaranteed direct damage (range-independent, ~300)", directDmg >= 280, `direct=${directDmg}`);

  // poison finisher keeps ticking after the cinematic (no input)
  await waitFrames(130);
  const hpAfterPoison = (await p2()).health;
  const poisonDmg = hpAfterStrike - hpAfterPoison;
  check("wisteria POISON finisher ticks after the strike", poisonDmg > 0, `poison-finisher=${poisonDmg}`);

  section("cooldown gate + resume");
  const resumed = await cine();
  check("cinematic cleared → combat resumed", resumed.active === false, `active=${resumed.active}`);
  // immediate re-press should be gated by the 8s ultimate cooldown
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(4);
  const cg = await cine();
  check("2nd immediate ultimate gated by cooldown", cg.active === false, `active=${cg.active}`);

  section("stability");
  check("no JS errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
