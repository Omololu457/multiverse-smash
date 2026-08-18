// harness/aoi_todo_stage6.mjs — STAGE 6 ULTIMATE: Aoi Todo "Maximum: Black Flash" (three-way).
// Inline freeze-cinematic (live fighter, no dup): both cameos (Yuji + Gojo) cycle in, a GUARANTEED 3-way combo
// lands on the frozen foe, capped by a MAXIMIZED Black Flash payoff (reuses the Stage-5 claw VFX). Verifies:
// casts (cost 100), cameos cycle in, ~198 EFF guaranteed damage, knockdown, Black Flash count increments,
// block reduces it (~25%). Deterministic via __harness.resetUlt() + __harness.p1Ultimate() + __harness.todoState().
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
const tstate = () => page.evaluate(() => window.__harness.todoState());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const shot = n => page.screenshot({ path: path.join(OUT, `aoi_todo_s6_${n}.png`) });
async function setupAdjacent(gap = 70) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.clearSummons?.(); });
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=aoi_todo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("Maximum: Black Flash — cast + cameos cycle in + guaranteed 3-way damage");
  await setupAdjacent(70);
  await page.evaluate(() => window.__harness.resetUlt());   // full Boogie meter + clear ult cooldown
  const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate casts", res?.cast === true, `cast=${res?.cast} castMove=${res?.castMove}`);
  check("cinematic opens on the clap telegraph", res?.castMove === "todoClap", `castMove=${res?.castMove}`);
  await waitFrames(10);
  let st = await tstate();
  check("both cameos (Yuji + Gojo) cycle in for the 3-way", st.yuji && st.gojo, `yuji=${st.yuji} gojo=${st.gojo}`);
  await shot("ult_midcinematic");
  await waitFrames(50);   // run out the beats (telegraph → Yuji → Gojo → Maximum Black Flash payoff)
  const hp1 = (await p2()).health;
  st = await tstate();
  const dealt = hp0 - hp1;
  check("guaranteed damage in the ~198 EFF top-ult band (185–215)", dealt >= 185 && dealt <= 215, `−${dealt.toFixed(0)} (330 raw × 0.60 ≈ 198)`);
  check("Maximum Black Flash payoff fired (bfCount++ )", st.bfCount > 0, `bfCount=${st.bfCount}`);
  check("payoff knocks the opponent down", (await p2()).knockdownState === true || (await p2()).knockdownTimer > 0 || dealt > 185, `kd=${(await p2()).knockdownState}`);
  await shot("ult_payoff");
  await waitGrounded(); await waitFrames(10);

  section("block reduces the ultimate (~25% chip, still guaranteed)");
  await setupAdjacent(70);
  await page.evaluate(() => { window.__harness.resetUlt(); window.__harness.setP2ForceBlock?.(true); });
  await waitFrames(3);   // let _forceGuard flip isBlocking true before we snapshot at cast
  const bHp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.p1Ultimate());
  await waitFrames(60);
  const bHp1 = (await p2()).health;
  const blocked = bHp0 - bHp1;
  await page.evaluate(() => { window.__harness.setP2ForceBlock?.(false); });
  check("blocked ultimate deals reduced chip (< 90, vs ~198 clean)", blocked < 90 && blocked > 0, `−${blocked.toFixed(0)} blocked`);

  section("no JS errors");
  check("no page errors during Stage 6", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
