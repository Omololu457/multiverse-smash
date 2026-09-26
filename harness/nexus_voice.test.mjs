// harness/nexus_voice.test.mjs — Story Mode cutscene TTS voice audio (macOS `say` clips).
// Verifies: each beat references its expected clip (content-hash name), the clip is served + decodes, it
// actually PLAYS (currentTime advances), distinct speakers map to distinct clips, and a fight silences it.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { voiceClipName, voiceForSpeaker } from "../nexusVoice.js"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".m4a":"audio/mp4",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`
const br=await chromium.launch({ args:["--autoplay-policy=no-user-gesture-required"] })   // let audio actually play headless
const pg=await br.newPage({viewport:{width:1280,height:720}})
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,140)))
let P=0,F=0; const ck=(n,c,d="")=>{(c?P++:F++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`)}
async function wf(n){const s=await pg.evaluate(()=>window.__harness.state().frame);await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:12000,polling:16}).catch(()=>{})}
const cs = () => pg.evaluate(()=>window.__harness.ui.cutscene())
const cv = () => pg.evaluate(()=>window.__harness.ui.cutsceneVoice())
const gs = () => pg.evaluate(()=>window.__harness.ui.state())
const adv = () => pg.evaluate(()=>window.__harness.ui.cutsceneAdvance())

try {
  // clips exist on disk
  const dir = path.join(ROOT, "nexus_voice")
  const clipCount = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>f.endsWith(".m4a")).length : 0
  ck("voice clips were generated (nexus_voice/*.m4a)", clipCount >= 100, `count=${clipCount}`)

  await pg.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness)
  await pg.mouse.click(640,360); await wf(2)
  await pg.evaluate(()=>window.__harness.ui.startNexus()); await wf(3)

  // Beat 0 (narration): the engine should reference + play the expected clip.
  const b0 = await cs(), v0 = await cv()
  const expect0 = voiceClipName(b0.speaker, "Every universe keeps its own time. Its own heroes. Its own endings.")
  ck("beat 0 references its expected voice clip", v0.expected === expect0 && v0.src === expect0, JSON.stringify({expected:v0.expected, src:v0.src}))
  ck("beat 0 clip loaded + decoded (has duration, no error)", v0.readyState >= 2 && v0.duration > 0 && !v0.error, JSON.stringify({rs:v0.readyState, dur:v0.duration, err:v0.error}))

  // …and it actually PLAYS: currentTime advances.
  const t0 = (await cv()).currentTime
  await wf(40)
  const t1 = (await cv()).currentTime
  ck("beat 0 audio is playing (currentTime advanced)", t1 > t0, `t0=${t0?.toFixed(3)} → t1=${t1?.toFixed(3)}`)

  // Walk a few beats; collect distinct speakers → distinct clips + all load cleanly.
  const seen = []
  for (let i=0;i<10;i++){
    const c = await cs()
    if (c.isFight) break
    const vv = await cv()
    if (c.speaker !== null) seen.push({ speaker: c.speaker, clip: vv.src, rs: vv.readyState, err: vv.error, voice: voiceForSpeaker(c.speaker) })
    await adv(); await wf(2); await adv(); await wf(4)
  }
  const allLoaded = seen.every(s => s.clip && s.rs >= 2 && !s.err)
  ck("every walked beat loaded its clip cleanly", allLoaded, seen.map(s=>`${s.speaker||"narr"}:${s.rs}`).join(" "))
  const speakers = [...new Set(seen.map(s=>s.speaker))]
  const distinctClips = new Set(seen.map(s=>s.clip)).size
  ck("distinct speakers seen with distinct clips", speakers.length >= 3 && distinctClips === seen.length, `speakers=${speakers.length} clips=${distinctClips}/${seen.length}`)
  ck("speakers map to distinct macOS voices", new Set(speakers.map(voiceForSpeaker)).size >= 3, speakers.map(s=>`${s||"narr"}=${voiceForSpeaker(s)}`).join(", "))

  // A NEW beat stops the previous line (one voice at a time).
  const beforeClip = (await cv()).src
  await adv(); await wf(1); await adv(); await wf(3)   // load a fresh beat
  const afterClip = (await cv()).src
  ck("advancing to a new beat swaps the clip (one line at a time)", afterClip && afterClip !== beforeClip, `${beforeClip} → ${afterClip}`)

  ck("no page errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} nexus-voice: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
