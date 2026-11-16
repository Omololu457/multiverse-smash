// harness/controls_lab_combos.test.mjs — test 4: EVERY combo in controls_lab/combos.json re-verifies in the real
// engine at 1x: scripted inputs from a reset, every step lands its own hit, the dummy never gets a free frame between
// hits, the game's combo counter equals `hits`, and the damage matches the recorded value.
// Add your own combos to combos.json, then run this:   node harness/controls_lab_combos.test.mjs [--workers 4] [--only a,b]
import fs from "node:fs"; import path from "node:path"
import { ROOT, startServer, launch, openLab, checker, buckets, gameBaselineErrors, newErrors } from "./controls_lab_common.mjs"

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const WORKERS = +arg("--workers", 4), ONLY = arg("--only", null)
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "controls_lab", "combos.json"), "utf8"))
let combos = data.combos.filter(c => c.status === "verified")
if (ONLY) combos = combos.filter(c => ONLY.split(",").includes(c.char))
const C = checker(), check = C.check
check("combos.json has verified combos", combos.length > 0, `${combos.length}`)

const { server, base } = await startServer()
const browser = await launch()
const baseline = await gameBaselineErrors(browser, base)
const byChar = {}; for (const c of combos) (byChar[c.char] = byChar[c.char] || []).push(c)
const results = [], allErrs = []
async function worker(chars, wi) {
  if (!chars.length) return
  await new Promise(r => setTimeout(r, wi * 4000))   // stagger page boots
  const { page, errs } = await openLab(browser, base, chars[0])
  for (const ch of chars) {
    await page.evaluate(k => window.__lab.api.selectChar(k), ch)
    for (const c of byChar[ch]) {
      const r = await page.evaluate(c => window.__lab.api.verifyCombo(c), c).catch(e => ({ ok: false, reason: String(e.message || e) }))
      const ok = r.ok && r.damage === c.damage
      results.push({ id: c.id, ok, reason: r.ok ? (r.damage !== c.damage ? `damage ${r.damage}, recorded ${c.damage}` : null) : r.reason })
      check(`${c.id}  (${c.hits} hits, ${c.damage} dmg)`, ok, ok ? "" : results[results.length - 1].reason)
    }
  }
  allErrs.push(...errs)
  await page.close()
}
await Promise.all(buckets(Object.keys(byChar), WORKERS).map(worker))
await browser.close(); server.close()
check(`zero console errors and zero failed requests added by the Lab (main game baseline: ${baseline.size} pre-existing)`, !newErrors(allErrs, baseline).length, newErrors(allErrs, baseline).slice(0, 6).join(" || "))
console.log(`\ncontrols_lab_combos: ${results.filter(r => r.ok).length}/${results.length} combos re-verified · ${C.pass} passed, ${C.fail} failed`)
process.exit(C.fail ? 1 : 0)
