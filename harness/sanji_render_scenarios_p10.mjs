// harness/sanji_render_scenarios_p10.mjs — PHASE 10: BALANCE. The notes exist and cover every brief matchup with its
// target; the Buggy damageType proof itself is harness/sanji_buggy_tags.test.mjs (run as a P10+ gate).
import fs from 'node:fs'
export async function run(X) {
  const { check } = X
  const n = fs.existsSync('docs/sanji/BALANCE_NOTES.md') ? fs.readFileSync('docs/sanji/BALANCE_NOTES.md', 'utf8') : ''
  check('BALANCE_NOTES.md: vs Zoro (target 5-5)', /### vs Zoro \(target 5-5\)/.test(n), n.length)
  check('BALANCE_NOTES.md: vs Buggy favoured, the tag-system proof table', /### vs Buggy \(favoured\)/.test(n) && /sanji_buggy_tags\.test\.mjs/.test(n))
  check('BALANCE_NOTES.md: vs Arlong 6-4 (Sky Walk vs grounded water, his anti-air claw)', /### vs Arlong \(6-4 Sanji\)/.test(n) && /anti-air claw/.test(n))
  check('BALANCE_NOTES.md: vs Superman / Homelander 4.5-5.5', /### vs Superman \/ Homelander \(4\.5-5\.5\)/.test(n))
  check('BALANCE_NOTES.md: vs Green Arrow favoured', /### vs Green Arrow \(favoured\)/.test(n))
  check('BALANCE_NOTES.md: why he is not broken (projectile, 940 HP, weight, Heat, Course execution)',
    /## Why he is not broken/.test(n) && /No real projectile/.test(n) && /940 health/.test(n) && /Heat only accrues by fighting/.test(n) && /The Course takes real execution/.test(n))
}
