// harness/ui_batch_visual.mjs — visual + smoke verification for the UI/cosmetic batch.
// Screenshots: main menu (selector shard), personality radar, codex. Asserts no page errors and
// that the new screens enter with sane data.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness); await page.waitForTimeout(120);

  // ── PROFILE (personality radar) ──
  const prof = await page.evaluate(() => window.__harness.screens.profile());
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, "BATCH_profile.png") });
  check("PROFILE screen enters", prof.state === "profile", `state=${prof.state}`);
  check("PROFILE exposes all five traits", prof.data && prof.data.traits && ["O","C","E","A","N"].every(k => k in prof.data.traits), JSON.stringify(Object.keys(prof.data?.traits||{})));

  // ── CODEX ──
  const cdx = await page.evaluate(() => window.__harness.screens.codex());
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, "BATCH_codex.png") });
  check("CODEX screen enters", cdx.state === "codex", `state=${cdx.state}`);
  check("CODEX groups by franchise", cdx.groupCount >= 10, `${cdx.groupCount} franchises`);
  check("CODEX covers the roster", cdx.total >= 80, `${cdx.total} fighters`);
  check("CODEX auto-selects a fighter", !!cdx.selected, `selected=${cdx.selected}`);

  // Select a long-bio character to eyeball wrapping.
  await page.evaluate(() => window.__harness.screens.codexSelect("vegeta_dark"));
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, "BATCH_codex_detail.png") });

  // ── MAIN MENU (selector shard on hover) ──
  await page.evaluate(() => window.__harness.screens.back());
  await page.waitForTimeout(80);
  // hover the CODEX menu row by moving the mouse over its center if we can find it; else just shoot.
  await page.screenshot({ path: path.join(OUT, "BATCH_mainmenu.png") });

  check("no page errors across the batch", errs.length === 0, errs.slice(0,3).join(" | ") || "none");

  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
