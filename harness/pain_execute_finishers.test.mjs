// harness/pain_execute_finishers.test.mjs — Pain's FIVE finishers + the below-HP-threshold EXECUTION.
// Verifies: (Stage 1) all 5 finishers are present & resolve (the 2 restored originals BLACK ROD / SUMMONING
// alongside the gravity trio TORN ASUNDER / CRUSHED / SHATTERED FRAME); the restored originals still render.
// (Stage 2) the NEW execute carve-out: a REAL Almighty Push / Almighty Pull landing on an execute-sliver foe
// finishes them, stamps the right finisher move key, and renders CRUSHED / TORN ASUNDER — while the SAME move
// at full HP still deals ZERO damage (the test:pain invariant). Screenshots the two execute finishers firing.
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
async function boot(){ await pg.goto(`${base}/index.html?harness=1&p1=pain&p2=madara`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360); await pg.evaluate(()=>{ window.__harness.start(); window.__harness.skipToBattle(); window.__harness.brutality.setBrutality(true); window.__harness.brutality.setBlood?.(true) }); await wf(15) }

const FIVE = [
  { move:"heavy",              name:"BLACK ROD",      gore:"dismember", origin:"restored" },
  { move:"painDederaBird",     name:"SUMMONING",      gore:"beam",      origin:"restored" },
  { move:"painAlmightyPull",   name:"TORN ASUNDER",   gore:"bisect",    origin:"gravity"  },
  { move:"painAlmightyPush",   name:"CRUSHED",        gore:"crush",     origin:"gravity"  },
  { move:"painSuperPushGround",name:"SHATTERED FRAME",gore:"dice",      origin:"gravity"  },
]

