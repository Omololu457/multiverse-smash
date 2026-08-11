// harness/pain_voice.test.mjs — Pain voice wiring (audio-only, JA).
// (1) every pooled clip exists on disk + pools randomize + no double-pooling.
// (2) live triggers fire the right pool via a playSfxFile spy: per-technique casts (almightyPush /
//     almightyPull / superPush / dedera / chibaku) + assist call + intro.
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
const pool = name => page.evaluate(p => window.__harness.painVoicePool(p), name);
const spyLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /^\.?\/?pain_voice_/.test(f)));
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }

const POOLS = ["almightyPush","almightyPull","superPush","dedera","chibaku","assistCall","intro","taunt","combatBark","hitReact","lowHealth","win"];

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=pain`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await installSpy();

// ── (1) pools: on-disk + randomization + no double-pooling ──
console.log("POOLS:");
let total = 0; const seen = {}; let dupe = null;
for (const p of POOLS) {
  const arr = await pool(p);
  const onDisk = arr.every(c => fs.existsSync(path.join(ROOT, c)));
  const samples = await page.evaluate(pp => window.__harness.painVoicePick(pp, 300), p);
  const uniq = new Set(samples);
  const valid = samples.every(s => arr.includes(s));
  const rand = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
  arr.forEach(c => { if (seen[c]) dupe = c; seen[c] = true; });
  total += arr.length;
  ok(onDisk && valid && rand && arr.length > 0, `${p} (${arr.length}) — on-disk + valid + ${arr.length===1?"single":"randomizes"}`);
}
ok(!dupe, `no clip double-pooled${dupe?" ("+dupe+")":""}`);
console.log(`  (total wired-in-pools = ${total})`);

// ── (2) live cast triggers via the spy ──
console.log("\nLIVE CASTS (real input → playSfxFile spy):");
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const facingRight = await page.evaluate(() => (window.__harness.p1().facing || 1) === 1);
const FWD = facingRight ? "d" : "a", AWAY = facingRight ? "a" : "d";
// The cast-voice anti-overlap gate (_atkVoiceCd, 150f ≈ 2.5s) is shared across casts and can't be reset
// via the read-only p1() proxy, so wait it out before each cast test so the next callout isn't swallowed.
const prep = async () => { await sleep(2700); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); }); await sleep(70); };
const firedFromPool = async (poolName) => { const arr = await pool(poolName); const log = await spyLog(); return log.some(f => arr.some(c => f.includes(c))); };

// neutral push
await prep(); await clearSpy();
await page.keyboard.down("l"); await sleep(90); await page.keyboard.up("l"); await sleep(200);
ok(await firedFromPool("almightyPush"), `neutral Special → almightyPush voice`);
// Back = pull
await prep(); await clearSpy();
await page.keyboard.down(AWAY); await sleep(60); await page.keyboard.down("l"); await sleep(90); await page.keyboard.up("l"); await page.keyboard.up(AWAY); await sleep(200);
ok(await firedFromPool("almightyPull"), `Back+Special → almightyPull voice (Bansho Ten'in)`);
// Down = super push
await prep(); await clearSpy();
await page.keyboard.down("s"); await sleep(60); await page.keyboard.down("l"); await sleep(90); await page.keyboard.up("l"); await page.keyboard.up("s"); await sleep(200);
ok(await firedFromPool("superPush"), `Down+Special → superPush voice`);
// Fwd = dedera
await prep(); await clearSpy();
await page.keyboard.down(FWD); await sleep(60); await page.keyboard.down("l"); await sleep(90); await page.keyboard.up("l"); await page.keyboard.up(FWD); await sleep(200);
ok(await firedFromPool("dedera"), `Fwd+Special → dedera voice`);
// Charge+↑ = assist
await prep(); await clearSpy();
await page.keyboard.down("p"); await sleep(60); await page.keyboard.down("w"); await sleep(70); await page.keyboard.up("w"); await page.keyboard.up("p"); await sleep(250);
ok(await firedFromPool("assistCall"), `Charge+↑ (assist) → assistCall voice`);
// Ultimate = chibaku
await prep(); await clearSpy();
await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u"); await sleep(300);
ok(await firedFromPool("chibaku"), `Ultimate → chibaku voice (Chibaku Tensei)`);

console.log(`\n════════════════════════════════════════`);
console.log(`  PAIN VOICE: ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
