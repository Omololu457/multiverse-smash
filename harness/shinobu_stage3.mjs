// harness/shinobu_stage3.mjs — Stage 3 evidence: Shinobu's "Insect Breathing" command chain + specials.
// Covers: the Fwd+Heavy 3-hit thrust chain (G1→G2→G3) with a MID-CHAIN INTERRUPT (whiff ends the string),
// the POISON THRUST special (connects + stamps a wisteria DoT that keeps ticking after the hit), the
// BUTTERFLY FLIT backflip evade (i-frames + backward travel), and the special cooldown gate.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 46, { invuln = false } = {}) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); });
  await page.evaluate(v => window.__harness.setP2Invuln(v), invuln ? 600 : 0);
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `shinobu_s3_${name}.png`) }); }

// Drive the Fwd+Heavy chain: opener (d+k), then re-tap k during each recovery to continue.
async function driveChain() {
  await reset(44);
  const hp0 = (await p2()).health; const chain = [];
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 90; i++) {
    const c = await p1();
    if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove);
    if (!c.attacking) break;
    if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
    else await waitFrames(1);
  }
  await page.keyboard.up("d"); await waitFrames(8);
  return { chain, dmg: hp0 - (await p2()).health };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=shinobu&p2=shinobu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── COMMAND CHAIN (G1 → G2 → G3) ──
  section("Insect Breathing command chain (Fwd+Heavy → re-tap Heavy)");
  const r = await driveChain();
  check("chain progresses shinobuG1 → G2 → G3", ["shinobuG1", "shinobuG2", "shinobuG3"].every(k => r.chain.includes(k)), `chain=${r.chain.join(" → ")}`);
  check("full chain deals cumulative damage", r.dmg > 45, `dmg=${r.dmg} (3 scaled thrusts)`);
  // screenshot a mid-chain stage connecting (drive the chain, grab the first G2/G3 frame reliably)
  await reset(44); await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  { let grabbed = false;
    for (let i = 0; i < 70 && !grabbed; i++) { const c = await p1(); if (c.currentMove === "shinobuG2" || c.currentMove === "shinobuG3") { await shot("chain_mid"); grabbed = true; break; } if (!c.attacking) break; if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); } }
  await page.keyboard.up("d"); await waitFrames(10);

  // ── MID-CHAIN INTERRUPT (whiff ends the string) ──
  section("mid-chain interrupt (whiff → chain does NOT continue)");
  await reset(44, { invuln: true });   // dummy invulnerable → opener whiffs (no clean hit to latch)
  const whiffChain = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 60; i++) { const c = await p1(); if (c.currentMove && !whiffChain.includes(c.currentMove)) whiffChain.push(c.currentMove); if (!c.attacking) break; if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(8);
  check("whiffed opener does NOT chain past G1", whiffChain.length === 1 && whiffChain[0] === "shinobuG1", `chain=${whiffChain.join(" → ")}`);

  // ── POISON THRUST (neutral Special) + wisteria DoT ──
  section("Poison Thrust special (connects + lingering poison DoT)");
  await reset(50);
  const hpBefore = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  const mvP = await waitSheet("shinobu_poison_uniform");
  await shot("poison_thrust");
  // wait for the thrust animation to fully end (no inputs), then read the immediate (direct) damage
  await page.waitForFunction(() => !window.__harness.p1().attacking, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
  const hpAfterHit = (await p2()).health;
  const directDmg = hpBefore - hpAfterHit;
  // now hold still — poison DoT should keep ticking p2 down over the next ~140 frames
  await waitFrames(150);
  const hpAfterPoison = (await p2()).health;
  const dotDmg = hpAfterHit - hpAfterPoison;
  check("Poison Thrust → shinobu_poison_uniform + connects", has(mvP, "shinobu_poison_uniform") && directDmg > 0, `sheet=${mvP.spriteSheet} direct=${directDmg}`);
  check("wisteria POISON keeps ticking AFTER the hit (no further input)", dotDmg > 0, `poison-DoT dealt=${dotDmg} over 150f`);

  // ── COOLDOWN GATE (second immediate Poison Thrust blocked) ──
  section("Poison Thrust cooldown gate");
  await idleReady();
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // first cast
  await page.waitForFunction(() => !window.__harness.p1().attacking, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");    // immediate second — should be gated
  await waitFrames(2);
  const gated = await p1();
  check("2nd immediate Poison Thrust gated by cooldown", !has(gated, "shinobu_poison_uniform") || gated.attackPhase === "idle", `move=${gated.currentMove} phase=${gated.attackPhase}`);

  // ── BUTTERFLY FLIT (Back+Special) — backflip evade ──
  section("Butterfly Flit backflip evade (Back+Special)");
  await reset(46);
  const x0 = (await p1()).x;
  await page.keyboard.down("a");   // hold back
  await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");  // Back + Special
  const mvF = await waitSheet("shinobu_flit_uniform", 12);
  await shot("flit");
  let maxInvuln = 0, backTravel = 0;
  for (let i = 0; i < 20; i++) { const c = await p1(); maxInvuln = Math.max(maxInvuln, c.invulnTimer); backTravel = Math.min(backTravel, c.x - x0); await waitFrames(1); }
  await page.keyboard.up("a"); await waitFrames(8);
  check("Butterfly Flit → shinobu_flit_uniform sprite", has(mvF, "shinobu_flit_uniform"), `sheet=${mvF.spriteSheet}`);
  check("Flit grants brief i-frames", maxInvuln > 0, `maxInvulnTimer=${maxInvuln}`);
  check("Flit travels BACKWARD (reposition)", backTravel < -20, `back-travel=${Math.round(backTravel)}px`);

  section("stability");
  check("no JS errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