try {
  await boot()

  console.log("STAGE 1 — all FIVE finishers present in Pain's table + resolve (not KLASSIC):")
  const moves = await pg.evaluate(()=>window.__harness.brutality.moves("pain"))
  ck("Pain's finisher table has EXACTLY 5 entries", moves.length===5, `keys=[${moves.join(", ")}]`)
  ck("both RESTORED originals present (heavy=Black Rod, painDederaBird=Summoning)", moves.includes("heavy") && moves.includes("painDederaBird"), moves.join(","))
  ck("all 3 gravity finishers present", ["painAlmightyPull","painAlmightyPush","painSuperPushGround"].every(m=>moves.includes(m)), moves.join(","))
  for (const w of FIVE) {
    const f = await pg.evaluate(m=>window.__harness.brutality.finisherFor("pain", m), w.move)
    ck(`${w.move} → "${w.name}" (${w.gore}), real per-move finisher [${w.origin}]`, f.name===w.name && f.gore===w.gore && !f.klassic, JSON.stringify(f))
  }
  // uniqueness across the roster (the 2 restored names must not clash with any other character)
  const clash = await pg.evaluate(names=>{ const H=window.__harness.brutality; const others=H.finishers().filter(k=>k!=="pain"); const used=new Set(); for(const k of others){ for(const m of H.moves(k)){ used.add(H.finisherFor(k,m).name) } } return names.filter(n=>used.has(n)) }, FIVE.map(w=>w.name))
  ck("all 5 finisher names are unique to Pain (no clash with other characters)", clash.length===0, clash.join(",")||"unique")

  console.log("\nSTAGE 1b — the RESTORED originals still FIRE + render (Black Rod, Summoning):")
  for (const w of FIVE.filter(w=>w.origin==="restored")) {
    await boot()
    await pg.evaluate(m=>window.__harness.brutality.trigger("p1", true, m), w.move)
    await wf(6)
    const s = await bru()
    ck(`${w.name} renders (brutality active, finisher resolved)`, s.active && s.finisher?.name===w.name, JSON.stringify({active:s.active, fin:s.finisher}))
    await shot(`PAIN_${w.move}_${w.name.replace(/ /g,"_").toLowerCase()}.png`)
  }
  // SHATTERED FRAME (Super Push) still resolves as the organically-KO'able gravity finisher
  await boot()
  await pg.evaluate(()=>window.__harness.brutality.trigger("p1", true, "painSuperPushGround")); await wf(6)
  ck("SHATTERED FRAME (Super Push) still renders", (await bru()).finisher?.name==="SHATTERED FRAME")

  console.log("\nSTAGE 2 — BELOW-THRESHOLD EXECUTION: real Almighty Push / Pull on an execute-sliver foe:")
  // --- Almighty PUSH (neutral) → CRUSHED via the threshold path ---
  await boot()
  const maxH = (await p2()).maxHealth || 1150
  const sliver = Math.floor(maxH * 0.08)   // 8% < the 12% execute gate
  await pg.evaluate(()=>window.__harness.fillEnergy?.())
  await pg.evaluate(h=>window.__harness.brutality.setHp("p2", h), sliver)
  await pg.keyboard.press("l")             // neutral Special = Almighty Push
  await wf(40)                             // cast(22)+fire(8) — past the shove/execute beat
  const pushHp = (await p2()).health, pushKm = await pg.evaluate(()=>window.__harness.brutality.killMove("p1"))
  ck("Almighty Push on an execute-sliver foe → KO", pushHp<=0, `p2hp ${sliver}→${Math.round(pushHp)}`)
  ck("…and stamps painAlmightyPush (→ CRUSHED) as the killing-blow move", pushKm==="painAlmightyPush", `killMove=${pushKm}`)
  await pg.evaluate(()=>window.__harness.brutality.startLive("p1")); await wf(8)   // render from the execute's OWN stamp
  const pushBru = await bru()
  ck("CRUSHED renders via the execute path (brutality active, finisher=CRUSHED)", pushBru.active && pushBru.finisher?.name==="CRUSHED", JSON.stringify(pushBru.finisher))
  await shot("PAIN_EXECUTE_crushed.png")

  // --- Almighty PULL (Back) → TORN ASUNDER via the threshold path ---
  await boot()
  await pg.evaluate(()=>window.__harness.fillEnergy?.())
  await pg.evaluate(h=>window.__harness.brutality.setHp("p2", h), sliver)
  await pg.keyboard.down("a"); await wf(8); await pg.keyboard.press("l"); await wf(6); await pg.keyboard.up("a")   // Back+Special = Almighty Pull
  await wf(40)
  const pullHp = (await p2()).health, pullKm = await pg.evaluate(()=>window.__harness.brutality.killMove("p1"))
  ck("Almighty Pull on an execute-sliver foe → KO", pullHp<=0, `p2hp ${sliver}→${Math.round(pullHp)}`)
  ck("…and stamps painAlmightyPull (→ TORN ASUNDER) as the killing-blow move", pullKm==="painAlmightyPull", `killMove=${pullKm}`)
  await pg.evaluate(()=>window.__harness.brutality.startLive("p1")); await wf(8)
  const pullBru = await bru()
  ck("TORN ASUNDER renders via the execute path (brutality active, finisher=TORN ASUNDER)", pullBru.active && pullBru.finisher?.name==="TORN ASUNDER", JSON.stringify(pullBru.finisher))
  await shot("PAIN_EXECUTE_torn_asunder.png")

  console.log("\nSTAGE 3 — the 0-damage INVARIANT still holds ABOVE the threshold (normal hits):")
  // --- Almighty PUSH at FULL HP → ZERO damage (no execute) ---
  await boot()
  await pg.evaluate(()=>window.__harness.fillEnergy?.())
  const pushFull0 = (await p2()).health
  await pg.keyboard.press("l"); await wf(40)
  const pushFull1 = (await p2()).health
  ck("Almighty Push at full HP → ZERO damage (no execute above the sliver)", Math.abs(pushFull1-pushFull0)<0.5, `Δhp=${Math.round(pushFull0-pushFull1)}`)
  // --- Almighty PULL at FULL HP → ZERO damage (reels only) ---
  await boot()
  await pg.evaluate(()=>window.__harness.fillEnergy?.())
  const pullFull0 = (await p2()).health
  await pg.keyboard.down("a"); await wf(8); await pg.keyboard.press("l"); await wf(6); await pg.keyboard.up("a"); await wf(40)
  const pullFull1 = (await p2()).health
  ck("Almighty Pull at full HP → ZERO damage (reels only, no execute)", Math.abs(pullFull1-pullFull0)<0.5, `Δhp=${Math.round(pullFull0-pullFull1)}`)

  ck("no page errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
console.log(`\n${F===0?"✅":"❌"} pain-execute-finishers: ${P} passed, ${F} failed`)
await br.close(); server.close(); process.exit(F?1:0)
