// harness/minato_stage2.test.mjs — STAGE 2: Minato's 5 normals + "Yellow Flash Rush"
// command chain (Fwd+Heavy rekka, cancel-on-hit) + 2 pokes (Fwd+Light Floor Combo,
// Back+Heavy Melee Rush). Verifies: each resolves to the right minato_*_uniform sheet
// (no fallback box), connects for damage, the chain advances only on a clean hit
// (mid-chain interrupt on whiff), and the pokes fire. Mirrors tobirama_stage2.test.mjs.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `minato_s2_${name}.png`) }); return; }
  const padX = 100, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `minato_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 55) { await waitGrounded(); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2); }
async function waitSheet(sheet, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
const has = (mv, s) => (mv.spriteSheet || "").includes(s);

await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(5);

// ── 5 NEUTRAL NORMALS ──────────────────────────────────────────────
const ground = [
  ["light", "j", "minato_foward_kick_uniform"],
  ["heavy", "k", "minato_twornado_kick_uniform"],
  ["upAttack", "i", "minato_up_attack_uniform"],
];
for (const [name, key, sheet] of ground) {
  await setupAdjacent();
  const hp0 = (await p2()).health;
  await page.keyboard.down(key);
  const mv = await waitSheet(sheet);
  check(`${name}: sprite → ${sheet}`, has(mv, sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
  await crop(name);
  await page.keyboard.up(key); await waitFrames(22);
  const hp1 = (await p2()).health;
  check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  await waitFrames(14);
}

// AIR neutral: air (J airborne)
await setupAdjacent(46);
{
  const hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1(40));
  await page.keyboard.down("j");
  const mv = await waitSheet("minato_super_up_attack_1_uniform");
  check(`air: sprite → minato_super_up_attack_1_uniform`, has(mv, "minato_super_up_attack_1_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
  await crop("air");
  await page.keyboard.up("j"); await waitFrames(14);
  const hp1 = (await p2()).health;
  check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
}
await waitGrounded(); await waitFrames(10);

// AIR down: down_air (S+J airborne, above dummy)
await setupAdjacent(28);
{
  const hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1(54));
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
  const mv = await waitSheet("minato_down_air_attack_uniform", 6);
  check(`down_air: sprite → minato_down_air_attack_uniform`, has(mv, "minato_down_air_attack_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
  await crop("downAir");
  await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
  const hp1 = (await p2()).health;
  check(`down_air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
}
await waitGrounded(); await waitFrames(10);

// prep() — settle to neutral, clear leftover held-input, heal + reposition the dummy (mirrors tobirama_stage3).
const seen = new Map();
async function rec() { const a = await p1(); if (a.currentMove) seen.set(a.currentMove, a.spriteSheet || null); return a; }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

// ── FWD+HEAVY CHAIN (cancel-on-hit): minatoRush1 → minatoRush2 → minatoRushFin ──
await prep(46);
{
  const chain = [];
  const hp0 = (await p2()).health;
  await page.keyboard.down("d");                                                    // hold forward the whole chain
  await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");   // opener: Fwd+Heavy → minatoRush1
  for (let i = 0; i < 52; i++) {
    const c = await rec();
    if (c.currentMove && !chain.includes(c.currentMove)) { chain.push(c.currentMove); await crop(c.currentMove); }
    if (chain.includes("minatoRushFin")) break;
    if (c.rekkaNext && c.cmdHitLanded && c.attackPhase === "recovery") {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1);
    } else { await waitFrames(1); }
  }
  await page.keyboard.up("d"); await waitFrames(24);
  const hp1 = (await p2()).health;
  check("chain stage 1 = minatoRush1", chain[0] === "minatoRush1", `chain=[${chain.join(" → ")}]`);
  check("chain stage 2 = minatoRush2 (cancel on hit)", chain.includes("minatoRush2"), `chain=[${chain.join(" → ")}]`);
  check("chain stage 3 = minatoRushFin finisher", chain.includes("minatoRushFin"), `chain=[${chain.join(" → ")}]`);
  check("full chain dealt meaningful damage", hp0 - hp1 >= 80, `dmg=${(hp0 - hp1).toFixed(0)}`);
  check("Rush1 sheet", (seen.get("minatoRush1") || "").includes("melee_combo_1_uniform"), `sheet=${seen.get("minatoRush1")}`);
  check("Rush2 sheet", (seen.get("minatoRush2") || "").includes("yellow_falsh_combo_2_uniform"), `sheet=${seen.get("minatoRush2")}`);
  check("RushFin sheet", (seen.get("minatoRushFin") || "").includes("super_down_attack_uniform"), `sheet=${seen.get("minatoRushFin")}`);
}

// ── MID-CHAIN INTERRUPT: whiffed Rush1 must NOT advance (cancel-on-HIT rule) ──
await prep(40);
await page.evaluate(() => window.__harness.setP2X(99999));   // dummy far away → opener whiffs
{
  const wchain = [];
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 18; i++) {
    const m = (await p1()).currentMove;
    if (m && !wchain.includes(m)) wchain.push(m);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1);
  }
  await page.keyboard.up("d");
  check("interrupt: whiffed opener fired minatoRush1", wchain.includes("minatoRush1"), `chain=[${wchain.join(" → ")}]`);
  check("interrupt: whiff did NOT advance to minatoRush2", !wchain.includes("minatoRush2"), `chain=[${wchain.join(" → ")}]`);
}
await waitFrames(18);

// ── POKE: Fwd+Light → Floor Combo ──
await prep(52);
{
  const hp0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("j"); await waitFrames(4);
  const c = await rec(); await crop("floorCombo");
  await page.keyboard.up("j"); await page.keyboard.up("d"); await waitFrames(24);
  const hp1 = (await p2()).health;
  check("poke Fwd+Light = minatoFloorCombo", c.currentMove === "minatoFloorCombo", `move=${c.currentMove} action=${c.action}`);
  check("Floor Combo sheet", (seen.get("minatoFloorCombo") || "").includes("yellow_fash_floor_combo_uniform"), `sheet=${seen.get("minatoFloorCombo")}`);
  check("poke Fwd+Light connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
}
await waitFrames(14);

// ── POKE: Back+Heavy → Melee Rush ──
await prep(52);
{
  await page.keyboard.down("a"); await page.keyboard.down("k"); await waitFrames(4);
  const c = await rec(); await crop("meleeRush");
  await page.keyboard.up("k"); await page.keyboard.up("a"); await waitFrames(18);
  check("poke Back+Heavy = minatoMeleeRush", c.currentMove === "minatoMeleeRush", `move=${c.currentMove} action=${c.action}`);
  check("Melee Rush sheet", (seen.get("minatoMeleeRush") || "").includes("melee_combo_2_uniform"), `sheet=${seen.get("minatoMeleeRush")}`);
}

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/minato_s2_*_crop.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
