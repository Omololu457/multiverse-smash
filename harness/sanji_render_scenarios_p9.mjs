// harness/sanji_render_scenarios_p9.mjs — PHASE 9: METADATA. The roster entry carries exactly the brief's name /
// universe / difficulty / archetype / tagline / bio, groups with the other One Piece fighters, is pickable, and the
// Move List (kits.js) entry is present and consistent.
export async function run(X) {
  const { page, check } = X
  const m = await page.evaluate(async () => {
    const c = (await import('./characters.js')).characters, k = (await import('./kits.js'))
    const kits = k.KITS || k.kits || k.default || {}
    const a = c.sanji, op = Object.values(c).filter(x => x && x.universe === 'one_piece').map(x => x.rosterKey || '').sort()
    const kt = kits.sanji
    return { name: a.name, displayName: a.displayName, universe: a.universe, difficulty: a.difficulty, archetype: a.archetype, tagline: a.tagline, bio: a.bio, op,
      kit: kt ? { type: kt.type, energy: kt.energy, specials: kt.specials.length, ult: kt.ultimate?.name, combos: kt.combos.length, basics: kt.basics.map(b => b.name + ' ' + b.desc).join(' | ') } : null,
      hidden: !!a.hidden, playable: a.isPlayable !== false }
  })
  const BIO = 'Chef of the Straw Hat Pirates, trained in the Black Leg style under Zeff. He fights only with his legs: his hands belong to the kitchen. Give him enough time to spin and his leg catches fire.'
  check('metadata: name / displayName "Sanji"', m.name === 'Sanji' && m.displayName === 'Sanji', `${m.name} / ${m.displayName}`)
  check('metadata: universe One Piece (grouped with Luffy / Zoro / Buggy / Arlong)', m.universe === 'one_piece' && ['zoro', 'buggy', 'sanji'].every(k => m.op.includes(k)), m.op.join(','))
  check('metadata: difficulty 4, archetype "Rushdown / Chain Specialist"', m.difficulty === 4 && m.archetype === 'Rushdown / Chain Specialist', `${m.difficulty} ${m.archetype}`)
  check('metadata: tagline', m.tagline === "A cook's hands are for cooking.", m.tagline)
  check('metadata: bio (verbatim)', m.bio === BIO, m.bio)
  check('pickable (not hidden)', !m.hidden && m.playable, JSON.stringify({ h: m.hidden, p: m.playable }))
  check('Move List (kits.js): Heat, 6 specials, PARTY TABLE KICK COURSE, the 5 combos, archetype header',
    m.kit && m.kit.energy === 'Heat' && m.kit.specials === 6 && m.kit.ult === 'PARTY TABLE KICK COURSE' && m.kit.combos === 5 && m.kit.type === m.archetype, JSON.stringify(m.kit && { ...m.kit, basics: undefined }))
  check('Move List never lists a punch (every normal is a kick, knee or shin)', m.kit && !/punch|fist|jab/i.test(m.kit.basics), m.kit?.basics?.slice(0, 120))
}
