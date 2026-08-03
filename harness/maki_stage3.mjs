// harness/maki_stage3.mjs — Stage 3 evidence for Maki Zenin's specials:
//   • KUNAI THROW (neutral/Fwd Special) — an INDEPENDENT-COLLISION projectile (spawns, travels, connects).
//   • NUNCHAKU FLURRY (Down+Special) — a committed spinning melee combo (weapon-flavor). Connects.
//   • POWER CHARGE (CHARGE button) — a self-buff (~1.3× damage ~5s), then auto-reverts. No energy — all
//     cooldown-gated. Saves screenshots to harness/shots/maki_s3_*.png and prints verification data.
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
const projs = () => page.evaluate(() => window.__harness.projectiles());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 60) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `maki_s3_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── KUNAI THROW (neutral Special) — independent-collision projectile ──
  section("Kunai Throw (neutral Special) — projectile spawns, travels, connects");
  await reset(150);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    const mv = await waitSheet("maki_kunai_uniform", 16);
    check("cast → maki_kunai_uniform pose", has(mv, "maki_kunai_uniform"), `sheet=${mv.spriteSheet}`);
    // projectile appears
    let seenProj = null, x0 = null;
    for (let f = 0; f < 12 && !seenProj; f++) { const ps = await projs(); seenProj = ps.find(p => p.name === "maki_kunai"); if (seenProj) x0 = seenProj.x; await waitFrames(1); }
    check("kunai projectile spawned (maki_kunai)", !!seenProj, `sheet=${seenProj?.sheet}`);
    await shot("kunai_travel");
    // it travels forward (x advances)
    await waitFrames(4); const ps2 = await projs(); const nowP = ps2.find(p => p.name === "maki_kunai");
    check("projectile travels (independent motion)", (nowP && x0 != null) ? Math.abs(nowP.x - x0) > 10 : (x0 != null), `x0=${Math.round(x0)} → x1=${nowP ? Math.round(nowP.x) : "(hit/despawned)"}`);
    // connects
    await page.waitForFunction(h => window.__harness.p2().health < h, hp0, { timeout: 3000, polling: 16 }).catch(() => {});
    const dmg = hp0 - (await p2()).health;
    await shot("kunai_hit");
    check("kunai connects (independent collision → dmg)", dmg > 0, `dmg=${dmg}`);
  }

  // ── NUNCHAKU FLURRY (Down+Special) — committed melee weapon-flavor combo ──
  section("Nunchaku Flurry (Down+Special)");
  await reset(46);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(1);
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    const mv = await waitSheet("maki_nunchaku_uniform", 16);
    await shot("nunchaku");
    await page.keyboard.up("s");
    await waitFrames(18);
    const dmg = hp0 - (await p2()).health;
    check("Down+Special → maki_nunchaku_uniform + connects", has(mv, "maki_nunchaku_uniform") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── POWER CHARGE (CHARGE button) — self-buff, then auto-revert ──
  section("Power Charge (CHARGE) — self-buff → auto-revert");
  await reset(70);
  { const before = (await p1()).damageMult;
    await page.keyboard.down("p"); await waitFrames(4); await page.keyboard.up("p");   // hold+release charge
    const mv = await waitSheet("maki_charge_uniform", 16);
    await shot("power_charge");
    const during = (await p1()).damageMult;
    check("CHARGE release → maki_charge_uniform pose", has(mv, "maki_charge_uniform"), `sheet=${mv.spriteSheet}`);
    check("Power Charge BUFFS damage (~1.3×)", before === 1 && during > 1.25 && during < 1.35, `dmgMult ${before} → ${during}`);
    // buff auto-reverts after ~5s (MAKI_POWER_DUR 300f)
    const reverted = await page.waitForFunction(() => window.__harness.p1().damageMult <= 1.001, null, { timeout: 8000, polling: 33 }).then(() => true).catch(() => false);
    check("Power Charge auto-reverts to 1× after duration", reverted, `dmgMult now=${(await p1()).damageMult}`);
  }

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
