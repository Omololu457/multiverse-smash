// tools/controls_lab/build_combos.mjs — DISCOVER + VERIFY the Combo Library in the real engine.
//   node tools/controls_lab/build_combos.mjs <repoRoot> [--workers 6] [--only key,key] [--max 5]
// For every roster fighter: try the routes documented in docs/<char>/COMBOS.md (combo_candidates.json) and generic
// chains of the fighter's own moves; search the press timing from the moves' frame data; keep a combo only if it
// verifies TWICE (every step lands its own hit, the combo counter matches, the dummy never gets a free frame).
// Writes controls_lab/combos.json (verified only) + docs/controls_lab/combo_build_report.json (all attempts).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { stepOf } from "../../controls_lab/combos.js"

const ROOT = path.resolve(process.argv[2] || ".")
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const WORKERS = +arg("--workers", 6), ONLY = arg("--only", null), MAX = +arg("--max", 5), TURBO = +arg("--turbo", 8)
const TODAY = arg("--date", new Date().toISOString().slice(0, 10))
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DOC = JSON.parse(fs.readFileSync(path.join(HERE, "combo_candidates.json"), "utf8"))
const GENERIC = [
  ["Light", "Heavy", "Special"], ["Light", "Light", "Heavy"], ["Up-Attack", "Jump", "Light"], ["Light", "Up-Attack"],
  ["Down + Light", "Heavy"], ["Light", "Heavy"], ["Heavy", "Special"], ["Light", "Down + Special"], ["Light", "Special"], ["Light", "Light"],
]

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".webp": "image/webp", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const BASE = `http://127.0.0.1:${server.address().port}/controls.html`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })

// roster from a first page
const p0 = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await p0.goto(`${BASE}?char=goku`); await p0.waitForFunction(() => window.__lab?.eng.ready, null, { timeout: 60000 })
let roster = await p0.evaluate(() => window.__lab.eng.roster().map(r => r.key))
await p0.close()
if (ONLY) roster = roster.filter(k => ONLY.split(",").includes(k))
if (process.argv.includes("--reverify")) { const have = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "controls_lab", "combos.json"), "utf8")).combos.map(c => c.char)); roster = roster.filter(k => have.has(k)) }

const dirsOf = s => (s.dirs || []).filter(d => d !== 5)   // "↓·↓" (neutral between) is the same input as "↓↓"
const sameStep = (a, b) => (a.kind === b.kind || (dirsOf(a).length > 1) === (dirsOf(b).length > 1)) && JSON.stringify((a.buttons || []).slice().sort()) === JSON.stringify((b.buttons || []).slice().sort()) && JSON.stringify(dirsOf(a)) === JSON.stringify(dirsOf(b))
// a plain normal (Light / Heavy / Up-Attack, optionally with one held direction) is universal: the engine decides
const isNormal = st => st.kind === "press" && (st.buttons || []).length === 1 && ["light", "heavy", "upAttack"].includes(st.buttons[0]) && dirsOf(st).length <= 1
function frameDataFor(moves, notation) {
  const st = stepOf(notation)
  const m = moves.find(m => !m.air && m.steps.length === 1 && sameStep(m.steps[0], st)) || moves.find(m => !m.air && m.steps.length && sameStep(m.steps[0], st))
  return m || null
}
function gapCandidates(fd) {
  const S = fd?.startup ?? 6, A = fd?.active ?? 3, R = fd?.recovery ?? 12
  const c = [S + A + R - 8, S + 2, S + A + R - 3, 6, 9, 13, 18, 24]
  return [...new Set(c.map(g => Math.max(3, Math.min(40, Math.round(g)))))]
}
function nameFor(steps, moves) {
  return steps.map(s => s === "Jump" ? "jump" : (frameDataFor(moves, s)?.name || s)).join(" → ")
}
function difficultyFor(steps) {
  let d = 1 + Math.max(0, steps.length - 2)
  for (const s of steps) { const st = stepOf(s); if (st.kind === "motion") d++; if (st.kind === "jump") d++ }
  return Math.max(1, Math.min(5, d))
}

