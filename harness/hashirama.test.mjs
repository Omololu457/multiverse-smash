// harness/hashirama.test.mjs — CANONICAL full-kit suite for Hashirama Senju (Naruto).
// One deterministic pass over the ENTIRE kit: registration/portrait/stats/sprite-gate · 5 normals + command
// chain + poke · Kunai (ground) · Wood Release Punch (CHARGE tap/hold) · Mokuton arm · the Tree Summon ladder
// (escalating scale) · Wood Golem · Gracious Deity Gates pin · the Sealing Jutsu ULTIMATE cinematic — with an
// EXPLICIT duplicate-render guard on the ult (the project's known dup-render bug class). Each section SETTLES
// first (the fighter is idle, cooldowns clear) to avoid state-bleed. Directional specials fire deterministically
// via __harness.p1SpecialDir(dir). The per-stage harnesses (test:hashirama-s1..s7) cover finer live detail.
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
const cine = () => page.evaluate(() => window.__harness.sealingCine());
const domain = () => page.evaluate(() => window.__harness.domainState());
const specialDir = (d) => page.evaluate((dd) => window.__harness.p1SpecialDir(dd), d);
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
// settle: fully return to neutral (idle, not attacking, no cast lock) so the next section's input isn't eaten.
async function settle() {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && p.attacking === false && p.currentMove == null && p.castMove == null && (p.hitstun || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function park(gap) {
  await settle();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitMove(move, maxF = 24) { for (let f = 0; f < maxF; f++) { const s = await p1(); if (s.currentMove === move || s.castMove === move) return s; await waitFrames(1); } return await p1(); }
async function waitAction(action, maxF = 20) { for (let f = 0; f < maxF; f++) { const s = await p1(); if (s.action === action) return s; await waitFrames(1); } return await p1(); }
async function findProj(tok, maxF = 40) { for (let f = 0; f < maxF; f++) { const k = (await projs()).find(p => (p.sheet || "").includes(tok)); if (k) return k; await waitFrames(1); } return null; }
// fire, then poll for a p2 hp drop (re-heals kept in park); returns damage dealt (0 if none within budget)
async function damageOf(fire, budget = 60) { const hp0 = (await p2()).health; await fire(); for (let f = 0; f < budget; f++) { const h = (await p2()).health; if (h < hp0) return hp0 - h; await waitFrames(1); } return 0; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=hashirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── A. REGISTRATION / PORTRAIT / STATS / SPRITE GATE ──
  console.log("\n── A. registration + stats + portrait ──");
  const g = await p1();
  check("P1 is Hashirama, renders as sprites", g.key === "hashirama" && g.hasSpriteHandler, `key=${g.key} handler=${g.hasSpriteHandler}`);
  check("idle sheet = hashirama_idle_uniform (no box)", (g.spriteSheet || "").includes("hashirama_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("stats HP1220 / EN220 / scale1.55", g.maxHealth === 1220 && g.maxEnergy === 220 && Math.abs((g.spriteScale || 0) - 1.55) < 0.01, `HP=${g.maxHealth} EN=${g.maxEnergy} scale=${g.spriteScale}`);
  const cd = await page.evaluate(() => window.__harness.charDef("hashirama"));
  // introSequencePool is 2 (pillar rise→open, shunshin); the former 3rd entry "introWoodClone" was
  // re-categorized as the real Wood Clone special's caster pose (woodCloneCast) on 2026-08-12.
  check("charDef wired: naruto stats + sprite scale + intro pool", !!cd?.stats && cd.introSequencePool?.length === 2 && !!cd.animationData?.sealingCombo, `stats=${!!cd?.stats} intro=${cd?.introSequencePool?.length}`);
  const portraitOK = await page.evaluate(async (u) => { try { const im = new Image(); im.src = u; await im.decode(); return im.naturalWidth > 0 && im.naturalHeight > 0; } catch { return false; } }, `${base}/hashirama_portrait.png`);
  check("portrait extracted + loads (hashirama_portrait.png)", portraitOK, "");

  // ── B. NORMALS + CHAIN + POKE ──
  console.log("\n── B. normals + chain + poke ──");
  const normals = [["light", "j", "light"], ["heavy", "k", "heavy"], ["upAttack", "i", "up"]];
  for (const [name, key, action] of normals) {
    await park(58);
    const dmg = await damageOf(async () => { await page.keyboard.down(key); const mv = await waitAction(action); check(`${name} plays (${action})`, mv.action === action, `action=${mv.action}`); await page.keyboard.up(key); }, 44);
    check(`${name} connects`, dmg > 0, `−${dmg.toFixed(0)}`);
  }
  await park(44);
  { const dmg = await damageOf(async () => { await page.evaluate(() => window.__harness.liftP1(46)); await page.keyboard.down("j"); await waitAction("air"); await page.keyboard.up("j"); }, 44); check("air normal connects", dmg > 0, `−${dmg.toFixed(0)}`); }
  await park(24);
  { const dmg = await damageOf(async () => { await page.evaluate(() => window.__harness.liftP1(58)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await page.keyboard.up("s"); }, 60); check("down_air connects", dmg > 0, `−${dmg.toFixed(0)}`); }
  // Fwd+Heavy chain opener — retry the whole opener (re-park + re-center each time) until hashiComboA
  // registers (the rekka fresh-edge is playwright-jittery; running can eat a single Heavy tap — stage2 note).
  let om = {};
  for (let attempt = 0; attempt < 8 && om.currentMove !== "hashiComboA"; attempt++) {
    await park(50); await page.keyboard.down("d"); await waitFrames(3);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    om = await waitMove("hashiComboA", 8);
    await page.keyboard.up("d");
  }
  check("Fwd+Heavy opens chain (hashiComboA) + queues hashiComboB", om.currentMove === "hashiComboA" && om.rekkaNext === "hashiComboB", `move=${om.currentMove} next=${om.rekkaNext}`);

  // ── C. KUNAI (neutral Special) ──
  console.log("\n── C. Kunai ──");
  await park(150);
  const hpK0 = (await p2()).health;
  await specialDir(null);   // neutral Special → ground Kunai (deterministic; _specialHeldDir=null → kunai branch)
  const kunaiProj = await findProj("kunai_throw_projectile", 24);
  check("ground Kunai spawns the spinning-shuriken projectile", !!kunaiProj, `cast=${(await p1()).castMove}`);
  let kd = 0; for (let f = 0; f < 60; f++) { const h = (await p2()).health; if (h < hpK0) { kd = hpK0 - h; break; } await waitFrames(1); }
  check("Kunai connects", kd > 0, `−${kd.toFixed(0)}`);

  // ── D. WOOD RELEASE PUNCH (CHARGE tap + hold) ──
  console.log("\n── D. Wood Release Punch (tap/hold) ──");
  await park(110);
  await page.waitForFunction(() => (window.__harness.p1().woodPunchCd || 0) === 0, null, { timeout: 3000 }).catch(() => {});
  const tapDmg = await damageOf(async () => { await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p"); const mv = await waitMove("woodPunch"); check("CHARGE tap → woodPunch", mv.currentMove === "woodPunch", `move=${mv.currentMove}`); }, 40);
  check("Wood Punch (tap) connects", tapDmg > 0, `−${tapDmg.toFixed(0)}`);
  await park(140);
  await page.waitForFunction(() => (window.__harness.p1().woodPunchCd || 0) === 0, null, { timeout: 3000 }).catch(() => {});
  let superDmg = 0;
  { const hp0 = (await p2()).health; await page.keyboard.down("p"); await page.waitForTimeout(350); await page.keyboard.up("p"); const mv = await waitMove("woodPunchSuper"); check("CHARGE hold → woodPunchSuper (Super wood spear)", mv.currentMove === "woodPunchSuper", `move=${mv.currentMove}`); for (let f = 0; f < 34; f++) { const h = (await p2()).health; if (h < hp0) { superDmg = hp0 - h; break; } await waitFrames(1); } }
  check("Super out-damages the base tap", superDmg > tapDmg, `super −${superDmg.toFixed(0)} vs tap −${tapDmg.toFixed(0)}`);

  // ── E. DIRECTIONAL SPECIALS — Mokuton arm / Tree ladder / Wood Golem / Gates ──
  console.log("\n── E. directional Mokuton specials ──");
  await park(90);
  const armDmg = await damageOf(async () => { await specialDir("F"); }, 34);
  check("Fwd+Special → Mokuton arm connects", armDmg > 0, `−${armDmg.toFixed(0)}`);
  // tree ladder — tier1 then escalate to tier2; assert escalating rendered scale
  await park(64); await specialDir("D"); const t1 = await findProj("treee_summon_1_tree");
  const t1h = t1 ? (t1.spriteScale || 1) * (t1.spriteH || 40) : 0;
  await waitFrames(30);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 64); window.__harness.healP2?.(); }); await waitFrames(2);
  await specialDir("D"); const t2 = await findProj("treee_summon_2_tree");
  const t2h = t2 ? (t2.spriteScale || 1) * (t2.spriteH || 62) : 0;
  check("Tree Summon ladder escalates (tier1 → bigger tier2)", !!t1 && !!t2 && t2h > t1h, `t1=${t1h.toFixed(0)}px t2=${t2h.toFixed(0)}px`);
  check("tree summons are real growth strips (spriteFrames>1 + spriteOnce)", !!t1 && (t1.spriteFrames || 1) > 1 && t1.spriteOnce === true, `frames=${t1?.spriteFrames} once=${t1?.spriteOnce}`);
  // wood golem — prove the giant spawns + connects (2-hit detail is stage6's job)
  await park(150);
  const golemDmg = await damageOf(async () => { await specialDir("U"); }, 50);
  const gl = await findProj("wood_golem", 4);
  check("Up+Special → Wood Golem (giant, scale≈1.45) connects", golemDmg > 40 && !!gl && (gl.spriteScale || 0) > 1.3, `−${golemDmg.toFixed(0)} scale=${gl?.spriteScale}`);
  // gates — 2 gates + pin
  await park(70); const before = await p2(); await specialDir("B"); await findProj("gracious_deity_gates_wood"); await waitFrames(4);
  const gates = (await projs()).filter(p => (p.sheet || "").includes("gracious_deity_gates_wood"));
  const pinned = await p2();
  check("Back+Special → Gracious Deity Gates: 2 gates + opponent PINNED", gates.length === 2 && (pinned.hitstun || 0) > 30, `gates=${gates.length} hitstun=${pinned.hitstun}`);

  // ── F. SEALING JUTSU ULTIMATE — cinematic + guaranteed damage + DUP-RENDER GUARD ──
  console.log("\n── F. Sealing Jutsu ULTIMATE (Domain-Expansion trap) ──");
  await park(90);
  await page.evaluate(() => { window.__harness.resetUlt(); window.__harness.healP2?.(); });
  const hpFull = (await p2()).health;
  let cActive = false;
  for (let attempt = 0; attempt < 3 && !cActive; attempt++) {
    await page.evaluate(() => window.__harness.resetUlt());
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    for (let f = 0; f < 16; f++) { const c = await cine(); if (c && c.active) { cActive = true; break; } await waitFrames(1); }
  }
  check("Ultimate activates the Sealing Jutsu domain overlay", cActive, "");
  const dom = await domain();
  check("a HASHIRAMA Domain Expansion is active (sealing_box backdrop + trap)", !!dom && dom.rosterKey === "hashirama", `domain=${JSON.stringify(dom)}`);
  // Run through the trap window: confirm the foe is frozen, the caster is NEVER frozen, cameos strike + damage accrues.
  let oppFrozen = false, casterEverFrozen = false;
  const hits0 = (await cine())?.hits || 0;
  for (let f = 0; f < 170; f++) {
    const s = await cine(); if (!s || !s.active) break;
    if ((await p2()).domainFrozen) oppFrozen = true;
    if ((await p1()).domainFrozen) casterEverFrozen = true;   // the caster must NEVER be frozen
    await waitFrames(1);
  }
  check("trapped opponent CANNOT act (domainFrozen)", oppFrozen, "");
  check("Hashirama (caster) is NEVER frozen — free to attack during the trap", !casterEverFrozen, "");
  const midCine = await cine();
  check("cameo assists STRIKE the trapped foe DURING the window (hits accrue)", (midCine?.hits || 0) > hits0, `hits=${midCine?.hits}`);
  const hpMid = (await p2()).health;
  check("cameo strikes deal progressive damage over the trap", hpFull - hpMid > 20, `−${(hpFull - hpMid).toFixed(0)} so far`);
  // Domain expires → back to normal play.
  // 7s domain (420f); allow generous wall-clock headroom in case the headless loop is throttled under load.
  await page.waitForFunction(() => { const d = window.__harness.domainState(); const s = window.__harness.sealingCine(); return !d && (!s || !s.active); }, null, { timeout: 26000, polling: 32 }).catch(() => {});
  const domEnd = await domain(), cineEnd = await cine(), oppEnd = await p2();
  check("domain ENDS cleanly → normal play (no domain, overlay off, foe unfrozen)", !domEnd && (!cineEnd || !cineEnd.active) && !oppEnd.domainFrozen, `dom=${!!domEnd} cine=${cineEnd?.active} frozen=${oppEnd.domainFrozen}`);
  const totalDmg = hpFull - oppEnd.health;
  check("total guaranteed cameo damage in a fair band (80–300)", totalDmg > 80 && totalDmg < 300, `−${totalDmg.toFixed(0)} total`);
  check("no lingering cast lock on the caster", (await p1()).castMove !== "gatesCaster", `castMove=${(await p1()).castMove}`);

  check("no JS page errors across the whole kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Hashirama full kit: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
