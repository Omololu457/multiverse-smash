// tools/vofix/collect.mjs — every voice clip the game references + the line it is SUPPOSED to say.
// Expected text, in priority: inline // "quote" comment, titans tuple text, descriptive filename slug, none.
// Out: tools/vofix/out/clips.json  [{ ref, path, module, expect, src }]
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { VOICE_FILES } from '../../voiceFileManifest.js'
const ROOT = new URL('../../', import.meta.url).pathname
const SKIP = new Set(['node_modules', '.git', 'docs', 'harness', 'tools', 'music', 'ratings', 'nexus_voice', 'brutality_work', 'controls_lab'])
const idx = {}
;(function walk(d, depth) {
  if (depth > 6) return
  for (const n of readdirSync(d)) {
    if (SKIP.has(n) || n.startsWith('.')) continue
    const p = join(d, n); let st; try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) { if (depth > 0 || /voice|audio|sfx|clips|assets|combined/i.test(n)) walk(p, depth + 1) }
    else if (/\.(mp3|m4a|wav|ogg)$/i.test(n) && depth > 0) (idx[n] ||= []).push('./' + p.slice(ROOT.length))
  }
})(ROOT, 0)
const mods = readdirSync(ROOT).filter(f => /(Voice|VoiceMap|VoicePools|VoiceData)\.js$/.test(f) || /Voice[A-Z]?\w*\.js$/.test(f))
const out = [], seen = new Set()
const slug = r => { const b = basename(r).replace(/\.\w+$/, '').split('_').filter(w => !/^\d+$/.test(w) && !/^(en|jp|ja)$/i.test(w)); const s = b.slice(1).join(' '); return s.split(' ').length >= 2 ? s : null }
for (const m of mods) {
  const src = readFileSync(join(ROOT, m), 'utf8')
  for (const line of src.split('\n')) {
    const re = /["']([^"'\s]+\.(?:mp3|m4a|wav|ogg))["']/gi; let mm
    const ci = line.search(/(^|[^:])\/\//)   // refs inside a // comment are notes, not wiring
    while ((mm = re.exec(line))) {
      if (ci >= 0 && mm.index > ci) break
      const ref = mm[1]; const key = m + '|' + ref; if (seen.has(key)) continue; seen.add(key)
      let expect = null, how = null
      const rest = line.slice(mm.index + mm[0].length)
      const tup = rest.match(/^\s*,\s*"((?:[^"\\]|\\.)*)"/)
      const com = rest.match(/\/\/\s*(.*)$/)
      if (tup && tup[1].split(' ').length >= 2) { expect = tup[1]; how = 'tuple' }
      else if (com && /["“]/.test(com[1])) { const q = com[1].match(/["“]([^"”]+)["”]/); if (q) { expect = q[1]; how = 'comment' } }
      if (!expect) { const s = slug(ref); if (s) { expect = s; how = 'slug' } }
      const bn = basename(ref)
      let path = ref.includes('/') ? ref : (VOICE_FILES[bn] || (idx[bn]?.length === 1 ? idx[bn][0] : idx[bn]?.[0] || null))
      if (path && !existsSync(join(ROOT, path))) path = idx[bn]?.[0] || null
      out.push({ ref, path, module: m, expect, src: how })
    }
  }
}
mkdirSync(join(ROOT, 'tools/vofix/out'), { recursive: true })
writeFileSync(join(ROOT, 'tools/vofix/out/clips.json'), JSON.stringify(out, null, 1))
const miss = out.filter(o => !o.path)
console.log('modules', mods.length, 'refs', out.length, 'unique files', new Set(out.map(o => o.path)).size, 'missing', miss.length,
  'expect:', JSON.stringify(out.reduce((a, o) => (a[o.src || 'none'] = (a[o.src || 'none'] || 0) + 1, a), {})))
for (const o of miss.slice(0, 15)) console.log('MISSING', o.module, o.ref)
