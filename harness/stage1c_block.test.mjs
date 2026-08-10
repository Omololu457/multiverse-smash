// MK-feel STAGE 1c CONFIRMATION — block moved OFF Down onto a dedicated input (keyboard ';' / gamepad Circle).
// Drives the REAL game (Playwright) to prove:
//   • ';' → guard ON;  release → guard OFF   (dedicated block key works)
//   • holding Down (S) does NOT block anymore (the whole point)
//   • the four Down/grab mechanics that used to collide with block all work with ZERO block:
//       (1) crouch (hold Down)   (2) Down-air (S+J airborne)   (3) Sasuke Susanoo grab (Grab while crouching)
//       (4) taunt charge (Down-hold)
//   • plus a static check that the gamepad path binds Circle → block.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ["--disable-background-timer-throttling", "--autoplay-policy=no-user-gesture-required"] });
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`  ${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

async function withPage(char, fn) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
  const p1 = () => page.evaluate(() => window.__harness.p1());
  const stf = () => page.evaluate(() => window.__harness.state());
  const wf = async (n) => { const s = (await stf()).frame; await page.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { timeout: 20000, polling: 16 }); };
  await page.goto(`${base}/index.html?harness=1&p1=${char}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot()); await wf(5);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  try { await fn({ page, p1, wf }); } finally { await page.close(); }
}
const blockingOverWindow = async ({ p1, wf }, frames = 10) => { let anyBlock = false; for (let i = 0; i < frames; i++) { if ((await p1()).blocking) anyBlock = true; await wf(2); } return anyBlock; };

try {
  // ── DEFAULT CHAR: block key + Down-no-longer-blocks + crouch + down-air + taunt ──
  await withPage("gojo", async (ctx) => {
    const { page, p1, wf } = ctx;

    console.log("── A. dedicated block key ';' ──");
    await page.keyboard.down(";"); await wf(4);
    check("hold ';' → guard ON (isBlocking true)", (await p1()).blocking === true, `blocking=${(await p1()).blocking}`);
    await page.keyboard.up(";"); await wf(4);
    check("release ';' → guard OFF", (await p1()).blocking === false);

    console.log("── B. holding Down no longer blocks (crouch) ──");
    await page.keyboard.down("s");
    const blockedWhileDown = await blockingOverWindow(ctx, 10);
    check("hold Down (S) NEVER sets block (crouch ≠ block now)", blockedWhileDown === false);
    await page.keyboard.up("s"); await wf(3);

    console.log("── D. taunt charge (Down-hold) — no block collision ──");
    await page.keyboard.down("s");
    const blockedDuringTaunt = await blockingOverWindow(ctx, 16);   // spans well into the taunt-charge window
    check("Down-hold taunt-charge never blocks", blockedDuringTaunt === false);
    await page.keyboard.up("s"); await wf(3);

    console.log("── C. Down-air (S+J airborne) — fires, no block ──");
    await page.evaluate(() => window.__harness.liftP1?.(60));
    await page.keyboard.down("s"); await page.keyboard.down("j");
    let sawDownAir = false, blockedInAir = false;
    for (let i = 0; i < 8; i++) { const s = await p1(); if ((s.currentMove || "").includes("down_air") || (s.action || "").includes("down_air")) sawDownAir = true; if (s.blocking) blockedInAir = true; await wf(2); }
    await page.keyboard.up("j"); await page.keyboard.up("s");
    check("Down-air (S+J) never sets block", blockedInAir === false);
    check("Down-air move actually fired (down_air)", sawDownAir === true);
  });

  // ── SASUKE: Susanoo command-grab (on Special in Susanoo) — functions + no block collision ──
  await withPage("sasuke", async (ctx) => {
    const { page, p1, wf } = ctx;
    const p2 = () => page.evaluate(() => window.__harness.p2());
    console.log("── E. Sasuke Susanoo grab — crouch never blocks, grab still functions ──");
    // Enter Susanoo (ultimate) so the Susanoo command-grab is armed; tolerate the entry cinematic.
    await page.keyboard.down("u"); await wf(3); await page.keyboard.up("u");
    await page.waitForFunction(() => (window.__harness.p1().susanooStage || 0) >= 1, null, { timeout: 12000, polling: 16 }).catch(() => {});
    await wf(10);
    // (E1) crouch (hold Down) right next to the foe — the OLD collision would have forced guard here.
    await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 120); window.__harness.healP2?.(); });
    await page.keyboard.down("s");
    const blockedWhileCrouching = await blockingOverWindow(ctx, 8);
    await page.keyboard.up("s"); await wf(2);
    check("crouch next to foe never sets block (collision gone)", blockedWhileCrouching === false);
    // (E2) the Susanoo command-grab (Special in Susanoo) still functions.
    await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 120); window.__harness.healP2?.(); });
    await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");
    let grabbed = false, blockedDuringGrab = false;
    for (let i = 0; i < 20; i++) { const s = await p1(); if (s.blocking) blockedDuringGrab = true; if ((await p2()).isGrabbed) { grabbed = true; break; } await wf(1); }
    check("Susanoo command-grab fires (foe isGrabbed)", grabbed === true);
    check("grabbing never sets block", blockedDuringGrab === false);
  });

  // ── STATIC: the gamepad path binds Circle → block ──
  console.log("── F. gamepad Circle → block (static) ──");
  const inputSrc = fs.readFileSync(path.join(ROOT, "input.js"), "utf8");
  check("pollGamepad returns block: btn(PS5_MAP.CIRCLE)", /block:\s*btn\(PS5_MAP\.CIRCLE\)/.test(inputSrc));
  const gameSrc = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
  check("P1 keyboard binds block: \";\"", /block:\s*";"/.test(gameSrc));
  check("block gate reads inputState.block (not .down)", /inputState\.block \|\| fighter\._forceGuard/.test(gameSrc));
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════ STAGE 1c BLOCK: ${pass} passed, ${fail} failed ════════`);
  process.exit(fail ? 1 : 0);
}
