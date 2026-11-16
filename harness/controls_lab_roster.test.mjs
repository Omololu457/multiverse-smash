// harness/controls_lab_roster.test.mjs — CONTROLS LAB × the WHOLE roster.
//   2  every roster fighter loads in the Lab and ANIMATES (its sprite frame advances over 60 logic frames)
//   3  every move of every fighter demos on the dummy and the game's own Academy detector sees the move happen.
//      Moves whose notation needs a setup (a form, a stance, a stage, a marked foe…) are demoed from neutral too;
//      when the detector can't see them from neutral they are listed as "needs setup", not failures.
//   + zero console errors / failed requests across the run
// Writes docs/controls_lab/move_demo_report.json.   node harness/controls_lab_roster.test.mjs [--workers 6] [--only a,b]
import fs from "node:fs"; import path from "node:path"
import { ROOT, startServer, launch, openLab, checker, buckets, gameBaselineErrors, newErrors } from "./controls_lab_common.mjs"

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const WORKERS = +arg("--workers", 6), ONLY = arg("--only", null)
const { server, base } = await startServer()
const browser = await launch()
const baseline = await gameBaselineErrors(browser, base)
const C = checker(), check = C.check

const first = await openLab(browser, base, "goku")
let roster = await first.page.evaluate(() => window.__lab.S.roster.map(r => r.key))
const allErrs = [...first.errs]
await first.page.close()
if (ONLY) roster = roster.filter(k => ONLY.split(",").includes(k))
console.log(`roster: ${roster.length} fighters, ${WORKERS} workers`)

const rows = []
async function worker(keys, wi) {
  if (!keys.length) return
  await new Promise(r => setTimeout(r, wi * 4000))   // stagger page boots
  const { page, errs } = await openLab(browser, base, keys[0])
  for (const key of keys) {
    const row = { key, loaded: false, animated: false, frames: [], moves: [] }
    rows.push(row)
    try {
      row.loaded = await page.evaluate(async k => { await window.__lab.api.selectChar(k); return window.__lab.S.key === k && window.__lab.eng.ready }, key)
      if (!row.loaded) continue
      // animation: idle sprite frame over 60 logic frames
      const an = await page.evaluate(async () => {
        const E = window.__lab.eng; await E.reset({ close: false }); const seen = new Set(), acts = new Set()
        for (let i = 0; i < 60; i++) { await E.frames(1); const p = E.p1(); seen.add(p.spriteFrameIndex ?? p.frameIndex); acts.add(p.spriteAction || p.action) }
        // a 1-frame idle (e.g. isshiki: animationData.idle.frames = 1) can't advance: prove animation with a short walk
        let walk = []
        if (seen.size < 2) { const r = E.controls.p1.right, ws = new Set(); E.forwardKey("keydown", r); for (let i = 0; i < 30; i++) { await E.frames(1); ws.add(E.p1().spriteFrameIndex ?? E.p1().frameIndex) } E.forwardKey("keyup", r); walk = [...ws] }
        const p = E.p1(); return { idx: [...seen], walk, acts: [...acts], hasSprites: !!p.hasSprites, ready: !!p.spriteReady }
      })
      row.frames = an.idx; row.animated = an.idx.length >= 2 || an.walk.length >= 2; row.sprites = an
      // every move
      const n = await page.evaluate(() => window.__lab.S.moves.length)
      for (let i = 0; i < n; i++) {
        // per-move watchdog: a demo that never returns (e.g. the match leaves battle) is recorded, then the fighter reloads
        let timer
        const watchdog = new Promise(res => { timer = setTimeout(() => res({ timeout: true }), 45000) })
        const run = page.evaluate(async i => {
          const L = window.__lab, m = L.S.moves[i]
          const res = await L.api.runMoveDemo(m)
          return { name: m.name, input: m.input, cat: m.cat, unavailable: !!m.unavailable, conditional: !!m.parsed.conditional, unparsed: !!m.parsed.unparsed, fired: !!res?.fired, damage: res?.damage || 0, hits: res?.hits || 0 }
        }, i).catch(e => ({ name: `#${i}`, error: String(e.message || e) }))
        let r = await Promise.race([run, watchdog]); clearTimeout(timer)
        if (r.timeout) {
          const info = await page.evaluate(i => { const L = window.__lab, m = L.S.moves[i]; let gs = null; try { gs = L.eng.h.state().gameState } catch (_) {} return { name: m.name, input: m.input, cat: m.cat, gameState: gs } }, i).catch(() => ({}))
          r = { ...info, error: `demo did not return in 45 s (game state: ${info.gameState})` }
          await page.evaluate(async k => { await window.__lab.api.selectChar(k) }, key).catch(() => {})   // reload the fighter (aborts the stuck script)
        }
        row.moves.push(r)
      }
    } catch (e) { row.error = String(e.message || e) }
    const ok = row.moves.filter(m => m.fired).length
    console.log(`[w${wi}] ${key}: loaded=${row.loaded} animated=${row.animated} moves ${ok}/${row.moves.length} fired`)
  }
  allErrs.push(...errs)
  await page.close()
}
await Promise.all(buckets(roster, WORKERS).map((ks, i) => worker(ks, i)))
await browser.close(); server.close()

