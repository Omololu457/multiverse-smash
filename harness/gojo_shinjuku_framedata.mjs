// harness/gojo_shinjuku_framedata.mjs — MSV1-GOJO: per-character frame-data snapshot / diff.
//   node harness/gojo_shinjuku_framedata.mjs snap <treeDir> <out.json>
//   node harness/gojo_shinjuku_framedata.mjs diff <before.json> <after.json>
// Snapshot = every character definition (attacks / specials / ults / stats / hitboxes / timings / animation tables),
// every skins.js entry and every kit, serialised whole (functions dropped, keys sorted). The diff must be ZERO for every
// pre-existing key; only gojo_shinjuku may be new.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
const strip = v => { if (Array.isArray(v)) return v.map(strip); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o } return v }
const H = v => crypto.createHash('sha1').update(JSON.stringify(strip(v)) || 'undefined').digest('hex')
const [mode, a, b] = process.argv.slice(2)
if (mode === 'snap') {
  const dir = path.resolve(a), imp = f => import(pathToFileURL(path.join(dir, f)).href)
  const chars = (await imp('characters.js')).characters
  const out = { characters: {}, skins: {}, kits: {} }
  for (const k of Object.keys(chars).sort()) out.characters[k] = H(chars[k])
  try { const s = await imp('skins.js'); const t = s.SKINS || s.CHARACTER_SKINS || s.skins || {}; for (const k of Object.keys(t).sort()) out.skins[k] = H(t[k]) } catch (e) { out.skinsError = e.message }
  try { const kk = await imp('kits.js'); const t = kk.KITS || kk.kits || {}; for (const k of Object.keys(t).sort()) out.kits[k] = H(t[k]) } catch (e) { out.kitsError = e.message }
  fs.writeFileSync(b, JSON.stringify(out, null, 1))
  console.log(`snapshot: ${Object.keys(out.characters).length} characters, ${Object.keys(out.skins).length} skin sets, ${Object.keys(out.kits).length} kits → ${b}`)
} else if (mode === 'diff') {
  const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'))
  let bad = 0
  for (const sec of ['characters', 'skins', 'kits']) {
    const changed = Object.keys(A[sec]).filter(k => A[sec][k] !== B[sec][k])
    const added = Object.keys(B[sec]).filter(k => !(k in A[sec]))
    const okAdd = added.every(k => k === 'gojo_shinjuku')
    console.log(`  ${changed.length ? '❌' : '✅'} ${sec}: ${Object.keys(A[sec]).length} existing, changed=${changed.length}${changed.length ? ' [' + changed.join(',') + ']' : ''}; added=[${added.join(',')}]${okAdd ? '' : ' ❌ unexpected'}`)
    if (changed.length || !okAdd) bad++
  }
  for (const k of ['gojo', 'sukuna', 'alt_sukuna', 'megumi_fushiguro', 'handler', 'yuta', 'aoi_todo', 'ninja_storm_rangers', 'windrangers', 'spiderman'])
    if (k in A.characters) console.log(`     ${A.characters[k] === B.characters[k] ? '=' : '≠'} ${k}`)
  console.log(`\nGOJO_SHINJUKU FRAME-DATA DIFF: ${bad ? 'FAIL' : 'ZERO DIFF'}`)
  process.exit(bad ? 1 : 0)
}
