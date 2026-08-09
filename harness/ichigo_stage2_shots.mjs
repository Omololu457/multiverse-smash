// harness/ichigo_stage2_shots.mjs — Stage 2 evidence for Ichigo Kurosaki.
// Proves: the 5 standard normals (light/heavy/up/air/down_air) render + connect, AND the expanded
// "Zangetsu" command system — Fwd+Heavy 3-hit rekka (ichigoRekka1→2→3, cancel-on-hit) + the return
// settle, Down+Heavy, Back+Heavy, Fwd+Light, Dash+Heavy — each fires the right sprite + deals damage.
// Mirrors harness/miwa_stage2_shots.mjs. Usage: node harness/ichigo_stage2_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.ichigoCmd());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitSheet(needle, maxF = 26) { for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; await waitFrames(1); } return await p1(); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function reset(gap = 48) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=ichigo&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 1. GROUND NORMALS — light / heavy / up ──
console.log("\n── 1. Ground normals (light / heavy / up) ──");
for (const [nm, key, sheet] of [["light", "j", "foward_sword-slash_uniform"], ["heavy", "k", "sword_combo_1_uniform"], ["up", "i", "up_attack_uniform"]]) {
  await reset(nm === "heavy" ? 54 : 44);
  const hp0 = (await p2()).health; await page.keyboard.down(key);
  const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(14);
  check(`${nm} → ${sheet} + connects`, has(mv, sheet) && hp0 - (await p2()).health > 0, `sheet=${(mv.spriteSheet||"").split("/").pop()} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, `ichigo_s2_${nm}.png`) });
}

// ── 2. AIR NORMALS — air / down_air ──
console.log("\n── 2. Air normals (air / down_air) ──");
await reset(40);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("j");
  const mv = await waitSheet("launch_attack_2_uniform"); await page.keyboard.up("j"); await waitFrames(14);
  check("air → launch_attack_2_uniform + connects", has(mv, "launch_attack_2_uniform") && hp0 - (await p2()).health > 0, `sheet=${(mv.spriteSheet||"").split("/").pop()}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s2_air.png") }); }
await reset(30);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j");
  const mv = await waitSheet("down_air_attack_uniform", 14); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
  check("down_air → down_air_attack_uniform + connects", has(mv, "down_air_attack_uniform") && hp0 - (await p2()).health > 0, `sheet=${(mv.spriteSheet||"").split("/").pop()}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s2_downair.png") }); }

// ── 3. FWD+HEAVY REKKA — ichigoRekka1 → ichigoRekka2 → ichigoRekka3 (cancel-on-hit) ──
console.log("\n── 3. Zangetsu rekka (ichigoRekka1→2→3) + return settle ──");
await reset(52);
{ const chain = []; let sawReturn = false; await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 70; i++) {
    const c = await cmd(); if (c?.move && !chain.includes(c.move)) chain.push(c.move);
    if (c?.cast === "ichigoReturn") sawReturn = true;
    if (chain.includes("ichigoRekka3") && sawReturn) break;
    if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
    else await waitFrames(1);
    if (i === 6) await page.screenshot({ path: path.join(OUT, "ichigo_s2_rekka_mid.png") });
  }
  await page.keyboard.up("d"); await waitFrames(16);
  check("rekka advances R1 → R2 → R3", chain[0] === "ichigoRekka1" && chain.includes("ichigoRekka2") && chain.includes("ichigoRekka3"), `chain=[${chain.join(" → ")}]`);
  check("return-to-stance settle plays after finisher", sawReturn, `cast seen=${sawReturn}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s2_rekka_end.png") }); }

// ── 4. MID-CHAIN INTERRUPT — a whiffed opener must NOT continue ──
console.log("\n── 4. Mid-chain interrupt (whiff → no continue) ──");
await reset(52);
{ await page.evaluate(() => window.__harness.setP2X(99999)); const w = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 20; i++) { const m = (await p1()).currentMove; if (m && !w.includes(m)) w.push(m); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); }
  await page.keyboard.up("d");
  check("interrupt: whiffed R1 does NOT chain to R2", w.includes("ichigoRekka1") && !w.includes("ichigoRekka2"), `chain=[${w.join(" → ")}]`); }

// ── 5. SINGLE COMMAND NORMALS — Down+Heavy / Back+Heavy / Fwd+Light ──
console.log("\n── 5. Command normals (Down+Heavy / Back+Heavy / Fwd+Light) ──");
// Down+Heavy (low sweep) — hold s + tap k
await reset(50);
{ const hp0 = (await p2()).health; await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const mv = await waitSheet("down_attack_uniform", 16); await page.keyboard.up("s"); await waitFrames(16);
  check("Down+Heavy → down_attack_uniform + connects", has(mv, "down_attack_uniform") && hp0 - (await p2()).health > 0, `move=${(await cmd())?.move} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s2_down_heavy.png") }); }
// Back+Heavy (advancing launcher) — hold a (facing right) + tap k
await reset(46);
{ const hp0 = (await p2()).health; await page.keyboard.down("a"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const mv = await waitSheet("launch_attack_1_uniform", 16); await page.keyboard.up("a"); await waitFrames(16);
  check("Back+Heavy → launch_attack_1_uniform + connects", has(mv, "launch_attack_1_uniform") && hp0 - (await p2()).health > 0, `move=${(mv.spriteSheet||"").split("/").pop()} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s2_back_heavy.png") }); }
// Fwd+Light (hilt-jab) — hold d + tap j
await reset(40);
{ const hp0 = (await p2()).health; await page.keyboard.down("d"); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");
  const mv = await waitSheet("front_attack_punch_uniform", 16); await page.keyboard.up("d"); await waitFrames(14);
  check("Fwd+Light → front_attack_punch_uniform + connects", has(mv, "front_attack_punch_uniform") && hp0 - (await p2()).health > 0, `move=${(mv.spriteSheet||"").split("/").pop()} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s2_fwd_light.png") }); }

// ── 6. DASH+HEAVY — double-tap d (dash) then k during the dash window ──
console.log("\n── 6. Dash attack (Dash+Heavy) ──");
await reset(70);
{ const hp0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.up("d"); await waitFrames(1); await page.keyboard.down("d"); // double-tap → dash
  await waitFrames(1); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const mv = await waitSheet("double_dash_combo_uniform", 18); await page.keyboard.up("d"); await waitFrames(16);
  check("Dash+Heavy → double_dash_combo_uniform + connects", has(mv, "double_dash_combo_uniform") && hp0 - (await p2()).health > 0, `move=${(mv.spriteSheet||"").split("/").pop()} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s2_dash_atk.png") }); }

check("no JS page errors (ex-portrait 404)", jsErrors.filter(e => !/portrait/.test(e)).length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
