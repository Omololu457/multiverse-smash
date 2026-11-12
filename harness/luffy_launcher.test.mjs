// Real process test: foreign-port safety, correct-root reuse and detached lifetime.
import assert from 'node:assert/strict'
import http from 'node:http'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import fs from 'node:fs'
const exec=promisify(execFile)
const foreign=http.createServer((q,r)=>r.end('foreign server; do not stop'))
await new Promise(r=>foreign.listen(0,'127.0.0.1',r));const port=foreign.address().port
let ownedPid
try{
 const run=()=>exec(process.execPath,['tools/launch-luffy.mjs','--no-open','--port',String(port)],{timeout:30000})
 const a=(await run()).stdout;ownedPid=Number(a.match(/PID (\d+)/)?.[1]);const url=a.match(/Play: (http:\/\/[^\s]+)/)?.[1]
 assert(ownedPid&&url,'launcher reports its detached server')
 assert.notEqual(new URL(url).port,String(port),'occupied foreign port is not reused')
 assert.equal(await(await fetch(`http://127.0.0.1:${port}/`)).text(),'foreign server; do not stop')
 assert.equal(await(await fetch(url+'luffyData.js')).text(),fs.readFileSync('luffyData.js','utf8'))
 const b=(await run()).stdout;assert(b.includes(`Reusing Luffy server (PID ${ownedPid})`),'second launch reuses exact server')
 // Both launcher parent processes have exited; detached child must still serve the game.
 assert.equal((await fetch(url)).status,200)
 console.log('LUFFY LAUNCHER: foreign port preserved; correct checkout served; same PID reused; server survives launcher exit')
}finally{if(ownedPid)process.kill(ownedPid,'SIGTERM');await new Promise(r=>foreign.close(r))}
