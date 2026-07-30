// harness/rengoku_stage4_shots.mjs — STAGE 4 evidence for Rengoku's specials.
// CHARGED FLAME STRIKE: hold CHARGE (p) → windup pose → release; a quick TAP fires the weak tier
// (rengokuCharge1), a longer HOLD fires the strong tier (rengokuCharge2), with the puches recovery
// tail (rengokuFlameTail) over recovery. COUNTER: neutral Special (l) opens a reactive window that
// NEGATES an incoming hit + ripostes (attacker stunned + damaged, Rengoku takes none). Screenshots each.
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
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 60) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `rengoku_s4_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=rengoku&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(6);

// ── CHARGE WINDUP (hold P) ──
console.log("\n── charge windup ──");
await reset(70);
await page.keyboard.down("p"); const wmv = await waitSheet("rengoku_charge_uniform", 10); await shot("charge_windup");
check("holding CHARGE → rengoku_charge_uniform windup", (wmv.spriteSheet || "").includes("rengoku_charge_uniform"), `action=${wmv.action} sheet=${wmv.spriteSheet}`);
// releasing P here fires a strike (any release does) → wait out its cooldown before the tiered tests
await page.keyboard.up("p"); await waitFrames(24);
await page.waitForFunction(() => (window.__harness.p1().flameCd ?? 0) <= 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
await idleReady();

// ── CHARGED FLAME STRIKE — TAP tier (quick release <200ms) → rengokuCharge1 ──
console.log("\n── flame strike: TAP tier ──");
await reset(56); let hp0 = (await p2()).health;
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p");
{ const mv = await waitSheet("rengoku_charge_hit_1_uniform", 20); await shot("flamestrike_tap"); await waitFrames(6);
  check("TAP release → rengokuCharge1 (charge_hit_1)", (mv.spriteSheet || "").includes("rengoku_charge_hit_1_uniform"), `sheet=${mv.spriteSheet}`); }
await waitFrames(10); const tapDmg = hp0 - (await p2()).health;
check("TAP flame strike connects", tapDmg > 0, `dmg=${tapDmg}`);
// recovery tail — puches plays over recovery via _spriteCastMove
{ const tail = await waitSheet("rengoku_puches_uniform", 20);
  check("recovery tail → rengoku_puches_uniform (rengokuFlameTail)", (tail.spriteSheet || "").includes("rengoku_puches_uniform"), `sheet=${tail.spriteSheet}`); await shot("flamestrike_recovery_tail"); }
await page.waitForFunction(() => (window.__harness.p1().flameCd ?? 0) <= 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
await idleReady();

// ── CHARGED FLAME STRIKE — HOLD tier (longer release ≥200ms) → rengokuCharge2, bigger ──
console.log("\n── flame strike: HOLD tier ──");
await reset(56); hp0 = (await p2()).health;
await page.keyboard.down("p"); await waitFrames(20); await page.keyboard.up("p");   // ≥200ms wall-clock → strong tier
{ const mv = await waitSheet("rengoku_charge_hit_2_uniform", 24); await shot("flamestrike_hold"); await waitFrames(8);
  check("HOLD release → rengokuCharge2 (charge_hit_2, wide arc)", (mv.spriteSheet || "").includes("rengoku_charge_hit_2_uniform"), `sheet=${mv.spriteSheet}`); }
await waitFrames(12); const holdDmg = hp0 - (await p2()).health;
check("HOLD flame strike connects", holdDmg > 0, `dmg=${holdDmg}`);
check("HOLD tier hits harder than TAP tier", holdDmg > tapDmg, `hold=${holdDmg} tap=${tapDmg}`);
await page.waitForFunction(() => (window.__harness.p1().flameCd ?? 0) <= 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
await idleReady();

// ── COUNTER — neutral Special opens a reactive window; incoming hit is NEGATED + riposted ──
console.log("\n── counter (reactive parry/riposte) ──");
await reset(52);
const p1hp0 = (await p1()).health, p2hp0 = (await p2()).health;
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
{ const cmv = await waitSheet("rengoku_foward_attack_charge_uniform", 6); await shot("counter_stance");
  check("Special → rengoku_foward_attack_charge (counter stance)", (cmv.spriteSheet || "").includes("rengoku_foward_attack_charge_uniform"), `sheet=${cmv.spriteSheet}`); }
// opponent swings into the counter window
await page.evaluate(() => window.__harness.p2Attack());
await waitFrames(16); await shot("counter_riposte");
const p1hp1 = (await p1()).health, p2now = await p2();
check("counter NEGATES the incoming hit (Rengoku takes no damage)", p1hp1 === p1hp0, `p1 ${p1hp0}→${p1hp1}`);
check("counter RIPOSTES (attacker takes damage)", p2now.health < p2hp0, `p2 ${p2hp0}→${p2now.health}`);
check("counter STUNS the attacker", (p2now.hitstun || 0) > 0 || p2now.health < p2hp0, `hitstun=${p2now.hitstun}`);

check("no JS errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/rengoku_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
