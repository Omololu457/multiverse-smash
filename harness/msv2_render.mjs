// harness/msv2_render.mjs — MSv2 RENDER CHECK (run before every push). Real game loop, real key input.
//   node harness/msv2_render.mjs [outdir]
// ONE roster entry "Ninja Storm Rangers" → match (boots Red / Shane) → fighter + HUD render → swap to Yellow / Dustin and
// back → Ninja Vanish → Shadow Clone → Kawarimi → a special landed in each stance → each stance's Mode → each stance's
// Ultimate → no page error, no black screen, no 404. Screenshots → docs/ninja_storm_rangers/screenshots/.
import fs from 'node:fs'
import path from 'node:path'
import { launch, reporter } from './msv2_lib.mjs'
const OUT = process.argv[2] || 'docs/ninja_storm_rangers/screenshots'; fs.mkdirSync(OUT, { recursive: true })
const R = reporter('MSv2 RENDER CHECK'), D = await launch()
const missing = []
const pixels = () => D.page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'); const u = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data, s = new Set(); let lit = 0; for (let i = 0; i < d.length; i += 16) { s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); if (d[i] + d[i + 1] + d[i + 2] > 60) lit++ } return { uniq: s.size, lit: lit / (d.length / 16) } }; return { play: u(0, c.height * 0.3, c.width, c.height * 0.6), hud: u(0, 0, c.width, Math.round(c.height * 0.16)) } })
const shot = async (name, label) => {
  const p = await pixels()
  R.check(`${label}: not a black screen, HUD drawn`, p.play.uniq > 40 && p.play.lit > 0.2 && p.hud.uniq > 20, { play: p.play.uniq, lit: +p.play.lit.toFixed(2), hud: p.hud.uniq })
  await D.page.screenshot({ path: path.join(OUT, `MSV2_${name}.png`) })
}
const hp2 = async () => (await D.S('p2')).health
try {
  // ── ONE roster entry ──────────────────────────────────────────────────────────────────────────────────────────────
  const roster = await (async () => {
    await D.boot('ninja_storm_rangers', 'spd_red')
    D.page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
    return D.page.evaluate(async () => {
      const C = (await import('./characters.js')).characters
      const vis = Object.entries(C).filter(([, c]) => c && c.isPlayable !== false && !c.hidden)
      return { mine: vis.filter(([k, c]) => /ninja storm rangers/i.test(c.name || '') || k === 'ninja_storm_rangers').map(([k, c]) => [k, c.name, c.title]),
        ok: !!C.ninja_storm_rangers && !C.ninja_storm_rangers.hidden, spd: !!C.spd_red, tag: C.ninja_storm_rangers?.tagline }
    })
  })()
  R.check('exactly ONE selectable roster entry "Ninja Storm Rangers" (not two)', roster.ok && roster.mine.length === 1 && roster.mine[0][1] === 'Ninja Storm Rangers', roster.mine)
  R.check('tagline "Ninja Storm, ranger form!"', roster.tag === 'Ninja Storm, ranger form!', roster.tag)
  let s = await D.S(), z = await D.S('p2')
  R.check('match starts in RED / Shane stance', s.key === 'ninja_storm_rangers' && s.stance === 'red' && /ninja_storm\/red/.test(s.sheet || ''), { stance: s.stance, sheet: s.sheet })
  R.check('fighter drawn, both alive', s.health > 0 && z.health > 0 && !!s.action, { hp: [s.health, z.health], action: s.action })
  await shot('01_boot_red', 'boot (Red)')
  // ── stance dial ────────────────────────────────────────────────────────────────────────────────────────────────────
  await D.fresh(300); await D.dial('k'); await D.step(8); s = await D.S()
  R.check('↓↓ + Heavy → YELLOW / Dustin (yellow sheet, weight 0.85)', s.stance === 'yellow' && /ninja_storm\/yellow/.test(s.sheet || '') && s.weight === 0.85, { st: s.stance, w: s.weight })
  await shot('02_yellow', 'Yellow stance')
  await D.step(30); await D.dial('j'); await D.step(8); s = await D.S()
  R.check('↓↓ + Light → back to RED / Shane', s.stance === 'red' && /ninja_storm\/red/.test(s.sheet || ''), s.stance)
  // ── Ninja Vanish ───────────────────────────────────────────────────────────────────────────────────────────────────
  await D.fresh(300); const x0 = (await D.S()).x
  await D.tap('d'); await D.step(2); await D.tap('d')
  const v = await D.until(q => !!q.r?.blink, 10); await D.step(2); await shot('03_vanish', 'Ninja Vanish')
  await D.settle(); s = await D.S()
  R.check('Ninja Vanish (double-tap →) fires and travels', !!v && s.x - x0 > 200, { moved: Math.round(s.x - x0) })
  // ── Shadow Clone + Kawarimi ────────────────────────────────────────────────────────────────────────────────────────
  await D.fresh(200, { energy: 100 }); await D.down('a'); await D.tap('l'); await D.up('a'); await D.step(20); s = await D.S()
  R.check('Shadow Clone (← + Special) summoned', !!s.a?.clone && s.energy <= 81, { clone: !!s.a?.clone, e: s.energy })
  await shot('04_clone', 'Shadow Clone')
  const cx = s.a.clone.x
  await D.step(10); await D.down(';'); await D.tap('l'); await D.up(';'); await D.step(4); s = await D.S()
  R.check('Kawarimi (Block + Special) swaps places with the clone', s.s?.stats?.swaps === 1 && Math.abs(s.x - cx) < 4, { swaps: s.s?.stats?.swaps, x: Math.round(s.x), cloneWas: Math.round(cx) })
  await shot('05_kawarimi', 'Kawarimi')
  // ── a special landed in each stance + each stance's Mode + each stance's Ultimate ────────────────────────────────
  for (const st of ['red', 'yellow']) {
    const toSt = async () => { if (st === 'yellow') { await D.dial('k'); await D.step(35) } }
    await D.fresh(70, { energy: 100 }); await toSt(); await D.call('energy', 'p1', 100)
    let h = await hp2(); await D.motion(['s', ['s', 'd'], 'd'], 'l'); await D.step(10); await shot(`06_special_${st}`, `${st} special`); await D.step(30)
    s = await D.S(); R.check(`${st}: ${st === 'red' ? 'Crescent' : 'Earth'} Blade (↓↘→ + Special) lands`, s.s.stats.blades === 1 && (await hp2()) < h, { dmg: h - await hp2() })
    await D.fresh(300, { energy: 100 }); await toSt(); await D.call('energy', 'p1', 100)
    await D.tap(['j', 'k', 'l']); await D.step(40); s = await D.S()
    R.check(`${st}: ${st === 'red' ? 'LIGHTNING' : 'QUAKE'} MODE (L + H + S) pops`, !!s.a?.mode && s.a.modeStance === st, { mode: s.a?.mode, ms: s.a?.modeStance })
    await shot(`07_mode_${st}`, `${st} Mode`)
    await D.fresh(200, { energy: 100 }); await toSt(); await D.call('energy', 'p1', 100)
    h = await hp2(); await D.tap('u'); await D.step(24); await shot(`08_ult_${st}`, `${st} Ultimate`)
    for (let i = 0; i < 160 && !(await D.S()).s?.stats?.ultHits; i++) await D.step(1)
    s = await D.S(); R.check(`${st}: ${st === 'red' ? 'THUNDER FIST FINISH' : 'LION ZORD SLAM'} lands`, s.s.stats.ults === 1 && s.s.stats.ultHits >= 1 && (await hp2()) < h, { ults: s.s.stats.ults, hits: s.s.stats.ultHits, dmg: h - await hp2() })
  }
  // ── every Ninja Storm sheet loads ──────────────────────────────────────────────────────────────────────────────────
  const assets = await D.page.evaluate(async () => {
    const C = (await import('./characters.js')).characters.ninja_storm_rangers, urls = new Set([C.portrait, C.hudIcon].filter(Boolean))
    for (const A of Object.values(C.animationData)) urls.add(A.sheet)
    const S = await import('./ninjaStormSprites.js'); for (const st of [S.NS_ANIM_RED, S.NS_ANIM_YELLOW, S.NS_FX.red, S.NS_FX.yellow]) for (const A of Object.values(st)) if (A?.sheet) urls.add(A.sheet)
    return Promise.all([...urls].map(u => fetch(u).then(r => [u, r.status])))
  })
  const bad = assets.filter(([, c]) => c !== 200)
  R.check(`all ${assets.length} Ninja Storm sheets load`, assets.length > 100 && !bad.length, bad.slice(0, 4))
  R.check('no Ninja Storm 404s', !missing.filter(u => /ninja_storm|ninjaStorm|ninjaAcademy/.test(u)).length, missing.slice(0, 4))
  R.check('no page errors during the run', D.errors.length === 0, D.errors.slice(0, 3))
} catch (e) { R.check('render check ran to completion', false, e.stack) }
R.done(); await D.close()
