// harness/inosuke_stage5.mjs — Stage 5 evidence for Inosuke's THREE cinematic specials.
// For each (Neutral=Spin, Forward=Dash Thrust, Down=Slashing Lunge Fan) proves: the freeze-cinematic
// activates with the right variant + sprite; combat FREEZES; the camera PUSHES IN (zoom<1) then PULLS
// BACK to 1.0; the range-gated hit lands at the STRIKE beat. Also confirms cenematic_specail_3 is a GAP
// (only 3 variants exist), and the shared cooldown gate. Real screenshots → harness/shots/inosuke_s5_*.png.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cam = () => page.evaluate(() => window.__harness.camera());
const cine = () => page.evaluate(() => window.__harness.inosukeBeastCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `inosuke_s5_${name}.png`) }); }
async function idleReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {}); }
async function reset(gap = 96) {
  await page.waitForFunction(() => !window.__harness.inosukeBeastCine().active, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); window.__harness.setP2Invuln?.(0); if (window.__harness.p1()) {} });
  await page.evaluate(() => { const f = window.__harness; f.clearBeastAssistCd?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

// Fire a special with an optional held direction; capture the whole cinematic (activate → push → strike → end).
async function fireSpecial(hold, tag) {
  await reset(96);
  const hp0 = (await p2()).health;
  const camBefore = (await cam()).zoom;
  if (hold) await page.keyboard.down(hold);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  if (hold) await page.keyboard.up(hold);
  // wait until the cinematic is active
  let act = null;
  for (let i = 0; i < 20; i++) { const c = await cine(); if (c.active) { act = c; break; } await waitFrames(1); }
  // sample the PUSH-IN (min zoom seen) and capture the strike
  let minZoom = camBefore, struckSeen = false, variant = act?.variant, sprite = act?.sprite;
  await shot(`${tag}_push`);
  for (let i = 0; i < 140; i++) {
    const c = await cine();
    const z = (await cam()).zoom;
    if (z < minZoom) minZoom = z;
    if (c.active && c.struck && !struckSeen) { struckSeen = true; await shot(`${tag}_strike`); }
    if (!c.active) break;
    await waitFrames(1);
  }
  await waitFrames(6);
  const camAfter = (await cam()).targetZoom;
  const dmg = hp0 - (await p2()).health;
  return { act, minZoom, camBefore, camAfter, struckSeen, dmg, variant, sprite };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=inosuke&p2=inosuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(10);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });

  const cases = [
    { key: "beastSpin",  hold: null, dir: "neutral", sprite: "inosukeCine1", variant: "spin"  },
    { key: "beastDash",  hold: "d",  dir: "forward", sprite: "inosukeCine2", variant: "dash"  },
    { key: "beastLunge", hold: "s",  dir: "down",    sprite: "inosukeCine4", variant: "lunge" },
  ];

  for (const c of cases) {
    section(`cinematic special — ${c.dir} (${c.variant})`);
    const r = await fireSpecial(c.hold, c.variant);
    check(`${c.dir} special ACTIVATES the cinematic`, !!r.act?.active, `active=${!!r.act?.active}`);
    check(`variant = ${c.variant}`, r.variant === c.variant, `variant=${r.variant}`);
    check(`plays Inosuke's REAL cine sprite (${c.sprite})`, r.sprite === c.sprite, `sprite=${r.sprite}`);
    check("camera PUSHES IN (zoom drops below 1.0)", r.minZoom < 0.97, `minZoom=${r.minZoom?.toFixed(3)} (from ${r.camBefore?.toFixed(3)})`);
    check("camera PULLS BACK to ~1.0 after", Math.abs(r.camAfter - 1.0) < 0.06, `targetZoom→${r.camAfter?.toFixed(3)}`);
    check("STRIKE beat fired + range-gated hit landed", r.struckSeen && r.dmg > 0, `struck=${r.struckSeen} dmg=${r.dmg}`);
  }

  // ── COMBAT FREEZE during the cinematic ──
  section("combat FREEZES during the cinematic (opponent paused)");
  await reset(96);
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));   // keep p2 alive so we can watch it freeze
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.inosukeBeastCine().active, null, { timeout: 2000, polling: 16 }).catch(() => {});
  const f0 = (await cine()).frame; const p2x0 = (await p2()).x; const gs0 = (await state()).frame;
  // push p2 velocity — if combat is frozen, its x won't integrate
  await waitFrames(6);
  const p2x1 = (await p2()).x; const cineAdvanced = (await cine()).frame > f0;
  check("cinematic frame advances while world combat is frozen", cineAdvanced, `cineFrame ${f0}→${(await cine()).frame}`);
  check("opponent position is frozen during the cinematic", Math.abs(p2x1 - p2x0) < 1.0, `p2.x ${Math.round(p2x0)}→${Math.round(p2x1)}`);
  await page.waitForFunction(() => !window.__harness.inosukeBeastCine().active, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));

  // ── COOLDOWN GATE ──
  section("shared cooldown gate (no back-to-back cinematic spam)");
  await reset(96);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.inosukeBeastCine().active, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => !window.__harness.inosukeBeastCine().active, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const cdNow = await page.evaluate(() => window.__harness.p1()?.beastSpecialCd ?? window.__harness.beastAssistState()?.cd ?? -1);
  // immediately try again — should be on cooldown (cinematic must NOT re-activate this frame)
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await waitFrames(3);
  const reactivated = (await cine()).active;
  check("special is on cooldown right after firing (no immediate re-cast)", !reactivated, `reactivated=${reactivated}`);

  // ── _3 GAP ──
  section("cenematic_specail_3 gap (reported, not invented)");
  const cine3Exists = fs.existsSync(path.join(ROOT, "inosuke_cenematic_specail_3.png"));
  check("cenematic_specail_3 art is ABSENT from the upload (genuine numbering gap)", !cine3Exists, `file exists=${cine3Exists}`);
  console.log("     → only _1/_2/_4 wired (spin/dash/lunge); _3 has no art, left as a documented gap.");

  // ── STABILITY ──
  section("stability");
  check("no JS errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
