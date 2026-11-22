// tools/ai_scout/scout.mjs — AI SCOUT (step 1 of the smarter-CPU plan): measure every fighter's REAL moves in the REAL
// engine and write a per-fighter "cheat sheet" the CPU can read later (aiScoutData.js). Nothing here changes gameplay.
//
//   node tools/ai_scout/scout.mjs [repoRoot] [--workers 6] [--only key,key] [--out aiScoutData.js]
//
// Each move comes from the Controls Lab move list (controls_lab/moves.js: academy lessons + kits + characters.js frame
// data) with its frame-exact raw-input script, and is performed through the real keyboard pipeline (controls_lab/
// engine.js) against the training dummy after the game's own F2 reset. Per move we record:
//   startup   frames from the final button press to the first HP loss (stand dummy, closest gap that hits)
//   reach     [min,max] gap (px between bodies) it connected at, from GAPS below
//   damage    HP removed on a clean hit · hits (combo counter) · chip (HP removed through a block)
//   onHit / onBlock   frame advantage: (frame the dummy can act) − (frame the attacker can act); + = attacker first
//   unblockable       a blocking dummy still took a clean hit (grabs, unblockables)
//   antiAir   it hit a dummy that was in the air
//   cost      meter spent · travel  attacker's forward movement (px, + = toward the foe)
// Moves that need a form/setup and never fired from neutral are kept with fired:false (the CPU won't rely on them).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"

const ROOT = path.resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".")
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const WORKERS = +arg("--workers", 4), ONLY = arg("--only", null)
const OUT = path.resolve(ROOT, arg("--out", "aiScoutData.js"))
const REPORT = path.resolve(ROOT, arg("--report", "docs/ai_scout/scout_report.json"))
const TODAY = arg("--date", new Date().toISOString().slice(0, 10))
const GAPS = [0, 16, 34, 60, 90, 120, 200, 320, 480]
// ONE standard opponent for everyone (not the mirror): numbers compare across the roster, and mirror-only passives can't
// hide a move (a mirror Buggy dummy is immune to Buggy's own blades — Bara Bara)
const FOE = arg("--foe", "naruto")
const COMBO_MAX = +arg("--combos", 10)

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".woff2": "font/woff2" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const BASE = `http://127.0.0.1:${server.address().port}/index.html`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })

