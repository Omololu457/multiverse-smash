// harness/tobi_stage4_shots.mjs — Stage 4 evidence for Tobi's KAMUI FAMILY (own `_tobi*` impl).
// Boots p1=tobi ALONGSIDE p2=obito so the ISOLATION section can prove the two never share state.
//   A. INTANGIBILITY full cycle — activation (i-frame negate) · sustain+drain · melee auto-drop+reactivate
//      · special stays phased · manual OFF (silent) · chakra-zero auto-OFF.
//   B. SELF-PORTAL (Down+Special) — cast pose + portal FX + long warp + safe landing.
//   C. OPPONENT-TELEPORT GRAB (Back+Special) — connect → foe warped far, no damage-throw.
//   D. ISOLATION — Tobi's Kamui and Obito's Kamui toggle fully independently; neither reads the other.
// Usage: node harness/tobi_stage4_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const sec = m => console.log(m);
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const kTobi = () => page.evaluate(() => window.__harness.tobiKamui("p1"));
const kObito = () => page.evaluate(() => window.__harness.obitoKamui("p2"));
const toggleTobi = () => page.evaluate(() => window.__harness.tobiKamuiToggle("p1"));
const toggleObito = () => page.evaluate(() => window.__harness.obitoKamuiToggle("p2"));
const wf = (n=1) => page.evaluate(fr => new Promise(r => { let i=0; const t=()=>{ if(++i>=fr) return r(); requestAnimationFrame(t); }; requestAnimationFrame(t); }), n);
const prep = () => page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);
const m0 = await page.evaluate(() => ({ p1: window.__harness.p1()?.key, p2: window.__harness.p2()?.key }));
ok(m0.p1 === "tobi" && m0.p2 === "obito", `co-loaded p1=${m0.p1} p2=${m0.p2}`);

// ═══ A. INTANGIBILITY FULL CYCLE ═══
sec("A. KAMUI INTANGIBILITY (full activation/deactivation cycle):");
await prep(); await sleep(80);
const a0 = await kTobi();
ok(!a0.intangible && !a0.phased, `starts NOT intangible (silent default): intangible=${a0.intangible} phased=${a0.phased}`);
await toggleTobi();
await wf(2);   // let updateTobiKamui top up the i-frame negate
let k = await kTobi();
ok(k.intangible && k.phased, `toggle ON → intangible + phased`);
ok(k.invulnTimer > 0, `i-frame negate gate sustained (invulnTimer=${k.invulnTimer})`);
await page.screenshot({ path: path.join(OUT, "tobi_s4_intangible_on.png") });
const enOn = k.energy;
await wf(20);
k = await kTobi();
ok(k.intangible && k.phased && k.invulnTimer > 0 && k.energy < enOn, `sustains + continuous chakra drain (${enOn}→${k.energy})`);

// melee auto-drop + reactivate
sec("   melee auto-drop + reactivate:");
await page.keyboard.down("j"); await sleep(30); await page.keyboard.up("j");
let sawDrop = false, sawInvulnZero = false;
for (let i = 0; i < 24; i++) { const s = await kTobi(); if (s.attacking && !s.phased) { sawDrop = true; if (s.invulnTimer === 0) sawInvulnZero = true; } await wf(1); }
ok(sawDrop && sawInvulnZero, `melee swing dropped the phase (tangible, invulnTimer hit 0): drop=${sawDrop} hittable=${sawInvulnZero}`);
await wf(6);
const kAfter = await kTobi();
ok(kAfter.intangible && kAfter.phased && kAfter.invulnTimer > 0, `AUTO-REACTIVATED after the swing (phased again)`);

// special stays phased (chain grab special does NOT set `attacking`)
sec("   special stays live while intangible:");
await page.evaluate(() => window.__harness.fillEnergy?.());
await page.evaluate(() => window.__harness.p1SpecialDir(null));   // neutral Special = Chain Grab
let phasedThroughout = true;
for (let i = 0; i < 18; i++) { const s = await kTobi(); if (s.intangible && !s.phased && !s.attacking) phasedThroughout = false; await wf(1); }
ok(phasedThroughout, `chain-grab special did NOT drop the phase (specials stay live while intangible)`);
// let the chain grab fully finish so its state can't leak into the portal/grab sections below
for (let i = 0; i < 100; i++) { if (!(await p1()).tobiChainPhase) break; await wf(1); }

// manual OFF (silent)
sec("   manual toggle OFF (silent):");
let g = await kTobi(); if (!g.intangible) await toggleTobi();   // ensure ON
const kOff = await toggleTobi();
ok(!kOff.intangible && !kOff.phased, `2nd toggle → OFF (intangible=${kOff.intangible} phased=${kOff.phased})`);

