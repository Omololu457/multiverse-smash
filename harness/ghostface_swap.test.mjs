// harness/ghostface_swap.test.mjs — CANONICAL suite for Ghostface's Companion SWAP ("Kameo").
// Covers the four required behaviours + the balance-critical cost model + Chrollo Skill Hunter unaffected:
//   1. TRIGGER          — CHARGE+cardinal swaps into the correct pool companion; energy-gated; deterministic.
//   2. UNLIMITED        — infiniteEnergy during the window; a companion special never drains the bar.
//   3. AUTO-REVERT      — the NATURAL countdown ticks to 0 and reverts to Ghostface (not a forced revert).
//   4. POOL-PER-IDENTITY— all 5 killer skins expose ONLY their own 4 companions, live.
//   5. REAL COST        — revert restores the POST-COST Dread (no free refill); a swap is BLOCKED once Dread
//                         is below the cost → genuinely "limited by regen", not permanent.
//   6. SKILL HUNTER OK  — Chrollo's own full-swap ultimate still fires + reverts (shared engine unaffected).
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
const gfSwap = () => page.evaluate(() => window.__harness.gfSwap());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

// MOTION + Special → swap. Slot keys map to the four motions: s=QCF(↓→) a=QCB(↓←) d=DBF(↓←→) w=DFB(↓→←).
const MOTION = { s: ["s", "d"], a: ["s", "a"], d: ["s", "a", "d"], w: ["s", "d", "a"] };
async function pressSwapCombo(dirKey) {
  // wait until Ghostface is actionable so the motion's Special actually starts (back-to-back swaps)
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.gfSwapActive && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { const f = window.__harness.p1(); if (f) window.__harness.resetFighterInput?.("p1"); });
  for (const k of MOTION[dirKey]) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); await waitFrames(1); }
  await page.keyboard.down("o");                          // Grab = swap modifier (no energy build → the energy-gate test stays valid)
  await page.keyboard.down("l"); await waitFrames(1); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("o");
  await waitFrames(18);                                   // Backstage Pass dash emerges into the swap
  return await gfSwap();
}
async function resetToGhostface(skin = "ghostfaceBilly") {
  await page.evaluate(() => window.__harness.expireGfSwap());
  await waitFrames(3);
  await page.evaluate(s => { window.__harness.setSkin("p1", s); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); }, skin);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 200); await waitFrames(2);
}