// One page per fighter: the REAL game (index.html harness training match vs the standard FOE dummy) with
// requestAnimationFrame disabled, so the sim is STEPPED (logic only, no drawing) — ~50× faster than real time and
// frame-exact. Inputs are real keyboard events through input.js, from the Lab's own per-frame move scripts.
async function openChar(ctx, key) {
  const page = await ctx.newPage()
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${BASE}?harness=1&p1=${encodeURIComponent(key)}&p2=${encodeURIComponent(key === FOE ? key : FOE)}&seed=7`, { waitUntil: "domcontentloaded", timeout: 240000 })
  await page.waitForFunction(() => window.__harness?.boot && window.__harness?.gojoShinjukuTest, null, { timeout: 240000 })
  await page.evaluate(async () => {
    const MODS = ["kits", "characters", "academy"]
    const sc = document.createElement("script"); sc.type = "module"
    sc.textContent = MODS.map((m, i) => `import * as m${i} from "./${m}.js"`).join("\n") + `\nimport * as mv from "./controls_lab/moves.js"\nimport * as nt from "./controls_lab/notation.js"\nimport * as cb from "./controls_lab/combos.js"\nwindow.__scoutMods = { ${MODS.map((m, i) => `${m}: m${i}`).join(", ")}, moves: mv, notation: nt, combos: cb }`
    document.head.appendChild(sc)
    for (let i = 0; i < 400 && !window.__scoutMods; i++) await new Promise(r => setTimeout(r, 25))
    const h = window.__harness
    h.boot(); h.setInputType?.(1, "keyboard"); h.setInputType?.(2, "keyboard")
    // SPEED (this tool's page only): the harness step also DRAWS each frame and canvas flushes are ~95% of the cost.
    // After boot (sprites are decoded and processed by then) make drawing onto screen-sized canvases a no-op. The
    // sim never reads those pixels back; scout results match a drawing run (checked: tools/ai_scout/README.md).
    const P = CanvasRenderingContext2D.prototype, big = c => c && c.width >= 640 && c.height >= 360
    for (const fn of ["drawImage", "fill", "stroke", "fillRect", "strokeRect", "fillText", "strokeText", "clearRect", "restore", "save", "putImageData", "clip"]) {
      const orig = P[fn]; if (typeof orig !== "function") continue
      P[fn] = function (...args) { return big(this.canvas) ? undefined : orig.apply(this, args) }
    }
    for (let i = 0; i < 6; i++) h.luffyTest.step(1)
  })
  return page
}

// ── runs INSIDE the game page (synchronous stepping) ─────────────────────────────────────────────────────────────────
async function scoutInPage({ GAPS, KEY, COMBO_MAX }) {
  const h = window.__harness, M = window.__scoutMods
  const characters = M.characters.characters
  const { moves } = M.moves.buildMoves({ academy: M.academy, kits: M.kits, characters }, KEY)
  const ctl = h.controls().p1
  const FIELDS = ["left", "right", "down", "up", "jump", "light", "heavy", "upAttack", "special", "ultimate", "grab", "charge", "block"]
  const held = {}
  const key = (k, down) => { if (!k || !!held[k] === !!down) return; held[k] = !!down; document.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: k, bubbles: true, cancelable: true })) }
  const applyRaw = raw => { const want = {}; for (const f of FIELDS) { const k = ctl[f]; if (k) want[k] = want[k] || !!raw[f] } for (const k of Object.keys(want)) key(k, want[k]) }
  const releaseAll = () => { for (const k of Object.keys(held)) key(k, false) }
  const step = () => h.luffyTest.step(1)
  const P1 = () => h.gojoShinjukuTest.raw("p1"), P2 = () => h.gojoShinjukuTest.raw("p2")
  const combo = () => { try { return h.beastAssistState("p1")?.combo || 0 } catch (_) { return 0 } }
  const free2 = b => b && !(b.hitstun > 0 || b.blockstun > 0 || b.stun > 0 || b.knockdownState || b.isLaunched || b.hitstop > 0 || b.isGrabbed) && b.grounded !== false
  const free1 = a => a && !(a.attacking || a.currentAttack || a.attackCooldown > 0 || a.hitstop > 0 || a.hitstun > 0 || a.blockstun > 0 || a.isGrabbing) && a.grounded !== false
  const gapNow = () => { const a = P1(), b = P2(); return Math.round(b.x - (a.x + (a.w || 48))) }

  // the game's own F2 training reset, then the Lab's close-in (engine.reset): wait out the combo timer / dummy state
  function reset(gap, dummy) {
    releaseAll()
    h.setDummyBehavior(dummy)
    key("f2", true); step(); step(); key("f2", false)
    for (let i = 0; i < 150; i++) { if (combo() === 0 && free2(P2()) && free1(P1())) break; step() }
    const a = P1(), b = P2()
    h.setP1X(b.x - (a.w || 48) - gap); step(); step(); step()
    if (dummy === "jump") for (let i = 0; i < 90 && !(P2().grounded === false && P2().vy < 0); i++) step()
  }

  // perform move m once; dummy = stand | block | jump
  function run(m, gap, dummy) {
    reset(gap, dummy)
    const a = P1(), b = P2()
    let hp0b = b.health
    const real = gapNow(), hp0 = b.health, en0 = a.energy ?? 0, x0 = a.x, fac = a.facing >= 0 ? 1 : -1
    const press = m.at[m.at.length - 1] ?? 0, press0 = m.at[0] ?? 0   // startup counts from the FIRST press (strings)
    let t = 0, firstHit = null, firstHitAir = false, minHp = hp0, minEn = en0, maxCombo = 0, fired = false, blocked = false, engineMove = null, grabbed = false
    let armed = false
    const look = () => {
      const A = P1(), B = P2()
      if (!armed) { if (t < press0) { minHp = B.health; return } armed = true; minHp = hp0b = B.health }   // damage before the first press (a lingering drone / hazard) is not this move's
      const hurt = B.health < minHp - 0.01
      if (B.isGrabbed && !grabbed) { grabbed = true; if (firstHit == null) { firstHit = t; firstHitAir = B.grounded === false } }   // a grab "lands" on the grab itself
      if (hurt) { if (firstHit == null) { firstHit = t; firstHitAir = B.grounded === false } minHp = B.health }
      if (!engineMove && t >= press && A.currentAttack?.name) engineMove = String(A.currentAttack.name)
      if (B.blockstun > 0) blocked = true
      if (A.attacking || A.currentAttack) fired = true
      minEn = Math.min(minEn, A.energy ?? 0); maxCombo = Math.max(maxCombo, combo())
    }
    for (const raw of m.script) { applyRaw(raw); step(); t++; look() }
    applyRaw({}); step(); t++; look()
    let p1Free = null, p2Free = null, quiet = 0
    for (let i = 0; i < 220; i++) {
      step(); t++; look()
      const f1 = free1(P1()), f2 = free2(P2())
      if (f1 && p1Free == null) p1Free = t; if (!f1) p1Free = null
      if (f2 && p2Free == null) p2Free = t; if (!f2) p2Free = null
      quiet = f1 && f2 ? quiet + 1 : 0
      if (quiet >= 12 && t > press + 6) break
    }
    return { gap: real, engineMove, grabbed, fired: fired || firstHit != null, hit: firstHit != null, startup: firstHit != null ? firstHit - press0 : null,
      air: firstHitAir, damage: Math.round((hp0b - minHp) * 10) / 10, hits: maxCombo, blocked,
      cost: Math.round(Math.max(0, en0 - minEn)), travel: Math.round((P1().x - x0) * fac),
      adv: (p1Free != null && p2Free != null) ? p2Free - p1Free : null, recover: p1Free != null ? p1Free - press : null }
  }

  const NON_ATTACK = new Set(["move", "jump", "block"])
  // Some kits write inputs as "<pad glyph> / <keyboard keys>" ("□ / J", "Up + △ / W + K or I"), which the Lab's
  // notation parser can't read (its script presses nothing). Fall back to the KEYBOARD half, translated through the
  // game's live P1 binds, back into kit notation.
  const BTN = ["light", "heavy", "upAttack", "special", "ultimate", "grab", "charge", "block", "jump"]
  const WORD = { left: "Back", right: "Forward", up: "Up", down: "Down", light: "Light", heavy: "Heavy", special: "Special", ultimate: "Ultimate", grab: "Grab", charge: "Charge", upAttack: "Up-Attack", jump: "Jump", block: "Block" }
  const REV = {}; for (const [f, k] of Object.entries(ctl)) if (k && !REV[String(k).toLowerCase()]) REV[String(k).toLowerCase()] = f
  const pressesButton = sc => sc.some(r => BTN.some(b => b !== "jump" && r[b]))   // a jump alone is not the move
  function keyboardFallback(m) {
    const kb = String(m.input).split(" / ").slice(1).join(" / ")
    if (!kb) return null
    const alts = kb.split("(")[0].split(/\s+or\s+/).map(a => a.split("+").map(t => t.trim().toLowerCase()).filter(Boolean)).filter(a => a.length)
    if (!alts.length) return null
    const toks = alts.slice().sort((a, b) => a.length - b.length)[0]   // "W + K or I" → "I": the single dedicated key (W is also Jump)
    const parts = toks.map(t => WORD[REV[t]]).filter(Boolean)
    if (!parts.length || parts.length !== toks.length) return null
    const lead = String(m.input).split(" / ")[0]
    const dir = /\b(forward|back|up|down)\b/i.exec(lead)?.[1]
    if (dir && !parts.some(p => /^(forward|back|up|down|up-attack)$/i.test(p))) parts.unshift(dir[0].toUpperCase() + dir.slice(1).toLowerCase())
    const input = (m.cat === "air" ? "Air " : "") + parts.join(" + ")
    const parsed = M.notation.parseNotation(input, m.cat), { script, at } = M.notation.stepsToScript(parsed)
    return pressesButton(script) ? { ...m, input, script, at } : null
  }
  // pad-glyph-only notation ("← + △", "↓↓ + R1", "L2"): the game's ONE pad layout (padLayout.js) → kit words
  const GLYPH = { "□": "Light", "△": "Heavy", "✕": "Jump", "○": "Block", "R1": "Special", "R2": "Ultimate", "L1": "Grab", "L2": "Charge" }
  const ARROW = { "↑": "Up", "↓": "Down", "←": "Back", "→": "Forward" }
  function glyphFallback(m) {
    const first = String(m.input).split(/\s+\/\s+|\s+or\s+|\(/)[0].trim()
    let air = /^air\b/i.test(first)
    const toks = first.replace(/^air\s+/i, "").split("+").map(t => t.trim()).filter(Boolean)
    if (!toks.length) return null
    const parts = []
    for (const t0 of toks) {
      const t = t0.split(/\s+/)[0]   // "□ Light, □, □" → "□"
      if (GLYPH[t]) parts.push(GLYPH[t])
      else if (/^[↑↓←→↖↗↘↙]+$/.test(t)) parts.push(t.length === 1 && ARROW[t] ? ARROW[t] : t)   // a motion stays as arrows (the parser reads them)
      else return null
    }
    const input = (air || m.cat === "air" ? "Air " : "") + parts.join(" + ")
    const parsed = M.notation.parseNotation(input, m.cat), { script, at } = M.notation.stepsToScript(parsed)
    return pressesButton(script) ? { ...m, input, script, at } : null
  }
  const out = []
  for (let m of moves) {
    const t0 = performance.now()
    const row = { id: m.id, name: m.name, input: m.input, cat: m.cat, tags: m.tags || [] }
    if (m.unavailable) { out.push({ ...row, fired: false, skip: "not in engine" }); continue }
    if (NON_ATTACK.has(m.cat)) continue   // walk / jump / guard: nothing to measure (the CPU already knows these)
    if (!pressesButton(m.script)) { const fb = keyboardFallback(m) || glyphFallback(m); if (fb) { row.input = fb.input; row.kitInput = m.input; m = fb } }
    try {
      const sweep = (mv, gaps) => { const rs = []; let any = false; for (const g of gaps) { const r = run(mv, g, "stand"); rs.push(r); if (r.hit) any = true; else if (any) break } return rs }
      const gaps = m.cat === "grab" ? [0, 8, 20] : GAPS
      const mv = m, byGap = sweep(m, gaps)
      const hits = byGap.filter(r => r.hit), best = hits[0] || null
      const res = { ...row, fired: byGap.some(r => r.fired), script: mv.script, at: mv.at }
      // an air normal from a neutral jump rarely touches a STANDING foe; measure it AIR-TO-AIR instead (vs the dummy
      // rising from its own jump). Kept apart from damage/reach, which always mean "hits a standing foe". (A forward
      // jump-in with Forward held throughout was tried and dropped: it carries the fighter clean over the foe, so
      // its rare hits were fragile clips, not a usable approach.)
      if (m.cat === "air" && !best) {
        for (const g of [16, 34, 60]) { const r = run(m, g, "jump"); if (r.hit && r.air) { res.airToAir = { gap: r.gap, startup: r.startup, damage: r.damage }; break } }
      }
      res.engineMove = (best || byGap.find(r => r.engineMove) || {}).engineMove || null
      if (m.cat === "grab") res.grab = byGap.some(r => r.grabbed)
      res.cost = Math.max(...byGap.map(r => r.cost)); res.travel = (best || byGap[0]).travel
      if (best) {
        res.startup = best.startup; res.damage = Math.max(...hits.map(r => r.damage)); res.hits = Math.max(...hits.map(r => r.hits))
        res.reach = [Math.min(...hits.map(r => r.gap)), Math.max(...hits.map(r => r.gap))]
        res.onHit = best.adv; res.recover = best.recover
        const blk = run(mv, Math.max(0, best.gap), "block")
        res.unblockable = blk.hit && !blk.blocked
        res.onBlock = blk.blocked ? blk.adv : null; res.chip = blk.blocked ? blk.damage : 0
        res.antiAir = false
        for (const g of [16, 34, 60]) { const aa = run(mv, g, "jump"); if (aa.hit && aa.air) { res.antiAir = true; break } }
      } else res.recover = byGap[0]?.recover ?? null
      out.push(res)
      console.log(`[scout] ${KEY} ${m.name}: ${Math.round(performance.now() - t0)}ms startup=${res.startup} dmg=${res.damage} reach=${res.reach} onHit=${res.onHit} onBlock=${res.onBlock} aa=${res.antiAir}`)
    } catch (e) { out.push({ ...row, error: String(e && e.message || e).slice(0, 120) }) }
  }
  releaseAll(); h.setDummyBehavior("stand")
  // two inputs the engine resolves to the SAME attack (e.g. a kit lists a move the data maps onto another input) measure
  // identically — mark the later one so the CPU doesn't treat it as a separate tool
  const fp = m => m.damage > 0 ? [m.engineMove, m.startup, m.damage, m.hits, String(m.reach), m.onHit, m.onBlock, m.cost].join("|") : null
  const seen = new Map()
  for (const m of out) { const f = fp(m); if (!f) continue; if (seen.has(f)) m.dupOf = seen.get(f); else seen.set(f, m.name) }
  const C = characters[KEY]
  // COMBOS: the fighter's verified Controls Lab combos (no Omnitrix-loadout / alien-swap setups), best damage first,
  // up to COMBO_MAX. Each is played from its Lab script at several distances vs the same standing dummy; kept only
  // where it still deals ≥ 85% of its listed damage, with the distances it works from.
  let lib = []
  try { const j = await (await fetch("./controls_lab/combos.json")).json(); lib = (j.combos || []).filter(c => c.char === KEY && c.status === "verified") } catch (_) {}
  const usable = lib.filter(c => !(c.benLoadout?.length) && !(c.swaps?.length)).sort((a, b) => (b.damage || 0) - (a.damage || 0)).slice(0, COMBO_MAX)
  const combos = []
  for (const c of usable) {
    try {
      const { script, at } = M.combos.comboScript(c)
      const okRuns = []
      for (const g of [0, 16, 34, 60, 90]) { const r = run({ script, at }, g, "stand"); if (r.damage >= (c.damage || 1) * 0.85) okRuns.push(r); else if (okRuns.length) break }
      if (!okRuns.length) continue
      const blk = run({ script, at }, okRuns[0].gap, "block")
      combos.push({ id: c.id, name: c.name, steps: c.steps, hits: c.hits, kind: c.kind || "combo",
        damage: Math.max(...okRuns.map(r => r.damage)), startup: okRuns[0].startup, reach: [Math.min(...okRuns.map(r => r.gap)), Math.max(...okRuns.map(r => r.gap))],
        onBlock: blk.blocked ? blk.adv : null, script, at })
    } catch (_) {}
  }
  return { key: KEY, name: C?.name || KEY, hp: P1().maxHealth, moves: out, combos, combosListed: lib.length }
}

// ── roster ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const p0 = await openChar(ctx0, "goku")
let roster = await p0.evaluate(() => { const C = window.__scoutMods.characters.characters, h = window.__harness; const keys = h.academy?.roster ? h.academy.roster() : Object.keys(C).filter(k => !C[k].hidden); return keys.filter(k => C[k]) })
await ctx0.close()
if (ONLY) roster = roster.filter(k => ONLY.split(",").includes(k))
console.log(`AI SCOUT: ${roster.length} fighters, ${WORKERS} workers`)

const results = {}, errors = {}
let next = 0
const t0 = Date.now()
async function worker(w) {
  while (next < roster.length) {
    const key = roster[next++]
    for (let attempt = 1; attempt <= 2; attempt++) {   // a page that times out while 6 others load gets one more try
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    let ok = false
    try {
      const page = await openChar(ctx, key)
      page.setDefaultTimeout(0)
      if (process.env.SCOUT_VERBOSE) page.on("console", m => { if (m.text().startsWith("[scout]")) console.log(m.text()) })
      const r = await page.evaluate(scoutInPage, { GAPS, KEY: key, COMBO_MAX })
      results[key] = r
      const land = r.moves.filter(m => m.damage > 0).length
      console.log(`[w${w}] ${key}: ${r.moves.length} moves, ${land} land · ${Math.round((Date.now() - t0) / 1000)}s`)
      delete errors[key]; ok = true
    } catch (e) { errors[key] = String(e.message || e).slice(0, 200); console.log(`[w${w}] ${key}: ${attempt < 2 ? "retry" : "ERROR"} ${errors[key]}`) }
    await ctx.close()
    if (ok) break
    }
  }
}
await Promise.all(Array.from({ length: Math.min(WORKERS, roster.length) }, (_, i) => worker(i)))

// ── write ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Merge into an existing data file (so --only refreshes a few fighters without dropping the rest).
let prev = {}
try { const src = fs.readFileSync(OUT, "utf8"); const j = src.slice(src.indexOf("{", src.indexOf("AI_SCOUT")), src.lastIndexOf("}") + 1); prev = JSON.parse(j).fighters || {} } catch (_) {}
// Input scripts, run-length encoded: [[codes, frames], …] — one letter per held input (see CODE), "" = nothing held.
const CODE = { left: "l", right: "r", down: "d", up: "u", jump: "J", light: "L", heavy: "H", upAttack: "U", special: "S", ultimate: "X", grab: "G", charge: "C", block: "B" }
function rle(script) {
  const out = []
  for (const raw of script || []) { const c = Object.keys(CODE).filter(f => raw[f]).map(f => CODE[f]).join(""); const last = out[out.length - 1]; if (last && last[0] === c) last[1]++; else out.push([c, 1]) }
  return out
}
const slim = r => ({ name: r.name, hp: r.hp, moves: r.moves.map(m => { const o = { ...m }; delete o.data; if (o.script) o.script = rle(o.script); for (const k of Object.keys(o)) if (o[k] == null || (Array.isArray(o[k]) && !o[k].length && k === "tags")) delete o[k]; return o }),
  combos: r.combos.map(c => { const o = { ...c, script: rle(c.script) }; if (o.onBlock == null) delete o.onBlock; return o }), combosListed: r.combosListed })
const fighters = { ...prev }
for (const [k, r] of Object.entries(results)) fighters[k] = { ...slim(r), scouted: TODAY }
const sorted = Object.fromEntries(Object.keys(fighters).sort().map(k => [k, fighters[k]]))
const data = { version: 1, foe: FOE, gaps: GAPS, codes: CODE, fighters: sorted }
fs.writeFileSync(OUT, `// aiScoutData.js — GENERATED by tools/ai_scout/scout.mjs (do not hand-edit; re-run the tool).
// Every fighter's real moves, measured in the real engine with real inputs against a standard training dummy: startup,
// reach, damage, hits, frame advantage on hit / block, chip, anti-air, meter cost, travel, plus the fighter's verified
// Controls Lab combos. Read-only data for the CPU (ai.js); nothing in it changes how any fighter plays.
// Fields per move: startup (frames, first press → first damage) · reach [min,max] px body gap · damage · hits ·
// onHit / onBlock (frames; + = attacker acts first) · chip · unblockable · antiAir · grab · cost (meter) · travel (px
// toward the foe) · recover · engineMove · dupOf (same attack as an earlier input) · airToAir {gap,startup,damage} (air
// normal that only connects on an airborne foe) · fired:false (needs a form / setup — not from neutral) · script: [[codes, frames], …] with
// codes = one letter per held input (AI_SCOUT.codes), at: script frame of each button press.
export const AI_SCOUT = ${JSON.stringify(data)}
`)
fs.mkdirSync(path.dirname(REPORT), { recursive: true })
const report = { date: TODAY, fighters: Object.keys(results).length, errors,
  perFighter: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { moves: r.moves.length, fired: r.moves.filter(m => m.fired).length, land: r.moves.filter(m => m.damage > 0).length, combos: r.combos.length, combosListed: r.combosListed,
    notFired: r.moves.filter(m => !m.fired).map(m => `${m.name} [${m.input}]${m.skip ? " — " + m.skip : ""}${m.error ? " — " + m.error : ""}`) }])) }
fs.writeFileSync(REPORT, JSON.stringify(report, null, 1))
console.log(`\nwrote ${path.relative(ROOT, OUT)} (${Object.keys(sorted).length} fighters) + ${path.relative(ROOT, REPORT)} · errors: ${Object.keys(errors).length} · ${Math.round((Date.now() - t0) / 1000)}s`)
await browser.close(); server.close()
