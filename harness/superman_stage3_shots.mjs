// harness/superman_stage3_shots.mjs — STAGE 3 specials for Superman (direction-branched SPECIAL):
//   Neutral/Down = HEAT VISION — twin eye-beam PROJECTILE (independent collision, spends Solar Energy)
//   Forward      = SUPER FLYING PUNCH — charged dash-strike lunge (spends Solar Energy)
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
const errors = []; page.on("pageerror", e => errors.push(String(e)));
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
async function shot(name) { await page.screenshot({ path: path.join(OUT, `superman_s3_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=superman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

// ── HEAT VISION (neutral special) — eye-beam projectile, independent collision ──
console.log("\n── Heat Vision (neutral SPECIAL — eye-beam projectile) ──");
await prep(220);
const hpB0 = (await p2()).health;   // baseline BEFORE firing (screenshots eat wall-clock frames)
const eBeam0 = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
await waitFrames(4);   // beam spawns ~5 frames in
const pj = await projs();
const beam = pj.find(p => (p.name || "").includes("heatvision"));
check("Heat Vision spawns an independent projectile", !!beam, `projectiles=[${pj.map(p => p.name).join(",")}]`);
check("beam travels forward (vx>0)", !!beam && beam.vx > 0, `vx=${beam?.vx}`);
const eBeam1 = (await p1()).energy;
check("Heat Vision spends Solar Energy (~22)", (eBeam0 - eBeam1) >= 20 && (eBeam0 - eBeam1) <= 26, `Δ${(eBeam0 - eBeam1).toFixed(0)}`);
// caster-independence: capture caster state while the beam is still in flight (not lunging)
const casterState = await p1();
await shot("heatvision_fire");
// independent collision: beam flies into p2 and damages while p1 stays put
await page.waitForFunction(hp => window.__harness.p2().health < hp, hpB0, { timeout: 4000, polling: 16 }).catch(() => {});
const beamDmg = hpB0 - (await p2()).health;
check("beam hits opponent INDEPENDENTLY (damage lands, caster not lunging)", beamDmg > 0, `−${beamDmg.toFixed(0)}`);
check("caster stays put during beam (projectile is independent)", casterState.currentMove !== "superPunch", `move=${casterState.currentMove}`);
await shot("heatvision_hit");

// ── SUPER FLYING PUNCH (forward special) — charged dash-strike ──
console.log("\n── Super Flying Punch (forward SPECIAL — charged dash-strike) ──");
await prep(120);
const xPre = (await p1()).x;
const hpP0 = (await p2()).health;   // baseline BEFORE the cast
const eP0 = (await p1()).energy;
await page.keyboard.down("d"); await waitFrames(1);
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
await waitFrames(2);
let a = await p1();
check("Forward+Special → superPunch cast pose", a.currentMove === "superPunch", `move=${a.currentMove}`);
check("Super Flying Punch spends Solar Energy (~30)", (eP0 - a.energy) >= 28 && (eP0 - a.energy) <= 34, `Δ${(eP0 - a.energy).toFixed(0)}`);
await shot("flyingpunch_cast");
await waitFrames(14);   // let the lunge + active frames connect
await page.keyboard.up("d");
const xPost = (await p1()).x;
const punchDmg = hpP0 - (await p2()).health;
check("lunges forward across the screen (x advances)", (xPost - xPre) > 30, `x ${xPre | 0}→${xPost | 0}`);
check("Super Flying Punch connects for heavy damage", punchDmg > 0, `−${punchDmg.toFixed(0)}`);
await shot("flyingpunch_hit");

check("no uncaught JS exceptions", errors.length === 0, errors[0] || "");
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/superman_s3_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