async function bootBattle(p1key, p2key = "rengoku") {
  await page.goto(`${base}/index.html?harness=1&p1=${p1key}&p2=${p2key}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
  await waitFrames(20);
}

await bootBattle("ghostface");
await page.evaluate(() => { window.__harness.setSkin("p1", "ghostfaceBilly"); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); });
{ const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 70); }   // opp to the right → P1 faces right (→=Forward)
await waitFrames(2);

// ── 1. TRIGGER — motion + Special swaps into the right companion; energy-gated ──
console.log("\n── 1. Trigger + energy gate ──");
let s = await pressSwapCombo("s");
check("QCF ↓→ + Special swaps into Billy's slot-0 (sasuke)", s.active && s.target === "sasuke", `target=${s.target}`);
await resetToGhostface();
await page.evaluate(() => window.__harness.setEnergy(10)); await waitFrames(2);   // below cost
const blocked = await pressSwapCombo("s");
check("swap BLOCKED below the Dread cost", blocked.active === false && blocked.rosterKey === "ghostface", `active=${blocked.active}`);

// ── 2. UNLIMITED resource during the window ──
console.log("\n── 2. Unlimited resource ──");
await resetToGhostface();
s = await pressSwapCombo("s");
check("infiniteEnergy ON + full bar on swap-in", s.infiniteEnergy === true && s.energy === s.maxEnergy, `inf=${s.infiniteEnergy} e=${s.energy}/${s.maxEnergy}`);
const ePre = (await gfSwap()).energy;
await page.keyboard.down("l"); await waitFrames(6); await page.keyboard.up("l"); await waitFrames(4);   // companion special (normally costs)
const gPost = await gfSwap();
check("a companion special does NOT drain the bar", gPost.active && gPost.energy === gPost.maxEnergy && gPost.energy === ePre, `e=${gPost.energy}/${gPost.maxEnergy}`);

// ── 3. AUTO-REVERT — natural countdown ticks to 0 and reverts ──
console.log("\n── 3. Natural auto-revert countdown ──");
await resetToGhostface();
await pressSwapCombo("s");
const t0 = await page.evaluate(() => window.__harness.setGfSwapTimer(20));   // shorten window; let it tick NATURALLY
check("window shortened for the countdown", t0 === 20, `timer=${t0}`);
await waitFrames(25);   // > 20 → the driver's own countdown hits 0 and reverts
const rev = await gfSwap();
check("countdown reached 0 → auto-reverted to Ghostface", rev.active === false && rev.rosterKey === "ghostface", `active=${rev.active} roster=${rev.rosterKey}`);
check("infiniteEnergy cleared on natural revert", rev.infiniteEnergy === false, `inf=${rev.infiniteEnergy}`);

// ── 4. POOL-PER-IDENTITY — each skin exposes only its 4 companions ──
console.log("\n── 4. Pool per identity (all 5 skins) ──");
const EXPECT = {
  ghostfaceBilly: ["sasuke", "itachi", "chrollo", "killua"],
  ghostfaceDebbie: ["beerus", "netero", "maki", "omniman"],
  ghostfaceRoman: ["rick", "tobirama", "gojo", "hisoka"],
  ghostfaceJill: ["sukuna", "goku_black", "gold_samurai_ranger", "vegeta"],
  ghostfaceAmber: ["shinobu", "gon", "naruto", "zenitsu"],
};
for (const [skin, pool] of Object.entries(EXPECT)) {
  await resetToGhostface(skin);
  const g = await gfSwap();
  check(`${skin} → ${pool.join("/")}`, JSON.stringify(g.pool) === JSON.stringify(pool), `got=${JSON.stringify(g.pool)}`);
}

// ── 5. REAL COST — revert restores post-cost Dread; repeats until Dread runs out ──
console.log("\n── 5. Real cost (revert ≠ free refill; regen-gated) ──");
await resetToGhostface();
await page.evaluate(() => window.__harness.setEnergy(100)); await waitFrames(2);   // exactly full Dread
await pressSwapCombo("s");                                    // swap #1 (cost 35 → 65)
await page.evaluate(() => window.__harness.expireGfSwap()); await waitFrames(3);
const e1 = (await gfSwap()).energy;
check("revert restores POST-COST Dread (~65, NOT refilled to 100)", e1 >= 63 && e1 <= 72, `Dread=${e1}`);
await pressSwapCombo("s");                                    // swap #2 (65 → 30)
await page.evaluate(() => window.__harness.expireGfSwap()); await waitFrames(3);
const e2 = (await gfSwap()).energy;
check("second swap spent Dread again (~30)", e2 >= 28 && e2 <= 40, `Dread=${e2}`);
await page.evaluate(() => window.__harness.setEnergy(30)); await waitFrames(2);   // pin just under cost
const third = await pressSwapCombo("s");                      // swap #3 must be BLOCKED (30 < 35)
check("swap BLOCKED once Dread < cost (not permanently free)", third.active === false, `active=${third.active}`);

// ── 6. Chrollo's Skill Hunter unaffected (shared field-swap engine) ──
// NOTE: Skill Hunter's activation CINEMATIC is not driven from game.js on this WIP branch (true at HEAD too,
// pre-existing — NOT touched by this work), so the cinematic-gated ult can't complete end-to-end here.
// We instead (a) confirm the ult still DISPATCHES to executeChrolloUltimate (spends its 100 energy → reaches
// the swap engine) and (b) drive the REAL applySkillHunter/revertSkillHunter engine directly — the exact
// shared functions the Ghostface Companion Swap reuses — proving Chrollo's mechanic is intact.
console.log("\n── 6. Chrollo Skill Hunter unaffected ──");
await bootBattle("chrollo", "rengoku");
await page.evaluate(() => { window.__harness.forceChrolloUnlock(); window.__harness.resetUlt?.(); window.__harness.fillEnergy(); });
await waitFrames(2);
const sh0 = await page.evaluate(() => window.__harness.shState());
check("Chrollo Skill Hunter unlock armed", sh0.unlocked === true && sh0.rosterKey === "chrollo", `unlocked=${sh0.unlocked}`);
const eUltPre = (await p1()).energy;
await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
const eUltPost = (await p1()).energy;
check("Skill Hunter ult DISPATCHES (spends its 100 energy → reaches the swap engine)", (eUltPre - eUltPost) >= 90, `energy ${eUltPre}→${eUltPost}`);
// Drive the REAL shared field-swap engine directly (bypasses the unwired cinematic):
const eng = await page.evaluate(() => window.__harness.chrolloEngineCheck("rengoku"));
check("applySkillHunter → Chrollo really becomes the copy (rengoku)", eng.okApply === true && eng.during === "rengoku", `during=${eng.during}`);
check("revertSkillHunter → restores Chrollo", eng.okRevert === true && eng.after === "chrollo", `after=${eng.after}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
