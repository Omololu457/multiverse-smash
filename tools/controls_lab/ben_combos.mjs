// tools/controls_lab/ben_combos.mjs — BEN 10 combo search in the real engine (Controls Lab verifier).
//   node tools/controls_lab/ben_combos.mjs <repoRoot> [--target 35] [--budget-min 120] [--only 0,2] [--gap 12]
// Ben fights through his five Omnitrix slots (dial = ↓↓ then Light / Heavy / Special / Grab / Charge = slot 1-5).
// The alien appears ~40 frames after the dial and Ben keeps fighting in his current form until then, so a
// MID-COMBO SWAP is: dial during a combo, keep the current alien hitting through the delay, finish as the new alien.
// The 24 ready aliens are covered by five loadouts (the default one first). For each loadout:
//   1. every alien's hitters: the attacks that land when pressed right after its transform completes;
//   2. breadth-first chains: append an attack of the CURRENT alien, or a swap dial to another slot;
//   3. each chain that verifies at turbo speed is confirmed twice at real speed (same damage both runs).
// Entries carry `benLoadout` (the five slots) and `swaps` (dial steps that need not land their own hit), and are
// merged into controls_lab/combos.json (source "generated (Ben 10 alien search)"); other entries are untouched.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"

const ROOT = path.resolve(process.argv[2] || ".")
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const TARGET = +arg("--target", 35), BUDGET = +arg("--budget-min", 120) * 60000, GAP = +arg("--gap", 12), TURBO = 8
const ONLY = arg("--only", null), CHAR = arg("--char", "ben10"), ROTATE = +arg("--rotate", 0), SWAPS_ONLY = process.argv.includes("--swaps-only")
const TODAY = new Date().toISOString().slice(0, 10)
const LOADOUTS = [
  ["xlr8", "diamondhead", "feedback", "wildmutt", "heatblast"],          // the default Omnitrix
  ["swampfire", "megawhatt", "goop", "eyeguy", "ghostfreak"],
  ["alienx", "brainstorm", "terraspin", "wildvine", "jetray"],
  ["upgrade_ov", "humongousaur", "arcticguana", "benwolf", "bigchill"],
  ["ripjaws", "rath", "waterhazard", "highbreed", "xlr8"],
]
// --rotate R: every loadout rotated left by R (an alien that sat in slot 1 — whose Light dial also throws a jab that
// breaks the opener — moves to a later slot)
if (ROTATE) for (const L of LOADOUTS) for (let r = 0; r < ROTATE; r++) L.push(L.shift())
const DIAL = ["↓↓ + Light", "↓↓ + Heavy", "↓↓ + Special", "↓↓ + Grab", "↓↓ + Charge"]
const SLOT_KEY = ["Light", "Heavy", "Special", "Grab", "Charge"]
const ATTACKS = ["Light", "Heavy", "Up-Attack", "Down + Light", "Special", "Forward + Special", "Down + Special", "Back + Special"]
const TRANSFORM = 46   // frames from a dial to the first press as the new alien

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".webp": "image/webp", ".wav": "audio/wav", ".m4a": "audio/mp4" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const BASE = `http://127.0.0.1:${server.address().port}/controls.html`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })

