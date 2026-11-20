// harness/msv2_smoke.mjs — quick boot + swap smoke for NINJA STORM RANGERS
import { launch, reporter } from './msv2_lib.mjs'
const R = reporter('MSv2 SMOKE'), D = await launch()
try {
  await D.boot('ninja_storm_rangers', 'spd_red')
  let s = await D.S()
  R.check('boots as ninja_storm_rangers in RED stance', s.key === 'ninja_storm_rangers' && s.stance === 'red', { key: s.key, stance: s.stance, sheet: s.sheet })
  await D.fresh(300)
  await D.dial('j'); await D.step(2); s = await D.S()
  R.check('↓↓+Light in Red = nothing (same stance)', s.stance === 'red' && s.a.stanceSwaps === 0, { stance: s.stance, refused: s.a.stanceRefused })
  await D.dial('k'); await D.step(2); s = await D.S()
  R.check('↓↓+Heavy → YELLOW stance', s.stance === 'yellow' && /yellow/.test(s.sheet), { stance: s.stance, sheet: s.sheet, refused: s.a.stanceRefused, w: s.weight })
  await D.step(40); await D.dial('j'); await D.step(2); s = await D.S()
  R.check('↓↓+Light → back to RED', s.stance === 'red', { stance: s.stance, refused: s.a.stanceRefused })
  R.check('no page errors', D.errors.length === 0, D.errors.slice(0, 3))
} catch (e) { R.check('threw', false, e.stack) }
R.done(); await D.close()
