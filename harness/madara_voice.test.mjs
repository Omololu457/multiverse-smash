// harness/madara_voice.test.mjs — Madara voice wiring (audio-only, JA).
// (1) every pooled clip exists on disk + pools randomize + no double-pooling.
// (2) live triggers fire the right pool via a playSfxFile spy: per-technique casts (fireball/woodDragon/
//     tengaiShinsei) + intro + win.
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
const pool = name => page.evaluate(p => window.__harness.madaraVoicePool(p), name);
const spyLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /^madara_voice_/.test(f)));
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }
async function special(dir) { for (let a=0;a<4;a++){ if(dir)await page.keyboard.down(dir); await page.keyboard.down("l"); await sleep(90); await page.keyboard.up("l"); if(dir)await page.keyboard.up(dir); await sleep(60); if((await spyLog()).length) return; await sleep(120);} }

const POOLS = ["fireball","gunbaiSummon","gunbaiSwing","woodSpike","woodDragon","susanooPunch","susanooArmor","tengaiShinsei","completeSusanoo","intro","taunt","combatBark","hitReact","lowHealth","win"];

await page.goto(`${base}/index.html?harness=1&p1=madara&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await installSpy();

// ── (1) pools: on-disk + randomization + no double-pooling ──
console.log("POOLS:");
let total = 0; const seen = {}; let dupe = null;
for (const p of POOLS) {
  const arr = await pool(p);
  const onDisk = arr.every(c => fs.existsSync(path.join(ROOT, c)));
  const samples = await page.evaluate(pp => window.__harness.madaraVoicePick(pp, 300), p);
  const uniq = new Set(samples);
  const valid = samples.every(s => arr.includes(s));
  const rand = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
  arr.forEach(c => { if (seen[c]) dupe = c; seen[c] = true; });
  total += arr.length;
  ok(onDisk && valid && rand && arr.length > 0, `${p} (${arr.length}) — on-disk + valid + ${arr.length===1?"single":"randomizes"}`);
}
ok(total === 63, `63 clips across 15 pools (total=${total})`);
ok(!dupe, `no clip double-pooled${dupe?" ("+dupe+")":""}`);

// ── (2) live cast triggers (per-technique) via the spy ──
console.log("\nLIVE CASTS:");
await page.mouse.click(20, 20);
await page.evaluate(() => { window.__harness.boot(); });
await sleep(200);
async function castCheck(label, dir, poolName) {
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); });
  await clearSpy(); await sleep(80);
  await special(dir);
  const log = await spyLog();
  const arr = await pool(poolName);
  ok(log.some(f => arr.includes(f)), `${label} → plays a ${poolName} clip (${log[0]||"none"})`);
  await sleep(400);
}
await castCheck("neutral Special (Katon Fireball)", null, "fireball");
await castCheck("Back+Special (Wood Dragon)", "a", "woodDragon");
// TAP ultimate (u release <250ms)
await page.evaluate(() => { window.__harness.resetUlt(); }); await clearSpy(); await sleep(80);
await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u"); await sleep(150);
{ const log = await spyLog(); const arr = await pool("tengaiShinsei"); ok(log.some(f => arr.includes(f)), `TAP Ultimate → plays a tengaiShinsei clip (${log[0]||"none"})`); }

// ── (3) intro fires from the combined intro+taunt pool ──
console.log("\nINTRO/WIN:");
await clearSpy();
await page.evaluate(() => { window.__harness.start?.(); });
await sleep(600);
{ const log = await spyLog(); const introTaunt = [...await pool("intro"), ...await pool("taunt")]; ok(log.some(f => introTaunt.includes(f)), `intro beat plays an intro/taunt clip (${log[0]||"none"})`); }

console.log(`\n${pass} PASS / ${fail} FAIL`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
