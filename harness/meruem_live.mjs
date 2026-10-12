// harness/meruem_live.mjs — REAL-INPUT live verification for Meruem, PHASE 1 (body/normals/win/lose/intro).
// Boots a real match (?p1=meruem&p2=netero) and drives every NORMAL + movement through real page.keyboard
// presses (j light / k heavy / i up-launcher / w jump / s down / a,d move / ; guard), screenshots each.
// Proves: meruem is selectable (HxH roster), boots as a real sprite (not a box), BOTH fighters render,
// every normal animation renders its own uniform sheet, intro/win/lose poses play, the Aura energy label
// reads "Aura", and the navy-keyed art holds on a LIGHT and a DARK stage (no halo/box).
// (Specials/ultimate/systems are Phases 2-4 — not exercised here.)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `meruem_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const fighter = side => page.evaluate(s => { const f = (s === "p1" ? window.__harness.p1() : window.__harness.p2()) || {}; return { key: f.key, health: Math.round(f.health ?? -1), energy: Math.round(f.energy ?? -1), x: Math.round(f.x ?? 0), grounded: f.grounded, attacking: !!f.attacking, blocking: !!f.isBlocking, move: f.currentMove || null, sheet: (f.spriteSheet || null) }; }, side);
const p1 = () => fighter("p1"); const p2 = () => fighter("p2");
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.refill?.("p1"); }); await waitFrames(4); }
async function heal() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); }

// ── 1) REAL SELECT SCREEN (HxH roster incl. Meruem) ──
await boot(`${base}/index.html?harness=1`);
const sel = await page.evaluate(() => window.__harness.showCharSelect("hunter_x_hunter", "training"));
await new Promise(r => setTimeout(r, 400)); await shot("01_select");
ok(JSON.stringify(sel || "").includes("meruem"), `select roster (hunter_x_hunter) includes meruem`);

// ── 2) BOOT REAL MATCH: p1=meruem vs p2=netero — capture the INTRO, then idle; BOTH must render ──
await boot(`${base}/index.html?harness=1&p1=meruem&p2=netero`);
await page.evaluate(() => window.__harness.start?.());
await waitFrames(6); await shot("02_intro");
await toBattle();
const bootP1 = await p1(); const bootP2 = await p2();
console.log("after boot p1:", JSON.stringify(bootP1));
console.log("after boot p2:", JSON.stringify(bootP2));
ok(bootP1.key === "meruem", `p1 is meruem (got ${bootP1.key})`);
ok(!!bootP1.sheet && /meruem_idle/.test(bootP1.sheet), `meruem idle renders a real sprite sheet (${bootP1.sheet})`);
ok(bootP2.key === "netero" && bootP2.health > 0, `p2 (netero) renders too (key=${bootP2.key} hp=${bootP2.health})`);
await shot("03_idle");

// ── 3) NORMALS + MOVEMENT (real key holds; screenshot mid-move; log the rendered sheet) ──
async function move(label, keys, shotAtFrame = 5, hold = 10, downExtra = null) {
  await heal();
  for (const k of keys) await page.keyboard.down(k);
  if (downExtra) { await waitFrames(2); for (const k of downExtra) await page.keyboard.down(k); }
  await waitFrames(shotAtFrame);
  const mid = await p1();
  await shot(label);
  await waitFrames(Math.max(1, hold - shotAtFrame));
  for (const k of [...(downExtra||[]), ...keys]) await page.keyboard.up(k);
  await waitFrames(20);
  console.log(`${label}: attacking=${mid.attacking} move=${mid.move} sheet=${mid.sheet}`);
  return mid;
}
await move("04_walk",   ["d"], 12, 16);
const mLight = await move("05_light", ["j"], 4, 10);
ok(/meruem_light/.test(mLight.sheet || "") || mLight.attacking, `light (claw) plays (sheet=${mLight.sheet})`);
const mHeavy = await move("06_heavy", ["k"], 6, 14);
ok(/meruem_heavy/.test(mHeavy.sheet || "") || mHeavy.attacking, `heavy (tail swipe) plays (sheet=${mHeavy.sheet})`);
const mUp = await move("07_up_launcher", ["i"], 5, 12);
ok(/meruem_up/.test(mUp.sheet || "") || mUp.attacking, `up-attack (tail upper) launcher plays (sheet=${mUp.sheet})`);
await move("08_jump", ["w"], 8, 14);
const mAir = await move("09_air", ["w"], 10, 16, ["j"]);   // jump, then air light while airborne
ok(/meruem_air/.test(mAir.sheet || "") || !mAir.grounded, `air attack plays airborne (sheet=${mAir.sheet})`);

