// harness/yuji.test.mjs — FULL-KIT capstone for Yuji Itadori (Stage 7). Integration smoke across every
// system built in Stages 1-6 + two sweeps that catch the classic failure modes:
//   • STATIC SHEET SWEEP  — every animationData sheet (and the portrait) exists on disk as a non-empty PNG.
//   • RUNTIME FALLBACK-BOX SWEEP — every action/cast move actually driven in a match resolves a real sprite
//     sheet (spriteReady) and NEVER the 128² fallback box (spriteSheet !== null). This is what proves the
//     MOVE_TO_ACTION identity maps + animationData wiring are all connected.
// Systems hit once each: registration, movement/states, the 5 normals, the Cursed-Energy specials, the Koma
// REPEAT (mash scaling), the 2-phase Black Flash ultimate, and the Sukuna Slash flavor special (+blockable).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

// ─────────────────────────────────────────────────────────────────
// STATIC SHEET SWEEP (no browser) — every declared sheet + portrait is a real, non-empty file.
// ─────────────────────────────────────────────────────────────────
section("STATIC — every animationData sheet + portrait exists on disk");
const yuji = characters.yuji;
const ad = yuji.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
let missing = [];
for (const s of [...sheets, yuji.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  const ok = fs.existsSync(p) && fs.statSync(p).size > 128;
  if (!ok) missing.push(s);
}
check(`${sheets.length} distinct sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (yuji_portrait.png)", (yuji.portrait || "").includes("yuji_portrait"), `portrait=${yuji.portrait}`);
check("core stats within roster bands (no outliers)",
  yuji.stats.maxHealth === 1120 && yuji.stats.attack === 90 && yuji.stats.defense === 82 && yuji.stats.speed === 90 && yuji.stats.maxEnergy === 150,
  `HP${yuji.stats.maxHealth}/atk${yuji.stats.attack}/def${yuji.stats.defense}/spd${yuji.stats.speed}/en${yuji.stats.maxEnergy}`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const koma = () => page.evaluate(() => window.__harness.komaState());
const ultCine = () => page.evaluate(() => window.__harness.yujiUltCine());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `yuji_full_${name}.png`) });

// RUNTIME FALLBACK-BOX SWEEP accumulator: every action we ever observe → its resolved sheet. A null sheet
// means the sprite handler fell back to the 128² box for that action (wiring gap). Assert none at the end.
const seenActions = new Map();
async function record() { const a = await p1(); if (a && a.spriteSheet !== undefined && a.currentMove !== undefined) { const act = a.spriteSheet ? a.spriteSheet : (a.currentMove || "idle"); seenActions.set(act, a.spriteSheet ?? null); } return a; }
async function sample(n) { for (let i = 0; i < n; i++) { await record(); await waitFrames(1); } }
async function prep(gap = 120, behavior = "stand") {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.evaluate(b => window.__harness.setSession?.({ dummyBehavior: b }), behavior);
  // wait until p1 is fully actionable — attackCooldown must reach 0 too (triggerSpecial bails on residual
  // cooldown even after `attacking`/`currentMove` clear; a grounded neutral Special after an airborne move
  // would silently no-op otherwise).
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 3500, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(4);
}
async function doubleDownSpecial() {
  await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.up("s"); await waitFrames(1);
  await page.keyboard.down("s"); await waitFrames(1);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s");
}

try {
  // ── REGISTRATION ──
  section("registration — Yuji boots as a playable fighter");
  await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("yuji"));
  check("charPortrait('yuji') resolves", !!portrait && portrait.includes("yuji_portrait"), `portrait=${portrait}`);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setSession?.({ dummyBehavior: "stand" }));
  await waitFrames(6);
  let a = await p1();
  check("p1 is Yuji", a.key === "yuji", `key=${a.key}`);
  check("spriteScale applied (2.16, not the half-size fallback)", Math.abs((a.spriteScale ?? 0) - 2.16) < 0.01, `scale=${a.spriteScale}`);   // HEIGHT-REF: canon 173cm → target ~108px (was 2.10)
  check("idle renders a real sheet (no fallback box)", (a.spriteSheet || "").includes("yuji_idle"), `sheet=${a.spriteSheet}`);

  // ── MOVEMENT / STATES ──
  section("movement & states — each resolves its own sheet");
  await prep(200);
  await page.keyboard.down("d"); await sample(8); a = await record(); await page.keyboard.up("d");
  check("run", (a.spriteSheet || "").includes("yuji_run"), `sheet=${a.spriteSheet}`);
  await waitFrames(4); await page.keyboard.down("w"); await waitFrames(3); a = await record(); await page.keyboard.up("w");
  check("jump", (a.spriteSheet || "").includes("yuji_jump"), `sheet=${a.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.press("d"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(3); a = await record(); await page.keyboard.up("d");
  check("dash", (a.spriteSheet || "").includes("yuji_dash"), `sheet=${a.spriteSheet}`);
  await waitGrounded();
  await page.evaluate(() => window.__harness.hurtP1?.(30)); await waitFrames(2); a = await record();
  check("hurt", (a.spriteSheet || "").includes("yuji_hit"), `sheet=${a.spriteSheet}`);
  await page.evaluate(() => window.__harness.knockdownP1?.()); await waitFrames(2); a = await record();
  check("knockdown", (a.spriteSheet || "").includes("yuji_hurt"), `sheet=${a.spriteSheet}`);
  await page.evaluate(() => window.__harness.healP1?.());

  // ── 5 NORMALS ──
  section("normals — all five connect");
  const normal = async (nm, keys, sheetHint, gap = 50) => {
    await prep(gap);
    const h0 = (await p2()).health;
    for (const k of keys) await page.keyboard.down(k);
    let sawSheet = false;
    for (let i = 0; i < 16; i++) { const a2 = await record(); if ((a2.spriteSheet || "").includes(sheetHint)) sawSheet = true; await waitFrames(1); }
    for (const k of [...keys].reverse()) await page.keyboard.up(k);
    await sample(6);
    const dmg = h0 - (await p2()).health;
    check(`${nm} (${sheetHint})`, sawSheet && dmg > 0, `saw=${sawSheet} −${dmg.toFixed(0)}`);
  };
  await normal("light", ["j"], "yuji_foward_attack");
  await normal("heavy (Fwd+K)", ["d", "k"], "yuji_super_foward_attack");
  await normal("up (I)", ["i"], "yuji_up_kick", 40);
  // air + down-air need airborne — lift Yuji, then strike IMMEDIATELY while still off the ground
  await prep(48); await page.evaluate(() => window.__harness.liftP1?.(60));
  { await page.keyboard.down("j"); let sawAir = false; for (let i = 0; i < 14; i++) { const av = await record(); if ((av.spriteSheet || "").includes("yuji_air_attack")) sawAir = true; await waitFrames(1); } await page.keyboard.up("j"); check("air (Jump+J)", sawAir, `saw=${sawAir}`); }
  await prep(40); await page.evaluate(() => window.__harness.liftP1?.(72));
  { await page.keyboard.down("s"); await page.keyboard.down("j"); let sawDA = false; for (let i = 0; i < 14; i++) { const av = await record(); if ((av.spriteSheet || "").includes("yuji_down_attack")) sawDA = true; await waitFrames(1); } await page.keyboard.up("j"); await page.keyboard.up("s"); check("down-air (Jump+Down+J)", sawDA, `saw=${sawDA}`); }

  // ── CURSED-ENERGY SPECIALS ──
  section("Cursed-Energy specials — cast poses resolve, moves fire");
  const special = async (nm, dirKey, sheetHint, expectProj) => {
    await prep(expectProj ? 340 : 90);
    if (expectProj) await page.evaluate(() => window.__harness.setP2Invuln?.(600));
    let sawCast = false, sawProj = false;
    const e0 = (await p1()).energy;
    // Press direction + Special TOGETHER (staggering would let Up register as a jump before the jump-suppress
    // fix engages → Pillar would misfire as AirCombo). Hold dir, then Special on the very next line.
    if (dirKey) await page.keyboard.down(dirKey);
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    for (let i = 0; i < 26; i++) { const av = await record(); if ((av.spriteSheet || "").includes(sheetHint)) sawCast = true; for (const pr of await projs()) if ((pr.name || "").startsWith("yuji")) sawProj = true; await waitFrames(1); }
    if (dirKey) await page.keyboard.up(dirKey);
    const eSpent = e0 - (await p1()).energy;
    check(`${nm} cast (${sheetHint})`, sawCast, `cast=${sawCast} eSpent=${eSpent.toFixed(0)}${expectProj ? ` proj=${sawProj}` : ""}`);
    if (expectProj) check(`${nm} spawns a projectile`, sawProj, `proj=${sawProj}`);
  };
  await special("Ball (neutral)", null, "yuji_ball_cast", true);
  await special("Beam (Fwd)", "d", "yuji_beam_cast", true);
  await special("Pillar (Up)", "w", "yuji_pillar_cast", false);
  await special("Crescent (Down)", "s", "yuji_crescent", false);
  await prep(40); await page.evaluate(() => window.__harness.liftP1?.(64));
  { await page.keyboard.down("l"); let sawAir = false; for (let i = 0; i < 16; i++) { const av = await record(); if ((av.spriteSheet || "").includes("yuji_aircombo")) sawAir = true; await waitFrames(1); } await page.keyboard.up("l"); check("AirCombo (Jump+L) cast (yuji_aircombo)", sawAir, `cast=${sawAir}`); }

  // ── KOMA REPEAT (mash scaling) ──
  section("Koma REPEAT — more mashes = more damage; both koma sheets render");
  async function komaRun(mashes) {
    await prep(40);
    await page.evaluate(() => window.__harness.startKoma());
    await waitFrames(2);
    const hp0 = (await p2()).health;
    for (let i = 0; i < mashes; i++) { await page.keyboard.down("j"); await waitFrames(1); await record(); await page.keyboard.up("j"); await waitFrames(1); await record(); }
    for (let i = 0; i < 70; i++) { await record(); if (!(await koma()).active) break; await waitFrames(1); }
    return hp0 - (await p2()).health;
  }
  const dmg2 = await komaRun(2);
  const dmg8 = await komaRun(8);
  check("Koma flurry deals damage", dmg2 > 0 && dmg8 > 0, `2-mash −${dmg2.toFixed(0)} / 8-mash −${dmg8.toFixed(0)}`);
  check("more mashes = more damage (REPEAT property)", dmg8 > dmg2, `8=${dmg8.toFixed(0)} > 2=${dmg2.toFixed(0)}`);
  check("both Koma sheets rendered (flurry + finisher)", seenActions.has("./yuji_koma1_uniform.png") && seenActions.has("./yuji_koma2_uniform.png"), `koma1=${seenActions.has("./yuji_koma1_uniform.png")} koma2=${seenActions.has("./yuji_koma2_uniform.png")}`);

  // ── ULTIMATE (2-phase Black Flash) ──
  section("Ultimate 'Black Flash' — buildup cinematic → Koma release → connects");
  await prep(44);
  const eUlt = (await p1()).energy; const hpUlt = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(2);
  const c = await ultCine();
  check("cinematic activates (build phase, real Yuji caster)", c.active && c.phase === "build" && c.casterKey === "yuji", `active=${c.active} phase=${c.phase} caster=${c.casterKey}`);
  check("100 energy spent", eUlt - (await p1()).energy >= 95, `${eUlt.toFixed(0)}→${(await p1()).energy.toFixed(0)}`);
  { const ab = await record(); check("buildup sprite = ultimateAction (plays through the freeze)", (ab.spriteSheet || "").includes("yuji_ultimate_action"), `sheet=${ab.spriteSheet}`); }
  await page.waitForFunction(() => window.__harness.yujiUltCine().active === false, null, { timeout: 6000, polling: 16 });
  await waitFrames(1);
  check("freeze lifts into the Koma flurry", (await koma()).active && (await koma()).phase === "flurry", `komaPhase=${(await koma()).phase}`);
  for (let i = 0; i < 6; i++) { await page.keyboard.down("j"); await waitFrames(1); await record(); await page.keyboard.up("j"); await waitFrames(1); await record(); }
  for (let i = 0; i < 80; i++) { await record(); if (!(await koma()).active) break; await waitFrames(1); }
  check("ultimate connects (damage dealt through the Koma payload)", hpUlt - (await p2()).health > 0, `−${(hpUlt - (await p2()).health).toFixed(0)}`);
  await shot("ultimate");

  // ── SUKUNA SLASH (flavor, blockable, no transform) ──
  section("Sukuna Slash — double-tap Down + Special → auto-target blockable slash (no transform)");
  await prep(120, "stand");
  { const hp0 = (await p2()).health; let sawSign = false, fx = null;
    await doubleDownSpecial();
    for (let i = 0; i < 22; i++) { const av = await record(); if ((av.spriteSheet || "").includes("yuji_sukuna_slash")) sawSign = true; for (const pr of await projs()) if ((pr.name || "") === "yujiSukunaSlash") fx = pr; await waitFrames(1); }
    const dmg = hp0 - (await p2()).health;
    check("hand-sign cast + auto-target FX on opponent", sawSign && !!fx && fx.visualOnly === true, `sign=${sawSign} fx=${!!fx}`);
    check("sure-hit damage (unblocked)", dmg >= 40 && dmg <= 65, `−${dmg.toFixed(0)}`);
    const ap = await record(); check("no transform (still Yuji, base form)", ap.key === "yuji" && (!ap.currentForm || ap.currentForm === "base"), `key=${ap.key} form=${ap.currentForm}`);
  }
  await prep(120, "block");
  { const hp0 = (await p2()).health; await doubleDownSpecial(); for (let i = 0; i < 22; i++) { await record(); await waitFrames(1); } const dmg = hp0 - (await p2()).health; check("blockable — guarding opponent takes chip only", dmg > 0 && dmg < 40, `−${dmg.toFixed(0)}`); }

  // ── RUNTIME FALLBACK-BOX SWEEP ──
  section("FALLBACK-BOX sweep — no action ever fell back to the 128² box");
  const nullActions = [...seenActions.entries()].filter(([, sheet]) => sheet === null).map(([act]) => act);
  check("every observed action resolved a real sheet (no null/box)", nullActions.length === 0, nullActions.length ? `BOX: ${nullActions.join(", ")}` : `${seenActions.size} distinct sheets observed`);
  const mustSee = ["./yuji_idle_uniform.png", "./yuji_ball_cast_uniform.png", "./yuji_koma1_uniform.png", "./yuji_koma2_uniform.png", "./yuji_ultimate_action_uniform.png", "./yuji_sukuna_slash.png"];
  const seenSet = new Set(seenActions.keys());
  const missed = mustSee.filter(s => !seenSet.has(s));
  check("all signature cast sheets exercised", missed.length === 0, missed.length ? `not seen: ${missed.join(", ")}` : "");

  section("stability");
  check("no JS errors across the full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${FAIL === 0 ? "✅ YUJI full-kit: ALL PASS" : "❌ YUJI full-kit: FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
