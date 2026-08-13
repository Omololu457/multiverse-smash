// harness/dash_audit_sweep.mjs — STAGE 0 PART C: dash-animation audit across the FULL roster.
// For each character: (1) live double-tap-toward → capture resolved action / castMove / speedBlur /
// the ACTUAL sheet the sprite handler is drawing during the dash window, plus a screenshot; (2) a
// deterministic forceAction("dash") clean-pose screenshot + its resolved sheet. Lets us tell whether a
// char renders its OWN dash sprite or a generic fallback (procedural box / bare whirl over no art).
// Usage: node harness/dash_audit_sweep.mjs [key1 key2 ...]   (no args = full roster)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "dash_audit_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const P1 = () => page.evaluate(() => window.__harness.p1());

const ALL = process.argv.slice(2);
const KEYS = ALL.length ? ALL : (await (async()=>{
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  return page.evaluate(() => Object.keys(window.__harness.characters ? window.__harness.characters() : {}));
})());

async function boot(p1) {
  const dummy = p1 === "naruto" ? "tobirama" : "naruto";
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${dummy}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(250);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 300); });
  await sleep(60);
}
async function doubleTapToward() {
  await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d");
  await sleep(55);
  await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d");
}

const results = [];
for (const key of KEYS) {
  try {
    await boot(key);
    const info = await P1();
    // live double-tap toward → catch the dash window
    await doubleTapToward();
    let cap = { action:null, cast:null, blur:0, sheet:null, flash:0 };
    for (let i = 0; i < 16; i++) {
      const p = await P1();
      if (p.action === "dash" || p.castMove === "dash" || p.speedBlur > 0 || p.teleportFlash > 0) {
        cap = { action:p.action, cast:p.castMove, blur:p.speedBlur, sheet:p.spriteSheet, flash:p.teleportFlash };
        break;
      }
      cap = { action:p.action, cast:p.castMove, blur:p.speedBlur, sheet:p.spriteSheet, flash:p.teleportFlash };
      await sleep(14);
    }
    await page.screenshot({ path: path.join(OUT, `${key}_live.png`) });
    // deterministic clean dash pose
    const forced = await page.evaluate(() => window.__harness.forceAction("dash"));
    await sleep(120);
    await page.screenshot({ path: path.join(OUT, `${key}_forced.png`) });
    await page.evaluate(() => window.__harness.forceAction(null));
    results.push({ key, speed: info.baseSpeed, dashTeleport: info.dashTeleport, live: cap, forcedSheet: forced?.sheet || null });
    console.log(`${key.padEnd(20)} spd=${String(info.baseSpeed).padStart(3)} dT=${String(!!info.dashTeleport).padStart(5)} | live action=${String(cap.action).padEnd(8)} cast=${String(cap.cast).padEnd(8)} blur=${String(cap.blur).padStart(2)} flash=${String(cap.flash).padStart(2)} sheet=${(cap.sheet||'—').replace('./','')} || forcedDash=${(forced?.sheet||'NULL').replace('./','')}`);
  } catch (e) {
    console.log(`${key.padEnd(20)} ERROR ${e.message}`);
    results.push({ key, error: e.message });
  }
}
fs.writeFileSync(path.join(OUT, "_results.json"), JSON.stringify(results, null, 2));
await browser.close(); server.close();
console.log("\nDONE →", OUT);
