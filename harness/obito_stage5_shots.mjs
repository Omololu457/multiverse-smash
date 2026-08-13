// harness/obito_stage5_shots.mjs — STAGE 5 evidence for Obito's Kamui mobility.
//   5a. SPEED-TIER TELEPORT-BLUR — Obito is added to the qualifying list BY FEAT (Kamui), so despite a
//       base speed of 96 (< Toji's 98 stat gate) a double-tap TOWARD the foe blinks him behind + spins
//       (_speedBlur). Proves the feat allowlist works (a sub-98 char getting the teleport).
//   5b. KAMUI SELF-PORTAL — Down+Special reuses Rick's reposition architecture (self-targeted, no damage):
//       opens a Kamui portal and warps Obito a long distance across the map, spawning the portal FX.
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
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_s5_${name}.png`) }); }
async function reset(gap = 200) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 5a. SPEED-TIER TELEPORT-BLUR (by feat, despite speed 96 < 98) ──
section("5a. Speed-tier teleport-blur — qualifies by FEAT (Kamui), not raw speed");
await reset(220);
let a0 = await p1(), b = await p2();
check("Obito base speed is 96 (BELOW Toji's 98 stat gate)", a0.baseSpeed === 96, `baseSpeed=${a0.baseSpeed}`);
const x0 = a0.x;
// double-tap toward the opponent (d), catch the teleport window (~16 frames)
await page.keyboard.down("d"); await sleep(26); await page.keyboard.up("d"); await sleep(30);
await page.keyboard.down("d"); await sleep(26); await page.keyboard.up("d");
let flash = 0, moved = 0, sawDash = false;
for (let i = 0; i < 16; i++) { const p = await p1(); flash = Math.max(flash, p.teleportFlash); moved = Math.max(moved, Math.abs(p.x - x0)); if (p.castMove === "dash" || p.action === "dash") sawDash = true; if (flash > 0 && sawDash) { await shot("5a_teleport_dash"); break; } await waitFrames(1); }
check("double-tap toward → teleport-dash fires (own dash sprite)", sawDash, `sawDash=${sawDash}`);
check("… with the teleport flash cue", flash > 0, `teleportFlash=${flash}`);
const aEnd = await p1();
check("… and BLINKED (repositioned across a large gap)", Math.abs(aEnd.x - x0) > 120, `Δx=${Math.round(aEnd.x - x0)}`);

// ── 5b. KAMUI SELF-PORTAL (Down+Special — reuses Rick's reposition, self, no damage) ──
section("5b. Kamui self-portal — jumps himself across the map");
await reset(160);
const before = await p1();
const px0 = before.x;
const info = await page.evaluate(() => window.__harness.p1SpecialDir("D"));   // Down+Special = Kamui Warp
check("Down+Special → Kamui blink pose (obitoTeleport)", (info?.cast || "") === "obitoTeleport", `cast=${info?.cast}`);
await waitFrames(2);
let portalFx = null; for (let i = 0; i < 8; i++) { const ps = await projs(); portalFx = ps.find(p => (p.name === "kamuiPortal") || (p.sheet || "").includes("obito_portalfx")); if (portalFx) break; await waitFrames(1); }
check("Kamui portal FX spawned", !!portalFx, portalFx ? `name=${portalFx.name} sheet=${(portalFx.sheet||"").split("/").pop()}` : "none");
await shot("5b_portal_warp");
// let him settle after the drop-in and measure the traversal
for (let i = 0; i < 30; i++) { await waitFrames(1); const p = await p1(); if (p.grounded) break; }
const after = await p1();
const warped = Math.abs(after.x - px0);
check("Obito WARPED a long distance across the map", warped > 300, `Δx=${Math.round(warped)}px`);
check("… and landed back on the ground (self-mobility, survived — no self-damage)", after.grounded && after.health === before.health, `grounded=${after.grounded} hp=${after.health}/${before.health}`);
await shot("5b_after_warp");

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_s5_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
