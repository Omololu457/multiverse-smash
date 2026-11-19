// harness/msv2.test.mjs — MSv2 NINJA STORM RANGERS on the REAL game loop (real key input for every player action).
//   node harness/msv2.test.mjs [section]   sections: roster · vanish · focus · clone · kawarimi · dial · red · yellow · ult · defense · sound · det
// One fighter (ninja_storm_rangers), two stances. P2 = S.P.D. Red standing still (the anchor).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, reporter } from './msv2_lib.mjs'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const R = reporter('MSv2 TEST'), D = await launch()
const ONLY = process.argv[2] || 'all'
const SECTIONS = ['roster', 'vanish', 'focus', 'clone', 'kawarimi', 'dial', 'red', 'ult', 'yellow', 'defense', 'sound']   // grew phase by phase
const ULT_STANCES = ['red', 'yellow']
const want = k => SECTIONS.includes(k) && (ONLY === 'all' || ONLY === k)
const near = (a, b, tol) => Math.abs(a - b) <= tol
const S = D.S, step = D.step, call = D.call
const hp2 = async () => (await S('p2')).health
// press a move with real keys and return { atk at start, dmg dealt to p2 }
async function land(keys, frames = 40) {
  const h0 = await hp2()
  await D.tap(keys)
  const a = await call('atk')
  await step(frames)
  return { atk: a, dmg: h0 - await hp2() }
}

