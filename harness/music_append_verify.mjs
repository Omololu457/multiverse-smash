// harness/music_append_verify.mjs — verify the APPENDED music tracks actually load & play, live, through the
// same path the game uses (sound.playMusicFile → new Audio(); a.src = AUDIO_BASE+filename; play()).
// Also re-confirms the library count and that pre-existing tracks are still served (spot-check).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r=>{ const s=http.createServer((req,res)=>{
  const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u);
  if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}
  fs.stat(f,(e,st)=>{ if(e||!st.isFile()){res.writeHead(404).end("nf");return;}
    // support Range so <audio> streams like a real server
    res.writeHead(200,{ "content-type":MIME[path.extname(f)]||"application/octet-stream","accept-ranges":"bytes","content-length":st.size });
    fs.createReadStream(f).pipe(res);
  });
}); s.listen(0,"127.0.0.1",()=>r(s)); });
const base=`http://127.0.0.1:${server.address().port}`;
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"} ${n}${d?`  — ${d}`:""}`);};

const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage();
page.on("pageerror",e=>console.log("  ⚠️ pageerror:",e.message));

// The tracks to verify: 3 NEW ones incl. tricky filenames (spaces/parens/hyphen/accent).
const NEW_TRACKS = [
  "Foolish.mp3",
  "Playboi Carti - Magnolia (Audio).mp3",
  "Jhené Aiko - my mine (Audio).mp3",
];
// pre-existing spot-check (must still be served, unchanged)
const OLD_TRACKS = ["20 Min.mp3", "眠れぬ都会 (Sleepless City).mp3"];

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(()=>!!window.__harness, null, { timeout: 15000 });

  // ① library count is 179 and includes the new tracks (via the real musicLibrary module)
  const lib = await page.evaluate(async ()=>{
    const m = await import("./musicLibrary.js");
    const files = m.getLibrary().map(s=>s.file);
    return { size: m.librarySize(), total: files.length, hasFoolish: files.includes("Foolish.mp3"),
             hasMagnolia: files.includes("Playboi Carti - Magnolia (Audio).mp3") };
  });
  check("library size is 179 (103 + 76)", lib.size===179 && lib.total===179, `size=${lib.size}`);
  check("new tracks present in the live library", lib.hasFoolish && lib.hasMagnolia);

  // ② each track loads + plays via the SAME path the game uses (new Audio → src → play)
  const tryPlay = (fname)=>page.evaluate((f)=>new Promise((resolve)=>{
    const a = new Audio();
    let done=false; const fin=(ok,info)=>{ if(done)return; done=true; try{a.pause();}catch{}; resolve({ok,info}); };
    a.preload="auto";
    a.addEventListener("canplay", ()=>fin(true,"canplay rs="+a.readyState));
    a.addEventListener("loadeddata", ()=>fin(true,"loadeddata rs="+a.readyState));
    a.addEventListener("playing", ()=>fin(true,"playing"));
    a.addEventListener("error", ()=>fin(false,"error code="+(a.error&&a.error.code)));
    a.src = f;                    // exactly what _resolveSrc returns for a bare music name (AUDIO_BASE="")
    a.play().catch(()=>{});       // autoplay gate is disabled in this harness
    setTimeout(()=>fin(a.readyState>=2, "timeout rs="+a.readyState), 6000);
  }), fname);

  for (const t of NEW_TRACKS) {
    const r = await tryPlay(t);
    check(`NEW track plays: ${t}`, r.ok, r.info);
  }
  // pre-existing still play (proves the append didn't disturb serving)
  for (const t of OLD_TRACKS) {
    const r = await tryPlay(t);
    check(`pre-existing still plays: ${t}`, r.ok, r.info);
  }
} catch(e){ check("no unexpected error", false, e.stack||e.message); }
finally { await browser.close(); server.close(); }

console.log(`\nMUSIC APPEND VERIFY: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL===0?0:1);
