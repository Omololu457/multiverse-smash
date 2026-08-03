// TEMP DIAGNOSTIC — proves what each input actually does for the two "become another character" mechanics.
// A) Ghostface + CHARGE+↓ (the Companion SWAP trigger)   → should BECOME the companion + control its kit.
// B) Ghostface + Neutral+Special (the old Call-In)         → companion RUSHES IN once, player stays Ghostface.
// C) Naruto + DBF(↓←→)+Special (Transformation Jutsu T2)   → should BECOME the opponent + control its kit.
// D) Naruto + HCB(→↓←)+Special (Transformation Jutsu T1)   → VISUAL disguise only (moves stay Naruto's).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("console", m => { const t = m.text(); if (t.includes("[DIAG]")) console.log("   ·", t); });
page.on("pageerror", e => console.log("   PAGEERR", String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const d = seq.slice(0, -1), l = seq[seq.length - 1]; for (const k of d) await page.keyboard.press(k); await tap(l); }
async function boot(p1k, p2k) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1k}&p2=${p2k}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
  await waitFrames(25);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 70); await waitFrames(2);
}
// press a couple of grounded normals + a special, return damage dealt to p2 (proves a CONTROLLABLE kit)
async function comboDamage() {
  await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const h0 = (await p2()).health;
  await tap("j", 3); await waitFrames(10); await tap("k", 3); await waitFrames(10); await tap("l", 3); await waitFrames(18);
  return Math.round(h0 - (await p2()).health);
}

console.log("\n================ A) GHOSTFACE + CHARGE+↓  (Companion SWAP) ================");
await boot("ghostface", "rengoku");
await page.evaluate(() => window.__harness.setSkin("p1", "ghostfaceBilly"));
await waitFrames(2);
console.log("  before:", JSON.stringify(await p1().then(x => ({ key: x.key, sheet: x.spriteSheet }))));
await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.down("s"); await waitFrames(4); await page.keyboard.up("s"); await page.keyboard.up("p");
await waitFrames(3);
let a1 = await p1();
console.log("  after :", JSON.stringify({ key: a1.key, sheet: a1.spriteSheet, gfSwapActive: a1.gfSwapActive, target: a1.gfSwapTarget }));
await page.screenshot({ path: path.join(OUT, "diag_A_ghostface_charge_swap.png") });
const dmgA = await comboDamage();
console.log(`  RESULT A: became=${a1.key} (expect sasuke) · controllable kit dealt ${dmgA} dmg to p2`);

console.log("\n================ B) GHOSTFACE + Neutral+Special  (old Call-In) ================");
await boot("ghostface", "rengoku");
await page.evaluate(() => window.__harness.setSkin("p1", "ghostfaceBilly"));
await waitFrames(2);
const bBefore = (await p1()).key;
await tap("l", 3); await waitFrames(20);
const b1 = await p1();
await page.screenshot({ path: path.join(OUT, "diag_B_ghostface_callin.png") });
console.log(`  RESULT B: pressed Special · player is now=${b1.key} (still ghostface? ${b1.key === "ghostface"}) · gfSwapActive=${b1.gfSwapActive}`);

console.log("\n================ C) NARUTO + DBF(↓←→)+Special  (Transformation Jutsu TIER 2) ================");
await boot("naruto", "sasuke");
const cBefore = await p1();
console.log("  before:", JSON.stringify({ key: cBefore.key, sheet: cBefore.spriteSheet }));
await motion(["s", "a", "d", "l"]);   // DBF = down,left,right + Special
await waitFrames(6);
const c1 = await p1();
console.log("  after :", JSON.stringify({ key: c1.key, sheet: c1.spriteSheet }));
const tjC = await page.evaluate(() => window.__harness.p1TransformJutsu?.());
console.log("  tjState:", JSON.stringify(tjC));
await page.screenshot({ path: path.join(OUT, "diag_C_naruto_tier2.png") });
const dmgC = await comboDamage();
console.log(`  RESULT C: became=${c1.key} tjTier=${tjC?.tier} · kit dealt ${dmgC} dmg`);

console.log("\n================ D) NARUTO + HCB(→↓←)+Special  (Transformation Jutsu TIER 1) ================");
await boot("naruto", "sasuke");
await motion(["d", "s", "a", "l"]);   // HCB = right,down,left + Special
await waitFrames(6);
const d1 = await p1();
const tjD = await page.evaluate(() => window.__harness.p1TransformJutsu?.());
console.log(`  RESULT D: rosterKey=${d1.key} (expect naruto — visual only) tjTier=${tjD?.tier} name=${tjD?.name} sheet=${d1.spriteSheet}`);

await browser.close(); server.close();
