// harness/orochimaru_voice.test.mjs — Orochimaru voice wiring (audio-only). NODE-side: pool integrity, every
// clip exists on disk, no cross-pool reuse, the 7 flagged long ORIGINALS are superseded by their splits,
// namecall left unmapped. BROWSER-side: the intro registry + win/hit/knockdown/special/transform/ult hooks
// actually FIRE (they set the shared _atkVoiceCd / _hitVoiceCd / _introVoiceDone gates). No gameplay touched.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── NODE-side: parse the voice module + on-disk checks ──
section("pool integrity + on-disk clips + split supersession");
const vjs = fs.readFileSync(path.join(ROOT, "orochimaruVoice.js"), "utf8");
const poolNames = [...vjs.matchAll(/^\s{2}([a-zA-Z]+):\s*\[/gm)].map(m => m[1]);
const EXPECT = ["intro", "grab", "snakeSpit", "swordLunge", "swordThrow", "snakeLunge", "tailSweep", "slam", "chainFinish", "snakeBarrage", "coil", "ultimate", "transform", "hitLight", "hitHeavy", "knockdown", "win"];
check(`all ${EXPECT.length} trigger pools present`, EXPECT.every(p => poolNames.includes(p)), `missing=${EXPECT.filter(p => !poolNames.includes(p))}`);
check("namecall left UNMAPPED (no reliable name-only clip)", !poolNames.includes("namecall"), "");
// parse pool → clips
const pools = {}; let cur = null;
for (const line of vjs.split("\n")) {
  const ph = line.match(/^\s{2}([a-zA-Z]+):\s*\[/); if (ph) { cur = ph[1]; pools[cur] = []; continue; }
  const cl = line.match(/"(orochi_line_[^"]+\.mp3)"/); if (cl && cur) pools[cur].push(cl[1]);
  if (/^\s{2}\],/.test(line)) cur = null;
}
const allRefs = Object.values(pools).flat();
const missing = allRefs.filter(c => !fs.existsSync(path.join(ROOT, c)));
check(`every referenced clip exists on disk (${allRefs.length} refs)`, missing.length === 0, missing.slice(0, 4).join(","));
check("every pool is non-empty", EXPECT.every(p => (pools[p] || []).length > 0), EXPECT.filter(p => !(pools[p] || []).length).join(","));
// cross-pool reuse
const counts = {}; allRefs.forEach(c => counts[c] = (counts[c] || 0) + 1);
const reused = Object.entries(counts).filter(([, n]) => n > 1).map(([c]) => c);
check("no clip reused across pools", reused.length === 0, reused.slice(0, 4).join(","));
// the 7 flagged long ORIGINALS must NOT be referenced (superseded by splits); their splits SHOULD be used
const FLAGGED = ["01", "02", "16", "20", "24", "27", "43"];
const origRefd = FLAGGED.filter(n => allRefs.some(c => new RegExp(`orochi_line_${n}_`).test(c)));
check("no flagged long ORIGINAL is wired whole (all split)", origRefd.length === 0, `whole-refs=${origRefd}`);
const splitsUsed = FLAGGED.filter(n => allRefs.some(c => new RegExp(`orochi_line_${n}[a-z]_`).test(c)));
check("split segments of the flagged clips ARE used", splitsUsed.length >= 5, `splits used from: ${splitsUsed.join(",")}`);
// ultimate = longest/most dramatic → should include a flagged-split (per the build directive)
check("ultimate pool leads with a flagged-split (longest/most dramatic)", pools.ultimate.some(c => /orochi_line_(20a|24c)/.test(c)), pools.ultimate.join(" "));
// source hooks present
const ab = fs.readFileSync(path.join(ROOT, "abilities.js"), "utf8");
const cb = fs.readFileSync(path.join(ROOT, "combat.js"), "utf8");
const gj = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
check("abilities.js wires special/chain/grab/ult/transform casts", ['oroVoice(fighter, "snakeSpit")', 'oroVoice(fighter, "chainFinish"', 'oroVoice(fighter, "grab")', 'oroVoice(fighter, "ultimate"', 'oroVoice(fighter, "transform"'].every(s => ab.includes(s)), "");
check("combat.js wires hit + knockdown voice", cb.includes("applyOrochimaruHitVoice") && cb.includes('pickOrochimaruVoice("knockdown")'), "");
check("game.js wires intro registry + win voice", gj.includes('orochimaru: { pick: () => pickOrochimaruVoice("intro")') && gj.includes('winFighter?.rosterKey === "orochimaru"'), "");

// ── BROWSER-side: hooks actually fire ──
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const vcd = () => page.evaluate(() => window.__harness.oroVoiceCd("p1"));
try {
  await page.goto(`${base}/index.html?harness=1&p1=orochimaru&p2=orochimaru`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  section("browser: pool query + pick");
  const pn = await page.evaluate(() => window.__harness.orochimaruVoicePools());
  check("harness exposes all pools", EXPECT.every(p => pn.includes(p)), `${pn.length} pools`);
  const uPick = await page.evaluate(() => window.__harness.orochimaruVoicePick("ultimate", 5));
  check("pickOrochimaruVoice('ultimate') returns real clips", uPick.every(c => c && c.startsWith("orochi_line_")), uPick.join(" "));

  section("browser: intro voice fires (registry)");
  await page.evaluate(() => window.__harness.forceIntro("intro1"));
  await page.evaluate(() => { const l = document.getElementById("loading"); if (l) l.classList.add("hidden"); });
  await wf(8);
  check("intro voice fired (_introVoiceDone latched)", (await vcd()).introDone === true, `introDone=${(await vcd()).introDone}`);

  section("browser: special / transform / ultimate casts set the voice gate");
  await page.evaluate(() => window.__harness.boot()); await wf(6);
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); });
  await page.evaluate(() => window.__harness.p1SpecialDir("F"));   // Sword Lunge → swordLunge voice
  await wf(2);
  check("special cast set _atkVoiceCd (voice hook fired)", (await vcd()).atk > 0, `atk=${(await vcd()).atk}`);
  // ultimate
  await wf(60); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); });
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); await wf(2);
  check("ultimate cast set _atkVoiceCd (voice hook fired)", (await vcd()).atk > 0, `atk=${(await vcd()).atk}`);
  // transform
  await wf(80); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); window.__harness.orochimaruForm("host"); });
  await wf(2);
  check("transform set _atkVoiceCd (shed-skin voice hook fired)", (await vcd()).atk > 0, `atk=${(await vcd()).atk}`);

  section("browser: hit-reaction voice gate");
  await wf(80); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.orochimaruForm(null); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 40 * (a.facing || 1));   // P2 adjacent → attack connects
  await wf(2);
  await page.evaluate(() => window.__harness.p2Attack());   // P2 hits P1(orochimaru)
  for (let i = 0; i < 16; i++) await wf(1);
  check("taking a hit set _hitVoiceCd (hit-react voice hook fired)", (await vcd()).hit > 0, `hit=${(await vcd()).hit}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); }
console.log(`\n════ OROCHIMARU voice: ${PASS} passed, ${FAIL} failed ════`);
process.exit(FAIL ? 1 : 0);
