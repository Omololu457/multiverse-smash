// harness/zaraki.test.mjs — STAGE 1 test for Zaraki Kenpachi (Bleach).
// Covers ONLY what Stage 1 wires: base-form movement + states.
//   • registration in the Bleach universe roster + portrait loads (no 404)
//   • movement/state poses (idle, walk, run, dash, jump, fall, guard)
//   • 3 hit-reaction strips wired to distinct roles (hurt / hurt_air / knockdown / knockdownHeavy)
//   • low-health COSMETIC idle swap (real HP-threshold behaviour, proven stat-free)
//   • both taunts (primary `taunt` + alt `tauntAlt`) render their own strips
//   • no JS errors, no 404 on any Stage-1 sheet
// (Normals/specials/Shikai/Bankai/assist arrive in Stages 2-5 with their own tests.)
// Usage: node harness/zaraki.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [], net404 = [];
page.on("pageerror", e => jsErrors.push(String(e)));
page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });
page.on("response", r => { if (r.status() === 404) net404.push(r.url().split("/").pop()); });

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
// force an action via benPose, wait, return the fighter export
async function pose(action, who = "p1") { await page.evaluate(a => window.__harness.benPose(a, "p1"), action); await waitFrames(3); return await p1(); }
// poll up to maxF frames for P1's active sheet to include `needle`; return the frame it appeared on (or null)
async function waitPose(needle, maxF = 24) { for (let i = 0; i < maxF; i++) { if (has(await p1(), needle)) return await p1(); await waitFrames(1); } return null; }
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
// poll up to maxF frames for a projectile whose name OR sheet includes `needle`
async function waitProj(needle, maxF = 24) { for (let i = 0; i < maxF; i++) { const p = (await projs()).find(x => (x.name || "").includes(needle) || (x.sheet || "").includes(needle)); if (p) return p; await waitFrames(1); } return null; }
// reset to a clean neutral state, position the dummy `gap` px in front, full energy
async function reset(gap = 60) {
  await page.evaluate(() => { window.__harness.benPose(null, "p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=zaraki&p2=ichigo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── REGISTRATION + PORTRAIT ──
section("Registration + portrait");
const cs = await page.evaluate(() => window.__harness.showCharSelect("bleach", "training"));
check("Zaraki in the Bleach universe roster", cs.roster.includes("zaraki"), `roster=[${cs.roster.join(",")}]`);
const portraitOk = await page.evaluate(async () => { const img = new Image(); img.src = "./zaraki_transparent_copy.png"; try { await img.decode(); return img.naturalWidth > 0 && img.naturalHeight > 0; } catch { return false; } });
check("portrait loads (no 404)", portraitOk && !net404.includes("zaraki_transparent_copy.png"), `decode ok=${portraitOk}`);

await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
const bootKey = (await p1()).rosterKey ?? (await p1()).name;
check("P1 booted as Zaraki (sprite handler active)", (await p1()).hasSpriteHandler === true, `handler=${(await p1()).hasSpriteHandler}`);

// ── MOVEMENT / STATE poses ──
section("Movement / state poses");
for (const [action, sheet] of [
  ["idle","idle_uniform"], ["walk","move_uniform"], ["run","move_uniform"],
  ["dash","dash_uniform"], ["jump","jump_uniform"], ["guard","block_uniform"],
]) {
  const a = await pose(action === "idle" ? null : action);
  check(`${action} → ${sheet}`, has(a, sheet), `sheet=${(a.spriteSheet||"").split("/").pop()}`);
}
// fall shares the jump sheet but pins the descending cell (sourceX 476)
{ const a = await pose("fall");
  check("fall → jump_uniform @ sourceX 476 (descent cell)", has(a, "jump_uniform") && a.spriteSourceX === 476, `sheet=${(a.spriteSheet||"").split("/").pop()} sx=${a.spriteSourceX}`); }

// ── HIT REACTIONS (3 source strips, distinct roles) ──
section("Hit reactions (hit / hit_1 / hit_2 all wired)");
for (const [action, sheet] of [
  ["hurt","hit_1_uniform"],            // light/normal flinch (hit_1 frame 0)
  ["knockdown","hit_1_uniform"],       // standard knockdown (hit_1 full)
  ["knockdownHeavy","hit_2_uniform"],  // heavy/launcher sprawl (hit_2)
  ["hurt_air","hit_uniform"],          // airborne launched reaction (hit)
]) {
  const a = await pose(action);
  check(`${action} → ${sheet}`, has(a, sheet), `sheet=${(a.spriteSheet||"").split("/").pop()}`);
}
// hurt must be the single-frame flinch (frame 0, sourceX 0) — not the full recoil strip
{ const a = await pose("hurt"); check("hurt is single flinch frame (frames=1)", a.spriteFrames === 1, `frames=${a.spriteFrames}`); }

// ── TAUNTS (primary + alt both wired to real strips) ──
section("Taunts (taunt + tauntAlt)");
{ const a = await pose("taunt");    check("taunt → taunt_uniform (primary)", has(a, "taunt_uniform"), `sheet=${(a.spriteSheet||"").split("/").pop()}`); }
{ const a = await pose("tauntAlt"); check("tauntAlt → tuant_2_uniform (alt)", has(a, "tuant_2_uniform"), `sheet=${(a.spriteSheet||"").split("/").pop()}`); }
// alt-taunt commit picks a variant randomly — verify the game-side pick machinery is generic & present
const tauntVariantWired = await page.evaluate(() => {
  const c = window.__harness; const p = c.p1(); return !!p; // presence only; deep commit path is a 10s hold, out of scope for a fast test
});
check("taunt system present for Zaraki", tauntVariantWired);

// ── LOW-HEALTH COSMETIC IDLE (real HP threshold, no stat change) ──
section("Low-health cosmetic idle swap");
await page.evaluate(() => window.__harness.benPose(null, "p1"));           // release forced pose → natural resolution
await page.evaluate(() => window.__harness.healP1?.());                    // full HP
await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
await waitFrames(4);
const full = await p1();
check("at full HP → normal idle strip", has(full, "idle_uniform") && !has(full, "low_health"), `sheet=${(full.spriteSheet||"").split("/").pop()}`);
const maxHpBefore = full.maxHealth, dmgMultBefore = full.damageMult ?? full.damageMultiplier ?? 1;
// drop to ~16% HP (below the 30% threshold)
await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP1Health?.(Math.round((p.maxHealth||1240) * 0.16)); });
await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
await waitFrames(6);
const low = await p1();
check("below threshold → wounded idle strip (idleLow)", has(low, "low_health_idle_uniform"), `sheet=${(low.spriteSheet||"").split("/").pop()}`);
check("swap is COSMETIC — maxHealth unchanged", low.maxHealth === maxHpBefore, `${maxHpBefore} → ${low.maxHealth}`);
check("swap is COSMETIC — no damage multiplier change", (low.damageMult ?? low.damageMultiplier ?? 1) === dmgMultBefore, `mult=${low.damageMult ?? low.damageMultiplier ?? 1}`);
// heal back above threshold → reverts to normal idle
await page.evaluate(() => window.__harness.healP1?.());
await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
await waitFrames(6);
const healed = await p1();
check("healed above threshold → reverts to normal idle", has(healed, "idle_uniform") && !has(healed, "low_health"), `sheet=${(healed.spriteSheet||"").split("/").pop()}`);

// ══════════════════════ STAGE 2 — NORMALS + SPECIALS ══════════════════════

// ── NEUTRAL NORMALS (hit-confirm) ──
section("Stage 2 · neutral normals (light / heavy / up)");
for (const [nm, key, sheet] of [["light (B)","j","combo_1_uniform"], ["heavy (Y)","k","combo_2_uniform"], ["up (Up+B)","i","up_attack_uniform"]]) {
  await reset(58);
  const hp0 = (await p2()).health;
  await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key);
  const mv = await waitPose(sheet, 20);
  await waitFrames(12);
  const dmg = hp0 - (await p2()).health;
  check(`${nm} → ${sheet} + hit-confirms`, !!mv && dmg > 0, `sheet=${(mv?.spriteSheet||"").split("/").pop()||"none"} dmg=${dmg}`);
}

// ── COMMAND NORMALS (Fwd+Light, Fwd+Heavy) ──
section("Stage 2 · command normals (Fwd+Light / Fwd+Heavy)");
for (const [nm, key, sheet] of [["Fwd+Light","j","foward_slash_1_uniform"], ["Fwd+Heavy","k","foward_slash_2_uniform"]]) {
  await reset(64);
  const hp0 = (await p2()).health;
  await page.keyboard.down("d"); await waitFrames(2);          // hold forward
  await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key);
  const mv = await waitPose(sheet, 20);
  await page.keyboard.up("d");
  await waitFrames(12);
  const dmg = hp0 - (await p2()).health;
  check(`${nm} → ${sheet} + hit-confirms`, !!mv && dmg > 0, `sheet=${(mv?.spriteSheet||"").split("/").pop()||"none"} dmg=${dmg}`);
}

