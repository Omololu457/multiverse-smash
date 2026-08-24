// harness/bardock_stage5.mjs
// STAGE 5 evidence: Bardock's SUPER SAIYAN flash — built DEMOTED to a COSMETIC visual beat, NOT a playable
// alt-state (BARDOCK_ASSET_MAP.md item 1; same treatment as Goku's SSJ3 clip). Wired to the TAUNT slot.
// (1) WIRING — taunt → bardock_ssjflash_uniform (gold-hair flash, no box).
// (2) FLASH — forcing taunt plays the gold sheet (the power-up flourish).
// (3) REVERT — afterwards Bardock renders BASE idle (bardock_idle, black hair), not a gold idle.
// (4) NOT A FORM — no stat change (scale/HP), no `transformations` system, and the combat kit stays BASE
//     (heavy still resolves the base SWORD sheet, not a gold variant) → there is no sustained SSJ state.
// Screenshots → harness/shots/bardock_stage5_*.png. See BARDOCK_ASSET_MAP.md §S5.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `bardock_stage5_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);

try {
  await page.goto(`${base}/index.html?harness=1&p1=bardock`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("bardock").animationData);
  const cd = await page.evaluate(() => window.__harness.charDef("bardock"));

  console.log("\n── (1) wiring: taunt → the SSJ gold-hair flash sheet (no box) ──");
  check("taunt wired → bardock_ssjflash_uniform", (ad.taunt?.sheet || "").includes("bardock_ssjflash_uniform"), `sheet=${ad.taunt?.sheet}`);
  check("taunt is a 5-frame one-shot flash (non-looping)", ad.taunt?.frames === 5 && ad.taunt?.loop !== true, `frames=${ad.taunt?.frames} loop=${ad.taunt?.loop}`);

  console.log("\n── (2) flash plays the gold sheet + record baseline stats ──");
  const g0 = await p1();
  const scale0 = g0.spriteScale, hp0 = g0.maxHealth;
  await force("taunt"); await waitFrames(3);
  let sawGold = false; for (let i = 0; i < 6; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("bardock_ssjflash_uniform")) sawGold = true; await waitFrames(2); }
  await shot("ssjflash");
  check("SSJ flash renders bardock_ssjflash_uniform (gold power-up flourish)", sawGold, "");
  await force(null); await waitFrames(6);

  console.log("\n── (3) reverts to BASE (no sustained gold form) ──");
  await force("idle"); await waitFrames(4); const idleAfter = await p1();
  check("after flash, idle reverts to BASE bardock_idle_uniform (black hair)", (idleAfter.spriteSheet || "").includes("bardock_idle_uniform"), `sheet=${idleAfter.spriteSheet}`);

  console.log("\n── (4) NOT a playable form: combat kit stays BASE, no stat change, no transform system ──");
  await force("heavy"); await waitFrames(3); const hv = await p1(); await force(null); await waitFrames(2);
  check("heavy still resolves BASE sword sheet (bardock_heavy_uniform), not a gold variant", (hv.spriteSheet || "").includes("bardock_heavy_uniform"), `sheet=${hv.spriteSheet}`);
  const g1 = await p1();
  check("spriteScale unchanged by the flash (no form buff)", Math.abs((g1.spriteScale || 0) - scale0) < 0.001, `${scale0} → ${g1.spriteScale}`);
  check("maxHealth unchanged by the flash", g1.maxHealth === hp0, `${hp0} → ${g1.maxHealth}`);
  check("no `transformations` form-swap system (cosmetic only)", !cd.transformations, `transformations=${JSON.stringify(cd.transformations)}`);
  // structural: the ONLY gold sheet in the kit is the taunt — every other action points at a base bardock_ sheet.
  const goldOther = Object.entries(ad).filter(([k, v]) => k !== "taunt" && /ssjflash|gold|ssj/i.test(v?.sheet || ""));
  check("no gold idle/walk/normal sheets exist (only the cosmetic taunt is gold)", goldOther.length === 0, goldOther.map(([k]) => k).join(","));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
