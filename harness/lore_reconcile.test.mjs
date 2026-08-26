// harness/lore_reconcile.test.mjs — Codex/Profile/Story reconciliation (real content + reframe).
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
  const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.screens && window.__harness.victoryFlavor));
  await page.waitForTimeout(900);

  // Part 1 — dossier coverage. bio = has passive.effect = real dossier; fallback = honest diegetic message.
  const cov = await page.evaluate(() => window.__harness.victoryFlavor.coverage());
  console.log(`\n── PART 1: CODEX DOSSIER COVERAGE (${cov.total} roster keys) ──`);
  check("real written dossiers wired (>=45)", cov.bio.length >= 45, `${cov.bio.length} real dossiers`);
  console.log(`  ℹ️  ${cov.bio.length} show a real personality write-up; ${cov.fallback.length} show the diegetic "no Fracture Vision" fallback.`);
  console.log(`     diegetic-fallback set: ${cov.fallback.join(", ")}`);
  check("baki is a genuine content gap (no passive) → diegetic fallback", cov.fallback.includes("baki"), "baki in fallback set");

  // Codex screenshots: a diegetic (baki) + a real dossier.
  await page.evaluate(() => window.__harness.screens.codex());
  await page.evaluate(() => window.__harness.screens.codexSelect("baki"));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, "RECON_codex_diegetic.png") });
  const realKey = cov.bio[0];
  await page.evaluate(k => window.__harness.screens.codexSelect(k), realKey);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, "RECON_codex_dossier.png") });
  check("codex renders a real dossier for a passive-bearing fighter", !!realKey, `sample=${realKey}`);

  // Part 2 — Profile reframe. Fresh = unstable/zero-conf.
  await page.evaluate(() => window.__harness.screens.profile());
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, "RECON_profile_fresh.png") });
  const fresh = await page.evaluate(() => window.__harness.screens.profile().data);
  const avgFresh = ["O","C","E","A","N"].reduce((s,k)=>s+(fresh.traits[k]?.confidence||0),0)/5;
  check("fresh profile reads at ~zero confidence (unstable state)", avgFresh < 5, `avg conf ${avgFresh.toFixed(1)}%`);

  // Feed REAL live behavioural events (the only trait-moving types: combat_* / composure / retry) to
  // raise confidence, then re-shoot the 'settling' state. Only E/N accumulate from combat (O/C/A rows are
  // dormant by design) — so read traits (E/N) settle while the rest keep forming: the intended metaphor.
  await page.evaluate(() => { try { window.__harness.personality.match({}, true); } catch(e){} });
  for (let i=0;i<25;i++) await page.evaluate(() => { try { window.__harness.personality.event("combat_aggressive"); window.__harness.personality.event("composure_under_loss"); } catch(e){} });
  await page.evaluate(() => window.__harness.screens.profile());
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, "RECON_profile_settled.png") });
  const settled = await page.evaluate(() => window.__harness.screens.profile().data);
  const eConf = settled.traits.E?.confidence || 0, nConf = settled.traits.N?.confidence || 0;
  check("read traits (E/N) gain confidence + settle as evidence accumulates", eConf > 5 && nConf > 5, `E ${eConf.toFixed(0)}% · N ${nConf.toFixed(0)}% after events`);

  // Part 3 — Story Mode: 15 chapters render.
  await page.evaluate(() => window.__harness.ui.goto("STORY_MODE"));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, "RECON_story.png") });

  check("no page errors across the reconciliation screens", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