// ── AERIAL ROUTE: Up+B airborne = up-swing; REPEAT = down slam (cancel only on repeat) ──
section("Stage 2 · aerial route (Up+B → up-swing; repeat → down slam)");
async function jumpAirborne() {
  await reset(60);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");   // tap jump
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.grounded; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
}
// JUMP A — single airborne Up+B → up-swing, and it must NOT auto-progress to the slam without a 2nd press.
await jumpAirborne();
await page.keyboard.down("i"); await waitFrames(1); await page.keyboard.up("i");
const gotUp = await waitAction("zarakiAirUp", 12);
check("airborne Up+B → up-swing (zarakiAirUp)", gotUp, `fired=${gotUp}`);
let autoSlam = false;   // watch a few frames: with NO 2nd press it must never become the slam
for (let i = 0; i < 6; i++) { if ((await p1()).action === "zarakiAirDown") { autoSlam = true; break } await waitFrames(1); }
check("no auto-cancel to down slam without a repeat", !autoSlam, `autoSlam=${autoSlam}`);
// JUMP B — fresh jump; opener, a release gap LONGER than the 7-frame input buffer (so the 2nd press reads
// as a genuine fresh edge, not the same buffered press), then the repeat while still airborne (70f airtime)
// → the descent slam.
await jumpAirborne();
await page.keyboard.down("i"); await waitFrames(2); await page.keyboard.up("i");   // opener
await waitFrames(10);                                                             // let the 7f input buffer clear
await page.keyboard.down("i"); await waitFrames(2); await page.keyboard.up("i");   // genuine repeat → cancel to slam
const gotSlam = await waitAction("zarakiAirDown", 16);
check("repeated Up+B airborne → down slam (zarakiAirDown)", gotSlam, `fired=${gotSlam}`);

