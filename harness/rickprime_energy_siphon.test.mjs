// harness/rickprime_energy_siphon.test.mjs — Rick Prime "Energy Siphon" (Back+Special, held away from the foe). Verifies the 3 spec cases:
//   1) foe WITH a projectile special (Gwen) → Rick fires HER exact projectile + HER energy is spent (not Rick's).
//   2) foe with NO projectile special (Gohan, melee-only) → clean fizzle, no damage, foe energy untouched.
//   3) foe WITH a projectile but drained below its cost (Gwen @ low energy) → clean fizzle.
// In all cases Rick pays only the modest READ cost (15). Reads other chars' move data; never mutates them.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}})
const errs=[]; page.on("pageerror",e=>errs.push(String(e)))
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`)}
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:12000,polling:16}).catch(()=>{})}
const H=(f,...a)=>page.evaluate(([fn,args])=>window.__harness[fn](...args),[f,a])
async function boot(p2){
  await page.goto(`${base}/index.html?harness=1&p1=rickPrime&p2=${p2}`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness)
  await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle?.())
  await page.waitForFunction(()=>window.__harness.spriteReady?.("p1")?.ready===true,null,{timeout:10000,polling:50}).catch(()=>{})
  await page.evaluate(()=>{ window.__harness.setDummyBehavior?.("stand"); window.__harness.setP1X(1500); window.__harness.setP2X(1660); }); await wf(20)
}
const projNames = () => page.evaluate(()=>window.__harness.projectiles().map(p=>({name:p.name,damage:p.damage,sheet:p.sheet})))

try {
  // ── CASE 1 — Gwen (Mana Bolt = subtype:"projectile", cost 30) ──────────────────────────────
  console.log("\n── CASE 1: foe WITH a projectile special (Gwen) ──")
  await boot("gwen")
  await page.evaluate(()=>{ window.__harness.setP2Invuln(600); window.__harness.setP2X(2050); })   // widen the gap + i-frames so the bolt flies (isn't consumed on contact) → we can observe it
  await page.evaluate(()=>{ window.__harness.fillEnergy(); window.__harness.fillP2Energy(); })
  const rp0 = (await H("p1")).energy, gw0 = (await H("p2")).energy
  await H("p1SpecialDir","B")
  const s3 = await H("rickSiphon"); const gw1 = (await H("p2")).energy, rp1 = (await H("p1")).energy
  // Accumulate every projectile seen across the deferred-spawn + flight window (the bolt spawns ~10f after the cast).
  const seen = new Map()
  for (let i=0;i<24;i++){ for (const p of await projNames()) seen.set(p.name, p); if (i===13) await page.screenshot({ path: path.join(ROOT,"harness","shots","RICKPRIME_energy_siphon_gwen.png") }); await wf(1) }
  const names = [...seen.keys()]
  check("captured Gwen's projectile (siphon readout)", s3?.capture && s3.capture.source==="gwen" && s3.capture.cost===30, JSON.stringify(s3?.capture))
  check("the TARGET (Gwen) paid the projectile cost (−30)", Math.round(gw0-gw1)===30, `gwen ${gw0}→${gw1}`)
  check("Rick paid only the modest READ cost (−15)", Math.round(rp0-rp1)===15, `rick ${rp0}→${rp1}`)
  const bolt = seen.get("gwenBolt")
  check("Rick fired GWEN'S EXACT projectile — her gwenBolt w/ HER damage (~92), not Rick's own (Portal Blast 160)",
        !!bolt && bolt.damage >= 80 && bolt.damage <= 110 && !names.some(n=>/^prime(Portal|Skyshot)/.test(n)),
        JSON.stringify([...seen.values()].map(p=>({name:p.name,damage:p.damage}))))

  // ── CASE 2 — Gohan (meteorKick only = NO projectile subtype) ───────────────────────────────
  console.log("\n── CASE 2: foe with NO projectile special (Gohan) ──")
  await boot("gohan")
  await page.evaluate(()=>{ window.__harness.fillEnergy(); window.__harness.fillP2Energy(); })
  const rp2a=(await H("p1")).energy, go0=(await H("p2")).energy, pc0=(await projNames()).length
  await H("p1SpecialDir","B"); const f2=await H("rickSiphon"); const go1=(await H("p2")).energy, rp2b=(await H("p1")).energy
  await wf(16); const pc1=(await projNames()).length
  check("clean FIZZLE (no_projectile)", f2?.fizzle>0 && f2.reason==="no_projectile" && !f2.capture, JSON.stringify(f2))
  check("target energy UNTOUCHED (Rick never charged the foe)", Math.round(go0-go1)===0, `gohan ${go0}→${go1}`)
  check("Rick still paid the read cost (−15)", Math.round(rp2a-rp2b)===15, `rick ${rp2a}→${rp2b}`)
  check("NO projectile fired", pc1===pc0, `projectiles ${pc0}→${pc1}`)

  // ── CASE 3 — Gwen drained below the projectile cost ────────────────────────────────────────
  console.log("\n── CASE 3: foe WITH a projectile but drained (Gwen @ 20 < 30) ──")
  await boot("gwen")
  await page.evaluate(()=>{ window.__harness.fillEnergy(); window.__harness.setP2Energy(20); })   // 20 < Mana Bolt's 30
  const rp3a=(await H("p1")).energy, gd0=(await H("p2")).energy, pcc0=(await projNames()).length
  await H("p1SpecialDir","B"); const f3=await H("rickSiphon"); const gd1=(await H("p2")).energy, rp3b=(await H("p1")).energy
  await wf(16); const pcc1=(await projNames()).length
  check("clean FIZZLE (drained)", f3?.fizzle>0 && f3.reason==="drained" && !f3.capture, JSON.stringify(f3))
  check("drained target's energy UNTOUCHED", Math.round(gd0-gd1)===0, `gwen ${gd0}→${gd1}`)
  check("Rick still paid the read cost (−15)", Math.round(rp3a-rp3b)===15, `rick ${rp3a}→${rp3b}`)
  check("NO projectile fired", pcc1===pcc0, `projectiles ${pcc0}→${pcc1}`)

  check("no page JS errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} rickprime-energy-siphon: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
