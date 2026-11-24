// harness/ds_ult_cine_shots.mjs — render check of the Demon Slayer ultimate cinematics (Shinobu / Zenitsu / Nezuko tap + hold):
// one screenshot per beat → docs/demon_slayer/ult_cinematics/<char>/, plus the damage each ult dealt.
// Usage: node harness/ds_ult_cine_shots.mjs [shinobu|zenitsu|nezuko|nezukoDemon ...]
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res) }); s.listen(0, () => r(s)) });
const base = `http://127.0.0.1:${server.address().port}`;
const PLAN = {
  shinobu: { key: "shinobu", gap: 280, hold: 0, probe: "shinobu", shots: [[30, "01_gather"], [90, "02_insect_breathing"], [135, "03_butterfly_dance_caprice"], [155, "04_flit_1"], [186, "05_flit_3"], [216, "06_lands_past"], [228, "07_poison_bloom"], [275, "08_pull_back"]] },
  zenitsu: { key: "zenitsu", gap: 300, hold: 0, probe: "ds", shots: [[40, "01_asleep"], [80, "02_eyes_open_thunder_breathing"], [120, "03_first_form"], [150, "04_thunderclap_and_flash"], [175, "05_godspeed"], [196, "06_blackout"], [-14, "07_the_flash"], [-30, "08_afterglow"]] },
  nezuko: { key: "nezuko", gap: 90, hold: -1, probe: "ds", shots: [[30, "01_heartbeat"], [70, "02_blood_demon_art"], [104, "03_exploding_blood"], [140, "04_engulfed"], [-12, "05_barrage_fire"], [-40, "06_finisher"]] },
  nezukoDemon: { key: "nezuko", gap: 200, hold: 320, probe: "ds", shots: [[30, "01_markings"], [56, "02_demon_form"], [100, "03_transformed"], [-20, "04_resumed"]] },
};
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLAN);
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
let FAIL = 0;
for (const name of want) {
  const P = PLAN[name]; const OUT = path.join(ROOT, "docs/demon_slayer/ult_cinematics", name); fs.mkdirSync(OUT, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1&p1=${P.key}&p2=spd_red`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness?.start, null, { timeout: 90000 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.() });
  await page.waitForFunction(() => window.__harness.state?.().frame > 60, null, { timeout: 60000, polling: 50 });
  const a = await page.evaluate(() => window.__harness.p1()); await page.evaluate(x => window.__harness.setP2X(x), a.x + P.gap);
  await page.waitForTimeout(500);
  const hp0 = await page.evaluate(() => window.__harness.p2().health);
  const st = () => page.evaluate(pr => pr === "shinobu" ? window.__harness.shinobuUltCine() : window.__dsPrerollStatus(), P.probe);
  await page.keyboard.down("u"); if (P.hold >= 0) await page.waitForTimeout(P.hold || 40); await page.keyboard.up("u");   // nezuko TAP = instant (a slow frame can read 40ms as a HOLD)
  let seen = 0, endFrame = null;
  for (const [fr, shot] of P.shots) {
    if (fr >= 0) await page.waitForFunction(([fr, pr]) => { const c = pr === "shinobu" ? window.__harness.shinobuUltCine() : window.__dsPrerollStatus(); return !c.active || c.frame >= fr }, [fr, P.probe], { timeout: 30000, polling: 4 }).catch(() => {});
    else {
      if (endFrame == null) { await page.waitForFunction(pr => !(pr === "shinobu" ? window.__harness.shinobuUltCine() : window.__dsPrerollStatus()).active, P.probe, { timeout: 30000, polling: 4 }).catch(() => {}); endFrame = (await page.evaluate(() => window.__harness.state().frame)) }
      await page.waitForFunction(t => window.__harness.state().frame >= t, endFrame - fr, { timeout: 20000, polling: 4 }).catch(() => {});
    }
    const c = await st(); if (c.active) seen++
    await page.screenshot({ path: path.join(OUT, shot + ".png") });
    console.log(`  ${name}/${shot}: ${c.active ? `frame ${c.frame}` : `live +${(await page.evaluate(() => window.__harness.state().frame)) - (endFrame || 0)}`}`)
  }
  await page.waitForTimeout(2500);
  const hp1 = await page.evaluate(() => window.__harness.p2().health);
  console.log(`  ${name}: ${seen} beats captured mid-cinematic · damage dealt ${hp0 - hp1} · page errors ${errs.length}`, errs.slice(0, 2));
  if (errs.length) FAIL++
  await page.close();
}
console.log(`DS ULT CINEMATIC SHOTS: ${want.length - FAIL}/${want.length} clean`);
await browser.close(); server.close();
