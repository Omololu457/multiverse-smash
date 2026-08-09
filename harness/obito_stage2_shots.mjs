// harness/obito_stage2_shots.mjs — STAGE 2 evidence for Obito: 5 standard normals + the
// Fwd+Heavy "Kamui Rod Combo" 3-hit command rekka connecting (obitoRod1→2→3). Modeled on
// the proven ichigo.test.mjs driving technique (reset+gap positioning, waitPose, rekka probe).
// Each normal must (a) resolve to its real obito_*_uniform sheet and (b) actually connect (deal
// damage). The rekka must chain R1→R2→R3 on clean hits. Captures a shot of each.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e))); page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.obitoCmd());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitPose(needle, maxF = 22) { let best = await p1(); for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; best = a; await waitFrames(1); } return best; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_s2_${name}.png`) }); }
async function reset(gap = 50) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 3 GROUND NORMALS (light / heavy / up) — resolve to real sheet + connect ──
section("Ground normals");
for (const [nm, key, sheet, gap] of [["light","j","obito_light_uniform",46],["heavy","k","obito_heavy_uniform",60],["up","i","obito_up_uniform",44]]) {
  await reset(gap); const hp0 = (await p2()).health;
  await page.keyboard.down(key); const mv = await waitPose(sheet, 20); await page.keyboard.up(key); await waitFrames(12);
  const dmg = hp0 - (await p2()).health;
  check(`${nm} → ${sheet} + connects`, has(mv, sheet) && dmg > 0, `sheet=${(mv.spriteSheet||"").split("/").pop()} dmg=${dmg}`);
  await shot(nm);
}

// ── 2 AERIAL NORMALS (air / down_air) ──
section("Aerial normals");
await reset(40);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(52)); await page.keyboard.down("j");
  const mv = await waitPose("obito_air_uniform", 16); await page.keyboard.up("j"); await waitFrames(12);
  const dmg = hp0 - (await p2()).health;
  check("air → obito_air_uniform + connects", has(mv, "obito_air_uniform") && dmg > 0, `sheet=${(mv.spriteSheet||"").split("/").pop()} dmg=${dmg}`);
  await shot("air"); }
await reset(28);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(58)); await page.keyboard.down("s"); await page.keyboard.down("j");
  const mv = await waitPose("obito_downair_uniform", 16); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(12);
  const dmg = hp0 - (await p2()).health;
  check("down_air → obito_downair_uniform + connects", has(mv, "obito_downair_uniform") && dmg > 0, `sheet=${(mv.spriteSheet||"").split("/").pop()} dmg=${dmg}`);
  await shot("downair"); }

// ── Fwd+Heavy "KAMUI ROD COMBO" 3-hit rekka — chain must connect R1→R2→R3 ──
section("Kamui Rod Combo command rekka");
await reset(50);
{ const chain = []; const hp0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 80; i++) {
    const c = await cmd(); if (c?.move && !chain.includes(c.move)) chain.push(c.move);
    if (chain.includes("obitoRod3")) break;
    if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
    else await waitFrames(1);
  }
  await page.keyboard.up("d"); await waitFrames(14);
  const dmg = hp0 - (await p2()).health;
  check("Fwd+Heavy rekka opens obitoRod1", chain[0] === "obitoRod1", `chain=[${chain.join("→")}]`);
  check("rekka chains R1→R2→R3 (connecting)", chain.includes("obitoRod1") && chain.includes("obitoRod2") && chain.includes("obitoRod3"), `chain=[${chain.join("→")}]`);
  // Cumulative > the single biggest normal (heavy ~46) → proves multiple chain hits landed
  // (raw 32+38+60=130 scales down through combo-decay + Madara's defense to ~74).
  check("3-hit chain deals cumulative damage (multi-hit)", dmg > 60, `chain dmg=${dmg}`);
  await shot("rekka_finisher"); }

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_s2_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
