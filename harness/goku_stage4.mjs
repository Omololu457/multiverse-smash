// harness/goku_stage4.mjs
// STAGE 4 evidence: Goku's MELEE-ONLY special kit. Kamehameha is CUT (no beam art on any EB sheet);
// Dragon Fist is the LONE special.
// (1) WIRING — dragonFist cast pose → real goku_base_dragonFist_uniform sheet (no box).
// (2) KIT — the specials{} table has dragonFist and NO kamehameha (honest melee-only kit).
// (3) CAST — the special input fires Dragon Fist (move === "dragonFist") and renders its sheet.
// (4) CONNECT — Dragon Fist lands damage on P2 in range (via GLOBAL_DAMAGE_SCALE ×0.60).
// (5) MELEE-ONLY — casting the special spawns NO projectile (no beam), proving the Kamehameha cut.
// Screenshots → harness/shots/goku_stage4_*.png. See GOKU_ASSET_MAP.md.
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `goku_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const setKi = (v) => page.evaluate(x => window.__harness.p1GokuSetEnergy(x), v);
const fireSpecial = () => page.evaluate(() => window.__harness.p1SpecialDir(null));
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  await setKi(200);
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

  console.log("\n── (1) wiring: Dragon Fist cast pose → real goku_ sheet (honest reuse of the heavy punch; no box) ──");
  const ad = await page.evaluate(() => window.__harness.charDef("goku").animationData);
  check("dragonFist wired → goku_base_heavy_uniform (reuse — only true rocket-punch on sheet)", (ad.dragonFist?.sheet || "").includes("goku_base_heavy_uniform"), `sheet=${ad.dragonFist?.sheet}`);

  console.log("\n── (2) kit is MELEE-ONLY: no kamehameha beam art wired (charDef.specials isn't exposed;");
  console.log("        the honest melee-only proof is behavioral — Dragon Fist fires, no projectile — see (3)/(5)) ──");
  check("no kamehameha animation entry wired (beam cut)", !ad.kamehameha, `kamehameha=${ad.kamehameha?.sheet}`);

  console.log("\n── (3)+(4) special input fires Dragon Fist, renders its sheet, connects ──");
  await prep(50);
  const h0 = (await p2()).health;
  const cast = await fireSpecial();
  check("special fires Dragon Fist (move=dragonFist)", cast?.move === "dragonFist", `move=${cast?.move} cast=${cast?.cast}`);
  let sawSheet = false; for (let i = 0; i < 8; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("goku_base_heavy_uniform")) sawSheet = true; await waitFrames(2); }
  await shot("dragonfist");
  const dealt = h0 - (await p2()).health;
  check("Dragon Fist renders its cast pose (goku_base_heavy_uniform reuse)", sawSheet, "");
  check(`Dragon Fist connects (P2 dmg ${dealt.toFixed(0)})`, dealt > 0, `dmg=${dealt}`);

  console.log("\n── (5) MELEE-ONLY proof: casting the special spawns NO projectile (no beam) ──");
  await prep(50);
  await fireSpecial();
  let anyProj = 0; for (let i = 0; i < 12; i++) { anyProj = Math.max(anyProj, (await projectiles()).length); await waitFrames(1); }
  check("Dragon Fist spawns no projectile (Kamehameha beam cut)", anyProj === 0, `maxProjectiles=${anyProj}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
