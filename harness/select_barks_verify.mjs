// harness/select_barks_verify.mjs — CHARACTER-SELECT VOICE BARKS (Track B), LIVE proof.
// The select grid used to be silent (only the generic UI hover/select tones). This pass barks a
// character's EXISTING intro voice clip when its card is highlighted, with a trailing debounce + a
// single-voice-channel owner so fast scrolling can't stack overlapping barks. Silent characters
// (no INTRO_VOICE entry, e.g. base Gojo) stay silent. This drives real highlight changes via
// __harness.setCharHover, spies on sound.playSfxFile, and asserts:
//   • a voiced character (Yuji/Sukuna/Toji…) barks when highlighted,
//   • a SILENT character (base Gojo) does NOT bark,
//   • re-highlighting the same card does not double-bark,
//   • rapidly scrolling N cards fires FAR fewer than N barks (debounce) and never overlaps (owner cut).
// Run: `node harness/select_barks_verify.mjs`.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }
const barks = () => page.evaluate(() => window.__barks.slice());
const clearBarks = () => page.evaluate(() => { window.__barks.length = 0; });
const ownedActive = () => page.evaluate(() => window.__harness.sfxActive().filter(e => e.owned && !e.paused).length);
async function hover(i){ await page.evaluate(x=>window.__harness.setCharHover(x), i); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gojo&p2=gojo`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);   // user gesture → unlocks audio
  // install a spy on the bark-owned playSfxFile calls (pass-through so the real single-voice-channel runs)
  await page.evaluate(() => {
    const s = window.__harness.__sound; window.__barks = [];
    const orig = s.playSfxFile.bind(s);
    s.playSfxFile = (file, fb, opts={}) => { if (opts && opts.owner === "__selectBark__") window.__barks.push(String(file).split("/").pop()); return orig(file, fb, opts); };
  });
  const roster = await page.evaluate(() => window.__harness.showCharSelect("jujutsu_kaisen", "training").roster);
  await waitFrames(4);
  check("on the character-select screen with a roster", Array.isArray(roster) && roster.length > 3, `n=${roster?.length}`);
  console.log("    roster:", roster.join(", "));

  const idxOf = k => roster.indexOf(k);
  const VOICED = ["yuji","sukuna","toji","naoya","miwa"].filter(k => idxOf(k) >= 0);
  const SILENT = idxOf("gojo");   // base Gojo has no INTRO_VOICE entry → must stay silent

  // ── a voiced character barks on highlight ──
  console.log("\n─── voiced characters bark on highlight ───");
  for (const k of VOICED) {
    // start from a different card so the highlight genuinely CHANGES, then land on k after the cooldown
    await hover((idxOf(k) + 1) % roster.length); await waitFrames(22);
    await clearBarks();
    await hover(idxOf(k)); await waitFrames(24);
    const b = await barks();
    check(`${k}: barks when highlighted`, b.length >= 1, `clips=[${b.join(",")}]`);
    // the clip should be that character's own voice file (filename usually prefixed by the roster key)
  }

  // ── a silent character does NOT bark ──
  console.log("\n─── silent character stays silent ───");
  if (SILENT >= 0) {
    await hover((SILENT + 1) % roster.length); await waitFrames(22);
    await clearBarks();
    await hover(SILENT); await waitFrames(26);
    const b = await barks();
    check("gojo (no voice pack): stays silent when highlighted", b.length === 0, `clips=[${b.join(",")}]`);
  } else check("gojo present in roster", false, "gojo not found");

  // ── re-highlighting the same card does not double-bark ──
  console.log("\n─── no repeat on the same card ───");
  if (VOICED.length) {
    const k = VOICED[0];
    await hover((idxOf(k)+1) % roster.length); await waitFrames(22);
    await clearBarks();
    await hover(idxOf(k)); await waitFrames(24);      // barks once
    await hover(idxOf(k)); await hover(idxOf(k)); await waitFrames(24);   // still on same card
    const b = await barks();
    check(`${k}: exactly one bark while it stays highlighted`, b.length === 1, `count=${b.length}`);
  }

  // ── debounce: fast scroll fires FEWER barks than cards, never overlapping ──
  console.log("\n─── fast scroll debounce ───");
  await clearBarks();
  let maxOverlap = 0;
  const N = Math.min(roster.length, 10);
  for (let i=0;i<N;i++){ await hover(i); maxOverlap = Math.max(maxOverlap, await ownedActive()); await waitFrames(2); }   // ~2 frames/card — much faster than the 20-frame cooldown
  await waitFrames(2);
  const scrolled = await barks();
  check(`scrolled ${N} cards in ~${N*2} frames → far fewer barks than cards (debounced)`, scrolled.length < N, `barks=${scrolled.length} cards=${N}`);
  check("barks never overlap (≤1 owned bark cue at a time)", maxOverlap <= 1, `maxOverlap=${maxOverlap}`);

  check("no JS errors", errs.length === 0, errs[0] || "");
} catch (e) {
  console.log("FATAL", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  SELECT VOICE BARKS (Track B): ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