// ── verdicts ──────────────────────────────────────────────────────────────────────────────────────────────────
const moves = rows.flatMap(r => r.moves.map(m => ({ char: r.key, ...m })))
const fired = moves.filter(m => m.fired)
const noData = moves.filter(m => !m.fired && m.unavailable)          // the kit lists it; the fighter has no engine data
const setup = moves.filter(m => !m.fired && !m.unavailable && (m.conditional || m.unparsed))
const missed = moves.filter(m => !m.fired && !m.unavailable && !m.conditional && !m.unparsed)
const notLoaded = rows.filter(r => !r.loaded), still = rows.filter(r => r.loaded && !r.animated)
check(`2: every fighter loads in the Lab (${rows.length - notLoaded.length}/${rows.length})`, !notLoaded.length, notLoaded.map(r => r.key).join(", "))
check(`2: every fighter animates over 60 frames (${rows.length - still.length - notLoaded.length}/${rows.length - notLoaded.length})`, !still.length, still.map(r => `${r.key}${r.sprites?.hasSprites === false ? "(no sprites)" : ""}`).join(", "))
check(`3: every move demos (${moves.length} demos, ${moves.filter(m => m.error).length} errors)`, !moves.some(m => m.error), moves.filter(m => m.error).slice(0, 5).map(m => `${m.char}:${m.name} ${m.error}`).join(" | "))
check(`3: every move from neutral is produced in the engine (${fired.length} fired, ${setup.length} need a setup, ${noData.length} not in engine data, ${missed.length} missed)`, !missed.length, missed.slice(0, 12).map(m => `${m.char}:${m.name} [${m.input}]`).join(" | "))
check(`zero console errors and zero failed requests added by the Lab (main game baseline: ${baseline.size} pre-existing)`, !newErrors(allErrs, baseline).length, newErrors(allErrs, baseline).slice(0, 8).join(" || "))

fs.mkdirSync(path.join(ROOT, "docs", "controls_lab"), { recursive: true })
const REP = path.join(ROOT, "docs", "controls_lab", "move_demo_report.json")
if (ONLY) {   // a partial rerun MERGES into the full report: replace only the fighters it ran
  let prev = null; try { prev = JSON.parse(fs.readFileSync(REP, "utf8")) } catch (_) {}
  if (prev?.rows) { const ran = new Set(rows.map(r => r.key)); rows.unshift(...prev.rows.filter(r => !ran.has(r.key))) }
}
const all = rows.flatMap(r => r.moves.map(m => ({ char: r.key, ...m })))
const A = { fired: all.filter(m => m.fired), noData: all.filter(m => !m.fired && m.unavailable), setup: all.filter(m => !m.fired && !m.unavailable && (m.conditional || m.unparsed)), missed: all.filter(m => !m.fired && !m.unavailable && !m.conditional && !m.unparsed) }
fs.writeFileSync(REP, JSON.stringify({
  date: new Date().toISOString().slice(0, 10), characters: rows.length, loaded: rows.filter(r => r.loaded).length, animated: rows.filter(r => r.animated).length,
  moves: all.length, fired: A.fired.length, notInEngineData: A.noData.map(m => `${m.char}: ${m.name} [${m.input}]`), needsSetup: A.setup.map(m => `${m.char}: ${m.name} [${m.input}]`), missed: A.missed.map(m => `${m.char}: ${m.name} [${m.input}]`),
  notAnimated: rows.filter(r => r.loaded && !r.animated).map(r => ({ key: r.key, frames: r.frames, sprites: r.sprites })), errors: newErrors(allErrs, baseline), gameBaselineErrors: [...baseline],
  rows: rows.map(r => ({ key: r.key, loaded: r.loaded, animated: r.animated, frames: r.frames, sprites: r.sprites, moves: r.moves })),
}, null, 1) + "\n")
console.log(`\ncontrols_lab_roster: ${C.pass} passed, ${C.fail} failed`)
process.exit(C.fail ? 1 : 0)
