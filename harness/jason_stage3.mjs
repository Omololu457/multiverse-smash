// harness/jason_stage3.mjs
// STAGE 3 evidence: Jason's ONE special — "Relentless Slash" (neutral Special). Proves it fires, renders
// the jRelentless cast pose (the reused heavy/slash_1 art), CONNECTS for far more than the normal heavy,
// SPENDS Bloodlust, lunges forward, is energy-GATED, and applies a heavier blow-back than the heavy.
// Screenshots → harness/shots/jason_stage3_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `jason_stage3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=jason`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── data contract ──
  console.log("\n── special data ──");
  const hasCastAnim = await page.evaluate(() => !!window.__harness.charDef("jason")?.animationData?.jRelentless);
  check("jRelentless cast pose wired (reuses the heavy art)", hasCastAnim, "");

  // ── fires + connects + renders + spends energy ──
  console.log("\n── Relentless Slash fires + connects ──");
  await prep(120);   // start a bit far so the forward lunge closes the gap
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  // capture the cast pose mid-swing
  let castSheet = null, castMove = null, lunged = false;
  for (let i = 0; i < 16; i++) {
    const a = await p1();
    if (a.spriteAction === "jRelentless" || a.currentMove === "jRelentless") { castSheet = a.spriteSheet; castMove = a.currentMove || a.spriteAction; }
    if (Math.abs(a.vx) > 3) lunged = true;
    if (i === 4) await shot("relentless_cast");
    await waitFrames(1);
  }
  await waitFrames(20);
  const en1 = (await p1()).energy;
  const hp1 = (await p2()).health;
  const dmg = hp0 - hp1;
  check("special renders jRelentless (heavy/slash_1 art)", (castSheet || "").includes("jason_heavy_uniform"), `move=${castMove} sheet=${castSheet}`);
  check("special connects for a BIG hit (dmg ≥ 70)", dmg >= 70, `dmg=${dmg.toFixed(1)}`);
  check("spends ~35 Bloodlust", en0 - en1 >= 30 && en0 - en1 <= 45, `spent=${(en0 - en1).toFixed(0)} (${en0}→${en1})`);
  check("lunges forward (kinetically distinct from the planted heavy)", lunged, `lunged=${lunged}`);

  // ── heavier than the normal heavy (the special isn't a reskinned heavy) ──
  console.log("\n── special hits harder than the heavy ──");
  await prep(80);
  const h0 = (await p2()).health;
  await page.keyboard.down("k"); await waitFrames(4); await page.keyboard.up("k"); await waitFrames(24);
  const heavyDmg = h0 - (await p2()).health;
  check("Relentless Slash out-damages the normal heavy", dmg > heavyDmg + 10, `special=${dmg.toFixed(0)} heavy=${heavyDmg.toFixed(0)}`);

  // ── energy gate: no meter → no special ──
  console.log("\n── energy gated ──");
  await prep(90);
  await page.evaluate(() => window.__harness.setEnergy?.(0));
  await waitFrames(2);
  const g0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(6); await page.keyboard.up("l"); await waitFrames(10);
  const gatedDmg = g0 - (await p2()).health;
  const acted = (await p1()).currentMove === "jRelentless";
  check("no Bloodlust → special does NOT fire (no damage, no cast)", gatedDmg === 0 && !acted, `dmg=${gatedDmg} move=${(await p1()).currentMove}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