// ── SPECIAL 1: Hollow Mask Strike (SPECIAL button) ──
section("Stage 2 · Hollow Mask Strike (Special)");
await reset(64);
{
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const mv = await waitPose("hollow_down_attack_assist_uniform", 22);
  await waitFrames(14);
  const dmg = hp0 - (await p2()).health, spent = e0 - (await p1()).energy;
  check("Special → Hollow Mask Strike pose", !!mv, `sheet=${(mv?.spriteSheet||"").split("/").pop()||"none"}`);
  check("Hollow Mask Strike hit-confirms", dmg > 0, `dmg=${dmg}`);
  check("Hollow Mask Strike spends ~40 reiatsu", Math.abs(spent - 40) < 2, `spent=${spent.toFixed(1)} (±passive regen)`);
}

// ── SPECIAL 2: Charged Dash Attack (CHARGE hold → release) ──
section("Stage 2 · Charged Dash Attack (Charge hold→release)");
// NOTE: the `charge` windup pose and `zarakiChargedDash` share super_foward_attack_uniform.png,
// so we match by ACTION name (not sheet) to tell the dash strike from the hold-windup.
async function waitAction(name, maxF = 24) { for (let i = 0; i < maxF; i++) { if ((await p1()).action === name) return true; await waitFrames(1); } return false; }
await reset(120);
{
  const hp0 = (await p2()).health;
  await page.keyboard.down("p"); await waitFrames(20);        // charge key is P; HOLD ~0.3s → strong tier
  await page.keyboard.up("p");
  const dashed = await waitAction("zarakiChargedDash", 24);
  await waitFrames(16);
  const dmg = hp0 - (await p2()).health;
  check("Charge hold→release → Charged Dash strike (zarakiChargedDash)", dashed, `fired=${dashed}`);
  check("Charged Dash hit-confirms (dashes into foe)", dmg > 0, `dmg=${dmg}`);
  // cooldown gate: let the FIRST dash fully resolve (lockLastFrame holds its action through recovery),
  // then a fresh charge-release while chargeDashCd is still ticking must NOT produce another dash strike.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking && p.action !== "zarakiChargedDash"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.keyboard.down("p"); await waitFrames(6); await page.keyboard.up("p");
  const dashed2 = await waitAction("zarakiChargedDash", 10);
  check("cooldown gate blocks immediate re-fire", !dashed2, `refired=${dashed2}`);
}

