// tools/controls_lab/ai_combo_mine.mjs — WATCH THE CPU PLAY and pull out the combos it actually lands.
//   node tools/controls_lab/ai_combo_mine.mjs <repoRoot> [--workers 4] [--only key,key] [--frames 7200]
// For every roster fighter:
//   1. In the Controls Lab, demo every move once and record which engine attack it starts (attackName / cast move).
//      That gives a map  engine attack → the input notation the Lab teaches.
//   2. In the real game, run an AI-vs-AI match (fighter = IMPOSSIBLE CPU, mirror opponent = EASY CPU), frame by frame,
//      and log every attack the CPU starts plus its combo counter. Every run of hits (counter ≥ 2) becomes a route.
//   3. Routes are mapped to Lab notation (air hits after a jump become "Jump", …), counted, and the most common
//      ones are written to tools/controls_lab/combo_candidates_ai.json. build_combos.mjs then VERIFIES each of them
//      in the engine (nothing from here reaches the page unverified).
// No randomness of our own; the game's AI is seeded per match.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(process.argv[2] || ".")
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const WORKERS = +arg("--workers", 4), ONLY = arg("--only", null), FRAMES = +arg("--frames", 7200), TOP = +arg("--top", 6)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, "combo_candidates_ai.json")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".webp": "image/webp", ".wav": "audio/wav", ".m4a": "audio/mp4" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const ORIGIN = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })

let prev = {}; try { prev = JSON.parse(fs.readFileSync(OUT, "utf8")).candidates || {} } catch (_) {}
const p0 = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await p0.goto(`${ORIGIN}/controls.html?char=goku`, { waitUntil: "domcontentloaded", timeout: 120000 }); await p0.waitForFunction(() => window.__lab?.eng.ready, null, { timeout: 120000 })
let roster = await p0.evaluate(() => window.__lab.eng.roster().map(r => r.key))
await p0.close()
if (ONLY) roster = roster.filter(k => ONLY.split(",").includes(k))
console.log(`AI combo mine: ${roster.length} fighters, ${WORKERS} workers, ${FRAMES} frames each`)

const AIR = { airAttack: "Light", air_attack: "Light", air: "Light", downAir: "Down + Light", down_air: "Down + Light", airHeavy: "Heavy", air_heavy: "Heavy" }
const result = { ...prev }, stats = {}

// 1. engine attack → notation, from the Lab's own move demos
async function moveMap(lab, key) {
  return lab.evaluate(async k => {
    const L = window.__lab, E = L.eng
    await L.api.selectChar(k)
    const r = L.api.buildMoves(k), map = {}
    const orig = E.play.bind(E)
    for (const m of r.moves) {
      if (m.unavailable || m.parsed?.air || m.parsed?.unparsed || m.parsed?.conditional) continue
      if (!["light", "heavy", "upAttack", "special", "grab", "ultimate", "mobility"].includes(m.cat)) continue
      const seen = []
      E.play = (f, o = {}) => orig(f, { ...o, onStep: i => { try { const s = E.academySnap(); const sig = s && (s.attackName || (s.castMove && typeof s.castMove === "string" ? s.castMove : null)); if (sig && !seen.includes(sig)) seen.push(sig) } catch (_) {} o.onStep?.(i) } })
      try { await L.api.runMoveDemo(m) } catch (_) {} finally { E.play = orig }
      const steps = m.parsed?.steps?.length || 9
      if (seen[0]) { const cur = map[seen[0]]; if (!cur || steps < cur.n) map[seen[0]] = { input: String(m.input).replace(/\s*\([^)]*\)/g, '').trim(), name: m.name, n: steps } }
    }
    return map
  }, key)
}

// 2. watch the CPU: every attack it starts + its combo counter, one logic frame at a time
async function watch(game, key) {
  await game.goto(`${ORIGIN}/index.html?harness=1&p1=${key}&p2=${key}`, { waitUntil: "domcontentloaded", timeout: 120000 })
  await game.waitForFunction(() => window.__harness?.aiVsAi && window.__harness.academy, null, { timeout: 120000 })
  return game.evaluate(([k, N]) => {
    const H = window.__harness
    H.aiVsAi.start({ p1: k, p2: k, p1Diff: "impossible", p2Diff: "easy", matches: 3, speed: 1 })
    const ev = []; let last = null, combo = 0, air = false
    for (let i = 0; i < N; i++) {
      H.aiVsAi.step(1)
      if (H.aiVsAi.state().finished) break
      let s = null, c = 0; try { s = H.academy.snap(); c = H.beastAssistState("p1")?.combo || 0 } catch (_) {}
      if (!s) continue
      const sig = s.attackName || (typeof s.castMove === "string" ? s.castMove : null)
      if (s.airborne && !air && !s.attacking) ev.push({ f: i, jump: 1 })
      air = s.airborne
      if (sig && sig !== last) ev.push({ f: i, move: sig, air: s.airborne ? 1 : 0 })
      last = s.attacking || s.castMove ? sig : null
      if (c !== combo) { ev.push({ f: i, combo: c }); combo = c }
    }
    return ev
  }, [key, FRAMES])
}

