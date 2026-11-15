// harness/megumi_framedata_diff.mjs — FRAME-DATA DIFF for every character except Megumi (adapted from cyborg_framedata_diff.mjs).
//   node harness/megumi_framedata_diff.mjs [baseCommit | baseDir] [afterDir]
// DEFAULT baseline = this same worktree with ONLY the Megumi registration lines removed (every top-level *.js copied to a
// temp dir; lines naming megumi_fushiguro / megumiData dropped from characters.js). That isolates Megumi's effect from the other
// concurrent, uncommitted work in the shared files. A commit (e.g. docs/megumi/START_COMMIT.txt) or dir may be given instead.
// Compares EVERY field of every move (basic_attacks, specials, ultimate, moves, combos) and the stats block for every roster
// key except `megumi_fushiguro`, plus the Zoro / Luffy / Buggy / Sanji / Arlong move tables. Any difference fails.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv[2] || 'strip'
let base = arg, mode = 'dir'
if (arg === 'strip') {
  mode = 'strip'; base = fs.mkdtempSync(path.join(os.tmpdir(), 'megumi-fd-'))
  for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.js')) fs.copyFileSync(path.join(ROOT, f), path.join(base, f))
  const cp = path.join(base, 'characters.js'), src = fs.readFileSync(cp, 'utf8').split('\n'), kept = src.filter(l => !/megumiData|^  megumi_fushiguro,/.test(l))
  if (src.length - kept.length !== 2) { console.log(`  ❌ expected exactly 2 Megumi lines in characters.js, found ${src.length - kept.length}`); process.exit(1) }
  fs.writeFileSync(cp, kept.join('\n'))
} else if (!fs.existsSync(arg)) {
  mode = 'commit'; base = fs.mkdtempSync(path.join(os.tmpdir(), 'megumi-fd-'))
  execSync(`git archive ${arg} -- '*.js' | tar -x -C ${base}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' })
}
const tables = { zoroData: 'ZORO_MOVES', luffyData: 'LUFFY_MOVES', buggyData: 'BUGGY_MOVES', sanjiData: 'SANJI_MOVES', arlongData: 'ARLONG_MOVES' }
const load = async dir => {
  const C = (await import(pathToFileURL(path.join(dir, 'characters.js')))).characters
  const T = {}
  for (const [f, k] of Object.entries(tables)) T[f] = fs.existsSync(path.join(dir, f + '.js')) ? (await import(pathToFileURL(path.join(dir, f + '.js'))))[k] : null
  return { C, T }
}
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return v
}
const A = await load(base), B = await load(process.argv[3] ? path.resolve(process.argv[3]) : ROOT)
let checked = 0; const diffs = []
for (const key of Object.keys(A.C)) {
  if (key === 'megumi_fushiguro') continue
  const a = A.C[key], b = B.C[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos']) {
    checked++
    if (JSON.stringify(strip(a?.[part] ?? null)) !== JSON.stringify(strip(b?.[part] ?? null))) diffs.push(`${key}.${part}`)
  }
}
for (const f of Object.keys(tables)) { checked++; if (JSON.stringify(strip(A.T[f])) !== JSON.stringify(strip(B.T[f]))) diffs.push(f) }
const added = Object.keys(B.C).filter(k => !A.C[k])
console.log(`  baseline: ${mode === 'strip' ? 'this worktree minus the Megumi lines' : arg} · roster before ${Object.keys(A.C).length} · after ${Object.keys(B.C).length} · added: ${added.join(', ') || 'none'}`)
console.log(`  ${diffs.length ? '❌' : '✅'} frame-data diff ZERO for every other character (${checked} blocks)${diffs.length ? '  — ' + diffs.join(', ') : ''}`)
process.exit(diffs.length ? 1 : 0)
