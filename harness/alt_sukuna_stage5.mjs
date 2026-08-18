// harness/alt_sukuna_stage5.mjs — STAGE 5: "Domain Expansion: Malevolent Shrine" ultimate.
// Inline freeze-cinematic on the LIVE fighter (Brainiac/Byakuya pattern — no duplicate instance): the domain
// hand-sign CHARGE (altSukunaUltCharge) is held while the Malevolent Shrine backdrop erupts (row_07 panels,
// drawAltSukunaDomainCinematic, gated on _altSukunaDomainTimer) → a GUARANTEED scaled slash payoff (330 raw →
// ~198 EFF, ×0.60). Verifies: cast pose, cinematic timer/overlay ran + shrine backdrop loaded, foe frozen +
// guaranteed damage regardless of range, data contract. Screenshot mid-cinematic.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const domain = () => page.evaluate(() => window.__harness.altSukunaDomain());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=alt_sukuna`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await waitGrounded();

  // place the dummy at MID range to prove the payoff is guaranteed/range-independent
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.35)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }, a.x + 260); await waitFrames(2);
  await page.evaluate(() => window.__harness.fillEnergy?.());

  console.log("\n── Domain Expansion: Malevolent Shrine ──");
  const hp0 = (await p2()).health;
  const r = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ult fires (cast)", r.cast === true, `cast=${r.cast}`);
  check("live fighter holds altSukunaUltCharge (domain hand-sign)", (r.castMove || "") === "altSukunaUltCharge", `castMove=${r.castMove}`);
  const d0 = await domain();
  check("domain cinematic timer armed", d0.timer > 0, `timer=${d0.timer} max=${d0.max}`);

  // screenshot mid-cinematic (around the payoff beat), then let it finish
  await waitFrames(28);
  await page.screenshot({ path: path.join(OUT, "alt_sukuna_s5_domain.png") });
  const dMid = await domain();
  await waitFrames(70);
  const dEnd = await domain();
  const hp1 = (await p2()).health;

  check("shrine overlay actually rendered (renders>0)", dEnd.renders > 0, `renders=${dEnd.renders}`);
  check("shrine backdrop image loaded", dEnd.bgLoaded === true, `bgLoaded=${dEnd.bgLoaded}`);
  check("guaranteed payoff lands at MID range (~198 EFF)", (hp0 - hp1) >= 180 && (hp0 - hp1) <= 215, `−${(hp0 - hp1).toFixed(0)} (hp ${hp0}→${hp1})`);
  check("cinematic ended (timer back to 0)", dEnd.timer === 0, `timer=${dEnd.timer}`);

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("alt_sukuna")?.animationData || {});
  check("animationData.altSukunaUltCharge → alt_sukuna_ultcharge sheet", (ad.altSukunaUltCharge?.sheet || "").includes("alt_sukuna_ultcharge"), `sheet=${ad.altSukunaUltCharge?.sheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
