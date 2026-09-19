// harness/beta_feedback.mjs
// TRACK C live verification: the in-game beta feedback / bug-capture flow.
// Proves, against the REAL game + the REAL dev save-server endpoint:
//   1. The pause "Report an Issue" prompt opens.
//   2. Typing REAL keys fills the note; Enter submits.
//   3. The server appends a timestamped, context-tagged block to a log file ON DISK.
//   4. A second submit APPENDS (never overwrites).
// Uses createSaveServer() (the actual /api/feedback implementation) pointed at a
// throwaway log file so we can read exactly what got written.
import { chromium } from "playwright"
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url"
import { createSaveServer } from "../server/save-server.mjs"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-feedback-"))
const LOG = path.join(tmpDir, "BETA_FEEDBACK_LOG.txt")
const saveDir = path.join(tmpDir, "saves")
const server = createSaveServer({ root: ROOT, saveDir, feedbackFile: LOG })
await new Promise(r => server.listen(0, "127.0.0.1", r))
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const H = (fn, ...a) => page.evaluate(fn, ...a)
async function frames(n) { const s = await H(() => window.__harness.state().frame); await page.waitForFunction(a => window.__harness.state().frame >= a, s + n, { timeout: 8000, polling: 16 }).catch(() => {}) }
async function waitFile(pred, ms = 5000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const txt = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8") : ""; if (pred(txt)) return txt; await new Promise(r => setTimeout(r, 50)) } return fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8") : "" }
// Wait for the BROWSER-side feedback state to settle (the fetch .then() that sets the
// ✓ message + closes the prompt runs a beat after the server writes the file).
async function waitState(pred, ms = 5000) { try { await page.waitForFunction(p => { const s = window.__harness.feedback.state(); return p === "sent" ? (s.message.startsWith("✓") && s.entry === false) : true }, "sent", { timeout: ms, polling: 30 }) } catch (_) {} return H(() => window.__harness.feedback.state()) }

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" })
await page.waitForFunction(() => !!(window.__harness && window.__harness.feedback))

// Boot a real match so there's live context (character / stage / mode).
console.log("\n── open the prompt ──")
await H(() => window.__harness.boot()); await H(() => window.__harness.skipToBattle()); await frames(6)
check("log file does not exist before any submit", !fs.existsSync(LOG))
await H(() => window.__harness.feedback.open())
await frames(2)
check("feedback prompt opened", (await H(() => window.__harness.feedback.state())).entry === true)

// Type a REAL note and submit with Enter (the real capture + submit path).
console.log("\n── type + submit (real keys) ──")
const NOTE1 = "Bug: Kurapika light attack whiffed at point blank on Woodsboro."
await page.keyboard.type(NOTE1, { delay: 2 })
const st = await H(() => window.__harness.feedback.state())
check("typed note captured in buffer", st.buffer === NOTE1, `buffer="${st.buffer}"`)
await page.screenshot({ path: path.join(ROOT, "harness", "shots", "FEEDBACK_prompt.png") })
await page.keyboard.press("Enter")
let txt = await waitFile(t => t.includes(NOTE1))
check("entry written to the log file on disk", txt.includes(NOTE1))
check("entry has an ISO timestamp", /\[\d{4}-\d\d-\d\dT[\d:.]+Z\]/.test(txt), txt.split("\n")[1] || "")
check("entry has context (character/stage/mode)", /character=.+\s+stage=.+\s+mode=/.test(txt))
const s1 = await waitState()
check("prompt closed + success message after submit", s1.message.startsWith("✓") && s1.entry === false, `message="${s1.message}" entry=${s1.entry}`)

// Second submit APPENDS (never clobbers the first).
console.log("\n── second submit appends ──")
await H(() => window.__harness.feedback.open()); await frames(2)
const NOTE2 = "Feedback: the new tutorial is clear and helpful."
await page.keyboard.type(NOTE2, { delay: 2 })
await page.keyboard.press("Enter")
await waitState()
txt = await waitFile(t => t.includes(NOTE2))
check("second entry appended", txt.includes(NOTE1) && txt.includes(NOTE2))
check("two entries present (2 separators)", (txt.match(/─{58}/g) || []).length === 2, `blocks=${(txt.match(/─{58}/g) || []).length}`)

console.log("\n── on-disk log contents ──")
console.log(fs.readFileSync(LOG, "utf8").split("\n").map(l => "    " + l).join("\n"))

console.log(`\njsErrors: ${jsErrors.length}`); if (jsErrors.length) console.log(jsErrors.slice(0, 3).join("\n"))
console.log(`\n${FAIL === 0 && jsErrors.length === 0 ? "✅" : "❌"} beta feedback: ${PASS} passed, ${FAIL} failed`)
await browser.close(); server.close()
try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}
process.exit(FAIL === 0 && jsErrors.length === 0 ? 0 : 1)
