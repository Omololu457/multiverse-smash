// harness/hashirama_sealing_domain_shots.mjs — VISUAL EVIDENCE for the Sealing Jutsu DOMAIN redesign.
// Captures the full sequence: gates dropping on the opponent → blackout/background transition to
// sealing_box → opponent frozen while Hashirama attacks freely → cameo assists striking → domain ends
// cleanly back to normal play.  Prints the trap/overlay telemetry beside each shot.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.sealingCine());
const domain = () => page.evaluate(() => window.__harness.domainState());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 20000, polling: 16 }); }
const shot = n => page.screenshot({ path: path.join(OUT, n) });

await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(()=>{});
await waitFrames(30);
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 200); await waitFrames(2);

console.log("Activating Sealing Jutsu domain (Ultimate)…");
let active = false;
for (let attempt = 0; attempt < 4 && !active; attempt++) {
  await page.evaluate(() => window.__harness.resetUlt?.());
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  for (let f = 0; f < 16; f++) { const c = await cine(); if (c && c.active) { active = true; break; } await waitFrames(1); }
}
console.log("  overlay active:", active, " domain:", JSON.stringify(await domain()));

// 1) GATES dropping on the opponent + the blackout/background transition (early frames)
await waitFrames(4);
await shot("sealing_domain_1_gates_drop.png");
console.log("  [1] gates drop + transition   frozen=", (await p2()).domainFrozen, " phase=", (await cine())?.phase);

// 2) Domain fully established: sealing_box backdrop, opponent frozen
await waitFrames(22);
await shot("sealing_domain_2_backdrop_trap.png");
{ const op = await p2(); const me = await p1(); console.log("  [2] backdrop+trap   oppFrozen=", op.domainFrozen, " casterFrozen=", me.domainFrozen, " domain=", (await domain())?.name); }

// 3) Cameo assist striking the trapped foe (sample a strike beat)
let sawStrike = false;
for (let f = 0; f < 60 && !sawStrike; f++) {
  const s = await cine();
  if (s && s.hits >= 1) { await shot("sealing_domain_3_cameo_strike.png"); sawStrike = true; console.log("  [3] cameo strike   cameo=", s.cameo, " hits=", s.hits); }
  await waitFrames(1);
}

// 4) Hashirama attacking FREELY while the foe stays trapped
await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");   // heavy attack
await waitFrames(4);
await shot("sealing_domain_4_hashirama_attacks_freely.png");
{ const me = await p1(); const op = await p2(); console.log("  [4] caster attacks freely   casterAttacking=", me.attacking || me.attackPhase !== "idle", " oppStillFrozen=", op.domainFrozen); }

// 5) Domain ends cleanly → normal arena
await page.waitForFunction(() => { const d = window.__harness.domainState(); const s = window.__harness.sealingCine(); return !d && (!s || !s.active); }, null, { timeout: 16000, polling: 32 }).catch(()=>{});
await waitFrames(20);
await shot("sealing_domain_5_ended_normal.png");
{ const op = await p2(); console.log("  [5] domain ended   domain=", await domain(), " overlayActive=", (await cine())?.active, " oppFrozen=", op.domainFrozen); }

console.log(errors.length ? ("PAGE ERRORS: " + errors.join(" | ")) : "no page errors");
await browser.close(); server.close();
