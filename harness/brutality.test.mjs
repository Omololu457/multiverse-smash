// harness/brutality.test.mjs — stylized finishing-move (scope A) gating + independence + trigger.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
  await page.waitForTimeout(200);
  const B = () => page.evaluate.bind(page);

  // Independent toggles.
  let t = await page.evaluate(() => { window.__harness.brutality.setBlood(true); window.__harness.brutality.setBrutality(false); return window.__harness.brutality.toggles(); });
  check("blood ON + brutality OFF set independently", t.blood === true && t.brutality === false, JSON.stringify(t));
  t = await page.evaluate(() => { window.__harness.brutality.setBlood(false); window.__harness.brutality.setBrutality(true); return window.__harness.brutality.toggles(); });
  check("blood OFF + brutality ON set independently", t.blood === false && t.brutality === true, JSON.stringify(t));

  // Eligibility (scope A): horror + brutal in; kid franchises out.
  const inSet  = await page.evaluate(() => ["ghostface","jason","sukuna","omniman","hisoka","zaraki"].filter(k => window.__harness.brutality.canTrigger(k)));
  const outSet = await page.evaluate(() => ["omega_ranger","red_ranger_mmpr","ben10","gwen","vilgax","albedo"].filter(k => window.__harness.brutality.canTrigger(k)));
  check("horror + canonically-brutal winners are eligible", inSet.length === 6, `eligible: ${inSet.join(",")}`);
  check("Power Rangers + Ben 10 are excluded", outSet.length === 0, outSet.length ? `LEAKED: ${outSet.join(",")}` : "none eligible");

  // EXPANSION (owner-confirmed): alt Sukuna + war-god/sadist/bloodsport villains newly eligible; kids still out.
  const newElig = await page.evaluate(() => ["alt_sukuna","madara","isshiki","naoya","mayuri","orochimaru","baki"].filter(k => window.__harness.brutality.canTrigger(k)));
  check("expansion adds alt_sukuna + madara/isshiki/naoya/mayuri/orochimaru/baki", newElig.length === 7, `eligible: ${newElig.join(",")}`);
  const stillOut = await page.evaluate(() => ["gwen","omega_ranger","goku","spiderman","nezuko"].filter(k => window.__harness.brutality.canTrigger(k)));
  check("heroes / kid-franchise / wholesome cast still excluded after expansion", stillOut.length === 0, stillOut.length ? `LEAKED: ${stillOut.join(",")}` : "none eligible");

  // PER-CHARACTER FINISHER DISPATCH: batch chars map to a signature; other eligible chars → null (generic fallback).
  const fins = await page.evaluate(() => window.__harness.brutality.finishers());
  check("first batch defines ≥6 per-character finishers", fins.length >= 6, `[${fins.join(", ")}]`);
  const sukF = await page.evaluate(() => window.__harness.brutality.finisherFor("sukuna"));
  const madF = await page.evaluate(() => window.__harness.brutality.finisherFor("madara"));
  const mayF = await page.evaluate(() => window.__harness.brutality.finisherFor("mayuri"));
  check("sukuna → DISMANTLE / slash", sukF && sukF.name === "DISMANTLE" && sukF.motif === "slash", JSON.stringify(sukF));
  check("madara → ANNIHILATE / shards", madF && madF.name === "ANNIHILATE" && madF.motif === "shards", JSON.stringify(madF));
  check("mayuri → DISSECT / toxic", mayF && mayF.name === "DISSECT" && mayF.motif === "toxic", JSON.stringify(mayF));
  const ghF = await page.evaluate(() => window.__harness.brutality.finisherFor("ghostface"));
  check("eligible-but-uncovered winner (ghostface) → null → SHARED generic fallback", ghF === null, JSON.stringify(ghF));

  // Start a battle so p1/p2 exist (p1=ghostface = eligible winner).
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  await page.waitForTimeout(400);

  // Gate: toggle OFF → no finisher even on a KO by an eligible winner.
  await page.evaluate(() => window.__harness.brutality.setBrutality(false));
  const off = await page.evaluate(() => window.__harness.brutality.trigger("p1", true));
  check("toggle OFF → finisher does NOT trigger on a KO", off === false);

  // Gate: toggle ON + eligible winner + KO → triggers.
  await page.evaluate(() => window.__harness.brutality.setBrutality(true));
  const on = await page.evaluate(() => window.__harness.brutality.trigger("p1", true));
  const st = await page.evaluate(() => window.__harness.brutality.state());
  check("toggle ON + eligible winner + KO → finisher triggers", on === true && st.active === true, JSON.stringify(st));
  check("ghostface winner uses the SHARED generic finisher (state.finisher = null)", st.finisher === null, JSON.stringify(st.finisher));
  await page.waitForTimeout(200);   // let the gore burst + stamp animate a few frames
  await page.screenshot({ path: path.join(OUT, "BRUTALITY_playing.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });

  // PER-CHARACTER finishers LIVE: boot each batch winner, run the real gate, assert the signature is
  // selected + drives the state, and capture a clip. Covers all four motifs (slash/burst/toxic/shards).
  async function finisherClip(charKey, expectName, expectMotif) {
    await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=goku`, { waitUntil: "load" });
    await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__harness.brutality.setBrutality(true));
    await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
    await page.waitForTimeout(400);
    const ok = await page.evaluate(() => window.__harness.brutality.trigger("p1", true));
    await page.waitForTimeout(180);   // let the one-shot signature + chunk burst spawn
    const s = await page.evaluate(() => window.__harness.brutality.state());
    check(`${charKey} → per-character finisher selected (${expectName}/${expectMotif}) + FX spawned`,
      ok === true && s.active === true && s.finisher && s.finisher.name === expectName && s.finisher.motif === expectMotif && s.parts > 0,
      JSON.stringify(s));
    await page.screenshot({ path: path.join(OUT, `BRUTALITY_${charKey}_${(expectName || "").toLowerCase()}.png`), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  }
  await finisherClip("sukuna", "DISMANTLE", "slash");   // slash motif
  await finisherClip("omniman", "OBLITERATE", "burst"); // heavy burst motif
  await finisherClip("mayuri", "DISSECT", "toxic");     // toxic drift motif
  await finisherClip("madara", "ANNIHILATE", "shards"); // energy shards motif

  // Gate: eligible winner but TIME-OVER (loser alive) → never triggers.
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  await page.waitForTimeout(300);
  const timeOver = await page.evaluate(() => window.__harness.brutality.trigger("p1", false));
  check("time-over win (loser alive) → finisher does NOT trigger", timeOver === false);

  // Gate: toggle ON but INELIGIBLE winner → no finisher. Restart with an excluded winner (ben10).
  await page.evaluate(() => window.__harness.brutality.setBrutality(true));
  const inelig = await page.evaluate(() => window.__harness.brutality.canTrigger("ben10"));
  check("ineligible winner (Ben 10) cannot trigger a finisher", inelig === false);

  check("no page errors across the brutality flow", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
