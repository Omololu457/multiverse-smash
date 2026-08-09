// harness/tobi_voice.test.mjs — Tobi (masked Obito alias) voice wiring (audio-only).
// (1) Module integrity: 3 pools (intro/specialCast/combatBark = 13 clips), the Itachi-named clip 010 is
//     NOT wired, every wired filename exists on disk, pickTobiVoice returns from the right pool.
// (2) Live wiring: a special CAST fires a specialCast clip; a heavy CONNECT fires a combatBark clip.
// (3) Isolation: Tobi speaks ONLY tobi_voice_* clips (never an obito_* clip) — separate from Obito.
// Usage: node harness/tobi_voice.test.mjs   (npm run test:tobi-voice)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { TOBI_VOICE, pickTobiVoice } from "../tobiVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
let pass = 0, fail = 0; const ok = (c, m) => { (c ? pass++ : fail++); console.log(`  ${c?"✅":"❌"} ${m}`); };
const sec = m => console.log(`\n── ${m} ──`);

// ── (1) MODULE INTEGRITY (no browser needed) ──
sec("Module integrity");
const pools = Object.keys(TOBI_VOICE);
ok(pools.length === 3 && pools.every(p => ["intro","specialCast","combatBark"].includes(p)), `3 pools: ${pools.join("/")}`);
const all = pools.flatMap(p => TOBI_VOICE[p]);
ok(all.length === 13, `13 clips wired (14 batch − 1 discarded): ${all.length}`);
ok(all.every(f => fs.existsSync(path.join(ROOT, f))), `every wired clip exists on disk`);
ok(!all.some(f => f.includes("_010_")), `clip 010 (names Itachi) is NOT wired (discarded)`);
ok(new Set(all).size === all.length, `no duplicate clip across pools`);
ok(TOBI_VOICE.intro.length === 2 && TOBI_VOICE.specialCast.length === 3 && TOBI_VOICE.combatBark.length === 8, `pool sizes intro2/specialCast3/combatBark8`);
ok([...Array(20)].every(() => TOBI_VOICE.specialCast.includes(pickTobiVoice("specialCast"))), `pickTobiVoice('specialCast') stays in-pool`);
ok(pickTobiVoice("nope") === null, `pickTobiVoice(unknown pool) → null`);

// ── (2)(3) LIVE WIRING + ISOLATION ──
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const wf = (n=1) => page.evaluate(fr => new Promise(r => { let i=0; const t=()=>{ if(++i>=fr) return r(); requestAnimationFrame(t); }; requestAnimationFrame(t); }), n);
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } });
await page.evaluate(() => window.__harness.boot());
await wf(20);

sec("Live wiring");
// specialCast — fire a special, expect a specialCast clip
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await clearSpy(); await wf(2);
await page.evaluate(() => window.__harness.p1SpecialDir("F"));   // Fire Phoenix
await wf(6);
let s = await spy();
const castClip = s.find(f => TOBI_VOICE.specialCast.includes(f));
ok(!!castClip, `special cast → specialCast clip (${castClip || s.filter(x=>x.includes("tobi_voice")).join(",") || "none"})`);

// wait for _atkVoiceCd to decay, then combatBark on a heavy connect
await wf(170);
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.setP2Invuln?.(0); const b=window.__harness.p2(); window.__harness.setP1X?.(b.x-70); });
await clearSpy(); await wf(2);
await page.keyboard.down("k"); await wf(2); await page.keyboard.up("k");
await wf(24);
s = await spy();
const barkClip = s.find(f => TOBI_VOICE.combatBark.includes(f));
ok(!!barkClip, `heavy connect → combatBark clip (${barkClip || "none"})`);

sec("Isolation (Tobi ⟂ Obito voice)");
const allPlayed = await page.evaluate(() => (window.__harness.__sound._sfxSpy || []));
// gather EVERYTHING played this session via a fresh full spy over one more special
await page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
await page.evaluate(() => { window.__harness.fillEnergy?.(); });
await wf(2); await page.evaluate(() => window.__harness.p1SpecialDir("D")); await wf(8);
const played = await spy();
const tobiClips = played.filter(f => /tobi_voice_/.test(f));
const obitoClips = played.filter(f => /obito_voice_/.test(f) || /^obito_/.test(f) && f.includes("voice"));
ok(tobiClips.length > 0 && obitoClips.length === 0, `Tobi played only tobi_voice_* (tobi=${tobiClips.length}, obito=${obitoClips.length})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,3).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
