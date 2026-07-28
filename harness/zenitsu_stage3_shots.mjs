// harness/zenitsu_stage3_shots.mjs — STAGE 3: Thunder Breathing First Form (Thunderclap and Flash)
// dash-strike special. Asserts: it fires on Neutral+Special, resolves to the zenThunderclap sprite,
// LUNGES forward (dash-in), connects for heavy damage, is COOLDOWN-gated (can't re-fire while
// thunderCd>0, no energy cost), and is BLOCKABLE (a blocking opponent chip-only). Screenshots each.
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
async function prep(gap, block = false) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(b => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.setP2Blocking?.(b); }, block);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `zenitsu_s3_${name}.png`) }); }
// press Special (key "l" in P1 controls) with neutral direction
async function pressSpecial() { await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); }

await page.goto(`${base}/index.html?harness=1&p1=zenitsu`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

console.log("\n── Thunder Breathing 1st Form: Thunderclap & Flash (Neutral+Special dash-strike) ──");
await prep(120);   // start FAR so the lunge has to close the gap
const x0 = (await p1()).x;
const hp0 = (await p2()).health;
await pressSpecial();
// capture the dash pose while active
let dashSheet = "", moved = 0, connected = false, sawMove = false;
for (let i = 0; i < 26; i++) {
  const a = await p1();
  if (a.currentMove === "zenThunderclap") { sawMove = true; if (a.spriteSheet) dashSheet = a.spriteSheet; }
  await waitFrames(1);
}
await shot("thunderclap");
await waitFrames(8);
moved = (await p1()).x - x0;
const dmg = hp0 - (await p2()).health;
const cdAfter = (await p1()).thunderCd;
check("special fires zenThunderclap", sawMove, `move seen=${sawMove}`);
check("resolves to zenThunderclap sprite", dashSheet.includes("zenitsu_thunderclap_uniform"), `sheet=${dashSheet}`);
check("LUNGES forward (dash-in)", moved > 40, `Δx=${moved.toFixed(0)}`);
check("connects for heavy damage", dmg > 60, `−${dmg.toFixed(0)}`);
check("sets cooldown after firing", cdAfter > 0, `thunderCd=${cdAfter}`);

console.log("\n── COOLDOWN gate (no energy cost; can't re-fire while thunderCd>0) ──");
// immediately try again while still on cooldown — must NOT fire
await page.evaluate(() => { window.__harness.resetFighterInput("p1"); });
await waitGrounded();
const cdNow = (await p1()).thunderCd;
const hpBefore = (await p2()).health;
await pressSpecial(); await waitFrames(10);
const firedAgain = (await p1()).currentMove === "zenThunderclap" || ((await p2()).health < hpBefore);
check("still on cooldown right after use", cdNow > 0, `thunderCd=${cdNow}`);
check("2nd press blocked by cooldown (no re-fire)", !firedAgain, `refired=${firedAgain}`);

console.log("\n── after cooldown expires, usable again ──");
await page.waitForFunction(() => (window.__harness.p1().thunderCd || 0) === 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
await prep(120);
const hp2 = (await p2()).health;
await pressSpecial(); await waitFrames(26);
check("usable again once cooldown clears", (hp2 - (await p2()).health) > 40, `−${(hp2 - (await p2()).health).toFixed(0)}`);

console.log("\n── BLOCKABLE (opponent guarding takes chip only) ──");
await page.waitForFunction(() => (window.__harness.p1().thunderCd || 0) === 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
await prep(96);   // wider gap so the lunge lands while still in front of the guard
// P2 guards PERSISTENTLY via the harness force-guard flag (the passive dummy reads no input, and
// isBlocking is recomputed each frame — _forceGuard makes updatePlayer keep it up through the strike).
await page.evaluate(() => window.__harness.setP2ForceBlock(true)); await waitFrames(3);
const guardOn = (await p2()).isBlocking;
const hpB0 = (await p2()).health;
await pressSpecial(); await waitFrames(26);
const chip = hpB0 - (await p2()).health;
await shot("blocked");
await page.evaluate(() => window.__harness.setP2ForceBlock(false));
check("opponent actually guarding (isBlocking held)", guardOn === true, `isBlocking=${guardOn}`);
check("blockable — guarding opponent takes chip only (not full)", chip >= 0 && chip < 40, `chip=−${chip.toFixed(0)}`);

console.log("\n── no projectile spawned (pure melee dash-strike) ──");
check("no projectile from Thunderclap", (await projs()).length === 0, `count=${(await projs()).length}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/zenitsu_s3_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
