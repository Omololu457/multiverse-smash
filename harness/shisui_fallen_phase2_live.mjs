// harness/shisui_fallen_phase2_live.mjs — REAL live verification of SHISUI (FALLEN) Phase 2.
// Drives each directional Special (N=Kunai Barrage / F=Body-Flicker Strike / B=Afterimage Feint /
// U=Sharingan Glare / D=Shadow-Clone Pursuit) and the neutral Ultimate (Shunshin: Thousand Shadows),
// asserting each fires + lands (foe HP drop, stun, i-frames, afterimage spawn). P1 keys: a/d move, w jump,
// s crouch, j light, k heavy, l special, u ultimate, ; block.
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
let PERR = 0, KNOWN = 0;
page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { KNOWN++; return; } console.log("  PAGEERROR:", e.message); PERR++; });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle(stage) {
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await reset();
}
async function reset() {
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(560); window.__harness.setP2X?.(760); });
  // wait out any lingering attack/dash cooldown from the previous move (reset doesn't clear attackCooldown).
  await page.waitForFunction(() => { const f = window.__harness.p1(); return (f.dashCooldown || 0) === 0 && (f.attackCooldown || 0) === 0 && (f.ultCd || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(6);
}
// Directional special via the REAL dispatch (p1SpecialDir sets _specialHeldDir + fires triggerSpecial).
const spec = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

console.log("\n── SHISUI (FALLEN) — Phase 2 specials + ultimate ──");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");
const f0 = await p1();
ok((f0.key || "").toLowerCase() === "shisui_fallen", `P1 is shisui_fallen (maxEnergy=${f0.maxEnergy})`);

// REAL-INPUT stamp check (fresh state): keyboard Ultimate → game.js stamps _ultVariant="thousandShadows" → fires.
{ await reset(); const h0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u");
  const s = await p1();
  await waitFrames(70);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  [keyboard Ult] stamped ultVariant=${s.ultVariant}, Δdmg=${dmg}`);
  ok(s.ultVariant === "thousandShadows", `keyboard Ultimate stamps _ultVariant via game.js (=${s.ultVariant})`);
  ok(dmg >= 120, `keyboard Thousand Shadows lands (Δ=${dmg})`);
}

// NEUTRAL — Kunai Barrage: foe HP drops from the volley. (keyboard path to also prove chakra cost)
{ await reset(); const h0 = (await p2()).health; const e0 = (await p1()).energy;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(30);
  const h1 = (await p2()).health, e1 = (await p1()).energy;
  console.log(`  Kunai Barrage: foe ${Math.round(h0)}→${Math.round(h1)} (Δ${Math.round(h0-h1)}), energy ${Math.round(e0)}→${Math.round(e1)}`);
  ok(h1 < h0, `Kunai Barrage deals damage (Δ=${Math.round(h0-h1)})`);
  ok(e1 < e0, `Kunai Barrage costs chakra`);
}
// FWD — Body-Flicker Strike: Shisui blinks toward foe + damages.
{ await reset(); const h0 = (await p2()).health; const x0 = (await p1()).x;
  const r = await spec("F"); await waitFrames(20);
  const h1 = (await p2()).health, x1 = (await p1()).x;
  console.log(`  Flicker Strike (${r?.move}): foe ${Math.round(h0)}→${Math.round(h1)} (Δ${Math.round(h0-h1)}), P1 x ${Math.round(x0)}→${Math.round(x1)}`);
  ok(h1 < h0, `Flicker Strike deals damage (Δ=${Math.round(h0-h1)})`);
  ok(Math.abs(x1 - x0) >= 40, `Flicker Strike repositions (blink dx=${Math.round(x1-x0)})`);
}
// BACK — Afterimage Feint: i-frames granted + an afterimage spawned.
{ await reset(); const g0 = (await p1()).flickGhosts;
  const r = await spec("B"); await waitFrames(1);
  const s = await p1();
  console.log(`  Afterimage Feint (${r?.move}): invulnTimer=${s.invulnTimer}, ghosts ${g0}→${s.flickGhosts}`);
  ok(s.invulnTimer > 0, `Afterimage Feint grants i-frames (invuln=${s.invulnTimer})`);
  ok(s.flickGhosts > g0, `Afterimage Feint leaves a decoy afterimage (ghosts=${s.flickGhosts})`);
}
// UP — Sharingan Glare: foe gets stunned (no/low HP change).
{ await reset();
  const r = await spec("U"); await waitFrames(14);
  const foe = await p2();
  console.log(`  Sharingan Glare (${r?.move}): foe stun=${foe.stun} hitstun=${foe.hitstun}`);
  ok((foe.stun || 0) > 0 || (foe.hitstun || 0) > 0, `Sharingan Glare stuns the foe (stun=${foe.stun})`);
}
// DOWN — Shadow-Clone Pursuit: clone projectile damages the foe.
{ await reset(); const h0 = (await p2()).health;
  const r = await spec("D"); await waitFrames(44);
  const h1 = (await p2()).health;
  console.log(`  Shadow-Clone Pursuit (${r?.move}): foe ${Math.round(h0)}→${Math.round(h1)} (Δ${Math.round(h0-h1)})`);
  ok(h1 < h0, `Shadow-Clone Pursuit deals damage (Δ=${Math.round(h0-h1)})`);
}
// ULTIMATE — Shunshin: Thousand Shadows (via hook for a clean full-meter cast): big multi-hit + i-frames.
{ await reset(); const h0 = (await p2()).health;
  const r = await page.evaluate(() => window.__harness.shisuiFallenUlt("thousandShadows"));
  const inv = (await p1()).invulnTimer;
  await waitFrames(72);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  Thousand Shadows (hook): cast=${r.cast}, energy=${r.energy}, Δ${dmg}, invuln@cast=${inv}`);
  await page.screenshot({ path: path.join(OUT, "shisui_fallen_p2_ult.png") });
  ok(r.cast && r.energy <= 25, `Ultimate consumes meter`);
  ok(dmg >= 120, `Thousand Shadows deals heavy multi-hit damage (Δ=${dmg}, want ≥120)`);
  ok(inv > 0, `Thousand Shadows grants cinematic i-frames (invuln=${inv})`);
}
// Up+Ult (Kotoamatsukami, P4) + Down+Ult (Emerald Susanoo, P3) must NO-OP (meter NOT spent) so later phases can
// bind them. shisuiFallenUlt stamps the LIVE fighter's _ultVariant (full energy) then fires triggerUltimate.
{ await reset();
  const up = await page.evaluate(() => { const r = window.__harness.shisuiFallenUlt("kotoamatsukami"); return { ...r, koto: window.__harness.p2()?.kotoMirror || window.__harness.p1()?.kotoOverlay || 0 }; });
  console.log(`  Up+Ult (Kotoamatsukami, P4 — now LIVE): cast=${up.cast}, koto=${up.koto}, energy=${up.energy}`);
  ok(up.cast && up.energy <= 25, `Up+Ult fires Kotoamatsukami (Phase 4 wired)`);
  // neutral variant DOES fire (sanity on the dispatch).
  await reset();
  const ne = await page.evaluate(() => window.__harness.shisuiFallenUlt("thousandShadows"));
  ok(ne.cast && ne.energy <= 25, `neutral Thousand Shadows fires + spends meter (energy=${ne.energy})`);
  // Down+Ult now ENTERS the Emerald Susanoo (Phase 3 wired) — run last (leaves the giant active; harness ends).
  await reset();
  const dn = await page.evaluate(() => { const r = window.__harness.shisuiFallenUlt("emeraldSusanoo"); return { ...r, susano: window.__harness.shisuiFallenSusano("p1")?.active }; });
  console.log(`  Down+Ult (Emerald Susanoo, P3 — now LIVE): cast=${dn.cast}, susano=${dn.susano}, energy=${dn.energy}`);
  ok(dn.cast && dn.susano, `Down+Ult enters Emerald Susanoo (Phase 3 wired)`);
}

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Phase 2`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
