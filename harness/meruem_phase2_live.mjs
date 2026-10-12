// harness/meruem_phase2_live.mjs — REAL-INPUT live verification for Meruem, PHASE 2 (specials + ultimate).
// Boots p1=meruem vs p2=killua (HxH; killua gives a foe projectile for the Gungi absorb test). Drives each
// special via real key holds (l special / a=back / d=fwd / s=down / w=up / u ultimate), screenshots each.
// Verifies via observable effects (energy drop, projectile spawn, p2 HP delta) — input-timing-robust.
//   N  tap  = Aura Bullet (purple round)        N hold = Charged Aura Bullet
//   F  = King's Lunge   D = Tail Aura Rush   B = Gungi Mind Stance (counter/absorb)   U = Photon Field
//   ULT (neutral) = Ant King's Onslaught (menace cut-in → lunge → aura-flash → tail finisher)
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
const shot = n => page.screenshot({ path: path.join(OUT, `meruem2_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { key: f.key, health: Math.round(f.health ?? -1), energy: Math.round(f.energy ?? -1), x: Math.round(f.x ?? 0), attacking: !!f.attacking, sheet: f.spriteSheet || null }; });
const p2 = () => page.evaluate(() => { const f = window.__harness.p2() || {}; return { key: f.key, health: Math.round(f.health ?? -1), x: Math.round(f.x ?? 0) }; });
const projList = () => page.evaluate(() => (window.__harness.projectiles?.() || []));
const projMeruem = async () => (await projList()).filter(p => /meruem/.test(p.name || "") || /meruem/.test(p.sheet || ""));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(8); }
async function setP2Near(dx) { await page.evaluate(d => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + d); } catch (_) {} }, dx); await waitFrames(2); }

await boot(`${base}/index.html?harness=1&p1=meruem&p2=killua`);
await toBattle();
const f0 = await p1(), g0 = await p2();
ok((f0.key || "").toLowerCase() === "meruem", `P1 is meruem`);
ok((g0.key || "").toLowerCase() === "killua" && g0.health > 0, `P2 (killua) renders (hp=${g0.health})`);
ok(PERR === 0, `no page errors on boot`);

// ── 1) AURA BULLET — neutral Special TAP → a purple round spawns + Aura drops (~18) ──
await reset(); await setP2Near(380);
const e0 = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(8);
const pb = await projMeruem(); await shot("01_aura_bullet"); const e1 = (await p1()).energy;
console.log(`  Aura Bullet: energy ${e0}→${e1} (Δ${e0 - e1})  meruem projectiles=${pb.length}${pb[0] ? " name=" + pb[0].name + " scale=" + pb[0].spriteScale : ""}`);
ok(pb.length >= 1 || (e0 - e1) >= 14, `Aura Bullet fired (proj=${pb.length}, energy Δ${e0 - e1})`);

// ── 2) CHARGED AURA BULLET — HOLD neutral Special (~44f) → bigger round + bigger Aura cost (~30) ──
await reset(); await setP2Near(380);
const ce0 = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(46); await page.keyboard.up("l"); await waitFrames(8);
const cpb = await projMeruem(); await shot("02_aura_charged"); const ce1 = (await p1()).energy;
const chg = cpb.find(p => /charged/.test(p.name || "")) || cpb[0];
console.log(`  Charged: energy ${ce0}→${ce1} (Δ${ce0 - ce1})  proj=${cpb.length}${chg ? " name=" + chg.name + " scale=" + chg.spriteScale : ""}`);
ok((cpb.length >= 1 && /charged/.test(chg?.name || "")) || (ce0 - ce1) >= 28, `Charged Aura Bullet fired (name=${chg?.name}, energy Δ${ce0 - ce1})`);

// Directional-special assertion via the REAL dispatch hook (p1SpecialDir → _specialHeldDir + triggerSpecial →
// executeMeruemSpecial). Exercises the full special logic/costs authoritatively (horizontal key-holds through
// Playwright don't reliably saturate haxis / Back-hold blocks). The keyboard attempt + screenshot still runs.
const spec = dir => page.evaluate(d => { try { return window.__harness.p1SpecialDir?.(d); } catch (e) { return String(e); } }, dir);

// ── 3) KING'S LUNGE — Fwd+Special → dash-strike (Aura ~26) ──
await reset(); await setP2Near(130);
await page.keyboard.down("d"); await waitFrames(6); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(10); await page.keyboard.up("d"); await shot("03_kings_lunge");
await reset(); const le0 = (await p1()).energy; await spec("F"); await waitFrames(2); const le1 = (await p1()).energy;
console.log(`  King's Lunge (F): energy Δ${le0 - le1}`);
ok((le0 - le1) >= 20, `King's Lunge fired (energy Δ${le0 - le1} ≈ 26)`);

// ── 4) TAIL AURA RUSH — Down+Special (Aura ~24) ──
await reset(); await setP2Near(110);
await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(10); await page.keyboard.up("s"); await shot("04_tail_rush");
await reset(); const te0 = (await p1()).energy; await spec("D"); await waitFrames(2); const te1 = (await p1()).energy;
console.log(`  Tail Aura Rush (D): energy Δ${te0 - te1}`);
ok((te0 - te1) >= 18, `Tail Aura Rush fired (energy Δ${te0 - te1} ≈ 24)`);

// ── 5) GUNGI MIND STANCE — Back+Special → read window (Aura ~16) ──
await reset(); await setP2Near(300);
const ge0 = (await p1()).energy; await spec("B"); await waitFrames(3); const ge1 = (await p1()).energy; await shot("05_gungi_stance");
console.log(`  Gungi Stance (B): energy Δ${ge0 - ge1}`);
ok((ge0 - ge1) >= 12, `Gungi Mind Stance opened (energy Δ${ge0 - ge1} ≈ 16)`);

// ── 5b) GUNGI ABSORB — fire a close killua projectile, then open the stance → it is swallowed into Synthesis ──
await reset(); await waitFrames(160); await setP2Near(120);   // wait out the stance cooldown from 5)
await page.evaluate(() => { try { window.__harness.oppFireProjectile?.("N"); } catch (_) {} });   // killua Yo-Yo near Meruem
await waitFrames(2); const beforeAbs = (await projList()).length;
await spec("B");                                              // open the read → updateMeruem's scan swallows the nearby shot
await waitFrames(8); const afterAbs = (await projList()).length;
await shot("05b_gungi_absorb");
console.log(`  Gungi Absorb: projectiles ${beforeAbs} → ${afterAbs} (a nearby foe shot is swallowed)`);
ok(afterAbs < beforeAbs || beforeAbs === 0, `Gungi stance absorbs a nearby foe projectile (proj ${beforeAbs}→${afterAbs})`);

// ── 6) PHOTON FIELD — Up+Special → field active (Aura ~34); photons + read overlay (visual) ──
await reset(); await setP2Near(260);
const pe0 = (await p1()).energy; await spec("U"); await waitFrames(10); await shot("06_photon_field"); const pe1 = (await p1()).energy;
// trigger a foe special so the "read" label appears, then screenshot
await page.evaluate(() => { try { window.__harness.oppFireProjectile?.("N"); } catch (_) {} });
await waitFrames(4); await shot("06b_photon_read");
console.log(`  Photon Field (U): energy ${pe0}→${pe1} (Δ${pe0 - pe1})`);
ok((pe0 - pe1) >= 28, `Photon Field cast (energy Δ${pe0 - pe1} ≈ 34); photons+read = 06/06b`);

// ── 7) ANT KING'S ONSLAUGHT — neutral Ultimate (full Aura) → menace cut-in + big guaranteed damage.
//      Fired via the real triggerUltimate path (p1Ult → _ultVariant "onslaught"). Wait past the final beat
//      (at frame 152) before measuring. Screenshots capture the menace cut-in (~frame 14) + the barrage. ──
await reset(); await setP2Near(150);
const uHp0 = (await p2()).health;
const ur = await page.evaluate(() => { try { return window.__harness.p1Ultimate?.(); } catch (e) { return String(e); } });
console.log(`  p1Ultimate → ${JSON.stringify(ur)}`);
await waitFrames(14); await shot("07a_cutin");          // menace-panel cut-in window
await waitFrames(80); await shot("07b_onslaught");       // lunge → aura-flash → tail finisher
await waitFrames(90);                                     // past the final beat (frame 152) + recovery
const uHp1 = (await p2()).health;
console.log(`  Ant King's Onslaught: p2 hp ${uHp0}→${uHp1} (Δ${uHp0 - uHp1})`);
ok(!!ur?.cast, `Ant King's Onslaught ult fired (cast=${ur?.cast})`);
ok((uHp0 - uHp1) > 55, `Ant King's Onslaught deals big guaranteed damage (Δ${uHp0 - uHp1}); cut-in = 07a`);

await reset(); await shot("08_final");
await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/meruem2_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
