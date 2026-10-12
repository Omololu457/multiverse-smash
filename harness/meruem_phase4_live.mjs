// harness/meruem_phase4_live.mjs — REAL-MATCH verification for Meruem PHASE 4 (Aura Synthesis payoff:
// Royal Feast → Winged Ascension → Rage Blast). Boots p1=meruem vs p2=netero. Uses additive harness hooks
// meruemState / meruemSetSynth / meruemRoyalFeast / p1SpecialDir / p1Ultimate. Verifies: Synthesis gauge
// fills; Royal Feast GATES on a FULL gauge (no-op below) and at full heals 15% + enters the ~10s Winged
// form (winged idle sheet); the Fwd+Special winged dive; and the Neutral-Ult RAGE BLAST (huge damage + beam,
// ENDS the form).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `meruem4_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const ms = () => page.evaluate(() => window.__harness.meruemState?.());
const p2hp = () => page.evaluate(() => Math.round((window.__harness.p2()?.health) ?? -1));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await waitFrames(4); }
const healAll = () => page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
const setP2 = dx => page.evaluate(d => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + d); } catch (_) {} }, dx);

await boot(`${base}/index.html?harness=1&p1=meruem&p2=netero`);
await toBattle();
ok(!!(await ms()), `meruemState hook available`);
ok(PERR === 0, `no page errors on boot`);

// ── 1) AURA SYNTHESIS gauge fills (set + read) ──
await page.evaluate(() => window.__harness.meruemSetSynth?.(60));
await waitFrames(2); const sy = await ms();
ok(sy.synth === 60, `Aura Synthesis gauge reads the set value (synth=${sy.synth})`);

// ── 2) ROYAL FEAST GATE — below a FULL gauge, Down+Ult is a NO-OP (no form, no heal) ──
await healAll(); await waitFrames(2);
const lowFeast = await page.evaluate(() => window.__harness.meruemRoyalFeast?.(50));   // synth 50 < 100
await waitFrames(4); const g2 = await ms();
console.log(`  Royal Feast gate: trigger@synth50 → ${JSON.stringify(lowFeast)} winged=${g2.winged}`);
ok(g2.winged === false, `Royal Feast is a NO-OP below full Synthesis (winged=${g2.winged})`);

// ── 3) ROYAL FEAST at FULL gauge → heal 15% + enter WINGED ASCENSION (winged idle sheet) ──
await page.evaluate(() => { const h = window.__harness; if (h.p1) {} });
await page.evaluate(() => window.__harness.meruemSetSynth?.(100));
// drop HP a bit so the 15% heal is observable
await page.evaluate(() => { try { window.__harness.meruemHit?.("setup", 500); } catch (_) {} });
await waitFrames(3); const beforeFeast = await ms();
const feast = await page.evaluate(() => window.__harness.meruemRoyalFeast?.(100));
await waitFrames(6); const afterFeast = await ms();
await shot("01_royal_feast");
console.log(`  Royal Feast: ${JSON.stringify(feast)} | HP ${beforeFeast.hp}→${afterFeast.hp} synth ${beforeFeast.synth}→${afterFeast.synth} winged=${afterFeast.winged} sheet=${afterFeast.sheet}`);
ok(afterFeast.winged === true, `Royal Feast entered WINGED ASCENSION (winged=${afterFeast.winged})`);
ok(afterFeast.hp > beforeFeast.hp + 100, `Royal Feast healed ~15% (${beforeFeast.hp}→${afterFeast.hp})`);
ok(afterFeast.synth === 0, `Aura Synthesis consumed (synth=${afterFeast.synth})`);
ok(/winged_idle/.test(afterFeast.sheet || ""), `winged form uses the winged frames (sheet=${afterFeast.sheet})`);
ok((afterFeast.wingedTimer || 0) > 400, `Winged timer running (~10s) (timer=${afterFeast.wingedTimer})`);

// ── 4) WINGED DIVE — Fwd+Special while winged deals damage ──
await page.evaluate(() => { window.__harness.healP2?.(); });
await setP2(120); await waitFrames(2);
const dHp0 = await p2hp();
await page.evaluate(() => window.__harness.p1SpecialDir?.("F"));
await waitFrames(14); const dHp1 = await p2hp();
await shot("02_winged_dive");
console.log(`  Winged dive (F+Special): p2 hp ${dHp0}→${dHp1} (Δ${dHp0 - dHp1}) still winged=${(await ms()).winged}`);
ok((dHp0 - dHp1) > 0, `winged dive strikes the foe (Δ=${dHp0 - dHp1})`);

// ── 5) RAGE BLAST — Neutral Ultimate while winged → huge damage + beam, and it ENDS the form ──
await page.evaluate(() => { window.__harness.healP2?.(); });
await setP2(200); await waitFrames(2);
const rHp0 = await p2hp();
const rr = await page.evaluate(() => window.__harness.p1Ultimate?.());
await waitFrames(42); await shot("03_rage_beam"); const midRage = await ms();
await waitFrames(90);   // past the full Rage Blast (~118f)
const rHp1 = await p2hp(); const afterRage = await ms();
console.log(`  Rage Blast: ${JSON.stringify(rr)} | p2 hp ${rHp0}→${rHp1} (Δ${rHp0 - rHp1}) | beamActive mid=${midRage.beam} | winged after=${afterRage.winged}`);
ok(!!rr?.cast, `Rage Blast ult fired (cast=${rr?.cast})`);
ok((rHp0 - rHp1) > 120, `Rage Blast deals huge damage (Δ=${rHp0 - rHp1})`);
ok(midRage.beam > 0, `the stage beam renders during the blast (beamActive=${midRage.beam})`);
ok(afterRage.winged === false, `firing Rage Blast ENDS the Winged form (winged=${afterRage.winged})`);

// ── 6) revert restores the base sheet ──
await waitFrames(4); const back = await ms();
ok(/meruem_idle/.test(back.sheet || ""), `form reverted to the base body (sheet=${back.sheet})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/meruem4_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
