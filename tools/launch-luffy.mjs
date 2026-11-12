// Launch this checkout with the supported dev server; never reuse a foreign server.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import {fileURLToPath} from 'node:url'
import {spawn,execFileSync} from 'node:child_process'
const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))
const args=process.argv.slice(2),noOpen=args.includes('--no-open'),at=args.indexOf('--port')
const preferred=Number(at>=0?args[at+1]:(process.env.LUFFY_PORT||8000))
if(!Number.isInteger(preferred)||preferred<1024||preferred>65525)throw Error('Choose a port from 1024 to 65525')
const expected=fs.readFileSync(path.join(root,'luffyData.js'),'utf8')
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const endpoint=port=>`http://127.0.0.1:${port}/`
async function occupied(port){return new Promise(resolve=>{const s=net.connect({host:'127.0.0.1',port});s.setTimeout(500);s.once('connect',()=>{s.destroy();resolve(true)});s.once('timeout',()=>{s.destroy();resolve(true)});s.once('error',e=>resolve(e.code!=='ECONNREFUSED'))})}
function owner(port){
 try{
  const ids=execFileSync('lsof',['-nP',`-iTCP:${port}`,'-sTCP:LISTEN','-Fp'],{encoding:'utf8',timeout:3000,stdio:['ignore','pipe','ignore']}).match(/^p\d+$/gm)||[]
  for(const id of ids){const pid=Number(id.slice(1)),cwd=execFileSync('lsof',['-a','-p',String(pid),'-d','cwd','-Fn'],{encoding:'utf8',timeout:3000,stdio:['ignore','pipe','ignore']}).split('\n').find(x=>x.startsWith('n'))?.slice(1)
   if(cwd&&fs.realpathSync(cwd)===root)return pid
  }
 }catch{} // Unknown ownership is never treated as this checkout.
 return null
}
async function correct(port){
 const pid=owner(port);if(!pid)return null
 try{
  const [module,html]=await Promise.all([fetch(endpoint(port)+'luffyData.js',{signal:AbortSignal.timeout(2500)}),fetch(endpoint(port),{signal:AbortSignal.timeout(2500)})])
  if(module.ok&&html.ok&&await module.text()===expected){const text=await html.text();if(text.includes('type="importmap"')&&text.includes('game.js?v='))return pid}
 }catch{}
 return null
}
let chosen=null
for(let port=preferred;port<preferred+10;port++){
 if(await occupied(port)){const pid=await correct(port);if(pid){chosen={port,pid,reused:true};break}console.log(`Port ${port} belongs to another/unsupported server; leaving it running.`);continue}
 const dir=path.join(os.homedir(),'Library','Logs','Multiverse Smash Luffy');fs.mkdirSync(dir,{recursive:true})
 const log=path.join(dir,`server-${port}.log`),fd=fs.openSync(log,'a')
 const child=spawn(process.execPath,['tools/serve.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},detached:true,stdio:['ignore',fd,fd]})
 let failure=null;child.on('error',e=>{failure=e});child.unref();fs.closeSync(fd)
 for(let n=0;n<40;n++){if(failure)throw failure;await sleep(200);const pid=await correct(port);if(pid){chosen={port,pid,reused:false,log};break}if(child.exitCode!=null)break}
 if(chosen)break
 console.error(`Server did not become ready on ${port}; see ${log}`)
}
if(!chosen)throw Error('No supported Luffy server became available; no existing process was stopped.')
const url=endpoint(chosen.port)
console.log(`${chosen.reused?'Reusing':'Started'} Luffy server (PID ${chosen.pid})`)
console.log(`Project: ${root}\nPlay: ${url}`)
if(chosen.log)console.log(`Log: ${chosen.log}`)
if(!noOpen)execFileSync(process.platform==='darwin'?'/usr/bin/open':'xdg-open',[url],{stdio:'inherit'})