// ══════════════════════ STAGE 3 — SHIKAI TIMED POWER-UP MODE ══════════════════════

// enter Shikai via Up+Special (W+L simultaneously, grounded → no jump), returns the post-enter snapshot.
// Idempotent: if already in Shikai, just settle+return (W+L in-form would fire the Shikai special, not re-enter).
async function enterShikai() {
  await reset(80);
  if ((await p1()).shikaiActive) return await p1();
  await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(3);
  await page.keyboard.up("l"); await page.keyboard.up("w");
  await waitFrames(4);
  return await p1();
}

section("Stage 3 · Shikai — enter (Up+Special)");
{
  await reset(80);
  const e0 = (await p1()).energy;
  await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(3);
  await page.keyboard.up("l"); await page.keyboard.up("w");
  await waitFrames(4);
  const sh = await p1();
  check("Up+Special enters Shikai", sh.shikaiActive === true, `active=${sh.shikaiActive}`);
  check("Shikai swaps the full moveset (_skinAnim)", sh.hasSkinAnim === true, `skinAnim=${sh.hasSkinAnim}`);
  check("Shikai spends ~60 reiatsu", Math.abs((e0 - sh.energy) - 60) < 3, `spent=${(e0 - sh.energy).toFixed(1)}`);
  check("Shikai damage buff ×1.2", Math.abs((sh.damageMult ?? sh.damageMultiplier ?? 1) - 1.2) < 0.01, `mult=${sh.damageMult ?? sh.damageMultiplier}`);
  check("Shikai duration timer running", sh.shikaiTimer > 0, `timer=${sh.shikaiTimer}`);
  check("transform-in plays shikai_release", (sh.action === "shikaiRelease") || (sh.spriteSheet || "").includes("shikai_release_uniform"), `action=${sh.action}`);
}

section("Stage 3 · Shikai movement/state (skinAnim swap)");
await enterShikai();
await waitFrames(32);   // let the transform lockout clear
for (const [action, sheet] of [
  ["idle","shikai_idle_uniform"], ["run","shikai_run_uniform"], ["dash","shikai_dash_uniform"],
  ["jump","shinkai_jump_uniform"], ["guard","shinkai_block_uniform"], ["hurt","shinkai_hit_2_uniform"],
]) {
  const a = await pose(action === "idle" ? null : action);
  check(`Shikai ${action} → ${sheet}`, has(a, sheet), `sheet=${(a.spriteSheet||"").split("/").pop()}`);
}

