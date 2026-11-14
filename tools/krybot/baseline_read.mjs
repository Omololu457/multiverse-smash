// Read-only historical comparison WITHOUT another checkout/copy or shared-file
// replacement. Serve tracked JS bytes from the recorded Git object in memory.
// Usage: node --import ./tools/krybot/baseline_read.mjs harness/<test>.mjs
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'
import {registerHooks} from 'node:module'
const root=fileURLToPath(new URL('../../',import.meta.url))
const base=JSON.parse(fs.readFileSync(path.join(root,'docs/krybot/checkout_baseline.json'),'utf8')).commit
const tracked=new Set(execFileSync('git',['ls-tree','-r','--name-only',base],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}).split('\n').filter(p=>/\.m?js$/.test(p)))
const cache=new Map()
function original(file) {
 let abs;try{abs=file instanceof URL?fileURLToPath(file):path.resolve(String(file))}catch{return null}
 const rel=path.relative(root,abs)
 if(!tracked.has(rel))return null
 if(!cache.has(rel))cache.set(rel,execFileSync('git',['show',`${base}:${rel}`],{cwd:root,maxBuffer:30*1024*1024}))
 return cache.get(rel)
}
registerHooks({load(url,context,next){if(url.startsWith('file:')){const b=original(new URL(url));if(b)return {format:'module',source:b.toString(),shortCircuit:true}}return next(url,context)}})
const read=fs.readFile.bind(fs)
fs.readFile=function(file,opts,cb){if(typeof opts==='function'){cb=opts;opts=undefined}const b=original(file);if(!b)return read(file,opts,cb);const enc=typeof opts==='string'?opts:opts?.encoding;queueMicrotask(()=>cb(null,enc?b.toString(enc):Buffer.from(b)))}
console.log(`Read-only baseline JS: ${base}`)
