// harness/zenitsu_stage5_shots.mjs — STAGE 5: Ultimate "Godspeed" dash-through slice. Explicit
// assertions on all the novel properties:
//   • connects at SAME level + Zenitsu passes THROUGH to the far side (high damage)
//   • WHIFFS on a level mismatch (Zenitsu airborne / opponent grounded) — cooldown still spent
//   • UNBLOCKABLE — lands FULL through a held guard (contrast: the Stage-3 special only chips)
//   • COOLDOWN-gated NOT energy: ultimateCooldown counts down, blocks recast, resets; energy stays 0
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
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap, block = false) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(b => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(b); }, block);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `zenitsu_s5_${name}.png`) }); }
async function pressUlt() { await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); }

await page.goto(`${base}/index.html?harness=1&p1=zenitsu`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

// ── no energy bar (cooldown-gated, not energy-gated) ──
console.log("\n── cooldown-gated, NOT energy ──");
// Zenitsu's char data is maxEnergy 0; the engine floors maxEnergy to 1 (Math.max(1,…), div-by-zero
// guard) for EVERY no-energy char (Toji/Tanjiro/…). So "no energy bar" reads as maxEnergy 1 in-engine.
check("no meaningful energy bar (maxEnergy floored 0→1)", (await p1()).maxEnergy <= 1, `maxEnergy=${(await p1()).maxEnergy}`);

// ── SAME LEVEL: connects + passes through ──
console.log("\n── same-level: connects & dashes THROUGH ──");
await prep(70);
const oppX = (await p2()).x;
const zx0 = (await p1()).x;
const hp0 = (await p2()).health;
await pressUlt();
let sawUlt = false;
for (let i = 0; i < 20; i++) { const a = await p1(); if (a.currentMove === "zenUltimate") { sawUlt = true; if (i === 2) await shot("connect"); } await waitFrames(1); }
await waitFrames(6);
const dmg = hp0 - (await p2()).health;
const zx1 = (await p1()).x;
const cdAfter = (await p1()).ultCooldown;
const whiff1 = (await p1()).zenUltWhiff;
check("ult fires zenUltimate pose", sawUlt, "");
check("SAME-LEVEL: connects for high (ultimate-tier) damage", dmg > 120, `−${dmg.toFixed(0)}`);
check("not flagged a whiff at same level", whiff1 === false, `whiff=${whiff1}`);
check("dashes THROUGH to the opponent's far side", zx1 > oppX, `zBefore=${zx0.toFixed(0)} oppX=${oppX.toFixed(0)} zAfter=${zx1.toFixed(0)}`);
check("sets a cooldown after firing", cdAfter > 0, `ultCooldown=${cdAfter}`);

// ── LEVEL MISMATCH: whiffs (Zenitsu airborne, opponent grounded) ──
console.log("\n── level mismatch: WHIFFS (cooldown still spent) ──");
await prep(70);
await page.evaluate(() => window.__harness.liftP1(90));   // put Zenitsu airborne; opponent stays grounded
await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
const hpM0 = (await p2()).health;
await pressUlt();
let sawUltM = false;
for (let i = 0; i < 16; i++) { const a = await p1(); if (a.currentMove === "zenUltimate") { sawUltM = true; if (i === 2) await shot("whiff"); } await waitFrames(1); }
await waitFrames(6);
const dmgM = hpM0 - (await p2()).health;
const whiffM = (await p1()).zenUltWhiff;
const cdM = (await p1()).ultCooldown;
check("mismatch: ult still fires (dash executes)", sawUltM, "");
check("mismatch: deals NO damage (whiffs)", dmgM === 0, `−${dmgM.toFixed(0)}`);
check("mismatch: flagged as a level whiff", whiffM === true, `whiff=${whiffM}`);
check("mismatch: cooldown STILL spent (no free refund)", cdM > 0, `ultCooldown=${cdM}`);

// ── UNBLOCKABLE: full damage through a held guard ──
console.log("\n── UNBLOCKABLE: lands full through a held guard ──");
await prep(70, true);   // P2 holds guard (force-block)
const guarding = (await p2()).blocking;
const hpB0 = (await p2()).health;
await pressUlt();
for (let i = 0; i < 20; i++) { const a = await p1(); if (a.currentMove === "zenUltimate" && i === 2) await shot("unblockable"); await waitFrames(1); }
await waitFrames(6);
const dmgB = hpB0 - (await p2()).health;
check("opponent is actually guarding", guarding === true, `blocking=${guarding}`);
check("UNBLOCKABLE: lands FULL through guard (not 12% chip)", dmgB > 120, `−${dmgB.toFixed(0)}`);

// ── COOLDOWN: counts down, blocks recast, resets; costs NO energy ──
console.log("\n── cooldown counts down / blocks recast / resets (no energy cost) ──");
await prep(70);
const eBefore = (await p1()).energy;
await pressUlt(); await waitFrames(6);
const cdA = (await p1()).ultCooldown;
const eAfter = (await p1()).energy;
check("cooldown starts ~8s (≈480f)", cdA > 400 && cdA <= 480, `ultCooldown=${cdA}`);
check("ult spends NO energy (unchanged before→after)", eAfter === eBefore, `${eBefore}→${eAfter}`);
await waitFrames(30);
const cdB = (await p1()).ultCooldown;
check("cooldown counts DOWN over time", cdB < cdA && cdB > 0, `${cdA}→${cdB}`);
// recast while on cooldown → BLOCKED: the cooldown keeps counting down (a fire would RESET it to ~480).
await waitGrounded();
const cdPre = (await p1()).ultCooldown;
await pressUlt(); await waitFrames(6);
const cdPost = (await p1()).ultCooldown;
check("recast BLOCKED while on cooldown (cd keeps ticking, not reset)", cdPost < cdPre && cdPost < 470, `${cdPre}→${cdPost}`);
// resets when cleared → usable again
await page.evaluate(() => window.__harness.resetUlt?.());
await prep(70);
const hpU0 = (await p2()).health;
await pressUlt(); await waitFrames(20);
check("usable again after cooldown clears", ((hpU0 - (await p2()).health)) > 120, `−${(hpU0 - (await p2()).health).toFixed(0)}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/zenitsu_s5_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
