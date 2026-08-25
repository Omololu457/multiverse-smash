// harness/save_forcequit_electron.mjs — REAL force-quit/relaunch test in Electron.
// Makes progress in one Electron process, SIGKILLs it (no clean exit), relaunches a fresh process sharing
// the same userData, and confirms the progress persisted. Proves the durability bar the feature asks for:
// "a crash/force-quit shouldn't lose everything back to the last save."
import { spawn } from "node:child_process";
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ELECTRON = path.join(REPO, "electron/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const HELPER = path.join(REPO, "harness/save_forcequit_helper.mjs");
const USERDATA = path.join(os.tmpdir(), "ms_forcequit_userdata");
fs.rmSync(USERDATA, { recursive: true, force: true });   // isolated, clean start (a true first-run guest)

let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

function run(mode, { killOnAlive = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(ELECTRON, [HELPER], { env: { ...process.env, MODE: mode, USERDATA }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const grab = b => { out += b.toString(); if (killOnAlive && /\bALIVE\b/.test(out)) { try { process.kill(child.pid, "SIGKILL"); } catch (_) {} } };
    child.stdout.on("data", grab); child.stderr.on("data", () => {});
    child.on("exit", (code, sig) => resolve({ out, code, sig }));
    // hard safety timeout
    setTimeout(() => { try { process.kill(child.pid, "SIGKILL"); } catch (_) {} }, 30000);
  });
}
const parse = (out, tag) => { const m = out.match(new RegExp(tag + " (\\{.*\\})")); return m ? JSON.parse(m[1]) : null; };

try {
  console.log("\n── make progress, then SIGKILL (force-quit, no clean exit) ─────────────");
  const made = await run("make", { killOnAlive: true });
  const madeProg = parse(made.out, "MADE");
  check("progress was made in the first launch", !!madeProg && madeProg.xp > 0, JSON.stringify(madeProg));
  check("first process was force-killed (SIGKILL, not a clean quit)", made.sig === "SIGKILL", `sig=${made.sig}`);

  console.log("\n── relaunch a FRESH process (same userData) ─────────────");
  const read = await run("read");
  const readProg = parse(read.out, "READ");
  check("relaunch restored a profile with no action", !!readProg, JSON.stringify(readProg));
  check("XP survived the force-quit (progress not lost)", !!readProg && readProg.xp === madeProg.xp, `made=${madeProg?.xp} read=${readProg?.xp}`);
  check("matches/wins survived", !!readProg && readProg.matches === madeProg.matches && readProg.wins === madeProg.wins, `made m${madeProg?.matches}/w${madeProg?.wins} read m${readProg?.matches}/w${readProg?.wins}`);
  check("personality events survived", !!readProg && readProg.personalityEvents === madeProg.personalityEvents, `made=${madeProg?.personalityEvents} read=${readProg?.personalityEvents}`);
} catch (e) {
  console.error("FATAL", e); FAIL++;
} finally {
  fs.rmSync(USERDATA, { recursive: true, force: true });
  console.log(`\n  SAVE-FORCEQUIT: ${PASS} passed, ${FAIL} failed`);
  process.exit(FAIL ? 1 : 0);
}
