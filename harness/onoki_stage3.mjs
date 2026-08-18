// harness/onoki_stage3.mjs — STAGE 3: Onoki's 6 Dust Release specials.
// Directional (via p1SpecialDir): neutral=Rock Fist Transform / Fwd=Rock Fist Lunge / Back=Rock Arm
// Swing / Up=Taunting Combo Finisher (launcher) / Down=Spinning Cape (+2 rock projectiles). Each renders
// its move-name sprite and connects on the adjacent dummy. Then the Jutsu Charge/Launch: a real P-HOLD→
// release fires the Dust blast projectile (while a P-TAP stays the flight toggle). Data contract at the end.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `onoki_s3_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `onoki_s3_${name}_crop.png`), clip });
}
async function setup(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(1);
  await page.evaluate(() => window.__harness.fillEnergy?.());   // refill the Particle pool between specials
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=onoki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── directional melee specials ──
  console.log("\n── directional specials ──");
  const melee = [
    [null, "onokiRockFist", "onoki_rockfist_uniform", 56],
    ["F",  "onokiLunge",    "onoki_lunge_uniform",    64],
    ["B",  "onokiArmSwing", "onoki_armswing_uniform", 52],
  ];
  for (const [dir, move, sheet, gap] of melee) {
    await setup(gap);
    const hp0 = (await p2()).health;
    const res = await fireDir(dir);
    check(`${move}: fires (currentMove)`, res.move === move, `move=${res.move}`);
    await waitFrames(2); const mv = await p1();
    check(`${move}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
    await crop(move);
    await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`${move}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(4);
  }

  // ── Up = Taunting Combo Finisher (launcher) ──
  console.log("\n── Up special: Taunting Combo Finisher (launcher) ──");
  await setup(56);
  {
    const hp0 = (await p2()).health;
    const res = await fireDir("U");
    check("onokiTauntFin: fires", res.move === "onokiTauntFin", `move=${res.move}`);
    await waitFrames(2); const mv = await p1();
    check("onokiTauntFin: sprite → onoki_tauntfin_uniform", (mv.spriteSheet || "").includes("onoki_tauntfin_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("onokiTauntFin");
    // capture launch: poll for opponent upward velocity right after connect
    let launched = false;
    for (let i = 0; i < 24; i++) { await waitFrames(1); const d = await p2(); if ((d.vy || 0) < -1) launched = true; }
    const hp1 = (await p2()).health;
    check("onokiTauntFin: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    check("onokiTauntFin: LAUNCHES the opponent (vy < 0)", launched, `launched=${launched}`);
  }
  await waitGrounded(); await waitFrames(6);

  // ── Down = Spinning Cape + Rock Projectiles ──
  console.log("\n── Down special: Spinning Cape + Rock Projectiles ──");
  await setup(120);   // wider gap so the rock projectiles are what connect
  {
    const hp0 = (await p2()).health;
    const res = await fireDir("D");
    check("onokiCapeSpin: fires", res.move === "onokiCapeSpin", `move=${res.move}`);
    await waitFrames(2); const mv = await p1();
    check("onokiCapeSpin: sprite → onoki_capespin_uniform", (mv.spriteSheet || "").includes("onoki_capespin_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("onokiCapeSpin");
    // rock projectiles spawn a few frames in
    let sawRock = false;
    for (let i = 0; i < 12; i++) { await waitFrames(1); const ps = await projs(); if (ps.some(p => p.name === "onokiRock")) { sawRock = true; break; } }
    check("onokiCapeSpin: spawns rock projectiles (onokiRock)", sawRock, "");
    await waitFrames(26);
    const hp1 = (await p2()).health;
    check("onokiCapeSpin: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(6);

  // ── Jutsu Charge/Launch (P-HOLD → release fires the Dust blast; P-TAP stays flight) ──
  console.log("\n── Jutsu Charge/Launch (P-hold release) ──");
  await setup(150);
  {
    const flightBefore = (await p1()).flightActive;
    const hp0 = (await p2()).health;
    await page.keyboard.down("p"); await waitFrames(22); const ch = await p1(); await crop("jutsu_charge"); await page.keyboard.up("p");
    check("charge-hold shows the charge pose (onoki_jutsu_charge)", (ch.spriteSheet || "").includes("onoki_jutsu_charge_uniform"), `sheet=${ch.spriteSheet}`);
    await waitFrames(2); const mv = await p1();
    check("jutsu launch pose (onoki_jutsu_launch)", (mv.spriteSheet || "").includes("onoki_jutsu_launch_uniform") || mv.castMove === "onokiJutsu", `sheet=${mv.spriteSheet} cast=${mv.castMove}`);
    let sawBlast = false;
    for (let i = 0; i < 16; i++) { await waitFrames(1); const ps = await projs(); if (ps.some(p => p.name === "onokiJutsuBlast")) { sawBlast = true; break; } }
    check("jutsu spawns Dust blast projectile (onokiJutsuBlast)", sawBlast, "");
    await crop("jutsu_launch");
    await waitFrames(26);
    const hp1 = (await p2()).health;
    check("jutsu blast connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    check("P-HOLD did NOT toggle flight (flight unchanged)", (await p1()).flightActive === flightBefore, `before=${flightBefore} after=${(await p1()).flightActive}`);
  }

  // ── data contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("onoki")?.animationData || {});
  const keys = ["onokiRockFist", "onokiLunge", "onokiArmSwing", "onokiTauntFin", "onokiCapeSpin", "onokiJutsu", "charge"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("onoki"));
  check("all 6 specials + charge pose wired to real onoki sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Onoki Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/onoki_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
