// _run_full_suite.mjs — run EVERY package.json test:* script sequentially, log PASS/FAIL per suite,
// continue on failure, tally at the end. Exit code of each suite is the source of truth (harnesses
// process.exit(fail?1:0)); the RESULT line is captured for the log. Incremental log → monitorable.
import { execSync } from "node:child_process"
import fs from "node:fs"

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
const suites = Object.keys(pkg.scripts || {}).filter(k => k.startsWith("test:")).sort()
const LOG = "harness/_full_suite_results.log"
const started = new Date().toISOString()
fs.writeFileSync(LOG, `FULL SUITE RUN — ${suites.length} suites — started ${started}\n\n`)

let pass = 0, fail = 0
const fails = []
const t0all = Date.now()

for (let i = 0; i < suites.length; i++) {
  const s = suites[i]
  const t0 = Date.now()
  let ok = false, note = ""
  try {
    const out = execSync(`npm run ${s} 2>&1`, { timeout: 180000, encoding: "utf8", stdio: "pipe" })
    ok = true                                                // exit 0 = pass
    const m = out.match(/(\d+)\s*pass\S*\s*[\/,]\s*(\d+)\s*fail|(\d+)\s+passed,\s*(\d+)\s+failed|(\d+)\s+passed/i)
    note = m ? m[0].replace(/\s+/g, " ").trim() : "exit0"
  } catch (e) {
    ok = false
    const out = ((e.stdout || "") + (e.stderr || "")).toString()
    const m = out.match(/(\d+)\s*pass\S*\s*[\/,]\s*(\d+)\s*fail|(\d+)\s+passed,\s*(\d+)\s+failed/i)
    note = e.killed ? "TIMEOUT(180s)" : (m ? m[0].replace(/\s+/g, " ").trim() : `exit${e.status ?? "?"}`)
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(0)
  if (ok) pass++; else { fail++; fails.push(`${s}  (${note})`) }
  fs.appendFileSync(LOG, `[${String(i + 1).padStart(3)}/${suites.length}] ${ok ? "PASS" : "FAIL"}  ${s}  ${dt}s  ${note}\n`)
}

const mins = ((Date.now() - t0all) / 60000).toFixed(1)
fs.appendFileSync(LOG, `\n════════════════════════════════════════════════════════\n`)
fs.appendFileSync(LOG, `DONE (${mins} min): ${pass} PASS / ${fail} FAIL  of ${suites.length}\n`)
fs.appendFileSync(LOG, fails.length ? `\nFAILURES (${fails.length}):\n${fails.join("\n")}\n` : `\nNO FAILURES.\n`)
console.log(`DONE: ${pass}/${suites.length} pass, ${fail} fail (${mins} min)`)
