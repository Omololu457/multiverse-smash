// harness/miwa_stage3_shots.mjs — STAGE 3 specials: Iai Dash (grounded Special, gap-closer), Rapid Slash
// Vortex (airborne Special + a SEPARATE vortex FX OVERLAY layer, §10), and the cursed-energy charge stance
// (hold P → kasumi_charg pose + energy builds). Writes shots to harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const fx = () => page.evaluate(() => window.__harness.miwaFx());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitSheet(needle, maxF = 26) { for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; await waitFrames(1); } return await p1(); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function reset(gap = 90) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 1. IAI DASH (grounded Special) — gap-closer battojutsu ──
console.log("\n── 1. Iai Dash (grounded Special) ──");
await reset(90);
{ const e0 = (await fx()).energy, hp0 = (await p2()).health;
  await page.keyboard.down("l"); const mv = await waitSheet("kasumi_ultimate_dash_attack_uniform"); await page.keyboard.up("l");
  await waitFrames(2); await page.screenshot({ path: path.join(OUT, "miwa_s3_iaidash.png") }); await waitFrames(14);
  const e1 = (await fx()).energy, dmg = hp0 - (await p2()).health;
  check("Iai Dash uses the dash sheet", has(mv, "kasumi_ultimate_dash_attack_uniform"), `sheet=${mv.spriteSheet}`);
  check("Iai Dash spends cursed energy", e1 < e0, `energy ${e0}→${e1}`);
  check("Iai Dash connects (gap-closer)", dmg > 0, `dmg=${dmg}`); }

// ── 2. RAPID SLASH VORTEX (airborne Special) + SEPARATE vortex FX overlay ──
console.log("\n── 2. Rapid Slash Vortex (airborne Special) + FX overlay ──");
await reset(60);
{ const e0 = (await fx()).energy, hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1(56));
  await page.keyboard.down("l"); const mv = await waitSheet("kasumi_super_rapid_air_attack_uniform", 14); await page.keyboard.up("l");
  const armed = await fx();
  await page.screenshot({ path: path.join(OUT, "miwa_s3_vortex.png") });
  check("air Special uses the character slash sub-clip", has(mv, "kasumi_super_rapid_air_attack_uniform"), `sheet=${mv.spriteSheet}`);
  check("vortex FX overlay is armed (separate layer, §10)", armed.vortex === true, `vortex=${armed.vortex} t=${armed.vortexT}`);
  check("air Special spends cursed energy", armed.energy < e0, `energy ${e0}→${armed.energy}`);
  await waitFrames(6); await page.screenshot({ path: path.join(OUT, "miwa_s3_vortex_mid.png") });
  await waitFrames(30);
  check("vortex FX auto-expires (finite overlay lifetime)", (await fx()).vortex === false, `vortex=${(await fx()).vortex}`); }

// ── 3. CHARGE STANCE (hold P) — cursed-energy charge + kasumi_charg pose ──
console.log("\n── 3. Cursed-energy charge stance (hold P) ──");
await reset(120);
{ await page.evaluate(() => window.__harness.setEnergy?.(40)); const e0 = (await fx()).energy;
  await page.keyboard.down("p"); const mv = await waitSheet("kasumi_charg_uniform", 12);
  await waitFrames(20); const during = await fx();
  await page.screenshot({ path: path.join(OUT, "miwa_s3_charge.png") }); await page.keyboard.up("p");
  check("charge renders the kasumi_charg stance", has(mv, "kasumi_charg_uniform"), `sheet=${mv.spriteSheet} action=${during.action}`);
  check("holding P builds cursed energy", during.energy > e0, `energy ${e0}→${during.energy}`);
  check("charging flag set", during.charging === true, `charging=${during.charging}`); }

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
