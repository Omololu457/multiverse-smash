// harness/duprender_sweep.mjs — AUDIT ONLY. Re-runs the "does this briefly show 2 instances?" check
// against the roster's transformation/Ultimate cinematics. Method (the proven __samDual pattern): patch
// CanvasRenderingContext2D.drawImage to count, PER rAF FRAME, how many times a fighter's BODY/idle sheet
// is drawn; track the max. A fighter's body drawn >1× in a single frame == the two-instances bug. Matchups
// use p2 = an unrelated char so a pattern uniquely counts ONE fighter (except Chrollo, whose copy
// legitimately shares the opponent's sheet → 2 is EXPECTED there, 3+ = bug).
// COVERS: Samurai Red/Gold Mega morph, Morpher Call-In (skipped — unbuilt on this branch), Chrollo Skill
// Hunter (skipped — WIP hooks absent), Goku Black→Rose, and (2026-08-04, after the Susanoo tier-unification
// + tiered-ult churn) MADARA Complete-Susanoo giant / Tengai meteor freeze-cinematic / armored mode, and
// SASUKE Susanoo Lv1 + Lv2 Sharingan-cinematic giant. Guards skip absent features instead of crashing the run.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let ok = 0, bad = 0; const chk = (n,c,d="") => { c?ok++:bad++; console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`); };
const wf = async n => { const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:12000,polling:16}).catch(()=>{}); };
const p1 = () => page.evaluate(()=>window.__harness.p1());

async function bootMatch(p1k, p2k){
  await page.goto(`${base}/index.html?harness=1&p1=${p1k}&p2=${p2k}`, { waitUntil: "load" });
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await wf(6);
  // (re)install the per-frame drawImage counter (fresh after every navigation)
  await page.evaluate(() => {
    window.__dup = {}; window.__dupPatterns = [];
    const proto = CanvasRenderingContext2D.prototype;
    if (!proto.__dupPatched) {
      const orig = proto.drawImage;
      proto.drawImage = function(img, ...r){ try { const s=(img&&(img.currentSrc||img.src))||""; for(const p of window.__dupPatterns){ if(p.subs.some(x=>s.includes(x))) window.__dup[p.label].cur++; } } catch(e){} return orig.call(this,img,...r); };
      proto.__dupPatched = true;
      const raf = window.requestAnimationFrame.bind(window);
      (function tick(){ for(const k in window.__dup){ const d=window.__dup[k]; if(d.cur>d.max)d.max=d.cur; d.cur=0; } raf(tick); })();
    }
  });
}
async function setPatterns(pats){ await page.evaluate(pats => { window.__dupPatterns = pats.map(p=>({label:p.label,subs:p.subs})); window.__dup = {}; for(const p of pats) window.__dup[p.label]={cur:0,max:0}; }, pats); }
async function readMax(label){ return page.evaluate(l=>window.__dup[l]?.max ?? -1, label); }
async function toMega(){ await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:8000,polling:16}).catch(()=>{}); await page.evaluate(()=>window.__harness.setEnergy(200)); await page.keyboard.down("p"); await wf(16); await page.keyboard.up("p"); await page.waitForFunction(()=>window.__harness.p1().hasSkinAnim===true,null,{timeout:4000,polling:16}).catch(()=>{}); }
async function phold(){ await page.keyboard.down("p"); await wf(20); await page.keyboard.up("p"); await wf(3); }

