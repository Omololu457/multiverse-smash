// harness/spiderman_kit.mjs — PHASE 3 kit: Catch & Return + WEBBED debuff.
// Catch & Return: the neutral Web Impact catches an incoming enemy NORMAL projectile, transfers ownership and
//   hurls it back (a new spiderWebReturn projectile at ~1.3x damage; the enemy bolt is removed).
// WEBBED: a web projectile connecting stacks a slow on the victim (3 stacks → stronger slow + dash disabled),
//   decaying over time. The slow is held in the universal timer loop (tickWebbed) so the victim can't reset it.
// Measured inside synchronous page.evaluate() blocks (aiVsAi.step → frame-exact; a fast return projectile
// can't fly out of view between real-time polls).
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => window.__harness.state().frame > 30, null, { timeout: 10000 });

  // ── CATCH & RETURN (synchronous, frame-exact) ──
  console.log("\n── Catch & Return (neutral Web Impact catches an incoming enemy projectile, hurls it back) ──");
  const cr = await page.evaluate(() => {
    const H = window.__harness; const step = (n) => { for (let i = 0; i < n; i++) H.aiVsAi.step(1); };
    const p1x = H.p1().x; H.setP2X(p1x + 300); H.resetFighterInput("p1");
    for (let i = 0; i < 60; i++) { const p = H.p1(); if (p.grounded && Math.abs(p.vy) < 0.5) break; step(1); }
    H.fillEnergy(); H.clearProjectiles(); step(1);
    H.spawnEnemyBolt({ damage: 40 }); step(3);
    const hadBolt = H.projectiles().some(p => p.name === "testBolt");
    const hp0 = H.p1().health;
    const cast = H.p1SpecialDir(null);                 // neutral Special = Web Impact → CATCH
    const imm = H.projectiles();
    const ret = imm.find(p => p.name === "spiderWebReturn");
    const boltGone = !imm.some(p => p.name === "testBolt");
    const hp1 = H.p1().health;
    return { hadBolt, boltGone, castPose: cast.cast, ret: ret ? { vx: ret.vx, dmg: ret.damage } : null, hp0, hp1 };
  });
  check("an incoming enemy bolt was present to catch", cr.hadBolt);
  check("neutral Web Impact enters the Catch pose (spiderWebThrow)", cr.castPose === "spiderWebThrow", `cast=${cr.castPose}`);
  check("the caught enemy bolt is removed from play", cr.boltGone);
  check("P1 took no damage (caught, not eaten)", cr.hp1 === cr.hp0, `hp ${cr.hp0}→${cr.hp1}`);
  check("a returned web projectile is hurled back (spiderWebReturn)", !!cr.ret);
  check("the return flies back toward the thrower (vx > 0)", !!cr.ret && cr.ret.vx > 0, `vx=${cr.ret ? cr.ret.vx : "n/a"}`);
  check("the return is amplified (~1.3x the 40 dmg → ≥48)", !!cr.ret && cr.ret.dmg >= 48, `dmg=${cr.ret ? cr.ret.dmg : "n/a"}`);

  // ── WEBBED (synchronous) ──
  console.log("\n── WEBBED debuff (web hits stack a slow; 3 stacks → slow + dash off; decays) ──");
  const wb = await page.evaluate(() => {
    const H = window.__harness; const step = (n) => { for (let i = 0; i < n; i++) H.aiVsAi.step(1); };
    const p1x = H.p1().x; H.healP2(); H.clearProjectiles();
    const base0 = H.spiderWebbed("p2").speedMult;
    // three Web Throws (Fwd+Special) at a close, parked dummy — each clean hit adds a WEBBED stack
    for (let i = 0; i < 3; i++) {
      H.setP2X(p1x + 115); H.resetFighterInput("p1");
      for (let k = 0; k < 40; k++) { const p = H.p1(); if (p.grounded && Math.abs(p.vy) < 0.5) break; step(1); }
      H.fillEnergy(); H.p1SpecialDir("F");
      for (let k = 0; k < 18; k++) { H.setP2X(p1x + 115); step(1); }   // re-park so the ball connects
    }
    const at3 = H.spiderWebbed("p2");
    H.setP2X(p1x + 115); for (let k = 0; k < 160; k++) step(1);        // let it decay fully
    const decayed = H.spiderWebbed("p2");
    return { base0, at3, decayed };
  });
  check("web hits apply WEBBED stacks (capped at 3)", wb.at3.stacks === 3, `stacks=${wb.at3.stacks}`);
  check("WEBBED slows the victim (speedMult < base)", wb.at3.speedMult < wb.base0, `speedMult=${wb.at3.speedMult} base=${wb.base0}`);
  check("3 stacks disables dash (dashCd held > 0)", wb.at3.dashCd > 0, `dashCd=${wb.at3.dashCd}`);
  check("WEBBED decays off (stacks → 0, speed restored)", wb.decayed.stacks === 0 && Math.abs(wb.decayed.speedMult - wb.base0) < 0.001, `stacks=${wb.decayed.stacks} speedMult=${wb.decayed.speedMult}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man KIT (Catch&Return + WEBBED): ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
