// harness/toji_offensive_swarm_shots.mjs — LIVE evidence for Toji's NEW OFFENSIVE Fly Heads swarm.
// Down+Heavy (S+K) hurls a fan of fly_head PROJECTILES that travel and deal REAL damage — distinct input from
// the defensive Back+Special (A+L) vision-denial swarm. Proves: (1) the offensive swarm spawns multiple
// traveling projectiles + connects for damage, (2) the defensive swarm still fires on ITS input (0 damage,
// self-vanish) — both independently accessible. Usage: node harness/toji_offensive_swarm_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.tojiCmd());
const swarm = () => page.evaluate(() => window.__harness.tojiFlyHeadsSwarm());
const fade = () => page.evaluate(() => window.__harness.tojiFade());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function upAll() { for (const k of ["a","d","w","s","j","k","l","u"]) await page.keyboard.up(k).catch(() => {}); }
async function reset(gap) {
  await upAll();
  await page.evaluate(g => {
    window.__harness.clearProjectiles?.();
    window.__harness.setP1Pos?.(460, null); window.__harness.setP2X?.(460 + g);
    window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1");
    const p = window.__harness.p1();
    p.attackCooldown = 0; p.attacking = false; p.hitstun = 0; p._spriteCastMove = null;
    for (const k of ["_flyHeadCd","_flyBarrageCd","_gunCd","_tojiFlyFadeTimer"]) p[k] = 0;
  }, gap);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.6 && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitFrames(3);
}

console.log("TOJI — OFFENSIVE Fly Heads swarm (Down+Heavy) vs DEFENSIVE swarm (Back+Special)\n");
await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(250);

// ── OFFENSIVE SWARM (A): fan of projectiles IN FLIGHT — target far so all heads coexist (proves multi-projectile) ──
console.log("── OFFENSIVE: Down+Heavy (S+K) ──");
let firedCast = false, maxShots = 0;
await reset(760);   // opponent far → the whole staggered fan is airborne at once
await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
for (let i = 0; i < 40; i++) {
  const c = await cmd(); if (c?.cast === "tojiFlyHeads") firedCast = true;
  const shots = (await projs()).filter(p => p.name === "tojiFlyHeadShot");
  if (shots.length > maxShots) maxShots = shots.length;
  if (maxShots >= 4 && i % 3 === 0) await page.screenshot({ path: path.join(OUT, "toji_offensive_swarm_1_inflight.png") });
  await waitFrames(1);
}
check("Offensive swarm cast fires  [Down+Heavy: S+K]", firedCast, `cast=tojiFlyHeads`);
check("spawns MULTIPLE traveling fly_head PROJECTILES (a fan)", maxShots >= 4, `max simultaneous tojiFlyHeadShot = ${maxShots}`);
check("offensive swarm does NOT fade Toji (it's not the defensive move)", (await fade()).alpha > 0.9, `Toji alpha=${(await fade()).alpha.toFixed(2)}`);

// ── OFFENSIVE SWARM (B): connect for real damage — target close ──
let dmg = 0, shot2 = false;
await reset(150);
const h0 = (await p2()).health;
await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
for (let i = 0; i < 45; i++) {
  const dh = h0 - (await p2()).health; if (dh > dmg) dmg = dh;
  if (dmg > 0 && !shot2) { shot2 = true; await page.screenshot({ path: path.join(OUT, "toji_offensive_swarm_2_connect.png") }); }
  await waitFrames(1);
}
check("projectiles CONNECT for real damage", dmg > 0, `damage dealt = ${dmg}`);

// ── DEFENSIVE SWARM: Back + Special (A+L) — 0 damage, self-vanish, on ITS OWN input ──
console.log("\n── DEFENSIVE: Back+Special (A+L) ──");
await reset(150);
const dh0 = (await p2()).health;
let defCast = false, defSwarm = false, defFadeMin = 1, defShots = 0;
await page.keyboard.down("a"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("a");
for (let i = 0; i < 40; i++) {
  const c = await cmd(); if (c?.cast === "tojiFlyHeads") defCast = true;
  if ((await swarm()).active) defSwarm = true;
  const f = await fade(); if (f.alpha < defFadeMin) defFadeMin = f.alpha;
  defShots = Math.max(defShots, (await projs()).filter(p => p.name === "tojiFlyHeadShot").length);
  if (i === 12) await page.screenshot({ path: path.join(OUT, "toji_offensive_swarm_3_defensive.png") });
  await waitFrames(1);
}
const defDmg = dh0 - (await p2()).health;
check("Defensive swarm fires on ITS input  [Back+Special: A+L]", defCast && defSwarm, `cast=${defCast} swarm=${defSwarm}`);
check("defensive = self-vanish (Toji fades)", defFadeMin < 0.9, `Toji alpha min=${defFadeMin.toFixed(2)}`);
check("defensive = ZERO damage + NO damaging projectiles (unchanged)", defDmg === 0 && defShots === 0, `dmg=${defDmg} shots=${defShots}`);

console.log(`\n${FAIL === 0 ? "✅" : "❌"} Offensive vs defensive Fly Heads — ${PASS} passed, ${FAIL} failed` + (jsErrors.length ? `\nJS ERRORS: ${jsErrors.slice(0,3).join(" | ")}` : "\nno JS errors"));
console.log(`shots → harness/shots/toji_offensive_swarm_*.png`);
await browser.close(); server.close();
process.exit(FAIL === 0 ? 0 : 1);
