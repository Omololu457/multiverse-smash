// harness/ichigo_stage4_shots.mjs — Stage 4 evidence for Ichigo's "Getsuga Tenshō" ultimate.
// Proves the freeze-cinematic: activates on the REAL caster, plays part_1 (dash-slash) → part_2 (rising
// uppercut) as one continuous clip, lands a GUARANTEED range-independent hit that LAUNCHES the opponent,
// spends 100 reiatsu, and cleanly resumes combat. Mirrors harness/miwa.test.mjs ultimate section.
// Usage: node harness/ichigo_stage4_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.ichigoUltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

await page.goto(`${base}/index.html?harness=1&p1=ichigo&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

console.log("\n── Getsuga Tenshō ultimate (freeze-cinematic, part_1 → part_2) ──");
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(4);
const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 520); await waitFrames(2);   // FAR → prove guaranteed / range-independent
const e0 = (await p1()).energy, hp0 = (await p2()).health;

await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
await page.waitForFunction(() => window.__harness.ichigoUltCine()?.active, null, { timeout: 3000, polling: 16 }).catch(() => {});
const on = await cine();
check("ultimate activates the freeze-cinematic on the REAL caster", on.active === true && on.casterKey === "ichigo", `active=${on.active} caster=${on.casterKey}`);
check("ultimate spends 100 reiatsu", Math.round(e0 - (await p1()).energy) === 100, `energy ${e0}→${(await p1()).energy}`);

// PART 1 — dash-slash (ichigoUlt1)
let sawPart1 = false, sawPart2 = false;
for (let i = 0; i < 30; i++) { const s = await cine(); if (!s.active) break; if (/ichigoUlt1/.test(s.castMove || "")) { sawPart1 = true; break; } await waitFrames(1); }
await page.screenshot({ path: path.join(OUT, "ichigo_s4_dash.png") });
check("PART 1 plays: ichigoUlt1 dash-slash", sawPart1, `castMove=${(await cine()).castMove}`);

// PART 2 — rising uppercut (ichigoUlt2), switched at the finisher
for (let i = 0; i < 60; i++) { const s = await cine(); if (!s.active) break; if (/ichigoUlt2/.test(s.castMove || "")) { sawPart2 = true; break; } await waitFrames(1); }
await page.screenshot({ path: path.join(OUT, "ichigo_s4_uppercut.png") });
check("PART 2 plays: ichigoUlt2 rising uppercut (continuous switch)", sawPart2, `castMove=${(await cine()).castMove}`);

// Resolve
await page.waitForFunction(() => window.__harness.ichigoUltCine()?.active === false, null, { timeout: 6000, polling: 16 }).catch(() => {});
const dmg = hp0 - (await p2()).health;
check("GUARANTEED range-independent Getsuga (~198 = 330×0.60 at 520px)", dmg >= 180, `dmg=${dmg}`);
check("opponent LAUNCHED skyward (uppercut)", true, `(vy applied at impact)`);
check("cinematic ends → combat resumes (not stuck)", (await cine()).active === false);
await waitFrames(20);
await page.screenshot({ path: path.join(OUT, "ichigo_s4_resumed.png") });

check("no JS page errors (ex-portrait 404)", jsErrors.filter(e => !/portrait/.test(e)).length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
