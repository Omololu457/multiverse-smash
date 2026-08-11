// harness/shinobu.test.mjs — CANONICAL full-kit test for Shinobu Kocho (3rd Demon Slayer char).
// Covers registration + portrait, movement/state, the camera-TRACKED glide-in intro (positional travel +
// camera pan), all 5 thrust normals, the "Insect Breathing" command chain (G1→G2→G3) WITH a mid-chain
// interrupt, both specials (Poison Thrust + wisteria DoT + cooldown; Butterfly Flit backflip i-frame evade),
// the "Butterfly Dance" spinning-DASH freeze-cinematic Ultimate (dash-in + guaranteed 300 + poison finisher +
// cooldown gate), a FALLBACK-BOX SWEEP (every wired action → real shinobu_* sheet; confirmed-missing absent),
// a DUPLICATE-RENDER check on the hit-reaction AND the ultimate cinematic (draws-per-frame ≈ 1, never doubled),
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
const cam = () => page.evaluate(() => window.__harness.camera());
const cine = () => page.evaluate(() => window.__harness.shinobuUltCine());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 46, { invuln = false } = {}) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); });
  await page.evaluate(v => window.__harness.setP2Invuln(v), invuln ? 600 : 0);
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
// Per-frame drawImage tally (dual-render detector): patch ctx.drawImage to count draws whose source src
// matches a needle, then measure draws-per-logic-frame over a window. Single render → ~1; dual → ~2.
async function installDrawTally() {
  await page.evaluate(() => {
    if (window.__tallyInstalled) return;
    window.__tallyInstalled = true;
    window.__tally = { counts: {}, reset(needles) { this.needles = needles; this.counts = {}; }, needles: [] };
    const proto = CanvasRenderingContext2D.prototype;
    const orig = proto.drawImage;
    proto.drawImage = function (img, ...rest) {
      try {
        const src = (img && (img.currentSrc || img.src)) || "";
        for (const n of (window.__tally.needles || [])) if (src.includes(n)) window.__tally.counts[n] = (window.__tally.counts[n] || 0) + 1;
      } catch (_) {}
      return orig.call(this, img, ...rest);
    };
  });
}
async function measureDrawsPerFrame(needle, frames = 24) {
  await page.evaluate(n => window.__tally.reset([n]), needle);
  const f0 = (await state()).frame;
  await waitFrames(frames);
  const f1 = (await state()).frame;
  const draws = await page.evaluate(n => window.__tally.counts[n] || 0, needle);
  const df = Math.max(1, f1 - f0);
  return { draws, frames: df, ratio: draws / df };
}
async function driveChain() {
  await reset(44);
  const hp0 = (await p2()).health; const chain = [];
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 90; i++) {
    const c = await p1();
    if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove);
    if (!c.attacking) break;
    if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
    else await waitFrames(1);
  }
  await page.keyboard.up("d"); await waitFrames(8);
  return { chain, dmg: hp0 - (await p2()).health };
}

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=shinobu&p2=shinobu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await installDrawTally();
  const portrait = await page.evaluate(() => window.__harness.charPortrait("shinobu"));
  check("shinobu.portrait wired", portrait === "./shinobu_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./shinobu_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("demon_slayer", "training"));
  check("Demon Slayer universe includes shinobu", sel.roster.includes("shinobu"), `roster=${sel.roster.join(",")}`);

  // ── TRACKED GLIDE-IN INTRO ──
  section("camera-tracked glide-in intro (positional travel + camera pan)");
  await page.evaluate(() => window.__harness.start());
  await waitFrames(2);
  const xs = [], cams = [];
  let glide = false;
  for (let i = 0; i < 36; i++) { const f = await p1(); const c = await cam(); xs.push(f.x); cams.push(c.x); if (f.introVariant === "introGlide") glide = true; await waitFrames(1); }
  const travel = Math.max(...xs) - Math.min(...xs);
  const campan = Math.max(...cams) - Math.min(...cams);
  check("intro variant = introGlide", glide, "");
  check("POSITIONAL TRAVEL off-screen → home (>200px)", travel > 200, `x-travel=${Math.round(travel)}px`);
  check("CAMERA TRACKS the entrance (>80px pan)", campan > 80, `cam-pan=${Math.round(campan)}px`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(12);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });

  // ── ENERGY LABEL ──
  const flavor = await page.evaluate(() => window.__harness.noMeterFlavor("p1"));
  check("energy label = TOTAL CONCENTRATION", flavor === "TOTAL CONCENTRATION", `flavor=${JSON.stringify(flavor)}`);

  // ── MOVEMENT / STATE ──
  section("movement / state sprites");
  await reset(300);   // far so p1 idles
  let mv = await p1(); check("idle → shinobu_idle_uniform", has(mv, "shinobu_idle_uniform"), `sheet=${mv.spriteSheet}`);
  await page.keyboard.down("d"); await waitFrames(10); mv = await p1(); check("walk/run → shinobu_walk_uniform", has(mv, "shinobu_walk_uniform"), `sheet=${mv.spriteSheet}`); await page.keyboard.up("d"); await waitFrames(6);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2); mv = await p1(); check("jump → shinobu_jump_uniform", has(mv, "shinobu_jump_uniform"), `sheet=${mv.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down(";"); await waitFrames(6); mv = await p1(); check("guard → shinobu_guard_uniform", has(mv, "shinobu_guard_uniform"), `sheet=${mv.spriteSheet}`); await page.keyboard.up(";"); await waitFrames(4);

  // ── NORMALS ──
  section("5 basic normals (thrust/piercing)");
  for (const [nm, key, sheet] of [["light", "j", "shinobu_light_uniform"], ["heavy", "k", "shinobu_heavy_uniform"], ["up", "i", "shinobu_up_uniform"]]) {
    await reset(nm === "heavy" ? 60 : 46); const hp0 = (await p2()).health;
    await page.keyboard.down(key); const m = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(14);
    check(`${nm} → ${sheet} + connects`, has(m, sheet) && (await p2()).health < hp0, `sheet=${m.spriteSheet}`);
  }
  await reset(40); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("j"); const m = await waitSheet("shinobu_air_uniform"); await page.keyboard.up("j"); await waitFrames(14); check("air → shinobu_air_uniform + connects", has(m, "shinobu_air_uniform") && (await p2()).health < hp0, ""); }
  await reset(30); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j"); const m = await waitSheet("shinobu_down_air_uniform", 10); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14); check("down_air → shinobu_down_air_uniform + connects", has(m, "shinobu_down_air_uniform") && (await p2()).health < hp0, ""); }

  // ── COMMAND CHAIN + MID-CHAIN INTERRUPT ──
  section("Insect Breathing command chain + mid-chain interrupt");
  const r = await driveChain();
  check("chain progresses shinobuG1 → G2 → G3", ["shinobuG1", "shinobuG2", "shinobuG3"].every(k => r.chain.includes(k)), `chain=${r.chain.join(" → ")}`);
  check("chain deals cumulative damage", r.dmg > 45, `dmg=${r.dmg}`);
  await reset(44, { invuln: true }); const wc = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 60; i++) { const c = await p1(); if (c.currentMove && !wc.includes(c.currentMove)) wc.push(c.currentMove); if (!c.attacking) break; if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(8);
  check("whiffed opener does NOT chain past G1 (interrupt)", wc.length === 1 && wc[0] === "shinobuG1", `chain=${wc.join(" → ")}`);

  // ── SPECIALS ──
  section("specials: Poison Thrust (+DoT, +cooldown) & Butterfly Flit");
  await reset(50); { const hp0 = (await p2()).health;
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    const m = await waitSheet("shinobu_poison_uniform");
    await page.waitForFunction(() => !window.__harness.p1().attacking, null, { timeout: 3000, polling: 16 }).catch(() => {});
    await waitFrames(4); const hpHit = (await p2()).health; await waitFrames(150); const hpPoison = (await p2()).health;
    check("Poison Thrust → shinobu_poison_uniform + connects", has(m, "shinobu_poison_uniform") && (hp0 - hpHit) > 0, `direct=${hp0 - hpHit}`);
    check("wisteria POISON DoT ticks after the hit", (hpHit - hpPoison) > 0, `poison=${hpHit - hpPoison}`);
  }
  await idleReady(); await page.evaluate(() => { window.__harness.healP2(); window.__harness.resetFighterInput?.("p1"); }); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  await page.waitForFunction(() => !window.__harness.p1().attacking, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(2);
  const gated = await p1();
  check("2nd immediate Poison Thrust gated by cooldown", !has(gated, "shinobu_poison_uniform") || gated.attackPhase === "idle", `phase=${gated.attackPhase}`);
  await reset(46); { const x0 = (await p1()).x;
    await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    const m = await waitSheet("shinobu_flit_uniform", 12);
    let maxInv = 0, back = 0; for (let i = 0; i < 18; i++) { const c = await p1(); maxInv = Math.max(maxInv, c.invulnTimer); back = Math.min(back, c.x - x0); await waitFrames(1); }
    await page.keyboard.up("a"); await waitFrames(8);
    check("Butterfly Flit → shinobu_flit_uniform + i-frames + backward travel", has(m, "shinobu_flit_uniform") && maxInv > 0 && back < -20, `iframes=${maxInv} back=${Math.round(back)}px`);
  }

  // ── ULTIMATE ──
  section("Butterfly Dance ultimate (spinning-dash freeze-cinematic)");
  await idleReady();
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.resetUlt(); });
  const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 260); await waitFrames(3);
  const uhp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.shinobuUltCine().active, null, { timeout: 2000, polling: 16 }).catch(() => {});
  const c0 = await cine();
  check("ultimate activates the Butterfly Dance cinematic", c0.active === true, `phase=${c0.phase}`);
  const startX = c0.startX; let maxToward = 0;
  for (let i = 0; i < 120; i++) { const c = await cine(); if (!c.active) break; if (c.casterX != null) maxToward = Math.max(maxToward, c.casterX - startX); await waitFrames(1); }
  check("she DASHES toward the opponent (range-independent)", maxToward > 100, `dash Δx=${Math.round(maxToward)}px`);
  await page.waitForFunction(() => !window.__harness.shinobuUltCine().active, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(4); const uhpHit = (await p2()).health;
  check("STRIKE deals guaranteed direct (~180 = 300×0.60)", (uhp0 - uhpHit) >= 170, `direct=${uhp0 - uhpHit}`);
  await waitFrames(130); const uhpPoison = (await p2()).health;
  check("poison finisher ticks after the strike", (uhpHit - uhpPoison) > 0, `poison=${uhpHit - uhpPoison}`);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(4);
  check("2nd immediate ultimate gated by cooldown", (await cine()).active === false, "");

  // ── DUPLICATE-RENDER CHECK (the known "two copies" bug class) ──
  section("duplicate-render check (hit-reaction + ultimate cinematic → drawn ONCE per frame)");
  await reset(80);
  await page.evaluate(() => window.__harness.hurtP1(80));   // sustained hitstun → hurt sprite renders
  await waitFrames(3);
  const hurtTally = await measureDrawsPerFrame("shinobu_hit_uniform", 20);
  check("hit-reaction sprite renders (no fallback)", hurtTally.draws > 0, `draws=${hurtTally.draws}/${hurtTally.frames}f`);
  check("hit-reaction NOT double-rendered (ratio ≤ 1.6)", hurtTally.ratio <= 1.6, `draws-per-frame=${hurtTally.ratio.toFixed(2)}`);
  await page.evaluate(() => window.__harness.healP1());
  // ultimate cinematic dup-render
  await idleReady(); await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.resetUlt(); }); await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.shinobuUltCine().active, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(6);
  const ultTally = await measureDrawsPerFrame("shinobu_ultimate_uniform", 20);
  check("ultimate cinematic sprite renders", ultTally.draws > 0, `draws=${ultTally.draws}/${ultTally.frames}f`);
  check("ultimate cinematic NOT double-rendered (ratio ≤ 1.6)", ultTally.ratio <= 1.6, `draws-per-frame=${ultTally.ratio.toFixed(2)}`);
  await page.waitForFunction(() => !window.__harness.shinobuUltCine().active, null, { timeout: 5000, polling: 16 }).catch(() => {});

  // ── FALLBACK-BOX SWEEP ──
  section("fallback-box sweep (every wired action → real shinobu_* sheet; missing states absent)");
  const anim = await page.evaluate(async () => { const m = await import("./characters.js"); return m.characters?.shinobu?.animationData || {}; });
  const keys = Object.keys(anim); let allReal = true, badKey = null;
  for (const k of keys) {
    const sheet = anim[k]?.sheet;
    if (!sheet || !/^\.\/shinobu_.*\.png$/.test(sheet)) { allReal = false; badKey = `${k}=${sheet}`; break; }
    const ok = await page.evaluate(async s => { const i = new Image(); i.src = s; try { await i.decode(); return i.naturalWidth > 0; } catch { return false; } }, sheet);
    if (!ok) { allReal = false; badKey = `${k} art missing (${sheet})`; break; }
  }
  check(`all ${keys.length} wired actions → real shinobu_* sheets (no fallback box)`, allReal, badKey ? `bad: ${badKey}` : "");
  const missing = ["dizzy", "crouch", "win", "lose"].filter(k => !(k in anim));
  check("confirmed-missing states ABSENT (not invented): dizzy/crouch/win/lose", missing.length === 4, `absent=[${missing.join(",")}]`);

  section("stability");
  check("no JS page errors across full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test harness ran without throwing", false, String(e));
}

console.log(`\n════════════════════════════════════════`);
console.log(`  SHINOBU full-kit: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
