// harness/clone_audit.mjs — STATIC clone-choreography quality audit (deterministic; no browser).
// Computes, from the authored CHOREO_BY_CHAR data, each clone's exact spawn position / animation / hit per
// beat (the engine places body.x = ref.x + dx with NO clamp, so this is exact), and flags:
//   WALL  — a clone falls outside the [0,worldWidth] stage when its reference (caster or target) is cornered
//   FACE  — a clone faces AWAY from centre (dx<0 should face +1, dx>0 should face -1)
//   NOOP  — a sequence deals no damage, or stages no clone
//   ANIM  — a beat/finisher action is not a real animation state for that character (the "4-copies" fallback)
// The live counterpart (clone_audit_live.mjs) confirms the worst WALL flags on screen + saves clips.
const cc = await import("../cloneChoreography.js");
const ch = await import("../characters.js");
const C = cc.CHOREO_BY_CHAR, chars = ch.characters;
const W = 3200, cw = 60, bw = 60;
const UNIVERSAL = new Set(["idle", "up", "down_air", "light", "heavy", "air", "walk", "run", "jump", "fall", "guard", "hurt"]);
const SEQKEYS = ["pureAttack", "grab", "ranged", "defensive", "deception", "swarm"];
let fWall = 0, fFace = 0, fNoop = 0, fAnim = 0;
const wall = [], face = [], noop = [], anim = [];
for (const key of Object.keys(C)) {
  if (C[key].light) continue;
  const animSet = new Set(Object.keys(chars[key]?.animationData || {}));
  for (const sk of SEQKEYS) {
    const seq = C[key].seqs?.[sk]; if (!seq) continue;
    const beats = seq.beats || [], fin = seq.finisher;
    const miss = [...beats.map(b => b.action), fin?.action].filter(Boolean).filter(a => !animSet.has(a) && !UNIVERSAL.has(a));
    if (miss.length) { anim.push(`  ANIM  ${key}/${sk}: missing ${miss.join(",")}`); fAnim += miss.length; }
    const dmg = beats.reduce((s, b) => s + (b.hit?.damage || 0), 0) + (fin?.hit?.damage || 0);
    if (dmg === 0 || !beats.some(b => b.body)) { noop.push(`  NOOP  ${key}/${sk}: totalDmg=${dmg} clones=${beats.some(b => b.body)}`); fNoop++; }
    for (const b of beats) { const dx = b.place?.dx || 0, fc = b.place?.face; if (fc == null || dx === 0) continue; const expect = dx < 0 ? 1 : -1; if (fc !== expect) { face.push(`  FACE  ${key}/${sk}: clone dx=${dx} faces ${fc} (expected ${expect} toward centre)`); fFace++; } }
    let worst = 0, n = 0;
    for (const b of beats) { const dx = b.place?.dx || 0; for (const refX of [0, W - cw]) { const x = refX + cw / 2 + dx - bw / 2; if (x < 0) { n++; worst = Math.min(worst, x); } else if (x + bw > W) { n++; worst = Math.max(worst, x + bw - W); } } }
    if (n > 0) { const maxAbs = Math.max(0, ...beats.map(b => Math.abs(b.place?.dx || 0))); wall.push(`  WALL  ${key}/${sk}: maxOffset=${maxAbs}px, ${n} placements OOB at a wall (worst ${Math.round(worst)}px past)`); fWall++; }
  }
}
console.log("================ CLONE STATIC AUDIT ================\n");
[...anim, ...noop, ...face].forEach(r => console.log(r));
if (wall.length) { console.log("\n--- WALL-CLIP (no stage clamp on clone x) ---"); wall.forEach(r => console.log(r)); }
console.log(`\nSUMMARY  wall-clip: ${fWall}   wrong-facing: ${fFace}   no-op: ${fNoop}   missing-anim: ${fAnim}`);
const total = fWall + fFace + fNoop + fAnim;
console.log(`\nRESULT: ${total === 0 ? "CLEAN" : total + " flags"}`);
process.exit(total ? 1 : 0);
