// harness/toji_stage6_shots.mjs — STAGE 6 evidence: the two-stage comeback state machine.
// Runs a REAL vs-match (checkRoundEnd fully processes KO) and drives Toji's HP to zero THREE times:
//   1st zero-HP → SAVE 1: HP restored to ~25%, NO transformation, match continues.
//   2nd zero-HP → SAVE 2: Reincarnated Form (buff + crimson tint) + HP restored to ~40%, match continues.
//   3rd zero-HP → both saves spent → NORMAL KO, round ends (match resolves as usual).
// Also verifies the manual Super/X entry into Reincarnated Form (independent of the auto-trigger).
// Usage: node harness/toji_stage6_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const CB = () => page.evaluate(() => window.__harness.tojiComeback());
const FLOW = () => page.evaluate(() => window.__harness.matchFlow());
const STATE = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
// drive p1 HP to exactly 0 and let the frame's applyTojiComeback run
async function killP1() { await page.evaluate(() => window.__harness.setP1HealthRaw(0)); await waitFrames(2); }

async function bootVs() {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await sleep(300);
  // push the AI far away so it can't interfere with the scripted HP drops
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 600); });
  await waitFrames(2);
}

console.log("STAGE 6 — Toji two-stage comeback (real vs-match)\n");

await bootVs();
let st = await CB();
ok(st.savesUsed === 0 && !st.reincarnated, `fresh match: 0 saves used, base form (savesUsed=${st.savesUsed})`);

// ── 1st ZERO-HP → SAVE 1 (25%, no transform) ──
await killP1();
st = await CB();
ok(st.savesUsed === 1, `SAVE 1 triggers on 1st zero-HP (savesUsed=${st.savesUsed})`);
ok(st.hpPct >= 20 && st.hpPct <= 30, `SAVE 1 restores to ~25% HP (${st.hpPct}%)`);
ok(!st.reincarnated && st.dmgMult === 1, `SAVE 1 does NOT transform (reincarnated=${st.reincarnated}, dmgMult=${st.dmgMult})`);
ok((await FLOW()).gameState === "BATTLE" || (await STATE()).frame > 0, `match CONTINUES after SAVE 1 (not KO'd)`);
await page.screenshot({ path: path.join(OUT, "toji_s6_save1.png") });

// ── 2nd ZERO-HP → SAVE 2 (Reincarnated Form + 40%) ──
await killP1();
st = await CB();
ok(st.savesUsed === 2, `SAVE 2 triggers on 2nd zero-HP (savesUsed=${st.savesUsed})`);
ok(st.reincarnated && st.form === "reincarnated", `SAVE 2 enters Reincarnated Form (form=${st.form})`);
ok(Math.abs(st.dmgMult - 1.25) < 0.01, `Reincarnated Form applies the damage buff (dmgMult=${st.dmgMult})`);
ok(st.hpPct >= 35 && st.hpPct <= 45, `SAVE 2 restores to ~40% HP (${st.hpPct}%)`);
await waitFrames(3);
await page.screenshot({ path: path.join(OUT, "toji_s6_save2_reincarnated.png") });

// ── 3rd ZERO-HP → NORMAL KO (round ends) ──
// pre-set round wins so this KO ends the MATCH (best-of-3 → give p2 one win already)
await page.evaluate(() => window.__harness.setRoundWins(0, 1));
const flowBefore = await FLOW();
await killP1();
await waitFrames(4);
st = await CB();
const flowAfter = await FLOW();
ok(st.savesUsed === 2, `3rd zero-HP: no 3rd save (savesUsed still ${st.savesUsed})`);
ok(st.health === 0, `3rd zero-HP: HP stays 0 — comeback exhausted, NOT restored`);
const ended = flowAfter.gameState !== "BATTLE" || flowAfter.roundWins.p2 > flowBefore.roundWins.p2;
ok(ended, `3rd zero-HP resolves a NORMAL KO (gameState ${flowBefore.gameState}→${flowAfter.gameState}, p2 wins ${flowBefore.roundWins.p2}→${flowAfter.roundWins.p2})`);
await page.screenshot({ path: path.join(OUT, "toji_s6_ko.png") });

// ── MANUAL SUPER/X → Reincarnated Form (independent of the auto-trigger) ──
await bootVs();
let m0 = await CB();
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");   // ultimate button
await waitFrames(4);
let m1 = await CB();
ok(!m0.reincarnated && m1.reincarnated, `Super/X MANUALLY enters Reincarnated Form (reincarnated ${m0.reincarnated}→${m1.reincarnated})`);
ok(m1.savesUsed === 0, `manual X does NOT consume a comeback save (savesUsed=${m1.savesUsed})`);
ok(Math.abs(m1.dmgMult - 1.25) < 0.01, `manual X applies the same buff (dmgMult=${m1.dmgMult})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
