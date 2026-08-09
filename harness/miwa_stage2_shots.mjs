// harness/miwa_stage2_shots.mjs — STAGE 2: the 5 base normals connect (right sheet + real damage) and the
// "Battojutsu Rush" Fwd+Heavy command chain (miwaG1→miwaG2→miwaG3) advances on clean hits, with a mid-chain
// INTERRUPT (a whiffed opener must NOT continue). Writes shots to harness/shots/.
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
const cmd = () => page.evaluate(() => window.__harness.miwaCmd());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitSheet(needle, maxF = 26) { for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; await waitFrames(1); } return await p1(); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function reset(gap = 48) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 1. GROUND NORMALS — light / heavy / up ──
console.log("\n── 1. Ground normals (light / heavy / up) ──");
for (const [nm, key, sheet] of [["light", "j", "kasumi_attack_2_uniform"], ["heavy", "k", "kasumi_attack_1_uniform"], ["up", "i", "kasumi_up_attack_uniform"]]) {
  await reset(nm === "heavy" ? 54 : 44);
  const hp0 = (await p2()).health; await page.keyboard.down(key);
  const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(14);
  check(`${nm} → ${sheet} + connects`, has(mv, sheet) && hp0 - (await p2()).health > 0, `sheet=${mv.spriteSheet} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, `miwa_s2_${nm}.png`) });
}

// ── 2. AIR NORMALS — air / down_air ──
console.log("\n── 2. Air normals (air / down_air) ──");
await reset(40);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("j");
  const mv = await waitSheet("kasumi_air_attack_1_uniform"); await page.keyboard.up("j"); await waitFrames(14);
  check("air → kasumi_air_attack_1_uniform + connects", has(mv, "kasumi_air_attack_1_uniform") && hp0 - (await p2()).health > 0, `sheet=${mv.spriteSheet}`);
  await page.screenshot({ path: path.join(OUT, "miwa_s2_air.png") }); }
await reset(30);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j");
  const mv = await waitSheet("kasumi_down_air_attack_uniform", 14); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
  check("down_air → kasumi_down_air_attack_uniform + connects", has(mv, "kasumi_down_air_attack_uniform") && hp0 - (await p2()).health > 0, `sheet=${mv.spriteSheet}`);
  await page.screenshot({ path: path.join(OUT, "miwa_s2_downair.png") }); }

// ── 3. COMMAND CHAIN — Fwd+Heavy miwaG1→miwaG2→miwaG3 (cancel-on-hit) ──
console.log("\n── 3. Battojutsu Rush chain (miwaG1→G2→G3) ──");
await reset(52);
{ const chain = []; await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 60; i++) {
    const c = await cmd(); if (c?.move && !chain.includes(c.move)) chain.push(c.move);
    if (chain.includes("miwaG3")) break;
    if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
    else await waitFrames(1);
    if (i === 6) await page.screenshot({ path: path.join(OUT, "miwa_s2_chain_mid.png") });
  }
  await page.keyboard.up("d"); await waitFrames(16);
  check("chain advances miwaG1 → miwaG2 → miwaG3", chain[0] === "miwaG1" && chain.includes("miwaG2") && chain.includes("miwaG3"), `chain=[${chain.join(" → ")}]`); }

// ── 4. MID-CHAIN INTERRUPT — a whiffed opener must NOT continue ──
console.log("\n── 4. Mid-chain interrupt (whiff → no continue) ──");
await reset(52);
{ await page.evaluate(() => window.__harness.setP2X(99999)); const w = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 20; i++) { const m = (await p1()).currentMove; if (m && !w.includes(m)) w.push(m); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); }
  await page.keyboard.up("d");
  check("interrupt: whiffed miwaG1 does NOT chain to miwaG2", w.includes("miwaG1") && !w.includes("miwaG2"), `chain=[${w.join(" → ")}]`); }

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
