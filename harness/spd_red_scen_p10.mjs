// Phase 10 scenarios — METADATA: the roster entry carries exactly the brief's name / displayName / universe /
// difficulty / archetype / tagline / bio, groups with the other Power Rangers, the Move List (kits.js) is present and
// matches the kit, and a gamepad feeds his raw-controls snapshot (the readRawControls pad branch).
import fs from 'node:fs'
export async function run(X) {
  const { page, check } = X
  const m = await page.evaluate(async () => {
    const c = (await import('./characters.js')).characters, k = await import('./kits.js')
    const kits = k.KITS || {}, a = c.spdRed || Object.values(c).find(x => x && x.rosterKey === 'spd_red')
    const pr = Object.values(c).filter(x => x && x.universe === 'power_rangers').map(x => x.rosterKey || '').sort()
    const kit = kits.spd_red
    return { name: a.name, displayName: a.displayName, universe: a.universe, difficulty: a.difficulty, archetype: a.archetype, tagline: a.tagline, bio: a.bio, pr,
      kit: kit ? { type: kit.type, energy: kit.energy, specials: kit.specials.map(s => s.name), ult: kit.ultimate?.name, combos: kit.combos.length, basics: kit.basics.length } : null,
      viaGetKit: !!k.getKit('spd_red'), hidden: !!a.hidden, playable: a.isPlayable !== false }
  })
  const BIO = 'Jack Landors, Red Ranger of S.P.D. B-Squad. A former street thief who could walk through walls long before he had a morpher. Now he blinks across a battlefield and passes judgment at the end of it.'
  check('metadata: name "SPDRed", displayName "S.P.D. Red Ranger"', m.name === 'SPDRed' && m.displayName === 'S.P.D. Red Ranger', `${m.name} / ${m.displayName}`)
  check('metadata: universe Power Rangers (the existing power_rangers group)', m.universe === 'power_rangers' && m.pr.includes('spd_red') && m.pr.length > 1, m.pr.join(','))
  check('metadata: difficulty 4, archetype "Teleport Rushdown / Judge"', m.difficulty === 4 && m.archetype === 'Teleport Rushdown / Judge', `${m.difficulty} ${m.archetype}`)
  check('metadata: tagline "S.P.D. Emergency!"', m.tagline === 'S.P.D. Emergency!', m.tagline)
  check('metadata: bio (verbatim)', m.bio === BIO, m.bio)
  check('pickable (not hidden)', !m.hidden && m.playable, JSON.stringify({ h: m.hidden, p: m.playable }))
  check('Move List entry (kits.js): Delta, the 6 specials + Judgment, the Super, 5 combos', m.kit && m.viaGetKit && m.kit.energy === 'Delta' && m.kit.type === 'Teleport Rushdown / Judge'
    && ['Delta Blaster', 'Rapid Fire', 'Delta Charge', 'Phase Strike', 'Sky Uppercut', 'Deltamax Strike', 'JUDGMENT'].every(n => m.kit.specials.includes(n))
    && /DELTA SQUAD FULL POWER/.test(m.kit.ult) && m.kit.combos === 5, JSON.stringify(m.kit))
  // gamepad: readRawControls' pad branch includes spd_red (his command layer reads press edges from that snapshot)
  const inp = fs.readFileSync('input.js', 'utf8')
  check('gamepad: readRawControls pad branch includes spd_red', /rosterKey === 'buggy' \|\| fighter\.rosterKey === 'spd_red'\) && !fighter\._aiControlled/.test(inp))
  const pad = await page.evaluate(async () => {
    const I = await import('./input.js'), a = __harness.spdRedTest.raw('p1')
    const old = navigator.getGamepads, pt = I.inputSettings?.p1Type
    const btn = n => ({ pressed: n, value: n ? 1 : 0 })
    const fake = { connected: true, index: 0, id: 'test pad', axes: [1, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => btn(i === 5)) }   // stick right + R1 (Special)
    try {
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [fake, null, null, null] })
      if (I.inputSettings) I.inputSettings.p1Type = 'controller'
      return I.readRawControls(a)
    } catch (e) { return { err: String(e) } } finally {
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: old }); if (I.inputSettings) I.inputSettings.p1Type = pt
    }
  })
  check('gamepad: a pad drives his raw controls (stick right + R1 = right + special)', pad && pad.right === true && pad.special === true, JSON.stringify(pad))
}
