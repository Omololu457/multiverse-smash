// harness/hashirama_wood_clone.test.mjs — HASHIRAMA WOOD CLONE (real special, shadow-clone family).
//
// Proves the rebuilt Wood Clone (double-QCF) uses the SHARED clone architecture end-to-end:
//   spawn (motion-triggered) → caster gesture → clone body = Hashirama standing (not the cast art) →
//   acts INDEPENDENTLY (approaches the opponent, per-slot stagger) → on hit reveals + REVERTS TO LOGS
//   (wood_clone_release FX) → dispel (double-QCB) recalls all → wood-release FX fires on despawn too.
//
// P1 faces right: forward='d', back='a', down='s', special='l'.  Same driving pattern as minato_motion.
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
let PASS = 0, FAIL = 0;
const check = (name, cond, info="") => { if (cond) { PASS++; console.log(`  ✅ ${name}${info?"  — "+info:""}`); } else { FAIL++; console.log(`  ❌ ${name}${info?"  — "+info:""}`); } };

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const cloneCount = () => page.evaluate(() => window.__harness.p1CloneCount());
const cloneStates = () => page.evaluate(() => window.__harness.p1CloneStates());
const cloneSheets = () => page.evaluate(() => window.__harness.summons().filter(s => s.id === "shadowClone").map(s => s.sheet));
const woodFx = () => page.evaluate(() => window.__harness.woodReleaseFxCount());
const motionHist = () => page.evaluate(() => window.__harness.p1MotionHistory());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold=2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const dirs = seq.slice(0,-1), last = seq[seq.length-1]; for (const k of dirs) await page.keyboard.press(k); await tap(last); }

await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(()=>{});
await waitFrames(30);

async function prep(gap = 240) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(()=>{});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

console.log("\n── A. Wood Clone SPAWN (standardized ',' key) ──");
await prep(240);
check("start: 0 clones", (await cloneCount()) === 0, `count=${await cloneCount()}`);
await page.keyboard.press(",");                  // STANDARD: "," creates a clone
await waitFrames(2);                             // let the sprite handler resolve the cast action
const castAction = String((await p1()).action || "").toLowerCase();   // resolved sprite action (_lastSpriteAction)
const spawned = await page.waitForFunction(() => window.__harness.p1CloneCount() >= 1, null, { timeout: 4000, polling: 16 }).then(()=>true).catch(()=>false);
check("a wood clone spawned via ','", spawned, `count=${await cloneCount()}`);
check("CASTER (Hashirama) still plays the woodCloneCast gesture (moved into summonShadowClone)", castAction === "woodclonecast", `action=${castAction}`);
await waitFrames(30);
{
  const sheets = await cloneSheets();
  check("CLONE BODY = Hashirama idle (a standing decoy, NOT the cast art)",
    sheets.length >= 1 && sheets.every(s => /hashirama_idle_uniform/.test(s || "")) && sheets.every(s => !/wood_clone_intro/.test(s || "")),
    `sheets=${JSON.stringify(sheets)}`);
  await page.screenshot({ path: path.join(OUT, "hashirama_wood_clone_spawned.png") });
}

console.log("\n── B. Wood Clone acts INDEPENDENTLY (approach-and-hold) ──");
{
  const before = (await cloneStates()).map(c => c.x);
  await waitFrames(70);                          // let the clone walk toward the opponent
  const after = (await cloneStates()).map(c => c.x);
  const moved = before.length && after.length && Math.abs(after[0] - before[0]) > 12;
  check("clone moved on its own toward the opponent", moved, `x ${before[0]?.toFixed?.(0)} → ${after[0]?.toFixed?.(0)}`);
  const states = await cloneStates();
  check("clone is a live standing decoy (idle state, visible)", states.some(c => c.state === "idle" && !c.hidden), `states=${JSON.stringify(states)}`);
}

console.log("\n── C. Multiple clones (cap-limited, per-slot stagger) ──");
await page.keyboard.press(",");
await waitFrames(6);
await page.keyboard.press(",");
await waitFrames(20);
{
  const n = await cloneCount();
  check("a second/third wood clone spawned (>1 co-exist)", n >= 2, `count=${n}`);
  const xs = (await cloneStates()).map(c => c.x);
  check("clones are staggered, not stacked", new Set(xs.map(x => Math.round(x/20))).size === xs.length, `xs=${JSON.stringify(xs)}`);
}

console.log("\n── D. DESPAWN on HIT → reverts to LOGS (wood_clone_release FX) ──");
await prep(120);
await page.evaluate(() => window.__harness.spawnP1Clones(2));
await waitFrames(80);                              // clones walk into P2's range
{
  const fxBefore = await woodFx();
  const cBefore = await cloneCount();
  await page.evaluate(() => window.__harness.p2Attack?.());   // P2 strikes the nearest wood clone
  await waitFrames(36);
  const cAfter = await cloneCount();
  const fxAfter = await woodFx();
  check("a wood clone was destroyed by the melee hit", cAfter < cBefore, `count ${cBefore} → ${cAfter}`);
  check("despawn spawned the wood-release (revert-to-logs) FX", fxAfter > fxBefore, `woodFx ${fxBefore} → ${fxAfter}`);
  await page.screenshot({ path: path.join(OUT, "hashirama_wood_clone_release.png") });
}

console.log("\n── E. DISPEL recall (standardized '.' key) ──");
await page.evaluate(() => window.__harness.fillEnergy?.());
await page.evaluate(() => window.__harness.spawnP1Clones(2));
await waitFrames(6);
{
  const cBefore = await cloneCount();
  const fxBefore = await woodFx();
  await page.keyboard.press(".");                // STANDARD: "." disperses all clones
  await waitFrames(10);
  const cAfter = await cloneCount();
  const fxAfter = await woodFx();
  check("dispel recalled all wood clones", cBefore >= 1 && cAfter === 0, `count ${cBefore} → ${cAfter}`);
  check("dispel also reverted them to logs (wood-release FX)", fxAfter > fxBefore, `woodFx ${fxBefore} → ${fxAfter}`);
}

check("no JS page errors across the whole run", errors.length === 0, errors.slice(0,2).join(" | "));
console.log(`\n${FAIL === 0 ? "✅" : "❌"} Hashirama Wood Clone: ${PASS} passed, ${FAIL} failed`);
if (errors.length) console.log("PAGE ERRORS:\n" + errors.join("\n"));
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
