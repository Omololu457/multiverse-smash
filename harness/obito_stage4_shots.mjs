// harness/obito_stage4_shots.mjs — STAGE 4 evidence for Obito's KAMUI INTANGIBILITY.
// Proves the full state machine with real, frame-accurate evidence:
//   1. ACTIVATION — P-TAP toggles it on: intangible+phased, a visible ghost/swirl, invulnTimer sustained
//      (the exact combat.js gate that negates ALL incoming hits).
//   2. MELEE AUTO-DROP + REACTIVATE — a melee punch drops the phase (tangible, invulnTimer decays to 0)
//      for the swing, then it AUTO-REACTIVATES once the attack completes (intangible stayed ON throughout).
//   3. SPECIAL WHILE INTANGIBLE — a shuriken fires + spawns its projectile WITHOUT dropping the phase.
//   4. MANUAL TOGGLE-OFF — a second P-TAP turns it off silently (intangible=false, phased=false).
//   5. CHAKRA→ZERO AUTO-DEACTIVATION — continuous drain ticks the chakra down; at 0 it auto-deactivates.
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
const kamui = () => page.evaluate(() => window.__harness.obitoKamui());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_s4_${name}.png`) }); }
async function resetIdle() {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  // make sure Kamui is OFF to start
  await page.evaluate(() => { const k = window.__harness.obitoKamui(); if (k?.intangible) window.__harness.obitoKamuiToggle(); });
  await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 1. ACTIVATION ──
section("1. Activation — visible effect + sustained i-frame negate");
await resetIdle();
let k0 = await kamui();
check("starts NOT intangible (silent default look)", !k0.intangible && !k0.phased, `intangible=${k0.intangible} phased=${k0.phased}`);
await page.evaluate(() => window.__harness.obitoKamuiToggle());
await waitFrames(3);
let k = await kamui();
check("toggle ON → intangible + phased", k.intangible && k.phased, `intangible=${k.intangible} phased=${k.phased}`);
check("ghost active: invulnTimer sustained > 0 (the combat.js negate gate)", k.invulnTimer > 0, `invulnTimer=${k.invulnTimer}`);
const flash = (await p1()).teleportFlash;
check("clear ON cue (activation flash fired)", flash > 0, `teleportFlash=${flash}`);
await shot("1_activation");
// sustained over time (still unhittable several frames later)
await waitFrames(20); k = await kamui();
check("phase SUSTAINS (still intangible 20f later, chakra draining)", k.intangible && k.phased && k.invulnTimer > 0, `phased=${k.phased} invuln=${k.invulnTimer} en=${k.energy}`);

// ── 2. MELEE AUTO-DROP + AUTO-REACTIVATE ──
section("2. Melee punch auto-drops the phase, then it re-activates");
await resetIdle();
await page.evaluate(() => window.__harness.obitoKamuiToggle());   // ON
await waitFrames(3);
check("intangible before the punch", (await kamui()).phased, "");
// throw a light punch and sample the phase across the swing
let sawDrop = false, sawInvulnZero = false, stayedIntangibleFlag = true, shotDrop = false;
await page.keyboard.down("j");
for (let i = 0; i < 26; i++) {
  await waitFrames(1);
  const s = await kamui();
  if (s.attacking && !s.phased) { sawDrop = true; if (s.invulnTimer === 0) sawInvulnZero = true; if (!shotDrop) { await shot("2_melee_drop"); shotDrop = true; } }
  if (!s.intangible) stayedIntangibleFlag = false;   // the TOGGLE must stay on through the whole swing
}
await page.keyboard.up("j");
await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown||0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(()=>{});
await waitFrames(3);
const kAfter = await kamui();
check("melee swing DROPPED the phase (tangible during the punch)", sawDrop, `sawDrop=${sawDrop}`);
check("… and became genuinely hittable (invulnTimer hit 0 mid-swing)", sawInvulnZero, `sawInvulnZero=${sawInvulnZero}`);
check("toggle stayed ON the whole swing (not cancelled)", stayedIntangibleFlag, "");
check("AUTO-REACTIVATED after the punch (phased again)", kAfter.intangible && kAfter.phased && kAfter.invulnTimer > 0, `intangible=${kAfter.intangible} phased=${kAfter.phased} invuln=${kAfter.invulnTimer}`);

// ── 3. SPECIAL FIRES WHILE INTANGIBLE (no phase drop) ──
section("3. A special fires successfully WHILE intangible (phase not dropped)");
await resetIdle();
await page.evaluate(() => window.__harness.obitoKamuiToggle());   // ON
await waitFrames(3);
check("intangible before the special", (await kamui()).phased, "");
await page.evaluate(() => window.__harness.p1SpecialDir(null));   // neutral shuriken
let pr = null, phasedThroughout = true;
for (let i = 0; i < 16; i++) { await waitFrames(1); const s = await kamui(); if (!s.phased) phasedThroughout = false; const ps = await projs(); if (!pr) pr = ps.find(p => (p.sheet || "").includes("obito_shur_proj_uniform")); }
check("shuriken projectile SPAWNED while intangible", !!pr, pr ? `sheet=${(pr.sheet||"").split("/").pop()}` : "none");
check("phase was NOT dropped by the special (stayed intangible)", phasedThroughout && (await kamui()).phased, `phasedThroughout=${phasedThroughout}`);
await shot("3_special_while_intangible");

// ── 4. MANUAL TOGGLE-OFF (silent) ──
section("4. Manual toggle-off — silent revert to normal");
const before = await kamui();
const off = await page.evaluate(() => window.__harness.obitoKamuiToggle());   // second tap = OFF
await waitFrames(3);
const kOff = await kamui();
check("was intangible before the 2nd tap", before.intangible, "");
check("2nd P-TAP → OFF (intangible=false, phased=false)", !kOff.intangible && !kOff.phased, `intangible=${kOff.intangible} phased=${kOff.phased}`);
await shot("4_toggled_off");

// ── 5. CHAKRA → ZERO AUTO-DEACTIVATION ──
section("5. Chakra draining to zero auto-deactivates it");
await resetIdle();
const enStart = (await kamui()).energy;
await page.evaluate(() => window.__harness.obitoKamuiToggle());   // ON at full chakra
await waitFrames(3);
const enOn = (await kamui()).energy;
// hold it on (idle) and let the continuous drain run to empty
let enMid = null, autoOff = false;
for (let i = 0; i < 60; i++) {         // up to ~360 frames
  await waitFrames(6);
  const s = await kamui();
  if (enMid === null && s.energy < enStart - 30) enMid = s.energy;   // capture a mid-drain sample
  if (!s.intangible) { autoOff = true; break; }
}
const kEnd = await kamui();
check("chakra drains continuously while active", enOn > (enMid ?? enOn), `start=${enStart} mid=${enMid}`);
check("auto-DEACTIVATED when chakra hit 0", autoOff && !kEnd.intangible && !kEnd.phased, `intangible=${kEnd.intangible} energy=${kEnd.energy}`);

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
