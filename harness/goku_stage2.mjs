// harness/goku_stage2.mjs
// STAGE 2 evidence: Goku's 5 normals + crouchLight, all real base-sheet art (shared across the 4 forms).
// (1) WIRING — every normal action's animationData points at a real goku_base_*_uniform sheet (no box).
// (2) CONNECT — light/heavy/up land damage on P2 and render their sheet (all via GLOBAL_DAMAGE_SCALE ×0.60).
//     ★up has its OWN launcher art (goku_base_upAttack_uniform), not a heavy reuse.
// (3) AIR — air + down_air render their attack sheets airborne (each honest own art).
// (4) LOW — crouch+light auto-swaps to the crouchLight low-sweep sheet.
// Screenshots → harness/shots/goku_stage2_*.png. See GOKU_ASSET_MAP.md.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `goku_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("goku").animationData);

  console.log("\n── (1) wiring: every normal action → a real goku_base_ sheet (no box) ──");
  for (const [k, tag] of [
    ["light", "goku_base_light_uniform"], ["heavy", "goku_base_heavy_uniform"], ["up", "goku_base_upAttack_uniform"],
    ["air", "goku_base_airAttack_uniform"], ["down_air", "goku_base_downAir_uniform"], ["crouchLight", "goku_base_crouchLight_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);
  check("up has its OWN launcher art (not a heavy reuse)", (ad.up?.sheet || "") !== (ad.heavy?.sheet || ""), `up=${ad.up?.sheet}`);
  check("down_air has its OWN art (not an air reuse)", (ad.down_air?.sheet || "") !== (ad.air?.sheet || ""), `down_air=${ad.down_air?.sheet}`);

  console.log("\n── (2) ground normals connect (damage P2) + render their sheet ──");
  for (const [name, key, tag] of [["light", "j", "goku_base_light_uniform"], ["heavy", "k", "goku_base_heavy_uniform"], ["up", "i", "goku_base_upAttack_uniform"]]) {
    await prep(48);
    const h0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(2);
    let sawSheet = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sawSheet = true; await waitFrames(2); }
    await page.keyboard.up(key); await waitFrames(8);
    const dealt = h0 - (await p2()).health;
    await shot(name);
    check(`${name} renders ${tag}`, sawSheet, "");
    check(`${name} connects (P2 dmg ${dealt.toFixed(0)})`, dealt > 0, `dmg=${dealt}`);
  }

  console.log("\n── (2b) air + down_air render their attack sheets airborne (honest own art) ──");
  await prep(44); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  await page.keyboard.down("j"); let sawAir = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("goku_base_airAttack_uniform")) sawAir = true; await waitFrames(2); } await page.keyboard.up("j");
  await shot("air"); check("air (airborne J) renders goku_base_airAttack_uniform", sawAir, "");
  await waitGrounded();
  await prep(28); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  await page.keyboard.down("s"); await page.keyboard.down("j"); let sawDA = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("goku_base_downAir_uniform")) sawDA = true; await waitFrames(2); } await page.keyboard.up("j"); await page.keyboard.up("s");
  await shot("down_air"); check("down_air (airborne S+J) renders goku_base_downAir_uniform", sawDA, "");
  await waitGrounded();

  console.log("\n── (3) crouch+light auto-swaps to the low-sweep crouchLight sheet ──");
  await prep(46);
  await page.keyboard.down("s"); await waitFrames(3);
  await page.keyboard.down("j");
  let sawLow = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("goku_base_crouchLight_uniform")) sawLow = true; await waitFrames(2); }
  await page.keyboard.up("j"); await page.keyboard.up("s");
  await shot("crouchLight"); check("crouch+light renders goku_base_crouchLight_uniform (low sweep)", sawLow, "");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
