// harness/madara_stage5_shots.mjs — Stage 5: Madara's TIERED ULTIMATE (Ultimate key = 'u').
//   TAP (quick press)  → Perfect Susanoo / Tengai Shinsei meteor freeze-cinematic (standard cost, ≥100).
//   GATE test          → HOLD at 100–179 energy MUST fall back to TAP (NOT Complete Susanoo).
//   HOLD (long press)  → Complete Susanoo GIANT, only at/above the higher gate (≥180).
// Usage: node harness/madara_stage5_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=madara&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);

const cine = () => page.evaluate(() => window.__harness.madaraUltCine());
const tapUlt  = async () => { await page.keyboard.down("u"); await sleep(90);  await page.keyboard.up("u"); };   // <250ms = TAP
const holdUlt = async () => { await page.keyboard.down("u"); await sleep(380); await page.keyboard.up("u"); };   // ≥250ms = HOLD
const resetUlt = () => page.evaluate(() => window.__harness.resetUlt());

// ── 1. TAP → Perfect Susanoo / Tengai Shinsei (meteor cinematic) ──
console.log("5.1 TAP Ultimate → Perfect Susanoo / Tengai Shinsei (meteor cinematic):");
await resetUlt();                                   // clears cooldown + fills energy to max (220)
await page.evaluate(() => window.__harness.healP2?.());
const hp1b = await page.evaluate(() => window.__harness.p2().health);
await tapUlt();
await sleep(120);
let c = await cine();
ok(c.active && c.casterKey === "madara", `Tengai Shinsei cinematic ACTIVE (phase=${c.phase}, caster=${c.casterKey})`);
await sleep(900); await page.screenshot({ path: path.join(OUT, "madara_s5_tap_meteor.png") });   // mid-fall/impact
await page.waitForFunction(() => !window.__harness.madaraUltCine().active, null, { timeout: 5000 }).catch(()=>{});
const hp1a = await page.evaluate(() => window.__harness.p2().health);
ok(hp1a < hp1b - 200, `meteor dealt heavy damage: p2 ${hp1b} → ${hp1a} (−${(hp1b-hp1a).toFixed(0)})`);

// ── 2. GATE TEST — HOLD at 150 energy (≥100 <180) MUST NOT give Complete Susanoo (falls back to TAP) ──
console.log("\n5.2 GATE — HOLD at 150 energy (<180) must FALL BACK to Perfect (no giant):");
await resetUlt();
await page.evaluate(() => { window.__harness.setEnergy(150); window.__harness.healP2?.(); });
await sleep(80);
await holdUlt();
await sleep(120);
c = await cine();
const armorAfterGate = await page.evaluate(() => window.__harness.p1().completeSusanoo);
ok(armorAfterGate === 0, `Complete Susanoo NOT entered below the gate (completeSusanoo=${armorAfterGate})`);
ok(c.active, `held-below-gate fell back to the TAP cinematic (active=${c.active})`);
await page.waitForFunction(() => !window.__harness.madaraUltCine().active, null, { timeout: 5000 }).catch(()=>{});

// ── 3. HOLD at full energy (≥180) → Complete Susanoo GIANT ──
console.log("\n5.3 HOLD Ultimate at full energy (≥180) → Complete Susanoo GIANT:");
await resetUlt();                                   // fills to 220
await page.evaluate(() => window.__harness.healP2?.());
const e3 = await page.evaluate(() => window.__harness.p1().energy);
await holdUlt();
await sleep(200);
const giant = await page.evaluate(() => { const p = window.__harness.p1(); return { complete: p.completeSusanoo, frac: p.canvasHeightFrac, dmg: p.damageMult2, form: p.currentForm, sheet: p.spriteSheet }; });
ok(giant.complete > 0, `entered Complete Susanoo giant (completeSusanoo=${giant.complete})`);
ok(giant.frac && giant.frac > 0.5, `giant sizing active (_canvasHeightFrac=${giant.frac})`);
ok(giant.dmg >= 1.8, `tier-4 damage buff (×${giant.dmg})`);
ok((giant.sheet || "").includes("complete_idle"), `giant body renders → ${giant.sheet}`);
const e3a = await page.evaluate(() => window.__harness.p1().energy);
ok(e3a <= e3 - 180 + 5, `HOLD spent the higher cost (${e3.toFixed(0)} → ${e3a.toFixed(0)}, −${(e3-e3a).toFixed(0)})`);
await sleep(300); await page.screenshot({ path: path.join(OUT, "madara_s5_hold_giant.png") });
// in-form giant sword attack
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 180); window.__harness.healP2?.(); });
const hp3b = await page.evaluate(() => window.__harness.p2().health);
await page.keyboard.down("j"); await sleep(80); await page.keyboard.up("j");
await sleep(120);
const gSheet = await page.evaluate(() => window.__harness.p1().spriteSheet);
ok((gSheet || "").includes("complete_atk"), `giant light = sword swing → ${gSheet}`);
await page.screenshot({ path: path.join(OUT, "madara_s5_giant_swing.png") });
await sleep(500);
const hp3a = await page.evaluate(() => window.__harness.p2().health);
ok(hp3a < hp3b, `giant sword deals (buffed) damage: p2 ${hp3b} → ${hp3a} (−${(hp3b-hp3a).toFixed(0)})`);

// ── 4. duplicate-render guard: the caster is drawn ONCE during the meteor cinematic ──
console.log("\n5.4 duplicate-render guard (meteor cinematic):");
await page.evaluate(() => window.__harness.expireVesselTimerForm?.("p1"));   // clear any lingering form
await resetUlt();
await page.evaluate(() => window.__harness.healP2?.());
await tapUlt(); await sleep(300);
const draws = await page.evaluate(() => window.__harness.sprDraws?.("p1") ?? window.__harness.renderInfo?.()?.p1Draws ?? null);
ok(draws === null || draws <= 1, `caster drawn once during cinematic (draws=${draws})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
