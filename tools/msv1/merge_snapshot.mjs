// tools/msv1/merge_snapshot.mjs — MSV1-MERGE: dump each FORM's complete gameplay data (frame data, damage, hitboxes,
// Ninja Power costs, systems, stats, run speed, health) as canonical JSON.
//   node tools/msv1/merge_snapshot.mjs write            → docs/msv1/MERGE_SNAPSHOT_{SHANE,DUSTIN}.json (Phase 0)
//   node tools/msv1/merge_snapshot.mjs diff [rootDir]   → per-form path-level diff vs those snapshots (exit 1 on any diff)
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const mode = process.argv[2] || 'diff', ROOT = path.resolve(process.argv[3] || '.')
const imp = f => import(pathToFileURL(path.join(ROOT, f)).href)
await imp('nsData.js')
const N = await imp('ninja.js'), C = (await imp('characters.js')).characters, R = await imp('rangers.js')
const canon = v => {
  if (typeof v === 'function') return `[fn ${v.name || 'anon'}]`
  if (Array.isArray(v)) return v.map(canon)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = canon(v[k]); return o }
  return v
}
function snap(key) {
  const p = N.NINJA_PROFILES[key], c = C[key], rp = R.getRangerProfile(key)
  const walk = Math.max(4.5, Math.min(9.5, 4.5 + (c.stats.speed - 78) / 20 * 5))
  return canon({
    id: key, name: c.name,
    stats: c.stats, health: c.stats.maxHealth, weight: p.weight, airMul: p.airMul,
    runSpeed: { walk, run: walk * (rp?.blink?.run ? rp.blink.run.speed / rp.blink.run.walk : 1), blink: rp?.blink || null },
    hurtbox: { w: c.width ?? c.w ?? null, h: c.height ?? c.h ?? null, spriteScale: c.spriteScale },
    ninjaPower: p.np, streak: p.streak, vanish: p.vanish, clones: p.clones, mirror: p.mirror, barrier: p.barrier,
    burrow: p.burrow, traps: p.traps, rev: p.rev, float: p.float, combo: p.combo,
    moves: p.moves, commands: p.commands, supers: p.supers,
    engine: { basic_attacks: c.basic_attacks, specials: c.specials, ultimate: c.ultimate },
  })
}
const FORMS = { SHANE: 'ns_red', DUSTIN: 'ns_yellow' }
const flat = (o, pre = '', out = {}) => { if (o && typeof o === 'object') { for (const k of Object.keys(o)) flat(o[k], pre ? `${pre}.${k}` : k, out) } else out[pre] = o; return out }
if (mode === 'write') {
  for (const [n, k] of Object.entries(FORMS)) fs.writeFileSync(`docs/msv1/MERGE_SNAPSHOT_${n}.json`, JSON.stringify(snap(k), null, 1) + '\n')
  console.log('wrote', Object.keys(FORMS).map(n => `MERGE_SNAPSHOT_${n}.json`).join(' '))
} else {
  let bad = 0; const lines = []
  for (const [n, k] of Object.entries(FORMS)) {
    const a = flat(JSON.parse(fs.readFileSync(`docs/msv1/MERGE_SNAPSHOT_${n}.json`, 'utf8'))), b = flat(JSON.parse(JSON.stringify(snap(k))))
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
    const d = keys.filter(x => JSON.stringify(a[x]) !== JSON.stringify(b[x]))
    lines.push(`${n} (${k}): ${keys.length} fields, ${d.length} differ`); for (const x of d) lines.push(`  ${x}: ${JSON.stringify(a[x])} → ${JSON.stringify(b[x])}`)
    bad += d.length
  }
  console.log(lines.join('\n')); process.exitCode = bad ? 1 : 0
}
