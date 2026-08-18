// harness/orochimaru.test.mjs — CANONICAL Orochimaru suite (mirrors hiruzen/isshiki/saitama canonical).
// Registration/gate/stats/portrait · movement & state · 4 hit tiers + 2 knockdowns · 3-part intro · 5
// normals + throw-weapon grab + Fwd/Aerial strongs · 3-stage command chain · all 8 specials · 3 alternate
// forms + fallback-chain sweep · Summon ULT (live-fighter cinematic) · the strong_forward/special_move_01
// DUPLICATE no-double-register check · a fallback-box sweep (EVERY action renders a real orochimaru sheet).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.orochimaruForm?.(null); window.__harness.forceAction(null); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }
async function normal(key, gap, { lift = 0, down = false } = {}) { await prep(gap); if (lift) await page.evaluate(dy => window.__harness.liftP1(dy), lift); if (down) { await page.keyboard.down("s"); await wf(1); } const hp0 = (await p2()).health; let sheet = null; await page.keyboard.down(key); for (let i = 0; i < 9; i++) { const a = await p1(); if (a.attacking && a.spriteSheet) sheet = a.spriteSheet; await wf(1); } await page.keyboard.up(key); if (down) await page.keyboard.up("s"); return { dmg: hp0 - (await p2()).health, sheet }; }
async function airNormal(key, gap, opts, tries = 5) { let best = { dmg: 0, sheet: null }; for (let i = 0; i < tries; i++) { const r = await normal(key, gap, opts); if (r.dmg > best.dmg) best = r; if (r.dmg > 0) break; } return best; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=orochimaru&p2=orochimaru`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait");
  const g = await p1();
  check("P1 is Orochimaru", g.key === "orochimaru", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, `box=${!g.hasSpriteHandler}`);
  check("idle sheet = orochimaru_idle_uniform", (g.spriteSheet || "").includes("orochimaru_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.6", Math.abs((g.spriteScale || 0) - 2.6) < 0.01, `${g.spriteScale}`);
  check("HP 1180 / EN 210 (versatility technician)", g.maxHealth === 1180 && g.maxEnergy === 210, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("orochimaru"));
  check("portrait wired to ./orochimaru_portrait.png", (portrait || "").includes("orochimaru_portrait"), `portrait=${portrait}`);
  check("portrait file exists on disk", fs.existsSync(path.join(ROOT, "orochimaru_portrait.png")), "");
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.(window.__harness.p1()) ?? null);
  check("energy label = Chakra", energyLabel === "Chakra", `label=${energyLabel}`);

  section("movement / state + hit tiers + knockdowns (render real sheets)");
  const STATE = [["run", "orochimaru_run_uniform"], ["dash", "orochimaru_run_uniform"], ["jump", "orochimaru_jump_uniform"], ["doubleJump", "orochimaru_jump_uniform"], ["guard", "orochimaru_guard_uniform"], ["guardAir", "orochimaru_guardair_uniform"], ["hurt", "orochimaru_hurt_uniform"], ["hurtSpecial", "orochimaru_hurt_special_uniform"], ["hurtHeavy1", "orochimaru_hurt_heavy1_uniform"], ["hurtHeavy2", "orochimaru_hurt_heavy2_uniform"], ["knockdown", "orochimaru_knockdown_uniform"], ["knockdownAgainst", "orochimaru_knockdown_against_uniform"]];
  for (const [act, tag] of STATE) { await force(act); await wf(3); const r = await p1(); check(`${act} → ${tag}`, !!r.hasSpriteHandler && (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`); await force(null); await wf(1); }

  section("3-part intro sequence");
  for (const [v, tag] of [["intro1", "orochimaru_intro1_uniform"], ["intro2", "orochimaru_intro2_uniform"], ["intro3", "orochimaru_intro3_uniform"]]) { await page.evaluate(x => window.__harness.forceIntro(x), v); await page.evaluate(() => { const l = document.getElementById("loading"); if (l) l.classList.add("hidden"); }); await wf(5); const r = await p1(); check(`${v} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`); }
  await page.evaluate(() => window.__harness.boot()); await wf(4);

  section("5 normals + grab + bonus strongs connect");
  const L = await normal("j", 60); check("light connects → snake-whip", L.dmg > 0 && (L.sheet || "").includes("orochimaru_light_uniform"), `dmg=${L.dmg.toFixed(0)}`);
  const H = await normal("k", 90); check("heavy connects → Kusanagi thrust ≥ light", H.dmg > 0 && H.dmg >= L.dmg && (H.sheet || "").includes("orochimaru_heavy_uniform"), `L=${L.dmg.toFixed(0)} H=${H.dmg.toFixed(0)}`);
  const U = await normal("i", 64); check("up connects → launcher", U.dmg > 0 && (U.sheet || "").includes("orochimaru_up_uniform"), `dmg=${U.dmg.toFixed(0)}`);
  const A = await airNormal("j", 72, { lift: 68 }); check("air connects", A.dmg > 0 && (A.sheet || "").includes("orochimaru_air_uniform"), `dmg=${A.dmg.toFixed(0)}`);
  const D = await airNormal("j", 60, { lift: 72, down: true }); check("down_air connects", D.dmg > 0 && (D.sheet || "").includes("orochimaru_downair_uniform"), `dmg=${D.dmg.toFixed(0)}`);
  const AS = await airNormal("k", 76, { lift: 70 }); check("Aerial Strong (air+Heavy) connects", AS.dmg > 0 && (AS.sheet || "").includes("orochimaru_airstrong_uniform"), `dmg=${AS.dmg.toFixed(0)}`);
  // grab (throw-weapon)
  await prep(46); const gh0 = (await p2()).health; let castThrow = false; await page.keyboard.down("o"); await wf(2); for (let i = 0; i < 4; i++) { if (((await p1()).spriteSheet || "").includes("orochimaru_throw")) castThrow = true; await wf(1); } await page.keyboard.up("o"); for (let i = 0; i < 40; i++) await wf(1); check("grab (throw-weapon) cast pose + throw connects", castThrow && (gh0 - (await p2()).health) > 0, `cast=${castThrow} dmg=${(gh0 - (await p2()).health).toFixed(0)}`);

  section("3-stage command chain (Fwd+Heavy)");
  await prep(70); const chp0 = (await p2()).health; const stages = new Set(); await page.keyboard.down("d"); await wf(2);
  for (let tap = 0; tap < 3; tap++) { await page.keyboard.down("k"); await wf(2); await page.keyboard.up("k"); for (let i = 0; i < 7; i++) { const a = await p1(); if (a.currentMove && a.currentMove.startsWith("orochimaru")) stages.add(a.currentMove); await wf(1); } }
  await page.keyboard.up("d");
  check("chain: opener + ≥1 chain stage + aggregate dmg", stages.has("orochimaruFwdStrong") && (stages.has("orochimaruChain2") || stages.has("orochimaruChain3")) && (chp0 - (await p2()).health) > 0, `stages=${[...stages].join(",")}`);

  section("all 8 specials fire the right cast/move (deterministic)");
  const GSPEC = [[null, "orochimaruSnakeSpit", "cast"], ["F", "orochimaruSwordLunge", "move"], ["B", "orochimaruSwordThrow", "cast"], ["U", "orochimaruTailSweep", "move"], ["D", "orochimaruSlam", "move"]];
  for (const [dir, name, kind] of GSPEC) { await prep(90); const r = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir); check(`GROUND ${dir || "neutral"} → ${name}`, r?.[kind] === name, `${JSON.stringify(r)}`); await wf(6); }
  const ASPEC = [[null, "orochimaruSnakeLunge", "move"], ["F", "orochimaruSnakeBarrage", "cast"], ["B", "orochimaruCoil", "move"]];
  for (const [dir, name, kind] of ASPEC) { await prep(90); await page.evaluate(() => window.__harness.liftP1(72)); const r = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir); check(`AIR ${dir || "neutral"} → ${name}`, r?.[kind] === name, `${JSON.stringify(r)}`); await wf(6); }
  // one representative projectile-connect (neutral snake spit at long range)
  await prep(150); const sh0 = (await p2()).health; await page.evaluate(() => window.__harness.p1SpecialDir(null)); let snakeProj = false; for (let i = 0; i < 40; i++) { if ((await projs()).some(p => (p.name || "") === "oroSnake")) snakeProj = true; await wf(1); } check("Snake Spit projectile spawns + connects at range", snakeProj && (sh0 - (await p2()).health) > 0, `proj=${snakeProj}`);

  section("3 alternate forms + fallback-chain sweep (merged _skinAnim, no 128² box)");
  for (const [id, idleTag, runTag] of [["host", "orochimaru_form_idle_uniform", "orochimaru_form_run_uniform"], ["white", "orochimaru_form_white_idle_uniform", "orochimaru_form_white_run_uniform"], ["serpent", "orochimaru_form_serpent_idle_uniform", "orochimaru_form_serpent_run_uniform"]]) {
    await prep(90); const r = await page.evaluate(i => window.__harness.orochimaruForm(i), id);
    const sRun = await page.evaluate(() => window.__harness.oroSkinSheet("run")), sJump = await page.evaluate(() => window.__harness.oroSkinSheet("jump")), sHurt = await page.evaluate(() => window.__harness.oroSkinSheet("hurt"));
    check(`${id}: transform + merged _skinAnim (run=form, jump/hurt=base fallback)`, r.form === id && (r.skinIdle || "").includes(idleTag) && (sRun || "").includes(runTag) && (sJump || "").includes("orochimaru_jump_uniform") && (sHurt || "").includes("orochimaru_hurt_uniform"), `idle=${r.skinIdle} run=${sRun} jump=${sJump}`);
    await wf(34);
    for (const [act, tag] of [["run", runTag], ["jump", "orochimaru_jump_uniform"], ["hurt", "orochimaru_hurt_uniform"]]) { await force(act); await wf(3); const a = await p1(); check(`${id} ${act} renders (no box)`, !!a.hasSpriteHandler && (a.spriteSheet || "").includes(tag), `sheet=${a.spriteSheet}`); }
    await force(null); await page.evaluate(() => window.__harness.orochimaruForm(null)); await wf(34);
  }

  section("Summon ULTIMATE — live-fighter cinematic + guaranteed payoff");
  await prep(150); const ue0 = (await p1()).energy, uhp0 = (await p2()).health; const keyB = (await p1()).key;
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); await wf(2);
  let castU = false; const gU = await p1(); for (let i = 0; i < 16; i++) { if (((await p1()).spriteSheet || "").includes("orochimaru_ult_cast")) { castU = true; break; } await wf(1); }
  check("ult on LIVE p1 (cast pose + summon timer, no dup)", castU && (gU.oroSummon || 0) > 0 && gU.key === "orochimaru" && gU.key === keyB, `cast=${castU} timer=${gU.oroSummon}`);
  check("ult spent 100 chakra", ue0 - gU.energy >= 95, `spent=${(ue0 - gU.energy).toFixed(0)}`);
  let cineRan = false; for (let i = 0; i < 20; i++) { if ((await page.evaluate(() => window.__harness.oroSummonCine())).renders > 0) cineRan = true; await wf(2); }
  for (let i = 0; i < 20; i++) await wf(1);
  const uDmg = uhp0 - (await p2()).health;
  check("serpent cinematic ran + guaranteed ~210 EFF payoff", cineRan && uDmg > 150 && uDmg < 260, `cine=${cineRan} dmg=${uDmg.toFixed(0)}`);

  section("DUPLICATE resolution — strong_forward / special_move_01 not double-registered");
  const oroFiles = fs.readdirSync(ROOT).filter(f => f.startsWith("orochimaru_") && f.endsWith(".png"));
  check("Forward Strong sheet exists (sourced from p1_strong_attack_forward)", oroFiles.includes("orochimaru_fwdstrong_uniform.png"), "");
  check("no orochimaru sheet derived from special_move_01 (not imported)", !oroFiles.some(f => f.includes("special_move_01") || f.includes("specialmove01") || f.includes("special01")), `files=${oroFiles.length}`);
  // Fire the specials again and assert NONE re-registers the Forward Strong command-normal as a special move.
  await prep(90); const specMoves = new Set();
  for (const dir of [null, "F", "B", "U", "D"]) { await prep(90); const r = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir); if (r?.move) specMoves.add(r.move); if (r?.cast) specMoves.add(r.cast); await wf(6); }
  check("no special duplicates the Forward Strong (orochimaruFwdStrong is command-normal only)", !specMoves.has("orochimaruFwdStrong"), `specials=${[...specMoves].join(",")}`);

  section("FALLBACK-BOX SWEEP — every action renders a real orochimaru sheet");
  await prep(120);
  const ALL = ["idle", "walk", "run", "dash", "jump", "fall", "doubleJump", "guard", "guardAir", "hurt", "hurtSpecial", "hurtHeavy1", "hurtHeavy2", "knockdown", "knockdownAgainst", "intro1", "intro2", "intro3", "light", "heavy", "up", "air", "down_air", "air_heavy", "orochimaruFwdStrong", "orochimaruThrow", "orochimaruChain2", "orochimaruChain3", "orochimaruSnakeSpit", "orochimaruSwordLunge", "orochimaruSwordThrow", "orochimaruTailSweep", "orochimaruSlam", "orochimaruSnakeLunge", "orochimaruSnakeBarrage", "orochimaruCoil", "orochimaruShed", "orochimaruSummonCast"];
  let boxed = [];
  for (const act of ALL) { await force(act); await wf(2); const a = await p1(); if (!a.hasSpriteHandler || !(a.spriteSheet || "").includes("orochimaru")) boxed.push(`${act}:${a.spriteSheet}`); await force(null); }
  check(`all ${ALL.length} actions render a real orochimaru sheet (0 fallback boxes)`, boxed.length === 0, boxed.slice(0, 6).join(" | "));

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ OROCHIMARU canonical: ${PASS} passed, ${FAIL} failed ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
