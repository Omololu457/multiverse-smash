// harness/vegeta_alt_voice_verify.mjs — Dark Vegeta / Vegito reuse Vegeta's WIN + taunt(trash-talk) voice.
// Vegeta has no dedicated `taunt` pool + no taunt ACTION, so his taunt trash-talk is the combatBark pool,
// delivered live on an offense connect (applyVegetaOffenseVoice) and also staged onto the dormant taunt-
// commit block. This proves both variants, via the voiceKey() alias, now play Vegeta's:
//   • WIN line at match end (forceMatchEnd → _checkMatchOver win-voice branch), and
//   • combatBark trash-talk on a heavy connect (the live "taunt" line).
// Run: `node harness/vegeta_alt_voice_verify.mjs`.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }
async function boot(p1){
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=ippo`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setDummyBehavior?.("stand"));
  await waitFrames(6);
  await page.evaluate(() => { const s=window.__harness.__sound; window.__v=[]; const o=s.playSfxFile.bind(s); s.playSfxFile=(f,fb,op)=>{ if(f&&String(f).endsWith(".mp3")) window.__v.push(String(f).split("/").pop()); return o(f,fb,op); }; });
}
const heard = () => page.evaluate(()=>window.__v.slice());

async function testVariant(key) {
  console.log(`\n─── ${key} ───`);
  // WIN line
  await boot(key);
  const p1key = await page.evaluate(()=>window.__harness.p1().key);
  await page.evaluate(()=>{ window.__v.length=0; window.__harness.story.win(); });
  await waitFrames(4);
  let v = await heard();
  check(`${key} (p1=${p1key}): plays Vegeta WIN line on match win`, v.some(f=>/vegeta/i.test(f)), `clip=${v.find(f=>/vegeta/i.test(f))||("["+v.join(",")+"]")}`);

  // combatBark ("taunt" trash-talk) on a heavy offense connect
  await boot(key);
  let bark=null;
  for (let attempt=0; attempt<8 && !bark; attempt++){
    await page.evaluate(()=>{ window.__harness.healP2?.(); window.__v.length=0; });
    const arena=await page.evaluate(()=>window.__harness.arena());
    await page.evaluate(x=>window.__harness.setP1X(x), Math.round(arena.left+arena.width*0.45));
    const a=await page.evaluate(()=>window.__harness.p1());
    await page.evaluate(x=>window.__harness.setP2X(x), a.x+34);
    await waitFrames(2);
    // PLAIN heavy connects (no forward → not the Fwd+Heavy command rekka) to trip applyVegetaOffenseVoice
    // (cat === "heavy" path). Re-pocket the dummy each swing so the heavy lands cleanly.
    for (let i=0;i<5 && !bark;i++){
      const a=await page.evaluate(()=>window.__harness.p1());
      await page.evaluate(x=>window.__harness.setP2X(x), a.x+34*(a.facing||1));
      await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k");
      const v2=await heard(); bark=v2.find(f=>/vegeta/i.test(f));
      await waitFrames(6);
    }
    if(!bark) await waitFrames(10);
  }
  check(`${key}: plays Vegeta trash-talk (combatBark) on a heavy connect`, !!bark, bark?`clip=${bark}`:"none");
}

try {
  for (const k of ["vegeta_dark","vegito"]) await testVariant(k);
  check("no JS errors", errs.length === 0, errs[0] || "");
} catch (e) {
  console.log("FATAL", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  VEGETA ALT WIN+TAUNT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
