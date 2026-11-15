// harness/violet_all.mjs — runs every Violet Parr harness in sequence and prints one summary line each.
//   node harness/violet_all.mjs            (≈ 10–15 min; each file is also runnable on its own)
import { spawnSync } from 'node:child_process'
const RUNS = [
  ['violet_stats.test.mjs'], ['violet_vanish.test.mjs'], ['violet_moveset.test.mjs'], ['violet_combos.test.mjs'],
  ['violet_defense.test.mjs'], ['violet_skins.test.mjs'], ['violet_sound.test.mjs'], ['violet_metadata.test.mjs'],
  ['violet_determinism.mjs'],
  ['violet_render_check.mjs'], ['violet_render_check.mjs', '--invisible'],
  ['violet_render_check.mjs', '--skin', 'vi_inc2'], ['violet_render_check.mjs', '--skin', 'vi_inc2', '--invisible'],
  ['violet_render_check.mjs', '--skin', 'vi_midnight'], ['violet_render_check.mjs', '--skin', 'vi_midnight', '--invisible'],
]
let bad = 0
for (const r of RUNS) {
  const p = spawnSync(process.execPath, ['harness/' + r[0], ...r.slice(1)], { encoding: 'utf8', maxBuffer: 64 << 20 })
  const line = (p.stdout || '').trim().split('\n').filter(l => /passed, \d+ failed/.test(l)).pop() || `(no summary) exit ${p.status}`
  if (p.status !== 0 || / [1-9]\d* failed/.test(line)) bad++
  console.log((p.status === 0 ? 'ok  ' : 'FAIL') + '  ' + line.trim())
}
console.log(bad ? `\nviolet: ${bad} harness(es) failed` : '\nviolet: all harnesses green'); process.exit(bad ? 1 : 0)
