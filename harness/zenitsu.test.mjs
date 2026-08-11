// harness/zenitsu.test.mjs — CANONICAL full-kit test for Zenitsu Agatsuma (first Demon Slayer char).
// Covers registration + portrait, movement/state, all 5 normals + the "Thunderclap Flurry" Down+Heavy
// rekka (with mid-chain interrupt), the Thunder Breathing 1st Form dash-strike special (cooldown-gated,
// blockable), BOTH Double Attack partner variants (Tanjiro/Inosuke — far-side spawn, poof, shared
// cooldown), the "Godspeed" dash-through Ultimate with EXPLICIT assertions on same-level / unblockable /
// cooldown-not-energy, a FALLBACK-BOX SWEEP (every move → real zenitsu_* sheet), and a no-JS-error check.
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
const seen = new Map();

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const summons = () => page.evaluate(() => window.__harness.summons());
const puffs = () => page.evaluate(() => window.__harness.clonePuffCount());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
function rec(mv) { if (mv && mv.action) seen.set(mv.action, mv.spriteSheet || null); return mv; }
async function waitSheet(needle, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return rec(mv); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function adjacent(gap = 60, block = false) {
  await idleReady();
  await page.evaluate(b => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(b); }, block);
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function pressUlt() { await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); }

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=zenitsu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("zenitsu"));
  check("zenitsu.portrait wired", portrait === "./zenitsu_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./zenitsu_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("demon_slayer", "training"));
  check("Demon Slayer universe established + includes zenitsu", sel.roster.includes("zenitsu"), `roster=${sel.roster.join(",")}`);
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── MOVEMENT / STATE ──
  section("movement / state");
  await idleReady();
  check("P1 is Zenitsu (sprites)", (await p1()).key === "zenitsu" && (await p1()).hasSpriteHandler, "");
  check("no energy bar (maxEnergy floored 0→1)", (await p1()).maxEnergy <= 1, `maxEnergy=${(await p1()).maxEnergy}`);
  rec(await waitSheet("zenitsu_idle_uniform"));
  check("idle sheet", (await p1()).spriteSheet.includes("zenitsu_idle_uniform"), "");
  await page.keyboard.down("d"); check("run", (await waitSheet("zenitsu_run_uniform")).spriteSheet.includes("zenitsu_run_uniform"), ""); await page.keyboard.up("d"); await waitFrames(4);
  await waitGrounded();
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2); await page.keyboard.down("d");
  check("dash", (await waitSheet("zenitsu_dash_uniform")).spriteSheet.includes("zenitsu_dash_uniform"), ""); await page.keyboard.up("d"); await waitFrames(6);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w"); await waitFrames(4);
  check("jump", (await waitSheet("zenitsu_jump_uniform")).spriteSheet.includes("zenitsu_jump_uniform"), ""); await waitGrounded();
  await page.keyboard.down(";"); check("guard", (await waitSheet("zenitsu_guard_uniform")).spriteSheet.includes("zenitsu_guard_uniform"), ""); await page.keyboard.up(";"); await waitFrames(3);
  await page.evaluate(() => window.__harness.hurtP1(24)); check("hurt", (await waitSheet("zenitsu_hit_uniform")).spriteSheet.includes("zenitsu_hit_uniform"), ""); await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

  // ── 5 NORMALS ──
  section("normals");
  for (const [nm, key, sheet] of [["light", "j", "zenitsu_foward_slash_uniform"], ["heavy", "k", "zenitsu_foward_hit_uniform"], ["upAttack", "i", "zenitsu_up_attack_uniform"]]) {
    await adjacent(58); const hp0 = (await p2()).health;
    await page.keyboard.down(key); const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(20);
    check(`${nm} → ${sheet}`, mv.spriteSheet.includes(sheet), `sheet=${mv.spriteSheet}`);
    check(`${nm} connects`, (await p2()).health < hp0, "");
  }
  await adjacent(52); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(44)); await page.keyboard.down("j"); const mv = await waitSheet("zenitsu_down_air_2_uniform"); await page.keyboard.up("j"); await waitFrames(14); check("air → zenitsu_down_air_2_uniform", mv.spriteSheet.includes("zenitsu_down_air_2_uniform"), ""); check("air connects", (await p2()).health < hp0, ""); }
  await adjacent(30); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(50)); await page.keyboard.down("s"); await page.keyboard.down("j"); const mv = await waitSheet("zenitsu_down_air_1_uniform", 6); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14); check("down_air → zenitsu_down_air_1_uniform", mv.spriteSheet.includes("zenitsu_down_air_1_uniform"), ""); check("down_air connects", (await p2()).health < hp0, ""); }

  // ── THUNDERCLAP FLURRY CHAIN (Down+Heavy rekka) + interrupt ──
  section("Thunderclap Flurry chain (Forward+Heavy) + interrupt");   // combo-string standardization Stage B: was Down+Heavy
  await adjacent(44); { const hp0 = (await p2()).health; const chain = [];
    await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("d");
    for (let i = 0; i < 52; i++) { const c = rec(await p1()); if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove); if (chain.includes("zenCombo3")) break; if (!c.attacking) break; if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
    await waitFrames(18);
    check("chain zenCombo1→2→3", chain[0] === "zenCombo1" && chain.includes("zenCombo2") && chain.includes("zenCombo3"), `[${chain.join("→")}]`);
    check("chain combo damage", hp0 - (await p2()).health > 60, ""); }
  // mid-chain interrupt: whiff opener → must NOT advance
  await adjacent(44); { await page.evaluate(x => window.__harness.setP2X(x + 600), 0);
    await waitFrames(3);   // let facing settle after the yank so `forward` is correct (Fwd+Heavy opener is facing-relative)
    // Fwd+Heavy is facing-relative: pick the forward key from LIVE facing (p2 was yanked far away, so p1
    // may be on either side). With the old Down+Heavy this didn't matter; now it does.
    const fwd = (await p1()).facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up(fwd);
    // Capture the opener move as soon as it appears: a WHIFFING opener has no hitstop to freeze the frame,
    // so a single-shot read can race past zenCombo1's brief window. Sample a short loop for the first
    // non-null currentMove — the durable proof the opener FIRED.
    let open = null;
    for (let i = 0; i < 8; i++) { const m = (await p1()).currentMove; if (m) { open = m; break; } await waitFrames(1); }
    let rec2 = false; for (let i = 0; i < 40; i++) { const p = await p1(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec2 = true; break; } await waitFrames(1); }
    if (rec2) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); }
    const after = (await p1()).currentMove;
    check("interrupt: opener=zenCombo1, whiff does NOT advance", open === "zenCombo1" && after !== "zenCombo2", `open=${open} after=${after}`); }

  // ── THUNDER BREATHING 1st FORM (Neutral+Special dash-strike) ──
  section("Thunder Breathing 1st Form (Neutral+Special) — cooldown-gated, blockable");
  await adjacent(120); { const zx0 = (await p1()).x; const hp0 = (await p2()).health;
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    rec(await waitSheet("zenitsu_thunderclap_uniform"));
    await waitFrames(16); const moved = (await p1()).x - zx0;
    check("Thunderclap → zenitsu_thunderclap sprite", seen.get("zenThunderclap")?.includes("zenitsu_thunderclap_uniform") || (await p1()).spriteSheet.includes("zenitsu_thunderclap_uniform"), "");
    check("Thunderclap lunges + connects", moved > 40 && hp0 - (await p2()).health > 50, `Δx=${moved.toFixed(0)}`);
    check("Thunderclap sets cooldown (thunderCd)", (await p1()).thunderCd > 0, `thunderCd=${(await p1()).thunderCd}`); }
  // cooldown blocks re-fire
  { await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await waitGrounded(); const cd = (await p1()).thunderCd; const hpb = (await p2()).health; await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(8);
    check("Thunderclap cooldown blocks re-fire", cd > 0 && (await p2()).health === hpb, `thunderCd=${cd}`); }
  // blockable (chip only)
  await page.waitForFunction(() => (window.__harness.p1().thunderCd || 0) === 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await adjacent(96, true); { const hpb = (await p2()).health; await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(20);
    const chip = hpb - (await p2()).health; check("Thunderclap BLOCKABLE (chip only)", chip >= 0 && chip < 40, `chip=−${chip.toFixed(0)}`); }

  // ── DOUBLE ATTACK (Fwd=Tanjiro, Down=Inosuke) ──
  section("Double Attack — two partner variants, shared cooldown");
  for (const [label, dirKey, id, tag] of [["Tanjiro", "d", "zenitsuTanjiro", "zenitsu_tanjiro_partner_uniform"], ["Inosuke", "s", "zenitsuInosuke", "zenitsu_inosuke_partner_uniform"]]) {
    await adjacent(80); const facing = (await p1()).facing; const oppX = (await p2()).x; const hp0 = (await p2()).health;
    await page.keyboard.down(dirKey); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let saw = false, farSide = false, sheetOK = false, poofed = false, partnerHit = false;
    for (let i = 0; i < 60; i++) { const sm = (await summons()).find(s => s.id === id); if (sm) { saw = true; if (!sheetOK) { sheetOK = (sm.sheet || "").includes(tag); farSide = facing > 0 ? sm.x > oppX : sm.x < oppX; } if (sm.hasHit) partnerHit = true; } else if (saw) { poofed = (await puffs()) > 0; break; } await waitFrames(1); }
    await page.keyboard.up(dirKey); await waitFrames(4);
    const dmg = hp0 - (await p2()).health; const cd = (await p1()).doubleAtkCd;
    rec({ action: id, spriteSheet: `./${tag}.png` });   // register partner sheet for the sweep
    check(`${label}: partner spawns (correct sheet, FAR side)`, saw && sheetOK && farSide, `sheetOK=${sheetOK} far=${farSide}`);
    check(`${label}: combined pincer connects`, partnerHit || dmg > 70, `−${dmg.toFixed(0)}`);
    check(`${label}: partner POOFS on despawn`, poofed, "");
    check(`${label}: sets shared cooldown`, cd > 0 && (await p1()).doubleAtkVariant === label.toLowerCase(), `doubleAtkCd=${cd}`);
    if (label === "Tanjiro") { // the OTHER variant must be locked out by the shared cooldown
      const cdNow = (await p1()).doubleAtkCd; await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s"); await waitFrames(3);
      check("shared cooldown locks out the other variant", cdNow > 0 && (await summons()).every(s => s.id !== "zenitsuInosuke"), `doubleAtkCd=${cdNow}`);
      await page.waitForFunction(() => (window.__harness.p1().doubleAtkCd || 0) === 0, null, { timeout: 6000, polling: 16 }).catch(() => {});
    }
  }

  // ── ULTIMATE "Godspeed" — same-level / unblockable / cooldown-not-energy (EXPLICIT) ──
  section("Ultimate: dash-through slice — same-level, UNBLOCKABLE, COOLDOWN-not-energy");
  // same-level connect + pass-through
  await adjacent(70); { const oppX = (await p2()).x; const hp0 = (await p2()).health;
    await pressUlt(); rec(await waitSheet("zenitsu_ultimate_uniform")); await waitFrames(14);
    const dmg = hp0 - (await p2()).health; const zx = (await p1()).x;
    check("ULT same-level: connects (ultimate-tier dmg)", dmg > 120, `−${dmg.toFixed(0)}`);
    check("ULT dashes THROUGH to far side", zx > oppX, `zAfter=${zx.toFixed(0)} oppX=${oppX.toFixed(0)}`);
    check("ULT not flagged whiff at same level", (await p1()).zenUltWhiff === false, "");
    check("ULT sets cooldown", (await p1()).ultCooldown > 0, `ultCooldown=${(await p1()).ultCooldown}`); }
  // level mismatch → whiff, cooldown still spent
  await adjacent(70); { await page.evaluate(() => window.__harness.liftP1(90)); await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
    const hp0 = (await p2()).health; await pressUlt(); await waitFrames(16);
    check("ULT level MISMATCH: whiffs (no damage)", (await p2()).health === hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
    check("ULT mismatch: flagged whiff", (await p1()).zenUltWhiff === true, "");
    check("ULT mismatch: cooldown STILL spent (no refund)", (await p1()).ultCooldown > 0, `ultCooldown=${(await p1()).ultCooldown}`); }
  // UNBLOCKABLE — full through a held guard
  await adjacent(70, true); { const guarding = (await p2()).blocking; const hp0 = (await p2()).health;
    await pressUlt(); await waitFrames(16);
    check("ULT opponent guarding", guarding === true, "");
    check("ULT UNBLOCKABLE: lands FULL through guard", hp0 - (await p2()).health > 120, `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  // COOLDOWN not energy
  await adjacent(70); { const e0 = (await p1()).energy; await pressUlt(); await waitFrames(6);
    const cdA = (await p1()).ultCooldown; check("ULT cooldown ~8s (≈480f)", cdA > 400 && cdA <= 480, `ultCooldown=${cdA}`);
    check("ULT spends NO energy", (await p1()).energy === e0, `${e0}→${(await p1()).energy}`);
    await waitFrames(20); const cdB = (await p1()).ultCooldown; check("ULT cooldown counts down", cdB < cdA, `${cdA}→${cdB}`);
    await waitGrounded(); const cdPre = (await p1()).ultCooldown; await pressUlt(); await waitFrames(6); const cdPost = (await p1()).ultCooldown;
    check("ULT recast BLOCKED on cooldown (not reset)", cdPost < cdPre && cdPost < 470, `${cdPre}→${cdPost}`); }

  // ── FALLBACK-BOX SWEEP ──
  section("fallback-box sweep (every move → real zenitsu_* sheet, never 128² box / null)");
  let boxes = 0;
  for (const [action, sheet] of seen) {
    const bad = !sheet || sheet.includes("128") || !sheet.includes("zenitsu");
    if (bad) { boxes++; console.log(`   ⚠ '${action}' → ${sheet}`); }
  }
  check("no fallback-box / foreign sheet on any exercised action", boxes === 0, `${seen.size} actions checked`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));

} catch (e) { check("test run completed without throwing", false, String(e)); }

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
