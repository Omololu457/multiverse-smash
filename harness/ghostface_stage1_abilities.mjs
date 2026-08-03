// harness/ghostface_stage1_abilities.mjs — STAGE 1 mechanics evidence for Ghostface.
// Verifies the command chain (Down+Heavy rekka), the 3 direction-branched specials
// (Gutting Lunge + bleed / Low Gut + knockdown / Stalk Vanish i-frames), and the
// "The Final Act" freeze-cinematic ultimate (guaranteed damage). vs a dummy P2.
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
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `ghostface_ab_${name}.png`) }); }
// place the dummy just in front of P1 so melee lands
async function setup() {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + a.facing * 70);
  await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
// TRAINING mode (start + skipToBattle) → P2 is a PASSIVE dummy (no AI block/dodge) so melee tests are deterministic.
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 1. Command chain — Down+Heavy opener → re-tap Heavy on a clean hit → advance the rekka ──
console.log("\n── 1. Slasher Frenzy chain (Down+Heavy rekka) ──");
await setup();
const chainH0 = (await p2()).health;
const chain = [];
await page.keyboard.down("s");                                  // hold DOWN
await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener tap
// poll: whenever we enter recovery on a connected stage, re-tap Heavy → advance the rekka
for (let i = 0; i < 70; i++) {
  const c = await p1();
  if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove);
  if (!c.attacking) break;
  if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
  else await waitFrames(1);
}
await page.keyboard.up("s"); await waitFrames(8);
let a = await p1();
check("opener → ghostfaceCombo1", chain[0] === "ghostfaceCombo1", `chain=${chain.join(" → ")}`);
check("chain progresses Combo1 → Combo2 → Combo3", ["ghostfaceCombo1", "ghostfaceCombo2", "ghostfaceCombo3"].every(k => chain.includes(k)), `chain=${chain.join(" → ")}`);
check("chain deals cumulative damage", (chainH0 - (await p2()).health) > 40, `dmg=${Math.round(chainH0 - (await p2()).health)}`);
await shot("chain");

// ── 2. Gutting Lunge (FORWARD+Special) — damage + BLEED DoT ──
console.log("\n── 2. Gutting Lunge (Forward+Special) + Bleed DoT ──");
await setup();
let h0 = (await p2()).health;
const fwdKey = (await p1()).facing === 1 ? "d" : "a";   // hold TOWARD the opponent = Forward special
await page.keyboard.down(fwdKey); await waitFrames(2);
await page.keyboard.down("l"); await waitFrames(3); a = await p1();
check("Forward+Special → gfLunge pose", a.currentMove === "gfLunge", `move=${a.currentMove}`);
const eAfter = a.energy;
check("Gutting Lunge spent Dread energy (~25)", eAfter <= 76, `energy=${eAfter}/100`);
await shot("lunge"); await page.keyboard.up("l"); await page.keyboard.up(fwdKey);
await waitFrames(6);
const hHit = (await p2()).health;
check("Gutting Lunge dealt direct damage", hHit < h0, `p2 ${h0}→${hHit}`);
// let the bleed tick — health should KEEP dropping with P1 no longer attacking
await waitFrames(60);
const hBleed = (await p2()).health;
check("BLEED DoT keeps ticking after the hit", hBleed < hHit, `p2 ${hHit}→${hBleed} (bleed)`);

// ── 3. Low Gut (Down+Special) — knockdown on hit ──
console.log("\n── 3. Low Gut (Down+Special) + knockdown ──");
await setup();
await page.keyboard.down("s");
await page.keyboard.down("l"); await waitFrames(3); a = await p1();
check("Down+Special → gfLowCut pose", a.currentMove === "gfLowCut", `move=${a.currentMove}`);
await shot("lowgut"); await page.keyboard.up("l");
await waitFrames(8);
const kd = await p2();
check("Low Gut trips the opponent (knockdown)", kd.knockdownState === true, `knockdown=${kd.knockdownState}`);
await page.keyboard.up("s"); await waitFrames(30);

// ── 4. Stalk Vanish (Back+Special) — i-frames + backward step, no damage ──
console.log("\n── 4. Stalk Vanish (Back+Special) — i-frames ──");
await setup();
a = await p1();
const backKey = a.facing === 1 ? "a" : "d";   // hold AWAY from the opponent
const x0 = a.x, h2before = (await p2()).health;
await page.keyboard.down(backKey); await waitFrames(2);        // latch the BACK direction first
await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
// invulnTimer peaks then decays — sample the MAX and the furthest backward travel over ~18f
let maxInv = 0, back = 0;
for (let i = 0; i < 18; i++) { const c = await p1(); maxInv = Math.max(maxInv, c.invulnTimer || 0); back = Math[a.facing === 1 ? "min" : "max"](back, c.x - x0); await waitFrames(1); }
check("Stalk Vanish grants i-frames", maxInv > 0, `invuln=${maxInv}`);
check("Stalk Vanish steps backward (away)", Math.abs(back) > 15, `travel=${Math.round(back)}px facing=${a.facing}`);
check("Stalk Vanish deals no damage", (await p2()).health === h2before, `p2=${(await p2()).health}`);
await shot("stalk"); await page.keyboard.up(backKey); await waitFrames(20);

// ── 5. Ultimate — "The Final Act" freeze cinematic + guaranteed damage ──
console.log("\n── 5. The Final Act (Ultimate) ──");
await setup();
await page.evaluate(() => window.__harness.resetUlt?.());
h0 = (await p2()).health;
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
// cinematic should be active within a few frames
let cine = null;
for (let i = 0; i < 12; i++) { cine = await page.evaluate(() => window.__harness.ghostfaceUltCine()); if (cine?.active) break; await waitFrames(2); }
check("Ultimate activates the Final Act cinematic", !!cine?.active, `active=${cine?.active} caster=${cine?.casterKey}`);
check("cinematic caster is the real Ghostface", cine?.casterKey === "ghostface", `caster=${cine?.casterKey}`);
await shot("ultimate");
// advance into the FLURRY/impact beat and capture the slash-storm overlay
for (let i = 0; i < 60; i++) { const c = await page.evaluate(() => window.__harness.ghostfaceUltCine()); if (c && c.phase === "flurry" && c.frame >= c.impactFrame) break; if (!c?.active) break; await waitFrames(1); }
await shot("ultimate_flurry");
// run to resolution + capture damage
await page.waitForFunction(() => { const c = window.__harness.ghostfaceUltCine(); return !c || !c.active; }, null, { timeout: 8000, polling: 32 }).catch(() => {});
await waitFrames(6);
const hUlt = (await p2()).health;
check("Ultimate dealt heavy guaranteed damage (~≥280)", (h0 - hUlt) >= 280, `p2 ${h0}→${hUlt} (Δ${Math.round(h0 - hUlt)})`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/ghostface_ab_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
