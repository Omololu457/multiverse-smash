// harness/ghostface_stage4_modifiers.mjs — STAGE 4: each killer-identity GAMEPLAY modifier, verified
// individually with BEFORE (default skin) / AFTER (identity skin) evidence. Same shared moveset — only
// the per-skin property tweak differs. Training mode (passive dummy) → deterministic.
//   Billy  — faster Gutting Lunge (approach) startup  → connects in fewer frames
//   Debbie — deceptive hit-react (VISUAL ONLY)        → displayed pose mismatched; health/hitstun IDENTICAL
//   Jill   — bait-counter from idle                   → an attack into her idle is countered (attacker stunned)
//   Amber  — +move speed & sticky pressure            → walks farther; her hits shove the foe LESS
//   Roman  — (Call-In cost/cd) deferred to Stage 5    → mod value present, consumed there
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function reset(p1skin, p2skin, gap = 52) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  await page.evaluate(s => window.__harness.setSkin("p1", s), p1skin);
  await page.evaluate(s => window.__harness.setSkin("p2", s), p2skin);
  // clear any lingering per-skin state on P1 (e.g. jill cooldown) and reposition dummy in front
  await wf(3);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + a.facing * gap);
  await wf(2);
}
// frames from pressing FORWARD+Special until the Gutting Lunge reaches ACTIVE frames
async function lungeToActive() {
  const fwd = (await p1()).facing === 1 ? "d" : "a";
  await page.keyboard.down(fwd); await wf(2);
  const s0 = (await st()).frame;
  await page.keyboard.down("l");
  let n = null;
  for (let i = 0; i < 30; i++) { const a = await p1(); if (a.attackPhase === "active") { n = (await st()).frame - s0; break; } if (!a.attacking && i > 3) break; await wf(1); }
  await page.keyboard.up("l"); await page.keyboard.up(fwd); await wf(24);
  return n;
}

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=ghostface`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await wf(20);

// Ghostface has NO neutral "default" identity anymore, so each modifier is measured against a BASELINE
// identity that LACKS the specific property being tested. ATK_BASE (Debbie) has only a defender-visual
// modifier → neutral for attacker/mover tests. DEF_BASE (Roman) has only swap-cost → neutral as a defender.
const ATK_BASE = "ghostfaceDebbie", DEF_BASE = "ghostfaceRoman", DUMMY = "ghostfaceBilly";

// ── BILLY: faster approach-move startup ──
console.log("\n── Billy: Gutting Lunge startup (approach telegraph) ──");
await reset(ATK_BASE, DUMMY, 300); const defFrames = await lungeToActive();
await reset("ghostfaceBilly", DUMMY, 300); const billyFrames = await lungeToActive();
check("Billy's Gutting Lunge reaches active FASTER than baseline", billyFrames != null && defFrames != null && billyFrames < defFrames, `baseline=${defFrames}f · billy=${billyFrames}f`);

// ── DEBBIE: deceptive hit-react (visual only) ──
console.log("\n── Debbie: deceptive hit-react (visual only) ──");
async function lightHitReact(p2skin) {
  await reset(DUMMY, p2skin, 46);
  const h0 = (await p2()).health;
  // ONE clean light tap (holding the button auto-repeats → non-deterministic hit count)
  await page.keyboard.down("j"); await wf(2); await page.keyboard.up("j");
  let act = null, hs = 0;
  for (let i = 0; i < 18; i++) { const d = await p2(); if ((d.hitstun || 0) > 0) { act = d.action; hs = Math.max(hs, d.hitstun); } await wf(1); }
  await wf(8);
  const h1 = (await p2()).health;
  return { act, dmg: Math.round(h0 - h1), hs };
}
const defR = await lightHitReact(DEF_BASE);
const debR = await lightHitReact("ghostfaceDebbie");
check("Debbie's DISPLAYED hit-react pose differs from baseline", defR.act !== debR.act && !!debR.act, `baseline pose=${defR.act} · debbie pose=${debR.act}`);
check("Debbie's REAL damage is unchanged (visual-only)", defR.dmg === debR.dmg && defR.dmg > 0, `baseline=${defR.dmg} · debbie=${debR.dmg}`);
check("Debbie's REAL hitstun is unchanged (visual-only)", defR.hs === debR.hs && defR.hs > 0, `baseline=${defR.hs} · debbie=${debR.hs}`);

// ── JILL: bait-counter from idle ──
console.log("\n── Jill: bait-counter (attack into her idle) ──");
async function attackIntoIdle(p2skin) {
  await reset(DUMMY, p2skin, 46);
  const h0 = (await p2()).health;
  await page.keyboard.down("j");
  let p1Stun = 0, flash = 0;
  for (let i = 0; i < 16; i++) { const a = await p1(); const d = await p2(); p1Stun = Math.max(p1Stun, a.hitstun || 0); flash = Math.max(flash, d.parryFlash || 0); await wf(1); }
  await page.keyboard.up("j"); await wf(10);
  const h1 = (await p2()).health;
  return { dmg: Math.round(h0 - h1), p1Stun, flash };
}
const defJ = await attackIntoIdle(DEF_BASE);
const jilJ = await attackIntoIdle("ghostfaceJill");
check("baseline identity does NOT counter (takes the hit)", defJ.dmg > 0 && defJ.p1Stun === 0, `dmg=${defJ.dmg} attackerStun=${defJ.p1Stun}`);
check("Jill COUNTERS the attack into her idle (attacker stunned, she's unhurt)", jilJ.dmg === 0 && jilJ.p1Stun > 0, `dmg=${jilJ.dmg} attackerStun=${jilJ.p1Stun} flash=${jilJ.flash}`);

// ── AMBER: +move speed & sticky pressure ──
console.log("\n── Amber: move speed + sticky pressure ──");
async function walkDist(p1skin) {
  await reset(p1skin, DUMMY, 400);
  const x0 = (await p1()).x;
  await page.keyboard.down("d"); await wf(20); await page.keyboard.up("d");
  const x1 = (await p1()).x; await wf(4);
  return Math.abs(x1 - x0);
}
const defW = await walkDist(ATK_BASE);
const ambW = await walkDist("ghostfaceAmber");
check("Amber walks FARTHER over 20f (higher move speed)", ambW > defW + 4, `baseline=${defW.toFixed(0)}px · amber=${ambW.toFixed(0)}px`);
async function pushbackOnHit(p1skin) {
  await reset(p1skin, DUMMY, 46);
  await page.keyboard.down("k");   // heavy = clear knockback
  let maxVx = 0;
  for (let i = 0; i < 16; i++) { const d = await p2(); if ((d.hitstun || 0) > 0) maxVx = Math.max(maxVx, Math.abs(d.vx || 0)); await wf(1); }
  await page.keyboard.up("k"); await wf(10);
  return maxVx;
}
const defP = await pushbackOnHit(ATK_BASE);
const ambP = await pushbackOnHit("ghostfaceAmber");
check("Amber's hit shoves the foe LESS (sticky pressure)", ambP < defP && defP > 0, `baseline push=${defP.toFixed(1)} · amber push=${ambP.toFixed(1)}`);

// ── ROMAN: Companion Swap costs LESS Dread (enhanced companion access) ──
console.log("\n── Roman: cheaper Companion Swap ──");
// Measure Dread actually spent on a swap: set 100, do QCF ↓→ + Special, force-revert, read the restored
// (post-cost) Dread. spent = 100 - restored. Default = 35; Roman = 23 (0.65×).
async function swapSpend(skin) {
  await reset(skin, DUMMY, 60);
  await page.evaluate(() => { window.__harness.setEnergy(100); window.__harness.resetFighterInput?.("p1"); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await wf(2);
  const fwd = (await p1()).facing === 1 ? "d" : "a";
  await page.keyboard.down("s"); await wf(1); await page.keyboard.up("s"); await wf(1);
  await page.keyboard.down(fwd); await wf(1); await page.keyboard.up(fwd); await wf(1);
  await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l"); await wf(4);
  const g = await page.evaluate(() => window.__harness.gfSwap());
  await page.evaluate(() => window.__harness.expireGfSwap()); await wf(3);
  const e = await page.evaluate(() => window.__harness.gfSwap().energy);
  return { swapped: g.active, spent: Math.round((100 - e) * 10) / 10 };
}
const defSpend = await swapSpend(ATK_BASE);
const romanSpend = await swapSpend("ghostfaceRoman");
check("both identities actually swapped", defSpend.swapped && romanSpend.swapped, `baseline=${defSpend.swapped} roman=${romanSpend.swapped}`);
check("Roman's swap costs LESS Dread than baseline", romanSpend.spent < defSpend.spent, `baseline=${defSpend.spent} · roman=${romanSpend.spent}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
