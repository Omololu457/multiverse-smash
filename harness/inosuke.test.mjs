// harness/inosuke.test.mjs — FULL-KIT test for Inosuke Hashibira (4th Demon Slayer char).
// Covers: registration + portrait + height audit; movement/state + decode sweep (no fallback boxes);
// all 5 normals; the "Beast Breathing Flurry" command chain (B1→B5) + whiff interrupt + Down+Heavy;
// the BEAST BREATHING ASSIST mid-combo partner call — data-driven roster, freeze, partner's REAL move
// sprite, and EXPLICIT combo-RESUME (the headline); the 3 cinematic specials (push-in → strike →
// pull-back + freeze) + the _3 gap; a dual-render check; stability. Real screenshots → shots/inosuke_*.png.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
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
const cam = () => page.evaluate(() => window.__harness.camera());
const bba = () => page.evaluate(() => window.__harness.beastAssistState());
const cine = () => page.evaluate(() => window.__harness.inosukeBeastCine());
const summons = () => page.evaluate(() => window.__harness.beastAssistSummons());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `inosuke_${name}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await page.waitForFunction(() => !window.__harness.inosukeBeastCine().active, null, { timeout: 6000, polling: 16 }).catch(() => {}); await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 46) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); window.__harness.setP2Invuln?.(0); window.__harness.clearBeastAssistCd?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
const force = (action) => page.evaluate(a => window.__harness.forceAction(a), action);

// dual-render detector (patch drawImage, count draws whose src matches a needle over N frames)
async function installDrawTally() {
  await page.evaluate(() => {
    if (window.__tallyInstalled) return; window.__tallyInstalled = true;
    window.__tally = { counts: {}, needles: [], reset(n) { this.needles = n; this.counts = {}; } };
    const proto = CanvasRenderingContext2D.prototype, orig = proto.drawImage;
    proto.drawImage = function (img, ...rest) { try { const src = (img && (img.currentSrc || img.src)) || ""; for (const n of (window.__tally.needles || [])) if (src.includes(n)) window.__tally.counts[n] = (window.__tally.counts[n] || 0) + 1; } catch (_) {} return orig.call(this, img, ...rest); };
  });
}

async function driveChain(gap = 44) {
  await reset(gap);
  const hp0 = (await p2()).health; const chain = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 130; i++) { const c = await p1(); if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove); if (!c.attacking) break; if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(8);
  return { chain, dmg: hp0 - (await p2()).health };
}

async function driveAssist() {
  await reset(44);
  await page.keyboard.down("d"); await tap("k", 2);
  let cur = null;
  for (let i = 0; i < 60; i++) { const c = await p1(); if ((c.currentMove || "").startsWith("inosukeB") && c.attackPhase === "recovery" && c.cmdHitLanded && c.rekkaNext) { cur = c.currentMove; break; } await waitFrames(1); }
  const comboBefore = (await bba())?.combo ?? 0;
  await tap("l", 2); await waitFrames(2);
  const froze = await bba(); const sm = await summons();
  let resumed = null;
  for (let i = 0; i < 70; i++) { const s = await bba(); if (!s.active && s.currentMove && s.currentMove !== cur) { resumed = s; break; } await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(6);
  return { cur, comboBefore, froze, sm, resumed };
}

async function fireSpecial(hold, variant) {
  await reset(96);
  const hp0 = (await p2()).health; const camBefore = (await cam()).zoom;
  if (hold) await page.keyboard.down(hold);
  await tap("l", 2);
  if (hold) await page.keyboard.up(hold);
  let act = null; for (let i = 0; i < 20; i++) { const c = await cine(); if (c.active) { act = c; break; } await waitFrames(1); }
  let minZoom = camBefore, struck = false;
  for (let i = 0; i < 140; i++) { const c = await cine(); const z = (await cam()).zoom; if (z < minZoom) minZoom = z; if (c.struck) struck = true; if (!c.active) break; await waitFrames(1); }
  await waitFrames(6);
  return { act, minZoom, camBefore, camAfter: (await cam()).targetZoom, struck, dmg: hp0 - (await p2()).health };
}

try {
  // ── REGISTRATION + PORTRAIT + HEIGHT ──
  section("registration + portrait + height audit");
  await page.goto(`${base}/index.html?harness=1&p1=inosuke&p2=inosuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("inosuke"));
  check("inosuke.portrait wired", portrait === "./inosuke_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./inosuke_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("demon_slayer", "training"));
  check("Demon Slayer universe includes inosuke", sel.roster.includes("inosuke"), `roster=${sel.roster.join(",")}`);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(10);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await installDrawTally();
  const flavor = await page.evaluate(() => window.__harness.noMeterFlavor("p1"));
  check("energy label = TOTAL CONCENTRATION", flavor === "TOTAL CONCENTRATION", `flavor=${flavor}`);
  await reset(60); await waitFrames(4);
  const m = await page.evaluate(() => window.__harness.measureSprite?.("p1"));
  // canon 164cm × 0.623 ≈ 102px target; allow the ±12% audit band
  const target = 102, measured = m?.contentH ?? 0, ratio = measured ? measured / target : 0;
  check("height ≈ target (0.623×164≈102px, within 12%)", measured && Math.abs(ratio - 1) <= 0.12, `measured=${measured}px target=${target}px ratio=${ratio.toFixed(2)}`);

  // ── MOVEMENT / STATE + DECODE SWEEP ──
  section("movement / state + decode sweep");
  let mv = await p1();
  check("idle → inosuke_idle_uniform (real handler)", has(mv, "inosuke_idle_uniform") && mv.hasSpriteHandler, `sheet=${mv.spriteSheet}`);
  await shot("idle");
  await page.keyboard.down("d"); await waitFrames(10); mv = await p1();
  check("walk (hold fwd)", ["walk", "run"].includes(mv.action), `action=${mv.action}`);
  await page.keyboard.up("d"); await waitFrames(6);
  await page.keyboard.press("d"); await page.keyboard.down("d"); mv = await waitSheet("inosuke_dash_uniform", 8);
  check("dash → inosuke_dash_uniform", has(mv, "inosuke_dash_uniform"), `sheet=${mv.spriteSheet}`);
  await page.keyboard.up("d"); await waitFrames(8);
  for (const [act, needle] of [["dodge", "inosuke_dodge_uniform"], ["taunt", "inosuke_taunt_uniform"], ["knockdown", "inosuke_hit_uniform"]]) {
    await force(act); await waitFrames(3); mv = await p1();
    check(`${act} → ${needle}`, has(mv, needle), `sheet=${mv.spriteSheet}`); await force(null); await waitFrames(2);
  }
  const sheets = ["idle", "dash", "jump", "hit", "dodge", "taunt", "light", "heavy", "up", "airdown", "downheavy", "b1", "b2", "b3", "b4", "b5", "cine1", "cine2", "cine4"];
  let decodeFails = [];
  for (const s of sheets) { const r = await page.evaluate(async (src) => { const i = new Image(); i.src = src; try { await i.decode(); return i.naturalWidth > 0; } catch { return false; } }, `./inosuke_${s}_uniform.png`); if (!r) decodeFails.push(s); }
  check("all 19 uniform sheets decode (no fallback boxes)", decodeFails.length === 0, decodeFails.length ? `missing=${decodeFails.join(",")}` : "19/19 decode");

  // ── 5 NORMALS ──
  section("basic normals");
  await reset(60); await tap("j"); mv = await waitSheet("inosuke_light_uniform");
  check("light → inosuke_light_uniform", has(mv, "inosuke_light_uniform"), `action=${mv.action}`);
  await reset(60); await tap("k"); mv = await waitSheet("inosuke_heavy_uniform");
  check("heavy → inosuke_heavy_uniform", has(mv, "inosuke_heavy_uniform"), `action=${mv.action}`);
  await reset(60); await tap("i"); mv = await waitSheet("inosuke_up_uniform");
  check("up → inosuke_up_uniform (launcher)", has(mv, "inosuke_up_uniform"), `action=${mv.action}`);
  await reset(60); await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {}); await tap("j", 1); mv = await waitSheet("inosuke_airdown_uniform", 14);
  check("air → inosuke_airdown_uniform (action=air)", has(mv, "inosuke_airdown_uniform") && mv.action === "air", `action=${mv.action}`);
  await waitGrounded();
  await reset(60); await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {}); await page.keyboard.down("s"); await tap("j", 1); await page.keyboard.up("s"); mv = await waitSheet("inosuke_airdown_uniform", 14);
  check("down_air → action=down_air", mv.action === "down_air", `action=${mv.action}`);
  await waitGrounded();

  // ── COMMAND CHAIN + Down+Heavy ──
  section("Beast Breathing Flurry chain + whiff interrupt + Beast Fang");
  const r = await driveChain(44);
  check("chain B1→B2→B3→B4→B5", ["inosukeB1", "inosukeB2", "inosukeB3", "inosukeB4", "inosukeB5"].every(k => r.chain.includes(k)), `chain=${r.chain.join("→")}`);
  check("chain deals cumulative damage", r.dmg > 55, `dmg=${r.dmg}`);
  const w = await driveChain(520);
  check("whiffed opener does NOT chain past B1", w.chain.length === 1 && w.chain[0] === "inosukeB1", `chain=${w.chain.join("→")}`);
  await reset(52); await page.keyboard.down("s"); await tap("k", 2); mv = await waitSheet("inosuke_downheavy_uniform", 12); const dm = await p1();
  check("Down+Heavy → inosukeDownHeavy", has(mv, "inosuke_downheavy_uniform") && dm.currentMove === "inosukeDownHeavy", `move=${dm.currentMove}`);
  await page.keyboard.up("s"); await waitFrames(6);

  // ── BEAST BREATHING ASSIST (combo-resume is the headline) ──
  section("Beast Breathing Assist — data-driven roster + mid-combo freeze + AUTO-RESUME");
  const partners = await page.evaluate(() => window.__harness.beastAssistPartners());
  check("partner roster is data-driven (DS chars, Inosuke excluded, auto-extends)", ["zenitsu", "rengoku", "shinobu"].every(k => partners.includes(k)) && !partners.includes("inosuke"), `partners=[${partners.join(",")}]`);
  await page.evaluate(() => window.__harness.setBeastAssistIdx(0));
  const a1 = await driveAssist();
  check("assist FROZE Inosuke mid-combo (hitstop>0)", a1.froze?.active && a1.froze?.hitstop > 0, `hitstop=${a1.froze?.hitstop} partner=${a1.froze?.partner}`);
  check("partner performs a REAL move sprite (from characters[key])", a1.sm.length >= 1 && a1.sm[0]?.sheet && a1.sm[0]?.owner === "inosuke", `sheet=${a1.sm[0]?.sheet}`);
  check("★ Inosuke's OWN combo AUTO-RESUMES at the next stage after the link", !!a1.resumed && a1.resumed.currentMove !== a1.cur && (a1.resumed.currentMove || "").startsWith("inosukeB"), `${a1.cur} → [${a1.froze?.partner}] → ${a1.resumed?.currentMove}`);
  check("partner hit EXTENDED the same combo", (a1.resumed?.combo ?? 0) > a1.comboBefore, `combo ${a1.comboBefore}→${a1.resumed?.combo}`);
  const a2 = await driveAssist();
  check("2nd partner is DIFFERENT (round-robin) + combo resumes again", a2.froze?.partner && a2.froze?.partner !== a1.froze?.partner && !!a2.resumed && (a2.resumed.currentMove || "").startsWith("inosukeB"), `#1=${a1.froze?.partner} #2=${a2.froze?.partner} resume=${a2.resumed?.currentMove}`);

  // ── 3 CINEMATIC SPECIALS ──
  section("cinematic specials (push-in → strike → pull-back)");
  for (const c of [{ hold: null, variant: "spin", sprite: "inosukeCine1" }, { hold: "d", variant: "dash", sprite: "inosukeCine2" }, { hold: "s", variant: "lunge", sprite: "inosukeCine4" }]) {
    const rr = await fireSpecial(c.hold, c.variant);
    check(`${c.variant}: activates + real sprite (${c.sprite})`, rr.act?.active && rr.act?.variant === c.variant && rr.act?.sprite === c.sprite, `variant=${rr.act?.variant} sprite=${rr.act?.sprite}`);
    check(`${c.variant}: camera push-in (<1.0) then pull-back (~1.0)`, rr.minZoom < 0.97 && Math.abs(rr.camAfter - 1.0) < 0.06, `min=${rr.minZoom?.toFixed(3)} after=${rr.camAfter?.toFixed(3)}`);
    check(`${c.variant}: strike lands (range-gated dmg)`, rr.struck && rr.dmg > 0, `dmg=${rr.dmg}`);
  }
  const cine3 = fs.existsSync(path.join(ROOT, "inosuke_cenematic_specail_3.png"));
  check("cenematic_specail_3 is a documented GAP (no art, not invented)", !cine3, `exists=${cine3}`);

  // ── DUAL-RENDER CHECK ──
  section("no duplicate render (draw tally on idle)");
  await reset(120); await force(null); await waitFrames(4);
  await page.evaluate(() => window.__tally.reset(["inosuke_idle_uniform"]));
  const f0 = (await state()).frame; await waitFrames(24); const f1 = (await state()).frame;
  const draws = await page.evaluate(() => window.__tally.counts["inosuke_idle_uniform"] || 0);
  const perFrame = draws / Math.max(1, f1 - f0);
  // both fighters are Inosuke on idle → ~2 draws/frame is normal; a per-fighter double-draw bug → ~4.
  check("idle renders once per fighter (no double-draw)", perFrame > 0.5 && perFrame < 3.0, `draws/frame=${perFrame.toFixed(2)} (2 fighters idle → ~2 expected; bug → ~4)`);

  // ── STABILITY ──
  section("stability");
  check("no JS errors during full-kit test", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  INOSUKE full-kit: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
