// harness/isshiki_cube_stage3.mjs
// CUBE-TRAP STAGE 3: the FULL sequence wired to the real special (Down+Special) —
//   cast → land → trap (untouchable + shrink) → AUTO-TICK damage → CASTER BONUS-HITS on the cube →
//   ESCAPE-MASH (trapped player mashes to cut the trap short, shattering the cube).
// Clips: harness/shots/isshiki_cube_s3_{trap,bonus,escape}.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cube = () => page.evaluate(() => window.__harness.cubeTrap());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `isshiki_cube_s3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.healP1?.(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await wf(2);
}
async function castCube() {
  const r = await page.evaluate(() => window.__harness.p1SpecialDir("D"));   // Down+Special → Daikokuten cubes (real special path)
  await page.waitForFunction(() => window.__harness.cubeTrap() != null, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => window.__harness.cubeTrap()?.phase === "trapped", null, { timeout: 3000, polling: 16 }).catch(() => {});
  return r;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  // ── 1) CAST → TRAP (real Down+Special) ──
  console.log("\n── cast Down+Special → cube trap → foe shrinks + untouchable + auto-ticks ──");
  await prep(62);
  const cast = await castCube();
  const t = await cube();
  check("Down+Special cast pose = isshikiSukuCast", cast?.cast === "isshikiSukuCast", `cast=${cast?.cast}`);
  check("cube trap active + foe TRAPPED", !!t && t.phase === "trapped", `state=${JSON.stringify(t)}`);
  check("trapped foe is untouchable + shrinking", !!t && t.targetUntouchable && t.targetShrink != null && t.targetShrink < 0.8, `untouchable=${t?.targetUntouchable} shrink=${t?.targetShrink}`);
  await shot("trap");
  // auto-tick: caster idle, foe still loses HP over time
  const hpA0 = (await p2()).health;
  for (let i = 0; i < 48; i++) await wf(1);
  const autoDmg = hpA0 - (await p2()).health;
  check("AUTO-TICK deals sure damage while caster idle", autoDmg > 0, `autoDmg=${autoDmg.toFixed(1)} over 48f`);

  // ── 2) CASTER BONUS-HIT: hit the cube for damage ABOVE the auto-tick baseline ──
  console.log("\n── caster BONUS-HITS the cube (damage above the auto-tick baseline) ──");
  const hpB0 = (await p2()).health;
  let sawHit = false;
  for (let i = 0; i < 48; i++) {                       // mash Light (ground combo) onto the cube
    if (i % 6 === 0) { await page.keyboard.down("j"); }
    if (i % 6 === 3) { await page.keyboard.up("j"); }
    const pp1 = await p1(); if (pp1.attacking) sawHit = true;
    if (i === 20) await shot("bonus");
    await wf(1);
  }
  await page.keyboard.up("j");
  const bonusWindowDmg = hpB0 - (await p2()).health;
  check("caster was swinging at the cube", sawHit, "");
  check("BONUS-HITS add damage ABOVE auto-tick (window dmg > idle 48f baseline)", bonusWindowDmg > autoDmg + 3, `withHits=${bonusWindowDmg.toFixed(1)} vs auto=${autoDmg.toFixed(1)}`);

  // ── 3) ESCAPE-MASH: the trapped player mashes → trapTimer plummets → early escape (cube shatters) ──
  // (a fresh cast REPLACES any lingering trap — one per target — so no explicit clear is needed)
  console.log("\n── trapped player MASHES to escape early (trapTimer drops faster than 1/frame → shatter) ──");
  await prep(80);
  await castCube();
  const t0 = (await cube())?.trapTimer ?? 0;
  // mash P2's light key ("1") to generate fresh input edges (readRawControls(p2))
  let frames = 0;
  for (let i = 0; i < 22; i++) { await page.keyboard.down("1"); await wf(1); frames++; await page.keyboard.up("1"); await wf(1); frames++; if ((await cube()) === null) break; }
  const cMid = await cube();
  const t1 = cMid ? cMid.trapTimer : 0;
  // with mashing, the timer must have dropped by MORE than the frames elapsed (each edge = extra -frames)
  check("mashing drops trapTimer FASTER than 1/frame (mash reduces the trap)", cMid == null || (t0 - t1) > frames, `Δtimer=${(t0 - t1)} over ${frames}f (mash accelerates)`);
  await shot("escape");
  // keep mashing → confirm the trap ENDS early (shatters, foe freed)
  for (let i = 0; i < 40 && (await cube()) !== null; i++) { await page.keyboard.down("1"); await wf(1); await page.keyboard.up("1"); await wf(1); }
  const ended = (await cube()) === null;
  const freed = await p2();
  check("mash-escape ENDED the trap early (cube shattered)", ended, "");
  check("escaped foe freed: shrink cleared + hittable again", freed.trapShrinkFrac == null && !freed.cubeTrapUntouchable, `shrink=${freed.trapShrinkFrac} untouchable=${freed.cubeTrapUntouchable}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
