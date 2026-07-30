// harness/minato.test.mjs — CANONICAL full-kit test for Minato Namikaze.
// Covers registration + portrait, movement/state, all 5 normals + the "Yellow Flash Rush" command
// chain + 2 pokes, the ported Shadow-Clone system (spawn/dispel/pincer/barrage/rush/rendan), Flying
// Raijin (throw HIT=no-mark / MISS=mark / F→F teleport recall), the Rasengan family + Reaper Death
// Seal (dual cost, not match-ending), the Kurama half-form Ultimate, a FALLBACK-BOX SWEEP (every
// move resolves to a real minato_*_uniform sheet), and a no-JS-error check.
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
const seen = new Map();

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
function rec(mv) { if (mv && mv.action) seen.set(mv.action, mv.spriteSheet || null); return mv; }
async function waitSheet(needle, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return rec(mv); }
async function waitMove(name, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && mv.currentMove !== name; f++) { await waitFrames(1); mv = await p1(); } return rec(mv); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function adjacent(gap = 55) { await idleReady(); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); window.__harness.clearP1FrMarks?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }
const marks = () => page.evaluate(() => window.__harness.p1FrMarks());

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("minato"));
  check("minato.portrait wired", portrait === "./minato_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./minato_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
  check("naruto roster includes minato", sel.roster.includes("minato"), `roster=${sel.roster.join(",")}`);
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── MOVEMENT / STATE ──
  section("movement / state");
  await idleReady();
  check("P1 is Minato (sprites)", (await p1()).key === "minato" && (await p1()).hasSpriteHandler, "");
  rec(await waitSheet("minato_idle_uniform"));
  check("idle sheet", (await p1()).spriteSheet.includes("minato_idle_uniform"), "");
  await page.keyboard.down("d"); check("run", (await waitSheet("minato_run_uniform")).spriteSheet.includes("minato_run_uniform"), ""); await page.keyboard.up("d"); await waitFrames(4);
  await waitGrounded();
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2); await page.keyboard.down("d");
  check("dash blink", (await waitSheet("minato_dash_uniform")).spriteSheet.includes("minato_dash_uniform"), ""); await page.keyboard.up("d"); await waitFrames(6);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w"); await waitFrames(4);
  check("jump", (await waitSheet("minato_jump_uniform")).spriteSheet.includes("minato_jump_uniform"), ""); await waitGrounded();
  await page.keyboard.down("s"); check("guard", (await waitSheet("minato_block_uniform")).spriteSheet.includes("minato_block_uniform"), ""); await page.keyboard.up("s"); await waitFrames(3);
  await page.evaluate(() => window.__harness.hurtP1(24)); check("hurt", (await waitSheet("minato_hit_uniform")).spriteSheet.includes("minato_hit_uniform"), ""); await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

  // ── 5 NORMALS ──
  section("normals");
  const normals = [["light", "j", "minato_foward_kick_uniform"], ["heavy", "k", "minato_twornado_kick_uniform"], ["upAttack", "i", "minato_up_attack_uniform"]];
  for (const [nm, key, sheet] of normals) {
    await adjacent(); const hp0 = (await p2()).health;
    await page.keyboard.down(key); const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(20);
    check(`${nm} → ${sheet}`, mv.spriteSheet.includes(sheet), `sheet=${mv.spriteSheet}`);
    check(`${nm} connects`, (await p2()).health < hp0, "");
  }
  // air + down_air
  await adjacent(46); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(40)); await page.keyboard.down("j"); const mv = await waitSheet("minato_super_up_attack_1_uniform"); await page.keyboard.up("j"); await waitFrames(14); check("air → minato_super_up_attack_1_uniform", mv.spriteSheet.includes("minato_super_up_attack_1_uniform"), ""); check("air connects", (await p2()).health < hp0, ""); }
  await adjacent(28); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j"); const mv = await waitSheet("minato_down_air_attack_uniform", 6); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14); check("down_air → minato_down_air_attack_uniform", mv.spriteSheet.includes("minato_down_air_attack_uniform"), ""); check("down_air connects", (await p2()).health < hp0, ""); }

  // ── COMMAND CHAIN + POKES ──
  section("Yellow Flash Rush chain + pokes");
  await adjacent(46);
  { const hp0 = (await p2()).health; const chain = [];
    await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
    for (let i = 0; i < 52; i++) { const c = rec(await p1()); if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove); if (chain.includes("minatoRushFin")) break; if (c.rekkaNext && c.cmdHitLanded && c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
    await page.keyboard.up("d"); await waitFrames(20);
    check("chain rush1→rush2→rushFin", chain[0] === "minatoRush1" && chain.includes("minatoRush2") && chain.includes("minatoRushFin"), `[${chain.join("→")}]`);
    check("chain damage", hp0 - (await p2()).health >= 80, ""); }
  await adjacent(52); { await page.keyboard.down("d"); await page.keyboard.down("j"); await waitFrames(4); const c = rec(await p1()); await page.keyboard.up("j"); await page.keyboard.up("d"); check("Fwd+Light = minatoFloorCombo", c.currentMove === "minatoFloorCombo", `move=${c.currentMove}`); await waitFrames(20); }
  await adjacent(52); { await page.keyboard.down("a"); await page.keyboard.down("k"); await waitFrames(4); const c = rec(await p1()); await page.keyboard.up("k"); await page.keyboard.up("a"); check("Back+Heavy = minatoMeleeRush", c.currentMove === "minatoMeleeRush", `move=${c.currentMove}`); await waitFrames(16); }

  // ── SHADOW CLONES ──
  section("shadow clone system");
  await adjacent(); await page.evaluate(() => window.__harness.spawnP1Clones(2));
  const cc = await page.evaluate(() => window.__harness.p1CloneCount());
  check("clones staged (Minato art)", cc === 2, `count=${cc}`);
  { const clones = await page.evaluate(() => window.__harness.summons().filter(s => s.id === "shadowClone")); check("clone body = minato idle art (standing, not summon gesture)", (clones[0]?.sheet || "").includes("minato_idle") && !(clones[0]?.sheet || "").includes("naruto"), `sheet=${clones[0]?.sheet}`); }
  // Pincer (B→U, 2 clones) — launcher
  await adjacent(); await page.evaluate(() => window.__harness.spawnP1Clones(2));
  { const before = await p2(); await tap("a", 1); await tap("w", 1); await tap("l"); const launched = await page.waitForFunction(() => (window.__harness.p2().vy || 0) < -3, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false); await waitFrames(12); check("Pincer launches + consumes 2 clones", launched && (await page.evaluate(() => window.__harness.p1CloneCount())) === 0, ""); void before; }
  // Barrage (neutral, 2 clones)
  await adjacent(); await page.evaluate(() => window.__harness.spawnP1Clones(2));
  { const before = (await p2()).health; await tap("l"); await waitFrames(24); check("Kunai Barrage multi-hit", before - (await p2()).health > 60, ""); }
  // Clone Rush (B→F, ≥1 clone)
  await adjacent(); await page.evaluate(() => window.__harness.spawnP1Clones(2));
  { await tap("a", 1); await tap("d", 1); await tap("l"); await waitFrames(4); const rushers = await page.evaluate(() => window.__harness.summons().filter(s => s.id === "minatoCloneRush")); check("Clone Rush spawns rushers", rushers.length >= 1, `rushers=${rushers.length}`); }
  // Dispel (D→B)
  await adjacent(); await page.evaluate(() => window.__harness.spawnP1Clones(2));
  { await tap("s", 1); await tap("a", 1); await tap("l"); await waitFrames(6); check("Dispel clears clones", (await page.evaluate(() => window.__harness.p1CloneCount())) === 0, ""); }
  // Rendan Storm (deterministic fire-count)
  await adjacent(); await page.evaluate(() => window.__harness.spawnP1Clones(2));
  { const f0 = await page.evaluate(() => window.__harness.p1RendanFired()); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 30); await waitFrames(1); await page.evaluate(() => window.__harness.p1ForceLight()); await waitFrames(12); check("Rendan Storm fires on clone+light", (await page.evaluate(() => window.__harness.p1RendanFired())) > f0, ""); }

  // ── FLYING RAIJIN ──
  section("Flying Raijin");
  await adjacent(60); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.clearP1FrMarks()); await tap("l"); await waitFrames(20); check("kunai HIT = damage, no mark", (await p2()).health < hp0 && (await marks()).length === 0, `marks=${(await marks()).length}`); }
  await adjacent(60); await page.evaluate(() => window.__harness.setP2Invuln?.(99999)); { await page.evaluate(() => window.__harness.clearP1FrMarks()); await tap("l"); await page.waitForFunction(() => window.__harness.p1FrMarks().length >= 1, null, { timeout: 3000, polling: 16 }).catch(() => {}); check("kunai MISS = tracked mark", (await marks()).length === 1, `marks=${(await marks()).length}`); }
  { const beforeX = (await p1()).x; await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2); await page.keyboard.down("d"); await page.waitForFunction(bx => Math.abs(window.__harness.p1().x - bx) > 40, beforeX, { timeout: 3000, polling: 16 }).catch(() => {}); await page.keyboard.up("d"); check("F→F teleport recall to mark", Math.abs((await p1()).x - beforeX) > 40, `Δx=${((await p1()).x - beforeX).toFixed(0)}`); }

  // ── RASENGAN + REAPER DEATH SEAL ──
  section("Rasengan family + Reaper Death Seal");
  await adjacent(60); { const en0 = (await p1()).energy; await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s"); const posed = await waitMove("minatoRasengan"); await waitFrames(20); check("Rasengan (Down+Special)", posed.currentMove === "minatoRasengan" || seen.has("minatoRasengan"), ""); check("Rasengan spends chakra", (await p1()).energy < en0, ""); }
  await adjacent(60); { await page.keyboard.down("p"); await waitFrames(16); await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s"); await page.keyboard.up("p"); const posed = await waitMove("minatoBigBall"); await waitFrames(24); check("Big Ball (charge+Down+Special)", posed.currentMove === "minatoBigBall" || seen.has("minatoBigBall"), ""); }
  await adjacent(70); { const p2b = (await p2()).health; const hp0 = (await p1()).health, en0 = (await p1()).energy; await page.keyboard.down("p"); await waitFrames(16); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("p"); let summoned = false; for (let f = 0; f < 12 && !summoned; f++) { summoned = (await page.evaluate(() => window.__harness.projectiles().map(p => p.name))).includes("minatoShinigami"); await waitFrames(1); } await waitFrames(30); const dmg = p2b - (await p2()).health, self = hp0 - (await p1()).health; check("Reaper summons giant Shinigami + grabs", summoned, ""); check("Reaper dual cost (chakra AND HP)", (await p1()).energy < en0 && self > 100, `self=−${self.toFixed(0)}`); check("Reaper devastating but survivable", dmg > 200 && (await p2()).health > 0, `dmg=${dmg.toFixed(0)}`); }
  // Reaper self-KO gate
  await adjacent(70); { await page.evaluate(() => window.__harness.setP1Health?.(120)); const lo = (await p1()).health; await page.keyboard.down("p"); await waitFrames(16); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("p"); await waitFrames(20); check("Reaper gate: no fire at low HP", Math.abs((await p1()).health - lo) < 30, `hp ${lo}→${(await p1()).health.toFixed(0)}`); }

  // ── KURAMA HALF-FORM ULTIMATE ──
  section("Kurama half-form ultimate");
  await adjacent(260); { const p2b = (await p2()).health; await page.evaluate(() => window.__harness.fillEnergy?.());
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    await page.waitForFunction(() => window.__harness.minatoKuramaUltCine().active, null, { timeout: 3000, polling: 16 }).catch(() => {});
    check("Kurama cinematic activates (own module)", (await page.evaluate(() => window.__harness.minatoKuramaUltCine().active)), "");
    check("Naruto's kurama did NOT fire", await page.evaluate(() => !window.__harness.kuramaUltCine().active), "");
    const phases = new Set();
    for (let i = 0; i < 260; i++) { const c = await page.evaluate(() => window.__harness.minatoKuramaUltCine()); if (!c.active && phases.size) break; if (c.phase) phases.add(c.phase); await waitFrames(2); }
    check("phase machine (activate…settle)", ["activate", "rise", "charge", "fire", "settle"].every(p => phases.has(p)), `[${[...phases].join(",")}]`);
    await page.waitForFunction(() => !window.__harness.minatoKuramaUltCine().active, null, { timeout: 6000, polling: 32 }).catch(() => {});
    const dmg = p2b - (await p2()).health;
    check("TBB guaranteed damage, survivable", dmg > 400 && (await p2()).health > 0, `dmg=${dmg.toFixed(0)} p2=${(await p2()).health.toFixed(0)}`); }

  // ── FALLBACK-BOX SWEEP ──
  section("fallback-box sweep (every move → real minato sheet, never 128² box / null)");
  let boxes = 0;
  for (const [action, sheet] of seen) {
    const bad = !sheet || sheet.includes("128") || !sheet.includes("minato");
    if (bad) { boxes++; console.log(`   ⚠ '${action}' → ${sheet}`); }
  }
  check("no fallback-box / foreign sheet on any exercised action", boxes === 0, `${seen.size} actions checked`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));

} catch (e) { check("test run completed without throwing", false, String(e)); }

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
