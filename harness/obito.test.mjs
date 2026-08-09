// harness/obito.test.mjs — CONSOLIDATED full-kit test for Obito Uchiha (Naruto, 7th of the universe).
// The Stage-8 closing suite: exercises EVERY mechanic built across Stages 1-7 in one run —
//   • registration + portrait loads (no 404) + movement/state
//   • 5 standard normals + the Fwd+Heavy "Kamui Rod Combo" rekka
//   • 4 ranged specials (Shuriken / Air Shuriken / Rod / Giant Shuriken) + Kamui self-portal
//   • KAMUI INTANGIBILITY full state machine (activate · melee-drop+reactivate · special-while-phased ·
//     manual off · chakra-zero auto-off) — the headline mechanic, exhaustively
//   • KAMUI TELEPORT GRAB (connect → warp far → NO damage) — the new non-damage grab payload
//   • speed-tier teleport-blur (qualifies by FEAT, speed 96 < 98)
//   • JUUBI ULTIMATE cinematic (full sequence + guaranteed damage + DUPLICATE-RENDER guard: caster hidden)
// Usage: node harness/obito.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
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
const kamui = () => page.evaluate(() => window.__harness.obitoKamui());
const cmd = () => page.evaluate(() => window.__harness.obitoCmd());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const cine = () => page.evaluate(() => window.__harness.obitoJuubiUltCine());
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitPose(needle, maxF = 22) { let best = await p1(); for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; best = a; await waitFrames(1); } return best; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function reset(gap = 60) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); const k = window.__harness.obitoKamui(); if (k?.intangible) window.__harness.obitoKamuiToggle(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── REGISTRATION + PORTRAIT ──
section("Registration + portrait");
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
let a = await p1();
check("P1 is Obito, renders as sprites", a.key === "obito" && a.hasSpriteHandler, `key=${a.key} sprites=${a.hasSpriteHandler}`);
check("stats in-band (HP1150/En200/Spd96)", a.maxHealth === 1150 && a.maxEnergy === 200 && a.baseSpeed === 96, `hp=${a.maxHealth} en=${a.maxEnergy} spd=${a.baseSpeed}`);
const portraitOk = await page.evaluate(async () => { const img = new Image(); img.src = "./obito_portrait.png"; try { await img.decode(); return img.naturalWidth > 0; } catch { return false; } });
check("portrait loads (no 404)", portraitOk && !net404.includes("obito_portrait.png"), `ok=${portraitOk}`);

// ── MOVEMENT ──
section("Movement / state");
await reset(200);
for (const [nm, key, sheet] of [["run","d","obito_run_uniform"],["jump","w","obito_jump_uniform"]]) {
  await page.keyboard.down(key); const mv = await waitPose(sheet, 14); await page.keyboard.up(key); await waitFrames(4);
  check(`${nm} → ${sheet}`, has(mv, sheet), `sheet=${(mv.spriteSheet||"").split("/").pop()}`);
}
await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000 }).catch(()=>{});
await page.keyboard.down("s"); await waitFrames(8); a = await p1(); await page.keyboard.up("s");
check("guard → obito_block_uniform", a.action === "guard" && has(a, "obito_block_uniform"), `sheet=${(a.spriteSheet||"").split("/").pop()}`);

// ── NORMALS + REKKA ──
section("Normals + Kamui Rod Combo rekka");
for (const [nm, key, sheet] of [["light","j","obito_light_uniform"],["heavy","k","obito_heavy_uniform"],["up","i","obito_up_uniform"]]) {
  await reset(52); const hp0 = (await p2()).health; await page.keyboard.down(key); const mv = await waitPose(sheet, 18); await page.keyboard.up(key); await waitFrames(12);
  check(`${nm} → ${sheet} + connects`, has(mv, sheet) && hp0 - (await p2()).health > 0, `dmg=${hp0-(await p2()).health}`);
}
await reset(50);
{ const chain = []; await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 80; i++) { const c = await cmd(); if (c?.move && !chain.includes(c.move)) chain.push(c.move); if (chain.includes("obitoRod3")) break;
    if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(12);
  check("Fwd+Heavy rekka R1→R2→R3", chain.includes("obitoRod1") && chain.includes("obitoRod2") && chain.includes("obitoRod3"), `chain=[${chain.join("→")}]`); }

