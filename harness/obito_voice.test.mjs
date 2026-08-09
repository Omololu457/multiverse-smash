// harness/obito_voice.test.mjs — Obito voice wiring (audio-only, JA).
// (1) every pooled clip exists on disk + pools randomize + no double-pooling.
// (2) live triggers fire the right pool via a playSfxFile spy: Kamui intangibility activation, Kamui warp
//     (self-portal), a ranged special throw, the Juubi ultimate, and a real combat exchange (hit/offense).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const pool = name => page.evaluate(p => window.__harness.obitoVoicePool(p), name);
const spyLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /^obito_voice_/.test(f)));
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 15000, polling: 16 }); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }

const POOLS = ["kamuiActivate","kamuiWarp","special","juubi","intro","taunt","combatBark","hitReact","lowHealth","win"];

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await installSpy();

// ── (1) pools: on-disk + randomization + no double-pooling ──
console.log("POOLS:");
let total = 0; const seen = {}; let dupe = null;
for (const p of POOLS) {
  const arr = await pool(p);
  const onDisk = arr.every(c => fs.existsSync(path.join(ROOT, c)));
  const samples = await page.evaluate(pp => window.__harness.obitoVoicePick(pp, 300), p);
  const valid = samples.every(s => arr.includes(s));
  const rand = arr.length === 1 ? true : new Set(samples).size > 1;
  arr.forEach(c => { if (seen[c]) dupe = c; seen[c] = true; });
  total += arr.length;
  ok(onDisk && valid && rand && arr.length > 0, `${p} (${arr.length}) — on-disk + valid + ${arr.length===1?"single":"randomizes"}`);
}
ok(total === 65, `65 clips across 10 pools (total=${total})`);
ok(!dupe, `no clip double-pooled${dupe?" ("+dupe+")":""}`);

// ── (2) live triggers via the spy ──
console.log("\nLIVE TRIGGERS:");
await page.mouse.click(20, 20);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
async function fromPool(poolName) { const arr = await pool(poolName); const log = await spyLog(); return log.some(c => arr.includes(c)); }

// Kamui INTANGIBILITY activation (dedicated pool, per spec)
await page.evaluate(() => { window.__harness.fillEnergy?.(); });
await clearSpy();
await page.evaluate(() => window.__harness.obitoKamuiToggle());
await waitFrames(3);
ok(await fromPool("kamuiActivate"), "Kamui intangibility activation → kamuiActivate clip");
await page.evaluate(() => window.__harness.obitoKamuiToggle());   // toggle back off (silent — must NOT log)
await waitFrames(3);

// Kamui WARP (self-portal, Down+Special)
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); });
await clearSpy(); await page.evaluate(() => window.__harness.p1SpecialDir("D")); await waitFrames(3);
ok(await fromPool("kamuiWarp"), "Kamui self-portal (Down+Special) → kamuiWarp clip");

// SPECIAL throw (neutral shuriken)
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); });
await page.waitForFunction(() => window.__harness.p1().grounded && (window.__harness.p1().attackCooldown||0)<=0, null, {timeout:4000}).catch(()=>{});
await clearSpy(); await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(3);
ok(await fromPool("special"), "shuriken throw (neutral Special) → special clip");

// JUUBI ultimate
await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.fillEnergy?.(); const a=window.__harness.p1(); window.__harness.setP2X(a.x+200); });
await page.waitForFunction(() => { const p=window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown||0)<=0; }, null, {timeout:4000}).catch(()=>{});
await clearSpy(); await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u"); await waitFrames(4);
ok(await fromPool("juubi"), "Juubi ultimate → juubi clip");
await page.waitForFunction(() => !window.__harness.obitoJuubiUltCine().active, null, {timeout:6000}).catch(()=>{});

// Real combat exchange → hit-react (on the defender) and/or offense bark
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); const a=window.__harness.p1(); window.__harness.setP2X(a.x+52); window.__harness.setP2Invuln?.(0); });
await waitFrames(3); await clearSpy();
for (let i=0;i<4;i++){ await page.keyboard.down("k"); await sleep(80); await page.keyboard.up("k"); await waitFrames(20); if ((await spyLog()).length) break; }
const hit = await pool("hitReact"); const bark = await pool("combatBark");
const log = await spyLog();
ok(log.some(c => hit.includes(c) || bark.includes(c)), `combat exchange → hitReact/combatBark clip (logged ${log.length})`);

console.log(`\nRESULT ${pass} pass / ${fail} fail`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
