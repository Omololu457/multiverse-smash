// harness/desync_diagnose.mjs — DIAGNOSTIC (read-only, asserts nothing hard).
// Reproduces the fullscreen<->windowed desync between the BITMAP stage background art and the
// physics/visual ground plane. For each stage+size: reads groundY (physics), the on-screen floor
// line, the drawn-image world span, and screenshots so we can eyeball fighter feet vs painted ground.
// A PROCEDURAL stage (Hidden Leaf) is included as a CONTROL — its landmarks are drawn relative to
// groundY, so it must NOT desync at any size.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "desync"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });

const STAGES = [
  { name: "Jujutsu High Courtyard", kind: "BITMAP 1408x768" },
  { name: "Valley of the End",      kind: "BITMAP 2752x1536" },
  { name: "Hidden Leaf Village",    kind: "PROCEDURAL (control)" },
  { name: "Test Map",               kind: "BITMAP 2752x1536" },
];
const SIZES = [ {w:1280,h:720,tag:"win720"}, {w:1280,h:1080,tag:"tall1080"}, {w:1280,h:1440,tag:"tall1440"}, {w:1920,h:1080,tag:"fhd1080"} ];

async function boot(page) {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(a => window.__harness.state().frame >= a + 6, s0, { polling: 16, timeout: 15000 }).catch(()=>{});
  await page.evaluate(() => window.__harness.skipToBattle());
  const s1 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(a => window.__harness.state().frame >= a + 30, s1, { polling: 16, timeout: 15000 }).catch(()=>{});
}

for (const st of STAGES) {
  console.log(`\n═══ ${st.name}  [${st.kind}] ═══`);
  for (const sz of SIZES) {
    const page = await browser.newPage({ viewport: { width: sz.w, height: sz.h } });
    await boot(page);
    // switch stage, force a resize/reflow, settle the camera
    await page.evaluate((name) => window.__harness.setSession({ selectedStage: name }), st.name);
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    const s2 = await page.evaluate(() => window.__harness.state().frame);
    await page.waitForFunction(a => window.__harness.state().frame >= a + 30, s2, { polling: 16, timeout: 15000 }).catch(()=>{});
    const g = await page.evaluate(() => window.__harness.frameGeom());
    const f = await page.evaluate(() => window.__harness.p1());
    // world-y of the image bottom (=canvas h) and image top (=0) projected to screen
    const toScreen = (wy) => (wy - g.cameraY) * g.zoom + g.ch / 2;
    const imgBotScreen = toScreen(g.ch);      // image drawn 0..h → bottom at world-y=h
    const imgTopScreen = toScreen(0);
    const feetWorld = f.y + f.h;
    console.log(`  ${sz.tag} ${sz.w}x${sz.h}: canvasH=${g.ch} groundY=${g.groundY} (h-${g.ch-g.groundY}) groundY/h=${(g.groundY/g.ch).toFixed(3)} zoom=${g.zoom.toFixed(3)}`);
    console.log(`       feetWorldY=${Math.round(feetWorld)} (groundY-feet=${Math.round(g.groundY-feetWorld)})  floorLineScreenY=${Math.round(g.floorLineScreenY)}  imgTopScreen=${Math.round(imgTopScreen)} imgBotScreen=${Math.round(imgBotScreen)}`);
    await page.screenshot({ path: path.join(OUT, `${st.name.replace(/\s+/g,"_")}__${sz.tag}.png`) });
    await page.close();
  }
}
await browser.close(); server.close();
console.log(`\nShots → ${OUT}`);
process.exit(0);
