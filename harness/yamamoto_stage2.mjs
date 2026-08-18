// harness/yamamoto_stage2.mjs
// STAGE 2 evidence: Yamamoto guard / hit-reactions / knockdown / intro on the RE-SLICED sheets. Also
// asserts the rows 19-24 PARTITION CORRECTION (guard = the 33+34 braced stance, NOT the row-19 recoil arc
// the audit tentatively read as block). Screenshots → harness/shots/yamamoto_stage2_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=yamamoto`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `yamamoto_stage2_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

async function checkAction(act, sheetFrag, { minH = 30, maxH = 150 } = {}) {
  await force(act); await waitFrames(3); const r = await p1(); await shot(act);
  const m = await measure().catch(() => null);
  const sh = r.spriteSheet || "";
  check(`${act} → ${sheetFrag}`, sh.includes(sheetFrag), `sheet=${sh}`);
  if (m) check(`${act} renders (not clipped, ${minH}-${maxH}px)`, !m.clipped && m.contentH >= minH && m.contentH <= maxH, `contentH=${m.contentH} clipped=${m.clipped}`);
  await force(null); await waitFrames(1);
}

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  const g = await p1();
  check("P1 is Yamamoto", g.key === "yamamoto", `key=${g.key}`);

  console.log("\n── guard / hit reactions ──");
  await checkAction("guard", "yamamoto_guard_uniform", { minH: 100, maxH: 140 });
  await checkAction("hurt", "yamamoto_hurt_uniform", { minH: 80, maxH: 135 });
  await checkAction("hurt_air", "yamamoto_hurt_air_uniform", { minH: 80, maxH: 145 });

  console.log("\n── knockdown → get-up chain ──");
  await checkAction("knockdown", "yamamoto_knockdown_uniform", { minH: 30, maxH: 100 });   // sprawled, low
  await checkAction("getup", "yamamoto_getup_uniform", { minH: 60, maxH: 135 });

  console.log("\n── intro (13-frame entrance) ──");
  await checkAction("intro", "yamamoto_intro_uniform", { minH: 90, maxH: 135 });
  const def = await page.evaluate(() => window.__harness.charDef("yamamoto"));
  check("introPool arms the intro at match start", Array.isArray(def?.introPool) && def.introPool.includes("intro"), `introPool=${JSON.stringify(def?.introPool)}`);

  console.log("\n── PARTITION CORRECTION (rows 19-24) ──");
  // guard resolves the 33+34 braced-stance sheet, NOT any row-19-derived recoil — the audit's lowest-
  // confidence read is corrected. (There is deliberately no row-19 sheet in the anim set.)
  await force("guard"); await waitFrames(3); const gr = await p1(); await force(null);
  check("guard is the braced STANCE sheet (audit row-19-as-block corrected)", (gr.spriteSheet || "").includes("yamamoto_guard_uniform"), `sheet=${gr.spriteSheet}`);

  console.log("\n── fallback-box sweep ──");
  const boxHit = [];
  for (const act of ["guard", "hurt", "hurt_air", "knockdown", "getup", "intro"]) {
    await force(act); await waitFrames(3); const r = await p1();
    if (!(r.spriteSheet || "").includes("yamamoto_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every Stage-2 action resolves a real yamamoto_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
