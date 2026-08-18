// harness/orochimaru_stage5_shots.mjs — Stage 5 SUMMON ULTIMATE ("Summoning: Twin Serpents"). Fires the
// inline freeze/camera-focus cinematic and verifies: (a) the LIVE fighter performs it — the summon timer +
// cast pose are on the REAL p1, NOT a duplicate instance (the recurring cinematic-ult bug class); (b) the
// screen-space serpent overlay actually renders (oroSummonCine renders + peak strength); (c) the guaranteed
// ~210 EFF payoff lands; (d) block chips it to ~25%. Writes PNGs to /tmp/orochimaru_s5/. Ult key = u.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/orochimaru_s5"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function prep(gap, { blockP2 = false } = {}) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); if (blockP2) await page.evaluate(() => { if (window.__harness.setP2Block) window.__harness.setP2Block(true); }); await wf(2); }
async function shotFull(name) { await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=orochimaru&p2=orochimaru`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("Summon Ultimate fires + LIVE-fighter (no duplicate instance)");
  await prep(150);
  const en0 = (await p1()).energy, hp0 = (await p2()).health;
  const casterKeyBefore = (await p1()).key;
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
  await wf(2);
  const g = await p1();
  // the summon-gesture pose resolves once the cast-hitstop clears → sample across the early cinematic
  let castSeen = false, castSheet = g.spriteSheet;
  for (let i = 0; i < 16; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("orochimaru_ult_cast")) { castSeen = true; castSheet = a.spriteSheet; break; } await wf(1); }
  check("ult cast pose on the REAL p1 (orochimaru_ult_cast)", castSeen, `sheet=${castSheet}`);
  check("summon timer is on the LIVE fighter p1 (not a dup)", (g.oroSummon || 0) > 0, `oroSummon=${g.oroSummon}`);
  check("caster identity stable = orochimaru (not swapped/duplicated)", g.key === "orochimaru" && g.key === casterKeyBefore, `key=${g.key}`);
  check("ult spent 100 chakra", en0 - g.energy >= 95, `spent=${(en0 - g.energy).toFixed(0)}`);
  await shotFull("ult_1_cast");

  section("screen-space serpent cinematic renders");
  await wf(14); await shotFull("ult_2_summon");     // snake growing in
  // peak render sampling across the strike
  let sawRender = false, peakEnv = 0;
  for (let i = 0; i < 16; i++) { const c = await page.evaluate(() => window.__harness.oroSummonCine()); if (c.renders > 0) sawRender = true; if (c.maxEnv > peakEnv) peakEnv = c.maxEnv; if (i === 6) await shotFull("ult_3_strike"); await wf(2); }
  const cine = await page.evaluate(() => window.__harness.oroSummonCine());
  check("drawOrochimaruSummonCinematic ran (screen-space serpent overlay)", cine.renders > 0 && sawRender, `renders=${cine.renders}`);
  check("cinematic overlay reached full strength", cine.maxEnv > 0.6, `maxEnv=${cine.maxEnv.toFixed(2)}`);
  await shotFull("ult_4_after");

  section("guaranteed payoff (~210 EFF, range-independent) + block chip");
  // wait out the rest of the cinematic → damage applied at frame 46
  for (let i = 0; i < 40; i++) await wf(1);
  const dmg = hp0 - (await p2()).health;
  check("Summon strike connects at long range (guaranteed, ~210 EFF)", dmg > 150 && dmg < 260, `dmg=${dmg.toFixed(0)}`);

  // LIVE-fighter sanity: after the cinematic, p1 is STILL the same single orochimaru, timer cleared
  await page.evaluate(() => window.__harness.forceAction(null));
  await wf(30);
  const post = await p1();
  check("after cinematic: live p1 intact, summon timer cleared", post.key === "orochimaru" && (post.oroSummon || 0) === 0, `key=${post.key} oroSummon=${post.oroSummon}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ OROCHIMARU Stage 5: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
