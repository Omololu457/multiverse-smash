import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const P1=process.argv[2]||'luffy', OUT=process.argv[3]||'/tmp/boot.png'
const server=await serve(),browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[]
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(new URL(r.url()).pathname)})
try{
 await page.goto(server.base+`/index.html?harness=1&p1=${P1}&p2=luffy`,{waitUntil:'load'})
 await page.waitForFunction(()=>!!window.__harness,null,{timeout:30000})
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle()})
 await page.waitForTimeout(1500)
 const st=await page.evaluate(()=>({s:__harness.state().state,p1:__harness.p1()?.rosterKey,p2:__harness.p2()?.rosterKey}))
 await page.screenshot({path:OUT})
 console.log(JSON.stringify({st,errors,missing:[...new Set(missing)].slice(0,10)}))
}finally{await browser.close();server.close()}
