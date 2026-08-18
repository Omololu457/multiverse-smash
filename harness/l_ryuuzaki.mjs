// harness/l_ryuuzaki.mjs — CANONICAL suite for L "Ryuuzaki" (Death Note). Stage-6 finale regression.
//
// Rolls up the whole build (Stages 1–5) into ONE full-kit gate:
//   1. STATIC (no browser) — every animationData sheet + portrait + the 4 FX/summon/projectile sheets
//      referenced outside animationData exist on disk & are non-empty.
//   2. Registration / identity — rosterKey / name / universe (deathnote) / energyType (deduction) / stats /
//      spriteScale / portrait wired / NO ultimate (honest art-gap — placeholder only, not a triggerUltimate path).
//   3. Box-sweep — EVERY animationData action (idle / idleSeated / win / walk / run / dash / jump / fall /
//      guard / hurt / knockdown / taunt / 5 normals / 3 command stages / 5 special cast poses / EX flurry)
//      resolves a REAL l_ryuuzaki_ sheet — none render the 128² procedural fallback box. Plus the projectile
//      sheets are validated in the live-fire section below.
//   4. Full-kit behavior — 5 normals connect (up launches); the 3-stage command rekka fires + advances +
//      cancels; each of the 5 specials fires on its direction, spends Deduction, and deals damage/effect
//      (Analysis = a NON-LETHAL self-buff, not damage); Back-Rising + Up-Ryuk launch (vy<0); the EX kick-trail
//      fires ONLY as a cancel (never from neutral).
//   5. no-JS-errors.
// Shots → harness/shots/l_ryuuzaki_canon_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
import { FX_SHEETS_BY_CHAR } from "../preloadManifest.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = (t) => console.log(`\n── ${t} ──`);

// ══ 1) STATIC SHEET SWEEP (no browser) — every declared sheet + portrait + FX/proj art is a real file ══
section("STATIC — every animationData sheet + portrait + FX/projectile art exists on disk");
const L = characters.l_ryuuzaki;
const anim = L.animationData || {};
const sheets = [...new Set(Object.values(anim).map(a => a.sheet).filter(Boolean))];
const fxSheets = FX_SHEETS_BY_CHAR.l_ryuuzaki || [];   // Stage-4/5 projectile+summon sheets (outside animationData)
const missing = [];
for (const s of [...sheets, ...fxSheets, L.portrait]) {
  const f = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!fs.existsSync(f) || fs.statSync(f).size === 0) missing.push(s);
}
check(`${sheets.length} anim sheets + ${fxSheets.length} FX/proj + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (l_ryuuzaki_portrait.png)", (L.portrait || "").includes("l_ryuuzaki_portrait"), `portrait=${L.portrait}`);
check("all 4 Stage-4/5 FX/projectile sheets manifested (nova/bazooka/rising/ryuk)",
  ["nova", "bazooka_proj", "rising_proj", "ryuk"].every(k => fxSheets.some(s => s.includes(`l_ryuuzaki_${k}`))),
  `fx=[${fxSheets.map(s => s.split("/").pop()).join(", ")}]`);

// ══ browser boot ══
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const setEnergy = (v) => page.evaluate((e) => window.__harness.setEnergy(e), v);
const castDir = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_canon_${tag}.png`) }); }
async function setupAdjacent(gap = 46) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.44);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 16) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

