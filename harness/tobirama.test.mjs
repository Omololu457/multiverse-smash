// harness/tobirama.test.mjs — CANONICAL full-kit test for Tobirama Senju.
// Covers registration + portrait, every movement/state, all 5 normals, the taijutsu command
// chain + 2 pokes, all 6 water/space-time specials, and a FALLBACK-BOX SWEEP (every move must
// resolve to its dedicated tobirama_*_uniform sheet — never the 128² procedural box / null).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const seen = new Map();   // action → sheet, accumulated for the fallback-box sweep

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
function rec(mv) { if (mv && mv.action) seen.set(mv.action, mv.spriteSheet || null); return mv; }
// Poll for the expected sheet over a few frames (robust vs input-buffer/startup timing).
async function waitSheet(needle, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return rec(mv); }
async function waitAction(name, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && mv.action !== name; f++) { await waitFrames(1); mv = await p1(); } return rec(mv); }
async function waitProj(name, maxF = 24) { let pr = await projs(); for (let f = 0; f < maxF && !pr.some(p => p.name === name); f++) { await waitFrames(1); pr = await projs(); } return pr.find(p => p.name === name) || null; }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function adjacent(gap) { await idleReady(); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP1Energy?.(200); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

try {
  // ── REGISTRATION + PORTRAIT ──────────────────────────────────────────
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("tobirama"));
  check("tobirama.portrait wired", portrait === "./tobirama_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./tobirama_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
  check("naruto roster includes tobirama", sel.roster.includes("tobirama"), `roster=${sel.roster.join(",")}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "tobirama_charselect.png") });

  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── MOVEMENT / STATE ─────────────────────────────────────────────────
  section("movement / state");
  await idleReady();
  check("P1 is Tobirama (sprites)", (await p1()).key === "tobirama" && (await p1()).hasSpriteHandler, "");
  rec(await p1()); check("idle → idle_uniform", (seen.get("idle") || "").includes("tobirama_idle_uniform"), `sheet=${seen.get("idle")}`);
  await page.keyboard.down("d"); await waitSheet("tobirama_run_uniform"); await page.keyboard.up("d");
  check("run (advance) → run_uniform", (seen.get("run") || "").includes("tobirama_run_uniform"), `sheet=${seen.get("run")}`);
  await idleReady(); await page.keyboard.down("a"); await waitSheet("tobirama_walk_uniform"); await page.keyboard.up("a");
  check("walk (retreat) → walk_uniform", (seen.get("walk") || "").includes("tobirama_walk_uniform"), `sheet=${seen.get("walk")}`);
  await idleReady(); await page.keyboard.press("d"); await waitFrames(3); await page.keyboard.press("d"); await waitSheet("tobirama_dash_uniform", 8);
  check("dash flicker → dash_uniform", (seen.get("dash") || "").includes("tobirama_dash_uniform"), `sheet=${seen.get("dash")}`);
  await idleReady(); await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w"); await waitSheet("tobirama_jump_uniform", 8);
  check("jump → jump_uniform", (seen.get("jump") || "").includes("tobirama_jump_uniform"), `sheet=${seen.get("jump")}`);
  await waitGrounded(); await page.keyboard.down(";"); await waitSheet("tobirama_block_uniform"); await page.keyboard.up(";");   // MK-feel Stage 1c: dedicated guard key (Down no longer blocks)
  check("guard → block_uniform", (seen.get("guard") || "").includes("tobirama_block_uniform"), `sheet=${seen.get("guard")}`);
  await idleReady(); await page.evaluate(() => window.__harness.hurtP1(24)); await waitSheet("tobirama_hit_uniform"); await page.evaluate(() => window.__harness.healP1?.());
  check("hurt → hit_uniform", (seen.get("hurt") || "").includes("tobirama_hit_uniform"), `sheet=${seen.get("hurt")}`);
  await idleReady(); await page.evaluate(() => window.__harness.knockdownP1?.()); await waitAction("knockdown"); await page.evaluate(() => window.__harness.healP1?.());
  check("knockdown → hit_uniform", (seen.get("knockdown") || "").includes("tobirama_hit_uniform"), `sheet=${seen.get("knockdown")}`);
  // (intro is captured LAST — forceIntro parks the game in the INTRO state, so it must not precede combat)

  // ── NORMALS ──────────────────────────────────────────────────────────
  section("normals (fire + connect)");
  for (const [name, key, sheet] of [["light", "j", "tobirama_low_kick_uniform"], ["heavy", "k", "tobirama_strongz_foward_attack_uniform"], ["up", "i", "tobirama_up_kick_uniform"]]) {
    await adjacent(60); const hp0 = (await p2()).health;
    await page.keyboard.down(key); const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(20);
    check(`${name} → ${sheet} + connect`, (mv.spriteSheet || "").includes(sheet) && (await p2()).health < hp0, `sheet=${mv.spriteSheet}`);
  }
  await adjacent(46); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(40)); await page.keyboard.down("j"); const mv = await waitSheet("tobirama_super_up_kick_uniform"); await page.keyboard.up("j"); await waitFrames(14); check("air → super_up_kick_uniform + connect", (mv.spriteSheet || "").includes("tobirama_super_up_kick_uniform") && (await p2()).health < hp0, `sheet=${mv.spriteSheet}`); }
  await waitGrounded(); await adjacent(30); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j"); const mv = await waitSheet("tobirama_down_air_kick_uniform"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14); check("down_air → down_air_kick_uniform + connect", (mv.spriteSheet || "").includes("tobirama_down_air_kick_uniform") && (await p2()).health < hp0, `sheet=${mv.spriteSheet}`); }

  // ── COMMAND CHAIN + POKES ────────────────────────────────────────────
  section("command chain + pokes");
  await adjacent(40);
  const chain = []; const chp0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 48; i++) { const c = rec(await p1()); if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove); if (chain.includes("tobiComboFin")) break; if (c.rekkaNext && c.cmdHitLanded && c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(20);
  check("chain combo1→combo2→comboFin", chain.includes("tobiCombo1") && chain.includes("tobiCombo2") && chain.includes("tobiComboFin"), `chain=[${chain.join(" → ")}]`);
  check("chain dealt damage", (await p2()).health < chp0, `Δ=${chp0 - (await p2()).health}`);
  await adjacent(56); { const hp0 = (await p2()).health; await page.keyboard.down("d"); await page.keyboard.down("j"); const mv = await waitSheet("tobirama_strong_upper_attack_kick_uniform"); await page.keyboard.up("j"); await page.keyboard.up("d"); await waitFrames(16); check("poke Fwd+Light = tobiStrongFwd + connect", mv.currentMove === "tobiStrongFwd" && (await p2()).health < hp0, `move=${mv.currentMove}`); }
  await adjacent(40); { const hp0 = (await p2()).health; await page.keyboard.down("a"); await page.keyboard.down("k"); const mv = await waitSheet("tobirama_upper_knee_attack_uniform"); await page.keyboard.up("k"); await page.keyboard.up("a"); await waitFrames(16); check("poke Back+Heavy = tobiRisingKnee + connect", mv.currentMove === "tobiRisingKnee" && (await p2()).health < hp0, `move=${mv.currentMove}`); }

  // ── SPECIALS ─────────────────────────────────────────────────────────
  section("specials (fire + effect)");
  await adjacent(160); { const hp0 = (await p2()).health; await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); rec(await p1()); const wd = await waitProj("tobiWaterDragon"); await waitFrames(24); check("Water Dragon proj + hit", !!wd && (await p2()).health < hp0, `hp0=${hp0}`); }
  await adjacent(70); { const hp0 = (await p2()).health; await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); const mv = await waitSheet("tobirama_foward_water_slash_uniform"); await page.keyboard.up("l"); await page.keyboard.up("d"); await waitFrames(14); check("Forward Water Slash + connect", mv.currentMove === "tobiWaterSlash" && (await p2()).health < hp0, `move=${mv.currentMove}`); }
  await adjacent(44); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(38)); await page.keyboard.down("l"); const mv = await waitSheet("tobirama_water_up_attack_uniform"); await page.keyboard.up("l"); await waitFrames(14); check("Rising Water (air) + connect", mv.currentMove === "tobiRisingWater" && (await p2()).health < hp0, `move=${mv.currentMove}`); }
  await adjacent(150); { const hp0 = (await p2()).health; await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); rec(await p1()); await page.keyboard.up("l"); const ww = await waitProj("tobiWaterWall"); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + (a.facing >= 0 ? 60 : -60)); await waitFrames(16); check("Water Wall barrier + damage", !!ww && (await p2()).health < hp0, `wall=${!!ww}`); await page.keyboard.up("s"); }
  await adjacent(150); { const hp0 = (await p2()).health; await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); rec(await p1()); await page.keyboard.up("l"); const dk = await waitProj("tobiDarkness"); await page.keyboard.up("a"); await waitFrames(20); check("Darkness orb + hit", !!dk && (await p2()).health < hp0, `dark=${!!dk}`); }
  await adjacent(60); { const x0 = (await p1()).x; await page.evaluate(() => window.__harness.hurtP1(40)); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); const mv = rec(await p1()); check("Water Flicker escape (reversal)", mv.action === "tobiWaterFlicker" && mv.hitstun === 0 && mv.x < x0 - 40, `action=${mv.action} hitstun=${mv.hitstun} dx=${(mv.x - x0).toFixed(0)}`); }

  // ── INTRO (captured last — forceIntro parks the game in INTRO) ───────
  section("intro");
  await page.evaluate(() => window.__harness.forceIntro("intro")); await waitSheet("tobirama_intro_uniform");
  check("intro → intro_uniform", (seen.get("intro") || "").includes("tobirama_intro_uniform"), `sheet=${seen.get("intro")}`);

  // ── FALLBACK-BOX SWEEP ───────────────────────────────────────────────
  section("fallback-box sweep (no move renders the 128² box)");
  const EXPECT = ["idle", "run", "walk", "dash", "jump", "guard", "hurt", "knockdown", "intro", "light", "heavy", "up", "air", "down_air", "tobiCombo1", "tobiCombo2", "tobiComboFin", "tobiStrongFwd", "tobiRisingKnee", "tobiWaterDragon", "tobiWaterSlash", "tobiRisingWater", "tobiWaterWall", "tobiDarkness", "tobiWaterFlicker"];
  let missing = 0, boxed = 0;
  for (const a of EXPECT) {
    if (!seen.has(a)) { missing++; console.log(`   ⚠ never observed: ${a}`); continue; }
    const s = seen.get(a);
    if (!s || !s.includes("tobirama_")) { boxed++; console.log(`   ⚠ ${a} → ${s} (fallback/box!)`); }
  }
  check("all expected actions observed", missing === 0, `${EXPECT.length - missing}/${EXPECT.length}`);
  check("no action resolved to a fallback box / null", boxed === 0, `boxed=${boxed}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Tobirama full kit: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
