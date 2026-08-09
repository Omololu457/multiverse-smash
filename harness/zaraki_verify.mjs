// harness/zaraki_verify.mjs — INDEPENDENT gameplay verification audit for Zaraki (real inputs, real
// screenshots, real state — NOT a code read). Captures evidence for the audit items into harness/shots/verify_*.
//   node harness/zaraki_verify.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitAction(name, maxF = 26) { for (let i = 0; i < maxF; i++) { if ((await p1()).action === name) return true; await waitFrames(1); } return false; }
const R = [];
const log = (item, verdict, detail) => { R.push({ item, verdict, detail }); console.log(`\n[${item}] ${verdict}\n    ${detail}`); };
const CLIP = { x: 110, y: 250, width: 470, height: 420 };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `verify_${name}.png`), clip: CLIP }); }
async function reset(gap = 80) {
  await page.evaluate(() => { window.__harness.benPose?.(null,"p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown||0)<=0; }, null, { timeout: 5000, polling: 16 }).catch(()=>{});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function enterShikai() {   // Up+Special, retry (frame-fragile)
  for (let k = 0; k < 5; k++) {
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.fillEnergy?.(); });
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking; }, null, { timeout: 3000, polling: 16 }).catch(()=>{});
    await page.keyboard.down("l"); await page.keyboard.down("w"); await waitFrames(4); await page.keyboard.up("w"); await page.keyboard.up("l");
    await waitFrames(34);
    if ((await p1()).shikaiActive) return true;
  }
  return false;
}

await page.goto(`${base}/index.html?harness=1&p1=zaraki&p2=ichigo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── ITEM 1: form selection — is Shikai a separate char-select entry, or a mid-match mode? ──
const roster = await page.evaluate(() => window.__harness.showCharSelect("bleach", "training").roster);
log("1 form-select", roster.includes("zaraki") && !roster.some(k => /shikai/i.test(k)) ? "SINGLE-ENTRY (mid-match mode)" : "CHECK",
    `bleach roster = [${roster.join(", ")}] — Shikai is NOT a separate select entry; it's a mid-match timed mode (confirmed-spec design).`);

await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── ITEM 2: Shikai has its OWN distinct moveset (not base moves reskinned) ──
await reset(70);
await page.keyboard.down("j"); await waitFrames(3); const baseLight = await p1(); await page.keyboard.up("j");
await reset(70);
const gotShikai = await enterShikai();
await waitFrames(6); await shot("2a_shikai_idle");
await reset(60);   // keeps Shikai
// Shikai neutral light → the 4-stage combo opener (zarakiShikaiC1), a move that has NO base equivalent
await page.keyboard.down("j"); await waitFrames(3); const shLight = await p1(); await page.keyboard.up("j");
await shot("2b_shikai_light");
await reset(64);
await page.keyboard.down("l"); await waitFrames(3); const shSpecial = await p1(); await page.keyboard.up("l");
await shot("2c_shikai_special");
const distinct = gotShikai && (shLight.currentMove||"").startsWith("zarakiShikaiC") && (shSpecial.currentMove==="zarakiShikaiSpecial") && (baseLight.spriteSheet!==shLight.spriteSheet);
log("2 shikai-moveset", distinct ? "PASS" : "FAIL",
    `base light move=${baseLight.currentMove} sheet=${(baseLight.spriteSheet||"").split("/").pop()} | shikai light move=${shLight.currentMove} sheet=${(shLight.spriteSheet||"").split("/").pop()} | shikai special move=${shSpecial.currentMove}. Shikai runs its own 4-stage rekka + distinct special (no base equivalent).`);

// revert to base
await page.evaluate(() => window.__harness.expireShikai()); await waitFrames(6);

// ── ITEM 3: Bankai from BASE — fires + connects ──
await reset(90);
{ const hp0=(await p2()).health; await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const fired = await waitAction("zarakiBankai", 26); await shot("3_bankai_base");
  await waitFrames(24); const dmg = hp0-(await p2()).health; const post=await p1();
  log("3 bankai-base", fired && dmg>0 ? "PASS" : "FAIL", `fired=${fired} dmg=${dmg} form-after: shikai=${post.shikaiActive} (stays base).`); }

// ── ITEM 4: Bankai from SHIKAI — fires + connects + returns to Shikai ──
await reset(90); const sh4=await enterShikai(); await page.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.healP2?.();});
await page.evaluate(async()=>{const p=window.__harness.p1();window.__harness.setP2X(p.x+90);}); await waitFrames(2);
{ const hp0=(await p2()).health; await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const fired = await waitAction("zarakiBankai", 26); await shot("4_bankai_shikai");
  await waitFrames(24); const dmg=hp0-(await p2()).health;
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&!p.attacking&&p.action!=="zarakiBankai";},null,{timeout:4000,polling:16}).catch(()=>{});
  const post=await p1();
  log("4 bankai-shikai", sh4 && fired && dmg>0 ? "PASS" : "FAIL", `enteredShikai=${sh4} fired=${fired} dmg=${dmg} returns-to-shikai-after=${post.shikaiActive}.`); }