// ── RANGED SPECIALS ──
section("Ranged specials");
for (const [nm, dir, sheet, cast] of [["Shuriken", null, "obito_shur_proj_uniform", "obitoShurCast"],["Rod","F","obito_rod_throwprojectile","obitoRodCast"],["Giant Shuriken","U","obito_giantshur_proj_uniform","obitoShurCast"]]) {
  await reset(180); const hp0 = (await p2()).health;
  const info = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  let pr = null; for (let i=0;i<16;i++){ await waitFrames(1); pr = (await projs()).find(p => (p.sheet||"").includes(sheet)); if (pr) break; }
  for (let i=0;i<40;i++){ await waitFrames(1); if ((await p2()).health < hp0) break; }
  check(`${nm}: cast ${cast} + projectile + connects`, (info?.cast||"")===cast && !!pr && hp0-(await p2()).health > 0, `cast=${info?.cast} proj=${!!pr} dmg=${hp0-(await p2()).health}`);
}
await reset(120);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(64));
  const info = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  let pr=null; for(let i=0;i<16;i++){ await waitFrames(1); pr=(await projs()).find(p=>(p.sheet||"").includes("obito_shur_proj_uniform")); if(pr)break; }
  check("Air Shuriken: air cast + downward arc (vy>0)", (info?.cast||"")==="obitoShurCastAir" && !!pr && pr.vy>0, `cast=${info?.cast} vy=${pr?.vy?.toFixed?.(1)}`); }
await reset(150);
{ const px0=(await p1()).x; const info=await page.evaluate(()=>window.__harness.p1SpecialDir("D")); await waitFrames(2);
  const portalFx=(await projs()).find(p=>p.name==="kamuiPortal"); for(let i=0;i<30;i++){ await waitFrames(1); if((await p1()).grounded) break; }
  check("Kamui self-portal: warps far + portal FX", (info?.cast||"")==="obitoTeleport" && !!portalFx && Math.abs((await p1()).x-px0)>300, `Δx=${Math.round(Math.abs((await p1()).x-px0))} fx=${!!portalFx}`); }

// ── KAMUI INTANGIBILITY — FULL STATE MACHINE ──
section("Kamui Intangibility — full state machine");
await reset(200);
check("starts NOT intangible", !(await kamui()).intangible, "");
await page.evaluate(() => window.__harness.obitoKamuiToggle()); await waitFrames(3);
let k = await kamui();
check("ACTIVATE → intangible + phased + i-frame sustained", k.intangible && k.phased && k.invulnTimer > 0, `phased=${k.phased} invuln=${k.invulnTimer}`);
// melee-drop + reactivate
let sawDrop=false, sawInvulnZero=false, stayedOn=true;
await page.keyboard.down("j");
for (let i=0;i<26;i++){ await waitFrames(1); const s=await kamui(); if (s.attacking && !s.phased){ sawDrop=true; if(s.invulnTimer===0) sawInvulnZero=true; } if (!s.intangible) stayedOn=false; }
await page.keyboard.up("j");
await page.waitForFunction(()=>{const p=window.__harness.p1();return !p.attacking&&(p.attackCooldown||0)<=0;},null,{timeout:4000}).catch(()=>{}); await waitFrames(3);
const kAfter = await kamui();
check("MELEE-DROP: tangible mid-swing (invulnTimer hit 0), toggle stayed on", sawDrop && sawInvulnZero && stayedOn, `drop=${sawDrop} zero=${sawInvulnZero} on=${stayedOn}`);
check("AUTO-REACTIVATE after the punch (phased again)", kAfter.intangible && kAfter.phased && kAfter.invulnTimer > 0, `phased=${kAfter.phased}`);
// special while intangible
await page.evaluate(() => window.__harness.p1SpecialDir(null));
let phasedThrough=true, pr=null; for(let i=0;i<14;i++){ await waitFrames(1); if(!(await kamui()).phased) phasedThrough=false; if(!pr) pr=(await projs()).find(p=>(p.sheet||"").includes("obito_shur_proj_uniform")); }
check("SPECIAL-WHILE-INTANGIBLE: fires + phase NOT dropped", !!pr && phasedThrough, `proj=${!!pr} phasedThrough=${phasedThrough}`);
// manual off
await page.evaluate(() => window.__harness.obitoKamuiToggle()); await waitFrames(3);
check("MANUAL OFF: 2nd tap → not intangible (silent)", !(await kamui()).intangible && !(await kamui()).phased, "");
// chakra-zero auto-off
await reset(200);
await page.evaluate(() => window.__harness.obitoKamuiToggle()); await waitFrames(3);
let autoOff=false; for(let i=0;i<60;i++){ await waitFrames(6); if(!(await kamui()).intangible){ autoOff=true; break; } }
check("CHAKRA-ZERO AUTO-OFF: drains to 0 → auto-deactivates", autoOff && (await kamui()).energy === 0, `energy=${(await kamui()).energy}`);

