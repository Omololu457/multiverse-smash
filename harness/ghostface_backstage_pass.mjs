// harness/ghostface_backstage_pass.mjs — GHOSTFACE BACKSTAGE PASS (spec §4.2). Special = a dash-off-screen
// teleport with a trailing PHANTOM hitbox, branch-selected by the modifier held at cast time:
//   • neutral            → SIDE SWITCH: cross to the opponent's far side; phantom hit lands.
//   • hold BACK          → GETAWAY: same-side reappear + evasive i-frames; phantom hit lands.
//   • hold an ATTACK btn → FAKEOUT: reposition but the phantom hit is CANCELLED (no damage).
//   • hold GRAB/CHARGE   → SWAP: the buffered motion picks the companion; Ghostface becomes them.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const snap = () => page.evaluate(() => window.__harness.p1Snap());
const bp = () => page.evaluate(() => window.__harness.bp());
const gfSwap = () => page.evaluate(() => window.__harness.gfSwap());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

async function reset(skin = "ghostfaceBilly", gap = 70) {
  await page.evaluate(() => { window.__harness.expireGfSwap?.(); });
  await waitFrames(4);
  await page.evaluate(s => { window.__harness.setSkin("p1", s); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); }, skin);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(3);
}
async function tapDir(k) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); await waitFrames(1); }

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 1. SIDE SWITCH (neutral Special): cross to the opponent's far side + phantom hit ──
console.log("\n── 1. Side Switch (neutral Special) ──");
await reset("ghostfaceBilly", 46);   // close spacing so the "on the way out" phantom connects
{
  const a = await p1(), b0 = await p2();
  const startedLeft = a.x < b0.x;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  const mid = await bp();
  check("Backstage Pass is active (switch)", mid.active && mid.branch === "switch", `active=${mid.active} branch=${mid.branch}`);
  await waitFrames(24);
  const a2 = await p1(), b1 = await p2();
  const nowRight = a2.x > b1.x;
  check("crossed to the opponent's FAR side", startedLeft ? nowRight : !nowRight, `startLeft=${startedLeft} p1=${Math.round(a2.x)} p2=${Math.round(b1.x)}`);
  check("phantom hit connected (hitLanded)", (await bp()).hitLanded === true, `hitLanded=${(await bp()).hitLanded} p2 ${b0.health}→${b1.health}`);
  check("Backstage Pass ended", (await bp()).active === false);
}

// ── 2. GETAWAY (Back+Special): evasive i-frames, same-side reappear ──
console.log("\n── 2. Getaway (Back+Special) ──");
await reset();
{
  const a = await p1(), b0 = await p2();
  const backKey = a.facing === 1 ? "a" : "d";
  await page.keyboard.down(backKey); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  const mid = await bp();
  check("Backstage Pass is active (getaway)", mid.active && mid.branch === "getaway", `active=${mid.active} branch=${mid.branch}`);
  let maxInv = 0; for (let i = 0; i < 16; i++) { maxInv = Math.max(maxInv, (await snap()).invulnTimer || 0); await waitFrames(1); }
  check("Getaway grants evasive i-frames", maxInv > 0, `maxInv=${maxInv}`);
  await page.keyboard.up(backKey); await waitFrames(6);
  const a2 = await p1(), b1 = await p2();
  const sameSide = (a.x < b0.x) === (a2.x < b1.x);
  check("stayed on the SAME side (retreat, not cross-up)", sameSide, `before ${Math.round(a.x)} vs ${Math.round(b0.x)}; after ${Math.round(a2.x)} vs ${Math.round(b1.x)}`);
}

// ── 3. FAKEOUT (attack-button + Special): reposition, phantom hit CANCELLED ──
console.log("\n── 3. Fakeout (Light+Special) ──");
await reset();
{
  await page.keyboard.down("j");                 // hold an attack button
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("j");   // release promptly so no trailing light spam
  const mid = await bp();
  check("Backstage Pass is active (fakeout)", mid.active && mid.branch === "fakeout", `active=${mid.active} branch=${mid.branch}`);
  await waitFrames(24);
  // The phantom hit is CANCELLED on Fakeout (hitLanded never trips) — precise vs. any incidental normal-attack damage.
  check("Fakeout cancels the phantom hit (hitLanded stays false)", (await bp()).hitLanded === false, `hitLanded=${(await bp()).hitLanded}`);
}

// ── 4. SWAP (Grab + motion + Special): the motion picks the companion, Ghostface becomes them ──
console.log("\n── 4. Swap branch (Grab + QCF → sasuke) ──");
await reset("ghostfaceBilly", 200);   // opponent far so a forward motion can't walk into grab range (grab-same-frame stays harmless)
{
  await tapDir("s"); await tapDir("d");          // roll QCF ↓→ FIRST (motion = companion pre-pick = slot 0)
  await page.keyboard.down("o");                 // hold Grab = "make this a swap"
  await page.keyboard.down("l"); await waitFrames(1);
  const midSwap = await bp();
  await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("o");
  check("swap Backstage Pass is active", midSwap.active && midSwap.branch === "swap", `active=${midSwap.active} branch=${midSwap.branch}`);
  await waitFrames(18);
  const g = await gfSwap();
  check("swap branch became the pool[0] companion (sasuke)", g.active && g.rosterKey === "sasuke", `active=${g.active} roster=${g.rosterKey}`);
  check("swap wears the _crew affiliation skin", g.recolorTag === "crew", `recolorTag=${g.recolorTag}`);
}

// ── 5. SWAP with a different motion (Grab + QCB → itachi) — motion picks WHICH of the 4 ──
console.log("\n── 5. Swap branch (Grab + QCB → itachi) ──");
await reset("ghostfaceBilly", 200);
{
  await tapDir("s"); await tapDir("a");          // roll QCB ↓← = slot 1
  await page.keyboard.down("o");
  await page.keyboard.down("l"); await waitFrames(1);
  await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("o");
  await waitFrames(18);
  const g = await gfSwap();
  check("QCB+Grab → pool[1] companion (itachi)", g.active && g.rosterKey === "itachi", `active=${g.active} roster=${g.rosterKey}`);
}

// ── 6. CHARGE is an interchangeable swap modifier (per spec "hold Grab OR Charge") ──
console.log("\n── 6. Swap modifier: Charge (no motion → slot 0) ──");
await reset("ghostfaceBilly", 200);
{
  await page.keyboard.down("p"); await waitFrames(6);   // hold Charge steady, then Special (no motion → default slot 0)
  await page.keyboard.down("l"); await waitFrames(1);
  await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("p");
  await waitFrames(18);
  const g = await gfSwap();
  check("Charge+Special (no motion) → swap into slot 0 (sasuke)", g.active && g.rosterKey === "sasuke", `active=${g.active} roster=${g.rosterKey}`);
}

// ── 7. DETERMINISM: the SAME motion always lands the SAME companion (user's Stage-3 rigor) ──
console.log("\n── 7. Determinism: QCF+Grab → sasuke every time (4×) ──");
const rep = [];
for (let i = 0; i < 4; i++) {
  await reset("ghostfaceBilly", 200);
  await tapDir("s"); await tapDir("d");
  await page.keyboard.down("o");
  await page.keyboard.down("l"); await waitFrames(1); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("o");
  await waitFrames(18);
  rep.push((await gfSwap()).rosterKey);
}
check("QCF+Grab 4× all → sasuke (deterministic, input-driven)", rep.length === 4 && rep.every(r => r === "sasuke"), `[${rep.join(", ")}]`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
