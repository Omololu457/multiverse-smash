// harness/green_lantern_stage3.mjs — STAGE 3: Green Lantern's Fwd+Heavy command normal "Ring-Charged
// Spin Kick" (glSpinKick). Single committed command-normal (Onoki/Madara pattern, NOT a rekka).
// Asserts: (1) Fwd+Heavy (hold forward + fresh Heavy tap) fires glSpinKick → gl_spinkick_uniform sheet,
// (2) it CONNECTS on the dummy, (3) NEUTRAL Heavy (no forward) still yields the normal heavy (gl_heavy_
// uniform) — proving the command normal is forward-gated, (4) it is FREE (no Willpower spent).
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `green_lantern_s3_${name}.png`) }); return; }
  const padX = 120, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `green_lantern_s3_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
  await page.evaluate(() => window.__harness.fillEnergy?.());
}
async function waitSheet(sheet, maxF = 16) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=green_lantern`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── Fwd+Heavy → glSpinKick command normal ──
  console.log("\n── Fwd+Heavy command normal: Ring-Charged Spin Kick ──");
  let fired = "", dmg = 0, enSpent = 0;
  for (let attempt = 0; attempt < 6 && !(fired.includes("gl_spinkick_uniform") && dmg > 0); attempt++) {
    await setupAdjacent(60);
    const hp0 = (await p2()).health; const en0 = (await p1()).energy ?? 0;
    // hold forward, ensure Heavy starts released (fresh edge), then tap Heavy
    await page.keyboard.down("d"); await waitFrames(2);
    await page.keyboard.up("k"); await waitFrames(1);
    await page.keyboard.down("k");
    const mv = await waitSheet("gl_spinkick_uniform", 14);
    if ((mv.spriteSheet || "").includes("gl_spinkick_uniform")) { fired = mv.spriteSheet; await crop("spinkick"); }
    await page.keyboard.up("k"); await waitFrames(22);
    const hp1 = (await p2()).health; const en1 = (await p1()).energy ?? 0;
    dmg += Math.max(0, hp0 - hp1); enSpent += Math.max(0, en0 - en1);
    await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
  }
  check("Fwd+Heavy fires glSpinKick → gl_spinkick_uniform", fired.includes("gl_spinkick_uniform"), `sheet=${fired}`);
  check("spin kick connects (dmg)", dmg > 0, `total dmg=${dmg.toFixed(0)}`);
  check("spin kick is FREE (no Willpower spent)", enSpent === 0, `energy spent=${enSpent}`);

  // ── NEUTRAL Heavy (no forward held) → normal heavy, NOT the spin kick (forward-gated) ──
  console.log("\n── neutral Heavy stays on the normal path (forward-gating) ──");
  let neutralSheet = "";
  for (let attempt = 0; attempt < 5 && !neutralSheet.includes("gl_heavy_uniform"); attempt++) {
    await setupAdjacent(60);
    await page.keyboard.up("k"); await waitFrames(1);
    await page.keyboard.down("k");
    const mv = await waitSheet("gl_heavy_uniform", 14);
    neutralSheet = mv.spriteSheet || "";
    await page.keyboard.up("k"); await waitGrounded(); await waitFrames(6);
  }
  check("neutral Heavy → gl_heavy_uniform (not spin kick)", neutralSheet.includes("gl_heavy_uniform"), `sheet=${neutralSheet}`);

  // ── DATA contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("green_lantern")?.animationData || {});
  check("glSpinKick wired to gl_spinkick_uniform", (ad.glSpinKick?.sheet || "").includes("gl_spinkick_uniform"), `sheet=${(ad.glSpinKick?.sheet||"MISSING").split("/").pop()}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Green Lantern Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/green_lantern_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