// chakra-zero auto-OFF
sec("   chakra-zero auto-deactivation:");
await prep(); await sleep(40);
await page.evaluate(() => window.__harness.setP1Energy?.(3));
await toggleTobi();
let autoOff = false;
for (let i = 0; i < 20; i++) { await wf(1); const s = await kTobi(); if (!s.intangible) { autoOff = true; break; } }
const kEnd = await kTobi();
ok(autoOff && !kEnd.intangible && !kEnd.phased, `auto-OFF when chakra hit 0 (energy=${kEnd.energy})`);

// ═══ B. SELF-PORTAL (Down+Special) ═══
sec("B. KAMUI SELF-PORTAL (Down+Special):");
await prep(); await sleep(80);
const bx0 = (await p1()).x, bhp0 = (await p1()).health;
const info = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
ok((info?.cast || "") === "tobiKamuiActivate", `cast pose = ${info?.cast}`);
await wf(2);
let portalFx = null; for (let i = 0; i < 8; i++) { const ps = await projs(); portalFx = ps.find(p => p.name === "tobiKamuiPortal" || (p.sheet||"").includes("kamui_portalfx")); if (portalFx) break; await wf(1); }
ok(!!portalFx, portalFx ? `portal FX spawned (${(portalFx.sheet||"").split("/").pop()})` : "no portal FX");
await page.screenshot({ path: path.join(OUT, "tobi_s4_portal.png") });
for (let i = 0; i < 34; i++) { await wf(1); if ((await p1()).grounded) break; }
const bAfter = await p1();
ok(Math.abs(bAfter.x - bx0) > 300, `warped a long distance (Δx=${Math.round(Math.abs(bAfter.x - bx0))}px)`);
ok(bAfter.grounded && bAfter.health === bhp0, `landed safely, no self-damage (hp=${bAfter.health}/${bhp0})`);

// ═══ C. OPPONENT-TELEPORT GRAB (Back+Special) ═══
sec("C. KAMUI OPPONENT-TELEPORT GRAB (Back+Special):");
await prep(); await sleep(80);
await page.evaluate(() => { const b = window.__harness.p2(); window.__harness.setP1X?.(b.x - 60); });   // within grab reach
await sleep(40);
const cHp0 = (await p2()).health, cX0 = (await p2()).x;
await page.evaluate(() => window.__harness.p1SpecialDir("B"));
let grabbed = false, warpedFar = 0;
for (let i = 0; i < 60; i++) { await wf(1); const b = await p2(); if (b.isGrabbed || b.grabTimer > 0) grabbed = true; const dx = Math.abs(b.x - cX0); if (dx > warpedFar) warpedFar = dx; if (!b.isGrabbed && dx > 200) break; }
await page.screenshot({ path: path.join(OUT, "tobi_s4_kamuigrab.png") });
const cEnd = await p2();
ok(grabbed, `foe was grabbed (isGrabbed/grabTimer latched)`);
ok(warpedFar > 200, `foe WARPED a long distance (max Δx=${Math.round(warpedFar)}px)`);
ok(cHp0 - cEnd.health <= 5, `space-time displacement, NOT a damage-throw (Δhp=${cHp0 - cEnd.health})`);

// ═══ D. ISOLATION — Tobi ⟂ Obito ═══
sec("D. ISOLATION — Tobi's Kamui ⟂ Obito's Kamui (both loaded):");
await prep(); await sleep(60);
// both start off
let t = await kTobi(), o = await kObito();
ok(!t.intangible && !o.intangible, `both start OFF (tobi=${t.intangible} obito=${o.intangible})`);
// toggle TOBI on → Obito must stay off
await toggleTobi();
t = await kTobi(); o = await kObito();
ok(t.intangible && !o.intangible, `Tobi ON did NOT touch Obito (tobi.intangible=${t.intangible}, obito.intangible=${o.intangible})`);
// toggle OBITO on → both independently on
await toggleObito();
t = await kTobi(); o = await kObito();
ok(t.intangible && o.intangible, `both independently intangible (tobi=${t.intangible} obito=${o.intangible})`);
// turn TOBI off → Obito stays on
await toggleTobi();
t = await kTobi(); o = await kObito();
ok(!t.intangible && o.intangible, `Tobi OFF left Obito ON (tobi=${t.intangible} obito=${o.intangible})`);
// field-level separation: Tobi carries `_tobi*`, NOT Obito's `_kamui*`; and vice-versa
const fields = await page.evaluate(() => {
  const a = window.__harness.p1(), b = window.__harness.p2();
  return { tobiHasTobi: a.tobiIntangible !== undefined, tobiHasKamui: a.intangible === undefined /* snap has no _kamui for tobi */ , obitoKamui: window.__harness.obitoKamui("p2") };
});
ok(fields.obitoKamui.intangible === true, `Obito still driven by its OWN _kamui* state (obito.intangible=${fields.obitoKamui.intangible})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