// Fire a dir-special TWICE (Stage-4/5 idiom): PASS A (dummy FAR) → catch the projectile sheet + cast pose;
// PASS B (dummy ADJACENT) → damage / launch vy / energy spend.
async function fireDirSpecial(dir, sheetSub, wantCast, { damageGap = 40 } = {}) {
  await setupAdjacent(560);
  await setEnergy(200); await waitFrames(2);
  const res = await castDir(dir);
  let seenSheet = false, seenCast = false, sheets = [];
  for (let i = 0; i < 26; i++) {
    const ps = await projs(); const cur = await p1();
    if (cur.castMove === wantCast) seenCast = true;
    const found = ps.filter(p => (p.sheet || "").includes(sheetSub));
    if (found.length) { seenSheet = true; sheets = ps.map(p => (p.sheet || "").split("/").pop()).filter(Boolean); }
    await waitFrames(1);
  }
  await setupAdjacent(damageGap);
  await setEnergy(200); await waitFrames(2);
  const before = (await p1()).energy ?? 0; const hp0 = (await p2()).health;
  await castDir(dir);
  let dmg = 0, minVy = 0;
  for (let i = 0; i < 22; i++) { const hpNow = (await p2()).health; dmg = Math.max(dmg, hp0 - hpNow); const vy = (await p2()).vy; if (vy < minVy) minVy = vy; await waitFrames(1); }
  const after = (await p1()).energy ?? 0;
  return { seenSheet, seenCast, spent: before - after, castRes: res, dmg, minVy, sheets: [...new Set(sheets)] };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=l_ryuuzaki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ══ 2) REGISTRATION / IDENTITY ══
  section("registration + identity gate (rosterKey / universe / energyType / stats / scale / portrait / NO ult)");
  const g = await p1();
  const def = await page.evaluate(() => window.__harness.charDef("l_ryuuzaki"));
  check("P1 is L (rosterKey l_ryuuzaki)", g.key === "l_ryuuzaki", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("name = L", L.name === "L", `name=${L.name}`);
  check("universe = deathnote (shared with Light)", L.universe === "deathnote", `universe=${L.universe}`);
  check("energyType = deduction", def?.traits?.energyType === "deduction", `energyType=${def?.traits?.energyType}`);
  check("scaling = versatile (schema-exception marker)", def?.traits?.scaling === "versatile", `scaling=${def?.traits?.scaling}`);
  check("stats HP1040 / EN200 / atk84 / def80 / spd90 (FRAIL frame, no roster record)",
    def?.stats?.maxHealth === 1040 && def?.stats?.maxEnergy === 200 && def?.stats?.attack === 84 && def?.stats?.defense === 80 && def?.stats?.speed === 90,
    JSON.stringify(def?.stats));
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `spriteScale=${g.spriteScale}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("l_ryuuzaki"));
  check("portrait wired to ./l_ryuuzaki_portrait.png", (portrait || "").includes("l_ryuuzaki_portrait"), `portrait=${portrait}`);
  // NO ultimate: the `ultimate` field is a HUD placeholder only (row_19 ships as the Nova special, NOT promoted).
  check("NO ultimate (honest art-gap — ultimate is a placeholder, not a real cinematic)", L.ultimate?.placeholder === true, `ultimate=${JSON.stringify(L.ultimate)}`);
  await waitFrames(3); await shot("idle");

  // ══ 3) BOX-SWEEP — every animationData action renders a real l_ryuuzaki_ sheet (no 128² box) ══
  section("fallback-box sweep — every animationData action renders a real l_ryuuzaki_ sheet (no 128² box)");
  const ad = def?.animationData || {};
  const boxes = [];
  for (const act of Object.keys(ad)) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("l_ryuuzaki_")) boxes.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check(`all ${Object.keys(ad).length} animationData actions render a real l_ryuuzaki_ sheet`, boxes.length === 0, boxes.join(" | "));
  // Explicitly cover the box-sweep list from the mandate (verify the KEYS are all present in animationData).
  const wantActions = ["idle", "idleSeated", "win", "walk", "run", "dash", "jump", "fall", "guard", "hurt", "knockdown", "taunt",
    "light", "heavy", "up", "air", "down_air", "lRyuuzakiCmd1", "lRyuuzakiCmd2", "lRyuuzakiCmd3",
    "lRyuuzakiNovaCast", "lRyuuzakiBazookaCast", "lRyuuzakiRisingCast", "lRyuuzakiAnalysis", "lRyuuzakiRyukCast", "lRyuuzakiKickTrail"];
  const absent = wantActions.filter(a => !ad[a]?.sheet);
  check(`all ${wantActions.length} mandate box-sweep actions are defined (movement+normals+command+cast poses+EX)`, absent.length === 0, absent.length ? `absent: ${absent.join(", ")}` : "");
  await waitGrounded();

  // ══ 4) FULL-KIT BEHAVIOR ══
  // ── 4a) 5 normals connect (up launches) ──
  section("5 normals connect (light / heavy / up-launcher / air / down_air)");
  for (const [name, key, sheet] of [["light", "j", "l_ryuuzaki_light_uniform"], ["heavy", "k", "l_ryuuzaki_heavy_uniform"], ["up", "i", "l_ryuuzaki_up_uniform"]]) {
    await setupAdjacent(46);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(20);
    const hp1 = (await p2()).health;
    check(`${name}: real sheet + connects`, (mv.spriteSheet || "").includes(sheet) && hp1 < hp0, `sheet=${(mv.spriteSheet || "").split("/").pop()} dmg=${(hp0 - hp1).toFixed(0)}`);
    await waitGrounded(); await waitFrames(6);
  }
  { // up launcher pops the dummy
    let launched = false, minVy = 0;
    for (let a = 0; a < 4 && !launched; a++) {
      await setupAdjacent(46); await page.keyboard.down("i"); await waitSheet("l_ryuuzaki_up_uniform", 12);
      for (let f = 0; f < 14 && !launched; f++) { await waitFrames(1); const v = (await p2()).vy; if (v < minVy) minVy = v; if (v < -1) launched = true; }
      await page.keyboard.up("i"); await waitGrounded(); await waitFrames(6);
    }
    check("up normal LAUNCHES the dummy (p2 vy < 0)", launched, `minVy=${minVy.toFixed(1)}`);
  }
  { // air normal
    let sheetOk = false, dmg = 0;
    for (let a = 0; a < 4 && !(sheetOk && dmg > 0); a++) {
      await setupAdjacent(46); const hp0 = (await p2()).health;
      await page.evaluate(() => window.__harness.liftP1(70)); await waitFrames(1); await page.keyboard.down("j");
      const mv = await waitSheet("l_ryuuzaki_air_uniform", 10); if ((mv.spriteSheet || "").includes("l_ryuuzaki_air_uniform")) sheetOk = true;
      await page.keyboard.up("j"); await waitFrames(14); dmg += Math.max(0, hp0 - (await p2()).health); await waitGrounded(); await waitFrames(6);
    }
    check("air normal: real sheet + connects", sheetOk && dmg > 0, `dmg=${dmg}`);
  }
  { // down_air normal
    let sheetOk = false, dmg = 0;
    for (let a = 0; a < 4 && !(sheetOk && dmg > 0); a++) {
      await setupAdjacent(28); const hp0 = (await p2()).health;
      await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
      const mv = await waitSheet("l_ryuuzaki_downair_uniform", 12); if ((mv.spriteSheet || "").includes("l_ryuuzaki_downair_uniform")) sheetOk = true;
      await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14); dmg += Math.max(0, hp0 - (await p2()).health); await waitGrounded(); await waitFrames(6);
    }
    check("down_air normal: real sheet + connects", sheetOk && dmg > 0, `dmg=${dmg}`);
  }

  // ── 4b) 3-stage command rekka fires + advances + cancels ──
  section("command rekka (cmd1 → cmd2 → cmd3): fires, advances stage-by-stage, cancels into jump");
  async function advanceTo(nextMove, maxPoll = 28) {
    await page.keyboard.up("k");
    for (let r = 0; r < maxPoll; r++) {
      const s = await p1();
      if (s.currentMove === nextMove) return s;
      if (s.currentMove == null) return null;
      if (s.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); const s2 = await p1(); await page.keyboard.up("k"); await waitFrames(1); if (s2.currentMove === nextMove) return s2; }
      else { await waitFrames(1); }
    }
    return null;
  }
  let cmd1 = "", cmd2 = "", cmd3 = "", chainDmg = 0;
  for (let attempt = 0; attempt < 14 && cmd3 !== "lRyuuzakiCmd3"; attempt++) {
    await setupAdjacent(34); const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(2);
    let mv = await p1();
    for (let r = 0; r < 8 && mv.currentMove !== "lRyuuzakiCmd1"; r++) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); mv = await p1(); }
    if (mv.currentMove === "lRyuuzakiCmd1") { cmd1 = "lRyuuzakiCmd1"; }
    else { await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3); continue; }
    const s2 = await advanceTo("lRyuuzakiCmd2");
    if (s2) { cmd2 = "lRyuuzakiCmd2"; const s3 = await advanceTo("lRyuuzakiCmd3"); if (s3) cmd3 = "lRyuuzakiCmd3"; }
    chainDmg += Math.max(0, hp0 - (await p2()).health);
    await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
  }
  check("rekka opens cmd1 from Fwd+Heavy", cmd1 === "lRyuuzakiCmd1", `move=${cmd1}`);
  check("rekka advances cmd1 → cmd2 on clean hit", cmd2 === "lRyuuzakiCmd2", `move=${cmd2}`);
  check("rekka advances cmd2 → cmd3 (launcher finisher)", cmd3 === "lRyuuzakiCmd3", `move=${cmd3}`);
  check("command chain connects (dmg over the string)", chainDmg > 0, `dmg=${chainDmg}`);
  { // cancelable: jump-cancel on hit
    let cancelled = false;
    for (let a = 0; a < 10 && !cancelled; a++) {
      await setupAdjacent(34); await page.keyboard.down("d"); await waitFrames(2);
      let mv = await p1();
      for (let r = 0; r < 8 && mv.currentMove !== "lRyuuzakiCmd1"; r++) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); mv = await p1(); }
      if (mv.currentMove !== "lRyuuzakiCmd1") { await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3); continue; }
      for (let r = 0; r < 24 && !cancelled; r++) {
        const s = await p1(); if (s.currentMove == null) break;
        if (s.attackPhase === "recovery") { await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); const s2 = await p1(); if (!s2.grounded || s2.vy < -0.5) cancelled = true; break; }
        await waitFrames(1);
      }
      await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
    }
    check("command chain is CANCELABLE (jump-cancel on hit → leaves ground)", cancelled, cancelled ? "airborne after cancel" : "never cancelled");
  }

  // ── 4c) 5 specials: each fires on its direction, spends Deduction, deals damage/effect ──
  section("5 specials — each fires on its direction + spends Deduction (+ Rising/Ryuk launch, Analysis = buff)");
  { const r = await fireDirSpecial(null, "l_ryuuzaki_nova", "lRyuuzakiNovaCast", { damageGap: 30 });
    check("neutral Nova: cast + real sheet + dmg + spends energy", r.seenCast && r.seenSheet && r.dmg > 0 && r.spent > 0, `sheet=[${r.sheets.join(",")}] dmg=${r.dmg} spent=${r.spent}`); }
  { const r = await fireDirSpecial("F", "l_ryuuzaki_bazooka_proj", "lRyuuzakiBazookaCast", { damageGap: 90 });
    check("Fwd Bazooka: cast + real sheet + long-range dmg + spends energy", r.seenCast && r.seenSheet && r.dmg > 0 && r.spent > 0, `sheet=[${r.sheets.join(",")}] dmg=${r.dmg} spent=${r.spent}`); }
  { const r = await fireDirSpecial("B", "l_ryuuzaki_rising_proj", "lRyuuzakiRisingCast", { damageGap: 30 });
    check("Back Rising: cast + real sheet + dmg + LAUNCHES (vy<0) + spends energy", r.seenCast && r.seenSheet && r.dmg > 0 && r.minVy < -0.5 && r.spent > 0, `dmg=${r.dmg} minVy=${r.minVy.toFixed(1)} spent=${r.spent}`); }
  { const r = await fireDirSpecial("U", "l_ryuuzaki_ryuk", "lRyuuzakiRyukCast", { damageGap: 30 });
    check("Up Ryuk: cast + real L-Ryuk sheet (NOT Light's) + dmg + LAUNCHES + spends energy",
      r.seenCast && r.seenSheet && r.sheets.every(s => !s.includes("light_ryuk")) && r.dmg > 0 && r.minVy < -0.5 && r.spent > 0,
      `sheet=[${r.sheets.join(",")}] dmg=${r.dmg} minVy=${r.minVy.toFixed(1)} spent=${r.spent}`); }
  { // Down Analysis = NON-LETHAL self-buff (no damage, raises damageMultiplier)
    await setupAdjacent(60); await setEnergy(200); await waitFrames(2);
    const before = (await p1()).energy ?? 0; const hp0 = (await p2()).health;
    const res = await castDir("D");
    let castSeen = false, dmgMult = 1;
    for (let i = 0; i < 16; i++) { const cur = await p1(); if (cur.castMove === "lRyuuzakiAnalysis") castSeen = true; dmgMult = Math.max(dmgMult, cur.dmgMult ?? cur.damageMult ?? 1); await waitFrames(1); }
    const hp1 = (await p2()).health; const after = (await p1()).energy ?? 0;
    check("Down Analysis: cast + NON-LETHAL (no dmg) + raises dmgMult (self-buff) + spends energy",
      castSeen && (hp0 - hp1) === 0 && dmgMult > 1 && (before - after) > 0, `cast=${res?.cast} dmgDealt=${hp0 - hp1} dmgMult=${dmgMult} spent=${before - after}`); }

  // ── 4d) EX kick-trail fires ONLY as a cancel (never from neutral) ──
  section("EX kick-trail — cancel-only (does NOT fire from neutral; fires off a normal's recovery)");
  { // neutral special must NOT produce the kick-trail
    await setupAdjacent(50); await setEnergy(200); await waitFrames(2);
    const res = await castDir(null);
    let sawNeutral = false;
    for (let i = 0; i < 16; i++) { const cur = await p1(); if ((cur.currentMove || "") === "lRyuuzakiKickTrail") sawNeutral = true; await waitFrames(1); }
    check("EX: neutral Special does NOT fire lRyuuzakiKickTrail (cancel-only gate)", !sawNeutral && (res?.cast === "lRyuuzakiNovaCast" || res?.move == null), `neutralKickTrail=${sawNeutral} cast=${res?.cast}`);
  }
  { // fires as a cancel off a normal's recovery
    let fired = false, sheetOk = false, exDmg = 0;
    for (let attempt = 0; attempt < 12 && !fired; attempt++) {
      await setupAdjacent(46); await setEnergy(200); await waitFrames(2);
      const hp0 = (await p2()).health;
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
      for (let r = 0; r < 30 && !fired; r++) {
        const s = await p1();
        if ((s.currentMove || "") === "lRyuuzakiKickTrail") { fired = true; break; }
        if (s.attackPhase === "recovery" && s.attacking) { await page.keyboard.up("l"); await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await waitFrames(1); const s2 = await p1(); if ((s2.currentMove || "") === "lRyuuzakiKickTrail") { fired = true; break; } }
        else if (!s.attacking) break;
        await waitFrames(1);
      }
      if (fired) {
        for (let f = 0; f < 20; f++) { const s = await p1(); if ((s.spriteSheet || "").includes("l_ryuuzaki_kicktrail_uniform")) sheetOk = true; if (f === 4) await shot("ex_kicktrail"); await waitFrames(1); }
        exDmg = Math.max(0, hp0 - (await p2()).health);
      }
      await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3);
    }
    check("EX: fires as a cancel off a normal + real flurry sheet + multi-hit dmg", fired && sheetOk && exDmg > 0, `fired=${fired} sheet=${sheetOk} dmg=${exDmg}`);
  }

  // ══ 5) no JS errors ══
  section("integrity");
  check("no JS page errors across the whole canonical suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} L "Ryuuzaki" CANONICAL: ${PASS} passed, ${FAIL} failed — shots in harness/shots/l_ryuuzaki_canon_*`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
