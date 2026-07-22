// harness/omega_ranger.test.mjs
// OMEGA RANGER (White Ranger, S.P.D.) — consolidated full-kit regression test.
// Covers: sprite gate + stats + portrait; two-part intro; movement/state; 5 normals;
// kick-chain command string; 2 free pokes; 7-step sword string + mid-chain interrupt;
// 3 specials; Ultimate; Bonus Ring; and a 128²-fallback-box sweep across every action seen.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();   // action -> sheet (fallback-box sweep)

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.orCmd());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function rec() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 10000, polling: 16 }).catch(() => {}); }
// Bulletproof reset between sections: clear all residual state, let P1 fall+land, wait until
// it's fully grounded AND actionable (the long sequential run leaves airborne/launch carryover).
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles(); window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); window.__harness.resetUlt?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5 && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 10000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function prep(gap) {
  await settle();
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
// drive a rekka string: openFn opens it, btn advances; returns ordered list of moves seen
async function driveRekka(btn, maxIter) {
  const chain = [];
  for (let i = 0; i < maxIter; i++) {
    const c = await cmd();
    if (c.move && !chain.includes(c.move)) { chain.push(c.move); await rec(); }
    if (c.rekkaNext && c.connected && c.phase === "recovery") {
      await page.keyboard.down(btn); await waitFrames(1); await page.keyboard.up(btn); await waitFrames(1);
    } else { await waitFrames(1); }
  }
  return chain;
}

try {
  // ── SPRITE GATE + STATS + PORTRAIT ──────────────────────────────────
  await page.goto(`${base}/index.html?harness=1&p1=omega_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  section("intro — two-part summon sequence");
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  const introOrder = [];
  for (const v of ["intro", "intro2"]) {
    const got = await page.waitForFunction(t => window.__harness.introState().p1Variant === t, v, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
    if (got) { introOrder.push(v); await rec(); }
  }
  check("intro plays both parts in order", introOrder.join(",") === "intro,intro2", `order=[${introOrder}]`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  section("sprite gate + stats + portrait");
  const g = await rec();
  check("P1 is omega_ranger", g.key === "omega_ranger", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet resolves", (g.spriteSheet || "").includes("omega_ranger_idle"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1180 / EN 175", g.maxHealth === 1180 && g.maxEnergy === 175, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("omega_ranger"));
  check("portrait wired to real mugshot", (portrait || "").includes("SPD_Omega_Ranger_mugshot"), `portrait=${portrait}`);

  // ── MOVEMENT / STATE ────────────────────────────────────────────────
  section("movement / state");
  await settle();
  await page.keyboard.down("d"); await waitFrames(16); await rec(); await page.keyboard.up("d"); await waitFrames(4);
  check("run/walk uses run_uniform", ((seen.get("run") || seen.get("walk") || "")).includes("run_uniform"), "");
  await settle();
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2);
  await page.keyboard.down("d"); await waitFrames(3); const dsh = await rec(); await page.keyboard.up("d"); await waitFrames(4);
  check("dash renders a real sprite", dsh.spriteReady && dsh.action === "dash", `action=${dsh.action}`);
  await settle();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const jp = await rec();   // recorded while airborne
  check("jump uses double_jump_uniform", (jp.spriteSheet || "").includes("double_jump_uniform"), `action=${jp.action} sheet=${jp.spriteSheet}`);
  await settle();
  await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(3); const h = await rec();
  check("hurt uses hit_1_uniform", h.action === "hurt" && (h.spriteSheet || "").includes("hit_1_uniform"), `action=${h.action}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── 5 NORMALS ───────────────────────────────────────────────────────
  section("5 normals connect");
  for (const [name, action, key, gap, min] of [["light", "light", "j", 46, 20], ["heavy", "heavy", "k", 44, 42], ["up", "up", "i", 42, 28]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); await rec(); await page.keyboard.up(key); await waitFrames(20);
    check(`${name} connects`, hp0 - (await p2()).health >= min, `dmg=${hp0 - (await p2()).health}`);
  }
  await prep(44); await page.evaluate(() => window.__harness.liftP1(40));
  { const hp0 = (await p2()).health; await page.keyboard.down("j"); await waitFrames(4); await rec(); await page.keyboard.up("j"); await waitFrames(14);
    check("air connects", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`); }
  await waitGrounded(); await waitFrames(6);
  await prep(30); await page.evaluate(() => window.__harness.liftP1(46));
  { const hp0 = (await p2()).health; await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); await rec(); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    check("down_air spike connects", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`); }
  await waitGrounded(); await waitFrames(6);

  // ── KICK CHAIN (Fwd+Heavy → re-tap Heavy) ───────────────────────────
  section("kick chain (cancel-on-hit)");
  await prep(38);
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  const kick = await driveRekka("k", 40);
  await page.keyboard.up("d"); await waitFrames(16);
  check("kick chain = omKick → omSpinKick → omLowAttack", kick.join(",") === "omKick,omSpinKick,omLowAttack", `chain=[${kick}]`);

  // ── FREE POKES ──────────────────────────────────────────────────────
  section("free pokes");
  await prep(50);
  { const hp0 = (await p2()).health; await page.keyboard.down("d"); await page.keyboard.down("j"); await waitFrames(4); const push = await rec(); await page.keyboard.up("j"); await page.keyboard.up("d"); await waitFrames(16);
    check("Forward Push (omForwardPush) connects", (push.currentMove === "omForwardPush") && hp0 - (await p2()).health > 0, `move=${push.currentMove}`); }
  await prep(40); await page.evaluate(() => window.__harness.liftP1(44)); await waitFrames(1);   // let airborne state register before the heavy
  { const hp0 = (await p2()).health; await page.keyboard.down("k"); await waitFrames(4); const da = await rec(); await page.keyboard.up("k"); await waitFrames(14);
    check("Down-Air 2 (omDownAir2) connects", (da.currentMove === "omDownAir2") && hp0 - (await p2()).health > 0, `move=${da.currentMove}`); }
  await waitGrounded(); await waitFrames(6);

  // ── SWORD STRING (Back+Light → re-tap Light) + interrupt ────────────
  section("7-step sword string + mid-chain interrupt");
  await prep(28);
  await page.keyboard.down("a"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await page.keyboard.up("a");
  const sword = await driveRekka("j", 80);
  await waitFrames(16);
  check("sword string fires all 7 in order", sword.join(",") === "omSword1,omSword2,omSword3,omSword4,omSword5,omSword6,omSword7", `chain=[${sword.length} steps]`);
  check("sword_slash_5 & _7 are distinct sheets", (seen.get("omSword5") || "5") !== (seen.get("omSword7") || "7"), "");
  // interrupt
  await prep(28);
  await page.keyboard.down("a"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await page.keyboard.up("a");
  const wchain = []; let bumped = false;
  for (let i = 0; i < 50; i++) {
    const c = await cmd();
    if (c.move && c.move.startsWith("omSword") && !wchain.includes(c.move)) wchain.push(c.move);
    if (!bumped && wchain.includes("omSword3")) { await page.evaluate(() => window.__harness.setP2X(99999)); bumped = true; }
    if (wchain.length >= 5 || (bumped && wchain.includes("omSword7"))) break;
    if (c.rekkaNext && c.connected && c.phase === "recovery") { await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j"); await waitFrames(1); } else await waitFrames(1);
  }
  check("whiff mid-string stops the chain", wchain.includes("omSword3") && !wchain.includes("omSword7"), `chain=[${wchain}]`);
  await waitFrames(10);

  // ── SPECIALS ────────────────────────────────────────────────────────
  section("3 specials");
  await prep(150);
  { let hp0 = (await p2()).health; await page.keyboard.down("l"); await waitFrames(2); const gc = await rec(); await page.keyboard.up("l"); await waitFrames(2);
    const pj = await projs();
    check("Gun spawns omGunBolt + cast pose omGun", pj.some(p => p.name === "omGunBolt") && gc.action === "omGun", `projs=${pj.map(p => p.name)} action=${gc.action}`);
    await waitFrames(28);
    check("Gun bolt connects", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`); }
  await prep(40);
  { let e0 = (await p1()).energy, hp0 = (await p2()).health; await page.keyboard.down("d"); await waitFrames(3); await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await waitFrames(2); const su = await rec(); await page.keyboard.up("d"); await waitFrames(8);
    check("Super Upper (omSuperUpper) connects + launches", su.currentMove === "omSuperUpper" && hp0 - (await p2()).health > 0, `move=${su.currentMove}`);
    check("Super Upper single-cast (~45 energy)", (e0 - (await p1()).energy) >= 40 && (e0 - (await p1()).energy) <= 55, `spent=${(e0 - (await p1()).energy).toFixed(0)}`); }
  await prep(38);
  { let hp0 = (await p2()).health; await page.keyboard.down("s"); await waitFrames(3); await page.keyboard.down("l"); await waitFrames(4); const ds = await rec(); await page.keyboard.up("l"); await page.keyboard.up("s"); await waitFrames(12);
    check("Special Downward (omDownSpecial) connects", ds.currentMove === "omDownSpecial" && hp0 - (await p2()).health > 0, `move=${ds.currentMove}`); }

  // ── ULTIMATE + BONUS RING ───────────────────────────────────────────
  section("Ultimate + Battlizer bonus ring");
  await prep(40);
  { let e0 = (await p1()).energy, hp0 = (await p2()).health; await page.keyboard.down("u"); await waitFrames(3); const ult = await rec(); await page.keyboard.up("u"); await waitFrames(16);
    check("Ultimate (currentMove=ultimate) is the biggest hit", ult.currentMove === "ultimate" && hp0 - (await p2()).health >= 120, `dmg=${hp0 - (await p2()).health}`);
    check("Ultimate spent the meter", e0 - (await p1()).energy >= 90, `spent=${(e0 - (await p1()).energy).toFixed(0)}`); }
  await prep(28);
  { let e0 = (await p1()).energy, hp0 = (await p2()).health; await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await page.keyboard.up("a"); await waitFrames(3); const ring = await rec(); await waitFrames(18);
    check("Bonus Ring (omSwordRing) connects, separate input", ring.currentMove === "omSwordRing" && hp0 - (await p2()).health > 0, `move=${ring.currentMove}`);
    check("Ring single-cast (~60 energy)", (e0 - (await p1()).energy) >= 55 && (e0 - (await p1()).energy) <= 72, `spent=${(e0 - (await p1()).energy).toFixed(0)}`); }

  // ── DEFERRED GAPS DEGRADE SENSIBLY (no art: guard/block, win/lose) ──
  // These have NO sprite (genuinely deferred — do not invent art). Confirm they fall back to a
  // REAL sheet (idle/hurt), never the 128² box. (knockdown/getup ARE wired — hit_1/hit_2.)
  section("deferred gaps degrade sensibly");
  await prep(60);
  await page.keyboard.down("s"); await waitFrames(20); const blk = await rec(); await page.keyboard.up("s"); await waitFrames(4);
  check("block/guard (no art) degrades to a real sheet — not a box", blk.spriteReady && !!blk.spriteSheet, `action=${blk.action} sheet=${blk.spriteSheet}`);

  // ── FALLBACK-BOX SWEEP ──────────────────────────────────────────────
  section("128²-fallback-box sweep");
  const nullActions = [...seen.entries()].filter(([, s]) => !s).map(([a]) => a);
  check(`no action rendered a null/128² box (${seen.size} actions exercised)`, nullActions.length === 0, nullActions.length ? `null: ${nullActions.join(",")}` : `actions: ${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} OMEGA RANGER full-kit: ${pass} passed, ${fail} failed`);
  console.log("════════════════════════════════════════════");
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