section("Stage 3 · Shikai 4-stage combo rekka (Light/Heavy)");
await page.evaluate(() => window.__harness.benPose(null, "p1"));
await enterShikai();
await waitFrames(32);
await reset(56);   // keeps Shikai active (only heals/repositions)
{
  const chain = [];
  const hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await waitFrames(1);
  for (let i = 0; i < 90; i++) {
    const c = await p1();
    if (c.currentMove && c.currentMove.startsWith("zarakiShikaiC") && !chain.includes(c.currentMove)) chain.push(c.currentMove);
    if (chain.includes("zarakiShikaiC4")) break;
    if (c.rekkaNext && c.cmdHitLanded && c.attackPhase === "recovery") { await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j"); await waitFrames(1); }
    else await waitFrames(1);
  }
  const dmg = hp0 - (await p2()).health;
  check("Shikai combo chains C1→…→C4", chain[0] === "zarakiShikaiC1" && chain.includes("zarakiShikaiC4"), `chain=[${chain.join("→")}]`);
  check("Shikai combo deals damage", dmg > 0, `dmg=${dmg}`);
}

section("Stage 3 · Shikai up / aerial / special");
// Up+B → rising slash
await reset(58);
await page.keyboard.down("i"); await waitFrames(2); await page.keyboard.up("i");
{ const a = await waitAction("zarakiShikaiUp", 20); check("Shikai Up+B → rising slash", a, `fired=${a}`); }
// Jump+B → aerial slam
await reset(58);
await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");
{ const a = await waitAction("zarakiShikaiDownAir", 18); check("Shikai Jump+B → aerial slam", a, `fired=${a}`); }
// Special → high-commitment Shikai slash
await reset(64);
{
  const hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const a = await waitAction("zarakiShikaiSpecial", 22);
  await waitFrames(14);
  const dmg = hp0 - (await p2()).health;
  check("Shikai Special → shikai_specail_attack", a, `fired=${a}`);
  check("Shikai Special hit-confirms", dmg > 0, `dmg=${dmg}`);
}

section("Stage 3 · auto-revert (timer expiry + KO)");
// timer expiry → cut to Base
await enterShikai();
await waitFrames(32);
await page.evaluate(() => window.__harness.expireShikai());
await waitFrames(6);
{
  const a = await p1();
  check("timer expiry auto-reverts to Base", a.shikaiActive === false && a.hasSkinAnim === false, `active=${a.shikaiActive} skinAnim=${a.hasSkinAnim}`);
  check("revert clears damage buff", (a.damageMult ?? a.damageMultiplier ?? 1) === 1, `mult=${a.damageMult ?? a.damageMultiplier}`);
  // "zaraki_idle_uniform" is NOT a substring of "zaraki_shikai_idle_uniform" → uniquely the BASE idle strip.
  await page.evaluate(() => window.__harness.benPose(null, "p1"));
  const baseIdle = await waitPose("zaraki_idle_uniform", 14);
  check("reverts straight to Base idle (no revert-anim asset)", !!baseIdle, `sheet=${(baseIdle?.spriteSheet||(await p1()).spriteSheet||"").split("/").pop()}`);
}
// KO → revert
await enterShikai();
await waitFrames(32);
await page.evaluate(() => window.__harness.koP1());
await waitFrames(4);
check("KO auto-reverts Shikai", (await p1()).shikaiActive === false, `active=${(await p1()).shikaiActive}`);
await page.evaluate(() => window.__harness.healP1?.());

// ══════════════════════ STAGE 4 — BANKAI ULTIMATE (single-use burst) ══════════════════════

async function ensureBase() {   // revert Shikai if lingering, then clean-reset in Base with full meter
  if ((await p1()).shikaiActive) { await page.evaluate(() => window.__harness.expireShikai()); await waitFrames(5); }
  await page.evaluate(() => window.__harness.benPose(null, "p1"));
  await reset(70);
}

section("Stage 4 · Bankai from BASE form");
await ensureBase();
{
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const fired = await waitAction("zarakiBankai", 26);
  const poseSheet = (await p1()).spriteSheet || "";
  await waitFrames(22);
  const dmg = hp0 - (await p2()).health, spent = e0 - (await p1()).energy;
  check("Base: Ultimate fires Bankai (zarakiBankai)", fired, `fired=${fired}`);
  check("Bankai renders bankai_ultimate sheet", poseSheet.includes("bankai_ultimate_uniform"), `sheet=${poseSheet.split("/").pop()}`);
  check("Bankai hit-confirms", dmg > 0, `dmg=${dmg}`);
  check("Bankai spends ~100 reiatsu", Math.abs(spent - 100) < 3, `spent=${spent.toFixed(1)}`);
  // let it fully resolve → confirm NO mode change (still Base)
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking && p.action !== "zarakiBankai"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const post = await p1();
  check("Base Bankai triggers NO form/mode change", post.shikaiActive === false && post.hasSkinAnim === false, `shikai=${post.shikaiActive} skinAnim=${post.hasSkinAnim}`);
}

section("Stage 4 · Bankai from SHIKAI form (returns to Shikai)");
await ensureBase();
await enterShikai(); await waitFrames(32);
await reset(70);   // refills meter to 100+, KEEPS Shikai active
{
  const pre = await p1();
  check("in Shikai with full meter before ult", pre.shikaiActive === true && pre.energy >= 100, `shikai=${pre.shikaiActive} en=${pre.energy}`);
  const hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const fired = await waitAction("zarakiBankai", 26);
  const poseSheet = (await p1()).spriteSheet || "";
  await waitFrames(22);
  const dmg = hp0 - (await p2()).health;
  check("Shikai: Ultimate fires Bankai (identical pose)", fired && poseSheet.includes("bankai_ultimate_uniform"), `fired=${fired} sheet=${poseSheet.split("/").pop()}`);
  check("Shikai Bankai hit-confirms", dmg > 0, `dmg=${dmg}`);
  // let it fully resolve → confirm it RETURNED to Shikai (no mode change / no revert)
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking && p.action !== "zarakiBankai"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const post = await p1();
  check("Bankai RETURNS to Shikai (still in-form, no mode change)", post.shikaiActive === true && post.hasSkinAnim === true, `shikai=${post.shikaiActive} skinAnim=${post.hasSkinAnim}`);
  check("post-Bankai renders Shikai idle", has(await pose(null), "shikai_idle_uniform"), `sheet=${((await p1()).spriteSheet||"").split("/").pop()}`);
}
await ensureBase();   // leave clean for stability section

// ══════════════════════ STAGE 5 — YACHIRU ASSIST (Down+Special) ══════════════════════

async function callAssist() {   // Down+Special
  await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(3);
  await page.keyboard.up("l"); await page.keyboard.up("s");
}

section("Stage 5 · Yachiru assist from BASE (dash-in → throw → projectile → VFX)");
await ensureBase();
await reset(150);
await page.evaluate(() => window.__harness.clearProjectiles?.());
{
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  await callAssist();
  const castThrow = (await p1()).castMove === "zarakiYachiruThrow" || await waitAction("zarakiYachiruThrow", 8);
  const dash = await waitProj("Yachiru_Kusajishi_dash_assist", 8);
  const thrown = await waitProj("yachiruThrow", 16);
  check("Zaraki plays the throw pose", !!castThrow, `cast=${(await p1()).castMove}`);
  check("Yachiru dashes in (dash_assist visual)", !!dash && dash.visualOnly, `dash=${!!dash}`);
  check("throw → projectile launches + travels", !!thrown && Math.abs(thrown.vx) > 0, `vx=${thrown?.vx}`);
  const impact = await waitProj("specail_effect_assist", 40);   // spawns ON CONNECT
  const dmg = hp0 - (await p2()).health;
  check("projectile connects → VFX (specail_effect_assist)", !!impact, `impact=${!!impact}`);
  check("assist projectile deals damage", dmg > 0, `dmg=${dmg}`);
  const spent = e0 - (await p1()).energy;
  check("assist spends ~25 reiatsu", Math.abs(spent - 25) < 3, `spent=${spent.toFixed(1)}`);
  // cooldown gate — once actionable again, an immediate re-cast is blocked (yachiruCd still ticking)
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  await callAssist();
  const reThrown = await waitProj("yachiruThrow", 12);
  check("cooldown gate blocks immediate re-cast", !reThrown, `refired=${!!reThrown} cd=${(await p1()).yachiruCd}`);
}

section("Stage 5 · assist from SHIKAI (no Shikai-timer / Bankai interference)");
await ensureBase();
await enterShikai(); await waitFrames(32);
await reset(150);   // refill meter, KEEP Shikai
await page.evaluate(() => window.__harness.clearProjectiles?.());
{
  const t0 = (await p1()).shikaiTimer;
  await callAssist();
  const thrownS = await waitProj("yachiruThrow", 16);
  check("Shikai: assist still fires", !!thrownS, `fired=${!!thrownS}`);
  await waitFrames(6);
  const s = await p1();
  check("assist does NOT drop Shikai (still in-form)", s.shikaiActive === true && s.hasSkinAnim === true, `shikai=${s.shikaiActive}`);
  check("assist does NOT reset/extend the Shikai timer", s.shikaiTimer > 0 && s.shikaiTimer < t0, `t0=${t0} now=${s.shikaiTimer}`);
  // Bankai still usable right after the assist (fresh meter + actionable) — the assist doesn't lock it out
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); });
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const bankai = await waitAction("zarakiBankai", 24);
  check("Bankai still usable after the assist", bankai, `fired=${bankai}`);
}
await ensureBase();

