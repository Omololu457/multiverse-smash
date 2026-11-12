// Run the preserved integration checks against this checkout; retain full per-check logs.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const files=['harness/pvp_keyboard_input.test.mjs','harness/roster_integrity.test.mjs','harness/ben10_integration.test.mjs','harness/ben10_experimental_catalog.test.mjs',
 'harness/ben10_omnitrix_p3.mjs','harness/ben10_moveset_p4.mjs','harness/ben10_combo_p5.mjs','harness/ben10_defense_p6.mjs','harness/ben10_sound_p7.mjs',
 'harness/ben10_render_check.mjs','harness/ben10_vow_determinism.test.mjs','harness/ben10_swampfire_live.mjs','harness/ben10_replay_lan.mjs',
 'harness/determinism.test.mjs','harness/replay_playback.test.mjs','harness/net_online.test.mjs','harness/credits.test.mjs',
 'harness/overnight_render_check.mjs','harness/feel_phase1_verify.mjs','harness/feel_phase2_verify.mjs','harness/feel_phase3_verify.mjs','harness/feel_phase4_verify.mjs','harness/feel_phase5_verify.mjs',
 'harness/combo_standard_audit.mjs']
const results=[]
for(const file of files){
 const begin=Date.now();console.log('RUN',file)
 const r=await new Promise(resolve=>{
  const p=spawn(process.execPath,[file],{cwd:root,stdio:['ignore','pipe','pipe']});let stdout='',stderr=''
  p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b)
  const timeout=setTimeout(()=>p.kill('SIGTERM'),240000)
  p.on('close',(code,signal)=>{clearTimeout(timeout);resolve({file,code,signal,stdout,stderr,ms:Date.now()-begin})})
 })
 results.push(r);fs.writeFileSync('/tmp/luffy-regression-results.json',JSON.stringify(results,null,2))
 console.log('RESULT',r.code,r.stdout.split('\n').filter(l=>/passed|failed|FAIL|SUMMARY|error|Exception/i.test(l)).slice(-6).join('\n'),r.stderr.slice(-600))
}
if(results.some(r=>r.code!==0))process.exitCode=1
