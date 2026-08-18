// harness/yamamoto.test.mjs — CANONICAL suite for Yamamoto Genryūsai (Bleach, Captain-Commander).
// Covers Stages 1-6: registration/stats/portrait, a full-kit fallback-box sweep over EVERY animationData
// action, live connect spot-checks (normal / beam projectile / ultimate), the data contract, AND a
// STAGE-0-HELD compression-artifact-residue check (every shipped sheet must still have a tiny palette —
// proof the JPEG damage was cleaned out and did not survive into the final rendered assets).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));
async function setup(gap = 60) {
  await waitGrounded(); await page.evaluate(() => window.__harness.fillEnergy?.());
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.42)); await waitFrames(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=yamamoto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── registration + stats + portrait ──");
  const g = await p1();
  check("P1 is Yamamoto", g.key === "yamamoto", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.85", Math.abs((g.spriteScale || 0) - 1.85) < 0.01, `${g.spriteScale}`);
  check("HP 1300 / EN 200", g.maxHealth === 1300 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("yamamoto"));
  check("Def 92 / Spd 74 / reiatsu", def?.stats?.defense === 92 && def?.stats?.speed === 74 && def?.traits?.energyType === "reiatsu", `def=${def?.stats?.defense} spd=${def?.stats?.speed} en=${def?.traits?.energyType}`);
  const portOk = await page.evaluate(() => fetch("./yamamoto_portrait.png").then(r => r.ok).catch(() => false));
  check("portrait present (from palette-header default costume)", portOk, "");

  console.log("\n── FULL-KIT fallback-box sweep (every animationData action → real sheet, no 128² box) ──");
  const actions = Object.keys(def.animationData || {});
  const boxHits = [], clipHits = [];
  for (const act of actions) {
    await force(act); await waitFrames(2);
    const r = await p1(); const m = await measure().catch(() => null);
    if (!(r.spriteSheet || "").includes("yamamoto_")) boxHits.push(`${act}:${r.spriteSheet || "null"}`);
    if (m && (m.clipped || m.contentH >= 200)) clipHits.push(`${act}:h${m?.contentH}`);
    await force(null); await waitFrames(1);
  }
  check(`all ${actions.length} actions resolve a real yamamoto_ sheet (no box)`, boxHits.length === 0, boxHits.join(" | "));
  check("no action clips / renders the oversized box", clipHits.length === 0, clipHits.join(" | "));

  console.log("\n── live connect spot-checks (normal / beam projectile / ultimate) ──");
  await setup(56);
  { const hp0 = (await p2()).health; await page.keyboard.down("j"); await waitFrames(10); await page.keyboard.up("j"); await waitFrames(12);
    check("light normal connects", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  await waitGrounded(); await setup(180);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.p1SpecialDir(null));
    let saw = false; for (let f = 0; f < 34 && !saw; f++) { await waitFrames(1); saw = (await page.evaluate(() => window.__harness.projectiles())).some(p => (p.name || "").toLowerCase().includes("yamamotobeam")); }
    check("Ground-Sweep Beam spawns a real projectile", saw, "");
    await page.waitForFunction(h0 => window.__harness.p2().health < h0, hp0, { timeout: 4000, polling: 16 }).catch(() => {});
    check("beam connects at range", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  await waitGrounded(); await setup(70);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.p1Ultimate());
    let poseF = 0; for (let f = 0; f < 28; f++) { await waitFrames(1); if (((await p1()).spriteSheet || "").includes("yamamoto_ult_uniform")) poseF++; }
    check("Ultimate: LIVE fighter plays the pose", poseF >= 6, `poseFrames=${poseF}`);
    await page.waitForFunction(h0 => window.__harness.p2().health < h0, hp0, { timeout: 5000, polling: 16 }).catch(() => {});
    check("Ultimate: guaranteed nuke lands (~204 EFF)", (hp0 - (await p2()).health) >= 150, `−${(hp0 - (await p2()).health).toFixed(0)}`); }

  console.log("\n── ★ Stage-0 compression-artifact-residue check (shipped sheets keep a tiny palette) ──");
  const sheets = [...new Set(Object.values(def.animationData).map(v => v.sheet).filter(Boolean))];
  sheets.push("./yamamoto_beam_proj_uniform.png");
  const results = await page.evaluate(async (list) => {
    const out = [];
    for (const src of list) {
      const img = new Image(); img.src = src;
      try { await img.decode(); } catch (_) { out.push({ src, err: "decode" }); continue; }
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const cx = c.getContext("2d"); cx.imageSmoothingEnabled = false; cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      const uniq = new Set();
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 16) uniq.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); }
      out.push({ src: src.split("/").pop(), colors: uniq.size });
    }
    return out;
  }, sheets);
  // Threshold 128: each cleaned SOURCE row is ≤34 opaque colors (24 body + 10 fire/prop, Stage-0 two-pop
  // quantize); a reslice COMPOSITES up to 3 rows (body + prop/cane + fire), so a sheet legitimately carries
  // the SUM of those clean per-row palettes (observed 57-81). ≤128 is still a 25-100× reduction from the raw
  // JPEG-damaged 3k-13k unique colors — it catches artifact residue (thousands) while allowing clean composites.
  const dirty = results.filter(r => r.err || r.colors > 128);
  for (const r of results) if (r.colors > 60) console.log(`     ${r.src}: ${r.colors} colors`);
  check(`all ${results.length} shipped sheets cleaned (≤128 colors — raw JPEG was 3k-13k)`, dirty.length === 0, dirty.map(r => `${r.src}:${r.err || r.colors}`).join(" | "));
  const maxC = Math.max(...results.map(r => r.colors || 0));
  check("peak palette is orders-of-magnitude below raw (Stage-0 quantization held)", maxC <= 128, `maxColors=${maxC} (raw rows were 3000-13000)`);

  console.log("\n── data contract (full kit wired to real sheets) ──");
  const keys = ["idle","walk","dash","guard","hurt","hurt_air","knockdown","getup","intro","light","heavy","up","air","down_air","yamamotoCombo","yamamotoBeam","yamamotoStab","yamamotoEruption","yamamotoOverhead","yamamotoThrust","yamamotoShunpoOut","yamamotoShunpoIn","yamamotoUltimate"];
  const missing = keys.filter(k => !(typeof def.animationData[k]?.sheet === "string" && def.animationData[k].sheet.includes("yamamoto")));
  check(`all ${keys.length} kit actions wired to real yamamoto sheets`, missing.length === 0, missing.join(" | "));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Yamamoto CANONICAL: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