try {
  // ── 1) SAMURAI RED — Mega Mode tier-swap + morph cinematic ──
  console.log("\n── Samurai Red Ranger — Mega Mode tier-swap ──");
  await bootMatch("samurai_red_ranger","gojo");
  await setPatterns([{label:"RED",subs:["samurai_ranger_idle_uniform","samurai_ranger_mega_idle_uniform"]}]);
  await toMega(); await wf(30);
  { const m=await readMax("RED"); chk("Red body drawn ≤1×/frame through morph+settle", m<=1, `maxDraws/frame=${m}, form=${(await p1()).currentForm}`); }

  // ── 2) SAMURAI GOLD — Mega Mode tier-swap + 光 morph cinematic ──
  console.log("\n── Gold Samurai Ranger — Mega Mode tier-swap ──");
  await bootMatch("gold_samurai_ranger","gojo");
  await setPatterns([{label:"GOLD",subs:["samurai_ranger_gold_idle_uniform","samurai_ranger_gold_mega_mode_idle_uniform"]}]);
  await toMega(); await wf(30);
  { const m=await readMax("GOLD"); chk("Gold body drawn ≤1×/frame through morph+settle", m<=1, `maxDraws/frame=${m}, form=${(await p1()).currentForm}`); }

  // ── 3) MORPHER CALL-IN — the injected partner fighter (cameo Ultimate) ──
  console.log("\n── Morpher Call-In — cameo-Ultimate partner playback (Omega calls Gold) ──");
  await bootMatch("omega_ranger","gojo");
  if (!(await page.evaluate(()=>typeof window.__harness.fireCallIn==="function"))) {
    console.log("  ⚠ SKIP — Morpher Call-In not implemented on this branch (no fireCallIn hook); nothing to render-check.");
  } else {
    await setPatterns([
      {label:"CASTER", subs:["omega_ranger_idle"]},
      {label:"PARTNER", subs:["samurai_ranger_gold_idle_uniform","samurai_ranger_gold_launcher_uniform","samurai_ranger_gold_mega"]},
    ]);
    await page.evaluate(()=>window.__harness.setCallInPartner("gold_samurai_ranger","p1"));
    await page.evaluate(()=>window.__harness.fireCallIn("p1"));
    for(let i=0;i<60;i++){ await wf(1); if(!(await page.evaluate(()=>window.__harness.callInStatus().active))) break; }
    await wf(10);
    { const c=await readMax("CASTER"), p=await readMax("PARTNER"); chk("caster (Omega) body drawn ≤1×/frame during call-in", c<=1, `maxDraws/frame=${c}`); chk("called-in partner (Gold) body drawn ≤1×/frame (dash-in + cameo ult + vanish)", p<=1, `maxDraws/frame=${p}`); }
  }

  // ── 4) CHROLLO — Skill Hunter live-copy transform (has a cinematic) ──
  console.log("\n── Chrollo — Skill Hunter live-copy transformation ──");
  await bootMatch("chrollo","naruto");
  if (!(await page.evaluate(()=>typeof window.__harness.shLandMove==="function"))) {
    console.log("  ⚠ SKIP — Skill Hunter harness hooks (shLandMove) absent on this branch (Chrollo WIP).");
  } else {
    await page.evaluate(()=>{ window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
    await page.evaluate(()=>{ window.__harness.shLandMove("light"); window.__harness.shLandMove("heavy"); window.__harness.shLandMove("special"); });
    await setPatterns([
      {label:"CHROLLO_OWN", subs:["chrollo_"]},          // any Chrollo BODY sheet (cinematic FX is ctx-primitive, not a sheet)
      {label:"COPY", subs:["naruto_kcm_stance"]},        // Naruto's real idle sheet (the copied body renders it too)
    ]);
    await page.keyboard.down("u"); await wf(3); await page.keyboard.up("u");
    // sample continuously THROUGH the swap cinematic AND the settled copied state
    for(let i=0;i<80;i++){ await wf(1); }
    { const own=await readMax("CHROLLO_OWN"), cp=await readMax("COPY"); const s=await page.evaluate(()=>window.__harness.shState("p1"));
      chk("Chrollo's OWN body never double-drawn (≤1×/frame across the swap)", own<=1, `maxDraws/frame=${own}`);
      chk("copied body ≤2×/frame (2 = copy + real opponent, EXPECTED; 3+ = dup)", cp<=2, `maxDraws/frame=${cp} (copying=${s.rosterKey})`); }
  }

  // ── 5) GOKU BLACK — base → SSJ Rose (frozen cinematic) ──
  console.log("\n── Goku Black — base → SSJ Rose (frozen cinematic) ──");
  await bootMatch("goku_black","gojo");
  await setPatterns([{label:"GB", subs:["black_goku_idle","goku_black_ssj_rose_idle"]}]);   // base + rose idles
  await page.evaluate(()=>window.__harness.setEnergy(200)); await phold();                   // base → Rose (cinematic)
  await page.waitForFunction(()=>{const c=window.__harness.ssjRoseCine?.();return c&&!c.active;},null,{timeout:6000,polling:16}).catch(()=>{});
  await wf(20);
  { const m=await readMax("GB"); chk("Goku Black body drawn ≤1×/frame through base→Rose cinematic+settle", m<=1, `maxDraws/frame=${m}, form=${(await p1()).currentForm}`); }

  // ── 6) MADARA — tiered Ultimate + Susanoo forms (Susanoo tier-unification + tiered-ult churn) ──
  console.log("\n── Madara — Complete-Susanoo giant (HOLD ult) / Tengai meteor (TAP ult) / armored mode ──");
  // (a) HOLD ult → Complete Susanoo GIANT (base idle ↔ giant idle must never co-draw)
  await bootMatch("madara","gojo");
  await setPatterns([{label:"MAD_GIANT", subs:["madara2_idle_1_uniform","madara_complete_idle_uniform"]}]);
  await page.evaluate(()=>window.__harness.resetUlt());
  await page.keyboard.down("u"); await wf(24); await page.keyboard.up("u");   // HOLD (≥250ms, energy≥180) → giant
  await wf(30);
  { const m=await readMax("MAD_GIANT"); chk("Madara base+giant body ≤1×/frame through Complete-Susanoo transform+settle", m<=1, `maxDraws/frame=${m}, complete=${(await p1()).completeSusanoo}`); }
  // (b) TAP ult → Tengai Shinsei meteor FREEZE-cinematic (caster must draw once, not caster+cinematic-copy)
  await bootMatch("madara","gojo");
  await setPatterns([{label:"MAD_TENGAI", subs:["madara2_idle_1_uniform","madara_tengai_cast_uniform"]}]);
  await page.evaluate(()=>window.__harness.resetUlt());
  await page.keyboard.down("u"); await wf(5); await page.keyboard.up("u");    // TAP → meteor cinematic
  for(let i=0;i<50;i++){ await wf(1); }
  { const m=await readMax("MAD_TENGAI"); chk("Madara body ≤1×/frame through Tengai Shinsei freeze-cinematic", m<=1, `maxDraws/frame=${m}, phase=${(await page.evaluate(()=>window.__harness.madaraUltCine?.()?.phase))}`); }
  // (c) armored Susanoo MODE (Back+Heavy _skinAnim swap)
  await bootMatch("madara","gojo");
  await setPatterns([{label:"MAD_ARMOR", subs:["madara2_idle_1_uniform","madara_susanoo_form_idle_uniform"]}]);
  await page.evaluate(()=>window.__harness.setEnergy(200));
  await page.keyboard.down("a"); await wf(2); await page.keyboard.down("k"); await wf(3); await page.keyboard.up("k"); await page.keyboard.up("a"); await wf(30);
  { const m=await readMax("MAD_ARMOR"); chk("Madara base+armored body ≤1×/frame entering armored Susanoo mode", m<=1, `maxDraws/frame=${m}, armor=${(await p1()).susanooArmor}`); }

  // ── 7) SASUKE — staged Susanoo Ultimate (Lv1 skeletal → Lv2 via Sharingan freeze-cinematic) ──
  // The prior "4 Susanoo ghost copies" scare was diagnosed as camera/clip, NOT double-draw — re-verify
  // after the tier-unification work that the giant body is still exactly ONE draw/frame.
  console.log("\n── Sasuke — Susanoo Lv1 + Lv2 escalation (Sharingan freeze-cinematic, giant) ──");
  await bootMatch("sasuke","gojo");
  await setPatterns([{label:"SAS", subs:["saske_stance_2","sasuke_susanoo_lvl_1_anim","sasuke_susanoo_lvl_2_anim"]}]);
  await page.evaluate(()=>window.__harness.setEnergy(200));
  await page.keyboard.down("u"); await wf(4); await page.keyboard.up("u"); await wf(20);   // Stage 1 → Lv1
  { const m=await readMax("SAS"); chk("Sasuke body ≤1×/frame entering Susanoo Lv1 (skeletal form)", m<=1, `maxDraws/frame=${m}, stage=${(await p1()).susanooStage}`); }
  await page.evaluate(()=>{ if(window.__dup.SAS){ window.__dup.SAS.max=0; window.__dup.SAS.cur=0; } });   // reset for the escalation window
  await page.keyboard.down("u"); await wf(4); await page.keyboard.up("u");                  // Stage 2 → Lv2 via Sharingan cinematic
  await page.waitForFunction(()=>window.__harness.p1().susanooStage===2 || !window.__harness.sasukeCine().active, null, {timeout:9000,polling:16}).catch(()=>{});
  await wf(30);
  { const m=await readMax("SAS"); chk("Sasuke body ≤1×/frame through Lv2 escalation + Sharingan cinematic (giant, no ghost-copies)", m<=1, `maxDraws/frame=${m}, stage=${(await p1()).susanooStage}`); }

  chk("no page errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "));
} catch(e){ console.error("FATAL", e); bad++; }
finally {
  console.log(`\n${bad===0?"✅ ALL CLEAN":"⚠️ FINDINGS"} — ${ok} pass / ${bad} fail`);
  await browser.close(); server.close();
  process.exit(bad?1:0);
}