const results = [], report = []
// --reverify: re-run every combo already in combos.json (for the fighters in this run) from a clean reset at 1x;
// keep it only if two runs agree exactly, and store the measured hits / per-step counter / damage.
const REVERIFY = process.argv.includes("--reverify")
let existing = []; try { existing = JSON.parse(fs.readFileSync(path.join(ROOT, "controls_lab", "combos.json"), "utf8")).combos || [] } catch (_) {}
async function reverifyWorker(keys, wi) {
  if (!keys.length) return
  await new Promise(r => setTimeout(r, wi * 4000))
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto(`${BASE}?char=${keys[0]}`, { waitUntil: "domcontentloaded", timeout: 120000 })
  await page.waitForFunction(() => window.__lab?.eng.ready, null, { timeout: 120000 })
  for (const key of keys) {
    await page.evaluate(async k => { await window.__lab.api.selectChar(k) }, key)
    for (const c of existing.filter(c => c.char === key)) {
      const base = { char: c.char, steps: c.steps, gaps: c.gaps }
      const a = await page.evaluate(c => window.__lab.api.verifyCombo(c, { expect: false }), base)
      const b = a.ok ? await page.evaluate(c => window.__lab.api.verifyCombo(c), { ...base, hits: a.comboCounter }) : null
      if (a.ok && b?.ok && b.damage === a.damage && JSON.stringify(b.hitsAt) === JSON.stringify(a.hitsAt)) {
        results.push({ ...c, hits: b.comboCounter, hitsAt: b.hitsAt, damage: b.damage, verified: TODAY })
        report.push({ char: key, steps: c.steps, source: c.source, verified: true, hits: b.comboCounter, damage: b.damage, reverified: true })
      } else report.push({ char: key, steps: c.steps, source: c.source, rejected: `re-verify from a clean reset: ${a.reason || b?.reason || `runs differ (${a.damage} vs ${b?.damage} dmg)`}` })
    }
    console.log(`[w${wi}] ${key}: re-verified`)
  }
  await page.close()
}
async function worker(keys, wi) {
  if (REVERIFY) return reverifyWorker(keys, wi)
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on("pageerror", e => report.push({ worker: wi, pageerror: e.message }))
  await page.goto(`${BASE}?char=${keys[0] || "goku"}`)
  await page.waitForFunction(() => window.__lab?.eng.ready, null, { timeout: 60000 })
  for (const key of keys) {
    const t0 = Date.now()
    const okLoad = await page.evaluate(async k => { await window.__lab.api.selectChar(k); return window.__lab.S.key === k && window.__lab.eng.ready }, key).catch(() => false)
    if (!okLoad) { report.push({ char: key, error: "failed to load in the Lab" }); continue }
    const info = await page.evaluate(k => {
      const L = window.__lab, r = L.api.buildMoves(k)
      return { energy: r.kit?.energy || "meter", moves: r.moves.map(m => ({ name: m.name, input: m.input, cat: m.cat, air: m.parsed.air, steps: m.parsed.steps, startup: m.startup, active: m.active, recovery: m.recovery, cost: m.cost })) }
    }, key)
    const cands = [...(DOC[key] || []).map(d => ({ ...d, source: `docs/${d.doc || key}/COMBOS.md` })), ...GENERIC.map(steps => ({ steps, source: "generated (frame-data chain)" }))]
    let kept = 0
    // PRE-FILTER: a grounded step that cannot land a hit on its own from close range can't start or extend a combo;
    // test each one once (turbo) and drop every candidate that uses a dead step, before any timing search.
    const alone = {}
    const turboVerify = c => page.evaluate(async ([c, t]) => { const E = window.__lab.eng; E.turbo = t; try { return await window.__lab.api.verifyCombo(c, { expect: false }) } finally { E.turbo = 1 } }, [c, TURBO]).catch(e => ({ ok: false, reason: String(e.message || e) }))
    for (const cand of cands) cand.steps.forEach((s, i) => { if (s !== "Jump" && cand.steps[i - 1] !== "Jump" && !(s in alone)) alone[s] = null })
    for (const s of Object.keys(alone)) {
      if (!frameDataFor(info.moves, s) && !isNormal(stepOf(s))) { alone[s] = false; continue }
      alone[s] = (await turboVerify({ char: key, steps: [s], gaps: [0], tail: 40 })).ok
    }
    for (const cand of cands) {
      if (kept >= MAX) break
      // every step must exist in this fighter's move list (Jump is universal)
      if (cand.steps.some(s => s !== "Jump" && !frameDataFor(info.moves, s) && !isNormal(stepOf(s)))) { report.push({ char: key, steps: cand.steps, rejected: "a step is not in this fighter's move list" }); continue }
      if (results.some(r => r.char === key && JSON.stringify(r.steps) === JSON.stringify(cand.steps))) continue
      const dead = cand.steps.find((s, i) => s !== "Jump" && cand.steps[i - 1] !== "Jump" && alone[s] === false)
      if (dead) { report.push({ char: key, steps: cand.steps, source: cand.source, rejected: `${dead} does not hit on its own from close range` }); continue }
      const gaps = [0]; let last = null, failed = false
      for (let i = 1; i < cand.steps.length; i++) {
        const prev = cand.steps[i - 1]
        const tries = prev === "Jump" ? [6, 8, 10, 12, 4] : gapCandidates(frameDataFor(info.moves, prev))
        let found = false
        for (const g of tries) {
          const c = { char: key, steps: cand.steps.slice(0, i + 1), gaps: [...gaps, g], tail: 40 }
          last = await turboVerify(c)
          if (last.ok) { gaps.push(g); found = true; break }
        }
        if (!found) { failed = true; break }
      }
      if (failed || !last?.ok) { report.push({ char: key, steps: cand.steps, source: cand.source, rejected: last?.reason || "did not connect" }); continue }
      // CONFIRM at real 1x speed, twice (the search ran in turbo): run 1 measures, run 2 must match it exactly
      const real = await page.evaluate(c => window.__lab.api.verifyCombo(c, { expect: false }), { char: key, steps: cand.steps, gaps })
      if (!real.ok) { report.push({ char: key, steps: cand.steps, source: cand.source, rejected: `failed at real speed: ${real.reason}` }); continue }
      const c = { char: key, steps: cand.steps, gaps, hits: real.comboCounter }
      const again = await page.evaluate(c => window.__lab.api.verifyCombo(c), c)
      if (!again.ok || again.damage !== real.damage) { report.push({ char: key, steps: cand.steps, source: cand.source, rejected: `re-verify differed: ${again.reason || `damage ${real.damage} vs ${again.damage}`}` }); continue }
      const cost = cand.steps.reduce((t, s) => t + (s !== "Jump" ? (frameDataFor(info.moves, s)?.cost || 0) : 0), 0)
      const notes = []
      if (cand.note) notes.push(cand.note)
      if (cost > 0) notes.push(`uses ${cost} ${info.energy}`)
      if (cand.steps.includes("Jump")) notes.push("jump right as the launcher connects")
      const entry = {
        id: `${key}:${cand.steps.join(">").replace(/\s+/g, "")}`, char: key, name: cand.name || nameFor(cand.steps, info.moves),
        steps: cand.steps, gaps, hits: again.comboCounter, hitsAt: again.hitsAt, damage: again.damage,
        difficulty: difficultyFor(cand.steps), note: notes.join(" · "), verified: TODAY, status: "verified", source: cand.source,
      }
      results.push(entry); kept++
      report.push({ char: key, steps: cand.steps, source: cand.source, verified: true, hits: entry.hits, damage: entry.damage })
    }
    console.log(`[w${wi}] ${key}: ${kept} verified (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
  }
  await page.close()
}
const parts = Array.from({ length: WORKERS }, () => [])
roster.forEach((k, i) => parts[i % WORKERS].push(k))
await Promise.all(parts.map((ks, i) => ks.length ? worker(ks, i) : null))
await browser.close(); server.close()

results.sort((a, b) => a.char.localeCompare(b.char) || (a.source.startsWith("docs") ? -1 : 1) - (b.source.startsWith("docs") ? -1 : 1) || b.hits - a.hits)
const outCombos = path.join(ROOT, "controls_lab", "combos.json")
// MERGE: keep every entry for fighters not in this run, and hand-written entries (any other `source`) for all fighters
let prev = []; try { prev = JSON.parse(fs.readFileSync(outCombos, "utf8")).combos || [] } catch (_) {}
const ran = new Set(roster), generated = c => /^(docs\/|generated)/.test(c.source || "")
const kept = prev.filter(c => !ran.has(c.char) || !generated(c)).filter(c => !results.some(r => r.id === c.id))
const merged = [...kept, ...results].sort((a, b) => a.char.localeCompare(b.char))
fs.writeFileSync(outCombos, JSON.stringify({ version: 1, generated: TODAY, note: "Every entry was verified in the real engine (tools/controls_lab/build_combos.mjs). Add your own: same shape, status \"verified\" after harness/controls_lab_combos.test.mjs passes.", combos: merged }, null, 1) + "\n")
fs.mkdirSync(path.join(ROOT, "docs", "controls_lab"), { recursive: true })
// the report is merged the same way: entries for fighters outside this run are kept
const repPath = path.join(ROOT, "docs", "controls_lab", "combo_build_report.json")
let prevRep = []; try { prevRep = JSON.parse(fs.readFileSync(repPath, "utf8")).report || [] } catch (_) {}
const fullRep = REVERIFY
  ? [...prevRep.filter(r => !(r.verified && ran.has(r.char))), ...report]     // keep the discovery rejections; replace the verified rows
  : [...prevRep.filter(r => r.char && !ran.has(r.char)), ...report]
const allChars = new Set([...merged.map(c => c.char), ...fullRep.map(r => r.char).filter(Boolean)])
fs.writeFileSync(repPath, JSON.stringify({ date: TODAY, characters: allChars.size, verified: merged.length, rejected: fullRep.filter(r => r.rejected).length, report: fullRep }, null, 1) + "\n")
console.log(`DONE: ${roster.length} characters, ${results.length} combos verified (${merged.length} in combos.json), ${report.filter(r => r.rejected).length} candidates rejected`)
