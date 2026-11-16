// harness/enoch_framedata_diff.mjs — Enoch must leave EVERY other character unchanged (adapted from dseyl_framedata_diff.mjs).
//   node harness/enoch_framedata_diff.mjs [baseCommit]      default base = docs/enoch/START_COMMIT.txt
// Runs in the repo OR in a test tree (tools/enoch/test_tree.sh): the base is exported with `git archive` from the repo that
// owns this checkout (ENOCH_REPO env, else this directory) and compared FILE-BY-FILE against the tree the test runs in.
// 1. Every move / stat / trait / animation block of every roster key except `enoch`, base vs now — ESPECIALLY Frozone,
//    Superman, Homelander, Green Arrow (shared freeze status), Sanji, Arlong, Elastigirl (motion parser).
// 2. Frozone's own modules + every Frozone / Homelander / Superman / Sanji / Arlong / Elastigirl source and sprite file
//    byte-identical; the shared beam / freeze / burn implementations untouched (abilities.js byte-identical).
// 3. The only roster addition is `enoch`; no skins beyond the default.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = process.env.ENOCH_REPO || ROOT
const BASE = process.argv[2] || fs.readFileSync(path.join(ROOT, 'docs/enoch/START_COMMIT.txt'), 'utf8').trim()
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'enoch-fd-'))
execSync(`git archive ${BASE} | tar -x -C ${tmp}`, { cwd: REPO, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 })
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return v
}
const J = v => JSON.stringify(strip(v))
const imp = (dir, f) => import(pathToFileURL(path.join(dir, f)))
let pass = 0, fail = 0; const diffs = []
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }

const A = (await imp(tmp, 'characters.js')).characters, B = (await imp(ROOT, 'characters.js')).characters
let checked = 0
for (const key of Object.keys(A)) {
  const a = A[key], b = B[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'traits', 'animationData']) { checked++; if (J(a?.[part] ?? null) !== J(b?.[part] ?? null)) diffs.push(`${key}.${part}`) }
}
const added = Object.keys(B).filter(k => !A[k])
ok(`frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} existing characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
ok('the only roster addition is enoch', added.length === 1 && added[0] === 'enoch', 'added: ' + added.join(', '))
for (const k of ['frozone', 'superman', 'homelander', 'green_arrow', 'sanji', 'arlong', 'elastigirl', 'syndrome', 'dseyl']) ok(`  ${k}: identical`, !!A[k] && !diffs.some(d => d.startsWith(k + '.')))
const fA = await imp(tmp, 'frozoneData.js'), fB = await imp(ROOT, 'frozoneData.js')
const fk = Object.keys(fA).filter(k => typeof fA[k] !== 'function')
ok(`frozoneData.js exports deep-equal (${fk.length} tables)`, fk.every(k => J(fA[k]) === J(fB[k])), fk.filter(k => J(fA[k]) !== J(fB[k])).join(', '))
const sA = (await imp(tmp, 'skins.js')), sB = (await imp(ROOT, 'skins.js'))
const skA = sA.SKINS || sA.skins || sA.default, skB = sB.SKINS || sB.skins || sB.default
if (skA && skB) {
  const sd = Object.keys(skA).filter(k => J(skA[k]) !== J(skB[k]))
  ok('skins: every existing character\'s skin list deep-equal', !sd.length, sd.join(', '))
  ok('enoch: the default skin only', (skB.enoch || []).length === 1 && skB.enoch[0].id === 'default', JSON.stringify((skB.enoch || []).map(s => s.id)))
}
// byte-identical files (source + sprites) — Frozone, the beam / freeze / burn / zone owners, and their art
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex')
const walk = (dir, pred) => { const out = []; const go = d => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) go(p); else if (pred(path.relative(dir, p))) out.push(path.relative(dir, p)) } }; go(dir); return out }
const watched = walk(tmp, r => /^(frozone|homelander|superman|sanji|arlong|elastigirl|abilities|flight|greenArrow|drones|munitions)[^/]*\.(js|png)$/i.test(r) || /^assets\/(frozone|homelander|superman|sanji|arlong|elastigirl)\//.test(r) || /^Game Boy Advance - The Incredibles - Playable Characters - Frozone\.png$/.test(r) || /^homelander_sfx/.test(r))
// 2026-11-16 (owner: "give him all of the moves from frozone"): Enoch's ICE STANCE runs Frozone's own kit through a HOST TABLE
// in frozone.js / frozoneState.js / frozoneFx.js. Those three files are checked separately below: every added line must be
// part of the host table (or a comment, or an old line re-gated), so Frozone's paths stay as they were. Frozone's behaviour
// itself is covered by his own suites (frozone.test / frozone_damage / frozone_skins / frozone_boot, identical before / after).
const HOSTED = ['frozone.js', 'frozoneState.js', 'frozoneFx.js']
const changed = watched.filter(r => !HOSTED.includes(r) && (!fs.existsSync(path.join(ROOT, r)) || md5(path.join(tmp, r)) !== md5(path.join(ROOT, r))))
ok(`Frozone / Superman / Homelander / Sanji / Arlong / Elastigirl / abilities.js / flight.js source + sprite files byte-identical (${watched.length - HOSTED.length} files; the 3 hosted Frozone files checked next)`, !changed.length, changed.slice(0, 12).join(', '))
{
  const HOST = /hasFzKit|fzMobile|hostOf|FZ_HOSTS|registerFrozoneHost|\bpaid\b|\bmob\b|^\s*\/\//, bad = []
  for (const r of HOSTED) {
    const A = fs.readFileSync(path.join(tmp, r), 'utf8').split('\n'), B = fs.readFileSync(path.join(ROOT, r), 'utf8').split('\n'), old = new Set(A.map(l => l.trim()))
    for (const l of B) { const t = l.trim(); if (!t || old.has(t)) continue
      if (HOST.test(t) || old.has(t.replace(/^else /, '')) || /^if \(isFz\(f\)\) drawIntro/.test(t) || (t.includes('drawIntro') && t.includes('isFz(f)'))) continue
      bad.push(r + ': ' + t.slice(0, 120)) }
  }
  ok('the 3 hosted Frozone files differ ONLY by the host table (hasFzKit / fzMobile / host pay)', !bad.length, bad.slice(0, 6).join('\n'))
}
console.log(`\n  ENOCH FRAME-DATA DIFF vs ${BASE.slice(0, 10)}: ${pass} passed, ${fail} failed`)
fs.rmSync(tmp, { recursive: true, force: true }); process.exit(fail ? 1 : 0)
