// harness/combo_standard_audit.mjs — COMBO-STRING STANDARDIZATION, Stage A guard.
//
// Holds the green/red conformance BASELINE for the roster-wide combo-string standard and
// PRINTS the Stage B/C/D worklist. It does three jobs:
//   1. PARTITION — the codified rekka set (comboStandard.REKKA) and the no-rekka set
//      (comboStandard.NO_REKKA) must EXACTLY partition the live roster (characters.js).
//      Catches roster drift: a new/renamed/removed character can't silently escape the plan.
//   2. SOURCE CROSS-CHECK — every classified driver must actually EXIST in abilities.js, and
//      each entry's claimed `requireHit` must match the `rekkaContinue(...)` literal in that
//      driver's body (for the entries flagged `srcRequireHit`). This makes the registry a
//      VERIFIED artifact, not a hand table that can rot away from the code.
//   3. BASELINE COUNTS — the conforms / deviates / exception tallies match EXPECTED_COUNTS.
//      As Stages B–D remap characters, update comboStandard.js (status + EXPECTED_COUNTS) and
//      this test tracks the progress automatically (stays green when data & counts agree).
//
// It CHANGES NOTHING and asserts NO input mapping — Stage A is measure-and-codify only.
// Run: `npm run test:combo-standard`.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { characters } from "../characters.js";
import {
  COMBO_STANDARD, REKKA, STANDARD_STRING, ZONER, REKKA_BY_KEY,
  rekkaKeys, standardStringKeys, zonerKeys, allClassifiedKeys, classify, EXPECTED_COUNTS,
  CORE_NORMALS, AIR_NORMALS, BASE_NORMAL_EXCEPTIONS, hasNormal,
} from "../comboStandard.js";
import { getKit } from "../kits.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const abilitiesSrc = readFileSync(join(__dir, "..", "abilities.js"), "utf8");

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };
const group = t => console.log(`\n═══ ${t} ═══`);

