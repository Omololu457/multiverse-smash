// harness/edo_summon_capture.mjs — CAPTURE the live Edo Tensei summon CINEMATIC (not skipped) frame-by-frame,
// to see exactly what renders: coffin? vessel scale? position relative to Tobirama?
// Usage: node harness/edo_summon_capture.mjs <label> <vessel>
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const LABEL = process.argv[2] || "cur"; const VESSEL = process.argv[3] || "flash";
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
const cine = () => page.evaluate(() => window.__harness.edoBackup.cine());
const p1 = () => page.evaluate(() => window.__harness.p1());
const st = () => page.evaluate(() => window.__harness.state());
const shot = n => page.screenshot({ path: path.join(OUT, n) });
const sleep = ms => new Promise(r=>setTimeout(r,ms));

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(()=>{ const p=window.__harness.p1(); return p.grounded; }, null, {timeout:8000,polling:16}).catch(()=>{});
  await page.evaluate(v => { window.__harness.setP1Energy?.(200); window.__harness.resetUlt?.(); window.__harness.edoBackup.setBackup(v); }, VESSEL);
  const before = await p1();
  console.log(`\n╔══ EDO SUMMON CAPTURE — label="${LABEL}" vessel=${VESSEL} ══╗`);
  console.log(`  Tobirama pre-summon x=${Math.round(before.x)} facing=${before.facing}`);

  // fire the ultimate → cinematic begins
  await page.keyboard.down("u"); await sleep(80); await page.keyboard.up("u");

  // poll the cinematic frame; screenshot at key beats
  const beats = { rise:108, silhouette:126, reveal:140, colored:150, swap:158, close:180 };
  const captured = {};
  const t0 = Date.now();
  while (Date.now()-t0 < 8000) {
    const cs = await cine();
    if (!cs.active) break;
    const f = cs.frame;
    for (const [name, target] of Object.entries(beats)) {
      if (!captured[name] && f >= target) { captured[name]=f; await shot(`edosummon_${LABEL}_${name}.png`); const p=await p1(); console.log(`  📸 ${name} @f${f}  (mode=${cs.mode})`); }
    }
    await sleep(30);
  }
  // post-cinematic: let the world settle, capture the summoned vessel in-world
  await page.waitForFunction(()=>!window.__harness.edoBackup.cine().active, null, {timeout:5000,polling:30}).catch(()=>{});
  await sleep(200);
  const after = await p1();
  await shot(`edosummon_${LABEL}_post.png`);
  console.log(`  📸 post  vessel=${after.rosterKey||after.key} x=${Math.round(after.x)} scale=${after.spriteScale} edoActive=${after.edoActive}`);
  console.log(`  Δx (vessel - Tobirama_pre) = ${Math.round((after.x)-(before.x))}px  (+ = toward where he faced)`);
  console.log(`  page errors: ${errs.length}`);
} catch(e){ console.log("  ❌", e.message); }
await page.close(); await browser.close(); server.close();
console.log(`╚════════════════════════════════════════╝`);
