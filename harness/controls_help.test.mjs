// Temp smoke: prove the Track A Controls overlay opens from pause (device-aware) and backs out.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const H = fn => page.evaluate(fn);
const padNav = opts => page.evaluate(o => window.__harness.padNav(o), opts);
try {
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.padNav, null, { timeout: 15000 });
  await H(() => window.__harness.boot());
  await page.waitForTimeout(200);
  // Open pause via Start (Options), then d-pad down to "controls".
  await padNav({ start: true }); await page.waitForTimeout(50);
  const st0 = await H(() => window.__harness.pauseSel());
  check("pause menu opened", st0.gameState === "paused", `gs=${st0.gameState} item=${st0.item}`);
  // Walk down until item === controls (max 8 steps).
  let found = null;
  for (let i = 0; i < 8; i++) { const s = await H(() => window.__harness.pauseSel()); if (s.item === "controls") { found = s; break } await padNav({ down: true }); await page.waitForTimeout(20); }
  check("'controls' item reachable in pause", !!found, found ? `idx=${found.index}` : "not found");
  await padNav({ confirm: true }); await page.waitForTimeout(60);
  const gs = await H(() => window.__harness.state?.().gameState ?? window.__harness.padMenuState().gameState);
  check("selecting Controls opens the overlay", gs === "controlsHelp", `gs=${gs}`);
  await page.screenshot({ path: path.join(SHOTS, "controls_help.png") });
  // Back out (Circle).
  await padNav({ back: true }); await page.waitForTimeout(60);
  const gs2 = await H(() => window.__harness.padMenuState().gameState);
  check("Circle backs out to pause", gs2 === "paused", `gs=${gs2}`);
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  // ── HELP == MAPPING (input quick-wins Phase 2). Ground truth is BEHAVIOUR, not the table: press each
  // physical standard-gamepad button on a fake pad, read which action the game actually resolves, then
  // assert every help surface shows THAT button's glyph for THAT action, for every pad family. ──
  console.log("\n── help glyphs == live pad mapping ─────────────────────────");
  const POS_OF_BUTTON = { 0: "down", 1: "right", 2: "left", 3: "up", 4: "l1", 5: "r1", 6: "l2", 7: "r2" };   // standard-mapping physics, independent of the game
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs2 = []; page2.on("pageerror", e => errs2.push(String(e)));
  await page2.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`, { waitUntil: "load" });
  await page2.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page2.mouse.click(640, 360);
  await page2.evaluate(() => {
    window.__pad = { index: 0, id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad];
    window.dispatchEvent(new Event("gamepadconnected"));
    window.__harness.boot(); window.__harness.setInputType(1, "controller");
  });
  const fr = async n => { const s = await page2.evaluate(() => window.__harness.state().frame); await page2.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); };
  await fr(20);
  const ACTIONS = ["light", "heavy", "jump", "block", "special", "ultimate", "grab", "charge"];
  const live = {};   // action → physical button index that actually triggers it
  for (let b = 0; b <= 7; b++) {
    await page2.evaluate(() => window.__harness.setHitstun(60, "p1"));   // hold still so nothing (jump/attack) moves the fighter
    await fr(14);
    await page2.evaluate(i => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1; }, b);
    await fr(2);
    const snap = await page2.evaluate(() => window.__harness.ui.inputSnapshot("p1"));
    await page2.evaluate(i => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0; }, b);
    const on = ACTIONS.filter(a => snap && snap[a]);
    check(`button ${b} (${POS_OF_BUTTON[b]}) resolves to exactly one action`, on.length === 1, `actions=${on.join(",") || "none"}`);
    if (on.length === 1) live[on[0]] = b;
  }
  check("every action has a live button", ACTIONS.every(a => live[a] != null), JSON.stringify(live));
  const FAMILIES = ["playstation", "xbox", "nintendo", "generic"];
  const rowVal = (rows, label) => (rows.find(r => r[0] === label) || [])[1] || "";
  for (const fam of FAMILIES) {
    const S = await page2.evaluate(f => { const id = { playstation: "DualSense 054c", xbox: "Xbox 045e", nintendo: "Pro Controller 057e", generic: "Unknown pad" }[f]; window.__pad.id = id; return window.__harness.ui.helpSurfaces(); }, fam);
    const G = S.glyphs;
    for (const a of ACTIONS) {
      if (live[a] == null) continue;
      const glyph = G[POS_OF_BUTTON[live[a]]];
      const label = a[0].toUpperCase() + a.slice(1);
      for (const [name, rows] of [["Move List", S.moveList], ["controls overlay", S.overlay]]) {
        const v = rowVal(rows, label);
        check(`${G.label}: ${name} '${label}' shows ${glyph}`, v.startsWith(glyph), `shows "${v}"`);
      }
      if (S.academy[a] != null) check(`${G.label}: Academy '${label}' shows ${glyph}`, S.academy[a] === glyph, `shows "${S.academy[a]}"`);
    }
    // No help surface may name a glyph for an action it isn't bound to (e.g. Cross for Light).
    for (const [name, rows] of [["Move List", S.moveList], ["controls overlay", S.overlay]]) {
      const wrong = ACTIONS.filter(a => live[a] != null).filter(a => { const v = rowVal(rows, a[0].toUpperCase() + a.slice(1)); return Object.values(POS_OF_BUTTON).some(p => p !== POS_OF_BUTTON[live[a]] && G[p] && v.startsWith(G[p])); });
      check(`${G.label}: ${name} has no glyph pointing at the wrong button`, wrong.length === 0, wrong.join(","));
    }
  }
  // The static (no-pad) Move List table is generated too: PlayStation names.
  const S0 = await page2.evaluate(() => window.__harness.ui.helpSurfaces());
  check("static CONTROL_REFERENCE.controller Light = Square", rowVal(S0.staticRef, "Light").includes("Square"), rowVal(S0.staticRef, "Light"));
  check("static CONTROL_REFERENCE.controller Jump = Cross", rowVal(S0.staticRef, "Jump").includes("Cross"), rowVal(S0.staticRef, "Jump"));
  check("no JS errors (mapping page)", errs2.length === 0, errs2.slice(0, 3).join(" | "));
  await page2.close();
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); }
console.log(`\n  CONTROLS-HELP SMOKE: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
