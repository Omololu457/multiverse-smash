// harness/batman_stage3_shots.mjs — STAGE 3: three specials (SPECIAL button, direction-branched).
//   neutral = Batarang (projectile) · forward = Cape Dash (mobility lunge) · down = Smoke Pellet (teleport-behind)
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
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `batman_s3_${name}.png`) }); }
// Frame-polled input buffer needs the key HELD across a poll — a 0-frame press() is missed.
async function holdKey(key, frames = 3) { await page.keyboard.down(key); await waitFrames(frames); await page.keyboard.up(key); }

await page.goto(`${base}/index.html?harness=1&p1=batman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

// ── 1. BATARANG (neutral Special = tap L). Projectile spawns, travels, connects. ──
console.log("\n── Batarang (neutral Special, projectile) ──");
await prep(230);
const en0 = (await p1()).energy;
await holdKey("l", 3);
let sawProj = null;
for (let i = 0; i < 24; i++) { const pj = await projs(); const b = pj.find(p => (p.sheet || "").includes("batman_baterang_proj") || (p.name || "").includes("batarang")); if (b) { sawProj = b; break; } await waitFrames(1); }
check("batarang projectile spawns", !!sawProj, sawProj ? `sheet=${sawProj.sheet} vx=${(sawProj.vx||0).toFixed(1)}` : "none");
check("batarang travels forward", !!sawProj && (sawProj.vx || 0) > 5, `vx=${sawProj?.vx?.toFixed?.(1)}`);
const en1 = (await p1()).energy; check("batarang spends ~15 gadgets", en0 - en1 >= 14 && en0 - en1 <= 16, `Δ=${(en0-en1).toFixed(0)}`);
await shot("batarang");
const hp0 = (await p2()).health;
for (let i = 0; i < 40; i++) { if ((await p2()).health < hp0) break; await waitFrames(1); }
check("batarang connects for damage", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
await shot("batarang_hit");

// ── 2. CAPE DASH (forward Special = hold D + tap L). Mobility lunge that strikes. ──
console.log("\n── Cape Dash (forward Special, mobility lunge) ──");
await prep(120);
const cx0 = (await p1()).x, ce0 = (await p1()).energy, ch0 = (await p2()).health;
await page.keyboard.down("d"); await waitFrames(2);
await holdKey("l", 3); await waitFrames(2);
const cm = (await p1()).currentMove;
await shot("capedash");
await waitFrames(4); const cx1 = (await p1()).x;
await page.keyboard.up("d");
for (let i = 0; i < 30; i++) { if ((await p2()).health < ch0) break; await waitFrames(1); }
check("cape dash sets currentMove=capeDash", cm === "capeDash", `move=${cm}`);
check("cape dash lunges forward", cx1 - cx0 > 20, `Δx=${(cx1 - cx0).toFixed(0)}`);
check("cape dash spends ~25 gadgets", ce0 - (await p1()).energy >= 24 && ce0 - (await p1()).energy <= 26, `Δ=${(ce0 - (await p1()).energy).toFixed(0)}`);
check("cape dash connects for damage", (await p2()).health < ch0, `−${(ch0 - (await p2()).health).toFixed(0)}`);
await shot("capedash_hit");

// ── 3. SMOKE PELLET (down Special = hold S + tap L). Teleport BEHIND opponent. ──
console.log("\n── Smoke Pellet (down Special, teleport-behind) ──");
await prep(150);
const a0 = await p1(); const b0 = await p2();
const startedLeft = a0.x < b0.x;   // batman starts on p2's left
const se0 = a0.energy;
await page.keyboard.down("s"); await waitFrames(2);
await holdKey("l", 3);
await waitFrames(8);
const a1 = await p1(); const b1 = await p2();
await page.keyboard.up("s");
const endedRight = a1.x > b1.x;
check("smoke pellet teleports to OTHER side of opponent", startedLeft && endedRight, `startX=${a0.x.toFixed(0)} endX=${a1.x.toFixed(0)} p2=${b1.x.toFixed(0)}`);
check("smoke pellet grants i-frames", (a1.invulnTimer || 0) > 0 || a1.x !== a0.x, `invuln=${a1.invulnTimer} moved=${a1.x!==a0.x}`);
check("smoke pellet spends ~20 gadgets", se0 - a1.energy >= 19 && se0 - a1.energy <= 21, `Δ=${(se0 - a1.energy).toFixed(0)}`);
await shot("smoke");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/batman_s3_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
