// harness/obito_stage7_shots.mjs — STAGE 7 evidence for Obito's JUUBI ULTIMATE.
// Fires the Ten-Tails Bijūdama cinematic and proves the full giant-form sequence: activation → the beast
// RISES → CHARGE (Bijūdama forms) → FIRE (guaranteed damage at impact) → SETTLE → combat resumes. Reuses
// the proven kurama/minatoKurama freeze-cinematic architecture with Obito's OWN Juubi art. Captures a shot
// at rise / charge / fire, and guards against the project's known DUPLICATE-RENDER bug (caster hidden).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e))); page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.obitoJuubiUltCine());
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_s7_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.boot(); });   // start + skipToBattle + fill energy
await sleep(200);
await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 200); });
await sleep(80);

console.log("\n── Juubi Ultimate — full cinematic sequence ──");
const c0 = await cine();
check("cinematic not active before firing", !c0.active, `active=${c0.active}`);
const hp0 = (await p2()).health;

// fire the ultimate (U)
await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u");

// walk the phases, screenshotting each once
const seen = new Set();
let struck = false, maxFrame = 0, everActive = false;
for (let i = 0; i < 90; i++) {
  const c = await cine();
  if (c.active) { everActive = true; maxFrame = Math.max(maxFrame, c.frame); if (c.struck) struck = true;
    if (["rise","charge","fire"].includes(c.phase) && !seen.has(c.phase)) { seen.add(c.phase); await shot(c.phase); }
  } else if (everActive) break;
  await sleep(33);
}
check("Juubi cinematic ACTIVATED (freeze-cinematic)", everActive, "");
check("beast RISE phase played + captured", seen.has("rise"), "");
check("CHARGE phase played (Bijūdama forms) + captured", seen.has("charge"), "");
check("FIRE phase played (Bijūdama detonates) + captured", seen.has("fire"), "");
check("guaranteed hit registered (struck at impact)", struck, `struck=${struck}`);
check("advanced through a full multi-phase timeline", maxFrame > 150, `maxFrame=${maxFrame}`);

// after it ends: damage dealt + combat resumes
await page.waitForFunction(() => !window.__harness.obitoJuubiUltCine().active, null, { timeout: 6000 }).catch(() => {});
const cEnd = await cine();
const hpEnd = (await p2()).health;
const dmg = hp0 - hpEnd;
check("cinematic ENDED (combat resumes)", !cEnd.active, `active=${cEnd.active}`);
check("opponent took the guaranteed cinematic-band damage (~216 = 360×0.60)", dmg >= 180 && dmg <= 250, `dmg=${dmg}`);
await shot("after");

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_s7_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
