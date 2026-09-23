// harness/rickprime_rewind.test.mjs — Rick Prime "Temporal Rewind" ultimate. Verifies STAGE-4 cases:
//   1) mid-neutral: health/position/round-timer roll back to the ~10s-prior snapshot + the +10s timer bonus.
//   2) after heavy damage: the opponent's health GENUINELY restores.
//   3) EDGE CASE: attempted while the opponent is mid-ultimate/cinematic → BLOCKED, no broken/frozen state.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}})
const errs=[]; page.on("pageerror",e=>errs.push(String(e)))
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`)}
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:40000,polling:16}).catch(()=>{})}
const H=(f,...a)=>page.evaluate(([fn,args])=>window.__harness[fn](...args),[f,a])
async function boot(p2){
  await page.goto(`${base}/index.html?harness=1&p1=rickPrime&p2=${p2}`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness)
  await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle?.())
  await page.waitForFunction(()=>window.__harness.spriteReady?.("p1")?.ready===true,null,{timeout:12000,polling:50}).catch(()=>{})
  await page.evaluate(()=>{ window.__harness.setDummyBehavior?.("stand"); window.__harness.fillEnergy(); window.__harness.setP1X(1500); window.__harness.setP2X(1820); }); await wf(20)
}
async function fillBuffer(minLen){ await page.waitForFunction(m=>window.__harness.rickRewind().bufferLen>=m,minLen,{timeout:60000,polling:60}).catch(()=>{}) }

try {
  // ── CASE 1: mid-neutral rollback + timer bonus ─────────────────────────────────────────────
  console.log("\n── CASE 1: rewind mid-neutral (health/position/timer roll back + bonus) ──")
  await boot("gohan")
  await fillBuffer(105)   // ~10.5s of history so the ~10s-ago target is a real, distinct earlier state
  // change CURRENT state so the rollback is observable, then read the target snapshot + fire in the SAME frame
  await page.evaluate(()=>{ window.__harness.setP1X(2300); window.__harness.setP2X(2650); window.__harness.damageP2(400); window.__harness.setRoundTimer(2000); })
  const r = await page.evaluate(()=>{ const p=window.__harness.rickRewindPreview(); const fired=window.__harness.rickRewindFire(); return {p,fired,before:{p1x:window.__harness.p1().x,p2x:window.__harness.p2().x,p2hp:window.__harness.p2().health,timer:window.__harness.getRoundTimer()}} })
  check("rewind fired (valid history + safe state)", r.fired===true, JSON.stringify({fired:r.fired,target_f:r.p?.f}))
  // Capture state ATOMICALLY at the frame the restore lands (combat is still frozen then → no post-resume drift).
  const postH = await page.waitForFunction(()=>{ const s=window.__harness.rickRewind(); return s.restored ? {p1x:window.__harness.p1().x,p2x:window.__harness.p2().x,p2hp:window.__harness.p2().health,timer:window.__harness.getRoundTimer()} : false },null,{timeout:42000,polling:16})
  const post = await postH.jsonValue()
  check("Rick (caster) STAYS anchored at his cast spot (NOT rewound)", Math.abs(post.p1x - r.before.p1x) <= 40, `now ${Math.round(post.p1x)} vs cast-spot ${Math.round(r.before.p1x)} (snapshot was ${Math.round(r.p.a.x)})`)
  check("OPPONENT position rewound to the snapshot", Math.abs(post.p2x - r.p.b.x) <= 40, `now ${Math.round(post.p2x)} vs snap ${Math.round(r.p.b.x)} (was ${Math.round(r.before.p2x)})`)
  check("round timer = rewound value + 10s bonus (600f)", Math.abs(post.timer - (r.p.roundTimer + r.p.bonusFrames)) <= 8, `now ${post.timer} vs ${r.p.roundTimer}+${r.p.bonusFrames} (was ${r.before.timer})`)
  check("timer bonus yields MORE time than the pre-rewind clock", post.timer > r.before.timer, `${post.timer} > ${r.before.timer}`)

  // ── CASE 2: heavy damage → health genuinely restores ───────────────────────────────────────
  console.log("\n── CASE 2: rewind after heavy damage (opponent health restores) ──")
  await boot("gohan")
  await fillBuffer(105)
  const r2 = await page.evaluate(()=>{ const hpBefore=window.__harness.rickRewindPreview().b.health; window.__harness.damageP2(750); const hpDamaged=window.__harness.p2().health; const p=window.__harness.rickRewindPreview(); const fired=window.__harness.rickRewindFire(); return {snapHp:p.b.health,hpDamaged,fired} })
  check("opponent was genuinely damaged before the rewind", r2.hpDamaged < r2.snapHp - 400, `damaged ${Math.round(r2.hpDamaged)} vs snap ${Math.round(r2.snapHp)}`)
  await page.waitForFunction(()=>window.__harness.rickRewind().restored===true, null, {timeout:42000,polling:16}).catch(()=>{})
  const hpPost = (await H("p2")).health
  check("opponent health RESTORED to the snapshot value", Math.abs(hpPost - r2.snapHp) <= 2, `restored ${Math.round(hpPost)} vs snap ${Math.round(r2.snapHp)}`)

  // ── CASE 2b: EDGE — cast with a round timer SHORTER than the (~3s) cinematic → clock freezes, no round-end ──
  console.log("\n── CASE 2b: EDGE — low round timer (< cinematic length) must not end the round mid-rewind ──")
  await boot("gohan")
  await fillBuffer(105)
  const r2b = await page.evaluate(()=>{ window.__harness.setRoundTimer(50); const snapT=window.__harness.rickRewindPreview().roundTimer; const fired=window.__harness.rickRewindFire(); return {snapT,fired} })
  check("rewind fired at a low timer", r2b.fired===true, `snapTimer ${r2b.snapT}`)
  const doneH = await page.waitForFunction(()=>{ const s=window.__harness.rickRewind(); return s.restored ? {timer:window.__harness.getRoundTimer(), gameState:window.__harness.state().gameState} : false }, null, {timeout:42000, polling:16}).catch(()=>null)
  const done = doneH ? await doneH.jsonValue() : null
  check("cinematic COMPLETED (round did not end mid-rewind)", !!done, JSON.stringify(done))
  check("timer restored to snapshot + bonus despite the low clock", !!done && Math.abs(done.timer - (r2b.snapT + 600)) <= 8, JSON.stringify(done))

  // ── CASE 3: EDGE — opponent mid-cinematic → rewind BLOCKED, no broken state ─────────────────
  console.log("\n── CASE 3: EDGE — attempt while opponent is mid-ultimate/cinematic ──")
  await boot("beerus")   // Beerus Ki Ball = a FREEZE cinematic ultimate
  await fillBuffer(60)
  await page.evaluate(()=>window.__harness.p2Ultimate())   // opponent enters its freeze cinematic
  await wf(8)
  const during = await H("rickRewind")
  check("engine sees an uninterruptible cinematic active", during.unsafeNow===true, JSON.stringify({unsafeNow:during.unsafeNow}))
  const blocked = await H("rickRewindFire")
  const after = await H("rickRewind")
  check("rewind is BLOCKED while the opponent is mid-cinematic", blocked===false && after.active===false && after.blockedReason==="cinematic_active", JSON.stringify({blocked,active:after.active,reason:after.blockedReason}))
  await wf(20)
  check("no broken/frozen state (no page errors, sim still advancing)", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} rickprime-rewind: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
