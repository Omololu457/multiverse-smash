// harness/itachi_stage2.mjs
// STAGE 2 evidence: Itachi core melee kit + Fire Style: Great Fireball Jutsu + intro.
// Asserts the 5 normals connect on the right sheets, the neutral Special spawns the
// itachiFireball projectile (with the fireballCast pose) and connects, and the pre-match
// intro plays. Screenshots → harness/shots/itachi_stage2_*.png.
// Run: node harness/itachi_stage2.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const section = (t) => console.log(`\n── ${t} ──`);
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function rec() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `itachi_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 10000, polling: 16 }).catch(() => {}); }
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles(); window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5 && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 10000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function prep(gap) { await settle(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=itachi`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // ── INTRO ────────────────────────────────────────────────────────────
  section("intro — crow-swarm arrival (crows → Itachi resolving)");
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  const gotIntro = await page.waitForFunction(() => window.__harness.introState().p1Variant === "intro", null, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
  // Sample the sheet across a few frames — the intro strip populates a beat after the variant registers.
  let introSheet = "";
  for (let i = 0; i < 8 && !introSheet.includes("itachi_intro_uniform"); i++) { introSheet = (await p1()).spriteSheet || ""; await waitFrames(2); }
  check("intro variant plays", gotIntro, `variant=${(await page.evaluate(() => window.__harness.introState().p1Variant))}`);
  check("intro uses itachi_intro_uniform (reversed crow strip)", introSheet.includes("itachi_intro_uniform"), `sheet=${introSheet}`);
  await shot("intro");
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── SPRITE GATE ──────────────────────────────────────────────────────
  section("sprite gate");
  const g = await rec();
  check("P1 is Itachi rendering sprites", g.key === "itachi" && g.hasSpriteHandler, `key=${g.key}`);

  // ── 5 NORMALS ────────────────────────────────────────────────────────
  section("5 normals connect on the right sheets");
  for (const [name, key, gap, sheetFrag] of [["light", "j", 44, "low_attack_uniform"], ["heavy", "k", 46, "foward_attack_uniform"], ["up", "i", 42, "up_attack_uniform"]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const r = await rec(); await shot(name); await page.keyboard.up(key); await waitFrames(20);
    check(`${name} connects`, hp0 - (await p2()).health > 0, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
    check(`${name} uses ${sheetFrag}`, (r.spriteSheet || "").includes(sheetFrag), `sheet=${r.spriteSheet}`);
  }
  // air (jump + light)
  await prep(40); await page.evaluate(() => window.__harness.liftP1(42));
  { const hp0 = (await p2()).health; await page.keyboard.down("j"); await waitFrames(4); const r = await rec(); await page.keyboard.up("j"); await waitFrames(14);
    check("air connects", hp0 - (await p2()).health > 0, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
    check("air uses foward_knife_attack_uniform", (r.spriteSheet || "").includes("foward_knife_attack_uniform"), `sheet=${r.spriteSheet}`); }
  await waitGrounded(); await waitFrames(6);
  // down_air (jump + down + light)
  await prep(30); await page.evaluate(() => window.__harness.liftP1(46));
  { const hp0 = (await p2()).health; await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); const r = await rec(); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    check("down_air spike connects", hp0 - (await p2()).health > 0, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
    check("down_air uses down_air_attack_uniform", (r.spriteSheet || "").includes("down_air_attack_uniform"), `sheet=${r.spriteSheet}`); }
  await waitGrounded(); await waitFrames(6);

  // ── FIREBALL SPECIAL ─────────────────────────────────────────────────
  section("Fire Style: Great Fireball Jutsu (neutral Special)");
  await prep(220);   // wide gap so the flame is airborne long enough to sample before it connects
  { const e0 = (await p1()).energy, hp0 = (await p2()).health;
    // NOTE: no screenshot between the cast and the projectile poll — page.screenshot() burns
    // wall-clock while the game's rAF keeps running, and this fast flame would fly + despawn first.
    await page.keyboard.down("l"); await waitFrames(2); const gc = await rec(); await page.keyboard.up("l");
    let sawFireball = false, names = [];
    for (let i = 0; i < 12 && !sawFireball; i++) { const pj = await projs(); names = pj.map(p => p.name); sawFireball = pj.some(p => p.name === "itachiFireball"); await waitFrames(1); }
    check("fireball spawns itachiFireball projectile", sawFireball, `projs=${names}`);
    await shot("fireball");
    check("fireball plays fireballCast pose", gc.action === "fireballCast", `action=${gc.action}`);
    check("fireball spent ~25 energy", (e0 - (await p1()).energy) >= 20 && (e0 - (await p1()).energy) <= 35, `spent=${(e0 - (await p1()).energy).toFixed(0)}`);
    await waitFrames(30);
    check("fireball connects at range", hp0 - (await p2()).health > 0, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`); }

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  let boxes = 0; for (const [a, s] of seen) if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); }
  check("no null/fallback-box actions", boxes === 0, `actions=${[...seen.keys()].join(",")}`);

  console.log(`\n${fail === 0 ? "✅" : "❌"} Itachi Stage 2: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
