// harness/isshiki_voice.test.mjs — Isshiki voice wiring (audio-only, JA).
// (1) every pooled clip exists on disk + pools randomize; 31 unique clips used (34 − 3 named-opponent excluded).
// (2) live triggers fire the right pool via a playSfxFile spy: intro · 4 core special casts (Sukunahikona /
//     rods / cubes / fire) · 2 finishers · Ultimate · hit-react (light + heavy) · knockdown · win.
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
const pool = name => page.evaluate(p => window.__harness.isshikiVoicePool(p), name);
const spyLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /^isshiki_line_/.test(f)));
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }

const POOLS = ["intro","sukunahikona","rods","cubes","fire","finisher1","finisher2","ultimate","hitLight","hitHeavy","knockdown","win"];

await page.goto(`${base}/index.html?harness=1&p1=isshiki&p2=isshiki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await installSpy();

// ── (1) pools: on-disk + randomize + unique-count ──
console.log("POOLS:");
const uniqueClips = new Set();
for (const p of POOLS) {
  const arr = await pool(p);
  const onDisk = arr.every(c => fs.existsSync(path.join(ROOT, c)));
  const samples = await page.evaluate(pp => window.__harness.isshikiVoicePick(pp, 300), p);
  const valid = samples.every(s => arr.includes(s));
  const uniq = new Set(samples);
  const rand = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
  arr.forEach(c => uniqueClips.add(c));
  ok(onDisk && valid && rand && arr.length > 0, `${p} (${arr.length}) — on-disk + valid + ${arr.length===1?"single":"randomizes"}`);
}
ok(uniqueClips.size === 31, `31 unique clips wired (34 − 3 named-opponent excluded) — got ${uniqueClips.size}`);

// ── (2) live triggers via the spy ──
console.log("\nLIVE TRIGGERS:");
await page.mouse.click(20, 20);
await page.evaluate(() => { window.__harness.boot(); });
await sleep(200);

async function specialCheck(label, dir, poolName, { air = false } = {}) {
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.resetUlt?.(); });
  if (air) await page.evaluate(() => window.__harness.liftP1(50));
  await clearSpy(); await sleep(60);
  await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  await sleep(160);
  const log = await spyLog(); const arr = await pool(poolName);
  ok(log.some(f => arr.includes(f)), `${label} → plays a ${poolName} clip (${log[0]||"none"})`);
  await sleep(200);
}
await specialCheck("neutral Special — Sukunahikona", null, "sukunahikona");
await specialCheck("Fwd+Special — Daikokuten rods", "F", "rods");
await specialCheck("Down+Special — Daikokuten cubes", "D", "cubes");
await specialCheck("Up+Special — Gokashin Ensen fire", "U", "fire");
await specialCheck("Back+Special — Finisher 1 (rod barrage)", "B", "finisher1");

// Ultimate (U) — grounded; retry a few times until it fires (input timing).
await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.resetUlt?.(); });
await sleep(150);
{
  let got = false;
  for (let a = 0; a < 5 && !got; a++) {
    await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
    await clearSpy(); await sleep(60);
    await page.keyboard.down("u"); await sleep(100); await page.keyboard.up("u"); await sleep(220);
    const log = await spyLog(); const arr = await pool("ultimate"); got = log.some(f => arr.includes(f));
    if (got) { ok(true, `Ultimate → plays an ultimate clip (${log.find(f => arr.includes(f))})`); break; }
  }
  if (!got) ok(false, `Ultimate → plays an ultimate clip (none)`);
}
await sleep(300);

// airborne Special — Finisher 2 (last cast; leaves P1 airborne).
await specialCheck("airborne Special — Finisher 2 (dash-slash)", null, "finisher2", { air: true });
await page.evaluate(() => window.__harness.skipToBattle?.());
await sleep(200);

// ── HIT REACTIONS (MIRROR pattern): P1 (isshiki) connects a normal on P2 (isshiki) → the DEFENDER P2 fires
//    its isshiki hit-react. P1's light auto-combo opener (dmg 24 < 55) → hitLight; P1's heavy (dmg 90) → hitHeavy.
async function hitCheck(label, key, poolName) {
  const arr = await pool(poolName);
  let hit = null;
  for (let a = 0; a < 5 && !hit; a++) {
    await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.clearHitVoiceCd?.("p2"); window.__harness.setP2Invuln?.(0); window.__harness.resetFighterInput?.("p1"); });
    const s = await page.evaluate(() => window.__harness.p1());
    await page.evaluate(x => window.__harness.setP2X(x), s.x + 54 * (s.facing || 1));
    await sleep(50); await clearSpy(); await sleep(40);
    await page.keyboard.down(key); await sleep(150); await page.keyboard.up(key); await sleep(300);
    const log = await spyLog(); hit = log.find(f => arr.includes(f)) || null;
  }
  ok(!!hit, `${label} → P2 (defender) fires ${poolName} (${hit || "none"})`);
}
await hitCheck("P1 light connects on P2", "j", "hitLight");
await hitCheck("P1 heavy connects on P2", "k", "hitHeavy");

// Knockdown (force the downed state on p1)
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.clearHitVoiceCd?.("p1"); });
await clearSpy(); await sleep(60);
await page.evaluate(() => window.__harness.knockdownP1?.()); await sleep(220);
{ const log = await spyLog(); const arr = await pool("knockdown"); ok(log.some(f => arr.includes(f)), `knockdown → knockdown clip (${log[0]||"none"})`); }

// Win
await clearSpy(); await sleep(60);
await page.evaluate(() => window.__harness.forceMatchWin?.("p1")); await sleep(300);
{ const log = await spyLog(); const arr = await pool("win"); ok(log.some(f => arr.includes(f)), `win → win clip (${log[0]||"none"})`); }

// Intro (fresh match start plays the intro beat)
console.log("\nINTRO:");
await clearSpy();
await page.evaluate(() => { window.__harness.start?.(); });
await sleep(700);
{ const log = await spyLog(); const arr = await pool("intro"); ok(log.some(f => arr.includes(f)), `intro beat → intro clip (${log[0]||"none"})`); }

console.log(`\n${pass} PASS / ${fail} FAIL`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
