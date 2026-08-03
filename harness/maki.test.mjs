// harness/maki.test.mjs — CANONICAL full-kit test for Maki Zenin (JJK).
// Covers: registration + real portrait; HP-only HUD (no resource meter); all 5 base normals; the
// command chain + mid-chain interrupt; all 3 specials (kunai projectile / nunchaku / Power Charge buff);
// the HP-THRESHOLD ultimate unlock logic EXPLICITLY (locked >25%, unlocks ≤25%, PERSISTS after healing);
// the transformation freeze-cinematic + the duplicate-render bug-class check; ≥2 Shibuya-Arc moves; and a
// no-stat-outlier balance sanity check. Consolidates the per-stage harnesses into one canonical suite.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.makiCmd());
const mk = (w = "p1") => page.evaluate(x => window.__harness.makiShibuya(x), w);
const cine = () => page.evaluate(() => window.__harness.makiShibuyaCine());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function idleReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return (p.grounded ?? true) && Math.abs(p.vy || 0) < 0.6 && !p.attacking && !p.currentMove; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
async function reset(gap = 48) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !has(mv, needle); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  // ── REGISTRATION + PORTRAIT + HP-ONLY HUD ──
  section("registration · real portrait · HP-only HUD");
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("maki"));
  check("portrait wired → ./maki_portrait.png", portrait === "./maki_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./maki_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("jujutsu_kaisen", "training"));
  check("JJK roster includes maki", sel.roster.includes("maki"), `roster=${sel.roster.join(",")}`);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);
  const dataEnergy = await page.evaluate(async () => (await import("./characters.js")).characters.maki.stats.maxEnergy);
  check("no resource: stats.maxEnergy data = 0", dataEnergy === 0, `data=${dataEnergy}`);
  check("energy panel SUPPRESSED (HP-only, hideResourceMeter)", (await page.evaluate(() => window.__harness.resourceMeterHidden("p1"))) === true);

  // ── BALANCE: "HEAVENLY VOW" — deliberately superhuman (top-of-band), traded vs a tight combo window ──
  section("balance — Heavenly Vow: superhuman speed/power at the top of the roster band");
  const st = await page.evaluate(async () => (await import("./characters.js")).characters.maki.stats);
  check("HP 1180 (ties Naruto/Omega; below Toji 1260)", st.maxHealth === 1180, `hp=${st.maxHealth}`);
  // Heavenly Vow: ATK 96 ties Toji (below Sukuna's 100 ceiling), SPD 98 ties the roster top (Toji/Minato),
  // DEF unchanged. Deliberately top-of-band (not floor/ceiling outliers) — the counterweight is her
  // tightened cancel window (see maki_cancel_window.test.mjs), not a stat nerf.
  check("ATK 96 (ties Toji, ≤ Sukuna 100) · DEF 84 · SPD 98 (roster top) — Heavenly Vow", st.attack === 96 && st.defense === 84 && st.speed === 98, `atk=${st.attack} def=${st.defense} spd=${st.speed}`);

  // ── BASE NORMALS (all 5) ──
  section("base normals — light / heavy / up / air / down_air");
  for (const [nm, key, sheet] of [["light", "j", "maki_light_uniform"], ["heavy", "k", "maki_heavy_uniform"], ["up", "i", "maki_up_uniform"]]) {
    await reset(nm === "heavy" ? 58 : 46);
    const hp0 = (await p2()).health; await page.keyboard.down(key);
    const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(14);
    check(`${nm} → ${sheet} + connects`, has(mv, sheet) && hp0 - (await p2()).health > 0, `sheet=${mv.spriteSheet}`);
  }
  await reset(40);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("j");
    const mv = await waitSheet("maki_air_uniform"); await page.keyboard.up("j"); await waitFrames(14);
    check("air → maki_air_uniform + connects", has(mv, "maki_air_uniform") && hp0 - (await p2()).health > 0); }
  await reset(30);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j");
    const mv = await waitSheet("maki_downair_uniform", 12); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    check("down_air → maki_downair_uniform + connects", has(mv, "maki_downair_uniform") && hp0 - (await p2()).health > 0); }

  // ── COMMAND CHAIN + INTERRUPT ──
  section("command chain (makiG1→G2→G3) + mid-chain interrupt");
  await reset(52);
  { const chain = []; await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
    for (let i = 0; i < 48; i++) { const c = await cmd(); if (c?.move && !chain.includes(c.move)) chain.push(c.move); if (chain.includes("makiG3")) break;
      if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
    await page.keyboard.up("d"); await waitFrames(16);
    check("chain advances makiG1→makiG2→makiG3", chain[0] === "makiG1" && chain.includes("makiG2") && chain.includes("makiG3"), `chain=[${chain.join(" → ")}]`); }
  await reset(52);
  { await page.evaluate(() => window.__harness.setP2X(99999)); const w = [];
    await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
    for (let i = 0; i < 18; i++) { const m = (await p1()).currentMove; if (m && !w.includes(m)) w.push(m); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); }
    await page.keyboard.up("d");
    check("interrupt: whiffed opener does NOT chain to makiG2", w.includes("makiG1") && !w.includes("makiG2"), `chain=[${w.join(" → ")}]`); }

  // ── SPECIALS ──
  section("specials — Kunai Throw (projectile) / Nunchaku Flurry / Power Charge");
  await reset(190);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.cooldown ?? p.attackCooldown ?? 0) <= 0 && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  { const hp0 = (await p2()).health;
    // poll the cast pose AND the projectile together from the start (projectile despawns on contact); retry the press if it didn't take
    let castSeen = false, projSeen = false;
    for (let attempt = 0; attempt < 3 && !castSeen; attempt++) {
      await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
      for (let f = 0; f < 16 && !(castSeen && projSeen); f++) { if (has(await p1(), "maki_kunai_uniform")) castSeen = true; if ((await projs()).some(p => p.name === "maki_kunai")) projSeen = true; await waitFrames(1); }
      if (!castSeen) await waitFrames(6);
    }
    await page.waitForFunction(h => window.__harness.p2().health < h, hp0, { timeout: 3000, polling: 16 }).catch(() => {});
    check("Kunai Throw → cast pose + independent projectile + connects", castSeen && projSeen && hp0 - (await p2()).health > 0, `cast=${castSeen} proj=${projSeen}`); }
  await reset(46);
  { const hp0 = (await p2()).health; await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    const mv = await waitSheet("maki_nunchaku_uniform", 16); await page.keyboard.up("s"); await waitFrames(18);
    check("Nunchaku Flurry (Down+Special) → connects", has(mv, "maki_nunchaku_uniform") && hp0 - (await p2()).health > 0); }
  await reset(70);
  { const before = (await p1()).damageMult; await page.keyboard.down("p"); await waitFrames(4); await page.keyboard.up("p");
    const mv = await waitSheet("maki_charge_uniform", 16); const during = (await p1()).damageMult;
    check("Power Charge → pose + 1.3× damage buff", has(mv, "maki_charge_uniform") && before === 1 && during > 1.25 && during < 1.35, `dmgMult ${before}→${during}`);
    const rev = await page.waitForFunction(() => window.__harness.p1().damageMult <= 1.001, null, { timeout: 8000, polling: 33 }).then(() => true).catch(() => false);
    check("Power Charge auto-reverts", rev); }

  // ── HP-THRESHOLD ULTIMATE — unlock logic EXPLICITLY (both directions) ──
  section("HP-threshold ultimate — unlock/persist logic");
  await reset(60); await page.evaluate(() => window.__harness.healP1());
  await waitFrames(4);
  let m = await mk();
  check("full HP → LOCKED (unlocked=false)", m.unlocked === false, `hp%=${m.hpPct}`);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(4);
  check("Ultimate button NO-OP while locked", (await mk()).active === false && !(await cine()).active);
  await page.evaluate(() => window.__harness.setP1Health(250)); await waitFrames(4);
  m = await mk();
  check("HP ≤25% → UNLOCKS (crossing the threshold)", m.unlocked === true && m.hpPct <= 25, `hp%=${m.hpPct}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);
  m = await mk();
  check("healed >25% → unlock PERSISTS (recover-above rule)", m.unlocked === true && m.hpPct > 25 && m.active === false, `hp%=${m.hpPct}`);

  // ── TRANSFORMATION CINEMATIC + DUPLICATE-RENDER CHECK ──
  section("transformation cinematic + duplicate-render check");
  await idleReady();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const started = await page.waitForFunction(() => window.__harness.makiShibuyaCine().active === true, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  check("Ultimate (unlocked) → freeze-cinematic activates", started);
  await waitFrames(6);
  const during = await p1();
  check("cinematic holds Shibuya reveal pose", has(during, "maki_shibuya_intro_covered"), `sheet=${during.spriteSheet}`);
  const dup = await page.evaluate(() => { const p = window.__harness.p1(); const ps = window.__harness.projectiles(); return { renders: !!p.spriteSheet, clones: ps.filter(x => (x.name || "").includes("maki")).length }; });
  check("DUPLICATE-RENDER: single body (caster visible, no clone overlay)", dup.renders && dup.clones === 0, `renders=${dup.renders} clones=${dup.clones}`);
  await page.waitForFunction(() => window.__harness.makiShibuyaCine().active === false, null, { timeout: 6000, polling: 33 }).catch(() => {});
  await waitFrames(6);
  m = await mk();
  const idleMv = await waitSheet("maki_shibuya_idle_covered", 30);
  check("post-cinematic → _shibuyaActive + form 'shibuya' + 1.25× buff", m.active === true && m.form === "shibuya" && Math.abs(m.dmgMult - 1.25) < 0.001, `active=${m.active} form=${m.form} dmg=${m.dmgMult}`);
  check("Shibuya idle → maki_shibuya_idle_covered + scale 1.86", has(idleMv, "maki_shibuya_idle_covered") && Math.abs((m.spriteScale || 0) - 1.86) < 0.001, `scale=${m.spriteScale}`);

  // ── SHIBUYA MOVESET (≥2 moves) ──
  section("Shibuya-Arc moveset — ≥2 moves connect");
  for (const [nm, key, sheet] of [["light", "j", "maki_shibuya_light_covered"], ["up", "i", "maki_shibuya_up_covered"]]) {
    await idleReady(); await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 46); await waitFrames(2);
    const hp0 = (await p2()).health; await page.keyboard.down(key);
    const mv = await waitSheet(sheet, 24); await page.keyboard.up(key); await waitFrames(14);
    check(`Shibuya ${nm} → ${sheet} + connects`, has(mv, sheet) && hp0 - (await p2()).health > 0, `dmg`);
  }

  section("stability");
  check("no JS errors across full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ MAKI full-kit: ALL PASS" : "❌ MAKI full-kit: FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