const results = []
async function runLoadout(li, wi) {
  await new Promise(r => setTimeout(r, wi * 4000))
  const t0 = Date.now(), L = LOADOUTS[li]
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage()
  await page.goto(`${BASE}?char=${CHAR}`, { waitUntil: "domcontentloaded", timeout: 120000 })
  await page.waitForFunction(() => window.__lab?.eng.ready, null, { timeout: 120000 })
  const names = await page.evaluate(L => { const R = window.__lab.eng.h.ben10Registry().registry || {}; const get = k => (Array.isArray(R) ? R.find(a => a.key === k) : R[k])?.name; return L.map(k => get(k) || get(k.replace(/_ov$/, "")) || k.replace(/_ov$/, "").replace(/^\w/, m => m.toUpperCase())) }, L)
  const base = { char: CHAR, benLoadout: L, tail: 40 }
  const V = (c, turbo) => page.evaluate(([c, t]) => { const E = window.__lab.eng; E.turbo = t; return window.__lab.api.verifyCombo(c, { expect: false }).finally(() => { E.turbo = 1 }) }, [{ ...base, ...c, gapAllowed: GAP }, turbo]).catch(e => ({ ok: false, reason: String(e.message || e) }))
  const time = () => Date.now() - t0 < BUDGET
  let kept = 0, plain = 0
  const seen = new Set(), have = new Set()
  async function confirm(n) {
    const real = await V(n, 1); if (!real.ok) return false
    const again = await page.evaluate(c => window.__lab.api.verifyCombo(c), { ...base, ...n, hits: real.comboCounter, gapAllowed: GAP }).catch(() => ({ ok: false }))
    if (!again.ok || again.damage !== real.damage) return false
    const ff = Math.max(real.freeFrames || 0, again.freeFrames || 0)
    const label = n.steps.map((s, i) => (n.swaps.includes(i) ? `${i ? "swap → " : ""}${names[DIAL.indexOf(s)]}` : s)).join(" › ")
    const forms = [...new Set(n.forms)].map(k => names[k])
    results.push({
      id: `${CHAR}:${L.join("+")}:${n.steps.join(">").replace(/\s+/g, "")}`, char: CHAR, name: label, steps: n.steps, gaps: n.gaps, swaps: n.swaps, benLoadout: L,
      hits: again.comboCounter, hitsAt: again.hitsAt, damage: again.damage, difficulty: Math.min(5, 1 + n.swaps.length + Math.max(0, n.steps.length - 3)),
      note: [`Omnitrix loadout ${L.map((k, i) => `${SLOT_KEY[i]} = ${names[i]}`).join(" · ")}`, forms.length > 1 ? `switches ${forms.join(" → ")} mid-combo` : null,
        "the alien appears ~40 frames after the dial — keep attacking until it does", ff ? `combo string: a real opponent could block in the ${ff}-frame gap` : null].filter(Boolean).join(" · "),
      verified: TODAY, status: "verified", source: "generated (Ben 10 alien search)", ...(ff ? { kind: "string", freeFrames: ff, gapAllowed: GAP } : {}),
    })
    kept++; return true
  }
  // 1. hitters per alien: an attack pressed after its transform completes
  const hitters = []
  for (let k = 0; k < 5; k++) {
    const hs = []
    for (const x of ATTACKS) { if (!time()) break; const v = await V({ steps: [DIAL[k], x], gaps: [0, TRANSFORM], swaps: [0] }, TURBO); if (v.ok) hs.push(x) }
    hitters.push(hs)
  }
  console.log(`[L${li}] ${names.join(", ")} — hitters: ${hitters.map((h, k) => `${names[k]} ${h.length}`).join(", ")}`)
  // 2. breadth-first: nodes = { steps, gaps, swaps, cur (current alien), pend (slot arriving), since (frames since that dial), forms }
  let level = []
  for (let k = 0; k < 5; k++) for (const x of hitters[k]) level.push({ steps: [DIAL[k], x], gaps: [0, TRANSFORM], swaps: [0], cur: k, pend: null, since: 0, forms: [k] })
  for (const n of level) { if (!time() || kept >= TARGET) break; const v = await V(n, TURBO); if (v.ok) n.ok = true }
  level = level.filter(n => n.ok)
  while (level.length && kept < TARGET && time()) {
    const next = []
    for (const n of level) {
      if (kept >= TARGET || !time()) break
      if (n.steps.length >= 8) continue
      const opts = []
      // swap dials first: switching aliens mid-combo is the point of Ben's library
      // alien → alien swaps are INSTANT (only human → alien takes ~40 f) and open with the new alien's swap-in attack
      const lastDial = n.swaps.includes(n.steps.length - 1)
      if (!lastDial && n.swaps.length < 4) for (let j = 0; j < 5; j++) if (j !== n.cur && hitters[j].length) for (const g of [4, 8]) opts.push({ dial: j, g })
      // after a swap the next press must wait out the swap-in attack
      for (const g of lastDial ? [26, 30, 34] : [6, 9, 13, 18, 24]) {
        const arrived = n.pend != null && n.since + g >= TRANSFORM, who = arrived ? n.pend : n.cur
        for (const x of hitters[who]) opts.push({ x, g, who, arrived })
      }
      const done = new Set()
      for (const o of opts) {
        if (kept >= TARGET || !time()) break
        const step = o.dial != null ? DIAL[o.dial] : o.x, key = JSON.stringify([...n.steps, step])
        if (done.has(key) || seen.has(key)) continue
        const c = { steps: [...n.steps, step], gaps: [...n.gaps, o.g], swaps: o.dial != null ? [...n.swaps, n.steps.length] : n.swaps }
        if (o.dial == null && n.steps.length >= 3 && n.steps.slice(-2).every(s => s === step)) continue   // no x, x, x padding
        const v = await V(c, TURBO)
        if (!v.ok) continue
        done.add(key); seen.add(key)
        const m = o.dial != null ? { ...c, cur: o.dial, pend: null, since: 0, forms: [...n.forms, o.dial] }
          : { ...c, cur: o.arrived ? o.who : n.cur, pend: o.arrived ? null : n.pend, since: n.pend != null && !o.arrived ? n.since + o.g : 0, forms: o.arrived ? [...n.forms, o.who] : n.forms }
        next.push(m)
        // a combo ends on an attack, never on a dangling swap; a pending swap must have landed
        if (o.dial == null && m.pend == null && (v.comboCounter || 0) >= 2 && !have.has(key) && (m.swaps.length > 1 ? true : SWAPS_ONLY ? (m.forms[0] === 4 && plain < 18) : plain < Math.ceil(TARGET * 0.6))) { have.add(key); if (await confirm(m) && m.swaps.length <= 1) plain++ }
      }
    }
    // swaps first, then the longest chains — the interesting ones
    level = next.sort((a, b) => b.swaps.length - a.swaps.length || b.steps.length - a.steps.length)
  }
  console.log(`[L${li}] ${kept} combos (${((Date.now() - t0) / 60000).toFixed(0)} min)`)
  await ctx.close()
}
const which = ONLY ? ONLY.split(",").map(Number) : LOADOUTS.map((_, i) => i)
await Promise.all(which.map((li, wi) => runLoadout(li, wi)))
await browser.close(); server.close()

const out = path.join(ROOT, "controls_lab", "combos.json")
const J = JSON.parse(fs.readFileSync(out, "utf8"))
const ranLoadouts = new Set(which.map(i => LOADOUTS[i].join("+")))
const fresh = new Set(results.map(r => r.id))
J.combos = [...J.combos.filter(c => !fresh.has(c.id) && !(!SWAPS_ONLY && c.char === CHAR && c.source === "generated (Ben 10 alien search)" && ranLoadouts.has((c.benLoadout || []).join("+")))), ...results]
  .sort((a, b) => a.char.localeCompare(b.char))
fs.writeFileSync(out, JSON.stringify(J, null, 1) + "\n")
console.log(`DONE: ${results.length} ${CHAR} combos (${J.combos.filter(c => c.char === CHAR).length} for ${CHAR} in combos.json)`)
