// harness/kurapika_stage4.mjs — STAGE 4: Kurapika's status-effect special + Nen charge.
//   Fwd+Special → Shock Strike: lunging strike, sprite kurapika_shock_uniform, connects + STUNS (elevated hitstun).
//   Hold P      → Nen charge: enters charge (sprite kurapika_charge_uniform) + builds energy toward Emperor Time.
// Shots → harness/shots/kurapika_s4_*_crop.png.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `kurapika_s4_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `kurapika_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 50) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kurapika`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── Shock Strike (Fwd+Special — lunge + STUN) ──");
  {
    await setupAdjacent(46);
    await page.evaluate(() => window.__harness.fillEnergy());
    const hp0 = (await p2()).health;
    const set = await page.evaluate(() => window.__harness.p1SpecialDir("F"));
    const mv = await waitSheet("kurapika_shock_uniform");
    check("Fwd Special → kurapikaShock (cast)", set.cast === "kurapikaShock", `cast=${set.cast}`);
    check("Shock → kurapika_shock_uniform sprite", (mv.spriteSheet || "").includes("kurapika_shock_uniform"), `sheet=${mv.spriteSheet}`);
    let tgt = await p2(); let peakStun = tgt.hitstun || 0;
    for (let f = 0; f < 16; f++) { await waitFrames(1); tgt = await p2(); peakStun = Math.max(peakStun, tgt.hitstun || 0); if (tgt.health < hp0 && peakStun >= 34) break; }
    await crop("shock");
    check("Shock connects (dmg)", tgt.health < hp0, `hp ${hp0}→${tgt.health}`);
    check("Shock STUNS (target hitstun ≥ 34, above a normal light)", peakStun >= 34, `peakHitstun=${peakStun}`);
  }
  await waitGrounded(); await waitFrames(8);

  console.log("\n── Nen charge (hold P — builds energy toward Emperor Time) ──");
  {
    await page.evaluate(() => window.__harness.setP1Energy(40));
    const en0 = (await p1()).energy;
    await page.keyboard.down("p");
    let mv = await waitSheet("kurapika_charge_uniform", 12);
    await waitFrames(30);
    const cur = await p1();
    await crop("charge");
    await page.keyboard.up("p");
    check("hold P → kurapika_charge_uniform sprite", (mv.spriteSheet || "").includes("kurapika_charge_uniform") || (cur.spriteSheet || "").includes("kurapika_charge_uniform"), `sheet=${cur.spriteSheet}`);
    check("charge BUILDS Nen (energy climbs toward Emperor Time)", cur.energy > en0, `energy ${en0.toFixed(0)}→${cur.energy.toFixed(0)}`);
  }

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("kurapika")?.animationData || {});
  const keys = ["kurapikaShock", "charge"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("kurapika"));
  check("Shock + charge wired to real kurapika sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kurapika Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/kurapika_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
