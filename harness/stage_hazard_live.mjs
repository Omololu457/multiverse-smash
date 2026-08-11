// harness/stage_hazard_live.mjs — STAGE INTERACTABLES pilot, LIVE end-to-end proof (Playwright).
// Boots a REAL Test Map match, drives the REAL game loop, and proves the hazard works through the full
// pipeline (physics → updateStageHazards → applyScaledDamage → HUD): a fighter KNOCKED INTO the arc-pylon
// loses HP + gets the wall-splat reaction, while an untouched fighter does not. Screenshots the pylon.
// Mirrors harness/bg_probe/verify_test_map.mjs (the Test Map's existing validation tooling).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e,d) => { if (e){res.writeHead(404).end();return;} res.writeHead(200,{ "content-type":MIME[path.extname(f)]||"application/octet-stream" }); res.end(d); });
}); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1920, height:1080 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
const shotDir = path.join(HERE, "bg_probe", "shots"); fs.mkdirSync(shotDir, { recursive:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };

// Run the full knocked-into-hazard proof on one stage. `shot` = screenshot filename.
async function verifyStage(stageName, expectId, shot) {
  console.log(`\n─── ${stageName} ───`);
  await page.evaluate(n => window.__harness.setSession?.({ selectedStage: n }), stageName);
  await sleep(600);

  const hazards = await page.evaluate(() => window.__harness.stageHazards?.() || []);
  check(`${stageName}: exposes one pilot hazard (${expectId})`, hazards.length === 1 && hazards[0].id === expectId, JSON.stringify(hazards));

  const before = await page.evaluate(() => ({ p1: window.__harness.hazardState("p1"), p2: window.__harness.hazardState("p2") }));
  const setup  = await page.evaluate(() => window.__harness.knockIntoHazard("p1", 14));
  await sleep(200);
  const after  = await page.evaluate(() => window.__harness.hazardState("p1"));

  check(`${stageName}: P1 knocked into hazard LOST HP (via applyScaledDamage)`, after.health < before.p1.health,
        `${before.p1.health.toFixed(0)} → ${after.health.toFixed(0)} (−${(before.p1.health - after.health).toFixed(0)})`);
  check(`${stageName}: P1 got the wall-splat reaction (extended hitstun)`, after.hitstun >= 10, `hitstun=${after.hitstun}`);
  check(`${stageName}: P1 contact recorded the correct hazard id`, after.hazardHit === expectId, `hit=${after.hazardHit}`);
  check(`${stageName}: P1 on the per-contact cooldown (fired once)`, after.hazardCd > 0, `cd=${after.hazardCd}`);

  const p2after = await page.evaluate(() => window.__harness.hazardState("p2"));
  check(`${stageName}: P2 (untouched) did NOT lose HP`, Math.abs(p2after.health - before.p2.health) < 1, `${before.p2.health.toFixed(0)} → ${p2after.health.toFixed(0)}`);

  // visual evidence — frame both fighters at the hazard, screenshot
  await page.evaluate(h => { window.__harness.setP1X(h.hazardX - 90); window.__harness.setP2X(h.hazardX + 80); }, setup);
  await sleep(450);
  await page.screenshot({ path: path.join(shotDir, shot) });
  console.log(`  shot: ${path.join(shotDir, shot)}`);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=hisoka`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());

  await verifyStage("Test Map",        "arc_pylon",   "TESTMAP_hazard_pylon.png");
  await verifyStage("Shibuya Incident", "cursed_rail", "SHIBUYA_hazard_rail.png");

  check("no JS page errors across both stages", errs.length === 0, errs.slice(0,2).join(" | "));
} catch (e) { console.error("HAZARD LIVE ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════`);
console.log(`  STAGE HAZARD LIVE (end-to-end): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
