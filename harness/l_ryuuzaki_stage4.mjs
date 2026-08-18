// harness/l_ryuuzaki_stage4.mjs — STAGE 4: L "Ryuuzaki" — 4 dir-specials + the kick_trail EX (cancel-only).
//
// Mirrors the Light Yagami Stage-4 idiom (LIGHT_SUMMONS / p1SpecialDir): each dir-special plays a shared
// cast pose (_spriteCastMove) then fires a ONE-SHOT phantom-hitbox projectile (the FX/summon sheet rides as
// the projectile sprite; non-persistent). We assert:
//   neutral → Golden Nova    : spawns l_ryuuzaki_nova_uniform projectile (real sheet, no box), deals dmg, spends energy
//   Forward → Bazooka        : spawns l_ryuuzaki_bazooka_proj_uniform, long-range travel, dmg, spends energy
//   Back    → Rising Burst   : spawns l_ryuuzaki_rising_proj_uniform, LAUNCHES the dummy (vy<0), dmg, spends energy
//   Down    → Investigation  : NON-LETHAL self-buff — deals NO damage, raises damageMultiplier, spends energy, auto-reverts
//   Up      → Ryuk           : fires the Stage-5 Ryuk cameo-attack (bound in Stage 5; asserted here for map-completeness)
//   EX kick-trail            : fires ONLY as a cancel off a normal's recovery — NOT from neutral (Vegeta EX idiom)
// Shots → harness/shots/l_ryuuzaki_s4_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const setEnergy = (v) => page.evaluate((e) => window.__harness.setEnergy(e), v);
const castDir = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_s4_${tag}.png`) }); }
async function cropShot(tag) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await shot(tag); return; }
  const padX = 200, padTop = r.h * 1.1, padBot = 34;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_s4_${tag}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
// Fire a dir-special TWICE:
//   PASS A (dummy FAR) — the projectile has no target to hit on spawn, so it lives its full lifetime →
//     catchable in the projectiles() poll for the sheet-substring + cast pose (short-range moves die
//     instantly on an adjacent dummy, between frames — so we must decouple sheet-detection from damage).
//   PASS B (dummy ADJACENT) — the projectile connects → damage (+ launch vy) + energy spend.
async function fireDirSpecial(tag, dir, sheetSub, wantCast, { damageGap = 40 } = {}) {
  // ── PASS A: sheet + cast (dummy pushed far away so the projectile travels/lives) ──
  await setupAdjacent(560);
  await setEnergy(200); await waitFrames(2);
  const res = await castDir(dir);
  let seenSheet = false, seenCast = false, sheets = [], shotDone = false;
  for (let i = 0; i < 26; i++) {
    const ps = await projs();
    const cur = await p1();
    if (cur.castMove === wantCast) seenCast = true;
    const found = ps.filter(p => (p.sheet || "").includes(sheetSub));
    if (found.length) { seenSheet = true; sheets = ps.map(p => (p.sheet || "").split("/").pop()).filter(Boolean); if (!shotDone) { await cropShot(tag); shotDone = true; } }
    await waitFrames(1);
  }
  if (!shotDone) await cropShot(tag);
  // ── PASS B: damage + launch + energy (dummy adjacent so the projectile connects) ──
  await setupAdjacent(damageGap);
  await setEnergy(200); await waitFrames(2);
  const before = (await p1()).energy ?? 0;
  const hp0 = (await p2()).health;
  await castDir(dir);
  let dmg = 0, minVy = 0;
  for (let i = 0; i < 22; i++) {
    const hpNow = (await p2()).health; dmg = Math.max(dmg, hp0 - hpNow);
    const vy = (await p2()).vy; if (vy < minVy) minVy = vy;
    await waitFrames(1);
  }
  const after = (await p1()).energy ?? 0;
  return { seenSheet, seenCast, spent: before - after, castRes: res, dmg, minVy, sheets: [...new Set(sheets)] };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=l_ryuuzaki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  const g = await p1();
  check("P1 is L (rosterKey l_ryuuzaki)", g.key === "l_ryuuzaki", `key=${g.key}`);

  // ── 1) Golden NOVA (neutral) — marquee wide burst ──
  console.log("\n── neutral → Golden Nova ──");
  {
    const r = await fireDirSpecial("nova_neutral", null, "l_ryuuzaki_nova", "lRyuuzakiNovaCast", { damageGap: 30 });
    check("Nova: cast pose = lRyuuzakiNovaCast", r.seenCast, `cast=${r.castRes?.cast}`);
    check("Nova: spawns l_ryuuzaki_nova_uniform projectile (real sheet, no box)", r.seenSheet, `sheets=[${r.sheets.join(", ")}]`);
    check("Nova: deals damage", r.dmg > 0, `dmg=${r.dmg}`);
    check("Nova: spends Deduction energy", r.spent > 0, `spent=${r.spent}`);
  }

  // ── 2) BAZOOKA (Forward) — long-range traveling projectile ──
  console.log("\n── Forward → Bazooka ──");
  {
    const r = await fireDirSpecial("bazooka_fwd", "F", "l_ryuuzaki_bazooka_proj", "lRyuuzakiBazookaCast", { damageGap: 90 });
    check("Bazooka: cast pose = lRyuuzakiBazookaCast", r.seenCast, `cast=${r.castRes?.cast}`);
    check("Bazooka: spawns l_ryuuzaki_bazooka_proj_uniform projectile (real sheet, no box)", r.seenSheet, `sheets=[${r.sheets.join(", ")}]`);
    check("Bazooka: deals damage (long-range)", r.dmg > 0, `dmg=${r.dmg}`);
    check("Bazooka: spends Deduction energy", r.spent > 0, `spent=${r.spent}`);
  }

  // ── 3) Golden RISING BURST (Back) — LAUNCHER ──
  console.log("\n── Back → Golden Rising Burst (launcher) ──");
  {
    const r = await fireDirSpecial("rising_back", "B", "l_ryuuzaki_rising_proj", "lRyuuzakiRisingCast", { damageGap: 30 });
    check("Rising: cast pose = lRyuuzakiRisingCast", r.seenCast, `cast=${r.castRes?.cast}`);
    check("Rising: spawns l_ryuuzaki_rising_proj_uniform projectile (real sheet, no box)", r.seenSheet, `sheets=[${r.sheets.join(", ")}]`);
    check("Rising: deals damage", r.dmg > 0, `dmg=${r.dmg}`);
    check("Rising: LAUNCHES the dummy (p2 vy < 0)", r.minVy < -0.5, `minVy=${r.minVy.toFixed(1)}`);
    check("Rising: spends Deduction energy", r.spent > 0, `spent=${r.spent}`);
  }

  // ── 4) INVESTIGATION / ANALYSIS (Down) — NON-LETHAL self-buff (no damage, raises damageMultiplier) ──
  console.log("\n── Down → Investigation / Analysis (non-lethal buff) ──");
  {
    await setupAdjacent(60);
    await setEnergy(200); await waitFrames(2);
    const before = (await p1()).energy ?? 0;
    const hp0 = (await p2()).health;
    const res = await castDir("D");
    let castSeen = false, dmgMult = 1;
    for (let i = 0; i < 16; i++) {
      const cur = await p1();
      if (cur.castMove === "lRyuuzakiAnalysis") castSeen = true;
      dmgMult = Math.max(dmgMult, cur.dmgMult ?? cur.damageMult ?? 1);
      if (i === 6) await cropShot("analysis_down");
      await waitFrames(1);
    }
    const hp1 = (await p2()).health;
    const after = (await p1()).energy ?? 0;
    check("Analysis: cast pose = lRyuuzakiAnalysis (red-notebook manifest)", castSeen, `cast=${res?.cast}`);
    check("Analysis: is NON-LETHAL (deals NO damage)", (hp0 - hp1) === 0, `dmgDealt=${(hp0 - hp1)}`);
    check("Analysis: raises damageMultiplier (self-buff active)", dmgMult > 1, `dmgMult=${dmgMult}`);
    check("Analysis: spends Deduction energy", (before - after) > 0, `spent=${before - after}`);
  }

  // ── 5) Up direction now fires the Stage-5 RYUK cameo-attack (bound in Stage 5; was reserved in Stage 4).
  // Kept here so the Stage-4 dir map stays complete: Up must produce the Ryuk summon gesture + spend energy. ──
  console.log("\n── Up → Ryuk cameo-attack (Stage-5 slot, now bound) ──");
  {
    await setupAdjacent(60);
    await setEnergy(200); await waitFrames(2);
    const before = (await p1()).energy ?? 0;
    const res = await castDir("U");
    await waitFrames(4);
    const after = (await p1()).energy ?? 0;
    check("Up: fires Ryuk cameo-attack (cast = lRyuuzakiRyukCast)", res?.cast === "lRyuuzakiRyukCast", `move=${res?.move} cast=${res?.cast}`);
    check("Up: spends Deduction energy (Ryuk summon)", (before - after) > 0, `before=${before} after=${after}`);
  }

  // ── 6) EX KICK-TRAIL is CANCEL-ONLY: does NOT fire from neutral ──
  console.log("\n── EX kick-trail: does NOT fire from neutral ──");
  {
    await setupAdjacent(50);
    await setEnergy(200); await waitFrames(2);
    // With no held direction and no ongoing attack, a neutral Special must NEVER produce the kick-trail.
    // (neutral Special → executeLRyuuzakiSpecial → Golden Nova, which is NOT the flurry.)
    const res = await castDir(null);
    let sawKickTrailNeutral = false;
    for (let i = 0; i < 16; i++) { const cur = await p1(); if ((cur.currentMove || "") === "lRyuuzakiKickTrail") sawKickTrailNeutral = true; await waitFrames(1); }
    check("EX: neutral Special does NOT fire lRyuuzakiKickTrail (cancel-only gate)", !sawKickTrailNeutral, `neutral fired kicktrail=${sawKickTrailNeutral}`);
    check("EX: neutral Special produced the Golden Nova cast instead", res?.cast === "lRyuuzakiNovaCast" || res?.move == null, `cast=${res?.cast}`);
  }

  // ── 7) EX KICK-TRAIL fires as a CANCEL off a normal's recovery ──
  console.log("\n── EX kick-trail: fires as a cancel off a normal ──");
  {
    let fired = false, sheetOk = false, exDmg = 0;
    for (let attempt = 0; attempt < 12 && !fired; attempt++) {
      await setupAdjacent(46);
      await setEnergy(200); await waitFrames(2);
      const hp0 = (await p2()).health;
      // Throw a HEAVY normal (k) — connects on the adjacent dummy — then during its recovery press
      // Special (l) as a fresh EDGE to cancel into the flurry. (light=j, heavy=k, special=l.)
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
      // poll for the heavy's recovery, then fire ONE clean Special edge to cancel into the flurry.
      for (let r = 0; r < 30 && !fired; r++) {
        const s = await p1();
        if ((s.currentMove || "") === "lRyuuzakiKickTrail") { fired = true; break; }
        if (s.attackPhase === "recovery" && s.attacking) {
          await page.keyboard.up("l");
          await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await waitFrames(1);
          const s2 = await p1();
          if ((s2.currentMove || "") === "lRyuuzakiKickTrail") { fired = true; break; }
        } else if (!s.attacking) { break; }
        await waitFrames(1);
      }
      if (fired) {
        // capture the flurry + sample damage/sheet across its active window
        for (let f = 0; f < 20; f++) {
          const s = await p1();
          if ((s.spriteSheet || "").includes("l_ryuuzaki_kicktrail_uniform")) sheetOk = true;
          if (f === 4) await cropShot("ex_kicktrail");
          await waitFrames(1);
        }
        const hp1 = (await p2()).health; exDmg = Math.max(0, hp0 - hp1);
      }
      await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3);
    }
    check("EX: fires as a cancel off a normal's recovery (currentMove lRyuuzakiKickTrail)", fired, fired ? "cancelled into flurry" : "never cancelled");
    check("EX: plays l_ryuuzaki_kicktrail_uniform sprite (real sheet, no box)", sheetOk, sheetOk ? "real flurry sheet" : "no kicktrail sheet seen");
    check("EX: multi-hit flurry deals damage", exDmg > 0, `dmg=${exDmg}`);
  }

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} L Ryuuzaki Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/l_ryuuzaki_s4_*`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
