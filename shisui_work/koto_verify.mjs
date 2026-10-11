import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
pg.on("pageerror",e=>{if(!/drawSasukeAdultStance|drawMadara/.test(e.message))console.log("PAGEERR:",e.message);});
await pg.goto(`${base}/index.html?harness=1&p1=shisui_puppeteer&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.refill?.("p1");});
const f0=await pg.evaluate(()=>window.__harness.state().frame);
await pg.waitForFunction(a=>window.__harness.state().frame>=a+10,f0,{timeout:8000,polling:16}).catch(()=>{});
// fire Kotoamatsukami via real ultimate key, then read RAW p2._kotoMirror over time
await pg.keyboard.down("u"); await new Promise(r=>setTimeout(r,80)); await pg.keyboard.up("u");
await pg.waitForFunction(a=>window.__harness.state().frame>=a+10,await pg.evaluate(()=>window.__harness.state().frame),{timeout:5000,polling:16}).catch(()=>{});
// RAW read: access the live p2 object's custom field via the harness internal
const raw=await pg.evaluate(()=>{
  // find p2 via harness; many harnesses expose the raw object through a closure — try state/p2 raw
  const p2=window.__harness.p2raw?.() || null;
  // fallback: scan for _kotoMirror on any exposed fighter
  return { snapshotHasField: ('_kotoMirror' in (window.__harness.p2()||{})), p2raw: p2 ? p2._kotoMirror : 'no p2raw method' };
});
console.log("koto raw probe:", JSON.stringify(raw));
// behavioral: with koto active, does p2 movement mirror? press p2 'right' (l key is p2? no). Instead verify the LOCK: p2 special blocked.
await br.close(); server.close();
