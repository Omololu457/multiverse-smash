// harness/story_data.test.mjs — MSV1-STORY: script data counts, re-runnable parser, entrance resolver, steps, difficulty, saves.
// Pure node (no browser).   node harness/story_data.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const E = await import('../storyEngine.js')
const { characters } = await import('../characters.js')
const S = E.STORY
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { if (c) { PASS++; console.log('  ✅', n) } else { FAIL++; console.log('  ❌', n, d) } }
const section = t => console.log(`\n── ${t}`)

section('parser is re-runnable and reproduces the committed data')
const out = execFileSync('node', ['tools/story/build_story_data.js', '--check'], { cwd: ROOT }).toString()
check('build_story_data.js --check exits 0', true, out)
const committed = fs.readFileSync(path.join(ROOT, 'data/story/story.json'), 'utf8')
const { buildStory, toGameData } = await import('../tools/story/build_story_data.js')
check('a fresh parse equals data/story/story.json byte-for-byte', JSON.stringify(toGameData((await buildStory()).story), null, 1) + '\n' === committed)

section('counts')
const c = { enc: S.encounters.length, secret: S.secret ? 1 : 0, rivals: S.rivals.length, templates: S.templates.length,
  intros: Object.values(S.fighters).filter(f => f.intro.length === 3).length, endings: Object.values(S.fighters).filter(f => f.ending.length === 4).length,
  addresses: Object.keys(S.isshiki.addresses).length, speech: S.isshiki.speech.length, credits: S.credits.narration.length }
const want = { enc: 36, secret: 1, rivals: 83, templates: 45, intros: 110, endings: 110, addresses: 9, speech: 6, credits: 6 }
for (const k of Object.keys(want)) check(`${k} = ${want[k]}`, c[k] === want[k], `got ${c[k]}`)
check('every rival has 2 opening lines and a win line for each side', S.rivals.every(r => r.open.length === 2 && r.wins[r.a.key] && r.wins[r.b.key]))
check('every template has 3 lines', S.templates.every(t => t.lines.length === 3))
check('encounter numbers run 01..36 in order', S.encounters.every((e, i) => e.num === i + 1))

section('keys / maps / franchise')
const visible = Object.keys(characters).filter(k => !characters[k].hidden)
check('the 110 story fighters are exactly the 110 selectable roster keys', JSON.stringify(Object.keys(S.fighters).sort()) === JSON.stringify(visible.sort()))
check('every opponent is a roster key', [...S.encounters, S.secret].every(e => e.opponents.every(o => characters[o.key])))
check('every speaker key is a roster key', [...S.encounters, S.secret].every(e => ['before', 'after', 'scene', 'closing'].every(b => (e[b] || []).every(x => x.kind !== 'say' || characters[x.key]))))
check('every map is used at least once (35/35)', S.meta.unusedMaps.length === 0 && S.meta.usedMaps.length === 35, S.meta.unusedMaps.join(','))
check('franchise overrides: Invincible / The Boys / Power Rangers', S.franchise.invincible === 'Invincible' && S.franchise.omniman_viltrum === 'Invincible' && S.franchise.homelander === 'The Boys' && S.franchise.soldier_boy === 'The Boys' && S.franchise.krybot === 'Power Rangers' && S.franchise.mmpr_rangers === 'Power Rangers')
check('no displayed line over 140 characters', S.meta.longLines.length === 0, JSON.stringify(S.meta.longLines))

