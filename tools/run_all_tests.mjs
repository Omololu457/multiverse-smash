// tools/run_all_tests.mjs — run every `test:*` npm script (each a standalone Playwright harness) with
// bounded concurrency, collect pass/fail from exit code + a parsed summary line. Writes live JSON to
// /tmp/regression_results.json and a final report to stdout.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const scripts = pkg.scripts || {};
const only = process.argv[2] ? process.argv[2].split(",") : null;   // optional CSV filter
const names = Object.keys(scripts).filter(k => k.startsWith("test") && k !== "test").filter(k => !only || only.includes(k));
const CONC = parseInt(process.env.CONC || "6", 10);
const TIMEOUT = parseInt(process.env.TTIMEOUT || "150000", 10);
const OUT = "/tmp/regression_results.json";

console.log(`Running ${names.length} test scripts, concurrency ${CONC}, timeout ${TIMEOUT/1000}s each…\n`);
const results = new Map();
function summarize(text) {
  // pull the most informative line (X passed, Y failed / N pass / RESULT …)
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const m = [...text.matchAll(/(\d+)\s+pass(?:ed)?\D+(\d+)\s+fail/gi)].pop();
  if (m) return { passed: +m[1], failed: +m[2], line: m[0] };
  const r = lines.reverse().find(l => /pass|fail|✅|❌|RESULT|assert/i.test(l));
  return { passed: null, failed: null, line: r || lines[lines.length - 1] || "" };
}
function runOne(name) {
  return new Promise(res => {
    const cmd = scripts[name].replace(/^node\s+/, "");
    const child = spawn("node", cmd.split(/\s+/), { cwd: ROOT, env: { ...process.env } });
    let out = "";
    const to = setTimeout(() => { child.kill("SIGKILL"); }, TIMEOUT);
    child.stdout.on("data", d => out += d);
    child.stderr.on("data", d => out += d);
    child.on("close", code => {
      clearTimeout(to);
      const s = summarize(out);
      const timedOut = out === "" && code !== 0 ? false : false;
      const r = { name, code, killed: child.killed, ...s, ok: code === 0 && !child.killed && (s.failed === null || s.failed === 0) };
      results.set(name, r);
      const badge = r.ok ? "✅" : (r.killed ? "⏱️TIMEOUT" : "❌");
      console.log(`${badge} ${name.padEnd(34)} ${r.line}`);
      fs.writeFileSync(OUT, JSON.stringify([...results.values()], null, 2));
      res(r);
    });
  });
}
// simple concurrency pool
let idx = 0;
async function worker() { while (idx < names.length) { const n = names[idx++]; await runOne(n); } }
const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(CONC, names.length) }, worker));
const all = [...results.values()];
const failed = all.filter(r => !r.ok);
const totPass = all.reduce((a, r) => a + (r.passed || 0), 0);
const totFail = all.reduce((a, r) => a + (r.failed || 0), 0);
console.log(`\n${"=".repeat(60)}`);
console.log(`SCRIPTS: ${all.length - failed.length}/${all.length} green  ·  assertions: ${totPass} passed / ${totFail} failed  ·  ${(Date.now()-t0)/1000|0}s`);
if (failed.length) { console.log(`\nFAILED SCRIPTS (${failed.length}):`); for (const r of failed) console.log(`  ❌ ${r.name}  (exit=${r.code}${r.killed?", TIMEOUT":""})  ${r.line}`); }
else console.log("ALL GREEN ✅");
fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
console.log(`\nfull results → ${OUT}`);
process.exit(failed.length ? 1 : 0);
