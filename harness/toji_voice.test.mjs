// harness/toji_voice.test.mjs — Toji voice wiring proof (audio-only; no gameplay).
// (1) every clip in TOJI_VOICE (both languages) exists on disk; (2) live triggers fire (spy on playSfxFile):
// intro / special casts (Split Soul, Chain/Inverted Spear) / hitReact / the TWO comeback beats (save1 + the
// Reincarnated-Form save2) / win. Confirms the dual-language pools + the Step-4 comeback callouts are wired.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { TOJI_VOICE } from "../tojiVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n,c,d="") => { (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`); };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n){ const s=(await state()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}); }
const spyLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function installSpy(){ await page.evaluate(() => { const s=window.__harness.__sound; s._sfxSpy=s._sfxSpy||[]; if(!s._spied){ s._spied=true; const o=s.playSfxFile.bind(s); s.playSfxFile=(f,fb,opt)=>{ try{s._sfxSpy.push(String(f));}catch(_){ } return o(f,fb,opt);}; } }); }
const firedToji = async () => (await spyLog()).some(f => /toji_voice_/.test(f));

// ── (1) every wired clip exists on disk ──
let missing = [];
for (const lang of ["ja","en"]) for (const pool of Object.keys(TOJI_VOICE[lang]||{})) for (const clip of TOJI_VOICE[lang][pool]) {
  if (!fs.existsSync(path.join(ROOT, clip))) missing.push(`${lang}/${pool}/${clip}`);
}
check("every wired clip (EN+JA) exists on disk", missing.length === 0, missing.slice(0,4).join(", "));
const njapool = Object.values(TOJI_VOICE.ja).reduce((a,p)=>a+p.length,0);
const nenpool = Object.values(TOJI_VOICE.en).reduce((a,p)=>a+p.length,0);
check("BOTH language pools present (separate)", njapool > 0 && nenpool > 0, `JA=${njapool} EN=${nenpool}`);

// ── boot (vs-match so the comeback resolves); install spy BEFORE start so it catches the intro beat ──
await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
// Training mode: the dummy STANDS (no AI interruption of the special casts), and the comeback interception
// runs ungated (before checkRoundEnd) so both saves still fire. Spy installed BEFORE start → catches intro.
await installSpy();
await page.evaluate(() => { window.__harness.start(); });
await waitFrames(24);
check("intro voice fires (toji_voice clip)", await firedToji());
await page.evaluate(() => { window.__harness.skipToBattle(); const a=window.__harness.p1(); window.__harness.setP2X(a.x + 600); });
await waitFrames(6);

// ── Split Soul Katana cast ──
await clearSpy();
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(6);
check("Split Soul Katana cast fires a voice", await firedToji());

// ── Chain / Inverted Spear cast (Fwd+Special) — wait out the 150f _atkVoiceCd from the prior cast ──
await waitFrames(160); await clearSpy();
await page.keyboard.down("d"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(6); await page.keyboard.up("d");
check("Chain / Inverted Spear cast fires a voice", await firedToji());

// ── 1st comeback save (drive HP to 0) → comebackSave1 ──
await waitFrames(160); await clearSpy();
await page.evaluate(() => window.__harness.setP1HealthRaw(0)); await waitFrames(3);
const cb1 = await page.evaluate(() => window.__harness.tojiComeback());
check("1st save (defiant) fires comebackSave1 voice", await firedToji() && cb1.savesUsed === 1, `savesUsed=${cb1.savesUsed}`);

// ── 2nd comeback save (Reincarnated Form) → comebackSave2 ──
await clearSpy();
await page.evaluate(() => window.__harness.setP1HealthRaw(0)); await waitFrames(3);
const cb2 = await page.evaluate(() => window.__harness.tojiComeback());
check("2nd save (Reincarnated Form) fires comebackSave2 voice", await firedToji() && cb2.reincarnated, `form=${cb2.form}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0,2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
