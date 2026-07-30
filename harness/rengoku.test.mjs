// harness/rengoku.test.mjs — CANONICAL full-kit test for Kyojuro Rengoku (2nd Demon Slayer char).
// Covers registration + portrait, movement/state + the 2-part intro, all 5 normals, the branching
// "Flame Breathing" ground + air combo chains WITH super-finisher branches + a mid-chain interrupt,
// the Charged Flame Strike (BOTH tap/hold tiers + puches recovery tail), the reactive Counter
// (negate + riposte), the Flame Explosion freeze-cinematic Ultimate (cooldown-gated, range-independent),
// a FALLBACK-BOX SWEEP (every wired action → real rengoku_* sheet; confirmed-missing states absent),
// and a no-JS-error check.
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
const cine = () => page.evaluate(() => window.__harness.rengokuUltCine());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 56) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); window.__harness.resetUlt?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function waitFlameCd() { await page.waitForFunction(() => (window.__harness.p1().flameCd ?? 0) <= 0, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
// Drive a combo chain: opener Fwd+Heavy, then each recovery tap Heavy (continue) unless branchAt maps
// the current stage → "l" (Special super-branch).
async function driveChain({ air = false, branchAt = {} } = {}) {
  await reset(air ? 40 : 44);
  const hp0 = (await p2()).health; const chain = [];
  if (air) await page.evaluate(() => window.__harness.liftP1(52));
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 90; i++) {
    const c = await p1();
    if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove);
    if (!c.attacking) break;
    if (c.attackPhase === "recovery") { const key = branchAt[c.currentMove] || "k"; await page.keyboard.down(key); await waitFrames(1); await page.keyboard.up(key); await waitFrames(1); }
    else await waitFrames(1);
  }
  await page.keyboard.up("d"); await waitFrames(8);
  return { chain, dmg: hp0 - (await p2()).health };
}

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=rengoku&p2=rengoku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("rengoku"));
  check("rengoku.portrait wired", portrait === "./rengoku_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./rengoku_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("demon_slayer", "training"));
  check("Demon Slayer universe includes rengoku", sel.roster.includes("rengoku"), `roster=${sel.roster.join(",")}`);

  // ── INTRO (two independent STATIONARY intros, random-cycled — NOT a tracked dash-in) ──
  section("intro (stationary random-cycle pool: introRunIn / intro2)");
  await page.mouse.click(640, 360);
  // Both variants play at his fixed start position — force each and assert real sheet + zero travel.
  for (const [v, needle] of [["intro2", "rengoku_intro_2"], ["introRunIn", "rengoku_intro_run"]]) {
    await page.evaluate(vv => window.__harness.forceIntro(vv), v);
    await waitFrames(2);
    const x0 = (await p1()).x; let mv = await p1();
    for (let i = 0; i < 5 && !has(mv, needle); i++) { await waitFrames(1); mv = await p1(); }
    let maxTravel = 0; for (let i = 0; i < 5; i++) { await waitFrames(2); maxTravel = Math.max(maxTravel, Math.abs((await p1()).x - x0)); }
    check(`intro ${v} → ${needle} + STATIONARY (no positional travel)`, mv.introVariant === v && has(mv, needle) && maxTravel <= 2, `sheet=${mv.spriteSheet} travel=${maxTravel}px`);
  }
  // Random cycling: several starts should surface BOTH pool entries.
  const picks = [];
  for (let i = 0; i < 14; i++) { await page.evaluate(() => window.__harness.start()); await waitFrames(3); picks.push((await p1()).introVariant); }
  check("random-cycle pool surfaces BOTH intros across starts", picks.includes("introRunIn") && picks.includes("intro2"), `picks=${JSON.stringify(picks.reduce((m, p) => ((m[p] = (m[p] || 0) + 1), m), {}))}`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
  let a = await p1();
  check("P1 is Rengoku (sprites)", a.key === "rengoku" && a.hasSpriteHandler, `key=${a.key}`);

  // ── MOVEMENT / STATE ──
  section("movement / state");
  await idleReady(); a = await p1();
  check("idle → rengoku_idle_uniform", has(a, "rengoku_idle_uniform"), `sheet=${a.spriteSheet}`);
  await page.keyboard.down("d"); await waitFrames(8); a = await p1();
  check("walk/run → rengoku_run_uniform", has(a, "rengoku_run_uniform"), `sheet=${a.spriteSheet}`); await page.keyboard.up("d"); await waitFrames(4);
  await waitGrounded(); await page.keyboard.press("d"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(3); a = await p1();
  check("dash → rengoku dash/run sheet", has(a, "rengoku_dash_uniform") || has(a, "rengoku_run_uniform"), `sheet=${a.spriteSheet}`); await page.keyboard.up("d"); await waitFrames(4);
  await waitGrounded(); await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(3); a = await p1();
  check("jump → rengoku_jump_uniform", has(a, "rengoku_jump_uniform"), `sheet=${a.spriteSheet}`); await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(10); a = await p1();
  check("guard → rengoku_block_uniform", a.action === "guard" && has(a, "rengoku_block_uniform"), `action=${a.action}`); await page.keyboard.up("s"); await waitFrames(4);
  await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(2); a = await p1();
  check("hurt → rengoku_hit_uniform", a.action === "hurt" && has(a, "rengoku_hit_uniform"), `action=${a.action}`);
  await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

  // ── NORMALS ──
  section("5 normals connect");
  for (const [nm, key, sheet] of [["light", "j", "rengoku_foward_slash_uniform"], ["heavy", "k", "rengoku_down_attack_uniform"], ["upAttack", "i", "rengoku_up_attack_uniform"]]) {
    await reset(58); const hp0 = (await p2()).health;
    await page.keyboard.down(key); const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(20);
    check(`${nm} → ${sheet} + connects`, has(mv, sheet) && (await p2()).health < hp0, `sheet=${mv.spriteSheet}`);
  }
  await reset(52); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(44)); await page.keyboard.down("j"); const mv = await waitSheet("rengoku_combo_air_1_uniform"); await page.keyboard.up("j"); await waitFrames(14);
    check("air → rengoku_combo_air_1_uniform + connects", has(mv, "rengoku_combo_air_1_uniform") && (await p2()).health < hp0, ""); }
  await reset(30); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(50)); await page.keyboard.down("s"); await page.keyboard.down("j"); const mv = await waitSheet("rengoku_down_air_attack_uniform", 8); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    check("down_air → rengoku_down_air_attack_uniform + connects", has(mv, "rengoku_down_air_attack_uniform") && (await p2()).health < hp0, ""); }

  // ── COMBO CHAINS + SUPER BRANCHES + INTERRUPT ──
  section("Flame Breathing chains (ground + air) + super branches + interrupt");
  { const r = await driveChain({});
    check("ground chain G1→G2→G3", r.chain[0] === "rengokuG1" && r.chain.includes("rengokuG2") && r.chain.includes("rengokuG3"), `[${r.chain.join("→")}]`); }
  { const r = await driveChain({ branchAt: { rengokuG2: "l" } });
    check("ground super branch G2→(Special)→SuperFwd", r.chain.includes("rengokuSuperFwd") && !r.chain.includes("rengokuG3"), `[${r.chain.join("→")}]`); }
  { const r = await driveChain({ branchAt: { rengokuG3: "l" } });
    check("ground super branch G3→(Special)→SuperDown", r.chain.includes("rengokuG3") && r.chain.includes("rengokuSuperDown"), `[${r.chain.join("→")}]`); }
  { const r = await driveChain({ air: true });
    check("air chain A1→ABridge→A2", r.chain[0] === "rengokuA1" && r.chain.includes("rengokuABridge") && r.chain.includes("rengokuA2"), `[${r.chain.join("→")}]`); }
  { const r = await driveChain({ air: true, branchAt: { rengokuA2: "l" } });
    check("air super branch A2→(Special)→SuperAir", r.chain.includes("rengokuSuperAir"), `[${r.chain.join("→")}]`); }
  // interrupt: whiff opener → Heavy must NOT advance
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); });
  { const b = await p1(); await page.evaluate(x => window.__harness.setP2X(x + 620), b.x); }
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const open = (await p1()).currentMove;
  let inRec = false; for (let i = 0; i < 40; i++) { const p = await p1(); if (!p.attacking) break; if (p.attackPhase === "recovery") { inRec = true; break; } await waitFrames(1); }
  if (inRec) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); }
  const after = (await p1()).currentMove; await page.keyboard.up("d");
  check("mid-chain interrupt: whiff opener does NOT advance", open === "rengokuG1" && after !== "rengokuG2", `open=${open} after=${after}`);

  // ── CHARGED FLAME STRIKE (both tiers + recovery tail) ──
  section("Charged Flame Strike (tap/hold tiers + puches recovery tail)");
  await reset(56); await waitFlameCd(); await idleReady();
  await page.keyboard.down("p"); const wmv = await waitSheet("rengoku_charge_uniform", 10);
  check("hold CHARGE → rengoku_charge_uniform windup", has(wmv, "rengoku_charge_uniform"), `action=${wmv.action}`);
  await page.keyboard.up("p"); await waitFrames(24); await waitFlameCd(); await idleReady();
  // TAP tier
  await reset(56); let hp0 = (await p2()).health;
  await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p");
  { const mv = await waitSheet("rengoku_charge_hit_1_uniform", 20); await waitFrames(6);
    check("TAP release → rengokuCharge1 + connects", has(mv, "rengoku_charge_hit_1_uniform"), `sheet=${mv.spriteSheet}`); }
  await waitFrames(10); const tapDmg = hp0 - (await p2()).health;
  check("TAP flame strike deals damage", tapDmg > 0, `dmg=${tapDmg}`);
  { const tail = await waitSheet("rengoku_puches_uniform", 20); check("recovery tail → rengoku_puches_uniform", has(tail, "rengoku_puches_uniform"), `sheet=${tail.spriteSheet}`); }
  await waitFlameCd(); await idleReady();
  // HOLD tier
  await reset(56); hp0 = (await p2()).health;
  await page.keyboard.down("p"); await waitFrames(20); await page.keyboard.up("p");
  { const mv = await waitSheet("rengoku_charge_hit_2_uniform", 24); await waitFrames(8);
    check("HOLD release → rengokuCharge2 (wide arc)", has(mv, "rengoku_charge_hit_2_uniform"), `sheet=${mv.spriteSheet}`); }
  await waitFrames(12); const holdDmg = hp0 - (await p2()).health;
  check("HOLD tier hits harder than TAP tier", holdDmg > tapDmg, `hold=${holdDmg} tap=${tapDmg}`);
  await waitFlameCd(); await idleReady();

  // ── COUNTER (reactive parry/riposte) ──
  section("Counter (reactive parry/riposte)");
  await reset(52);
  const cp1 = (await p1()).health, cp2 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  { const cmv = await waitSheet("rengoku_foward_attack_charge_uniform", 6); check("Special → counter stance", has(cmv, "rengoku_foward_attack_charge_uniform"), `sheet=${cmv.spriteSheet}`); }
  await page.evaluate(() => window.__harness.p2Attack());
  await waitFrames(16);
  const cp1b = (await p1()).health, p2n = await p2();
  check("counter NEGATES the incoming hit (0 damage taken)", cp1b === cp1, `p1 ${cp1}→${cp1b}`);
  check("counter RIPOSTES (attacker damaged)", p2n.health < cp2, `p2 ${cp2}→${p2n.health}`);

  // ── ULTIMATE (Flame Explosion freeze-cinematic) ──
  section("Ultimate: Flame Explosion (freeze-cinematic, cooldown-gated, range-independent)");
  await reset(600);
  const uhp = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
  let st = await cine();
  check("U fires Flame Explosion cinematic (caster=rengoku)", st.active && st.casterKey === "rengoku", `active=${st.active}`);
  check("explosion sprite plays through freeze", has(await p1(), "rengoku_ultimate_explosion_uniform"), "");
  check("ultimate is COOLDOWN-gated (not energy)", ((await p1()).ultCooldown || 0) > 0, `ultCd=${(await p1()).ultCooldown}`);
  await page.waitForFunction(() => window.__harness.rengokuUltCine().struck === true || window.__harness.rengokuUltCine().active === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => window.__harness.rengokuUltCine().active === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(6);
  check("guaranteed detonation damage lands (range-independent ~340)", (uhp - (await p2()).health) >= 320, `−${uhp - (await p2()).health} @600px`);
  check("cinematic ends, combat resumes", (await cine()).active === false && !has(await p1(), "rengoku_ultimate_explosion_uniform"), "");

  // ── FALLBACK-BOX SWEEP (every wired action → real rengoku_* sheet; missing states absent) ──
  section("fallback-box sweep (every wired action → real sheet; confirmed-missing states absent)");
  const anim = await page.evaluate(async () => { const m = await import("./characters.js"); return m.characters?.rengoku?.animationData || {}; });
  const keys = Object.keys(anim);
  let allReal = true, badKey = null;
  for (const k of keys) {
    const sheet = anim[k]?.sheet;
    if (!sheet || !/^\.\/rengoku_.*\.png$/.test(sheet)) { allReal = false; badKey = `${k}=${sheet}`; break; }
    const ok = await page.evaluate(async s => { const i = new Image(); i.src = s; try { await i.decode(); return i.naturalWidth > 0; } catch { return false; } }, sheet);
    if (!ok) { allReal = false; badKey = `${k} art missing (${sheet})`; break; }
  }
  check(`all ${keys.length} wired actions → real rengoku_* sheets (no fallback box)`, allReal, badKey ? `bad: ${badKey}` : "");
  const missing = ["dizzy", "crouch", "win", "lose"].filter(k => !(k in anim));
  check("confirmed-missing states are ABSENT (not invented): dizzy/crouch/win/lose", missing.length === 4, `absent=[${missing.join(",")}]`);

  check("no JS page errors across full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test harness ran without throwing", false, String(e));
}

console.log(`\n════════════════════════════════════════`);
console.log(`  RENGOKU full-kit: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
