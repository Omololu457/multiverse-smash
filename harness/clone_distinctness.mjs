// harness/clone_distinctness.mjs — AUTOMATED DISTINCTNESS AUDIT for the clone-choreography roster.
// Every character's kit must FEEL different. This compares the authored choreography DATA across all
// characters along the dimensions the design calls distinct — clone count, formation shape (offsets),
// timing, clone material/visual (fx colour + action vocabulary), and game effect (damage/knockback) —
// and FAILS if two characters' sequences are structurally identical beyond a sensible threshold (i.e. the
// same template merely reskinned). Pure data (no browser): imports the exported CHOREO_BY_CHAR table.
import { CHOREO_BY_CHAR } from "../cloneChoreography.js";

const SEQ_KEYS = ["pureAttack", "grab", "ranged", "defensive", "deception", "swarm"];
const round = n => Math.round(n || 0);

// A compact structural signature per sequence (ignores the char-specific action NAMES — those are the
// cosmetic layer; we want to catch same SHAPE regardless of label).
function seqSig(seq) {
  if (!seq) return null;
  const beats = seq.beats || [];
  const fin = seq.finisher || null;
  return {
    cloneCount: (seq.clones || []).length,
    duration: seq.duration || 0,
    timings: beats.map(b => b.at),
    offsets: beats.map(b => `${round(b.place?.dx)},${round(b.place?.dy)}`),
    totalDamage: beats.reduce((s, b) => s + (b.hit?.damage || 0), 0) + (fin?.hit?.damage || 0),
    finisherType: fin ? (fin.type || "attack") : null,
    finisherDmg: fin?.hit?.damage || 0,
  };
}
const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
// Two sequences are "structurally identical" = same clone count, same beat timings, same formation
// offsets, same finisher type, and total damage within 12% — i.e. the same move with a different skin.
function structurallyIdentical(a, b) {
  if (!a || !b) return false;
  if (a.cloneCount !== b.cloneCount) return false;
  if (!eqArr(a.timings, b.timings)) return false;
  if (!eqArr(a.offsets, b.offsets)) return false;
  if (a.finisherType !== b.finisherType) return false;
  const d = Math.max(a.totalDamage, b.totalDamage) || 1;
  return Math.abs(a.totalDamage - b.totalDamage) / d <= 0.12;
}
const fxColor = e => (e.fx?.melee?.color || "") + "|" + (e.fx?.proj?.color || "");
function actionVocab(e) { const s = new Set(); for (const sk of SEQ_KEYS) for (const b of (e.seqs?.[sk]?.beats || [])) if (b.action) s.add(b.action); return s; }

let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const chars = Object.keys(CHOREO_BY_CHAR).filter(k => !CHOREO_BY_CHAR[k].light);   // full 6-type kits
console.log(`\n══ DISTINCTNESS AUDIT — ${chars.length} full-kit characters ══`);

// 1. Materials (fx colour) must be unique per character.
const colorMap = {};
for (const c of chars) { const col = fxColor(CHOREO_BY_CHAR[c]); (colorMap[col] ||= []).push(c); }
for (const [col, cs] of Object.entries(colorMap)) check(`material/colour unique: ${cs.join(",")}`, cs.length === 1, cs.length > 1 ? `SHARE colour ${col}` : col.split("|")[0]);

// 2. Action vocabulary must be character-specific (no two chars share clone action poses).
for (let i = 0; i < chars.length; i++) for (let j = i + 1; j < chars.length; j++) {
  const A = actionVocab(CHOREO_BY_CHAR[chars[i]]), B = actionVocab(CHOREO_BY_CHAR[chars[j]]);
  const shared = [...A].filter(x => B.has(x) && !["up", "down_air", "idle"].includes(x));   // generic poses allowed
  check(`${chars[i]} vs ${chars[j]}: no shared signature clone actions`, shared.length === 0, shared.length ? `SHARE ${shared.join(",")}` : "ok");
}

// 3. STRUCTURAL distinctness: no pair may be structurally identical across a majority (≥4/6) of sequences.
const sigs = {}; for (const c of chars) { sigs[c] = {}; for (const sk of SEQ_KEYS) sigs[c][sk] = seqSig(CHOREO_BY_CHAR[c].seqs?.[sk]); }
let worstPair = null, worstN = -1;
for (let i = 0; i < chars.length; i++) for (let j = i + 1; j < chars.length; j++) {
  let identical = 0; const same = [];
  for (const sk of SEQ_KEYS) if (structurallyIdentical(sigs[chars[i]][sk], sigs[chars[j]][sk])) { identical++; same.push(sk); }
  if (identical > worstN) { worstN = identical; worstPair = `${chars[i]}/${chars[j]}`; }
  check(`${chars[i]} vs ${chars[j]}: <4/6 sequences structurally identical`, identical < 4, `${identical}/6 identical${same.length ? " [" + same.join(",") + "]" : ""}`);
}

// 4. Clone-count PROFILES should vary (not every char identical counts across all 6 sequences).
const countProfile = c => SEQ_KEYS.map(sk => (CHOREO_BY_CHAR[c].seqs?.[sk]?.clones || []).length).join("-");
const profiles = {}; for (const c of chars) (profiles[countProfile(c)] ||= []).push(c);
for (const [prof, cs] of Object.entries(profiles)) if (cs.length > 1) check(`clone-count profile not shared: ${cs.join(",")}`, false, `all = ${prof}`);
check(`clone-count profiles vary across the roster`, Object.keys(profiles).length >= Math.ceil(chars.length / 2), `${Object.keys(profiles).length} distinct profiles for ${chars.length} chars`);

console.log(`\n   worst structural overlap: ${worstPair} = ${worstN}/6`);
console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