section('entrance resolver')
const r1 = E.resolveEntrance('gojo', 'sukuna'), r2 = E.resolveEntrance('sukuna', 'gojo')
check('rival R01 resolves in either order', r1.type === 'rival' && r2.type === 'rival' && r1.rival.id === r2.rival.id)
check('a rival entrance is exactly its 2 opening lines', r1.lines.length === 2 && r1.lines.every(l => l.speaker === 'gojo' || l.speaker === 'sukuna'))
check('rival win line = the winner\'s line only', E.rivalWinLine(r1.rival, 'gojo').speaker === 'gojo' && E.rivalWinLine(r1.rival, 'sukuna').speaker === 'sukuna')
const used = new Set()
const tA = E.resolveEntrance('goku', 'ichigo', used), tB = E.resolveEntrance('ichigo', 'goku', new Set())
check('template resolves in either order with the real fighters as speakers', tA.type === 'template' && tB.type === 'template' && tA.template.id === tB.template.id && tA.lines.length === 3 && tA.lines.every(l => ['goku', 'ichigo'].includes(l.speaker)))
check('template lines play in the listed franchise order', tA.lines.every((l, i) => l.franchise === tA.template.lines[i].franchise))
const tC = E.resolveEntrance('goku', 'zaraki', used)
check('a franchise pair plays at most once per encounter', tC.type === 'none' && tC.repeated === tA.template.id)
const fp = [E.franchiseOf('gojo'), E.franchiseOf('sukuna')]
const usedJJK = new Set([[fp[0], fp[1]].sort().join('|')])
check('rival lines always play (even when the franchise pair was used)', E.resolveEntrance('gojo', 'sukuna', usedJJK).type === 'rival')
check('mirror: no rival or template lines', E.resolveEntrance('gojo', 'gojo').type === 'mirror' && E.resolveEntrance('gojo', 'gojo').lines.length === 0)
const silentT = E.resolveEntrance('nezuko', 'killua')
check('silent fighter (Nezuko) template line shows unsigned on a rift display, unvoiced', silentT.type === 'template' && silentT.lines.some(l => l.unsigned && !l.speaker && !l.voiced), JSON.stringify(silentT.lines))
check('silent fighters: Nezuko / Jason / Krybot', ['nezuko', 'jason', 'krybot'].every(k => E.STORY_SILENT.has(k)))
const br = E.mkLine('nezuko', null, '[She nods.]'), tel = E.mkLine('saiki', null, '[Telepathy] Hello.')
check('[bracket] lines are italic and unvoiced; [Telepathy] keeps its label', br.italic && !br.voiced && !tel.italic && tel.telepathy && tel.text.startsWith('[Telepathy]'))

section('encounter steps')
const s01 = E.buildEncounterSteps(0, 'nezuko', { introSeen: false })
check('01: intro (3) once before fight 01, then act card', s01[0].kind === 'intro' && s01[0].lines.length === 3 && s01.some(s => s.kind === 'card' && s.card.tutorial))
check('01: intro not repeated once seen', !E.buildEncounterSteps(0, 'nezuko', { introSeen: true }).some(s => s.kind === 'intro'))
const s02 = E.buildEncounterSteps(1, 'gojo', { introSeen: true })
check('02: first encounter of ACT 1 → act card + Opening before the encounter card', s02[0].kind === 'act' && s02[0].lines.length === 5 && s02[1].kind === 'card')
check('02: one fight per opponent (5), relay order kept', JSON.stringify(s02.filter(s => s.t === 'fight').map(s => s.oppKey)) === JSON.stringify(S.encounters[1].opponents.map(o => o.key)))
check('03: not first of act → no act card', E.buildEncounterSteps(2, 'gojo', {})[0].kind === 'card')
check('05 is a BOSS card', E.buildEncounterSteps(4, 'gojo', {}).find(s => s.kind === 'card').card.boss === true)
const s09 = E.buildEncounterSteps(8, 'naruto', {})
const order = s09.map(s => s.kind || s.t)
check('Before comes first, then each opponent entrance → fight → exit, then After', order.indexOf('before') < order.indexOf('entrance') && order.lastIndexOf('fight') < order.indexOf('after'))
const s35g = E.buildEncounterSteps(34, 'goku', {}), sc = s35g.find(s => s.kind === 'scene')
check('35 → Scene, then the 6 speech lines, then the personal address (Goku)', sc.lines.filter(l => l.group === 'speech').length === 6 && sc.lines.at(-1).group === 'address' && sc.lines.at(-1).to === 'goku')
check('35 for a fighter without an address → speech only', E.buildEncounterSteps(34, 'ippo', {}).find(s => s.kind === 'scene').lines.every(l => l.group !== 'address'))
const s36 = E.buildEncounterSteps(35, 'gojo_shinjuku', {}), k36 = s36.map(s => s.kind || s.t)
check('36 → Before (no act card between 35 and 36)', k36[0] === 'card' && k36[1] === 'before')
check('36 → defeat line → After → Closing → Ending (4) → credits narration (6) → credits roll', (() => {
  const after = s36.find(s => s.kind === 'after'); const iE = k36.indexOf('ending'), iC = k36.indexOf('credits')
  return after.lines[0].group === 'defeat' && k36.indexOf('after') < k36.indexOf('closing') && k36.indexOf('closing') < iE && iE < iC && s36[iE].lines.length === 4 && s36[iC].lines.length === 6 && s36[iC + 1].t === 'credits'
})(), k36.join(','))
check('36 has the Isshiki half-health caption cue', E.storyMidFightLine(S.encounters[35])?.speaker === 'isshiki')
check('17 / 21 / 29 carry a second map + its text line', [16, 20, 28].every(i => S.encounters[i].secondMap && E.storySecondMapLine(S.encounters[i])?.text))
const retry = E.buildEncounterSteps(8, 'naruto', { retry: true })
check('retry restarts at opponent 1 (no act / card / Before)', retry[0].kind === 'entrance' && retry[0].opp === 0)
const loss = E.buildLossSteps('gojo', 'sukuna')
check('loss vs a rival: the opponent\'s winning line, then retry', loss[0].lines[0].speaker === 'sukuna' && loss[1].t === 'retry')
check('loss vs a non-rival: straight to retry', E.buildLossSteps('goku', 'genos').length === 1)
check('secret S1 vs Saitama builds', E.buildEncounterSteps('S1', 'gojo', {}).some(s => s.t === 'fight' && s.oppKey === 'saitama'))

