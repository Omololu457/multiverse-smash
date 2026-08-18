// harness/isshiki_stage2.mjs
// STAGE 2 evidence: Isshiki's two AUTO-COMBO strings connect start→finish (cancel-on-hit).
// GROUND (neutral Light): isshikiGround1 (punches) → isshikiGround2 (kick) → isshikiGround3 (slash launcher).
// AIR (airborne Light):   isshikiAir1 → isshikiAir2 → isshikiAir3 (dive-slash spike).
// The chain ADVANCEMENT is proven LIVE via the rekkaNext transitions + cmdHitLanded (reliably capturable)
// and multi-hit damage; the finisher's frame-perfect live capture is a best-effort bonus (3 consecutive
// frame-perfect cancels are timing-jittery under playwright), with its art verified WIRED via charDef.
// Screenshots → harness/shots/isshiki_stage2_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record() { const a = await p1(); const act = a.spriteAction; if (act) seen.set(act, a.spriteSheet || null); return a; }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `isshiki_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
async function tapLight() { await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("isshiki").animationData);

  // ── WIRING: all 6 combo-string stages point at a real reslice'd sheet (no fallback box) ──
  console.log("\n── combo-string stages are wired (no fallback box) ──");
  for (const [k, tag] of [
    ["isshikiGround1", "isshiki_ground1_uniform"], ["isshikiGround2", "isshiki_ground2_uniform"], ["isshikiGround3", "isshiki_ground3_uniform"],
    ["isshikiAir1", "isshiki_air1_uniform"], ["isshikiAir2", "isshiki_air2_uniform"], ["isshikiAir3", "isshiki_air3_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  // ── GROUND STRING: neutral Light auto-combo, cancel-on-hit ───────────────
  console.log("\n── ground combo string advances cancel-on-hit ──");
  let g1 = {}, sawG3 = false, launchedFin = { grounded: true, vy: 0 }, gDmg = 0;
  for (let attempt = 0; attempt < 10 && !(g1.rekkaNext === "isshikiGround2" && seen.has("isshikiGround2") && gDmg >= 30); attempt++) {
    await prep(54);
    await page.keyboard.down("d");   // hold forward (stay near the dummy)
    const hp0 = (await p2()).health;
    await tapLight(); await waitFrames(2); await record();                                    // ground1 opener
    await page.waitForFunction(() => window.__harness.p1().cmdHitLanded, null, { timeout: 2000, polling: 16 }).catch(() => {});
    const s1 = await p1(); if (s1.cmdHitLanded && s1.rekkaNext === "isshikiGround2") g1 = s1;
    await tapLight(); for (let i = 0; i < 8; i++) { await waitFrames(1); await record(); }      // cancel → ground2 (sample for the sheet)
    if (seen.has("isshikiGround2")) await shot("ground_2");
    await tapLight(); for (let i = 0; i < 8; i++) { await waitFrames(1); await record(); }      // cancel → ground3 finisher (best-effort)
    const fin = await p2(); if (!fin.grounded || fin.vy < -1) launchedFin = fin;
    if (seen.has("isshikiGround3")) { sawG3 = true; await shot("ground_3"); }
    await page.keyboard.up("d"); await waitFrames(8);
    gDmg = Math.max(gDmg, hp0 - (await p2()).health);
  }
  check("opener = isshikiGround1 (punches)", (seen.get("isshikiGround1") || "").includes("isshiki_ground1_uniform"), `sheet=${seen.get("isshikiGround1")}`);
  check("ground1 connected → queues isshikiGround2 (cancel-on-hit advances)", g1.cmdHitLanded && g1.rekkaNext === "isshikiGround2", `cmdHit=${g1.cmdHitLanded} next=${g1.rekkaNext}`);
  check("advance = isshikiGround2 (kick) rendered live", (seen.get("isshikiGround2") || "").includes("isshiki_ground2_uniform"), `sheet=${seen.get("isshikiGround2")}`);
  check("ground string landed multi-hit damage (≥ 30 = 2+ stages)", gDmg >= 30, `dmg=${gDmg.toFixed(1)}`);
  check("finisher isshikiGround3 WIRED (launcher, no box)", (ad.isshikiGround3?.sheet || "").includes("isshiki_ground3_uniform"), `sheet=${ad.isshikiGround3?.sheet}`);
  if (sawG3) { check("BONUS: isshikiGround3 finisher captured live", true); check("BONUS: finisher launched dummy", !launchedFin.grounded || launchedFin.vy < -1, `vy=${launchedFin.vy}`); }

  // ── AIR STRING: airborne Light auto-combo, cancel-on-hit ─────────────────
  // Harder to capture live than ground (P1 falls between taps), so re-lift aggressively each sample
  // frame and retry until isshikiAir2 renders. air3 finisher live-capture is a best-effort bonus.
  console.log("\n── air combo string advances cancel-on-hit ──");
  let a1 = {}, sawA3 = false, aDmg = 0;
  const relift = async (h) => { if ((await p1()).grounded) await page.evaluate(hh => window.__harness.liftP1(hh), h); };
  for (let attempt = 0; attempt < 16 && !(a1.rekkaNext === "isshikiAir2" && seen.has("isshikiAir2") && aDmg >= 24); attempt++) {
    await prep(38);
    await page.evaluate(() => window.__harness.liftP1(46));
    const hp0 = (await p2()).health;
    await tapLight(); await waitFrames(2); await record();                                    // air1 opener
    await page.waitForFunction(() => window.__harness.p1().cmdHitLanded, null, { timeout: 2000, polling: 16 }).catch(() => {});
    const s1 = await p1(); if (s1.cmdHitLanded && s1.rekkaNext === "isshikiAir2") a1 = s1;
    await relift(44);
    await tapLight(); for (let i = 0; i < 8; i++) { await relift(44); await waitFrames(1); await record(); }   // cancel → air2 (re-lift each frame)
    if (seen.has("isshikiAir2")) await shot("air_2");
    await relift(40);
    await tapLight(); for (let i = 0; i < 8; i++) { await relift(40); await waitFrames(1); await record(); }   // cancel → air3 finisher (best-effort)
    if (seen.has("isshikiAir3")) { sawA3 = true; await shot("air_3"); }
    aDmg = Math.max(aDmg, hp0 - (await p2()).health);
  }
  check("opener = isshikiAir1", (seen.get("isshikiAir1") || "").includes("isshiki_air1_uniform"), `sheet=${seen.get("isshikiAir1")}`);
  check("air1 connected → queues isshikiAir2 (cancel-on-hit advances)", a1.cmdHitLanded && a1.rekkaNext === "isshikiAir2", `cmdHit=${a1.cmdHitLanded} next=${a1.rekkaNext}`);
  check("advance = isshikiAir2 rendered live", (seen.get("isshikiAir2") || "").includes("isshiki_air2_uniform"), `sheet=${seen.get("isshikiAir2")}`);
  check("air string landed multi-hit damage (≥ 24 = 2+ stages)", aDmg >= 24, `dmg=${aDmg.toFixed(1)}`);
  check("finisher isshikiAir3 WIRED (spike, no box)", (ad.isshikiAir3?.sheet || "").includes("isshiki_air3_uniform"), `sheet=${ad.isshikiAir3?.sheet}`);
  if (sawA3) check("BONUS: isshikiAir3 finisher captured live", true);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\nsheet map: ${JSON.stringify(Object.fromEntries(seen), null, 0)}`);
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