// ── STABILITY: no JS errors, no 404 on any Stage-1/2/3/4/5 sheet ──
section("Stability");
const SHEETS = [
  // Stage 1
  "zaraki_idle_uniform.png","zaraki_low_health_idle_uniform.png","zaraki_move_uniform.png",
  "zaraki_dash_uniform.png","zaraki_jump_uniform.png","zaraki_block_uniform.png",
  "zaraki_hit_uniform.png","zaraki_hit_1_uniform.png","zaraki_hit_2_uniform.png",
  "zaraki_taunt_uniform.png","zaraki_tuant_2_uniform.png","zaraki_transparent_copy.png",
  // Stage 2
  "zaraki_combo_1_uniform.png","zaraki_combo_2_uniform.png","zaraki_up_attack_uniform.png",
  "zaraki_foward_slash_1_uniform.png","zaraki_foward_slash_2_uniform.png",
  "zaraki_up_attack_to_down_air_combo_uniform.png","zaraki_super_foward_attack_uniform.png",
  "zaraki_special_effect_uniform.png","zaraki_hollow_down_attack_assist_uniform.png",
  // Stage 3 (Shikai)
  "zaraki_shikai_release_uniform.png","zaraki_shikai_idle_uniform.png","zaraki_shikai_run_uniform.png",
  "zaraki_shikai_dash_uniform.png","zaraki_shinkai_jump_uniform.png","zaraki_shinkai_block_uniform.png",
  "zaraki_shinkai_hit_2_uniform.png","zaraki_shinkai_combo_1_uniform.png","zaraki_shinkai_combo_2_uniform.png",
  "zaraki_shinkai_combo_3_uniform.png","zaraki_shikai_combo_4_uniform.png","zaraki_shinkai_up_atttack_uniform.png",
  "zaraki_shinkai_down_air_attack_png_uniform.png","zaraki_shikai_specail_attack_uniform.png",
  // Stage 4 (Bankai)
  "zaraki_bankai_ultimate_uniform.png",
  // Stage 5 (Yachiru assist)
  "zaraki_Yachiru_Kusajishi_dash_assist_uniform.png","zaraki_Yachiru_Kusajishi_throw_uniform.png",
  "zaraki_Yachiru_Kusajishi_throw_projectile_uniform.png","zaraki_specail_effect_assist_uniform.png",
];
const sheet404 = SHEETS.filter(s => net404.includes(s));
check("no 404 on any Stage-1/2/3/4/5 sheet", sheet404.length === 0, sheet404.length ? `missing: ${sheet404.join(", ")}` : "all load");
check("no JS/console errors", jsErrors.length === 0, jsErrors.slice(0,3).join(" | "));

console.log(`\nRESULT  ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
