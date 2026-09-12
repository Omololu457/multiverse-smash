// harness/voice_alias_verify.mjs — ALTERNATE-FORM VOICE REUSE, LIVE proof.
// The 10 alternate-form rosterKeys now reuse their base character's on-disk voice pack via voiceKey()
// (combat.js) applied at every voice guard/dispatch point. This boots each variant as the DEFENDER,
// lands a real hit, spies on sound.playSfxFile, and asserts a voice clip named after the BASE plays —
// proving the combat hit-voice guard now matches the variant. Run: `node harness/voice_alias_verify.mjs`.
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

// variant → [base-voice filename token(s)]
const VARIANTS = [
  ["dark_knight",      ["batman"]],
  ["superman_classic", ["superman"]],
  ["superman_dcuc",    ["superman"]],
  ["superman_fighter", ["superman"]],
  ["superman_new52",   ["superman"]],
  ["vegeta_dark",      ["vegeta"]],
  ["vegito",           ["vegeta"]],
  ["ghostface_billy",  ["ghostface"]],
  ["miles",            ["spiderman","spider"]],
  ["rickPrime",        ["rick"]],
];

async function testVariant(key, tokens) {
  await page.goto(`${base}/index.html?harness=1&p1=ippo&p2=${key}`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setDummyBehavior?.("stand"));
  await waitFrames(6);
  // spy voice files
  await page.evaluate(() => { const s=window.__harness.__sound; window.__voice=[]; const o=s.playSfxFile.bind(s); s.playSfxFile=(f,fb,op)=>{ if(f&&String(f).endsWith(".mp3")) window.__voice.push(String(f).split("/").pop()); return o(f,fb,op); }; });
  // confirm p2 really is the variant
  const p2key = await page.evaluate(() => window.__harness.p2().key);
  // land several hits on p2 (the variant is the DEFENDER → its hit-voice guard fires)
  let voice=null;
  for (let attempt=0; attempt<8 && !voice; attempt++) {
    await page.evaluate(()=>{ window.__harness.healP2?.(); window.__voice.length=0; });
    const arena=await page.evaluate(()=>window.__harness.arena());
    await page.evaluate(x=>window.__harness.setP1X(x), Math.round(arena.left+arena.width*0.45));
    const a=await page.evaluate(()=>window.__harness.p1());
    await page.evaluate(x=>window.__harness.setP2X(x), a.x+34);
    await waitFrames(2);
    await page.keyboard.down("d"); await page.keyboard.down("k");
    for (let i=0;i<20 && !voice;i++){ const v=await page.evaluate(()=>window.__voice.slice()); voice=v.find(f=>tokens.some(t=>f.toLowerCase().includes(t))); if(!voice) await waitFrames(1); }
    await page.keyboard.up("k"); await page.keyboard.up("d");
    if(!voice) await waitFrames(10);
  }
  check(`${key} (p2=${p2key}): plays base voice on hit`, !!voice, voice ? `clip=${voice}` : `heard none matching [${tokens.join("/")}]`);
}

try {
  for (const [k,t] of VARIANTS) await testVariant(k,t);
  check("no JS errors", errs.length === 0, errs[0] || "");
} catch (e) {
  console.log("FATAL", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  VOICE ALIAS REUSE: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
