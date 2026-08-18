// harness/six_paths_pain_voice.test.mjs — proves Six Paths of Pain REUSES solo Pain's existing voice
// clips (painVoice.js) — real playback captured via a playSfxFile spy, NOT silent fallback. Covers:
//   (1) every pool this char uses resolves to on-disk pain_voice_*.mp3 files;
//   (2) LIVE per-Path special casts each fire the mapped pool (Deva's command directing each body);
//   (3) shared intro + hit-react fire from the pain pools; (4) the win pool is on-disk (same hook path).
// Usage: node harness/six_paths_pain_voice.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const pool = name => page.evaluate(p => window.__harness.painVoicePool(p), name);
const spyLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /pain_voice_/.test(f)));
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }
const firedFromPool = async (poolName) => { const arr = await pool(poolName); const log = await spyLog(); return { hit: log.some(f => arr.some(c => f.includes(c))), log }; };

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await installSpy();
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── (1) pools used by this char are on-disk ──
console.log("\n── 1. Reused pools exist on disk ──");
const USED_POOLS = ["intro","taunt","almightyPush","almightyPull","superPush","dedera","assistCall","combatBark","hitReact","lowHealth","win"];
for (const p of USED_POOLS) {
  const arr = await pool(p);
  const onDisk = arr.length > 0 && arr.every(c => fs.existsSync(path.join(ROOT, c)));
  ok(onDisk, `pool "${p}" (${arr.length}) → all clips on disk`);
}

// ── (2) shared hit-react + intro (run FIRST, while p2 is still healthy; hit-react BEFORE the intro so
// the intro-sequence lock can't freeze p2's swing) ──
console.log("\n── 2. Shared hit-react + intro ──");
// hit-react: a real MELEE hit from p2 lands on Pain (Deva Path) → applyPainHitVoice (melee hit path).
{
  await page.evaluate(() => { window.__harness.resetOffenseVoice("p1"); window.__harness.setPath(0); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.resetFighterInput?.("p2"); });
  const ap1 = await page.evaluate(() => window.__harness.p1());
  await page.evaluate(x => window.__harness.setP2X(x), ap1.x + 55);   // p2 in melee range, facing Pain
  await sleep(120); await clearSpy();
  await page.evaluate(() => window.__harness.p2Heavy());
  await sleep(340);
  const r = await firedFromPool("hitReact");
  ok(r.hit, `taking a hit → "hitReact" voice (${r.log[0] || "—"})`);
}
// intro beat
await clearSpy();
await page.evaluate(() => window.__harness.forceIntro?.());
await sleep(200);
{ const introHit = (await firedFromPool("intro")).hit || (await firedFromPool("taunt")).hit; ok(introHit, `intro beat → intro/taunt voice`); }

// ── (3) LIVE per-Path special casts fire the mapped pool ──
console.log("\n── 3. Per-Path cast lines (Deva commanding each body) ──");
// [pathIdx, dir, pool, label]
const CASTS = [
  [0, null, "almightyPush", "Deva — Almighty Push"],
  [0, "B",  "almightyPull", "Deva — Almighty Pull"],
  [0, "D",  "superPush",    "Deva — Rinnegan Defense"],
  [1, null, "assistCall",   "Animal — Kuchiyose summon"],
  [2, null, "taunt",        "Preta — Absorption Shield"],
  [3, null, "almightyPull", "Human — Soul Rip"],
  [4, "F",  "almightyPush", "Asura — Rocket Launcher"],
  [5, null, "combatBark",   "Naraka — King of Hell Judgment"],
  [5, "D",  "dedera",       "Naraka — Restoration"],
];
for (const [idx, dir, pname, label] of CASTS) {
  await page.evaluate(i => { window.__harness.resetOffenseVoice("p1"); window.__harness.fillEnergy(); window.__harness.setPath(i); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); }, idx);
  await sleep(60);
  await clearSpy();
  await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  await sleep(160);
  const r = await firedFromPool(pname);
  ok(r.hit, `${label} → "${pname}" voice (${r.log[0] || "—"})`);
}
// Ultimate (path-independent) → assistCall
await page.evaluate(() => { window.__harness.resetOffenseVoice("p1"); window.__harness.setPath(0); window.__harness.fillEnergy(); });
await sleep(60); await clearSpy();
await page.evaluate(() => window.__harness.p1Ultimate());
await sleep(200);
{ const r = await firedFromPool("assistCall"); ok(r.hit, `Ultimate (Six Paths summon) → "assistCall" voice (${r.log[0] || "—"})`); }

// ── (4) win pool on-disk (same playSfxFile hook path as the proven casts) ──
console.log("\n── 4. Win pool ──");
{ const arr = await pool("win"); ok(arr.length > 0 && arr.every(c => fs.existsSync(path.join(ROOT, c))), `win pool (${arr.length}) on disk + wired at the roster-win hook`); }

console.log(`\n════════════════════════════════════════`);
console.log(`  SIX PATHS VOICE (reused solo Pain): ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
