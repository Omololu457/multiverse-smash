// harness/oneshot_ult_block.test.mjs — BALANCE: one-shot ultimates deal EXACTLY HALF on block.
// For 3 single-connect one-shot ults (ichigo/superman/yamamoto): fire unblocked vs blocked, confirm the
// blocked damage taken == round(unblocked / 2). Also confirms a MULTI-HIT ult (nezuko) is UNCHANGED (>half).
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".m4a":"audio/mp4",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1280,height:720}})
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,140)))
let P=0,F=0; const ck=(n,c,d="")=>{(c?P++:F++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`)}
const st = () => pg.evaluate(()=>window.__harness.state().frame)
async function wf(n){const s=await st();await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{})}
const p2hp = () => pg.evaluate(()=>window.__harness.p2()?.health)

async function boot(p1, p2){
  await pg.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`,{waitUntil:"load"})
  await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360)
  await pg.evaluate(()=>{ window.__harness.start(); window.__harness.skipToBattle() }); await wf(20)
}
// Cast p1's ultimate against p2 (blocking or not); return HP taken by p2.
async function cast(blocked){
  await pg.evaluate(()=>{ window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); })
  const p1x = await pg.evaluate(()=>window.__harness.p1()?.x)
  await pg.evaluate(x=>window.__harness.setP2X?.(x+70), p1x)   // adjacent (range-dependent multi-hit barrages need proximity; sure-hits don't care)
  await pg.evaluate(b=>{ window.__harness.setForceGuard?.(b,"p2"); window.__harness.setP2Blocking?.(b) }, blocked)
  await wf(4)
  const hp0 = await p2hp()
  await pg.evaluate(()=>(window.__harness.brutality?.p1Ult||window.__harness.p1Ultimate)?.())
  // wait for the cinematic connect to land the damage (poll HP), then settle
  await pg.waitForFunction(h0=>{ const h=window.__harness.p2()?.health; return h!=null && h < h0-0.5 }, hp0, {timeout:12000,polling:16}).catch(()=>{})
  await wf(30)
  const taken = hp0 - (await p2hp())
  // let any cinematic fully end before the next cast
  await wf(60)
  return Math.round(taken)
}

try {
  for (const key of ["ichigo","superman","yamamoto"]) {
    await boot(key, "madara")
    const unblocked = await cast(false)
    const blocked   = await cast(true)
    const expected  = Math.round(unblocked / 2)
    ck(`${key}: one-shot ult blocked == HALF of unblocked`, unblocked>0 && Math.abs(blocked - expected) <= 1,
       `unblocked=${unblocked}  blocked=${blocked}  expected≈${expected}`)
  }
  // CONTROL: a MULTI-HIT ultimate (iron_man Proton Cannon) must be UNCHANGED — blocked stays a chip (< half).
  await boot("iron_man", "madara")
  const nu = await cast(false), nb = await cast(true)
  ck(`iron_man (MULTI-HIT) does NOT get the one-shot 50% rule (blocked != half)`, nu>0 && Math.abs(nb - Math.round(nu/2)) > 2,
     `unblocked=${nu}  blocked=${nb}  (one-shot half would be ${Math.round(nu/2)}) — governed by its own per-beat chip, unchanged`)
  ck("no page errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} oneshot-ult-block: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
