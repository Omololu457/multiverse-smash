// Verify + screenshot the MORPHER ENERGY (Power Rangers) + Breathing-Style (Demon Slayer) HUD labels.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "energy_labels"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json" };
const server = await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base = `http://127.0.0.1:${server.address().port}`;
let pass=0, fail=0; const check=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const state=()=>page.evaluate(()=>window.__harness.state());
async function waitFrames(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16})}

// [rosterKey, expectedLabel, path]  path: "energy" (with-meter) | "noMeter" (flavor)
const CASES = [
  // POWER RANGERS → MORPHER ENERGY
  ["omega_ranger","MORPHER ENERGY","energy"],
  ["samurai_red_ranger","MORPHER ENERGY","energy"],
  ["gold_samurai_ranger","MORPHER ENERGY","energy"],
  ["green_samurai_ranger","MORPHER ENERGY","energy"],
  ["red_ranger_mmpr","MORPHER ENERGY","energy"],
  // DEMON SLAYER → own Breathing Style (Nezuko → Blood Demon Art)
  ["zenitsu","THUNDER BREATHING","noMeter"],
  ["shinobu","INSECT BREATHING","noMeter"],
  ["rengoku","FLAME BREATHING","noMeter"],
  ["inosuke","BEAST BREATHING","noMeter"],
  ["nezuko","BLOOD DEMON ART","noMeter"],
];

try {
  for (const [key, expect, kind] of CASES) {
    await page.goto(`${base}/index.html?harness=1&p1=${key}`, { waitUntil:"load" });
    await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
    await page.mouse.click(640,360);
    await page.evaluate(()=>window.__harness.boot());
    await waitFrames(8);
    const energy  = await page.evaluate(()=>window.__harness.energyLabel("p1"));
    const noMeter = await page.evaluate(()=>window.__harness.noMeterFlavor("p1"));
    const shown = kind==="energy" ? energy : noMeter;
    check(`${key.padEnd(22)} HUD label = "${expect}"`, shown===expect, `energyLabel=${energy} noMeterFlavor=${noMeter}`);
    // full HUD + a cropped top strip (where the P1 energy panel/label draws)
    await page.screenshot({ path: path.join(OUT, `${key}_full.png`) });
    await page.screenshot({ path: path.join(OUT, `${key}_hud.png`), clip:{ x:0, y:0, width:520, height:150 } });
  }
  check("no JS page errors", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
  console.log(`\n${fail===0?"✅":"❌"} Energy-label rename: ${pass} passed, ${fail} failed`);
} catch(e){ console.error("HARNESS ERROR:",e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail===0?0:1); }
