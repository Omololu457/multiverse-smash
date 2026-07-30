// harness/rengoku_stage3_shots.mjs — STAGE 3 evidence for Rengoku's branching combo chains.
// GROUND chain (Fwd+Heavy → Heavy → Heavy) + super branches (Special → super_foward / super_down),
// AIR chain (airborne Fwd+Heavy → Heavy → Heavy) + super branch (Special → super_down_air), and a
// mid-chain INTERRUPT test (whiff opener → Heavy must NOT advance). Screenshots the super connects.
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
async function adjacent(gap = 44) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `rengoku_s3_${name}.png`) }); }

// Drive a chain: press the opener, then each recovery frame tap Heavy (continue) unless branchAt maps
// the current stage → "l" (Special super-branch). Returns { chain, dmg, shotStage }.
async function driveChain({ air = false, branchAt = {}, shotAt = null } = {}) {
  await adjacent(air ? 40 : 44);
  const hp0 = (await p2()).health; const chain = []; let shotDone = false;
  if (air) await page.evaluate(() => window.__harness.liftP1(52));
  await page.keyboard.down("d");                                  // forward held for the opener
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 90; i++) {
    const c = await p1();
    if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove);
    if (shotAt && c.currentMove === shotAt && !shotDone) { await shot(shotAt); shotDone = true; }
    if (!c.attacking) break;
    if (c.attackPhase === "recovery") { const key = branchAt[c.currentMove] || "k"; await page.keyboard.down(key); await waitFrames(1); await page.keyboard.up(key); await waitFrames(1); }
    else await waitFrames(1);
  }
  await page.keyboard.up("d"); await waitFrames(8);
  return { chain, dmg: hp0 - (await p2()).health };
}

await page.goto(`${base}/index.html?harness=1&p1=rengoku&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(6);

// ── GROUND full normal chain: G1 → G2 → G3 ──
console.log("\n── ground chain (normal tier) ──");
{ const r = await driveChain({});
  check("ground chain G1→G2→G3", r.chain[0] === "rengokuG1" && r.chain.includes("rengokuG2") && r.chain.includes("rengokuG3"), `[${r.chain.join("→")}]`);
  check("ground chain deals combo damage", r.dmg > 50, `dmg=${r.dmg}`); }

// ── GROUND super branch off G2 (Special → super_foward) ──
console.log("\n── ground super branch (off G2) ──");
{ const r = await driveChain({ branchAt: { rengokuG2: "l" }, shotAt: "rengokuSuperFwd" });
  check("G1→G2→(Special)→SuperFwd", r.chain.includes("rengokuG2") && r.chain.includes("rengokuSuperFwd") && !r.chain.includes("rengokuG3"), `[${r.chain.join("→")}]`);
  check("super finisher amplifies damage", r.dmg > 60, `dmg=${r.dmg}`); }

// ── GROUND super branch off G3 (Special → super_down, launches) ──
console.log("\n── ground super branch (off G3, deepest) ──");
{ const r = await driveChain({ branchAt: { rengokuG3: "l" }, shotAt: "rengokuSuperDown" });
  check("G1→G2→G3→(Special)→SuperDown", r.chain.includes("rengokuG3") && r.chain.includes("rengokuSuperDown"), `[${r.chain.join("→")}]`); }

// ── AIR full chain: A1 → ABridge → A2 ──
console.log("\n── air chain (normal tier) ──");
{ const r = await driveChain({ air: true });
  check("air chain A1→ABridge→A2", r.chain[0] === "rengokuA1" && r.chain.includes("rengokuABridge") && r.chain.includes("rengokuA2"), `[${r.chain.join("→")}]`);
  check("air chain deals combo damage", r.dmg > 45, `dmg=${r.dmg}`); }

// ── AIR super branch off A2 (Special → super_down_air) ──
console.log("\n── air super branch (off A2) ──");
{ const r = await driveChain({ air: true, branchAt: { rengokuA2: "l" }, shotAt: "rengokuSuperAir" });
  check("A1→ABridge→A2→(Special)→SuperAir", r.chain.includes("rengokuA2") && r.chain.includes("rengokuSuperAir"), `[${r.chain.join("→")}]`); }

// ── MID-CHAIN INTERRUPT: whiff the opener → Heavy re-tap must NOT advance ──
console.log("\n── mid-chain interrupt ──");
{ await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x + 620), a.x);   // opponent far away → opener whiffs
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const open = (await p1()).currentMove;
  let inRec = false; for (let i = 0; i < 40; i++) { const p = await p1(); if (!p.attacking) break; if (p.attackPhase === "recovery") { inRec = true; break; } await waitFrames(1); }
  if (inRec) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); }
  const after = (await p1()).currentMove; await page.keyboard.up("d");
  check("interrupt: opener=G1, whiff does NOT advance to G2", open === "rengokuG1" && after !== "rengokuG2", `open=${open} after=${after}`); }

check("no JS errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/rengoku_s3_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
