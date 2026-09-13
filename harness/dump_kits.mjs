// Regenerate harness/kits_dump.json from the LIVE game via the __harness.dumpKits() hook.
// Feeds tools/build_beta_doc.mjs (which then feeds render_beta_pdf.mjs).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness&&!!window.__harness.dumpKits,null,{timeout:15000});
const kits = await page.evaluate(()=>window.__harness.dumpKits());
fs.writeFileSync(path.join(ROOT,"harness","kits_dump.json"), JSON.stringify(kits,null,2));
const unis=[...new Set(kits.map(k=>k.universe))];
console.log(`wrote harness/kits_dump.json — ${kits.length} fighters · ${unis.length} universe-keys`);
console.log(`universe keys: ${unis.join(", ")}`);
console.log(`JS errors: ${jsErrors.length}${jsErrors.length?" — "+jsErrors.slice(0,2).join(" | "):""}`);
await browser.close(); server.close();
