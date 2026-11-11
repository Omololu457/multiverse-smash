import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export async function serve() {
 const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.css':'text/css','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.svg':'image/svg+xml'}
 const server=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(d)})})
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {base:`http://127.0.0.1:${server.address().port}`,close:()=>{server.closeAllConnections();server.close()}}
}
export const frames = async(p,n)=>{const f=await p.evaluate(()=>__harness.state().frame);await p.waitForFunction(([f,n])=>__harness.state().frame>=f+n,[f,n],{timeout:20000,polling:16})}
export async function start(p,opts={}){await p.evaluate(o=>__harness.start(o),opts);await frames(p,4);await p.evaluate(()=>__harness.skipToBattle());await frames(p,16)}
