// Phase 10 scenarios — BALANCE: the notes exist and cover every brief matchup; the balance change (context-
// sensitive neutral Special) behaves. The Buggy damageType matchup itself is proven by
// harness/arlong_buggy_tags.test.mjs. Called by arlong_scen_p9.mjs.
import fs from 'node:fs'
export async function run(X) {
  const { page, step, as, check, fresh, tap, settle } = X
  const notes = fs.existsSync('docs/arlong/BALANCE_NOTES.md') ? fs.readFileSync('docs/arlong/BALANCE_NOTES.md', 'utf8') : ''
  check('BALANCE_NOTES.md covers Buggy (even) / Zoro 5-5 / Superman-Homelander 4-6 / Green Arrow / not-broken',
    /vs Buggy[^\n]*EVEN/.test(notes) && /vs Zoro \(target 5-5\)/.test(notes) && /Superman \/ Homelander \(target 4-6/.test(notes) && /vs Green Arrow/.test(notes) && /Why he is not broken/.test(notes), notes.length)
  await fresh(150, 100); await tap(['l']); await step(2); let s = await as()
  check('neutral Special up close = Shark On Tooth', s.move === 'aTooth', s.move)
  await settle(); await fresh(500, 100); await tap(['l']); await step(2); s = await as()
  check('neutral Special at range = Water Shot (no whiffing lunge)', s.move === 'aShot', s.move)
  await settle(60)
}
