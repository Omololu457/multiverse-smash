// harness/obito_stage6_shots.mjs — STAGE 6 evidence for Obito's KAMUI TELEPORT GRAB.
// The grab button IS his command-grab (reuses combat.resolveGrab, the Uchiha-Susanoo Tier-1 pipeline),
// but with a NEW payload type: on a clean grab the opponent is WARPED to a random far point on the map
// instead of taking throw-damage. Proves: (1) the grab connects (opponent enters isGrabbed), (2) at
// release the opponent is teleported a long distance, (3) NO damage is dealt (position-manipulation only),
// and — as a guard on the shared pipeline — (4) a NORMAL grab (Madara) still deals its throw damage.
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
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_s6_${name}.png`) }); }
async function reset(gap = 58) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── KAMUI TELEPORT GRAB — connect → warp → no damage ──
section("Kamui Teleport Grab (grab button)");
await reset(58);
const b0 = await p2();
const bx0 = b0.x, bhp0 = b0.health;
// press the grab button (O)
await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
// (1) the opponent enters the grab state
let grabbed = false;
for (let i = 0; i < 12; i++) { await waitFrames(1); if ((await p2()).isGrabbed) { grabbed = true; break; } }
check("grab CONNECTS (opponent → isGrabbed)", grabbed, `isGrabbed=${(await p2()).isGrabbed}`);
await shot("grab_connect");
const bhpDuring = (await p2()).health;
// (2)+(3) hold through the grab (~28f) → warp at release, no damage
for (let i = 0; i < 40; i++) { await waitFrames(1); const b = await p2(); if (!b.isGrabbed && Math.abs(b.x - bx0) > 50) break; }
const bEnd = await p2();
const warp = Math.abs(bEnd.x - bx0);
check("opponent WARPED a long distance on release", warp > 300, `Δx=${Math.round(warp)}px  (from ${Math.round(bx0)} → ${Math.round(bEnd.x)})`);
check("NO throw-damage dealt (position-manipulation only)", bEnd.health === bhp0, `hp ${bhp0} → ${bEnd.health}`);
check("… (grab itself dealt no chip either)", bhpDuring === bhp0, `hpDuringGrab=${bhpDuring}`);
// let the opponent land and confirm the displacement persisted
for (let i = 0; i < 30; i++) { await waitFrames(1); if ((await p2()).grounded) break; }
await shot("grab_teleported");
const bLand = await p2();
check("displacement persists after landing (full-screen reset)", Math.abs(bLand.x - bx0) > 250, `final Δx=${Math.round(Math.abs(bLand.x - bx0))}px`);
// NOTE: that the NON-Obito grab pipeline still deals its normal throw-damage (i.e. the _grabTeleport
// payload is a stamp-and-clear override that doesn't leak) is covered by test:susanoo + test:madara,
// which exercise the flat-90 / _grabThrowDmg throws directly. Run those as the pipeline regression.

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_s6_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
