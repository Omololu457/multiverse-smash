// harness/minato_shadow_clone_routes.test.mjs — MINATO SHADOW CLONE, the ordered side-by-side against
// Naruto's working routes + the specific reported bug (clone does nothing right after a Flying Raijin blink).
//
// This is EVIDENCE-GATHERING, not a fix attempt: it exercises every Minato clone route live and, for each,
// runs the SAME route on Naruto as the working reference. The 5 shared route TYPES:
//   1. SPAWN        Naruto D→F   | Minato D→F
//   2. DISPEL       Naruto D→B   | Minato D→B
//   3. CLONE RUSH   Naruto F→F   | Minato B→F   (Minato's F→F is his blink, so his rush is B→F)
//   4. PINCER/COMBO Naruto B→U   | Minato B→U   (≥2 clones)
//   5. MOTION CLONE Naruto 2×QCF | Minato 2×QCB (motion-input elevated route)
// PLUS the reported bug, Minato-only: Flying-Raijin blink (F,F) → clone (D→F) at several inter-input delays.
//
// P1 faces right: forward='d', back='a', down='s', special='l'.  Blink = double-tap 'd'.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let PASS = 0, FAIL = 0;
const check = (name, cond, info="") => { if (cond) { PASS++; console.log(`  ✅ ${name}${info?"  — "+info:""}`); } else { FAIL++; console.log(`  ❌ ${name}${info?"  — "+info:""}`); } };

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const cloneCount = () => page.evaluate(() => window.__harness.p1CloneCount());
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold=2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const dirs = seq.slice(0,-1), last = seq[seq.length-1]; for (const k of dirs) await page.keyboard.press(k); await tap(last); }

async function boot(who) {
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(()=>{});
  await waitFrames(30);
}
async function prep(gap = 120) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(()=>{});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); window.__harness.clearP1FrMarks?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

// ── Run the 5 shared route types for one character ──────────────────────────
async function runRoutes(who, isMinato) {
  console.log(`\n═══════════ ${who.toUpperCase()} — clone routes ═══════════`);
  await boot(who);

  // 1. SPAWN — STANDARDIZED "," key (was D→F, removed 2026-08-12)
  await prep(120);
  check(`${who}: 1) SPAWN (",") — start 0 clones`, (await cloneCount()) === 0, `count=${await cloneCount()}`);
  await page.keyboard.press(",");
  const spawned = await page.waitForFunction(() => window.__harness.p1CloneCount() >= 1, null, { timeout: 4000, polling: 16 }).then(()=>true).catch(()=>false);
  check(`${who}: 1) SPAWN produced a clone`, spawned, `count=${await cloneCount()}`);

  // 2. DISPEL — STANDARDIZED "." key (was D→B, removed 2026-08-12)
  await prep(120);
  await page.evaluate(() => window.__harness.spawnP1Clones(2)); await waitFrames(4);
  const dBefore = await cloneCount();
  await page.keyboard.press(".");
  await waitFrames(8);
  check(`${who}: 2) DISPEL (".") recalled all clones`, dBefore >= 1 && (await cloneCount()) === 0, `count ${dBefore} → ${await cloneCount()}`);

  // 3. CLONE RUSH — Naruto F→F / Minato B→F, with ≥1 clone → autonomous rushers
  await prep(200);
  await page.evaluate(() => window.__harness.spawnP1Clones(2)); await waitFrames(6);
  const rBefore = await cloneCount();
  if (isMinato) { await tap("a",1); await tap("d",1); await tap("l"); }      // B→F
  else          { await tap("d",1); await tap("d",1); await tap("l"); }      // F→F
  await waitFrames(10);
  const rushers = (await projNames()).filter(n => /Rush|rush/.test(n)).length;
  check(`${who}: 3) CLONE RUSH consumed clones into rushers`, (await cloneCount()) < rBefore || rushers > 0, `clones ${rBefore}→${await cloneCount()}, rushers=${rushers}`);

  // 4. PINCER / COMBO — B→U with ≥2 clones
  await prep(120);
  await page.evaluate(() => window.__harness.spawnP1Clones(2)); await waitFrames(6);
  const pBefore = await cloneCount();
  await tap("s",0); // ensure clean
  await tap("a",1); await tap("w",1); await tap("l");                         // B→U (up='w')
  await waitFrames(10);
  check(`${who}: 4) PINCER/COMBO (B→U, ≥2 clones) consumed clones`, pBefore >= 2 && (await cloneCount()) < pBefore, `clones ${pBefore}→${await cloneCount()}`);

  // 5. MOTION CLONE — Naruto double-QCF (barrage) / Minato double-QCB (shuriken-hidden clone). Neither
  // route CONSUMES clones (barrage = guaranteed-hit swarm; shuriken = its own spawn) — the correct
  // observable is that the motion fired: it SPENT chakra + played the cast pose. Settle the motion buffer
  // (>1s window) first so a fresh 4-token motion reads clean.
  await prep(160);
  await waitFrames(65);                                                       // age out any prior motion tokens
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.spawnP1Clones(3); }); await waitFrames(6);
  const eBefore = (await p1()).energy;
  if (isMinato) await motion(["s","a","s","a","l"]);                          // 2×QCB → Shuriken-Hidden Clone
  else          await motion(["s","d","s","d","l"]);                          // 2×QCF → Uzumaki Barrage
  await waitFrames(6);
  const eAfter = (await p1()).energy;
  const cast = String((await p1()).action || "").toLowerCase();
  check(`${who}: 5) MOTION CLONE fired (spent chakra / cast played)`, eAfter < eBefore || /rasengan|clone|shuriken/.test(cast), `Δenergy=${(eBefore-eAfter).toFixed(0)} action=${cast}`);
}

await runRoutes("naruto", false);
await runRoutes("minato", true);

// ── THE REPORTED BUG (Minato only): Flying-Raijin blink (F,F) then clone (D→F) right after. ──
// Test at several inter-input delays — the collision was timing-sensitive (shared teleport attackCooldown).
console.log(`\n═══════════ MINATO — reported bug: blink → clone at varying delays ═══════════`);
await boot("minato");
for (const delay of [0, 2, 4, 6, 10]) {
  await prep(300);   // room in front so the F→F blink-behind has space
  await page.evaluate(() => window.__harness.dispelP1Clones?.());
  await waitFrames(4);
  await tap("d",2); await tap("d",2);                 // Flying-Raijin blink (double-tap Forward)
  // (clone create is now the standardized "," key, not D→F)
  if (delay > 0) await waitFrames(delay);
  await page.keyboard.press(",");                     // clone create (standardized) immediately after the blink
  const ok = await page.waitForFunction(() => window.__harness.p1CloneCount() >= 1, null, { timeout: 2500, polling: 16 }).then(()=>true).catch(()=>false);
  check(`blink → clone after ${delay}f delay produces a clone (bug = 0)`, ok, `count=${await cloneCount()}`);
  if (delay === 4) { await waitFrames(30); await page.screenshot({ path: path.join(ROOT, "harness", "shots", "minato_blink_then_clone_renders.png") }); }
}

check("no JS page errors across the whole run", errors.length === 0, errors.slice(0,2).join(" | "));
console.log(`\n${FAIL === 0 ? "✅" : "❌"} Minato shadow-clone routes + blink collision: ${PASS} passed, ${FAIL} failed`);
if (errors.length) console.log("PAGE ERRORS:\n" + errors.join("\n"));
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
