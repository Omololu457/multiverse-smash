// Batch hue-recolor many sheets in ONE browser session. Reuses recolor_hue's exact filter.
// usage: node harness/recolor_batch.mjs '<json array of {src,out,deg,sat?}>'
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jobs = JSON.parse(process.argv[2]);
const server = http.createServer((q,res)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":"image/png"});res.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch();const page=await b.newPage();
await page.goto(`${base}/`,{waitUntil:"domcontentloaded"}).catch(()=>{});
for(const j of jobs){
  const sat = j.sat!==undefined?j.sat:1.15;
  const du = await page.evaluate(async ({url,deg,sat})=>{
    const img=new Image();img.src=url;await img.decode();
    const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;
    const x=c.getContext("2d");x.filter=`hue-rotate(${deg}deg) saturate(${sat})`;x.drawImage(img,0,0);
    return c.toDataURL("image/png");
  },{url:`${base}/${j.src}`,deg:j.deg,sat});
  fs.writeFileSync(path.join(ROOT,j.out),Buffer.from(du.replace(/^data:image\/png;base64,/,""),"base64"));
  console.log(`  ${j.out} ← ${j.src} (hue ${j.deg}, sat ${sat})`);
}
await b.close();server.close();
