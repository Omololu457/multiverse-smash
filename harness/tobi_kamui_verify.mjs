// Stage 2 verification — Tobi Kamui intangibility fixes (2a visual + 2b drain), mirroring Obito.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const kamui = () => page.evaluate(() => window.__harness.tobiKamui());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }
async function shot(name, clip) { await page.screenshot({ path: path.join(OUT, `tobi_kamui_${name}.png`), ...(clip?{clip}:{}) }); }
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`); };

await page.goto(`${base}/index.html?harness=1&mode=training&p1=tobi&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); window.__harness.fillEnergy?.(); });
await waitFrames(30);
const clip = { x: 300, y: 300, width: 300, height: 280 };

// ── 2a: activation shows the brief swirl; then it settles to NORMAL (no sustained ghost) ──
console.log("── 2a: brief activation animation, zero sustained visual ──");
const before = await page.evaluate(()=>{ const f=window.__harness.tobiKamui(); return f; });
await page.evaluate(() => window.__harness.tobiKamuiToggle());
await waitFrames(4);
const k = await kamui();
check("toggle ON → intangible + phased", k.intangible && k.phased, `intangible=${k.intangible} phased=${k.phased}`);
const actFx1 = await page.evaluate(()=>{ const p=window.__harness.p1?.(); return p?._tobiKamuiActivateFx ?? null; });
await shot("2a_activation", clip);   // swirl should be visible here (brief window)
// let the activation window fully expire → sustained state
await waitFrames(30);
const actFx2 = await page.evaluate(()=>{ const p=window.__harness.p1?.(); return p?._tobiKamuiActivateFx ?? null; });
const kSustain = await kamui();
check("still intangible+phased 30f later (sustained)", kSustain.intangible && kSustain.phased, `phased=${kSustain.phased} energy=${kSustain.energy}`);
check("activation swirl EXPIRED (activateFx ticked to 0)", (actFx2||0) === 0, `fx@act=${actFx1} fx@sustain=${actFx2}`);
await shot("2a_sustained", clip);    // should look like a completely normal Tobi (no ghost/transparency)

// ── 2b: slower drain — full 200-pool lasts ~7.9s (was ~4.8s) ──
console.log("── 2b: drain rate — full pool duration ──");
// re-arm: toggle off, refill, toggle on at full, then time to auto-off (idle)
if ((await kamui()).intangible) { await page.evaluate(() => window.__harness.tobiKamuiToggle()); await waitFrames(3); }
await page.evaluate(() => { window.__harness.fillEnergy?.(); });
const enFull = (await kamui()).energy;
const fStart = (await state()).frame;
await page.evaluate(() => window.__harness.tobiKamuiToggle());   // ON at full
let autoOff=false, offFrame=0;
for (let i=0;i<160;i++){ await waitFrames(6); const s=await kamui(); if(!s.intangible){ autoOff=true; offFrame=(await state()).frame; break; } }
const durF = offFrame - fStart;
const secs = (durF/60);
check("auto-deactivated at chakra 0", autoOff, `energy started ${enFull}`);
check("full-pool duration ≈ 7.9s (0.48 drain, not ~4.8s)", secs > 6.8 && secs < 9.0, `duration=${secs.toFixed(2)}s (${durF}f)`);
check("no JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots tobi_kamui_2a_*.png`);
await browser.close(); server.close();
process.exit(FAIL?1:0);