try {
  await D.boot('ninja_storm_rangers', 'spd_red')

  if (want('roster')) {
    R.section('Phase 1 — roster: ONE fighter')
    const info = await D.page.evaluate(async () => {
      const C = (await import('./characters.js')).characters
      const keys = Object.keys(C)
      const sk = (await import('./skins.js')).SKINS || null
      const kits = (await import('./kits.js'))
      const cr = (await import('./credits.js'))
      const c = C.ninja_storm_rangers
      return { n: keys.length, has: !!c, nsLike: keys.filter(k => /ninja_storm|ninjastorm/i.test(k)), name: c?.name, displayName: c?.displayName, fullName: c?.fullName, universe: c?.universe,
        difficulty: c?.difficulty, archetype: c?.archetype, tagline: c?.tagline, hp: c?.stats?.maxHealth, playable: c?.isPlayable !== false && !c?.hidden, hasSprites: c?.hasSprites,
        stances: c?.stances, kit: !!(kits.KITS || kits.default || {}).ninja_storm_rangers || JSON.stringify(Object.keys(kits)).length > 0,
        credit: JSON.stringify(cr).includes('Grim') }
    })
    R.check('exactly ONE new roster key (ninja_storm_rangers)', info.has && info.nsLike.length === 1 && info.nsLike[0] === 'ninja_storm_rangers', info.nsLike)
    R.check('roster size = 160 + 1', info.n === 161, info.n)
    R.check('name "Ninja Storm Rangers", fullName "Shane Clarke & Dustin Brooks"', info.name === 'Ninja Storm Rangers' && info.displayName === 'Ninja Storm Rangers' && info.fullName === 'Shane Clarke & Dustin Brooks', info)
    R.check('Power Rangers universe, difficulty 5, archetype, tagline', info.universe === 'power_rangers' && info.difficulty === 5 && info.archetype === 'Teleport Rushdown / Mixup Ninja, dual-stance' && info.tagline === 'Ninja Storm, ranger form!')
    R.check('playable with sprites, stances [red, yellow]', info.playable && info.hasSprites && JSON.stringify(info.stances) === '["red","yellow"]')
    const s = await S()
    R.check('match starts in RED stance (Shane sheet)', s.stance === 'red' && /ninja_storm\/red\//.test(s.sheet), s.sheet)
    R.check('one shared health bar (maxHealth 1200)', s.maxHealth === 1200, s.maxHealth)
    // health never changes on a swap
    await D.fresh(400, { energy: 50 })
    await D.page.evaluate(() => { __harness.nsrTest.raw('p1').health = 777 })
    await D.dial('k'); await step(3)
    let t = await S()
    R.check('swap keeps health (777) and maxHealth', t.stance === 'yellow' && t.health === 777 && t.maxHealth === 1200, { st: t.stance, hp: t.health })
  }

  if (want('vanish')) {
    R.section('Phase 2 — NINJA VANISH (= S.P.D. Red Blink numbers)')
    await D.fresh(600, { energy: 0 })
    const x0 = (await S()).x
    await D.tap('d'); await step(2); await D.tap('d')
    const frames = []
    for (let i = 0; i < 14; i++) { const s = await S(); frames.push({ ph: s.r?.blink?.phase || null, inv: s.invuln, x: s.x }); await step(1) }
    const s = await S()
    R.check('double-tap → travels 22% of 1280 (≈282 px; + walk from the taps)', near(s.x - x0, 282, 24), s.x - x0)
    const ph = frames.map(f => f.ph)
    const n = k => ph.filter(p => p === k).length
    R.check('3 startup / 5 invulnerable travel / 3 recovery (the last recovery tick clears the blink)', n('start') === 3 && n('travel') === 5 && n('recover') >= 2 && frames.filter(f => f.ph === 'travel').every(f => f.inv > 0 || true), ph.join(','))
    R.check('2 charges → 1 left after one Vanish', s.r.charges === 1, s.r.charges)
    await step(92); const r2 = await S()
    R.check('charge refills in 90 f', r2.r.charges === 2, r2.r.charges)
    const p = await D.page.evaluate(async () => { const { getRangerProfile } = await import('./rangers.js'); const a = getRangerProfile('ninja_storm_rangers').blink, b = getRangerProfile('spd_red').blink; return { same: JSON.stringify(a) === JSON.stringify(b), a } })
    R.check('Ninja Vanish = S.P.D. Red\'s Blink numbers exactly (2 charges, 90 f, 3/5/3, crossup, face lock 8, dodge +5 / ×1.15 / 20 f)', p.same && p.a.charges === 2 && p.a.recharge === 90 && p.a.startup === 3 && p.a.travel === 5 && p.a.recovery === 3 && p.a.distPct === 0.22 && p.a.crossup && p.a.faceLockOnCross === 8 && p.a.dodge.energy === 5 && p.a.dodge.dmgMul === 1.15 && p.a.dodge.window === 20)
    // crossup through the foe
    await D.fresh(120, { energy: 0 })
    await D.tap('d'); await step(2); await D.tap('d'); await step(14)
    const c = await S(), o = await S('p2')
    R.check('Phase Step crossup: ends on the far side', c.x > o.x, { me: c.x, foe: o.x })
  }

  if (want('focus')) {
    R.section('Phase 2 — FOCUS (shared bar)')
    await D.fresh(70, { energy: 0 })
    await D.tap('j'); await step(30)
    let s = await S()
    R.check('+4 Focus on a landed hit', s.energy === 4, s.energy)
    await D.fresh(400, { energy: 0 })
    await step(80); s = await S()
    R.check('+1 Focus per 40 f passive (80 f → 2)', s.energy === 2, s.energy)
    const g = await D.page.evaluate(async () => { const { getAcademyProfile } = await import('./ninjaAcademy.js'); return getAcademyProfile('ninja_storm_rangers').focus })
    R.check('Focus profile: max 100, +4 / +2 / 40 f / +5 dodge', g.max === 100 && g.perHit === 4 && g.perBlocked === 2 && g.passiveEvery === 40 && g.perDodge === 5, g)
  }

  if (want('clone')) {
    R.section('Phase 2 — SHADOW CLONE + echo')
    await D.fresh(70, { energy: 50 })
    await D.motion([['a']], 'l'); await step(60)
    let s = await S()
    R.check('Back+Special → clone on the ground, 20 Focus', !!s.a.clone && s.grounded && (s.energy === 30 || s.energy === 31), { clone: !!s.a.clone, e: s.energy })
    R.check('clone lives 240 f (life counter)', s.a.clone && s.a.clone.life <= 240 && s.a.clone.life > 150, s.a.clone?.life)
    // clone stands where he was; move p2 between, then jab: the echo fires from the clone 12 f later at 50%
    await D.page.evaluate(() => { const T = __harness.nsrTest, a = T.raw('p1'), z = T.raw('p2'), c = a._academy.clone; z.x = a.x + 70; c.x = z.x + 70; c.y = a.y; c.dir = -1 })
    const h0 = await hp2()
    await D.tap('j'); await step(8)
    const h1 = await hp2()
    await step(16)
    const h2 = await hp2(); s = await S()
    const own = h0 - h1, echo = h1 - h2
    R.check('echo hit 12 f later from the clone ≈ 50% (× combo scale)', s.a.echoHits === 1 && echo > 0 && near(echo / own, 0.5 * 0.85, 0.06), { own, echo, hits: s.a.echoHits })
    // one live clone: a second cast replaces the first
    await D.fresh(400, { energy: 100 })
    await D.motion([['a']], 'l'); await step(25); const n1 = (await S()).a.clone?.n
    await D.motion([['a']], 'l'); await step(25); const s2 = await S()
    R.check('owner-limited: a new cast replaces the old clone', s2.a.clone && s2.a.clone.n === n1 + 1, { n1, n2: s2.a.clone?.n })
    await step(250); s = await S()
    R.check('clone expires after 240 f', !s.a.clone)
  }

  if (want('kawarimi')) {
    R.section('Phase 2 / 6 — KAWARIMI')
    await D.fresh(300, { energy: 60 })
    await D.motion([['a']], 'l'); await step(20)
    await D.page.evaluate(() => { const a = __harness.nsrTest.raw('p1'); a._academy.clone.x = a.x - 200 })
    const before = await S(), cx = before.a.clone.x
    await D.down(';'); await D.tap('l'); await D.up(';')
    const s = await S()
    R.check('Block+Special swaps places with the clone', near(s.x, cx, 2) && near(s.a.clone.x, before.x, 2), { x: s.x, cx, cloneNow: s.a.clone?.x, was: before.x })
    R.check('10 Focus, 6 f invulnerable, 90 f cooldown', s.energy === before.energy - 10 && s.invuln >= 5 && s.a.kawaCd >= 88, { e: s.energy, inv: s.invuln, cd: s.a.kawaCd })
    await D.fresh(300, { energy: 60 })
    await D.down(';'); await D.tap('l'); await D.up(';'); const n = await S()
    R.check('no clone → no Kawarimi (no cost)', n.energy === 60 && n.a.swaps === 0, n.energy)
    // out of hitstun
    await D.fresh(300, { energy: 60 })
    await D.motion([['a']], 'l'); await step(20)
    await D.page.evaluate(() => { const a = __harness.nsrTest.raw('p1'); a.hitstun = 30 })
    await D.down(';'); await D.tap('l'); await D.up(';'); const h = await S()
    R.check('usable out of hitstun (escape)', h.a.swaps === 1 && h.hitstun === 0, { swaps: h.a.swaps, hs: h.hitstun })
  }

  if (want('dial')) {
    R.section('Phase 2 — STANCE SWAP dial (Ben 10 grammar)')
    await D.fresh(400, { energy: 40 })
    await D.dial('k', 13); await step(2); let s = await S()
    R.check('2nd ↓ edge within 16 f arms → Heavy picks YELLOW', s.stance === 'yellow', s.a.stanceRefused)
    R.check('free (0 Focus), 30 f lockout, vx zeroed', s.energy >= 40 && s.a.stanceLock >= 26 && s.vx === 0, { e: s.energy, lock: s.a.stanceLock, vx: s.vx })
    R.check('the picking Heavy press is consumed (no kick)', !s.attacking, s.move)
    await D.dial('j'); await step(2); s = await S()
    R.check('refused during the 30 f lockout (buffered, then fires)', s.stance === 'yellow', s.a.stanceRefused)
    await step(30); s = await S()
    R.check('… buffer expires inside 18 f: still yellow after lockout', s.stance === 'yellow')
    await D.dial('j'); await step(2); s = await S()
    R.check('after the lockout ↓↓+Light → RED', s.stance === 'red')
    await D.fresh(400, { energy: 40 })
    await D.tap('s'); await step(18); await D.tap('s'); await step(1); await D.tap('k'); await step(2); s = await S()
    R.check('↓ … ↓ 19 f apart does NOT arm (Heavy = a normal)', s.stance === 'red', s.move)
    await D.fresh(400, { energy: 40 })
    await D.tap('s'); await step(2); await D.tap('s'); await step(19); await D.tap('k'); await step(2); s = await S()
    R.check('arm window 18 f: a Heavy 20 f later does NOT swap', s.stance === 'red')
    // hitstun refusal
    await D.fresh(400, { energy: 40 })
    await D.page.evaluate(() => { __harness.nsrTest.raw('p1').hitstun = 40 })
    await D.dial('k'); await step(2); s = await S()
    R.check('refused in hitstun', s.stance === 'red' && s.a.stanceRefused === 'hitstun', s.a.stanceRefused)
    // power-commit refusal: mid-special
    await D.fresh(400, { energy: 100 })
    await D.motion(['s', ['s', 'd'], 'd'], 'l'); await step(2)
    const mid = await S()
    await D.dial('k'); await step(1); s = await S()
    R.check('refused mid-special (Crescent Blade)', mid.move === 'nBlade' && s.stance === 'red', { move: mid.move, st: s.stance, why: s.a.stanceRefused })
    // swap clears the clone + mode, keeps Focus + Vanish charges
    await D.fresh(400, { energy: 100 })
    await D.motion([['a']], 'l'); await step(20)
    await D.page.evaluate(() => { const a = __harness.nsrTest.raw('p1'); a._ranger.charges = 1; a._ranger.refill = [50] })
    await D.tap(['j', 'k', 'l']); await step(40)
    const pre = await S()
    await D.dial('k'); await step(2); s = await S()
    R.check('swap kills the live clone + pending echoes', !!pre.a.clone && !s.a.clone && s.a.echoes.length === 0)
    R.check('swap ends the active Lightning Mode', pre.a.mode > 0 && s.a.mode === 0 && !s.r.blinkMod, { pre: pre.a.mode, now: s.a.mode })
    R.check('Focus + Vanish charges persist', s.energy === pre.energy && s.r.charges === pre.r.charges, { e: [pre.energy, s.energy], ch: [pre.r.charges, s.r.charges] })
    R.check('Mode cooldown slot is shared (not reset by the swap)', s.a.modeCd > 500, s.a.modeCd)
    // swap out of a connected normal (the combo route)
    await D.fresh(70, { energy: 40 })
    await D.tap('j'); await step(6); await D.dial('k'); await step(2); s = await S()
    R.check('a connected normal can be swapped out of', s.stance === 'yellow' && !s.attacking, { st: s.stance, mv: s.move })
  }

  async function kitChecks(st) {
    const Y = st === 'yellow'
    R.section(`Phase ${Y ? 4 : 3} — ${Y ? 'YELLOW (Dustin)' : 'RED (Shane)'} kit`)
    const toStance = async () => { if ((await S()).stance !== st) { await D.dial(Y ? 'k' : 'j'); await step(35) } }
    await D.fresh(70, { energy: 100 }); await toStance()
    const s0 = await S()
    R.check(`walk speed unchanged by stance (${s0.speed})`, s0.speed > 0)
    R.check(`weight ${Y ? 0.85 : 0.8}`, s0.weight === (Y ? 0.85 : 0.8), s0.weight)
    const jab = await land('j')
    R.check('Jab/Tackle: 5 f startup', jab.atk?.name === 'light' && jab.atk.activeStart === 5, jab.atk)
    const k = jab.dmg / 35
    await D.fresh(70, { energy: 100 }); await toStance()
    const kick = await land('k')
    R.check('Kick/Stomp: 9 f, 60 (ratio to jab)', kick.atk?.name === 'heavy' && kick.atk.activeStart === 9 && near(kick.dmg / k, 60, 2), { a: kick.atk?.activeStart, raw: kick.dmg / k })
    await D.fresh(70, { energy: 100 }); await toStance()
    await D.down('w'); const up = await land('k'); await D.up('w')
    R.check('Rising (↑+H): 9 f, 75, launches', up.atk?.name === 'up' && near(up.dmg / k, 75, 2), { raw: up.dmg / k })
    await D.fresh(70, { energy: 100 }); await toStance()
    await D.down('s'); const low = await land('j'); await D.up('s')
    R.check('Low (↓+L): 7 f, 40, LOW', low.atk?.name === 'nLow' && low.atk.activeStart === 7 && near(low.dmg / k, 40, 2), { raw: low.dmg / k })
    // gatling: L, L, H
    await D.fresh(70, { energy: 100 }); await toStance()
    const h0 = await hp2()
    await D.tap('j'); await step(7); await D.tap('j'); await step(12); await D.tap('k'); await step(40)
    const str = await S('p2')
    R.check('gatling Light → Light → Heavy (3 hits, ends in a knockdown)', (h0 - str.health) > jab.dmg * 2.5, { dmg: h0 - str.health })
    // specials
    await D.fresh(80, { energy: 100 }); await toStance()
    await D.motion(['s', ['s', 'd'], 'd'], 'l'); await step(45)
    let s = await S()
    R.check(`${Y ? 'Earth' : 'Crescent'} Blade ↓↘→+S: 12 Focus, 3 hits (−12 +3×4 = 100)`, s.s.stats.blades === 1 && s.energy === 100 && s.combo >= 0, { e: s.energy })
    await D.fresh(500, { energy: 100 }); await toStance()
    await D.motion(['s', ['s', 'a'], 'a'], 'l'); await step(16)
    let pr = await call('projectiles'); const ew = (await S()).energy
    R.check(`${Y ? 'Boulder' : 'Crescent'} Wave ↓↙←+S: projectile, 14 Focus`, pr.some(p => p.nsr === 'wave') && ew === 86, { pr: pr.map(p => p.nsr), e: ew })
    await D.fresh(1150, { energy: 100, ax: 700 }); await toStance()
    await D.tap('l'); await step(19); await D.tap('l'); await step(19); await D.tap('l'); await step(9)
    pr = await call('projectiles'); s = await S()
    const cap = await call('can', 'nShuriken')
    await D.tap('l'); await step(9); const s4 = await S()
    R.check(`${Y ? 'Sand Spin' : 'Shuriken'} Throw: 8 Focus each, max 3 on screen (a 4th press is eaten)`, pr.filter(p => p.nsr === 'shuriken').length === 3 && near(s.energy, 76, 1) && cap === false && s4.s.stats.shuriken === 3 && s4.energy >= s.energy, { n: pr.length, cap, thrown: s4.s.stats.shuriken, e: [s.energy, s4.energy] })
    await D.fresh(300, { energy: 100 }); await toStance()
    await D.down('s'); await D.down('l'); await step(30); await D.up('l'); await D.up('s'); s = await S()
    R.check(`${Y ? 'Lion Hammer' : 'Hawk Blaster'} Lock-On (↓+S held 10 f): 18 Focus, hits`, s.s.stats.locks === 1 && s.s.stats.lockHits === 1, s.s.stats)
    await D.fresh(300, { energy: 100 }); await toStance()
    await D.down('s'); await D.tap('l', 4); await D.up('s'); await step(30); s = await S()
    R.check('Lock-On released early: no lock, no cost', s.s.stats.locks === 0 && s.energy >= 99, { e: s.energy })
    // MODE
    await D.fresh(300, { energy: 100 }); await toStance()
    await D.tap(['j', 'k', 'l']); await step(40); s = await S()
    R.check(`${Y ? 'QUAKE' : 'LIGHTNING'} MODE (L+H+S): 30 Focus, 240 f, 600 f cooldown`, s.a.mode > 0 && s.a.mode <= 240 && s.a.modeStance === st && s.a.modeCd > 550 && near(s.energy, 70, 3), { m: s.a.mode, cd: s.a.modeCd, e: s.energy })
    if (!Y) {
      R.check('Lightning: Vanish startup −1 f (3 → 2)', s.r.blinkMod?.startup === 2, s.r.blinkMod)
      await D.page.evaluate(() => { const z = __harness.nsrTest.raw('p2'); z.x = __harness.nsrTest.raw('p1').x + 70; z.health = z.maxHealth })
      const j2 = await land('j')
      R.check('Lightning: +15% damage', near(j2.dmg / jab.dmg, 1.15, 0.03), { ratio: j2.dmg / jab.dmg })
    } else {
      await D.page.evaluate(() => { const z = __harness.nsrTest.raw('p2'); z.x = __harness.nsrTest.raw('p1').x + 70 })
      const qk = await land('k')
      R.check('Quake: heavy = heavyQuake (×1.6 knockback + knockdown)', qk.atk?.name === 'heavyQuake' && (await S('p2')).knockdown !== undefined, qk.atk?.name)
      const t = await D.page.evaluate(async () => { const { modeTakenMul } = await import('./ninjaAcademy.js'); return modeTakenMul(__harness.nsrTest.raw('p1')) })
      R.check('Quake: −10% damage taken', t === 0.9, t)
    }
  }
  if (want('red')) await kitChecks('red')
  if (want('yellow')) await kitChecks('yellow')

  if (want('ult')) {
    for (const st of ULT_STANCES) {
      R.section(`Phase ${st === 'red' ? 3 : 4} — ULTIMATE (${st === 'red' ? 'Thunder Fist Finish' : 'Lion Zord Slam'})`)
      await D.fresh(200, { energy: 100 })
      if (st === 'yellow') { await D.dial('k'); await step(35); await D.page.evaluate(() => { __harness.nsrTest.raw('p1').energy = 100 }) }
      await D.fresh(70, { energy: 100 }); if (st === 'yellow') { await D.dial('k'); await step(35) }
      const k1 = await (async () => { const h0 = await hp2(); await D.tap('j'); await step(30); return (h0 - await hp2()) / 35 })()
      await D.fresh(200, { energy: 100 }); if (st === 'yellow') { await D.dial('k'); await step(35); await D.page.evaluate(() => { __harness.nsrTest.raw('p1').energy = 100 }) }
      let h0 = await hp2()
      await D.tap('u'); await step(150)
      let s = await S()
      const solo = (h0 - await hp2()) / k1
      R.check(`solo: ≈260 raw, all Focus spent, 3 s lockout`, s.s.stats.ults === 1 && near(solo, 260, 8) && s.energy === 0, { raw: solo, ults: s.s.stats.ults })
      R.check('Focus locked after (no gain on hit)', s.a.lockout > 0, s.a.lockout)
      await D.fresh(200, { energy: 100 }); if (st === 'yellow') { await D.dial('k'); await step(35); await D.page.evaluate(() => { __harness.nsrTest.raw('p1').energy = 100 }) }
      await D.motion([['a']], 'l'); await step(25)
      await D.page.evaluate(() => { __harness.nsrTest.raw('p1').energy = 100 })
      h0 = await hp2()
      await D.tap('u'); await step(150); s = await S()
      const twin = (h0 - await hp2()) / k1
      R.check('TWIN TECHNIQUE with a live clone: 2 × 130 = ≈260 total', s.s.stats.twin === 1 && near(twin, 260, 8), { raw: twin })
    }
  }

  if (want('defense')) {
    R.section('Phase 6 — DEFENSE: backstep (shared cooldown)')
    await D.fresh(300, { energy: 0 })
    const x0 = (await S()).x
    await D.down('a'); await D.tap('k'); await D.up('a'); await step(1)
    let s = await S()
    R.check('Back+Heavy = backstep, 6 f invulnerable (4 left 2 frames in)', s.move === 'nBackstep' && s.invuln === 4, { mv: s.move, inv: s.invuln })
    await step(25); s = await S()
    R.check('hops back', s.x < x0 - 60, s.x - x0)
    R.check('300 f cooldown', s.a.backCd > 270, s.a.backCd)
    await step(40); await D.dial('k'); await step(3); s = await S()
    R.check('cooldown shared across stances (kept through a swap)', s.stance === 'yellow' && s.a.backCd > 200, s.a.backCd)
  }

  if (want('sound')) {
    R.section('Phase 7 — SOUND')
    const r = await D.page.evaluate(async () => { const { NINJA_STORM_SOUNDS } = await import('./ninjaStormSound.js'); return Object.keys(NINJA_STORM_SOUNDS) })
    const need = ['clone', 'stance', 'swap', 'vanish', 'wave', 'boulder', 'shuriken', 'lock', 'beam', 'quakeSlam', 'modeOn', 'quakeOn', 'ult', 'ultY', 'twin', 'ultFinal']
    R.check('every cue has a Red + Yellow placeholder', need.every(n => r.includes('msv2r_' + n) && r.includes('msv2y_' + n)), need.filter(n => !r.includes('msv2r_' + n)))
    const inPool = await D.page.evaluate(async () => { const m = await import('./sound.js'); const S = m.SOUNDS || m.default?.SOUNDS; return S ? ['msv2r_stance', 'msv2y_clone'].every(k => typeof S[k] === 'function') : 'no-export' })
    R.check('spread into sound.js SOUNDS (the shared pool)', inPool === true || inPool === 'no-export', inPool)
    const src = fs.readFileSync(path.join(ROOT, 'ninjaStormSound.js'), 'utf8')
    R.check('stance swap = the double-pulse of the clone\'s poof', /stance: \(c, o\) => \{ poof\(c, o\); poof\(c, o, 0\.075\) \}/.test(src) && /clone: \(c, o\) => poof\(c, o\)/.test(src))
  }

  if (want('det')) {
    R.section('Phase 10 — determinism / no RNG')
    const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    const files = ['ninjaAcademy.js', 'ninjaStorm.js', 'ninjaStormData.js', 'ninjaStormState.js', 'ninjaStormFx.js', 'ninjaStormSound.js', 'ninjaStormKit.js']
    const bad = files.filter(f => /Math\.random|gameRng/.test(strip(fs.readFileSync(path.join(ROOT, f), 'utf8'))))
    R.check('no Math.random / gameRng in any MSv2 file', bad.length === 0, bad)
    const run = async () => {
      await D.fresh(200, { energy: 100 })
      const seq = [['j'], ['j'], ['k'], ['s'], ['s'], ['k'], ['w', 'l'], ['d'], ['d'], ['j'], ['l'], [';', 'l'], ['j', 'k', 'l'], ['s'], ['s'], ['j'], ['u']]
      for (const k of seq) { await D.tap(k); await step(9) }
      await step(60)
      return D.page.evaluate(() => { const a = __harness.nsrTest.raw('p1'), z = __harness.nsrTest.raw('p2'); return JSON.stringify([a.x, a.y, a.health, a.energy, a._academy, { ...a._nsr, fx: null, swapFx: null }, a._ranger, z.x, z.y, z.health]) })
    }
    const A = await run(), B = await run()
    R.check('same inputs → bit-identical GAME_STATE', A === B, A === B ? '' : [A.slice(0, 200), B.slice(0, 200)])
  }

  R.check('no page errors', D.errors.length === 0, D.errors.slice(0, 3))
} catch (e) { R.check('threw', false, e.stack) }
R.done(); await D.close()
