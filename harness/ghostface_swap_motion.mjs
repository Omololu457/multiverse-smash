// harness/ghostface_swap_motion.mjs — the Companion SWAP is now MOTION + Special (Transformation-Jutsu style).
// Verifies (real presses): each motion → the correct pool companion (controllable), repeated motion is
// deterministic, the retained held-direction knife specials still fire and do NOT accidentally swap, and a
// neutral Special does nothing (Call-In retired). P1 faces RIGHT (opp placed to the right) so →=Forward.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const gfSwap = () => page.evaluate(() => window.__harness.gfSwap());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
// A motion + Special: press each direction (recorded on keydown), then tap Special (l).
async function swapMotion(dirKeys) {
  for (const k of dirKeys) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); await waitFrames(1); }
  await tap("l"); await waitFrames(4);
  return await gfSwap();
}
async function reset(skin = "ghostfaceBilly") {
  await page.evaluate(() => window.__harness.expireGfSwap());
  await waitFrames(3);
  await page.evaluate(s => { window.__harness.setSkin("p1", s); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetFighterInput?.("p1"); }, skin);
  // wait until Ghostface is idle + grounded so the next input starts a clean move
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 70); await waitFrames(2);
}
async function pollMove(frames = 14) { let m = null; for (let i = 0; i < frames; i++) { const c = await p1(); if (c.currentMove) { m = c.currentMove; break; } if (c.attacking && !m) m = "(attacking)"; await waitFrames(1); } return m; }

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await reset();

// key sequences (P1 faces right: →=d=Forward, ←=a=Back, ↓=s=Down)
const QCF = ["s", "d"], QCB = ["s", "a"], DBF = ["s", "a", "d"], DFB = ["s", "d", "a"];

// ── 1. Slot table now shows motions ──
console.log("\n── 1. Motion slot table (Billy) ──");
let g = await gfSwap();
const combos = Object.fromEntries(g.slots.map(s => [s.companion, s.combo]));
check("slot table maps companions → motions", g.slots.length === 4 && g.slots[0].combo.includes("Special"), JSON.stringify(g.slots.map(s => `${s.companion}:${s.combo}`)));

// ── 2. Each motion → its own companion (controllable) ──
console.log("\n── 2. Each motion → correct companion ──");
const cases = [["QCF ↓→", QCF, "sasuke"], ["QCB ↓←", QCB, "itachi"], ["DBF ↓←→", DBF, "chrollo"], ["DFB ↓→←", DFB, "killua"]];
for (const [name, seq, want] of cases) {
  await reset();
  const s = await swapMotion(seq);
  check(`${name} + Special → ${want}`, s.active && s.target === want && s.rosterKey === want, `got active=${s.active} target=${s.target}`);
}

// ── 3. RIGOR — same motion repeated → same companion every time ──
console.log("\n── 3. Repeated QCF → sasuke every time (5×) ──");
const rep = [];
for (let i = 0; i < 5; i++) { await reset(); const s = await swapMotion(QCF); rep.push(s.active ? s.target : "MISS"); }
check("QCF 5× all → sasuke", rep.length === 5 && rep.every(t => t === "sasuke"), `[${rep.join(", ")}]`);

// ── 4. Companion is genuinely controllable (deals damage) ──
console.log("\n── 4. Swapped companion is playable ──");
await reset();
let s4 = await swapMotion(DBF);   // → chrollo
check("became chrollo", s4.active && s4.target === "chrollo", `target=${s4.target}`);
// wait for the swap-in flash to clear so the companion is actionable, then point-blank the dummy and swing
await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "chrollo" && p.grounded && !p.attacking; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
const cp = await p1(); await page.evaluate(x => window.__harness.setP2X(x), cp.x + (cp.facing || 1) * 44);
await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
await waitFrames(2);
const h0 = (await p2()).health;
let dmg = 0;
for (let i = 0; i < 4 && dmg <= 0; i++) { await tap("j", 3); await waitFrames(14); dmg = Math.round(h0 - (await p2()).health); }
check("companion is controllable — its normals swing + connect (deal damage)", dmg > 0, `dmg=${dmg}`);
await page.screenshot({ path: path.join(OUT, "ghostface_swap_motion_chrollo.png") });

// ── 5. Retained knife specials still work AND don't swap ──
console.log("\n── 5. Held-direction knife specials intact (no accidental swap) ──");
await reset();
await page.keyboard.down("d"); await waitFrames(3); await page.keyboard.down("l"); const glMove = await pollMove(); await page.keyboard.up("l"); await page.keyboard.up("d"); const gl = await gfSwap(); await waitFrames(8);
check("hold → (F) + Special = Gutting Lunge (NOT a swap)", glMove === "gfLunge" && !gl.active, `move=${glMove} swap=${gl.active}`);
await reset();
await page.keyboard.down("s"); await waitFrames(3); await page.keyboard.down("l"); const lgMove = await pollMove(); await page.keyboard.up("l"); await page.keyboard.up("s"); const lg = await gfSwap(); await waitFrames(8);
check("hold ↓ (D) + Special = Low Gut (NOT a swap)", lgMove === "gfLowCut" && !lg.active, `move=${lgMove} swap=${lg.active}`);
await reset();
await page.keyboard.down("a"); await waitFrames(3); await page.keyboard.down("l"); const svMove = await pollMove(); await page.keyboard.up("l"); await page.keyboard.up("a"); const sv = await gfSwap(); await waitFrames(8);
check("hold ← (B) + Special = Stalk Vanish (NOT a swap)", !sv.active && sv.rosterKey === "ghostface", `move=${svMove} swap=${sv.active} roster=${sv.rosterKey}`);

// ── 6. Neutral Special does nothing (Call-In retired) ──
console.log("\n── 6. Neutral Special = no Call-In, no swap ──");
await reset();
await tap("l", 3); await waitFrames(10);
const nu = await gfSwap();
check("neutral Special → no swap, still Ghostface", nu.active === false && nu.rosterKey === "ghostface", `active=${nu.active}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