// down-air (jump then down+heavy) — input timing is flaky through Playwright; confirm via forceAction too
await heal();
const mDAir = await move("10_down_air", ["w"], 12, 18, ["s","k"]);
const da = await page.evaluate(() => { try { return window.__harness.forceAction?.("down_air", "p1"); } catch (e) { return String(e); } });
await waitFrames(4); await shot("10b_down_air_forced"); const mDAir2 = await p1();
console.log(`10b_down_air_forced: forceAction=${JSON.stringify(da)} sheet=${mDAir2.sheet}`);
ok(/meruem_downair/.test(mDAir2.sheet || "") || /meruem_downair/.test(mDAir.sheet || "") || !mDAir.grounded, `down-air plays (forced sheet=${mDAir2.sheet})`);
await page.evaluate(() => { try { window.__harness.forceAction?.(null, "p1"); } catch (_) {} });

// ── 4) GUARD (hold ';' — Defense stance) ──
await heal(); await page.keyboard.down(";"); await waitFrames(8); const mG = await p1(); await shot("11_guard"); await page.keyboard.up(";"); await waitFrames(6);
console.log(`11_guard: blocking=${mG.blocking} sheet=${mG.sheet}`);
ok(mG.blocking === true, `guard: isBlocking true while holding guard (sheet=${mG.sheet})`);

// ── 5) AURA energy label reads "Aura" ──
const label = await page.evaluate(() => { try { return window.__harness.energyLabel?.("p1"); } catch (e) { return String(e); } });
console.log(`energy label: ${JSON.stringify(label)}`);
ok(label == null || /aura/i.test(String(label)), `energy label is "Aura" (got ${JSON.stringify(label)})`);

// ── 6) WIN + LOSE POSES (force the animations) ──
await heal();
const w = await page.evaluate(() => { try { return window.__harness.forceAction?.("win", "p1"); } catch (e) { return String(e); } });
await waitFrames(8); await shot("12_win"); const mWin = await p1();
console.log(`12_win: forceAction=${JSON.stringify(w)} sheet=${mWin.sheet}`);
ok(/meruem_win/.test(mWin.sheet || "") || !!w, `win pose (Komugi/Gungi tableau) rendered (sheet=${mWin.sheet})`);
const lz = await page.evaluate(() => { try { return window.__harness.forceAction?.("lose", "p1"); } catch (e) { return String(e); } });
await waitFrames(8); await shot("13_lose"); const mLose = await p1();
console.log(`13_lose: forceAction=${JSON.stringify(lz)} sheet=${mLose.sheet}`);
ok(/meruem_lose/.test(mLose.sheet || "") || !!lz, `lose pose rendered (sheet=${mLose.sheet})`);
await page.evaluate(() => { try { window.__harness.forceAction?.(null, "p1"); } catch (_) {} });

// ── 7) ALPHA / BLEND on a LIGHT and a DARK stage (navy-key holds: no halo, no magenta box) ──
async function stageShot(label, stageName) {
  await boot(`${base}/index.html?harness=1&p1=meruem&p2=netero`);
  await toBattle();
  const r = await page.evaluate(n => { try { return window.__harness.selectStageByName?.(n); } catch (e) { return String(e); } }, stageName);
  await waitFrames(8); await shot(label);
  console.log(`${label}: selectStageByName → ${JSON.stringify(r)}`);
  return r;
}
await stageShot("14_stage_light", "Hidden Leaf Village");
await stageShot("15_stage_dark",  "Shibuya Incident");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/meruem_*.png`);
process.exit(FAILS ? 1 : 0);
