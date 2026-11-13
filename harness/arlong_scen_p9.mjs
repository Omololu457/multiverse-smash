// Phase 9 scenarios — METADATA: the roster entry carries exactly the brief's name / universe / difficulty /
// archetype / tagline / bio, groups with the other One Piece fighters, and the Move List (kits.js) is present.
export async function run(X) {
  const { page, check } = X
  const m = await page.evaluate(async () => {
    const c = (await import('./characters.js')).characters, k = (await import('./kits.js'))
    const kits = k.KITS || k.kits || k.default || {}
    const a = c.arlong, op = Object.values(c).filter(x => x && x.universe === 'one_piece').map(x => x.rosterKey || '').sort()
    return { name: a.name, displayName: a.displayName, universe: a.universe, difficulty: a.difficulty, archetype: a.archetype, tagline: a.tagline, bio: a.bio, op,
      kit: kits.arlong ? { type: kits.arlong.type, energy: kits.arlong.energy, specials: kits.arlong.specials.length, ult: kits.arlong.ultimate?.name } : null, hidden: !!a.hidden, playable: a.isPlayable !== false }
  })
  const BIO = "Sawshark fishman and captain of the Arlong Pirates. Ten times a human's strength on land and more in the sea, he ruled Cocoyasi Village through fear and arithmetic. His teeth grow back. His pride never did."
  check('metadata: name / displayName "Arlong"', m.name === 'Arlong' && m.displayName === 'Arlong', `${m.name} / ${m.displayName}`)
  check('metadata: universe One Piece (grouped with Luffy / Zoro / Buggy)', m.universe === 'one_piece' && ['buggy', 'zoro'].every(k => m.op.includes(k)) && m.op.includes('arlong'), m.op.join(','))
  check('metadata: difficulty 3, archetype "Heavy Bruiser / Zone Control"', m.difficulty === 3 && m.archetype === 'Heavy Bruiser / Zone Control', `${m.difficulty} ${m.archetype}`)
  check('metadata: tagline', m.tagline === 'This is the difference in our species.', m.tagline)
  check('metadata: bio (verbatim)', m.bio === BIO, m.bio)
  check('pickable (not hidden)', !m.hidden && m.playable, JSON.stringify({ h: m.hidden, p: m.playable }))
  check('Move List entry (kits.js): Tide, 6 specials, ARLONG PARK', m.kit && m.kit.energy === 'Tide' && m.kit.specials === 6 && m.kit.ult === 'ARLONG PARK' && m.kit.type === 'Heavy Bruiser / Zone Control', JSON.stringify(m.kit))
}
