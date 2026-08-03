// harness/morpher_callin_shot.mjs — fire the Morpher Call-In and verify the partner performs THEIR OWN
// real Ultimate. Usage: node harness/morpher_callin_shot.mjs --char=omega_ranger --partner=gold_samurai_ranger --label=omega_calls_gold
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1]) || "";
const char = arg("char") || "omega_ranger"; const partner = arg("partner") || "gold_samurai_ranger"; const label = arg("label") || `${char}_calls_${partner}`;
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(`${base}/index.html?harness=1&p1=${char}&p2=gojo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);
const hpBefore = await page.evaluate(() => window.__harness.p2().health);
await page.evaluate((p) => window.__harness.setCallInPartner(p, "p1"), partner);
const fired = await page.evaluate(() => window.__harness.fireCallIn("p1"));
console.log(`${char} calls in ${partner}: fired=${fired}, p2 HP before=${Math.round(hpBefore)}`);

const marks = [200, 550, 1100, 1900, 2600];
let prev = 0;
for (let i = 0; i < marks.length; i++) {
  await sleep(marks[i] - prev); prev = marks[i];
  const st = await page.evaluate(() => window.__harness.callInStatus());
  await page.screenshot({ path: path.join(OUT, `callin_${label}_${i}.png`) });
  console.log(`  ${marks[i]}ms: phase=${st.phase} partner=${st.partner} ultFired=${st.ultFired} cinematic=${st.cinematic} oppHP=${st.oppHealth != null ? Math.round(st.oppHealth) : "-"}`);
}
const hpAfter = await page.evaluate(() => window.__harness.p2().health);
console.log(`  RESULT: p2 HP after=${Math.round(hpAfter)}  (damage dealt=${Math.round(hpBefore - hpAfter)})`);
await browser.close(); server.close();
