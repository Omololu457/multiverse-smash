// harness/miles_stage4.mjs
// STAGE 4 evidence: Miles Morales' fixed-slot VENOM special kit + the Charge(O) dash-kick. Owner-locked
// mapping (MILES_MORALES_ASSET_MAP.md, Stage-0 items 5 & 8):
//   Special(L): neutral=Web-shot (procedural projectile) / Fwd=Venom Strike (melee + ring-burst FX) /
//               Up=Rising Venom-Arc (anti-air) / Down=Camouflage (self-buff stealth/evasion) /
//               Back=X Venom-Beam (big procedural blast) / air=Aerial Dive (down-forward kick)
//   Charge(O): Down+B dash-kick (offensive forward gap-closer).
// (1) DISPATCH — each dir routes to the right cast pose (no box).
// (2) CONNECT  — projectiles spawn + damage; melee specials damage P2 at range; ×0.60 for melee, offense-fold for proj.
// (3) STEALTH  — Camouflage sets the evasion window (_milesStealthTimer) and PHASES an incoming projectile through Miles.
// (4) DASH     — Charge dash-kick fires its pose + connects, and is cooldown-gated.
// Screenshots → harness/shots/miles_stage4_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `miles_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const milesDash = () => page.evaluate(() => window.__harness.milesDash());
const projCount = () => page.evaluate(() => window.__harness.perf().projectiles);
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.hitstun || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP1Energy?.(200); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=miles&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── (1)+(2) each Special slot dispatches its cast pose + connects/spawns ──");
  // neutral = Web-shot (projectile)
  await prep(150);
  let r = await specialDir(null);
  check("neutral → milesWeb cast", r.cast === "milesWeb", `cast=${r.cast}`);
  let sawProj = false; for (let i = 0; i < 10; i++) { if ((await projCount()) > 0) { sawProj = true; break } await waitFrames(2); }
  check("web-shot spawns a projectile", sawProj, "");
  { const h0 = (await p2()).health; await waitFrames(16); check("web-shot damages P2 at range", (await p2()).health < h0, ``); await shot("web"); }

  // Back = X Venom-Beam (big projectile)
  await prep(140);
  r = await specialDir("B");
  check("Back → milesVenomBeam cast", r.cast === "milesVenomBeam", `cast=${r.cast}`);
  sawProj = false; for (let i = 0; i < 12; i++) { if ((await projCount()) > 0) { sawProj = true; break } await waitFrames(2); }
  check("venom-beam spawns a projectile", sawProj, "");
  { const h0 = (await p2()).health; await waitFrames(18); check("venom-beam damages P2", (await p2()).health < h0, ``); await shot("beam"); }

  // Fwd = Venom Strike (melee + ring FX)
  await prep(52);
  { const h0 = (await p2()).health; r = await specialDir("F");
    check("Fwd → milesVenomStrike cast", r.cast === "milesVenomStrike", `cast=${r.cast}`);
    await waitFrames(10); check("venom-strike damages P2 (melee)", (await p2()).health < h0, ``); await shot("strike"); }

  // Up = Rising Venom-Arc (anti-air launcher)
  await prep(40);
  { const h0 = (await p2()).health; r = await specialDir("U");
    check("Up → milesVenomArc cast", r.cast === "milesVenomArc", `cast=${r.cast}`);
    await waitFrames(10); check("rising venom-arc damages P2", (await p2()).health < h0, ``); await shot("arc"); }

  // air = Aerial Dive
  await prep(30); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(5);
  r = await specialDir(null);
  check("airborne → milesDive cast", r.cast === "milesDive", `cast=${r.cast}`); await shot("dive");
  await waitGrounded();

  console.log("\n── (3) Camouflage (Down) — self-buff: sets the evasion window + PHASES an incoming attack through Miles ──");
  // CONTROL: a NON-stealthed Miles DOES take damage from the P2 attack (proves the attack itself connects).
  await prep(46);
  await page.evaluate(() => window.__harness.healP1?.());
  const ctrlHp = (await p1()).health;
  await page.evaluate(() => window.__harness.p2Attack());
  await waitFrames(16);
  const ctrlDmg = ctrlHp - (await p1()).health;
  check("control: a P2 attack DOES damage a non-stealthed Miles", ctrlDmg > 0, `dmg=${ctrlDmg}`);
  // STEALTH: cast Camouflage, then the SAME P2 attack phases through (no damage).
  await prep(46);
  r = await specialDir("D");
  check("Down → milesStealth cast", r.cast === "milesStealth", `cast=${r.cast}`);
  const st = await p1();
  check("camouflage sets the evasion window (_milesStealthTimer > 0)", st.milesStealthTimer > 0, `t=${st.milesStealthTimer}`);
  await shot("stealth");
  await page.evaluate(() => window.__harness.healP1?.());
  const sHp = (await p1()).health;
  await page.evaluate(() => window.__harness.p2Attack());
  await waitFrames(16);
  const stealthDmg = sHp - (await p1()).health;
  check("camouflaged Miles PHASES through the P2 attack (no damage)", stealthDmg <= 0.5, `dmg=${stealthDmg}`);

  console.log("\n── (4) Charge(O) Down+B dash-kick — offensive gap-closer, cooldown-gated ──");
  await prep(70);
  { const h0 = (await p2()).health; r = await milesDash();
    check("dash-kick → milesDashKick cast", r.cast === "milesDashKick", `cast=${r.cast}`);
    await waitFrames(10); check("dash-kick connects (P2 dmg)", (await p2()).health < h0, ``); await shot("dashkick"); }
  const cd = (await p1()).milesDashCd;
  check("dash-kick sets a cooldown", cd > 0, `cd=${cd}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