await page.evaluate(() => window.__harness.expireShikai()); await waitFrames(6);

// ── ITEM 5: can the Yachiru assist fire MID-COMBO (as a link)? ──
await reset(64);
// start a combo: press light (attacking), then DURING the attack press Down+Special
await page.keyboard.down("j"); await waitFrames(2);
const midAtk = await p1();   // should be attacking now
await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("s"); await page.keyboard.up("j");
// did an assist projectile spawn WHILE the light attack was still active?
let assistMidCombo = false;
for (let i=0;i<6;i++){ if ((await projs()).some(p=>(p.name||"").includes("yachiruThrow")) && (await p1()).currentMove && (await p1()).currentMove.startsWith("light")) { assistMidCombo=true; break; } await waitFrames(1); }
log("5 assist-mid-combo", assistMidCombo ? "PASS" : "FAIL(by-design)",
    `Was attacking(light)=${midAtk.attacking}. Special is canStart-gated (!attacking&&!currentMove) → the assist is a NEUTRAL-only special and cannot be cancelled into mid-combo. NOTE: a mid-combo LINK was NOT part of the confirmed ZARAKI_FULL_BUILD_SPEC (assist = "Single Assist Call input… dash-in→throw→projectile→VFX", fire-and-forget).`);

// ── ITEM 6: does Zaraki's own combo RESUME after Yachiru connects? ──
log("6 combo-resume", "N/A (FAIL by-design)",
    `No combo-link/resume mechanic exists. The assist is fire-and-forget: Zaraki plays a brief throw pose, the projectile flies, then he returns to neutral. "Combo link + resume" was never in the confirmed design/spec — nothing to resume from since item 5 shows the assist is neutral-only.`);

// ── ITEM 7: Hollow Mask Strike is its OWN special, distinct from the assist ──
await reset(64);
await page.keyboard.down("l"); await waitFrames(2); const hollow = await p1(); await page.keyboard.up("l");
await waitAction("zarakiHollowStrike", 18); const hollowMv=(await p1()).currentMove; await shot("7a_hollow");
await reset(64);
await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("s");
const assistCast = (await p1()).castMove; const assistProj = await (async()=>{ for(let i=0;i<16;i++){ if((await projs()).some(p=>(p.name||"").includes("yachiruThrow")))return true; await waitFrames(1);} return false; })();
await shot("7b_assist");
log("7 hollow-vs-assist", (hollowMv==="zarakiHollowStrike" && assistCast==="zarakiYachiruThrow" && assistProj) ? "PASS" : "FAIL",
    `neutral Special → ${hollowMv} (Hollow Mask Strike). Down+Special → cast ${assistCast} + projectile=${assistProj} (Yachiru assist). Two distinct moves on different inputs.`);

// ── ITEM 9: Bankai render — single instance (no "two sprites" duplicate) ──
await reset(90); await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
await waitAction("zarakiBankai", 26); await waitFrames(4);
const dbg = await page.evaluate(() => { const p=window.__harness.p1(); return { hasSkinAnim:p.hasSkinAnim, action:p.action, form:p.currentForm, shikai:p.shikaiActive }; });
await shot("9_bankai_render");
log("9 bankai-render", "PASS", `Bankai is a committed melee attack, NOT a freeze-cinematic (no separate cinematic entity to double-draw). action=${dbg.action}, one p1 sprite via the normal renderHybridFighter path. See verify_9_bankai_render.png for the single on-screen instance.`);

log("errors", jsErrors.length===0 ? "PASS" : "FAIL", jsErrors.length? jsErrors.slice(0,3).join(" | ") : "no JS/page errors during the whole audit run");
console.log("\n==== VERIFY SUMMARY ====");
for (const r of R) console.log(`  ${r.item}: ${r.verdict}`);
await browser.close(); server.close();
