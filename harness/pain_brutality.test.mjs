// harness/pain_brutality.test.mjs — Pain in the Brutality system: 3 gravity finishers (TORN ASUNDER pull /
// CRUSHED push / SHATTERED FRAME super), keyed to his REAL gravity move stamps, reusing the sprite-bisection
// + bone + blood engine. Verifies eligibility, resolution, render, the organic Super-Push trigger, distinctness,
// and that Almighty Push/Pull still work as normal (0-damage) gameplay moves.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".m4a":"audio/mp4",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1280,height:720}})
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,140)))
let P=0,F=0; const ck=(n,c,d="")=>{(c?P++:F++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`)}
async function wf(n){const s=await pg.evaluate(()=>window.__harness.state().frame);await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{})}
const bru = () => pg.evaluate(()=>window.__harness.brutality.state())
const p2 = () => pg.evaluate(()=>window.__harness.p2())
const shot = f => pg.screenshot({ path: path.join(OUT, f) })
async function boot(){ await pg.goto(`${base}/index.html?harness=1&p1=pain&p2=madara`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360); await pg.evaluate(()=>{ window.__harness.start(); window.__harness.skipToBattle(); window.__harness.brutality.setBrutality(true) }); await wf(15) }

const WANT = [
  { move:"painAlmightyPull",    name:"TORN ASUNDER",   gore:"bisect", shot:"PAIN_torn_asunder.png" },
  { move:"painAlmightyPush",    name:"CRUSHED",        gore:"crush",  shot:"PAIN_crushed.png" },
  { move:"painSuperPushGround", name:"SHATTERED FRAME",gore:"dice",   shot:"PAIN_shattered_frame.png" },
]
try {
  await boot()
  // STAGE 1 — eligibility
  const elig = await pg.evaluate(()=>window.__harness.brutality.eligible())
  ck("Pain is in BRUTALITY_ELIGIBLE", elig.includes("pain"), `pain∈eligible`)
  const excluded = ["naruto","boruto","kiba","gohan","gon","killua","nezuko","ben10","saiki","light"]
  ck("hard-exclusion list intact (none of them eligible)", excluded.every(k=>!elig.includes(k)), excluded.filter(k=>elig.includes(k)).join(",")||"clean")

  // STAGE 2 — resolution + distinctness
  const resolved = []
  for (const w of WANT){
    const f = await pg.evaluate(m=>window.__harness.brutality.finisherFor("pain", m), w.move)
    resolved.push(f)
    ck(`${w.move} → "${w.name}" (${w.gore}), real per-move finisher (not KLASSIC)`, f.name===w.name && f.gore===w.gore && !f.klassic, JSON.stringify(f))
  }
  ck("the 3 finishers are DISTINCT (names + gore)", new Set(resolved.map(f=>f.name)).size===3 && new Set(resolved.map(f=>f.gore)).size===3)
  // distinct from other characters' finishers
  const clash = await pg.evaluate(names=>{ const H=window.__harness.brutality; const others=H.finishers().filter(k=>k!=="pain"); const used=new Set(); for(const k of others){ for(const m of H.moves(k)){ const f=H.finisherFor(k,m); used.add(f.name) } } return names.filter(n=>used.has(n)) }, WANT.map(w=>w.name))
  ck("finisher names are unique to Pain (no clash with other characters)", clash.length===0, clash.join(",")||"unique")

  // STAGE 3 — render each via the sprite-bisection engine (harness trigger stamps the move key + KOs)
  for (const w of WANT){
    await boot()
    await pg.evaluate(m=>window.__harness.brutality.trigger("p1", true, m), w.move)
    await wf(28)
    const s = await bru()
    ck(`${w.name} renders (brutality active, finisher resolved)`, s.active && s.finisher?.name===w.name, JSON.stringify({active:s.active, fin:s.finisher}))
    await shot(w.shot)
    await wf(60)   // let the beat end before the next boot
  }

  // STAGE 3b — ORGANIC trigger: Super Push (the only DAMAGING gravity variant) as a real killing blow → SHATTERED
  // FRAME. Fired with REAL input (Down=S + Special=L), proving the move-key stamp added to painGravityShove.
  await boot()
  await pg.evaluate(()=>{ window.__harness.fillEnergy?.(); window.__harness.setP2X?.((window.__harness.p1()?.x||0)+110) })  // in reach (230)
  for (let i=0;i<60 && (await p2()).health>55;i++) await pg.evaluate(()=>window.__harness.damageP2?.(90))   // whittle to a sliver the 132-dmg Super Push will finish
  await pg.keyboard.down("s"); await wf(5); await pg.keyboard.press("l"); await wf(3); await pg.keyboard.up("s")   // Down + Special = Super Push
  await pg.waitForFunction(()=>((window.__harness.p2()?.health)||1) <= 0, null, {timeout:9000, polling:16}).catch(()=>{})
  const koHp = (await p2()).health
  const km = await pg.evaluate(()=>window.__harness.brutality.killMove?.("p1"))
  // A real, playable Super Push landed the FATAL blow and stamped its move key → in a live (non-training) match
  // that KO resolves SHATTERED FRAME (the render for this exact key is verified above). The training harness
  // suppresses the round-end→brutality flow, so we assert the wiring: KO + the correct killing-blow-move stamp.
  ck("Super Push lands the FATAL blow + stamps painSuperPushGround (→ SHATTERED FRAME organically)",
     koHp <= 0 && km === "painSuperPushGround" && (await pg.evaluate(m=>window.__harness.brutality.finisherFor("pain",m).name, km)) === "SHATTERED FRAME",
     `p2hp=${Math.round(koHp)} killMove=${km}`)

  // FINAL — Almighty Push still works as a NORMAL gameplay move (global shove, ZERO damage — the tested invariant).
  // (Pull/Super gameplay are covered directly by test:pain via real directional input.)
  await boot()
  const before = await p2()
  await pg.evaluate(()=>window.__harness.p1SpecialDir?.(null))   // neutral Almighty Push
  await wf(40)   // Push shoves at cast(22)+fire(8) — wait past the fire beat
  const afterPush = await p2()
  ck("Almighty Push still works as gameplay (shoves away, ZERO damage — invariant intact)",
     Math.abs((afterPush.health||0)-(before.health||0))<0.5 && Math.abs((afterPush.x||0)-(before.x||0))>20,
     `Δhp=${Math.round((before.health||0)-(afterPush.health||0))} Δx=${Math.round((afterPush.x||0)-(before.x||0))}`)

  ck("no page errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} pain-brutality: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
