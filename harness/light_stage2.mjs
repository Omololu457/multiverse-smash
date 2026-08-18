// harness/light_stage2.mjs
// STAGE 2 evidence: Light Yagami — the B-family normals. Asserts the HONEST 3-move set (light = B, heavy =
// B+Forward, crouchLight = B+Down; NO up/air/down_air normals — those are Stage-4 specials), the shared/
// deduped body strip (light + heavy both → light_b_body_uniform), the crouch-variant swap on Down+light, and
// the separate gold/blue-crescent FX overlays (game.drawLightNormalFx). Screenshots → harness/shots/light_stage2_*.png.
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
const fx = () => page.evaluate(() => window.__harness.lightFx("p1"));
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=light`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `light_stage2_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
// poll the FX overlay for a few frames (frameIndex must climb past the wind-up before it pops)
async function seeFx(tag, want) { let seen = false, best = null; for (let i = 0; i < 10; i++) { const s = await fx(); if (s?.atkFx) best = s.atkFx; if (s?.atkFx === want) { seen = true; if (i >= 2) { await shot(tag); break; } } await waitFrames(1); } if (!seen) await shot(tag); return { seen, best }; }

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── honest 3-move set (no fabricated up/air/down_air normals — verified via sprite keys) ──");
  const anim = (await page.evaluate(() => window.__harness.charDef("light")))?.animationData || {};
  check("light + heavy sprite keys defined", !!anim.light && !!anim.heavy, `keys=${Object.keys(anim).join(",")}`);
  check("NO up / air / down_air normal sprite keys (those are specials)", !anim.up && !anim.air && !anim.down_air, `up=${!!anim.up} air=${!!anim.air} down_air=${!!anim.down_air}`);
  check("crouchLight sprite defined (B+Down variant)", !!anim.crouchLight, "");
  check("light + heavy SHARE the deduped B body strip", (anim.light?.sheet || "") === (anim.heavy?.sheet || "x") && /light_b_body_uniform/.test(anim.light?.sheet || ""), `light=${anim.light?.sheet} heavy=${anim.heavy?.sheet}`);

  console.log("\n── B (neutral) = light: body + GOLD spark FX ──");
  await force("light"); const lr = await waitSheet("light_b_body_uniform");
  check("light → light_b_body_uniform", (lr.spriteSheet || "").includes("light_b_body_uniform"), `sheet=${lr.spriteSheet}`);
  const lfx = await seeFx("light", "light");
  check("light: GOLD spark FX overlay renders", lfx.seen, `atkFx=${lfx.best}`);
  await force(null); await waitFrames(3);

  console.log("\n── B+Forward = heavy: SAME body (dedupe) + BLUE crescent FX ──");
  await force("heavy"); const hr = await waitSheet("light_b_body_uniform");
  check("heavy → light_b_body_uniform (dedupe)", (hr.spriteSheet || "").includes("light_b_body_uniform"), `sheet=${hr.spriteSheet}`);
  const hfx = await seeFx("heavy", "heavy");
  check("heavy: BLUE crescent FX overlay renders", hfx.seen, `atkFx=${hfx.best}`);
  await force(null); await waitFrames(3);

  console.log("\n── B+Down = crouchLight: low swipe via real Down+Light input ──");
  let cvSeen = false, cvSheet = null;
  for (let attempt = 0; attempt < 3 && !(cvSeen && cvSheet); attempt++) {
    await page.keyboard.down("s"); await waitFrames(2);
    await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j");
    for (let i = 0; i < 12; i++) { const s = await fx(); const r = await p1(); if (s?.crouchVariant === "crouchLight") cvSeen = true; if ((r.spriteSheet || "").includes("light_bdown_uniform")) { cvSheet = r.spriteSheet; if (cvSeen) { await shot("crouchLight"); break; } } await waitFrames(1); }
    await page.keyboard.up("s"); await waitFrames(6);
  }
  check("Down+Light sets the crouchLight variant", cvSeen, `crouchVariant seen=${cvSeen}`);
  check("crouchLight → light_bdown_uniform sprite", !!cvSheet, `sheet=${cvSheet}`);

  console.log("\n── fallback-box sweep (normals resolve real light_ sheets) ──");
  const boxHit = [];
  for (const act of ["light", "heavy", "crouchLight"]) { await force(act); await waitFrames(3); const r = await p1(); if (!(r.spriteSheet || "").includes("light_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await waitFrames(1); }
  check("every normal resolves a real light_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