section('difficulty mapping (ai.js keys)')
const d = S.encounters.map(e => E.storyDifficulty(e))
check('01 tutorial = easy', d[0] === 'easy')
check('ramp: 02–09 easy · 10–21 adaptive · 22–35 impossible (non-boss)', S.encounters.every((e, i) => e.boss || e.num === 1 || d[i] === (e.num <= 9 ? 'easy' : e.num <= 21 ? 'adaptive' : 'impossible')))
check('BOSS one step harder: 05/09 adaptive · 13/17/21 impossible · 25/29/33 master · 36 master', [[5, 'adaptive'], [9, 'adaptive'], [13, 'impossible'], [17, 'impossible'], [21, 'impossible'], [25, 'master'], [29, 'master'], [33, 'master'], [36, 'master']].every(([n, k]) => d[n - 1] === k), d.join(','))
check('S1 = master', E.storyDifficulty(S.secret) === 'master')

section('mirror skin (no Math.random)')
const skins = [{ id: 'default' }, { id: 'a' }, { id: 'b' }, { id: 'c' }]
const m1 = E.storyMirrorSkin(skins, 'default', ['02', 1]), m2 = E.storyMirrorSkin(skins, 'default', ['02', 1])
check('mirror skin is an alternate skin, same inputs → same skin', m1 !== 'default' && m1 === m2)
check('mirror skin differs from the player\'s skin', E.storyMirrorSkin(skins, m1, ['02', 1]) !== m1)
check('storyEngine.js / storyUI.js never call Math.random', !/Math\.random\s*\(/.test(fs.readFileSync(path.join(ROOT, 'storyEngine.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'storyUI.js'), 'utf8')))

section('saves')
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m } }
const st = mem()
check('no save → clean start', JSON.stringify(E.loadStorySave(st)) === JSON.stringify(E.storyBlankSave()))
const sv = E.loadStorySave(st); E.storyRecordClear(sv, 'gojo', 0); E.storyRecordClear(sv, 'gojo', 1); sv.textSpeed = 'fast'; E.writeStorySave(st, sv)
const back = E.loadStorySave(st)
check('per-fighter highest + checkpoint round-trip', back.fighters.gojo.highest === 2 && back.fighters.gojo.checkpoint === 2 && back.textSpeed === 'fast')
for (let i = 2; i < 36; i++) E.storyRecordClear(back, 'gojo', i)
check('clearing 36 → ending seen, campaign cleared, secret unlocked, checkpoint reset', back.fighters.gojo.endingSeen && back.campaignsCleared === 1 && back.secretUnlocked && back.fighters.gojo.checkpoint === 0)
const bad = mem(); bad.setItem(E.STORY_SAVE_KEY, '{not json')
check('corrupt JSON → clean start', JSON.stringify(E.loadStorySave(bad)) === JSON.stringify(E.storyBlankSave()))
bad.setItem(E.STORY_SAVE_KEY, JSON.stringify({ v: 1, secretUnlocked: 'yes', campaignsCleared: -4, textSpeed: 'warp', fighters: { gojo: { highest: 999, checkpoint: 'x' }, not_a_fighter: { highest: 3 } } }))
const san = E.loadStorySave(bad)
check('garbage fields sanitised (bad values → defaults, unknown fighters dropped)', san.secretUnlocked === false && san.campaignsCleared === 0 && san.textSpeed === 'normal' && san.fighters.gojo.highest === 0 && san.fighters.gojo.checkpoint === 0 && !san.fighters.not_a_fighter)
check('wrong version → clean start', JSON.stringify(E.sanitizeStorySave({ v: 7, secretUnlocked: true })) === JSON.stringify(E.storyBlankSave()))
check('a throwing storage → clean start, write reports failure', JSON.stringify(E.loadStorySave({ getItem() { throw new Error('x') } })) === JSON.stringify(E.storyBlankSave()) && E.writeStorySave({ setItem() { throw new Error('x') } }, sv) === false)

console.log(`\n${'═'.repeat(44)}\n  MSV1-STORY DATA: ${PASS} passed, ${FAIL} failed\n${'═'.repeat(44)}`)
process.exit(FAIL ? 1 : 0)
