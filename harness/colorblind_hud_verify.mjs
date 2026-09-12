// harness/colorblind_hud_verify.mjs — COLORBLIND-SAFE HUD toggle (Track D), LIVE proof.
// Adds an opt-in Settings toggle (ms_colorblind_hud) that shifts the two player-side HUD identity
// colors from the default blue/RED pair to a CVD-safe blue/ORANGE pair (P2's red accent + name → orange).
// Default is unchanged. This boots a real match, samples the P2 health-panel region off the live canvas,
// and asserts:
//   • default (OFF): the P2 accent region reads RED, not orange,
//   • ON: the same region reads ORANGE (red drops, orange rises),
//   • toggling OFF reverts to red,
//   • the setting PERSISTS across a page reload (localStorage) and is applied at load.
// Run: `node harness/colorblind_hud_verify.mjs`.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const ctxb = await browser.newContext({ viewport:{ width:1280, height:720 } });   // one context → localStorage persists across reloads
const page = await ctxb.newPage();
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }
// sample the P2 (right) health-panel region and count red-ish vs orange-ish pixels
const sampleP2 = () => page.evaluate(() => {
  const cv = document.querySelector("canvas"); const cx = cv.getContext("2d");
  const cw = cv.width;
  const barW = Math.max(220, Math.min(420, cw * 0.28));
  const x0 = Math.round(cw - 14 - barW - 20), y0 = 10, w = Math.round(barW + 24), h = 56;
  const d = cx.getImageData(x0, y0, w, h).data;
  let red = 0, orange = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
    if (a < 40) continue;
    if (r > 150 && g < 115 && b < 115 && (r - g) > 55 && (r - b) > 55) red++;
    else if (r > 195 && g > 110 && g < 205 && b < 125 && (r - b) > 85 && (g - b) > 25) orange++;
  }
  return { red, orange };
});
async function boot() {
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await boot();

  // ── DEFAULT (OFF) ──
  console.log("\n─── default palette (OFF) ───");
  await page.evaluate(() => window.__harness.brutality.setColorblind(false));
  await waitFrames(4);
  const off = await sampleP2();
  check("default: P2 accent reads RED", off.red > 40 && off.orange < off.red, `red=${off.red} orange=${off.orange}`);

  // ── ON ──
  console.log("\n─── colorblind ON → blue/orange ───");
  const ret = await page.evaluate(() => window.__harness.brutality.setColorblind(true));
  await waitFrames(4);
  const on = await sampleP2();
  check("setter returns ON", ret === true, `ret=${ret}`);
  check("ON: P2 accent shifts to ORANGE (orange rises)", on.orange > off.orange + 30, `orange ${off.orange}→${on.orange}`);
  check("ON: RED drops away", on.red < off.red, `red ${off.red}→${on.red}`);

  // ── toggle back OFF ──
  console.log("\n─── toggle OFF reverts ───");
  await page.evaluate(() => window.__harness.brutality.setColorblind(false));
  await waitFrames(4);
  const back = await sampleP2();
  check("OFF again: reverts to RED", back.red > 40 && back.orange < back.red, `red=${back.red} orange=${back.orange}`);

  // ── persistence across reload ──
  console.log("\n─── persists across reload/restart ───");
  await page.evaluate(() => window.__harness.brutality.setColorblind(true));
  const stored = await page.evaluate(() => { try { return localStorage.getItem("ms_colorblind_hud"); } catch(_) { return null; } });
  check("localStorage saved (ms_colorblind_hud=1)", stored === "1", `value=${stored}`);
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil:"load" });   // full reload
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await boot();
  const loadedFlag = await page.evaluate(() => window.__harness.brutality.getColorblind());
  check("flag restored ON at load (no re-toggle)", loadedFlag === true, `flag=${loadedFlag}`);
  const reloaded = await sampleP2();
  check("HUD renders ORANGE immediately after reload", reloaded.orange > reloaded.red, `red=${reloaded.red} orange=${reloaded.orange}`);

  // cleanup so we don't leave the flag set for other runs sharing storage
  await page.evaluate(() => window.__harness.brutality.setColorblind(false));

  check("no JS errors", errs.length === 0, errs[0] || "");
} catch (e) {
  console.log("FATAL", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  COLORBLIND HUD (Track D): ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
