// harness/dash_parr_framediff.mjs — dumps a canonical hash of every OTHER character's frame data / kit / stats
// (characters.js + kits.js + skins.js entries) so two trees can be diffed:  node harness/dash_parr_framediff.mjs OUT.json
import fs from 'node:fs'
import crypto from 'node:crypto'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage()
await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
await page.goto(server.base+'/index.html?harness=1',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness)
const dump=await page.evaluate(async()=>{const {characters}=await import('./characters.js');const K=await import('./kits.js');const SK=await import('./skins.js')
 const kits=K.KITS||K.default||K.CHARACTER_KITS||{};const skins=SK.SKINS||SK.CHARACTER_SKINS||SK.default||{}
 const seen=new WeakSet(),canon=v=>JSON.stringify(v,(k,x)=>{if(typeof x==='function')return 'fn:'+x.toString().length;if(x&&typeof x==='object'){if(seen.has(x)&&!Array.isArray(x))return x;}return x})
 const out={};for(const key of Object.keys(characters).sort()){if(key==='dash_parr')continue;const c=characters[key]
  out[key]=canon({stats:c.stats,basic:c.basic_attacks,specials:c.specials,ultimate:c.ultimate,traits:c.traits,anim:c.animationData,kit:kits[key]??null})}
 return out})
const hashed=Object.fromEntries(Object.entries(dump).map(([k,v])=>[k,crypto.createHash('sha256').update(v).digest('hex').slice(0,16)]))
fs.writeFileSync(process.argv[2]||'framediff.json',JSON.stringify(hashed,null,1));console.log('characters',Object.keys(hashed).length)
await browser.close();server.close()
