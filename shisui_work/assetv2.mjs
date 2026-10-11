import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg"};
const bare=[],vers=[];
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);if(u.endsWith(".png")){ if(rq.url.includes("?v="))vers.push(u); else bare.push(u);} const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}}); let perr=0; pg.on("pageerror",e=>{perr++;console.log("PERR",e.message);});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(10);
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);});
for(const k of [["l"],["s","l"],["w","l"],["u"]]){ for(const kk of k)await pg.keyboard.down(kk); await wf(3); for(const kk of k)await pg.keyboard.up(kk); await wf(12); }
const sb=[...new Set(bare)].filter(u=>u.includes("shisui_blade"));
const sv=[...new Set(vers)].filter(u=>u.includes("shisui_blade"));
console.log("shisui_blade BARE reqs:", sb.length, sb.slice(0,3));
console.log("shisui_blade VERSIONED reqs:", sv.length, sv.slice(0,3));
console.log("pageErrors:", perr);
await br.close(); server.close();
