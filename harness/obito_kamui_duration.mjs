// harness/obito_kamui_duration.mjs — empirically measures the FULL-BAR Kamui intangibility duration.
// Fills chakra to max, toggles Kamui ON, and counts real game frames until the continuous drain
// auto-deactivates it at zero energy. Reports frames + seconds so the drain-rate tune can be verified
// as a real, meaningfully-longer window (not a negligible change).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const state = () => page.evaluate(() => window.__harness.state());
const kamui = () => page.evaluate(() => window.__harness.obitoKamui());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 8 }); }

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// clean idle + max chakra, Kamui OFF
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); const k = window.__harness.obitoKamui(); if (k?.intangible) window.__harness.obitoKamuiToggle(); });
await waitFrames(3);
await page.evaluate(() => window.__harness.fillEnergy?.());
await waitFrames(1);

const startEnergy = (await kamui()).energy;
const startFrame  = (await state()).frame;
await page.evaluate(() => window.__harness.obitoKamuiToggle());   // ON
let onConfirmed = (await kamui()).intangible;

// poll until auto-deactivation (energy hit 0 → intangible=false)
let frames = 0, endEnergy = startEnergy, lastEnergy = startEnergy;
for (let i = 0; i < 2000; i++) {
  await waitFrames(1);
  const k = await kamui();
  lastEnergy = k.energy;
  if (!k.intangible) { endEnergy = k.energy; break; }
}
const endFrame = (await state()).frame;
frames = endFrame - startFrame;

console.log(`\n── OBITO KAMUI — full-bar intangibility duration ──`);
console.log(`  start energy      : ${startEnergy.toFixed(2)}`);
console.log(`  toggle ON confirmed: ${onConfirmed}`);
console.log(`  auto-deactivated at: ${endEnergy.toFixed(2)} energy`);
console.log(`  frames sustained  : ${frames}`);
console.log(`  seconds @60fps    : ${(frames / 60).toFixed(2)}s`);

await browser.close(); server.close();
