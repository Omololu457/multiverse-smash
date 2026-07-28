// hairskin_select_shot.mjs — capture the skin-SELECT screen for given chars.
// node harness/hairskin_select_shot.mjs --chars=killua,gojo --label=before
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1]) || "";
const chars = arg("chars").split(",").filter(Boolean); const label = arg("label") || "shot";
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
await page.goto(`${base}/index.html?harness=1`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(20,20);
for (const ch of chars) {
  const info = await page.evaluate(c => window.__harness.showSkinSelect(c, "p1", 0), ch);
  await sleep(350);
  await page.screenshot({ path: path.join(OUT, `hairskin_${label}_select_${ch}.png`) });
  console.log(`${ch}: ${info.skins.length} skins -> [${info.skins.map(s=>s.id).join(", ")}]`);
}
await browser.close(); server.close();