// Slice a function body out of abilities.js: from `function <name>(` to the next top-level
// `function ` / `export function ` (good enough for the single-requireHit cross-check below).
function driverBody(name) {
  const start = abilitiesSrc.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (start === -1) return null;
  const after = abilitiesSrc.slice(start + 1);
  const nextRel = after.search(/\n(?:export\s+)?function\s+\w+\s*\(/);
  return nextRel === -1 ? abilitiesSrc.slice(start) : abilitiesSrc.slice(start, start + 1 + nextRel);
}

// ─────────────────────────────────────────────────────────────────────────────
group("§1  Codified standard is well-formed");
check("COMBO_STANDARD opener is Forward+Heavy", COMBO_STANDARD.opener === "fwd+heavy", COMBO_STANDARD.opener);
check("COMBO_STANDARD re-tap is Heavy",         COMBO_STANDARD.retap === "heavy", COMBO_STANDARD.retap);
check("COMBO_STANDARD finisher launches",       COMBO_STANDARD.finisher === "launcher", COMBO_STANDARD.finisher);
check("COMBO_STANDARD is cancel-on-hit",        COMBO_STANDARD.requireHit === true);
check("COMBO_STANDARD buffer matches input.js INPUT_BUFFER_FRAMES=10", COMBO_STANDARD.inputBufferFrames === 10);

// ─────────────────────────────────────────────────────────────────────────────
group("§2  Registry ⟷ live roster partition (no drift)");
const rosterKeys = Object.keys(characters).sort();
const rk = rekkaKeys(), ssk = standardStringKeys(), zk = zonerKeys();
const covered = [...rk, ...ssk, ...zk].sort();

// disjoint across all THREE buckets (rekka grammar / standard-string grammar / zoner)
const dupSet = new Set(); const dups = [];
for (const k of [...rk, ...ssk, ...zk]) { if (dupSet.has(k)) dups.push(k); dupSet.add(k); }
check("rekka / standard-string / zoner sets are disjoint", dups.length === 0, dups.join(", ") || "no overlaps");

// exact cover
const missing = rosterKeys.filter(k => !covered.includes(k));
const phantom = covered.filter(k => !rosterKeys.includes(k));
check("every roster character is classified", missing.length === 0, missing.length ? `unclassified: ${missing.join(", ")}` : `${rosterKeys.length} chars`);
check("no phantom keys (all classified keys are real characters)", phantom.length === 0, phantom.join(", ") || "clean");
check("classification covers the full roster exactly", covered.length === rosterKeys.length, `covered ${covered.length} vs roster ${rosterKeys.length}`);

// rosterKey field on each character matches its object key (drivers guard on rosterKey)
const keyMismatch = rosterKeys.filter(k => (characters[k].rosterKey || "").toLowerCase() !== k.toLowerCase());
check("each character's rosterKey field equals its roster key", keyMismatch.length === 0, keyMismatch.join(", ") || "aligned");

// ─────────────────────────────────────────────────────────────────────────────
group("§3  Every classified driver exists in abilities.js");
const drivers = [...new Set(REKKA.map(e => e.driver))];
for (const d of drivers) {
  check(`driver ${d} exists`, new RegExp(`function\\s+${d}\\s*\\(`).test(abilitiesSrc));
}

// ─────────────────────────────────────────────────────────────────────────────
group("§3b  Standard-string roster ⟷ abilities.js STANDARD_STRING_CHARS (source truth)");
// The registry's standard-string set MUST equal the live STANDARD_STRING_CHARS object literal in
// abilities.js — the guard that a Stage-D rollout (or a future add/remove) can't drift the registry
// from the actual dispatch set. Parse the object-literal keys straight from source.
{
  // Capture the whole object literal up to the closing brace on its OWN line (inline `{}` values don't
  // start a line, so the first `\n}` is the real close).
  const m = abilitiesSrc.match(/const STANDARD_STRING_CHARS\s*=\s*\{([\s\S]*?)\n\}/);
  const srcKeys = m ? [...m[1].matchAll(/(\w+)\s*:\s*\{\}/g)].map(x => x[1]).sort() : [];
  const regKeys = standardStringKeys().slice().sort();
  check("STANDARD_STRING_CHARS parsed from source", srcKeys.length > 0, `${srcKeys.length} keys`);
  const onlySrc = srcKeys.filter(k => !regKeys.includes(k));
  const onlyReg = regKeys.filter(k => !srcKeys.includes(k));
  check("registry standard-string set === source set", onlySrc.length === 0 && onlyReg.length === 0,
        onlySrc.length || onlyReg.length ? `src-only:[${onlySrc}] reg-only:[${onlyReg}]` : `${srcKeys.length} chars aligned`);
}

// ─────────────────────────────────────────────────────────────────────────────
group("§4  requireHit source cross-check (srcRequireHit entries)");
for (const e of REKKA.filter(x => x.srcRequireHit)) {
  const body = driverBody(e.driver);
  if (!body) { check(`${e.key}: driver body found`, false, e.driver); continue; }
  const lits = [...body.matchAll(/requireHit:\s*(true|false)/g)].map(m => m[1] === "true");
  const uniq = [...new Set(lits)];
  // srcRequireHit entries are expected to have exactly one requireHit literal in-driver.
  const ok = uniq.length === 1 && uniq[0] === e.requireHit;
  check(`${e.key}: driver requireHit === ${e.requireHit}`, ok,
        lits.length === 0 ? "no requireHit literal found" : `source has [${uniq.join(",")}]`);
}

// ─────────────────────────────────────────────────────────────────────────────
group("§5  Opener-direction source cross-check (claimed opener ⟷ driver gate)");
// General guard: a claimed opener must match the driver's ACTUAL gate in source. This is the check
// that would have caught the audit mislabeling Batman/Zenitsu as Fwd+Heavy when their source gated on
// Down. Exceptions are skipped (their openers are intentionally irregular: grab / dual-string / stance).
// A `forward`-idiom driver reads `inputState.right`/`.left`; a Down opener reads `inputState.down`.
// A Forward opener driver derives the forward idiom `fighter.facing === 1 ? !!inputState.right : ...`.
// The pre-Stage-B Down-only drivers (old Batman/Zenitsu) had NO such derivation — so requiring it is
// exactly the guard that fails on a Down→Fwd mislabel. (Secondary Down+Heavy moves like Vegeta's Koma
// Rush are fine — we only assert the forward derivation EXISTS, not that no Down move does.)
const FWD_IDIOM = /fighter\.facing === 1 \? !!inputState\.right/;
for (const e of REKKA.filter(x => x.status !== "exception")) {
  const body = driverBody(e.driver) || "";
  if (e.opener === "fwd+heavy") {
    check(`${e.key}: Fwd+Heavy driver derives the \`forward\` idiom`, FWD_IDIOM.test(body));
  } else if (e.opener === "down+heavy") {
    check(`${e.key}: Down+Heavy driver gates opener on inputState.down`, /inputState\.down && heavyEdge/.test(body));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
group("§5b  Finisher launch source cross-check (Stage C targets)");
// The Stage-C conversions must carry `launcher: true` (not a bare `category: "heavy"` ender) on the
// finisher move-def in source. Maps each converted char → its finisher move key. This is the guard that
// a future edit can't silently revert a launcher finisher back to a heavy ender without going red.
const STAGE_C_FINISHERS = {
  netero: "down_attck_2", ghostface: "ghostfaceCombo3", shinobu: "shinobuG3",
  inosuke: "inosukeB5", tobirama: "tobiComboFin",
};
for (const [key, move] of Object.entries(STAGE_C_FINISHERS)) {
  const line = abilitiesSrc.split("\n").find(l => new RegExp(`^\\s*${move}:\\s*\\{`).test(l)) || "";
  check(`${key}: finisher ${move} declares launcher: true`, /launcher:\s*true/.test(line), line.trim().slice(0, 60));
  check(`${key}: finisher ${move} is no longer a bare heavy ender`, !/category:\s*"heavy"/.test(line));
}

// ─────────────────────────────────────────────────────────────────────────────
group("§6  Baseline classification counts");
const tally = REKKA.reduce((a, e) => (a[e.status] = (a[e.status] || 0) + 1, a), {});
const EC = EXPECTED_COUNTS;
check(`rekka total = ${EC.rekkaTotal}`,               REKKA.length === EC.rekkaTotal, `got ${REKKA.length}`);
check(`rekka conforms = ${EC.conforms}`,              (tally.conforms || 0) === EC.conforms, `got ${tally.conforms || 0}`);
check(`rekka deviates-opener = ${EC.deviatesOpener}`, (tally["deviates-opener"] || 0) === EC.deviatesOpener, `got ${tally["deviates-opener"] || 0}`);
check(`rekka deviates-finisher = ${EC.deviatesFinisher}`, (tally["deviates-finisher"] || 0) === EC.deviatesFinisher, `got ${tally["deviates-finisher"] || 0}`);
check(`rekka exception = ${EC.exception}`,            (tally.exception || 0) === EC.exception, `got ${tally.exception || 0}`);
check(`standard-string built-in = ${EC.standardStringBuiltIn}`, STANDARD_STRING.builtIn.length === EC.standardStringBuiltIn, `got ${STANDARD_STRING.builtIn.length}`);
check(`standard-string added (Stage D) = ${EC.standardStringAdded}`, STANDARD_STRING.added.length === EC.standardStringAdded, `got ${STANDARD_STRING.added.length}`);
check(`standard-string total = ${EC.standardStringTotal}`, standardStringKeys().length === EC.standardStringTotal, `got ${standardStringKeys().length}`);
check(`true zoners = ${EC.zoner}`,                    ZONER.length === EC.zoner, `got ${ZONER.length}`);
check(`grand total = roster (${EC.rosterTotal})`,     allClassifiedKeys().length === EC.rosterTotal && rosterKeys.length === EC.rosterTotal,
      `classified ${allClassifiedKeys().length}, roster ${rosterKeys.length}`);

// ─────────────────────────────────────────────────────────────────────────────
group("§6b  Base-normal completeness (Stage E — core normals universal; air-gaps documented)");
// CORE normals (light/heavy/upAttack) MUST resolve for every character — the launcher gates the
// roster-wide air combo. Air normals (airAttack/downAir) must resolve too EXCEPT for the documented
// intentional absences. Catches an accidental drop; keeps the deliberate gaps honest.
let coreOk = 0;
for (const k of rosterKeys) {
  const b = characters[k].basic_attacks;
  const missingCore = CORE_NORMALS.filter(s => !hasNormal(b, s));
  if (missingCore.length === 0) coreOk++;
  else check(`${k}: has all CORE normals (light/heavy/upAttack)`, false, `missing ${missingCore.join(", ")}`);
}
check(`ALL ${rosterKeys.length} characters resolve the core normals (light/heavy/upAttack)`, coreOk === rosterKeys.length, `${coreOk}/${rosterKeys.length}`);

for (const k of rosterKeys) {
  const b = characters[k].basic_attacks;
  const exempt = BASE_NORMAL_EXCEPTIONS[k] || [];
  const unexpectedMissing = AIR_NORMALS.filter(s => !hasNormal(b, s) && !exempt.includes(s));
  if (unexpectedMissing.length) check(`${k}: air normals present or documented-exempt`, false, `undocumented missing: ${unexpectedMissing.join(", ")}`);
}
// The documented exceptions must ACTUALLY be missing (else the exception is stale and should be removed).
for (const [k, keys] of Object.entries(BASE_NORMAL_EXCEPTIONS)) {
  const b = characters[k]?.basic_attacks;
  const stale = keys.filter(s => hasNormal(b, s));
  check(`${k}: documented air-gap is real (not stale)`, stale.length === 0, stale.length ? `now present: ${stale.join(", ")}` : `${keys.join(", ")} absent`);
}

// ─────────────────────────────────────────────────────────────────────────────
group("§F  Move-List kits teach the RIGHT combo grammar (Stage F)");
// getKit(...).combos is what the in-game Move List displays. It must MATCH the char's real grammar:
//   • a rekka char (Fwd+Heavy) must NOT be taught "Light, Light" (only standard-string chains lights) —
//     EXCEPT the light-opener rekka exception (Zaraki Shikai dual-button).
//   • a zoner must NOT be taught the "Light, Light, Heavy" auto-combo it can't do.
//   • a standard-string char SHOULD have a light-based string in its bread-and-butter.
let kitOk = 0;
for (const k of rosterKeys) {
  const kit = getKit(k, characters[k]);
  const seqs = (kit?.combos || []).map(c => c.sequence || "");
  const bnb = seqs[0] || "";
  const c = classify(k);
  let ok = true, why = "";
  if (c?.grammar === "rekka") {
    const lightOpener = /light/.test(c.opener || "");   // Zaraki-Shikai chains off Light — allowed
    if (!lightOpener && /^Light, Light/.test(bnb)) { ok = false; why = `rekka char taught light-string: "${bnb}"`; }
  } else if (c?.grammar === "zoner") {
    if (seqs.some(s => /Light, Light, Heavy/.test(s))) { ok = false; why = `zoner taught L,L,H auto-combo`; }
  } else if (c?.grammar === "standard-string") {
    if (!seqs.some(s => /Light/.test(s))) { ok = false; why = `standard-string char has no light string: "${bnb}"`; }
  }
  if (ok) kitOk++; else check(`${k} (${c?.grammar}): kit combo matches grammar`, false, why);
}
check(`ALL ${rosterKeys.length} kits teach a grammar-accurate combo string`, kitOk === rosterKeys.length, `${kitOk}/${rosterKeys.length}`);

// ─────────────────────────────────────────────────────────────────────────────
group("§7  Exceptions each carry a preservation note");
for (const e of REKKA.filter(x => x.status === "exception")) {
  check(`${e.key}: has exception note`, !!e.note && e.note.length > 8, e.note);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKLIST PRINTOUT (informational — the Stage B/C/D queue derived from the data)
console.log("\n────────────────────────────────────────────────────────────");
console.log("  COMBO-STRING STANDARDIZATION — worklist (from comboStandard.js)");
console.log("────────────────────────────────────────────────────────────");
const list = s => REKKA.filter(e => e.status === s).map(e => e.key).join(", ") || "—";
console.log(`  Rekka grammar — deviates-opener:   ${list("deviates-opener")}`);
console.log(`  Rekka grammar — deviates-finisher: ${list("deviates-finisher")}`);
console.log(`  Rekka grammar — exceptions:        ${REKKA.filter(e => e.status === "exception").map(e => e.key).join(", ")}`);
console.log(`  Standard-string — built-in:        ${STANDARD_STRING.builtIn.join(", ")}`);
console.log(`  Standard-string — Stage D rollout: ${STANDARD_STRING.added.join(", ")}`);
console.log(`  True zoners (no combo):            ${ZONER.join(", ")}`);

console.log(`\n════════════════════════════════════════`);
console.log(`  COMBO-STANDARD AUDIT: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