// 3. hit runs → routes in Lab notation
function routes(ev, map) {
  const out = []
  let cur = [], best = 0, startedAt = -1
  const flush = () => { if (best >= 2 && cur.length >= 2) out.push(cur.slice()); cur = []; best = 0 }
  let pending = []   // moves started since the last counter change (one of them landed the next hit)
  for (const e of ev) {
    if (e.move || e.jump) { pending.push(e); continue }
    if (e.combo == null) continue
    if (e.combo === 0) { flush(); pending = []; continue }
    if (e.combo === 1) { flush(); startedAt = e.f }
    // the moves that led to this hit: the last jump (if any) + the most recent attack before it
    const lastMove = [...pending].reverse().find(p => p.move)
    if (lastMove) {
      const jumped = pending.some(p => p.jump && p.f <= lastMove.f) || (lastMove.air && !cur.length)
      if (lastMove.air && jumped && cur[cur.length - 1] !== "Jump") cur.push("Jump")
      const step = lastMove.air ? AIR[lastMove.move] : map[lastMove.move]?.input
      if (!step) { flush(); pending = []; continue }
      if (cur[cur.length - 1] !== step || pending.length) cur.push(step)
    }
    best = Math.max(best, e.combo); pending = []
  }
  flush()
  return out.map(r => r.slice(0, 6)).filter(r => r.filter(s => s !== "Jump").length >= 2 && r[0] !== "Jump")
}

async function worker(keys, wi) {
  if (!keys.length) return
  await new Promise(r => setTimeout(r, wi * 3000))
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const lab = await ctx.newPage(), game = await ctx.newPage()
  await lab.goto(`${ORIGIN}/controls.html?char=${keys[0]}`, { waitUntil: "domcontentloaded", timeout: 120000 })
  await lab.waitForFunction(() => window.__lab?.eng.ready, null, { timeout: 120000 })
  for (const key of keys) {
    const t0 = Date.now()
    try {
      const map = await moveMap(lab, key)
      const ev = await watch(game, key)
      const rs = routes(ev, map)
      const count = new Map()
      for (const r of rs) { const k = JSON.stringify(r); count.set(k, (count.get(k) || 0) + 1) }
      const top = [...count.entries()].map(([k, n]) => ({ steps: JSON.parse(k), seen: n }))
        .sort((a, b) => b.seen * b.steps.length - a.seen * a.steps.length).slice(0, TOP)
      result[key] = top.map(t => ({ steps: t.steps, note: `the CPU landed this ${t.seen}× in ${FRAMES / 60 | 0} s of play` }))
      stats[key] = { attacks: ev.filter(e => e.move).length, runs: rs.length, routes: top.length, mapped: Object.keys(map).length }
      console.log(`[w${wi}] ${key}: ${ev.filter(e => e.move).length} attacks, ${rs.length} combos seen → ${top.length} routes (${((Date.now() - t0) / 1000) | 0}s)`)
    } catch (e) { stats[key] = { error: String(e.message || e).slice(0, 200) }; console.log(`[w${wi}] ${key}: ERROR ${stats[key].error}`) }
    fs.writeFileSync(OUT, JSON.stringify({ note: "Routes the IMPOSSIBLE CPU landed in AI-vs-AI play (tools/controls_lab/ai_combo_mine.mjs). Candidates only — build_combos.mjs verifies them.", candidates: result }, null, 1) + "\n")
  }
  await ctx.close()
}
const parts = Array.from({ length: WORKERS }, () => [])
roster.forEach((k, i) => parts[i % WORKERS].push(k))
await Promise.all(parts.map((ks, i) => worker(ks, i)))
await browser.close(); server.close()
fs.writeFileSync(path.join(ROOT, "docs", "controls_lab", "ai_mine_report.json"), JSON.stringify({ frames: FRAMES, stats }, null, 1) + "\n")
console.log(`DONE: ${Object.values(result).filter(v => v.length).length} fighters with CPU routes`)