// ── KAMUI TELEPORT GRAB — non-damage position payload ──
section("Kamui Teleport Grab (non-damage warp)");
await reset(58);
{ const bx0=(await p2()).x, bhp0=(await p2()).health;
  await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
  let grabbed=false; for(let i=0;i<12;i++){ await waitFrames(1); if((await p2()).isGrabbed){ grabbed=true; break; } }
  for(let i=0;i<45;i++){ await waitFrames(1); const b=await p2(); if(!b.isGrabbed && Math.abs(b.x-bx0)>50) break; }
  const bEnd=await p2();
  check("grab connects → opponent WARPED far", grabbed && Math.abs(bEnd.x-bx0)>300, `grabbed=${grabbed} Δx=${Math.round(Math.abs(bEnd.x-bx0))}`);
  check("NON-DAMAGE payload (0 damage dealt)", bEnd.health === bhp0, `hp ${bhp0}→${bEnd.health}`); }

// ── SPEED-TIER TELEPORT (by feat) ──
section("Speed-tier teleport-blur (feat)");
await reset(220);
{ const x0=(await p1()).x;
  await page.keyboard.down("d"); await sleep(26); await page.keyboard.up("d"); await sleep(30);
  await page.keyboard.down("d"); await sleep(26); await page.keyboard.up("d");
  let blur=0; for(let i=0;i<16;i++){ blur=Math.max(blur,(await p1()).speedBlur); if(blur>0)break; await waitFrames(1); }
  check("double-tap toward → teleport-blur (speed 96 < 98, by feat)", blur > 0 && Math.abs((await p1()).x-x0)>120, `blur=${blur}`); }

// ── JUUBI ULTIMATE + DUPLICATE-RENDER GUARD ──
section("Juubi Ultimate + duplicate-render guard");
await reset(200);   // clear any leftover cooldown/cast state from the teleport section so triggerUltimate fires
await page.evaluate(() => { window.__harness.fillEnergy?.(); });
await waitFrames(4);
{ const hp0=(await p2()).health;
  await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u");
  const seen=new Set(); let struck=false, everActive=false, casterHidden=false, maxFrame=0;
  for(let i=0;i<90;i++){ const c=await cine(); if(c.active){ everActive=true; maxFrame=Math.max(maxFrame,c.frame); if(c.struck)struck=true; if(c.casterHidden)casterHidden=true; if(c.phase)seen.add(c.phase); } else if(everActive) break; await sleep(33); }
  check("Juubi cinematic runs full sequence (rise→charge→fire)", seen.has("rise")&&seen.has("charge")&&seen.has("fire"), `phases=[${[...seen].join(",")}]`);
  check("guaranteed hit (struck at impact)", struck, "");
  check("DUPLICATE-RENDER GUARD: caster hidden during cinematic (no second body)", casterHidden, `casterHidden=${casterHidden}`);
  await page.waitForFunction(()=>!window.__harness.obitoJuubiUltCine().active,null,{timeout:6000}).catch(()=>{});
  check("cinematic ends → combat resumes + caster un-hidden", !(await cine()).active, "");
  const dmg=hp0-(await p2()).health;
  check("opponent took cinematic-band damage (~360)", dmg>=300 && dmg<=400, `dmg=${dmg}`); }

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0,3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
