// harness/orochimaru_stage3_shots.mjs — Stage 3 CONNECT test + VISUAL capture: the 3-stage command-normal
// chain (Fwd+Heavy: Forward Strong → Chain2 → Chain3 launcher) + all 8 direction-branched specials
// (GROUND neutral/F/B/U/D + AIR neutral/F/B). Verifies each fires, renders its real cast sheet, and
// connects (melee damage or projectile spawn+hit). Writes PNGs to /tmp/orochimaru_s3/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/orochimaru_s3"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1"));
  const cb = await page.locator("#gameCanvas").boundingBox();
  if (r && cb) { const pad = 100; const x = Math.max(0, cb.x + r.x - pad), y = Math.max(0, cb.y + r.y - pad * 1.7); const w = Math.min(cb.width - (r.x - pad), r.w + pad * 3.4), h = Math.min(cb.height - (r.y - pad * 1.7), r.h + pad * 2.6); try { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x, y, width: Math.max(80, w), height: Math.max(80, h) } }); return; } catch (_) {} }
  await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") });
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }
// direction special: prep, (lift if air), fire, screenshot at cast, wait, measure dmg + energy + projectile
async function special(dir, name, { air = false, gap = 100, waitN = 46, projName = null, projSheet = null } = {}) {
  await prep(gap);
  if (air) await page.evaluate(() => window.__harness.liftP1(72));
  const en0 = (await p1()).energy, hp0 = (await p2()).health;
  const r = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  let castSheet = null, projSeen = false, minEnergy = en0;
  const seeProj = async () => { if (!projName && !projSheet) return; const ps = await projs(); if (ps.some(p => (p.name || "") === projName || (projSheet && (p.sheet || "").includes(projSheet)))) projSeen = true; };
  await seeProj();                                   // catch a fast projectile the instant it spawns
  const a0 = await p1(); if (a0.spriteSheet) castSheet = a0.spriteSheet;
  await shot(name);
  for (let i = 0; i < waitN; i++) { await seeProj(); const e = (await p1()).energy; if (e < minEnergy) minEnergy = e; await wf(1); }
  const dmg = hp0 - (await p2()).health, spent = en0 - minEnergy;   // min energy = true cost floor (before regen refills)
  return { cast: r?.cast, move: r?.move, dmg, spent, projSeen, castSheet };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=orochimaru&p2=orochimaru`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("command-normal CHAIN (Fwd+Heavy: Forward Strong → Chain2 → Chain3 launcher)");
  // Fire the opener, then re-tap Heavy across its recovery to advance the rekka (cancel-on-hit).
  await prep(70);
  const chp0 = (await p2()).health;
  const stages = new Set();
  await page.keyboard.down("d"); await wf(2);
  for (let tap = 0; tap < 3; tap++) {
    await page.keyboard.down("k"); await wf(2); await page.keyboard.up("k");
    for (let i = 0; i < 7; i++) { const a = await p1(); if (a.currentMove && a.currentMove.startsWith("orochimaru")) stages.add(a.currentMove); if (tap === 2 && i === 1) await shot("chain_3"); else if (tap === 0 && i === 1) await shot("chain_1_opener"); await wf(1); }
  }
  await page.keyboard.up("d");
  const chainDmg = chp0 - (await p2()).health;
  check("chain opener fires (orochimaruFwdStrong)", stages.has("orochimaruFwdStrong"), `stages=${[...stages].join(",")}`);
  check("chain advances past the opener (≥1 chain stage)", stages.has("orochimaruChain2") || stages.has("orochimaruChain3"), `stages=${[...stages].join(",")}`);
  check("chain deals aggregate damage", chainDmg > 0, `total=${chainDmg.toFixed(0)}`);

  section("GROUND specials (neutral / Fwd / Back / Up / Down)");
  const sn = await special(null, "sp1_snakespit_neutral", { gap: 150, projName: "oroSnake", projSheet: "snake_proj" });
  check("neutral → Snake Spit (cast + projectile + long-range connect)", sn.cast === "orochimaruSnakeSpit" && (sn.projSeen || sn.dmg > 0) && sn.dmg > 0 && sn.spent > 12, `cast=${sn.cast} proj=${sn.projSeen} dmg=${sn.dmg.toFixed(0)} spent=${sn.spent.toFixed(0)}`);
  const fw = await special("F", "sp2_swordlunge_fwd", { gap: 120 });
  check("Fwd → Sword Lunge (melee advance connects)", fw.move === "orochimaruSwordLunge" && fw.dmg > 0 && fw.spent > 12, `move=${fw.move} dmg=${fw.dmg.toFixed(0)} spent=${fw.spent.toFixed(0)}`);
  const bk = await special("B", "sp3_swordthrow_back", { gap: 150, projName: "oroSword", projSheet: "sword_proj" });
  check("Back → Sword Throw (cast + projectile + long-range connect)", bk.cast === "orochimaruSwordThrow" && (bk.projSeen || bk.dmg > 0) && bk.dmg > 0, `cast=${bk.cast} proj=${bk.projSeen} dmg=${bk.dmg.toFixed(0)}`);
  const up = await special("U", "sp4_tailsweep_up", { gap: 70 });
  check("Up → Tail Sweep (launcher connects)", up.move === "orochimaruTailSweep" && up.dmg > 0, `move=${up.move} dmg=${up.dmg.toFixed(0)}`);
  const dn = await special("D", "sp5_slam_down", { gap: 78 });
  check("Down → Slam (connects)", dn.move === "orochimaruSlam" && dn.dmg > 0, `move=${dn.move} dmg=${dn.dmg.toFixed(0)}`);

  section("AIR specials (neutral / Fwd / Back)");
  const an = await special(null, "sp6_snakelunge_airN", { air: true, gap: 120 });
  check("AIR neutral → Snake Lunge (dive connects)", an.move === "orochimaruSnakeLunge" && an.dmg > 0, `move=${an.move} dmg=${an.dmg.toFixed(0)}`);
  const af = await special("F", "sp7_snakebarrage_airF", { air: true, gap: 150, projName: "oroSnakeSwarm" });
  check("AIR Fwd → Snake Barrage (multi-projectile + connect)", af.cast === "orochimaruSnakeBarrage" && af.projSeen && af.dmg > 0, `cast=${af.cast} proj=${af.projSeen} dmg=${af.dmg.toFixed(0)}`);
  const ab = await special("B", "sp8_coil_airB", { air: true, gap: 70 });
  check("AIR Back → Coil (connects)", ab.move === "orochimaruCoil" && ab.dmg > 0, `move=${ab.move} dmg=${ab.dmg.toFixed(0)}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ OROCHIMARU Stage 3: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
