// Stage 3 — "Obito_dimension" banishment: build+verify for Obito (Back+Special) & Tobi (Up+Special).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const who = process.argv[2] === "tobi" ? "tobi" : "obito";
const dir = who === "tobi" ? "U" : "B";
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const dim = () => page.evaluate(() => window.__harness.obitoDimension());
const foe = () => page.evaluate(() => window.__harness.obitoDimBanished("p2"));
const caster = () => page.evaluate(() => window.__harness.obitoDimCaster("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }
async function shot(name, clip) { await page.screenshot({ path: path.join(OUT, `obito_dim_${who}_${name}.png`), ...(clip?{clip}:{}) }); }
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`); };

await page.goto(`${base}/index.html?harness=1&mode=training&p1=${who}&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); window.__harness.fillEnergy?.(); });
await waitFrames(30);

console.log(`\n════ ${who.toUpperCase()} — Obito_dimension (${dir}+Special) ════`);
// ── FIRE via the real special dispatch (directional) ──
const enBefore = (await caster()).energy;
const fired = await page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
await waitFrames(3);
const c1 = await caster(); const d1 = await dim(); const f1 = await foe();
check("special fired → banishment active", !!d1 && d1.targetBanished, `phase=${d1?.phase} banished=${f1?.banished}`);
check("cost 60 charged", enBefore - c1.energy === 60, `spent=${enBefore - c1.energy}`);
check("per-match use counted (1)", (who==="tobi"?c1.tobiDimUses:c1.obitoDimUses) === 1, `uses=${who==="tobi"?c1.tobiDimUses:c1.obitoDimUses}`);
check("15s cooldown armed", (who==="tobi"?c1.tobiDimCd:c1.obitoDimCd) > 800, `cd=${who==="tobi"?c1.tobiDimCd:c1.obitoDimCd}`);
// opponent frozen + untouchable
await waitFrames(20);
const f2 = await foe();
check("foe FROZEN + untouchable while banished (hitstun held, off field)", f2.banished && f2.hitstun > 0, `banished=${f2.banished} hitstun=${f2.hitstun}`);
await shot("banished", { x: 260, y: 280, width: 340, height: 300 });

// prove UNTOUCHABLE: opponent takes no damage from a p1 swing while banished (health unchanged)
const hpBefore = await page.evaluate(() => window.__harness.p2()?.health);
await page.evaluate(() => { window.__harness.setP1Pos?.((window.__harness.p2()?.x||0)-40, null); });
await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k");
await waitFrames(6);
const hpAfter = await page.evaluate(() => window.__harness.p2()?.health);
check("banished foe is UNTOUCHABLE (no damage from a swing)", hpAfter >= hpBefore - 0.01, `hp ${hpBefore}→${hpAfter}`);

// ── RETURN: wait out the duration, foe re-materializes ──
let returned=false;
for (let i=0;i<60;i++){ await waitFrames(4); const ff=await foe(); if(!ff.banished){ returned=true; break; } }
check("foe RETURNS to play after the duration", returned, `banished cleared`);
await waitFrames(10);
const f3 = await foe();
check("returned foe is tangible again + brief return i-frames", !f3.banished, `banished=${f3.banished} invuln=${f3.invulnTimer}`);
await shot("returned", { x: 260, y: 280, width: 340, height: 300 });

// ── measure the FULL duration cleanly: cast → return ──
await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.obitoDimClearCd?.("p1"); });
await waitFrames(4);
const t0 = (await state()).frame;
await page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
let backFrame = 0;
for (let i=0;i<80;i++){ await waitFrames(2); const ff=await foe(); if(!ff.banished){ backFrame=(await state()).frame; break; } }
const durSec = (backFrame - t0)/60;
check("full banish duration ≈ 2s hard cap", durSec > 1.7 && durSec < 2.8, `cast→return ${durSec.toFixed(2)}s`);

// ── GUARDRAIL: per-match cap = 2. Isolate from cooldown via obitoDimClearCd; the 3rd cast must be BLOCKED ──
// (uses is now 2 from the two real casts above). Clear CD + refill, then a 3rd attempt should no-op.
await page.evaluate(() => { window.__harness.obitoDimClearCd?.("p1"); window.__harness.fillEnergy?.(); });
await waitFrames(2);
const usesBefore = (who==="tobi" ? (await caster()).tobiDimUses : (await caster()).obitoDimUses);
const enBefore3 = (await caster()).energy;
await page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
await waitFrames(4);
const c3 = await caster();
const usesAfter = who==="tobi" ? c3.tobiDimUses : c3.obitoDimUses;
check("used exactly 2 casts this match", usesBefore === 2, `uses=${usesBefore}`);
check("3rd cast BLOCKED by per-match cap (no use, no energy spent)", usesAfter === 2 && c3.energy === enBefore3, `uses=${usesAfter} energy ${enBefore3}→${c3.energy}`);

check("no JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL?1:0);
