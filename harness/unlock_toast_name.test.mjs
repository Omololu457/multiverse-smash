// harness/unlock_toast_name.test.mjs — the "New fighter: [object Object]" unlock-toast glitch.
// charactersUnlockedBetween() returns OBJECTS ({key,name,level}); the toast loop treated each as a key
// string, so `${obj}` rendered "[object Object]". Verifies the production toast text now shows real names,
// and that pushing one into the live toast stack stores the correct string.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".m4a":"audio/mp4",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const br=await chromium.launch(); const pg=await br.newPage()
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,140)))
let P=0,F=0; const ck=(n,c,d="")=>{(c?P++:F++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`)}
try {
  await pg.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness)

  // Production toast text for the REAL level-unlock characters (uses the same helper production uses).
  const toasts = await pg.evaluate(()=>window.__harness.ui.charUnlockToasts(0, 200))
  ck("there ARE level-unlock fighters to notify", toasts.length >= 3, `count=${toasts.length}`)
  ck("NO toast says '[object Object]'", toasts.every(t=>!t.includes("[object Object]")), toasts.find(t=>t.includes("[object Object]")) || "clean")
  ck("every toast reads 'New fighter: <RealName>!' (non-empty name)", toasts.every(t=>/^New fighter: .+!$/.test(t) && t.length > "New fighter: !".length), toasts.slice(0,4).join("  |  "))

  // Live stack: push a real unlock toast and confirm it's stored verbatim (not re-stringified to an object).
  const sample = toasts[0]
  await pg.evaluate((t)=>window.__harness.ui.pushToast(t, { icon:"★" }), sample)
  const live = await pg.evaluate(()=>window.__harness.ui.toastTexts())
  ck("live toast stack stores the real name string", live.includes(sample) && !live.some(t=>t.includes("[object Object]")), JSON.stringify(live.slice(0,2)))

  ck("no page errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} unlock-toast-name: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
