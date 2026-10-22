// harness/spiderman_kit2.mjs — PHASE 4 kit extras: Web Swing Kick, Spider Sting, Web Cocoon.
// Web Swing Kick: attacking out of a swing releases it into a committed kick (keeps the arc momentum).
// Spider Sting:   Up+Special (Handstand) grants brief reversal invulnerability on startup.
// Web Cocoon:     air Down+Special fires a slow web that WRAPS the opponent on hit (held, then unravels).
// Synchronous stepping (aiVsAi.step) for frame-exact observation.
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a]);
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => window.__harness.state().frame > 30, null, { timeout: 10000 });

  // ── SPIDER STING (Up+Special → Handstand with reversal i-frames) ──
  console.log("\n── Spider Sting (Up+Special) grants reversal invulnerability ──");
  const sting = await page.evaluate(() => {
    const H = window.__harness; const step = n => { for (let i = 0; i < n; i++) H.aiVsAi.step(1); };
    H.resetFighterInput("p1"); for (let i = 0; i < 40; i++) { const p = H.p1(); if (p.grounded && Math.abs(p.vy) < 0.5) break; step(1); }
    H.fillEnergy(); H.p1SpecialDir("U"); step(1);
    return H.spiderSense();   // exposes invulnTimer
  });
  check("Up+Special (Handstand/Spider Sting) grants invulnerability", sting.invuln > 0, `invuln=${sting.invuln}`);

  // ── WEB SWING KICK (attack out of a swing) ──
  console.log("\n── Web Swing Kick (attack out of a swing) ──");
  const sk = await page.evaluate(() => {
    const H = window.__harness; const step = n => { for (let i = 0; i < n; i++) H.aiVsAi.step(1); };
    H.resetFighterInput("p1"); for (let i = 0; i < 40; i++) { const p = H.p1(); if (p.grounded && Math.abs(p.vy) < 0.5) break; step(1); }
    H.fillEnergy(); H.liftP1(150); step(1); H.p1SpecialDir("U"); step(3);        // start a swing
    const swingingBefore = H.p1().swinging;
    const r = H.spiderSwingAttack();                                            // attack out of the swing
    return { swingingBefore, ...r };
  });
  check("was swinging before the attack", sk.swingingBefore === true, `swinging=${sk.swingingBefore}`);
  check("attack out of swing fires the Web Swing Kick", sk.fired && sk.move === "spiderSwingKick", `fired=${sk.fired} move=${sk.move}`);
  check("the swing is released into the kick (no longer swinging)", sk.swinging === false, `swinging=${sk.swinging}`);
  check("the kick carries the arc momentum (vx ≠ 0)", Math.abs(sk.vx) > 0, `vx=${sk.vx}`);

  // ── WEB COCOON (air Down+Special → captures on hit) ──
  console.log("\n── Web Cocoon (air Down+Special) wraps the opponent on hit ──");
  const coc = await page.evaluate(() => {
    const H = window.__harness; const step = n => { for (let i = 0; i < n; i++) H.aiVsAi.step(1); };
    const p1x = H.p1().x; H.healP2(); H.clearProjectiles();
    H.resetFighterInput("p1"); for (let i = 0; i < 40; i++) { const p = H.p1(); if (p.grounded && Math.abs(p.vy) < 0.5) break; step(1); }
    H.setP2X(p1x + 95); H.fillEnergy(); H.liftP1(45); step(1);                  // just-airborne so the web spawns at the grounded foe's height
    const cast = H.p1SpecialDir("D");                                           // air Down+Special → Web Cocoon
    let cocooned = 0;
    for (let k = 0; k < 40; k++) { H.setP2X(p1x + 95); step(1); const w = H.spiderWebbed("p2"); if (w && w.cocooned > 0) { cocooned = w.cocooned; break; } }
    return { castPose: cast.cast, cocooned };
  });
  check("air Down+Special casts the Web Cocoon (web-net pose)", coc.castPose === "spiderWebBridge", `cast=${coc.castPose}`);
  check("on hit, the opponent is WRAPPED (cocoon capture state)", coc.cocooned > 0, `cocooned=${coc.cocooned}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man KIT-2 (Swing Kick + Spider Sting + Web Cocoon): ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
